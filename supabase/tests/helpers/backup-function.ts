import { readFileSync } from "node:fs";
import path from "node:path";

// Helpers for the integration tests of the backup Edge Function, served by the local stack at
// `<API_URL>/functions/v1/backup`. The shared secret is read from the git-ignored `.env.local`,
// the same value the local function and local Vault use; it is never printed.

let cachedSecret: string | undefined;

export function sharedSecret(): string {
  if (cachedSecret) return cachedSecret;
  const text = readFileSync(path.resolve(__dirname, "../../../.env.local"), "utf8");
  const line = text.split("\n").find((l) => l.startsWith("BACKUP_SHARED_SECRET="));
  const value = line?.slice("BACKUP_SHARED_SECRET=".length).trim().replace(/^["']|["']$/g, "");
  if (!value) throw new Error("BACKUP_SHARED_SECRET is not set in .env.local");
  cachedSecret = value;
  return value;
}

export function functionUrl(): string {
  return `${process.env.SUPABASE_TEST_URL}/functions/v1/backup`;
}

export type CallOptions = {
  method?: string;
  headers?: Record<string, string>;
  /** A string is sent as is (a malformed body); anything else as JSON. */
  body?: unknown;
};

export async function callFunction(opts: CallOptions = {}): Promise<{ status: number; json: any }> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const method = opts.method ?? "POST";
  const res = await fetch(functionUrl(), {
    method,
    headers: { "content-type": "application/json", ...opts.headers },
    body: method === "GET" ? undefined : typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body ?? {}),
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, json };
}

export const asSecret = () => ({ "x-backup-secret": sharedSecret() });
export const asBearer = (token: string) => ({ authorization: `Bearer ${token}` });

// ---- Users and objects ------------------------------------------------------------------------

import { randomUUID } from "node:crypto";
import { gunzipSync } from "node:zlib";
import type { Client } from "pg";
import { seedAccount } from "./seed";
import { adminClient, createTestUser, signedInClient, type TestUser } from "./users";

export type OAuthUser = TestUser & { jwt: string; providerUserId: string };

/** A signed-in account with data and one GitHub identity, as the sign-in would leave it. */
export async function createOAuthUser(db: Client, label: string, opts: { oauth?: boolean } = {}): Promise<OAuthUser> {
  const user = await createTestUser(label);
  await seedAccount(db, user.id);
  const providerUserId = `gh-${randomUUID().slice(0, 8)}`;
  if (opts.oauth !== false) {
    await db.query(
      `insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
       values ($1, $2, jsonb_build_object('sub', $1::text), 'github', now(), now(), now())`,
      [providerUserId, user.id],
    );
  }
  const client = await signedInClient(user);
  const jwt = (await client.auth.getSession()).data.session!.access_token;
  return { ...user, jwt, providerUserId };
}

const bucket = () => adminClient().storage.from("backup");

/** File names directly under `accounts/<id>/` (or a sub-folder), by the local Storage API. */
export async function listFiles(userId: string, sub = ""): Promise<string[]> {
  const { data, error } = await bucket().list(`accounts/${userId}${sub}`, { limit: 1000 });
  if (error) throw new Error(`list failed: ${error.message}`);
  return (data ?? []).filter((o) => o.id !== null).map((o) => o.name).sort();
}

export async function putObject(key: string, body: string | Uint8Array = "x"): Promise<void> {
  const { error } = await bucket().upload(key, body, { upsert: true, contentType: "application/octet-stream" });
  if (error) throw new Error(`upload failed: ${error.message}`);
}

export async function removeObjects(keys: string[]): Promise<void> {
  if (keys.length > 0) await bucket().remove(keys);
}

export async function readObject(key: string): Promise<Buffer> {
  const { data, error } = await bucket().download(key);
  if (error || !data) throw new Error(`download failed: ${error?.message}`);
  return Buffer.from(await data.arrayBuffer());
}

export async function readExport(key: string): Promise<any> { // eslint-disable-line @typescript-eslint/no-explicit-any
  return JSON.parse(gunzipSync(await readObject(key)).toString("utf8"));
}

/** Deletes every object under the account's prefix and its sub-folders (tests clean up their own keys). */
export async function removeAccountObjects(userId: string): Promise<void> {
  const names = await listFiles(userId);
  await removeObjects(names.map((n) => `accounts/${userId}/${n}`));
}
