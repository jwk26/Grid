import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GridCell } from "./grid-cell";

afterEach(() => {
  cleanup();
});

describe("GridCell", () => {
  it("shows a plus affordance when an empty cell is dragged over outside edit mode", () => {
    const { container } = render(
      createElement(GridCell as never, {
        isDragOver: true,
        isEditMode: false,
        isEmpty: true,
        x: 0,
        y: 0,
      }),
    );

    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("uses the shared node footprint for the drag-over affordance", () => {
    const { container } = render(
      <GridCell
        isDragOver={true}
        isEditMode={false}
        isEmpty={true}
        x={0}
        y={0}
      />,
    );

    const affordance = container.querySelector("svg")?.parentElement;

    expect(affordance).toHaveClass(
      "h-[var(--grid-node-size)]",
      "w-[var(--grid-node-size)]",
      "max-h-full",
      "max-w-full",
    );
  });

  it("keeps the edit-mode add button behavior unchanged", () => {
    const onAddClick = vi.fn();
    const { getByRole } = render(
      <GridCell
        isEditMode={true}
        isEmpty={true}
        onAddClick={onAddClick}
        x={0}
        y={0}
      />,
    );

    fireEvent.click(getByRole("button", { name: "Add item" }));

    expect(onAddClick).toHaveBeenCalledTimes(1);
  });

  it("applies theme-grid-line class for CSS-variable-driven borders", () => {
    const { container } = render(
      <GridCell
        isDragOver={false}
        isEditMode={false}
        isEmpty={false}
        x={0}
        y={0}
      />,
    );

    expect(container.firstChild).toHaveClass("theme-grid-line");
  });
});
