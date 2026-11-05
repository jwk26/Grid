import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { GridUnavailable } from "./grid-unavailable";
import { GRID_UNAVAILABLE } from "@/lib/copy/feedback";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
  push.mockClear();
});

describe("GridUnavailable", () => {
  it("draws the title as the page's h1, the reason and one button, with the app-frame part markers", () => {
    const { container } = render(<GridUnavailable isLayerOpen={() => false} recheckKey={0} />);
    expect(screen.getByRole("heading", { level: 1, name: GRID_UNAVAILABLE.title })).toHaveAttribute(
      "data-app-role",
      "app-frame-title",
    );
    expect(screen.getByText(GRID_UNAVAILABLE.reason)).toHaveAttribute("data-app-role", "app-frame-reason");
    expect(screen.getByRole("button", { name: "Go to Home" }).parentElement).toHaveAttribute(
      "data-app-role",
      "app-frame-action",
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute("data-app-role", "grid-unavailable");
    expect(root.tagName).not.toBe("MAIN");
    expect(root).toHaveClass("triage-shell", "triage-shell--frame");
    expect(container.querySelector("main")).toBeNull();
  });

  it("moves focus to Go to Home when it appears and no layer is open", () => {
    render(<GridUnavailable isLayerOpen={() => false} recheckKey={0} />);
    expect(screen.getByRole("button", { name: "Go to Home" })).toHaveFocus();
  });

  it("navigates to / on Go to Home", () => {
    render(<GridUnavailable isLayerOpen={() => false} recheckKey={0} />);
    fireEvent.click(screen.getByRole("button", { name: "Go to Home" }));
    expect(push).toHaveBeenCalledWith("/");
  });

  it("keeps the focus of an open tracked layer, then takes it when the layer is gone and the rule is asked again", () => {
    let open = true;
    const { rerender } = render(<GridUnavailable isLayerOpen={() => open} recheckKey={0} />);
    expect(screen.getByRole("button", { name: "Go to Home" })).not.toHaveFocus();
    open = false;
    rerender(<GridUnavailable isLayerOpen={() => open} recheckKey={1} />);
    expect(screen.getByRole("button", { name: "Go to Home" })).toHaveFocus();
  });

  it("waits for a dialog in the DOM to unmount, even one already marked closed", async () => {
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("data-state", "open");
    document.body.appendChild(dialog);
    render(<GridUnavailable isLayerOpen={() => false} recheckKey={0} />);
    const button = screen.getByRole("button", { name: "Go to Home" });
    expect(button).not.toHaveFocus();
    await act(async () => {
      dialog.setAttribute("data-state", "closed");
      await Promise.resolve();
    });
    expect(button).not.toHaveFocus();
    await act(async () => {
      dialog.remove();
      await Promise.resolve();
    });
    expect(button).toHaveFocus();
  });

  it("does not take focus back after it has moved it", async () => {
    render(<GridUnavailable isLayerOpen={() => false} recheckKey={0} />);
    const other = document.createElement("button");
    document.body.appendChild(other);
    other.focus();
    await act(async () => {
      document.body.appendChild(document.createElement("div"));
      await Promise.resolve();
    });
    expect(other).toHaveFocus();
  });
});
