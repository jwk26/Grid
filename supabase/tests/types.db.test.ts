import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// The committed generated types must match the local schema (Task 214 note): a migration
// that changes a table or function without `pnpm db:types` fails here.
describe("generated database types", () => {
  it("match the local schema", () => {
    const generated = execFileSync(
      "pnpm",
      ["exec", "supabase", "gen", "types", "typescript", "--local", "--schema", "app", "--schema", "public"],
      { encoding: "utf8", timeout: 60_000, stdio: ["ignore", "pipe", "pipe"] },
    );
    const committed = readFileSync(path.resolve(__dirname, "../../src/lib/db/database.types.ts"), "utf8");
    expect(generated.trim()).toBe(committed.trim());
  }, 60_000);
});
