"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type {
  TrashScratchDisabledReason,
  TrashScratchState,
  TrashScratchView,
} from "@/hooks/use-trash-scratch";
import { INBOX_TRIAGE_COPY } from "@/lib/copy/inbox-triage";

/** The reason a Trash entry is disabled, as exposed to assistive tech and in the tooltip. */
export function scratchTrashDisabledCopy(
  reason: TrashScratchDisabledReason,
): string {
  const copy = INBOX_TRIAGE_COPY.scratchTrash.disabled;
  return reason === "placement-open"
    ? copy.placementOpen
    : reason === "unresolved-source"
      ? copy.unresolvedSource
      : INBOX_TRIAGE_COPY.newlyPlacedUndo.eligibility.operationLocked;
}

type ScratchTrashDialogProps = Readonly<{
  state: TrashScratchState;
  view: TrashScratchView;
  onCancel: () => void;
  onConfirm: () => void;
  onRetry: () => void;
  onCheckAgain: () => void;
  onCloseAutoFocus?: (event: Event) => void;
}>;

function BoldTitleBody({ title }: { title: string }) {
  const [before, after] = INBOX_TRIAGE_COPY.scratchTrash.body.split("{title}");
  return (
    <p data-triage-role="scratch-trash-body">
      {before}
      <strong>{title}</strong>
      {after}
    </p>
  );
}

/**
 * The one Scratch Trash confirmation. Presentation only: every state comes from
 * the Task 209 coordinator, and no theme id branches here (theme CSS reaches it
 * through the `scratch-trash-dialog` classes).
 */
export function ScratchTrashDialog({
  state,
  view,
  onCancel,
  onConfirm,
  onRetry,
  onCheckAgain,
  onCloseAutoFocus,
}: ScratchTrashDialogProps) {
  const copy = INBOX_TRIAGE_COPY.scratchTrash;
  const open = state.phase !== "closed";
  const phase = state.phase;
  const target = state.phase === "closed" ? null : state.target;

  const isConfirmation = phase === "confirming" || phase === "conflict";
  const isWorking = phase === "pending" || phase === "reconciling";
  const canCancel =
    phase === "confirming" ||
    phase === "not_applied" ||
    phase === "conflict" ||
    phase === "rejected";
  const stateLine =
    phase === "pending"
      ? copy.states.pending
      : phase === "not_applied"
        ? copy.states.notApplied
        : phase === "unknown" || phase === "reconciling"
          ? copy.states.unknown
          : phase === "conflict"
            ? copy.states.conflict
            : phase === "rejected"
              ? copy.states.rejected
              : null;
  const stagedLine =
    view.candidateCount === 0
      ? null
      : view.candidateCount === 1
        ? copy.stagedOne
        : copy.stagedMany.replace("{count}", String(view.candidateCount));
  const confirmBlockedByLostSource = view.confirmDisabledReason === "unresolved-source";

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        // Escape and Cancel both land here; the coordinator refuses while it
        // is pending, reconciling or unknown, so the dialog stays open then.
        if (!next) onCancel();
      }}
    >
      <AlertDialogContent
        className="scratch-trash-dialog"
        data-triage-role="scratch-trash-dialog"
        data-triage-state={phase}
        overlayClassName="scratch-trash-dialog-overlay"
        onCloseAutoFocus={onCloseAutoFocus}
        onEscapeKeyDown={(event) => {
          if (!canCancel) event.preventDefault();
        }}
      >
        <span
          aria-hidden="true"
          className="scratch-trash-dialog__mark"
          data-triage-role="scratch-trash-mark"
        >
          !
        </span>
        <div className="scratch-trash-dialog__content grid gap-4">
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.title}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="grid gap-1.5">
                {target === null ? null : <BoldTitleBody title={target.title} />}
                {stagedLine === null ? null : (
                  <p data-triage-role="scratch-trash-staged">{stagedLine}</p>
                )}
                {view.hasDiscardableWork ? (
                  <p data-triage-role="scratch-trash-draft">{copy.draft}</p>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <p
            aria-live="polite"
            className="scratch-trash-dialog__state min-h-5 text-sm font-medium"
            data-triage-role="scratch-trash-state"
            role="status"
          >
            {stateLine ?? ""}
          </p>
          <AlertDialogFooter>
            {phase === "unknown" || phase === "reconciling" ? null : (
              <AlertDialogCancel disabled={!canCancel}>
                {copy.actions.cancel}
              </AlertDialogCancel>
            )}
            {isConfirmation ? (
              <Button
                disabled={confirmBlockedByLostSource}
                type="button"
                variant="destructive"
                onClick={onConfirm}
              >
                {copy.actions.confirm}
              </Button>
            ) : null}
            {phase === "not_applied" ? (
              <Button type="button" variant="destructive" onClick={onRetry}>
                {copy.actions.retry}
              </Button>
            ) : null}
            {phase === "unknown" || phase === "reconciling" ? (
              <Button
                disabled={isWorking}
                type="button"
                variant="outline"
                onClick={onCheckAgain}
              >
                {copy.actions.checkAgain}
              </Button>
            ) : null}
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
