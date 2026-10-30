"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { format } from "date-fns";
import {
  ArrowUpCircle,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";
import {
  ChunkPool,
  type ChunkPoolHandle,
} from "@/components/bit-detail/chunk-pool";
import { DateFirstDeadlinePicker } from "@/components/shared/date-first-deadline-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DeadlineConflictModal } from "@/components/shared/deadline-conflict-modal";
import { useBitDetailActions } from "@/hooks/use-bit-detail-actions";
import { useBitDetail } from "@/hooks/use-bit-detail";
import { bitDetailPopupVariants } from "@/lib/animations/layout";
import { NODE_TITLE_MAX_LENGTH } from "@/lib/constants";
import { NODE_ICON_MAP, NODE_ICON_NAMES } from "@/lib/constants/node-icons";
import { cn } from "@/lib/utils";
import type { Bit } from "@/types";
import { PendingLoader } from "@/components/feedback/pending-loader";
import { usePendingAction } from "@/hooks/use-pending-action";
import { PENDING_SENTENCE } from "@/lib/copy/feedback";
import { dropReportedFailure } from "@/lib/db/write-failure";

type Priority = Bit["priority"];
const PRIORITY_CYCLE: Priority[] = ["high", "mid", "low", null];
const PRIORITY_LABELS: Record<NonNullable<Priority>, string> = {
  high: "High",
  mid: "Mid",
  low: "Low",
};
const RING_RADIUS = 16;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

type PendingDeadlineConflict = {
  deadline: number;
  deadlineAllDay: boolean;
};

function nextPriority(current: Priority): Priority {
  const idx = PRIORITY_CYCLE.indexOf(current);
  return PRIORITY_CYCLE[(idx + 1) % PRIORITY_CYCLE.length];
}

function ParentDeadlineRow({
  deadline,
  deadlineAllDay,
}: {
  deadline: number;
  deadlineAllDay: boolean;
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const dateStr = format(
    new Date(deadline),
    new Date(deadline).getFullYear() === new Date().getFullYear()
      ? deadlineAllDay
        ? "MMM d"
        : "MMM d, h:mm a"
      : deadlineAllDay
        ? "MMM d, yyyy"
        : "MMM d, yyyy, h:mm a",
  );

  return (
    <div
      data-testid="parent-deadline"
      className="flex items-center gap-3 pt-1 pb-5"
      onMouseMove={(e) => setPos({ x: e.clientX, y: e.clientY })}
      onMouseLeave={() => setPos(null)}
    >
      <Calendar className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/70" />
      <span className="text-sm font-medium text-muted-foreground/80">{dateStr}</span>
      {pos !== null && (
        <div
          className="pointer-events-none fixed z-50 whitespace-nowrap rounded-md bg-muted px-2.5 py-1 text-xs text-muted-foreground shadow-sm"
          style={{ top: pos.y - 36, left: pos.x + 8 }}
        >
          Bit deadline cannot exceed node deadline
        </div>
      )}
    </div>
  );
}

export function BitDetailPopup() {
  const { updateBit, softDeleteBit, promoteBitToNode } = useBitDetailActions();
  const promoteAction = usePendingAction();
  const { bit, chunks, parentNode, isOpen, close } = useBitDetail();
  const [localTitle, setLocalTitle] = useState("");
  const [localDescription, setLocalDescription] = useState("");
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [pendingDeadlineConflict, setPendingDeadlineConflict] =
    useState<PendingDeadlineConflict | null>(null);
  const chunkPoolRef = useRef<ChunkPoolHandle>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!bit) return;
    setLocalTitle(bit.title);
    setLocalDescription(bit.description);
    setIsDescriptionOpen(!!bit.description);
    setPendingDeadlineConflict(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bit?.id]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !iconPickerOpen) close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, close, iconPickerOpen]);

  if (!isOpen) return null;

  function isDeadlineConflictError(
    error: unknown,
  ): error is Error & { conflictType: "child_exceeds_parent" } {
    return error instanceof Error && error.name === "DeadlineConflictError";
  }

  async function attemptDeadlineUpdate(deadline: number | null, deadlineAllDay: boolean) {
    if (!bit) return;

    try {
      await updateBit(bit.id, { deadline, deadlineAllDay }, { conflictDialog: true });
    } catch (error) {
      if (deadline !== null && parentNode && isDeadlineConflictError(error)) {
        setPendingDeadlineConflict({ deadline, deadlineAllDay });
        return;
      }

      // Anything else was reported by the store (the previous deadline is back).
      dropReportedFailure(error);
    }
  }

  async function handleTitleBlur() {
    if (!bit) return;
    const trimmed = localTitle.trim();
    if (!trimmed) {
      setLocalTitle(bit.title);
      return;
    }
    if (trimmed !== bit.title) {
      await updateBit(bit.id, { title: trimmed }).catch(dropReportedFailure);
    }
  }

  async function handleDescriptionBlur() {
    if (!bit) return;
    if (localDescription !== bit.description) {
      await updateBit(bit.id, { description: localDescription }).catch(dropReportedFailure);
    }
    if (!localDescription.trim()) {
      setIsDescriptionOpen(false);
    }
  }

  async function handlePriorityToggle() {
    if (!bit) return;
    await updateBit(bit.id, { priority: nextPriority(bit.priority) }).catch(dropReportedFailure);
  }

  async function handleIconSelect(iconName: string) {
    if (!bit) return;
    setIconPickerOpen(false);
    if (iconName !== bit.icon) {
      await updateBit(bit.id, { icon: iconName }).catch(dropReportedFailure);
    }
  }

  async function handleDeadlineConflictUpdateParent() {
    if (!bit || !parentNode || !pendingDeadlineConflict) return;

    try {
      await updateBit(
        bit.id,
        {
          deadline: pendingDeadlineConflict.deadline,
          deadlineAllDay: pendingDeadlineConflict.deadlineAllDay,
        },
        { extendParent: true },
      );
      setPendingDeadlineConflict(null);
    } catch (error) {
      // The store reported the refused extension; the conflict dialog stays open.
      dropReportedFailure(error);
    }
  }

  async function handleMoveToTrash() {
    if (!bit) return;
    // The Bit hides at once (SPEC Write feel, group 2), so the popup closes before the answer
    // instead of showing "Loading…" for the round trip.
    const trashed = softDeleteBit(bit.id).catch(dropReportedFailure);
    close();
    await trashed;
  }

  async function handleStatusToggle() {
    if (!bit) return;
    await updateBit(bit.id, {
      status: bit.status === "complete" ? "active" : "complete",
    }).catch(dropReportedFailure);
  }

  async function handlePromoteToNode() {
    if (!bit) return;
    let promoted = false;
    await promoteAction.run(async () => {
      await promoteBitToNode(bit.id);
      promoted = true;
    });
    if (promoted) close();
  }

  const Icon = bit ? (NODE_ICON_MAP[bit.icon] ?? NODE_ICON_MAP.Box) : null;
  const hasChunks = chunks.length > 0;
  const canPromote =
    hasChunks &&
    bit !== null &&
    bit.title.length <= NODE_TITLE_MAX_LENGTH &&
    parentNode !== null &&
    parentNode.systemRole !== "inbox" &&
    parentNode.level < 2;
  // H21: a Scratch is trashed only through Pool Trash or the Retro Mac [X].
  const canMoveToTrash = parentNode?.systemRole !== "inbox";
  const completedCount = chunks.filter(
    (chunk) => chunk.status === "complete",
  ).length;
  const totalCount = chunks.length;
  const ringRatio = totalCount > 0 ? completedCount / totalCount : 0;
  const ringOffset = RING_CIRCUMFERENCE * (1 - ringRatio);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          aria-hidden="true"
          className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={close}
        />
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={bit?.title ?? "Bit detail"}
          className="relative z-10 flex w-full max-w-bit-detail flex-col overflow-hidden rounded-xl border border-border bg-popover shadow-xl"
          style={{ maxHeight: "85vh" }}
          variants={bitDetailPopupVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {bit ? (
            <ScrollArea className="flex-1">
              <div className="flex flex-col">
                <div className="flex items-center gap-3 px-5 pt-5 pb-0">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Popover
                      open={iconPickerOpen}
                      onOpenChange={setIconPickerOpen}
                    >
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          aria-label="Change icon"
                          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-input bg-background text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                        >
                          {Icon ? <Icon className="h-5 w-5" /> : null}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-2" align="start">
                        <div className="max-h-[200px] overflow-y-auto pr-1">
                          <div className="grid grid-cols-7 gap-1.5">
                            {NODE_ICON_NAMES.map((name) => {
                              const PickerIcon = NODE_ICON_MAP[name];
                              return (
                                <button
                                  key={name}
                                  type="button"
                                  aria-label={name}
                                  title={name}
                                  className={cn(
                                    "flex size-10 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground",
                                    bit.icon === name &&
                                      "border-transparent ring-2 ring-primary ring-offset-1",
                                  )}
                                  onClick={() => handleIconSelect(name)}
                                >
                                  <PickerIcon className="h-4 w-4" />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <input
                      aria-label="Bit title"
                      className="min-w-0 flex-1 truncate bg-transparent text-lg font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none"
                      maxLength={200}
                      onBlur={handleTitleBlur}
                      onChange={(event) => setLocalTitle(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.currentTarget.blur();
                        }
                      }}
                      placeholder="Untitled"
                      type="text"
                      value={localTitle}
                    />
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-1">
                    <button
                      type="button"
                      aria-label={
                        bit.status === "complete"
                          ? "Mark as active"
                          : "Mark as complete"
                      }
                      onClick={handleStatusToggle}
                      className={cn(
                        "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md transition-colors",
                        bit.status === "complete"
                          ? "text-primary hover:bg-accent"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                    >
                      {bit.status === "complete" ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Circle className="h-4 w-4" />
                      )}
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          aria-label="More options"
                          aria-busy={promoteAction.busy}
                          disabled={promoteAction.busy}
                          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <PendingLoader busy={promoteAction.busy} sentence={PENDING_SENTENCE.promote} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canPromote ? (
                          <>
                            <DropdownMenuItem onClick={handlePromoteToNode}>
                              <ArrowUpCircle className="mr-2 h-4 w-4" />
                              Promote to Node
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        ) : null}
                        {canMoveToTrash ? (
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={handleMoveToTrash}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Move to trash
                          </DropdownMenuItem>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 px-5 pt-3 pb-0">
                  <button
                    type="button"
                    aria-label={`Priority: ${bit.priority ?? "none"}. Click to cycle.`}
                    onClick={handlePriorityToggle}
                    className={cn(
                      "rounded-full px-[7px] py-[2px] text-[10px] font-semibold uppercase tracking-[0.05em] transition-colors",
                      bit.priority === "high" &&
                        "bg-priority-high-bg text-priority-high",
                      bit.priority === "mid" &&
                        "bg-priority-mid-bg text-priority-mid",
                      bit.priority === "low" &&
                        "bg-priority-low-bg text-priority-low",
                      !bit.priority &&
                        "bg-secondary text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {bit.priority ? PRIORITY_LABELS[bit.priority] : "—"}
                  </button>

                  <DateFirstDeadlinePicker
                    value={{ deadline: bit.deadline, deadlineAllDay: bit.deadlineAllDay }}
                    onChange={(value) =>
                      void attemptDeadlineUpdate(value.deadline, value.deadlineAllDay)}
                    onClear={() => void attemptDeadlineUpdate(null, false)}
                  />
                </div>

                <div className="px-5 pt-3">
                  <div
                    data-testid="description-shell"
                    className="relative min-h-[60px]"
                  >
                    {isDescriptionOpen ? (
                      <textarea
                        ref={descriptionRef}
                        aria-label="Description"
                        className="absolute inset-0 block min-h-[60px] w-full appearance-none resize-none border-0 bg-transparent p-0 text-sm leading-5 text-foreground placeholder:text-muted-foreground focus:outline-none"
                        onBlur={() => void handleDescriptionBlur()}
                        onChange={(event) =>
                          setLocalDescription(event.target.value)
                        }
                        placeholder="Add a description"
                        value={localDescription}
                      />
                    ) : (
                      <button
                        type="button"
                        className="absolute inset-0 flex min-h-[60px] w-full cursor-text appearance-none items-start border-0 bg-transparent p-0 text-left text-sm leading-5 text-muted-foreground transition-colors hover:text-foreground"
                        onClick={() => {
                          setIsDescriptionOpen(true);
                          queueMicrotask(() => descriptionRef.current?.focus());
                        }}
                      >
                        Add description
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between px-5 pt-3 pb-0">
                  <button
                    type="button"
                    className="flex items-center gap-1.5 rounded-md pl-0 pr-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    onClick={() => chunkPoolRef.current?.startAdding()}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    New
                  </button>
                  {totalCount > 0 ? (
                    <div
                      aria-label={`${completedCount} of ${totalCount} steps complete`}
                      className="relative h-10 w-10 flex-shrink-0"
                      role="img"
                    >
                      <svg
                        aria-hidden="true"
                        className="-rotate-90 h-full w-full"
                        viewBox="0 0 40 40"
                      >
                        <circle
                          cx="20"
                          cy="20"
                          r={RING_RADIUS}
                          fill="none"
                          stroke="hsl(var(--secondary))"
                          strokeWidth="3"
                        />
                        <circle
                          cx="20"
                          cy="20"
                          r={RING_RADIUS}
                          fill="none"
                          stroke="hsl(var(--primary))"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeDasharray={RING_CIRCUMFERENCE}
                          strokeDashoffset={ringOffset}
                          className="transition-all duration-300"
                        />
                      </svg>
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <span className="text-[10px] leading-none font-medium text-muted-foreground">
                          {Math.round(ringRatio * 100)}%
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="px-5 pt-3">
                  <div>
                    <ChunkPool
                      ref={chunkPoolRef}
                      chunks={chunks}
                      bitId={bit.id}
                    />
                    <div className="flex flex-col gap-2">
                      {bit.deadline ? (
                        <div
                          className={cn(
                            "flex items-center gap-3 pt-1",
                            parentNode?.deadline == null && "pb-5",
                          )}
                        >
                          <Clock className="relative z-10 h-4 w-4 flex-shrink-0 bg-popover text-destructive" />
                          <span className="text-sm text-destructive">
                            {format(
                              new Date(bit.deadline),
                              new Date(bit.deadline).getFullYear() === new Date().getFullYear()
                                ? bit.deadlineAllDay
                                  ? "MMM d"
                                  : "MMM d, h:mm a"
                                : bit.deadlineAllDay
                                  ? "MMM d, yyyy"
                                  : "MMM d, yyyy, h:mm a",
                            )}
                          </span>
                        </div>
                      ) : parentNode?.deadline == null ? (
                        <div className="pb-5" />
                      ) : null}
                      {parentNode?.deadline != null ? (
                        <ParentDeadlineRow
                          deadline={parentNode.deadline}
                          deadlineAllDay={parentNode.deadlineAllDay}
                        />
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          ) : (
            <div className="flex h-32 items-center justify-center">
              <p className="text-sm text-muted-foreground">Loading…</p>
            </div>
          )}
        </motion.div>
        <DeadlineConflictModal
          open={pendingDeadlineConflict !== null}
          parentDeadline={
            parentNode?.deadline ?? pendingDeadlineConflict?.deadline ?? Date.now()
          }
          parentDeadlineAllDay={parentNode?.deadlineAllDay ?? false}
          onKeepChild={() => setPendingDeadlineConflict(null)}
          onUpdateParent={() => void handleDeadlineConflictUpdateParent()}
        />
      </div>
    </AnimatePresence>
  );
}
