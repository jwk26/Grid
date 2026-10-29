"use client";

import {
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
  type RefObject,
  type ReactNode,
} from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import {
  ArrowDownUp,
  CheckCircle2,
  GripVertical,
  Folder,
  Inbox,
  Lightbulb,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  StatusAnnouncement,
  useStatusAnnouncement,
} from "@/components/feedback/status-announcement";
import {
  StatusIcon,
  statusEmphasisProps,
  useStatusPresentation,
} from "@/components/feedback/status-icon";
import { StatusTooltip } from "@/components/feedback/status-tooltip";
import {
  invalidateTriageDragSource,
  type TriageDragItem,
} from "@/hooks/use-dnd";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { ArchiveScratchCoordinatorState } from "@/hooks/use-archive-scratch";
import {
  useScratchBreakdowns,
  useScratchTitleBlockerContext,
  type BreakdownOperationProjection,
  type ConditionalEditor,
  type ConditionalEditorSnapshot,
  type ScratchTitleBlockerSnapshot,
} from "@/hooks/use-scratch-breakdowns";
import {
  TrashDraftRegistryContext,
  useTrashScratchEntries,
} from "@/hooks/use-trash-scratch";
import { useTriageDepartureContext } from "@/hooks/use-triage-departure";
import { useTriageOperationLockContext } from "@/hooks/use-triage-operation-lock";
import { INBOX_TRIAGE_COPY } from "@/lib/copy/inbox-triage";
import {
  forcedItemKeys,
  useForcedItemStatus,
  type ForcedState,
} from "@/lib/feedback/forced-item-status";
import type { ItemStatus } from "@/lib/feedback/item-status";
import type {
  AddBreakdownCommand,
  DeleteBreakdownCommand,
} from "@/lib/db/datastore";
import type {
  RepositoryOperationStatus,
  ScratchBreakdown,
} from "@/lib/db/schema";
import type { TriageDropData } from "@/lib/grid-dnd";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils/relative-time";
import { useTriagePreferencesStore } from "@/stores/triage-preferences-store";
import { useTriageStore } from "@/stores/triage-store";
import type { Bit } from "@/types";
import { scratchTrashDisabledCopy } from "./scratch-trash-dialog";

type OpenEditorSnapshot = NonNullable<ConditionalEditorSnapshot>;

const SCRATCH_TITLE_INLINE_LIMIT = 60;
const BREAKDOWN_CONTENT_INLINE_LIMIT = 120;
const BREAKDOWN_UNSTAGE_DROP_ID = "triage-remove-drop:breakdown";

export type BreakdownSuccessSignal = Readonly<{
  kind: "add" | "unstage";
  operationId: string;
  rowId: string;
}>;

export type BreakdownCompletionProjection = Readonly<{
  presentation: "working" | "overlay" | "complete";
  persistedEligible?: boolean;
  completionBlockers?: Readonly<{
    addDraft: boolean;
    title: ScratchTitleBlockerSnapshot | null;
  }>;
  withdrawalReason?:
    | "active-breakdown"
    | "staging"
    | "breakdown-and-staging"
    | null;
  cancel: () => void;
  reopen: () => void;
  archive?: () => Promise<boolean>;
  archiveOperation?: ArchiveOperationProjection;
}>;

export type ArchiveOperationProjection = Readonly<{
  state: ArchiveScratchCoordinatorState;
  isRecoveryProjection: boolean;
  reconcile: () => Promise<boolean>;
  retry: () => Promise<boolean>;
  dismissTerminal: () => boolean;
}>;

function getArchiveOperationSentence(
  state: ArchiveScratchCoordinatorState,
  isRecoveryProjection: boolean,
): string | null {
  const copy = INBOX_TRIAGE_COPY.archive.states;
  if (
    isRecoveryProjection &&
    (state.phase === "recovering" || state.phase === "reconciling")
  ) {
    return copy.forcedReload;
  }
  if (state.phase === "pending") return copy.pending;
  if (state.phase === "unknown") return copy.unknown;
  if (state.phase === "reconciling") return copy.reconciling;
  if (state.phase === "recovering") return copy.forcedReload;
  if (state.phase === "storage_failed") return copy.storageFailure;
  if (state.phase !== "terminal") return null;
  if (
    state.terminalStatus === "applied" ||
    state.terminalStatus === "already_applied"
  ) {
    return copy.success;
  }
  if (state.terminalStatus === "not_applied") return copy.notApplied;
  if (state.terminalStatus === "rejected") return copy.rejected;
  return copy.conflict;
}

export function ArchiveOperationCard({
  headingRef: providedHeadingRef,
  isLocked = false,
  operation,
  onArchive,
  onCancel,
  scratchTitle,
}: {
  headingRef?: RefObject<HTMLHeadingElement | null>;
  isLocked?: boolean;
  operation?: ArchiveOperationProjection;
  onArchive?: () => Promise<boolean>;
  onCancel: () => void;
  scratchTitle?: string;
}) {
  const internalHeadingRef = useRef<HTMLHeadingElement>(null);
  const headingRef = providedHeadingRef ?? internalHeadingRef;
  const currentActionRef = useRef<HTMLButtonElement>(null);
  const sentence =
    operation === undefined
      ? "Scratch complete"
      : operation.state.phase === "terminal" &&
          (operation.state.terminalStatus === "applied" ||
            operation.state.terminalStatus === "already_applied")
        ? null
        : getArchiveOperationSentence(
            operation.state,
            operation.isRecoveryProjection,
          );
  const state = operation?.state;
  const terminalStatus = state?.phase === "terminal" ? state.terminalStatus : null;
  const isInactive = state?.phase === "pending" || state?.phase === "reconciling";
  const currentAction =
    operation === undefined
      ? "Archive Scratch"
      : state?.phase === "pending"
        ? "Archive Scratch"
        : state?.phase === "unknown" || state?.phase === "reconciling"
          ? INBOX_TRIAGE_COPY.archive.actions.checkAgain
          : state?.phase === "terminal" && state.terminalStatus === "not_applied"
            ? INBOX_TRIAGE_COPY.archive.actions.retry
            : state?.phase === "storage_failed" ||
                (state?.phase === "terminal" &&
                  (state.terminalStatus === "rejected" ||
                    state.terminalStatus === "conflict"))
              ? INBOX_TRIAGE_COPY.archive.actions.cancel
              : null;
  const hasSecondaryCancel =
    operation === undefined ||
    (state?.phase === "terminal" && state.terminalStatus === "not_applied");

  useLayoutEffect(() => {
    if (
      operation?.isRecoveryProjection &&
      (state?.phase === "recovering" || state?.phase === "reconciling")
    ) {
      headingRef.current?.focus();
      return;
    }
    if (
      state?.phase === "unknown" ||
      state?.phase === "storage_failed" ||
      (state?.phase === "terminal" &&
        (terminalStatus === "not_applied" ||
          terminalStatus === "rejected" ||
          terminalStatus === "conflict"))
    ) {
      currentActionRef.current?.focus();
    }
  }, [headingRef, operation?.isRecoveryProjection, state?.phase, terminalStatus]);

  if (sentence === null) return null;

  const [detailBefore, detailAfter] =
    INBOX_TRIAGE_COPY.archive.confirmationDetail.split("{title}");

  const runCurrentAction = () => {
    if (operation === undefined) {
      void onArchive?.();
    } else if (state?.phase === "unknown") {
      void operation.reconcile();
    } else if (state?.phase === "terminal" && state.terminalStatus === "not_applied") {
      void operation.retry();
    } else if (
      state?.phase === "storage_failed" ||
      (state?.phase === "terminal" &&
        (state.terminalStatus === "rejected" || state.terminalStatus === "conflict"))
    ) {
      onCancel();
    }
  };

  return (
    <div
      className="archive-card"
      data-archive-state={state?.phase ?? "confirmation"}
      data-triage-role="archive-card"
    >
        <span
          aria-hidden="true"
          className="archive-status-mark"
          data-archive-status-mark={state?.phase ?? "confirmation"}
          data-triage-role="archive-status-mark"
        />
        <h3
          ref={headingRef}
          className="archive-status"
          data-triage-role="archive-status"
          id="archive-completion-heading"
          tabIndex={-1}
        >
          {sentence}
        </h3>
        {scratchTitle !== undefined ? (
          <p
            aria-hidden={operation === undefined ? undefined : true}
            className="archive-confirmation-detail"
            data-archive-detail={operation === undefined ? "visible" : "reserved"}
            data-triage-role="archive-confirmation-detail"
          >
            {detailBefore}
            <strong>{scratchTitle}</strong>
            {detailAfter}
          </p>
        ) : null}
        <div className="archive-actions" data-triage-role="archive-actions">
          <div
            className="archive-current-action-slot"
            data-triage-role="archive-current-action-slot"
          >
            {currentAction !== null ? (
              <Button
                ref={currentActionRef}
                aria-disabled={isInactive || undefined}
                className="archive-current-action"
                data-triage-role="archive-current-action"
                disabled={operation === undefined && isLocked}
                type="button"
                onClick={(event) => {
                  if (isInactive) {
                    event.preventDefault();
                    return;
                  }
                  runCurrentAction();
                }}
              >
                {currentAction}
              </Button>
            ) : null}
          </div>
          {hasSecondaryCancel ? (
            <Button
              className="archive-cancel"
              data-triage-role="archive-cancel"
              disabled={operation === undefined && isLocked}
              type="button"
              variant="outline"
              onClick={onCancel}
            >
              {INBOX_TRIAGE_COPY.archive.actions.cancel}
            </Button>
          ) : null}
        </div>
    </div>
  );
}

/** The sentence a forced development state shows on an editor. */
function forcedEditorSentence(
  state: ForcedState,
  status: (typeof INBOX_TRIAGE_COPY)["inlineEditor"]["status"],
): string | null {
  switch (state) {
    case "delayed-pending":
      return status.saving;
    case "reconciling":
      return status.reconciling;
    case "unknown":
      return status.unknown;
    case "not-applied":
    case "rejected":
    case "conflict":
    case "integrity":
      return status.notApplied;
    case "editor-offline":
      return null;
  }
}

function InlineEditor({
  contentAfter,
  contentBefore,
  contentClassName,
  contentRole,
  contentTestId,
  editor,
  onSave,
  onUseMine,
  snapshot,
  actionRole,
  actionTestId,
}: {
  contentAfter?: ReactNode;
  contentBefore?: ReactNode;
  contentClassName: string;
  contentRole: string;
  contentTestId: string;
  editor: ConditionalEditor;
  onSave: () => Promise<boolean>;
  onUseMine: () => Promise<boolean>;
  snapshot: OpenEditorSnapshot;
  actionRole: string;
  actionTestId: string;
}) {
  const copy = INBOX_TRIAGE_COPY.inlineEditor;
  const isScratchTitle = snapshot.target.kind === "scratch-title";
  const surface = isScratchTitle ? "scratch-title" : "breakdown-content";
  const surfaceRole = isScratchTitle
    ? "context-inline-editor"
    : "breakdown-inline-editor";
  const fieldLabel = isScratchTitle ? "Scratch title" : "Breakdown content";
  const validationCopy = isScratchTitle
    ? INBOX_TRIAGE_COPY.validation.scratchTitleRequired
    : INBOX_TRIAGE_COPY.validation.breakdownContentRequired;
  const fieldId = useId();
  const statusId = `${fieldId}-status`;
  const fieldRef = useRef<HTMLInputElement>(null);
  const isComposingRef = useRef(false);
  const latestVersionRef = useRef(snapshot.latest?.version ?? null);
  const [copyStatus, setCopyStatus] = useState("");
  const [latestStatus, setLatestStatus] = useState("");
  const forcedEditor = useForcedItemStatus(
    isScratchTitle
      ? forcedItemKeys.scratchTitleEditor(snapshot.target.id)
      : forcedItemKeys.breakdownEditor(snapshot.target.id),
  );
  const [isFieldTooltipOpen, setIsFieldTooltipOpen] = useState(false);
  const checkAgainRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const heldCommandRef = useRef(snapshot.command !== null);

  useEffect(() => {
    const field = fieldRef.current;
    // Unknown and reconciling keep focus on Check again.
    if (
      field === null ||
      snapshot.phase === "invalidated" ||
      snapshot.phase === "unknown" ||
      snapshot.phase === "reconciling"
    ) {
      return;
    }
    if (snapshot.focusIntent !== "field" && snapshot.focusIntent !== "field-end") {
      return;
    }
    field.focus();
    if (snapshot.focusIntent === "field-end") {
      const end = field.value.length;
      field.setSelectionRange(end, end);
    }
  }, [snapshot.focusIntent, snapshot.phase, snapshot.target.id]);

  // Entering unknown from a Save click unmounts Save: move focus to Check again
  // rather than leave it on the page body.
  useEffect(() => {
    if (snapshot.phase !== "unknown") return;
    if (
      document.activeElement === null ||
      document.activeElement === document.body
    ) {
      checkAgainRef.current?.focus();
    }
  }, [snapshot.phase]);

  // A terminal answer clears the command: Check again goes away and Close is
  // enabled, so focus moves to Close instead of falling to the page body.
  useEffect(() => {
    const held = snapshot.command !== null;
    if (
      heldCommandRef.current &&
      !held &&
      snapshot.phase === "invalidated" &&
      (document.activeElement === null || document.activeElement === document.body)
    ) {
      closeRef.current?.focus();
    }
    heldCommandRef.current = held;
  }, [snapshot.command, snapshot.phase]);

  useEffect(() => {
    const nextVersion = snapshot.latest?.version ?? null;
    if (
      latestVersionRef.current !== null &&
      nextVersion !== null &&
      latestVersionRef.current !== nextVersion
    ) {
      setLatestStatus(copy.conflict.latestUpdated);
    }
    latestVersionRef.current = nextVersion;
  }, [copy.conflict.latestUpdated, snapshot.latest?.version]);

  const statusCopy =
    snapshot.phase === "validation"
      ? validationCopy
      : snapshot.phase === "not_applied"
        ? copy.status.notApplied
        : snapshot.phase === "saving" && snapshot.pendingIntent
          ? copy.status.savingBeforeContinuing
          : snapshot.phase === "pristine" ||
              snapshot.phase === "dirty" ||
              snapshot.phase === "saving" ||
              snapshot.phase === "unknown" ||
              snapshot.phase === "reconciling"
            ? copy.status[snapshot.phase]
            : snapshot.phase === "conflict"
              ? copy.conflict.heading
              : copy.recovery.heading;

  // Item status (feedback F02, F05): saving shows the loader, reconciling `?`
  // then the loader, not saved `!`. A forced development state takes its place.
  const realStatus: ItemStatus | null =
    snapshot.phase === "saving"
      ? "pending"
      : snapshot.phase === "unknown"
        ? "unknown"
        : snapshot.phase === "reconciling"
          ? "reconciling"
          : snapshot.phase === "not_applied"
            ? "problem"
            : null;
  const realSentence =
    realStatus === null ? null : statusCopy;
  const forcedStatus = forcedEditor?.status ?? null;
  const itemStatus = forcedStatus ?? realStatus;
  const statusSentence =
    forcedStatus !== null && forcedEditor !== null
      ? forcedEditorSentence(forcedEditor.state, copy.status)
      : realSentence;
  const presentation = useStatusPresentation(
    itemStatus,
    forcedStatus !== null
      ? `forced:${forcedEditor?.state}`
      : `${snapshot.phase}:${snapshot.command?.operationId ?? ""}`,
  );
  // Save and Cancel are unavailable at once while a save is in flight.
  const isInFlight =
    snapshot.phase === "saving" || snapshot.phase === "reconciling";
  // Unknown and reconciling show Check again instead of Save and Cancel.
  const isCheckingPhase =
    snapshot.phase === "unknown" || snapshot.phase === "reconciling";
  // A tooltip opened while no status showed must not wait to open on its own
  // when one appears later: drop the flag while there is no glyph.
  if (presentation.glyph === null && isFieldTooltipOpen) {
    setIsFieldTooltipOpen(false);
  }

  function handleFieldBlur(
    event: FocusEvent<HTMLInputElement>,
  ) {
    if (isComposingRef.current) return;
    const nextTarget = event.relatedTarget;
    const sourceSurface = event.currentTarget.closest(
      '[data-triage-layout="fixed-inline-editor"]',
    );
    if (nextTarget instanceof Node && sourceSurface?.contains(nextTarget)) {
      return;
    }
    if (
      nextTarget instanceof HTMLElement &&
      // H17: a Scratch Trash entry keeps a dirty editor open and unsaved while
      // its dialog is up; confirm discards it, Cancel leaves it as it was.
      (nextTarget.closest("[data-scratch-trash-entry]") !== null ||
        nextTarget.getAttribute("aria-label") === "Toggle theme" ||
        nextTarget.getAttribute("aria-label") === "Change color theme" ||
        (nextTarget.matches('button[aria-pressed]') &&
          nextTarget.closest('[role="dialog"]') !== null))
    ) {
      return;
    }
    if (
      snapshot.phase !== "saving" &&
      snapshot.phase !== "unknown" &&
      snapshot.phase !== "reconciling" &&
      snapshot.phase !== "conflict"
    ) {
      void onSave();
    }
  }

  function handleFieldKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
  ) {
    if (isComposingRef.current || event.nativeEvent.isComposing) return;

    // Keep plain draft navigation in the input. In a scrolling viewport the
    // browser can otherwise consume End by scrolling the list instead.
    if (
      !event.currentTarget.readOnly &&
      !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey &&
      (event.key === "Home" || event.key === "End")
    ) {
      event.preventDefault();
      const field = event.currentTarget;
      const caret = event.key === "Home" ? 0 : field.value.length;
      field.setSelectionRange(caret, caret);
      field.scrollLeft = event.key === "Home" ? 0 : field.scrollWidth;
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      void onSave();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      editor.cancel();
    }
  }

  async function copyDraft() {
    const draft = snapshot.copyableDraft ?? snapshot.draft;
    try {
      await navigator.clipboard.writeText(draft);
      setCopyStatus(copy.recovery.copied);
    } catch {
      setCopyStatus("");
    }
  }

  // Validation, conflict and invalidated keep their own status element; the item
  // statuses are described by the tooltip's sentence.
  const describedByOwnStatus =
    snapshot.phase === "validation" ||
    snapshot.phase === "conflict" ||
    snapshot.phase === "invalidated";
  const commonFieldProps = {
    ...(describedByOwnStatus ? { "aria-describedby": statusId } : {}),
    ...statusEmphasisProps(presentation),
    "aria-invalid": snapshot.phase === "validation" || undefined,
    "aria-label": fieldLabel,
    className: "triage-inline-editor__field",
    "data-triage-role": "inline-editor-field",
    id: fieldId,
    onBlur: handleFieldBlur,
    maxLength: isScratchTitle
      ? SCRATCH_TITLE_INLINE_LIMIT
      : BREAKDOWN_CONTENT_INLINE_LIMIT,
    onChange: (event: ChangeEvent<HTMLInputElement>) =>
      editor.changeDraft(event.target.value),
    onCompositionEnd: () => {
      isComposingRef.current = false;
    },
    onCompositionStart: () => {
      isComposingRef.current = true;
    },
    onKeyDown: handleFieldKeyDown,
    readOnly:
      snapshot.phase === "saving" ||
      snapshot.phase === "unknown" ||
      snapshot.phase === "reconciling",
    value: snapshot.draft,
  };
  const isIssuePhase =
    snapshot.phase === "conflict" || snapshot.phase === "invalidated";

  return (
    <>
      <div
        className={contentClassName}
        data-testid={contentTestId}
        data-triage-block-slot="stretch"
        data-triage-role={contentRole}
      >
        <div
          className="triage-inline-editor__content-layer"
          data-testid="inline-editor-content-layer"
          data-triage-obscured={isIssuePhase ? "true" : "false"}
        >
          {contentBefore}
          <div
            className="triage-inline-editor"
            data-triage-editor-state={snapshot.phase.replace("_", "-")}
            data-triage-editor-surface={surface}
            data-triage-role={surfaceRole}
          >
            {snapshot.phase === "invalidated" ? (
              <p data-triage-role="inline-editor-protected-draft">
                {snapshot.copyableDraft ?? snapshot.draft}
              </p>
            ) : (
              <>
                <label className="sr-only" htmlFor={fieldId}>
                  {fieldLabel}
                </label>
                <StatusTooltip
                  open={isFieldTooltipOpen && presentation.glyph !== null}
                  sentence={statusSentence ?? ""}
                  onOpenChange={(next) =>
                    setIsFieldTooltipOpen(next && presentation.glyph !== null)
                  }
                >
                  <input ref={fieldRef} type="text" {...commonFieldProps} />
                </StatusTooltip>
              </>
            )}
            {snapshot.phase === "validation" ? (
              <span
                id={statusId}
                aria-live="polite"
                className="triage-inline-editor__required"
                data-triage-role="inline-editor-required"
              >
                {validationCopy}
              </span>
            ) : null}
            {/* One polite container stays mounted; only its text changes. */}
            <div
              aria-atomic="true"
              aria-live="polite"
              className="sr-only"
              data-triage-role="inline-editor-announcement"
            >
              {realSentence !== null ? (
                <span key={`${snapshot.phase}:${snapshot.pendingIntent}`}>
                  {realSentence}
                </span>
              ) : null}
            </div>
          </div>
          {contentAfter}
        </div>
      </div>
      {!isScratchTitle ? <BreakdownStatusSlot /> : null}
      <div
        className="triage-fixed-action-slot"
        data-testid={actionTestId}
        data-triage-block-slot="stretch"
        data-triage-role={actionRole}
      >
        {!isIssuePhase && (
          <div
            className="triage-inline-editor__actions"
            data-triage-role="inline-editor-actions"
          >
            {/* The 22px status box is always reserved, empty until a glyph shows. */}
            <span
              className="triage-inline-editor__status-slot"
              data-triage-role="inline-editor-status-slot"
            >
              {statusSentence !== null ? (
                <StatusIcon presentation={presentation} sentence={statusSentence} />
              ) : null}
            </span>
            {isCheckingPhase ? (
              <Button
                ref={checkAgainRef}
                aria-disabled={
                  snapshot.phase === "reconciling" ? "true" : undefined
                }
                data-triage-role="inline-editor-check-again"
                size="xs"
                type="button"
                variant="ghost"
                onClick={() => {
                  if (snapshot.phase !== "unknown") return;
                  checkAgainRef.current?.focus();
                  void editor.reconcile();
                }}
              >
                {INBOX_TRIAGE_COPY.reliability.actions.checkAgain}
              </Button>
            ) : snapshot.pendingIntent && isInFlight ? (
              <Button
                size="xs"
                type="button"
                variant="outline"
                onClick={editor.stayHere}
              >
                {copy.actions.stayHere}
              </Button>
            ) : (
              <>
                <Button
                  className={cn(
                    (snapshot.phase === "dirty" ||
                      snapshot.phase === "not_applied") &&
                      "hover:bg-destructive/10",
                  )}
                  data-triage-contrast={
                    snapshot.phase === "dirty" ||
                    snapshot.phase === "not_applied"
                      ? "adaptive"
                      : undefined
                  }
                  data-triage-emphasis={
                    snapshot.phase === "dirty" ||
                    snapshot.phase === "not_applied"
                      ? "destructive"
                      : undefined
                  }
                  disabled={
                    isInFlight ||
                    (snapshot.phase !== "dirty" &&
                      snapshot.phase !== "not_applied")
                  }
                  size="xs"
                  type="button"
                  variant="ghost"
                  onClick={() => void onSave()}
                >
                  {INBOX_TRIAGE_COPY.baseActions.save}
                </Button>
                <Button
                  data-triage-treatment="text"
                  disabled={isInFlight}
                  size="xs"
                  type="button"
                  variant="ghost"
                  onClick={() => editor.cancel()}
                >
                  {INBOX_TRIAGE_COPY.baseActions.cancel}
                </Button>
              </>
            )}
          </div>
        )}
      </div>
      {isIssuePhase && (
        <div
          className="triage-inline-editor__issue-overlay"
          data-testid="inline-editor-issue-overlay"
          data-triage-role="inline-editor-issue-overlay"
        >
          <span
            id={statusId}
            aria-atomic="true"
            aria-live="polite"
            data-triage-role="inline-editor-issue-status"
          >
            {statusCopy}
            {latestStatus && <span> {latestStatus}</span>}
            {copyStatus && (
              <span data-triage-role="inline-editor-copy-status">
                {" "}
                {copyStatus}
              </span>
            )}
          </span>
          <div data-triage-role="inline-editor-issue-actions">
            {snapshot.phase === "conflict" && (
              <>
                <Button size="xs" type="button" onClick={() => void onUseMine()}>
                  {copy.conflict.useMine}
                </Button>
                <Button
                  size="xs"
                  type="button"
                  variant="outline"
                  onClick={editor.useLatest}
                >
                  {copy.conflict.useLatest}
                </Button>
                <Button
                  size="xs"
                  type="button"
                  variant="ghost"
                  onClick={() => void copyDraft()}
                >
                  {copy.conflict.copyDraft}
                </Button>
              </>
            )}
            {snapshot.phase === "invalidated" && (
              <>
                <Button size="xs" type="button" onClick={() => void copyDraft()}>
                  {copy.conflict.copyDraft}
                </Button>
                {snapshot.command !== null ? (
                  <Button
                    aria-disabled={snapshot.checking === true ? "true" : undefined}
                    data-triage-role="inline-editor-check-again"
                    size="xs"
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (snapshot.checking === true) return;
                      void editor.reconcile();
                    }}
                  >
                    {INBOX_TRIAGE_COPY.reliability.actions.checkAgain}
                  </Button>
                ) : null}
                <Button
                  ref={closeRef}
                  disabled={snapshot.command !== null}
                  size="xs"
                  type="button"
                  variant="outline"
                  onClick={() => editor.cancel()}
                >
                  {copy.recovery.close}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

type ReliabilityState =
  | "pending"
  | "unknown"
  | "reconciling"
  | "not-applied"
  | "rejected"
  | "conflict";

function getReliabilityState(
  operation: BreakdownOperationProjection | null,
): ReliabilityState | null {
  if (operation === null) return null;
  if (operation.phase !== "terminal") return operation.phase;
  if (operation.status === "not_applied") return "not-applied";
  if (operation.status === "rejected" || operation.status === "conflict") {
    return operation.status;
  }
  return null;
}

type SentenceKey =
  | "pending"
  | "unknown"
  | "reconciling"
  | "notApplied"
  | "rejected"
  | "conflict";

function sentenceKeyOf(state: ReliabilityState): SentenceKey {
  return state === "not-applied" ? "notApplied" : state;
}

/** The Add or Delete sentence a forced development state shows, or null for none. */
function forcedSentenceKey(state: ForcedState): SentenceKey | null {
  switch (state) {
    case "delayed-pending":
      return "pending";
    case "reconciling":
    case "unknown":
    case "rejected":
    case "conflict":
      return state;
    case "not-applied":
    case "integrity":
      return "notApplied";
    case "editor-offline":
      return null;
  }
}

function itemStatusOfReliability(state: ReliabilityState): ItemStatus {
  switch (state) {
    case "pending":
    case "unknown":
    case "reconciling":
      return state;
    case "not-applied":
    case "rejected":
    case "conflict":
      return "problem";
  }
}

function BreakdownRow({
  row,
  isStaged,
  isOperationLocked,
  editor,
  onEdit,
  onDelete,
  onEditRef,
  onSave,
  onUseMine,
  onRowRef,
  deleteOperation,
  onDeleteReliabilityActionRef,
  onReconcileDelete,
}: {
  row: ScratchBreakdown;
  isStaged: boolean;
  isOperationLocked: boolean;
  editor: ConditionalEditor;
  onEdit: (row: ScratchBreakdown, isStaged: boolean) => void;
  onDelete: (id: string) => void;
  onEditRef: (id: string, element: HTMLButtonElement | null) => void;
  onSave: () => Promise<boolean>;
  onUseMine: () => Promise<boolean>;
  onRowRef: (id: string, element: HTMLDivElement | null) => void;
  deleteOperation: BreakdownOperationProjection | null;
  onDeleteReliabilityActionRef: (
    id: string,
    element: HTMLButtonElement | null,
  ) => void;
  onReconcileDelete: (operationId: string) => void;
}) {
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
  } = useDraggable({
    id: `triage-breakdown:${row.id}`,
    data: {
      kind: "triage-breakdown",
      id: row.id,
      label: row.content,
      scratchId: row.scratchBitId,
      sourceBreakdownId: row.id,
      sourceVersion: row.version,
      sourceLifecycle: "active",
    },
    disabled: isStaged,
  });
  useEffect(
    () => () =>
      invalidateTriageDragSource({
        kind: "triage-breakdown",
        id: row.id,
        label: row.content,
        scratchId: row.scratchBitId,
        sourceBreakdownId: row.id,
        sourceVersion: row.version,
        sourceLifecycle: "active",
      }),
    [isStaged, row.content, row.id, row.scratchBitId, row.version],
  );
  const isMuted = isStaged || isDragging;
  const gripColorClass =
    isStaged && !isDragging
      ? "text-muted-foreground/20"
      : isMuted
        ? "text-muted-foreground"
        : "text-muted-foreground/45";
  const editorSnapshot =
    editor.snapshot?.target.kind === "breakdown" &&
    editor.snapshot.target.id === row.id
      ? editor.snapshot
      : null;
  const deleteReliabilityState = getReliabilityState(deleteOperation);
  const forced = useForcedItemStatus(forcedItemKeys.breakdown(row.id));
  const forcedRowKey =
    forced === null || forced.status === null
      ? null
      : forcedSentenceKey(forced.state);
  const sentenceKey =
    forcedRowKey ??
    (deleteReliabilityState === null
      ? null
      : sentenceKeyOf(deleteReliabilityState));
  const itemStatus =
    forcedRowKey !== null && forced !== null
      ? forced.status
      : deleteReliabilityState === null
        ? null
        : itemStatusOfReliability(deleteReliabilityState);
  const presentation = useStatusPresentation(
    itemStatus,
    forcedRowKey !== null
      ? `forced:${forced?.state}`
      : (deleteOperation?.operationId ?? ""),
  );
  const statusSentence =
    sentenceKey === null ? null : INBOX_TRIAGE_COPY.reliability.delete[sentenceKey];
  const statusDescriptionId = useId();
  const deleteReliabilityAction =
    deleteOperation === null ||
    deleteReliabilityState === null ||
    deleteReliabilityState === "pending"
      ? null
      : INBOX_TRIAGE_COPY.reliability.actions.checkAgain;
  const isDeleteInFlight =
    deleteOperation !== null && deleteOperation.phase !== "terminal";
  const isDragDisabled = isStaged || isOperationLocked || isDeleteInFlight;
  const gripAriaDescribedBy =
    [
      (attributes as { "aria-describedby"?: string })["aria-describedby"],
      statusSentence === null ? undefined : statusDescriptionId,
    ]
      .filter((id): id is string => id !== undefined)
      .join(" ") || undefined;
  const gripButton = (
    <button
      ref={setActivatorNodeRef}
      aria-label="Drag breakdown"
      data-source-version={row.version}
      data-triage-staging-focus-source="true"
      data-triage-drag-source="breakdown-grip"
      data-triage-role="breakdown-grip-control"
      disabled={isDragDisabled}
      className={cn(
        "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border border-transparent text-muted-foreground/60 hover:border-border hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        isDragDisabled
          ? "cursor-not-allowed"
          : "cursor-grab active:cursor-grabbing",
      )}
      type="button"
      {...attributes}
      {...listeners}
      aria-describedby={gripAriaDescribedBy}
    >
      <GripVertical
        aria-hidden="true"
        className={cn("h-4 w-4 transition-colors", gripColorClass)}
        data-testid="breakdown-grip"
      />
    </button>
  );

  return (
    <div
      ref={(element) => {
        setNodeRef(element);
        onRowRef(row.id, element);
      }}
      data-testid="breakdown-row"
      data-breakdown-id={row.id}
      data-triage-layout="fixed-inline-editor"
      data-triage-role={isStaged ? "breakdown-staged-row" : "breakdown-active-row"}
      data-triage-state={isStaged ? "staged" : "active"}
      {...statusEmphasisProps(presentation)}
      data-triage-reliability-state={deleteReliabilityState ?? undefined}
      data-triage-reliability-surface={
        deleteReliabilityState === null ? undefined : "delete"
      }
      role="listitem"
      className={cn(
        "group triage-fixed-breakdown-row border-b border-border/30 transition-[background-color,border-color,color,opacity] last:border-b-0 motion-reduce:transition-none",
        isStaged && !isDragging && "opacity-50 transition-opacity duration-200",
        isDragging &&
          "opacity-30 border border-dashed border-muted bg-transparent",
      )}
    >
      <div
        className="triage-fixed-breakdown-row__drag"
        data-testid="breakdown-drag-slot"
        data-triage-block-slot="stretch"
        data-triage-role="breakdown-drag-slot"
      >
        {statusSentence !== null && presentation.glyph !== null ? (
          <StatusTooltip sentence={statusSentence}>
            <span className="inline-flex">{gripButton}</span>
          </StatusTooltip>
        ) : (
          gripButton
        )}
      </div>
      {editorSnapshot !== null ? (
        <InlineEditor
          actionRole="breakdown-action-slot"
          actionTestId="breakdown-action-slot"
          contentClassName="triage-fixed-breakdown-row__content"
          contentRole="breakdown-content-slot"
          contentTestId="breakdown-content-slot"
          editor={editor}
          onSave={onSave}
          onUseMine={onUseMine}
          snapshot={editorSnapshot}
        />
      ) : (
        <>
          <div
            className="triage-fixed-breakdown-row__content"
            data-testid="breakdown-content-slot"
            data-triage-block-slot="stretch"
            data-triage-role="breakdown-content-slot"
          >
            <div
              className={cn(
                "text-sm leading-5 transition-colors",
                isMuted ? "text-muted-foreground" : "text-foreground",
              )}
              data-triage-role="breakdown-view-text"
            >
              {row.content}
            </div>
          </div>
          {statusSentence !== null && presentation.glyph !== null ? (
            <StatusTooltip sentence={statusSentence}>
              <div
                className="breakdown-status-slot"
                data-testid="breakdown-status-slot"
                data-triage-role="breakdown-status-slot"
              >
                <StatusIcon
                  focusable={isDragDisabled}
                  presentation={presentation}
                  sentence={statusSentence}
                />
              </div>
            </StatusTooltip>
          ) : (
            <BreakdownStatusSlot />
          )}
          <div
            className="triage-fixed-action-slot"
            data-testid="breakdown-action-slot"
            data-triage-block-slot="stretch"
            data-triage-role="breakdown-action-slot"
          >
            {deleteReliabilityAction !== null ? (
              <Button
                ref={(element) => onDeleteReliabilityActionRef(row.id, element)}
                aria-disabled={
                  deleteReliabilityState === "reconciling" ? "true" : undefined
                }
                className="breakdown-reliability__action"
                data-triage-role="breakdown-reliability-action"
                size="xs"
                type="button"
                variant="ghost"
                onClick={() => {
                  if (
                    deleteReliabilityState !== "reconciling" &&
                    deleteOperation !== null
                  ) {
                    onReconcileDelete(deleteOperation.operationId);
                  }
                }}
              >
                {deleteReliabilityAction}
              </Button>
            ) : null}
            <button
              ref={(element) => onEditRef(row.id, element)}
              aria-label={INBOX_TRIAGE_COPY.baseActions.edit}
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              data-triage-role="breakdown-row-action"
              disabled={
                isStaged ||
                isOperationLocked ||
                isDeleteInFlight ||
                editor.snapshot !== null
              }
              title={INBOX_TRIAGE_COPY.baseActions.edit}
              type="button"
              onClick={() => onEdit(row, isStaged)}
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              aria-label={INBOX_TRIAGE_COPY.baseActions.delete}
              className={cn(
                "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-destructive/10 hover:text-destructive focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isDragging && "text-muted-foreground",
              )}
              data-triage-role="breakdown-row-action"
              disabled={
                isStaged ||
                isOperationLocked ||
                isDeleteInFlight ||
                editor.snapshot !== null
              }
              title={INBOX_TRIAGE_COPY.baseActions.delete}
              type="button"
              onClick={() => onDelete(row.id)}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </>
      )}
      {/* One polite container per row stays mounted; only its text changes, so
          the first sentence of a Delete is announced too. */}
      <span
        id={statusDescriptionId}
        aria-atomic="true"
        aria-live="polite"
        className="sr-only"
        data-triage-role="breakdown-row-status-announcement"
        role="status"
      >
        {statusSentence !== null ? (
          <span key={`${deleteOperation?.operationId ?? forced?.state}:${sentenceKey}`}>
            {statusSentence}
          </span>
        ) : null}
      </span>
    </div>
  );
}

/** The always-reserved 22px status column of a row (feedback F07). */
function BreakdownStatusSlot() {
  return (
    <div
      className="breakdown-status-slot"
      data-testid="breakdown-status-slot"
      data-triage-role="breakdown-status-slot"
    />
  );
}

function InvalidatedBreakdownRecoveryRow({
  editor,
  onSave,
  onUseMine,
  snapshot,
}: {
  editor: ConditionalEditor;
  onSave: () => Promise<boolean>;
  onUseMine: () => Promise<boolean>;
  snapshot: OpenEditorSnapshot;
}) {
  return (
    <div
      className="group triage-fixed-breakdown-row border-b border-border/30 last:border-b-0"
      data-testid="breakdown-row"
      data-triage-layout="fixed-inline-editor"
      data-triage-role="breakdown-active-row"
      data-triage-state="invalidated"
      role="listitem"
    >
      <div
        className="triage-fixed-breakdown-row__drag"
        data-testid="breakdown-drag-slot"
        data-triage-block-slot="stretch"
        data-triage-role="breakdown-drag-slot"
      >
        <button
          aria-label="Drag breakdown"
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground/20"
          data-triage-staging-focus-source="true"
          disabled
          type="button"
        >
          <GripVertical aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
      <InlineEditor
        actionRole="breakdown-action-slot"
        actionTestId="breakdown-action-slot"
        contentClassName="triage-fixed-breakdown-row__content"
        contentRole="breakdown-content-slot"
        contentTestId="breakdown-content-slot"
        editor={editor}
        onSave={onSave}
        onUseMine={onUseMine}
        snapshot={snapshot}
      />
    </div>
  );
}

function ScratchTimestamp({ createdAt }: { createdAt: number }) {
  return (
    <div className="mt-1 text-xs tabular-nums text-muted-foreground" data-triage-role="context-timestamp">
      <span aria-hidden="true" data-triage-role="context-timestamp-prefix">
        {INBOX_TRIAGE_COPY.contextPresentation.lastStampPrefix}{" "}
      </span>
      <span data-triage-role="context-timestamp-value">
        {formatRelativeTime(createdAt)}
      </span>
    </div>
  );
}

export function BreakdownPanel({
  activeDragItem = null,
  archiveCandidateClear,
  completion,
  onAddDraftBlockerChange,
  overTargetId = null,
  selectedScratch,
  authoritativeStagedSourceIds,
  stagedSourceIds,
  successSignal = null,
}: {
  activeDragItem?: TriageDragItem;
  /** True when the Scratch has no authoritative staged candidate. */
  archiveCandidateClear: boolean;
  completion?: BreakdownCompletionProjection;
  onAddDraftBlockerChange?: (blocked: boolean) => void;
  overTargetId?: string | null;
  /**
   * The selected Scratch, read once by the workspace. The panel remounts on every Scratch
   * switch, so its own read would start empty and flash `Unknown Scratch`.
   */
  selectedScratch: Bit | null;
  /** Staged sources plus pending, unknown, reconciling and held Stage sources. */
  stagedSourceIds: ReadonlySet<string>;
  /** Only sources with a listed candidate; an open editor is invalidated by these alone. */
  authoritativeStagedSourceIds: ReadonlySet<string>;
  successSignal?: BreakdownSuccessSignal | null;
}) {
  const operationLock = useTriageOperationLockContext();
  const isStagedDrag =
    activeDragItem?.kind === "triage-staged-node" ||
    activeDragItem?.kind === "triage-staged-bit";
  const isBreakdownReturnOver =
    overTargetId === BREAKDOWN_UNSTAGE_DROP_ID &&
    activeDragItem?.integrity !== "invalidated";
  const { setNodeRef: setBreakdownDropRef } = useDroppable({
    id: BREAKDOWN_UNSTAGE_DROP_ID,
    data: { kind: "triage-remove-drop" } satisfies TriageDropData,
    disabled: !isStagedDrag,
  });
  const departure = useTriageDepartureContext();
  const { registerAddDraftOwner, setAddDraft } = departure;
  const isDepartureDecision = departure.pendingDestination !== null;
  const departureHeadingId = useId();
  const departureDescriptionId = `${departureHeadingId}-departure-description`;
  const departureContinueRef = useRef<HTMLButtonElement>(null);
  const departureDiscardRef = useRef<HTMLButtonElement>(null);
  const departureSheetRef = useRef<HTMLDivElement>(null);
  const lastDepartureActionRef = useRef<HTMLButtonElement | null>(null);
  const isResolvingDepartureRef = useRef(false);
  const restoreAddFocusAfterDecisionRef = useRef(false);
  const titleBlockerHandle = useScratchTitleBlockerContext();
  const selectedScratchId = useTriageStore((state) => state.selectedScratchId);
  const scratchPoolExpanded = useTriageStore(
    (state) => state.scratchPoolExpanded,
  );
  const scratchPoolManualExpandedForId = useTriageStore(
    (state) => state.scratchPoolManualExpandedForId,
  );
  const setScratchPoolExpanded = useTriageStore(
    (state) => state.setScratchPoolExpanded,
  );
  const breakdownCreatedAtSort = useTriagePreferencesStore(
    (state) => state.breakdownCreatedAtSort,
  );
  const setBreakdownCreatedAtSort = useTriagePreferencesStore(
    (state) => state.setBreakdownCreatedAtSort,
  );
  const {
    breakdowns,
    isReady: isBreakdownReady,
    consumedBreakdownCount,
    hasObservedBreakdownHistory,
    isArchiveEligible,
    operations,
    editor,
    addBreakdown,
    reconcileAddBreakdown,
    deleteBreakdown,
    reconcileDeleteBreakdown,
  } = useScratchBreakdowns(
    selectedScratchId,
    breakdownCreatedAtSort,
    { operationLock, titleBlockerHandle },
  );
  const [isAdding, setIsAdding] = useState(false);
  const [newContent, setNewContent] = useState("");
  const { announcement, announce } = useStatusAnnouncement();
  const pendingSuccessSignalRef = useRef<BreakdownSuccessSignal | null>(null);
  const signaledSuccessIdentitiesRef = useRef(new Set<string>());
  const inputRef = useRef<HTMLInputElement>(null);
  const addEntryRef = useRef<HTMLInputElement | HTMLDivElement | null>(null);
  const contentRegionRef = useRef<HTMLDivElement>(null);
  const addCommandRef = useRef<AddBreakdownCommand | null>(null);
  const addCompletionHoldRef = useRef(false);
  const deleteCommandRefs = useRef(new Map<string, DeleteBreakdownCommand>());
  const addReliabilityActionRef = useRef<HTMLButtonElement>(null);
  const deleteReliabilityActionRefs = useRef(
    new Map<string, HTMLButtonElement>(),
  );
  const contextRef = useRef<HTMLDivElement>(null);
  const contextEditRef = useRef<HTMLButtonElement>(null);
  const completionOverlayRef = useRef<HTMLDivElement>(null);
  const completionHeadingRef = useRef<HTMLHeadingElement>(null);
  const completionReopenRef = useRef<HTMLButtonElement>(null);
  const completionFocusIntentRef = useRef<"heading" | "reopen" | null>(null);
  const completionHadFocusRef = useRef(false);
  const previousCompletionPresentationRef = useRef<
    BreakdownCompletionProjection["presentation"]
  >("working");
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const rowEditRefs = useRef(new Map<string, HTMLButtonElement>());
  const lastEditorTargetRef = useRef<OpenEditorSnapshot["target"] | null>(null);
  const [invalidatedRowPosition, setInvalidatedRowPosition] = useState<{
    id: string;
    index: number;
  } | null>(null);
  const [editorAnnouncement, setEditorAnnouncement] = useState("");
  const pendingAddedRowIdRef = useRef<string | null>(null);
  const pendingDeleteFocusRef = useRef<{
    deletedId: string;
    nextId: string | null;
    previousId: string | null;
  } | null>(null);
  const failedDeleteFocusIdRef = useRef<string | null>(null);
  const pendingReliabilityFocusRef = useRef<
    | { target: "add-input" | "add-action" }
    | { target: "delete-action" | "delete-trash"; rowId: string }
    | null
  >(null);
  const [reliabilityFocusRevision, setReliabilityFocusRevision] = useState(0);
  const [hiddenReliabilityOperationIds, setHiddenReliabilityOperationIds] =
    useState<ReadonlySet<string>>(() => new Set());
  const isComposingRef = useRef(false);
  const [pendingDelete, setPendingDelete] = useState<{
    scratchBitId: string;
    breakdownId: string;
  } | null>(null);
  if (
    pendingDelete !== null &&
    pendingDelete.scratchBitId !== selectedScratchId
  ) {
    setPendingDelete(null);
  }
  const pendingDeleteId =
    pendingDelete?.scratchBitId === selectedScratchId
      ? pendingDelete.breakdownId
      : null;
  const rawAddOperation =
    operations.find((operation) => operation.kind === "add") ?? null;
  const addOperation =
    rawAddOperation !== null &&
    hiddenReliabilityOperationIds.has(rawAddOperation.operationId)
      ? null
      : rawAddOperation;
  const addReliabilityState = getReliabilityState(addOperation);
  const forcedAdd = useForcedItemStatus(
    selectedScratchId === null ? null : forcedItemKeys.add(selectedScratchId),
  );
  const forcedAddSentenceKey =
    forcedAdd === null || forcedAdd.status === null
      ? null
      : forcedSentenceKey(forcedAdd.state);
  const addSentenceKey =
    forcedAddSentenceKey ??
    (addReliabilityState === null ? null : sentenceKeyOf(addReliabilityState));
  const addStatusSentence =
    addSentenceKey === null
      ? null
      : forcedAddSentenceKey === null &&
          addSentenceKey === "rejected" &&
          addOperation?.rejection?.code === "account_limit"
        ? INBOX_TRIAGE_COPY.reliability.add.rejectedAccountLimit.replace(
            "{limit}",
            String(addOperation.rejection.limit ?? ""),
          )
        : INBOX_TRIAGE_COPY.reliability.add[addSentenceKey];
  const addItemStatus =
    forcedAddSentenceKey !== null && forcedAdd !== null
      ? forcedAdd.status
      : addReliabilityState === null
        ? null
        : itemStatusOfReliability(addReliabilityState);
  const addPresentation = useStatusPresentation(
    addItemStatus,
    forcedAddSentenceKey !== null
      ? `forced:${forcedAdd?.state}`
      : (addOperation?.operationId ?? ""),
  );
  const [isAddTooltipOpen, setIsAddTooltipOpen] = useState(false);
  if (addPresentation.glyph === null && isAddTooltipOpen) {
    setIsAddTooltipOpen(false);
  }
  const addReliabilityAction =
    forcedAddSentenceKey !== null
      ? null
      : addReliabilityState === "unknown" ||
          addReliabilityState === "reconciling"
        ? INBOX_TRIAGE_COPY.reliability.actions.checkAgain
        : addReliabilityState === "not-applied"
          ? INBOX_TRIAGE_COPY.reliability.actions.retryAdd
          : null;
  const deleteOperationsByBreakdownId = new Map(
    operations
      .filter(
        (operation) =>
          operation.kind === "delete" &&
          !hiddenReliabilityOperationIds.has(operation.operationId),
      )
      .map((operation) => [operation.breakdownId, operation] as const),
  );

  // Success shows nothing on screen (feedback F01); a screen reader hears the
  // sentence once (F04).
  const startSuccess = useCallback(
    (signal: BreakdownSuccessSignal) => {
      pendingSuccessSignalRef.current = null;
      announce(INBOX_TRIAGE_COPY.breakdownAnnouncement[signal.kind]);
    },
    [announce],
  );

  const isSuccessTargetActive = useCallback(
    (signal: BreakdownSuccessSignal) =>
      breakdowns.some((row) => row.id === signal.rowId) &&
      !stagedSourceIds.has(signal.rowId),
    [breakdowns, stagedSourceIds],
  );

  const observeSuccess = useCallback(
    (signal: BreakdownSuccessSignal) => {
      const identity = `${signal.kind}\u0000${signal.operationId}\u0000${signal.rowId}`;
      if (signaledSuccessIdentitiesRef.current.has(identity)) return;
      signaledSuccessIdentitiesRef.current.add(identity);
      pendingSuccessSignalRef.current = signal;
      if (isSuccessTargetActive(signal)) startSuccess(signal);
    },
    [isSuccessTargetActive, startSuccess],
  );

  useEffect(() => {
    if (successSignal !== null) observeSuccess(successSignal);
  }, [observeSuccess, successSignal]);

  useEffect(() => {
    const pendingSignal = pendingSuccessSignalRef.current;
    if (
      pendingSignal !== null &&
      isSuccessTargetActive(pendingSignal)
    ) {
      startSuccess(pendingSignal);
    }
  }, [breakdowns, isSuccessTargetActive, stagedSourceIds, startSuccess]);

  useEffect(
    () =>
      registerAddDraftOwner({
        clearDraft: () => {
          setAddDraft("");
          setNewContent("");
          onAddDraftBlockerChange?.(false);
        },
        focusDraft: () => inputRef.current?.focus(),
      }),
    [onAddDraftBlockerChange, registerAddDraftOwner, setAddDraft],
  );

  useEffect(
    () => () => onAddDraftBlockerChange?.(false),
    [onAddDraftBlockerChange],
  );

  const trashEntries = useTrashScratchEntries();
  const registerTrashDraftOwner = useContext(TrashDraftRegistryContext);
  const trashEditorRef = useRef(editor);
  useLayoutEffect(() => {
    trashEditorRef.current = editor;
  });
  const { hasAddDraft: readHasAddDraft } = departure;
  useEffect(
    () =>
      registerTrashDraftOwner?.({
        hasDiscardableWork: () =>
          trashEditorRef.current.snapshot !== null || readHasAddDraft(),
        discard: () => {
          trashEditorRef.current.cancel();
          addCompletionHoldRef.current = false;
          setAddDraft("");
          setNewContent("");
          onAddDraftBlockerChange?.(false);
        },
      }),
    [
      onAddDraftBlockerChange,
      readHasAddDraft,
      registerTrashDraftOwner,
      setAddDraft,
    ],
  );

  const reliabilityScopeRef = useRef({
    scratchBitId: selectedScratchId,
    operationIds: operations.map((operation) => operation.operationId),
  });
  useLayoutEffect(() => {
    const previousScope = reliabilityScopeRef.current;
    if (previousScope.scratchBitId !== selectedScratchId) {
      setHiddenReliabilityOperationIds((current) => {
        const next = new Set(current);
        for (const operationId of previousScope.operationIds) {
          next.add(operationId);
        }
        return next;
      });
      addCommandRef.current = null;
      deleteCommandRefs.current.clear();
    }
    reliabilityScopeRef.current = {
      scratchBitId: selectedScratchId,
      operationIds: operations.map((operation) => operation.operationId),
    };
  }, [operations, selectedScratchId]);

  useLayoutEffect(() => {
    const focusIntent = pendingReliabilityFocusRef.current;
    if (focusIntent === null) return;
    pendingReliabilityFocusRef.current = null;
    if (focusIntent.target === "add-input") {
      inputRef.current?.focus();
    } else if (focusIntent.target === "add-action") {
      addReliabilityActionRef.current?.focus();
    } else if (focusIntent.target === "delete-action") {
      deleteReliabilityActionRefs.current.get(focusIntent.rowId)?.focus();
    } else if ("rowId" in focusIntent) {
      rowRefs.current
        .get(focusIntent.rowId)
        ?.querySelector<HTMLButtonElement>('button[aria-label="Delete"]')
        ?.focus();
    }
  }, [operations, reliabilityFocusRevision]);

  function requestReliabilityFocus(
    intent: NonNullable<typeof pendingReliabilityFocusRef.current>,
  ) {
    pendingReliabilityFocusRef.current = intent;
    setReliabilityFocusRevision((current) => current + 1);
  }

  function hideReliabilityOperation(operationId: string) {
    setHiddenReliabilityOperationIds((current) => {
      if (current.has(operationId)) return current;
      const next = new Set(current);
      next.add(operationId);
      return next;
    });
  }

  useLayoutEffect(() => {
    if (isDepartureDecision) {
      lastDepartureActionRef.current = departureContinueRef.current;
      departureContinueRef.current?.focus();
      const containDepartureFocus = (event: globalThis.FocusEvent) => {
        if (
          isResolvingDepartureRef.current ||
          !(event.target instanceof Node) ||
          departureSheetRef.current?.contains(event.target)
        ) {
          return;
        }
        lastDepartureActionRef.current?.focus();
      };
      document.addEventListener("focusin", containDepartureFocus);
      return () => {
        document.removeEventListener("focusin", containDepartureFocus);
      };
    }

    isResolvingDepartureRef.current = false;
    lastDepartureActionRef.current = null;
    if (restoreAddFocusAfterDecisionRef.current) {
      restoreAddFocusAfterDecisionRef.current = false;
      inputRef.current?.focus();
    }
  }, [isDepartureDecision]);

  function continueWriting() {
    isResolvingDepartureRef.current = true;
    if (departure.continueWriting()) {
      restoreAddFocusAfterDecisionRef.current = true;
    } else {
      isResolvingDepartureRef.current = false;
    }
  }

  function discardAndMove() {
    isResolvingDepartureRef.current = true;
    if (!departure.discardAndMove()) {
      isResolvingDepartureRef.current = false;
    }
  }

  function handleDepartureKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      continueWriting();
      return;
    }
    if (event.key !== "Tab") return;

    if (event.shiftKey && document.activeElement === departureContinueRef.current) {
      event.preventDefault();
      departureDiscardRef.current?.focus();
    } else if (
      !event.shiftKey &&
      document.activeElement === departureDiscardRef.current
    ) {
      event.preventDefault();
      departureContinueRef.current?.focus();
    }
  }

  function updateAddDraft(draft: string) {
    if (
      rawAddOperation?.phase === "terminal" &&
      getReliabilityState(rawAddOperation) !== null &&
      draft !== newContent
    ) {
      hideReliabilityOperation(rawAddOperation.operationId);
    }
    setAddDraft(draft);
    setNewContent(draft);
    onAddDraftBlockerChange?.(
      draft.length > 0 || addCompletionHoldRef.current,
    );
  }

  // Check again that ends in an applied answer closes the editor from
  // `reconciling`; no other path leaves that phase for a closed editor.
  const editorPhase = editor.snapshot?.phase ?? null;
  const previousEditorPhaseRef = useRef(editorPhase);
  useEffect(() => {
    if (previousEditorPhaseRef.current === "reconciling" && editorPhase === null) {
      setEditorAnnouncement(INBOX_TRIAGE_COPY.inlineEditor.status.saved);
    }
    previousEditorPhaseRef.current = editorPhase;
  }, [editorPhase]);

  async function handleEditorSave(): Promise<boolean> {
    const snapshot = editor.snapshot;
    const changed = snapshot !== null && snapshot.draft !== snapshot.base.value;
    const applied = await editor.save();
    if (applied && changed) {
      setEditorAnnouncement(INBOX_TRIAGE_COPY.inlineEditor.status.saved);
    }
    return applied;
  }

  async function handleEditorUseMine(): Promise<boolean> {
    const applied = await editor.useMine();
    if (applied) {
      setEditorAnnouncement(INBOX_TRIAGE_COPY.inlineEditor.status.saved);
    }
    return applied;
  }

  function handleOpenScratchTitle() {
    if (selectedScratch === null || !editor.openScratchTitle(selectedScratch)) return;
    setEditorAnnouncement("");
  }

  function handleOpenBreakdown(row: ScratchBreakdown, isStaged: boolean) {
    if (!editor.openBreakdown(row, isStaged)) return;
    const deleteOperation = operations.find(
      (operation) =>
        operation.kind === "delete" && operation.breakdownId === row.id,
    );
    if (
      deleteOperation?.phase === "terminal" &&
      getReliabilityState(deleteOperation) !== null
    ) {
      hideReliabilityOperation(deleteOperation.operationId);
    }
    setInvalidatedRowPosition({
      id: row.id,
      index: breakdowns.findIndex((candidate) => candidate.id === row.id),
    });
    setEditorAnnouncement("");
  }

  useEffect(() => {
    if (editor.snapshot !== null) {
      lastEditorTargetRef.current = editor.snapshot.target;
      return;
    }
    const lastTarget = lastEditorTargetRef.current;
    if (lastTarget === null) return;
    if (editor.focusIntent === "edit-trigger") {
      if (lastTarget.kind === "scratch-title") contextEditRef.current?.focus();
      else rowEditRefs.current.get(lastTarget.id)?.focus();
    } else if (editor.focusIntent === "active-scratch-fallback") {
      if (lastTarget.kind === "scratch-title") contextRef.current?.focus();
      else {
        const rowIndex = breakdowns.findIndex((row) => row.id === lastTarget.id);
        const nextRow = breakdowns[rowIndex + 1] ?? breakdowns[rowIndex - 1];
        if (nextRow !== undefined) rowEditRefs.current.get(nextRow.id)?.focus();
        else addEntryRef.current?.focus();
      }
    }
    lastEditorTargetRef.current = null;
  }, [breakdowns, editor.focusIntent, editor.snapshot]);

  useEffect(() => {
    const editorSnapshot = editor.snapshot;
    if (editorSnapshot === null || editorSnapshot.phase === "invalidated") return;
    if (
      editorSnapshot.target.kind === "scratch-title" &&
      editorSnapshot.target.id !== selectedScratch?.id
    ) {
      editor.invalidate();
      return;
    }
    if (
      editorSnapshot.target.kind === "breakdown" &&
      (!breakdowns.some((row) => row.id === editorSnapshot.target.id) ||
        authoritativeStagedSourceIds.has(editorSnapshot.target.id))
    ) {
      editor.invalidate();
    }
  }, [authoritativeStagedSourceIds, breakdowns, editor, selectedScratch?.id]);
  const persistedConsumedCompletion =
    selectedScratch !== null &&
    isArchiveEligible &&
    breakdowns.length === 0;
  const completionPresentation =
    completion?.presentation ??
    (persistedConsumedCompletion ? "complete" : "working");
  const isConsumedCompletion =
    completion === undefined
      ? persistedConsumedCompletion
      : selectedScratch !== null && completionPresentation !== "working";
  const isCompletionOverlayOpen =
    (completion?.archiveOperation !== undefined &&
      completion.archiveOperation.state.phase !== "idle" &&
      !(
        completion.archiveOperation.state.phase === "terminal" &&
        (completion.archiveOperation.state.terminalStatus === "applied" ||
          completion.archiveOperation.state.terminalStatus === "already_applied")
      )) ||
    (completion !== undefined &&
      isConsumedCompletion &&
      completionPresentation === "overlay");
  const trashReasonId = useId();
  const trashEntryReason =
    selectedScratchId === null
      ? null
      : (trashEntries?.disabledReason(selectedScratchId) ?? null);
  const trashEntryReasonCopy =
    trashEntryReason === null ? null : scratchTrashDisabledCopy(trashEntryReason);
  // The strip is inert with the rest of the Breakdown while the completion
  // overlay or the VQ-03 sheet is up.
  const isTrashEntryDisabled =
    trashEntries === null ||
    selectedScratchId === null ||
    trashEntryReason !== null ||
    isDepartureDecision ||
    isCompletionOverlayOpen;
  const isCompletionComplete =
    completion !== undefined &&
    isConsumedCompletion &&
    completionPresentation === "complete";
  const withdrawalCopy =
    completion?.withdrawalReason === "active-breakdown"
      ? INBOX_TRIAGE_COPY.completion.withdrawal.activeBreakdown
      : completion?.withdrawalReason === "staging"
        ? INBOX_TRIAGE_COPY.completion.withdrawal.staging
        : completion?.withdrawalReason === "breakdown-and-staging"
          ? INBOX_TRIAGE_COPY.completion.withdrawal.breakdownAndStaging
          : null;
  const emptyState = isConsumedCompletion
    ? "consumed-completion"
    : consumedBreakdownCount > 0 || !archiveCandidateClear
      ? "ordinary"
      : hasObservedBreakdownHistory
        ? "all-deleted"
        : "never-used";

  useEffect(() => {
    if (!isAdding) return;
    inputRef.current?.focus();
  }, [isAdding]);

  useLayoutEffect(() => {
    if (
      completionFocusIntentRef.current === "heading" &&
      isCompletionOverlayOpen
    ) {
      completionFocusIntentRef.current = null;
      completionHeadingRef.current?.focus();
    } else if (
      completionFocusIntentRef.current === "reopen" &&
      isCompletionComplete
    ) {
      completionFocusIntentRef.current = null;
      completionReopenRef.current?.focus();
    }
  }, [isCompletionComplete, isCompletionOverlayOpen]);

  useLayoutEffect(() => {
    if (
      previousCompletionPresentationRef.current === "working" &&
      completionPresentation === "overlay" &&
      (document.activeElement === document.body ||
        document.activeElement?.closest("[inert]") !== null)
    ) {
      completionHeadingRef.current?.focus();
    }
    if (
      previousCompletionPresentationRef.current !== "working" &&
      completionPresentation === "working" &&
      completionHadFocusRef.current
    ) {
      document.getElementById("triage-breakdown-heading")?.focus();
      completionHadFocusRef.current = false;
    }
    previousCompletionPresentationRef.current = completionPresentation;
  }, [completionPresentation]);

  useEffect(() => {
    if (
      !addCompletionHoldRef.current ||
      completion?.persistedEligible !== false
    ) {
      return;
    }
    addCompletionHoldRef.current = false;
    onAddDraftBlockerChange?.(newContent.length > 0);
  }, [completion?.persistedEligible, newContent, onAddDraftBlockerChange]);

  function trackCompletionBlur(event: FocusEvent<HTMLElement>) {
    if (
      event.relatedTarget instanceof Node &&
      event.currentTarget.contains(event.relatedTarget)
    ) {
      return;
    }
    if (event.relatedTarget === null && !document.hasFocus()) {
      return;
    }
    completionHadFocusRef.current = false;
  }

  function cancelCompletion() {
    if (operationLock.isLocked()) return;
    completionFocusIntentRef.current = "reopen";
    if (newContent.length === 0) setIsAdding(false);
    completion?.cancel();
  }

  function cancelArchiveResult() {
    if (completion?.archiveOperation?.dismissTerminal() !== true) return;
    cancelCompletion();
  }

  function reopenCompletion() {
    completionFocusIntentRef.current = "heading";
    completion?.reopen();
  }

  useEffect(() => {
    const addedRowId = pendingAddedRowIdRef.current;
    if (addedRowId === null) return;
    const row = rowRefs.current.get(addedRowId);
    if (row === undefined) return;

    pendingAddedRowIdRef.current = null;
    if (breakdownCreatedAtSort === "DESC") {
      if (contentRegionRef.current !== null) {
        contentRegionRef.current.scrollTop = 0;
      }
    } else {
      row.scrollIntoView({ block: "end" });
    }
  }, [breakdownCreatedAtSort, breakdowns, newContent]);

  useEffect(() => {
    const focusTarget = pendingDeleteFocusRef.current;
    if (
      focusTarget === null ||
      breakdowns.some((row) => row.id === focusTarget.deletedId)
    ) {
      return;
    }

    pendingDeleteFocusRef.current = null;
    const nextRow =
      focusTarget.nextId === null
        ? undefined
        : rowRefs.current.get(focusTarget.nextId);
    const previousRow =
      focusTarget.previousId === null
        ? undefined
        : rowRefs.current.get(focusTarget.previousId);
    const rowAction = (nextRow ?? previousRow)?.querySelector<HTMLButtonElement>(
      'button[aria-label="Delete"]',
    );

    if (rowAction !== undefined && rowAction !== null) {
      rowAction.focus();
    } else if (isCompletionOverlayOpen) {
      completionHeadingRef.current?.focus();
    } else if (isConsumedCompletion) {
      contextRef.current?.focus();
    } else {
      addEntryRef.current?.focus();
    }
  }, [
    breakdowns,
    isCompletionOverlayOpen,
    isConsumedCompletion,
    pendingDeleteId,
  ]);

  useEffect(() => {
    if (pendingDeleteId !== null || failedDeleteFocusIdRef.current === null) return;
    const failedRowId = failedDeleteFocusIdRef.current;
    failedDeleteFocusIdRef.current = null;
    rowRefs.current
      .get(failedRowId)
      ?.querySelector<HTMLButtonElement>('button[aria-label="Delete"]')
      ?.focus();
  }, [pendingDeleteId]);

  function collapsePoolIfArmed() {
    if (
      selectedScratchId !== null &&
      scratchPoolExpanded === true &&
      scratchPoolManualExpandedForId !== selectedScratchId
    ) {
      setScratchPoolExpanded(false);
    }
  }

  async function finishAddCommand(
    command: AddBreakdownCommand,
    outcome: Awaited<ReturnType<typeof addBreakdown>>,
    keepInputOpen: boolean,
  ): Promise<void> {
    if ("outcome" in outcome) return;

    operationLock.release(command.operationId, outcome.status);
    if (isConfirmedSuccess(outcome.status)) {
      observeSuccess({
        kind: "add",
        operationId: command.operationId,
        rowId: command.breakdownId,
      });
      addCommandRef.current = null;
      pendingAddedRowIdRef.current = command.breakdownId;
      addCompletionHoldRef.current = completion !== undefined;
      updateAddDraft("");
      if (keepInputOpen) {
        setIsAdding(true);
        requestReliabilityFocus({ target: "add-input" });
      } else {
        setIsAdding(false);
      }
    } else if (outcome.status === "not_applied") {
      requestReliabilityFocus({ target: "add-action" });
    } else {
      requestReliabilityFocus({ target: "add-input" });
    }
  }

  async function dispatchAddCommand(
    command: AddBreakdownCommand,
    keepInputOpen: boolean,
  ): Promise<void> {
    addCommandRef.current = command;
    const outcome = await addBreakdown(command);
    await finishAddCommand(command, outcome, keepInputOpen);
  }

  async function handleAdd({
    keepInputOpen = false,
  }: { keepInputOpen?: boolean } = {}): Promise<void> {
    const trimmed = newContent.trim();
    if (!trimmed) {
      if (!keepInputOpen) {
        setIsAdding(false);
        updateAddDraft("");
      }
      return;
    }

    if (selectedScratch === null) return;
    const command: AddBreakdownCommand = {
      operationId: crypto.randomUUID(),
      breakdownId: crypto.randomUUID(),
      scratchBitId: selectedScratch.id,
      scratchExpectedVersion: selectedScratch.version,
      content: trimmed,
    };
    if (!operationLock.acquire("add", command.operationId)) return;
    await dispatchAddCommand(command, keepInputOpen);
  }

  async function handleReconcileAdd(): Promise<void> {
    const command = addCommandRef.current;
    if (
      command === null ||
      addOperation === null ||
      command.operationId !== addOperation.operationId ||
      addOperation.phase === "reconciling"
    ) {
      return;
    }
    const activeOperation = operationLock.activeOperation;
    if (activeOperation === null) {
      if (!operationLock.acquire("add", command.operationId)) return;
    } else if (activeOperation.operationId !== command.operationId) return;

    addReliabilityActionRef.current?.focus();
    const outcome = await reconcileAddBreakdown(command);
    await finishAddCommand(command, outcome, true);
  }

  async function handleRetryAdd(): Promise<void> {
    const command = addCommandRef.current;
    if (
      command === null ||
      addOperation?.operationId !== command.operationId ||
      addOperation.phase !== "terminal" ||
      addOperation.status !== "not_applied"
    ) {
      return;
    }
    inputRef.current?.focus();
    if (!operationLock.acquire("add", command.operationId)) return;
    await dispatchAddCommand(command, true);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      if (isComposingRef.current || event.nativeEvent.isComposing) return;
      event.preventDefault();
      void handleAdd({ keepInputOpen: true });
      return;
    }

    if (event.key === "Escape") {
      if (operationLock.isLocked()) return;
      setIsAdding(false);
      updateAddDraft("");
      return;
    }

    // First-keystroke collapse: printable single characters only, no modifiers, not composing
    if (
      event.key.length === 1 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey &&
      !isComposingRef.current &&
      !event.nativeEvent.isComposing
    ) {
      collapsePoolIfArmed();
    }
  }

  function handlePlaceholderKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    if (operationLock.isLocked()) return;
    setIsAdding(true);
  }

  async function handleConfirmDelete(): Promise<void> {
    if (pendingDeleteId === null || selectedScratch === null) return;
    const rowIndex = breakdowns.findIndex((row) => row.id === pendingDeleteId);
    const row = breakdowns[rowIndex];
    if (row === undefined) return;
    const command: DeleteBreakdownCommand = {
      operationId: crypto.randomUUID(),
      breakdownId: row.id,
      expectedVersion: row.version,
      scratchBitId: selectedScratch.id,
      scratchExpectedVersion: selectedScratch.version,
    };
    if (!operationLock.acquire("delete", command.operationId)) return;
    deleteCommandRefs.current.set(command.operationId, command);
    setPendingDelete(null);
    requestReliabilityFocus({ target: "delete-trash", rowId: row.id });
    const outcome = await deleteBreakdown(command);
    await finishDeleteCommand(command, outcome, {
      deletedId: row.id,
      nextId: breakdowns[rowIndex + 1]?.id ?? null,
      previousId: breakdowns[rowIndex - 1]?.id ?? null,
    });
  }

  async function finishDeleteCommand(
    command: DeleteBreakdownCommand,
    outcome: Awaited<ReturnType<typeof deleteBreakdown>>,
    focusTarget: NonNullable<typeof pendingDeleteFocusRef.current>,
  ): Promise<void> {
    if ("outcome" in outcome) {
      requestReliabilityFocus({
        target: "delete-action",
        rowId: command.breakdownId,
      });
      return;
    }

    operationLock.release(command.operationId, outcome.status);
    if (isConfirmedSuccess(outcome.status)) {
      deleteCommandRefs.current.delete(command.operationId);
      pendingDeleteFocusRef.current = {
        deletedId: focusTarget.deletedId,
        nextId: focusTarget.nextId,
        previousId: focusTarget.previousId,
      };
    } else {
      failedDeleteFocusIdRef.current = command.breakdownId;
      requestReliabilityFocus({
        target: "delete-trash",
        rowId: command.breakdownId,
      });
    }
  }

  async function handleReconcileDelete(operationId: string): Promise<void> {
    const command = deleteCommandRefs.current.get(operationId);
    const operation = operations.find(
      (candidate) =>
        candidate.kind === "delete" && candidate.operationId === operationId,
    );
    if (
      command === undefined ||
      operation === undefined ||
      operation.phase === "reconciling"
    ) {
      return;
    }
    const activeOperation = operationLock.activeOperation;
    if (activeOperation === null) {
      if (!operationLock.acquire("delete", command.operationId)) return;
    } else if (activeOperation.operationId !== command.operationId) return;

    deleteReliabilityActionRefs.current
      .get(command.breakdownId)
      ?.focus();
    const rowIndex = breakdowns.findIndex(
      (row) => row.id === command.breakdownId,
    );
    const focusTarget = {
      deletedId: command.breakdownId,
      nextId: breakdowns[rowIndex + 1]?.id ?? null,
      previousId: breakdowns[rowIndex - 1]?.id ?? null,
    };
    const outcome = await reconcileDeleteBreakdown(command);
    await finishDeleteCommand(command, outcome, focusTarget);
  }

  if (selectedScratchId === null) {
    return (
      <div ref={setBreakdownDropRef} className="flex flex-col h-full">
        <div className="flex min-h-0 flex-1 items-center justify-center px-4 text-center text-sm text-muted-foreground">
          Select a Scratch to view breakdowns
        </div>
      </div>
    );
  }

  const missingInvalidatedBreakdown =
    editor.snapshot?.phase === "invalidated" &&
    editor.snapshot.target.kind === "breakdown" &&
    !breakdowns.some((row) => row.id === editor.snapshot?.target.id)
      ? editor.snapshot
      : null;
  const invalidatedInsertIndex =
    missingInvalidatedBreakdown === null
      ? -1
      : Math.min(
          invalidatedRowPosition?.id === missingInvalidatedBreakdown.target.id
            ? invalidatedRowPosition.index
            : breakdowns.length,
          breakdowns.length,
        );
  const breakdownRenderItems: Array<
    | { kind: "row"; row: ScratchBreakdown }
    | { kind: "recovery"; snapshot: OpenEditorSnapshot }
  > = breakdowns.map((row) => ({ kind: "row", row }));
  if (missingInvalidatedBreakdown !== null) {
    breakdownRenderItems.splice(invalidatedInsertIndex, 0, {
      kind: "recovery",
      snapshot: missingInvalidatedBreakdown,
    });
  }

  return (
    <div ref={setBreakdownDropRef} className="relative flex h-full flex-col" data-triage-role="breakdown-body">
      {isStagedDrag ? (
        <div
          aria-label="Return staged item to Breakdown"
          className={cn(
            "triage-breakdown__return pointer-events-none absolute inset-2 z-20 flex items-center justify-center rounded-xl border border-dashed bg-card/90 text-sm font-medium text-muted-foreground",
            isBreakdownReturnOver &&
              "border-solid border-primary bg-accent text-foreground",
          )}
          data-drop-active={isBreakdownReturnOver}
          role="region"
        >
          Return to Breakdown
        </div>
      ) : null}
      <StatusAnnouncement announcement={announcement} />
      <div aria-atomic="true" aria-live="polite" className="sr-only">
        {editorAnnouncement}
      </div>
      <div
        aria-atomic="true"
        aria-live="polite"
        className="sr-only"
        data-testid="archive-completion-announcement"
      >
        {isCompletionOverlayOpen && completion?.archiveOperation === undefined
          ? "Scratch complete"
          : ""}
      </div>
      <div
        ref={contentRegionRef}
        className="min-h-0 flex-1 overflow-y-auto px-3 py-2"
        data-testid="breakdown-content-region"
        data-triage-role="breakdown-content-viewport"
        inert={isDepartureDecision || isCompletionOverlayOpen ? true : undefined}
      >
        <div
          ref={contextRef}
          aria-label={`Selected Scratch: ${selectedScratch?.title ?? "Unknown Scratch"}`}
          className="triage-fixed-context mt-2 min-h-[104px] min-w-0 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card px-4 py-4 shadow-sm"
          data-testid="selected-scratch-context"
          data-triage-layout="fixed-inline-editor"
          data-triage-role="context-signature-plate"
          data-triage-state={isCompletionComplete ? "complete" : "working"}
          tabIndex={-1}
        >
          <span data-triage-role="context-title-strip">
            <span aria-hidden="true" data-triage-role="context-dialog-info">
              {INBOX_TRIAGE_COPY.contextPresentation.folderDialogInfo}
            </span>
            <button
              aria-describedby={
                trashEntryReasonCopy === null ? undefined : trashReasonId
              }
              aria-label={
                INBOX_TRIAGE_COPY.accessibleNames.moveSelectedScratchToTrash
              }
              data-scratch-trash-entry="context"
              data-triage-role="context-decoration-close"
              disabled={isTrashEntryDisabled}
              title={
                trashEntryReasonCopy ?? INBOX_TRIAGE_COPY.scratchTrash.tooltip
              }
              type="button"
              onClick={(event) => {
                if (selectedScratchId === null) return;
                trashEntries?.request(selectedScratchId, event.currentTarget);
              }}
            >
              {INBOX_TRIAGE_COPY.contextPresentation.decorativeClose}
            </button>
            {trashEntryReasonCopy === null ? null : (
              <span className="sr-only" id={trashReasonId}>
                {trashEntryReasonCopy}
              </span>
            )}
          </span>
          <span aria-hidden="true" data-triage-role="context-identity-object">
            <Inbox className="h-5 w-5 flex-shrink-0 text-primary/70" data-triage-role="context-base-icon" />
            <Folder data-triage-role="context-folder-icon" />
          </span>
          {editor.snapshot?.target.kind === "scratch-title" ? (
            <InlineEditor
              actionRole="context-action-slot"
              actionTestId="context-action-slot"
              contentBefore={
                <div
                  className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                  data-triage-role="context-eyebrow-meta"
                >
                  Selected Scratch
                </div>
              }
              contentAfter={
                selectedScratch !== null ? (
                  <ScratchTimestamp createdAt={selectedScratch.createdAt} />
                ) : null
              }
              contentClassName="triage-fixed-context__content"
              contentRole="context-content-slot"
              contentTestId="context-content-slot"
              editor={editor}
              onSave={handleEditorSave}
              onUseMine={handleEditorUseMine}
              snapshot={editor.snapshot}
            />
          ) : (
            <>
              <div
                className="triage-fixed-context__content"
                data-testid="context-content-slot"
                data-triage-block-slot="stretch"
                data-triage-role="context-content-slot"
              >
                <div
                  className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                  data-triage-role="context-eyebrow-meta"
                >
                  Selected Scratch
                </div>
                <div
                  className="mt-1 whitespace-pre-wrap break-words text-lg font-semibold text-foreground"
                  data-triage-role="context-title"
                >
                  {selectedScratch?.title ?? "Unknown Scratch"}
                </div>
                {selectedScratch !== null && (
                  <ScratchTimestamp createdAt={selectedScratch.createdAt} />
                )}
              </div>
              <div
                className="triage-fixed-action-slot"
                data-testid="context-action-slot"
                data-triage-block-slot="stretch"
                data-triage-role="context-action-slot"
              >
                <div className="flex items-center gap-2" data-triage-role="context-action-cluster">
                  <Button
                    aria-label={INBOX_TRIAGE_COPY.baseActions.edit}
                    data-triage-role="context-edit-control"
                    ref={contextEditRef}
                    disabled={
                      selectedScratch === null ||
                      operationLock.activeOperation !== null ||
                      editor.snapshot !== null
                    }
                    size="sm"
                    type="button"
                    variant="outline"
                    onClick={handleOpenScratchTitle}
                  >
                    <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                    <span data-triage-role="context-edit-label">
                      {INBOX_TRIAGE_COPY.baseActions.edit}
                    </span>
                  </Button>
                  <Button
                    data-triage-role="context-sort-control"
                    disabled={operationLock.activeOperation !== null}
                    size="sm"
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setBreakdownCreatedAtSort(
                        breakdownCreatedAtSort === "DESC" ? "ASC" : "DESC",
                      )
                    }
                  >
                    <ArrowDownUp aria-hidden="true" className="h-3.5 w-3.5" data-triage-role="context-sort-icon" />
                    <span data-triage-role="context-sort-current-label">
                      <span className="sr-only">
                        {breakdownCreatedAtSort === "DESC"
                          ? INBOX_TRIAGE_COPY.baseActions.sortNewestFirst
                          : INBOX_TRIAGE_COPY.baseActions.sortOldestFirst}
                      </span>
                      <span aria-hidden="true" data-triage-role="context-sort-order-label">
                        {breakdownCreatedAtSort}
                      </span>
                      <span aria-hidden="true" data-triage-role="context-sort-short-label">
                        {breakdownCreatedAtSort === "DESC"
                          ? INBOX_TRIAGE_COPY.baseActions.sortTrackNew
                          : INBOX_TRIAGE_COPY.baseActions.sortTrackOld}
                      </span>
                    </span>
                    <span data-triage-role="context-sort-next-label">
                      {breakdownCreatedAtSort === "DESC"
                        ? INBOX_TRIAGE_COPY.contextPresentation.nextOldestFirst
                        : INBOX_TRIAGE_COPY.contextPresentation.nextNewestFirst}
                    </span>
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Until the first read resolves there are no rows to show and no empty or completion state to claim. */}
        {!isBreakdownReady ? null : breakdownRenderItems.length > 0 ? (
          <div className="mt-2" role="list" data-triage-role="breakdown-row-list">
            {breakdownRenderItems.map((item) =>
              item.kind === "recovery" ? (
                <InvalidatedBreakdownRecoveryRow
                  key={`recovery:${item.snapshot.target.id}`}
                  editor={editor}
                  onSave={handleEditorSave}
                  onUseMine={handleEditorUseMine}
                  snapshot={item.snapshot}
                />
              ) : (
                <BreakdownRow
                  key={item.row.id}
                  deleteOperation={
                    deleteOperationsByBreakdownId.get(item.row.id) ?? null
                  }
                  isStaged={stagedSourceIds.has(item.row.id)}
                  isOperationLocked={operationLock.activeOperation !== null}
                  editor={editor}
                  onEdit={handleOpenBreakdown}
                  onSave={handleEditorSave}
                  onUseMine={handleEditorUseMine}
                  row={item.row}
                  onDelete={(breakdownId) => {
                    const previousOperation =
                      deleteOperationsByBreakdownId.get(breakdownId);
                    if (previousOperation?.phase === "terminal") {
                      hideReliabilityOperation(previousOperation.operationId);
                    }
                    setPendingDelete({
                      scratchBitId: selectedScratchId,
                      breakdownId,
                    });
                  }}
                  onDeleteReliabilityActionRef={(id, element) => {
                    if (element === null) {
                      deleteReliabilityActionRefs.current.delete(id);
                    } else {
                      deleteReliabilityActionRefs.current.set(id, element);
                    }
                  }}
                  onReconcileDelete={(operationId) =>
                    void handleReconcileDelete(operationId)
                  }
                  onEditRef={(id, element) => {
                    if (element === null) rowEditRefs.current.delete(id);
                    else rowEditRefs.current.set(id, element);
                  }}
                  onRowRef={(id, element) => {
                    if (element === null) rowRefs.current.delete(id);
                    else rowRefs.current.set(id, element);
                  }}
                />
              ),
            )}
          </div>
        ) : (
          <div
            className={cn(
              "mt-3 flex min-h-24 flex-col items-center justify-center rounded-xl border px-4 py-5 text-center",
              isConsumedCompletion
                ? "border-primary/25 bg-primary/5"
                : "border-dashed border-border bg-muted/20",
            )}
            data-testid="breakdown-empty-state"
            data-triage-role={
              isConsumedCompletion
                ? "breakdown-consumed-completion"
                : "breakdown-ordinary-empty"
            }
            data-triage-state={emptyState}
          >
            <span aria-hidden="true" data-triage-role="breakdown-empty-object" />
            {isCompletionComplete ? (
              <>
                <CheckCircle2 aria-hidden="true" className="h-6 w-6 text-primary/70" />
                <span className="mt-2 text-xs font-medium text-muted-foreground">
                  Scratch complete
                </span>
                <Button
                  ref={completionReopenRef}
                  className="mt-3"
                  data-triage-role="archive-completion-reopen"
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={reopenCompletion}
                  onFocus={() => {
                    completionHadFocusRef.current = true;
                  }}
                  onBlur={trackCompletionBlur}
                >
                  Reopen
                </Button>
              </>
            ) : isConsumedCompletion ? (
              <CheckCircle2 aria-hidden="true" className="h-6 w-6 text-primary/70" />
            ) : emptyState === "all-deleted" ? (
              <RotateCcw aria-hidden="true" className="h-6 w-6 text-muted-foreground/55" />
            ) : (
              <Lightbulb aria-hidden="true" className="h-6 w-6 text-muted-foreground/55" />
            )}
            {!isCompletionComplete ? (
              <span className="mt-2 text-xs font-medium text-muted-foreground">
                {isConsumedCompletion ? "All items processed" : "Add a note..."}
              </span>
            ) : null}
          </div>
        )}
        {withdrawalCopy !== null ? (
          <div
            aria-atomic="true"
            aria-live="polite"
            className="archive-withdrawal-status"
            data-triage-role="archive-withdrawal-status"
            role="status"
          >
            <span aria-hidden="true" data-triage-role="archive-withdrawal-mark">
              !
            </span>
            <span>{withdrawalCopy}</span>
          </div>
        ) : null}
      </div>

      <div
        className="border-t border-border px-3 py-2"
        data-triage-role="breakdown-add-footer"
        inert={isCompletionOverlayOpen ? true : undefined}
      >
        <div
          className="breakdown-add-region grid grid-cols-[minmax(0,1fr)_auto] gap-2"
          data-testid="breakdown-add-row"
          data-triage-reliability-state={addReliabilityState ?? undefined}
          data-triage-reliability-surface={
            addReliabilityState === null ? undefined : "add"
          }
          inert={isDepartureDecision ? true : undefined}
        >
          {isAdding || addReliabilityState !== null || addStatusSentence !== null ? (
            <div className="breakdown-add-field-wrap">
              <StatusTooltip
                open={isAddTooltipOpen && addPresentation.glyph !== null}
                sentence={addStatusSentence ?? ""}
                onOpenChange={(next) =>
                  setIsAddTooltipOpen(next && addPresentation.glyph !== null)
                }
              >
                <input
                  ref={(element) => {
                    inputRef.current = element;
                    addEntryRef.current = element;
                  }}
                  className="block h-8 w-full appearance-none rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
                  data-triage-role="breakdown-add-field"
                  {...statusEmphasisProps(addPresentation)}
                  maxLength={500}
                  onChange={(event) => updateAddDraft(event.target.value)}
                  onCompositionEnd={() => {
                    isComposingRef.current = false;
                  }}
                  onCompositionStart={() => {
                    isComposingRef.current = true;
                  }}
                  onKeyDown={handleInputKeyDown}
                  placeholder="Add a note..."
                  readOnly={
                    operationLock.activeOperation !== null ||
                    addReliabilityState === "pending" ||
                    addReliabilityState === "unknown" ||
                    addReliabilityState === "reconciling"
                  }
                  type="text"
                  value={newContent}
                />
              </StatusTooltip>
              {addStatusSentence !== null ? (
                <StatusIcon
                  className="breakdown-add-status-icon"
                  presentation={addPresentation}
                  sentence={addStatusSentence}
                />
              ) : null}
            </div>
          ) : (
            <div
              ref={(element) => {
                addEntryRef.current = element;
              }}
              className="flex h-8 cursor-text items-center rounded-md border border-transparent px-2 text-sm text-muted-foreground hover:border-border hover:bg-accent/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              data-triage-role="breakdown-add-field"
              role="button"
              tabIndex={0}
              onClick={() => {
                if (operationLock.activeOperation === null) setIsAdding(true);
              }}
              onKeyDown={handlePlaceholderKeyDown}
            >
              Add a note...
            </div>
          )}
          <div className="breakdown-add-actions">
            {addReliabilityAction !== null ? (
              <Button
                ref={addReliabilityActionRef}
                aria-disabled={
                  addReliabilityState === "reconciling" ? "true" : undefined
                }
                className="breakdown-reliability__action"
                data-triage-role="breakdown-reliability-action"
                size="xs"
                type="button"
                variant={
                  addReliabilityState === "not-applied" ? "default" : "ghost"
                }
                onClick={() => {
                  if (addReliabilityState === "reconciling") return;
                  if (addReliabilityState === "not-applied") {
                    void handleRetryAdd();
                  } else {
                    void handleReconcileAdd();
                  }
                }}
              >
                {addReliabilityAction}
              </Button>
            ) : null}
            <Button
              data-triage-role="breakdown-add-control"
              disabled={
                operationLock.activeOperation !== null ||
                !isAdding ||
                newContent.trim().length === 0
              }
              size="sm"
              type="button"
              onClick={() => void handleAdd({ keepInputOpen: true })}
            >
              {INBOX_TRIAGE_COPY.baseActions.add}
            </Button>
          </div>
          {/* One container stays mounted, so a screen reader registers it before
              its text changes; the inner text is keyed per state. */}
          <div
            aria-atomic="true"
            aria-live="polite"
            className="sr-only"
            data-triage-role="breakdown-add-status-announcement"
            role="status"
          >
            {addStatusSentence !== null ? (
              <span key={`${addOperation?.operationId ?? forcedAdd?.state}:${addSentenceKey}`}>
                {addStatusSentence}
              </span>
            ) : null}
          </div>
        </div>
        {isDepartureDecision ? (
          <div
            ref={departureSheetRef}
            aria-describedby={departureDescriptionId}
            aria-labelledby={departureHeadingId}
            aria-modal="true"
            className="breakdown-departure-sheet"
            data-triage-role="breakdown-departure-sheet"
            data-triage-state="departure-decision"
            role="alertdialog"
            onKeyDown={handleDepartureKeyDown}
          >
            <p
              className="breakdown-departure-sheet__eyebrow"
              data-triage-role="breakdown-departure-eyebrow"
            >
              {INBOX_TRIAGE_COPY.departure.eyebrow}
            </p>
            <h3
              className="breakdown-departure-sheet__heading"
              data-triage-role="breakdown-departure-heading"
              id={departureHeadingId}
            >
              {INBOX_TRIAGE_COPY.departure.heading}
            </h3>
            <p
              className="breakdown-departure-sheet__description"
              data-triage-role="breakdown-departure-description"
              id={departureDescriptionId}
            >
              {INBOX_TRIAGE_COPY.departure.description}
            </p>
            <div
              className="breakdown-departure-sheet__actions"
              data-triage-role="breakdown-departure-actions"
            >
              <Button
                ref={departureContinueRef}
                data-triage-role="breakdown-departure-continue"
                type="button"
                onClick={continueWriting}
                onFocus={(event) => {
                  lastDepartureActionRef.current = event.currentTarget;
                }}
              >
                {INBOX_TRIAGE_COPY.departure.continueAction}
              </Button>
              <Button
                ref={departureDiscardRef}
                className="breakdown-departure-sheet__discard"
                data-triage-role="breakdown-departure-discard"
                type="button"
                variant="ghost"
                onClick={discardAndMove}
                onFocus={(event) => {
                  lastDepartureActionRef.current = event.currentTarget;
                }}
              >
                {INBOX_TRIAGE_COPY.departure.discardAction}
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {isCompletionOverlayOpen ? (
        <div
          ref={completionOverlayRef}
          aria-labelledby="archive-completion-heading"
          className="archive-operation-overlay absolute inset-0 z-30 flex items-center justify-center bg-background/50 p-4 backdrop-blur-[2px]"
          data-triage-role="archive-completion-overlay"
          role="region"
          onFocusCapture={() => {
            completionHadFocusRef.current = true;
          }}
          onBlurCapture={trackCompletionBlur}
          onKeyDown={(event) => {
            if (event.key !== "Escape") return;
            if (
              operationLock.isLocked() ||
              completion?.archiveOperation !== undefined
            ) return;
            event.preventDefault();
            cancelCompletion();
          }}
        >
          <ArchiveOperationCard
            headingRef={completionHeadingRef}
            isLocked={operationLock.activeOperation !== null}
            operation={completion?.archiveOperation}
            onArchive={completion?.archive}
            onCancel={
              completion?.archiveOperation === undefined
                ? cancelCompletion
                : cancelArchiveResult
            }
            scratchTitle={selectedScratch?.title}
          />
        </div>
      ) : null}

      <AlertDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open && !operationLock.isLocked()) {
            setPendingDelete(null);
          }
        }}
      >
        <AlertDialogContent
          className="breakdown-delete-dialog"
          overlayClassName="breakdown-delete-dialog-overlay"
        >
          <span
            aria-hidden="true"
            className="breakdown-delete-dialog__mark"
            data-triage-role="breakdown-delete-mark"
          >
            !
          </span>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete breakdown?</AlertDialogTitle>
            <AlertDialogDescription>
              This note will be removed from the selected Scratch.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={operationLock.activeOperation !== null}
              onClick={() => {
                if (!operationLock.isLocked()) {
                  setPendingDelete(null);
                }
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={operationLock.activeOperation !== null}
              variant="destructive"
              onClick={() => void handleConfirmDelete()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function isConfirmedSuccess(status: RepositoryOperationStatus): boolean {
  return status === "applied" || status === "already_applied";
}
