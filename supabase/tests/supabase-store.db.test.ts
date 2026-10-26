import { beforeAll, describe, expect, it } from "vitest";
import type { Node } from "@/lib/db/schema";
import { parseSnapshotValue, SnapshotStore, type AccountView } from "@/lib/db/snapshot-store";
import { fetchSnapshotValue } from "@/lib/db/supabase-calls";
import type { GriddoSupabaseClient } from "@/lib/db/supabase-client";
import { WRITE_FUNCTION, createSupabaseStore } from "@/lib/db/supabase-store";
import { DeadlineConflictError, WriteRejectedError } from "@/lib/db/write-errors";
import { createTestUser, signedInClient } from "./helpers/users";

// The ordinary writes of the Supabase store against the real functions on local Supabase (Task 227
// Stage 2): each method reaches its function with one request, and after every call the snapshot
// base equals a fresh get_snapshot (S31: snapshot before + `changes` = snapshot after).

const DAY = 86_400_000;
const NOW = Date.now();
const GREEN = "hsl(120, 60%, 40%)";

let client: GriddoSupabaseClient;
let snapshot: SnapshotStore;
let store: ReturnType<typeof createSupabaseStore>;
const calls: string[] = [];

beforeAll(async () => {
  const user = await createTestUser("store");
  const raw = await signedInClient(user);
  const original = raw.rpc.bind(raw);
  (raw as unknown as { rpc: unknown }).rpc = (name: string, args?: object) => {
    calls.push(name);
    return original(name as never, args as never);
  };
  client = raw as unknown as GriddoSupabaseClient;
  snapshot = new SnapshotStore({ fetchSnapshot: () => fetchSnapshotValue(client) });
  store = createSupabaseStore(snapshot, () => client);
});

// Runs `action`, asserts it sent exactly one request, to `fn`, and that the snapshot base then
// equals a fresh snapshot.
async function oneCall<T>(method: keyof typeof WRITE_FUNCTION, action: () => Promise<T>): Promise<T> {
  calls.length = 0;
  const result = await action();
  expect(calls, `${method} requests`).toEqual([WRITE_FUNCTION[method]]);
  await expectBaseIsFresh();
  return result;
}

const sortedById = (rows: ReadonlyMap<string, { id: string }>) =>
  [...rows.values()].sort((a, b) => (a.id < b.id ? -1 : 1));

async function expectBaseIsFresh() {
  const fresh = parseSnapshotValue(await fetchSnapshotValue(client));
  if (fresh.kind !== "snapshot") throw new Error("expected a snapshot");
  const view = snapshot.getState().view;
  for (const table of Object.keys(fresh.data) as Array<keyof AccountView>) {
    // Map order follows insertion, which differs between a patched base and a fresh load.
    expect(sortedById(view[table]), table).toEqual(sortedById(fresh.data[table]));
  }
}

const nodeData = (x: number, extra: Partial<Node> = {}) => ({
  title: `Node ${x}`,
  color: GREEN,
  icon: "Folder",
  deadline: null,
  deadlineAllDay: false,
  parentId: null,
  level: 0,
  x,
  y: 4,
  ...extra,
});
const bitData = (parentId: string, x: number, extra: Record<string, unknown> = {}) => ({
  title: `Bit ${x}`,
  description: "",
  icon: "Box",
  deadline: null,
  deadlineAllDay: false,
  priority: null,
  parentId,
  x,
  y: 0,
  ...extra,
});

describe("Supabase store: ordinary writes", () => {
  it("ensureSystemNodes creates the account and loads into the base", async () => {
    await oneCall("ensureSystemNodes", () => store.ensureSystemNodes());
    expect(await snapshot.load()).toBe("applied");
    const roles = [...snapshot.getState().view.nodes.values()].map((n) => n.systemRole).sort();
    expect(roles).toEqual(["archive_view", "inbox"]);
  });

  it("creates, updates and deletes through one call each", async () => {
    const node = await oneCall("createNode", () => store.createNode(nodeData(5)));
    expect(node).toMatchObject({ title: "Node 5", level: 0, version: 1 });
    await oneCall("updateNode", () => store.updateNode(node.id, { title: "Renamed" }));
    expect((await store.getNode(node.id))?.title).toBe("Renamed");

    const bit = await oneCall("createBit", () => store.createBit(bitData(node.id, 0)));
    expect(bit).toMatchObject({ status: "active", version: 1 });
    await oneCall("updateBit", () => store.updateBit(bit.id, { priority: "high" }));

    const chunk = await oneCall("createChunk", () =>
      store.createChunk({ title: "C1", description: "", time: null, timeAllDay: false, order: 0, parentId: bit.id }),
    );
    await oneCall("updateChunk", () => store.updateChunk(chunk.id, { status: "complete" }));
    expect((await store.getBit(bit.id))?.status).toBe("complete");
    await oneCall("deleteChunk", () => store.deleteChunk(chunk.id));
    expect(await store.getChunks(bit.id)).toEqual([]);
  });

  it("reorders Chunks with one call", async () => {
    const node = await store.createNode(nodeData(6));
    const bit = await store.createBit(bitData(node.id, 0));
    const chunks = [];
    for (let order = 0; order < 3; order += 1) {
      chunks.push(
        await store.createChunk({ title: `C${order}`, description: "", time: null, timeAllDay: false, order, parentId: bit.id }),
      );
    }
    const wanted = [chunks[2].id, chunks[0].id, chunks[1].id];
    await oneCall("reorderChunks", () => store.reorderChunks(bit.id, wanted));
    expect((await store.getChunks(bit.id)).map((c) => c.id)).toEqual(wanted);
    await expect(store.reorderChunks(bit.id, [chunks[0].id])).rejects.toMatchObject({ rejection: { code: "invalid_input" } });
    await expectBaseIsFresh();
  });

  it("the parent extension is one request that extends the Node or the Bit", async () => {
    const node = await store.createNode(nodeData(7, { deadline: NOW + DAY }));
    const bit = await store.createBit(bitData(node.id, 0));
    await expect(store.updateBit(bit.id, { deadline: NOW + 3 * DAY })).rejects.toBeInstanceOf(DeadlineConflictError);
    await oneCall("updateBit", () =>
      store.updateBit(bit.id, { deadline: NOW + 3 * DAY, deadlineAllDay: false }, { extendParent: true }),
    );
    expect((await store.getNode(node.id))?.deadline).toBe(NOW + 3 * DAY);

    const chunk = await store.createChunk({ title: "C", description: "", time: null, timeAllDay: false, order: 0, parentId: bit.id });
    await expect(store.updateChunk(chunk.id, { time: NOW + 5 * DAY })).rejects.toThrow("Chunk time cannot exceed parent bit deadline");
    await expect(store.updateChunk(chunk.id, { time: NOW + 5 * DAY }, { extendParent: true })).rejects.toThrow(
      "Chunk time cannot exceed parent node deadline",
    );
    await store.updateNode(node.id, { deadline: null });
    await oneCall("updateChunk", () => store.updateChunk(chunk.id, { time: NOW + 5 * DAY }, { extendParent: true }));
    expect((await store.getBit(bit.id))?.deadline).toBe(NOW + 5 * DAY);
  });

  it("lifecycle: trash, restore, archive, unarchive, hard delete, Empty Trash, cleanup", async () => {
    const node = await store.createNode(nodeData(8));
    const bit = await store.createBit(bitData(node.id, 1));
    await oneCall("softDeleteBit", () => store.softDeleteBit(bit.id));
    await oneCall("restoreBit", () => store.restoreBit(bit.id));
    await oneCall("archiveBit", () => store.archiveBit(bit.id));
    await oneCall("unarchiveBit", () => store.unarchiveBit(bit.id));
    await oneCall("softDeleteNode", () => store.softDeleteNode(node.id));
    await oneCall("restoreNode", () => store.restoreNode(node.id));
    await oneCall("archiveNode", () => store.archiveNode(node.id));
    await oneCall("unarchiveNode", () => store.unarchiveNode(node.id));

    await store.softDeleteBit(bit.id);
    await oneCall("hardDeleteBit", () => store.hardDeleteBit(bit.id));
    expect(await store.getBit(bit.id)).toBeUndefined();
    await store.softDeleteNode(node.id);
    await oneCall("hardDeleteNode", () => store.hardDeleteNode(node.id));
    expect(await store.getNode(node.id)).toBeUndefined();

    const a = await store.createNode(nodeData(9));
    const b = await store.createBit(bitData(a.id, 2));
    await store.softDeleteNode(a.id);
    const result = await oneCall("emptyTrash", () => store.emptyTrash());
    expect(result).toEqual({ status: "deleted" });
    expect(await store.getNode(a.id)).toBeUndefined();
    expect(await store.getBit(b.id)).toBeUndefined();

    await oneCall("cleanupExpiredTrash", () => store.cleanupExpiredTrash());
  });

  it("promotes a Bit into a Node with one call", async () => {
    const node = await store.createNode(nodeData(10));
    const bit = await store.createBit(bitData(node.id, 3));
    await store.createChunk({ title: "Step", description: "", time: null, timeAllDay: false, order: 0, parentId: bit.id });
    const promoted = await oneCall("promoteBitToNode", () => store.promoteBitToNode(bit.id));
    expect(promoted).toMatchObject({ title: bit.title, level: 1, parentId: node.id });
    expect(await store.getBit(bit.id)).toBeUndefined();
    expect((await store.getBits(promoted.id)).map((b) => b.title)).toEqual(["Step"]);
  });

  it("a rule violation is a rejected write that changes nothing", async () => {
    const node = await store.createNode(nodeData(11));
    const taken = await store.createNode(nodeData(12));
    calls.length = 0;
    const error = await store.updateNode(taken.id, { x: 11, y: 4 }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(WriteRejectedError);
    expect((error as WriteRejectedError).rejection.code).toBe("cell_taken");
    expect(calls[0]).toBe("update_node");
    await expect(store.softDeleteBit("00000000-0000-4000-8000-00000000dead")).rejects.toThrow(/Bit not found/);
    await vi_waitForBase();
    expect((await store.getNode(node.id))?.x).toBe(11);
  });
});

// A state-dependent rejection refetches once; wait for it, then the base must match the server.
async function vi_waitForBase() {
  await new Promise((resolve) => setTimeout(resolve, 200));
  await expectBaseIsFresh();
}
