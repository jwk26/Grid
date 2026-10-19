export const RECEIPT_COPY_UNAVAILABLE = Object.freeze({
  status: "unavailable",
  reason: "receipt-dependent",
} as const);

export type ReceiptCopyUnavailable = typeof RECEIPT_COPY_UNAVAILABLE;
export type InboxTriageCopyValue = string | ReceiptCopyUnavailable;

type ReceiptCopyTask =
  | 144
  | 147
  | 148
  | 150
  | 151
  | 153
  | 154
  | 157
  | 160
  | 162;

export interface InboxTriageCopy {
  readonly placementPresentation: {
    readonly stagedConfirm: string;
    readonly cancelPlacement: string;
  };
  readonly explorerBitStatus: {
    readonly overdue: string;
    readonly completed: string;
  };
  readonly contextPresentation: {
    readonly folderDialogInfo: string;
    readonly decorativeClose: string;
    readonly lastStampPrefix: string;
    readonly nextOldestFirst: string;
    readonly nextNewestFirst: string;
  };
  readonly sectionNames: {
    readonly scratchPool: string;
    readonly breakdown: string;
    readonly staging: string;
    readonly stagingNodes: string;
    readonly stagingBits: string;
    readonly gridExplorer: string;
  };
  readonly baseActions: {
    readonly add: string;
    readonly edit: string;
    readonly delete: string;
    readonly save: string;
    readonly cancel: string;
    readonly clearSearch: string;
    readonly expandScratchPool: string;
    readonly collapseScratchPool: string;
    readonly sortNewestFirst: string;
    readonly sortOldestFirst: string;
    readonly sortTrackOld: string;
    readonly sortTrackNew: string;
  };
  readonly validation: {
    readonly scratchTitleRequired: InboxTriageCopyValue;
    readonly breakdownContentRequired: InboxTriageCopyValue;
    readonly resultTitleRequired: InboxTriageCopyValue;
    readonly resultTitleTooLong: InboxTriageCopyValue;
  };
  readonly inlineEditor: {
    readonly status: {
      readonly pristine: string;
      readonly dirty: string;
      readonly saving: string;
      readonly savingBeforeContinuing: string;
      readonly offline: string;
      readonly notApplied: string;
      readonly reconciling: string;
      readonly saved: string;
    };
    readonly conflict: {
      readonly heading: string;
      readonly latest: string;
      readonly draft: string;
      readonly useMine: string;
      readonly useLatest: string;
      readonly copyDraft: string;
      readonly latestUpdated: string;
    };
    readonly recovery: {
      readonly heading: string;
      readonly scratchInvalid: string;
      readonly breakdownInvalid: string;
      readonly review: string;
      readonly copied: string;
      readonly close: string;
    };
    readonly actions: {
      readonly retrySave: string;
      readonly stayHere: string;
    };
  };
  readonly departure: {
    readonly eyebrow: string;
    readonly heading: string;
    readonly description: string;
    readonly continueAction: string;
    readonly discardAction: string;
  };
  readonly completion: {
    readonly addBlocker: string;
    readonly titleBlocker: {
      readonly openOrDirty: string;
      readonly saving: string;
      readonly conflicted: string;
      readonly reconciling: string;
    };
    readonly withdrawal: {
      readonly activeBreakdown: string;
      readonly staging: string;
      readonly breakdownAndStaging: string;
    };
  };
  readonly archive: {
    readonly states: {
      readonly pending: string;
      readonly unknown: string;
      readonly reconciling: string;
      readonly forcedReload: string;
      readonly notApplied: string;
      readonly storageFailure: string;
      readonly rejected: string;
      readonly conflict: string;
      readonly success: string;
    };
    readonly confirmationDetail: string;
    readonly actions: {
      readonly checkAgain: string;
      readonly retry: string;
      readonly cancel: string;
    };
  };
  readonly externalRemoval: {
    readonly title: {
      readonly archive: string;
      readonly delete: string;
    };
    readonly destination: {
      readonly running: string;
      readonly runningSearchEmpty: string;
      readonly runningInboxEmpty: string;
      readonly paused: string;
      readonly pausedSearchEmpty: string;
      readonly pausedInboxEmpty: string;
    };
    readonly drafts: {
      readonly heading: string;
      readonly explanation: string;
      readonly add: string;
      readonly scratchTitle: string;
      readonly breakdown: string;
      readonly copy: string;
      readonly copied: string;
    };
    readonly actions: {
      readonly moveNow: string;
      readonly pause: string;
      readonly resume: string;
    };
  };
  readonly reliability: {
    readonly add: {
      readonly pending: string;
      readonly unknown: string;
      readonly reconciling: string;
      readonly notApplied: string;
      readonly rejected: string;
      readonly conflict: string;
    };
    readonly delete: {
      readonly pending: string;
      readonly unknown: string;
      readonly reconciling: string;
      readonly notApplied: string;
      readonly rejected: string;
      readonly conflict: string;
    };
    readonly actions: {
      readonly checkAgain: string;
      readonly retryAdd: string;
    };
  };
  readonly placementReliability: {
    readonly pending: string;
    readonly unknown: string;
    readonly reconciling: string;
    readonly notApplied: string;
    readonly staleSource: string;
    readonly staleTarget: string;
    readonly success: string;
    readonly actions: {
      readonly checkAgain: string;
      readonly retry: string;
      readonly cancel: string;
    };
  };
  readonly placementTitleLimits: {
    readonly resultTitle: {
      readonly eyebrow: string;
      readonly heading: string;
      readonly explanation: string;
      readonly label: string;
      readonly counter: string;
      readonly emptyError: string;
      readonly overLimitError: string;
      readonly actions: { readonly continue: string; readonly cancel: string };
    };
    readonly direct: {
      readonly eyebrow: string;
      readonly heading: string;
      readonly nodeReason: string;
      readonly bitReason: string;
      readonly neitherAvailable: string;
      readonly actions: {
        readonly node: string;
        readonly bit: string;
        readonly cancel: string;
      };
    };
  };
  readonly newlyPlacedUndo: {
    readonly marker: string;
    readonly eligibility: {
      readonly checking: string;
      readonly available: string;
      readonly reenabled: string;
      readonly resultMutated: string;
      readonly descendants: string;
      readonly placementOpen: string;
      readonly operationLocked: string;
      readonly editBlocked: string;
      readonly conflict: string;
      readonly trashed: string;
      readonly archived: string;
    };
    readonly operation: {
      readonly pending: string;
      readonly unknown: string;
      readonly reconciling: string;
      readonly notApplied: string;
      readonly success: string;
    };
    readonly actions: {
      readonly undo: string;
      readonly checkAgain: string;
      readonly retry: string;
    };
  };
  readonly breakdownSuccess: {
    readonly add: string;
    readonly unstage: string;
  };
  readonly poolStatus: {
    readonly filteredCount: string;
    readonly hiddenSelection: string;
    readonly arrivalOne: string;
    readonly arrivalMany: string;
    readonly archiveOne: string;
    readonly archiveMany: string;
    readonly deleteOne: string;
    readonly deleteMany: string;
    readonly restoreOne: string;
    readonly restoreMany: string;
    readonly mixed: string;
    readonly compactLifecycle: string;
    readonly actions: {
      readonly clearSearch: string;
      readonly reviewNew: string;
      readonly dismiss: string;
    };
  };
  readonly stagingStatus: {
    readonly operation: {
      readonly stagePending: string;
      readonly unstagePending: string;
      readonly stageUnknown: string;
      readonly stageReconciling: string;
      readonly unstageUnknown: string;
      readonly unstageReconciling: string;
    };
    readonly alert: {
      readonly stageNotApplied: string;
      readonly stageRejected: string;
      readonly stageConflict: string;
      readonly unstageNotApplied: string;
      readonly unstageRejected: string;
      readonly unstageConflict: string;
      readonly orphanNode: string;
      readonly orphanBit: string;
      readonly invalidatedDrag: string;
      readonly invalidatedPlacement: string;
    };
    readonly integrity: { readonly node: string; readonly bit: string };
    readonly target: {
      readonly nodeSameType: string;
      readonly bitSameType: string;
      readonly oppositeType: string;
      readonly unavailable: string;
    };
    readonly arrival: { readonly one: string; readonly many: string };
    readonly actions: {
      readonly showNodes: string;
      readonly showBits: string;
      readonly dismissAlert: string;
    };
  };
  readonly explorerStatus: {
    readonly arrival: { readonly one: string; readonly many: string };
    readonly path: {
      readonly unavailable: string;
      readonly archived: string;
      readonly moved: string;
      readonly invalid: string;
      readonly stalePlacement: string;
      readonly selectionCleared: string;
    };
    readonly actions: {
      readonly showNewIn: string;
      readonly dismiss: string;
    };
  };
  readonly explorerSearch: {
    readonly entry: string;
    readonly placeholder: string;
    readonly closeAccessibleName: string;
    readonly status: {
      readonly preSearch: string;
      readonly loading: string;
      readonly refreshing: string;
      readonly noResults: string;
      readonly error: string;
      readonly staleSelection: string;
      readonly revealed: string;
    };
    readonly duplicate: string;
    readonly actions: { readonly retry: string };
  };
  readonly lifecycleReasons: {
    readonly externalScratchRemoval: InboxTriageCopyValue;
    readonly poolLifecycleUpdate: InboxTriageCopyValue;
    readonly stagingSourceUnavailable: InboxTriageCopyValue;
    readonly explorerPathFallback: InboxTriageCopyValue;
    readonly placementStale: InboxTriageCopyValue;
    readonly undoUnavailable: InboxTriageCopyValue;
    readonly completionWithdrawal: InboxTriageCopyValue;
    readonly archiveRecovery: InboxTriageCopyValue;
  };
  readonly liveRegions: {
    readonly inlineEditor: InboxTriageCopyValue;
    readonly departure: InboxTriageCopyValue;
    readonly externalRemoval: InboxTriageCopyValue;
    readonly reliability: InboxTriageCopyValue;
    readonly poolActivity: InboxTriageCopyValue;
    readonly stagingActivity: InboxTriageCopyValue;
    readonly success: InboxTriageCopyValue;
    readonly explorerActivity: InboxTriageCopyValue;
    readonly explorerSearch: InboxTriageCopyValue;
    readonly placement: InboxTriageCopyValue;
    readonly resultTitle: InboxTriageCopyValue;
    readonly newlyPlacedUndo: InboxTriageCopyValue;
    readonly completion: InboxTriageCopyValue;
    readonly archive: InboxTriageCopyValue;
  };
  readonly accessibleNames: {
    readonly scratchPool: string;
    readonly breakdown: string;
    readonly staging: string;
    readonly stagingNodes: string;
    readonly stagingBits: string;
    readonly gridExplorer: string;
    readonly searchScratches: string;
    readonly clearPoolSearch: string;
    readonly moveSelectedScratchToTrash: string;
    /** `{title}` is replaced by the Scratch title. */
    readonly moveScratchToTrash: string;
  };
  readonly scratchTrash: {
    readonly title: string;
    /** `{title}` marks the bold Scratch title. */
    readonly body: string;
    readonly stagedOne: string;
    /** `{count}` is replaced by the staged count. */
    readonly stagedMany: string;
    readonly draft: string;
    readonly tooltip: string;
    readonly disabled: {
      readonly placementOpen: string;
      readonly unresolvedSource: string;
    };
    readonly actions: {
      readonly cancel: string;
      readonly confirm: string;
      readonly retry: string;
      readonly checkAgain: string;
    };
    readonly states: {
      readonly pending: string;
      readonly notApplied: string;
      readonly unknown: string;
      readonly conflict: string;
      readonly rejected: string;
      /** `{title}` is replaced by the Scratch title. */
      readonly success: string;
    };
  };
  readonly receiptDependent: Readonly<
    Partial<Record<ReceiptCopyTask, ReceiptCopyUnavailable>>
  >;
}

const UNAVAILABLE = RECEIPT_COPY_UNAVAILABLE;

export const INBOX_TRIAGE_COPY = {
  placementPresentation: {
    stagedConfirm: "OK",
    cancelPlacement: "Cancel placement",
  },
  explorerBitStatus: {
    overdue: "Overdue",
    completed: "Completed",
  },
  contextPresentation: {
    folderDialogInfo: "[ FOLDER DIALOG: INFO ]",
    decorativeClose: "[X]",
    lastStampPrefix: "LAST_STAMP:",
    nextOldestFirst: "OLD FIRST",
    nextNewestFirst: "NEW FIRST",
  },
  sectionNames: {
    scratchPool: "Scratch Pool",
    breakdown: "Breakdown",
    staging: "Staging",
    stagingNodes: "Nodes",
    stagingBits: "Bits",
    gridExplorer: "Grid Explorer",
  },
  baseActions: {
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
  },
  validation: {
    scratchTitleRequired: "Enter a Scratch title.",
    breakdownContentRequired: "Enter breakdown content.",
    resultTitleRequired: "Enter a result title.",
    resultTitleTooLong: "Use {limit} characters or fewer.",
  },
  inlineEditor: {
    status: {
      pristine: "No changes.",
      dirty: "Unsaved changes.",
      saving: "Saving…",
      savingBeforeContinuing: "Saving before continuing…",
      offline: "Offline. Your draft is still here.",
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
      retrySave: "Retry save",
      stayHere: "Stay here",
    },
  },
  departure: {
    eyebrow: "Unsaved Add draft",
    heading: "Keep writing?",
    description: "Continue writing here, or discard this draft and move.",
    continueAction: "Continue writing",
    discardAction: "Discard and move",
  },
  completion: {
    addBlocker: "Add this idea or clear the draft to complete this Scratch.",
    titleBlocker: {
      openOrDirty:
        "Save or cancel the Scratch title edit to complete this Scratch.",
      saving: "Saving the Scratch title before completion…",
      conflicted:
        "Resolve the Scratch title conflict to complete this Scratch.",
      reconciling: "Checking the Scratch title before completion…",
    },
    withdrawal: {
      activeBreakdown:
        "Completion is no longer available because a Breakdown item is active.",
      staging:
        "Completion is no longer available because an item is in Staging.",
      breakdownAndStaging:
        "Completion is no longer available because Breakdown and Staging have active items.",
    },
  },
  archive: {
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
  },
  externalRemoval: {
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
  },
  reliability: {
    add: {
      pending: "Adding…",
      unknown: "We couldn’t confirm whether it was added.",
      reconciling: "Checking whether it was added…",
      notApplied: "Not added. Your draft is still here.",
      rejected: "Add unavailable. Your draft is still here.",
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
  },
  placementReliability: {
    pending: "Placing “{title}” in {destination}…",
    unknown: "We couldn’t confirm whether “{title}” was placed.",
    reconciling: "Checking whether “{title}” was placed…",
    notApplied: "“{title}” wasn’t placed. Your source is unchanged.",
    staleSource:
      "The source changed. Nothing was placed. Cancel and drag it again.",
    staleTarget:
      "The destination changed. Nothing was placed. Cancel and drag to the current destination.",
    success: "Placed “{title}” in {destination}.",
    actions: {
      checkAgain: "Check again",
      retry: "Retry",
      cancel: "Cancel",
    },
  },
  placementTitleLimits: {
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
  },
  newlyPlacedUndo: {
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
  },
  breakdownSuccess: {
    add: "Added.",
    unstage: "Returned to Breakdown.",
  },
  poolStatus: {
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
  },
  stagingStatus: {
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
      orphanNode:
        "A staged Node was removed because its source no longer exists.",
      orphanBit:
        "A staged Bit was removed because its source no longer exists.",
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
  },
  explorerStatus: {
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
  },
  explorerSearch: {
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
  },
  lifecycleReasons: {
    externalScratchRemoval: UNAVAILABLE,
    poolLifecycleUpdate: "Pool updated elsewhere.",
    stagingSourceUnavailable: "This item is no longer available.",
    explorerPathFallback:
      "This path is no longer available. Returned to {destination}.",
    placementStale: "Placement closed because this Explorer path changed.",
    undoUnavailable:
      "This item or its source changed. Undo is unavailable.",
    completionWithdrawal: UNAVAILABLE,
    archiveRecovery:
      "Checking the Archive request from before this reload…",
  },
  liveRegions: {
    inlineEditor: UNAVAILABLE,
    departure: UNAVAILABLE,
    externalRemoval: UNAVAILABLE,
    reliability: UNAVAILABLE,
    poolActivity: "Pool updated elsewhere.",
    stagingActivity: "Staging updated.",
    success: UNAVAILABLE,
    explorerActivity: UNAVAILABLE,
    explorerSearch: "Search the entire Grid Explorer.",
    placement: UNAVAILABLE,
    resultTitle: UNAVAILABLE,
    newlyPlacedUndo: "Newly placed item Undo status.",
    completion: UNAVAILABLE,
    archive: "Scratch archived.",
  },
  accessibleNames: {
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
  },
  scratchTrash: {
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
  },
  receiptDependent: {
    148: UNAVAILABLE,
  },
} as const satisfies InboxTriageCopy;

export function isInboxTriageCopyAvailable(
  value: InboxTriageCopyValue,
): value is string {
  return typeof value === "string";
}
