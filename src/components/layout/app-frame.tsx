"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  getSessionController,
  type EntryState,
  type SessionController,
} from "@/lib/auth/session";
import {
  GUEST_CREATION_FAILURE,
  LOAD_FAILURE,
  SESSION_EXPIRED,
} from "@/lib/copy/feedback";

// The app-level frame (SPEC §App-level screens; DESIGN_TOKENS SA-4, option C): one text block on
// the shell background that replaces the whole app, sidebar included, until the account is
// loaded. Children mount only while the account is `ready`, so data hooks never run against an
// empty or reset snapshot. The Loading screen comes with Task 234; until then nothing shows
// while entering.

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

  useEffect(() => {
    void controller?.start();
  }, [controller]);

  switch (state.phase) {
    case "ready":
      return <>{children}</>;
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
            <Button onClick={() => void controller?.continueAsGuest()}>
              {SESSION_EXPIRED.continueAsGuest}
            </Button>
          }
        />
      );
    case "entering":
      return null;
  }
}
