import { randomUUID } from "node:crypto";
import type { Client } from "pg";
import { beforeAll, describe, expect, it } from "vitest";
import { assertChangeSet, type Envelope as ChangeEnvelope } from "./helpers/change-set";
import { withActor } from "./helpers/db";
import {
  account, addBit, addNode, authed, call, committed, race, sql, stored, uuid, type Envelope, type Owner,
} from "./helpers/lifecycle";
import { createTestUser, type TestUser } from "./helpers/users";

// archive_node(), archive_bit(), unarchive_node() and unarchive_bit() (Task 220, Stage 2): Hooks
// 10, 11 and 12, ported from archive.test.ts (the archive-sweep read cases are client reads; its
// two createNode cases, a cell held only by an archived or hidden Node is free, are in
// node-bit-writes.db.test.ts), plus the reserved-cell, lifecycle, concurrency and cross-account
// cases.

let user: TestUser;
let stranger: TestUser;

beforeAll(async () => {
  user = await createTestUser("ar");
  stranger = await createTestUser("ar-other");
});

const A = () => authed(user);
const archNode = (db: Client, id: string) => call(db, "archive_node", [id]);
const archBit = (db: Client, id: string) => call(db, "archive_bit", [id]);
const unNode = (db: Client, id: string, reserved?: unknown) =>
  call(db, "unarchive_node", reserved === undefined ? [id] : [id, JSON.stringify(reserved)]);
const unBit = (db: Client, id: string, reserved?: unknown) =>
  call(db, "unarchive_bit", reserved === undefined ? [id] : [id, JSON.stringify(reserved)]);
const node = (db: Client, o: Parameters<typeof addNode>[2] = {}, u = user) => addNode(db, u.id, o);
const bit = (db: Client, o: Parameters<typeof addBit>[2] = {}, u = user) => addBit(db, u.id, o);
const T = 1_700_000_100_000;
const ids = (t?: { upserted: { id?: unknown }[] }) => (t?.upserted ?? []).map((r) => r.id as string).sort();

// R (0,0, v2) > C (1,0, level 1, v3) with Bits b1 (v4) and b2 (v5) in C.
async function tree(db: Client, owner: Owner) {
  return owner(async () => {
    await account(db, user.id);
    const t = { r: uuid(1), c: uuid(2), b1: uuid(3), b2: uuid(4) };
    await node(db, { id: t.r, version: 2 });
    await node(db, { id: t.c, parentId: t.r, level: 1, version: 3 });
    await bit(db, { id: t.b1, parentId: t.c, version: 4 });
    await bit(db, { id: t.b2, parentId: t.c, x: 1, version: 5 });
    return t;
  });
}

describe("archive_node", () => {
  it("archives the subtree and its Bits with one timestamp, version + 1 each, and touches the parent", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await tree(db, owner);
      const envelope = await archNode(db, t.r);
      expect(envelope).toMatchObject({ status: "applied", result: { id: t.r } });
      const root = await stored(db, "nodes", t.r);
      expect(root.archived_at).not.toBeNull();
      expect(await stored(db, "nodes", t.c)).toMatchObject({ archived_at: root.archived_at, deleted_at: null, version: 4 });
      expect(await stored(db, "bits", t.b1)).toMatchObject({ archived_at: root.archived_at, deleted_at: null, version: 5 });
      expect(await stored(db, "bits", t.b2)).toMatchObject({ archived_at: root.archived_at, version: 6 });
      expect(root).toMatchObject({ deleted_at: null, version: 3 });
      expect(ids(envelope.changes.nodes)).toEqual([t.r, t.c].sort());
      expect(ids(envelope.changes.bits)).toEqual([t.b1, t.b2].sort());
    });
  });

  it("touches the parent Node's mtime and keeps its version", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await tree(db, owner);
      await owner(() => sql(db, "update app.nodes set mtime = 5 where id = $1", [t.r]));
      const envelope = await archNode(db, t.c);
      const root = await stored(db, "nodes", t.r);
      expect(Number(root.mtime)).toBeGreaterThan(5);
      expect(root).toMatchObject({ archived_at: null, version: 2 });
      expect(ids(envelope.changes.nodes)).toEqual([t.r, t.c].sort());
    });
  });

  it("is applied with no write when the Node is already archived", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await tree(db, owner);
      await archNode(db, t.r);
      const before = await stored(db, "nodes", t.c);
      const envelope = await archNode(db, t.r);
      expect(envelope).toMatchObject({ status: "applied" });
      expect(ids(envelope.changes.nodes)).toEqual([t.r]);
      expect(await stored(db, "nodes", t.c)).toEqual(before);
    });
  });

  it("keeps the time of a descendant archived on its own: it stays archived when the root is unarchived", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await tree(db, owner);
      await archNode(db, t.c);
      // The child was archived earlier than the root's cascade.
      await owner(() => sql(db, "update app.nodes set archived_at = archived_at - 10000 where id = $1; update app.bits set archived_at = archived_at - 10000 where parent_id = $1", [t.c]));
      const childTime = Number((await stored(db, "nodes", t.c)).archived_at);
      await archNode(db, t.r);
      expect(await stored(db, "nodes", t.c)).toMatchObject({ archived_at: childTime, version: 4 });
      expect(await stored(db, "bits", t.b1)).toMatchObject({ archived_at: childTime, version: 5 });
      await unNode(db, t.r);
      expect((await stored(db, "nodes", t.r)).archived_at).toBeNull();
      expect(await stored(db, "nodes", t.c)).toMatchObject({ archived_at: childTime });
      expect(await stored(db, "bits", t.b1)).toMatchObject({ archived_at: childTime });
    });
  });

  it("archives a trashed descendant too, and sets no deleted_at", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await tree(db, owner);
      await owner(() => sql(db, "update app.nodes set deleted_at = 77 where id = $1", [t.c]));
      await archNode(db, t.r);
      expect(await stored(db, "nodes", t.c)).toMatchObject({ deleted_at: 77, version: 4 });
      expect((await stored(db, "nodes", t.c)).archived_at).not.toBeNull();
      expect((await stored(db, "nodes", t.r)).deleted_at).toBeNull();
    });
  });

  it("refuses a system Node with invalid_target and writes nothing", async () => {
    await withActor(A(), async (db, owner) => {
      await owner(() => account(db, user.id));
      const inbox = await owner(() => node(db, { systemRole: "inbox", x: 5, y: 5, version: 7 }));
      expect(await archNode(db, inbox)).toMatchObject({ status: "rejected", rejection: { code: "invalid_target" } });
      expect(await stored(db, "nodes", inbox)).toMatchObject({ archived_at: null, version: 7 });
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
        expect(await archNode(db, id)).toMatchObject({ rejection: { code: "not_found" }, changes: {} });
      }
      expect(await owner(() => stored(db, "nodes", theirs))).toMatchObject({ archived_at: null, version: 1 });
    });
    await withActor(A(), async (db) => {
      expect(await archNode(db, randomUUID())).toMatchObject({ rejection: { code: "account_missing" } });
    });
  });
});

describe("archive_bit", () => {
  it("archives only the Bit (version + 1), leaves the Node archived_at alone and touches it", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await tree(db, owner);
      await owner(() => sql(db, "update app.nodes set mtime = 5 where id = $1", [t.c]));
      const envelope = await archBit(db, t.b1);
      expect(envelope).toMatchObject({ status: "applied", result: { id: t.b1 } });
      expect(await stored(db, "bits", t.b1)).toMatchObject({ deleted_at: null, version: 5 });
      expect((await stored(db, "bits", t.b1)).archived_at).not.toBeNull();
      expect(await stored(db, "bits", t.b2)).toMatchObject({ archived_at: null, version: 5 });
      const parent = await stored(db, "nodes", t.c);
      expect(parent).toMatchObject({ archived_at: null, version: 3 });
      expect(Number(parent.mtime)).toBeGreaterThan(5);
      expect(ids(envelope.changes.bits)).toEqual([t.b1]);
      expect(ids(envelope.changes.nodes)).toEqual([t.c]);
    });
  });

  it("is applied with no write when the Bit is already archived", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await tree(db, owner);
      await archBit(db, t.b1);
      const before = await stored(db, "bits", t.b1);
      expect(await archBit(db, t.b1)).toMatchObject({ status: "applied" });
      expect(await stored(db, "bits", t.b1)).toEqual(before);
    });
  });

  it("refuses an Inbox Scratch Bit with invalid_target and leaves both rows as they were", async () => {
    await withActor(A(), async (db, owner) => {
      await owner(() => account(db, user.id));
      const inbox = await owner(() => node(db, { systemRole: "inbox", x: 5, y: 5, version: 4 }));
      const scratch = await owner(() => bit(db, { parentId: inbox, version: 7 }));
      const before = [await stored(db, "nodes", inbox), await stored(db, "bits", scratch)];
      expect(await archBit(db, scratch)).toMatchObject({ status: "rejected", rejection: { code: "invalid_target" } });
      expect([await stored(db, "nodes", inbox), await stored(db, "bits", scratch)]).toEqual(before);
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
        expect(await archBit(db, id)).toMatchObject({ rejection: { code: "not_found" } });
      }
      expect(await owner(() => stored(db, "bits", theirs))).toMatchObject({ archived_at: null, version: 1 });
    });
    await withActor(A(), async (db) => {
      expect(await archBit(db, randomUUID())).toMatchObject({ rejection: { code: "account_missing" } });
    });
  });
});

describe("unarchive_node", () => {
  // Ported: same-window descendants come back, one archived on its own stays archived.
  it("restores same-window descendants and keeps independently archived ones archived", async () => {
    await withActor(A(), async (db, owner) => {
      await owner(() => account(db, user.id));
      const root = await owner(() => node(db, { id: uuid(9), archivedAt: T, version: 2 }));
      const child = await owner(() => node(db, { id: uuid(10), parentId: root, level: 1, archivedAt: T, version: 3 }));
      const lone = await owner(() => node(db, { id: uuid(11), parentId: child, level: 2, archivedAt: T - 10_000, version: 4 }));
      const b1 = await owner(() => bit(db, { id: uuid(12), parentId: child, archivedAt: T, version: 5 }));
      const b2 = await owner(() => bit(db, { id: uuid(13), parentId: lone, archivedAt: T - 10_000, version: 6 }));
      const envelope = await unNode(db, root);
      expect(envelope).toMatchObject({ status: "applied", result: { id: root } });
      expect(await stored(db, "nodes", root)).toMatchObject({ archived_at: null, deleted_at: null, version: 3 });
      expect(await stored(db, "nodes", child)).toMatchObject({ archived_at: null, version: 4 });
      expect(await stored(db, "nodes", lone)).toMatchObject({ archived_at: T - 10_000, version: 4 });
      expect(await stored(db, "bits", b1)).toMatchObject({ archived_at: null, version: 6 });
      expect(await stored(db, "bits", b2)).toMatchObject({ archived_at: T - 10_000, version: 6 });
      expect(ids(envelope.changes.nodes)).toEqual([root, child].sort());

      expect(await unNode(db, root)).toMatchObject({ status: "applied" });
      expect(await stored(db, "nodes", root)).toMatchObject({ version: 3 });
      expect(await stored(db, "bits", b1)).toMatchObject({ version: 6 });
    });
  });

  it("does not restore a Bit whose parent Node stays archived (outside the window)", async () => {
    await withActor(A(), async (db, owner) => {
      await owner(() => account(db, user.id));
      const root = await owner(() => node(db, { id: uuid(19), archivedAt: T }));
      const child = await owner(() => node(db, { id: uuid(20), parentId: root, level: 1, archivedAt: T - 10_000 }));
      const childBit = await owner(() => bit(db, { id: uuid(21), parentId: child, archivedAt: T }));
      await unNode(db, root);
      expect((await stored(db, "nodes", root)).archived_at).toBeNull();
      expect(await stored(db, "nodes", child)).toMatchObject({ archived_at: T - 10_000 });
      expect(await stored(db, "bits", childBit)).toMatchObject({ archived_at: T });
    });
  });

  it("restores an archived parent chain first and same-window siblings with it", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await tree(db, owner);
      const sibling = await owner(() => node(db, { parentId: t.r, level: 1, x: 7 }));
      await archNode(db, t.r);
      await unNode(db, t.c);
      for (const id of [t.r, t.c, sibling]) expect((await stored(db, "nodes", id)).archived_at).toBeNull();
      for (const id of [t.b1, t.b2]) expect((await stored(db, "bits", id)).archived_at).toBeNull();
    });
  });

  it("restores a Bit and a Node exactly 5000 ms from its Node's archive time, and keeps ones outside the window", async () => {
    await withActor(A(), async (db, owner) => {
      await owner(() => account(db, user.id));
      const n = await owner(() => node(db, { x: 3, y: 3, archivedAt: T, version: 2 }));
      const b1 = await owner(() => bit(db, { parentId: n, x: 0, y: 0, archivedAt: T, version: 2 }));
      const b2 = await owner(() => bit(db, { parentId: n, x: 1, y: 0, archivedAt: T - 10_000, version: 2 }));
      const b3 = await owner(() => bit(db, { parentId: n, x: 2, y: 0, archivedAt: T + 5000, version: 2 }));
      const b4 = await owner(() => bit(db, { parentId: n, x: 3, y: 0, archivedAt: T + 5001, version: 2 }));
      const c1 = await owner(() => node(db, { parentId: n, level: 1, x: 0, y: 1, archivedAt: T - 5000, version: 2 }));
      const c2 = await owner(() => node(db, { parentId: n, level: 1, x: 1, y: 1, archivedAt: T - 5001, version: 2 }));
      expect(await unNode(db, n)).toMatchObject({ status: "applied" });
      for (const id of [b1, b3]) expect(await stored(db, "bits", id)).toMatchObject({ archived_at: null, version: 3 });
      for (const id of [b2, b4]) expect(await stored(db, "bits", id)).toMatchObject({ version: 2 });
      expect((await stored(db, "bits", b2)).archived_at).not.toBeNull();
      expect((await stored(db, "bits", b4)).archived_at).not.toBeNull();
      expect(await stored(db, "nodes", c1)).toMatchObject({ archived_at: null, version: 3 });
      expect(await stored(db, "nodes", c2)).toMatchObject({ version: 2 });
      expect((await stored(db, "nodes", c2)).archived_at).not.toBeNull();
    });
  });

  it("moves to the nearest free cell when the original is taken or reserved", async () => {
    await withActor(A(), async (db, owner) => {
      await owner(() => account(db, user.id));
      await owner(() => node(db, { x: 0, y: 0 }));
      const n = await owner(() => node(db, { x: 0, y: 0, archivedAt: T }));
      await unNode(db, n);
      expect(await stored(db, "nodes", n)).toMatchObject({ x: 1, y: 0, archived_at: null });
    });
    await withActor(A(), async (db, owner) => {
      await owner(() => account(db, user.id));
      const n = await owner(() => node(db, { x: 0, y: 0, archivedAt: T }));
      await unNode(db, n, [{ x: 0, y: 0 }]);
      const row = await stored(db, "nodes", n);
      expect([row.x, row.y]).not.toEqual([0, 0]);
    });
    await withActor(A(), async (db, owner) => {
      await owner(() => account(db, user.id));
      const n = await owner(() => node(db, { archivedAt: T }));
      expect(await unNode(db, n, [{ x: 0 }])).toMatchObject({ rejection: { code: "invalid_input" } });
      expect((await stored(db, "nodes", n)).archived_at).toBe(T);
    });
  });

  it("returns grid_full and writes nothing when the Grid has no free cell", async () => {
    await withActor(A(), async (db, owner) => {
      await owner(() => account(db, user.id));
      await owner(() =>
        sql(db, `insert into app.nodes (id, user_id, title, color, icon, mtime, created_at, level, x, y)
          select gen_random_uuid(), $1, 'f', 'hsl(210, 80%, 55%)', 'folder', 1, 1, 0, g % 18, g / 18 from generate_series(0, 161) g`, [user.id]),
      );
      const n = await owner(() => node(db, { archivedAt: T, version: 8 }));
      expect(await unNode(db, n)).toMatchObject({ status: "rejected", rejection: { code: "grid_full" } });
      expect(await stored(db, "nodes", n)).toMatchObject({ archived_at: T, version: 8 });
    });
  });

  it("returns parent_inactive when the Node would come back under a trashed parent", async () => {
    await withActor(A(), async (db, owner) => {
      await owner(() => account(db, user.id));
      const p = await owner(() => node(db, { x: 3, y: 3, deletedAt: T }));
      const c = await owner(() => node(db, { parentId: p, level: 1, archivedAt: T, version: 2 }));
      expect(await unNode(db, c)).toMatchObject({ status: "rejected", rejection: { code: "parent_inactive" } });
      expect(await stored(db, "nodes", c)).toMatchObject({ archived_at: T, version: 2 });
    });
  });

  it("returns not_found (missing and another account's Node) and account_missing", async () => {
    await withActor(A(), async (db, owner) => {
      await owner(() => account(db, user.id));
      const theirs = await owner(async () => {
        await account(db, stranger.id);
        return node(db, { x: 5, y: 5, archivedAt: T }, stranger);
      });
      for (const id of [randomUUID(), theirs]) {
        expect(await unNode(db, id)).toMatchObject({ rejection: { code: "not_found" } });
      }
      expect(await owner(() => stored(db, "nodes", theirs))).toMatchObject({ archived_at: T, version: 1 });
    });
    await withActor(A(), async (db) => {
      expect(await unNode(db, randomUUID())).toMatchObject({ rejection: { code: "account_missing" } });
    });
  });
});

describe("unarchive_bit", () => {
  it("restores an archived parent chain first, then the Bit", async () => {
    await withActor(A(), async (db, owner) => {
      await owner(() => account(db, user.id));
      const parent = await owner(() => node(db, { id: uuid(14), archivedAt: T, version: 9 }));
      const b = await owner(() => bit(db, { id: uuid(15), parentId: parent, archivedAt: T, version: 11 }));
      const envelope = await unBit(db, b);
      expect(envelope).toMatchObject({ status: "applied", result: { id: b } });
      expect(await stored(db, "nodes", parent)).toMatchObject({ archived_at: null, deleted_at: null, version: 10 });
      expect(await stored(db, "bits", b)).toMatchObject({ archived_at: null, deleted_at: null, version: 12 });
      expect(await unBit(db, b)).toMatchObject({ status: "applied" });
      expect(await stored(db, "nodes", parent)).toMatchObject({ version: 10 });
      expect(await stored(db, "bits", b)).toMatchObject({ version: 12 });
    });
  });

  it("relocates a Bit whose cell is taken and touches the parent Node", async () => {
    await withActor(A(), async (db, owner) => {
      await owner(() => account(db, user.id));
      const p = await owner(() => node(db, { x: 3, y: 3 }));
      await owner(() => bit(db, { parentId: p, x: 0, y: 0 }));
      const b = await owner(() => bit(db, { parentId: p, x: 0, y: 0, archivedAt: T, version: 2 }));
      await owner(() => sql(db, "update app.nodes set mtime = 5 where id = $1", [p]));
      const envelope = await unBit(db, b);
      expect(await stored(db, "bits", b)).toMatchObject({ archived_at: null, x: 1, y: 0, version: 3 });
      expect(Number((await stored(db, "nodes", p)).mtime)).toBeGreaterThan(5);
      expect(ids(envelope.changes.nodes)).toEqual([p]);
    });
  });

  it("keeps an Inbox Scratch at the (0,0) sentinel even when other Scratches are active", async () => {
    await withActor(A(), async (db, owner) => {
      await owner(() => account(db, user.id));
      const inbox = await owner(() => node(db, { systemRole: "inbox", x: 5, y: 5 }));
      const active = await owner(() => bit(db, { parentId: inbox, x: 0, y: 0 }));
      const archived = await owner(() => bit(db, { parentId: inbox, x: 0, y: 0, archivedAt: T, version: 3 }));
      expect(await unBit(db, archived)).toMatchObject({ status: "applied" });
      expect(await stored(db, "bits", archived)).toMatchObject({ archived_at: null, x: 0, y: 0, version: 4 });
      expect(await stored(db, "bits", active)).toMatchObject({ x: 0, y: 0, version: 1 });
    });
  });

  it("relocates around the reserved cells and rejects a malformed list", async () => {
    await withActor(A(), async (db, owner) => {
      await owner(() => account(db, user.id));
      const p = await owner(() => node(db, { x: 3, y: 3 }));
      const b = await owner(() => bit(db, { parentId: p, x: 0, y: 0, archivedAt: T }));
      expect(await unBit(db, b, [{ x: 0, y: 0 }, { x: 1, y: 0 }])).toMatchObject({ status: "applied" });
      const row = await stored(db, "bits", b);
      expect([row.x, row.y]).not.toEqual([0, 0]);
      expect([row.x, row.y]).not.toEqual([1, 0]);
    });
    await withActor(A(), async (db, owner) => {
      await owner(() => account(db, user.id));
      const p = await owner(() => node(db, { x: 3, y: 3 }));
      const b = await owner(() => bit(db, { parentId: p, archivedAt: T }));
      expect(await unBit(db, b, "no")).toMatchObject({ rejection: { code: "invalid_input" } });
      expect((await stored(db, "bits", b)).archived_at).toBe(T);
    });
  });

  it("returns grid_full when the Grid has no free cell, and parent_inactive under a trashed Node", async () => {
    await withActor(A(), async (db, owner) => {
      await owner(() => account(db, user.id));
      const p = await owner(() => node(db, { x: 3, y: 3 }));
      await owner(() => sql(db, `insert into app.nodes (id, user_id, title, color, icon, mtime, created_at, level, x, y, parent_id)
        select gen_random_uuid(), $1, 'f', 'hsl(210, 80%, 55%)', 'folder', 1, 1, 1, g % 18, g / 18, $2 from generate_series(0, 161) g`, [user.id, p]));
      const b = await owner(() => bit(db, { parentId: p, archivedAt: T, version: 3 }));
      expect(await unBit(db, b)).toMatchObject({ status: "rejected", rejection: { code: "grid_full" } });
      expect(await stored(db, "bits", b)).toMatchObject({ archived_at: T, version: 3 });
    });
    await withActor(A(), async (db, owner) => {
      await owner(() => account(db, user.id));
      const p = await owner(() => node(db, { x: 3, y: 3, deletedAt: T }));
      const b = await owner(() => bit(db, { parentId: p, archivedAt: T, version: 3 }));
      expect(await unBit(db, b)).toMatchObject({ rejection: { code: "parent_inactive" } });
      expect(await stored(db, "bits", b)).toMatchObject({ archived_at: T, version: 3 });
    });
  });

  it("returns not_found (missing and another account's Bit) and account_missing", async () => {
    await withActor(A(), async (db, owner) => {
      await owner(() => account(db, user.id));
      const theirs = await owner(async () => {
        await account(db, stranger.id);
        const n = await node(db, { x: 5, y: 5 }, stranger);
        return bit(db, { parentId: n, archivedAt: T }, stranger);
      });
      for (const id of [randomUUID(), theirs]) {
        expect(await unBit(db, id)).toMatchObject({ rejection: { code: "not_found" } });
      }
      expect(await owner(() => stored(db, "bits", theirs))).toMatchObject({ archived_at: T, version: 1 });
    });
    await withActor(A(), async (db) => {
      expect(await unBit(db, randomUUID())).toMatchObject({ rejection: { code: "account_missing" } });
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
        const an = await node(db, { x: 8, y: 8, archivedAt: T }, stranger);
        return { n, b, an };
      });
      for (const out of [await archNode(db, theirs.n), await archBit(db, theirs.b), await unNode(db, theirs.an)]) {
        expect(out).toMatchObject({ status: "rejected", rejection: { code: "not_found" }, changes: {} });
      }
      expect(await owner(() => stored(db, "nodes", theirs.n))).toMatchObject({ archived_at: null, version: 1 });
      expect(await owner(() => stored(db, "bits", theirs.b))).toMatchObject({ archived_at: null, version: 1 });
      expect(await owner(() => stored(db, "nodes", theirs.an))).toMatchObject({ archived_at: T, version: 1 });
    });
  });

  it("before + changes equals after for archive, unarchive, no-ops and rejections", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await tree(db, owner);
      const inbox = await owner(() => node(db, { systemRole: "inbox", x: 8, y: 8 }));
      // Reset every mtime before each call so a row left out of `changes` shows as a difference.
      const run = async (fn: () => Promise<Envelope>) => {
        await owner(() => sql(db, "update app.nodes set mtime = 1; update app.bits set mtime = 1"));
        return assertChangeSet(db, user.id, fn as unknown as () => Promise<ChangeEnvelope>);
      };
      await run(() => archNode(db, t.c));
      await run(() => archNode(db, t.c));
      await run(() => unNode(db, t.c));
      await run(() => unNode(db, t.c));
      await run(() => archBit(db, t.b1));
      await run(() => archBit(db, t.b1));
      await run(() => unBit(db, t.b1));
      await run(() => archNode(db, inbox));
      await run(() => archNode(db, randomUUID()));
      await run(() => unBit(db, randomUUID()));
      await run(() => unNode(db, t.r, [{ x: 99, y: 0 }]));
      await run(() => archNode(db, t.r));
      await run(() => unBit(db, t.b2));
    });
  });
});

describe("concurrency (S30)", () => {
  const create = (db: Client, parent: string, x: number, y: number) =>
    call(db, "create_bit", [randomUUID(), JSON.stringify({ title: "a", icon: "i", parent_id: parent, x, y })]);

  it("archiving a Node while a Bit is created in a descendant Grid: the Bit is archived with it", async () => {
    const { u, owner, node, row } = await committed("ar-create");
    try {
      const p = await node({ x: 3, y: 3 });
      const c = await node({ parentId: p, level: 1, x: 1, y: 1 });
      let created = "";
      const [first, second] = await race(
        u,
        async (db) => {
          const e = await create(db, c, 2, 2);
          created = (e.result as { id: string }).id;
          return e;
        },
        (db) => archNode(db, p),
        "archive_node",
      );
      expect(first.status).toBe("applied");
      expect(second.status).toBe("applied");
      expect((await row("bits", created)).archived_at).not.toBeNull();
    } finally {
      await owner.end();
    }
  }, 30_000);

  it("a create in a Grid whose Node was just archived is parent_inactive", async () => {
    const { u, owner, node } = await committed("ar-create2");
    try {
      const p = await node({ x: 3, y: 3 });
      const [first, second] = await race(u, (db) => archNode(db, p), (db) => create(db, p, 1, 1), "create_bit");
      expect(first.status).toBe("applied");
      expect(second.rejection).toEqual({ code: "parent_inactive" });
    } finally {
      await owner.end();
    }
  }, 30_000);

  it("archiving a Node while another Node is moved into its subtree: the moved Node is archived too", async () => {
    const { u, owner, node, row } = await committed("ar-move");
    try {
      const p = await node({ x: 3, y: 3 });
      const c = await node({ parentId: p, level: 1, x: 1, y: 1 });
      const m = await node({ x: 6, y: 6 });
      const [first, second] = await race(
        u,
        (db) => call(db, "update_node", [m, JSON.stringify({ parent_id: c, x: 0, y: 0 })]),
        (db) => archNode(db, p),
        "archive_node",
      );
      expect(first.status).toBe("applied");
      expect(second.status).toBe("applied");
      expect((await row("nodes", m)).archived_at).not.toBeNull();
    } finally {
      await owner.end();
    }
  }, 30_000);

  it("unarchive_node(A) while unarchive_bit restores a Bit under A: both end without a deadlock", async () => {
    const { u, owner, node, bit, row } = await committed("ar-rest");
    try {
      const a = await node({ x: 3, y: 3, archivedAt: T });
      const b1 = await bit({ parentId: a, x: 0, y: 0, archivedAt: T });
      const b2 = await bit({ parentId: a, x: 1, y: 0, archivedAt: T + 20_000 });
      const [first, second] = await race(u, (db) => unNode(db, a), (db) => unBit(db, b2), "unarchive_bit");
      expect(first.status).toBe("applied");
      expect(second.status).toBe("applied");
      expect((await row("bits", b1)).archived_at).toBeNull();
      expect((await row("bits", b2)).archived_at).toBeNull();
    } finally {
      await owner.end();
    }
  }, 30_000);

  it("an unarchive after a create into its original cell relocates; a create after an unarchive is cell_taken", async () => {
    const { u, owner, node, bit, row } = await committed("ar-cell");
    try {
      const p = await node({ x: 3, y: 3 });
      const b = await bit({ parentId: p, x: 0, y: 0, archivedAt: T });
      const [created, restored] = await race(u, (db) => create(db, p, 0, 0), (db) => unBit(db, b), "unarchive_bit");
      expect(created.status).toBe("applied");
      expect(restored.status).toBe("applied");
      expect(await row("bits", b)).toMatchObject({ archived_at: null, x: 1, y: 0 });
    } finally {
      await owner.end();
    }
    const second = await committed("ar-cell2");
    try {
      const p = await second.node({ x: 3, y: 3 });
      const b = await second.bit({ parentId: p, x: 0, y: 0, archivedAt: T });
      const [restored, created] = await race(second.u, (db) => unBit(db, b), (db) => create(db, p, 0, 0), "create_bit");
      expect(restored.status).toBe("applied");
      expect(created.rejection).toEqual({ code: "cell_taken" });
    } finally {
      await second.owner.end();
    }
  }, 30_000);

  it("archive_bit while update_bit edits the same Bit: both are applied and the Bit is archived with the edit", async () => {
    const { u, owner, node, bit, row } = await committed("ar-bit");
    try {
      const p = await node({ x: 3, y: 3 });
      const b = await bit({ parentId: p, x: 0, y: 0 });
      const [first, second] = await race(
        u,
        (db) => call(db, "update_bit", [b, JSON.stringify({ title: "Edited" })]),
        (db) => archBit(db, b),
        "archive_bit",
      );
      expect(first.status).toBe("applied");
      expect(second.status).toBe("applied");
      expect(await row("bits", b)).toMatchObject({ title: "Edited", version: 3 });
      expect((await row("bits", b)).archived_at).not.toBeNull();
    } finally {
      await owner.end();
    }
  }, 30_000);
});
