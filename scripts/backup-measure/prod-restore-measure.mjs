// Task 264: the hosted measurement of the restore path (plan Task 264; Task 260 and Phase 52 Task 255 carries).
// One temporary account at SCALE x the real-account limits (2 = the old caps, about 9.4 MB raw; random Hangul
// text), one `Back Up Now` and three restores of that backup through the real function's `restore` mode, each read
// as its event stream. Judged per the plan:
//   - every restore ends with `applied`; the worst wall clock is under 37.5 s;
//   - restore_account() database time is under 30 s (read from pg_stat_statements when the role can read it);
//   - the steps arrive unbuffered: the `saving` step is read in an earlier read, and earlier in time, than the result;
//   - the hosted API accepted the limit-sized restore_stage() body (a run that ends `applied` proves it; the
//     database-side time of restore_stage() is printed beside it, since a client-side time includes the upload).
// Output is counts, times and statuses only. The account, its rows and its objects are removed at the end and on
// SIGINT/SIGTERM/SIGHUP, and what is left is counted (every count must be 0).
//
// The restore mode has no shared-secret path: it runs with the caller's access token. The test user is inserted
// directly (a `github` identity row, as close-measure.mjs does) and its session comes from the admin
// `generateLink({type:'magiclink'})` and `verifyOtp({token_hash})`. The project's JWT secret is never used.
//
// Target (nothing defaults to production): --local, or a hosted project named by GRIDDO_PRODUCTION_ENV (a mode 600
// file, names as in scripts/verify/lib.mjs plus SUPABASE_SECRET_KEY) AND --expect-ref <project ref>, which must equal
// the first label of that file's API URL. The bucket settings of the function under test come from the mode 600
// file named by GRIDDO_MEASURE_S3_ENV (BACKUP_S3_ENDPOINT, BACKUP_S3_BUCKET, BACKUP_S3_ACCESS_KEY_ID,
// BACKUP_S3_SECRET_ACCESS_KEY, BACKUP_S3_REGION; on production ~/.griddo-secrets/prod-edge-secrets.env) and
// GRIDDO_MEASURE_SECRET_ENV, its own mode 600 file with SUPABASE_SECRET_KEY (the admin key for generateLink; on production a
// dedicated key made right before Stage 3 and revoked after it; never in production.env). --expect-bucket <name> must equal BACKUP_S3_BUCKET; they are used to delete the test account's objects.
// On production the run refuses within 25 minutes before or 8 minutes after a cron run (17:00, 19:00, 03:17 UTC);
// --skip-cron-window is for the drill project, whose cron jobs are unscheduled.
//
// Usage:
//   node scripts/backup-measure/prod-restore-measure.mjs --local [--run]           (needs `supabase functions serve --env-file .env.local`)
//   GRIDDO_PRODUCTION_ENV=<file> GRIDDO_MEASURE_SECRET_ENV=<file> GRIDDO_MEASURE_S3_ENV=<file> node scripts/backup-measure/prod-restore-measure.mjs \
//        --expect-ref <ref> --expect-bucket <name> [--skip-cron-window] [--run]    (without --run: checks and plan only)
// Node strips the types of the fixture on import.
import { createClient } from "@supabase/supabase-js";
import { AwsClient } from "aws4fetch";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { parseListPage } from "../../supabase/functions/_shared/s3-xml.ts";
import { buildLimitSizedAccount } from "../../supabase/tests/fixtures/limit-sized-account.ts";
import { connectDb, isLocal, target } from "../verify/lib.mjs";
import { measureWindowProblem } from "./cron-window.ts";
import { judgeDbTime } from "./db-time.ts";

const arg = (n) => {
  const i = process.argv.indexOf(n);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const RUN = process.argv.includes("--run");
const SCALE = Number(process.env.SCALE ?? 2);
const RUNS = 3;
const WALL_LIMIT_MS = 37_500;
const DB_LIMIT_MS = 30_000;
const STAGE_TIMEOUT_MS = 30_000; // restore_stage()'s own statement_timeout; past it the restore fails cleanly

function parseEnv(file) {
  if (statSync(file).mode & 0o077) throw new Error(`${file} is readable by others; run chmod 600 on it`);
  const out = {};
  for (const raw of readFileSync(file, "utf8").split("\n")) {
    const m = /^(?:export\s+)?([A-Z0-9_]+)=(.*)$/.exec(raw.trim());
    if (m) out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
  return out;
}

// ---- Target guards ----------------------------------------------------------------------------
let t;
let secretKey;
let s3;
if (isLocal) {
  t = target();
  const out = execFileSync("pnpm", ["exec", "supabase", "status", "-o", "env"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const kv = Object.fromEntries(out.split("\n").map((l) => /^([A-Z0-9_]+)="?(.*?)"?$/.exec(l.trim())).filter(Boolean).map((m) => [m[1], m[2]]));
  secretKey = kv.SECRET_KEY ?? kv.SERVICE_ROLE_KEY;
  const local = parseEnv(".env.local");
  s3 = { endpoint: "http://127.0.0.1:54321/storage/v1/s3", bucket: local.BACKUP_S3_BUCKET, id: kv.S3_PROTOCOL_ACCESS_KEY_ID, secret: kv.S3_PROTOCOL_ACCESS_KEY_SECRET, region: local.BACKUP_S3_REGION };
} else {
  const file = process.env.GRIDDO_PRODUCTION_ENV;
  if (!file) throw new Error("refusing: set GRIDDO_PRODUCTION_ENV to the settings file of the project to measure (nothing defaults to production)");
  t = target();
  const ref = new URL(t.apiUrl).hostname.split(".")[0];
  const want = arg("--expect-ref");
  console.log(`target project ref: ${ref}`);
  if (want !== ref) throw new Error("refusing: --expect-ref is missing or does not match the target project ref");
  const kf = process.env.GRIDDO_MEASURE_SECRET_ENV;
  if (!kf) throw new Error("GRIDDO_MEASURE_SECRET_ENV is required (its own mode 600 file with SUPABASE_SECRET_KEY; never production.env)");
  secretKey = parseEnv(kf).SUPABASE_SECRET_KEY;
  const sf = process.env.GRIDDO_MEASURE_S3_ENV;
  if (!sf) throw new Error("GRIDDO_MEASURE_S3_ENV is required (the bucket settings of the function under test)");
  const e = parseEnv(sf);
  s3 = { endpoint: e.BACKUP_S3_ENDPOINT, bucket: e.BACKUP_S3_BUCKET, id: e.BACKUP_S3_ACCESS_KEY_ID, secret: e.BACKUP_S3_SECRET_ACCESS_KEY, region: e.BACKUP_S3_REGION ?? "auto" };
  console.log(`function bucket: ${s3.bucket}`);
  if (arg("--expect-bucket") !== s3.bucket) throw new Error("refusing: --expect-bucket is missing or does not match the bucket in GRIDDO_MEASURE_S3_ENV");
}
for (const [k, v] of Object.entries({ secretKey, endpoint: s3.endpoint, bucket: s3.bucket, id: s3.id, secret: s3.secret })) {
  if (!v) throw new Error(`${k} is missing`);
}
const aws = new AwsClient({ accessKeyId: s3.id, secretAccessKey: s3.secret, region: s3.region ?? "auto", service: "s3" });
const bucketBase = `${s3.endpoint.replace(/\/$/, "")}/${s3.bucket}`;
async function listKeys(prefix) {
  const keys = [];
  let token = null;
  do {
    const q = new URLSearchParams({ "list-type": "2", prefix, ...(token ? { "continuation-token": token } : {}) });
    const res = await aws.fetch(`${bucketBase}?${q}`);
    if (!res.ok) throw new Error(`list failed: ${res.status}`);
    const page = parseListPage(await res.text());
    keys.push(...page.objects.map((o) => o.key));
    if (page.truncated && !page.nextToken) throw new Error("listing is truncated without a continuation token");
    token = page.truncated ? page.nextToken : null;
  } while (token);
  return keys;
}

// ---- Run --------------------------------------------------------------------------------------
console.log(`prod-restore-measure: ${isLocal ? "local" : "hosted"}, ${new Date().toISOString()}, scale ${SCALE}`);
const db = await connectDb(t);
const fnUrl = `${t.apiUrl}/functions/v1/backup`;
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(t.apiUrl, secretKey, opts);

const priv = await db.query(`select has_table_privilege(current_user, 'auth.users', 'INSERT') as users_insert,
  has_table_privilege(current_user, 'auth.users', 'DELETE') as users_delete,
  has_table_privilege(current_user, 'auth.identities', 'INSERT') as identities_insert,
  pg_has_role(current_user, 'pg_read_all_stats', 'MEMBER') as read_stats,
  (select count(*) from cron.job where active) as cron_active,
  (select count(*) from pg_extension where extname = 'pg_stat_statements') as stat_ext`);
const p = priv.rows[0];
// --skip-cron-window is for a project whose cron jobs are unscheduled (the drill); with an active job it is refused.
const problem = measureWindowProblem({ isLocal, skipWindow: process.argv.includes("--skip-cron-window"), cronActive: Number(p.cron_active) });
console.log(`checks: ${JSON.stringify(p)}; cron window: ${problem ?? (isLocal ? "n/a (local)" : "skipped or clear")}`);
console.log(`plan: ${RUNS} restores of one backup of a ${SCALE}x account through ${fnUrl.replace(t.apiUrl, "<api>")}; judged: ends applied, wall < ${WALL_LIMIT_MS} ms, restore_account() db time < ${DB_LIMIT_MS} ms, steps unbuffered`);
const blocked = !(p.users_insert && p.users_delete && p.identities_insert) || problem;
if (!RUN || blocked) {
  console.log(blocked ? `NOT RUN: ${blocked === true ? "a privilege is missing" : blocked}` : "no --run: nothing was written");
  await db.end();
  process.exit(blocked ? 1 : 0);
}

const userId = randomUUID();
// The pooler may report its own process id, so ask the server for the backend's (Task 264 expert review, item 3).
const mainPid = (await db.query("select pg_backend_pid() as pid")).rows[0].pid;
const flight = { n: 0 }; // function calls in flight (a signal waits for them before the last deletion)
let cleaning = null;
function cleanup() {
  cleaning ??= (async () => {
    console.log(`cleanup ${new Date().toISOString()}`);
    const c = await connectDb(t);
    c.on("error", () => undefined);
    await c.query("select pg_terminate_backend($1)", [mainPid]).catch(() => undefined);
    await c.query("delete from auth.users where id = $1", [userId]).catch(() => console.log("FAIL cleanup user"));
    if (flight.n > 0) {
      // A function run past its account check can still upload; it stops at its next check once the user is gone.
      console.log("waiting up to 60 s for the function run in flight");
      for (let waited = 0; flight.n > 0 && waited < 60_000; waited += 1000) await new Promise((r) => setTimeout(r, 1000));
    }
    try {
      // A function run past its account check can still upload, so delete three times, two seconds apart.
      for (let pass = 0; pass < 3; pass++) {
        for (const key of await listKeys(`accounts/${userId}/`)) await aws.fetch(`${bucketBase}/${key.split("/").map(encodeURIComponent).join("/")}`, { method: "DELETE" });
        await new Promise((r) => setTimeout(r, 2000));
      }
    } catch {
      console.log("FAIL cleanup objects");
    }
    const left = await c
      .query(
        `select (select count(*) from auth.users where id = $1) users, (select count(*) from auth.identities where user_id = $1) identities,
                (select count(*) from app.accounts where user_id = $1) accounts, (select count(*) from app.nodes where user_id = $1) nodes,
                (select count(*) from app.bits where user_id = $1) bits, (select count(*) from app.chunks where user_id = $1) chunks,
                (select count(*) from app.scratch_breakdowns where user_id = $1) breakdowns, (select count(*) from app.staged_candidates where user_id = $1) candidates,
                (select count(*) from app.restore_staging where user_id = $1) restore_staging, (select count(*) from app.backup_status where user_id = $1) backup_status,
                (select count(*) from internal.r2_deletions where user_id = $1) r2_deletions`,
        [userId],
      )
      .catch(() => ({ rows: [{ error: 1 }] }));
    let objects = -1;
    try {
      objects = (await listKeys(`accounts/${userId}/`)).length;
    } catch {
      // reported as -1
    }
    const all = { ...left.rows[0], r2_objects: objects };
    // r2_deletions is the function's own record of what to delete; the objects are already gone, so the row is removed.
    if (Number(all.r2_deletions) > 0) {
      await c.query("delete from internal.r2_deletions where user_id = $1", [userId]).catch(() => undefined);
      all.r2_deletions = Number((await c.query("select count(*) n from internal.r2_deletions where user_id = $1", [userId]).catch(() => ({ rows: [{ n: -1 }] }))).rows[0].n);
    }
    const clean = Object.values(all).every((v) => Number(v) === 0);
    console.log(`${clean ? "PASS" : "FAIL"} nothing left: ${JSON.stringify(all)}`);
    await c.end().catch(() => undefined);
    return clean;
  })();
  return cleaning;
}
for (const [sig, code] of [["SIGINT", 130], ["SIGTERM", 143], ["SIGHUP", 129]]) process.on(sig, () => cleanup().finally(() => process.exit(code)));

const HANGUL = (col) =>
  `(select string_agg(chr(44032 + floor(random() * 11172)::int), '') from generate_series(1, greatest(1, ceil(octet_length(t.${col}) / 3.0)::int)))`;

/** pg_stat_statements totals for the two restore calls (null when the role cannot read them). */
async function stats() {
  if (!p.stat_ext) return null;
  try {
    const r = await db.query(
      `select
         coalesce(sum(calls) filter (where query ilike '%restore\\_stage%'), 0)::float as stage_calls,
         coalesce(sum(total_exec_time) filter (where query ilike '%restore\\_stage%'), 0) as stage_ms,
         coalesce(sum(calls) filter (where query ilike '%restore\\_account%'), 0)::float as acct_calls,
         coalesce(sum(total_exec_time) filter (where query ilike '%restore\\_account%'), 0) as acct_ms
       from pg_stat_statements where query not ilike '%pg_stat_statements%'`,
    );
    return r.rows[0];
  } catch {
    return null;
  }
}

let fails = 0;
try {
  const email = `restore-measure-${userId}@example.invalid`;
  await db.query(
    `insert into auth.users (id, instance_id, aud, role, email, is_anonymous, created_at, updated_at,
       confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current,
       phone_change, phone_change_token, reauthentication_token)
     values ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2, false, now(), now(),
       '', '', '', '', '', '', '', '')`,
    [userId, email],
  );
  await db.query(
    `insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
     values ($1, $2, jsonb_build_object('sub', $1::text), 'github', now(), now(), now())`,
    [`measure-${userId}`, userId],
  );
  const counts = await buildLimitSizedAccount(db, userId, SCALE);
  await db.query(`update app.nodes t set title = ${HANGUL("title")} where t.user_id = $1 and t.system_role is null`, [userId]);
  await db.query(`update app.bits t set title = ${HANGUL("title")}, description = ${HANGUL("description")} where t.user_id = $1`, [userId]);
  await db.query(`update app.chunks t set title = ${HANGUL("title")}, description = ${HANGUL("description")} where t.user_id = $1`, [userId]);
  await db.query(`update app.scratch_breakdowns t set content = ${HANGUL("content")} where t.user_id = $1`, [userId]);
  for (const table of ["nodes", "bits", "chunks", "scratch_breakdowns"]) await db.query(`vacuum analyze app.${table}`);
  const size = await db.query("select octet_length(public.export_account($1)::text) as bytes", [userId]).catch(() => null);
  console.log(`built ${JSON.stringify(counts)}${size ? `; export text ${size.rows[0].bytes} bytes` : ""}`);

  // The session of the test user, by the admin magic-link route (never a minted JWT).
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (link.error) throw new Error(`generateLink refused: ${link.error.status ?? ""} ${link.error.code ?? ""}`);
  const anon = createClient(t.apiUrl, t.publishableKey, opts);
  const verified = await anon.auth.verifyOtp({ token_hash: link.data.properties.hashed_token, type: "magiclink" });
  if (verified.error || !verified.data.session) throw new Error(`verifyOtp refused: ${verified.error?.status ?? ""} ${verified.error?.code ?? ""}`);
  const jwt = verified.data.session.access_token;
  console.log("PASS session for the test user obtained by generateLink + verifyOtp");
  const call = (body) => fetch(fnUrl, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${jwt}` }, body: JSON.stringify(body), signal: AbortSignal.timeout(170_000) });

  flight.n++;
  let backup;
  let bb;
  try {
    backup = await call({ mode: "manual", run_id: randomUUID() });
    bb = await backup.json().catch(() => null);
  } finally {
    flight.n--;
  }
  const wrote = backup.status === 200 && bb?.result?.result === "written";
  console.log(`${wrote ? "PASS" : "FAIL"} Back Up Now: ${backup.status} ${bb?.result?.result ?? bb?.status}`);
  if (!wrote) throw new Error("no backup to restore");
  const today = new Date().toISOString().slice(0, 10);
  // Positive control: the bucket named by GRIDDO_MEASURE_S3_ENV must hold the backup the function just wrote, or the
  // residue count below would look at the wrong bucket and read 0 (Task 264 expert review, item 1).
  const written = await listKeys(`accounts/${userId}/`);
  if (!written.includes(`accounts/${userId}/${today}.json.gz`)) throw new Error("the backup object is not in the bucket of GRIDDO_MEASURE_S3_ENV (wrong bucket settings?)");
  console.log(`PASS the function's backup is in the bucket the cleanup watches (${written.length} objects under the test account)`);

  const walls = [];
  for (let i = 0; i < RUNS; i++) {
    // The product allows one restore per account every 10 minutes (`rate_limited`); the measurement clears only that
    // timestamp between runs, through the owner connection. Nothing else about the rule is bypassed.
    await db.query("update app.backup_status set restore_started_at = null where user_id = $1", [userId]);
    // A change since the backup, so the restore has something to undo and the fingerprint is current.
    await db.query("update app.chunks set description = description || ' x' where id = (select id from app.chunks where user_id = $1 order by id limit 1)", [userId]);
    const listed = await (await call({ mode: "status" })).json();
    const entry = listed?.result?.backups?.find((e) => e.name === today);
    if (!entry) throw new Error("the backup is not in the list");
    // Read-only: dead tuples of the five tables before the run (the cause to test for a rising wall time).
    const dead = await db.query("select relname, n_dead_tup from pg_stat_user_tables where schemaname = 'app' and relname = any($1) order by relname", [["nodes", "bits", "chunks", "scratch_breakdowns", "staged_candidates"]]);
    console.log(`run ${i + 1} n_dead_tup before: ${dead.rows.map((r) => `${r.relname} ${r.n_dead_tup}`).join(", ")}`);
    const before = await stats();
    const t0 = performance.now();
    flight.n++;
    const res = await call({ mode: "restore", restore_id: randomUUID(), file: today, etag: entry.etag });
    if (!(res.headers.get("content-type") ?? "").includes("text/event-stream")) {
      const refused = await res.json().catch(() => null);
      console.log(`FAIL restore ${i + 1}: answered ${res.status} ${res.headers.get("content-type")}, not a stream: ${refused?.status ?? "?"} ${refused?.rejection?.code ?? refused?.reason ?? ""}`);
      fails++;
      flight.n--;
      continue;
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    const events = []; // { name, at, read }
    let buf = "";
    let read = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      read++;
      buf += dec.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf("\n\n")) >= 0) {
        const m = /event: (\w+)\ndata: (.*)/.exec(buf.slice(0, idx));
        if (m) events.push({ name: m[1], data: m[2], at: performance.now() - t0, read });
        buf = buf.slice(idx + 2);
      }
    }
    flight.n--;
    const wall = performance.now() - t0;
    walls.push(wall);
    const after = await stats();
    const last = events.at(-1);
    const applied = res.status === 200 && last?.name === "result" && last.data.includes('"applied"');
    const first = events.find((e) => e.name === "step");
    // Unbuffered: the first step was read in an earlier read than the result and arrived before it.
    const streamed = !!first && !!last && first.read < last.read && last.at - first.at >= 50;
    const dbt = judgeDbTime(before && after ? before : null, before && after ? after : null, !isLocal, DB_LIMIT_MS);
    const dbOk = dbt.ok;
    const ok = applied && wall < WALL_LIMIT_MS && streamed && dbOk;
    if (!ok) fails++;
    const overWall = wall >= WALL_LIMIT_MS;
    console.log(
      `${ok ? "PASS" : "FAIL"} restore ${i + 1}: ${res.status} ${res.headers.get("content-type")}; events ${events.map((e) => `${e.name}@${e.at.toFixed(0)}ms/read${e.read}`).join(", ")}; applied ${applied}; wall ${wall.toFixed(0)} ms (limit ${WALL_LIMIT_MS}); unbuffered ${streamed}; ` +
        (dbt.kind === "measured"
          ? `db restore_stage ${dbt.stageMs.toFixed(0)} ms of its ${STAGE_TIMEOUT_MS} ms timeout (${((dbt.stageMs / STAGE_TIMEOUT_MS) * 100).toFixed(0)}%), restore_account ${dbt.acctMs.toFixed(0)} ms (limit ${DB_LIMIT_MS})`
          : `db time unproven (${dbt.reason === "unreadable" ? "pg_stat_statements not readable" : "no restore call counted"})${dbt.ok ? ", allowed locally" : ""}`),
    );
    if (overWall) {
      console.log(`STOP: run ${i + 1} took ${wall.toFixed(0)} ms, over ${WALL_LIMIT_MS}; no further run (the measurement ends here for a decision)`);
      break;
    }
  }
  console.log(`worst wall ${Math.max(...walls).toFixed(0)} ms`);
  const rows = await db.query("select (select count(*) from app.nodes where user_id = $1) nodes, (select count(*) from app.bits where user_id = $1) bits, (select count(*) from app.chunks where user_id = $1) chunks", [userId]);
  const rowsOk = Number(rows.rows[0].bits) === counts.bits && Number(rows.rows[0].chunks) === counts.chunks && Number(rows.rows[0].nodes) === counts.nodes;
  console.log(`${rowsOk ? "PASS" : "FAIL"} rows after the last restore equal what was built: ${JSON.stringify(rows.rows[0])}`);
  if (!rowsOk) fails++;
} catch (e) {
  console.log(`FAIL ${e.message}`);
  fails++;
} finally {
  const clean = await cleanup();
  if (!clean) fails++;
}
console.log(fails === 0 ? "RESULT PASS" : `RESULT FAIL (${fails})`);
process.exit(fails === 0 ? 0 : 1);
