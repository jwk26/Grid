"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ArrowUpDown, Trash2 } from "lucide-react";
import { ChunkItem } from "@/components/bit-detail/chunk-item";
import { useChunkActions } from "@/hooks/use-chunk-actions";
import type { Chunk } from "@/types";

type ChunkPoolProps = {
  chunks: Chunk[];
  bitId: string;
};

export type ChunkPoolHandle = {
  startAdding: () => void;
};

export const ChunkPool = forwardRef<ChunkPoolHandle, ChunkPoolProps>(
  function ChunkPool({ chunks, bitId }, ref) {
    const { createChunk, updateChunk, reorderChunks, deleteChunk } = useChunkActions();
    const sensors = useSensors(
      useSensor(PointerSensor),
      useSensor(KeyboardSensor, {
        coordinateGetter: sortableKeyboardCoordinates,
      }),
    );
    const [isAdding, setIsAdding] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    const isSubmittingRef = useRef(false);
    const isComposingRef = useRef(false);

    const allChunks = chunks.slice().sort((a, b) => a.order - b.order);

    function startAdding() {
      if (isAdding) return;
      setIsAdding(true);
    }

    useEffect(() => {
      if (!isAdding) return;
      inputRef.current?.focus();
    }, [isAdding]);

    const composerRowProps =
      allChunks.length === 0 && !isAdding
        ? {
            role: "button" as const,
            tabIndex: 0,
            className:
              "flex cursor-pointer items-start gap-3 focus:outline-none",
            onClick: startAdding,
            onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                startAdding();
              }
            },
          }
        : {
            className: "flex items-start gap-3",
          };

    useImperativeHandle(
      ref,
      () => ({
        startAdding,
      }),
      [isAdding],
    );

    async function handleAdd() {
      if (isSubmittingRef.current) return;
      const trimmed = newTitle.trim();
      if (!trimmed) {
        setIsAdding(false);
        setNewTitle("");
        return;
      }
      isSubmittingRef.current = true;
      try {
        await createChunk({
          title: trimmed,
          description: "",
          time: null,
          timeAllDay: false,
          order: chunks.length,
          parentId: bitId,
        });
        setNewTitle("");
        setIsAdding(false);
      } finally {
        isSubmittingRef.current = false;
      }
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
      if (event.key === "Enter") {
        if (isComposingRef.current || event.nativeEvent.isComposing) return;
        void handleAdd();
        return;
      }

      if (event.key === "Escape") {
        setNewTitle("");
        setIsAdding(false);
      }
    }

    async function handleToggle(chunk: Chunk) {
      await updateChunk(chunk.id, {
        status: chunk.status === "complete" ? "incomplete" : "complete",
      });
    }

    async function handleEdit(chunkId: string, title: string) {
      await updateChunk(chunkId, { title });
    }

    async function handleDelete(chunkId: string) {
      await deleteChunk(chunkId);
    }

    async function handleDragEnd(event: DragEndEvent) {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const ids = allChunks.map((chunk) => chunk.id);
      const oldIndex = ids.indexOf(active.id as string);
      const newIndex = ids.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(allChunks, oldIndex, newIndex);
      try {
        await reorderChunks(
          bitId,
          reordered.map((chunk) => chunk.id),
        );
      } catch {
        // The list no longer matches the Bit's Chunks (another tab added or removed one): nothing
        // was written, and the live list shows the current order.
      }
    }

    return (
      <div className="flex flex-col">
        {allChunks.length === 0 ? (
          <div data-testid="step-composer-row" {...composerRowProps}>
            <div className="flex w-4 flex-col items-center">
              <div className="mt-1 h-3.5 w-3.5 flex-shrink-0 rounded-full border-2 border-muted-foreground/40" />
            </div>
            <div className="min-w-0 flex-1 pb-5">
              {isAdding ? (
                <input
                  ref={inputRef}
                  className="block h-[17px] w-full appearance-none border-none bg-transparent p-0 m-0 text-[13px] font-medium leading-[17px] text-foreground outline-none ring-0 shadow-none placeholder:text-muted-foreground focus:outline-none focus:ring-0 focus:border-none"
                  maxLength={200}
                  onBlur={() => void handleAdd()}
                  onChange={(event) => setNewTitle(event.target.value)}
                  onCompositionEnd={() => {
                    isComposingRef.current = false;
                  }}
                  onCompositionStart={() => {
                    isComposingRef.current = true;
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Step name..."
                  type="text"
                  value={newTitle}
                />
              ) : (
                <p className="h-[17px] text-[13px] font-medium leading-[17px] text-muted-foreground">
                  Add a step...
                </p>
              )}
            </div>
            <div
              data-testid="step-composer-actions"
              className="flex flex-shrink-0 items-start gap-0.5 pt-0.5 pb-5"
            >
              <span
                aria-hidden="true"
                className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/50"
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
              </span>
              <span
                aria-hidden="true"
                className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        ) : null}
        {allChunks.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={allChunks.map((chunk) => chunk.id)}
              strategy={verticalListSortingStrategy}
            >
              {allChunks.map((chunk, index) => (
                <ChunkItem
                  key={chunk.id}
                  chunk={chunk}
                  isDraggable={true}
                  showConnector={index < allChunks.length - 1}
                  onToggle={handleToggle}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </SortableContext>
          </DndContext>
        ) : null}

        {isAdding && allChunks.length > 0 ? (
          <div className="flex items-start gap-3 pb-5">
            <div className="flex w-4 flex-col items-center">
              <div className="mt-1 h-3.5 w-3.5 flex-shrink-0 rounded-full border-2 border-muted-foreground/30 bg-transparent" />
            </div>
            <div className="min-w-0 flex-1 pb-5">
              <input
                ref={inputRef}
                className="block h-[17px] w-full appearance-none border-none bg-transparent p-0 m-0 text-[13px] font-medium leading-[17px] text-foreground outline-none ring-0 shadow-none placeholder:text-muted-foreground focus:outline-none focus:ring-0 focus:border-none"
                maxLength={200}
                onBlur={() => void handleAdd()}
                onChange={(event) => setNewTitle(event.target.value)}
                onCompositionEnd={() => {
                  isComposingRef.current = false;
                }}
                onCompositionStart={() => {
                  isComposingRef.current = true;
                }}
                onKeyDown={handleKeyDown}
                placeholder="Step name..."
                type="text"
                value={newTitle}
              />
            </div>
            <div
              data-testid="step-composer-actions"
              className="flex flex-shrink-0 items-start gap-0.5 pt-0.5 pb-5"
            >
              <span
                aria-hidden="true"
                className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/50"
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
              </span>
              <span
                aria-hidden="true"
                className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        ) : null}
      </div>
    );
  },
);

ChunkPool.displayName = "ChunkPool";
