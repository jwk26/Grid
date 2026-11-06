// The hosted gateway adds no CORS headers to Edge Functions (the local one does), so the function
// answers them itself (SPEC §Account backup, Browser calls). `*` is enough: the function
// authenticates by the bearer token, never by a cookie.

import { logCode } from "./safe-error.ts";
import { assertOwnStatus, UNCONFIRMED_STATUS } from "./response.ts";

export const CORS_HEADERS: Readonly<Record<string, string>> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** A copy of the response with the CORS headers; the status and body stay. */
export function withCors(res: Response): Response {
  const headers = new Headers(res.headers);
  for (const [name, value] of Object.entries(CORS_HEADERS)) headers.set(name, value);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

/**
 * Wraps the handler: `OPTIONS` answers 204 before anything else runs, and every other response,
 * refusals and errors included, carries the headers. An exception that escaped the handler still
 * answers (as the unconfirmed case, so the client reads the verdict) instead of reaching the
 * browser as a header-less platform error.
 */
export function withCorsHandler(handle: (req: Request) => Promise<Response>): (req: Request) => Promise<Response> {
  return async (req) => {
    if (req.method === "OPTIONS") return withCors(new Response(null, { status: 204 }));
    try {
      return withCors(await handle(req));
    } catch (error) {
      // The code only, never a message (as handle() logs); the default handler's log is gone here.
      console.error(`request failed: ${logCode(error)}`);
      return withCors(
        Response.json({ status: "unconfirmed" }, { status: assertOwnStatus(UNCONFIRMED_STATUS) }),
      );
    }
  };
}
