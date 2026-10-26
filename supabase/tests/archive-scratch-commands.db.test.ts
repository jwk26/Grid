import { randomUUID } from "node:crypto";
import type { Client } from "pg";
import { beforeAll, describe, expect, it } from "vitest";
import { baseEntities } from "@/lib/db/boundary-cases";
import { scratchBreakdownToRow, stagedCandidateToRow } from "@/lib/db/row-mapping";
import type { ScratchBreakdown, StagedCandidate } from "@/lib/db/schema";
import { assertChangeSet, type Envelope as ChangeEnvelope } from "./helpers/change-set";
import { expectDbError, insertRow, withActor } from "./helpers/db";
import { account, addBit, addNode, authed, call, stored, type Envelope, type Owner } from "./helpers/lifecycle";
import { createTestUser, type TestUser } from "./helpers/users";

// The Archive Scratch command and its reload classification (Task 224), ported from
// archive-scratch-command.test.ts and archive-scratch-recovery.test.ts, which are the answer key.

let user: TestUser;
let stranger: TestUser;

beforeAll(async () => {
  user = await createTestUser("arc");
  stranger = await createTestUser("arc-other");
});

const A = () => authed(user);

const archive = (db: Client, scratch: string, version: number) => call(db, "archive_scratch", [scratch, version]);
const classify = (db: Client, scratch: string, version: number, startedAt: number) =>
  call(db, "classify_archive_scratch_recovery", [scratch, version, startedAt]);

const snap = async (db: Client) =>
  (await db.query(
    `select (select json_agg(n order by id) from app.nodes n) n, (select json_agg(b order by id) from app.bits b) b,
            (select json_agg(s order by id) from app.scratch_breakdowns s) s, (select json_agg(c order by id) from app.staged_candidates c) c`,
  )).rows[0];

const seedRow = (db: Client, scratch: string, o: Partial<ScratchBreakdown> = {}, u = user) =>
  insertRow(db, "scratch_breakdowns", scratchBreakdownToRow({ ...baseEntities.scratchBreakdown, id: randomUUID(), scratchBitId: scratch, version: 2, ...o }, u.id));
const seedCandidate = (db: Client, scratch: string, sourceId: string, o: Partial<StagedCandidate> = {}, u = user) =>
  insertRow(db, "staged_candidates", stagedCandidateToRow({ ...baseEntities.stagedCandidate, id: randomUUID(), scratchBitId: scratch, sourceBreakdownId: sourceId, ...o }, u.id));

// The account's Inbox (version 3, mtime 7) with one Scratch ("Scratch", version 4) holding one
// consumed row, so the Scratch is eligible.
async function setup(db: Client, owner: Owner, u = user, eligible = true) {
  return owner(async () => {
    await account(db, u.id);
    const inbox = await addNode(db, u.id, { systemRole: "inbox", x: 8, y: 8, version: 3, mtime: 7 });
    const scratch = await addBit(db, u.id, { parentId: inbox, title: "Scratch", x: 0, y: 0, version: 4, mtime: 7 });
    const consumed = randomUUID();
    if (eligible) await seedRow(db, scratch, { id: consumed, consumedAt: 200 }, u);
    return { inbox, scratch, consumed };
  });
}

describe("archive_scratch", () => {
  it("archives only the Scratch: archived_at and mtime now, version once, rows and candidates untouched", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const before = await snap(db);
      const t0 = Date.now();
      const envelope = await archive(db, t.scratch, 4);
      expect(envelope).toMatchObject({ status: "applied", result: { id: t.scratch } });
      const row = await stored(db, "bits", t.scratch);
      expect(row).toMatchObject({ version: 5, deleted_at: null });
      expect(Number(row.archived_at)).toBeGreaterThanOrEqual(t0 - 5000);
      expect(row.mtime).toBe(row.archived_at);
      const after = await snap(db);
      expect(after.s).toEqual(before.s);
      expect(after.c).toEqual(before.c);
      expect(after.n).toEqual(before.n);
      expect(Object.keys(envelope.changes)).toEqual(["bits"]);
      expect(envelope.changes.bits?.upserted).toHaveLength(1);
    });
  });

  it("treats a replay as already_applied and writes nothing", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      await archive(db, t.scratch, 4);
      const committed = await snap(db);
      const replay = await archive(db, t.scratch, 4);
      expect(replay).toMatchObject({ status: "already_applied", result: { id: t.scratch } });
      expect(replay.changes.bits?.upserted[0]).toMatchObject({ id: t.scratch, version: 5 });
      expect(await snap(db)).toEqual(committed);
    });
  });

  it.each<[string, (db: Client, scratch: string) => Promise<unknown>]>([
    ["no rows", async (db, scratch) => { await db.query("delete from app.scratch_breakdowns where scratch_bit_id = $1", [scratch]); }],
    ["only an unconsumed row", async (db, scratch) => { await db.query("update app.scratch_breakdowns set consumed_at = null where scratch_bit_id = $1", [scratch]); }],
    ["consumed and unconsumed rows", (db, scratch) => seedRow(db, scratch, { consumedAt: null })],
    ["an all-staged active row", async (db, scratch) => {
      await db.query("update app.scratch_breakdowns set consumed_at = null where scratch_bit_id = $1", [scratch]);
      const { rows } = await db.query("select id from app.scratch_breakdowns where scratch_bit_id = $1", [scratch]);
      await seedCandidate(db, scratch, rows[0].id);
    }],
    ["a staged candidate beside a consumed row", async (db, scratch) => {
      const extra = randomUUID();
      await seedRow(db, scratch, { id: extra, consumedAt: null });
      await seedCandidate(db, scratch, extra);
    }],
  ])("rejects %s with no write, and returns the rows to derive eligibility from", async (_label, shape) => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      await owner(() => shape(db, t.scratch));
      const before = await snap(db);
      const envelope = await archive(db, t.scratch, 4);
      expect(envelope).toMatchObject({ status: "rejected", rejection: { code: "invalid_target" } });
      expect(envelope.changes.bits?.upserted[0]).toMatchObject({ id: t.scratch, version: 4, archived_at: null });
      expect(await snap(db)).toEqual(before);
    });
  });

  it("carries the Scratch, all its Breakdown rows and its candidates when it does not apply", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const extra = randomUUID();
      await owner(async () => {
        await seedRow(db, t.scratch, { id: extra, consumedAt: null });
        await seedCandidate(db, t.scratch, extra);
      });
      const envelope = await archive(db, t.scratch, 4);
      expect(envelope.status).toBe("rejected");
      expect(envelope.changes.bits?.upserted.map((r) => r.id)).toEqual([t.scratch]);
      expect(envelope.changes.scratch_breakdowns?.upserted).toHaveLength(2);
      expect(envelope.changes.staged_candidates?.upserted).toHaveLength(1);
    });
  });

  it("is a conflict for a wrong version, rejected for a trashed or archived Scratch", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const before = await snap(db);
      expect(await archive(db, t.scratch, 3)).toMatchObject({ status: "conflict" });
      expect(await archive(db, t.scratch, 5)).toMatchObject({ status: "conflict" });
      expect(await snap(db)).toEqual(before);
      await owner(() => db.query("update app.bits set deleted_at = 9, version = 5 where id = $1", [t.scratch]));
      expect(await archive(db, t.scratch, 5)).toMatchObject({ status: "rejected", rejection: { code: "invalid_target" } });
      await owner(() => db.query("update app.bits set deleted_at = null, archived_at = 9 where id = $1", [t.scratch]));
      expect(await archive(db, t.scratch, 5)).toMatchObject({ status: "rejected", rejection: { code: "invalid_target" } });
      expect(await archive(db, t.scratch, 4)).toMatchObject({ status: "already_applied" });
    });
  });

  it("does not take an archived ordinary Bit for an applied Scratch command, and rejects a wrong version of one", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const ordinary = await owner(async () => {
        const node = await addNode(db, user.id, { title: "Ordinary", x: 1, y: 0, level: 0 });
        const archived = await addBit(db, user.id, { parentId: node, x: 0, y: 0, archivedAt: 400, version: 5 });
        const active = await addBit(db, user.id, { parentId: node, x: 1, y: 0, version: 9 });
        return { archived, active };
      });
      const before = await snap(db);
      const archivedBit = await archive(db, ordinary.archived, 4);
      expect(archivedBit).toMatchObject({ status: "rejected", rejection: { code: "invalid_target" } });
      // Dexie says `conflict` for a wrong version; the Inbox-child check comes first here (Task 223 precedent).
      expect(await archive(db, ordinary.active, 1)).toMatchObject({ status: "rejected", rejection: { code: "invalid_target" } });
      expect(await snap(db)).toEqual(before);
      expect(t.scratch).toBeTruthy();
    });
  });

  it("is not_found for a missing Scratch, raises 22023 for a null argument and rejects a missing account", async () => {
    await withActor(A(), async (db, owner) => {
      await setup(db, owner);
      expect(await archive(db, randomUUID(), 1)).toMatchObject({ status: "rejected", rejection: { code: "not_found" }, changes: {} });
      await db.query("savepoint nul");
      expect(await expectDbError(() => archive(db, null as unknown as string, 1))).toBe("22023");
      await db.query("rollback to savepoint nul");
      expect(await expectDbError(() => call(db, "archive_scratch", [randomUUID(), null]))).toBe("22023");
    });
    await withActor(A(), async (db) => {
      expect(await archive(db, randomUUID(), 1)).toMatchObject({ status: "rejected", rejection: { code: "account_missing" } });
    });
  });

  it("rolls the Scratch write back when it fails after the write", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      await owner(async () => {
        await db.query(`create function app.refuse_update() returns trigger language plpgsql as $f$ begin raise exception 'refused' using errcode = 'P0001'; end $f$`);
        await db.query("create trigger refuse_it after update on app.bits for each row execute function app.refuse_update()");
      });
      const before = await snap(db);
      await db.query("savepoint atomic");
      expect(await expectDbError(() => archive(db, t.scratch, 4))).toBe("P0001");
      await db.query("rollback to savepoint atomic");
      expect(await snap(db)).toEqual(before);
    });
  });
});

describe("classify_archive_scratch_recovery", () => {
  const archived = (db: Client, scratch: string, o: { archivedAt?: number; mtime?: number; version?: number } = {}) =>
    db.query("update app.bits set archived_at = $2, mtime = $3, version = $4 where id = $1", [scratch, o.archivedAt ?? 250, o.mtime ?? o.archivedAt ?? 250, o.version ?? 5]);

  it("classifies the complete eligible precondition as not_applied without writes", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const before = await snap(db);
      const envelope = await classify(db, t.scratch, 4, 200);
      expect(envelope).toMatchObject({ status: "not_applied", result: null });
      expect(envelope.changes.bits?.upserted[0]).toMatchObject({ id: t.scratch, archived_at: null, version: 4 });
      expect(envelope.changes.scratch_breakdowns?.upserted).toHaveLength(1);
      expect(await snap(db)).toEqual(before);
    });
  });

  it("classifies only the complete retained Archive postcondition as applied, reading Scratch state and no operation table", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      await owner(() => archived(db, t.scratch));
      const before = await snap(db);
      expect(await classify(db, t.scratch, 4, 200)).toMatchObject({ status: "applied" });
      expect(await snap(db)).toEqual(before);
      const { rows } = await db.query("select count(*)::int as n from pg_tables where schemaname in ('app', 'public', 'internal') and tablename ilike '%operation%'");
      expect(rows[0].n).toBe(0);
    });
  });

  it.each<[string, (db: Client, scratch: string, consumed: string) => Promise<unknown>]>([
    ["an advanced active version", (db, scratch) => db.query("update app.bits set version = 5 where id = $1", [scratch])],
    ["a partial archived state (mtime differs)", (db, scratch) => db.query("update app.bits set archived_at = 250, version = 5 where id = $1", [scratch])],
    ["a changed lifecycle (trashed)", (db, scratch) => db.query("update app.bits set deleted_at = 220 where id = $1", [scratch])],
    ["changed durable eligibility", (db, scratch) => db.query("update app.scratch_breakdowns set consumed_at = null where scratch_bit_id = $1", [scratch])],
    ["a partial archived aggregate (a staged candidate)", async (db, scratch, consumed) => {
      await archived(db, scratch);
      await db.query("update app.scratch_breakdowns set consumed_at = null where id = $1", [consumed]);
      await seedCandidate(db, scratch, consumed);
    }],
    ["a stale descriptor (archived before the Archive started)", (db, scratch) => archived(db, scratch, { archivedAt: 150 })],
    ["a trashed archived Scratch", async (db, scratch) => { await archived(db, scratch); await db.query("update app.bits set deleted_at = 260 where id = $1", [scratch]); }],
    ["a Scratch outside the Inbox", async (db, scratch) => {
      const node = await addNode(db, user.id, { title: "Ordinary", x: 1, y: 0, level: 0 });
      await db.query("update app.bits set parent_id = $2 where id = $1", [scratch, node]);
    }],
  ])("classifies %s as conflict without writes", async (_label, shape) => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      await owner(() => shape(db, t.scratch, t.consumed));
      const before = await snap(db);
      expect(await classify(db, t.scratch, 4, 200)).toMatchObject({ status: "conflict" });
      expect(await snap(db)).toEqual(before);
    });
  });

  it("classifies a missing Scratch and an invalid argument as conflict, and rejects only a missing account", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      expect(await classify(db, randomUUID(), 4, 200)).toMatchObject({ status: "conflict", changes: {} });
      expect(await classify(db, t.scratch, 4, 0)).toMatchObject({ status: "conflict" });
      expect(await classify(db, t.scratch, 4, -5)).toMatchObject({ status: "conflict" });
      expect(await call(db, "classify_archive_scratch_recovery", [t.scratch, null, 200])).toMatchObject({ status: "conflict" });
      expect(await call(db, "classify_archive_scratch_recovery", [null, 4, 200])).toMatchObject({ status: "conflict" });
    });
    await withActor(A(), async (db) => {
      expect(await classify(db, randomUUID(), 4, 200)).toMatchObject({ status: "rejected", rejection: { code: "account_missing" } });
    });
  });
});

describe("cross-account and change set (Archive)", () => {
  it("leaves another account's rows untouched and sees nothing of them", async () => {
    await withActor(A(), async (db, owner) => {
      await setup(db, owner);
      const theirs = await setup(db, owner, stranger);
      const before = await owner(() => snap(db));
      expect(await archive(db, theirs.scratch, 4)).toMatchObject({ status: "rejected", rejection: { code: "not_found" }, changes: {} });
      expect(await classify(db, theirs.scratch, 4, 200)).toMatchObject({ status: "conflict", changes: {} });
      expect(await owner(() => snap(db))).toEqual(before);
      expect(await owner(() => stored(db, "bits", theirs.scratch))).toMatchObject({ version: 4, archived_at: null });
    });
  });

  it("before + changes equals after for Archive, recovery and their rejections", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const open = await owner(async () => {
        const extra = randomUUID();
        const scratch = await addBit(db, user.id, { parentId: t.inbox, title: "Open", x: 1, y: 0, version: 2 });
        await seedRow(db, scratch, { id: extra, consumedAt: null });
        return scratch;
      });
      const run = (fn: () => Promise<Envelope>) => assertChangeSet(db, user.id, fn as unknown as () => Promise<ChangeEnvelope>);
      await run(() => classify(db, t.scratch, 4, 200));
      await run(() => archive(db, open, 2));
      await run(() => archive(db, t.scratch, 3));
      await run(() => archive(db, randomUUID(), 1));
      await run(() => archive(db, t.scratch, 4));
      await run(() => archive(db, t.scratch, 4));
      await run(() => archive(db, t.scratch, 7));
      await run(() => classify(db, t.scratch, 4, 200));
      await run(() => classify(db, open, 2, 200));
    });
  });
});
