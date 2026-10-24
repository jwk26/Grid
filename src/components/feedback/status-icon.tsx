"use client";

import { LoaderCircle } from "lucide-react";
import type { ComponentProps } from "react";
import { useDisplayDelay } from "@/hooks/use-display-delay";
import {
  glyphHasEmphasis,
  resolveStatusGlyph,
  type ItemStatus,
  type StatusGlyph,
} from "@/lib/feedback/item-status";

export type StatusPresentation = Readonly<{
  status: ItemStatus | null;
  /** What is visible now: the loader only after the display delay. */
  glyph: StatusGlyph | null;
  /** True while a `?` or `!` is visible; never with the loader. */
  emphasis: boolean;
}>;

/**
 * The visible glyph and emphasis of an item status. `phaseKey` names the
 * operation (or any value that changes when a new wait begins), so a new
 * operation restarts the display delay. Call it once per item and pass the
 * result to both `StatusIcon` and `statusEmphasisProps`, so the icon and the
 * emphasis change together.
 */
export function useStatusPresentation(
  status: ItemStatus | null,
  phaseKey: string = "",
): StatusPresentation {
  const loaderDue = useDisplayDelay(
    status === "pending" || status === "reconciling"
      ? `${status}:${phaseKey}`
      : null,
  );
  const glyph = resolveStatusGlyph(status, loaderDue);
  return { status, glyph, emphasis: glyphHasEmphasis(glyph) };
}

/** `data-status-emphasis` for the item (card, row, field, editor, slot). */
export function statusEmphasisProps(
  presentation: Pick<StatusPresentation, "emphasis">,
): { "data-status-emphasis"?: "" } {
  return presentation.emphasis ? { "data-status-emphasis": "" } : {};
}

type StatusIconBaseProps = Omit<
  ComponentProps<"span">,
  "children" | "role" | "aria-label"
> & {
  /** The state's sentence; it names the icon and is what the tooltip shows. */
  sentence: string;
  /** Focusable for hosts that are not in the Tab order (F09). */
  focusable?: boolean;
};

export type StatusIconProps = StatusIconBaseProps &
  (
    | { presentation: StatusPresentation; status?: never; phaseKey?: never }
    | { status: ItemStatus; phaseKey?: string; presentation?: never }
  );

export function StatusIcon(props: StatusIconProps) {
  if (props.presentation !== undefined) {
    const { presentation, ...rest } = props;
    return <StatusIconView presentation={presentation} {...rest} />;
  }
  const { status, phaseKey, presentation: _unused, ...rest } = props;
  void _unused;
  return <OwnPresentationStatusIcon status={status} phaseKey={phaseKey} {...rest} />;
}

function OwnPresentationStatusIcon({
  status,
  phaseKey,
  ...rest
}: StatusIconBaseProps & { status: ItemStatus; phaseKey?: string }) {
  const presentation = useStatusPresentation(status, phaseKey);
  return <StatusIconView presentation={presentation} {...rest} />;
}

function StatusIconView({
  presentation,
  sentence,
  focusable = false,
  ...rest
}: StatusIconBaseProps & { presentation: StatusPresentation }) {
  const { status, glyph } = presentation;
  if (status === null || glyph === null) return null;

  return (
    <span
      tabIndex={focusable ? 0 : undefined}
      {...rest}
      data-feedback-role="status-icon"
      data-status={status}
      data-glyph={glyph}
      role="img"
      aria-label={sentence}
    >
      {glyph === "loader" ? (
        <LoaderCircle aria-hidden="true" strokeWidth={2.4} />
      ) : (
        <span aria-hidden="true">{glyph === "question" ? "?" : "!"}</span>
      )}
    </span>
  );
}
