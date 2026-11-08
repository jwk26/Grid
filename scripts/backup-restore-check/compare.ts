// Task 263: the comparison of the monthly restore check (DECISION §Periodic restore check). Pure.
// It follows what `restore_account()` changes: every restored row takes the test user's id as
// `user_id`, and its `version` is the backup's plus one on a fresh account. Everything else in a
// backup row must come back equal. The expand rule applies: a column that exists only in the
// re-export passes (it is reported by name), a column of the backup missing from the re-export fails.
// The result holds counts, table and column names and md5 hashes, never a row's content.
import { createHash } from "node:crypto";

export const TABLE_KEYS = ["nodes", "bits", "chunks", "scratch_breakdowns", "staged_candidates"] as const;

type Row = Record<string, unknown>;
type Export = Record<string, unknown>;

export type TableReport = { backupRows: number; afterRows: number; hash: string };
export type CompareResult = {
  ok: boolean;
  /** One line per problem: names and counts only. */
  failures: string[];
  /** `table.column` pairs present only in the re-export (an expand-only difference; passes). */
  newColumns: string[];
  tables: Record<string, TableReport>;
};

/** JSON with sorted object keys, so equal values give equal text. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const o = value as Row;
    return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

const md5 = (text: string) => createHash("md5").update(text).digest("hex");
const rowsOf = (e: Export, key: string): Row[] => (Array.isArray(e[key]) ? (e[key] as Row[]) : []);

export function compareExports(backup: Export, after: Export, testUserId: string): CompareResult {
  const failures: string[] = [];
  const newColumns = new Set<string>();
  const tables: Record<string, TableReport> = {};

  if (canonical(backup.format_version) !== canonical(after.format_version)) {
    failures.push("format_version differs");
  }

  // A table the check does not know: a new array in either export would otherwise go unchecked.
  const known = new Set<string>(TABLE_KEYS);
  for (const [name, e] of [["backup", backup], ["re-export", after]] as const) {
    for (const key of Object.keys(e)) {
      if (Array.isArray(e[key]) && !known.has(key)) failures.push(`${key}: unknown table in the ${name}`);
    }
  }

  for (const key of TABLE_KEYS) {
    const backupPresent = Array.isArray(backup[key]);
    const b = rowsOf(backup, key);
    const a = rowsOf(after, key);
    if (!Array.isArray(after[key]) && b.length > 0) failures.push(`${key}: missing from the re-export`);
    if (!backupPresent && a.length > 0) failures.push(`${key}: absent from the backup but ${a.length} rows were re-exported`);

    const afterById = new Map(a.map((r) => [String(r.id), r]));
    const backupIds = new Set(b.map((r) => String(r.id)));
    const missing = b.filter((r) => !afterById.has(String(r.id))).length;
    const extra = a.filter((r) => !backupIds.has(String(r.id))).length;
    if (missing > 0) failures.push(`${key}: ${missing} backup rows not found after the restore`);
    if (extra > 0) failures.push(`${key}: ${extra} rows after the restore are not in the backup`);

    const wrong = new Map<string, number>();
    const flag = (column: string) => wrong.set(column, (wrong.get(column) ?? 0) + 1);
    for (const row of b) {
      const got = afterById.get(String(row.id));
      if (!got) continue;
      for (const column of Object.keys(row)) {
        if (!(column in got)) {
          flag(`${column} (missing)`);
        } else if (column === "version") {
          if (typeof row.version !== "number" || got.version !== row.version + 1) flag("version");
        } else if (column === "user_id") {
          if (got.user_id !== testUserId) flag("user_id");
        } else if (canonical(row[column]) !== canonical(got[column])) {
          flag(column);
        }
      }
      for (const column of Object.keys(got)) if (!(column in row)) newColumns.add(`${key}.${column}`);
    }
    for (const [column, n] of wrong) failures.push(`${key}.${column}: differs in ${n} rows`);

    // The hash covers the backup's rows, so the same backup file gives the same hash every month.
    const normalized = [...b].sort((x, y) => (String(x.id) < String(y.id) ? -1 : 1));
    tables[key] = { backupRows: b.length, afterRows: a.length, hash: md5(canonical(normalized)) };
  }

  return { ok: failures.length === 0, failures, newColumns: [...newColumns].sort(), tables };
}
