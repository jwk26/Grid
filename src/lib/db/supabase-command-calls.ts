import type {
  AddBreakdownCommand,
  DeleteBreakdownCommand,
  DirectPlacementCommand,
  DirectPlacementUndoCommand,
  SaveBreakdownCommand,
  SaveScratchTitleCommand,
  StageCandidateCommand,
  StagedPlacementCommand,
  StagedPlacementUndoCommand,
  TrashScratchCommand,
  UnstageCandidateCommand,
} from "@/lib/db/datastore";
import { bitToRow, nodeToRow, scratchBreakdownToRow, stagedCandidateToRow } from "@/lib/db/row-mapping";
import type { PendingOperationRecovery } from "@/lib/db/schema";
import type { Args, Functions } from "@/lib/db/supabase-calls";

// The arguments of the Inbox/Triage command functions (SCHEMA §Inbox/Triage command functions).
// No function takes the `operationId`: the client keeps it for correlation. Each builder is typed
// against the generated function signature, so a renamed argument fails `pnpm typecheck`.

export type FunctionCall = { name: keyof Functions; args: Record<string, unknown> };

const call = <Name extends keyof Functions>(name: Name, args: Args<Name>): FunctionCall => ({
  name,
  args: args as Record<string, unknown>,
});

export const addBreakdownArgs = (c: AddBreakdownCommand): Args<"add_breakdown"> => ({
  p_scratch_id: c.scratchBitId,
  p_scratch_expected_version: c.scratchExpectedVersion,
  p_breakdown_id: c.breakdownId,
  p_content: c.content,
});
export const addBreakdownCall = (c: AddBreakdownCommand) => call("add_breakdown", addBreakdownArgs(c));
export const reconcileAddBreakdownCall = (c: AddBreakdownCommand) =>
  call("reconcile_add_breakdown", addBreakdownArgs(c));

export const saveScratchTitleArgs = (c: SaveScratchTitleCommand): Args<"save_scratch_title"> => ({
  p_scratch_id: c.scratchBitId,
  p_expected_version: c.expectedVersion,
  p_base_title: c.baseTitle,
  p_title: c.title,
});
export const saveScratchTitleCall = (c: SaveScratchTitleCommand) =>
  call("save_scratch_title", saveScratchTitleArgs(c));
export const reconcileSaveScratchTitleCall = (c: SaveScratchTitleCommand) =>
  call("reconcile_save_scratch_title", saveScratchTitleArgs(c));

export const saveBreakdownArgs = (c: SaveBreakdownCommand): Args<"save_breakdown"> => ({
  p_id: c.breakdownId,
  p_expected_version: c.expectedVersion,
  p_base_content: c.baseContent,
  p_base_order: c.baseOrder,
  p_content: c.content,
  p_order: c.order,
});
export const saveBreakdownCall = (c: SaveBreakdownCommand) => call("save_breakdown", saveBreakdownArgs(c));
export const reconcileSaveBreakdownCall = (c: SaveBreakdownCommand) =>
  call("reconcile_save_breakdown", saveBreakdownArgs(c));

export const deleteBreakdownArgs = (c: DeleteBreakdownCommand): Args<"delete_breakdown"> => ({
  p_id: c.breakdownId,
  p_expected_version: c.expectedVersion,
  p_scratch_id: c.scratchBitId,
  p_scratch_expected_version: c.scratchExpectedVersion,
});
export const deleteBreakdownCall = (c: DeleteBreakdownCommand) =>
  call("delete_breakdown", deleteBreakdownArgs(c));
export const reconcileDeleteBreakdownCall = (c: DeleteBreakdownCommand) =>
  call("reconcile_delete_breakdown", deleteBreakdownArgs(c));

export const stageCandidateArgs = (c: StageCandidateCommand): Args<"stage_candidate"> => ({
  p_candidate_id: c.candidateId,
  p_scratch_id: c.scratchBitId,
  p_source_id: c.sourceBreakdownId,
  p_source_expected_version: c.sourceExpectedVersion,
  p_result_type: c.resultType,
});
export const stageCandidateCall = (c: StageCandidateCommand) => call("stage_candidate", stageCandidateArgs(c));
export const reconcileStageCandidateCall = (c: StageCandidateCommand) =>
  call("reconcile_stage_candidate", stageCandidateArgs(c));

export const unstageCandidateArgs = (c: UnstageCandidateCommand): Args<"unstage_candidate"> => ({
  p_candidate_id: c.candidateId,
  p_candidate_expected_version: c.candidateExpectedVersion,
  p_source_id: c.sourceBreakdownId,
  p_source_expected_version: c.sourceExpectedVersion,
});
export const unstageCandidateCall = (c: UnstageCandidateCommand) =>
  call("unstage_candidate", unstageCandidateArgs(c));
export const reconcileUnstageCandidateCall = (c: UnstageCandidateCommand) =>
  call("reconcile_unstage_candidate", unstageCandidateArgs(c));

const directPlacementArgs = (c: DirectPlacementCommand): Args<"place_direct_breakdown"> => ({
  p_result_id: c.resultId,
  p_scratch_id: c.scratchBitId,
  p_source_id: c.sourceBreakdownId,
  p_source_expected_version: c.sourceExpectedVersion,
  p_result_type: c.resultType,
  p_title: c.title,
  p_target_parent_id: c.targetParentId as string,
  p_expected_ancestor_ids: [...c.expectedAncestorIds],
  p_x: c.x,
  p_y: c.y,
});
const stagedPlacementArgs = (c: StagedPlacementCommand): Args<"place_staged_candidate"> => ({
  ...directPlacementArgs(c),
  p_candidate_id: c.candidateId,
  p_candidate_expected_version: c.candidateExpectedVersion,
});
export const placeStagedCall = (c: StagedPlacementCommand) =>
  call("place_staged_candidate", stagedPlacementArgs(c));
export const reconcileStagedPlacementCall = (c: StagedPlacementCommand) =>
  call("reconcile_place_staged_candidate", stagedPlacementArgs(c));
export const placeDirectCall = (c: DirectPlacementCommand) =>
  call("place_direct_breakdown", directPlacementArgs(c));
export const reconcileDirectPlacementCall = (c: DirectPlacementCommand) =>
  call("reconcile_place_direct_breakdown", directPlacementArgs(c));

// The Undo functions take the complete snake_case rows of the placement's `changes`, compared with
// `user_id` dropped on both sides; a Node result is told by its `level` key.
const withoutUser = <Row extends { user_id: string }>(row: Row): Omit<Row, "user_id"> => {
  const rest: Partial<Row> = { ...row };
  delete rest.user_id;
  return rest as Omit<Row, "user_id">;
};
const resultRow = (result: DirectPlacementUndoCommand["resultSnapshot"]) =>
  "level" in result ? withoutUser(nodeToRow(result, "")) : withoutUser(bitToRow(result, ""));
const directUndoArgs = (c: DirectPlacementUndoCommand): Args<"undo_direct_placement"> => ({
  p_result: resultRow(c.resultSnapshot),
  p_source: withoutUser(scratchBreakdownToRow(c.sourceSnapshot, "")),
});
const stagedUndoArgs = (c: StagedPlacementUndoCommand): Args<"undo_staged_placement"> => ({
  ...directUndoArgs(c),
  p_candidate: withoutUser(stagedCandidateToRow(c.candidateSnapshot, "")),
});
export const undoStagedCall = (c: StagedPlacementUndoCommand) => call("undo_staged_placement", stagedUndoArgs(c));
export const reconcileStagedUndoCall = (c: StagedPlacementUndoCommand) =>
  call("reconcile_undo_staged_placement", stagedUndoArgs(c));
export const undoDirectCall = (c: DirectPlacementUndoCommand) => call("undo_direct_placement", directUndoArgs(c));
export const reconcileDirectUndoCall = (c: DirectPlacementUndoCommand) =>
  call("reconcile_undo_direct_placement", directUndoArgs(c));

export const archiveScratchCall = (c: { scratchBitId: string; expectedVersion: number }) =>
  call("archive_scratch", { p_scratch_id: c.scratchBitId, p_expected_version: c.expectedVersion });

export const classifyRecoveryCall = (c: PendingOperationRecovery) =>
  call("classify_archive_scratch_recovery", {
    p_scratch_id: c.scratchBitId,
    p_expected_version: c.expectedVersion,
    p_started_at: c.startedAt,
  });

const trashArgs = (c: TrashScratchCommand): Args<"trash_scratch"> => ({
  p_scratch_id: c.scratchBitId,
  p_expected_version: c.expectedVersion,
  p_candidates: c.candidates.map((item) => ({
    candidate_id: item.candidateId,
    candidate_expected_version: item.candidateExpectedVersion,
    source_breakdown_id: item.sourceBreakdownId,
    source_expected_version: item.sourceExpectedVersion,
  })),
});
export const trashScratchCall = (c: TrashScratchCommand) => call("trash_scratch", trashArgs(c));
export const reconcileTrashScratchCall = (c: TrashScratchCommand) => call("reconcile_trash_scratch", trashArgs(c));
