import { describe, expect, it, vi } from "vitest";
import { baseEntities } from "@/lib/db/boundary-cases";
import type { DirectPlacementUndoCommand, StagedPlacementUndoCommand } from "@/lib/db/datastore";
import {
  bitToRow,
  chunkToRow,
  nodeToRow,
  scratchBreakdownToRow,
  stagedCandidateToRow,
} from "@/lib/db/row-mapping";
import type { Bit, Chunk, Node, ScratchBreakdown, StagedCandidate } from "@/lib/db/schema";
import { SnapshotStore } from "@/lib/db/snapshot-store";
import type { GriddoSupabaseClient } from "@/lib/db/supabase-client";
import { createSupabaseStore } from "@/lib/db/supabase-store";

// getPlacementUndoTruth judges the Undo from the snapshot and sends no request. The database
// functions' own verdicts are compared in supabase/tests/placement-undo-truth.db.test.ts.

const USER = "00000000-0000-4000-8000-0000000000aa";
const id = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;

const inbox: Node = { ...baseEntities.node, id: id(1), systemRole: "inbox", x: 5, y: 5 };
const target: Node = { ...baseEntities.node, id: id(2), x: 6, y: 5 };
const scratch: Bit = { ...baseEntities.bit, id: id(3), parentId: inbox.id };
const result: Bit = { ...baseEntities.bit, id: id(4), parentId: target.id, createdAt: 5, mtime: 5 };
const consumed: ScratchBreakdown = { ...baseEntities.scratchBreakdown, id: id(5), scratchBitId: scratch.id, consumedAt: 5, version: 3 };
const candidate: StagedCandidate = {
  ...baseEntities.stagedCandidate,
  id: id(6),
  scratchBitId: scratch.id,
  sourceBreakdownId: consumed.id,
  resultType: "bit",
  lifecycle: "staged",
};

type Rows = { nodes: Node[]; bits: Bit[]; chunks: Chunk[]; breakdowns: ScratchBreakdown[]; candidates: StagedCandidate[] };
const initial = (): Rows => ({
  nodes: [inbox, target],
  bits: [scratch, result],
  chunks: [],
  breakdowns: [consumed],
  candidates: [],
});

async function setup(rows: Rows) {
  const rpc = vi.fn();
  const snapshot = new SnapshotStore({
    fetchSnapshot: async () => ({
      nodes: rows.nodes.map((row) => nodeToRow(row, USER)),
      bits: rows.bits.map((row) => bitToRow(row, USER)),
      chunks: rows.chunks.map((row) => chunkToRow(row, USER)),
      scratch_breakdowns: rows.breakdowns.map((row) => scratchBreakdownToRow(row, USER)),
      staged_candidates: rows.candidates.map((row) => stagedCandidateToRow(row, USER)),
    }),
  });
  await snapshot.load();
  const store = createSupabaseStore(snapshot, () => ({ rpc }) as unknown as GriddoSupabaseClient);
  return { store, rpc, snapshot };
}

const direct: DirectPlacementUndoCommand = { operationId: id(9), resultSnapshot: result, sourceSnapshot: consumed };
const staged: StagedPlacementUndoCommand = { ...direct, candidateSnapshot: candidate };
const chunk: Chunk = { ...baseEntities.chunk, id: id(7), parentId: result.id };

describe("SupabaseDataStore.getPlacementUndoTruth", () => {
  it("is not_applied for an untouched direct placement, with no request", async () => {
    const { store, rpc } = await setup(initial());
    await expect(store.getPlacementUndoTruth(direct)).resolves.toMatchObject({
      status: "not_applied",
      result,
      source: consumed,
      candidate: null,
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("judges a staged placement against its candidate", async () => {
    const undone = { ...consumed, consumedAt: null, version: 4 };
    const rows = { ...initial(), bits: [scratch], breakdowns: [undone], candidates: [{ ...candidate, version: baseEntities.stagedCandidate.version + 1 }] };
    const { store, rpc } = await setup(rows);
    await expect(store.getPlacementUndoTruth(staged)).resolves.toMatchObject({ status: "already_applied", result: null });
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["the result edited", "conflict", (rows: Rows) => { rows.bits = [scratch, { ...result, title: "Edited" }]; }],
    ["a child Bit", "conflict", (rows: Rows) => { rows.bits = [...rows.bits, { ...baseEntities.bit, id: id(8), parentId: result.id }]; }],
    ["a child Node", "conflict", (rows: Rows) => { rows.nodes = [...rows.nodes, { ...baseEntities.node, id: id(8), parentId: result.id, level: 1 }]; }],
    ["a trashed child Bit", "conflict", (rows: Rows) => { rows.bits = [...rows.bits, { ...baseEntities.bit, id: id(8), parentId: result.id, deletedAt: 9 }]; }],
    ["a Chunk under the result", "conflict", (rows: Rows) => { rows.chunks = [chunk]; }],
    ["the owning Scratch trashed", "rejected", (rows: Rows) => { rows.bits = [{ ...scratch, deletedAt: 9 }, result]; }],
    ["the owning Scratch archived", "rejected", (rows: Rows) => { rows.bits = [{ ...scratch, archivedAt: 9 }, result]; }],
    ["the source changed", "conflict", (rows: Rows) => { rows.breakdowns = [{ ...consumed, version: 9 }]; }],
  ])("with %s the verdict is %s and no request is sent", async (_label, status, mutate) => {
    const rows = initial();
    mutate(rows);
    const { store, rpc } = await setup(rows);
    await expect(store.getPlacementUndoTruth(direct)).resolves.toMatchObject({ status });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("follows the snapshot: a child makes it a conflict and its removal re-enables it", async () => {
    const withChild = initial();
    withChild.bits = [...withChild.bits, { ...baseEntities.bit, id: id(8), parentId: result.id }];
    const blocked = await setup(withChild);
    const free = await setup(initial());
    expect((await blocked.store.getPlacementUndoTruth(direct)).status).toBe("conflict");
    expect((await free.store.getPlacementUndoTruth(direct)).status).toBe("not_applied");
  });

  it("a live read over it settles: each snapshot change is one read, and nothing is sent back", async () => {
    const { store, rpc, snapshot } = await setup(initial());
    const seen: string[] = [];
    const subscription = store
      .liveRead((current) => current.getPlacementUndoTruth(direct))
      .subscribe({ next: (verdict) => seen.push(verdict.status) });
    await vi.waitFor(() => expect(seen).toHaveLength(1));
    await snapshot.refetch();
    await snapshot.refetch();
    await new Promise((resolve) => setTimeout(resolve, 20));
    subscription.unsubscribe();
    expect(seen).toEqual(["not_applied", "not_applied", "not_applied"]);
    expect(rpc).not.toHaveBeenCalled();
  });
});
