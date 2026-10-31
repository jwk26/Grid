"use client";

import { useEditModeStore } from "@/stores/edit-mode-store";

export function EditModeOverlay() {
  const isEditMode = useEditModeStore((state) => state.isEditMode);

  // `Esc` is owned by `useEscapeOrder` (grid-runtime): edit mode exits only after the
  // dialog layer, the deadline picker and the breadcrumb.
  if (!isEditMode) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-0 z-30 ring-2 ring-inset ring-primary/40"
    >
      <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary backdrop-blur-sm">
        Edit Mode — Press ESC to exit
      </div>
    </div>
  );
}
