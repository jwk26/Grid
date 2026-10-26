"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getDataStore,
  type ConfirmedCandidateOrphanCleanupCommand,
  type ConfirmedCandidateOrphanCleanupResult,
  type StageCandidateCommand,
  type StageCandidateResult,
  type UnstageCandidateCommand,
  type UnstageCandidateResult,
  liveRead,
} from "@/lib/db/datastore";
import type {
  ScratchBreakdown,
  StagedCandidate,
  UnknownRepositoryOperationOutcome,
} from "@/lib/db/schema";

export type StagedCandidateProjection = Readonly<
  StagedCandidate & {
    content: string;
    source: ScratchBreakdown;
  }
>;

export type CandidateOperationKind = "stage" | "unstage" | "orphan_cleanup";

export type CandidateOperationProjection = Readonly<{
  operationId: string;
  scratchBitId: string;
  /** Issue order across this hook's lifetime; newer operations have larger values. */
  sequence?: number;
  /**
   * Post-terminal presentation hold: the operation reached `applied` or
   * `already_applied` but the snapshot has not caught up. It keeps its phase
   * and copy, is never part of the pending/unknown/reconciling lists, and so
   * holds no lock, guard or announcement.
   */
  held?: true;
  candidateId: string;
  sourceBreakdownId: string;
  kind: CandidateOperationKind;
  phase: "pending" | "unknown" | "reconciling";
  resultType?: StagedCandidate["resultType"];
}>;

export type CandidateCommandOutcome<TResult> =
  | TResult
  | UnknownRepositoryOperationOutcome;

export type CandidateIntegrityProjection = Readonly<{
  candidate: StagedCandidate;
  status: "source-unresolved";
  reason:
    | "subscription-miss"
    | "source-owner-mismatch"
    | "source-consumed";
}>;

export type CandidateIntegrityNotDispatched = Readonly<{
  outcome: "not_dispatched";
  reason:
    | "proof_not_confirmed"
    | "identity_mismatch"
    | "reconciliation_required"
    | "terminal_no_retry";
}>;

type CandidateIntegrityCommandOutcome =
  | CandidateCommandOutcome<ConfirmedCandidateOrphanCleanupResult>
  | CandidateIntegrityNotDispatched;

export type StagedCandidateCounts = Readonly<{
  authoritative: number;
  renderable: number;
  nodes: number;
  bits: number;
  visibleNodes: number;
  visibleBits: number;
}>;

export type StagedCandidateEligibility = Readonly<{
  archiveCandidateClear: boolean;
  stagedSourceIds: ReadonlySet<string>;
  isSourceStaged: (sourceBreakdownId: string) => boolean;
}>;

type CandidateSnapshot = Readonly<{
  scratchBitId: string;
  /** Monotonic id of the read that produced this snapshot, taken at its start. */
  generation: number;
  candidates: StagedCandidate[];
  sources: ScratchBreakdown[];
}>;

type HeldOperation = Readonly<{
  operation: CandidateOperationProjection;
  /** Newest read generation that had started when the result arrived. */
  afterGeneration: number;
}>;

type OperationInput = Readonly<{
  operationId: string;
  candidateId: string;
  sourceBreakdownId: string;
  resultType?: StagedCandidate["resultType"];
}>;

type UseStagedCandidatesResult = Readonly<{
  isReady: boolean;
  candidates: StagedCandidateProjection[];
  unresolvedCandidates: StagedCandidate[];
  integrityCandidates: CandidateIntegrityProjection[];
  pendingOperations: CandidateOperationProjection[];
  unknownOperations: CandidateOperationProjection[];
  reconcilingOperations: CandidateOperationProjection[];
  heldOperations: CandidateOperationProjection[];
  /** Sources that are staged, or whose Stage is pending, unknown, reconciling or held. */
  stagedSourceIds: ReadonlySet<string>;
  counts: StagedCandidateCounts;
  eligibility: StagedCandidateEligibility;
  stageCandidate: (
    command: StageCandidateCommand,
  ) => Promise<CandidateCommandOutcome<StageCandidateResult>>;
  reconcileStageCandidate: (
    command: StageCandidateCommand,
  ) => Promise<CandidateCommandOutcome<StageCandidateResult>>;
  unstageCandidate: (
    command: UnstageCandidateCommand,
  ) => Promise<CandidateCommandOutcome<UnstageCandidateResult>>;
  reconcileUnstageCandidate: (
    command: UnstageCandidateCommand,
  ) => Promise<CandidateCommandOutcome<UnstageCandidateResult>>;
  cleanupConfirmedCandidateOrphan: (
    command: ConfirmedCandidateOrphanCleanupCommand,
  ) => Promise<CandidateIntegrityCommandOutcome>;
  reconcileConfirmedCandidateOrphanCleanup: (
    command: ConfirmedCandidateOrphanCleanupCommand,
  ) => Promise<CandidateIntegrityCommandOutcome>;
}>;

const EMPTY_CANDIDATES: StagedCandidate[] = [];
const EMPTY_SOURCES: ScratchBreakdown[] = [];

function isSuccessfulResult(result: unknown): boolean {
  if (typeof result !== "object" || result === null || !("status" in result)) {
    return false;
  }
  return result.status === "applied" || result.status === "already_applied";
}

// Whether a held operation survives the given snapshot. Stage holds until the
// candidate is listed; Unstage holds until it is gone. A read that started
// after the result settles either direction.
function holdPersists(held: HeldOperation, snapshot: CandidateSnapshot) {
  const { operation } = held;
  if (snapshot.scratchBitId !== operation.scratchBitId) return true;
  if (snapshot.generation > held.afterGeneration) return false;
  const listed = snapshot.candidates.some(
    ({ id }) => id === operation.candidateId,
  );
  return operation.kind === "stage" ? !listed : listed;
}

export function useStagedCandidates(
  scratchBitId: string | null,
): UseStagedCandidatesResult {
  const [snapshot, setSnapshot] = useState<CandidateSnapshot | null>(null);
  const [operations, setOperations] = useState<CandidateOperationProjection[]>([]);
  const [heldState, setHeldState] = useState<HeldOperation[]>([]);
  const generationRef = useRef(0);
  const snapshotRef = useRef<CandidateSnapshot | null>(null);
  // Bumped on every (re)subscription so a result from an earlier selection is never held.
  const epochRef = useRef(0);
  const sequenceRef = useRef(0);
  const confirmedOrphanCommandsRef = useRef(
    new Map<string, ConfirmedCandidateOrphanCleanupCommand>(),
  );
  const terminalConfirmedOrphanOperationsRef = useRef(new Set<string>());

  useEffect(() => {
    // Operation projections belong only to the currently selected Scratch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOperations([]);
    setHeldState([]);
    snapshotRef.current = null;
    epochRef.current += 1;
    confirmedOrphanCommandsRef.current.clear();
    terminalConfirmedOrphanOperationsRef.current.clear();

    if (scratchBitId === null) return;

    const subscription = liveRead(async (dataStore): Promise<CandidateSnapshot> => {
      const generation = ++generationRef.current;
      const [candidates, allSources] = await Promise.all([
        dataStore.getStagedCandidates(scratchBitId),
        dataStore.getAllScratchBreakdowns(),
      ]);
      // `id` order, as the table scan this replaces returned them.
      const sources = allSources.filter((row) => row.scratchBitId === scratchBitId);
      return { scratchBitId, generation, candidates, sources };
    }).subscribe({
      next: (value) => {
        snapshotRef.current = value;
        setSnapshot(value);
        setHeldState((current) => {
          const next = current.filter((held) => holdPersists(held, value));
          return next.length === current.length ? current : next;
        });
      },
      error: (error) => {
        console.error("staged candidates liveQuery error:", error);
        setHeldState((current) => (current.length === 0 ? current : []));
      },
    });

    return () => subscription.unsubscribe();
  }, [scratchBitId]);

  const currentSnapshot =
    snapshot?.scratchBitId === scratchBitId ? snapshot : null;
  const isReady = scratchBitId !== null && currentSnapshot !== null;
  const authoritativeCandidates =
    currentSnapshot?.candidates ?? EMPTY_CANDIDATES;
  const sources = currentSnapshot?.sources ?? EMPTY_SOURCES;

  const { candidates, integrityCandidates, unresolvedCandidates } = useMemo(() => {
    const sourcesById = new Map(sources.map((source) => [source.id, source]));
    const joined: StagedCandidateProjection[] = [];
    const integrity: CandidateIntegrityProjection[] = [];

    for (const candidate of authoritativeCandidates) {
      const source = sourcesById.get(candidate.sourceBreakdownId);
      if (!source) {
        integrity.push({
          candidate,
          status: "source-unresolved",
          reason: "subscription-miss",
        });
        continue;
      }
      if (source.scratchBitId !== candidate.scratchBitId) {
        integrity.push({
          candidate,
          status: "source-unresolved",
          reason: "source-owner-mismatch",
        });
        continue;
      }
      if (source.consumedAt !== null) {
        integrity.push({
          candidate,
          status: "source-unresolved",
          reason: "source-consumed",
        });
        continue;
      }
      joined.push({ ...candidate, source, content: source.content });
    }

    return {
      candidates: joined,
      integrityCandidates: integrity,
      unresolvedCandidates: integrity.map(({ candidate }) => candidate),
    };
  }, [authoritativeCandidates, sources]);

  // Operations belong to the Scratch they were issued for; a mismatch renders
  // empty in the very commit the selection changes.
  const scratchOperations = useMemo(
    () =>
      operations.filter((operation) => operation.scratchBitId === scratchBitId),
    [operations, scratchBitId],
  );
  const authoritativeIds = useMemo(
    () => new Set(authoritativeCandidates.map(({ id }) => id)),
    [authoritativeCandidates],
  );
  const heldOperations = useMemo(
    () =>
      heldState
        .map(({ operation }) => operation)
        .filter(
          (operation) =>
            operation.scratchBitId === scratchBitId &&
            (operation.kind === "stage"
              ? !authoritativeIds.has(operation.candidateId)
              : authoritativeIds.has(operation.candidateId)),
        ),
    [authoritativeIds, heldState, scratchBitId],
  );
  const pendingOperations = useMemo(
    () => scratchOperations.filter((operation) => operation.phase === "pending"),
    [scratchOperations],
  );
  const unknownOperations = useMemo(
    () => scratchOperations.filter((operation) => operation.phase === "unknown"),
    [scratchOperations],
  );
  const reconcilingOperations = useMemo(
    () =>
      scratchOperations.filter((operation) => operation.phase === "reconciling"),
    [scratchOperations],
  );
  // Stage projections not yet in the snapshot, once per candidate ID.
  const projectedStageOperations = useMemo(() => {
    const byCandidate = new Map<string, CandidateOperationProjection>();
    for (const operation of [...scratchOperations, ...heldOperations]) {
      if (operation.kind !== "stage") continue;
      if (authoritativeIds.has(operation.candidateId)) continue;
      byCandidate.set(operation.candidateId, operation);
    }
    return [...byCandidate.values()];
  }, [authoritativeIds, heldOperations, scratchOperations]);

  const counts = useMemo<StagedCandidateCounts>(() => {
    const nodes = candidates.filter(({ resultType }) => resultType === "node").length;
    const bits = candidates.length - nodes;
    return {
      authoritative: authoritativeCandidates.length,
      renderable: candidates.length,
      nodes,
      bits,
      visibleNodes:
        nodes +
        projectedStageOperations.filter(({ resultType }) => resultType === "node")
          .length,
      visibleBits:
        bits +
        projectedStageOperations.filter(({ resultType }) => resultType === "bit")
          .length,
    };
  }, [authoritativeCandidates, candidates, projectedStageOperations]);

  const authoritativeSourceIds = useMemo(
    () =>
      new Set(
        authoritativeCandidates.map((candidate) => candidate.sourceBreakdownId),
      ),
    [authoritativeCandidates],
  );
  const projectedSourceIds = useMemo(() => {
    const ids = new Set(authoritativeSourceIds);
    for (const operation of scratchOperations) {
      if (operation.kind === "stage") ids.add(operation.sourceBreakdownId);
    }
    for (const operation of heldOperations) {
      if (operation.kind === "stage") ids.add(operation.sourceBreakdownId);
    }
    return ids;
  }, [authoritativeSourceIds, heldOperations, scratchOperations]);
  const isSourceStaged = useCallback(
    (sourceBreakdownId: string) => authoritativeSourceIds.has(sourceBreakdownId),
    [authoritativeSourceIds],
  );
  const eligibility = useMemo<StagedCandidateEligibility>(
    () => ({
      archiveCandidateClear: authoritativeCandidates.length === 0,
      stagedSourceIds: authoritativeSourceIds,
      isSourceStaged,
    }),
    [authoritativeCandidates.length, authoritativeSourceIds, isSourceStaged],
  );

  const dispatch = useCallback(
    async <TResult,>(
      kind: CandidateOperationKind,
      command: OperationInput,
      invoke: () => Promise<TResult>,
      phase: CandidateOperationProjection["phase"] = "pending",
    ): Promise<CandidateCommandOutcome<TResult>> => {
      const operationScratchId = scratchBitId ?? "";
      const operationEpoch = epochRef.current;
      const pending: CandidateOperationProjection = {
        operationId: command.operationId,
        candidateId: command.candidateId,
        sourceBreakdownId: command.sourceBreakdownId,
        scratchBitId: operationScratchId,
        sequence: ++sequenceRef.current,
        kind,
        phase,
        ...(command.resultType === undefined
          ? {}
          : { resultType: command.resultType }),
      };
      setOperations((current) => [
        ...current.filter(
          (operation) => operation.operationId !== command.operationId,
        ),
        pending,
      ]);

      try {
        const result = await invoke();
        // The hold is decided here, against the newest snapshot, and again on
        // every later snapshot in the live-query callback. No timer is involved.
        const latest = snapshotRef.current;
        const held =
          kind !== "orphan_cleanup" &&
          operationScratchId !== "" &&
          epochRef.current === operationEpoch &&
          isSuccessfulResult(result)
            ? { ...pending, held: true as const }
            : null;
        const listed =
          latest?.scratchBitId === operationScratchId &&
          latest.candidates.some(({ id }) => id === command.candidateId);
        // Stage settles once listed, Unstage once no longer listed.
        const alreadySettled = held !== null && listed === (kind === "stage");
        setOperations((current) =>
          current.filter(
            (operation) => operation.operationId !== command.operationId,
          ),
        );
        if (held !== null && !alreadySettled) {
          setHeldState((current) => [
            ...current.filter(
              (entry) => entry.operation.operationId !== command.operationId,
            ),
            { operation: held, afterGeneration: generationRef.current },
          ]);
        }
        return result;
      } catch {
        setOperations((current) =>
          current.map((operation) =>
            operation.operationId === command.operationId
              ? { ...operation, phase: "unknown" }
              : operation,
          ),
        );
        return { operationId: command.operationId, outcome: "unknown" };
      }
    },
    [scratchBitId],
  );

  const stageCandidate = useCallback(
    async (command: StageCandidateCommand) =>
      dispatch("stage", command, async () => {
        const dataStore = await getDataStore();
        return dataStore.stageCandidate(command);
      }),
    [dispatch],
  );
  const reconcileStageCandidate = useCallback(
    async (command: StageCandidateCommand) =>
      dispatch("stage", command, async () => {
        const dataStore = await getDataStore();
        return dataStore.reconcileStageCandidate(command);
      }, "reconciling"),
    [dispatch],
  );
  const unstageCandidate = useCallback(
    async (command: UnstageCandidateCommand) =>
      dispatch("unstage", command, async () => {
        const dataStore = await getDataStore();
        return dataStore.unstageCandidate(command);
      }),
    [dispatch],
  );
  const reconcileUnstageCandidate = useCallback(
    async (command: UnstageCandidateCommand) =>
      dispatch("unstage", command, async () => {
        const dataStore = await getDataStore();
        return dataStore.reconcileUnstageCandidate(command);
      }, "reconciling"),
    [dispatch],
  );
  const cleanupConfirmedCandidateOrphan = useCallback(
    async (
      command: ConfirmedCandidateOrphanCleanupCommand,
    ): Promise<CandidateIntegrityCommandOutcome> => {
      if (command.proof.status !== "confirmed") {
        return {
          outcome: "not_dispatched",
          reason: "proof_not_confirmed",
        };
      }
      const existingCommand = confirmedOrphanCommandsRef.current.get(
        command.operationId,
      );
      if (existingCommand !== undefined) {
        return {
          outcome: "not_dispatched",
          reason: !isSameConfirmedOrphanCommand(existingCommand, command)
            ? "identity_mismatch"
            : terminalConfirmedOrphanOperationsRef.current.has(
                  command.operationId,
                )
              ? "terminal_no_retry"
              : "reconciliation_required",
        };
      }
      const integrityCandidate = integrityCandidates.find(
        ({ candidate }) => candidate.id === command.candidateId,
      )?.candidate;
      if (
        integrityCandidate === undefined ||
        command.proof.sourceBreakdownId !== command.sourceBreakdownId ||
        integrityCandidate.version !== command.candidateExpectedVersion ||
        integrityCandidate.sourceBreakdownId !== command.sourceBreakdownId ||
        integrityCandidate.scratchBitId !== command.scratchBitId ||
        integrityCandidate.resultType !== command.resultType ||
        integrityCandidate.lifecycle !== "staged"
      ) {
        return { outcome: "not_dispatched", reason: "identity_mismatch" };
      }

      confirmedOrphanCommandsRef.current.set(command.operationId, command);
      const outcome = await dispatch("orphan_cleanup", command, async () => {
        const dataStore = await getDataStore();
        return dataStore.cleanupConfirmedCandidateOrphan(command);
      });
      if (!("outcome" in outcome) && outcome.status === "not_applied") {
        confirmedOrphanCommandsRef.current.delete(command.operationId);
      } else if (!("outcome" in outcome)) {
        terminalConfirmedOrphanOperationsRef.current.add(command.operationId);
      }
      return outcome;
    },
    [dispatch, integrityCandidates],
  );
  const reconcileConfirmedCandidateOrphanCleanup = useCallback(
    async (
      command: ConfirmedCandidateOrphanCleanupCommand,
    ): Promise<CandidateIntegrityCommandOutcome> => {
      const approvedCommand = confirmedOrphanCommandsRef.current.get(
        command.operationId,
      );
      if (
        (approvedCommand !== undefined &&
          !isSameConfirmedOrphanCommand(approvedCommand, command)) ||
        (approvedCommand === undefined &&
          (command.scratchBitId !== scratchBitId ||
            !isSelfConsistentConfirmedOrphanCommand(command)))
      ) {
        return { outcome: "not_dispatched", reason: "identity_mismatch" };
      }
      if (
        terminalConfirmedOrphanOperationsRef.current.has(command.operationId)
      ) {
        return { outcome: "not_dispatched", reason: "terminal_no_retry" };
      }

      confirmedOrphanCommandsRef.current.set(command.operationId, command);
      const outcome = await dispatch("orphan_cleanup", command, async () => {
        const dataStore = await getDataStore();
        return dataStore.reconcileConfirmedCandidateOrphanCleanup(command);
      }, "reconciling");
      if (!("outcome" in outcome) && outcome.status === "not_applied") {
        confirmedOrphanCommandsRef.current.delete(command.operationId);
      } else if (!("outcome" in outcome)) {
        terminalConfirmedOrphanOperationsRef.current.add(command.operationId);
      }
      return outcome;
    },
    [dispatch, scratchBitId],
  );

  return {
    isReady,
    candidates,
    unresolvedCandidates,
    integrityCandidates,
    pendingOperations,
    unknownOperations,
    reconcilingOperations,
    heldOperations,
    stagedSourceIds: projectedSourceIds,
    counts,
    eligibility,
    stageCandidate,
    reconcileStageCandidate,
    unstageCandidate,
    reconcileUnstageCandidate,
    cleanupConfirmedCandidateOrphan,
    reconcileConfirmedCandidateOrphanCleanup,
  };
}

function isSameConfirmedOrphanCommand(
  left: ConfirmedCandidateOrphanCleanupCommand,
  right: ConfirmedCandidateOrphanCleanupCommand,
): boolean {
  return (
    left.operationId === right.operationId &&
    left.auditEventId === right.auditEventId &&
    left.candidateId === right.candidateId &&
    left.candidateExpectedVersion === right.candidateExpectedVersion &&
    left.sourceBreakdownId === right.sourceBreakdownId &&
    left.scratchBitId === right.scratchBitId &&
    left.resultType === right.resultType &&
    left.proof.status === "confirmed" &&
    right.proof.status === "confirmed" &&
    left.proof.cause === right.proof.cause &&
    left.proof.sourceBreakdownId === right.proof.sourceBreakdownId
  );
}

function isSelfConsistentConfirmedOrphanCommand(
  command: ConfirmedCandidateOrphanCleanupCommand,
): boolean {
  return (
    command.proof.status === "confirmed" &&
    command.proof.sourceBreakdownId === command.sourceBreakdownId
  );
}
