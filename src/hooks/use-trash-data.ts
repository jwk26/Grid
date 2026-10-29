"use client";

import { useEffect, useState } from "react";
import { liveRead } from "@/lib/db/datastore";
import type { Bit, Node } from "@/types";

type TrashDataSnapshot = {
  nodes: Node[];
  bits: Bit[];
  hasLoaded: boolean;
};

export function useTrashData(): {
  items: { nodes: Node[]; bits: Bit[] };
  isLoading: boolean;
} {
  const [state, setState] = useState<TrashDataSnapshot>({
    nodes: [],
    bits: [],
    hasLoaded: false,
  });

  useEffect(() => {
    const subscription = liveRead(async (dataStore) => {
      return dataStore.getTrashedItems();
    }).subscribe({
      next: (value) => {
        setState({
          nodes: value.nodes,
          bits: value.bits,
          hasLoaded: true,
        });
      },
      error: (error) => {
        console.error("trash liveQuery error:", error);
      },
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    items: {
      nodes: state.nodes,
      bits: state.bits,
    },
    isLoading: !state.hasLoaded,
  };
}
