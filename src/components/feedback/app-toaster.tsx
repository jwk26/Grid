"use client";

import { Toaster } from "sonner";
import { toastIcons } from "@/components/feedback/toast-icons";
import { useToastAnchor } from "@/hooks/use-toast-anchor";
import { cn } from "@/lib/utils";

const MAX_VISIBLE_TOASTS = 3;
const TOAST_GAP = 8;

/**
 * The app's one Toaster (feedback F12, F15): top-left of the work area, kinds
 * coloured by the status tokens in globals.css, never `richColors`. The
 * `toast-stack` look and the drag translucency are in globals.css too.
 */
export function AppToaster() {
  const { offset, dragActive } = useToastAnchor();

  return (
    <Toaster
      className={cn("toast-stack", dragActive && "toast-stack-dragging")}
      closeButton
      gap={TOAST_GAP}
      icons={toastIcons}
      mobileOffset={offset}
      offset={offset}
      position="top-left"
      visibleToasts={MAX_VISIBLE_TOASTS}
    />
  );
}
