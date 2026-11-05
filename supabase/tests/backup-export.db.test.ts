import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { connect, withActor } from "./helpers/db";
import { seedAccount, type SeededAccount } from "./helpers/seed";
import { adminClient, createTestUser, signedInClient, type TestUser } from "./helpers/users";

// Task 256: export_account(), the account fingerprint and the `backup` key of get_snapshot().

let a: TestUser;
let b: TestUser;
let seedA: SeededAccount;

const service = { role: "service_role" as const };

async function fingerprint(userId: string): Promise<string> {
  return withActor(service, async (db) => {
    const { rows } = await db.query("select public.backup_fingerprint($1) as f", [userId]);
    return rows[0].f as string;
  });
}

beforeAll(async () => {
  a = await createTestUser("ex-a");
  b = await createTestUser("ex-b");
  const db = await connect();
  try {
    seedA = await seedAccount(db, a.id);
    await seedAccount(db, b.id);
  } finally {
    await db.end();
  }
});

describe("export_account()", () => {
  it("returns the five tables, the fingerprint, format_version, the export time and the internal user id", async () => {
    await withActor(service, async (db) => {
      const { rows } = await db.query("select public.export_account($1) as e", [a.id]);
      const e = rows[0].e;
      expect(Object.keys(e).sort()).toEqual([
        "bits", "chunks", "exported_at", "fingerprint", "format_version", "nodes",
        "scratch_breakdowns", "staged_candidates", "user_id",
      ]);
      expect(e.format_version).toBe(1);
      expect(e.user_id).toBe(a.id);
      expect(typeof e.exported_at).toBe("number");
      expect(e.nodes[0].id).toBe(seedA.nodeId);
      const { rows: f } = await db.query("select public.backup_fingerprint($1) as f", [a.id]);
      expect(e.fingerprint).toBe(f[0].f);
    });
  });

  it("holds trashed rows too, and carries no other account's rows", async () => {
    await withActor(service, async (db, owner) => {
      await owner(() => db.query("update app.nodes set deleted_at = 5 where id = $1", [seedA.nodeId]));
      const e = (await db.query("select public.export_account($1) as e", [a.id])).rows[0].e;
      expect(e.nodes.map((n: { id: string }) => n.id)).toEqual([seedA.nodeId]);
      expect(e.nodes[0].deleted_at).toBe(5);
    });
  });

  it("rejects an account that is missing", async () => {
    await withActor(service, async (db) => {
      const e = (await db.query("select public.export_account($1) as e", [randomUUID()])).rows[0].e;
      expect(e).toEqual({ rejection: { code: "account_missing" } });
    });
  });

  it("is a stable function with its own 30 s statement_timeout, which REST hoists", async () => {
    const db = await connect();
    try {
      const { rows } = await db.query(
        "select provolatile, proconfig from pg_proc where proname = 'export_account' and pronamespace = 'public'::regnamespace",
      );
      expect(rows[0].provolatile).toBe("s");
      expect(rows[0].proconfig).toContain("statement_timeout=30s");
    } finally {
      await db.end();
    }
  });
});

describe("account fingerprint", () => {
  it("changes on a Chunk edit and not on a backup_status write", async () => {
    const before = await fingerprint(a.id);
    expect(await fingerprint(a.id)).toBe(before);
    const db = await connect();
    try {
      await db.query(
        "insert into app.backup_status (user_id, last_result, stored_bytes) values ($1, 'written', 5) on conflict (user_id) do update set stored_bytes = 6",
        [a.id],
      );
      expect(await fingerprint(a.id)).toBe(before);
      await db.query("update app.chunks set title = title || 'x' where id = $1", [seedA.chunkId]);
      const after = await fingerprint(a.id);
      expect(after).not.toBe(before);
      await db.query("update app.chunks set title = left(title, length(title) - 1) where id = $1", [seedA.chunkId]);
      expect(await fingerprint(a.id)).toBe(before);
    } finally {
      await db.end();
    }
  });

  it("differs between accounts and is unaffected by another account's write", async () => {
    const fa = await fingerprint(a.id);
    const fb = await fingerprint(b.id);
    expect(fa).not.toBe(fb);
    const db = await connect();
    try {
      await db.query("update app.nodes set mtime = mtime + 1 where user_id = $1", [b.id]);
    } finally {
      await db.end();
    }
    expect(await fingerprint(a.id)).toBe(fa);
    expect(await fingerprint(b.id)).not.toBe(fb);
  });
});

describe("export_account() through REST", () => {
  // A temporary pair of public functions that sleep 10 s, one with the 30 s setting and one
  // without: PostgREST hoists a function's statement_timeout, and the authenticator role's 8 s
  // applies otherwise. Dropped afterwards.
  it("passes past 8 s with the setting and is cut at 8 s without it", async () => {
    const db = await connect();
    try {
      await db.query(`
        create function public.tmp_sleep_with() returns text language sql volatile set search_path = ''
          set statement_timeout = '30s' as $$ select pg_sleep(10)::text || 'ok' $$;
        create function public.tmp_sleep_without() returns text language sql volatile set search_path = ''
          as $$ select pg_sleep(10)::text || 'ok' $$;
        revoke all on function public.tmp_sleep_with(), public.tmp_sleep_without() from public, anon, authenticated;
        grant execute on function public.tmp_sleep_with(), public.tmp_sleep_without() to service_role;
        notify pgrst, 'reload schema';`);
      const client = adminClient();
      let ready = false;
      for (let i = 0; i < 20 && !ready; i++) {
        const probe = await client.rpc("backup_fingerprint", { p_user_id: a.id });
        const known = await client.rpc("tmp_sleep_without");
        ready = !probe.error && known.error?.code !== "PGRST202";
        if (!ready) await new Promise((r) => setTimeout(r, 500));
      }
      const withSetting = await client.rpc("tmp_sleep_with");
      expect(withSetting.error).toBeNull();
      const without = await client.rpc("tmp_sleep_without");
      expect(without.error?.code).toBe("57014");
    } finally {
      await db.query("drop function if exists public.tmp_sleep_with(), public.tmp_sleep_without(); notify pgrst, 'reload schema'");
      await db.end();
    }
  }, 60_000);

  it("is refused to a signed-in user and to anon", async () => {
    const user = await signedInClient(a);
    const { error } = await user.rpc("export_account", { p_user_id: a.id });
    expect(error?.code).toBe("42501");
  });
});

describe("get_snapshot() backup key", () => {
  it("carries the caller's backup row with server_now, null when there is none, never another account's", async () => {
    const dbOwner = await connect();
    try {
      await dbOwner.query("delete from app.backup_status where user_id in ($1, $2)", [a.id, b.id]);
      await dbOwner.query(
        "insert into app.backup_status (user_id, last_result, last_checked_at, last_file_at, failure_reason) values ($1, 'failed', 11, 12, 'upload_failed')",
        [b.id],
      );
    } finally {
      await dbOwner.end();
    }
    const clientA = await signedInClient(a);
    const snapA = (await clientA.rpc("get_snapshot")).data;
    expect(snapA.backup).toBeNull();
    const clientB = await signedInClient(b);
    const snapB = (await clientB.rpc("get_snapshot")).data;
    expect(snapB.backup).toMatchObject({
      run_started_at: null, last_checked_at: 11, last_file_at: 12, last_result: "failed", failure_reason: "upload_failed",
    });
    expect(snapB.backup.server_now).toBeGreaterThan(0);
    expect(Object.keys(snapB).sort()).toEqual([
      "backup", "bits", "chunks", "nodes", "scratch_breakdowns", "staged_candidates",
    ]);
  });

  it("cannot read the table of another account through RLS", async () => {
    await withActor({ role: "authenticated", userId: a.id }, async (db) => {
      const { rows } = await db.query("select user_id from app.backup_status");
      expect(rows.every((r) => r.user_id === a.id)).toBe(true);
    });
  });
});
