import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { baseEntities } from "@/lib/db/boundary-cases";
import { bitToRow, chunkToRow, nodeToRow, scratchBreakdownToRow, stagedCandidateToRow } from "@/lib/db/row-mapping";
import { expectDbError, insertRow, withActor } from "./helpers/db";
import { seedAccount, TABLES } from "./helpers/seed";
import { createTestUser, signedInClient, type TestUser } from "./helpers/users";

const OWNER_COLUMN: Record<(typeof TABLES)[number], string> = {
  accounts: "user_id",
  nodes: "user_id",
  bits: "user_id",
  chunks: "user_id",
  scratch_breakdowns: "user_id",
  staged_candidates: "user_id",
};

let a: TestUser;
let b: TestUser;

beforeAll(async () => {
  a = await createTestUser("a");
  b = await createTestUser("b");
});

describe("isolation between accounts", () => {
  it.each(TABLES)("%s: A sees only A's rows", async (table) => {
    await withActor({ role: "authenticated", userId: a.id }, async (db, owner) => {
      await owner(async () => {
        await seedAccount(db, a.id);
        await seedAccount(db, b.id);
      });
      const column = OWNER_COLUMN[table];
      // Non-vacuous: B's row exists for the owner, and A's own row is visible.
      const asOwner = await owner(() => db.query(`select count(*)::int as n from app.${table} where ${column} = $1`, [b.id]));
      expect(asOwner.rows[0].n).toBe(1);
      const own = await db.query(`select count(*)::int as n from app.${table} where ${column} = $1`, [a.id]);
      expect(own.rows[0].n).toBe(1);
      const other = await db.query(`select count(*)::int as n from app.${table} where ${column} = $1`, [b.id]);
      expect(other.rows[0].n).toBe(0);
      const all = await db.query(`select count(*)::int as n from app.${table}`);
      expect(all.rows[0].n).toBe(1);
    });
  });

  it.each(TABLES)("%s: B sees B's row", async (table) => {
    await withActor({ role: "authenticated", userId: b.id }, async (db, owner) => {
      await owner(async () => {
        await seedAccount(db, a.id);
        await seedAccount(db, b.id);
      });
      const all = await db.query(`select ${OWNER_COLUMN[table]} as owner from app.${table}`);
      expect(all.rows).toEqual([{ owner: b.id }]);
    });
  });
});

describe("no client write grant", () => {
  const nodeRow = () => nodeToRow({ ...baseEntities.node, id: randomUUID() }, a.id);

  it("refuses an insert of the caller's own row", async () => {
    const code = await withActor({ role: "authenticated", userId: a.id }, (db) =>
      expectDbError(() => insertRow(db, "nodes", nodeRow())),
    );
    expect(code).toBe("42501");
  });

  it.each(TABLES)("%s: refuses update and delete of the caller's own row", async (table) => {
    for (const statement of [`update app.${table} set user_id = user_id`, `delete from app.${table}`]) {
      const code = await withActor({ role: "authenticated", userId: a.id }, async (db, owner) => {
        await owner(() => seedAccount(db, a.id));
        return expectDbError(() => db.query(statement));
      });
      expect(code, statement).toBe("42501");
    }
  });

  it("refuses to write another account's row", async () => {
    const code = await withActor({ role: "authenticated", userId: a.id }, async (db, owner) => {
      const seeded = await owner(async () => seedAccount(db, b.id));
      return expectDbError(() => db.query("delete from app.nodes where id = $1", [seeded.nodeId]));
    });
    expect(code).toBe("42501");
  });
});

describe("anon", () => {
  it.each(TABLES)("%s: reaches nothing", async (table) => {
    const code = await withActor({ role: "anon" }, (db) => expectDbError(() => db.query(`select 1 from app.${table}`)));
    expect(code).toBe("42501");
  });
});

describe("no table is reachable through the API", () => {
  it("refuses the app schema in PostgREST", async () => {
    const client = await signedInClient(a);
    for (const table of TABLES) {
      const { data, error } = await client.schema("app" as never).from(table).select("*");
      expect(error, table).not.toBeNull();
      expect(data, table).toBeNull();
    }
  });

  it("shows no app table in the GraphQL schema", async () => {
    const client = await signedInClient(a);
    const { data } = await client.auth.getSession();
    const response = await fetch(`${process.env.SUPABASE_TEST_URL}/graphql/v1`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: process.env.SUPABASE_TEST_PUBLISHABLE_KEY!,
        authorization: `Bearer ${data.session!.access_token}`,
      },
      body: JSON.stringify({ query: "{ __schema { types { name } } }" }),
    });
    const body = (await response.json()) as {
      data?: { __schema: { types: { name: string }[] } };
      errors?: { message: string }[];
    };
    const names = body.data?.__schema.types.map((type) => type.name) ?? [];
    // Local Supabase does not enable pg_graphql; where it is enabled the schema is listed.
    if (body.errors?.some((error) => /not enabled/.test(error.message))) {
      expect(names).toEqual([]);
    } else {
      expect(names.length).toBeGreaterThan(0);
    }
    expect(names.filter((name) => /^(Nodes|Bits|Chunks|Accounts|ScratchBreakdowns|StagedCandidates)/.test(name))).toEqual([]);
  });
});

describe("composite foreign keys", () => {
  it("refuses a child whose parent belongs to another account", async () => {
    await withActor({ role: "owner" }, async (db) => {
      const seeded = await seedAccount(db, b.id);
      // The source's unique key is checked before the foreign key; free it first.
      await db.query("delete from app.staged_candidates where id = $1", [seeded.candidateId]);
      await db.query("savepoint s");
      const cases: [string, string, Record<string, unknown>][] = [
        ["node", "nodes", nodeToRow({ ...baseEntities.node, id: randomUUID(), parentId: seeded.nodeId, level: 1 }, a.id)],
        ["bit", "bits", bitToRow({ ...baseEntities.bit, id: randomUUID(), parentId: seeded.nodeId }, a.id)],
        ["chunk", "chunks", chunkToRow({ ...baseEntities.chunk, id: randomUUID(), parentId: seeded.bitId }, a.id)],
        [
          "breakdown",
          "scratch_breakdowns",
          scratchBreakdownToRow({ ...baseEntities.scratchBreakdown, id: randomUUID(), scratchBitId: seeded.bitId }, a.id),
        ],
        [
          "candidate",
          "staged_candidates",
          stagedCandidateToRow(
            {
              ...baseEntities.stagedCandidate,
              id: randomUUID(),
              scratchBitId: seeded.bitId,
              sourceBreakdownId: seeded.breakdownId,
            },
            a.id,
          ),
        ],
      ];
      for (const [name, table, row] of cases) {
        expect(await expectDbError(() => insertRow(db, table, row)), name).toBe("23503");
        await db.query("rollback to savepoint s");
      }
    });
  });

  it("refuses a candidate whose source belongs to another Scratch", async () => {
    await withActor({ role: "owner" }, async (db) => {
      const seeded = await seedAccount(db, a.id);
      await db.query("delete from app.staged_candidates where id = $1", [seeded.candidateId]);
      const otherBitId = randomUUID();
      await insertRow(db, "bits", bitToRow({ ...baseEntities.bit, id: otherBitId, parentId: seeded.nodeId }, a.id));
      const code = await expectDbError(() =>
        insertRow(
          db,
          "staged_candidates",
          stagedCandidateToRow(
            {
              ...baseEntities.stagedCandidate,
              id: randomUUID(),
              scratchBitId: otherBitId,
              sourceBreakdownId: seeded.breakdownId,
            },
            a.id,
          ),
        ),
      );
      expect(code).toBe("23503");
    });
  });

  it("allows a Level 0 Node with no parent", async () => {
    await withActor({ role: "owner" }, async (db) => {
      await expect(seedAccount(db, a.id)).resolves.toBeDefined();
    });
  });
});

describe("staged sources and account deletion", () => {
  it("refuses deleting a staged source row (S18)", async () => {
    await withActor({ role: "owner" }, async (db) => {
      const seeded = await seedAccount(db, a.id);
      const code = await expectDbError(() =>
        db.query("delete from app.scratch_breakdowns where id = $1", [seeded.breakdownId]),
      );
      expect(code).toBe("23503");
    });
  });

  it("deleting the auth user removes every row of that account and only that account (S29)", async () => {
    await withActor({ role: "owner" }, async (db) => {
      await seedAccount(db, a.id);
      await seedAccount(db, b.id);
      await db.query("delete from auth.users where id = $1", [a.id]);
      for (const table of TABLES) {
        const gone = await db.query(`select count(*)::int as n from app.${table} where user_id = $1`, [a.id]);
        const kept = await db.query(`select count(*)::int as n from app.${table} where user_id = $1`, [b.id]);
        expect([table, gone.rows[0].n, kept.rows[0].n]).toEqual([table, 0, 1]);
      }
    });
  });
});

describe("system roles", () => {
  it("refuses a second Inbox or Archive for one account, allows one per account", async () => {
    await withActor({ role: "owner" }, async (db) => {
      const system = (userId: string, role: "inbox" | "archive_view", x: number) =>
        insertRow(db, "nodes", nodeToRow({ ...baseEntities.node, id: randomUUID(), systemRole: role, x }, userId));
      await system(a.id, "inbox", 0);
      await system(a.id, "archive_view", 1);
      await system(b.id, "inbox", 0);
      await db.query("savepoint s");
      expect(await expectDbError(() => system(a.id, "inbox", 2))).toBe("23505");
      await db.query("rollback to savepoint s");
      expect(await expectDbError(() => system(a.id, "archive_view", 3))).toBe("23505");
    });
  });
});

describe("default EXECUTE grants", () => {
  it.each(["public", "app", "internal"])("a new function in %s is not executable by client roles", async (schema) => {
    await withActor({ role: "owner" }, async (db) => {
      await db.query(`create function ${schema}.probe() returns int language sql as 'select 1'`);
      const { rows } = await db.query(
        `select has_function_privilege('anon', '${schema}.probe()', 'execute') as anon,
                has_function_privilege('authenticated', '${schema}.probe()', 'execute') as authenticated`,
      );
      expect(rows[0]).toEqual({ anon: false, authenticated: false });
    });
  });
});

describe("test harness", () => {
  it("withActor runs as the requested role and user", async () => {
    await expect(withActor({ role: "authenticated", userId: a.id }, async (client) => {
      const { rows } = await client.query("select current_user as role, auth.uid()::text as uid");
      return rows[0];
    })).resolves.toEqual({ role: "authenticated", uid: a.id });
  });
});
