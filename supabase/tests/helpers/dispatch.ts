import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { Client } from "pg";

// A local HTTP listener the database container reaches through host.docker.internal, standing in
// for the backup function: it records what pg_net sends. Vault entries are replaced for a test and
// put back afterwards (`pnpm test:db` writes the real local entries after a reset).

export type Received = { headers: IncomingMessage["headers"]; body: Record<string, unknown> };

export type Listener = { received: Received[]; url: string; close: () => Promise<void> };

export async function listen(): Promise<Listener> {
  const received: Received[] = [];
  const server: Server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        received.push({ headers: req.headers, body: JSON.parse(Buffer.concat(chunks).toString("utf8")) });
      } catch {
        received.push({ headers: req.headers, body: {} });
      }
      res.statusCode = 200;
      res.end("{}");
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "0.0.0.0", resolve));
  const port = (server.address() as AddressInfo).port;
  return {
    received,
    url: `http://host.docker.internal:${port}/functions/v1/backup`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

type Saved = Record<string, string | null>;

export async function saveVault(db: Client): Promise<Saved> {
  const { rows } = await db.query(
    "select name, decrypted_secret from vault.decrypted_secrets where name in ('backup_function_url', 'backup_shared_secret')",
  );
  const saved: Saved = { backup_function_url: null, backup_shared_secret: null };
  for (const r of rows) saved[r.name] = r.decrypted_secret;
  return saved;
}

export async function setVault(db: Client, name: string, value: string | null): Promise<void> {
  await db.query("delete from vault.secrets where name = $1", [name]);
  if (value !== null) await db.query("select vault.create_secret($1, $2)", [value, name]);
}

export async function restoreVault(db: Client, saved: Saved): Promise<void> {
  for (const [name, value] of Object.entries(saved)) await setVault(db, name, value);
}

export async function waitFor(check: () => boolean, ms = 10_000): Promise<boolean> {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (check()) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  return check();
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
