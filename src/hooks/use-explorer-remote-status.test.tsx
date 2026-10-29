import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DataStore } from "@/lib/db/datastore";
import { useTriageStore } from "@/stores/triage-store";
import type { Bit, Node } from "@/types";
import { useExplorerRemoteStatus } from "./use-explorer-remote-status";

const getDataStoreMock = vi.hoisted(() => vi.fn());
const liveReadMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/datastore", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/db/datastore")>();
  return { ...original, getDataStore: getDataStoreMock,
    liveRead: (read: (store: unknown) => Promise<unknown>) =>
    liveReadMock(() => getDataStoreMock().then(read)), };
});

type Observer = {
  next: (value: unknown) => void;
  error: (error: unknown) => void;
};

type Subscription = {
  observer?: Observer;
  query: () => Promise<unknown>;
  unsubscribe: ReturnType<typeof vi.fn>;
};

const subscriptions: Subscription[] = [];
let rows: Node[] = [];
let bitRows: Bit[] = [];

function node(overrides: Partial<Node> = {}): Node {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    title: overrides.title ?? "Node",
    color: overrides.color ?? "hsl(221, 83%, 53%)",
    icon: overrides.icon ?? "Folder",
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

function bit(overrides: Partial<Bit> = {}): Bit {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    title: overrides.title ?? "Bit",
    description: overrides.description ?? "",
    icon: overrides.icon ?? "ListTodo",
    parentId: overrides.parentId ?? "parent",
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    deadline: overrides.deadline ?? null,
    deadlineAllDay: overrides.deadlineAllDay ?? false,
    priority: overrides.priority ?? null,
    status: overrides.status ?? "active",
    mtime: overrides.mtime ?? 1,
    createdAt: overrides.createdAt ?? 1,
    deletedAt: overrides.deletedAt ?? null,
    archivedAt: overrides.archivedAt ?? null,
    version: overrides.version ?? 1,
    pastDeadlineDismissed: overrides.pastDeadlineDismissed ?? false,
  };
}

function activeNodes() {
  return rows.filter(
    (row) => row.deletedAt === null && row.archivedAt === null,
  );
}

function activeBits() {
  return bitRows.filter(
    (row) => row.deletedAt === null && row.archivedAt === null,
  );
}

async function refresh() {
  const subscription = subscriptions.at(-1);
  if (!subscription?.observer) throw new Error("subscription not ready");
  const value = await subscription.query();
  act(() => subscription.observer?.next(value));
}

beforeEach(() => {
  rows = [];
  bitRows = [];
  subscriptions.length = 0;
  useTriageStore.setState({
    explorerLocalPlacementIdentities: [],
    explorerRemoteArrivalIds: {},
    explorerPathStatus: null,
  });
  getDataStoreMock.mockResolvedValue({
    getAllActiveNodes: vi.fn(async () => activeNodes()),
    getAllActiveBits: vi.fn(async () => activeBits()),
    getNode: vi.fn(async (id: string) => rows.find((row) => row.id === id)),
    getBit: vi.fn(async (id: string) =>
      bitRows.find((row) => row.id === id),
    ),
  } as unknown as DataStore);
  liveReadMock.mockImplementation((query: () => Promise<unknown>) => {
    const subscription: Subscription = { query, unsubscribe: vi.fn() };
    subscriptions.push(subscription);
    return {
      subscribe: (observer: Observer) => {
        subscription.observer = observer;
        void query().then(observer.next).catch(observer.error);
        return { unsubscribe: subscription.unsubscribe };
      },
    };
  });
});

describe("useExplorerRemoteStatus", () => {
  it("excludes initial hydration, exact local results, and existing-item parent moves while counting remote insertions by open column", async () => {
    const home = node({ id: "home", title: "Home project" });
    const existing = node({ id: "existing", parentId: "other", level: 1 });
    rows = [home, existing];
    const { result, rerender } = renderHook(
      ({ localPlacementResult }) =>
        useExplorerRemoteStatus({
          localPlacementResult,
          openColumns: [
            { columnId: "home", parentId: null },
            { columnId: home.id, parentId: home.id },
          ],
          pathIds: [home.id],
        }),
      {
        initialProps: {
          localPlacementResult: null as null | {
            id: string;
            type: "node" | "bit";
          },
        },
      },
    );

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(useTriageStore.getState().explorerRemoteArrivalIds).toEqual({});

    rows = rows.map((row) =>
      row.id === existing.id ? { ...row, parentId: home.id } : row,
    );
    await refresh();
    expect(useTriageStore.getState().explorerRemoteArrivalIds).toEqual({});

    const local = bit({ id: "local-bit", parentId: home.id });
    bitRows = [local];
    rerender({ localPlacementResult: { id: local.id, type: "bit" } });
    await refresh();
    expect(useTriageStore.getState().explorerRemoteArrivalIds).toEqual({});

    const remote = node({ id: "remote-node", parentId: home.id, level: 1 });
    rows = [...rows, remote];
    await refresh();
    expect(useTriageStore.getState().explorerRemoteArrivalIds).toEqual({
      [home.id]: [{ id: remote.id, type: "node" }],
    });
  });

  it("preserves typed identity and excludes a local Bit before its authoritative emission", async () => {
    const home = node({ id: "home", title: "Home project" });
    rows = [home];
    const { result } = renderHook(() =>
      useExplorerRemoteStatus({
        localPlacementResult: null,
        openColumns: [
          { columnId: "home", parentId: null },
          { columnId: home.id, parentId: home.id },
        ],
        pathIds: [home.id],
      }),
    );
    await waitFor(() => expect(result.current.isReady).toBe(true));

    const sharedId = "shared-result";
    useTriageStore.getState().registerExplorerLocalPlacement({
      id: sharedId,
      type: "bit",
    });
    rows = [
      ...rows,
      node({ id: sharedId, parentId: home.id, level: 1 }),
    ];
    bitRows = [bit({ id: sharedId, parentId: home.id })];
    await refresh();

    expect(useTriageStore.getState().explorerRemoteArrivalIds).toEqual({
      [home.id]: [{ id: sharedId, type: "node" }],
    });
  });

  it.each([
    ["archived", { archivedAt: 10, deletedAt: null }, "archived"],
    ["deleted", { archivedAt: null, deletedAt: 10 }, "unavailable"],
    ["moved", { archivedAt: null, deletedAt: null, parentId: "elsewhere" }, "moved"],
  ] as const)(
    "classifies an %s watched path change and retains the nearest valid ancestor",
    async (_label, change, expectedKind) => {
      const home = node({ id: "home", title: "Home project" });
      const child = node({
        id: "child",
        title: "Research",
        parentId: home.id,
        level: 1,
      });
      rows = [home, child];
      const { result } = renderHook(() =>
        useExplorerRemoteStatus({
          localPlacementResult: null,
          openColumns: [
            { columnId: "home", parentId: null },
            { columnId: home.id, parentId: home.id },
          ],
          pathIds: [home.id, child.id],
        }),
      );
      await waitFor(() => expect(result.current.isReady).toBe(true));

      rows = rows.map((row) =>
        row.id === child.id ? { ...row, ...change } : row,
      );
      await refresh();

      expect(result.current.validPathIds).toEqual([home.id]);
      expect(useTriageStore.getState().explorerPathStatus).toMatchObject({
        kind: expectedKind,
        title: child.title,
        destination: home.title,
        columnId: home.id,
        fallbackPathIds: [home.id],
      });
    },
  );

  it("uses the generic unavailable fallback when no safe title survives", async () => {
    const missingId = "missing";
    const { result } = renderHook(() =>
      useExplorerRemoteStatus({
        localPlacementResult: null,
        openColumns: [{ columnId: "home", parentId: null }],
        pathIds: [missingId],
      }),
    );

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.validPathIds).toEqual([]);
    expect(useTriageStore.getState().explorerPathStatus).toMatchObject({
      kind: "unavailable",
      title: null,
      destination: "Home",
      columnId: "home",
      fallbackPathIds: [],
    });
  });
});
