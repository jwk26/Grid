import { randomUUID } from "node:crypto";
import type { Client } from "pg";
import { baseEntities } from "@/lib/db/boundary-cases";
import { accountToRow, bitToRow, chunkToRow, nodeToRow } from "@/lib/db/row-mapping";
import type { Bit, Chunk, Node } from "@/lib/db/schema";
import { becomeActor, connect, insertRow } from "./db";
import { createTestUser, type TestUser } from "./users";

// Shared pieces of the lifecycle write suites (Task 220): calling a function, seeding rows as
// the table owner, and reading a stored row.

export type Row = Record<string, unknown>;
export type Table = { upserted: Row[]; deleted: string[] };
export type Envelope = {
  status: string;
  result: unknown;
  changes: { nodes?: Table; bits?: Table; chunks?: Table };
  rejection?: { code: string; table?: string; limit?: number };
};
export type Owner = <R>(run: () => Promise<R>) => Promise<R>;

export const authed = (u: TestUser) => ({ role: "authenticated" as const, userId: u.id });

export async function call(db: Client, fn: string, args: unknown[]): Promise<Envelope> {
  const isJson = (a: unknown) => a !== null && typeof a === "object" && !Array.isArray(a);
  const params = args.map((a, i) => (isJson(a) ? `$${i + 1}::jsonb` : Array.isArray(a) && a.some(isJson) ? `$${i + 1}::jsonb` : `$${i + 1}`));
  const values = args.map((a) => (isJson(a) || (Array.isArray(a) && a.some(isJson)) ? JSON.stringify(a) : a));
  const { rows } = await db.query(`select public.${fn}(${params.join(", ")}) as e`, values);
  return rows[0].e as Envelope;
}

export async function account(db: Client, userId: string) {
  await insertRow(
    db,
    "accounts",
    accountToRow({ userId, createdAt: 1, lastVisitAt: 1, seededAt: null, deletionRequestedAt: null }),
  );
}
export async function addNode(db: Client, userId: string, overrides: Partial<Node> = {}): Promise<string> {
  const id = overrides.id ?? randomUUID();
  await insertRow(db, "nodes", nodeToRow({ ...baseEntities.node, ...overrides, id }, userId));
  return id;
}
export async function addBit(db: Client, userId: string, overrides: Partial<Bit> = {}): Promise<string> {
  const id = overrides.id ?? randomUUID();
  await insertRow(db, "bits", bitToRow({ ...baseEntities.bit, ...overrides, id }, userId));
  return id;
}
export async function addChunk(db: Client, userId: string, overrides: Partial<Chunk> = {}): Promise<string> {
  const id = overrides.id ?? randomUUID();
  await insertRow(db, "chunks", chunkToRow({ ...baseEntities.chunk, ...overrides, id }, userId));
  return id;
}
export const stored = async (db: Client, table: "nodes" | "bits" | "chunks", id: string) =>
  (await db.query(`select to_jsonb(t.*) as r from app.${table} t where id = $1`, [id])).rows[0]?.r as Row;

// Runs `;`-separated statements; each gets only the parameters it references.
export async function sql(db: Client, text: string, params: unknown[] = []): Promise<void> {
  for (const statement of text.split(";").map((part) => part.trim()).filter(Boolean)) {
    const used = [...new Set([...statement.matchAll(/\$(\d+)/g)].map((match) => Number(match[1])))].sort((a, b) => a - b);
    const renumbered = statement.replace(/\$(\d+)/g, (_, n) => `$${used.indexOf(Number(n)) + 1}`);
    await db.query(renumbered, used.map((n) => params[n - 1]));
  }
}

export const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

// ---------------------------------------------------------------------------------------------
// Concurrency (S30): two sessions on committed data. `race` runs `first` uncommitted, starts
// `second` (it must wait on a lock held by the first), then commits `first`.
export async function openSession(u: TestUser): Promise<Client> {
  const db = await connect();
  await db.query("begin");
  await becomeActor(db, authed(u));
  return db;
}

export async function waitForLockWait(watcher: Client, name: string): Promise<void> {
  for (let i = 0; i < 80; i += 1) {
    const { rows } = await watcher.query(
      "select 1 from pg_stat_activity where wait_event_type = 'Lock' and state = 'active' and query like $1",
      [`%${name}%`],
    );
    if (rows.length > 0) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("the second call never waited for the first");
}

export async function race(
  u: TestUser,
  first: (db: Client) => Promise<Envelope>,
  second: (db: Client) => Promise<Envelope>,
  waiting: string,
): Promise<[Envelope, Envelope]> {
  const a = await openSession(u);
  const b = await openSession(u);
  const watcher = await connect();
  try {
    const firstEnvelope = await first(a);
    const pending = second(b);
    await waitForLockWait(watcher, waiting);
    await a.query("commit");
    const secondEnvelope = await pending;
    await b.query("commit");
    return [firstEnvelope, secondEnvelope];
  } finally {
    await a.query("rollback").catch(() => undefined);
    await b.query("rollback").catch(() => undefined);
    await a.end();
    await b.end();
    await watcher.end();
  }
}

// A user with an account on committed data; `owner` is a plain connection for seeding and reading.
export async function committed(label: string) {
  const u = await createTestUser(label);
  const owner = await connect();
  try {
    await account(owner, u.id);
    return {
      u,
      owner,
      node: (o: Partial<Node> = {}) => addNode(owner, u.id, o),
      bit: (o: Partial<Bit> = {}) => addBit(owner, u.id, o),
      row: async (table: "nodes" | "bits", id: string) => stored(owner, table, id),
    };
  } catch (error) {
    await owner.end();
    throw error;
  }
}
