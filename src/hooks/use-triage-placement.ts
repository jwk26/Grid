"use client";

import { useCallback, useRef, useState } from "react";
import {
  getDataStore,
  type CommandRejection,
  type DirectPlacementCommand,
  type PlacementResult,
  type StagedPlacementCommand,
} from "@/lib/db/datastore";
import type { RepositoryOperationStatus } from "@/lib/db/schema";
import type { Node, Bit } from "@/types";
import type { TriageOperationLock } from "./use-triage-operation-lock";

export type TriagePlacementRelease = Readonly<{
  kind: "direct" | "staged";
  scratchBitId: string;
  source: Readonly<{ id: string; title: string; version: number }>;
  candidate?: Readonly<{
    id: string;
    version: number;
    resultType: "node" | "bit";
  }>;
  target: Readonly<{
    dropId: string;
    parentId: string | null;
    level: number | null;
    title: string;
    path: readonly string[];
    expectedAncestorIds: readonly string[];
    cell: Readonly<{ x: number; y: number }> | null;
    isFull: boolean;
  }>;
}>;

export type TriagePlacementCommand =
  | DirectPlacementCommand
  | StagedPlacementCommand;

export type TriagePlacementPhase =
  | "direct-selection"
  | "result-title"
  | "confirmation"
  | "pending"
  | "unknown"
  | "reconciling"
  | "terminal"
  | "success";

export type TriagePlacementTerminalKind =
  | "not-applied"
  | "stale-source"
  | "stale-target"
  | "account-limit";

export type TriagePlacementSnapshot = Readonly<{
  release: TriagePlacementRelease;
  phase: TriagePlacementPhase;
  resultType: "node" | "bit" | null;
  operationId: string;
  resultId: string;
  command: TriagePlacementCommand | null;
  terminalStatus: RepositoryOperationStatus | null;
  terminalKind: TriagePlacementTerminalKind | null;
  /** The rule a rejected answer named, kept for the `account-limit` reason line. */
  rejection?: CommandRejection | null;
  resultTitleDraft: string | null;
}>;

type PlacementInvoker = (
  command: TriagePlacementCommand,
) => Promise<PlacementResult>;

export type UseTriagePlacementOptions = Readonly<{
  operationLock: TriageOperationLock;
  createId?: () => string;
  dispatchPlacement?: PlacementInvoker;
  reconcilePlacement?: PlacementInvoker;
  onApplied?: (
    result: Node | Bit,
    command: TriagePlacementCommand,
  ) => void;
}>;

function isStagedCommand(
  command: TriagePlacementCommand,
): command is StagedPlacementCommand {
  return "candidateId" in command;
}

async function dispatchToRepository(
  command: TriagePlacementCommand,
): Promise<PlacementResult> {
  const dataStore = await getDataStore();
  return isStagedCommand(command)
    ? dataStore.placeStagedCandidate(command)
    : dataStore.placeDirectBreakdown(command);
}

async function reconcileWithRepository(
  command: TriagePlacementCommand,
): Promise<PlacementResult> {
  const dataStore = await getDataStore();
  return isStagedCommand(command)
    ? dataStore.reconcileStagedPlacement(command)
    : dataStore.reconcileDirectPlacement(command);
}

function makeCommand(
  snapshot: TriagePlacementSnapshot,
): TriagePlacementCommand | null {
  const { release, resultType } = snapshot;
  if (resultType === null || release.target.cell === null) return null;

  const base: DirectPlacementCommand = {
    operationId: snapshot.operationId,
    resultId: snapshot.resultId,
    scratchBitId: release.scratchBitId,
    sourceBreakdownId: release.source.id,
    sourceExpectedVersion: release.source.version,
    resultType,
    title: snapshot.resultTitleDraft ?? release.source.title,
    targetParentId: release.target.parentId,
    expectedAncestorIds: [...release.target.expectedAncestorIds],
    x: release.target.cell.x,
    y: release.target.cell.y,
  };

  if (release.kind === "direct" || release.candidate === undefined) return base;
  return {
    ...base,
    candidateId: release.candidate.id,
    candidateExpectedVersion: release.candidate.version,
  };
}

function titleLimit(resultType: "node" | "bit"): number {
  return resultType === "node" ? 100 : 200;
}

function returnedSourceMatches(
  snapshot: TriagePlacementSnapshot,
  result: PlacementResult,
): boolean {
  const { release } = snapshot;
  const source = result.source;
  if (
    source === null ||
    source.id !== release.source.id ||
    source.scratchBitId !== release.scratchBitId ||
    source.content !== release.source.title ||
    source.version !== release.source.version ||
    source.consumedAt !== null
  ) {
    return false;
  }

  if (release.kind === "direct") return result.candidate === null;
  const candidate = result.candidate;
  return (
    release.candidate !== undefined &&
    candidate !== null &&
    candidate.id === release.candidate.id &&
    candidate.sourceBreakdownId === release.source.id &&
    candidate.scratchBitId === release.scratchBitId &&
    candidate.resultType === release.candidate.resultType &&
    candidate.version === release.candidate.version &&
    candidate.lifecycle === "staged"
  );
}

function classifyTerminalKind(
  snapshot: TriagePlacementSnapshot,
  result: PlacementResult,
): TriagePlacementTerminalKind {
  if (result.status === "not_applied") return "not-applied";
  if (result.status === "rejected" && result.rejection?.code === "account_limit") {
    return "account-limit";
  }
  return returnedSourceMatches(snapshot, result)
    ? "stale-target"
    : "stale-source";
}

export function useTriagePlacement({
  operationLock,
  createId = () => crypto.randomUUID(),
  dispatchPlacement = dispatchToRepository,
  reconcilePlacement = reconcileWithRepository,
  onApplied,
}: UseTriagePlacementOptions) {
  const [snapshot, setSnapshot] = useState<TriagePlacementSnapshot | null>(null);
  const snapshotRef = useRef<TriagePlacementSnapshot | null>(null);
  const inFlightRef = useRef(false);

  const commit = useCallback((next: TriagePlacementSnapshot | null) => {
    snapshotRef.current = next;
    setSnapshot(next);
  }, []);

  const begin = useCallback(
    (release: TriagePlacementRelease): boolean => {
      if (snapshotRef.current !== null || operationLock.isLocked()) return false;
      if (release.kind === "staged" && release.candidate === undefined) {
        return false;
      }
      const resultType =
        release.kind === "staged" ? release.candidate!.resultType : null;
      const needsResultTitle =
        resultType !== null && release.source.title.length > titleLimit(resultType);
      const next: TriagePlacementSnapshot = {
        release,
        phase:
          release.kind === "direct"
            ? "direct-selection"
            : needsResultTitle
              ? "result-title"
              : "confirmation",
        resultType,
        operationId: createId(),
        resultId: createId(),
        command: null,
        terminalStatus: null,
        terminalKind: null,
        resultTitleDraft: needsResultTitle ? "" : null,
      };
      commit(next);
      return true;
    },
    [commit, createId, operationLock],
  );

  const selectDirectType = useCallback(
    (resultType: "node" | "bit"): boolean => {
      const current = snapshotRef.current;
      if (current?.phase !== "direct-selection") return false;
      const targetAcceptsType =
        resultType === "node"
          ? current.release.target.level === null ||
            current.release.target.level < 2
          : current.release.target.parentId !== null;
      if (
        !targetAcceptsType ||
        current.release.source.title.length > titleLimit(resultType)
      ) {
        return false;
      }
      commit({ ...current, phase: "confirmation", resultType });
      return true;
    },
    [commit],
  );

  const changeResultTitle = useCallback(
    (draft: string): boolean => {
      const current = snapshotRef.current;
      if (
        current?.phase !== "result-title" ||
        current.resultType === null ||
        current.resultTitleDraft === null
      ) {
        return false;
      }
      commit({ ...current, resultTitleDraft: draft });
      return true;
    },
    [commit],
  );

  const continueResultTitle = useCallback((): boolean => {
    const current = snapshotRef.current;
    if (
      current?.phase !== "result-title" ||
      current.resultType === null ||
      current.resultTitleDraft === null ||
      current.resultTitleDraft.trim().length === 0 ||
      current.resultTitleDraft.length > titleLimit(current.resultType)
    ) {
      return false;
    }
    commit({ ...current, phase: "confirmation" });
    return true;
  }, [commit]);

  const applyTerminal = useCallback(
    (
      current: TriagePlacementSnapshot,
      command: TriagePlacementCommand,
      result: PlacementResult,
    ): boolean => {
      operationLock.release(command.operationId, result.status);
      inFlightRef.current = false;
      if (
        (result.status === "applied" || result.status === "already_applied") &&
        result.result !== null
      ) {
        onApplied?.(result.result, command);
        commit({
          ...current,
          phase: "success",
          command,
          terminalStatus: result.status,
          terminalKind: null,
        });
        return true;
      }
      commit({
        ...current,
        phase: "terminal",
        command,
        terminalStatus: result.status,
        terminalKind: classifyTerminalKind(current, result),
        rejection: result.rejection ?? null,
      });
      return true;
    },
    [commit, onApplied, operationLock],
  );

  const confirm = useCallback(async (): Promise<boolean> => {
    const current = snapshotRef.current;
    if (current?.phase === "success") {
      commit(null);
      return true;
    }
    if (current === null || inFlightRef.current || operationLock.isLocked()) {
      return false;
    }

    const isRetry =
      current.phase === "terminal" &&
      current.terminalKind === "not-applied" &&
      current.command !== null;
    if (
      !isRetry &&
      (current.phase !== "confirmation" || current.release.target.isFull)
    ) {
      return false;
    }
    const command = isRetry ? current.command : makeCommand(current);
    if (command === null) return false;
    if (!operationLock.acquire("placement", command.operationId)) return false;

    inFlightRef.current = true;
    const pending = {
      ...current,
      phase: "pending",
      command,
      terminalStatus: null,
      terminalKind: null,
    } as const;
    commit(pending);
    try {
      const result = await dispatchPlacement(command);
      return applyTerminal(pending, command, result);
    } catch {
      inFlightRef.current = false;
      commit({ ...pending, phase: "unknown" });
      return false;
    }
  }, [applyTerminal, commit, dispatchPlacement, operationLock]);

  const reconcile = useCallback(async (): Promise<boolean> => {
    const current = snapshotRef.current;
    if (
      current?.phase !== "unknown" ||
      current.command === null ||
      inFlightRef.current
    ) {
      return false;
    }
    inFlightRef.current = true;
    const reconciling = { ...current, phase: "reconciling" } as const;
    commit(reconciling);
    try {
      const result = await reconcilePlacement(current.command);
      return applyTerminal(reconciling, current.command, result);
    } catch {
      inFlightRef.current = false;
      commit({ ...reconciling, phase: "unknown" });
      return false;
    }
  }, [applyTerminal, commit, reconcilePlacement]);

  const cancel = useCallback((): boolean => {
    const current = snapshotRef.current;
    if (
      current === null ||
      current.phase === "pending" ||
      current.phase === "unknown" ||
      current.phase === "reconciling" ||
      current.phase === "success"
    ) {
      return false;
    }
    commit(null);
    return true;
  }, [commit]);

  const invalidate = useCallback(
    (dropId: string): boolean => {
      const current = snapshotRef.current;
      if (current?.release.target.dropId !== dropId) return false;
      return cancel();
    },
    [cancel],
  );

  const invalidateOperation = useCallback(
    (operationId: string): boolean => {
      const current = snapshotRef.current;
      if (current?.operationId !== operationId) return false;
      return cancel();
    },
    [cancel],
  );

  return {
    snapshot,
    begin,
    selectDirectType,
    changeResultTitle,
    continueResultTitle,
    confirm,
    reconcile,
    cancel,
    invalidate,
    invalidateOperation,
  } as const;
}
