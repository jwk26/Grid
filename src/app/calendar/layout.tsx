"use client";

import { DndContext, closestCorners } from "@dnd-kit/core";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState, type ReactNode } from "react";
import { ItemsPool } from "@/components/calendar/items-pool";
import { NodePool } from "@/components/calendar/node-pool";
import { CreateBitDialog } from "@/components/grid/create-bit-dialog";
import type { CreateBitDialogValues } from "@/components/grid/create-bit-dialog";
import { CreateNodeDialog } from "@/components/grid/create-node-dialog";
import { Sidebar } from "@/components/layout/sidebar";
import { DeadlineConflictModal } from "@/components/shared/deadline-conflict-modal";
import { useDnd } from "@/hooks/use-dnd";
import { useGridActions } from "@/hooks/use-grid-actions";
import { GRID_COLS } from "@/lib/constants";
import { findNearestEmptyCell } from "@/lib/utils/bfs";
import { classifyCreateRefusal } from "@/lib/feedback/create-refusal";
import { hexToHsl } from "@/lib/utils/color";
import { cn } from "@/lib/utils";
import { useCalendarStore } from "@/stores/calendar-store";

export default function CalendarLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [isNodeDialogOpen, setIsNodeDialogOpen] = useState(false);
  const [createError, setCreateError] = useState<string | undefined>(undefined);
  const [isBitDialogOpen, setIsBitDialogOpen] = useState(false);
  const [bitCreateError, setBitCreateError] = useState<string | undefined>(undefined);
  const { getGridOccupancy, createNode, createBit } = useGridActions();
  const {
    conflictState,
    handleConflictKeepChild,
    handleConflictUpdateParent,
    handleDragEnd,
    handleDragOver,
    handleDragStart,
    overTargetId,
    sensors,
  } = useDnd(() => new Set<string>());
  const isPoolCollapsed = useCalendarStore((state) => state.isPoolCollapsed);
  const drillDownPath = useCalendarStore((state) => state.drillDownPath);
  const togglePool = useCalendarStore((state) => state.togglePool);
  const defaultParentId =
    drillDownPath.length > 0 ? (drillDownPath[drillDownPath.length - 1] ?? null) : null;

  async function handleCalendarNodeSubmit({
    title,
    icon,
    colorHex,
    deadline: _deadline,
    deadlineAllDay: _deadlineAllDay,
  }: {
    title: string;
    icon: string;
    colorHex: string;
    deadline: number | null;
    deadlineAllDay: boolean;
  }) {
    setCreateError(undefined);

    try {
      const occupied = await getGridOccupancy(null);
      const cell = findNearestEmptyCell(occupied, 2, 2, new Set());

      if (cell === null) {
        setCreateError("No empty cells available in the root grid.");
        return;
      }

      await createNode({
        title: title.trim(),
        color: hexToHsl(colorHex),
        icon,
        deadline: null,
        deadlineAllDay: false,
        parentId: null,
        level: 0,
        x: cell.x,
        y: cell.y,
      }, { report: false });
      setIsNodeDialogOpen(false);
    } catch (err) {
      const refusal = classifyCreateRefusal(err, title.trim());
      if (refusal.outcome === "kept") {
        setIsNodeDialogOpen(false);
      } else if (refusal.outcome === "line") {
        setCreateError(refusal.text);
      } else {
        setCreateError(err instanceof Error ? err.message : "Unable to create node.");
      }
    }
  }

  async function handleCalendarBitSubmit({
    title,
    description,
    icon,
    priority,
    parentId,
    deadline: _deadline,
    deadlineAllDay: _deadlineAllDay,
  }: CreateBitDialogValues) {
    setBitCreateError(undefined);

    try {
      if (!parentId) {
        setBitCreateError("A parent node is required.");
        return;
      }

      const occupied = await getGridOccupancy(parentId);
      const cell = findNearestEmptyCell(occupied, GRID_COLS - 3, 2, new Set());

      if (cell === null) {
        setBitCreateError("No empty cells available in the parent node.");
        return;
      }

      await createBit({
        title: title.trim(),
        description: description.trim(),
        icon,
        priority,
        parentId,
        deadline: null,
        deadlineAllDay: false,
        x: cell.x,
        y: cell.y,
      }, { report: false });
      setIsBitDialogOpen(false);
    } catch (err) {
      const refusal = classifyCreateRefusal(err, title.trim());
      if (refusal.outcome === "kept") {
        setIsBitDialogOpen(false);
      } else if (refusal.outcome === "line") {
        setBitCreateError(refusal.text);
      } else {
        setBitCreateError(err instanceof Error ? err.message : "Unable to create bit.");
      }
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        onNodeCreate={() => {
          setCreateError(undefined);
          setIsNodeDialogOpen(true);
        }}
        onBitCreate={() => {
          setBitCreateError(undefined);
          setIsBitDialogOpen(true);
        }}
      />
      <main className="ml-12 flex min-w-0 flex-1 flex-col overflow-hidden">
        <DndContext
          collisionDetection={closestCorners}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDragStart={handleDragStart}
          sensors={sensors}
        >
          <div className="flex min-h-0 flex-1">
            <motion.aside
              initial={{ width: "18rem" }}
              animate={{ width: isPoolCollapsed ? "3rem" : "18rem" }}
              transition={{ type: "tween", ease: "circOut", duration: 0.25 }}
              className="flex shrink-0 flex-col overflow-hidden border-r border-border bg-card"
            >
              <div
                className={cn(
                  "flex h-12 shrink-0 items-center border-b border-border px-2",
                  isPoolCollapsed ? "justify-center" : "justify-between",
                )}
              >
                {!isPoolCollapsed && (
                  <span className="text-sm font-semibold text-foreground">Pool</span>
                )}
                <button
                  type="button"
                  aria-label={isPoolCollapsed ? "Expand pool" : "Collapse pool"}
                  aria-expanded={!isPoolCollapsed}
                  aria-controls={isPoolCollapsed ? undefined : "calendar-pool-content"}
                  className="flex h-8 w-8 items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                  onClick={togglePool}
                >
                  {isPoolCollapsed ? (
                    <PanelLeftOpen className="h-4 w-4" />
                  ) : (
                    <PanelLeftClose className="h-4 w-4" />
                  )}
                </button>
              </div>

              <AnimatePresence>
                {!isPoolCollapsed && (
                  <div
                    id="calendar-pool-content"
                    className="flex min-h-0 flex-1 flex-col"
                  >
                    <div
                      className={cn(
                        "min-h-0 border-b border-border transition-colors",
                        overTargetId === "calendar-unschedule:nodes" && "bg-accent/60",
                      )}
                      style={{
                        flex: "0 0 calc(var(--calendar-node-pool-ratio) * 100%)",
                      }}
                    >
                      <NodePool />
                    </div>
                    <div
                      className={cn(
                        "min-h-0 flex-1 transition-colors",
                        overTargetId === "calendar-unschedule:items" && "bg-accent/60",
                      )}
                    >
                      <ItemsPool />
                    </div>
                  </div>
                )}
              </AnimatePresence>

              {isPoolCollapsed && (
                <div className="flex flex-1 items-start justify-center pt-4">
                  <span
                    className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40"
                    style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                  >
                    POOL
                  </span>
                </div>
              )}
            </motion.aside>

            <section className="min-w-0 flex-1 overflow-hidden">{children}</section>
          </div>
        </DndContext>

        <DeadlineConflictModal
          open={conflictState.open}
          parentDeadline={conflictState.parentDeadline}
          parentDeadlineAllDay={conflictState.parentDeadlineAllDay}
          onKeepChild={handleConflictKeepChild}
          onUpdateParent={handleConflictUpdateParent}
        />
      </main>
      <CreateNodeDialog
        open={isNodeDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCreateError(undefined);
            setIsNodeDialogOpen(false);
          }
        }}
        level={0}
        error={createError}
        onSubmit={handleCalendarNodeSubmit}
      />
      <CreateBitDialog
        open={isBitDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setBitCreateError(undefined);
            setIsBitDialogOpen(false);
          }
        }}
        requireParent={true}
        defaultParentId={defaultParentId}
        error={bitCreateError}
        onSubmit={handleCalendarBitSubmit}
      />
    </div>
  );
}
