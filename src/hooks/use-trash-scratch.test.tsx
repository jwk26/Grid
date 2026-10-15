import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrashScratchCommand, TrashScratchResult } from "@/lib/db/datastore";
import type { Bit, ScratchBreakdown, StagedCandidate } from "@/lib/db/schema";
import { useTriageStore } from "@/stores/triage-store";
import { useTriageOperationLock } from "./use-triage-operation-lock";
import {
  useTrashScratch,
  type TrashScratchApplied,
  type TrashScratchSnapshot,
} from "./use-trash-scratch";

vi.mock("@/lib/db/datastore", () => ({ getDataStore: vi.fn() }));

const A = "00000000-0000-4000-8000-0000000000a1";
const B = "00000000-0000-4000-8000-0000000000b2";

function bit(id: string, overrides: Partial<Bit> = {}): Bit {
  return {
    id,
    title: `Scratch ${id.slice(-2)}`,
    description: "",
    icon: "sparkles",
    deadline: null,
    deadlineAllDay: false,
    priority: null,
    status: "active",
    mtime: 1,
    createdAt: 1,
    parentId: "inbox",
    x: 0,
    y: 0,
    deletedAt: null,
    archivedAt: null,
    version: 4,
    pastDeadlineDismissed: false,
    ...overrides,
  };
}

function source(id: string, scratchBitId: string, overrides: Partial<ScratchBreakdown> = {}): ScratchBreakdown {
  return { id, scratchBitId, content: id, order: 0, createdAt: 1, consumedAt: null, version: 2, ...overrides };
}

function candidate(id: string, sourceBreakdownId: string, scratchBitId: string): StagedCandidate {
  return {
    id,
    scratchBitId,
    sourceBreakdownId,
    resultType: "bit",
    lifecycle: "staged",
    createdAt: 1,
    updatedAt: 1,
    version: 3,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function result(status: TrashScratchResult["status"], scratch: Bit | null = null): TrashScratchResult {
  return { operationId: "op", status, scratch, candidates: [] };
}

const emptySnapshot: TrashScratchSnapshot = {
  scratches: [bit(A), bit(B)],
  candidates: [],
  sources: [],
};

type Props = {
  snapshot: TrashScratchSnapshot | null;
  selectedScratchId?: string | null;
  placementOpen?: boolean;
  discardable?: boolean;
};

function setup(
  initial: Props,
  options: {
    dispatchTrash?: (command: TrashScratchCommand) => Promise<TrashScratchResult>;
    reconcileTrash?: (command: TrashScratchCommand) => Promise<TrashScratchResult>;
    onApplied?: (applied: TrashScratchApplied) => void | Promise<void>;
  } = {},
) {
  let ids = 0;
  const hook = renderHook(
    (props: Props) => {
      const operationLock = useTriageOperationLock();
      const trash = useTrashScratch({
        operationLock,
        snapshot: props.snapshot,
        selectedScratchId: props.selectedScratchId ?? A,
        hasDiscardableWork: () => props.discardable ?? false,
        isPlacementOpen: () => props.placementOpen ?? false,
        createOperationId: () => `op-${(ids += 1)}`,
        ...options,
      });
      return { operationLock, trash };
    },
    { initialProps: initial },
  );
  return hook;
}

beforeEach(() => {
  useTriageStore.setState({
    selectedScratchId: A,
    scratchPoolActiveIds: [A, B],
    scratchPoolResultIds: [A, B],
    externalScratchRemoval: null,
    ownTrashMarkers: {},
  });
});

afterEach(cleanup);

describe("useTrashScratch", () => {
  it.each([
    ["an Inbox operation is pending", "operation-pending"],
    ["a placement flow is open", "placement-open"],
  ] as const)("refuses to open while %s, with a reason key", (_label, reason) => {
    const { result: hook } = setup({
      snapshot: emptySnapshot,
      placementOpen: reason === "placement-open",
    });
    if (reason === "operation-pending") {
      act(() => {
        hook.current.operationLock.acquire("add", "other");
      });
    }

    expect(hook.current.trash.entryDisabledReason(A)).toBe(reason);
    let outcome: ReturnType<typeof hook.current.trash.open> | undefined;
    act(() => {
      outcome = hook.current.trash.open(A);
    });
    expect(outcome).toEqual({ opened: false, reason });
    expect(hook.current.trash.state.phase).toBe("closed");
  });

  it("flags a Scratch with an unresolved-source candidate per Scratch and refuses to open it", () => {
    const snapshot: TrashScratchSnapshot = {
      scratches: [bit(A), bit(B)],
      candidates: [candidate("c1", "missing-source", A)],
      sources: [],
    };
    const { result: hook } = setup({ snapshot });

    expect([...hook.current.trash.unresolvedScratchIds]).toEqual([A]);
    expect(hook.current.trash.entryDisabledReason(A)).toBe("unresolved-source");
    expect(hook.current.trash.entryDisabledReason(B)).toBeNull();
    let outcome: ReturnType<typeof hook.current.trash.open> | undefined;
    act(() => {
      outcome = hook.current.trash.open(A);
    });
    expect(outcome).toEqual({ opened: false, reason: "unresolved-source" });
  });

  it("dispatches the exact live candidate set and version under one operation ID with the trash lock and marker", async () => {
    const gate = deferred<TrashScratchResult>();
    const dispatchTrash = vi.fn().mockReturnValue(gate.promise);
    const snapshot: TrashScratchSnapshot = {
      scratches: [bit(A, { version: 7 }), bit(B)],
      candidates: [candidate("c1", "s1", A), candidate("cB", "sB", B)],
      sources: [source("s1", A, { version: 5 }), source("sB", B)],
    };
    const { result: hook } = setup({ snapshot }, { dispatchTrash });

    act(() => {
      hook.current.trash.open(A);
    });
    expect(hook.current.trash.view).toMatchObject({ candidateCount: 1 });

    let confirming!: Promise<boolean>;
    act(() => {
      confirming = hook.current.trash.confirm();
    });
    expect(dispatchTrash).toHaveBeenCalledTimes(1);
    expect(dispatchTrash).toHaveBeenCalledWith({
      operationId: "op-1",
      scratchBitId: A,
      expectedVersion: 7,
      candidates: [
        {
          candidateId: "c1",
          candidateExpectedVersion: 3,
          sourceBreakdownId: "s1",
          sourceExpectedVersion: 5,
        },
      ],
    });
    expect(hook.current.trash.state.phase).toBe("pending");
    expect(hook.current.operationLock.activeOperation).toEqual({ kind: "trash", operationId: "op-1" });
    expect(useTriageStore.getState().ownTrashMarkers).toEqual({
      [A]: { scratchId: A, expectedVersion: 7 },
    });

    // A second Trash and Cancel/Escape are inert while pending.
    expect(hook.current.trash.cancel()).toBe(false);
    await act(async () => {
      expect(await hook.current.trash.confirm()).toBe(false);
    });
    expect(dispatchTrash).toHaveBeenCalledTimes(1);

    await act(async () => {
      gate.resolve(result("applied", bit(A, { deletedAt: 9, version: 8 })));
      await confirming;
    });
  });

  it("live query emitting the trashed Scratch BEFORE dispatch resolves never enters VQ-01", async () => {
    const gate = deferred<TrashScratchResult>();
    const onApplied = vi.fn();
    const { result: hook } = setup(
      { snapshot: emptySnapshot },
      { dispatchTrash: () => gate.promise, onApplied },
    );
    act(() => {
      hook.current.trash.open(A);
    });
    let confirming!: Promise<boolean>;
    act(() => {
      confirming = hook.current.trash.confirm();
    });

    // The Pool projection observes the deletion while dispatch is still pending.
    act(() => {
      useTriageStore.getState().reconcileScratchPoolContext({
        activeIds: [B],
        visibleIds: [B],
        ownTrashIds: [A],
      });
    });
    expect(useTriageStore.getState().externalScratchRemoval).toBeNull();
    expect(useTriageStore.getState().selectedScratchId).toBe(A);

    await act(async () => {
      gate.resolve(result("applied", bit(A, { deletedAt: 9, version: 5 })));
      await confirming;
    });
    expect(onApplied).toHaveBeenCalledWith(
      expect.objectContaining({
        scratchId: A,
        title: `Scratch ${A.slice(-2)}`,
        wasSelected: true,
      }),
    );
    expect(hook.current.trash.state.phase).toBe("closed");
    expect(hook.current.operationLock.activeOperation).toBeNull();
    expect(useTriageStore.getState().externalScratchRemoval).toBeNull();
    // Applied: the version-keyed marker stays until the workspace unmounts.
    expect(useTriageStore.getState().ownTrashMarkers).toEqual({
      [A]: { scratchId: A, expectedVersion: 4 },
    });
  });

  it("live query emitting AFTER dispatch resolves still finds the marker", async () => {
    const { result: hook } = setup(
      { snapshot: emptySnapshot },
      { dispatchTrash: async () => result("applied", bit(A, { deletedAt: 9, version: 5 })) },
    );
    act(() => {
      hook.current.trash.open(A);
    });
    await act(async () => {
      await hook.current.trash.confirm();
    });
    expect(hook.current.trash.state.phase).toBe("closed");
    // The marker outlives the apply so a late Pool emission is still an own Trash.
    expect(useTriageStore.getState().ownTrashMarkers).toEqual({
      [A]: { scratchId: A, expectedVersion: 4 },
    });
  });

  it("marks wasSelected false for an unselected Scratch", async () => {
    const onApplied = vi.fn();
    const { result: hook } = setup(
      { snapshot: emptySnapshot, selectedScratchId: A },
      { dispatchTrash: async () => result("applied", bit(B, { deletedAt: 9 })), onApplied },
    );
    act(() => {
      hook.current.trash.open(B);
    });
    await act(async () => {
      await hook.current.trash.confirm();
    });
    expect(onApplied).toHaveBeenCalledWith(
      expect.objectContaining({ scratchId: B, wasSelected: false }),
    );
  });

  it("not_applied releases the marker and lock, then Retry reuses the same operation ID", async () => {
    const lockedDuring: boolean[] = [];
    const hookRef: { current: { current: { operationLock: { isLocked: () => boolean } } } | null } = { current: null };
    const dispatchTrash = vi.fn(async (command: TrashScratchCommand) => {
      void command;
      lockedDuring.push(hookRef.current?.current.operationLock.isLocked() ?? false);
      return lockedDuring.length === 1
        ? result("not_applied", bit(A))
        : result("applied", bit(A, { deletedAt: 9, version: 5 }));
    });
    const { result: hook } = setup({ snapshot: emptySnapshot }, { dispatchTrash });
    hookRef.current = hook;
    act(() => {
      hook.current.trash.open(A);
    });
    await act(async () => {
      await hook.current.trash.confirm();
    });
    expect(hook.current.trash.state.phase).toBe("not_applied");
    expect(hook.current.operationLock.activeOperation).toBeNull();
    expect(useTriageStore.getState().ownTrashMarkers).toEqual({});

    await act(async () => {
      await hook.current.trash.retry();
    });
    expect(dispatchTrash.mock.calls[1]![0].operationId).toBe(dispatchTrash.mock.calls[0]![0].operationId);
    expect(lockedDuring).toEqual([true, true]);
    expect(hook.current.operationLock.activeOperation).toBeNull();
    expect(hook.current.trash.state.phase).toBe("closed");
  });

  it("rejected offers Cancel only and closes", async () => {
    const { result: hook } = setup(
      { snapshot: emptySnapshot },
      { dispatchTrash: async () => result("rejected", bit(A)) },
    );
    act(() => {
      hook.current.trash.open(A);
    });
    await act(async () => {
      await hook.current.trash.confirm();
    });
    expect(hook.current.trash.state.phase).toBe("rejected");
    await act(async () => {
      expect(await hook.current.trash.retry()).toBe(false);
      expect(await hook.current.trash.confirm()).toBe(false);
    });
    act(() => {
      expect(hook.current.trash.cancel()).toBe(true);
    });
    expect(hook.current.trash.state.phase).toBe("closed");
    expect(hook.current.operationLock.activeOperation).toBeNull();
  });

  it("conflict with the Scratch still active shows the latest counts and needs a new operation", async () => {
    const dispatchTrash = vi
      .fn()
      .mockResolvedValueOnce(result("conflict", bit(A, { version: 6 })))
      .mockResolvedValueOnce(result("applied", bit(A, { deletedAt: 9, version: 7 })));
    const { result: hook, rerender } = setup({ snapshot: emptySnapshot }, { dispatchTrash });
    act(() => {
      hook.current.trash.open(A);
    });
    await act(async () => {
      await hook.current.trash.confirm();
    });
    expect(hook.current.trash.state.phase).toBe("conflict");

    rerender({
      snapshot: {
        scratches: [bit(A, { version: 6 }), bit(B)],
        candidates: [candidate("late", "late-source", A)],
        sources: [source("late-source", A)],
      },
    });
    expect(hook.current.trash.view.candidateCount).toBe(1);

    await act(async () => {
      await hook.current.trash.confirm();
    });
    const [first, second] = dispatchTrash.mock.calls.map(([command]) => command);
    expect(second.operationId).not.toBe(first.operationId);
    expect(second.expectedVersion).toBe(6);
    expect(second.candidates).toHaveLength(1);
  });

  it("conflict with an inactive Scratch closes the dialog and leaves the external-removal rule to apply", async () => {
    const { result: hook } = setup(
      { snapshot: emptySnapshot },
      { dispatchTrash: async () => result("conflict", bit(A, { deletedAt: 8, version: 9 })) },
    );
    act(() => {
      hook.current.trash.open(A);
    });
    await act(async () => {
      await hook.current.trash.confirm();
    });
    expect(hook.current.trash.state.phase).toBe("closed");
    expect(useTriageStore.getState().ownTrashMarkers).toEqual({});

    // The inactive observation is no longer own, so it is an external removal.
    act(() => {
      useTriageStore.getState().reconcileScratchPoolContext({
        activeIds: [B],
        visibleIds: [B],
        ownTrashIds: [],
      });
    });
    expect(useTriageStore.getState().externalScratchRemoval).toMatchObject({ scratchId: A });
  });

  it("an unknown outcome keeps the lock and marker, and Check again reconciles with the same command", async () => {
    const reconcileTrash = vi
      .fn()
      .mockResolvedValue(result("already_applied", bit(A, { deletedAt: 9, version: 5 })));
    const onApplied = vi.fn();
    const dispatchTrash = vi.fn().mockRejectedValue(new Error("transport"));
    const { result: hook } = setup(
      { snapshot: emptySnapshot },
      { dispatchTrash, reconcileTrash, onApplied },
    );
    act(() => {
      hook.current.trash.open(A);
    });
    await act(async () => {
      await hook.current.trash.confirm();
    });
    expect(hook.current.trash.state.phase).toBe("unknown");
    expect(hook.current.operationLock.activeOperation).toEqual({ kind: "trash", operationId: "op-1" });
    expect(Object.keys(useTriageStore.getState().ownTrashMarkers)).toHaveLength(1);
    expect(hook.current.trash.cancel()).toBe(false);

    await act(async () => {
      await hook.current.trash.reconcile();
    });
    expect(reconcileTrash).toHaveBeenCalledWith(dispatchTrash.mock.calls[0]![0]);
    expect(onApplied).toHaveBeenCalledTimes(1);
    expect(hook.current.trash.state.phase).toBe("closed");
    expect(hook.current.operationLock.activeOperation).toBeNull();
  });

  it("an unknown reconcile that finds not_applied offers Retry", async () => {
    const { result: hook } = setup(
      { snapshot: emptySnapshot },
      {
        dispatchTrash: async () => ({ operationId: "op-1", outcome: "unknown" }) as never,
        reconcileTrash: async () => result("not_applied", bit(A)),
      },
    );
    act(() => {
      hook.current.trash.open(A);
    });
    await act(async () => {
      await hook.current.trash.confirm();
    });
    expect(hook.current.trash.state.phase).toBe("unknown");
    await act(async () => {
      await hook.current.trash.reconcile();
    });
    expect(hook.current.trash.state.phase).toBe("not_applied");
  });

  it("disables Confirm when an unresolved-source candidate appears while open and refuses to dispatch", async () => {
    const dispatchTrash = vi.fn();
    const { result: hook, rerender } = setup({ snapshot: emptySnapshot }, { dispatchTrash });
    act(() => {
      hook.current.trash.open(A);
    });
    expect(hook.current.trash.view.confirmDisabledReason).toBeNull();

    rerender({
      snapshot: { scratches: [bit(A), bit(B)], candidates: [candidate("c", "gone", A)], sources: [] },
    });
    expect(hook.current.trash.view.confirmDisabledReason).toBe("unresolved-source");
    await act(async () => {
      expect(await hook.current.trash.confirm()).toBe(false);
    });
    expect(dispatchTrash).not.toHaveBeenCalled();
  });

  it("closes an idle dialog when its Scratch becomes inactive elsewhere", () => {
    const { result: hook, rerender } = setup({ snapshot: emptySnapshot });
    act(() => {
      hook.current.trash.open(A);
    });
    rerender({ snapshot: { scratches: [bit(B)], candidates: [], sources: [] } });
    expect(hook.current.trash.state.phase).toBe("closed");
  });

  it("surfaces the live draft/editor disclosure flag", () => {
    const { result: hook, rerender } = setup({ snapshot: emptySnapshot, discardable: false });
    act(() => {
      hook.current.trash.open(A);
    });
    expect(hook.current.trash.view.hasDiscardableWork).toBe(false);
    rerender({ snapshot: emptySnapshot, discardable: true });
    expect(hook.current.trash.view.hasDiscardableWork).toBe(true);
  });

  it("releases every marker when the workspace unmounts", async () => {
    const gate = deferred<TrashScratchResult>();
    const { result: hook, unmount } = setup(
      { snapshot: emptySnapshot },
      { dispatchTrash: () => gate.promise },
    );
    act(() => {
      hook.current.trash.open(A);
    });
    act(() => {
      void hook.current.trash.confirm();
    });
    expect(Object.keys(useTriageStore.getState().ownTrashMarkers)).toHaveLength(1);
    unmount();
    expect(useTriageStore.getState().ownTrashMarkers).toEqual({});
  });

  it("UF-29: a theme or light/dark change while pending keeps the operation and resends nothing", async () => {
    const gate = deferred<TrashScratchResult>();
    const dispatchTrash = vi.fn(() => gate.promise);
    const { result: hook, rerender } = setup(
      { snapshot: emptySnapshot },
      { dispatchTrash },
    );
    act(() => {
      hook.current.trash.open(A);
    });
    let confirming!: Promise<boolean>;
    act(() => {
      confirming = hook.current.trash.confirm();
    });
    const before = hook.current.trash.state;
    expect(before.phase).toBe("pending");

    act(() => {
      document.documentElement.dataset.colorTheme = "retro-mac";
      document.documentElement.classList.add("dark");
    });
    rerender({ snapshot: emptySnapshot });
    document.documentElement.classList.remove("dark");
    delete document.documentElement.dataset.colorTheme;

    expect(hook.current.trash.state).toBe(before);
    expect(dispatchTrash).toHaveBeenCalledTimes(1);
    expect(hook.current.operationLock.activeOperation).toEqual({
      kind: "trash",
      operationId: "op-1",
    });

    await act(async () => {
      gate.resolve(result("applied", bit(A, { deletedAt: 9, version: 5 })));
      await confirming;
    });
    expect(dispatchTrash).toHaveBeenCalledTimes(1);
  });

  it("closes for good when the target leaves the Pool; a later reappearance does not reopen the dialog", () => {
    const { result: hook, rerender } = setup({ snapshot: emptySnapshot });
    act(() => {
      hook.current.trash.open(A);
    });
    expect(hook.current.trash.state.phase).toBe("confirming");

    rerender({ snapshot: { ...emptySnapshot, scratches: [bit(B)] } });
    expect(hook.current.trash.state.phase).toBe("closed");

    // Restored or unarchived elsewhere: nothing resurrects the old dialog.
    rerender({ snapshot: emptySnapshot });
    expect(hook.current.trash.state.phase).toBe("closed");
  });
});
