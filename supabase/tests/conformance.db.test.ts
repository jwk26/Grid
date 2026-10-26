import { randomUUID } from "node:crypto";
import type { Client } from "pg";
import { beforeAll, describe, expect, it } from "vitest";
import { baseEntities } from "@/lib/db/boundary-cases";
import { scratchBreakdownToRow } from "@/lib/db/row-mapping";
import { connect, expectDbError, insertRow, withActor } from "./helpers/db";
import { FUNCTION_CASES } from "./helpers/function-cases";
import { account, addBit, addChunk, addNode, authed, call, type Envelope, type Owner, type Row } from "./helpers/lifecycle";
import { createTestUser, type TestUser } from "./helpers/users";

// The SCHEMA §Repository Operation Contract conformance cases (Task 224), each run end to end
// against the real command functions. The Archive descriptor case is split (Phase 44 start drift
// D1): the database proves that reload reconciliation reads Scratch and postcondition state with no
// operation table; the fail-closed dispatch when `sessionStorage` cannot store the descriptor is
// browser-side and stays covered by src/hooks/use-archive-scratch.test.ts in `pnpm test`.

let user: TestUser;

beforeAll(async () => {
  user = await createTestUser("cnf");
});

const A = () => authed(user);

const snap = async (db: Client) =>
  (await db.query(
    `select (select json_agg(n order by id) from app.nodes n) n, (select json_agg(b order by id) from app.bits b) b,
            (select json_agg(s order by id) from app.scratch_breakdowns s) s, (select json_agg(c order by id) from app.staged_candidates c) c`,
  )).rows[0];
const row = async (db: Client, table: string, id: string): Promise<Row | undefined> =>
  (await db.query(`select to_jsonb(r.*) as r from app.${table} r where id = $1`, [id])).rows[0]?.r;

// The account's Inbox with a Scratch (version 5), a target Node and one unconsumed source (version 3).
async function setup(db: Client, owner: Owner) {
  return owner(async () => {
    await account(db, user.id);
    const inbox = await addNode(db, user.id, { systemRole: "inbox", x: 8, y: 8, version: 3, mtime: 7 });
    const scratch = await addBit(db, user.id, { parentId: inbox, title: "Scratch", x: 0, y: 0, version: 5, mtime: 7 });
    const target = await addNode(db, user.id, { title: "Target", x: 1, y: 0, level: 0, mtime: 100 });
    const src = randomUUID();
    await insertRow(db, "scratch_breakdowns", scratchBreakdownToRow({ ...baseEntities.scratchBreakdown, id: src, scratchBitId: scratch, content: "Idea", version: 3 }, user.id));
    return { inbox, scratch, target, src };
  });
}
type T = Awaited<ReturnType<typeof setup>>;

const stage = (db: Client, cand: string, t: T, version: number, src = t.src) => call(db, "stage_candidate", [cand, t.scratch, src, version, "bit"]);
const reconcileStage = (db: Client, cand: string, t: T, version: number, src = t.src) => call(db, "reconcile_stage_candidate", [cand, t.scratch, src, version, "bit"]);
const placeArgs = (t: T, result: string, sourceVersion: number) => [result, t.scratch, t.src, sourceVersion, "bit", "Idea", t.target, [t.target], 2, 3];
const rowsOf = (e: Envelope, table: "nodes" | "bits") => e.changes[table]?.upserted ?? [];

describe("conformance: ambiguous commands followed by a confirmed inverse", () => {
  it("an ambiguous Add, followed by a confirmed Delete, reconciles as conflict and never recreates the row", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const id = randomUUID();
      expect(await call(db, "add_breakdown", [id, t.scratch, 5, "New"])).toMatchObject({ status: "applied" });
      expect(await call(db, "delete_breakdown", [id, 1, t.scratch, 6])).toMatchObject({ status: "applied" });
      expect(await call(db, "reconcile_add_breakdown", [id, t.scratch, 5, "New"])).toMatchObject({ status: "conflict" });
      expect(await call(db, "add_breakdown", [id, t.scratch, 5, "New"])).toMatchObject({ status: "conflict" });
      expect(await row(db, "scratch_breakdowns", id)).toBeUndefined();
    });
  });

  it("an ambiguous Stage, followed by a confirmed Unstage, reconciles as conflict and never recreates the candidate", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const cand = randomUUID();
      expect(await stage(db, cand, t, 3)).toMatchObject({ status: "applied" });
      expect(await call(db, "unstage_candidate", [cand, 1, t.src, 4])).toMatchObject({ status: "applied" });
      expect(await reconcileStage(db, cand, t, 3)).toMatchObject({ status: "conflict" });
      expect(await stage(db, cand, t, 3)).toMatchObject({ status: "conflict" });
      expect(await row(db, "staged_candidates", cand)).toBeUndefined();
      expect(await row(db, "scratch_breakdowns", t.src)).toMatchObject({ version: 5, consumed_at: null });
    });
  });

  it("a candidate recreated by Undo at a version above 1 cannot satisfy the original Stage postcondition", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const cand = randomUUID();
      const result = randomUUID();
      await stage(db, cand, t, 3);
      const before = (await row(db, "staged_candidates", cand))!;
      const placed = await call(db, "place_staged_candidate", [...placeArgs(t, result, 4), cand, 1]);
      expect(placed).toMatchObject({ status: "applied" });
      const undone = await call(db, "undo_staged_placement", [rowsOf(placed, "bits")[0], placed.changes.scratch_breakdowns!.upserted[0], before]);
      expect(undone).toMatchObject({ status: "applied" });
      expect(await row(db, "staged_candidates", cand)).toMatchObject({ version: 2 });
      expect(await reconcileStage(db, cand, t, 3)).toMatchObject({ status: "conflict" });
      expect(await stage(db, cand, t, 3)).toMatchObject({ status: "conflict" });
      expect(await row(db, "staged_candidates", cand)).toMatchObject({ version: 2 });
    });
  });
});

describe("conformance: versions", () => {
  it("public update inputs cannot set or reset version, and every direct mutation increments exactly once", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const ids = await owner(async () => {
        const node = await addNode(db, user.id, { title: "N", x: 2, y: 0, level: 0, version: 4, mtime: 1 });
        const bit = await addBit(db, user.id, { parentId: node, title: "B", x: 0, y: 0, version: 4, mtime: 1 });
        const chunk = await addChunk(db, user.id, { parentId: bit, title: "C", order: 0 });
        return { node, bit, chunk };
      });
      for (const [fn, id] of [["update_node", ids.node], ["update_bit", ids.bit], ["update_chunk", ids.chunk]] as const) {
        await db.query("savepoint s");
        expect(await expectDbError(() => call(db, fn, [id, { version: 1 }]))).toBe("22023");
        await db.query("rollback to savepoint s");
      }
      expect(await call(db, "update_node", [ids.node, { title: "N2" }])).toMatchObject({ status: "applied" });
      expect(await row(db, "nodes", ids.node)).toMatchObject({ title: "N2", version: 5 });
      expect(await call(db, "update_bit", [ids.bit, { title: "B2" }])).toMatchObject({ status: "applied" });
      expect(await row(db, "bits", ids.bit)).toMatchObject({ title: "B2", version: 5 });
      await owner(async () => {
        await db.query("update app.bits set mtime = 1 where id = $1", [ids.bit]);
        await db.query("update app.nodes set mtime = 1 where id = $1", [ids.node]);
      });
      expect(await call(db, "update_chunk", [ids.chunk, { title: "C2" }])).toMatchObject({ status: "applied" });
      expect(await row(db, "chunks", ids.chunk)).toMatchObject({ title: "C2" });
      // A Chunk has no version; its write touched the Bit and the Node by mtime only, so their versions did not move.
      const bit = (await row(db, "bits", ids.bit))!;
      const node = (await row(db, "nodes", ids.node))!;
      expect(bit).toMatchObject({ version: 5 });
      expect(node).toMatchObject({ version: 5 });
      expect(Number(bit.mtime)).toBeGreaterThan(1);
      expect(Number(node.mtime)).toBeGreaterThan(1);
      // Breakdown rows and the Scratch: one increment per command.
      expect(await call(db, "save_breakdown", [t.src, 3, "Idea", 0, "Idea 2", 0])).toMatchObject({ status: "applied" });
      expect(await row(db, "scratch_breakdowns", t.src)).toMatchObject({ content: "Idea 2", version: 4 });
      expect(await call(db, "add_breakdown", [randomUUID(), t.scratch, 5, "More"])).toMatchObject({ status: "applied" });
      expect(await row(db, "bits", t.scratch)).toMatchObject({ version: 6 });
      expect(await call(db, "save_scratch_title", [t.scratch, 6, "Scratch", "Scratch 2"])).toMatchObject({ status: "applied" });
      expect(await row(db, "bits", t.scratch)).toMatchObject({ title: "Scratch 2", version: 7 });
    });
  });
});

describe("conformance: Archive reload", () => {
  it("reload reconciliation reads Scratch and postcondition state, with no operation table", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      await owner(() => db.query("update app.scratch_breakdowns set consumed_at = 200 where id = $1", [t.src]));
      const started = Date.now() - 1000;
      // The descriptor names only the Scratch, its expected version and the start time.
      expect(await call(db, "classify_archive_scratch_recovery", [t.scratch, 5, started])).toMatchObject({ status: "not_applied" });
      expect(await call(db, "archive_scratch", [t.scratch, 5])).toMatchObject({ status: "applied" });
      expect(await call(db, "classify_archive_scratch_recovery", [t.scratch, 5, started])).toMatchObject({ status: "applied" });
      // Another revision of the Scratch is neither state.
      await owner(() => db.query("update app.bits set version = 9 where id = $1", [t.scratch]));
      expect(await call(db, "classify_archive_scratch_recovery", [t.scratch, 5, started])).toMatchObject({ status: "conflict" });
      const { rows } = await db.query("select tablename from pg_tables where schemaname in ('app', 'public', 'internal') and (tablename ilike '%operation%' or tablename ilike '%journal%' or tablename ilike '%outbox%')");
      expect(rows).toEqual([]);
    });
  });
});

describe("conformance: Trash Scratch", () => {
  const items = (cand: string, src: string, cv = 1, sv = 4) => [{ candidate_id: cand, candidate_expected_version: cv, source_breakdown_id: src, source_expected_version: sv }];

  it("an ambiguous Trash, followed by a confirmed Trash restore, reconciles as conflict and never re-trashes", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const cand = randomUUID();
      await stage(db, cand, t, 3);
      const set = items(cand, t.src);
      expect(await call(db, "trash_scratch", [t.scratch, 5, JSON.stringify(set)])).toMatchObject({ status: "applied" });
      expect(await call(db, "restore_bit", [t.scratch])).toMatchObject({ status: "applied" });
      const restored = await snap(db);
      expect(await call(db, "reconcile_trash_scratch", [t.scratch, 5, JSON.stringify(set)])).toMatchObject({ status: "conflict" });
      expect(await call(db, "trash_scratch", [t.scratch, 5, JSON.stringify(set)])).toMatchObject({ status: "conflict" });
      expect(await snap(db)).toEqual(restored);
    });
  });

  it("a candidate staged after the confirmation makes Trash conflict and removes nothing", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const cand = randomUUID();
      await stage(db, cand, t, 3);
      const set = items(cand, t.src);
      const late = randomUUID();
      await owner(() => insertRow(db, "scratch_breakdowns", scratchBreakdownToRow({ ...baseEntities.scratchBreakdown, id: late, scratchBitId: t.scratch, content: "Late", order: 1, version: 2 }, user.id)));
      expect(await stage(db, randomUUID(), t, 2, late)).toMatchObject({ status: "applied" });
      const before = await snap(db);
      expect(await call(db, "trash_scratch", [t.scratch, 5, JSON.stringify(set)])).toMatchObject({ status: "conflict" });
      expect(await call(db, "reconcile_trash_scratch", [t.scratch, 5, JSON.stringify(set)])).toMatchObject({ status: "conflict" });
      expect(await snap(db)).toEqual(before);
      expect(await row(db, "staged_candidates", cand)).toBeDefined();
    });
  });
});

describe("conformance: Undo against a trashed or archived Scratch", () => {
  const undoOf = (staged: boolean, placed: Envelope, before?: Row) => {
    const result = rowsOf(placed, "bits")[0];
    const source = placed.changes.scratch_breakdowns!.upserted[0];
    return staged ? ["undo_staged_placement", [result, source, before]] as const : ["undo_direct_placement", [result, source]] as const;
  };

  it.each([
    ["staged", "Trash Scratch", true],
    ["direct", "Trash Scratch", false],
    ["staged", "Archive Scratch", true],
    ["direct", "Archive Scratch", false],
  ] as const)("a %s Undo whose owning Scratch was archived or trashed (%s) is rejected with no write", async (_kind, how, staged) => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const result = randomUUID();
      let before: Row | undefined;
      let placed: Envelope;
      if (staged) {
        const cand = randomUUID();
        await stage(db, cand, t, 3);
        before = (await row(db, "staged_candidates", cand))!;
        placed = await call(db, "place_staged_candidate", [...placeArgs(t, result, 4), cand, 1]);
      } else {
        placed = await call(db, "place_direct_breakdown", placeArgs(t, result, 3));
      }
      expect(placed.status).toBe("applied");
      const [fn, args] = undoOf(staged, placed, before);
      const version = (await row(db, "bits", t.scratch))!.version as number;
      const closed = how === "Trash Scratch"
        ? await call(db, "trash_scratch", [t.scratch, version, JSON.stringify([])])
        : await call(db, "archive_scratch", [t.scratch, version]);
      expect(closed.status).toBe("applied");
      const after = await snap(db);
      expect(await call(db, fn, [...args])).toMatchObject({ status: "rejected", rejection: { code: "invalid_target" } });
      expect(await call(db, `reconcile_${fn}`, [...args])).toMatchObject({ status: "rejected" });
      expect(await snap(db)).toEqual(after);
      expect(await row(db, "bits", result)).toBeDefined();
    });
  });
});

describe("conformance: database constraints and the function catalog", () => {
  it("deleting a Breakdown row that has a staged candidate is refused by the foreign key", async () => {
    await withActor(A(), async (db, owner) => {
      const t = await setup(db, owner);
      const cand = randomUUID();
      await stage(db, cand, t, 3);
      await owner(async () => {
        await db.query("savepoint fk");
        expect(await expectDbError(() => db.query("delete from app.scratch_breakdowns where id = $1", [t.src]))).toBe("23503");
        await db.query("rollback to savepoint fk");
      });
      expect(await row(db, "scratch_breakdowns", t.src)).toBeDefined();
      expect(await row(db, "staged_candidates", cand)).toBeDefined();
    });
  });

  it("every Inbox command function and its reconcile exists with a cross-account case, and each write function a change-set case", async () => {
    const commands = [
      "add_breakdown", "save_scratch_title", "save_breakdown", "delete_breakdown", "stage_candidate", "unstage_candidate",
      "place_staged_candidate", "place_direct_breakdown", "undo_staged_placement", "undo_direct_placement", "archive_scratch", "trash_scratch",
    ];
    const reconciles = [
      "reconcile_add_breakdown", "reconcile_save_scratch_title", "reconcile_save_breakdown", "reconcile_delete_breakdown",
      "reconcile_stage_candidate", "reconcile_unstage_candidate", "reconcile_place_staged_candidate", "reconcile_place_direct_breakdown",
      "reconcile_undo_staged_placement", "reconcile_undo_direct_placement", "classify_archive_scratch_recovery", "reconcile_trash_scratch",
    ];
    const db = await connect();
    try {
      const { rows } = await db.query("select p.proname, p.prosecdef from pg_proc p where p.pronamespace = 'public'::regnamespace");
      const found = new Map(rows.map((r) => [r.proname as string, r.prosecdef as boolean]));
      for (const name of [...commands, ...reconciles]) {
        expect(found.has(name), `${name} exists`).toBe(true);
        expect(FUNCTION_CASES[name]?.crossAccount, `${name} cross-account case`).toBeDefined();
        expect(FUNCTION_CASES[name]?.changeSet, `${name} change-set case`).toBeDefined();
      }
      for (const name of commands) expect(found.get(name), `${name} is security definer`).toBe(true);
      for (const name of reconciles) expect(found.get(name), `${name} is security invoker`).toBe(false);
    } finally {
      await db.end();
    }
  });
});
