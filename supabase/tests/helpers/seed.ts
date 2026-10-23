import { randomUUID } from "node:crypto";
import type { Client } from "pg";
import { baseEntities } from "@/lib/db/boundary-cases";
import {
  accountToRow,
  bitToRow,
  chunkToRow,
  nodeToRow,
  scratchBreakdownToRow,
  stagedCandidateToRow,
} from "@/lib/db/row-mapping";
import type { Bit, Chunk, Node, ScratchBreakdown, StagedCandidate } from "@/lib/db/schema";
import { insertRow } from "./db";

export type SeededAccount = {
  userId: string;
  nodeId: string;
  bitId: string;
  chunkId: string;
  breakdownId: string;
  candidateId: string;
};

export const TABLES = [
  "accounts",
  "nodes",
  "bits",
  "chunks",
  "scratch_breakdowns",
  "staged_candidates",
] as const;

// One row in every table for `userId`, with ids unique across accounts. Run as the owner.
export async function seedAccount(db: Client, userId: string): Promise<SeededAccount> {
  const ids = {
    userId,
    nodeId: randomUUID(),
    bitId: randomUUID(),
    chunkId: randomUUID(),
    breakdownId: randomUUID(),
    candidateId: randomUUID(),
  };
  const node: Node = { ...baseEntities.node, id: ids.nodeId };
  const bit: Bit = { ...baseEntities.bit, id: ids.bitId, parentId: ids.nodeId };
  const chunk: Chunk = { ...baseEntities.chunk, id: ids.chunkId, parentId: ids.bitId };
  const breakdown: ScratchBreakdown = {
    ...baseEntities.scratchBreakdown,
    id: ids.breakdownId,
    scratchBitId: ids.bitId,
  };
  const candidate: StagedCandidate = {
    ...baseEntities.stagedCandidate,
    id: ids.candidateId,
    scratchBitId: ids.bitId,
    sourceBreakdownId: ids.breakdownId,
  };
  await insertRow(
    db,
    "accounts",
    accountToRow({ userId, createdAt: 1, lastVisitAt: 1, seededAt: null, deletionRequestedAt: null }),
  );
  await insertRow(db, "nodes", nodeToRow(node, userId));
  await insertRow(db, "bits", bitToRow(bit, userId));
  await insertRow(db, "chunks", chunkToRow(chunk, userId));
  await insertRow(db, "scratch_breakdowns", scratchBreakdownToRow(breakdown, userId));
  await insertRow(db, "staged_candidates", stagedCandidateToRow(candidate, userId));
  return ids;
}
