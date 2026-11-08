// Pure helpers for backup object keys (SCHEMA §Account backup, Keys). Imported
// by the Edge Function with a relative path and by `src/` as
// `@edge-shared/object-key.ts`.

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * The R2 key of one account's backup for the UTC date of `at`:
 * `accounts/<user_id>/YYYY-MM-DD.json.gz`. A second run on the same UTC day
 * maps to the same key and overwrites that day's file. The user id must be a
 * lowercase UUID.
 */
export function backupObjectKey(userId: string, at: Date): string {
  if (!UUID_PATTERN.test(userId)) {
    throw new Error("userId must be a lowercase UUID");
  }
  if (Number.isNaN(at.getTime())) {
    throw new Error("at must be a valid date");
  }
  const utcDate = at.toISOString().slice(0, 10);
  return `accounts/${userId}/${utcDate}.json.gz`;
}

/** The prefix under which every object of one account lives. */
export function accountPrefix(userId: string): string {
  if (!UUID_PATTERN.test(userId)) {
    throw new Error("userId must be a lowercase UUID");
  }
  return `accounts/${userId}/`;
}

/** The key of the account's identity file (providers and provider user ids). */
export function identityKey(userId: string): string {
  return `${accountPrefix(userId)}identity.json`;
}

/**
 * The UTC date (`YYYY-MM-DD`) of a dated backup key of this account, or null for
 * any other key (identity.json, pre-restore files, another account's key).
 */
export function parseBackupKey(userId: string, key: string): string | null {
  const prefix = accountPrefix(userId);
  if (!key.startsWith(prefix)) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})\.json\.gz$/.exec(key.slice(prefix.length));
  if (!match) return null;
  const date = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  const date10 = date.toISOString().slice(0, 10);
  return date10 === key.slice(prefix.length, prefix.length + 10) ? date10 : null;
}

/** The time part of a pre-restore key: `YYYY-MM-DDTHH-MM-SSZ` (UTC, no colon, so the key is plain). */
const PRE_RESTORE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})Z$/;

/** `accounts/<user_id>/pre-restore/<UTC time>.json.gz` for the export taken just before a restore. */
export function preRestoreKey(userId: string, at: Date): string {
  if (Number.isNaN(at.getTime())) throw new Error("at must be a valid date");
  const time = at.toISOString().slice(0, 19).replace(/:/g, "-") + "Z";
  return `${accountPrefix(userId)}pre-restore/${time}.json.gz`;
}

/** The epoch ms of a pre-restore key of this account, or null for any other key. */
export function parsePreRestoreKey(userId: string, key: string): number | null {
  const prefix = `${accountPrefix(userId)}pre-restore/`;
  if (!key.startsWith(prefix) || !key.endsWith(".json.gz")) return null;
  return parsePreRestoreTime(key.slice(prefix.length, -".json.gz".length));
}

/** The epoch ms of a pre-restore time part, or null when it is not a real UTC time in that shape. */
export function parsePreRestoreTime(time: string): number | null {
  const m = PRE_RESTORE_TIME.exec(time);
  if (!m) return null;
  const iso = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toISOString().slice(0, 19) + "Z" === iso ? ms : null;
}
