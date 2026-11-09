"use client";

import { useSyncExternalStore } from "react";
import { DELETION_GRACE_MS, type DeletionClock } from "@/lib/auth/deletion-grace";

/**
 * The seam between the app frame and the development state switch for the deletion-grace dialog
 * (feedback F30, SPEC §Development state switch). Like `forced-backup`, it is a tiny registry that
 * is part of the production bundle on purpose and returns `null` unless the development panel has
 * registered something. A forced dialog goes through the real path: the entry state is overridden,
 * so the app unmounts and the frame behind is empty. Its buttons send nothing.
 */

export const DELETION_GRACE_SCENARIOS = ["near-zero", "zero"] as const;
export type DeletionGraceScenario = (typeof DELETION_GRACE_SCENARIOS)[number];

const NEAR_ZERO_LEFT_MS = 3 * 60_000;

/** The clock a scenario shows, received now. */
export function forcedDeletionClock(scenario: DeletionGraceScenario): DeletionClock {
  const now = Date.now();
  const left = scenario === "zero" ? -60 * 60_000 : NEAR_ZERO_LEFT_MS;
  return {
    requestedAt: now + left - DELETION_GRACE_MS,
    serverNow: now,
    receivedMono: performance.now(),
    receivedWall: now,
  };
}

const listeners = new Set<() => void>();
let forced: DeletionClock | null = null;

/** Called by the development panel only. */
export function registerForcedDeletionGrace(scenario: DeletionGraceScenario | null): void {
  forced = scenario === null ? null : forcedDeletionClock(scenario);
  for (const listener of [...listeners]) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The clock forced by the development switch, or `null` (always `null` in production). */
export function useForcedDeletionGrace(): DeletionClock | null {
  return useSyncExternalStore(subscribe, () => forced, () => null);
}
