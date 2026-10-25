import type { CaseRef, FunctionCases } from "./function-cases";

export type CatalogFunction = { name: string; securityDefiner: boolean };

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Comments are removed first, so a commented-out test is not a case. Line comments are only
// recognised at the start of a line, which keeps "//" inside strings (URLs) intact.
export function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

// A block that is skipped, todo or the only one that runs makes a registered title unreliable.
export function hasDisabledBlocks(source: string): boolean {
  return /(?:^|[^.\w])(?:describe|suite|it|test)\.(?:skip|todo|only)\b/m.test(stripComments(source));
}

// A title counts only as a live `it("…")` or `test("…")`: `.skip`, `.todo` and `.only` forms
// do not match, nor does a title that is only part of a longer one.
export function hasLiveCase(source: string, title: string): boolean {
  const code = stripComments(source);
  const pattern = new RegExp(`(?:^|[^.\\w])(?:it|test)\\(\\s*(["'\`])${escapeRegExp(title)}\\1`, "m");
  return pattern.test(code);
}

// Returns what is missing, one line per problem; an empty list means every function is covered.
// `readTestFile` returns a test file's source, or undefined when the file does not exist.
export function findMissingCases(
  functions: CatalogFunction[],
  registry: Record<string, FunctionCases>,
  readTestFile: (file: string) => string | undefined,
): string[] {
  const problems: string[] = [];
  const check = (name: string, kind: string, ref: CaseRef | undefined) => {
    if (!ref) {
      problems.push(`${name}: no registered ${kind} case`);
      return;
    }
    if (!/^[\w.-]+\.db\.test\.ts$/.test(ref.file)) {
      problems.push(`${name}: ${kind} case file ${ref.file} is not a supabase/tests/*.db.test.ts file`);
      return;
    }
    const source = readTestFile(ref.file);
    if (source === undefined) problems.push(`${name}: ${kind} case file ${ref.file} does not exist`);
    else if (hasDisabledBlocks(source)) {
      problems.push(`${name}: ${kind} case file ${ref.file} has a skipped, todo or only block`);
    } else if (!hasLiveCase(source, ref.title)) {
      problems.push(`${name}: ${kind} case "${ref.title}" is not a live test in ${ref.file}`);
    }
  };

  // Overloads share one entry; the entry needs a change-set case if any overload writes.
  const byName = new Map<string, CatalogFunction>();
  for (const fn of functions) {
    const seen = byName.get(fn.name);
    byName.set(fn.name, { name: fn.name, securityDefiner: fn.securityDefiner || !!seen?.securityDefiner });
  }
  const names = new Set(byName.keys());
  for (const fn of byName.values()) {
    const entry = registry[fn.name];
    if (!entry) {
      problems.push(`${fn.name}: no registered cross-account case`);
      if (fn.securityDefiner) problems.push(`${fn.name}: no registered change-set case`);
      continue;
    }
    check(fn.name, "cross-account", entry.crossAccount);
    if (fn.securityDefiner) check(fn.name, "change-set", entry.changeSet);
  }
  for (const name of Object.keys(registry)) {
    if (!names.has(name)) problems.push(`${name}: registered but no such function in public`);
  }
  return problems;
}
