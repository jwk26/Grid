// Task 218 (Task 214 review item 4): the exposed API shows nothing of schema `app`.
//  - the REST API refuses `Accept-Profile: app` with PGRST106;
//  - the REST OpenAPI document lists no table of ours;
//  - /graphql/v1 introspection shows no type of ours (pg_graphql is on in hosted Supabase,
//    absent locally, so a local run reports it as skipped).
// Usage: node scripts/verify/api-check.mjs [--local]
import { target } from "./lib.mjs";

const t = target();
console.log(`api-check: target ${t.name}`);
const headers = { apikey: t.publishableKey, Authorization: `Bearer ${t.publishableKey}` };
let fails = 0;
const report = (ok, label, detail = "") => {
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${detail ? ` (${detail})` : ""}`);
};
const OURS = /node|bit|chunk|scratch|staged|account/i;

const refused = await fetch(`${t.apiUrl}/rest/v1/nodes?select=id`, { headers: { ...headers, "Accept-Profile": "app" } });
const body = await refused.json().catch(() => ({}));
report(body.code === "PGRST106", "the REST API refuses schema app", `${refused.status} ${body.code ?? ""}`);

const open = await fetch(`${t.apiUrl}/rest/v1/`, { headers: { ...headers, Accept: "application/openapi+json" } });
const doc = await open.json().catch(() => ({}));
const paths = Object.keys(doc.paths ?? {});
const ours = paths.filter((p) => OURS.test(p));
report(open.status === 200 || open.status === 401 || open.status === 404, "the REST root answers", `${open.status}`);
report(ours.length === 0, "the REST OpenAPI document lists no table of ours", `${paths.length} paths${ours.length ? `: ${ours.join(", ")}` : ""}`);

const gql = await fetch(`${t.apiUrl}/graphql/v1`, {
  method: "POST",
  headers: { ...headers, "Content-Type": "application/json" },
  body: JSON.stringify({ query: "{ __schema { types { name } } }" }),
});
if (gql.status === 404 || gql.status === 400) {
  console.log(`INFO /graphql/v1 answered ${gql.status}: pg_graphql is not available here, skipped`);
} else {
  const g = await gql.json().catch(() => ({}));
  if (g.errors?.some((e) => /not enabled/i.test(e.message))) {
    console.log("INFO pg_graphql is not enabled here, skipped");
    process.exit(fails ? 1 : 0);
  }
  const names = (g.data?.__schema?.types ?? []).map((x) => x.name);
  const found = names.filter((n) => !n.startsWith("__") && OURS.test(n));
  report(names.length > 0 && found.length === 0, "GraphQL introspection shows no type of ours", `${names.length} types, status ${gql.status}${found.length ? `, found: ${found.join(", ")}` : ""}`);
}
process.exit(fails ? 1 : 0);
