import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { baseEntities } from "@/lib/db/boundary-cases";
import { bitToRow, chunkToRow, nodeToRow } from "@/lib/db/row-mapping";
import { SnapshotStore, type Envelope } from "@/lib/db/snapshot-store";
import { BREADCRUMB_RESERVED_CELLS } from "@/lib/db/supabase-calls";
import type { GriddoSupabaseClient } from "@/lib/db/supabase-client";
import {
  NO_REQUEST_WRITE_METHODS,
  UNSENT_WRITE_METHODS,
  WRITE_FUNCTION,
  createSupabaseStore,
} from "@/lib/db/supabase-store";
import {
  DeadlineConflictError,
  WriteOutcomeUnknownError,
  WriteRejectedError,
} from "@/lib/db/write-errors";

// The ordinary writes of the Supabase store against a fake client (Task 227 Stage 2): the request
// each method sends, how an answer reaches the caller, and the unknown outcome. The real
// functions are covered by supabase/tests/supabase-store.db.test.ts.

const USER = "00000000-0000-4000-8000-0000000000aa";
const NODE = "00000000-0000-4000-8000-000000000001";
const BIT = "00000000-0000-4000-8000-000000000002";
const CHUNK = "00000000-0000-4000-8000-000000000003";

type RpcResult = { data: unknown; error: { message: string } | null; status: number };
const ok = (envelope: Envelope): RpcResult => ({ data: envelope, error: null, status: 200 });
const applied = (changes: Envelope["changes"] = {}, result: unknown = null): Envelope => ({
  status: "applied",
  result,
  changes,
});
const rejected = (code: string, table?: string): Envelope => ({
  status: "rejected",
  result: null,
  changes: {},
  rejection: { code, ...(table ? { table } : {}) },
});

function setup(answer: (name: string, args: Record<string, unknown>) => Promise<RpcResult> | RpcResult) {
  const rpc = vi.fn((name: string, args: Record<string, unknown>) => Promise.resolve(answer(name, args)));
  const client = { rpc } as unknown as GriddoSupabaseClient;
  const fetchSnapshot = vi.fn(async () => ({
    nodes: [nodeToRow({ ...baseEntities.node, id: NODE }, USER)],
    bits: [bitToRow({ ...baseEntities.bit, id: BIT, parentId: NODE } as never, USER)],
    chunks: [chunkToRow({ ...baseEntities.chunk, id: CHUNK, parentId: BIT }, USER)],
    scratch_breakdowns: [],
    staged_candidates: [],
  }));
  const snapshot = new SnapshotStore({ fetchSnapshot, requestTimeoutMs: 1_000 });
  return { rpc, store: createSupabaseStore(snapshot, () => client), snapshot, fetchSnapshot };
}

describe("ordinary writes: the request each method sends", () => {
  it("creates with a client id and only the keys the function takes", async () => {
    const { rpc, store } = setup((name, args) =>
      ok(
        applied({
          nodes: { upserted: [nodeToRow({ ...baseEntities.node, id: args.p_id as string }, USER)], deleted: [] },
        }),
      ),
    );
    const created = await store.createNode({
      title: "N",
      color: "hsl(210, 80%, 55%)",
      icon: "Folder",
      deadline: null,
      deadlineAllDay: false,
      parentId: null,
      level: 0,
      x: 1,
      y: 2,
    });
    expect(rpc).toHaveBeenCalledTimes(1);
    const [name, args] = rpc.mock.calls[0];
    expect(name).toBe("create_node");
    expect(created.id).toBe(args.p_id);
    expect(args.p_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(args.p_values).toEqual({
      title: "N",
      color: "hsl(210, 80%, 55%)",
      icon: "Folder",
      deadline: null,
      deadline_all_day: false,
      parent_id: null,
      x: 1,
      y: 2,
    });
  });

  it("restore, unarchive and promotion pass the reserved block; nothing else does", async () => {
    const { rpc, store } = setup(() =>
      ok(
        applied(
          {
            nodes: { upserted: [nodeToRow({ ...baseEntities.node, id: NODE }, USER)], deleted: [] },
          },
          { id: NODE },
        ),
      ),
    );
    await store.restoreNode(NODE);
    await store.unarchiveNode(NODE);
    await store.restoreBit(BIT);
    await store.unarchiveBit(BIT);
    await store.promoteBitToNode(BIT);
    await store.softDeleteNode(NODE);
    await store.archiveBit(BIT);
    const sent = rpc.mock.calls.map(([name, args]) => [name, args.p_reserved_cells]);
    expect(sent).toEqual([
      ["restore_node", BREADCRUMB_RESERVED_CELLS],
      ["unarchive_node", BREADCRUMB_RESERVED_CELLS],
      ["restore_bit", BREADCRUMB_RESERVED_CELLS],
      ["unarchive_bit", BREADCRUMB_RESERVED_CELLS],
      ["promote_bit_to_node", BREADCRUMB_RESERVED_CELLS],
      ["soft_delete_node", undefined],
      ["archive_bit", undefined],
    ]);
  });

  it("the parent extension is one request with p_extend_parent", async () => {
    const { rpc, store } = setup(() => ok(applied()));
    await store.updateBit(BIT, { deadline: 5 }, { extendParent: true });
    await store.updateChunk(CHUNK, { time: 5 }, { extendParent: true });
    await store.updateBit(BIT, { title: "T" });
    expect(rpc.mock.calls).toEqual([
      ["update_bit", { p_id: BIT, p_changes: { deadline: 5 }, p_extend_parent: true }],
      ["update_chunk", { p_id: CHUNK, p_changes: { time: 5 }, p_extend_parent: true }],
      ["update_bit", { p_id: BIT, p_changes: { title: "T" }, p_extend_parent: false }],
    ]);
  });

  it("Empty Trash and the Chunk reorder are one request each", async () => {
    const { rpc, store } = setup(() => ok(applied()));
    await expect(store.emptyTrash()).resolves.toEqual({ status: "deleted" });
    await store.reorderChunks(BIT, ["c2", "c1"]);
    expect(rpc.mock.calls).toEqual([
      ["empty_trash", {}],
      ["reorder_chunks", { p_bit_id: BIT, p_chunk_ids: ["c2", "c1"] }],
    ]);
  });

  it("a Chunk's order changes only through reorderChunks", async () => {
    const { rpc, store } = setup(() => ok(applied()));
    await expect(store.updateChunk(CHUNK, { order: 3 })).rejects.toThrow(/reorderChunks/);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("a write that fails client validation sends nothing", async () => {
    const { rpc, store } = setup(() => ok(applied()));
    await expect(store.updateBit(BIT, { title: "" })).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("ordinary writes: how an answer reaches the caller", () => {
  it("applies the envelope's changes to the snapshot base", async () => {
    const { store, snapshot } = setup(() =>
      ok(applied({ bits: { upserted: [bitToRow({ ...baseEntities.bit, id: BIT, parentId: NODE, title: "Server" } as never, USER)], deleted: [] } })),
    );
    await snapshot.load();
    await store.updateBit(BIT, { title: "Server" });
    expect(snapshot.getState().view.bits.get(BIT)?.title).toBe("Server");
  });

  it("restore into a full Grid fails with the message GRID_FULL that the Trash list matches", async () => {
    const { store } = setup(() => ok(rejected("grid_full")));
    await expect(store.restoreNode(NODE)).rejects.toMatchObject({ name: "WriteRejectedError", message: "GRID_FULL" });
    await expect(store.restoreBit(BIT)).rejects.toMatchObject({ message: "GRID_FULL" });
  });

  it("a missing row is `<Label> not found: <id>`", async () => {
    const { store } = setup(() => ok(rejected("not_found")));
    await expect(store.hardDeleteNode(NODE)).rejects.toThrow(`Node not found: ${NODE}`);
    await expect(store.softDeleteBit(BIT)).rejects.toThrow(`Bit not found: ${BIT}`);
  });

  it("a Bit past its parent's deadline is a DeadlineConflictError, as on Dexie", async () => {
    const { store } = setup(() => ok(rejected("deadline_exceeds_parent", "nodes")));
    const error = await store.updateBit(BIT, { deadline: 9 }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(DeadlineConflictError);
    expect((error as DeadlineConflictError).conflictingIds).toEqual([BIT]);
  });

  it("a Chunk past its Bit's or Node's deadline carries the Dexie message", async () => {
    const bitSide = setup(() => ok(rejected("deadline_exceeds_parent", "bits")));
    await expect(bitSide.store.updateChunk(CHUNK, { time: 9 })).rejects.toThrow("Chunk time cannot exceed parent bit deadline");
    const nodeSide = setup(() => ok(rejected("deadline_exceeds_parent", "nodes")));
    await expect(nodeSide.store.updateChunk(CHUNK, { time: 9 }, { extendParent: true })).rejects.toThrow(
      "Chunk time cannot exceed parent node deadline",
    );
  });

  it("any other rule code is a WriteRejectedError carrying the rejection", async () => {
    const { store } = setup(() => ok({ ...rejected("account_limit", "nodes"), rejection: { code: "account_limit", table: "nodes", limit: 300 } }));
    const error = await store
      .createNode({ title: "N", color: "hsl(1, 1%, 1%)", icon: "Folder", deadline: null, deadlineAllDay: false, parentId: null, level: 0, x: 0, y: 0 })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(WriteRejectedError);
    expect((error as WriteRejectedError).rejection).toEqual({ code: "account_limit", table: "nodes", limit: 300 });
  });

  it("an API error is a failed write, sent once, with no refetch", async () => {
    const { rpc, store, fetchSnapshot } = setup(() => ({ data: null, error: { message: "boom" }, status: 500 }));
    await expect(store.softDeleteNode(NODE)).rejects.toThrow(/boom/);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(fetchSnapshot).not.toHaveBeenCalled();
  });
});

describe("ordinary writes: an unknown outcome", () => {
  afterEach(() => vi.useRealTimers());

  it("a request that got no response is an unknown outcome: thrown, never resent, snapshot refetched", async () => {
    const { rpc, store, fetchSnapshot } = setup(() => ({ data: null, error: { message: "Failed to fetch" }, status: 0 }));
    await expect(store.hardDeleteBit(BIT)).rejects.toBeInstanceOf(WriteOutcomeUnknownError);
    await vi.waitFor(() => expect(fetchSnapshot).toHaveBeenCalledTimes(1));
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("no answer within the timeout is an unknown outcome", async () => {
    vi.useFakeTimers();
    const { rpc, store } = setup(() => new Promise<RpcResult>(() => undefined));
    const run = store.emptyTrash().catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(await run).toBeInstanceOf(WriteOutcomeUnknownError);
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});

describe("write method coverage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("every write method is mapped to a function, sends no request, or is listed as unsupported", () => {
    const { store } = setup(() => ok(applied()));
    const reads = new Set([
      "liveRead", "getNode", "getNodes", "getAllActiveNodes", "getBit", "getBits", "getBitsForNode",
      "getAllActiveBits", "getScratchArchiveEligibility", "getPlacementUndoTruth", "getScratchBreakdowns", "getAllScratchBreakdowns",
      "getStagedCandidates", "getAllStagedCandidates", "getChunks", "getActiveGridContents",
      "getCalendarItems", "getTrashedItems", "getArchivedItems", "searchAll", "getGridOccupancy",
      "getChildDeadlineConflicts",
    ]);
    const writes = Object.keys(store).filter((key) => !reads.has(key)).sort();
    const covered = [...Object.keys(WRITE_FUNCTION), ...NO_REQUEST_WRITE_METHODS, ...UNSENT_WRITE_METHODS].sort();
    expect(covered).toEqual(writes);
    expect(Object.keys(WRITE_FUNCTION).filter((key) => UNSENT_WRITE_METHODS.includes(key))).toEqual([]);
  });
});
