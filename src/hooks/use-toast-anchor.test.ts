import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useToastAnchorStore } from "@/stores/toast-anchor-store";
import {
  TOAST_ANCHOR_GAP,
  TOAST_ANCHOR_LEFT,
  TOAST_ANCHOR_TOP,
  getToastOffset,
  useToastAnchor,
} from "./use-toast-anchor";

beforeEach(() => {
  useToastAnchorStore.getState().reset();
});

describe("getToastOffset", () => {
  it("sits at the breadcrumb row, right of the 3rem sidebar, when no breadcrumb is shown", () => {
    expect(getToastOffset(null)).toEqual({
      top: TOAST_ANCHOR_TOP,
      left: TOAST_ANCHOR_LEFT,
    });
    expect(TOAST_ANCHOR_TOP).toBe(12);
    expect(TOAST_ANCHOR_LEFT).toBe(60);
  });

  it("sits below the breadcrumb by the toast gap when one is shown", () => {
    expect(getToastOffset(44)).toEqual({
      top: 44 + TOAST_ANCHOR_GAP,
      left: TOAST_ANCHOR_LEFT,
    });
  });
});

describe("useToastAnchor", () => {
  it("starts at the breadcrumb row with no drag", () => {
    const { result } = renderHook(() => useToastAnchor());

    expect(result.current.offset).toEqual({ top: 12, left: 60 });
    expect(result.current.dragActive).toBe(false);
  });

  it("follows the breadcrumb bottom the store holds", () => {
    const { result } = renderHook(() => useToastAnchor());

    act(() => useToastAnchorStore.getState().setBreadcrumbBottom(44));
    expect(result.current.offset).toEqual({ top: 52, left: 60 });

    act(() => useToastAnchorStore.getState().setBreadcrumbBottom(76));
    expect(result.current.offset).toEqual({ top: 84, left: 60 });

    act(() => useToastAnchorStore.getState().setBreadcrumbBottom(null));
    expect(result.current.offset).toEqual({ top: 12, left: 60 });
  });

  it("reports a Node or Bit drag", () => {
    const { result } = renderHook(() => useToastAnchor());

    act(() => useToastAnchorStore.getState().setDragActive(true));
    expect(result.current.dragActive).toBe(true);

    act(() => useToastAnchorStore.getState().setDragActive(false));
    expect(result.current.dragActive).toBe(false);
  });

  it("keeps the same offset object while nothing changes", () => {
    const { result, rerender } = renderHook(() => useToastAnchor());
    const first = result.current.offset;

    rerender();

    expect(result.current.offset).toBe(first);
  });

  it("returns to the breadcrumb row and no drag on reset", () => {
    const { result } = renderHook(() => useToastAnchor());

    act(() => {
      useToastAnchorStore.getState().setBreadcrumbBottom(44);
      useToastAnchorStore.getState().setDragActive(true);
    });
    act(() => useToastAnchorStore.getState().reset());

    expect(result.current.offset).toEqual({ top: 12, left: 60 });
    expect(result.current.dragActive).toBe(false);
  });
});
