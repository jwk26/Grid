"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BREADCRUMB_ENTRY_REVEAL_MS, BREADCRUMB_HIDE_DELAY_MS } from "@/lib/constants";
import { motionDuration } from "@/lib/animations/motion-language";

// The breadcrumb reveal state machine and the Escape order (feedback F22, F23;
// SPEC §Breadcrumb reveal and Home button).

export type RevealPhase = "hidden" | "shown" | "folding";

const FOLD_MS = motionDuration.breadcrumbFold * 1000;
const LANDING_MS = motionDuration.homeLanding * 1000;

// React sends pointer events through the React tree, so a portaled child (the deadline picker,
// its conflict dialog) reaches the bar's handlers; only a target inside the bar's own DOM counts.
type PointerEventLike = { currentTarget: Element; target: EventTarget | null };

export type RevealHandlers = {
  onPointerEnter: (event?: PointerEventLike) => void;
  onPointerLeave: () => void;
  // A pointer that is still over a re-rendered element sends no new `pointerenter`.
  onPointerMove: (event?: PointerEventLike) => void;
  onFocus: () => void;
  onBlur: () => void;
};

type Sources = {
  homeHover: boolean;
  barHover: boolean;
  homeFocus: boolean;
  barFocus: boolean;
  held: boolean;
  entry: boolean;
  suppressed: boolean;
};

// Only keyboard focus reveals (SPEC: "hover or keyboard focus"): a button the mouse clicked keeps
// focus, and the breadcrumb must still hide once the pointer has left.
function isKeyboardFocus(element: Element | null): boolean {
  // No focused element (a focus event without a target): treat it as keyboard focus.
  if (!element || element === document.body) return true;
  try {
    return element.matches(":focus-visible");
  } catch {
    return true;
  }
}

function isInsideBar(event?: PointerEventLike): boolean {
  return !event || event.currentTarget.contains(event.target as Node | null);
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

/**
 * Whether the breadcrumb is shown. Triggers: pointer or focus on Home or on the
 * breadcrumb, 3 seconds after entering a Node (`nodeId` changes), any Node or Bit
 * drag, a held deadline picker. It hides 1 second after pointer and focus have
 * left both (and the hold ended), or at once on `dismiss`. After `dismiss` the
 * pointer and focus triggers stay off until both leave and one comes back.
 */
export function useBreadcrumbReveal({
  enabled,
  nodeId,
  dragging,
}: {
  enabled: boolean;
  nodeId: string | null;
  dragging: boolean;
}) {
  const [phase, setPhase] = useState<RevealPhase>("hidden");
  const [instant, setInstant] = useState(false);
  const [landing, setLanding] = useState(false);
  const phaseRef = useRef<RevealPhase>("hidden");
  const enabledRef = useRef(enabled);
  const draggingRef = useRef(dragging);
  const sources = useRef<Sources>({
    homeHover: false,
    barHover: false,
    homeFocus: false,
    barFocus: false,
    held: false,
    entry: false,
    suppressed: false,
  });
  const timers = useRef<Record<"hide" | "entry" | "fold" | "landing" | "landingEnd", ReturnType<typeof setTimeout> | undefined>>({
    hide: undefined,
    entry: undefined,
    fold: undefined,
    landing: undefined,
    landingEnd: undefined,
  });

  const clearTimer = useCallback((name: keyof typeof timers.current) => {
    clearTimeout(timers.current[name]);
    timers.current[name] = undefined;
  }, []);

  const changePhase = useCallback((next: RevealPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const pointerOrFocusIn = () => {
    const s = sources.current;
    return s.homeHover || s.barHover || s.homeFocus || s.barFocus;
  };

  // A focused element that leaves the page sends no blur (a clicked segment navigates and
  // unmounts, but only once the new Node's chain has loaded): read focus where it is now.
  const syncFocus = () => {
    const s = sources.current;
    const active = document.activeElement;
    const home = document.querySelector('[data-app-role="home-button"]');
    const bar = document.querySelector('[data-app-role="breadcrumb-reveal"]');
    if (home) s.homeFocus = home === active && isKeyboardFocus(active);
    if (bar) s.barFocus = bar.contains(active) && isKeyboardFocus(active);
  };

  // The same for hover: an element that unmounts under the pointer sends no pointerleave, and a
  // move between the Node-change reset and the unmount sets it again. At the moments that end a
  // reveal (its timers) the DOM decides, not the last event. Only the segments and the chip take
  // the pointer, so a hovered `bar` or `home` means the pointer is on one of them.
  const syncHover = () => {
    const s = sources.current;
    const home = document.querySelector('[data-app-role="home-button"]');
    const bar = document.querySelector('[data-app-role="breadcrumb-reveal"]');
    if (home) s.homeHover = home.matches(":hover");
    if (bar) s.barHover = bar.matches(":hover");
  };

  const engaged = (verify = false) => {
    syncFocus();
    if (verify) syncHover();
    const s = sources.current;
    // Keyboard focus on a segment always reveals: a focused element is never hidden.
    return (pointerOrFocusIn() && !s.suppressed) || s.barFocus || draggingRef.current || s.held;
  };

  const show = useCallback(
    (fromDrag: boolean) => {
      clearTimer("fold");
      clearTimer("landing");
      clearTimer("landingEnd");
      setLanding(false);
      if (phaseRef.current === "shown") return;
      // A reveal started by a drag fades in without the clip or slide, so the
      // segments' drop rects, measured at drag start, are where they are drawn. The
      // mode lasts for this reveal, until its fold starts.
      setInstant(fromDrag);
      changePhase("shown");
    },
    [changePhase, clearTimer],
  );

  const fold = useCallback(() => {
    clearTimer("hide");
    if (phaseRef.current !== "shown") return;
    const land = () => {
      timers.current.fold = undefined;
      changePhase("hidden");
      // Home is emphasized as the fold lands.
      setLanding(true);
      clearTimer("landingEnd");
      timers.current.landingEnd = setTimeout(() => setLanding(false), LANDING_MS);
    };
    clearTimer("fold");
    setInstant(false);
    // Reduced motion: it disappears in place, with no fold to wait for.
    if (prefersReducedMotion()) {
      land();
      return;
    }
    changePhase("folding");
    timers.current.fold = setTimeout(land, FOLD_MS);
  }, [changePhase, clearTimer]);

  const evaluate = useCallback(() => {
    if (!enabledRef.current) return;
    if (!pointerOrFocusIn()) sources.current.suppressed = false;
    if (engaged()) {
      clearTimer("hide");
      show(draggingRef.current && phaseRef.current !== "shown");
      // A drag that starts on a reveal already shown keeps it from replaying its unfold when it ends.
      if (draggingRef.current) setInstant(true);
      return;
    }
    if (phaseRef.current !== "shown" || timers.current.hide) return;
    timers.current.hide = setTimeout(() => {
      timers.current.hide = undefined;
      // The entry reveal ends on its own timer, never earlier.
      if (sources.current.entry || engaged(true)) return;
      fold();
    }, BREADCRUMB_HIDE_DELAY_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearTimer, fold, show]);

  // Entering a Node reveals for 3 seconds; `?bit=` and other renders do not restart it.
  useEffect(() => {
    enabledRef.current = enabled;
    const s = sources.current;
    const t = timers.current;
    s.suppressed = false;
    s.entry = false;
    // An element that leaves the page while hovered or focused sends no pointerleave
    // or blur (a clicked segment navigates and unmounts): start from what is true now.
    // Hover starts off and the next pointer move over Home or the bar sets it again.
    s.homeHover = false;
    s.barHover = false;
    s.homeFocus = false;
    s.barFocus = false;
    clearTimer("entry");
    if (!enabled) {
      clearTimer("hide");
      clearTimer("fold");
      setInstant(false);
      changePhase("hidden");
      return;
    }
    s.entry = true;
    show(false);
    t.entry = setTimeout(() => {
      t.entry = undefined;
      s.entry = false;
      if (!engaged(true) && !t.hide) fold();
    }, BREADCRUMB_ENTRY_REVEAL_MS);
    return () => {
      clearTimer("entry");
      clearTimer("hide");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, nodeId]);

  useEffect(() => {
    draggingRef.current = dragging;
    evaluate();
  }, [dragging, evaluate]);

  useEffect(
    () => () => {
      for (const name of Object.keys(timers.current) as Array<keyof typeof timers.current>) {
        clearTimeout(timers.current[name]);
      }
    },
    [],
  );

  const setSource = useCallback(
    (key: "homeHover" | "barHover" | "homeFocus" | "barFocus", value: boolean) => {
      sources.current[key] = value;
      evaluate();
    },
    [evaluate],
  );

  const homeHandlers = useMemo<RevealHandlers>(
    () => ({
      onPointerEnter: () => setSource("homeHover", true),
      onPointerLeave: () => setSource("homeHover", false),
      onPointerMove: () => {
        if (!sources.current.homeHover) setSource("homeHover", true);
      },
      onFocus: () => setSource("homeFocus", isKeyboardFocus(document.activeElement)),
      onBlur: () => setSource("homeFocus", false),
    }),
    [setSource],
  );

  const barHandlers = useMemo<RevealHandlers>(
    () => ({
      onPointerEnter: (event) => {
        if (isInsideBar(event)) setSource("barHover", true);
      },
      onPointerLeave: () => setSource("barHover", false),
      onPointerMove: (event) => {
        if (isInsideBar(event) && !sources.current.barHover) setSource("barHover", true);
      },
      onFocus: () => setSource("barFocus", isKeyboardFocus(document.activeElement)),
      onBlur: () => setSource("barFocus", false),
    }),
    [setSource],
  );

  // The deadline picker (or its conflict dialog) keeps the breadcrumb shown while open.
  const setHeld = useCallback(
    (held: boolean) => {
      sources.current.held = held;
      // A picker closed with the pointer inside it unmounts under the pointer: no leave is
      // sent, so the hover is read from the DOM as the hold ends.
      if (!held) syncHover();
      evaluate();
    },
    [evaluate],
  );

  // `Esc` hides it at once; hover and focus stay off until pointer and focus leave and return.
  const dismiss = useCallback(() => {
    // Suppress only what is inside now: hovering or focusing Home later still reveals.
    sources.current.suppressed = pointerOrFocusIn();
    fold();
  }, [fold]);

  return { phase, instant, landing, homeHandlers, barHandlers, setHeld, dismiss };
}

export type EscapeAction = "none" | "hide-breadcrumb" | "exit-edit-mode";

/**
 * One `Esc` press closes one layer, top-most first (SPEC §Breadcrumb reveal and Home
 * button): during a drag nothing (the drag cancels itself); an open dialog layer or
 * deadline picker nothing (it closes itself); then the breadcrumb; then edit mode.
 */
export function resolveEscape(state: {
  dragging: boolean;
  layerOpen: boolean;
  held: boolean;
  breadcrumbShown: boolean;
  editMode: boolean;
}): EscapeAction {
  if (state.dragging || state.layerOpen || state.held) return "none";
  if (state.breadcrumbShown) return "hide-breadcrumb";
  if (state.editMode) return "exit-edit-mode";
  return "none";
}

/**
 * The one `document` `Esc` owner. It listens in the capture phase, so a drag the
 * pointer sensor is about to cancel still counts as a drag.
 */
export function useEscapeOrder({
  dragging,
  isLayerOpen,
  held,
  breadcrumbShown,
  editMode,
  hideBreadcrumb,
  exitEditMode,
  focusHome,
}: {
  dragging: boolean;
  isLayerOpen: () => boolean;
  held: boolean;
  breadcrumbShown: boolean;
  editMode: boolean;
  hideBreadcrumb: () => void;
  exitEditMode: () => void;
  focusHome: () => void;
}) {
  const latest = useRef({ dragging, isLayerOpen, held, breadcrumbShown, editMode, hideBreadcrumb, exitEditMode, focusHome });
  useEffect(() => {
    latest.current = { dragging, isLayerOpen, held, breadcrumbShown, editMode, hideBreadcrumb, exitEditMode, focusHome };
  });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      const s = latest.current;
      const action = resolveEscape({
        dragging: s.dragging,
        layerOpen: event.defaultPrevented || s.isLayerOpen(),
        held: s.held,
        breadcrumbShown: s.breadcrumbShown,
        editMode: s.editMode,
      });
      if (action === "hide-breadcrumb") {
        // A focused element is never hidden: focus moves to Home first.
        s.focusHome();
        s.hideBreadcrumb();
      } else if (action === "exit-edit-mode") {
        s.exitEditMode();
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, []);
}
