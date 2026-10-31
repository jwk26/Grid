import { randomUUID } from "node:crypto";
import type { Client } from "pg";
import { beforeAll, describe, expect, it } from "vitest";
import { becomeActor, connect, withActor } from "./helpers/db";
import { createTestUser, type TestUser } from "./helpers/users";

// Task 238, Stage 1: internal.cleanup_guests() (SCHEMA §Guest cleanup). It deletes anonymous auth
// users 7 days after `accounts.last_visit_at` (or `auth.users.created_at` when no accounts row
// exists) and every account with a deletion request; the `user_id` cascade removes the rows. It
// is owned by postgres and run by pg_cron, so no client role, and not even griddo_writer, can run it.

const DAY = 86_400_000;
const APP_TABLES = ["accounts", "nodes", "bits", "chunks", "scratch_breakdowns", "staged_candidates"];

let seq = 0;
// A test user flagged as anonymous: createTestUser makes a password user, and the flag is the one
// thing cleanup_guests() reads to tell a guest from a real account.
async function createGuest(db: Client): Promise<TestUser> {
  const u = await createTestUser(`gc${seq++}`);
  await db.query("update auth.users set is_anonymous = true where id = $1", [u.id]);
  return u;
}

// ensure_account() committed as the user (withActor rolls back, so this uses its own transaction).
async function commitEnsure(db: Client, u: TestUser, anonymous: boolean): Promise<void> {
  await db.query("begin");
  try {
    await becomeActor(db, { role: "authenticated", userId: u.id });
    await db.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify({ role: "authenticated", sub: u.id, ...(anonymous ? { is_anonymous: true } : {}) }),
    ]);
    await db.query("select public.ensure_account()");
    await db.query("commit");
  } catch (error) {
    await db.query("rollback");
    throw error;
  } finally {
    await db.query("reset role");
  }
}

async function ageVisit(db: Client, u: TestUser, days: number): Promise<void> {
  await db.query("update app.accounts set last_visit_at = (extract(epoch from now()) * 1000)::bigint - $2::bigint where user_id = $1", [
    u.id,
    Math.round(days * DAY),
  ]);
}

async function authUserExists(db: Client, u: TestUser): Promise<boolean> {
  return (await db.query("select 1 from auth.users where id = $1", [u.id])).rowCount === 1;
}

async function rowCounts(db: Client, u: TestUser): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const table of APP_TABLES) {
    const { rows } = await db.query(`select count(*)::int as n from app.${table} where user_id = $1`, [u.id]);
    out[table] = rows[0].n;
  }
  return out;
}

async function cleanup(db: Client): Promise<void> {
  await db.query("select internal.cleanup_guests()");
}

let db: Client;
beforeAll(async () => {
  db = await connect();
  return async () => {
    await db.end();
  };
});

describe("cleanup_guests()", () => {
  it("deletes a seeded guest 7 days after its last visit with every row of all six tables, staged candidates included", async () => {
    const guest = await createGuest(db);
    await commitEnsure(db, guest, true);
    const before = await rowCounts(db, guest);
    // The demo seed gives a new guest rows in every table, so the zero counts below mean something.
    for (const table of APP_TABLES) expect(before[table], table).toBeGreaterThan(0);
    await ageVisit(db, guest, 7.5);
    await cleanup(db);
    expect(await authUserExists(db, guest)).toBe(false);
    expect(await rowCounts(db, guest)).toEqual(Object.fromEntries(APP_TABLES.map((t) => [t, 0])));
  });

  it("keeps a guest that visited 6 days ago, and one whose open tab refreshed last_visit_at", async () => {
    const recent = await createGuest(db);
    const openTab = await createGuest(db);
    await commitEnsure(db, recent, true);
    await commitEnsure(db, openTab, true);
    await ageVisit(db, recent, 6);
    await ageVisit(db, openTab, 30);
    // The hourly cleanup_expired_trash() of an open tab records the visit.
    await db.query("begin");
    await becomeActor(db, { role: "authenticated", userId: openTab.id });
    await db.query("select public.cleanup_expired_trash()");
    await db.query("commit");
    await db.query("reset role");
    const rowsBefore = await rowCounts(db, recent);
    await cleanup(db);
    expect(await authUserExists(db, recent)).toBe(true);
    expect(await rowCounts(db, recent)).toEqual(rowsBefore);
    expect(await authUserExists(db, openTab)).toBe(true);
    expect((await rowCounts(db, openTab)).accounts).toBe(1);
  });

  it("deletes an account with a deletion request on the next run, whatever its age, with all its rows", async () => {
    const real = await createTestUser("gcreal");
    await commitEnsure(db, real, false);
    const before = await rowCounts(db, real);
    await db.query("begin");
    await becomeActor(db, { role: "authenticated", userId: real.id });
    await db.query("select public.delete_my_account()");
    await db.query("commit");
    await db.query("reset role");
    expect(before.nodes).toBeGreaterThan(0); // the system Nodes
    await cleanup(db);
    expect(await authUserExists(db, real)).toBe(false);
    expect(await rowCounts(db, real)).toEqual(Object.fromEntries(APP_TABLES.map((t) => [t, 0])));
  });

  it("never deletes a real account that has no deletion request, however long since its last visit", async () => {
    const real = await createTestUser("gckeep");
    await commitEnsure(db, real, false);
    await ageVisit(db, real, 400);
    await cleanup(db);
    expect(await authUserExists(db, real)).toBe(true);
    expect((await rowCounts(db, real)).accounts).toBe(1);
  });

  it("deletes a guest with no accounts row 7 days after auth.users.created_at, and keeps it before", async () => {
    const stale = await createGuest(db);
    const fresh = await createGuest(db);
    await db.query("update auth.users set created_at = now() - interval '8 days' where id = $1", [stale.id]);
    await db.query("update auth.users set created_at = now() - interval '6 days' where id = $1", [fresh.id]);
    await cleanup(db);
    expect(await authUserExists(db, stale)).toBe(false);
    expect(await authUserExists(db, fresh)).toBe(true);
  });

  it("never deletes a real account that has no accounts row", async () => {
    const real = await createTestUser("gcnorow");
    await db.query("update auth.users set created_at = now() - interval '400 days' where id = $1", [real.id]);
    await cleanup(db);
    expect(await authUserExists(db, real)).toBe(true);
  });

  it("does not touch another account's rows when it deletes one", async () => {
    const gone = await createGuest(db);
    const stays = await createGuest(db);
    await commitEnsure(db, gone, true);
    await commitEnsure(db, stays, true);
    const staysBefore = await rowCounts(db, stays);
    await ageVisit(db, gone, 9);
    await cleanup(db);
    expect(await authUserExists(db, gone)).toBe(false);
    expect(await rowCounts(db, stays)).toEqual(staysBefore);
  });

  it("skips an account that deadlocks with a client write, deletes the others, and takes it on the next run", async () => {
    const a = await createGuest(db);
    const b = await createGuest(db);
    await commitEnsure(db, a, true);
    await commitEnsure(db, b, true);
    await ageVisit(db, a, 9);
    await ageVisit(db, b, 9);
    const writer = await connect(); // a client write on account A, holding a Node lock
    const runner = await connect(); // the cleanup job
    try {
      await writer.query("begin");
      await writer.query("select id from app.nodes where user_id = $1 limit 1 for update", [a.id]);
      // The cleanup reaches A, deletes its auth user and blocks in the cascade on the Node lock.
      const runnerPid = (await runner.query("select pg_backend_pid() as pid")).rows[0].pid as number;
      const run = runner.query("select internal.cleanup_guests()");
      const blocked = async () => {
        for (let i = 0; i < 100; i++) {
          const { rows } = await db.query(
            "select 1 from pg_stat_activity where pid = $1 and wait_event_type = 'Lock'",
            [runnerPid],
          );
          if (rows.length > 0) return;
          await new Promise((r) => setTimeout(r, 50));
        }
        throw new Error("the cleanup never blocked on the Node lock");
      };
      await blocked();
      // The write's foreign key check on A's auth user: a cycle. The cleanup waited first, so its
      // deadlock check fires first and it is the victim.
      await writer.query("select 1 from auth.users where id = $1 for key share", [a.id]);
      await writer.query("commit");
      await run; // ends without an error: the handler skipped A
    } finally {
      await writer.query("rollback").catch(() => undefined);
      await writer.end();
      await runner.end();
    }
    expect(await authUserExists(db, a)).toBe(true);
    expect(await authUserExists(db, b)).toBe(false);
    await cleanup(db);
    expect(await authUserExists(db, a)).toBe(false);
  });

  it("can run twice in a row and with nothing to delete", async () => {
    await cleanup(db);
    await cleanup(db);
  });
});

describe("cleanup_guests() privileges and job", () => {
  it("is owned by postgres, closed to every client role and to griddo_writer", async () => {
    const { rows } = await db.query(
      `select pg_get_userbyid(p.proowner) as owner, p.proconfig as config,
              has_function_privilege('anon', p.oid, 'execute') as anon,
              has_function_privilege('authenticated', p.oid, 'execute') as authed,
              has_function_privilege('service_role', p.oid, 'execute') as service,
              has_function_privilege('griddo_writer', p.oid, 'execute') as writer,
              has_function_privilege('public', p.oid, 'execute') as pub
         from pg_proc p where p.pronamespace = 'internal'::regnamespace and p.proname = 'cleanup_guests'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ owner: "postgres", anon: false, authed: false, service: false, writer: false, pub: false });
    expect(rows[0].config).toEqual(['search_path=""']);
  });

  it("refuses a client role that calls it", async () => {
    for (const role of ["anon", "authenticated", "service_role"] as const) {
      await withActor({ role, userId: role === "authenticated" ? randomUUID() : undefined }, async (c) => {
        await expect(c.query("select internal.cleanup_guests()")).rejects.toMatchObject({ code: "42501" });
      });
    }
  });

  it("gives no client role usage on the cron schema", async () => {
    const { rows } = await db.query(
      `select r as role, has_schema_privilege(r, 'cron', 'usage') as usage
         from unnest(array['anon', 'authenticated', 'service_role', 'griddo_writer']) r`,
    );
    for (const row of rows) expect(row.usage, row.role).toBe(false);
  });

  it("registers exactly one daily job that runs cleanup_guests() as postgres", async () => {
    const { rows } = await db.query(
      "select jobname, schedule, command, username, active from cron.job where command like '%cleanup_guests%'",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ username: "postgres", active: true });
    expect(rows[0].command).toContain("internal.cleanup_guests()");
    // Daily: minute and hour fixed, every other field a star.
    expect(rows[0].schedule).toMatch(/^\d+ \d+ \* \* \*$/);
  });
});
