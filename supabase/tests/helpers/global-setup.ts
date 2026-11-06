import { execFileSync, spawn, type ChildProcess } from "node:child_process";

// Reads the running local stack's URL, keys and database URL from the CLI, so
// no secret lives in a file. Workers inherit process.env set here.
export default async function setup() {
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

  return await ensureBackupFunctionServed();
}

// The backup function suites call the function over HTTP. A served function answers GET with 405;
// anything else means the edge runtime is not up, so start `supabase functions serve` for the run
// and stop it afterwards (a run that finds it already served leaves it alone).
async function ensureBackupFunctionServed(): Promise<() => void> {
  const url = `${process.env.SUPABASE_TEST_URL}/functions/v1/backup`;
  const served = async () => {
    try {
      return (await fetch(url, { method: "GET" })).status === 405;
    } catch {
      return false;
    }
  };
  if (await served()) return () => {};
  const child: ChildProcess = spawn("pnpm", ["exec", "supabase", "functions", "serve"], {
    stdio: "ignore",
    detached: true,
  });
  const stop = () => {
    if (child.pid) {
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch {
        // already gone
      }
    }
  };
  for (let i = 0; i < 120; i++) {
    if (await served()) return stop;
    await new Promise((r) => setTimeout(r, 500));
  }
  stop();
  throw new Error("The backup Edge Function did not start: run `pnpm exec supabase functions serve`.");
}
