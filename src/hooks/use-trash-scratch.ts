"use client";

import { liveQuery } from "dexie";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  getDataStore,
  type TrashScratchCommand,
  type TrashScratchResult,
} from "@/lib/db/datastore";
import type {
  Bit,
  RepositoryOperationStatus,
  ScratchBreakdown,
  StagedCandidate,
} from "@/lib/db/schema";
import { useTriageStore } from "@/stores/triage-store";
import type { TriageOperationLock } from "./use-triage-operation-lock";

export type TrashScratchSnapshot = Readonly<{
  /** Active Inbox-parented Scratch Bits. */
  scratches: readonly Bit[];
  candidates: readonly StagedCandidate[];
  sources: readonly ScratchBreakdown[];
}>;

export type TrashScratchDisabledReason =
  | "operation-pending"
  | "placement-open"
  | "unresolved-source";

/** What a Trash entry (Pool row, Context `[X]`) needs from the workspace coordinator. */
export type TrashScratchEntries = Readonly<{
  disabledReason: (scratchId: string) => TrashScratchDisabledReason | null;
  /** `opener` is the activated control, so Cancel can return focus to it. */
  request: (scratchId: string, opener: HTMLElement | null) => void;
}>;

export const TrashScratchEntriesContext =
  createContext<TrashScratchEntries | null>(null);

/**
 * The selected Scratch's page-level drafts: the Breakdown panel owns the Add
 * draft and the open inline editor, so it registers them here for the Trash
 * dialog's draft line and for the discard on success.
 */
export type TrashDraftOwner = Readonly<{
  /** True for a non-empty Add draft or any open inline editor. */
  hasDiscardableWork: () => boolean;
  discard: () => void;
}>;

export const TrashDraftRegistryContext = createContext<
  ((owner: TrashDraftOwner) => () => void) | null
>(null);

export function useTrashScratchEntries(): TrashScratchEntries | null {
  return useContext(TrashScratchEntriesContext);
}

export type TrashScratchTarget = Readonly<{ scratchId: string; title: string }>;

type TrashOperation = Readonly<{
  operationId: string;
  command: TrashScratchCommand;
}>;

export type TrashScratchState =
  | Readonly<{ phase: "closed" }>
  | Readonly<{ phase: "confirming"; target: TrashScratchTarget }>
  | Readonly<{
      phase: "pending" | "unknown" | "reconciling";
      target: TrashScratchTarget;
      operation: TrashOperation;
    }>
  | Readonly<{
      phase: "not_applied";
      target: TrashScratchTarget;
      operation: TrashOperation;
    }>
  | Readonly<{ phase: "rejected"; target: TrashScratchTarget }>
  | Readonly<{ phase: "conflict"; target: TrashScratchTarget }>;

export type TrashScratchView = Readonly<{
  scratch: Bit | null;
  candidateCount: number;
  hasDiscardableWork: boolean;
  confirmDisabledReason: TrashScratchDisabledReason | null;
}>;

export type TrashScratchApplied = Readonly<{
  scratchId: string;
  /** The title the confirmation showed, for the success announcement. */
  title: string;
  wasSelected: boolean;
  result: TrashScratchResult;
}>;

type UseTrashScratchOptions = Readonly<{
  operationLock: TriageOperationLock;
  snapshot: TrashScratchSnapshot | null;
  selectedScratchId: string | null;
  /** True when the page holds an unsaved Add draft or open editor for this Scratch. */
  hasDiscardableWork: (scratchId: string) => boolean;
  isPlacementOpen: () => boolean;
  createOperationId?: () => string;
  dispatchTrash?: (command: TrashScratchCommand) => Promise<TrashScratchResult>;
  reconcileTrash?: (command: TrashScratchCommand) => Promise<TrashScratchResult>;
  onApplied?: (applied: TrashScratchApplied) => void | Promise<void>;
}>;

const CLOSED: TrashScratchState = { phase: "closed" };

/**
 * Live Inbox-wide read of active Scratch Bits, staged candidates and
 * Breakdown rows: the source of the confirmation's candidate set/version and
 * of the per-Scratch unresolved-source flag.
 */
export function useTrashScratchSnapshot(
  inboxNodeId: string | null,
): TrashScratchSnapshot | null {
  const [snapshot, setSnapshot] = useState<{
    inboxNodeId: string;
    value: TrashScratchSnapshot;
  } | null>(null);

  useEffect(() => {
    if (inboxNodeId === null) return;
    const subscription = liveQuery(async (): Promise<TrashScratchSnapshot> => {
      const { db } = await import("@/lib/db/indexeddb");
      const [bits, candidates, sources] = await Promise.all([
        db.bits.where("parentId").equals(inboxNodeId).toArray(),
        db.stagedCandidates.toArray(),
        db.scratchBreakdowns.toArray(),
      ]);
      const scratches = bits.filter(
        (bit) => bit.deletedAt === null && bit.archivedAt === null,
      );
      const ids = new Set(scratches.map((bit) => bit.id));
      return {
        scratches,
        candidates: candidates.filter((candidate) => ids.has(candidate.scratchBitId)),
        sources: sources.filter((source) => ids.has(source.scratchBitId)),
      };
    }).subscribe({
      next: (value) => setSnapshot({ inboxNodeId, value }),
      error: (error) => console.error("trash Scratch snapshot error:", error),
    });
    return () => subscription.unsubscribe();
  }, [inboxNodeId]);

  return snapshot?.inboxNodeId === inboxNodeId ? snapshot.value : null;
}

async function defaultDispatchTrash(
  command: TrashScratchCommand,
): Promise<TrashScratchResult> {
  const dataStore = await getDataStore();
  return dataStore.trashScratch(command);
}

async function defaultReconcileTrash(
  command: TrashScratchCommand,
): Promise<TrashScratchResult> {
  const dataStore = await getDataStore();
  return dataStore.reconcileTrashScratch(command);
}

function isApplied(status: RepositoryOperationStatus): boolean {
  return status === "applied" || status === "already_applied";
}

/** Candidates whose source cannot be joined are integrity-unresolved (Orphan cleanup resolves them). */
function unresolvedCandidatesOf(
  snapshot: TrashScratchSnapshot,
  scratchId: string,
): StagedCandidate[] {
  const sourcesById = new Map(snapshot.sources.map((source) => [source.id, source]));
  return snapshot.candidates.filter((candidate) => {
    if (candidate.scratchBitId !== scratchId) return false;
    const source = sourcesById.get(candidate.sourceBreakdownId);
    return (
      source === undefined ||
      source.scratchBitId !== candidate.scratchBitId ||
      source.consumedAt !== null
    );
  });
}

function buildCommand(
  snapshot: TrashScratchSnapshot,
  scratch: Bit,
  operationId: string,
): TrashScratchCommand {
  const sourcesById = new Map(snapshot.sources.map((source) => [source.id, source]));
  return {
    operationId,
    scratchBitId: scratch.id,
    expectedVersion: scratch.version,
    candidates: snapshot.candidates
      .filter((candidate) => candidate.scratchBitId === scratch.id)
      .map((candidate) => ({
        candidateId: candidate.id,
        candidateExpectedVersion: candidate.version,
        sourceBreakdownId: candidate.sourceBreakdownId,
        sourceExpectedVersion: sourcesById.get(candidate.sourceBreakdownId)!.version,
      })),
  };
}

export function useTrashScratch({
  operationLock,
  snapshot,
  selectedScratchId,
  hasDiscardableWork,
  isPlacementOpen,
  createOperationId = () => crypto.randomUUID(),
  dispatchTrash = defaultDispatchTrash,
  reconcileTrash = defaultReconcileTrash,
  onApplied,
}: UseTrashScratchOptions) {
  const [state, setState] = useState<TrashScratchState>(CLOSED);
  const stateRef = useRef<TrashScratchState>(CLOSED);
  const snapshotRef = useRef(snapshot);
  const selectedRef = useRef(selectedScratchId);

  useEffect(() => {
    snapshotRef.current = snapshot;
    selectedRef.current = selectedScratchId;
  });

  const commit = useCallback((next: TrashScratchState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const unresolvedScratchIds = useMemo(() => {
    const ids = new Set<string>();
    if (snapshot === null) return ids;
    for (const scratch of snapshot.scratches) {
      if (unresolvedCandidatesOf(snapshot, scratch.id).length > 0) ids.add(scratch.id);
    }
    return ids;
  }, [snapshot]);

  const entryDisabledReason = useCallback(
    (scratchId: string): TrashScratchDisabledReason | null => {
      if (operationLock.activeOperation !== null) return "operation-pending";
      if (isPlacementOpen()) return "placement-open";
      if (unresolvedScratchIds.has(scratchId)) return "unresolved-source";
      return null;
    },
    [isPlacementOpen, operationLock.activeOperation, unresolvedScratchIds],
  );

  const checkRefusal = useCallback(
    (scratchId: string): TrashScratchDisabledReason | null => {
      if (operationLock.isLocked()) return "operation-pending";
      if (isPlacementOpen()) return "placement-open";
      const current = snapshotRef.current;
      if (current !== null && unresolvedCandidatesOf(current, scratchId).length > 0) {
        return "unresolved-source";
      }
      return null;
    },
    [isPlacementOpen, operationLock],
  );

  const open = useCallback(
    (
      scratchId: string,
    ): { opened: true } | { opened: false; reason: TrashScratchDisabledReason | "unavailable" } => {
      const scratch = snapshotRef.current?.scratches.find(({ id }) => id === scratchId);
      if (scratch === undefined) return { opened: false, reason: "unavailable" };
      const reason = checkRefusal(scratchId);
      if (reason !== null) return { opened: false, reason };
      const phase = stateRef.current.phase;
      if (phase === "pending" || phase === "unknown" || phase === "reconciling") {
        return { opened: false, reason: "operation-pending" };
      }
      commit({
        phase: "confirming",
        target: { scratchId, title: scratch.title },
      });
      return { opened: true };
    },
    [checkRefusal, commit],
  );

  const cancel = useCallback((): boolean => {
    const phase = stateRef.current.phase;
    if (
      phase === "pending" ||
      phase === "unknown" ||
      phase === "reconciling" ||
      phase === "closed"
    ) {
      return false;
    }
    commit(CLOSED);
    return true;
  }, [commit]);

  // A new page must not inherit this page's markers.
  useEffect(
    () => () => {
      useTriageStore.getState().releaseOwnTrash();
    },
    [],
  );

  const settle = useCallback(
    async (
      target: TrashScratchTarget,
      operation: TrashOperation,
      result: TrashScratchResult,
    ): Promise<boolean> => {
      const { scratchId } = target;
      if (isApplied(result.status)) {
        try {
          await onApplied?.({
            scratchId,
            title: target.title,
            wasSelected: selectedRef.current === scratchId,
            result,
          });
        } catch (error) {
          console.error("Trash terminal handoff error:", error);
        }
        // The marker stays (version-keyed) until the workspace unmounts, so any
        // mounted Inbox projection that emits late still sees an own Trash.
        operationLock.release(operation.operationId, result.status);
        commit(CLOSED);
        return true;
      }

      useTriageStore.getState().releaseOwnTrash(scratchId);
      operationLock.release(operation.operationId, result.status);
      if (result.status === "not_applied") {
        commit({ phase: "not_applied", target, operation });
      } else if (result.status === "rejected") {
        commit({ phase: "rejected", target });
      } else {
        const stillActive =
          result.scratch !== null &&
          result.scratch.deletedAt === null &&
          result.scratch.archivedAt === null;
        // An inactive Scratch is an external removal, not a dialog state.
        commit(stillActive ? { phase: "conflict", target } : CLOSED);
      }
      return false;
    },
    [commit, onApplied, operationLock],
  );

  const dispatch = useCallback(
    async (
      target: TrashScratchTarget,
      operation: TrashOperation,
    ): Promise<boolean> => {
      useTriageStore
        .getState()
        .registerOwnTrash(operation.command.scratchBitId, operation.command.expectedVersion);
      commit({ phase: "pending", target, operation });
      try {
        const result = await dispatchTrash(operation.command);
        if (!("status" in result)) {
          commit({ phase: "unknown", target, operation });
          return false;
        }
        return await settle(target, operation, result);
      } catch {
        commit({ phase: "unknown", target, operation });
        return false;
      }
    },
    [commit, dispatchTrash, settle],
  );

  const confirm = useCallback(async (): Promise<boolean> => {
    const current = stateRef.current;
    if (current.phase !== "confirming" && current.phase !== "conflict") return false;
    const live = snapshotRef.current;
    const scratch = live?.scratches.find(({ id }) => id === current.target.scratchId);
    if (live === null || scratch === undefined) return false;
    if (checkRefusal(scratch.id) !== null) return false;

    const operationId = createOperationId();
    const command = buildCommand(live, scratch, operationId);
    if (!operationLock.acquire("trash", operationId)) return false;
    return dispatch(current.target, { operationId, command });
  }, [checkRefusal, createOperationId, dispatch, operationLock]);

  const retry = useCallback(async (): Promise<boolean> => {
    const current = stateRef.current;
    if (current.phase !== "not_applied") return false;
    if (!operationLock.acquire("trash", current.operation.operationId)) return false;
    return dispatch(current.target, current.operation);
  }, [dispatch, operationLock]);

  const reconcile = useCallback(async (): Promise<boolean> => {
    const current = stateRef.current;
    if (current.phase !== "unknown") return false;
    const { target, operation } = current;
    commit({ phase: "reconciling", target, operation });
    try {
      const result = await reconcileTrash(operation.command);
      if (!("status" in result)) {
        commit({ phase: "unknown", target, operation });
        return false;
      }
      return await settle(target, operation, result);
    } catch {
      commit({ phase: "unknown", target, operation });
      return false;
    }
  }, [commit, reconcileTrash, settle]);

  const view = useMemo((): TrashScratchView => {
    if (state.phase === "closed" || snapshot === null) {
      return {
        scratch: null,
        candidateCount: 0,
        hasDiscardableWork: false,
        confirmDisabledReason: null,
      };
    }
    const { scratchId } = state.target;
    const scratch = snapshot.scratches.find(({ id }) => id === scratchId) ?? null;
    return {
      scratch,
      candidateCount: snapshot.candidates.filter(
        (candidate) => candidate.scratchBitId === scratchId,
      ).length,
      hasDiscardableWork: hasDiscardableWork(scratchId),
      confirmDisabledReason: unresolvedScratchIds.has(scratchId)
        ? "unresolved-source"
        : null,
    };
  }, [hasDiscardableWork, snapshot, state, unresolvedScratchIds]);

  // The Scratch left the active Pool while the dialog was idle: external removal.
  const targetGone =
    snapshot !== null &&
    (state.phase === "confirming" ||
      state.phase === "not_applied" ||
      state.phase === "rejected" ||
      state.phase === "conflict") &&
    !snapshot.scratches.some(({ id }) => id === state.target.scratchId);

  return {
    state: targetGone ? CLOSED : state,
    view,
    unresolvedScratchIds,
    entryDisabledReason,
    open,
    cancel,
    confirm,
    retry,
    reconcile,
  } as const;
}
