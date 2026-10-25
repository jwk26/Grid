import { randomUUID } from "node:crypto";
import type { Client } from "pg";
import { beforeAll, describe, expect, it } from "vitest";
import { assertChangeSet, type Envelope as ChangeEnvelope } from "./helpers/change-set";
import { withActor } from "./helpers/db";
import {
  account, addBit, addNode, authed, call, committed, race, sql, stored, uuid, type Envelope, type Owner,
} from "./helpers/lifecycle";
import { createTestUser, type TestUser } from "./helpers/users";

// soft_delete_node(), soft_delete_bit(), restore_node() and restore_bit() (Task 220, Stage 1):
// Hooks 4, 5, 8 and 12, ported from cascade-delete and cascade-restore, plus the reserved-cell,
// lifecycle and cross-account cases.

let user: TestUser;
let stranger: TestUser;

beforeAll(async () => {
  user = await createTestUser("tr");
  stranger = await createTestUser("tr-other");
});

const A = () => authed(user);
const softNode = (db: Client, id: string) => call(db, "soft_delete_node", [id]);
const softBit = (db: Client, id: string) => call(db, "soft_delete_bit", [id]);
const restoreNode = (db: Client, id: string, reserved?: unknown) =>
  call(db, "restore_node", reserved === undefined ? [id] : [id, JSON.stringify(reserved)]);
const restoreBit = (db: Client, id: string, reserved?: unknown) =>
  call(db, "restore_bit", reserved === undefined ? [id] : [id, JSON.stringify(reserved)]);
const node = (db: Client, o: Parameters<typeof addNode>[2] = {}, u = user) => addNode(db, u.id, o);
const bit = (db: Client, o: Parameters<typeof addBit>[2] = {}, u = user) => addBit(db, u.id, o);
const T = 1_700_000_020_000;
const ids = (t?: { upserted: { id?: unknown }[] }) => (t?.upserted ?? []).map((r) => r.id as string).sort();

// root R (0,0) > child C (1,0, level 1) > grandchild G (2,0, level 2); Bits: bc in C, bg in G, br in R.
async function tree(db: Client, owner: Owner) {
  return owner(async () => {
    await account(db, user.id);
    const t = { r: randomUUID(), c: randomUUID(), g: randomUUID(), bc: randomUUID(), bg: randomUUID(), br: randomUUID() };
    await node(db, { id: t.r, version: 10 });
    await node(db, { id: t.c, parentId: t.r, level: 1, x: 1, version: 2 });
    await node(db, { id: t.g, parentId: t.c, level: 2, x: 2, version: 3 });
    await bit(db, { id: t.bc, parentId: t.c, x: 3, version: 4 });
    await bit(db, { id: t.bg, parentId: t.g, x: 4, version: 5 });
    await bit(db, { id: t.br, parentId: t.r, x: 5, version: 6 });
    return t;
  });
}

describe("soft_delete_node", () => {
  it("trashes the subtree and its Bits with one timestamp, version + 1 each, and touches the parent", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await tree(db, owner);
      await owner(() => sql(db, "update app.nodes set mtime = 5 where id = $1", [t.r]));
      const envelope = await softNode(db, t.c);
      expect(envelope).toMatchObject({ status: "applied", result: { id: t.c } });
      const c = await stored(db, "nodes", t.c);
      expect(c.deleted_at).not.toBeNull();
      expect(c).toMatchObject({ version: 3 });
      expect(await stored(db, "nodes", t.g)).toMatchObject({ deleted_at: c.deleted_at, version: 4 });
      expect(await stored(db, "bits", t.bc)).toMatchObject({ deleted_at: c.deleted_at, version: 5 });
      expect(await stored(db, "bits", t.bg)).toMatchObject({ deleted_at: c.deleted_at, version: 6 });
      expect(await stored(db, "bits", t.br)).toMatchObject({ deleted_at: null, version: 6 });
      const root = await stored(db, "nodes", t.r);
      expect(root).toMatchObject({ deleted_at: null, version: 10 });
      expect(Number(root.mtime)).toBeGreaterThan(5);
      expect(ids(envelope.changes.nodes)).toEqual([t.r, t.c, t.g].sort());
      expect(ids(envelope.changes.bits)).toEqual([t.bc, t.bg].sort());
    });
  });

  it("is applied with no write when the Node is already trashed", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await tree(db, owner);
      await softNode(db, t.c);
      const before = await stored(db, "nodes", t.c);
      const envelope = await softNode(db, t.c);
      expect(envelope).toMatchObject({ status: "applied" });
      expect(ids(envelope.changes.nodes)).toEqual([t.c]);
      expect(await stored(db, "nodes", t.c)).toEqual(before);
      expect(await stored(db, "nodes", t.g)).toMatchObject({ version: 4 });
    });
  });

  it("leaves a descendant that is already trashed at its own time and version", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await tree(db, owner);
      await owner(() => sql(db, "update app.nodes set deleted_at = 77 where id = $1", [t.g]));
      await softNode(db, t.c);
      expect(await stored(db, "nodes", t.g)).toMatchObject({ deleted_at: 77, version: 3 });
      expect(await stored(db, "bits", t.bg)).toMatchObject({ version: 6 });
    });
  });

  it("leaves Chunks alone", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await tree(db, owner);
      const chunk = randomUUID();
      await owner(() => sql(db, `insert into app.chunks (id, user_id, title, "order", parent_id) values ($1, $2, 'c', 0, $3)`, [chunk, user.id, t.bc]));
      await softNode(db, t.c);
      expect(await stored(db, "chunks", chunk)).toMatchObject({ title: "c" });
    });
  });

  it("refuses a system Node with invalid_target and writes nothing", async () => {
    await withActor(A(), async (db, owner) => {
      await owner(() => account(db, user.id));
      const inbox = await owner(() => node(db, { systemRole: "inbox", x: 5, y: 5 }));
      const envelope = await softNode(db, inbox);
      expect(envelope).toMatchObject({ status: "rejected", rejection: { code: "invalid_target" } });
      expect(await stored(db, "nodes", inbox)).toMatchObject({ deleted_at: null, version: 1 });
    });
  });

  it("returns not_found (missing and another account's Node) and account_missing", async () => {
    await withActor(A(), async (db, owner) => {
      await tree(db, owner);
      const theirs = await owner(async () => {
        await account(db, stranger.id);
        return node(db, { x: 5, y: 5 }, stranger);
      });
      for (const id of [randomUUID(), theirs]) {
        expect(await softNode(db, id)).toMatchObject({ status: "rejected", rejection: { code: "not_found" }, changes: {} });
      }
      expect(await owner(() => stored(db, "nodes", theirs))).toMatchObject({ deleted_at: null, version: 1 });
    });
    await withActor(A(), async (db) => {
      expect(await softNode(db, randomUUID())).toMatchObject({ rejection: { code: "account_missing" } });
    });
  });
});

describe("soft_delete_bit", () => {
  it("trashes only the Bit, keeps its Chunks, bumps its version and touches the parent", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await tree(db, owner);
      const sibling = await owner(() => bit(db, { parentId: t.c, x: 6, version: 9 }));
      await owner(() => sql(db, "update app.nodes set mtime = 5 where id = $1", [t.c]));
      const envelope = await softBit(db, t.bc);
      expect(envelope).toMatchObject({ status: "applied", result: { id: t.bc } });
      expect(await stored(db, "bits", t.bc)).toMatchObject({ version: 5 });
      expect((await stored(db, "bits", t.bc)).deleted_at).not.toBeNull();
      expect(await stored(db, "bits", sibling)).toMatchObject({ deleted_at: null, version: 9 });
      const parent = await stored(db, "nodes", t.c);
      expect(parent).toMatchObject({ version: 2 });
      expect(Number(parent.mtime)).toBeGreaterThan(5);
      expect(ids(envelope.changes.bits)).toEqual([t.bc]);
      expect(ids(envelope.changes.nodes)).toEqual([t.c]);
    });
  });

  it("is applied with no write when the Bit is already trashed", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await tree(db, owner);
      await softBit(db, t.bc);
      const before = await stored(db, "bits", t.bc);
      expect(await softBit(db, t.bc)).toMatchObject({ status: "applied" });
      expect(await stored(db, "bits", t.bc)).toEqual(before);
    });
  });

  it("refuses an Inbox Scratch Bit with invalid_target", async () => {
    await withActor(A(), async (db, owner) => {
      await owner(() => account(db, user.id));
      const inbox = await owner(() => node(db, { systemRole: "inbox", x: 5, y: 5 }));
      const scratch = await owner(() => bit(db, { parentId: inbox }));
      expect(await softBit(db, scratch)).toMatchObject({ status: "rejected", rejection: { code: "invalid_target" } });
      expect(await stored(db, "bits", scratch)).toMatchObject({ deleted_at: null, version: 1 });
    });
  });

  it("returns not_found (missing and another account's Bit) and account_missing", async () => {
    await withActor(A(), async (db, owner) => {
      await tree(db, owner);
      const theirs = await owner(async () => {
        await account(db, stranger.id);
        const n = await node(db, { x: 5, y: 5 }, stranger);
        return bit(db, { parentId: n }, stranger);
      });
      for (const id of [randomUUID(), theirs]) {
        expect(await softBit(db, id)).toMatchObject({ rejection: { code: "not_found" } });
      }
      expect(await owner(() => stored(db, "bits", theirs))).toMatchObject({ deleted_at: null, version: 1 });
    });
    await withActor(A(), async (db) => {
      expect(await softBit(db, randomUUID())).toMatchObject({ rejection: { code: "account_missing" } });
    });
  });
});

describe("restore_node", () => {
  // Ported from cascade-restore: a trashed chain, an occupied cell, a descendant trashed on its own.
  it("restores the parent chain with BFS relocation, keeps an independently trashed descendant trashed", async () => {
    await withActor(A(), async (db, owner) => {
      await owner(() => account(db, user.id));
      const occupant = await owner(() => node(db, { id: uuid(1) }));
      const parent = await owner(() => node(db, { id: uuid(2), deletedAt: T, version: 2 }));
      const child = await owner(() => node(db, { id: uuid(3), parentId: parent, level: 1, deletedAt: T, version: 3 }));
      await owner(() => bit(db, { id: uuid(4), parentId: child }));
      const trashedBit = await owner(() => bit(db, { id: uuid(5), parentId: child, deletedAt: T, version: 4 }));
      const lone = await owner(() => node(db, { id: uuid(6), parentId: child, level: 2, x: 1, deletedAt: T + 10_000, version: 5 }));

      const envelope = await restoreNode(db, child);
      expect(envelope).toMatchObject({ status: "applied", result: { id: child } });
      expect(await stored(db, "nodes", parent)).toMatchObject({ deleted_at: null, x: 1, y: 0, version: 3 });
      expect(await stored(db, "nodes", child)).toMatchObject({ deleted_at: null, version: 4 });
      expect(await stored(db, "bits", trashedBit)).toMatchObject({ deleted_at: null, x: 1, y: 0, version: 5 });
      expect(await stored(db, "nodes", lone)).toMatchObject({ deleted_at: T + 10_000, version: 5 });
      expect(await stored(db, "nodes", occupant)).toMatchObject({ x: 0, y: 0, version: 1 });
      expect(ids(envelope.changes.nodes)).toEqual([parent, child].sort());

      // A second call is applied with no write.
      const again = await restoreNode(db, child);
      expect(again).toMatchObject({ status: "applied" });
      expect(await stored(db, "nodes", parent)).toMatchObject({ version: 3 });
      expect(await stored(db, "nodes", child)).toMatchObject({ version: 4 });
      expect(await stored(db, "bits", trashedBit)).toMatchObject({ version: 5 });
    });
  });

  it("restores the same-window members of a trashed ancestor, siblings included", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await tree(db, owner);
      const sibling = await owner(() => node(db, { parentId: t.r, level: 1, x: 7 }));
      await softNode(db, t.r);
      await restoreNode(db, t.g);
      for (const id of [t.r, t.c, t.g, sibling]) expect((await stored(db, "nodes", id)).deleted_at).toBeNull();
      for (const id of [t.bc, t.bg, t.br]) expect((await stored(db, "bits", id)).deleted_at).toBeNull();
      expect(await stored(db, "nodes", sibling)).toMatchObject({ version: 3 });
      expect(await stored(db, "nodes", t.c)).toMatchObject({ version: 4 });
    });
  });

  it("touches the parent of the restored root", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await tree(db, owner);
      await softNode(db, t.c);
      await owner(() => sql(db, "update app.nodes set mtime = 5 where id = $1", [t.r]));
      const envelope = await restoreNode(db, t.g);
      expect(Number((await stored(db, "nodes", t.r)).mtime)).toBeGreaterThan(5);
      expect(await stored(db, "nodes", t.r)).toMatchObject({ version: 10 });
      expect(ids(envelope.changes.nodes)).toEqual([t.r, t.c, t.g].sort());
    });
  });

  it("does not restore a member outside the 5 s window", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await tree(db, owner);
      await softNode(db, t.c);
      await owner(() => sql(db, "update app.nodes set deleted_at = deleted_at + 5001 where id = $1", [t.g]));
      await restoreNode(db, t.c);
      expect((await stored(db, "nodes", t.c)).deleted_at).toBeNull();
      expect((await stored(db, "nodes", t.g)).deleted_at).not.toBeNull();
      // The Bit of the trashed grandchild stays with it.
      expect((await stored(db, "bits", t.bg)).deleted_at).not.toBeNull();
    });
  });

  it("relocates around the reserved cells and rejects a malformed list", async () => {
    await withActor(A(), async (db, owner) => {
      await owner(() => account(db, user.id));
      const n = await owner(() => node(db, { x: 0, y: 0, deletedAt: T }));
      expect(await restoreNode(db, n, [{ x: 0, y: 0 }])).toMatchObject({ status: "applied" });
      const row = await stored(db, "nodes", n);
      expect(row.deleted_at).toBeNull();
      expect([row.x, row.y]).not.toEqual([0, 0]);
    });
    await withActor(A(), async (db, owner) => {
      await owner(() => account(db, user.id));
      const n = await owner(() => node(db, { deletedAt: T }));
      for (const bad of [[{ x: 18, y: 0 }], [{ x: 0 }], "no", Array.from({ length: 7 }, () => ({ x: 0, y: 0 }))]) {
        expect(await restoreNode(db, n, bad)).toMatchObject({ status: "rejected", rejection: { code: "invalid_input" } });
      }
      expect((await stored(db, "nodes", n)).deleted_at).not.toBeNull();
    });
  });

  const fill = (db: Client, parent: string | null, level: number) =>
    sql(
      db,
      `insert into app.nodes (id, user_id, title, color, icon, mtime, created_at, level, x, y, parent_id)
       select gen_random_uuid(), $1, 'f', 'hsl(210, 80%, 55%)', 'folder', 1, 1, $3, g % 18, g / 18, $2 from generate_series(0, 161) g`,
      [user.id, parent, level],
    );

  it("returns grid_full and writes nothing when the Grid has no free cell", async () => {
    await withActor(A(), async (db, owner) => {
      await owner(() => account(db, user.id));
      await owner(() => fill(db, null, 0));
      const trashed = await owner(() => node(db, { x: 0, y: 0, deletedAt: T, version: 8 }));
      const envelope = await restoreNode(db, trashed);
      expect(envelope).toMatchObject({ status: "rejected", rejection: { code: "grid_full" } });
      expect(await stored(db, "nodes", trashed)).toMatchObject({ deleted_at: T, version: 8 });
    });
  });

  it("rolls back every restored item when a later one has no free cell", async () => {
    await withActor(A(), async (db, owner) => {
      await owner(() => account(db, user.id));
      const p = await owner(() => node(db, { x: 3, y: 3, deletedAt: T, version: 2 }));
      const b = await owner(() => bit(db, { parentId: p, x: 0, y: 0, deletedAt: T, version: 2 }));
      await owner(() => fill(db, p, 1));
      const envelope = await restoreNode(db, p);
      expect(envelope).toMatchObject({ status: "rejected", rejection: { code: "grid_full" } });
      expect(await stored(db, "nodes", p)).toMatchObject({ deleted_at: T, version: 2 });
      expect(await stored(db, "bits", b)).toMatchObject({ deleted_at: T, version: 2 });
    });
  });

  it("returns parent_inactive when the Node would come back under an archived parent", async () => {
    await withActor(A(), async (db, owner) => {
      await owner(() => account(db, user.id));
      const p = await owner(() => node(db, { x: 3, y: 3, archivedAt: T }));
      const c = await owner(() => node(db, { parentId: p, level: 1, deletedAt: T, version: 2 }));
      expect(await restoreNode(db, c)).toMatchObject({ status: "rejected", rejection: { code: "parent_inactive" } });
      expect(await stored(db, "nodes", c)).toMatchObject({ deleted_at: T, version: 2 });
    });
  });

  it("returns not_found (missing and another account's Node) and account_missing", async () => {
    await withActor(A(), async (db, owner) => {
      await owner(() => account(db, user.id));
      const theirs = await owner(async () => {
        await account(db, stranger.id);
        return node(db, { x: 5, y: 5, deletedAt: T }, stranger);
      });
      for (const id of [randomUUID(), theirs]) {
        expect(await restoreNode(db, id)).toMatchObject({ rejection: { code: "not_found" } });
      }
      expect(await owner(() => stored(db, "nodes", theirs))).toMatchObject({ deleted_at: T, version: 1 });
    });
    await withActor(A(), async (db) => {
      expect(await restoreNode(db, randomUUID())).toMatchObject({ rejection: { code: "account_missing" } });
    });
  });
});

describe("restore_bit", () => {
  it("restores the trashed parent chain first, then the Bit", async () => {
    await withActor(A(), async (db, owner) => {
      await owner(() => account(db, user.id));
      const occupant = await owner(() => node(db, { id: uuid(11) }));
      const parent = await owner(() => node(db, { id: uuid(12), deletedAt: T, version: 2 }));
      const trashedBit = await owner(() => bit(db, { id: uuid(13), parentId: parent, deletedAt: T, version: 3 }));
      const envelope = await restoreBit(db, trashedBit);
      expect(envelope).toMatchObject({ status: "applied", result: { id: trashedBit } });
      expect(await stored(db, "nodes", parent)).toMatchObject({ deleted_at: null, x: 1, version: 3 });
      expect(await stored(db, "bits", trashedBit)).toMatchObject({ deleted_at: null, version: 4 });
      expect(await stored(db, "nodes", occupant)).toMatchObject({ x: 0 });
      expect(await restoreBit(db, trashedBit)).toMatchObject({ status: "applied" });
      expect(await stored(db, "bits", trashedBit)).toMatchObject({ version: 4 });
    });
  });

  it("relocates a Bit whose cell is taken and touches the parent Node", async () => {
    await withActor(A(), async (db, owner) => {
      await owner(() => account(db, user.id));
      const p = await owner(() => node(db, { x: 3, y: 3 }));
      await owner(() => bit(db, { parentId: p, x: 0, y: 0 }));
      const b = await owner(() => bit(db, { parentId: p, x: 0, y: 0, deletedAt: T, version: 2 }));
      await owner(() => sql(db, "update app.nodes set mtime = 5 where id = $1", [p]));
      const envelope = await restoreBit(db, b);
      expect(await stored(db, "bits", b)).toMatchObject({ deleted_at: null, x: 1, y: 0, version: 3 });
      expect(Number((await stored(db, "nodes", p)).mtime)).toBeGreaterThan(5);
      expect(ids(envelope.changes.nodes)).toEqual([p]);
    });
  });

  it("keeps an Inbox Scratch at the (0,0) sentinel even when other Scratches are active", async () => {
    await withActor(A(), async (db, owner) => {
      await owner(() => account(db, user.id));
      const inbox = await owner(() => node(db, { systemRole: "inbox", x: 5, y: 5 }));
      const active = await owner(() => bit(db, { parentId: inbox, x: 0, y: 0 }));
      const trashed = await owner(() => bit(db, { parentId: inbox, x: 0, y: 0, deletedAt: T, version: 3 }));
      expect(await restoreBit(db, trashed)).toMatchObject({ status: "applied" });
      expect(await stored(db, "bits", trashed)).toMatchObject({ deleted_at: null, x: 0, y: 0, version: 4 });
      expect(await stored(db, "bits", active)).toMatchObject({ x: 0, y: 0, version: 1 });
    });
  });

  it("relocates around the reserved cells and rejects a malformed list", async () => {
    await withActor(A(), async (db, owner) => {
      await owner(() => account(db, user.id));
      const p = await owner(() => node(db, { x: 3, y: 3 }));
      const b = await owner(() => bit(db, { parentId: p, x: 0, y: 0, deletedAt: T }));
      expect(await restoreBit(db, b, [{ x: 0, y: 0 }, { x: 1, y: 0 }])).toMatchObject({ status: "applied" });
      const row = await stored(db, "bits", b);
      expect([row.x, row.y]).not.toEqual([0, 0]);
      expect([row.x, row.y]).not.toEqual([1, 0]);
    });
    await withActor(A(), async (db, owner) => {
      await owner(() => account(db, user.id));
      const p = await owner(() => node(db, { x: 3, y: 3 }));
      const b = await owner(() => bit(db, { parentId: p, deletedAt: T }));
      expect(await restoreBit(db, b, [{ x: -1, y: 0 }])).toMatchObject({ rejection: { code: "invalid_input" } });
      expect((await stored(db, "bits", b)).deleted_at).toBe(T);
    });
  });

  it("returns grid_full when the Grid has no free cell, and parent_inactive under an archived Node", async () => {
    await withActor(A(), async (db, owner) => {
      await owner(() => account(db, user.id));
      const p = await owner(() => node(db, { x: 3, y: 3 }));
      await owner(() => sql(db, `insert into app.nodes (id, user_id, title, color, icon, mtime, created_at, level, x, y, parent_id)
        select gen_random_uuid(), $1, 'f', 'hsl(210, 80%, 55%)', 'folder', 1, 1, 1, g % 18, g / 18, $2 from generate_series(0, 161) g`, [user.id, p]));
      const b = await owner(() => bit(db, { parentId: p, deletedAt: T, version: 3 }));
      expect(await restoreBit(db, b)).toMatchObject({ status: "rejected", rejection: { code: "grid_full" } });
      expect(await stored(db, "bits", b)).toMatchObject({ deleted_at: T, version: 3 });
    });
    await withActor(A(), async (db, owner) => {
      await owner(() => account(db, user.id));
      const p = await owner(() => node(db, { x: 3, y: 3, archivedAt: T }));
      const b = await owner(() => bit(db, { parentId: p, deletedAt: T, version: 3 }));
      expect(await restoreBit(db, b)).toMatchObject({ rejection: { code: "parent_inactive" } });
      expect(await stored(db, "bits", b)).toMatchObject({ deleted_at: T, version: 3 });
    });
  });

  it("returns not_found (missing and another account's Bit) and account_missing", async () => {
    await withActor(A(), async (db, owner) => {
      await owner(() => account(db, user.id));
      const theirs = await owner(async () => {
        await account(db, stranger.id);
        const n = await node(db, { x: 5, y: 5 }, stranger);
        return bit(db, { parentId: n, deletedAt: T }, stranger);
      });
      for (const id of [randomUUID(), theirs]) {
        expect(await restoreBit(db, id)).toMatchObject({ rejection: { code: "not_found" } });
      }
      expect(await owner(() => stored(db, "bits", theirs))).toMatchObject({ deleted_at: T, version: 1 });
    });
    await withActor(A(), async (db) => {
      expect(await restoreBit(db, randomUUID())).toMatchObject({ rejection: { code: "account_missing" } });
    });
  });
});

describe("cross-account and change set", () => {
  it("leaves another account's rows untouched and sees nothing of them", async () => {
    await withActor(A(), async (db, owner) => {
      await tree(db, owner);
      const theirs = await owner(async () => {
        await account(db, stranger.id);
        const n = await node(db, { x: 9, y: 7 }, stranger);
        const b = await bit(db, { parentId: n }, stranger);
        const tn = await node(db, { x: 8, y: 8, deletedAt: T }, stranger);
        return { n, b, tn };
      });
      for (const out of [await softNode(db, theirs.n), await softBit(db, theirs.b), await restoreNode(db, theirs.tn)]) {
        expect(out).toMatchObject({ status: "rejected", rejection: { code: "not_found" }, changes: {} });
      }
      expect(await owner(() => stored(db, "nodes", theirs.n))).toMatchObject({ deleted_at: null, version: 1 });
      expect(await owner(() => stored(db, "bits", theirs.b))).toMatchObject({ deleted_at: null, version: 1 });
      expect(await owner(() => stored(db, "nodes", theirs.tn))).toMatchObject({ deleted_at: T, version: 1 });
    });
  });

  it("before + changes equals after for trash, restore, no-ops and rejections", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await tree(db, owner);
      const inbox = await owner(() => node(db, { systemRole: "inbox", x: 8, y: 8 }));
      // Reset every mtime before each call so a row left out of `changes` shows as a difference.
      const run = async (fn: () => Promise<Envelope>) => {
        await owner(() => sql(db, "update app.nodes set mtime = 1; update app.bits set mtime = 1"));
        return assertChangeSet(db, user.id, fn as unknown as () => Promise<ChangeEnvelope>);
      };
      await run(() => softNode(db, t.c));
      await run(() => softNode(db, t.c));
      await run(() => restoreNode(db, t.g));
      await run(() => restoreNode(db, t.g));
      await run(() => softBit(db, t.bc));
      await run(() => softBit(db, t.bc));
      await run(() => restoreBit(db, t.bc));
      await run(() => softNode(db, inbox));
      await run(() => softNode(db, randomUUID()));
      await run(() => restoreBit(db, randomUUID()));
      await run(() => restoreNode(db, t.r, [{ x: 99, y: 0 }]));
      await run(() => softNode(db, t.r));
      await run(() => restoreBit(db, t.br));
    });
  });
});

describe("concurrency (S30)", () => {
  const cell = (db: Client, parent: string, x: number, y: number) =>
    call(db, "create_bit", [randomUUID(), JSON.stringify({ title: "a", icon: "i", parent_id: parent, x, y })]);

  it("trashing a Node while a Bit is created in a descendant Grid: the Bit is trashed with it", async () => {
    const { u, owner, node, row } = await committed("tr-create");
    try {
      const p = await node({ x: 3, y: 3 });
      const c = await node({ parentId: p, level: 1, x: 1, y: 1 });
      let created = "";
      const [first, second] = await race(
        u,
        async (db) => {
          const e = await cell(db, c, 2, 2);
          created = (e.result as { id: string }).id;
          return e;
        },
        (db) => softNode(db, p),
        "soft_delete_node",
      );
      expect(first.status).toBe("applied");
      expect(second.status).toBe("applied");
      expect((await row("bits", created)).deleted_at).not.toBeNull();
      expect((await row("nodes", c)).deleted_at).not.toBeNull();
    } finally {
      await owner.end();
    }
  }, 30_000);

  it("a create in a Grid whose Node was just trashed is parent_inactive", async () => {
    const { u, owner, node } = await committed("tr-create2");
    try {
      const p = await node({ x: 3, y: 3 });
      const [first, second] = await race(u, (db) => softNode(db, p), (db) => cell(db, p, 1, 1), "create_bit");
      expect(first.status).toBe("applied");
      expect(second.rejection).toEqual({ code: "parent_inactive" });
    } finally {
      await owner.end();
    }
  }, 30_000);

  it("trashing a Node while another Node is moved into its subtree: the moved Node is trashed too", async () => {
    const { u, owner, node, row } = await committed("tr-move");
    try {
      const p = await node({ x: 3, y: 3 });
      const c = await node({ parentId: p, level: 1, x: 1, y: 1 });
      const m = await node({ x: 6, y: 6 });
      const [first, second] = await race(
        u,
        (db) => call(db, "update_node", [m, JSON.stringify({ parent_id: c, x: 0, y: 0 })]),
        (db) => softNode(db, p),
        "soft_delete_node",
      );
      expect(first.status).toBe("applied");
      expect(second.status).toBe("applied");
      expect((await row("nodes", m)).deleted_at).not.toBeNull();
    } finally {
      await owner.end();
    }
  }, 30_000);

  it("restore_node(A) while restore_bit restores a Bit under A: both end without a deadlock", async () => {
    const { u, owner, node, bit, row } = await committed("tr-rest");
    try {
      const a = await node({ x: 3, y: 3, deletedAt: T });
      const b1 = await bit({ parentId: a, x: 0, y: 0, deletedAt: T });
      const b2 = await bit({ parentId: a, x: 1, y: 0, deletedAt: T + 20_000 });
      const [first, second] = await race(u, (db) => restoreNode(db, a), (db) => restoreBit(db, b2), "restore_bit");
      expect(first.status).toBe("applied");
      expect(second.status).toBe("applied");
      expect((await row("bits", b1)).deleted_at).toBeNull();
      expect((await row("bits", b2)).deleted_at).toBeNull();
    } finally {
      await owner.end();
    }
  }, 30_000);

  it("a restore after a create into its original cell relocates; a create after a restore is cell_taken", async () => {
    const { u, owner, node, bit, row } = await committed("tr-cell");
    try {
      const p = await node({ x: 3, y: 3 });
      const b = await bit({ parentId: p, x: 0, y: 0, deletedAt: T });
      const [created, restored] = await race(u, (db) => cell(db, p, 0, 0), (db) => restoreBit(db, b), "restore_bit");
      expect(created.status).toBe("applied");
      expect(restored.status).toBe("applied");
      expect(await row("bits", b)).toMatchObject({ deleted_at: null, x: 1, y: 0 });
    } finally {
      await owner.end();
    }
    const second = await committed("tr-cell2");
    try {
      const p = await second.node({ x: 3, y: 3 });
      const b = await second.bit({ parentId: p, x: 0, y: 0, deletedAt: T });
      const [restored, created] = await race(second.u, (db) => restoreBit(db, b), (db) => cell(db, p, 0, 0), "create_bit");
      expect(restored.status).toBe("applied");
      expect(created.rejection).toEqual({ code: "cell_taken" });
    } finally {
      await second.owner.end();
    }
  }, 30_000);

  it("soft_delete_bit while update_bit edits the same Bit: both are applied and the Bit is trashed with the edit", async () => {
    const { u, owner, node, bit, row } = await committed("tr-bit");
    try {
      const p = await node({ x: 3, y: 3 });
      const b = await bit({ parentId: p, x: 0, y: 0 });
      const [first, second] = await race(
        u,
        (db) => call(db, "update_bit", [b, JSON.stringify({ title: "Edited" })]),
        (db) => softBit(db, b),
        "soft_delete_bit",
      );
      expect(first.status).toBe("applied");
      expect(second.status).toBe("applied");
      expect(await row("bits", b)).toMatchObject({ title: "Edited", version: 3 });
      expect((await row("bits", b)).deleted_at).not.toBeNull();
    } finally {
      await owner.end();
    }
  }, 30_000);
});
