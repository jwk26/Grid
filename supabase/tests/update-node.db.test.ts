import { randomUUID } from "node:crypto";
import type { Client } from "pg";
import { beforeAll, describe, expect, it } from "vitest";
import { baseEntities } from "@/lib/db/boundary-cases";
import { accountToRow, bitToRow, nodeToRow } from "@/lib/db/row-mapping";
import type { Bit, Node } from "@/lib/db/schema";
import { assertChangeSet, type Envelope as ChangeEnvelope } from "./helpers/change-set";
import { becomeActor, connect, expectDbError, insertRow, withActor } from "./helpers/db";
import { createTestUser, type TestUser } from "./helpers/users";

// update_node() (Task 217): the ordinary-write contract of SCHEMA §Database Functions with the
// Node structure rules of Hook 8. Last write wins: there is no expected version (S15).

type Row = Record<string, unknown>;
type Envelope = {
  status: string;
  result: unknown;
  changes: { nodes?: { upserted: Row[]; deleted: string[] } };
  rejection?: { code: string };
};

let user: TestUser;
let stranger: TestUser;

beforeAll(async () => {
  user = await createTestUser("un");
  stranger = await createTestUser("un-other");
});

const authed = (u: TestUser = user) => ({ role: "authenticated" as const, userId: u.id });

async function update(
  db: Client,
  id: string,
  changes: unknown,
  reserved?: unknown,
): Promise<Envelope> {
  const { rows } =
    reserved === undefined
      ? await db.query("select public.update_node($1, $2::jsonb) as e", [id, JSON.stringify(changes)])
      : await db.query("select public.update_node($1, $2::jsonb, $3::jsonb) as e", [
          id,
          JSON.stringify(changes),
          JSON.stringify(reserved),
        ]);
  return rows[0].e as Envelope;
}

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

async function node(db: Client, id: string): Promise<Row> {
  const { rows } = await db.query("select * from app.nodes where id = $1", [id]);
  return rows[0];
}

const stored = async (db: Client, id: string) =>
  (await db.query("select to_jsonb(n.*) as r from app.nodes n where id = $1", [id])).rows[0].r as Row;

// A seeded account with an L0 tree: root R (3,3), child C (L1, 0,0) and grandchild G (L2, 0,0)
// under C, plus a free L0 Node S (5,5). Cells start at x >= 3 or y >= 1 where they share a
// Grid with the system Nodes. Runs as the owner inside `withActor`.
async function tree(db: Client, owner: <R>(run: () => Promise<R>) => Promise<R>) {
  return owner(async () => {
    await account(db, user.id);
    const ids = { r: randomUUID(), c: randomUUID(), g: randomUUID(), s: randomUUID() };
    await addNode(db, { id: ids.r, x: 3, y: 3, title: "R" });
    await addNode(db, { id: ids.c, parentId: ids.r, level: 1, x: 0, y: 0, title: "C" });
    await addNode(db, { id: ids.g, parentId: ids.c, level: 2, x: 0, y: 0, title: "G" });
    await addNode(db, { id: ids.s, x: 5, y: 5, title: "S" });
    return ids;
  });
}

describe("update_node: fields, mtime and version", () => {
  it("edits fields: version + 1 once, mtime now, the complete row in changes", async () => {
    await withActor(authed(), async (db, owner) => {
      const { s } = await tree(db, owner);
      const before = Date.now();
      const envelope = await update(db, s, { title: "Renamed", color: "hsl(10, 50%, 50%)", deadline: 5_000 });
      expect(envelope.status).toBe("applied");
      expect(envelope.result).toBeNull();
      const row = await stored(db, s);
      expect(row).toMatchObject({ title: "Renamed", color: "hsl(10, 50%, 50%)", deadline: 5_000, version: 2 });
      expect(Number(row.mtime)).toBeGreaterThanOrEqual(before - 5_000);
      expect(envelope.changes).toEqual({ nodes: { upserted: [row], deleted: [] } });
    });
  });

  it("a null value sets the column to null; an absent key is left alone", async () => {
    await withActor(authed(), async (db, owner) => {
      const { s } = await tree(db, owner);
      await update(db, s, { deadline: 9_000, deadline_all_day: true });
      await update(db, s, { deadline: null });
      expect(await node(db, s)).toMatchObject({ deadline: null, deadline_all_day: true, title: "S" });
    });
  });

  it("a position-only change keeps mtime (Hook 1) and still adds one version", async () => {
    await withActor(authed(), async (db, owner) => {
      const { s } = await tree(db, owner);
      const envelope = await update(db, s, { x: 7, y: 6 });
      expect(envelope.status).toBe("applied");
      expect(await node(db, s)).toMatchObject({ x: 7, y: 6, version: 2, mtime: "1" });
    });
  });

  it("a no-op is applied with no changes and no version change", async () => {
    await withActor(authed(), async (db, owner) => {
      const { s } = await tree(db, owner);
      for (const changes of [{}, { title: "S", x: 5, y: 5 }]) {
        const envelope = await update(db, s, changes);
        expect(envelope).toEqual({ status: "applied", result: null, changes: {} });
      }
      expect(await node(db, s)).toMatchObject({ version: 1, mtime: "1" });
    });
  });

  it("a Node deadline earlier than a child Bit's is applied (Hook 2 scenario 2 only)", async () => {
    await withActor(authed(), async (db, owner) => {
      const { s } = await tree(db, owner);
      await owner(() => addBit(db, { parentId: s, deadline: 100_000 }));
      const envelope = await update(db, s, { deadline: 50_000 });
      expect(envelope.status).toBe("applied");
      expect(await node(db, s)).toMatchObject({ deadline: "50000" });
    });
  });

  it("updates a trashed or archived Node without a lifecycle guard", async () => {
    await withActor(authed(), async (db, owner) => {
      const { s } = await tree(db, owner);
      await owner(() => db.query("update app.nodes set deleted_at = 7 where id = $1", [s]));
      expect((await update(db, s, { title: "Still editable" })).status).toBe("applied");
      expect(await node(db, s)).toMatchObject({ title: "Still editable", deleted_at: "7" });
    });
  });
});

describe("update_node: input rules", () => {
  const forbidden = [
    "level", "id", "user_id", "version", "mtime", "created_at", "system_role",
    "deleted_at", "archived_at", "unknown_key",
  ];
  for (const key of forbidden) {
    it(`fails on the key ${key} and writes nothing`, async () => {
      await withActor(authed(), async (db, owner) => {
        const { s } = await tree(db, owner);
        await db.query("savepoint before_call");
        const code = await expectDbError(() => update(db, s, { title: "Changed", [key]: 1 }));
        expect(code).toBe("22023");
        await db.query("rollback to savepoint before_call");
        expect(await node(db, s)).toMatchObject({ title: "S", version: 1 });
      });
    });
  }

  it("fails when p_changes is not a JSON object", async () => {
    await withActor(authed(), async (db, owner) => {
      const { s } = await tree(db, owner);
      expect(await expectDbError(() => update(db, s, [1]))).toBe("22023");
    });
  });

  it("rejects a malformed reserved-cell list with invalid_input", async () => {
    await withActor(authed(), async (db, owner) => {
      const { s } = await tree(db, owner);
      const envelope = await update(db, s, { title: "x" }, [{ x: 99, y: 0 }]);
      expect(envelope.status).toBe("rejected");
      expect(envelope.rejection).toEqual({ code: "invalid_input" });
      expect(await node(db, s)).toMatchObject({ title: "S" });
    });
  });

  it("fails on a value the table refuses (CHECK), not with a rejection", async () => {
    await withActor(authed(), async (db, owner) => {
      const { s } = await tree(db, owner);
      expect(await expectDbError(() => update(db, s, { x: 18 }))).toBe("23514");
    });
  });

  it("returns not_found for an unknown id", async () => {
    await withActor(authed(), async (db, owner) => {
      await tree(db, owner);
      const envelope = await update(db, randomUUID(), { title: "x" });
      expect(envelope).toMatchObject({ status: "rejected", rejection: { code: "not_found" }, changes: {} });
    });
  });

  it("returns account_missing for a caller without an accounts row", async () => {
    const bare = await createTestUser("un-bare");
    await withActor(authed(bare), async (db) => {
      const envelope = await update(db, randomUUID(), { title: "x" });
      expect(envelope).toMatchObject({ status: "rejected", rejection: { code: "account_missing" } });
    });
  });
});

describe("update_node: cells (Hook 8)", () => {
  it("rejects a taken cell held by a Node or by a Bit, and returns the current row", async () => {
    await withActor(authed(), async (db, owner) => {
      const { s, r } = await tree(db, owner);
      const onNode = await update(db, s, { x: 3, y: 3 });
      expect(onNode.status).toBe("rejected");
      expect(onNode.rejection).toEqual({ code: "cell_taken" });
      expect(onNode.changes.nodes?.upserted).toEqual([await stored(db, s)]);
      expect(await node(db, s)).toMatchObject({ x: 5, y: 5, version: 1 });

      await owner(() => addBit(db, { parentId: r, x: 4, y: 4 }));
      const onBit = await update(db, s, { parent_id: r, x: 4, y: 4 });
      expect(onBit.rejection).toEqual({ code: "cell_taken" });
    });
  });

  it("treats a trashed or archived item's cell, and a hidden L0 Node's, as free", async () => {
    await withActor(authed(), async (db, owner) => {
      const { s, r } = await tree(db, owner);
      await owner(() => db.query("update app.nodes set deleted_at = 1 where id = $1", [r]));
      expect((await update(db, s, { x: 3, y: 3 })).status).toBe("applied");
    });
  });

  it("moves into the same cell it already holds without a conflict with itself", async () => {
    await withActor(authed(), async (db, owner) => {
      const { s } = await tree(db, owner);
      expect((await update(db, s, { x: 5, y: 5, title: "same cell" })).status).toBe("applied");
    });
  });
});

describe("update_node: parent change and Node structure rules", () => {
  it("derives levels for the moved Node and its descendants, and touches both parents", async () => {
    await withActor(authed(), async (db, owner) => {
      const { r, c, g, s } = await tree(db, owner);
      // Move C (with G) from under R to L0: C becomes level 0, G level 1.
      const envelope = await update(db, c, { parent_id: null, x: 6, y: 6 });
      expect(envelope.status).toBe("applied");
      expect(await node(db, c)).toMatchObject({ parent_id: null, level: 0, version: 2, mtime: "1" });
      expect(await node(db, g)).toMatchObject({ level: 1, version: 2, mtime: "1" });
      const oldParent = await node(db, r);
      expect(oldParent.version).toBe(1);
      expect(oldParent.mtime).not.toBe("1");
      const upserted = envelope.changes.nodes?.upserted.map((row) => row.id).sort();
      expect(upserted).toEqual([r, c, g].sort());
      expect(upserted).not.toContain(s);

      // And back under S (level 0): C level 1, G level 2.
      const back = await update(db, c, { parent_id: s, x: 0, y: 0 });
      expect(back.status).toBe("applied");
      expect(await node(db, c)).toMatchObject({ parent_id: s, level: 1, version: 3 });
      expect(await node(db, g)).toMatchObject({ level: 2, version: 3 });
      expect((await node(db, s)).mtime).not.toBe("1");
    });
  });

  it("does not bump a descendant whose level stays the same", async () => {
    await withActor(authed(), async (db, owner) => {
      const { c, g, s } = await tree(db, owner);
      const other = await owner(() => addNode(db, { x: 8, y: 8, title: "Other" }));
      await update(db, c, { parent_id: other, x: 0, y: 0 });
      expect(await node(db, g)).toMatchObject({ level: 2, version: 1 });
      expect(s).toBeTruthy();
    });
  });

  it("rejects a move into itself or into its own subtree with invalid_target", async () => {
    await withActor(authed(), async (db, owner) => {
      const { r, c, g } = await tree(db, owner);
      for (const target of [r, c, g]) {
        const envelope = await update(db, r, { parent_id: target, x: 1, y: 1 });
        expect(envelope.rejection).toEqual({ code: "invalid_target" });
      }
      expect((await update(db, c, { parent_id: g, x: 1, y: 1 })).rejection).toEqual({ code: "invalid_target" });
      expect(await node(db, r)).toMatchObject({ parent_id: null, version: 1 });
    });
  });

  it("rejects a move after which any Node of the subtree would be below level 2", async () => {
    await withActor(authed(), async (db, owner) => {
      const { r, c, g, s } = await tree(db, owner);
      // R has depth 2 (C, G): under S (level 0) R would be level 1, G level 3.
      expect((await update(db, r, { parent_id: s, x: 1, y: 1 })).rejection).toEqual({ code: "invalid_target" });
      // S has depth 0: under C (level 1) it is level 2, which is allowed.
      const under = await update(db, s, { parent_id: c, x: 1, y: 1 });
      expect(under.status, JSON.stringify(under)).toBe("applied");
      expect(await node(db, s)).toMatchObject({ level: 2 });
      // Under G (level 2) it would be level 3.
      const deeper = await owner(() => addNode(db, { x: 9, y: 8 }));
      expect((await update(db, deeper, { parent_id: g, x: 1, y: 1 })).rejection).toEqual({ code: "invalid_target" });
    });
  });

  it("rejects a move into a system Node, and a parent change of a system Node", async () => {
    await withActor(authed(), async (db, owner) => {
      const { s, r } = await tree(db, owner);
      await db.query("select public.ensure_account()");
      const { rows } = await db.query("select id, system_role from app.nodes where system_role is not null");
      const inbox = rows.find((row) => row.system_role === "inbox").id as string;
      const archive = rows.find((row) => row.system_role === "archive_view").id as string;
      expect((await update(db, s, { parent_id: inbox, x: 0, y: 0 })).rejection).toEqual({ code: "invalid_target" });
      expect((await update(db, s, { parent_id: archive, x: 0, y: 0 })).rejection).toEqual({ code: "invalid_target" });
      expect((await update(db, inbox, { parent_id: r, x: 2, y: 2 })).rejection).toEqual({ code: "invalid_target" });
      expect(await node(db, inbox)).toMatchObject({ parent_id: null });
    });
  });

  it("rejects hidden_from_grid set on a non-system Node", async () => {
    await withActor(authed(), async (db, owner) => {
      const { s } = await tree(db, owner);
      expect((await update(db, s, { hidden_from_grid: true })).rejection).toEqual({ code: "invalid_target" });
      expect((await update(db, s, { hidden_from_grid: false })).status).toBe("applied");
    });
  });

  it("rejects a trashed or archived parent with parent_inactive", async () => {
    await withActor(authed(), async (db, owner) => {
      const { s, r } = await tree(db, owner);
      await owner(() => db.query("update app.nodes set deleted_at = 3 where id = $1", [r]));
      expect((await update(db, s, { parent_id: r, x: 1, y: 1 })).rejection).toEqual({ code: "parent_inactive" });
      await owner(() => db.query("update app.nodes set deleted_at = null, archived_at = 3 where id = $1", [r]));
      expect((await update(db, s, { parent_id: r, x: 1, y: 1 })).rejection).toEqual({ code: "parent_inactive" });
      expect(await node(db, s)).toMatchObject({ parent_id: null });
    });
  });

  it("returns not_found for a parent that does not exist", async () => {
    await withActor(authed(), async (db, owner) => {
      const { s } = await tree(db, owner);
      expect((await update(db, s, { parent_id: randomUUID(), x: 1, y: 1 })).rejection).toEqual({ code: "not_found" });
    });
  });
});

describe("update_node: showing a hidden system Node", () => {
  async function hiddenInbox(db: Client, owner: <R>(run: () => Promise<R>) => Promise<R>) {
    await owner(() => account(db, user.id));
    await db.query("select public.ensure_account()");
    const { rows } = await db.query("select id from app.nodes where system_role = 'inbox'");
    const id = rows[0].id as string;
    await owner(() => db.query("update app.nodes set hidden_from_grid = true, x = 4, y = 4 where id = $1", [id]));
    return id;
  }

  it("ignores x and y and picks the first free L0 cell outside the reserved cells", async () => {
    await withActor(authed(), async (db, owner) => {
      const inbox = await hiddenInbox(db, owner);
      const envelope = await update(db, inbox, { hidden_from_grid: false, x: 9, y: 9 }, [{ x: 0, y: 0 }, { x: 2, y: 0 }]);
      expect(envelope.status).toBe("applied");
      // The Archive holds 1,0; the reserved cells 0,0 and 2,0 count as taken.
      expect(await node(db, inbox)).toMatchObject({ hidden_from_grid: false, x: 3, y: 0, version: 2 });
    });
  });

  it("is rejected with grid_full when no L0 cell is free", async () => {
    await withActor(authed(), async (db, owner) => {
      const inbox = await hiddenInbox(db, owner);
      await owner(() =>
        db.query(
          `insert into app.nodes (id, user_id, title, color, icon, mtime, created_at, level, x, y)
           select gen_random_uuid(), $1, 'F', 'hsl(210, 80%, 55%)', 'folder', 1, 1, 0, g.x, h.y
             from generate_series(0, 17) g(x), generate_series(0, 8) h(y)
            where not exists (
              select 1 from app.nodes n
               where n.user_id = $1 and n.parent_id is null and not n.hidden_from_grid and n.x = g.x and n.y = h.y)`,
          [user.id],
        ),
      );
      const envelope = await update(db, inbox, { hidden_from_grid: false });
      expect(envelope.rejection).toEqual({ code: "grid_full" });
      expect(await node(db, inbox)).toMatchObject({ hidden_from_grid: true, x: 4, y: 4, version: 1 });
    });
  });
});

describe("update_node: cross-account", () => {
  it("leaves another account's Node untouched and sees nothing of it", async () => {
    await withActor(authed(), async (db, owner) => {
      await owner(async () => {
        await account(db, user.id);
        await account(db, stranger.id);
      });
      const theirs = await owner(() => addNode(db, { x: 5, y: 5, title: "Theirs" }, stranger.id));
      const mine = await owner(() => addNode(db, { x: 6, y: 6, title: "Mine" }));
      const edit = await update(db, theirs, { title: "Hijacked", x: 7, y: 7 });
      expect(edit).toMatchObject({ status: "rejected", rejection: { code: "not_found" }, changes: {} });
      const into = await update(db, mine, { parent_id: theirs, x: 0, y: 0 });
      expect(into).toMatchObject({ status: "rejected", rejection: { code: "not_found" } });
      expect(into.changes.nodes?.upserted ?? []).not.toContainEqual(expect.objectContaining({ user_id: stranger.id }));
      await owner(async () => {
        expect(await node(db, theirs)).toMatchObject({ title: "Theirs", x: 5, y: 5, version: 1 });
        expect(await node(db, mine)).toMatchObject({ parent_id: null, version: 1 });
      });
    });
  });

  it("a cell held by another account's Node does not block", async () => {
    await withActor(authed(), async (db, owner) => {
      await owner(async () => {
        await account(db, user.id);
        await account(db, stranger.id);
      });
      await owner(() => addNode(db, { x: 5, y: 5 }, stranger.id));
      const mine = await owner(() => addNode(db, { x: 6, y: 6 }));
      expect((await update(db, mine, { x: 5, y: 5 })).status).toBe("applied");
    });
  });
});

describe("update_node: change set (S31)", () => {
  it("before + changes equals after for an edit, a no-op, a move and a rejection", async () => {
    await withActor(authed(), async (db, owner) => {
      const { r, c, s } = await tree(db, owner);
      const call = (id: string, changes: unknown) => (d: Client) =>
        update(d, id, changes) as unknown as Promise<ChangeEnvelope>;
      await assertChangeSet(db, user.id, call(s, { title: "edited" }));
      await assertChangeSet(db, user.id, call(s, {}));
      await assertChangeSet(db, user.id, call(c, { parent_id: null, x: 6, y: 6 }));
      await assertChangeSet(db, user.id, call(c, { parent_id: s, x: 0, y: 0 }));
      await assertChangeSet(db, user.id, call(s, { x: 3, y: 3 })); // cell_taken by R
      await assertChangeSet(db, user.id, call(r, { parent_id: r, x: 1, y: 1 })); // invalid_target
      await assertChangeSet(db, user.id, call(randomUUID(), { title: "x" })); // not_found
    });
  });
});

describe("update_node: concurrency (S30)", () => {
  type Session = { db: Client; envelope?: Promise<Envelope> };

  async function open(u: TestUser): Promise<Client> {
    const db = await connect();
    await db.query("begin");
    await becomeActor(db, authed(u));
    return db;
  }

  async function waitForLockWait(watcher: Client): Promise<void> {
    for (let i = 0; i < 80; i += 1) {
      const { rows } = await watcher.query(
        "select 1 from pg_stat_activity where wait_event_type = 'Lock' and state = 'active' and query like '%update_node%'",
      );
      if (rows.length > 0) return;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error("the second call never waited for the first");
  }

  // Runs `first` and leaves it uncommitted, starts `second` (it must wait on a lock), commits
  // `first`, and returns both envelopes.
  async function race(
    u: TestUser,
    first: (db: Client) => Promise<Envelope>,
    second: (db: Client) => Promise<Envelope>,
  ): Promise<[Envelope, Envelope]> {
    const a: Session = { db: await open(u) };
    const b: Session = { db: await open(u) };
    const watcher = await connect();
    try {
      const firstEnvelope = await first(a.db);
      const pending = second(b.db);
      await waitForLockWait(watcher);
      await a.db.query("commit");
      const secondEnvelope = await pending;
      await b.db.query("commit");
      return [firstEnvelope, secondEnvelope];
    } finally {
      await a.db.query("rollback").catch(() => undefined);
      await b.db.query("rollback").catch(() => undefined);
      await a.db.end();
      await b.db.end();
      await watcher.end();
    }
  }

  async function committedAccount(label: string) {
    const u = await createTestUser(label);
    const owner = await connect();
    try {
      await account(owner, u.id);
      const add = (overrides: Partial<Node>) => addNode(owner, overrides, u.id);
      return { u, owner, add };
    } catch (error) {
      await owner.end();
      throw error;
    }
  }

  it("two moves into one cell: one is applied, the other cell_taken", async () => {
    const { u, owner, add } = await committedAccount("un-cell");
    try {
      const p = await add({ x: 3, y: 3 });
      const a = await add({ x: 4, y: 4 });
      const b = await add({ x: 5, y: 5 });
      const [first, second] = await race(
        u,
        (db) => update(db, a, { parent_id: p, x: 2, y: 2 }),
        (db) => update(db, b, { parent_id: p, x: 2, y: 2 }),
      );
      expect(first.status).toBe("applied");
      expect(second.rejection).toEqual({ code: "cell_taken" });
      const { rows } = await owner.query("select count(*)::int as n from app.nodes where parent_id = $1 and x = 2 and y = 2", [p]);
      expect(rows[0].n).toBe(1);
    } finally {
      await owner.end();
    }
  }, 30_000);

  it("crossing moves, A into B and B into A: one applied, one invalid_target, no deadlock", async () => {
    const { u, owner, add } = await committedAccount("un-cross");
    try {
      const a = await add({ x: 3, y: 3 });
      const b = await add({ x: 4, y: 4 });
      const [first, second] = await race(
        u,
        (db) => update(db, a, { parent_id: b, x: 0, y: 0 }),
        (db) => update(db, b, { parent_id: a, x: 0, y: 0 }),
      );
      expect(first.status).toBe("applied");
      expect(second.rejection).toEqual({ code: "invalid_target" });
      const { rows } = await owner.query("select title, parent_id from app.nodes where user_id = $1 and parent_id is not null", [u.id]);
      expect(rows).toHaveLength(1);
    } finally {
      await owner.end();
    }
  }, 30_000);

  it("depth race, A under B while F under A's child: one is rejected, no Node ends below level 2", async () => {
    const { u, owner, add } = await committedAccount("un-depth");
    try {
      const b = await add({ x: 3, y: 3 });
      const a = await add({ x: 4, y: 4 });
      const a1 = await add({ parentId: a, level: 1, x: 0, y: 0 });
      const f = await add({ x: 5, y: 5 });
      const [first, second] = await race(
        u,
        (db) => update(db, a, { parent_id: b, x: 0, y: 0 }),
        (db) => update(db, f, { parent_id: a1, x: 0, y: 0 }),
      );
      expect(first.status).toBe("applied");
      expect(second.rejection).toEqual({ code: "invalid_target" });
      const { rows } = await owner.query("select max(level)::int as m from app.nodes where user_id = $1", [u.id]);
      expect(rows[0].m).toBeLessThanOrEqual(2);
    } finally {
      await owner.end();
    }
  }, 30_000);

  it("a title edit that waits on a move of the same Node is applied and the new parent stays", async () => {
    const { u, owner, add } = await committedAccount("un-edit");
    try {
      const p = await add({ x: 3, y: 3 });
      const m = await add({ x: 4, y: 4 });
      const [first, second] = await race(
        u,
        (db) => update(db, m, { parent_id: p, x: 1, y: 1 }),
        (db) => update(db, m, { title: "Edited" }),
      );
      expect(first.status).toBe("applied");
      expect(second.status).toBe("applied");
      const { rows } = await owner.query("select title, parent_id, level, version from app.nodes where id = $1", [m]);
      expect(rows[0]).toEqual({ title: "Edited", parent_id: p, level: 1, version: 3 });
    } finally {
      await owner.end();
    }
  }, 30_000);

  it("a move into a Node that is being trashed: parent_inactive after the wait", async () => {
    const { u, owner, add } = await committedAccount("un-trash");
    try {
      const p = await add({ x: 3, y: 3 });
      const m = await add({ x: 4, y: 4 });
      const trasher = await connect();
      try {
        await trasher.query("begin");
        await trasher.query("select id from app.nodes where id = $1 for update", [p]);
        await trasher.query("update app.nodes set deleted_at = 5 where id = $1", [p]);
        const mover = await open(u);
        const watcher = await connect();
        try {
          const pending = update(mover, m, { parent_id: p, x: 1, y: 1 });
          await waitForLockWait(watcher);
          await trasher.query("commit");
          const envelope = await pending;
          await mover.query("commit");
          expect(envelope.rejection).toEqual({ code: "parent_inactive" });
        } finally {
          await mover.query("rollback").catch(() => undefined);
          await mover.end();
          await watcher.end();
        }
      } finally {
        await trasher.query("rollback").catch(() => undefined);
        await trasher.end();
      }
    } finally {
      await owner.end();
    }
  }, 30_000);
});
