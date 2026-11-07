import type { Client } from "pg";
import { becomeActor, connect, type DbActor } from "./db";
import type { TestUser } from "./users";

// Shared pieces of the restore suites (Task 260). Every call here commits, as the real calls do;
// each suite uses its own users, so committed rows never collide.

export const service = { role: "service_role" as const };
export const authedUser = (u: TestUser) => ({ role: "authenticated" as const, userId: u.id });

export type RestoreEnvelope = {
  status: string;
  result: Record<string, any> | null; // eslint-disable-line @typescript-eslint/no-explicit-any
  rejection?: { code: string };
};

export async function commitAs<T>(actor: DbActor, fn: (db: Client) => Promise<T>): Promise<T> {
  const db = await connect();
  try {
    await db.query("begin");
    await becomeActor(db, actor);
    const out = await fn(db);
    await db.query("commit");
    return out;
  } catch (error) {
    await db.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await db.end();
  }
}

const one = <T = RestoreEnvelope>(actor: DbActor, text: string, params: unknown[]): Promise<T> =>
  commitAs(actor, async (db) => (await db.query(text, params)).rows[0].r as T);

export const beginRestore = (userId: string, restoreId: string) =>
  one(service, "select public.restore_begin($1, $2) as r", [userId, restoreId]);

export const stageRestore = (userId: string, restoreId: string, payload: unknown) =>
  one(service, "select public.restore_stage($1, $2, $3::jsonb) as r", [userId, restoreId, JSON.stringify(payload)]);

export const abortRestore = (userId: string, restoreId: string, reason = "upload_failed") =>
  one(service, "select public.restore_abort($1, $2, $3) as r", [userId, restoreId, reason]);

export const restoreAs = (u: TestUser, restoreId: string, fingerprint: string | null) =>
  one(authedUser(u), "select public.restore_account($1, $2) as r", [restoreId, fingerprint]);

export const exportOf = (userId: string) =>
  one<Record<string, any>>(service, "select public.export_account($1) as r", [userId]); // eslint-disable-line @typescript-eslint/no-explicit-any

export const fingerprintOf = (userId: string) =>
  one<string>(service, "select public.backup_fingerprint($1) as r", [userId]);

export const verdictOf = (userId: string, restoreId: string) =>
  one<RestoreEnvelope>(service, "select public.backup_read_status($1, null, $2) as r", [userId, restoreId]).then(
    (e) => e.result!.restore_verdict as string,
  );

// A statement as the table owner (the test database's postgres), committed.
export async function owner<T = Record<string, any>>(text: string, params: unknown[] = []): Promise<T[]> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const db = await connect();
  try {
    return (await db.query(text, params)).rows as T[];
  } finally {
    await db.end();
  }
}

export const stagingRow = async (restoreId: string) =>
  (await owner("select * from app.restore_staging where id = $1", [restoreId]))[0];

// Moves the restore clocks into the past so a test need not wait: the staging row's start (the
// 180 s verdict), and the backup_status start (the 10 minute rate limit).
export const ageRestore = async (userId: string, restoreId: string, ms: number) => {
  await owner("update app.restore_staging set created_at = created_at - $2 where id = $1", [restoreId, ms]);
  await owner("update app.backup_status set restore_started_at = restore_started_at - $2 where user_id = $1", [userId, ms]);
};

export const TABLE_KEYS = ["nodes", "bits", "chunks", "scratch_breakdowns", "staged_candidates"] as const;
