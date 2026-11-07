// Parsing the function's request body. Pure.

import { isBackupName } from "./backup-list.ts";
import { UUID_PATTERN } from "./claims.ts";

export type Mode = "scheduled" | "summary" | "manual" | "status" | "restore";
export const MODES: readonly Mode[] = ["scheduled", "summary", "manual", "status", "restore"];

export type ParsedRequest =
  | { ok: true; mode: "scheduled"; userId: string }
  | { ok: true; mode: "summary"; missing: number; asOf: number }
  | { ok: true; mode: "manual"; runId: string }
  | { ok: true; mode: "status"; runId: string | null; restoreId: string | null }
  | { ok: true; mode: "restore"; restoreId: string; file: string; etag: string }
  | { ok: false; code: string };

const ETAG_PATTERN = /^[A-Za-z0-9_=+\/-]{1,128}$/;

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
    case "status": {
      const runId = optionalUuid(b.run_id);
      const restoreId = optionalUuid(b.restore_id);
      if (runId === false) return bad("bad_run_id");
      if (restoreId === false) return bad("bad_restore_id");
      return { ok: true, mode, runId, restoreId };
    }
    case "restore":
      if (typeof b.restore_id !== "string" || !UUID_PATTERN.test(b.restore_id)) return bad("bad_restore_id");
      // A list name, never an object key: the function builds the key inside the caller's prefix.
      if (!isBackupName(b.file)) return bad("bad_file");
      // The list entry's ETag: the restore refuses a file that changed since the list was read.
      return typeof b.etag === "string" && ETAG_PATTERN.test(b.etag)
        ? { ok: true, mode, restoreId: b.restore_id, file: b.file, etag: b.etag }
        : bad("bad_etag");
  }
}

/** Absent or null is null; a UUID string is itself; anything else is false. */
function optionalUuid(v: unknown): string | null | false {
  if (v === undefined || v === null) return null;
  return typeof v === "string" && UUID_PATTERN.test(v) ? v : false;
}
