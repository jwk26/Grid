import { execFileSync } from "node:child_process";

// Reads the running local stack's URL, keys and database URL from the CLI, so
// no secret lives in a file. Workers inherit process.env set here.
export default function setup() {
  let out: string;
  try {
    out = execFileSync("pnpm", ["exec", "supabase", "status", "-o", "env"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 30_000,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      "Local Supabase is not reachable. Start Docker Desktop, then run `pnpm exec supabase start`.\n" +
        detail,
    );
  }

  const env: Record<string, string> = {};
  for (const line of out.split("\n")) {
    const match = /^([A-Z_]+)="?(.*?)"?$/.exec(line.trim());
    if (match) env[match[1]] = match[2];
  }

  const pick = (...names: string[]) => {
    for (const name of names) if (env[name]) return env[name];
    throw new Error(`supabase status did not print ${names.join(" or ")}`);
  };

  process.env.SUPABASE_TEST_URL = pick("API_URL");
  process.env.SUPABASE_TEST_PUBLISHABLE_KEY = pick("PUBLISHABLE_KEY", "ANON_KEY");
  process.env.SUPABASE_TEST_SECRET_KEY = pick("SECRET_KEY", "SERVICE_ROLE_KEY");
  process.env.SUPABASE_TEST_DB_URL = pick("DB_URL");
}
