"use client";

import { useSyncExternalStore } from "react";
import type { ItemStatus } from "@/lib/feedback/item-status";

/**
 * The read seam between the item surfaces and the development state switch
 * (feedback F30). This module is part of the production bundle on purpose: it is
 * a tiny registry with no development logic, and it returns `null` for every
 * item unless the development panel has registered forced states. Surfaces call
 * `useForcedItemStatus(key)` and fall back to their real status when it is
 * `null`; the switch store, the panel and the DataStore wrapper never enter a
 * production build.
 */

export const FORCED_STATES = [
  "delayed-pending",
  "reconciling",
  "unknown",
  "not-applied",
  "rejected",
  "conflict",
  "integrity",
  "editor-offline",
] as const;

export type ForcedState = (typeof FORCED_STATES)[number];

/** What a forced state shows as item status; `null` means no item status. */
export function itemStatusOfForcedState(state: ForcedState): ItemStatus | null {
  switch (state) {
    case "delayed-pending":
      return "pending";
    case "reconciling":
      return "reconciling";
    case "unknown":
      return "unknown";
    case "not-applied":
    case "rejected":
    case "conflict":
    case "integrity":
      return "problem";
    case "editor-offline":
      // An editor save while offline shows the offline write-attempt toast and
      // no item status (Task 233); the draft stays.
      return null;
  }
}

export type ForcedItemStatus = Readonly<{
  state: ForcedState;
  status: ItemStatus | null;
}>;

/**
 * One key per item that can carry a status. Surfaces build their key with
 * these, so the panel and the surface agree.
 */
export const forcedItemKeys = {
  /** The Breakdown Add field of one Scratch. */
  add: (scratchBitId: string) => `add:${scratchBitId}`,
  /** The inline editor of the Scratch title in the Context. */
  scratchTitleEditor: (scratchBitId: string) =>
    `scratch-title-editor:${scratchBitId}`,
  /** The inline editor of one Breakdown row. */
  breakdownEditor: (breakdownId: string) => `breakdown-editor:${breakdownId}`,
  /** One Breakdown row. */
  breakdown: (breakdownId: string) => `breakdown:${breakdownId}`,
  /** One staged candidate (Staging Node card or Bit row). */
  candidate: (candidateId: string) => `candidate:${candidateId}`,
  /** One Explorer Newly row (its Undo slot). */
  newly: (resultType: "node" | "bit", resultId: string) =>
    `newly:${resultType}:${resultId}`,
} as const;

const EMPTY: ReadonlyMap<string, ForcedItemStatus> = new Map();
let registered: ReadonlyMap<string, ForcedItemStatus> = EMPTY;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/** Called by the development panel only: replaces every forced state. */
export function registerForcedItemStates(
  states: Readonly<Record<string, ForcedState>>,
): void {
  const next = new Map<string, ForcedItemStatus>();
  for (const [key, state] of Object.entries(states)) {
    const previous = registered.get(key);
    next.set(
      key,
      previous?.state === state
        ? previous
        : { state, status: itemStatusOfForcedState(state) },
    );
  }
  registered = next.size === 0 ? EMPTY : next;
  emit();
}

/** Called by the development panel when it goes away. */
export function clearForcedItemStates(): void {
  if (registered === EMPTY) return;
  registered = EMPTY;
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * The state forced onto an item by the development switch, or `null` (always
 * `null` in production). A surface that receives a forced status shows it
 * through the status primitives in place of the real one.
 */
export function useForcedItemStatus(
  itemKey: string | null,
): ForcedItemStatus | null {
  return useSyncExternalStore(
    subscribe,
    () => (itemKey === null ? null : (registered.get(itemKey) ?? null)),
    () => null,
  );
}
