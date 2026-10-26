import "@testing-library/jest-dom/vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Bit, Chunk, Node } from "@/types";

const liveReadMock = vi.hoisted(() => vi.fn());
const getDataStoreMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/datastore", () => ({
  getDataStore: getDataStoreMock,
  liveRead: (read: (store: unknown) => Promise<unknown>) =>
    liveReadMock(() => getDataStoreMock().then(read)),
}));

const { useCalendarData } = await import("@/hooks/use-calendar-data");

function createNode(overrides: Partial<Node> = {}): Node {
  const timestamp = overrides.createdAt ?? 1_700_000_000_000;

  return {
    id: overrides.id ?? crypto.randomUUID(),
    title: overrides.title ?? "Node",
    color: overrides.color ?? "hsl(221, 83%, 53%)",
    icon: overrides.icon ?? "Folder",
    deadline: overrides.deadline ?? null,
    deadlineAllDay: overrides.deadlineAllDay ?? false,
    mtime: overrides.mtime ?? timestamp,
    createdAt: timestamp,
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
  const timestamp = overrides.createdAt ?? 1_700_000_000_000;

  return {
    id: overrides.id ?? crypto.randomUUID(),
    title: overrides.title ?? "Bit",
    description: overrides.description ?? "",
    icon: overrides.icon ?? "Box",
    deadline: overrides.deadline ?? null,
    deadlineAllDay: overrides.deadlineAllDay ?? false,
    priority: overrides.priority ?? null,
    status: overrides.status ?? "active",
    mtime: overrides.mtime ?? timestamp,
    createdAt: timestamp,
    parentId: overrides.parentId ?? crypto.randomUUID(),
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    deletedAt: overrides.deletedAt ?? null,
    archivedAt: overrides.archivedAt ?? null,
    version: overrides.version ?? 1,
    pastDeadlineDismissed: overrides.pastDeadlineDismissed ?? false,
  };
}

function createChunk(overrides: Partial<Chunk> = {}): Chunk {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    title: overrides.title ?? "Chunk",
    description: overrides.description ?? "",
    time: overrides.time ?? null,
    timeAllDay: overrides.timeAllDay ?? false,
    status: overrides.status ?? "incomplete",
    order: overrides.order ?? 0,
    parentId: overrides.parentId ?? crypto.randomUUID(),
  };
}

describe("useCalendarData", () => {
  it("excludes level-0 nodes from calendar deadline queries", async () => {
    const rootDeadline = new Date(2026, 3, 20, 0, 0).getTime();
    const childDeadline = new Date(2026, 3, 21, 9, 0).getTime();
    const bitDeadline = new Date(2026, 3, 22, 11, 0).getTime();
    const chunkTime = new Date(2026, 3, 23, 14, 0).getTime();
    const rootNode = createNode({ id: "root-node", deadline: rootDeadline, level: 0 });
    const childNode = createNode({
      id: "child-node",
      parentId: rootNode.id,
      deadline: childDeadline,
      level: 1,
    });
    const bit = createBit({
      id: "bit-1",
      parentId: childNode.id,
      deadline: bitDeadline,
    });
    const chunk = createChunk({
      id: "chunk-1",
      parentId: bit.id,
      time: chunkTime,
    });

    getDataStoreMock.mockResolvedValue({
      getNodes: vi.fn(async (parentId: string | null) => {
        if (parentId === null) {
          return [rootNode];
        }

        if (parentId === rootNode.id) {
          return [childNode];
        }

        return [];
      }),
      getBits: vi.fn(async (parentId: string) => (parentId === childNode.id ? [bit] : [])),
      getChunks: vi.fn(async (bitId: string) => (bitId === bit.id ? [chunk] : [])),
    });
    liveReadMock.mockImplementation((query: () => Promise<unknown>) => ({
      subscribe: ({ next }: { next: (value: unknown) => void }) => {
        void query().then(next);
        return { unsubscribe: vi.fn() };
      },
    }));

    const { result } = renderHook(() => useCalendarData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const weeklyIds = [...result.current.weeklyItems(new Date(2026, 3, 19)).values()]
      .flat()
      .map((item) => item.id);

    expect(weeklyIds).toContain(childNode.id);
    expect(weeklyIds).toContain(bit.id);
    expect(weeklyIds).toContain(chunk.id);
    expect(weeklyIds).not.toContain(rootNode.id);
  });
});
