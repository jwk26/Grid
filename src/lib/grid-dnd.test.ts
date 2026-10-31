import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getGridBreadcrumbDropId,
  getGridCellDropId,
  getGridNodeDropId,
  getTriageRemoveDropId,
  gridCollisionDetection,
  isGridBreadcrumbDropId,
  isTriageDropData,
  triageCollisionDetection,
} from "./grid-dnd";

const closestCenterMock = vi.hoisted(() => vi.fn());
const pointerWithinMock = vi.hoisted(() => vi.fn());

vi.mock("@dnd-kit/core", () => ({
  closestCenter: closestCenterMock,
  pointerWithin: pointerWithinMock,
}));

describe("gridCollisionDetection", () => {
  beforeEach(() => {
    closestCenterMock.mockReset();
    pointerWithinMock.mockReset();
  });

  it("returns node-drop targets when the pointer is inside one", () => {
    const args = { collisionRect: null } as never;
    const nodeTarget = { id: "grid-node-drop:target-node" };
    const cellTarget = { id: "grid-cell:root:1:1" };

    pointerWithinMock.mockReturnValue([cellTarget, nodeTarget]);

    expect(gridCollisionDetection(args)).toEqual([nodeTarget]);
    expect(closestCenterMock).not.toHaveBeenCalled();
  });

  it("falls back to closestCenter and keeps only grid cells when pointerWithin is empty", () => {
    const args = { collisionRect: null } as never;
    const cellTarget = { id: "grid-cell:root:1:1" };
    const nodeTarget = { id: "grid-node-drop:adjacent-node" };

    pointerWithinMock.mockReturnValue([]);
    closestCenterMock.mockReturnValue([nodeTarget, cellTarget]);

    expect(gridCollisionDetection(args)).toEqual([cellTarget]);
  });

  it("ignores pointerWithin grid cells and uses the closestCenter fallback", () => {
    const args = { collisionRect: null } as never;
    const pointerCellTarget = { id: "grid-cell:root:9:9" };
    const fallbackCellTarget = { id: "grid-cell:root:2:2" };
    const fallbackNodeTarget = { id: "grid-node-drop:adjacent-node" };

    pointerWithinMock.mockReturnValue([pointerCellTarget]);
    closestCenterMock.mockReturnValue([fallbackNodeTarget, fallbackCellTarget]);

    expect(gridCollisionDetection(args)).toEqual([fallbackCellTarget]);
  });

  it("keeps cell reposition targets in the adjacent-cell scenario", () => {
    const args = { collisionRect: null } as never;
    const adjacentNodeTarget = { id: "grid-node-drop:neighbor-node" };
    const currentCellTarget = { id: "grid-cell:root:4:3" };

    pointerWithinMock.mockReturnValue([]);
    closestCenterMock.mockReturnValue([adjacentNodeTarget, currentCellTarget]);

    expect(gridCollisionDetection(args)).toEqual([currentCellTarget]);
  });

  it("returns breadcrumb targets when the pointer is inside one", () => {
    const args = { collisionRect: null } as never;
    const breadcrumbTarget = { id: "grid-breadcrumb:parent-node" };
    const cellTarget = { id: "grid-cell:root:1:1" };

    pointerWithinMock.mockReturnValue([cellTarget, breadcrumbTarget]);

    expect(gridCollisionDetection(args)).toEqual([breadcrumbTarget]);
    expect(closestCenterMock).not.toHaveBeenCalled();
  });

  it("puts the breadcrumb target first when a Node card sits under the segment", () => {
    const args = { collisionRect: null } as never;
    const nodeTarget = { id: "grid-node-drop:card-under-the-bar" };
    const breadcrumbTarget = { id: "grid-breadcrumb:parent-node" };

    pointerWithinMock.mockReturnValue([nodeTarget, breadcrumbTarget]);

    expect(gridCollisionDetection(args)).toEqual([breadcrumbTarget, nodeTarget]);
  });

  it("keeps a top-left grid cell as a drop target", () => {
    const args = { collisionRect: null } as never;
    const topLeft = { id: "grid-cell:root:0:0" };

    pointerWithinMock.mockReturnValue([]);
    closestCenterMock.mockReturnValue([topLeft]);

    expect(gridCollisionDetection(args)).toEqual([topLeft]);
  });
});

describe("triage dnd helpers", () => {
  beforeEach(() => {
    pointerWithinMock.mockReset();
  });

  it("recognizes the remove-from-staging drop data", () => {
    expect(isTriageDropData({ kind: "triage-remove-drop" })).toBe(true);
    expect(getTriageRemoveDropId()).toBe("triage-remove-drop");
  });

  it("keeps the remove-from-staging target in pointer collision results", () => {
    const args = { collisionRect: null } as never;
    const removeTarget = { id: "triage-remove-drop" };
    const unrelatedTarget = { id: "grid-delete-drop" };

    pointerWithinMock.mockReturnValue([unrelatedTarget, removeTarget]);

    expect(triageCollisionDetection(args)).toEqual([removeTarget]);
  });
});

describe("breadcrumb drop ids", () => {
  it("tells a breadcrumb drop id from the other drop ids", () => {
    expect(isGridBreadcrumbDropId(getGridBreadcrumbDropId(null))).toBe(true);
    expect(isGridBreadcrumbDropId(getGridBreadcrumbDropId("n1"))).toBe(true);
    expect(isGridBreadcrumbDropId(getGridNodeDropId("n1"))).toBe(false);
    expect(isGridBreadcrumbDropId(getGridCellDropId(null, 0, 0))).toBe(false);
    expect(isGridBreadcrumbDropId(undefined)).toBe(false);
    expect(isGridBreadcrumbDropId(42)).toBe(false);
  });
});
