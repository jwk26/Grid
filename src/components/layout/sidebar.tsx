"use client";

import { useDroppable } from "@dnd-kit/core";
import type { LucideIcon } from "lucide-react";
import { Calendar, Inbox, Layers, Pencil, Plus, Search, Trash2, X, Zap } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type ReactNode } from "react";
import { AccountButton } from "@/components/layout/account-button";
import type { RevealHandlers } from "@/hooks/use-breadcrumb-reveal";
import { HomeButton } from "@/components/layout/home-button";
import { SidebarIconButton } from "@/components/layout/sidebar-icon-button";
import { ColorThemeToggle } from "@/components/layout/color-theme-toggle";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useGridActions } from "@/hooks/use-grid-actions";
import { useGlobalUrgency } from "@/hooks/use-global-urgency";
import type { DragActiveItem } from "@/hooks/use-dnd";
import { useInbox } from "@/hooks/use-inbox";
import { useNodeActions } from "@/hooks/use-node-actions";
import {
  captureTriageRouteFocus,
  requestActiveTriageDeparture,
  useTriageRouteFocusHandoff,
} from "@/hooks/use-triage-departure";
import {
  sidebarDragTargetActive,
  sidebarDragTargetRest,
  sidebarDragTargetTransition,
} from "@/lib/animations/layout";
import {
  INBOX_BADGE_HIGH_THRESHOLD,
  INBOX_BADGE_WARM_THRESHOLD,
} from "@/lib/constants";
import { getGridDeleteDropId } from "@/lib/grid-dnd";
import { cn } from "@/lib/utils";
import { useSessionVariant } from "@/lib/auth/use-session-variant";
import { findNearestEmptyCell } from "@/lib/utils/bfs";
import { useEditModeStore } from "@/stores/edit-mode-store";
import { useSearchStore } from "@/stores/search-store";
import type { Node } from "@/types";
import { toastCopy } from "@/lib/copy/feedback";
import { dropReportedFailure } from "@/lib/db/write-failure";
import { showToast } from "@/lib/feedback/toast";

function DeleteDropTarget() {
  const { isOver, setNodeRef } = useDroppable({
    id: getGridDeleteDropId(),
    data: { kind: "grid-delete-drop" },
  });

  return (
    <div
      ref={setNodeRef}
      aria-label="Drop here to delete"
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-lg text-destructive motion-safe:animate-jiggle",
        isOver && "bg-destructive/10",
      )}
    >
      <X className="h-5 w-5" />
    </div>
  );
}

function TriageRouteFocusOwner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  useTriageRouteFocusHandoff(search ? `${pathname}?${search}` : pathname);
  return null;
}

const noop = () => {};

function getSystemNodeLabel(node: Node): string {
  if (node.systemRole === "inbox") {
    return "Inbox";
  }

  if (node.systemRole === "archive_view") {
    return "Archive View";
  }

  return node.title;
}

function getSystemNodeIcon(node: Node): LucideIcon {
  if (node.systemRole === "inbox") {
    return Inbox;
  }

  return Layers;
}

function getInboxBadgeTone(count: number): string {
  if (count >= INBOX_BADGE_HIGH_THRESHOLD) {
    return "bg-destructive text-destructive-foreground";
  }

  if (count >= INBOX_BADGE_WARM_THRESHOLD) {
    return "bg-priority-mid-bg text-priority-mid";
  }

  return "bg-muted text-muted-foreground";
}

function InboxBadge({ count }: { count: number }) {
  const shouldReduceMotion = useReducedMotion();

  if (count <= 0) {
    return null;
  }

  return (
    <motion.span
      animate={shouldReduceMotion ? false : undefined}
      className={cn(
        "absolute -top-1 -right-1 z-10 flex h-4 min-w-4 translate-x-[25%] -translate-y-[25%] items-center justify-center rounded-full px-1 font-mono text-[10px] font-bold leading-none tracking-tighter ring-2 ring-background",
        shouldReduceMotion ? "transition-none" : "transition-colors duration-150",
        getInboxBadgeTone(count),
      )}
      data-testid="inbox-badge"
      layout={shouldReduceMotion ? false : true}
      layoutId={shouldReduceMotion ? undefined : "inbox-badge"}
      transition={shouldReduceMotion ? undefined : { type: "spring", stiffness: 500, damping: 30 }}
    >
      {count >= 100 ? "99+" : count}
    </motion.span>
  );
}

function SystemNodeItem({
  node,
  pathname,
  scratchCount,
  onNavigate,
}: {
  node: Node;
  pathname: string;
  scratchCount: number;
  onNavigate: (href: string) => void;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const { getGridOccupancy } = useGridActions();
  const { updateNode } = useNodeActions();
  const label = getSystemNodeLabel(node);
  const Icon = getSystemNodeIcon(node);
  const isActive = pathname === `/grid/${node.id}`;

  async function handleGridVisibilityToggle() {
    if (!node.hiddenFromGrid) {
      await updateNode(node.id, { hiddenFromGrid: true }).catch(dropReportedFailure);
      return;
    }

    const occupied = await getGridOccupancy(null);
    const cell = findNearestEmptyCell(occupied, 0, 0);

    if (cell === null) {
      showToast(toastCopy.homeFull, label);
      return;
    }

    await updateNode(node.id, {
      hiddenFromGrid: false,
      x: cell.x,
      y: cell.y,
    }).catch(dropReportedFailure);
  }

  return (
    <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <div className="group/system-node relative flex h-10 w-12 items-center justify-center">
        <span
          aria-hidden="true"
          className={cn(
            "absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-md",
            shouldReduceMotion ? "transition-none" : "transition-transform duration-150",
            isActive
              ? "scale-y-100 bg-foreground"
              : "scale-y-0 bg-muted-foreground/40 group-hover/system-node:scale-y-50",
          )}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <SidebarIconButton
                className={cn(
                  "group relative text-muted-foreground/80 hover:text-foreground",
                  isActive && "bg-muted/50 text-foreground",
                  node.hiddenFromGrid && "opacity-40",
                )}
                icon={Icon}
                isActive={isActive}
                label={label}
                onClick={() => onNavigate(`/grid/${node.id}`)}
                onContextMenu={(event) => {
                  event.preventDefault();
                  setIsMenuOpen(true);
                }}
                onPointerDown={(event) => {
                  if (event.button !== 2) {
                    event.preventDefault();
                  }
                }}
                title="Right-click for options"
              >
                {node.systemRole === "inbox" ? <InboxBadge count={scratchCount} /> : null}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-0.5 -bottom-0.5 h-1 w-1 rounded-full bg-muted-foreground/40 opacity-0 transition-opacity duration-150 group-hover/system-node:opacity-100"
                />
                {node.hiddenFromGrid ? (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -inset-1 rounded border border-dashed border-border"
                  />
                ) : null}
              </SidebarIconButton>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            Right-click for options
          </TooltipContent>
        </Tooltip>
      </div>
      <DropdownMenuContent align="start" side="right" sideOffset={8}>
        <DropdownMenuItem onClick={() => void handleGridVisibilityToggle()}>
          {node.hiddenFromGrid ? "Show on L0 Grid" : "Remove from L0 Grid"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Sidebar({
  onAddClick,
  dragActiveItem,
  isAddActive,
  onNodeCreate,
  onBitCreate,
  homeRevealHandlers,
  homeLanding,
  breadcrumbSlot,
}: {
  onAddClick?: () => void;
  dragActiveItem?: DragActiveItem;
  isAddActive?: boolean;
  onNodeCreate?: () => void;
  onBitCreate?: () => void;
  // Hover and focus on Home reveal the breadcrumb (Grid pages only).
  homeRevealHandlers?: RevealHandlers;
  homeLanding?: boolean;
  // The revealed breadcrumb, rendered right after Home so its segments follow it in Tab order.
  breadcrumbSlot?: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChooserOpen, setIsChooserOpen] = useState(false);
  const sessionVariant = useSessionVariant();
  const globalUrgency = useGlobalUrgency();
  const { systemNodes, scratchCount } = useInbox();
  const isEditMode = useEditModeStore((state) => state.isEditMode);
  const toggleEditMode = useEditModeStore((state) => state.toggle);
  const isCalendarRoute = pathname.startsWith("/calendar/");
  const isTrashRoute = pathname === "/trash";
  const isGridItemDrag = dragActiveItem?.type === "node" || dragActiveItem?.type === "bit";

  function navigate(href: string) {
    if (href === pathname) {
      router.push(href);
      return;
    }
    requestActiveTriageDeparture({
      focus: captureTriageRouteFocus(href),
      id: href,
      kind: "route",
      perform: () => router.push(href),
    });
  }

  return (
    <TooltipProvider>
      <Suspense fallback={null}>
        <TriageRouteFocusOwner />
      </Suspense>
      <aside className="fixed left-0 top-0 z-[45] flex h-full w-12 flex-col items-center gap-1 border-r border-border bg-background py-3">
      <HomeButton
        isCurrent={pathname === "/"}
        landing={homeLanding}
        onNavigate={navigate}
        revealHandlers={homeRevealHandlers}
      />
      {breadcrumbSlot ? (
        <div
          className="pointer-events-none absolute left-[3.75rem] top-3 w-max max-w-[calc(100vw-4.5rem)]"
          data-app-role="breadcrumb-slot"
        >
          {breadcrumbSlot}
        </div>
      ) : null}
      <AccountButton variant={sessionVariant} />
      {isCalendarRoute ? (
        <Popover open={isChooserOpen} onOpenChange={setIsChooserOpen}>
          <PopoverTrigger asChild>
            <SidebarIconButton icon={Plus} label="Add item" onClick={noop} />
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="flex w-32 flex-col gap-0.5 rounded-lg border border-border bg-popover p-1 shadow-md"
            onCloseAutoFocus={(e) => e.preventDefault()}
            onEscapeKeyDown={() => { (document.activeElement as HTMLElement)?.blur(); }}
            side="right"
            sideOffset={12}
          >
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              onClick={() => {
                setIsChooserOpen(false);
                onNodeCreate?.();
              }}
            >
              <Layers className="h-4 w-4" />
              Node
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              onClick={() => {
                setIsChooserOpen(false);
                onBitCreate?.();
              }}
            >
              <Zap className="h-4 w-4" />
              Bit
            </button>
          </PopoverContent>
        </Popover>
      ) : (
        <div className={cn(!onAddClick && "pointer-events-none opacity-40")}>
          <SidebarIconButton
            icon={Plus}
            isActive={isAddActive}
            label="Add item"
            onClick={onAddClick ?? noop}
          />
        </div>
      )}
      {isCalendarRoute ? (
        <div className="cursor-not-allowed" title="Editing restricted in Calendar view">
          <SidebarIconButton
            className="opacity-40 pointer-events-none"
            disabled={true}
            icon={Pencil}
            isActive={false}
            label="Toggle edit mode"
            onClick={toggleEditMode}
            title={null}
          />
        </div>
      ) : (
        <SidebarIconButton
          className={cn(isGridItemDrag && "border-primary/60")}
          icon={Pencil}
          label="Toggle edit mode"
          motionProps={{
            initial: false,
            animate: isGridItemDrag ? sidebarDragTargetActive : sidebarDragTargetRest,
            transition: sidebarDragTargetTransition,
          }}
          onClick={toggleEditMode}
          isActive={isEditMode}
        />
      )}
      {dragActiveItem?.type === "node" || dragActiveItem?.type === "bit" ? (
        <DeleteDropTarget />
      ) : (
        <>
          <div className={cn(dragActiveItem && "opacity-40 saturate-50 transition-all duration-150")}>
            <SidebarIconButton
              icon={Search}
              label="Search"
              onClick={() => useSearchStore.getState().open()}
            />
          </div>
          <div className={cn("relative", dragActiveItem && "opacity-40 saturate-50 transition-all duration-150")}>
            <SidebarIconButton
              icon={Calendar}
              label="Calendar"
              onClick={() => navigate("/calendar/weekly")}
              isActive={isCalendarRoute}
            />
            {globalUrgency ? (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-background",
                  globalUrgency === 1 && "bg-urgency-1",
                  globalUrgency === 2 && "bg-urgency-2",
                  globalUrgency === 3 && "bg-urgency-3",
                )}
              />
            ) : null}
          </div>
        </>
      )}
      {systemNodes.length > 0 ? (
        <div className={cn("flex flex-col items-center gap-1", dragActiveItem && "opacity-40 saturate-50 transition-all duration-150")}>
          <div className="mx-3 my-2 h-px w-6 border-t border-border" />
          {systemNodes.map((node) => (
            <SystemNodeItem
              key={node.id}
              node={node}
              pathname={pathname}
              scratchCount={scratchCount}
              onNavigate={navigate}
            />
          ))}
        </div>
      ) : null}
      <div className="mt-auto flex flex-col items-center gap-1">
        <div className={cn(dragActiveItem && "opacity-40 saturate-50 transition-all duration-150")}>
          <SidebarIconButton
            icon={Trash2}
            label="Trash"
            onClick={() => navigate("/trash")}
            isActive={isTrashRoute}
          />
        </div>
        <div className={cn(dragActiveItem && "opacity-40 saturate-50 transition-all duration-150")}>
          <ColorThemeToggle />
        </div>
        <div className={cn(dragActiveItem && "opacity-40 saturate-50 transition-all duration-150")}>
          <ThemeToggle className="hover:bg-accent hover:text-foreground" />
        </div>
      </div>
      </aside>
    </TooltipProvider>
  );
}
