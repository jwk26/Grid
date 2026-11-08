import { useLayoutEffect } from "react";

// While a notice or a blocking dialog covers the app, every other child of `body` gets `inert`
// (portalled dialogs and the Turnstile host included), so nothing under it can be used. A portal added
// meanwhile is made inert by the observer; the cleanup removes only what this hook set and returns
// focus to where it was. Shared by the narrow-window notice and the restoring screen.
//
// Two screens can cover the app at once (the narrow notice, then another tab's restore), so each
// element counts its holders: `inert` is removed only when the last holder lets go, whatever the
// mount order (Task 262 review). An element already `inert` that no hook holds belongs to someone
// else and is left alone.
const holders = new WeakMap<Element, number>();

export function useInertBody(noticeRef: React.RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const notice = noticeRef.current;
    const set = new Set<Element>();
    const previouslyFocused = document.activeElement;
    const apply = () => {
      for (const child of document.body.children) {
        // `data-inert-exempt` keeps the development state switch usable under a forced screen.
        if (child === notice || set.has(child) || child.hasAttribute("data-inert-exempt")) continue;
        const held = holders.get(child) ?? 0;
        if (held === 0 && child.hasAttribute("inert")) continue;
        holders.set(child, held + 1);
        child.setAttribute("inert", "");
        set.add(child);
      }
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true });
    return () => {
      observer.disconnect();
      for (const element of set) {
        const left = (holders.get(element) ?? 1) - 1;
        if (left > 0) {
          holders.set(element, left);
        } else {
          holders.delete(element);
          element.removeAttribute("inert");
        }
      }
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [noticeRef]);
}
