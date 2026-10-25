import { randomUUID } from "node:crypto";
import type { Client } from "pg";
import { beforeAll, describe, expect, it } from "vitest";
import { baseEntities } from "@/lib/db/boundary-cases";
import { scratchBreakdownToRow, stagedCandidateToRow } from "@/lib/db/row-mapping";
import { expectDbError, insertRow, withActor } from "./helpers/db";
import { account, addBit, addNode, authed, call, committed, openSession, race, sql, type Envelope, type Row } from "./helpers/lifecycle";
import { createTestUser, type TestUser } from "./helpers/users";

// Placement and Undo under concurrency (S30), atomicity and account limits (Task 223).

let user: TestUser;

beforeAll(async () => {
  user = await createTestUser("plcx");
});

type Place = {
  result: string; scratch: string; source: string; sourceVersion: number; type: string; title: string;
  target: string | null; path: string[]; x: number; y: number; cand: string; candVersion: number;
};
const placeArgs = (p: Place) => [p.result, p.scratch, p.source, p.sourceVersion, p.type, p.title, p.target, p.path, p.x, p.y];
const placeStaged = (db: Client, p: Place) => call(db, "place_staged_candidate", [...placeArgs(p), p.cand, p.candVersion]);
const placeDirect = (db: Client, p: Place) => call(db, "place_direct_breakdown", placeArgs(p));
const statuses = (a: Envelope, b: Envelope) => [a.status, b.status];
const rowOf = async (owner: Client, table: string, id: string) =>
  (await owner.query(`select to_jsonb(r.*) as r from app.${table} r where id = $1`, [id])).rows[0]?.r as Row | undefined;
const countWhere = async (owner: Client, table: string, where: string, params: unknown[]) =>
  Number((await owner.query(`select count(*) as n from app.${table} where ${where}`, params)).rows[0].n);

// A committed Inbox, a Scratch (version 5), a Target Node with a child Mid, and one source (version 3)
// staged with a candidate (version 2) unless `staged` is false.
async function fresh(label: string, staged = true, type = "bit") {
  const c = await committed(label);
  const inbox = await c.node({ systemRole: "inbox", x: 8, y: 8 });
  const scratch = await c.bit({ parentId: inbox, title: "Scratch", x: 0, y: 0, version: 5 });
  const target = await c.node({ title: "Target", x: 1, y: 0, level: 0, mtime: 100 });
  const mid = await c.node({ title: "Mid", parentId: target, level: 1, x: 1, y: 1 });
  const src = randomUUID();
  const cand = randomUUID();
  await insertRow(c.owner, "scratch_breakdowns", scratchBreakdownToRow({ ...baseEntities.scratchBreakdown, id: src, scratchBitId: scratch, content: "Idea", version: 3 }, c.u.id));
  if (staged) {
    await insertRow(c.owner, "staged_candidates", stagedCandidateToRow({ ...baseEntities.stagedCandidate, id: cand, scratchBitId: scratch, sourceBreakdownId: src, resultType: type as "node" | "bit", version: 2 }, c.u.id));
  }
  const place: Place = { result: randomUUID(), scratch, source: src, sourceVersion: 3, type, title: "Idea", target, path: [target], x: 2, y: 3, cand, candVersion: 2 };
  return { ...c, inbox, scratch, target, mid, src, cand, place };
}

describe("concurrency (placement)", () => {
  it("two placements of one source: the second sees the consumed source and is rejected", async () => {
    const t = await fresh("plcx-same-src");
    try {
      const other = { ...t.place, result: randomUUID(), x: 4, y: 4 };
      const [first, second] = await race(t.u, (db) => placeStaged(db, t.place), (db) => placeStaged(db, other), "place_staged_candidate");
      expect(statuses(first, second)).toEqual(["applied", "rejected"]);
      expect(second.rejection?.code).toBe("invalid_target");
      expect(await rowOf(t.owner, "scratch_breakdowns", t.src)).toMatchObject({ version: 4 });
      expect(await countWhere(t.owner, "bits", "parent_id = $1", [t.target])).toBe(1);
    } finally {
      await t.owner.end();
    }
  }, 30_000);

  it("the same placement twice: the second is already_applied", async () => {
    const t = await fresh("plcx-twice");
    try {
      const [first, second] = await race(t.u, (db) => placeStaged(db, t.place), (db) => placeStaged(db, t.place), "place_staged_candidate");
      expect(statuses(first, second)).toEqual(["applied", "already_applied"]);
      expect(await countWhere(t.owner, "bits", "parent_id = $1", [t.target])).toBe(1);
    } finally {
      await t.owner.end();
    }
  }, 30_000);

  it("two placements of different sources into one cell: one applied, the other cell_taken", async () => {
    const t = await fresh("plcx-cell", false);
    try {
      const src2 = randomUUID();
      await insertRow(t.owner, "scratch_breakdowns", scratchBreakdownToRow({ ...baseEntities.scratchBreakdown, id: src2, scratchBitId: t.scratch, content: "Idea", order: 1, version: 3 }, t.u.id));
      const second = { ...t.place, source: src2, result: randomUUID() };
      const [a, b] = await race(t.u, (db) => placeDirect(db, t.place), (db) => placeDirect(db, second), "place_direct_breakdown");
      expect(statuses(a, b)).toEqual(["applied", "rejected"]);
      expect(b.rejection?.code).toBe("cell_taken");
      expect(await countWhere(t.owner, "bits", "parent_id = $1 and x = 2 and y = 3", [t.target])).toBe(1);
    } finally {
      await t.owner.end();
    }
  }, 30_000);

  it("a placement and a create_bit into the same cell: one wins, the other is cell_taken", async () => {
    const t = await fresh("plcx-createbit", false);
    try {
      const create = (db: Client) => call(db, "create_bit", [randomUUID(), { title: "B", icon: "ListTodo", parent_id: t.target, x: 2, y: 3 }]);
      const [a, b] = await race(t.u, (db) => placeDirect(db, t.place), create, "create_bit");
      expect(a.status).toBe("applied");
      expect(b).toMatchObject({ status: "rejected", rejection: { code: "cell_taken" } });
      expect(await countWhere(t.owner, "bits", "parent_id = $1 and x = 2 and y = 3", [t.target])).toBe(1);
    } finally {
      await t.owner.end();
    }
  }, 30_000);

  it("a placement and the trash of its target: whichever is second sees the other", async () => {
    const t = await fresh("plcx-trash-first", false);
    try {
      // Trash first: the placement then finds the target deleted.
      const [a, b] = await race(t.u, (db) => call(db, "soft_delete_node", [t.target]), (db) => placeDirect(db, t.place), "place_direct_breakdown");
      expect(a.status).toBe("applied");
      expect(b).toMatchObject({ status: "rejected", rejection: { code: "invalid_target" } });
      expect(await rowOf(t.owner, "scratch_breakdowns", t.src)).toMatchObject({ version: 3, consumed_at: null });
      expect(await countWhere(t.owner, "bits", "parent_id = $1", [t.target])).toBe(0);
    } finally {
      await t.owner.end();
    }
    const u = await fresh("plcx-place-first", false);
    try {
      // Placement first: the trash then waits and cascades to the new Bit.
      const [a, b] = await race(u.u, (db) => placeDirect(db, u.place), (db) => call(db, "soft_delete_node", [u.target]), "soft_delete_node");
      expect(statuses(a, b)).toEqual(["applied", "applied"]);
      expect(await rowOf(u.owner, "bits", u.place.result)).toMatchObject({ deleted_at: expect.any(Number) });
    } finally {
      await u.owner.end();
    }
  }, 60_000);

  it("a placement and a move of an ancestor of the target: the path check sees the move", async () => {
    const t = await fresh("plcx-move", false);
    try {
      const into = { ...t.place, target: t.mid, path: [t.target, t.mid] };
      const other = await t.node({ title: "Other", x: 5, y: 5, level: 0 });
      const move = (db: Client) => call(db, "update_node", [t.target, { parent_id: other, x: 0, y: 0 }]);
      const [a, b] = await race(t.u, move, (db) => placeDirect(db, into), "place_direct_breakdown");
      expect(a.status).toBe("applied");
      expect(b).toMatchObject({ status: "rejected", rejection: { code: "invalid_target" } });
      expect(await rowOf(t.owner, "scratch_breakdowns", t.src)).toMatchObject({ version: 3 });
    } finally {
      await t.owner.end();
    }
  }, 30_000);

  // [label, the call, its function, what it does when it runs first (applied, or rejected while the candidate exists)]
  const sourceRaces: [string, (t: Awaited<ReturnType<typeof fresh>>) => (db: Client) => Promise<Envelope>, string, string][] = [
    ["Unstage", (t) => (db) => call(db, "unstage_candidate", [t.cand, 2, t.src, 3]), "unstage_candidate", "applied"],
    ["Delete Breakdown", (t) => (db) => call(db, "delete_breakdown", [t.src, 3, t.scratch, 5]), "delete_breakdown", "rejected"],
    ["Save Breakdown", (t) => (db) => call(db, "save_breakdown", [t.src, 3, "Idea", 0, "Better", 0]), "save_breakdown", "rejected"],
  ];
  it.each(sourceRaces)("a staged placement and %s on the same source, in both orders", async (_l, other, name, whenFirst) => {
    const t = await fresh(`plcx-${name}-1`);
    try {
      const [first, second] = await race(t.u, (db) => placeStaged(db, t.place), other(t), name);
      expect(first.status).toBe("applied");
      expect(["rejected", "conflict"]).toContain(second.status);
      expect(await rowOf(t.owner, "scratch_breakdowns", t.src)).toMatchObject({ version: 4, consumed_at: expect.any(Number) });
      expect(await rowOf(t.owner, "staged_candidates", t.cand)).toBeUndefined();
    } finally {
      await t.owner.end();
    }
    const u = await fresh(`plcx-${name}-2`);
    try {
      const [first, second] = await race(u.u, other(u), (db) => placeStaged(db, u.place), "place_staged_candidate");
      expect(first.status).toBe(whenFirst);
      if (whenFirst === "applied") {
        // Unstage first: the candidate is gone, the placement is a conflict and writes nothing.
        expect(second.status).toBe("conflict");
        expect(await countWhere(u.owner, "bits", "id = $1", [u.place.result])).toBe(0);
        expect(await rowOf(u.owner, "scratch_breakdowns", u.src)).toMatchObject({ consumed_at: null });
      } else {
        // Delete or Save refused (the candidate exists) and wrote nothing: the placement then applies.
        expect(second.status).toBe("applied");
        expect(await countWhere(u.owner, "bits", "id = $1", [u.place.result])).toBe(1);
      }
    } finally {
      await u.owner.end();
    }
  }, 60_000);

  it("a Stage and a placement of one source: the placement's candidate check sees the Stage", async () => {
    const t = await fresh("plcx-stage-first", false);
    try {
      const stage = (db: Client) => call(db, "stage_candidate", [t.cand, t.scratch, t.src, 3, "bit"]);
      const [first, second] = await race(t.u, stage, (db) => placeDirect(db, t.place), "place_direct_breakdown");
      expect(first.status).toBe("applied");
      expect(second.status).toBe("conflict");
      expect(await countWhere(t.owner, "bits", "id = $1", [t.place.result])).toBe(0);
    } finally {
      await t.owner.end();
    }
  }, 30_000);

  it("two Undos of one placement: the second waits and is already_applied", async () => {
    const t = await fresh("plcx-undo");
    try {
      const before = await rowOf(t.owner, "staged_candidates", t.cand);
      const placed = await (async () => {
        const db = await openSession(t.u);
        try {
          const e = await placeStaged(db, t.place);
          await db.query("commit");
          return e;
        } finally {
          await db.end();
        }
      })();
      const result = placed.changes.bits!.upserted.find((r) => r.id === t.place.result)!;
      const source = placed.changes.scratch_breakdowns!.upserted[0];
      const [first, second] = await race(
        t.u,
        (db) => call(db, "undo_staged_placement", [result, source, before]),
        (db) => call(db, "undo_staged_placement", [result, source, before]),
        "undo_staged_placement",
      );
      expect(statuses(first, second)).toEqual(["applied", "already_applied"]);
      expect(await rowOf(t.owner, "staged_candidates", t.cand)).toMatchObject({ version: 3 });
    } finally {
      await t.owner.end();
    }
  }, 30_000);

  it("a retried placement and the Undo of the same placement, in both orders", async () => {
    for (const undoFirst of [true, false]) {
      const t = await fresh(`plcx-retry-${undoFirst}`);
      try {
        const before = await rowOf(t.owner, "staged_candidates", t.cand);
        const db0 = await openSession(t.u);
        const placed = await placeStaged(db0, t.place).finally(async () => { await db0.query("commit"); await db0.end(); });
        const result = placed.changes.bits!.upserted.find((r) => r.id === t.place.result)!;
        const source = placed.changes.scratch_breakdowns!.upserted[0];
        const undo = (db: Client) => call(db, "undo_staged_placement", [result, source, before]);
        const retry = (db: Client) => placeStaged(db, t.place);
        const [a, b] = undoFirst ? await race(t.u, undo, retry, "place_staged_candidate") : await race(t.u, retry, undo, "undo_staged_placement");
        expect(statuses(a, b)).toEqual(undoFirst ? ["applied", "conflict"] : ["already_applied", "applied"]);
        expect(await countWhere(t.owner, "bits", "id = $1", [t.place.result])).toBe(0);
        expect(await rowOf(t.owner, "scratch_breakdowns", t.src)).toMatchObject({ version: 5, consumed_at: null });
      } finally {
        await t.owner.end();
      }
    }
  }, 60_000);

  const childCreates: [string, string, (t: { result: string }) => [string, unknown[]]][] = [
    ["a Node", "node", (t) => ["create_node", [randomUUID(), { title: "C", color: "hsl(10, 50%, 50%)", icon: "folder", parent_id: t.result, x: 0, y: 0 }]]],
    ["a Bit", "node", (t) => ["create_bit", [randomUUID(), { title: "C", icon: "ListTodo", parent_id: t.result, x: 0, y: 0 }]]],
    ["a Chunk", "bit", (t) => ["create_chunk", [randomUUID(), { title: "C", parent_id: t.result, order: 0 }]]],
  ];
  it.each(childCreates)("an Undo and a child create (%s) into the result, in both orders", async (_l, type, make) => {
    for (const undoFirst of [true, false]) {
      const t = await fresh(`plcx-kid-${_l.slice(2)}-${undoFirst}`, false, type);
      try {
        await sql(t.owner, "update app.scratch_breakdowns set content = 'Placed' where id = $1", [t.src]);
        const place: Place = { ...t.place, type, title: "Placed", target: type === "node" ? null : t.target, path: type === "node" ? [] : [t.target] };
        const db0 = await openSession(t.u);
        const placed = await placeDirect(db0, place).finally(async () => { await db0.query("commit"); await db0.end(); });
        const rows = [...(placed.changes.nodes?.upserted ?? []), ...(placed.changes.bits?.upserted ?? [])];
        const result = rows.find((r) => r.id === place.result)!;
        const source = placed.changes.scratch_breakdowns!.upserted[0];
        const [fn, args] = make({ result: place.result });
        const undo = (db: Client) => call(db, "undo_direct_placement", [result, source]);
        const create = (db: Client) => call(db, fn, args);
        const [a, b] = undoFirst ? await race(t.u, undo, create, fn) : await race(t.u, create, undo, "undo_direct_placement");
        if (undoFirst) {
          // Undo first: the result is gone, the create then finds no parent.
          expect(a.status).toBe("applied");
          expect(b.status).toBe("rejected");
          expect(await countWhere(t.owner, type === "node" ? "nodes" : "bits", "id = $1", [place.result])).toBe(0);
        } else {
          // Create first: the Undo sees a child (or a changed result) and is a conflict, nothing deleted.
          expect(a.status).toBe("applied");
          expect(b.status).toBe("conflict");
          expect(await countWhere(t.owner, type === "node" ? "nodes" : "bits", "id = $1", [place.result])).toBe(1);
          expect(await rowOf(t.owner, "scratch_breakdowns", t.src)).toMatchObject({ version: 4 });
        }
      } finally {
        await t.owner.end();
      }
    }
  }, 90_000);

  it("a Home Node placement takes the L0 lock: two Home placements into one cell, one wins", async () => {
    const t = await fresh("plcx-home", false, "node");
    try {
      const src2 = randomUUID();
      await insertRow(t.owner, "scratch_breakdowns", scratchBreakdownToRow({ ...baseEntities.scratchBreakdown, id: src2, scratchBitId: t.scratch, content: "Idea", order: 1, version: 3 }, t.u.id));
      const home: Place = { ...t.place, type: "node", target: null, path: [], x: 7, y: 7 };
      const second = { ...home, source: src2, result: randomUUID() };
      const [a, b] = await race(t.u, (db) => placeDirect(db, home), (db) => placeDirect(db, second), "place_direct_breakdown");
      expect(statuses(a, b)).toEqual(["applied", "rejected"]);
      expect(b.rejection?.code).toBe("cell_taken");
    } finally {
      await t.owner.end();
    }
  }, 30_000);
});

describe("atomicity (placement and Undo)", () => {
  const refuse = (db: Client, table: string) =>
    db.query(`create function app.refuse_update() returns trigger language plpgsql as $f$ begin raise exception 'refused' using errcode = 'P0001'; end $f$`)
      .then(() => db.query(`create trigger refuse_it before update on app.${table} for each row execute function app.refuse_update()`));

  async function seeded(db: Client, owner: <R>(run: () => Promise<R>) => Promise<R>, staged: boolean) {
    return owner(async () => {
      await account(db, user.id);
      const inbox = await addNode(db, user.id, { systemRole: "inbox", x: 8, y: 8 });
      const scratch = await addBit(db, user.id, { parentId: inbox, title: "Scratch", x: 0, y: 0, version: 5 });
      const target = await addNode(db, user.id, { title: "Target", x: 1, y: 0, level: 0, mtime: 100 });
      const src = randomUUID();
      const cand = randomUUID();
      await insertRow(db, "scratch_breakdowns", scratchBreakdownToRow({ ...baseEntities.scratchBreakdown, id: src, scratchBitId: scratch, content: "Idea", version: 3 }, user.id));
      if (staged) await insertRow(db, "staged_candidates", stagedCandidateToRow({ ...baseEntities.stagedCandidate, id: cand, scratchBitId: scratch, sourceBreakdownId: src, resultType: "bit", version: 2 }, user.id));
      const place: Place = { result: randomUUID(), scratch, source: src, sourceVersion: 3, type: "bit", title: "Idea", target, path: [target], x: 2, y: 3, cand, candVersion: 2 };
      return { target, src, cand, place };
    });
  }
  const snap = async (db: Client) => (await db.query(
    `select (select json_agg(n order by id) from app.nodes n) n, (select json_agg(b order by id) from app.bits b) b,
            (select json_agg(s order by id) from app.scratch_breakdowns s) s, (select json_agg(c order by id) from app.staged_candidates c) c`)).rows[0];

  it.each([
    ["the source write (after the result and the target mtime)", "scratch_breakdowns", true],
    ["the target Node mtime write (after the result)", "nodes", true],
    ["the source write of a direct placement", "scratch_breakdowns", false],
  ] as const)("a placement rolls everything back when %s fails", async (_l, table, staged) => {
    await withActor(authed(user), async (db, owner) => {
      const t = await seeded(db, owner, staged);
      await owner(() => refuse(db, table));
      const before = await snap(db);
      await db.query("savepoint s");
      expect(await expectDbError(() => (staged ? placeStaged(db, t.place) : placeDirect(db, t.place)))).toBe("P0001");
      await db.query("rollback to savepoint s");
      expect(await snap(db)).toEqual(before);
    });
  });

  it.each([
    ["the parent mtime write (after the result delete)", "nodes", true],
    ["the source write (after the result delete and the parent mtime)", "scratch_breakdowns", true],
    ["the source write of a direct Undo", "scratch_breakdowns", false],
  ] as const)("an Undo rolls everything back when %s fails", async (_l, table, staged) => {
    await withActor(authed(user), async (db, owner) => {
      const t = await seeded(db, owner, staged);
      const before = staged ? (await db.query("select to_jsonb(c) as r from app.staged_candidates c where id = $1", [t.cand])).rows[0].r : undefined;
      const placed = staged ? await placeStaged(db, t.place) : await placeDirect(db, t.place);
      const result = placed.changes.bits!.upserted.find((r) => r.id === t.place.result)!;
      const source = placed.changes.scratch_breakdowns!.upserted[0];
      await owner(() => refuse(db, table));
      const snapshot = await snap(db);
      await db.query("savepoint s");
      const run = () => (staged ? call(db, "undo_staged_placement", [result, source, before]) : call(db, "undo_direct_placement", [result, source]));
      expect(await expectDbError(run)).toBe("P0001");
      await db.query("rollback to savepoint s");
      expect(await snap(db)).toEqual(snapshot);
    });
  });
});

describe("account limits (placement)", () => {
  const GUEST = () => JSON.stringify({ role: "authenticated", sub: user.id, is_anonymous: true });

  it.each([
    ["bit", "bits", 300, 299, true, false],
    ["bit", "bits", 300, 300, false, false],
    ["node", "nodes", 100, 99, true, false],
    ["node", "nodes", 100, 100, false, false],
    ["bit", "bits", 300, 300, false, true],
    ["node", "nodes", 100, 99, true, true],
  ] as const)("a guest %s placement: %s table, limit %d, %d rows now, applied=%s, direct=%s", async (type, table, limit, rows, ok, direct) => {
    await withActor(authed(user), async (db, owner) => {
      await owner(async () => {
        await account(db, user.id);
      });
      const inbox = await owner(() => addNode(db, user.id, { systemRole: "inbox", x: 8, y: 8 }));
      const scratch = await owner(() => addBit(db, user.id, { parentId: inbox, title: "Scratch", x: 0, y: 0, version: 5 }));
      const target = await owner(() => addNode(db, user.id, { title: "Target", x: 1, y: 0, level: 0 }));
      const src = randomUUID();
      const cand = randomUUID();
      await owner(async () => {
        await insertRow(db, "scratch_breakdowns", scratchBreakdownToRow({ ...baseEntities.scratchBreakdown, id: src, scratchBitId: scratch, content: "Idea", version: 3 }, user.id));
        if (!direct) await insertRow(db, "staged_candidates", stagedCandidateToRow({ ...baseEntities.stagedCandidate, id: cand, scratchBitId: scratch, sourceBreakdownId: src, resultType: type, version: 2 }, user.id));
        // Fill to `rows` in total: the Inbox, Scratch and Target already count.
        const have = table === "nodes" ? 2 : 1;
        if (table === "nodes") await sql(db, `insert into app.nodes (id, user_id, title, color, icon, mtime, created_at, level, x, y, deleted_at)
          select gen_random_uuid(), $1, 'f', 'hsl(1, 1%, 1%)', 'i', 1, 1, 0, 0, 0, 5 from generate_series(1, $2::int) g`, [user.id, rows - have]);
        else await sql(db, `insert into app.bits (id, user_id, title, description, icon, mtime, created_at, version, parent_id, x, y, past_deadline_dismissed, deleted_at, status)
          select gen_random_uuid(), $1, 'f', '', 'i', 1, 1, 1, $3, 0, 0, false, 5, 'active' from generate_series(1, $2::int) g`, [user.id, rows - have, target]);
      });
      await sql(db, "select set_config('request.jwt.claims', $1, true)", [GUEST()]);
      const place: Place = { result: randomUUID(), scratch, source: src, sourceVersion: 3, type, title: "Idea", target: type === "node" ? null : target, path: type === "node" ? [] : [target], x: 2, y: 3, cand, candVersion: 2 };
      const envelope = direct ? await placeDirect(db, place) : await placeStaged(db, place);
      if (ok) expect(envelope.status).toBe("applied");
      else {
        expect(envelope).toMatchObject({ status: "rejected", rejection: { code: "account_limit", table, limit } });
        expect((await db.query("select version, consumed_at from app.scratch_breakdowns where id = $1", [src])).rows[0]).toMatchObject({ version: 3, consumed_at: null });
        if (!direct) expect((await db.query("select count(*) n from app.staged_candidates where id = $1", [cand])).rows[0].n).toBe("1");
      }
    });
  }, 60_000);
});
