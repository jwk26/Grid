import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type GridCellProps = {
  x: number;
  y: number;
  isEditMode: boolean;
  isEmpty: boolean;
  isDragOver?: boolean;
  onAddClick?: () => void;
  children?: ReactNode;
};

export function GridCell({
  x,
  y,
  isEditMode,
  isEmpty,
  isDragOver = false,
  onAddClick,
  children,
}: GridCellProps) {
  const showEditModeAddButton = isEmpty && isEditMode && !!onAddClick && !isDragOver;
  const showDragOverIndicator = isEmpty && isDragOver;
  const showEmptyAffordance = showEditModeAddButton || showDragOverIndicator;

  return (
    <div
      className={cn(
        "theme-grid-line relative h-full transition-all",
        showEmptyAffordance && "flex min-h-[5rem] items-center justify-center",
      )}
      data-position={`${x},${y}`}
    >
      {children}
      {showEditModeAddButton ? (
        <button
          type="button"
          aria-label="Add item"
          className="group flex h-full w-full items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          onClick={onAddClick}
        >
          <span className="flex h-[var(--grid-node-size)] w-[var(--grid-node-size)] max-h-full max-w-full items-center justify-center rounded-2xl text-transparent transition-colors group-hover:text-muted-foreground/60">
            <Plus className="h-5 w-5" />
          </span>
        </button>
      ) : null}
      {showDragOverIndicator ? (
        <div aria-hidden={true} className="pointer-events-none flex h-full w-full items-center justify-center rounded-md">
          <div className="animate-in fade-in-0 zoom-in-95 flex h-[var(--grid-node-size)] w-[var(--grid-node-size)] max-h-full max-w-full items-center justify-center rounded-2xl border-2 border-dashed border-primary/60 bg-primary/5 text-primary/60 duration-150">
            <Plus className="h-5 w-5" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
