// Task 255 items 4 and 5: PutObject, GetObject, ListObjectsV2, DeleteObjects, CopyObject.
// Usage: node scripts/backup-measure/s3-check.mjs local|r2
// local: BACKUP_S3_* (the host.docker.internal endpoint is rewritten to 127.0.0.1).
// r2:    R2_DEV_* (the development bucket only).
import { AwsClient } from "aws4fetch";
import { loadEnv, onCleanup, randomTestUserId } from "./lib.mjs";

loadEnv();
const mode = process.argv[2];
const cfg =
  mode === "r2"
    ? {
        endpoint: process.env.R2_DEV_ENDPOINT,
        bucket: process.env.R2_DEV_BUCKET,
        id: process.env.R2_DEV_ACCESS_KEY_ID,
        secret: process.env.R2_DEV_SECRET_ACCESS_KEY,
        region: "auto",
      }
    : mode === "local"
      ? {
          endpoint: process.env.BACKUP_S3_ENDPOINT?.replace("host.docker.internal", "127.0.0.1"),
          bucket: process.env.BACKUP_S3_BUCKET,
          id: process.env.BACKUP_S3_ACCESS_KEY_ID,
          secret: process.env.BACKUP_S3_SECRET_ACCESS_KEY,
          region: process.env.BACKUP_S3_REGION,
        }
      : null;
if (!cfg || !cfg.endpoint || !cfg.bucket || !cfg.id || !cfg.secret) {
  console.error("usage: s3-check.mjs local|r2 (and the matching variables in .env.local)");
  process.exit(1);
}

const s3 = new AwsClient({
  accessKeyId: cfg.id,
  secretAccessKey: cfg.secret,
  region: cfg.region,
  service: "s3",
});
const base = `${cfg.endpoint.replace(/\/$/, "")}/${cfg.bucket}`;
const prefix = `measure-${randomTestUserId()}/`;
const keys = [`${prefix}a.bin`, `${prefix}b.bin`];
const body = new Uint8Array(1024 * 1024).map((_, i) => i % 251);

const results = [];
async function step(name, fn) {
  const t = performance.now();
  try {
    const detail = await fn();
    results.push(`${name}: ok ${detail ?? ""} (${Math.round(performance.now() - t)} ms)`);
  } catch (e) {
    results.push(`${name}: FAIL ${e.message}`);
  }
}
const must = (r, want = 200) => {
  if (r.status !== want) throw new Error(`status ${r.status}`);
  return r;
};

const finish = onCleanup(async () => {
  const del = `<Delete>${keys.map((k) => `<Object><Key>${k}</Key></Object>`).join("")}</Delete>`;
  await s3.fetch(`${base}?delete`, { method: "POST", body: del, headers: { "content-type": "application/xml" } }).catch(() => {});
  for (const r of results) console.log(r);
});

await step("PutObject", async () => `status ${must(await s3.fetch(`${base}/${keys[0]}`, { method: "PUT", body })).status}`);
await step("GetObject", async () => {
  const r = must(await s3.fetch(`${base}/${keys[0]}`));
  const got = new Uint8Array(await r.arrayBuffer());
  if (got.length !== body.length) throw new Error(`length ${got.length}`);
  return `${got.length} bytes`;
});
await step("CopyObject", async () => {
  const r = must(
    await s3.fetch(`${base}/${keys[1]}`, {
      method: "PUT",
      headers: { "x-amz-copy-source": `/${cfg.bucket}/${keys[0]}` },
    }),
  );
  return `status ${r.status}`;
});
await step("ListObjectsV2", async () => {
  const r = must(await s3.fetch(`${base}?list-type=2&prefix=${encodeURIComponent(prefix)}`));
  const n = (await r.text()).match(/<Key>/g)?.length ?? 0;
  if (n !== 2) throw new Error(`listed ${n}, expected 2`);
  return `${n} keys`;
});
await step("DeleteObjects", async () => {
  const del = `<Delete>${keys.map((k) => `<Object><Key>${k}</Key></Object>`).join("")}</Delete>`;
  const r = must(await s3.fetch(`${base}?delete`, { method: "POST", body: del, headers: { "content-type": "application/xml" } }));
  const text = await r.text();
  const n = text.match(/<Deleted>/g)?.length ?? 0;
  if (n !== 2) throw new Error(`deleted ${n}, expected 2`);
  return `${n} deleted`;
});
await finish();
