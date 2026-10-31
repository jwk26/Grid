import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getGridBreadcrumbDropId, getGridCellDropId } from "@/lib/grid-dnd";
import { GridView } from "./grid-view";

const dndContext = vi.hoisted(() => ({
  value: { active: null, over: null } as { active: unknown; over: { id: string; data?: { current: unknown } } | null },
}));

vi.mock("@dnd-kit/core", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@dnd-kit/core")>()),
  useDndContext: () => dndContext.value,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/grid/parent-node",
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/hooks/use-grid-data", () => ({
  useGridData: () => ({ nodes: [], bits: [], isLoading: false }),
}));

afterEach(() => {
  cleanup();
  dndContext.value = { active: null, over: null };
});

function renderGrid() {
  return render(<GridView level={1} parentId="parent-node" />).container.firstChild as HTMLElement;
}

describe("GridView drag layer", () => {
  it("marks the grid while the dragged item is over a breadcrumb segment, and only then", () => {
    dndContext.value = { active: { id: "draggable-n1" }, over: { id: getGridBreadcrumbDropId("some-node") } };
    expect(renderGrid()).toHaveAttribute("data-over-breadcrumb", "true");
    cleanup();

    dndContext.value = { active: { id: "draggable-n1" }, over: { id: getGridBreadcrumbDropId(null) } };
    expect(renderGrid()).toHaveAttribute("data-over-breadcrumb", "true");
    cleanup();

    dndContext.value = {
      active: { id: "draggable-b1", data: { current: { type: "bit" } } },
      over: { id: getGridBreadcrumbDropId(null), data: { current: { targetNodeId: null } } },
    };
    expect(renderGrid()).not.toHaveAttribute("data-over-breadcrumb");
    cleanup();

    dndContext.value = { active: { id: "draggable-n1" }, over: { id: getGridCellDropId("parent-node", 1, 1) } };
    expect(renderGrid()).not.toHaveAttribute("data-over-breadcrumb");
    cleanup();

    dndContext.value = { active: { id: "draggable-n1" }, over: null };
    expect(renderGrid()).not.toHaveAttribute("data-over-breadcrumb");
    cleanup();

    dndContext.value = { active: null, over: { id: getGridBreadcrumbDropId("some-node") } };
    expect(renderGrid()).not.toHaveAttribute("data-over-breadcrumb");
  });
});
