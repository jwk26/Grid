"use client";

import { useDndContext, useDraggable, useDroppable } from "@dnd-kit/core";
import { AnimatePresence, motion } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { BitCard } from "@/components/grid/bit-card";
import { GridCell } from "@/components/grid/grid-cell";
import { NodeCard } from "@/components/grid/node-card";
import { creationVariants } from "@/lib/animations/grid";
import { GRID_COLS, GRID_ROWS } from "@/lib/constants";
import { getGridCellDropId, getGridNodeDropId, isGridBreadcrumbDropId } from "@/lib/grid-dnd";
import { cn } from "@/lib/utils";
import { useGridData } from "@/hooks/use-grid-data";
import { useEditModeStore } from "@/stores/edit-mode-store";
import type { Bit, Node } from "@/types";

type GridItem = Node | Bit;

const levelOpacityMap: Record<number, string> = {
  0: "0.15",
  1: "0.12",
  2: "0.08",
  3: "0.05",
};

function isNodeItem(item: GridItem): item is Node {
  return "level" in item;
}

function toTranslateStyle(transform: { x: number; y: number } | null | undefined) {
  if (!transform) {
    return undefined;
  }

  return { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` };
}

function GridDropCell({
  borderOpacity,
  children,
  isEditMode,
  isEmpty,
  onAddClick,
  parentId,
  x,
  y,
}: {
  borderOpacity: string;
  children: ReactNode;
  isEditMode: boolean;
  isEmpty: boolean;
  onAddClick?: () => void;
  parentId: string | null;
  x: number;
  y: number;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: getGridCellDropId(parentId, x, y),
    data: { kind: "grid-cell", parentId, x, y },
  });

  return (
    <div
      ref={setNodeRef}
      className="grid-cell-container h-full rounded-md"
    >
      <GridCell
        borderOpacity={borderOpacity}
        isDragOver={isOver}
        isEditMode={isEditMode}
        isEmpty={isEmpty}
        onAddClick={onAddClick}
        x={x}
        y={y}
      >
        {children}
      </GridCell>
    </div>
  );
}

function DraggableNodeCard({
  isEditMode,
  node,
  onClick,
  onDelete,
}: {
  isEditMode: boolean;
  node: Node;
  onClick: () => void;
  onDelete?: () => void;
}) {
  const { attributes, isDragging, listeners, setNodeRef: setDragNodeRef, transform } = useDraggable({
    id: `draggable-${node.id}`,
    data: {
      id: node.id,
      type: "node",
      parentId: node.parentId ?? undefined,
      title: node.title,
    },
  });
  const { setNodeRef: setDropNodeRef } = useDroppable({
    id: getGridNodeDropId(node.id),
    data: {
      kind: "grid-node-drop",
      targetNodeId: node.id,
      targetNodeTitle: node.title,
    },
  });

  const setNodeRef = (element: HTMLDivElement | null) => {
    setDragNodeRef(element);
    setDropNodeRef(element);
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "h-full cursor-grab rounded-xl active:cursor-grabbing",
      )}
      data-grid-item="true"
      data-drag-active={isDragging ? "true" : undefined}
      style={toTranslateStyle(transform)}
      {...attributes}
      {...listeners}
    >
      <NodeCard
        isEditMode={isEditMode}
        isDragging={isDragging}
        node={node}
        onClick={onClick}
        onDelete={onDelete}
      />
    </div>
  );
}

function DraggableBitCard({
  bit,
  onClick,
  onDelete,
  parentColor,
}: {
  bit: Bit;
  onClick: () => void;
  onDelete?: () => void;
  parentColor: string;
}) {
  const { attributes, isDragging, listeners, setNodeRef, transform } = useDraggable({
    id: `draggable-${bit.id}`,
    data: {
      id: bit.id,
      type: "bit",
      parentId: bit.parentId ?? undefined,
      title: bit.title,
    },
  });

  return (
    <div className="flex h-full items-center overflow-visible">
      <BitCard
        {...attributes}
        {...listeners}
        bit={bit}
        chunkStats={{ completed: 0, total: 0 }}
        data-drag-active={isDragging ? "true" : undefined}
        data-grid-item="true"
        isDragging={isDragging}
        onClick={onClick}
        onDelete={onDelete}
        parentColor={parentColor}
        ref={setNodeRef}
        style={toTranslateStyle(transform)}
      />
    </div>
  );
}

export function GridView({
  parentId,
  level,
  parentColor = "hsl(221, 83%, 53%)",
  onAddAtCell,
  onDelete,
  onNodeEditClick,
}: {
  parentId: string | null;
  level: number;
  parentColor?: string;
  onAddAtCell?: (x: number, y: number) => void;
  onDelete?: (item: { id: string; type: "node" | "bit"; title: string }) => void;
  onNodeEditClick?: (node: Node) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { nodes, bits } = useGridData(parentId);
  const isEditMode = useEditModeStore((state) => state.isEditMode);
  const { active, over } = useDndContext();
  // A Bit over Home is refused, so the grid is not marked for it either.
  const bitOverHome =
    (active?.data?.current as { type?: string } | undefined)?.type === "bit" &&
    (over?.data?.current as { targetNodeId?: string | null } | undefined)?.targetNodeId === null;
  const isOverBreadcrumb = isGridBreadcrumbDropId(over?.id) && !bitOverHome;
  const itemsByPosition = new Map<string, GridItem>();
  const borderOpacity = levelOpacityMap[level] ?? levelOpacityMap[3];

  for (const item of nodes) {
    itemsByPosition.set(`${item.x},${item.y}`, item);
  }

  for (const item of bits) {
    itemsByPosition.set(`${item.x},${item.y}`, item);
  }

  return (
    <div
      className="relative h-full w-full"
      data-dragging={active ? "true" : undefined}
      data-over-breadcrumb={active && isOverBreadcrumb ? "true" : undefined}
      style={{ backgroundColor: `hsl(var(--grid-bg-l${Math.min(level, 3)}))` }}
    >
      <div
        className="grid h-full w-full gap-[var(--grid-gap)]"
        data-level={level}
        style={{
          gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${GRID_ROWS}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: GRID_ROWS }, (_, y) =>
          Array.from({ length: GRID_COLS }, (_, x) => {
            const positionKey = `${x},${y}`;
            const item = itemsByPosition.get(positionKey);
            const content = (
              <AnimatePresence initial={false}>
                {item !== undefined && isNodeItem(item) ? (
                  <motion.div
                    key={item.id}
                    animate="animate"
                    className="h-full"
                    exit="exit"
                    initial="initial"
                    variants={creationVariants}
                  >
                    <DraggableNodeCard
                      isEditMode={isEditMode}
                      node={item}
                      onClick={
                        isEditMode && onNodeEditClick
                          ? () => onNodeEditClick(item)
                          : () => router.push(`/grid/${item.id}`)
                      }
                      onDelete={() =>
                        onDelete?.({ id: item.id, type: "node", title: item.title })
                      }
                    />
                  </motion.div>
                ) : null}
                {item !== undefined && !isNodeItem(item) ? (
                  <motion.div
                    key={item.id}
                    animate="animate"
                    className="h-full"
                    exit="exit"
                    initial="initial"
                    variants={creationVariants}
                  >
                    <DraggableBitCard
                      bit={item}
                      onClick={() => router.push(`${pathname}?bit=${item.id}`)}
                      onDelete={() =>
                        onDelete?.({ id: item.id, type: "bit", title: item.title })
                      }
                      parentColor={parentColor}
                    />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            );

            return (
              <GridDropCell
                key={positionKey}
                borderOpacity={borderOpacity}
                isEditMode={isEditMode}
                isEmpty={item === undefined}
                onAddClick={onAddAtCell ? () => onAddAtCell(x, y) : undefined}
                parentId={parentId}
                x={x}
                y={y}
              >
                {content}
              </GridDropCell>
            );
          }),
        )}
      </div>
    </div>
  );
}
