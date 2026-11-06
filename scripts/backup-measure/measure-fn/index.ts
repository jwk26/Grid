// Task 255 measurement function, kept as a reference. Copy it (with deno.json) to
// supabase/functions/measure/ while measuring and delete the copy afterwards; it is not under
// supabase/functions/, so `pnpm check:edge` never sees it. See README.md.
import process from "node:process";
import { Buffer } from "node:buffer";
import { createGzip } from "node:zlib";
import { Readable } from "node:stream";
import { AwsClient } from "aws4fetch";

const env = (k: string) => Deno.env.get(k) ?? "";
const endpoint = env("BACKUP_S3_ENDPOINT").replace(/\/$/, "");
const bucket = env("BACKUP_S3_BUCKET");
const aws = new AwsClient({
  accessKeyId: env("BACKUP_S3_ACCESS_KEY_ID"),
  secretAccessKey: env("BACKUP_S3_SECRET_ACCESS_KEY"),
  region: env("BACKUP_S3_REGION"),
  service: "s3",
});
async function gzipExport(userId: string) {
  const r = await fetch(`${env("SUPABASE_URL")}/rest/v1/rpc/measure_export`, {
    method: "POST",
    headers: {
      apikey: env("SUPABASE_SERVICE_ROLE_KEY"),
      authorization: `Bearer ${env("SUPABASE_SERVICE_ROLE_KEY")}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ p_user_id: userId }),
  });
  if (!r.ok || !r.body) throw new Error(`export ${r.status}`);
  let raw = 0;
  const gz = createGzip({ level: 1 });
  const chunks: Uint8Array[] = [];
  gz.on("data", (c: Uint8Array) => chunks.push(c));
  const done = new Promise<void>((res, rej) => {
    gz.on("end", () => res());
    gz.on("error", rej);
  });
  for await (const c of r.body as unknown as AsyncIterable<Uint8Array>) {
    raw += c.length;
    gz.write(c);
  }
  gz.end();
  await done;
  return { raw, body: Buffer.concat(chunks) };
}

async function run(client: string, userId: string) {
  const key = `measure-${crypto.randomUUID()}/${userId}.json.gz`;
  const mem = () => {
    const m = Deno.memoryUsage();
    return { rss: m.rss, he: m.heapUsed + m.external };
  };
  const base = mem(); // idle baseline read right before the run
  let peakRss = base.rss;
  let peakHe = base.he;
  const sampler = setInterval(() => {
    const m = mem();
    if (m.rss > peakRss) peakRss = m.rss;
    if (m.he > peakHe) peakHe = m.he;
  }, 25);
  let cpuAvailable = true;
  let cpu0 = { user: 0, system: 0 };
  try {
    cpu0 = process.cpuUsage();
  } catch {
    cpuAvailable = false;
  }
  const t0 = performance.now();
  const { raw, body } = await gzipExport(userId);
  const exportMs = performance.now() - t0;
  const tUp = performance.now();
  {
    const r = await aws.fetch(`${endpoint}/${bucket}/${key}`, { method: "PUT", body });
    if (!r.ok) throw new Error(`put ${r.status}`);
  }
  const wallMs = performance.now() - t0;
  const uploadMs = performance.now() - tUp;
  let cpuMs = -1;
  if (cpuAvailable) {
    const c = process.cpuUsage(cpu0);
    cpuMs = (c.user + c.system) / 1000;
    if (cpuMs === 0) cpuAvailable = false;
  }
  clearInterval(sampler);
  const m = mem();
  peakRss = Math.max(peakRss, m.rss);
  peakHe = Math.max(peakHe, m.he);
  await aws.fetch(`${endpoint}/${bucket}/${key}`, { method: "DELETE" });
  const mb = (n: number) => Math.round((n / 1048576) * 10) / 10;
  return {
    client,
    cpuAvailable,
    cpuMs: Math.round(cpuMs),
    wallMs: Math.round(wallMs),
    exportGzipMs: Math.round(exportMs),
    uploadMs: Math.round(uploadMs),
    rawBytes: raw,
    gzBytes: body.length,
    rssDeltaMB: mb(peakRss - base.rss),
    heapExtDeltaMB: mb(peakHe - base.he),
    baseRssMB: mb(base.rss),
  };
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (req.headers.get("x-backup-secret") !== env("BACKUP_SHARED_SECRET")) {
    return new Response("unauthorized", { status: 401 });
  }
  const p = url.pathname.split("/").pop();
  if (p === "run") {
    try {
      return Response.json(await run(url.searchParams.get("client") ?? "aws4fetch", url.searchParams.get("user")!));
    } catch (e) {
      return Response.json({ error: String(e) }, { status: 500 });
    }
  }
  if (p === "sleep") {
    const ms = Number(url.searchParams.get("ms"));
    const tag = url.searchParams.get("tag")!;
    await new Promise((r) => setTimeout(r, ms));
    await aws.fetch(`${endpoint}/${bucket}/measure-marker/${tag}`, { method: "PUT", body: "done" });
    return Response.json({ slept: ms });
  }
  if (p === "spin") {
    const end = performance.now() + Number(url.searchParams.get("ms") ?? 600000);
    while (performance.now() < end) { /* burn CPU */ }
    return Response.json({ spun: true });
  }
  if (p === "alloc") {
    const hold: Uint8Array[] = [];
    for (;;) {
      hold.push(new Uint8Array(16 * 1048576).fill(1));
      if (hold.length % 8 === 0) console.log(`allocated ${hold.length * 16} MB`);
    }
  }
  return new Response("not found", { status: 404 });
});
