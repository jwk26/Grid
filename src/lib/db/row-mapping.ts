import type { Database } from "@/lib/db/database.types";
import type { Bit, Chunk, Node, ScratchBreakdown, StagedCandidate } from "@/lib/db/schema";

// Typed snake_case <-> camelCase converters. Every field is mapped by hand against the
// generated row types, so renaming a column breaks `pnpm typecheck` here (S33).

type Tables = Database["app"]["Tables"];

export type NodeRow = Tables["nodes"]["Row"];
export type BitRow = Tables["bits"]["Row"];
export type ChunkRow = Tables["chunks"]["Row"];
export type ScratchBreakdownRow = Tables["scratch_breakdowns"]["Row"];
export type StagedCandidateRow = Tables["staged_candidates"]["Row"];
export type AccountRow = Tables["accounts"]["Row"];

export type Account = {
  userId: string;
  createdAt: number;
  lastVisitAt: number;
  seededAt: number | null;
  deletionRequestedAt: number | null;
};

export function nodeFromRow(row: NodeRow): Node {
  return {
    id: row.id,
    title: row.title,
    color: row.color,
    icon: row.icon,
    deadline: row.deadline,
    deadlineAllDay: row.deadline_all_day,
    mtime: row.mtime,
    createdAt: row.created_at,
    version: row.version,
    parentId: row.parent_id,
    level: row.level,
    x: row.x,
    y: row.y,
    deletedAt: row.deleted_at,
    archivedAt: row.archived_at,
    systemRole: row.system_role as Node["systemRole"],
    hiddenFromGrid: row.hidden_from_grid,
    pastDeadlineDismissed: row.past_deadline_dismissed,
  };
}

export function nodeToRow(node: Node, userId: string): NodeRow {
  return {
    id: node.id,
    user_id: userId,
    title: node.title,
    color: node.color,
    icon: node.icon,
    deadline: node.deadline,
    deadline_all_day: node.deadlineAllDay,
    mtime: node.mtime,
    created_at: node.createdAt,
    version: node.version,
    parent_id: node.parentId,
    level: node.level,
    x: node.x,
    y: node.y,
    deleted_at: node.deletedAt,
    archived_at: node.archivedAt,
    system_role: node.systemRole,
    hidden_from_grid: node.hiddenFromGrid,
    past_deadline_dismissed: node.pastDeadlineDismissed,
  };
}

export function bitFromRow(row: BitRow): Bit {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    icon: row.icon,
    deadline: row.deadline,
    deadlineAllDay: row.deadline_all_day,
    priority: row.priority as Bit["priority"],
    status: row.status as Bit["status"],
    mtime: row.mtime,
    createdAt: row.created_at,
    version: row.version,
    parentId: row.parent_id,
    x: row.x,
    y: row.y,
    deletedAt: row.deleted_at,
    archivedAt: row.archived_at,
    pastDeadlineDismissed: row.past_deadline_dismissed,
  };
}

export function bitToRow(bit: Bit, userId: string): BitRow {
  return {
    id: bit.id,
    user_id: userId,
    title: bit.title,
    description: bit.description,
    icon: bit.icon,
    deadline: bit.deadline,
    deadline_all_day: bit.deadlineAllDay,
    priority: bit.priority,
    status: bit.status,
    mtime: bit.mtime,
    created_at: bit.createdAt,
    version: bit.version,
    parent_id: bit.parentId,
    x: bit.x,
    y: bit.y,
    deleted_at: bit.deletedAt,
    archived_at: bit.archivedAt,
    past_deadline_dismissed: bit.pastDeadlineDismissed,
  };
}

export function chunkFromRow(row: ChunkRow): Chunk {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    time: row.time,
    timeAllDay: row.time_all_day,
    status: row.status as Chunk["status"],
    order: row.order,
    parentId: row.parent_id,
  };
}

export function chunkToRow(chunk: Chunk, userId: string): ChunkRow {
  return {
    id: chunk.id,
    user_id: userId,
    title: chunk.title,
    description: chunk.description,
    time: chunk.time,
    time_all_day: chunk.timeAllDay,
    status: chunk.status,
    order: chunk.order,
    parent_id: chunk.parentId,
  };
}

export function scratchBreakdownFromRow(row: ScratchBreakdownRow): ScratchBreakdown {
  return {
    id: row.id,
    scratchBitId: row.scratch_bit_id,
    content: row.content,
    order: row.order,
    createdAt: row.created_at,
    consumedAt: row.consumed_at,
    version: row.version,
  };
}

export function scratchBreakdownToRow(
  breakdown: ScratchBreakdown,
  userId: string,
): ScratchBreakdownRow {
  return {
    id: breakdown.id,
    user_id: userId,
    scratch_bit_id: breakdown.scratchBitId,
    content: breakdown.content,
    order: breakdown.order,
    created_at: breakdown.createdAt,
    consumed_at: breakdown.consumedAt,
    version: breakdown.version,
  };
}

export function stagedCandidateFromRow(row: StagedCandidateRow): StagedCandidate {
  return {
    id: row.id,
    scratchBitId: row.scratch_bit_id,
    sourceBreakdownId: row.source_breakdown_id,
    resultType: row.result_type as StagedCandidate["resultType"],
    lifecycle: row.lifecycle as StagedCandidate["lifecycle"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    version: row.version,
  };
}

export function stagedCandidateToRow(
  candidate: StagedCandidate,
  userId: string,
): StagedCandidateRow {
  return {
    id: candidate.id,
    user_id: userId,
    scratch_bit_id: candidate.scratchBitId,
    source_breakdown_id: candidate.sourceBreakdownId,
    result_type: candidate.resultType,
    lifecycle: candidate.lifecycle,
    created_at: candidate.createdAt,
    updated_at: candidate.updatedAt,
    version: candidate.version,
  };
}

export function accountFromRow(row: AccountRow): Account {
  return {
    userId: row.user_id,
    createdAt: row.created_at,
    lastVisitAt: row.last_visit_at,
    seededAt: row.seeded_at,
    deletionRequestedAt: row.deletion_requested_at,
  };
}

export function accountToRow(account: Account): AccountRow {
  return {
    user_id: account.userId,
    created_at: account.createdAt,
    last_visit_at: account.lastVisitAt,
    seeded_at: account.seededAt,
    deletion_requested_at: account.deletionRequestedAt,
  };
}
