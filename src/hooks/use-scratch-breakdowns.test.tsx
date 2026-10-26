import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  AddBreakdownCommand,
  DataStore,
  DeleteBreakdownCommand,
} from "@/lib/db/datastore";
import type { ScratchBreakdown } from "@/lib/db/schema";
import type { TriageOperationLock } from "@/hooks/use-triage-operation-lock";
import type { Bit } from "@/types";
import type { CreatedAtSortDirection } from "@/stores/triage-preferences-store";
import { useScratchBreakdowns } from "./use-scratch-breakdowns";
import { createScratchTitleBlockerHandle } from "./use-scratch-breakdowns";

const getDataStoreMock = vi.hoisted(() => vi.fn());
const liveReadMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/datastore", () => ({
  getDataStore: getDataStoreMock,
  liveRead: (read: (store: unknown) => Promise<unknown>) =>
    liveReadMock(() => getDataStoreMock().then(read)),
}));

type BreakdownQueryResult = {
  scratchBitId: string;
  rows: ScratchBreakdown[];
  archiveEligible: boolean;
};

type LiveQueryObserver = {
  next: (value: BreakdownQueryResult) => void;
  error: (error: unknown) => void;
};

type LiveQuerySubscription = {
  observer?: LiveQueryObserver;
  query: () => Promise<BreakdownQueryResult>;
  unsubscribe: ReturnType<typeof vi.fn>;
};

const subscriptions: LiveQuerySubscription[] = [];

function createScratchBreakdown(
  overrides: Partial<ScratchBreakdown> = {},
): ScratchBreakdown {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    scratchBitId: overrides.scratchBitId ?? "scratch-bit-1",
    content: overrides.content ?? "breakdown content",
    order: overrides.order ?? 0,
    createdAt: overrides.createdAt ?? 1,
    consumedAt: overrides.consumedAt ?? null,
    version: overrides.version ?? 1,
  };
}

function createScratch(overrides: Partial<Bit> = {}): Bit {
  return {
    id: overrides.id ?? "scratch-1",
    title: overrides.title ?? "Original title",
    description: overrides.description ?? "",
    icon: overrides.icon ?? "sparkles",
    deadline: overrides.deadline ?? null,
    deadlineAllDay: overrides.deadlineAllDay ?? false,
    priority: overrides.priority ?? null,
    status: overrides.status ?? "active",
    mtime: overrides.mtime ?? 1,
    createdAt: overrides.createdAt ?? 1,
    parentId: overrides.parentId ?? "inbox",
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    deletedAt: overrides.deletedAt ?? null,
    archivedAt: overrides.archivedAt ?? null,
    version: overrides.version ?? 3,
    pastDeadlineDismissed: overrides.pastDeadlineDismissed ?? false,
  };
}

function createOperationLock(): TriageOperationLock & {
  acquire: ReturnType<typeof vi.fn>;
  release: ReturnType<typeof vi.fn>;
} {
  let activeOperation: TriageOperationLock["activeOperation"] = null;
  const acquire = vi.fn((kind, operationId) => {
    if (activeOperation !== null) return false;
    activeOperation = { kind, operationId };
    return true;
  });
  const release = vi.fn((operationId, status) => {
    if (
      activeOperation?.operationId !== operationId ||
      !["applied", "already_applied", "not_applied", "rejected", "conflict"].includes(status)
    ) {
      return false;
    }
    activeOperation = null;
    return true;
  });
  return {
    get activeOperation() {
      return activeOperation;
    },
    isLocked: () => activeOperation !== null,
    acquire,
    release,
  };
}

function createDataStore() {
  return {
    getScratchBreakdowns: vi.fn().mockResolvedValue([]),
    getScratchArchiveEligibility: vi.fn().mockResolvedValue({
      eligible: false,
      scratch: null,
      consumedCount: 0,
      unconsumedCount: 0,
      stagedCandidateCount: 0,
    }),
    addBreakdown: vi.fn(),
    reconcileAddBreakdown: vi.fn(),
    deleteBreakdown: vi.fn(),
    reconcileDeleteBreakdown: vi.fn(),
    saveScratchTitle: vi.fn(),
    reconcileSaveScratchTitle: vi.fn(),
    saveBreakdown: vi.fn(),
    reconcileSaveBreakdown: vi.fn(),
  } as unknown as DataStore & {
    getScratchBreakdowns: ReturnType<typeof vi.fn>;
    getScratchArchiveEligibility: ReturnType<typeof vi.fn>;
    addBreakdown: ReturnType<typeof vi.fn>;
    reconcileAddBreakdown: ReturnType<typeof vi.fn>;
    deleteBreakdown: ReturnType<typeof vi.fn>;
    reconcileDeleteBreakdown: ReturnType<typeof vi.fn>;
    saveScratchTitle: ReturnType<typeof vi.fn>;
    reconcileSaveScratchTitle: ReturnType<typeof vi.fn>;
    saveBreakdown: ReturnType<typeof vi.fn>;
    reconcileSaveBreakdown: ReturnType<typeof vi.fn>;
  };
}

function addCommand(): AddBreakdownCommand {
  return {
    operationId: "11111111-1111-4111-8111-111111111111",
    breakdownId: "22222222-2222-4222-8222-222222222222",
    scratchBitId: "33333333-3333-4333-8333-333333333333",
    scratchExpectedVersion: 4,
    content: "first note",
  };
}

function deleteCommand(): DeleteBreakdownCommand {
  return {
    operationId: "44444444-4444-4444-8444-444444444444",
    breakdownId: "55555555-5555-4555-8555-555555555555",
    expectedVersion: 2,
    scratchBitId: "33333333-3333-4333-8333-333333333333",
    scratchExpectedVersion: 4,
  };
}

function emitBreakdowns(
  value: ScratchBreakdown[],
  archiveEligible = false,
  scratchBitId = "scratch-1",
) {
  act(() => {
    subscriptions.at(-1)?.observer?.next({
      scratchBitId,
      rows: value,
      archiveEligible,
    });
  });
}

describe("useScratchBreakdowns", () => {
  let dataStore: ReturnType<typeof createDataStore>;

  beforeEach(() => {
    vi.clearAllMocks();
    subscriptions.length = 0;
    dataStore = createDataStore();
    getDataStoreMock.mockResolvedValue(dataStore);
    liveReadMock.mockImplementation(
      (query: () => Promise<BreakdownQueryResult>) => {
        const subscription: LiveQuerySubscription = {
          query,
          unsubscribe: vi.fn(),
        };
        subscriptions.push(subscription);

        return {
          subscribe: (observer: LiveQueryObserver) => {
            subscription.observer = observer;
            void query().then(observer.next).catch(observer.error);
            return { unsubscribe: subscription.unsubscribe };
          },
        };
      },
    );
  });

  it("returns an empty list without subscribing when scratchBitId is null", () => {
    const { result } = renderHook(() => useScratchBreakdowns(null));

    expect(result.current.breakdowns).toEqual([]);
    expect(result.current.isReady).toBe(false);
    expect(result.current.isArchiveEligible).toBe(false);
    expect(result.current.editor).toEqual(
      expect.objectContaining({
        snapshot: null,
        titleBlocker: null,
        openScratchTitle: expect.any(Function),
        openBreakdown: expect.any(Function),
        changeDraft: expect.any(Function),
        save: expect.any(Function),
        reconcile: expect.any(Function),
        useMine: expect.any(Function),
        useLatest: expect.any(Function),
        cancel: expect.any(Function),
        invalidate: expect.any(Function),
        stayHere: expect.any(Function),
      }),
    );
    expect(liveReadMock).not.toHaveBeenCalled();
    expect(getDataStoreMock).not.toHaveBeenCalled();
  });

  it("distinguishes the first current snapshot from an authoritative empty snapshot", () => {
    const { result } = renderHook(() => useScratchBreakdowns("scratch-1"));

    expect(result.current.breakdowns).toEqual([]);
    expect(result.current.isReady).toBe(false);

    emitBreakdowns([], false, "scratch-other");
    expect(result.current.isReady).toBe(false);

    emitBreakdowns([], false, "scratch-1");
    expect(result.current.breakdowns).toEqual([]);
    expect(result.current.isReady).toBe(true);
  });

  it("subscribes to scratch breakdowns for the selected scratch bit", async () => {
    const rows = [
      createScratchBreakdown({
        id: "row-1",
        scratchBitId: "scratch-1",
        content: "first row",
      }),
    ];

    const { result } = renderHook(() => useScratchBreakdowns("scratch-1"));

    await waitFor(() => {
      expect(dataStore.getScratchBreakdowns).toHaveBeenCalledWith("scratch-1");
      expect(dataStore.getScratchArchiveEligibility).toHaveBeenCalledWith(
        "scratch-1",
      );
    });

    emitBreakdowns(rows);

    expect(liveReadMock).toHaveBeenCalledTimes(1);
    expect(result.current.breakdowns).toEqual(rows);
  });

  it("dispatches the authoritative Add command and retains its terminal state slot", async () => {
    const command = addCommand();
    dataStore.addBreakdown.mockResolvedValue({
      operationId: command.operationId,
      status: "applied",
      breakdown: null,
      scratch: null,
    });
    const { result } = renderHook(() =>
      useScratchBreakdowns(command.scratchBitId),
    );

    await waitFor(() => {
      expect(dataStore.getScratchBreakdowns).toHaveBeenCalledWith(
        command.scratchBitId,
      );
    });

    await act(async () => {
      await expect(result.current.addBreakdown(command)).resolves.toMatchObject({
        status: "applied",
      });
    });

    expect(dataStore.addBreakdown).toHaveBeenCalledWith(command);
    expect(result.current.operations).toEqual([
      expect.objectContaining({
        kind: "add",
        operationId: command.operationId,
        phase: "terminal",
        status: "applied",
      }),
    ]);
  });

  it("preserves an unknown Add identity and reconciles without resending Add", async () => {
    const command = addCommand();
    dataStore.addBreakdown.mockRejectedValue(new Error("unknown transport outcome"));
    dataStore.reconcileAddBreakdown.mockResolvedValue({
      operationId: command.operationId,
      status: "not_applied",
      breakdown: null,
      scratch: null,
    });
    const { result } = renderHook(() =>
      useScratchBreakdowns(command.scratchBitId),
    );

    await act(async () => {
      await expect(result.current.addBreakdown(command)).resolves.toEqual({
        operationId: command.operationId,
        outcome: "unknown",
      });
    });
    expect(result.current.operations).toEqual([
      expect.objectContaining({ phase: "unknown", operationId: command.operationId }),
    ]);

    await act(async () => {
      await expect(
        result.current.reconcileAddBreakdown(command),
      ).resolves.toMatchObject({ status: "not_applied" });
    });

    expect(dataStore.addBreakdown).toHaveBeenCalledTimes(1);
    expect(dataStore.reconcileAddBreakdown).toHaveBeenCalledWith(command);
    expect(result.current.operations).toEqual([
      expect.objectContaining({ phase: "terminal", status: "not_applied" }),
    ]);
  });

  it("dispatches and reconciles the authoritative Delete command identity", async () => {
    const command = deleteCommand();
    dataStore.deleteBreakdown.mockRejectedValue(new Error("unknown transport outcome"));
    dataStore.reconcileDeleteBreakdown.mockResolvedValue({
      operationId: command.operationId,
      status: "applied",
      breakdown: null,
      candidate: null,
      scratch: null,
    });
    const { result } = renderHook(() => useScratchBreakdowns("scratch-1"));

    await act(async () => {
      await expect(result.current.deleteBreakdown(command)).resolves.toEqual({
        operationId: command.operationId,
        outcome: "unknown",
      });
      await expect(
        result.current.reconcileDeleteBreakdown(command),
      ).resolves.toMatchObject({ status: "applied" });
    });

    expect(dataStore.deleteBreakdown).toHaveBeenCalledWith(command);
    expect(dataStore.reconcileDeleteBreakdown).toHaveBeenCalledWith(command);
  });

  it("retains the Delete source snapshot when reactive truth disappears during an unknown outcome", async () => {
    const command = deleteCommand();
    const source = createScratchBreakdown({
      id: command.breakdownId,
      scratchBitId: command.scratchBitId,
      content: "Retained source",
      version: command.expectedVersion,
    });
    dataStore.deleteBreakdown.mockRejectedValue(
      new Error("commit may have applied before transport failed"),
    );
    const { result } = renderHook(() =>
      useScratchBreakdowns(command.scratchBitId),
    );
    emitBreakdowns([source], false, command.scratchBitId);

    await act(async () => {
      await expect(result.current.deleteBreakdown(command)).resolves.toEqual({
        operationId: command.operationId,
        outcome: "unknown",
      });
    });
    emitBreakdowns([], false, command.scratchBitId);

    expect(result.current.operations).toEqual([
      expect.objectContaining({
        kind: "delete",
        phase: "unknown",
        sourceSnapshot: source,
      }),
    ]);
    expect(result.current.breakdowns).toEqual([source]);
  });

  it.each([
    ["DESC", ["newer-low-order-a", "newer-low-order-b", "newer-high-order", "older"]],
    ["ASC", ["older", "newer-low-order-a", "newer-low-order-b", "newer-high-order"]],
  ] as const)(
    "sorts active rows by createdAt %s then order and stable id",
    (sort, expectedIds) => {
      const { result } = renderHook(() =>
        useScratchBreakdowns("scratch-1", sort as CreatedAtSortDirection),
      );
      emitBreakdowns([
        createScratchBreakdown({
          id: "newer-high-order",
          createdAt: 20,
          order: 2,
        }),
        createScratchBreakdown({ id: "older", createdAt: 10, order: 8 }),
        createScratchBreakdown({
          id: "newer-low-order-b",
          createdAt: 20,
          order: 1,
        }),
        createScratchBreakdown({
          id: "newer-low-order-a",
          createdAt: 20,
          order: 1,
        }),
      ]);

      expect(result.current.breakdowns.map(({ id }) => id)).toEqual(
        expectedIds,
      );
    },
  );

  it("removes consumed rows from the active projection while retaining completion evidence", () => {
    const { result } = renderHook(() =>
      useScratchBreakdowns("scratch-1", "DESC"),
    );

    emitBreakdowns([
      createScratchBreakdown({ id: "active", consumedAt: null }),
      createScratchBreakdown({ id: "consumed", consumedAt: 25 }),
    ]);

    expect(result.current.breakdowns.map(({ id }) => id)).toEqual(["active"]);
    expect(result.current.consumedBreakdownCount).toBe(1);
    expect(result.current.hasObservedBreakdownHistory).toBe(true);
  });

  it("distinguishes an observed all-deleted history from a never-used empty snapshot", () => {
    const { result } = renderHook(() =>
      useScratchBreakdowns("scratch-1", "DESC"),
    );

    emitBreakdowns([], false, "scratch-a");
    expect(result.current.hasObservedBreakdownHistory).toBe(false);

    emitBreakdowns([createScratchBreakdown({ id: "row-1" })]);
    emitBreakdowns([], false, "scratch-b");

    expect(result.current.breakdowns).toEqual([]);
    expect(result.current.consumedBreakdownCount).toBe(0);
    expect(result.current.hasObservedBreakdownHistory).toBe(true);
  });

  it("retains observed deletion history per Scratch across selection switches", () => {
    const { result, rerender } = renderHook(
      ({ scratchBitId }: { scratchBitId: string }) =>
        useScratchBreakdowns(scratchBitId, "DESC"),
      { initialProps: { scratchBitId: "scratch-a" } },
    );

    emitBreakdowns(
      [createScratchBreakdown({ id: "row-a", scratchBitId: "scratch-a" })],
      false,
      "scratch-a",
    );
    emitBreakdowns([], false, "scratch-a");
    expect(result.current.hasObservedBreakdownHistory).toBe(true);

    rerender({ scratchBitId: "scratch-b" });
    emitBreakdowns([]);
    expect(result.current.hasObservedBreakdownHistory).toBe(false);

    rerender({ scratchBitId: "scratch-a" });
    emitBreakdowns([]);
    expect(result.current.hasObservedBreakdownHistory).toBe(true);
  });

  it("fails completion closed until repository archive eligibility is authoritative", () => {
    const { result } = renderHook(() =>
      useScratchBreakdowns("scratch-1", "DESC"),
    );

    expect(result.current.isArchiveEligible).toBe(false);

    emitBreakdowns(
      [createScratchBreakdown({ id: "consumed", consumedAt: 25 })],
      true,
    );

    expect(result.current.isArchiveEligible).toBe(true);
  });

  it("opens a Scratch-title editor, tracks dirty validation, and exposes a synchronous blocker", async () => {
    const lock = createOperationLock();
    const scratch = createScratch();
    const { result } = renderHook(() =>
      useScratchBreakdowns("scratch-1", "DESC", { operationLock: lock }),
    );

    act(() => {
      expect(result.current.editor.openScratchTitle(scratch)).toBe(true);
    });
    expect(result.current.editor.snapshot).toMatchObject({
      target: { kind: "scratch-title", id: scratch.id },
      phase: "pristine",
      base: { value: scratch.title, version: scratch.version },
      draft: scratch.title,
      focusIntent: "field-end",
    });
    expect(result.current.editor.titleBlocker).toBe("open");

    act(() => result.current.editor.changeDraft("Changed title"));
    expect(result.current.editor.snapshot).toMatchObject({
      phase: "dirty",
      draft: "Changed title",
    });
    expect(result.current.editor.titleBlocker).toBe("dirty");

    act(() => result.current.editor.changeDraft("   "));
    await act(async () => {
      expect(await result.current.editor.save()).toBe(false);
    });
    expect(result.current.editor.snapshot).toMatchObject({ phase: "validation" });
    expect(dataStore.saveScratchTitle).not.toHaveBeenCalled();
  });

  it("blocks Edit open/save behind the shared lock and acquires edit synchronously before dispatch", async () => {
    const lock = createOperationLock();
    expect(lock.acquire("add", "add-1")).toBe(true);
    const { result } = renderHook(() =>
      useScratchBreakdowns("scratch-1", "DESC", { operationLock: lock }),
    );

    act(() => {
      expect(result.current.editor.openScratchTitle(createScratch())).toBe(false);
    });
    expect(result.current.editor.snapshot).toBeNull();

    expect(lock.release("add-1", "applied")).toBe(true);
    act(() => {
      expect(result.current.editor.openScratchTitle(createScratch())).toBe(true);
      result.current.editor.changeDraft("Changed title");
      expect(
        result.current.editor.openBreakdown(
          createScratchBreakdown({ id: "row-competing" }),
          false,
        ),
      ).toBe(false);
    });
    expect(result.current.editor.snapshot).toMatchObject({
      target: { kind: "scratch-title" },
      draft: "Changed title",
    });
    expect(lock.acquire("delete", "delete-1")).toBe(true);
    await act(async () => {
      expect(await result.current.editor.save()).toBe(false);
    });
    expect(dataStore.saveScratchTitle).not.toHaveBeenCalled();
    expect(lock.release("delete-1", "not_applied")).toBe(true);
    dataStore.saveScratchTitle.mockImplementation(async (command) => {
      expect(lock.activeOperation).toEqual({
        kind: "edit",
        operationId: command.operationId,
      });
      return {
        operationId: command.operationId,
        status: "applied",
        scratch: createScratch({ title: command.title, version: 4 }),
      };
    });

    await act(async () => {
      expect(await result.current.editor.save()).toBe(true);
    });
    expect(dataStore.saveScratchTitle).toHaveBeenCalledTimes(1);
    expect(result.current.editor.snapshot).toBeNull();
    expect(result.current.editor.focusIntent).toBe("edit-trigger");
    expect(lock.activeOperation).toBeNull();
  });

  it("retains edit identity through unknown reconciliation and releases only at terminal conflict", async () => {
    const lock = createOperationLock();
    const scratch = createScratch({ title: "A", version: 3 });
    dataStore.saveScratchTitle.mockRejectedValue(new Error("unknown outcome"));
    dataStore.reconcileSaveScratchTitle.mockResolvedValue({
      operationId: "unused",
      status: "conflict",
      scratch: createScratch({ title: "A", version: 5 }),
    });
    const { result } = renderHook(() =>
      useScratchBreakdowns("scratch-1", "DESC", { operationLock: lock }),
    );
    act(() => {
      result.current.editor.openScratchTitle(scratch);
      result.current.editor.changeDraft("Mine");
    });

    await act(async () => {
      expect(await result.current.editor.save()).toBe(false);
    });
    const operationId = lock.activeOperation?.operationId;
    expect(operationId).toBeTruthy();
    expect(result.current.editor.snapshot).toMatchObject({ phase: "reconciling" });
    expect(result.current.editor.titleBlocker).toBe("reconciling");
    expect(lock.release).not.toHaveBeenCalledWith(operationId, expect.anything());

    dataStore.reconcileSaveScratchTitle.mockImplementation(async (command) => ({
      operationId: command.operationId,
      status: "conflict",
      scratch: createScratch({ title: "A", version: 5 }),
    }));
    await act(async () => {
      expect(await result.current.editor.reconcile()).toBe(false);
    });
    expect(result.current.editor.snapshot).toMatchObject({
      phase: "conflict",
      latest: { value: "A", version: 5 },
      draft: "Mine",
    });
    expect(result.current.editor.titleBlocker).toBe("conflicted");
    expect(lock.release).toHaveBeenCalledWith(operationId, "conflict");
  });

  it("uses only the acknowledged ABA latest version for Use mine and Use latest writes nothing", async () => {
    const lock = createOperationLock();
    dataStore.saveScratchTitle
      .mockImplementationOnce(async (command) => ({
        operationId: command.operationId,
        status: "conflict",
        scratch: createScratch({ title: "A", version: 5 }),
      }))
      .mockImplementationOnce(async (command) => ({
        operationId: command.operationId,
        status: "applied",
        scratch: createScratch({ title: command.title, version: 6 }),
      }));
    const { result } = renderHook(() =>
      useScratchBreakdowns("scratch-1", "DESC", { operationLock: lock }),
    );
    act(() => {
      result.current.editor.openScratchTitle(createScratch({ title: "A", version: 3 }));
      result.current.editor.changeDraft("Mine");
    });
    await act(async () => void (await result.current.editor.save()));
    await act(async () => {
      expect(await result.current.editor.useMine()).toBe(true);
    });
    expect(dataStore.saveScratchTitle).toHaveBeenLastCalledWith(
      expect.objectContaining({ expectedVersion: 5, baseTitle: "A", title: "Mine" }),
    );

    dataStore.saveScratchTitle.mockImplementationOnce(async (command) => ({
      operationId: command.operationId,
      status: "conflict",
      scratch: createScratch({ title: "Latest", version: 7 }),
    }));
    act(() => {
      result.current.editor.openScratchTitle(createScratch({ title: "Base", version: 6 }));
      result.current.editor.changeDraft("Draft");
    });
    await act(async () => void (await result.current.editor.save()));
    const callsBeforeUseLatest = dataStore.saveScratchTitle.mock.calls.length;
    act(() => expect(result.current.editor.useLatest()).toBe(true));
    expect(dataStore.saveScratchTitle).toHaveBeenCalledTimes(callsBeforeUseLatest);
    expect(result.current.editor.snapshot).toBeNull();
  });

  it("distinguishes offline and not-applied while preserving the draft", async () => {
    const lock = createOperationLock();
    const online = vi.fn(() => false);
    const { result, rerender } = renderHook(
      ({ isOnline }) =>
        useScratchBreakdowns("scratch-1", "DESC", {
          operationLock: lock,
          isOnline,
        }),
      { initialProps: { isOnline: online } },
    );
    act(() => {
      result.current.editor.openScratchTitle(createScratch());
      result.current.editor.changeDraft("Offline draft");
    });
    await act(async () => expect(await result.current.editor.save()).toBe(false));
    expect(result.current.editor.snapshot).toMatchObject({
      phase: "offline",
      draft: "Offline draft",
    });
    expect(dataStore.saveScratchTitle).not.toHaveBeenCalled();

    const nowOnline = vi.fn(() => true);
    rerender({ isOnline: nowOnline });
    dataStore.saveScratchTitle.mockImplementation(async (command) => ({
      operationId: command.operationId,
      status: "not_applied",
      scratch: createScratch(),
    }));
    await act(async () => expect(await result.current.editor.save()).toBe(false));
    expect(result.current.editor.snapshot).toMatchObject({
      phase: "not_applied",
      draft: "Offline draft",
    });
  });

  it("rejects staged row saves and preserves a copyable draft on lifecycle invalidation", async () => {
    const lock = createOperationLock();
    const row = createScratchBreakdown({ id: "row-1", content: "Base", version: 2 });
    const { result } = renderHook(() =>
      useScratchBreakdowns("scratch-1", "DESC", { operationLock: lock }),
    );

    act(() => expect(result.current.editor.openBreakdown(row, true)).toBe(false));
    expect(result.current.editor.snapshot).toBeNull();
    act(() => {
      expect(result.current.editor.openBreakdown(row, false)).toBe(true);
      result.current.editor.changeDraft("Protected draft");
      result.current.editor.invalidate();
    });
    expect(result.current.editor.snapshot).toMatchObject({
      phase: "invalidated",
      draft: "Protected draft",
      copyableDraft: "Protected draft",
      focusIntent: "active-scratch-fallback",
    });
    await act(async () => expect(await result.current.editor.save()).toBe(false));
    expect(dataStore.saveBreakdown).not.toHaveBeenCalled();
  });

  it("runs one save-before-action intent only after success and Stay here cancels only the intent", async () => {
    const lock = createOperationLock();
    const continueAction = vi.fn();
    dataStore.saveScratchTitle.mockImplementation(async (command) => ({
      operationId: command.operationId,
      status: "applied",
      scratch: createScratch({ title: command.title, version: 4 }),
    }));
    const { result } = renderHook(() =>
      useScratchBreakdowns("scratch-1", "DESC", { operationLock: lock }),
    );
    act(() => {
      result.current.editor.openScratchTitle(createScratch());
      result.current.editor.changeDraft("Changed");
    });
    await act(async () => {
      expect(await result.current.editor.save(continueAction)).toBe(true);
    });
    expect(continueAction).toHaveBeenCalledTimes(1);

    let resolveSave: ((value: unknown) => void) | undefined;
    dataStore.saveScratchTitle.mockImplementation(
      () => new Promise((resolve) => { resolveSave = resolve; }),
    );
    act(() => {
      result.current.editor.openScratchTitle(createScratch());
      result.current.editor.changeDraft("Another");
    });
    let pendingSave: Promise<boolean> | undefined;
    act(() => {
      pendingSave = result.current.editor.save(continueAction);
    });
    await waitFor(() => expect(resolveSave).toBeTypeOf("function"));
    expect(result.current.editor.snapshot).toMatchObject({
      phase: "saving",
      pendingIntent: true,
    });
    act(() => result.current.editor.stayHere());
    expect(result.current.editor.snapshot).toMatchObject({
      phase: "saving",
      pendingIntent: false,
    });
    await act(async () => {
      resolveSave?.({
        operationId: lock.activeOperation?.operationId,
        status: "applied",
        scratch: createScratch({ title: "Another", version: 4 }),
      });
      await pendingSave;
    });
    expect(continueAction).toHaveBeenCalledTimes(1);
  });

  it("conditionally saves a row base snapshot and classifies already-applied and rejected results", async () => {
    const lock = createOperationLock();
    const row = createScratchBreakdown({
      id: "row-1",
      content: "Base row",
      order: 4,
      version: 2,
    });
    dataStore.saveBreakdown
      .mockImplementationOnce(async (command) => ({
        operationId: command.operationId,
        status: "already_applied",
        breakdown: createScratchBreakdown({
          ...row,
          content: command.content,
          version: 3,
        }),
        candidate: null,
        scratch: createScratch(),
      }))
      .mockImplementationOnce(async (command) => ({
        operationId: command.operationId,
        status: "rejected",
        breakdown: null,
        candidate: null,
        scratch: null,
      }));
    const { result } = renderHook(() =>
      useScratchBreakdowns("scratch-1", "DESC", { operationLock: lock }),
    );

    act(() => {
      result.current.editor.openBreakdown(row, false);
      result.current.editor.changeDraft("Changed row");
    });
    await act(async () => expect(await result.current.editor.save()).toBe(true));
    expect(dataStore.saveBreakdown).toHaveBeenLastCalledWith(
      expect.objectContaining({
        breakdownId: row.id,
        expectedVersion: 2,
        baseContent: "Base row",
        baseOrder: 4,
        content: "Changed row",
        order: 4,
      }),
    );

    act(() => {
      result.current.editor.openBreakdown(row, false);
      result.current.editor.changeDraft("Copy me");
    });
    await act(async () => expect(await result.current.editor.save()).toBe(false));
    expect(result.current.editor.snapshot).toMatchObject({
      phase: "invalidated",
      copyableDraft: "Copy me",
    });
  });

  it("publishes every Scratch-title blocker transition through the synchronous mounted-page handle", async () => {
    const lock = createOperationLock();
    const blockerHandle = createScratchTitleBlockerHandle();
    let resolveSave: ((value: unknown) => void) | undefined;
    dataStore.saveScratchTitle.mockImplementation(
      () => new Promise((resolve) => { resolveSave = resolve; }),
    );
    const { result } = renderHook(() =>
      useScratchBreakdowns("scratch-1", "DESC", {
        operationLock: lock,
        titleBlockerHandle: blockerHandle,
      }),
    );

    act(() => result.current.editor.openScratchTitle(createScratch()));
    expect(blockerHandle.getSnapshot()).toBe("open");
    act(() => result.current.editor.changeDraft("Dirty"));
    expect(blockerHandle.getSnapshot()).toBe("dirty");
    let pendingSave: Promise<boolean> | undefined;
    act(() => { pendingSave = result.current.editor.save(); });
    await waitFor(() => expect(resolveSave).toBeTypeOf("function"));
    expect(blockerHandle.getSnapshot()).toBe("saving");
    await act(async () => {
      resolveSave?.({
        operationId: lock.activeOperation?.operationId,
        status: "conflict",
        scratch: createScratch({ title: "Latest", version: 4 }),
      });
      await pendingSave;
    });
    expect(blockerHandle.getSnapshot()).toBe("conflicted");
  });

  it("publishes pristine, dirty, saving, conflicted, and resolved breakdown-row intent through the mounted handle", async () => {
    const lock = createOperationLock();
    const blockerHandle = createScratchTitleBlockerHandle();
    const row = createScratchBreakdown({
      id: "row-edit-intent",
      content: "Base row",
      version: 2,
    });
    let resolveSave: ((value: unknown) => void) | undefined;
    dataStore.saveBreakdown.mockImplementation(
      () => new Promise((resolve) => { resolveSave = resolve; }),
    );
    const { result } = renderHook(() =>
      useScratchBreakdowns("scratch-1", "DESC", {
        operationLock: lock,
        titleBlockerHandle: blockerHandle,
      }),
    );

    act(() => expect(result.current.editor.openBreakdown(row, false)).toBe(true));
    expect(blockerHandle.getSnapshot()).toBe("open");
    act(() => result.current.editor.changeDraft("Dirty row"));
    expect(blockerHandle.getSnapshot()).toBe("dirty");
    let pendingSave: Promise<boolean> | undefined;
    act(() => { pendingSave = result.current.editor.save(); });
    await waitFor(() => expect(resolveSave).toBeTypeOf("function"));
    expect(blockerHandle.getSnapshot()).toBe("saving");
    await act(async () => {
      resolveSave?.({
        operationId: lock.activeOperation?.operationId,
        status: "conflict",
        breakdown: { ...row, content: "Latest row", version: 3 },
      });
      await pendingSave;
    });
    expect(blockerHandle.getSnapshot()).toBe("conflicted");
    act(() => expect(result.current.editor.cancel()).toBe(true));
    expect(blockerHandle.getSnapshot()).toBeNull();
  });
});
