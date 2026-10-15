"use client";

import { Folder, GripVertical, ListTodo } from "lucide-react";
import type { TriageDragItem } from "@/hooks/use-dnd";
import { cn } from "@/lib/utils";

interface TriageDragTokenProps {
  item: TriageDragItem;
}

export function TriageDragToken({ item }: TriageDragTokenProps) {
  if (item === null) return null;

  const Icon =
    item.kind === "triage-breakdown"
      ? GripVertical
      : item.kind === "triage-staged-node"
        ? Folder
        : ListTodo;
  const shouldRenderLabel = item.kind !== "triage-staged-node";

  return (
    <div
      className={cn(
        "triage-drag-token pointer-events-none inline-flex h-8 max-w-40 select-none items-center justify-center gap-1.5 rounded-full border bg-popover px-2 text-foreground shadow-lg",
        "cursor-grabbing",
        item.kind === "triage-staged-node" ? "w-8 border-primary px-0" : "border-border",
      )}
      data-candidate-version={
        item.kind === "triage-breakdown" ? undefined : item.candidateVersion
      }
      data-source-version={item.sourceVersion}
      data-triage-role="drag-token"
      data-triage-drag-token={item.kind}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
      {shouldRenderLabel ? (
        <span
          className={cn(
            "truncate text-xs font-medium leading-none",
            item.kind === "triage-breakdown" ? "max-w-[12ch]" : "max-w-[8ch]",
          )}
        >
          {item.label}
        </span>
      ) : null}
    </div>
  );
}
