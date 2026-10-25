import { randomUUID } from "node:crypto";
import type { Client } from "pg";
import { beforeAll, describe, expect, it } from "vitest";
import { baseEntities } from "@/lib/db/boundary-cases";
import { scratchBreakdownToRow, stagedCandidateToRow } from "@/lib/db/row-mapping";
import type { ScratchBreakdown } from "@/lib/db/schema";
import { assertChangeSet, type Envelope as ChangeEnvelope } from "./helpers/change-set";
import { expectDbError, insertRow, withActor } from "./helpers/db";
import { account, addBit, addNode, authed, call, sql, stored, type Envelope, type Owner, type Row } from "./helpers/lifecycle";
import { createTestUser, type TestUser } from "./helpers/users";

// The Breakdown and Scratch title commands (Task 221), ported from the Dexie scenarios in
// inbox-operations.test.ts, scratch-breakdowns.test.ts and revision.test.ts, which are the answer key.

let user: TestUser;
let stranger: TestUser;

beforeAll(async () => {
  user = await createTestUser("bd");
  stranger = await createTestUser("bd-other");
});

const A = () => authed(user);
const GUEST = () => JSON.stringify({ role: "authenticated", sub: user.id, is_anonymous: true });

const add = (db: Client, id: string, scratch: string, version: number, content = "Idea") =>
  call(db, "add_breakdown", [id, scratch, version, content]);
const reconcileAdd = (db: Client, id: string, scratch: string, version: number, content = "Idea") =>
  call(db, "reconcile_add_breakdown", [id, scratch, version, content]);
const saveTitle = (db: Client, scratch: string, version: number, base: string, title: string) =>
  call(db, "save_scratch_title", [scratch, version, base, title]);
const save = (db: Client, id: string, version: number, base: [string, number], next: [string, number]) =>
  call(db, "save_breakdown", [id, version, base[0], base[1], next[0], next[1]]);
const reconcileSave = (db: Client, id: string, version: number, base: [string, number], next: [string, number]) =>
  call(db, "reconcile_save_breakdown", [id, version, base[0], base[1], next[0], next[1]]);
const del = (db: Client, id: string, version: number, scratch: string, scratchVersion: number) =>
  call(db, "delete_breakdown", [id, version, scratch, scratchVersion]);
const reconcileDel = (db: Client, id: string, version: number, scratch: string, scratchVersion: number) =>
  call(db, "reconcile_delete_breakdown", [id, version, scratch, scratchVersion]);
const stage = (db: Client, scratch: string, source: string, u = user) =>
  insertRow(db, "staged_candidates", stagedCandidateToRow({ ...baseEntities.stagedCandidate, id: randomUUID(), scratchBitId: scratch, sourceBreakdownId: source }, u.id));
const reconcileTitle = (db: Client, scratch: string, version: number, base: string, title: string) =>
  call(db, "reconcile_save_scratch_title", [scratch, version, base, title]);

async function breakdown(db: Client, id: string): Promise<Row | undefined> {
  return (await db.query("select to_jsonb(r.*) as r from app.scratch_breakdowns r where id = $1", [id])).rows[0]?.r;
}
const rowCount = async (db: Client, scratch: string) =>
  Number((await db.query("select count(*) as n from app.scratch_breakdowns where scratch_bit_id = $1", [scratch])).rows[0].n);

// The account's Inbox with one Scratch ("Scratch", version 5, mtime 7).
async function setup(db: Client, owner: Owner, u = user) {
  return owner(async () => {
    await account(db, u.id);
    const inbox = await addNode(db, u.id, { systemRole: "inbox", x: 8, y: 8, version: 3, mtime: 7 });
    const scratch = await addBit(db, u.id, { parentId: inbox, title: "Scratch", x: 0, y: 0, version: 5, mtime: 7 });
    return { inbox, scratch };
  });
}
const seedRow = (db: Client, scratch: string, o: Partial<ScratchBreakdown> = {}, u = user) =>
  insertRow(db, "scratch_breakdowns", scratchBreakdownToRow({ ...baseEntities.scratchBreakdown, id: randomUUID(), scratchBitId: scratch, ...o }, u.id));

describe("add_breakdown", () => {
  it("inserts one row at version 1 and increments the Scratch version once", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const id = randomUUID();
      const envelope = await add(db, id, t.scratch, 5);
      expect(envelope).toMatchObject({ status: "applied", result: { id } });
      expect(await breakdown(db, id)).toMatchObject({ scratch_bit_id: t.scratch, content: "Idea", order: 0, consumed_at: null, version: 1 });
      expect(await stored(db, "bits", t.scratch)).toMatchObject({ version: 6, mtime: 7, title: "Scratch" });
      expect(await stored(db, "nodes", t.inbox)).toMatchObject({ version: 3, mtime: 7 });
      expect(envelope.changes.bits?.upserted).toHaveLength(1);
      expect(envelope.changes.scratch_breakdowns?.upserted).toHaveLength(1);
    });
  });

  it("computes the next order from the rows of the Scratch, consumed rows included", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      await owner(async () => {
        await seedRow(db, t.scratch, { order: 4, consumedAt: 9 });
        await seedRow(db, t.scratch, { order: 2 });
      });
      const id = randomUUID();
      await add(db, id, t.scratch, 5);
      expect(await breakdown(db, id)).toMatchObject({ order: 5 });
    });
  });

  it("returns already_applied for the same command after it committed, without a write", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const id = randomUUID();
      await add(db, id, t.scratch, 5);
      expect(await add(db, id, t.scratch, 5)).toMatchObject({ status: "already_applied", result: { id } });
      expect(await stored(db, "bits", t.scratch)).toMatchObject({ version: 6 });
      expect(await rowCount(db, t.scratch)).toBe(1);
    });
  });

  it("is a conflict for a wrong Scratch version or a row id already held, and writes nothing", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const held = randomUUID();
      await owner(() => seedRow(db, t.scratch, { id: held, content: "Other" }));
      expect(await add(db, randomUUID(), t.scratch, 4)).toMatchObject({ status: "conflict" });
      const stale = await add(db, held, t.scratch, 5);
      expect(stale.status).toBe("conflict");
      expect(stale.changes.scratch_breakdowns?.upserted[0]).toMatchObject({ id: held, content: "Other" });
      expect(await stored(db, "bits", t.scratch)).toMatchObject({ version: 5 });
      expect(await rowCount(db, t.scratch)).toBe(1);
    });
  });

  it.each([
    ["trashed", "update app.bits set deleted_at = 5 where id = $1"],
    ["archived", "update app.bits set archived_at = 5 where id = $1"],
    ["not an Inbox Bit", "update app.bits set parent_id = (select id from app.nodes where user_id = $2 and system_role is null) where id = $1"],
  ] as const)("rejects a Scratch that is %s with invalid_target and writes nothing", async (_label, statement) => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      await owner(async () => {
        await addNode(db, user.id, { x: 2, y: 2 });
        await sql(db, statement, [t.scratch, user.id]);
      });
      expect(await add(db, randomUUID(), t.scratch, 5)).toMatchObject({ status: "rejected", rejection: { code: "invalid_target" } });
      expect(await rowCount(db, t.scratch)).toBe(0);
      expect(await stored(db, "bits", t.scratch)).toMatchObject({ version: 5 });
    });
  });

  it("rejects a Scratch under a trashed Inbox", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      await owner(() => sql(db, "update app.nodes set deleted_at = 5 where id = $1", [t.inbox]));
      expect(await add(db, randomUUID(), t.scratch, 5)).toMatchObject({ status: "rejected", rejection: { code: "invalid_target" } });
    });
  });

  it("rejects a missing Scratch with not_found and a missing account with account_missing", async () => {
    await withActor(A(), async (db, owner) => {
      await setup(db, owner);
      expect(await add(db, randomUUID(), randomUUID(), 1)).toMatchObject({ status: "rejected", rejection: { code: "not_found" }, changes: {} });
    });
    await withActor(A(), async (db) => {
      expect(await add(db, randomUUID(), randomUUID(), 1)).toMatchObject({ rejection: { code: "account_missing" } });
    });
  });

  it.each([
    [299, true],
    [300, false],
  ] as const)("stops a guest at 300 Breakdown rows (%i rows now)", async (rows, ok) => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      await owner(() => sql(db, `insert into app.scratch_breakdowns (id, user_id, scratch_bit_id, content, "order", created_at)
        select gen_random_uuid(), $1, $2, 'f', g, 1 from generate_series(1, $3::int) g`, [user.id, t.scratch, rows]));
      await sql(db, "select set_config('request.jwt.claims', $1, true)", [GUEST()]);
      const envelope = await add(db, randomUUID(), t.scratch, 5);
      if (ok) expect(envelope.status).toBe("applied");
      else {
        expect(envelope).toMatchObject({ status: "rejected", rejection: { code: "account_limit", table: "scratch_breakdowns", limit: 300 } });
        expect(await stored(db, "bits", t.scratch)).toMatchObject({ version: 5 });
      }
    });
  }, 60_000);

  it("stops a real account at 5000 Breakdown rows", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      await owner(() => sql(db, `insert into app.scratch_breakdowns (id, user_id, scratch_bit_id, content, "order", created_at)
        select gen_random_uuid(), $1, $2, 'f', g, 1 from generate_series(1, 5000) g`, [user.id, t.scratch]));
      expect(await add(db, randomUUID(), t.scratch, 5)).toMatchObject({ status: "rejected", rejection: { code: "account_limit", limit: 5000 } });
    });
  }, 60_000);

  it("fails with a CHECK error and writes nothing for empty content", async () => {
    let scratch = "";
    await withActor(A(), async (db, owner) => {
      scratch = (await setup(db, owner)).scratch;
      expect(await expectDbError(() => add(db, randomUUID(), scratch, 5, ""))).toBe("23514");
    });
  });
});

describe("reconcile_add_breakdown", () => {
  it("classifies not_applied, already_applied and conflict from the exact versions", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const id = randomUUID();
      expect(await reconcileAdd(db, id, t.scratch, 5)).toMatchObject({ status: "not_applied", changes: { bits: { upserted: [{ id: t.scratch }] } } });
      await add(db, id, t.scratch, 5);
      const done = await reconcileAdd(db, id, t.scratch, 5);
      expect(done).toMatchObject({ status: "already_applied" });
      expect(done.changes.scratch_breakdowns?.upserted[0]).toMatchObject({ id, version: 1 });
      expect(await reconcileAdd(db, id, t.scratch, 5, "Different")).toMatchObject({ status: "conflict" });
      expect(await reconcileAdd(db, randomUUID(), t.scratch, 5)).toMatchObject({ status: "conflict" });
    });
  });

  it("an ambiguous Add followed by a confirmed Delete reconciles as conflict and never recreates the row", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const id = randomUUID();
      await add(db, id, t.scratch, 5);
      // The confirmed Delete: the row is gone and the Scratch advanced again.
      expect(await del(db, id, 1, t.scratch, 6)).toMatchObject({ status: "applied" });
      expect(await reconcileAdd(db, id, t.scratch, 5)).toMatchObject({ status: "conflict" });
      expect(await rowCount(db, t.scratch)).toBe(0);
    });
  });

  it("is conflict for an inactive Scratch and rejects only account_missing", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      await owner(() => sql(db, "update app.bits set deleted_at = 5 where id = $1", [t.scratch]));
      expect(await reconcileAdd(db, randomUUID(), t.scratch, 5)).toMatchObject({ status: "conflict" });
      expect(await reconcileAdd(db, randomUUID(), randomUUID(), 1)).toMatchObject({ status: "conflict", changes: {} });
    });
    await withActor(A(), async (db) => {
      expect(await reconcileAdd(db, randomUUID(), randomUUID(), 1)).toMatchObject({ status: "rejected", rejection: { code: "account_missing" } });
    });
  });
});

describe("save_scratch_title", () => {
  it("sets the title and mtime and increments the Scratch version once; the Inbox keeps its version", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const envelope = await saveTitle(db, t.scratch, 5, "Scratch", "Renamed");
      expect(envelope).toMatchObject({ status: "applied" });
      const row = await stored(db, "bits", t.scratch);
      expect(row).toMatchObject({ title: "Renamed", version: 6 });
      expect(Number(row.mtime)).toBeGreaterThan(7);
      expect(await stored(db, "nodes", t.inbox)).toMatchObject({ version: 3, mtime: 7 });
      expect(envelope.changes.bits?.upserted[0]).toMatchObject({ id: t.scratch, title: "Renamed", version: 6 });
    });
  });

  it("returns already_applied for the intended title at the next version, without a write", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      await saveTitle(db, t.scratch, 5, "Scratch", "Renamed");
      expect(await saveTitle(db, t.scratch, 5, "Scratch", "Renamed")).toMatchObject({ status: "already_applied" });
      expect(await stored(db, "bits", t.scratch)).toMatchObject({ version: 6 });
    });
  });

  it("rejects an unchanged title with invalid_input and never falls back to last-write-wins on a conflict", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      expect(await saveTitle(db, t.scratch, 5, "Scratch", "Scratch")).toMatchObject({ status: "rejected", rejection: { code: "invalid_input" } });
      expect(await saveTitle(db, t.scratch, 4, "Scratch", "Renamed")).toMatchObject({ status: "conflict" });
      expect(await saveTitle(db, t.scratch, 5, "Another base", "Renamed")).toMatchObject({ status: "conflict" });
      expect(await stored(db, "bits", t.scratch)).toMatchObject({ title: "Scratch", version: 5 });
    });
  });

  it.each([
    ["trashed", "update app.bits set deleted_at = 5 where id = $1"],
    ["archived", "update app.bits set archived_at = 5 where id = $1"],
  ] as const)("rejects a %s Scratch with invalid_target and writes nothing", async (_label, statement) => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      await owner(() => sql(db, statement, [t.scratch]));
      expect(await saveTitle(db, t.scratch, 5, "Scratch", "Renamed")).toMatchObject({ status: "rejected", rejection: { code: "invalid_target" } });
      expect(await stored(db, "bits", t.scratch)).toMatchObject({ title: "Scratch", version: 5 });
    });
  });

  it("rejects a missing Scratch with not_found and a missing account with account_missing", async () => {
    await withActor(A(), async (db, owner) => {
      await setup(db, owner);
      expect(await saveTitle(db, randomUUID(), 1, "a", "b")).toMatchObject({ rejection: { code: "not_found" }, changes: {} });
    });
    await withActor(A(), async (db) => {
      expect(await saveTitle(db, randomUUID(), 1, "a", "b")).toMatchObject({ rejection: { code: "account_missing" } });
    });
  });

  it("fails with a CHECK error and writes nothing for an empty title", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      expect(await expectDbError(() => saveTitle(db, t.scratch, 5, "Scratch", ""))).toBe("23514");
    });
  });
});

describe("reconcile_save_scratch_title", () => {
  it("classifies not_applied, already_applied and conflict", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      expect(await reconcileTitle(db, t.scratch, 5, "Scratch", "Renamed")).toMatchObject({ status: "not_applied" });
      await saveTitle(db, t.scratch, 5, "Scratch", "Renamed");
      expect(await reconcileTitle(db, t.scratch, 5, "Scratch", "Renamed")).toMatchObject({ status: "already_applied" });
      // A later edit to the base title again advanced the version.
      await owner(() => sql(db, "update app.bits set title = 'Scratch', version = 7 where id = $1", [t.scratch]));
      expect(await reconcileTitle(db, t.scratch, 5, "Scratch", "Renamed")).toMatchObject({ status: "conflict" });
      expect(await reconcileTitle(db, randomUUID(), 1, "a", "b")).toMatchObject({ status: "conflict", changes: {} });
    });
    await withActor(A(), async (db) => {
      expect(await reconcileTitle(db, randomUUID(), 1, "a", "b")).toMatchObject({ status: "rejected", rejection: { code: "account_missing" } });
    });
  });
});

describe("save_breakdown", () => {
  it("updates content and order once and increments only the row version", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const id = randomUUID();
      await owner(() => seedRow(db, t.scratch, { id, content: "Idea", order: 0, version: 3 }));
      const envelope = await save(db, id, 3, ["Idea", 0], ["Better", 2]);
      expect(envelope).toMatchObject({ status: "applied", result: { id } });
      expect(await breakdown(db, id)).toMatchObject({ content: "Better", order: 2, version: 4, consumed_at: null });
      expect(await stored(db, "bits", t.scratch)).toMatchObject({ version: 5, mtime: 7 });
      expect(envelope.changes.scratch_breakdowns?.upserted[0]).toMatchObject({ id, version: 4 });
    });
  });

  it("returns already_applied for the intended values at the next version, without a write", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const id = randomUUID();
      await owner(() => seedRow(db, t.scratch, { id, version: 3 }));
      await save(db, id, 3, ["Idea", 0], ["Better", 2]);
      expect(await save(db, id, 3, ["Idea", 0], ["Better", 2])).toMatchObject({ status: "already_applied" });
      expect(await breakdown(db, id)).toMatchObject({ version: 4 });
    });
  });

  it("rejects a save that changes nothing with invalid_input", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const id = randomUUID();
      await owner(() => seedRow(db, t.scratch, { id }));
      expect(await save(db, id, 1, ["Idea", 0], ["Idea", 0])).toMatchObject({ status: "rejected", rejection: { code: "invalid_input" } });
      expect(await breakdown(db, id)).toMatchObject({ version: 1 });
    });
  });

  it.each([
    ["the version", 2, ["Idea", 0]],
    ["the base content", 1, ["Old", 0]],
    ["the base order", 1, ["Idea", 3]],
  ] as const)("is a conflict when %s differs, and writes nothing", async (_label, version, base) => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const id = randomUUID();
      await owner(() => seedRow(db, t.scratch, { id }));
      const envelope = await save(db, id, version, [base[0], base[1]], ["Better", 1]);
      expect(envelope.status).toBe("conflict");
      expect(envelope.changes.scratch_breakdowns?.upserted[0]).toMatchObject({ id, content: "Idea", version: 1 });
      expect(await breakdown(db, id)).toMatchObject({ content: "Idea", order: 0, version: 1 });
    });
  });

  it("rejects a staged row without unstaging it or changing either record", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const id = randomUUID();
      await owner(async () => {
        await seedRow(db, t.scratch, { id });
        await stage(db, t.scratch, id);
      });
      const envelope = await save(db, id, 1, ["Idea", 0], ["Better", 1]);
      expect(envelope).toMatchObject({ status: "rejected", rejection: { code: "invalid_target" } });
      expect(envelope.changes.staged_candidates?.upserted).toHaveLength(1);
      expect(await breakdown(db, id)).toMatchObject({ content: "Idea", version: 1 });
      expect((await db.query("select count(*) as n from app.staged_candidates")).rows[0].n).toBe("1");
    });
  });

  it.each([
    ["consumed", "update app.scratch_breakdowns set consumed_at = 9 where id = $1"],
    ["under a trashed Scratch", "update app.bits set deleted_at = 5 where id = (select scratch_bit_id from app.scratch_breakdowns where id = $1)"],
    ["under an archived Scratch", "update app.bits set archived_at = 5 where id = (select scratch_bit_id from app.scratch_breakdowns where id = $1)"],
  ] as const)("rejects a row that is %s with invalid_target", async (_label, statement) => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const id = randomUUID();
      await owner(async () => {
        await seedRow(db, t.scratch, { id });
        await sql(db, statement, [id]);
      });
      expect(await save(db, id, 1, ["Idea", 0], ["Better", 1])).toMatchObject({ status: "rejected", rejection: { code: "invalid_target" } });
      expect(await breakdown(db, id)).toMatchObject({ content: "Idea", version: 1 });
    });
  });

  it("rejects a missing row with not_found and a missing account with account_missing", async () => {
    await withActor(A(), async (db, owner) => {
      await setup(db, owner);
      expect(await save(db, randomUUID(), 1, ["a", 0], ["b", 0])).toMatchObject({ rejection: { code: "not_found" }, changes: {} });
    });
    await withActor(A(), async (db) => {
      expect(await save(db, randomUUID(), 1, ["a", 0], ["b", 0])).toMatchObject({ rejection: { code: "account_missing" } });
    });
  });

  it("fails with a CHECK error and writes nothing for empty content", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const id = randomUUID();
      await owner(() => seedRow(db, t.scratch, { id }));
      expect(await expectDbError(() => save(db, id, 1, ["Idea", 0], ["", 0]))).toBe("23514");
    });
  });
});

describe("reconcile_save_breakdown", () => {
  it("classifies not_applied, already_applied and conflict, and reports a candidate as conflict", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const id = randomUUID();
      await owner(() => seedRow(db, t.scratch, { id }));
      expect(await reconcileSave(db, id, 1, ["Idea", 0], ["Better", 1])).toMatchObject({ status: "not_applied" });
      await save(db, id, 1, ["Idea", 0], ["Better", 1]);
      expect(await reconcileSave(db, id, 1, ["Idea", 0], ["Better", 1])).toMatchObject({ status: "already_applied" });
      expect(await reconcileSave(db, id, 1, ["Idea", 0], ["Different", 1])).toMatchObject({ status: "conflict" });
      await owner(() => stage(db, t.scratch, id));
      const staged = await reconcileSave(db, id, 1, ["Idea", 0], ["Better", 1]);
      expect(staged.status).toBe("conflict");
      expect(staged.changes.staged_candidates?.upserted).toHaveLength(1);
    });
    await withActor(A(), async (db) => {
      expect(await reconcileSave(db, randomUUID(), 1, ["a", 0], ["b", 0])).toMatchObject({ status: "rejected", rejection: { code: "account_missing" } });
    });
  });
});

describe("delete_breakdown", () => {
  it("hard-deletes the row and increments the Scratch version once", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const id = randomUUID();
      const other = randomUUID();
      await owner(async () => {
        await seedRow(db, t.scratch, { id, version: 2 });
        await seedRow(db, t.scratch, { id: other, order: 1 });
      });
      const envelope = await del(db, id, 2, t.scratch, 5);
      expect(envelope).toMatchObject({ status: "applied", result: { id } });
      expect(await breakdown(db, id)).toBeUndefined();
      expect(await breakdown(db, other)).toMatchObject({ version: 1 });
      expect(await stored(db, "bits", t.scratch)).toMatchObject({ version: 6, mtime: 7 });
      expect(envelope.changes.scratch_breakdowns).toEqual({ upserted: [], deleted: [id] });
    });
  });

  it("returns already_applied once it ran, without a second increment", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const id = randomUUID();
      await owner(() => seedRow(db, t.scratch, { id }));
      await del(db, id, 1, t.scratch, 5);
      expect(await del(db, id, 1, t.scratch, 5)).toMatchObject({ status: "already_applied" });
      expect(await stored(db, "bits", t.scratch)).toMatchObject({ version: 6 });
    });
  });

  it("is a conflict for a wrong row or Scratch version, and writes nothing", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const id = randomUUID();
      await owner(() => seedRow(db, t.scratch, { id }));
      expect(await del(db, id, 2, t.scratch, 5)).toMatchObject({ status: "conflict" });
      expect(await del(db, id, 1, t.scratch, 4)).toMatchObject({ status: "conflict" });
      expect(await breakdown(db, id)).toMatchObject({ version: 1 });
      expect(await stored(db, "bits", t.scratch)).toMatchObject({ version: 5 });
    });
  });

  it("rejects a staged row without cascading the candidate or deleting the row", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const id = randomUUID();
      await owner(async () => {
        await seedRow(db, t.scratch, { id });
        await stage(db, t.scratch, id);
      });
      const envelope = await del(db, id, 1, t.scratch, 5);
      expect(envelope).toMatchObject({ status: "rejected", rejection: { code: "invalid_target" } });
      expect(envelope.changes.staged_candidates?.upserted).toHaveLength(1);
      expect(await breakdown(db, id)).toMatchObject({ version: 1 });
      expect((await db.query("select count(*) as n from app.staged_candidates")).rows[0].n).toBe("1");
    });
  });

  it("rejects a consumed row, a row of another Scratch and an inactive Scratch", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const consumed = randomUUID();
      const foreign = randomUUID();
      const second = await owner(async () => {
        const s = await addBit(db, user.id, { parentId: t.inbox, x: 1, y: 0, version: 5 });
        await seedRow(db, t.scratch, { id: consumed, consumedAt: 9 });
        await seedRow(db, s, { id: foreign });
        return s;
      });
      expect(await del(db, consumed, 1, t.scratch, 5)).toMatchObject({ status: "rejected", rejection: { code: "invalid_target" } });
      expect(await del(db, foreign, 1, t.scratch, 5)).toMatchObject({ status: "rejected", rejection: { code: "invalid_target" } });
      await owner(() => sql(db, "update app.bits set deleted_at = 5 where id = $1", [second]));
      expect(await del(db, foreign, 1, second, 5)).toMatchObject({ status: "rejected", rejection: { code: "invalid_target" } });
      expect(await breakdown(db, foreign)).toMatchObject({ version: 1 });
      expect(await stored(db, "bits", t.scratch)).toMatchObject({ version: 5 });
    });
  });

  it("rejects a missing row with not_found and a missing account with account_missing", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      expect(await del(db, randomUUID(), 1, t.scratch, 5)).toMatchObject({ status: "rejected", rejection: { code: "not_found" } });
      expect(await del(db, randomUUID(), 1, randomUUID(), 5)).toMatchObject({ rejection: { code: "not_found" }, changes: {} });
    });
    await withActor(A(), async (db) => {
      expect(await del(db, randomUUID(), 1, randomUUID(), 5)).toMatchObject({ rejection: { code: "account_missing" } });
    });
  });
});

describe("reconcile_delete_breakdown", () => {
  it("classifies not_applied, already_applied and conflict", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const id = randomUUID();
      await owner(() => seedRow(db, t.scratch, { id }));
      expect(await reconcileDel(db, id, 1, t.scratch, 5)).toMatchObject({ status: "not_applied" });
      await del(db, id, 1, t.scratch, 5);
      expect(await reconcileDel(db, id, 1, t.scratch, 5)).toMatchObject({ status: "already_applied" });
      await owner(() => sql(db, "update app.bits set version = 9 where id = $1", [t.scratch]));
      expect(await reconcileDel(db, id, 1, t.scratch, 5)).toMatchObject({ status: "conflict" });
    });
  });

  it("a staged row reconciles as conflict, and a later Add of another row does not make a Delete look done", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const id = randomUUID();
      await owner(async () => {
        await seedRow(db, t.scratch, { id });
        await stage(db, t.scratch, id);
      });
      const staged = await reconcileDel(db, id, 1, t.scratch, 5);
      expect(staged.status).toBe("conflict");
      expect(staged.changes.staged_candidates?.upserted).toHaveLength(1);
    });
    await withActor(A(), async (db) => {
      expect(await reconcileDel(db, randomUUID(), 1, randomUUID(), 5)).toMatchObject({ status: "rejected", rejection: { code: "account_missing" } });
    });
  });
});


describe("cross-account and change set", () => {
  it("leaves another account's rows untouched and sees nothing of them", async () => {
    await withActor(A(), async (db, owner) => {
      await setup(db, owner);
      const theirs = await setup(db, owner, stranger);
      const theirRow = randomUUID();
      await owner(() => seedRow(db, theirs.scratch, { id: theirRow, content: "Theirs" }, stranger));
      // Their Scratch is not found, an id they hold fails on the primary key, and nothing of theirs changes.
      expect(await add(db, randomUUID(), theirs.scratch, 5)).toMatchObject({ status: "rejected", rejection: { code: "not_found" }, changes: {} });
      expect(await saveTitle(db, theirs.scratch, 5, "Scratch", "Mine now")).toMatchObject({ rejection: { code: "not_found" }, changes: {} });
      expect(await reconcileAdd(db, theirRow, theirs.scratch, 5, "Theirs")).toMatchObject({ status: "conflict", changes: {} });
      expect(await reconcileTitle(db, theirs.scratch, 5, "Scratch", "Mine now")).toMatchObject({ status: "conflict", changes: {} });
      expect(await save(db, theirRow, 1, ["Theirs", 0], ["Mine now", 0])).toMatchObject({ rejection: { code: "not_found" }, changes: {} });
      expect(await del(db, theirRow, 1, theirs.scratch, 5)).toMatchObject({ rejection: { code: "not_found" }, changes: {} });
      expect(await reconcileSave(db, theirRow, 1, ["Theirs", 0], ["Mine now", 0])).toMatchObject({ status: "conflict", changes: {} });
      expect(await reconcileDel(db, theirRow, 1, theirs.scratch, 5)).toMatchObject({ status: "conflict", changes: {} });
      expect(await owner(() => stored(db, "bits", theirs.scratch))).toMatchObject({ title: "Scratch", version: 5 });
      expect(await owner(() => breakdown(db, theirRow))).toMatchObject({ content: "Theirs", version: 1 });
    });
    await withActor(A(), async (db, owner) => {
      const mine = await setup(db, owner);
      const theirs = await setup(db, owner, stranger);
      const theirRow = randomUUID();
      await owner(() => seedRow(db, theirs.scratch, { id: theirRow, content: "Theirs" }, stranger));
      await db.query("savepoint dup");
      expect(await expectDbError(() => add(db, theirRow, mine.scratch, 5))).toBe("23505");
      await db.query("rollback to savepoint dup");
      expect(await owner(() => breakdown(db, theirRow))).toMatchObject({ content: "Theirs", scratch_bit_id: theirs.scratch, version: 1 });
      expect(await owner(() => stored(db, "bits", mine.scratch))).toMatchObject({ version: 5 });
    });
  });

  it("before + changes equals after for the Breakdown commands and rejections", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const id = randomUUID();
      const run = (fn: () => Promise<Envelope>) => assertChangeSet(db, user.id, fn as unknown as () => Promise<ChangeEnvelope>);
      await run(() => add(db, id, t.scratch, 5));
      await run(() => add(db, id, t.scratch, 5));
      await run(() => add(db, randomUUID(), t.scratch, 1));
      await run(() => add(db, randomUUID(), randomUUID(), 1));
      await run(() => saveTitle(db, t.scratch, 6, "Scratch", "Renamed"));
      await run(() => saveTitle(db, t.scratch, 7, "Renamed", "Renamed"));
      await run(() => saveTitle(db, t.scratch, 1, "Renamed", "Other"));
      await run(() => reconcileAdd(db, id, t.scratch, 5));
      await run(() => reconcileTitle(db, t.scratch, 6, "Scratch", "Renamed"));
      const row = randomUUID();
      const staged = randomUUID();
      await owner(async () => {
        await seedRow(db, t.scratch, { id: row, order: 5 });
        await seedRow(db, t.scratch, { id: staged, order: 6 });
        await stage(db, t.scratch, staged);
      });
      await run(() => save(db, row, 1, ["Idea", 5], ["Better", 5]));
      await run(() => save(db, row, 1, ["Idea", 5], ["Better", 5]));
      await run(() => save(db, row, 1, ["Idea", 5], ["Idea", 5]));
      await run(() => save(db, staged, 1, ["Idea", 6], ["Better", 6]));
      await run(() => save(db, randomUUID(), 1, ["a", 0], ["b", 0]));
      await run(() => reconcileSave(db, row, 1, ["Idea", 5], ["Better", 5]));
      await run(() => reconcileSave(db, staged, 1, ["Idea", 6], ["Better", 6]));
      await run(() => del(db, staged, 1, t.scratch, 7));
      await run(() => del(db, row, 2, t.scratch, 7));
      await run(() => reconcileDel(db, row, 2, t.scratch, 7));
      await run(() => del(db, row, 2, t.scratch, 7));
      await run(() => del(db, row, 2, t.scratch, 7));
      await run(() => reconcileDel(db, row, 2, t.scratch, 7));
    });
  });
});
