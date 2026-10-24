// Task 218: can pg_cron run a job that deletes an anonymous auth user (the guest-cleanup path,
// S22), with the cascade removing the account row? It commits, so it cleans up in `finally`:
// the job is unscheduled, the temporary user is deleted, and pg_cron is dropped again when this
// script enabled it (Task 238's migration enables it).
// Usage: node scripts/verify/pg-cron-check.mjs [--local]
import { randomUUID } from "node:crypto";
import { connectDb, target } from "./lib.mjs";

const t = target();
console.log(`pg-cron-check: target ${t.name}`);
const db = await connectDb(t);
const userId = randomUUID();
const jobName = "griddo-verify-218";
let weCreated = false;
let scheduled = false;
let result = "UNKNOWN";
try {
  const had = await db.query("select 1 from pg_extension where extname = 'pg_cron'");
  if (!had.rowCount) {
    const avail = await db.query("select 1 from pg_available_extensions where name = 'pg_cron'");
    if (!avail.rowCount) {
      result = "UNAVAILABLE (pg_cron is not offered here)";
      throw new Error("pg_cron is not available");
    }
    await db.query("create extension pg_cron");
    weCreated = true;
  }
  console.log(`INFO pg_cron enabled (was already on: ${had.rowCount > 0})`);

  await db.query(
    "insert into auth.users (id, aud, role, email, is_anonymous, created_at, updated_at) values ($1, 'authenticated', 'authenticated', null, true, now(), now())",
    [userId],
  );
  await db.query("insert into app.accounts (user_id, created_at, last_visit_at) values ($1, 1, 1)", [userId]);

  const command = `delete from auth.users where id = '${userId}' and is_anonymous`;
  let schedule = "5 seconds";
  let jobId;
  try {
    jobId = (await db.query("select cron.schedule($1, $2, $3) as id", [jobName, schedule, command])).rows[0].id;
  } catch {
    schedule = "* * * * *";
    jobId = (await db.query("select cron.schedule($1, $2, $3) as id", [jobName, schedule, command])).rows[0].id;
  }
  scheduled = true;
  console.log(`INFO job ${jobId} scheduled (${schedule})`);

  const deadline = Date.now() + 150_000;
  let run;
  while (Date.now() < deadline) {
    run = (await db.query("select status, return_message from cron.job_run_details where jobid = $1 order by runid desc limit 1", [jobId])).rows[0];
    if (run && run.status !== "running" && run.status !== "starting") break;
    await new Promise((r) => setTimeout(r, 3000));
  }
  const user = await db.query("select count(*)::int as n from auth.users where id = $1", [userId]);
  const account = await db.query("select count(*)::int as n from app.accounts where user_id = $1", [userId]);
  const ok = run?.status === "succeeded" && user.rows[0].n === 0 && account.rows[0].n === 0;
  console.log(`${ok ? "PASS" : "FAIL"} the job deleted the anonymous user and the cascade removed the account row (run: ${run?.status ?? "no run"}, user rows ${user.rows[0].n}, account rows ${account.rows[0].n})`);
  result = ok ? "AVAILABLE" : "NOT WORKING (S22 fallback: scheduled GitHub Actions call)";
} catch (error) {
  console.log(`INFO ${error.message}`);
  if (result === "UNKNOWN") result = `ERROR (${error.message})`;
} finally {
  if (scheduled) await db.query("select cron.unschedule($1)", [jobName]).catch((e) => console.log(`FAIL could not unschedule: ${e.message}`));
  await db.query("delete from auth.users where id = $1", [userId]).catch(() => undefined);
  if (weCreated) await db.query("drop extension pg_cron").catch((e) => console.log(`FAIL could not drop pg_cron: ${e.message}`));
  const left = await db.query("select count(*)::int as n from auth.users where id = $1", [userId]);
  console.log(`${left.rows[0].n === 0 ? "PASS" : "FAIL"} no temporary user left`);
  await db.end();
}
console.log(`RESULT pg_cron: ${result}`);
process.exit(result === "AVAILABLE" ? 0 : 1);
