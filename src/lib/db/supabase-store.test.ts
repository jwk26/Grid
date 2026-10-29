import { beforeEach, describe, expect, it, vi } from "vitest";
import { baseEntities } from "@/lib/db/boundary-cases";
import type { DataStore } from "@/lib/db/datastore";
import {
  bitToRow,
  chunkToRow,
  nodeToRow,
  scratchBreakdownToRow,
  stagedCandidateToRow,
} from "@/lib/db/row-mapping";
import type { Bit, Chunk, Node, ScratchBreakdown, StagedCandidate } from "@/lib/db/schema";
import { SnapshotStore, type Envelope } from "@/lib/db/snapshot-store";
import { createSupabaseStore } from "@/lib/db/supabase-store";

const USER = "00000000-0000-4000-8000-0000000000aa";
const DAY = 86_400_000;
const T0 = 1_700_000_000_000;

// Ids deliberately do not sort in creation order, so a store that returns insertion order
// instead of primary-key order fails the comparison.
const id = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;

const node = (n: number, extra: Partial<Node>): Node => ({
  ...baseEntities.node,
  id: id(n),
  title: `Node ${n}`,
  ...extra,
});
const bit = (n: number, extra: Partial<Bit>): Bit => ({
  ...baseEntities.bit,
  id: id(n),
  title: `Bit ${n}`,
  ...extra,
});
const chunk = (n: number, extra: Partial<Chunk>): Chunk => ({
  ...baseEntities.chunk,
  id: id(n),
  title: `Chunk ${n}`,
  ...extra,
});
const breakdown = (n: number, extra: Partial<ScratchBreakdown>): ScratchBreakdown => ({
  ...baseEntities.scratchBreakdown,
  id: id(n),
  ...extra,
});
const candidate = (n: number, extra: Partial<StagedCandidate>): StagedCandidate => ({
  ...baseEntities.stagedCandidate,
  id: id(n),
  ...extra,
});

const INBOX = id(90);
const PROJ_A = id(70);
const PROJ_TRASHED = id(50);
const CHILD = id(60);
const SCRATCH = id(80);
const SCRATCH_DONE = id(15);
const BIT_A1 = id(95);
const BIT_ARCHIVED = id(96);
const BIT_TRASHED = id(11);
const SPARE = id(12);

// Listed in an order unlike id order. Covers trashed and archived items, L0 hiddenFromGrid,
// system Nodes, Chunks under an archived parent, and consumed and staged rows.
const nodes: Node[] = [
  node(90, { title: "Inbox", systemRole: "inbox", hiddenFromGrid: true, x: 0, y: 0 }),
  node(70, { title: "Alpha plan", x: 2, y: 0 }),
  node(20, { title: "Beta", x: 1, y: 1 }),
  node(10, { title: "Archive", systemRole: "archive_view", x: 1, y: 0 }),
  node(50, { title: "Alpha trashed", x: 3, y: 0, deletedAt: T0 }),
  node(30, { title: "Alpha archived", x: 4, y: 0, archivedAt: T0 }),
  node(60, { title: "Alpha child", parentId: PROJ_A, level: 1, x: 0, y: 1 }),
  node(61, { title: "Child under trash", parentId: PROJ_TRASHED, level: 1, deletedAt: T0 }),
  node(62, { title: "Second child", parentId: PROJ_A, level: 1, x: 1, y: 0 }),
];
const bits: Bit[] = [
  bit(95, { title: "Alpha task", parentId: PROJ_A, x: 0, y: 0, deadline: T0 + 2 * DAY }),
  bit(40, { title: "Later task", parentId: PROJ_A, x: 3, y: 2, deadline: T0 + 5 * DAY }),
  bit(41, { title: "Undated", parentId: PROJ_A, x: 1, y: 2 }),
  bit(42, { title: "Same row", parentId: PROJ_A, x: 2, y: 2, deadline: T0 + DAY, deadlineAllDay: true }),
  bit(96, { title: "Alpha archived bit", parentId: PROJ_A, x: 5, y: 5, archivedAt: T0, deadline: T0 }),
  bit(11, { title: "Trashed bit", parentId: PROJ_A, x: 6, y: 5, deletedAt: T0 }),
  bit(12, { title: "Under child", parentId: CHILD, x: 0, y: 0, deadline: T0 + 3 * DAY }),
  bit(80, { title: "Scratch one", parentId: INBOX, x: 0, y: 0, createdAt: T0 + 2 }),
  bit(15, { title: "Scratch done", parentId: INBOX, x: 0, y: 0, createdAt: T0 + 1 }),
  bit(16, { title: "Scratch archived", parentId: INBOX, x: 0, y: 0, archivedAt: T0 }),
  bit(13, { title: "Scratch trashed", parentId: INBOX, x: 0, y: 0, deletedAt: T0 }),
];
const chunks: Chunk[] = [
  chunk(85, { parentId: BIT_A1, order: 2, time: T0 + DAY, title: "Alpha chunk b" }),
  chunk(45, { parentId: BIT_A1, order: 1, time: null, title: "Chunk a" }),
  chunk(46, { parentId: id(40), order: 0, time: T0, title: "Early chunk" }),
  chunk(47, { parentId: BIT_ARCHIVED, order: 0, time: T0, title: "Alpha under archived" }),
  chunk(48, { parentId: BIT_TRASHED, order: 0, time: T0, title: "Alpha under trashed" }),
];
const breakdowns: ScratchBreakdown[] = [
  breakdown(75, { scratchBitId: SCRATCH, order: 0, content: "second", createdAt: T0 + 5 }),
  breakdown(25, { scratchBitId: SCRATCH, order: 1, content: "first", createdAt: T0 + 1, consumedAt: T0 + 9 }),
  breakdown(35, { scratchBitId: SCRATCH_DONE, order: 0, createdAt: T0 + 3, consumedAt: T0 + 9 }),
];
const candidates: StagedCandidate[] = [
  candidate(55, { scratchBitId: SCRATCH, sourceBreakdownId: id(75), createdAt: T0 + 6 }),
  candidate(14, { scratchBitId: SCRATCH, sourceBreakdownId: id(25), resultType: "bit", createdAt: T0 + 7 }),
];

function snapshotRows() {
  return {
    nodes: nodes.map((row) => nodeToRow(row, USER)),
    bits: bits.map((row) => bitToRow(row, USER)),
    chunks: chunks.map((row) => chunkToRow(row, USER)),
    scratch_breakdowns: breakdowns.map((row) => scratchBreakdownToRow(row, USER)),
    staged_candidates: candidates.map((row) => stagedCandidateToRow(row, USER)),
  };
}

let snapshot: SnapshotStore;
let supabase: DataStore;

beforeEach(async () => {
  snapshot = new SnapshotStore({ fetchSnapshot: async () => snapshotRows() });
  await snapshot.load();
  supabase = createSupabaseStore(snapshot);
});

const ids = (rows: Array<{ id: string }>) => rows.map((row) => row.id);
const ns = (...n: number[]) => n.map(id);

// Expected ids and order are explicit values, taken from the removed Dexie store's output over this same
// fixture before it was removed (Task 230). Reads sort by primary key unless a method orders them.
describe("snapshot store reads over the fixture", () => {
  it("Node reads", async () => {
    expect(await supabase.getNode(PROJ_A)).toEqual(nodes[1]);
    expect(await supabase.getNode(id(999))).toBeUndefined();
    expect(ids(await supabase.getNodes(null))).toEqual(ns(90, 10, 70, 20));
    expect(ids(await supabase.getNodes(PROJ_A))).toEqual(ns(62, 60));
    expect(await supabase.getNodes(PROJ_TRASHED)).toEqual([]);
    expect(ids(await supabase.getAllActiveNodes())).toEqual(ns(10, 20, 60, 62, 70, 90));
  });

  it("Bit reads", async () => {
    expect(await supabase.getBit(BIT_A1)).toEqual(bits[0]);
    expect(await supabase.getBit(id(999))).toBeUndefined();
    expect(ids(await supabase.getBits(PROJ_A))).toEqual(ns(95, 41, 42, 40));
    expect(ids(await supabase.getBits(INBOX))).toEqual(ns(15, 80));
    expect(ids(await supabase.getBitsForNode(PROJ_A))).toEqual(ns(40, 41, 42, 95));
    expect(ids(await supabase.getBitsForNode(INBOX))).toEqual(ns(15, 80));
    expect(ids(await supabase.getAllActiveBits())).toEqual(ns(12, 15, 40, 41, 42, 80, 95));
  });

  it("Breakdown, Candidate and Chunk reads", async () => {
    expect(ids(await supabase.getScratchBreakdowns(SCRATCH))).toEqual(ns(75, 25));
    expect(ids(await supabase.getScratchBreakdowns(SCRATCH_DONE))).toEqual(ns(35));
    expect(ids(await supabase.getAllScratchBreakdowns())).toEqual(ns(25, 35, 75));
    expect(ids(await supabase.getStagedCandidates(SCRATCH))).toEqual(ns(14, 55));
    expect(await supabase.getStagedCandidates(SCRATCH_DONE)).toEqual([]);
    expect(ids(await supabase.getAllStagedCandidates())).toEqual(ns(14, 55));
    expect(ids(await supabase.getChunks(BIT_A1))).toEqual(ns(45, 85));
    expect(ids(await supabase.getChunks(BIT_ARCHIVED))).toEqual(ns(47));
  });

  it("grid contents hide trashed, archived and L0 hiddenFromGrid items", async () => {
    const root = await supabase.getActiveGridContents(null);
    expect(ids(root.nodes)).toEqual(ns(10, 70, 20));
    expect(root.nodes.map((n) => n.systemRole)).not.toContain("inbox");
    expect(root.bits).toEqual([]);
    // getNodes(null) still lists the hidden Inbox; the grid contents do not.
    expect(ids(await supabase.getNodes(null))).toContain(INBOX);
    const alpha = await supabase.getActiveGridContents(PROJ_A);
    expect(ids(alpha.nodes)).toEqual(ns(62, 60));
    expect(ids(alpha.bits)).toEqual(ns(95, 41, 42, 40));
    const inbox = await supabase.getActiveGridContents(INBOX);
    expect(inbox.nodes).toEqual([]);
    expect(ids(inbox.bits)).toEqual(ns(15, 80));
    // Occupancy leaves out archived items and the hidden root Node.
    expect([...(await supabase.getGridOccupancy(null))]).toEqual(["1,0", "1,1", "2,0"]);
    expect([...(await supabase.getGridOccupancy(PROJ_A))]).toEqual(["0,1", "1,0", "3,2", "1,2", "2,2", "0,0"]);
    expect([...(await supabase.getGridOccupancy(INBOX))]).toEqual(["0,0"]);
  });

  it("calendar, trash and archive reads", async () => {
    const calendar = await supabase.getCalendarItems();
    expect(ids(calendar.bits)).toEqual(ns(42, 95, 12, 40));
    expect(ids(calendar.chunks)).toEqual(ns(46, 85));
    expect(ids(calendar.chunks)).not.toContain(id(47));
    const trashed = await supabase.getTrashedItems();
    expect(ids(trashed.nodes)).toEqual(ns(50, 61));
    expect(ids(trashed.bits)).toEqual(ns(11, 13));
    const archived = await supabase.getArchivedItems();
    expect(ids(archived.nodes)).toEqual(ns(30));
    expect(ids(archived.bits)).toEqual(ns(16, 96));
    expect(archived.nodes.every((n) => n.systemRole === null)).toBe(true);
  });

  it("search, including Chunks under archived and trashed parents", async () => {
    const hits = await supabase.searchAll("alpha");
    expect(hits.map((hit) => hit.item.id)).toEqual(ns(60, 70, 95, 85));
    expect(hits.map((hit) => hit.item.id)).not.toContain(id(47));
    expect(hits.map((hit) => hit.item.id)).not.toContain(id(48));
    expect((await supabase.searchAll("  PLAN ")).map((hit) => hit.item.id)).toEqual(ns(70));
    expect((await supabase.searchAll("chunk")).map((hit) => hit.item.id)).toEqual(ns(45, 46, 85));
    expect((await supabase.searchAll("task")).map((hit) => hit.item.id)).toEqual(ns(40, 95));
    expect(await supabase.searchAll("   ")).toEqual([]);
  });

  it("child deadline conflicts", async () => {
    expect(ids(await supabase.getChildDeadlineConflicts(PROJ_A, T0 + DAY + 1, false))).toEqual(ns(40, 42, 95));
    expect(ids(await supabase.getChildDeadlineConflicts(PROJ_A, T0 + 4 * DAY, true))).toEqual(ns(40));
    expect(ids(await supabase.getChildDeadlineConflicts(CHILD, T0, false))).toEqual(ns(12));
  });

  it("Scratch archive eligibility", async () => {
    const eligibility = (scratch: string | null, eligible: boolean, consumed = 0, unconsumed = 0, staged = 0) => ({
      eligible,
      scratch: scratch === null ? null : expect.objectContaining({ id: scratch }),
      consumedCount: consumed,
      unconsumedCount: unconsumed,
      stagedCandidateCount: staged,
    });
    expect(await supabase.getScratchArchiveEligibility(SCRATCH)).toEqual(eligibility(SCRATCH, false, 1, 1, 2));
    expect(await supabase.getScratchArchiveEligibility(SCRATCH_DONE)).toEqual(eligibility(SCRATCH_DONE, true, 1));
    expect(await supabase.getScratchArchiveEligibility(id(16))).toEqual(eligibility(id(16), false));
    expect(await supabase.getScratchArchiveEligibility(id(999))).toEqual(eligibility(null, false));
    expect(await supabase.getScratchArchiveEligibility(BIT_A1)).toEqual(eligibility(BIT_A1, false));
  });

  it("views pending writes: a read sees the snapshot view", async () => {
    const effect = { kind: "patch", table: "bits", id: SPARE, patch: { title: "Renamed" } } as const;
    let release!: (envelope: Envelope) => void;
    const done = snapshot.write({ effect, send: () => new Promise<Envelope>((r) => (release = r)) });
    expect((await supabase.getBit(SPARE))?.title).toBe("Renamed");
    release({ status: "applied", result: null, changes: {} });
    await done;
  });

  it("keeps sorted results correct across views and safe from caller mutation", async () => {
    const first = await supabase.getAllScratchBreakdowns();
    first.length = 0;
    expect(await supabase.getAllScratchBreakdowns()).toHaveLength(breakdowns.length);

    const rows = snapshotRows();
    rows.bits = rows.bits.filter((row) => row.id !== SPARE);
    const next = new SnapshotStore({ fetchSnapshot: async () => rows });
    await next.load();
    expect(await createSupabaseStore(next).getBit(SPARE)).toBeUndefined();
    expect(await supabase.getBit(SPARE)).toBeDefined();
  });
});

describe("snapshot store liveRead", () => {
  const rename = (title: string): Promise<unknown> =>
    snapshot.write({
      effect: { kind: "patch", table: "bits", id: SPARE, patch: { title } },
      send: async () => ({ status: "applied", result: null, changes: {} }),
    });

  it("emits the first result, then again for each view change", async () => {
    const next = vi.fn();
    const subscription = supabase.liveRead((s) => s.getBit(SPARE)).subscribe({ next });
    await vi.waitFor(() => expect(next).toHaveBeenCalledTimes(1));
    expect(next.mock.calls[0][0].title).toBe("Under child");

    // The pending write changes the view, and so does its settling.
    await rename("Renamed");
    expect(next.mock.calls.map(([bitValue]) => bitValue.title)).toContain("Renamed");
    expect(next.mock.calls.length).toBeGreaterThanOrEqual(3);
    subscription.unsubscribe();
  });

  it("does not re-run when a notification leaves the view reference unchanged", async () => {
    const state = snapshot.getState();
    const listeners = new Set<() => void>();
    const fake = {
      getState: () => state,
      subscribe: (listener: () => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    } as unknown as SnapshotStore;
    const read = vi.fn(async () => "value");
    const next = vi.fn();
    const subscription = createSupabaseStore(fake).liveRead(read).subscribe({ next });
    await vi.waitFor(() => expect(next).toHaveBeenCalledTimes(1));

    for (const listener of listeners) listener();
    for (const listener of listeners) listener();

    expect(read).toHaveBeenCalledTimes(1);
    subscription.unsubscribe();
    expect(listeners.size).toBe(0);
  });

  it("keeps the latest result when async reads finish out of order", async () => {
    const resolvers: Array<(value: string) => void> = [];
    const read = vi.fn(() => new Promise<string>((resolve) => resolvers.push(resolve)));
    const next = vi.fn();
    const subscription = supabase.liveRead(read).subscribe({ next });
    expect(resolvers).toHaveLength(1);

    // Hold the write open so the view changes exactly once.
    let release!: (envelope: Envelope) => void;
    const written = snapshot.write({
      effect: { kind: "patch", table: "bits", id: SPARE, patch: { title: "Newer" } },
      send: () => new Promise<Envelope>((resolve) => (release = resolve)),
    });
    expect(resolvers).toHaveLength(2);
    resolvers[1]("newer");
    resolvers[0]("older");
    await vi.waitFor(() => expect(next).toHaveBeenCalledWith("newer"));

    expect(next).toHaveBeenCalledTimes(1);
    subscription.unsubscribe();
    release({ status: "applied", result: null, changes: {} });
    await written;
  });

  it("emits nothing after unsubscribe", async () => {
    const resolvers: Array<(value: string) => void> = [];
    const next = vi.fn();
    const error = vi.fn();
    const subscription = supabase
      .liveRead(() => new Promise<string>((resolve) => resolvers.push(resolve)))
      .subscribe({ next, error });
    subscription.unsubscribe();
    resolvers[0]("late");
    await rename("After");
    await Promise.resolve();

    expect(resolvers).toHaveLength(1);
    expect(next).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it("waits for a loaded snapshot before the first emit", async () => {
    const empty = new SnapshotStore({ fetchSnapshot: async () => snapshotRows() });
    const next = vi.fn();
    createSupabaseStore(empty).liveRead((s) => s.getAllActiveNodes()).subscribe({ next });
    expect(next).not.toHaveBeenCalled();
    await empty.load();
    await vi.waitFor(() => expect(next).toHaveBeenCalledTimes(1));
    expect(next.mock.calls[0][0].length).toBeGreaterThan(0);
  });

  it("passes a read error to the observer", async () => {
    const error = vi.fn();
    supabase.liveRead(async () => Promise.reject(new Error("boom"))).subscribe({ error });
    await vi.waitFor(() => expect(error).toHaveBeenCalledTimes(1));
  });
});
