import { randomUUID } from "node:crypto";
import type { Client } from "pg";
import { beforeAll, describe, expect, it } from "vitest";
import { baseEntities } from "@/lib/db/boundary-cases";
import { scratchBreakdownToRow, stagedCandidateToRow } from "@/lib/db/row-mapping";
import type { ScratchBreakdown, StagedCandidate } from "@/lib/db/schema";
import { assertChangeSet, type Envelope as ChangeEnvelope } from "./helpers/change-set";
import { insertRow, withActor } from "./helpers/db";
import { account, addBit, addChunk, addNode, authed, call, sql, stored, type Envelope, type Owner, type Row } from "./helpers/lifecycle";
import { createTestUser, type TestUser } from "./helpers/users";

// The Undo placement commands (Task 223), ported from the Dexie scenarios in triage-undo.test.ts,
// which are the answer key. A placement is made with the real placement function, and the Undo
// takes the rows the placement's `changes` returned.

let user: TestUser;
let stranger: TestUser;

beforeAll(async () => {
  user = await createTestUser("und");
  stranger = await createTestUser("und-other");
});

const A = () => authed(user);

type Place = {
  result: string; scratch: string; source: string; sourceVersion: number; type: string; title: string;
  target: string | null; path: string[]; x: number; y: number; cand: string; candVersion: number;
};
const placeArgs = (p: Place) => [p.result, p.scratch, p.source, p.sourceVersion, p.type, p.title, p.target, p.path, p.x, p.y];
const placeStaged = (db: Client, p: Place) => call(db, "place_staged_candidate", [...placeArgs(p), p.cand, p.candVersion]);
const placeDirect = (db: Client, p: Place) => call(db, "place_direct_breakdown", placeArgs(p));

type Undo = { result: Row; source: Row; candidate?: Row };
const undo = (db: Client, u: Undo) => u.candidate ? call(db, "undo_staged_placement", [u.result, u.source, u.candidate]) : call(db, "undo_direct_placement", [u.result, u.source]);
const reconcileUndo = (db: Client, u: Undo) => u.candidate ? call(db, "reconcile_undo_staged_placement", [u.result, u.source, u.candidate]) : call(db, "reconcile_undo_direct_placement", [u.result, u.source]);

const sourceRow = async (db: Client, id: string): Promise<Row | undefined> =>
  (await db.query("select to_jsonb(r.*) as r from app.scratch_breakdowns r where id = $1", [id])).rows[0]?.r;
const candidateRow = async (db: Client, id: string): Promise<Row | undefined> =>
  (await db.query("select to_jsonb(r.*) as r from app.staged_candidates r where id = $1", [id])).rows[0]?.r;
const counts = async (db: Client) =>
  (await db.query(
    `select (select count(*) from app.nodes) n, (select count(*) from app.bits) b, (select count(*) from app.chunks) h,
            (select count(*) from app.scratch_breakdowns) s, (select count(*) from app.staged_candidates) c`,
  )).rows[0];

async function setup(db: Client, owner: Owner, o: { type?: string; content?: string; staged?: boolean } = {}, u = user) {
  return owner(async () => {
    await account(db, u.id);
    const inbox = await addNode(db, u.id, { systemRole: "inbox", x: 8, y: 8, version: 3, mtime: 7 });
    const scratch = await addBit(db, u.id, { parentId: inbox, title: "Scratch", x: 0, y: 0, version: 5, mtime: 7 });
    const target = await addNode(db, u.id, { title: "Target", x: 1, y: 0, level: 0, mtime: 100 });
    const src = randomUUID();
    await insertRow(db, "scratch_breakdowns", scratchBreakdownToRow({ ...baseEntities.scratchBreakdown, id: src, scratchBitId: scratch, content: o.content ?? "Idea", version: 3 } as ScratchBreakdown, u.id));
    const cand = randomUUID();
    if (o.staged !== false) {
      await insertRow(db, "staged_candidates", stagedCandidateToRow({ ...baseEntities.stagedCandidate, id: cand, scratchBitId: scratch, sourceBreakdownId: src, resultType: (o.type ?? "bit") as "node" | "bit", version: 2 } as StagedCandidate, u.id));
    }
    const type = o.type ?? "bit";
    const place: Place = {
      result: randomUUID(), scratch, source: src, sourceVersion: 3, type, title: o.content ?? "Idea",
      target: type === "node" ? null : target, path: type === "node" ? [] : [target], x: 2, y: 3, cand, candVersion: 2,
    };
    return { inbox, scratch, target, src, cand, place };
  });
}
type T = Awaited<ReturnType<typeof setup>>;

// Places (staged or direct) and returns the Undo input built from the placement's `changes`.
async function placed(db: Client, t: T, staged: boolean): Promise<Undo> {
  const before = staged ? await candidateRow(db, t.cand) : undefined;
  const envelope = staged ? await placeStaged(db, t.place) : await placeDirect(db, t.place);
  expect(envelope.status).toBe("applied");
  const rows = [...(envelope.changes.nodes?.upserted ?? []), ...(envelope.changes.bits?.upserted ?? [])];
  const result = rows.find((r) => r.id === t.place.result)!;
  return { result, source: envelope.changes.scratch_breakdowns!.upserted[0], candidate: before };
}

const KINDS = [["staged Node", true, "node"], ["staged Bit", true, "bit"], ["direct Node", false, "node"], ["direct Bit", false, "bit"]] as const;

describe("undo placement", () => {
  it.each(KINDS)("%s atomically deletes the exact result and restores the source with the right provenance", async (_l, staged, type) => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner, { type, staged, content: type === "node" ? "Placed Node" : "Idea" });
      const u = await placed(db, t, staged);
      await owner(() => sql(db, "update app.nodes set mtime = 150 where id = $1", [t.target]));
      expect(await reconcileUndo(db, u)).toMatchObject({ status: "not_applied", changes: { scratch_breakdowns: { upserted: [{ id: t.src, consumed_at: u.source.consumed_at }] } } });
      const done = await undo(db, u);
      expect(done).toMatchObject({ status: "applied", result: null });
      expect(await stored(db, type === "node" ? "nodes" : "bits", t.place.result)).toBeUndefined();
      expect(await sourceRow(db, t.src)).toMatchObject({ consumed_at: null, version: 5, content: u.source.content, order: u.source.order, created_at: u.source.created_at });
      if (staged) {
        const cand = await candidateRow(db, t.cand);
        expect(cand).toMatchObject({ id: t.cand, scratch_bit_id: t.scratch, source_breakdown_id: t.src, result_type: type, lifecycle: "staged", created_at: u.candidate!.created_at, version: 3 });
        expect(Number(cand!.updated_at)).toBeGreaterThanOrEqual(Number(cand!.created_at));
        expect(done.changes.staged_candidates?.upserted).toHaveLength(1);
      } else {
        expect(await candidateRow(db, t.cand)).toBeUndefined();
        expect(done.changes.staged_candidates).toBeUndefined();
      }
      if (type === "bit") expect(await stored(db, "nodes", t.target)).toMatchObject({ version: 1 });
      expect(done.changes[type === "node" ? "nodes" : "bits"]?.deleted).toEqual([t.place.result]);
      const committed = await counts(db);
      const src = await sourceRow(db, t.src);
      expect(await undo(db, u)).toMatchObject({ status: "already_applied" });
      expect(await reconcileUndo(db, u)).toMatchObject({ status: "already_applied" });
      expect(await counts(db)).toEqual(committed);
      expect(await sourceRow(db, t.src)).toEqual(src);
    });
  });

  it("compares rows with user_id dropped on both sides", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const u = await placed(db, t, true);
      const strip = (r: Row) => Object.fromEntries(Object.entries(r).filter(([k]) => k !== "user_id"));
      expect(await undo(db, { result: strip(u.result), source: strip(u.source), candidate: strip(u.candidate!) })).toMatchObject({ status: "applied" });
    });
  });

  const blocked: [string, (db: Client, u: Undo) => Promise<void>][] = [
    ["result direct version changed", (db, u) => sql(db, "update app.bits set version = version + 1 where id = $1", [u.result.id])],
    ["result lifecycle changed", (db, u) => sql(db, "update app.bits set archived_at = 400, version = version + 1 where id = $1", [u.result.id])],
    ["result creation snapshot changed", (db, u) => sql(db, "update app.bits set title = 'Unknown mutation' where id = $1", [u.result.id])],
    ["source consumption changed", (db, u) => sql(db, "update app.scratch_breakdowns set consumed_at = 401 where id = $1", [u.source.id])],
    ["source version changed", (db, u) => sql(db, "update app.scratch_breakdowns set version = version + 1 where id = $1", [u.source.id])],
    ["a Chunk was added to the Bit result", (db, u) => addChunk(db, user.id, { parentId: u.result.id as string }).then(() => undefined)],
  ];
  it.each(blocked)("%s blocks Undo without writing", async (_l, mutate) => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner, { staged: false });
      const u = await placed(db, t, false);
      await owner(() => mutate(db, u));
      const before = await counts(db);
      expect(await reconcileUndo(db, u)).toMatchObject({ status: "conflict" });
      expect(await undo(db, u)).toMatchObject({ status: "conflict" });
      expect(await counts(db)).toEqual(before);
    });
  });

  it("blocks Undo when the snapshot itself is not a creation snapshot, even if it equals the stored row", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner, { staged: false });
      const u = await placed(db, t, false);
      await owner(() => sql(db, "update app.bits set version = 2, mtime = mtime + 5 where id = $1", [u.result.id]));
      const current = await owner(() => stored(db, "bits", t.place.result));
      const before = await counts(db);
      expect(await undo(db, { ...u, result: current })).toMatchObject({ status: "conflict" });
      expect(await counts(db)).toEqual(before);
      expect(await stored(db, "bits", t.place.result)).toBeDefined();
    });
  });

  it("blocks a staged Undo when the candidate identity has been reused", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const u = await placed(db, t, true);
      const other = randomUUID();
      await owner(async () => {
        await insertRow(db, "scratch_breakdowns", scratchBreakdownToRow({ ...baseEntities.scratchBreakdown, id: other, scratchBitId: t.scratch, content: "Other", order: 1, version: 1 } as ScratchBreakdown, user.id));
        await insertRow(db, "staged_candidates", stagedCandidateToRow({ ...baseEntities.stagedCandidate, id: t.cand, scratchBitId: t.scratch, sourceBreakdownId: other, resultType: "bit", version: 2 } as StagedCandidate, user.id));
      });
      const before = await counts(db);
      expect(await undo(db, u)).toMatchObject({ status: "conflict" });
      expect(await counts(db)).toEqual(before);
    });
  });

  it("blocks a Node Undo while a descendant survives and re-enables it after child-first recovery", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner, { type: "node", staged: false, content: "Placed Node" });
      const u = await placed(db, t, false);
      const child = await owner(() => addNode(db, user.id, { parentId: t.place.result, level: 1, x: 0, y: 0 }));
      const blocked = await counts(db);
      expect(await undo(db, u)).toMatchObject({ status: "conflict" });
      expect(await counts(db)).toEqual(blocked);
      await owner(() => sql(db, "delete from app.nodes where id = $1", [child]));
      expect(await undo(db, u)).toMatchObject({ status: "applied", result: null });
    });
  });

  it.each([["staged", true, "deleted_at"], ["staged", true, "archived_at"], ["direct", false, "deleted_at"], ["direct", false, "archived_at"]] as const)(
    "%s Undo with an owning Scratch with %s set is rejected in the command and the reconcile, with no write",
    async (_l, staged, column) => {
      await withActor(A(), async (db, owner) => {
        const t = await setup(db, owner, { staged });
        const u = await placed(db, t, staged);
        await owner(() => sql(db, `update app.bits set ${column} = 300 where id = $1`, [t.scratch]));
        const before = await counts(db);
        expect(await reconcileUndo(db, u)).toMatchObject({ status: "rejected", rejection: { code: "invalid_target" } });
        expect(await undo(db, u)).toMatchObject({ status: "rejected", rejection: { code: "invalid_target" } });
        expect(await counts(db)).toEqual(before);
        expect(await stored(db, "bits", t.place.result)).toBeDefined();
      });
    },
  );

  it("an Undo for a Scratch outside the Inbox is invalid_target and a missing Scratch not_found", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner, { staged: false });
      const u = await placed(db, t, false);
      const plain = await owner(() => addBit(db, user.id, { parentId: t.target, x: 4, y: 4 }));
      const wrong = { ...u, source: { ...u.source, scratch_bit_id: plain } };
      expect(await undo(db, wrong)).toMatchObject({ status: "rejected", rejection: { code: "invalid_target" } });
      expect(await undo(db, { ...u, source: { ...u.source, scratch_bit_id: randomUUID() } })).toMatchObject({ status: "rejected", rejection: { code: "not_found" } });
      expect(await stored(db, "bits", t.place.result)).toBeDefined();
    });
  });

  it("a completed Undo still reconciles already_applied after its Scratch is later trashed", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner, { staged: false });
      const u = await placed(db, t, false);
      expect(await undo(db, u)).toMatchObject({ status: "applied" });
      await owner(() => sql(db, "update app.bits set deleted_at = 300 where id = $1", [t.scratch]));
      expect(await reconcileUndo(db, u)).toMatchObject({ status: "already_applied" });
      expect(await undo(db, u)).toMatchObject({ status: "already_applied" });
    });
  });

  it("ABA: Place then Undo makes the late original placement and Stage reconciliation conflict without resurrection", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const u = await placed(db, t, true);
      expect(await undo(db, u)).toMatchObject({ status: "applied" });
      const after = await counts(db);
      const srcAfter = await sourceRow(db, t.src);
      const candAfter = await candidateRow(db, t.cand);
      const original = [...[t.place.result, t.place.scratch, t.place.source, t.place.sourceVersion, t.place.type, t.place.title, t.place.target, t.place.path, t.place.x, t.place.y], t.place.cand, t.place.candVersion];
      expect(await call(db, "reconcile_place_staged_candidate", original)).toMatchObject({ status: "conflict" });
      expect(await call(db, "reconcile_stage_candidate", [t.cand, t.scratch, t.src, 2, "bit"])).toMatchObject({ status: "conflict" });
      expect(await call(db, "place_staged_candidate", original)).toMatchObject({ status: "conflict" });
      expect(await counts(db)).toEqual(after);
      expect(await sourceRow(db, t.src)).toEqual(srcAfter);
      expect(await candidateRow(db, t.cand)).toEqual(candAfter);
      expect(srcAfter).toMatchObject({ consumed_at: null, version: 5 });
      expect(candAfter).toMatchObject({ version: 3, created_at: u.candidate!.created_at });
      // The recreated candidate (version 3) is a real, unstageable-at-v1 row: a real Unstage still works.
      expect(await call(db, "unstage_candidate", [t.cand, 3, t.src, 5])).toMatchObject({ status: "applied" });
    });
  });

  it("a late ambiguous Undo conflicts after a new confirmed placement and cannot remove or restore anything", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner, { staged: false });
      const first = await placed(db, t, false);
      expect(await undo(db, first)).toMatchObject({ status: "applied" });
      const replacement: Place = { ...t.place, result: randomUUID(), sourceVersion: 5 };
      expect(await placeDirect(db, replacement)).toMatchObject({ status: "applied", result: { id: replacement.result } });
      const after = await counts(db);
      const src = await sourceRow(db, t.src);
      expect(await reconcileUndo(db, first)).toMatchObject({ status: "conflict" });
      expect(await undo(db, first)).toMatchObject({ status: "conflict" });
      expect(await counts(db)).toEqual(after);
      expect(await sourceRow(db, t.src)).toEqual(src);
    });
  });

  it("raises 22023 for a missing row or id, reconciles it as conflict, and reports a missing account", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner, { staged: false });
      const u = await placed(db, t, false);
      await expect(call(db, "undo_direct_placement", [null, u.source])).rejects.toThrow(/Undo needs/);
    });
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner, { staged: false });
      const u = await placed(db, t, false);
      await expect(call(db, "undo_staged_placement", [u.result, u.source, null])).rejects.toThrow(/Undo needs/);
    });
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner, { staged: false });
      const u = await placed(db, t, false);
      expect(await call(db, "reconcile_undo_direct_placement", [null, u.source])).toMatchObject({ status: "conflict" });
      expect(await call(db, "reconcile_undo_staged_placement", [u.result, u.source, null])).toMatchObject({ status: "conflict" });
    });
    await withActor(authed(stranger), async (db) => {
      const row = { id: randomUUID(), scratch_bit_id: randomUUID(), version: 1 };
      expect(await undo(db, { result: row, source: row })).toMatchObject({ status: "rejected", rejection: { code: "account_missing" } });
      expect(await reconcileUndo(db, { result: row, source: row })).toMatchObject({ status: "rejected", rejection: { code: "account_missing" } });
    });
  });
});

describe("cross-account and change set (undo placement)", () => {
  it("is refused for another account's rows, with nothing of theirs in changes", async () => {
    await withActor(A(), async (db, owner) => {
      await setup(db, owner);
      const theirs = await setup(db, owner, { staged: false }, stranger);
      const theirEnvelope = await owner(() => placeDirect(db, theirs.place));
      expect(theirEnvelope.status).toBe("rejected");
    });
    await withActor(authed(stranger), async (db, owner) => {
      const theirs = await setup(db, owner, { staged: false }, stranger);
      const u = await placed(db, theirs, false);
      await withActor(A(), async (me, ownerMe) => {
        await setup(me, ownerMe);
        await ownerMe(async () => undefined);
        const attempt = await undo(me, u);
        expect(attempt.status).not.toBe("applied");
        expect(JSON.stringify(attempt.changes)).not.toContain(theirs.src);
        const rec = await reconcileUndo(me, u);
        expect(rec.status).not.toBe("not_applied");
        expect(JSON.stringify(rec.changes)).not.toContain(theirs.src);
      });
      expect(await stored(db, "bits", theirs.place.result)).toBeDefined();
    });
  });

  it("before + changes equals after for undo placements, reconciles and their rejections", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const u = await placed(db, t, true);
      const run = (fn: () => Promise<Envelope>) => assertChangeSet(db, user.id, fn as unknown as () => Promise<ChangeEnvelope>);
      await run(() => reconcileUndo(db, u));
      await run(() => undo(db, { ...u, source: { ...u.source, version: 99 } }));
      await run(() => undo(db, u));
      await run(() => undo(db, u));
      await run(() => reconcileUndo(db, u));
    });
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner, { type: "node", staged: false, content: "Placed Node" });
      const u = await placed(db, t, false);
      const run = (fn: () => Promise<Envelope>) => assertChangeSet(db, user.id, fn as unknown as () => Promise<ChangeEnvelope>);
      await owner(() => sql(db, "update app.bits set archived_at = 5 where id = $1", [t.scratch]));
      await run(() => undo(db, u));
      await run(() => reconcileUndo(db, u));
      await owner(() => sql(db, "update app.bits set archived_at = null where id = $1", [t.scratch]));
      await run(() => undo(db, u));
      await run(() => reconcileUndo(db, u));
    });
  });
});
