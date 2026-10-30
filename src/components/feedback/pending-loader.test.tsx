import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PendingLoader } from "./pending-loader";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("PendingLoader", () => {
  it("shows nothing before the display delay and the loader after it", () => {
    render(<PendingLoader busy sentence="Deleting…" />);
    expect(screen.queryByRole("img", { name: "Deleting…" })).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(screen.queryByRole("img", { name: "Deleting…" })).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByRole("img", { name: "Deleting…" })).toHaveAttribute("data-glyph", "loader");
  });

  it("shows nothing when not busy", () => {
    render(<PendingLoader busy={false} sentence="Deleting…" />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
