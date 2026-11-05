// Local only: writes the two Vault entries the backup dispatch functions read, from `.env.local`.
// `pnpm test:db` runs it between `supabase db reset` and the suites. It refuses any database
// host but 127.0.0.1 and localhost, so a production value can never be written by it, and
// `config.toml` carries no [db.vault] (Task 255 MI-2: `supabase db push` would send it to
// production). Prints names and counts only, never a value.
import pg from "pg";
import { readFileSync } from "node:fs";

function loadEnv(file = ".env.local") {
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

function assertLocalDatabase(url) {
  const parsed = new URL(url);
  // pg lets query parameters override the URL's host, so refuse them outright.
  const overrides = ["host", "hostaddr", "service"].some((k) => parsed.searchParams.has(k));
  if (overrides || (parsed.hostname !== "127.0.0.1" && parsed.hostname !== "localhost")) {
    console.error("refusing: database host is not local");
    process.exit(1);
  }
}

const url = process.env.SUPABASE_LOCAL_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
assertLocalDatabase(url);

try {
  loadEnv();
} catch {
  console.warn("backup-vault: no .env.local, Vault entries not written");
  process.exit(0);
}

const entries = {
  backup_function_url: process.env.BACKUP_FUNCTION_URL,
  backup_shared_secret: process.env.BACKUP_SHARED_SECRET,
};

const client = new pg.Client({ connectionString: url });
// pg lets a parsed host differ from the URL's, so check the connected host too.
if (client.host !== "127.0.0.1" && client.host !== "localhost") {
  console.error("refusing: database host is not local");
  process.exit(1);
}
await client.connect();
let written = 0;
try {
  for (const [name, value] of Object.entries(entries)) {
    if (!value || value.startsWith("env(")) {
      console.warn(`backup-vault: ${name} is not set in .env.local, skipped`);
      continue;
    }
    const { rows } = await client.query("select id from vault.secrets where name = $1", [name]);
    if (rows.length > 0) await client.query("select vault.update_secret($1, $2, $3)", [rows[0].id, value, name]);
    else await client.query("select vault.create_secret($1, $2)", [value, name]);
    written += 1;
  }
} finally {
  await client.end();
}
console.log(`backup-vault: ${written} Vault entries written`);
