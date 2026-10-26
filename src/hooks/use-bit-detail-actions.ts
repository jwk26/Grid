"use client";

import { useCallback } from "react";
import { getDataStore, type ExtendParentOption } from "@/lib/db/datastore";
import type { UpdateBit, UpdateNode } from "@/lib/db/schema";
import type { Node } from "@/types";

export function useBitDetailActions() {
  const updateBit = useCallback(
    async (id: string, data: UpdateBit, options?: ExtendParentOption): Promise<void> => {
      const dataStore = await getDataStore();
      await (options ? dataStore.updateBit(id, data, options) : dataStore.updateBit(id, data));
    },
    [],
  );

  const updateNode = useCallback(async (id: string, data: UpdateNode): Promise<void> => {
    const dataStore = await getDataStore();
    await dataStore.updateNode(id, data);
  }, []);

  const softDeleteBit = useCallback(async (id: string): Promise<void> => {
    const dataStore = await getDataStore();
    await dataStore.softDeleteBit(id);
  }, []);

  const promoteBitToNode = useCallback(async (bitId: string): Promise<Node> => {
    const dataStore = await getDataStore();
    return dataStore.promoteBitToNode(bitId);
  }, []);

  return { updateBit, updateNode, softDeleteBit, promoteBitToNode };
}
