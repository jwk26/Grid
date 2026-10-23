import { randomUUID } from "node:crypto";
import type { Client } from "pg";
import { beforeAll, describe, expect, it } from "vitest";
import { baseEntities } from "@/lib/db/boundary-cases";
import { nodeToRow } from "@/lib/db/row-mapping";
import type { Node } from "@/lib/db/schema";
import { connect, becomeActor, expectDbError, insertRow, withActor } from "./helpers/db";
import { createClient } from "@supabase/supabase-js";
import { adminClient, createTestUser, signedInClient, type TestUser } from "./helpers/users";

// Ported from src/lib/db/system-nodes.test.ts (the answer key), plus the account row, the
// cell picking of feedback F34, concurrency (S30) and the deleted-auth-user case.

type Role = "inbox" | "archive_view";
type Envelope = {
  status: string;
  result: unknown;
  changes: { nodes?: { upserted: Array<Record<string, unknown>>; deleted: string[] } };
  rejection?: { code: string };
};

const SEEDS: Record<Role, { title: string; icon: string; color: string }> = {
  inbox: { title: "Inbox", icon: "inbox", color: "hsl(221, 83%, 53%)" },
  archive_view: { title: "Archive", icon: "layers", color: "hsl(240, 4%, 46%)" },
};

let user: TestUser;

beforeAll(async () => {
  user = await createTestUser("ea");
});

const authed = (u: TestUser = user) => ({ role: "authenticated" as const, userId: u.id });

async function ensure(db: Client, reserved?: unknown): Promise<Envelope> {
  const { rows } =
    reserved === undefined
      ? await db.query("select public.ensure_account() as e")
      : await db.query("select public.ensure_account($1::jsonb) as e", [JSON.stringify(reserved)]);
  return rows[0].e as Envelope;
}

async function addNode(db: Client, overrides: Partial<Node>, userId = user.id): Promise<string> {
  const id = overrides.id ?? randomUUID();
  await insertRow(db, "nodes", nodeToRow({ ...baseEntities.node, ...overrides, id }, userId));
  return id;
}

async function nodes(db: Client, userId = user.id) {
  const { rows } = await db.query(
    "select * from app.nodes where user_id = $1 order by y, x, id",
    [userId],
  );
  return rows;
}

async function systemNodes(db: Client, role: Role, userId = user.id) {
  const { rows } = await db.query(
    "select * from app.nodes where user_id = $1 and system_role = $2",
    [userId, role],
  );
  return rows;
}

const cell = (row: { x: number; y: number }) => `${row.x},${row.y}`;

async function fillL0(db: Client, skip: Array<[number, number]> = []) {
  await db.query(
    `insert into app.nodes (id, user_id, title, color, icon, mtime, created_at, level, x, y)
     select gen_random_uuid(), $1, 'User ' || x || ',' || y, 'hsl(210, 80%, 55%)', 'folder', 1, 1, 0, x, y
       from generate_series(0, 17) x, generate_series(0, 8) y
      where not ((x, y) in (select (v ->> 0)::int, (v ->> 1)::int from jsonb_array_elements($2::jsonb) v))`,
    [user.id, JSON.stringify(skip)],
  );
}

describe("ensure_account: fresh account", () => {
  it("creates the account row, one Inbox and one Archive with the default properties", async () => {
    await withActor(authed(), async (db) => {
      const before = Date.now();
      const envelope = await ensure(db);
      expect(envelope.status).toBe("applied");
      expect(envelope.result).toBeNull();

      const all = await nodes(db);
      expect(all).toHaveLength(2);
      for (const role of ["inbox", "archive_view"] as const) {
        const [node, ...rest] = await systemNodes(db, role);
        expect(rest).toEqual([]);
        expect(node).toMatchObject({
          ...SEEDS[role],
          system_role: role,
          level: 0,
          parent_id: null,
          hidden_from_grid: false,
          archived_at: null,
          deleted_at: null,
          deadline: null,
          deadline_all_day: false,
          past_deadline_dismissed: false,
          version: 1,
        });
        expect(Number(node.created_at)).toBeGreaterThanOrEqual(before - 5_000);
        expect(node.mtime).toBe(node.created_at);
      }
      const account = await db.query("select * from app.accounts where user_id = $1", [user.id]);
      expect(account.rows).toHaveLength(1);
      expect(account.rows[0].seeded_at).toBeNull();
    });
  });

  it("returns the written Nodes as complete rows in changes, never accounts", async () => {
    await withActor(authed(), async (db) => {
      const envelope = await ensure(db);
      const stored = (await db.query("select to_jsonb(n.*) as r from app.nodes n")).rows.map((row) => row.r);
      const upserted = envelope.changes.nodes?.upserted ?? [];
      expect(Object.keys(envelope.changes)).toEqual(["nodes"]);
      expect(envelope.changes.nodes?.deleted).toEqual([]);
      const byId = (l: Record<string, unknown>, r: Record<string, unknown>) => String(l.id).localeCompare(String(r.id));
      expect(stored).toHaveLength(2);
      expect([...upserted].sort(byId)).toEqual([...stored].sort(byId));
    });
  });

  it("puts the two roles in non-colliding L0 cells, row-major from 0,0", async () => {
    await withActor(authed(), async (db) => {
      await ensure(db);
      const [inbox] = await systemNodes(db, "inbox");
      const [archive] = await systemNodes(db, "archive_view");
      expect([cell(inbox), cell(archive)]).toEqual(["0,0", "1,0"]);
    });
  });

  it("is idempotent: a second call changes nothing but last_visit_at and reports no changes", async () => {
    await withActor(authed(), async (db) => {
      await ensure(db);
      const first = await nodes(db);
      const second = await ensure(db);
      expect(second.status).toBe("applied");
      expect(second.changes).toEqual({});
      expect(await nodes(db)).toEqual(first);
    });
  });

  it("advances last_visit_at and keeps created_at", async () => {
    await withActor(authed(), async (db, owner) => {
      await owner(() =>
        db.query(
          "insert into app.accounts (user_id, created_at, last_visit_at) values ($1, 1000, 1000)",
          [user.id],
        ),
      );
      await ensure(db);
      const { rows } = await db.query("select created_at, last_visit_at from app.accounts");
      expect(Number(rows[0].created_at)).toBe(1000);
      expect(Number(rows[0].last_visit_at)).toBeGreaterThan(1_700_000_000_000);
    });
  });
});

describe("ensure_account: existing Nodes", () => {
  it("creates only the Archive when the Inbox exists, and leaves the Inbox untouched", async () => {
    await withActor(authed(), async (db, owner) => {
      await owner(() =>
        addNode(db, { title: "Custom Inbox", icon: "tray", systemRole: "inbox", x: 4, y: 1, version: 3 }),
      );
      const before = await systemNodes(db, "inbox");
      await ensure(db);
      expect(await systemNodes(db, "inbox")).toEqual(before);
      expect(await systemNodes(db, "archive_view")).toHaveLength(1);
    });
  });

  it("creates only the Inbox when the Archive exists", async () => {
    await withActor(authed(), async (db, owner) => {
      await owner(() => addNode(db, { title: "Custom Archive", icon: "archive", systemRole: "archive_view", x: 3, y: 2 }));
      const before = await systemNodes(db, "archive_view");
      await ensure(db);
      expect(await systemNodes(db, "archive_view")).toEqual(before);
      expect(await systemNodes(db, "inbox")).toHaveLength(1);
    });
  });

  it("does not disturb user L0 Nodes and avoids their cells", async () => {
    await withActor(authed(), async (db, owner) => {
      const id = await owner(() => addNode(db, { title: "User Node", x: 0, y: 0 }));
      const before = (await db.query("select * from app.nodes where id = $1", [id])).rows;
      await ensure(db);
      expect((await db.query("select * from app.nodes where id = $1", [id])).rows).toEqual(before);
      const [inbox] = await systemNodes(db, "inbox");
      const [archive] = await systemNodes(db, "archive_view");
      expect([cell(inbox), cell(archive)]).toEqual(["1,0", "2,0"]);
    });
  });

  it("preserves custom fields and hiddenFromGrid on an existing system Node", async () => {
    await withActor(authed(), async (db, owner) => {
      await owner(() =>
        addNode(db, { title: "My Work", icon: "star", color: "hsl(0,0%,50%)", hiddenFromGrid: true, systemRole: "inbox", x: 7, y: 3 }),
      );
      await ensure(db);
      const [inbox] = await systemNodes(db, "inbox");
      expect(inbox).toMatchObject({ title: "My Work", icon: "star", color: "hsl(0,0%,50%)", hidden_from_grid: true, x: 7, y: 3 });
    });
  });

  it("ignores another account's Nodes and cells", async () => {
    await withActor(authed(), async (db, owner) => {
      const stranger = await owner(() => createTestUser("ex"));
      await owner(() => addNode(db, { x: 0, y: 0 }, stranger.id));
      await ensure(db);
      const [inbox] = await systemNodes(db, "inbox");
      expect(cell(inbox)).toBe("0,0");
    });
  });
});

describe("ensure_account: lifecycle drift", () => {
  it("returns a trashed Inbox to active in place, keeps its fields, version +1, idempotent", async () => {
    await withActor(authed(), async (db, owner) => {
      await owner(() =>
        addNode(db, { title: "My Work", icon: "star", color: "hsl(0,0%,50%)", systemRole: "inbox", deletedAt: 1_700_000_100_000, x: 0, y: 0, version: 3 }),
      );
      const envelope = await ensure(db);
      const [inbox, ...rest] = await systemNodes(db, "inbox");
      expect(rest).toEqual([]);
      expect(inbox).toMatchObject({ deleted_at: null, archived_at: null, title: "My Work", icon: "star", color: "hsl(0,0%,50%)", version: 4, x: 0, y: 0 });
      expect(Number(inbox.mtime)).toBeGreaterThan(1_700_000_100_000);
      expect(envelope.changes.nodes?.upserted.map((row) => row.id)).toContain(inbox.id);

      await ensure(db);
      expect((await systemNodes(db, "inbox"))[0].version).toBe(4);
    });
  });

  it("normalizes an archived Archive and leaves a clean Inbox unchanged", async () => {
    await withActor(authed(), async (db, owner) => {
      await owner(async () => {
        await addNode(db, { systemRole: "inbox", x: 1, y: 0, version: 5 });
        await addNode(db, { systemRole: "archive_view", archivedAt: 1_700_000_100_000, x: 2, y: 0, version: 7 });
      });
      const inboxBefore = await systemNodes(db, "inbox");
      await ensure(db);
      expect(await systemNodes(db, "inbox")).toEqual(inboxBefore);
      const [archive] = await systemNodes(db, "archive_view");
      expect(archive).toMatchObject({ archived_at: null, deleted_at: null, version: 8, x: 2, y: 0 });
    });
  });

  it("relocates a drifted system Node when its previous cell is now occupied", async () => {
    await withActor(authed(), async (db, owner) => {
      await owner(async () => {
        await addNode(db, { systemRole: "inbox", deletedAt: 1_700_000_100_000, x: 0, y: 0, version: 11 });
        await addNode(db, { title: "Occupant", x: 0, y: 0 });
      });
      await ensure(db);
      const [inbox] = await systemNodes(db, "inbox");
      expect(cell(inbox)).not.toBe("0,0");
      expect(inbox).toMatchObject({ deleted_at: null, archived_at: null, version: 12 });
      const active = (await nodes(db)).filter((n) => n.deleted_at === null && n.archived_at === null && !n.hidden_from_grid);
      expect(new Set(active.map(cell)).size).toBe(active.length);
    });
  });

  it("brings a hidden trashed system Node back without moving it", async () => {
    await withActor(authed(), async (db, owner) => {
      await owner(() => addNode(db, { systemRole: "inbox", hiddenFromGrid: true, deletedAt: 5, x: 0, y: 0 }));
      await owner(() => addNode(db, { x: 0, y: 0, title: "Occupant" }));
      await ensure(db);
      const [inbox] = await systemNodes(db, "inbox");
      expect(inbox).toMatchObject({ deleted_at: null, hidden_from_grid: true, x: 0, y: 0, version: 2 });
    });
  });
});

describe("ensure_account: a full L0", () => {
  it("skips both Nodes, still applies the rest and reports applied", async () => {
    await withActor(authed(), async (db, owner) => {
      await owner(() => fillL0(db));
      const envelope = await ensure(db);
      expect(envelope.status).toBe("applied");
      expect(envelope.changes).toEqual({});
      expect(await nodes(db)).toHaveLength(162);
      expect(await systemNodes(db, "inbox")).toEqual([]);
      const account = await db.query("select 1 from app.accounts");
      expect(account.rowCount).toBe(1);
    });
  });

  it("gives the last free cell to the Inbox and skips the Archive", async () => {
    await withActor(authed(), async (db, owner) => {
      await owner(() => fillL0(db, [[17, 8]]));
      await ensure(db);
      const [inbox] = await systemNodes(db, "inbox");
      expect(cell(inbox)).toBe("17,8");
      expect(await systemNodes(db, "archive_view")).toEqual([]);
    });
  });

  it("leaves a trashed system Node trashed when no cell is free", async () => {
    await withActor(authed(), async (db, owner) => {
      await owner(async () => {
        await fillL0(db);
        await addNode(db, { systemRole: "inbox", deletedAt: 5, x: 0, y: 0, parentId: null, level: 0 });
      });
      await ensure(db);
      expect((await systemNodes(db, "inbox"))[0]).toMatchObject({ deleted_at: "5", version: 1 });
    });
  });
});

describe("ensure_account: cell picking with reserved cells (F34)", () => {
  it("skips the passed reserved cells", async () => {
    await withActor(authed(), async (db) => {
      await ensure(db, [{ x: 0, y: 0 }, { x: 1, y: 0 }]);
      const [inbox] = await systemNodes(db, "inbox");
      const [archive] = await systemNodes(db, "archive_view");
      expect([cell(inbox), cell(archive)]).toEqual(["2,0", "3,0"]);
    });
  });

  it("behaves as before with the default and with an empty list", async () => {
    await withActor(authed(), async (db) => {
      await ensure(db, []);
      expect(cell((await systemNodes(db, "inbox"))[0])).toBe("0,0");
    });
  });

  it("relocates a non-hidden trashed system Node whose own cell is reserved, and keeps a hidden one", async () => {
    await withActor(authed(), async (db, owner) => {
      await owner(async () => {
        await addNode(db, { systemRole: "inbox", deletedAt: 5, x: 0, y: 0 });
        await addNode(db, { systemRole: "archive_view", deletedAt: 5, hiddenFromGrid: true, x: 1, y: 0 });
      });
      await ensure(db, [{ x: 0, y: 0 }, { x: 1, y: 0 }]);
      expect(cell((await systemNodes(db, "inbox"))[0])).toBe("2,0");
      expect(cell((await systemNodes(db, "archive_view"))[0])).toBe("1,0");
    });
  });

  const malformed: Array<[string, string]> = [
    ["null", "null"],
    ["not an array", '{"x":0,"y":0}'],
    ["seven cells", JSON.stringify(Array.from({ length: 7 }, (_, i) => ({ x: i, y: 0 })))],
    ["entry not an object", "[1]"],
    ["missing y", '[{"x":0}]'],
    ["fractional x", '[{"x":1.5,"y":0}]'],
    ["string x", '[{"x":"1","y":0}]'],
    ["x out of range", '[{"x":18,"y":0}]'],
    ["y out of range", '[{"x":0,"y":9}]'],
  ];

  it.each(malformed)("rejects a malformed list (%s) with invalid_input and writes nothing", async (_label, json) => {
    await withActor(authed(), async (db, owner) => {
      await owner(() =>
        db.query("insert into app.accounts (user_id, created_at, last_visit_at) values ($1, 1000, 1000)", [user.id]),
      );
      const { rows } = await db.query("select public.ensure_account($1::jsonb) as e", [json]);
      expect(rows[0].e).toEqual({ status: "rejected", result: null, changes: {}, rejection: { code: "invalid_input" } });
      expect(await nodes(db)).toEqual([]);
      const account = await db.query("select last_visit_at from app.accounts");
      expect(Number(account.rows[0].last_visit_at)).toBe(1000);
    });
  });

  it("rejects a SQL null argument the same way", async () => {
    await withActor(authed(), async (db) => {
      const { rows } = await db.query("select public.ensure_account(null) as e");
      expect(rows[0].e.rejection).toEqual({ code: "invalid_input" });
      expect(await nodes(db)).toEqual([]);
    });
  });
});

describe("ensure_account: callers and privileges", () => {
  it("is executable by authenticated and not by anon", async () => {
    const code = await withActor({ role: "anon" }, (db) => expectDbError(() => db.query("select public.ensure_account()")));
    expect(code).toBe("42501");
  });

  it("is executable by authenticated alone", async () => {
    const db = await connect();
    try {
      const { rows } = await db.query(
        `select has_function_privilege('anon', 'public.ensure_account(jsonb)', 'execute') as anon,
                has_function_privilege('service_role', 'public.ensure_account(jsonb)', 'execute') as service_role,
                has_function_privilege('authenticated', 'public.ensure_account(jsonb)', 'execute') as authenticated`,
      );
      expect(rows[0]).toEqual({ anon: false, service_role: false, authenticated: true });
    } finally {
      await db.end();
    }
  });

  it("returns account_missing when the caller's auth user is gone, and writes nothing", async () => {
    const gone = await createTestUser("gone");
    const db = await connect();
    try {
      await adminClient().auth.admin.deleteUser(gone.id);
      await db.query("begin");
      await becomeActor(db, authed(gone));
      const envelope = await ensure(db);
      expect(envelope).toEqual({ status: "rejected", result: null, changes: {}, rejection: { code: "account_missing" } });
      await becomeActor(db, { role: "owner" });
      for (const table of ["accounts", "nodes"]) {
        const { rows } = await db.query(`select count(*)::int as n from app.${table} where user_id = $1`, [gone.id]);
        expect(rows[0].n, table).toBe(0);
      }
    } finally {
      await db.query("rollback").catch(() => undefined);
      await db.end();
    }
  });
});

describe("ensure_account: through the API", () => {
  it("a signed-in client gets applied and only its own Inbox and Archive; a client without a session fails", async () => {
    const fresh = await createTestUser("api");
    const bystander = await createTestUser("apib");
    const client = await signedInClient(fresh);
    const { data, error } = await client.rpc("ensure_account");
    expect(error).toBeNull();
    expect(data).toMatchObject({ status: "applied", result: null });

    const db = await connect();
    try {
      const { rows } = await db.query(
        "select user_id, system_role from app.nodes where user_id in ($1, $2) order by system_role",
        [fresh.id, bystander.id],
      );
      expect(rows).toEqual([
        { user_id: fresh.id, system_role: "archive_view" },
        { user_id: fresh.id, system_role: "inbox" },
      ]);
    } finally {
      await db.end();
    }

    const anon = createClient(process.env.SUPABASE_TEST_URL!, process.env.SUPABASE_TEST_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const refused = await anon.rpc("ensure_account");
    expect(refused.data).toBeNull();
    expect(refused.error?.code).toBe("42501");
  });
});

describe("ensure_account: concurrency (S30)", () => {
  it("two calls on a new account create one Inbox and one Archive", async () => {
    const fresh = await createTestUser("cc");
    const first = await connect();
    const second = await connect();
    const watcher = await connect();
    try {
      await first.query("begin");
      await becomeActor(first, authed(fresh));
      const firstEnvelope = await ensure(first);
      expect(firstEnvelope.status).toBe("applied");

      await second.query("begin");
      await becomeActor(second, authed(fresh));
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
        "select system_role, count(*)::int as n from app.nodes where user_id = $1 group by system_role order by system_role",
        [fresh.id],
      );
      expect(rows).toEqual([{ system_role: "archive_view", n: 1 }, { system_role: "inbox", n: 1 }]);
    } finally {
      await first.query("rollback").catch(() => undefined);
      await second.query("rollback").catch(() => undefined);
      await first.end();
      await second.end();
      await watcher.end();
    }
  });
});
