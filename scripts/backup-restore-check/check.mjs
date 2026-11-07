// Task 263: the monthly restore check (DECISION §Periodic restore check). Runs on the owner's Mac.
//
// Downloads the latest backup of the owner's account from the production bucket with a read-only
// token, restores it into a dedicated local test user through the same SQL path as the Edge
// Function (ensure_account, restore_begin, restore_stage, restore_account), exports that user
// again and compares every row (compare.ts). Then it deletes the test user, counts what is left,
// and only when the comparison passed AND nothing is left it pings the 31-day Healthchecks.io check.
//
// The database is always the local Supabase stack (`supabase status`), checked to be 127.0.0.1 or
// localhost. It never resets or migrates the database and never touches the fixture user. The
// output holds counts, table and column names and md5 hashes, never a row's content or a secret.
//
// Usage (local Supabase running):  pnpm check:restore      or      node scripts/backup-restore-check/check.mjs
//
// Config: one env file, mode 600 (the script refuses a file others can read), default
// ~/.config/griddo/restore-check.env, override with GRIDDO_RESTORE_CHECK_ENV. Keys:
//   R2_ENDPOINT                    https://<cloudflare account id>.r2.cloudflarestorage.com
//   R2_BUCKET                      the production bucket
//   R2_ACCESS_KEY_ID               the read-only (Object Read only) token
//   R2_SECRET_ACCESS_KEY
//   OWNER_USER_ID                  the owner's production user id: the prefix accounts/<id>/ to read
//   HEALTHCHECKS_RESTORE_PING_URL  the 31-day check's ping URL
//
// The test user is `restore-check-<8 hex>@example.invalid`. It is deleted at the end and on SIGINT,
// SIGTERM and SIGHUP. SIGKILL or a power loss skips that, so each run first deletes any leftover user
// of that exact pattern (and prints how many).
//
// Node strips the types of the shared TypeScript modules on import.
import { AwsClient } from "aws4fetch";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import pg from "pg";
import { buildBackupList } from "../../supabase/functions/_shared/backup-list.ts";
import { classifyExportHead, EXPORT_HEAD_BYTES } from "../../supabase/functions/_shared/export-head.ts";
import { parseListPage } from "../../supabase/functions/_shared/s3-xml.ts";
import { assertLocalDatabase } from "../backup-measure/lib.mjs";
import { compareExports, TABLE_KEYS } from "./compare.ts";

const RESTORE_WINDOW_MS = 140_000; // restore_account() answers too_late after this (SCHEMA §Restore)
const LEFTOVER_EMAIL = "^restore-check-[0-9a-f]{8}@example\\.invalid$";

/** An error whose message the script wrote itself (no row content), so it may be printed. */
class Safe extends Error {}

// ---- Config -----------------------------------------------------------------------------------
function readEnvFile() {
  const file = process.env.GRIDDO_RESTORE_CHECK_ENV ?? path.join(homedir(), ".config/griddo/restore-check.env");
  let text;
  try {
    if (statSync(file).mode & 0o077) throw new Error("readable by others; run chmod 600 on it");
    text = readFileSync(file, "utf8");
  } catch (e) {
    throw new Error(`cannot read the settings file ${file}: ${e.message}`);
  }
  const env = {};
  for (const raw of text.split("\n")) {
    const m = /^(?:export\s+)?([A-Z0-9_]+)=(.*)$/.exec(raw.trim());
    if (m) env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
  for (const k of ["R2_ENDPOINT", "R2_BUCKET", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "OWNER_USER_ID", "HEALTHCHECKS_RESTORE_PING_URL"]) {
    if (!env[k]) throw new Error(`${k} is missing in the settings file`);
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(env.OWNER_USER_ID)) {
    throw new Error("OWNER_USER_ID must be a lowercase UUID");
  }
  return env;
}

function localDbUrl() {
  const out = execFileSync("pnpm", ["exec", "supabase", "status", "-o", "env"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const m = /^DB_URL="?(.*?)"?$/m.exec(out);
  if (!m) throw new Error("local Supabase is not running (no DB_URL in `supabase status`)");
  assertLocalDatabase(m[1]);
  return m[1];
}

// ---- R2 ---------------------------------------------------------------------------------------
async function fetchLatestBackup(env) {
  const aws = new AwsClient({ accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY, region: "auto", service: "s3" });
  const base = `${env.R2_ENDPOINT.replace(/\/$/, "")}/${env.R2_BUCKET}`;
  const prefix = `accounts/${env.OWNER_USER_ID}/`;
  const listed = [];
  let token = null;
  do {
    const q = new URLSearchParams({ "list-type": "2", prefix, ...(token ? { "continuation-token": token } : {}) });
    const res = await aws.fetch(`${base}?${q}`);
    if (!res.ok) throw new Safe(`listing the bucket failed: HTTP ${res.status}`);
    const page = parseListPage(await res.text());
    listed.push(...page.objects);
    token = page.truncated ? page.nextToken : null;
  } while (token);
  const daily = buildBackupList(env.OWNER_USER_ID, listed).filter((e) => e.kind === "daily");
  if (daily.length === 0) {
    throw new Safe(`no dated backup under accounts/<OWNER_USER_ID>/ (${listed.length} objects there); after a recovery into a new project the user id changes, so check OWNER_USER_ID`);
  }
  const latest = daily[0];
  const res = await aws.fetch(`${base}/${prefix}${latest.name}.json.gz`);
  if (!res.ok) throw new Safe(`downloading ${latest.name} failed: HTTP ${res.status}`);
  const gz = Buffer.from(await res.arrayBuffer());
  const raw = gunzipSync(gz);
  if (classifyExportHead(raw.subarray(0, EXPORT_HEAD_BYTES)) !== "export") throw new Safe(`${latest.name} does not begin like an export`);
  return { name: latest.name, gzBytes: gz.length, rawBytes: raw.length, backup: JSON.parse(raw.toString("utf8")) };
}

// ---- Database ---------------------------------------------------------------------------------
async function connect(url) {
  const c = new pg.Client({ connectionString: url });
  c.on("error", () => undefined);
  await c.connect();
  return c;
}

/** One transaction as `role` (with the user's JWT claims for `authenticated`), committed. */
async function as(db, role, userId, text, params = []) {
  await db.query("begin");
  try {
    await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ role, ...(userId ? { sub: userId } : {}) })]);
    await db.query(`set local role ${role}`);
    // PostgREST hoists the functions' own 30 s limit; a direct call must set it to be as strict.
    await db.query("set local statement_timeout = '30s'");
    const res = await db.query(text, params);
    await db.query("commit");
    return res.rows[0]?.r;
  } catch (e) {
    await db.query("rollback").catch(() => undefined);
    throw e;
  }
}

async function residue(db, userId) {
  const one = async (sql) => Number((await db.query(sql, [userId])).rows[0].n);
  const out = { users: await one("select count(*) n from auth.users where id = $1"), accounts: await one("select count(*) n from app.accounts where user_id = $1") };
  for (const t of TABLE_KEYS) out[t] = await one(`select count(*) n from app.${t} where user_id = $1`);
  out.restore_staging = await one("select count(*) n from app.restore_staging where user_id = $1");
  out.backup_status = await one("select count(*) n from app.backup_status where user_id = $1");
  return out;
}

// Codes and fixed names only: a database or parse message can quote a fragment of a row.
const brief = (e) => (e instanceof Safe ? e.message : `${e?.code ?? e?.name ?? "error"}`);

// ---- Run --------------------------------------------------------------------------------------
let fails = 0;
const fail = (line) => {
  fails++;
  console.log(`FAIL ${line}`);
};

const env = readEnvFile();
const dbUrl = localDbUrl();
console.log(`restore-check ${new Date().toISOString()}: local database, bucket read-only, owner prefix set`);

const db = await connect(dbUrl);
const mainPid = db.processID;
const userId = randomUUID();
let cleaning = null;

function cleanup() {
  cleaning ??= (async () => {
    // A second connection: a signal can arrive while the main one is mid-statement or inside a role switch.
    const c = await connect(dbUrl);
    try {
      await c.query("select pg_terminate_backend($1)", [mainPid]).catch(() => undefined);
      await c.query("delete from auth.users where id = $1", [userId]);
      const left = await residue(c, userId);
      const clean = Object.values(left).every((n) => n === 0);
      console.log(`${clean ? "PASS" : "FAIL"} test user deleted, nothing left: ${JSON.stringify(left)}`);
      return clean;
    } catch (e) {
      console.log(`FAIL cleanup: ${brief(e)}`);
      return false;
    } finally {
      await c.end().catch(() => undefined);
    }
  })();
  return cleaning;
}
for (const [sig, code] of [["SIGINT", 130], ["SIGTERM", 143], ["SIGHUP", 129]]) {
  process.on(sig, () => {
    console.log(`${sig}: cleaning up`);
    cleanup().finally(() => process.exit(code));
  });
}

let compared = null;
try {
  // Leftovers of a run that was killed hard keep the backup's ids and would collide (23505).
  const old = await db.query("delete from auth.users where email ~ $1", [LEFTOVER_EMAIL]);
  console.log(`leftover test users deleted at start: ${old.rowCount}`);

  const got = await fetchLatestBackup(env);
  const counts = Object.fromEntries(TABLE_KEYS.map((k) => [k, Array.isArray(got.backup[k]) ? got.backup[k].length : 0]));
  console.log(`backup ${got.name}: ${got.gzBytes} bytes gzip, ${got.rawBytes} bytes raw, rows ${JSON.stringify(counts)}`);

  // A user that is not the fixture user. GoTrue reads the token columns as strings.
  await db.query(
    `insert into auth.users (id, instance_id, aud, role, email, is_anonymous, created_at, updated_at,
       confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current,
       phone_change, phone_change_token, reauthentication_token)
     values ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2, false, now(), now(),
       '', '', '', '', '', '', '', '')`,
    [userId, `restore-check-${userId.slice(0, 8)}@example.invalid`],
  );
  await as(db, "authenticated", userId, "select public.ensure_account() as r");

  // The fingerprint the Edge Function passes: the pre-restore export's.
  const before = await as(db, "service_role", null, "select public.export_account($1) as r", [userId]);
  const restoreId = randomUUID();
  const begun = await as(db, "service_role", null, "select public.restore_begin($1, $2) as r", [userId, restoreId]);
  if (begun?.status !== "applied") throw new Safe(`restore_begin: ${begun?.status} ${begun?.rejection?.code ?? ""}`);
  const t0 = Date.now();
  const staged = await as(db, "service_role", null, "select public.restore_stage($1, $2, $3::jsonb) as r", [userId, restoreId, JSON.stringify(got.backup)]);
  if (staged?.status !== "applied") throw new Safe(`restore_stage: ${staged?.status} ${staged?.rejection?.code ?? ""}`);
  const done = await as(db, "authenticated", userId, "select public.restore_account($1, $2) as r", [restoreId, before.fingerprint]);
  const ms = Date.now() - t0;
  if (done?.status !== "applied") throw new Safe(`restore_account: ${done?.status} ${done?.rejection?.code ?? ""}`);
  console.log(`restore_account applied ${ms} ms after staging began (window ${RESTORE_WINDOW_MS} ms)`);

  const after = await as(db, "service_role", null, "select public.export_account($1) as r", [userId]);
  compared = compareExports(got.backup, after, userId);
  for (const [name, t] of Object.entries(compared.tables)) {
    console.log(`  ${name}: backup ${t.backupRows} rows, restored ${t.afterRows} rows, backup md5 ${t.hash}`);
  }
  if (compared.newColumns.length) console.log(`columns only in the re-export (expand-only, passes): ${compared.newColumns.join(", ")}`);
  if (compared.ok) console.log("PASS every row equal except version (+1) and user_id");
  else for (const f of compared.failures) fail(f);
} catch (e) {
  fail(brief(e));
  if (e?.code === "23505") console.log("hint: the backup's ids already exist in the local database (a leftover or a local copy of the account); the check needs them free");
} finally {
  const clean = await cleanup();
  if (!clean) fails++;
  await db.end().catch(() => undefined);
}

// The ping comes last, and only after the comparison passed and the cleanup left nothing.
if (fails === 0 && compared?.ok) {
  try {
    const res = await fetch(env.HEALTHCHECKS_RESTORE_PING_URL, { signal: AbortSignal.timeout(15_000) });
    const body = (await res.text()).trim();
    // An unknown ping uuid answers 200 "OK (not found)", so only an exact OK counts.
    if (res.ok && body === "OK") console.log("PASS pinged the 31-day check");
    else fail(`ping answered HTTP ${res.status} ${body.slice(0, 40)}`);
  } catch (e) {
    fail(`ping: ${brief(e)}`);
  }
} else {
  console.log("no ping sent");
}
console.log(fails === 0 ? "RESULT PASS" : `RESULT FAIL (${fails})`);
process.exit(fails === 0 ? 0 : 1);
