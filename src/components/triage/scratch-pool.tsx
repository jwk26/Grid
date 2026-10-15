"use client";

import {
  ArrowDownUp,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useInbox,
  type PoolLifecycleProjection,
} from "@/hooks/use-inbox";
import { useTriageDepartureContext } from "@/hooks/use-triage-departure";
import { useTrashScratchEntries } from "@/hooks/use-trash-scratch";
import { useTriageOperationLockContext } from "@/hooks/use-triage-operation-lock";
import { INBOX_TRIAGE_COPY } from "@/lib/copy/inbox-triage";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils/relative-time";
import { useTriagePreferencesStore } from "@/stores/triage-preferences-store";
import { useTriageStore } from "@/stores/triage-store";
import { scratchTrashDisabledCopy } from "./scratch-trash-dialog";
import type { Bit } from "@/types";

function EmptyState() {
  return (
    <div className="scratch-pool__empty flex h-full flex-col items-center justify-center px-4 py-8 text-center">
      <Inbox className="h-8 w-8 text-muted-foreground/25" aria-hidden="true" />
      <div
        className="mt-2 text-xs font-medium text-muted-foreground"
        data-external-removal-focus="inbox-empty"
        tabIndex={-1}
      >
        No active scratches
      </div>
      <div className="mt-1 text-[10px] text-muted-foreground/50">
        Captured items will appear here.
      </div>
    </div>
  );
}

function ScratchRow({
  bit,
  isSelected,
  reducedMotion,
  onSelect,
  rowRef,
}: {
  bit: Bit;
  isSelected: boolean;
  reducedMotion: boolean;
  onSelect: (id: string, focus: () => void) => void;
  rowRef: (element: HTMLButtonElement | null) => void;
}) {
  const trashEntries = useTrashScratchEntries();
  const trashReason = trashEntries?.disabledReason(bit.id) ?? null;
  const trashReasonCopy =
    trashReason === null ? null : scratchTrashDisabledCopy(trashReason);
  const trashReasonId = `scratch-trash-reason-${bit.id}`;
  const trashCopy = INBOX_TRIAGE_COPY.scratchTrash;

  return (
    <div
      className="scratch-pool__row-container relative"
      data-triage-role="pool-row-container"
    >
      <button
        ref={rowRef}
        aria-label={bit.title}
        aria-pressed={isSelected}
        data-external-removal-destination={bit.id}
        data-triage-role={isSelected ? "pool-selected-row" : "pool-row"}
        data-triage-state={isSelected ? "selected" : "default"}
        className={cn(
          "scratch-pool__row group relative h-[52px] w-full border-b border-border/30 px-3 py-2 text-left last:border-b-0",
          trashEntries !== null && "scratch-pool__row--with-trash",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
          isSelected ? "bg-primary/10" : "bg-transparent hover:bg-accent/60",
          reducedMotion
            ? "transition-none"
            : isSelected
              ? "transition-all duration-100 ease-out"
              : "transition-colors duration-150 ease-out",
        )}
        type="button"
        onClick={(event) => {
          const target = event.currentTarget;
          onSelect(bit.id, () => target.focus());
        }}
      >
        {isSelected ? (
          <span
            aria-hidden="true"
            className="scratch-pool__selected-marker absolute bottom-0 left-0 top-0 w-1 bg-primary"
          />
        ) : null}
        <div
          className={cn(
            "scratch-pool__row-title truncate text-xs font-medium",
            isSelected ? "text-primary" : "text-foreground",
          )}
        >
          {bit.title}
        </div>
        <div
          className={cn(
            "scratch-pool__row-time mt-0.5 text-[10px] font-normal",
            isSelected
              ? "text-primary/70"
              : "text-muted-foreground/70 group-hover:text-muted-foreground",
          )}
        >
          {formatRelativeTime(bit.createdAt)}
        </div>
      </button>
      {trashEntries === null ? null : (
        <>
          <button
            aria-describedby={trashReasonCopy === null ? undefined : trashReasonId}
            aria-label={INBOX_TRIAGE_COPY.accessibleNames.moveScratchToTrash.replace(
              "{title}",
              bit.title,
            )}
            className={cn(
              "scratch-pool__trash absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-destructive/10 hover:text-destructive focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            )}
            data-scratch-trash-entry="pool"
            data-triage-role="pool-row-trash-action"
            disabled={trashReason !== null}
            title={trashReasonCopy ?? trashCopy.tooltip}
            type="button"
            onClick={(event) =>
              trashEntries.request(bit.id, event.currentTarget)
            }
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          {trashReasonCopy === null ? null : (
            <span className="sr-only" id={trashReasonId}>
              {trashReasonCopy}
            </span>
          )}
        </>
      )}
    </div>
  );
}

type PoolActivity = Readonly<{
  arrivalIds: ReadonlySet<string>;
  archived: number;
  deleted: number;
  restored: number;
}>;

const EMPTY_POOL_ACTIVITY: PoolActivity = {
  arrivalIds: new Set(),
  archived: 0,
  deleted: 0,
  restored: 0,
};

const EMPTY_POOL_LIFECYCLE_PROJECTION: PoolLifecycleProjection = {
  revision: 0,
  changes: [],
};

type PoolActivityState = Readonly<{
  revision: number;
  activity: PoolActivity;
}>;

function accumulatePoolActivity(
  current: PoolActivity,
  projection: PoolLifecycleProjection,
  selectedScratchId: string | null,
): PoolActivity {
  const arrivalIds = new Set(current.arrivalIds);
  let archived = current.archived;
  let deleted = current.deleted;
  let restored = current.restored;

  for (const change of projection.changes) {
    if (
      (change.kind === "archive" || change.kind === "delete") &&
      change.scratchId === selectedScratchId
    ) {
      continue;
    }
    if (change.kind === "remote-arrival") arrivalIds.add(change.scratchId);
    if (change.kind === "archive") archived += 1;
    if (change.kind === "delete") deleted += 1;
    if (change.kind === "restore") restored += 1;
  }

  return { arrivalIds, archived, deleted, restored };
}

function fillCount(template: string, count: number): string {
  return template.replace("{count}", String(count));
}

function getPoolActivityCopy(activity: PoolActivity): string | null {
  const arrivalCount = activity.arrivalIds.size;
  const categories = [
    arrivalCount > 0,
    activity.archived > 0,
    activity.deleted > 0,
    activity.restored > 0,
  ].filter(Boolean).length;
  if (categories === 0) return null;

  if (categories === 1) {
    if (arrivalCount > 0) {
      return arrivalCount === 1
        ? INBOX_TRIAGE_COPY.poolStatus.arrivalOne
        : fillCount(INBOX_TRIAGE_COPY.poolStatus.arrivalMany, arrivalCount);
    }
    if (activity.archived > 0) {
      return activity.archived === 1
        ? INBOX_TRIAGE_COPY.poolStatus.archiveOne
        : fillCount(INBOX_TRIAGE_COPY.poolStatus.archiveMany, activity.archived);
    }
    if (activity.deleted > 0) {
      return activity.deleted === 1
        ? INBOX_TRIAGE_COPY.poolStatus.deleteOne
        : fillCount(INBOX_TRIAGE_COPY.poolStatus.deleteMany, activity.deleted);
    }
    return activity.restored === 1
      ? INBOX_TRIAGE_COPY.poolStatus.restoreOne
      : fillCount(INBOX_TRIAGE_COPY.poolStatus.restoreMany, activity.restored);
  }

  const clauses = [
    arrivalCount > 0 ? `${arrivalCount} new` : null,
    activity.archived > 0 ? `${activity.archived} archived` : null,
    activity.deleted > 0 ? `${activity.deleted} deleted` : null,
    activity.restored > 0 ? `${activity.restored} restored` : null,
  ].filter((clause): clause is string => clause !== null);
  return INBOX_TRIAGE_COPY.poolStatus.mixed.replace(
    "{clauses}",
    clauses.join(", "),
  );
}

export function ScratchPool() {
  const { isLocked } = useTriageOperationLockContext();
  const departure = useTriageDepartureContext();
  const inbox = useInbox();
  const { activeScratchBits } = inbox;
  const poolLifecycleProjection =
    inbox.poolLifecycleProjection ?? EMPTY_POOL_LIFECYCLE_PROJECTION;
  const selectedScratchId = useTriageStore((state) => state.selectedScratchId);
  const selectScratch = useTriageStore((state) => state.selectScratch);
  const scratchPoolExpanded = useTriageStore(
    (state) => state.scratchPoolExpanded,
  );
  const setScratchPoolExpanded = useTriageStore(
    (state) => state.setScratchPoolExpanded,
  );
  const setScratchPoolManualExpandedForId = useTriageStore(
    (state) => state.setScratchPoolManualExpandedForId,
  );
  const searchQuery = useTriageStore((state) => state.scratchPoolQuery);
  const setSearchQuery = useTriageStore((state) => state.setScratchPoolQuery);
  const scratchPoolScroll = useTriageStore((state) => state.scratchPoolScroll);
  const setScratchPoolScroll = useTriageStore(
    (state) => state.setScratchPoolScroll,
  );
  const poolCreatedAtSort = useTriagePreferencesStore(
    (state) => state.poolCreatedAtSort,
  );
  const setPoolCreatedAtSort = useTriagePreferencesStore(
    (state) => state.setPoolCreatedAtSort,
  );
  const [reducedMotion, setReducedMotion] = useState(false);
  const [activityState, setActivityState] = useState<PoolActivityState>({
    revision: 0,
    activity: EMPTY_POOL_ACTIVITY,
  });
  const searchInputRef = useRef<HTMLInputElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);
  const restoreToggleFocusRef = useRef(false);
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());

  let activity = activityState.activity;
  if (poolLifecycleProjection.revision > activityState.revision) {
    activity = accumulatePoolActivity(
      activityState.activity,
      poolLifecycleProjection,
      selectedScratchId,
    );
    setActivityState({
      revision: poolLifecycleProjection.revision,
      activity,
    });
  }

  const count = activeScratchBits.length;

  const orderedBits = useMemo(
    () =>
      activeScratchBits.toSorted((left, right) =>
        poolCreatedAtSort === "ASC"
        ? left.createdAt - right.createdAt
        : right.createdAt - left.createdAt,
      ),
    [activeScratchBits, poolCreatedAtSort],
  );
  const sortedFilteredBits = useMemo(() => {
    const normalizedQuery = searchQuery.toLocaleLowerCase();
    return normalizedQuery.length === 0
      ? orderedBits
      : orderedBits.filter((bit) =>
          bit.title.toLocaleLowerCase().includes(normalizedQuery),
        );
  }, [orderedBits, searchQuery]);
  const selectedIsHidden =
    searchQuery.length > 0 &&
    selectedScratchId !== null &&
    activeScratchBits.some((bit) => bit.id === selectedScratchId) &&
    !sortedFilteredBits.some((bit) => bit.id === selectedScratchId);
  const activityCopy = getPoolActivityCopy(activity);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return;
    }

    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => setReducedMotion(query.matches);

    handleChange();
    query.addEventListener("change", handleChange);

    return () => {
      query.removeEventListener("change", handleChange);
    };
  }, []);

  useEffect(() => {
    if (!restoreToggleFocusRef.current) return;
    restoreToggleFocusRef.current = false;
    toggleButtonRef.current?.focus();
  }, [scratchPoolExpanded]);

  useLayoutEffect(() => {
    const viewport = scrollViewportRef.current;
    if (
      viewport === null ||
      scratchPoolScroll.anchorId === null ||
      !sortedFilteredBits.some(
        (bit) => bit.id === scratchPoolScroll.anchorId,
      )
    ) {
      return;
    }

    viewport.scrollTop = scratchPoolScroll.offset;
  }, [scratchPoolScroll, sortedFilteredBits]);

  const handleToggle = useCallback(() => {
    restoreToggleFocusRef.current = true;
    if (!scratchPoolExpanded) {
      setScratchPoolExpanded(true);
      setScratchPoolManualExpandedForId(selectedScratchId);
    } else {
      setScratchPoolExpanded(false);
    }
  }, [
    scratchPoolExpanded,
    selectedScratchId,
    setScratchPoolExpanded,
    setScratchPoolManualExpandedForId,
  ]);

  const handleSelect = useCallback(
    (id: string, focus: () => void) => {
      if (isLocked()) return;
      if (id === selectedScratchId) return;
      departure.requestDeparture({
        id,
        focus,
        kind: "scratch",
        perform: () => selectScratch(id),
      });
    },
    [departure, isLocked, selectScratch, selectedScratchId],
  );

  const handleSortToggle = useCallback(
    () => setPoolCreatedAtSort(poolCreatedAtSort === "ASC" ? "DESC" : "ASC"),
    [poolCreatedAtSort, setPoolCreatedAtSort],
  );
  const handleSearchClear = useCallback(() => {
    setSearchQuery("");
    searchInputRef.current?.focus();
  }, [setSearchQuery]);
  const handleReviewNew = useCallback(() => {
    const firstSurviving = orderedBits.find((bit) =>
      activity.arrivalIds.has(bit.id),
    );
    setActivityState((current) => ({
      ...current,
      activity: { ...current.activity, arrivalIds: new Set() },
    }));
    const row =
      firstSurviving === undefined ? undefined : rowRefs.current.get(firstSurviving.id);
    if (row !== undefined) {
      row.scrollIntoView?.({ block: "nearest" });
      row.focus();
    } else {
      searchInputRef.current?.focus();
    }
  }, [activity.arrivalIds, orderedBits]);
  const handleDismissActivity = useCallback(() => {
    setActivityState((current) => ({
      ...current,
      activity: {
        ...current.activity,
        archived: 0,
        deleted: 0,
        restored: 0,
      },
    }));
    searchInputRef.current?.focus();
  }, []);
  const handleScroll = useCallback(() => {
    const viewport = scrollViewportRef.current;
    if (viewport === null) return;
    setScratchPoolScroll({
      anchorId: sortedFilteredBits[0]?.id ?? null,
      offset: viewport.scrollTop,
    });
  }, [setScratchPoolScroll, sortedFilteredBits]);

  if (scratchPoolExpanded) {
    return (
      <aside
        data-testid="scratch-pool"
        data-triage-state="expanded"
        className={cn(
          "scratch-pool flex h-full min-w-0 flex-col border-r border-border bg-muted/10 w-72",
          reducedMotion
            ? "transition-none"
            : "transition-[width] duration-200 ease-in-out",
        )}
      >
        <div className="scratch-pool__frame flex h-full min-h-0 flex-col">
          <div className="scratch-pool__header relative flex h-8 shrink-0 items-center justify-between border-b border-border bg-muted/30 px-3 py-1.5">
            <div className="flex items-center gap-1.5">
              <Inbox
                className="h-3.5 w-3.5 text-muted-foreground/80"
                aria-hidden="true"
              />
              <span
                aria-label={`${count} scratch${count === 1 ? "" : "es"}`}
                data-triage-role="pool-total-count"
                className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/80 px-1 text-[9px] font-semibold text-primary-foreground"
              >
                {count}
              </span>
            </div>
            <h2
              className="scratch-pool__heading"
              data-triage-role="section-header"
              id="triage-scratch-pool-heading"
              tabIndex={-1}
            >
              {INBOX_TRIAGE_COPY.sectionNames.scratchPool}
            </h2>
            <button
              ref={toggleButtonRef}
              type="button"
              aria-label={INBOX_TRIAGE_COPY.baseActions.collapseScratchPool}
              title={INBOX_TRIAGE_COPY.baseActions.collapseScratchPool}
              onClick={handleToggle}
              className={cn(
                "scratch-pool__toggle rounded-md p-0.5 text-muted-foreground/80 hover:bg-muted hover:text-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                reducedMotion
                  ? "transition-none"
                  : "transition-colors duration-150 ease-out",
              )}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div
            className="scratch-pool__tools shrink-0"
            data-triage-role="pool-tools"
          >
            <div className="scratch-pool__search-row relative flex min-w-0 items-center" data-triage-role="pool-search-row">
              <span className="scratch-pool__find-label" aria-hidden="true">FIND:</span>
              <Search
                className="scratch-pool__search-icon absolute left-1.5 h-3 w-3 text-muted-foreground/50"
                aria-hidden="true"
              />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search…"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                aria-label={INBOX_TRIAGE_COPY.accessibleNames.searchScratches}
                data-triage-role="pool-search-field"
                data-archive-handoff-focus="search-empty"
                className="scratch-pool__field h-6 min-w-0 w-full rounded-sm bg-muted/40 pl-5 pr-1 text-[10px] text-foreground placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {searchQuery && !selectedIsHidden ? (
                <button
                  type="button"
                  aria-label={INBOX_TRIAGE_COPY.accessibleNames.clearPoolSearch}
                  onClick={handleSearchClear}
                  className={cn(
                    "scratch-pool__clear absolute right-1 text-muted-foreground/50 hover:text-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                  )}
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              ) : null}
            </div>
            <button
              type="button"
              data-triage-role="pool-created-at-sort"
              aria-label={
                poolCreatedAtSort === "ASC"
                  ? INBOX_TRIAGE_COPY.baseActions.sortOldestFirst
                  : INBOX_TRIAGE_COPY.baseActions.sortNewestFirst
              }
              title={
                poolCreatedAtSort === "ASC"
                  ? INBOX_TRIAGE_COPY.baseActions.sortOldestFirst
                  : INBOX_TRIAGE_COPY.baseActions.sortNewestFirst
              }
              onClick={handleSortToggle}
              className={cn(
                "scratch-pool__sort shrink-0 rounded-md p-1 text-muted-foreground/70 hover:bg-muted hover:text-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                reducedMotion
                  ? "transition-none"
                  : "transition-colors duration-150 ease-out",
              )}
            >
              <ArrowDownUp className="scratch-pool__sort-icon h-3 w-3" aria-hidden="true" />
              <span className="scratch-pool__sort-label" aria-hidden="true">Date Created</span>
              <span className="scratch-pool__sort-direction" aria-hidden="true">
                {poolCreatedAtSort === "ASC" ? "NEW FIRST" : "OLD FIRST"}
              </span>
            </button>
          </div>

          {searchQuery.length > 0 || activityCopy !== null ? (
            <div className="pool-status-band" data-triage-role="pool-status-band">
              {searchQuery.length > 0 ? (
                <div className="pool-status-line" data-triage-role="pool-status-line">
                  <output
                    data-testid="pool-filtered-count"
                    data-triage-role="pool-filtered-count"
                  >
                    {INBOX_TRIAGE_COPY.poolStatus.filteredCount
                      .replace("{visible}", String(sortedFilteredBits.length))
                      .replace("{total}", String(count))}
                  </output>
                  {selectedIsHidden ? (
                    <>
                      <span>{INBOX_TRIAGE_COPY.poolStatus.hiddenSelection}</span>
                      <button
                        className="pool-status-action"
                        data-triage-role="pool-status-action"
                        type="button"
                        onClick={handleSearchClear}
                      >
                        {INBOX_TRIAGE_COPY.poolStatus.actions.clearSearch}
                      </button>
                    </>
                  ) : null}
                </div>
              ) : null}
              {activityCopy !== null ? (
                <div
                  aria-atomic="true"
                  aria-live="polite"
                  className="pool-status-line"
                  data-triage-role="pool-status-line"
                >
                  <span>{activityCopy}</span>
                  <span className="pool-status-actions">
                    {activity.arrivalIds.size > 0 ? (
                      <button
                        className="pool-status-action"
                        data-triage-role="pool-status-action"
                        type="button"
                        onClick={handleReviewNew}
                      >
                        {INBOX_TRIAGE_COPY.poolStatus.actions.reviewNew}
                      </button>
                    ) : null}
                    {activity.archived + activity.deleted + activity.restored > 0 ? (
                      <button
                        className="pool-status-action"
                        data-triage-role="pool-status-action"
                        type="button"
                        onClick={handleDismissActivity}
                      >
                        {INBOX_TRIAGE_COPY.poolStatus.actions.dismiss}
                      </button>
                    ) : null}
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}

          <div
            className={cn(
              "scratch-pool__list-container min-h-0 flex-1 overflow-hidden",
              reducedMotion
                ? "transition-none"
                : "transition-opacity duration-150 ease-in-out",
            )}
          >
            <div
              ref={scrollViewportRef}
              className="scratch-pool__list h-full overflow-y-auto"
              data-testid="pool-scroll-viewport"
              data-triage-role="pool-scroll-viewport"
              onScroll={handleScroll}
              tabIndex={0}
            >
              {activeScratchBits.length === 0 && searchQuery.length === 0 ? (
                <EmptyState />
              ) : sortedFilteredBits.length === 0 ? (
                <div
                  className="scratch-pool__no-match px-3 py-4 text-center text-[10px] text-muted-foreground/60"
                  data-external-removal-focus="search-empty"
                  data-archive-handoff-focus="search-empty-status"
                  tabIndex={-1}
                >
                  No matches
                </div>
              ) : (
                sortedFilteredBits.map((bit) => (
                  <ScratchRow
                    key={bit.id}
                    bit={bit}
                    isSelected={bit.id === selectedScratchId}
                    reducedMotion={reducedMotion}
                    onSelect={handleSelect}
                    rowRef={(element) => {
                      if (element === null) rowRefs.current.delete(bit.id);
                      else rowRefs.current.set(bit.id, element);
                    }}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside
      data-testid="scratch-pool"
      data-triage-state="collapsed"
      className={cn(
        "scratch-pool flex h-full min-w-0 flex-col border-r border-border bg-muted/10 w-12",
        reducedMotion
          ? "transition-none"
          : "transition-[width] duration-200 ease-in-out",
      )}
    >
      <div className="scratch-pool__frame flex h-full min-h-0 flex-col">
        <div className="scratch-pool__compact-tools flex shrink-0 flex-col items-center gap-2 py-2">
          <h2 className="sr-only" id="triage-scratch-pool-heading" tabIndex={-1}>
            {INBOX_TRIAGE_COPY.sectionNames.scratchPool}
          </h2>
          <div className="relative">
            <Inbox
              className={cn(
                "h-4 w-4",
                count > 0 ? "text-foreground" : "text-muted-foreground/40",
              )}
              aria-hidden="true"
            />
            <span
              aria-label={`${count} scratch${count === 1 ? "" : "es"}`}
              data-triage-role="pool-total-count"
              className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-0.5 text-[8px] font-semibold text-primary-foreground"
            >
              {count}
            </span>
            {activity.arrivalIds.size > 0 ? (
              <span className="pool-activity-marker" data-triage-role="pool-activity-marker">
                +{activity.arrivalIds.size}
              </span>
            ) : null}
            {activity.archived + activity.deleted + activity.restored > 0 ? (
              <span
                aria-label={INBOX_TRIAGE_COPY.poolStatus.compactLifecycle}
                className="pool-activity-marker pool-activity-marker--lifecycle"
                data-triage-role="pool-activity-marker"
              />
            ) : null}
          </div>
          <div className="scratch-pool__compact-toggle">
            <button
              ref={toggleButtonRef}
              type="button"
              aria-label={INBOX_TRIAGE_COPY.baseActions.expandScratchPool}
              title={INBOX_TRIAGE_COPY.baseActions.expandScratchPool}
              onClick={handleToggle}
              className={cn(
                "scratch-pool__toggle rounded-md p-0.5 text-muted-foreground/80 hover:bg-muted hover:text-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                reducedMotion
                  ? "transition-none"
                  : "transition-colors duration-150 ease-out",
              )}
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div
          className="scratch-pool__compact-list flex min-h-0 flex-1 flex-col items-center gap-2 overflow-y-auto py-2"
          data-triage-role="pool-scroll-viewport"
          tabIndex={0}
        >
          {activeScratchBits.length > 0 ? (
            <div className="flex flex-col items-center gap-1.5" role="group" aria-label="Switch scratch">
              {orderedBits.map((bit) => {
                const isSelected = bit.id === selectedScratchId;
                return (
                  <button
                    key={bit.id}
                    type="button"
                    aria-label={bit.title}
                    aria-pressed={isSelected}
                    data-triage-role="pool-compact-switcher"
                    data-triage-state={isSelected ? "selected" : "default"}
                    title={bit.title}
                    onClick={(event) => {
                      const target = event.currentTarget;
                      handleSelect(bit.id, () => target.focus());
                    }}
                    className={cn(
                      "w-2 rounded-full",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                      reducedMotion
                        ? "transition-none"
                        : "transition-all duration-150 ease-out",
                      isSelected
                        ? "h-8 bg-primary"
                        : "h-2.5 bg-muted-foreground/30 hover:bg-muted-foreground/50",
                    )}
                  >
                    <span className="scratch-pool__compact-marker" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
