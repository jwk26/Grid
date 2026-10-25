// The registered test cases of every function in `public` (SCHEMA §Database tests): each
// function needs a cross-account case, and each write function (`security definer`) also a
// change-set case (S14, S31). `coverage.db.test.ts` checks this table against the catalog and
// that each title is a live `it("…")` or `test("…")` in the named file. Add the entry in the
// same task that adds the function.

export type CaseRef = { file: string; title: string };
export type FunctionCases = { crossAccount: CaseRef; changeSet?: CaseRef };

export const FUNCTION_CASES: Record<string, FunctionCases> = {
  ensure_account: {
    crossAccount: {
      file: "ensure-account.db.test.ts",
      title: "leaves another account's rows untouched",
    },
    changeSet: {
      file: "change-set.db.test.ts",
      title: "matches for a first call and for a no-op rerun",
    },
  },
  update_node: {
    crossAccount: {
      file: "update-node.db.test.ts",
      title: "leaves another account's Node untouched and sees nothing of it",
    },
    changeSet: {
      file: "update-node.db.test.ts",
      title: "before + changes equals after for an edit, a no-op, a move and a rejection",
    },
  },
  create_node: {
    crossAccount: {
      file: "node-bit-writes.db.test.ts",
      title: "a duplicate id fails and leaves the existing row unchanged",
    },
    changeSet: {
      file: "node-bit-writes.db.test.ts",
      title: "before + changes equals after for creates, edits, moves, an extension and rejections",
    },
  },
  create_bit: {
    crossAccount: {
      file: "node-bit-writes.db.test.ts",
      title: "a duplicate id fails and leaves the existing row unchanged",
    },
    changeSet: {
      file: "node-bit-writes.db.test.ts",
      title: "before + changes equals after for creates, edits, moves, an extension and rejections",
    },
  },
  update_bit: {
    crossAccount: {
      file: "node-bit-writes.db.test.ts",
      title: "leaves another account's rows untouched and sees nothing of them",
    },
    changeSet: {
      file: "node-bit-writes.db.test.ts",
      title: "before + changes equals after for creates, edits, moves, an extension and rejections",
    },
  },
  create_chunk: {
    crossAccount: {
      file: "chunk-writes.db.test.ts",
      title: "a create with an id another account holds fails and leaves that Chunk unchanged",
    },
    changeSet: {
      file: "chunk-writes.db.test.ts",
      title: "before + changes equals after for create, update, extension, delete, reorder and rejections",
    },
  },
  update_chunk: {
    crossAccount: {
      file: "chunk-writes.db.test.ts",
      title: "leaves another account's Chunks untouched and sees nothing of them",
    },
    changeSet: {
      file: "chunk-writes.db.test.ts",
      title: "before + changes equals after for create, update, extension, delete, reorder and rejections",
    },
  },
  delete_chunk: {
    crossAccount: {
      file: "chunk-writes.db.test.ts",
      title: "leaves another account's Chunks untouched and sees nothing of them",
    },
    changeSet: {
      file: "chunk-writes.db.test.ts",
      title: "before + changes equals after for create, update, extension, delete, reorder and rejections",
    },
  },
  reorder_chunks: {
    crossAccount: {
      file: "chunk-writes.db.test.ts",
      title: "leaves another account's Chunks untouched and sees nothing of them",
    },
    changeSet: {
      file: "chunk-writes.db.test.ts",
      title: "before + changes equals after for create, update, extension, delete, reorder and rejections",
    },
  },
  get_snapshot: {
    crossAccount: {
      file: "snapshot.db.test.ts",
      title: "returns the caller's rows in all five tables and nothing of another account",
    },
  },
  soft_delete_node: {
    crossAccount: {
      file: "trash-writes.db.test.ts",
      title: "leaves another account's rows untouched and sees nothing of them",
    },
    changeSet: {
      file: "trash-writes.db.test.ts",
      title: "before + changes equals after for trash, restore, no-ops and rejections",
    },
  },
  soft_delete_bit: {
    crossAccount: {
      file: "trash-writes.db.test.ts",
      title: "leaves another account's rows untouched and sees nothing of them",
    },
    changeSet: {
      file: "trash-writes.db.test.ts",
      title: "before + changes equals after for trash, restore, no-ops and rejections",
    },
  },
  restore_node: {
    crossAccount: {
      file: "trash-writes.db.test.ts",
      title: "leaves another account's rows untouched and sees nothing of them",
    },
    changeSet: {
      file: "trash-writes.db.test.ts",
      title: "before + changes equals after for trash, restore, no-ops and rejections",
    },
  },
  restore_bit: {
    crossAccount: {
      file: "trash-writes.db.test.ts",
      title: "leaves another account's rows untouched and sees nothing of them",
    },
    changeSet: {
      file: "trash-writes.db.test.ts",
      title: "before + changes equals after for trash, restore, no-ops and rejections",
    },
  },
  archive_node: {
    crossAccount: {
      file: "archive-writes.db.test.ts",
      title: "leaves another account's rows untouched and sees nothing of them",
    },
    changeSet: {
      file: "archive-writes.db.test.ts",
      title: "before + changes equals after for archive, unarchive, no-ops and rejections",
    },
  },
  archive_bit: {
    crossAccount: {
      file: "archive-writes.db.test.ts",
      title: "leaves another account's rows untouched and sees nothing of them",
    },
    changeSet: {
      file: "archive-writes.db.test.ts",
      title: "before + changes equals after for archive, unarchive, no-ops and rejections",
    },
  },
  unarchive_node: {
    crossAccount: {
      file: "archive-writes.db.test.ts",
      title: "leaves another account's rows untouched and sees nothing of them",
    },
    changeSet: {
      file: "archive-writes.db.test.ts",
      title: "before + changes equals after for archive, unarchive, no-ops and rejections",
    },
  },
  unarchive_bit: {
    crossAccount: {
      file: "archive-writes.db.test.ts",
      title: "leaves another account's rows untouched and sees nothing of them",
    },
    changeSet: {
      file: "archive-writes.db.test.ts",
      title: "before + changes equals after for archive, unarchive, no-ops and rejections",
    },
  },
  hard_delete_node: {
    crossAccount: {
      file: "hard-delete-writes.db.test.ts",
      title: "leaves another account's rows untouched",
    },
    changeSet: {
      file: "hard-delete-writes.db.test.ts",
      title: "before + changes equals after for hard deletes, Empty Trash, cleanup, no-ops and rejections",
    },
  },
  hard_delete_bit: {
    crossAccount: {
      file: "hard-delete-writes.db.test.ts",
      title: "leaves another account's rows untouched",
    },
    changeSet: {
      file: "hard-delete-writes.db.test.ts",
      title: "before + changes equals after for hard deletes, Empty Trash, cleanup, no-ops and rejections",
    },
  },
  empty_trash: {
    crossAccount: {
      file: "hard-delete-writes.db.test.ts",
      title: "leaves another account's rows untouched",
    },
    changeSet: {
      file: "hard-delete-writes.db.test.ts",
      title: "before + changes equals after for hard deletes, Empty Trash, cleanup, no-ops and rejections",
    },
  },
  cleanup_expired_trash: {
    crossAccount: {
      file: "hard-delete-writes.db.test.ts",
      title: "leaves another account's rows untouched",
    },
    changeSet: {
      file: "hard-delete-writes.db.test.ts",
      title: "before + changes equals after for hard deletes, Empty Trash, cleanup, no-ops and rejections",
    },
  },
  stage_candidate: {
    crossAccount: {
      file: "stage-commands.db.test.ts",
      title: "leaves another account's rows untouched and sees nothing of them",
    },
    changeSet: {
      file: "stage-commands.db.test.ts",
      title: "before + changes equals after for Stage, Unstage and their rejections",
    },
  },
  reconcile_stage_candidate: {
    crossAccount: {
      file: "stage-commands.db.test.ts",
      title: "leaves another account's rows untouched and sees nothing of them",
    },
    changeSet: {
      file: "stage-commands.db.test.ts",
      title: "before + changes equals after for Stage, Unstage and their rejections",
    },
  },
  unstage_candidate: {
    crossAccount: {
      file: "stage-commands.db.test.ts",
      title: "is refused for another account's candidate and source, with nothing of theirs in changes",
    },
    changeSet: {
      file: "stage-commands.db.test.ts",
      title: "before + changes equals after for Stage, Unstage and their rejections",
    },
  },
  reconcile_unstage_candidate: {
    crossAccount: {
      file: "stage-commands.db.test.ts",
      title: "is refused for another account's candidate and source, with nothing of theirs in changes",
    },
    changeSet: {
      file: "stage-commands.db.test.ts",
      title: "before + changes equals after for Stage, Unstage and their rejections",
    },
  },
  place_staged_candidate: {
    crossAccount: {
      file: "placement-commands.db.test.ts",
      title: "leaves another account's rows untouched and sees nothing of them",
    },
    changeSet: {
      file: "placement-commands.db.test.ts",
      title: "before + changes equals after for placements, reconciles and their rejections",
    },
  },
  reconcile_place_staged_candidate: {
    crossAccount: {
      file: "placement-commands.db.test.ts",
      title: "leaves another account's rows untouched and sees nothing of them",
    },
    changeSet: {
      file: "placement-commands.db.test.ts",
      title: "before + changes equals after for placements, reconciles and their rejections",
    },
  },  place_direct_breakdown: {
    crossAccount: {
      file: "placement-commands.db.test.ts",
      title: "leaves another account's rows untouched and sees nothing of them",
    },
    changeSet: {
      file: "placement-commands.db.test.ts",
      title: "before + changes equals after for direct placements, reconciles and their rejections",
    },
  },
  reconcile_place_direct_breakdown: {
    crossAccount: {
      file: "placement-commands.db.test.ts",
      title: "leaves another account's rows untouched and sees nothing of them",
    },
    changeSet: {
      file: "placement-commands.db.test.ts",
      title: "before + changes equals after for direct placements, reconciles and their rejections",
    },
  },

  promote_bit_to_node: {
    crossAccount: {
      file: "promote-bit.db.test.ts",
      title: "leaves another account's rows untouched and sees nothing of them",
    },
    changeSet: {
      file: "promote-bit.db.test.ts",
      title: "before + changes equals after for promotions and rejections",
    },
  },
  add_breakdown: {
    crossAccount: { file: "breakdown-commands.db.test.ts", title: "leaves another account's rows untouched and sees nothing of them" },
    changeSet: { file: "breakdown-commands.db.test.ts", title: "before + changes equals after for the Breakdown commands and rejections" },
  },
  save_scratch_title: {
    crossAccount: { file: "breakdown-commands.db.test.ts", title: "leaves another account's rows untouched and sees nothing of them" },
    changeSet: { file: "breakdown-commands.db.test.ts", title: "before + changes equals after for the Breakdown commands and rejections" },
  },
  reconcile_add_breakdown: {
    crossAccount: { file: "breakdown-commands.db.test.ts", title: "leaves another account's rows untouched and sees nothing of them" },
    changeSet: { file: "breakdown-commands.db.test.ts", title: "before + changes equals after for the Breakdown commands and rejections" },
  },
  reconcile_save_scratch_title: {
    crossAccount: { file: "breakdown-commands.db.test.ts", title: "leaves another account's rows untouched and sees nothing of them" },
    changeSet: { file: "breakdown-commands.db.test.ts", title: "before + changes equals after for the Breakdown commands and rejections" },
  },
  save_breakdown: {
    crossAccount: { file: "breakdown-commands.db.test.ts", title: "leaves another account's rows untouched and sees nothing of them" },
    changeSet: { file: "breakdown-commands.db.test.ts", title: "before + changes equals after for the Breakdown commands and rejections" },
  },
  delete_breakdown: {
    crossAccount: { file: "breakdown-commands.db.test.ts", title: "leaves another account's rows untouched and sees nothing of them" },
    changeSet: { file: "breakdown-commands.db.test.ts", title: "before + changes equals after for the Breakdown commands and rejections" },
  },
  reconcile_save_breakdown: {
    crossAccount: { file: "breakdown-commands.db.test.ts", title: "leaves another account's rows untouched and sees nothing of them" },
    changeSet: { file: "breakdown-commands.db.test.ts", title: "before + changes equals after for the Breakdown commands and rejections" },
  },
  reconcile_delete_breakdown: {
    crossAccount: { file: "breakdown-commands.db.test.ts", title: "leaves another account's rows untouched and sees nothing of them" },
    changeSet: { file: "breakdown-commands.db.test.ts", title: "before + changes equals after for the Breakdown commands and rejections" },
  },
};
