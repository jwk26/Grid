import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { connect, withActor } from "./helpers/db";
import {
  TABLE_KEYS, abortRestore, beginRestore, exportOf, fingerprintOf, owner, restoreAs, stageRestore, stagingRow, verdictOf,
} from "./helpers/restore";
import { seedAccount, type SeededAccount } from "./helpers/seed";
import { createTestUser, signedInClient, type TestUser } from "./helpers/users";

// Task 260: restore_account() (SCHEMA §Account backup, Restore). Every test uses its own user, so
// the 10 minute rate limit of restore_begin() never gets in the way.

type Payload = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

async function freshUser(label: string): Promise<{ u: TestUser; seed: SeededAccount }> {
  const u = await createTestUser(label);
  const db = await connect();
  try {
    return { u, seed: await seedAccount(db, u.id) };
  } finally {
    await db.end();
  }
}

// begin + stage; the expected fingerprint is the pre-restore export's, as Task 261 passes it.
async function stageFor(u: TestUser, payload: Payload): Promise<string> {
  const id = randomUUID();
  expect((await beginRestore(u.id, id)).status).toBe("applied");
  expect((await stageRestore(u.id, id, payload)).status).toBe("applied");
  return id;
}

const withoutVersion = (rows: Payload[]) =>
  rows
    .map((row) => Object.fromEntries(Object.entries(row).filter(([key]) => key !== "version")))
    .sort((x, y) => String(x.id).localeCompare(String(y.id)));

const tables = (e: Payload) => Object.fromEntries(TABLE_KEYS.map((k) => [k, e[k]]));
const live = async (userId: string) => tables(await exportOf(userId));

describe("restore_account()", () => {
  it("replaces the account: a re-export equals the backup except version, and versions are greatest + 1", async () => {
    const { u, seed } = await freshUser("ra-apply");
    const backup = await exportOf(u.id);
    // Live changes after the backup: a higher node version (10 against 1), a Chunk deleted, an extra
    // Bit, a scratch row at version 7. The payload's Bit version is raised to 5 (backup above live).
    await owner("update app.nodes set title = 'Changed', version = 10 where id = $1", [seed.nodeId]);
    await owner("delete from app.chunks where id = $1", [seed.chunkId]);
    await owner("update app.scratch_breakdowns set version = 7 where id = $1", [seed.breakdownId]);
    await owner(
      `insert into app.bits (id, user_id, title, icon, mtime, created_at, parent_id, x, y)
       values ($1, $2, 'Extra', 'check', 1, 1, $3, 3, 3)`,
      [randomUUID(), u.id, seed.nodeId],
    );
    const payload: Payload = JSON.parse(JSON.stringify(backup));
    payload.bits[0].version = 5;
    const id = await stageFor(u, payload);
    const preRestore = await exportOf(u.id); // the pre-restore export's fingerprint
    const e = await restoreAs(u, id, preRestore.fingerprint);
    expect(e.status).toBe("applied");
    expect(e.rejection).toBeUndefined();

    const after = await live(u.id);
    for (const key of TABLE_KEYS) expect(withoutVersion(after[key]), key).toEqual(withoutVersion(payload[key]));
    expect(after.bits).toHaveLength(1); // the extra Bit is gone
    const version = (key: (typeof TABLE_KEYS)[number], rowId: string) => after[key].find((r: Payload) => r.id === rowId).version;
    expect(version("nodes", seed.nodeId)).toBe(11); // max(1, 10) + 1
    expect(version("bits", seed.bitId)).toBe(6); // max(5, 1) + 1
    expect(version("scratch_breakdowns", seed.breakdownId)).toBe(8); // max(1, 7) + 1
    expect(version("staged_candidates", seed.candidateId)).toBe(2); // max(1, 1) + 1
    expect(after.chunks).toHaveLength(1); // the deleted Chunk is back

    // The staging row holds the result and no payload.
    expect(await stagingRow(id)).toMatchObject({ result: "applied", payload: null });
    expect(Number((await stagingRow(id)).finished_at)).toBeGreaterThan(0);
  });

  it("uses the caller's id for every row and ignores the payload's user_id", async () => {
    const { u } = await freshUser("ra-uid");
    const { u: other } = await freshUser("ra-uid-other");
    const otherBefore = await fingerprintOf(other.id);
    const payload: Payload = JSON.parse(JSON.stringify(await exportOf(u.id)));
    payload.user_id = other.id;
    for (const key of TABLE_KEYS) for (const row of payload[key]) row.user_id = other.id;
    const id = await stageFor(u, payload);
    expect((await restoreAs(u, id, await fingerprintOf(u.id))).status).toBe("applied");
    for (const key of TABLE_KEYS) {
      const rows = await owner(`select user_id from app.${key} where id = any($1)`, [payload[key].map((r: Payload) => r.id)]);
      expect(rows.length, key).toBe(payload[key].length);
      for (const r of rows) expect(r.user_id, key).toBe(u.id);
    }
    expect(await fingerprintOf(other.id)).toBe(otherBefore);
  });

  it("reads only the caller's staging row, and a direct call applies only what was staged for it", async () => {
    const { u } = await freshUser("ra-iso");
    const { u: other } = await freshUser("ra-iso-other");
    const before = await live(u.id);
    const otherId = await stageFor(other, JSON.parse(JSON.stringify(await exportOf(other.id))));
    // u names other's restore id: nothing happens to u, and other's staging row is untouched.
    expect(await restoreAs(u, otherId, await fingerprintOf(u.id))).toMatchObject({ status: "not_applied" });
    expect(await stagingRow(otherId)).toMatchObject({ user_id: other.id, result: null });
    expect((await stagingRow(otherId)).payload).not.toBeNull();
    // An id nobody staged applies nothing either.
    expect(await restoreAs(u, randomUUID(), await fingerprintOf(u.id))).toMatchObject({ status: "not_applied" });
    expect(await live(u.id)).toEqual(before);
    // A staged id with no payload yet is not applied.
    const bare = randomUUID();
    await owner("update app.backup_status set restore_started_at = null where user_id = $1", [u.id]);
    await beginRestore(u.id, bare);
    expect(await restoreAs(u, bare, await fingerprintOf(u.id))).toMatchObject({ status: "not_applied" });
    expect(await stagingRow(bare)).toMatchObject({ result: null });
  });

  it("writes account_changed and changes nothing when the fingerprint no longer matches", async () => {
    const { u, seed } = await freshUser("ra-fingerprint");
    const payload = JSON.parse(JSON.stringify(await exportOf(u.id)));
    const id = await stageFor(u, payload);
    const stale = await fingerprintOf(u.id);
    await owner("update app.nodes set title = 'Edited later' where id = $1", [seed.nodeId]);
    const before = await live(u.id);
    expect(await restoreAs(u, id, stale)).toMatchObject({ status: "rejected", rejection: { code: "account_changed" } });
    expect(await live(u.id)).toEqual(before);
    expect(await stagingRow(id)).toMatchObject({ result: "account_changed", payload: null });
    // The recorded result stays: a second call is not_applied and writes nothing.
    expect(await restoreAs(u, id, await fingerprintOf(u.id))).toMatchObject({ status: "not_applied" });
    expect(await stagingRow(id)).toMatchObject({ result: "account_changed" });
  });

  it("treats a missing expected fingerprint as a mismatch", async () => {
    const { u } = await freshUser("ra-null-fp");
    const id = await stageFor(u, JSON.parse(JSON.stringify(await exportOf(u.id))));
    expect(await restoreAs(u, id, null)).toMatchObject({ rejection: { code: "account_changed" } });
  });

  it("refuses an unsupported format_version or a malformed payload with unsupported_format", async () => {
    const mutate: Array<[string, (p: Payload) => void]> = [
      ["format 2", (p) => { p.format_version = 2; }],
      ["format 0", (p) => { p.format_version = 0; }],
      ["format as text", (p) => { p.format_version = "1"; }],
      ["no format", (p) => { delete p.format_version; }],
      ["a table is not an array", (p) => { p.bits = {}; }],
      ["a table is missing", (p) => { delete p.chunks; }],
    ];
    for (const [name, change] of mutate) {
      const { u } = await freshUser("ra-format");
      const payload: Payload = JSON.parse(JSON.stringify(await exportOf(u.id)));
      change(payload);
      const id = await stageFor(u, payload);
      const before = await live(u.id);
      expect(await restoreAs(u, id, await fingerprintOf(u.id)), name).toMatchObject({
        status: "rejected", rejection: { code: "unsupported_format" },
      });
      expect(await live(u.id), name).toEqual(before);
      expect(await stagingRow(id), name).toMatchObject({ result: "unsupported_format", payload: null });
    }
  });

  it("keeps every row of a restore above the account limits", async () => {
    const { u } = await freshUser("ra-limits");
    const payload: Payload = JSON.parse(JSON.stringify(await exportOf(u.id)));
    const template = payload.nodes[0];
    for (let i = 0; i < 600; i += 1) payload.nodes.push({ ...template, id: randomUUID(), title: `Node ${i}` });
    const id = await stageFor(u, payload);
    expect((await restoreAs(u, id, await fingerprintOf(u.id))).status).toBe("applied");
    const [{ n }] = await owner("select count(*)::int as n from app.nodes where user_id = $1", [u.id]);
    expect(n).toBe(601); // above the 500 limit of a real account
  });

  it("restores a payload that misses a column key with the column default (the expand rule)", async () => {
    const { u, seed } = await freshUser("ra-expand");
    const payload: Payload = JSON.parse(JSON.stringify(await exportOf(u.id)));
    const drop = (rows: Payload[], keys: string[]) => rows.forEach((r) => keys.forEach((k) => delete r[k]));
    drop(payload.nodes, ["deadline_all_day", "hidden_from_grid", "past_deadline_dismissed", "version"]);
    drop(payload.bits, ["description", "deadline_all_day", "status", "past_deadline_dismissed", "version"]);
    drop(payload.chunks, ["description", "time_all_day", "status"]);
    drop(payload.scratch_breakdowns, ["version"]);
    drop(payload.staged_candidates, ["lifecycle", "version"]);
    const id = await stageFor(u, payload);
    expect((await restoreAs(u, id, await fingerprintOf(u.id))).status).toBe("applied");
    const after = await live(u.id);
    expect(after.nodes[0]).toMatchObject({ deadline_all_day: false, hidden_from_grid: false, past_deadline_dismissed: false, version: 2 });
    expect(after.bits[0]).toMatchObject({ description: "", deadline_all_day: false, status: "active", past_deadline_dismissed: false, version: 2 });
    expect(after.chunks[0]).toMatchObject({ description: "", time_all_day: false, status: "incomplete" });
    expect(after.scratch_breakdowns[0].version).toBe(2);
    expect(after.staged_candidates[0]).toMatchObject({ lifecycle: "staged", version: 2 });
    expect(after.nodes[0].id).toBe(seed.nodeId);
  });

  it("lists in restore_account() every column that has a default (a new default cannot be missed)", async () => {
    const rows = await owner<{ t: string; c: string }>(
      `select table_name as t, column_name as c from information_schema.columns
        where table_schema = 'app' and table_name = any($1) and column_default is not null
        order by 1, 2`,
      [[...TABLE_KEYS]],
    );
    expect(rows.map((r) => `${r.t}.${r.c}`)).toEqual([
      "bits.deadline_all_day", "bits.description", "bits.past_deadline_dismissed", "bits.status", "bits.version",
      "chunks.description", "chunks.status", "chunks.time_all_day",
      "nodes.deadline_all_day", "nodes.hidden_from_grid", "nodes.past_deadline_dismissed", "nodes.version",
      "scratch_breakdowns.version",
      "staged_candidates.lifecycle", "staged_candidates.version",
    ]);
  });

  it("ends with an error, no result and the account unchanged when a row breaks a constraint, and restore_abort then records not_applied", async () => {
    const { u } = await freshUser("ra-check");
    const payload: Payload = JSON.parse(JSON.stringify(await exportOf(u.id)));
    payload.nodes[0].title = ""; // breaks the title CHECK
    const id = await stageFor(u, payload);
    const before = await live(u.id);
    await expect(restoreAs(u, id, await fingerprintOf(u.id))).rejects.toMatchObject({ code: "23514" });
    expect(await live(u.id)).toEqual(before);
    expect(await stagingRow(id)).toMatchObject({ result: null });
    expect((await stagingRow(id)).payload).not.toBeNull();
    expect((await abortRestore(u.id, id, "restore_failed")).status).toBe("applied");
    expect(await stagingRow(id)).toMatchObject({ result: "not_applied", reason: "restore_failed", payload: null });
    expect(await verdictOf(u.id, id)).toBe("not_applied");
  });

  it("ends with a primary-key error and the account unchanged when a payload id is held by another account", async () => {
    const { u } = await freshUser("ra-pk");
    const { seed: foreign } = await freshUser("ra-pk-other");
    const payload: Payload = JSON.parse(JSON.stringify(await exportOf(u.id)));
    payload.nodes.push({ ...payload.nodes[0], id: foreign.nodeId });
    const id = await stageFor(u, payload);
    const before = await live(u.id);
    await expect(restoreAs(u, id, await fingerprintOf(u.id))).rejects.toMatchObject({ code: "23505" });
    expect(await live(u.id)).toEqual(before);
    expect(await stagingRow(id)).toMatchObject({ result: null });
  });

  it("inserts every column of the five tables, so a later expand column cannot be dropped silently", async () => {
    const [{ def }] = await owner<{ def: string }>("select pg_get_functiondef('public.restore_account(uuid, text)'::regprocedure) as def");
    for (const table of TABLE_KEYS) {
      const match = new RegExp(`insert into app\\.${table} \\(([^)]*)\\)`).exec(def);
      expect(match, table).not.toBeNull();
      const listed = match![1].split(",").map((c) => c.trim().replace(/"/g, "")).sort();
      const columns = await owner<{ c: string }>(
        "select column_name as c from information_schema.columns where table_schema = 'app' and table_name = $1 order by 1",
        [table],
      );
      expect(listed, table).toEqual(columns.map((r) => r.c).sort());
    }
  });

  it("rejects an account with a deletion request and leaves the staging row alone", async () => {
    const { u } = await freshUser("ra-deleting");
    const id = await stageFor(u, JSON.parse(JSON.stringify(await exportOf(u.id))));
    await owner("update app.accounts set deletion_requested_at = 5 where user_id = $1", [u.id]);
    expect(await restoreAs(u, id, "x")).toMatchObject({ status: "rejected", rejection: { code: "account_deleting" } });
    expect(await stagingRow(id)).toMatchObject({ result: null });
  });

  it("is refused for anon and needs a signed-in user", async () => {
    await withActor({ role: "anon" }, async (db) => {
      await expect(db.query("select public.restore_account(gen_random_uuid(), 'x')")).rejects.toMatchObject({ code: "42501" });
    });
    await withActor({ role: "authenticated" }, async (db) => {
      await expect(db.query("select public.restore_account(gen_random_uuid(), 'x')")).rejects.toMatchObject({ code: "28000" });
    });
  });

  it("works through supabase-js .rpc() as a signed-in user", async () => {
    const { u } = await freshUser("ra-rest");
    const payload = JSON.parse(JSON.stringify(await exportOf(u.id)));
    payload.bits[0].title = "From the backup";
    await owner("update app.bits set title = 'Live' where user_id = $1", [u.id]);
    const id = await stageFor(u, payload);
    const client = await signedInClient(u);
    const { data, error } = await client.rpc("restore_account", {
      p_restore_id: id,
      p_expected_fingerprint: await fingerprintOf(u.id),
    });
    expect(error).toBeNull();
    expect(data).toMatchObject({ status: "applied" });
    expect((await owner("select title from app.bits where user_id = $1", [u.id]))[0].title).toBe("From the backup");
  });
});
