import { randomUUID } from "node:crypto";
import type { Client } from "pg";
import { beforeAll, describe, expect, it } from "vitest";
import { baseEntities } from "@/lib/db/boundary-cases";
import { scratchBreakdownToRow, stagedCandidateToRow } from "@/lib/db/row-mapping";
import type { ScratchBreakdown, StagedCandidate } from "@/lib/db/schema";
import { assertChangeSet, type Envelope as ChangeEnvelope } from "./helpers/change-set";
import { expectDbError, insertRow, withActor } from "./helpers/db";
import { account, addBit, addNode, authed, call, sql, stored, type Envelope, type Owner, type Row } from "./helpers/lifecycle";
import { createTestUser, type TestUser } from "./helpers/users";

// The Placement commands (Task 223), ported from the Dexie scenarios in triage-placement.test.ts,
// which are the answer key.

let user: TestUser;
let stranger: TestUser;

beforeAll(async () => {
  user = await createTestUser("plc");
  stranger = await createTestUser("plc-other");
});

const A = () => authed(user);

type Place = {
  result: string; scratch: string; source: string; sourceVersion: number; type: string; title: string;
  target: string | null; path: string[]; x: number; y: number; cand: string; candVersion: number;
};
const args = (p: Place) => [p.result, p.scratch, p.source, p.sourceVersion, p.type, p.title, p.target, p.path, p.x, p.y, p.cand, p.candVersion];
const placeStaged = (db: Client, p: Place) => call(db, "place_staged_candidate", args(p));
const reconcileStaged = (db: Client, p: Place) => call(db, "reconcile_place_staged_candidate", args(p));
const directArgs = (p: Place) => args(p).slice(0, 10);
const placeDirect = (db: Client, p: Place) => call(db, "place_direct_breakdown", directArgs(p));
const reconcileDirect = (db: Client, p: Place) => call(db, "reconcile_place_direct_breakdown", directArgs(p));

const sourceRow = async (db: Client, id: string): Promise<Row | undefined> =>
  (await db.query("select to_jsonb(r.*) as r from app.scratch_breakdowns r where id = $1", [id])).rows[0]?.r;
const candidateRow = async (db: Client, id: string): Promise<Row | undefined> =>
  (await db.query("select to_jsonb(r.*) as r from app.staged_candidates r where id = $1", [id])).rows[0]?.r;

// The Inbox with one Scratch, a Target (L0), its child Mid (L1) and a level-2 Deep, and one
// staged source ("Idea", version 3, candidate version 2).
async function setup(db: Client, owner: Owner, o: { type?: string; content?: string } = {}, u = user) {
  return owner(async () => {
    await account(db, u.id);
    const inbox = await addNode(db, u.id, { systemRole: "inbox", x: 8, y: 8, version: 3, mtime: 7 });
    const scratch = await addBit(db, u.id, { parentId: inbox, title: "Scratch", x: 0, y: 0, version: 5, mtime: 7 });
    const target = await addNode(db, u.id, { title: "Target", x: 1, y: 0, level: 0, mtime: 100 });
    const mid = await addNode(db, u.id, { title: "Middle", parentId: target, level: 1, x: 1, y: 1 });
    const deep = await addNode(db, u.id, { title: "Deep", parentId: mid, level: 2, x: 1, y: 2 });
    const src = randomUUID();
    await insertRow(db, "scratch_breakdowns", scratchBreakdownToRow({ ...baseEntities.scratchBreakdown, id: src, scratchBitId: scratch, content: o.content ?? "Idea", version: 3 } as ScratchBreakdown, u.id));
    const cand = randomUUID();
    await insertRow(db, "staged_candidates", stagedCandidateToRow({ ...baseEntities.stagedCandidate, id: cand, scratchBitId: scratch, sourceBreakdownId: src, resultType: (o.type ?? "bit") as "node" | "bit", version: 2 } as StagedCandidate, u.id));
    const place: Place = {
      result: randomUUID(), scratch, source: src, sourceVersion: 3, type: o.type ?? "bit", title: o.content ?? "Idea",
      target, path: [target], x: 2, y: 3, cand, candVersion: 2,
    };
    return { inbox, scratch, target, mid, deep, src, cand, place };
  });
}
type T = Awaited<ReturnType<typeof setup>>;

const counts = async (db: Client) =>
  (await db.query(
    `select (select count(*) from app.nodes) n, (select count(*) from app.bits) b,
            (select count(*) from app.scratch_breakdowns) s, (select count(*) from app.staged_candidates) c`,
  )).rows[0];

describe("place_staged_candidate", () => {
  it.each([["node", null, []], ["node", "target", ["target"]], ["bit", "target", ["target"]]] as const)(
    "creates a stable %s result in %s with the placement defaults and the complete postcondition",
    async (type, where, pathKeys) => {
      await withActor(A(), async (db, owner) => {
        const t = await setup(db, owner, { type });
        const target = where === null ? null : t.target;
        const p: Place = { ...t.place, type, title: type === "node" ? "Placed Node" : "Idea", target, path: pathKeys.map(() => t.target) };
        if (type === "node") await owner(() => sql(db, "update app.scratch_breakdowns set content = $1 where id = $2", [p.title, t.src]));
        expect(await reconcileStaged(db, p)).toMatchObject({
          status: "not_applied", changes: { scratch_breakdowns: { upserted: [{ id: t.src, version: 3, consumed_at: null }] }, staged_candidates: { upserted: [{ id: t.cand, version: 2 }] } },
        });
        const applied = await placeStaged(db, p);
        expect(applied).toMatchObject({ status: "applied", result: { id: p.result } });
        const row = await stored(db, type === "node" ? "nodes" : "bits", p.result);
        expect(row).toMatchObject({ title: p.title, parent_id: target, x: 2, y: 3, version: 1, past_deadline_dismissed: false, deleted_at: null, archived_at: null });
        expect(row.created_at).toBe(row.mtime);
        if (type === "node") expect(row).toMatchObject({ level: target ? 1 : 0, color: "hsl(210, 80%, 55%)", icon: "Folder", system_role: null, hidden_from_grid: false });
        else expect(row).toMatchObject({ description: "", icon: "ListTodo", status: "active", priority: null });
        const src = await sourceRow(db, t.src);
        expect(src).toMatchObject({ version: 4, consumed_at: row.created_at });
        expect(await candidateRow(db, t.cand)).toBeUndefined();
        if (target) expect(await stored(db, "nodes", t.target)).toMatchObject({ mtime: row.created_at, version: 1 });
        expect(applied.changes.staged_candidates).toEqual({ upserted: [], deleted: [t.cand] });
        expect(applied.changes.scratch_breakdowns?.upserted).toHaveLength(1);
        expect(applied.changes[type === "node" ? "nodes" : "bits"]?.upserted.map((r) => r.id)).toContain(p.result);

        const committed = await counts(db);
        expect(await placeStaged(db, p)).toMatchObject({ status: "already_applied", result: { id: p.result } });
        expect(await reconcileStaged(db, p)).toMatchObject({ status: "already_applied" });
        expect(await counts(db)).toEqual(committed);
        expect(await sourceRow(db, t.src)).toEqual(src);
      });
    },
  );

  const writesNothing: [string, (db: Client, t: T) => Promise<void>, string, string?][] = [
    ["a source version that changed", (db, t) => sql(db, "update app.scratch_breakdowns set version = 4 where id = $1", [t.src]), "conflict"],
    ["a source that was consumed", (db, t) => sql(db, "update app.scratch_breakdowns set consumed_at = 200 where id = $1", [t.src]), "rejected", "invalid_target"],
    ["a Scratch that was archived", (db, t) => sql(db, "update app.bits set archived_at = 200 where id = $1", [t.scratch]), "rejected", "invalid_target"],
    ["a Scratch that was trashed", (db, t) => sql(db, "update app.bits set deleted_at = 200 where id = $1", [t.scratch]), "rejected", "invalid_target"],
    ["a candidate version that changed", (db, t) => sql(db, "update app.staged_candidates set version = 3 where id = $1", [t.cand]), "conflict"],
    ["a candidate of another result type", (db, t) => sql(db, "update app.staged_candidates set result_type = 'node' where id = $1", [t.cand]), "conflict"],
    ["a target that moved to another path", (db, t) => sql(db, "update app.nodes set parent_id = $1, level = 1 where id = $2", [t.inbox, t.target]), "rejected", "invalid_target"],
    ["a target that was archived", (db, t) => sql(db, "update app.nodes set archived_at = 200 where id = $1", [t.target]), "rejected", "invalid_target"],
    ["a target that was trashed", (db, t) => sql(db, "update app.nodes set deleted_at = 200 where id = $1", [t.target]), "rejected", "invalid_target"],
    ["a cell that became occupied", (db, t) => addBit(db, user.id, { parentId: t.target, x: 2, y: 3 }).then(() => undefined), "rejected", "cell_taken"],
    ["a result id that exists", (db, t) => addBit(db, user.id, { id: t.place.result, parentId: t.target, x: 5, y: 5 }).then(() => undefined), "conflict"],
  ];
  it.each(writesNothing)("%s writes nothing", async (_label, mutate, status, code) => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      await owner(() => mutate(db, t));
      const before = await counts(db);
      const srcBefore = await sourceRow(db, t.src);
      const envelope = await placeStaged(db, t.place);
      expect(envelope).toMatchObject({ status, ...(code ? { rejection: { code } } : {}) });
      expect(envelope.changes.scratch_breakdowns?.upserted[0]).toMatchObject({ id: t.src });
      expect(await counts(db)).toEqual(before);
      expect(await sourceRow(db, t.src)).toEqual(srcBefore);
      expect(await stored(db, "nodes", t.target)).toMatchObject({ mtime: expect.any(Number) });
    });
  });

  it("keeps the target mtime when it rejects", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      await owner(() => sql(db, "update app.bits set archived_at = 200 where id = $1", [t.scratch]));
      await placeStaged(db, t.place);
      expect(await stored(db, "nodes", t.target)).toMatchObject({ mtime: 100 });
    });
  });

  it.each([
    ["Home with a nonempty path", (t: T): Partial<Place> => ({ type: "node", target: null, path: [t.target] })],
    ["a Bit at Home", (): Partial<Place> => ({ type: "bit", target: null, path: [] })],
    ["a Node below a level-2 target", (t: T): Partial<Place> => ({ type: "node", target: t.deep, path: [t.target, t.mid, t.deep] })],
    ["a path in the wrong order", (t: T): Partial<Place> => ({ target: t.mid, path: [t.mid, t.target] })],
    ["a path that is too short", (t: T): Partial<Place> => ({ target: t.mid, path: [t.mid] })],
    ["a system Node target", (t: T): Partial<Place> => ({ target: t.inbox, path: [t.inbox] })],
    ["a missing target", (): Partial<Place> => ({ target: randomUUID(), path: [] })],
  ])("rejects %s without truncation, conversion or an alternate target", async (_label, patch) => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const p = { ...t.place, ...patch(t) };
      if (p.type === "node") await owner(() => sql(db, "update app.staged_candidates set result_type = 'node' where id = $1", [t.cand]));
      const before = await counts(db);
      expect(await placeStaged(db, p)).toMatchObject({ status: "rejected", rejection: { code: "invalid_target" } });
      expect(await counts(db)).toEqual(before);
      expect(await sourceRow(db, t.src)).toMatchObject({ version: 3, consumed_at: null });
    });
  });

  it("rejects a title past the limit, a cell outside the grid, and a wrong-typed placement argument", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      expect(await placeStaged(db, { ...t.place, title: "b".repeat(201) })).toMatchObject({ status: "rejected", rejection: { code: "invalid_input" } });
      expect(await placeStaged(db, { ...t.place, title: "" })).toMatchObject({ status: "rejected", rejection: { code: "invalid_input" } });
      expect(await placeStaged(db, { ...t.place, x: 18 })).toMatchObject({ status: "rejected", rejection: { code: "invalid_input" } });
      expect(await placeStaged(db, { ...t.place, y: -1 })).toMatchObject({ status: "rejected", rejection: { code: "invalid_input" } });
      expect(await counts(db)).toMatchObject({ s: "1", c: "1" });
    });
  });

  it("rejects a Node title past 100 characters", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner, { type: "node" });
      expect(await placeStaged(db, { ...t.place, type: "node", target: null, path: [], title: "n".repeat(101) })).toMatchObject({ status: "rejected", rejection: { code: "invalid_input" } });
    });
  });

  it("is not_found for a missing Scratch or source, invalid_target for a Scratch outside the Inbox", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      expect(await placeStaged(db, { ...t.place, scratch: randomUUID() })).toMatchObject({ status: "rejected", rejection: { code: "not_found" }, changes: {} });
      expect(await placeStaged(db, { ...t.place, source: randomUUID() })).toMatchObject({ status: "rejected", rejection: { code: "not_found" } });
      const plain = await owner(() => addBit(db, user.id, { parentId: t.target, x: 4, y: 4 }));
      expect(await placeStaged(db, { ...t.place, scratch: plain })).toMatchObject({ status: "rejected", rejection: { code: "invalid_target" } });
    });
  });

  it("raises 22023 for a null argument or a bad result type", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      await expect(placeStaged(db, { ...t.place, title: null as unknown as string })).rejects.toThrow(/every argument/);
    });
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      await expect(placeStaged(db, { ...t.place, type: "chunk" })).rejects.toThrow(/every argument/);
    });
  });

  it("classifies every partial postcondition as conflict and never compensates", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      await owner(() => sql(db, "delete from app.staged_candidates where id = $1", [t.cand]));
      const before = await counts(db);
      expect(await reconcileStaged(db, t.place)).toMatchObject({ status: "conflict" });
      expect(await placeStaged(db, t.place)).toMatchObject({ status: "conflict" });
      expect(await counts(db)).toEqual(before);
    });
  });

  it("recognizes the committed postcondition by stable ids after the target path or Scratch later changes", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      expect(await placeStaged(db, t.place)).toMatchObject({ status: "applied" });
      await owner(() => sql(db, "update app.nodes set parent_id = $1, level = 1, version = version + 1 where id = $2", [t.inbox, t.target]));
      await owner(() => sql(db, "update app.bits set deleted_at = 300 where id = $1", [t.scratch]));
      expect(await reconcileStaged(db, t.place)).toMatchObject({ status: "already_applied" });
      expect(await placeStaged(db, t.place)).toMatchObject({ status: "already_applied" });
    });
  });

  it("does not recompute a committed Node result level from a later target move", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner, { type: "node", content: "Placed Node" });
      const p: Place = { ...t.place, type: "node" };
      expect(await placeStaged(db, p)).toMatchObject({ status: "applied" });
      expect(await stored(db, "nodes", p.result)).toMatchObject({ level: 1 });
      await owner(() => sql(db, "update app.nodes set parent_id = $1, level = 1, version = version + 1 where id = $2", [t.inbox, t.target]));
      expect(await reconcileStaged(db, p)).toMatchObject({ status: "already_applied", changes: { nodes: { upserted: [{ id: p.result, level: 1 }] } } });
    });
  });

  it("reconciles a Place followed by an Undo-shaped state (source restored, candidate back) as conflict", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      expect(await placeStaged(db, t.place)).toMatchObject({ status: "applied" });
      await owner(async () => {
        await sql(db, "delete from app.bits where id = $1", [t.place.result]);
        await sql(db, "update app.scratch_breakdowns set consumed_at = null, version = 5 where id = $1", [t.src]);
        await insertRow(db, "staged_candidates", stagedCandidateToRow({ ...baseEntities.stagedCandidate, id: t.cand, scratchBitId: t.scratch, sourceBreakdownId: t.src, resultType: "bit", version: 3 } as StagedCandidate, user.id));
      });
      expect(await reconcileStaged(db, t.place)).toMatchObject({ status: "conflict" });
      expect(await placeStaged(db, t.place)).toMatchObject({ status: "conflict" });
    });
  });

  it("rejects only account_missing from the reconcile and reports a missing account", async () => {
    await withActor(authed(stranger), async (db) => {
      const p: Place = { result: randomUUID(), scratch: randomUUID(), source: randomUUID(), sourceVersion: 1, type: "bit", title: "x", target: null, path: [], x: 0, y: 0, cand: randomUUID(), candVersion: 1 };
      expect(await reconcileStaged(db, p)).toMatchObject({ status: "rejected", rejection: { code: "account_missing" } });
      expect(await placeStaged(db, p)).toMatchObject({ status: "rejected", rejection: { code: "account_missing" } });
    });
  });

  it("a reconcile with a null argument is a conflict, where the command raises 22023", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      expect(await reconcileStaged(db, { ...t.place, title: null as unknown as string })).toMatchObject({ status: "conflict" });
      expect(await reconcileStaged(db, { ...t.place, type: "chunk" })).toMatchObject({ status: "conflict" });
    });
  });
});

describe("stage_candidate and delete_breakdown with a Scratch that is not an active Inbox Scratch", () => {
  it("is invalid_target for a Bit outside the Inbox, even with a missing source (Task 223 note)", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const plain = await owner(() => addBit(db, user.id, { parentId: t.target, x: 4, y: 4 }));
      expect(await call(db, "stage_candidate", [randomUUID(), plain, randomUUID(), 1, "bit"])).toMatchObject({ status: "rejected", rejection: { code: "invalid_target" } });
      expect(await call(db, "stage_candidate", [randomUUID(), plain, t.src, 3, "bit"])).toMatchObject({ status: "rejected", rejection: { code: "invalid_target" } });
      expect(await call(db, "delete_breakdown", [randomUUID(), 1, plain, 1])).toMatchObject({ status: "rejected", rejection: { code: "invalid_target" } });
      expect(await call(db, "delete_breakdown", [t.src, 3, plain, 1])).toMatchObject({ status: "rejected", rejection: { code: "invalid_target" } });
      expect(await sourceRow(db, t.src)).toMatchObject({ version: 3 });
    });
  });

  it("is invalid_target for an archived Scratch with a missing source", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      await owner(() => sql(db, "update app.bits set archived_at = 200 where id = $1", [t.scratch]));
      expect(await call(db, "stage_candidate", [randomUUID(), t.scratch, randomUUID(), 1, "bit"])).toMatchObject({ status: "rejected", rejection: { code: "invalid_target" } });
      expect(await call(db, "delete_breakdown", [randomUUID(), 1, t.scratch, 5])).toMatchObject({ status: "rejected", rejection: { code: "invalid_target" } });
    });
  });
});

describe("target pre-read (both placements)", () => {
  const both: [string, (db: Client, p: Place) => Promise<Envelope>][] = [["staged", placeStaged], ["direct", placeDirect]];
  it.each(both)("%s: the Inbox Node as target is invalid_target with no write", async (_l, place) => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const before = await counts(db);
      expect(await place(db, { ...t.place, target: t.inbox, path: [t.inbox] })).toMatchObject({ status: "rejected", rejection: { code: "invalid_target" } });
      expect(await counts(db)).toEqual(before);
      expect(await sourceRow(db, t.src)).toMatchObject({ version: 3, consumed_at: null });
    });
  });
  it.each(both)("%s: a missing target is invalid_target, and conflict when the source version also changed", async (_l, place) => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const missing = { ...t.place, target: randomUUID(), path: [] as string[] };
      const before = await counts(db);
      expect(await place(db, missing)).toMatchObject({ status: "rejected", rejection: { code: "invalid_target" } });
      expect(await place(db, { ...missing, sourceVersion: 1 })).toMatchObject({ status: "conflict" });
      expect(await counts(db)).toEqual(before);
    });
  });
});

describe("place_direct_breakdown", () => {
  it.each([["node", null], ["node", "target"], ["bit", "target"]] as const)(
    "creates a stable direct %s result in %s with the placement defaults and the complete postcondition",
    async (type, where) => {
      await withActor(A(), async (db, owner) => {
        const t = await setup(db, owner, { type, content: type === "node" ? "Existing source" : "Idea" });
        await owner(() => sql(db, "delete from app.staged_candidates where id = $1", [t.cand]));
        const target = where === null ? null : t.target;
        const p: Place = { ...t.place, type, target, path: target ? [t.target] : [] };
        expect(await reconcileDirect(db, p)).toMatchObject({ status: "not_applied", changes: { scratch_breakdowns: { upserted: [{ id: t.src, version: 3, consumed_at: null }] } } });
        const applied = await placeDirect(db, p);
        expect(applied).toMatchObject({ status: "applied", result: { id: p.result } });
        const row = await stored(db, type === "node" ? "nodes" : "bits", p.result);
        expect(row).toMatchObject({ title: p.title, parent_id: target, x: 2, y: 3, version: 1, deleted_at: null, archived_at: null });
        expect(row.created_at).toBe(row.mtime);
        expect(await sourceRow(db, t.src)).toMatchObject({ version: 4, consumed_at: row.created_at });
        if (target) expect(await stored(db, "nodes", t.target)).toMatchObject({ mtime: row.created_at, version: 1 });
        expect(applied.changes.staged_candidates).toBeUndefined();
        const committed = await counts(db);
        expect(await placeDirect(db, p)).toMatchObject({ status: "already_applied" });
        expect(await reconcileDirect(db, p)).toMatchObject({ status: "already_applied" });
        expect(await counts(db)).toEqual(committed);
      });
    },
  );

  it("rejects a source that owns a candidate, returning that candidate, and writes nothing", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const before = await counts(db);
      const envelope = await placeDirect(db, t.place);
      expect(envelope).toMatchObject({ status: "rejected", rejection: { code: "invalid_target" }, changes: { staged_candidates: { upserted: [{ id: t.cand }] } } });
      expect(await counts(db)).toEqual(before);
      expect(await reconcileDirect(db, t.place)).toMatchObject({ status: "conflict" });
    });
  });

  it.each([
    ["a title that differs from the source content", { title: "Other" }, "invalid_input"],
    ["Home with a nonempty path", { type: "node", target: null, path: ["x"] }, "invalid_target"],
    ["a Bit at Home", { type: "bit", target: null, path: [] }, "invalid_target"],
    ["a cell outside the grid", { x: 18 }, "invalid_input"],
  ] as const)("rejects %s without truncation or an alternate target", async (_l, patch, code) => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      await owner(() => sql(db, "delete from app.staged_candidates where id = $1", [t.cand]));
      const p = { ...t.place, ...patch, path: "path" in patch ? (patch.path as unknown as string[]).map(() => t.target) : t.place.path } as Place;
      const before = await counts(db);
      expect(await placeDirect(db, p)).toMatchObject({ status: "rejected", rejection: { code } });
      expect(await counts(db)).toEqual(before);
    });
  });

  it.each([
    ["a Node title above 100", "node", "n".repeat(101)],
    ["a Bit title above 200", "bit", "b".repeat(201)],
  ] as const)("rejects %s", async (_l, type, title) => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner, { type, content: title });
      await owner(() => sql(db, "delete from app.staged_candidates where id = $1", [t.cand]));
      const p: Place = { ...t.place, type, title, target: type === "node" ? null : t.target, path: type === "node" ? [] : [t.target] };
      expect(await placeDirect(db, p)).toMatchObject({ status: "rejected", rejection: { code: "invalid_input" } });
    });
  });

  it("keeps Dexie's decision order: version, state and target rejections", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      await owner(() => sql(db, "delete from app.staged_candidates where id = $1", [t.cand]));
      expect(await placeDirect(db, { ...t.place, sourceVersion: 1 })).toMatchObject({ status: "conflict" });
      expect(await placeDirect(db, { ...t.place, source: randomUUID() })).toMatchObject({ status: "rejected", rejection: { code: "not_found" } });
      await owner(() => sql(db, "update app.scratch_breakdowns set consumed_at = 5 where id = $1", [t.src]));
      expect(await placeDirect(db, t.place)).toMatchObject({ status: "rejected", rejection: { code: "invalid_target" } });
      await owner(() => sql(db, "update app.scratch_breakdowns set consumed_at = null where id = $1", [t.src]));
      await owner(() => addBit(db, user.id, { parentId: t.target, x: 2, y: 3 }));
      expect(await placeDirect(db, t.place)).toMatchObject({ status: "rejected", rejection: { code: "cell_taken" } });
      await owner(() => sql(db, "update app.bits set archived_at = 9 where parent_id = $1", [t.target]));
      expect(await placeDirect(db, t.place)).toMatchObject({ status: "applied" });
    });
  });

  it("an inactive Scratch still reconciles already_applied after placement, and rejects a new one", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      await owner(() => sql(db, "delete from app.staged_candidates where id = $1", [t.cand]));
      expect(await placeDirect(db, t.place)).toMatchObject({ status: "applied" });
      await owner(() => sql(db, "update app.bits set archived_at = 300 where id = $1", [t.scratch]));
      expect(await reconcileDirect(db, t.place)).toMatchObject({ status: "already_applied" });
      expect(await placeDirect(db, { ...t.place, result: randomUUID(), sourceVersion: 4 })).toMatchObject({ status: "rejected", rejection: { code: "invalid_target" } });
    });
  });

  it("is invalid_target for a Scratch outside the Inbox, account_missing without an account, 22023 for null arguments", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const plain = await owner(() => addBit(db, user.id, { parentId: t.target, x: 4, y: 4 }));
      expect(await placeDirect(db, { ...t.place, scratch: plain })).toMatchObject({ status: "rejected", rejection: { code: "invalid_target" } });
      expect(await reconcileDirect(db, { ...t.place, title: null as unknown as string })).toMatchObject({ status: "conflict" });
    });
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      await expect(placeDirect(db, { ...t.place, x: null as unknown as number })).rejects.toThrow(/every argument/);
    });
    await withActor(authed(stranger), async (db) => {
      const p: Place = { result: randomUUID(), scratch: randomUUID(), source: randomUUID(), sourceVersion: 1, type: "bit", title: "x", target: null, path: [], x: 0, y: 0, cand: randomUUID(), candVersion: 1 };
      expect(await placeDirect(db, p)).toMatchObject({ status: "rejected", rejection: { code: "account_missing" } });
      expect(await reconcileDirect(db, p)).toMatchObject({ status: "rejected", rejection: { code: "account_missing" } });
    });
  });

  it("a late original placement reconciles conflict after the source was restored", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      await owner(() => sql(db, "delete from app.staged_candidates where id = $1", [t.cand]));
      expect(await placeDirect(db, t.place)).toMatchObject({ status: "applied" });
      await owner(async () => {
        await sql(db, "delete from app.bits where id = $1", [t.place.result]);
        await sql(db, "update app.scratch_breakdowns set consumed_at = null, version = 5 where id = $1", [t.src]);
      });
      expect(await reconcileDirect(db, t.place)).toMatchObject({ status: "conflict" });
      expect(await placeDirect(db, t.place)).toMatchObject({ status: "conflict" });
    });
  });
});

describe("cross-account and change set (direct placement)", () => {
  it("leaves another account's rows untouched and sees nothing of them", async () => {
    await withActor(A(), async (db, owner) => {
      const mine = await setup(db, owner);
      const theirs = await setup(db, owner, {}, stranger);
      expect(await placeDirect(db, { ...theirs.place, result: randomUUID() })).toMatchObject({ status: "rejected", rejection: { code: "not_found" }, changes: {} });
      expect(await reconcileDirect(db, theirs.place)).toMatchObject({ status: "conflict", changes: {} });
      const withTheirSource = await placeDirect(db, { ...mine.place, source: theirs.src });
      expect(withTheirSource).toMatchObject({ status: "rejected", rejection: { code: "not_found" } });
      expect(JSON.stringify(withTheirSource.changes)).not.toContain(theirs.src);
      const withTheirTarget = await placeDirect(db, { ...mine.place, target: theirs.target, path: [theirs.target] });
      expect(JSON.stringify(withTheirTarget.changes)).not.toContain(theirs.target);
      expect(await owner(() => sourceRow(db, theirs.src))).toMatchObject({ version: 3, consumed_at: null });
      expect(await owner(() => stored(db, "nodes", theirs.target))).toMatchObject({ mtime: 100 });
    });
  });

  it("before + changes equals after for direct placements, reconciles and their rejections", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      await owner(() => sql(db, "delete from app.staged_candidates where id = $1", [t.cand]));
      const run = (fn: () => Promise<Envelope>) => assertChangeSet(db, user.id, fn as unknown as () => Promise<ChangeEnvelope>);
      await run(() => reconcileDirect(db, t.place));
      await run(() => placeDirect(db, { ...t.place, x: 99 }));
      await run(() => placeDirect(db, { ...t.place, title: "Other" }));
      await run(() => placeDirect(db, t.place));
      await run(() => placeDirect(db, t.place));
      await run(() => reconcileDirect(db, t.place));
      await run(() => placeDirect(db, { ...t.place, result: randomUUID(), sourceVersion: 4 }));
    });
  });
});

describe("cross-account and change set (staged placement)", () => {
  it("leaves another account's rows untouched and sees nothing of them", async () => {
    await withActor(A(), async (db, owner) => {
      const mine = await setup(db, owner);
      const theirs = await setup(db, owner, {}, stranger);
      // My call with their Scratch, source, candidate or target: not found / conflict, none of their rows.
      const onTheirs = { ...theirs.place, result: randomUUID() };
      expect(await placeStaged(db, onTheirs)).toMatchObject({ status: "rejected", rejection: { code: "not_found" }, changes: {} });
      expect(await reconcileStaged(db, onTheirs)).toMatchObject({ status: "conflict", changes: {} });
      const withTheirSource = { ...mine.place, source: theirs.src, cand: theirs.cand };
      const sourceCase = await placeStaged(db, withTheirSource);
      expect(sourceCase).toMatchObject({ status: "rejected", rejection: { code: "not_found" } });
      expect(JSON.stringify(sourceCase.changes)).not.toContain(theirs.src);
      const withTheirTarget = await placeStaged(db, { ...mine.place, target: theirs.target, path: [theirs.target] });
      expect(withTheirTarget).toMatchObject({ status: "rejected", rejection: { code: "invalid_target" } });
      expect(JSON.stringify(withTheirTarget.changes)).not.toContain(theirs.target);
      expect(await owner(() => sourceRow(db, theirs.src))).toMatchObject({ version: 3, consumed_at: null });
      expect(await owner(() => candidateRow(db, theirs.cand))).toMatchObject({ version: 2 });
      expect(await owner(() => stored(db, "nodes", theirs.target))).toMatchObject({ mtime: 100 });
    });
  });

  it("a result id another account holds fails with 23505 and leaves that row unchanged", async () => {
    await withActor(A(), async (db, owner) => {
      const mine = await setup(db, owner);
      const theirs = await setup(db, owner, {}, stranger);
      const theirBit = await owner(() => addBit(db, stranger.id, { parentId: theirs.target, x: 6, y: 6 }));
      await db.query("savepoint dup");
      expect(await expectDbError(() => placeStaged(db, { ...mine.place, result: theirBit }))).toBe("23505");
      await db.query("rollback to savepoint dup");
      expect(await owner(() => stored(db, "bits", theirBit))).toMatchObject({ x: 6, y: 6, version: 1 });
      expect(await owner(() => sourceRow(db, mine.src))).toMatchObject({ version: 3, consumed_at: null });
    });
  });

  it("before + changes equals after for placements, reconciles and their rejections", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner, { type: "bit" });
      const run = (fn: () => Promise<Envelope>) => assertChangeSet(db, user.id, fn as unknown as () => Promise<ChangeEnvelope>);
      await run(() => reconcileStaged(db, t.place));
      await run(() => placeStaged(db, { ...t.place, x: 99 }));
      await run(() => placeStaged(db, { ...t.place, sourceVersion: 1 }));
      await run(() => placeStaged(db, t.place));
      await run(() => placeStaged(db, t.place));
      await run(() => reconcileStaged(db, t.place));
      await run(() => placeStaged(db, { ...t.place, result: randomUUID() }));
      await run(() => placeStaged(db, { ...t.place, scratch: randomUUID() }));
    });
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner, { type: "node", content: "Placed Node" });
      const run = (fn: () => Promise<Envelope>) => assertChangeSet(db, user.id, fn as unknown as () => Promise<ChangeEnvelope>);
      const home = { ...t.place, type: "node", target: null, path: [] };
      await run(() => placeStaged(db, home));
      await run(() => reconcileStaged(db, home));
    });
  });
});
