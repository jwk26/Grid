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

vi.mock("@/lib/db/datastore", () => ({
  getDataStore: async () => ({
    getBit: getBitMock,
    reconcileDirectPlacementUndo: reconcileMock,
    reconcileStagedPlacementUndo: reconcileMock,
  }),
}));

vi.mock("dexie", () => ({
  liveQuery: (query: () => Promise<unknown>) => ({
    subscribe: (observer: { next: (value: unknown) => void; error: (error: unknown) => void }) => {
      void query().then(observer.next).catch(observer.error);
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
  reconcileMock.mockResolvedValue(rejectedTruth());
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
    reconcileMock.mockResolvedValue({
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
});
