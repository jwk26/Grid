// The daily summary's ping (DECISION §Failure alerts). Counts and the function's own codes only:
// never an account id, an email or a per-account reason.

export type SummaryCounts = {
  new_failures: number;
  failing: number;
  missing: number;
  over_limit: boolean; // true only on the first summary above 8 GB
  deletion_overdue: number; // r2_deletions rows older than three days
};

export type PingDecision = { ok: boolean; codes: string[]; body: string };

export const DELETION_OVERDUE_MS = 3 * 24 * 3_600_000;

/** Number of due `r2_deletions` rows whose `requested_at` is older than three days at `nowMs`. */
export function countOverdue(rows: { requested_at: number }[], nowMs: number): number {
  return rows.filter((r) => nowMs - r.requested_at > DELETION_OVERDUE_MS).length;
}

/**
 * Success when nothing new appears: a failing account already counted, a total already over the limit
 * and a permanently failing account never turn the ping into `/fail`. New failures, newly missing accounts,
 * the first summary above 8 GB and an overdue deletion do.
 */
export function judgeSummary(c: SummaryCounts): PingDecision {
  const codes: string[] = [];
  if (c.new_failures > 0) codes.push("new_failure");
  if (c.missing > 0) codes.push("missing");
  if (c.over_limit) codes.push("over_limit");
  if (c.deletion_overdue > 0) codes.push("deletion_overdue");
  const body =
    `new_failures=${c.new_failures} failing=${c.failing} missing=${c.missing} ` +
    `over_limit=${c.over_limit ? 1 : 0} deletion_overdue=${c.deletion_overdue}` +
    (codes.length > 0 ? ` codes=${codes.join(",")}` : "");
  return { ok: codes.length === 0, codes, body };
}
