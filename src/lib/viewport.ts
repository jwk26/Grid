import { MIN_WINDOW_WIDTH } from "@/lib/constants";

// The narrow-window rule (SPEC §Account entry step 1): below `MIN_WINDOW_WIDTH` the notice covers
// the app and no guest is created. It reads the media query when asked, so a caller that decides
// something (guest creation) never relies on a render's earlier answer. A browser without
// `matchMedia` counts as wide.

const WIDE_QUERY = `(min-width: ${MIN_WINDOW_WIDTH}px)`;

function wideList(): MediaQueryList | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return null;
  return window.matchMedia(WIDE_QUERY);
}

export function isNarrowWindow(): boolean {
  const list = wideList();
  return list !== null && !list.matches;
}

export function subscribeNarrowWindow(listener: () => void): () => void {
  const list = wideList();
  if (!list) return () => undefined;
  list.addEventListener("change", listener);
  return () => list.removeEventListener("change", listener);
}

export type Viewport = {
  isNarrow: () => boolean;
  subscribe: (listener: () => void) => () => void;
};

export const browserViewport: Viewport = { isNarrow: isNarrowWindow, subscribe: subscribeNarrowWindow };
