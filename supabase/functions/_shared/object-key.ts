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
