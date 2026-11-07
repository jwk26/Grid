// Task 260 stage 1: does the hosted API accept a restore-sized rpc body?
// Usage: node scripts/backup-measure/hosted-body-probe.mjs [--local]
// Without --local it reads ~/.config/griddo/production.env (scripts/verify/lib.mjs): the URL and the
// publishable key only. No secret key, no database connection, no change on the target.
//
// It POSTs to rest/v1/rpc/<a function name that does not exist> with the parameter p_payload:
//   control  small body
//   probe    about 10.5 MB (the Task 255 limit-sized export)
//   record   about 21 MB (record only; an account above the row limits can be larger)
// A body of repeated row-shaped objects (not one long string), sent with a fixed Content-Length.
// Pass: 404 PGRST202 whose message names p_payload, so PostgREST read and parsed the whole body.
// Limit: 413. Anything else, a timeout (60 s) included, is inconclusive and only reported.
// Output: label, size, status, code and whether the message names p_payload. The URL is masked.
import { target } from "../verify/lib.mjs";

const FUNCTION_NAME = "restore_stage_probe_does_not_exist";
const TIMEOUT_MS = 60_000;

function rowShaped(targetBytes) {
  const row = () => ({
    id: crypto.randomUUID(),
    user_id: crypto.randomUUID(),
    title: Array.from({ length: 6 }, () => crypto.randomUUID()).join("-"),
    description: Array.from({ length: 12 }, () => crypto.randomUUID()).join(" "),
    version: 1,
    mtime: Date.now(),
  });
  const rows = [];
  let size = 0;
  while (size < targetBytes) {
    const r = row();
    rows.push(r);
    size += JSON.stringify(r).length + 1;
  }
  return Buffer.from(JSON.stringify({ p_payload: { format_version: 1, nodes: rows } }), "utf8");
}

async function post(t, body) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${t.apiUrl}/rest/v1/rpc/${FUNCTION_NAME}`, {
      method: "POST",
      headers: {
        apikey: t.publishableKey,
        "Content-Type": "application/json",
        "Content-Length": String(body.length),
      },
      body,
      signal: ctl.signal,
    });
    let code = "";
    let namesParam = false;
    try {
      const json = JSON.parse(await res.text());
      code = String(json.code ?? "");
      namesParam = `${json.message ?? ""} ${json.hint ?? ""}`.includes("p_payload");
    } catch {
      /* not JSON */
    }
    return { status: res.status, code, namesParam };
  } catch (error) {
    return { status: 0, code: error?.name === "AbortError" ? "timeout" : "network", namesParam: false };
  } finally {
    clearTimeout(timer);
  }
}

const t = target();
console.log(`target: ${t.name} (${t.apiUrl.replace(/\/\/[^.]+/, "//***")})`);
let verdict = "pass";
for (const [label, bytes, decides] of [
  ["control", 1_000, false],
  ["probe  ", 10_500_000, true],
  ["record ", 21_000_000, false],
]) {
  const body = rowShaped(bytes);
  const r = await post(t, body);
  console.log(`${label} size=${body.length} status=${r.status} code=${r.code || "-"} names_p_payload=${r.namesParam}`);
  const ok = r.status === 404 && r.code === "PGRST202" && r.namesParam;
  if (label.trim() === "control" && !ok) {
    verdict = "inconclusive (the control body was not answered with PGRST202)";
    break;
  }
  if (decides) {
    if (r.status === 413) verdict = "limit (413): stage per table";
    else if (!ok) verdict = "inconclusive";
  }
}
console.log(`result: ${verdict}`);
