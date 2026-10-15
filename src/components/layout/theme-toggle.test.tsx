import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "./theme-toggle";

const theme = vi.hoisted(() => ({
  resolvedTheme: undefined as string | undefined,
  setTheme: vi.fn(),
}));

vi.mock("next-themes", () => ({ useTheme: () => theme }));

beforeEach(() => {
  theme.resolvedTheme = undefined;
  theme.setTheme.mockClear();
});

afterEach(cleanup);

describe("ThemeToggle", () => {
  it.each(["dark", "light"])(
    "hydrates unknown server theme into %s without replacing markup",
    async (resolvedTheme) => {
      const container = document.createElement("div");
      container.innerHTML = renderToString(<ThemeToggle />);
      const serverMarkup = container.innerHTML;
      const button = container.querySelector("button");
      const recoverableError = vi.fn();
      theme.resolvedTheme = resolvedTheme;

      const root = hydrateRoot(container, <ThemeToggle />, {
        onRecoverableError: recoverableError,
      });
      try {
        await act(async () => {});
        expect(recoverableError).not.toHaveBeenCalled();
        expect(container.innerHTML).toBe(serverMarkup);
        expect(container.querySelector("button")).toBe(button);
      } finally {
        await act(async () => root.unmount());
      }
    },
  );

  it("uses the current resolved theme for successive toggles and retains focus", () => {
    theme.resolvedTheme = "light";
    const { rerender } = render(<ThemeToggle className="hover:bg-accent" />);
    const button = screen.getByRole("button", { name: "Toggle theme" });
    button.focus();
    fireEvent.click(button);
    expect(theme.setTheme).toHaveBeenLastCalledWith("dark");

    theme.resolvedTheme = "dark";
    rerender(<ThemeToggle className="hover:bg-accent" />);
    fireEvent.click(button);
    expect(theme.setTheme).toHaveBeenLastCalledWith("light");
    expect(button).toHaveFocus();
    expect(button).toHaveClass("hover:bg-accent");
  });
});
