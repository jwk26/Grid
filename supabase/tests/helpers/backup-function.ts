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
