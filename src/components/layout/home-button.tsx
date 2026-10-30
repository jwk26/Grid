"use client";

import { Home } from "lucide-react";
import { HOME_BUTTON_LABEL } from "@/lib/copy/feedback";
import { SidebarIconButton } from "./sidebar-icon-button";

/**
 * The sidebar Home button (feedback F21): top-most on every route. It navigates
 * through the sidebar's departure-guarded `onNavigate`, so an Add draft or a
 * pending Inbox operation keeps its guard. On L0 it shows as the current page.
 */
export function HomeButton({
  isCurrent,
  onNavigate,
}: {
  isCurrent: boolean;
  onNavigate: (href: string) => void;
}) {
  return (
    <SidebarIconButton
      aria-current={isCurrent ? "page" : undefined}
      className="active:scale-95"
      data-app-role="home-button"
      icon={Home}
      isActive={isCurrent}
      label={HOME_BUTTON_LABEL}
      onClick={() => onNavigate("/")}
    />
  );
}
