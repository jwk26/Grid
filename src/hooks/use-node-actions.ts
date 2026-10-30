"use client";

import { useCallback } from "react";
import { getDataStore, type ReportOption } from "@/lib/db/datastore";
import type { UpdateNode } from "@/lib/db/schema";
import type { Bit } from "@/types";

export function useNodeActions() {
  const updateNode = useCallback(async (id: string, data: UpdateNode, options?: ReportOption): Promise<void> => {
    const dataStore = await getDataStore();
    await dataStore.updateNode(id, data, options);
  }, []);

  const getChildDeadlineConflicts = useCallback(
    async (nodeId: string, deadline: number, deadlineAllDay: boolean): Promise<Bit[]> => {
      const dataStore = await getDataStore();
      return dataStore.getChildDeadlineConflicts(nodeId, deadline, deadlineAllDay);
    },
    [],
  );

  return { updateNode, getChildDeadlineConflicts };
}
