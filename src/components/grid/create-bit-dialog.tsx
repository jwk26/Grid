"use client";

import type { FormEvent } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { ParentNodeSelector } from "@/components/calendar/parent-node-selector";
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
import { Textarea } from "@/components/ui/textarea";
import { useCalendarData } from "@/hooks/use-calendar-data";
import { DEFAULT_ICON, NODE_ICON_MAP, NODE_ICON_NAMES } from "@/lib/constants/node-icons";
import { cn } from "@/lib/utils";
import type { Bit } from "@/types";

type Priority = Bit["priority"];
const PRIORITY_OPTIONS: Priority[] = ["high", "mid", "low", null];
const PRIORITY_LABELS: Record<string, string> = { high: "High", mid: "Mid", low: "Low" };

export type CreateBitDialogValues = {
  title: string;
  description: string;
  icon: string;
  deadline: number | null;
  deadlineAllDay: boolean;
  priority: Priority;
  parentId?: string | null;
  // The chosen parent's title, so a caller can name it in a blocked-create reason.
  parentTitle?: string | null;
};

type CreateBitDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreateBitDialogValues) => Promise<void>;
  error?: string;
  requireParent?: boolean;
  defaultParentId?: string | null;
};

export function CreateBitDialog({
  open,
  onOpenChange,
  onSubmit,
  error,
  requireParent = false,
  defaultParentId = null,
}: CreateBitDialogProps) {
  const titleId = useId();
  const titleErrorId = useId();
  const descriptionId = useId();
  const iconId = useId();
  const { nodes } = useCalendarData();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState(DEFAULT_ICON);
  const [dateStr, setDateStr] = useState("");
  const [timeStr, setTimeStr] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [priority, setPriority] = useState<Priority>(null);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(defaultParentId ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [titleError, setTitleError] = useState(false);
  const prevOpenRef = useRef(false);

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setTitle("");
      setDescription("");
      setIcon(NODE_ICON_NAMES[Math.floor(Math.random() * NODE_ICON_NAMES.length)] ?? DEFAULT_ICON);
      setDateStr("");
      setTimeStr("");
      setAllDay(false);
      setPriority(null);
      setSelectedParentId(defaultParentId ?? null);
      setIsSubmitting(false);
      setTitleError(false);
    } else if (!open) {
      setTitle("");
      setDescription("");
      setDateStr("");
      setTimeStr("");
      setAllDay(false);
      setPriority(null);
      setIsSubmitting(false);
      setTitleError(false);
    }

    prevOpenRef.current = open;
  }, [open]);

  function buildDeadline(): { deadline: number | null; deadlineAllDay: boolean } {
    if (!dateStr) {
      return { deadline: null, deadlineAllDay: false };
    }

    const time = allDay ? "00:00" : (timeStr || "00:00");

    return {
      deadline: new Date(`${dateStr}T${time}`).getTime(),
      deadlineAllDay: allDay,
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (title.trim().length === 0) {
      setTitleError(true);
      return;
    }

    if (isSubmitting) {
      return;
    }

    setTitleError(false);
    setIsSubmitting(true);

    try {
      const { deadline, deadlineAllDay } = buildDeadline();
      await onSubmit({
        title,
        description,
        icon,
        deadline,
        deadlineAllDay,
        priority,
        ...(requireParent
          ? {
              parentId: selectedParentId,
              parentTitle:
                nodes.find((node) => node.id === selectedParentId)?.title ?? null,
            }
          : {}),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Bit</DialogTitle>
          <DialogDescription>
            Add a new bit and place it in the nearest available cell.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {requireParent ? (
            <ParentNodeSelector
              defaultParentId={defaultParentId}
              nodes={nodes}
              onChange={setSelectedParentId}
              value={selectedParentId}
            />
          ) : null}

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
              onChange={(event) => {
                setTitle(event.target.value);
                setTitleError(false);
              }}
              type="text"
              value={title}
            />
            <p id={titleErrorId} className="min-h-[1rem] text-sm text-destructive">
              {titleError ? "Title is required." : ""}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor={descriptionId}>
              Description
            </label>
            <Textarea
              id={descriptionId}
              maxLength={1000}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Description (optional)"
              value={description}
            />
          </div>

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
                        "flex size-10 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                        isSelected
                          ? "border-border bg-accent/60 text-foreground ring-2 ring-ring ring-offset-1"
                          : "border-input hover:border-border hover:bg-accent/40 hover:text-foreground",
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

          <div className="space-y-2">
            <div className="text-sm font-medium text-foreground">Priority</div>
            <div className="flex gap-2">
              {PRIORITY_OPTIONS.map((option) => (
                <button
                  key={String(option)}
                  type="button"
                  onClick={() => setPriority(option)}
                  className={cn(
                    "inline-flex items-center rounded-full px-[10px] py-[3px] text-[11px] font-semibold uppercase tracking-[0.05em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                    option === "high" &&
                      priority === "high" &&
                      "bg-priority-high-bg text-priority-high ring-2 ring-priority-high",
                    option === "high" &&
                      priority !== "high" &&
                      "bg-priority-high-bg/40 text-priority-high/70 hover:bg-priority-high-bg",
                    option === "mid" &&
                      priority === "mid" &&
                      "bg-priority-mid-bg text-priority-mid ring-2 ring-priority-mid",
                    option === "mid" &&
                      priority !== "mid" &&
                      "bg-priority-mid-bg/40 text-priority-mid/70 hover:bg-priority-mid-bg",
                    option === "low" &&
                      priority === "low" &&
                      "bg-priority-low-bg text-priority-low ring-2 ring-priority-low",
                    option === "low" &&
                      priority !== "low" &&
                      "bg-priority-low-bg/40 text-priority-low/70 hover:bg-priority-low-bg",
                    option === null &&
                      priority === null &&
                      "bg-secondary text-foreground ring-2 ring-ring",
                    option === null &&
                      priority !== null &&
                      "bg-secondary/60 text-muted-foreground hover:bg-secondary",
                  )}
                >
                  {option ? PRIORITY_LABELS[option] : "None"}
                </button>
              ))}
            </div>
          </div>

          {!requireParent ? (
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">Deadline</div>
              <div className="flex items-center gap-2">
                <Input
                  className="w-[150px]"
                  type="date"
                  value={dateStr}
                  onChange={(event) => setDateStr(event.target.value)}
                />
                {!allDay ? (
                  <Input
                    className="w-[110px]"
                    type="time"
                    value={timeStr}
                    onChange={(event) => setTimeStr(event.target.value)}
                  />
                ) : null}
                <label className="flex cursor-pointer items-center gap-1.5 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={allDay}
                    onChange={(event) => setAllDay(event.target.checked)}
                    className="h-4 w-4 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                  />
                  All day
                </label>
              </div>
            </div>
          ) : null}

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
            <Button
              disabled={isSubmitting || (requireParent && !selectedParentId)}
              type="submit"
            >
              Create Bit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
