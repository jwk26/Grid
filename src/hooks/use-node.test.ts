import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Node } from "@/types";

type Observer = { next: (value: unknown) => void; error?: (error: unknown) => void };

const subscriptions = vi.hoisted(
  () => [] as Array<{ read: (store: unknown) => Promise<unknown>; observer: Observer; closed: boolean }>,
);

vi.mock("@/lib/db/datastore", () => ({
  liveRead: (read: (store: unknown) => Promise<unknown>) => ({
    subscribe(observer: Observer) {
      const entry = { read, observer, closed: false };
      subscriptions.push(entry);
      return {
        unsubscribe() {
          entry.closed = true;
        },
      };
    },
  }),
}));

import { useNode, useRoutedNode } from "./use-node";

function nodeFixture(id: string, patch: Partial<Node> = {}): Node {
  return { id, title: id, deletedAt: null, archivedAt: null, ...patch } as Node;
}

function emit(index: number, value: unknown) {
  act(() => subscriptions[index].observer.next(value));
}

beforeEach(() => {
  subscriptions.length = 0;
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("useRoutedNode", () => {
  it("is pending until the first emission for the routed id", () => {
    const { result } = renderHook(() => useRoutedNode("a"));
    expect(result.current).toEqual({ status: "pending", node: null });
  });

  it("reports found with the node", () => {
    const { result } = renderHook(() => useRoutedNode("a"));
    emit(0, nodeFixture("a"));
    expect(result.current.status).toBe("found");
    expect(result.current.node?.id).toBe("a");
  });

  it("reports missing when the read finds no node", () => {
    const { result } = renderHook(() => useRoutedNode("a"));
    emit(0, undefined);
    expect(result.current).toEqual({ status: "missing", node: null });
  });

  it("is pending again for a new id and never shows the previous node", () => {
    const { result, rerender } = renderHook(({ id }) => useRoutedNode(id), {
      initialProps: { id: "a" },
    });
    emit(0, nodeFixture("a"));
    rerender({ id: "b" });
    expect(result.current).toEqual({ status: "pending", node: null });
    expect(subscriptions[0].closed).toBe(true);
    emit(1, nodeFixture("b"));
    expect(result.current.status).toBe("found");
    expect(result.current.node?.id).toBe("b");
  });

  it("is pending when returning to an id (a -> b -> a) until the new emission", () => {
    const { result, rerender } = renderHook(({ id }) => useRoutedNode(id), {
      initialProps: { id: "a" },
    });
    emit(0, nodeFixture("a", { deletedAt: 5 }));
    rerender({ id: "b" });
    rerender({ id: "a" });
    expect(result.current).toEqual({ status: "pending", node: null });
    emit(2, nodeFixture("a"));
    expect(result.current.status).toBe("found");
    expect(result.current.node?.deletedAt).toBeNull();
  });

  it("ignores a late emission of a previous id", () => {
    const { result, rerender } = renderHook(({ id }) => useRoutedNode(id), {
      initialProps: { id: "a" },
    });
    rerender({ id: "b" });
    emit(0, nodeFixture("a"));
    expect(result.current.status).toBe("pending");
  });

  it("keeps a trashed node as found; availability is the caller's rule", () => {
    const { result } = renderHook(() => useRoutedNode("a"));
    emit(0, nodeFixture("a", { deletedAt: 5 }));
    expect(result.current.status).toBe("found");
  });

  it("stays pending after a read error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { result } = renderHook(() => useRoutedNode("a"));
    act(() => subscriptions[0].observer.error?.(new Error("boom")));
    expect(result.current.status).toBe("pending");
    expect(spy).toHaveBeenCalled();
  });

  it("goes from found to missing when a later emission has no node", () => {
    const { result } = renderHook(() => useRoutedNode("a"));
    emit(0, nodeFixture("a"));
    emit(0, undefined);
    expect(result.current.status).toBe("missing");
  });
});

describe("useNode", () => {
  it("keeps today's behavior: null before the read, the previous node until the next arrives", () => {
    const { result, rerender } = renderHook(({ id }) => useNode(id), {
      initialProps: { id: "a" },
    });
    expect(result.current).toBeNull();
    emit(0, nodeFixture("a"));
    rerender({ id: "b" });
    expect(result.current?.id).toBe("a");
  });
});
