// Retention and pruning (SCHEMA §Account backup, Retention). Pure: it plans from a list of keys and
// touches nothing. Pruning runs only right after a new file is written and counts files, not days.

import { parseBackupKey, parsePreRestoreKey } from "./object-key.ts";

export const KEEP_LATEST_FILES = 7;
export const KEEP_EARLIER_WEEKS = 4;

/** ISO 8601 week of a `YYYY-MM-DD` date, as `YYYY-Www` (the ISO year, so 2026-12-31 is 2026-W53). */
export function isoWeek(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  // Move to the Thursday of this ISO week; its year is the ISO year.
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export type PrunePlan = { keep: string[]; remove: string[] };

/**
 * Of the account's dated files keeps the 7 latest and, before them, the latest file of each of the
 * 4 most recent ISO weeks earlier than the week of the 7th file (an older file in the 7th file's
 * own week is not kept). Every other dated file is removed. Keys that are not dated files of this
 * account (identity.json, pre-restore files) are in neither list. The newest file always stays.
 */
export function planPrune(userId: string, keys: string[]): PrunePlan {
  const dated = new Map<string, string>(); // date -> key
  for (const key of keys) {
    const date = parseBackupKey(userId, key);
    if (date !== null) dated.set(date, key);
  }
  const dates = [...dated.keys()].sort().reverse();
  const keepDates = new Set(dates.slice(0, KEEP_LATEST_FILES));
  const older = dates.slice(KEEP_LATEST_FILES);
  if (older.length > 0) {
    const boundaryWeek = isoWeek(dates[KEEP_LATEST_FILES - 1]);
    const seen = new Set<string>();
    for (const date of older) {
      const week = isoWeek(date);
      if (week === boundaryWeek || seen.has(week)) continue;
      if (seen.size >= KEEP_EARLIER_WEEKS) break;
      seen.add(week);
      keepDates.add(date); // `older` runs newest first, so this is the week's latest file
    }
  }
  const keep: string[] = [];
  const remove: string[] = [];
  for (const date of dates) (keepDates.has(date) ? keep : remove).push(dated.get(date)!);
  return { keep, remove };
}

export const KEEP_PRE_RESTORE_FILES = 5;

/**
 * Of the account's pre-restore files keeps the 5 latest by their time, plus `chosenKey` when it is
 * one of them: the file a restore is about to read is never removed, even when it is the oldest.
 * Only pre-restore keys of this account are planned; date slots and identity.json are untouched.
 */
export function planPreRestorePrune(userId: string, keys: string[], chosenKey: string | null): PrunePlan {
  const files = keys
    .map((key) => ({ key, at: parsePreRestoreKey(userId, key) }))
    .filter((f): f is { key: string; at: number } => f.at !== null)
    .sort((a, b) => b.at - a.at);
  const keep = new Set(files.slice(0, KEEP_PRE_RESTORE_FILES).map((f) => f.key));
  if (chosenKey !== null && files.some((f) => f.key === chosenKey)) keep.add(chosenKey);
  return {
    keep: files.filter((f) => keep.has(f.key)).map((f) => f.key),
    remove: files.filter((f) => !keep.has(f.key)).map((f) => f.key),
  };
}
