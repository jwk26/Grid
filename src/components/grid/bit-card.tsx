"use client";

import type { ComponentPropsWithoutRef, Ref } from "react";
import { forwardRef } from "react";
import { format } from "date-fns";
import { Check, MoreHorizontal, Undo2, X } from "lucide-react";
import { NODE_ICON_MAP } from "@/lib/constants/node-icons";
import { cn } from "@/lib/utils";
import { getAgingFilter, getAgingState } from "@/lib/utils/aging";
import { getUrgencyLevel, isPastDeadline } from "@/lib/utils/urgency";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useArchiveActions } from "@/hooks/use-archive";
import { useEditModeStore } from "@/stores/edit-mode-store";
import { INBOX_TRIAGE_COPY } from "@/lib/copy/inbox-triage";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Bit } from "@/types";

type BitCardProps = {
  presentation?: "default" | "inbox-explorer";
  bit: Bit;
  parentColor: string;
  chunkStats: { completed: number; total: number };
  onClick: () => void;
  onDelete?: () => void;
  isDragging?: boolean;
  isNewlyPlaced?: boolean;
  undoActionRef?: Ref<HTMLButtonElement>;
  undo?: Readonly<{
    disabled: boolean;
    describedBy?: string;
    label?: string;
    onActivate: () => void;
    reason: string;
    tooltip?: string;
  }>;
} & Omit<ComponentPropsWithoutRef<"div">, "children" | "onClick">;

export const BitCard = forwardRef<HTMLDivElement, BitCardProps>(function BitCard(
  {
    presentation = "default",
    bit,
    parentColor,
    chunkStats,
    onClick,
    onDelete,
    isDragging = false,
    isNewlyPlaced = false,
    undoActionRef,
    undo,
    className,
    onKeyDown,
    role,
    style,
    tabIndex,
    ...divProps
  },
  ref,
) {
  const agingFilter = getAgingFilter(getAgingState(bit.mtime));
  const urgencyLevel = getUrgencyLevel(bit.deadline);
  const pastDeadline = isPastDeadline(bit.deadline);
  const isComplete = bit.status === "complete";
  const isExplorer = presentation === "inbox-explorer";
  const isStaticExplorerState = isExplorer && (pastDeadline || isComplete);
  // Explorer rows are static; the deadline text carries urgency (SPEC "Explorer urgency").
  const blinks = !isExplorer;
  const isEditMode = useEditModeStore((state) => state.isEditMode);
  const Icon = NODE_ICON_MAP[bit.icon] ?? NODE_ICON_MAP.Box;
  const { archive } = useArchiveActions();
  const formattedDeadline = bit.deadline ? format(new Date(bit.deadline), "MMM d") : null;

  const undoButton = undo !== undefined ? (
<button
          data-triage-role="explorer-card-undo"
          type="button"
          aria-describedby={undo.describedBy}
          aria-disabled={undo.disabled}
          aria-label={
            undo.label === undefined ||
            undo.label === INBOX_TRIAGE_COPY.newlyPlacedUndo.actions.undo
              ? `Undo placement of ${bit.title}`
              : undo.label
          }
          className="newly-undo-action absolute bottom-0 right-0 z-20 rounded px-1 text-[10px] font-semibold"
          data-undo-reason={undo.reason}
          ref={undoActionRef}
          onKeyDown={isExplorer ? (event) => event.stopPropagation() : undefined}
          onClick={(event) => {
            event.stopPropagation();
            if (undo.disabled) return;
            undo.onActivate();
          }}
        >
          {isExplorer && (undo.label === undefined || undo.label === INBOX_TRIAGE_COPY.newlyPlacedUndo.actions.undo)
            ? <Undo2 aria-hidden="true" className="size-3" />
            : undo.label ?? INBOX_TRIAGE_COPY.newlyPlacedUndo.actions.undo}
        </button>
  ) : null;

  return (
    <div
      {...divProps}
      data-card-presentation={presentation}
      data-triage-role="explorer-card-bit"
      data-card-has-undo={undo !== undefined ? "true" : undefined}
      data-card-muted={isComplete || (!isExplorer && pastDeadline) ? "true" : undefined}
      data-card-state={isComplete ? "completed" : pastDeadline ? "overdue" : "active"}
      data-newly-placed={isNewlyPlaced ? "true" : undefined}
      className={cn(
        "group/bit relative z-10 inline-flex shrink-0 select-none items-stretch rounded-[10px] border border-border bg-card shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        isExplorer ? "cursor-default" : "cursor-grab active:cursor-grabbing",
        !isExplorer && isDragging && "z-20 cursor-grabbing",
        blinks && urgencyLevel === 1 && "animate-urgency-blink-1",
        blinks && urgencyLevel === 2 && "animate-urgency-blink-2",
        blinks && urgencyLevel === 3 && "animate-urgency-blink-3",
        !isStaticExplorerState && isEditMode && "motion-safe:animate-jiggle",
        !isExplorer && isComplete && "opacity-50",
        className,
      )}
      ref={ref}
      onClick={onClick}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented) {
          return;
        }
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      role={role ?? "button"}
      style={{ ...style, filter: agingFilter }}
      tabIndex={tabIndex ?? 0}
    >
      {/* Color accent — spans full card height */}
      <div
        data-triage-role="explorer-card-accent"
        className="w-[3px] flex-shrink-0 rounded-l-[2px]"
        style={{ backgroundColor: parentColor }}
      />

      {/* Card content */}
      <div data-triage-role="explorer-card-content" className="flex flex-1 flex-col gap-2 py-[10px] pl-3 pr-[14px]">

        {/* Row 1: icon + title/meta + priority badge */}
        <div data-triage-role="explorer-card-primary" className="flex items-start gap-3">
          <Icon data-triage-role="explorer-card-icon" className="h-[18px] w-[18px] flex-shrink-0 text-muted-foreground" />
          {isStaticExplorerState ? (
            <span
              role="img"
              aria-label={isComplete ? INBOX_TRIAGE_COPY.explorerBitStatus.completed : INBOX_TRIAGE_COPY.explorerBitStatus.overdue}
              className="explorer-card-state"
              data-triage-role="explorer-card-state"
              data-card-state={isComplete ? "completed" : "overdue"}
            >
              {isComplete ? <Check aria-hidden="true" /> : <span aria-hidden="true">!</span>}
            </span>
          ) : null}
          <div data-triage-role="explorer-card-title-slot" className="min-w-0 flex-1">
            <p
              data-triage-role="explorer-card-title"
              className={cn(
                "truncate text-[13px] font-medium text-foreground",
                (isComplete || (!isExplorer && pastDeadline)) && "line-through text-muted-foreground",
              )}
            >
              {bit.title}
            </p>
            {formattedDeadline ? (
              <p
                data-triage-role="explorer-card-deadline"
                className={cn(
                  "mt-0.5 text-[11px] text-muted-foreground",
                  pastDeadline && "text-destructive",
                )}
              >
                {formattedDeadline}
              </p>
            ) : null}
          </div>
          {bit.priority ? (
            <span
              data-triage-role="explorer-card-priority"
              className={cn(
                "inline-flex flex-shrink-0 items-center rounded-full px-[7px] py-[2px] text-[10px] font-semibold uppercase tracking-[0.05em]",
                bit.priority === "high" && "bg-priority-high-bg text-priority-high",
                bit.priority === "mid" && "bg-priority-mid-bg text-priority-mid",
                bit.priority === "low" && "bg-priority-low-bg text-priority-low",
              )}
            >
              {bit.priority}
            </span>
          ) : null}
        </div>

        {/* Row 2: progress bar + chunk count (conditional) */}
        {chunkStats.total > 0 ? (
          <div data-triage-role="explorer-card-progress" className="flex items-center gap-2">
            <div
              className="h-[5px] overflow-hidden rounded-full bg-secondary"
              style={{ flex: "0 0 80%" }}
            >
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{
                  width: `${Math.round((chunkStats.completed / chunkStats.total) * 100)}%`,
                }}
              />
            </div>
            <span className="text-[11px] text-muted-foreground">
              {chunkStats.completed}/{chunkStats.total}
            </span>
          </div>
        ) : null}
      </div>

      {isNewlyPlaced ? (
        <span
          data-triage-role="explorer-card-marker"
          className="newly-marker absolute left-0 top-0 z-20 text-[10px] font-semibold"
          data-card-marker="newly-placed"
        >
          {INBOX_TRIAGE_COPY.newlyPlacedUndo.marker}
        </span>
      ) : null}

      {undo !== undefined && isExplorer ? (
        <TooltipProvider><Tooltip open={undo.tooltip === undefined ? false : undefined}>
          <TooltipTrigger asChild>{undoButton}</TooltipTrigger>
          {undo.tooltip !== undefined ? <TooltipContent side="top" sideOffset={4} avoidCollisions={false}
            className="newly-undo-tooltip" data-triage-role="explorer-undo-tooltip">
            {undo.tooltip}
          </TooltipContent> : null}
        </Tooltip></TooltipProvider>
      ) : undoButton}

      {/* Past-deadline overlay */}
      {!isExplorer && pastDeadline ? (
        <div data-triage-role="explorer-card-overdue" className="absolute inset-0 flex items-center justify-center gap-2 rounded-[10px] bg-background/50 backdrop-blur-[3px]">
          <span className="text-[13px] font-semibold text-foreground">Done?</span>
          <button
            type="button"
            aria-label="Mark as done"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Dismiss"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      {/* Edit mode delete overlay */}
      {isEditMode ? (
        <button
          data-triage-role="explorer-card-delete"
          type="button"
          aria-label={`Delete ${bit.title}`}
          className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
          onClick={(event) => {
            event.stopPropagation();
            onDelete?.();
          }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}

      {!isExplorer && !isEditMode ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              data-triage-role="explorer-card-menu"
              type="button"
              aria-label={`${bit.title} options`}
              className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover/bit:opacity-60"
              onClick={(event) => event.stopPropagation()}
            >
              <MoreHorizontal className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="bottom" sideOffset={4}>
            <DropdownMenuItem onClick={() => void archive("bit", bit.id)}>
              Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
});
