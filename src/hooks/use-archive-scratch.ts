"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getDataStore,
  type ArchiveScratchCommand,
  type ArchiveScratchRecoveryResult,
  type ArchiveScratchResult,
} from "@/lib/db/datastore";
import {
  pendingOperationRecoverySchema,
  type PendingOperationRecovery,
  type RepositoryOperationStatus,
} from "@/lib/db/schema";
import type { TriageOperationLock } from "./use-triage-operation-lock";

export const ARCHIVE_SCRATCH_RECOVERY_STORAGE_KEY =
  "griddo.pending-operation-recovery.archive-scratch";

type ArchiveScratchIdentity = Readonly<{ id: string; version: number }>;

export type ArchiveScratchCoordinatorState =
  | Readonly<{ phase: "idle" }>
  | Readonly<{
      phase: "pending" | "unknown" | "reconciling" | "recovering";
      recovery: PendingOperationRecovery;
    }>
  | Readonly<{
      phase: "terminal";
      recovery: PendingOperationRecovery;
      terminalStatus: RepositoryOperationStatus;
    }>
  | Readonly<{
      phase: "storage_failed";
      recovery: PendingOperationRecovery | null;
      /** The Scratch Archive was activated on when no recovery exists yet. */
      attemptedScratchBitId?: string;
    }>;

type UseArchiveScratchOptions = Readonly<{
  operationLock: TriageOperationLock;
  readAddDraftBlocker: () => boolean;
  readTitleBlocker: () => unknown;
  createOperationId?: () => string;
  getStorage?: () => Storage;
  dispatchArchive?: (
    command: ArchiveScratchCommand,
  ) => Promise<ArchiveScratchResult>;
  reconcileArchive?: (
    recovery: PendingOperationRecovery,
  ) => Promise<ArchiveScratchRecoveryResult>;
  onApplied?: (
    recovery: PendingOperationRecovery,
    result: ArchiveScratchResult | ArchiveScratchRecoveryResult,
  ) => void | Promise<void>;
}>;

type InitialState = Readonly<{
  blocksProjection: boolean;
  state: ArchiveScratchCoordinatorState;
}>;

function defaultStorage(): Storage {
  return window.sessionStorage;
}

async function defaultDispatchArchive(
  command: ArchiveScratchCommand,
): Promise<ArchiveScratchResult> {
  const dataStore = await getDataStore();
  return dataStore.archiveScratch(command);
}

async function defaultReconcileArchive(
  recovery: PendingOperationRecovery,
): Promise<ArchiveScratchRecoveryResult> {
  const dataStore = await getDataStore();
  return dataStore.classifyArchiveScratchRecovery(recovery);
}

function readInitialState(getStorage: () => Storage): InitialState {
  try {
    const storage = getStorage();
    const serialized = storage.getItem(ARCHIVE_SCRATCH_RECOVERY_STORAGE_KEY);
    if (serialized === null) {
      return { blocksProjection: false, state: { phase: "idle" } };
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(serialized);
    } catch {
      storage.removeItem(ARCHIVE_SCRATCH_RECOVERY_STORAGE_KEY);
      return { blocksProjection: false, state: { phase: "idle" } };
    }
    const recovery = pendingOperationRecoverySchema.safeParse(parsed);
    if (!recovery.success) {
      storage.removeItem(ARCHIVE_SCRATCH_RECOVERY_STORAGE_KEY);
      return { blocksProjection: false, state: { phase: "idle" } };
    }
    return {
      blocksProjection: true,
      state: { phase: "recovering", recovery: recovery.data },
    };
  } catch {
    return {
      blocksProjection: true,
      state: { phase: "storage_failed", recovery: null },
    };
  }
}

function isApplied(status: RepositoryOperationStatus): boolean {
  return status === "applied" || status === "already_applied";
}

function commandForRecovery(
  recovery: PendingOperationRecovery,
): ArchiveScratchCommand {
  return {
    operationId: recovery.operationId,
    scratchBitId: recovery.scratchBitId,
    expectedVersion: recovery.expectedVersion,
    callerAssertion: {
      addDraftClear: true,
      titleBlockerClear: true,
    },
  };
}

export function useArchiveScratch({
  operationLock,
  readAddDraftBlocker,
  readTitleBlocker,
  createOperationId = () => crypto.randomUUID(),
  getStorage = defaultStorage,
  dispatchArchive = defaultDispatchArchive,
  reconcileArchive = defaultReconcileArchive,
  onApplied,
}: UseArchiveScratchOptions) {
  const [snapshot, setSnapshot] = useState<InitialState>(() =>
    readInitialState(getStorage),
  );
  const stateRef = useRef(snapshot.state);
  const recoveryStartedRef = useRef(false);

  const commit = useCallback((next: InitialState) => {
    stateRef.current = next.state;
    setSnapshot(next);
  }, []);

  const clearTerminalRecovery = useCallback(
    (recovery: PendingOperationRecovery): boolean => {
      try {
        getStorage().removeItem(ARCHIVE_SCRATCH_RECOVERY_STORAGE_KEY);
        return true;
      } catch {
        commit({
          blocksProjection: true,
          state: { phase: "storage_failed", recovery },
        });
        return false;
      }
    },
    [commit, getStorage],
  );

  const applyTerminal = useCallback(
    async (
      recovery: PendingOperationRecovery,
      result: ArchiveScratchResult | ArchiveScratchRecoveryResult,
      blocksProjection = false,
    ): Promise<boolean> => {
      if (!("status" in result)) {
        commit({
          blocksProjection,
          state: { phase: "unknown", recovery },
        });
        return false;
      }
      if (!clearTerminalRecovery(recovery)) return false;
      if (isApplied(result.status)) {
        try {
          await onApplied?.(recovery, result);
        } catch (error) {
          console.error("Archive terminal handoff error:", error);
        }
      }
      operationLock.release(recovery.operationId, result.status);
      commit({
        blocksProjection: false,
        state: {
          phase: "terminal",
          recovery,
          terminalStatus: result.status,
        },
      });
      return isApplied(result.status);
    },
    [clearTerminalRecovery, commit, onApplied, operationLock],
  );

  const persistBeforeDispatch = useCallback(
    (recovery: PendingOperationRecovery): boolean => {
      try {
        const validated = pendingOperationRecoverySchema.parse(recovery);
        const serialized = JSON.stringify(validated);
        const storage = getStorage();
        storage.setItem(ARCHIVE_SCRATCH_RECOVERY_STORAGE_KEY, serialized);
        const readback = storage.getItem(
          ARCHIVE_SCRATCH_RECOVERY_STORAGE_KEY,
        );
        if (readback === null) throw new Error("Archive recovery readback missing");
        const parsedReadback = pendingOperationRecoverySchema.parse(
          JSON.parse(readback),
        );
        if (JSON.stringify(parsedReadback) !== serialized) {
          throw new Error("Archive recovery readback mismatch");
        }
        return true;
      } catch {
        try {
          getStorage().removeItem(ARCHIVE_SCRATCH_RECOVERY_STORAGE_KEY);
        } catch {
          // The command has not started, so an unavailable store stays closed.
        }
        return false;
      }
    },
    [getStorage],
  );

  const archiveScratch = useCallback(
    async (scratch: ArchiveScratchIdentity): Promise<boolean> => {
      const titleBlocker = readTitleBlocker();
      if (
        stateRef.current.phase === "pending" ||
        stateRef.current.phase === "unknown" ||
        stateRef.current.phase === "reconciling" ||
        stateRef.current.phase === "recovering" ||
        (stateRef.current.phase === "terminal" &&
          !isApplied(stateRef.current.terminalStatus)) ||
        operationLock.isLocked() ||
        readAddDraftBlocker() ||
        (titleBlocker !== null && titleBlocker !== false)
      ) {
        return false;
      }

      const recovery = pendingOperationRecoverySchema.parse({
        operationId: createOperationId(),
        kind: "archive_scratch",
        scratchBitId: scratch.id,
        expectedVersion: scratch.version,
        startedAt: Date.now(),
      });
      if (!operationLock.acquire("archive", recovery.operationId)) return false;

      const command = commandForRecovery(recovery);
      if (!persistBeforeDispatch(recovery)) {
        operationLock.release(recovery.operationId, "not_applied");
        commit({
          blocksProjection: false,
          state: {
            phase: "storage_failed",
            recovery: null,
            attemptedScratchBitId: scratch.id,
          },
        });
        return false;
      }

      commit({
        blocksProjection: false,
        state: { phase: "pending", recovery },
      });
      try {
        const result = await dispatchArchive(command);
        return applyTerminal(recovery, result);
      } catch {
        commit({
          blocksProjection: false,
          state: { phase: "unknown", recovery },
        });
        return false;
      }
    },
    [
      applyTerminal,
      commit,
      createOperationId,
      dispatchArchive,
      operationLock,
      persistBeforeDispatch,
      readAddDraftBlocker,
      readTitleBlocker,
    ],
  );

  const reconcile = useCallback(async (): Promise<boolean> => {
    const current = stateRef.current;
    if (current.phase !== "unknown" && current.phase !== "recovering") {
      return false;
    }
    const recovery = current.recovery;
    if (
      current.phase === "recovering" &&
      !operationLock.acquire("archive", recovery.operationId)
    ) {
      return false;
    }
    commit({
      blocksProjection: current.phase === "recovering",
      state: { phase: "reconciling", recovery },
    });
    try {
      const result = await reconcileArchive(recovery);
      return applyTerminal(recovery, result, current.phase === "recovering");
    } catch {
      commit({
        blocksProjection: current.phase === "recovering",
        state: { phase: "unknown", recovery },
      });
      return false;
    }
  }, [applyTerminal, commit, operationLock, reconcileArchive]);

  const retry = useCallback(async (): Promise<boolean> => {
    const current = stateRef.current;
    const titleBlocker = readTitleBlocker();
    if (
      current.phase !== "terminal" ||
      current.terminalStatus !== "not_applied" ||
      operationLock.isLocked() ||
      readAddDraftBlocker() ||
      (titleBlocker !== null && titleBlocker !== false) ||
      !operationLock.acquire("archive", current.recovery.operationId)
    ) {
      return false;
    }
    const recovery = current.recovery;
    if (!persistBeforeDispatch(recovery)) {
      operationLock.release(recovery.operationId, "not_applied");
      commit({
        blocksProjection: false,
        state: {
          phase: "storage_failed",
          recovery: null,
          attemptedScratchBitId: recovery.scratchBitId,
        },
      });
      return false;
    }
    commit({
      blocksProjection: false,
      state: { phase: "pending", recovery },
    });
    try {
      return applyTerminal(
        recovery,
        await dispatchArchive(commandForRecovery(recovery)),
      );
    } catch {
      commit({
        blocksProjection: false,
        state: { phase: "unknown", recovery },
      });
      return false;
    }
  }, [
    applyTerminal,
    commit,
    dispatchArchive,
    operationLock,
    persistBeforeDispatch,
    readAddDraftBlocker,
    readTitleBlocker,
  ]);

  const dismissTerminal = useCallback((): boolean => {
    const current = stateRef.current;
    const isDismissibleTerminal =
      current.phase === "terminal" &&
      (current.terminalStatus === "not_applied" ||
        current.terminalStatus === "rejected" ||
        current.terminalStatus === "conflict");
    const isPredispatchStorageFailure =
      current.phase === "storage_failed" && current.recovery === null;
    if (!isDismissibleTerminal && !isPredispatchStorageFailure) return false;
    commit({ blocksProjection: false, state: { phase: "idle" } });
    return true;
  }, [commit]);

  useEffect(() => {
    if (
      snapshot.state.phase !== "recovering" ||
      recoveryStartedRef.current
    ) {
      return;
    }
    recoveryStartedRef.current = true;
    void reconcile();
  }, [reconcile, snapshot.state.phase]);

  return {
    state: snapshot.state,
    isProjectionReady: !snapshot.blocksProjection,
    archiveScratch,
    reconcile,
    retry,
    dismissTerminal,
  } as const;
}
