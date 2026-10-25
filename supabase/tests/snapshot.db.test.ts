import { randomUUID } from "node:crypto";
import type { Client } from "pg";
import { beforeAll, describe, expect, it } from "vitest";
import { baseEntities } from "@/lib/db/boundary-cases";
import { nodeToRow } from "@/lib/db/row-mapping";
import { becomeActor, connect, withActor } from "./helpers/db";
import { seedAccount, type SeededAccount } from "./helpers/seed";
import { createTestUser, signedInClient, type TestUser } from "./helpers/users";

// get_snapshot() (SCHEMA §Snapshot): one JSON value, one SQL statement, the caller's rows only.

const TABLES = ["nodes", "bits", "chunks", "scratch_breakdowns", "staged_candidates"] as const;

type Snapshot = Record<(typeof TABLES)[number], Array<Record<string, unknown>>> & {
  rejection?: { code: string };
};

let a: TestUser;
let b: TestUser;
let seedA: SeededAccount;
let seedB: SeededAccount;

const authed = (u: TestUser) => ({ role: "authenticated" as const, userId: u.id });

async function snapshotOf(db: Client): Promise<Snapshot> {
  const { rows } = await db.query("select public.get_snapshot() as s");
  return rows[0].s as Snapshot;
}

beforeAll(async () => {
  a = await createTestUser("snap-a");
  b = await createTestUser("snap-b");
  const db = await connect();
  try {
    seedA = await seedAccount(db, a.id);
    seedB = await seedAccount(db, b.id);
  } finally {
    await db.end();
  }
});

describe("get_snapshot definition", () => {
  it("is one stable SQL statement run as the caller, with an empty search_path", async () => {
    const db = await connect();
    try {
      const { rows } = await db.query(
        `select l.lanname, p.provolatile, p.prosecdef, p.proconfig
           from pg_proc p join pg_language l on l.oid = p.prolang
          where p.pronamespace = 'public'::regnamespace and p.proname = 'get_snapshot'`,
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].lanname).toBe("sql");
      expect(rows[0].provolatile).toBe("s");
      expect(rows[0].prosecdef).toBe(false);
      expect(rows[0].proconfig).toEqual(["search_path=\"\""]);
    } finally {
      await db.end();
    }
  });

  it("is executable by authenticated alone", async () => {
    for (const role of ["anon", "service_role"] as const) {
      await withActor({ role, userId: a.id }, async (db) => {
        await expect(db.query("select public.get_snapshot()")).rejects.toMatchObject({ code: "42501" });
      });
    }
  });
});

describe("get_snapshot content", () => {
  it("returns the caller's rows in all five tables and nothing of another account", async () => {
    const snap = await withActor(authed(a), snapshotOf);
    for (const table of TABLES) {
      expect(snap[table], table).toHaveLength(1);
      expect(snap[table][0].user_id).toBe(a.id);
    }
    expect(snap.nodes[0].id).toBe(seedA.nodeId);
    expect(snap.bits[0].id).toBe(seedA.bitId);
    expect(snap.chunks[0].id).toBe(seedA.chunkId);
    expect(snap.scratch_breakdowns[0].id).toBe(seedA.breakdownId);
    expect(snap.staged_candidates[0].id).toBe(seedA.candidateId);
    expect(snap).not.toHaveProperty("accounts");
    expect(snap).not.toHaveProperty("rejection");
    expect(JSON.stringify(snap)).not.toContain(seedB.nodeId);
    expect(JSON.stringify(snap)).not.toContain(b.id);

    const snapB = await withActor(authed(b), snapshotOf);
    expect(snapB.nodes[0].id).toBe(seedB.nodeId);
  });

  it("returns complete snake_case rows, trashed and archived rows included", async () => {
    const user = await createTestUser("snap-lifecycle");
    const trashed = randomUUID();
    const archived = randomUUID();
    const snap = await withActor(authed(user), async (db, owner) => {
      await owner(async () => {
        await seedAccount(db, user.id);
        for (const [id, overrides, x] of [
          [trashed, { deletedAt: 5 }, 3],
          [archived, { archivedAt: 6 }, 4],
        ] as const) {
          const row = nodeToRow({ ...baseEntities.node, ...overrides, id, x, y: 4 }, user.id);
          const keys = Object.keys(row);
          await db.query(
            `insert into app.nodes (${keys.map((k) => `"${k}"`).join(",")}) values (${keys.map((_, i) => `$${i + 1}`).join(",")})`,
            keys.map((k) => (row as Record<string, unknown>)[k]),
          );
        }
      });
      return snapshotOf(db);
    });
    const byId = new Map(snap.nodes.map((n) => [n.id, n]));
    expect(byId.get(trashed)?.deleted_at).toBe(5);
    expect(byId.get(archived)?.archived_at).toBe(6);
    expect(Object.keys(snap.nodes[0])).toEqual(expect.arrayContaining(["user_id", "parent_id", "mtime"]));
  });

  it("rejects a caller without an accounts row with only the envelope's rejection object", async () => {
    const lonely = await createTestUser("snap-nobody");
    const snap = await withActor(authed(lonely), snapshotOf);
    expect(snap).toEqual({ rejection: { code: "account_missing" } });
  });

  it("returns more than 1,000 rows of one table intact, through the API", async () => {
    const user = await createTestUser("snap-big");
    const db = await connect();
    let seeded: SeededAccount;
    try {
      seeded = await seedAccount(db, user.id);
      await db.query(
        `insert into app.scratch_breakdowns (id, user_id, scratch_bit_id, content, "order", created_at, version)
         select gen_random_uuid(), $1, $2, 'row ' || g, g, 1, 1 from generate_series(1, 1200) g`,
        [user.id, seeded.bitId],
      );
    } finally {
      await db.end();
    }
    const client = await signedInClient(user);
    const { data, error } = await client.rpc("get_snapshot");
    expect(error).toBeNull();
    const snap = data as Snapshot;
    expect(snap.scratch_breakdowns).toHaveLength(1201);
    expect(new Set(snap.scratch_breakdowns.map((r) => r.id)).size).toBe(1201);
  });

  it("fails for a client without a session", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const anon = createClient(process.env.SUPABASE_TEST_URL!, process.env.SUPABASE_TEST_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await anon.rpc("get_snapshot");
    expect(data).toBeNull();
    expect(error?.code).toBe("42501");
  });
});

// A candidate must never arrive without its source (S17). Connection B commits a source and
// its candidate in one transaction, again and again, while A takes snapshots. The control
// reads the two tables in two statements with a pause between them; if the harness cannot
// make that fail, a pass for get_snapshot would prove nothing.
describe("get_snapshot consistency under concurrent commits", () => {
  const PAIRS = 120;

  async function race(read: (db: Client) => Promise<Snapshot>): Promise<number> {
    const user = await createTestUser("snap-race");
    const setup = await connect();
    let seeded: SeededAccount;
    try {
      seeded = await seedAccount(setup, user.id);
    } finally {
      await setup.end();
    }
    const writer = await connect();
    const reader = await connect();
    let done = false;
    let orphans = 0;
    const write = (async () => {
      for (let i = 0; i < PAIRS; i++) {
        const source = randomUUID();
        await writer.query("begin");
        await writer.query(
          `insert into app.scratch_breakdowns (id, user_id, scratch_bit_id, content, "order", created_at, version)
           values ($1, $2, $3, 'x', $4, 1, 1)`,
          [source, user.id, seeded.bitId, i + 10],
        );
        await writer.query(
          `insert into app.staged_candidates (id, user_id, scratch_bit_id, source_breakdown_id, result_type, created_at, updated_at)
           values (gen_random_uuid(), $1, $2, $3, 'node', 1, 1)`,
          [user.id, seeded.bitId, source],
        );
        await writer.query("commit");
        await new Promise((r) => setTimeout(r, 2));
      }
      done = true;
    })();
    const readLoop = (async () => {
      while (!done) {
        await reader.query("begin");
        await becomeActor(reader, authed(user));
        const snap = await read(reader);
        await reader.query("rollback");
        const sources = new Set(snap.scratch_breakdowns.map((r) => r.id));
        orphans += snap.staged_candidates.filter((c) => !sources.has(c.source_breakdown_id)).length;
      }
    })();
    try {
      await Promise.all([write, readLoop]);
    } finally {
      await writer.end();
      await reader.end();
    }
    return orphans;
  }

  it("never shows a candidate without its source, while a two-statement control does", async () => {
    const owner = await connect();
    try {
      await owner.query(`
        create function public.zz_snapshot_control(p_user uuid) returns jsonb
          language plpgsql volatile set search_path = '' as $$
        declare v_sources jsonb; v_candidates jsonb;
        begin
          select coalesce(jsonb_agg(to_jsonb(s)), '[]') into v_sources
            from app.scratch_breakdowns s where s.user_id = p_user;
          perform pg_sleep(0.004);
          select coalesce(jsonb_agg(to_jsonb(c)), '[]') into v_candidates
            from app.staged_candidates c where c.user_id = p_user;
          return jsonb_build_object('scratch_breakdowns', v_sources, 'staged_candidates', v_candidates);
        end $$`);
      let controlOrphans = 0;
      try {
        controlOrphans = await race(async (db) => {
          // The control reads as the owner for its own user; the claims set the user.
          await db.query("reset role");
          const { rows } = await db.query(
            "select public.zz_snapshot_control((current_setting('request.jwt.claims')::jsonb ->> 'sub')::uuid) as s",
          );
          return rows[0].s as Snapshot;
        });
      } finally {
        await owner.query("drop function public.zz_snapshot_control(uuid)");
      }
      expect(controlOrphans).toBeGreaterThan(0);
    } finally {
      await owner.end();
    }

    expect(await race(snapshotOf)).toBe(0);
  }, 60_000);
});
