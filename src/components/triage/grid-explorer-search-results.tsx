"use client";

import { X } from "lucide-react";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
  type UIEvent,
} from "react";
import type {
  GridExplorerSearchFeedback,
  GridExplorerSearchFocusTarget,
  GridExplorerSearchStatus,
} from "@/hooks/use-grid-explorer-search";
import { INBOX_TRIAGE_COPY } from "@/lib/copy/inbox-triage";
import { NODE_ICON_MAP } from "@/lib/constants/node-icons";
import type { GridExplorerSearchResult } from "@/lib/utils/grid-explorer-search";

export interface GridExplorerSearchResultsProps {
  renderHeader?: (control: ReactNode) => ReactNode;
  feedback: GridExplorerSearchFeedback;
  focusTarget: GridExplorerSearchFocusTarget;
  query: string;
  resultScrollTop: number;
  results: GridExplorerSearchResult[];
  status: GridExplorerSearchStatus;
  onClose: () => void;
  onFocusInput: () => void;
  onFocusResult: (key: GridExplorerSearchResult["key"]) => void;
  onQueryChange: (query: string) => void;
  onRetry: () => void;
  onScrollTopChange: (scrollTop: number) => void;
  onSelectResult: (result: GridExplorerSearchResult) => void;
  getResultUndo?: (
    result: GridExplorerSearchResult,
  ) => GridExplorerSearchResultUndo | null;
}

export type GridExplorerSearchResultUndo = Readonly<{
  actionLabel: string;
  copy: string;
  disabled: boolean;
  onActivate: () => void;
  state: string;
}>;

function fill(
  template: string,
  values: Record<string, string | number>,
): string {
  return Object.entries(values).reduce(
    (copy, [key, value]) => copy.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

function stateCopy({
  feedback,
  query,
  results,
  status,
}: Pick<
  GridExplorerSearchResultsProps,
  "feedback" | "query" | "results" | "status"
>): string {
  const copy = INBOX_TRIAGE_COPY.explorerSearch.status;
  if (query.trim().length === 0) return copy.preSearch;
  if (status === "loading") return copy.loading;
  if (status === "refreshing") return copy.refreshing;
  if (status === "error") return copy.error;
  if (feedback === "stale-selection") return copy.staleSelection;
  if (feedback?.kind === "undo-success") {
    return `Restored “${feedback.title}” to ${feedback.source}.`;
  }
  if (status === "ready" && results.length === 0) {
    return fill(copy.noResults, { query });
  }
  return "";
}

function SearchResultUndo({
  result,
  undo,
}: {
  result: GridExplorerSearchResult;
  undo: GridExplorerSearchResultUndo;
}) {
  const actionRef = useRef<HTMLButtonElement>(null);
  const statusId = useId();
  const previousStateRef = useRef(undo.state);

  useEffect(() => {
    const enteredRecoveryState =
      previousStateRef.current !== undo.state &&
      (undo.state === "unknown" ||
        undo.state === "not-applied" ||
        undo.state === "conflict");
    previousStateRef.current = undo.state;
    if (enteredRecoveryState) actionRef.current?.focus({ preventScroll: true });
  }, [undo.state]);

  const actionName =
    undo.actionLabel === INBOX_TRIAGE_COPY.newlyPlacedUndo.actions.undo
      ? `Undo placement of ${result.title}`
      : undo.actionLabel;

  return (
    <>
      <button
        ref={actionRef}
        aria-describedby={statusId}
        aria-disabled={undo.disabled ? "true" : undefined}
        aria-label={actionName}
        className="explorer-search-undo newly-undo-action shrink-0"
        data-triage-role="explorer-search-undo"
        data-undo-action={undo.actionLabel}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          if (!undo.disabled) undo.onActivate();
        }}
      >
        {undo.actionLabel}
      </button>
      <div
        aria-atomic="true"
        aria-live="polite"
        className="newly-status-rail col-span-2"
        data-triage-role="explorer-search-undo-status"
        data-undo-state={undo.state}
        role="status"
      >
        <span
          aria-hidden="true"
          className="newly-status-mark"
          data-undo-status-mark={undo.state}
        />
        <p className="newly-status-reason" id={statusId}>
          {undo.copy}
        </p>
      </div>
    </>
  );
}

export function GridExplorerSearchResults({
  renderHeader,
  feedback,
  focusTarget,
  query,
  resultScrollTop,
  results,
  status,
  onClose,
  onFocusInput,
  onFocusResult,
  onQueryChange,
  onRetry,
  onScrollTopChange,
  onSelectResult,
  getResultUndo = () => null,
}: GridExplorerSearchResultsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLUListElement>(null);
  const resultRefs = useRef(new Map<GridExplorerSearchResult["key"], HTMLButtonElement>());
  const message = stateCopy({ feedback, query, results, status });
  const busy = status === "loading" || status === "refreshing";

  useLayoutEffect(() => {
    if (focusTarget.kind === "input") {
      inputRef.current?.focus({ preventScroll: true });
      return;
    }
    const row = resultRefs.current.get(focusTarget.resultKey);
    const viewport = resultsRef.current;
    if (row === undefined || viewport === null) return;
    row.focus({ preventScroll: true });
    const viewportBounds = viewport.getBoundingClientRect();
    const rowBounds = row.getBoundingClientRect();
    const nextScrollTop =
      rowBounds.top < viewportBounds.top
        ? viewport.scrollTop - (viewportBounds.top - rowBounds.top)
        : rowBounds.bottom > viewportBounds.bottom
          ? viewport.scrollTop + (rowBounds.bottom - viewportBounds.bottom)
          : viewport.scrollTop;
    if (nextScrollTop !== viewport.scrollTop) {
      viewport.scrollTop = nextScrollTop;
      onScrollTopChange(nextScrollTop);
    }
  }, [focusTarget, onScrollTopChange]);

  useLayoutEffect(() => {
    const viewport = resultsRef.current;
    if (viewport !== null && viewport.scrollTop !== resultScrollTop) {
      viewport.scrollTop = resultScrollTop;
    }
  }, [resultScrollTop]);

  function moveFrom(index: number, delta: -1 | 1) {
    const next = results[index + delta];
    if (next === undefined) {
      if (index + delta < 0) onFocusInput();
      return;
    }
    onFocusResult(next.key);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && results[0] !== undefined) {
      event.preventDefault();
      onFocusResult(results[0].key);
    } else if (event.key === "ArrowUp" && results.at(-1) !== undefined) {
      event.preventDefault();
      onFocusResult(results.at(-1)!.key);
    }
  }

  const field = (
      <div className="explorer-search-field" data-triage-role="explorer-search-find-strip">
        <input
          ref={inputRef}
          aria-label={INBOX_TRIAGE_COPY.explorerSearch.placeholder}
          data-triage-role="explorer-search-field"
          placeholder={INBOX_TRIAGE_COPY.explorerSearch.placeholder}
          type="search"
          value={query}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            onQueryChange(event.currentTarget.value)
          }
          onFocus={onFocusInput}
          onKeyDown={handleInputKeyDown}
        />
        <button
          aria-label={INBOX_TRIAGE_COPY.explorerSearch.closeAccessibleName}
          className="explorer-search-close"
          data-triage-role="explorer-search-close"
          type="button"
          onClick={onClose}
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
  );

  return (
    <>
      {renderHeader === undefined ? field : renderHeader(field)}
    <div
      className="explorer-search-body"
      data-testid="explorer-search-body"
      data-triage-role="explorer-search-body"
    >

      <div
        aria-label="Explorer search status"
        aria-atomic="true"
        aria-live="polite"
        className="explorer-search-status"
        data-triage-role="explorer-search-status"
        role="status"
      >
        {message}
        {status === "error" ? (
          <button
            className="explorer-search-retry"
            data-triage-role="explorer-search-retry"
            type="button"
            onClick={onRetry}
          >
            {INBOX_TRIAGE_COPY.explorerSearch.actions.retry}
          </button>
        ) : null}
      </div>
      <ul
        ref={resultsRef}
        aria-busy={busy}
        aria-label={`${results.length} results`}
        className="explorer-search-results"
        data-triage-role="explorer-search-results"
        onScroll={(event: UIEvent<HTMLUListElement>) =>
          onScrollTopChange(event.currentTarget.scrollTop)
        }
      >
        {results.map((result, index) => {
          const Icon = NODE_ICON_MAP[result.icon] ?? NODE_ICON_MAP.Box;
          const resultUndo = getResultUndo(result);
          return (
            <li
              className={
                resultUndo === null
                  ? "explorer-search-result-item"
                  : "explorer-search-result-item grid grid-cols-[minmax(0,1fr)_auto] gap-2"
              }
              data-undo-state={resultUndo?.state}
              data-triage-role="explorer-search-result-shell"
              key={result.key}
            >
              <button
                ref={(node) => {
                  if (node === null) resultRefs.current.delete(result.key);
                  else resultRefs.current.set(result.key, node);
                }}
                className="explorer-search-result min-w-0"
                data-triage-role="explorer-search-result"
                type="button"
                onClick={() => onSelectResult(result)}
                onFocus={() => onFocusResult(result.key)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    moveFrom(index, 1);
                  } else if (event.key === "ArrowUp") {
                    event.preventDefault();
                    moveFrom(index, -1);
                  } else if (event.key === "Enter") {
                    event.preventDefault();
                    onSelectResult(result);
                  }
                }}
              >
              <Icon
                aria-hidden="true"
                className="explorer-search-result-icon"
                style={result.color === null ? undefined : { color: result.color }}
              />
              <span className="explorer-search-result-copy">
                <span className="explorer-search-result-title">
                  <span
                    className="explorer-search-type"
                    data-triage-role="explorer-search-type"
                  >
                    {result.type === "node" ? "Node" : "Bit"}
                  </span>
                  {result.title}
                </span>
                <span
                  className="explorer-search-breadcrumb"
                  data-triage-role="explorer-search-breadcrumb"
                >
                  {result.breadcrumb}
                </span>
                {result.duplicate === null ? null : (
                  <span
                    className="explorer-search-duplicate"
                    data-triage-role="explorer-search-duplicate"
                  >
                    {fill(INBOX_TRIAGE_COPY.explorerSearch.duplicate, {
                      index: result.duplicate.index,
                      count: result.duplicate.total,
                    })}
                  </span>
                )}
              </span>
              </button>
              {resultUndo === null ? null : (
                <SearchResultUndo result={result} undo={resultUndo} />
              )}
            </li>
          );
        })}
      </ul>
    </div>
    </>
  );
}
