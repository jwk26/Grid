"use client";

import { createElement } from "react";
import { format } from "date-fns";
import { Archive, Check, ListTodo, RotateCcw } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  type ArchiveGroup as ArchiveGroupData,
  type ArchiveItem,
} from "@/hooks/use-archive";
import { PendingLoader } from "@/components/feedback/pending-loader";
import { PENDING_SENTENCE } from "@/lib/copy/feedback";
import { motionDuration, motionSpring } from "@/lib/animations/motion-language";
import { NODE_ICON_MAP } from "@/lib/constants/node-icons";
import { cn } from "@/lib/utils";

function formatArchivedDate(archivedAt: number): string {
  return format(archivedAt, "MMM d, yyyy");
}

function getIcon(iconName: string | undefined) {
  if (!iconName) {
    return ListTodo;
  }

  return NODE_ICON_MAP[iconName] ?? ListTodo;
}

function GroupHeader({ group }: { group: ArchiveGroupData }) {
  const ParentIcon =
    group.parentNodeId === null
      ? Archive
      : NODE_ICON_MAP[group.parentNodeIcon ?? "Folder"] ?? NODE_ICON_MAP.Folder;

  return (
    <div className="bg-transparent">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <ParentIcon
          aria-hidden="true"
          className="h-[18px] w-[18px] flex-shrink-0 opacity-75 saturate-[70%]"
          style={
            group.parentNodeColor ? { color: group.parentNodeColor } : undefined
          }
        />
        <span className="truncate">{group.parentNodeTitle}</span>
      </div>
      <div className="mt-1 mb-3 h-[1px] w-full bg-border/80" />
    </div>
  );
}

function RestoreButton({
  isRestoring,
  onRestore,
}: {
  isRestoring: boolean;
  onRestore: () => void;
}) {
  return (
    <button
      aria-label="Restore"
      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 focus-visible:opacity-100 aria-busy:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed motion-reduce:transition-none"
      aria-busy={isRestoring}
      disabled={isRestoring}
      onClick={onRestore}
      type="button"
    >
      <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
      <PendingLoader busy={isRestoring} sentence={PENDING_SENTENCE.restore} />
    </button>
  );
}

function ItemRow({
  isLast,
  item,
  onUnarchive,
  restoringIds,
}: {
  isLast: boolean;
  item: ArchiveItem;
  onUnarchive: (type: "node" | "bit", id: string) => Promise<void>;
  restoringIds: Set<string>;
}) {
  const isBit = item.type === "bit";

  return (
    <div
      aria-label={`${item.title}, archived ${formatArchivedDate(item.archivedAt)}`}
      className={cn(
        "group flex h-12 items-center gap-3 outline-none transition-colors duration-150 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring/40 motion-reduce:transition-none",
        !isLast && "border-b border-border/50",
        isBit && "pl-3",
      )}
      tabIndex={0}
    >
      {isBit ? (
        <>
          <span
            aria-hidden="true"
            className="w-[3px] self-stretch rounded-sm opacity-75 saturate-[70%]"
            style={{ backgroundColor: item.color ?? "hsl(var(--border))" }}
          />
          {createElement(getIcon(item.icon), {
            "aria-hidden": true,
            className: "h-4 w-4 flex-shrink-0 text-muted-foreground/80",
          })}
        </>
      ) : (
        <span className="flex-shrink-0 rounded-sm border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-secondary-foreground">
          NODE
        </span>
      )}

      {item.isCompleted ? (
        <Check
          aria-hidden="true"
          className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/50"
        />
      ) : null}

      <span
        className={cn(
          "min-w-0 flex-1 truncate text-sm font-medium text-foreground",
          item.isCompleted && "text-muted-foreground/60 line-through",
        )}
      >
        {item.title}
      </span>
      <time
        className="flex-shrink-0 font-mono text-xs tabular-nums text-muted-foreground/70"
        dateTime={new Date(item.archivedAt).toISOString()}
      >
        {formatArchivedDate(item.archivedAt)}
      </time>
      <RestoreButton
        isRestoring={restoringIds.has(item.id)}
        onRestore={() => void onUnarchive(item.type, item.id)}
      />
    </div>
  );
}

export function ArchiveGroup({
  group,
  onUnarchive,
  restoringIds,
}: {
  group: ArchiveGroupData;
  onUnarchive: (type: "node" | "bit", id: string) => Promise<void>;
  restoringIds: Set<string>;
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="bg-transparent">
      <GroupHeader group={group} />
      <div>
        <AnimatePresence initial={false}>
          {group.items.map((item, index) => (
            <motion.div
              key={`${item.type}:${item.id}`}
              animate={shouldReduceMotion ? undefined : { opacity: 1, scale: 1 }}
              exit={
                shouldReduceMotion
                  ? undefined
                  : {
                      opacity: 0,
                      scale: 0.95,
                      transition: {
                        duration: motionDuration.affordance,
                        ease: "easeOut",
                      },
                    }
              }
              initial={false}
              layout={shouldReduceMotion ? false : "position"}
              transition={shouldReduceMotion ? undefined : motionSpring.gridSnap}
            >
              <ItemRow
                isLast={index === group.items.length - 1}
                item={item}
                onUnarchive={onUnarchive}
                restoringIds={restoringIds}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
