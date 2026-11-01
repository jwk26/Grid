import { describe, expect, it } from "vitest";
import {
  motionDistance,
  motionDuration,
  motionScale,
  motionShadow,
  motionSpring,
  motionZIndex,
} from "./motion-language";

describe("motion language", () => {
  it("captures the extracted griddo node and sidebar affordance values", () => {
    expect(motionScale.nodeHover).toBe(1.05);
    expect(motionScale.nodeDrag).toBe(1.1);
    expect(motionScale.sidebarDragTarget).toBe(1.2);
    expect(motionZIndex.nodeHover).toBe(40);
    expect(motionZIndex.nodeDrag).toBe(50);
    expect("nodeRest" in motionZIndex).toBe(false);
    expect(motionShadow.sidebarDragTarget).toBe("0 0 20px hsl(var(--primary) / 0.45)");
  });

  it("keeps shared durations and springs named for domain recipes", () => {
    expect(motionDuration.affordance).toBe(0.15);
    expect(motionDuration.theme).toBe(0.3);
    expect(motionDistance.sink).toBe(8);
    expect(motionDistance.itemExitY).toBe(8);
    expect(motionSpring.scale.type).toBe("spring");
    expect(motionSpring.scale.stiffness).toBe(550);
    expect(motionSpring.scale.damping).toBe(30);
  });
});
