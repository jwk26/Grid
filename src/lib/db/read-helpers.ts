import type { Chunk, Node } from "@/lib/db/schema";

// Read helpers shared by the snapshot store's reads, so every read orders its results the same way.

export function sortGridItems<T extends { x: number; y: number }>(items: T[]): T[] {
  return [...items].sort((left, right) => left.y - right.y || left.x - right.x);
}

export function sortChunks(items: Chunk[]): Chunk[] {
  return [...items].sort((left, right) => left.order - right.order);
}

export function buildNodeTitlePath(
  parentId: string | null,
  nodesById: Map<string, Node>,
): string[] {
  const path: string[] = [];
  let currentId = parentId;

  while (currentId) {
    const current = nodesById.get(currentId);
    if (!current) {
      break;
    }

    path.unshift(current.title);
    currentId = current.parentId;
  }

  return path;
}
