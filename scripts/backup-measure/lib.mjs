// Shared helpers for the Task 255 measurement scripts. Local only: scripts that touch the
// database refuse any host except 127.0.0.1 and localhost. Output is counts and times only.
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

export function loadEnv(file = ".env.local") {
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

export const LOCAL_DB_URL =
  process.env.MEASURE_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

export function assertLocalDatabase(url = LOCAL_DB_URL) {
  const host = new URL(url).hostname;
  if (host !== "127.0.0.1" && host !== "localhost") {
    console.error(`refusing: database host is not local`);
    process.exit(1);
  }
}

export function randomTestUserId() {
  return randomUUID();
}

/** Registers cleanup that runs once on normal exit, SIGINT and SIGTERM. */
export function onCleanup(fn) {
  let done = false;
  const run = async (code) => {
    if (done) return;
    done = true;
    try {
      await fn();
    } catch (e) {
      console.error("cleanup failed:", e?.message ?? e);
      code = code || 1;
    }
    process.exit(code ?? 0);
  };
  process.on("SIGINT", () => run(130));
  process.on("SIGTERM", () => run(143));
  return () => run(0);
}
