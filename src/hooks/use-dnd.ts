"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { toast } from "sonner";
import { toastCopy } from "@/lib/copy/feedback";
import { dropReportedFailure } from "@/lib/db/write-failure";
import { showToast } from "@/lib/feedback/toast";
import { isCalendarDropData } from "@/lib/calendar-dnd";
import {
  getDataStore,
  type DataStore,
  type StageCandidateCommand,
  type StageCandidateResult,
  type UnstageCandidateCommand,
  type UnstageCandidateResult,
} from "@/lib/db/datastore";
import {
  getTriageBitZoneDropId,
  getTriageNodeZoneDropId,
  getTriageRemoveDropId,
  isGridDropData,
  isTriageDropData,
  type TriageDropData,
} from "@/lib/grid-dnd";
import { findNearestEmptyCell } from "@/lib/utils/bfs";
import {
  getStaticBlockedCells,
  isCellBlocked,
} from "@/lib/utils/breadcrumb-zone";
import type { CandidateCommandOutcome } from "@/hooks/use-staged-candidates";
import type { RepositoryOperationStatus } from "@/lib/db/schema";
import type { TriageOperationLock } from "@/hooks/use-triage-operation-lock";
import type { TriagePlacementRelease } from "@/hooks/use-triage-placement";

export type DragActiveItem = {
  id: string;
  type: "node" | "bit" | "chunk";
  parentId?: string;
  title: string;
} | null;

export type TriageDragKind =
  | "triage-breakdown"
  | "triage-staged-node"
  | "triage-staged-bit";

type TriageDragSourceBase = {
  id: string;
  integrity: "current" | "invalidated";
  label: string;
  scratchId: string;
  sourceBreakdownId: string;
  sourceVersion: number;
  sourceLifecycle: "active";
};

export type TriageDragSnapshot =
  | (TriageDragSourceBase & {
      kind: "triage-breakdown";
    })
  | (TriageDragSourceBase & {
      kind: "triage-staged-node" | "triage-staged-bit";
      candidateVersion: number;
      candidateLifecycle: "staged";
      resultType: "node" | "bit";
    });

export type TriageActiveDragItem = TriageDragSnapshot | null;

export type TriageTargetFeedback = {
  dropId: string;
  state: "valid" | "invalid" | "full";
} | null;

export type TriageDragItem = {
  kind: TriageDragKind;
  id: string;
  integrity?: "current" | "invalidated";
  label: string;
  scratchId?: string;
  sourceBreakdownId?: string;
  sourceVersion?: number;
  sourceLifecycle?: "active";
  candidateVersion?: number;
  candidateLifecycle?: "staged";
  resultType?: "node" | "bit";
} | null;

export type TriageDropIntent =
  | {
      kind: "stage";
      resultType: "node" | "bit";
      source: Extract<TriageDragSnapshot, { kind: "triage-breakdown" }>;
    }
  | {
      kind: "unstage";
      source: Extract<
        TriageDragSnapshot,
        { kind: "triage-staged-node" | "triage-staged-bit" }
      >;
    }
  | {
      kind: "placement";
      source: TriageDragSnapshot;
      target: Extract<TriageDropData, { kind: "triage-hierarchy-drop" }>;
    };

const TRIAGE_BREAKDOWN_UNSTAGE_DROP_ID = "triage-remove-drop:breakdown";

const isTriageRemoveCandidate = (id: unknown) =>
  id === getTriageRemoveDropId() || id === TRIAGE_BREAKDOWN_UNSTAGE_DROP_ID;

// `pointerWithin` orders overlapping candidates by mean distance to the rect corners, not by
// stacking, so a wide Remove bar can lose to the taller subsection it overlaps. The Remove and
// Return-to-Breakdown targets keep priority wherever they overlap (stable partition: every
// other candidate keeps its order).
export const triageInteractionCollisionDetection: CollisionDetection = (args) => {
  const candidates = pointerWithin(args).filter(
    (candidate) =>
      candidate.id === getTriageNodeZoneDropId() ||
      candidate.id === getTriageBitZoneDropId() ||
      isTriageRemoveCandidate(candidate.id) ||
      (typeof candidate.id === "string" &&
        candidate.id.startsWith("triage-hierarchy:")),
  );
  return [
    ...candidates.filter((candidate) => isTriageRemoveCandidate(candidate.id)),
    ...candidates.filter((candidate) => !isTriageRemoveCandidate(candidate.id)),
  ];
};

type PendingNodeMove = {
  itemId: string;
  itemType: "node" | "bit";
  itemTitle: string;
  targetNodeId: string;
  targetNodeTitle: string;
} | null;

type PendingAncestorMove = {
  itemId: string;
  itemType: "node" | "bit";
  itemTitle: string;
  targetNodeId: string | null;
  targetNodeTitle: string;
} | null;

type ConflictState = {
  open: boolean;
  parentBitId: string | null;
  parentDeadline: number;
  parentDeadlineAllDay: boolean;
  pendingChunkId: string | null;
  pendingTimestamp: number | null;
};

const CLOSED_CONFLICT_STATE: ConflictState = {
  open: false,
  parentBitId: null,
  parentDeadline: Date.now(),
  parentDeadlineAllDay: false,
  pendingChunkId: null,
  pendingTimestamp: null,
};

function isTriageDragKind(value: unknown): value is TriageDragKind {
  return (
    value === "triage-breakdown" ||
    value === "triage-staged-node" ||
    value === "triage-staged-bit"
  );
}

function readTriageDragItem(value: unknown): TriageDragSnapshot | null {
  if (
    typeof value !== "object" ||
    value === null ||
    !("kind" in value) ||
    !("id" in value) ||
    !("label" in value) ||
    !("scratchId" in value) ||
    !("sourceBreakdownId" in value) ||
    !("sourceVersion" in value) ||
    !("sourceLifecycle" in value) ||
    !isTriageDragKind(value.kind) ||
    typeof value.id !== "string" ||
    typeof value.label !== "string" ||
    typeof value.scratchId !== "string" ||
    typeof value.sourceBreakdownId !== "string" ||
    typeof value.sourceVersion !== "number" ||
    !Number.isInteger(value.sourceVersion) ||
    value.sourceVersion < 1 ||
    value.sourceLifecycle !== "active"
  ) {
    return null;
  }

  const base: TriageDragSourceBase = {
    id: value.id,
    integrity: "current",
    label: value.label,
    scratchId: value.scratchId,
    sourceBreakdownId: value.sourceBreakdownId,
    sourceVersion: value.sourceVersion,
    sourceLifecycle: "active",
  };

  if (value.kind === "triage-breakdown") {
    return { kind: value.kind, ...base };
  }

  if (
    !("candidateVersion" in value) ||
    !("candidateLifecycle" in value) ||
    !("resultType" in value) ||
    typeof value.candidateVersion !== "number" ||
    !Number.isInteger(value.candidateVersion) ||
    value.candidateVersion < 1 ||
    value.candidateLifecycle !== "staged" ||
    (value.resultType !== "node" && value.resultType !== "bit") ||
    (value.kind === "triage-staged-node" && value.resultType !== "node") ||
    (value.kind === "triage-staged-bit" && value.resultType !== "bit")
  ) {
    return null;
  }

  return {
    kind: value.kind,
    ...base,
    candidateVersion: value.candidateVersion,
    candidateLifecycle: value.candidateLifecycle,
    resultType: value.resultType,
  };
}

function isSameTriageDragSnapshot(
  activation: TriageDragSnapshot,
  current: TriageDragSnapshot,
): boolean {
  if (
    activation.kind !== current.kind ||
    activation.id !== current.id ||
    activation.label !== current.label ||
    activation.scratchId !== current.scratchId ||
    activation.sourceBreakdownId !== current.sourceBreakdownId ||
    activation.sourceVersion !== current.sourceVersion ||
    activation.sourceLifecycle !== current.sourceLifecycle
  ) {
    return false;
  }

  if (
    activation.kind === "triage-breakdown" ||
    current.kind === "triage-breakdown"
  ) {
    return true;
  }

  return (
    activation.candidateVersion === current.candidateVersion &&
    activation.candidateLifecycle === current.candidateLifecycle &&
    activation.resultType === current.resultType
  );
}

function acceptsHierarchyTarget(
  source: TriageDragSnapshot,
  target: Extract<TriageDropData, { kind: "triage-hierarchy-drop" }>,
): boolean {
  if (source.kind === "triage-staged-node") {
    return target.targetNodeLevel === null || target.targetNodeLevel < 2;
  }
  if (source.kind === "triage-staged-bit") {
    return target.parentNodeId !== null;
  }
  return true;
}

async function readExpectedAncestorIds(
  dataStore: DataStore,
  parentNodeId: string | null,
): Promise<string[] | null> {
  const reversed: string[] = [];
  const visited = new Set<string>();
  let currentId = parentNodeId;

  while (currentId !== null) {
    if (visited.has(currentId)) return null;
    visited.add(currentId);
    const node = await dataStore.getNode(currentId);
    if (node === undefined || node.deletedAt !== null) return null;
    reversed.push(node.id);
    currentId = node.parentId;
  }

  return reversed.reverse();
}

function readRenderedHierarchyTarget(
  point: { x: number; y: number },
): Extract<TriageDropData, { kind: "triage-hierarchy-drop" }> | null {
  if (typeof document.elementsFromPoint !== "function") return null;

  for (const element of document.elementsFromPoint(point.x, point.y)) {
    const target = element.closest<HTMLElement>(
      "[data-triage-hierarchy-drop]",
    );
    const serialized = target?.dataset.triageHierarchyDrop;
    if (serialized === undefined) continue;
    try {
      const data: unknown = JSON.parse(serialized);
      if (
        isTriageDropData(data) &&
        data.kind === "triage-hierarchy-drop" &&
        "dropId" in data &&
        typeof data.dropId === "string" &&
        "parentNodeId" in data &&
        (typeof data.parentNodeId === "string" || data.parentNodeId === null) &&
        "targetNodeLevel" in data &&
        (typeof data.targetNodeLevel === "number" ||
          data.targetNodeLevel === null) &&
        "targetTitle" in data &&
        typeof data.targetTitle === "string" &&
        "targetParentPath" in data &&
        Array.isArray(data.targetParentPath) &&
        data.targetParentPath.every((segment) => typeof segment === "string")
      ) {
        return data;
      }
    } catch {
      continue;
    }
  }
  return null;
}

const triageDragInvalidationListeners = new Set<
  (snapshot: TriageDragSnapshot) => void
>();

export function invalidateTriageDragSource(value: unknown): void {
  const snapshot = readTriageDragItem(value);
  if (snapshot === null) return;

  triageDragInvalidationListeners.forEach((listener) => listener(snapshot));
}

export function classifyTriageDropIntent(
  source: TriageDragSnapshot,
  target: TriageDropData,
): TriageDropIntent | null {
  if (
    source.kind === "triage-breakdown" &&
    (target.kind === "triage-node-zone-drop" ||
      target.kind === "triage-bit-zone-drop")
  ) {
    return {
      kind: "stage",
      resultType: target.kind === "triage-node-zone-drop" ? "node" : "bit",
      source,
    };
  }

  if (
    (source.kind === "triage-staged-node" ||
      source.kind === "triage-staged-bit") &&
    target.kind === "triage-remove-drop"
  ) {
    return { kind: "unstage", source };
  }

  if (target.kind === "triage-hierarchy-drop") {
    return { kind: "placement", source, target };
  }

  return null;
}

export function useTriageDnd(
  selectedScratchId: string | null,
  {
    beginPlacement,
    focusUnstagedSource,
    isPlacementOpen,
    operationLock,
    reconcileStageCandidate,
    reconcileUnstageCandidate,
    stageCandidate,
    unstageCandidate,
  }: {
    beginPlacement: (release: TriagePlacementRelease) => boolean;
    focusUnstagedSource: (sourceBreakdownId: string) => void;
    isPlacementOpen: () => boolean;
    operationLock: TriageOperationLock;
    reconcileStageCandidate: (
      command: StageCandidateCommand,
    ) => Promise<CandidateCommandOutcome<StageCandidateResult>>;
    reconcileUnstageCandidate: (
      command: UnstageCandidateCommand,
    ) => Promise<CandidateCommandOutcome<UnstageCandidateResult>>;
    stageCandidate: (
      command: StageCandidateCommand,
    ) => Promise<CandidateCommandOutcome<StageCandidateResult>>;
    unstageCandidate: (
      command: UnstageCandidateCommand,
    ) => Promise<CandidateCommandOutcome<UnstageCandidateResult>>;
  },
): {
  sensors: ReturnType<typeof useSensors>;
  collisionDetection: CollisionDetection;
  activeDragItem: TriageActiveDragItem;
  handleDragStart: (event: DragStartEvent) => void;
  handleDragEnd: (event: DragEndEvent) => void;
  handleDragCancel: () => void;
  handleDragOver: (event: DragOverEvent) => void;
  overTargetId: string | null;
  refreshRenderedTarget: (point: { x: number; y: number }) => void;
  targetFeedback: TriageTargetFeedback;
  /** One read-only check of a held unknown Stage or Unstage; never a resend. */
  checkUnknownOperation: (operationId: string) => Promise<void>;
} {
  const [activeDragItem, setActiveDragItem] =
    useState<TriageActiveDragItem>(null);
  const [overTargetId, setOverTargetId] = useState<string | null>(null);
  const [targetFeedback, setTargetFeedback] =
    useState<TriageTargetFeedback>(null);
  const activationSnapshotRef = useRef<TriageDragSnapshot | null>(null);
  const dragCancelledRef = useRef(false);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const feedbackRequestRef = useRef(0);
  const feedbackIdentityRef = useRef<string | null>(null);
  const nonHierarchyFeedbackRef = useRef<string | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const snapshot = readTriageDragItem(event.active.data.current);
    const isCurrentScratch =
      !isPlacementOpen() &&
      !operationLock.isLocked() &&
      snapshot?.scratchId === selectedScratchId;
    activationSnapshotRef.current = isCurrentScratch ? snapshot : null;
    dragCancelledRef.current = false;
    feedbackRequestRef.current += 1;
    feedbackIdentityRef.current = null;
    nonHierarchyFeedbackRef.current = null;
    setOverTargetId(null);
    setTargetFeedback(null);
    setActiveDragItem(isCurrentScratch ? snapshot : null);
  };

  const clearDragTarget = useCallback(() => {
    feedbackRequestRef.current += 1;
    feedbackIdentityRef.current = null;
    nonHierarchyFeedbackRef.current = null;
    setOverTargetId(null);
    setTargetFeedback(null);
  }, []);

  const updateRenderedTarget = useCallback((point: { x: number; y: number }) => {
    const source = activationSnapshotRef.current;
    if (
      source === null ||
      dragCancelledRef.current ||
      source.scratchId !== selectedScratchId ||
      pointerRef.current === null
    ) {
      clearDragTarget();
      return false;
    }
    const target = readRenderedHierarchyTarget(point);
    if (target === null) {
      feedbackRequestRef.current += 1;
      feedbackIdentityRef.current = null;
      setOverTargetId(nonHierarchyFeedbackRef.current);
      setTargetFeedback(null);
      return false;
    }

    nonHierarchyFeedbackRef.current = null;
    setOverTargetId(target.dropId);
    const targetIdentity = JSON.stringify([
      target.dropId,
      target.parentNodeId,
      target.targetNodeLevel,
      target.targetTitle,
      target.targetParentPath,
    ]);
    if (feedbackIdentityRef.current === targetIdentity) return true;
    feedbackIdentityRef.current = targetIdentity;
    if (!acceptsHierarchyTarget(source, target)) {
      feedbackRequestRef.current += 1;
      setTargetFeedback({ dropId: target.dropId, state: "invalid" });
      return true;
    }

    const request = feedbackRequestRef.current + 1;
    feedbackRequestRef.current = request;
    setTargetFeedback(null);
    void getDataStore()
      .then((dataStore) => dataStore.getGridOccupancy(target.parentNodeId))
      .then((occupancy) => {
        if (
          feedbackRequestRef.current !== request ||
          activationSnapshotRef.current !== source
        ) {
          return;
        }
        const position = findNearestEmptyCell(
          occupancy,
          0,
          0,
          getStaticBlockedCells(),
        );
        setTargetFeedback({
          dropId: target.dropId,
          state: position === null ? "full" : "valid",
        });
      })
      .catch(() => {
        if (feedbackRequestRef.current === request) clearDragTarget();
      });
    return true;
  }, [clearDragTarget, selectedScratchId]);

  // A Stage or Unstage whose request and automatic check both failed stays held with the lock
  // (SPEC §Durable Staging, Unknown recovery). It is checked again only read-only, on the item's
  // `?` or once in the background when its Scratch is removed elsewhere; it is never resent.
  const heldUnknownRef = useRef(
    new Map<
      string,
      {
        scratchId: string | null;
        checking: boolean;
        backgroundChecked: boolean;
        run: () => Promise<boolean>;
      }
    >(),
  );

  // The Scratch selected right now, for a command that ends after its Scratch already left.
  const selectedScratchIdRef = useRef(selectedScratchId);
  useEffect(() => {
    selectedScratchIdRef.current = selectedScratchId;
  }, [selectedScratchId]);

  const hold = (
    operationId: string,
    run: () => Promise<CandidateCommandOutcome<{ status: RepositoryOperationStatus }>>,
    onTerminal: (status: RepositoryOperationStatus) => void,
  ) => {
    const scratchId = selectedScratchId;
    heldUnknownRef.current.set(operationId, {
      scratchId,
      checking: false,
      backgroundChecked: false,
      run: async () => {
        const outcome = await run();
        if ("outcome" in outcome) return false;
        heldUnknownRef.current.delete(operationId);
        operationLock.release(operationId, outcome.status);
        onTerminal(outcome.status);
        return true;
      },
    });
    // Its Scratch was removed elsewhere while the command was out: the effect below already ran,
    // so the one background check happens now.
    if (selectedScratchIdRef.current !== scratchId) {
      const held = heldUnknownRef.current.get(operationId);
      if (held !== undefined) {
        held.backgroundChecked = true;
        void checkUnknownOperation(operationId);
      }
    }
  };

  const finishStage = async (command: StageCandidateCommand): Promise<void> => {
    let outcome = await stageCandidate(command);
    if ("outcome" in outcome) {
      outcome = await reconcileStageCandidate(command);
    }
    if ("outcome" in outcome) {
      hold(command.operationId, () => reconcileStageCandidate(command), () => {});
      return;
    }
    operationLock.release(command.operationId, outcome.status);
  };

  const finishUnstage = async (
    command: UnstageCandidateCommand,
  ): Promise<void> => {
    let outcome = await unstageCandidate(command);
    if ("outcome" in outcome) {
      outcome = await reconcileUnstageCandidate(command);
    }
    const onTerminal = (status: RepositoryOperationStatus) => {
      if (status === "applied" || status === "already_applied") {
        focusUnstagedSource(command.sourceBreakdownId);
      }
    };
    if ("outcome" in outcome) {
      hold(command.operationId, () => reconcileUnstageCandidate(command), onTerminal);
      return;
    }
    operationLock.release(command.operationId, outcome.status);
    onTerminal(outcome.status);
  };

  const checkUnknownOperation = async (operationId: string): Promise<void> => {
    const held = heldUnknownRef.current.get(operationId);
    if (held === undefined || held.checking) return;
    held.checking = true;
    try {
      await held.run();
    } finally {
      held.checking = false;
    }
  };

  // The selected Scratch left while a command is held (removed elsewhere; selecting another
  // Scratch is refused while the lock is held): one background check, never retried on its own.
  useEffect(() => {
    for (const [operationId, held] of heldUnknownRef.current) {
      if (held.scratchId !== selectedScratchId && !held.backgroundChecked) {
        held.backgroundChecked = true;
        void checkUnknownOperation(operationId);
      }
    }
  }, [selectedScratchId]);

  useEffect(() => {
    const cancelOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || activationSnapshotRef.current === null) {
        return;
      }

      dragCancelledRef.current = true;
      activationSnapshotRef.current = null;
      setActiveDragItem(null);
      pointerRef.current = null;
      clearDragTarget();
    };

    document.addEventListener("keydown", cancelOnEscape);
    const cancelOnInvalidation = (snapshot: TriageDragSnapshot) => {
      const activationSnapshot = activationSnapshotRef.current;
      if (
        activationSnapshot === null ||
        !isSameTriageDragSnapshot(activationSnapshot, snapshot)
      ) {
        return;
      }

      dragCancelledRef.current = true;
      pointerRef.current = null;
      clearDragTarget();
      setActiveDragItem({
        ...activationSnapshot,
        integrity: "invalidated",
      });
    };
    triageDragInvalidationListeners.add(cancelOnInvalidation);

    const trackMouse = (event: MouseEvent) => {
      const point = { x: event.clientX, y: event.clientY };
      pointerRef.current = point;
      if (activationSnapshotRef.current !== null) {
        updateRenderedTarget(point);
      }
    };
    const trackTouch = (event: TouchEvent) => {
      const touch = event.touches[0] ?? event.changedTouches[0];
      if (touch === undefined) return;
      const point = { x: touch.clientX, y: touch.clientY };
      pointerRef.current = point;
      if (activationSnapshotRef.current !== null) {
        updateRenderedTarget(point);
      }
    };
    const clearPointerTarget = () => {
      pointerRef.current = null;
      if (activationSnapshotRef.current !== null) clearDragTarget();
    };
    document.addEventListener("mousedown", trackMouse);
    document.addEventListener("mousemove", trackMouse);
    document.addEventListener("mouseup", trackMouse);
    document.addEventListener("mouseleave", clearPointerTarget);
    document.addEventListener("touchstart", trackTouch, { passive: true });
    document.addEventListener("touchmove", trackTouch, { passive: true });
    document.addEventListener("touchend", trackTouch);
    document.addEventListener("touchcancel", clearPointerTarget);
    window.addEventListener("blur", clearPointerTarget);

    return () => {
      document.removeEventListener("keydown", cancelOnEscape);
      document.removeEventListener("mousedown", trackMouse);
      document.removeEventListener("mousemove", trackMouse);
      document.removeEventListener("mouseup", trackMouse);
      document.removeEventListener("mouseleave", clearPointerTarget);
      document.removeEventListener("touchstart", trackTouch);
      document.removeEventListener("touchmove", trackTouch);
      document.removeEventListener("touchend", trackTouch);
      document.removeEventListener("touchcancel", clearPointerTarget);
      window.removeEventListener("blur", clearPointerTarget);
      triageDragInvalidationListeners.delete(cancelOnInvalidation);
    };
  }, [clearDragTarget, updateRenderedTarget]);

  const handleDragOver = (event: DragOverEvent) => {
    const source = activationSnapshotRef.current;
    if (
      source === null ||
      dragCancelledRef.current ||
      source.scratchId !== selectedScratchId
    ) {
      clearDragTarget();
      return;
    }

    if (
      pointerRef.current !== null &&
      updateRenderedTarget(pointerRef.current)
    ) {
      return;
    }

    const eventTarget = event.over?.data.current;
    if (
      !isTriageDropData(eventTarget) ||
      eventTarget.kind === "triage-hierarchy-drop"
    ) {
      clearDragTarget();
      return;
    }

    const dropId = event.over?.id == null ? null : String(event.over.id);
    const matchesExpectedDropId =
      eventTarget.kind === "triage-node-zone-drop"
        ? dropId === getTriageNodeZoneDropId()
        : eventTarget.kind === "triage-bit-zone-drop"
          ? dropId === getTriageBitZoneDropId()
          : dropId === getTriageRemoveDropId() ||
            dropId === TRIAGE_BREAKDOWN_UNSTAGE_DROP_ID;
    const intent = classifyTriageDropIntent(source, eventTarget);
    const isStagedRootFeedback =
      source.kind !== "triage-breakdown" &&
      (eventTarget.kind === "triage-node-zone-drop" ||
        eventTarget.kind === "triage-bit-zone-drop");

    if (
      dropId === null ||
      !matchesExpectedDropId ||
      (intent === null && !isStagedRootFeedback)
    ) {
      clearDragTarget();
      return;
    }

    nonHierarchyFeedbackRef.current = dropId;
    setOverTargetId(dropId);
    setTargetFeedback(null);
  };

  const handleDragCancel = () => {
    dragCancelledRef.current = true;
    activationSnapshotRef.current = null;
    pointerRef.current = null;
    setActiveDragItem(null);
    clearDragTarget();
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const currentDragItem = readTriageDragItem(event.active.data.current);
    const activationSnapshot = activationSnapshotRef.current;
    const eventDropData = event.over?.data.current;
    const renderedTarget =
      pointerRef.current === null
        ? null
        : readRenderedHierarchyTarget(pointerRef.current);
    const dropData =
      renderedTarget ??
      (pointerRef.current !== null &&
      isTriageDropData(eventDropData) &&
      eventDropData.kind === "triage-hierarchy-drop"
        ? null
        : eventDropData);

    activationSnapshotRef.current = null;
    pointerRef.current = null;
    setActiveDragItem(null);
    clearDragTarget();

    if (
      dragCancelledRef.current ||
      activationSnapshot === null ||
      currentDragItem === null ||
      !isSameTriageDragSnapshot(activationSnapshot, currentDragItem) ||
      activationSnapshot.scratchId !== selectedScratchId ||
      !isTriageDropData(dropData)
    ) {
      dragCancelledRef.current = false;
      return;
    }

    dragCancelledRef.current = false;
    const intent = classifyTriageDropIntent(activationSnapshot, dropData);
    if (intent === null) return;
    const dragItem = intent.source;

    if (
      selectedScratchId !== null &&
      intent.kind === "stage"
    ) {
      const command: StageCandidateCommand = {
        operationId: crypto.randomUUID(),
        candidateId: crypto.randomUUID(),
        scratchBitId: selectedScratchId,
        sourceBreakdownId: dragItem.sourceBreakdownId,
        sourceExpectedVersion: dragItem.sourceVersion,
        resultType: intent.resultType,
      };
      if (!operationLock.acquire("stage", command.operationId)) return;
      await finishStage(command);
      return;
    }

    if (
      selectedScratchId !== null &&
      intent.kind === "placement" &&
      dragItem.kind === "triage-breakdown"
    ) {
      const target = intent.target;
      const dataStore = await getDataStore();
      const occupancy = await dataStore.getGridOccupancy(
        target.parentNodeId,
      );
      const position = findNearestEmptyCell(
        occupancy,
        0,
        0,
        getStaticBlockedCells(),
      );
      const expectedAncestorIds = await readExpectedAncestorIds(
        dataStore,
        target.parentNodeId,
      );
      if (expectedAncestorIds === null || operationLock.isLocked()) return;

      beginPlacement({
        kind: "direct",
        scratchBitId: dragItem.scratchId,
        source: {
          id: dragItem.id,
          title: dragItem.label,
          version: dragItem.sourceVersion,
        },
        target: {
          dropId: target.dropId,
          parentId: target.parentNodeId,
          level: target.targetNodeLevel,
          title: target.targetTitle,
          path: [...target.targetParentPath, target.targetTitle],
          expectedAncestorIds,
          cell: position,
          isFull: position === null,
        },
      });
      return;
    }

    if (
      selectedScratchId !== null &&
      intent.kind === "unstage"
    ) {
      const stagedSource = intent.source;
      const command: UnstageCandidateCommand = {
        operationId: crypto.randomUUID(),
        candidateId: stagedSource.id,
        candidateExpectedVersion: stagedSource.candidateVersion,
        sourceBreakdownId: stagedSource.sourceBreakdownId,
        sourceExpectedVersion: stagedSource.sourceVersion,
      };
      if (!operationLock.acquire("unstage", command.operationId)) return;
      await finishUnstage(command);
      return;
    }

    if (
      intent.kind !== "placement" ||
      (dragItem.kind !== "triage-staged-node" &&
        dragItem.kind !== "triage-staged-bit")
    ) {
      return;
    }

    const target = intent.target;

    if (
      dragItem.kind === "triage-staged-node" &&
      target.targetNodeLevel !== null &&
      target.targetNodeLevel >= 2
    ) {
      return;
    }

    if (
      dragItem.kind === "triage-staged-bit" &&
      target.parentNodeId === null
    ) {
      return;
    }

    const dataStore = await getDataStore();
    const occupancy = await dataStore.getGridOccupancy(target.parentNodeId);
    const position = findNearestEmptyCell(
      occupancy,
      0,
      0,
      getStaticBlockedCells(),
    );
    const expectedAncestorIds = await readExpectedAncestorIds(
      dataStore,
      target.parentNodeId,
    );
    if (expectedAncestorIds === null || operationLock.isLocked()) return;

    beginPlacement({
      kind: "staged",
      scratchBitId: dragItem.scratchId,
      source: {
        id: dragItem.sourceBreakdownId,
        title: dragItem.label,
        version: dragItem.sourceVersion,
      },
      candidate: {
        id: dragItem.id,
        version: dragItem.candidateVersion,
        resultType: dragItem.kind === "triage-staged-node" ? "node" : "bit",
      },
      target: {
        dropId: target.dropId,
        parentId: target.parentNodeId,
        level: target.targetNodeLevel,
        title: target.targetTitle,
        path: [...target.targetParentPath, target.targetTitle],
        expectedAncestorIds,
        cell: position,
        isFull: position === null,
      },
    });
  };

  return {
    sensors,
    collisionDetection: triageInteractionCollisionDetection,
    activeDragItem,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
    handleDragOver,
    overTargetId,
    refreshRenderedTarget: updateRenderedTarget,
    targetFeedback,
    checkUnknownOperation,
  };
}

export function useDnd(getBlockedCells: () => Set<string>): {
  sensors: ReturnType<typeof useSensors>;
  handleDragStart: (event: DragStartEvent) => void;
  handleDragEnd: (event: DragEndEvent) => Promise<{ id: string; type: "node" | "bit"; title: string } | undefined>;
  handleDragOver: (event: DragOverEvent) => void;
  handleConflictUpdateParent: () => Promise<void>;
  handleConflictKeepChild: () => void;
  handleNodeMoveConfirm: () => Promise<void>;
  handleNodeMoveCancel: () => void;
  handleAncestorMoveConfirm: () => Promise<void>;
  handleAncestorMoveCancel: () => void;
  activeItem: DragActiveItem;
  overTargetId: string | null;
  conflictState: ConflictState;
  pendingNodeMove: PendingNodeMove;
  pendingAncestorMove: PendingAncestorMove;
} {
  const [activeItem, setActiveItem] = useState<DragActiveItem>(null);
  const [overTargetId, setOverTargetId] = useState<string | null>(null);
  const [conflictState, setConflictState] = useState<ConflictState>(CLOSED_CONFLICT_STATE);
  const [pendingNodeMove, setPendingNodeMove] = useState<PendingNodeMove>(null);
  const [pendingAncestorMove, setPendingAncestorMove] = useState<PendingAncestorMove>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const current = event.active.data.current as Partial<NonNullable<DragActiveItem>> | null;

    if (!current || !current.id || !current.type) {
      setActiveItem(null);
      return;
    }

    setActiveItem({
      id: current.id,
      type: current.type,
      parentId: current.parentId,
      title: current.title ?? "",
    });
  };

  async function moveGridItemToParent(
    item: NonNullable<DragActiveItem>,
    parentId: string | null,
    originX: number,
    originY: number,
  ) {
    const dataStore = await getDataStore();
    const occupancy = await dataStore.getGridOccupancy(parentId);
    const position = findNearestEmptyCell(
      occupancy,
      originX,
      originY,
      getStaticBlockedCells(),
    );

    if (!position) {
      const target = parentId === null ? undefined : await dataStore.getNode(parentId);
      showToast(toastCopy.targetGridFull, item.title, target?.title ?? "Home");
      return;
    }

    if (item.type === "node") {
      await dataStore.updateNode(item.id, {
        parentId,
        x: position.x,
        y: position.y,
      });
    }

    if (item.type === "bit") {
      if (parentId === null) {
        return;
      }

      await dataStore.updateBit(item.id, {
        parentId,
        x: position.x,
        y: position.y,
      });
    }
  }

  async function wouldCreateNodeCycle(dragNodeId: string, targetNodeId: string): Promise<boolean> {
    const dataStore = await getDataStore();
    let current = await dataStore.getNode(targetNodeId);

    while (current) {
      if (current.id === dragNodeId) {
        return true;
      }

      current = current.parentId ? await dataStore.getNode(current.parentId) : undefined;
    }

    return false;
  }

  // A refused write was reported by the store; this handler has nothing more to show.
  const handleDragEnd = (event: DragEndEvent) => endDrag(event).catch(dropReportedFailure);

  const endDrag = async (event: DragEndEvent) => {
    const dragItem = (event.active.data.current as DragActiveItem) ?? activeItem;
    const dropData = event.over?.data.current;

    setOverTargetId(null);
    setActiveItem(null);

    if (!dragItem || !dropData) {
      return;
    }

    const dataStore = await getDataStore();

    if (isGridDropData(dropData)) {
      if (dropData.kind === "grid-cell") {
        if (isCellBlocked(dropData.x, dropData.y, getBlockedCells())) {
          toast("Cell reserved by breadcrumb");
          return;
        }

        if ((dragItem.parentId ?? null) !== dropData.parentId) {
          return;
        }

        if (dragItem.type === "node") {
          await dataStore.updateNode(dragItem.id, {
            x: dropData.x,
            y: dropData.y,
          });
        }

        if (dragItem.type === "bit") {
          await dataStore.updateBit(dragItem.id, {
            x: dropData.x,
            y: dropData.y,
          });
        }

        return;
      }

      if (dropData.kind === "grid-node-drop") {
        if (dragItem.type === "node" && dragItem.id === dropData.targetNodeId) {
          return;
        }

        if (dragItem.type === "node") {
          const createsCycle = await wouldCreateNodeCycle(
            dragItem.id,
            dropData.targetNodeId,
          );

          if (createsCycle) {
            showToast(toastCopy.moveIntoDescendant, dragItem.title);
            return;
          }
        }

        if (dragItem.type !== "node" && dragItem.type !== "bit") {
          return;
        }

        setPendingNodeMove({
          itemId: dragItem.id,
          itemType: dragItem.type,
          itemTitle: dragItem.title,
          targetNodeId: dropData.targetNodeId,
          targetNodeTitle: dropData.targetNodeTitle ?? "",
        });

        return;
      }

      if (dropData.kind === "grid-delete-drop") {
        if (!dragItem) return undefined;
        if (dragItem.type === "node" || dragItem.type === "bit") {
          return { id: dragItem.id, type: dragItem.type, title: dragItem.title };
        }
        return undefined;
      }

      if (dropData.kind === "grid-breadcrumb-drop") {
        if (dragItem.type !== "node" && dragItem.type !== "bit") return;
        setPendingAncestorMove({
          itemId: dragItem.id,
          itemType: dragItem.type,
          itemTitle: dragItem.title,
          targetNodeId: dropData.targetNodeId,
          targetNodeTitle:
            dropData.targetNodeTitle ?? (dropData.targetNodeId === null ? "Home" : ""),
        });
        return;
      }

      await moveGridItemToParent(dragItem, dropData.targetNodeId, 0, 0);

      return;
    }

    if (!isCalendarDropData(dropData)) {
      return;
    }

    if (dropData.kind === "calendar-unschedule") {
      if (dragItem.type === "node") {
        await dataStore.updateNode(dragItem.id, {
          deadline: null,
          deadlineAllDay: false,
        });
      }

      if (dragItem.type === "bit") {
        await dataStore.updateBit(dragItem.id, {
          deadline: null,
          deadlineAllDay: false,
        });
      }

      if (dragItem.type === "chunk") {
        await dataStore.updateChunk(dragItem.id, { time: null });
      }

      return;
    }

    if (dragItem.type === "node") {
      await dataStore.updateNode(dragItem.id, {
        deadline: dropData.timestamp,
      });
      return;
    }

    if (dragItem.type === "bit") {
      await dataStore.updateBit(dragItem.id, {
        deadline: dropData.timestamp,
      });
      return;
    }

    if (!dragItem.parentId) {
      return;
    }

    const parentBit = await dataStore.getBit(dragItem.parentId);
    if (!parentBit) {
      return;
    }

    if (
      parentBit.deadline !== null &&
      dropData.timestamp > parentBit.deadline
    ) {
      setConflictState({
        open: true,
        parentBitId: parentBit.id,
        parentDeadline: parentBit.deadline,
        parentDeadlineAllDay: parentBit.deadlineAllDay,
        pendingChunkId: dragItem.id,
        pendingTimestamp: dropData.timestamp,
      });
      return;
    }

    await dataStore.updateChunk(dragItem.id, {
      time: dropData.timestamp,
    });
  };

  const handleConflictUpdateParent = async () => {
    if (
      !conflictState.parentBitId ||
      !conflictState.pendingChunkId ||
      conflictState.pendingTimestamp === null
    ) {
      setConflictState(CLOSED_CONFLICT_STATE);
      return;
    }

    const dataStore = await getDataStore();
    try {
      await dataStore.updateChunk(
        conflictState.pendingChunkId,
        { time: conflictState.pendingTimestamp },
        { extendParent: true },
      );
    } catch (error) {
      // The store reported a refused or rolled-back extension. The dialog closes either way.
      dropReportedFailure(error);
    } finally {
      setConflictState(CLOSED_CONFLICT_STATE);
    }
  };

  const handleConflictKeepChild = () => {
    setConflictState(CLOSED_CONFLICT_STATE);
  };

  const handleNodeMoveConfirm = async () => {
    if (!pendingNodeMove) {
      return;
    }

    const item: NonNullable<DragActiveItem> = {
      id: pendingNodeMove.itemId,
      type: pendingNodeMove.itemType,
      title: pendingNodeMove.itemTitle,
    };

    try {
      await moveGridItemToParent(item, pendingNodeMove.targetNodeId, 0, 0);
    } catch (error) {
      dropReportedFailure(error);
    } finally {
      setPendingNodeMove(null);
    }
  };

  const handleNodeMoveCancel = () => {
    setPendingNodeMove(null);
  };

  const handleAncestorMoveConfirm = async () => {
    if (!pendingAncestorMove) return;
    const item: NonNullable<DragActiveItem> = {
      id: pendingAncestorMove.itemId,
      type: pendingAncestorMove.itemType,
      title: pendingAncestorMove.itemTitle,
    };
    try {
      await moveGridItemToParent(item, pendingAncestorMove.targetNodeId, 0, 0);
    } catch (error) {
      dropReportedFailure(error);
    } finally {
      setPendingAncestorMove(null);
    }
  };

  const handleAncestorMoveCancel = () => {
    setPendingAncestorMove(null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    setOverTargetId(event.over?.id ? String(event.over.id) : null);
  };

  return {
    sensors,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleConflictUpdateParent,
    handleConflictKeepChild,
    handleNodeMoveConfirm,
    handleNodeMoveCancel,
    handleAncestorMoveConfirm,
    handleAncestorMoveCancel,
    activeItem,
    overTargetId,
    conflictState,
    pendingNodeMove,
    pendingAncestorMove,
  };
}
