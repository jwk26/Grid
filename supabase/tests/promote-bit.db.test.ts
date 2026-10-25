import { randomUUID } from "node:crypto";
import type { Client } from "pg";
import { beforeAll, describe, expect, it } from "vitest";
import { assertChangeSet, type Envelope as ChangeEnvelope } from "./helpers/change-set";
import { expectDbError, withActor } from "./helpers/db";
import {
  account, addBit, addChunk, addNode, authed, call, committed, race, sql, stored, type Envelope, type Owner, type Row,
} from "./helpers/lifecycle";
import { createTestUser, type TestUser } from "./helpers/users";

// promote_bit_to_node() (Task 220, Stage 4): Hook 9, ported from promotion.test.ts (the two
// Scratch cases and the level guard), plus limits, cell picking, concurrency and cross-account.

let user: TestUser;
let stranger: TestUser;

beforeAll(async () => {
  user = await createTestUser("pr");
  stranger = await createTestUser("pr-other");
});

const A = () => authed(user);
const promote = (db: Client, id: string, reserved?: unknown) =>
  call(db, "promote_bit_to_node", reserved === undefined ? [id] : [id, JSON.stringify(reserved)]);
const node = (db: Client, o: Parameters<typeof addNode>[2] = {}, u = user) => addNode(db, u.id, o);
const bit = (db: Client, o: Parameters<typeof addBit>[2] = {}, u = user) => addBit(db, u.id, o);
const chunk = (db: Client, o: Parameters<typeof addChunk>[2] = {}, u = user) => addChunk(db, u.id, o);
const CHUNK_TIME = 1_700_000_000_000;
const newId = (e: Envelope) => (e.result as { id: string }).id;
const count = async (db: Client, table: string) =>
  Number((await db.query(`select count(*) as n from app.${table} where user_id = $1`, [user.id])).rows[0].n);
const bitsOf = async (db: Client, parent: string) =>
  (await db.query("select to_jsonb(b.*) as r from app.bits b where parent_id = $1 order by y, x", [parent])).rows.map((r) => r.r as Row);

// Node N (level 1 cell (2,3), v8) holds Bit B ("My Bit", icon "star") with Chunks A, B, C.
async function setup(db: Client, owner: Owner, parentLevel = 0) {
  return owner(async () => {
    await account(db, user.id);
    const ids = { n: randomUUID(), b: randomUUID(), ca: randomUUID(), cb: randomUUID(), cc: randomUUID() };
    await node(db, { id: ids.n, level: parentLevel, version: 8, x: 5, y: 5 });
    await bit(db, { id: ids.b, parentId: ids.n, title: "My Bit", icon: "star", x: 2, y: 3, deadline: CHUNK_TIME + 9e9, version: 4 });
    await chunk(db, { id: ids.ca, parentId: ids.b, title: "Step A", time: CHUNK_TIME, order: 0 });
    await chunk(db, { id: ids.cb, parentId: ids.b, title: "Step B", time: null, order: 1, status: "complete", description: "done" });
    await chunk(db, { id: ids.cc, parentId: ids.b, title: "Step C", time: CHUNK_TIME + 86_400_000, timeAllDay: true, order: 2 });
    return ids;
  });
}

describe("promote_bit_to_node", () => {
  it("makes a Node in the Bit's place and a Bit of each Chunk, deleting the Bit and its Chunks", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      await owner(() => sql(db, "update app.nodes set mtime = 5 where id = $1", [t.n]));
      const envelope = await promote(db, t.b);
      expect(envelope.status).toBe("applied");
      const id = newId(envelope);
      expect(id).not.toBe(t.b);
      expect(await stored(db, "nodes", id)).toMatchObject({
        title: "My Bit", icon: "star", parent_id: t.n, level: 1, x: 2, y: 3, version: 1, deleted_at: null, archived_at: null,
        color: "hsl(221, 83%, 53%)", deadline: CHUNK_TIME + 9e9, deadline_all_day: false, system_role: null,
      });
      expect(await stored(db, "bits", t.b)).toBeUndefined();
      expect(await count(db, "chunks")).toBe(0);
      const bits = await bitsOf(db, id);
      expect(bits.map((b) => b.title)).toEqual(["Step A", "Step B", "Step C"]);
      expect(bits.every((b) => b.version === 1 && b.deleted_at === null && b.priority === null)).toBe(true);
      expect(bits.map((b) => [b.x, b.y])).toEqual([[0, 0], [1, 0], [2, 0]]);
      expect(bits[0]).toMatchObject({ deadline: CHUNK_TIME, deadline_all_day: false, status: "active", icon: "star", description: "" });
      expect(bits[1]).toMatchObject({ deadline: null, status: "complete", description: "done" });
      expect(bits[2]).toMatchObject({ deadline: CHUNK_TIME + 86_400_000, deadline_all_day: true });
      const parent = await stored(db, "nodes", t.n);
      expect(parent).toMatchObject({ version: 8 });
      expect(Number(parent.mtime)).toBeGreaterThan(5);
      expect(envelope.changes.nodes!.upserted.map((r) => r.id).sort()).toEqual([id, t.n].sort());
      expect(envelope.changes.bits!.deleted).toEqual([t.b]);
      expect(envelope.changes.bits!.upserted).toHaveLength(3);
      expect(envelope.changes.chunks!.deleted.sort()).toEqual([t.ca, t.cb, t.cc].sort());
    });
  });

  it("promotes a Bit without Chunks to an empty Node", async () => {
    await withActor(A(), async (db, owner) => {
      await owner(() => account(db, user.id));
      const n = await owner(() => node(db, { x: 5, y: 5 }));
      const b = await owner(() => bit(db, { parentId: n }));
      const envelope = await promote(db, b);
      expect(envelope.status).toBe("applied");
      expect(await bitsOf(db, newId(envelope))).toEqual([]);
      expect(envelope.changes.chunks).toBeUndefined();
      expect(envelope.changes.bits).toMatchObject({ upserted: [], deleted: [b] });
    });
  });

  it("places the new Bits in row-major order outside the reserved cells", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const envelope = await promote(db, t.b, [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 3, y: 0 }]);
      const cells = (await bitsOf(db, newId(envelope))).map((b) => [b.x, b.y]);
      expect(cells).toEqual([[2, 0], [4, 0], [5, 0]]);
    });
  });

  it("gives the Chunks cells in Chunk order, not in id order", async () => {
    await withActor(A(), async (db, owner) => {
      await owner(() => account(db, user.id));
      const n = await owner(() => node(db, { x: 5, y: 5 }));
      const b = await owner(() => bit(db, { parentId: n }));
      await owner(() => chunk(db, { parentId: b, title: "second", order: 5, id: "00000000-0000-4000-8000-000000000001" }));
      await owner(() => chunk(db, { parentId: b, title: "first", order: 1, id: "00000000-0000-4000-8000-000000000002" }));
      const bits = await bitsOf(db, newId(await promote(db, b)));
      expect(bits.map((r) => [r.title, r.x])).toEqual([["first", 0], ["second", 1]]);
    });
  });

  it("rejects a malformed reserved list with invalid_input and writes nothing", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      expect(await promote(db, t.b, [{ x: 99, y: 0 }])).toMatchObject({ status: "rejected", rejection: { code: "invalid_input" } });
      expect(await stored(db, "bits", t.b)).toMatchObject({ version: 4 });
      expect(await count(db, "chunks")).toBe(3);
    });
  });

  it("returns grid_full and writes nothing when the Chunks do not fit", async () => {
    await withActor(A(), async (db, owner) => {
      await owner(() => account(db, user.id));
      const n = await owner(() => node(db, { x: 5, y: 5 }));
      const b = await owner(() => bit(db, { parentId: n }));
      await owner(() => sql(db, `insert into app.chunks (id, user_id, title, "order", parent_id)
        select gen_random_uuid(), $1, 'k', g, $2 from generate_series(1, 157) g`, [user.id, b]));
      const reserved = [0, 1, 2, 3, 4, 5].map((x) => ({ x, y: 0 }));
      const nodes = await count(db, "nodes");
      expect(await promote(db, b, reserved)).toMatchObject({ status: "rejected", rejection: { code: "grid_full" } });
      expect(await count(db, "nodes")).toBe(nodes);
      expect(await count(db, "bits")).toBe(1);
      expect(await count(db, "chunks")).toBe(157);
      // Without the reserved block the same Bit fits.
      expect((await promote(db, b)).status).toBe("applied");
    });
  });

  // Ported: the level guard. A Bit in a level-2 Node would give a level-3 Node.
  it("refuses a Bit inside a level-2 Node with invalid_target", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner, 2);
      expect(await promote(db, t.b)).toMatchObject({ status: "rejected", rejection: { code: "invalid_target" } });
      expect(await stored(db, "bits", t.b)).toMatchObject({ version: 4 });
      expect(await count(db, "chunks")).toBe(3);
      expect(await count(db, "nodes")).toBe(1);
    });
  });

  it("promotes a Bit inside a level-1 Node to a level-2 Node", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner, 1);
      expect(await stored(db, "nodes", newId(await promote(db, t.b)))).toMatchObject({ level: 2 });
    });
  });

  // Ported: a Scratch Bit is never promoted, whatever it holds, and nothing is touched.
  it("refuses an Inbox Scratch Bit with invalid_target, leaving its Chunks, Breakdowns and candidates", async () => {
    await withActor(A(), async (db, owner) => {
      await owner(() => account(db, user.id));
      const inbox = await owner(() => node(db, { systemRole: "inbox", x: 5, y: 5 }));
      const s = await owner(() => bit(db, { parentId: inbox }));
      const br = randomUUID();
      await owner(() => chunk(db, { parentId: s }));
      await owner(() => sql(db, `insert into app.scratch_breakdowns (id, user_id, scratch_bit_id, content, "order", created_at) values ($1, $2, $3, 'a', 0, 1);
        insert into app.staged_candidates (id, user_id, scratch_bit_id, source_breakdown_id, result_type, created_at, updated_at) values (gen_random_uuid(), $2, $3, $1, 'node', 1, 1)`, [br, user.id, s]));
      const before = [await count(db, "nodes"), await count(db, "bits"), await count(db, "chunks"), await count(db, "scratch_breakdowns"), await count(db, "staged_candidates")];
      expect(await promote(db, s)).toMatchObject({ status: "rejected", rejection: { code: "invalid_target" } });
      expect([await count(db, "nodes"), await count(db, "bits"), await count(db, "chunks"), await count(db, "scratch_breakdowns"), await count(db, "staged_candidates")]).toEqual(before);
    });
    await withActor(A(), async (db, owner) => {
      await owner(() => account(db, user.id));
      const inbox = await owner(() => node(db, { systemRole: "inbox", x: 5, y: 5 }));
      const s = await owner(() => bit(db, { parentId: inbox }));
      expect(await promote(db, s)).toMatchObject({ rejection: { code: "invalid_target" } });
    });
  });

  it("refuses a trashed or archived Bit with invalid_target and a trashed or archived parent with parent_inactive", async () => {
    for (const [statement, code] of [
      ["update app.bits set deleted_at = 5 where id = $1", "invalid_target"],
      ["update app.bits set archived_at = 5 where id = $1", "invalid_target"],
      ["update app.nodes set deleted_at = 5 where id = (select parent_id from app.bits where id = $1)", "parent_inactive"],
      ["update app.nodes set archived_at = 5 where id = (select parent_id from app.bits where id = $1)", "parent_inactive"],
    ] as const) {
      await withActor(A(), async (db, owner) => {
        const t = await setup(db, owner);
        await owner(() => sql(db, statement, [t.b]));
        expect(await promote(db, t.b)).toMatchObject({ status: "rejected", rejection: { code } });
        expect(await count(db, "chunks")).toBe(3);
        expect(await count(db, "nodes")).toBe(1);
      });
    }
  });

  const GUEST = () => JSON.stringify({ role: "authenticated", sub: user.id, is_anonymous: true });
  const fillNodes = (db: Client, n: number) =>
    sql(db, `insert into app.nodes (id, user_id, title, color, icon, mtime, created_at, level, x, y)
      select gen_random_uuid(), $1, 'f', 'hsl(210, 80%, 55%)', 'folder', 1, 1, 0, g % 18, (g / 18) % 9 from generate_series(1, $2::int) g`, [user.id, n]);
  const fillBits = (db: Client, parent: string, n: number) =>
    sql(db, `insert into app.bits (id, user_id, title, icon, mtime, created_at, parent_id, x, y)
      select gen_random_uuid(), $1, 'f', 'i', 1, 1, $2, g % 18, (g / 18) % 9 from generate_series(1, $3::int) g`, [user.id, parent, n]);

  it.each([
    [false, 1000],
    [true, 100],
  ] as const)("stops a %s guest account at %i Nodes, counting the Node the promotion adds", async (guest, limit) => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      await owner(() => fillNodes(db, limit - 1));
      if (guest) await sql(db, "select set_config('request.jwt.claims', $1, true)", [GUEST()]);
      expect(await promote(db, t.b)).toMatchObject({ status: "rejected", rejection: { code: "account_limit", table: "nodes", limit } });
      expect(await stored(db, "bits", t.b)).toMatchObject({ version: 4 });
      expect(await count(db, "chunks")).toBe(3);
    });
  }, 60_000);

  // Three Chunks add two Bits net (the promoted Bit goes): 298 -> 300 is allowed, 299 -> 301 is not.
  it.each([
    [298, true],
    [299, false],
  ] as const)("stops a guest at 300 Bits counted after the call (%i Bits now)", async (bits, ok) => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      await owner(() => fillBits(db, t.n, bits - 1));
      await sql(db, "select set_config('request.jwt.claims', $1, true)", [GUEST()]);
      const envelope = await promote(db, t.b);
      if (ok) expect(envelope.status).toBe("applied");
      else expect(envelope).toMatchObject({ status: "rejected", rejection: { code: "account_limit", table: "bits", limit: 300 } });
    });
  }, 60_000);

  it("allows a Bit without Chunks at the Bit limit, since it frees a row", async () => {
    await withActor(A(), async (db, owner) => {
      await owner(() => account(db, user.id));
      const n = await owner(() => node(db, { x: 5, y: 5 }));
      const b = await owner(() => bit(db, { parentId: n }));
      await owner(() => fillBits(db, n, 299));
      await sql(db, "select set_config('request.jwt.claims', $1, true)", [GUEST()]);
      expect((await promote(db, b)).status).toBe("applied");
    });
  });

  it("fails on a Bit title longer than a Node title allows, writing nothing", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      await owner(() => sql(db, "update app.bits set title = repeat('x', 150) where id = $1", [t.b]));
      await db.query("savepoint s");
      expect(await expectDbError(() => promote(db, t.b))).toBe("23514");
      await db.query("rollback to savepoint s");
      expect(await stored(db, "bits", t.b)).toMatchObject({ version: 4 });
      expect(await count(db, "chunks")).toBe(3);
    });
  });

  it("returns not_found (missing and another account's Bit) and account_missing", async () => {
    await withActor(A(), async (db, owner) => {
      await setup(db, owner);
      const theirs = await owner(async () => {
        await account(db, stranger.id);
        const n = await node(db, { x: 5, y: 5 }, stranger);
        return bit(db, { parentId: n }, stranger);
      });
      for (const id of [randomUUID(), theirs]) {
        expect(await promote(db, id)).toMatchObject({ status: "rejected", rejection: { code: "not_found" }, changes: {} });
      }
      expect(await owner(() => stored(db, "bits", theirs))).toMatchObject({ version: 1 });
    });
    await withActor(A(), async (db) => {
      expect(await promote(db, randomUUID())).toMatchObject({ rejection: { code: "account_missing" } });
    });
  });
});

describe("cross-account and change set", () => {
  it("leaves another account's rows untouched and sees nothing of them", async () => {
    await withActor(A(), async (db, owner) => {
      await setup(db, owner);
      const theirs = await owner(async () => {
        await account(db, stranger.id);
        const n = await node(db, { x: 5, y: 5 }, stranger);
        const b = await bit(db, { parentId: n }, stranger);
        await chunk(db, { parentId: b }, stranger);
        return { n, b };
      });
      expect(await promote(db, theirs.b)).toMatchObject({ rejection: { code: "not_found" } });
      const { rows } = await owner(() => db.query("select (select count(*) from app.chunks where user_id = $1) as k, (select count(*) from app.bits where user_id = $1) as b", [stranger.id]));
      expect(rows[0]).toEqual({ k: "1", b: "1" });
    });
  });

  it("before + changes equals after for promotions and rejections", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const inbox = await owner(() => node(db, { systemRole: "inbox", x: 8, y: 8 }));
      const scratch = await owner(() => bit(db, { parentId: inbox }));
      const empty = await owner(() => bit(db, { parentId: t.n, x: 9, y: 0 }));
      const run = async (fn: () => Promise<Envelope>) => {
        await owner(() => sql(db, "update app.nodes set mtime = 1; update app.bits set mtime = 1"));
        return assertChangeSet(db, user.id, fn as unknown as () => Promise<ChangeEnvelope>);
      };
      await run(() => promote(db, scratch));
      await run(() => promote(db, randomUUID()));
      await run(() => promote(db, t.b, [{ x: 99, y: 0 }]));
      await run(() => promote(db, t.b));
      await run(() => promote(db, empty));
    });
  });
});

describe("concurrency (S30)", () => {
  it("promotion while create_chunk adds a Chunk: the Chunk becomes a Bit, or the create is not_found", async () => {
    for (const createFirst of [true, false]) {
      const { u, owner, node: n, bit: b } = await committed(`pr-chunk-${createFirst}`);
      try {
        const p = await n({ x: 3, y: 3 });
        const target = await b({ parentId: p });
        const create = (db: Client) => call(db, "create_chunk", [randomUUID(), JSON.stringify({ title: "late", parent_id: target, order: 0 })]);
        const prom = (db: Client) => promote(db, target);
        const [first, second] = createFirst ? await race(u, create, prom, "promote_bit_to_node") : await race(u, prom, create, "create_chunk");
        const { rows: left } = await owner.query("select count(*) as n from app.chunks where user_id = $1", [u.id]);
        expect(Number(left[0].n)).toBe(0);
        if (createFirst) {
          expect(first.status).toBe("applied");
          const promoted = (second.result as { id: string }).id;
          const { rows } = await owner.query("select title from app.bits where parent_id = $1", [promoted]);
          expect(rows).toEqual([{ title: "late" }]);
        } else {
          expect(first.status).toBe("applied");
          expect(second.rejection).toEqual({ code: "not_found" });
        }
      } finally {
        await owner.end();
      }
    }
  }, 60_000);

  it("promotion while update_bit renames the Bit: the Node takes the new title", async () => {
    const { u, owner, node: n, bit: b } = await committed("pr-edit");
    try {
      const p = await n({ x: 3, y: 3 });
      const target = await b({ parentId: p });
      const [first, second] = await race(
        u,
        (db) => call(db, "update_bit", [target, JSON.stringify({ title: "Renamed" })]),
        (db) => promote(db, target),
        "promote_bit_to_node",
      );
      expect(first.status).toBe("applied");
      const promoted = (second.result as { id: string }).id;
      const { rows } = await owner.query("select title from app.nodes where id = $1", [promoted]);
      expect(rows).toEqual([{ title: "Renamed" }]);
    } finally {
      await owner.end();
    }
  }, 30_000);

  it("a create into the Bit's cell after the promotion is cell_taken; before it, the promotion keeps the cell", async () => {
    const { u, owner, node: n, bit: b } = await committed("pr-cell");
    try {
      const p = await n({ x: 3, y: 3 });
      const target = await b({ parentId: p, x: 2, y: 2 });
      const [first, second] = await race(
        u,
        (db) => promote(db, target),
        (db) => call(db, "create_bit", [randomUUID(), JSON.stringify({ title: "a", icon: "i", parent_id: p, x: 2, y: 2 })]),
        "create_bit",
      );
      expect(first.status).toBe("applied");
      expect(second.rejection).toEqual({ code: "cell_taken" });
    } finally {
      await owner.end();
    }
  }, 30_000);
});
