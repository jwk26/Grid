import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { findMissingCases, hasDisabledBlocks, hasLiveCase, type CatalogFunction } from "./helpers/coverage";
import { connect } from "./helpers/db";
import { FUNCTION_CASES } from "./helpers/function-cases";

// Function coverage (SCHEMA §Database tests): every exposed function has its registered
// cross-account case and, when it writes, its change-set case; no client role reaches an
// internal function or a function it should not call. Functions that belong to an extension
// are not ours and are left out.

const EXTENSION_FREE = `not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')`;

async function publicFunctions(): Promise<CatalogFunction[]> {
  const db = await connect();
  try {
    const { rows } = await db.query(
      `select p.proname as name, bool_or(p.prosecdef) as "securityDefiner"
         from pg_proc p
        where p.pronamespace = 'public'::regnamespace and p.prokind in ('f', 'p') and ${EXTENSION_FREE}
        group by p.proname
        order by 1`,
    );
    return rows as CatalogFunction[];
  } finally {
    await db.end();
  }
}

const readTestFile = (file: string) => {
  const full = path.resolve(__dirname, file);
  return existsSync(full) ? readFileSync(full, "utf8") : undefined;
};

describe("registered function cases", () => {
  it("every function in public has its registered cases", async () => {
    const functions = await publicFunctions();
    expect(functions.length).toBeGreaterThan(0);
    expect(findMissingCases(functions, FUNCTION_CASES, readTestFile)).toEqual([]);
  });

  it("reports a function that has no registered cases", () => {
    const functions: CatalogFunction[] = [
      { name: "ensure_account", securityDefiner: true },
      { name: "fake_write", securityDefiner: true },
      { name: "read_things", securityDefiner: false },
    ];
    // Only ensure_account is registered here, so a later task's entry never changes this list.
    const registry = { ensure_account: FUNCTION_CASES.ensure_account };
    expect(findMissingCases(functions, registry, readTestFile)).toEqual([
      "fake_write: no registered cross-account case",
      "fake_write: no registered change-set case",
      "read_things: no registered cross-account case",
    ]);
  });

  it("requires a change-set case for a write function only", () => {
    const registry = { f: { crossAccount: FUNCTION_CASES.get_snapshot.crossAccount } };
    expect(findMissingCases([{ name: "f", securityDefiner: false }], registry, readTestFile)).toEqual([]);
    expect(findMissingCases([{ name: "f", securityDefiner: true }], registry, readTestFile)).toEqual([
      "f: no registered change-set case",
    ]);
  });

  it("reports a missing file and a title that is not a live test", () => {
    const registry = {
      f: {
        crossAccount: { file: "nope.db.test.ts", title: "x" },
        changeSet: { file: "snapshot.db.test.ts", title: "no such title" },
      },
    };
    expect(findMissingCases([{ name: "f", securityDefiner: true }], registry, readTestFile)).toEqual([
      "f: cross-account case file nope.db.test.ts does not exist",
      'f: change-set case "no such title" is not a live test in snapshot.db.test.ts',
    ]);
  });

  it("counts only an exact, live it() or test()", () => {
    const source = [
      'it("live one", () => {});',
      '  test("live two", async () => {});',
      'it.skip("skipped", () => {});',
      'it.todo("todo");',
      'it.only("only", () => {});',
      'it("live one and more", () => {});',
      '// it("commented out", () => {});',
      '/* test("block commented", () => {}); */',
    ].join("\n");
    expect(hasLiveCase(source, "live one")).toBe(true);
    expect(hasLiveCase(source, "live two")).toBe(true);
    expect(hasLiveCase(source, "skipped")).toBe(false);
    expect(hasLiveCase(source, "todo")).toBe(false);
    expect(hasLiveCase(source, "only")).toBe(false);
    expect(hasLiveCase(source, "live")).toBe(false);
    expect(hasLiveCase(source, "commented out")).toBe(false);
    expect(hasLiveCase(source, "block commented")).toBe(false);
  });

  it("flags a file with a disabled describe, it or test block, and ignores comments", () => {
    expect(hasDisabledBlocks('describe.skip("x", () => {});')).toBe(true);
    expect(hasDisabledBlocks('it.only("x", () => {});')).toBe(true);
    expect(hasDisabledBlocks('test.todo("x");')).toBe(true);
    expect(hasDisabledBlocks('// describe.skip("x")\nit("y", () => {});')).toBe(false);
  });

  it("accepts only supabase/tests/*.db.test.ts files, and counts an overload that writes", () => {
    const outside = { f: { crossAccount: { file: "../../src/lib/db/x.test.ts", title: "x" } } };
    expect(findMissingCases([{ name: "f", securityDefiner: false }], outside, readTestFile)).toEqual([
      "f: cross-account case file ../../src/lib/db/x.test.ts is not a supabase/tests/*.db.test.ts file",
    ]);
    const registry = { get_snapshot: { crossAccount: FUNCTION_CASES.get_snapshot.crossAccount } };
    const overloads: CatalogFunction[] = [
      { name: "get_snapshot", securityDefiner: false },
      { name: "get_snapshot", securityDefiner: true },
    ];
    expect(findMissingCases(overloads, registry, readTestFile)).toEqual([
      "get_snapshot: no registered change-set case",
    ]);
  });
});

describe("function privileges by role", () => {
  it("no client role can execute an internal function", async () => {
    const db = await connect();
    try {
      const { rows } = await db.query(
        `select p.oid::regprocedure::text as fn,
                has_function_privilege('anon', p.oid, 'execute') as anon,
                has_function_privilege('authenticated', p.oid, 'execute') as authenticated,
                has_function_privilege('service_role', p.oid, 'execute') as service_role
           from pg_proc p
          where p.pronamespace = 'internal'::regnamespace and ${EXTENSION_FREE}`,
      );
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row.anon, `${row.fn} for anon`).toBe(false);
        expect(row.authenticated, `${row.fn} for authenticated`).toBe(false);
        expect(row.service_role, `${row.fn} for service_role`).toBe(false);
      }
    } finally {
      await db.end();
    }
  });

  it("anon and service_role cannot execute any function in public", async () => {
    const db = await connect();
    try {
      const { rows } = await db.query(
        `select p.oid::regprocedure::text as fn,
                has_function_privilege('anon', p.oid, 'execute') as anon,
                has_function_privilege('service_role', p.oid, 'execute') as service_role
           from pg_proc p
          where p.pronamespace = 'public'::regnamespace and ${EXTENSION_FREE}`,
      );
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row.anon, `${row.fn} for anon`).toBe(false);
        expect(row.service_role, `${row.fn} for service_role`).toBe(false);
      }
    } finally {
      await db.end();
    }
  });
});
