import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SafeError } from "../_shared/safe-error.ts";
import type { DueDeletion, SummaryAnswer } from "../_shared/summary.ts";
import type { BeginAnswer, FinishArgs, FinishResult, RunKind } from "../_shared/run.ts";
import type { RestoreAccountAnswer, RestoreBeginAnswer } from "../_shared/restore-run.ts";

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

export type StatusAnswer = {
  backup: Record<string, unknown> | null;
  verdict: string | null;
  restore_verdict?: string | null;
};

export async function readStatus(userId: string, runId: string | null, restoreId: string | null = null): Promise<StatusAnswer> {
  const r = await rpc<{ status: string; result?: StatusAnswer }>("backup_read_status", {
    p_user_id: userId,
    p_run_id: runId,
    p_restore_id: restoreId,
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

// ---- Restore (Phase 53) ---------------------------------------------------------------------------

export async function restoreBegin(userId: string, restoreId: string): Promise<RestoreBeginAnswer> {
  const r = await rpc<{ status: string; rejection?: { code: string } }>("restore_begin", {
    p_user_id: userId,
    p_restore_id: restoreId,
  });
  if (r.status === "applied") return { status: "applied" };
  if (r.status === "rejected" && r.rejection?.code) return { status: "rejected", code: r.rejection.code };
  throw new SafeError("restore_begin_unexpected");
}

export async function restoreAbort(userId: string, restoreId: string, reason: string): Promise<string> {
  const r = await rpc<{ status: string }>("restore_abort", {
    p_user_id: userId,
    p_restore_id: restoreId,
    p_reason: reason,
  });
  return r.status;
}

/** The restore verdict for the id on the server clock (`backup_read_status()`'s `restore_verdict`). */
export async function restoreVerdict(userId: string, restoreId: string): Promise<string | null> {
  const status = await readStatus(userId, null, restoreId);
  return typeof status.restore_verdict === "string" ? status.restore_verdict : null;
}

/**
 * `restore_stage()` with the decompressed backup as the rpc body's `p_payload`, joined by
 * concatenation: the bytes are never parsed or stringified here (Task 261 review item 3). The
 * database rejects anything that is not JSON.
 */
export async function restoreStage(userId: string, restoreId: string, payload: Uint8Array): Promise<string> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    console.error(`${!url ? "SUPABASE_URL" : "SUPABASE_SERVICE_ROLE_KEY"} is not set`);
    throw new SafeError("database_not_configured");
  }
  const enc = new TextEncoder();
  const head = enc.encode(`{"p_user_id":${JSON.stringify(userId)},"p_restore_id":${JSON.stringify(restoreId)},"p_payload":`);
  const tail = enc.encode("}");
  const body = new Uint8Array(head.byteLength + payload.byteLength + tail.byteLength);
  body.set(head, 0);
  body.set(payload, head.byteLength);
  body.set(tail, head.byteLength + payload.byteLength);
  const res = await fetch(`${url}/rest/v1/rpc/restore_stage`, {
    method: "POST",
    headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json" },
    body,
  });
  const text = await res.text();
  if (!res.ok) throw new SafeError(`rpc_restore_stage_${res.status}`);
  try {
    const r = JSON.parse(text) as { status?: string };
    return typeof r.status === "string" ? r.status : "";
  } catch {
    throw new SafeError("restore_stage_unreadable");
  }
}

/**
 * `restore_account()` as the user: their JWT, never the service key (only `authenticated` executes
 * it, and it reads only that user's staging row under RLS). Never throws; an error carries its
 * SQLSTATE when the database gave one.
 */
export async function restoreAccount(token: string, restoreId: string, expectedFingerprint: string): Promise<RestoreAccountAnswer> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !key) return { kind: "error", sqlstate: null };
  try {
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data, error } = await client.rpc("restore_account", {
      p_restore_id: restoreId,
      p_expected_fingerprint: expectedFingerprint,
    });
    if (error) return { kind: "error", sqlstate: /^[0-9A-Z]{5}$/.test(error.code ?? "") ? error.code : null };
    const r = data as { status?: string; rejection?: { code?: string } } | null;
    if (!r || typeof r.status !== "string") return { kind: "error", sqlstate: null };
    return { kind: "answer", status: r.status, code: r.rejection?.code };
  } catch {
    return { kind: "error", sqlstate: null };
  }
}
