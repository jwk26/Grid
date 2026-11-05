"use client";

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
  getConnectionMonitor,
  getOutageEvidenceCount,
  getRealConnectionState,
} from "@/lib/db/connection";
import type { RepositoryOperationStatus } from "@/lib/db/schema";
import { blockedWhileOffline } from "@/lib/feedback/offline-write";

export const TRIAGE_OPERATION_KINDS = [
  "add",
  "delete",
  "edit",
  "stage",
  "unstage",
  "placement",
  "undo",
  "archive",
  "trash",
] as const;

export type TriageOperationKind = (typeof TRIAGE_OPERATION_KINDS)[number];

export type ActiveTriageOperation = Readonly<{
  kind: TriageOperationKind;
  operationId: string;
}>;

export type TriageOperationLock = Readonly<{
  activeOperation: ActiveTriageOperation | null;
  isLocked: () => boolean;
  /**
   * Takes the lock for one operation. Every user write of the Inbox takes it first, so this is the
   * one offline gate for them (SPEC §Connection states, F18): while offline it shows the offline
   * toast and returns false with nothing changed. A reconcile only reads, so it passes
   * `{ reconcile: true }` and is not gated.
   */
  acquire: (
    kind: TriageOperationKind,
    operationId: string,
    options?: { reconcile?: boolean },
  ) => boolean;
  release: (
    operationId: string,
    terminalStatus: RepositoryOperationStatus,
  ) => boolean;
  /**
   * A command whose outcome is unknown keeps the lock; its holder hands the owner a read-only
   * check (a `reconcile_*` call that needs no component state) so the check outlives the surface
   * that started it (stabilization ST24, ST33). The check answers the terminal status, or null.
   * The four held-command members are optional only so test doubles of the lock stay small;
   * the real hook always provides them.
   */
  holdUnknown?: (
    operationId: string,
    check: () => Promise<RepositoryOperationStatus | null>,
  ) => void;
  /**
   * A holder reports that it is about to send its own check of the held command. Returns null when
   * a check of it is already out (send nothing); otherwise the function to call when it ends.
   */
  noteCheckStart?: (operationId: string) => (() => void) | null;
  /** The surface began to go, and the holder checks on its own: marks without checking. */
  markSurfaceGone?: (operationId: string) => void;
  /**
   * The surface is gone: marks it and, unless a check of the command started after the mark, runs
   * the owner's check once (deferred by a microtask, dropped if the workspace left).
   */
  surfaceGone?: (operationId: string) => void;
}>;

type HeldCommand = {
  operationId: string;
  check: () => Promise<RepositoryOperationStatus | null>;
  goneSeq: number | null;
  lastCheck: { seq: number; evidence: number; startedNormal: boolean };
  checking: boolean;
  returnSkipped: boolean;
  // The surface went while a check made on a mounted surface was still out (ST38): judged at its end.
  goneWhileChecking: boolean;
};

const TERMINAL_OPERATION_STATUSES: ReadonlySet<RepositoryOperationStatus> =
  new Set([
    "applied",
    "already_applied",
    "not_applied",
    "rejected",
    "conflict",
  ]);

export const TriageOperationLockContext =
  createContext<TriageOperationLock | null>(null);

export function useTriageOperationLock(): TriageOperationLock {
  const activeOperationRef = useRef<ActiveTriageOperation | null>(null);
  const heldRef = useRef<HeldCommand | null>(null);
  // The evidence count and real state when the operation started: the baseline of "its last check".
  const baselineRef = useRef<HeldCommand["lastCheck"] | null>(null);
  const seqRef = useRef(0);
  const disposedRef = useRef(false);
  const [activeOperation, setActiveOperation] =
    useState<ActiveTriageOperation | null>(null);

  const acquire = useCallback(
    (
      kind: TriageOperationKind,
      operationId: string,
      options?: { reconcile?: boolean },
    ): boolean => {
      if (activeOperationRef.current !== null) return false;
      if (options?.reconcile !== true && blockedWhileOffline()) return false;

      const operation = { kind, operationId };
      activeOperationRef.current = operation;
      baselineRef.current = {
        seq: 0,
        evidence: getOutageEvidenceCount(),
        startedNormal: getRealConnectionState() === "normal",
      };
      setActiveOperation(operation);
      return true;
    },
    [],
  );

  const isLocked = useCallback(() => activeOperationRef.current !== null, []);

  const release = useCallback(
    (
      operationId: string,
      terminalStatus: RepositoryOperationStatus,
    ): boolean => {
      if (!TERMINAL_OPERATION_STATUSES.has(terminalStatus)) return false;
      if (activeOperationRef.current?.operationId !== operationId) return false;

      activeOperationRef.current = null;
      heldRef.current = null;
      baselineRef.current = null;
      setActiveOperation(null);
      return true;
    },
    [],
  );

  const holdUnknown = useCallback(
    (
      operationId: string,
      check: () => Promise<RepositoryOperationStatus | null>,
    ) => {
      if (activeOperationRef.current?.operationId !== operationId) return;
      const existing = heldRef.current;
      if (existing?.operationId === operationId) {
        existing.check = check;
        return;
      }
      heldRef.current = {
        operationId,
        check,
        goneSeq: null,
        lastCheck: baselineRef.current ?? {
          seq: 0,
          evidence: getOutageEvidenceCount(),
          startedNormal: getRealConnectionState() === "normal",
        },
        checking: false,
        returnSkipped: false,
        goneWhileChecking: false,
      };
    },
    [],
  );

  // The reconnect rule (ST37): one more check only when outage evidence arrived since the
  // command's last check started, or that check started while the real state was not normal.
  const earnsAnotherCheck = (held: HeldCommand): boolean =>
    getOutageEvidenceCount() > held.lastCheck.evidence ||
    !held.lastCheck.startedNormal;

  const noteCheckStart = useCallback(
    (operationId: string): (() => void) | null => {
      const held = heldRef.current;
      if (held === null || held.operationId !== operationId) return () => {};
      if (held.checking) return null;
      held.checking = true;
      held.lastCheck = {
        seq: ++seqRef.current,
        evidence: getOutageEvidenceCount(),
        startedNormal: getRealConnectionState() === "normal",
      };
      const startedSeq = held.lastCheck.seq;
      return () => {
        held.checking = false;
        if (heldRef.current !== held || disposedRef.current) return;
        // The surface went while this check was out and it started before the surface began to go:
        // it does not count (ST38), so the owner's check runs once now, with no timer.
        if (
          held.goneWhileChecking &&
          held.goneSeq !== null &&
          startedSeq < held.goneSeq
        ) {
          held.goneWhileChecking = false;
          held.returnSkipped = false;
          void runOwnerCheck(held);
          return;
        }
        held.goneWhileChecking = false;
        // A return to normal skipped because this check was out is judged once now, with no timer.
        if (held.returnSkipped) {
          held.returnSkipped = false;
          if (getRealConnectionState() === "normal" && earnsAnotherCheck(held)) {
            void runOwnerCheck(held);
          }
        }
      };
    },
    // Empty deps on purpose: both read only refs and each other (`runOwnerCheck` is defined below
    // and called later), so their identity must not change across renders.
    [],
  );

  const runOwnerCheck = useCallback(async (held: HeldCommand): Promise<void> => {
    const done = noteCheckStart(held.operationId);
    if (done === null) return;
    let status: RepositoryOperationStatus | null = null;
    try {
      status = await held.check();
    } catch {
      status = null;
    }
    if (status !== null && TERMINAL_OPERATION_STATUSES.has(status)) {
      // Release first so the end-of-check judgement sees no record.
      if (heldRef.current === held) release(held.operationId, status);
    }
    done();
  }, [noteCheckStart, release]);

  const markSurfaceGone = useCallback((operationId: string) => {
    const held = heldRef.current;
    if (held === null || held.operationId !== operationId) return;
    if (held.goneSeq === null) held.goneSeq = ++seqRef.current;
  }, []);

  const surfaceGone = useCallback(
    (operationId: string) => {
      markSurfaceGone(operationId);
      void Promise.resolve().then(() => {
        const held = heldRef.current;
        if (disposedRef.current || held === null || held.operationId !== operationId) return;
        // A check that started after the surface began to go counts; one made while it was mounted does not.
        if (held.goneSeq !== null && held.lastCheck.seq > held.goneSeq) return;
        if (held.checking) {
          held.goneWhileChecking = true;
          return;
        }
        void runOwnerCheck(held);
      });
    },
    [markSurfaceGone, runOwnerCheck],
  );

  // The real state returned to normal: a command whose surface is gone gets one more check only
  // if the reconnect rule earns it. A command whose surface is mounted keeps its own controls.
  useEffect(() => {
    disposedRef.current = false;
    const monitor = getConnectionMonitor();
    let previous = monitor.getRealState();
    const unsubscribe = monitor.subscribe(() => {
      const current = monitor.getRealState();
      const returned = previous !== "normal" && current === "normal";
      previous = current;
      if (!returned) return;
      const held = heldRef.current;
      if (held === null || held.goneSeq === null) return;
      if (held.checking) {
        held.returnSkipped = true;
        return;
      }
      if (earnsAnotherCheck(held)) void runOwnerCheck(held);
    });
    return () => {
      disposedRef.current = true;
      heldRef.current = null;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return useMemo(
    () => ({
      activeOperation,
      acquire,
      isLocked,
      release,
      holdUnknown,
      noteCheckStart,
      markSurfaceGone,
      surfaceGone,
    }),
    [
      acquire,
      activeOperation,
      isLocked,
      release,
      holdUnknown,
      noteCheckStart,
      markSurfaceGone,
      surfaceGone,
    ],
  );
}

export function useTriageOperationLockContext(): TriageOperationLock {
  const lock = useContext(TriageOperationLockContext);
  if (lock === null) {
    throw new Error(
      "useTriageOperationLockContext must be used inside TriageWorkspace",
    );
  }
  return lock;
}
