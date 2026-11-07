import { withCorsHandler } from "../_shared/cors.ts";
import { buildBackupList } from "../_shared/backup-list.ts";
import { bearerToken } from "../_shared/claims.ts";
import { judgeAuthUser, type IdentityFile } from "../_shared/identity.ts";
import { accountPrefix } from "../_shared/object-key.ts";
import { parseRequest } from "../_shared/request.ts";
import { readMode } from "../_shared/request.ts";
import {
  assertOwnStatus,
  refusalBody,
  rejectedBody,
  UNCONFIRMED_STATUS,
} from "../_shared/response.ts";
import { logCode, SafeError } from "../_shared/safe-error.ts";
import { beginRestore, runRestore, type RestoreDeps } from "../_shared/restore-run.ts";
import { runBackup, type RunDeps, type RunKind } from "../_shared/run.ts";
import { formatEvent } from "../_shared/sse.ts";
import { runSummary, type SummaryDeps } from "../_shared/summary.ts";
import { authenticateUser, checkSharedSecret } from "./auth.ts";
import * as db from "./database.ts";
import { exportGzip } from "./export.ts";
import { sendPing } from "./ping.ts";
import { createObjectStore, type ObjectStore } from "./s3.ts";
import { gunzip as nodeGunzip } from "node:zlib";

function answer(status: number, body: unknown): Response {
  return Response.json(body, { status: assertOwnStatus(status) });
}

/** The platform's answer for "the outcome is not known here": the client reads the run's verdict. */
const unconfirmed = () => answer(UNCONFIRMED_STATUS, { status: "unconfirmed" });

type Eligible = { ok: true; identity: IdentityFile } | { ok: false; code: string };

// The account's identities through the auth admin API, before anything is recorded: an anonymous
// user or one with no OAuth identity records nothing and gets nothing.
async function loadIdentity(userId: string): Promise<Eligible> {
  const { data, error } = await db.serviceClient().auth.admin.getUserById(userId);
  if (error) {
    if (error.status === 404) return { ok: false, code: "account_missing" };
    throw new SafeError("auth_admin_failed");
  }
  const verdict = judgeAuthUser({
    id: data.user.id,
    is_anonymous: data.user.is_anonymous,
    identities: data.user.identities?.map((i) => ({ provider: i.provider, id: i.id })),
  });
  return verdict.ok ? verdict : { ok: false, code: "not_eligible" };
}

function realDeps(): RunDeps {
  const store = createObjectStore();
  return {
    now: () => new Date(),
    begin: db.begin,
    fingerprint: db.fingerprint,
    exportGzip,
    accountCheck: db.accountCheck,
    put: store.put,
    getText: store.getText,
    list: store.list,
    remove: store.remove,
    finish: db.finish,
    log: (message) => console.error(message),
  };
}

// Most a backup may unpack to: 64 MiB, far above the largest account (about 10 MB of rows).
const MAX_UNPACKED_BYTES = 64 * 1024 * 1024;

function gunzip(body: Uint8Array): Promise<Uint8Array | null> {
  return new Promise((resolve) => {
    nodeGunzip(body, { maxOutputLength: MAX_UNPACKED_BYTES }, (error, out) => resolve(error ? null : new Uint8Array(out)));
  });
}

function restoreDeps(token: string): RestoreDeps {
  const store = createObjectStore();
  return {
    now: () => new Date(),
    begin: db.restoreBegin,
    exportGzip: (id) => exportGzip(id, { scanFingerprint: true }),
    accountCheck: db.accountCheck,
    put: store.put,
    getBytes: store.getBytes,
    list: store.list,
    remove: store.remove,
    gunzip,
    stage: db.restoreStage,
    abort: db.restoreAbort,
    restoreAccount: (restoreId, fingerprint) => db.restoreAccount(token, restoreId, fingerprint),
    verdict: db.restoreVerdict,
    log: (message) => console.error(message),
  };
}

/**
 * The restore (SCHEMA §Account backup, Restore). A refusal before anything is staged answers 200
 * JSON like `Back Up Now`; otherwise a `text/event-stream` with the steps and one result. The
 * restore never depends on the stream: a client that drops changes nothing, and the staging row
 * decides what happened.
 */
async function restore(userId: string, token: string, restoreId: string, file: string): Promise<Response> {
  const eligible = await loadIdentity(userId);
  if (!eligible.ok) return answer(200, rejectedBody(eligible.code));
  const deps = restoreDeps(token); // a missing storage setting fails here, before anything is recorded
  const began = await beginRestore(deps, { userId, restoreId });
  if (began.status === "rejected") return answer(200, rejectedBody(began.code));

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true;
      const emit = (e: Parameters<typeof formatEvent>[0]) => {
        if (open) controller.enqueue(encoder.encode(formatEvent(e)));
      };
      try {
        await runRestore(deps, { userId, restoreId, file }, (e) => {
          try {
            emit(e);
          } catch {
            open = false; // the client is gone; the restore goes on
          }
        });
      } finally {
        try {
          controller.close();
        } catch {
          // already closed or cancelled
        }
      }
    },
    cancel() {
      // The gateway noticed the client is gone; the handler keeps running to its end (Task 261 measurement c).
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-store", "x-accel-buffering": "no" },
  });
}

function summaryDeps(): SummaryDeps {
  // Created on first use: a storage setting that is missing must not stop the summary itself, which
  // records `interrupted` and counts the problems; it only fails the deletion of a due row.
  let store: ObjectStore | null = null;
  const objects = () => (store ??= createObjectStore());
  return {
    now: () => new Date(),
    summary: db.summary,
    dueDeletions: db.dueDeletions,
    deletionDone: db.deletionDone,
    deletionFailed: db.deletionFailed,
    listKeys: async (prefix) => (await objects().list(prefix)).map((o) => o.key),
    remove: (keys) => objects().remove(keys),
    ping: sendPing,
    log: (message) => console.error(message),
  };
}

async function run(userId: string, kind: RunKind, runId: string | null): Promise<Response> {
  const eligible = await loadIdentity(userId);
  if (!eligible.ok) return answer(200, rejectedBody(eligible.code));
  const outcome = await runBackup(realDeps(), { userId, kind, runId, identity: eligible.identity });
  if (outcome.kind === "rejected") return answer(200, rejectedBody(outcome.code));
  // A 200 states only a result the database confirmed; otherwise the client reads the verdict.
  if (!outcome.confirmed) return unconfirmed();
  const result: Record<string, unknown> = { result: outcome.result };
  if (outcome.reason) result.reason = outcome.reason;
  const reply: Record<string, unknown> = { status: "applied", result };
  if (kind === "manual") {
    try {
      const status = await db.readStatus(userId, runId);
      reply.backup = status.backup;
    } catch {
      // The result stands; the client's status read shows the line.
    }
  }
  return answer(200, reply);
}

export async function handle(req: Request): Promise<Response> {
  if (req.method !== "POST") return answer(405, refusalBody("method"));
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return answer(400, refusalBody("bad_body"));
  }
  const mode = readMode(body);
  if (mode === null) return answer(400, refusalBody("bad_mode"));

  // Authenticate before reading or writing anything else.
  let jwtUserId: string | null = null;
  if (mode === "scheduled" || mode === "summary") {
    if (!checkSharedSecret(req)) return answer(401, refusalBody("invalid_secret"));
  } else {
    const verdict = await authenticateUser(req);
    if (!verdict.ok) return answer(verdict.status, refusalBody(verdict.code));
    jwtUserId = verdict.userId;
  }

  const parsed = parseRequest(body);
  if (!parsed.ok) return answer(400, refusalBody(parsed.code));

  try {
    switch (parsed.mode) {
      case "scheduled":
        return await run(parsed.userId, "scheduled", null);
      case "manual":
        return await run(jwtUserId as string, "manual", parsed.runId);
      case "status": {
        const userId = jwtUserId as string;
        const status = await db.readStatus(userId, parsed.runId, parsed.restoreId);
        // The list of backups only on a plain status read: a read for a run or restore id is a
        // verdict read and calls no storage, so the way out works while the storage is down.
        if (parsed.runId !== null || parsed.restoreId !== null) return answer(200, { status: "applied", result: status });
        let backups = null;
        try {
          backups = buildBackupList(userId, await createObjectStore().list(accountPrefix(userId)));
        } catch (error) {
          console.error(`backup list failed: ${logCode(error)}`);
        }
        return answer(200, { status: "applied", result: { ...status, backups } });
      }
      case "restore":
        return await restore(jwtUserId as string, bearerToken(req.headers.get("authorization")) as string, parsed.restoreId, parsed.file);
      case "summary": {
        // Counts and codes only: no account id, email or reason leaves the function.
        const outcome = await runSummary(summaryDeps(), { missing: parsed.missing, asOf: parsed.asOf });
        return answer(200, {
          status: "applied",
          result: { ok: outcome.decision.ok, codes: outcome.decision.codes, pinged: outcome.pinged, deleted: outcome.deleted },
        });
      }
    }
  } catch (error) {
    // Before a run began, or a read failed: nothing was recorded here, so the client reads the verdict.
    console.error(`request failed: ${logCode(error)}`);
    return unconfirmed();
  }
}

Deno.serve(withCorsHandler(handle));
