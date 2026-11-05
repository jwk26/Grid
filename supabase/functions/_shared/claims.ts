// Judging a verified JWT's claims for the `manual` and `status` modes (SCHEMA §Account backup,
// Guests). Pure: the function verifies the token and passes the claims in. The user id comes from
// `sub` only, never from the request body.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export type ClaimsVerdict =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403; code: "invalid_token" | "guest" };

export function judgeClaims(claims: Record<string, unknown> | null | undefined): ClaimsVerdict {
  if (!claims) return { ok: false, status: 401, code: "invalid_token" };
  // A guest is refused before anything else is read or written.
  if (claims.is_anonymous === true) return { ok: false, status: 403, code: "guest" };
  // The publishable (`anon`) key and the service key are valid JWTs but not a signed-in user.
  if (claims.role !== "authenticated") return { ok: false, status: 401, code: "invalid_token" };
  const sub = claims.sub;
  if (typeof sub !== "string" || !UUID.test(sub)) return { ok: false, status: 401, code: "invalid_token" };
  return { ok: true, userId: sub };
}

export function bearerToken(header: string | null): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  return match ? match[1] : null;
}

export { UUID as UUID_PATTERN };
