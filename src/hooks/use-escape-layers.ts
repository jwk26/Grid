"use client";

import { useLayoutEffect } from "react";

// The Inbox layers that handle `Esc` themselves (SPEC §Breadcrumb reveal and Home button;
// stabilization ST20, ST35). The one `Esc` owner (`useEscapeOrder`) reads this registry instead of
// waiting for a layer's own handler to call `preventDefault`: the owner decides before any
// `document` listener has closed a layer, so an open layer always counts, locked or not.

export type EscapeLayerKind = "layer" | "triage-drag";

const open = new Map<symbol, EscapeLayerKind>();

/** Whether any registered Inbox layer (the Triage drag included) is open. */
export function isEscapeLayerOpen(): boolean {
  return open.size > 0;
}

/** How many registered layers are open (the explorer search included). */
export function escapeLayerCount(): number {
  return open.size;
}

/** Whether a Triage drag is active. While it is, only the drag cancels: no other layer closes. */
export function isTriageDragActive(): boolean {
  for (const kind of open.values()) if (kind === "triage-drag") return true;
  return false;
}

/**
 * Register one layer while `isOpen` is true. A layout effect, since a drag starts on a continuous
 * pointer event and the registration must exist before the next key press.
 */
export function useEscapeLayer(isOpen: boolean, kind: EscapeLayerKind = "layer"): void {
  useLayoutEffect(() => {
    if (!isOpen) return;
    const token = Symbol("escape-layer");
    open.set(token, kind);
    return () => {
      open.delete(token);
    };
  }, [isOpen, kind]);
}
