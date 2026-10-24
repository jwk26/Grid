// Runs hosted-roles.sql (it ends in ROLLBACK) and then checks that nothing was left behind.
// Usage: node scripts/verify/hosted-roles.mjs [--local]
import { readFileSync } from "node:fs";
import { collectNotices, connectDb, target } from "./lib.mjs";

const t = target();
console.log(`hosted-roles: target ${t.name}`);
const sql = readFileSync(new URL("./hosted-roles.sql", import.meta.url), "utf8");
const db = await connectDb(t);
const state = collectNotices(db);
let code = 0;
try {
  await db.query(sql);
} catch (error) {
  console.log(`FAIL the script stopped: ${error.message}`);
  state.fails++;
  await db.query("rollback").catch(() => undefined);
  code = 1;
}
const left = await db.query(
  `select (select count(*) from auth.users where email like 'hosted-roles-%@probe.invalid')::int as users,
          (select count(*) from pg_roles where rolname = 'griddo_delete_probe')::int as roles,
          (select count(*) from pg_proc where proname = 'probe_delete_me')::int as functions`,
);
const { users, roles, functions } = left.rows[0];
const clean = users === 0 && roles === 0 && functions === 0;
console.log(`${clean ? "PASS" : "FAIL"} nothing left behind (probe users ${users}, roles ${roles}, functions ${functions})`);
await db.end();
if (state.fails > 0 || !clean) code = 1;
console.log(code === 0 ? "hosted-roles: all checks passed" : `hosted-roles: ${state.fails} failed check(s)`);
process.exit(code);
