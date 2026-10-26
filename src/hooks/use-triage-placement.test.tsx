import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  DirectPlacementCommand,
  PlacementResult,
  StagedPlacementCommand,
} from "@/lib/db/datastore";
import type { TriageOperationLock } from "./use-triage-operation-lock";
import {
  type TriagePlacementCommand,
  type TriagePlacementRelease,
  useTriagePlacement,
} from "./use-triage-placement";

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
  let active: { kind: "placement"; operationId: string } | null = null;
  return {
    get activeOperation() {
      return active;
    },
    isLocked: vi.fn(() => active !== null),
    acquire: vi.fn((kind: "placement", operationId: string) => {
      if (active !== null) return false;
      active = { kind, operationId };
      return true;
    }),
    release: vi.fn((operationId: string, status: PlacementResult["status"]) => {
      if (active?.operationId !== operationId) return false;
      if (![
        "applied",
        "already_applied",
        "not_applied",
        "rejected",
        "conflict",
      ].includes(status)) return false;
      active = null;
      return true;
    }),
  } as TriageOperationLock & {
    acquire: ReturnType<typeof vi.fn>;
    release: ReturnType<typeof vi.fn>;
  };
}

const directRelease: TriagePlacementRelease = {
  kind: "direct",
  scratchBitId: "scratch-1",
  source: { id: "source-1", title: "Direct source", version: 7 },
  target: {
    dropId: "triage-hierarchy:target-2",
    parentId: "target-2",
    level: 1,
    title: "Target two",
    path: ["Home", "Target one", "Target two"],
    expectedAncestorIds: ["target-1", "target-2"],
    cell: { x: 4, y: 5 },
    isFull: false,
  },
};

const stagedRelease: TriagePlacementRelease = {
  ...directRelease,
  kind: "staged",
  candidate: { id: "candidate-1", version: 3, resultType: "bit" },
};

function terminal(
  command: DirectPlacementCommand | StagedPlacementCommand,
  status: PlacementResult["status"] = "applied",
): PlacementResult {
  return {
    operationId: command.operationId,
    status,
    result:
      status === "applied" || status === "already_applied"
        ? ({ id: command.resultId, title: command.title } as PlacementResult["result"])
        : null,
    source: null,
    candidate: null,
  };
}

function authoritativeSource(overrides: Record<string, unknown> = {}) {
  return {
    id: "source-1",
    scratchBitId: "scratch-1",
    content: "Direct source",
    order: 0,
    consumedAt: null,
    version: 7,
    createdAt: 1,
    ...overrides,
  } as PlacementResult["source"];
}

describe("useTriagePlacement — Task 152 atomic foreground owner", () => {
  const ids = ["operation-1", "result-1"];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects Placement throughout an Archive owner without mutation, queue, or replay", () => {
    const dispatchPlacement = vi.fn();
    const operationLock: TriageOperationLock = {
      activeOperation: { kind: "archive", operationId: "archive-1" },
      isLocked: () => true,
      acquire: vi.fn(() => false),
      release: vi.fn(() => false),
    };
    const { result } = renderHook(() =>
      useTriagePlacement({ operationLock, dispatchPlacement }),
    );

    act(() => expect(result.current.begin(directRelease)).toBe(false));
    expect(result.current.snapshot).toBeNull();
    expect(dispatchPlacement).not.toHaveBeenCalled();
    expect(operationLock.acquire).not.toHaveBeenCalled();
  });

  it("keeps direct type selection distinct from confirmation while staged placement enters confirmation directly", () => {
    const direct = renderHook(() =>
      useTriagePlacement({
        operationLock: makeLock(),
        createId: () => ids.shift() ?? "unexpected",
      }),
    );

    act(() => expect(direct.result.current.begin(directRelease)).toBe(true));
    expect(direct.result.current.snapshot?.phase).toBe("direct-selection");
    expect(direct.result.current.snapshot?.resultType).toBeNull();

    act(() => expect(direct.result.current.selectDirectType("node")).toBe(true));
    expect(direct.result.current.snapshot?.phase).toBe("confirmation");
    expect(direct.result.current.snapshot?.resultType).toBe("node");

    const staged = renderHook(() =>
      useTriagePlacement({ operationLock: makeLock() }),
    );
    act(() => expect(staged.result.current.begin(stagedRelease)).toBe(true));
    expect(staged.result.current.snapshot).toMatchObject({
      phase: "confirmation",
      resultType: "bit",
    });
  });

  it("captures the exact source, candidate, target, path, cell, and IDs and dispatches staged placement exactly once", async () => {
    const lock = makeLock();
    const dispatchPlacement = vi.fn(async (command: TriagePlacementCommand) =>
      terminal(command),
    );
    const onApplied = vi.fn();
    const { result } = renderHook(() =>
      useTriagePlacement({
        operationLock: lock,
        createId: vi.fn().mockReturnValueOnce("operation-1").mockReturnValueOnce("result-1"),
        dispatchPlacement,
        onApplied,
      }),
    );

    act(() => result.current.begin(stagedRelease));
    let first!: Promise<boolean>;
    let duplicate!: Promise<boolean>;
    act(() => {
      first = result.current.confirm();
      duplicate = result.current.confirm();
    });
    await act(async () => {
      await expect(first).resolves.toBe(true);
      await expect(duplicate).resolves.toBe(false);
    });

    expect(lock.acquire).toHaveBeenCalledOnce();
    expect(lock.acquire).toHaveBeenCalledWith("placement", "operation-1");
    expect(dispatchPlacement).toHaveBeenCalledOnce();
    expect(dispatchPlacement).toHaveBeenCalledWith({
      operationId: "operation-1",
      resultId: "result-1",
      scratchBitId: "scratch-1",
      sourceBreakdownId: "source-1",
      sourceExpectedVersion: 7,
      candidateId: "candidate-1",
      candidateExpectedVersion: 3,
      resultType: "bit",
      title: "Direct source",
      targetParentId: "target-2",
      expectedAncestorIds: ["target-1", "target-2"],
      x: 4,
      y: 5,
    });
    expect(lock.release).toHaveBeenCalledWith("operation-1", "applied");
    expect(onApplied).toHaveBeenCalledWith(
      expect.objectContaining({ id: "result-1" }),
      expect.objectContaining({ operationId: "operation-1" }),
    );
    expect(result.current.snapshot).toMatchObject({
      phase: "success",
      terminalStatus: "applied",
    });
    await act(async () => {
      await expect(result.current.confirm()).resolves.toBe(true);
    });
    expect(result.current.snapshot).toBeNull();
  });

  it("retains the lock through pending, unknown, and reconciliation and only reconciles the exact command", async () => {
    const lock = makeLock();
    const pending = deferred<PlacementResult>();
    const reconciling = deferred<PlacementResult>();
    const dispatchPlacement = vi.fn(
      (command: TriagePlacementCommand) => {
        void command;
        return pending.promise;
      },
    );
    const reconcilePlacement = vi.fn(
      (command: TriagePlacementCommand) => {
        void command;
        return reconciling.promise;
      },
    );
    const { result } = renderHook(() =>
      useTriagePlacement({
        operationLock: lock,
        createId: vi.fn().mockReturnValueOnce("operation-1").mockReturnValueOnce("result-1"),
        dispatchPlacement,
        reconcilePlacement,
      }),
    );

    act(() => {
      result.current.begin(directRelease);
      result.current.selectDirectType("bit");
    });
    let confirmation!: Promise<boolean>;
    act(() => {
      confirmation = result.current.confirm();
    });
    expect(result.current.snapshot?.phase).toBe("pending");
    expect(result.current.cancel()).toBe(false);
    expect(result.current.invalidate(directRelease.target.dropId)).toBe(false);
    await act(async () => {
      pending.reject(new Error("transport outcome unknown"));
      await expect(confirmation).resolves.toBe(false);
    });
    expect(result.current.snapshot?.phase).toBe("unknown");
    expect(lock.release).not.toHaveBeenCalled();

    let reconciliation!: Promise<boolean>;
    act(() => {
      reconciliation = result.current.reconcile();
    });
    expect(result.current.snapshot?.phase).toBe("reconciling");
    expect(result.current.cancel()).toBe(false);
    expect(reconcilePlacement).toHaveBeenCalledWith(
      dispatchPlacement.mock.calls[0]![0],
    );
    await act(async () => {
      reconciling.resolve(terminal(dispatchPlacement.mock.calls[0]![0], "not_applied"));
      await expect(reconciliation).resolves.toBe(true);
    });
    expect(lock.release).toHaveBeenCalledWith("operation-1", "not_applied");
    expect(result.current.snapshot).toMatchObject({
      phase: "terminal",
      terminalStatus: "not_applied",
    });
  });

  it("never acquires or dispatches a full target, and Cancel still closes it", async () => {
    const lock = makeLock();
    const dispatchPlacement = vi.fn();
    const { result } = renderHook(() =>
      useTriagePlacement({ operationLock: lock, dispatchPlacement }),
    );
    act(() => result.current.begin({
      ...stagedRelease,
      target: { ...stagedRelease.target, cell: null, isFull: true },
    }));

    await expect(result.current.confirm()).resolves.toBe(false);
    expect(lock.acquire).not.toHaveBeenCalled();
    expect(dispatchPlacement).not.toHaveBeenCalled();
    act(() => expect(result.current.cancel()).toBe(true));
    expect(result.current.snapshot).toBeNull();
  });

  it("rejects start and Confirm while another operation owns the shared lock", async () => {
    const lock = makeLock();
    lock.acquire("placement", "other-operation");
    const dispatchPlacement = vi.fn();
    const { result } = renderHook(() =>
      useTriagePlacement({ operationLock: lock, dispatchPlacement }),
    );

    act(() => expect(result.current.begin(stagedRelease)).toBe(false));
    expect(result.current.snapshot).toBeNull();
    expect(dispatchPlacement).not.toHaveBeenCalled();
  });

  it("maps returned authoritative facts to not-applied, stale source, or stale target without a generic terminal", async () => {
    const cases = [
      {
        result: {
          operationId: "operation-1",
          status: "not_applied",
          result: null,
          source: authoritativeSource(),
          candidate: null,
        } satisfies PlacementResult,
        terminalKind: "not-applied",
      },
      {
        result: {
          operationId: "operation-1",
          status: "conflict",
          result: null,
          source: authoritativeSource({ version: 8 }),
          candidate: null,
        } satisfies PlacementResult,
        terminalKind: "stale-source",
      },
      {
        result: {
          operationId: "operation-1",
          status: "rejected",
          result: null,
          source: authoritativeSource(),
          candidate: null,
        } satisfies PlacementResult,
        terminalKind: "stale-target",
      },
    ] as const;

    for (const entry of cases) {
      const dispatchPlacement = vi.fn(async () => entry.result);
      const { result, unmount } = renderHook(() =>
        useTriagePlacement({
          operationLock: makeLock(),
          createId: vi
            .fn()
            .mockReturnValueOnce("operation-1")
            .mockReturnValueOnce("result-1"),
          dispatchPlacement,
        }),
      );
      act(() => {
        result.current.begin(directRelease);
        result.current.selectDirectType("bit");
      });
      await act(async () => {
        await expect(result.current.confirm()).resolves.toBe(true);
      });
      expect(result.current.snapshot).toMatchObject({
        phase: "terminal",
        terminalKind: entry.terminalKind,
      });
      unmount();
    }
  });

  it("keeps the account_limit reason of a rejected placement and names it its own terminal kind", async () => {
    const rejection = { code: "account_limit", table: "bits", limit: 300 };
    const dispatchPlacement = vi.fn(
      async (): Promise<PlacementResult> => ({
        operationId: "operation-1",
        status: "rejected",
        result: null,
        source: authoritativeSource(),
        candidate: null,
        rejection,
      }),
    );
    const { result } = renderHook(() =>
      useTriagePlacement({
        operationLock: makeLock(),
        createId: vi.fn().mockReturnValueOnce("operation-1").mockReturnValueOnce("result-1"),
        dispatchPlacement,
      }),
    );
    act(() => {
      result.current.begin(directRelease);
      result.current.selectDirectType("bit");
    });
    await act(async () => {
      await result.current.confirm();
    });
    expect(result.current.snapshot).toMatchObject({
      phase: "terminal",
      terminalStatus: "rejected",
      terminalKind: "account-limit",
      rejection,
    });
  });

  it("retries only authoritative not-applied with the same logical operation and preallocated result ID", async () => {
    const lock = makeLock();
    const dispatchPlacement = vi
      .fn<(command: TriagePlacementCommand) => Promise<PlacementResult>>()
      .mockImplementationOnce(async (command) => ({
        ...terminal(command, "not_applied"),
        source: authoritativeSource(),
      }))
      .mockImplementationOnce(async (command) => terminal(command, "applied"));
    const onApplied = vi.fn();
    const { result } = renderHook(() =>
      useTriagePlacement({
        operationLock: lock,
        createId: vi
          .fn()
          .mockReturnValueOnce("operation-1")
          .mockReturnValueOnce("result-1"),
        dispatchPlacement,
        onApplied,
      }),
    );
    act(() => {
      result.current.begin(directRelease);
      result.current.selectDirectType("bit");
    });
    await act(async () => {
      await result.current.confirm();
    });
    expect(result.current.snapshot).toMatchObject({
      phase: "terminal",
      terminalKind: "not-applied",
    });

    let retry!: Promise<boolean>;
    act(() => {
      retry = result.current.confirm();
    });
    expect(result.current.snapshot?.phase).toBe("pending");
    await act(async () => {
      await expect(retry).resolves.toBe(true);
    });
    expect(dispatchPlacement).toHaveBeenCalledTimes(2);
    expect(dispatchPlacement.mock.calls[1]![0]).toEqual(
      dispatchPlacement.mock.calls[0]![0],
    );
    expect(lock.acquire).toHaveBeenNthCalledWith(2, "placement", "operation-1");
    expect(onApplied).toHaveBeenCalledOnce();
  });
});

describe("useTriagePlacement — Task 154 title limits", () => {
  it.each([
    ["node", 100, "confirmation", null],
    ["node", 101, "result-title", ""],
    ["bit", 200, "confirmation", null],
    ["bit", 201, "result-title", ""],
  ] as const)(
    "starts staged %s length %i in %s without changing the source",
    (resultType, length, phase, resultTitleDraft) => {
      const sourceTitle = "x".repeat(length);
      const { result } = renderHook(() =>
        useTriagePlacement({ operationLock: makeLock() }),
      );

      act(() =>
        expect(
          result.current.begin({
            ...stagedRelease,
            source: { ...stagedRelease.source, title: sourceTitle },
            candidate: {
              ...stagedRelease.candidate!,
              resultType,
            },
          }),
        ).toBe(true),
      );

      expect(result.current.snapshot).toMatchObject({
        phase,
        release: { source: { title: sourceTitle } },
      });
      expect(result.current.snapshot).toHaveProperty(
        "resultTitleDraft",
        resultTitleDraft,
      );
    },
  );

  it.each([
    ["node", 100, true],
    ["node", 101, false],
    ["bit", 200, true],
    ["bit", 201, false],
  ] as const)(
    "allows direct %s selection at source length %i only when within its limit",
    (resultType, length, expected) => {
      const { result } = renderHook(() =>
        useTriagePlacement({ operationLock: makeLock() }),
      );
      act(() =>
        result.current.begin({
          ...directRelease,
          source: { ...directRelease.source, title: "x".repeat(length) },
        }),
      );

      act(() =>
        expect(result.current.selectDirectType(resultType)).toBe(expected),
      );
      expect(result.current.snapshot?.phase).toBe(
        expected ? "confirmation" : "direct-selection",
      );
    },
  );

  it.each([
    ["", false],
    ["   ", false],
    ["x".repeat(101), false],
    ["  Exact draft  ", true],
  ] as const)(
    "validates the exact staged Node draft %j without clipping or normalization",
    (draft, expected) => {
      const { result } = renderHook(() =>
        useTriagePlacement({ operationLock: makeLock() }),
      );
      act(() =>
        result.current.begin({
          ...stagedRelease,
          source: { ...stagedRelease.source, title: "s".repeat(101) },
          candidate: { ...stagedRelease.candidate!, resultType: "node" },
        }),
      );

      expect(result.current).toEqual(
        expect.objectContaining({
          changeResultTitle: expect.any(Function),
          continueResultTitle: expect.any(Function),
        }),
      );
      act(() =>
        expect(result.current.changeResultTitle(draft)).toBe(true),
      );
      expect(result.current.snapshot).toMatchObject({
        phase: "result-title",
        resultTitleDraft: draft,
        release: { source: { title: "s".repeat(101) } },
      });
      act(() =>
        expect(result.current.continueResultTitle()).toBe(expected),
      );
      expect(result.current.snapshot?.phase).toBe(
        expected ? "confirmation" : "result-title",
      );
    },
  );

  it("dispatches the valid staged draft while preserving the exact source snapshot", async () => {
    const dispatchPlacement = vi.fn(async (command: TriagePlacementCommand) =>
      terminal(command),
    );
    const sourceTitle = "s".repeat(201);
    const { result } = renderHook(() =>
      useTriagePlacement({
        operationLock: makeLock(),
        createId: vi
          .fn()
          .mockReturnValueOnce("operation-1")
          .mockReturnValueOnce("result-1"),
        dispatchPlacement,
      }),
    );
    act(() =>
      result.current.begin({
        ...stagedRelease,
        source: { ...stagedRelease.source, title: sourceTitle },
      }),
    );

    expect(result.current).toEqual(
      expect.objectContaining({
        changeResultTitle: expect.any(Function),
        continueResultTitle: expect.any(Function),
      }),
    );
    act(() => {
      result.current.changeResultTitle("Exact Bit draft");
      expect(result.current.continueResultTitle()).toBe(true);
    });
    await act(async () => {
      await expect(result.current.confirm()).resolves.toBe(true);
    });

    expect(dispatchPlacement).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Exact Bit draft" }),
    );
    expect(result.current.snapshot?.release.source.title).toBe(sourceTitle);
  });
});
