import { randomUUID } from "node:crypto";
import type { Client } from "pg";
import { beforeAll, describe, expect, it } from "vitest";
import { BACKUP_FUNCTIONS, MIN, backupRow, type BackupEnvelope } from "./helpers/backup";
import { becomeActor, connect, withActor } from "./helpers/db";
import { seedAccount } from "./helpers/seed";
import { createTestUser, type TestUser } from "./helpers/users";

// Task 256: the backup functions (SCHEMA §Backup functions, §Account backup), called as
// service_role through pg, the way supabase-js `.rpc()` reaches them.

let a: TestUser;
let b: TestUser;

const service = { role: "service_role" as const };

async function begin(db: Client, user: string, kind: "scheduled" | "manual", run: string | null = null) {
  const { rows } = await db.query("select public.backup_begin($1, $2, $3) as r", [user, kind, run]);
  return rows[0].r as BackupEnvelope;
}

async function finish(
  db: Client,
  user: string,
  token: number,
  result: "written" | "unchanged" | "failed",
  extra: { fingerprint?: string; at?: number; bytes?: number; stored?: number; reason?: string } = {},
) {
  const { rows } = await db.query("select public.backup_finish($1, $2, $3, $4, $5, $6, $7, $8) as r", [
    user, token, result, extra.fingerprint ?? null, extra.at ?? null, extra.bytes ?? null,
    extra.stored ?? null, extra.reason ?? null,
  ]);
  return rows[0].r as BackupEnvelope;
}

async function readStatus(db: Client, user: string, run: string | null = null) {
  const { rows } = await db.query("select public.backup_read_status($1, $2) as r", [user, run]);
  return rows[0].r as BackupEnvelope;
}

beforeAll(async () => {
  a = await createTestUser("bk-a");
  b = await createTestUser("bk-b");
  const db = await connect();
  try {
    await seedAccount(db, a.id);
    await seedAccount(db, b.id);
  } finally {
    await db.end();
  }
});

describe("backup function rights", () => {
  it("gives anon and authenticated permission denied on every backup function", async () => {
    const calls: Record<(typeof BACKUP_FUNCTIONS)[number], string> = {
      export_account: "select public.export_account($1)",
      backup_fingerprint: "select public.backup_fingerprint($1)",
      backup_begin: "select public.backup_begin($1, 'scheduled', null)",
      backup_finish: "select public.backup_finish($1, 1, 'unchanged')",
      backup_read_status: "select public.backup_read_status($1)",
      backup_summary: "select public.backup_summary(0, 1)",
      backup_due_deletions: "select public.backup_due_deletions()",
      backup_deletion_done: "select public.backup_deletion_done($1)",
      backup_deletion_failed: "select public.backup_deletion_failed($1)",
    };
    for (const role of ["anon", "authenticated"] as const) {
      for (const name of BACKUP_FUNCTIONS) {
        await withActor({ role, userId: role === "authenticated" ? a.id : undefined }, async (db) => {
          const text = calls[name];
          const args = text.includes("$1") ? [a.id] : [];
          await expect(db.query(text, args), `${role} ${name}`).rejects.toMatchObject({ code: "42501" });
        });
      }
    }
  });

  it("runs every backup function as security invoker with an empty search_path", async () => {
    const db = await connect();
    try {
      const { rows } = await db.query(
        `select p.proname, p.prosecdef, p.proconfig, pg_get_userbyid(p.proowner) as owner
           from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = any($1)`,
        [BACKUP_FUNCTIONS as unknown as string[]],
      );
      expect(rows.map((r) => r.proname).sort()).toEqual([...BACKUP_FUNCTIONS].sort());
      for (const r of rows) {
        expect(r.prosecdef, r.proname).toBe(false);
        expect(r.owner, r.proname).toBe("postgres");
        expect(r.proconfig, r.proname).toContain('search_path=""');
      }
    } finally {
      await db.end();
    }
  });
});

describe("backup functions and account isolation", () => {
  it("leaves another account's rows untouched through every backup function", async () => {
    await withActor(service, async (db) => {
      await begin(db, a.id, "scheduled");
      await begin(db, b.id, "scheduled");
      const beforeB = await backupRow(db, b.id);
      // A's own run is in progress; finish it with its token.
      const rowA = (await backupRow(db, a.id))!;
      await finish(db, a.id, Number(rowA.run_started_at), "written", {
        fingerprint: "f", at: 5, bytes: 7, stored: 9,
      });
      await readStatus(db, a.id);
      await db.query("select public.backup_fingerprint($1)", [a.id]);
      await db.query("select public.backup_deletion_failed($1)", [a.id]);
      await db.query("select public.backup_deletion_done($1)", [a.id]);
      expect(await backupRow(db, b.id)).toEqual(beforeB);
      // The export of A holds A's rows and nothing of B's.
      const { rows } = await db.query("select public.export_account($1) as e", [a.id]);
      const exported = rows[0].e;
      for (const table of ["nodes", "bits", "chunks", "scratch_breakdowns", "staged_candidates"]) {
        expect(exported[table].length, table).toBe(1);
        expect(exported[table][0].user_id, table).toBe(a.id);
      }
      expect(exported.user_id).toBe(a.id);
    });
  });

  it("takes the user id from the argument only: a status write for account A leaves B's row unchanged", async () => {
    await withActor(service, async (db) => {
      await begin(db, b.id, "scheduled");
      const beforeB = await backupRow(db, b.id);
      const rowA = (await begin(db, a.id, "scheduled")).result!;
      await finish(db, a.id, rowA.run_token, "failed", { reason: "upload_failed" });
      expect(await backupRow(db, b.id)).toEqual(beforeB);
      expect((await backupRow(db, a.id))!.failure_reason).toBe("upload_failed");
    });
  });
});

describe("backup_begin() and backup_finish()", () => {
  it("refuses a second Back Up Now within 5 minutes with rate_limited, and records the run id", async () => {
    await withActor(service, async (db, owner) => {
      const run = randomUUID();
      const first = await begin(db, a.id, "manual", run);
      expect(first.status).toBe("applied");
      await finish(db, a.id, first.result!.run_token, "unchanged");
      const second = await begin(db, a.id, "manual", randomUUID());
      expect(second).toMatchObject({ status: "rejected", rejection: { code: "rate_limited" } });
      expect((await backupRow(db, a.id))!.manual_run_id).toBe(run);
      // 5 minutes after the accepted one it is allowed again.
      await owner(() => db.query("update app.backup_status set last_backup_now_at = last_backup_now_at - $2 where user_id = $1", [a.id, 5 * MIN + 1]));
      expect((await begin(db, a.id, "manual", randomUUID())).status).toBe("applied");
    });
  });

  it("refuses a run while another is in progress with already_running, and a scheduled refusal records nothing", async () => {
    await withActor(service, async (db) => {
      const first = await begin(db, a.id, "scheduled");
      expect(first.status).toBe("applied");
      const before = await backupRow(db, a.id);
      const scheduled = await begin(db, a.id, "scheduled");
      expect(scheduled).toMatchObject({ status: "rejected", rejection: { code: "already_running" } });
      const manual = await begin(db, a.id, "manual", randomUUID());
      expect(manual).toMatchObject({ status: "rejected", rejection: { code: "already_running" } });
      expect(await backupRow(db, a.id)).toEqual(before);
    });
  });

  it("checks already_running before rate_limited", async () => {
    await withActor(service, async (db) => {
      const m = await begin(db, a.id, "manual", randomUUID());
      expect(m.status).toBe("applied");
      // In progress and inside the 5 minutes: the progress refusal wins.
      expect((await begin(db, a.id, "manual", randomUUID())).rejection?.code).toBe("already_running");
    });
  });

  it("gives one refusal for two concurrent Back Up Now calls", async () => {
    const u = await createTestUser("bk-conc");
    const setup = await connect();
    await seedAccount(setup, u.id);
    await setup.end();
    const c1 = await connect();
    const c2 = await connect();
    try {
      await c1.query("begin");
      await becomeActor(c1, service);
      const first = await begin(c1, u.id, "manual", randomUUID());
      expect(first.status).toBe("applied");
      // The second call waits for the first one's row lock, then sees its start.
      await c2.query("begin");
      await becomeActor(c2, service);
      const pending = begin(c2, u.id, "manual", randomUUID());
      await new Promise((r) => setTimeout(r, 300));
      await c1.query("commit");
      const second = await pending;
      await c2.query("commit");
      expect(second.status).toBe("rejected");
      expect(["already_running", "rate_limited"]).toContain(second.rejection?.code);
    } finally {
      await c1.query("rollback").catch(() => undefined);
      await c2.query("rollback").catch(() => undefined);
      await c1.end();
      await c2.end();
    }
  });

  it("records a 5-minute-old start as interrupted, on the next begin, status read and summary", async () => {
    await withActor(service, async (db, owner) => {
      const run = (await begin(db, a.id, "scheduled")).result!;
      await owner(() => db.query("update app.backup_status set run_started_at = run_started_at - $2 where user_id = $1", [a.id, 5 * MIN + 1000]));
      // A 4-minute-old start is still running.
      const next = await begin(db, a.id, "scheduled");
      expect(next.status).toBe("applied");
      const row = (await backupRow(db, a.id))!;
      expect(row.run_started_at).toBe(String(next.result!.run_token));
      expect(row.last_result).toBe("failed");
      expect(row.failure_reason).toBe("interrupted");
      expect(row.failing_since).not.toBeNull();
      // The late finish of the interrupted run changes nothing. (One test transaction shares one
      // clock, so the interrupted run's own token is its shifted start.)
      expect((await finish(db, a.id, run.run_token - (5 * MIN + 1000), "written", { fingerprint: "x", at: 1, bytes: 1, stored: 1 })).status).toBe("not_applied");
      // Status read records a stale start too.
      await owner(() => db.query("update app.backup_status set run_started_at = run_started_at - $2 where user_id = $1", [a.id, 6 * MIN]));
      const read = (await readStatus(db, a.id)).result!;
      expect(read.backup.run_started_at).toBeNull();
      expect(read.backup.failure_reason).toBe("interrupted");
      expect(read.backup.server_now).toBeGreaterThan(0);
    });
  });

  it("does not interrupt a 4-minute-old start", async () => {
    await withActor(service, async (db, owner) => {
      await begin(db, a.id, "scheduled");
      await owner(() => db.query("update app.backup_status set run_started_at = run_started_at - $2 where user_id = $1", [a.id, 4 * MIN]));
      expect((await begin(db, a.id, "scheduled")).rejection?.code).toBe("already_running");
    });
  });

  it("records written, unchanged and failed, clears run_started_at, and keeps failing_since across a streak", async () => {
    await withActor(service, async (db) => {
      const r1 = (await begin(db, a.id, "scheduled")).result!;
      await finish(db, a.id, r1.run_token, "written", { fingerprint: "fp", at: 10, bytes: 20, stored: 30 });
      let row = (await backupRow(db, a.id))!;
      expect(row).toMatchObject({
        run_started_at: null, last_result: "written", last_fingerprint: "fp",
        last_file_at: "10", last_file_bytes: "20", stored_bytes: "30", failure_reason: null, failing_since: null,
      });
      expect(row.last_checked_at).not.toBeNull();
      expect(row.last_finished_at).not.toBeNull();

      const r2 = (await begin(db, a.id, "scheduled")).result!;
      await finish(db, a.id, r2.run_token, "unchanged");
      row = (await backupRow(db, a.id))!;
      expect(row).toMatchObject({ last_result: "unchanged", last_file_at: "10", stored_bytes: "30" });

      const r3 = (await begin(db, a.id, "scheduled")).result!;
      await finish(db, a.id, r3.run_token, "failed", { reason: "upload_failed" });
      const first = (await backupRow(db, a.id))!;
      expect(first).toMatchObject({ last_result: "failed", failure_reason: "upload_failed", run_started_at: null });
      expect(first.last_checked_at).toBe(row.last_checked_at); // a failure is not a check
      const since = first.failing_since;
      const changed = first.failure_changed_at;

      const r4 = (await begin(db, a.id, "scheduled")).result!;
      await finish(db, a.id, r4.run_token, "failed", { reason: "upload_failed" });
      const again = (await backupRow(db, a.id))!;
      expect(again.failing_since).toBe(since);
      expect(again.failure_changed_at).toBe(changed); // the same failure is not new
    });
  });

  it("refuses a result with a missing field, a bad reason or an unknown result", async () => {
    await withActor(service, async (db) => {
      await expect(db.query("select public.backup_finish($1, 1, 'written')", [a.id])).rejects.toMatchObject({ code: "22023" });
    });
    await withActor(service, async (db) => {
      await expect(db.query("select public.backup_finish($1, 1, 'failed', null, null, null, null, 'Bad Reason!')", [a.id])).rejects.toMatchObject({ code: "22023" });
    });
    await withActor(service, async (db) => {
      await expect(db.query("select public.backup_finish($1, 1, 'weird')", [a.id])).rejects.toMatchObject({ code: "22023" });
    });
  });

  it("refuses an account that does not exist or has a deletion request", async () => {
    await withActor(service, async (db) => {
      const none = await begin(db, randomUUID(), "scheduled");
      expect(none).toMatchObject({ status: "rejected", rejection: { code: "account_missing" } });
    });
    await withActor(service, async (db, owner) => {
      await owner(() => db.query("update app.accounts set deletion_requested_at = 1 where user_id = $1", [a.id]));
      expect((await begin(db, a.id, "scheduled")).rejection?.code).toBe("account_deleting");
      expect((await db.query("select public.export_account($1) as e", [a.id])).rows[0].e).toEqual({ rejection: { code: "account_deleting" } });
    });
  });
});

describe("backup_read_status() verdicts", () => {
  it("returns running, the result, interrupted or not_started for the given run id, never another run's result", async () => {
    await withActor(service, async (db, owner) => {
      const run = randomUUID();
      const other = randomUUID();
      expect((await readStatus(db, a.id, run)).result!.verdict).toBe("not_started");
      const started = (await begin(db, a.id, "manual", run)).result!;
      expect((await readStatus(db, a.id, run)).result!.verdict).toBe("running");
      expect((await readStatus(db, a.id, other)).result!.verdict).toBe("not_started");
      await finish(db, a.id, started.run_token, "written", { fingerprint: "z", at: 1, bytes: 1, stored: 1 });
      expect((await readStatus(db, a.id, run)).result!.verdict).toBe("written");
      expect((await readStatus(db, a.id, other)).result!.verdict).toBe("not_started");
      expect((await readStatus(db, a.id)).result!.verdict).toBeNull();
      // Another account never reports this run.
      expect((await readStatus(db, b.id, run)).result!.verdict).toBe("not_started");

      // A manual run that dies is `interrupted` even after a later scheduled run starts.
      await owner(() => db.query("update app.backup_status set last_backup_now_at = last_backup_now_at - $2 where user_id = $1", [a.id, 6 * MIN]));
      const dead = randomUUID();
      await begin(db, a.id, "manual", dead);
      await owner(() => db.query("update app.backup_status set run_started_at = run_started_at - $2, last_backup_now_at = last_backup_now_at - $2 where user_id = $1", [a.id, 5 * MIN + 1000]));
      const scheduled = await begin(db, a.id, "scheduled");
      expect(scheduled.status).toBe("applied");
      expect((await readStatus(db, a.id, dead)).result!.verdict).toBe("interrupted");
    });
  });

  it("returns a null backup for an account with no status row", async () => {
    await withActor(service, async (db) => {
      const fresh = await createTestUser("bk-fresh");
      expect((await readStatus(db, fresh.id)).result).toEqual({ backup: null, verdict: null });
    });
  });
});
