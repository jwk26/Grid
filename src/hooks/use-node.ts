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

export type RoutedNode =
  | { status: "pending"; node: null }
  | { status: "missing"; node: null }
  | { status: "found"; node: Node };

type RoutedState = { id: string; node: Node | null };

/**
 * The Node of a route, with the read made visible (stabilization ST15). `pending` until the first
 * emission for this id: a value that belongs to a previous id never counts. `missing` when the
 * account has no such Node. A trashed or archived Node is still `found`; the caller judges
 * availability. A read error keeps `pending`, as `useNode` keeps `null`.
 */
export function useRoutedNode(nodeId: string): RoutedNode {
  const [state, setState] = useState<RoutedState | null>(null);

  useEffect(() => {
    const subscription = liveRead(async (dataStore) => {
      return dataStore.getNode(nodeId);
    }).subscribe({
      next: (value) => setState({ id: nodeId, node: value ?? null }),
      error: (err) => console.error(err),
    });

    // A read counts only for the subscription that made it: leaving an id drops its value, so
    // coming back (a -> b -> a) is pending until the new subscription's first emission.
    return () => {
      subscription.unsubscribe();
      setState(null);
    };
  }, [nodeId]);

  if (state === null || state.id !== nodeId) return { status: "pending", node: null };
  if (state.node === null) return { status: "missing", node: null };
  return { status: "found", node: state.node };
}

/** A Node the account can open: not in Trash or Archive (its own fields; ST14). */
export function isNodeAvailable(node: Pick<Node, "deletedAt" | "archivedAt">): boolean {
  return node.deletedAt === null && node.archivedAt === null;
}
