import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SafeError } from "../_shared/safe-error.ts";
import type { DueDeletion, SummaryAnswer } from "../_shared/summary.ts";
import type { BeginAnswer, FinishArgs, FinishResult, RunKind } from "../_shared/run.ts";

// The backup functions through supabase-js `.rpc()` as service_role (SCHEMA §Backup functions).
// Every call names its account explicitly. An error from the database throws; the run decides.

let client: SupabaseClient | null = null;

export function serviceClient(): SupabaseClient {
  if (client) return client;
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    console.error(`${!url ? "SUPABASE_URL" : "SUPABASE_SERVICE_ROLE_KEY"} is not set`);
    throw new SafeError("database_not_configured");
  }
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await serviceClient().rpc(name, args);
  if (error) throw new SafeError(`rpc_${name}`);
  return data as T;
}

export async function begin(userId: string, kind: RunKind, runId: string | null): Promise<BeginAnswer> {
  const r = await rpc<{ status: string; result?: Record<string, unknown>; rejection?: { code: string } }>(
    "backup_begin",
    { p_user_id: userId, p_kind: kind, p_run_id: runId },
  );
  if (r.status === "applied" && typeof r.result?.run_token === "number") {
    const last = r.result.last_fingerprint;
    return { status: "applied", runToken: r.result.run_token, lastFingerprint: typeof last === "string" ? last : null };
  }
  if (r.status === "rejected" && r.rejection?.code) return { status: "rejected", code: r.rejection.code };
  throw new SafeError("begin_unexpected");
}

export function fingerprint(userId: string): Promise<string> {
  return rpc<string>("backup_fingerprint", { p_user_id: userId });
}

export async function accountCheck(userId: string): Promise<string> {
  const r = await rpc<{ status?: string }>("backup_account_check", { p_user_id: userId });
  return typeof r.status === "string" ? r.status : "";
}

export async function finish(userId: string, runToken: number, result: FinishResult, a: FinishArgs = {}): Promise<boolean> {
  const r = await rpc<{ status: string }>("backup_finish", {
    p_user_id: userId,
    p_run_token: runToken,
    p_result: result,
    p_fingerprint: a.fingerprint ?? null,
    p_file_at: a.fileAt ?? null,
    p_file_bytes: a.fileBytes ?? null,
    p_stored_bytes: a.storedBytes ?? null,
    p_reason: a.reason ?? null,
  });
  return r.status === "applied";
}

export type StatusAnswer = { backup: Record<string, unknown> | null; verdict: string | null };

export async function readStatus(userId: string, runId: string | null): Promise<StatusAnswer> {
  const r = await rpc<{ status: string; result?: StatusAnswer }>("backup_read_status", {
    p_user_id: userId,
    p_run_id: runId,
  });
  if (r.status !== "applied" || !r.result) throw new SafeError("status_unexpected");
  return r.result;
}

export async function summary(missing: number, asOf: number): Promise<SummaryAnswer> {
  const r = await rpc<{ status: string; result?: SummaryAnswer }>("backup_summary", {
    p_missing: missing,
    p_as_of: asOf,
  });
  if (r.status !== "applied" || !r.result) throw new SafeError("summary_unexpected");
  return r.result;
}

export function dueDeletions(): Promise<DueDeletion[]> {
  return rpc<DueDeletion[]>("backup_due_deletions", {});
}

export async function deletionDone(userId: string): Promise<void> {
  await rpc("backup_deletion_done", { p_user_id: userId });
}

export async function deletionFailed(userId: string): Promise<void> {
  await rpc("backup_deletion_failed", { p_user_id: userId });
}
