"use client";

import { useId, type ReactElement } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * The status sentence of an item, shown on hover or keyboard focus (feedback
 * F09). It holds no controls and is static in both motion modes (the
 * `explorer-title-tooltip` class). The sentence is always the host's
 * description through `aria-describedby`, open or closed. An empty sentence
 * (a host with no status yet, kept mounted so it keeps focus) describes nothing. Only one tooltip is
 * open at a time: Radix closes the others when one opens.
 *
 * `children` is the single host element the tooltip attaches to (a row's grip,
 * the Add field, a Staging card, a status icon). `open` and `onOpenChange` make
 * it controlled, for hosts that dismiss tooltips while dragging.
 */
export function StatusTooltip({
  sentence,
  children,
  open,
  onOpenChange,
  side = "top",
  sideOffset = 4,
}: {
  sentence: string;
  children: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  side?: "top" | "right" | "bottom" | "left";
  sideOffset?: number;
}) {
  const descriptionId = useId();

  return (
    <TooltipProvider>
      <Tooltip open={open} onOpenChange={onOpenChange}>
        <TooltipTrigger
          asChild
          aria-describedby={sentence === "" ? undefined : descriptionId}
        >
          {children}
        </TooltipTrigger>
        <TooltipContent
          side={side}
          sideOffset={sideOffset}
          data-feedback-role="status-tooltip"
          className="explorer-title-tooltip"
        >
          {sentence}
        </TooltipContent>
      </Tooltip>
      {sentence === "" ? null : (
        <span id={descriptionId} className="sr-only">
          {sentence}
        </span>
      )}
    </TooltipProvider>
  );
}
