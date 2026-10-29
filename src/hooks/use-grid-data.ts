"use client";

import { useEffect, useState } from "react";
import { liveRead } from "@/lib/db/datastore";
import type { Bit, Node } from "@/types";

type GridDataSnapshot = {
  parentId: string | null;
  nodes: Node[];
  bits: Bit[];
  hasLoaded: boolean;
};

export function useGridData(parentId: string | null): {
  nodes: Node[];
  bits: Bit[];
  isLoading: boolean;
} {
  const [state, setState] = useState<GridDataSnapshot>({
    parentId,
    nodes: [],
    bits: [],
    hasLoaded: false,
  });

  useEffect(() => {
    const subscription = liveRead(async (dataStore) => {
      return dataStore.getActiveGridContents(parentId);
    }).subscribe({
      next: (value) => {
        setState({
          parentId,
          nodes: value.nodes,
          bits: value.bits,
          hasLoaded: true,
        });
      },
      error: (error) => {
        console.error("liveQuery error:", error);
      },
    });

    return () => subscription.unsubscribe();
  }, [parentId]);

  if (state.parentId !== parentId || !state.hasLoaded) {
    return {
      nodes: [],
      bits: [],
      isLoading: true,
    };
  }

  return {
    nodes: state.nodes,
    bits: state.bits,
    isLoading: false,
  };
}
