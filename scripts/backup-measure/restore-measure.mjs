// Task 261 (review item 3): CPU and memory of one full restore through the real function, local only.
// One temporary OAuth account at SCALE x the real-account limits with random Hangul text (the least
// compressible content a real account holds), one `Back Up Now`, one change, then one restore of that
// backup through the `restore` mode, read as its event stream. The CPU is the edge runtime
// container's cgroup `usage_usec` delta around the restore; the memory is the cgroup's
// `memory.current` sampled every 100 ms, reported as the rise over the idle baseline. Output is
// counts, times and statuses only. The account, its rows and its objects are deleted at the end.
//
// Usage: [SCALE=2] node scripts/backup-measure/restore-measure.mjs --local   (SCALE 1 = the real-account limits, 2 = the old caps; needs `supabase functions serve --env-file .env.local`)
// Go line (Task 261, user, 2026-11-07): under 1,000 ms CPU and under 128 MB memory.
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { buildLimitSizedAccount } from "../../supabase/tests/fixtures/limit-sized-account.ts";
import { connectDb, isLocal, target } from "../verify/lib.mjs";

if (!isLocal) throw new Error("local only: pass --local");
const SCALE = Number(process.env.SCALE ?? 1);
const CPU_LIMIT_MS = 1000;
const MEM_LIMIT_MB = 128;
const CONTAINER = "supabase_edge_runtime_grid";

const cg = (file) => execFileSync("docker", ["exec", CONTAINER, "cat", `/sys/fs/cgroup/${file}`], { encoding: "utf8" });
const cpuUsec = () => Number(/usage_usec (\d+)/.exec(cg("cpu.stat"))[1]);
const memBytes = () => Number(cg("memory.current").trim());

const t = target();
const status = execFileSync("pnpm", ["exec", "supabase", "status", "-o", "env"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const kv = Object.fromEntries(status.split("\n").map((l) => /^([A-Z0-9_]+)="?(.*?)"?$/.exec(l.trim())).filter(Boolean).map((m) => [m[1], m[2]]));
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(t.apiUrl, kv.SECRET_KEY ?? kv.SERVICE_ROLE_KEY, opts);
const fnUrl = `${t.apiUrl}/functions/v1/backup`;

const HANGUL = (col) =>
  `(select string_agg(chr(44032 + floor(random() * 11172)::int), '') from generate_series(1, greatest(1, ceil(octet_length(t.${col}) / 3.0)::int)))`;

const db = await connectDb(t);
let userId = null;
let fails = 0;
const clean = async () => {
  if (!userId) return;
  const names = (await admin.storage.from("backup").list(`accounts/${userId}`, { limit: 1000 })).data ?? [];
  const pre = (await admin.storage.from("backup").list(`accounts/${userId}/pre-restore`, { limit: 1000 })).data ?? [];
  const keys = [...names.filter((o) => o.id).map((o) => `accounts/${userId}/${o.name}`), ...pre.filter((o) => o.id).map((o) => `accounts/${userId}/pre-restore/${o.name}`)];
  if (keys.length) await admin.storage.from("backup").remove(keys);
  await admin.auth.admin.deleteUser(userId);
  const left = await db.query("select (select count(*) from app.bits where user_id = $1) bits, (select count(*) from app.restore_staging where user_id = $1) staging", [userId]);
  console.log(`cleanup: ${keys.length} objects removed; left ${JSON.stringify(left.rows[0])}`);
};
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => clean().finally(() => process.exit(1)));

try {
  const email = `restore-measure-${randomUUID().slice(0, 8)}@test.local`;
  const password = `pw-${randomUUID()}`;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error) throw new Error(`createUser: ${created.error.message}`);
  userId = created.data.user.id;
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
  console.log(`built ${JSON.stringify(counts)} at scale ${SCALE}`);

  const signed = createClient(t.apiUrl, t.publishableKey, opts);
  const si = await signed.auth.signInWithPassword({ email, password });
  if (si.error) throw new Error(`sign-in: ${si.error.message}`);
  const jwt = si.data.session.access_token;
  const call = (body, signal) =>
    fetch(fnUrl, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${jwt}` }, body: JSON.stringify(body), signal });

  const backup = await call({ mode: "manual", run_id: randomUUID() });
  const backupBody = await backup.json();
  const wrote = backup.status === 200 && backupBody?.result?.result === "written";
  console.log(`${wrote ? "PASS" : "FAIL"} Back Up Now: ${backup.status} ${backupBody?.result?.result ?? backupBody?.status}`);
  if (!wrote) fails++;
  const today = new Date().toISOString().slice(0, 10);
  // A change after the backup, so the restore has something to undo and the fingerprint is the current one.
  await db.query("update app.chunks set description = description || ' x' where id = (select id from app.chunks where user_id = $1 order by id limit 1)", [userId]);

  // Idle baseline, then the restore with the memory sampled while it runs.
  await new Promise((r) => setTimeout(r, 1500));
  const baseline = memBytes();
  let peak = baseline;
  const sampler = setInterval(() => {
    try { peak = Math.max(peak, memBytes()); } catch { /* sampling only */ }
  }, 100);
  const cpu0 = cpuUsec();
  const t0 = performance.now();
  const listed = await call({ mode: "status" });
  const entry = (await listed.json()).result.backups.find((e) => e.name === today);
  const res = await call({ mode: "restore", restore_id: randomUUID(), file: today, etag: entry.etag });
  let text = "";
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    text += dec.decode(value);
  }
  const wall = performance.now() - t0;
  const cpuMs = (cpuUsec() - cpu0) / 1000;
  await new Promise((r) => setTimeout(r, 300));
  clearInterval(sampler);
  const parsed = [...text.matchAll(/event: (\w+)\ndata: (.*)\n\n/g)].map((m) => `${m[1]}:${m[2]}`);
  const riseMb = (peak - baseline) / 1048576;
  console.log(`restore: ${res.status} ${res.headers.get("content-type")}; events ${JSON.stringify(parsed)}`);
  const ended = parsed.at(-1)?.includes('"applied"');
  console.log(`${ended ? "PASS" : "FAIL"} the stream ends with applied; wall ${wall.toFixed(0)} ms`);
  if (!ended) fails++;
  const cpuOk = cpuMs < CPU_LIMIT_MS;
  const memOk = riseMb < MEM_LIMIT_MB;
  console.log(`${cpuOk ? "PASS" : "FAIL"} CPU ${cpuMs.toFixed(0)} ms (limit ${CPU_LIMIT_MS})`);
  console.log(`${memOk ? "PASS" : "FAIL"} memory rise ${riseMb.toFixed(1)} MB over a ${(baseline / 1048576).toFixed(0)} MB baseline (limit ${MEM_LIMIT_MB})`);
  if (!cpuOk) fails++;
  if (!memOk) fails++;
  const rows = await db.query("select (select count(*) from app.bits where user_id = $1) bits, (select count(*) from app.chunks where user_id = $1) chunks", [userId]);
  console.log(`rows after: ${JSON.stringify(rows.rows[0])} (built ${counts.bits} bits, ${counts.chunks} chunks)`);
} catch (e) {
  console.log(`FAIL ${e.message}`);
  fails++;
} finally {
  await clean().catch((e) => console.log(`FAIL cleanup: ${e.message}`));
  await db.end();
}
console.log(fails === 0 ? "RESULT PASS" : `RESULT FAIL (${fails})`);
process.exit(fails === 0 ? 0 : 1);
