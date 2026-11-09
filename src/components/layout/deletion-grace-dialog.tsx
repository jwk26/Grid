"use client";

import { TriangleAlert } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { StatusIcon } from "@/components/feedback/status-icon";
import { Button } from "@/components/ui/button";
import { useDisplayDelay } from "@/hooks/use-display-delay";
import { useInertBody } from "@/hooks/use-inert-body";
import {
  deletionDeadline,
  deletionRemainingMs,
  formatCountdown,
  type DeletionClock,
} from "@/lib/auth/deletion-grace";
import type { SessionController } from "@/lib/auth/session";
import { DELETION_GRACE, formatBackupTime } from "@/lib/copy/feedback";

// The deletion-grace dialog (SPEC §Deletion-grace dialog; DESIGN_TOKENS BK-7): the BK-6 overlay
// over the empty app frame (the frame holds no data: the session is the deleting account's), with
// the SA-6 card. Its keys are blocked by the app frame's early listener, which knows this
// screen's data-app-role. The countdown is hidden from screen readers; they read the deadline line.
// With a null controller (a forced state of the development switch) the buttons send nothing.

type Props = {
  clock: DeletionClock;
  controller: Pick<SessionController, "cancelAccountDeletion" | "continueAsGuest"> | null;
};

function useRemaining(clock: DeletionClock): number {
  const [remaining, setRemaining] = useState(() => deletionRemainingMs(clock, performance.now(), Date.now()));
  useEffect(() => {
    const tick = () => setRemaining(deletionRemainingMs(clock, performance.now(), Date.now()));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [clock]);
  return remaining;
}

export function DeletionGraceDialog({ clock, controller }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const deadlineId = useId();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const remaining = useRemaining(clock);
  // The loader appears only after the display delay; it never decides the outcome.
  const showLoader = useDisplayDelay(pending ? "cancel" : null);
  useInertBody(wrapperRef);
  // The first action takes focus when the dialog appears.
  useLayoutEffect(() => cancelRef.current?.focus({ preventScroll: true }), []);
  // The button was disabled while the cancel ran, which drops focus to `body`; a failed cancel
  // gives it back so a keyboard user can press again (Task 266 expert review).
  useEffect(() => {
    if (failed && !pending) cancelRef.current?.focus({ preventScroll: true });
  }, [failed, pending]);
  const stop = (event: React.SyntheticEvent) => event.stopPropagation();

  async function cancel() {
    if (pending || !controller) return;
    setPending(true);
    setFailed(false);
    const result = await controller.cancelAccountDeletion();
    // On `entered` and `deleted` the frame moves on and this dialog unmounts.
    setPending(false);
    if (result === "failed") setFailed(true);
  }

  return (
    <>
      <main
        aria-hidden="true"
        className="triage-shell triage-shell--frame h-dvh w-full bg-background"
        data-app-role="deletion-grace-frame"
        data-testid="app-frame-screen"
        data-triage-role="shell-background"
      />
      {createPortal(
        <div
          ref={wrapperRef}
          className="scratch-trash-dialog-overlay pointer-events-auto fixed inset-0 z-[450] grid place-items-center bg-background/80 p-4 backdrop-blur-sm"
          data-app-role="deletion-grace-dialog"
          onClick={stop}
          onMouseDown={stop}
          onPointerDown={stop}
        >
          <div
            aria-busy={pending ? "true" : undefined}
            aria-describedby={deadlineId}
            aria-labelledby={titleId}
            aria-modal="true"
            className="scratch-trash-dialog relative grid w-full max-w-[calc(100%-2rem)] gap-4 rounded-lg border bg-background p-6 shadow-lg outline-none sm:max-w-lg"
            role="alertdialog"
          >
            <span aria-hidden="true" className="scratch-trash-dialog__mark">
              <TriangleAlert className="h-5 w-5" />
            </span>
            <div className="scratch-trash-dialog__content grid gap-4">
              <div className="grid gap-1.5">
                <h2 className="text-lg font-semibold" data-slot="alert-dialog-title" id={titleId}>
                  {DELETION_GRACE.title}
                </h2>
                <p className="text-sm text-muted-foreground" data-slot="alert-dialog-description" id={deadlineId}>
                  {DELETION_GRACE.deadline(formatBackupTime(deletionDeadline(clock)))}
                </p>
              </div>
              {remaining > 0 ? (
                <p className="flex items-baseline gap-2 text-sm" data-app-role="deletion-grace-countdown">
                  <span aria-hidden="true" className="font-mono text-lg font-semibold tabular-nums">
                    {formatCountdown(remaining)}
                  </span>
                  <span aria-hidden="true" className="text-muted-foreground">
                    {DELETION_GRACE.countdownLabel}
                  </span>
                </p>
              ) : (
                <p className="text-sm font-medium" data-app-role="deletion-grace-zero">
                  {DELETION_GRACE.zero}
                </p>
              )}
              <p
                aria-live="polite"
                className="scratch-trash-dialog__state flex min-h-5 items-center gap-2 text-sm font-medium"
                role="status"
              >
                {pending && showLoader ? (
                  <StatusIcon
                    presentation={{ status: "pending", glyph: "loader", emphasis: false }}
                    sentence={DELETION_GRACE.cancel}
                    style={{ "--status-icon-size": "16px" } as React.CSSProperties}
                  />
                ) : null}
                {failed ? DELETION_GRACE.cancelFailed : ""}
              </p>
              <div className="flex flex-wrap justify-end gap-2" data-app-role="deletion-grace-actions">
                <Button ref={cancelRef} disabled={pending} type="button" onClick={() => void cancel()}>
                  {DELETION_GRACE.cancel}
                </Button>
                <Button
                  disabled={pending}
                  type="button"
                  variant="outline"
                  onClick={() => void controller?.continueAsGuest()}
                >
                  {DELETION_GRACE.continueAsGuest}
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
