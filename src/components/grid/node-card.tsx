"use client";

import { ChevronRight, MoreHorizontal, Undo2, X } from "lucide-react";
import { motion, type HTMLMotionProps } from "motion/react";
import type { Ref } from "react";
import { NODE_ICON_MAP } from "@/lib/constants/node-icons";
import {
  nodeCardTransition,
  nodeCardVariants,
} from "@/lib/animations/grid";
import { getAgingFilter, getAgingState } from "@/lib/utils/aging";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useArchiveActions } from "@/hooks/use-archive";
import { INBOX_TRIAGE_COPY } from "@/lib/copy/inbox-triage";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ExplorerTitle, useExplorerCardTooltips } from "./explorer-title-tooltip";
import type { Node } from "@/types";

type NodeCardProps = {
  presentation?: "default" | "inbox-explorer";
  node: Node;
  onClick: () => void;
  onDelete?: () => void;
  isEditMode?: boolean;
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
  ref?: Ref<HTMLButtonElement>;
} & Omit<
  HTMLMotionProps<"button">,
  | "animate"
  | "children"
  | "initial"
  | "onClick"
  | "transition"
  | "variants"
  | "whileHover"
>;

const nodeTitleClass =
  "truncate whitespace-nowrap text-center text-[11px] font-semibold leading-[var(--grid-node-title-height)] text-foreground";

export function NodeCard({
  presentation = "default",
  node,
  onClick,
  onDelete,
  isEditMode = false,
  isDragging = false,
  isNewlyPlaced = false,
  undoActionRef,
  undo,
  className,
  ref,
  style,
  onBlur,
  onFocus,
  ...buttonProps
}: NodeCardProps) {
  const tooltips = useExplorerCardTooltips();
  const Icon = NODE_ICON_MAP[node.icon] ?? NODE_ICON_MAP.Box;
  const agingFilter = getAgingFilter(getAgingState(node.mtime));
  const { archive } = useArchiveActions();
  const isExplorer = presentation === "inbox-explorer";
  const hasOptions = !isExplorer && !isEditMode && node.systemRole === null;

  const undoButton = undo !== undefined ? (
<button
          data-triage-role="explorer-card-undo"
          type="button"
          aria-describedby={undo.describedBy}
          aria-disabled={undo.disabled}
          aria-label={
            undo.label === undefined ||
            undo.label === INBOX_TRIAGE_COPY.newlyPlacedUndo.actions.undo
              ? `Undo placement of ${node.title}`
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
      className="group/card relative flex h-full items-center justify-center"
      data-card-presentation={presentation}
      data-triage-role="explorer-card-node-shell"
      data-newly-action-kind={isExplorer && undo !== undefined && undo.label !== undefined && undo.label !== INBOX_TRIAGE_COPY.newlyPlacedUndo.actions.undo ? "recovery" : undefined}
      data-card-has-actions={undo !== undefined || isEditMode || hasOptions ? "true" : undefined}
      data-newly-placed={isNewlyPlaced ? "true" : undefined}
    >
      <motion.button
        {...buttonProps}
        data-card-presentation={presentation}
        data-triage-role="explorer-card-node"
        ref={ref}
        type="button"
        aria-label={buttonProps["aria-label"] ?? node.title}
        animate={!isExplorer && isDragging ? "dragging" : "rest"}
        className={cn(
          "theme-node-card relative grid h-[var(--grid-node-size)] w-[var(--grid-node-size)] max-h-full max-w-full grid-rows-[1fr_var(--grid-node-title-height)] justify-items-center px-[var(--grid-node-padding-x)] pb-[var(--grid-node-padding-bottom)] pt-[var(--grid-node-padding-top)] hover:bg-muted/40 active:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isExplorer ? "cursor-pointer transition-colors" : "cursor-grab active:cursor-grabbing transition-[box-shadow,background-color]",
          !isExplorer && isDragging && "cursor-grabbing bg-muted/60 [box-shadow:var(--theme-shadow-hover)]",
          isEditMode && "motion-safe:animate-jiggle",
          className,
        )}
        data-newly-placed={isNewlyPlaced ? "true" : undefined}
        initial={false}
        onBlur={(event) => {
          onBlur?.(event);
          if (isExplorer) tooltips.onCardBlur(event);
        }}
        onFocus={(event) => {
          onFocus?.(event);
          if (isExplorer) tooltips.onCardFocus(event);
        }}
        onClick={onClick}
        style={{ ...style, filter: agingFilter }}
        transition={nodeCardTransition}
        variants={nodeCardVariants}
        whileHover={isExplorer || isDragging ? undefined : "hover"}
      >
        {isNewlyPlaced ? (
          <span
            data-triage-role="explorer-card-marker"
            className="newly-marker absolute left-0 top-0 z-20 text-[10px] font-semibold"
            data-card-marker="newly-placed"
          >
            {INBOX_TRIAGE_COPY.newlyPlacedUndo.marker}
          </span>
        ) : null}
        {/* Fixed icon slot so title length never shifts or scales the icon */}
        <div data-triage-role="explorer-card-icon-slot" className="flex min-h-0 items-center justify-center self-center pb-[var(--grid-node-icon-lift)]">
          <Icon
            data-triage-role="explorer-card-icon"
            className="h-[var(--grid-node-icon-size)] w-[var(--grid-node-icon-size)] shrink-0"
            style={{ color: "var(--triage-explorer-card-icon-color, " + node.color + ")" }}
          />
        </div>
        {/* Fixed title slot so short titles remain visible and long ones ellipsize */}
        <div data-triage-role="explorer-card-title-slot" className="h-[var(--grid-node-title-height)] w-full overflow-hidden self-start">
          {isExplorer ? (
            <ExplorerTitle tooltips={tooltips} title={node.title} className={nodeTitleClass} />
          ) : (
            <p data-triage-role="explorer-card-title" className={nodeTitleClass}>
              {node.title}
            </p>
          )}
        </div>
        <ChevronRight aria-hidden="true" data-triage-role="explorer-card-chevron" className="hidden pointer-events-none shrink-0" />
      </motion.button>

      {undo !== undefined && isExplorer ? (
        <TooltipProvider><Tooltip
          open={undo.tooltip === undefined ? false : tooltips.undoOpen}
          onOpenChange={undo.tooltip === undefined ? undefined : tooltips.onUndoOpenChange}
        >
          <TooltipTrigger asChild>{undoButton}</TooltipTrigger>
          {undo.tooltip !== undefined ? <TooltipContent side="top" sideOffset={4} avoidCollisions={false}
            className="newly-undo-tooltip" data-triage-role="explorer-undo-tooltip">
            {undo.tooltip}
          </TooltipContent> : null}
        </Tooltip></TooltipProvider>
      ) : undoButton}

      {isEditMode ? (
        <button
          data-triage-role="explorer-card-delete"
          type="button"
          aria-label={`Delete ${node.title}`}
          className="absolute right-1 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
          onClick={(event) => {
            event.stopPropagation();
            onDelete?.();
          }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}

      {hasOptions ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              data-triage-role="explorer-card-menu"
              type="button"
              aria-label={`${node.title} options`}
              className="absolute right-1 top-0 flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover/card:opacity-60"
              onClick={(event) => event.stopPropagation()}
            >
              <MoreHorizontal className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="bottom" sideOffset={4}>
            <DropdownMenuItem onClick={() => void archive("node", node.id)}>
              Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}
