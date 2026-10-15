import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataStore } from "@/lib/db/datastore";
import type { Bit, Node } from "@/lib/db/schema";
import { useTriagePreferencesStore } from "@/stores/triage-preferences-store";
import { useTriageStore } from "@/stores/triage-store";
import { useInbox } from "./use-inbox";

const getDataStoreMock = vi.hoisted(() => vi.fn());
const liveQueryMock = vi.hoisted(() => vi.fn());
const liveQueryRuns: Array<() => Promise<void>> = [];

vi.mock("@/lib/db/datastore", () => ({
  getDataStore: async () => {
    const dataStore = await getDataStoreMock();
    return {
      getArchivedItems: async () => ({ nodes: [], bits: [] }),
      getTrashedItems: async () => ({ nodes: [], bits: [] }),
      ...dataStore,
    };
  },
}));

vi.mock("dexie", () => ({
  liveQuery: liveQueryMock,
}));

function createNode(overrides: Partial<Node> = {}): Node {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    title: overrides.title ?? "Node",
    color: overrides.color ?? "hsl(221, 83%, 53%)",
    icon: overrides.icon ?? "folder",
    deadline: overrides.deadline ?? null,
    deadlineAllDay: overrides.deadlineAllDay ?? false,
    mtime: overrides.mtime ?? 1,
    createdAt: overrides.createdAt ?? 1,
    parentId: overrides.parentId ?? null,
    level: overrides.level ?? 0,
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    deletedAt: overrides.deletedAt ?? null,
    archivedAt: overrides.archivedAt ?? null,
    systemRole: overrides.systemRole ?? null,
    hiddenFromGrid: overrides.hiddenFromGrid ?? false,
    version: overrides.version ?? 1,
    pastDeadlineDismissed: overrides.pastDeadlineDismissed ?? false,
  };
}

function createBit(overrides: Partial<Bit> = {}): Bit {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    title: overrides.title ?? "Bit",
    description: overrides.description ?? "",
    icon: overrides.icon ?? "sparkles",
    deadline: overrides.deadline ?? null,
    deadlineAllDay: overrides.deadlineAllDay ?? false,
    priority: overrides.priority ?? null,
    status: overrides.status ?? "active",
    mtime: overrides.mtime ?? 1,
    createdAt: overrides.createdAt ?? 1,
    parentId: overrides.parentId ?? crypto.randomUUID(),
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    deletedAt: overrides.deletedAt ?? null,
    archivedAt: overrides.archivedAt ?? null,
    version: overrides.version ?? 1,
    pastDeadlineDismissed: overrides.pastDeadlineDismissed ?? false,
  };
}

describe("useInbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    liveQueryRuns.length = 0;
    useTriageStore.setState({
      selectedScratchId: null,
      scratchPoolExpanded: true,
      scratchPoolManualExpandedForId: null,
      scratchPoolQuery: "",
      scratchPoolActiveIds: [],
      scratchPoolResultIds: [],
      scratchPoolScroll: { anchorId: null, offset: 0 },
      externalScratchRemoval: null,
      ownTrashMarkers: {},
    });
    useTriagePreferencesStore.setState({ poolCreatedAtSort: "DESC" });
    liveQueryMock.mockImplementation((query: () => Promise<unknown>) => ({
      subscribe: (observer: {
        next: (value: unknown) => void;
        error: (error: unknown) => void;
      }) => {
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
    }));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("finds the Inbox node and creates Scratch Bits with the 0,0 sentinel", async () => {
    const inbox = createNode({ id: crypto.randomUUID(), systemRole: "inbox" });
    const created = createBit({ parentId: inbox.id });
    const createBitMock = vi.fn().mockResolvedValue(created);
    const dataStore = {
      getAllActiveNodes: vi.fn().mockResolvedValue([
        createNode({ id: crypto.randomUUID() }),
        inbox,
      ]),
      createBit: createBitMock,
    } as unknown as DataStore;
    getDataStoreMock.mockResolvedValue(dataStore);

    const { result } = renderHook(() => useInbox());

    await waitFor(() => {
      expect(result.current.inboxNodeId).toBe(inbox.id);
    });

    await result.current.createScratchBit(" Fast idea ");

    expect(createBitMock).toHaveBeenCalledWith({
      parentId: inbox.id,
      title: " Fast idea ",
      description: "",
      icon: "sparkles",
      x: 0,
      y: 0,
      deadline: null,
      deadlineAllDay: false,
      priority: null,
    });
  });

  it("exposes inboxNodeId as undefined when no node has systemRole inbox", async () => {
    const dataStore = {
      getAllActiveNodes: vi.fn().mockResolvedValue([
        createNode({ systemRole: null }),
        createNode({ systemRole: "archive_view" }),
      ]),
      createBit: vi.fn(),
    } as unknown as DataStore;
    getDataStoreMock.mockResolvedValue(dataStore);

    const { result } = renderHook(() => useInbox());

    await waitFor(() => {
      expect(dataStore.getAllActiveNodes).toHaveBeenCalled();
    });

    expect(result.current.inboxNodeId).toBeUndefined();
  });

  it("throws when creating a Scratch Bit before Inbox is available", async () => {
    const dataStore = {
      getAllActiveNodes: vi.fn().mockResolvedValue([]),
      createBit: vi.fn(),
    } as unknown as DataStore;
    getDataStoreMock.mockResolvedValue(dataStore);

    const { result } = renderHook(() => useInbox());

    await expect(result.current.createScratchBit("Idea")).rejects.toThrow(
      "Inbox not found",
    );
    expect(dataStore.createBit).not.toHaveBeenCalled();
  });

  it("retries Inbox lookup when system node seeding finishes after initial mount", async () => {
    vi.useFakeTimers();
    const inbox = createNode({ id: crypto.randomUUID(), systemRole: "inbox" });
    let seeded = false;
    const dataStore = {
      getAllActiveNodes: vi.fn().mockImplementation(() => (
        Promise.resolve(seeded ? [inbox] : [])
      )),
      createBit: vi.fn(),
    } as unknown as DataStore;
    getDataStoreMock.mockResolvedValue(dataStore);

    const { result } = renderHook(() => useInbox());

    await actFlush();
    expect(result.current.inboxNodeId).toBeUndefined();

    seeded = true;
    await actFlush(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.inboxNodeId).toBe(inbox.id);
  });

  it("exposes active system nodes regardless of hiddenFromGrid", async () => {
    const inbox = createNode({
      id: crypto.randomUUID(),
      systemRole: "inbox",
      hiddenFromGrid: true,
    });
    const archive = createNode({
      id: crypto.randomUUID(),
      systemRole: "archive_view",
      hiddenFromGrid: false,
    });
    const dataStore = {
      getAllActiveNodes: vi.fn().mockResolvedValue([
        createNode({ systemRole: null }),
        inbox,
        archive,
        createNode({ systemRole: "inbox", deletedAt: 1 }),
        createNode({ systemRole: "archive_view", archivedAt: 1 }),
      ]),
      getAllActiveBits: vi.fn().mockResolvedValue([]),
      createBit: vi.fn(),
    } as unknown as DataStore;
    getDataStoreMock.mockResolvedValue(dataStore);

    const { result } = renderHook(() => useInbox());

    await waitFor(() => {
      expect(result.current.systemNodes).toEqual([inbox, archive]);
    });
  });

  it("counts only active Scratch Bits under the Inbox node", async () => {
    const inbox = createNode({ id: crypto.randomUUID(), systemRole: "inbox" });
    const otherParentId = crypto.randomUUID();
    const dataStore = {
      getAllActiveNodes: vi.fn().mockResolvedValue([inbox]),
      getAllActiveBits: vi.fn().mockResolvedValue([
        createBit({ parentId: inbox.id, deletedAt: null, archivedAt: null }),
        createBit({ parentId: inbox.id, deletedAt: null, archivedAt: null }),
        createBit({ parentId: inbox.id, deletedAt: 1, archivedAt: null }),
        createBit({ parentId: inbox.id, deletedAt: null, archivedAt: 1 }),
        createBit({ parentId: otherParentId, deletedAt: null, archivedAt: null }),
      ]),
      createBit: vi.fn(),
    } as unknown as DataStore;
    getDataStoreMock.mockResolvedValue(dataStore);

    const { result } = renderHook(() => useInbox());

    await waitFor(() => {
      expect(result.current.scratchCount).toBe(2);
    });
  });

  it("exposes only active Scratch Bits under the Inbox node newest-first", async () => {
    const inbox = createNode({ id: crypto.randomUUID(), systemRole: "inbox" });
    const otherParentId = crypto.randomUUID();
    const newest = createBit({
      id: crypto.randomUUID(),
      title: "Newest",
      parentId: inbox.id,
      createdAt: 300,
      deletedAt: null,
      archivedAt: null,
    });
    const oldest = createBit({
      id: crypto.randomUUID(),
      title: "Oldest",
      parentId: inbox.id,
      createdAt: 100,
      deletedAt: null,
      archivedAt: null,
    });
    const dataStore = {
      getAllActiveNodes: vi.fn().mockResolvedValue([inbox]),
      getAllActiveBits: vi.fn().mockResolvedValue([
        oldest,
        createBit({
          title: "Deleted",
          parentId: inbox.id,
          createdAt: 400,
          deletedAt: 1,
          archivedAt: null,
        }),
        newest,
        createBit({
          title: "Archived",
          parentId: inbox.id,
          createdAt: 500,
          deletedAt: null,
          archivedAt: 1,
        }),
        createBit({
          title: "Other parent",
          parentId: otherParentId,
          createdAt: 600,
          deletedAt: null,
          archivedAt: null,
        }),
      ]),
      createBit: vi.fn(),
    } as unknown as DataStore;
    getDataStoreMock.mockResolvedValue(dataStore);

    const { result } = renderHook(() => useInbox());

    await waitFor(() => {
      expect(result.current.activeScratchBits).toEqual([newest, oldest]);
    });
  });

  it("excludes the initial repository snapshot and projects remote arrival, archive, delete, and restore transitions", async () => {
    const inbox = createNode({ id: "inbox", systemRole: "inbox" });
    const initial = createBit({ id: "initial", parentId: inbox.id });
    const restoredLater = createBit({
      id: "restored",
      parentId: inbox.id,
      archivedAt: 10,
    });
    let activeBits = [initial];
    let archivedBits = [restoredLater];
    let trashedBits: Bit[] = [];
    const dataStore = {
      getAllActiveNodes: vi.fn().mockResolvedValue([inbox]),
      getAllActiveBits: vi.fn().mockImplementation(() => Promise.resolve(activeBits)),
      getArchivedItems: vi.fn().mockImplementation(() =>
        Promise.resolve({ nodes: [], bits: archivedBits }),
      ),
      getTrashedItems: vi.fn().mockImplementation(() =>
        Promise.resolve({ nodes: [], bits: trashedBits }),
      ),
      createBit: vi.fn(),
    } as unknown as DataStore;
    getDataStoreMock.mockResolvedValue(dataStore);

    const { result } = renderHook(() => useInbox());

    await waitFor(() => {
      expect(result.current.activeScratchBits).toEqual([initial]);
    });
    expect(result.current.poolLifecycleProjection).toEqual({
      revision: 0,
      changes: [],
    });

    const remote = createBit({ id: "remote", parentId: inbox.id });
    activeBits = [initial, remote, { ...restoredLater, archivedAt: null }];
    archivedBits = [];
    await rerunLiveQueries();
    await waitFor(() => {
      expect(result.current.poolLifecycleProjection).toEqual({
        revision: 1,
        changes: [
          { kind: "remote-arrival", scratchId: "remote" },
          { kind: "restore", scratchId: "restored" },
        ],
      });
    });

    activeBits = [{ ...restoredLater, archivedAt: null }];
    archivedBits = [{ ...initial, archivedAt: 20 }];
    trashedBits = [{ ...remote, deletedAt: 20 }];
    await rerunLiveQueries();
    await waitFor(() => {
      expect(result.current.poolLifecycleProjection).toEqual({
        revision: 2,
        changes: [
          { kind: "archive", scratchId: "initial" },
          { kind: "delete", scratchId: "remote" },
        ],
      });
    });

    trashedBits = [];
    await rerunLiveQueries();
    expect(result.current.poolLifecycleProjection).toEqual({
      revision: 2,
      changes: [
        { kind: "archive", scratchId: "initial" },
        { kind: "delete", scratchId: "remote" },
      ],
    });
  });

  it.each([
    ["trashed at the marker's expected version + 1", 5, 6, false],
    ["trashed at a different version", 5, 9, true],
  ])("own-Trash marker: Scratch %s", async (_label, expectedVersion, trashedVersion, external) => {
    const inbox = createNode({ id: "inbox", systemRole: "inbox" });
    const selected = createBit({ id: "selected", parentId: inbox.id, version: expectedVersion });
    const other = createBit({ id: "other", parentId: inbox.id });
    let activeBits = [selected, other];
    let trashedBits: Bit[] = [];
    getDataStoreMock.mockResolvedValue({
      getAllActiveNodes: vi.fn().mockResolvedValue([inbox]),
      getAllActiveBits: vi.fn().mockImplementation(() => Promise.resolve(activeBits)),
      getArchivedItems: vi.fn().mockResolvedValue({ nodes: [], bits: [] }),
      getTrashedItems: vi.fn().mockImplementation(() =>
        Promise.resolve({ nodes: [], bits: trashedBits }),
      ),
      createBit: vi.fn(),
    } as unknown as DataStore);
    useTriageStore.setState({ selectedScratchId: "selected" });

    const { result } = renderHook(() => useInbox());
    await waitFor(() => expect(result.current.activeScratchBits).toHaveLength(2));

    useTriageStore.getState().registerOwnTrash("selected", expectedVersion);
    activeBits = [other];
    trashedBits = [{ ...selected, deletedAt: 20, version: trashedVersion }];
    await rerunLiveQueries();

    await waitFor(() => expect(result.current.activeScratchBits).toEqual([other]));
    if (external) {
      expect(result.current.poolLifecycleProjection.changes).toEqual([
        { kind: "delete", scratchId: "selected" },
      ]);
      expect(useTriageStore.getState().externalScratchRemoval).not.toBeNull();
    } else {
      expect(result.current.poolLifecycleProjection.changes).toEqual([]);
      expect(useTriageStore.getState().externalScratchRemoval).toBeNull();
      expect(useTriageStore.getState()).toMatchObject({
        selectedScratchId: "selected",
        ownTrashMarkers: { selected: { scratchId: "selected", expectedVersion: 5 } },
      });
    }
  });

  it("reclassifies as external removal when the own-Trash marker is released without a new emission", async () => {
    const inbox = createNode({ id: "inbox", systemRole: "inbox" });
    const selected = createBit({ id: "selected", parentId: inbox.id, version: 5 });
    const other = createBit({ id: "other", parentId: inbox.id });
    let activeBits = [selected, other];
    let trashedBits: Bit[] = [];
    getDataStoreMock.mockResolvedValue({
      getAllActiveNodes: vi.fn().mockResolvedValue([inbox]),
      getAllActiveBits: vi.fn().mockImplementation(() => Promise.resolve(activeBits)),
      getArchivedItems: vi.fn().mockResolvedValue({ nodes: [], bits: [] }),
      getTrashedItems: vi.fn().mockImplementation(() =>
        Promise.resolve({ nodes: [], bits: trashedBits }),
      ),
      createBit: vi.fn(),
    } as unknown as DataStore);
    useTriageStore.setState({ selectedScratchId: "selected" });

    const { result } = renderHook(() => useInbox());
    await waitFor(() => expect(result.current.activeScratchBits).toHaveLength(2));

    // Another tab trashes it at exactly marker version + 1 while ours is in flight.
    useTriageStore.getState().registerOwnTrash("selected", 5);
    activeBits = [other];
    trashedBits = [{ ...selected, deletedAt: 20, version: 6 }];
    await rerunLiveQueries();
    await waitFor(() => expect(result.current.activeScratchBits).toEqual([other]));
    expect(useTriageStore.getState().externalScratchRemoval).toBeNull();

    // Our command comes back as a conflict: the marker is released.
    act(() => {
      useTriageStore.getState().releaseOwnTrash("selected");
    });
    await waitFor(() =>
      expect(useTriageStore.getState().externalScratchRemoval).toMatchObject({
        scratchId: "selected",
      }),
    );
  });

  it("excludes a current-session local create result from remote arrivals", async () => {
    const inbox = createNode({ id: "inbox", systemRole: "inbox" });
    const local = createBit({ id: "local", parentId: inbox.id });
    let activeBits: Bit[] = [];
    const createBitMock = vi.fn().mockImplementation(async () => {
      activeBits = [local];
      return local;
    });
    getDataStoreMock.mockResolvedValue({
      getAllActiveNodes: vi.fn().mockResolvedValue([inbox]),
      getAllActiveBits: vi.fn().mockImplementation(() => Promise.resolve(activeBits)),
      getArchivedItems: vi.fn().mockResolvedValue({ nodes: [], bits: [] }),
      getTrashedItems: vi.fn().mockResolvedValue({ nodes: [], bits: [] }),
      createBit: createBitMock,
    } as unknown as DataStore);

    const { result } = renderHook(() => useInbox());
    await waitFor(() => expect(result.current.inboxNodeId).toBe(inbox.id));

    await result.current.createScratchBit("Local");
    await rerunLiveQueries();

    expect(result.current.activeScratchBits).toEqual([local]);
    expect(result.current.poolLifecycleProjection).toEqual({
      revision: 0,
      changes: [],
    });
  });

  it("selects the first visible active Scratch under persisted sort without moving focus", async () => {
    const inbox = createNode({ id: "inbox", systemRole: "inbox" });
    const hiddenNewer = createBit({
      id: "hidden-newer",
      title: "Hidden",
      parentId: inbox.id,
      createdAt: 300,
    });
    const visibleOlder = createBit({
      id: "visible-older",
      title: "Project alpha",
      parentId: inbox.id,
      createdAt: 100,
    });
    getDataStoreMock.mockResolvedValue({
      getAllActiveNodes: vi.fn().mockResolvedValue([inbox]),
      getAllActiveBits: vi.fn().mockResolvedValue([hiddenNewer, visibleOlder]),
      createBit: vi.fn(),
    } as unknown as DataStore);
    useTriageStore.setState({
      selectedScratchId: "removed",
      scratchPoolQuery: "project",
    });
    useTriagePreferencesStore.setState({ poolCreatedAtSort: "ASC" });
    const focusTarget = document.createElement("button");
    document.body.append(focusTarget);
    focusTarget.focus();

    renderHook(() => useInbox());

    await waitFor(() => {
      expect(useTriageStore.getState()).toMatchObject({
        selectedScratchId: "visible-older",
        scratchPoolResultIds: ["visible-older"],
      });
    });
    expect(document.activeElement).toBe(focusTarget);
    focusTarget.remove();
  });

  it("keeps a valid selected Scratch when the restored query hides its row", async () => {
    const inbox = createNode({ id: "inbox", systemRole: "inbox" });
    const hidden = createBit({
      id: "hidden",
      title: "Hidden",
      parentId: inbox.id,
      createdAt: 300,
    });
    const visible = createBit({
      id: "visible",
      title: "Project alpha",
      parentId: inbox.id,
      createdAt: 100,
    });
    getDataStoreMock.mockResolvedValue({
      getAllActiveNodes: vi.fn().mockResolvedValue([inbox]),
      getAllActiveBits: vi.fn().mockResolvedValue([hidden, visible]),
      createBit: vi.fn(),
    } as unknown as DataStore);
    useTriageStore.setState({
      selectedScratchId: "hidden",
      scratchPoolQuery: "project",
    });

    renderHook(() => useInbox());

    await waitFor(() => {
      expect(useTriageStore.getState()).toMatchObject({
        selectedScratchId: "hidden",
        scratchPoolResultIds: ["visible"],
      });
    });
  });

  it("clears selection for a true empty Inbox snapshot", async () => {
    const inbox = createNode({ id: "inbox", systemRole: "inbox" });
    getDataStoreMock.mockResolvedValue({
      getAllActiveNodes: vi.fn().mockResolvedValue([inbox]),
      getAllActiveBits: vi.fn().mockResolvedValue([]),
      createBit: vi.fn(),
    } as unknown as DataStore);
    useTriageStore.setState({ selectedScratchId: "removed" });

    renderHook(() => useInbox());

    await waitFor(() => {
      expect(useTriageStore.getState().selectedScratchId).toBeNull();
    });
  });

  it("resets Scratch count to zero while Inbox is unavailable", async () => {
    const dataStore = {
      getAllActiveNodes: vi.fn().mockResolvedValue([]),
      getAllActiveBits: vi.fn().mockResolvedValue([
        createBit({ parentId: crypto.randomUUID() }),
      ]),
      createBit: vi.fn(),
    } as unknown as DataStore;
    getDataStoreMock.mockResolvedValue(dataStore);

    const { result } = renderHook(() => useInbox());

    await waitFor(() => {
      expect(dataStore.getAllActiveNodes).toHaveBeenCalled();
    });
    expect(result.current.scratchCount).toBe(0);
  });

  it("returns an empty active Scratch list while Inbox is unavailable", async () => {
    const dataStore = {
      getAllActiveNodes: vi.fn().mockResolvedValue([]),
      getAllActiveBits: vi.fn().mockResolvedValue([
        createBit({ parentId: crypto.randomUUID() }),
      ]),
      createBit: vi.fn(),
    } as unknown as DataStore;
    getDataStoreMock.mockResolvedValue(dataStore);

    const { result } = renderHook(() => useInbox());

    await waitFor(() => {
      expect(dataStore.getAllActiveNodes).toHaveBeenCalled();
    });
    expect(result.current.activeScratchBits).toEqual([]);
    expect(dataStore.getAllActiveBits).not.toHaveBeenCalled();
  });
});

async function actFlush(run?: () => void): Promise<void> {
  await act(async () => {
    run?.();
  });
}

async function rerunLiveQueries(): Promise<void> {
  await act(async () => {
    await Promise.all(liveQueryRuns.map((run) => run()));
  });
}
