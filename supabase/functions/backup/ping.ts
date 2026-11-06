import { SafeError } from "../_shared/safe-error.ts";
import type { PingDecision } from "../_shared/summary-ping.ts";

// The Healthchecks.io ping of the daily summary: success on the check's URL, `/fail` on the same
// URL with `/fail` appended. The URL is a secret (a leaked URL can fake a success ping and reach no
// data): it is never logged or answered. The body is the decision's counts and codes only.

const PING_TIMEOUT_MS = 10_000;

export async function sendPing(decision: PingDecision): Promise<boolean> {
  const base = Deno.env.get("HEALTHCHECKS_DAILY_PING_URL");
  if (!base || base.startsWith("env(")) {
    console.error("HEALTHCHECKS_DAILY_PING_URL is not set");
    return false;
  }
  const url = decision.ok ? base.replace(/\/$/, "") : `${base.replace(/\/$/, "")}/fail`;
  const res = await fetch(url, {
    method: "POST",
    body: decision.body,
    headers: { "content-type": "text/plain" },
    signal: AbortSignal.timeout(PING_TIMEOUT_MS),
  });
  await res.arrayBuffer();
  if (!res.ok) throw new SafeError(`ping_${res.status}`);
  return true;
}
