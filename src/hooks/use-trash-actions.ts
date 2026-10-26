"use client";

import { getDataStore } from "@/lib/db/datastore";

export function useTrashActions() {
  async function restoreNode(nodeId: string): Promise<void> {
    const dataStore = await getDataStore();
    await dataStore.restoreNode(nodeId);
  }

  async function hardDeleteNode(nodeId: string): Promise<void> {
    const dataStore = await getDataStore();
    await dataStore.hardDeleteNode(nodeId);
  }

  async function restoreBit(bitId: string): Promise<void> {
    const dataStore = await getDataStore();
    await dataStore.restoreBit(bitId);
  }

  async function hardDeleteBit(bitId: string): Promise<void> {
    const dataStore = await getDataStore();
    await dataStore.hardDeleteBit(bitId);
  }

  async function emptyTrash(): Promise<void> {
    const dataStore = await getDataStore();
    await dataStore.emptyTrash();
  }

  return { restoreNode, hardDeleteNode, restoreBit, hardDeleteBit, emptyTrash };
}
