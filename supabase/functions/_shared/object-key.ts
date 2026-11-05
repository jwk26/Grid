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
