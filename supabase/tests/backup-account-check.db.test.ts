import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { connect, withActor } from "./helpers/db";
import { seedAccount } from "./helpers/seed";
import { createTestUser, type TestUser } from "./helpers/users";

// Task 257: backup_account_check(), the pre-upload check (SCHEMA §Backup functions,
// §Deleting R2 objects). A plain read through service_role.

let a: TestUser;
let b: TestUser;
const service = { role: "service_role" as const };

async function check(userId: string | null): Promise<string | null> {
  return withActor(service, async (db) => {
    const { rows } = await db.query("select public.backup_account_check($1) as r", [userId]);
    return rows[0].r.status;
  });
}

beforeAll(async () => {
  a = await createTestUser("bk-chk-a");
  b = await createTestUser("bk-chk-b");
  const db = await connect();
  try {
    await seedAccount(db, a.id);
    await seedAccount(db, b.id);
  } finally {
    await db.end();
  }
});

describe("backup_account_check", () => {
  it("answers ok, account_deleting and account_missing", async () => {
    expect(await check(a.id)).toBe("ok");
    expect(await check(randomUUID())).toBe("account_missing");
    const db = await connect();
    try {
      await db.query("update app.accounts set deletion_requested_at = 1 where user_id = $1", [a.id]);
      expect(await check(a.id)).toBe("account_deleting");
      await db.query("update app.accounts set deletion_requested_at = null where user_id = $1", [a.id]);
      expect(await check(a.id)).toBe("ok");
    } finally {
      await db.end();
    }
  });

  it("answers only for the named account", async () => {
    const db = await connect();
    try {
      await db.query("update app.accounts set deletion_requested_at = 1 where user_id = $1", [a.id]);
      expect(await check(b.id)).toBe("ok");
      expect(await check(a.id)).toBe("account_deleting");
      await db.query("update app.accounts set deletion_requested_at = null where user_id = $1", [a.id]);
    } finally {
      await db.end();
    }
  });

  it("refuses a null user with 22023", async () => {
    await withActor(service, async (db) => {
      await expect(db.query("select public.backup_account_check(null)")).rejects.toMatchObject({ code: "22023" });
    });
  });

  it("gives anon and authenticated permission denied", async () => {
    for (const role of ["anon", "authenticated"] as const) {
      await withActor({ role, userId: role === "authenticated" ? a.id : undefined }, async (db) => {
        await expect(db.query("select public.backup_account_check($1)", [a.id]), role)
          .rejects.toMatchObject({ code: "42501" });
      });
    }
  });
});
