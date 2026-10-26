"use client";

import { useEffect, useState } from "react";
import { liveRead } from "@/lib/db/datastore";
import type { Node } from "@/types";

export function useBreadcrumbChain(nodeId: string): Node[] {
  const [segments, setSegments] = useState<Node[]>([]);

  useEffect(() => {
    const subscription = liveRead(async (dataStore) => {
      const chain: Node[] = [];
      let current = await dataStore.getNode(nodeId);

      while (current) {
        chain.unshift(current);
        current = current.parentId ? await dataStore.getNode(current.parentId) : undefined;
      }

      return chain;
    }).subscribe({
      next: (chain) => setSegments(chain),
      error: (err) => console.error(err),
    });

    return () => subscription.unsubscribe();
  }, [nodeId]);

  return segments;
}
