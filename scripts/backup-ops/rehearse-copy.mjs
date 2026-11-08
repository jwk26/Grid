// Task 264: the local rehearsal of copy-account.mjs. Local Supabase only (`supabase functions serve --env-file
// .env.local` running). The "old" account is a temporary user with a `github` identity whose backup and
// identity.json are written by the REAL backup function (scheduled mode) into the local `backup` bucket;
// copy-account then copies it (a) to a second local bucket (GET then PUT) and (b) within the first bucket
// (CopyObject), and its refusals are driven: a second run (no overwrite), a wrong --expect-target-bucket, no
// match, two matches. Everything it creates is removed at the end and on SIGINT/SIGTERM; counts are printed.
//
// Usage: node scripts/backup-ops/rehearse-copy.mjs --local
import { createClient } from "@supabase/supabase-js";
import { execFileSync, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { AwsClient } from "aws4fetch";
import { buildLimitSizedAccount } from "../../supabase/tests/fixtures/limit-sized-account.ts";
import { assertLocalDatabase, loadEnv } from "../backup-measure/lib.mjs";
import { connectDb, isLocal, target } from "../verify/lib.mjs";

if (!isLocal) throw new Error("local only: pass --local");
loadEnv();
const t = target();
assertLocalDatabase(t.dbUrl ?? undefined);
const status = execFileSync("pnpm", ["exec", "supabase", "status", "-o", "env"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const kv = Object.fromEntries(status.split("\n").map((l) => /^([A-Z0-9_]+)="?(.*?)"?$/.exec(l.trim())).filter(Boolean).map((m) => [m[1], m[2]]));
const admin = createClient(t.apiUrl, kv.SECRET_KEY ?? kv.SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const S3 = "http://127.0.0.1:54321/storage/v1/s3";
const aws = new AwsClient({ accessKeyId: kv.S3_PROTOCOL_ACCESS_KEY_ID, secretAccessKey: kv.S3_PROTOCOL_ACCESS_KEY_SECRET, region: kv.S3_PROTOCOL_REGION ?? "local", service: "s3" });
const SRC = process.env.BACKUP_S3_BUCKET;
const DRILL = `drill-rehearsal-${randomUUID().slice(0, 8)}`;
const dir = mkdtempSync(path.join(tmpdir(), "copy-rehearsal-"));
chmodSafe(dir);
function chmodSafe(d) { execFileSync("chmod", ["700", d]); }

const db = await connectDb(t);
const users = [];
let fails = 0;
const check = (ok, line) => { console.log(`${ok ? "PASS" : "FAIL"} ${line}`); if (!ok) fails++; };

async function listKeys(bucket, prefix) {
  const res = await aws.fetch(`${S3}/${bucket}?list-type=2&prefix=${encodeURIComponent(prefix)}`);
  return [...(await res.text()).matchAll(/<Key>([^<]*)<\/Key>/g)].map((m) => m[1]);
}
async function clean() {
  for (const id of users) {
    for (const bucket of [SRC, DRILL]) {
      for (const k of await listKeys(bucket, `accounts/${id}/`).catch(() => [])) await aws.fetch(`${S3}/${bucket}/${k}`, { method: "DELETE" });
    }
    await admin.auth.admin.deleteUser(id);
  }
  await admin.storage.emptyBucket(DRILL).catch(() => undefined);
  await admin.storage.deleteBucket(DRILL).catch(() => undefined);
  rmSync(dir, { recursive: true, force: true });
  const left = [];
  for (const id of users) left.push(...(await listKeys(SRC, `accounts/${id}/`)));
  const u = await db.query("select count(*) n from auth.users where id = any($1)", [users]);
  console.log(`cleanup: objects left ${left.length}, users left ${u.rows[0].n}`);
  return left.length === 0 && Number(u.rows[0].n) === 0;
}
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => clean().finally(() => process.exit(1)));

const envFile = (name, bucket) => {
  const f = path.join(dir, name);
  writeFileSync(f, `R2_ENDPOINT=${S3}\nR2_BUCKET=${bucket}\nR2_ACCESS_KEY_ID=${kv.S3_PROTOCOL_ACCESS_KEY_ID}\nR2_SECRET_ACCESS_KEY=${kv.S3_PROTOCOL_ACCESS_KEY_SECRET}\nR2_REGION=${kv.S3_PROTOCOL_REGION ?? "local"}\n`, { mode: 0o600 });
  return f;
};
const idFile = (name, provider, id, userId) => {
  const f = path.join(dir, name);
  writeFileSync(f, JSON.stringify([{ provider, id, user_id: userId }]), { mode: 0o600 });
  return f;
};
const copy = (...a) => {
  const r = spawnSync("node", ["scripts/backup-ops/copy-account.mjs", ...a], { encoding: "utf8" });
  return { code: r.status, out: r.stdout + r.stderr };
};

async function makeOldUser(providerId) {
  const email = `copy-rehearsal-${randomUUID().slice(0, 8)}@example.invalid`;
  const c = await admin.auth.admin.createUser({ email, password: `pw-${randomUUID()}`, email_confirm: true });
  if (c.error) throw new Error(`createUser: ${c.error.message}`);
  const id = c.data.user.id;
  users.push(id);
  await db.query(
    `insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
     values ($1, $2, jsonb_build_object('sub', $1::text), 'github', now(), now(), now())`,
    [providerId, id],
  );
  return id;
}

try {
  await admin.storage.createBucket(DRILL, { public: false });
  const providerId = `rehearse-${randomUUID()}`;
  const oldId = await makeOldUser(providerId);
  await buildLimitSizedAccount(db, oldId, 0.05);
  const res = await fetch(`${t.apiUrl}/functions/v1/backup`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-backup-secret": process.env.BACKUP_SHARED_SECRET },
    body: JSON.stringify({ mode: "scheduled", user_id: oldId }),
  });
  const body = await res.json().catch(() => null);
  check(res.status === 200 && body?.result?.result === "written", `the real function wrote the old account's backup (${res.status} ${body?.result?.result})`);
  // A second dated slot, an unrelated file, and a pre-restore file under the old prefix.
  const seed = await aws.fetch(`${S3}/${SRC}/accounts/${oldId}/${new Date().toISOString().slice(0, 10)}.json.gz`);
  const bytes = Buffer.from(await seed.arrayBuffer());
  await aws.fetch(`${S3}/${SRC}/accounts/${oldId}/2026-01-02.json.gz`, { method: "PUT", body: bytes, headers: { "content-type": "application/gzip" } });
  await aws.fetch(`${S3}/${SRC}/accounts/${oldId}/pre-restore/2026-01-03T01-02-03Z.json.gz`, { method: "PUT", body: bytes, headers: { "content-type": "application/gzip" } });
  const oldKeys = await listKeys(SRC, `accounts/${oldId}/`);
  check(oldKeys.some((k) => k.endsWith("/identity.json")) && oldKeys.length === 4, `old prefix holds identity.json, 2 dated files, 1 pre-restore (${oldKeys.length} keys)`);

  const newA = randomUUID();
  users.push(newA); // only for cleanup of objects
  const srcEnv = envFile("src.env", SRC);
  const drillEnv = envFile("drill.env", DRILL);
  const id = idFile("id.json", "github", providerId, newA);
  const base = ["--source-env", srcEnv, "--identity-file", id, "--new-user-id", newA];

  let r = copy(...base, "--target-env", drillEnv);
  check(r.code === 0 && /matching the provider user id: 1/.test(r.out) && /plan: 2 files/.test(r.out) && /nothing was written/.test(r.out), "plan only: one match, 2 files, nothing written");
  check((await listKeys(DRILL, "accounts/")).length === 0, "plan only left the drill bucket empty");
  check(!r.out.includes(oldId) && !r.out.includes(providerId) && !r.out.includes(kv.S3_PROTOCOL_ACCESS_KEY_SECRET), "output holds no id or secret");

  r = copy(...base, "--target-env", drillEnv, "--run");
  check(r.code !== 0 && /--expect-target-bucket/.test(r.out), "--run without --expect-target-bucket refuses");
  r = copy(...base, "--target-env", drillEnv, "--run", "--expect-target-bucket", SRC);
  check(r.code !== 0 && /--expect-target-bucket/.test(r.out) && (await listKeys(DRILL, "accounts/")).length === 0, "a wrong --expect-target-bucket refuses and writes nothing");

  r = copy(...base, "--target-env", drillEnv, "--run", "--expect-target-bucket", DRILL);
  const drilled = await listKeys(DRILL, `accounts/${newA}/`);
  check(r.code === 0 && /PASS copied 2\/2/.test(r.out) && drilled.length === 2 && !drilled.some((k) => k.includes("identity") || k.includes("pre-restore")), `cross-bucket copy: 2 dated files, no identity.json, no pre-restore (${drilled.length} keys)`);
  check((await listKeys(SRC, `accounts/${newA}/`)).length === 0, "the source bucket got nothing under the new prefix");

  r = copy(...base, "--target-env", drillEnv, "--run", "--expect-target-bucket", DRILL);
  check(r.code !== 0 && /already exist/.test(r.out) && /clashing with the plan: 2/.test(r.out), "a second run refuses: a copy never overwrites");

  const newB = randomUUID();
  users.push(newB);
  r = copy("--source-env", srcEnv, "--identity-file", idFile("idB.json", "github", providerId, newB), "--new-user-id", newB, "--target-env", srcEnv, "--include-pre-restore", "--run", "--expect-target-bucket", SRC);
  const same = await listKeys(SRC, `accounts/${newB}/`);
  check(r.code === 0 && /one bucket \(CopyObject\)/.test(r.out) && /PASS copied 3\/3/.test(r.out) && same.length === 3 && same.some((k) => k.includes("pre-restore")), `same-bucket CopyObject with --include-pre-restore: 3 files (${same.length} keys)`);

  const noMatch = randomUUID();
  r = copy("--source-env", srcEnv, "--identity-file", idFile("none.json", "github", "no-such-id", noMatch), "--new-user-id", noMatch, "--target-env", drillEnv);
  check(r.code !== 0 && /found 0/.test(r.out), "no matching provider user id refuses");

  // The old id given as the new id: no other old prefix matches, so the run refuses at the owner count (before any twin exists).
  r = copy("--source-env", srcEnv, "--identity-file", idFile("same.json", "github", providerId, oldId), "--new-user-id", oldId, "--target-env", drillEnv);
  check(r.code !== 0 && /found 0/.test(r.out), "the old id as the new id refuses (no other prefix matches)");

  // An identity row of another user than --new-user-id refuses before anything is read.
  r = copy("--source-env", srcEnv, "--identity-file", idFile("other.json", "github", providerId, oldId), "--new-user-id", randomUUID(), "--target-env", drillEnv);
  check(r.code !== 0 && /another user/.test(r.out), "an identity row of another user refuses");
  // An identity file readable by others refuses.
  const loose = idFile("loose.json", "github", providerId, newA);
  execFileSync("chmod", ["644", loose]);
  r = copy("--source-env", srcEnv, "--identity-file", loose, "--new-user-id", newA, "--target-env", drillEnv);
  check(r.code !== 0 && /readable by others/.test(r.out), "an identity file readable by others refuses");

  const twin = await makeOldUser(providerId + "-twin");
  await aws.fetch(`${S3}/${SRC}/accounts/${twin}/identity.json`, { method: "PUT", body: JSON.stringify({ user_id: twin, providers: [{ provider: "github", provider_user_id: providerId }] }), headers: { "content-type": "application/json" } });
  const newC = randomUUID();
  r = copy("--source-env", srcEnv, "--identity-file", idFile("idC.json", "github", providerId, newC), "--new-user-id", newC, "--target-env", drillEnv);
  check(r.code !== 0 && /found 2/.test(r.out), "two matching old prefixes refuse (count only)");

} catch (e) {
  console.log(`FAIL ${e.message}`);
  fails++;
} finally {
  const ok = await clean().catch((e) => { console.log(`FAIL cleanup ${e.message}`); return false; });
  if (!ok) fails++;
  await db.end();
}
console.log(fails === 0 ? "RESULT PASS" : `RESULT FAIL (${fails})`);
process.exit(fails === 0 ? 0 : 1);
