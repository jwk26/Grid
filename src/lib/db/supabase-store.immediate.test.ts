import { describe, expect, it, vi } from "vitest";
import { baseEntities } from "@/lib/db/boundary-cases";
import { bitToRow, chunkToRow, nodeToRow } from "@/lib/db/row-mapping";
import type { Node } from "@/lib/db/schema";
import { SnapshotStore, type Envelope } from "@/lib/db/snapshot-store";
import type { GriddoSupabaseClient } from "@/lib/db/supabase-client";
import { createSupabaseStore } from "@/lib/db/supabase-store";
import { WriteOutcomeUnknownError, WriteRejectedError } from "@/lib/db/write-errors";

// Task 231: groups 1 and 2 of SPEC §Write feel through the pending layer, over real
// `snapshot.write` and a fake client. The view changes before the answer; a refusal or an error
// puts it back; an unknown outcome is refetched, never resent.

const USER = "00000000-0000-4000-8000-0000000000aa";
const NODE = "00000000-0000-4000-8000-000000000001";
const OTHER_NODE = "00000000-0000-4000-8000-000000000004";
const BIT = "00000000-0000-4000-8000-000000000002";
const CHUNK = "00000000-0000-4000-8000-000000000003";
const CHUNK_2 = "00000000-0000-4000-8000-000000000005";

type RpcResult = { data: unknown; error: { message: string } | null; status: number };
type Held = { name: string; args: Record<string, unknown>; answer: (result: RpcResult) => void };

const ok = (envelope: Envelope): RpcResult => ({ data: envelope, error: null, status: 200 });
const applied = (changes: Envelope["changes"] = {}): Envelope => ({ status: "applied", result: null, changes });
const rejected = (code: string): Envelope => ({ status: "rejected", result: null, changes: {}, rejection: { code } });
const nodeRows = (rows: Array<Partial<Node> & { id: string }>) =>
  rows.map((row) => nodeToRow({ ...baseEntities.node, ...row } as Node, USER));

// Every request is held until the test answers it, so the view can be read in between.
function setup(requestTimeoutMs = 1_000) {
  const held: Held[] = [];
  const rpc = vi.fn(
    (name: string, args: Record<string, unknown>) =>
      new Promise<RpcResult>((resolve) => held.push({ name, args, answer: resolve })),
  );
  const client = { rpc } as unknown as GriddoSupabaseClient;
  const snapshotRows = (bitX = 1) => ({
    nodes: nodeRows([
      { id: NODE, x: 0, y: 0, level: 0 },
      { id: OTHER_NODE, x: 3, y: 3, level: 1, parentId: NODE },
    ]),
    bits: [bitToRow({ ...baseEntities.bit, id: BIT, parentId: NODE, x: bitX, y: 1 } as never, USER)],
    chunks: [
      chunkToRow({ ...baseEntities.chunk, id: CHUNK, parentId: BIT, order: 0 }, USER),
      chunkToRow({ ...baseEntities.chunk, id: CHUNK_2, parentId: BIT, order: 1 }, USER),
    ],
    scratch_breakdowns: [],
    staged_candidates: [],
  });
  const fetchSnapshot = vi.fn(async () => snapshotRows());
  const snapshot = new SnapshotStore({ fetchSnapshot, requestTimeoutMs });
  const store = createSupabaseStore(snapshot, () => client);
  const view = () => snapshot.getState().view;
  return { held, rpc, store, snapshot, fetchSnapshot, snapshotRows, view, ready: () => snapshot.load() };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const newNode = {
  title: "New",
  color: "hsl(210, 80%, 55%)",
  icon: "Folder",
  deadline: null,
  deadlineAllDay: false,
  parentId: NODE,
  level: 1,
  x: 5,
  y: 5,
};

describe("group 1: creates show at once", () => {
  it("a Node shows before the answer with version 1 and a level from its parent, then the server row replaces it", async () => {
    const t = setup();
    await t.ready();
    const created = t.store.createNode(newNode);
    await flush();
    const id = t.held[0].args.p_id as string;
    expect(t.view().nodes.get(id)).toMatchObject({ title: "New", version: 1, level: 1, x: 5, deletedAt: null });
    t.held[0].answer(ok(applied({ nodes: { upserted: nodeRows([{ id, title: "New", x: 5, y: 5, version: 1, level: 1 }]), deleted: [] } })));
    expect((await created).id).toBe(id);
    expect(t.snapshot.getState().pending).toEqual([]);
    expect(t.view().nodes.get(id)?.title).toBe("New");
  });

  it("a Bit and a Chunk show at once; a Bit takes the id the caller gives", async () => {
    const t = setup();
    await t.ready();
    const given = "00000000-0000-4000-8000-0000000000b1";
    void t.store.createBit(
      { parentId: NODE, title: "B", description: "", icon: "x", x: 2, y: 2, deadline: null, deadlineAllDay: false, priority: null },
      { id: given },
    );
    void t.store.createChunk({ parentId: BIT, title: "C", description: "", time: null, timeAllDay: false, order: 2 });
    await flush();
    expect(t.held[0].args.p_id).toBe(given);
    expect(t.view().bits.get(given)).toMatchObject({ status: "active", version: 1 });
    const chunkId = t.held[1].args.p_id as string;
    expect(t.view().chunks.get(chunkId)).toMatchObject({ status: "incomplete", order: 2 });
  });

  it("a refused create leaves the view and the method throws", async () => {
    const t = setup();
    await t.ready();
    const created = t.store.createNode(newNode);
    const failure = created.catch((e: unknown) => e);
    await flush();
    const id = t.held[0].args.p_id as string;
    expect(t.view().nodes.has(id)).toBe(true);
    t.held[0].answer(ok(rejected("account_limit")));
    expect(await failure).toBeInstanceOf(WriteRejectedError);
    expect(t.view().nodes.has(id)).toBe(false);
  });
});

describe("group 1: edits, completion and moves show at once", () => {
  it("a field edit patches only the keys given", async () => {
    const t = setup();
    await t.ready();
    const before = t.view().bits.get(BIT);
    void t.store.updateBit(BIT, { title: "Renamed" });
    await flush();
    expect(t.view().bits.get(BIT)).toEqual({ ...before, title: "Renamed" });
  });

  it("a completion toggle shows at once", async () => {
    const t = setup();
    await t.ready();
    void t.store.updateBit(BIT, { status: "complete" });
    await flush();
    expect(t.view().bits.get(BIT)?.status).toBe("complete");
  });

  it("a position move shows at once and a rejection puts it back", async () => {
    const t = setup();
    await t.ready();
    const moved = t.store.updateBit(BIT, { x: 7, y: 7 }).catch((e: unknown) => e);
    await flush();
    expect(t.view().bits.get(BIT)).toMatchObject({ x: 7, y: 7 });
    t.held[0].answer(
      ok({ ...rejected("cell_taken"), changes: { bits: { upserted: [bitToRow({ ...baseEntities.bit, id: BIT, parentId: NODE, x: 1, y: 1 } as never, USER)], deleted: [] } } }),
    );
    expect(await moved).toBeInstanceOf(WriteRejectedError);
    expect(t.view().bits.get(BIT)).toMatchObject({ x: 1, y: 1 });
  });

  it("a parent change moves the Node to the cell the caller chose and sets its level from the new parent", async () => {
    const t = setup();
    await t.ready();
    void t.store.updateNode(OTHER_NODE, { parentId: null, x: 4, y: 4 });
    await flush();
    expect(t.view().nodes.get(OTHER_NODE)).toMatchObject({ parentId: null, x: 4, y: 4, level: 0 });
  });

  it("a Chunk edit and a reorder show at once", async () => {
    const t = setup();
    await t.ready();
    void t.store.updateChunk(CHUNK, { title: "T" });
    void t.store.reorderChunks(BIT, [CHUNK_2, CHUNK]);
    await flush();
    expect(t.view().chunks.get(CHUNK)?.title).toBe("T");
    expect(t.view().chunks.get(CHUNK_2)?.order).toBe(0);
    expect(t.view().chunks.get(CHUNK)?.order).toBe(1);
    expect(t.held.map((h) => h.name)).toEqual(["update_chunk", "reorder_chunks"]);
  });
});

describe("group 2: Trash and Archive hide at once", () => {
  it("soft delete and archive hide the target and bring it back on failure", async () => {
    const t = setup();
    await t.ready();
    const trashed = t.store.softDeleteBit(BIT).catch((e: unknown) => e);
    await flush();
    expect(t.view().bits.has(BIT)).toBe(false);
    expect(await t.store.getBitsForNode(NODE)).toEqual([]);
    t.held[0].answer({ data: null, error: { message: "boom" }, status: 500 });
    expect(await trashed).toBeInstanceOf(Error);
    expect(t.view().bits.has(BIT)).toBe(true);

    void t.store.archiveNode(OTHER_NODE);
    await flush();
    expect(t.view().nodes.has(OTHER_NODE)).toBe(false);
  });

  it("the cascade is not predicted: the answer's rows arrive with the answer", async () => {
    const t = setup();
    await t.ready();
    const done = t.store.softDeleteNode(NODE);
    await flush();
    expect(t.view().bits.has(BIT)).toBe(true);
    t.held[0].answer(
      ok(applied({ nodes: { upserted: nodeRows([{ id: NODE, deletedAt: 5, version: 2 }]), deleted: [] } })),
    );
    await done;
    expect(t.view().nodes.get(NODE)?.deletedAt).toBe(5);
  });
});

describe("group 3 stays server-confirmed", () => {
  it("restore, hard delete and Empty Trash change nothing before the answer", async () => {
    const t = setup();
    await t.ready();
    const before = t.view();
    void t.store.restoreBit(BIT);
    void t.store.hardDeleteBit(BIT);
    void t.store.emptyTrash();
    await flush();
    expect(t.view()).toBe(before);
    expect(t.snapshot.getState().pending).toEqual([]);
  });
});

describe("S32 across real calls", () => {
  it("a lower-version envelope row never overwrites a newer base row", async () => {
    const t = setup();
    await t.ready();
    const first = t.store.updateBit(BIT, { title: "one" });
    const second = t.store.updateBit(BIT, { title: "two" });
    await flush();
    const row = (title: string, version: number) =>
      bitToRow({ ...baseEntities.bit, id: BIT, parentId: NODE, title, version } as never, USER);
    t.held[0].answer(ok(applied({ bits: { upserted: [row("one", 2)], deleted: [] } })));
    await first;
    await flush();
    t.held[1].answer(ok(applied({ bits: { upserted: [row("two", 3)], deleted: [] } })));
    await second;
    expect(t.view().bits.get(BIT)?.title).toBe("two");
  });

  it("two writes to one record go out in order", async () => {
    const t = setup();
    await t.ready();
    void t.store.updateBit(BIT, { title: "one" });
    void t.store.updateBit(BIT, { title: "two" });
    await flush();
    expect(t.held).toHaveLength(1);
    t.held[0].answer(ok(applied()));
    await flush();
    expect(t.held).toHaveLength(2);
    expect(t.view().bits.get(BIT)?.title).toBe("two");
  });

  it("a state-dependent rejection is followed by one refetch; account_limit is not", async () => {
    const t = setup();
    await t.ready();
    const a = t.store.updateBit(BIT, { x: 9 }).catch(() => undefined);
    await flush();
    t.held[0].answer(ok(rejected("cell_taken")));
    await a;
    await flush();
    expect(t.fetchSnapshot).toHaveBeenCalledTimes(2);
    const b = t.store.updateBit(BIT, { x: 8 }).catch(() => undefined);
    await flush();
    t.held[1].answer(ok(rejected("account_limit")));
    await b;
    await flush();
    expect(t.fetchSnapshot).toHaveBeenCalledTimes(2);
  });

  it("an answer lost in transit (status 0): the view shows the base until the refetch answers, nothing is resent", async () => {
    const t = setup();
    await t.ready();
    const moved = t.store.updateBit(BIT, { x: 6 }).catch((e: unknown) => e);
    await flush();
    expect(t.view().bits.get(BIT)?.x).toBe(6);
    t.held[0].answer({ data: null, error: { message: "network" }, status: 0 });
    expect(await moved).toBeInstanceOf(WriteOutcomeUnknownError);
    expect(t.view().bits.get(BIT)?.x).toBe(1);
    await flush();
    expect(t.fetchSnapshot).toHaveBeenCalledTimes(2);
    expect(t.rpc).toHaveBeenCalledTimes(1);
  });

  it("no answer within the timeout: the pending write leaves, the snapshot is refetched, nothing is resent", async () => {
    vi.useFakeTimers();
    try {
      const t = setup(1_000);
      await t.ready();
      const moved = t.store.updateBit(BIT, { x: 6 }).catch((e: unknown) => e);
      await vi.advanceTimersByTimeAsync(0);
      expect(t.view().bits.get(BIT)?.x).toBe(6);
      t.fetchSnapshot.mockImplementationOnce(async () => t.snapshotRows(6));
      await vi.advanceTimersByTimeAsync(1_000);
      expect(await moved).toBeInstanceOf(WriteOutcomeUnknownError);
      // The refetch answers with the committed row: the change is kept.
      expect(t.fetchSnapshot).toHaveBeenCalledTimes(2);
      expect(t.view().bits.get(BIT)?.x).toBe(6);
      expect(t.rpc).toHaveBeenCalledTimes(1);
      // The late answer to the held request is not applied to the base; it triggers one more refetch.
      t.fetchSnapshot.mockImplementation(async () => t.snapshotRows(6));
      t.held[0].answer(
        ok(applied({ bits: { upserted: [bitToRow({ ...baseEntities.bit, id: BIT, parentId: NODE, x: 99, version: 9 } as never, USER)], deleted: [] } })),
      );
      await vi.advanceTimersByTimeAsync(0);
      expect(t.view().bits.get(BIT)?.x).toBe(6);
      expect(t.fetchSnapshot).toHaveBeenCalledTimes(3);
      expect(t.rpc).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
