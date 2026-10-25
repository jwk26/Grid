import { randomUUID } from "node:crypto";
import type { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { baseEntities, boundaryCases, type BoundaryEntity } from "@/lib/db/boundary-cases";
import { bitToRow, chunkToRow, nodeToRow, scratchBreakdownToRow, stagedCandidateToRow } from "@/lib/db/row-mapping";
import type { Bit, Chunk, Node, ScratchBreakdown, StagedCandidate } from "@/lib/db/schema";
import { connect, insertRow } from "./helpers/db";
import { seedAccount, type SeededAccount } from "./helpers/seed";
import { createTestUser } from "./helpers/users";

// Runs the shared boundary table against the CHECK constraints; schema.test.ts runs the
// same table against Zod, so both must give the same verdict (S33).

let db: Client;
let seeded: SeededAccount;

beforeAll(async () => {
  const user = await createTestUser("constraints");
  db = await connect();
  await db.query("begin");
  seeded = await seedAccount(db, user.id);
});

afterAll(async () => {
  await db.query("rollback");
  await db.end();
});

function buildRow(entity: BoundaryEntity, override: Record<string, unknown>): [string, Record<string, unknown>] {
  const id = randomUUID();
  const { userId } = seeded;
  switch (entity) {
    case "node":
      return ["nodes", nodeToRow({ ...baseEntities.node, id, ...override } as Node, userId)];
    case "bit":
      return ["bits", bitToRow({ ...baseEntities.bit, id, parentId: seeded.nodeId, ...override } as Bit, userId)];
    case "chunk":
      return ["chunks", chunkToRow({ ...baseEntities.chunk, id, parentId: seeded.bitId, ...override } as Chunk, userId)];
    case "scratchBreakdown":
      return [
        "scratch_breakdowns",
        scratchBreakdownToRow(
          { ...baseEntities.scratchBreakdown, id, scratchBitId: seeded.bitId, ...override } as ScratchBreakdown,
          userId,
        ),
      ];
    case "stagedCandidate": {
      return [
        "staged_candidates",
        stagedCandidateToRow(
          {
            ...baseEntities.stagedCandidate,
            id,
            scratchBitId: seeded.bitId,
            sourceBreakdownId: seeded.breakdownId,
            ...override,
          } as StagedCandidate,
          userId,
        ),
      ];
    }
  }
}

describe("boundary cases against the database constraints", () => {
  it("accepts every base entity", async () => {
    for (const entity of Object.keys(baseEntities) as BoundaryEntity[]) {
      await db.query("savepoint base");
      // The seeded rows already hold the unique source, so the candidate base is checked below.
      if (entity === "stagedCandidate") {
        await db.query("delete from app.staged_candidates");
      }
      const [table, row] = buildRow(entity, {});
      await insertRow(db, table, row);
      await db.query("rollback to savepoint base");
    }
  });

  it.each(boundaryCases.map((boundary) => [`${boundary.entity}.${boundary.label}`, boundary] as const))(
    "%s",
    async (_name, boundary) => {
      await db.query("savepoint boundary");
      await db.query("delete from app.staged_candidates");
      const [table, row] = buildRow(boundary.entity, { [boundary.field]: boundary.value });
      let code = "";
      try {
        await insertRow(db, table, row);
      } catch (error) {
        code = (error as { code?: string }).code ?? "unknown";
      }
      await db.query("rollback to savepoint boundary");
      if (boundary.valid) {
        expect(code).toBe("");
      } else {
        // 22003: a value past int4 is refused before the CHECK runs.
        expect(["23514", "23502", "22003"]).toContain(code);
      }
    },
  );
});
