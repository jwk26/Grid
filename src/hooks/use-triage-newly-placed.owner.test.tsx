import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TriageOperationLock } from "@/hooks/use-triage-operation-lock";
import type { PlacementUndoResult } from "@/lib/db/datastore";
import type { Bit, Node } from "@/types";
import {
  useTriageNewlyPlacedUndo,
  type TriageNewlyPlacedProvenance,
} from "./use-triage-newly-placed";

const getBitMock = vi.hoisted(() => vi.fn());
const reconcileMock = vi.hoisted(() => vi.fn());
const truthMock = vi.hoisted(() => vi.fn());
// One re-run per registered live read, to stand in for a snapshot change.
const reruns = vi.hoisted(() => [] as Array<() => Promise<void>>);

const fakeStore = vi.hoisted(() => ({
  getBit: undefined as unknown,
  getPlacementUndoTruth: undefined as unknown,
  reconcileDirectPlacementUndo: undefined as unknown,
  reconcileStagedPlacementUndo: undefined as unknown,
}));

vi.mock("@/lib/db/datastore", () => ({
  getDataStore: async () => fakeStore,
  liveRead: (read: (store: unknown) => Promise<unknown>) => ({
    subscribe: (observer: { next: (value: unknown) => void; error: (error: unknown) => void }) => {
      const run = () => read(fakeStore).then(observer.next).catch(observer.error);
      reruns.push(run);
      void run();
      return { unsubscribe: vi.fn() };
    },
  }),
}));

const placed = {
  id: "node-1",
  title: "Placed",
  color: "hsl(210, 80%, 55%)",
  icon: "Folder",
  deadline: null,
  deadlineAllDay: false,
  mtime: 100,
  createdAt: 100,
  version: 1,
  parentId: null,
  level: 0,
  x: 1,
  y: 1,
  deletedAt: null,
  archivedAt: null,
  systemRole: null,
  hiddenFromGrid: false,
  pastDeadlineDismissed: false,
} as Node;

const sourceSnapshot = {
  id: "source-1",
  scratchBitId: "scratch-1",
  content: "Source",
  order: 0,
  createdAt: 1,
  consumedAt: 100,
  version: 2,
};

const provenance: TriageNewlyPlacedProvenance = {
  operationId: "placement-1",
  resultId: placed.id,
  resultType: "node",
  resultVersion: 1,
  resultSnapshot: placed,
  source: {
    scratchBitId: "scratch-1",
    breakdownId: "source-1",
    expectedVersion: 1,
    snapshot: { ...sourceSnapshot, consumedAt: null, version: 1 },
  },
  candidate: null,
  destination: { parentId: null, pathIds: [], x: 1, y: 1 },
  completedOrder: 1,
};

const unlocked: TriageOperationLock = {
  activeOperation: null,
  isLocked: () => false,
  acquire: () => true,
  release: () => true,
};

function scratch(overrides: Partial<Bit>): Bit {
  return {
    id: "scratch-1",
    title: "Scratch",
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

function rejectedTruth(): PlacementUndoResult {
  return {
    operationId: "truth",
    status: "rejected",
    result: placed,
    source: sourceSnapshot,
    candidate: null,
  };
}

beforeEach(() => {
  getBitMock.mockReset();
  reconcileMock.mockReset();
  truthMock.mockReset();
  truthMock.mockResolvedValue(rejectedTruth());
  reruns.length = 0;
  Object.assign(fakeStore, {
    getBit: getBitMock,
    getPlacementUndoTruth: truthMock,
    reconcileDirectPlacementUndo: reconcileMock,
    reconcileStagedPlacementUndo: reconcileMock,
  });
});

describe("useTriageNewlyPlacedUndo default owner observation", () => {
  it.each([
    ["trashed", { deletedAt: 10 }],
    ["archived", { archivedAt: 10 }],
  ] as const)(
    "reads the owning Scratch lifecycle through the DataStore: %s",
    async (reason, lifecycle) => {
      getBitMock.mockResolvedValue(scratch(lifecycle));
      const { result } = renderHook(() =>
        useTriageNewlyPlacedUndo({
          entries: [provenance],
          operationLock: unlocked,
          placementOpen: false,
          hasDirtyEdit: () => false,
        }),
      );
      await waitFor(() =>
        expect(result.current.getState("node", placed.id).reason).toBe(reason),
      );
      expect(getBitMock).toHaveBeenCalledWith("scratch-1");
    },
  );

  it("treats a hard-deleted owner as trashed and an active owner as ordinary invalid-provenance", async () => {
    getBitMock.mockResolvedValue(undefined);
    const gone = renderHook(() =>
      useTriageNewlyPlacedUndo({
        entries: [provenance],
        operationLock: unlocked,
        placementOpen: false,
        hasDirtyEdit: () => false,
      }),
    );
    await waitFor(() =>
      expect(gone.result.current.getState("node", placed.id).reason).toBe("trashed"),
    );

    getBitMock.mockResolvedValue(scratch({}));
    const active = renderHook(() =>
      useTriageNewlyPlacedUndo({
        entries: [provenance],
        operationLock: unlocked,
        placementOpen: false,
        hasDirtyEdit: () => false,
      }),
    );
    await waitFor(() =>
      expect(active.result.current.getState("node", placed.id).reason).toBe(
        "invalid-provenance",
      ),
    );
  });

  it("a rejected Undo dispatch against a just-trashed owner is labelled trashed, not invalid-provenance", async () => {
    getBitMock.mockResolvedValueOnce(scratch({}));
    truthMock.mockResolvedValue({
      ...rejectedTruth(),
      status: "not_applied",
    });
    const dispatchUndo = vi.fn().mockResolvedValue(rejectedTruth());
    const { result } = renderHook(() =>
      useTriageNewlyPlacedUndo({
        entries: [provenance],
        operationLock: unlocked,
        placementOpen: false,
        hasDirtyEdit: () => false,
        dispatchUndo,
      }),
    );
    await waitFor(() =>
      expect(result.current.getState("node", placed.id).reason).toBe("available"),
    );

    getBitMock.mockResolvedValue(scratch({ deletedAt: 10 }));
    await act(async () => {
      await result.current.activate("node", placed.id);
    });
    await waitFor(() =>
      expect(result.current.getState("node", placed.id)).toMatchObject({
        phase: "terminal",
        reason: "trashed",
      }),
    );
  });

  it("judges the Undo from the snapshot on every change and sends no reconcile request", async () => {
    getBitMock.mockResolvedValue(scratch({}));
    truthMock.mockResolvedValue({ ...rejectedTruth(), status: "not_applied" });
    const { result } = renderHook(() =>
      useTriageNewlyPlacedUndo({
        entries: [provenance],
        operationLock: unlocked,
        placementOpen: false,
        hasDirtyEdit: () => false,
      }),
    );
    await waitFor(() =>
      expect(result.current.getState("node", placed.id).reason).toBe("available"),
    );
    expect(truthMock).toHaveBeenCalledTimes(1);

    // Three snapshot changes, then a child appears under the result.
    await act(async () => {
      for (let change = 0; change < 3; change += 1) await reruns[0]!();
      truthMock.mockResolvedValue({ ...rejectedTruth(), status: "conflict" });
      await reruns[0]!();
    });
    await waitFor(() =>
      expect(result.current.getState("node", placed.id).reason).toBe("dependencies"),
    );
    expect(truthMock).toHaveBeenCalledTimes(5);
    expect(reconcileMock).not.toHaveBeenCalled();

    // The child goes again: re-enabled, still no request.
    truthMock.mockResolvedValue({ ...rejectedTruth(), status: "not_applied" });
    await act(async () => {
      await reruns[0]!();
    });
    await waitFor(() =>
      expect(result.current.getState("node", placed.id).reason).toBe("reenabled"),
    );
    expect(reconcileMock).not.toHaveBeenCalled();
  });

  it("reconciles once, and only, after an unknown Undo outcome", async () => {
    getBitMock.mockResolvedValue(scratch({}));
    truthMock.mockResolvedValue({ ...rejectedTruth(), status: "not_applied" });
    reconcileMock.mockResolvedValue({ ...rejectedTruth(), status: "already_applied", result: null });
    const dispatchUndo = vi.fn().mockRejectedValue(new Error("no answer"));
    const { result } = renderHook(() =>
      useTriageNewlyPlacedUndo({
        entries: [provenance],
        operationLock: unlocked,
        placementOpen: false,
        hasDirtyEdit: () => false,
        dispatchUndo,
      }),
    );
    await waitFor(() =>
      expect(result.current.getState("node", placed.id).reason).toBe("available"),
    );
    await act(async () => {
      await result.current.activate("node", placed.id);
    });
    expect(result.current.getState("node", placed.id).phase).toBe("unknown");
    expect(reconcileMock).not.toHaveBeenCalled();
    await act(async () => {
      await result.current.reconcile("node", placed.id);
    });
    expect(reconcileMock).toHaveBeenCalledTimes(1);
  });
});
