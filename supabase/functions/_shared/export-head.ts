// The first bytes of an `export_account()` answer (PostgREST returns the jsonb text). An export begins
// with its `bits` key (jsonb orders keys by length, then bytes, and `bits` is the shortest key); a
// rejection of an account deleted or given a deletion request after `backup_begin()` begins with
// `rejection`. The function uploads only on a positive match.

export type ExportHead = "export" | "rejection" | "unknown";

/** Bytes needed to tell the three cases apart. */
export const EXPORT_HEAD_BYTES = 16;

export function classifyExportHead(head: Uint8Array): ExportHead {
  const text = new TextDecoder().decode(head.subarray(0, EXPORT_HEAD_BYTES));
  if (/^\{\s*"bits"\s*:\s*\[/.test(text)) return "export";
  if (/^\{\s*"rejection"\s*:/.test(text)) return "rejection";
  return "unknown";
}
