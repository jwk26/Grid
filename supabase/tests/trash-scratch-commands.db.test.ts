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

// The Trash Scratch command and its reconcile (Task 224), ported from trash-scratch-command.test.ts,
// which is the answer key. "A current candidate's source cannot be resolved" is not ported: the
// foreign key makes it unreachable.

let user: TestUser;
let stranger: TestUser;

beforeAll(async () => {
  user = await createTestUser("trs");
  stranger = await createTestUser("trs-other");
});

const A = () => authed(user);

type Item = { candidate_id: string; candidate_expected_version: number; source_breakdown_id: string; source_expected_version: number };
const trash = (db: Client, scratch: string, version: number, items: unknown) => call(db, "trash_scratch", [scratch, version, JSON.stringify(items)]);
const reconcile = (db: Client, scratch: string, version: number, items: unknown) => call(db, "reconcile_trash_scratch", [scratch, version, JSON.stringify(items)]);

const snap = async (db: Client) =>
  (await db.query(
    `select (select json_agg(n order by id) from app.nodes n) n, (select json_agg(b order by id) from app.bits b) b,
            (select json_agg(s order by id) from app.scratch_breakdowns s) s, (select json_agg(c order by id) from app.staged_candidates c) c`,
  )).rows[0];

const seedRow = (db: Client, scratch: string, o: Partial<ScratchBreakdown> = {}, u = user) =>
  insertRow(db, "scratch_breakdowns", scratchBreakdownToRow({ ...baseEntities.scratchBreakdown, id: randomUUID(), scratchBitId: scratch, version: 2, ...o }, u.id));
const seedCandidate = (db: Client, scratch: string, sourceId: string, o: Partial<StagedCandidate> = {}, u = user) =>
  insertRow(db, "staged_candidates", stagedCandidateToRow({ ...baseEntities.stagedCandidate, id: randomUUID(), scratchBitId: scratch, sourceBreakdownId: sourceId, version: 2, ...o }, u.id));

// The account's Inbox (version 3, mtime 7) with a Scratch (version 4) holding one staged source:
// source version 2, candidate version 2.
async function setup(db: Client, owner: Owner, u = user, staged = true) {
  return owner(async () => {
    await account(db, u.id);
    const inbox = await addNode(db, u.id, { systemRole: "inbox", x: 8, y: 8, version: 3, mtime: 7 });
    const scratch = await addBit(db, u.id, { parentId: inbox, title: "Scratch", x: 0, y: 0, version: 4, mtime: 7 });
    const source = randomUUID();
    const cand = randomUUID();
    await seedRow(db, scratch, { id: source, content: "Idea" }, u);
    if (staged) await seedCandidate(db, scratch, source, { id: cand }, u);
    const items: Item[] = staged ? [{ candidate_id: cand, candidate_expected_version: 2, source_breakdown_id: source, source_expected_version: 2 }] : [];
    return { inbox, scratch, source, cand, items };
  });
}

describe("trash_scratch", () => {
  it("applies atomically: Scratch trashed, candidates deleted, sources unstaged, Inbox touched", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const before = await snap(db);
      const t0 = Date.now();
      const envelope = await trash(db, t.scratch, 4, t.items);
      expect(envelope).toMatchObject({ status: "applied", result: { id: t.scratch } });
      const scratch = await stored(db, "bits", t.scratch);
      expect(scratch).toMatchObject({ version: 5, archived_at: null });
      expect(Number(scratch.deleted_at)).toBeGreaterThanOrEqual(t0 - 5000);
      expect(scratch.mtime).toBe(scratch.deleted_at);
      const after = await snap(db);
      expect(after.c).toBeNull();
      expect(after.s).toEqual([{ ...before.s[0], version: 3 }]);
      expect(await stored(db, "nodes", t.inbox)).toMatchObject({ mtime: scratch.deleted_at, version: 3 });
      expect(envelope.changes.staged_candidates).toEqual({ upserted: [], deleted: [t.cand] });
      expect(envelope.changes.scratch_breakdowns?.upserted).toHaveLength(1);
      expect(envelope.changes.bits?.upserted).toHaveLength(1);
      expect(envelope.changes.nodes?.upserted).toHaveLength(1);
    });
  });

  it("trashes a Scratch with no candidates and keeps the Breakdown rows", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner, user, false);
      const before = await snap(db);
      expect(await trash(db, t.scratch, 4, [])).toMatchObject({ status: "applied" });
      expect((await snap(db)).s).toEqual(before.s);
      expect(await stored(db, "bits", t.scratch)).toMatchObject({ version: 5 });
    });
  });

  it("returns already_applied for the complete postcondition, without writing", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      await trash(db, t.scratch, 4, t.items);
      const applied = await snap(db);
      expect(await trash(db, t.scratch, 4, t.items)).toMatchObject({ status: "already_applied" });
      expect(await reconcile(db, t.scratch, 4, t.items)).toMatchObject({ status: "already_applied" });
      expect(await snap(db)).toEqual(applied);
    });
  });

  it("reconciles not_applied for the exact precondition and writes nothing", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const before = await snap(db);
      const envelope = await reconcile(db, t.scratch, 4, t.items);
      expect(envelope).toMatchObject({ status: "not_applied", result: null });
      expect(envelope.changes.bits?.upserted[0]).toMatchObject({ id: t.scratch, version: 4 });
      expect(envelope.changes.staged_candidates?.upserted).toHaveLength(1);
      expect(await snap(db)).toEqual(before);
    });
  });

  it("conflicts when a candidate was staged after the confirmation, and removes nothing", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const late = randomUUID();
      await owner(async () => {
        await seedRow(db, t.scratch, { id: late });
        await seedCandidate(db, t.scratch, late, { version: 1 });
      });
      const before = await snap(db);
      const envelope = await trash(db, t.scratch, 4, t.items);
      expect(envelope.status).toBe("conflict");
      // The undisclosed candidate and its source are in `changes`, with the submitted ones.
      expect(envelope.changes.staged_candidates?.upserted).toHaveLength(2);
      expect(envelope.changes.scratch_breakdowns?.upserted.map((r) => r.id).sort()).toEqual([t.source, late].sort());
      expect(await reconcile(db, t.scratch, 4, t.items)).toMatchObject({ status: "conflict" });
      expect(await snap(db)).toEqual(before);
    });
  });

  it("conflicts when a confirmed candidate was removed before dispatch", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      await owner(() => db.query("delete from app.staged_candidates where id = $1", [t.cand]));
      const before = await snap(db);
      expect(await trash(db, t.scratch, 4, t.items)).toMatchObject({ status: "conflict" });
      expect(await snap(db)).toEqual(before);
    });
  });

  it.each<[string, string, unknown[]]>([
    ["source row version", "update app.scratch_breakdowns set version = 3 where id = $1", ["source"]],
    ["candidate version", "update app.staged_candidates set version = 3 where id = $1", ["cand"]],
    ["Scratch version", "update app.bits set version = 5 where id = $1", ["scratch"]],
    ["source row (consumed)", "update app.scratch_breakdowns set consumed_at = 5 where id = $1", ["source"]],
  ])("conflicts when the %s changed, in the command and the reconcile", async (_label, statement, [key]) => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      await owner(() => db.query(statement, [t[key as "source" | "cand" | "scratch"]]));
      const before = await snap(db);
      const envelope = await trash(db, t.scratch, 4, t.items);
      expect(envelope).toMatchObject({ status: "conflict" });
      expect(envelope.changes.bits?.upserted).toHaveLength(1);
      expect(await reconcile(db, t.scratch, 4, t.items)).toMatchObject({ status: "conflict" });
      expect(await snap(db)).toEqual(before);
    });
  });

  it("conflicts when the Scratch was archived or trashed elsewhere, and for a missing Scratch", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      await owner(() => db.query("update app.bits set archived_at = 300, version = 5 where id = $1", [t.scratch]));
      const before = await snap(db);
      expect(await trash(db, t.scratch, 5, t.items)).toMatchObject({ status: "conflict" });
      expect(await trash(db, t.scratch, 4, t.items)).toMatchObject({ status: "conflict" });
      expect(await trash(db, randomUUID(), 4, [])).toMatchObject({ status: "conflict", changes: {} });
      expect(await snap(db)).toEqual(before);
    });
  });

  it("rejects a Scratch that is not a child of the Inbox Node, with no write", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const ordinary = await owner(async () => {
        const node = await addNode(db, user.id, { title: "Ordinary", x: 1, y: 0, level: 0 });
        await db.query("update app.bits set parent_id = $2 where id = $1", [t.scratch, node]);
        return node;
      });
      const before = await snap(db);
      expect(await trash(db, t.scratch, 4, t.items)).toMatchObject({ status: "rejected", rejection: { code: "invalid_target" } });
      expect(await stored(db, "nodes", ordinary)).toMatchObject({ mtime: baseEntities.node.mtime });
      expect(await snap(db)).toEqual(before);
    });
  });

  it("raises 22023 for a repeated or malformed set in the command, where the reconcile says conflict", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const [only] = t.items;
      const second: Item = { ...only!, candidate_id: randomUUID() };
      const third: Item = { ...only!, source_breakdown_id: randomUUID() };
      const bad: unknown[] = [[only, only], [only, second], [only, third], { not: "array" }, [{ candidate_id: only!.candidate_id }], [{ ...only, candidate_expected_version: 0 }], [{ ...only, candidate_id: "nope" }]];
      for (const items of bad) {
        await db.query("savepoint s");
        expect(await expectDbError(() => trash(db, t.scratch, 4, items))).toBe("22023");
        await db.query("rollback to savepoint s");
        expect(await reconcile(db, t.scratch, 4, items)).toMatchObject({ status: "conflict" });
      }
      await db.query("savepoint s");
      expect(await expectDbError(() => call(db, "trash_scratch", [t.scratch, 4, null]))).toBe("22023");
      await db.query("rollback to savepoint s");
      expect(await call(db, "reconcile_trash_scratch", [t.scratch, 4, null])).toMatchObject({ status: "conflict" });
      expect(await stored(db, "bits", t.scratch)).toMatchObject({ version: 4, deleted_at: null });
    });
  });

  it("classifies a null set as conflict for a Scratch with no candidates, active and trashed", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner, user, false);
      expect(await call(db, "reconcile_trash_scratch", [t.scratch, 4, null])).toMatchObject({ status: "conflict" });
      expect(await call(db, "reconcile_trash_scratch", [t.scratch, null, JSON.stringify([])])).toMatchObject({ status: "conflict" });
      expect(await trash(db, t.scratch, 4, [])).toMatchObject({ status: "applied" });
      expect(await call(db, "reconcile_trash_scratch", [t.scratch, 4, null])).toMatchObject({ status: "conflict" });
      expect(await reconcile(db, t.scratch, 4, [])).toMatchObject({ status: "already_applied" });
    });
  });

  it("rejects only a missing account", async () => {
    await withActor(A(), async (db) => {
      expect(await trash(db, randomUUID(), 4, [])).toMatchObject({ status: "rejected", rejection: { code: "account_missing" } });
      expect(await reconcile(db, randomUUID(), 4, [])).toMatchObject({ status: "rejected", rejection: { code: "account_missing" } });
    });
  });

  it("an ambiguous Trash followed by a confirmed Trash restore reconciles as conflict and never re-trashes", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      await trash(db, t.scratch, 4, t.items);
      expect(await call(db, "restore_bit", [t.scratch])).toMatchObject({ status: "applied" });
      const restored = await snap(db);
      expect(await stored(db, "bits", t.scratch)).toMatchObject({ deleted_at: null, version: 6, x: 0, y: 0 });
      expect(restored.c).toBeNull();
      expect(await reconcile(db, t.scratch, 4, t.items)).toMatchObject({ status: "conflict" });
      expect(await trash(db, t.scratch, 4, t.items)).toMatchObject({ status: "conflict" });
      expect(await snap(db)).toEqual(restored);
    });
  });

  it("a Trash restore with another active Scratch returns the 0,0 sentinel with active rows and no candidate", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      await owner(() => addBit(db, user.id, { parentId: t.inbox, title: "Other", x: 0, y: 0 }));
      await trash(db, t.scratch, 4, t.items);
      await call(db, "restore_bit", [t.scratch]);
      expect(await stored(db, "bits", t.scratch)).toMatchObject({ x: 0, y: 0, deleted_at: null });
      const rows = (await db.query("select consumed_at, version from app.scratch_breakdowns where scratch_bit_id = $1", [t.scratch])).rows;
      expect(rows).toEqual([{ consumed_at: null, version: 3 }]);
      expect((await snap(db)).c).toBeNull();
    });
  });
});

describe("atomicity (Trash Scratch)", () => {
  it.each([
    ["the candidate delete", "after delete", "staged_candidates"],
    ["the source write", "after update", "scratch_breakdowns"],
    ["the Scratch write", "after update", "bits"],
    ["the Inbox Node touch", "after update", "nodes"],
  ])("rolls everything back when it fails after %s", async (_label, when, table) => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      await owner(async () => {
        await db.query(`create function app.refuse_write() returns trigger language plpgsql as $f$ begin raise exception 'refused' using errcode = 'P0001'; end $f$`);
        await db.query(`create trigger refuse_it ${when} on app.${table} for each row execute function app.refuse_write()`);
      });
      const before = await snap(db);
      await db.query("savepoint atomic");
      expect(await expectDbError(() => trash(db, t.scratch, 4, t.items))).toBe("P0001");
      await db.query("rollback to savepoint atomic");
      expect(await snap(db)).toEqual(before);
    });
  });
});

describe("cross-account and change set (Trash Scratch)", () => {
  it("leaves another account's rows untouched and sees nothing of them", async () => {
    await withActor(A(), async (db, owner) => {
      await setup(db, owner);
      const theirs = await setup(db, owner, stranger);
      const before = await owner(() => snap(db));
      expect(await trash(db, theirs.scratch, 4, theirs.items)).toMatchObject({ status: "conflict", changes: {} });
      expect(await reconcile(db, theirs.scratch, 4, theirs.items)).toMatchObject({ status: "conflict", changes: {} });
      expect(await owner(() => snap(db))).toEqual(before);
    });
    await withActor(A(), async (db, owner) => {
      const mine = await setup(db, owner);
      const theirs = await setup(db, owner, stranger);
      const own = await trash(db, mine.scratch, 4, [...mine.items, ...theirs.items]);
      expect(own.status).toBe("conflict");
      expect(own.changes.scratch_breakdowns?.upserted.map((r) => r.id)).toEqual([mine.source]);
      expect(await owner(() => stored(db, "bits", theirs.scratch))).toMatchObject({ version: 4, deleted_at: null });
    });
  });

  it("before + changes equals after for Trash Scratch, its reconcile and their rejections", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const empty = await owner(() => addBit(db, user.id, { parentId: t.inbox, title: "Empty", x: 1, y: 0, version: 2 }));
      const run = (fn: () => Promise<Envelope>) => assertChangeSet(db, user.id, fn as unknown as () => Promise<ChangeEnvelope>);
      await run(() => reconcile(db, t.scratch, 4, t.items));
      await run(() => trash(db, t.scratch, 5, t.items));
      await run(() => trash(db, t.scratch, 4, []));
      await run(() => trash(db, randomUUID(), 4, []));
      await run(() => trash(db, t.scratch, 4, t.items));
      await run(() => trash(db, t.scratch, 4, t.items));
      await run(() => reconcile(db, t.scratch, 4, t.items));
      await run(() => reconcile(db, t.scratch, 9, t.items));
      await run(() => trash(db, empty, 2, []));
      await run(() => reconcile(db, empty, 2, []));
    });
  });
});
