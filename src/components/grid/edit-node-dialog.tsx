"use client";

import type { FormEvent } from "react";
import { useEffect, useId, useState } from "react";
import { DateFirstDeadlinePicker } from "@/components/shared/date-first-deadline-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_ICON,
  NODE_ICON_MAP,
  NODE_ICON_NAMES,
} from "@/lib/constants/node-icons";
import { useNodeActions } from "@/hooks/use-node-actions";
import { editDialogFailed } from "@/lib/copy/feedback";
import { WriteOutcomeUnknownError, WriteRejectedError } from "@/lib/db/write-errors";
import { cn } from "@/lib/utils";
import type { Node } from "@/types";

function hue2rgb(p: number, q: number, t: number): number {
  let tt = t;
  if (tt < 0) tt += 1;
  if (tt > 1) tt -= 1;
  if (tt < 1 / 6) return p + (q - p) * 6 * tt;
  if (tt < 1 / 2) return q;
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
  return p;
}

function hslToHex(hslStr: string): string {
  const match = hslStr.match(/hsl\(\s*([\d.]+),\s*([\d.]+)%,\s*([\d.]+)%\s*\)/);
  if (!match) return "#3b82f6";
  const h = parseFloat(match[1]) / 360;
  const s = parseFloat(match[2]) / 100;
  const l = parseFloat(match[3]) / 100;
  if (s === 0) {
    const val = Math.round(l * 255);
    return `#${val.toString(16).padStart(2, "0").repeat(3)}`;
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
  const g = Math.round(hue2rgb(p, q, h) * 255);
  const b = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function hexToHsl(hex: string): string {
  const normalized = hex.trim().replace("#", "");
  const expandedHex = normalized.length === 3
    ? normalized.split("").map((c) => `${c}${c}`).join("")
    : normalized;
  if (!/^[0-9a-f]{6}$/i.test(expandedHex)) throw new Error("Invalid color value.");
  const r = parseInt(expandedHex.slice(0, 2), 16) / 255;
  const g = parseInt(expandedHex.slice(2, 4), 16) / 255;
  const b = parseInt(expandedHex.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return `hsl(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

type EditNodeDialogProps = {
  level?: number;
  node: Node | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EditNodeDialog({ level, node, open, onOpenChange }: EditNodeDialogProps) {
  const { updateNode } = useNodeActions();
  const titleId = useId();
  const titleErrorId = useId();
  const iconId = useId();
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState(DEFAULT_ICON);
  const [colorHex, setColorHex] = useState("#3b82f6");
  const [deadline, setDeadline] = useState<number | null>(null);
  const [deadlineAllDay, setDeadlineAllDay] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [titleError, setTitleError] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  // Pre-populate when node changes or dialog opens
  useEffect(() => {
    if (!open || !node) return;
    setTitle(node.title);
    setIcon(node.icon);
    setColorHex(hslToHex(node.color));
    setDeadline(node.deadline);
    setDeadlineAllDay(node.deadlineAllDay);
    setTitleError(false);
    setError(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, node?.id]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!node) return;
    if (title.trim().length === 0) { setTitleError(true); return; }
    if (isSubmitting) return;
    setTitleError(false);
    setError(undefined);
    setIsSubmitting(true);
    try {
      await updateNode(node.id, {
        title: title.trim(),
        icon,
        color: hexToHsl(colorHex),
        deadline,
        deadlineAllDay,
      }, { report: false });
      onOpenChange(false);
    } catch (err) {
      // The dialog shows a refusal itself and keeps the typed values; a kept unknown outcome closes it.
      if (err instanceof WriteOutcomeUnknownError && err.kept === true) {
        onOpenChange(false);
      } else if (err instanceof WriteOutcomeUnknownError || err instanceof WriteRejectedError) {
        setError(editDialogFailed(node.title));
      } else {
        setError(err instanceof Error ? err.message : "Unable to save changes.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Node</DialogTitle>
          <DialogDescription>Update properties for this node.</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Title */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor={titleId}>
              Title
            </label>
            <Input
              autoFocus
              aria-describedby={titleErrorId}
              aria-invalid={titleError}
              id={titleId}
              maxLength={100}
              onChange={(e) => { setTitle(e.target.value); setTitleError(false); }}
              type="text"
              value={title}
            />
            <p id={titleErrorId} className="min-h-[1rem] text-sm text-destructive">
              {titleError ? "Title is required." : ""}
            </p>
          </div>

          {/* Icon */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-foreground" id={iconId}>
              Icon
            </div>
            <div className="max-h-[200px] overflow-y-auto pr-1">
              <div
                aria-labelledby={iconId}
                className="grid grid-cols-7 gap-1.5"
                role="radiogroup"
              >
              {NODE_ICON_NAMES.map((iconName) => {
                const Icon = NODE_ICON_MAP[iconName];
                const isSelected = iconName === icon;
                return (
                  <button
                    key={iconName}
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={`${iconName} icon`}
                    className={cn(
                      "flex size-10 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isSelected
                        ? "ring-2 ring-primary ring-offset-2"
                        : "border-input hover:border-primary/50 hover:text-foreground",
                    )}
                    onClick={() => setIcon(iconName)}
                    title={iconName}
                    type="button"
                  >
                    <Icon aria-hidden={true} className="h-5 w-5" />
                  </button>
                );
              })}
              </div>
            </div>
          </div>

          {/* Color */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Color</label>
            <Input
              className="h-10 cursor-pointer p-1"
              onChange={(e) => setColorHex(e.target.value)}
              type="color"
              value={colorHex}
            />
          </div>

          {/* Deadline */}
          {(level ?? 0) !== 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">Deadline</div>
              <DateFirstDeadlinePicker
                value={{ deadline, deadlineAllDay }}
                onChange={(value) => {
                  setDeadline(value.deadline);
                  setDeadlineAllDay(value.deadlineAllDay);
                }}
                onClear={() => {
                  setDeadline(null);
                  setDeadlineAllDay(false);
                }}
              />
            </div>
          )}

          <p role="alert" className="min-h-[1.25rem] text-sm text-destructive">
            {error ?? ""}
          </p>

          <DialogFooter>
            <Button
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={isSubmitting} type="submit">
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
