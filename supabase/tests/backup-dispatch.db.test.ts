import { randomUUID } from "node:crypto";
import type { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MIN } from "./helpers/backup";
import { connect, withActor } from "./helpers/db";
import { listen, restoreVault, saveVault, setVault, sleep, waitFor, type Listener } from "./helpers/dispatch";
import { seedAccount } from "./helpers/seed";
import { createTestUser, type TestUser } from "./helpers/users";

// Task 256: the daily dispatch (internal.dispatch_backups(), internal.dispatch_backup_summary(), run
// by pg_cron as postgres), backup_summary() and the R2 deletion functions.

const HOUR = 60 * MIN;
const service = { role: "service_role" as const };

let db: Client;
let listener: Listener;
let saved: Awaited<ReturnType<typeof saveVault>>;
const made: string[] = [];
let savedState: Record<string, unknown>;

async function oauthUser(label: string, opts: { deletion?: boolean; provider?: string; anonymous?: boolean } = {}): Promise<TestUser> {
  const u = await createTestUser(label);
  made.push(u.id);
  await seedAccount(db, u.id);
  if (opts.deletion) await db.query("update app.accounts set deletion_requested_at = 1 where user_id = $1", [u.id]);
  if (opts.anonymous) await db.query("update auth.users set is_anonymous = true where id = $1", [u.id]);
  if (opts.provider !== "none") {
    await db.query(
      "insert into auth.identities (provider_id, user_id, identity_data, provider) values ($1, $2, '{}'::jsonb, $3)",
      [randomUUID(), u.id, opts.provider ?? "github"],
    );
  }
  return u;
}

beforeAll(async () => {
  db = await connect();
  saved = await saveVault(db);
  // The missing-count test commits changes to the one state row (pg_net needs committed data).
  savedState = (await db.query("select * from internal.backup_summary_state")).rows[0];
  listener = await listen();
});

afterAll(async () => {
  await restoreVault(db, saved);
  await db.query("update internal.backup_summary_state set last_summary_at = $1, over_limit = $2, backups_since = $3", [savedState.last_summary_at, savedState.over_limit, savedState.backups_since]);
  if (made.length > 0) await db.query("delete from auth.users where id = any($1)", [made]);
  await db.end();
  await listener.close();
});

async function withVault(url: string | null, secret: string | null) {
  await setVault(db, "backup_function_url", url);
  await setVault(db, "backup_shared_secret", secret);
  listener.received.length = 0;
}

describe("internal.dispatch_backups()", () => {
  it("sends one call per OAuth account with the shared secret, and skips a deletion request, an email-only user and a guest", async () => {
    const github = await oauthUser("dp-gh");
    const google = await oauthUser("dp-go", { provider: "google" });
    const deleting = await oauthUser("dp-del", { deletion: true });
    const emailOnly = await oauthUser("dp-mail", { provider: "none" });
    const guest = await oauthUser("dp-guest", { anonymous: true });
    await withVault(listener.url, "test-secret-1");
    await db.query("select internal.dispatch_backups()");
    const expected = [github.id, google.id];
    await waitFor(() => expected.every((id) => listener.received.some((r) => r.body.user_id === id)));
    await sleep(500);
    const ids = listener.received.map((r) => r.body.user_id);
    for (const id of expected) expect(ids.filter((x) => x === id)).toHaveLength(1);
    for (const u of [deleting, emailOnly, guest]) expect(ids).not.toContain(u.id);
    for (const r of listener.received) {
      expect(r.body.mode).toBe("scheduled");
      expect(r.headers["x-backup-secret"]).toBe("test-secret-1");
    }
  }, 30_000);

  it("sends nothing with no Vault entry, with one entry missing, or with a value that still reads env(NAME)", async () => {
    await oauthUser("dp-none");
    for (const [url, secret] of [
      [null, null],
      [listener.url, null],
      [null, "s"],
      [listener.url, "env(BACKUP_SHARED_SECRET)"],
      ["env(BACKUP_FUNCTION_URL)", "s"],
      [listener.url, ""],
    ] as const) {
      await withVault(url, secret);
      await db.query("select internal.dispatch_backups()");
      await db.query("select internal.dispatch_backup_summary()");
      await sleep(700);
      expect(listener.received, `${url} / ${secret}`).toHaveLength(0);
    }
  }, 30_000);

  it("is closed to every role but its owner, and the cron jobs call it", async () => {
    for (const role of ["anon", "authenticated", "service_role"] as const) {
      for (const fn of ["internal.dispatch_backups()", "internal.dispatch_backup_summary()", "internal.backup_targets()"]) {
        await withActor({ role, userId: role === "authenticated" ? randomUUID() : undefined }, async (c) => {
          await expect(c.query(`select ${fn.replace("()", "")}()`), `${role} ${fn}`).rejects.toMatchObject({ code: "42501" });
        });
      }
    }
    const { rows } = await db.query(
      "select jobname, schedule, command from cron.job where jobname in ('backup-dispatch', 'backup-summary-dispatch') order by jobname",
    );
    expect(rows).toEqual([
      { jobname: "backup-dispatch", schedule: "0 17 * * *", command: "select internal.dispatch_backups()" },
      { jobname: "backup-summary-dispatch", schedule: "0 19 * * *", command: "select internal.dispatch_backup_summary()" },
    ]);
  });
});

describe("internal.dispatch_backup_summary() missing count", () => {
  async function summaryCall(): Promise<{ missing: number; as_of: number }> {
    listener.received.length = 0;
    await db.query("select internal.dispatch_backup_summary()");
    await waitFor(() => listener.received.length > 0);
    expect(listener.received).toHaveLength(1);
    const body = listener.received[0].body as { mode: string; missing: number; as_of: number };
    expect(body.mode).toBe("summary");
    expect(listener.received[0].headers["x-backup-secret"]).toBe("test-secret-2");
    return body;
  }

  it("counts the targets whose 36-hour mark falls in the window, each once, and leaves out a deletion request", async () => {
    // Only these targets exist as targets: every earlier test user is removed first.
    await db.query("delete from auth.users where id = any($1)", [made.splice(0)]);
    const now = Number((await db.query("select (extract(epoch from now()) * 1000)::bigint as n")).rows[0].n);
    await withVault(listener.url, "test-secret-2");
    const setCreated = (id: string, ms: number) =>
      db.query("update auth.users set created_at = to_timestamp($2::double precision / 1000) where id = $1", [id, ms]);
    // The window is (now - 24 h, now]; backups began 100 h ago.
    await db.query("update internal.backup_summary_state set last_summary_at = $1, backups_since = $2", [now - 24 * HOUR, now - 100 * HOUR]);

    const newlyMissing = await oauthUser("sm-new"); // created 40 h ago, no result: mark = now - 4 h
    await setCreated(newlyMissing.id, now - 40 * HOUR);
    const alreadyCounted = await oauthUser("sm-old"); // created 10 days ago: mark = backups_since + 36 h = now - 64 h
    await setCreated(alreadyCounted.id, now - 240 * HOUR);
    const recent = await oauthUser("sm-recent"); // a result 30 h ago: mark = now + 6 h
    await db.query("insert into app.backup_status (user_id, last_finished_at, last_result) values ($1, $2, 'unchanged')", [recent.id, now - 30 * HOUR]);
    const stale = await oauthUser("sm-stale"); // a result 40 h ago: mark = now - 4 h
    await db.query("insert into app.backup_status (user_id, last_finished_at, last_result) values ($1, $2, 'unchanged')", [stale.id, now - 40 * HOUR]);
    // A permanently failing account is tried every day, so each failure is a result: never `missing`.
    const failing = await oauthUser("sm-failing");
    await setCreated(failing.id, now - 240 * HOUR);
    await db.query(
      "insert into app.backup_status (user_id, last_finished_at, last_result, failure_reason, failing_since) values ($1, $2, 'failed', 'upload_failed', $3)",
      [failing.id, now - 30 * HOUR, now - 10 * 24 * HOUR],
    );
    const deleting = await oauthUser("sm-del", { deletion: true });
    await setCreated(deleting.id, now - 40 * HOUR);

    expect((await summaryCall()).missing).toBe(2);

    // A pre-existing account that never gets a result is counted once, 36 h after backups began.
    await db.query("update internal.backup_summary_state set last_summary_at = $1, backups_since = $2", [now - 64 * HOUR - 1, now - 100 * HOUR]);
    expect((await summaryCall()).missing).toBe(3); // alreadyCounted joins the window
    await db.query("update internal.backup_summary_state set last_summary_at = $1", [now - 64 * HOUR]);
    expect((await summaryCall()).missing).toBe(2); // the mark is the window's open end: not again
  }, 30_000);
});

describe("backup_summary()", () => {
  const dbNow = async (c: Client) => Number((await c.query("select (extract(epoch from now()) * 1000)::bigint as n")).rows[0].n);
  const summary = async (c: Client, missing: number, asOf: number) =>
    (await c.query("select public.backup_summary($1, $2) as r", [missing, asOf])).rows[0].r.result;

  async function setup(c: Client, owner: <R>(run: () => Promise<R>) => Promise<R>) {
    const now = await dbNow(c);
    await owner(async () => {
      await c.query("delete from app.backup_status");
      await c.query("update internal.backup_summary_state set last_summary_at = $1, over_limit = false", [now - 24 * HOUR]);
    });
    return now;
  }

  it("counts a failure whose state or reason changed in the window once, and a repeat of it is not new", async () => {
    const u1 = await createTestUser("su-1");
    const u2 = await createTestUser("su-2");
    const u3 = await createTestUser("su-3");
    made.push(u1.id, u2.id, u3.id);
    await withActor(service, async (c, owner) => {
      const now = await setup(c, owner);
      await owner(async () => {
        await c.query("insert into app.backup_status (user_id, last_result, failure_reason, failure_changed_at) values ($1, 'failed', 'upload_failed', $2)", [u1.id, now - HOUR]);
        await c.query("insert into app.backup_status (user_id, last_result, failure_reason, failure_changed_at) values ($1, 'failed', 'upload_failed', $2)", [u2.id, now - 48 * HOUR]);
        await c.query("insert into app.backup_status (user_id, last_result) values ($1, 'written')", [u3.id]);
      });
      expect(await summary(c, 0, now)).toMatchObject({ new_failures: 1, failing: 2, missing: 0, over_limit: false });
      // The same failure on the next day: the window moved to as_of, so it is not new.
      expect(await summary(c, 0, now)).toMatchObject({ new_failures: 0, failing: 2 });
      // A changed reason is new.
      await owner(() => c.query("update app.backup_status set failure_reason = 'export_failed', failure_changed_at = $2 where user_id = $1", [u2.id, now]));
      expect(await summary(c, 0, now + 1000)).toMatchObject({ new_failures: 0 }); // at the closed end of the old window
      await owner(() => c.query("update app.backup_status set failure_changed_at = $2 where user_id = $1", [u2.id, now + 2000]));
      expect(await summary(c, 0, now + 3000)).toMatchObject({ new_failures: 1 });
    });
  });

  it("alerts on the 8 GB total only on the first summary above it", async () => {
    const u1 = await createTestUser("su-4");
    const u2 = await createTestUser("su-5");
    made.push(u1.id, u2.id);
    await withActor(service, async (c, owner) => {
      const now = await setup(c, owner);
      await owner(async () => {
        await c.query("insert into app.backup_status (user_id, stored_bytes) values ($1, 4000000000), ($2, 4000000000)", [u1.id, u2.id]);
      });
      expect((await summary(c, 0, now)).over_limit).toBe(false); // exactly 8 GB is not above it
      await owner(() => c.query("update app.backup_status set stored_bytes = 5000000000 where user_id = $1", [u1.id]));
      expect(await summary(c, 0, now)).toMatchObject({ over_limit: true, stored_bytes: 9000000000 });
      expect((await summary(c, 0, now)).over_limit).toBe(false); // kept above: no second alert
      await owner(() => c.query("update app.backup_status set stored_bytes = 1 where user_id = $1", [u1.id]));
      expect((await summary(c, 0, now)).over_limit).toBe(false);
      await owner(() => c.query("update app.backup_status set stored_bytes = 5000000000 where user_id = $1", [u1.id]));
      expect((await summary(c, 0, now)).over_limit).toBe(true); // above again after a drop
    });
  });

  it("records a stale start as interrupted inside the window, and passes the missing count back", async () => {
    const u = await createTestUser("su-6");
    made.push(u.id);
    await withActor(service, async (c, owner) => {
      const now = await setup(c, owner);
      await owner(() => c.query("insert into app.backup_status (user_id, run_started_at) values ($1, $2)", [u.id, now - 6 * MIN]));
      expect(await summary(c, 3, now - 1000)).toMatchObject({ new_failures: 1, failing: 1, missing: 3 });
      const { rows } = await c.query("select last_result, failure_reason, run_started_at from app.backup_status where user_id = $1", [u.id]);
      expect(rows[0]).toEqual({ last_result: "failed", failure_reason: "interrupted", run_started_at: null });
      expect((await summary(c, 0, now)).new_failures).toBe(0);
    });
  });

  it("refuses a null or negative missing count and an as_of in the future", async () => {
    for (const args of [[null, 1], [-1, 1], [0, null], [0, 99999999999999]]) {
      await withActor(service, async (c) => {
        await expect(c.query("select public.backup_summary($1, $2)", args)).rejects.toMatchObject({ code: "22023" });
      });
    }
  });

  it("changes no other column of a row that is not stale", async () => {
    const u = await createTestUser("su-7");
    made.push(u.id);
    await withActor(service, async (c, owner) => {
      const now = await setup(c, owner);
      await owner(() => c.query("insert into app.backup_status (user_id, last_result, stored_bytes, run_started_at) values ($1, 'written', 7, $2)", [u.id, now - MIN]));
      const before = (await c.query("select * from app.backup_status where user_id = $1", [u.id])).rows[0];
      await summary(c, 0, now);
      expect((await c.query("select * from app.backup_status where user_id = $1", [u.id])).rows[0]).toEqual(before);
    });
  });
});

describe("R2 deletion functions", () => {
  it("returns the rows older than one hour with their request time, increments attempts, and deletes one row", async () => {
    const old = randomUUID();
    const young = randomUUID();
    await withActor(service, async (c, owner) => {
      const now = await (async () => Number((await c.query("select (extract(epoch from now()) * 1000)::bigint as n")).rows[0].n))();
      await owner(async () => {
        await c.query("delete from internal.r2_deletions");
        await c.query("insert into internal.r2_deletions (user_id, requested_at) values ($1, $2), ($3, $4)", [old, now - 2 * HOUR, young, now - 10 * MIN]);
      });
      const due = (await c.query("select public.backup_due_deletions() as d")).rows[0].d;
      expect(due).toEqual([{ user_id: old, attempts: 0, requested_at: now - 2 * HOUR }]);
      await c.query("select public.backup_deletion_failed($1)", [old]);
      await c.query("select public.backup_deletion_failed($1)", [old]);
      const attempts = async (id: string) => (await owner(() => c.query("select attempts from internal.r2_deletions where user_id = $1", [id]))).rows[0]?.attempts;
      expect(await attempts(old)).toBe(2);
      expect(await attempts(young)).toBe(0);
      await c.query("select public.backup_deletion_done($1)", [old]);
      expect(await attempts(old)).toBeUndefined();
      expect(await attempts(young)).toBe(0);
    });
  });

  it("has no policy and no client right on internal.r2_deletions or backup_summary_state", async () => {
    for (const role of ["anon", "authenticated", "griddo_writer"] as const) {
      for (const table of ["internal.r2_deletions", "internal.backup_summary_state"]) {
        await withActor({ role, userId: role === "anon" ? undefined : randomUUID() }, async (c) => {
          await expect(c.query(`select * from ${table}`), `${role} ${table}`).rejects.toMatchObject({ code: "42501" });
        });
      }
    }
    await withActor(service, async (c) => {
      await expect(c.query("insert into internal.backup_summary_state (id, last_summary_at, backups_since) values (false, 1, 1)")).rejects.toMatchObject({ code: "42501" });
    });
    // service_role updates the two summary columns, never `backups_since`.
    await withActor(service, async (c) => {
      await c.query("update internal.backup_summary_state set last_summary_at = last_summary_at, over_limit = over_limit");
    });
    await withActor(service, async (c) => {
      await expect(c.query("update internal.backup_summary_state set backups_since = 1")).rejects.toMatchObject({ code: "42501" });
    });
  });
});

describe("backup_finish() arguments", () => {
  it("refuses each null or malformed argument with 22023", async () => {
    const u = await createTestUser("fa-1");
    made.push(u.id);
    const cases: unknown[][] = [
      [null, 1, "unchanged"],
      [u.id, null, "unchanged"],
      [u.id, 1, null],
      [u.id, 1, "other"],
      [u.id, 1, "written", null, 1, 1, 1],
      [u.id, 1, "written", "f", null, 1, 1],
      [u.id, 1, "written", "f", 1, null, 1],
      [u.id, 1, "written", "f", 1, 1, null],
      [u.id, 1, "failed"],
      [u.id, 1, "failed", null, null, null, null, "Bad Reason"],
    ];
    for (const args of cases) {
      await withActor(service, async (c) => {
        const padded = [...args, ...new Array(8 - args.length).fill(null)];
        await expect(c.query("select public.backup_finish($1, $2, $3, $4, $5, $6, $7, $8)", padded), JSON.stringify(args)).rejects.toMatchObject({ code: "22023" });
      });
    }
  });
});
