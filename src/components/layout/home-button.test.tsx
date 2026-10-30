import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HomeButton } from "./home-button";

afterEach(cleanup);

describe("HomeButton", () => {
  it("navigates to / through the given departure-guarded navigate", () => {
    const onNavigate = vi.fn();
    render(<HomeButton isCurrent={false} onNavigate={onNavigate} />);

    fireEvent.click(screen.getByRole("button", { name: "Home" }));

    expect(onNavigate).toHaveBeenCalledWith("/");
    expect(screen.getByRole("button", { name: "Home" })).not.toHaveAttribute("aria-current");
  });

  it("is the current page on L0", () => {
    render(<HomeButton isCurrent onNavigate={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Home" })).toHaveAttribute("aria-current", "page");
  });

  it("passes pointer and focus to the reveal handlers and shows the landing emphasis", () => {
    const handlers = {
      onPointerEnter: vi.fn(),
      onPointerLeave: vi.fn(),
      onPointerMove: vi.fn(),
      onFocus: vi.fn(),
      onBlur: vi.fn(),
    };
    const { rerender } = render(
      <HomeButton isCurrent={false} onNavigate={vi.fn()} revealHandlers={handlers} />,
    );
    const button = screen.getByRole("button", { name: "Home" });

    fireEvent.pointerEnter(button);
    fireEvent.pointerLeave(button);
    fireEvent.focus(button);
    fireEvent.blur(button);

    expect(handlers.onPointerEnter).toHaveBeenCalled();
    expect(handlers.onPointerLeave).toHaveBeenCalled();
    expect(handlers.onFocus).toHaveBeenCalled();
    expect(handlers.onBlur).toHaveBeenCalled();
    expect(button).not.toHaveAttribute("data-landing");

    rerender(<HomeButton isCurrent={false} landing onNavigate={vi.fn()} revealHandlers={handlers} />);
    expect(button).toHaveAttribute("data-landing", "true");
  });
});
