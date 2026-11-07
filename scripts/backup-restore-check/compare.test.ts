import { describe, expect, it } from "vitest";
import { compareExports, TABLE_KEYS } from "./compare";

const TEST_USER = "11111111-1111-1111-1111-111111111111";
const OWNER = "22222222-2222-2222-2222-222222222222";

type Doc = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const backup = (): Record<string, unknown> => ({
  format_version: 1,
  exported_at: 1,
  user_id: OWNER,
  fingerprint: "a",
  nodes: [{ id: "n1", user_id: OWNER, title: "한글", version: 3, tags: ["x"] }, { id: "n2", user_id: OWNER, title: "b", version: 1, tags: [] }],
  bits: [{ id: "b1", user_id: OWNER, title: "t", description: null, version: 1 }],
  chunks: [],
  scratch_breakdowns: [{ id: "s1", user_id: OWNER, content: "c", version: 2 }],
  staged_candidates: [],
});
// What a correct restore leaves: the test user's id and version + 1; top-level metadata differs.
const restored = (): Doc => {
  const e = JSON.parse(JSON.stringify(backup()));
  for (const k of TABLE_KEYS) for (const r of e[k]) { r.user_id = TEST_USER; r.version += 1; }
  e.exported_at = 99; e.user_id = TEST_USER; e.fingerprint = "z";
  return e;
};
const run = (a: Record<string, unknown>, b = backup()) => compareExports(b, a, TEST_USER);

describe("compareExports", () => {
  it("passes a correct restore and reports counts and hashes", () => {
    const r = run(restored());
    expect(r.ok).toBe(true);
    expect(r.failures).toEqual([]);
    expect(r.tables.nodes).toMatchObject({ backupRows: 2, afterRows: 2 });
    expect(r.tables.nodes.hash).toMatch(/^[0-9a-f]{32}$/);
  });

  it("ignores row order", () => {
    const e = restored();
    e.nodes.reverse();
    expect(run(e).ok).toBe(true);
  });

  it("fails a changed text and names the column, never the value", () => {
    const e = restored();
    e.nodes[0].title = "SECRET-VALUE";
    const r = run(e);
    expect(r.ok).toBe(false);
    expect(r.failures).toEqual(["nodes.title: differs in 1 rows"]);
    expect(JSON.stringify(r)).not.toContain("SECRET-VALUE");
  });

  it("fails a changed nested value", () => {
    const e = restored();
    e.nodes[0].tags = ["y"];
    expect(run(e).failures).toEqual(["nodes.tags: differs in 1 rows"]);
  });

  it("fails a missing row and an extra row", () => {
    const e = restored();
    e.nodes.pop();
    e.chunks.push({ id: "c9", user_id: TEST_USER, version: 1 });
    const r = run(e).failures;
    expect(r).toContain("nodes: 1 backup rows not found after the restore");
    expect(r).toContain("chunks: 1 rows after the restore are not in the backup");
  });

  it("fails a version that is not the backup's plus one", () => {
    const same = restored();
    same.bits[0].version = 1;
    expect(run(same).failures).toEqual(["bits.version: differs in 1 rows"]);
    const two = restored();
    two.bits[0].version = 3;
    expect(run(two).ok).toBe(false);
  });

  it("fails a row that kept the owner's id", () => {
    const e = restored();
    e.bits[0].user_id = OWNER;
    expect(run(e).failures).toEqual(["bits.user_id: differs in 1 rows"]);
  });

  it("fails a column of the backup that the re-export lost", () => {
    const e = restored();
    delete e.bits[0].description;
    expect(run(e).failures).toEqual(["bits.description (missing): differs in 1 rows"]);
  });

  it("passes a column only the re-export has and reports its name", () => {
    const e = restored();
    e.bits[0].new_col = 5;
    const r = run(e);
    expect(r.ok).toBe(true);
    expect(r.newColumns).toEqual(["bits.new_col"]);
  });

  it("fails a table missing from the re-export while the backup has rows", () => {
    const e = restored();
    delete e.nodes;
    const f = run(e).failures;
    expect(f).toContain("nodes: missing from the re-export");
  });

  it("passes a table absent from the backup only with zero re-exported rows", () => {
    const b = backup();
    delete b.staged_candidates;
    const ok = restored();
    expect(run(ok, b).ok).toBe(true);
    const bad = restored();
    bad.staged_candidates = [{ id: "x", user_id: TEST_USER, version: 1 }];
    expect(run(bad, b).failures).toEqual(["staged_candidates: absent from the backup but 1 rows were re-exported", "staged_candidates: 1 rows after the restore are not in the backup"]);
  });

  it("compares format_version but not the top-level time, user and fingerprint", () => {
    const e = restored();
    e.format_version = 2;
    expect(run(e).failures).toEqual(["format_version differs"]);
  });

  it("gives the same hash for the same rows and a different one for different rows", () => {
    const a = run(restored()).tables.nodes.hash;
    expect(run(restored()).tables.nodes.hash).toBe(a);
    const e = restored();
    e.nodes[1].title = "other";
    expect(run(e).tables.nodes.hash).not.toBe(a);
  });
});
