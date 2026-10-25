// Task 218 (Task 214 review item 4): the exposed API shows nothing of schema `app`.
//  - the REST API refuses `Accept-Profile: app` with PGRST106 (anon and, when possible, authenticated);
//  - the REST OpenAPI document lists no table of ours;
//  - /graphql/v1 introspection shows no type of ours, as `anon` and as `authenticated` (which holds
//    usage on `app` and select on the six tables, so the anon-only answer proves little).
//    pg_graphql is on in hosted Supabase and absent locally, where it is reported as skipped.
// The authenticated part signs in anonymously (anonymous sign-in must be on) and deletes that
// user through the database connection afterwards. Without anonymous sign-in it is skipped.
// Usage: node scripts/verify/api-check.mjs [--local]
import { createClient } from "@supabase/supabase-js";
import { connectDb, target } from "./lib.mjs";

const t = target();
console.log(`api-check: target ${t.name}`);
let fails = 0;
const report = (ok, label, detail = "") => {
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${detail ? ` (${detail})` : ""}`);
};
const info = (message) => console.log(`INFO ${message}`);
// Starts with one of our table names; pg_graphql's built-in `Node` interface does not match.
const OURS = /^(accounts|nodes|bits|chunks|scratch_?breakdowns|staged_?candidates)/i;
const OURS_PATH = /^\/(accounts|nodes|bits|chunks|scratch_?breakdowns|staged_?candidates)/i;

async function checks(who, token) {
  const headers = { apikey: t.publishableKey, Authorization: `Bearer ${token}` };

  const refused = await fetch(`${t.apiUrl}/rest/v1/nodes?select=id`, { headers: { ...headers, "Accept-Profile": "app" } });
  const body = await refused.json().catch(() => ({}));
  report(body.code === "PGRST106", `[${who}] the REST API refuses schema app`, `${refused.status} ${body.code ?? ""}`);

  const open = await fetch(`${t.apiUrl}/rest/v1/`, { headers: { ...headers, Accept: "application/openapi+json" } });
  const doc = await open.json().catch(() => ({}));
  const paths = Object.keys(doc.paths ?? {});
  const ours = paths.filter((p) => OURS_PATH.test(p));
  if (open.status !== 200) info(`[${who}] the REST root answered ${open.status}, so the OpenAPI check says nothing`);
  else report(ours.length === 0, `[${who}] the REST OpenAPI document lists no table of ours`, `${paths.length} paths${ours.length ? `: ${ours.join(", ")}` : ""}`);

  const gql = await fetch(`${t.apiUrl}/graphql/v1`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ query: "{ __schema { types { name } } }" }),
  });
  const g = await gql.json().catch(() => ({}));
  if (gql.status === 404 || g.errors?.some((e) => /not enabled/i.test(e.message))) {
    info(`[${who}] pg_graphql is not available here, skipped`);
    return;
  }
  const names = (g.data?.__schema?.types ?? []).map((x) => x.name);
  const found = names.filter((n) => !n.startsWith("__") && OURS.test(n));
  report(names.length > 0 && found.length === 0, `[${who}] GraphQL introspection shows no type of ours`, `${names.length} types, status ${gql.status}${found.length ? `, found: ${found.join(", ")}` : ""}`);
}

await checks("anon", t.publishableKey);

const client = createClient(t.apiUrl, t.publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
const { data, error } = await client.auth.signInAnonymously();
if (error || !data.session) {
  info(`anonymous sign-in is off (${error?.message ?? "no session"}), the authenticated checks are skipped`);
} else {
  const db = await connectDb(t);
  try {
    await checks("authenticated", data.session.access_token);
  } finally {
    await db.query("delete from auth.users where id = $1", [data.user.id]).catch((e) => console.log(`FAIL cleanup: ${e.message}`));
    const left = await db.query("select count(*)::int as n from auth.users where id = $1", [data.user.id]);
    report(left.rows[0].n === 0, "the temporary anonymous user is deleted");
    await db.end();
  }
}
process.exit(fails ? 1 : 0);
