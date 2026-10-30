"use client";

import { useCallback } from "react";
import { getDataStore, type ReportOption } from "@/lib/db/datastore";
import type { CreateBit, CreateNode } from "@/lib/db/schema";
import type { Bit, Node } from "@/types";

export function useGridActions() {
  const getGridOccupancy = useCallback(async (parentId: string | null): Promise<Set<string>> => {
    const dataStore = await getDataStore();
    return dataStore.getGridOccupancy(parentId);
  }, []);

  const createNode = useCallback(async (data: CreateNode, options?: ReportOption): Promise<Node> => {
    const dataStore = await getDataStore();
    return dataStore.createNode(data, options);
  }, []);

  const createBit = useCallback(async (data: CreateBit, options?: ReportOption): Promise<Bit> => {
    const dataStore = await getDataStore();
    return dataStore.createBit(data, options);
  }, []);

  const softDeleteNode = useCallback(async (id: string): Promise<void> => {
    const dataStore = await getDataStore();
    return dataStore.softDeleteNode(id);
  }, []);

  const softDeleteBit = useCallback(async (id: string): Promise<void> => {
    const dataStore = await getDataStore();
    return dataStore.softDeleteBit(id);
  }, []);

  const runBreadcrumbZoneMigration = useCallback(
    async (parentId: string | null, blockedCells: Set<string>): Promise<void> => {
      const dataStore = await getDataStore();
      await dataStore.runBreadcrumbZoneMigration(parentId, blockedCells);
    },
    [],
  );

  return {
    getGridOccupancy,
    createNode,
    createBit,
    softDeleteNode,
    softDeleteBit,
    runBreadcrumbZoneMigration,
  };
}
