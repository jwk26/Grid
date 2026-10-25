import { randomUUID } from "node:crypto";
import type { Client } from "pg";
import { beforeAll, describe, expect, it } from "vitest";
import { baseEntities } from "@/lib/db/boundary-cases";
import { scratchBreakdownToRow, stagedCandidateToRow } from "@/lib/db/row-mapping";
import type { ScratchBreakdown, StagedCandidate } from "@/lib/db/schema";
import { assertChangeSet, type Envelope as ChangeEnvelope } from "./helpers/change-set";
import { expectDbError, insertRow, withActor } from "./helpers/db";
import { account, addBit, addNode, authed, call, sql, stored, type Envelope, type Owner, type Row } from "./helpers/lifecycle";
import { createTestUser, type TestUser } from "./helpers/users";

// The Stage and Unstage commands (Task 222), ported from the Dexie scenarios in
// inbox-operations.test.ts and staged-candidates.test.ts, which are the answer key.

let user: TestUser;
let stranger: TestUser;

beforeAll(async () => {
  user = await createTestUser("stg");
  stranger = await createTestUser("stg-other");
});

const A = () => authed(user);

const stage = (db: Client, cand: string, scratch: string, source: string, version: number, type = "node") =>
  call(db, "stage_candidate", [cand, scratch, source, version, type]);
const reconcileStage = (db: Client, cand: string, scratch: string, source: string, version: number, type = "node") =>
  call(db, "reconcile_stage_candidate", [cand, scratch, source, version, type]);

const unstage = (db: Client, cand: string, candVersion: number, source: string, sourceVersion: number) =>
  call(db, "unstage_candidate", [cand, candVersion, source, sourceVersion]);
const reconcileUnstage = (db: Client, cand: string, candVersion: number, source: string, sourceVersion: number) =>
  call(db, "reconcile_unstage_candidate", [cand, candVersion, source, sourceVersion]);

async function candidate(db: Client, id: string): Promise<Row | undefined> {
  return (await db.query("select to_jsonb(r.*) as r from app.staged_candidates r where id = $1", [id])).rows[0]?.r;
}
async function source(db: Client, id: string): Promise<Row | undefined> {
  return (await db.query("select to_jsonb(r.*) as r from app.scratch_breakdowns r where id = $1", [id])).rows[0]?.r;
}
const candidateCount = async (db: Client, scratch: string) =>
  Number((await db.query("select count(*) as n from app.staged_candidates where scratch_bit_id = $1", [scratch])).rows[0].n);

// The account's Inbox with one Scratch ("Scratch", version 5).
async function setup(db: Client, owner: Owner, u = user) {
  return owner(async () => {
    await account(db, u.id);
    const inbox = await addNode(db, u.id, { systemRole: "inbox", x: 8, y: 8, version: 3, mtime: 7 });
    const scratch = await addBit(db, u.id, { parentId: inbox, title: "Scratch", x: 0, y: 0, version: 5, mtime: 7 });
    return { inbox, scratch };
  });
}
const seedRow = (db: Client, scratch: string, o: Partial<ScratchBreakdown> = {}, u = user) =>
  insertRow(db, "scratch_breakdowns", scratchBreakdownToRow({ ...baseEntities.scratchBreakdown, id: randomUUID(), scratchBitId: scratch, version: 2, ...o }, u.id));
const seedCandidate = (db: Client, scratch: string, sourceId: string, o: Partial<StagedCandidate> = {}, u = user) =>
  insertRow(db, "staged_candidates", stagedCandidateToRow({ ...baseEntities.stagedCandidate, id: randomUUID(), scratchBitId: scratch, sourceBreakdownId: sourceId, ...o }, u.id));

describe("stage_candidate", () => {
  it("inserts the candidate at version 1 and increments only the source version", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const src = randomUUID();
      const cand = randomUUID();
      await owner(() => seedRow(db, t.scratch, { id: src, content: "Idea", order: 3 }));
      const envelope = await stage(db, cand, t.scratch, src, 2);
      expect(envelope).toMatchObject({ status: "applied", result: { id: cand } });
      const row = await candidate(db, cand);
      expect(row).toMatchObject({ scratch_bit_id: t.scratch, source_breakdown_id: src, result_type: "node", lifecycle: "staged", version: 1 });
      expect(row?.created_at).toBe(row?.updated_at);
      expect(await source(db, src)).toMatchObject({ version: 3, content: "Idea", order: 3, consumed_at: null });
      expect(await stored(db, "bits", t.scratch)).toMatchObject({ version: 5, mtime: 7 });
      expect(envelope.changes.bits).toBeUndefined();
      expect(envelope.changes.scratch_breakdowns?.upserted).toHaveLength(1);
      expect(envelope.changes.staged_candidates?.upserted).toHaveLength(1);
    });
  });

  it("classifies the exact precondition, stages once, and recognizes the complete postcondition", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const src = randomUUID();
      const cand = randomUUID();
      await owner(() => seedRow(db, t.scratch, { id: src }));
      expect(await reconcileStage(db, cand, t.scratch, src, 2)).toMatchObject({ status: "not_applied" });
      expect(await stage(db, cand, t.scratch, src, 2)).toMatchObject({ status: "applied" });
      const committedSource = await source(db, src);
      expect(await stage(db, cand, t.scratch, src, 2)).toMatchObject({ status: "already_applied", result: { id: cand } });
      expect(await reconcileStage(db, cand, t.scratch, src, 2)).toMatchObject({ status: "already_applied" });
      expect(await source(db, src)).toEqual(committedSource);
      expect(await candidateCount(db, t.scratch)).toBe(1);
    });
  });

  it("requires Unstage and a new identity before changing the candidate type", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const src = randomUUID();
      const first = randomUUID();
      await owner(() => seedRow(db, t.scratch, { id: src }));
      await stage(db, first, t.scratch, src, 2, "node");
      // A second candidate id for the same source is refused, the first stays.
      const second = await stage(db, randomUUID(), t.scratch, src, 3, "bit");
      expect(second).toMatchObject({ status: "rejected", rejection: { code: "invalid_target" } });
      expect(second.changes.staged_candidates?.upserted[0]).toMatchObject({ id: first, result_type: "node" });
      // The same candidate id with another type is not the Stage postcondition either.
      expect(await stage(db, first, t.scratch, src, 2, "bit")).toMatchObject({ status: "conflict" });
      expect(await candidate(db, first)).toMatchObject({ result_type: "node" });
      expect(await source(db, src)).toMatchObject({ version: 3 });
    });
  });

  it("is a conflict for a wrong source version, and writes nothing", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const src = randomUUID();
      await owner(() => seedRow(db, t.scratch, { id: src }));
      const envelope = await stage(db, randomUUID(), t.scratch, src, 1);
      expect(envelope.status).toBe("conflict");
      expect(envelope.changes.scratch_breakdowns?.upserted[0]).toMatchObject({ id: src, version: 2 });
      expect(await candidateCount(db, t.scratch)).toBe(0);
      expect(await source(db, src)).toMatchObject({ version: 2 });
      expect(await reconcileStage(db, randomUUID(), t.scratch, src, 1)).toMatchObject({ status: "conflict" });
    });
  });

  it("is a conflict when the candidate id already exists on another source", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const held = randomUUID();
      const other = randomUUID();
      const src = randomUUID();
      await owner(async () => {
        await seedRow(db, t.scratch, { id: other });
        await seedCandidate(db, t.scratch, other, { id: held });
        await seedRow(db, t.scratch, { id: src });
      });
      expect(await stage(db, held, t.scratch, src, 2)).toMatchObject({ status: "conflict" });
      expect(await candidateCount(db, t.scratch)).toBe(1);
      expect(await source(db, src)).toMatchObject({ version: 2 });
    });
  });

  it.each([
    ["a trashed Scratch", "update app.bits set deleted_at = 5 where id = $1"],
    ["an archived Scratch", "update app.bits set archived_at = 5 where id = $1"],
    ["a Scratch that is not an Inbox Bit", "update app.bits set parent_id = (select id from app.nodes where user_id = $2 and system_role is null) where id = $1"],
  ] as const)("rejects %s with invalid_target and writes nothing", async (_label, statement) => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const src = randomUUID();
      await owner(async () => {
        await addNode(db, user.id, { x: 2, y: 2 });
        await seedRow(db, t.scratch, { id: src });
        await sql(db, statement, [t.scratch, user.id]);
      });
      expect(await stage(db, randomUUID(), t.scratch, src, 2)).toMatchObject({ status: "rejected", rejection: { code: "invalid_target" } });
      expect(await candidateCount(db, t.scratch)).toBe(0);
      expect(await source(db, src)).toMatchObject({ version: 2 });
    });
  });

  it("rejects a consumed source and a source of another Scratch with invalid_target", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const consumed = randomUUID();
      const foreign = randomUUID();
      let otherScratch = "";
      await owner(async () => {
        otherScratch = await addBit(db, user.id, { parentId: t.inbox, title: "Other", x: 1, y: 0, version: 1 });
        await seedRow(db, t.scratch, { id: consumed, consumedAt: 9 });
        await seedRow(db, otherScratch, { id: foreign });
      });
      expect(await stage(db, randomUUID(), t.scratch, consumed, 2)).toMatchObject({ status: "rejected", rejection: { code: "invalid_target" } });
      expect(await stage(db, randomUUID(), t.scratch, foreign, 2)).toMatchObject({ status: "rejected", rejection: { code: "invalid_target" } });
      expect(await candidateCount(db, t.scratch)).toBe(0);
      expect(await candidateCount(db, otherScratch)).toBe(0);
    });
  });

  it("rejects a missing Scratch or source with not_found", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      expect(await stage(db, randomUUID(), randomUUID(), randomUUID(), 2)).toMatchObject({ status: "rejected", rejection: { code: "not_found" }, changes: {} });
      expect(await stage(db, randomUUID(), t.scratch, randomUUID(), 2)).toMatchObject({ status: "rejected", rejection: { code: "not_found" } });
    });
  });

  it("rejects an invalid result type and a null argument with 22023, and a missing account", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const src = randomUUID();
      await owner(() => seedRow(db, t.scratch, { id: src }));
      await db.query("savepoint s");
      expect(await expectDbError(() => stage(db, randomUUID(), t.scratch, src, 2, "chunk"))).toBe("22023");
      await db.query("rollback to savepoint s");
      await db.query("savepoint s");
      expect(await expectDbError(() => call(db, "stage_candidate", [null, t.scratch, src, 2, "node"]))).toBe("22023");
      await db.query("rollback to savepoint s");
    });
    await withActor(A(), async (db) => {
      expect(await stage(db, randomUUID(), randomUUID(), randomUUID(), 2)).toMatchObject({ status: "rejected", rejection: { code: "account_missing" } });
    });
  });

  it("refuses to delete a staged source: the composite foreign key holds (S18)", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const src = randomUUID();
      const cand = randomUUID();
      await owner(() => seedRow(db, t.scratch, { id: src }));
      await stage(db, cand, t.scratch, src, 2);
      const code = await owner(async () => {
        await db.query("savepoint s");
        const refused = await expectDbError(() => db.query("delete from app.scratch_breakdowns where id = $1", [src]));
        await db.query("rollback to savepoint s");
        return refused;
      });
      expect(code).toBe("23503");
      expect(await source(db, src)).toMatchObject({ version: 3 });
      expect(await candidate(db, cand)).toMatchObject({ source_breakdown_id: src });
    });
  });
});

describe("reconcile_stage_candidate", () => {
  it("a candidate recreated by Undo cannot satisfy the original Stage postcondition", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const src = randomUUID();
      const versionTwo = randomUUID();
      const touched = randomUUID();
      const src2 = randomUUID();
      await owner(async () => {
        // The source sits at expected + 1 (3); only the candidate differs.
        await seedRow(db, t.scratch, { id: src, version: 3 });
        await seedCandidate(db, t.scratch, src, { id: versionTwo, version: 2, createdAt: 10, updatedAt: 10 });
        await seedRow(db, t.scratch, { id: src2, version: 3 });
        await seedCandidate(db, t.scratch, src2, { id: touched, version: 1, createdAt: 10, updatedAt: 20 });
      });
      expect(await reconcileStage(db, versionTwo, t.scratch, src, 2)).toMatchObject({ status: "conflict" });
      expect(await reconcileStage(db, touched, t.scratch, src2, 2)).toMatchObject({ status: "conflict" });
      // The command agrees: a conflict, with the candidate left as it is.
      expect(await stage(db, versionTwo, t.scratch, src, 2)).toMatchObject({ status: "conflict" });
      expect(await stage(db, touched, t.scratch, src2, 2)).toMatchObject({ status: "conflict" });
      expect(await candidate(db, versionTwo)).toMatchObject({ version: 2 });
    });
  });

  it("is conflict for an inactive Scratch and a consumed source, and rejects only account_missing", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const src = randomUUID();
      await owner(() => seedRow(db, t.scratch, { id: src }));
      expect(await reconcileStage(db, randomUUID(), t.scratch, src, 2)).toMatchObject({ status: "not_applied" });
      await owner(() => sql(db, "update app.scratch_breakdowns set consumed_at = 9 where id = $1", [src]));
      expect(await reconcileStage(db, randomUUID(), t.scratch, src, 2)).toMatchObject({ status: "conflict" });
      await owner(() => sql(db, "update app.scratch_breakdowns set consumed_at = null where id = $1", [src]));
      await owner(() => sql(db, "update app.bits set archived_at = 5 where id = $1", [t.scratch]));
      expect(await reconcileStage(db, randomUUID(), t.scratch, src, 2)).toMatchObject({ status: "conflict" });
      expect(await reconcileStage(db, randomUUID(), randomUUID(), randomUUID(), 2)).toMatchObject({ status: "conflict", changes: {} });
      expect(await call(db, "reconcile_stage_candidate", [null, t.scratch, src, 2, "node"])).toMatchObject({ status: "conflict" });
      await owner(() => sql(db, "update app.bits set archived_at = null where id = $1", [t.scratch]));
      // The command raises 22023 for a result type other than node or bit; the reconcile says conflict.
      expect(await reconcileStage(db, randomUUID(), t.scratch, src, 2, "chunk")).toMatchObject({ status: "conflict" });
    });
    await withActor(A(), async (db) => {
      expect(await reconcileStage(db, randomUUID(), randomUUID(), randomUUID(), 2)).toMatchObject({ status: "rejected", rejection: { code: "account_missing" } });
    });
  });
});

describe("cross-account and change set (Stage)", () => {
  it("leaves another account's rows untouched and sees nothing of them", async () => {
    await withActor(A(), async (db, owner) => {
      await setup(db, owner);
      const theirs = await setup(db, owner, stranger);
      const theirSource = randomUUID();
      const theirCand = randomUUID();
      await owner(async () => {
        await seedRow(db, theirs.scratch, { id: theirSource }, stranger);
        await seedCandidate(db, theirs.scratch, theirSource, { id: theirCand }, stranger);
      });
      const mine = randomUUID();
      expect(await stage(db, mine, theirs.scratch, theirSource, 2)).toMatchObject({ status: "rejected", rejection: { code: "not_found" }, changes: {} });
      expect(await reconcileStage(db, theirCand, theirs.scratch, theirSource, 2)).toMatchObject({ status: "conflict", changes: {} });
      expect(await owner(() => candidate(db, theirCand))).toMatchObject({ version: 1 });
      expect(await owner(() => source(db, theirSource))).toMatchObject({ version: 2 });
    });
    await withActor(A(), async (db, owner) => {
      const mine = await setup(db, owner);
      const theirs = await setup(db, owner, stranger);
      const theirSource = randomUUID();
      const theirCand = randomUUID();
      const src = randomUUID();
      await owner(async () => {
        await seedRow(db, theirs.scratch, { id: theirSource }, stranger);
        await seedCandidate(db, theirs.scratch, theirSource, { id: theirCand }, stranger);
        await seedRow(db, mine.scratch, { id: src });
      });
      await db.query("savepoint dup");
      expect(await expectDbError(() => stage(db, theirCand, mine.scratch, src, 2))).toBe("23505");
      await db.query("rollback to savepoint dup");
      expect(await owner(() => candidate(db, theirCand))).toMatchObject({ scratch_bit_id: theirs.scratch, version: 1 });
      expect(await owner(() => source(db, src))).toMatchObject({ version: 2 });
    });
  });

  it("treats another account's source id as not found, with only my own Scratch in changes", async () => {
    await withActor(A(), async (db, owner) => {
      const mine = await setup(db, owner);
      const theirs = await setup(db, owner, stranger);
      const theirSource = randomUUID();
      await owner(() => seedRow(db, theirs.scratch, { id: theirSource }, stranger));
      const staged = await stage(db, randomUUID(), mine.scratch, theirSource, 2);
      expect(staged).toMatchObject({ status: "rejected", rejection: { code: "not_found" } });
      expect(staged.changes.bits?.upserted.map((r) => r.id)).toEqual([mine.scratch]);
      expect(staged.changes.scratch_breakdowns).toBeUndefined();
      const reconciled = await reconcileStage(db, randomUUID(), mine.scratch, theirSource, 2);
      expect(reconciled.status).toBe("conflict");
      expect(reconciled.changes.bits?.upserted.map((r) => r.id)).toEqual([mine.scratch]);
      expect(reconciled.changes.scratch_breakdowns).toBeUndefined();
      expect(await owner(() => source(db, theirSource))).toMatchObject({ version: 2 });
    });
  });

  it("before + changes equals after for Stage, Unstage and their rejections", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const src = randomUUID();
      const consumed = randomUUID();
      await owner(async () => {
        await seedRow(db, t.scratch, { id: src });
        await seedRow(db, t.scratch, { id: consumed, consumedAt: 9 });
      });
      const run = (fn: () => Promise<Envelope>) => assertChangeSet(db, user.id, fn as unknown as () => Promise<ChangeEnvelope>);
      const cand = randomUUID();
      await run(() => reconcileStage(db, cand, t.scratch, src, 2));
      await run(() => stage(db, cand, t.scratch, src, 2));
      await run(() => stage(db, cand, t.scratch, src, 2));
      await run(() => reconcileStage(db, cand, t.scratch, src, 2));
      await run(() => stage(db, cand, t.scratch, src, 2, "bit"));
      await run(() => stage(db, randomUUID(), t.scratch, src, 3));
      await run(() => stage(db, randomUUID(), t.scratch, consumed, 2));
      await run(() => stage(db, randomUUID(), t.scratch, randomUUID(), 2));
      await run(() => reconcileStage(db, randomUUID(), t.scratch, consumed, 2));
      await run(() => reconcileUnstage(db, cand, 1, src, 3));
      await run(() => unstage(db, cand, 2, src, 3));
      await run(() => unstage(db, cand, 1, src, 3));
      await run(() => unstage(db, cand, 1, src, 3));
      await run(() => reconcileUnstage(db, cand, 1, src, 3));
      await run(() => unstage(db, randomUUID(), 1, randomUUID(), 1));
    });
  });
});

describe("unstage_candidate", () => {
  // A source at version 2 with a staged candidate (version 1) on the Scratch.
  async function staged(db: Client, owner: Owner, source: Partial<ScratchBreakdown> = {}) {
    const t = await setup(db, owner);
    const src = randomUUID();
    const cand = randomUUID();
    await owner(async () => {
      await seedRow(db, t.scratch, { id: src, content: "Idea", order: 4, ...source });
      await seedCandidate(db, t.scratch, src, { id: cand });
    });
    return { ...t, src, cand };
  }

  it("classifies the exact precondition, deletes only the candidate and advances only the source", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await staged(db, owner);
      const before = await source(db, t.src);
      expect(await reconcileUnstage(db, t.cand, 1, t.src, 2)).toMatchObject({ status: "not_applied" });
      const envelope = await unstage(db, t.cand, 1, t.src, 2);
      expect(envelope).toMatchObject({ status: "applied", result: { id: t.cand } });
      expect(envelope.changes.staged_candidates).toEqual({ upserted: [], deleted: [t.cand] });
      expect(await candidate(db, t.cand)).toBeUndefined();
      expect(await source(db, t.src)).toEqual({ ...before, version: 3 });
      expect(await stored(db, "bits", t.scratch)).toMatchObject({ version: 5 });
      expect(await unstage(db, t.cand, 1, t.src, 2)).toMatchObject({ status: "already_applied" });
      expect(await reconcileUnstage(db, t.cand, 1, t.src, 2)).toMatchObject({ status: "already_applied" });
      expect(await source(db, t.src)).toEqual({ ...before, version: 3 });
    });
  });

  it("returns conflict without writing after a later placement consumed the source", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const src = randomUUID();
      await owner(() => seedRow(db, t.scratch, { id: src, consumedAt: 200, version: 3 }));
      const envelope = await unstage(db, randomUUID(), 1, src, 2);
      expect(envelope.status).toBe("conflict");
      expect(envelope.changes.scratch_breakdowns?.upserted[0]).toMatchObject({ consumed_at: 200, version: 3 });
      expect(await source(db, src)).toMatchObject({ consumed_at: 200, version: 3 });
    });
  });

  it.each([
    ["a different candidate version", (t: { cand: string; src: string }): [string, number, string, number] => [t.cand, 2, t.src, 2]],
    ["a different source version", (t: { cand: string; src: string }): [string, number, string, number] => [t.cand, 1, t.src, 1]],
  ] as const)("is a conflict for %s and writes nothing", async (_label, args) => {
    await withActor(A(), async (db, owner) => {
      const t = await staged(db, owner);
      const [c, cv, s, sv] = args(t);
      expect(await unstage(db, c, cv, s, sv)).toMatchObject({ status: "conflict" });
      expect(await reconcileUnstage(db, c, cv, s, sv)).toMatchObject({ status: "conflict" });
      expect(await candidate(db, t.cand)).toMatchObject({ version: 1 });
      expect(await source(db, t.src)).toMatchObject({ version: 2 });
    });
  });

  it("is a conflict with no write for a missing source, and invalid_target for a candidate of another source", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await staged(db, owner);
      const other = randomUUID();
      await owner(() => seedRow(db, t.scratch, { id: other }));
      expect(await unstage(db, t.cand, 1, randomUUID(), 2)).toMatchObject({ status: "conflict", changes: {} });
      const wrong = await unstage(db, t.cand, 1, other, 2);
      expect(wrong).toMatchObject({ status: "rejected", rejection: { code: "invalid_target" } });
      expect(wrong.changes.staged_candidates?.upserted[0]).toMatchObject({ id: t.cand });
      expect(await candidate(db, t.cand)).toMatchObject({ version: 1 });
      expect(await source(db, other)).toMatchObject({ version: 2 });
    });
  });

  it("does not need an active Scratch, as the Dexie command does not", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await staged(db, owner);
      await owner(() => sql(db, "update app.bits set archived_at = 5 where id = $1", [t.scratch]));
      expect(await unstage(db, t.cand, 1, t.src, 2)).toMatchObject({ status: "applied" });
    });
  });

  it("rejects a null argument with 22023 and a missing account", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await staged(db, owner);
      await db.query("savepoint s");
      expect(await expectDbError(() => call(db, "unstage_candidate", [t.cand, null, t.src, 2]))).toBe("22023");
      await db.query("rollback to savepoint s");
      expect(await call(db, "reconcile_unstage_candidate", [null, 1, t.src, 2])).toMatchObject({ status: "conflict" });
    });
    await withActor(A(), async (db) => {
      expect(await unstage(db, randomUUID(), 1, randomUUID(), 2)).toMatchObject({ rejection: { code: "account_missing" } });
      expect(await reconcileUnstage(db, randomUUID(), 1, randomUUID(), 2)).toMatchObject({ rejection: { code: "account_missing" } });
    });
  });

  it("is refused for another account's candidate and source, with nothing of theirs in changes", async () => {
    await withActor(A(), async (db, owner) => {
      await setup(db, owner);
      const theirs = await setup(db, owner, stranger);
      const theirSource = randomUUID();
      const theirCand = randomUUID();
      await owner(async () => {
        await seedRow(db, theirs.scratch, { id: theirSource }, stranger);
        await seedCandidate(db, theirs.scratch, theirSource, { id: theirCand }, stranger);
      });
      expect(await unstage(db, theirCand, 1, theirSource, 2)).toMatchObject({ status: "conflict", changes: {} });
      expect(await reconcileUnstage(db, theirCand, 1, theirSource, 2)).toMatchObject({ status: "conflict", changes: {} });
      expect(await owner(() => candidate(db, theirCand))).toMatchObject({ version: 1 });
      expect(await owner(() => source(db, theirSource))).toMatchObject({ version: 2 });
    });
  });
});

describe("Stage and Unstage together", () => {
  it.each([
    ["late Stage reconciliation before duplicate Unstage", ["reconcile-stage", "unstage", "reconcile-unstage", "stage"]],
    ["duplicate Unstage before late Stage reconciliation", ["unstage", "reconcile-unstage", "stage", "reconcile-stage"]],
  ] as const)("an ambiguous Stage followed by a confirmed Unstage (%s) reconciles as conflict and never recreates the candidate", async (_label, order) => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const src = randomUUID();
      const cand = randomUUID();
      await owner(() => seedRow(db, t.scratch, { id: src }));
      expect(await stage(db, cand, t.scratch, src, 2)).toMatchObject({ status: "applied" });
      expect(await reconcileUnstage(db, cand, 1, src, 3)).toMatchObject({ status: "not_applied" });
      expect(await unstage(db, cand, 1, src, 3)).toMatchObject({ status: "applied" });
      const after = await source(db, src);
      for (const step of order) {
        if (step === "reconcile-stage") expect(await reconcileStage(db, cand, t.scratch, src, 2)).toMatchObject({ status: "conflict" });
        else if (step === "stage") expect(await stage(db, cand, t.scratch, src, 2)).toMatchObject({ status: "conflict" });
        else if (step === "unstage") expect(await unstage(db, cand, 1, src, 3)).toMatchObject({ status: "already_applied" });
        else expect(await reconcileUnstage(db, cand, 1, src, 3)).toMatchObject({ status: "already_applied" });
      }
      expect(await candidateCount(db, t.scratch)).toBe(0);
      expect(await source(db, src)).toEqual(after);
      expect(after).toMatchObject({ version: 4 });
    });
  });

  it("rejects Save and Delete of a source staged by the real Stage, and allows them after Unstage", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const src = randomUUID();
      const cand = randomUUID();
      await owner(() => seedRow(db, t.scratch, { id: src, version: 1 }));
      await stage(db, cand, t.scratch, src, 1);
      const save = (version: number) => call(db, "save_breakdown", [src, version, "Idea", 0, "Better", 0]);
      const del = (version: number, scratchVersion: number) => call(db, "delete_breakdown", [src, version, t.scratch, scratchVersion]);
      expect(await save(2)).toMatchObject({ status: "rejected", rejection: { code: "invalid_target" } });
      expect(await del(2, 5)).toMatchObject({ status: "rejected", rejection: { code: "invalid_target" } });
      expect(await candidate(db, cand)).toMatchObject({ version: 1 });
      expect(await source(db, src)).toMatchObject({ version: 2, content: "Idea" });
      await unstage(db, cand, 1, src, 2);
      expect(await save(3)).toMatchObject({ status: "applied" });
      expect(await del(4, 5)).toMatchObject({ status: "applied" });
    });
  });
});

describe("atomicity (Stage and Unstage)", () => {
  // A before-update trigger on app.scratch_breakdowns fails the source version write, which both
  // commands make after the candidate write.
  const refuseSourceUpdate = (db: Client) =>
    db.query(`create function app.refuse_breakdown_update() returns trigger language plpgsql as $f$ begin raise exception 'refused' using errcode = 'P0001'; end $f$`)
      .then(() => db.query("create trigger refuse_breakdowns before update on app.scratch_breakdowns for each row execute function app.refuse_breakdown_update()"));

  it("rolls the candidate insert back when the source version write fails", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const src = randomUUID();
      const cand = randomUUID();
      await owner(async () => {
        await seedRow(db, t.scratch, { id: src });
        await refuseSourceUpdate(db);
      });
      await db.query("savepoint s");
      expect(await expectDbError(() => stage(db, cand, t.scratch, src, 2))).toBe("P0001");
      await db.query("rollback to savepoint s");
      expect(await candidate(db, cand)).toBeUndefined();
      expect(await source(db, src)).toMatchObject({ version: 2 });
    });
  });

  it("rolls the candidate delete back when the source version write fails", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const src = randomUUID();
      const cand = randomUUID();
      await owner(async () => {
        await seedRow(db, t.scratch, { id: src });
        await seedCandidate(db, t.scratch, src, { id: cand });
        await refuseSourceUpdate(db);
      });
      await db.query("savepoint s");
      expect(await expectDbError(() => unstage(db, cand, 1, src, 2))).toBe("P0001");
      await db.query("rollback to savepoint s");
      expect(await candidate(db, cand)).toMatchObject({ version: 1 });
      expect(await source(db, src)).toMatchObject({ version: 2 });
    });
  });
});
