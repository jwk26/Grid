// The daily summary (DECISION §Failure alerts, §Deleting R2 objects). Pure orchestration over
// dependencies, like run.ts: no `npm:`, `Deno.*` or `node:` import here.

import { accountPrefix } from "./object-key.ts";
import { logCode } from "./safe-error.ts";
import { countOverdue, failedStepDecision, judgeSummary, type PingDecision } from "./summary-ping.ts";

export type SummaryAnswer = {
  new_failures: number;
  failing: number;
  missing: number;
  over_limit: boolean;
  stored_bytes: number;
};

export type DueDeletion = { user_id: string; attempts: number; requested_at: number };

export type SummaryDeps = {
  now(): Date;
  /** `backup_summary(p_missing, p_as_of)`: records stale starts, counts the new problems. */
  summary(missing: number, asOf: number): Promise<SummaryAnswer>;
  dueDeletions(): Promise<DueDeletion[]>;
  deletionDone(userId: string): Promise<void>;
  deletionFailed(userId: string): Promise<void>;
  /** Every key under the prefix, across list pages. */
  listKeys(prefix: string): Promise<string[]>;
  remove(keys: string[]): Promise<void>;
  /** Sends the ping; false when it could not be sent (no URL, network). */
  ping(decision: PingDecision): Promise<boolean>;
  log(message: string): void;
};

export type SummaryOutcome = {
  decision: PingDecision;
  pinged: boolean;
  deleted: number;
  deletionFailures: number;
};

/**
 * Deletes everything under `accounts/<user id>/` for each due `r2_deletions` row and then the row.
 * A row is done only after a fresh list under the prefix comes back empty. Only rows in the list
 * are touched, never a key because its account is gone (after a recovery every old key has none).
 */
async function processDeletions(deps: SummaryDeps, now: number) {
  let deleted = 0;
  const stillDue: DueDeletion[] = [];
  const due = await deps.dueDeletions();
  for (const row of due) {
    try {
      const prefix = accountPrefix(row.user_id);
      const keys = await deps.listKeys(prefix);
      for (let i = 0; i < keys.length; i += 1000) await deps.remove(keys.slice(i, i + 1000));
      if ((await deps.listKeys(prefix)).length > 0) throw new Error("not_empty");
      await deps.deletionDone(row.user_id);
      deleted++;
    } catch (error) {
      deps.log(`deletion failed: ${logCode(error)}`);
      stillDue.push(row);
      try {
        await deps.deletionFailed(row.user_id);
      } catch (inner) {
        deps.log(`deletion bookkeeping failed: ${logCode(inner)}`);
      }
    }
  }
  return { deleted, stillDue, overdue: countOverdue(stillDue, now) };
}

export async function runSummary(deps: SummaryDeps, input: { missing: number; asOf: number }): Promise<SummaryOutcome> {
  // A step that fails sends `/fail` at once, so the owner is not left to the missing-ping rule (about
  // 27 hours later), and the error still reaches the caller.
  const failStep = async (
    code: "summary_failed" | "deletion_check_failed",
    error: unknown,
    counts?: SummaryAnswer,
  ): Promise<never> => {
    deps.log(`${code}: ${logCode(error)}`);
    try {
      await deps.ping(failedStepDecision(code, counts && { ...counts, deletion_overdue: 0 }));
    } catch (inner) {
      deps.log(`ping failed: ${logCode(inner)}`);
    }
    throw error;
  };
  let answer: SummaryAnswer;
  try {
    answer = await deps.summary(input.missing, input.asOf);
  } catch (error) {
    return await failStep("summary_failed", error);
  }
  let processed: Awaited<ReturnType<typeof processDeletions>>;
  try {
    processed = await processDeletions(deps, deps.now().getTime());
  } catch (error) {
    return await failStep("deletion_check_failed", error, answer);
  }
  const { deleted, stillDue, overdue } = processed;
  const decision = judgeSummary({
    new_failures: answer.new_failures,
    failing: answer.failing,
    missing: answer.missing,
    over_limit: answer.over_limit,
    deletion_overdue: overdue,
  });
  let pinged = false;
  try {
    pinged = await deps.ping(decision);
  } catch (error) {
    deps.log(`ping failed: ${logCode(error)}`);
  }
  return { decision, pinged, deleted, deletionFailures: stillDue.length };
}
