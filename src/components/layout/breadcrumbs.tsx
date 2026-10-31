"use client";

import { useDroppable } from "@dnd-kit/core";
import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { Fragment, forwardRef } from "react";
import type { DragActiveItem } from "@/hooks/use-dnd";
import { useBreadcrumbChain } from "@/hooks/use-breadcrumb-chain";
import type { RevealHandlers, RevealPhase } from "@/hooks/use-breadcrumb-reveal";
import { getGridBreadcrumbDropId } from "@/lib/grid-dnd";
import { cn } from "@/lib/utils";
import { BreadcrumbDeadline } from "./breadcrumb-deadline";

function BreadcrumbSegmentButton({
  label,
  nodeId,
  onClick,
  dragActiveItem,
}: {
  label: string;
  nodeId: string | null;
  onClick: () => void;
  dragActiveItem?: DragActiveItem;
}) {
  // The root accepts a Node but never a Bit (the no-Bit-on-Home rule). Home stays a drop
  // target for a Bit so the drop does not fall through to a card under the segment;
  // `useDnd` refuses it without a write or a dialog.
  const refusesDrop = nodeId === null && dragActiveItem?.type === "bit";
  const { isOver, setNodeRef } = useDroppable({
    id: getGridBreadcrumbDropId(nodeId),
    data: {
      kind: "grid-breadcrumb-drop",
      targetNodeId: nodeId,
      targetNodeTitle: label,
    },
  });
  const isDropTarget = Boolean(dragActiveItem) && !refusesDrop && isOver;

  return (
    <button
      ref={setNodeRef}
      className={cn(
        "pointer-events-auto rounded-md px-1.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground shrink-0 whitespace-nowrap",
        isDropTarget && "breadcrumb-drop-target",
      )}
      data-drop-zone={nodeId ? "breadcrumb-node" : "breadcrumb-root"}
      data-node-id={nodeId ?? undefined}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

/**
 * The revealed breadcrumb (feedback F22-F25), one row: the segments and the deadline
 * chip. The outer element is the row's shown-position box (the toast anchor and
 * the Home focus handoff read it); `breadcrumb-reveal` carries the clip and slide, and each
 * `breadcrumb-reveal__surface` carries its own opacity, because neither may run on
 * the element that has `backdrop-filter` (DESIGN_TOKENS FB-11). Hidden, it stays
 * mounted so it stays in the accessibility tree and in Tab order.
 */
export const Breadcrumbs = forwardRef<
  HTMLDivElement,
  {
    nodeId: string;
    dragActiveItem?: DragActiveItem;
    phase: RevealPhase;
    instant: boolean;
    handlers: RevealHandlers;
    onHeldChange: (held: boolean) => void;
  }
>(function Breadcrumbs({ nodeId, dragActiveItem, phase, instant, handlers, onHeldChange }, ref) {
  const router = useRouter();
  const segments = useBreadcrumbChain(nodeId);
  const currentNode = segments.at(-1) ?? null;
  const ancestors = currentNode ? segments.slice(0, -1) : [];

  return (
    <div className="pointer-events-none flex items-start" ref={ref}>
      <div
        className="breadcrumb-reveal flex items-center gap-2"
        data-app-role="breadcrumb-reveal"
        data-dragging={dragActiveItem ? "true" : undefined}
        data-instant={instant ? "true" : undefined}
        data-phase={phase}
        {...handlers}
      >
        <nav
          aria-label="Breadcrumb"
          className="breadcrumb-reveal__surface flex h-8 w-fit items-center gap-0.5 rounded-lg border border-border/40 bg-background/80 pl-2 pr-3 shadow-sm backdrop-blur-md max-w-[calc(100vw-5.5rem)] overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <BreadcrumbSegmentButton
            dragActiveItem={dragActiveItem}
            label="Home"
            nodeId={null}
            onClick={() => router.push("/")}
          />
          {ancestors.map((segment) => (
            <Fragment key={segment.id}>
              <ChevronRight className="h-3 w-3 text-muted-foreground/60 shrink-0" />
              <BreadcrumbSegmentButton
                dragActiveItem={dragActiveItem}
                label={segment.title}
                nodeId={segment.id}
                onClick={() => router.push(`/grid/${segment.id}`)}
              />
            </Fragment>
          ))}
          <ChevronRight className="h-3 w-3 text-muted-foreground/60 shrink-0" />
          <span
            aria-current="page"
            className="px-1.5 text-xs font-semibold text-foreground whitespace-nowrap shrink-0"
          >
            {currentNode?.title ?? "..."}
          </span>
        </nav>
        <BreadcrumbDeadline nodeId={nodeId} onHeldChange={onHeldChange} />
      </div>
    </div>
  );
});
