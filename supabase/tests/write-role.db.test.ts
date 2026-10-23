import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { baseEntities } from "@/lib/db/boundary-cases";
import { nodeToRow } from "@/lib/db/row-mapping";
import { connect, expectDbError, insertRow, withActor } from "./helpers/db";
import { seedAccount, TABLES } from "./helpers/seed";
import { createTestUser, type TestUser } from "./helpers/users";

let a: TestUser;
let b: TestUser;

beforeAll(async () => {
  a = await createTestUser("wa");
  b = await createTestUser("wb");
});

const writerA = () => ({ role: "griddo_writer" as const, userId: a.id });

describe("griddo_writer attributes", () => {
  it("cannot log in, cannot bypass RLS, owns nothing and is not a member of any table owner", async () => {
    const db = await connect();
    try {
      const role = await db.query(
        "select rolcanlogin, rolbypassrls, rolsuper from pg_roles where rolname = 'griddo_writer'",
      );
      expect(role.rows).toEqual([{ rolcanlogin: false, rolbypassrls: false, rolsuper: false }]);

      const owned = await db.query(
        `select c.relname from pg_class c join pg_roles r on r.oid = c.relowner
          where r.rolname = 'griddo_writer' and c.relkind in ('r', 'p', 'v', 'm')`,
      );
      expect(owned.rows).toEqual([]);

      const owners = await db.query(
        `select distinct r.rolname from pg_class c
           join pg_roles r on r.oid = c.relowner
           join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'app' and c.relkind = 'r'`,
      );
      expect(owners.rows.length).toBeGreaterThan(0);
      for (const { rolname } of owners.rows) {
        const member = await db.query("select pg_has_role('griddo_writer', $1, 'MEMBER') as m", [rolname]);
        expect(member.rows[0].m, `member of ${rolname}`).toBe(false);
      }
    } finally {
      await db.end();
    }
  });
});

describe("griddo_writer under RLS", () => {
  it("resolves the caller's id inside the role", async () => {
    await withActor(writerA(), async (db) => {
      const { rows } = await db.query("select current_user as role, internal.uid()::text as uid");
      expect(rows[0]).toEqual({ role: "griddo_writer", uid: a.id });
    });
  });

  it("internal.uid() equals auth.uid() for the same claims", async () => {
    await withActor(writerA(), async (db, owner) => {
      const expected = await owner(() => db.query("select auth.uid()::text as uid"));
      const { rows } = await db.query("select internal.uid()::text as uid");
      expect(rows[0].uid).toBe(expected.rows[0].uid);
      expect(rows[0].uid).toBe(a.id);
    });
  });

  it("without claims internal.uid() is null and a writer insert is refused", async () => {
    const code = await withActor({ role: "griddo_writer" }, async (db) => {
      const { rows } = await db.query("select internal.uid() as uid");
      expect(rows[0].uid).toBeNull();
      return expectDbError(() => insertRow(db, "nodes", nodeToRow({ ...baseEntities.node, id: randomUUID() }, a.id)));
    });
    expect(code).toBe("42501");
  });

  it("writes the caller's own rows", async () => {
    await withActor(writerA(), async (db) => {
      const id = randomUUID();
      await insertRow(db, "nodes", nodeToRow({ ...baseEntities.node, id }, a.id));
      const update = await db.query("update app.nodes set title = 'Renamed' where id = $1", [id]);
      expect(update.rowCount).toBe(1);
      const del = await db.query("delete from app.nodes where id = $1", [id]);
      expect(del.rowCount).toBe(1);
    });
  });

  it.each(TABLES)("%s: another account's row is invisible and unchangeable", async (table) => {
    await withActor(writerA(), async (db, owner) => {
      await owner(async () => {
        await seedAccount(db, a.id);
        await seedAccount(db, b.id);
      });
      const bRows = await owner(() => db.query(`select count(*)::int as n from app.${table} where user_id = $1`, [b.id]));
      expect(bRows.rows[0].n).toBe(1);

      const visible = await db.query(`select count(*)::int as n from app.${table} where user_id = $1`, [b.id]);
      expect(visible.rows[0].n).toBe(0);
      const updated = await db.query(`update app.${table} set user_id = user_id where user_id = $1`, [b.id]);
      expect(updated.rowCount).toBe(0);
      if (table !== "accounts") {
        const deleted = await db.query(`delete from app.${table} where user_id = $1`, [b.id]);
        expect(deleted.rowCount).toBe(0);
      }
      const still = await owner(() => db.query(`select count(*)::int as n from app.${table} where user_id = $1`, [b.id]));
      expect(still.rows[0].n).toBe(1);
    });
  });

  it("refuses an insert for another account", async () => {
    const code = await withActor(writerA(), (db) =>
      expectDbError(() => insertRow(db, "nodes", nodeToRow({ ...baseEntities.node, id: randomUUID() }, b.id))),
    );
    expect(code).toBe("42501");
  });

  it("refuses to hand a row over to another account", async () => {
    const code = await withActor(writerA(), async (db, owner) => {
      await owner(() => seedAccount(db, a.id));
      return expectDbError(() => db.query("update app.nodes set user_id = $1", [b.id]));
    });
    expect(code).toBe("42501");
  });

  it("cannot delete an accounts row", async () => {
    const code = await withActor(writerA(), async (db, owner) => {
      await owner(() => seedAccount(db, a.id));
      return expectDbError(() => db.query("delete from app.accounts"));
    });
    expect(code).toBe("42501");
  });

  it("cannot call auth.uid() or read auth.users directly", async () => {
    const uid = await withActor(writerA(), (db) => expectDbError(() => db.query("select auth.uid()")));
    expect(uid).toBe("42501");
    const code = await withActor(writerA(), (db) => expectDbError(() => db.query("select id from auth.users limit 1")));
    expect(code).toBe("42501");
  });
});
