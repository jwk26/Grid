import { randomUUID } from "node:crypto";
import type { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { backupRow } from "./helpers/backup";
import {
  asBearer, callFunction, createOAuthUser, listFiles, putObject, readExport, readObject,
  removeAccountObjects, removeObjects, type OAuthUser,
} from "./helpers/backup-function";
import { sharedSecret } from "./helpers/backup-function";
import { connect } from "./helpers/db";

// Task 257, Stage 2: the scheduled, manual and status modes against the served function and local
// Storage as R2 (SCHEMA §Account backup; DECISION §Runner, §Retention, §Deleting R2 objects).

let db: Client;
const made: OAuthUser[] = [];
const extraKeys: string[] = [];

async function newUser(label: string, opts: { oauth?: boolean } = {}): Promise<OAuthUser> {
  const u = await createOAuthUser(db, label, opts);
  made.push(u);
  return u;
}
const manual = (u: OAuthUser, extra: Record<string, unknown> = {}) =>
  callFunction({ body: { mode: "manual", run_id: randomUUID(), ...extra }, headers: asBearer(u.jwt) });
const scheduled = (userId: string) =>
  callFunction({ body: { mode: "scheduled", user_id: userId }, headers: { "x-backup-secret": sharedSecret() } });

beforeAll(async () => {
  db = await connect();
});

afterAll(async () => {
  for (const u of made) await removeAccountObjects(u.id);
  await removeObjects(extraKeys);
  await db.end();
});

describe("manual", () => {
  it("backs up only the caller when the body names another account", async () => {
    const a = await newUser("bkf-a");
    const b = await newUser("bkf-b");
    const r = await manual(a, { user_id: b.id });
    expect(r.status).toBe(200);
    expect(r.json).toMatchObject({ status: "applied", result: { result: "written" } });
    const files = await listFiles(a.id);
    const today = new Date().toISOString().slice(0, 10);
    expect(files).toEqual([`${today}.json.gz`, "identity.json"]);
    expect(await listFiles(b.id)).toEqual([]);
    expect(await backupRow(db, b.id)).toBeUndefined();
    const exported = await readExport(`accounts/${a.id}/${today}.json.gz`);
    expect(exported).toMatchObject({ format_version: 1, user_id: a.id });
    expect(exported.bits.length).toBe(1);
    expect(exported.bits[0].user_id).toBe(a.id);
    const row = (await backupRow(db, a.id))!;
    expect(row).toMatchObject({ last_result: "written", run_started_at: null, manual_result: "written" });
    expect(Number(row.stored_bytes)).toBeGreaterThan(0);
    expect(row.last_fingerprint).toBe(exported.fingerprint);
  });

  it("writes identity.json with the providers and provider user ids, and no email", async () => {
    const a = await newUser("bkf-id");
    await manual(a);
    const text = (await readObject(`accounts/${a.id}/identity.json`)).toString("utf8");
    expect(JSON.parse(text)).toEqual({
      user_id: a.id,
      providers: [{ provider: "github", provider_user_id: a.providerUserId }],
    });
    expect(text).not.toContain("@");
    expect(text).not.toContain(a.email);
  });

  it("refuses an account with no OAuth identity and records and writes nothing", async () => {
    const e = await newUser("bkf-email", { oauth: false });
    const r = await manual(e);
    expect(r.status).toBe(200);
    expect(r.json).toEqual({ status: "rejected", rejection: { code: "not_eligible" } });
    expect(await backupRow(db, e.id)).toBeUndefined();
    expect(await listFiles(e.id)).toEqual([]);
  });

  it("answers rate_limited for a second Back Up Now within 5 minutes", async () => {
    const a = await newUser("bkf-rate");
    expect((await manual(a)).json.result.result).toBe("written");
    const second = await manual(a);
    expect(second.status).toBe(200);
    expect(second.json).toEqual({ status: "rejected", rejection: { code: "rate_limited" } });
  });

  it("returns the status line with the run, and the verdict by run id on a status read", async () => {
    const a = await newUser("bkf-status");
    const runId = randomUUID();
    const r = await callFunction({ body: { mode: "manual", run_id: runId }, headers: asBearer(a.jwt) });
    expect(r.json.backup).toMatchObject({ last_result: "written", run_started_at: null });
    const s = await callFunction({ body: { mode: "status", run_id: runId }, headers: asBearer(a.jwt) });
    expect(s.status).toBe(200);
    expect(s.json.result.verdict).toBe("written");
    expect(s.json.result.backup.server_now).toBeGreaterThan(0);
    const other = await callFunction({ body: { mode: "status", run_id: randomUUID() }, headers: asBearer(a.jwt) });
    expect(other.json.result.verdict).toBe("not_started");
    // Another account's JWT never reads this one's row.
    const b = await newUser("bkf-status-b");
    const cross = await callFunction({ body: { mode: "status", run_id: runId }, headers: asBearer(b.jwt) });
    expect(cross.json.result.verdict).toBe("not_started");
    expect(cross.json.result.backup).toBeNull();
  });

  it("records a start older than 5 minutes as interrupted when the status is read", async () => {
    const a = await newUser("bkf-int");
    await db.query("insert into app.backup_status (user_id, run_started_at) values ($1, $2)", [
      a.id, Date.now() - 6 * 60_000,
    ]);
    const s = await callFunction({ body: { mode: "status" }, headers: asBearer(a.jwt) });
    expect(s.json.result.backup).toMatchObject({ last_result: "failed", failure_reason: "interrupted", run_started_at: null });
  });
});

describe("scheduled", () => {
  it("skips an unchanged account: no new file, the check recorded, old files kept", async () => {
    const a = await newUser("bkf-same");
    const first = await scheduled(a.id);
    expect(first.json).toMatchObject({ status: "applied", result: { result: "written" } });
    const row1 = (await backupRow(db, a.id))!;
    const old = `accounts/${a.id}/2026-01-01.json.gz`;
    await putObject(old);
    const before = await listFiles(a.id);
    await new Promise((r) => setTimeout(r, 20));
    const second = await scheduled(a.id);
    expect(second.json).toMatchObject({ status: "applied", result: { result: "unchanged" } });
    expect(await listFiles(a.id)).toEqual(before); // nothing written, nothing pruned
    expect(before).toContain("2026-01-01.json.gz");
    const row2 = (await backupRow(db, a.id))!;
    expect(row2.last_file_at).toBe(row1.last_file_at);
    expect(Number(row2.last_checked_at)).toBeGreaterThan(Number(row1.last_checked_at));
    expect(row2).toMatchObject({ last_result: "unchanged", run_started_at: null });
  });

  it("writes a new file when the account changed", async () => {
    const a = await newUser("bkf-changed");
    await scheduled(a.id);
    const fp1 = (await backupRow(db, a.id))!.last_fingerprint;
    await db.query("update app.bits set version = version + 1 where user_id = $1", [a.id]);
    const r = await scheduled(a.id);
    expect(r.json.result.result).toBe("written");
    expect((await backupRow(db, a.id))!.last_fingerprint).not.toBe(fp1);
  });

  it("keeps the 7 latest files and the latest of each of 4 earlier ISO weeks, over 14 days in 8 weeks", async () => {
    const a = await newUser("bkf-prune");
    const seeded = [
      "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", // W44
      "2026-10-19", // W43
      "2026-10-12", "2026-10-13", // W42
      "2026-10-05", // W41
      "2026-09-28", // W40
      "2026-09-21", // W39
      "2026-09-14", // W38
      "2026-09-07", // W37
    ];
    for (const d of seeded) await putObject(`accounts/${a.id}/${d}.json.gz`);
    await putObject(`accounts/${a.id}/pre-restore/2026-10-01T00-00-00Z.json.gz`);
    const stranger = `accounts/${randomUUID()}/2026-01-01.json.gz`;
    extraKeys.push(stranger);
    await putObject(stranger);

    const r = await scheduled(a.id);
    expect(r.json.result.result).toBe("written");
    const today = new Date().toISOString().slice(0, 10);
    expect(await listFiles(a.id)).toEqual(
      [
        `${today}.json.gz`,
        "2026-10-26.json.gz", "2026-10-27.json.gz", "2026-10-28.json.gz", "2026-10-29.json.gz",
        "2026-10-30.json.gz", "2026-10-31.json.gz",
        "2026-10-19.json.gz", "2026-10-13.json.gz", "2026-10-05.json.gz", "2026-09-28.json.gz",
        "identity.json",
      ].sort(),
    );
    expect(await listFiles(a.id, "/pre-restore")).toEqual(["2026-10-01T00-00-00Z.json.gz"]);
    expect(await listFiles(stranger.split("/")[1])).toEqual(["2026-01-01.json.gz"]);
    // stored_bytes is the size under the account prefix after pruning
    const row = (await backupRow(db, a.id))!;
    expect(Number(row.stored_bytes)).toBeGreaterThan(Number(row.last_file_bytes));
    await removeObjects([`accounts/${a.id}/pre-restore/2026-10-01T00-00-00Z.json.gz`, stranger]);
  });

  it("leaves a file of an earlier run alone and never lets it change the result", async () => {
    const a = await newUser("bkf-left");
    const today = new Date().toISOString().slice(0, 10);
    await putObject(`accounts/${a.id}/${today}.json.gz`, "stale content from an earlier run");
    const r = await scheduled(a.id);
    expect(r.json.result.result).toBe("written");
    expect((await readExport(`accounts/${a.id}/${today}.json.gz`)).user_id).toBe(a.id); // overwritten
  });
});

describe("an account deleted or given a deletion request", () => {
  it("before the call: rejected, no row, no object", async () => {
    const a = await newUser("bkf-del-before");
    await db.query("update app.accounts set deletion_requested_at = 1 where user_id = $1", [a.id]);
    const r = await manual(a);
    expect(r.json).toEqual({ status: "rejected", rejection: { code: "account_deleting" } });
    expect(await backupRow(db, a.id)).toBeUndefined();
    expect(await listFiles(a.id)).toEqual([]);
    const s = await scheduled(a.id);
    expect(s.json).toEqual({ status: "rejected", rejection: { code: "account_deleting" } });
  });

  it("after backup_begin(): the run ends abandoned, leaves no object and records no result", async () => {
    const a = await newUser("bkf-del-during");
    // The fingerprint (read right after backup_begin) and the export read app.nodes; holding an
    // exclusive lock on it parks the function between backup_begin() and the export.
    const holder = await connect();
    const requester = await connect();
    try {
      await holder.query("begin");
      await holder.query("lock table app.nodes in access exclusive mode");
      const pending = manual(a);
      let waiting = false;
      for (let i = 0; i < 100 && !waiting; i++) {
        const { rows } = await requester.query(
          `select 1 from pg_stat_activity
            where wait_event_type = 'Lock' and datname = current_database() and pid <> pg_backend_pid()
              and (query ilike '%backup_fingerprint%' or query ilike '%account_fingerprint%')`,
        );
        waiting = rows.length > 0;
        if (!waiting) await new Promise((r) => setTimeout(r, 100));
      }
      expect(waiting, "the function reached the locked read").toBe(true);
      await requester.query("update app.accounts set deletion_requested_at = 1 where user_id = $1", [a.id]);
      await holder.query("commit");
      const r = await pending;
      expect(r.status).toBe(200);
      expect(r.json).toMatchObject({ status: "applied", result: { result: "abandoned" } });
    } finally {
      await holder.query("rollback").catch(() => {});
      await holder.end();
      await requester.end();
    }
    expect(await listFiles(a.id)).toEqual([]);
    const row = (await backupRow(db, a.id))!;
    expect(row).toMatchObject({ run_started_at: null, last_result: null, last_finished_at: null, manual_result: "abandoned" });
  });
});
