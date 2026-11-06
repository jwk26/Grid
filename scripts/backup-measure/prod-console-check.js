// Task 259 step 6: the JWT modes of the deployed backup function, from the production site's browser
// console, signed in as the owner. NOT run in Node: paste it into the console of the production page
// (Chrome asks you to type `allow pasting` first).
//
// What it proves, which no local run could: the browser's CORS preflight against the hosted gateway
// (the function answers it itself), `getClaims` through the JWKS path, and the function's own
// `SUPABASE_ANON_KEY`. It calls `manual` once and `status` once, the two modes the Backup dialog uses.
//
// The access token is read from this page's own localStorage and goes only to the function's URL in
// an Authorization header. It is never printed, stored or sent anywhere else. Printed: the HTTP
// status, the function's JSON answer (the owner's own backup status: times, a result, no secret) and
// whether the browser could read the answer at all.
//
// Side effect, on purpose: `manual` makes the owner's first real backup (one object and identity.json
// under accounts/<id>/ in the production bucket). A second run within the rate limit answers
// `rate_limited`, which still proves the path.
(async () => {
  const REF = "mlgfznjcgtrhfpntsavr";
  const FN_URL = `https://${REF}.supabase.co/functions/v1/backup`;
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
    console.log("ABORT: this is a local page; open the production site and paste again");
    return;
  }
  // supabase-js keeps the session under sb-<project ref>-auth-token (the default storage key).
  const key = Object.keys(localStorage).find((k) => k.startsWith("sb-") && k.endsWith("-auth-token") && k.includes(REF));
  if (!key) {
    console.log("ABORT: no session for this project in localStorage (sign in on this page first)");
    return;
  }
  let token;
  try {
    token = JSON.parse(localStorage.getItem(key)).access_token;
  } catch {
    token = null;
  }
  if (typeof token !== "string" || token.split(".").length !== 3) {
    console.log("ABORT: the stored session has no access token (reload the page, or sign in again)");
    return;
  }
  const call = async (label, body) => {
    const t0 = performance.now();
    try {
      // The headers the app's client sends to a function (apikey is added by the client there and is
      // in the function's allow list; the function does not need it): Authorization and Content-Type
      // make the browser send a preflight.
      const res = await fetch(FN_URL, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json", "x-client-info": "console-check" },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      let json = null;
      try {
        json = JSON.parse(text);
      } catch {
        // not JSON: printed as text below
      }
      console.log(`${label}: HTTP ${res.status} in ${(performance.now() - t0).toFixed(0)} ms`, json ?? text.slice(0, 300));
      return json;
    } catch (e) {
      // A fetch that fails before any answer is what a missing CORS header looks like to a page.
      console.log(`${label}: NO ANSWER (${e.name}: ${e.message}): the preflight or the network failed`);
      return null;
    }
  };
  const runId = crypto.randomUUID();
  console.log(`origin ${location.origin}, run ${runId}`);
  const manual = await call("manual", { mode: "manual", run_id: runId });
  const status = await call("status", { mode: "status", run_id: runId });
  const ok =
    manual?.status === "applied" || manual?.status === "rejected"
      ? status?.status === "applied"
      : false;
  console.log(
    ok
      ? "RESULT: both modes answered through the browser (the JWT, CORS and key paths work); read the two answers above"
      : "RESULT: not as expected; copy the lines above (they hold no token) and tell the working session",
  );
})();
