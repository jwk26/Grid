"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getDataStore, liveRead } from "@/lib/db/datastore";
import {
  runGridExplorerSearch,
  searchGridExplorer,
  type GridExplorerSearchResult,
  type GridExplorerSearchRunner,
} from "@/lib/utils/grid-explorer-search";
import type { Bit, Node } from "@/types";

export type GridExplorerSearchMode = "closed" | "active" | "interrupted";
export type GridExplorerSearchStatus =
  | "idle"
  | "loading"
  | "refreshing"
  | "ready"
  | "error";
export type GridExplorerSearchFocusTarget =
  | Readonly<{ kind: "input" }>
  | Readonly<{ kind: "result"; resultKey: GridExplorerSearchResult["key"] }>;
export type GridExplorerSearchFeedback =
  | "stale-selection"
  | Readonly<{ kind: "undo-success"; source: string; title: string }>
  | null;
export type GridExplorerResultUndoSuccess = Readonly<{
  removedIndex: number;
  resultKey: GridExplorerSearchResult["key"];
  source: string;
  title: string;
}>;
export type GridExplorerSearchSelectionOutcome =
  | Readonly<{ kind: "selected"; result: GridExplorerSearchResult }>
  | Readonly<{ kind: "stale" }>;
export type GridExplorerRevealPresentation =
  | Readonly<{ kind: "revealed"; result: GridExplorerSearchResult }>
  | Readonly<{
      kind: "selection-cleared";
      id: string;
      title: string;
      nodePathIds: readonly string[];
    }>;

type SearchSession = Readonly<{
  mode: GridExplorerSearchMode;
  query: string;
}>;

type SearchSnapshot = Readonly<{
  nodes: Node[];
  bits: Bit[];
  revision: number;
}>;

type SearchProjection = Readonly<{
  results: GridExplorerSearchResult[];
  resultQuery: string | null;
  status: GridExplorerSearchStatus;
  error: string | null;
}>;

export type UseGridExplorerSearchOptions = Readonly<{
  runner?: GridExplorerSearchRunner;
}>;

export type UseGridExplorerSearchResult = Readonly<{
  mode: GridExplorerSearchMode;
  activeQuery: string | null;
  interruptedQuery: string | null;
  results: GridExplorerSearchResult[];
  status: GridExplorerSearchStatus;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  resultScrollTop: number;
  focusTarget: GridExplorerSearchFocusTarget;
  feedback: GridExplorerSearchFeedback;
  revealPresentation: GridExplorerRevealPresentation | null;
  openSearch: () => void;
  setQuery: (query: string) => void;
  interruptForDnd: () => void;
  closeSearch: () => void;
  retry: () => void;
  setResultScrollTop: (scrollTop: number) => void;
  focusInput: () => void;
  focusResult: (resultKey: GridExplorerSearchResult["key"]) => void;
  completeResultUndo: (success: GridExplorerResultUndoSuccess) => void;
  selectResult: (
    result: GridExplorerSearchResult,
  ) => Promise<GridExplorerSearchSelectionOutcome>;
  invalidatePendingSelection: () => void;
  clearReveal: () => void;
}>;

const CLOSED_SESSION: SearchSession = { mode: "closed", query: "" };
const INPUT_FOCUS: GridExplorerSearchFocusTarget = { kind: "input" };
const EMPTY_PROJECTION: SearchProjection = {
  results: [],
  resultQuery: null,
  status: "idle",
  error: null,
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Search request failed";
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function sameResult(
  previous: GridExplorerSearchResult,
  current: GridExplorerSearchResult,
): boolean {
  return (
    previous.key === current.key &&
    previous.title === current.title &&
    previous.breadcrumb === current.breadcrumb &&
    previous.ancestorIds.length === current.ancestorIds.length &&
    previous.ancestorIds.every((id, index) => id === current.ancestorIds[index]) &&
    previous.nodePathIds.length === current.nodePathIds.length &&
    previous.nodePathIds.every((id, index) => id === current.nodePathIds[index])
  );
}

function reconcileReveal(
  result: GridExplorerSearchResult,
  nodes: readonly Node[],
  bits: readonly Bit[],
): "reachable" | "bit-disappeared" | "unreachable" {
  const activeNodes = new Map(
    nodes
      .filter(
        (node) =>
          node.deletedAt === null &&
          node.archivedAt === null &&
          node.systemRole === null &&
          !node.hiddenFromGrid,
      )
      .map((node) => [node.id, node]),
  );
  let expectedParentId: string | null = null;
  for (const nodeId of result.nodePathIds) {
    const node = activeNodes.get(nodeId);
    if (node === undefined || node.parentId !== expectedParentId) {
      return "unreachable";
    }
    expectedParentId = node.id;
  }

  if (result.type === "node") {
    return result.nodePathIds.at(-1) === result.id
      ? "reachable"
      : "unreachable";
  }

  const bit = bits.find(
    (candidate) =>
      candidate.id === result.id &&
      candidate.deletedAt === null &&
      candidate.archivedAt === null,
  );
  return bit !== undefined && bit.parentId === expectedParentId
    ? "reachable"
    : "bit-disappeared";
}

export function useGridExplorerSearch(
  options: UseGridExplorerSearchOptions = {},
): UseGridExplorerSearchResult {
  const runner = options.runner ?? runGridExplorerSearch;
  const [session, setSession] = useState<SearchSession>(CLOSED_SESSION);
  const [snapshot, setSnapshot] = useState<SearchSnapshot | null>(null);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [projection, setProjection] =
    useState<SearchProjection>(EMPTY_PROJECTION);
  const [resultScrollTop, setResultScrollTopState] = useState(0);
  const [focusTarget, setFocusTarget] =
    useState<GridExplorerSearchFocusTarget>(INPUT_FOCUS);
  const [feedback, setFeedback] =
    useState<GridExplorerSearchFeedback>(null);
  const [revealPresentation, setRevealPresentation] =
    useState<GridExplorerRevealPresentation | null>(null);
  const [retryRevision, setRetryRevision] = useState(0);
  const requestIdRef = useRef(0);
  const selectionOperationIdRef = useRef(0);
  const projectionResultsRef = useRef(projection.results);
  const mountedRef = useRef(false);
  const searchEnabled = session.mode !== "closed";

  useEffect(() => {
    projectionResultsRef.current = projection.results;
  }, [projection.results]);

  useEffect(() => {
    mountedRef.current = true;
    let revision = 0;
    const subscription = liveRead(async (dataStore) => {
      const [nodes, bits] = await Promise.all([
        dataStore.getAllActiveNodes(),
        dataStore.getAllActiveBits(),
      ]);
      return { nodes, bits };
    }).subscribe({
      next: ({ nodes, bits }) => {
        if (!mountedRef.current) return;
        selectionOperationIdRef.current += 1;
        revision += 1;
        setSnapshot({ nodes, bits, revision });
        setSnapshotError(null);
        setFeedback(null);
        setRevealPresentation((current) => {
          if (current?.kind !== "revealed") return current;
          const reconciliation = reconcileReveal(current.result, nodes, bits);
          if (reconciliation === "reachable") return current;
          return reconciliation === "bit-disappeared"
            ? {
                kind: "selection-cleared",
                id: current.result.id,
                title: current.result.title,
                nodePathIds: current.result.nodePathIds,
              }
            : null;
        });
      },
      error: (error) => {
        if (!mountedRef.current) return;
        selectionOperationIdRef.current += 1;
        setFeedback(null);
        setSnapshotError(errorMessage(error));
      },
    });

    return () => {
      mountedRef.current = false;
      selectionOperationIdRef.current += 1;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const controller = new AbortController();
    const normalizedQuery = session.query.trim().replace(/\s+/g, " ");

    if (!searchEnabled || normalizedQuery.length === 0) {
      return () => controller.abort();
    }
    if (snapshotError !== null) {
      void Promise.resolve().then(() => {
        if (controller.signal.aborted || requestIdRef.current !== requestId) return;
        setFeedback(null);
        setProjection((current) => ({
          ...current,
          status: "error",
          error: snapshotError,
        }));
      });
      return () => controller.abort();
    }
    if (snapshot === null) {
      void Promise.resolve().then(() => {
        if (controller.signal.aborted || requestIdRef.current !== requestId) return;
        setFeedback(null);
        setProjection((current) => ({
          results:
            current.resultQuery === normalizedQuery ? current.results : [],
          resultQuery:
            current.resultQuery === normalizedQuery ? current.resultQuery : null,
          status: "loading",
          error: null,
        }));
      });
      return () => controller.abort();
    }

    void Promise.resolve().then(() => {
      if (controller.signal.aborted || requestIdRef.current !== requestId) return;
      setFeedback(null);
      setProjection((current) => ({
        results: current.resultQuery === normalizedQuery ? current.results : [],
        resultQuery:
          current.resultQuery === normalizedQuery ? current.resultQuery : null,
        status:
          current.resultQuery === normalizedQuery ? "refreshing" : "loading",
        error: null,
      }));
    });

    void runner({
      nodes: snapshot.nodes,
      bits: snapshot.bits,
      query: normalizedQuery,
      signal: controller.signal,
    })
      .then((results) => {
        if (
          controller.signal.aborted ||
          requestIdRef.current !== requestId
        ) {
          return;
        }
        setProjection({
          results,
          resultQuery: normalizedQuery,
          status: "ready",
          error: null,
        });
        setFeedback(null);
        setFocusTarget((current) => {
          if (current.kind !== "result") return current;
          return results.some(({ key }) => key === current.resultKey)
            ? current
            : INPUT_FOCUS;
        });
      })
      .catch((error: unknown) => {
        if (
          controller.signal.aborted ||
          requestIdRef.current !== requestId ||
          isAbortError(error)
        ) {
          return;
        }
        setProjection((current) => ({
          results:
            current.resultQuery === normalizedQuery ? current.results : [],
          resultQuery:
            current.resultQuery === normalizedQuery
              ? current.resultQuery
              : normalizedQuery,
          status: "error",
          error: errorMessage(error),
        }));
        setFeedback(null);
      });

    return () => controller.abort();
  }, [retryRevision, runner, searchEnabled, session.query, snapshot, snapshotError]);

  const openSearch = useCallback(() => {
    selectionOperationIdRef.current += 1;
    setSession((current) => ({
      mode: "active",
      query: current.query,
    }));
    setFocusTarget(INPUT_FOCUS);
    setRevealPresentation(null);
  }, []);

  const setQuery = useCallback((query: string) => {
    selectionOperationIdRef.current += 1;
    setSession({ mode: "active", query });
    setProjection(EMPTY_PROJECTION);
    setResultScrollTopState(0);
    setFocusTarget(INPUT_FOCUS);
    setFeedback(null);
  }, []);

  const interruptForDnd = useCallback(() => {
    selectionOperationIdRef.current += 1;
    setSession((current) =>
      current.mode === "active"
        ? { mode: "interrupted", query: current.query }
        : current,
    );
    setRevealPresentation(null);
  }, []);

  const closeSearch = useCallback(() => {
    selectionOperationIdRef.current += 1;
    requestIdRef.current += 1;
    setSession(CLOSED_SESSION);
    setProjection(EMPTY_PROJECTION);
    setResultScrollTopState(0);
    setFocusTarget(INPUT_FOCUS);
    setFeedback(null);
    setRevealPresentation(null);
  }, []);

  const retry = useCallback(() => {
    selectionOperationIdRef.current += 1;
    setFeedback(null);
    // A fresh object: the shared INPUT_FOCUS default would not re-run the
    // input focus effect, and the Try again button unmounts with the error.
    setFocusTarget({ kind: "input" });
    setRetryRevision((current) => current + 1);
  }, []);

  const invalidatePendingSelection = useCallback(() => {
    selectionOperationIdRef.current += 1;
  }, []);

  const setResultScrollTop = useCallback((scrollTop: number) => {
    setResultScrollTopState(
      Number.isFinite(scrollTop) ? Math.max(0, scrollTop) : 0,
    );
  }, []);

  const focusInput = useCallback(() => setFocusTarget(INPUT_FOCUS), []);
  const focusResult = useCallback(
    (resultKey: GridExplorerSearchResult["key"]) => {
      if (projection.results.some(({ key }) => key === resultKey)) {
        setFocusTarget({ kind: "result", resultKey });
      }
    },
    [projection.results],
  );

  const completeResultUndo = useCallback(
    ({ removedIndex, resultKey, source, title }: GridExplorerResultUndoSuccess) => {
      const currentResults = projectionResultsRef.current;
      const currentIndex = currentResults.findIndex(({ key }) => key === resultKey);
      const survivingResults = currentResults.filter(
        ({ key }) => key !== resultKey,
      );
      projectionResultsRef.current = survivingResults;
      setProjection((current) => ({
        ...current,
        results: current.results.filter(({ key }) => key !== resultKey),
      }));
      setFeedback({ kind: "undo-success", source, title });
      const next = survivingResults[
        currentIndex === -1 ? removedIndex : currentIndex
      ];
      setFocusTarget(
        next === undefined
          ? { kind: "input" }
          : { kind: "result", resultKey: next.key },
      );
    },
    [],
  );

  const selectResult = useCallback(
    async (
      selected: GridExplorerSearchResult,
    ): Promise<GridExplorerSearchSelectionOutcome> => {
      const operationId = selectionOperationIdRef.current + 1;
      selectionOperationIdRef.current = operationId;
      setFeedback(null);
      const normalizedQuery = session.query.trim().replace(/\s+/g, " ");
      const isCurrentOperation = () =>
        mountedRef.current && selectionOperationIdRef.current === operationId;
      try {
        const dataStore = await getDataStore();
        if (!isCurrentOperation()) return { kind: "stale" };
        const [nodes, bits] = await Promise.all([
          dataStore.getAllActiveNodes(),
          dataStore.getAllActiveBits(),
        ]);
        if (!isCurrentOperation()) return { kind: "stale" };
        const refreshedResults = searchGridExplorer({
          nodes,
          bits,
          query: normalizedQuery,
        });
        const refreshed = refreshedResults.find(({ key }) => key === selected.key);

        if (refreshed === undefined || !sameResult(selected, refreshed)) {
          setProjection({
            results: refreshedResults,
            resultQuery: normalizedQuery,
            status: "ready",
            error: null,
          });
          setFeedback("stale-selection");
          if (refreshed === undefined) setFocusTarget(INPUT_FOCUS);
          return { kind: "stale" };
        }

        requestIdRef.current += 1;
        setSession(CLOSED_SESSION);
        setProjection(EMPTY_PROJECTION);
        setResultScrollTopState(0);
        setFocusTarget(INPUT_FOCUS);
        setFeedback(null);
        setRevealPresentation({ kind: "revealed", result: refreshed });
        return { kind: "selected", result: refreshed };
      } catch (error) {
        if (!isCurrentOperation()) return { kind: "stale" };
        setProjection((current) => ({
          ...current,
          status: "error",
          error: errorMessage(error),
        }));
        return { kind: "stale" };
      }
    },
    [session.query],
  );
  const clearReveal = useCallback(() => setRevealPresentation(null), []);

  return useMemo(
    () => ({
      mode: session.mode,
      activeQuery: session.mode === "active" ? session.query : null,
      interruptedQuery:
        session.mode === "interrupted" ? session.query : null,
      results: projection.results,
      status: projection.status,
      isLoading: projection.status === "loading",
      isRefreshing: projection.status === "refreshing",
      error: projection.error,
      resultScrollTop,
      focusTarget,
      feedback,
      revealPresentation,
      openSearch,
      setQuery,
      interruptForDnd,
      closeSearch,
      retry,
      setResultScrollTop,
      focusInput,
      focusResult,
      completeResultUndo,
      selectResult,
      invalidatePendingSelection,
      clearReveal,
    }),
    [
      closeSearch,
      focusInput,
      focusResult,
      completeResultUndo,
      focusTarget,
      feedback,
      revealPresentation,
      interruptForDnd,
      openSearch,
      projection.error,
      projection.results,
      projection.status,
      resultScrollTop,
      retry,
      session.mode,
      session.query,
      selectResult,
      invalidatePendingSelection,
      clearReveal,
      setQuery,
      setResultScrollTop,
    ],
  );
}
