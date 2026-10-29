"use client";

import { useEffect, useRef, useState } from "react";
import { liveRead } from "@/lib/db/datastore";
import {
  type ExplorerItemIdentity,
  useTriageStore,
} from "@/stores/triage-store";
import type { Bit, Node } from "@/types";

export type ExplorerOpenColumnIdentity = {
  columnId: string;
  parentId: string | null;
};

type ExplorerRemoteStatusInput = {
  localPlacementResult: ExplorerItemIdentity | null;
  openColumns: readonly ExplorerOpenColumnIdentity[];
  pathIds: readonly string[];
};

type ExplorerRemoteStatusResult = {
  isReady: boolean;
  validPathIds: string[] | null;
};

type ExplorerRemoteStatusSnapshot = ExplorerRemoteStatusResult & {
  pathKey: string | null;
};

type ItemMetadata = ExplorerItemIdentity & {
  parentId: string | null;
  title: string;
};

type AuthoritativeSnapshot = {
  nodes: Node[];
  bits: Bit[];
  pathRecords: Array<Node | undefined>;
};

function identityKey(identity: ExplorerItemIdentity): string {
  return `${identity.type}:${identity.id}`;
}

function itemMap(nodes: Node[], bits: Bit[]): Map<string, ItemMetadata> {
  return new Map([
    ...nodes.map(
      (node): [string, ItemMetadata] => [
        identityKey({ id: node.id, type: "node" }),
        {
          id: node.id,
          type: "node",
          parentId: node.parentId,
          title: node.title,
        },
      ],
    ),
    ...bits.map(
      (bit): [string, ItemMetadata] => [
        identityKey({ id: bit.id, type: "bit" }),
        {
          id: bit.id,
          type: "bit",
          parentId: bit.parentId,
          title: bit.title,
        },
      ],
    ),
  ]);
}

function isVisibleExplorerItem(item: ItemMetadata, nodes: Node[]): boolean {
  if (item.type === "bit") return item.parentId !== null;
  const node = nodes.find(({ id }) => id === item.id);
  return (
    node !== undefined &&
    node.systemRole === null &&
    !(node.parentId === null && node.hiddenFromGrid)
  );
}

export function useExplorerRemoteStatus({
  localPlacementResult,
  openColumns,
  pathIds,
}: ExplorerRemoteStatusInput): ExplorerRemoteStatusResult {
  const [snapshot, setSnapshot] = useState<ExplorerRemoteStatusSnapshot>({
    isReady: false,
    pathKey: null,
    validPathIds: null,
  });
  const previousItemsRef = useRef<Map<string, ItemMetadata> | null>(null);
  const openColumnsRef = useRef(openColumns);
  const lastPathChangeRef = useRef<string | null>(null);

  useEffect(() => {
    openColumnsRef.current = openColumns;
  }, [openColumns]);

  useEffect(() => {
    if (localPlacementResult === null) return;
    useTriageStore.getState().registerExplorerLocalPlacement(
      localPlacementResult,
    );
  }, [localPlacementResult]);

  const pathKey = pathIds.join("\u0000");
  useEffect(() => {
    const watchedPathIds = pathKey === "" ? [] : pathKey.split("\u0000");
    const subscription = liveRead(async (dataStore): Promise<AuthoritativeSnapshot> => {
      const [nodes, bits, pathRecords] = await Promise.all([
        dataStore.getAllActiveNodes(),
        dataStore.getAllActiveBits(),
        Promise.all(watchedPathIds.map((id) => dataStore.getNode(id))),
      ]);
      return { nodes, bits, pathRecords };
    }).subscribe({
      next: ({ nodes, bits, pathRecords }) => {
        const currentItems = itemMap(nodes, bits);
        const previousItems = previousItemsRef.current;
        if (previousItems !== null) {
          const columnByParent = new Map(
            openColumnsRef.current.map(({ columnId, parentId }) => [
              parentId,
              columnId,
            ]),
          );
          const localPlacementKeys = new Set(
            useTriageStore
              .getState()
              .explorerLocalPlacementIdentities.map(identityKey),
          );
          const arrivals = new Map<string, ExplorerItemIdentity[]>();
          for (const [key, item] of currentItems) {
            if (
              previousItems.has(key) ||
              localPlacementKeys.has(key) ||
              !isVisibleExplorerItem(item, nodes)
            ) {
              continue;
            }
            const columnId = columnByParent.get(item.parentId);
            if (columnId === undefined) continue;
            arrivals.set(columnId, [
              ...(arrivals.get(columnId) ?? []),
              { id: item.id, type: item.type },
            ]);
          }
          for (const [columnId, ids] of arrivals) {
            useTriageStore
              .getState()
              .recordExplorerRemoteArrivals(columnId, ids);
          }
        }

        const activeNodes = new Map(nodes.map((node) => [node.id, node]));
        const validPathIds: string[] = [];
        let expectedParentId: string | null = null;
        let invalidIndex = -1;
        for (let index = 0; index < watchedPathIds.length; index += 1) {
          const id = watchedPathIds[index];
          const activeNode = id === undefined ? undefined : activeNodes.get(id);
          if (
            activeNode === undefined ||
            activeNode.parentId !== expectedParentId ||
            activeNode.systemRole !== null ||
            (expectedParentId === null && activeNode.hiddenFromGrid)
          ) {
            invalidIndex = index;
            break;
          }
          validPathIds.push(activeNode.id);
          expectedParentId = activeNode.id;
        }

        if (invalidIndex >= 0) {
          const invalidId = watchedPathIds[invalidIndex];
          const record = pathRecords[invalidIndex];
          const activeRecord =
            invalidId === undefined ? undefined : activeNodes.get(invalidId);
          const previousRecord =
            invalidId === undefined
              ? undefined
              : previousItems?.get(
                  identityKey({ id: invalidId, type: "node" }),
                );
          const kind =
            record?.archivedAt !== null && record?.archivedAt !== undefined
              ? "archived"
              : activeRecord !== undefined &&
                  activeRecord.parentId !== expectedParentId
                ? "moved"
                : "unavailable";
          const destinationNode =
            validPathIds.length === 0
              ? undefined
              : activeNodes.get(validPathIds[validPathIds.length - 1]!);
          const status = {
            kind,
            title: record?.title ?? previousRecord?.title ?? null,
            destination: destinationNode?.title ?? "Home",
            columnId: destinationNode?.id ?? "home",
            fallbackPathIds: validPathIds,
          } as const;
          const changeIdentity = JSON.stringify([
            invalidId,
            status.kind,
            status.title,
            status.destination,
            status.columnId,
          ]);
          if (changeIdentity !== lastPathChangeRef.current) {
            lastPathChangeRef.current = changeIdentity;
            useTriageStore.getState().setExplorerPathStatus(status);
          }
        } else {
          lastPathChangeRef.current = null;
        }

        previousItemsRef.current = currentItems;
        setSnapshot({ isReady: true, pathKey, validPathIds });
      },
      error: (error) => {
        console.error("Explorer remote status liveQuery error:", error);
      },
    });

    return () => subscription.unsubscribe();
  }, [pathKey]);

  return snapshot.pathKey === pathKey
    ? snapshot
    : { isReady: false, validPathIds: null };
}
