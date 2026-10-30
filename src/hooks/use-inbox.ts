"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getDataStore, liveRead } from "@/lib/db/datastore";
import { useTriagePreferencesStore } from "@/stores/triage-preferences-store";
import { useTriageStore } from "@/stores/triage-store";
import type { Bit, Node } from "@/types";

const INBOX_LOOKUP_RETRY_MS = 100;
const localCreatedScratchIds = new Set<string>();
// A local create is shown before the server answers (SPEC Write feel, group 1). Until it is
// answered its Scratch is not a delete when it leaves the view, since a refused create rolls it back.
const unconfirmedLocalScratchIds = new Set<string>();
const SYSTEM_NODE_ORDER: Record<NonNullable<Node["systemRole"]>, number> = {
  inbox: 0,
  archive_view: 1,
};

export type PoolLifecycleChange = Readonly<{
  kind: "remote-arrival" | "archive" | "delete" | "restore";
  scratchId: string;
}>;

export type PoolLifecycleProjection = Readonly<{
  revision: number;
  changes: readonly PoolLifecycleChange[];
}>;

type PoolScratchLifecycle = "active" | "archived" | "deleted";

const EMPTY_IDS: readonly string[] = Object.freeze([]);
const EMPTY_BITS: readonly Bit[] = Object.freeze([]);

const EMPTY_POOL_LIFECYCLE_PROJECTION: PoolLifecycleProjection = Object.freeze({
  revision: 0,
  changes: Object.freeze([]),
});

export function useInbox(): {
  inboxNodeId: string | undefined;
  createScratchBit: (title: string) => Promise<string>;
  scratchCount: number;
  activeScratchBits: Bit[];
  poolLifecycleProjection: PoolLifecycleProjection;
  systemNodes: Node[];
} {
  const [inboxNodeId, setInboxNodeId] = useState<string | undefined>();
  const [scratchCount, setScratchCount] = useState(0);
  const [activeScratchBits, setActiveScratchBits] = useState<Bit[]>([]);
  const [activeScratchBitsReady, setActiveScratchBitsReady] = useState(false);
  const [poolLifecycleProjection, setPoolLifecycleProjection] = useState(
    EMPTY_POOL_LIFECYCLE_PROJECTION,
  );
  const [systemNodes, setSystemNodes] = useState<Node[]>([]);
  const [deletedScratchBits, setDeletedScratchBits] = useState<readonly Bit[]>(
    EMPTY_BITS,
  );
  const ownTrashMarkers = useTriageStore((state) => state.ownTrashMarkers);
  const poolLifecycleRevisionRef = useRef(0);
  const previousPoolLifecycleRef = useRef<Map<string, PoolScratchLifecycle> | null>(
    null,
  );
  const scratchPoolQuery = useTriageStore((state) => state.scratchPoolQuery);
  const reconcileScratchPoolContext = useTriageStore(
    (state) => state.reconcileScratchPoolContext,
  );
  const poolCreatedAtSort = useTriagePreferencesStore(
    (state) => state.poolCreatedAtSort,
  );

  const orderedActiveScratchBits = useMemo(
    () =>
      activeScratchBits.toSorted((left, right) =>
        poolCreatedAtSort === "ASC"
          ? left.createdAt - right.createdAt
          : right.createdAt - left.createdAt,
      ),
    [activeScratchBits, poolCreatedAtSort],
  );
  const visibleScratchBits = useMemo(() => {
    const normalizedQuery = scratchPoolQuery.toLocaleLowerCase();
    return normalizedQuery.length === 0
      ? orderedActiveScratchBits
      : orderedActiveScratchBits.filter((bit) =>
          bit.title.toLocaleLowerCase().includes(normalizedQuery),
        );
  }, [orderedActiveScratchBits, scratchPoolQuery]);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    async function loadInbox() {
      const dataStore = await getDataStore();
      const nodes = await dataStore.getAllActiveNodes();
      const inboxNode = nodes.find((node) => node.systemRole === "inbox");

      if (cancelled) {
        return;
      }

      if (inboxNode) {
        setActiveScratchBitsReady(false);
        setInboxNodeId(inboxNode.id);
        return;
      }

      retryTimer = setTimeout(() => {
        void loadInbox();
      }, INBOX_LOOKUP_RETRY_MS);
    }

    void loadInbox();

    return () => {
      cancelled = true;
      if (retryTimer !== null) {
        clearTimeout(retryTimer);
      }
    };
  }, []);

  useEffect(() => {
    const subscription = liveRead(async (dataStore) => {
      const nodes = await dataStore.getAllActiveNodes();
      return nodes
        .filter(
          (node) =>
            node.systemRole !== null &&
            node.deletedAt === null &&
            node.archivedAt === null,
        )
        .sort((left, right) => {
          if (left.systemRole === null || right.systemRole === null) {
            return 0;
          }

          return SYSTEM_NODE_ORDER[left.systemRole] - SYSTEM_NODE_ORDER[right.systemRole];
        });
    }).subscribe({
      next: (value) => setSystemNodes(value),
      error: (err) => console.error("systemNodes liveQuery error:", err),
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (inboxNodeId === undefined) {
      return;
    }

    const subscription = liveRead(async (dataStore) => {
      const bits = await dataStore.getAllActiveBits();
      return bits.filter(
        (bit) =>
          bit.parentId === inboxNodeId &&
          bit.deletedAt === null &&
          bit.archivedAt === null,
      ).length;
    }).subscribe({
      next: (value) => setScratchCount(value),
      error: (err) => console.error("scratchCount liveQuery error:", err),
    });

    return () => subscription.unsubscribe();
  }, [inboxNodeId]);

  useEffect(() => {
    if (inboxNodeId === undefined) {
      return;
    }

    previousPoolLifecycleRef.current = null;
    poolLifecycleRevisionRef.current = 0;

    const subscription = liveRead(async (dataStore) => {
      const [allActiveBits, archivedItems, trashedItems] = await Promise.all([
        dataStore.getAllActiveBits(),
        dataStore.getArchivedItems(),
        dataStore.getTrashedItems(),
      ]);
      const active = allActiveBits
        .filter(
          (bit) =>
            bit.parentId === inboxNodeId &&
            bit.deletedAt === null &&
            bit.archivedAt === null,
        )
        .toSorted((left, right) => right.createdAt - left.createdAt);
      return {
        active,
        archived: archivedItems.bits.filter((bit) => bit.parentId === inboxNodeId),
        deleted: trashedItems.bits.filter((bit) => bit.parentId === inboxNodeId),
      };
    }).subscribe({
      next: ({ active, archived, deleted }) => {
        // A Scratch this page trashed itself (version-keyed marker) is neither
        // an external removal nor a Pool deleted status.
        const markers = useTriageStore.getState().ownTrashMarkers;
        const ownTrashed = deleted.filter(
          (bit) => markers[bit.id]?.expectedVersion === bit.version - 1,
        );
        const ownTrashedIdSet = new Set(ownTrashed.map((bit) => bit.id));
        setDeletedScratchBits(deleted.length === 0 ? EMPTY_BITS : deleted);

        const currentLifecycle = new Map<string, PoolScratchLifecycle>();
        for (const bit of archived) currentLifecycle.set(bit.id, "archived");
        for (const bit of deleted) currentLifecycle.set(bit.id, "deleted");
        for (const bit of active) currentLifecycle.set(bit.id, "active");

        const previousLifecycle = previousPoolLifecycleRef.current;
        if (previousLifecycle !== null) {
          const changes: PoolLifecycleChange[] = [];

          for (const bit of active) {
            const previous = previousLifecycle.get(bit.id);
            if (previous === "archived" || previous === "deleted") {
              changes.push({ kind: "restore", scratchId: bit.id });
            } else if (
              previous === undefined &&
              !localCreatedScratchIds.has(bit.id)
            ) {
              changes.push({ kind: "remote-arrival", scratchId: bit.id });
            }
          }

          for (const [scratchId, previous] of previousLifecycle) {
            const current = currentLifecycle.get(scratchId);
            if (current === previous || current === "active") continue;
            if (ownTrashedIdSet.has(scratchId)) continue;
            if (current === "archived") {
              changes.push({ kind: "archive", scratchId });
            } else if (
              current === "deleted" ||
              (current === undefined &&
                previous !== "deleted" &&
                !unconfirmedLocalScratchIds.has(scratchId))
            ) {
              changes.push({ kind: "delete", scratchId });
            }
          }

          if (changes.length > 0) {
            poolLifecycleRevisionRef.current += 1;
            setPoolLifecycleProjection({
              revision: poolLifecycleRevisionRef.current,
              changes,
            });
          }
        }

        previousPoolLifecycleRef.current = currentLifecycle;
        setActiveScratchBits(active);
        setActiveScratchBitsReady(true);
      },
      error: (err) => console.error("activeScratchBits liveQuery error:", err),
    });

    return () => subscription.unsubscribe();
  }, [inboxNodeId]);

  // Derived, so releasing a marker (a conflict result) reclassifies at once.
  const ownTrashIds = useMemo(() => {
    const ids = deletedScratchBits
      .filter((bit) => ownTrashMarkers[bit.id]?.expectedVersion === bit.version - 1)
      .map((bit) => bit.id);
    return ids.length === 0 ? EMPTY_IDS : ids;
  }, [deletedScratchBits, ownTrashMarkers]);

  useEffect(() => {
    if (!activeScratchBitsReady) return;

    reconcileScratchPoolContext({
      activeIds: orderedActiveScratchBits.map((bit) => bit.id),
      visibleIds: visibleScratchBits.map((bit) => bit.id),
      ownTrashIds,
    });
  }, [
    activeScratchBitsReady,
    orderedActiveScratchBits,
    ownTrashIds,
    reconcileScratchPoolContext,
    visibleScratchBits,
  ]);

  const createScratchBit = useCallback(
    async (title: string) => {
      if (inboxNodeId === undefined) {
        throw new Error("Inbox not found");
      }

      const dataStore = await getDataStore();
      // The id is made and registered first: the new Scratch shows before createBit answers.
      const id = crypto.randomUUID();
      localCreatedScratchIds.add(id);
      unconfirmedLocalScratchIds.add(id);
      const created = await dataStore.createBit(
        {
        parentId: inboxNodeId,
        title,
        description: "",
        icon: "sparkles",
        x: 0,
        y: 0,
        deadline: null,
        deadlineAllDay: false,
        priority: null,
        },
        { id },
      );
      // Cleared only on success: after a refusal the rolled-back view reaches the pool asynchronously.
      unconfirmedLocalScratchIds.delete(id);
      return created.id;
    },
    [inboxNodeId],
  );

  return {
    inboxNodeId,
    createScratchBit,
    scratchCount: inboxNodeId === undefined ? 0 : scratchCount,
    activeScratchBits: inboxNodeId === undefined ? [] : activeScratchBits,
    poolLifecycleProjection,
    systemNodes,
  };
}
