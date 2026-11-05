import { judgeAuthUser, type IdentityFile } from "../_shared/identity.ts";
import { parseRequest } from "../_shared/request.ts";
import { readMode } from "../_shared/request.ts";
import {
  assertOwnStatus,
  refusalBody,
  rejectedBody,
  UNCONFIRMED_STATUS,
} from "../_shared/response.ts";
import { logCode, SafeError } from "../_shared/safe-error.ts";
import { runBackup, type RunDeps, type RunKind } from "../_shared/run.ts";
import { judgeSummary } from "../_shared/summary-ping.ts";
import { authenticateUser, checkSharedSecret } from "./auth.ts";
import * as db from "./database.ts";
import { exportGzip } from "./export.ts";
import { createObjectStore } from "./s3.ts";

// Imported so that `deno check` of this graph covers the Stage 3 module too.
export const SHARED = { judgeSummary };

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
    list: store.list,
    remove: store.remove,
    finish: db.finish,
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
        const status = await db.readStatus(jwtUserId as string, parsed.runId);
        return answer(200, { status: "applied", result: status });
      }
      case "summary":
        // Stage 3.
        return answer(200, rejectedBody("not_implemented"));
    }
  } catch (error) {
    // Before a run began, or a read failed: nothing was recorded here, so the client reads the verdict.
    console.error(`request failed: ${logCode(error)}`);
    return unconfirmed();
  }
}

Deno.serve(handle);
