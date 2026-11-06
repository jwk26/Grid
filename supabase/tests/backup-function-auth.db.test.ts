import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import { asBearer, asSecret, callFunction } from "./helpers/backup-function";
import { backupRow } from "./helpers/backup";
import { connect } from "./helpers/db";
import { adminClient, createTestUser, signedInClient, type TestUser } from "./helpers/users";

// Task 257, Stage 1: what the backup Edge Function refuses before it reads or writes anything
// (SCHEMA §Account backup, Guests; DECISION §Runner). The served function is the local one.

let user: TestUser;
let userJwt: string;
let guestId: string;
let guestJwt: string;

beforeAll(async () => {
  user = await createTestUser("bkf-auth");
  const client = await signedInClient(user);
  userJwt = (await client.auth.getSession()).data.session!.access_token;
  const anon = createClient(process.env.SUPABASE_TEST_URL!, process.env.SUPABASE_TEST_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await anon.auth.signInAnonymously();
  if (error || !data.session) throw new Error(`guest sign-in failed: ${error?.message}`);
  guestId = data.user!.id;
  guestJwt = data.session.access_token;
});

describe("protocol refusals", () => {
  it("refuses a method other than POST with 405", async () => {
    const r = await callFunction({ method: "GET", headers: asSecret() });
    expect(r.status).toBe(405);
  });
  it("refuses a body that is not JSON and an unknown mode with 400", async () => {
    expect((await callFunction({ body: "{not json", headers: asSecret() })).status).toBe(400);
    expect((await callFunction({ body: { mode: "restore" }, headers: asSecret() })).status).toBe(400);
    expect((await callFunction({ body: [] , headers: asSecret() })).status).toBe(400);
  });
  it("refuses a malformed body of a known mode with 400 after authentication", async () => {
    expect((await callFunction({ body: { mode: "scheduled" }, headers: asSecret() })).status).toBe(400);
    expect((await callFunction({ body: { mode: "summary" }, headers: asSecret() })).status).toBe(400);
    expect((await callFunction({ body: { mode: "manual" }, headers: asBearer(userJwt) })).status).toBe(400);
  });
});

describe("shared-secret modes", () => {
  it("refuse scheduled and summary without the secret or with a wrong one", async () => {
    for (const body of [
      { mode: "scheduled", user_id: user.id },
      { mode: "summary", missing: 0, as_of: Date.now() },
    ]) {
      expect((await callFunction({ body })).status, `${body.mode} no secret`).toBe(401);
      expect((await callFunction({ body, headers: { "x-backup-secret": "wrong" } })).status, `${body.mode} wrong`).toBe(401);
      expect((await callFunction({ body, headers: { "x-backup-secret": "" } })).status, `${body.mode} empty`).toBe(401);
    }
  });
  it("refuse a user JWT naming another account in scheduled, and a JWT in summary", async () => {
    const other = randomUUID();
    const a = await callFunction({ body: { mode: "scheduled", user_id: other }, headers: asBearer(userJwt) });
    expect(a.status).toBe(401);
    const b = await callFunction({ body: { mode: "summary", missing: 0, as_of: Date.now() }, headers: asBearer(userJwt) });
    expect(b.status).toBe(401);
  });
});

describe("JWT modes", () => {
  it("refuse manual and status with no token, the shared secret, or the secret as the bearer", async () => {
    for (const body of [{ mode: "manual", run_id: randomUUID() }, { mode: "status" }]) {
      expect((await callFunction({ body })).status, `${body.mode} no token`).toBe(401);
      expect((await callFunction({ body, headers: asSecret() })).status, `${body.mode} secret header`).toBe(401);
      expect((await callFunction({ body, headers: asBearer(asSecret()["x-backup-secret"]) })).status, `${body.mode} secret bearer`).toBe(401);
    }
  });
  it("refuse the publishable key and the service key as the bearer", async () => {
    const body = { mode: "manual", run_id: randomUUID() };
    const publishable = process.env.SUPABASE_TEST_PUBLISHABLE_KEY!;
    const secret = process.env.SUPABASE_TEST_SECRET_KEY!;
    expect((await callFunction({ body, headers: asBearer(publishable) })).status).toBe(401);
    expect((await callFunction({ body, headers: asBearer(secret) })).status).toBe(401);
  });
  it("refuses a garbage and a tampered token", async () => {
    const body = { mode: "status" };
    expect((await callFunction({ body, headers: asBearer("not.a.jwt") })).status).toBe(401);
    const [h, p, s] = userJwt.split(".");
    expect((await callFunction({ body, headers: asBearer(`${h}.${p}.${s.slice(0, -2)}xx`) })).status).toBe(401);
  });
  it("refuses a guest JWT with 403 and leaves no row and no object", async () => {
    for (const body of [{ mode: "manual", run_id: randomUUID() }, { mode: "status" }]) {
      const r = await callFunction({ body, headers: asBearer(guestJwt) });
      expect(r.status, body.mode).toBe(403);
    }
    const db = await connect();
    try {
      expect(await backupRow(db, guestId)).toBeUndefined();
    } finally {
      await db.end();
    }
    const { data } = await adminClient().storage.from("backup").list(`accounts/${guestId}`);
    expect(data ?? []).toEqual([]);
  });
  it("accepts a signed-in user's JWT and ignores a user id in the body", async () => {
    const r = await callFunction({
      body: { mode: "manual", run_id: randomUUID(), user_id: randomUUID() },
      headers: asBearer(userJwt),
    });
    expect(r.status).toBe(200); // Stage 1: authenticated, the run itself arrives in Stage 2
  });
});
