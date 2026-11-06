// The backup-only shared secret (DECISION §Runner). Pure helpers; the function reads the value
// from its environment and passes it in.

/** A secret that is unset, empty or still the literal `env(NAME)` the CLI leaves without .env.local. */
export function secretMissing(value: string | null | undefined): boolean {
  return value === undefined || value === null || value === "" || value.startsWith("env(");
}

/** Compares in time that depends on the longer length only, never on where the strings differ. */
export function constantTimeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

/** True only when the expected secret is set and the provided header value equals it. */
export function secretMatches(provided: string | null, expected: string | undefined): boolean {
  if (secretMissing(expected) || provided === null) return false;
  return constantTimeEqual(provided, expected as string);
}
