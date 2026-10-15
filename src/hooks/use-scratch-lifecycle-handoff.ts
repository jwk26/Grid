"use client";

import { useCallback } from "react";
import type { Bit } from "@/lib/db/schema";
import { useTriagePreferencesStore } from "@/stores/triage-preferences-store";
import {
  useTriageStore,
  type ExternalScratchRemovalDestination,
} from "@/stores/triage-store";
import type { ExternalScratchRemovalTerminalSnapshot } from "./use-external-scratch-removal-data";

type UseScratchLifecycleHandoffOptions = Readonly<{
  inboxNodeId: string;
  /**
   * Runs in the same tick as the selection change, so focus intent is recorded
   * before the commit that the selection change triggers.
   */
  onDestination?: (destination: ExternalScratchRemovalDestination) => void;
  readTerminalSnapshot: (
    inboxNodeId: string,
    scratchId: string,
  ) => Promise<ExternalScratchRemovalTerminalSnapshot>;
}>;

/**
 * The success handoff shared by Scratch Archive and Scratch Trash: next
 * visible, then previous visible, then filtered-empty or true Inbox empty.
 * It rereads the authoritative Pool, applies the page's own order and filter,
 * and moves the selection without the external-removal transition.
 */
export function useScratchLifecycleHandoff({
  inboxNodeId,
  onDestination,
  readTerminalSnapshot,
}: UseScratchLifecycleHandoffOptions) {
  const scratchPoolQuery = useTriageStore((state) => state.scratchPoolQuery);
  const finishScratchArchive = useTriageStore(
    (state) => state.finishScratchArchive,
  );
  const poolCreatedAtSort = useTriagePreferencesStore(
    (state) => state.poolCreatedAtSort,
  );

  return useCallback(
    async (
      scratchId: string,
      result: unknown,
    ): Promise<ExternalScratchRemovalDestination> => {
      const poolSnapshot = useTriageStore.getState();
      let terminalSnapshot: ExternalScratchRemovalTerminalSnapshot;
      try {
        terminalSnapshot = await readTerminalSnapshot(inboxNodeId, scratchId);
      } catch {
        const fallback = finishScratchArchive(scratchId, {
          activeIds: poolSnapshot.scratchPoolActiveIds,
          visibleIds: poolSnapshot.scratchPoolResultIds,
        });
        onDestination?.(fallback);
        return fallback;
      }
      const { projectedActiveScratchBits, source } = terminalSnapshot;
      const remaining = projectedActiveScratchBits.filter(
        (scratch) => scratch.id !== scratchId,
      );
      const resultScratch =
        typeof result === "object" && result !== null && "scratch" in result
          ? (result.scratch as Bit | null)
          : null;
      const sourceForOrder = source ?? resultScratch;
      const orderedWithSource = (
        sourceForOrder === null ||
        sourceForOrder === undefined ||
        remaining.some((scratch) => scratch.id === sourceForOrder.id)
          ? remaining
          : [...remaining, sourceForOrder]
      ).toSorted((left, right) =>
        poolCreatedAtSort === "ASC"
          ? left.createdAt - right.createdAt
          : right.createdAt - left.createdAt,
      );
      const normalizedQuery = scratchPoolQuery.toLocaleLowerCase();
      const visible =
        normalizedQuery.length === 0
          ? orderedWithSource
          : orderedWithSource.filter((scratch) =>
              scratch.title.toLocaleLowerCase().includes(normalizedQuery),
            );
      const destination = finishScratchArchive(scratchId, {
        activeIds: orderedWithSource.map((scratch) => scratch.id),
        visibleIds: visible.map((scratch) => scratch.id),
      });
      onDestination?.(destination);
      return destination;
    },
    [
      finishScratchArchive,
      inboxNodeId,
      onDestination,
      poolCreatedAtSort,
      readTerminalSnapshot,
      scratchPoolQuery,
    ],
  );
}
