"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { StatusIcon } from "@/components/feedback/status-icon";
import { DeletionGraceDialog } from "@/components/layout/deletion-grace-dialog";
import { RestoringScreen } from "@/components/layout/restoring-screen";
import { ScreenBlock } from "@/components/layout/screen-block";
import { Button } from "@/components/ui/button";
import { setTurnstileHost } from "@/lib/auth/turnstile";
import { useForcedDeletionGrace } from "@/lib/auth/forced-deletion-grace";
import { takeHomeReturn } from "@/lib/auth/user-change";
import { useInertBody } from "@/hooks/use-inert-body";
import { useRestore } from "@/hooks/use-backup";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useDisplayDelay } from "@/hooks/use-display-delay";
import { isNarrowWindow, subscribeNarrowWindow } from "@/lib/viewport";
import {
  getSessionController,
  type EntryState,
  type SessionController,
} from "@/lib/auth/session";
import {
  ACCOUNT_DELETED,
  ACCOUNT_MODAL,
  GUEST_CREATION_FAILURE,
  LOAD_FAILURE,
  LOADING,
  NARROW_WINDOW,
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
      <ScreenBlock title={title} reason={reason} actions={actions} actionsRef={actionsRef} />
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

// Mounted only while the account is not ready, so it never overwrites a page's own title.
function NotReadyTitle() {
  useDocumentTitle(null);
  return null;
}

// The narrow-window notice (SPEC §Account entry step 1; DESIGN_TOKENS SA-5): the SA-4 frame as an
// opaque full-window layer, above every app layer (the highest is the Scratch modal, `z-[400]`),
// with no action. The app is not replaced: every other child of `body` gets `inert` while the notice
// shows, portalled dialogs and the Turnstile host included, so nothing under it can be used and
// widening the window brings back the same screen. A portal added meanwhile is made inert by the
// observer; widening removes only what this notice set.
function NarrowNotice() {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const reasonId = useId();
  const cardRef = useRef<HTMLDivElement>(null);
  useInertBody(ref);
  // Focus moves to the notice so a screen reader announces it; widening returns focus to where it was.
  useLayoutEffect(() => cardRef.current?.focus({ preventScroll: true }), []);
  // A press on the notice is outside any dialog the app left open; it must not reach that dialog's
  // outside-press handler on `document`. A modal Radix layer sets `pointer-events: none` on `body`,
  // which the notice would inherit and then never be the press's target, so it sets its own.
  const stop = (event: React.SyntheticEvent) => event.stopPropagation();
  return createPortal(
    <div
      ref={ref}
      data-app-role="narrow-notice"
      // The narrow notice stays on top of a restoring screen: it must not be made inert by it.
      data-inert-exempt=""
      className="pointer-events-auto fixed inset-0 z-[500]"
      onPointerDown={stop}
      onMouseDown={stop}
      onClick={stop}
    >
      {/* The SA-4 frame's surface and text block (the `Screen` look) as a full-window layer; it is
          not a `FrameScreen`, since those replace the app and the app must stay mounted. The fixed
          wrapper is a separate element because `.triage-shell` sets `position: relative`. */}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        aria-labelledby={titleId}
        aria-describedby={reasonId}
        className="triage-shell triage-shell--frame h-full w-full bg-background outline-none"
        data-triage-role="shell-background"
      >
        <div className="grid max-w-[440px] place-self-center justify-items-center gap-3 text-center">
          <h1 id={titleId} className="text-xl font-semibold">
            {NARROW_WINDOW.title}
          </h1>
          <p id={reasonId} className="text-sm text-muted-foreground">
            {NARROW_WINDOW.reason}
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// `inert` does not stop `document` and `window` listeners, so while the window is narrow no key
// reaches the app: Esc would close the Bit popup and Cmd+K open the palette under the notice. It
// is a layout effect so it is registered before any child's effect, the command palette's capture
// listener on `window` included.
function useNarrowKeyBlock(restoring: boolean) {
  // `restoring` also stands for the deletion-grace dialog, which blocks keys the same way.
  // The restoring screen blocks keys the same way (work-plan review item 3): it is the same early
  // layout-effect listener, so it runs before the command palette's capture listener. Keys whose
  // target is inside the restoring screen itself still reach its `Check again` button; Esc does
  // nothing there.
  const restoringRef = useRef(restoring);
  useLayoutEffect(() => {
    restoringRef.current = restoring;
  }, [restoring]);
  useLayoutEffect(() => {
    const block = (event: KeyboardEvent) => {
      if (isNarrowWindow()) return void event.stopImmediatePropagation();
      if (!restoringRef.current) return;
      const target = event.target instanceof Element ? event.target : null;
      const inside = target?.closest('[data-app-role="restoring-screen"], [data-app-role="deletion-grace-dialog"], [data-inert-exempt]') != null;
      // Focus sits inside the screen, so a real Cmd+K or Esc targets it: only plain keys pass, for the button.
      if (!inside || event.key === "Escape" || event.metaKey || event.ctrlKey || event.altKey) event.stopImmediatePropagation();
    };
    window.addEventListener("keydown", block, { capture: true });
    window.addEventListener("keyup", block, { capture: true });
    return () => {
      window.removeEventListener("keydown", block, { capture: true });
      window.removeEventListener("keyup", block, { capture: true });
    };
  }, []);
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
      return <DeletionGraceDialog key={state.phase} clock={state} controller={controller} />;
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
  const realState = useEntryState(controller);
  // The development switch can force the deletion-grace dialog; always null in production. A forced
  // dialog replaces the entry state, so the app unmounts as it does for the real one, and sends nothing.
  const forcedClock = useForcedDeletionGrace();
  const state: EntryState = forcedClock ? { phase: "account-deleting", ...forcedClock } : realState;
  const router = useRouter();
  const narrow = useSyncExternalStore(subscribeNarrowWindow, isNarrowWindow, () => false);
  const restore = useRestore();
  const restoring = restore.state.view.phase !== "idle";
  useNarrowKeyBlock(restoring || state.phase === "account-deleting");

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
  const screen = (
    <>
      {/* Not ready: no page is mounted to set the tab title, so the frame sets the app name. */}
      {state.phase !== "ready" ? <NotReadyTitle /> : null}
      <FrameScreen state={state} controller={forcedClock ? null : controller}>{children}</FrameScreen>
      {restoring ? <RestoringScreen restore={restore} /> : null}
      {narrow ? <NarrowNotice /> : null}
    </>
  );
  if (!hasCaptcha || !isClient) return screen;
  return (
    <>
      {screen}
      <TurnstileHost visible={state.phase === "security-check"} />
    </>
  );
}
