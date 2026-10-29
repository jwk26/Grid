import { describe, expect, it } from "vitest";
import { baseEntities } from "@/lib/db/boundary-cases";
import type { DirectPlacementUndoCommand } from "@/lib/db/datastore";
import {
  placementUndoVerdict,
  type PlacementUndoState,
} from "@/lib/db/placement-undo-verdict";
import type { Bit, Chunk, Node, ScratchBreakdown } from "@/lib/db/schema";

const parent: Node = { ...baseEntities.node, id: "00000000-0000-4000-8000-0000000000a1" };
const result: Bit = {
  ...baseEntities.bit,
  id: "00000000-0000-4000-8000-0000000000b1",
  parentId: parent.id,
  createdAt: 5,
  mtime: 5,
};
const consumedSource: ScratchBreakdown = {
  ...baseEntities.scratchBreakdown,
  consumedAt: 5,
  version: 3,
};
const command: DirectPlacementUndoCommand = {
  operationId: "00000000-0000-4000-8000-0000000000c1",
  resultSnapshot: result,
  sourceSnapshot: consumedSource,
};

const placed = (extra: Partial<PlacementUndoState> = {}): PlacementUndoState => ({
  resultNode: undefined,
  resultBit: result,
  source: consumedSource,
  candidate: undefined,
  sourceCandidate: undefined,
  nodes: [parent],
  bits: [result],
  chunks: [],
  ownerIsActive: true,
  ...extra,
});

const child = (id: string, parentId: string) => ({ ...baseEntities.bit, id, parentId });
const chunk: Chunk = { ...baseEntities.chunk, parentId: result.id };

describe("placementUndoVerdict", () => {
  it("is not_applied for an untouched placement", () => {
    expect(placementUndoVerdict(command, placed(), false)).toMatchObject({
      status: "not_applied",
      result,
      source: consumedSource,
      candidate: null,
    });
  });

  it.each([
    ["a child Bit", { bits: [result, child("00000000-0000-4000-8000-0000000000d1", result.id)] }],
    ["a child Node", { nodes: [parent, { ...baseEntities.node, id: "00000000-0000-4000-8000-0000000000d2", parentId: result.id }] }],
    ["a Chunk under the result", { chunks: [chunk] }],
  ])("is a conflict with %s", (_label, extra) => {
    expect(placementUndoVerdict(command, placed(extra), false).status).toBe("conflict");
  });

  it("is not_applied again once the dependency is gone", () => {
    expect(placementUndoVerdict(command, placed({ chunks: [] }), false).status).toBe("not_applied");
  });

  it("is a conflict when the result was edited", () => {
    const edited = { ...result, title: "Edited" };
    expect(placementUndoVerdict(command, placed({ resultBit: edited, bits: [edited] }), false).status).toBe(
      "conflict",
    );
  });

  it("is rejected while the owning Scratch is not active, ahead of every other reason", () => {
    expect(
      placementUndoVerdict(command, placed({ ownerIsActive: false, chunks: [chunk] }), false).status,
    ).toBe("rejected");
  });

  it("is already_applied when the result is gone and the source is back", () => {
    const state = placed({
      resultBit: undefined,
      bits: [],
      source: { ...consumedSource, consumedAt: null, version: 4 },
    });
    expect(placementUndoVerdict(command, state, false)).toMatchObject({
      status: "already_applied",
      result: null,
    });
  });
});
