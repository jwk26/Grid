import { randomUUID } from "node:crypto";
import type { Client } from "pg";
import { beforeAll, describe, expect, it } from "vitest";
import { assertChangeSet, type Envelope as ChangeEnvelope } from "./helpers/change-set";
import { withActor } from "./helpers/db";
import {
  account, addBit, addChunk, addNode, authed, call, committed, race, sql, stored, type Envelope, type Owner,
} from "./helpers/lifecycle";
import { createTestUser, type TestUser } from "./helpers/users";

// hard_delete_node(), hard_delete_bit(), empty_trash() and cleanup_expired_trash() (Task 220,
// Stage 3): Hooks 6 and 7, ported from cascade-hard-delete, auto-cleanup and
// scratch-aggregate-hard-delete (the `integrity_cleanup_required` cases are not ported: the
// composite foreign key makes an orphan candidate impossible, S18), plus the lifecycle,
// concurrency and cross-account cases.

let user: TestUser;
let stranger: TestUser;

beforeAll(async () => {
  user = await createTestUser("hd");
  stranger = await createTestUser("hd-other");
});

const A = () => authed(user);
const hardNode = (db: Client, id: string) => call(db, "hard_delete_node", [id]);
const hardBit = (db: Client, id: string) => call(db, "hard_delete_bit", [id]);
const emptyTrash = (db: Client) => call(db, "empty_trash", []);
const cleanup = (db: Client) => call(db, "cleanup_expired_trash", []);
const node = (db: Client, o: Parameters<typeof addNode>[2] = {}, u = user) => addNode(db, u.id, o);
const bit = (db: Client, o: Parameters<typeof addBit>[2] = {}, u = user) => addBit(db, u.id, o);
const chunk = (db: Client, o: Parameters<typeof addChunk>[2] = {}, u = user) => addChunk(db, u.id, o);
const T = 1_700_000_100_000;
const DAY = 86_400_000;
const sorted = (a: string[]) => [...a].sort();
const exists = async (db: Client, table: string, id: string) =>
  (await db.query(`select 1 from app.${table} where id = $1`, [id])).rowCount === 1;
const count = async (db: Client, table: string) =>
  Number((await db.query(`select count(*) as n from app.${table} where user_id = $1`, [user.id])).rows[0].n);
// Milliseconds the database takes as "now" in this transaction.
const dbNow = async (db: Client) =>
  Number((await db.query("select (extract(epoch from transaction_timestamp()) * 1000)::bigint as n")).rows[0].n);

// Scratch Bit with a consumed and a staged Breakdown in the Inbox.
async function scratch(db: Client, inbox: string, deletedAt: number | null) {
  const bitId = await bit(db, { parentId: inbox, deletedAt });
  const rows = { bit: bitId, br1: randomUUID(), br2: randomUUID(), cand: randomUUID() };
  await sql(
    db,
    `insert into app.scratch_breakdowns (id, user_id, scratch_bit_id, content, "order", created_at) values ($1, $3, $4, 'a', 0, 1);
     insert into app.scratch_breakdowns (id, user_id, scratch_bit_id, content, "order", created_at) values ($2, $3, $4, 'b', 1, 1);
     insert into app.staged_candidates (id, user_id, scratch_bit_id, source_breakdown_id, result_type, created_at, updated_at) values ($5, $3, $4, $1, 'node', 1, 1)`,
    [rows.br1, rows.br2, user.id, bitId, rows.cand],
  );
  return rows;
}

// R (0,0) > C (1,0, level 1) > G (2,0, level 2); Bits bc in C, bg in G, br in R; a Chunk in each.
async function tree(db: Client, owner: Owner, deletedAt: number | null = T) {
  return owner(async () => {
    await account(db, user.id);
    const t = { r: randomUUID(), c: randomUUID(), g: randomUUID(), bc: randomUUID(), bg: randomUUID(), br: randomUUID(),
      kc: randomUUID(), kg: randomUUID(), kr: randomUUID() };
    await node(db, { id: t.r, version: 9 });
    await node(db, { id: t.c, parentId: t.r, level: 1, x: 1, deletedAt });
    await node(db, { id: t.g, parentId: t.c, level: 2, x: 2, deletedAt });
    await bit(db, { id: t.bc, parentId: t.c, x: 3, deletedAt });
    await bit(db, { id: t.bg, parentId: t.g, x: 4, deletedAt });
    await bit(db, { id: t.br, parentId: t.r, x: 5, version: 7 });
    await chunk(db, { id: t.kc, parentId: t.bc });
    await chunk(db, { id: t.kg, parentId: t.bg });
    await chunk(db, { id: t.kr, parentId: t.br });
    return t;
  });
}

describe("hard_delete_node", () => {
  it("deletes the closure, its Bits and Chunks, leaves the rest and touches the parent", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await tree(db, owner);
      await owner(() => sql(db, "update app.nodes set mtime = 5 where id = $1", [t.r]));
      const envelope = await hardNode(db, t.c);
      expect(envelope).toMatchObject({ status: "applied", result: { id: t.c } });
      for (const [table, id] of [["nodes", t.c], ["nodes", t.g], ["bits", t.bc], ["bits", t.bg], ["chunks", t.kc], ["chunks", t.kg]] as const) {
        expect(await exists(db, table, id)).toBe(false);
      }
      expect(await stored(db, "nodes", t.r)).toMatchObject({ version: 9, deleted_at: null });
      expect(Number((await stored(db, "nodes", t.r)).mtime)).toBeGreaterThan(5);
      expect(await stored(db, "bits", t.br)).toMatchObject({ version: 7 });
      expect(await exists(db, "chunks", t.kr)).toBe(true);
      expect(sorted(envelope.changes.nodes!.deleted)).toEqual(sorted([t.c, t.g]));
      expect(sorted(envelope.changes.bits!.deleted)).toEqual(sorted([t.bc, t.bg]));
      expect(sorted(envelope.changes.chunks!.deleted)).toEqual(sorted([t.kc, t.kg]));
      expect(envelope.changes.nodes!.upserted.map((r) => r.id)).toEqual([t.r]);
    });
  });

  it("deletes a closure's Scratch source and candidate (candidates before sources)", async () => {
    await withActor(A(), async (db, owner) => {
      await owner(() => account(db, user.id));
      const n = await owner(() => node(db, { deletedAt: T }));
      const s = await owner(() => scratch(db, n, T));
      const envelope = await hardNode(db, n);
      expect(envelope.status).toBe("applied");
      expect(await count(db, "scratch_breakdowns")).toBe(0);
      expect(await count(db, "staged_candidates")).toBe(0);
      expect(envelope.changes).toMatchObject({
        staged_candidates: { deleted: [s.cand] },
        scratch_breakdowns: { deleted: expect.arrayContaining([s.br1, s.br2]) },
      });
    });
  });

  it("refuses a live Node and a system Node with invalid_target, writing nothing", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await tree(db, owner);
      const inbox = await owner(() => node(db, { systemRole: "inbox", x: 8, y: 8 }));
      for (const id of [t.r, inbox]) {
        expect(await hardNode(db, id)).toMatchObject({ status: "rejected", rejection: { code: "invalid_target" } });
        expect(await exists(db, "nodes", id)).toBe(true);
      }
    });
  });

  it("returns not_found (missing and another account's Node) and account_missing", async () => {
    await withActor(A(), async (db, owner) => {
      await tree(db, owner);
      const theirs = await owner(async () => {
        await account(db, stranger.id);
        return node(db, { x: 5, y: 5, deletedAt: T }, stranger);
      });
      for (const id of [randomUUID(), theirs]) {
        expect(await hardNode(db, id)).toMatchObject({ rejection: { code: "not_found" }, changes: {} });
      }
      expect(await owner(() => exists(db, "nodes", theirs))).toBe(true);
    });
    await withActor(A(), async (db) => {
      expect(await hardNode(db, randomUUID())).toMatchObject({ rejection: { code: "account_missing" } });
    });
  });
});

describe("hard_delete_bit", () => {
  it("deletes the Bit and its Chunks, leaves the rest and touches the parent", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await tree(db, owner);
      await owner(() => sql(db, "update app.nodes set mtime = 5 where id = $1", [t.c]));
      const envelope = await hardBit(db, t.bc);
      expect(envelope).toMatchObject({ status: "applied", result: { id: t.bc } });
      expect(await exists(db, "bits", t.bc)).toBe(false);
      expect(await exists(db, "chunks", t.kc)).toBe(false);
      expect(await exists(db, "nodes", t.c)).toBe(true);
      expect(Number((await stored(db, "nodes", t.c)).mtime)).toBeGreaterThan(5);
      expect(envelope.changes.bits!.deleted).toEqual([t.bc]);
      expect(envelope.changes.chunks!.deleted).toEqual([t.kc]);
      expect(envelope.changes.nodes!.upserted.map((r) => r.id)).toEqual([t.c]);
    });
  });

  it("deletes a Scratch Bit's candidates, then its Breakdowns, and keeps another Scratch whole", async () => {
    await withActor(A(), async (db, owner) => {
      await owner(() => account(db, user.id));
      const inbox = await owner(() => node(db, { systemRole: "inbox", x: 5, y: 5 }));
      const target = await owner(() => scratch(db, inbox, T));
      const other = await owner(() => scratch(db, inbox, null));
      const before = await db.query("select to_jsonb(b.*) as r from app.bits b where id = $1", [other.bit]);
      const envelope = await hardBit(db, target.bit);
      expect(envelope.status).toBe("applied");
      expect(await exists(db, "bits", target.bit)).toBe(false);
      expect(await count(db, "scratch_breakdowns")).toBe(2);
      expect(await count(db, "staged_candidates")).toBe(1);
      expect(await exists(db, "staged_candidates", other.cand)).toBe(true);
      expect((await db.query("select to_jsonb(b.*) as r from app.bits b where id = $1", [other.bit])).rows).toEqual(before.rows);
      expect(envelope.changes.staged_candidates!.deleted).toEqual([target.cand]);
      expect(sorted(envelope.changes.scratch_breakdowns!.deleted)).toEqual(sorted([target.br1, target.br2]));
    });
  });

  it("refuses a live Bit with invalid_target, writing nothing", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await tree(db, owner);
      expect(await hardBit(db, t.br)).toMatchObject({ status: "rejected", rejection: { code: "invalid_target" } });
      expect(await exists(db, "bits", t.br)).toBe(true);
      expect(await exists(db, "chunks", t.kr)).toBe(true);
    });
  });

  it("returns not_found (missing and another account's Bit) and account_missing", async () => {
    await withActor(A(), async (db, owner) => {
      await tree(db, owner);
      const theirs = await owner(async () => {
        await account(db, stranger.id);
        const n = await node(db, { x: 5, y: 5 }, stranger);
        return bit(db, { parentId: n, deletedAt: T }, stranger);
      });
      for (const id of [randomUUID(), theirs]) {
        expect(await hardBit(db, id)).toMatchObject({ rejection: { code: "not_found" } });
      }
      expect(await owner(() => exists(db, "bits", theirs))).toBe(true);
    });
    await withActor(A(), async (db) => {
      expect(await hardBit(db, randomUUID())).toMatchObject({ rejection: { code: "account_missing" } });
    });
  });
});

describe("empty_trash", () => {
  it("deletes every trashed closure and Bit, keeps what is live and reports the counts", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await tree(db, owner);
      const lone = await owner(() => bit(db, { parentId: t.r, x: 6, deletedAt: T }));
      const envelope = await emptyTrash(db);
      expect(envelope).toMatchObject({ status: "applied", result: { nodes: 2, bits: 3 } });
      for (const [table, id] of [["nodes", t.c], ["nodes", t.g], ["bits", t.bc], ["bits", t.bg], ["bits", lone], ["chunks", t.kc], ["chunks", t.kg]] as const) {
        expect(await exists(db, table, id)).toBe(false);
      }
      expect(await exists(db, "nodes", t.r)).toBe(true);
      expect(await exists(db, "bits", t.br)).toBe(true);
      expect(await exists(db, "chunks", t.kr)).toBe(true);
      expect(await stored(db, "nodes", t.r)).toMatchObject({ version: 9 });
      expect(await emptyTrash(db)).toMatchObject({ status: "applied", result: { nodes: 0, bits: 0 }, changes: {} });
    });
  });

  it("is one transaction: a failure part-way deletes nothing", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await tree(db, owner);
      await owner(async () => {
        await db.query(`create function app.refuse_delete() returns trigger language plpgsql as $f$ begin raise exception 'refused' using errcode = 'P0001'; end $f$`);
        await db.query("create trigger refuse_nodes before delete on app.nodes for each row execute function app.refuse_delete()");
      });
      await db.query("savepoint s");
      let failed = false;
      try {
        await emptyTrash(db);
      } catch {
        failed = true;
      }
      await db.query("rollback to savepoint s");
      expect(failed).toBe(true);
      for (const [table, id] of [["nodes", t.c], ["nodes", t.g], ["bits", t.bc], ["bits", t.bg], ["chunks", t.kc], ["chunks", t.kg]] as const) {
        expect(await exists(db, table, id)).toBe(true);
      }
    });
  });
});

describe("cleanup_expired_trash", () => {
  it("deletes what was trashed more than 30 days ago, closures included, and keeps the rest", async () => {
    await withActor(A(), async (db, owner) => {
      await owner(() => account(db, user.id));
      const now = await dbNow(db);
      const expired = now - 31 * DAY;
      const fresh = now - 29 * DAY;
      const ids = await owner(async () => {
        const en = await node(db, { deletedAt: expired });
        const enBit = await bit(db, { parentId: en, deletedAt: expired });
        const enChunk = await chunk(db, { parentId: enBit });
        const parent = await node(db, { x: 1, version: 5 });
        const standalone = await bit(db, { parentId: parent, deletedAt: expired });
        const standaloneChunk = await chunk(db, { parentId: standalone });
        const freshNode = await node(db, { x: 2, deletedAt: fresh, version: 6 });
        const freshBit = await bit(db, { parentId: parent, x: 1, deletedAt: fresh, version: 7 });
        const freshChunk = await chunk(db, { parentId: freshBit });
        const edge = await bit(db, { parentId: parent, x: 2, deletedAt: now - 30 * DAY });
        return { en, enBit, enChunk, parent, standalone, standaloneChunk, freshNode, freshBit, freshChunk, edge };
      });
      const envelope = await cleanup(db);
      expect(envelope).toMatchObject({ status: "applied", result: { nodes: 1, bits: 2 } });
      for (const [table, id] of [["nodes", ids.en], ["bits", ids.enBit], ["chunks", ids.enChunk], ["bits", ids.standalone], ["chunks", ids.standaloneChunk]] as const) {
        expect(await exists(db, table, id)).toBe(false);
      }
      expect(await stored(db, "nodes", ids.parent)).toMatchObject({ version: 5 });
      expect(await stored(db, "nodes", ids.freshNode)).toMatchObject({ version: 6 });
      expect(await stored(db, "bits", ids.freshBit)).toMatchObject({ version: 7 });
      expect(await exists(db, "chunks", ids.freshChunk)).toBe(true);
      // Exactly 30 days is not yet expired.
      expect(await exists(db, "bits", ids.edge)).toBe(true);
    });
  });

  it("advances last_visit_at, also when nothing expired", async () => {
    await withActor(A(), async (db, owner) => {
      await owner(() => account(db, user.id));
      const now = await dbNow(db);
      expect(await cleanup(db)).toMatchObject({ status: "applied", changes: {} });
      const { rows } = await db.query("select last_visit_at from app.accounts where user_id = $1", [user.id]);
      expect(Number(rows[0].last_visit_at)).toBe(now);
    });
  });

  it("deletes an expired Scratch Bit with its Breakdowns and candidates", async () => {
    await withActor(A(), async (db, owner) => {
      await owner(() => account(db, user.id));
      const inbox = await owner(() => node(db, { systemRole: "inbox", x: 5, y: 5 }));
      const now = await dbNow(db);
      const s = await owner(() => scratch(db, inbox, now - 40 * DAY));
      expect((await cleanup(db)).status).toBe("applied");
      expect(await exists(db, "bits", s.bit)).toBe(false);
      expect(await count(db, "scratch_breakdowns")).toBe(0);
      expect(await count(db, "staged_candidates")).toBe(0);
    });
  });

  it("returns account_missing for a caller without an account", async () => {
    await withActor(A(), async (db) => {
      expect(await cleanup(db)).toMatchObject({ rejection: { code: "account_missing" } });
      expect(await emptyTrash(db)).toMatchObject({ rejection: { code: "account_missing" } });
    });
  });
});

describe("cross-account and change set", () => {
  it("leaves another account's rows untouched", async () => {
    await withActor(A(), async (db, owner) => {
      await tree(db, owner);
      const theirs = await owner(async () => {
        await account(db, stranger.id);
        const n = await node(db, { x: 5, y: 5, deletedAt: 1 }, stranger);
        const b = await bit(db, { parentId: n, deletedAt: 1 }, stranger);
        const k = await chunk(db, { parentId: b }, stranger);
        return { n, b, k };
      });
      expect(await hardNode(db, theirs.n)).toMatchObject({ rejection: { code: "not_found" } });
      expect(await hardBit(db, theirs.b)).toMatchObject({ rejection: { code: "not_found" } });
      await emptyTrash(db);
      await cleanup(db);
      expect(await owner(() => exists(db, "nodes", theirs.n))).toBe(true);
      expect(await owner(() => exists(db, "bits", theirs.b))).toBe(true);
      expect(await owner(() => exists(db, "chunks", theirs.k))).toBe(true);
    });
  });

  it("before + changes equals after for hard deletes, Empty Trash, cleanup, no-ops and rejections", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await tree(db, owner);
      const inbox = await owner(() => node(db, { systemRole: "inbox", x: 8, y: 8 }));
      const s = await owner(() => scratch(db, inbox, T));
      const old = await owner(() => bit(db, { parentId: t.r, x: 9, deletedAt: 1 }));
      const run = async (fn: () => Promise<Envelope>) => {
        await owner(() => sql(db, "update app.nodes set mtime = 1; update app.bits set mtime = 1"));
        return assertChangeSet(db, user.id, fn as unknown as () => Promise<ChangeEnvelope>);
      };
      await run(() => hardBit(db, s.bit));
      await run(() => hardBit(db, t.br));
      await run(() => hardBit(db, randomUUID()));
      await run(() => hardNode(db, t.g));
      await run(() => hardNode(db, inbox));
      await run(() => cleanup(db));
      void old;
      await owner(() => sql(db, "update app.nodes set deleted_at = 5 where id = $1", [t.c]));
      await run(() => emptyTrash(db));
      await run(() => emptyTrash(db));
    });
  });
});

describe("concurrency (S30)", () => {
  it("Empty Trash while a trashed Node is restored: restored and kept, or deleted and the restore is not_found", async () => {
    for (const restoreFirst of [true, false]) {
      const { u, owner, node: n, bit: b, row } = await committed(`hd-empty-${restoreFirst}`);
      try {
        const p = await n({ x: 3, y: 3, deletedAt: T });
        const child = await b({ parentId: p, deletedAt: T });
        const restore = (db: Client) => call(db, "restore_node", [p]);
        const [first, second] = restoreFirst
          ? await race(u, restore, emptyTrash, "empty_trash")
          : await race(u, emptyTrash, restore, "restore_node");
        if (restoreFirst) {
          expect(first.status).toBe("applied");
          expect(second.status).toBe("applied");
          expect((await row("nodes", p)).deleted_at).toBeNull();
          expect((await row("bits", child)).deleted_at).toBeNull();
        } else {
          expect(first.status).toBe("applied");
          expect(second.rejection).toEqual({ code: "not_found" });
          expect(await row("nodes", p)).toBeUndefined();
        }
      } finally {
        await owner.end();
      }
    }
  }, 60_000);

  it("hard_delete_node while restore_bit restores a Bit under it: kept (invalid_target) or deleted (not_found)", async () => {
    for (const restoreFirst of [true, false]) {
      const { u, owner, node: n, bit: b, row } = await committed(`hd-node-${restoreFirst}`);
      try {
        const p = await n({ x: 3, y: 3, deletedAt: T });
        const child = await b({ parentId: p, deletedAt: T });
        const restore = (db: Client) => call(db, "restore_bit", [child]);
        const del = (db: Client) => hardNode(db, p);
        const [first, second] = restoreFirst ? await race(u, restore, del, "hard_delete_node") : await race(u, del, restore, "restore_bit");
        if (restoreFirst) {
          expect(first.status).toBe("applied");
          expect(second.rejection).toEqual({ code: "invalid_target" });
          expect((await row("nodes", p)).deleted_at).toBeNull();
        } else {
          expect(first.status).toBe("applied");
          expect(second.rejection).toEqual({ code: "not_found" });
        }
      } finally {
        await owner.end();
      }
    }
  }, 60_000);

  it("hard_delete_bit while the Bit is restored: kept (invalid_target) or deleted (not_found)", async () => {
    for (const restoreFirst of [true, false]) {
      const { u, owner, node: n, bit: b, row } = await committed(`hd-bit-${restoreFirst}`);
      try {
        const p = await n({ x: 3, y: 3 });
        const target = await b({ parentId: p, deletedAt: T });
        const restore = (db: Client) => call(db, "restore_bit", [target]);
        const del = (db: Client) => hardBit(db, target);
        const [first, second] = restoreFirst ? await race(u, restore, del, "hard_delete_bit") : await race(u, del, restore, "restore_bit");
        expect(first.status).toBe("applied");
        if (restoreFirst) {
          expect(second.rejection).toEqual({ code: "invalid_target" });
          expect((await row("bits", target)).deleted_at).toBeNull();
        } else {
          expect(second.rejection).toEqual({ code: "not_found" });
        }
      } finally {
        await owner.end();
      }
    }
  }, 60_000);

  it("hard_delete_bit while create_chunk targets the trashed Bit: the create is parent_inactive or not_found, no Chunk is left", async () => {
    for (const createFirst of [true, false]) {
      const { u, owner, node: n, bit: b } = await committed(`hd-chunk-${createFirst}`);
      try {
        const p = await n({ x: 3, y: 3 });
        const target = await b({ parentId: p, deletedAt: T });
        const create = (db: Client) => call(db, "create_chunk", [randomUUID(), JSON.stringify({ title: "k", parent_id: target, order: 0 })]);
        const del = (db: Client) => hardBit(db, target);
        const [first, second] = createFirst ? await race(u, create, del, "hard_delete_bit") : await race(u, del, create, "create_chunk");
        if (createFirst) {
          expect(first.rejection).toEqual({ code: "parent_inactive" });
          expect(second.status).toBe("applied");
        } else {
          expect(first.status).toBe("applied");
          expect(second.rejection).toEqual({ code: "not_found" });
        }
        const { rows } = await owner.query("select count(*) as n from app.chunks where parent_id = $1", [target]);
        expect(Number(rows[0].n)).toBe(0);
      } finally {
        await owner.end();
      }
    }
  }, 60_000);

  it("cleanup_expired_trash while an expired Bit is restored: kept when the restore came first", async () => {
    const { u, owner, node: n, bit: b, row } = await committed("hd-clean");
    try {
      const p = await n({ x: 3, y: 3 });
      const old = await b({ parentId: p, deletedAt: 1 });
      const [first, second] = await race(u, (db) => call(db, "restore_bit", [old]), cleanup, "cleanup_expired_trash");
      expect(first.status).toBe("applied");
      expect(second.status).toBe("applied");
      expect((await row("bits", old)).deleted_at).toBeNull();
    } finally {
      await owner.end();
    }
  }, 30_000);
});
