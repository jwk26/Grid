import { Client } from "pg";

export type DbActor =
  | { role: "owner" }
  | { role: "anon" | "authenticated" | "service_role"; userId?: string };

export async function connect(): Promise<Client> {
  const url = process.env.SUPABASE_TEST_DB_URL;
  if (!url) throw new Error("SUPABASE_TEST_DB_URL is not set; run through pnpm test:db");
  const db = new Client({ connectionString: url });
  await db.connect();
  return db;
}

// Switches the open transaction to `actor`: JWT claims set the way PostgREST does, then
// the role. It asserts the switch took effect, so a test never runs as the wrong identity.
export async function becomeActor(db: Client, actor: DbActor): Promise<void> {
  if (actor.role === "owner") {
    await db.query("reset role");
    return;
  }
  await db.query("reset role");
  const claims = JSON.stringify({ role: actor.role, ...(actor.userId ? { sub: actor.userId } : {}) });
  await db.query("select set_config('request.jwt.claims', $1, true)", [claims]);
  await db.query(`set local role ${actor.role}`);
  const { rows } = await db.query("select current_user as role, auth.uid()::text as uid");
  if (rows[0].role !== actor.role) {
    throw new Error(`expected role ${actor.role}, got ${rows[0].role}`);
  }
  if ((rows[0].uid ?? undefined) !== actor.userId) {
    throw new Error(`expected auth.uid() ${actor.userId}, got ${rows[0].uid}`);
  }
}

// Runs `fn` in one transaction acting as the given role and user, then rolls back, so
// table-level checks leave no rows. `owner` runs a statement as the database owner (to
// seed rows) and returns to the actor afterwards. A failed statement aborts the
// transaction, so use one `withActor` per statement that is expected to fail.
export async function withActor<T>(
  actor: DbActor,
  fn: (db: Client, owner: <R>(run: () => Promise<R>) => Promise<R>) => Promise<T>,
): Promise<T> {
  const db = await connect();
  try {
    await db.query("begin");
    await becomeActor(db, actor);
    const owner = async <R>(run: () => Promise<R>): Promise<R> => {
      await becomeActor(db, { role: "owner" });
      try {
        return await run();
      } finally {
        await becomeActor(db, actor);
      }
    };
    return await fn(db, owner);
  } finally {
    await db.query("rollback").catch(() => undefined);
    await db.end();
  }
}

export async function expectDbError(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
  } catch (error) {
    return (error as { code?: string }).code ?? "";
  }
  throw new Error("expected the statement to fail, but it succeeded");
}

export async function insertRow(db: Client, table: string, row: Record<string, unknown>) {
  const keys = Object.keys(row);
  const columns = keys.map((key) => `"${key}"`).join(", ");
  const params = keys.map((_, index) => `$${index + 1}`).join(", ");
  await db.query(`insert into app.${table} (${columns}) values (${params})`, keys.map((key) => row[key]));
}
