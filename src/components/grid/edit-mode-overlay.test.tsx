import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useEditModeStore } from "@/stores/edit-mode-store";
import { EditModeOverlay } from "./edit-mode-overlay";

afterEach(() => {
  cleanup();
  useEditModeStore.setState({ isEditMode: false });
});

describe("EditModeOverlay", () => {
  it("stays hidden when edit mode is disabled", () => {
    render(<EditModeOverlay />);

    expect(screen.queryByText("Edit Mode — Press ESC to exit")).not.toBeInTheDocument();
  });

  it("renders the overlay and leaves Escape to the layer order owner in GridRuntime", () => {
    useEditModeStore.setState({ isEditMode: true });

    render(<EditModeOverlay />);

    expect(screen.getByText("Edit Mode — Press ESC to exit")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(useEditModeStore.getState().isEditMode).toBe(true);
  });
});
