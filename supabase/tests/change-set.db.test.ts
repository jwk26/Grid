import { beforeAll, describe, expect, it } from "vitest";
import {
  assertChangeSet,
  diffChangeSet,
  type Changes,
  type Envelope,
  type Row,
  type SnapshotValue,
} from "./helpers/change-set";
import { withActor } from "./helpers/db";
import { createTestUser, type TestUser } from "./helpers/users";

const U = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const row = (id: string, extra: Record<string, unknown> = {}, user = U): Row => ({
  id,
  user_id: user,
  title: id,
  ...extra,
});

describe("diffChangeSet", () => {
  const before: SnapshotValue = { nodes: [row("a"), row("b")], bits: [row("x")] };

  it("accepts upserts, deletes and an unchanged table", () => {
    const changes: Changes = {
      nodes: { upserted: [row("b", { title: "new" }), row("c")], deleted: ["a"] },
    };
    const after: SnapshotValue = {
      nodes: [row("c"), row("b", { title: "new" })],
      bits: [row("x")],
    };
    expect(diffChangeSet(before, changes, after, U)).toEqual([]);
  });

  it("treats a rejection as an empty account", () => {
    const changes: Changes = { nodes: { upserted: [row("a")], deleted: [] } };
    expect(diffChangeSet({ rejection: { code: "account_missing" } }, changes, { nodes: [row("a")] }, U)).toEqual([]);
  });

  it("fails when a written row is left out of changes", () => {
    const after: SnapshotValue = { nodes: [row("a"), row("b", { title: "new" })], bits: [row("x")] };
    expect(diffChangeSet(before, {}, after, U)).toHaveLength(1);
  });

  it("fails when a deleted row is not reported, or a reported delete did not happen", () => {
    const afterMissing: SnapshotValue = { nodes: [row("a")], bits: [row("x")] };
    expect(diffChangeSet(before, {}, afterMissing, U)).toHaveLength(1);
    const reported: Changes = { bits: { upserted: [], deleted: ["x"] } };
    expect(diffChangeSet(before, reported, before, U)).toHaveLength(1);
  });

  it("fails when changes hold a row of another account, even if the snapshots agree", () => {
    const foreign = row("z", {}, OTHER);
    const problems = diffChangeSet(
      before,
      { nodes: { upserted: [foreign], deleted: [] } },
      { ...before, nodes: [...before.nodes!, foreign] },
      U,
    );
    expect(problems.some((p) => p.includes("another account"))).toBe(true);
  });

  it("fails when changes delete an id the snapshot before does not hold, or carry an unknown key", () => {
    expect(diffChangeSet(before, { nodes: { upserted: [], deleted: ["nope"] } }, before, U)).toHaveLength(1);
    const unknown = { accounts: { upserted: [], deleted: [] } } as unknown as Changes;
    expect(diffChangeSet(before, unknown, before, U)).toHaveLength(1);
  });

  it("compares all five tables", () => {
    const after: SnapshotValue = { ...before, staged_candidates: [row("k")] };
    expect(diffChangeSet(before, {}, after, U)).toHaveLength(1);
  });
});

describe("assertChangeSet against ensure_account", () => {
  let user: TestUser;
  beforeAll(async () => {
    user = await createTestUser("cs");
  });
  const actor = () => ({ role: "authenticated" as const, userId: user.id });
  const ensure = async (db: import("pg").Client) =>
    (await db.query("select public.ensure_account() as e")).rows[0].e as Envelope;

  it("matches for a first call and for a no-op rerun", async () => {
    await withActor(actor(), async (db) => {
      const first = await assertChangeSet(db, user.id, ensure);
      expect(first.changes.nodes?.upserted).toHaveLength(2);
      const rerun = await assertChangeSet(db, user.id, ensure);
      expect(rerun.changes).toEqual({});
    });
  });

  it("throws when the function omits a written row from changes", async () => {
    await withActor(actor(), async (db) => {
      await expect(
        assertChangeSet(db, user.id, async (c) => ({ ...(await ensure(c)), changes: {} })),
      ).rejects.toThrow(/change set does not match/);
    });
  });
});
