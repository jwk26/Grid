import { z } from "zod";
import { GRID_COLS, GRID_ROWS } from "@/lib/constants";

// --- Shared ---

const INT4_MAX = 2147483647;
const idSchema = z.string().uuid();
const timestampSchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const versionSchema = z.number().int().min(1).max(INT4_MAX);
const gridXSchema = z.number().int().min(0).max(GRID_COLS - 1);
const gridYSchema = z.number().int().min(0).max(GRID_ROWS - 1);

export const repositoryOperationIdSchema = idSchema;
export type RepositoryOperationId = z.infer<typeof repositoryOperationIdSchema>;

export const repositoryOperationStatusSchema = z.enum([
  "applied",
  "already_applied",
  "not_applied",
  "rejected",
  "conflict",
]);

export type RepositoryOperationStatus = z.infer<typeof repositoryOperationStatusSchema>;
type EmptyRepositoryOperationPayload = Record<never, never>;
export type RepositoryOperationCommand<
  TPayload extends object = EmptyRepositoryOperationPayload,
> = TPayload extends unknown
  ? Readonly<{ operationId: RepositoryOperationId } & Omit<TPayload, "operationId">>
  : never;
export type RepositoryOperationResult<
  TResult extends { status: RepositoryOperationStatus } = {
    status: RepositoryOperationStatus;
  },
> = TResult extends unknown
  ? Readonly<{ operationId: RepositoryOperationId } & Omit<TResult, "operationId">>
  : never;
export type UnknownRepositoryOperationOutcome = Readonly<{
  operationId: RepositoryOperationId;
  outcome: "unknown";
}>;

// --- Node ---

export const nodeSchema = z.object({
  id: idSchema,
  title: z.string().min(1).max(100),
  color: z.string().regex(/^hsl\(\d{1,3},\s*\d{1,3}%,\s*\d{1,3}%\)$/),
  icon: z.string().min(1).max(64),
  deadline: timestampSchema.nullable().default(null),
  deadlineAllDay: z.boolean().default(false),
  mtime: timestampSchema,
  createdAt: timestampSchema,
  version: versionSchema,
  parentId: idSchema.nullable().default(null),
  level: z.number().int().min(0).max(2),
  x: gridXSchema,
  y: gridYSchema,
  deletedAt: timestampSchema.nullable().default(null),
  archivedAt: timestampSchema.nullable().default(null),
  systemRole: z.enum(["inbox", "archive_view"]).nullable().default(null),
  hiddenFromGrid: z.boolean().default(false),
  pastDeadlineDismissed: z.boolean().default(false),
});

export const createNodeSchema = nodeSchema.omit({
  id: true,
  mtime: true,
  createdAt: true,
  version: true,
  deletedAt: true,
  archivedAt: true,
  systemRole: true,
  hiddenFromGrid: true,
  pastDeadlineDismissed: true,
});

export const updateNodeSchema = nodeSchema
  .omit({
    id: true,
    mtime: true,
    createdAt: true,
    version: true,
    deletedAt: true,
    archivedAt: true,
    systemRole: true,
  })
  .partial();

export type Node = z.infer<typeof nodeSchema>;
export type CreateNode = z.infer<typeof createNodeSchema>;
export type UpdateNode = z.infer<typeof updateNodeSchema>;

// --- Bit ---

export const bitSchema = z.object({
  id: idSchema,
  title: z.string().min(1).max(200),
  description: z.string().max(1000).default(""),
  icon: z.string().min(1).max(64),
  deadline: timestampSchema.nullable().default(null),
  deadlineAllDay: z.boolean().default(false),
  priority: z.enum(["high", "mid", "low"]).nullable().default(null),
  status: z.enum(["active", "complete"]).default("active"),
  mtime: timestampSchema,
  createdAt: timestampSchema,
  version: versionSchema,
  parentId: idSchema,
  x: gridXSchema,
  y: gridYSchema,
  deletedAt: timestampSchema.nullable().default(null),
  archivedAt: timestampSchema.nullable().default(null),
  pastDeadlineDismissed: z.boolean().default(false),
});

export const createBitSchema = bitSchema.omit({
  id: true,
  mtime: true,
  createdAt: true,
  version: true,
  status: true,
  deletedAt: true,
  archivedAt: true,
  pastDeadlineDismissed: true,
});

export const updateBitSchema = bitSchema
  .omit({
    id: true,
    mtime: true,
    createdAt: true,
    version: true,
    deletedAt: true,
    archivedAt: true,
  })
  .partial();

export type Bit = z.infer<typeof bitSchema>;
export type CreateBit = z.infer<typeof createBitSchema>;
export type UpdateBit = z.infer<typeof updateBitSchema>;

// --- Scratch Breakdown ---

export const scratchBreakdownSchema = z.object({
  id: idSchema,
  scratchBitId: idSchema,
  content: z.string().min(1).max(1000),
  order: z.number().int().min(0).max(INT4_MAX),
  createdAt: timestampSchema,
  consumedAt: timestampSchema.nullable().default(null),
  version: versionSchema,
});

export type ScratchBreakdown = z.infer<typeof scratchBreakdownSchema>;

// --- Staged Candidate ---

export const stagedCandidateSchema = z.object({
  id: idSchema,
  scratchBitId: idSchema,
  sourceBreakdownId: idSchema,
  resultType: z.enum(["node", "bit"]),
  lifecycle: z.literal("staged").default("staged"),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  version: versionSchema,
});

export const createStagedCandidateSchema = stagedCandidateSchema.omit({
  id: true,
  lifecycle: true,
  createdAt: true,
  updatedAt: true,
  version: true,
});

export type StagedCandidate = z.infer<typeof stagedCandidateSchema>;
export type CreateStagedCandidate = z.infer<typeof createStagedCandidateSchema>;

// --- Operation Recovery ---

export const pendingOperationRecoverySchema = z.object({
  operationId: repositoryOperationIdSchema,
  kind: z.literal("archive_scratch"),
  scratchBitId: idSchema,
  expectedVersion: versionSchema,
  startedAt: timestampSchema,
});

export type PendingOperationRecovery = z.infer<typeof pendingOperationRecoverySchema>;

// --- Chunk ---

export const chunkSchema = z.object({
  id: idSchema,
  title: z.string().min(1).max(200),
  description: z.string().max(500).default(""),
  time: timestampSchema.nullable().default(null),
  timeAllDay: z.boolean().default(false),
  status: z.enum(["complete", "incomplete"]).default("incomplete"),
  order: z.number().int().min(0).max(INT4_MAX),
  parentId: idSchema,
});

export const createChunkSchema = chunkSchema.omit({
  id: true,
  status: true,
});

export type Chunk = z.infer<typeof chunkSchema>;
export type CreateChunk = z.infer<typeof createChunkSchema>;
