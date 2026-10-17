"use client";

import { DndContext, DragOverlay, useDroppable, type Modifier } from "@dnd-kit/core";
import { CircleDot, FileText, Monitor, Trash2, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  ArchiveOperationCard,
  BreakdownPanel,
  type ArchiveOperationProjection,
  type BreakdownCompletionProjection,
  type BreakdownSuccessSignal,
} from "@/components/triage/breakdown-panel";
import { HierarchyExplorer } from "@/components/triage/hierarchy-explorer";
import { ScratchPool } from "@/components/triage/scratch-pool";
import { ScratchTrashDialog } from "@/components/triage/scratch-trash-dialog";
import { TriageDragToken } from "@/components/triage/triage-drag-token";
import {
  StagingAlertBand,
  StagingZone,
  StagingSubsection,
  type StagingOperationView,
  type StagingZoneProjection,
} from "@/components/triage/staging-zone";
import {
  useTriageDnd,
  type TriageDragItem,
} from "@/hooks/use-dnd";
import { useExternalScratchRemovalData } from "@/hooks/use-external-scratch-removal-data";
import { useScratchLifecycleHandoff } from "@/hooks/use-scratch-lifecycle-handoff";
import { useArchiveScratch } from "@/hooks/use-archive-scratch";
import {
  TrashDraftRegistryContext,
  TrashScratchEntriesContext,
  useTrashScratch,
  useTrashScratchSnapshot,
  type TrashDraftOwner,
  type TrashScratchApplied,
  type TrashScratchEntries,
} from "@/hooks/use-trash-scratch";
import { useCanArchiveScratch } from "@/hooks/use-can-archive-scratch";
import {
  useStagedCandidates,
  type CandidateCommandOutcome,
} from "@/hooks/use-staged-candidates";
import { useInbox } from "@/hooks/use-inbox";
import {
  registerActiveTriageDeparture,
  TriageDepartureContext,
  useTriageDeparture,
} from "@/hooks/use-triage-departure";
import {
  TriageOperationLockContext,
  useTriageOperationLock,
} from "@/hooks/use-triage-operation-lock";
import {
  type TriagePlacementRelease,
  useTriagePlacement,
} from "@/hooks/use-triage-placement";
import { useTriageNewlyPlaced } from "@/hooks/use-triage-newly-placed";
import {
  createScratchTitleBlockerHandle,
  ScratchTitleBlockerContext,
  useScratchBreakdowns,
} from "@/hooks/use-scratch-breakdowns";
import {
  getTriageRemoveDropId,
  type TriageDropData,
} from "@/lib/grid-dnd";
import { INBOX_TRIAGE_COPY } from "@/lib/copy/inbox-triage";
import {
  type StageCandidateCommand,
  type StageCandidateResult,
  type UnstageCandidateCommand,
  type UnstageCandidateResult,
} from "@/lib/db/datastore";
import type { RepositoryOperationStatus } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { useTriagePreferencesStore } from "@/stores/triage-preferences-store";
import { useTriageStore } from "@/stores/triage-store";
import type { ExternalScratchRemovalState } from "@/stores/triage-store";
import type { Node } from "@/types";

function formatStagingHeading(label: string, count: number) {
  return count >= 2 ? `${count} ${label}` : label;
}

function sourceMatchesPlacementRelease(
  source: {
    id: string;
    scratchBitId: string;
    content: string;
    consumedAt: number | null;
    version: number;
  },
  release: TriagePlacementRelease,
) {
  return (
    source.id === release.source.id &&
    source.scratchBitId === release.scratchBitId &&
    source.content === release.source.title &&
    source.consumedAt === null &&
    source.version === release.source.version
  );
}

type StagingAlertKind =
  | "stage-not-applied"
  | "stage-rejected"
  | "stage-conflict"
  | "unstage-not-applied"
  | "unstage-rejected"
  | "unstage-conflict"
  | "invalidated-drag"
  | "invalidated-placement";

type StagingAlertState = Readonly<{
  kind: StagingAlertKind;
  copy: string;
  candidateId: string | null;
  sourceBreakdownId: string | null;
  clearOnCandidateDisappearance: boolean;
}>;

type StagingOperationMeta = Readonly<{
  title: string;
  resultType: "node" | "bit";
  candidateId: string;
  sourceBreakdownId: string;
}>;

type UnstageSuccessProjection = Readonly<{
  kind: "unstage";
  operationId: string;
  sourceBreakdownId: string;
}>;

function stagingTemplate(template: string, title: string): string {
  return template.replace("{title}", title);
}

function stagingTerminalAlert(
  kind: "stage" | "unstage",
  status: RepositoryOperationStatus,
  meta: StagingOperationMeta,
): StagingAlertState | null {
  if (status === "applied" || status === "already_applied") return null;
  const suffix =
    status === "not_applied"
      ? "NotApplied"
      : status === "rejected"
        ? "Rejected"
        : status === "conflict"
          ? "Conflict"
          : null;
  if (suffix === null) return null;
  const key = `${kind}${suffix}` as keyof typeof INBOX_TRIAGE_COPY.stagingStatus.alert;
  return {
    kind: `${kind}-${status.replace("_", "-")}` as StagingAlertKind,
    copy: stagingTemplate(INBOX_TRIAGE_COPY.stagingStatus.alert[key], meta.title),
    candidateId: meta.candidateId,
    sourceBreakdownId: meta.sourceBreakdownId,
    clearOnCandidateDisappearance: kind === "unstage",
  };
}

function stagingOperationSentence(operation: StagingOperationView): string {
  const suffix =
    operation.phase === "pending"
      ? "Pending"
      : operation.phase === "unknown"
        ? "Unknown"
        : "Reconciling";
  const key = `${operation.kind}${suffix}` as keyof typeof INBOX_TRIAGE_COPY.stagingStatus.operation;
  return stagingTemplate(
    INBOX_TRIAGE_COPY.stagingStatus.operation[key],
    operation.title,
  );
}

type ExternalRemovalDraft = Readonly<{
  id: string;
  label: string;
  value: string;
}>;

function collectExternalRemovalDrafts(root: HTMLElement | null): ExternalRemovalDraft[] {
  if (root === null) return [];
  const drafts: ExternalRemovalDraft[] = [];
  const addField = root.querySelector<HTMLInputElement>(
    'input[data-triage-role="breakdown-add-field"]',
  );
  if (addField?.value) {
    drafts.push({
      id: "add",
      label: INBOX_TRIAGE_COPY.externalRemoval.drafts.add,
      value: addField.value,
    });
  }
  const editorSurfaces = root.querySelectorAll<HTMLElement>(
    '.triage-inline-editor[data-triage-editor-state]:not([data-triage-editor-state="pristine"])',
  );
  let breakdownIndex = 0;
  for (const surface of editorSurfaces) {
    const field = surface.querySelector<HTMLInputElement>(
      '[data-triage-role="inline-editor-field"]',
    );
    const protectedDraft = surface.querySelector<HTMLElement>(
      '[data-triage-role="inline-editor-protected-draft"]',
    );
    const value = field?.value ?? protectedDraft?.textContent ?? "";
    if (value.length === 0) continue;
    const isScratchTitle = surface.closest(
      '[data-testid="selected-scratch-context"]',
    );
    drafts.push({
      id: isScratchTitle ? "scratch-title" : `breakdown-${breakdownIndex++}`,
      label: isScratchTitle
        ? INBOX_TRIAGE_COPY.externalRemoval.drafts.scratchTitle
        : INBOX_TRIAGE_COPY.externalRemoval.drafts.breakdown,
      value,
    });
  }
  return drafts;
}

const EXTERNAL_REMOVAL_DURATION_MS = 5000;

function replaceExternalRemovalTemplate(
  template: string,
  replacements: Readonly<Record<string, string | number>>,
): string {
  return Object.entries(replacements).reduce(
    (copy, [key, value]) => copy.replace(`{${key}}`, String(value)),
    template,
  );
}

function formatExternalRemovalDestination(
  removal: ExternalScratchRemovalState,
  destinationTitle: string | null,
  paused: boolean,
  seconds: number,
): string {
  const copy = INBOX_TRIAGE_COPY.externalRemoval.destination;
  if (removal.destinationKind === "scratch" && destinationTitle !== null) {
    return replaceExternalRemovalTemplate(
      paused ? copy.paused : copy.running,
      { title: destinationTitle, seconds },
    );
  }
  if (removal.destinationKind === "search-empty") {
    return replaceExternalRemovalTemplate(
      paused ? copy.pausedSearchEmpty : copy.runningSearchEmpty,
      { seconds },
    );
  }
  return replaceExternalRemovalTemplate(
    paused ? copy.pausedInboxEmpty : copy.runningInboxEmpty,
    { seconds },
  );
}

function ExternalScratchRemovalTransition({
  destinationTitle,
  drafts,
  onFinish,
  removal,
}: {
  destinationTitle: string | null;
  drafts: ExternalRemovalDraft[];
  onFinish: () => void | Promise<void>;
  removal: ExternalScratchRemovalState;
}) {
  const headingId = useId();
  const descriptionId = `${headingId}-destination`;
  const panelRef = useRef<HTMLDivElement>(null);
  const pauseRef = useRef<HTMLButtonElement>(null);
  const copyRefs = useRef(new Map<string, HTMLButtonElement>());
  const lastFocusedRef = useRef<HTMLButtonElement | null>(null);
  const remainingRef = useRef(EXTERNAL_REMOVAL_DURATION_MS);
  const runningStartedAtRef = useRef<number | null>(null);
  const runningStartRemainingRef = useRef(EXTERNAL_REMOVAL_DURATION_MS);
  const destinationKeyRef = useRef("");
  const finishRef = useRef(false);
  const [remainingMs, setRemainingMs] = useState(EXTERNAL_REMOVAL_DURATION_MS);
  const [paused, setPaused] = useState(drafts.length > 0);
  const pausedRef = useRef(paused);
  const [copiedIds, setCopiedIds] = useState<ReadonlySet<string>>(new Set());
  const destinationKey = `${removal.destinationKind}:${removal.destinationId ?? "none"}`;
  const seconds = Math.max(1, Math.ceil(remainingMs / 1000));
  const message = formatExternalRemovalDestination(
    removal,
    destinationTitle,
    paused,
    seconds,
  );
  const [announcement, setAnnouncement] = useState(message);

  const requestFinish = useCallback(() => {
    if (finishRef.current) return;
    finishRef.current = true;
    void Promise.resolve(onFinish()).catch((error) => {
      finishRef.current = false;
      console.error("external Scratch terminal validation error:", error);
    });
  }, [onFinish]);

  useLayoutEffect(() => {
    const initialFocus =
      drafts.length > 0
        ? copyRefs.current.get(drafts[0]!.id) ?? null
        : pauseRef.current;
    lastFocusedRef.current = initialFocus;
    initialFocus?.focus();
  }, [drafts]);

  useEffect(() => {
    return useTriageStore.subscribe((state, previousState) => {
      const current = state.externalScratchRemoval;
      const previous = previousState.externalScratchRemoval;
      if (
        current?.scratchId !== removal.scratchId ||
        previous?.scratchId !== removal.scratchId ||
        (current.destinationId === previous.destinationId &&
          current.destinationKind === previous.destinationKind) ||
        pausedRef.current
      ) {
        return;
      }
      remainingRef.current = EXTERNAL_REMOVAL_DURATION_MS;
      setRemainingMs(EXTERNAL_REMOVAL_DURATION_MS);
    });
  }, [removal.scratchId]);

  useEffect(() => {
    const containFocus = (event: globalThis.FocusEvent) => {
      if (
        !(event.target instanceof globalThis.Node) ||
        panelRef.current?.contains(event.target)
      ) {
        return;
      }
      (lastFocusedRef.current ?? pauseRef.current)?.focus();
    };
    document.addEventListener("focusin", containFocus);
    return () => document.removeEventListener("focusin", containFocus);
  }, []);

  useEffect(() => {
    if (destinationKeyRef.current === "") {
      destinationKeyRef.current = destinationKey;
      return;
    }
    if (destinationKeyRef.current === destinationKey) return;
    destinationKeyRef.current = destinationKey;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      if (!paused) {
        remainingRef.current = EXTERNAL_REMOVAL_DURATION_MS;
        setRemainingMs(EXTERNAL_REMOVAL_DURATION_MS);
        setAnnouncement(
          formatExternalRemovalDestination(
            removal,
            destinationTitle,
            false,
            5,
          ),
        );
      } else {
        setAnnouncement(
          formatExternalRemovalDestination(
            removal,
            destinationTitle,
            true,
            Math.max(1, Math.ceil(remainingRef.current / 1000)),
          ),
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [destinationKey, destinationTitle, paused, removal]);

  useEffect(() => {
    if (paused) return;
    const startedAt = Date.now();
    const startingRemaining = remainingRef.current;
    runningStartedAtRef.current = startedAt;
    runningStartRemainingRef.current = startingRemaining;
    const timer = window.setInterval(() => {
      const next = Math.max(0, startingRemaining - (Date.now() - startedAt));
      remainingRef.current = next;
      setRemainingMs(next);
      if (next === 0 && !finishRef.current) {
        window.clearInterval(timer);
        requestFinish();
      }
    }, 100);
    return () => {
      window.clearInterval(timer);
      runningStartedAtRef.current = null;
    };
  }, [destinationKey, paused, requestFinish]);

  const handlePause = () => {
    if (!paused && runningStartedAtRef.current !== null) {
      const exactRemaining = Math.max(
        0,
        runningStartRemainingRef.current -
          (Date.now() - runningStartedAtRef.current),
      );
      remainingRef.current = exactRemaining;
      setRemainingMs(exactRemaining);
    }
    const nextPaused = !pausedRef.current;
    pausedRef.current = nextPaused;
    setPaused(nextPaused);
  };

  const handleCopy = async (draft: ExternalRemovalDraft) => {
    try {
      await navigator.clipboard.writeText(draft.value);
      setCopiedIds((current) => new Set(current).add(draft.id));
    } catch {
      // Full selectable text remains available for manual copy.
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = Array.from(
      panelRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? [],
    );
    if (focusable.length === 0) return;
    const currentIndex = focusable.indexOf(document.activeElement as HTMLButtonElement);
    const nextIndex = event.shiftKey
      ? currentIndex <= 0
        ? focusable.length - 1
        : currentIndex - 1
      : currentIndex === focusable.length - 1
        ? 0
        : currentIndex + 1;
    event.preventDefault();
    focusable[nextIndex]?.focus();
  };

  const title =
    INBOX_TRIAGE_COPY.externalRemoval.title[removal.lifecycle ?? "delete"];

  return (
    <div
      className="external-removal-scrim"
      data-triage-role="external-removal-scrim"
      data-triage-state={`external-removal${paused ? " paused" : ""}${drafts.length > 0 ? " draft-copy-ready" : ""}`}
    >
      <div
        ref={panelRef}
        aria-describedby={descriptionId}
        aria-labelledby={headingId}
        aria-modal="true"
        className="external-removal-panel"
        data-triage-role="external-removal-panel"
        role="alertdialog"
        onKeyDown={handleKeyDown}
      >
        <h2
          className="external-removal-panel__title"
          data-triage-role="external-removal-title"
          id={headingId}
        >
          {title}
        </h2>
        <p
          className="external-removal-panel__destination"
          data-triage-role="external-removal-destination"
          id={descriptionId}
        >
          {message}
        </p>
        <div
          className="external-removal-panel__track"
          data-triage-role="external-removal-countdown-track"
        >
          <span
            data-testid="external-removal-countdown-fill"
            data-triage-role="external-removal-countdown-fill"
            style={{
              transform: `scaleX(${remainingMs / EXTERNAL_REMOVAL_DURATION_MS})`,
            }}
          />
        </div>
        <div aria-atomic="true" aria-live="polite" className="sr-only">
          {announcement}
        </div>
        {drafts.length > 0 ? (
          <section className="external-removal-panel__draft-region">
            <h3>{INBOX_TRIAGE_COPY.externalRemoval.drafts.heading}</h3>
            <p>{INBOX_TRIAGE_COPY.externalRemoval.drafts.explanation}</p>
            <div className="external-removal-panel__draft-list">
              {drafts.map((draft) => {
                const copied = copiedIds.has(draft.id);
                return (
                  <article
                    data-triage-role="external-removal-draft-card"
                    data-triage-state={copied ? "copied" : "draft-copy-ready"}
                    key={draft.id}
                  >
                    <h4>{draft.label}</h4>
                    <pre>{draft.value}</pre>
                    <button
                      ref={(element) => {
                        if (element === null) copyRefs.current.delete(draft.id);
                        else copyRefs.current.set(draft.id, element);
                      }}
                      data-triage-role="external-removal-copy-status"
                      type="button"
                      onClick={() => void handleCopy(draft)}
                      onFocus={(event) => {
                        lastFocusedRef.current = event.currentTarget;
                      }}
                    >
                      {copied
                        ? INBOX_TRIAGE_COPY.externalRemoval.drafts.copied
                        : INBOX_TRIAGE_COPY.externalRemoval.drafts.copy}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}
        <div className="external-removal-panel__actions">
          <button
            data-triage-role="external-removal-primary-action"
            type="button"
            onClick={requestFinish}
            onFocus={(event) => {
              lastFocusedRef.current = event.currentTarget;
            }}
          >
            {INBOX_TRIAGE_COPY.externalRemoval.actions.moveNow}
          </button>
          <button
            ref={pauseRef}
            data-triage-role="external-removal-secondary-action"
            type="button"
            onClick={handlePause}
            onFocus={(event) => {
              lastFocusedRef.current = event.currentTarget;
            }}
          >
            {paused
              ? INBOX_TRIAGE_COPY.externalRemoval.actions.resume
              : INBOX_TRIAGE_COPY.externalRemoval.actions.pause}
          </button>
        </div>
      </div>
    </div>
  );
}

// Positions the compact drag token center at the cursor rather than the
// original draggable element's top-left. Without this, grabbing a staged
// Node card or Bit row away from the top-left leaves the token visually
// detached from the pointer (ISSUE-18-10).
const snapDragTokenToCursor: Modifier = ({
  activatorEvent,
  draggingNodeRect,
  overlayNodeRect,
  transform,
}) => {
  if (!draggingNodeRect || !activatorEvent) return transform;

  let clientX: number | undefined;
  let clientY: number | undefined;

  if ("touches" in activatorEvent) {
    const { touches } = activatorEvent as TouchEvent;
    if (touches.length > 0) {
      clientX = touches[0].clientX;
      clientY = touches[0].clientY;
    }
  } else if ("clientX" in activatorEvent) {
    clientX = (activatorEvent as MouseEvent).clientX;
    clientY = (activatorEvent as MouseEvent).clientY;
  }

  if (clientX === undefined || clientY === undefined) return transform;

  const tokenWidth = overlayNodeRect?.width ?? 0;
  const tokenHeight = overlayNodeRect?.height ?? 0;

  return {
    ...transform,
    x: transform.x + clientX - draggingNodeRect.left - tokenWidth / 2,
    y: transform.y + clientY - draggingNodeRect.top - tokenHeight / 2,
  };
};

function TriageRemoveDropTarget({
  activeDragItem,
  overTargetId,
}: {
  activeDragItem: TriageDragItem;
  overTargetId: string | null;
}) {
  const id = getTriageRemoveDropId();
  const dropData = { kind: "triage-remove-drop" } satisfies TriageDropData;
  const { setNodeRef } = useDroppable({
    id,
    data: dropData,
  });
  const isStagedDrag =
    activeDragItem?.kind === "triage-staged-node" ||
    activeDragItem?.kind === "triage-staged-bit";
  const isOver = overTargetId === id && activeDragItem?.integrity !== "invalidated";

  if (!isStagedDrag) return null;

  return (
    <div
      ref={setNodeRef}
      aria-label="Drop staged item here to remove from staging"
      data-triage-role="staging-unstage-target"
      data-triage-state={isOver ? "active-hover" : "available"}
      className={cn(
        "triage-staging__remove absolute inset-x-0 bottom-0 z-10 flex h-12 w-full items-center justify-center gap-2 border-t bg-card px-3 text-xs font-medium transition-[background-color,border-color,color] motion-reduce:transition-none",
        isOver
          ? "border-solid border-destructive bg-destructive/10 text-destructive"
          : "border-dashed border-border text-muted-foreground",
      )}
    >
      <X aria-hidden="true" className="triage-staging__remove-default-icon h-4 w-4 flex-shrink-0" />
      <Trash2 aria-hidden="true" className="triage-staging__remove-trash h-4 w-4 flex-shrink-0" />
      <span>Remove from staging</span>
    </div>
  );
}

export function TriageWorkspace({ node }: { node: Node }) {
  const operationLock = useTriageOperationLock();
  const departure = useTriageDeparture(operationLock);
  const externalScratchRemoval = useTriageStore(
    (state) => state.externalScratchRemoval,
  );
  const selectedScratchId = useTriageStore((state) => state.selectedScratchId);
  const titleBlockerHandle = useMemo(() => {
    // Scope the producer to the same selected-Scratch lifetime as BreakdownPanel.
    void selectedScratchId;
    return createScratchTitleBlockerHandle();
  }, [selectedScratchId]);
  const titleBlocker = useSyncExternalStore(
    titleBlockerHandle.subscribe,
    titleBlockerHandle.getSnapshot,
    () => null,
  );
  const [addDraftBlocker, setAddDraftBlocker] = useState<{
    scratchId: string | null;
    blocked: boolean;
  }>({ scratchId: null, blocked: false });
  const hasAddDraft =
    addDraftBlocker.scratchId === selectedScratchId && addDraftBlocker.blocked;
  const setCurrentAddDraftBlocker = useCallback(
    (blocked: boolean) => {
      setAddDraftBlocker({ scratchId: selectedScratchId, blocked });
    },
    [selectedScratchId],
  );
  const setExternalScratchRemovalLifecycle = useTriageStore(
    (state) => state.setExternalScratchRemovalLifecycle,
  );
  const ownTrashMarkers = useTriageStore((state) => state.ownTrashMarkers);
  const ownTrash = useMemo(
    () => Object.values(ownTrashMarkers),
    [ownTrashMarkers],
  );
  const { observation, readTerminalSnapshot } =
    useExternalScratchRemovalData({
      ownTrash,
      activeRemovalScratchId: externalScratchRemoval?.scratchId ?? null,
      selectedScratchId,
      unresolvedRemovalContext:
        externalScratchRemoval?.lifecycle === null
          ? externalScratchRemoval
          : null,
      unresolvedScratchId:
        externalScratchRemoval?.lifecycle === null
          ? externalScratchRemoval.scratchId
          : null,
    });
  const pendingArchiveFocusRef = useRef<ArchiveHandoffFocusKind | null>(null);
  const recordArchiveHandoffFocus = useCallback(
    (destination: { kind: ArchiveHandoffFocusKind }) => {
      pendingArchiveFocusRef.current = destination.kind;
    },
    [],
  );
  const handoffScratchLifecycle = useScratchLifecycleHandoff({
    inboxNodeId: node.id,
    onDestination: recordArchiveHandoffFocus,
    readTerminalSnapshot,
  });
  const handleArchiveApplied = useCallback(
    async (recovery: { scratchBitId: string }, result: unknown) => {
      await handoffScratchLifecycle(recovery.scratchBitId, result);
    },
    [handoffScratchLifecycle],
  );
  const archiveCoordinator = useArchiveScratch({
    operationLock,
    readAddDraftBlocker: departure.hasAddDraft,
    readTitleBlocker: titleBlockerHandle.getSnapshot,
    onApplied: handleArchiveApplied,
  });

  const trashSnapshot = useTrashScratchSnapshot(node.id);
  const [placementOpen, setPlacementOpen] = useState(false);
  const isPlacementOpen = useCallback(() => placementOpen, [placementOpen]);
  const trashDraftOwnerRef = useRef<TrashDraftOwner | null>(null);
  const registerTrashDraftOwner = useCallback((owner: TrashDraftOwner) => {
    trashDraftOwnerRef.current = owner;
    return () => {
      if (trashDraftOwnerRef.current === owner) trashDraftOwnerRef.current = null;
    };
  }, []);
  const hasDiscardableTrashWork = useCallback(
    (scratchId: string) =>
      scratchId === useTriageStore.getState().selectedScratchId &&
      (trashDraftOwnerRef.current?.hasDiscardableWork() ?? false),
    [],
  );
  const trashOpenerRef = useRef<HTMLElement | null>(null);
  const trashCloseFocusRef = useRef<(() => void) | null>(null);
  const trashVisibleOrderRef = useRef<readonly string[]>([]);
  const [trashAnnouncement, setTrashAnnouncement] = useState("");
  const handoffTrashLifecycle = useScratchLifecycleHandoff({
    inboxNodeId: node.id,
    // Close Advisory A2: the focus target is settled before the selection
    // changes. Trash only; the Archive handoff keeps its own order.
    onBeforeDestination: (destination) => {
      trashCloseFocusRef.current = trashEntryFocus(
        trashOpenerRef.current?.dataset.scratchTrashEntry === "context"
          ? "context"
          : "pool",
        destination,
      );
    },
    readTerminalSnapshot,
  });
  const handleTrashApplied = useCallback(
    async ({ scratchId, title, wasSelected, result }: TrashScratchApplied) => {
      if (wasSelected) {
        // The trashed Scratch's Add draft and editors go with it.
        trashDraftOwnerRef.current?.discard();
        await handoffTrashLifecycle(scratchId, result);
      } else {
        trashCloseFocusRef.current = trashNeighborFocus(
          pickTrashNeighbor(
            trashVisibleOrderRef.current,
            scratchId,
            useTriageStore.getState().scratchPoolResultIds,
          ),
        );
      }
      setTrashAnnouncement(
        INBOX_TRIAGE_COPY.scratchTrash.states.success.replace("{title}", title),
      );
    },
    [handoffTrashLifecycle],
  );
  const trash = useTrashScratch({
    operationLock,
    snapshot: trashSnapshot,
    selectedScratchId,
    hasDiscardableWork: hasDiscardableTrashWork,
    isPlacementOpen,
    onApplied: handleTrashApplied,
  });
  const { open: openTrash } = trash;
  const requestTrash = useCallback(
    (scratchId: string, opener: HTMLElement | null) => {
      trashOpenerRef.current = opener;
      trashCloseFocusRef.current = null;
      setTrashAnnouncement("");
      if (!openTrash(scratchId).opened) trashOpenerRef.current = null;
    },
    [openTrash],
  );
  const trashEntries = useMemo<TrashScratchEntries>(
    () => ({
      disabledReason: trash.entryDisabledReason,
      request: requestTrash,
    }),
    [requestTrash, trash.entryDisabledReason],
  );
  const { confirm: confirmTrash } = trash;
  const handleTrashConfirm = useCallback(() => {
    // Row removal must not decide the focus order, so it is read at confirm.
    trashVisibleOrderRef.current = [
      ...useTriageStore.getState().scratchPoolResultIds,
    ];
    void confirmTrash();
  }, [confirmTrash]);
  const handleTrashCloseAutoFocus = useCallback((event: Event) => {
    // Radix would restore focus to the activated control, which a successful
    // Trash may have removed; the target recorded at success wins.
    event.preventDefault();
    const recorded = trashCloseFocusRef.current;
    trashCloseFocusRef.current = null;
    if (recorded !== null) {
      recorded();
      return;
    }
    const opener = trashOpenerRef.current;
    trashOpenerRef.current = null;
    focusTrashOpener(opener);
  }, []);

  useEffect(() => {
    return registerActiveTriageDeparture(departure);
  }, [departure]);

  const setTriageWorkspaceMounted = useTriageStore(
    (state) => state.setTriageWorkspaceMounted,
  );
  useEffect(() => {
    setTriageWorkspaceMounted(true);
    return () => setTriageWorkspaceMounted(false);
  }, [setTriageWorkspaceMounted]);

  // Consumes the one-shot capture selection through the ordinary Scratch switch.
  const requestedScratchSelectionId = useTriageStore(
    (state) => state.requestedScratchSelectionId,
  );
  const scratchPoolActiveIds = useTriageStore((state) => state.scratchPoolActiveIds);
  const clearRequestedScratchSelection = useTriageStore(
    (state) => state.clearRequestedScratchSelection,
  );
  const selectScratch = useTriageStore((state) => state.selectScratch);
  const setScratchReveal = useTriageStore((state) => state.setScratchReveal);
  const seenActiveScratchIdsRef = useRef(new Set<string>());
  useEffect(() => {
    for (const id of scratchPoolActiveIds) seenActiveScratchIdsRef.current.add(id);
    if (requestedScratchSelectionId === null) return;
    if (!scratchPoolActiveIds.includes(requestedScratchSelectionId)) {
      // Seen and now absent: no longer active, so the request is skipped.
      // Never seen: the projection has not emitted it yet, keep waiting.
      if (seenActiveScratchIdsRef.current.has(requestedScratchSelectionId)) {
        clearRequestedScratchSelection();
      }
      return;
    }

    clearRequestedScratchSelection();
    const id = requestedScratchSelectionId;
    if (id === selectedScratchId) return;
    if (operationLock.isLocked() || departure.pendingDestination !== null) return;
    // An external-removal transition owns the selection; it holds no lock.
    if (externalScratchRemoval !== null) return;
    if (
      document.querySelector(".triage-inline-editor[data-triage-editor-state]") !==
      null
    ) {
      return;
    }

    departure.requestDeparture({
      id,
      kind: "scratch",
      perform: () => {
        selectScratch(id);
        setScratchReveal(id);
      },
      // Focus moves only after a VQ-03 Discard decision.
      focus: departure.hasAddDraft()
        ? () =>
            document
              .querySelector<HTMLElement>('[data-testid="selected-scratch-context"]')
              ?.focus()
        : undefined,
    });
  }, [
    clearRequestedScratchSelection,
    departure,
    externalScratchRemoval,
    operationLock,
    requestedScratchSelectionId,
    scratchPoolActiveIds,
    selectScratch,
    selectedScratchId,
    setScratchReveal,
  ]);

  useEffect(() => {
    if (
      observation === null ||
      externalScratchRemoval?.scratchId !== observation.scratchId
    ) {
      return;
    }
    setExternalScratchRemovalLifecycle(
      observation.scratchId,
      observation.lifecycle,
    );
  }, [
    externalScratchRemoval?.scratchId,
    observation,
    setExternalScratchRemovalLifecycle,
  ]);

  const archiveOperation: ArchiveOperationProjection = {
    state: archiveCoordinator.state,
    isRecoveryProjection: false,
    reconcile: archiveCoordinator.reconcile,
    retry: archiveCoordinator.retry,
    dismissTerminal: archiveCoordinator.dismissTerminal,
  };
  const archiveState = archiveCoordinator.state;
  const archiveOwnScratchId = archiveOwnScratchIdOf(archiveState);
  const archiveOperationId =
    "recovery" in archiveState && archiveState.recovery !== null
      ? archiveState.recovery.operationId
      : null;
  // An operation restored after a reload may show the section-recovery
  // projection only until it has been shown in the workspace once.
  const [restoredOperationId] = useState(() => archiveOperationId);
  const [shownRestoredOperationId, setShownRestoredOperationId] = useState<
    string | null
  >(null);
  const terminalSuccess =
    archiveState.phase === "terminal" &&
    (archiveState.terminalStatus === "applied" ||
      archiveState.terminalStatus === "already_applied");
  const recoveryScratchIsNotSelected =
    "recovery" in archiveState &&
    archiveState.recovery !== null &&
    archiveState.recovery.scratchBitId !== selectedScratchId;

  const restoredNotYetShown =
    restoredOperationId !== null &&
    archiveOperationId === restoredOperationId &&
    shownRestoredOperationId !== restoredOperationId;
  const showsRecoveryProjection =
    !archiveCoordinator.isProjectionReady ||
    (!terminalSuccess && recoveryScratchIsNotSelected && restoredNotYetShown) ||
    // A pre-dispatch storage failure of a Retry started from the projection
    // has no recovery id; its card stays in the projection until shown.
    (archiveState.phase === "storage_failed" &&
      archiveState.recovery === null &&
      restoredOperationId !== null &&
      shownRestoredOperationId !== restoredOperationId &&
      archiveOwnScratchId !== selectedScratchId);

  if (
    !showsRecoveryProjection &&
    restoredOperationId !== null &&
    archiveOperationId === restoredOperationId &&
    shownRestoredOperationId !== restoredOperationId
  ) {
    // Once shown in the workspace, the restored operation never returns to
    // the recovery projection.
    setShownRestoredOperationId(restoredOperationId);
  }

  const previousSelectedScratchIdRef = useRef(selectedScratchId);
  const { dismissTerminal } = archiveCoordinator;
  useEffect(() => {
    const previous = previousSelectedScratchIdRef.current;
    previousSelectedScratchIdRef.current = selectedScratchId;
    if (previous === selectedScratchId) return;
    // A Scratch change away from the card's own Scratch dismisses a
    // non-success result like Cancel; the coordinator refuses other states.
    if (archiveOwnScratchId !== null && previous === archiveOwnScratchId) {
      dismissTerminal();
    }
  }, [archiveOwnScratchId, dismissTerminal, selectedScratchId]);

  if (showsRecoveryProjection) {
    const recoveryOperation = {
      ...archiveOperation,
      isRecoveryProjection: true,
    };
    return (
      <>
        <ArchiveLiveRegion
          sentence={archiveLiveSentence(recoveryOperation.state, true)}
        />
        <div
        className="archive-recovery-boundary"
        data-triage-role="archive-recovery-boundary"
      >
        <section
          aria-labelledby="triage-breakdown-heading"
          className="archive-recovery-breakdown"
          data-triage-role="section-surface"
        >
          <h2
            className="triage-shell__section-heading"
            data-triage-role="section-header"
            id="triage-breakdown-heading"
            tabIndex={-1}
          >
            {INBOX_TRIAGE_COPY.sectionNames.breakdown}
          </h2>
          <div
            aria-labelledby="archive-completion-heading"
            className="archive-operation-overlay"
            data-triage-role="archive-completion-overlay"
            role="region"
          >
            <ArchiveOperationCard
              operation={recoveryOperation}
              onCancel={() => {
                archiveCoordinator.dismissTerminal();
              }}
            />
          </div>
        </section>
        </div>
      </>
    );
  }

  return (
    <>
      <ArchiveLiveRegion
        sentence={archiveLiveSentence(archiveOperation.state, false)}
      />
      <TriageOperationLockContext.Provider value={operationLock}>
      <TriageDepartureContext.Provider value={departure}>
        <ScratchTitleBlockerContext.Provider value={titleBlockerHandle}>
        <TrashScratchEntriesContext.Provider value={trashEntries}>
        <TrashDraftRegistryContext.Provider value={registerTrashDraftOwner}>
          <div
            aria-atomic="true"
            aria-live="polite"
            className="sr-only"
            data-testid="trash-live-region"
            data-triage-role="trash-live-region"
            role="status"
          >
            {trashAnnouncement}
          </div>
          <ScratchTrashDialog
            state={trash.state}
            view={trash.view}
            onCancel={() => {
              trash.cancel();
            }}
            onCheckAgain={() => {
              void trash.reconcile();
            }}
            onCloseAutoFocus={handleTrashCloseAutoFocus}
            onConfirm={handleTrashConfirm}
            onRetry={() => {
              void trash.retry();
            }}
          />
          <ReadyTriageWorkspace
            archiveOperation={archiveOperation}
            archiveScratch={archiveCoordinator.archiveScratch}
            departure={departure}
            hasAddDraft={hasAddDraft}
            node={node}
            operationLock={operationLock}
            onAddDraftBlockerChange={setCurrentAddDraftBlocker}
            onPlacementOpenChange={setPlacementOpen}
            pendingArchiveFocusRef={pendingArchiveFocusRef}
            readTerminalSnapshot={readTerminalSnapshot}
            selectedScratchId={selectedScratchId}
            titleBlocker={titleBlocker}
          />
        </TrashDraftRegistryContext.Provider>
        </TrashScratchEntriesContext.Provider>
        </ScratchTitleBlockerContext.Provider>
      </TriageDepartureContext.Provider>
      </TriageOperationLockContext.Provider>
    </>
  );
}

type ArchiveHandoffFocusKind = "scratch" | "search-empty" | "inbox-empty";

function archiveOwnScratchIdOf(
  state: ArchiveOperationProjection["state"],
): string | null {
  if (state.phase === "idle") return null;
  if (state.recovery !== null) return state.recovery.scratchBitId;
  return state.phase === "storage_failed"
    ? (state.attemptedScratchBitId ?? null)
    : null;
}

function archiveHandoffFocusSelector(kind: ArchiveHandoffFocusKind): string {
  return kind === "scratch"
    ? '[data-testid="selected-scratch-context"]'
    : kind === "search-empty"
      ? '[data-archive-handoff-focus="search-empty"]'
      : 'button[aria-label="Add item"]';
}

/**
 * Focus after a successful Trash. The Pool entry lands on the destination's
 * Pool row; the Context `[X]` entry follows the Archive success focus rule.
 */
export function trashEntryFocus(
  entry: "pool" | "context",
  destination: { id: string | null; kind: ArchiveHandoffFocusKind },
): () => void {
  return () => {
    const selector =
      entry === "pool" && destination.kind === "scratch" && destination.id !== null
        ? `[data-external-removal-destination="${destination.id}"]`
        : archiveHandoffFocusSelector(destination.kind);
    (
      document.querySelector<HTMLElement>(selector) ??
      document.querySelector<HTMLElement>("#triage-scratch-pool-heading")
    )?.focus();
  };
}

/**
 * The row to focus after trashing an unselected Scratch: the next, then the
 * previous, row of the order read at confirm that is still visible now, so a
 * Retry or Check again after the Pool changed still lands on a real row.
 */
export function pickTrashNeighbor(
  orderAtConfirm: readonly string[],
  scratchId: string,
  visibleNow: readonly string[],
): string | undefined {
  const index = orderAtConfirm.indexOf(scratchId);
  if (index < 0) return undefined;
  const alive = new Set(visibleNow);
  const isAlive = (id: string) => id !== scratchId && alive.has(id);
  return (
    orderAtConfirm.slice(index + 1).find(isAlive) ??
    orderAtConfirm.slice(0, index).reverse().find(isAlive)
  );
}

/**
 * Cancel returns focus to the activated entry. When that entry is disabled
 * (a rejected Trash leaves the same unresolved source in place) focus would
 * silently drop to the body, so it falls back to its row or the Context.
 */
export function focusTrashOpener(opener: HTMLElement | null): void {
  const usable =
    opener !== null &&
    opener.isConnected &&
    !(opener instanceof HTMLButtonElement && opener.disabled);
  if (usable) {
    opener.focus();
    return;
  }
  const row = opener?.isConnected
    ? opener.closest('[data-triage-role="pool-row-container"]')
    : null;
  (
    row?.querySelector<HTMLElement>("button[aria-pressed]") ??
    document.querySelector<HTMLElement>('[data-testid="selected-scratch-context"]') ??
    document.querySelector<HTMLElement>("#triage-scratch-pool-heading")
  )?.focus();
}

/** Focus after trashing an unselected Scratch: next, then previous visible row, else search. */
export function trashNeighborFocus(neighborId: string | undefined): () => void {
  return () => {
    const selector =
      neighborId === undefined
        ? '[data-archive-handoff-focus="search-empty"]'
        : `[data-external-removal-destination="${neighborId}"]`;
    (
      document.querySelector<HTMLElement>(selector) ??
      document.querySelector<HTMLElement>("#triage-scratch-pool-heading")
    )?.focus();
  };
}

function archiveLiveSentence(
  state: ArchiveOperationProjection["state"],
  isRecoveryProjection: boolean,
): string {
  const copy = INBOX_TRIAGE_COPY.archive.states;
  if (
    isRecoveryProjection &&
    (state.phase === "recovering" || state.phase === "reconciling")
  ) return copy.forcedReload;
  if (state.phase === "pending") return copy.pending;
  if (state.phase === "unknown") return copy.unknown;
  if (state.phase === "reconciling") return copy.reconciling;
  if (state.phase === "recovering") return copy.forcedReload;
  if (state.phase === "storage_failed") return copy.storageFailure;
  if (state.phase !== "terminal") return "";
  if (
    state.terminalStatus === "applied" ||
    state.terminalStatus === "already_applied"
  ) return copy.success;
  if (state.terminalStatus === "not_applied") return copy.notApplied;
  if (state.terminalStatus === "rejected") return copy.rejected;
  return copy.conflict;
}

function ArchiveLiveRegion({ sentence }: { sentence: string }) {
  return (
    <div
      aria-atomic="true"
      aria-live="polite"
      className="sr-only"
      data-testid="archive-live-region"
      data-triage-role="archive-live-region"
      role="status"
    >
      {sentence}
    </div>
  );
}

function ReadyTriageWorkspace({
  archiveOperation,
  archiveScratch,
  departure,
  hasAddDraft,
  node,
  operationLock,
  onAddDraftBlockerChange,
  onPlacementOpenChange,
  pendingArchiveFocusRef,
  readTerminalSnapshot,
  selectedScratchId,
  titleBlocker,
}: {
  archiveOperation: ArchiveOperationProjection;
  archiveScratch: ReturnType<typeof useArchiveScratch>["archiveScratch"];
  departure: ReturnType<typeof useTriageDeparture>;
  hasAddDraft: boolean;
  node: Node;
  operationLock: ReturnType<typeof useTriageOperationLock>;
  onAddDraftBlockerChange: (blocked: boolean) => void;
  onPlacementOpenChange: (open: boolean) => void;
  pendingArchiveFocusRef: React.RefObject<ArchiveHandoffFocusKind | null>;
  readTerminalSnapshot: ReturnType<
    typeof useExternalScratchRemovalData
  >["readTerminalSnapshot"];
  selectedScratchId: string | null;
  titleBlocker: ReturnType<
    ReturnType<typeof createScratchTitleBlockerHandle>["getSnapshot"]
  >;
}) {
  const completion = useCanArchiveScratch(selectedScratchId, {
    hasAddDraft,
    titleBlocker,
  });
  const completionWithArchive = {
    ...completion,
    archiveOperation:
      archiveOperation.state.phase === "idle" ||
      (archiveOperation.state.phase === "terminal" &&
        (archiveOperation.state.terminalStatus === "applied" ||
          archiveOperation.state.terminalStatus === "already_applied")) ||
      archiveOwnScratchIdOf(archiveOperation.state) !== selectedScratchId
        ? undefined
        : archiveOperation,
    archive: async () => {
      const scratch = completion.eligibility.scratch;
      return scratch === null ? false : archiveScratch(scratch);
    },
  };

  return (
    <TriageWorkspaceContent
      completion={completionWithArchive}
      departure={departure}
      isDepartureDecision={departure.pendingDestination !== null}
      node={node}
      operationLock={operationLock}
      onAddDraftBlockerChange={onAddDraftBlockerChange}
      onPlacementOpenChange={onPlacementOpenChange}
      pendingArchiveFocusRef={pendingArchiveFocusRef}
      readTerminalSnapshot={readTerminalSnapshot}
    />
  );
}

function TriageWorkspaceContent({
  completion,
  departure,
  isDepartureDecision,
  node,
  operationLock,
  onAddDraftBlockerChange,
  onPlacementOpenChange,
  pendingArchiveFocusRef,
  readTerminalSnapshot,
}: {
  completion: BreakdownCompletionProjection;
  departure: ReturnType<typeof useTriageDeparture>;
  isDepartureDecision: boolean;
  node: Node;
  operationLock: ReturnType<typeof useTriageOperationLock>;
  onAddDraftBlockerChange: (blocked: boolean) => void;
  onPlacementOpenChange: (open: boolean) => void;
  pendingArchiveFocusRef: React.RefObject<ArchiveHandoffFocusKind | null>;
  readTerminalSnapshot: ReturnType<
    typeof useExternalScratchRemovalData
  >["readTerminalSnapshot"];
}) {
  const selectedScratchId = useTriageStore((state) => state.selectedScratchId);
  const externalScratchRemoval = useTriageStore(
    (state) => state.externalScratchRemoval,
  );
  const finishExternalScratchRemoval = useTriageStore(
    (state) => state.finishExternalScratchRemoval,
  );
  const scratchPoolQuery = useTriageStore((state) => state.scratchPoolQuery);
  const poolCreatedAtSort = useTriagePreferencesStore(
    (state) => state.poolCreatedAtSort,
  );
  const { activeScratchBits } = useInbox();
  const workspaceRef = useRef<HTMLElement>(null);
  const preTransitionFocusRef = useRef<HTMLElement | null>(null);
  const previousRemovalIdRef = useRef<string | null>(null);
  const pendingTerminalFocusRef = useRef<
    "scratch" | "search-empty" | "inbox-empty" | null
  >(null);
  const draftSnapshotRef = useRef<ExternalRemovalDraft[]>([]);
  const [externalRemovalDrafts, setExternalRemovalDrafts] = useState<
    ExternalRemovalDraft[]
  >([]);
  const stagedCandidates = useStagedCandidates(selectedScratchId);
  const {
    breakdowns: authoritativeBreakdowns,
    isReady: authoritativeBreakdownsReady,
  } = useScratchBreakdowns(selectedScratchId);
  const {
    candidates: authoritativeStagedCandidates = [],
    counts: stagedCandidateCounts,
    reconcileStageCandidate: runReconcileStageCandidate,
    reconcileUnstageCandidate: runReconcileUnstageCandidate,
    stageCandidate: runStageCandidate,
    unstageCandidate: runUnstageCandidate,
  } = stagedCandidates;
  const [stagingAlert, setStagingAlert] = useState<StagingAlertState | null>(null);
  const breakdownSuccessScopeToken = useMemo(
    () => ({ scratchId: selectedScratchId }),
    [selectedScratchId],
  );
  const [breakdownSuccessScope, setBreakdownSuccessScope] = useState<{
    scratchId: string;
    token: { scratchId: string | null };
    signal: UnstageSuccessProjection;
  } | null>(null);
  const [newCandidateIds, setNewCandidateIds] = useState<{
    node: Set<string>;
    bit: Set<string>;
  }>({ node: new Set(), bit: new Set() });
  const breakdownHeadingRef = useRef<HTMLHeadingElement>(null);
  const stagingHeadingRef = useRef<HTMLHeadingElement>(null);
  const nodeStagingHeadingRef = useRef<HTMLHeadingElement>(null);
  const bitStagingHeadingRef = useRef<HTMLHeadingElement>(null);
  const [operationMeta, setOperationMeta] = useState(
    new Map<string, StagingOperationMeta>(),
  );
  const operationMetaRef = useRef(operationMeta);
  const localStageCandidateIdsRef = useRef(new Set<string>());
  const [localStageCandidateIds, setLocalStageCandidateIds] = useState(
    new Set<string>(),
  );
  const activeDragItemRef = useRef<TriageDragItem>(null);
  const arrivalBaselineRef = useRef<{
    scratchId: string | null;
    ready: boolean;
    ids: Set<string>;
  }>({ scratchId: null, ready: false, ids: new Set() });
  const invalidatedDragRef = useRef<StagingAlertState | null>(null);
  const focusUnstagedSource = useCallback((sourceBreakdownId: string) => {
    const focusWhenReady = (remainingFrames: number) => {
      const row = Array.from(
        workspaceRef.current?.querySelectorAll<HTMLElement>(
          "[data-breakdown-id]",
        ) ?? [],
      ).find(
        (candidate) =>
          candidate.dataset.breakdownId === sourceBreakdownId,
      );
      const grip = row?.querySelector<HTMLButtonElement>(
        'button[aria-label="Drag breakdown"]',
      );
      if (grip !== undefined && grip !== null && !grip.disabled) {
        grip.focus();
        return;
      }
      if (remainingFrames > 0) {
        requestAnimationFrame(() => focusWhenReady(remainingFrames - 1));
      }
    };
    requestAnimationFrame(() => focusWhenReady(2));
  }, []);
  const focusPlacementSource = useCallback(
    (release: TriagePlacementRelease) => {
      if (release.kind === "direct") {
        const focusWhenReady = (remainingFrames: number) => {
          const grip = Array.from(
            workspaceRef.current?.querySelectorAll<HTMLElement>(
              "[data-breakdown-id]",
            ) ?? [],
          )
            .find((row) => row.dataset.breakdownId === release.source.id)
            ?.querySelector<HTMLButtonElement>(
              'button[aria-label="Drag breakdown"]',
            );
          if (grip !== undefined && grip !== null && !grip.disabled) {
            grip.focus({ preventScroll: true });
            return;
          }
          if (remainingFrames > 0) {
            requestAnimationFrame(() => focusWhenReady(remainingFrames - 1));
            return;
          }
          breakdownHeadingRef.current?.focus({ preventScroll: true });
        };
        requestAnimationFrame(() => focusWhenReady(2));
        return;
      }
      requestAnimationFrame(() => {
        const source = Array.from(
          workspaceRef.current?.querySelectorAll<HTMLElement>(
            "[data-candidate-id]",
          ) ?? [],
        ).find(
          (element) =>
            element.dataset.candidateId === release.candidate?.id,
        );
        (source ?? stagingHeadingRef.current)?.focus({ preventScroll: true });
      });
    },
    [],
  );
  const rememberOperation = useCallback(
    (
      command: StageCandidateCommand | UnstageCandidateCommand,
      kind: "stage" | "unstage",
    ): StagingOperationMeta => {
      const dragItem = activeDragItemRef.current;
      const candidate = authoritativeStagedCandidates.find(
        ({ id }) => id === command.candidateId,
      );
      const previous = operationMetaRef.current.get(command.operationId);
      const resultType =
        "resultType" in command
          ? command.resultType
          : candidate?.resultType ??
            previous?.resultType ??
            (dragItem?.kind === "triage-staged-node" ? "node" : "bit");
      const meta = {
        title: candidate?.content ?? dragItem?.label ?? previous?.title ?? "Item",
        resultType,
        candidateId: command.candidateId,
        sourceBreakdownId: command.sourceBreakdownId,
      } satisfies StagingOperationMeta;
      operationMetaRef.current.set(command.operationId, meta);
      setOperationMeta(new Map(operationMetaRef.current));
      if (kind === "stage") {
        localStageCandidateIdsRef.current.add(command.candidateId);
        setLocalStageCandidateIds((current) =>
          new Set(current).add(command.candidateId),
        );
      }
      setStagingAlert((current) =>
        current?.candidateId === command.candidateId ? null : current,
      );
      return meta;
    },
    [authoritativeStagedCandidates],
  );
  const projectTerminalOutcome = useCallback(
    (
      kind: "stage" | "unstage",
      meta: StagingOperationMeta,
      outcome:
        | CandidateCommandOutcome<StageCandidateResult>
        | CandidateCommandOutcome<UnstageCandidateResult>,
    ) => {
      if ("outcome" in outcome) return;
      if (
        kind === "unstage" &&
        selectedScratchId !== null &&
        (outcome.status === "applied" || outcome.status === "already_applied")
      ) {
        setBreakdownSuccessScope({
          scratchId: selectedScratchId,
          token: breakdownSuccessScopeToken,
          signal: {
            kind: "unstage",
            operationId: outcome.operationId,
            sourceBreakdownId: meta.sourceBreakdownId,
          },
        });
      }
      const alert = stagingTerminalAlert(kind, outcome.status, meta);
      if (alert !== null) {
        localStageCandidateIdsRef.current.delete(meta.candidateId);
        setLocalStageCandidateIds((current) => {
          const next = new Set(current);
          next.delete(meta.candidateId);
          return next;
        });
      }
      setStagingAlert((current) =>
        alert ?? (current?.candidateId === meta.candidateId ? null : current),
      );
    },
    [breakdownSuccessScopeToken, selectedScratchId],
  );
  const stageCandidate = useCallback(
    async (command: StageCandidateCommand) => {
      const meta = rememberOperation(command, "stage");
      const outcome = await runStageCandidate(command);
      projectTerminalOutcome("stage", meta, outcome);
      return outcome;
    },
    [projectTerminalOutcome, rememberOperation, runStageCandidate],
  );
  const reconcileStageCandidate = useCallback(
    async (command: StageCandidateCommand) => {
      const meta = rememberOperation(command, "stage");
      const outcome = await runReconcileStageCandidate(command);
      projectTerminalOutcome("stage", meta, outcome);
      return outcome;
    },
    [
      projectTerminalOutcome,
      rememberOperation,
      runReconcileStageCandidate,
    ],
  );
  const unstageCandidate = useCallback(
    async (command: UnstageCandidateCommand) => {
      const meta = rememberOperation(command, "unstage");
      const outcome = await runUnstageCandidate(command);
      projectTerminalOutcome("unstage", meta, outcome);
      return outcome;
    },
    [projectTerminalOutcome, rememberOperation, runUnstageCandidate],
  );
  const reconcileUnstageCandidate = useCallback(
    async (command: UnstageCandidateCommand) => {
      const meta = rememberOperation(command, "unstage");
      const outcome = await runReconcileUnstageCandidate(command);
      projectTerminalOutcome("unstage", meta, outcome);
      return outcome;
    },
    [
      projectTerminalOutcome,
      rememberOperation,
      runReconcileUnstageCandidate,
    ],
  );
  const [localPlacementResult, setLocalPlacementResult] = useState<{
    id: string;
    type: "node" | "bit";
    pathIds: readonly string[];
  } | null>(null);
  const newlyPlaced = useTriageNewlyPlaced();
  const placement = useTriagePlacement({
    operationLock,
    onApplied: (result, command) => {
      const identity = {
        id: result.id,
        type: command.resultType,
        pathIds: [...command.expectedAncestorIds],
      } as const;
      const sourceSnapshot = authoritativeBreakdowns.find(
        (source) =>
          source.id === command.sourceBreakdownId &&
          source.scratchBitId === command.scratchBitId &&
          source.version === command.sourceExpectedVersion &&
          source.consumedAt === null,
      );
      const candidateProjection =
        "candidateId" in command
          ? authoritativeStagedCandidates.find(
              (candidate) =>
                candidate.id === command.candidateId &&
                candidate.sourceBreakdownId === command.sourceBreakdownId &&
                candidate.scratchBitId === command.scratchBitId &&
                candidate.resultType === command.resultType &&
                candidate.version === command.candidateExpectedVersion,
            )
          : null;
      if (sourceSnapshot !== undefined) {
        newlyPlaced.registerPlacement({
          result,
          command,
          sourceSnapshot,
          candidateSnapshot:
            candidateProjection === null || candidateProjection === undefined
              ? null
              : {
                  id: candidateProjection.id,
                  scratchBitId: candidateProjection.scratchBitId,
                  sourceBreakdownId: candidateProjection.sourceBreakdownId,
                  resultType: candidateProjection.resultType,
                  lifecycle: candidateProjection.lifecycle,
                  createdAt: candidateProjection.createdAt,
                  updatedAt: candidateProjection.updatedAt,
                  version: candidateProjection.version,
                },
        });
      }
      useTriageStore.getState().registerExplorerLocalPlacement(identity);
      setLocalPlacementResult(identity);
    },
  });
  const placementIsOpen = placement.snapshot !== null;
  useEffect(() => {
    onPlacementOpenChange(placementIsOpen);
    return () => onPlacementOpenChange(false);
  }, [onPlacementOpenChange, placementIsOpen]);
  useEffect(() => {
    const current = placement.snapshot;
    if (
      current === null ||
      (current.phase !== "direct-selection" &&
        current.phase !== "result-title" &&
        current.phase !== "confirmation")
    ) {
      return;
    }

    const release = current.release;
    const ownerIsReady =
      release.kind === "direct"
        ? authoritativeBreakdownsReady
        : stagedCandidates.isReady;
    if (!ownerIsReady) return;
    const isAuthoritative =
      release.kind === "direct"
        ? authoritativeBreakdowns.some((source) =>
            sourceMatchesPlacementRelease(source, release),
          )
        : authoritativeStagedCandidates.some(
            (candidate) =>
              release.candidate !== undefined &&
              candidate.id === release.candidate.id &&
              candidate.version === release.candidate.version &&
              candidate.resultType === release.candidate.resultType &&
              candidate.lifecycle === "staged" &&
              candidate.scratchBitId === release.scratchBitId &&
              candidate.sourceBreakdownId === release.source.id &&
              candidate.content === release.source.title &&
              sourceMatchesPlacementRelease(candidate.source, release),
          );
    if (
      isAuthoritative ||
      !placement.invalidateOperation(current.operationId)
    ) {
      return;
    }

    focusPlacementSource(release);
    // This alert projects an invalidation from the authoritative live-query owners.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStagingAlert({
      kind: "invalidated-placement",
      copy: stagingTemplate(
        INBOX_TRIAGE_COPY.stagingStatus.alert.invalidatedPlacement,
        release.source.title,
      ),
      candidateId: release.candidate?.id ?? null,
      sourceBreakdownId: release.source.id,
      clearOnCandidateDisappearance: false,
    });
  }, [
    authoritativeBreakdowns,
    authoritativeBreakdownsReady,
    authoritativeStagedCandidates,
    focusPlacementSource,
    placement,
    stagedCandidates.isReady,
  ]);
  const cancelPlacement = useCallback(() => {
    const current = placement.snapshot;
    if (current !== null && placement.cancel()) {
      focusPlacementSource(current.release);
    }
  }, [focusPlacementSource, placement]);
  const {
    activeDragItem,
    collisionDetection,
    handleDragCancel,
    handleDragEnd,
    handleDragOver,
    handleDragStart,
    overTargetId,
    refreshRenderedTarget,
    sensors,
    targetFeedback,
  } = useTriageDnd(selectedScratchId, {
    beginPlacement: placement.begin,
    focusUnstagedSource,
    isPlacementOpen: () => placement.snapshot !== null,
    operationLock,
    reconcileStageCandidate,
    reconcileUnstageCandidate,
    stageCandidate,
    unstageCandidate,
  });
  useEffect(() => {
    activeDragItemRef.current = activeDragItem;
  }, [activeDragItem]);

  const stagingOperations = useMemo<StagingOperationView[]>(() => {
    const projected = [
      ...(stagedCandidates.pendingOperations ?? []),
      ...(stagedCandidates.unknownOperations ?? []),
      ...(stagedCandidates.reconcilingOperations ?? []),
    ];
    return projected.flatMap((operation) => {
      if (operation.kind === "orphan_cleanup") return [];
      const kind = operation.kind;
      const candidate = authoritativeStagedCandidates.find(
        ({ id }) => id === operation.candidateId,
      );
      const meta = operationMeta.get(operation.operationId);
      const title = candidate?.content ?? meta?.title;
      const resultType = operation.resultType ?? candidate?.resultType ?? meta?.resultType;
      if (title === undefined || resultType === undefined) return [];
      return [{ ...operation, kind, title, resultType }];
    });
  }, [
    authoritativeStagedCandidates,
    operationMeta,
    stagedCandidates.pendingOperations,
    stagedCandidates.reconcilingOperations,
    stagedCandidates.unknownOperations,
  ]);
  const stagingProjection = useMemo<StagingZoneProjection>(
    () => ({
      candidates: authoritativeStagedCandidates ?? [],
      integrityCandidates: stagedCandidates.integrityCandidates ?? [],
      operations: stagingOperations,
    }),
    [
      authoritativeStagedCandidates,
      stagedCandidates.integrityCandidates,
      stagingOperations,
    ],
  );
  const stagingProjectionByType = useMemo(
    () => ({
      node: {
        candidates: stagingProjection.candidates.filter(
          ({ resultType }) => resultType === "node",
        ),
        integrityCandidates: stagingProjection.integrityCandidates.filter(
          ({ candidate }) => candidate.resultType === "node",
        ),
        operations: stagingProjection.operations.filter(
          ({ resultType }) => resultType === "node",
        ),
      },
      bit: {
        candidates: stagingProjection.candidates.filter(
          ({ resultType }) => resultType === "bit",
        ),
        integrityCandidates: stagingProjection.integrityCandidates.filter(
          ({ candidate }) => candidate.resultType === "bit",
        ),
        operations: stagingProjection.operations.filter(
          ({ resultType }) => resultType === "bit",
        ),
      },
    }),
    [stagingProjection],
  );
  const stagingLiveSentence =
    stagingAlert?.copy ??
    (stagingOperations.length > 0
      ? stagingOperationSentence(stagingOperations[stagingOperations.length - 1])
      : "");
  const authoritativeArrivalCandidates = useMemo(
    () => [
      ...authoritativeStagedCandidates.map(({ id, resultType }) => ({
        id,
        resultType,
      })),
      ...(stagedCandidates.integrityCandidates ?? []).map(({ candidate }) => ({
        id: candidate.id,
        resultType: candidate.resultType,
      })),
    ],
    [authoritativeStagedCandidates, stagedCandidates.integrityCandidates],
  );

  useEffect(() => {
    const baseline = arrivalBaselineRef.current;
    if (baseline.scratchId !== selectedScratchId) {
      arrivalBaselineRef.current = {
        scratchId: selectedScratchId,
        ready: false,
        ids: new Set(),
      };
      operationMetaRef.current.clear();
      localStageCandidateIdsRef.current.clear();
      // This state mirrors an external live-query ownership boundary.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNewCandidateIds({ node: new Set(), bit: new Set() });
      setLocalStageCandidateIds(new Set());
      setStagingAlert(null);
    }
    if (selectedScratchId === null || !stagedCandidates.isReady) return;
    const current = arrivalBaselineRef.current;
    const currentIds = new Set(authoritativeArrivalCandidates.map(({ id }) => id));
    if (!current.ready) {
      arrivalBaselineRef.current = {
        scratchId: selectedScratchId,
        ready: true,
        ids: currentIds,
      };
      return;
    }
    const observedLocalIds = new Set(
      authoritativeArrivalCandidates
        .filter(
          ({ id }) =>
            !current.ids.has(id) &&
            (localStageCandidateIds.has(id) ||
              localStageCandidateIdsRef.current.has(id)),
        )
        .map(({ id }) => id),
    );
    for (const id of observedLocalIds) {
      localStageCandidateIdsRef.current.delete(id);
    }
    setNewCandidateIds((previous) => {
      const next = {
        node: new Set([...previous.node].filter((id) => currentIds.has(id))),
        bit: new Set([...previous.bit].filter((id) => currentIds.has(id))),
      };
      for (const candidate of authoritativeArrivalCandidates) {
        if (current.ids.has(candidate.id)) continue;
        if (observedLocalIds.has(candidate.id)) continue;
        next[candidate.resultType].add(candidate.id);
      }
      return next;
    });
    if (observedLocalIds.size > 0) {
      setLocalStageCandidateIds((currentLocalIds) => {
        const remaining = new Set(currentLocalIds);
        for (const id of observedLocalIds) remaining.delete(id);
        return remaining;
      });
    }
    arrivalBaselineRef.current = {
      scratchId: selectedScratchId,
      ready: true,
      ids: currentIds,
    };
  }, [
    authoritativeArrivalCandidates,
    localStageCandidateIds,
    selectedScratchId,
    stagedCandidates.isReady,
  ]);

  useEffect(() => {
    if (
      stagingAlert?.clearOnCandidateDisappearance &&
      !authoritativeArrivalCandidates.some(
        ({ id }) => id === stagingAlert.candidateId,
      )
    ) {
      // Authoritative disappearance is the receipt-defined alert clear signal.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStagingAlert(null);
    }
  }, [authoritativeArrivalCandidates, stagingAlert]);

  useEffect(() => {
    if (activeDragItem?.integrity === "invalidated") {
      invalidatedDragRef.current = {
        kind: "invalidated-drag",
        copy: stagingTemplate(
          INBOX_TRIAGE_COPY.stagingStatus.alert.invalidatedDrag,
          activeDragItem.label,
        ),
        candidateId: activeDragItem.id,
        sourceBreakdownId:
          "sourceBreakdownId" in activeDragItem
            ? activeDragItem.sourceBreakdownId
            : null,
        clearOnCandidateDisappearance: false,
      };
      return;
    }
    if (activeDragItem === null && invalidatedDragRef.current !== null) {
      setStagingAlert(invalidatedDragRef.current);
      invalidatedDragRef.current = null;
    }
  }, [activeDragItem]);

  const handlePendingPlacementInvalidated = useCallback(
    (dropId: string) => {
      const current = placement.snapshot;
      if (
        current?.release.target.dropId === dropId &&
        placement.invalidate(dropId)
      ) {
        focusPlacementSource(current.release);
        setStagingAlert({
          kind: "invalidated-placement",
          copy: INBOX_TRIAGE_COPY.lifecycleReasons.placementStale,
          candidateId: current.release.candidate?.id ?? null,
          sourceBreakdownId: current.release.source.id,
          clearOnCandidateDisappearance: false,
        });
        return true;
      }
      return false;
    },
    [focusPlacementSource, placement],
  );

  const showNewCandidates = useCallback((type: "node" | "bit") => {
    const ids = [...newCandidateIds[type]];
    const well = workspaceRef.current?.querySelector<HTMLElement>(
      `[data-triage-role="staging-${type}-well"]`,
    );
    if (well) well.scrollTop = 0;
    const target = Array.from(
      workspaceRef.current?.querySelectorAll<HTMLElement>("[data-candidate-id]") ?? [],
    ).find((element) => ids.includes(element.dataset.candidateId ?? ""));
    (target ?? (type === "node" ? nodeStagingHeadingRef.current : bitStagingHeadingRef.current))?.focus();
    setNewCandidateIds((previous) => ({ ...previous, [type]: new Set() }));
  }, [newCandidateIds]);

  const dismissStagingAlert = useCallback(() => {
    const dismissed = stagingAlert;
    setStagingAlert(null);
    requestAnimationFrame(() => {
      const candidate = Array.from(
        workspaceRef.current?.querySelectorAll<HTMLElement>("[data-candidate-id]") ?? [],
      ).find(
        (element) => element.dataset.candidateId === dismissed?.candidateId,
      );
      const source =
        dismissed?.sourceBreakdownId === null ||
        dismissed?.sourceBreakdownId === undefined
          ? null
          : Array.from(
              workspaceRef.current?.querySelectorAll<HTMLElement>(
                "[data-breakdown-id]",
              ) ?? [],
            )
              .find(
                (row) => row.dataset.breakdownId === dismissed.sourceBreakdownId,
              )
              ?.querySelector<HTMLElement>('button[aria-label="Drag breakdown"]');
      (candidate ?? source ?? stagingHeadingRef.current)?.focus();
    });
  }, [stagingAlert]);

  useLayoutEffect(() => {
    const root = workspaceRef.current;
    if (root === null) return;
    const refreshDraftSnapshot = () => {
      if (useTriageStore.getState().externalScratchRemoval === null) {
        draftSnapshotRef.current = collectExternalRemovalDrafts(root);
      }
    };
    refreshDraftSnapshot();
    const observer = new MutationObserver(refreshDraftSnapshot);
    observer.observe(root, {
      attributes: true,
      childList: true,
      subtree: true,
    });
    const unsubscribe = useTriageStore.subscribe((state, previousState) => {
      const currentRemoval = state.externalScratchRemoval;
      const previousRemoval = previousState.externalScratchRemoval;
      if (
        currentRemoval?.lifecycle !== null &&
        currentRemoval !== null &&
        (previousRemoval === null || previousRemoval.lifecycle === null)
      ) {
        previousRemovalIdRef.current = currentRemoval.scratchId;
        preTransitionFocusRef.current =
          document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        setExternalRemovalDrafts([...draftSnapshotRef.current]);
      }
    });
    return () => {
      observer.disconnect();
      unsubscribe();
    };
  }, []);

  // The Archive handoff changes the selected Scratch in the same commit that
  // removes the Archive button, so focus moves here, never on a later frame.
  useLayoutEffect(() => {
    const archiveFocus = pendingArchiveFocusRef.current;
    if (archiveFocus === null) return;
    pendingArchiveFocusRef.current = null;
    // The removal-focus effect below must not override this destination.
    preTransitionFocusRef.current = null;
    previousRemovalIdRef.current = null;
    const target =
      document.querySelector<HTMLElement>(
        archiveHandoffFocusSelector(archiveFocus),
      ) ?? breakdownHeadingRef.current;
    target?.focus();
  }, [pendingArchiveFocusRef, selectedScratchId]);

  useLayoutEffect(() => {
    if (externalScratchRemoval !== null) return;
    const terminalFocus = pendingTerminalFocusRef.current;
    pendingTerminalFocusRef.current = null;
    if (terminalFocus !== null) {
      const selector =
        terminalFocus === "scratch"
          ? '[data-testid="selected-scratch-context"]'
          : `[data-external-removal-focus="${terminalFocus}"]`;
      workspaceRef.current?.querySelector<HTMLElement>(selector)?.focus();
      preTransitionFocusRef.current = null;
      previousRemovalIdRef.current = null;
      return;
    }
    const prior = preTransitionFocusRef.current;
    preTransitionFocusRef.current = null;
    if (prior?.isConnected) {
      prior.focus();
    } else if (previousRemovalIdRef.current !== null) {
      workspaceRef.current
        ?.querySelector<HTMLElement>(
          '[data-testid="selected-scratch-context"] button[aria-label="Edit"]',
        )
        ?.focus();
    }
    previousRemovalIdRef.current = null;
  }, [externalScratchRemoval, selectedScratchId]);

  const finishExternalRemoval = useCallback(async () => {
    const removal = useTriageStore.getState().externalScratchRemoval;
    if (removal === null) return;
    const { projectedActiveScratchBits, source } = await readTerminalSnapshot(
      node.id,
      removal.scratchId,
    );
    if (
      useTriageStore.getState().externalScratchRemoval?.scratchId !==
      removal.scratchId
    ) {
      return;
    }
    if (source?.archivedAt !== null && source?.archivedAt !== undefined) {
      useTriageStore
        .getState()
        .setExternalScratchRemovalLifecycle(removal.scratchId, "archive");
    } else if (source === undefined || source.deletedAt !== null) {
      useTriageStore
        .getState()
        .setExternalScratchRemovalLifecycle(removal.scratchId, "delete");
    }
    const sourceIsActive =
      source !== undefined &&
      source.deletedAt === null &&
      source.archivedAt === null;
    const latestActiveScratchBits = projectedActiveScratchBits.filter(
      (scratch) => scratch.id !== removal.scratchId,
    );
    if (sourceIsActive) latestActiveScratchBits.push(source);
    const latestOrderedScratchBits = latestActiveScratchBits.toSorted(
      (left, right) =>
        poolCreatedAtSort === "ASC"
          ? left.createdAt - right.createdAt
          : right.createdAt - left.createdAt,
    );
    const normalizedQuery = scratchPoolQuery.toLocaleLowerCase();
    const latestVisibleScratchBits =
      normalizedQuery.length === 0
        ? latestOrderedScratchBits
        : latestOrderedScratchBits.filter((scratch) =>
            scratch.title.toLocaleLowerCase().includes(normalizedQuery),
          );
    const latestContext = {
      activeIds: latestOrderedScratchBits.map((scratch) => scratch.id),
      visibleIds: latestVisibleScratchBits.map((scratch) => scratch.id),
    };
    useTriageStore.getState().reconcileScratchPoolContext(latestContext);
    const validatedRemoval = useTriageStore.getState().externalScratchRemoval;
    if (validatedRemoval === null) return;
    pendingTerminalFocusRef.current = validatedRemoval.destinationKind;
    const destination = finishExternalScratchRemoval(latestContext);
    if (destination === null) {
      pendingTerminalFocusRef.current = null;
      return;
    }
    departure.setAddDraft("");
  }, [
    departure,
    finishExternalScratchRemoval,
    node.id,
    poolCreatedAtSort,
    readTerminalSnapshot,
    scratchPoolQuery,
  ]);

  const destinationTitle =
    externalScratchRemoval?.destinationId === null
      ? null
      : activeScratchBits.find(
          (scratch) => scratch.id === externalScratchRemoval?.destinationId,
        )?.title ?? null;
  const isExternalRemoval =
    externalScratchRemoval !== null &&
    externalScratchRemoval.lifecycle !== null;

  return (
    <section
      ref={workspaceRef}
      aria-label={`${node.title} triage workspace`}
      className="triage-shell flex h-full min-h-0 w-full overflow-hidden bg-background"
      data-min-viewport="1024px"
      data-testid="triage-workspace"
      data-triage-operation-kind={operationLock.activeOperation?.kind}
      data-triage-role="shell-background"
      data-triage-state={
        isExternalRemoval
          ? "external-removal"
          : isDepartureDecision
            ? "departure-decision"
            : "default"
      }
      onInputCapture={() => {
        draftSnapshotRef.current = collectExternalRemovalDrafts(
          workspaceRef.current,
        );
      }}
    >
      <div className="triage-shell__desktop-menu" data-triage-role="desktop-menu-bar" aria-hidden="true">
        <div className="triage-shell__desktop-menu-labels">
          <span data-triage-role="desktop-menu-label">
            <Monitor aria-hidden="true" strokeWidth={2.5} />
            File
          </span>
          <span data-triage-role="desktop-menu-label">Edit</span>
          <span data-triage-role="desktop-menu-label">View</span>
          <span data-triage-role="desktop-menu-label">Label</span>
          <span data-triage-role="desktop-menu-label">Special</span>
        </div>
        <span data-triage-role="desktop-menu-clock">12:00 PM</span>
      </div>
      <section
        aria-labelledby="triage-scratch-pool-heading"
        className="triage-shell__pool relative flex h-full min-h-0 shrink-0"
        data-triage-role="section-surface"
        data-triage-state="default"
        inert={isDepartureDecision || isExternalRemoval ? true : undefined}
      >
        <div
          className="triage-shell__pool-body h-full min-h-0"
          data-triage-role="internal-scroll-viewport"
        >
          <ScratchPool />
        </div>
      </section>

      <div
        className="triage-shell__main h-full min-w-0 flex-1 bg-background"
        data-layout-ratio="60/40"
        data-testid="triage-main-work-area"
        inert={isExternalRemoval ? true : undefined}
      >
        <DndContext
          autoScroll={false}
          collisionDetection={collisionDetection}
          sensors={sensors}
          onDragCancel={handleDragCancel}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDragStart={handleDragStart}
        >
          <div
            className="triage-shell__top min-h-0 border-b border-border"
            data-layout-ratio="60/40"
            data-testid="triage-top-work-area"
          >
            <section
              aria-labelledby="triage-breakdown-heading"
              className="triage-shell__section flex min-h-0 min-w-0 flex-col border-r border-border bg-card"
              data-triage-role="section-surface"
              data-triage-state="default"
            >
              <h2
                ref={breakdownHeadingRef}
                className="triage-shell__section-heading"
                data-triage-role="section-header"
                id="triage-breakdown-heading"
                tabIndex={-1}
              >
                <FileText aria-hidden="true" className="triage-shell__heading-icon" data-triage-role="breakdown-heading-icon" />
                <span className="triage-shell__heading-label">{INBOX_TRIAGE_COPY.sectionNames.breakdown}</span>
              </h2>
              <div
                className="min-h-0 flex-1 overflow-hidden"
                data-triage-role="internal-scroll-viewport"
              >
                <BreakdownPanel
                  key={selectedScratchId ?? "none"}
                  activeDragItem={activeDragItem}
                  completion={completion}
                  onAddDraftBlockerChange={onAddDraftBlockerChange}
                  overTargetId={overTargetId}
                  successSignal={
                    breakdownSuccessScope?.scratchId === selectedScratchId &&
                    breakdownSuccessScope.token === breakdownSuccessScopeToken
                      ? {
                          kind: breakdownSuccessScope.signal.kind,
                          operationId: breakdownSuccessScope.signal.operationId,
                          rowId:
                            breakdownSuccessScope.signal.sourceBreakdownId,
                        } satisfies BreakdownSuccessSignal
                      : null
                  }
                />
              </div>
            </section>

            <section
              aria-labelledby="triage-staging-heading"
              className="triage-shell__section triage-staging relative flex min-h-0 min-w-0 flex-col bg-card"
              data-triage-role="section-surface"
              data-triage-state="default"
              inert={isDepartureDecision ? true : undefined}
            >
              <h2
                ref={stagingHeadingRef}
                className="triage-shell__section-heading"
                data-triage-role="section-header"
                id="triage-staging-heading"
                tabIndex={-1}
              >
                <CircleDot aria-hidden="true" className="triage-shell__heading-icon" data-triage-role="staging-heading-icon" />
                <span className="triage-shell__heading-label">{INBOX_TRIAGE_COPY.sectionNames.staging}</span>
              </h2>
              {stagingAlert !== null ? (
                <StagingAlertBand
                  copy={stagingAlert.copy}
                  onDismiss={dismissStagingAlert}
                />
              ) : null}
              <div
                aria-atomic="true"
                aria-live="polite"
                className="sr-only"
                data-testid="staging-live-region"
                data-triage-role="staging-live-region"
                role="status"
              >
                {stagingLiveSentence}
              </div>
              <div
                className="triage-shell__staging min-h-0 flex-1"
                data-layout-ratio="35/65"
                data-testid="triage-staging-columns"
                data-triage-role="staging-display-columns"
              >
                <StagingSubsection
                  activeDragItem={activeDragItem}
                  className="triage-staging__subsection flex min-h-0 min-w-0 basis-[35%] flex-col"
                  overTargetId={overTargetId}
                  type="node"
                >
                  <h3 ref={nodeStagingHeadingRef} tabIndex={-1} data-triage-role="staging-node-heading" className="triage-shell__subsection-heading flex items-center justify-between gap-2">
                    <span>
                      {formatStagingHeading(
                        INBOX_TRIAGE_COPY.sectionNames.stagingNodes,
                        stagedCandidateCounts.visibleNodes,
                      )}
                    </span>
                    {newCandidateIds.node.size > 0 ? (
                      <button
                        aria-label={INBOX_TRIAGE_COPY.stagingStatus.actions.showNodes}
                        className="staging-arrival-count"
                        type="button"
                        onClick={() => showNewCandidates("node")}
                      >
                        {newCandidateIds.node.size === 1
                          ? INBOX_TRIAGE_COPY.stagingStatus.arrival.one
                          : INBOX_TRIAGE_COPY.stagingStatus.arrival.many.replace(
                              "{count}",
                              String(newCandidateIds.node.size),
                            )}
                      </button>
                    ) : null}
                  </h3>
                  <div
                    className="triage-staging__viewport flex min-h-0 flex-1 overflow-hidden"
                    data-triage-role="internal-scroll-viewport"
                  >
                    <StagingZone
                      activeDragItem={activeDragItem}
                      newCandidateIds={newCandidateIds.node}
                      overTargetId={overTargetId}
                      projection={stagingProjectionByType.node}
                      type="node"
                      onObservedTop={() =>
                        setNewCandidateIds((previous) => ({
                          ...previous,
                          node: new Set(),
                        }))
                      }
                    />
                  </div>
                </StagingSubsection>

                <StagingSubsection
                  activeDragItem={activeDragItem}
                  className="triage-staging__subsection triage-staging__subsection--bits flex min-h-0 min-w-0 basis-[65%] flex-col border-l border-dashed border-border/80"
                  overTargetId={overTargetId}
                  type="bit"
                >
                  <h3 ref={bitStagingHeadingRef} tabIndex={-1} data-triage-role="staging-bit-heading" className="triage-shell__subsection-heading flex items-center justify-between gap-2">
                    <span>
                      {formatStagingHeading(
                        INBOX_TRIAGE_COPY.sectionNames.stagingBits,
                        stagedCandidateCounts.visibleBits,
                      )}
                    </span>
                    {newCandidateIds.bit.size > 0 ? (
                      <button
                        aria-label={INBOX_TRIAGE_COPY.stagingStatus.actions.showBits}
                        className="staging-arrival-count"
                        type="button"
                        onClick={() => showNewCandidates("bit")}
                      >
                        {newCandidateIds.bit.size === 1
                          ? INBOX_TRIAGE_COPY.stagingStatus.arrival.one
                          : INBOX_TRIAGE_COPY.stagingStatus.arrival.many.replace(
                              "{count}",
                              String(newCandidateIds.bit.size),
                            )}
                      </button>
                    ) : null}
                  </h3>
                  <div
                    className="triage-staging__viewport flex min-h-0 flex-1 overflow-hidden"
                    data-triage-role="internal-scroll-viewport"
                  >
                    <StagingZone
                      activeDragItem={activeDragItem}
                      newCandidateIds={newCandidateIds.bit}
                      overTargetId={overTargetId}
                      projection={stagingProjectionByType.bit}
                      type="bit"
                      onObservedTop={() =>
                        setNewCandidateIds((previous) => ({
                          ...previous,
                          bit: new Set(),
                        }))
                      }
                    />
                  </div>
                </StagingSubsection>
              </div>
              <TriageRemoveDropTarget
                activeDragItem={activeDragItem}
                overTargetId={overTargetId}
              />
            </section>
          </div>

          <DragOverlay dropAnimation={null} modifiers={[snapDragTokenToCursor]}>
            {activeDragItem ? <TriageDragToken item={activeDragItem} /> : null}
          </DragOverlay>

          <section
            aria-labelledby="triage-grid-explorer-heading"
            className="triage-shell__section flex min-h-0 flex-col bg-background"
            data-triage-role="section-surface"
            data-triage-state="default"
            inert={isDepartureDecision ? true : undefined}
          >

            <div
              className="flex min-h-0 flex-1 overflow-hidden"
              data-triage-role="internal-scroll-viewport"
            >
              <HierarchyExplorer
                headingId="triage-grid-explorer-heading"
                activeDragItem={activeDragItem}
                onPendingPlacementInvalidated={handlePendingPlacementInvalidated}
                onPointerGeometryChange={refreshRenderedTarget}
                overTargetId={overTargetId}
                pendingPlacementDropId={
                  placement.snapshot?.release.target.dropId ?? null
                }
                localPlacementResult={localPlacementResult}
                newlyPlacedEntries={newlyPlaced.entries}
                placementSnapshot={placement.snapshot}
                onPlacementCancel={cancelPlacement}
                onPlacementConfirm={() => {
                  void placement.confirm();
                }}
                onPlacementReconcile={() => {
                  void placement.reconcile();
                }}
                onPlacementResultTitleChange={placement.changeResultTitle}
                onPlacementResultTitleContinue={placement.continueResultTitle}
                onPlacementSelectType={placement.selectDirectType}
                targetFeedback={targetFeedback}
              />
            </div>
          </section>

        </DndContext>
      </div>
      {isExternalRemoval ? (
        <ExternalScratchRemovalTransition
          destinationTitle={destinationTitle}
          drafts={externalRemovalDrafts}
          onFinish={finishExternalRemoval}
          removal={externalScratchRemoval}
        />
      ) : null}
    </section>
  );
}
