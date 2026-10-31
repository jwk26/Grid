import { GRID_COLS, GRID_ROWS } from "@/lib/constants";
import type { GridPosition } from "@/types";

export function findNearestEmptyCell(
  occupied: Set<string>,
  startX: number,
  startY: number,
): GridPosition | null {
  const visited = new Set<string>();
  const queue: GridPosition[] = [{ x: startX, y: startY }];
  const directions = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];

  while (queue.length > 0) {
    const cell = queue.shift();

    if (!cell) {
      continue;
    }

    const key = `${cell.x},${cell.y}`;

    if (visited.has(key)) {
      continue;
    }

    visited.add(key);

    if (!occupied.has(key)) {
      return cell;
    }

    for (const [dx, dy] of directions) {
      const nextX = cell.x + dx;
      const nextY = cell.y + dy;
      const nextKey = `${nextX},${nextY}`;

      if (
        nextX >= 0 &&
        nextX < GRID_COLS &&
        nextY >= 0 &&
        nextY < GRID_ROWS &&
        !visited.has(nextKey)
      ) {
        queue.push({ x: nextX, y: nextY });
      }
    }
  }

  return null;
}
