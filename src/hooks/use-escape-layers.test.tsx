import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { isEscapeLayerOpen, isTriageDragActive, useEscapeLayer } from "@/hooks/use-escape-layers";

describe("useEscapeLayer", () => {
  it("registers while open and unregisters on close and on unmount", () => {
    const { rerender, unmount } = renderHook(({ open }) => useEscapeLayer(open), { initialProps: { open: false } });
    expect(isEscapeLayerOpen()).toBe(false);
    rerender({ open: true });
    expect(isEscapeLayerOpen()).toBe(true);
    rerender({ open: false });
    expect(isEscapeLayerOpen()).toBe(false);
    rerender({ open: true });
    unmount();
    expect(isEscapeLayerOpen()).toBe(false);
  });

  it("counts each open layer and reports a Triage drag apart from the others", () => {
    const layer = renderHook(() => useEscapeLayer(true));
    const drag = renderHook(() => useEscapeLayer(true, "triage-drag"));
    expect(isTriageDragActive()).toBe(true);
    drag.unmount();
    expect(isTriageDragActive()).toBe(false);
    expect(isEscapeLayerOpen()).toBe(true);
    layer.unmount();
    expect(isEscapeLayerOpen()).toBe(false);
  });
});
