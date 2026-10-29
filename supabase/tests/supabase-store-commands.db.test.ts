import { randomUUID } from "node:crypto";
import type { Client } from "pg";
import { beforeAll, describe, expect, it } from "vitest";
import { baseEntities } from "@/lib/db/boundary-cases";
import { scratchBreakdownToRow } from "@/lib/db/row-mapping";
import { SnapshotStore } from "@/lib/db/snapshot-store";
import { fetchSnapshotValue } from "@/lib/db/supabase-calls";
import type { GriddoSupabaseClient } from "@/lib/db/supabase-client";
import { createSupabaseStore } from "@/lib/db/supabase-store";
import { WriteOutcomeUnknownError } from "@/lib/db/write-errors";
import { insertRow } from "./helpers/db";
import { addBit, committed } from "./helpers/lifecycle";
import { signedInClient } from "./helpers/users";

// The Inbox/Triage commands of the Supabase store against the real functions (Task 227 Stage 3):
// each command and each reconcile is one request, results are built from the envelope's changes
// and the snapshot, an unknown outcome throws and is never resent, and the reconcile after a
// forced timeout answers `already_applied`.

type World = Awaited<ReturnType<typeof world>>;

async function world(requestTimeoutMs = 15_000) {
  const t = await committed("cmds");
  const inbox = await t.node({ systemRole: "inbox", x: 8, y: 8 });
  const target = await t.node({ title: "Target", x: 1, y: 0 });
  const calls: string[] = [];
  const raw = await signedInClient(t.u);
  const original = raw.rpc.bind(raw);
  (raw as unknown as { rpc: unknown }).rpc = (name: string, args?: object) => {
    calls.push(name);
    return original(name as never, args as never);
  };
  const client = raw as unknown as GriddoSupabaseClient;
  const snapshot = new SnapshotStore({ fetchSnapshot: () => fetchSnapshotValue(client), requestTimeoutMs });
  const store = createSupabaseStore(snapshot, () => client);
  const scratch = async (title = "Scratch") =>
    addBit(t.owner, t.u.id, { parentId: inbox, title, x: 0, y: 0, version: 5 });
  const source = async (scratchId: string, content = "Idea", order = 0) => {
    const id = randomUUID();
    await insertRow(
      t.owner,
      "scratch_breakdowns",
      scratchBreakdownToRow({ ...baseEntities.scratchBreakdown, id, scratchBitId: scratchId, content, order }, t.u.id),
    );
    return id;
  };
  return { t, inbox, target, calls, snapshot, store, scratch, source, owner: t.owner as Client };
}

const view = (w: World) => w.snapshot.getState().view;
const version = (w: World, table: "bits" | "scratchBreakdowns" | "stagedCandidates", id: string) =>
  (view(w)[table].get(id) as { version: number }).version;

// `name` is the one request; an already_applied placement or Undo carries no deleted id, so its
// answer is followed by a refetch (`name` then `get_snapshot`).
async function oneCall<T>(w: World, name: string | string[], action: () => Promise<T>): Promise<T> {
  w.calls.length = 0;
  const result = await action();
  expect(w.calls).toEqual(Array.isArray(name) ? name : [name]);
  return result;
}

let w: World;
beforeAll(async () => {
  w = await world();
  await w.snapshot.load();
});

describe("Breakdown and Scratch title commands", () => {
  it("Add, Save title, Save and Delete are one request each and reconcile to already_applied", async () => {
    const scratchId = await w.scratch();
    await w.snapshot.refetch();
    const operationId = randomUUID();
    const breakdownId = randomUUID();
    const add = { operationId, breakdownId, scratchBitId: scratchId, scratchExpectedVersion: 5, content: "First" };
    const added = await oneCall(w, "add_breakdown", () => w.store.addBreakdown(add));
    expect(added).toMatchObject({ operationId, status: "applied", breakdown: { id: breakdownId, content: "First", version: 1 }, scratch: { id: scratchId, version: 6 } });
    const again = await oneCall(w, "reconcile_add_breakdown", () => w.store.reconcileAddBreakdown(add));
    expect(again.status).toBe("already_applied");

    const title = { operationId: randomUUID(), scratchBitId: scratchId, expectedVersion: 6, baseTitle: "Scratch", title: "Renamed" };
    const titled = await oneCall(w, "save_scratch_title", () => w.store.saveScratchTitle(title));
    expect(titled).toMatchObject({ status: "applied", scratch: { title: "Renamed", version: 7 } });
    expect((await oneCall(w, "reconcile_save_scratch_title", () => w.store.reconcileSaveScratchTitle(title))).status).toBe("already_applied");

    const save = { operationId: randomUUID(), breakdownId, expectedVersion: 1, baseContent: "First", baseOrder: 0, content: "Second", order: 0 };
    const saved = await oneCall(w, "save_breakdown", () => w.store.saveBreakdown(save));
    expect(saved).toMatchObject({ status: "applied", breakdown: { content: "Second", version: 2 }, candidate: null });
    expect((await oneCall(w, "reconcile_save_breakdown", () => w.store.reconcileSaveBreakdown(save))).status).toBe("already_applied");

    const del = { operationId: randomUUID(), breakdownId, expectedVersion: 2, scratchBitId: scratchId, scratchExpectedVersion: 7 };
    const deleted = await oneCall(w, "delete_breakdown", () => w.store.deleteBreakdown(del));
    expect(deleted).toMatchObject({ status: "applied", breakdown: null, candidate: null, scratch: { version: 8 } });
    // An already_applied Delete carries no deleted id: the store refetches before it answers.
    w.calls.length = 0;
    const replay = await w.store.reconcileDeleteBreakdown(del);
    expect(replay).toMatchObject({ status: "already_applied", breakdown: null });
    expect(w.calls).toEqual(["reconcile_delete_breakdown", "get_snapshot"]);
  });

  it("a stale version is a conflict result, not a throw, and brings the current rows", async () => {
    const scratchId = await w.scratch("Stale");
    await w.snapshot.refetch();
    const result = await oneCall(w, "add_breakdown", () =>
      w.store.addBreakdown({ operationId: randomUUID(), breakdownId: randomUUID(), scratchBitId: scratchId, scratchExpectedVersion: 1, content: "x" }),
    );
    expect(result).toMatchObject({ status: "conflict", breakdown: null, scratch: { id: scratchId, version: 5 } });
  });
});

describe("Stage, Unstage, placement, Undo, Archive and Trash", () => {
  it("runs a staged placement and its Undo, then a direct placement, Archive and its recovery", async () => {
    const scratchId = await w.scratch("Flow");
    const sourceId = await w.source(scratchId, "Do it");
    await w.snapshot.refetch();

    const candidateId = randomUUID();
    const stage = { operationId: randomUUID(), candidateId, scratchBitId: scratchId, sourceBreakdownId: sourceId, sourceExpectedVersion: 1, resultType: "bit" as const };
    const staged = await oneCall(w, "stage_candidate", () => w.store.stageCandidate(stage));
    expect(staged).toMatchObject({ status: "applied", candidate: { id: candidateId, version: 1 }, source: { id: sourceId }, scratch: { id: scratchId } });
    expect((await oneCall(w, "reconcile_stage_candidate", () => w.store.reconcileStageCandidate(stage))).status).toBe("already_applied");

    const unstage = { operationId: randomUUID(), candidateId, candidateExpectedVersion: 1, sourceBreakdownId: sourceId, sourceExpectedVersion: version(w, "scratchBreakdowns", sourceId) };
    const unstaged = await oneCall(w, "unstage_candidate", () => w.store.unstageCandidate(unstage));
    expect(unstaged).toMatchObject({ status: "applied", candidate: null, source: { id: sourceId } });
    w.calls.length = 0;
    expect((await w.store.reconcileUnstageCandidate(unstage)).status).toBe("already_applied");
    expect(w.calls).toEqual(["reconcile_unstage_candidate", "get_snapshot"]);

    const restage = { ...stage, operationId: randomUUID(), candidateId: randomUUID(), sourceExpectedVersion: version(w, "scratchBreakdowns", sourceId) };
    await w.store.stageCandidate(restage);
    const beforePlacement = view(w).stagedCandidates.get(restage.candidateId)!;
    const placeCommand = {
      operationId: randomUUID(),
      resultId: randomUUID(),
      scratchBitId: scratchId,
      sourceBreakdownId: sourceId,
      sourceExpectedVersion: version(w, "scratchBreakdowns", sourceId),
      resultType: "bit" as const,
      title: "Do it",
      targetParentId: w.target,
      expectedAncestorIds: [w.target],
      x: 2,
      y: 3,
      candidateId: restage.candidateId,
      candidateExpectedVersion: 1,
    };
    const placed = await oneCall(w, "place_staged_candidate", () => w.store.placeStagedCandidate(placeCommand));
    expect(placed).toMatchObject({ status: "applied", result: { id: placeCommand.resultId, parentId: w.target }, source: { consumedAt: expect.any(Number) }, candidate: null });
    expect((await oneCall(w, ["reconcile_place_staged_candidate", "get_snapshot"], () => w.store.reconcileStagedPlacement(placeCommand))).status).toBe("already_applied");

    // The Undo input is the candidate as it was before the placement removed it.
    const candidateBefore = beforePlacement;
    const undoStaged = {
      operationId: randomUUID(),
      resultSnapshot: placed.result!,
      sourceSnapshot: placed.source!,
      candidateSnapshot: candidateBefore,
    };
    const undone = await oneCall(w, "undo_staged_placement", () => w.store.undoStagedPlacement(undoStaged));
    expect(undone.status).toBe("applied");
    expect(view(w).bits.has(placeCommand.resultId)).toBe(false);
    expect(view(w).stagedCandidates.get(restage.candidateId)).toMatchObject({ lifecycle: "staged" });
    expect((await oneCall(w, ["reconcile_undo_staged_placement", "get_snapshot"], () => w.store.reconcileStagedPlacementUndo(undoStaged))).status).toBe("already_applied");

    // The same for a direct row: place it, then Undo with the row as placed.
    const directSource = await w.source(scratchId, "Direct", 1);
    await w.snapshot.refetch();
    const direct = {
      operationId: randomUUID(),
      resultId: randomUUID(),
      scratchBitId: scratchId,
      sourceBreakdownId: directSource,
      sourceExpectedVersion: 1,
      resultType: "node" as const,
      title: "Direct",
      targetParentId: null,
      expectedAncestorIds: [],
      x: 6,
      y: 6,
    };
    const directPlaced = await w.store.placeDirectBreakdown(direct);
    expect(directPlaced.status).toBe("applied");
    const undoDirect = { operationId: randomUUID(), resultSnapshot: directPlaced.result!, sourceSnapshot: directPlaced.source! };
    expect((await oneCall(w, "undo_direct_placement", () => w.store.undoDirectPlacement(undoDirect))).status).toBe("applied");
    expect((await oneCall(w, ["reconcile_undo_direct_placement", "get_snapshot"], () => w.store.reconcileDirectPlacementUndo(undoDirect))).status).toBe("already_applied");
  });

  it("Archive and its recovery classification", async () => {
    const scratchId = await w.scratch("Done");
    const sourceId = await w.source(scratchId, "Only");
    await w.snapshot.refetch();
    const placeDirect = {
      operationId: randomUUID(),
      resultId: randomUUID(),
      scratchBitId: scratchId,
      sourceBreakdownId: sourceId,
      sourceExpectedVersion: 1,
      resultType: "bit" as const,
      title: "Only",
      targetParentId: w.target,
      expectedAncestorIds: [w.target],
      x: 4,
      y: 4,
    };
    const placed = await oneCall(w, "place_direct_breakdown", () => w.store.placeDirectBreakdown(placeDirect));
    expect(placed).toMatchObject({ status: "applied", candidate: null });
    expect((await oneCall(w, ["reconcile_place_direct_breakdown", "get_snapshot"], () => w.store.reconcileDirectPlacement(placeDirect))).status).toBe("already_applied");

    const startedAt = Date.now() - 1_000;
    const archive = {
      operationId: randomUUID(),
      scratchBitId: scratchId,
      expectedVersion: 5,
      callerAssertion: { addDraftClear: true, titleBlockerClear: true } as const,
    };
    const archived = await oneCall(w, "archive_scratch", () => w.store.archiveScratch(archive));
    expect(archived).toMatchObject({ status: "applied", scratch: { archivedAt: expect.any(Number), version: 6 } });
    const recovery = await oneCall(w, "classify_archive_scratch_recovery", () =>
      w.store.classifyArchiveScratchRecovery({ operationId: archive.operationId, kind: "archive_scratch", scratchBitId: scratchId, expectedVersion: 5, startedAt }),
    );
    expect(recovery).toMatchObject({ status: "applied" });
  });

  it("Trash removes the confirmed candidates and reconciles to already_applied", async () => {
    const scratchId = await w.scratch("Trashable");
    const sourceId = await w.source(scratchId, "Staged");
    await w.snapshot.refetch();
    const candidateId = randomUUID();
    await w.store.stageCandidate({ operationId: randomUUID(), candidateId, scratchBitId: scratchId, sourceBreakdownId: sourceId, sourceExpectedVersion: 1, resultType: "node" });
    const trash = {
      operationId: randomUUID(),
      scratchBitId: scratchId,
      expectedVersion: 5,
      candidates: [{ candidateId, candidateExpectedVersion: 1, sourceBreakdownId: sourceId, sourceExpectedVersion: version(w, "scratchBreakdowns", sourceId) }],
    };
    const trashed = await oneCall(w, "trash_scratch", () => w.store.trashScratch(trash));
    expect(trashed).toMatchObject({ status: "applied", scratch: { deletedAt: expect.any(Number), version: 6 }, candidates: [] });
    expect(view(w).stagedCandidates.has(candidateId)).toBe(false);
    w.calls.length = 0;
    const again = await w.store.reconcileTrashScratch(trash);
    expect(again).toMatchObject({ status: "already_applied", candidates: [] });
    expect(w.calls).toEqual(["reconcile_trash_scratch", "get_snapshot"]);
  });
});

describe("an unknown outcome", () => {
  it("throws, is never resent, and the reconcile after the lock is released says already_applied", async () => {
    const fast = await world(300);
    await fast.snapshot.load();
    const scratchId = await fast.scratch("Slow");
    await fast.snapshot.refetch();

    // A second connection holds the Scratch row, so the call waits on the lock past the timeout.
    const blocker = (await import("./helpers/db")).connect;
    const lock: Client = await blocker();
    await lock.query("begin");
    await lock.query("select 1 from app.bits where id = $1 for update", [scratchId]);
    const add = { operationId: randomUUID(), breakdownId: randomUUID(), scratchBitId: scratchId, scratchExpectedVersion: 5, content: "Late" };
    fast.calls.length = 0;
    await expect(fast.store.addBreakdown(add)).rejects.toBeInstanceOf(WriteOutcomeUnknownError);
    await lock.query("commit");
    await lock.end();

    // The call commits once the lock is gone; the command itself was sent exactly once.
    for (let i = 0; i < 50; i += 1) {
      const { rows } = await fast.owner.query("select 1 from app.scratch_breakdowns where id = $1", [add.breakdownId]);
      if (rows.length > 0) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    expect(fast.calls.filter((name) => name === "add_breakdown")).toHaveLength(1);
    const reconciled = await fast.store.reconcileAddBreakdown(add);
    expect(reconciled).toMatchObject({ status: "already_applied", breakdown: { id: add.breakdownId } });
  });
});

describe("commands that send nothing", () => {
  it("the confirmed-orphan pair is rejected with no request, the zone migration does nothing, the test-only writes are not supported", async () => {
    w.calls.length = 0;
    const orphan = {
      operationId: randomUUID(), auditEventId: randomUUID(), candidateId: randomUUID(), candidateExpectedVersion: 1,
      sourceBreakdownId: randomUUID(), scratchBitId: randomUUID(), resultType: "bit" as const,
      proof: { status: "confirmed" as const, cause: "source_deleted" as const, sourceBreakdownId: randomUUID() },
    };
    expect(await w.store.cleanupConfirmedCandidateOrphan(orphan)).toMatchObject({ status: "rejected", candidate: null, source: null, auditEvent: null });
    expect(await w.store.reconcileConfirmedCandidateOrphanCleanup(orphan)).toMatchObject({ status: "rejected" });
    expect(await w.store.runBreadcrumbZoneMigration(null, new Set(["0,0"]))).toEqual({ relocated: 0 });
    await expect(w.store.deleteScratchBreakdown(randomUUID())).rejects.toThrow("not supported");
    expect(w.calls).toEqual([]);
  });
});
