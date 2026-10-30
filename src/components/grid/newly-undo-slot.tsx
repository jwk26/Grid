"use client";

import { Undo2 } from "lucide-react";
import type { KeyboardEvent, Ref } from "react";
import { StatusIcon, type StatusPresentation } from "@/components/feedback/status-icon";
import { StatusTooltip } from "@/components/feedback/status-tooltip";
import type { ItemStatus } from "@/lib/feedback/item-status";

/**
 * What an Explorer Newly item's Undo slot carries (feedback F07, F09): the
 * operation status, the sentence that is both tooltip and description, and the
 * button's own action name.
 */
export type NewlyUndoSlotModel = Readonly<{
  /** The status the slot shows; `null` keeps the `↶` glyph. */
  status: ItemStatus | null;
  /** Names the operation so a new one restarts the display delay. */
  phaseKey: string;
  /** Tooltip and description: the state's sentence plus `Select to …` where it acts. */
  sentence: string;
  /** Unavailable: `aria-disabled`, never `disabled`, so it keeps focus and its reason. */
  disabled: boolean;
  /** The button's accessible name. */
  label: string;
  onActivate: () => void;
  reason: string;
}>;

/**
 * The Undo button as the Undo operation's status slot: `↶` (also while a pending
 * Undo waits out the display delay), the loader, `?` or `!`. The glyph is
 * decoration inside the button; the name is the action and the description is the
 * tooltip sentence, once. Cards control the tooltip so it never shows with the
 * title tooltip; search results leave it uncontrolled.
 */
export function NewlyUndoSlot({
  buttonRef,
  className,
  model,
  onKeyDown,
  open,
  onOpenChange,
  presentation,
  role,
}: {
  buttonRef?: Ref<HTMLButtonElement>;
  className: string;
  model: NewlyUndoSlotModel;
  onKeyDown?: (event: KeyboardEvent<HTMLButtonElement>) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  presentation: StatusPresentation;
  role: string;
}) {
  return (
    <StatusTooltip open={open} onOpenChange={onOpenChange} sentence={model.sentence}>
      <button
        ref={buttonRef}
        type="button"
        aria-disabled={model.disabled ? "true" : undefined}
        aria-label={model.label}
        className={className}
        data-feedback-role={
          presentation.glyph === "question" ||
          presentation.glyph === "exclamation"
            ? "status-slot-button"
            : undefined
        }
        data-triage-role={role}
        data-undo-reason={model.reason}
        onKeyDown={onKeyDown}
        onClick={(event) => {
          event.stopPropagation();
          if (model.disabled) return;
          model.onActivate();
        }}
      >
        {presentation.glyph === null ? (
          <Undo2 aria-hidden="true" className="size-3" />
        ) : (
          <StatusIcon
            aria-hidden="true"
            presentation={presentation}
            sentence={model.sentence}
          />
        )}
      </button>
    </StatusTooltip>
  );
}
