import { describe, expect, it } from "vitest";
import { baseEntities } from "@/lib/db/boundary-cases";
import {
  accountFromRow,
  accountToRow,
  bitFromRow,
  bitToRow,
  chunkFromRow,
  chunkToRow,
  nodeFromRow,
  nodePatchToRow,
  nodeToRow,
  scratchBreakdownFromRow,
  scratchBreakdownToRow,
  stagedCandidateFromRow,
  stagedCandidateToRow,
} from "@/lib/db/row-mapping";
import type { Bit, Chunk, Node, ScratchBreakdown, StagedCandidate } from "@/lib/db/schema";

const USER_ID = "00000000-0000-4000-8000-0000000000aa";

const snake = (key: string) => key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

describe("row mapping", () => {
  const cases = [
    ["node", baseEntities.node as Node, nodeToRow, nodeFromRow],
    ["bit", baseEntities.bit as Bit, bitToRow, bitFromRow],
    ["chunk", baseEntities.chunk as Chunk, chunkToRow, chunkFromRow],
    [
      "scratchBreakdown",
      baseEntities.scratchBreakdown as ScratchBreakdown,
      scratchBreakdownToRow,
      scratchBreakdownFromRow,
    ],
    [
      "stagedCandidate",
      baseEntities.stagedCandidate as StagedCandidate,
      stagedCandidateToRow,
      stagedCandidateFromRow,
    ],
  ] as const;

  it.each(cases)("%s round-trips and uses the snake_case column names", (_name, entity, toRow, fromRow) => {
    const row = (toRow as (e: typeof entity, userId: string) => Record<string, unknown>)(entity, USER_ID);
    expect(Object.keys(row).sort()).toEqual(
      [...Object.keys(entity).map(snake), "user_id"].sort(),
    );
    expect(row.user_id).toBe(USER_ID);
    expect((fromRow as (r: never) => unknown)(row as never)).toEqual(entity);
  });

  it("round-trips an account", () => {
    const account = {
      userId: USER_ID,
      createdAt: 1,
      lastVisitAt: 2,
      seededAt: null,
      deletionRequestedAt: null,
    };
    const row = accountToRow(account);
    expect(Object.keys(row).sort()).toEqual(Object.keys(account).map(snake).sort());
    expect(accountFromRow(row)).toEqual(account);
  });

  describe("nodePatchToRow", () => {
    it("maps every update_node key to its column and keeps null", () => {
      expect(
        nodePatchToRow({
          title: "T",
          color: "hsl(1, 2%, 3%)",
          icon: "i",
          deadline: null,
          deadlineAllDay: true,
          parentId: null,
          x: 1,
          y: 2,
          hiddenFromGrid: false,
          pastDeadlineDismissed: true,
        }),
      ).toEqual({
        title: "T",
        color: "hsl(1, 2%, 3%)",
        icon: "i",
        deadline: null,
        deadline_all_day: true,
        parent_id: null,
        x: 1,
        y: 2,
        hidden_from_grid: false,
        past_deadline_dismissed: true,
      });
    });

    it("skips undefined keys and never emits level or a server-owned column", () => {
      const patch = {
        x: 4,
        title: undefined,
        level: 2,
        id: "x",
        version: 9,
        mtime: 1,
        systemRole: "inbox",
        deletedAt: 1,
      } as never;
      expect(nodePatchToRow(patch)).toEqual({ x: 4 });
    });
  });
});
