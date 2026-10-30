"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { StatusIcon } from "@/components/feedback/status-icon";
import { Button } from "@/components/ui/button";
import { setTurnstileHost } from "@/lib/auth/turnstile";
import { takeHomeReturn } from "@/lib/auth/user-change";
import { useDisplayDelay } from "@/hooks/use-display-delay";
import {
  getSessionController,
  type EntryState,
  type SessionController,
} from "@/lib/auth/session";
import {
  ACCOUNT_BEING_DELETED,
  ACCOUNT_DELETED,
  ACCOUNT_MODAL,
  GUEST_CREATION_FAILURE,
  LOAD_FAILURE,
  LOADING,
  SECURITY_CHECK,
  SESSION_EXPIRED,
} from "@/lib/copy/feedback";

// The app-level frame (SPEC §App-level screens; DESIGN_TOKENS SA-4, option C): one text block on
// the shell background that replaces the whole app, sidebar included, until the account is
// loaded. Children mount only while the account is `ready`, so data hooks never run against an
// empty or reset snapshot. While entering nothing shows for the first `DISPLAY_DELAY_MS`, then the
// Loading screen (SA-3), so a fast load never flashes it.

const ENTERING: EntryState = { phase: "entering" };

function useEntryState(controller: SessionController | null): EntryState {
  return useSyncExternalStore(
    (listener) => controller?.subscribe(listener) ?? (() => undefined),
    () => controller?.getState() ?? ENTERING,
    () => ENTERING,
  );
}

type ScreenProps = {
  title: string;
  reason?: string;
  actions: ReactNode;
};

function Screen({ title, reason, actions }: ScreenProps) {
  const actionsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    actionsRef.current?.querySelector<HTMLElement>("button")?.focus();
  }, []);
  return (
    <main
      className="triage-shell triage-shell--frame h-dvh w-full bg-background"
      data-testid="app-frame-screen"
      data-triage-role="shell-background"
    >
      <div className="grid max-w-[440px] place-self-center justify-items-center gap-3 text-center">
        <h1 className="text-xl font-semibold">{title}</h1>
        {reason ? <p className="text-sm text-muted-foreground">{reason}</p> : null}
        <div ref={actionsRef} className="flex flex-wrap justify-center gap-2 pt-1">
          {actions}
        </div>
      </div>
    </main>
  );
}

function LoadingScreen() {
  // Mounted only while entering, so every entry (a user change in another tab included) restarts
  // the delay. It postpones presentation only; it never decides that the load succeeded.
  const due = useDisplayDelay("loading");
  const titleId = useId();
  if (!due) return null;
  return (
    <main
      aria-busy="true"
      className="triage-shell triage-shell--frame h-dvh w-full bg-background"
      data-app-role="app-frame-loading"
      data-testid="app-frame-screen"
      data-triage-role="shell-background"
    >
      <div className="grid max-w-[440px] place-self-center justify-items-center gap-3 text-center">
        <h1 id={titleId} className="text-xl font-semibold">
          {LOADING.title}
        </h1>
        <StatusIcon
          aria-labelledby={titleId}
          presentation={{ status: "pending", glyph: "loader", emphasis: false }}
          sentence={LOADING.title}
          style={{ "--status-icon-size": "28px" } as React.CSSProperties}
        />
      </div>
    </main>
  );
}

// The Turnstile widget's one host (SPEC §Account entry): mounted once and never moved, since moving
// an iframe reloads it. It is invisible until an interactive check is due, then sits where the
// Security check screen leaves its gap: below the title, centred in the window.
function TurnstileHost({ visible }: { visible: boolean }) {
  return createPortal(
    <div
      ref={setTurnstileHost}
      aria-hidden={visible ? undefined : "true"}
      className={
        visible
          ? "fixed inset-x-0 top-[calc(50%-10px)] z-[60] flex h-[65px] justify-center"
          : "pointer-events-none fixed left-0 top-0 h-0 w-0 overflow-hidden"
      }
      data-app-role="turnstile-host"
    />,
    document.body,
  );
}

function FrameScreen({
  state,
  controller,
  children,
}: {
  state: EntryState;
  controller: SessionController | null;
  children: ReactNode;
}) {
  switch (state.phase) {
    case "ready":
      return <>{children}</>;
    case "security-check":
      // The widget (300×65) is laid over the gap by `TurnstileHost`.
      return <Screen key={state.phase} title={SECURITY_CHECK.title} actions={<div className="h-[65px] w-[300px]" />} />;
    case "load-failure":
      return (
        <Screen
          key={state.phase}
          title={LOAD_FAILURE.title}
          reason={LOAD_FAILURE.reason[state.reason]}
          actions={<Button onClick={() => void controller?.retry()}>{LOAD_FAILURE.retry}</Button>}
        />
      );
    case "guest-failure":
      return (
        <Screen
          key={state.phase}
          title={GUEST_CREATION_FAILURE.title}
          reason={GUEST_CREATION_FAILURE.reason[state.reason]}
          actions={
            <Button onClick={() => void controller?.retry()}>{GUEST_CREATION_FAILURE.retry}</Button>
          }
        />
      );
    case "session-expired":
      return (
        <Screen
          key={state.phase}
          title={SESSION_EXPIRED[state.variant].title}
          reason={SESSION_EXPIRED[state.variant].reason}
          actions={
            <>
              <Button variant="outline" onClick={() => void controller?.signInWithOAuth("github")}>
                {ACCOUNT_MODAL.guest.signInGithub}
              </Button>
              <Button variant="outline" onClick={() => void controller?.signInWithOAuth("google")}>
                {ACCOUNT_MODAL.guest.signInGoogle}
              </Button>
              <Button onClick={() => void controller?.continueAsGuest()}>{SESSION_EXPIRED.continueAsGuest}</Button>
            </>
          }
        />
      );
    case "account-deleting":
      return (
        <Screen
          key={state.phase}
          title={ACCOUNT_BEING_DELETED.title}
          reason={ACCOUNT_BEING_DELETED.reason}
          actions={
            <Button onClick={() => void controller?.continueAsGuest()}>
              {ACCOUNT_BEING_DELETED.continueAsGuest}
            </Button>
          }
        />
      );
    case "account-deleted":
      return (
        <Screen
          key={state.phase}
          title={ACCOUNT_DELETED.title}
          reason={ACCOUNT_DELETED.reason}
          actions={
            <Button onClick={() => void controller?.continueAsGuest()}>{ACCOUNT_DELETED.continueAsGuest}</Button>
          }
        />
      );
    case "entering":
      return <LoadingScreen />;
  }
}

export function AppFrame({
  children,
  controller: injected,
}: {
  children: ReactNode;
  /** Tests inject a controller; the app uses the shared one. */
  controller?: SessionController;
}) {
  // The shared controller reads `localStorage`, so it exists only in the browser.
  const controller = injected ?? (typeof window === "undefined" ? null : getSessionController());
  const state = useEntryState(controller);
  const router = useRouter();

  // A user change leaves the address naming the old user's ids. It goes back to Home through the
  // router while a screen replaces the app, so nothing of the new user mounts on the old route.
  useEffect(() => {
    if (state.phase === "ready" || !takeHomeReturn()) return;
    if (window.location.pathname !== "/" || window.location.search !== "") router.replace("/");
  }, [state.phase, router]);

  useEffect(() => {
    void controller?.start();
  }, [controller]);

  // The host exists only where a site key is configured; the key is read literally so Next inlines it.
  // A portal cannot be part of the server render, so the host joins after hydration.
  const isClient = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const hasCaptcha = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
  const screen = <FrameScreen state={state} controller={controller}>{children}</FrameScreen>;
  if (!hasCaptcha || !isClient) return screen;
  return (
    <>
      {screen}
      <TurnstileHost visible={state.phase === "security-check"} />
    </>
  );
}
