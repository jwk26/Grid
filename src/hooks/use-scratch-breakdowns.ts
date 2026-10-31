"use client";

import { getConnectionMonitor } from "@/lib/db/connection";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { reportOfflineWrite } from "@/lib/feedback/offline-write";
import {
  getDataStore,
  type AddBreakdownCommand,
  type AddBreakdownResult,
  type CommandRejection,
  type DeleteBreakdownCommand,
  type DeleteBreakdownResult,
  type SaveBreakdownCommand,
  type SaveBreakdownResult,
  type SaveScratchTitleCommand,
  type SaveScratchTitleResult,
  liveRead,
} from "@/lib/db/datastore";
import type {
  RepositoryOperationStatus,
  ScratchBreakdown,
  UnknownRepositoryOperationOutcome,
} from "@/lib/db/schema";
import type { Bit } from "@/types";
import type { TriageOperationLock } from "@/hooks/use-triage-operation-lock";
import type { CreatedAtSortDirection } from "@/stores/triage-preferences-store";

type BreakdownSnapshot = Readonly<{
  scratchBitId: string;
  rows: ScratchBreakdown[];
  archiveEligible: boolean;
}>;

const EMPTY_BREAKDOWNS: ScratchBreakdown[] = [];

// The editor's offline source is the connection monitor, not `navigator.onLine` (SPEC §Connection states).
function isBrowserOnline(): boolean {
  return !getConnectionMonitor().isOffline();
}

export type BreakdownOperationProjection = Readonly<{
  kind: "add" | "delete";
  operationId: string;
  scratchBitId: string;
  breakdownId: string;
  phase: "pending" | "unknown" | "reconciling" | "terminal";
  status?: RepositoryOperationStatus;
  /** The rule a rejected answer named (`account_limit` shows its reason line). */
  rejection?: CommandRejection;
  sourceSnapshot?: ScratchBreakdown;
}>;

export type BreakdownCommandOutcome<TResult> =
  | TResult
  | UnknownRepositoryOperationOutcome;

export type ScratchTitleBlockerSnapshot =
  | "open"
  | "dirty"
  | "saving"
  | "conflicted"
  | "reconciling";

export type ScratchTitleBlockerHandle = Readonly<{
  getSnapshot: () => ScratchTitleBlockerSnapshot | null;
  hasDirtyEditIntent: () => boolean;
  setSnapshot: (snapshot: ScratchTitleBlockerSnapshot | null) => void;
  subscribe: (listener: () => void) => () => void;
}>;

export function createScratchTitleBlockerHandle(): ScratchTitleBlockerHandle {
  let current: ScratchTitleBlockerSnapshot | null = null;
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => current,
    hasDirtyEditIntent: () =>
      current === "dirty" || current === "conflicted",
    setSnapshot: (snapshot) => {
      if (snapshot === current) return;
      current = snapshot;
      for (const listener of listeners) listener();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export const ScratchTitleBlockerContext =
  createContext<ScratchTitleBlockerHandle | null>(null);

export function useScratchTitleBlockerContext(): ScratchTitleBlockerHandle {
  const handle = useContext(ScratchTitleBlockerContext);
  if (handle === null) {
    throw new Error(
      "useScratchTitleBlockerContext must be used inside TriageWorkspace",
    );
  }
  return handle;
}

export type ConditionalEditorPhase =
  | "pristine"
  | "dirty"
  | "validation"
  | "saving"
  | "not_applied"
  | "unknown"
  | "reconciling"
  | "conflict"
  | "invalidated";

type ConditionalEditorTarget =
  | Readonly<{ kind: "scratch-title"; id: string }>
  | Readonly<{ kind: "breakdown"; id: string }>;

type ConditionalEditorValueSnapshot = Readonly<{
  value: string;
  version: number;
  order?: number;
}>;

type ConditionalEditorCommand =
  | SaveScratchTitleCommand
  | SaveBreakdownCommand;

export type ConditionalEditorSnapshot = Readonly<{
  target: ConditionalEditorTarget;
  phase: ConditionalEditorPhase;
  base: ConditionalEditorValueSnapshot;
  draft: string;
  latest: ConditionalEditorValueSnapshot | null;
  copyableDraft: string | null;
  pendingIntent: boolean;
  focusIntent:
    | "field-end"
    | "field"
    | "edit-trigger"
    | "active-scratch-fallback"
    | "pending-action";
  command: ConditionalEditorCommand | null;
  /** A read-only check of an unconfirmed save runs while the editor is invalidated. */
  checking?: boolean;
}> | null;

export type ConditionalEditorOptions = Readonly<{
  operationLock?: TriageOperationLock;
  titleBlockerHandle?: ScratchTitleBlockerHandle;
}>;

function getScratchTitleBlocker(
  snapshot: ConditionalEditorSnapshot,
): ScratchTitleBlockerSnapshot | null {
  if (snapshot?.target.kind !== "scratch-title" || snapshot.phase === "invalidated") {
    return null;
  }
  if (snapshot.phase === "pristine") return "open";
  if (snapshot.phase === "saving") return "saving";
  if (snapshot.phase === "reconciling" || snapshot.phase === "unknown") {
    return "reconciling";
  }
  if (snapshot.phase === "conflict") return "conflicted";
  return "dirty";
}

function getScratchEditBlocker(
  snapshot: ConditionalEditorSnapshot,
): ScratchTitleBlockerSnapshot | null {
  if (snapshot === null || snapshot.phase === "invalidated") return null;
  if (snapshot.phase === "pristine") return "open";
  if (snapshot.phase === "saving") return "saving";
  if (snapshot.phase === "reconciling" || snapshot.phase === "unknown") {
    return "reconciling";
  }
  if (snapshot.phase === "conflict") return "conflicted";
  return "dirty";
}

export type ConditionalEditor = Readonly<{
  snapshot: ConditionalEditorSnapshot;
  titleBlocker: ScratchTitleBlockerSnapshot | null;
  focusIntent: NonNullable<ConditionalEditorSnapshot>["focusIntent"] | null;
  openScratchTitle: (scratch: Bit) => boolean;
  openBreakdown: (row: ScratchBreakdown, isStaged: boolean) => boolean;
  changeDraft: (draft: string) => void;
  save: (beforeAction?: () => void) => Promise<boolean>;
  reconcile: () => Promise<boolean>;
  useMine: () => Promise<boolean>;
  useLatest: () => boolean;
  cancel: () => boolean;
  invalidate: () => void;
  stayHere: () => void;
}>;

export function useScratchBreakdowns(
  scratchBitId: string | null,
  sort: CreatedAtSortDirection = "DESC",
  editorOptions: ConditionalEditorOptions = {},
): {
  breakdowns: ScratchBreakdown[];
  isReady: boolean;
  consumedBreakdownCount: number;
  hasObservedBreakdownHistory: boolean;
  isArchiveEligible: boolean;
  operations: BreakdownOperationProjection[];
  editor: ConditionalEditor;
  addBreakdown: (
    command: AddBreakdownCommand,
  ) => Promise<BreakdownCommandOutcome<AddBreakdownResult>>;
  reconcileAddBreakdown: (
    command: AddBreakdownCommand,
  ) => Promise<BreakdownCommandOutcome<AddBreakdownResult>>;
  deleteBreakdown: (
    command: DeleteBreakdownCommand,
  ) => Promise<BreakdownCommandOutcome<DeleteBreakdownResult>>;
  reconcileDeleteBreakdown: (
    command: DeleteBreakdownCommand,
  ) => Promise<BreakdownCommandOutcome<DeleteBreakdownResult>>;
} {
  const [snapshot, setSnapshot] = useState<BreakdownSnapshot | null>(null);
  const [operations, setOperations] = useState<BreakdownOperationProjection[]>([]);
  const [observedHistoryByScratch, setObservedHistoryByScratch] = useState<
    ReadonlySet<string>
  >(new Set());
  const [editorSnapshot, setEditorSnapshot] =
    useState<ConditionalEditorSnapshot>(null);
  const [editorFocusIntent, setEditorFocusIntent] = useState<
    NonNullable<ConditionalEditorSnapshot>["focusIntent"] | null
  >(null);
  const editorSnapshotRef = useRef<ConditionalEditorSnapshot>(null);
  const pendingIntentRef = useRef<(() => void) | null>(null);

  const commitEditorSnapshot = useCallback(
    (next: ConditionalEditorSnapshot) => {
      editorSnapshotRef.current = next;
      editorOptions.titleBlockerHandle?.setSnapshot(
        getScratchEditBlocker(next),
      );
      setEditorSnapshot(next);
      if (next !== null) setEditorFocusIntent(next.focusIntent);
    },
    [editorOptions.titleBlockerHandle],
  );

  useEffect(() => {
    if (scratchBitId === null) return;

    const subscription = liveRead(async (dataStore) => {
      const [rows, archiveEligibility] = await Promise.all([
        dataStore.getScratchBreakdowns(scratchBitId),
        dataStore.getScratchArchiveEligibility(scratchBitId),
      ]);
      return {
        scratchBitId,
        rows,
        archiveEligible: archiveEligibility.eligible,
      };
    }).subscribe({
      next: (nextSnapshot) => {
        if (nextSnapshot.rows.length > 0) {
          setObservedHistoryByScratch((current) => {
            if (current.has(scratchBitId)) return current;
            return new Set(current).add(scratchBitId);
          });
        }
        setSnapshot(nextSnapshot);
      },
      error: (err) => console.error("breakdowns liveQuery error:", err),
    });

    return () => subscription.unsubscribe();
  }, [scratchBitId]);

  const currentSnapshot =
    snapshot?.scratchBitId === scratchBitId ? snapshot : null;
  const currentOperations = useMemo(
    () =>
      scratchBitId === null
        ? []
        : operations.filter(
            (operation) => operation.scratchBitId === scratchBitId,
          ),
    [operations, scratchBitId],
  );
  const allRows = currentSnapshot?.rows ?? EMPTY_BREAKDOWNS;
  const authoritativeBreakdowns = useMemo(
    () =>
      allRows
        .filter((row) => row.consumedAt === null)
        .toSorted((left, right) => {
          const createdAtDifference =
            sort === "ASC"
              ? left.createdAt - right.createdAt
              : right.createdAt - left.createdAt;
          if (createdAtDifference !== 0) return createdAtDifference;

          const orderDifference = left.order - right.order;
          return orderDifference !== 0
            ? orderDifference
            : left.id.localeCompare(right.id);
        }),
    [allRows, sort],
  );
  const retainedDeleteRows = useMemo(
    () =>
      currentOperations.flatMap((operation) =>
        operation.kind === "delete" &&
        operation.phase !== "terminal" &&
        operation.sourceSnapshot !== undefined &&
        !authoritativeBreakdowns.some(
          (row) => row.id === operation.sourceSnapshot?.id,
        )
          ? [operation.sourceSnapshot]
          : [],
      ),
    [authoritativeBreakdowns, currentOperations],
  );
  const breakdowns = useMemo(
    () =>
      [...authoritativeBreakdowns, ...retainedDeleteRows].toSorted(
        (left, right) => {
          const createdAtDifference =
            sort === "ASC"
              ? left.createdAt - right.createdAt
              : right.createdAt - left.createdAt;
          if (createdAtDifference !== 0) return createdAtDifference;

          const orderDifference = left.order - right.order;
          return orderDifference !== 0
            ? orderDifference
            : left.id.localeCompare(right.id);
        },
      ),
    [authoritativeBreakdowns, retainedDeleteRows, sort],
  );
  const consumedBreakdownCount =
    allRows.length - authoritativeBreakdowns.length;

  const openScratchTitle = useCallback(
    (scratch: Bit): boolean => {
      if (
        editorSnapshotRef.current !== null ||
        editorOptions.operationLock?.isLocked() === true
      ) {
        return false;
      }
      pendingIntentRef.current = null;
      commitEditorSnapshot({
        target: { kind: "scratch-title", id: scratch.id },
        phase: "pristine",
        base: { value: scratch.title, version: scratch.version },
        draft: scratch.title,
        latest: null,
        copyableDraft: null,
        pendingIntent: false,
        focusIntent: "field-end",
        command: null,
      });
      return true;
    },
    [commitEditorSnapshot, editorOptions.operationLock],
  );

  const openBreakdown = useCallback(
    (row: ScratchBreakdown, isStaged: boolean): boolean => {
      if (
        editorSnapshotRef.current !== null ||
        isStaged ||
        editorOptions.operationLock?.isLocked() === true
      ) {
        return false;
      }
      pendingIntentRef.current = null;
      commitEditorSnapshot({
        target: { kind: "breakdown", id: row.id },
        phase: "pristine",
        base: { value: row.content, version: row.version, order: row.order },
        draft: row.content,
        latest: null,
        copyableDraft: null,
        pendingIntent: false,
        focusIntent: "field-end",
        command: null,
      });
      return true;
    },
    [commitEditorSnapshot, editorOptions.operationLock],
  );

  const changeDraft = useCallback(
    (draft: string) => {
      const current = editorSnapshotRef.current;
      if (
        current === null ||
        current.phase === "saving" ||
        current.phase === "unknown" ||
        current.phase === "reconciling" ||
        current.phase === "invalidated"
      ) {
        return;
      }
      commitEditorSnapshot({
        ...current,
        draft,
        phase: draft === current.base.value ? "pristine" : "dirty",
        focusIntent: "field",
      });
    },
    [commitEditorSnapshot],
  );

  // Read-only check of an unconfirmed save for an invalidated editor. An
  // automatic check runs once per command; Check again runs it on request. A
  // terminal answer releases the lock and clears the command; a failure keeps
  // both and stays invalidated.
  const checkedCommandIdsRef = useRef(new Set<string>());
  const checkInvalidated = useCallback(
    async (
      snapshot: NonNullable<ConditionalEditorSnapshot>,
      automatic: boolean,
    ): Promise<boolean> => {
      const command = snapshot.command;
      if (command === null) return false;
      if (automatic) {
        if (checkedCommandIdsRef.current.has(command.operationId)) return false;
        checkedCommandIdsRef.current.add(command.operationId);
      }
      commitEditorSnapshot({ ...snapshot, checking: true });
      try {
        const dataStore = await getDataStore();
        const result =
          snapshot.target.kind === "scratch-title"
            ? await dataStore.reconcileSaveScratchTitle(
                command as SaveScratchTitleCommand,
              )
            : await dataStore.reconcileSaveBreakdown(
                command as SaveBreakdownCommand,
              );
        editorOptions.operationLock?.release(result.operationId, result.status);
        const latest = editorSnapshotRef.current;
        if (latest?.phase === "invalidated") {
          commitEditorSnapshot({ ...latest, command: null, checking: false });
        }
        return result.status === "applied" || result.status === "already_applied";
      } catch {
        const latest = editorSnapshotRef.current;
        if (latest?.phase === "invalidated") {
          commitEditorSnapshot({ ...latest, checking: false });
        }
        return false;
      }
    },
    [commitEditorSnapshot, editorOptions.operationLock],
  );
  const applyEditorResult = useCallback(
    (
      current: NonNullable<ConditionalEditorSnapshot>,
      result: SaveScratchTitleResult | SaveBreakdownResult,
    ): boolean => {
      editorOptions.operationLock?.release(result.operationId, result.status);

      // Invalidated while the answer was pending: the recovery view stays, the
      // command is settled.
      if (editorSnapshotRef.current?.phase === "invalidated") {
        commitEditorSnapshot({
          ...editorSnapshotRef.current,
          command: null,
          checking: false,
          pendingIntent: false,
        });
        pendingIntentRef.current = null;
        return result.status === "applied" || result.status === "already_applied";
      }

      if (result.status === "applied" || result.status === "already_applied") {
        const pendingIntent = pendingIntentRef.current;
        pendingIntentRef.current = null;
        setEditorFocusIntent(pendingIntent === null ? "edit-trigger" : "pending-action");
        commitEditorSnapshot(null);
        pendingIntent?.();
        return true;
      }

      if (result.status === "not_applied") {
        commitEditorSnapshot({
          ...current,
          phase: "not_applied",
          command: null,
          pendingIntent: false,
          focusIntent: "field",
        });
        pendingIntentRef.current = null;
        return false;
      }

      if (result.status === "conflict") {
        const latest =
          current.target.kind === "scratch-title"
            ? (result as SaveScratchTitleResult).scratch
            : (result as SaveBreakdownResult).breakdown;
        if (latest !== null) {
          commitEditorSnapshot({
            ...current,
            phase: "conflict",
            latest: {
              value:
                current.target.kind === "scratch-title"
                  ? (latest as Bit).title
                  : (latest as ScratchBreakdown).content,
              version: latest.version,
              ...(current.target.kind === "breakdown"
                ? { order: (latest as ScratchBreakdown).order }
                : {}),
            },
            command: null,
            pendingIntent: false,
            focusIntent: "field",
          });
        } else {
          commitEditorSnapshot({
            ...current,
            phase: "invalidated",
            copyableDraft: current.draft,
            command: null,
            pendingIntent: false,
            focusIntent: "active-scratch-fallback",
          });
        }
        pendingIntentRef.current = null;
        return false;
      }

      commitEditorSnapshot({
        ...current,
        phase: "invalidated",
        copyableDraft: current.draft,
        command: null,
        pendingIntent: false,
        focusIntent: "active-scratch-fallback",
      });
      pendingIntentRef.current = null;
      return false;
    },
    [commitEditorSnapshot, editorOptions.operationLock],
  );

  const dispatchEditorSave = useCallback(
    async (
      current: NonNullable<ConditionalEditorSnapshot>,
      command: ConditionalEditorCommand,
      reconcile: boolean,
    ): Promise<boolean> => {
      const phase = reconcile ? "reconciling" : "saving";
      commitEditorSnapshot({ ...current, phase, command });
      try {
        const dataStore = await getDataStore();
        const result =
          current.target.kind === "scratch-title"
            ? reconcile
              ? await dataStore.reconcileSaveScratchTitle(
                  command as SaveScratchTitleCommand,
                )
              : await dataStore.saveScratchTitle(
                  command as SaveScratchTitleCommand,
                )
            : reconcile
              ? await dataStore.reconcileSaveBreakdown(
                  command as SaveBreakdownCommand,
                )
              : await dataStore.saveBreakdown(command as SaveBreakdownCommand);
        return applyEditorResult(editorSnapshotRef.current ?? current, result);
      } catch {
        const latest = editorSnapshotRef.current ?? current;
        if (latest.phase === "invalidated") {
          // Invalidated while the request was out: check it once, read-only.
          pendingIntentRef.current = null;
          void checkInvalidated(latest, true);
          return false;
        }
        // The outcome is unknown: keep the command and the lock, drop a pending
        // navigation (a later Check again never navigates) and never resend.
        pendingIntentRef.current = null;
        commitEditorSnapshot({
          ...latest,
          phase: "unknown",
          command,
          pendingIntent: false,
        });
        return false;
      }
    },
    [applyEditorResult, checkInvalidated, commitEditorSnapshot],
  );

  const save = useCallback(
    async (beforeAction?: () => void): Promise<boolean> => {
      const current = editorSnapshotRef.current;
      if (
        current === null ||
        current.phase === "saving" ||
        current.phase === "unknown" ||
        current.phase === "reconciling" ||
        current.phase === "invalidated" ||
        current.phase === "conflict"
      ) {
        return false;
      }
      if (current.draft.trim().length === 0) {
        commitEditorSnapshot({ ...current, phase: "validation", focusIntent: "field" });
        return false;
      }
      if (current.draft === current.base.value) {
        pendingIntentRef.current = null;
        setEditorFocusIntent(
          beforeAction === undefined ? "edit-trigger" : "pending-action",
        );
        commitEditorSnapshot(null);
        beforeAction?.();
        return true;
      }
      if (isBrowserOnline() === false) {
        // Offline write attempt (F05, F18): nothing changes on screen and the
        // draft stays; only the shared offline toast appears.
        reportOfflineWrite();
        return false;
      }

      const operationId = crypto.randomUUID();
      if (
        editorOptions.operationLock === undefined ||
        !editorOptions.operationLock.acquire("edit", operationId)
      ) {
        return false;
      }
      pendingIntentRef.current = beforeAction ?? null;
      const command: ConditionalEditorCommand =
        current.target.kind === "scratch-title"
          ? {
              operationId,
              scratchBitId: current.target.id,
              expectedVersion: current.base.version,
              baseTitle: current.base.value,
              title: current.draft,
            }
          : {
              operationId,
              breakdownId: current.target.id,
              expectedVersion: current.base.version,
              baseContent: current.base.value,
              baseOrder: current.base.order ?? 0,
              content: current.draft,
              order: current.base.order ?? 0,
            };
      return dispatchEditorSave(
        { ...current, pendingIntent: beforeAction !== undefined },
        command,
        false,
      );
    },
    [commitEditorSnapshot, dispatchEditorSave, editorOptions],
  );

  const reconcile = useCallback(async (): Promise<boolean> => {
    const current = editorSnapshotRef.current;
    if (current === null || current.command === null) return false;
    if (current.phase === "invalidated") {
      if (current.checking === true) return false;
      return checkInvalidated(current, false);
    }
    if (current.phase !== "unknown") return false;
    return dispatchEditorSave(current, current.command, true);
  }, [checkInvalidated, dispatchEditorSave]);

  const useMine = useCallback(async (): Promise<boolean> => {
    const current = editorSnapshotRef.current;
    if (current === null || current.phase !== "conflict" || current.latest === null) {
      return false;
    }
    const next = {
      ...current,
      base: current.latest,
      phase: "dirty" as const,
      command: null,
    };
    commitEditorSnapshot(next);
    return save();
  }, [commitEditorSnapshot, save]);

  const useLatest = useCallback((): boolean => {
    const current = editorSnapshotRef.current;
    if (current === null || current.phase !== "conflict" || current.latest === null) {
      return false;
    }
    pendingIntentRef.current = null;
    setEditorFocusIntent("edit-trigger");
    commitEditorSnapshot(null);
    return true;
  }, [commitEditorSnapshot]);

  const cancel = useCallback((): boolean => {
    const current = editorSnapshotRef.current;
    if (
      current === null ||
      current.phase === "saving" ||
      current.phase === "unknown" ||
      current.phase === "reconciling" ||
      // Close would drop the command and strand the lock.
      (current.phase === "invalidated" && current.command !== null)
    ) {
      return false;
    }
    pendingIntentRef.current = null;
    setEditorFocusIntent(
      current.phase === "invalidated" ? "active-scratch-fallback" : "edit-trigger",
    );
    commitEditorSnapshot(null);
    return true;
  }, [commitEditorSnapshot]);

  const invalidate = useCallback(() => {
    const current = editorSnapshotRef.current;
    if (current === null || current.phase === "invalidated") return;
    pendingIntentRef.current = null;
    const next = {
      ...current,
      phase: "invalidated" as const,
      copyableDraft: current.draft,
      pendingIntent: false,
      focusIntent: "active-scratch-fallback" as const,
      // A request still out settles the command; Check again waits for it.
      ...(current.phase === "saving" || current.phase === "reconciling"
        ? { checking: true }
        : {}),
    };
    commitEditorSnapshot(next);
    // An editor holding an unconfirmed save checks it once; one whose request
    // is still out settles through that request's answer instead.
    if (current.phase === "unknown") void checkInvalidated(next, true);
  }, [checkInvalidated, commitEditorSnapshot]);

  const stayHere = useCallback(() => {
    const current = editorSnapshotRef.current;
    if (current === null || !current.pendingIntent) return;
    pendingIntentRef.current = null;
    commitEditorSnapshot({ ...current, pendingIntent: false });
  }, [commitEditorSnapshot]);

  const titleBlocker = getScratchTitleBlocker(editorSnapshot);

  const editor = useMemo<ConditionalEditor>(
    () => ({
      snapshot: editorSnapshot,
      titleBlocker,
      focusIntent: editorFocusIntent,
      openScratchTitle,
      openBreakdown,
      changeDraft,
      save,
      reconcile,
      useMine,
      useLatest,
      cancel,
      invalidate,
      stayHere,
    }),
    [
      cancel,
      changeDraft,
      editorSnapshot,
      editorFocusIntent,
      invalidate,
      openBreakdown,
      openScratchTitle,
      reconcile,
      save,
      stayHere,
      titleBlocker,
      useLatest,
      useMine,
    ],
  );

  const dispatch = useCallback(
    async <TResult,>(
      kind: BreakdownOperationProjection["kind"],
      command: AddBreakdownCommand | DeleteBreakdownCommand,
      phase: "pending" | "reconciling",
      invoke: () => Promise<TResult>,
      sourceSnapshot?: ScratchBreakdown,
    ): Promise<BreakdownCommandOutcome<TResult>> => {
      const projection: BreakdownOperationProjection = {
        kind,
        operationId: command.operationId,
        scratchBitId: command.scratchBitId,
        breakdownId: command.breakdownId,
        phase,
        ...(sourceSnapshot === undefined ? {} : { sourceSnapshot }),
      };
      setOperations((current) => {
        const previous = current.find(
          (operation) => operation.operationId === command.operationId,
        );
        const nextProjection =
          projection.sourceSnapshot === undefined &&
          previous?.sourceSnapshot !== undefined
            ? { ...projection, sourceSnapshot: previous.sourceSnapshot }
            : projection;
        return [
          ...current.filter(
            (operation) =>
              operation.operationId !== command.operationId &&
              (kind === "add"
                ? operation.kind !== "add"
                : operation.kind !== "delete" ||
                  operation.breakdownId !== command.breakdownId),
          ),
          nextProjection,
        ];
      });

      try {
        const result = await invoke();
        const { status, rejection } = result as {
          status: RepositoryOperationStatus;
          rejection?: CommandRejection;
        };
        setOperations((current) =>
          current.map((operation) =>
            operation.operationId === command.operationId
              ? {
                  ...operation,
                  phase: "terminal",
                  status,
                  ...(rejection === undefined ? {} : { rejection }),
                }
              : operation,
          ),
        );
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
    [],
  );

  const addBreakdown = useCallback(
    (command: AddBreakdownCommand) =>
      dispatch("add", command, "pending", async () => {
        const dataStore = await getDataStore();
        return dataStore.addBreakdown(command);
      }),
    [dispatch],
  );
  const reconcileAddBreakdown = useCallback(
    (command: AddBreakdownCommand) =>
      dispatch("add", command, "reconciling", async () => {
        const dataStore = await getDataStore();
        return dataStore.reconcileAddBreakdown(command);
      }),
    [dispatch],
  );
  const deleteBreakdown = useCallback(
    (command: DeleteBreakdownCommand) =>
      dispatch("delete", command, "pending", async () => {
        const dataStore = await getDataStore();
        return dataStore.deleteBreakdown(command);
      }, authoritativeBreakdowns.find((row) => row.id === command.breakdownId)),
    [authoritativeBreakdowns, dispatch],
  );
  const reconcileDeleteBreakdown = useCallback(
    (command: DeleteBreakdownCommand) =>
      dispatch("delete", command, "reconciling", async () => {
        const dataStore = await getDataStore();
        return dataStore.reconcileDeleteBreakdown(command);
      }, authoritativeBreakdowns.find((row) => row.id === command.breakdownId)),
    [authoritativeBreakdowns, dispatch],
  );

  return {
    breakdowns,
    isReady: currentSnapshot !== null,
    consumedBreakdownCount,
    hasObservedBreakdownHistory:
      scratchBitId !== null && observedHistoryByScratch.has(scratchBitId),
    isArchiveEligible: currentSnapshot?.archiveEligible ?? false,
    operations: currentOperations,
    editor,
    addBreakdown,
    reconcileAddBreakdown,
    deleteBreakdown,
    reconcileDeleteBreakdown,
  };
}
