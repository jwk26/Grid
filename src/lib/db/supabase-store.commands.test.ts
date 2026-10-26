import { describe, expect, it, vi } from "vitest";
import { baseEntities } from "@/lib/db/boundary-cases";
import { bitToRow, nodeToRow, scratchBreakdownToRow, stagedCandidateToRow } from "@/lib/db/row-mapping";
import { SnapshotStore, type Envelope } from "@/lib/db/snapshot-store";
import type { GriddoSupabaseClient } from "@/lib/db/supabase-client";
import { createSupabaseStore } from "@/lib/db/supabase-store";
import { WriteOutcomeUnknownError } from "@/lib/db/write-errors";

// The Inbox/Triage commands against a fake client (Task 227 Stage 3): the request each command
// sends, the rejection reason that reaches the result, and what an error or an unknown outcome
// does. The real functions are covered by supabase/tests/supabase-store-commands.db.test.ts.

const USER = "00000000-0000-4000-8000-0000000000aa";
const id = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
const [OP, SCRATCH, SOURCE, CANDIDATE, RESULT, TARGET] = [id(1), id(2), id(3), id(4), id(5), id(6)];

type RpcResult = { data: unknown; error: { message: string } | null; status: number };
const ok = (envelope: Partial<Envelope> & { status: Envelope["status"] }): RpcResult => ({
  data: { result: null, changes: {}, ...envelope },
  error: null,
  status: 200,
});

function setup(answer: (name: string, args: Record<string, unknown>) => RpcResult) {
  const rpc = vi.fn((name: string, args: Record<string, unknown>) => Promise.resolve(answer(name, args)));
  const client = { rpc } as unknown as GriddoSupabaseClient;
  const scratch = { ...baseEntities.bit, id: SCRATCH, version: 5 };
  const snapshot = new SnapshotStore({
    fetchSnapshot: async () => ({
      nodes: [],
      bits: [bitToRow(scratch as never, USER)],
      chunks: [],
      scratch_breakdowns: [],
      staged_candidates: [],
    }),
    requestTimeoutMs: 1_000,
  });
  return { rpc, snapshot, store: createSupabaseStore(snapshot, () => client) };
}

const addCommand = { operationId: OP, breakdownId: SOURCE, scratchBitId: SCRATCH, scratchExpectedVersion: 5, content: "Idea" };
const placement = {
  operationId: OP, resultId: RESULT, scratchBitId: SCRATCH, sourceBreakdownId: SOURCE, sourceExpectedVersion: 3,
  resultType: "bit" as const, title: "Idea", targetParentId: TARGET, expectedAncestorIds: [TARGET], x: 2, y: 3,
};

describe("the request each command sends", () => {
  it("Add sends the snake_case arguments, with no operation id", async () => {
    const { rpc, store } = setup(() => ok({ status: "applied", result: { id: SOURCE } }));
    await store.addBreakdown(addCommand);
    expect(rpc.mock.calls).toEqual([
      ["add_breakdown", { p_breakdown_id: SOURCE, p_content: "Idea", p_scratch_expected_version: 5, p_scratch_id: SCRATCH }],
    ]);
  });

  it("a staged placement sends the candidate, a direct one does not", async () => {
    const { rpc, store } = setup(() => ok({ status: "not_applied" }));
    await store.reconcileStagedPlacement({ ...placement, candidateId: CANDIDATE, candidateExpectedVersion: 2 });
    await store.reconcileDirectPlacement(placement);
    const [staged, direct] = rpc.mock.calls;
    expect(staged[0]).toBe("reconcile_place_staged_candidate");
    expect(staged[1]).toMatchObject({ p_candidate_id: CANDIDATE, p_candidate_expected_version: 2, p_expected_ancestor_ids: [TARGET], p_target_parent_id: TARGET, p_result_type: "bit" });
    expect(direct[0]).toBe("reconcile_place_direct_breakdown");
    expect(direct[1]).not.toHaveProperty("p_candidate_id");
  });

  it("Trash sends the confirmed set as snake_case objects", async () => {
    const { rpc, store } = setup(() => ok({ status: "applied", result: { id: SCRATCH } }));
    await store.trashScratch({
      operationId: OP, scratchBitId: SCRATCH, expectedVersion: 5,
      candidates: [{ candidateId: CANDIDATE, candidateExpectedVersion: 2, sourceBreakdownId: SOURCE, sourceExpectedVersion: 3 }],
    });
    expect(rpc.mock.calls[0]).toEqual([
      "trash_scratch",
      {
        p_scratch_id: SCRATCH, p_expected_version: 5,
        p_candidates: [{ candidate_id: CANDIDATE, candidate_expected_version: 2, source_breakdown_id: SOURCE, source_expected_version: 3 }],
      },
    ]);
  });

  it("Undo sends snake_case rows without user_id; a Node result is told by its level key", async () => {
    const { rpc, store } = setup(() => ok({ status: "applied" }));
    const source = { ...baseEntities.scratchBreakdown, id: SOURCE, scratchBitId: SCRATCH };
    const candidate = { ...baseEntities.stagedCandidate, id: CANDIDATE, scratchBitId: SCRATCH, sourceBreakdownId: SOURCE };
    await store.undoStagedPlacement({
      operationId: OP,
      resultSnapshot: { ...baseEntities.node, id: RESULT },
      sourceSnapshot: source,
      candidateSnapshot: candidate,
    });
    await store.undoDirectPlacement({
      operationId: OP,
      resultSnapshot: { ...baseEntities.bit, id: RESULT },
      sourceSnapshot: source,
    });
    const [staged, direct] = rpc.mock.calls;
    expect(staged[0]).toBe("undo_staged_placement");
    expect(staged[1].p_result).toEqual(expect.objectContaining({ id: RESULT, level: 0 }));
    expect(staged[1].p_result).not.toHaveProperty("user_id");
    expect(staged[1].p_source).toEqual({ ...scratchBreakdownToRow(source, USER), user_id: undefined });
    expect(staged[1].p_candidate).toEqual({ ...stagedCandidateToRow(candidate, USER), user_id: undefined });
    expect(staged[1].p_source).not.toHaveProperty("user_id");
    expect(staged[1].p_candidate).not.toHaveProperty("user_id");
    expect(direct[1].p_result).not.toHaveProperty("level");
    expect(direct[1]).not.toHaveProperty("p_candidate");
    void nodeToRow;
  });

  it("the recovery classification sends the client's startedAt", async () => {
    const { rpc, store } = setup(() => ok({ status: "applied" }));
    await store.classifyArchiveScratchRecovery({ operationId: OP, kind: "archive_scratch", scratchBitId: SCRATCH, expectedVersion: 5, startedAt: 1234 });
    expect(rpc.mock.calls[0]).toEqual([
      "classify_archive_scratch_recovery",
      { p_scratch_id: SCRATCH, p_expected_version: 5, p_started_at: 1234 },
    ]);
  });
});

describe("rejections", () => {
  it("an account_limit rejection reaches Add and placement results with its table and limit", async () => {
    const limit = { code: "account_limit", table: "bits", limit: 300 };
    const { store } = setup(() => ok({ status: "rejected", rejection: limit }));
    expect(await store.addBreakdown(addCommand)).toMatchObject({ status: "rejected", rejection: limit });
    expect(await store.placeDirectBreakdown(placement)).toMatchObject({ status: "rejected", rejection: limit });
    expect(await store.placeStagedCandidate({ ...placement, candidateId: CANDIDATE, candidateExpectedVersion: 2 })).toMatchObject({
      status: "rejected",
      rejection: limit,
    });
  });

  it("a rejection is a result, not a throw", async () => {
    const { store } = setup(() => ok({ status: "rejected", rejection: { code: "invalid_target" } }));
    await expect(store.archiveScratch({ operationId: OP, scratchBitId: SCRATCH, expectedVersion: 5, callerAssertion: { addDraftClear: true, titleBlockerClear: true } })).resolves.toMatchObject({ status: "rejected" });
  });

  it("the result carries the current Scratch from the envelope's changes", async () => {
    const changed = bitToRow({ ...baseEntities.bit, id: SCRATCH, version: 9 } as never, USER);
    const { store, snapshot } = setup(() =>
      ok({ status: "conflict", changes: { bits: { upserted: [changed], deleted: [] } } }),
    );
    await snapshot.load();
    const result = await store.addBreakdown(addCommand);
    expect(result).toMatchObject({ operationId: OP, status: "conflict", breakdown: null, scratch: { id: SCRATCH, version: 9 } });
  });
});

describe("an error or an unknown outcome", () => {
  const commands = (store: ReturnType<typeof setup>["store"]) => [
    () => store.addBreakdown(addCommand),
    () => store.reconcileAddBreakdown(addCommand),
    () => store.placeDirectBreakdown(placement),
    () => store.reconcileDirectPlacement(placement),
    () => store.trashScratch({ operationId: OP, scratchBitId: SCRATCH, expectedVersion: 5, candidates: [] }),
  ];

  it("a failed call throws and is sent once", async () => {
    for (const run of commands(setup(() => ({ data: null, error: { message: "boom" }, status: 500 })).store)) {
      await expect(run()).rejects.toThrow(/boom/);
    }
    const { rpc, store } = setup(() => ({ data: null, error: { message: "22023" }, status: 400 }));
    await expect(store.addBreakdown(addCommand)).rejects.toThrow();
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("no response throws an unknown outcome, so the hook marks the operation unknown and reconciles", async () => {
    const { rpc, store } = setup(() => ({ data: null, error: { message: "Failed to fetch" }, status: 0 }));
    for (const run of commands(store)) await expect(run()).rejects.toBeInstanceOf(WriteOutcomeUnknownError);
    expect(rpc).toHaveBeenCalledTimes(commands(store).length);
  });

  it("the recovery classification answers `unknown` instead of throwing", async () => {
    const { store } = setup(() => ({ data: null, error: { message: "Failed to fetch" }, status: 0 }));
    const recovery = { operationId: OP, kind: "archive_scratch" as const, scratchBitId: SCRATCH, expectedVersion: 5, startedAt: 1 };
    expect(await store.classifyArchiveScratchRecovery(recovery)).toEqual({ operationId: OP, outcome: "unknown" });
    const failing = setup(() => ({ data: null, error: { message: "boom" }, status: 500 }));
    expect(await failing.store.classifyArchiveScratchRecovery(recovery)).toEqual({ operationId: OP, outcome: "unknown" });
  });
});
