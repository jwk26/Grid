import { describe, expect, it } from "vitest";
import { GRID_COLS, GRID_ROWS } from "@/lib/constants";
import { findNearestEmptyCell } from "@/lib/utils/bfs";

describe("findNearestEmptyCell", () => {
  it("returns the starting position when the grid cell is empty", () => {
    expect(findNearestEmptyCell(new Set(), 0, 0)).toEqual({ x: 0, y: 0 });
  });

  it("returns the nearest neighbor when the starting position is occupied", () => {
    const occupied = new Set(["0,0"]);

    expect(findNearestEmptyCell(occupied, 0, 0)).toEqual({ x: 1, y: 0 });
  });

  it("finds the only remaining empty cell in an otherwise occupied grid", () => {
    const occupied = new Set<string>();

    for (let y = 0; y < GRID_ROWS; y += 1) {
      for (let x = 0; x < GRID_COLS; x += 1) {
        if (x === 7 && y === 5) {
          continue;
        }

        occupied.add(`${x},${y}`);
      }
    }

    expect(findNearestEmptyCell(occupied, 0, 0)).toEqual({ x: 7, y: 5 });
  });

  it("returns null when the entire grid is full", () => {
    const occupied = new Set<string>();

    for (let y = 0; y < GRID_ROWS; y += 1) {
      for (let x = 0; x < GRID_COLS; x += 1) {
        occupied.add(`${x},${y}`);
      }
    }

    expect(findNearestEmptyCell(occupied, 0, 0)).toBeNull();
  });
});
