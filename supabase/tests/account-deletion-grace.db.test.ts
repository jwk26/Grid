import type { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { becomeActor, connect, withActor } from "./helpers/db";
import { openSession, waitForLockWait } from "./helpers/lifecycle";
import { createTestUser, type TestUser } from "./helpers/users";

// Task 265: the account deletion grace period and cancel_account_deletion() (SCHEMA §Account
// deletion, Grace period and cancel; deletion-grace Decisions 1-4, 7, 9). A request younger than
// 24 hours survives the daily cleanup; a cancel clears only the caller's request.

const HOUR = 3_600_000;
type Envelope = { status: string; result: unknown; changes: Record<string, unknown>; rejection?: Record<string, unknown> };

const as = (u: TestUser) => ({ role: "authenticated" as const, userId: u.id });

async function cancel(db: Client): Promise<Envelope> {
  const { rows } = await db.query("select public.cancel_account_deletion() as e");
  return rows[0].e as Envelope;
}
async function ensure(db: Client): Promise<Envelope> {
  const { rows } = await db.query("select public.ensure_account() as e");
  return rows[0].e as Envelope;
}
async function requestDeletion(db: Client): Promise<Envelope> {
  const { rows } = await db.query("select public.delete_my_account() as e");
  return rows[0].e as Envelope;
}
async function requestedAt(db: Client, userId: string): Promise<number | null> {
  const { rows } = await db.query("select deletion_requested_at::text as t from app.accounts where user_id = $1", [userId]);
  return rows.length === 0 || rows[0].t === null ? null : Number(rows[0].t);
}
async function authUserExists(db: Client, u: TestUser): Promise<boolean> {
  return (await db.query("select 1 from auth.users where id = $1", [u.id])).rowCount === 1;
}
async function r2Rows(db: Client, u: TestUser): Promise<number> {
  return (await db.query("select 1 from internal.r2_deletions where user_id = $1", [u.id])).rowCount ?? 0;
}
// An account on committed data whose deletion was requested `hoursAgo` hours ago (null: no request).
async function committedAccount(db: Client, label: string, hoursAgo: number | null): Promise<TestUser> {
  const u = await createTestUser(label);
  await db.query("begin");
  await becomeActor(db, as(u));
  await ensure(db);
  if (hoursAgo !== null) await requestDeletion(db);
  await db.query("commit");
  await db.query("reset role");
  if (hoursAgo !== null) {
    await db.query(
      "update app.accounts set deletion_requested_at = (extract(epoch from now()) * 1000)::bigint - $2::bigint where user_id = $1",
      [u.id, Math.round(hoursAgo * HOUR)],
    );
  }
  return u;
}

let owner: Client;
beforeAll(async () => {
  owner = await connect();
});
afterAll(async () => {
  await owner.end();
});

describe("cancel_account_deletion()", () => {
  it("clears the caller's request and nothing else", async () => {
    const user = await createTestUser("cga");
    await withActor(as(user), async (db) => {
      await ensure(db);
      await requestDeletion(db);
      expect(await cancel(db)).toEqual({ status: "applied", result: null, changes: {} });
      await becomeActor(db, { role: "owner" });
      expect(await requestedAt(db, user.id)).toBeNull();
      await becomeActor(db, as(user));
      expect((await ensure(db)).rejection).toBeUndefined();
    });
  });

  it("succeeds with no request and changes nothing", async () => {
    const user = await createTestUser("cgb");
    await withActor(as(user), async (db) => {
      await ensure(db);
      expect(await cancel(db)).toEqual({ status: "applied", result: null, changes: {} });
      expect(await cancel(db)).toEqual({ status: "applied", result: null, changes: {} });
      await becomeActor(db, { role: "owner" });
      expect(await requestedAt(db, user.id)).toBeNull();
    });
  });

  it("rejects a caller with no account row with account_missing", async () => {
    const fresh = await createTestUser("cgc");
    await withActor(as(fresh), async (db) => {
      expect(await cancel(db)).toEqual({ status: "rejected", result: null, changes: {}, rejection: { code: "account_missing" } });
    });
  });

  it("never touches another account's request or rows", async () => {
    const user = await createTestUser("cgd");
    const other = await createTestUser("cge");
    await withActor(as(other), async (db) => {
      await ensure(db);
      await requestDeletion(db);
      await becomeActor(db, { role: "owner" });
      const before = await requestedAt(db, other.id);
      expect(before).toBeGreaterThan(0);
      const { rows: rowsBefore } = await db.query("select count(*)::int as n from app.nodes where user_id = $1", [other.id]);
      await becomeActor(db, as(user));
      await ensure(db);
      await requestDeletion(db);
      await cancel(db); // runs the update: the caller has a request of its own
      await becomeActor(db, { role: "owner" });
      expect(await requestedAt(db, user.id)).toBeNull();
      expect(await requestedAt(db, other.id)).toBe(before);
      const { rows: rowsAfter } = await db.query("select count(*)::int as n from app.nodes where user_id = $1", [other.id]);
      expect(rowsAfter[0].n).toBe(rowsBefore[0].n);
    });
  });

  it("before + changes equals after for a cancel, a repeat and a rejection", async () => {
    // A cancel writes no row of the five tables, so the match is checked on their full contents.
    const user = await createTestUser("cgf");
    const gone = await createTestUser("cgg");
    await withActor(as(user), async (db) => {
      await ensure(db);
      const counts = async () => {
        await becomeActor(db, { role: "owner" });
        const out: Record<string, unknown> = {};
        for (const t of ["nodes", "bits", "chunks", "scratch_breakdowns", "staged_candidates"]) {
          const { rows } = await db.query(
            `select coalesce(jsonb_agg(to_jsonb(t.*) order by t.id), '[]'::jsonb) as r from app.${t} t where t.user_id = $1`,
            [user.id],
          );
          out[t] = rows[0].r;
        }
        await becomeActor(db, as(user));
        return out;
      };
      const before = await counts();
      await requestDeletion(db);
      const first = await cancel(db);
      const repeat = await cancel(db);
      expect(first.changes).toEqual({});
      expect(repeat.changes).toEqual({});
      expect(await counts()).toEqual(before);
      await becomeActor(db, as(gone));
      const rejected = await cancel(db);
      expect(rejected.rejection).toEqual({ code: "account_missing" });
      expect(rejected.changes).toEqual({});
    });
  });

  it("needs a signed-in caller, and is closed to anon and service_role", async () => {
    await withActor({ role: "authenticated" }, async (db) => {
      await expect(cancel(db)).rejects.toMatchObject({ code: "28000" });
    });
    for (const role of ["anon", "service_role"] as const) {
      await withActor({ role }, async (db) => {
        await expect(cancel(db)).rejects.toMatchObject({ code: "42501" });
      });
    }
  });
});

describe("ensure_account() on an account with a request", () => {
  it("rejects with account_deleting and carries the request time and the server's time", async () => {
    const user = await createTestUser("cgh");
    await withActor(as(user), async (db) => {
      await ensure(db);
      await requestDeletion(db);
      await becomeActor(db, { role: "owner" });
      const stored = await requestedAt(db, user.id);
      await becomeActor(db, as(user));
      const envelope = await ensure(db);
      expect(envelope.status).toBe("rejected");
      expect(envelope.rejection).toEqual({
        code: "account_deleting",
        deletion_requested_at: stored,
        server_now: expect.any(Number),
      });
      expect(envelope.rejection?.server_now as number).toBeGreaterThanOrEqual(stored as number);
    });
  });
});

describe("the server's time in the rejection", () => {
  it("is the current time, not the request time", async () => {
    const u = await committedAccount(owner, "cgs", 5);
    const stored = await requestedAt(owner, u.id);
    await owner.query("begin");
    await becomeActor(owner, as(u));
    const envelope = await ensure(owner);
    await owner.query("rollback");
    await owner.query("reset role");
    const gap = (envelope.rejection?.server_now as number) - (stored as number);
    expect(gap).toBeGreaterThanOrEqual(5 * HOUR);
    expect(gap).toBeLessThan(5 * HOUR + 60_000);
  });
});

describe("the cleanup and the grace period", () => {
  it("keeps a request younger than 24 hours and deletes one older than that", async () => {
    const young = await committedAccount(owner, "cgy", 23);
    const old = await committedAccount(owner, "cgo", 25);
    await owner.query("select internal.cleanup_guests()");
    expect(await authUserExists(owner, young)).toBe(true);
    expect(await requestedAt(owner, young.id)).not.toBeNull();
    expect(await r2Rows(owner, young)).toBe(0);
    expect(await authUserExists(owner, old)).toBe(false);
    expect(await r2Rows(owner, old)).toBe(1);
  });

  it("keeps a request of exactly 24 hours and deletes one a millisecond older", async () => {
    const edge = await committedAccount(owner, "cge1", 1);
    const over = await committedAccount(owner, "cge2", 1);
    await owner.query("begin");
    try {
      // One transaction: the update and the cleanup read the same transaction_timestamp().
      for (const [u, ms] of [[edge, 86_400_000], [over, 86_400_001]] as const) {
        await owner.query(
          "update app.accounts set deletion_requested_at = (extract(epoch from transaction_timestamp()) * 1000)::bigint - $2::bigint where user_id = $1",
          [u.id, ms],
        );
      }
      await owner.query("select internal.cleanup_guests()");
      expect(await authUserExists(owner, edge)).toBe(true);
      expect(await authUserExists(owner, over)).toBe(false);
    } finally {
      await owner.query("rollback");
    }
  });

  it("records no r2_deletions row for a cancelled account, which the cleanup keeps", async () => {
    const u = await committedAccount(owner, "cgk", 30);
    await owner.query("begin");
    await becomeActor(owner, as(u));
    // A request this old still cancels: the cancel works until the cleanup has run.
    expect((await cancel(owner)).status).toBe("applied");
    await owner.query("commit");
    await owner.query("reset role");
    await owner.query("select internal.cleanup_guests()");
    expect(await authUserExists(owner, u)).toBe(true);
    expect(await r2Rows(owner, u)).toBe(0);
  });
});

describe("a cancel against the cleanup", () => {
  it("that locked first leaves nothing to delete", async () => {
    const u = await committedAccount(owner, "cgl", 30);
    const a = await openSession(u);
    const cleaner = await connect();
    const watcher = await connect();
    try {
      expect((await cancel(a)).status).toBe("applied");
      const pending = cleaner.query("select internal.cleanup_guests()");
      await waitForLockWait(watcher, "cleanup_guests");
      await a.query("commit");
      await pending;
      expect(await authUserExists(owner, u)).toBe(true);
      expect(await requestedAt(owner, u.id)).toBeNull();
      expect(await r2Rows(owner, u)).toBe(0);
    } finally {
      await a.query("rollback").catch(() => undefined);
      await a.end();
      await cleaner.end();
      await watcher.end();
    }
  });

  it("that waits behind the cleanup gets account_missing", async () => {
    const u = await committedAccount(owner, "cgm", 30);
    const cleaner = await connect();
    const b = await openSession(u);
    const watcher = await connect();
    try {
      await cleaner.query("begin");
      await cleaner.query("select internal.cleanup_guests()");
      const pending = cancel(b);
      await waitForLockWait(watcher, "cancel_account_deletion");
      await cleaner.query("commit");
      expect(await pending).toMatchObject({ status: "rejected", rejection: { code: "account_missing" } });
      expect(await authUserExists(owner, u)).toBe(false);
      expect(await r2Rows(owner, u)).toBe(1);
    } finally {
      await cleaner.query("rollback").catch(() => undefined);
      await b.query("rollback").catch(() => undefined);
      await cleaner.end();
      await b.end();
      await watcher.end();
    }
  });
});

describe("the cleanup's recheck", () => {
  it("applies the 24 hours again: a cancel and a new request while it waits keep the account", async () => {
    const u = await committedAccount(owner, "cgr", 30);
    const a = await openSession(u);
    const cleaner = await connect();
    const watcher = await connect();
    try {
      await cancel(a);
      await requestDeletion(a);
      const pending = cleaner.query("select internal.cleanup_guests()");
      await waitForLockWait(watcher, "cleanup_guests");
      await a.query("commit");
      await pending;
      expect(await authUserExists(owner, u)).toBe(true);
      expect(await requestedAt(owner, u.id)).not.toBeNull();
      expect(await r2Rows(owner, u)).toBe(0);
    } finally {
      await a.query("rollback").catch(() => undefined);
      await a.end();
      await cleaner.end();
      await watcher.end();
    }
  });
});
