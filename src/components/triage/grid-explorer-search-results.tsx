"use client";

import { X } from "lucide-react";
import {
  useEffect,
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
import {
  statusEmphasisProps,
  useStatusPresentation,
} from "@/components/feedback/status-icon";
import { NewlyUndoSlot } from "@/components/grid/newly-undo-slot";
import type { ItemStatus } from "@/lib/feedback/item-status";
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
  copy: string;
  disabled: boolean;
  label: string;
  onActivate: () => void;
  phaseKey: string;
  reason: string;
  sentence: string;
  state: string;
  status: ItemStatus | null;
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

// The result row and its Undo slot share one status presentation (feedback F06, F07): the slot
// shows the glyph and the row takes the emphasis. The hidden live region announces the sentence.
function SearchResultItem({
  children,
  undo,
}: {
  children: ReactNode;
  undo: GridExplorerSearchResultUndo | null;
}) {
  const presentation = useStatusPresentation(
    undo?.status ?? null,
    undo?.phaseKey,
  );
  const actionRef = useRef<HTMLButtonElement>(null);
  const previousStateRef = useRef(undo?.state);

  useEffect(() => {
    const state = undo?.state;
    const enteredRecoveryState =
      previousStateRef.current !== state &&
      (state === "unknown" || state === "not-applied" || state === "conflict");
    previousStateRef.current = state;
    if (enteredRecoveryState) actionRef.current?.focus({ preventScroll: true });
  }, [undo?.state]);

  return (
    <li
      className={
        undo === null
          ? "explorer-search-result-item"
          : "explorer-search-result-item grid grid-cols-[minmax(0,1fr)_auto] gap-2"
      }
      data-undo-state={undo?.state}
      data-triage-role="explorer-search-result-shell"
      {...statusEmphasisProps(presentation)}
    >
      {children}
      {undo === null ? null : (
        <>
          <NewlyUndoSlot
            buttonRef={actionRef}
            className="explorer-search-undo newly-undo-action shrink-0"
            model={undo}
            presentation={presentation}
            role="explorer-search-undo"
          />
          <div
            aria-atomic="true"
            aria-live="polite"
            className="sr-only"
            data-triage-role="explorer-search-undo-status"
            role="status"
          >
            <p>{undo.copy}</p>
          </div>
        </>
      )}
    </li>
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
            <SearchResultItem key={result.key} undo={resultUndo}>
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
            </SearchResultItem>
          );
        })}
      </ul>
    </div>
    </>
  );
}
