import { randomUUID } from "node:crypto";
import type { Client } from "pg";
import { beforeAll, describe, expect, it } from "vitest";
import { baseEntities } from "@/lib/db/boundary-cases";
import { accountToRow, bitToRow, nodeToRow } from "@/lib/db/row-mapping";
import type { Bit, Node } from "@/lib/db/schema";
import { assertChangeSet, type Envelope as ChangeEnvelope } from "./helpers/change-set";
import { becomeActor, connect, expectDbError, insertRow, withActor } from "./helpers/db";
import { createTestUser, type TestUser } from "./helpers/users";

// create_node(), create_bit() and update_bit() (Task 219, Stage 1): Hooks 1, 2, 8 and 12 of
// SCHEMA §Application Hooks, the account limits and the lifecycle/Grid locks. Last write wins (S15).

type Row = Record<string, unknown>;
type Envelope = {
  status: string;
  result: unknown;
  changes: { nodes?: { upserted: Row[]; deleted: string[] }; bits?: { upserted: Row[]; deleted: string[] } };
  rejection?: { code: string; table?: string; limit?: number };
};

let user: TestUser;
let stranger: TestUser;

beforeAll(async () => {
  user = await createTestUser("nb");
  stranger = await createTestUser("nb-other");
});

const authed = (u: TestUser = user) => ({ role: "authenticated" as const, userId: u.id });
const NODE = { title: "N", color: "hsl(10, 50%, 50%)", icon: "folder" };

async function call(db: Client, fn: string, args: unknown[]): Promise<Envelope> {
  const params = args.map((a, i) => (typeof a === "object" && a !== null ? `$${i + 1}::jsonb` : `$${i + 1}`));
  const values = args.map((a) => (typeof a === "object" && a !== null ? JSON.stringify(a) : a));
  const { rows } = await db.query(`select public.${fn}(${params.join(", ")}) as e`, values);
  return rows[0].e as Envelope;
}
const createNode = (db: Client, values: unknown, id: string = randomUUID()) => call(db, "create_node", [id, values]);
const createBit = (db: Client, values: unknown, id: string = randomUUID()) => call(db, "create_bit", [id, values]);
const updateBit = (db: Client, id: string, changes: unknown, extend?: boolean) =>
  call(db, "update_bit", extend === undefined ? [id, changes] : [id, changes, extend]);

async function account(db: Client, userId: string) {
  await insertRow(
    db,
    "accounts",
    accountToRow({ userId, createdAt: 1, lastVisitAt: 1, seededAt: null, deletionRequestedAt: null }),
  );
}
async function addNode(db: Client, overrides: Partial<Node>, userId = user.id): Promise<string> {
  const id = overrides.id ?? randomUUID();
  await insertRow(db, "nodes", nodeToRow({ ...baseEntities.node, ...overrides, id }, userId));
  return id;
}
async function addBit(db: Client, overrides: Partial<Bit>, userId = user.id): Promise<string> {
  const id = overrides.id ?? randomUUID();
  await insertRow(db, "bits", bitToRow({ ...baseEntities.bit, ...overrides, id }, userId));
  return id;
}
const stored = async (db: Client, table: "nodes" | "bits", id: string) =>
  (await db.query(`select to_jsonb(t.*) as r from app.${table} t where id = $1`, [id])).rows[0]?.r as Row;

// An account with an L0 Node P (3,3), a Bit B under it (0,0), and the two system Nodes.
async function setup(db: Client, owner: <R>(run: () => Promise<R>) => Promise<R>) {
  return owner(async () => {
    await account(db, user.id);
    const ids = {
      p: randomUUID(),
      b: randomUUID(),
      inbox: randomUUID(),
      archive: randomUUID(),
      other: randomUUID(),
    };
    await addNode(db, { id: ids.p, x: 3, y: 3, title: "P" });
    await addBit(db, { id: ids.b, parentId: ids.p, x: 0, y: 0, title: "B" });
    await addNode(db, { id: ids.inbox, x: 0, y: 0, systemRole: "inbox", title: "Inbox" });
    await addNode(db, { id: ids.archive, x: 1, y: 0, systemRole: "archive_view", title: "Archive" });
    await addNode(db, { id: ids.other, x: 6, y: 6, title: "Other" });
    return ids;
  });
}

describe("create_node", () => {
  it("creates a Node: version 1, server timestamps, derived level, parent touched", async () => {
    await withActor(authed(), async (db, owner) => {
      const { p } = await setup(db, owner);
      const id = randomUUID();
      const envelope = await createNode(db, { ...NODE, parent_id: p, x: 1, y: 1, deadline: 9_000 }, id);
      expect(envelope.status).toBe("applied");
      expect(envelope.result).toEqual({ id });
      const row = await stored(db, "nodes", id);
      expect(row).toMatchObject({
        title: "N", level: 1, parent_id: p, version: 1, system_role: null, hidden_from_grid: false,
        deleted_at: null, archived_at: null, deadline: 9_000, user_id: user.id,
      });
      expect(row.mtime).toBe(row.created_at);
      expect(Number(row.mtime)).toBeGreaterThan(1_700_000_000_000);
      const parent = await stored(db, "nodes", p);
      expect(parent).toMatchObject({ version: 1, mtime: row.mtime });
      expect(envelope.changes.nodes?.upserted).toEqual([row, parent]);
    });
  });

  it("creates at L0 with level 0 when parent_id is absent or null", async () => {
    await withActor(authed(), async (db, owner) => {
      await setup(db, owner);
      for (const [i, extra] of [{}, { parent_id: null }].entries()) {
        const id = randomUUID();
        expect((await createNode(db, { ...NODE, x: 10 + i, y: 4, ...extra }, id)).status).toBe("applied");
        expect(await stored(db, "nodes", id)).toMatchObject({ level: 0, parent_id: null });
      }
    });
  });

  for (const key of ["level", "version", "mtime", "created_at", "system_role", "hidden_from_grid", "deleted_at", "archived_at", "user_id", "id", "past_deadline_dismissed"]) {
    it(`fails on the key ${key} and writes nothing`, async () => {
      await withActor(authed(), async (db, owner) => {
        await setup(db, owner);
        expect(await expectDbError(() => createNode(db, { ...NODE, x: 9, y: 8, [key]: 1 }))).toBe("22023");
      });
    });
  }

  it("fails on a missing required key, a null id and a non-object, writing nothing", async () => {
    for (const run of [
      (db: Client) => createNode(db, { ...NODE, x: 9 }),
      (db: Client) => createNode(db, { title: "N", color: NODE.color, x: 9, y: 8 }),
      (db: Client) => call(db, "create_node", [null, { ...NODE, x: 9, y: 8 }]),
      (db: Client) => createNode(db, [1]),
    ]) {
      await withActor(authed(), async (db, owner) => {
        await setup(db, owner);
        expect(await expectDbError(() => run(db))).toBe("22023");
      });
    }
  });

  it("fails on a value the table refuses, not with a rejection", async () => {
    await withActor(authed(), async (db, owner) => {
      await setup(db, owner);
      expect(await expectDbError(() => createNode(db, { ...NODE, title: "", x: 9, y: 8 }))).toBe("23514");
    });
    await withActor(authed(), async (db, owner) => {
      await setup(db, owner);
      expect(await expectDbError(() => createNode(db, { ...NODE, x: 18, y: 0 }))).toBe("23514");
    });
  });

  it("returns account_missing for a caller without an accounts row", async () => {
    await withActor(authed(), async (db) => {
      expect(await createNode(db, { ...NODE, x: 9, y: 8 })).toEqual({
        status: "rejected", result: null, changes: {}, rejection: { code: "account_missing" },
      });
    });
  });

  it("applies the invalid_target rules: under a system Node, below level 2", async () => {
    await withActor(authed(), async (db, owner) => {
      const { inbox, archive, p } = await setup(db, owner);
      const l1 = await owner(() => addNode(db, { parentId: p, level: 1, x: 2, y: 2 }));
      const l2 = await owner(() => addNode(db, { parentId: l1, level: 2, x: 2, y: 2 }));
      for (const parent of [inbox, archive, l2]) {
        const envelope = await createNode(db, { ...NODE, parent_id: parent, x: 5, y: 5 });
        expect(envelope).toMatchObject({ status: "rejected", rejection: { code: "invalid_target" } });
      }
      expect((await createNode(db, { ...NODE, parent_id: l1, x: 5, y: 5 })).status).toBe("applied");
    });
  });

  it("rejects a trashed or archived parent, a missing parent and another account's parent", async () => {
    await withActor(authed(), async (db, owner) => {
      const { p, other } = await setup(db, owner);
      await owner(() => db.query("update app.nodes set deleted_at = 5 where id = $1", [p]));
      await owner(() => db.query("update app.nodes set archived_at = 5 where id = $1", [other]));
      for (const parent of [p, other]) {
        expect(await createNode(db, { ...NODE, parent_id: parent, x: 5, y: 5 })).toMatchObject({
          status: "rejected", rejection: { code: "parent_inactive" },
        });
      }
      expect(await createNode(db, { ...NODE, parent_id: randomUUID(), x: 5, y: 5 })).toMatchObject({
        rejection: { code: "not_found" },
      });
    });
  });

  it("rejects a deadline past the parent's, with the all-day end-of-day rule", async () => {
    await withActor(authed(), async (db, owner) => {
      const { p } = await setup(db, owner);
      await owner(() => db.query("update app.nodes set deadline = 1000000000000 where id = $1", [p]));
      const over = await createNode(db, { ...NODE, parent_id: p, x: 1, y: 1, deadline: 1000000000001 });
      expect(over).toMatchObject({ status: "rejected", rejection: { code: "deadline_exceeds_parent", table: "nodes" } });
      expect((await createNode(db, { ...NODE, parent_id: p, x: 1, y: 1, deadline: 1000000000000 })).status).toBe("applied");
      // An all-day parent deadline ends at the end of its day.
      await owner(() => db.query("update app.nodes set deadline = 1000000000000, deadline_all_day = true where id = $1", [p]));
      expect((await createNode(db, { ...NODE, parent_id: p, x: 2, y: 2, deadline: 1000000000000 + 86_399_999 })).status).toBe("applied");
      expect((await createNode(db, { ...NODE, parent_id: p, x: 3, y: 2, deadline: 1000000000000 + 86_400_000 })).rejection?.code).toBe("deadline_exceeds_parent");
    });
  });

  it("rejects a cell held by a Node or a Bit, and treats trashed, archived and hidden items as free", async () => {
    await withActor(authed(), async (db, owner) => {
      const { p, b } = await setup(db, owner);
      expect(await createNode(db, { ...NODE, x: 3, y: 3 })).toMatchObject({ rejection: { code: "cell_taken" } });
      expect(await createNode(db, { ...NODE, parent_id: p, x: 0, y: 0 })).toMatchObject({ rejection: { code: "cell_taken" } });
      await owner(() => db.query("update app.bits set deleted_at = 5 where id = $1", [b]));
      expect((await createNode(db, { ...NODE, parent_id: p, x: 0, y: 0 })).status).toBe("applied");
      await owner(() => db.query("update app.nodes set archived_at = 5 where id = $1", [p]));
      expect((await createNode(db, { ...NODE, x: 3, y: 3 })).status).toBe("applied");
      await owner(() => db.query("update app.nodes set hidden_from_grid = true where system_role = 'archive_view'"));
      expect((await createNode(db, { ...NODE, x: 1, y: 0 })).status).toBe("applied");
    });
  });
});

describe("create_bit", () => {
  const BIT = { title: "Bit", icon: "check" };

  it("creates a Bit: active, version 1, defaults, parent Node touched", async () => {
    await withActor(authed(), async (db, owner) => {
      const { p } = await setup(db, owner);
      const id = randomUUID();
      const envelope = await createBit(db, { ...BIT, parent_id: p, x: 2, y: 2, priority: "high", deadline: 5_000 }, id);
      expect(envelope).toMatchObject({ status: "applied", result: { id } });
      const row = await stored(db, "bits", id);
      expect(row).toMatchObject({
        status: "active", version: 1, description: "", priority: "high", deadline: 5_000, deadline_all_day: false,
        past_deadline_dismissed: false, deleted_at: null, archived_at: null, user_id: user.id,
      });
      expect(row.mtime).toBe(row.created_at);
      const parent = await stored(db, "nodes", p);
      expect(parent).toMatchObject({ version: 1, mtime: row.mtime });
      expect(envelope.changes.bits?.upserted).toEqual([row]);
      expect(envelope.changes.nodes?.upserted).toEqual([parent]);
    });
  });

  for (const key of ["status", "version", "mtime", "created_at", "deleted_at", "archived_at", "user_id", "id", "past_deadline_dismissed"]) {
    it(`fails on the key ${key}`, async () => {
      await withActor(authed(), async (db, owner) => {
        const { p } = await setup(db, owner);
        expect(await expectDbError(() => createBit(db, { ...BIT, parent_id: p, x: 2, y: 2, [key]: 1 }))).toBe("22023");
      });
    });
  }

  it("fails on a missing required key", async () => {
    await withActor(authed(), async (db, owner) => {
      const { p } = await setup(db, owner);
      expect(await expectDbError(() => createBit(db, { ...BIT, parent_id: p, x: 2 }))).toBe("22023");
    });
  });

  it("applies the invalid_target rules: no parent, the Archive", async () => {
    await withActor(authed(), async (db, owner) => {
      const { archive } = await setup(db, owner);
      expect(await createBit(db, { ...BIT, parent_id: null, x: 2, y: 2 })).toMatchObject({
        status: "rejected", rejection: { code: "invalid_target" },
      });
      expect(await createBit(db, { ...BIT, parent_id: archive, x: 2, y: 2 })).toMatchObject({
        rejection: { code: "invalid_target" },
      });
    });
  });

  it("rejects a trashed or archived parent, a missing parent and another account's parent", async () => {
    await withActor(authed(), async (db, owner) => {
      const { p } = await setup(db, owner);
      const theirs = await owner(async () => {
        await account(db, stranger.id);
        return addNode(db, { x: 5, y: 5 }, stranger.id);
      });
      await owner(() => db.query("update app.nodes set deleted_at = 5 where id = $1", [p]));
      expect(await createBit(db, { ...BIT, parent_id: p, x: 2, y: 2 })).toMatchObject({ rejection: { code: "parent_inactive" } });
      for (const parent of [randomUUID(), theirs]) {
        const envelope = await createBit(db, { ...BIT, parent_id: parent, x: 2, y: 2 });
        expect(envelope).toMatchObject({ status: "rejected", rejection: { code: "not_found" }, changes: {} });
      }
    });
  });

  it("rejects a taken cell, and a deadline past the parent Node's", async () => {
    await withActor(authed(), async (db, owner) => {
      const { p, other } = await setup(db, owner);
      expect(await createBit(db, { ...BIT, parent_id: p, x: 0, y: 0 })).toMatchObject({ rejection: { code: "cell_taken" } });
      await owner(async () => {
        await addNode(db, { parentId: p, level: 1, x: 4, y: 4 });
        await db.query("update app.nodes set deadline = 1000 where id = $1", [p]);
      });
      expect(await createBit(db, { ...BIT, parent_id: p, x: 4, y: 4 })).toMatchObject({ rejection: { code: "cell_taken" } });
      expect(await createBit(db, { ...BIT, parent_id: p, x: 5, y: 5, deadline: 1001 })).toMatchObject({
        rejection: { code: "deadline_exceeds_parent", table: "nodes" },
      });
      expect((await createBit(db, { ...BIT, parent_id: other, x: 0, y: 0 })).status).toBe("applied");
    });
  });

  it("keeps the Scratch sentinel: Bits at (0,0) under the Inbox may share the cell", async () => {
    await withActor(authed(), async (db, owner) => {
      const { inbox } = await setup(db, owner);
      for (let i = 0; i < 3; i += 1) {
        expect((await createBit(db, { ...BIT, parent_id: inbox, x: 0, y: 0 })).status).toBe("applied");
      }
      expect(await createBit(db, { ...BIT, parent_id: inbox, x: 1, y: 0 })).toMatchObject({ status: "applied" });
      expect(await createBit(db, { ...BIT, parent_id: inbox, x: 1, y: 0 })).toMatchObject({ rejection: { code: "cell_taken" } });
    });
  });
});

describe("update_bit", () => {
  it("edits fields: version + 1 once, mtime now, parent mtime touched, parent version kept", async () => {
    await withActor(authed(), async (db, owner) => {
      const { b, p } = await setup(db, owner);
      const envelope = await updateBit(db, b, { title: "Renamed", priority: "low", description: "d" });
      expect(envelope.status).toBe("applied");
      const row = await stored(db, "bits", b);
      expect(row).toMatchObject({ title: "Renamed", priority: "low", description: "d", version: 2 });
      expect(Number(row.mtime)).toBeGreaterThan(1_700_000_000_000);
      const parent = await stored(db, "nodes", p);
      expect(parent).toMatchObject({ version: 1, mtime: row.mtime });
      expect(envelope.changes.bits?.upserted).toEqual([row]);
      expect(envelope.changes.nodes?.upserted).toEqual([parent]);
    });
  });

  it("a status change touches the Bit and its parent", async () => {
    await withActor(authed(), async (db, owner) => {
      const { b, p } = await setup(db, owner);
      await updateBit(db, b, { status: "complete" });
      expect(await stored(db, "bits", b)).toMatchObject({ status: "complete", version: 2 });
      expect(Number((await stored(db, "nodes", p)).mtime)).toBeGreaterThan(1_700_000_000_000);
    });
  });

  it("a position-only change keeps both mtimes and adds one version", async () => {
    await withActor(authed(), async (db, owner) => {
      const { b, p } = await setup(db, owner);
      expect((await updateBit(db, b, { x: 5, y: 5 })).status).toBe("applied");
      expect(await stored(db, "bits", b)).toMatchObject({ x: 5, y: 5, version: 2, mtime: 1 });
      expect(await stored(db, "nodes", p)).toMatchObject({ mtime: 1 });
    });
  });

  it("a no-op is applied with no changes and no version change", async () => {
    await withActor(authed(), async (db, owner) => {
      const { b } = await setup(db, owner);
      for (const changes of [{}, { title: "B", x: 0, y: 0 }]) {
        expect(await updateBit(db, b, changes)).toEqual({ status: "applied", result: null, changes: {} });
      }
      expect(await stored(db, "bits", b)).toMatchObject({ version: 1, mtime: 1 });
    });
  });

  for (const key of ["version", "mtime", "created_at", "deleted_at", "archived_at", "user_id", "id", "level"]) {
    it(`fails on the key ${key} and writes nothing`, async () => {
      await withActor(authed(), async (db, owner) => {
        const { b } = await setup(db, owner);
        expect(await expectDbError(() => updateBit(db, b, { title: "x", [key]: 1 }))).toBe("22023");
      });
    });
  }

  it("returns not_found, account_missing; fails on a CHECK", async () => {
    await withActor(authed(), async (db, owner) => {
      const { b } = await setup(db, owner);
      expect(await updateBit(db, randomUUID(), { title: "x" })).toMatchObject({ rejection: { code: "not_found" } });
      expect(await expectDbError(() => updateBit(db, b, { status: "done" }))).toBe("23514");
    });
    await withActor(authed(), async (db) => {
      expect(await updateBit(db, randomUUID(), { title: "x" })).toMatchObject({ rejection: { code: "account_missing" } });
    });
  });

  it("moves to another Node: both parents touched, versions kept, cell checked", async () => {
    await withActor(authed(), async (db, owner) => {
      const { b, p, other } = await setup(db, owner);
      await owner(() => addBit(db, { parentId: other, x: 2, y: 2 }));
      expect(await updateBit(db, b, { parent_id: other, x: 2, y: 2 })).toMatchObject({ rejection: { code: "cell_taken" } });
      const envelope = await updateBit(db, b, { parent_id: other, x: 3, y: 2 });
      expect(envelope.status).toBe("applied");
      expect(await stored(db, "bits", b)).toMatchObject({ parent_id: other, x: 3, y: 2, version: 2, mtime: 1 });
      const nodes = envelope.changes.nodes?.upserted.map((n) => n.id).sort();
      expect(nodes).toEqual([p, other].sort());
      expect(Number((await stored(db, "nodes", p)).mtime)).toBeGreaterThan(1);
      expect(Number((await stored(db, "nodes", other)).mtime)).toBeGreaterThan(1);
      expect(await stored(db, "nodes", other)).toMatchObject({ version: 1 });
    });
  });

  it("applies the invalid_target rules: no parent, the Archive, into and out of the Inbox", async () => {
    await withActor(authed(), async (db, owner) => {
      const { b, inbox, archive } = await setup(db, owner);
      const scratch = await owner(() => addBit(db, { parentId: inbox, x: 0, y: 0 }));
      const cases: [string, unknown][] = [
        [b, { parent_id: null }],
        [b, { parent_id: archive, x: 2, y: 2 }],
        [b, { parent_id: inbox, x: 0, y: 0 }],
        [scratch, { parent_id: (await stored(db, "nodes", (await stored(db, "bits", b)).parent_id as string)).id, x: 2, y: 2 }],
      ];
      for (const [id, changes] of cases) {
        expect(await updateBit(db, id, changes)).toMatchObject({ status: "rejected", rejection: { code: "invalid_target" } });
      }
      expect(await stored(db, "bits", b)).toMatchObject({ version: 1 });
    });
  });

  it("rejects a move into a trashed Node, a missing Node and another account's Node", async () => {
    await withActor(authed(), async (db, owner) => {
      const { b, other } = await setup(db, owner);
      const theirs = await owner(async () => {
        await account(db, stranger.id);
        return addNode(db, { x: 5, y: 5 }, stranger.id);
      });
      await owner(() => db.query("update app.nodes set deleted_at = 5 where id = $1", [other]));
      expect(await updateBit(db, b, { parent_id: other, x: 1, y: 1 })).toMatchObject({ rejection: { code: "parent_inactive" } });
      for (const parent of [randomUUID(), theirs]) {
        expect(await updateBit(db, b, { parent_id: parent, x: 1, y: 1 })).toMatchObject({ rejection: { code: "not_found" } });
      }
    });
  });

  it("Hook 2: a deadline past the parent's is rejected with deadline_exceeds_parent", async () => {
    await withActor(authed(), async (db, owner) => {
      const { b, p } = await setup(db, owner);
      await owner(() => db.query("update app.nodes set deadline = 1000 where id = $1", [p]));
      const envelope = await updateBit(db, b, { deadline: 2000 });
      expect(envelope).toMatchObject({ status: "rejected", rejection: { code: "deadline_exceeds_parent", table: "nodes" } });
      expect(await stored(db, "bits", b)).toMatchObject({ deadline: null, version: 1 });
      expect(await stored(db, "nodes", p)).toMatchObject({ deadline: 1000, version: 1, mtime: 1 });
      expect((await updateBit(db, b, { deadline: 1000 })).status).toBe("applied");
    });
  });

  it("Hook 2: p_extend_parent extends the parent in the same call (one version each)", async () => {
    await withActor(authed(), async (db, owner) => {
      const { b, p } = await setup(db, owner);
      await owner(() => db.query("update app.nodes set deadline = 1000 where id = $1", [p]));
      const envelope = await updateBit(db, b, { deadline: 2000, deadline_all_day: true }, true);
      expect(envelope.status).toBe("applied");
      expect(await stored(db, "bits", b)).toMatchObject({ deadline: 2000, deadline_all_day: true, version: 2 });
      const parent = await stored(db, "nodes", p);
      expect(parent).toMatchObject({ deadline: 2000, deadline_all_day: true, version: 2 });
      expect(Number(parent.mtime)).toBeGreaterThan(1);
      expect(envelope.changes.nodes?.upserted).toEqual([parent]);
    });
  });

  it("Hook 2: p_extend_parent does nothing when the deadline already fits", async () => {
    await withActor(authed(), async (db, owner) => {
      const { b, p } = await setup(db, owner);
      await owner(() => db.query("update app.nodes set deadline = 1000 where id = $1", [p]));
      await updateBit(db, b, { deadline: 500 }, true);
      expect(await stored(db, "nodes", p)).toMatchObject({ deadline: 1000, version: 1 });
    });
  });

  it("Hook 2: a move into a Node the deadline does not fit, with and without the extension", async () => {
    await withActor(authed(), async (db, owner) => {
      const { b, other } = await setup(db, owner);
      await owner(async () => {
        await db.query("update app.nodes set deadline = 100 where id = $1", [other]);
        await db.query("update app.bits set deadline = 500 where id = $1", [b]);
      });
      expect(await updateBit(db, b, { parent_id: other, x: 1, y: 1 })).toMatchObject({
        rejection: { code: "deadline_exceeds_parent" },
      });
      expect((await updateBit(db, b, { parent_id: other, x: 1, y: 1 }, true)).status).toBe("applied");
      expect(await stored(db, "nodes", other)).toMatchObject({ deadline: 500, version: 2 });
    });
  });

  it("a Bit already in conflict can still be edited (Hook 2 scenario 2)", async () => {
    await withActor(authed(), async (db, owner) => {
      const { b, p } = await setup(db, owner);
      await owner(async () => {
        await db.query("update app.bits set deadline = 2000 where id = $1", [b]);
        await db.query("update app.nodes set deadline = 1000 where id = $1", [p]);
      });
      expect((await updateBit(db, b, { title: "Still editable", x: 7, y: 7 })).status).toBe("applied");
      expect(await stored(db, "bits", b)).toMatchObject({ title: "Still editable", deadline: 2000 });
    });
  });

  it("updates a trashed Bit without a lifecycle guard", async () => {
    await withActor(authed(), async (db, owner) => {
      const { b } = await setup(db, owner);
      await owner(() => db.query("update app.bits set deleted_at = 7 where id = $1", [b]));
      expect((await updateBit(db, b, { title: "Edited" })).status).toBe("applied");
      expect(await stored(db, "bits", b)).toMatchObject({ title: "Edited", deleted_at: 7 });
    });
  });
});

describe("account limits (S37)", () => {
  const fill = (db: Client, table: "nodes" | "bits", n: number, parent: string | null) =>
    table === "nodes"
      ? db.query(
          `insert into app.nodes (id, user_id, title, color, icon, mtime, created_at, level, x, y, deleted_at)
           select gen_random_uuid(), $1, 'f', 'hsl(1, 1%, 1%)', 'i', 1, 1, 0, 0, 0, 1 from generate_series(1, $2)`,
          [user.id, n],
        )
      : db.query(
          `insert into app.bits (id, user_id, title, icon, mtime, created_at, parent_id, x, y, deleted_at)
           select gen_random_uuid(), $1, 'f', 'i', 1, 1, $3, 0, 0, 1 from generate_series(1, $2)`,
          [user.id, n, parent],
        );
  const asGuest = (db: Client) =>
    db.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify({ role: "authenticated", sub: user.id, is_anonymous: true }),
    ]);

  it.each([
    ["nodes", false, 1000],
    ["nodes", true, 100],
    ["bits", false, 5000],
    ["bits", true, 300],
  ] as const)("%s: a %s account is stopped at %i, counting trashed rows", async (table, guest, limit) => {
    await withActor(authed(), async (db, owner) => {
      const { p } = await setup(db, owner);
      const existing = Number((await db.query(`select count(*) as n from app.${table}`)).rows[0].n);
      await owner(() => fill(db, table, limit - existing - 1, p));
      if (guest) await asGuest(db);
      const make = () =>
        table === "nodes"
          ? createNode(db, { ...NODE, x: 10, y: 4 })
          : createBit(db, { title: "b", icon: "i", parent_id: p, x: 10, y: 4 });
      expect((await make()).status).toBe("applied");
      const envelope = await make();
      expect(envelope).toMatchObject({
        status: "rejected",
        rejection: { code: "account_limit", table, limit },
      });
      const count = Number((await db.query(`select count(*) as n from app.${table}`)).rows[0].n);
      expect(count).toBe(limit);
    });
  }, 60_000);

  it("a real account's limit is not the guest's", async () => {
    await withActor(authed(), async (db, owner) => {
      const { p } = await setup(db, owner);
      const existing = Number((await db.query("select count(*) as n from app.nodes")).rows[0].n);
      await owner(() => fill(db, "nodes", 100 - existing, p));
      expect((await createNode(db, { ...NODE, x: 10, y: 4 })).status).toBe("applied");
    });
  });
});

describe("cross-account", () => {
  it("leaves another account's rows untouched and sees nothing of them", async () => {
    await withActor(authed(), async (db, owner) => {
      const { p } = await setup(db, owner);
      const theirs = await owner(async () => {
        await account(db, stranger.id);
        const node = await addNode(db, { x: 5, y: 5, title: "Theirs" }, stranger.id);
        const bit = await addBit(db, { parentId: node, x: 0, y: 0, title: "TheirBit" }, stranger.id);
        return { node, bit };
      });
      expect(await updateBit(db, theirs.bit, { title: "Hijacked" })).toMatchObject({ rejection: { code: "not_found" }, changes: {} });
      expect(await updateBit(db, (await owner(() => addBit(db, { parentId: p, x: 4, y: 4 }))), { parent_id: theirs.node, x: 1, y: 1 })).toMatchObject({
        rejection: { code: "not_found" },
      });
      // A create with an id another account holds fails and leaves that row unchanged.
      expect(await expectDbError(() => createNode(db, { ...NODE, x: 9, y: 8 }, theirs.node))).toBe("23505");
    });
  });

  it("a duplicate id fails and leaves the existing row unchanged", async () => {
    const owner = await connect();
    try {
      const u = await createTestUser("nb-dup");
      const v = await createTestUser("nb-dup-other");
      await account(owner, u.id);
      await account(owner, v.id);
      const theirs = await addNode(owner, { x: 5, y: 5, title: "Theirs" }, v.id);
      const theirBit = await addBit(owner, { parentId: theirs, x: 0, y: 0, title: "TheirBit" }, v.id);
      const mine = await addNode(owner, { x: 6, y: 6 }, u.id);
      await owner.end();
      await withActor(authed(u), async (db) => {
        expect(await expectDbError(() => createNode(db, { ...NODE, x: 9, y: 8 }, theirs))).toBe("23505");
      });
      await withActor(authed(u), async (db) => {
        expect(await expectDbError(() => createBit(db, { title: "x", icon: "i", parent_id: mine, x: 9, y: 8 }, theirBit))).toBe("23505");
      });
      const check = await connect();
      try {
        const { rows } = await check.query("select title, user_id, version from app.nodes where id = $1", [theirs]);
        expect(rows[0]).toEqual({ title: "Theirs", user_id: v.id, version: 1 });
        const bits = await check.query("select title, user_id from app.bits where id = $1", [theirBit]);
        expect(bits.rows[0]).toEqual({ title: "TheirBit", user_id: v.id });
      } finally {
        await check.end();
      }
    } finally {
      await owner.end().catch(() => undefined);
    }
  });
});

describe("change set (S31)", () => {
  it("before + changes equals after for creates, edits, moves, an extension and rejections", async () => {
    await withActor(authed(), async (db, owner) => {
      const { p, b, other, archive } = await setup(db, owner);
      // One transaction shares one timestamp, so reset the mtimes before every call: a parent
      // row left out of `changes` must show as a difference.
      const run = async (fn: () => Promise<Envelope>) => {
        await owner(() => db.query("update app.nodes set mtime = 1"));
        return assertChangeSet(db, user.id, fn as unknown as () => Promise<ChangeEnvelope>);
      };
      await run(() => createNode(db, { ...NODE, parent_id: p, x: 1, y: 1 }));
      await run(() => createNode(db, { ...NODE, x: 3, y: 3 })); // cell_taken
      await run(() => createBit(db, { title: "b", icon: "i", parent_id: p, x: 2, y: 2 }));
      await run(() => createBit(db, { title: "b", icon: "i", parent_id: archive, x: 2, y: 2 })); // invalid_target
      await run(() => updateBit(db, b, { title: "edited", priority: "mid" }));
      await run(() => updateBit(db, b, {}));
      await run(() => updateBit(db, b, { parent_id: other, x: 1, y: 1 }));
      await owner(() => db.query("update app.nodes set deadline = 1000 where id = $1", [other]));
      await run(() => updateBit(db, b, { deadline: 5000 })); // deadline_exceeds_parent
      await run(() => updateBit(db, b, { deadline: 5000 }, true));
      await run(() => updateBit(db, randomUUID(), { title: "x" })); // not_found
    });
  });
});

describe("concurrency (S30)", () => {
  async function open(u: TestUser): Promise<Client> {
    const db = await connect();
    await db.query("begin");
    await becomeActor(db, authed(u));
    return db;
  }

  async function waitForLockWait(watcher: Client, name: string): Promise<void> {
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

  // Runs `first` uncommitted, starts `second` (it must wait on a lock), commits `first`.
  async function race(
    u: TestUser,
    first: (db: Client) => Promise<Envelope>,
    second: (db: Client) => Promise<Envelope>,
    waiting: string,
  ): Promise<[Envelope, Envelope]> {
    const a = await open(u);
    const b = await open(u);
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

  async function committed(label: string) {
    const u = await createTestUser(label);
    const owner = await connect();
    try {
      await account(owner, u.id);
      const node = (o: Partial<Node>) => addNode(owner, o, u.id);
      const bit = (o: Partial<Bit>) => addBit(owner, o, u.id);
      return { u, owner, node, bit };
    } catch (error) {
      await owner.end();
      throw error;
    }
  }

  it("two creates into one cell: one is applied, the other cell_taken", async () => {
    const { u, owner, node } = await committed("nb-cell");
    try {
      const p = await node({ x: 3, y: 3 });
      const [first, second] = await race(
        u,
        (db) => createBit(db, { title: "a", icon: "i", parent_id: p, x: 2, y: 2 }),
        (db) => createNode(db, { ...NODE, parent_id: p, x: 2, y: 2 }),
        "create_node",
      );
      expect(first.status).toBe("applied");
      expect(second.rejection).toEqual({ code: "cell_taken" });
      const { rows } = await owner.query(
        "select (select count(*) from app.bits where parent_id = $1 and x = 2 and y = 2) + (select count(*) from app.nodes where parent_id = $1 and x = 2 and y = 2) as n",
        [p],
      );
      expect(Number(rows[0].n)).toBe(1);
    } finally {
      await owner.end();
    }
  }, 30_000);

  it("a create and an update_bit move into one cell: one is applied, the other cell_taken", async () => {
    const { u, owner, node, bit } = await committed("nb-move");
    try {
      const p = await node({ x: 3, y: 3 });
      const q = await node({ x: 4, y: 4 });
      const m = await bit({ parentId: q, x: 0, y: 0 });
      const [first, second] = await race(
        u,
        (db) => createBit(db, { title: "a", icon: "i", parent_id: p, x: 2, y: 2 }),
        (db) => updateBit(db, m, { parent_id: p, x: 2, y: 2 }),
        "update_bit",
      );
      expect(first.status).toBe("applied");
      expect(second.rejection).toEqual({ code: "cell_taken" });
    } finally {
      await owner.end();
    }
  }, 30_000);

  it("a Bit title edit that waits on the Bit's move is applied and the move stays", async () => {
    const { u, owner, node, bit } = await committed("nb-edit");
    try {
      const p = await node({ x: 3, y: 3 });
      const q = await node({ x: 4, y: 4 });
      const m = await bit({ parentId: p, x: 0, y: 0 });
      const [first, second] = await race(
        u,
        (db) => updateBit(db, m, { parent_id: q, x: 1, y: 1 }),
        (db) => updateBit(db, m, { title: "Edited" }),
        "update_bit",
      );
      expect(first.status).toBe("applied");
      expect(second.status).toBe("applied");
      const { rows } = await owner.query("select title, parent_id, version from app.bits where id = $1", [m]);
      expect(rows[0]).toEqual({ title: "Edited", parent_id: q, version: 3 });
    } finally {
      await owner.end();
    }
  }, 30_000);

  it("two update_bit calls on Bits of one Node (one extending the parent) end without a deadlock", async () => {
    const { u, owner, node, bit } = await committed("nb-lock");
    try {
      const p = await node({ x: 3, y: 3, deadline: 1000 });
      const q = await node({ x: 4, y: 4 });
      const b1 = await bit({ parentId: p, x: 0, y: 0 });
      const b2 = await bit({ parentId: q, x: 0, y: 0 });
      const [first, second] = await race(
        u,
        (db) => updateBit(db, b1, { deadline: 2000 }, true),
        (db) => updateBit(db, b2, { parent_id: p, x: 1, y: 1 }),
        "update_bit",
      );
      expect(first.status).toBe("applied");
      expect(second.status).toBe("applied");
    } finally {
      await owner.end();
    }
  }, 30_000);
});
