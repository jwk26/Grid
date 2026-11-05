"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { ScreenBlock } from "@/components/layout/screen-block";
import { Button } from "@/components/ui/button";
import { GRID_UNAVAILABLE } from "@/lib/copy/feedback";

// A layer that is still in the DOM, even one Radix has marked closed and is animating out: it
// returns focus to its trigger when it unmounts, which would take the focus this screen just
// moved. So the screen waits for the layer to be gone, not only for it to be closed.
const LAYER_SELECTOR = '[role="dialog"], [role="alertdialog"], [role="menu"]';

// The Grid of a route the account cannot use (SPEC §/grid/[nodeId], ST13–ST19, ST36). It sits in the
// Grid content area beside the sidebar, so its container is not a second `<main>`; the title is the
// page's `h1`. Focus moves to `Go to Home` once no dialog layer is open: at once when none is, else
// when the layer that was open has left (a Scratch capture modal keeps its focus until it closes).
export function GridUnavailable({
  isLayerOpen,
  recheckKey,
}: {
  /** True while a dialog layer the shell tracks (Scratch modal, Search, `?bit=`) is open. */
  isLayerOpen: () => boolean;
  /** Changes when something that `isLayerOpen` reads changes, so the rule is asked again. */
  recheckKey: unknown;
}) {
  const router = useRouter();
  const actionsRef = useRef<HTMLDivElement>(null);
  const focusedRef = useRef(false);
  const isLayerOpenRef = useRef(isLayerOpen);
  useEffect(() => {
    isLayerOpenRef.current = isLayerOpen;
  });

  useEffect(() => {
    if (focusedRef.current) return;
    const tryFocus = () => {
      if (focusedRef.current) return true;
      if (isLayerOpenRef.current() || document.querySelector(LAYER_SELECTOR) !== null) return false;
      actionsRef.current?.querySelector<HTMLElement>("button")?.focus();
      focusedRef.current = true;
      return true;
    };
    if (tryFocus()) return;
    // A Radix layer leaves the DOM on its own clock (exit animation), so watch for it.
    const observer = new MutationObserver(() => {
      if (tryFocus()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-state"] });
    return () => observer.disconnect();
  }, [recheckKey]);

  return (
    <div
      className="triage-shell triage-shell--frame h-full w-full bg-background"
      data-app-role="grid-unavailable"
      data-testid="grid-unavailable"
      data-triage-role="shell-background"
    >
      <ScreenBlock
        title={GRID_UNAVAILABLE.title}
        reason={GRID_UNAVAILABLE.reason}
        actionsRef={actionsRef}
        actions={<Button onClick={() => router.push("/")}>{GRID_UNAVAILABLE.goHome}</Button>}
      />
    </div>
  );
}
