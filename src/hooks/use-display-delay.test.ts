import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DISPLAY_DELAY_MS } from "@/lib/constants";
import { useDisplayDelay } from "@/hooks/use-display-delay";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useDisplayDelay", () => {
  it("uses the 300ms display delay", () => {
    expect(DISPLAY_DELAY_MS).toBe(300);
  });

  it("is not visible before the delay and visible at it", () => {
    const { result } = renderHook(({ phase }) => useDisplayDelay(phase), {
      initialProps: { phase: "pending" as string | null },
    });
    expect(result.current).toBe(false);

    act(() => vi.advanceTimersByTime(DISPLAY_DELAY_MS - 1));
    expect(result.current).toBe(false);

    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe(true);
  });

  it("shows nothing for a phase that ends before the delay", () => {
    const { result, rerender } = renderHook(
      ({ phase }) => useDisplayDelay(phase),
      { initialProps: { phase: "pending" as string | null } },
    );
    act(() => vi.advanceTimersByTime(DISPLAY_DELAY_MS - 1));
    rerender({ phase: null });
    expect(result.current).toBe(false);

    act(() => vi.advanceTimersByTime(DISPLAY_DELAY_MS * 2));
    expect(result.current).toBe(false);
  });

  it("hides again at once when the phase ends", () => {
    const { result, rerender } = renderHook(
      ({ phase }) => useDisplayDelay(phase),
      { initialProps: { phase: "pending" as string | null } },
    );
    act(() => vi.advanceTimersByTime(DISPLAY_DELAY_MS));
    expect(result.current).toBe(true);

    rerender({ phase: null });
    expect(result.current).toBe(false);
  });

  it("restarts the delay when the phase key changes", () => {
    const { result, rerender } = renderHook(
      ({ phase }) => useDisplayDelay(phase),
      { initialProps: { phase: "pending" as string | null } },
    );
    act(() => vi.advanceTimersByTime(DISPLAY_DELAY_MS));
    expect(result.current).toBe(true);

    rerender({ phase: "reconciling" });
    expect(result.current).toBe(false);

    act(() => vi.advanceTimersByTime(DISPLAY_DELAY_MS - 1));
    expect(result.current).toBe(false);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe(true);
  });

  it("starts a fresh delay when the same phase returns after it ended", () => {
    const { result, rerender } = renderHook(
      ({ phase }) => useDisplayDelay(phase),
      { initialProps: { phase: "pending" as string | null } },
    );
    act(() => vi.advanceTimersByTime(DISPLAY_DELAY_MS));
    rerender({ phase: null });
    rerender({ phase: "pending" });
    expect(result.current).toBe(false);

    act(() => vi.advanceTimersByTime(DISPLAY_DELAY_MS));
    expect(result.current).toBe(true);
  });

  it("takes a custom delay", () => {
    const { result } = renderHook(() => useDisplayDelay("pending", 50));
    act(() => vi.advanceTimersByTime(49));
    expect(result.current).toBe(false);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe(true);
  });
});
