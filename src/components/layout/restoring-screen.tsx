"use client";

import { Check, CloudUpload } from "lucide-react";
import { useId, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { StatusIcon } from "@/components/feedback/status-icon";
import { Button } from "@/components/ui/button";
import { useRestore, type UseRestore } from "@/hooks/use-backup";
import { useInertBody } from "@/hooks/use-inert-body";
import { RESTORE_STEPS } from "@/lib/backup/backup-client";
import { BACKUP_COPY, RESTORING_COPY } from "@/lib/copy/feedback";
import { cn } from "@/lib/utils";

// The restoring screen (SPEC §Account backup, Restore; DESIGN_TOKENS BK-6): a blocking dialog over
// the blurred app, which stays mounted and `inert`. This tab shows the three steps as the function
// reports them; another tab of the browser shows the other-tab text; after the way-out it shows
// `Still finishing…` with `Check again`. Nothing here infers progress from elapsed time (Rule 6),
// and keys are blocked by the app frame's early listener (it knows this screen's data-app-role).

type Mode = "self" | "other" | "wayout";

// One 16px slot for every marker (user's choice A, 2026-11-08): the F03 loader while current or
// waiting (the one rotation DESIGN_TOKENS allows; still under reduced motion), an outline circle
// while pending, a check once reached, and the problem icon on a failed read.
const SLOT_STYLE = { "--status-icon-size": "16px" } as React.CSSProperties;

function Loader({ sentence }: { sentence: string }) {
  return (
    <StatusIcon
      presentation={{ status: "pending", glyph: "loader", emphasis: false }}
      sentence={sentence}
      style={SLOT_STYLE}
    />
  );
}

function Problem({ sentence }: { sentence: string }) {
  return (
    <StatusIcon
      presentation={{ status: "problem", glyph: "exclamation", emphasis: true }}
      sentence={sentence}
      style={SLOT_STYLE}
    />
  );
}

export function RestoringScreen({ restore: injected }: { restore?: UseRestore }) {
  const real = useRestore();
  const restore = injected ?? real;
  const view = restore.state.view;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const reasonId = useId();
  useInertBody(wrapperRef);
  // Focus moves to the card so a screen reader announces it.
  useLayoutEffect(() => cardRef.current?.focus({ preventScroll: true }), []);
  // A press on the screen is outside any dialog the app left open; it must not reach that dialog's
  // outside-press handler on `document` (the narrow notice does the same).
  const stop = (event: React.SyntheticEvent) => event.stopPropagation();

  if (view.phase === "idle") return null;
  const role = view.role;
  const mode: Mode = view.phase === "wayout" ? "wayout" : role;
  const step = view.phase === "restoring" && view.role === "self" ? view.step : null;
  const reached = step === null ? -1 : RESTORE_STEPS.indexOf(step);
  const title = role === "other" ? RESTORING_COPY.otherTitle : RESTORING_COPY.title;
  const reason = role === "other" ? RESTORING_COPY.otherReason : RESTORING_COPY.reason;

  return createPortal(
    <div
      ref={wrapperRef}
      className="scratch-trash-dialog-overlay pointer-events-auto fixed inset-0 z-[450] grid place-items-center bg-background/80 p-4 backdrop-blur-sm"
      data-app-role="restoring-screen"
      data-restoring-mode={mode}
      onClick={stop}
      onMouseDown={stop}
      onPointerDown={stop}
    >
      <div
        ref={cardRef}
        aria-describedby={reasonId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="scratch-trash-dialog relative grid w-full max-w-[calc(100%-2rem)] gap-4 rounded-lg border bg-background p-6 shadow-lg outline-none sm:max-w-lg"
        role="alertdialog"
        tabIndex={-1}
      >
        <span aria-hidden="true" className="scratch-trash-dialog__mark">
          <CloudUpload className="h-5 w-5" />
        </span>
        <div className="scratch-trash-dialog__content grid gap-4">
          <div className="grid gap-1.5">
            <h2 className="text-lg font-semibold" data-slot="alert-dialog-title" id={titleId}>
              {title}
            </h2>
            <p className="text-sm text-muted-foreground" data-slot="alert-dialog-description" id={reasonId}>
              {reason}
            </p>
          </div>
          {mode === "self" ? (
            <ol aria-label={RESTORING_COPY.stepsLabel} className="grid gap-2 text-sm font-medium" data-app-role="restoring-steps">
              {RESTORE_STEPS.map((name, index) => {
                const state = index < reached ? "done" : index === reached ? "current" : "pending";
                return (
                  <li
                    key={name}
                    aria-current={state === "current" ? "step" : undefined}
                    className={cn("flex items-center gap-2.5", state === "pending" && "text-muted-foreground")}
                    data-restoring-step={name}
                    data-restoring-state={state}
                  >
                    <span className="grid h-4 w-4 shrink-0 place-items-center">
                      {state === "done" ? (
                        <Check aria-hidden="true" className="h-4 w-4" />
                      ) : state === "current" ? (
                        <Loader sentence={RESTORING_COPY.steps[name]} />
                      ) : (
                        <span
                          aria-hidden="true"
                          className="inline-block h-4 w-4 rounded-full border-2 border-current opacity-25"
                          data-app-role="restoring-pending-marker"
                        />
                      )}
                    </span>
                    <span>{RESTORING_COPY.steps[name]}</span>
                  </li>
                );
              })}
            </ol>
          ) : null}
          {view.phase === "wayout" ? (
            <div className="grid gap-1">
              <p aria-live="polite" className="scratch-trash-dialog__state flex items-center gap-2.5 text-sm font-medium" role="status">
                <span className="grid h-4 w-4 shrink-0 place-items-center">
                  {view.readFailed ? (
                    <Problem sentence={BACKUP_COPY.readFailed} />
                  ) : (
                    <Loader sentence={view.reading ? BACKUP_COPY.checking : BACKUP_COPY.stillFinishing} />
                  )}
                </span>
                <span>
                  {view.reading ? BACKUP_COPY.checking : view.readFailed ? BACKUP_COPY.readFailed : BACKUP_COPY.stillFinishing}
                </span>
              </p>
              <div className="pl-[26px]">
                <Button disabled={view.reading} size="sm" type="button" variant="outline" onClick={restore.checkAgain}>
                  {BACKUP_COPY.checkAgain}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
