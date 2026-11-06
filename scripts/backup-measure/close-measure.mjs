// Task 259 step 4: the limit-sized measurement of the backup function (DECISION §Measurement and
// acceptance). One test account at the old 100% caps (nodes 1,000, bits 5,000, chunks 10,000,
// breakdowns 5,000, candidates 1,250; about 9.4 MB raw), built in SQL by the shared fixture, whose md5
// filler compresses to about 0.45. This script then overwrites every text column with random Hangul
// syllables, a different string per row and the same number of bytes (a syllable is 3 bytes in UTF-8),
// so the text is the least compressible content a real account holds (random Hangul alone gzips to about 0.70;
// the whole account, with its ids and keys, to about 0.50), then three runs of the real
// function (export, gzip, upload to R2) in `scheduled` mode, and `export_account()` timed on its
// own. The function's `manual` mode needs a signed-in OAuth user's token, so the shared-secret
// `scheduled` mode runs the same code path (`runBackup`) for the test user.
//
// Judged: every run answers 200 `applied` with result `written`; the worst wall clock of a run is
// under 37.5 s; `export_account()` under 30 s. Output is counts and times only.
//
// The account, its rows and its R2 objects are deleted at the end and on SIGINT and SIGTERM, and the
// script then counts what is left (every count must be 0).
//
// Usage:
//   node scripts/backup-measure/close-measure.mjs --local            plan and checks only
//   node scripts/backup-measure/close-measure.mjs --local --run      the local rehearsal
//   node scripts/backup-measure/close-measure.mjs                    plan and checks on production, no write
//   node scripts/backup-measure/close-measure.mjs --run              the production measurement
// Local needs `pnpm exec supabase functions serve --env-file .env.local` running.
// Production reads ~/.config/griddo/production.env (database, CA) and
// ~/.griddo-secrets/prod-edge-secrets.env (shared secret, R2 token; GRIDDO_EDGE_SECRETS overrides the path).
// Node strips the types of the fixture on import.
import { AwsClient } from "aws4fetch";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import { buildLimitSizedAccount } from "../../supabase/tests/fixtures/limit-sized-account.ts";
import { connectDb, isLocal, target } from "../verify/lib.mjs";

const RUN = process.argv.includes("--run");
const SCALE = 2; // 2 x the current real-account limits = the old 100% caps
const RUNS = 3;
const WALL_LIMIT_MS = 37_500;
const EXPORT_LIMIT_MS = 30_000;

function parseEnv(file, strict = true) {
  const mode = statSync(file).mode & 0o077;
  if (strict && mode) throw new Error(`${file} is readable by others; run chmod 600 on it`);
  const out = {};
  for (const raw of readFileSync(file, "utf8").split("\n")) {
    const m = /^(?:export\s+)?([A-Z0-9_]+)=(.*)$/.exec(raw.trim());
    if (m) out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
  return out;
}

// ---- Target -----------------------------------------------------------------------------------
const t = target();
let fn;
if (isLocal) {
  const env = parseEnv(".env.local", false);
  const status = execFileSync("pnpm", ["exec", "supabase", "status", "-o", "env"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const kv = Object.fromEntries(status.split("\n").map((l) => /^([A-Z0-9_]+)="?(.*?)"?$/.exec(l.trim())).filter(Boolean).map((m) => [m[1], m[2]]));
  fn = {
    url: `${t.apiUrl}/functions/v1/backup`,
    secret: env.BACKUP_SHARED_SECRET,
    s3: {
      endpoint: "http://127.0.0.1:54321/storage/v1/s3",
      bucket: env.BACKUP_S3_BUCKET,
      id: kv.S3_PROTOCOL_ACCESS_KEY_ID,
      secret: kv.S3_PROTOCOL_ACCESS_KEY_SECRET,
      region: env.BACKUP_S3_REGION,
    },
  };
} else {
  const env = parseEnv(process.env.GRIDDO_EDGE_SECRETS ?? path.join(homedir(), ".griddo-secrets/prod-edge-secrets.env"));
  fn = {
    url: `${t.apiUrl}/functions/v1/backup`,
    secret: env.BACKUP_SHARED_SECRET,
    s3: {
      endpoint: env.BACKUP_S3_ENDPOINT,
      bucket: env.BACKUP_S3_BUCKET,
      id: env.BACKUP_S3_ACCESS_KEY_ID,
      secret: env.BACKUP_S3_SECRET_ACCESS_KEY,
      region: env.BACKUP_S3_REGION,
    },
  };
}
for (const [k, v] of Object.entries({ secret: fn.secret, ...fn.s3 })) {
  if (!v) throw new Error(`${k} is missing`);
}
const aws = new AwsClient({ accessKeyId: fn.s3.id, secretAccessKey: fn.s3.secret, region: fn.s3.region, service: "s3" });
const objectUrl = (key) => `${fn.s3.endpoint.replace(/\/$/, "")}/${fn.s3.bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;

async function listKeys(prefix) {
  const keys = [];
  let token = "";
  do {
    const q = new URLSearchParams({ "list-type": "2", prefix, ...(token ? { "continuation-token": token } : {}) });
    const res = await aws.fetch(`${fn.s3.endpoint.replace(/\/$/, "")}/${fn.s3.bucket}?${q}`);
    if (!res.ok) throw new Error(`list failed: ${res.status}`);
    const xml = await res.text();
    for (const m of xml.matchAll(/<Key>([^<]*)<\/Key>/g)) keys.push(m[1]);
    token = /<NextContinuationToken>([^<]*)<\/NextContinuationToken>/.exec(xml)?.[1] ?? "";
  } while (token);
  return keys;
}

// ---- The cron windows to stay out of (production only) ----------------------------------------
// Dispatch 17:00 UTC, summary 19:00 UTC, cleanup 03:17 UTC. The account lives about ten minutes.
function cronWindowProblem(now = new Date()) {
  const m = now.getUTCHours() * 60 + now.getUTCMinutes();
  for (const [label, w] of [["backup-dispatch 17:00", 1020], ["backup-summary-dispatch 19:00", 1140], ["cleanup-guests 03:17", 197]]) {
    const ahead = (w - m + 1440) % 1440; // minutes until the next one
    const behind = (m - w + 1440) % 1440; // minutes since the last one
    if (ahead <= 25 || behind <= 8) return `${label} UTC is ${ahead <= 25 ? `${ahead} min away` : `${behind} min behind`}`;
  }
  return null;
}

// ---- Run --------------------------------------------------------------------------------------
console.log(`close-measure: target ${t.name}, ${new Date().toISOString()}`);
const db = await connectDb(t);
const notices = [];
db.on("notice", (n) => notices.push(n.message));

const priv = await db.query(`select
  has_table_privilege(current_user, 'auth.users', 'INSERT') as users_insert,
  has_table_privilege(current_user, 'auth.users', 'DELETE') as users_delete,
  has_table_privilege(current_user, 'auth.identities', 'INSERT') as identities_insert,
  pg_has_role(current_user, 'service_role', 'MEMBER') as can_be_service_role,
  (select count(*) from cron.job where jobname in ('backup-dispatch', 'backup-summary-dispatch')) as dispatch_jobs`);
const problem = isLocal ? null : cronWindowProblem();
console.log(`checks: ${JSON.stringify(priv.rows[0])}; cron window: ${problem ?? "clear"}`);
// The CLI's `--linked` commands (db advisors) mint a temporary login role; record its name and expiry only.
const logins = await db.query("select rolname, rolvaliduntil from pg_roles where rolname like 'cli_login%' order by rolname");
console.log(`temporary CLI login roles: ${logins.rows.length === 0 ? "none" : logins.rows.map((r) => `${r.rolname} until ${r.rolvaliduntil?.toISOString() ?? "no expiry"}`).join("; ")}`);
console.log(`plan: ${RUNS} runs of ${fn.url.replace(t.apiUrl, "<api>")} in scheduled mode for one temporary account at ${SCALE}x the real limits;`);
console.log(`      judged: wall clock of every run < ${WALL_LIMIT_MS} ms, export_account() < ${EXPORT_LIMIT_MS} ms; account, rows and objects removed after`);
const p = priv.rows[0];
const blocked = !(p.users_insert && p.users_delete && p.identities_insert && p.can_be_service_role) || problem;
if (!RUN || blocked) {
  console.log(blocked ? `NOT RUN: ${blocked === true ? "a privilege is missing" : blocked}` : "no --run: nothing was written");
  await db.end();
  process.exit(blocked ? 1 : 0);
}

const userId = randomUUID();
const mainPid = db.processID;
let cleaning = null;
// Cleanup runs on its own connection: a signal can arrive inside the export transaction, where the
// main connection has switched to service_role, and the main connection may still be mid-statement.
function cleanup() {
  cleaning ??= (async () => {
    console.log(`cleanup ${new Date().toISOString()}`);
    const c = await connectDb(t);
    c.on("error", () => undefined);
    await c.query("select pg_terminate_backend($1)", [mainPid]).catch(() => undefined);
    // The user goes first: a function run still in flight then stops at its pre-upload account check.
    // A run past that check can still finish its upload, so the objects are deleted three times, two seconds apart.
    await c.query("delete from auth.users where id = $1", [userId]).catch((e) => console.log(`FAIL cleanup user: ${e.message}`));
    try {
      for (let pass = 0; pass < 3; pass++) {
        for (const key of await listKeys(`accounts/${userId}/`)) await aws.fetch(objectUrl(key), { method: "DELETE" });
        await new Promise((r) => setTimeout(r, 2000));
      }
    } catch (e) {
      console.log(`FAIL cleanup objects: ${e.message}`);
    }
    const left = await c
      .query(
        `select (select count(*) from auth.users where id = $1) users,
                (select count(*) from auth.identities where user_id = $1) identities,
                (select count(*) from app.accounts where user_id = $1) accounts,
                (select count(*) from app.nodes where user_id = $1) nodes,
                (select count(*) from app.bits where user_id = $1) bits,
                (select count(*) from app.chunks where user_id = $1) chunks,
                (select count(*) from app.scratch_breakdowns where user_id = $1) breakdowns,
                (select count(*) from app.staged_candidates where user_id = $1) candidates,
                (select count(*) from app.backup_status where user_id = $1) backup_status,
                (select count(*) from internal.r2_deletions where user_id = $1) r2_deletions`,
        [userId],
      )
      .catch((e) => ({ rows: [{ error: e.message }] }));
    let objects = -1;
    try {
      objects = (await listKeys(`accounts/${userId}/`)).length;
    } catch {
      // reported as -1
    }
    const all = { ...left.rows[0], r2_objects: objects };
    const clean = Object.values(all).every((v) => Number(v) === 0);
    console.log(`${clean ? "PASS" : "FAIL"} nothing left: ${JSON.stringify(all)}`);
    await c.end().catch(() => undefined);
    return clean;
  })();
  return cleaning;
}
for (const [sig, code] of [["SIGINT", 130], ["SIGTERM", 143]]) {
  process.on(sig, () => cleanup().finally(() => process.exit(code)));
}

// Random Hangul per row, in bytes: `ceil(octet_length / 3)` syllables replace each text. The sub-select
// refers to the outer row, so it runs once per row (an uncorrelated one would run once and give every
// row the same string: Task 255 lesson). The system Nodes (Inbox, Archive) keep their titles.
const HANGUL = (col, alias) =>
  `(select string_agg(chr(44032 + floor(random() * 11172)::int), '') from generate_series(1, greatest(1, ceil(octet_length(${alias}.${col}) / 3.0)::int)))`;
async function fillWithHangul(client, userId) {
  await client.query(`update app.nodes t set title = ${HANGUL("title", "t")} where t.user_id = $1 and t.system_role is null`, [userId]);
  await client.query(`update app.bits t set title = ${HANGUL("title", "t")}, description = ${HANGUL("description", "t")} where t.user_id = $1`, [userId]);
  await client.query(`update app.chunks t set title = ${HANGUL("title", "t")}, description = ${HANGUL("description", "t")} where t.user_id = $1`, [userId]);
  await client.query(`update app.scratch_breakdowns t set content = ${HANGUL("content", "t")} where t.user_id = $1`, [userId]);
  const d = await client.query(
    `select (select count(distinct description) from app.bits where user_id = $1) as bit_descriptions, (select count(*) from app.bits where user_id = $1) as bits,
            (select count(distinct description) from app.chunks where user_id = $1) as chunk_descriptions, (select count(*) from app.chunks where user_id = $1) as chunks`,
    [userId],
  );
  return d.rows[0];
}

let fails = 0;
try {
  // A user that the function counts as an OAuth account: not anonymous, one `github` identity.
  await db.query(
    // GoTrue reads these token columns as strings: NULL makes `auth.admin.getUserById` fail.
    `insert into auth.users (id, instance_id, aud, role, email, is_anonymous, created_at, updated_at,
       confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current,
       phone_change, phone_change_token, reauthentication_token)
     values ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2, false, now(), now(),
       '', '', '', '', '', '', '', '')`,
    [userId, `measure-${userId}@example.invalid`],
  );
  await db.query(
    `insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
     values ($1, $2, jsonb_build_object('sub', $1::text), 'github', now(), now(), now())`,
    [`measure-${userId}`, userId],
  );
  const counts = await buildLimitSizedAccount(db, userId, SCALE);
  const distinct = await fillWithHangul(db, userId);
  console.log(`random Hangul per row: distinct/rows ${JSON.stringify(distinct)}`);
  await db.query("vacuum analyze app.nodes");
  await db.query("vacuum analyze app.bits");
  await db.query("vacuum analyze app.chunks");
  await db.query("vacuum analyze app.scratch_breakdowns");
  console.log(`built ${JSON.stringify(counts)}`);

  // export_account() on its own, as service_role, three times.
  const exportMs = [];
  let exportBytes = 0;
  for (let i = 0; i < RUNS; i++) {
    notices.length = 0;
    await db.query("begin");
    await db.query("set local role service_role");
    await db.query(
      `do $$ declare t0 timestamptz := clock_timestamp(); n int; begin
         n := octet_length(public.export_account('${userId}'::uuid)::text);
         raise notice 'export_ms % bytes %', round(extract(epoch from clock_timestamp() - t0) * 1000), n;
       end $$`,
    );
    await db.query("commit");
    const m = /export_ms (\d+) bytes (\d+)/.exec(notices.join(" "));
    exportMs.push(Number(m[1]));
    exportBytes = Number(m[2]);
  }
  const exportOk = Math.max(...exportMs) < EXPORT_LIMIT_MS;
  if (!exportOk) fails++;
  console.log(`${exportOk ? "PASS" : "FAIL"} export_account(): ${exportMs.join(" / ")} ms (limit ${EXPORT_LIMIT_MS}), ${exportBytes} bytes of text`);

  // Three runs of the function. A change before the second and third run makes the fingerprint
  // differ, so each run exports and uploads (an unchanged account only checks).
  const walls = [];
  for (let i = 0; i < RUNS; i++) {
    if (i > 0) {
      await db.query(
        "update app.chunks set description = description || ' ' where id = (select id from app.chunks where user_id = $1 order by id limit 1)",
        [userId],
      );
    }
    const t0 = performance.now();
    let status = 0;
    let body = null;
    try {
      const res = await fetch(fn.url, {
        method: "POST",
        headers: { "content-type": "application/json", "x-backup-secret": fn.secret },
        body: JSON.stringify({ mode: "scheduled", user_id: userId }),
        signal: AbortSignal.timeout(170_000),
      });
      status = res.status;
      body = await res.json().catch(() => null);
    } catch (e) {
      body = { error: e.name };
    }
    const wall = performance.now() - t0;
    walls.push(wall);
    const written = status === 200 && body?.status === "applied" && body?.result?.result === "written";
    const ok = written && wall < WALL_LIMIT_MS;
    if (!ok) fails++;
    console.log(
      `${ok ? "PASS" : "FAIL"} run ${i + 1}: ${status} ${body?.status ?? body?.error ?? "?"} ${body?.result?.result ?? ""}${body?.result?.reason ? ` (${body.result.reason})` : ""}, wall ${wall.toFixed(0)} ms (limit ${WALL_LIMIT_MS})`,
    );
  }
  console.log(`worst wall ${Math.max(...walls).toFixed(0)} ms`);

  // What the last run left in R2: the compressed size against the raw text, and every row present.
  const keys = await listKeys(`accounts/${userId}/`);
  const gzKey = keys.find((k) => k.endsWith(".json.gz"));
  if (!gzKey) {
    console.log(`FAIL no backup object under the account's prefix (${keys.length} keys)`);
    fails++;
  } else {
    const gz = Buffer.from(await (await aws.fetch(objectUrl(gzKey))).arrayBuffer());
    const raw = gunzipSync(gz);
    const parsed = JSON.parse(raw.toString("utf8"));
    const rowsOk =
      parsed.nodes?.length === counts.nodes && parsed.bits?.length === counts.bits && parsed.chunks?.length === counts.chunks &&
      parsed.scratch_breakdowns?.length === counts.scratchBreakdowns && parsed.staged_candidates?.length === counts.stagedCandidates;
    if (!rowsOk) fails++;
    console.log(
      `${rowsOk ? "PASS" : "FAIL"} object: ${keys.length} keys (${keys.map((k) => k.split("/").pop().replace(/^\d{4}-\d{2}-\d{2}/, "<date>")).join(", ")}); raw ${raw.length} bytes, gzip ${gz.length} bytes, ratio ${(gz.length / raw.length).toFixed(2)} (random Hangul text alone: about 0.70); every table's row count equals what was built: ${rowsOk}`,
    );
  }
  const st = await db.query(
    "select last_result, failure_reason, run_started_at is not null as run_open from app.backup_status where user_id = $1",
    [userId],
  );
  console.log(`backup_status: ${JSON.stringify(st.rows[0] ?? null)}`);
} catch (e) {
  console.log(`FAIL ${e.message}`);
  fails++;
} finally {
  const clean = await cleanup();
  if (!clean) fails++;
}
console.log(fails === 0 ? "RESULT PASS" : `RESULT FAIL (${fails})`);
process.exit(fails === 0 ? 0 : 1);
