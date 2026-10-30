import { randomUUID } from "node:crypto";
import type { Client } from "pg";
import { beforeAll, describe, expect, it } from "vitest";
import { becomeActor, connect, withActor } from "./helpers/db";
import { adminClient, createTestUser, type TestUser } from "./helpers/users";

// Task 235, Stage 1: the account-deletion fallback (SCHEMA §Account deletion). delete_my_account()
// records the request for the caller only; from then on every client-callable function rejects the
// account with `account_deleting`.

type Envelope = { status: string; result: unknown; changes: Record<string, unknown>; rejection?: { code: string } };

let user: TestUser;
let other: TestUser;

beforeAll(async () => {
  user = await createTestUser("dma");
  other = await createTestUser("dmb");
});

const as = (u: TestUser) => ({ role: "authenticated" as const, userId: u.id });

async function ensure(db: Client): Promise<Envelope> {
  const { rows } = await db.query("select public.ensure_account() as e");
  return rows[0].e as Envelope;
}
async function requestDeletion(db: Client): Promise<Envelope> {
  const { rows } = await db.query("select public.delete_my_account() as e");
  return rows[0].e as Envelope;
}
async function requestedAt(db: Client, userId: string): Promise<number | null> {
  await becomeActor(db, { role: "owner" });
  const { rows } = await db.query("select deletion_requested_at::text as t from app.accounts where user_id = $1", [userId]);
  return rows.length === 0 ? null : rows[0].t === null ? null : Number(rows[0].t);
}

// One call per client-callable function, with arguments of the right shape so the argument checks
// that come before the account check pass. The catalog test below fails when a function is missing.
const uuid = () => `'${randomUUID()}'::uuid`;
const RESERVED = `'[]'::jsonb`;
// Result, source and candidate rows with the ids an Undo reads before it looks at the account.
const RESULT = () => `jsonb_build_object('id', ${uuid()}, 'level', 1, 'parent_id', ${uuid()})`;
const SOURCE = () => `jsonb_build_object('id', ${uuid()}, 'scratch_bit_id', ${uuid()})`;
const CANDIDATE = () => `jsonb_build_object('id', ${uuid()})`;
const CALLS: Record<string, () => string> = {
  add_breakdown: () => `public.add_breakdown(${uuid()}, ${uuid()}, 1, 'x')`,
  archive_bit: () => `public.archive_bit(${uuid()})`,
  archive_node: () => `public.archive_node(${uuid()})`,
  archive_scratch: () => `public.archive_scratch(${uuid()}, 1)`,
  classify_archive_scratch_recovery: () => `public.classify_archive_scratch_recovery(${uuid()}, 1, 1)`,
  cleanup_expired_trash: () => `public.cleanup_expired_trash()`,
  create_bit: () =>
    `public.create_bit(${uuid()}, jsonb_build_object('title', 't', 'icon', 'i', 'parent_id', ${uuid()}, 'x', 0, 'y', 0))`,
  create_chunk: () =>
    `public.create_chunk(${uuid()}, jsonb_build_object('title', 't', 'parent_id', ${uuid()}, 'order', 1))`,
  create_node: () =>
    `public.create_node(${uuid()}, jsonb_build_object('title', 't', 'color', 'c', 'icon', 'i', 'x', 0, 'y', 0))`,
  delete_breakdown: () => `public.delete_breakdown(${uuid()}, 1, ${uuid()}, 1)`,
  delete_chunk: () => `public.delete_chunk(${uuid()})`,
  empty_trash: () => `public.empty_trash()`,
  ensure_account: () => `public.ensure_account(${RESERVED})`,
  get_snapshot: () => `public.get_snapshot()`,
  hard_delete_bit: () => `public.hard_delete_bit(${uuid()})`,
  hard_delete_node: () => `public.hard_delete_node(${uuid()})`,
  place_direct_breakdown: () =>
    `public.place_direct_breakdown(${uuid()}, ${uuid()}, ${uuid()}, 1, 'node', 't', ${uuid()}, '{}'::uuid[], 0, 0)`,
  place_staged_candidate: () =>
    `public.place_staged_candidate(${uuid()}, ${uuid()}, ${uuid()}, 1, 'node', 't', ${uuid()}, '{}'::uuid[], 0, 0, ${uuid()}, 1)`,
  promote_bit_to_node: () => `public.promote_bit_to_node(${uuid()}, ${RESERVED})`,
  reconcile_add_breakdown: () => `public.reconcile_add_breakdown(${uuid()}, ${uuid()}, 1, 'x')`,
  reconcile_delete_breakdown: () => `public.reconcile_delete_breakdown(${uuid()}, 1, ${uuid()}, 1)`,
  reconcile_place_direct_breakdown: () =>
    `public.reconcile_place_direct_breakdown(${uuid()}, ${uuid()}, ${uuid()}, 1, 'node', 't', ${uuid()}, '{}'::uuid[], 0, 0)`,
  reconcile_place_staged_candidate: () =>
    `public.reconcile_place_staged_candidate(${uuid()}, ${uuid()}, ${uuid()}, 1, 'node', 't', ${uuid()}, '{}'::uuid[], 0, 0, ${uuid()}, 1)`,
  reconcile_save_breakdown: () => `public.reconcile_save_breakdown(${uuid()}, 1, 'a', 1, 'b', 1)`,
  reconcile_save_scratch_title: () => `public.reconcile_save_scratch_title(${uuid()}, 1, 'a', 'b')`,
  reconcile_stage_candidate: () => `public.reconcile_stage_candidate(${uuid()}, ${uuid()}, ${uuid()}, 1, 'node')`,
  reconcile_trash_scratch: () => `public.reconcile_trash_scratch(${uuid()}, 1, '[]'::jsonb)`,
  reconcile_undo_direct_placement: () => `public.reconcile_undo_direct_placement(${RESULT()}, ${SOURCE()})`,
  reconcile_undo_staged_placement: () => `public.reconcile_undo_staged_placement(${RESULT()}, ${SOURCE()}, ${CANDIDATE()})`,
  reconcile_unstage_candidate: () => `public.reconcile_unstage_candidate(${uuid()}, 1, ${uuid()}, 1)`,
  reorder_chunks: () => `public.reorder_chunks(${uuid()}, '{}'::uuid[])`,
  restore_bit: () => `public.restore_bit(${uuid()}, ${RESERVED})`,
  restore_node: () => `public.restore_node(${uuid()}, ${RESERVED})`,
  save_breakdown: () => `public.save_breakdown(${uuid()}, 1, 'a', 1, 'b', 1)`,
  save_scratch_title: () => `public.save_scratch_title(${uuid()}, 1, 'a', 'b')`,
  soft_delete_bit: () => `public.soft_delete_bit(${uuid()})`,
  soft_delete_node: () => `public.soft_delete_node(${uuid()})`,
  stage_candidate: () => `public.stage_candidate(${uuid()}, ${uuid()}, ${uuid()}, 1, 'node')`,
  trash_scratch: () => `public.trash_scratch(${uuid()}, 1, '[]'::jsonb)`,
  unarchive_bit: () => `public.unarchive_bit(${uuid()}, ${RESERVED})`,
  unarchive_node: () => `public.unarchive_node(${uuid()}, ${RESERVED})`,
  undo_direct_placement: () => `public.undo_direct_placement(${RESULT()}, ${SOURCE()})`,
  undo_staged_placement: () => `public.undo_staged_placement(${RESULT()}, ${SOURCE()}, ${CANDIDATE()})`,
  unstage_candidate: () => `public.unstage_candidate(${uuid()}, 1, ${uuid()}, 1)`,
  update_bit: () => `public.update_bit(${uuid()}, '{}'::jsonb, false)`,
  update_chunk: () => `public.update_chunk(${uuid()}, '{}'::jsonb, false)`,
  update_node: () => `public.update_node(${uuid()}, '{}'::jsonb, ${RESERVED})`,
};

async function clientCallable(db: Client): Promise<string[]> {
  await becomeActor(db, { role: "owner" });
  const { rows } = await db.query(
    `select distinct p.proname as name from pg_proc p
      where p.pronamespace = 'public'::regnamespace and p.prokind = 'f'
        and has_function_privilege('authenticated', p.oid, 'execute')
        and p.proname <> 'delete_my_account'
        and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
      order by 1`,
  );
  return rows.map((r) => r.name as string);
}

async function codeOf(db: Client, name: string): Promise<string | undefined> {
  await db.query("savepoint call");
  try {
    const { rows } = await db.query(`select ${CALLS[name]()} as r`);
    await db.query("release savepoint call");
    return (rows[0].r as Envelope).rejection?.code;
  } catch (error) {
    await db.query("rollback to savepoint call");
    return `error:${(error as { message?: string }).message}`;
  }
}

describe("delete_my_account()", () => {
  it("records the request for the caller only", async () => {
    await withActor(as(user), async (db) => {
      expect((await ensure(db)).status).toBe("applied");
      await becomeActor(db, as(other));
      await ensure(db);
      await becomeActor(db, as(user));
      const envelope = await requestDeletion(db);
      expect(envelope).toEqual({ status: "applied", result: null, changes: {} });
      expect(await requestedAt(db, user.id)).toBeGreaterThan(0);
      expect(await requestedAt(db, other.id)).toBeNull();
    });
  });

  it("is idempotent and keeps the first request time", async () => {
    await withActor(as(user), async (db) => {
      await ensure(db);
      await requestDeletion(db);
      const first = await requestedAt(db, user.id);
      await becomeActor(db, as(user));
      expect((await requestDeletion(db)).status).toBe("already_applied");
      expect(await requestedAt(db, user.id)).toBe(first);
    });
  });

  it("rejects a caller with no account row and writes nothing", async () => {
    const fresh = await createTestUser("dmn");
    await withActor(as(fresh), async (db) => {
      const envelope = await requestDeletion(db);
      expect(envelope.status).toBe("rejected");
      expect(envelope.rejection).toEqual({ code: "account_missing" });
      expect(await requestedAt(db, fresh.id)).toBeNull();
    });
  });

  it("needs a signed-in caller, and is closed to anon and service_role", async () => {
    await withActor({ role: "authenticated" }, async (db) => {
      await expect(requestDeletion(db)).rejects.toMatchObject({ code: "28000" });
    });
    for (const role of ["anon", "service_role"] as const) {
      await withActor({ role }, async (db) => {
        await expect(requestDeletion(db)).rejects.toMatchObject({ code: "42501" });
      });
    }
  });

  it("is a security-definer write function owned by griddo_writer, with no other function changed in kind", async () => {
    const db = await connect();
    try {
      const { rows } = await db.query(
        `select p.proname as name, pg_get_userbyid(p.proowner) as owner, p.prosecdef as definer,
                has_function_privilege('authenticated', p.oid, 'execute') as authed,
                has_function_privilege('anon', p.oid, 'execute') as anon,
                has_function_privilege('public', p.oid, 'execute') as pub,
                has_function_privilege('service_role', p.oid, 'execute') as service
           from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prokind = 'f'
          order by 1`,
      );
      expect(rows.find((r) => r.name === "delete_my_account")).toMatchObject({
        owner: "griddo_writer", definer: true, authed: true, anon: false, pub: false, service: false,
      });
      // The reads (get_snapshot, the reconcile functions and the classifier) stay `security invoker`
      // and owned by postgres; every other function stays `security definer` and owned by griddo_writer.
      for (const r of rows) {
        const read = r.name === "get_snapshot" || r.name === "classify_archive_scratch_recovery" || r.name.startsWith("reconcile_");
        expect({ name: r.name, owner: r.owner, definer: r.definer }, r.name).toEqual(
          read
            ? { name: r.name, owner: "postgres", definer: false }
            : { name: r.name, owner: "griddo_writer", definer: true },
        );
        expect({ name: r.name, anon: r.anon, pub: r.pub, service: r.service }, r.name).toEqual({
          name: r.name, anon: false, pub: false, service: false,
        });
      }
    } finally {
      await db.end();
    }
  });

  it("leaves another account's rows untouched and sees nothing of them", async () => {
    await withActor(as(other), async (db) => {
      await ensure(db);
      const { rows: before } = await db.query("select public.get_snapshot() as s");
      await becomeActor(db, as(user));
      await ensure(db);
      await requestDeletion(db);
      await becomeActor(db, as(other));
      const { rows: after } = await db.query("select public.get_snapshot() as s");
      expect(after[0].s).toEqual(before[0].s);
      expect(await requestedAt(db, other.id)).toBeNull();
    });
  });

  it("before + changes equals after for a request, a repeat and a rejection", async () => {
    // A request writes no row of the snapshot, and the snapshot read of a marked account is a
    // rejection, so the match is checked on the tables themselves.
    await withActor(as(user), async (db) => {
      await ensure(db);
      const counts = async () => {
        await becomeActor(db, { role: "owner" });
        const { rows } = await db.query(
          `select (select count(*) from app.nodes where user_id = $1)::int as nodes,
                  (select count(*) from app.bits where user_id = $1)::int as bits,
                  (select count(*) from app.chunks where user_id = $1)::int as chunks`,
          [user.id],
        );
        await becomeActor(db, as(user));
        return rows[0];
      };
      const before = await counts();
      const first = await requestDeletion(db);
      const repeat = await requestDeletion(db);
      expect(first.changes).toEqual({});
      expect(repeat.changes).toEqual({});
      expect(await counts()).toEqual(before);
      await becomeActor(db, as(other));
      expect((await requestDeletion(db)).rejection).toEqual({ code: "account_missing" });
    });
  });
});

describe("a marked account", () => {
  it("is rejected with account_deleting by every client-callable function", async () => {
    await withActor(as(user), async (db) => {
      const names = await clientCallable(db);
      await becomeActor(db, as(user));
      expect(names.filter((n) => !(n in CALLS)), "functions with no call here").toEqual([]);
      expect(Object.keys(CALLS).filter((n) => !names.includes(n)), "calls with no function").toEqual([]);

      await ensure(db);
      const unmarked: Record<string, string | undefined> = {};
      for (const name of names) unmarked[name] = await codeOf(db, name);
      for (const name of names) expect(unmarked[name], `${name} before the request`).not.toBe("account_deleting");

      await requestDeletion(db);
      for (const name of names) expect(await codeOf(db, name), name).toBe("account_deleting");
    });
  });

  it("gets no data back from get_snapshot() and nothing written by ensure_account()", async () => {
    await withActor(as(user), async (db) => {
      await ensure(db);
      await requestDeletion(db);
      const { rows } = await db.query("select public.get_snapshot() as s");
      expect(rows[0].s).toEqual({ rejection: { code: "account_deleting" } });
      const before = await requestedAt(db, user.id);
      await becomeActor(db, as(user));
      expect(await ensure(db)).toEqual({ status: "rejected", result: null, changes: {}, rejection: { code: "account_deleting" } });
      expect(await requestedAt(db, user.id)).toBe(before);
    });
  });

  it("does not affect another account's calls", async () => {
    await withActor(as(other), async (db) => {
      await ensure(db);
      await becomeActor(db, as(user));
      await ensure(db);
      await requestDeletion(db);
      await becomeActor(db, as(other));
      expect((await ensure(db)).rejection).toBeUndefined();
      const { rows } = await db.query("select public.get_snapshot() as s");
      expect(rows[0].s.rejection).toBeUndefined();
    });
  });
});

describe("a deleted auth user", () => {
  it("gets account_missing from get_snapshot(), ensure_account() and the write functions", async () => {
    const gone = await createTestUser("dmg");
    const db = await connect();
    try {
      await adminClient().auth.admin.deleteUser(gone.id);
      await db.query("begin");
      await becomeActor(db, as(gone));
      const { rows } = await db.query("select public.get_snapshot() as s");
      expect(rows[0].s).toEqual({ rejection: { code: "account_missing" } });
      expect((await ensure(db)).rejection).toEqual({ code: "account_missing" });
      for (const name of ["create_node", "update_node", "empty_trash", "stage_candidate", "reconcile_stage_candidate"]) {
        expect(await codeOf(db, name), name).toBe("account_missing");
      }
    } finally {
      await db.query("rollback").catch(() => undefined);
      await db.end();
    }
  });
});

describe("concurrency", () => {
  it("runs ensure_account() and delete_my_account() of one account at once without a deadlock", async () => {
    for (let round = 0; round < 5; round += 1) {
      const racer = await createTestUser("dmc");
      const open = async () => {
        const db = await connect();
        await db.query("begin");
        await becomeActor(db, as(racer));
        return db;
      };
      const first = await open();
      await ensure(first);
      await first.query("commit");
      await first.end();
      const [a, b] = await Promise.all([open(), open()]);
      try {
        // Each transaction commits as soon as its call returns, so the one that waits can go on.
        const results = await Promise.allSettled([
          ensure(a).then(() => a.query("commit")),
          requestDeletion(b).then(() => b.query("commit")),
        ]);
        expect(results.map((r) => r.status), `round ${round}`).toEqual(["fulfilled", "fulfilled"]);
      } finally {
        await a.end();
        await b.end();
      }
      await withActor(as(racer), async (db) => {
        expect((await ensure(db)).rejection).toEqual({ code: "account_deleting" });
      });
    }
  });
});
