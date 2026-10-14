import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { NODE_ICON_NAMES } from "@/lib/constants/node-icons";
import {
  bitSchema,
  nodeSchema,
  scratchBreakdownSchema,
  stagedCandidateSchema,
  type Bit,
  type Node,
  type ScratchBreakdown,
  type StagedCandidate,
} from "@/lib/db/schema";

// The browser-side dev fixture in scripts/dev-fixtures must keep writing
// records the app accepts, and its guard must refuse non-fixture data.

type FixtureData = {
  nodes: Node[];
  bits: Bit[];
  scratchBreakdowns: ScratchBreakdown[];
  stagedCandidates: StagedCandidate[];
  settings: { key: string; value: unknown }[];
};

type FixtureApi = {
  FIXTURE_PREFIX: string;
  build: (options?: { now?: number; overflow?: boolean }) => FixtureData;
  checkGuard: (rowsByStore: Record<string, unknown[]>) => {
    ok: boolean;
    blocked: Record<string, { count: number; sample: string[] }>;
  };
};

function loadFixture(): FixtureApi {
  const source = readFileSync(
    path.resolve(process.cwd(), "scripts/dev-fixtures/inbox-triage.js"),
    "utf8",
  );
  const sandbox: { griddoFixture?: FixtureApi } = {};
  new Function("window", source)(sandbox);
  if (!sandbox.griddoFixture) throw new Error("fixture did not install");
  return sandbox.griddoFixture;
}

const fixture = loadFixture();
const NOW = Date.UTC(2026, 9, 15, 3);
const RANDOM_ID = "3f2b8c1e-7a4d-4e9b-9c21-5d6e7f8a9b0c";

describe("inbox-triage dev fixture data", () => {
  for (const overflow of [false, true]) {
    it(`passes the write schemas and grid rules (overflow ${overflow})`, () => {
      const data = fixture.build({ now: NOW, overflow });

      data.nodes.forEach((row) => nodeSchema.parse(row));
      data.bits.forEach((row) => bitSchema.parse(row));
      data.scratchBreakdowns.forEach((row) => scratchBreakdownSchema.parse(row));
      data.stagedCandidates.forEach((row) => stagedCandidateSchema.parse(row));

      const records = [...data.nodes, ...data.bits, ...data.scratchBreakdowns, ...data.stagedCandidates];
      const ids = records.map((row) => row.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.every((id) => id.startsWith(fixture.FIXTURE_PREFIX))).toBe(true);

      const nodesById = new Map(data.nodes.map((node) => [node.id, node]));
      for (const node of data.nodes) {
        const parent = node.parentId === null ? undefined : nodesById.get(node.parentId);
        expect(node.level).toBe(parent ? parent.level + 1 : 0);
        if (node.systemRole === null) expect(NODE_ICON_NAMES).toContain(node.icon);
      }
      for (const bit of data.bits) {
        expect(nodesById.has(bit.parentId)).toBe(true);
        expect(NODE_ICON_NAMES).toContain(bit.icon);
      }

      const cells = [...data.nodes, ...data.bits].map((row) => `${row.parentId}:${row.x},${row.y}`);
      expect(new Set(cells).size).toBe(cells.length);

      const rowsById = new Map(data.scratchBreakdowns.map((row) => [row.id, row]));
      const scratchCreatedAt = new Map(data.bits.map((bit) => [bit.id, bit.createdAt]));
      for (const row of data.scratchBreakdowns) {
        expect(row.createdAt).toBeGreaterThan(scratchCreatedAt.get(row.scratchBitId) ?? Infinity);
        if (row.consumedAt !== null) expect(row.consumedAt).toBeGreaterThan(row.createdAt);
      }
      const sources = data.stagedCandidates.map((candidate) => candidate.sourceBreakdownId);
      expect(new Set(sources).size).toBe(sources.length);
      for (const candidate of data.stagedCandidates) {
        const source = rowsById.get(candidate.sourceBreakdownId);
        expect(source?.scratchBitId).toBe(candidate.scratchBitId);
        expect(source?.consumedAt).toBeNull();
      }
    });
  }
});

describe("inbox-triage dev fixture guard", () => {
  const systemNode = (id: string, systemRole: "inbox" | "archive_view") => ({
    id,
    systemRole,
    parentId: null,
  });

  it("accepts a database holding only the app's first-load system Nodes", () => {
    const verdict = fixture.checkGuard({
      nodes: [systemNode(RANDOM_ID, "inbox"), systemNode(crypto.randomUUID(), "archive_view")],
      bits: [],
      settings: [{ key: "bzMigration___root__", value: true }],
    });
    expect(verdict.ok).toBe(true);
  });

  it("refuses a Scratch under a non-fixture Inbox", () => {
    const verdict = fixture.checkGuard({
      nodes: [systemNode(RANDOM_ID, "inbox")],
      bits: [{ id: crypto.randomUUID(), parentId: RANDOM_ID }],
    });
    expect(verdict.ok).toBe(false);
    expect(verdict.blocked.bits.count).toBe(1);
  });

  it("refuses a non-fixture root Node", () => {
    const verdict = fixture.checkGuard({
      nodes: [{ id: RANDOM_ID, systemRole: null, parentId: null }],
    });
    expect(verdict.blocked.nodes.sample).toEqual([RANDOM_ID]);
  });

  it("accepts records the app created under fixture records", () => {
    const data = fixture.build({ now: NOW });
    const placedNode = { id: crypto.randomUUID(), systemRole: null, parentId: data.nodes[2].id };
    const placedBit = { id: crypto.randomUUID(), parentId: placedNode.id };
    const addedRow = { id: crypto.randomUUID(), scratchBitId: data.bits.find((b) => b.title === "Empty scratch")?.id };
    const verdict = fixture.checkGuard({
      ...data,
      nodes: [...data.nodes, placedNode],
      bits: [...data.bits, placedBit],
      scratchBreakdowns: [...data.scratchBreakdowns, addedRow],
    });
    expect(verdict).toEqual({ ok: true, blocked: {} });
  });
});
