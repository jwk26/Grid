"use client";

import { Home } from "lucide-react";
import type { RevealHandlers } from "@/hooks/use-breadcrumb-reveal";
import { HOME_BUTTON_LABEL } from "@/lib/copy/feedback";
import { SidebarIconButton } from "./sidebar-icon-button";

/**
 * The sidebar Home button (feedback F21): top-most on every route. It navigates
 * through the sidebar's departure-guarded `onNavigate`, so an Add draft or a
 * pending Inbox operation keeps its guard. On L0 it shows as the current page.
 * Hover or focus on it reveals the breadcrumb (`revealHandlers`), and it is briefly
 * emphasized when the breadcrumb folds into it (`landing`, F23).
 */
export function HomeButton({
  isCurrent,
  onNavigate,
  revealHandlers,
  landing = false,
}: {
  isCurrent: boolean;
  onNavigate: (href: string) => void;
  revealHandlers?: RevealHandlers;
  landing?: boolean;
}) {
  return (
    <SidebarIconButton
      aria-current={isCurrent ? "page" : undefined}
      className="home-button active:scale-95"
      data-app-role="home-button"
      data-landing={landing ? "true" : undefined}
      icon={Home}
      isActive={isCurrent}
      label={HOME_BUTTON_LABEL}
      onBlur={revealHandlers?.onBlur}
      onClick={() => onNavigate("/")}
      onFocus={revealHandlers?.onFocus}
      onPointerEnter={revealHandlers?.onPointerEnter}
      onPointerLeave={revealHandlers?.onPointerLeave}
      onPointerMove={revealHandlers?.onPointerMove}
    />
  );
}
