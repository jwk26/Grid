import { randomUUID } from "node:crypto";
import type { Client } from "pg";
import { beforeAll, describe, expect, it } from "vitest";
import { NODE_ICON_NAMES } from "@/lib/constants/node-icons";
import {
  bitFromRow,
  chunkFromRow,
  nodeFromRow,
  scratchBreakdownFromRow,
  stagedCandidateFromRow,
  type BitRow,
  type ChunkRow,
  type NodeRow,
  type ScratchBreakdownRow,
  type StagedCandidateRow,
} from "@/lib/db/row-mapping";
import { assertChangeSet, type Envelope } from "./helpers/change-set";
import { becomeActor, connect, withActor } from "./helpers/db";
import { createTestUser, type TestUser } from "./helpers/users";

// The demo seed (DP-SAAS-02, Task 237): ensure_account() step 3 copies it into a new guest. The
// copy writes rows without the write functions' checks, so the first group validates the
// copied rows against the data rules directly (SCHEMA Hooks 1, 2, 3, 8, 12, 13, account limits).

const DAY = 86_400_000;
const BLOCK = [
  { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 },
  { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 },
];
const COUNTS = { nodes: 10, bits: 31, chunks: 10, rows: 11, candidates: 2 };

let guest: TestUser;
beforeAll(async () => {
  guest = await createTestUser("ds");
});

const asGuest = (db: Client, u: TestUser) =>
  db.query("select set_config('request.jwt.claims', $1, true)", [
    JSON.stringify({ role: "authenticated", sub: u.id, is_anonymous: true }),
  ]);
const asAccount = (db: Client, u: TestUser) =>
  db.query("select set_config('request.jwt.claims', $1, true)", [
    JSON.stringify({ role: "authenticated", sub: u.id }),
  ]);

async function ensure(db: Client, reserved: unknown = BLOCK): Promise<Envelope> {
  const { rows } = await db.query("select public.ensure_account($1::jsonb) as e", [JSON.stringify(reserved)]);
  return rows[0].e as Envelope;
}

async function inGuest<T>(
  u: TestUser,
  fn: (db: Client, owner: <R>(run: () => Promise<R>) => Promise<R>) => Promise<T>,
): Promise<T> {
  return withActor({ role: "authenticated", userId: u.id }, async (db, owner) => {
    await asGuest(db, u);
    return fn(db, owner);
  });
}

type Snapshot = {
  nodes: NodeRow[];
  bits: BitRow[];
  chunks: ChunkRow[];
  scratch_breakdowns: ScratchBreakdownRow[];
  staged_candidates: StagedCandidateRow[];
};
async function snapshot(db: Client): Promise<Snapshot> {
  return (await db.query("select public.get_snapshot() as s")).rows[0].s as Snapshot;
}

async function seededAt(db: Client, u: TestUser): Promise<number | null> {
  const { rows } = await db.query("select seeded_at from app.accounts where user_id = $1", [u.id]);
  return rows[0].seeded_at === null ? null : Number(rows[0].seeded_at);
}

describe("demo seed: the copied rows", () => {
  it("copies the approved seed into a new guest and sets seeded_at", async () => {
    await inGuest(guest, async (db) => {
      const before = Date.now();
      const envelope = await ensure(db);
      expect(envelope.status).toBe("applied");
      const s = await snapshot(db);
      expect(s.nodes).toHaveLength(COUNTS.nodes);
      expect(s.bits).toHaveLength(COUNTS.bits);
      expect(s.chunks).toHaveLength(COUNTS.chunks);
      expect(s.scratch_breakdowns).toHaveLength(COUNTS.rows);
      expect(s.staged_candidates).toHaveLength(COUNTS.candidates);
      expect(s.bits.filter((b) => b.archived_at !== null)).toHaveLength(2);
      expect(s.bits.filter((b) => b.deleted_at !== null)).toHaveLength(1);
      const at = await seededAt(db, guest);
      expect(at).not.toBeNull();
      expect(at!).toBeGreaterThanOrEqual(before - 5_000);
    });
  });

  it("matches for the first call of a guest, across all five tables", async () => {
    const fresh = await createTestUser("dscs");
    await inGuest(fresh, async (db) => {
      const first = await assertChangeSet(db, fresh.id, (c) => ensure(c));
      expect(first.changes.nodes?.upserted).toHaveLength(COUNTS.nodes);
      expect(first.changes.bits?.upserted).toHaveLength(COUNTS.bits);
      expect(first.changes.chunks?.upserted).toHaveLength(COUNTS.chunks);
      expect(first.changes.scratch_breakdowns?.upserted).toHaveLength(COUNTS.rows);
      expect(first.changes.staged_candidates?.upserted).toHaveLength(COUNTS.candidates);
      const rerun = await assertChangeSet(db, fresh.id, (c) => ensure(c));
      expect(rerun.changes).toEqual({});
    });
  });

  it.each([
    ["with the reserved block", BLOCK],
    ["with the default []", []],
  ])("leaves the reserved block and the system Node cells free %s", async (_label, reserved) => {
    const u = await createTestUser("dsrb");
    await inGuest(u, async (db) => {
      await ensure(db, reserved);
      const s = await snapshot(db);
      const system = s.nodes.filter((n) => n.system_role !== null);
      const seedNodes = s.nodes.filter((n) => n.system_role === null);
      const inReserved = (r: { x: number; y: number }) => r.x < 3 && r.y < 2;
      expect(seedNodes.filter(inReserved)).toEqual([]);
      expect(s.bits.filter(inReserved)).toEqual([]);
      // Inbox and Archive land in the first free cells; no seed item shares an L0 cell with them.
      const l0 = s.nodes.filter((n) => n.parent_id === null);
      const cells = l0.map((n) => `${n.x},${n.y}`);
      expect(new Set(cells).size).toBe(cells.length);
      const wanted = reserved.length > 0 ? ["3,0", "4,0"] : ["0,0", "1,0"];
      expect(system.map((n) => `${n.x},${n.y}`).sort()).toEqual(wanted);
    });
  });

  it("keeps a free original cell and moves a seed row off a hand-made reserved cell", async () => {
    const u = await createTestUser("dsrc");
    await inGuest(u, async (db) => {
      await ensure(db, [...BLOCK.slice(0, 5), { x: 6, y: 2 }]);
      const s = await snapshot(db);
      const web = s.nodes.find((n) => n.title === "사이트 개편")!;
      expect(`${web.x},${web.y}`).not.toBe("6,2");
      const l0 = s.nodes.filter((n) => n.parent_id === null).map((n) => `${n.x},${n.y}`);
      expect(new Set(l0).size).toBe(l0.length);
      const other = s.nodes.find((n) => n.title === "팀 워크숍")!;
      expect(`${other.x},${other.y}`).toBe("8,2");
    });
  });

  it("holds the data rules: cells, levels, versions, hooks, limits, retention", async () => {
    const u = await createTestUser("dsrules");
    await inGuest(u, async (db) => {
      await ensure(db);
      const s = await snapshot(db);
      const at = (await seededAt(db, u))!;
      const nodeById = new Map(s.nodes.map((n) => [n.id, n]));
      const bitById = new Map(s.bits.map((b) => [b.id, b]));
      const inbox = s.nodes.find((n) => n.system_role === "inbox")!;

      // Cell uniqueness across Nodes and Bits per Grid (no constraint holds it).
      const active = [
        ...s.nodes.filter((n) => n.deleted_at === null && n.archived_at === null).map((n) => ({ p: n.parent_id, x: n.x, y: n.y })),
        ...s.bits.filter((b) => b.deleted_at === null && b.archived_at === null).map((b) => ({ p: b.parent_id, x: b.x, y: b.y })),
      ].map((c) => `${c.p}:${c.x},${c.y}`);
      expect(new Set(active).size).toBe(active.length);

      // Hook 8 levels, Hook 12 versions, guest limits.
      for (const n of s.nodes) {
        const parent = n.parent_id ? nodeById.get(n.parent_id)! : null;
        expect(n.level).toBe(parent ? parent.level + 1 : 0);
        expect(n.level).toBeLessThanOrEqual(2);
        expect(n.version).toBe(1);
      }
      for (const row of [...s.bits, ...s.scratch_breakdowns, ...s.staged_candidates]) expect(row.version).toBe(1);
      expect(s.nodes.length).toBeLessThanOrEqual(100);
      expect(s.bits.length).toBeLessThanOrEqual(300);
      expect(s.chunks.length).toBeLessThanOrEqual(1000);
      expect(s.scratch_breakdowns.length).toBeLessThanOrEqual(300);

      // Hook 1: a parent's mtime is never older than a child's mtime, archived_at or deleted_at.
      for (const n of s.nodes) {
        if (!n.parent_id) continue;
        expect(nodeById.get(n.parent_id)!.mtime).toBeGreaterThanOrEqual(n.mtime);
      }
      for (const b of s.bits) {
        const parent = nodeById.get(b.parent_id)!;
        for (const t of [b.mtime, b.archived_at, b.deleted_at]) {
          if (t !== null) expect(parent.mtime).toBeGreaterThanOrEqual(t);
        }
      }

      // Hook 2: deadlines and Chunk times stay inside their parents.
      for (const n of s.nodes) {
        const parent = n.parent_id ? nodeById.get(n.parent_id)! : null;
        if (parent?.deadline != null && n.deadline != null) expect(n.deadline).toBeLessThanOrEqual(parent.deadline);
      }
      for (const b of s.bits) {
        const parent = nodeById.get(b.parent_id)!;
        if (parent.deadline != null && b.deadline != null) expect(b.deadline).toBeLessThanOrEqual(parent.deadline);
        expect(b.deadline_all_day).toBe(false);
      }
      for (const c of s.chunks) {
        const bit = bitById.get(c.parent_id)!;
        if (bit.deadline != null && c.time != null) expect(c.time).toBeLessThanOrEqual(bit.deadline);
        expect(c.time_all_day).toBe(false);
      }

      // Hook 3: a Bit with Chunks is complete exactly when every Chunk is.
      for (const b of s.bits) {
        const own = s.chunks.filter((c) => c.parent_id === b.id);
        if (own.length === 0) continue;
        expect(b.status === "complete").toBe(own.every((c) => c.status === "complete"));
      }

      // Hook 13: every candidate sits on an unconsumed row of an active Inbox Scratch.
      for (const k of s.staged_candidates) {
        const row = s.scratch_breakdowns.find((r) => r.id === k.source_breakdown_id)!;
        const scratch = bitById.get(k.scratch_bit_id)!;
        expect(row.scratch_bit_id).toBe(scratch.id);
        expect(row.consumed_at).toBeNull();
        expect(scratch.parent_id).toBe(inbox.id);
        expect(scratch.deleted_at).toBeNull();
        expect(scratch.archived_at).toBeNull();
      }

      // Trash stays inside the 30-day retention; archived and trashed rows keep original parents.
      for (const b of s.bits.filter((x) => x.deleted_at !== null)) {
        expect(b.deleted_at!).toBeGreaterThan(at - 30 * DAY);
        expect(b.parent_id).not.toBe(inbox.id);
      }

      // Icons: every Node and Bit icon is a known one; Scratches use sparkles.
      for (const n of s.nodes.filter((x) => x.system_role === null)) expect(NODE_ICON_NAMES).toContain(n.icon);
      for (const b of s.bits) {
        if (b.parent_id === inbox.id) expect(b.icon).toBe("sparkles");
        else expect(NODE_ICON_NAMES).toContain(b.icon);
      }
    });
  });

  it("passes the Zod schemas of every table", async () => {
    const u = await createTestUser("dszod");
    await inGuest(u, async (db) => {
      await ensure(db);
      const s = await snapshot(db);
      expect(() => s.nodes.forEach(nodeFromRow)).not.toThrow();
      expect(() => s.bits.forEach(bitFromRow)).not.toThrow();
      expect(() => s.chunks.forEach(chunkFromRow)).not.toThrow();
      expect(() => s.scratch_breakdowns.forEach(scratchBreakdownFromRow)).not.toThrow();
      expect(() => s.staged_candidates.forEach(stagedCandidateFromRow)).not.toThrow();
    });
  });

  it("stores deadlines and modification times relative to the copy time", async () => {
    const u = await createTestUser("dsrel");
    await inGuest(u, async (db) => {
      await ensure(db);
      const s = await snapshot(db);
      const at = (await seededAt(db, u))!;
      const offsite = s.nodes.find((n) => n.title === "팀 워크숍")!;
      expect(offsite.deadline).toBe(at + 3 * DAY);
      expect(offsite.mtime).toBe(at - 4 * DAY);
      const spanish = s.nodes.find((n) => n.title === "스페인어")!;
      expect(spanish.mtime).toBe(at - 14 * DAY);
      const overdue = s.bits.find((b) => b.title === "Redirect the old URLs")!;
      expect(overdue.deadline).toBe(at - DAY);
      const copy = s.bits.find((b) => b.title === "홈페이지 문구 쓰기")!;
      expect(copy.deadline! - at).toBeGreaterThan(0);
      expect(copy.deadline! - at).toBeLessThan(DAY);
      const aging = ["Finish The Pragmatic Programmer", "Read the Postgres docs on RLS",
        "Skim the React 19 release notes", "Reread chapter 3 of Designing Data-Intensive Applications"];
      expect(aging.map((t) => (at - s.bits.find((b) => b.title === t)!.mtime) / DAY)).toEqual([5, 6, 11, 12]);
    });
  });
});

describe("demo seed: who gets it, and once", () => {
  it("gives a real account no seed", async () => {
    const real = await createTestUser("dsreal");
    await withActor({ role: "authenticated", userId: real.id }, async (db) => {
      await asAccount(db, real);
      const envelope = await ensure(db);
      expect(Object.keys(envelope.changes)).toEqual(["nodes"]);
      const s = await snapshot(db);
      expect(s.nodes).toHaveLength(2);
      expect(s.bits).toHaveLength(0);
      expect(await seededAt(db, real)).toBeNull();
    });
  });

  it("does not seed a guest that already holds rows, and keeps seeded_at null", async () => {
    const u = await createTestUser("dshold");
    await inGuest(u, async (db, owner) => {
      await owner(() =>
        db.query(
          `insert into app.nodes (id, user_id, title, color, icon, mtime, created_at, level, x, y)
           values (gen_random_uuid(), $1, 'Mine', 'hsl(210, 80%, 55%)', 'Folder', 1, 1, 0, 9, 8)`,
          [u.id],
        ),
      );
      const envelope = await ensure(db);
      expect(envelope.status).toBe("applied");
      const s = await snapshot(db);
      expect(s.bits).toHaveLength(0);
      expect(s.nodes).toHaveLength(3);
      expect(await seededAt(db, u)).toBeNull();
    });
  });

  it("does not copy again after the guest emptied its seed", async () => {
    const u = await createTestUser("dsempty");
    await inGuest(u, async (db, owner) => {
      await ensure(db);
      const at = await seededAt(db, u);
      await owner(async () => {
        await db.query("delete from app.staged_candidates where user_id = $1", [u.id]);
        await db.query("delete from app.scratch_breakdowns where user_id = $1", [u.id]);
        await db.query("delete from app.chunks where user_id = $1", [u.id]);
        await db.query("delete from app.bits where user_id = $1", [u.id]);
        await db.query("update app.nodes set parent_id = null where user_id = $1", [u.id]);
        await db.query("delete from app.nodes where user_id = $1 and system_role is null", [u.id]);
      });
      const again = await ensure(db);
      expect(again.changes).toEqual({});
      const s = await snapshot(db);
      expect(s.nodes).toHaveLength(2);
      expect(s.bits).toHaveLength(0);
      expect(await seededAt(db, u)).toBe(at);
    });
  });

  it("leaves one copy after a retry that follows a committed first call", async () => {
    const u = await createTestUser("dsretry");
    const first = await connect();
    const second = await connect();
    try {
      for (const db of [first, second]) {
        await db.query("begin");
        await becomeActor(db, { role: "authenticated", userId: u.id });
        await asGuest(db, u);
      }
      expect((await ensure(first)).status).toBe("applied");
      await first.query("commit");
      const retry = await ensure(second);
      expect(retry.status).toBe("applied");
      expect(retry.changes).toEqual({});
      await second.query("commit");
      const { rows } = await first.query(
        "select (select count(*) from app.nodes where user_id = $1)::int as n, (select count(*) from app.bits where user_id = $1)::int as b",
        [u.id],
      );
      expect(rows[0]).toEqual({ n: COUNTS.nodes, b: COUNTS.bits });
    } finally {
      await first.query("rollback").catch(() => undefined);
      await second.query("rollback").catch(() => undefined);
      await first.end();
      await second.end();
    }
  });

  it("copies the seed once when two first calls of an anonymous user run together", async () => {
    const u = await createTestUser("dscc");
    const first = await connect();
    const second = await connect();
    const watcher = await connect();
    try {
      for (const db of [first, second]) {
        await db.query("begin");
        await becomeActor(db, { role: "authenticated", userId: u.id });
        await asGuest(db, u);
      }
      expect((await ensure(first)).status).toBe("applied");
      const pending = ensure(second);
      let waiting = false;
      for (let i = 0; i < 50 && !waiting; i += 1) {
        const { rows } = await watcher.query(
          "select 1 from pg_stat_activity where wait_event_type = 'Lock' and state = 'active' and query like '%ensure_account%'",
        );
        waiting = rows.length > 0;
        if (!waiting) await new Promise((resolve) => setTimeout(resolve, 100));
      }
      expect(waiting, "the second call waits for the first").toBe(true);
      await first.query("commit");
      const secondEnvelope = await pending;
      expect(secondEnvelope.status).toBe("applied");
      expect(secondEnvelope.changes).toEqual({});
      await second.query("commit");
      const { rows } = await watcher.query(
        `select (select count(*) from app.nodes where user_id = $1 and system_role is null)::int as nodes,
                (select count(*) from app.bits where user_id = $1)::int as bits,
                (select count(*) from app.chunks where user_id = $1)::int as chunks,
                (select count(*) from app.nodes where user_id = $1 and system_role = 'inbox')::int as inbox`,
        [u.id],
      );
      expect(rows[0]).toEqual({ nodes: COUNTS.nodes - 2, bits: COUNTS.bits, chunks: COUNTS.chunks, inbox: 1 });
    } finally {
      await first.query("rollback").catch(() => undefined);
      await second.query("rollback").catch(() => undefined);
      await first.end();
      await second.end();
      await watcher.end();
    }
  });

  it("leaves another account's rows untouched and writes only the caller's rows", async () => {
    const other = await createTestUser("dsother");
    const mine = await createTestUser("dsmine");
    const committed = await connect();
    try {
      await committed.query("begin");
      await becomeActor(committed, { role: "authenticated", userId: other.id });
      await asGuest(committed, other);
      await ensure(committed);
      await committed.query("commit");
    } finally {
      await committed.end();
    }
    const watcher = await connect();
    try {
      const count = async () =>
        (await watcher.query(
          `select (select count(*) from app.nodes where user_id = $1)::int as n,
                  (select count(*) from app.bits where user_id = $1)::int as b`,
          [other.id],
        )).rows[0];
      const before = await count();
      expect(before).toEqual({ n: COUNTS.nodes, b: COUNTS.bits });
      await inGuest(mine, async (db) => {
        const envelope = await ensure(db);
        for (const table of ["nodes", "bits", "chunks", "scratch_breakdowns", "staged_candidates"] as const) {
          for (const row of envelope.changes[table]?.upserted ?? []) expect(row.user_id).toBe(mine.id);
        }
      });
      expect(await count()).toEqual(before);
    } finally {
      await watcher.end();
    }
  });
});

describe("demo seed: a guest whose Inbox already exists", () => {
  it("touches the Inbox so it is not older than the seed Scratches, and returns it in changes", async () => {
    const u = await createTestUser("dsinbox");
    await withActor({ role: "authenticated", userId: u.id }, async (db, owner) => {
      await asAccount(db, u);
      await ensure(db);
      await owner(() => db.query("update app.nodes set mtime = 1000, created_at = 1000 where user_id = $1", [u.id]));
      await asGuest(db, u);
      const envelope = await assertChangeSet(db, u.id, (c) => ensure(c));
      const inbox = (await snapshot(db)).nodes.find((n) => n.system_role === "inbox")!;
      const newest = Math.max(...(await snapshot(db)).bits.filter((b) => b.parent_id === inbox.id).map((b) => b.mtime));
      expect(inbox.mtime).toBeGreaterThanOrEqual(newest);
      expect(inbox.version).toBe(1);
      expect(envelope.changes.nodes?.upserted.some((n) => n.id === inbox.id)).toBe(true);
    });
  });

  it("makes a capture into the Inbox wait for the seed copy, then refuse the taken cell", async () => {
    const u = await createTestUser("dslock");
    const setup = await connect();
    try {
      await setup.query("begin");
      await becomeActor(setup, { role: "authenticated", userId: u.id });
      await asAccount(setup, u);
      await ensure(setup);
      await setup.query("commit");
    } finally {
      await setup.end();
    }
    const first = await connect();
    const second = await connect();
    const watcher = await connect();
    try {
      for (const db of [first, second]) {
        await db.query("begin");
        await becomeActor(db, { role: "authenticated", userId: u.id });
        await asGuest(db, u);
      }
      const inboxId = (await watcher.query("select id from app.nodes where user_id = $1 and system_role = 'inbox'", [u.id])).rows[0].id;
      expect((await ensure(first)).status).toBe("applied");
      const pending = second.query(
        "select public.create_bit($1::uuid, $2::jsonb) as e",
        [randomUUID(), JSON.stringify({ title: "Captured", icon: "sparkles", parent_id: inboxId, x: 3, y: 0 })],
      );
      let waiting = false;
      for (let i = 0; i < 50 && !waiting; i += 1) {
        const { rows } = await watcher.query(
          "select 1 from pg_stat_activity where wait_event_type = 'Lock' and state = 'active' and query like '%create_bit%'",
        );
        waiting = rows.length > 0;
        if (!waiting) await new Promise((resolve) => setTimeout(resolve, 100));
      }
      expect(waiting, "the capture waits for the seed copy").toBe(true);
      await first.query("commit");
      const result = (await pending).rows[0].e as Envelope;
      expect(result.status).toBe("rejected");
      expect(result.rejection?.code).toBe("cell_taken");
      await second.query("commit");
    } finally {
      await first.query("rollback").catch(() => undefined);
      await second.query("rollback").catch(() => undefined);
      await first.end();
      await second.end();
      await watcher.end();
    }
  });
});

describe("demo seed: the functions", () => {
  it("no seed function references the dev schema", async () => {
    const db = await connect();
    try {
      const { rows } = await db.query(
        `select p.proname, p.prosrc from pg_proc p
          where p.pronamespace = 'internal'::regnamespace and p.proname in ('demo_seed', 'copy_demo_seed')`,
      );
      expect(rows.map((r) => r.proname).sort()).toEqual(["copy_demo_seed", "demo_seed"]);
      for (const r of rows) expect(r.prosrc).not.toMatch(/\bdev\./i);
      const { rows: ensureRows } = await db.query(
        "select prosrc from pg_proc where pronamespace = 'public'::regnamespace and proname = 'ensure_account'",
      );
      expect(ensureRows[0].prosrc).not.toMatch(/\bdev\./i);
    } finally {
      await db.end();
    }
  });

  it("demo_seed is a function returning jsonb, owned by the write role", async () => {
    const db = await connect();
    try {
      const { rows } = await db.query(
        `select pg_get_function_result(p.oid) as result, pg_get_userbyid(p.proowner) as owner,
                p.prosecdef as definer
           from pg_proc p where p.pronamespace = 'internal'::regnamespace and p.proname = 'demo_seed'`,
      );
      expect(rows).toEqual([{ result: "jsonb", owner: "griddo_writer", definer: false }]);
    } finally {
      await db.end();
    }
  });
});
