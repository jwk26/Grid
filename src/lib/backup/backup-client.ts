import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from "@supabase/supabase-js";
import { isNoAnswerStatus } from "@edge-shared/response";
import { EDGE_REQUEST_TIMEOUT_MS, REQUEST_TIMEOUT_MS } from "@/lib/constants";
import { parseBackupValue, type BackupValue } from "@/lib/backup/backup-slot";
import type { GriddoSupabaseClient } from "@/lib/db/supabase-client";

// The one caller of the backup Edge Function (SPEC Architecture Decision 2, §Account backup): status
// and `Back Up Now`, through `functions.invoke` on the shared client so the user's JWT is attached.
// It sits outside `DataStore` and follows the same never-resend rule: a request with no answer is an
// unknown outcome, decided by one status read for the run id (SCHEMA §Operation verdicts).

export type ManualOutcome =
  | { kind: "result"; result: "written" | "unchanged" | "failed" | "abandoned"; reason: string | null; backup: BackupValue | null | undefined }
  | { kind: "rejected"; code: "rate_limited" | "already_running" }
  // The request was answered and the backup did not start: any other refusal, rejection or status.
  | { kind: "refused" }
  // No answer: never resent; the caller reads the run's verdict once.
  | { kind: "unknown" };

export type StatusOutcome =
  | { kind: "ok"; backup: BackupValue | null | undefined; verdict: string | null }
  | { kind: "failed" };

/**
 * Development injections at this boundary (SPEC §Development state switch). A boundary injection is
 * consumed by the next matching call, so the real recovery path runs end to end.
 */
export type BackupInjection = "unknown-before-send" | "unknown-after-send" | "status-failed";

export type BackupClientOptions = {
  getClient: () => GriddoSupabaseClient;
  /** Development only: the injection for the next call of `operation`, or null. */
  takeInjection?: (operation: "manual" | "status") => BackupInjection | null;
  edgeTimeoutMs?: number;
  statusTimeoutMs?: number;
};

const FUNCTION_NAME = "backup";
// Development injection only: how long a dropped answer waits for the request to reach the database.
const INJECTED_SETTLE_MS = 1000;
// 408 is a request timeout (SPEC §Write feel); the platform set covers 500, 502, 503, 504 and 546.
const isNoAnswer = (status: number) => status === 408 || isNoAnswerStatus(status);

type Invoked = { kind: "answer"; body: unknown } | { kind: "http"; status: number } | { kind: "none" };

async function invoke(
  client: GriddoSupabaseClient,
  body: Record<string, unknown>,
  timeoutMs: number,
): Promise<Invoked> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const { data, error } = await client.functions.invoke(FUNCTION_NAME, { body, signal: controller.signal });
    if (error) {
      if (error instanceof FunctionsHttpError) {
        const status = (error.context as { status?: unknown } | undefined)?.status;
        return typeof status === "number" ? { kind: "http", status } : { kind: "none" };
      }
      // A fetch failure (an abort included), a relay error or anything else: no answer.
      if (error instanceof FunctionsFetchError || error instanceof FunctionsRelayError) return { kind: "none" };
      return { kind: "none" };
    }
    return { kind: "answer", body: data };
  } catch {
    return { kind: "none" };
  } finally {
    clearTimeout(timer);
  }
}

const record = (v: unknown): Record<string, unknown> | null =>
  typeof v === "object" && v !== null ? (v as Record<string, unknown>) : null;

export function createBackupClient(options: BackupClientOptions) {
  const edgeTimeoutMs = options.edgeTimeoutMs ?? EDGE_REQUEST_TIMEOUT_MS;
  const statusTimeoutMs = options.statusTimeoutMs ?? REQUEST_TIMEOUT_MS;

  return {
    /** `Back Up Now`. Never resent: a call that gets no answer is `unknown`. */
    async backUpNow(runId: string): Promise<ManualOutcome> {
      const injection = options.takeInjection?.("manual") ?? null;
      if (injection === "unknown-before-send") return { kind: "unknown" };
      if (injection === "unknown-after-send") {
        // Sent, but its answer is dropped: the request runs on and the caller does not wait for it,
        // so the verdict read can see the run still open (`Still finishing…`). One request leaves.
        // A short settle first: a verdict read that overtakes the request's first database call
        // would answer `not_started` for a run that then starts (Task 258 browser check).
        void invoke(options.getClient(), { mode: "manual", run_id: runId }, edgeTimeoutMs);
        await new Promise((resolve) => setTimeout(resolve, INJECTED_SETTLE_MS));
        return { kind: "unknown" };
      }
      const got = await invoke(options.getClient(), { mode: "manual", run_id: runId }, edgeTimeoutMs);
      if (got.kind === "none") return { kind: "unknown" };
      if (got.kind === "http") return isNoAnswer(got.status) ? { kind: "unknown" } : { kind: "refused" };

      const body = record(got.body);
      // A 200 whose body cannot be read is no answer: the run may have finished.
      if (!body) return { kind: "unknown" };
      if (body.status === "rejected") {
        const code = record(body.rejection)?.code;
        return code === "rate_limited" || code === "already_running" ? { kind: "rejected", code } : { kind: "refused" };
      }
      if (body.status === "applied") {
        const result = record(body.result);
        const outcome = result?.result;
        if (outcome !== "written" && outcome !== "unchanged" && outcome !== "failed" && outcome !== "abandoned") {
          return { kind: "unknown" };
        }
        return {
          kind: "result",
          result: outcome,
          reason: typeof result?.reason === "string" ? result.reason : null,
          backup: "backup" in body ? parseBackupValue(body.backup) : undefined,
        };
      }
      // `unconfirmed`, `refused` or anything else on a 200: read the verdict.
      return { kind: "unknown" };
    },

    /** The status read: `runId` null for the dialog's read, a run id for a verdict. */
    async readStatus(runId: string | null): Promise<StatusOutcome> {
      if (options.takeInjection?.("status") === "status-failed") return { kind: "failed" };
      const got = await invoke(options.getClient(), { mode: "status", run_id: runId }, statusTimeoutMs);
      if (got.kind !== "answer") return { kind: "failed" };
      const body = record(got.body);
      const result = record(body?.result);
      if (body?.status !== "applied" || !result) return { kind: "failed" };
      const backup = parseBackupValue(result.backup);
      const verdict = typeof result.verdict === "string" ? result.verdict : null;
      return { kind: "ok", backup, verdict };
    },
  };
}

export type BackupClient = ReturnType<typeof createBackupClient>;
