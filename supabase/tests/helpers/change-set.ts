import { isDeepStrictEqual } from "node:util";
import type { Client } from "pg";

// The change-set match (S31): the snapshot before a call plus the envelope's `changes` equals
// a fresh snapshot after it.

export const SNAPSHOT_TABLES = [
  "nodes",
  "bits",
  "chunks",
  "scratch_breakdowns",
  "staged_candidates",
] as const;
export type SnapshotTable = (typeof SNAPSHOT_TABLES)[number];

export type Row = Record<string, unknown> & { id: string; user_id: string };
export type SnapshotValue = Partial<Record<SnapshotTable, Row[]>> & { rejection?: { code: string } };
export type Changes = Partial<Record<SnapshotTable, { upserted: Row[]; deleted: string[] }>>;
export type Envelope = {
  status: string;
  result: unknown;
  changes: Changes;
  rejection?: { code: string };
};

// A rejection (no `accounts` row yet) is an empty account.
function rowsOf(snapshot: SnapshotValue, table: SnapshotTable): Row[] {
  return snapshot[table] ?? [];
}

// Returns the problems found; an empty list is a match. `userId` is the caller: a row of any
// other account in `changes` is a problem even when the snapshots happen to agree.
export function diffChangeSet(
  before: SnapshotValue,
  changes: Changes,
  after: SnapshotValue,
  userId: string,
): string[] {
  const problems: string[] = [];
  for (const key of Object.keys(changes)) {
    if (!(SNAPSHOT_TABLES as readonly string[]).includes(key)) problems.push(`changes hold an unknown key (${key})`);
  }
  for (const table of SNAPSHOT_TABLES) {
    const change = changes[table];
    for (const row of change?.upserted ?? []) {
      if (row.user_id !== userId) problems.push(`${table}: changes hold a row of another account (${row.id})`);
    }
    const expected = new Map(rowsOf(before, table).map((row) => [row.id, row]));
    for (const id of change?.deleted ?? []) {
      if (!expected.has(id)) problems.push(`${table}: changes delete ${id}, which the snapshot before does not hold`);
      expected.delete(id);
    }
    for (const row of change?.upserted ?? []) expected.set(row.id, row);
    const actual = new Map(rowsOf(after, table).map((row) => [row.id, row]));
    const ids = [...new Set([...expected.keys(), ...actual.keys()])].sort();
    for (const id of ids) {
      const want = expected.get(id);
      const got = actual.get(id);
      if (!want) problems.push(`${table}: ${id} is in the snapshot after but not in before + changes`);
      else if (!got) problems.push(`${table}: ${id} is in before + changes but not in the snapshot after`);
      else if (!isDeepStrictEqual(want, got)) problems.push(`${table}: ${id} differs between before + changes and after`);
    }
  }
  return problems;
}

async function snapshotOf(db: Client): Promise<SnapshotValue> {
  const { rows } = await db.query("select public.get_snapshot() as s");
  return rows[0].s as SnapshotValue;
}

// `db` is already acting as the caller (inside `withActor`). Runs `call`, which returns the
// function's envelope, and throws with every problem found. Returns the envelope.
export async function assertChangeSet(
  db: Client,
  userId: string,
  call: (db: Client) => Promise<Envelope>,
): Promise<Envelope> {
  const before = await snapshotOf(db);
  const envelope = await call(db);
  const after = await snapshotOf(db);
  const problems = diffChangeSet(before, envelope.changes ?? {}, after, userId);
  if (problems.length > 0) throw new Error(`change set does not match the snapshot:\n${problems.join("\n")}`);
  return envelope;
}
