import { randomUUID } from "node:crypto";
import { gzipSync } from "node:zlib";
import { createClient } from "@supabase/supabase-js";
import type { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  asBearer, callFunction, callRestore, createOAuthUser, listFiles, putObject, readExport, readObject,
  removeAccountObjects, type OAuthUser,
} from "./helpers/backup-function";
import { connect } from "./helpers/db";
import { ageRestore, stagingRow } from "./helpers/restore";

// Task 261, stage 4: the restore mode against the served function and local Storage as R2 (SCHEMA
// §Account backup, Restore). Each scenario uses its own user: a restore, aborted ones included,
// counts for the 10 minute limit.

let db: Client;
const made: OAuthUser[] = [];
const today = new Date().toISOString().slice(0, 10);
const CHANGED = "changed-by-test";

async function newUser(label: string): Promise<OAuthUser> {
  const u = await createOAuthUser(db, label);
  made.push(u);
  return u;
}
// A user with a backup of today and then a change, so a restore has something to undo.
async function backedUpAndChanged(label: string): Promise<OAuthUser> {
  const u = await newUser(label);
  const r = await callFunction({ body: { mode: "manual", run_id: randomUUID() }, headers: asBearer(u.jwt) });
  expect(r.json.result.result).toBe("written");
  await change(u);
  return u;
}
const change = (u: OAuthUser) => db.query("update app.bits set title = $2 where user_id = $1", [u.id, CHANGED]);
const titles = async (u: OAuthUser) => (await db.query("select title from app.bits where user_id = $1", [u.id])).rows.map((r) => r.title);
const status = (u: OAuthUser, body: Record<string, unknown> = {}) =>
  callFunction({ body: { mode: "status", ...body }, headers: asBearer(u.jwt) });
const stepsOf = (events: { event: string; data: any }[]) => events.filter((e) => e.event === "step").map((e) => e.data.step); // eslint-disable-line @typescript-eslint/no-explicit-any
const resultOf = (events: { event: string; data: any }[]) => events.filter((e) => e.event === "result").map((e) => e.data); // eslint-disable-line @typescript-eslint/no-explicit-any
const gz = (value: unknown) => gzipSync(Buffer.from(JSON.stringify(value)));

// The restore request carries the ETag of the list entry the user chose; a file that is not listed
// (the missing-backup case) sends a placeholder.
async function etagOf(u: OAuthUser, file: string): Promise<string> {
  const list = (await status(u)).json.result.backups as { name: string; etag: string | null }[];
  return list.find((e) => e.name === file)?.etag ?? "not-listed";
}
async function rest(u: OAuthUser, body: Record<string, unknown>) {
  return callRestore(u.jwt, { etag: await etagOf(u, body.file as string), ...body });
}

async function waitFor<T>(read: () => Promise<T | undefined>, ms = 15_000): Promise<T> {
  const end = Date.now() + ms;
  for (;;) {
    const v = await read();
    if (v !== undefined) return v;
    if (Date.now() > end) throw new Error("timed out");
    await new Promise((r) => setTimeout(r, 200));
  }
}

beforeAll(async () => {
  db = await connect();
});
afterAll(async () => {
  for (const u of made) await removeAccountObjects(u.id);
  await db.end();
});

describe("restore", () => {
  it("restores the caller only, in three steps and a result, then undoes it from the pre-restore entry", async () => {
    const a = await backedUpAndChanged("rsf-a");
    const b = await backedUpAndChanged("rsf-b");
    const id = randomUUID();
    const r = await rest(a, { restore_id: id, file: today, user_id: b.id });
    expect(r.status).toBe(200);
    expect(r.contentType).toContain("text/event-stream");
    expect(stepsOf(r.events)).toEqual(["saving", "getting", "applying"]);
    expect(r.events.map((e) => e.event)).toEqual(["step", "step", "step", "result"]);
    expect(resultOf(r.events)).toEqual([{ status: "applied" }]);

    expect(await titles(a)).not.toContain(CHANGED);
    expect(await titles(b)).toEqual([CHANGED]); // the other account is unchanged
    expect(await listFiles(b.id, "/pre-restore")).toEqual([]);
    const pre = await listFiles(a.id, "/pre-restore");
    expect(pre.length).toBe(1);
    // The pre-restore file is the export taken just before: it holds the changed state.
    const before = await readExport(`accounts/${a.id}/pre-restore/${pre[0]}`);
    expect(before.bits.map((x: { title: string }) => x.title)).toEqual([CHANGED]);

    const row = await stagingRow(id);
    expect(row).toMatchObject({ user_id: a.id, result: "applied", payload: null });
    const verdict = await status(a, { restore_id: id });
    expect(verdict.json.result.restore_verdict).toBe("applied");
    expect(verdict.json.result.backups).toBeUndefined(); // a verdict read lists no storage

    // The list shows the date slot and the pre-restore entry, newest first, with real times.
    const list = (await status(a)).json.result.backups;
    expect(list.map((e: { name: string; kind: string }) => [e.name, e.kind]).sort()).toEqual(
      [[today, "daily"], [`pre-restore/${pre[0].replace(".json.gz", "")}`, "pre_restore"]].sort(),
    );
    for (const e of list) expect(e.at).toBeGreaterThan(Date.now() - 120_000);
    expect(list[0].at).toBeGreaterThanOrEqual(list[1].at);

    // Undo: restore the pre-restore entry (the limit moved back so the test need not wait).
    await ageRestore(a.id, id, 11 * 60_000);
    // Pre-restore keys have a one second resolution; the 10 minute limit keeps two restores apart in
    // real use, but the aged clock here would let the second one overwrite the file it reads.
    await new Promise((r) => setTimeout(r, 1100));
    const undo = await rest(a, { restore_id: randomUUID(), file: list.find((e: { kind: string }) => e.kind === "pre_restore").name });
    expect(resultOf(undo.events)).toEqual([{ status: "applied" }]);
    expect(await titles(a)).toEqual([CHANGED]);
  });

  it("refuses a guest with 403 and a bad token with 401, and records nothing", async () => {
    const anon = createClient(process.env.SUPABASE_TEST_URL!, process.env.SUPABASE_TEST_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await anon.auth.signInAnonymously();
    const id = randomUUID();
    const guest = await callRestore(data.session!.access_token, { restore_id: id, file: today, etag: "abc" });
    expect(guest.status).toBe(403);
    expect(guest.json).toEqual({ status: "refused", code: "guest" });
    expect(await stagingRow(id)).toBeUndefined();
    // A token whose payload does not decode is a definite 401, not the no-answer 502 (Phase 52 Task 259).
    for (const token of ["a.b.c", "x.!!!.y", "not-a-jwt"]) {
      const r = await callRestore(token, { restore_id: id, file: today, etag: "abc" });
      expect(r.status, token).toBe(401);
      expect(r.json).toEqual({ status: "refused", code: "invalid_token" });
    }
  });

  it("refuses a body that names an object key, a bad id, or the shared secret", async () => {
    const u = await newUser("rsf-bad");
    const key = await callRestore(u.jwt, { restore_id: randomUUID(), file: `accounts/${u.id}/${today}.json.gz`, etag: "abc" });
    expect(key.status).toBe(400);
    expect(key.json).toEqual({ status: "refused", code: "bad_file" });
    expect((await callRestore(u.jwt, { restore_id: "nope", file: today, etag: "abc" })).json.code).toBe("bad_restore_id");
    expect((await callRestore(u.jwt, { restore_id: randomUUID(), file: today })).json).toEqual({ status: "refused", code: "bad_etag" });
    const secret = await callFunction({ body: { mode: "restore", restore_id: randomUUID(), file: today, etag: "abc" }, headers: { "x-backup-secret": "x" } });
    expect(secret.status).toBe(401);
  });

  it("answers rate_limited for a second restore within 10 minutes, and uploads and prunes nothing", async () => {
    const u = await backedUpAndChanged("rsf-rate");
    expect(resultOf((await rest(u, { restore_id: randomUUID(), file: today })).events)).toEqual([{ status: "applied" }]);
    // Seven older pre-restore files: a refused restore would prune two of them if it ran the prune.
    const backup = await readObject(`accounts/${u.id}/${today}.json.gz`);
    for (let d = 1; d <= 7; d++) await putObject(`accounts/${u.id}/pre-restore/2026-01-0${d}T10-00-00Z.json.gz`, backup);
    const before = await listFiles(u.id, "/pre-restore");
    expect(before.length).toBe(8);
    const id = randomUUID();
    const second = await rest(u, { restore_id: id, file: today });
    expect(second.status).toBe(200);
    expect(second.json).toEqual({ status: "rejected", rejection: { code: "rate_limited" } });
    expect(await listFiles(u.id, "/pre-restore")).toEqual(before);
    expect(await stagingRow(id)).toBeUndefined();
  });

  it("refuses an account with no OAuth identity before anything is recorded", async () => {
    const e = await createOAuthUser(db, "rsf-email", { oauth: false });
    made.push(e);
    const id = randomUUID();
    const r = await callRestore(e.jwt, { restore_id: id, file: today, etag: "abc" });
    expect(r.json).toEqual({ status: "rejected", rejection: { code: "not_eligible" } });
    expect(await stagingRow(id)).toBeUndefined();
  });

  it("a backup that does not exist ends with a recorded not-applied result and the account unchanged", async () => {
    const u = await backedUpAndChanged("rsf-missing");
    const id = randomUUID();
    const r = await rest(u, { restore_id: id, file: "2026-01-01" });
    expect(stepsOf(r.events)).toEqual(["saving", "getting"]);
    expect(resultOf(r.events)).toEqual([{ status: "not_applied", reason: "backup_missing" }]);
    expect(await titles(u)).toEqual([CHANGED]);
    expect(await stagingRow(id)).toMatchObject({ result: "not_applied", reason: "backup_missing", payload: null });
    expect((await status(u, { restore_id: id })).json.result.restore_verdict).toBe("not_applied");
    // The pre-restore file was written before the stop, and the aborted restore counts for the limit.
    expect((await listFiles(u.id, "/pre-restore")).length).toBe(1);
  });

  it("refuses a file that changed since the list was read, and changes nothing", async () => {
    const u = await backedUpAndChanged("rsf-etag");
    const listedEtag = await etagOf(u, today);
    expect(listedEtag).not.toBe("not-listed");
    // Another run (a scheduled one, or Back Up Now in another tab) overwrites the day's slot.
    await putObject(`accounts/${u.id}/${today}.json.gz`, gz({ bits: [], format_version: 1 }));
    const id = randomUUID();
    const r = await callRestore(u.jwt, { restore_id: id, file: today, etag: listedEtag });
    expect(resultOf(r.events)).toEqual([{ status: "not_applied", reason: "backup_changed" }]);
    expect(await titles(u)).toEqual([CHANGED]);
    expect(await stagingRow(id)).toMatchObject({ result: "not_applied", reason: "backup_changed", payload: null });
    // With the new version's ETag from a fresh list, the same file is accepted (and refused later as unreadable here).
    expect(await etagOf(u, today)).not.toBe(listedEtag);
  });

  it("an unreadable backup stops before staging, and an unsupported format is rejected with nothing changed", async () => {
    const u = await backedUpAndChanged("rsf-bad-file");
    await putObject(`accounts/${u.id}/2026-01-02.json.gz`, Buffer.from("not a gzip"));
    const bad = randomUUID();
    const r = await rest(u, { restore_id: bad, file: "2026-01-02" });
    expect(resultOf(r.events)).toEqual([{ status: "not_applied", reason: "backup_unreadable" }]);
    expect((await stagingRow(bad)).payload).toBeNull();

    await ageRestore(u.id, bad, 11 * 60_000);
    await putObject(
      `accounts/${u.id}/2026-01-03.json.gz`,
      gz({ bits: [], chunks: [], format_version: 2, nodes: [], scratch_breakdowns: [], staged_candidates: [] }),
    );
    const v2 = randomUUID();
    const r2 = await rest(u, { restore_id: v2, file: "2026-01-03" });
    expect(stepsOf(r2.events)).toEqual(["saving", "getting", "applying"]);
    expect(resultOf(r2.events)).toEqual([{ status: "rejected", rejection: { code: "unsupported_format" } }]);
    expect(await titles(u)).toEqual([CHANGED]);
    expect(await stagingRow(v2)).toMatchObject({ result: "unsupported_format", payload: null });
  });

  it("keeps the 5 latest pre-restore files and the one it reads, and a dropped connection still ends right", async () => {
    const u = await backedUpAndChanged("rsf-prune");
    const backup = await readObject(`accounts/${u.id}/${today}.json.gz`);
    const times = [1, 2, 3, 4, 5, 6, 7].map((d) => `2026-01-0${d}T10-00-00Z`);
    for (const t of times) await putObject(`accounts/${u.id}/pre-restore/${t}.json.gz`, backup);

    // Read the first event, then drop the connection: the restore goes on and the staging row decides.
    const id = randomUUID();
    const ac = new AbortController();
    const res = await fetch(`${process.env.SUPABASE_TEST_URL}/functions/v1/backup`, {
      method: "POST",
      headers: { "content-type": "application/json", ...asBearer(u.jwt) },
      body: JSON.stringify({ mode: "restore", restore_id: id, file: `pre-restore/${times[0]}`, etag: await etagOf(u, `pre-restore/${times[0]}`) }),
      signal: ac.signal,
    });
    const reader = res.body!.getReader();
    const first = new TextDecoder().decode((await reader.read()).value);
    expect(first).toContain('"saving"');
    ac.abort();

    const row = await waitFor(async () => {
      const r = await stagingRow(id);
      return r?.result ? r : undefined;
    });
    expect(row).toMatchObject({ result: "applied", payload: null });
    expect(await titles(u)).not.toContain(CHANGED); // the account matches the recorded result

    const left = await listFiles(u.id, "/pre-restore");
    const names = left.map((n) => n.replace(".json.gz", ""));
    // The new file, the 4 newest seeded ones, and the oldest one the restore read.
    expect(names.filter((n) => n.startsWith("2026-01")).sort()).toEqual([times[0], times[3], times[4], times[5], times[6]].sort());
    expect(names.length).toBe(6);
  }, 40_000);
});
