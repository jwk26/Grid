import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { connect, withActor } from "./helpers/db";
import {
  abortRestore, ageRestore, authedUser, beginRestore, owner, stageRestore, stagingRow, verdictOf,
} from "./helpers/restore";
import { seedAccount } from "./helpers/seed";
import { createTestUser, type TestUser } from "./helpers/users";

// Task 260: restore_begin(), restore_stage(), restore_abort(), the restore verdicts of
// backup_read_status(), the snapshot's restore_started_at and the staging cleanup job
// (SCHEMA §Backup functions, §Account backup).

async function freshUser(label: string): Promise<TestUser> {
  const u = await createTestUser(label);
  const db = await connect();
  try {
    await seedAccount(db, u.id);
  } finally {
    await db.end();
  }
  return u;
}

describe("restore_begin()", () => {
  it("records the start and id, and inserts a staging row with no payload and no result", async () => {
    const u = await freshUser("rs-begin");
    const id = randomUUID();
    const e = await beginRestore(u.id, id);
    expect(e.status).toBe("applied");
    const [status] = await owner("select restore_started_at, restore_id from app.backup_status where user_id = $1", [u.id]);
    expect(status.restore_id).toBe(id);
    expect(Number(status.restore_started_at)).toBe(Number(e.result!.server_now));
    const row = await stagingRow(id);
    expect(row).toMatchObject({ user_id: u.id, payload: null, result: null, finished_at: null });
  });

  it("refuses a restore within 10 minutes of the last with rate_limited, before anything is staged", async () => {
    const u = await freshUser("rs-rate");
    const first = randomUUID();
    await beginRestore(u.id, first);
    await abortRestore(u.id, first);
    const second = randomUUID();
    expect(await beginRestore(u.id, second)).toMatchObject({ status: "rejected", rejection: { code: "rate_limited" } });
    expect(await stagingRow(second)).toBeUndefined();
    expect((await owner("select restore_id from app.backup_status where user_id = $1", [u.id]))[0].restore_id).toBe(first);
    await ageRestore(u.id, first, 601_000);
    expect((await beginRestore(u.id, second)).status).toBe("applied");
  });

  it("answers already_running while a restore has no result and is younger than 180 s", async () => {
    const u = await freshUser("rs-running");
    const first = randomUUID();
    await beginRestore(u.id, first);
    const second = randomUUID();
    expect(await beginRestore(u.id, second)).toMatchObject({ status: "rejected", rejection: { code: "already_running" } });
    expect(await stagingRow(second)).toBeUndefined();
    // 200 s later it is no longer in flight, but the 10 minute limit still holds.
    await ageRestore(u.id, first, 200_000);
    expect(await beginRestore(u.id, second)).toMatchObject({ rejection: { code: "rate_limited" } });
  });

  it("refuses a reused restore id with invalid_input, also another account's", async () => {
    const u = await freshUser("rs-reuse");
    const id = randomUUID();
    await beginRestore(u.id, id);
    await abortRestore(u.id, id);
    await ageRestore(u.id, id, 601_000);
    expect(await beginRestore(u.id, id)).toMatchObject({ status: "rejected", rejection: { code: "invalid_input" } });
    // b's id is already a primary key, so u cannot take it either.
    const b = await freshUser("rs-reuse-b");
    const bId = randomUUID();
    await beginRestore(b.id, bId);
    expect(await beginRestore(u.id, bId)).toMatchObject({ rejection: { code: "invalid_input" } });
    expect((await stagingRow(bId)).user_id).toBe(b.id);
  });

  it("treats a missing account and a deletion request as backup_begin() does", async () => {
    const missing = randomUUID();
    expect(await beginRestore(missing, randomUUID())).toMatchObject({ rejection: { code: "account_missing" } });
    const u = await freshUser("rs-deleting");
    await owner("update app.accounts set deletion_requested_at = 5 where user_id = $1", [u.id]);
    const id = randomUUID();
    expect(await beginRestore(u.id, id)).toMatchObject({ status: "rejected", rejection: { code: "account_deleting" } });
    expect(await stagingRow(id)).toBeUndefined();
    expect(await owner("select 1 from app.backup_status where user_id = $1", [u.id])).toEqual([]);
  });
});

describe("restore_stage() and restore_abort()", () => {
  it("sets the payload once and never after a result", async () => {
    const u = await freshUser("rs-stage");
    const id = randomUUID();
    await beginRestore(u.id, id);
    expect((await stageRestore(u.id, id, { format_version: 1, x: 1 })).status).toBe("applied");
    expect((await stagingRow(id)).payload).toEqual({ format_version: 1, x: 1 });
    // A second payload does not replace the first.
    expect((await stageRestore(u.id, id, { format_version: 1, x: 2 })).status).toBe("not_applied");
    expect((await stagingRow(id)).payload).toEqual({ format_version: 1, x: 1 });
    // After a result, no payload is set again.
    await abortRestore(u.id, id);
    const id2 = randomUUID();
    await ageRestore(u.id, id, 601_000);
    await beginRestore(u.id, id2);
    await abortRestore(u.id, id2);
    expect((await stageRestore(u.id, id2, { format_version: 1 })).status).toBe("not_applied");
    expect((await stagingRow(id2)).payload).toBeNull();
  });

  it("restore_abort writes one not-applied result, clears the payload and never overwrites a result", async () => {
    const u = await freshUser("rs-abort");
    const id = randomUUID();
    await beginRestore(u.id, id);
    await stageRestore(u.id, id, { format_version: 1 });
    expect((await abortRestore(u.id, id, "fetch_failed")).status).toBe("applied");
    expect(await stagingRow(id)).toMatchObject({ result: "not_applied", reason: "fetch_failed", payload: null });
    const first = (await stagingRow(id)).finished_at;
    expect((await abortRestore(u.id, id, "other")).status).toBe("not_applied");
    expect(await stagingRow(id)).toMatchObject({ reason: "fetch_failed", finished_at: first });
  });

  it("changes nothing for another account's restore id", async () => {
    const u = await freshUser("rs-iso");
    const b = await freshUser("rs-iso-b");
    const bId = randomUUID();
    await beginRestore(b.id, bId);
    await stageRestore(b.id, bId, { format_version: 1, mine: "b" });
    expect((await stageRestore(u.id, bId, { format_version: 1, mine: "u" })).status).toBe("not_applied");
    expect((await abortRestore(u.id, bId)).status).toBe("not_applied");
    expect(await stagingRow(bId)).toMatchObject({ user_id: b.id, result: null, payload: { format_version: 1, mine: "b" } });
  });
});

describe("restore verdicts", () => {
  it("answers not_started, finishing, the result, not_applied by age and expired for the given id", async () => {
    const u = await freshUser("rs-verdict");
    const id = randomUUID();
    expect(await verdictOf(u.id, id)).toBe("not_started"); // no status row at all
    await beginRestore(u.id, id);
    expect(await verdictOf(u.id, id)).toBe("finishing");
    expect(await verdictOf(u.id, randomUUID())).toBe("not_started"); // another id
    await ageRestore(u.id, id, 181_000);
    expect(await verdictOf(u.id, id)).toBe("not_applied"); // no result after 180 s
    await abortRestore(u.id, id);
    expect(await verdictOf(u.id, id)).toBe("not_applied"); // a recorded result
    await owner("delete from app.restore_staging where id = $1", [id]);
    expect(await verdictOf(u.id, id)).toBe("expired"); // row gone, id still recorded
  });

  it("never reports an earlier restore's result for a later id", async () => {
    const u = await freshUser("rs-later");
    const one = randomUUID();
    await beginRestore(u.id, one);
    await abortRestore(u.id, one);
    await ageRestore(u.id, one, 601_000);
    const two = randomUUID();
    await beginRestore(u.id, two);
    expect(await verdictOf(u.id, two)).toBe("finishing");
    expect(await verdictOf(u.id, one)).toBe("not_started");
  });

  it("does not read another account's staging row", async () => {
    const u = await freshUser("rs-other");
    const b = await freshUser("rs-other-b");
    const bId = randomUUID();
    await beginRestore(b.id, bId);
    await abortRestore(b.id, bId);
    expect(await verdictOf(u.id, bId)).toBe("not_started");
  });

  it("keeps the Phase 52 run verdict and adds restore_started_at to the status", async () => {
    const u = await freshUser("rs-status");
    const id = randomUUID();
    const e = await beginRestore(u.id, id);
    const db = await connect();
    try {
      await db.query("begin");
      await db.query("set local role service_role");
      const { rows } = await db.query("select public.backup_read_status($1, $2, $3) as r", [u.id, randomUUID(), id]);
      expect(rows[0].r.result.verdict).toBe("not_started");
      expect(rows[0].r.result.restore_verdict).toBe("finishing");
      expect(Number(rows[0].r.result.backup.restore_started_at)).toBe(Number(e.result!.server_now));
      await db.query("rollback");
    } finally {
      await db.end();
    }
  });
});

describe("get_snapshot() backup key", () => {
  it("carries restore_started_at", async () => {
    const u = await freshUser("rs-snap");
    expect(await withActor(authedUser(u), async (db) => (await db.query("select public.get_snapshot() as s")).rows[0].s.backup)).toBeNull();
    const e = await beginRestore(u.id, randomUUID());
    const backup = await withActor(authedUser(u), async (db) => (await db.query("select public.get_snapshot() as s")).rows[0].s.backup);
    expect(Number(backup.restore_started_at)).toBe(Number(e.result!.server_now));
  });
});

describe("restore_staging rights", () => {
  it("is closed to anon and authenticated, and a browser cannot read a payload", async () => {
    const u = await freshUser("rs-rights");
    const id = randomUUID();
    await beginRestore(u.id, id);
    for (const actor of [authedUser(u), { role: "anon" as const }]) {
      await withActor(actor, async (db) => {
        await expect(db.query("select payload from app.restore_staging")).rejects.toMatchObject({ code: "42501" });
      });
    }
    await withActor(authedUser(u), async (db) => {
      await expect(db.query("update app.restore_staging set result = 'applied'")).rejects.toMatchObject({ code: "42501" });
    });
  });

  it("gives anon, service_role and (for the service functions) authenticated no extra execute right", async () => {
    const u = await freshUser("rs-exec");
    for (const text of [
      "select public.restore_begin($1, gen_random_uuid())",
      "select public.restore_stage($1, gen_random_uuid(), '{}'::jsonb)",
      "select public.restore_abort($1, gen_random_uuid(), 'x')",
    ]) {
      for (const role of ["anon", "authenticated"] as const) {
        await withActor({ role, userId: role === "authenticated" ? u.id : undefined }, async (db) => {
          await expect(db.query(text, [u.id]), `${role} ${text}`).rejects.toMatchObject({ code: "42501" });
        });
      }
    }
    for (const role of ["anon", "service_role"] as const) {
      await withActor({ role }, async (db) => {
        await expect(db.query("select public.restore_account(gen_random_uuid(), 'x')"), role).rejects.toMatchObject({ code: "42501" });
      });
    }
  });

  it("is security invoker for the service functions and security definer, owned by griddo_writer, for restore_account", async () => {
    const rows = await owner(
      `select p.proname, p.prosecdef, p.proconfig, pg_get_userbyid(p.proowner) as owner
         from pg_proc p where p.pronamespace = 'public'::regnamespace
          and p.proname in ('restore_begin', 'restore_stage', 'restore_abort', 'restore_account')`,
    );
    const by = Object.fromEntries(rows.map((r) => [r.proname, r]));
    for (const name of ["restore_begin", "restore_stage", "restore_abort"]) {
      expect(by[name]).toMatchObject({ prosecdef: false, owner: "postgres" });
      expect(by[name].proconfig).toContain('search_path=""');
    }
    expect(by.restore_account).toMatchObject({ prosecdef: true, owner: "griddo_writer" });
    expect(by.restore_account.proconfig).toEqual(expect.arrayContaining(['search_path=""', "statement_timeout=30s"]));
    // restore_stage takes a payload of about 10 MB through REST, which hoists this setting.
    expect(by.restore_stage.proconfig).toContain("statement_timeout=30s");
  });
});

describe("staging cleanup job", () => {
  it("deletes rows older than one hour and keeps younger ones", async () => {
    const [job] = await owner("select schedule, command, username from cron.job where jobname = 'restore-staging-cleanup'");
    expect(job.schedule).toBe("23 * * * *");
    expect(job.username).toBe("postgres");
    const u = await freshUser("rs-cron");
    const old = randomUUID();
    const young = randomUUID();
    await beginRestore(u.id, old);
    await abortRestore(u.id, old);
    await owner("update app.restore_staging set created_at = created_at - 3700000 where id = $1", [old]);
    await ageRestore(u.id, old, 601_000);
    await beginRestore(u.id, young);
    await owner(job.command);
    expect(await stagingRow(old)).toBeUndefined();
    expect(await stagingRow(young)).toBeDefined();
    // The verdict of the deleted row is `expired` only while that id is the recorded one.
    expect(await verdictOf(u.id, old)).toBe("not_started");
  });
});
