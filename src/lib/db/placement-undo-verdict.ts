import type {
  Bit,
  Chunk,
  Node,
  ScratchBreakdown,
  StagedCandidate,
} from "@/lib/db/schema";
import type {
  DirectPlacementUndoCommand,
  PlacementUndoResult,
  StagedPlacementUndoCommand,
} from "@/lib/db/datastore";

// The Undo verdict of a placement (SCHEMA §Undo placement), judged from account rows alone. The
// Dexie store reads its state from IndexedDB, the Supabase store from the account snapshot, and
// both apply the same checks in the order of the database function: already undone, owner Scratch
// active, preconditions, then conflict.

export type PlacementUndoState = {
  resultNode: Node | undefined;
  resultBit: Bit | undefined;
  source: ScratchBreakdown | undefined;
  candidate: StagedCandidate | undefined;
  sourceCandidate: StagedCandidate | undefined;
  nodes: readonly Node[];
  bits: readonly Bit[];
  chunks: readonly Chunk[];
  ownerIsActive: boolean;
};

type PlacementUndoCommand = DirectPlacementUndoCommand | StagedPlacementUndoCommand;

export function placementUndoStateResult(state: PlacementUndoState): Node | Bit | null {
  return state.resultNode ?? state.resultBit ?? null;
}

export function matchesPlacementUndoPrecondition(
  command: PlacementUndoCommand,
  state: PlacementUndoState,
  staged: boolean,
): boolean {
  const result = placementUndoStateResult(state);
  if (
    !result ||
    ("level" in command.resultSnapshot ? state.resultBit !== undefined : state.resultNode !== undefined) ||
    !sameFlatRecord(result, command.resultSnapshot) ||
    !validPlacementUndoSnapshots(command, staged) ||
    !state.source ||
    !sameFlatRecord(state.source, command.sourceSnapshot) ||
    placementUndoHasDependencies(command.resultSnapshot.id, state)
  ) {
    return false;
  }

  if (
    command.resultSnapshot.parentId !== null &&
    !state.nodes.some(({ id }) => id === command.resultSnapshot.parentId)
  ) {
    return false;
  }

  if (staged) {
    return (
      "candidateSnapshot" in command &&
      state.candidate === undefined &&
      state.sourceCandidate === undefined
    );
  }
  return state.sourceCandidate === undefined;
}

export function matchesPlacementUndoPostcondition(
  command: PlacementUndoCommand,
  state: PlacementUndoState,
  staged: boolean,
): boolean {
  if (
    state.resultNode !== undefined ||
    state.resultBit !== undefined ||
    placementUndoHasDependencies(command.resultSnapshot.id, state) ||
    !state.source ||
    !sameFlatRecord(state.source, {
      ...command.sourceSnapshot,
      consumedAt: null,
      version: command.sourceSnapshot.version + 1,
    })
  ) {
    return false;
  }

  if (!staged) return state.sourceCandidate === undefined;
  if (!("candidateSnapshot" in command)) return false;

  const candidate = state.candidate ?? state.sourceCandidate;
  return (
    candidate !== undefined &&
    state.candidate?.id === state.sourceCandidate?.id &&
    candidate.updatedAt >= candidate.createdAt &&
    sameFlatRecord(candidate, {
      ...command.candidateSnapshot,
      updatedAt: candidate.updatedAt,
      version: command.candidateSnapshot.version + 1,
    })
  );
}

function validPlacementUndoSnapshots(
  command: PlacementUndoCommand,
  staged: boolean,
): boolean {
  const result = command.resultSnapshot;
  const source = command.sourceSnapshot;
  const isNode = "level" in result;
  if (
    result.version !== 1 ||
    result.createdAt !== result.mtime ||
    result.deletedAt !== null ||
    result.archivedAt !== null ||
    source.consumedAt !== result.createdAt
  ) {
    return false;
  }
  if (isNode && (result.systemRole !== null || result.hiddenFromGrid)) return false;

  if (!staged) return !("candidateSnapshot" in command);
  if (!("candidateSnapshot" in command)) return false;
  const candidate = command.candidateSnapshot;
  return (
    candidate.scratchBitId === source.scratchBitId &&
    candidate.sourceBreakdownId === source.id &&
    candidate.resultType === (isNode ? "node" : "bit") &&
    candidate.lifecycle === "staged"
  );
}

function placementUndoHasDependencies(
  resultId: string,
  state: PlacementUndoState,
): boolean {
  return (
    state.nodes.some(({ parentId }) => parentId === resultId) ||
    state.bits.some(({ parentId }) => parentId === resultId) ||
    state.chunks.some(({ parentId }) => parentId === resultId)
  );
}

function sameFlatRecord<T extends object>(actual: T, expected: T): boolean {
  const actualRecord = actual as Record<string, unknown>;
  const expectedRecord = expected as Record<string, unknown>;
  const actualKeys = Object.keys(actualRecord);
  const expectedKeys = Object.keys(expectedRecord);
  return (
    actualKeys.length === expectedKeys.length &&
    expectedKeys.every((key) => actualRecord[key] === expectedRecord[key])
  );
}

export function placementUndoVerdict(
  command: PlacementUndoCommand,
  state: PlacementUndoState,
  staged: boolean,
): PlacementUndoResult {
  return {
    operationId: command.operationId,
    status: matchesPlacementUndoPostcondition(command, state, staged)
      ? "already_applied"
      : !state.ownerIsActive
        ? "rejected"
        : matchesPlacementUndoPrecondition(command, state, staged)
          ? "not_applied"
          : "conflict",
    result: placementUndoStateResult(state),
    source: state.source ?? null,
    candidate: staged ? (state.candidate ?? state.sourceCandidate ?? null) : (state.sourceCandidate ?? null),
  };
}
