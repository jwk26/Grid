"use client";

import { format } from "date-fns";
import { Calendar } from "lucide-react";
import { useState } from "react";
import { DateFirstDeadlinePicker } from "@/components/shared/date-first-deadline-picker";
import { DeadlineConflictModal } from "@/components/shared/deadline-conflict-modal";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNode } from "@/hooks/use-node";
import { useNodeActions } from "@/hooks/use-node-actions";
import { dropReportedFailure } from "@/lib/db/write-failure";

type PendingDeadlineValue = {
  deadline: number;
  deadlineAllDay: boolean;
};

export function BreadcrumbDeadline({ nodeId }: { nodeId: string }) {
  const node = useNode(nodeId);
  const { updateNode, getChildDeadlineConflicts } = useNodeActions();
  const [isOpen, setIsOpen] = useState(false);
  const [pendingValue, setPendingValue] = useState<PendingDeadlineValue | null>(null);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);

  if (!node || node.deadline === null) {
    return null;
  }

  const label = node.deadlineAllDay
    ? `Due ${format(new Date(node.deadline), "MMM d")}`
    : `Due ${format(new Date(node.deadline), "MMM d, h:mm a")}`;

  async function handleChange(value: { deadline: number | null; deadlineAllDay: boolean }) {
    if (value.deadline === null) {
      return;
    }

    setIsOpen(false);

    const conflicts = await getChildDeadlineConflicts(
      nodeId,
      value.deadline,
      value.deadlineAllDay,
    );

    if (conflicts.length > 0) {
      setPendingValue({ deadline: value.deadline, deadlineAllDay: value.deadlineAllDay });
      setConflictModalOpen(true);
      return;
    }

    await updateNode(nodeId, {
      deadline: value.deadline,
      deadlineAllDay: value.deadlineAllDay,
    }).catch(dropReportedFailure);
  }

  async function handleClear() {
    setIsOpen(false);
    await updateNode(nodeId, { deadline: null, deadlineAllDay: false }).catch(dropReportedFailure);
  }

  async function handleUpdateParent() {
    if (pendingValue) {
      await updateNode(nodeId, pendingValue).catch(dropReportedFailure);
    }

    setPendingValue(null);
    setConflictModalOpen(false);
  }

  function handleKeepChild() {
    setPendingValue(null);
    setConflictModalOpen(false);
  }

  return (
    <>
      <Popover onOpenChange={setIsOpen} open={isOpen}>
        <PopoverTrigger asChild>
          <button
            className="pointer-events-auto inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg border border-border/40 bg-background/80 pl-2 pr-3 text-[11px] font-medium text-muted-foreground shadow-sm backdrop-blur-md transition-colors hover:text-foreground"
            type="button"
          >
            <Calendar className="h-3 w-3" />
            {label}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-auto rounded-xl border border-border bg-popover p-1.5 shadow-xl"
        >
          <DateFirstDeadlinePicker
            onChange={(value) => {
              void handleChange(value);
            }}
            onClear={() => {
              void handleClear();
            }}
            value={{ deadline: node.deadline, deadlineAllDay: node.deadlineAllDay }}
          />
        </PopoverContent>
      </Popover>
      <DeadlineConflictModal
        open={conflictModalOpen}
        onKeepChild={handleKeepChild}
        onUpdateParent={() => void handleUpdateParent()}
        parentDeadline={pendingValue?.deadline ?? 0}
        parentDeadlineAllDay={pendingValue?.deadlineAllDay}
      />
    </>
  );
}
