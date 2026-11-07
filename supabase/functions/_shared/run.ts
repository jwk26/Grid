// One backup run, scheduled or manual (SCHEMA §Account backup; DECISION §Runner, §Retention,
// §Deleting R2 objects). Pure orchestration: every effect (database calls, export, gzip, object
// storage) is a dependency, so this module holds no `npm:`, `Deno.*` or `node:` import and the
// order of the steps can be proven by a fake. `index.ts` passes the real dependencies.

import { backupObjectKey, identityKey, accountPrefix } from "./object-key.ts";
import { planPrune } from "./retention.ts";
import { sameIdentity, type IdentityFile } from "./identity.ts";
import { logCode } from "./safe-error.ts";

export type RunKind = "scheduled" | "manual";
export type FinishResult = "written" | "unchanged" | "failed" | "abandoned";

export type BeginAnswer =
  | { status: "applied"; runToken: number; lastFingerprint: string | null }
  | { status: "rejected"; code: string };

export type ExportAnswer =
  | { kind: "ok"; body: Uint8Array; fingerprint?: string | null } // the gzip of a verified export
  | { kind: "rejection" } // the export itself refused: deleted or under a deletion request
  | { kind: "failed"; reason: string };

export type FinishArgs = {
  fingerprint?: string;
  fileAt?: number;
  fileBytes?: number;
  storedBytes?: number;
  reason?: string;
};

export type ListedObject = { key: string; size: number; lastModified?: number; etag?: string };

export type RunDeps = {
  now(): Date;
  begin(userId: string, kind: RunKind, runId: string | null): Promise<BeginAnswer>;
  fingerprint(userId: string): Promise<string>;
  exportGzip(userId: string): Promise<ExportAnswer>;
  accountCheck(userId: string): Promise<string>;
  put(key: string, body: Uint8Array | string, contentType: string): Promise<void>;
  /** The object text, or null when it does not exist. */
  getText(key: string): Promise<string | null>;
  list(prefix: string): Promise<ListedObject[]>;
  remove(keys: string[]): Promise<void>;
  /** True only when the database confirmed the finish (`applied`). */
  finish(userId: string, runToken: number, result: FinishResult, args?: FinishArgs): Promise<boolean>;
  log(message: string): void;
};

export type RunOutcome =
  | { kind: "rejected"; code: string }
  | { kind: "done"; result: FinishResult; reason?: string; confirmed: boolean };

export type RunInput = { userId: string; kind: RunKind; runId: string | null; identity: IdentityFile };

const REASON = /^[a-z][a-z0-9_]{0,63}$/;

export async function runBackup(deps: RunDeps, input: RunInput): Promise<RunOutcome> {
  const { userId, kind, runId, identity } = input;
  const began = await deps.begin(userId, kind, runId);
  if (began.status === "rejected") return { kind: "rejected", code: began.code };
  const token = began.runToken;

  const end = async (result: FinishResult, args?: FinishArgs): Promise<RunOutcome> => {
    let confirmed = false;
    try {
      confirmed = await deps.finish(userId, token, result, args);
    } catch (error) {
      deps.log(`finish failed: ${logCode(error)}`);
    }
    return { kind: "done", result, reason: args?.reason, confirmed };
  };
  const fail = (reason: string) => {
    if (!REASON.test(reason)) reason = "internal_error";
    return end("failed", { reason });
  };

  try {
    // 1. Unchanged: the fingerprint read before the export equals the latest file's. Only the check is recorded.
    let fingerprint: string;
    try {
      fingerprint = await deps.fingerprint(userId);
    } catch (error) {
      deps.log(`fingerprint failed: ${logCode(error)}`);
      return await fail("fingerprint_failed");
    }
    if (typeof fingerprint !== "string" || fingerprint === "") return await fail("fingerprint_failed");
    if (began.lastFingerprint !== null && fingerprint === began.lastFingerprint) {
      // A deletion request that landed since backup_begin() records nothing, an unchanged run included.
      let present: string;
      try {
        present = await deps.accountCheck(userId);
      } catch (error) {
        deps.log(`account check failed: ${logCode(error)}`);
        return await fail("account_check_failed");
      }
      if (present === "account_missing" || present === "account_deleting") return await end("abandoned");
      if (present !== "ok") return await fail("account_check_unexpected");
      // Linking a provider does not change the fingerprint: rewrite identity.json only when its
      // content differs or the file is missing, so the recovery lookup finds a newly linked provider.
      try {
        if (!sameIdentity(await deps.getText(identityKey(userId)), identity)) {
          await deps.put(identityKey(userId), JSON.stringify(identity), "application/json");
        }
      } catch (error) {
        deps.log(`identity refresh failed: ${logCode(error)}`);
        return await fail("upload_failed");
      }
      return await end("unchanged");
    }

    // 2. Export and compress. Only an export that begins with its `bits` key is uploaded.
    const exported = await deps.exportGzip(userId);
    if (exported.kind === "rejection") return await end("abandoned");
    if (exported.kind === "failed") return await fail(exported.reason);

    // 3. Right before the upload: the account exists and has no deletion request. Only `ok` uploads.
    let check: string;
    try {
      check = await deps.accountCheck(userId);
    } catch (error) {
      deps.log(`account check failed: ${logCode(error)}`);
      return await fail("account_check_failed");
    }
    if (check === "account_missing" || check === "account_deleting") return await end("abandoned");
    if (check !== "ok") return await fail("account_check_unexpected");

    // 4. The dated file, then identity.json (providers and provider ids only).
    const at = deps.now();
    const key = backupObjectKey(userId, at);
    try {
      await deps.put(key, exported.body, "application/gzip");
      await deps.put(identityKey(userId), JSON.stringify(identity), "application/json");
    } catch (error) {
      deps.log(`upload failed: ${logCode(error)}`);
      return await fail("upload_failed");
    }

    // 5. Prune right after a write, then the size sum under the account prefix after pruning.
    let stored: number;
    try {
      const listed = await deps.list(accountPrefix(userId));
      const plan = planPrune(userId, listed.map((o) => o.key));
      let removed = new Set<string>();
      if (plan.remove.length > 0) {
        try {
          await deps.remove(plan.remove);
          removed = new Set(plan.remove);
        } catch (error) {
          // The file is written; the next write prunes again. The size still counts what is left.
          deps.log(`prune failed: ${logCode(error)}`);
        }
      }
      stored = listed.filter((o) => !removed.has(o.key)).reduce((sum, o) => sum + o.size, 0);
    } catch (error) {
      deps.log(`list failed: ${logCode(error)}`);
      return await fail("list_failed");
    }

    return await end("written", {
      fingerprint,
      fileAt: at.getTime(),
      fileBytes: exported.body.byteLength,
      storedBytes: stored,
    });
  } catch (error) {
    deps.log(`run failed: ${logCode(error)}`);
    return await fail("internal_error");
  }
}
