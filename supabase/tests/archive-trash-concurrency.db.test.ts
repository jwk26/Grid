import { randomUUID } from "node:crypto";
import type { Client } from "pg";
import { describe, expect, it } from "vitest";
import { baseEntities } from "@/lib/db/boundary-cases";
import { scratchBreakdownToRow, stagedCandidateToRow } from "@/lib/db/row-mapping";
import { insertRow } from "./helpers/db";
import { call, committed, openSession, race, type Envelope, type Row } from "./helpers/lifecycle";

// Archive Scratch and Trash Scratch under concurrency (S30, Task 224): two sessions on committed
// data, the first holding its locks uncommitted while the second waits and then sees the result.

type Kind = "none" | "plain" | "staged";
type Fixture = Awaited<ReturnType<typeof fresh>>;

// A committed Inbox, a Scratch (version 5) with one consumed row `r1`, a target Node, and by `kind`
// a second row `r2` (version 3): `none` has no r2, `plain` an unconsumed r2, `staged` an unconsumed
// r2 with a candidate (version 2).
async function fresh(label: string, kind: Kind) {
  const c = await committed(label);
  const inbox = await c.node({ systemRole: "inbox", x: 8, y: 8 });
  const scratch = await c.bit({ parentId: inbox, title: "Scratch", x: 0, y: 0, version: 5 });
  const target = await c.node({ title: "Target", x: 1, y: 0, level: 0, mtime: 100 });
  const r1 = randomUUID();
  const r2 = randomUUID();
  const cand = randomUUID();
  await insertRow(c.owner, "scratch_breakdowns", scratchBreakdownToRow({ ...baseEntities.scratchBreakdown, id: r1, scratchBitId: scratch, content: "Done", consumedAt: 200, version: 2 }, c.u.id));
  if (kind !== "none") {
    await insertRow(c.owner, "scratch_breakdowns", scratchBreakdownToRow({ ...baseEntities.scratchBreakdown, id: r2, scratchBitId: scratch, content: "Idea", order: 1, version: 3 }, c.u.id));
  }
  if (kind === "staged") {
    await insertRow(c.owner, "staged_candidates", stagedCandidateToRow({ ...baseEntities.stagedCandidate, id: cand, scratchBitId: scratch, sourceBreakdownId: r2, resultType: "bit", version: 2 }, c.u.id));
  }
  return { ...c, inbox, scratch, target, r1, r2, cand, result: randomUUID() };
}

const archive = (t: Fixture) => (db: Client) => call(db, "archive_scratch", [t.scratch, 5]);
const trash = (t: Fixture, items: unknown[] = []) => (db: Client) => call(db, "trash_scratch", [t.scratch, 5, JSON.stringify(items)]);
const stagedItems = (t: Fixture) => [{ candidate_id: t.cand, candidate_expected_version: 2, source_breakdown_id: t.r2, source_expected_version: 3 }];
const placeArgs = (t: Fixture) => [t.result, t.scratch, t.r2, 3, "bit", "Idea", t.target, [t.target], 2, 3];
const placeDirect = (t: Fixture) => (db: Client) => call(db, "place_direct_breakdown", placeArgs(t));
const placeStaged = (t: Fixture) => (db: Client) => call(db, "place_staged_candidate", [...placeArgs(t), t.cand, 2]);
const stage = (t: Fixture) => (db: Client) => call(db, "stage_candidate", [randomUUID(), t.scratch, t.r2, 3, "bit"]);
const unstage = (t: Fixture) => (db: Client) => call(db, "unstage_candidate", [t.cand, 2, t.r2, 3]);
const del = (t: Fixture) => (db: Client) => call(db, "delete_breakdown", [t.r2, 3, t.scratch, 5]);
const add = (t: Fixture) => (db: Client) => call(db, "add_breakdown", [randomUUID(), t.scratch, 5, "Late"]);

// Places r2 in its own committed session and returns the Undo call for it.
async function placed(t: Fixture, staged: boolean) {
  const before = staged
    ? (await t.owner.query("select to_jsonb(r.*) as r from app.staged_candidates r where id = $1", [t.cand])).rows[0].r as Row
    : undefined;
  const db = await openSession(t.u);
  try {
    const envelope = await (staged ? placeStaged(t) : placeDirect(t))(db);
    expect(envelope.status).toBe("applied");
    await db.query("commit");
    const result = envelope.changes.bits!.upserted.find((r) => r.id === t.result)!;
    const source = envelope.changes.scratch_breakdowns!.upserted[0];
    return (d: Client) => staged ? call(d, "undo_staged_placement", [result, source, before]) : call(d, "undo_direct_placement", [result, source]);
  } finally {
    await db.end();
  }
}

const rowOf = async (t: Fixture, table: string, id: string) =>
  (await t.owner.query(`select to_jsonb(r.*) as r from app.${table} r where id = $1`, [id])).rows[0]?.r as Row | undefined;
const scratchOf = (t: Fixture) => rowOf(t, "bits", t.scratch);

// Runs both orders on fresh data: `first` holding its locks while `second` waits, and the reverse.
type Scenario = {
  name: string;
  kind: Kind;
  a: [string, (t: Fixture) => (db: Client) => Promise<Envelope>];
  b: [string, (t: Fixture) => (db: Client) => Promise<Envelope>];
  aThenB: [string, string];
  bThenA: [string, string];
};

const SCENARIOS: Scenario[] = [
  { name: "Archive ∥ Stage", kind: "plain", a: ["archive_scratch", archive], b: ["stage_candidate", stage],
    aThenB: ["rejected", "applied"], bThenA: ["applied", "rejected"] },
  { name: "Archive ∥ Unstage", kind: "staged", a: ["archive_scratch", archive], b: ["unstage_candidate", unstage],
    aThenB: ["rejected", "applied"], bThenA: ["applied", "rejected"] },
  { name: "Archive ∥ Delete", kind: "plain", a: ["archive_scratch", archive], b: ["delete_breakdown", del],
    aThenB: ["rejected", "applied"], bThenA: ["applied", "conflict"] },
  { name: "Archive ∥ Add", kind: "none", a: ["archive_scratch", archive], b: ["add_breakdown", add],
    aThenB: ["applied", "rejected"], bThenA: ["applied", "conflict"] },
  { name: "Archive ∥ Place", kind: "plain", a: ["archive_scratch", archive], b: ["place_direct_breakdown", placeDirect],
    aThenB: ["rejected", "applied"], bThenA: ["applied", "applied"] },
  { name: "Archive ∥ Trash", kind: "none", a: ["archive_scratch", archive], b: ["trash_scratch", (t) => trash(t)],
    aThenB: ["applied", "conflict"], bThenA: ["applied", "rejected"] },
  { name: "Trash ∥ Stage", kind: "plain", a: ["trash_scratch", (t) => trash(t)], b: ["stage_candidate", stage],
    aThenB: ["applied", "rejected"], bThenA: ["applied", "conflict"] },
  { name: "Trash ∥ Unstage", kind: "staged", a: ["trash_scratch", (t) => trash(t, stagedItems(t))], b: ["unstage_candidate", unstage],
    aThenB: ["applied", "already_applied"], bThenA: ["applied", "conflict"] },
  { name: "Trash ∥ Place", kind: "staged", a: ["trash_scratch", (t) => trash(t, stagedItems(t))], b: ["place_staged_candidate", placeStaged],
    aThenB: ["applied", "rejected"], bThenA: ["applied", "conflict"] },
  { name: "Add ∥ Trash", kind: "none", a: ["add_breakdown", add], b: ["trash_scratch", (t) => trash(t)],
    aThenB: ["applied", "conflict"], bThenA: ["applied", "rejected"] },
];

describe("concurrency (Archive and Trash Scratch)", () => {
  for (const s of SCENARIOS) {
    it(`${s.name}: the second command sees the first, in both orders`, async () => {
      for (const order of ["ab", "ba"] as const) {
        const t = await fresh(`atc-${order}`, s.kind);
        try {
          const [first, second] = order === "ab" ? [s.a, s.b] : [s.b, s.a];
          const [x, y] = await race(t.u, first[1](t), second[1](t), second[0]);
          const want = order === "ab" ? s.aThenB : s.bThenA;
          expect([x.status, y.status], `${s.name} ${order}`).toEqual(want);
          const scratch = (await scratchOf(t))!;
          // Never both a trashed and an archived Scratch.
          expect(scratch.deleted_at !== null && scratch.archived_at !== null).toBe(false);
        } finally {
          await t.owner.end();
        }
      }
    }, 60_000);
  }

  for (const [label, staged] of [["Archive ∥ Undo", false], ["Trash ∥ Undo", true]] as const) {
    it(`${label}: the second command sees the first, in both orders`, async () => {
      for (const order of ["first", "undo-first"] as const) {
        const t = await fresh(`atu-${order}`, "plain");
        try {
          if (staged) {
            await t.owner.query("insert into app.staged_candidates (id, user_id, scratch_bit_id, source_breakdown_id, result_type, lifecycle, created_at, updated_at, version) values ($1, $2, $3, $4, 'bit', 'staged', 1, 1, 2)", [t.cand, t.u.id, t.scratch, t.r2]);
          }
          const undo = await placed(t, staged);
          const version = Number((await scratchOf(t))!.version);
          const close = label.startsWith("Archive")
            ? (db: Client) => call(db, "archive_scratch", [t.scratch, version])
            : (db: Client) => call(db, "trash_scratch", [t.scratch, version, "[]"]);
          const name = label.startsWith("Archive") ? "archive_scratch" : "trash_scratch";
          const undoName = staged ? "undo_staged_placement" : "undo_direct_placement";
          const before = await t.owner.query("select count(*)::int as n from app.bits where id = $1", [t.result]);
          expect(before.rows[0].n).toBe(1);
          if (order === "first") {
            // Close first: the Undo is rejected with the result still in place.
            const [a, b] = await race(t.u, close, undo, undoName);
            expect([a.status, b.status]).toEqual(["applied", "rejected"]);
            expect(b.rejection?.code).toBe("invalid_target");
            expect(await rowOf(t, "bits", t.result)).toBeDefined();
          } else {
            // Undo first: the close then sees an unconsumed source (Archive: rejected) or a
            // recreated candidate (Trash: conflict).
            const [a, b] = await race(t.u, undo, close, name);
            expect(a.status).toBe("applied");
            expect(b.status).toBe(staged ? "conflict" : "rejected");
            expect(await rowOf(t, "bits", t.result)).toBeUndefined();
            expect(await rowOf(t, "scratch_breakdowns", t.r2)).toMatchObject({ consumed_at: null });
          }
        } finally {
          await t.owner.end();
        }
      }
    }, 90_000);
  }

  it("Save Breakdown waits while another session trashes and hard-deletes the Scratch, then is not_found with empty changes", async () => {
    const t = await fresh("atc-save", "plain");
    try {
      const gone = async (db: Client) => {
        expect((await trash(t)(db)).status).toBe("applied");
        return call(db, "hard_delete_bit", [t.scratch]);
      };
      const save = (db: Client) => call(db, "save_breakdown", [t.r2, 3, "Idea", 1, "Edited", 1]);
      const [a, b] = await race(t.u, gone, save, "save_breakdown");
      expect(a.status).toBe("applied");
      expect(b).toMatchObject({ status: "rejected", rejection: { code: "not_found" }, changes: {} });
      expect(await scratchOf(t)).toBeUndefined();
      expect(await rowOf(t, "scratch_breakdowns", t.r2)).toBeUndefined();
    } finally {
      await t.owner.end();
    }
  }, 60_000);
});
