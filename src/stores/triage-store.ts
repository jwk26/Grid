"use client";

import { create } from "zustand";

export interface TriageSessionScrollPosition {
  anchorId: string | null;
  offset: number;
}

export interface ExplorerItemIdentity {
  id: string;
  type: "node" | "bit";
}

function explorerIdentityKey(identity: ExplorerItemIdentity): string {
  return `${identity.type}:${identity.id}`;
}

export type ExplorerPathStatusKind = "unavailable" | "archived" | "moved" | "stale-placement";

export interface ExplorerPathStatusState {
  kind: ExplorerPathStatusKind;
  title: string | null;
  destination: string;
  columnId: string;
  fallbackPathIds: string[];
}

export type ExternalScratchRemovalLifecycle = "archive" | "delete";
export type ExternalScratchRemovalDestinationKind =
  | "scratch"
  | "search-empty"
  | "inbox-empty";

export interface ExternalScratchRemovalState {
  scratchId: string;
  lifecycle: ExternalScratchRemovalLifecycle | null;
  destinationId: string | null;
  destinationKind: ExternalScratchRemovalDestinationKind;
  removalOrder: string[];
}

export type ExternalScratchRemovalDestination = Readonly<{
  id: string | null;
  kind: ExternalScratchRemovalDestinationKind;
}>;

type ScratchPoolContext = {
  activeIds: string[];
  visibleIds: string[];
  /** Selected-Scratch ids this page has just trashed itself; never external removal. */
  ownTrashIds?: readonly string[];
};

export interface OwnTrashMarker {
  scratchId: string;
  expectedVersion: number;
}

/**
 * Keeps a held own-Trash selection at its previous position in the tracked
 * Pool order, so releasing the marker later still resolves next/previous
 * against the right neighbours.
 */
function withHeldId(previous: string[], current: string[], heldId: string): string[] {
  const previousIndex = previous.indexOf(heldId);
  if (previousIndex < 0) return current;
  const currentIds = new Set(current);
  const position = previous
    .slice(0, previousIndex)
    .filter((id) => currentIds.has(id)).length;
  return [...current.slice(0, position), heldId, ...current.slice(position)];
}

function resolveExternalRemovalDestination(
  removalOrder: string[],
  scratchId: string,
  { activeIds, visibleIds }: ScratchPoolContext,
): ExternalScratchRemovalDestination {
  const visibleIdSet = new Set(visibleIds);
  const sourceIndex = removalOrder.indexOf(scratchId);
  if (sourceIndex >= 0) {
    for (let index = sourceIndex + 1; index < removalOrder.length; index += 1) {
      const id = removalOrder[index];
      if (id !== undefined && visibleIdSet.has(id)) return { id, kind: "scratch" };
    }
    for (let index = sourceIndex - 1; index >= 0; index -= 1) {
      const id = removalOrder[index];
      if (id !== undefined && visibleIdSet.has(id)) return { id, kind: "scratch" };
    }
  }

  const replacement = visibleIds[0];
  if (replacement !== undefined) return { id: replacement, kind: "scratch" };
  return {
    id: null,
    kind: activeIds.length > 0 ? "search-empty" : "inbox-empty",
  };
}

interface TriageState {
  selectedScratchId: string | null;
  scratchPoolExpanded: boolean;
  scratchPoolManualExpandedForId: string | null;
  scratchPoolQuery: string;
  scratchPoolActiveIds: string[];
  scratchPoolResultIds: string[];
  scratchPoolScroll: TriageSessionScrollPosition;
  explorerPathIds: string[];
  explorerOpenColumnIds: string[];
  explorerColumnScroll: Record<string, TriageSessionScrollPosition>;
  explorerRemoteArrivalIds: Record<string, ExplorerItemIdentity[]>;
  explorerLocalPlacementIdentities: ExplorerItemIdentity[];
  explorerPathStatus: ExplorerPathStatusState | null;
  externalScratchRemoval: ExternalScratchRemovalState | null;
  ownTrashMarkers: Record<string, OwnTrashMarker>;
  registerOwnTrash: (scratchId: string, expectedVersion: number) => void;
  /**
   * Markers are version-keyed and live until released here: at a non-applied
   * result for that Scratch, or for all of them when the workspace unmounts.
   */
  releaseOwnTrash: (scratchId?: string) => void;
  selectScratch: (id: string) => void;
  clearSelection: () => void;
  setScratchPoolExpanded: (expanded: boolean) => void;
  setScratchPoolManualExpandedForId: (id: string | null) => void;
  setScratchPoolQuery: (query: string) => void;
  setScratchPoolResultIds: (ids: string[]) => void;
  setScratchPoolScroll: (position: TriageSessionScrollPosition) => void;
  reconcileScratchPoolContext: (context: ScratchPoolContext) => void;
  setExternalScratchRemovalLifecycle: (
    scratchId: string,
    lifecycle: ExternalScratchRemovalLifecycle,
  ) => void;
  finishExternalScratchRemoval: (
    context: ScratchPoolContext,
  ) => ExternalScratchRemovalDestination | null;
  finishScratchArchive: (
    scratchId: string,
    context: ScratchPoolContext,
  ) => ExternalScratchRemovalDestination;
  setExplorerPathIds: (ids: string[]) => void;
  setExplorerOpenColumnIds: (ids: string[]) => void;
  setExplorerColumnScroll: (
    columnId: string,
    position: TriageSessionScrollPosition,
  ) => void;
  recordExplorerRemoteArrivals: (
    columnId: string,
    identities: ExplorerItemIdentity[],
  ) => void;
  registerExplorerLocalPlacement: (identity: ExplorerItemIdentity) => void;
  removeExplorerRemoteArrival: (identity: ExplorerItemIdentity) => void;
  clearExplorerRemoteArrivals: (columnId: string) => void;
  setExplorerPathStatus: (status: ExplorerPathStatusState) => void;
  clearExplorerPathStatus: () => void;
  clearExplorerRemotePresentation: () => void;
  reconcileExplorerContext: (context: {
    validPathIds: string[];
    visibleItemIdsByColumn: Record<string, string[]>;
  }) => void;
}

/**
 * Where the selection goes when `scratchId` leaves the Pool by Archive or own
 * Trash: next visible, then previous visible, then filtered-empty or true
 * Inbox empty. Pure, so a caller can record its focus target before the store
 * changes.
 */
export function resolveScratchLifecycleDestination(
  scratchId: string,
  context: ScratchPoolContext,
  query: string,
): ExternalScratchRemovalDestination {
  const resolved = resolveExternalRemovalDestination(
    context.activeIds,
    scratchId,
    {
      activeIds: context.activeIds.filter((id) => id !== scratchId),
      visibleIds: context.visibleIds.filter((id) => id !== scratchId),
    },
  );
  return resolved.kind === "inbox-empty" && query.length > 0
    ? { id: null, kind: "search-empty" }
    : resolved;
}

export const useTriageStore = create<TriageState>((set) => ({
  selectedScratchId: null,
  scratchPoolExpanded: true,
  scratchPoolManualExpandedForId: null,
  scratchPoolQuery: "",
  scratchPoolActiveIds: [],
  scratchPoolResultIds: [],
  scratchPoolScroll: { anchorId: null, offset: 0 },
  explorerPathIds: [],
  explorerOpenColumnIds: [],
  explorerColumnScroll: {},
  explorerRemoteArrivalIds: {},
  explorerLocalPlacementIdentities: [],
  explorerPathStatus: null,
  externalScratchRemoval: null,
  ownTrashMarkers: {},
  registerOwnTrash: (scratchId, expectedVersion) =>
    set((state) =>
      state.ownTrashMarkers[scratchId]?.expectedVersion === expectedVersion
        ? state
        : {
            ownTrashMarkers: {
              ...state.ownTrashMarkers,
              [scratchId]: { scratchId, expectedVersion },
            },
          },
    ),
  releaseOwnTrash: (scratchId) =>
    set((state) => {
      if (scratchId === undefined) {
        return Object.keys(state.ownTrashMarkers).length === 0
          ? state
          : { ownTrashMarkers: {} };
      }
      if (state.ownTrashMarkers[scratchId] === undefined) return state;
      const rest = { ...state.ownTrashMarkers };
      delete rest[scratchId];
      return { ownTrashMarkers: rest };
    }),
  selectScratch: (id) =>
    set((state) => ({
      selectedScratchId: id,
      scratchPoolManualExpandedForId:
        state.selectedScratchId === id
          ? state.scratchPoolManualExpandedForId
          : null,
    })),
  clearSelection: () =>
    set({ selectedScratchId: null, scratchPoolManualExpandedForId: null }),
  setScratchPoolExpanded: (expanded) =>
    set(
      expanded
        ? { scratchPoolExpanded: true }
        : {
            scratchPoolExpanded: false,
            scratchPoolManualExpandedForId: null,
          },
    ),
  setScratchPoolManualExpandedForId: (id) =>
    set({ scratchPoolManualExpandedForId: id }),
  setScratchPoolQuery: (query) => set({ scratchPoolQuery: query }),
  setScratchPoolResultIds: (ids) => set({ scratchPoolResultIds: ids }),
  setScratchPoolScroll: (position) => set({ scratchPoolScroll: position }),
  reconcileScratchPoolContext: ({ activeIds, visibleIds, ownTrashIds }) =>
    set((state) => {
      const selectionIsActive =
        state.selectedScratchId !== null &&
        activeIds.includes(state.selectedScratchId);
      const selectedWasObservedActive =
        state.selectedScratchId !== null &&
        state.scratchPoolActiveIds.includes(state.selectedScratchId);
      const restoredExternalSelection =
        selectionIsActive &&
        state.externalScratchRemoval?.scratchId === state.selectedScratchId &&
        state.externalScratchRemoval.lifecycle === "archive";
      // An own Trash keeps the selection in place until its handoff runs; it
      // never enters the external-removal transition.
      const ownTrashSelected =
        state.selectedScratchId !== null &&
        !selectionIsActive &&
        state.externalScratchRemoval === null &&
        (ownTrashIds?.includes(state.selectedScratchId) ?? false);
      const shouldHoldExternalRemoval =
        state.selectedScratchId !== null &&
        !restoredExternalSelection &&
        !ownTrashSelected &&
        (state.externalScratchRemoval !== null ||
          (!selectionIsActive && selectedWasObservedActive));
      const destinationContext = shouldHoldExternalRemoval
        ? {
            activeIds: activeIds.filter((id) => id !== state.selectedScratchId),
            visibleIds: visibleIds.filter((id) => id !== state.selectedScratchId),
          }
        : { activeIds, visibleIds };
      const removalOrder =
        state.externalScratchRemoval?.removalOrder ??
        (state.scratchPoolResultIds.includes(state.selectedScratchId ?? "")
          ? state.scratchPoolResultIds
          : [state.selectedScratchId, ...state.scratchPoolResultIds].filter(
              (id): id is string => id !== null,
            ));
      const destination =
        shouldHoldExternalRemoval && state.selectedScratchId !== null
          ? resolveExternalRemovalDestination(
              removalOrder,
              state.selectedScratchId,
              destinationContext,
            )
          : null;
      const externalScratchRemoval = restoredExternalSelection
        ? null
        : destination === null || state.selectedScratchId === null
          ? state.externalScratchRemoval
          : {
              scratchId: state.selectedScratchId,
              lifecycle: state.externalScratchRemoval?.lifecycle ?? null,
              destinationId: destination.id,
              destinationKind: destination.kind,
              removalOrder,
            };
      const selectedScratchId =
        selectionIsActive || shouldHoldExternalRemoval || ownTrashSelected
          ? state.selectedScratchId
          : (visibleIds[0] ?? null);
      const selectionChanged = selectedScratchId !== state.selectedScratchId;
      const scrollAnchorIsVisible =
        state.scratchPoolScroll.anchorId !== null &&
        visibleIds.includes(state.scratchPoolScroll.anchorId);
      const scratchPoolScroll = scrollAnchorIsVisible
        ? state.scratchPoolScroll
        : { anchorId: visibleIds[0] ?? null, offset: 0 };
      // A held own Trash is still tracked as observed in the Pool order until
      // its handoff runs, so a released marker (conflict) reads as external.
      const trackedActiveIds =
        ownTrashSelected && state.selectedScratchId !== null
          ? withHeldId(state.scratchPoolActiveIds, activeIds, state.selectedScratchId)
          : activeIds;
      const trackedVisibleIds =
        ownTrashSelected && state.selectedScratchId !== null
          ? withHeldId(state.scratchPoolResultIds, visibleIds, state.selectedScratchId)
          : visibleIds;
      const resultsUnchanged =
        state.scratchPoolResultIds.length === trackedVisibleIds.length &&
        state.scratchPoolResultIds.every((id, index) => id === trackedVisibleIds[index]);
      const activeIdsUnchanged =
        state.scratchPoolActiveIds.length === trackedActiveIds.length &&
        state.scratchPoolActiveIds.every((id, index) => id === trackedActiveIds[index]);

      if (
        !selectionChanged &&
        externalScratchRemoval === state.externalScratchRemoval &&
        activeIdsUnchanged &&
        resultsUnchanged &&
        scratchPoolScroll === state.scratchPoolScroll
      ) {
        return state;
      }

      return {
        selectedScratchId,
        externalScratchRemoval,
        scratchPoolActiveIds: activeIdsUnchanged
          ? state.scratchPoolActiveIds
          : trackedActiveIds,
        scratchPoolManualExpandedForId: selectionChanged
          ? null
          : state.scratchPoolManualExpandedForId,
        scratchPoolResultIds: resultsUnchanged
          ? state.scratchPoolResultIds
          : trackedVisibleIds,
        scratchPoolScroll,
      };
    }),
  setExternalScratchRemovalLifecycle: (scratchId, lifecycle) =>
    set((state) =>
      state.externalScratchRemoval?.scratchId === scratchId
        ? {
            externalScratchRemoval: {
              ...state.externalScratchRemoval,
              lifecycle,
            },
          }
        : state,
    ),
  finishExternalScratchRemoval: (context) => {
    let terminalDestination: ExternalScratchRemovalDestination | null = null;
    set((state) => {
      const removal = state.externalScratchRemoval;
      if (removal === null) return state;
      terminalDestination = resolveExternalRemovalDestination(
        removal.removalOrder,
        removal.scratchId,
        {
          activeIds: context.activeIds.filter((id) => id !== removal.scratchId),
          visibleIds: context.visibleIds.filter((id) => id !== removal.scratchId),
        },
      );
      return {
        selectedScratchId: terminalDestination.id,
        scratchPoolManualExpandedForId: null,
        externalScratchRemoval: null,
      };
    });
    return terminalDestination;
  },
  finishScratchArchive: (scratchId, context) => {
    let terminalDestination: ExternalScratchRemovalDestination = {
      id: null,
      kind: "inbox-empty",
    };
    set((state) => {
      terminalDestination = resolveScratchLifecycleDestination(
        scratchId,
        context,
        state.scratchPoolQuery,
      );
      return {
        selectedScratchId: terminalDestination.id,
        scratchPoolManualExpandedForId: null,
        externalScratchRemoval: null,
      };
    });
    return terminalDestination;
  },
  setExplorerPathIds: (ids) =>
    set((state) => {
      const unchanged =
        ids.length === state.explorerPathIds.length &&
        ids.every((id, index) => id === state.explorerPathIds[index]);
      return unchanged
        ? state
        : {
            explorerPathIds: ids,
            explorerRemoteArrivalIds: {},
            explorerPathStatus: null,
          };
    }),
  setExplorerOpenColumnIds: (ids) => set({ explorerOpenColumnIds: ids }),
  setExplorerColumnScroll: (columnId, position) =>
    set((state) => ({
      explorerColumnScroll: {
        ...state.explorerColumnScroll,
        [columnId]: position,
      },
    })),
  recordExplorerRemoteArrivals: (columnId, identities) =>
    set((state) => {
      if (identities.length === 0) return state;
      const previous = state.explorerRemoteArrivalIds[columnId] ?? [];
      const seen = new Set(previous.map(explorerIdentityKey));
      const next = [...previous];
      for (const identity of identities) {
        const key = explorerIdentityKey(identity);
        if (seen.has(key)) continue;
        seen.add(key);
        next.push(identity);
      }
      if (next.length === previous.length) return state;
      return {
        explorerRemoteArrivalIds: {
          ...state.explorerRemoteArrivalIds,
          [columnId]: next,
        },
      };
    }),
  registerExplorerLocalPlacement: (identity) =>
    set((state) => {
      const key = explorerIdentityKey(identity);
      const alreadyRegistered = state.explorerLocalPlacementIdentities.some(
        (registered) => explorerIdentityKey(registered) === key,
      );
      let arrivalsChanged = false;
      const explorerRemoteArrivalIds: Record<
        string,
        ExplorerItemIdentity[]
      > = {};
      for (const [columnId, identities] of Object.entries(
        state.explorerRemoteArrivalIds,
      )) {
        const filtered = identities.filter(
          (arrival) => explorerIdentityKey(arrival) !== key,
        );
        if (filtered.length !== identities.length) arrivalsChanged = true;
        if (filtered.length > 0) explorerRemoteArrivalIds[columnId] = filtered;
      }
      if (alreadyRegistered && !arrivalsChanged) return state;
      return {
        explorerLocalPlacementIdentities: alreadyRegistered
          ? state.explorerLocalPlacementIdentities
          : [...state.explorerLocalPlacementIdentities, identity],
        explorerRemoteArrivalIds: arrivalsChanged
          ? explorerRemoteArrivalIds
          : state.explorerRemoteArrivalIds,
      };
    }),
  removeExplorerRemoteArrival: (identity) =>
    set((state) => {
      const key = explorerIdentityKey(identity);
      let changed = false;
      const next: Record<string, ExplorerItemIdentity[]> = {};
      for (const [columnId, identities] of Object.entries(
        state.explorerRemoteArrivalIds,
      )) {
        const filtered = identities.filter(
          (arrival) => explorerIdentityKey(arrival) !== key,
        );
        if (filtered.length !== identities.length) changed = true;
        if (filtered.length > 0) next[columnId] = filtered;
      }
      return changed ? { explorerRemoteArrivalIds: next } : state;
    }),
  clearExplorerRemoteArrivals: (columnId) =>
    set((state) => {
      if (state.explorerRemoteArrivalIds[columnId] === undefined) return state;
      const next = { ...state.explorerRemoteArrivalIds };
      delete next[columnId];
      return { explorerRemoteArrivalIds: next };
    }),
  setExplorerPathStatus: (status) => set({ explorerPathStatus: status }),
  clearExplorerPathStatus: () => set({ explorerPathStatus: null }),
  clearExplorerRemotePresentation: () =>
    set({
      explorerLocalPlacementIdentities: [],
      explorerRemoteArrivalIds: {},
      explorerPathStatus: null,
    }),
  reconcileExplorerContext: ({ validPathIds, visibleItemIdsByColumn }) =>
    set((state) => {
      let validPrefixLength = 0;
      while (
        validPrefixLength < state.explorerPathIds.length &&
        validPrefixLength < validPathIds.length &&
        state.explorerPathIds[validPrefixLength] ===
          validPathIds[validPrefixLength]
      ) {
        validPrefixLength += 1;
      }

      const explorerPathIds = state.explorerPathIds.slice(0, validPrefixLength);
      const explorerOpenColumnIds = ["home", ...explorerPathIds];
      const explorerColumnScroll: Record<
        string,
        TriageSessionScrollPosition
      > = {};

      for (const columnId of explorerOpenColumnIds) {
        const previous = state.explorerColumnScroll[columnId];
        if (previous === undefined) continue;

        const visibleIds = visibleItemIdsByColumn[columnId];
        explorerColumnScroll[columnId] =
          previous.anchorId === null && previous.offset === 0
            ? previous
            : previous.anchorId !== null &&
                visibleIds?.includes(previous.anchorId)
              ? previous
              : { anchorId: null, offset: 0 };
      }

      const explorerRemoteArrivalIds = Object.fromEntries(
        Object.entries(state.explorerRemoteArrivalIds).filter(([columnId]) =>
          explorerOpenColumnIds.includes(columnId),
        ),
      );
      const explorerPathStatus =
        state.explorerPathStatus === null ||
        explorerOpenColumnIds.includes(state.explorerPathStatus.columnId)
          ? state.explorerPathStatus
          : null;

      const pathUnchanged =
        explorerPathIds.length === state.explorerPathIds.length;
      const columnsUnchanged =
        explorerOpenColumnIds.length === state.explorerOpenColumnIds.length &&
        explorerOpenColumnIds.every(
          (columnId, index) => columnId === state.explorerOpenColumnIds[index],
        );
      const previousScrollKeys = Object.keys(state.explorerColumnScroll);
      const nextScrollKeys = Object.keys(explorerColumnScroll);
      const scrollUnchanged =
        previousScrollKeys.length === nextScrollKeys.length &&
        nextScrollKeys.every(
          (columnId) =>
            explorerColumnScroll[columnId] ===
            state.explorerColumnScroll[columnId],
        );

      const previousArrivalColumns = Object.keys(
        state.explorerRemoteArrivalIds,
      );
      const nextArrivalColumns = Object.keys(explorerRemoteArrivalIds);
      const arrivalsUnchanged =
        previousArrivalColumns.length === nextArrivalColumns.length &&
        nextArrivalColumns.every(
          (columnId) =>
            explorerRemoteArrivalIds[columnId] ===
            state.explorerRemoteArrivalIds[columnId],
        );

      if (
        pathUnchanged &&
        columnsUnchanged &&
        scrollUnchanged &&
        arrivalsUnchanged &&
        explorerPathStatus === state.explorerPathStatus
      ) {
        return state;
      }

      return {
        explorerPathIds,
        explorerOpenColumnIds,
        explorerColumnScroll,
        explorerRemoteArrivalIds,
        explorerPathStatus,
      };
    }),
}));
