"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { format } from "date-fns";
import { ArrowUpDown, Trash2 } from "lucide-react";
import { PendingLoader } from "@/components/feedback/pending-loader";
import { usePendingAction } from "@/hooks/use-pending-action";
import { PENDING_SENTENCE } from "@/lib/copy/feedback";
import { cn } from "@/lib/utils";
import type { Chunk } from "@/types";

type ChunkItemProps = {
  chunk: Chunk;
  isDraggable: boolean;
  showConnector: boolean;
  onToggle: (chunk: Chunk) => void;
  onEdit: (chunkId: string, title: string) => Promise<void>;
  onDelete: (chunkId: string) => Promise<void>;
};

export function ChunkItem({ chunk, isDraggable, showConnector, onToggle, onEdit, onDelete }: ChunkItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const deleteAction = usePendingAction();
  const [editValue, setEditValue] = useState(chunk.title);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: chunk.id, disabled: !isDraggable });

  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0) scaleX(${transform.scaleX}) scaleY(${transform.scaleY})`
      : undefined,
    transition,
    opacity: isDragging ? 0.4 : undefined,
  };

  const isComplete = chunk.status === "complete";
  const timeLabel = chunk.time
    ? format(new Date(chunk.time), chunk.timeAllDay ? "MMM d" : "MMM d, h:mm a")
    : null;

  async function handleBlur() {
    const trimmed = editValue.trim();
    if (!trimmed) {
      setEditValue(chunk.title);
    } else if (trimmed !== chunk.title) {
      await onEdit(chunk.id, trimmed);
    }
    setIsEditing(false);
  }

  return (
    <div ref={setNodeRef} style={style} className="relative flex items-start gap-3">
      {/* Left rail: circle node + optional connector segment to next node */}
      <div className="flex w-4 flex-col items-center self-stretch">
        <div
          className={cn(
            "mt-1 h-3.5 w-3.5 flex-shrink-0 cursor-pointer rounded-full transition-colors",
            isComplete ? "bg-primary" : "border-2 border-muted-foreground/40",
          )}
          role="checkbox"
          aria-checked={isComplete}
          aria-label={`Mark "${chunk.title}" as ${isComplete ? "incomplete" : "complete"}`}
          tabIndex={0}
          onClick={() => onToggle(chunk)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onToggle(chunk);
            }
          }}
        />
        {showConnector ? (
          <div className="mt-1 w-0.5 flex-1 bg-border" />
        ) : null}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 pb-5">
        {isEditing ? (
          <input
            autoFocus
            className="w-full appearance-none bg-transparent text-sm leading-5 text-foreground focus:outline-none"
            maxLength={200}
            onBlur={() => void handleBlur()}
            onChange={(event) => setEditValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
              }
              if (event.key === "Escape") {
                setEditValue(chunk.title);
                setIsEditing(false);
              }
            }}
            value={editValue}
          />
        ) : (
          <p
            className={cn(
              "cursor-text text-sm leading-5",
              isComplete ? "line-through text-muted-foreground" : "text-foreground",
            )}
            onClick={() => {
              setEditValue(chunk.title);
              setIsEditing(true);
            }}
          >
            {chunk.title}
          </p>
        )}
        {timeLabel ? <p className="mt-0.5 text-xs text-muted-foreground">{timeLabel}</p> : null}
      </div>

      {/* Right-side actions — always visible */}
      <div className="flex flex-shrink-0 items-start gap-0.5 pt-0.5 pb-5">
        {isDraggable ? (
          <button
            type="button"
            aria-label="Drag to reorder"
            className="flex h-5 w-5 cursor-grab items-center justify-center rounded text-muted-foreground/50 transition-colors hover:text-muted-foreground active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
          </button>
        ) : null}
        <button
          type="button"
          aria-label={`Delete "${chunk.title}"`}
          aria-busy={deleteAction.busy}
          className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/50 transition-colors hover:text-destructive disabled:cursor-not-allowed"
          disabled={deleteAction.busy}
          onClick={() => void deleteAction.run(() => onDelete(chunk.id))}
        >
          <Trash2 className="h-3.5 w-3.5" />
          <PendingLoader busy={deleteAction.busy} sentence={PENDING_SENTENCE.deleteStep} />
        </button>
      </div>
    </div>
  );
}
