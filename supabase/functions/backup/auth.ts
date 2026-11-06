import { createClient } from "@supabase/supabase-js";
import { bearerToken, judgeClaims, type ClaimsVerdict } from "../_shared/claims.ts";
import { secretMatches, secretMissing } from "../_shared/secret.ts";

/** The scheduled and summary modes: the shared secret header, never a JWT. */
export function checkSharedSecret(req: Request): boolean {
  const expected = Deno.env.get("BACKUP_SHARED_SECRET");
  // Logs the name only, never a value, so a misconfigured deploy is visible in the function logs.
  if (secretMissing(expected)) console.error("BACKUP_SHARED_SECRET is not set");
  return secretMatches(req.headers.get("x-backup-secret"), expected);
}

/**
 * The manual and status modes: verifies the bearer JWT in the function (`verify_jwt` is off at the
 * gateway) with supabase-js `getClaims`, which checks HS256 locally and asymmetric signing keys
 * through the project's JWKS, then judges the claims.
 */
export async function authenticateUser(req: Request): Promise<ClaimsVerdict> {
  const token = bearerToken(req.headers.get("authorization"));
  if (token === null) return { ok: false, status: 401, code: "invalid_token" };
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !key) {
    console.error(`${!url ? "SUPABASE_URL" : "SUPABASE_ANON_KEY"} is not set`);
    return { ok: false, status: 401, code: "invalid_token" };
  }
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.getClaims(token);
  if (error || !data) return { ok: false, status: 401, code: "invalid_token" };
  return judgeClaims(data.claims as Record<string, unknown>);
}
