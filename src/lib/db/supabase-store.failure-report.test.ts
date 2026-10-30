import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { baseEntities } from "@/lib/db/boundary-cases";
import { bitToRow, chunkToRow, nodeToRow } from "@/lib/db/row-mapping";
import { SnapshotStore, type Envelope } from "@/lib/db/snapshot-store";
import type { GriddoSupabaseClient } from "@/lib/db/supabase-client";
import { createSupabaseStore } from "@/lib/db/supabase-store";
import {
  DeadlineConflictError,
  WriteOutcomeUnknownError,
  WriteRejectedError,
} from "@/lib/db/write-errors";
import { dropReportedFailure, type WriteFailure } from "@/lib/db/write-failure";

// Task 232 Stage 2: the store alone reports a rolled-back ordinary write, once, with the kind
// and the title the toast copy needs. Groups 3 and 4 and dialog creates report nothing.

const USER = "00000000-0000-4000-8000-0000000000aa";
const NODE = "00000000-0000-4000-8000-000000000001";
const BIT = "00000000-0000-4000-8000-000000000002";
const CHUNK = "00000000-0000-4000-8000-000000000003";
const CHUNK_2 = "00000000-0000-4000-8000-000000000005";

type RpcResult = { data: unknown; error: { message: string } | null; status: number };
const ok = (envelope: Envelope): RpcResult => ({ data: envelope, error: null, status: 200 });
const rejected = (code: string, extra: { table?: string; limit?: number } = {}): Envelope => ({
  status: "rejected",
  result: null,
  changes: {},
  rejection: { code, ...extra },
});

const newNode = {
  title: "New node",
  color: "hsl(210, 80%, 55%)",
  icon: "Folder",
  deadline: null,
  deadlineAllDay: false,
  parentId: null,
  level: 0,
  x: 4,
  y: 4,
};

function setup(
  answer: (name: string, args: Record<string, unknown>) => Promise<RpcResult> | RpcResult,
  requestTimeoutMs = 1_000,
) {
  const rpc = vi.fn((name: string, args: Record<string, unknown>) => Promise.resolve(answer(name, args)));
  const client = { rpc } as unknown as GriddoSupabaseClient;
  const rows = (bitX = 1) => ({
    nodes: [nodeToRow({ ...baseEntities.node, id: NODE, title: "Node A", x: 0, y: 0, level: 0 }, USER)],
    bits: [bitToRow({ ...baseEntities.bit, id: BIT, title: "Bit B", parentId: NODE, x: bitX, y: 1 } as never, USER)],
    chunks: [
      chunkToRow({ ...baseEntities.chunk, id: CHUNK, title: "Chunk C", parentId: BIT, order: 0 }, USER),
      chunkToRow({ ...baseEntities.chunk, id: CHUNK_2, parentId: BIT, order: 1 }, USER),
    ],
    scratch_breakdowns: [],
    staged_candidates: [],
  });
  const fetchSnapshot = vi.fn(async () => rows());
  const snapshot = new SnapshotStore({ fetchSnapshot, requestTimeoutMs });
  const reportFailure = vi.fn<(failure: WriteFailure) => void>();
  const store = createSupabaseStore(snapshot, () => client, { reportFailure });
  return { rpc, store, snapshot, fetchSnapshot, rows, reportFailure };
}

const refuse = (code = "cell_taken", extra = {}) => () => ok(rejected(code, extra));

describe("a rolled-back write is reported once, with its kind and title", () => {
  it.each([
    ["a position move", (s: ReturnType<typeof setup>) => s.store.updateNode(NODE, { x: 2, y: 2 }), "move", "Node A"],
    ["a parent change", (s: ReturnType<typeof setup>) => s.store.updateBit(BIT, { parentId: NODE, x: 2, y: 2 }), "move", "Bit B"],
    ["a title edit", (s: ReturnType<typeof setup>) => s.store.updateBit(BIT, { title: "Other" }), "edit", "Bit B"],
    ["a completion toggle", (s: ReturnType<typeof setup>) => s.store.updateBit(BIT, { status: "complete" }), "completion", "Bit B"],
    ["a Chunk edit", (s: ReturnType<typeof setup>) => s.store.updateChunk(CHUNK, { title: "Other" }), "edit", "Chunk C"],
    ["a deadline change", (s: ReturnType<typeof setup>) => s.store.updateBit(BIT, { deadline: 5 }), "deadline", "Bit B"],
    ["a deadline extension", (s: ReturnType<typeof setup>) => s.store.updateBit(BIT, { deadline: 5 }, { extendParent: true }), "deadline-extension", "Bit B"],
    ["a trash", (s: ReturnType<typeof setup>) => s.store.softDeleteNode(NODE), "trash", "Node A"],
    ["an archive", (s: ReturnType<typeof setup>) => s.store.archiveBit(BIT), "archive", "Bit B"],
    ["a Chunk reorder", (s: ReturnType<typeof setup>) => s.store.reorderChunks(BIT, [CHUNK_2, CHUNK]), "edit", "Bit B"],
  ])("%s", async (_name, run, kind, title) => {
    const s = setup(refuse());
    await s.snapshot.load();

    await expect(run(s)).rejects.toBeInstanceOf(WriteRejectedError);

    expect(s.reportFailure).toHaveBeenCalledTimes(1);
    expect(s.reportFailure).toHaveBeenCalledWith({ kind, title });
  });

  it("a create carries the typed title", async () => {
    const s = setup(refuse());
    await s.snapshot.load();
    await expect(s.store.createNode(newNode)).rejects.toBeInstanceOf(WriteRejectedError);
    expect(s.reportFailure).toHaveBeenCalledWith({ kind: "create", title: "New node" });
  });

  it("an account limit names the limit and the item word", async () => {
    const s = setup(refuse("account_limit", { table: "nodes", limit: 100 }));
    await s.snapshot.load();
    await expect(s.store.createNode(newNode)).rejects.toBeInstanceOf(WriteRejectedError);
    expect(s.reportFailure).toHaveBeenCalledTimes(1);
    expect(s.reportFailure).toHaveBeenCalledWith({
      kind: "create",
      title: "New node",
      accountLimit: { limit: 100, items: "Nodes" },
    });
  });

  it("a thrown error rolls back and reports", async () => {
    const s = setup(() => ({ data: null, error: { message: "boom" }, status: 400 }));
    await s.snapshot.load();
    await expect(s.store.updateBit(BIT, { title: "Other" })).rejects.toThrow();
    expect(s.reportFailure).toHaveBeenCalledTimes(1);
  });

  it("marks what it reported, so a caller with no message of its own can drop it", async () => {
    const s = setup(refuse());
    await s.snapshot.load();
    await expect(s.store.updateBit(BIT, { title: "Other" }).catch(dropReportedFailure)).resolves.toBeUndefined();
  });

  it("does not mark a deadline conflict, so it still reaches the dialog", async () => {
    const s = setup(refuse("deadline_exceeds_parent", { table: "nodes" }));
    await s.snapshot.load();
    await expect(s.store.updateBit(BIT, { deadline: 5 }).catch(dropReportedFailure)).rejects.toBeInstanceOf(
      DeadlineConflictError,
    );
  });

  it("a deadline conflict is left to the conflict dialog", async () => {
    const s = setup(refuse("deadline_exceeds_parent", { table: "nodes" }));
    await s.snapshot.load();
    await expect(s.store.updateBit(BIT, { deadline: 5 })).rejects.toBeInstanceOf(DeadlineConflictError);
    expect(s.reportFailure).not.toHaveBeenCalled();
  });

  it("a Chunk deadline refusal is reported", async () => {
    const s = setup(refuse("deadline_exceeds_parent", { table: "bits" }));
    await s.snapshot.load();
    await expect(s.store.updateChunk(CHUNK, { time: 5 })).rejects.toBeInstanceOf(WriteRejectedError);
    expect(s.reportFailure).toHaveBeenCalledTimes(1);
  });

  it("an applied write reports nothing", async () => {
    const s = setup(() => ok({ status: "applied", result: null, changes: {} }));
    await s.snapshot.load();
    await s.store.updateBit(BIT, { title: "Other" });
    expect(s.reportFailure).not.toHaveBeenCalled();
  });

  it("a server-confirmed write (group 3) reports nothing", async () => {
    const s = setup(refuse("not_found"));
    await s.snapshot.load();
    await expect(s.store.hardDeleteNode(NODE)).rejects.toThrow();
    await expect(s.store.restoreBit(BIT)).rejects.toThrow();
    expect(s.reportFailure).not.toHaveBeenCalled();
  });

  it("a Node edit with report off (its dialog) reports nothing", async () => {
    const s = setup(refuse());
    await s.snapshot.load();
    await expect(s.store.updateNode(NODE, { title: "Other" }, { report: false })).rejects.toBeInstanceOf(
      WriteRejectedError,
    );
    expect(s.reportFailure).not.toHaveBeenCalled();
  });

  it("a create with report off (a dialog) reports nothing", async () => {
    const s = setup(refuse());
    await s.snapshot.load();
    await expect(s.store.createNode(newNode, { report: false })).rejects.toBeInstanceOf(WriteRejectedError);
    await expect(
      s.store.createBit(
        { parentId: NODE, title: "B", description: "", icon: "x", x: 2, y: 2, deadline: null, deadlineAllDay: false, priority: null },
        { report: false },
      ),
    ).rejects.toBeInstanceOf(WriteRejectedError);
    expect(s.reportFailure).not.toHaveBeenCalled();
  });
});

describe("an unknown outcome reports only when the refetch rolled the change back", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  async function unknown(answerRows: (s: ReturnType<typeof setup>) => void, run: (s: ReturnType<typeof setup>) => Promise<unknown>) {
    const s = setup(() => new Promise<RpcResult>(() => undefined));
    await s.snapshot.load();
    answerRows(s);
    const settled = run(s).then(
      () => null,
      (error: unknown) => error,
    );
    await vi.advanceTimersByTimeAsync(1_000);
    return { s, error: await settled };
  }

  it("reports when the server row does not carry the change", async () => {
    const { s, error } = await unknown(() => undefined, (x) => x.store.updateBit(BIT, { x: 6 }));
    expect(error).toBeInstanceOf(WriteOutcomeUnknownError);
    expect((error as WriteOutcomeUnknownError).kept).toBe(false);
    expect(s.reportFailure).toHaveBeenCalledTimes(1);
    expect(s.reportFailure).toHaveBeenCalledWith({ kind: "move", title: "Bit B" });
  });

  it("reports nothing when the server row carries the change", async () => {
    const { s, error } = await unknown(
      (x) => x.fetchSnapshot.mockImplementation(async () => x.rows(6)),
      (x) => x.store.updateBit(BIT, { x: 6 }),
    );
    expect((error as WriteOutcomeUnknownError).kept).toBe(true);
    expect(s.reportFailure).not.toHaveBeenCalled();
  });

  it("a created row that the refetch has is kept", async () => {
    const { s, error } = await unknown(
      (x) =>
        x.fetchSnapshot.mockImplementation(async () => {
          const rows = x.rows();
          const id = (x.rpc.mock.calls[0]?.[1] as { p_id: string }).p_id;
          return { ...rows, nodes: [...rows.nodes, nodeToRow({ ...baseEntities.node, id, title: "New node" }, USER)] };
        }),
      (x) => x.store.createNode(newNode),
    );
    expect((error as WriteOutcomeUnknownError).kept).toBe(true);
    expect(s.reportFailure).not.toHaveBeenCalled();
  });

  it("a trashed row that the refetch no longer lists as active is kept", async () => {
    const { s, error } = await unknown(
      (x) =>
        x.fetchSnapshot.mockImplementation(async () => {
          const rows = x.rows();
          return { ...rows, bits: [{ ...rows.bits[0], deleted_at: 5 }] };
        }),
      (x) => x.store.softDeleteBit(BIT),
    );
    expect((error as WriteOutcomeUnknownError).kept).toBe(true);
    expect(s.reportFailure).not.toHaveBeenCalled();
  });

  it("says nothing when the refetch failed", async () => {
    const { s, error } = await unknown(
      (x) => x.fetchSnapshot.mockImplementation(async () => Promise.reject(new Error("offline"))),
      (x) => x.store.updateBit(BIT, { x: 6 }),
    );
    expect((error as WriteOutcomeUnknownError).kept).toBeNull();
    expect(s.reportFailure).not.toHaveBeenCalled();
  });
});

describe("kept or rolled back is read from the server base, not the view", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("a later pending write that shows the same value does not make a rolled-back change look kept", async () => {
    // The first move (x 6) times out and the server did not keep it; a second move to x 6 is still
    // pending when the refetch answers, so the view shows x 6 but the base still has the old x.
    const s = setup(() => new Promise<RpcResult>(() => undefined));
    await s.snapshot.load();
    const first = s.store.updateBit(BIT, { x: 6 }).then(
      () => null,
      (error: unknown) => error,
    );
    await vi.advanceTimersByTimeAsync(0);
    void s.store.updateBit(BIT, { x: 6 }).catch(() => undefined);
    await vi.advanceTimersByTimeAsync(1_000);

    const error = await first;
    expect((error as WriteOutcomeUnknownError).kept).toBe(false);
    expect(s.reportFailure).toHaveBeenCalledTimes(1);
  });
});
