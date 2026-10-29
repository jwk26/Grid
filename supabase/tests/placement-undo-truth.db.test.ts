import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { baseEntities } from "@/lib/db/boundary-cases";
import { scratchBreakdownToRow } from "@/lib/db/row-mapping";
import { SnapshotStore } from "@/lib/db/snapshot-store";
import { fetchSnapshotValue } from "@/lib/db/supabase-calls";
import type { GriddoSupabaseClient } from "@/lib/db/supabase-client";
import { createSupabaseStore } from "@/lib/db/supabase-store";
import { insertRow } from "./helpers/db";
import { addBit, addChunk, addNode, committed } from "./helpers/lifecycle";
import { signedInClient } from "./helpers/users";

// The snapshot verdict of getPlacementUndoTruth against the real reconcile_undo_* functions
// (Task 228): for every state a placed result can be in, the two give the same status.

type World = Awaited<ReturnType<typeof world>>;

async function world() {
  const t = await committed("undo-truth");
  const inbox = await t.node({ systemRole: "inbox", x: 8, y: 8 });
  const target = await t.node({ title: "Target", x: 1, y: 0 });
  const client = (await signedInClient(t.u)) as unknown as GriddoSupabaseClient;
  const snapshot = new SnapshotStore({ fetchSnapshot: () => fetchSnapshotValue(client) });
  const store = createSupabaseStore(snapshot, () => client);
  return { t, inbox, target, snapshot, store, next: 0 };
}

let w: World;
beforeAll(async () => {
  w = await world();
});

// One placed result per case, each in its own cell, with the Undo input the placement returned.
async function placed(type: "bit" | "node") {
  const slot = w.next++;
  const scratch = await addBit(w.t.owner, w.t.u.id, { parentId: w.inbox, title: "Scratch", x: slot % 18, y: Math.floor(slot / 18), version: 5 });
  const source = randomUUID();
  await insertRow(
    w.t.owner,
    "scratch_breakdowns",
    scratchBreakdownToRow({ ...baseEntities.scratchBreakdown, id: source, scratchBitId: scratch, content: "Idea", order: 0 }, w.t.u.id),
  );
  await w.snapshot.refetch();
  const outcome = await w.store.placeDirectBreakdown({
    operationId: randomUUID(),
    resultId: randomUUID(),
    scratchBitId: scratch,
    sourceBreakdownId: source,
    sourceExpectedVersion: 1,
    resultType: type,
    title: "Idea",
    targetParentId: type === "bit" ? w.target : null,
    expectedAncestorIds: type === "bit" ? [w.target] : [],
    x: slot % 18,
    y: 3 + Math.floor(slot / 18),
  });
  expect(outcome, JSON.stringify(outcome)).toMatchObject({ status: "applied" });
  return {
    scratch,
    resultId: outcome.result!.id,
    undo: { operationId: randomUUID(), resultSnapshot: outcome.result!, sourceSnapshot: outcome.source! },
  };
}

type Placed = Awaited<ReturnType<typeof placed>>;

const cases: Array<[string, "bit" | "node", (p: Placed) => Promise<void>]> = [
  ["untouched Bit", "bit", async () => {}],
  ["untouched Node", "node", async () => {}],
  ["a Chunk under the Bit", "bit", async (p) => void (await addChunk(w.t.owner, w.t.u.id, { parentId: p.resultId }))],
  ["a child Node under the Node", "node", async (p) => void (await addNode(w.t.owner, w.t.u.id, { parentId: p.resultId, level: 1 }))],
  ["a trashed child Node under the Node", "node", async (p) => void (await addNode(w.t.owner, w.t.u.id, { parentId: p.resultId, level: 1, deletedAt: 9 }))],
  ["a child Bit under the Node", "node", async (p) => void (await addBit(w.t.owner, w.t.u.id, { parentId: p.resultId }))],
  ["the result edited", "bit", async (p) => void (await w.t.owner.query("update app.bits set title = 'Edited' where id = $1", [p.resultId]))],
  ["the owning Scratch trashed", "bit", async (p) => void (await w.t.owner.query("update app.bits set deleted_at = 9 where id = $1", [p.scratch]))],
  ["the owning Scratch archived", "bit", async (p) => void (await w.t.owner.query("update app.bits set archived_at = 9 where id = $1", [p.scratch]))],
  ["the Undo already applied", "bit", async (p) => void (await w.store.undoDirectPlacement(p.undo))],
];

describe("getPlacementUndoTruth matches the reconcile_undo_* functions", () => {
  it.each(cases)("%s", async (_label, type, mutate) => {
    const p = await placed(type);
    await mutate(p);
    await w.snapshot.refetch();
    const local = await w.store.getPlacementUndoTruth(p.undo);
    const server = await w.store.reconcileDirectPlacementUndo(p.undo);
    expect(local.status).toBe(server.status);
  });

  it("covers every status the functions can answer for a direct placement", async () => {
    const seen = new Set<string>();
    for (const [, type, mutate] of cases) {
      const p = await placed(type);
      await mutate(p);
      await w.snapshot.refetch();
      seen.add((await w.store.getPlacementUndoTruth(p.undo)).status);
    }
    expect([...seen].sort()).toEqual(["already_applied", "conflict", "not_applied", "rejected"]);
  });
});
