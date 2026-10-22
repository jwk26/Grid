import { Client } from "pg";

export type DbActor = { role: "anon" | "authenticated" | "service_role"; userId?: string };

// Runs `fn` in one transaction acting as the given role and user (JWT claims set
// the way PostgREST does), then rolls back, so table-level checks leave no rows.
export async function withActor<T>(actor: DbActor, fn: (db: Client) => Promise<T>): Promise<T> {
  const url = process.env.SUPABASE_TEST_DB_URL;
  if (!url) throw new Error("SUPABASE_TEST_DB_URL is not set; run through pnpm test:db");
  const db = new Client({ connectionString: url });
  await db.connect();
  try {
    await db.query("begin");
    const claims = JSON.stringify({ role: actor.role, ...(actor.userId ? { sub: actor.userId } : {}) });
    await db.query("select set_config('request.jwt.claims', $1, true)", [claims]);
    await db.query(`set local role ${actor.role}`);
    return await fn(db);
  } finally {
    await db.query("rollback").catch(() => undefined);
    await db.end();
  }
}
