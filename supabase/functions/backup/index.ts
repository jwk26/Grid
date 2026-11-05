import { assertOwnStatus, refusalBody, rejectedBody } from "../_shared/response.ts";
import { parseRequest, readMode } from "../_shared/request.ts";
import { backupObjectKey } from "../_shared/object-key.ts";
import { planPrune } from "../_shared/retention.ts";
import { judgeSummary } from "../_shared/summary-ping.ts";
import { authenticateUser, checkSharedSecret } from "./auth.ts";

// Imported so that `deno check` of this graph covers every shared module the function will use.
export const SHARED = { backupObjectKey, planPrune, judgeSummary };

function answer(status: number, body: unknown): Response {
  return Response.json(body, { status: assertOwnStatus(status) });
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
  let userId: string | null = null;
  if (mode === "scheduled" || mode === "summary") {
    if (!checkSharedSecret(req)) return answer(401, refusalBody("invalid_secret"));
  } else {
    const verdict = await authenticateUser(req);
    if (!verdict.ok) return answer(verdict.status, refusalBody(verdict.code));
    userId = verdict.userId;
  }

  const parsed = parseRequest(body);
  if (!parsed.ok) return answer(400, refusalBody(parsed.code));

  // Stage 2 and 3 replace this: the runs, the status read and the summary.
  void userId;
  return answer(200, rejectedBody("not_implemented"));
}

Deno.serve(handle);
