"use client";

import { UserRound, UserRoundCheck, WifiOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { StatusAnnouncement, useStatusAnnouncement } from "@/components/feedback/status-announcement";
import { StatusTooltip } from "@/components/feedback/status-tooltip";
import { getSessionController, type SessionController } from "@/lib/auth/session";
import { ACCOUNT_BUTTON_LABEL, ACCOUNT_MODAL, CONNECTION_SENTENCE } from "@/lib/copy/feedback";
import { useConnectionState } from "@/lib/db/connection";
import type { ConnectionState } from "@/lib/db/connection-monitor";
import { AccountModal } from "@/components/layout/account-modal";
import { cn } from "@/lib/utils";

// The sidebar account icon (SPEC §Account icon and modal; DESIGN_TOKENS SA-1, SA-2): the button
// that opens the account modal. Its tooltip is the connection sentence while the connection is
// unstable or offline, and the badge carries the state.

const BADGE_TONE: Record<Exclude<ConnectionState, "normal">, string> = {
  unstable:
    "bg-[hsl(var(--status-warning-surface))] text-[hsl(var(--status-warning))] shadow-[inset_0_0_0_1px_hsl(var(--status-warning-border))]",
  offline:
    "bg-[hsl(var(--status-error-surface))] text-[hsl(var(--status-error))] shadow-[inset_0_0_0_1px_hsl(var(--status-error-border))]",
};

function ConnectionBadge({ state }: { state: Exclude<ConnectionState, "normal"> }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "absolute -top-1 -right-1 z-10 flex h-4 min-w-4 translate-x-[25%] -translate-y-[25%] items-center justify-center rounded-full px-1 font-mono text-[10px] font-bold leading-none ring-2 ring-background",
        BADGE_TONE[state],
      )}
      data-app-role="account-badge"
      data-connection-state={state}
    >
      {state === "unstable" ? "!" : <WifiOff className="h-[10px] w-[10px]" strokeWidth={3} />}
    </span>
  );
}

// Each change to unstable or offline is announced once; a recovery says `Back online.` to screen
// readers only. The state the icon mounts with is not announced.
function useConnectionAnnouncement(state: ConnectionState) {
  const { announcement, announce } = useStatusAnnouncement();
  const previous = useRef(state);
  useEffect(() => {
    if (previous.current === state) return;
    const from = previous.current;
    previous.current = state;
    if (state === "normal") announce(CONNECTION_SENTENCE.recovered);
    else if (from !== state) announce(CONNECTION_SENTENCE[state]);
  }, [state, announce]);
  return announcement;
}

export function AccountButton({
  variant,
  controller: injected,
}: {
  variant: "guest" | "account";
  /** Tests inject a controller; the app uses the shared one. */
  controller?: Pick<SessionController, "hasSignInError" | "takeSignInError" | "subscribeSignInError">;
}) {
  const state = useConnectionState();
  const announcement = useConnectionAnnouncement(state);
  const [open, setOpen] = useState(false);
  const controller = injected ?? getSessionController();
  // A sign-in that did not complete reopens the modal once, with its inline error (SPEC §Account
  // icon and modal). Entry sets the flag before the app mounts; the effect only consumes it.
  const [modalOpen, setModalOpen] = useState(() => controller.hasSignInError());
  const [signInError, setSignInError] = useState<string | null>(() =>
    controller.hasSignInError() ? ACCOUNT_MODAL.guest.signInError : null,
  );
  useEffect(() => {
    controller.takeSignInError();
    // A page restored from the back-forward cache raises the same error while the app is showing.
    return controller.subscribeSignInError(() => {
      if (!controller.takeSignInError()) return;
      setSignInError(ACCOUNT_MODAL.guest.signInError);
      setModalOpen(true);
    });
  }, [controller]);
  const Icon = variant === "account" ? UserRoundCheck : UserRound;
  const sentence = state === "normal" ? "" : CONNECTION_SENTENCE[state];

  return (
    <>
      <StatusTooltip
        sentence={sentence}
        side="right"
        // Radix adds the arrow's measured size (10px, the `size-2.5` square) to `sideOffset`, so a
        // negative offset puts the tooltip body 8px from the icon (SA-2).
        sideOffset={-2}
        open={sentence !== "" && open}
        onOpenChange={setOpen}
      >
        <button
          aria-haspopup="dialog"
          aria-label={ACCOUNT_BUTTON_LABEL}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-transparent p-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          data-app-role="account-button"
          type="button"
          onClick={() => {
            setOpen(false);
            setModalOpen(true);
          }}
        >
          <span className="relative flex h-5 w-5 items-center justify-center">
            <Icon className="h-5 w-5" />
            {state === "normal" ? null : <ConnectionBadge state={state} />}
          </span>
        </button>
      </StatusTooltip>
      <StatusAnnouncement announcement={announcement} />
      <AccountModal
        variant={variant}
        open={modalOpen}
        signInError={signInError}
        onOpenChange={(next) => {
          setModalOpen(next);
          if (!next) setSignInError(null);
        }}
      />
    </>
  );
}
