"use client";

import { useMemo } from "react";
import { useToastAnchorStore } from "@/stores/toast-anchor-store";

// The 3rem sidebar plus the breadcrumb's own 12px inset.
export const TOAST_ANCHOR_LEFT = 60;
// The breadcrumb row.
export const TOAST_ANCHOR_TOP = 12;
// Between the breadcrumb and the first toast.
export const TOAST_ANCHOR_GAP = 8;

export type ToastOffset = { top: number; left: number };

export function getToastOffset(breadcrumbBottom: number | null): ToastOffset {
  return {
    top:
      breadcrumbBottom === null
        ? TOAST_ANCHOR_TOP
        : breadcrumbBottom + TOAST_ANCHOR_GAP,
    left: TOAST_ANCHOR_LEFT,
  };
}

/**
 * Where the toast stack sits (feedback F12): at the breadcrumb row, below the
 * breadcrumb while one is shown, and whether a Node or Bit is being dragged.
 * Grid pages report both through the toast anchor store.
 */
export function useToastAnchor(): { offset: ToastOffset; dragActive: boolean } {
  const breadcrumbBottom = useToastAnchorStore((state) => state.breadcrumbBottom);
  const dragActive = useToastAnchorStore((state) => state.dragActive);
  const offset = useMemo(() => getToastOffset(breadcrumbBottom), [breadcrumbBottom]);

  return { offset, dragActive };
}
