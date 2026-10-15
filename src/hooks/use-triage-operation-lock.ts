"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import type { RepositoryOperationStatus } from "@/lib/db/schema";

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
  acquire: (kind: TriageOperationKind, operationId: string) => boolean;
  release: (
    operationId: string,
    terminalStatus: RepositoryOperationStatus,
  ) => boolean;
}>;

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
  const [activeOperation, setActiveOperation] =
    useState<ActiveTriageOperation | null>(null);

  const acquire = useCallback(
    (kind: TriageOperationKind, operationId: string): boolean => {
      if (activeOperationRef.current !== null) return false;

      const operation = { kind, operationId };
      activeOperationRef.current = operation;
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
      setActiveOperation(null);
      return true;
    },
    [],
  );

  return useMemo(
    () => ({ activeOperation, acquire, isLocked, release }),
    [acquire, activeOperation, isLocked, release],
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
