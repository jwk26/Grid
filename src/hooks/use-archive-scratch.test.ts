import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ArchiveScratchCommand,
  ArchiveScratchRecoveryResult,
  ArchiveScratchResult,
} from "@/lib/db/datastore";
import type { PendingOperationRecovery } from "@/lib/db/schema";
import type { TriageOperationLock } from "./use-triage-operation-lock";
import {
  ARCHIVE_SCRATCH_RECOVERY_STORAGE_KEY,
  useArchiveScratch,
} from "./use-archive-scratch";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function makeLock(): TriageOperationLock & {
  acquire: ReturnType<typeof vi.fn>;
  release: ReturnType<typeof vi.fn>;
} {
  let active: { kind: "archive"; operationId: string } | null = null;
  return {
    get activeOperation() {
      return active;
    },
    isLocked: vi.fn(() => active !== null),
    acquire: vi.fn((kind: "archive", operationId: string) => {
      if (active !== null) return false;
      active = { kind, operationId };
      return true;
    }),
    release: vi.fn((operationId: string) => {
      if (active?.operationId !== operationId) return false;
      active = null;
      return true;
    }),
  } as TriageOperationLock & {
    acquire: ReturnType<typeof vi.fn>;
    release: ReturnType<typeof vi.fn>;
  };
}

function memoryStorage(events: string[] = []): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: vi.fn(() => values.clear()),
    getItem: vi.fn((key: string) => {
      events.push("read");
      return values.get(key) ?? null;
    }),
    key: vi.fn((index: number) => [...values.keys()][index] ?? null),
    removeItem: vi.fn((key: string) => {
      events.push("clear");
      values.delete(key);
    }),
    setItem: vi.fn((key: string, value: string) => {
      events.push("write");
      values.set(key, value);
    }),
  };
}

function terminal(
  command: ArchiveScratchCommand,
  status: ArchiveScratchResult["status"] = "applied",
): ArchiveScratchResult {
  return {
    operationId: command.operationId,
    status,
    scratch: null,
  };
}

describe("useArchiveScratch — Task 161 guarded current-tab owner", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("rechecks both mounted blockers synchronously, acquires before storage, and writes/readbacks before exactly one dispatch", async () => {
    const events: string[] = [];
    const lock = makeLock();
    lock.acquire.mockImplementation((kind, operationId) => {
      events.push("lock");
      return kind === "archive" && operationId === "00000000-0000-4000-8000-000000000001";
    });
    const storage = memoryStorage(events);
    const dispatchArchive = vi.fn(async (command: ArchiveScratchCommand) => {
      events.push("dispatch");
      return terminal(command);
    });
    let addBlocked = true;
    let titleBlocked = false;
    const onApplied = vi.fn();
    const { result } = renderHook(() =>
      useArchiveScratch({
        operationLock: lock,
        readAddDraftBlocker: () => addBlocked,
        readTitleBlocker: () => titleBlocked,
        createOperationId: () => "00000000-0000-4000-8000-000000000001",
        getStorage: () => storage,
        dispatchArchive,
        reconcileArchive: vi.fn(),
        onApplied,
      }),
    );

    await act(async () => {
      await expect(
        result.current.archiveScratch({ id: "10000000-0000-4000-8000-000000000001", version: 7 }),
      ).resolves.toBe(false);
    });
    expect(lock.acquire).not.toHaveBeenCalled();
    expect(dispatchArchive).not.toHaveBeenCalled();

    addBlocked = false;
    titleBlocked = true;
    await act(async () => {
      await expect(
        result.current.archiveScratch({ id: "10000000-0000-4000-8000-000000000001", version: 7 }),
      ).resolves.toBe(false);
    });
    expect(lock.acquire).not.toHaveBeenCalled();

    titleBlocked = false;
    await act(async () => {
      await expect(
        result.current.archiveScratch({ id: "10000000-0000-4000-8000-000000000001", version: 7 }),
      ).resolves.toBe(true);
    });

    expect(events).toEqual([
      "read",
      "lock",
      "write",
      "read",
      "dispatch",
      "clear",
    ]);
    expect(dispatchArchive).toHaveBeenCalledOnce();
    expect(dispatchArchive).toHaveBeenCalledWith({
      operationId: "00000000-0000-4000-8000-000000000001",
      scratchBitId: "10000000-0000-4000-8000-000000000001",
      expectedVersion: 7,
      callerAssertion: {
        addDraftClear: true,
        titleBlockerClear: true,
      },
    });
    const serialized = vi.mocked(storage.setItem).mock.calls[0]?.[1];
    expect(JSON.parse(serialized ?? "null")).toEqual({
      operationId: "00000000-0000-4000-8000-000000000001",
      kind: "archive_scratch",
      scratchBitId: "10000000-0000-4000-8000-000000000001",
      expectedVersion: 7,
      startedAt: expect.any(Number),
    });
    expect(lock.release).toHaveBeenCalledWith("00000000-0000-4000-8000-000000000001", "applied");
    expect(onApplied).toHaveBeenCalledOnce();
    expect(storage.getItem(ARCHIVE_SCRATCH_RECOVERY_STORAGE_KEY)).toBeNull();
  });

  it.each([
    ["unavailable", () => { throw new Error("denied"); }],
    ["quota", () => {
      const storage = memoryStorage();
      vi.mocked(storage.setItem).mockImplementation(() => {
        throw new DOMException("quota", "QuotaExceededError");
      });
      return storage;
    }],
    ["read denied", () => {
      const storage = memoryStorage();
      vi.mocked(storage.getItem).mockImplementation(() => {
        throw new DOMException("denied", "SecurityError");
      });
      return storage;
    }],
    ["readback mismatch", () => {
      const storage = memoryStorage();
      vi.mocked(storage.getItem).mockReturnValue('{"kind":"foreign"}');
      return storage;
    }],
  ] as const)("fails closed on %s storage with zero commands and releases the unstarted lock", async (_label, createStorage) => {
    const lock = makeLock();
    const dispatchArchive = vi.fn();
    const { result } = renderHook(() =>
      useArchiveScratch({
        operationLock: lock,
        readAddDraftBlocker: () => false,
        readTitleBlocker: () => false,
        createOperationId: () => "00000000-0000-4000-8000-000000000001",
        getStorage: createStorage,
        dispatchArchive,
        reconcileArchive: vi.fn(),
      }),
    );

    await act(async () => {
      await expect(
        result.current.archiveScratch({ id: "10000000-0000-4000-8000-000000000001", version: 7 }),
      ).resolves.toBe(false);
    });

    expect(dispatchArchive).not.toHaveBeenCalled();
    expect(lock.release).toHaveBeenCalledWith("00000000-0000-4000-8000-000000000001", "not_applied");
    expect(result.current.state.phase).toBe("storage_failed");
  });

  it("fails closed when descriptor serialization throws before dispatch", async () => {
    const lock = makeLock();
    const storage = memoryStorage();
    const dispatchArchive = vi.fn();
    const stringify = vi.spyOn(JSON, "stringify").mockImplementation(() => {
      throw new TypeError("serialization failed");
    });
    const { result } = renderHook(() =>
      useArchiveScratch({
        operationLock: lock,
        readAddDraftBlocker: () => false,
        readTitleBlocker: () => null,
        createOperationId: () => "00000000-0000-4000-8000-000000000001",
        getStorage: () => storage,
        dispatchArchive,
        reconcileArchive: vi.fn(),
      }),
    );

    await act(async () => {
      await expect(
        result.current.archiveScratch({
          id: "10000000-0000-4000-8000-000000000001",
          version: 7,
        }),
      ).resolves.toBe(false);
    });
    stringify.mockRestore();

    expect(dispatchArchive).not.toHaveBeenCalled();
    expect(lock.release).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-000000000001",
      "not_applied",
    );
  });

  it("retains the descriptor and lock through unknown/reconciling, rejects duplicates, then clears only at terminal classification", async () => {
    const lock = makeLock();
    const storage = memoryStorage();
    const pending = deferred<ArchiveScratchResult>();
    const reconciliation = deferred<ArchiveScratchRecoveryResult>();
    const dispatchArchive = vi.fn(() => pending.promise);
    const reconcileArchive = vi.fn(() => reconciliation.promise);
    const { result } = renderHook(() =>
      useArchiveScratch({
        operationLock: lock,
        readAddDraftBlocker: () => false,
        readTitleBlocker: () => false,
        createOperationId: () => "00000000-0000-4000-8000-000000000001",
        getStorage: () => storage,
        dispatchArchive,
        reconcileArchive,
      }),
    );

    let first!: Promise<boolean>;
    act(() => {
      first = result.current.archiveScratch({ id: "10000000-0000-4000-8000-000000000001", version: 7 });
    });
    expect(result.current.state.phase).toBe("pending");
    await act(async () => {
      await expect(
        result.current.archiveScratch({ id: "10000000-0000-4000-8000-000000000001", version: 7 }),
      ).resolves.toBe(false);
      pending.reject(new Error("transport unknown"));
      await expect(first).resolves.toBe(false);
    });
    expect(result.current.state.phase).toBe("unknown");
    expect(result.current.isProjectionReady).toBe(true);
    expect(lock.isLocked()).toBe(true);
    expect(storage.getItem(ARCHIVE_SCRATCH_RECOVERY_STORAGE_KEY)).not.toBeNull();

    let reconcile!: Promise<boolean>;
    act(() => {
      reconcile = result.current.reconcile();
    });
    expect(result.current.state.phase).toBe("reconciling");
    expect(lock.isLocked()).toBe(true);
    reconciliation.resolve({
      operationId: "00000000-0000-4000-8000-000000000001",
      status: "not_applied",
      scratch: null,
    });
    await act(async () => {
      await expect(reconcile).resolves.toBe(false);
    });
    expect(result.current.state).toMatchObject({
      phase: "terminal",
      terminalStatus: "not_applied",
    });
    expect(lock.isLocked()).toBe(false);
    expect(storage.getItem(ARCHIVE_SCRATCH_RECOVERY_STORAGE_KEY)).toBeNull();
    expect(dispatchArchive).toHaveBeenCalledOnce();
  });

  it.each(["not_applied", "rejected", "conflict"] as const)(
    "clears the descriptor and releases Archive on terminal %s without success handoff",
    async (status) => {
      const lock = makeLock();
      const storage = memoryStorage();
      const onApplied = vi.fn();
      const { result } = renderHook(() =>
        useArchiveScratch({
          operationLock: lock,
          readAddDraftBlocker: () => false,
          readTitleBlocker: () => null,
          createOperationId: () => "00000000-0000-4000-8000-000000000001",
          getStorage: () => storage,
          dispatchArchive: async (command) => terminal(command, status),
          reconcileArchive: vi.fn(),
          onApplied,
        }),
      );

      await act(async () => {
        await expect(
          result.current.archiveScratch({
            id: "10000000-0000-4000-8000-000000000001",
            version: 7,
          }),
        ).resolves.toBe(false);
      });

      expect(lock.release).toHaveBeenCalledWith(
        "00000000-0000-4000-8000-000000000001",
        status,
      );
      expect(storage.getItem(ARCHIVE_SCRATCH_RECOVERY_STORAGE_KEY)).toBeNull();
      expect(onApplied).not.toHaveBeenCalled();
    },
  );

  it("does not reclassify an applied repository result when the terminal handoff throws", async () => {
    const lock = makeLock();
    const storage = memoryStorage();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const onApplied = vi.fn(async () => {
      throw new Error("focus owner unavailable");
    });
    const { result } = renderHook(() =>
      useArchiveScratch({
        operationLock: lock,
        readAddDraftBlocker: () => false,
        readTitleBlocker: () => null,
        createOperationId: () => "00000000-0000-4000-8000-000000000001",
        getStorage: () => storage,
        dispatchArchive: async (command) => terminal(command),
        reconcileArchive: vi.fn(),
        onApplied,
      }),
    );

    await act(async () => {
      await expect(
        result.current.archiveScratch({
          id: "10000000-0000-4000-8000-000000000001",
          version: 7,
        }),
      ).resolves.toBe(true);
    });

    expect(result.current.state).toMatchObject({
      phase: "terminal",
      terminalStatus: "applied",
    });
    expect(lock.isLocked()).toBe(false);
    expect(storage.getItem(ARCHIVE_SCRATCH_RECOVERY_STORAGE_KEY)).toBeNull();
    expect(consoleError).toHaveBeenCalledWith(
      "Archive terminal handoff error:",
      expect.any(Error),
    );
  });

  it("validates and reconciles a reload descriptor before becoming projection-ready and never resends Archive", async () => {
    const lock = makeLock();
    const storage = memoryStorage();
    const recovery: PendingOperationRecovery = {
      operationId: "00000000-0000-4000-8000-000000000002",
      kind: "archive_scratch",
      scratchBitId: "10000000-0000-4000-8000-000000000001",
      expectedVersion: 7,
      startedAt: 100,
    };
    storage.setItem(
      ARCHIVE_SCRATCH_RECOVERY_STORAGE_KEY,
      JSON.stringify(recovery),
    );
    const dispatchArchive = vi.fn();
    const reconcileArchive = vi.fn(async () => ({
      operationId: recovery.operationId,
      status: "conflict" as const,
      scratch: null,
    }));

    const { result } = renderHook(() =>
      useArchiveScratch({
        operationLock: lock,
        readAddDraftBlocker: () => false,
        readTitleBlocker: () => null,
        getStorage: () => storage,
        dispatchArchive,
        reconcileArchive,
      }),
    );

    expect(result.current.isProjectionReady).toBe(false);
    expect(["recovering", "reconciling"]).toContain(
      result.current.state.phase,
    );
    await waitFor(() => expect(result.current.isProjectionReady).toBe(true));
    expect(lock.acquire).toHaveBeenCalledWith(
      "archive",
      "00000000-0000-4000-8000-000000000002",
      { reconcile: true },
    );
    expect(reconcileArchive).toHaveBeenCalledWith(recovery);
    expect(dispatchArchive).not.toHaveBeenCalled();
    expect(storage.getItem(ARCHIVE_SCRATCH_RECOVERY_STORAGE_KEY)).toBeNull();
  });

  it("keeps normal projection selected for same-page unknown but gates a reload that remains unknown", async () => {
    const storage = memoryStorage();
    const recovery: PendingOperationRecovery = {
      operationId: "00000000-0000-4000-8000-000000000002",
      kind: "archive_scratch",
      scratchBitId: "10000000-0000-4000-8000-000000000001",
      expectedVersion: 7,
      startedAt: 100,
    };
    storage.setItem(
      ARCHIVE_SCRATCH_RECOVERY_STORAGE_KEY,
      JSON.stringify(recovery),
    );
    const lock = makeLock();
    const { result } = renderHook(() =>
      useArchiveScratch({
        operationLock: lock,
        readAddDraftBlocker: () => false,
        readTitleBlocker: () => null,
        getStorage: () => storage,
        dispatchArchive: vi.fn(),
        reconcileArchive: async () => ({
          operationId: recovery.operationId,
          outcome: "unknown",
        }),
      }),
    );

    await waitFor(() => expect(result.current.state.phase).toBe("unknown"));
    expect(result.current.isProjectionReady).toBe(false);
    expect(lock.isLocked()).toBe(true);
    expect(storage.getItem(ARCHIVE_SCRATCH_RECOVERY_STORAGE_KEY)).not.toBeNull();
  });

  it("discards an invalid or foreign reload descriptor without invoking mutation or reconciliation", async () => {
    const storage = memoryStorage();
    storage.setItem(
      ARCHIVE_SCRATCH_RECOVERY_STORAGE_KEY,
      JSON.stringify({ kind: "undo", operationId: "foreign" }),
    );
    const dispatchArchive = vi.fn();
    const reconcileArchive = vi.fn();
    const { result } = renderHook(() =>
      useArchiveScratch({
        operationLock: makeLock(),
        readAddDraftBlocker: () => false,
        readTitleBlocker: () => null,
        getStorage: () => storage,
        dispatchArchive,
        reconcileArchive,
      }),
    );

    expect(result.current.isProjectionReady).toBe(true);
    expect(result.current.state.phase).toBe("idle");
    expect(dispatchArchive).not.toHaveBeenCalled();
    expect(reconcileArchive).not.toHaveBeenCalled();
    expect(storage.getItem(ARCHIVE_SCRATCH_RECOVERY_STORAGE_KEY)).toBeNull();
  });

  it("retries only authoritative not_applied with the same logical operation identity", async () => {
    const lock = makeLock();
    const storage = memoryStorage();
    const retryResult = deferred<ArchiveScratchResult>();
    const createOperationId = vi.fn(
      () => "00000000-0000-4000-8000-000000000001",
    );
    const dispatchArchive = vi
      .fn<(command: ArchiveScratchCommand) => Promise<ArchiveScratchResult>>()
      .mockImplementationOnce(async (command) => terminal(command, "not_applied"))
      .mockImplementationOnce(() => retryResult.promise);
    const onApplied = vi.fn();
    const { result } = renderHook(() =>
      useArchiveScratch({
        operationLock: lock,
        readAddDraftBlocker: () => false,
        readTitleBlocker: () => null,
        createOperationId,
        getStorage: () => storage,
        dispatchArchive,
        reconcileArchive: vi.fn(),
        onApplied,
      }),
    );

    await act(async () => {
      await result.current.archiveScratch({
        id: "10000000-0000-4000-8000-000000000001",
        version: 7,
      });
    });
    expect(result.current.state).toMatchObject({
      phase: "terminal",
      terminalStatus: "not_applied",
    });
    expect(result.current.retry).toEqual(expect.any(Function));

    let retry!: Promise<boolean>;
    act(() => {
      retry = result.current.retry();
    });
    expect(result.current.state.phase).toBe("pending");
    expect(createOperationId).toHaveBeenCalledOnce();
    expect(dispatchArchive).toHaveBeenCalledTimes(2);
    expect(dispatchArchive.mock.calls[1]?.[0]).toEqual(
      dispatchArchive.mock.calls[0]?.[0],
    );

    retryResult.resolve(
      terminal(dispatchArchive.mock.calls[1]![0], "already_applied"),
    );
    await act(async () => {
      await expect(retry).resolves.toBe(true);
    });
    expect(onApplied).toHaveBeenCalledOnce();
  });

  it("dismisses only a presented terminal or storage-failure result", async () => {
    const lock = makeLock();
    const { result } = renderHook(() =>
      useArchiveScratch({
        operationLock: lock,
        readAddDraftBlocker: () => false,
        readTitleBlocker: () => null,
        createOperationId: () => "00000000-0000-4000-8000-000000000001",
        getStorage: () => {
          throw new DOMException("denied", "SecurityError");
        },
        dispatchArchive: vi.fn(),
        reconcileArchive: vi.fn(),
      }),
    );

    expect(result.current.state.phase).toBe("storage_failed");
    expect(result.current.dismissTerminal).toEqual(expect.any(Function));
    act(() => {
      expect(result.current.dismissTerminal()).toBe(true);
    });
    expect(result.current.state.phase).toBe("idle");
    expect(result.current.isProjectionReady).toBe(true);
    expect(result.current.dismissTerminal()).toBe(false);
  });

  it("accepts a later Archive after a committed terminal success as a new operation", async () => {
    const lock = makeLock();
    const storage = memoryStorage();
    let counter = 0;
    const dispatchArchive = vi.fn(async (command: ArchiveScratchCommand) =>
      terminal(command),
    );
    const { result } = renderHook(() =>
      useArchiveScratch({
        operationLock: lock,
        readAddDraftBlocker: () => false,
        readTitleBlocker: () => null,
        createOperationId: () =>
          `00000000-0000-4000-8000-00000000000${++counter}`,
        getStorage: () => storage,
        dispatchArchive,
        reconcileArchive: vi.fn(),
      }),
    );
    const scratch = { id: "10000000-0000-4000-8000-000000000001", version: 7 };

    await act(async () => {
      await expect(result.current.archiveScratch(scratch)).resolves.toBe(true);
    });
    expect(result.current.state).toMatchObject({
      phase: "terminal",
      terminalStatus: "applied",
    });
    await act(async () => {
      await expect(result.current.archiveScratch(scratch)).resolves.toBe(true);
    });

    expect(dispatchArchive).toHaveBeenCalledTimes(2);
    expect(dispatchArchive.mock.calls[1][0].operationId).toBe(
      "00000000-0000-4000-8000-000000000002",
    );
  });

  it("still refuses a new Archive over a non-success terminal result", async () => {
    const lock = makeLock();
    const dispatchArchive = vi.fn(async (command: ArchiveScratchCommand) =>
      terminal(command, "conflict"),
    );
    const { result } = renderHook(() =>
      useArchiveScratch({
        operationLock: lock,
        readAddDraftBlocker: () => false,
        readTitleBlocker: () => null,
        createOperationId: () => "00000000-0000-4000-8000-000000000001",
        getStorage: () => memoryStorage(),
        dispatchArchive,
        reconcileArchive: vi.fn(),
      }),
    );
    const scratch = { id: "10000000-0000-4000-8000-000000000001", version: 7 };

    await act(async () => {
      await result.current.archiveScratch(scratch);
    });
    await act(async () => {
      await expect(result.current.archiveScratch(scratch)).resolves.toBe(false);
    });
    expect(dispatchArchive).toHaveBeenCalledOnce();
  });

  it("remembers the activated Scratch on a pre-dispatch storage failure", async () => {
    const storage = memoryStorage();
    vi.mocked(storage.setItem).mockImplementation(() => {
      throw new Error("quota");
    });
    const { result } = renderHook(() =>
      useArchiveScratch({
        operationLock: makeLock(),
        readAddDraftBlocker: () => false,
        readTitleBlocker: () => null,
        createOperationId: () => "00000000-0000-4000-8000-000000000001",
        getStorage: () => storage,
        dispatchArchive: vi.fn(),
        reconcileArchive: vi.fn(),
      }),
    );

    await act(async () => {
      await result.current.archiveScratch({
        id: "10000000-0000-4000-8000-000000000001",
        version: 7,
      });
    });
    expect(result.current.state).toMatchObject({
      phase: "storage_failed",
      recovery: null,
      attemptedScratchBitId: "10000000-0000-4000-8000-000000000001",
    });
  });
});
