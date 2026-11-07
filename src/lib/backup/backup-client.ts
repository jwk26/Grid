import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from "@supabase/supabase-js";
import { isNoAnswerStatus } from "@edge-shared/response";
import { EDGE_REQUEST_TIMEOUT_MS, REQUEST_TIMEOUT_MS } from "@/lib/constants";
import { createSseParser } from "@/lib/backup/sse-parser";
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

/** One entry of the restore list (SCHEMA §Account backup, Restore): `at` is epoch ms. */
export type BackupEntry = {
  /** `YYYY-MM-DD` for a daily file, `pre-restore/<UTC time>` for a pre-restore file. */
  name: string;
  kind: "daily" | "pre_restore";
  at: number;
  size: number;
  /** What the restore request sends back; null means the entry cannot be restored. */
  etag: string | null;
};

export type StatusOutcome =
  | {
      kind: "ok";
      backup: BackupValue | null | undefined;
      verdict: string | null;
      /** The list on a plain read: `null` when the storage listing failed, `undefined` when absent. */
      backups?: BackupEntry[] | null;
    }
  | { kind: "failed" };

export type RestoreStep = "saving" | "getting" | "applying";
export const RESTORE_STEPS: readonly RestoreStep[] = ["saving", "getting", "applying"];

/** How a restore request ended (SPEC §Account backup, Restore). `unknown` is read by verdict, never resent. */
export type RestoreOutcome =
  | { kind: "applied" }
  | { kind: "account_changed" }
  | { kind: "unsupported_format" }
  // `rate_limited` and `already_running` both read `Try again in a few minutes.`
  | { kind: "rate_limited" }
  // A not-applied result, any other rejection, or an answered refusal: nothing changed.
  | { kind: "not_applied" }
  | { kind: "unknown" };

export type RestoreRequest = { restoreId: string; file: string; etag: string; onStep: (step: RestoreStep) => void };

/**
 * Development injections at this boundary (SPEC §Development state switch). A boundary injection is
 * consumed by the next matching call, so the real recovery path runs end to end.
 */
export type BackupInjection =
  | "unknown-before-send"
  | "unknown-after-send"
  | "status-failed"
  | "restore-unknown-before-send"
  | "restore-unknown-after-send";

export type BackupClientOptions = {
  getClient: () => GriddoSupabaseClient;
  /** Development only: the injection for the next call of `operation`, or null. */
  takeInjection?: (operation: "manual" | "status" | "restore") => BackupInjection | null;
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

// The access token must outlive the function's call of `restore_account()`, up to about 140 s after
// the request starts (Task 261): a token expiring within 3 minutes is refreshed first.
const TOKEN_MARGIN_MS = 3 * 60 * 1000;

const record = (v: unknown): Record<string, unknown> | null =>
  typeof v === "object" && v !== null ? (v as Record<string, unknown>) : null;

function parseEntries(raw: unknown): BackupEntry[] | null | undefined {
  if (raw === null) return null;
  if (!Array.isArray(raw)) return undefined;
  const out: BackupEntry[] = [];
  for (const item of raw) {
    const r = record(item);
    if (!r || typeof r.name !== "string" || (r.kind !== "daily" && r.kind !== "pre_restore")) continue;
    if (typeof r.at !== "number" || !Number.isFinite(r.at)) continue;
    out.push({
      name: r.name,
      kind: r.kind,
      at: r.at,
      size: typeof r.size === "number" ? r.size : 0,
      etag: typeof r.etag === "string" && r.etag !== "" ? r.etag : null,
    });
  }
  return out;
}

// The result vocabulary of the stream's `result` event and of a JSON refusal (SCHEMA).
function restoreOutcomeOf(body: unknown): RestoreOutcome {
  const b = record(body);
  if (!b) return { kind: "unknown" };
  if (b.status === "applied") return { kind: "applied" };
  if (b.status === "not_applied") return { kind: "not_applied" };
  if (b.status === "rejected") {
    const code = record(b.rejection)?.code;
    if (code === "account_changed") return { kind: "account_changed" };
    if (code === "unsupported_format") return { kind: "unsupported_format" };
    if (code === "rate_limited" || code === "already_running") return { kind: "rate_limited" };
    return { kind: "not_applied" };
  }
  // `unconfirmed` or anything else: the function could not settle it.
  return { kind: "unknown" };
}

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
      const backups = "backups" in result ? parseEntries(result.backups) : undefined;
      return { kind: "ok", backup, verdict, ...(backups !== undefined ? { backups } : {}) };
    },

    /** One verdict read for a restore id; read-only, calls no storage. */
    async readRestoreVerdict(restoreId: string): Promise<{ kind: "ok"; verdict: string | null } | { kind: "failed" }> {
      if (options.takeInjection?.("status") === "status-failed") return { kind: "failed" };
      const got = await invoke(options.getClient(), { mode: "status", restore_id: restoreId }, statusTimeoutMs);
      if (got.kind !== "answer") return { kind: "failed" };
      const body = record(got.body);
      const result = record(body?.result);
      if (body?.status !== "applied" || !result) return { kind: "failed" };
      return { kind: "ok", verdict: typeof result.restore_verdict === "string" ? result.restore_verdict : null };
    },

    /**
     * Makes sure the session outlives a restore: refreshes it when the access token expires within
     * 3 minutes. A failure means nothing may be sent. Returns the signed-in user id.
     */
    async ensureFreshSession(): Promise<{ ok: true; userId: string } | { ok: false }> {
      try {
        const auth = options.getClient().auth;
        const work = (async (): Promise<{ ok: true; userId: string } | { ok: false }> => {
          const { data, error } = await auth.getSession();
          if (error || !data.session) return { ok: false };
          const expiresAtMs = (data.session.expires_at ?? 0) * 1000;
          if (expiresAtMs - Date.now() >= TOKEN_MARGIN_MS) return { ok: true, userId: data.session.user.id };
          const refreshed = await auth.refreshSession();
          if (refreshed.error || !refreshed.data.session) return { ok: false };
          return { ok: true, userId: refreshed.data.session.user.id };
        })();
        let timer: ReturnType<typeof setTimeout> | undefined;
        const timedOut = new Promise<{ ok: false }>((resolve) => {
          timer = setTimeout(() => resolve({ ok: false }), statusTimeoutMs);
        });
        return await Promise.race([work, timedOut]).finally(() => clearTimeout(timer));
      } catch {
        return { ok: false };
      }
    },

    /**
     * A restore. Never resent. The client's own deadline runs from before the request and covers
     * reading the stream: `functions.invoke` hands back the unread `Response` for an event stream,
     * so the timer is cleared only at the `result` event or the stream's end.
     */
    async restore(request: RestoreRequest): Promise<RestoreOutcome> {
      const injection = options.takeInjection?.("restore") ?? null;
      const body = { mode: "restore", restore_id: request.restoreId, file: request.file, etag: request.etag };
      if (injection === "restore-unknown-before-send") return { kind: "unknown" };
      if (injection === "restore-unknown-after-send") {
        // Sent, its answer dropped: the request runs on, one request leaves, and a short settle keeps
        // the verdict read behind the request's first database call (Task 258 lesson).
        void invoke(options.getClient(), body, edgeTimeoutMs);
        await new Promise((resolve) => setTimeout(resolve, INJECTED_SETTLE_MS));
        return { kind: "unknown" };
      }

      const aborter = new AbortController();
      const timer = setTimeout(() => aborter.abort(), edgeTimeoutMs);
      const aborted = new Promise<"aborted">((resolve) =>
        aborter.signal.addEventListener("abort", () => resolve("aborted"), { once: true }),
      );
      try {
        const { data, error } = await options.getClient().functions.invoke(FUNCTION_NAME, { body, signal: aborter.signal });
        if (error) {
          if (error instanceof FunctionsHttpError) {
            const status = (error.context as { status?: unknown } | undefined)?.status;
            if (typeof status !== "number" || isNoAnswer(status)) return { kind: "unknown" };
            return { kind: "not_applied" };
          }
          return { kind: "unknown" };
        }
        // A JSON body is a refusal before anything was staged; a `Response` is the event stream.
        if (!(data instanceof Response)) return restoreOutcomeOf(data);
        const reader = data.body?.getReader();
        if (!reader) return { kind: "unknown" };
        const decoder = new TextDecoder();
        const parser = createSseParser();
        try {
          for (;;) {
            const next = await Promise.race([reader.read(), aborted]);
            if (next === "aborted") return { kind: "unknown" };
            if (next.done) return { kind: "unknown" };
            for (const event of parser.push(decoder.decode(next.value, { stream: true }))) {
              let parsed: unknown;
              try {
                parsed = JSON.parse(event.data);
              } catch {
                continue;
              }
              if (event.event === "step") {
                const step = record(parsed)?.step;
                if (step === "saving" || step === "getting" || step === "applying") request.onStep(step);
              } else if (event.event === "result") {
                return restoreOutcomeOf(parsed);
              }
            }
          }
        } finally {
          void reader.cancel().catch(() => undefined);
        }
      } catch {
        return { kind: "unknown" };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

export type BackupClient = ReturnType<typeof createBackupClient>;
