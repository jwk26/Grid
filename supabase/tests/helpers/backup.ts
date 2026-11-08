import type { Client } from "pg";

// The backup functions of SCHEMA §Backup functions that exist from Phase 52: the only `public`
// functions that are not client functions. `security invoker`, owned by postgres, executable by
// service_role alone. Phase 53 (Task 260) adds restore_begin, restore_stage and restore_abort.
export const BACKUP_FUNCTIONS = [
  "export_account",
  "backup_fingerprint",
  "backup_begin",
  "backup_finish",
  "backup_read_status",
  "backup_summary",
  "backup_account_check",
  "backup_due_deletions",
  "backup_deletion_done",
  "backup_deletion_failed",
  "restore_begin",
  "restore_stage",
  "restore_abort",
] as const;

export const MIN = 60_000;

export type BackupEnvelope = {
  status: string;
  result: Record<string, any> | null; // eslint-disable-line @typescript-eslint/no-explicit-any
  rejection?: { code: string };
};

export async function backupRow(db: Client, userId: string): Promise<Record<string, any> | undefined> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const { rows } = await db.query("select * from app.backup_status where user_id = $1", [userId]);
  return rows[0];
}
