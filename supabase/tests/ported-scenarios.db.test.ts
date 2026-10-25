import { randomUUID } from "node:crypto";
import type { Client } from "pg";
import { describe, expect, it } from "vitest";
import { baseEntities } from "@/lib/db/boundary-cases";
import { accountToRow, bitToRow, chunkToRow, nodeToRow } from "@/lib/db/row-mapping";
import type { Bit, Chunk, Node } from "@/lib/db/schema";
import { becomeActor, connect, insertRow, withActor } from "./helpers/db";
import { createTestUser, type TestUser } from "./helpers/users";

// Scenarios ported from the Dexie suites (Task 219, Stage 3), the answer key for the functions of
// Stages 1 and 2: `revision`, `deadline-hierarchy` and the create/update scenarios of
// `indexeddb.test.ts`. The other source suites are ported next to their functions:
//   mtime-cascade     -> node-bit-writes ("edits fields…", "a position-only change…") and
//                        chunk-writes ("a status change completes…")
//   auto-completion   -> chunk-writes ("a status change completes…", "unchecking returns…",
//                        "sticky force-complete…", "deleting the last incomplete Chunk…")
//   grid-uniqueness   -> node-bit-writes ("rejects a taken cell…", "moves to another Node…",
//                        "keeps the Scratch sentinel…")
// Source numbers (version, mtime) are kept where the scenario depends on them.

type Row = Record<string, unknown>;
type Envelope = { status: string; result: unknown; changes: Record<string, { upserted: Row[]; deleted: string[] }>; rejection?: { code: string; table?: string } };

const call = async (db: Client, fn: string, args: unknown[]): Promise<Envelope> => {
  const marks = args.map((a, i) => (a !== null && typeof a === "object" && !Array.isArray(a) ? `$${i + 1}::jsonb` : `$${i + 1}`));
  const values = args.map((a) => (a !== null && typeof a === "object" && !Array.isArray(a) ? JSON.stringify(a) : a));
  return (await db.query(`select public.${fn}(${marks.join(", ")}) as e`, values)).rows[0].e as Envelope;
};
const updateNode = (db: Client, id: string, changes: unknown) => call(db, "update_node", [id, changes]);
const updateBit = (db: Client, id: string, changes: unknown) => call(db, "update_bit", [id, changes]);
const createNode = (db: Client, values: unknown) => call(db, "create_node", [randomUUID(), values]);
const createBit = (db: Client, values: unknown) => call(db, "create_bit", [randomUUID(), values]);
const createChunk = (db: Client, values: unknown) => call(db, "create_chunk", [randomUUID(), values]);
const deleteChunk = (db: Client, id: string) => call(db, "delete_chunk", [id]);

async function account(db: Client, userId: string) {
  await insertRow(db, "accounts", accountToRow({ userId, createdAt: 1, lastVisitAt: 1, seededAt: null, deletionRequestedAt: null }));
}
const addNode = async (db: Client, o: Partial<Node>, userId: string): Promise<string> => {
  const id = o.id ?? randomUUID();
  await insertRow(db, "nodes", nodeToRow({ ...baseEntities.node, ...o, id }, userId));
  return id;
};
const addBit = async (db: Client, o: Partial<Bit>, userId: string): Promise<string> => {
  const id = o.id ?? randomUUID();
  await insertRow(db, "bits", bitToRow({ ...baseEntities.bit, ...o, id }, userId));
  return id;
};
const addChunk = async (db: Client, o: Partial<Chunk>, userId: string): Promise<string> => {
  const id = o.id ?? randomUUID();
  await insertRow(db, "chunks", chunkToRow({ ...baseEntities.chunk, ...o, id }, userId));
  return id;
};
const row = async (db: Client, table: "nodes" | "bits" | "chunks", id: string) =>
  (await db.query(`select * from app.${table} where id = $1`, [id])).rows[0] as Row;
const DAY = 86_400_000;

// A fresh committed-free account per test: all work happens in one rolled-back transaction.
async function inAccount<T>(
  run: (db: Client, ctx: { u: TestUser; node: (o?: Partial<Node>) => Promise<string>; bit: (o?: Partial<Bit>) => Promise<string>; chunk: (o?: Partial<Chunk>) => Promise<string> }) => Promise<T>,
): Promise<T> {
  const u = await createTestUser("ps");
  return withActor({ role: "authenticated", userId: u.id }, async (db, owner) => {
    await owner(() => account(db, u.id));
    return run(db, {
      u,
      node: (o = {}) => owner(() => addNode(db, o, u.id)),
      bit: (o = {}) => owner(() => addBit(db, o, u.id)),
      chunk: (o = {}) => owner(() => addChunk(db, o, u.id)),
    });
  });
}

describe("revision (monotonic record revisions)", () => {
  it("increments a Node once per logical patch and keeps no-op and ABA distinguishable", async () => {
    await inAccount(async (db, { node }) => {
      const id = await node({ title: "A", version: 4, x: 3, y: 3 });
      await updateNode(db, id, { title: "B", icon: "star" });
      expect(await row(db, "nodes", id)).toMatchObject({ title: "B", icon: "star", version: 5 });
      await updateNode(db, id, { title: "B", icon: "star" });
      expect((await row(db, "nodes", id)).version).toBe(5);
      await updateNode(db, id, { title: "A" });
      expect(await row(db, "nodes", id)).toMatchObject({ title: "A", version: 6 });
    });
  });

  it("derives mtime from the fields that actually changed", async () => {
    await inAccount(async (db, { node }) => {
      const id = await node({ title: "Same", version: 2, mtime: 222, x: 0, y: 4 });
      await updateNode(db, id, { title: "Same", x: 3 });
      expect(await row(db, "nodes", id)).toMatchObject({ title: "Same", x: 3, mtime: "222", version: 3 });
    });
  });

  it("increments a Bit once for a position-only patch without changing mtime", async () => {
    await inAccount(async (db, { node, bit }) => {
      const parent = await node({ x: 3, y: 3 });
      const id = await bit({ parentId: parent, version: 8, mtime: 123, x: 0, y: 0 });
      await updateBit(db, id, { x: 2, y: 3 });
      expect(await row(db, "bits", id)).toMatchObject({ x: 2, y: 3, mtime: "123", version: 9 });
    });
  });

  it("keeps parent revisions neutral while direct child mutations advance once", async () => {
    await inAccount(async (db, { node }) => {
      const parent = await node({ version: 10, x: 3, y: 3 });
      const created = await createNode(db, { title: "Child", color: "hsl(210, 80%, 55%)", icon: "folder", parent_id: parent, x: 1, y: 0 });
      const childId = (created.result as { id: string }).id;
      expect((await row(db, "nodes", childId)).version).toBe(1);
      expect((await row(db, "nodes", parent)).version).toBe(10);

      await updateNode(db, childId, { title: "Renamed child", color: "hsl(220, 70%, 50%)" });
      expect((await row(db, "nodes", childId)).version).toBe(2);
      expect((await row(db, "nodes", parent)).version).toBe(10);

      const bitId = ((await createBit(db, { title: "Child bit", icon: "circle", parent_id: parent, x: 2, y: 0 })).result as { id: string }).id;
      expect((await row(db, "bits", bitId)).version).toBe(1);
      expect((await row(db, "nodes", parent)).version).toBe(10);

      await updateBit(db, bitId, { title: "Renamed bit", priority: "high" });
      expect((await row(db, "bits", bitId)).version).toBe(2);

      const chunkId = ((await createChunk(db, { title: "Child chunk", parent_id: bitId, order: 0 })).result as { id: string }).id;
      expect((await row(db, "bits", bitId)).version).toBe(2);
      expect((await row(db, "nodes", parent)).version).toBe(10);

      await deleteChunk(db, chunkId);
      expect((await row(db, "bits", bitId)).version).toBe(2);
      expect((await row(db, "nodes", parent)).version).toBe(10);
    });
  });

  it("increments a Bit only when Chunk membership changes its status", async () => {
    await inAccount(async (db, { node, bit, chunk }) => {
      const parent = await node({ version: 6, x: 3, y: 3 });
      const b = await bit({ parentId: parent, status: "complete", version: 4 });
      const existing = await chunk({ parentId: b, status: "incomplete", order: 0 });
      await createChunk(db, { title: "New child", parent_id: b, order: 1 });
      expect(await row(db, "bits", b)).toMatchObject({ status: "active", version: 5 });
      expect((await row(db, "nodes", parent)).version).toBe(6);
      await deleteChunk(db, existing);
      expect((await row(db, "bits", b)).version).toBe(5);
      expect((await row(db, "nodes", parent)).version).toBe(6);
    });
  });
});

describe("revision: concurrent patches (S30)", () => {
  async function open(u: TestUser): Promise<Client> {
    const db = await connect();
    await db.query("begin");
    await becomeActor(db, { role: "authenticated", userId: u.id });
    return db;
  }

  // Two sessions patch one record: the first stays uncommitted, the second must wait on its
  // lock and then apply on top of it.
  async function twoPatches(label: string, kind: "nodes" | "bits") {
    const u = await createTestUser(label);
    const owner = await connect();
    const a = await open(u);
    const b = await open(u);
    const watcher = await connect();
    try {
      await account(owner, u.id);
      const parent = await addNode(owner, { x: 3, y: 3, title: "A", icon: "folder", version: 4 }, u.id);
      const id = kind === "nodes" ? parent : await addBit(owner, { parentId: parent, title: "A", priority: null, version: 4 }, u.id);
      const patch = (db: Client, changes: unknown) => (kind === "nodes" ? updateNode(db, id, changes) : updateBit(db, id, changes));
      await patch(a, { title: "B" });
      const pending = patch(b, kind === "nodes" ? { icon: "star" } : { priority: "high" });
      for (let i = 0; i < 80; i += 1) {
        const { rows } = await watcher.query("select 1 from pg_stat_activity where wait_event_type = 'Lock' and state = 'active' and query like $1", [kind === "nodes" ? "%update_node%" : "%update_bit%"]);
        if (rows.length > 0) break;
        if (i === 79) throw new Error("the second patch never waited for the first");
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      await a.query("commit");
      await pending;
      await b.query("commit");
      const after = await row(owner, kind, id);
      const c = await open(u);
      try {
        await patch(c, { title: "A" });
        await c.query("commit");
      } finally {
        await c.query("rollback").catch(() => undefined);
        await c.end();
      }
      return { after, aba: await row(owner, kind, id) };
    } finally {
      await a.query("rollback").catch(() => undefined);
      await b.query("rollback").catch(() => undefined);
      for (const c of [a, b, watcher, owner]) await c.end();
    }
  }

  it("serializes concurrent Node patches without losing either field or revision", async () => {
    const { after, aba } = await twoPatches("ps-nc", "nodes");
    expect(after).toMatchObject({ title: "B", icon: "star", version: 6 });
    expect(aba).toMatchObject({ title: "A", icon: "star", version: 7 });
  }, 30_000);

  it("serializes concurrent Bit patches without losing either field or revision", async () => {
    const { after, aba } = await twoPatches("ps-bc", "bits");
    expect(after).toMatchObject({ title: "B", priority: "high", version: 6 });
    expect(aba).toMatchObject({ title: "A", priority: "high", version: 7 });
  }, 30_000);
});

describe("deadline hierarchy", () => {
  it("setting a child deadline within the parent deadline succeeds (version + 1)", async () => {
    await inAccount(async (db, { node, bit }) => {
      const parent = await node({ deadline: 1_700_000_000_000 + 7 * DAY, x: 3, y: 3 });
      const b = await bit({ parentId: parent, version: 3 });
      expect((await updateBit(db, b, { deadline: 1_700_000_000_000 + 5 * DAY })).status).toBe("applied");
      expect((await row(db, "bits", b)).version).toBe(4);
    });
  });

  it("a child deadline past the parent's is rejected and the version stays", async () => {
    await inAccount(async (db, { node, bit }) => {
      const parent = await node({ deadline: 1_700_000_000_000 + 7 * DAY, x: 3, y: 3 });
      const b = await bit({ parentId: parent, version: 5 });
      expect(await updateBit(db, b, { deadline: 1_700_000_000_000 + 10 * DAY })).toMatchObject({
        status: "rejected", rejection: { code: "deadline_exceeds_parent" },
      });
      expect((await row(db, "bits", b)).version).toBe(5);
    });
  });

  it("allows a timed child on the same day when the parent deadline is all-day", async () => {
    await inAccount(async (db, { node, bit }) => {
      const day = Date.UTC(2026, 3, 12);
      const parent = await node({ deadline: day, deadlineAllDay: true, x: 3, y: 3 });
      const b = await bit({ parentId: parent });
      expect((await updateBit(db, b, { deadline: day + 18 * 3_600_000, deadline_all_day: false })).status).toBe("applied");
    });
  });

  it("rejects an all-day chunk when a timed bit deadline is earlier that same day", async () => {
    await inAccount(async (db, { node, bit }) => {
      const day = Date.UTC(2026, 3, 12);
      const parent = await node({ x: 3, y: 3 });
      const b = await bit({ parentId: parent, deadline: day + 10 * 3_600_000, deadlineAllDay: false, version: 6 });
      expect(await createChunk(db, { title: "Chunk", parent_id: b, order: 0, time: day, time_all_day: true })).toMatchObject({
        status: "rejected", rejection: { code: "deadline_exceeds_parent", table: "bits" },
      });
      expect((await row(db, "bits", b)).version).toBe(6);
    });
  });

  it("rejects child node creation when the deadline exceeds the parent's all-day deadline", async () => {
    await inAccount(async (db, { node }) => {
      const parent = await node({ deadline: Date.UTC(2026, 3, 20), deadlineAllDay: true, x: 3, y: 3 });
      expect(
        await createNode(db, { title: "Child", color: "hsl(210, 80%, 55%)", icon: "folder", deadline: Date.UTC(2026, 3, 21, 10), deadline_all_day: false, parent_id: parent, x: 1, y: 0 }),
      ).toMatchObject({ status: "rejected", rejection: { code: "deadline_exceeds_parent" } });
    });
  });
});

describe("create metadata (indexeddb.test.ts)", () => {
  it("creates a Node with generated metadata and holds its cell", async () => {
    await inAccount(async (db) => {
      const created = await createNode(db, { title: "Inbox", color: "hsl(210, 80%, 55%)", icon: "inbox", x: 2, y: 3 });
      const n = await row(db, "nodes", (created.result as { id: string }).id);
      expect(n).toMatchObject({ deleted_at: null, version: 1, past_deadline_dismissed: false, level: 0, parent_id: null });
      expect(Number(n.created_at)).toBeGreaterThan(0);
      expect(Number(n.mtime)).toBeGreaterThan(0);
      expect(await createNode(db, { title: "Other", color: "hsl(210, 80%, 55%)", icon: "x", x: 2, y: 3 })).toMatchObject({
        rejection: { code: "cell_taken" },
      });
    });
  });

  it("creates a Bit with version 1 and past_deadline_dismissed false", async () => {
    await inAccount(async (db, { node }) => {
      const parent = await node({ x: 3, y: 3 });
      const created = await createBit(db, { title: "Scratch", icon: "circle", parent_id: parent, x: 0, y: 0 });
      expect(await row(db, "bits", (created.result as { id: string }).id)).toMatchObject({ version: 1, past_deadline_dismissed: false, status: "active" });
    });
  });
});
