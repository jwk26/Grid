import { describe, expect, it } from "vitest";
import { pointerWithin, type Collision, type DroppableContainer } from "@dnd-kit/core";
import {
  getTriageBitZoneDropId,
  getTriageNodeZoneDropId,
  getTriageRemoveDropId,
} from "@/lib/grid-dnd";
import { triageInteractionCollisionDetection } from "@/hooks/use-dnd";

type Box = { top: number; left: number; width: number; height: number };

function args(boxes: Record<string, Box>, pointer: { x: number; y: number }) {
  const droppableRects = new Map(
    Object.entries(boxes).map(([id, box]) => [
      id,
      { ...box, bottom: box.top + box.height, right: box.left + box.width },
    ]),
  );
  const droppableContainers = Object.keys(boxes).map(
    (id) => ({ id, disabled: false, data: { current: undefined }, node: { current: null }, rect: { current: null }, key: id }) as unknown as DroppableContainer,
  );
  return {
    active: null as never,
    collisionRect: null as never,
    droppableRects: droppableRects as never,
    droppableContainers,
    pointerCoordinates: pointer,
  };
}

function detect(boxes: Record<string, Box>, pointer: { x: number; y: number }): string[] {
  const result = triageInteractionCollisionDetection(args(boxes, pointer)) as Collision[];
  return result.map((collision) => String(collision.id));
}

describe("triageInteractionCollisionDetection", () => {
  // A tall, narrow Nodes column overlapped at the bottom by a wide Remove bar: by corner distance
  // the column is the nearer candidate, so without a priority rule it would win under the bar.
  const layout = {
    [getTriageNodeZoneDropId()]: { left: 0, top: 0, width: 200, height: 600 },
    [getTriageBitZoneDropId()]: { left: 200, top: 0, width: 400, height: 600 },
    [getTriageRemoveDropId()]: { left: 0, top: 552, width: 800, height: 48 },
    "triage-hierarchy:body-home": { left: 0, top: 640, width: 400, height: 300 },
  };

  it("puts Remove first where it overlaps a subsection, wherever the pointer is on the bar", () => {
    for (const x of [100, 400, 700]) {
      const hit = detect(layout, { x, y: 576 });
      expect(hit[0]).toBe(getTriageRemoveDropId());
    }
    expect(detect(layout, { x: 100, y: 576 })).toContain(getTriageNodeZoneDropId());
  });

  it("keeps the order of the other candidates and ignores unrelated droppables", () => {
    const withExtra = { ...layout, "unrelated-drop": { left: 0, top: 0, width: 800, height: 600 } };
    const hit = detect(withExtra, { x: 100, y: 300 });
    expect(hit).not.toContain("unrelated-drop");
    expect(hit).toEqual([getTriageNodeZoneDropId()]);
    expect(detect(layout, { x: 100, y: 700 })).toEqual(["triage-hierarchy:body-home"]);
  });

  it("leaves two overlapping non-Remove candidates in the order pointerWithin gives them", () => {
    const boxes = {
      [getTriageNodeZoneDropId()]: { left: 0, top: 0, width: 300, height: 300 },
      [getTriageBitZoneDropId()]: { left: 100, top: 100, width: 100, height: 100 },
      [getTriageRemoveDropId()]: { left: 0, top: 0, width: 400, height: 400 },
    };
    const pointer = { x: 150, y: 150 };
    const expected = pointerWithin(args(boxes, pointer))
      .map((collision) => String(collision.id))
      .filter((id) => id !== getTriageRemoveDropId());
    expect(expected).toHaveLength(2);
    expect(detect(boxes, pointer)).toEqual([getTriageRemoveDropId(), ...expected]);
    // Without Remove in play the order is exactly pointerWithin's.
    const rest = Object.fromEntries(Object.entries(boxes).filter(([id]) => id !== getTriageRemoveDropId()));
    expect(detect(rest, pointer)).toEqual(expected);
  });

  it("gives the Return-to-Breakdown target the same priority", () => {
    const hit = detect(
      { ...layout, "triage-remove-drop:breakdown": { left: 0, top: 0, width: 800, height: 600 } },
      { x: 300, y: 300 },
    );
    expect(hit[0]).toBe("triage-remove-drop:breakdown");
  });
});
