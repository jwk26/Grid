import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import type { Client } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { callFunction, createOAuthUser, listFiles, putObject, removeObjects, sharedSecret, type OAuthUser } from "./helpers/backup-function";
import { connect } from "./helpers/db";

// Task 257, Stage 3: the summary mode against the served function, local Storage as R2 and a
// Healthchecks.io stub on the fixed port the function's HEALTHCHECKS_DAILY_PING_URL names
// (.env.local.example), reached from the edge runtime container through host.docker.internal.

const STUB_PORT = 54390;
const HOUR = 3_600_000;
type Ping = { path: string; body: string };

let db: Client;
let stub: Server;
const pings: Ping[] = [];
let savedState: Record<string, unknown>;
const made: OAuthUser[] = [];
const objectsToClean: string[] = [];
const rowsToClean: string[] = [];

async function newUser(label: string): Promise<OAuthUser> {
  const u = await createOAuthUser(db, label);
  made.push(u);
  return u;
}

// The dispatch sends the database's clock as `as_of`, and the window compares it with times the
// database wrote, so the tests read that clock too (the Docker VM's clock can differ from the host's).
async function dbNow(): Promise<number> {
  return Number((await db.query("select (extract(epoch from clock_timestamp()) * 1000)::bigint as n")).rows[0].n);
}

async function summary(missing = 0) {
  pings.length = 0;
  const r = await callFunction({
    body: { mode: "summary", missing, as_of: await dbNow() },
    headers: { "x-backup-secret": sharedSecret() },
  });
  expect(r.status, JSON.stringify(r.json)).toBe(200);
  expect(pings).toHaveLength(1);
  return { json: r.json, ping: pings[0] };
}

// Committed (the function reads the rows over HTTP): the backup functions as the owner connection,
// which runs them the same way; their rights are covered in backup-status and backup-grants.
async function runFailing(userId: string, reason: string) {
  const { rows } = await db.query("select public.backup_begin($1, 'scheduled', null) as r", [userId]);
  await db.query("select public.backup_finish($1, $2, 'failed', null, null, null, null, $3)", [
    userId, rows[0].r.result.run_token, reason,
  ]);
  await new Promise((r) => setTimeout(r, 5)); // the next as_of is strictly later
}

beforeAll(async () => {
  stub = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      pings.push({ path: req.url ?? "", body: Buffer.concat(chunks).toString("utf8") });
      res.end("OK");
    });
  });
  await new Promise<void>((resolve, reject) => {
    stub.once("error", reject);
    stub.listen(STUB_PORT, "0.0.0.0", resolve);
  });
  db = await connect();
  savedState = (await db.query("select last_summary_at, over_limit from internal.backup_summary_state")).rows[0];
});

beforeEach(async () => {
  // A quiet baseline: move the window past everything earlier tests and files left behind.
  await summary(0);
});

afterAll(async () => {
  await db.query("update internal.backup_summary_state set last_summary_at = $1, over_limit = $2", [
    savedState.last_summary_at, savedState.over_limit,
  ]);
  for (const id of rowsToClean) await db.query("delete from internal.r2_deletions where user_id = $1", [id]);
  await removeObjects(objectsToClean);
  await db.end();
  await new Promise((r) => stub.close(r));
});

describe("the ping", () => {
  it("is a success with no new problem, and its body holds counts only", async () => {
    const { json, ping } = await summary(0);
    expect(ping.path).toBe("/ping");
    expect(ping.body).toMatch(/^new_failures=0 failing=\d+ missing=0 over_limit=0 deletion_overdue=0$/);
    expect(ping.body).not.toMatch(/@|[0-9a-f]{8}-[0-9a-f]{4}/);
    expect(json).toMatchObject({ status: "applied", result: { ok: true, codes: [], pinged: true } });
    expect(JSON.stringify(json)).not.toMatch(/@|[0-9a-f]{8}-[0-9a-f]{4}/);
  });

  it("is /fail for a new failure, success again for the same failure the next day, /fail for a new reason or another account", async () => {
    const a = await newUser("bks-fail-a");
    const b = await newUser("bks-fail-b");
    await runFailing(a.id, "upload_failed");
    let r = await summary();
    expect(r.ping.path).toBe("/ping/fail");
    expect(r.ping.body).toContain("new_failures=1");
    expect(r.ping.body).toContain("codes=new_failure");
    expect(r.ping.body).not.toContain("upload_failed"); // no per-account reason

    await runFailing(a.id, "upload_failed"); // the same account, the same reason, the next day
    r = await summary();
    expect(r.ping.path).toBe("/ping");

    await runFailing(b.id, "export_failed"); // another account still alerts
    r = await summary();
    expect(r.ping.path).toBe("/ping/fail");
    expect(r.ping.body).toContain("new_failures=1");

    await runFailing(a.id, "export_timeout"); // a changed reason is new
    r = await summary();
    expect(r.ping.path).toBe("/ping/fail");

    r = await summary(); // nothing new: success again
    expect(r.ping.path).toBe("/ping");
  });

  it("is /fail once for a newly missing account, then success while nothing new appears", async () => {
    let r = await summary(1);
    expect(r.ping.path).toBe("/ping/fail");
    expect(r.ping.body).toContain("missing=1");
    expect(r.ping.body).toContain("codes=missing");
    r = await summary(0);
    expect(r.ping.path).toBe("/ping");
  });

  it("is /fail once when the stored total first passes 8 GB, and a new failure on another account still alerts", async () => {
    const big = await newUser("bks-big");
    const other = await newUser("bks-big-other");
    await runFailing(big.id, "upload_failed");
    await summary(); // consume its failure
    await db.query("update app.backup_status set stored_bytes = 9000000000 where user_id = $1", [big.id]);
    try {
      let r = await summary();
      expect(r.ping.path).toBe("/ping/fail");
      expect(r.ping.body).toContain("codes=over_limit");
      r = await summary(); // still above 8 GB, not new
      expect(r.ping.path).toBe("/ping");
      await runFailing(other.id, "export_failed");
      r = await summary(); // a new problem is not hidden by the total
      expect(r.ping.path).toBe("/ping/fail");
      expect(r.ping.body).toContain("codes=new_failure");
    } finally {
      await db.query("update app.backup_status set stored_bytes = 0 where user_id = $1", [big.id]);
    }
    const r = await summary(); // below the limit again: the next crossing alerts again
    expect(r.ping.path).toBe("/ping");
  });
});

describe("r2_deletions", () => {
  const seed = async (userId: string, names: string[]) => {
    for (const n of names) {
      const key = `accounts/${userId}/${n}`;
      objectsToClean.push(key);
      await putObject(key);
    }
  };
  const addRow = async (userId: string, ageMs: number) => {
    rowsToClean.push(userId);
    await db.query("insert into internal.r2_deletions (user_id, requested_at) values ($1, $2)", [userId, (await dbNow()) - ageMs]);
  };
  const rowExists = async (userId: string) =>
    (await db.query("select 1 from internal.r2_deletions where user_id = $1", [userId])).rowCount === 1;

  it("deletes every object of a row older than one hour and then the row", async () => {
    const id = randomUUID();
    await seed(id, ["2026-11-01.json.gz", "2026-11-02.json.gz", "identity.json", "pre-restore/2026-11-02T00-00-00Z.json.gz"]);
    await addRow(id, 2 * HOUR);
    const r = await summary();
    expect(r.json.result.deleted).toBeGreaterThanOrEqual(1);
    expect(r.ping.path).toBe("/ping");
    expect(await listFiles(id)).toEqual([]);
    expect(await listFiles(id, "/pre-restore")).toEqual([]);
    expect(await rowExists(id)).toBe(false);
  });

  it("leaves a row younger than one hour and its objects alone", async () => {
    const id = randomUUID();
    await seed(id, ["2026-11-01.json.gz"]);
    await addRow(id, 10 * 60_000);
    await summary();
    expect(await listFiles(id)).toEqual(["2026-11-01.json.gz"]);
    expect(await rowExists(id)).toBe(true);
  });

  it("deletes a row older than three days and sends no /fail when it could be cleared", async () => {
    const id = randomUUID();
    await seed(id, ["2026-10-01.json.gz"]);
    await addRow(id, 4 * 24 * HOUR);
    const r = await summary();
    expect(r.ping.path).toBe("/ping");
    expect(await rowExists(id)).toBe(false);
  });

  it("never deletes files under a key that has no accounts row and no r2_deletions row (the recovery case)", async () => {
    const recovered = randomUUID();
    await seed(recovered, ["2026-11-01.json.gz", "identity.json"]);
    const gone = randomUUID();
    await seed(gone, ["2026-11-01.json.gz"]);
    await addRow(gone, 2 * HOUR);
    await summary();
    expect(await listFiles(recovered)).toEqual(["2026-11-01.json.gz", "identity.json"]);
    expect(await listFiles(gone)).toEqual([]);
  });

  it("keeps the files of a live account", async () => {
    const live = await newUser("bks-live");
    await seed(live.id, ["2026-11-01.json.gz"]);
    await summary();
    expect(await listFiles(live.id)).toEqual(["2026-11-01.json.gz"]);
  });
});
