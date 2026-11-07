// One restore (SCHEMA §Account backup, Restore; backup B5). Pure orchestration: every effect is a
// dependency, so the order of the steps and every stop can be proven by a fake. `index.ts` passes
// the real dependencies and writes the events to the response stream.
//
// The restore never depends on the stream: `emit` is best-effort and its failure changes nothing
// (Task 261 measurement c). The staging row decides what happened; every stop goes through
// `restore_abort()`, whose answer decides what the stream reports.

import { classifyExportHead, EXPORT_HEAD_BYTES } from "./export-head.ts";
import { accountPrefix, preRestoreKey } from "./object-key.ts";
import { resolveBackupName } from "./backup-list.ts";
import { planPreRestorePrune } from "./retention.ts";
import type { ExportAnswer, ListedObject } from "./run.ts";
import type { RestoreEvent, RestoreResult } from "./sse.ts";
import { logCode } from "./safe-error.ts";

export type RestoreBeginAnswer = { status: "applied" } | { status: "rejected"; code: string };

/** `restore_account()` as the function sees it: an answer of the envelope, or an error with its SQLSTATE. */
export type RestoreAccountAnswer =
  | { kind: "answer"; status: string; code?: string }
  | { kind: "error"; sqlstate: string | null };

export type RestoreDeps = {
  now(): Date;
  begin(userId: string, restoreId: string): Promise<RestoreBeginAnswer>;
  exportGzip(userId: string): Promise<ExportAnswer>;
  accountCheck(userId: string): Promise<string>;
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  /** The object bytes, or null when it does not exist. */
  getBytes(key: string): Promise<Uint8Array | null>;
  list(prefix: string): Promise<ListedObject[]>;
  remove(keys: string[]): Promise<void>;
  /** The decompressed bytes, or null when the file is not a readable gzip. */
  gunzip(body: Uint8Array): Promise<Uint8Array | null>;
  /** `restore_stage()`: the answer's status (`applied` or `not_applied`); throws on an error. */
  stage(userId: string, restoreId: string, payload: Uint8Array): Promise<string>;
  /** `restore_abort()`: `applied` when it wrote the not-applied result, `not_applied` when a result already existed. */
  abort(userId: string, restoreId: string, reason: string): Promise<string>;
  /** `restore_account()` with the user's JWT; never throws. */
  restoreAccount(restoreId: string, expectedFingerprint: string): Promise<RestoreAccountAnswer>;
  /** The server's restore verdict for the id (`backup_read_status()`'s `restore_verdict`). */
  verdict(userId: string, restoreId: string): Promise<string | null>;
  log(message: string): void;
};

export type RestoreInput = { userId: string; restoreId: string; file: string };

const REASON = /^[a-z][a-z0-9_]{0,63}$/;
const DEADLOCK = "40P01";

/** The first step: refused here, nothing is staged, uploaded or pruned. A thrown error means the begin's outcome is unknown. */
export function beginRestore(deps: RestoreDeps, input: { userId: string; restoreId: string }): Promise<RestoreBeginAnswer> {
  return deps.begin(input.userId, input.restoreId);
}

/** What a verdict for the id means as a result; null when the verdict does not settle it. */
export function resultFromVerdict(verdict: string | null): RestoreResult | null {
  switch (verdict) {
    case "applied":
      return { status: "applied" };
    case "not_applied":
      return { status: "not_applied" };
    case "account_changed":
    case "unsupported_format":
      return { status: "rejected", rejection: { code: verdict } };
    default:
      return null; // finishing, expired, not_started or unknown: the client reads the verdict itself
  }
}

/**
 * Runs the steps after a successful `restore_begin()`. Emits `saving` first (the response headers
 * leave with the first chunk), then `getting` and `applying`, then the result; returns the result.
 */
export async function runRestore(
  deps: RestoreDeps,
  input: RestoreInput,
  emit: (e: RestoreEvent) => void,
): Promise<RestoreResult> {
  const { userId, restoreId } = input;
  const send = (e: RestoreEvent) => {
    try {
      emit(e);
    } catch {
      // A dropped client changes nothing; the staging row decides.
    }
  };
  const finish = (result: RestoreResult): RestoreResult => {
    send({ type: "result", result });
    return result;
  };

  // A stop before or after `restore_account()`: the abort's answer decides the result.
  const stop = async (reason: string): Promise<RestoreResult> => {
    const code = REASON.test(reason) ? reason : "restore_failed";
    let answered: string;
    try {
      answered = await deps.abort(userId, restoreId, code);
    } catch (error) {
      deps.log(`abort failed: ${logCode(error)}`);
      return finish({ status: "unconfirmed" });
    }
    if (answered === "applied") return finish({ status: "not_applied", reason: code });
    // A result already exists (a call that still committed, or an earlier stop): report the verdict.
    try {
      return finish(resultFromVerdict(await deps.verdict(userId, restoreId)) ?? { status: "unconfirmed" });
    } catch (error) {
      deps.log(`verdict failed: ${logCode(error)}`);
      return finish({ status: "unconfirmed" });
    }
  };

  send({ type: "step", step: "saving" });
  try {
    const key = resolveBackupName(userId, input.file);
    if (key === null) return await stop("bad_file");

    // 1. The pre-restore export. Its own `fingerprint` key is the expected fingerprint.
    const exported = await deps.exportGzip(userId);
    if (exported.kind === "rejection") return await stop("account_unavailable");
    if (exported.kind === "failed") return await stop(exported.reason);
    const fingerprint = exported.fingerprint;
    if (typeof fingerprint !== "string" || !/^[0-9a-f]{32}$/.test(fingerprint)) return await stop("fingerprint_missing");

    let check: string;
    try {
      check = await deps.accountCheck(userId);
    } catch (error) {
      deps.log(`account check failed: ${logCode(error)}`);
      return await stop("account_check_failed");
    }
    if (check !== "ok") return await stop("account_unavailable");

    const preKey = preRestoreKey(userId, deps.now());
    try {
      await deps.put(preKey, exported.body, "application/gzip");
    } catch (error) {
      deps.log(`pre-restore upload failed: ${logCode(error)}`);
      return await stop("upload_failed");
    }
    // Prune right after the write; the chosen file stays even when it is the oldest. A failure here
    // leaves extra files until the next restore and never stops this one.
    try {
      const plan = planPreRestorePrune(userId, (await deps.list(accountPrefix(userId))).map((o) => o.key), key);
      if (plan.remove.length > 0) await deps.remove(plan.remove);
    } catch (error) {
      deps.log(`pre-restore prune failed: ${logCode(error)}`);
    }

    // 2. The chosen backup, set as the staged payload.
    send({ type: "step", step: "getting" });
    let packed: Uint8Array | null;
    try {
      packed = await deps.getBytes(key);
    } catch (error) {
      deps.log(`backup fetch failed: ${logCode(error)}`);
      return await stop("fetch_failed");
    }
    if (packed === null) return await stop("backup_missing");
    let payload: Uint8Array | null;
    try {
      payload = await deps.gunzip(packed);
    } catch {
      payload = null;
    }
    if (payload === null || classifyExportHead(payload.subarray(0, EXPORT_HEAD_BYTES)) !== "export") {
      return await stop("backup_unreadable");
    }
    try {
      if ((await deps.stage(userId, restoreId, payload)) !== "applied") return await stop("stage_refused");
    } catch (error) {
      deps.log(`stage failed: ${logCode(error)}`);
      return await stop("stage_failed");
    }

    // 3. The restore itself, once more after a deadlock (the rollback is certain and the result guard makes it safe).
    send({ type: "step", step: "applying" });
    let answer = await deps.restoreAccount(restoreId, fingerprint);
    if (answer.kind === "error" && answer.sqlstate === DEADLOCK) {
      deps.log("restore_account deadlock, retrying once");
      answer = await deps.restoreAccount(restoreId, fingerprint);
    }
    if (answer.kind === "error") return await stop("restore_failed");
    switch (answer.status) {
      case "applied":
      case "already_applied":
        return finish({ status: "applied" });
      case "not_applied":
        return finish({ status: "not_applied" });
      case "rejected": {
        const code = answer.code ?? "invalid_input";
        // account_changed and unsupported_format wrote their result in the same transaction; the
        // SQL writes none for the others, so the row is closed here (the result guard keeps any
        // result that exists) and the answer stays the rejection.
        if (code !== "account_changed" && code !== "unsupported_format") {
          try {
            await deps.abort(userId, restoreId, code);
          } catch (error) {
            deps.log(`abort failed: ${logCode(error)}`);
          }
        }
        return finish({ status: "rejected", rejection: { code } });
      }
      default:
        return await stop("restore_failed");
    }
  } catch (error) {
    deps.log(`restore failed: ${logCode(error)}`);
    return await stop("internal_error");
  }
}
