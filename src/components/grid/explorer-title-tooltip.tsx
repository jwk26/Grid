"use client";

import { useDndContext } from "@dnd-kit/core";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
} from "react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type OpenTooltip = "title" | "undo" | null;

// Sub-pixel overflow guard: a text Range reports the untruncated width.
const SUBPIXEL_TOLERANCE = 0.1;

export function isTitleTruncated(element: HTMLElement): boolean {
  if (element.scrollWidth > element.clientWidth) return true;
  if (typeof document.createRange !== "function") return false;
  const range = document.createRange();
  range.selectNodeContents(element);
  if (typeof range.getBoundingClientRect !== "function") return false;
  return range.getBoundingClientRect().width > element.getBoundingClientRect().width + SUBPIXEL_TOLERANCE;
}

function matchesFocusVisible(element: HTMLElement): boolean {
  try {
    return element.matches(":focus-visible");
  } catch {
    return false;
  }
}

/**
 * Card-local state shared by the Explorer title tooltip and the Undo tooltip so
 * they are never shown at once (Task 179A). Used only by `inbox-explorer` cards.
 */
export function useExplorerCardTooltips() {
  const [open, setOpen] = useState<OpenTooltip>(null);
  const titleRef = useRef<HTMLParagraphElement>(null);
  const dragActiveRef = useRef(false);
  // Esc keeps the title tooltip closed until focus leaves the card or the pointer leaves the title.
  const dismissedRef = useRef(false);

  // A focus-opened title stays until Esc or blur: Radix closes it on any ancestor scroll,
  // which keyboard focus itself triggers when it scrolls the card into view.
  const openedByFocusRef = useRef(false);

  const close = useCallback((which: Exclude<OpenTooltip, null>) => {
    setOpen((current) => (current === which ? null : current));
  }, []);

  const openTitle = useCallback((byFocus: boolean) => {
    const title = titleRef.current;
    if (
      title === null ||
      dragActiveRef.current ||
      dismissedRef.current ||
      !isTitleTruncated(title)
    ) {
      return;
    }
    openedByFocusRef.current = byFocus;
    setOpen("title");
  }, []);

  const onTitleOpenChange = useCallback((next: boolean) => {
    if (next) {
      openTitle(false);
      return;
    }
    if (openedByFocusRef.current && !dismissedRef.current && !dragActiveRef.current) return;
    close("title");
  }, [close, openTitle]);

  const onUndoOpenChange = useCallback((next: boolean) => {
    if (next) setOpen("undo");
    else close("undo");
  }, [close]);

  const onCardFocus = useCallback((event: FocusEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return;
    if (!matchesFocusVisible(event.currentTarget)) return;
    openTitle(true);
  }, [openTitle]);

  const onCardBlur = useCallback((event: FocusEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return;
    dismissedRef.current = false;
    openedByFocusRef.current = false;
    close("title");
  }, [close]);

  return {
    titleOpen: open === "title",
    undoOpen: open === "undo",
    titleRef,
    dragActiveRef,
    dismissedRef,
    onTitleOpenChange,
    onUndoOpenChange,
    onCardFocus,
    onCardBlur,
  };
}

export type ExplorerCardTooltips = ReturnType<typeof useExplorerCardTooltips>;

export function ExplorerTitle({
  tooltips,
  title,
  className,
  titleRole = "explorer-card-title",
}: {
  tooltips: ExplorerCardTooltips;
  title: string;
  className?: string;
  titleRole?: string;
}) {
  const { active } = useDndContext();
  const dragging = active !== null;
  const { dragActiveRef, dismissedRef, onTitleOpenChange, titleOpen, titleRef } = tooltips;

  useEffect(() => {
    dragActiveRef.current = dragging;
    if (dragging) onTitleOpenChange(false);
  }, [dragging, dragActiveRef, onTitleOpenChange]);

  return (
    <TooltipProvider>
      <Tooltip open={titleOpen} onOpenChange={onTitleOpenChange}>
        <TooltipTrigger asChild>
          <p
            ref={titleRef}
            data-triage-role={titleRole}
            className={cn(className)}
            onPointerLeave={() => {
              dismissedRef.current = false;
            }}
          >
            {title}
          </p>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          sideOffset={4}
          avoidCollisions={false}
          hideWhenDetached
          aria-hidden="true"
          className="explorer-title-tooltip"
          data-triage-role="explorer-title-tooltip"
          onEscapeKeyDown={() => {
            dismissedRef.current = true;
          }}
        >
          {title}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
