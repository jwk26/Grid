import { randomUUID } from "node:crypto";
import type { Client } from "pg";
import { beforeAll, describe, expect, it } from "vitest";
import { baseEntities } from "@/lib/db/boundary-cases";
import { bitToRow, nodeToRow } from "@/lib/db/row-mapping";
import type { Bit, Node } from "@/lib/db/schema";
import { findNearestEmptyCell } from "@/lib/utils/bfs";
import { becomeActor, connect, expectDbError, insertRow, withActor } from "./helpers/db";
import { createTestUser, type TestUser } from "./helpers/users";

let user: TestUser;
let other: TestUser;

beforeAll(async () => {
  user = await createTestUser("ih");
  other = await createTestUser("io");
});

const owner = { role: "owner" } as const;
const key = (x: number, y: number) => `${x},${y}`;

async function addNode(db: Client, userId: string, overrides: Partial<Node>): Promise<string> {
  const id = overrides.id ?? randomUUID();
  await insertRow(db, "nodes", nodeToRow({ ...baseEntities.node, ...overrides, id }, userId));
  return id;
}

async function addBit(db: Client, userId: string, overrides: Partial<Bit>): Promise<void> {
  await insertRow(db, "bits", bitToRow({ ...baseEntities.bit, ...overrides, id: randomUUID() } as Bit, userId));
}

async function pick(db: Client, parent: string | null, reserved: unknown = [], ox?: number, oy?: number) {
  const { rows } = await db.query(
    "select x, y from internal.pick_free_cell($1, $2, $3::jsonb, $4, $5)",
    [user.id, parent, JSON.stringify(reserved), ox ?? null, oy ?? null],
  );
  return rows;
}

describe("internal.valid_reserved_cells", () => {
  const cases: Array<[string, unknown, boolean]> = [
    ["empty list", [], true],
    ["one cell", [{ x: 0, y: 0 }], true],
    ["the far corner", [{ x: 17, y: 8 }], true],
    ["six cells", Array.from({ length: 6 }, (_, i) => ({ x: i, y: 0 })), true],
    ["duplicates", [{ x: 1, y: 1 }, { x: 1, y: 1 }], true],
    ["extra keys", [{ x: 1, y: 1, note: "ok" }], true],
    ["seven cells", Array.from({ length: 7 }, (_, i) => ({ x: i, y: 0 })), false],
    ["not an array", { x: 0, y: 0 }, false],
    ["a string", "[]", false],
    ["an entry that is not an object", [[0, 0]], false],
    ["missing y", [{ x: 0 }], false],
    ["missing x", [{ y: 0 }], false],
    ["fraction", [{ x: 1.5, y: 0 }], false],
    ["string number", [{ x: "1", y: 0 }], false],
    ["null coordinate", [{ x: null, y: 0 }], false],
    ["x out of range", [{ x: 18, y: 0 }], false],
    ["y out of range", [{ x: 0, y: 9 }], false],
    ["negative", [{ x: -1, y: 0 }], false],
  ];

  it.each(cases)("%s", async (_label, value, valid) => {
    await withActor(owner, async (db) => {
      const { rows } = await db.query("select internal.valid_reserved_cells($1::jsonb) as ok", [JSON.stringify(value)]);
      expect(rows[0].ok).toBe(valid);
    });
  });

  it("is false for null", async () => {
    await withActor(owner, async (db) => {
      const { rows } = await db.query("select internal.valid_reserved_cells(null) as ok");
      expect(rows[0].ok).toBe(false);
    });
  });
});

describe("internal.find_free_cell", () => {
  const empty = "0".repeat(162);

  it("returns the first free cell in row-major order, y outer and x inner", async () => {
    await withActor(owner, async (db) => {
      const taken = "1".repeat(18) + "1" + "0".repeat(162 - 19);
      const { rows } = await db.query("select * from internal.find_free_cell($1)", [taken]);
      expect(rows).toEqual([{ x: 1, y: 1 }]);
    });
  });

  it("returns no row when the Grid is full", async () => {
    await withActor(owner, async (db) => {
      const full = await db.query("select * from internal.find_free_cell($1)", ["1".repeat(162)]);
      expect(full.rows).toEqual([]);
      const fullFrom = await db.query("select * from internal.find_free_cell($1, 4, 4)", ["1".repeat(162)]);
      expect(fullFrom.rows).toEqual([]);
    });
  });

  it("refuses a wrong-sized Grid and an original cell outside it", async () => {
    await withActor(owner, async (db) => {
      expect(await expectDbError(() => db.query("select * from internal.find_free_cell('0101')"))).toBe("22023");
    });
    await withActor(owner, async (db) => {
      expect(await expectDbError(() => db.query("select * from internal.find_free_cell($1, 18, 0)", [empty]))).toBe("22023");
    });
  });

  it("matches findNearestEmptyCell on 250 seeded random Grids", async () => {
    let seed = 20261024;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 2 ** 32;
    };
    await withActor(owner, async (db) => {
      for (let i = 0; i < 250; i += 1) {
        const density = random();
        const taken = new Set<string>();
        let text = "";
        for (let y = 0; y < 9; y += 1) {
          for (let x = 0; x < 18; x += 1) {
            const isTaken = random() < density;
            if (isTaken) taken.add(key(x, y));
            text += isTaken ? "1" : "0";
          }
        }
        const sx = Math.floor(random() * 18);
        const sy = Math.floor(random() * 9);
        const expected = findNearestEmptyCell(taken, sx, sy);
        const { rows } = await db.query("select x, y from internal.find_free_cell($1, $2, $3)", [text, sx, sy]);
        expect(rows[0] ?? null, `case ${i} from ${sx},${sy}`).toEqual(expected);
      }
    });
  });
});

describe("internal.pick_free_cell", () => {
  it("starts at 0,0 in an empty Grid and fills row-major", async () => {
    await withActor(owner, async (db) => {
      expect(await pick(db, null)).toEqual([{ x: 0, y: 0 }]);
      await addNode(db, user.id, { x: 0, y: 0 });
      await addNode(db, user.id, { x: 1, y: 0 });
      expect(await pick(db, null)).toEqual([{ x: 2, y: 0 }]);
    });
  });

  it("does not count trashed, archived or hidden L0 Nodes, nor another account's Nodes", async () => {
    await withActor(owner, async (db) => {
      await addNode(db, user.id, { x: 0, y: 0, deletedAt: 5 });
      await addNode(db, user.id, { x: 1, y: 0, archivedAt: 5 });
      await addNode(db, user.id, { x: 2, y: 0, hiddenFromGrid: true });
      await addNode(db, other.id, { x: 0, y: 0 });
      expect(await pick(db, null)).toEqual([{ x: 0, y: 0 }]);
    });
  });

  it("counts Nodes and Bits of a child Grid, hidden or not, and ignores other Grids", async () => {
    await withActor(owner, async (db) => {
      const parent = await addNode(db, user.id, { x: 5, y: 5 });
      const sibling = await addNode(db, user.id, { x: 6, y: 5 });
      await addNode(db, user.id, { parentId: parent, level: 1, x: 0, y: 0 });
      await addBit(db, user.id, { parentId: parent, x: 1, y: 0 });
      await addBit(db, user.id, { parentId: parent, x: 2, y: 0, deletedAt: 5 });
      await addNode(db, user.id, { parentId: parent, level: 1, x: 3, y: 0, hiddenFromGrid: true });
      await addBit(db, user.id, { parentId: sibling, x: 2, y: 0 });
      expect(await pick(db, parent)).toEqual([{ x: 2, y: 0 }]);
      expect(await pick(db, sibling)).toEqual([{ x: 0, y: 0 }]);
    });
  });

  it("treats reserved cells as taken and relocates from an original cell", async () => {
    await withActor(owner, async (db) => {
      expect(await pick(db, null, [{ x: 0, y: 0 }, { x: 1, y: 0 }])).toEqual([{ x: 2, y: 0 }]);
      // The original cell 4,4 is reserved: the nearest free cell is its north neighbour.
      expect(await pick(db, null, [{ x: 4, y: 4 }], 4, 4)).toEqual([{ x: 4, y: 3 }]);
      await addNode(db, user.id, { x: 4, y: 3 });
      expect(await pick(db, null, [{ x: 4, y: 4 }], 4, 4)).toEqual([{ x: 5, y: 4 }]);
    });
  });
});

describe("internal.now_ms and internal.envelope", () => {
  it("gives one timestamp per transaction", async () => {
    await withActor(owner, async (db) => {
      const first = await db.query("select internal.now_ms()::text as t");
      await db.query("select pg_sleep(0.05)");
      const second = await db.query("select internal.now_ms()::text as t");
      expect(second.rows[0].t).toBe(first.rows[0].t);
      expect(Math.abs(Number(first.rows[0].t) - Date.now())).toBeLessThan(60_000);
    });
  });

  it("builds the envelope with a null result and an optional rejection", async () => {
    await withActor(owner, async (db) => {
      const applied = await db.query("select internal.envelope('applied') as e");
      expect(applied.rows[0].e).toEqual({ status: "applied", result: null, changes: {} });
      const rejected = await db.query(
        `select internal.envelope('rejected', null, '{}', '{"code":"invalid_input"}') as e`,
      );
      expect(rejected.rows[0].e).toEqual({
        status: "rejected",
        result: null,
        changes: {},
        rejection: { code: "invalid_input" },
      });
    });
  });
});

describe("internal.lock_grid", () => {
  it("blocks a second transaction on the same Grid and not on another", async () => {
    const first = await connect();
    const second = await connect();
    try {
      await first.query("begin");
      await second.query("begin");
      await becomeActor(first, owner);
      await becomeActor(second, owner);
      await first.query("select internal.lock_grid($1, null)", [user.id]);
      await second.query("set local lock_timeout = '200ms'");
      const code = await expectDbError(() => second.query("select internal.lock_grid($1, null)", [user.id]));
      expect(code).toBe("55P03");
      await second.query("rollback");
      await second.query("begin");
      await second.query("set local lock_timeout = '200ms'");
      await second.query("select internal.lock_grid($1, $2)", [user.id, randomUUID()]);
      await second.query("select internal.lock_grid($1, null)", [other.id]);
    } finally {
      await first.query("rollback").catch(() => undefined);
      await second.query("rollback").catch(() => undefined);
      await first.end();
      await second.end();
    }
  });
});
