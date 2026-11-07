// The account's backup files as the restore dialog lists them, and the file a restore request
// names (SCHEMA §Account backup, Restore). Pure. The request names a file by a list name, never by
// an object key, so a restore can only read inside the caller's own prefix.

import { accountPrefix, parseBackupKey, parsePreRestoreKey, parsePreRestoreTime } from "./object-key.ts";

export type BackupEntry = {
  /** `YYYY-MM-DD` for a date slot, `pre-restore/<UTC time>` for a pre-restore file. */
  name: string;
  kind: "daily" | "pre_restore";
  /** Epoch ms: the object's own last-modified time, else the time its name carries. */
  at: number;
  size: number;
};

export type ListedFile = { key: string; size: number; lastModified?: number };

const DAILY_NAME = /^\d{4}-\d{2}-\d{2}$/;
const PRE_RESTORE_NAME = /^pre-restore\/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z)$/;

/** The object key a list name stands for in this account, or null when the name is not a valid one. */
export function resolveBackupName(userId: string, name: unknown): string | null {
  if (typeof name !== "string") return null;
  if (DAILY_NAME.test(name)) {
    const key = `${accountPrefix(userId)}${name}.json.gz`;
    return parseBackupKey(userId, key) === name ? key : null;
  }
  const m = PRE_RESTORE_NAME.exec(name);
  if (m && parsePreRestoreTime(m[1]) !== null) return `${accountPrefix(userId)}${name}.json.gz`;
  return null;
}

/** True when `name` has the shape of a list name (the account is checked later). */
export function isBackupName(name: unknown): name is string {
  if (typeof name !== "string") return false;
  if (DAILY_NAME.test(name)) {
    const d = new Date(`${name}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === name;
  }
  const m = PRE_RESTORE_NAME.exec(name);
  return m !== null && parsePreRestoreTime(m[1]) !== null;
}

/** Date slots and pre-restore files of the account, newest first by their time. identity.json and strangers are left out. */
export function buildBackupList(userId: string, listed: ListedFile[]): BackupEntry[] {
  const out: BackupEntry[] = [];
  for (const o of listed) {
    const date = parseBackupKey(userId, o.key);
    if (date !== null) {
      out.push({ name: date, kind: "daily", at: o.lastModified ?? Date.parse(`${date}T00:00:00Z`), size: o.size });
      continue;
    }
    const time = parsePreRestoreKey(userId, o.key);
    if (time !== null) {
      const name = o.key.slice(accountPrefix(userId).length, -".json.gz".length);
      out.push({ name, kind: "pre_restore", at: o.lastModified ?? time, size: o.size });
    }
  }
  return out.sort((a, b) => b.at - a.at || (a.name < b.name ? 1 : -1));
}
