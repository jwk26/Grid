import { useCallback, useEffect, useRef, useState } from "react";
import { getDataStore, liveRead } from "@/lib/db/datastore";
import type { Bit } from "@/lib/db/schema";

export type ExternalScratchRemovalLifecycle = "archive" | "delete";

export type ExternalScratchRemovalObservation = Readonly<{
  scratchId: string;
  lifecycle: ExternalScratchRemovalLifecycle;
}>;

export type ExternalScratchRemovalTerminalSnapshot = Readonly<{
  projectedActiveScratchBits: readonly Bit[];
  source: Bit | undefined;
}>;

type OwnTrashKey = Readonly<{ scratchId: string; expectedVersion: number }>;

type ExternalScratchRemovalDataOptions = Readonly<{
  /** This page's own in-flight/just-applied Trash markers (never an external removal). */
  ownTrash?: readonly OwnTrashKey[];
  activeRemovalScratchId: string | null;
  selectedScratchId: string | null;
  unresolvedRemovalContext: Readonly<{ scratchId: string }> | null;
  unresolvedScratchId: string | null;
}>;

function classifyRemoval(
  scratch: Bit | undefined,
  ownTrash: readonly OwnTrashKey[],
): ExternalScratchRemovalLifecycle | null {
  if (
    scratch !== undefined &&
    scratch.deletedAt !== null &&
    ownTrash.some(
      (marker) =>
        marker.scratchId === scratch.id &&
        marker.expectedVersion + 1 === scratch.version,
    )
  ) {
    return null;
  }
  if (scratch?.archivedAt !== null && scratch?.archivedAt !== undefined) {
    return "archive";
  }
  if (scratch === undefined || scratch.deletedAt !== null) return "delete";
  return null;
}

const NO_OWN_TRASH: readonly OwnTrashKey[] = [];

export function useExternalScratchRemovalData({
  ownTrash = NO_OWN_TRASH,
  activeRemovalScratchId,
  selectedScratchId,
  unresolvedRemovalContext,
  unresolvedScratchId,
}: ExternalScratchRemovalDataOptions): Readonly<{
  observation: ExternalScratchRemovalObservation | null;
  readTerminalSnapshot: (
    inboxNodeId: string,
    scratchId: string,
  ) => Promise<ExternalScratchRemovalTerminalSnapshot>;
}> {
  const observationRef = useRef<ExternalScratchRemovalObservation | null>(null);
  const ownTrashRef = useRef(ownTrash);
  useEffect(() => {
    ownTrashRef.current = ownTrash;
  }, [ownTrash]);
  const [observation, setObservation] =
    useState<ExternalScratchRemovalObservation | null>(null);

  useEffect(() => {
    if (activeRemovalScratchId !== null) return;
    observationRef.current = null;
    queueMicrotask(() => {
      if (observationRef.current === null) setObservation(null);
    });
  }, [activeRemovalScratchId]);

  useEffect(() => {
    if (selectedScratchId === null) return;
    const scratchId = selectedScratchId;
    const subscription = liveRead(async (dataStore) => {
      return dataStore.getBit(scratchId);
    }).subscribe({
      next: (scratch) => {
        const lifecycle = classifyRemoval(scratch, ownTrashRef.current);
        if (lifecycle === null) return;
        const next = { scratchId, lifecycle } as const;
        observationRef.current = next;
        setObservation(next);
      },
      error: (error) =>
        console.error("selected Scratch lifecycle error:", error),
    });
    return () => subscription.unsubscribe();
  }, [selectedScratchId]);

  useEffect(() => {
    if (unresolvedScratchId === null) return;
    const scratchId = unresolvedScratchId;
    const observed = observationRef.current;
    if (observed?.scratchId === scratchId) {
      setObservation(observed);
      return;
    }
    let cancelled = false;
    void (async () => {
      const dataStore = await getDataStore();
      const scratch = await dataStore.getBit(scratchId);
      if (cancelled) return;
      const lifecycle = classifyRemoval(scratch, ownTrashRef.current) ?? "delete";
      const next = { scratchId, lifecycle } as const;
      observationRef.current = next;
      setObservation(next);
    })().catch((error) =>
      console.error("external Scratch lifecycle error:", error),
    );
    return () => {
      cancelled = true;
    };
  }, [unresolvedRemovalContext, unresolvedScratchId]);

  const readTerminalSnapshot = useCallback(
    async (
      inboxNodeId: string,
      scratchId: string,
    ): Promise<ExternalScratchRemovalTerminalSnapshot> => {
      const dataStore = await getDataStore();
      const projectedActiveScratchBits = await dataStore.getBits(inboxNodeId);
      const source = await dataStore.getBit(scratchId);
      return { projectedActiveScratchBits, source };
    },
    [],
  );

  return { observation, readTerminalSnapshot };
}
