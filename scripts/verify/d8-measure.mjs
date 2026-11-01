// Task 218, D8: load time and size of the account snapshot for a limit-sized and a one-tenth
// account, through the HTTPS API with gzip, as a signed-in anonymous user (anonymous sign-in
// must be on for the measurement only). Per account: one cold call (new TLS connection) and
// 5 warm calls; judged on the slowest of all six calls, the cold one included (limit-sized <= 3000 ms,
// one-tenth <= 1000 ms). The tables are analyzed after the account is built and before the calls, and
// after each call get_snapshot() runs again under EXPLAIN ANALYZE as the same user, so the server time
// sits beside the call time; call time minus server time is network plus API (gateway, TLS, gzip), not
// network alone.
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

const TABLES = ["accounts", "nodes", "bits", "chunks", "scratch_breakdowns", "staged_candidates"];

// Server time of get_snapshot() for one user, as `authenticated` with the JWT claims (the
// hosted-roles.sql pattern). EXPLAIN ANALYZE inside a transaction that ends in ROLLBACK.
async function serverMs(db, userId) {
  await db.query("begin");
  try {
    await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ role: "authenticated", sub: userId })]);
    await db.query("set local role authenticated");
    const r = await db.query("explain (analyze, format json) select public.get_snapshot()");
    return r.rows[0]["QUERY PLAN"][0]["Execution Time"];
  } finally {
    await db.query("rollback");
  }
}

const sorted = (a) => [...a].sort((x, y) => x - y);
const pair = (c) => `${c.ms.toFixed(0)}/${c.server.toFixed(0)}`;
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

    for (const table of TABLES) await db.query(`analyze app.${table}`);

    const agent = new (url.protocol === "https:" ? Agent : HttpAgent)({ keepAlive: true, maxSockets: 1 });
    const cold = await call(data.session.access_token, agent);
    cold.server = await serverMs(db, userId);
    const warm = [];
    for (let i = 0; i < WARM_RUNS; i++) {
      const w = await call(data.session.access_token, agent);
      w.server = await serverMs(db, userId);
      warm.push(w);
    }
    agent.destroy();

    const body = JSON.parse(warm[WARM_RUNS - 1].json.toString("utf8"));
    const rowsOk = body.nodes?.length === counts.nodes && body.bits?.length === counts.bits && body.chunks?.length === counts.chunks;
    const all = [cold, ...warm];
    const times = sorted(warm.map((w) => w.ms));
    const slowest = Math.max(...all.map((c) => c.ms));
    const ok = rowsOk && all.every((c) => c.status === 200) && slowest <= LIMITS[label];
    if (!ok) fails++;
    console.log(
      `${ok ? "PASS" : "FAIL"} ${label}: nodes ${counts.nodes}, bits ${counts.bits}, chunks ${counts.chunks}, breakdowns ${counts.scratchBreakdowns}, candidates ${counts.stagedCandidates}; ` +
        `cold ${cold.ms.toFixed(0)} ms; warm min ${times[0].toFixed(0)} / median ${times[Math.floor(times.length / 2)].toFixed(0)} ms; slowest of all ${slowest.toFixed(0)} ms (limit ${LIMITS[label]}); ` +
        `pairs call/server ms (network+API = difference): cold ${pair(cold)}, warm ${warm.map(pair).join(", ")}; ` +
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
