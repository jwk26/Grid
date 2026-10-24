// Task 218, D8: load time and size of the account snapshot for a limit-sized and a one-tenth
// account, through the HTTPS API with gzip, as a signed-in anonymous user (anonymous sign-in
// must be on for the measurement only). Per account: one cold call (new TLS connection) and
// 5 warm calls; judged on the slowest warm call (limit-sized <= 3000 ms, one-tenth <= 1000 ms).
// Both accounts are deleted afterwards and the script checks that 0 rows are left.
// Usage: node scripts/verify/d8-measure.mjs [--local]
// Node strips the types of the fixture on import.
import { request, Agent } from "node:https";
import { Agent as HttpAgent, request as httpRequest } from "node:http";
import { gunzipSync } from "node:zlib";
import { createClient } from "@supabase/supabase-js";
import { buildLimitSizedAccount } from "../../supabase/tests/fixtures/limit-sized-account.ts";
import { connectDb, target } from "./lib.mjs";

const WARM_RUNS = 5;
const LIMITS = { "limit-sized": 3000, "one-tenth": 1000 };

const t = target();
console.log(`d8-measure: target ${t.name}`);
const url = new URL(`${t.apiUrl}/rest/v1/rpc/get_snapshot`);
const lib = url.protocol === "https:" ? request : httpRequest;

function call(token, agent) {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    const req = lib(
      url,
      {
        method: "POST",
        agent,
        headers: {
          apikey: t.publishableKey,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip",
          "Content-Length": 2,
        },
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const ms = performance.now() - start;
          const wire = Buffer.concat(chunks);
          const raw = res.headers["content-encoding"] === "gzip" ? gunzipSync(wire) : wire;
          resolve({ ms, wire: wire.length, raw: raw.length, status: res.statusCode, json: raw });
        });
      },
    );
    req.on("error", reject);
    req.end("{}");
  });
}

const sorted = (a) => [...a].sort((x, y) => x - y);
const mb = (n) => (n / 1024 / 1024).toFixed(2);

const db = await connectDb(t);
const ids = [];
let fails = 0;
try {
  for (const [label, scale] of [["limit-sized", 1], ["one-tenth", 0.1]]) {
    const client = createClient(t.apiUrl, t.publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.auth.signInAnonymously();
    if (error || !data.session) throw new Error(`anonymous sign-in failed: ${error?.message}`);
    const userId = data.user.id;
    ids.push(userId);
    const counts = await buildLimitSizedAccount(db, userId, scale);

    const agent = new (url.protocol === "https:" ? Agent : HttpAgent)({ keepAlive: true, maxSockets: 1 });
    const cold = await call(data.session.access_token, agent);
    const warm = [];
    for (let i = 0; i < WARM_RUNS; i++) warm.push(await call(data.session.access_token, agent));
    agent.destroy();

    const body = JSON.parse(warm[WARM_RUNS - 1].json.toString("utf8"));
    const rowsOk = body.nodes?.length === counts.nodes && body.bits?.length === counts.bits && body.chunks?.length === counts.chunks;
    const times = sorted(warm.map((w) => w.ms));
    const slowest = times[times.length - 1];
    const ok = rowsOk && warm.every((w) => w.status === 200) && slowest <= LIMITS[label];
    if (!ok) fails++;
    console.log(
      `${ok ? "PASS" : "FAIL"} ${label}: nodes ${counts.nodes}, bits ${counts.bits}, chunks ${counts.chunks}, breakdowns ${counts.scratchBreakdowns}, candidates ${counts.stagedCandidates}; ` +
        `cold ${cold.ms.toFixed(0)} ms; warm min ${times[0].toFixed(0)} / median ${times[Math.floor(times.length / 2)].toFixed(0)} / slowest ${slowest.toFixed(0)} ms (limit ${LIMITS[label]}); ` +
        `raw ${mb(warm[0].raw)} MB, transferred ${mb(warm[0].wire)} MB; rows complete: ${rowsOk}`,
    );
  }
} catch (error) {
  console.log(`FAIL ${error.message}`);
  fails++;
} finally {
  if (ids.length) {
    await db.query("delete from auth.users where id = any($1::uuid[])", [ids]).catch((e) => console.log(`FAIL cleanup: ${e.message}`));
    const left = await db.query(
      `select (select count(*) from auth.users where id = any($1::uuid[]))::int
            + (select count(*) from app.accounts where user_id = any($1::uuid[]))::int
            + (select count(*) from app.nodes where user_id = any($1::uuid[]))::int
            + (select count(*) from app.bits where user_id = any($1::uuid[]))::int
            + (select count(*) from app.chunks where user_id = any($1::uuid[]))::int
            + (select count(*) from app.scratch_breakdowns where user_id = any($1::uuid[]))::int
            + (select count(*) from app.staged_candidates where user_id = any($1::uuid[]))::int as n`,
      [ids],
    );
    const clean = left.rows[0].n === 0;
    if (!clean) fails++;
    console.log(`${clean ? "PASS" : "FAIL"} both accounts deleted, ${left.rows[0].n} rows left`);
  }
  await db.end();
}
process.exit(fails ? 1 : 0);
