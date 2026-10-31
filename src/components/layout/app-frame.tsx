"use client";

import { useEffect, useId, useRef, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { StatusIcon } from "@/components/feedback/status-icon";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useDisplayDelay } from "@/hooks/use-display-delay";
import {
  getSessionController,
  type EntryState,
  type SessionController,
} from "@/lib/auth/session";
import {
  GUEST_CREATION_FAILURE,
  LOAD_FAILURE,
  LOADING,
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

// Mounted only while the account is not ready, so it never overwrites a page's own title.
function NotReadyTitle() {
  useDocumentTitle(null);
  return null;
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

  if (state.phase === "ready") {
    return <>{children}</>;
  }

  // Not ready: no page is mounted to set the tab title, so the frame sets the app name.
  return (
    <>
      <NotReadyTitle />
      {renderScreen(state)}
    </>
  );

  function renderScreen(state: Exclude<EntryState, { phase: "ready" }>) {
    switch (state.phase) {
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
        return <LoadingScreen />;
    }
  }
}
