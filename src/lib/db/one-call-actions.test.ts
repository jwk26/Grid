import { describe, expect, it } from "vitest";
import type { Bit, Chunk, Node } from "@/lib/db/schema";
import { IndexedDBDataStore } from "@/lib/db/indexeddb";

// The one-call actions of SCHEMA §Exposed functions on the Dexie store (Task 227): the parent
// extension of `updateBit` and `updateChunk`, `reorderChunks` and `emptyTrash`.

type StoredRecord = { id: string };

class FakeTable<T extends StoredRecord> {
  readonly records = new Map<string, T>();
  constructor(initial: T[] = []) { for (const item of initial) this.records.set(item.id, structuredClone(item)); }
  async get(id: string) { return this.records.has(id) ? structuredClone(this.records.get(id)!) : undefined; }
  async put(value: T) { this.records.set(value.id, structuredClone(value)); return value.id; }
  async bulkPut(values: T[]) { for (const v of values) this.records.set(v.id, structuredClone(v)); }
  async delete(id: string) { this.records.delete(id); }
  async bulkDelete(ids: string[]) { for (const id of ids) this.records.delete(id); }
  async toArray() { return Array.from(this.records.values(), (v) => structuredClone(v)); }
}

const ID = {
  active: "00000000-0000-4000-8000-000000000001",
  trashed_bit: "00000000-0000-4000-8000-000000000002",
  under_active: "00000000-0000-4000-8000-000000000003",
  in_trashed: "00000000-0000-4000-8000-000000000004",
  trashed: "00000000-0000-4000-8000-000000000005",
  child: "00000000-0000-4000-8000-000000000006",
  c1: "00000000-0000-4000-8000-000000000007",
  c2: "00000000-0000-4000-8000-000000000008",
  c3: "00000000-0000-4000-8000-000000000009",
  n: "00000000-0000-4000-8000-000000000010",
  b: "00000000-0000-4000-8000-000000000011",
  c: "00000000-0000-4000-8000-000000000012",
  x: "00000000-0000-4000-8000-000000000013",
};

const BASE_TS = 1_700_000_000_000;
const DAY = 86_400_000;

function makeNode(id: string, overrides: Partial<Node> = {}): Node {
  return { id, title: "Node", color: "hsl(210, 80%, 55%)", icon: "Folder", deadline: null, deadlineAllDay: false, mtime: BASE_TS, createdAt: BASE_TS, version: 1, parentId: null, level: 0, x: 0, y: 0, deletedAt: null, archivedAt: null, systemRole: null, hiddenFromGrid: false, pastDeadlineDismissed: false, ...overrides };
}
function makeBit(id: string, parentId: string, overrides: Partial<Bit> = {}): Bit {
  return { id, title: "Bit", description: "", icon: "Box", deadline: null, deadlineAllDay: false, priority: null, status: "active", mtime: BASE_TS, createdAt: BASE_TS, version: 1, parentId, x: 0, y: 0, deletedAt: null, archivedAt: null, pastDeadlineDismissed: false, ...overrides } as Bit;
}
function makeChunk(id: string, parentId: string, overrides: Partial<Chunk> = {}): Chunk {
  return { id, title: "Chunk", description: "", time: null, timeAllDay: false, status: "incomplete", order: 0, parentId, ...overrides } as Chunk;
}
function makeStore(nodes: Node[], bits: Bit[], chunks: Chunk[]) {
  const tables = { nodes: new FakeTable(nodes), bits: new FakeTable(bits), chunks: new FakeTable(chunks) };
  return { store: new IndexedDBDataStore(tables), tables };
}

describe("updateBit with extendParent", () => {
  it("extends the parent Node deadline in the same write, version + 1 once on each", async () => {
    const { store } = makeStore(
      [makeNode(ID.n, { deadline: BASE_TS + DAY, version: 5 })],
      [makeBit(ID.b, ID.n, { version: 2 })],
      [],
    );
    await store.updateBit(ID.b, { deadline: BASE_TS + 3 * DAY, deadlineAllDay: true }, { extendParent: true });

    const node = (await store.getNode(ID.n))!;
    const bit = (await store.getBit(ID.b))!;
    expect(node.deadline).toBe(BASE_TS + 3 * DAY);
    expect(node.deadlineAllDay).toBe(true);
    expect(node.version).toBe(6);
    expect(bit.deadline).toBe(BASE_TS + 3 * DAY);
    expect(bit.version).toBe(3);
  });

  it("leaves the parent alone when the deadline already fits", async () => {
    const { store } = makeStore(
      [makeNode(ID.n, { deadline: BASE_TS + 5 * DAY, version: 5 })],
      [makeBit(ID.b, ID.n)],
      [],
    );
    await store.updateBit(ID.b, { deadline: BASE_TS + DAY }, { extendParent: true });
    expect((await store.getNode(ID.n))!.version).toBe(5);
    expect((await store.getNode(ID.n))!.deadline).toBe(BASE_TS + 5 * DAY);
  });

  it("still rejects a deadline past the parent without extendParent", async () => {
    const { store } = makeStore([makeNode(ID.n, { deadline: BASE_TS + DAY })], [makeBit(ID.b, ID.n)], []);
    await expect(store.updateBit(ID.b, { deadline: BASE_TS + 3 * DAY })).rejects.toThrow();
    expect((await store.getBit(ID.b))!.deadline).toBeNull();
  });
});

describe("updateChunk with extendParent", () => {
  it("sets the Bit deadline and all-day flag to the Chunk's, version + 1 once", async () => {
    const { store } = makeStore(
      [makeNode(ID.n, { version: 4 })],
      [makeBit(ID.b, ID.n, { deadline: BASE_TS + DAY, version: 3 })],
      [makeChunk(ID.c, ID.b)],
    );
    await store.updateChunk(ID.c, { time: BASE_TS + 2 * DAY, timeAllDay: true }, { extendParent: true });

    const bit = (await store.getBit(ID.b))!;
    expect(bit.deadline).toBe(BASE_TS + 2 * DAY);
    expect(bit.deadlineAllDay).toBe(true);
    expect(bit.version).toBe(4);
    expect((await store.getNode(ID.n))!.version).toBe(4);
  });

  it("bumps the Bit version once when the extension and a status change land together", async () => {
    const { store } = makeStore(
      [makeNode(ID.n)],
      [makeBit(ID.b, ID.n, { deadline: BASE_TS + DAY, version: 3 })],
      [makeChunk(ID.c, ID.b)],
    );
    await store.updateChunk(ID.c, { time: BASE_TS + 2 * DAY, status: "complete" }, { extendParent: true });
    const bit = (await store.getBit(ID.b))!;
    expect(bit.status).toBe("complete");
    expect(bit.version).toBe(4);
  });

  it("writes nothing when the extension would pass the Node deadline", async () => {
    const { store } = makeStore(
      [makeNode(ID.n, { deadline: BASE_TS + DAY })],
      [makeBit(ID.b, ID.n, { deadline: BASE_TS + DAY })],
      [makeChunk(ID.c, ID.b)],
    );
    await expect(
      store.updateChunk(ID.c, { time: BASE_TS + 3 * DAY }, { extendParent: true }),
    ).rejects.toThrow();
    expect((await store.getChunks(ID.b))[0].time).toBeNull();
    expect((await store.getBit(ID.b))!.deadline).toBe(BASE_TS + DAY);
  });

  it("still rejects a time past the Bit deadline without extendParent", async () => {
    const { store } = makeStore(
      [makeNode(ID.n)],
      [makeBit(ID.b, ID.n, { deadline: BASE_TS + DAY })],
      [makeChunk(ID.c, ID.b)],
    );
    await expect(store.updateChunk(ID.c, { time: BASE_TS + 3 * DAY })).rejects.toThrow();
  });
});

describe("reorderChunks", () => {
  it("writes order 0..n-1 in the given sequence and nothing else on the Bit", async () => {
    const { store } = makeStore(
      [makeNode(ID.n)],
      [makeBit(ID.b, ID.n, { version: 2 })],
      [makeChunk(ID.c1, ID.b, { order: 0 }), makeChunk(ID.c2, ID.b, { order: 1 }), makeChunk(ID.c3, ID.b, { order: 2 })],
    );
    await store.reorderChunks(ID.b, [ID.c3, ID.c1, ID.c2]);

    expect((await store.getChunks(ID.b)).map((chunk) => chunk.id)).toEqual([ID.c3, ID.c1, ID.c2]);
    const bit = (await store.getBit(ID.b))!;
    expect(bit.version).toBe(2);
    expect(bit.mtime).toBe(BASE_TS);
  });

  it("rejects a list that is not exactly the Bit's Chunks and writes nothing", async () => {
    const { store } = makeStore(
      [makeNode(ID.n)],
      [makeBit(ID.b, ID.n)],
      [makeChunk(ID.c1, ID.b, { order: 0 }), makeChunk(ID.c2, ID.b, { order: 1 })],
    );
    await expect(store.reorderChunks(ID.b, [ID.c2])).rejects.toThrow();
    await expect(store.reorderChunks(ID.b, [ID.c2, ID.c2])).rejects.toThrow();
    await expect(store.reorderChunks(ID.b, [ID.c2, ID.c1, ID.x])).rejects.toThrow();
    expect((await store.getChunks(ID.b)).map((chunk) => chunk.id)).toEqual([ID.c1, ID.c2]);
  });
});

describe("emptyTrash", () => {
  it("deletes every trashed Node closure and trashed Bit, and keeps active rows", async () => {
    const { store, tables } = makeStore(
      [
        makeNode(ID.active),
        makeNode(ID.trashed, { deletedAt: BASE_TS, x: 1 }),
        makeNode(ID.child, { parentId: ID.trashed, level: 1, deletedAt: BASE_TS }),
      ],
      [
        makeBit(ID.under_active, ID.active),
        makeBit(ID.trashed_bit, ID.active, { deletedAt: BASE_TS, x: 1 }),
        makeBit(ID.in_trashed, ID.trashed, { deletedAt: BASE_TS }),
      ],
      [makeChunk(ID.c, ID.in_trashed)],
    );
    const result = await store.emptyTrash();

    expect(result).toEqual({ status: "deleted" });
    expect([...tables.nodes.records.keys()]).toEqual([ID.active]);
    expect([...tables.bits.records.keys()]).toEqual([ID.under_active]);
    expect(tables.chunks.records.size).toBe(0);
  });

  it("does nothing on an empty Trash", async () => {
    const { store, tables } = makeStore([makeNode(ID.active)], [], []);
    await expect(store.emptyTrash()).resolves.toEqual({ status: "deleted" });
    expect(tables.nodes.records.size).toBe(1);
  });
});
