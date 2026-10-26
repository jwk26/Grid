"use client";

import { useEffect, useState } from "react";
import { liveRead } from "@/lib/db/datastore";
import { getUrgencyLevel } from "@/lib/utils/urgency";
import type { UrgencyLevel } from "@/types";

/**
 * Reactively computes the highest urgency level across all active Bits
 * that have an approaching or past deadline.
 * Returns null when no urgent Bits exist.
 * Consumed by the sidebar Calendar button urgency dot.
 */
export function useGlobalUrgency(): UrgencyLevel {
  const [urgency, setUrgency] = useState<UrgencyLevel>(null);

  useEffect(() => {
    const subscription = liveRead(async (dataStore) => {
      const [bits, nodes] = await Promise.all([
        dataStore.getAllActiveBits(),
        dataStore.getAllActiveNodes(),
      ]);
      return { bits, nodes };
    }).subscribe({
      next: ({ bits, nodes }) => {
        const activeBits = bits.filter(
          (b) => b.deletedAt === null && b.archivedAt === null && b.deadline !== null,
        );
        const activeNodes = nodes.filter(
          (node) =>
            node.deletedAt === null &&
            node.archivedAt === null &&
            node.deadline !== null &&
            node.level !== 0,
        );
        let max: UrgencyLevel = null;

        for (const bit of activeBits) {
          const level = getUrgencyLevel(bit.deadline);
          if (level !== null && (max === null || level > max)) {
            max = level;
          }
        }

        for (const node of activeNodes) {
          const level = getUrgencyLevel(node.deadline);
          if (level !== null && (max === null || level > max)) {
            max = level;
          }
        }

        setUrgency(max);
      },
      error: (err) => console.error("useGlobalUrgency liveQuery error:", err),
    });

    return () => subscription.unsubscribe();
  }, []);

  return urgency;
}
