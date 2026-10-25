"use client";

import { create } from "zustand";

type ToastAnchorState = {
  // Viewport y of the bottom of the shown breadcrumb cluster, or null when
  // no breadcrumb is shown.
  breadcrumbBottom: number | null;
  dragActive: boolean;
  setBreadcrumbBottom: (bottom: number | null) => void;
  setDragActive: (active: boolean) => void;
  reset: () => void;
};

export const useToastAnchorStore = create<ToastAnchorState>((set) => ({
  breadcrumbBottom: null,
  dragActive: false,
  setBreadcrumbBottom: (bottom) => set({ breadcrumbBottom: bottom }),
  setDragActive: (active) => set({ dragActive: active }),
  reset: () => set({ breadcrumbBottom: null, dragActive: false }),
}));
