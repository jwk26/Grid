"use client";

import { useEffect } from "react";
import { Toaster } from "sonner";
import { toastIcons } from "@/components/feedback/toast-icons";
import { useToastAnchor } from "@/hooks/use-toast-anchor";
import { MAX_LIVE_TOASTS, setToastPaused } from "@/lib/feedback/toast";
import { cn } from "@/lib/utils";

const TOAST_GAP = 8;

const STACK_SELECTOR = "[data-sonner-toaster]";

const inStack = (node: EventTarget | null) =>
  node instanceof Element && node.closest(STACK_SELECTOR) !== null;

// The toast helper owns the time and pauses it while the pointer is over the stack or focus is
// inside it (feedback F14). Document listeners keep sonner's own markup untouched.
function useStackPauseReports() {
  useEffect(() => {
    // A toast removed under the pointer or the focus often sends no `pointerout` or `focusout`,
    // so an event outside the stack, or a removal from it, checks where both really are.
    const recheck = () => {
      const stack = document.querySelector(STACK_SELECTOR);
      setToastPaused("pointer", stack?.matches(":hover") ?? false);
      setToastPaused("focus", inStack(document.activeElement));
    };
    const pointerOver = (event: PointerEvent) => {
      if (inStack(event.target)) setToastPaused("pointer", true);
      else setToastPaused("pointer", false);
    };
    const pointerOut = (event: PointerEvent) => {
      if (inStack(event.target) && !inStack(event.relatedTarget)) setToastPaused("pointer", false);
    };
    const focusIn = (event: FocusEvent) => {
      setToastPaused("focus", inStack(event.target));
    };
    const focusOut = (event: FocusEvent) => {
      if (inStack(event.target) && !inStack(event.relatedTarget)) setToastPaused("focus", false);
    };
    const observer = new MutationObserver((records) => {
      if (records.some((record) => record.removedNodes.length > 0)) recheck();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("pointerover", pointerOver);
    document.addEventListener("pointerout", pointerOut);
    document.addEventListener("focusin", focusIn);
    document.addEventListener("focusout", focusOut);
    return () => {
      observer.disconnect();
      document.removeEventListener("pointerover", pointerOver);
      document.removeEventListener("pointerout", pointerOut);
      document.removeEventListener("focusin", focusIn);
      document.removeEventListener("focusout", focusOut);
      setToastPaused("pointer", false);
      setToastPaused("focus", false);
    };
  }, []);
}

/**
 * The app's one Toaster (feedback F12, F15): top-left of the work area, kinds
 * coloured by the status tokens in globals.css, never `richColors`. The
 * `toast-stack` look and the drag translucency are in globals.css too.
 */
export function AppToaster() {
  const { offset, dragActive } = useToastAnchor();
  useStackPauseReports();

  return (
    <Toaster
      className={cn("toast-stack", dragActive && "toast-stack-dragging")}
      closeButton
      gap={TOAST_GAP}
      icons={toastIcons}
      mobileOffset={offset}
      offset={offset}
      position="top-left"
      visibleToasts={MAX_LIVE_TOASTS}
    />
  );
}
