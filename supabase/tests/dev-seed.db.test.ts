import { randomUUID } from "node:crypto";
import type { Client } from "pg";
import { beforeAll, describe, expect, it } from "vitest";
import { connect, expectDbError, withActor } from "./helpers/db";
import { adminClient, type TestUser } from "./helpers/users";

// Task 229: dev.seed_fixture(), the local-only browser-check seed created by
// supabase/seed.sql (never a migration). The `dev` schema is outside the scan of
// coverage.db.test.ts (public and internal only), so this suite checks its grants itself.

const DAY = 86_400_000;
const FIXTURE_DOMAIN = "griddo.test";

type Seeded = { ids: Record<string, string>; inboxRoute: string; counts: Record<string, number> };

async function fixtureUser(label: string, domain = FIXTURE_DOMAIN): Promise<TestUser> {
  const email = `${label}-${randomUUID().slice(0, 8)}@${domain}`;
  const password = `pw-${randomUUID()}`;
  const { data, error } = await adminClient().auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
  return { id: data.user.id, email, password };
}

async function seed(db: Client, userId: string, scenario?: unknown): Promise<Seeded> {
  const { rows } =
    scenario === undefined
      ? await db.query("select dev.seed_fixture($1) as r", [userId])
      : await db.query("select dev.seed_fixture($1, $2::jsonb) as r", [userId, JSON.stringify(scenario)]);
  return rows[0].r as Seeded;
}

async function seedAsService(userId: string, scenario?: unknown): Promise<Seeded> {
  return withCommitted(async (db) => seed(db, userId, scenario));
}

// The function commits like a PostgREST call: one transaction, committed.
async function withCommitted<T>(fn: (db: Client) => Promise<T>): Promise<T> {
  const db = await connect();
  try {
    await db.query("begin");
    await db.query("set local role service_role");
    const result = await fn(db);
    await db.query("commit");
    return result;
  } catch (error) {
    await db.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await db.end();
  }
}

async function counts(userId: string): Promise<Record<string, number>> {
  const db = await connect();
  try {
    const out: Record<string, number> = {};
    for (const table of ["nodes", "bits", "chunks", "scratch_breakdowns", "staged_candidates"]) {
      const { rows } = await db.query(`select count(*)::int as n from app.${table} where user_id = $1`, [userId]);
      out[table] = rows[0].n;
    }
    return out;
  } finally {
    await db.end();
  }
}

async function rows(sql: string, params: unknown[]) {
  const db = await connect();
  try {
    return (await db.query(sql, params)).rows;
  } finally {
    await db.end();
  }
}

let user: TestUser;

beforeAll(async () => {
  user = await fixtureUser("seed");
});

describe("dev.seed_fixture: grants", () => {
  it("is executable by service_role only", async () => {
    await withCommitted(async (db) => {
      const { rows: r } = await db.query("select has_function_privilege('service_role', 'dev.seed_fixture(uuid, jsonb)', 'execute') as ok");
      expect(r[0].ok).toBe(true);
    });
    // griddo_writer owns the function (NOLOGIN, no client path); the client roles must not run it.
    for (const role of ["anon", "authenticated"] as const) {
      await withActor({ role, userId: role === "anon" ? undefined : user.id }, async (db) => {
        const code = await expectDbError(() => db.query("select dev.seed_fixture($1)", [user.id]));
        expect(["42501", "3F000"]).toContain(code); // no EXECUTE, or no USAGE on the schema
      });
    }
  });

  it("gives USAGE on schema dev to service_role and the owner only", async () => {
    const db = await connect();
    try {
      const { rows: r } = await db.query(
        `select r.rolname from pg_roles r
          where has_schema_privilege(r.oid, 'dev', 'usage') and r.rolname in ('anon', 'authenticated', 'service_role', 'griddo_writer', 'public')`,
      );
      const names = r.map((row) => row.rolname).sort();
      expect(names).toEqual(["griddo_writer", "service_role"]);
    } finally {
      await db.end();
    }
  });

  it("is security definer with an empty search_path, owned by griddo_writer", async () => {
    const [fn] = await rows(
      `select p.prosecdef, pg_get_userbyid(p.proowner) as owner, p.proconfig
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'dev' and p.proname = 'seed_fixture'`,
      [],
    );
    expect(fn.prosecdef).toBe(true);
    expect(fn.owner).toBe("griddo_writer");
    expect(fn.proconfig).toContain("search_path=\"\"");
  });
});

describe("dev.seed_fixture: who it seeds", () => {
  it("refuses a user outside the fixture email domain and writes nothing", async () => {
    const outsider = await fixtureUser("outsider", "test.local");
    await withCommitted(async (db) => {
      await db.query("savepoint s");
      const code = await expectDbError(() => seed(db, outsider.id));
      expect(code).not.toBe("");
      await db.query("rollback to savepoint s");
    });
    expect(await counts(outsider.id)).toEqual({ nodes: 0, bits: 0, chunks: 0, scratch_breakdowns: 0, staged_candidates: 0 });
  });

  it("refuses an unknown user id", async () => {
    await withCommitted(async (db) => {
      await db.query("savepoint s");
      const code = await expectDbError(() => seed(db, randomUUID()));
      expect(code).not.toBe("");
    });
  });

  it("refuses an unknown scenario option", async () => {
    await withCommitted(async (db) => {
      await db.query("savepoint s");
      const code = await expectDbError(() => seed(db, user.id, { nope: true }));
      expect(code).not.toBe("");
    });
  });
});

describe("dev.seed_fixture: the scenario", () => {
  let result: Seeded;
  let before: number;

  beforeAll(async () => {
    before = Date.now();
    result = await seedAsService(user.id);
  });

  it("returns the scenario ids under the fixture's keys and the Inbox route", () => {
    for (const key of [
      "inbox", "archive", "systemFolder", "documents", "fullFolder", "depth2Target", "stagingScratch",
      "longBreakdownScratch", "titleLimitScratch", "archiveEligibleScratch", "activeRowScratch",
      "emptyScratch", "longTitleScratch", "stagedOnlyScratch",
    ]) {
      expect(result.ids[key], key).toMatch(/^[0-9a-f-]{36}$/);
    }
    expect(result.inboxRoute).toBe(`/grid/${result.ids.inbox}`);
  });

  it("keeps the accounts row and exactly one Inbox and one Archive, reusing their ids", async () => {
    const account = await rows("select * from app.accounts where user_id = $1", [user.id]);
    expect(account).toHaveLength(1);
    const system = await rows(
      "select id, system_role, hidden_from_grid, deleted_at, archived_at, parent_id from app.nodes where user_id = $1 and system_role is not null order by system_role",
      [user.id],
    );
    expect(system.map((row) => row.system_role)).toEqual(["archive_view", "inbox"]);
    expect(system.find((row) => row.system_role === "inbox")?.id).toBe(result.ids.inbox);
    expect(system.find((row) => row.system_role === "archive_view")?.id).toBe(result.ids.archive);
    for (const row of system) {
      expect(row).toMatchObject({ hidden_from_grid: false, deleted_at: null, archived_at: null, parent_id: null });
    }
  });

  it("uses no cell with x < 3 and y < 2 at any level (feedback F34)", async () => {
    const used = await rows(
      `select 'node' as kind, id, x, y from app.nodes where user_id = $1
       union all select 'bit', id, x, y from app.bits where user_id = $1`,
      [user.id],
    );
    expect(used.length).toBeGreaterThan(150);
    expect(used.filter((row) => row.x < 3 && row.y < 2)).toEqual([]);
  });

  it("gives every active Grid cell one item", async () => {
    const dupes = await rows(
      `select parent_id, x, y, count(*)::int as n from (
         select parent_id, x, y from app.nodes where user_id = $1 and deleted_at is null and archived_at is null
         union all select parent_id, x, y from app.bits where user_id = $1 and deleted_at is null and archived_at is null
       ) c group by parent_id, x, y having count(*) > 1`,
      [user.id],
    );
    expect(dupes).toEqual([]);
  });

  it("fills the Full folder in every cell outside the reserved block", async () => {
    const [{ n }] = await rows(
      "select count(*)::int as n from app.bits where user_id = $1 and parent_id = $2 and deleted_at is null and archived_at is null",
      [user.id, result.ids.fullFolder],
    );
    expect(n).toBe(18 * 9 - 6);
  });

  it("puts the Scratches in the Inbox, aged against now, and orders breakdown rows by creation", async () => {
    const scratches = await rows(
      "select id, created_at from app.bits where user_id = $1 and parent_id = $2 and deleted_at is null",
      [user.id, result.ids.inbox],
    );
    expect(scratches).toHaveLength(8);
    const age = (id: string) => Date.now() - Number(scratches.find((row) => row.id === id)?.created_at);
    expect(age(result.ids.stagingScratch)).toBeLessThan(2 * 3_600_000);
    expect(age(result.ids.emptyScratch)).toBeGreaterThan(29 * DAY);
    expect(Number(scratches[0].created_at)).toBeLessThanOrEqual(Date.now());
    expect(before).toBeGreaterThan(0);

    const breakdown = await rows(
      "select count(*)::int as n, count(consumed_at)::int as consumed from app.scratch_breakdowns where user_id = $1 and scratch_bit_id = $2",
      [user.id, result.ids.longBreakdownScratch],
    );
    expect(breakdown[0]).toEqual({ n: 20, consumed: 2 });
    const bad = await rows(
      `select 1 from app.scratch_breakdowns r join app.bits b on b.id = r.scratch_bit_id and b.user_id = r.user_id
        where r.user_id = $1 and (r.created_at <= b.created_at or (r.consumed_at is not null and r.consumed_at <= r.created_at))`,
      [user.id],
    );
    expect(bad).toEqual([]);
  });

  it("stages candidates only on unconsumed rows of their own Scratch", async () => {
    const bad = await rows(
      `select 1 from app.staged_candidates c join app.scratch_breakdowns r on r.id = c.source_breakdown_id and r.user_id = c.user_id
        where c.user_id = $1 and (r.scratch_bit_id <> c.scratch_bit_id or r.consumed_at is not null)`,
      [user.id],
    );
    expect(bad).toEqual([]);
    expect((await counts(user.id)).staged_candidates).toBe(7);
  });

  it("includes past-deadline, completed, old-Trash and Archived states", async () => {
    const [state] = await rows(
      `select
         count(*) filter (where deadline < $2 and status = 'active' and deleted_at is null)::int as overdue,
         count(*) filter (where status = 'complete')::int as complete,
         count(*) filter (where deleted_at < $2 - 31 * 86400000::bigint)::int as old_trash,
         count(*) filter (where deleted_at >= $2 - 29 * 86400000::bigint)::int as new_trash,
         count(*) filter (where archived_at is not null)::int as archived
       from app.bits where user_id = $1`,
      [user.id, Date.now()],
    );
    expect(state.overdue).toBeGreaterThan(0);
    expect(state.complete).toBeGreaterThan(0);
    expect(state.old_trash).toBeGreaterThan(0);
    expect(state.new_trash).toBeGreaterThan(0);
    expect(state.archived).toBeGreaterThan(0);
  });
});

describe("dev.seed_fixture: reruns and isolation", () => {
  it("clears what the app or an earlier run left, keeps the system Nodes, and is repeatable", async () => {
    const lone = await fixtureUser("rerun");
    const first = await seedAsService(lone.id);
    const firstCounts = await counts(lone.id);
    // A record the app would have made under the fixture, and a Chunk.
    const db = await connect();
    try {
      await db.query(
        `insert into app.nodes (id, user_id, title, color, icon, mtime, created_at, level, x, y)
         values (gen_random_uuid(), $1, 'Made in the app', 'hsl(210, 50%, 50%)', 'Folder', 1, 1, 0, 17, 8)`,
        [lone.id],
      );
    } finally {
      await db.end();
    }
    const second = await seedAsService(lone.id);
    expect(await counts(lone.id)).toEqual(firstCounts);
    expect(second.ids.inbox).toBe(first.ids.inbox);
    expect(second.ids.archive).toBe(first.ids.archive);
    expect(second.ids.documents).not.toBe(first.ids.documents);
    const stray = await rows("select 1 from app.nodes where user_id = $1 and title = 'Made in the app'", [lone.id]);
    expect(stray).toEqual([]);
  });

  it("restores a system Node that was trashed, archived or hidden", async () => {
    const lone = await fixtureUser("system");
    const first = await seedAsService(lone.id);
    const db = await connect();
    try {
      await db.query("update app.nodes set deleted_at = 5, x = 0, y = 0 where id = $1", [first.ids.inbox]);
      await db.query("update app.nodes set hidden_from_grid = true, archived_at = 5, x = 1, y = 1 where id = $1", [first.ids.archive]);
    } finally {
      await db.end();
    }
    const second = await seedAsService(lone.id);
    expect(second.ids.inbox).toBe(first.ids.inbox);
    const system = await rows(
      "select x, y, hidden_from_grid, deleted_at, archived_at from app.nodes where user_id = $1 and system_role is not null",
      [lone.id],
    );
    expect(system).toHaveLength(2);
    for (const row of system) {
      expect(row.hidden_from_grid).toBe(false);
      expect(row.deleted_at).toBeNull();
      expect(row.archived_at).toBeNull();
      expect(row.x < 3 && row.y < 2).toBe(false);
    }
  });

  it("leaves another account's rows untouched", async () => {
    const other = await fixtureUser("other");
    await seedAsService(other.id);
    const otherBefore = await rows(
      "select md5(string_agg(id::text || version::text || mtime::text, ',' order by id)) as h from app.nodes where user_id = $1",
      [other.id],
    );
    const lone = await fixtureUser("lone");
    await seedAsService(lone.id);
    await seedAsService(lone.id);
    const otherAfter = await rows(
      "select md5(string_agg(id::text || version::text || mtime::text, ',' order by id)) as h from app.nodes where user_id = $1",
      [other.id],
    );
    expect(otherAfter).toEqual(otherBefore);
    expect(await counts(other.id)).toEqual(await counts(lone.id));
  });

  it("adds the column anchors with the overflow option", async () => {
    const lone = await fixtureUser("overflow");
    await seedAsService(lone.id);
    const plain = await counts(lone.id);
    await seedAsService(lone.id, { overflow: true });
    const over = await counts(lone.id);
    expect(over.nodes - plain.nodes).toBe(40);
    const reserved = await rows("select 1 from app.nodes where user_id = $1 and x < 3 and y < 2", [lone.id]);
    expect(reserved).toEqual([]);
  });

  it("leaves one complete scenario when two seeds of one user run at once", async () => {
    const lone = await fixtureUser("race");
    await seedAsService(lone.id);
    const single = await counts(lone.id);
    const settled = await Promise.allSettled([seedAsService(lone.id), seedAsService(lone.id)]);
    expect(settled.every((s) => s.status === "fulfilled")).toBe(true);
    expect(await counts(lone.id)).toEqual(single);
    const system = await rows("select 1 from app.nodes where user_id = $1 and system_role is not null", [lone.id]);
    expect(system).toHaveLength(2);
    const dupes = await rows(
      `select 1 from (select parent_id, x, y from app.nodes where user_id = $1 and deleted_at is null and archived_at is null
          union all select parent_id, x, y from app.bits where user_id = $1 and deleted_at is null and archived_at is null) c
        group by parent_id, x, y having count(*) > 1`,
      [lone.id],
    );
    expect(dupes).toEqual([]);
  });
});
