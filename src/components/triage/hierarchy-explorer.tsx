"use client";

import { useDroppable } from "@dnd-kit/core";
import { Folder, Search } from "lucide-react";
import {
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type UIEvent,
} from "react";
import { GridExplorerSearchResults } from "@/components/triage/grid-explorer-search-results";
import { BitCard } from "@/components/grid/bit-card";
import { NodeCard } from "@/components/grid/node-card";
import { Button } from "@/components/ui/button";
import { useGridData } from "@/hooks/use-grid-data";
import {
  useExplorerRemoteStatus,
} from "@/hooks/use-explorer-remote-status";
import { useTriageDepartureContext } from "@/hooks/use-triage-departure";
import { useGridExplorerSearch } from "@/hooks/use-grid-explorer-search";
import type {
  TriageDragItem,
  TriageTargetFeedback,
} from "@/hooks/use-dnd";
import type { TriagePlacementSnapshot } from "@/hooks/use-triage-placement";
import {
  isTriageNewlyPlaced,
  projectTriageNewlyPlaced,
  useTriageNewlyPlacedUndo,
  type TriageNewlyPlacedProvenance,
  type TriageNewlyPlacedUndoState,
} from "@/hooks/use-triage-newly-placed";
import {
  TriageOperationLockContext,
  type TriageOperationLock,
} from "@/hooks/use-triage-operation-lock";
import { ScratchTitleBlockerContext } from "@/hooks/use-scratch-breakdowns";
import {
  getTriageHierarchyDropId,
  type TriageDropData,
} from "@/lib/grid-dnd";
import { INBOX_TRIAGE_COPY } from "@/lib/copy/inbox-triage";
import { cn } from "@/lib/utils";
import {
  type ExplorerPathStatusState,
  type ExplorerItemIdentity,
  type TriageSessionScrollPosition,
  useTriageStore,
} from "@/stores/triage-store";
import type { Bit, Node } from "@/types";
import type { GridExplorerSearchResult } from "@/lib/utils/grid-explorer-search";

type LocalPlacementResult = ExplorerItemIdentity & {
  pathIds: readonly string[];
};

interface HierarchyExplorerProps {
  headingId?: string;
  activeDragItem: TriageDragItem;
  onPendingPlacementInvalidated: (
    dropId: string,
    focusAfterClose: () => void,
  ) => boolean | void;
  onPointerGeometryChange: (point: { x: number; y: number }) => void;
  overTargetId: string | null;
  pendingPlacementDropId: string | null;
  localPlacementResult: LocalPlacementResult | null;
  newlyPlacedEntries?: readonly TriageNewlyPlacedProvenance[];
  placementSnapshot?: TriagePlacementSnapshot | null;
  onPlacementCancel?: () => void;
  onPlacementConfirm?: () => void;
  onPlacementReconcile?: () => void;
  onPlacementResultTitleChange?: (draft: string) => void;
  onPlacementResultTitleContinue?: () => void;
  onPlacementSelectType?: (type: "node" | "bit") => void;
  targetFeedback: TriageTargetFeedback;
}

type HierarchyCellState =
  | "default"
  | "idle-valid"
  | "valid"
  | "full"
  | "pending-confirmation"
  | "invalid";

type SelectionClearedStatus = Readonly<{
  kind: "selection-cleared";
  title: string;
  columnId: string;
  fallbackPathIds: string[];
}>;
type RenderedExplorerPathStatus =
  | ExplorerPathStatusState
  | SelectionClearedStatus;

const COLUMN_LABELS = ["Home", "Level 1", "Level 2", "Level 3"] as const;
const EMPTY_SCROLL_POSITION: TriageSessionScrollPosition = {
  anchorId: null,
  offset: 0,
};
const EMPTY_NEWLY_PLACED_ENTRIES: readonly TriageNewlyPlacedProvenance[] = [];
const EMPTY_EDIT_BLOCKER_SUBSCRIBE = () => () => undefined;
const EMPTY_EDIT_BLOCKER_SNAPSHOT = () => null;

const UNAVAILABLE_UNDO_LOCK: TriageOperationLock = {
  activeOperation: null,
  acquire: () => false,
  isLocked: () => true,
  release: () => false,
};

type TriageNewlyPlacedUndoController = ReturnType<
  typeof useTriageNewlyPlacedUndo
>;

type UndoFocusPlan = Readonly<{
  nextKey: string | null;
  previousKey: string | null;
  heading: HTMLElement | null;
}>;

function undoKey(type: "node" | "bit", id: string): string {
  return `${type}:${id}`;
}

type NewlyUndoPresentation = Readonly<{
  action: "none" | "undo" | "check-again" | "retry";
  actionLabel: string;
  copy: string;
  disabled: boolean;
  state: string;
}>;

function newlyUndoTemplate(template: string, title: string): string {
  return template.replace("{title}", title);
}

function getNewlyUndoPresentation(
  state: TriageNewlyPlacedUndoState,
  title: string,
): NewlyUndoPresentation {
  const copy = INBOX_TRIAGE_COPY.newlyPlacedUndo;
  if (state.phase === "checking") {
    return {
      action: "undo",
      actionLabel: copy.actions.undo,
      copy: copy.eligibility.checking,
      disabled: true,
      state: "checking",
    };
  }
  if (state.phase === "pending") {
    return {
      action: "undo",
      actionLabel: copy.actions.undo,
      copy: newlyUndoTemplate(copy.operation.pending, title),
      disabled: true,
      state: "pending",
    };
  }
  if (state.phase === "unknown") {
    return {
      action: "check-again",
      actionLabel: copy.actions.checkAgain,
      copy: newlyUndoTemplate(copy.operation.unknown, title),
      disabled: false,
      state: "unknown",
    };
  }
  if (state.phase === "reconciling") {
    return {
      action: "check-again",
      actionLabel: copy.actions.checkAgain,
      copy: newlyUndoTemplate(copy.operation.reconciling, title),
      disabled: true,
      state: "reconciling",
    };
  }
  if (state.phase === "terminal" && state.terminalStatus === "not_applied") {
    return {
      action: "retry",
      actionLabel: copy.actions.retry,
      copy: newlyUndoTemplate(copy.operation.notApplied, title),
      disabled: false,
      state: "not-applied",
    };
  }
  if (state.phase === "success" && state.command !== null) {
    return {
      action: "none",
      actionLabel: copy.actions.undo,
      copy: copy.operation.success.replace(
        "{source}",
        state.command.sourceSnapshot.content,
      ),
      disabled: true,
      state: "success",
    };
  }

  const eligibility = (() => {
    switch (state.reason) {
      case "available":
        return { copy: copy.eligibility.available, state: "available" };
      case "reenabled":
        return { copy: copy.eligibility.reenabled, state: "reenabled" };
      case "result-mutated":
        return { copy: copy.eligibility.resultMutated, state: "result-mutated" };
      case "dependencies":
        return { copy: copy.eligibility.descendants, state: "descendants" };
      case "placement-open":
        return { copy: copy.eligibility.placementOpen, state: "placement-open" };
      case "active-owner":
        return { copy: copy.eligibility.operationLocked, state: "operation-locked" };
      case "dirty-edit":
        return { copy: copy.eligibility.editBlocked, state: "edit-blocked" };
      case "trashed":
        return { copy: copy.eligibility.trashed, state: "scratch-trashed" };
      case "archived":
        return { copy: copy.eligibility.archived, state: "scratch-archived" };
      default:
        return { copy: copy.eligibility.conflict, state: "conflict" };
    }
  })();
  return {
    action: state.terminalStatus === "not_applied" ? "retry" : "undo",
    actionLabel:
      state.terminalStatus === "not_applied"
        ? copy.actions.retry
        : copy.actions.undo,
    copy: eligibility.copy,
    disabled: state.phase !== "available",
    state: eligibility.state,
  };
}

// Ordinary Finder alone adopts the two-state tooltip amendment. Search keeps
// the shared projection and visible rail; terminal copy equality is irrelevant.
function getOrdinaryNewlyUndoPresentation(state: TriageNewlyPlacedUndoState, title: string) {
  const presentation = getNewlyUndoPresentation(state, title);
  const tooltip = (state.phase === "available" && state.reason === "available") ||
    (state.phase === "blocked" && state.reason === "result-mutated" && state.terminalStatus === null);
  return { ...presentation, tooltip: tooltip ? presentation.copy : undefined };
}

function useNewlyUndoActionFocus(state: TriageNewlyPlacedUndoState) {
  const ref = useRef<HTMLButtonElement>(null);
  const previousPhaseRef = useRef(state.phase);
  const previousTerminalStatusRef = useRef(state.terminalStatus);
  useEffect(() => {
    const enteredFocusState =
      (state.phase === "unknown" && previousPhaseRef.current !== "unknown") ||
      (state.phase === "terminal" &&
        (previousPhaseRef.current !== "terminal" ||
          previousTerminalStatusRef.current !== state.terminalStatus));
    previousPhaseRef.current = state.phase;
    previousTerminalStatusRef.current = state.terminalStatus;
    if (enteredFocusState) ref.current?.focus({ preventScroll: true });
  }, [state.phase, state.terminalStatus]);
  return ref;
}

function NewlyUndoStatusRail({
  presentation,
  statusId,
  tooltip = false,
}: {
  presentation: NewlyUndoPresentation;
  tooltip?: boolean;
  statusId: string;
}) {
  const ownsLiveStatus = presentation.state !== "success";
  return (
    <div
      aria-atomic={ownsLiveStatus ? "true" : undefined}
      aria-live={ownsLiveStatus ? "polite" : undefined}
      className={tooltip ? "newly-status-announcement sr-only" : "newly-status-rail"}
      data-undo-state={presentation.state}
      role={ownsLiveStatus ? "status" : undefined}
    >
      <span
        aria-hidden="true"
        className="newly-status-mark"
        data-undo-status-mark={presentation.state}
      />
      <p className="newly-status-reason" id={statusId}>
        {presentation.copy}
      </p>
    </div>
  );
}

function retainUndoRecords<T extends Node | Bit>(
  records: readonly T[],
  retained: readonly T[],
  parentId: string | null,
): T[] {
  const existingIds = new Set(records.map(({ id }) => id));
  return [
    ...records,
    ...retained.filter(
      (record) => record.parentId === parentId && !existingIds.has(record.id),
    ),
  ];
}

const CELL_BASE_CLASS =
  "flex w-full items-center gap-2 rounded-md border border-transparent px-3 py-2 text-left transition-[background-color,border-color,box-shadow,color] touch-action-manipulation cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

const CELL_DROP_ONLY_CLASS =
  "flex w-full items-center gap-2 rounded-md border border-transparent px-3 py-2 text-left transition-[background-color,border-color,box-shadow,color]";

const CELL_STATE_CLASSES: Record<HierarchyCellState, string> = {
  default: "",
  "idle-valid": "ring-1 ring-primary border-border/80 text-foreground",
  valid: "ring-1 ring-primary border-primary bg-accent text-foreground",
  full: "ring-1 ring-muted-foreground border-muted-foreground bg-muted text-muted-foreground",
  "pending-confirmation":
    "border-ring bg-popover text-foreground motion-safe:animate-pulse",
  invalid:
    "border-muted bg-muted/10 text-muted-foreground/50 cursor-not-allowed",
};

function getCandidateType(
  activeDragItem: TriageDragItem,
): "node" | "bit" | "breakdown" | null {
  if (activeDragItem?.kind === "triage-staged-node") return "node";
  if (activeDragItem?.kind === "triage-staged-bit") return "bit";
  if (activeDragItem?.kind === "triage-breakdown") return "breakdown";
  return null;
}

function acceptsCandidate({
  activeDragItem,
  parentNodeId,
  targetNodeLevel,
}: {
  activeDragItem: TriageDragItem;
  parentNodeId: string | null;
  targetNodeLevel: number | null;
}): boolean {
  const candidateType = getCandidateType(activeDragItem);

  if (candidateType === "node") {
    return targetNodeLevel === null || targetNodeLevel < 2;
  }
  if (candidateType === "bit") return parentNodeId !== null;
  if (candidateType === "breakdown") return true;
  return false;
}

function getCellState({
  activeDragItem,
  dropId,
  isAccepted,
  overTargetId,
  pendingPlacementDropId,
  targetFeedback,
}: {
  activeDragItem: TriageDragItem;
  dropId: string;
  isAccepted: boolean;
  overTargetId: string | null;
  pendingPlacementDropId: string | null;
  targetFeedback: TriageTargetFeedback;
}): HierarchyCellState {
  if (pendingPlacementDropId === dropId) return "pending-confirmation";
  if (activeDragItem === null) return "default";
  if (!isAccepted) return "invalid";
  if (targetFeedback?.dropId === dropId) return targetFeedback.state;
  if (overTargetId === dropId) return "valid";
  return "idle-valid";
}

function idsForColumn(nodes: Node[], bits: Bit[] = []): string[] {
  return [...nodes.map(({ id }) => id), ...bits.map(({ id }) => id)];
}

function focusFallback(validPathIds: string[]) {
  const ancestorId = validPathIds.at(-1);
  if (ancestorId !== undefined) {
    const ancestor = Array.from(
      document.querySelectorAll<HTMLElement>("[data-explorer-item-id]"),
    ).find(
      (element) =>
        element.dataset.explorerItemId === ancestorId &&
        element.dataset.explorerItemType === "node",
    );
    if (ancestor !== undefined) {
      ancestor.focus();
      return;
    }
  }

  const headingIndex = validPathIds.length;
  document
    .querySelector<HTMLElement>(
      `[data-testid="hierarchy-column-heading-${headingIndex === 0 ? "home" : `level-${headingIndex}`}"]`,
    )
    ?.focus();
}

function focusInOwningExplorerViewport(
  element: HTMLElement,
  scrollMode: "minimum" | "top" = "minimum",
) {
  element.focus({ preventScroll: true });
  const viewport = element.closest<HTMLElement>(
    "[data-triage-explorer-column]",
  );
  if (viewport === null) return;
  if (scrollMode === "top") {
    viewport.scrollTop = 0;
    return;
  }

  const visibilityOwner =
    element.closest<HTMLElement>("[data-triage-role='placement-affordance']") ??
    element;
  const viewportBounds = viewport.getBoundingClientRect();
  const ownerBounds = visibilityOwner.getBoundingClientRect();
  if (ownerBounds.top < viewportBounds.top) {
    viewport.scrollTop -= viewportBounds.top - ownerBounds.top;
  } else if (ownerBounds.bottom > viewportBounds.bottom) {
    viewport.scrollTop += ownerBounds.bottom - viewportBounds.bottom;
  }
}

function explorerTemplate(
  template: string,
  values: Record<string, string | number>,
): string {
  return Object.entries(values).reduce(
    (copy, [key, value]) => copy.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

function placementTemplate(template: string, snapshot: TriagePlacementSnapshot) {
  return explorerTemplate(template, {
    title:
      snapshot.command?.title ??
      snapshot.resultTitleDraft ??
      snapshot.release.source.title,
    destination: snapshot.release.target.path.join(" → "),
  });
}

function placementReliabilityCopy(snapshot: TriagePlacementSnapshot) {
  const copy = INBOX_TRIAGE_COPY.placementReliability;
  if (snapshot.phase === "pending") return placementTemplate(copy.pending, snapshot);
  if (snapshot.phase === "unknown") return placementTemplate(copy.unknown, snapshot);
  if (snapshot.phase === "reconciling") {
    return placementTemplate(copy.reconciling, snapshot);
  }
  if (snapshot.phase === "success") return placementTemplate(copy.success, snapshot);
  if (snapshot.terminalKind === "not-applied") {
    return placementTemplate(copy.notApplied, snapshot);
  }
  if (snapshot.terminalKind === "stale-source") return copy.staleSource;
  if (snapshot.terminalKind === "stale-target") return copy.staleTarget;
  return null;
}

function explorerPathStatusCopy(status: RenderedExplorerPathStatus): string {
  if (status.kind === "selection-cleared") {
    return explorerTemplate(
      INBOX_TRIAGE_COPY.explorerStatus.path.selectionCleared,
      { title: status.title },
    );
  }
  if (status.kind === "stale-placement") {
    return INBOX_TRIAGE_COPY.explorerStatus.path.stalePlacement;
  }
  if (status.title === null) {
    return explorerTemplate(INBOX_TRIAGE_COPY.explorerStatus.path.invalid, {
      destination: status.destination,
    });
  }
  const template =
    status.kind === "archived"
      ? INBOX_TRIAGE_COPY.explorerStatus.path.archived
      : status.kind === "moved"
        ? INBOX_TRIAGE_COPY.explorerStatus.path.moved
        : INBOX_TRIAGE_COPY.explorerStatus.path.unavailable;
  return explorerTemplate(template, {
    title: status.title,
    destination: status.destination,
  });
}

function ExplorerHeader({
  headingId,
  control,
}: {
  headingId: string;
  control: ReactNode;
}) {
  return (
    <div className="explorer-header triage-shell__section-heading triage-shell__section-heading--explorer" data-triage-role="explorer-header">
      <h2
        aria-label={INBOX_TRIAGE_COPY.sectionNames.gridExplorer}
        className="explorer-header__identity"
        data-triage-role="section-header"
        id={headingId}
        tabIndex={-1}
      >
        <span className="triage-shell__heading-label triage-shell__heading-label--explorer" aria-hidden="true">
          <Folder className="triage-shell__explorer-icon" />
          {INBOX_TRIAGE_COPY.sectionNames.gridExplorer}
        </span>
      </h2>
      <div className="explorer-header__control" data-triage-role="explorer-header-control">{control}</div>
    </div>
  );
}

export function HierarchyExplorer({
  headingId = "triage-grid-explorer-heading",
  activeDragItem,
  onPendingPlacementInvalidated,
  onPointerGeometryChange,
  overTargetId,
  pendingPlacementDropId,
  localPlacementResult,
  newlyPlacedEntries = EMPTY_NEWLY_PLACED_ENTRIES,
  placementSnapshot = null,
  onPlacementCancel,
  onPlacementConfirm,
  onPlacementReconcile,
  onPlacementResultTitleChange,
  onPlacementResultTitleContinue,
  onPlacementSelectType,
  targetFeedback,
}: HierarchyExplorerProps) {
  const search = useGridExplorerSearch();
  const explorerRef = useRef<HTMLDivElement>(null);
  const searchEntryRef = useRef<HTMLButtonElement>(null);
  const previousDragRef = useRef<TriageDragItem>(null);
  const revealedLocalPlacementKeyRef = useRef<string | null>(null);
  const focusedLocalPlacementKeyRef = useRef<string | null>(null);
  const acknowledgedPlacementSuccessRef = useRef<string | null>(null);
  const placementLiveRegionRef = useRef<HTMLParagraphElement>(null);
  const undoLiveRegionRef = useRef<HTMLParagraphElement>(null);
  const announcedUndoSuccessRef = useRef(new Set<string>());
  const focusedRevealKeyRef = useRef<string | null>(null);
  const focusedSelectionClearIdRef = useRef<string | null>(null);
  const mountedRef = useRef(false);
  const [entryFocusRevision, setEntryFocusRevision] = useState(0);
  const operationLock =
    useContext(TriageOperationLockContext) ?? UNAVAILABLE_UNDO_LOCK;
  const titleBlockerHandle = useContext(ScratchTitleBlockerContext);
  const editBlockerSnapshot = useSyncExternalStore(
    titleBlockerHandle?.subscribe ?? EMPTY_EDIT_BLOCKER_SUBSCRIBE,
    titleBlockerHandle?.getSnapshot ?? EMPTY_EDIT_BLOCKER_SNAPSHOT,
    EMPTY_EDIT_BLOCKER_SNAPSHOT,
  );
  const undo = useTriageNewlyPlacedUndo({
    entries: newlyPlacedEntries,
    operationLock,
    placementOpen: placementSnapshot !== null,
    hasDirtyEdit: () =>
      titleBlockerHandle?.hasDirtyEditIntent() ??
      (editBlockerSnapshot === "dirty" ||
        editBlockerSnapshot === "conflicted"),
  });
  const undoFocusPlansRef = useRef(new Map<string, UndoFocusPlan>());
  const searchUndoKeysRef = useRef(new Set<string>());
  const focusedUndoOperationsRef = useRef(new Set<string>());
  const invalidatePendingSearchSelection = search.invalidatePendingSelection;
  const reveal =
    search.revealPresentation?.kind === "revealed"
      ? search.revealPresentation.result
      : null;
  const selectionClearedStatus = useMemo<SelectionClearedStatus | null>(
    () =>
      search.revealPresentation?.kind === "selection-cleared"
        ? {
            kind: "selection-cleared",
            title: search.revealPresentation.title,
            columnId: search.revealPresentation.nodePathIds.at(-1) ?? "home",
            fallbackPathIds: [...search.revealPresentation.nodePathIds],
          }
        : null,
    [search.revealPresentation],
  );
  const selectionClearedId =
    search.revealPresentation?.kind === "selection-cleared"
      ? search.revealPresentation.id
      : null;
  const targetFeedbackRef = useRef(targetFeedback);
  useEffect(() => {
    targetFeedbackRef.current = targetFeedback;
  }, [targetFeedback]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    for (const [key, operation] of undo.operations) {
      if (
        operation.phase !== "success" ||
        operation.command === null ||
        focusedUndoOperationsRef.current.has(operation.command.operationId)
      ) {
        continue;
      }
      if (searchUndoKeysRef.current.has(key)) {
        focusedUndoOperationsRef.current.add(operation.command.operationId);
        continue;
      }
      if (
        !announcedUndoSuccessRef.current.has(operation.command.operationId) &&
        undoLiveRegionRef.current !== null
      ) {
        announcedUndoSuccessRef.current.add(operation.command.operationId);
        undoLiveRegionRef.current.setAttribute("role", "status");
        undoLiveRegionRef.current.setAttribute("aria-live", "polite");
        undoLiveRegionRef.current.setAttribute("aria-atomic", "true");
        undoLiveRegionRef.current.textContent =
          INBOX_TRIAGE_COPY.newlyPlacedUndo.operation.success.replace(
            "{source}",
            operation.command.sourceSnapshot.content,
          );
      }
      focusedUndoOperationsRef.current.add(operation.command.operationId);
      const plan = undoFocusPlansRef.current.get(key);
      undoFocusPlansRef.current.delete(key);
      if (plan === undefined) continue;
      queueMicrotask(() => {
        const cards = Array.from(
          explorerRef.current?.querySelectorAll<HTMLElement>(
            "[data-explorer-item-id][data-explorer-item-type]",
          ) ?? [],
        );
        const find = (targetKey: string | null) =>
          targetKey === null
            ? undefined
            : cards.find(
                (card) =>
                  undoKey(
                    card.dataset.explorerItemType as "node" | "bit",
                    card.dataset.explorerItemId ?? "",
                  ) === targetKey,
              );
        (find(plan.nextKey) ?? find(plan.previousKey) ?? plan.heading)?.focus({
          preventScroll: true,
        });
      });
    }
  }, [undo.operations]);

  function activateUndo(type: "node" | "bit", id: string) {
    const currentCard = Array.from(
      explorerRef.current?.querySelectorAll<HTMLElement>(
        "[data-explorer-item-id][data-explorer-item-type]",
      ) ?? [],
    ).find(
      (card) =>
        card.dataset.explorerItemType === type &&
        card.dataset.explorerItemId === id,
    );
    const section = currentCard?.closest("section");
    if (currentCard === undefined || section == null) return;
    const cards = Array.from(
      section.querySelectorAll<HTMLElement>(
        "[data-explorer-item-id][data-explorer-item-type]",
      ),
    );
    const index = cards.indexOf(currentCard);
    const cardKey = (card: HTMLElement | undefined) =>
      card === undefined
        ? null
        : undoKey(
            card.dataset.explorerItemType as "node" | "bit",
            card.dataset.explorerItemId ?? "",
          );
    const key = undoKey(type, id);
    undoFocusPlansRef.current.set(key, {
      nextKey: cardKey(cards[index + 1]),
      previousKey: cardKey(cards[index - 1]),
      heading: section.querySelector("h3"),
    });
    void undo.activate(type, id).then((applied) => {
      const state = undo.getState(type, id);
      const canStillSucceed =
        state.phase === "unknown" ||
        (state.phase === "terminal" && state.terminalStatus === "not_applied");
      if (!applied && !canStillSucceed) {
        undoFocusPlansRef.current.delete(key);
      }
    });
  }

  function activateSearchResultUndo(
    result: GridExplorerSearchResult,
    action: NewlyUndoPresentation["action"],
  ) {
    const key = undoKey(result.type, result.id);
    const removedIndex = search.results.findIndex(
      ({ key: resultKey }) => resultKey === result.key,
    );
    const provenance = undo.getProvenance(result.type, result.id);
    if (removedIndex < 0 || provenance === null) return;
    searchUndoKeysRef.current.add(key);
    const request =
      action === "check-again"
        ? undo.reconcile(result.type, result.id)
        : action === "retry"
          ? undo.retry(result.type, result.id)
          : undo.activate(result.type, result.id);
    void request.then((applied) => {
      if (applied) {
        search.completeResultUndo({
          removedIndex,
          resultKey: result.key,
          source: provenance.source.snapshot.content,
          title: result.title,
        });
        return;
      }
      const state = undo.getState(result.type, result.id);
      const canStillSucceed =
        state.phase === "unknown" ||
        (state.phase === "terminal" && state.terminalStatus === "not_applied");
      if (!canStillSucceed) searchUndoKeysRef.current.delete(key);
    });
  }

  useEffect(() => {
    let previousScratchId = useTriageStore.getState().selectedScratchId;
    return useTriageStore.subscribe((state) => {
      if (state.selectedScratchId === previousScratchId) return;
      previousScratchId = state.selectedScratchId;
      invalidatePendingSearchSelection();
    });
  }, [invalidatePendingSearchSelection]);

  useEffect(() => {
    if (
      activeDragItem === null ||
      activeDragItem.integrity === "invalidated"
    ) {
      return;
    }
    let pointer: { x: number; y: number } | null = null;
    let frame = 0;
    let cancelled = false;
    const trackMouse = (event: MouseEvent) => {
      pointer = { x: event.clientX, y: event.clientY };
    };
    const trackTouch = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (touch !== undefined) {
        pointer = { x: touch.clientX, y: touch.clientY };
      }
    };
    const clearPointer = () => {
      pointer = null;
    };
    const clearPointerOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") clearPointer();
    };
    const scrollAtEdge = () => {
      if (pointer !== null) onPointerGeometryChange(pointer);
      const feedback = targetFeedbackRef.current;
      if (
        pointer !== null &&
        feedback?.state === "valid" &&
        typeof document.elementsFromPoint === "function"
      ) {
        const pointerTarget = document
          .elementsFromPoint(pointer.x, pointer.y)
          .map((element) =>
            element.closest<HTMLElement>("[data-triage-drop-id]"),
          )
          .find((element) => element !== null);
        // The column drop region is the whole pane; only its row viewport scrolls, so a
        // pointer over the header (outside the viewport bounds) never edge-scrolls.
        const body =
          pointerTarget?.closest<HTMLElement>("[data-triage-explorer-column]") ??
          pointerTarget?.querySelector<HTMLElement>(
            ":scope > [data-triage-explorer-column]",
          ) ??
          null;
        if (
          pointerTarget?.dataset.triageDropId === feedback.dropId &&
          body !== null &&
          body !== undefined &&
          body.scrollHeight > body.clientHeight
        ) {
          const bounds = body.getBoundingClientRect();
          const edge = Math.min(48, bounds.height / 4);
          const topDistance = pointer.y - bounds.top;
          const bottomDistance = bounds.bottom - pointer.y;
          if (topDistance >= 0 && topDistance < edge) {
            body.scrollTop -= Math.ceil(2 + 10 * (1 - topDistance / edge));
          } else if (bottomDistance >= 0 && bottomDistance < edge) {
            body.scrollTop += Math.ceil(
              2 + 10 * (1 - bottomDistance / edge),
            );
          }
        }
      }
    };
    const scheduleFrame = () => {
      let callbackWasSynchronous = true;
      frame = window.requestAnimationFrame(() => {
        if (cancelled) return;
        scrollAtEdge();
        if (!callbackWasSynchronous && !cancelled) scheduleFrame();
      });
      callbackWasSynchronous = false;
    };

    document.addEventListener("mousemove", trackMouse);
    document.addEventListener("mouseleave", clearPointer);
    document.addEventListener("keydown", clearPointerOnEscape);
    document.addEventListener("touchmove", trackTouch, { passive: true });
    document.addEventListener("touchcancel", clearPointer);
    window.addEventListener("blur", clearPointer);
    scheduleFrame();
    return () => {
      cancelled = true;
      pointer = null;
      document.removeEventListener("mousemove", trackMouse);
      document.removeEventListener("mouseleave", clearPointer);
      document.removeEventListener("keydown", clearPointerOnEscape);
      document.removeEventListener("touchmove", trackTouch);
      document.removeEventListener("touchcancel", clearPointer);
      window.removeEventListener("blur", clearPointer);
      window.cancelAnimationFrame(frame);
    };
  }, [activeDragItem, onPointerGeometryChange]);

  const departure = useTriageDepartureContext();
  const explorerPathIds = useTriageStore((state) => state.explorerPathIds);
  const explorerColumnScroll = useTriageStore(
    (state) => state.explorerColumnScroll,
  );
  const setExplorerPathIds = useTriageStore(
    (state) => state.setExplorerPathIds,
  );
  const setExplorerOpenColumnIds = useTriageStore(
    (state) => state.setExplorerOpenColumnIds,
  );
  const setExplorerColumnScroll = useTriageStore(
    (state) => state.setExplorerColumnScroll,
  );
  const reconcileExplorerContext = useTriageStore(
    (state) => state.reconcileExplorerContext,
  );
  const explorerRemoteArrivalIds = useTriageStore(
    (state) => state.explorerRemoteArrivalIds,
  );
  const explorerPathStatus = useTriageStore(
    (state) => state.explorerPathStatus,
  );
  const clearExplorerRemoteArrivals = useTriageStore(
    (state) => state.clearExplorerRemoteArrivals,
  );
  const clearExplorerPathStatus = useTriageStore(
    (state) => state.clearExplorerPathStatus,
  );
  const clearExplorerRemotePresentation = useTriageStore(
    (state) => state.clearExplorerRemotePresentation,
  );
  const setExplorerPathStatus = useTriageStore(
    (state) => state.setExplorerPathStatus,
  );

  useLayoutEffect(() => {
    const previous = previousDragRef.current;
    previousDragRef.current = activeDragItem;
    if (previous === null && activeDragItem !== null) {
      search.interruptForDnd();
    }
  }, [activeDragItem, search]);

  useLayoutEffect(() => {
    if (placementSnapshot !== null && search.mode !== "closed") {
      search.closeSearch();
    }
  }, [placementSnapshot, search]);

  useEffect(() => {
    if (placementSnapshot?.phase === "success") {
      if (
        acknowledgedPlacementSuccessRef.current !==
        placementSnapshot.operationId
      ) {
        acknowledgedPlacementSuccessRef.current = placementSnapshot.operationId;
        if (placementLiveRegionRef.current !== null) {
          placementLiveRegionRef.current.setAttribute("role", "status");
          placementLiveRegionRef.current.setAttribute("aria-live", "polite");
          placementLiveRegionRef.current.setAttribute("aria-atomic", "true");
          placementLiveRegionRef.current.setAttribute(
            "aria-label",
            "Placement result status",
          );
          placementLiveRegionRef.current.textContent =
            placementReliabilityCopy(placementSnapshot) ?? "";
        }
        onPlacementConfirm?.();
      }
    } else if (
      placementSnapshot !== null &&
      placementLiveRegionRef.current !== null
    ) {
      placementLiveRegionRef.current.textContent = "";
      placementLiveRegionRef.current.removeAttribute("role");
      placementLiveRegionRef.current.removeAttribute("aria-live");
      placementLiveRegionRef.current.removeAttribute("aria-atomic");
      placementLiveRegionRef.current.removeAttribute("aria-label");
    }
  }, [onPlacementConfirm, placementSnapshot]);

  useLayoutEffect(() => {
    if (search.mode === "closed" && entryFocusRevision > 0) {
      searchEntryRef.current?.focus({ preventScroll: true });
    }
  }, [entryFocusRevision, search.mode]);

  useEffect(() => {
    const clearSearchOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || search.mode === "closed") return;
      event.preventDefault();
      search.closeSearch();
      if (activeDragItem === null) {
        setEntryFocusRevision((current) => current + 1);
      }
    };
    document.addEventListener("keydown", clearSearchOnEscape, true);
    return () => {
      document.removeEventListener("keydown", clearSearchOnEscape, true);
    };
  }, [activeDragItem, search]);

  useEffect(
    () => () => clearExplorerRemotePresentation(),
    [clearExplorerRemotePresentation],
  );

  const selectedHomeId = explorerPathIds[0] ?? null;
  const selectedL1Id = explorerPathIds[1] ?? null;
  const selectedL2Id = explorerPathIds[2] ?? null;
  const openColumnIdentities = useMemo(
    () => [
      { columnId: "home", parentId: null },
      ...(selectedHomeId === null
        ? []
        : [{ columnId: selectedHomeId, parentId: selectedHomeId }]),
      ...(selectedL1Id === null
        ? []
        : [{ columnId: selectedL1Id, parentId: selectedL1Id }]),
      ...(selectedL2Id === null
        ? []
        : [{ columnId: selectedL2Id, parentId: selectedL2Id }]),
    ],
    [selectedHomeId, selectedL1Id, selectedL2Id],
  );
  const authoritativeRemoteStatus = useExplorerRemoteStatus({
    localPlacementResult,
    openColumns: openColumnIdentities,
    pathIds: explorerPathIds,
  });
  const rootGrid = useGridData(null);
  const level1Grid = useGridData(selectedHomeId);
  const level2Grid = useGridData(selectedL1Id);
  const level3Grid = useGridData(selectedL2Id);

  const retainedUndoRecords = useMemo(() => {
    const nodes: Node[] = [];
    const bits: Bit[] = [];
    for (const [key, operation] of undo.operations) {
      if (
        operation.command === null ||
        !["pending", "unknown", "reconciling"].includes(operation.phase)
      ) {
        continue;
      }
      if (key.startsWith("node:")) {
        nodes.push(operation.command.resultSnapshot as Node);
      } else if (key.startsWith("bit:")) {
        bits.push(operation.command.resultSnapshot as Bit);
      }
    }
    return { bits, nodes };
  }, [undo.operations]);
  const retainedUndoNodesById = useMemo(
    () => new Map(retainedUndoRecords.nodes.map((node) => [node.id, node])),
    [retainedUndoRecords.nodes],
  );

  const rootNodes = useMemo(
    () =>
      retainUndoRecords(
        rootGrid.nodes.filter((node) => node.systemRole === null),
        retainedUndoRecords.nodes,
        null,
      ),
    [retainedUndoRecords.nodes, rootGrid.nodes],
  );
  const level1Nodes = useMemo(
    () =>
      selectedHomeId === null
        ? []
        : retainUndoRecords(
            level1Grid.nodes,
            retainedUndoRecords.nodes,
            selectedHomeId,
          ),
    [level1Grid.nodes, retainedUndoRecords.nodes, selectedHomeId],
  );
  const level1Bits = useMemo(
    () =>
      selectedHomeId === null
        ? []
        : retainUndoRecords(
            level1Grid.bits,
            retainedUndoRecords.bits,
            selectedHomeId,
          ),
    [level1Grid.bits, retainedUndoRecords.bits, selectedHomeId],
  );
  const level2Nodes = useMemo(
    () =>
      selectedL1Id === null
        ? []
        : retainUndoRecords(
            level2Grid.nodes,
            retainedUndoRecords.nodes,
            selectedL1Id,
          ),
    [level2Grid.nodes, retainedUndoRecords.nodes, selectedL1Id],
  );
  const level2Bits = useMemo(
    () =>
      selectedL1Id === null
        ? []
        : retainUndoRecords(
            level2Grid.bits,
            retainedUndoRecords.bits,
            selectedL1Id,
          ),
    [level2Grid.bits, retainedUndoRecords.bits, selectedL1Id],
  );
  const level3Nodes = useMemo(
    () =>
      selectedL2Id === null
        ? []
        : retainUndoRecords(
            level3Grid.nodes,
            retainedUndoRecords.nodes,
            selectedL2Id,
          ),
    [level3Grid.nodes, retainedUndoRecords.nodes, selectedL2Id],
  );
  const level3Bits = useMemo(
    () =>
      selectedL2Id === null
        ? []
        : retainUndoRecords(
            level3Grid.bits,
            retainedUndoRecords.bits,
            selectedL2Id,
          ),
    [level3Grid.bits, retainedUndoRecords.bits, selectedL2Id],
  );

  useLayoutEffect(() => {
    if (localPlacementResult === null) {
      focusedLocalPlacementKeyRef.current = null;
      return;
    }
    const placementKey = `${localPlacementResult.type}:${localPlacementResult.id}`;
    if (focusedLocalPlacementKeyRef.current === placementKey) return;
    const result = Array.from(
      explorerRef.current?.querySelectorAll<HTMLElement>(
        "[data-explorer-item-id]",
      ) ?? [],
    ).find(
      (element) =>
        element.dataset.explorerItemId === localPlacementResult.id &&
        element.dataset.explorerItemType === localPlacementResult.type,
    );
    if (result === undefined) return;
    focusInOwningExplorerViewport(result);
    focusedLocalPlacementKeyRef.current = placementKey;
  }, [
    level1Bits,
    level1Nodes,
    level2Bits,
    level2Nodes,
    level3Bits,
    level3Nodes,
    localPlacementResult,
    rootNodes,
    search.mode,
  ]);

  const selectedHomeNode =
    rootNodes.find(({ id }) => id === selectedHomeId) ?? null;
  const selectedL1Node =
    level1Nodes.find(({ id }) => id === selectedL1Id) ?? null;
  const selectedL2Node =
    level2Nodes.find(({ id }) => id === selectedL2Id) ?? null;

  useLayoutEffect(() => {
    if (reveal === null) {
      focusedRevealKeyRef.current = null;
      return;
    }
    if (
      search.mode !== "closed" ||
      focusedRevealKeyRef.current === reveal.key
    ) {
      return;
    }
    const row = Array.from(
      document.querySelectorAll<HTMLElement>("[data-explorer-item-id]"),
    ).find(
      (element) =>
        element.dataset.explorerItemId === reveal.id &&
        element.dataset.explorerItemType === reveal.type,
    );
    if (row !== undefined) {
      focusedRevealKeyRef.current = reveal.key;
      // Focus without a page scroll, then scroll only the owning column viewport minimally.
      focusInOwningExplorerViewport(row);
    }
  }, [
    level1Bits,
    level1Nodes,
    level2Bits,
    level2Nodes,
    level3Bits,
    level3Nodes,
    reveal,
    rootNodes,
    search.mode,
  ]);

  useEffect(() => {
    if (reveal === null) return;
    const pathMatches =
      reveal.nodePathIds.length === explorerPathIds.length &&
      reveal.nodePathIds.every((id, index) => explorerPathIds[index] === id);
    if (!pathMatches) search.clearReveal();
  }, [explorerPathIds, reveal, search]);

  useLayoutEffect(() => {
    if (selectionClearedStatus === null) {
      focusedSelectionClearIdRef.current = null;
      return;
    }
    if (focusedSelectionClearIdRef.current === selectionClearedId) {
      return;
    }
    focusedSelectionClearIdRef.current = selectionClearedId;
    focusFallback(selectionClearedStatus.fallbackPathIds);
  }, [selectionClearedId, selectionClearedStatus]);

  useEffect(() => {
    if (explorerPathStatus !== null && selectionClearedStatus !== null) {
      search.clearReveal();
    }
  }, [explorerPathStatus, search, selectionClearedStatus]);

  const gridValidation = useMemo(() => {
    if (rootGrid.isLoading) return null;

    const validPathIds: string[] = [];
    if (selectedHomeId === null) return validPathIds;
    if (selectedHomeNode === null) return validPathIds;
    validPathIds.push(selectedHomeId);

    if (level1Grid.isLoading) return null;
    if (selectedL1Id === null) return validPathIds;
    if (selectedL1Node === null) return validPathIds;
    validPathIds.push(selectedL1Id);

    if (level2Grid.isLoading) return null;
    if (selectedL2Id === null) return validPathIds;
    if (selectedL2Node === null) return validPathIds;
    validPathIds.push(selectedL2Id);
    if (level3Grid.isLoading) return null;
    return validPathIds;
  }, [
    level1Grid.isLoading,
    level2Grid.isLoading,
    level3Grid.isLoading,
    rootGrid.isLoading,
    selectedHomeId,
    selectedHomeNode,
    selectedL1Id,
    selectedL1Node,
    selectedL2Id,
    selectedL2Node,
  ]);
  const validation = useMemo(() => {
    const authoritativePath = authoritativeRemoteStatus.validPathIds;
    if (
      !authoritativeRemoteStatus.isReady ||
      authoritativePath === null ||
      gridValidation === null ||
      authoritativePath.length > gridValidation.length ||
      !authoritativePath.every((id, index) => gridValidation[index] === id)
    ) {
      return null;
    }
    const retainedPath = [...authoritativePath];
    while (retainedPath.length < gridValidation.length) {
      const index = retainedPath.length;
      const id = gridValidation[index];
      const retainedNode = retainedUndoNodesById.get(id);
      const expectedParentId = retainedPath.at(-1) ?? null;
      if (
        explorerPathIds[index] !== id ||
        retainedNode?.parentId !== expectedParentId
      ) {
        break;
      }
      retainedPath.push(id);
    }
    return retainedPath;
  }, [
    authoritativeRemoteStatus,
    explorerPathIds,
    gridValidation,
    retainedUndoNodesById,
  ]);

  const visibleItemIdsByColumn = useMemo(() => {
    const columns: Record<string, string[]> = {
      home: idsForColumn(rootNodes),
    };
    if (selectedHomeId !== null) {
      columns[selectedHomeId] = idsForColumn(level1Nodes, level1Bits);
    }
    if (selectedL1Id !== null) {
      columns[selectedL1Id] = idsForColumn(level2Nodes, level2Bits);
    }
    if (selectedL2Id !== null) {
      columns[selectedL2Id] = idsForColumn(level3Nodes, level3Bits);
    }
    return columns;
  }, [
    level1Bits,
    level1Nodes,
    level2Bits,
    level2Nodes,
    level3Bits,
    level3Nodes,
    rootNodes,
    selectedHomeId,
    selectedL1Id,
    selectedL2Id,
  ]);

  useEffect(() => {
    if (validation === null) return;
    const pathWasTrimmed = validation.length < explorerPathIds.length;
    reconcileExplorerContext({
      validPathIds: validation,
      visibleItemIdsByColumn,
    });
    if (pathWasTrimmed) focusFallback(validation);
  }, [
    explorerPathIds,
    reconcileExplorerContext,
    validation,
    visibleItemIdsByColumn,
  ]);

  useEffect(() => {
    if (localPlacementResult === null) {
      revealedLocalPlacementKeyRef.current = null;
      return;
    }
    const placementKey = `${localPlacementResult.type}:${localPlacementResult.id}`;
    if (revealedLocalPlacementKeyRef.current === placementKey) return;
    revealedLocalPlacementKeyRef.current = placementKey;
    const pathIds = [...localPlacementResult.pathIds];
    setExplorerPathIds(pathIds);
    setExplorerOpenColumnIds(["home", ...pathIds]);
  }, [localPlacementResult, setExplorerOpenColumnIds, setExplorerPathIds]);

  function selectPath(pathIds: string[]) {
    if (
      pathIds.length === explorerPathIds.length &&
      pathIds.every((id, index) => id === explorerPathIds[index])
    ) {
      if (selectionClearedStatus !== null) search.clearReveal();
      return;
    }
    search.invalidatePendingSelection();
    const focusTarget =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    departure.requestDeparture({
      id: pathIds.join("/") || "home",
      focus: () => focusTarget?.focus(),
      kind: "path",
      perform: () => {
        search.clearReveal();
        setExplorerPathIds(pathIds);
        setExplorerOpenColumnIds(["home", ...pathIds]);
      },
    });
  }

  const visibleDropIds = useMemo(() => {
    const ids = new Set<string>([
      getTriageHierarchyDropId("body-home"),
      ...rootNodes.map(({ id }) => getTriageHierarchyDropId(id)),
    ]);
    if (selectedHomeNode !== null) {
      ids.add(getTriageHierarchyDropId("body-l1"));
      level1Nodes.forEach(({ id }) => ids.add(getTriageHierarchyDropId(id)));
    }
    if (selectedL1Node !== null) {
      ids.add(getTriageHierarchyDropId("body-l2"));
      level2Nodes.forEach(({ id }) => ids.add(getTriageHierarchyDropId(id)));
    }
    if (selectedL2Node !== null) {
      ids.add(getTriageHierarchyDropId("body-l3"));
      level3Nodes.forEach(({ id }) => ids.add(getTriageHierarchyDropId(id)));
    }
    return ids;
  }, [
    level1Nodes,
    level2Nodes,
    level3Nodes,
    rootNodes,
    selectedHomeNode,
    selectedL1Node,
    selectedL2Node,
  ]);
  const effectivePendingPlacementDropId =
    placementSnapshot?.phase !== "success" &&
    pendingPlacementDropId !== null &&
    visibleDropIds.has(pendingPlacementDropId)
      ? pendingPlacementDropId
      : null;
  const invalidatedPendingDropIdRef = useRef<string | null>(null);
  const [announcementSuppressedPathStatus, setAnnouncementSuppressedPathStatus] =
    useState<ExplorerPathStatusState | null>(null);

  useEffect(() => {
    if (placementSnapshot?.phase === "success") {
      invalidatedPendingDropIdRef.current = null;
      return;
    }
    if (pendingPlacementDropId === null) {
      invalidatedPendingDropIdRef.current = null;
      return;
    }
    if (visibleDropIds.has(pendingPlacementDropId)) {
      invalidatedPendingDropIdRef.current = null;
      return;
    }
    if (
      validation !== null &&
      invalidatedPendingDropIdRef.current !== pendingPlacementDropId
    ) {
      invalidatedPendingDropIdRef.current = pendingPlacementDropId;
      const fallbackId = validation.at(-1);
      const fallbackNode = [selectedHomeNode, selectedL1Node, selectedL2Node]
        .find((node) => node?.id === fallbackId);
      const announcementWasReplaced =
        onPendingPlacementInvalidated(pendingPlacementDropId, () => {
        focusFallback(validation);
        }) === true;
      const nextPathStatus: ExplorerPathStatusState = {
        kind: "stale-placement",
        title: null,
        destination: fallbackNode?.title ?? "Home",
        columnId: fallbackId ?? "home",
        fallbackPathIds: validation,
      };
      setExplorerPathStatus(nextPathStatus);
      // This local presentation state binds live-region suppression to the
      // callback result that replaced this exact stale-placement announcement.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAnnouncementSuppressedPathStatus(
        announcementWasReplaced ? nextPathStatus : null,
      );
    }
  }, [
    onPendingPlacementInvalidated,
    pendingPlacementDropId,
    placementSnapshot?.phase,
    selectedHomeNode,
    selectedL1Node,
    selectedL2Node,
    setExplorerPathStatus,
    validation,
    visibleDropIds,
  ]);

  const pathNodes = [selectedHomeNode, selectedL1Node, selectedL2Node].filter(
    (node): node is Node => node !== null,
  );

  const columns = [
    {
      bits: [] as Bit[],
      columnId: "home",
      isLoading: rootGrid.isLoading,
      nodes: rootNodes,
      parentNode: null,
      selectedNodeId: selectedHomeId,
    },
    {
      bits: level1Bits,
      columnId: selectedHomeId ?? "level-1-closed",
      isLoading: level1Grid.isLoading,
      nodes: level1Nodes,
      parentNode: selectedHomeNode,
      selectedNodeId: selectedL1Id,
    },
    {
      bits: level2Bits,
      columnId: selectedL1Id ?? "level-2-closed",
      isLoading: level2Grid.isLoading,
      nodes: level2Nodes,
      parentNode: selectedL1Node,
      selectedNodeId: selectedL2Id,
    },
    {
      bits: level3Bits,
      columnId: selectedL2Id ?? "level-3-closed",
      isLoading: level3Grid.isLoading,
      nodes: level3Nodes,
      parentNode: selectedL2Node,
      selectedNodeId: null,
    },
  ] as const;

  function closeSearchAndFocusEntry() {
    search.closeSearch();
    setEntryFocusRevision((current) => current + 1);
  }

  async function selectSearchResult(result: GridExplorerSearchResult) {
    const outcome = await search.selectResult(result);
    if (!mountedRef.current || outcome.kind === "stale") return;
    setExplorerPathIds([...outcome.result.nodePathIds]);
    setExplorerOpenColumnIds(["home", ...outcome.result.nodePathIds]);
  }

  return (
    <div
      ref={explorerRef}
      className="flex min-h-0 w-full flex-col rounded-md border border-border/50 bg-card"
      data-testid="hierarchy-explorer"
      data-triage-role="explorer-root"
    >
      {reveal !== null ? (
        <div
          aria-atomic="true"
          aria-live="polite"
          className="explorer-reveal-status"
          data-triage-role="explorer-reveal-status"
          role="status"
        >
          {explorerTemplate(INBOX_TRIAGE_COPY.explorerSearch.status.revealed, {
            title: reveal.title,
            breadcrumb: reveal.breadcrumb,
          })}
        </div>
      ) : null}
      {search.mode !== "active" ? (
        <ExplorerHeader headingId={headingId} control={
        <button
          ref={searchEntryRef}
          className="explorer-search-entry"
          data-triage-role="explorer-search-entry"
          type="button"
          onClick={() => {
            search.openSearch();
          }}
        >
          <Search aria-hidden="true" className="h-3.5 w-3.5" />
          {INBOX_TRIAGE_COPY.explorerSearch.entry}
        </button>
        } />
      ) : null}

      <p ref={placementLiveRegionRef} className="sr-only" />
      <p ref={undoLiveRegionRef} className="sr-only" />

      {search.mode === "active" ? (
        <GridExplorerSearchResults
          renderHeader={(control) => <ExplorerHeader headingId={headingId} control={control} />}
          feedback={search.feedback}
          focusTarget={search.focusTarget}
          query={search.activeQuery ?? ""}
          resultScrollTop={search.resultScrollTop}
          results={search.results}
          status={search.status}
          getResultUndo={(result) => {
            if (undo.getProvenance(result.type, result.id) === null) return null;
            const presentation = getNewlyUndoPresentation(
              undo.getState(result.type, result.id),
              result.title,
            );
            return presentation.action === "none"
              ? null
              : {
                  actionLabel: presentation.actionLabel,
                  copy: presentation.copy,
                  disabled: presentation.disabled,
                  onActivate: () =>
                    activateSearchResultUndo(result, presentation.action),
                  state: presentation.state,
                };
          }}
          onClose={closeSearchAndFocusEntry}
          onFocusInput={search.focusInput}
          onFocusResult={search.focusResult}
          onQueryChange={(query) => {
            search.setQuery(query);
          }}
          onRetry={search.retry}
          onScrollTopChange={search.setResultScrollTop}
          onSelectResult={(result) => void selectSearchResult(result)}
        />
      ) : (
      <div className="flex min-h-0 flex-1 flex-row overflow-x-hidden" data-triage-role="explorer-panes">
        {columns.map((column, index) => {
          const parentPath = ["Home", ...pathNodes.slice(0, index).map(({ title }) => title)];
          const targetParentPath =
            index === 0 ? [] : parentPath.slice(0, -1);
          const projectedNodes = projectTriageNewlyPlaced(
            newlyPlacedEntries,
            "node",
            column.nodes,
          );
          const projectedBits = projectTriageNewlyPlaced(
            newlyPlacedEntries,
            "bit",
            column.bits,
          );
          const sectionDropId = getTriageHierarchyDropId(
            index === 0 ? "body-home" : `body-l${index}`,
          );
          const columnOwnsPlacement =
            placementSnapshot !== null &&
            (placementSnapshot.release.target.dropId === sectionDropId ||
              column.nodes.some(
                ({ id }) =>
                  getTriageHierarchyDropId(id) ===
                  placementSnapshot.release.target.dropId,
              ));
          return (
            <ExplorerColumn
              feedbackSource={getCandidateType(activeDragItem)}
              key={COLUMN_LABELS[index]}
              bodyState={getSectionBodyState({
                activeDragItem,
                index,
                overTargetId,
                parentNode: column.parentNode,
                pendingPlacementDropId: effectivePendingPlacementDropId,
                targetFeedback,
              })}
              columnId={column.columnId}
              hasRightBorder={index < COLUMN_LABELS.length - 1}
              isDimmed={index > 0 && column.parentNode === null}
              itemIds={idsForColumn(projectedNodes, projectedBits)}
              label={COLUMN_LABELS[index]}
              onGoHome={index === 0 ? () => selectPath([]) : undefined}
              pathStatusAnnouncementSuppressed={
                explorerPathStatus === announcementSuppressedPathStatus
              }
              pathStatus={
                explorerPathStatus?.columnId === column.columnId &&
                explorerPathStatus.fallbackPathIds.length === index
                  ? explorerPathStatus
                  : selectionClearedStatus?.columnId === column.columnId &&
                      selectionClearedStatus.fallbackPathIds.length === index
                    ? selectionClearedStatus
                    : null
              }
              remoteArrivals={
                explorerRemoteArrivalIds[column.columnId] ?? []
              }
              scrollPosition={
                explorerColumnScroll[column.columnId] ?? EMPTY_SCROLL_POSITION
              }
              onScrollPositionChange={setExplorerColumnScroll}
              onClearRemoteArrivals={clearExplorerRemoteArrivals}
              onDismissPathStatus={(status) => {
                if (status.kind === "selection-cleared") {
                  search.clearReveal();
                } else {
                  clearExplorerPathStatus();
                }
                focusFallback(status.fallbackPathIds);
              }}
              parentNode={column.parentNode}
              targetParentPath={targetParentPath}
            >
              {columnOwnsPlacement ? (
                placementSnapshot.phase === "success" ? null : (
                  <PlacementAffordance
                    snapshot={placementSnapshot}
                    onCancel={onPlacementCancel}
                    onConfirm={onPlacementConfirm}
                    onReconcile={onPlacementReconcile}
                    onResultTitleChange={onPlacementResultTitleChange}
                    onResultTitleContinue={onPlacementResultTitleContinue}
                    onSelectType={onPlacementSelectType}
                  />
                )
              ) : null}
              {index > 0 && column.parentNode === null ? null : (
                <HierarchyItemList
                  activeDragItem={activeDragItem}
                  bits={projectedBits}
                  isLoading={column.isLoading}
                  nodes={projectedNodes}
                  newlyPlacedEntries={newlyPlacedEntries}
                  undo={undo}
                  onUndo={activateUndo}
                  onSelectNode={
                    index < 3
                      ? (nodeId) =>
                          selectPath([
                            ...explorerPathIds.slice(0, index),
                            nodeId,
                          ])
                      : undefined
                  }
                  overTargetId={overTargetId}
                  parentPath={parentPath}
                  parentColor={column.parentNode?.color ?? "hsl(221, 83%, 53%)"}
                  pendingPlacementDropId={effectivePendingPlacementDropId}
                  reveal={reveal}
                  selectedNodeId={column.selectedNodeId}
                  targetFeedback={targetFeedback}
                />
              )}
            </ExplorerColumn>
          );
        })}
      </div>
      )}
    </div>
  );
}

function PlacementAffordance({
  snapshot,
  onCancel,
  onConfirm,
  onReconcile,
  onResultTitleChange,
  onResultTitleContinue,
  onSelectType,
}: {
  snapshot: TriagePlacementSnapshot;
  onCancel?: () => void;
  onConfirm?: () => void;
  onReconcile?: () => void;
  onResultTitleChange?: (draft: string) => void;
  onResultTitleContinue?: () => void;
  onSelectType?: (type: "node" | "bit") => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const resultTitleInputRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const reconcileRef = useRef<HTMLButtonElement>(null);
  const retryRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const descriptionId = useId();
  const errorId = useId();
  const nodeReasonId = useId();
  const bitReasonId = useId();
  const locked =
    snapshot.phase === "pending" ||
    snapshot.phase === "unknown" ||
    snapshot.phase === "reconciling";

  useLayoutEffect(() => {
    let focusOwner: HTMLElement | null = null;
    if (snapshot.phase === "result-title") {
      focusOwner = resultTitleInputRef.current;
    } else if (snapshot.phase === "direct-selection") {
      focusOwner = headingRef.current;
    } else if (snapshot.phase === "confirmation") {
      focusOwner = headingRef.current;
    } else if (snapshot.phase === "unknown") {
      focusOwner = reconcileRef.current;
    } else if (snapshot.phase === "pending") {
      focusOwner = confirmRef.current;
    } else if (snapshot.phase === "reconciling") {
      focusOwner = reconcileRef.current;
    } else if (snapshot.terminalKind === "not-applied") {
      focusOwner = retryRef.current;
    } else if (snapshot.phase === "terminal") {
      focusOwner = cancelRef.current;
    }
    if (focusOwner !== null) focusInOwningExplorerViewport(focusOwner, "top");
  }, [snapshot.phase, snapshot.terminalKind]);

  const reliabilityCopy = placementReliabilityCopy(snapshot);
  const reliabilityState =
    snapshot.phase === "terminal" ? snapshot.terminalKind : snapshot.phase;
  const titleCopy = INBOX_TRIAGE_COPY.placementTitleLimits;
  const resultTypeLabel = snapshot.resultType === "node" ? "Node" : "Bit";
  const resultTitleLimit = snapshot.resultType === "node" ? 100 : 200;
  const resultTitleDraft = snapshot.resultTitleDraft ?? "";
  const resultTitleEmpty = resultTitleDraft.trim().length === 0;
  const resultTitleTooLong = resultTitleDraft.length > resultTitleLimit;
  const resultTitleValid = !resultTitleEmpty && !resultTitleTooLong;
  const directSourceLength = snapshot.release.source.title.length;
  const nodeLimitUnavailable = directSourceLength > 100;
  const bitLimitUnavailable = directSourceLength > 200;
  const nodeTargetUnavailable =
    snapshot.release.target.level !== null &&
    snapshot.release.target.level >= 2;
  const bitTargetUnavailable = snapshot.release.target.parentId === null;
  const titleStep =
    snapshot.phase === "result-title"
      ? "staged-result-title"
      : snapshot.phase === "direct-selection"
        ? "direct-type-limit"
        : undefined;

  const cancelPlacement = () => {
    if (!locked) onCancel?.();
  };
  const placementHeading = (
          <h3
            ref={headingRef}
            className="placement-confirm-heading text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-triage-role="placement-heading"
            tabIndex={-1}
          >
            <span aria-hidden="true">[</span>
            Confirm placement
            <span aria-hidden="true">]</span>
          </h3>
  );
  const placementResultType = (
    <p className="placement-result-type placement-staged-type mt-2 text-xs font-medium text-foreground" data-triage-role="placement-result-type">
      {snapshot.resultType === "node" ? "Node" : "Bit"}
    </p>
  );
  const placementDetails = (
    <>
          <p
            className="placement-confirm-source mt-1 break-words text-xs text-foreground"
            data-triage-role="placement-source"
            data-placement-result-title={
              snapshot.resultTitleDraft === null ? undefined : "true"
            }
          >
            {snapshot.resultTitleDraft ?? snapshot.release.source.title}
          </p>
          {snapshot.resultTitleDraft !== null ? (
            <p
              className="placement-source-truth break-words text-[11px] text-muted-foreground"
              data-placement-source-title="true"
            >
              Source: {snapshot.release.source.title}
            </p>
          ) : null}
          {snapshot.release.target.isFull ? (
            <p className="placement-full-target-warning mt-2 text-xs font-semibold text-muted-foreground" data-triage-role="placement-full-target-warning" role="status">
              No available grid cell in this target
            </p>
          ) : null}
    </>
  );
  const placementHeader = (
    <div className="placement-header" data-triage-role="placement-header">
      {placementHeading}
      <Button
        aria-label={INBOX_TRIAGE_COPY.placementPresentation.cancelPlacement}
        aria-disabled={locked || undefined}
        className="placement-header-close"
        size="sm" type="button" onClick={cancelPlacement}
      ><span aria-hidden="true">[×]</span></Button>
    </div>
  );
  const placementReliability = (
          <div className="placement-reliability-slot" data-triage-role="placement-reliability-slot">
            {reliabilityCopy === null ? null : (
            <div
              aria-atomic="true"
              aria-label="Placement status"
              aria-live="polite"
              className="placement-reliability-rail"
              role="status"
            >
              <span
                aria-hidden="true"
                className="placement-reliability-mark"
                data-placement-reliability-mark={reliabilityState}
              />
              <span>{reliabilityCopy}</span>
            </div>
            )}
          </div>
  );
  const placementCommand = (
    <>
            {snapshot.phase === "unknown" || snapshot.phase === "reconciling" ? (
              <Button
                ref={reconcileRef}
                aria-disabled={snapshot.phase === "reconciling" || undefined}
                className="placement-reliability-action"
                size="sm"
                type="button"
                onClick={() => {
                  if (snapshot.phase === "unknown") onReconcile?.();
                }}
              >
                {INBOX_TRIAGE_COPY.placementReliability.actions.checkAgain}
              </Button>
            ) : snapshot.phase === "confirmation" || snapshot.phase === "pending" ? (
              <Button
                ref={confirmRef}
                aria-disabled={locked || undefined}
                className="placement-reliability-action placement-confirm"
                data-triage-role="placement-confirm"
                disabled={snapshot.release.target.isFull}
                size="sm"
                type="button"
                onClick={() => {
                  if (!locked && snapshot.phase === "confirmation") {
                    onConfirm?.();
                  }
                }}
              >
                {INBOX_TRIAGE_COPY.placementPresentation.stagedConfirm}
              </Button>
            ) : snapshot.terminalKind === "not-applied" ? (
              <Button
                ref={retryRef}
                className="placement-reliability-action placement-reliability-retry"
                size="sm"
                type="button"
                onClick={onConfirm}
              >
                {INBOX_TRIAGE_COPY.placementReliability.actions.retry}
              </Button>
            ) : null}
    </>
  );
  const placementCancel = (
            snapshot.phase === "terminal" ||
            snapshot.phase === "confirmation" ||
            snapshot.phase === "pending" ||
            snapshot.phase === "unknown" ||
            snapshot.phase === "reconciling" ? (
              <Button
                ref={cancelRef}
                aria-disabled={locked || undefined}
                className="placement-reliability-action placement-cancel"
                data-triage-role="placement-cancel"
                size="sm"
                type="button"
                variant="outline"
                onClick={cancelPlacement}
              >
                {INBOX_TRIAGE_COPY.placementReliability.actions.cancel}
              </Button>
            ) : null
  );
  const placementActions = (
    <div className="placement-reliability-actions mt-3 flex gap-2">
      {snapshot.phase === "confirmation" || snapshot.phase === "pending"
        ? <>{placementCancel}{placementCommand}</>
        : <>{placementCommand}{placementCancel}</>}
    </div>
  );

  return (
    <section
      aria-label="Placement"
      className={cn(
        "placement-affordance m-2 rounded-md border border-primary/50 bg-accent/30 p-3",
        snapshot.release.kind === "direct" ? "placement-direct-shell" : "placement-staged-shell",
      )}
      data-placement-phase={snapshot.phase}
      data-placement-frame={snapshot.phase !== "result-title" ? "true" : undefined}
      data-placement-reliability={reliabilityCopy === null ? undefined : reliabilityState}
      data-placement-title-step={titleStep}
      data-triage-role="placement-affordance"
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        if (locked) {
          event.preventDefault();
          return;
        }
        event.preventDefault();
        cancelPlacement();
      }}
    >
      {snapshot.phase === "result-title" ? (
        <div className="placement-result-title-shell">
          <p className="placement-result-title-eyebrow">
            {titleCopy.resultTitle.eyebrow}
          </p>
          <h3 className="placement-result-title-heading">
            {explorerTemplate(titleCopy.resultTitle.heading, {
              type: resultTypeLabel,
            })}
          </h3>
          <p className="placement-result-title-source break-words">
            {snapshot.release.source.title}
          </p>
          <p id={descriptionId} className="placement-result-title-explanation">
            {explorerTemplate(titleCopy.resultTitle.explanation, {
              count: snapshot.release.source.title.length,
              limit: resultTitleLimit,
              type: resultTypeLabel,
            })}
          </p>
          <label className="placement-result-title-label">
            {titleCopy.resultTitle.label}
            <input
              ref={resultTitleInputRef}
              aria-describedby={`${descriptionId} ${errorId}`}
              aria-invalid={!resultTitleValid}
              className="placement-result-title-input"
              type="text"
              value={resultTitleDraft}
              onChange={(event) => onResultTitleChange?.(event.target.value)}
            />
          </label>
          <div className="placement-result-title-validation">
            <span
              id={errorId}
              className="placement-result-title-error"
            >
              {resultTitleEmpty
                ? titleCopy.resultTitle.emptyError
                : resultTitleTooLong
                  ? explorerTemplate(titleCopy.resultTitle.overLimitError, {
                      limit: resultTitleLimit,
                    })
                  : ""}
            </span>
            <span className="placement-result-title-count">
              {explorerTemplate(titleCopy.resultTitle.counter, {
                count: resultTitleDraft.length,
                limit: resultTitleLimit,
              })}
            </span>
          </div>
          <div className="placement-result-title-actions">
            <Button
              className="placement-result-title-continue"
              disabled={!resultTitleValid}
              size="sm"
              type="button"
              onClick={onResultTitleContinue}
            >
              {titleCopy.resultTitle.actions.continue}
            </Button>
            <Button size="sm" type="button" variant="outline" onClick={onCancel}>
              {titleCopy.resultTitle.actions.cancel}
            </Button>
          </div>
        </div>
      ) : snapshot.phase === "direct-selection" ? (
        <>
          <div className="placement-header" data-triage-role="placement-header">
          <h3
            ref={headingRef}
            className="placement-direct-eyebrow placement-direct-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            tabIndex={-1}
          >
            <span aria-hidden="true">[</span>
            {titleCopy.direct.eyebrow}
            <span aria-hidden="true">]</span>
          </h3>
          <Button
            aria-label={INBOX_TRIAGE_COPY.placementPresentation.cancelPlacement}
            className="placement-header-close" size="sm" type="button" onClick={cancelPlacement}
          ><span aria-hidden="true">[×]</span></Button>
          </div>
          <div className="placement-direct-limit-shell placement-frame-body">
          <p className="placement-result-title-source break-words">
            {snapshot.release.source.title}
          </p>
          <div className="placement-direct-types" aria-label="Select placement type">
            <Button
              aria-describedby={nodeLimitUnavailable ? nodeReasonId : undefined}
              className="placement-direct-action placement-direct-type"
              disabled={nodeLimitUnavailable || nodeTargetUnavailable}
              size="sm"
              type="button"
              onClick={() => onSelectType?.("node")}
            >
              {titleCopy.direct.actions.node}
            </Button>
            <Button
              aria-describedby={bitLimitUnavailable ? bitReasonId : undefined}
              className="placement-direct-action placement-direct-type"
              disabled={bitLimitUnavailable || bitTargetUnavailable}
              size="sm"
              type="button"
              onClick={() => onSelectType?.("bit")}
            >
              {titleCopy.direct.actions.bit}
            </Button>
            <Button
              ref={cancelRef}
              className="placement-direct-action placement-direct-cancel"
              size="sm"
              type="button"
              variant="outline"
              onClick={cancelPlacement}
            >
              {titleCopy.direct.actions.cancel}
            </Button>
          </div>
          {nodeLimitUnavailable || bitLimitUnavailable ? (
            <div className="placement-direct-reasons">
              {nodeLimitUnavailable ? (
                <div className="placement-direct-type-option">
                  <p id={nodeReasonId} className="placement-direct-type-reason">
                    {explorerTemplate(titleCopy.direct.nodeReason, {
                      count: directSourceLength,
                    })}
                  </p>
                </div>
              ) : null}
              {bitLimitUnavailable ? (
                <div className="placement-direct-type-option">
                  <p id={bitReasonId} className="placement-direct-type-reason">
                    {explorerTemplate(titleCopy.direct.bitReason, {
                      count: directSourceLength,
                    })}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
          {nodeLimitUnavailable && bitLimitUnavailable ? (
            <p className="placement-direct-limit-summary">
              {titleCopy.direct.neitherAvailable}
            </p>
          ) : null}
          </div>
        </>
      ) : (
        <>
          {placementHeader}
              <div className="placement-frame-body">
              <div className="placement-staged-summary-row" data-triage-role="placement-staged-summary-row">
                <div className="placement-staged-information" data-triage-role="placement-information">
                  {placementDetails}
                </div>
                {placementActions}
              </div>
              <div className="placement-staged-type-row" data-triage-role="placement-type-row">
                {placementResultType}
              </div>
              {placementReliability}
              </div>
        </>
      )}
    </section>
  );
}

function getSectionBodyState({
  activeDragItem,
  index,
  overTargetId,
  parentNode,
  pendingPlacementDropId,
  targetFeedback,
}: {
  activeDragItem: TriageDragItem;
  index: number;
  overTargetId: string | null;
  parentNode: Node | null;
  pendingPlacementDropId: string | null;
  targetFeedback: TriageTargetFeedback;
}): HierarchyCellState {
  if (index > 0 && parentNode === null) return "default";
  const dropId = getTriageHierarchyDropId(
    index === 0 ? "body-home" : `body-l${index}`,
  );
  return getCellState({
    activeDragItem,
    dropId,
    isAccepted: acceptsCandidate({
      activeDragItem,
      parentNodeId: parentNode?.id ?? null,
      targetNodeLevel: parentNode?.level ?? null,
    }),
    overTargetId,
    pendingPlacementDropId,
    targetFeedback,
  });
}

function ExplorerColumn({
  feedbackSource,
  bodyState,
  children,
  columnId,
  hasRightBorder,
  isDimmed,
  itemIds,
  label,
  onGoHome,
  pathStatus,
  pathStatusAnnouncementSuppressed,
  remoteArrivals,
  onClearRemoteArrivals,
  onDismissPathStatus,
  onScrollPositionChange,
  parentNode,
  scrollPosition,
  targetParentPath,
}: {
  feedbackSource: ReturnType<typeof getCandidateType>;
  bodyState: HierarchyCellState;
  children: ReactNode;
  columnId: string;
  hasRightBorder: boolean;
  isDimmed: boolean;
  itemIds: string[];
  label: (typeof COLUMN_LABELS)[number];
  onGoHome?: () => void;
  pathStatus: RenderedExplorerPathStatus | null;
  pathStatusAnnouncementSuppressed: boolean;
  remoteArrivals: ExplorerItemIdentity[];
  onClearRemoteArrivals: (columnId: string) => void;
  onDismissPathStatus: (status: RenderedExplorerPathStatus) => void;
  onScrollPositionChange: (
    columnId: string,
    position: TriageSessionScrollPosition,
  ) => void;
  parentNode: Node | null;
  scrollPosition: TriageSessionScrollPosition;
  targetParentPath: string[];
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const sectionIndex = COLUMN_LABELS.indexOf(label);
  const sectionDropId = getTriageHierarchyDropId(
    sectionIndex === 0 ? "body-home" : `body-l${sectionIndex}`,
  );
  // A column with no selected parent stays disabled: no droppable and no DOM drop hooks.
  const dropDisabled = sectionIndex > 0 && parentNode === null;
  const { setNodeRef } = useDroppable({
    id: sectionDropId,
    disabled: dropDisabled,
    data: {
      kind: "triage-hierarchy-drop",
      dropId: sectionDropId,
      parentNodeId: parentNode?.id ?? null,
      targetNodeLevel: parentNode?.level ?? null,
      targetTitle: parentNode?.title ?? "Home",
      targetParentPath,
    } satisfies TriageDropData,
  });
  const sectionDropData = {
    kind: "triage-hierarchy-drop",
    dropId: sectionDropId,
    parentNodeId: parentNode?.id ?? null,
    targetNodeLevel: parentNode?.level ?? null,
    targetTitle: parentNode?.title ?? "Home",
    targetParentPath,
  } satisfies TriageDropData;
  const itemIdsKey = itemIds.join("\u0000");

  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (body === null || scrollPosition.anchorId === null) return;
    const anchor = Array.from(
      body.querySelectorAll<HTMLElement>("[data-explorer-item-id]"),
    ).find(
      (element) =>
        element.dataset.explorerItemId === scrollPosition.anchorId,
    );
    if (anchor === undefined) return;

    const delta =
      anchor.getBoundingClientRect().top -
      body.getBoundingClientRect().top -
      scrollPosition.offset;
    if (delta !== 0) body.scrollTop += delta;
  }, [itemIdsKey, scrollPosition.anchorId, scrollPosition.offset]);

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    const body = event.currentTarget;
    if (body.scrollTop <= 0 && remoteArrivals.length > 0) {
      onClearRemoteArrivals(columnId);
    }
    const bodyTop = body.getBoundingClientRect().top;
    const firstVisible = Array.from(
      body.querySelectorAll<HTMLElement>("[data-explorer-item-id]"),
    ).find((element) => element.getBoundingClientRect().bottom > bodyTop);
    const nextPosition =
      firstVisible === undefined
        ? EMPTY_SCROLL_POSITION
        : {
            anchorId: firstVisible.dataset.explorerItemId ?? null,
            offset: firstVisible.getBoundingClientRect().top - bodyTop,
          };
    if (
      nextPosition.anchorId !== scrollPosition.anchorId ||
      nextPosition.offset !== scrollPosition.offset
    ) {
      onScrollPositionChange(columnId, nextPosition);
    }
  }

  const headingTestId =
    sectionIndex === 0
      ? "hierarchy-column-heading-home"
      : `hierarchy-column-heading-level-${sectionIndex}`;

  return (
    <section
      ref={setNodeRef}
      aria-labelledby={`${headingTestId}-label`}
      data-triage-role="explorer-pane"
      data-explorer-dimmed={isDimmed ? "true" : undefined}
      className={cn(
        "flex min-w-0 flex-1 flex-col bg-background",
        hasRightBorder && "border-r border-border/50",
        isDimmed && "bg-muted/30 border-border/50",
        CELL_STATE_CLASSES[bodyState],
      )}
      data-triage-drop-id={dropDisabled ? undefined : sectionDropId}
      data-triage-hierarchy-drop={dropDisabled ? undefined : JSON.stringify(sectionDropData)}
      data-triage-target-state={bodyState}
      data-triage-feedback-source={feedbackSource ?? undefined}
      data-triage-unavailable={
        (feedbackSource === "node" && parentNode !== null && parentNode.level >= 2) ||
        (feedbackSource === "bit" && sectionIndex === 0) ? "true" : undefined
      }
    >
      <div className="border-b border-border/50 bg-muted/30 px-3 py-2" data-triage-role="explorer-column-header">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <h3
            ref={headingRef}
            className="font-mono text-[10px] font-medium uppercase text-muted-foreground"
            data-testid={headingTestId}
            data-triage-role="explorer-column-label"
            id={`${headingTestId}-label`}
            tabIndex={-1}
          >
            {onGoHome === undefined ? label : (
              <button className="explorer-home-entry" type="button" onClick={onGoHome}>{label}</button>
            )}
          </h3>
          {remoteArrivals.length > 0 ? (
            <button
              aria-label={explorerTemplate(
                INBOX_TRIAGE_COPY.explorerStatus.actions.showNewIn,
                { level: label },
              )}
              className="explorer-remote-count"
              data-triage-role="explorer-remote-count"
              type="button"
              onClick={() => {
                const body = bodyRef.current;
                const target = Array.from(
                  body?.querySelectorAll<HTMLElement>(
                    "[data-explorer-item-id]",
                  ) ?? [],
                ).find((element) =>
                  remoteArrivals.some(
                    (identity) =>
                      element.dataset.explorerItemId === identity.id &&
                      element.dataset.explorerItemType === identity.type,
                  ),
                );
                onClearRemoteArrivals(columnId);
                (target ?? headingRef.current)?.focus({ preventScroll: true });
                if (body !== null) body.scrollTop = 0;
              }}
            >
              {remoteArrivals.length === 1
                ? INBOX_TRIAGE_COPY.explorerStatus.arrival.one
                : explorerTemplate(
                    INBOX_TRIAGE_COPY.explorerStatus.arrival.many,
                    { count: remoteArrivals.length },
                  )}
            </button>
          ) : null}
        </div>
      </div>
      {pathStatus !== null ? (
        <div
          aria-atomic={
            pathStatus.kind === "stale-placement" &&
            pathStatusAnnouncementSuppressed
              ? undefined
              : "true"
          }
          aria-live={
            pathStatus.kind === "stale-placement" &&
            pathStatusAnnouncementSuppressed
              ? undefined
              : "polite"
          }
          className="explorer-path-status"
          role={
            pathStatus.kind === "stale-placement" &&
            pathStatusAnnouncementSuppressed
              ? undefined
              : "status"
          }
        >
          <span>{explorerPathStatusCopy(pathStatus)}</span>
          <button
            className="explorer-status-action"
            type="button"
            onClick={() => onDismissPathStatus(pathStatus)}
          >
            {INBOX_TRIAGE_COPY.explorerStatus.actions.dismiss}
          </button>
        </div>
      ) : null}
      <div
        ref={bodyRef}
        className={cn(
          "min-h-0 flex-1 overflow-y-auto p-2",
          isDimmed && "bg-muted/30",
        )}
        data-testid={`hierarchy-section-body-${sectionIndex === 0 ? "home" : `l${sectionIndex}`}`}
        data-triage-explorer-column="true"
        data-triage-role="explorer-viewport"
        onScroll={handleScroll}
      >
        {children}
      </div>
    </section>
  );
}

function HierarchyItemList({
  activeDragItem,
  bits,
  isLoading,
  nodes,
  newlyPlacedEntries,
  undo,
  onUndo,
  onSelectNode,
  overTargetId,
  parentPath,
  parentColor,
  pendingPlacementDropId,
  reveal,
  selectedNodeId,
  targetFeedback,
}: {
  activeDragItem: TriageDragItem;
  bits: Bit[];
  isLoading: boolean;
  nodes: Node[];
  newlyPlacedEntries: readonly TriageNewlyPlacedProvenance[];
  undo: TriageNewlyPlacedUndoController;
  onUndo: (type: "node" | "bit", id: string) => void;
  onSelectNode?: (nodeId: string) => void;
  overTargetId: string | null;
  parentPath: string[];
  parentColor: string;
  pendingPlacementDropId: string | null;
  reveal: GridExplorerSearchResult | null;
  selectedNodeId?: string | null;
  targetFeedback: TriageTargetFeedback;
}) {
  if (!isLoading && nodes.length === 0 && bits.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4" data-triage-role="explorer-empty">
        <div className="font-sans text-xs text-muted-foreground/50">
          No items in this grid
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-1" data-triage-role="explorer-card-list">
      {nodes.map((node) => (
        <NodeDropCell
          key={node.id}
          activeDragItem={activeDragItem}
          isSelected={selectedNodeId === node.id}
          isRevealed={reveal?.type === "node" && reveal.id === node.id}
          node={node}
          isNewlyPlaced={isTriageNewlyPlaced(newlyPlacedEntries, "node", node.id)}
          undo={undo}
          onUndo={onUndo}
          onSelectNode={onSelectNode}
          overTargetId={overTargetId}
          parentPath={parentPath}
          pendingPlacementDropId={pendingPlacementDropId}
          targetFeedback={targetFeedback}
        />
      ))}
      {bits.length > 0 ? (
        <div className="flex flex-col gap-0.5" data-triage-role="explorer-bit-list">
            {bits.map((bit) => (
              <BitContextRow
                key={bit.id}
                bit={bit}
                isRevealed={reveal?.type === "bit" && reveal.id === bit.id}
                isNewlyPlaced={isTriageNewlyPlaced(newlyPlacedEntries, "bit", bit.id)}
                undo={undo}
                onUndo={onUndo}
                parentColor={parentColor}
              />
            ))}
        </div>
      ) : null}
    </div>
  );
}

function NodeDropCell({
  activeDragItem,
  isSelected,
  isRevealed,
  isNewlyPlaced,
  node,
  undo,
  onUndo,
  onSelectNode,
  overTargetId,
  parentPath,
  pendingPlacementDropId,
  targetFeedback,
}: {
  activeDragItem: TriageDragItem;
  isSelected: boolean;
  isRevealed: boolean;
  isNewlyPlaced: boolean;
  node: Node;
  undo: TriageNewlyPlacedUndoController;
  onUndo: (type: "node" | "bit", id: string) => void;
  onSelectNode?: (nodeId: string) => void;
  overTargetId: string | null;
  parentPath: string[];
  pendingPlacementDropId: string | null;
  targetFeedback: TriageTargetFeedback;
}) {
  const undoState = undo.getState("node", node.id);
  const undoPresentation = getOrdinaryNewlyUndoPresentation(undoState, node.title);
  const undoStatusId = useId();
  const undoActionRef = useNewlyUndoActionFocus(undoState);
  const dropId = getTriageHierarchyDropId(node.id);
  const dropData = {
    kind: "triage-hierarchy-drop",
    dropId,
    parentNodeId: node.id,
    targetNodeLevel: node.level,
    targetTitle: node.title,
    targetParentPath: parentPath,
  } satisfies TriageDropData;
  const { setNodeRef } = useDroppable({
    id: dropId,
    data: dropData,
  });
  const state = getCellState({
    activeDragItem,
    dropId,
    isAccepted: acceptsCandidate({
      activeDragItem,
      parentNodeId: node.id,
      targetNodeLevel: node.level,
    }),
    overTargetId,
    pendingPlacementDropId,
    targetFeedback,
  });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        onSelectNode === undefined ? CELL_DROP_ONLY_CLASS : CELL_BASE_CLASS,
        activeDragItem === null && onSelectNode !== undefined && "hover:bg-muted hover:text-foreground",
        CELL_STATE_CLASSES[state],
      )}
      data-triage-drop-id={dropId}
      data-triage-hierarchy-drop={JSON.stringify(dropData)}
      data-triage-target-state={state}
      data-triage-feedback-source={getCandidateType(activeDragItem) ?? undefined}
      data-triage-unavailable={getCandidateType(activeDragItem) === "node" && node.level >= 2 ? "true" : undefined}
      data-triage-paint-suppressed={activeDragItem?.kind === "triage-staged-node" && node.level === 2 ? "unavailable" : undefined}
      data-triage-role="explorer-node-target"
    >
      <div
        className={cn(isNewlyPlaced && "newly-card-shell")}
        data-triage-role="explorer-card-shell"
        data-undo-state={isNewlyPlaced ? undoPresentation.state : undefined}
      >
        <NodeCard
          presentation="inbox-explorer"
          aria-current={isSelected ? "true" : undefined}
          aria-disabled={state === "invalid"}
          aria-label={`Select Node: ${node.title}`}
          className={cn(
            isSelected && "bg-accent text-foreground ring-1 ring-primary",
            isRevealed && "explorer-revealed-row",
          )}
          data-explorer-item-id={node.id}
          data-explorer-item-type="node"
          data-triage-drop-id={dropId}
          data-triage-hierarchy-drop={JSON.stringify(dropData)}
          data-triage-target-state={state}
          isNewlyPlaced={isNewlyPlaced}
          node={node}
          onClick={() => {
            undo.acknowledgeReenabled("node", node.id);
            onSelectNode?.(node.id);
          }}
          tabIndex={onSelectNode === undefined ? -1 : 0}
          undoActionRef={undoActionRef}
          undo={
            isNewlyPlaced && undoPresentation.action !== "none"
              ? {
                  describedBy: undoStatusId,
                  disabled: undoPresentation.disabled,
                  label: undoPresentation.actionLabel,
                  onActivate: () => {
                    if (undoPresentation.action === "check-again") {
                      void undo.reconcile("node", node.id);
                    } else if (undoPresentation.action === "retry") {
                      void undo.retry("node", node.id);
                    } else {
                      onUndo("node", node.id);
                    }
                  },
                  reason: undoState.reason,
                  tooltip: undoPresentation.tooltip,
                }
              : undefined
          }
        />
        {isNewlyPlaced ? (
          <NewlyUndoStatusRail
            presentation={undoPresentation}
            tooltip={undoPresentation.tooltip !== undefined}
            statusId={undoStatusId}
          />
        ) : null}
      </div>
    </div>
  );
}

function BitContextRow({
  bit,
  isRevealed,
  isNewlyPlaced,
  undo,
  onUndo,
  parentColor,
}: {
  bit: Bit;
  isRevealed: boolean;
  isNewlyPlaced: boolean;
  undo: TriageNewlyPlacedUndoController;
  onUndo: (type: "node" | "bit", id: string) => void;
  parentColor: string;
}) {
  const undoState = undo.getState("bit", bit.id);
  const undoPresentation = getOrdinaryNewlyUndoPresentation(undoState, bit.title);
  const undoStatusId = useId();
  const undoActionRef = useNewlyUndoActionFocus(undoState);
  return (
    <div
      className={cn(isNewlyPlaced && "newly-card-shell")}
      data-undo-state={isNewlyPlaced ? undoPresentation.state : undefined}
      data-triage-role="explorer-bit-wrapper"
    >
      <BitCard
        presentation="inbox-explorer"
        aria-label={`Bit: ${bit.title}`}
        bit={bit}
        chunkStats={{ completed: 0, total: 0 }}
        className={cn(
          isRevealed && "explorer-revealed-row",
        )}
        data-explorer-item-id={bit.id}
        data-explorer-item-type="bit"
        isNewlyPlaced={isNewlyPlaced}
        onClick={() => undo.acknowledgeReenabled("bit", bit.id)}
        parentColor={parentColor}
        tabIndex={-1}
        undoActionRef={undoActionRef}
        undo={
          isNewlyPlaced && undoPresentation.action !== "none"
            ? {
                describedBy: undoStatusId,
                disabled: undoPresentation.disabled,
                label: undoPresentation.actionLabel,
                onActivate: () => {
                  if (undoPresentation.action === "check-again") {
                    void undo.reconcile("bit", bit.id);
                  } else if (undoPresentation.action === "retry") {
                    void undo.retry("bit", bit.id);
                  } else {
                    onUndo("bit", bit.id);
                  }
                },
                reason: undoState.reason,
                tooltip: undoPresentation.tooltip,
              }
            : undefined
        }
      />
      {isNewlyPlaced ? (
        <NewlyUndoStatusRail
          presentation={undoPresentation}
          tooltip={undoPresentation.tooltip !== undefined}
          statusId={undoStatusId}
        />
      ) : null}
    </div>
  );
}
