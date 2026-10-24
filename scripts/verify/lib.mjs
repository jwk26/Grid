// Shared helpers for the hosted-Supabase checks (Task 218).
//
// Target: `--local` uses the running local stack (`supabase status`), so a script is proven
// before it touches production. Without it the script reads the production values from a file
// outside the repository (default ~/.config/griddo/production.env, chmod 600, override with
// GRIDDO_PRODUCTION_ENV). Nothing here prints a connection string or a key.
//
// Keys in the file:
//   GRIDDO_PROD_DB_URL                 Session pooler URI of the production database
//   NEXT_PUBLIC_SUPABASE_URL           https://<ref>.supabase.co
//   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import pg from "pg";

export const isLocal = process.argv.includes("--local");

function parseEnvFile(text) {
  const out = {};
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = /^(?:export\s+)?([A-Z0-9_]+)=(.*)$/.exec(line);
    if (m) out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
  return out;
}

export function target() {
  if (isLocal) {
    const out = execFileSync("pnpm", ["exec", "supabase", "status", "-o", "env"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const env = {};
    for (const line of out.split("\n")) {
      const m = /^([A-Z_]+)="?(.*?)"?$/.exec(line.trim());
      if (m) env[m[1]] = m[2];
    }
    return {
      name: "local",
      dbUrl: env.DB_URL,
      apiUrl: env.API_URL,
      publishableKey: env.PUBLISHABLE_KEY ?? env.ANON_KEY,
    };
  }
  const file = process.env.GRIDDO_PRODUCTION_ENV ?? path.join(homedir(), ".config/griddo/production.env");
  let text;
  try {
    const mode = statSync(file).mode & 0o077;
    if (mode) throw new Error(`${file} is readable by others; run chmod 600 on it`);
    text = readFileSync(file, "utf8");
  } catch (error) {
    throw new Error(`Cannot read the production settings file: ${error.message}`);
  }
  const env = parseEnvFile(text);
  const need = (k) => {
    if (!env[k]) throw new Error(`${k} is missing in the production settings file`);
    return env[k];
  };
  return {
    name: "production",
    dbUrl: need("GRIDDO_PROD_DB_URL"),
    apiUrl: need("NEXT_PUBLIC_SUPABASE_URL").replace(/\/$/, ""),
    publishableKey: need("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  };
}

export async function connectDb(t) {
  const client = new pg.Client({ connectionString: t.dbUrl, ssl: t.name === "production" ? { rejectUnauthorized: false } : undefined });
  client.on("error", () => undefined);
  await client.connect();
  return client;
}

// Prints every NOTICE line a script raises and counts the FAIL lines.
export function collectNotices(client) {
  const state = { fails: 0 };
  client.on("notice", (n) => {
    console.log(n.message);
    if (n.message.startsWith("FAIL")) state.fails++;
  });
  return state;
}
