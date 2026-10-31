import { act, renderHook } from "@testing-library/react";
import type { DragEndEvent } from "@dnd-kit/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toastCopy } from "@/lib/copy/feedback";
import { WriteRejectedError } from "@/lib/db/write-errors";
import { markReported } from "@/lib/db/write-failure";
import { useDnd } from "@/hooks/use-dnd";

// Task 232: the grid drag handler leaves a refused write to the store's toast, and its own
// blocked-action toasts go through the helper with the SPEC copy.

const store = vi.hoisted(() => ({
  updateNode: vi.fn(),
  updateBit: vi.fn(),
  getNode: vi.fn(),
  getGridOccupancy: vi.fn(),
}));
const showToast = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/datastore", () => ({ getDataStore: () => Promise.resolve(store) }));
vi.mock("@/lib/feedback/toast", () => ({ showToast }));

const node = { id: "n1", type: "node" as const, parentId: undefined, title: "Dragged" };

function dragEnd(active: object, over: object): DragEndEvent {
  return { active: { data: { current: active } }, over: { data: { current: over } } } as unknown as DragEndEvent;
}

const cellDrop = { kind: "grid-cell", parentId: null, x: 3, y: 3 };

beforeEach(() => {
  vi.clearAllMocks();
  store.updateNode.mockResolvedValue(undefined);
  store.updateBit.mockResolvedValue(undefined);
});

describe("useDnd write failures", () => {
  it("drops a refusal the store already reported", async () => {
    store.updateNode.mockRejectedValue(markReported(new WriteRejectedError("cell_taken", { code: "cell_taken" })));
    const { result } = renderHook(() => useDnd());

    await expect(result.current.handleDragEnd(dragEnd(node, cellDrop))).resolves.toBeUndefined();
    expect(showToast).not.toHaveBeenCalled();
  });

  it("moves a card to a top-left cell like to any other cell", async () => {
    const { result } = renderHook(() => useDnd());

    await act(async () => {
      await result.current.handleDragEnd(dragEnd(node, { ...cellDrop, x: 0, y: 0 }));
    });

    expect(store.updateNode).toHaveBeenCalledWith(
      node.id,
      expect.objectContaining({ x: 0, y: 0 }),
    );
  });

  it("still throws an error nobody reported", async () => {
    store.updateNode.mockRejectedValue(new Error("bug"));
    const { result } = renderHook(() => useDnd());

    await expect(result.current.handleDragEnd(dragEnd(node, cellDrop))).rejects.toThrow("bug");
  });

  it("names the dragged Node in the move-into-descendant toast", async () => {
    // The target "t" sits inside the dragged Node "n1".
    store.getNode.mockImplementation(async (id: string) =>
      id === "t" ? { id: "t", parentId: "n1" } : id === "n1" ? { id: "n1", parentId: null } : undefined,
    );
    const { result } = renderHook(() => useDnd());

    await act(async () => {
      await result.current.handleDragEnd(
        dragEnd(node, { kind: "grid-node-drop", targetNodeId: "t", targetNodeTitle: "Target" }),
      );
    });

    expect(showToast).toHaveBeenCalledWith(toastCopy.moveIntoDescendant, "Dragged");
    expect(store.updateNode).not.toHaveBeenCalled();
  });

  it("names the item and the target in the target-grid-full toast", async () => {
    const full = new Set<string>();
    for (let x = 0; x < 18; x += 1) for (let y = 0; y < 9; y += 1) full.add(`${x},${y}`);
    store.getGridOccupancy.mockResolvedValue(full);
    store.getNode.mockResolvedValue({ id: "t", title: "Target" });
    const { result } = renderHook(() => useDnd());

    await act(async () => {
      await result.current.handleDragEnd(
        dragEnd({ ...node, type: "bit" }, { kind: "grid-breadcrumb-drop", targetNodeId: "t", targetNodeTitle: "Target" }),
      );
    });
    await act(async () => {
      await result.current.handleAncestorMoveConfirm();
    });

    expect(showToast).toHaveBeenCalledWith(toastCopy.targetGridFull, "Dragged", "Target");
    expect(store.updateBit).not.toHaveBeenCalled();
  });

  it("calls Home the target when the Grid that is full is L0", async () => {
    const full = new Set<string>();
    for (let x = 0; x < 18; x += 1) for (let y = 0; y < 9; y += 1) full.add(`${x},${y}`);
    store.getGridOccupancy.mockResolvedValue(full);
    const { result } = renderHook(() => useDnd());

    await act(async () => {
      await result.current.handleDragEnd(
        dragEnd(node, { kind: "grid-breadcrumb-drop", targetNodeId: null }),
      );
    });
    await act(async () => {
      await result.current.handleAncestorMoveConfirm();
    });

    expect(showToast).toHaveBeenCalledWith(toastCopy.targetGridFull, "Dragged", "Home");
  });
});

describe("useDnd drag cancel", () => {
  it("clears the active item and the over target without a write", () => {
    const { result } = renderHook(() => useDnd());
    act(() => {
      result.current.handleDragStart({
        active: { data: { current: { id: "n1", type: "node", title: "Dragged" } } },
      } as never);
      result.current.handleDragOver({ over: { id: "grid-cell:1:1" } } as never);
    });
    expect(result.current.activeItem).toMatchObject({ id: "n1" });
    expect(result.current.overTargetId).toBe("grid-cell:1:1");

    act(() => result.current.handleDragCancel());

    expect(result.current.activeItem).toBeNull();
    expect(result.current.overTargetId).toBeNull();
    expect(store.updateNode).not.toHaveBeenCalled();
    expect(store.updateBit).not.toHaveBeenCalled();
  });
});
