import type { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connect } from "./helpers/db";
import { seedAccount } from "./helpers/seed";
import { createTestUser, type TestUser } from "./helpers/users";

// Task 256: internal.cleanup_guests() from Phase 52 (SCHEMA §Guest cleanup): it locks each target's
// accounts row, checks again on the locked row, records an internal.r2_deletions row for a deleted
// real account in the same transaction, and a skipped account leaves no such row.

const DAY = 86_400_000;
let db: Client;
const made: string[] = [];

beforeAll(async () => {
  db = await connect();
});

afterAll(async () => {
  if (made.length > 0) {
    await db.query("delete from auth.users where id = any($1)", [made]);
    await db.query("delete from internal.r2_deletions where user_id = any($1)", [made]);
  }
  await db.end();
});

async function user(label: string, opts: { anonymous?: boolean; deletion?: boolean; account?: boolean } = {}): Promise<TestUser> {
  const u = await createTestUser(label);
  made.push(u.id);
  if (opts.anonymous) await db.query("update auth.users set is_anonymous = true where id = $1", [u.id]);
  if (opts.account !== false) {
    await seedAccount(db, u.id);
    if (opts.deletion) await db.query("update app.accounts set deletion_requested_at = 1 where user_id = $1", [u.id]);
  }
  return u;
}

const exists = async (u: TestUser) => (await db.query("select 1 from auth.users where id = $1", [u.id])).rowCount === 1;
const r2 = async (u: TestUser) => (await db.query("select * from internal.r2_deletions where user_id = $1", [u.id])).rows;

// A second connection that runs cleanup_guests() and reports when it returns.
async function runCleanupWhile(holder: Client, hold: () => Promise<void>, release: "commit" | "rollback", lockTimeoutMs?: number) {
  const runner = await connect();
  try {
    if (lockTimeoutMs) await runner.query(`set lock_timeout = '${lockTimeoutMs}ms'`);
    await holder.query("begin");
    await hold();
    let done = false;
    const pending = runner.query("select internal.cleanup_guests()").then(() => { done = true; });
    await new Promise((r) => setTimeout(r, 600));
    if (!lockTimeoutMs) expect(done, "cleanup waits for the lock").toBe(false);
    await holder.query(release);
    await pending;
  } finally {
    await runner.end();
  }
}

describe("cleanup_guests() and internal.r2_deletions", () => {
  it("records an r2_deletions row for a deleted real account and none for a guest", async () => {
    const real = await user("cl-real", { deletion: true });
    const guest = await user("cl-guest", { anonymous: true });
    await db.query("update app.accounts set last_visit_at = $2 where user_id = $1", [guest.id, 1]);
    await db.query("select internal.cleanup_guests()");
    expect(await exists(real)).toBe(false);
    expect(await exists(guest)).toBe(false);
    const rows = await r2(real);
    expect(rows).toHaveLength(1);
    expect(Number(rows[0].requested_at)).toBeGreaterThan(Date.now() - DAY);
    expect(rows[0].attempts).toBe(0);
    expect(await r2(guest)).toHaveLength(0);
  });

  it("records no row for a guest without an accounts row either, and none for a real account it keeps", async () => {
    const noAccount = await user("cl-noacc", { anonymous: true, account: false });
    await db.query("update auth.users set created_at = now() - interval '8 days' where id = $1", [noAccount.id]);
    const keep = await user("cl-keep");
    await db.query("select internal.cleanup_guests()");
    expect(await exists(noAccount)).toBe(false);
    expect(await r2(noAccount)).toHaveLength(0);
    expect(await exists(keep)).toBe(true);
    expect(await r2(keep)).toHaveLength(0);
  });

  it("skips an account whose deletion request was cancelled between its query and its lock", async () => {
    const real = await user("cl-cancel", { deletion: true });
    const holder = await connect();
    try {
      await runCleanupWhile(
        holder,
        // A cancel-like update: it holds the accounts row, so cleanup's unlocked query already saw the
        // request and its lock waits.
        async () => { await holder.query("update app.accounts set deletion_requested_at = null where user_id = $1", [real.id]); },
        "commit",
      );
    } finally {
      await holder.end();
    }
    expect(await exists(real)).toBe(true);
    expect(await r2(real)).toHaveLength(0);
    expect((await db.query("select deletion_requested_at from app.accounts where user_id = $1", [real.id])).rows[0].deletion_requested_at).toBeNull();
  }, 20_000);

  it("releases the locks of a skipped account at once, not when the whole run ends", async () => {
    const real = await user("cl-release", { deletion: true });
    const holder = await connect();
    const runner = await connect();
    const writer = await connect();
    try {
      await holder.query("begin");
      await holder.query("update app.accounts set deletion_requested_at = null where user_id = $1", [real.id]);
      await runner.query("begin"); // one open transaction, as pg_cron's whole run is
      const pending = runner.query("select internal.cleanup_guests()");
      await new Promise((r) => setTimeout(r, 600));
      await holder.query("commit");
      await pending; // the account was skipped; the run's transaction is still open
      await writer.query("set lock_timeout = '1500ms'");
      await writer.query("select 1 from auth.users where id = $1 for key share", [real.id]);
      await writer.query("update app.accounts set last_visit_at = last_visit_at + 1 where user_id = $1", [real.id]);
    } finally {
      await runner.query("rollback").catch(() => undefined);
      await holder.end();
      await runner.end();
      await writer.end();
    }
    expect(await exists(real)).toBe(true);
  }, 20_000);

  it("deletes it when the competing write leaves the request in place", async () => {
    const real = await user("cl-touch", { deletion: true });
    const holder = await connect();
    try {
      await runCleanupWhile(holder, async () => { await holder.query("update app.accounts set last_visit_at = last_visit_at + 1 where user_id = $1", [real.id]); }, "commit");
    } finally {
      await holder.end();
    }
    expect(await exists(real)).toBe(false);
    expect(await r2(real)).toHaveLength(1);
  }, 20_000);

  it("keeps a guest whose accounts row was created while cleanup waited for its auth user", async () => {
    const guest = await user("cl-race", { anonymous: true, account: false });
    await db.query("update auth.users set created_at = now() - interval '8 days' where id = $1", [guest.id]);
    const holder = await connect();
    try {
      await runCleanupWhile(
        holder,
        // The insert takes a key-share lock on the auth user through its foreign key, as ensure_account() does.
        async () => {
          await holder.query(
            "insert into app.accounts (user_id, created_at, last_visit_at) values ($1, 1, (extract(epoch from now()) * 1000)::bigint)",
            [guest.id],
          );
        },
        "commit",
      );
    } finally {
      await holder.end();
    }
    expect(await exists(guest)).toBe(true);
    expect((await db.query("select 1 from app.accounts where user_id = $1", [guest.id])).rowCount).toBe(1);
  }, 20_000);

  it("skips an account it cannot lock in time and leaves no r2_deletions row, then takes it on the next run", async () => {
    const busy = await user("cl-busy", { deletion: true });
    const holder = await connect();
    try {
      // The holder keeps the row until cleanup's lock_timeout has expired, then rolls back.
      await runCleanupWhile(holder, async () => { await holder.query("select 1 from app.accounts where user_id = $1 for update", [busy.id]); }, "rollback", 300);
    } finally {
      await holder.end();
    }
    expect(await exists(busy)).toBe(true);
    expect(await r2(busy)).toHaveLength(0);
    await db.query("select internal.cleanup_guests()");
    expect(await exists(busy)).toBe(false);
    expect(await r2(busy)).toHaveLength(1);
  }, 20_000);

  it("is not run twice for one account: a second run adds no row", async () => {
    const real = await user("cl-twice", { deletion: true });
    await db.query("select internal.cleanup_guests()");
    await db.query("select internal.cleanup_guests()");
    expect(await r2(real)).toHaveLength(1);
  });
});
