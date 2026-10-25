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

  it("before + changes equals after for Stage and its rejections", async () => {
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
    });
  });
});
