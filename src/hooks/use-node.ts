"use client";

import { useEffect, useState } from "react";
import { liveRead } from "@/lib/db/datastore";
import type { Node } from "@/types";

export function useNode(nodeId: string): Node | null {
  const [node, setNode] = useState<Node | null>(null);

  useEffect(() => {
    const subscription = liveRead(async (dataStore) => {
      return dataStore.getNode(nodeId);
    }).subscribe({
      next: (value) => setNode(value ?? null),
      error: (err) => console.error(err),
    });

    return () => subscription.unsubscribe();
  }, [nodeId]);

  return node;
}
