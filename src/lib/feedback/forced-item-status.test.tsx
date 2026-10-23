import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  FORCED_STATES,
  clearForcedItemStates,
  forcedItemKeys,
  itemStatusOfForcedState,
  registerForcedItemStates,
  useForcedItemStatus,
} from "@/lib/feedback/forced-item-status";

afterEach(() => {
  cleanup();
  clearForcedItemStates();
});

describe("itemStatusOfForcedState", () => {
  it("maps the eight forced states to item statuses", () => {
    expect(FORCED_STATES).toHaveLength(8);
    expect(itemStatusOfForcedState("delayed-pending")).toBe("pending");
    expect(itemStatusOfForcedState("reconciling")).toBe("reconciling");
    expect(itemStatusOfForcedState("unknown")).toBe("unknown");
    for (const state of ["not-applied", "rejected", "conflict", "integrity"] as const) {
      expect(itemStatusOfForcedState(state)).toBe("problem");
    }
  });

  it("gives editor offline no item status", () => {
    expect(itemStatusOfForcedState("editor-offline")).toBeNull();
  });
});

describe("forcedItemKeys", () => {
  it("builds one distinct key per item kind", () => {
    const keys = [
      forcedItemKeys.add("s1"),
      forcedItemKeys.scratchTitleEditor("s1"),
      forcedItemKeys.breakdownEditor("b1"),
      forcedItemKeys.breakdown("b1"),
      forcedItemKeys.candidate("c1"),
      forcedItemKeys.newly("node", "n1"),
      forcedItemKeys.newly("bit", "n1"),
    ];
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("useForcedItemStatus", () => {
  it("is null for every item until the development panel registers", () => {
    const { result } = renderHook(() =>
      useForcedItemStatus(forcedItemKeys.add("s1")),
    );
    expect(result.current).toBeNull();
  });

  it("is null for a null key", () => {
    registerForcedItemStates({ [forcedItemKeys.add("s1")]: "unknown" });
    const { result } = renderHook(() => useForcedItemStatus(null));
    expect(result.current).toBeNull();
  });

  it("returns the registered state and status for the item only", () => {
    const { result: forced } = renderHook(() =>
      useForcedItemStatus(forcedItemKeys.breakdown("b1")),
    );
    const { result: other } = renderHook(() =>
      useForcedItemStatus(forcedItemKeys.breakdown("b2")),
    );

    act(() =>
      registerForcedItemStates({ [forcedItemKeys.breakdown("b1")]: "rejected" }),
    );
    expect(forced.current).toEqual({ state: "rejected", status: "problem" });
    expect(other.current).toBeNull();
  });

  it("follows later registrations and clearing", () => {
    const { result } = renderHook(() =>
      useForcedItemStatus(forcedItemKeys.candidate("c1")),
    );
    act(() =>
      registerForcedItemStates({ [forcedItemKeys.candidate("c1")]: "unknown" }),
    );
    expect(result.current?.status).toBe("unknown");

    act(() =>
      registerForcedItemStates({
        [forcedItemKeys.candidate("c1")]: "editor-offline",
      }),
    );
    expect(result.current).toEqual({ state: "editor-offline", status: null });

    act(() => clearForcedItemStates());
    expect(result.current).toBeNull();
  });

  it("keeps the same object for an unchanged state", () => {
    const key = forcedItemKeys.add("s1");
    registerForcedItemStates({ [key]: "unknown" });
    const { result } = renderHook(() => useForcedItemStatus(key));
    const before = result.current;

    act(() =>
      registerForcedItemStates({
        [key]: "unknown",
        [forcedItemKeys.add("s2")]: "conflict",
      }),
    );
    expect(result.current).toBe(before);
  });
});
