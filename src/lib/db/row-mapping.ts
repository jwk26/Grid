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

// The fields update_node() accepts (SCHEMA Hook 8). A partial patch: an undefined key is left
// out, null is kept. `level`, `id`, `version`, `mtime` and the lifecycle fields are server-owned
// and not part of the type, so they can never reach p_changes.
export type NodePatch = Partial<
  Pick<
    Node,
    | "title"
    | "color"
    | "icon"
    | "deadline"
    | "deadlineAllDay"
    | "parentId"
    | "x"
    | "y"
    | "hiddenFromGrid"
    | "pastDeadlineDismissed"
  >
>;

export type NodePatchRow = Partial<
  Pick<
    NodeRow,
    | "title"
    | "color"
    | "icon"
    | "deadline"
    | "deadline_all_day"
    | "parent_id"
    | "x"
    | "y"
    | "hidden_from_grid"
    | "past_deadline_dismissed"
  >
>;

export function nodePatchToRow(patch: NodePatch): NodePatchRow {
  const row: NodePatchRow = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.color !== undefined) row.color = patch.color;
  if (patch.icon !== undefined) row.icon = patch.icon;
  if (patch.deadline !== undefined) row.deadline = patch.deadline;
  if (patch.deadlineAllDay !== undefined) row.deadline_all_day = patch.deadlineAllDay;
  if (patch.parentId !== undefined) row.parent_id = patch.parentId;
  if (patch.x !== undefined) row.x = patch.x;
  if (patch.y !== undefined) row.y = patch.y;
  if (patch.hiddenFromGrid !== undefined) row.hidden_from_grid = patch.hiddenFromGrid;
  if (patch.pastDeadlineDismissed !== undefined) row.past_deadline_dismissed = patch.pastDeadlineDismissed;
  return row;
}

// The values the write functions accept (SCHEMA Hooks 1-12). Each converter keeps only the keys
// the function takes: server-owned fields (`level`, `status` on create, `order` on a Chunk update)
// can never reach `p_values` or `p_changes`. An undefined key is left out, null is kept.
function pick<Row extends object>(entries: ReadonlyArray<readonly [keyof Row, unknown]>): Row {
  const row = {} as Record<string, unknown>;
  for (const [key, value] of entries) if (value !== undefined) row[key as string] = value;
  return row as Row;
}

export type NodeCreateRow = Pick<NodeRow, "title" | "color" | "icon" | "x" | "y"> &
  Partial<Pick<NodeRow, "deadline" | "deadline_all_day" | "parent_id">>;
export function nodeCreateToRow(
  node: Pick<Node, "title" | "color" | "icon" | "x" | "y" | "deadline" | "deadlineAllDay" | "parentId">,
): NodeCreateRow {
  return pick<NodeCreateRow>([
    ["title", node.title],
    ["color", node.color],
    ["icon", node.icon],
    ["deadline", node.deadline],
    ["deadline_all_day", node.deadlineAllDay],
    ["parent_id", node.parentId],
    ["x", node.x],
    ["y", node.y],
  ]);
}

export type BitCreateRow = Pick<BitRow, "title" | "icon" | "parent_id" | "x" | "y"> &
  Partial<Pick<BitRow, "description" | "deadline" | "deadline_all_day" | "priority">>;
export function bitCreateToRow(
  bit: Pick<Bit, "title" | "icon" | "parentId" | "x" | "y" | "description" | "deadline" | "deadlineAllDay" | "priority">,
): BitCreateRow {
  return pick<BitCreateRow>([
    ["title", bit.title],
    ["description", bit.description],
    ["icon", bit.icon],
    ["deadline", bit.deadline],
    ["deadline_all_day", bit.deadlineAllDay],
    ["priority", bit.priority],
    ["parent_id", bit.parentId],
    ["x", bit.x],
    ["y", bit.y],
  ]);
}

export type BitPatch = Partial<
  Pick<
    Bit,
    | "title"
    | "description"
    | "icon"
    | "deadline"
    | "deadlineAllDay"
    | "priority"
    | "status"
    | "parentId"
    | "x"
    | "y"
    | "pastDeadlineDismissed"
  >
>;
export type BitPatchRow = Partial<
  Pick<
    BitRow,
    | "title"
    | "description"
    | "icon"
    | "deadline"
    | "deadline_all_day"
    | "priority"
    | "status"
    | "parent_id"
    | "x"
    | "y"
    | "past_deadline_dismissed"
  >
>;
export function bitPatchToRow(patch: BitPatch): BitPatchRow {
  return pick<BitPatchRow>([
    ["title", patch.title],
    ["description", patch.description],
    ["icon", patch.icon],
    ["deadline", patch.deadline],
    ["deadline_all_day", patch.deadlineAllDay],
    ["priority", patch.priority],
    ["status", patch.status],
    ["parent_id", patch.parentId],
    ["x", patch.x],
    ["y", patch.y],
    ["past_deadline_dismissed", patch.pastDeadlineDismissed],
  ]);
}

export type ChunkCreateRow = Pick<ChunkRow, "title" | "parent_id" | "order"> &
  Partial<Pick<ChunkRow, "description" | "time" | "time_all_day">>;
export function chunkCreateToRow(
  chunk: Pick<Chunk, "title" | "parentId" | "order" | "description" | "time" | "timeAllDay">,
): ChunkCreateRow {
  return pick<ChunkCreateRow>([
    ["title", chunk.title],
    ["description", chunk.description],
    ["time", chunk.time],
    ["time_all_day", chunk.timeAllDay],
    ["parent_id", chunk.parentId],
    ["order", chunk.order],
  ]);
}

export type ChunkPatch = Partial<Pick<Chunk, "title" | "description" | "time" | "timeAllDay" | "status">>;
export type ChunkPatchRow = Partial<Pick<ChunkRow, "title" | "description" | "time" | "time_all_day" | "status">>;
export function chunkPatchToRow(patch: ChunkPatch): ChunkPatchRow {
  return pick<ChunkPatchRow>([
    ["title", patch.title],
    ["description", patch.description],
    ["time", patch.time],
    ["time_all_day", patch.timeAllDay],
    ["status", patch.status],
  ]);
}
