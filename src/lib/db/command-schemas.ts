import { z } from "zod";
import {
  bitSchema,
  candidateOrphanAuditEventSchema,
  nodeSchema,
  repositoryOperationIdSchema,
  repositoryOperationStatusSchema,
  scratchBreakdownSchema,
  stagedCandidateSchema,
} from "@/lib/db/schema";

// The Zod schemas of the Inbox/Triage commands and their results. Both stores parse a command at
// the client write boundary (SPEC Architecture Rule 5); the Dexie store also parses its results.

export const commandVersionSchema = z.number().int().min(1);

export const addBreakdownCommandSchema = z.object({
  operationId: repositoryOperationIdSchema,
  breakdownId: z.string().uuid(),
  scratchBitId: z.string().uuid(),
  scratchExpectedVersion: commandVersionSchema,
  content: z.string().min(1).max(1000),
}).strict();

export const saveScratchTitleCommandSchema = z.object({
  operationId: repositoryOperationIdSchema,
  scratchBitId: z.string().uuid(),
  expectedVersion: commandVersionSchema,
  baseTitle: z.string().min(1).max(200),
  title: z.string().min(1).max(200),
}).strict();

export const saveBreakdownCommandSchema = z.object({
  operationId: repositoryOperationIdSchema,
  breakdownId: z.string().uuid(),
  expectedVersion: commandVersionSchema,
  baseContent: z.string().min(1).max(1000),
  baseOrder: z.number().int().min(0),
  content: z.string().min(1).max(1000),
  order: z.number().int().min(0),
}).strict();

export const deleteBreakdownCommandSchema = z.object({
  operationId: repositoryOperationIdSchema,
  breakdownId: z.string().uuid(),
  expectedVersion: commandVersionSchema,
  scratchBitId: z.string().uuid(),
  scratchExpectedVersion: commandVersionSchema,
}).strict();

export const stageCandidateCommandSchema = z.object({
  operationId: repositoryOperationIdSchema,
  candidateId: z.string().uuid(),
  scratchBitId: z.string().uuid(),
  sourceBreakdownId: z.string().uuid(),
  sourceExpectedVersion: commandVersionSchema,
  resultType: z.enum(["node", "bit"]),
}).strict();

export const unstageCandidateCommandSchema = z.object({
  operationId: repositoryOperationIdSchema,
  candidateId: z.string().uuid(),
  candidateExpectedVersion: commandVersionSchema,
  sourceBreakdownId: z.string().uuid(),
  sourceExpectedVersion: commandVersionSchema,
}).strict();

export const confirmedCandidateOrphanProofSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("confirmed"),
    cause: z.enum(["source_deleted", "source_tombstoned"]),
    sourceBreakdownId: z.string().uuid(),
  }).strict(),
  z.object({
    status: z.literal("unresolved"),
    reason: z.enum(["cache_miss", "offline", "delayed_subscription"]),
  }).strict(),
  z.object({
    status: z.literal("planned_aggregate"),
    sourceBreakdownId: z.string().uuid(),
  }).strict(),
]);

export const confirmedCandidateOrphanCleanupCommandSchema = z.object({
  operationId: repositoryOperationIdSchema,
  auditEventId: z.string().uuid(),
  candidateId: z.string().uuid(),
  candidateExpectedVersion: commandVersionSchema,
  sourceBreakdownId: z.string().uuid(),
  scratchBitId: z.string().uuid(),
  resultType: z.enum(["node", "bit"]),
  proof: confirmedCandidateOrphanProofSchema,
}).strict();

export const placementCommandShape = {
  operationId: repositoryOperationIdSchema,
  resultId: z.string().uuid(),
  scratchBitId: z.string().uuid(),
  sourceBreakdownId: z.string().uuid(),
  sourceExpectedVersion: commandVersionSchema,
  resultType: z.enum(["node", "bit"]),
  title: z.string().min(1).max(1000),
  targetParentId: z.string().uuid().nullable(),
  expectedAncestorIds: z.array(z.string().uuid()),
  x: z.number().int(),
  y: z.number().int(),
};

export const stagedPlacementCommandSchema = z.object({
  ...placementCommandShape,
  candidateId: z.string().uuid(),
  candidateExpectedVersion: commandVersionSchema,
}).strict();

export const directPlacementCommandSchema = z.object(placementCommandShape).strict();

export const placementUndoCommandShape = {
  operationId: repositoryOperationIdSchema,
  resultSnapshot: z.union([nodeSchema, bitSchema]),
  sourceSnapshot: scratchBreakdownSchema,
};

export const stagedPlacementUndoCommandSchema = z.object({
  ...placementUndoCommandShape,
  candidateSnapshot: stagedCandidateSchema,
}).strict();

export const directPlacementUndoCommandSchema = z.object(placementUndoCommandShape).strict();

export const archiveScratchCommandSchema = z.object({
  operationId: repositoryOperationIdSchema,
  scratchBitId: z.string().uuid(),
  expectedVersion: commandVersionSchema,
  callerAssertion: z.object({
    addDraftClear: z.literal(true),
    titleBlockerClear: z.literal(true),
  }).strict(),
}).strict();

export const trashScratchCommandSchema = z.object({
  operationId: repositoryOperationIdSchema,
  scratchBitId: z.string().uuid(),
  expectedVersion: commandVersionSchema,
  candidates: z.array(z.object({
    candidateId: z.string().uuid(),
    candidateExpectedVersion: commandVersionSchema,
    sourceBreakdownId: z.string().uuid(),
    sourceExpectedVersion: commandVersionSchema,
  }).strict()).refine(
    (items) =>
      new Set(items.map((item) => item.candidateId)).size === items.length &&
      new Set(items.map((item) => item.sourceBreakdownId)).size === items.length,
    "Trash Scratch candidates must be a set",
  ),
}).strict();

export const trashScratchResultSchema = z.object({
  operationId: repositoryOperationIdSchema,
  status: repositoryOperationStatusSchema,
  scratch: bitSchema.nullable(),
  candidates: z.array(stagedCandidateSchema),
}).strict();

export const addBreakdownResultSchema = z.object({
  operationId: repositoryOperationIdSchema,
  status: repositoryOperationStatusSchema,
  breakdown: scratchBreakdownSchema.nullable(),
  scratch: bitSchema.nullable(),
}).strict();

export const saveScratchTitleResultSchema = z.object({
  operationId: repositoryOperationIdSchema,
  status: repositoryOperationStatusSchema,
  scratch: bitSchema.nullable(),
}).strict();

export const saveBreakdownResultSchema = z.object({
  operationId: repositoryOperationIdSchema,
  status: repositoryOperationStatusSchema,
  breakdown: scratchBreakdownSchema.nullable(),
  candidate: stagedCandidateSchema.nullable(),
  scratch: bitSchema.nullable(),
}).strict();

export const deleteBreakdownResultSchema = z.object({
  operationId: repositoryOperationIdSchema,
  status: repositoryOperationStatusSchema,
  breakdown: scratchBreakdownSchema.nullable(),
  candidate: stagedCandidateSchema.nullable(),
  scratch: bitSchema.nullable(),
}).strict();

export const stageCandidateResultSchema = z.object({
  operationId: repositoryOperationIdSchema,
  status: repositoryOperationStatusSchema,
  candidate: stagedCandidateSchema.nullable(),
  source: scratchBreakdownSchema.nullable(),
  scratch: bitSchema.nullable(),
}).strict();

export const unstageCandidateResultSchema = z.object({
  operationId: repositoryOperationIdSchema,
  status: repositoryOperationStatusSchema,
  candidate: stagedCandidateSchema.nullable(),
  source: scratchBreakdownSchema.nullable(),
}).strict();

export const confirmedCandidateOrphanCleanupResultSchema = z.object({
  operationId: repositoryOperationIdSchema,
  status: repositoryOperationStatusSchema,
  candidate: stagedCandidateSchema.nullable(),
  source: scratchBreakdownSchema.nullable(),
  auditEvent: candidateOrphanAuditEventSchema.nullable(),
}).strict();

export const placementResultSchema = z.object({
  operationId: repositoryOperationIdSchema,
  status: repositoryOperationStatusSchema,
  result: z.union([nodeSchema, bitSchema]).nullable(),
  source: scratchBreakdownSchema.nullable(),
  candidate: stagedCandidateSchema.nullable(),
}).strict();

export const placementUndoResultSchema = placementResultSchema;

export const scratchArchiveEligibilitySchema = z.object({
  eligible: z.boolean(),
  scratch: bitSchema.nullable(),
  consumedCount: z.number().int().min(0),
  unconsumedCount: z.number().int().min(0),
  stagedCandidateCount: z.number().int().min(0),
}).strict();

export const archiveScratchResultSchema = z.object({
  operationId: repositoryOperationIdSchema,
  status: repositoryOperationStatusSchema,
  scratch: bitSchema.nullable(),
}).strict();

export const archiveScratchRecoveryResultSchema = z.union([
  z.object({
    operationId: repositoryOperationIdSchema,
    status: z.enum(["applied", "not_applied", "conflict"]),
    scratch: bitSchema.nullable(),
  }).strict(),
  z.object({
    operationId: repositoryOperationIdSchema,
    outcome: z.literal("unknown"),
  }).strict(),
]);
