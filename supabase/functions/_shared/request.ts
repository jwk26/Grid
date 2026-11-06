// Parsing the function's request body. Pure.

import { UUID_PATTERN } from "./claims.ts";

export type Mode = "scheduled" | "summary" | "manual" | "status";
export const MODES: readonly Mode[] = ["scheduled", "summary", "manual", "status"];

export type ParsedRequest =
  | { ok: true; mode: "scheduled"; userId: string }
  | { ok: true; mode: "summary"; missing: number; asOf: number }
  | { ok: true; mode: "manual"; runId: string }
  | { ok: true; mode: "status"; runId: string | null }
  | { ok: false; code: string };

const bad = (code: string): ParsedRequest => ({ ok: false, code });

export function readMode(body: unknown): Mode | null {
  if (typeof body !== "object" || body === null) return null;
  const mode = (body as Record<string, unknown>).mode;
  return typeof mode === "string" && (MODES as readonly string[]).includes(mode) ? (mode as Mode) : null;
}

/**
 * Validates a body for its mode. `manual` and `status` never read a user id from the body: a
 * `user_id` in it is ignored, since the account is the JWT's `sub`.
 */
export function parseRequest(body: unknown): ParsedRequest {
  const mode = readMode(body);
  if (mode === null) return bad("bad_mode");
  const b = body as Record<string, unknown>;
  switch (mode) {
    case "scheduled":
      return typeof b.user_id === "string" && UUID_PATTERN.test(b.user_id)
        ? { ok: true, mode, userId: b.user_id }
        : bad("bad_user_id");
    case "summary":
      return Number.isInteger(b.missing) && (b.missing as number) >= 0 &&
          Number.isSafeInteger(b.as_of) && (b.as_of as number) > 0
        ? { ok: true, mode, missing: b.missing as number, asOf: b.as_of as number }
        : bad("bad_summary");
    case "manual":
      return typeof b.run_id === "string" && UUID_PATTERN.test(b.run_id)
        ? { ok: true, mode, runId: b.run_id }
        : bad("bad_run_id");
    case "status":
      if (b.run_id === undefined || b.run_id === null) return { ok: true, mode, runId: null };
      return typeof b.run_id === "string" && UUID_PATTERN.test(b.run_id)
        ? { ok: true, mode, runId: b.run_id }
        : bad("bad_run_id");
  }
}
