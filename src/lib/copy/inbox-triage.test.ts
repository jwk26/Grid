import { describe, expect, it } from "vitest";
import {
  INBOX_TRIAGE_COPY,
  RECEIPT_COPY_UNAVAILABLE,
  isInboxTriageCopyAvailable,
} from "./inbox-triage";

describe("Inbox/Triage core-English copy", () => {
  it("owns only the approved static Explorer Bit accessibility labels", () => {
    expect(INBOX_TRIAGE_COPY).toHaveProperty("explorerBitStatus", {overdue:"Overdue",completed:"Completed"});
  });

  it("owns the source-approved section names and base actions", () => {
    expect(INBOX_TRIAGE_COPY.sectionNames).toEqual({
      scratchPool: "Scratch Pool",
      breakdown: "Breakdown",
      staging: "Staging",
      stagingNodes: "Nodes",
      stagingBits: "Bits",
      gridExplorer: "Grid Explorer",
    });
    expect(INBOX_TRIAGE_COPY.baseActions).toEqual({
      add: "Add",
      edit: "Edit",
      delete: "Delete",
      save: "Save",
      cancel: "Cancel",
      clearSearch: "Clear search",
      expandScratchPool: "Expand Scratch Pool",
      collapseScratchPool: "Collapse Scratch Pool",
      sortNewestFirst: "Sort: newest first",
      sortOldestFirst: "Sort: oldest first",
      sortTrackOld: "OLD",
      sortTrackNew: "NEW",
    });
  });

  it("owns the approved Context decoration and next-order labels", () => {
    expect(INBOX_TRIAGE_COPY).toHaveProperty("contextPresentation", {
      folderDialogInfo: "[ FOLDER DIALOG: INFO ]",
      decorativeClose: "[X]",
      lastStampPrefix: "LAST_STAMP:",
      nextOldestFirst: "OLD FIRST",
      nextNewestFirst: "NEW FIRST",
    });
  });

  it("types validation, lifecycle, and live-region keys without inventing reserved copy", () => {
    expect(Object.values(INBOX_TRIAGE_COPY.validation)).toEqual([
      "Enter a Scratch title.",
      "Enter breakdown content.",
      "Enter a result title.",
      "Use {limit} characters or fewer.",
    ]);
    expect(Object.values(INBOX_TRIAGE_COPY.lifecycleReasons)).toEqual([
      RECEIPT_COPY_UNAVAILABLE,
      "Pool updated elsewhere.",
      "This item is no longer available.",
      "This path is no longer available. Returned to {destination}.",
      "Placement closed because this Explorer path changed.",
      "This item or its source changed. Undo is unavailable.",
      RECEIPT_COPY_UNAVAILABLE,
      "Checking the Archive request from before this reload…",
    ]);
    expect(Object.values(INBOX_TRIAGE_COPY.liveRegions)).toHaveLength(14);
    expect(INBOX_TRIAGE_COPY.liveRegions.poolActivity).toBe(
      "Pool updated elsewhere.",
    );
    expect(INBOX_TRIAGE_COPY.liveRegions.stagingActivity).toBe(
      "Staging updated.",
    );
    expect(
      Object.entries(INBOX_TRIAGE_COPY.liveRegions).every(
        ([key, value]) =>
          key === "poolActivity" ||
          key === "stagingActivity" ||
          key === "explorerSearch" ||
          key === "newlyPlacedUndo" ||
          (key === "archive" && value === "Scratch archived.") ||
          value === RECEIPT_COPY_UNAVAILABLE,
      ),
    ).toBe(true);
    expect(INBOX_TRIAGE_COPY.accessibleNames).toEqual({
      scratchPool: "Scratch Pool",
      breakdown: "Breakdown",
      staging: "Staging",
      stagingNodes: "Node staging zone",
      stagingBits: "Bit staging zone",
      gridExplorer: "Grid Explorer",
      searchScratches: "Search scratches",
      clearPoolSearch: "Clear search",
      moveSelectedScratchToTrash: "Move selected Scratch to Trash",
      moveScratchToTrash: 'Move "{title}" to Trash',
    });
  });

  it("owns the exact Phase 41 Scratch Trash wording", () => {
    expect(INBOX_TRIAGE_COPY.scratchTrash).toEqual({
      title: "Move Scratch to Trash?",
      body: '"{title}" moves to Trash. You can restore it from Trash for 30 days.',
      stagedOne: "1 staged item will be removed from Staging.",
      stagedMany: "{count} staged items will be removed from Staging.",
      draft: "Your unsaved draft in this Scratch will be discarded.",
      tooltip: "Move to Trash",
      disabled: {
        placementOpen: "Finish or cancel placement to move a Scratch to Trash.",
        unresolvedSource:
          "A staged item in this Scratch lost its source. Resolve it in Staging first.",
      },
      actions: {
        cancel: "Cancel",
        confirm: "Move to Trash",
        retry: "Retry",
        checkAgain: "Check again",
      },
      states: {
        pending: "Moving to Trash…",
        notApplied: "Couldn't move this Scratch to Trash.",
        unknown: "Checking whether this Scratch moved to Trash…",
        conflict: "This Scratch changed. Review and confirm again.",
        rejected:
          "A staged item in this Scratch lost its source. Resolve it in Staging first.",
        success: 'Moved "{title}" to Trash.',
      },
    });
  });

  it("owns the complete approved DP-VQ04 inline-editor wording", () => {
    expect(INBOX_TRIAGE_COPY.inlineEditor).toEqual({
      status: {
        pristine: "No changes.",
        dirty: "Unsaved changes.",
        saving: "Saving…",
        savingBeforeContinuing: "Saving before continuing…",
        notApplied: "Not saved. Your draft is still here.",
        reconciling: "Checking whether your changes were saved…",
        saved: "Saved.",
      },
      conflict: {
        heading: "This changed elsewhere.",
        latest: "Latest version",
        draft: "Your draft",
        useMine: "Use mine",
        useLatest: "Use latest",
        copyDraft: "Copy draft",
        latestUpdated: "Latest version updated.",
      },
      recovery: {
        heading: "Draft not saved",
        scratchInvalid: "This Scratch is no longer editable.",
        breakdownInvalid: "This breakdown is no longer editable.",
        review: "Review or copy your draft before closing.",
        copied: "Copied.",
        close: "Close",
      },
      actions: {
        stayHere: "Stay here",
      },
    });
    expect(INBOX_TRIAGE_COPY.liveRegions.inlineEditor).toBe(
      RECEIPT_COPY_UNAVAILABLE,
    );
  });

  it("owns only the approved DP-VQ11 withdrawal wording, with no Add or title blocker copy", () => {
    expect(INBOX_TRIAGE_COPY.completion).toEqual({
      withdrawal: {
        activeBreakdown:
          "Completion is no longer available because a Breakdown item is active.",
        staging:
          "Completion is no longer available because an item is in Staging.",
        breakdownAndStaging:
          "Completion is no longer available because Breakdown and Staging have active items.",
      },
    });
    expect("addBlocker" in INBOX_TRIAGE_COPY.completion).toBe(false);
    expect("titleBlocker" in INBOX_TRIAGE_COPY.completion).toBe(false);
    expect(160 in INBOX_TRIAGE_COPY.receiptDependent).toBe(false);
  });

  it("owns the exact approved DP-VQ12 Archive state and action wording", () => {
    expect(INBOX_TRIAGE_COPY.archive).toEqual({
      states: {
        pending: "Archiving this Scratch…",
        unknown: "We couldn’t confirm whether this Scratch was archived.",
        reconciling: "Checking whether this Scratch was archived…",
        forcedReload: "Checking the Archive request from before this reload…",
        notApplied: "This Scratch was not archived.",
        storageFailure:
          "Archive couldn’t start because this tab couldn’t keep its recovery details.",
        rejected: "Archive stopped because this Scratch is no longer ready.",
        conflict:
          "Archive couldn’t finish because this Scratch changed while the result was being checked.",
        success: "Scratch archived.",
      },
      confirmationDetail:
        "Every idea segment in “{title}” has been successfully placed. File it to disk?",
      actions: {
        checkAgain: "Check again",
        retry: "Retry",
        cancel: "Cancel",
      },
    });
    expect(INBOX_TRIAGE_COPY.lifecycleReasons.archiveRecovery).toBe(
      INBOX_TRIAGE_COPY.archive.states.forcedReload,
    );
    expect(INBOX_TRIAGE_COPY.liveRegions.archive).toBe(
      INBOX_TRIAGE_COPY.archive.states.success,
    );
    expect(162 in INBOX_TRIAGE_COPY.receiptDependent).toBe(false);
  });

  it("owns the complete approved DP-VQ03 departure wording", () => {
    expect(INBOX_TRIAGE_COPY.departure).toEqual({
      eyebrow: "Unsaved Add draft",
      heading: "Keep writing?",
      description:
        "Continue writing here, or discard this draft and move.",
      continueAction: "Continue writing",
      discardAction: "Discard and move",
    });
  });

  it("owns the exact non-selected-Bit DP-VQ06 Explorer status wording", () => {
    expect(INBOX_TRIAGE_COPY.explorerStatus).toEqual({
      arrival: { one: "1 new", many: "{count} new" },
      path: {
        unavailable:
          "“{title}” is no longer available. Returned to {destination}.",
        archived: "“{title}” was archived. Returned to {destination}.",
        moved: "“{title}” moved elsewhere. Returned to {destination}.",
        invalid:
          "This path is no longer available. Returned to {destination}.",
        stalePlacement: "Placement closed because this Explorer path changed.",
        selectionCleared:
          "“{title}” is no longer available. Selection cleared.",
      },
      actions: {
        showNewIn: "Show new in {level}",
        dismiss: "Dismiss",
      },
    });
    expect(INBOX_TRIAGE_COPY.lifecycleReasons.explorerPathFallback).toBe(
      "This path is no longer available. Returned to {destination}.",
    );
    expect(INBOX_TRIAGE_COPY.lifecycleReasons.placementStale).toBe(
      "Placement closed because this Explorer path changed.",
    );
  });

  it("owns the complete approved DP-VQ07 Explorer search wording and selected-Bit correction", () => {
    expect(INBOX_TRIAGE_COPY.explorerSearch).toEqual({
      entry: "Search Explorer",
      placeholder: "Search all Nodes and Bits",
      closeAccessibleName: "Clear and close Explorer search",
      status: {
        preSearch: "Search the entire Grid Explorer.",
        loading: "Searching Grid Explorer…",
        refreshing: "Updating results…",
        noResults: "No results for “{query}”.",
        error: "Search couldn’t be updated.",
        staleSelection:
          "That item is no longer available. Results were updated.",
        revealed: "Revealed “{title}” in {breadcrumb}.",
      },
      duplicate: "Duplicate {index} of {count}",
      actions: { retry: "Try again" },
    });
    expect(INBOX_TRIAGE_COPY.explorerStatus.path.selectionCleared).toBe(
      "“{title}” is no longer available. Selection cleared.",
    );
    expect(INBOX_TRIAGE_COPY.liveRegions.explorerSearch).toBe(
      "Search the entire Grid Explorer.",
    );
    expect(151 in INBOX_TRIAGE_COPY.receiptDependent).toBe(false);
  });

  it("owns the complete approved DP-VQ01 external-removal wording", () => {
    expect(INBOX_TRIAGE_COPY.externalRemoval).toEqual({
      title: {
        archive: "This Scratch was archived elsewhere",
        delete: "This Scratch was deleted elsewhere",
      },
      destination: {
        running: "Moving to “{title}” in {seconds} seconds.",
        runningSearchEmpty:
          "No matching Scratch is visible. Clearing the selection in {seconds} seconds.",
        runningInboxEmpty:
          "No active Scratches remain. Opening the empty Inbox in {seconds} seconds.",
        paused: "Movement paused. Destination: “{title}”.",
        pausedSearchEmpty:
          "Movement paused. No matching Scratch is visible; the selection will clear.",
        pausedInboxEmpty:
          "Movement paused. No active Scratches remain; the empty Inbox will open.",
      },
      drafts: {
        heading: "Copy drafts before moving",
        explanation:
          "These drafts exist only on this page and will not move with the Scratch.",
        add: "New Breakdown draft",
        scratchTitle: "Scratch title draft",
        breakdown: "Breakdown draft",
        copy: "Copy full draft",
        copied: "Copied",
      },
      actions: { moveNow: "Move now", pause: "Pause", resume: "Resume" },
    });
  });

  it("owns the complete approved DP-VQ05 Add/Delete reliability wording", () => {
    expect(INBOX_TRIAGE_COPY.reliability).toEqual({
      add: {
        pending: "Adding…",
        unknown: "We couldn’t confirm whether it was added.",
        reconciling: "Checking whether it was added…",
        notApplied: "Not added. Your draft is still here.",
        rejected: "Add unavailable. Your draft is still here.",
        rejectedAccountLimit:
          "Add unavailable. This account has reached its limit of {limit} breakdowns. Your draft is still here.",
        conflict: "This Scratch changed. Your draft is still here.",
      },
      delete: {
        pending: "Deleting…",
        unknown: "We couldn’t confirm whether it was deleted.",
        reconciling: "Checking whether it was deleted…",
        notApplied: "Not deleted. This breakdown is still here.",
        rejected: "Delete unavailable. This breakdown is still here.",
        conflict: "This breakdown changed. Delete was not completed.",
      },
      actions: {
        checkAgain: "Check again",
        retryAdd: "Retry Add",
      },
    });
  });

  it("owns the exact approved DP-VQ08 placement reliability wording", () => {
    expect(INBOX_TRIAGE_COPY.placementReliability).toEqual({
      pending: "Placing “{title}” in {destination}…",
      unknown: "We couldn’t confirm whether “{title}” was placed.",
      reconciling: "Checking whether “{title}” was placed…",
      notApplied: "“{title}” wasn’t placed. Your source is unchanged.",
      staleSource:
        "The source changed. Nothing was placed. Cancel and drag it again.",
      staleTarget:
        "The destination changed. Nothing was placed. Cancel and drag to the current destination.",
      accountLimit:
        "“{title}” wasn’t placed. This account has reached its limit of {limit} {items}. Your source is unchanged.",
      accountLimitItems: { nodes: "Nodes", bits: "Bits" },
      success: "Placed “{title}” in {destination}.",
      actions: {
        checkAgain: "Check again",
        retry: "Retry",
        cancel: "Cancel",
      },
    });
  });

  it("owns the exact approved DP-VQ09 Result Title and direct-limit wording", () => {
    expect(INBOX_TRIAGE_COPY.placementTitleLimits).toEqual({
      resultTitle: {
        eyebrow: "RESULT TITLE",
        heading: "Name this {type}",
        explanation:
          "The source is {count} characters. A {type} title can be up to {limit}. The source won’t change.",
        label: "Result title",
        counter: "{count} / {limit}",
        emptyError: "Enter a result title.",
        overLimitError: "Use {limit} characters or fewer.",
        actions: { continue: "Continue", cancel: "Cancel" },
      },
      direct: {
        eyebrow: "DIRECT PLACEMENT",
        heading: "Choose a result type",
        nodeReason:
          "Node titles can be up to 100 characters. This source has {count}.",
        bitReason:
          "Bit titles can be up to 200 characters. This source has {count}.",
        neitherAvailable:
          "This source is too long for direct placement. Cancel and stage it first.",
        actions: { node: "Node", bit: "Bit", cancel: "Cancel" },
      },
    });
    expect(154 in INBOX_TRIAGE_COPY.receiptDependent).toBe(false);
  });

  it("owns the hidden Add/Unstage announcement wording", () => {
    expect(INBOX_TRIAGE_COPY.breakdownAnnouncement).toEqual({
      add: "Added.",
      unstage: "Returned to Breakdown.",
    });
  });

  it("owns the complete approved DP-VQ06-POOL wording", () => {
    expect(INBOX_TRIAGE_COPY.poolStatus).toEqual({
      filteredCount: "{visible} of {total} Scratches",
      hiddenSelection: "Selected Scratch is hidden by this search.",
      arrivalOne: "1 new Scratch arrived.",
      arrivalMany: "{count} new Scratches arrived.",
      archiveOne: "A Scratch was archived elsewhere.",
      archiveMany: "{count} Scratches were archived elsewhere.",
      deleteOne: "A Scratch was deleted elsewhere.",
      deleteMany: "{count} Scratches were deleted elsewhere.",
      restoreOne: "A Scratch was restored.",
      restoreMany: "{count} Scratches were restored.",
      mixed: "Pool updated elsewhere: {clauses}.",
      compactLifecycle: "Pool updated elsewhere.",
      actions: {
        clearSearch: "Clear search",
        reviewNew: "Review new",
        dismiss: "Dismiss",
      },
    });
    expect(INBOX_TRIAGE_COPY.lifecycleReasons.poolLifecycleUpdate).toBe(
      "Pool updated elsewhere.",
    );
    expect(INBOX_TRIAGE_COPY.liveRegions.poolActivity).toBe(
      "Pool updated elsewhere.",
    );
  });

  it("owns the complete approved DP-VQ06-STAGING wording", () => {
    expect(INBOX_TRIAGE_COPY.stagingStatus).toEqual({
      operation: {
        stagePending: "Staging “{title}”…",
        unstagePending: "Returning “{title}” to Breakdown…",
        stageUnknown: "We couldn’t confirm whether “{title}” was staged.",
        stageReconciling: "Checking whether “{title}” was staged…",
        unstageUnknown: "We couldn’t confirm whether “{title}” was returned.",
        unstageReconciling: "Checking whether “{title}” was returned…",
      },
      alert: {
        stageNotApplied: "“{title}” was not staged. Drag it again to retry.",
        stageRejected: "“{title}” can’t be staged from its current source.",
        stageConflict: "“{title}” changed elsewhere and was not staged.",
        unstageNotApplied:
          "“{title}” is still staged. Drag it back to Breakdown to retry.",
        unstageRejected: "“{title}” can’t be returned from its current state.",
        unstageConflict: "“{title}” changed elsewhere and remains staged.",
        invalidatedDrag: "“{title}” changed elsewhere. Drop canceled.",
        invalidatedPlacement:
          "Placement closed because “{title}” changed elsewhere.",
      },
      integrity: {
        node: "Checking a staged Node source…",
        bit: "Checking a staged Bit source…",
      },
      target: {
        nodeSameType: "Already in Nodes.",
        bitSameType: "Already in Bits.",
        oppositeType: "Return to Breakdown before changing type.",
        unavailable: "This item is no longer available.",
      },
      arrival: { one: "1 new", many: "{count} new" },
      actions: {
        showNodes: "Show new Nodes",
        showBits: "Show new Bits",
        dismissAlert: "Dismiss Staging alert",
      },
    });
    expect(INBOX_TRIAGE_COPY.liveRegions.stagingActivity).toBe(
      "Staging updated.",
    );
    expect(INBOX_TRIAGE_COPY.lifecycleReasons.stagingSourceUnavailable).toBe(
      "This item is no longer available.",
    );
  });

  it("owns the exact approved DP-VQ10 Newly and Undo wording", () => {
    expect(INBOX_TRIAGE_COPY.newlyPlacedUndo).toEqual({
      marker: "NEW",
      eligibility: {
        checking: "Checking whether Undo is available…",
        available: "Undo this placement.",
        reenabled: "Undo is available again.",
        resultMutated:
          "This item changed after placement. Undo is unavailable.",
        descendants: "Undo newly placed items below this one first.",
        placementOpen: "Finish or cancel the placement in progress first.",
        operationLocked: "Wait for the current action to finish.",
        editBlocked: "Save or cancel the current edit before undoing.",
        conflict: "This item or its source changed. Undo is unavailable.",
        trashed: "Its Scratch was moved to Trash.",
        archived: "Its Scratch was archived.",
      },
      operation: {
        pending: "Undoing “{title}”…",
        unknown: "We couldn’t confirm whether “{title}” was undone.",
        reconciling: "Checking whether “{title}” was undone…",
        notApplied: "“{title}” wasn’t undone. Nothing changed.",
        success: "Restored “{source}”.",
      },
      actions: {
        undo: "Undo",
        checkAgain: "Check again",
        retry: "Retry",
      },
    });
    expect(INBOX_TRIAGE_COPY.lifecycleReasons.undoUnavailable).toBe(
      "This item or its source changed. Undo is unavailable.",
    );
    expect(INBOX_TRIAGE_COPY.liveRegions.newlyPlacedUndo).toBe(
      "Newly placed item Undo status.",
    );
    expect(157 in INBOX_TRIAGE_COPY.receiptDependent).toBe(false);
  });

  it("keeps every later receipt-owned copy bundle explicitly unavailable", () => {
    expect(Object.keys(INBOX_TRIAGE_COPY.receiptDependent).map(Number)).toEqual([
      148,
    ]);

    for (const value of Object.values(INBOX_TRIAGE_COPY.receiptDependent)) {
      expect(value).toBe(RECEIPT_COPY_UNAVAILABLE);
      expect(isInboxTriageCopyAvailable(value)).toBe(false);
      expect(typeof value).not.toBe("string");
    }
    expect(isInboxTriageCopyAvailable(INBOX_TRIAGE_COPY.baseActions.add)).toBe(
      true,
    );
  });

  it("does not introduce locale state or a second language resource", () => {
    expect(INBOX_TRIAGE_COPY).not.toHaveProperty("locale");
    expect(INBOX_TRIAGE_COPY).not.toHaveProperty("translations");
    expect(INBOX_TRIAGE_COPY).not.toHaveProperty("ko");
  });
});


it("Task170 Cycle5 owns only the two new Placement presentation labels", () => {
  expect(INBOX_TRIAGE_COPY).toHaveProperty("placementPresentation", {
    stagedConfirm: "OK", cancelPlacement: "Cancel placement",
  });
});
