"use client";

import { useEffect, useState } from "react";
import { liveRead } from "@/lib/db/datastore";
import { getUrgencyLevel } from "@/lib/utils/urgency";
import type { UrgencyLevel } from "@/types";

/**
 * Reactively computes the highest urgency level among the active child Bits
 * of a specific Node.
 * Returns null when no urgent Bits exist for the given node.
 * Consumed by NodeCard urgency badge.
 */
export function useNodeUrgency(nodeId: string): UrgencyLevel {
  const [urgency, setUrgency] = useState<UrgencyLevel>(null);

  useEffect(() => {
    const subscription = liveRead(async (dataStore) => {
      return dataStore.getBitsForNode(nodeId);
    }).subscribe({
      next: (bits) => {
        const activeBits = bits.filter(
          (b) => b.deletedAt === null && b.archivedAt === null && b.deadline !== null,
        );
        let max: UrgencyLevel = null;

        for (const bit of activeBits) {
          const level = getUrgencyLevel(bit.deadline);
          if (level !== null && (max === null || level > max)) {
            max = level;
          }
        }

        setUrgency(max);
      },
      error: (err) => console.error("useNodeUrgency liveQuery error:", err),
    });

    return () => subscription.unsubscribe();
  }, [nodeId]);

  return urgency;
}
