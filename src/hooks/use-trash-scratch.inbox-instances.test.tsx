import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataStore, TrashScratchResult } from "@/lib/db/datastore";
import type { Bit, Node } from "@/lib/db/schema";
import { useTriageStore } from "@/stores/triage-store";
import { useInbox } from "./use-inbox";
import { useTriageOperationLock } from "./use-triage-operation-lock";
import { useTrashScratch, type TrashScratchSnapshot } from "./use-trash-scratch";

const getDataStoreMock = vi.hoisted(() => vi.fn());
const liveQueryRuns = vi.hoisted(() => [] as Array<() => Promise<void>>);

vi.mock("@/lib/db/datastore", () => ({
  getDataStore: async () => {
    const dataStore = await getDataStoreMock();
    return {
      getArchivedItems: async () => ({ nodes: [], bits: [] }),
      ...dataStore,
    };
  },
}));
vi.mock("dexie", () => ({
  liveQuery: (query: () => Promise<unknown>) => ({
    subscribe: (observer: { next: (value: unknown) => void; error: (error: unknown) => void }) => {
      const run = async () => {
        try {
          observer.next(await query());
        } catch (error) {
          observer.error(error);
        }
      };
      liveQueryRuns.push(run);
      void run();
      return { unsubscribe: vi.fn() };
    },
  }),
}));

const INBOX = "inbox";

function inboxNode(): Node {
  return {
    id: INBOX,
    title: "Inbox",
    color: "hsl(221, 83%, 53%)",
    icon: "inbox",
    deadline: null,
    deadlineAllDay: false,
    mtime: 1,
    createdAt: 1,
    parentId: null,
    level: 0,
    x: 0,
    y: 0,
    deletedAt: null,
    archivedAt: null,
    systemRole: "inbox",
    hiddenFromGrid: false,
    version: 1,
    pastDeadlineDismissed: false,
  };
}

function scratch(id: string, overrides: Partial<Bit> = {}): Bit {
  return {
    id,
    title: id,
    description: "",
    icon: "sparkles",
    deadline: null,
    deadlineAllDay: false,
    priority: null,
    status: "active",
    mtime: 1,
    createdAt: id === "a" ? 300 : id === "b" ? 200 : 100,
    parentId: INBOX,
    x: 0,
    y: 0,
    deletedAt: null,
    archivedAt: null,
    version: 4,
    pastDeadlineDismissed: false,
    ...overrides,
  };
}

let active: Bit[] = [];
let trashed: Bit[] = [];

function snapshotOf(bits: Bit[]): TrashScratchSnapshot {
  return { scratches: bits, candidates: [], sources: [] };
}

function applied(bit: Bit): TrashScratchResult {
  return { operationId: "op", status: "applied", scratch: bit, candidates: [] };
}

/** Mounts a coordinator plus two independent Inbox projections, like the real page. */
async function mount(dispatchTrash: () => Promise<TrashScratchResult>) {
  const first = renderHook(() => useInbox());
  await waitFor(() => expect(first.result.current.activeScratchBits.length).toBe(active.length));
  const firstRuns = liveQueryRuns.slice();
  const second = renderHook(() => useInbox());
  await waitFor(() => expect(second.result.current.activeScratchBits.length).toBe(active.length));
  const secondRuns = liveQueryRuns.slice(firstRuns.length);

  const coordinator = renderHook(() => {
    const operationLock = useTriageOperationLock();
    return {
      operationLock,
      trash: useTrashScratch({
        operationLock,
        snapshot: snapshotOf(active),
        selectedScratchId: useTriageStore.getState().selectedScratchId,
        hasDiscardableWork: () => false,
        isPlacementOpen: () => false,
        dispatchTrash,
      }),
    };
  });

  const emit = (runs: Array<() => Promise<void>>) =>
    act(async () => {
      await Promise.all(runs.map((run) => run()));
    });
  return { first, second, coordinator, firstRuns, secondRuns, emit };
}

beforeEach(() => {
  liveQueryRuns.length = 0;
  active = [scratch("a"), scratch("b"), scratch("c")];
  trashed = [];
  getDataStoreMock.mockResolvedValue({
    getAllActiveNodes: async () => [inboxNode()],
    getAllActiveBits: async () => active,
    getTrashedItems: async () => ({ nodes: [], bits: trashed }),
  } as unknown as DataStore);
  useTriageStore.setState({
    selectedScratchId: "a",
    scratchPoolQuery: "",
    scratchPoolActiveIds: [],
    scratchPoolResultIds: [],
    externalScratchRemoval: null,
    ownTrashMarkers: {},
  });
});

afterEach(cleanup);

describe("own Trash across several mounted Inbox projections", () => {
  it("never lets a later-emitting instance turn an own Trash into a Pool deleted status or external removal", async () => {
    const { second, coordinator, firstRuns, secondRuns, emit } = await mount(async () =>
      applied(scratch("a", { deletedAt: 9, version: 5 })),
    );
    act(() => {
      coordinator.result.current.trash.open("a");
    });

    // Instance 1 observes the deletion while dispatch is still in flight...
    active = [scratch("b"), scratch("c")];
    trashed = [scratch("a", { deletedAt: 9, version: 5 })];
    await act(async () => {
      await coordinator.result.current.trash.confirm();
    });
    await emit(firstRuns);
    // ...and only now does instance 2 (the Pool's) emit the same commit.
    await emit(secondRuns);

    expect(second.result.current.poolLifecycleProjection.changes).toEqual([]);
    expect(useTriageStore.getState().externalScratchRemoval).toBeNull();
  });

  it("keeps a marker per Scratch when two Scratches are trashed back to back", async () => {
    const { first, second, coordinator, firstRuns, secondRuns, emit } = await mount(
      async () => applied(scratch("a", { deletedAt: 9, version: 5 })),
    );
    act(() => {
      coordinator.result.current.trash.open("a");
    });
    await act(async () => {
      await coordinator.result.current.trash.confirm();
    });
    // Second Trash (another Scratch) before either deletion was observed.
    useTriageStore.getState().registerOwnTrash("b", 4);
    expect(Object.keys(useTriageStore.getState().ownTrashMarkers).sort()).toEqual(["a", "b"]);

    active = [scratch("c")];
    trashed = [
      scratch("a", { deletedAt: 9, version: 5 }),
      scratch("b", { deletedAt: 9, version: 5 }),
    ];
    await emit(firstRuns);
    await emit(secondRuns);

    expect(first.result.current.poolLifecycleProjection.changes).toEqual([]);
    expect(second.result.current.poolLifecycleProjection.changes).toEqual([]);
    expect(Object.keys(useTriageStore.getState().ownTrashMarkers).sort()).toEqual(["a", "b"]);
  });

  it("treats a restore followed by an external Trash as external removal (VQ-01), not own Trash", async () => {
    const { second, coordinator, firstRuns, secondRuns, emit } = await mount(async () =>
      applied(scratch("a", { deletedAt: 9, version: 5 })),
    );
    act(() => {
      coordinator.result.current.trash.open("a");
    });
    await act(async () => {
      await coordinator.result.current.trash.confirm();
    });
    active = [scratch("b"), scratch("c")];
    trashed = [scratch("a", { deletedAt: 9, version: 5 })];
    await emit([...firstRuns, ...secondRuns]);

    // Restored from /trash (version + 2) and the user re-selects it.
    active = [scratch("a", { version: 6 }), scratch("b"), scratch("c")];
    trashed = [];
    await emit([...firstRuns, ...secondRuns]);
    act(() => {
      useTriageStore.setState({ selectedScratchId: "a" });
    });

    // Another tab trashes it: version 7, not marker.expectedVersion + 1.
    active = [scratch("b"), scratch("c")];
    trashed = [scratch("a", { deletedAt: 20, version: 7 })];
    await emit([...firstRuns, ...secondRuns]);

    expect(second.result.current.poolLifecycleProjection.changes).toContainEqual({
      kind: "delete",
      scratchId: "a",
    });
    expect(useTriageStore.getState().externalScratchRemoval).toMatchObject({ scratchId: "a" });
  });
});
