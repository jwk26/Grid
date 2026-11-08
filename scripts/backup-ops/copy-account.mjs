// Task 264: copy an account's backup files from its old key to its new key (DECISION §Object key, B16).
// Runs on the owner's Mac. After a recovery into a new project the internal user id changes; the old
// objects sit under `accounts/<old id>/`. This finds the old prefix by the provider user id and copies the
// dated backup files to `accounts/<new id>/` in a TARGET bucket given as an argument: the drill bucket for
// the drill, the production bucket in a real recovery. The user then restores through the ordinary dialog.
//
// Across buckets it reads with the source env file's token (read-only is enough) and writes with the target
// env file's token (GET and PUT). Within one bucket (same endpoint and bucket name) it uses CopyObject.
// It never overwrites a target key (any existing one stops the run), copies dated files only (`identity.json`
// never; `pre-restore/` files only with --include-pre-restore), and proceeds only when exactly one old
// prefix matches. Output holds counts, bucket names and date names only, never an id, a key or a secret.
//
// Usage:
//   node scripts/backup-ops/copy-account.mjs --source-env <file> --target-env <file> \
//        --new-user-id <uuid> --identity-file <file> [--include-pre-restore]                  plan only, writes nothing
//   ... add  --run --expect-target-bucket <name>                                                 copies
//
// Files (mode 600; the script refuses a file others can read). Names only, values never in chat or Git:
//   source env and target env:  R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
//     (the source is ~/.config/griddo/restore-check.env's read-only token; the target is its own file;
//      R2_REGION is optional and defaults to auto)
//   identity file (mode 600 too):  JSON [{"provider":"google","id":"<provider user id>","user_id":"<new user id>"}],
//     the new user's rows of auth.identities (provider, provider_id, user_id) from the new project; every row's
//     user_id must equal --new-user-id. Delete it after the run.
//
// For a real recovery: restore before the next 17:00 UTC daily run, since the new account's own daily backup
// takes that date slot and retention may prune older copied files.
// A cross-bucket PUT carries `If-None-Match: *` and every target key is checked with HEAD right before its write; the
// header is proven on local Storage and on a development R2 bucket (a second PUT of a key answers 412); a refusal such
// as 501 would stop the run with its status and write nothing.
// In a real recovery press no `Back Up Now` in the new account before this copy: a backup of the new account
// in the old account's newest date slot makes the plan clash with it, and the copy refuses the whole run.
// After the copy the Restore… list shows every copied file at the copy time (its object time), not its date, and
// the new account's own backup sorts above them: tell the files apart by the date names this script prints
// (Phase 53 mi-3, in Issues_Deferred.md).
import { AwsClient } from "aws4fetch";
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { parseListPage } from "../../supabase/functions/_shared/s3-xml.ts";
import { findCollisions, findOldOwners, parseIdentityRows, pickOldOwner, planCopy, sameBucket } from "./plan.ts";

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const val = (n) => {
  const i = args.indexOf(n);
  return i >= 0 ? args[i + 1] : undefined;
};
const RUN = flag("--run");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function readEnv(file, what) {
  if (!file) throw new Error(`--${what}-env is required`);
  if (statSync(file).mode & 0o077) throw new Error(`the ${what} env file is readable by others; run chmod 600 on it`);
  const env = {};
  for (const raw of readFileSync(file, "utf8").split("\n")) {
    const m = /^(?:export\s+)?([A-Z0-9_]+)=(.*)$/.exec(raw.trim());
    if (m) env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
  for (const k of ["R2_ENDPOINT", "R2_BUCKET", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"]) {
    if (!env[k]) throw new Error(`${k} is missing in the ${what} env file`);
  }
  return env;
}

function side(env) {
  const endpoint = env.R2_ENDPOINT.replace(/\/$/, "");
  const aws = new AwsClient({ accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY, region: env.R2_REGION ?? "auto", service: "s3" });
  const base = `${endpoint}/${env.R2_BUCKET}`;
  const url = (key) => `${base}/${key.split("/").map(encodeURIComponent).join("/")}`;
  return { endpoint, bucket: env.R2_BUCKET, aws, base, url };
}

async function list(s, prefix) {
  const out = [];
  let token = null;
  do {
    const q = new URLSearchParams({ "list-type": "2", prefix, ...(token ? { "continuation-token": token } : {}) });
    const res = await s.aws.fetch(`${s.base}?${q}`);
    if (!res.ok) throw new Error(`listing failed: HTTP ${res.status}`);
    const page = parseListPage(await res.text());
    out.push(...page.objects);
    if (page.truncated && !page.nextToken) throw new Error("listing is truncated without a continuation token");
    token = page.truncated ? page.nextToken : null;
  } while (token);
  return out;
}

const get = async (s, key) => {
  const res = await s.aws.fetch(s.url(key));
  if (!res.ok) throw new Error(`reading a source object failed: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
};

try {
  const newUserId = val("--new-user-id");
  if (!newUserId || !UUID.test(newUserId)) throw new Error("--new-user-id must be a lowercase UUID");
  const idFile = val("--identity-file");
  if (!idFile) throw new Error("--identity-file is required");
  if (statSync(idFile).mode & 0o077) throw new Error("the identity file is readable by others; run chmod 600 on it");
  const wanted = parseIdentityRows(JSON.parse(readFileSync(idFile, "utf8")), newUserId);
  const src = side(readEnv(val("--source-env"), "source"));
  const dst = side(readEnv(val("--target-env"), "target"));
  const same = sameBucket(src, dst);
  console.log(`copy-account: source bucket ${src.bucket}, target bucket ${dst.bucket}, ${same ? "one bucket (CopyObject)" : "two buckets (GET then PUT)"}, ${RUN ? "RUN" : "plan only"}`);

  // The old prefix: every identity.json in the source bucket, matched on provider and provider user id.
  const all = await list(src, "accounts/");
  const identityObjects = all.filter((o) => o.key.endsWith("/identity.json"));
  const files = [];
  for (const o of identityObjects) files.push({ key: o.key, text: (await get(src, o.key)).toString("utf8") });
  const owners = findOldOwners(wanted, files, newUserId);
  console.log(`identity files read: ${files.length}; old prefixes matching the provider user id: ${owners.length}`);
  const oldUserId = pickOldOwner(owners);

  const plan = planCopy(oldUserId, newUserId, all.map((o) => o.key), flag("--include-pre-restore"));
  const sizes = new Map(all.map((o) => [o.key, o.size]));
  const total = plan.reduce((n, p) => n + (sizes.get(p.from) ?? 0), 0);
  console.log(`plan: ${plan.length} files, ${total} bytes (${plan.map((p) => p.to.split("/").slice(2).join("/").replace(/\.json\.gz$/, "")).join(", ")})`);

  const existing = (await list(dst, `accounts/${newUserId}/`)).map((o) => o.key);
  const clash = findCollisions(plan, existing);
  console.log(`target keys under the new prefix before: ${existing.length}; clashing with the plan: ${clash.length}`);
  if (clash.length) throw new Error(`refusing: ${clash.length} target key(s) already exist (a copy never overwrites)`);

  if (!RUN) {
    console.log("no --run: nothing was written");
    process.exit(0);
  }
  if (val("--expect-target-bucket") !== dst.bucket) throw new Error("--run needs --expect-target-bucket <the target bucket name>, and it must match");

  // A copy never overwrites: besides the listing above, each target key is checked again right before its write,
  // and a cross-bucket PUT carries `If-None-Match: *`, so an object that appeared meanwhile (for example a daily
  // backup of the new account) stops the run instead of being replaced.
  let copied = 0;
  for (const p of plan) {
    const head = await dst.aws.fetch(dst.url(p.to), { method: "HEAD" });
    if (head.status !== 404) throw new Error(`refusing: a target key appeared or could not be checked before its write (HTTP ${head.status})`);
    if (same) {
      const res = await dst.aws.fetch(dst.url(p.to), { method: "PUT", headers: { "x-amz-copy-source": `/${src.bucket}/${p.from.split("/").map(encodeURIComponent).join("/")}` } });
      if (!res.ok) throw new Error(`CopyObject failed: HTTP ${res.status}`);
    } else {
      const body = await get(src, p.from);
      const res = await dst.aws.fetch(dst.url(p.to), { method: "PUT", body, headers: { "content-type": "application/gzip", "if-none-match": "*" } });
      if (!res.ok) throw new Error(`PUT failed: HTTP ${res.status}`);
      // A second read of what the target now holds must equal what was read from the source.
      const back = await get(dst, p.to);
      if (createHash("sha256").update(back).digest("hex") !== createHash("sha256").update(body).digest("hex")) throw new Error("a copied object differs from its source");
    }
    copied++;
  }
  const after = await list(dst, `accounts/${newUserId}/`);
  const sizeOk = plan.every((p) => after.find((o) => o.key === p.to)?.size === sizes.get(p.from));
  console.log(`${sizeOk && copied === plan.length ? "PASS" : "FAIL"} copied ${copied}/${plan.length}; target now holds ${after.length} objects; sizes equal: ${sizeOk}${same ? "" : "; bytes re-read equal"}`);
  process.exit(sizeOk && copied === plan.length ? 0 : 1);
} catch (e) {
  // Messages here are the script's own (counts, statuses); a parse error never quotes a file.
  console.log(`FAIL ${e instanceof SyntaxError ? "a settings or identity file is not valid JSON" : e.message}`);
  process.exit(1);
}
