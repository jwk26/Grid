"use client";

import { WriteOfflineError } from "@/lib/db/write-errors";
import { useEffect, useMemo, useRef, useState } from "react";
import { getDataStore } from "@/lib/db/datastore";
import { toastCopy } from "@/lib/copy/feedback";
import { dropReportedFailure } from "@/lib/db/write-failure";
import { showToast } from "@/lib/feedback/toast";
import type { Bit, Node } from "@/types";

export type ArchiveItem = {
  type: "node" | "bit";
  id: string;
  title: string;
  archivedAt: number;
  color?: string;
  icon?: string;
  isCompleted?: boolean;
};

export type ArchiveGroup = {
  parentNodeId: string | null;
  parentNodeTitle: string;
  parentNodeColor?: string;
  parentNodeIcon?: string;
  items: ArchiveItem[];
};

export type ArchiveViewNode = Node;

type ArchiveSnapshot = {
  nodes: Node[];
  bits: Bit[];
};

const ROOT_GROUP_TITLE = "Root Items";
const FALLBACK_PARENT_TITLE = "Parent Node";

function getArchivedTimestamp(timestamp: number | null): number {
  return timestamp ?? 0;
}

function sortArchiveItems(left: ArchiveItem, right: ArchiveItem): number {
  return right.archivedAt - left.archivedAt;
}

function createEmptyGroup(parentNodeId: string | null, parentNode?: Node): ArchiveGroup {
  return {
    parentNodeId,
    parentNodeTitle:
      parentNodeId === null
        ? ROOT_GROUP_TITLE
        : parentNode?.title ?? FALLBACK_PARENT_TITLE,
    parentNodeColor: parentNode?.color,
    parentNodeIcon: parentNodeId === null ? "Archive" : parentNode?.icon,
    items: [],
  };
}

function buildArchiveGroups(
  nodes: Node[],
  bits: Bit[],
  nodeMap: Map<string, Node>,
): ArchiveGroup[] {
  const groupMap = new Map<string, ArchiveGroup>();

  function getGroup(parentNodeId: string | null): ArchiveGroup {
    const key = parentNodeId ?? "__root__";
    const existing = groupMap.get(key);

    if (existing) {
      return existing;
    }

    const group = createEmptyGroup(
      parentNodeId,
      parentNodeId === null ? undefined : nodeMap.get(parentNodeId),
    );
    groupMap.set(key, group);
    return group;
  }

  for (const node of nodes) {
    getGroup(node.parentId).items.push({
      type: "node",
      id: node.id,
      title: node.title,
      archivedAt: getArchivedTimestamp(node.archivedAt),
      color: node.color,
      icon: node.icon,
    });
  }

  for (const bit of bits) {
    const parentNode = nodeMap.get(bit.parentId);
    getGroup(bit.parentId).items.push({
      type: "bit",
      id: bit.id,
      title: bit.title,
      archivedAt: getArchivedTimestamp(bit.archivedAt),
      color: parentNode?.color,
      icon: bit.icon,
      isCompleted: bit.status === "complete",
    });
  }

  return [...groupMap.values()]
    .map((group) => ({
      ...group,
      items: group.items.toSorted(sortArchiveItems),
    }))
    .toSorted((left, right) => {
      const leftArchivedAt = left.items[0]?.archivedAt ?? 0;
      const rightArchivedAt = right.items[0]?.archivedAt ?? 0;
      return rightArchivedAt - leftArchivedAt;
    });
}

function filterArchiveGroups(groups: ArchiveGroup[], searchQuery: string): ArchiveGroup[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  if (!normalizedQuery) {
    return groups;
  }

  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        item.title.toLowerCase().includes(normalizedQuery),
      ),
    }))
    .filter((group) => group.items.length > 0);
}

export function useArchiveActions(): {
  archive: (type: "node" | "bit", id: string) => Promise<void>;
} {
  async function archive(type: "node" | "bit", id: string): Promise<void> {
    const dataStore = await getDataStore();
    // The Archive control has no message of its own: the store reports a refused archive.
    if (type === "node") {
      await dataStore.archiveNode(id).catch(dropReportedFailure);
    } else {
      await dataStore.archiveBit(id).catch(dropReportedFailure);
    }
  }
  return { archive };
}

export function useArchive(): {
  groups: ArchiveGroup[];
  filteredGroups: ArchiveGroup[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isEmpty: boolean;
  totalCount: number;
  filteredCount: number;
  nodeMap: Map<string, Node>;
  unarchive: (type: "node" | "bit", id: string) => Promise<void>;
  restoringIds: Set<string>;
} {
  const [snapshot, setSnapshot] = useState<ArchiveSnapshot>({
    nodes: [],
    bits: [],
  });
  const [searchQuery, setSearchQueryState] = useState("");
  const [refreshVersion, setRefreshVersion] = useState(0);
  const restoringIdsRef = useRef(new Set<string>());
  const [restoringIds, setRestoringIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    async function loadArchive() {
      const dataStore = await getDataStore();
      const archivedItems = await dataStore.getArchivedItems();

      if (!cancelled) {
        setSnapshot(archivedItems);
      }
    }

    void loadArchive();

    return () => {
      cancelled = true;
    };
  }, [refreshVersion]);

  async function unarchive(type: "node" | "bit", id: string): Promise<void> {
    if (restoringIdsRef.current.has(id)) return;
    restoringIdsRef.current.add(id);
    setRestoringIds(new Set(restoringIdsRef.current));
    try {
      const dataStore = await getDataStore();
      if (type === "node") {
        await dataStore.unarchiveNode(id);
      } else {
        await dataStore.unarchiveBit(id);
      }
      setRefreshVersion((v) => v + 1);
    } catch (error) {
      if (error instanceof WriteOfflineError) return;
      const item = [...snapshot.nodes, ...snapshot.bits].find((candidate) => candidate.id === id);
      showToast(toastCopy.archiveRestoreFailed, item?.title ?? "");
    } finally {
      restoringIdsRef.current.delete(id);
      setRestoringIds(new Set(restoringIdsRef.current));
    }
  }

  const nodeMap = useMemo(
    () => new Map(snapshot.nodes.map((node) => [node.id, node])),
    [snapshot.nodes],
  );
  const groups = useMemo(
    () => buildArchiveGroups(snapshot.nodes, snapshot.bits, nodeMap),
    [nodeMap, snapshot.bits, snapshot.nodes],
  );
  const filteredGroups = useMemo(
    () => filterArchiveGroups(groups, searchQuery),
    [groups, searchQuery],
  );
  const totalCount = snapshot.nodes.length + snapshot.bits.length;
  const filteredCount = filteredGroups.reduce(
    (count, group) => count + group.items.length,
    0,
  );

  function setSearchQuery(query: string) {
    setSearchQueryState(query);
  }

  return {
    groups,
    filteredGroups,
    searchQuery,
    setSearchQuery,
    isEmpty: totalCount === 0,
    totalCount,
    filteredCount,
    nodeMap,
    unarchive,
    restoringIds,
  };
}
