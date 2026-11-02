import { afterEach, describe, expect, it, vi } from "vitest";
import { MIN_WINDOW_WIDTH } from "@/lib/constants";
import { browserViewport, isNarrowWindow, subscribeNarrowWindow } from "@/lib/viewport";
import { installMatchMedia, setViewportWidth } from "@/lib/viewport-test-utils";

afterEach(() => vi.unstubAllGlobals());

describe("the narrow window (SPEC §Account entry step 1)", () => {
  it("is narrow at 1023px and wide at 1024px", () => {
    installMatchMedia(1023);
    expect(MIN_WINDOW_WIDTH).toBe(1024);
    expect(isNarrowWindow()).toBe(true);
    setViewportWidth(1024);
    expect(isNarrowWindow()).toBe(false);
    setViewportWidth(1023);
    expect(isNarrowWindow()).toBe(true);
  });

  it("counts a browser without matchMedia as wide", () => {
    vi.stubGlobal("matchMedia", undefined);
    expect(isNarrowWindow()).toBe(false);
    const stop = subscribeNarrowWindow(() => undefined);
    expect(stop).toBeTypeOf("function");
    stop();
  });

  it("tells a subscriber when the width crosses the boundary, and stops after unsubscribing", () => {
    installMatchMedia(1400);
    const listener = vi.fn();
    const stop = subscribeNarrowWindow(listener);
    setViewportWidth(900);
    expect(listener).toHaveBeenCalledTimes(1);
    setViewportWidth(1100);
    expect(listener).toHaveBeenCalledTimes(2);
    stop();
    setViewportWidth(800);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("the shared viewport reads the media query when asked, not a cached value", () => {
    installMatchMedia(1400);
    expect(browserViewport.isNarrow()).toBe(false);
    setViewportWidth(600);
    expect(browserViewport.isNarrow()).toBe(true);
  });
});
