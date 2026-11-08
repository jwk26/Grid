// Task 264 (Stage 1 review item 1): the database-time verdict of prod-restore-measure.mjs. Pure.
// pg_stat_statements totals before and after one restore: the mean time of the calls in between. On a hosted
// target the verdict is "unproven" (a FAIL) when the totals could not be read or when either function's call
// count did not rise by at least one; locally an unreadable total is allowed, as before.
export type StatTotals = { stage_calls: number; stage_ms: number; acct_calls: number; acct_ms: number };
export type DbTime =
  | { kind: "measured"; stageMs: number; acctMs: number; ok: boolean }
  | { kind: "unproven"; reason: "unreadable" | "no_calls"; ok: boolean };

export function judgeDbTime(before: StatTotals | null, after: StatTotals | null, hosted: boolean, limitMs: number): DbTime {
  if (!before || !after) return { kind: "unproven", reason: "unreadable", ok: !hosted };
  const stageCalls = after.stage_calls - before.stage_calls;
  const acctCalls = after.acct_calls - before.acct_calls;
  if (stageCalls < 1 || acctCalls < 1) return { kind: "unproven", reason: "no_calls", ok: false };
  const stageMs = (after.stage_ms - before.stage_ms) / stageCalls;
  const acctMs = (after.acct_ms - before.acct_ms) / acctCalls;
  return { kind: "measured", stageMs, acctMs, ok: acctMs < limitMs };
}
