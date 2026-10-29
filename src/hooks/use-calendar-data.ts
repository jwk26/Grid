"use client";

import { format } from "date-fns";
import { useEffect, useState } from "react";
import { type DataStore, liveRead } from "@/lib/db/datastore";
import type { Bit, Chunk, Node } from "@/types";

type CalendarItem = Node | Bit | Chunk;
type PoolItem = Bit | Chunk;

type CalendarDataState = {
  nodes: Node[];
  bits: Bit[];
  chunks: Chunk[];
  isLoading: boolean;
};

const DAY_IN_MS = 86_400_000;

const INITIAL_CALENDAR_DATA: CalendarDataState = {
  nodes: [],
  bits: [],
  chunks: [],
  isLoading: true,
};

async function loadCalendarSnapshot(dataStore: DataStore) {
  const rootNodes = await dataStore.getNodes(null);
  const nodes: Node[] = [...rootNodes];
  const bits: Bit[] = [];
  const queue = [...rootNodes];

  for (let index = 0; index < queue.length; index += 1) {
    const parentNode = queue[index];
    const [childNodes, childBits] = await Promise.all([
      dataStore.getNodes(parentNode.id),
      dataStore.getBits(parentNode.id),
    ]);

    nodes.push(...childNodes);
    bits.push(...childBits);
    queue.push(...childNodes);
  }

  const chunkGroups = await Promise.all(bits.map((bit) => dataStore.getChunks(bit.id)));

  return {
    nodes,
    bits,
    chunks: chunkGroups.flat(),
  };
}

function getCalendarTimestamp(item: CalendarItem): number | null {
  if ("deadline" in item) {
    return item.deadline;
  }

  return item.time;
}

function getPoolTimestamp(item: PoolItem): number | null {
  if ("deadline" in item) {
    return item.deadline;
  }

  return item.time;
}

function getPriorityRank(item: PoolItem): number {
  if (!("priority" in item) || item.priority === null) {
    return 4;
  }

  switch (item.priority) {
    case "high":
      return 1;
    case "mid":
      return 2;
    case "low":
      return 3;
  }
}

function groupItemsByDay(
  items: CalendarItem[],
  predicate: (timestamp: number) => boolean,
): Map<string, CalendarItem[]> {
  const grouped = new Map<string, CalendarItem[]>();

  const visibleItems = items
    .filter((item) => {
      const timestamp = getCalendarTimestamp(item);
      return timestamp !== null && predicate(timestamp);
    })
    .toSorted((left, right) => {
      const leftTimestamp = getCalendarTimestamp(left) ?? 0;
      const rightTimestamp = getCalendarTimestamp(right) ?? 0;
      return leftTimestamp - rightTimestamp;
    });

  for (const item of visibleItems) {
    const timestamp = getCalendarTimestamp(item);

    if (timestamp === null) {
      continue;
    }

    const key = format(timestamp, "yyyy-MM-dd");
    const dayItems = grouped.get(key) ?? [];
    dayItems.push(item);
    grouped.set(key, dayItems);
  }

  return grouped;
}

export function useCalendarData(): {
  nodes: Node[];
  bits: Bit[];
  chunks: Chunk[];
  nodeMap: Map<string, Node>;
  bitMap: Map<string, Bit>;
  colorMap: Map<string, string>;
  weeklyItems: (weekStart: Date) => Map<string, (Node | Bit | Chunk)[]>;
  monthlyItems: (month: Date) => Map<string, (Node | Bit | Chunk)[]>;
  poolItems: (Bit | Chunk)[];
  isLoading: boolean;
} {
  const [state, setState] = useState<CalendarDataState>(INITIAL_CALENDAR_DATA);

  useEffect(() => {
    const subscription = liveRead(loadCalendarSnapshot).subscribe({
      next: ({ bits, chunks, nodes }) => {
        setState({
          nodes,
          bits,
          chunks,
          isLoading: false,
        });
      },
      error: (error) => {
        console.error("liveQuery error:", error);
      },
    });

    return () => subscription.unsubscribe();
  }, []);

  const activeNodes = state.nodes.filter(
    (node) => node.deletedAt === null && node.archivedAt === null,
  );
  const activeBits = state.bits.filter((bit) => bit.deletedAt === null && bit.archivedAt === null);
  const activeBitIds = new Set(activeBits.map((bit) => bit.id));
  const activeChunks = state.chunks.filter((chunk) => activeBitIds.has(chunk.parentId));
  const nodeMap = new Map(activeNodes.map((node) => [node.id, node]));
  const bitMap = new Map(activeBits.map((bit) => [bit.id, bit]));
  const colorMap = new Map<string, string>();

  for (const node of activeNodes) {
    colorMap.set(node.id, node.color);
  }

  for (const bit of activeBits) {
    const parentNode = nodeMap.get(bit.parentId);

    if (parentNode) {
      colorMap.set(bit.id, parentNode.color);
    }
  }

  for (const chunk of activeChunks) {
    const parentBit = bitMap.get(chunk.parentId);
    if (parentBit) {
      const grandparentNode = nodeMap.get(parentBit.parentId);
      if (grandparentNode) {
        colorMap.set(chunk.id, grandparentNode.color);
      }
    }
  }

  const calendarItems: CalendarItem[] = [
    ...activeNodes.filter((node) => node.deadline !== null && node.level !== 0),
    ...activeBits.filter((bit) => bit.deadline !== null),
    ...activeChunks.filter((chunk) => chunk.time !== null),
  ];

  const weeklyItems = (weekStart: Date) => {
    const weekStartTime = new Date(
      weekStart.getFullYear(),
      weekStart.getMonth(),
      weekStart.getDate(),
    ).getTime();
    const weekEndTime = weekStartTime + 7 * DAY_IN_MS;

    return groupItemsByDay(
      calendarItems,
      (timestamp) => timestamp >= weekStartTime && timestamp < weekEndTime,
    );
  };

  const monthlyItems = (month: Date) => {
    const monthYear = month.getFullYear();
    const monthIndex = month.getMonth();

    return groupItemsByDay(calendarItems, (timestamp) => {
      const date = new Date(timestamp);
      return date.getFullYear() === monthYear && date.getMonth() === monthIndex;
    });
  };

  const poolItems = [...activeBits, ...activeChunks].toSorted(
    (left, right) => {
      const leftTimestamp = getPoolTimestamp(left);
      const rightTimestamp = getPoolTimestamp(right);

      if (leftTimestamp === null && rightTimestamp !== null) {
        return 1;
      }

      if (leftTimestamp !== null && rightTimestamp === null) {
        return -1;
      }

      if (leftTimestamp !== null && rightTimestamp !== null) {
        const priorityDifference = getPriorityRank(left) - getPriorityRank(right);

        if (priorityDifference !== 0) {
          return priorityDifference;
        }

        return leftTimestamp - rightTimestamp;
      }

      return 0;
    },
  );

  return {
    nodes: activeNodes,
    bits: activeBits,
    chunks: activeChunks,
    nodeMap,
    bitMap,
    colorMap,
    weeklyItems,
    monthlyItems,
    poolItems,
    isLoading: state.isLoading,
  };
}
