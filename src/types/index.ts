// Re-export all schema types
export type {
  Bit,
  Chunk,
  CreateBit,
  CreateChunk,
  CreateNode,
  CreateStagedCandidate,
  Node,
  PendingOperationRecovery,
  RepositoryOperationCommand,
  RepositoryOperationId,
  RepositoryOperationResult,
  RepositoryOperationStatus,
  ScratchBreakdown,
  StagedCandidate,
  UnknownRepositoryOperationOutcome,
  UpdateBit,
  UpdateNode,
} from "@/lib/db/schema";

// Computed types — never stored, derived at render time
export type AgingState = "fresh" | "stagnant" | "neglected";
export type UrgencyLevel = 1 | 2 | 3 | null;
export type Priority = "high" | "mid" | "low";
export type GridPosition = { x: number; y: number };
export type BreadcrumbSegment = { id: string; title: string; level: number };
