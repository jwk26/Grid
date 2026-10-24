import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, renderHook, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  StatusIcon,
  statusEmphasisProps,
  useStatusPresentation,
} from "@/components/feedback/status-icon";
import { DISPLAY_DELAY_MS } from "@/lib/constants";
import type { ItemStatus } from "@/lib/feedback/item-status";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe("StatusIcon", () => {
  it("shows ? at once for unknown and ! at once for problem", () => {
    const { rerender } = render(
      <StatusIcon status="unknown" sentence="We couldn’t confirm it." />,
    );
    const unknown = screen.getByRole("img", { name: "We couldn’t confirm it." });
    expect(unknown).toHaveAttribute("data-feedback-role", "status-icon");
    expect(unknown).toHaveAttribute("data-status", "unknown");
    expect(unknown).toHaveAttribute("data-glyph", "question");
    expect(unknown).toHaveTextContent("?");

    rerender(<StatusIcon status="problem" sentence="Not added." />);
    const problem = screen.getByRole("img", { name: "Not added." });
    expect(problem).toHaveAttribute("data-status", "problem");
    expect(problem).toHaveAttribute("data-glyph", "exclamation");
    expect(problem).toHaveTextContent("!");
  });

  it("shows nothing for pending until the display delay, then the loader", () => {
    render(<StatusIcon status="pending" sentence="Adding…" />);
    expect(screen.queryByRole("img")).toBeNull();

    advance(DISPLAY_DELAY_MS - 1);
    expect(screen.queryByRole("img")).toBeNull();

    advance(1);
    const loader = screen.getByRole("img", { name: "Adding…" });
    expect(loader).toHaveAttribute("data-status", "pending");
    expect(loader).toHaveAttribute("data-glyph", "loader");
    expect(loader.querySelector("svg")).not.toBeNull();
  });

  it("shows nothing at all for a pending result faster than the delay", () => {
    const { rerender } = render(<StatusIcon status="pending" sentence="Adding…" />);
    advance(DISPLAY_DELAY_MS - 1);
    rerender(<></>);
    advance(DISPLAY_DELAY_MS);
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("keeps ? while reconciling, then shows the loader after the delay", () => {
    render(
      <StatusIcon status="reconciling" sentence="Checking whether it was added…" />,
    );
    const icon = screen.getByRole("img");
    expect(icon).toHaveAttribute("data-status", "reconciling");
    expect(icon).toHaveAttribute("data-glyph", "question");

    advance(DISPLAY_DELAY_MS - 1);
    expect(screen.getByRole("img")).toHaveAttribute("data-glyph", "question");

    advance(1);
    expect(screen.getByRole("img")).toHaveAttribute("data-glyph", "loader");
  });

  it("is not focusable by default and focusable on request", () => {
    const { rerender } = render(<StatusIcon status="problem" sentence="Not added." />);
    expect(screen.getByRole("img")).not.toHaveAttribute("tabindex");

    rerender(<StatusIcon status="problem" sentence="Not added." focusable />);
    expect(screen.getByRole("img")).toHaveAttribute("tabindex", "0");
  });

  it("forwards host props to the icon", () => {
    render(
      <StatusIcon
        status="unknown"
        sentence="We couldn’t confirm it."
        data-testid="icon"
        id="icon-id"
      />,
    );
    expect(screen.getByTestId("icon")).toHaveAttribute("id", "icon-id");
  });

  it("takes a presentation computed by the host", () => {
    function Host() {
      const presentation = useStatusPresentation("problem");
      return (
        <div data-testid="host" {...statusEmphasisProps(presentation)}>
          <StatusIcon presentation={presentation} sentence="Not added." />
        </div>
      );
    }
    render(<Host />);
    expect(screen.getByTestId("host")).toHaveAttribute("data-status-emphasis");
    expect(screen.getByRole("img")).toHaveAttribute("data-glyph", "exclamation");
  });
});

describe("useStatusPresentation and statusEmphasisProps", () => {
  function emphasisOf(status: ItemStatus | null) {
    const { result } = renderHook(() => useStatusPresentation(status, "op-1"));
    return result.current;
  }

  it("gives emphasis to ? and ! only", () => {
    expect(emphasisOf("unknown").emphasis).toBe(true);
    expect(emphasisOf("problem").emphasis).toBe(true);
    expect(emphasisOf("pending").emphasis).toBe(false);
    expect(emphasisOf(null).emphasis).toBe(false);
    expect(statusEmphasisProps(emphasisOf("unknown"))).toEqual({
      "data-status-emphasis": "",
    });
    expect(statusEmphasisProps(emphasisOf("problem"))).toEqual({
      "data-status-emphasis": "",
    });
    expect(statusEmphasisProps(emphasisOf("pending"))).toEqual({});
    expect(statusEmphasisProps(emphasisOf(null))).toEqual({});
  });

  it("keeps the loader free of emphasis once it shows", () => {
    advance(0);
    const { result } = renderHook(() => useStatusPresentation("pending", "op-1"));
    advance(DISPLAY_DELAY_MS);
    expect(result.current.glyph).toBe("loader");
    expect(result.current.emphasis).toBe(false);
  });

  it("reconciling has emphasis at 299ms and none at 300ms", () => {
    const { result } = renderHook(() => useStatusPresentation("reconciling", "op-1"));
    expect(result.current.glyph).toBe("question");
    expect(result.current.emphasis).toBe(true);

    advance(DISPLAY_DELAY_MS - 1);
    expect(result.current.glyph).toBe("question");
    expect(result.current.emphasis).toBe(true);

    advance(1);
    expect(result.current.glyph).toBe("loader");
    expect(result.current.emphasis).toBe(false);
  });

  it("restarts the delay when the operation changes", () => {
    const { result, rerender } = renderHook(
      ({ key }) => useStatusPresentation("pending", key),
      { initialProps: { key: "op-1" } },
    );
    advance(DISPLAY_DELAY_MS);
    expect(result.current.glyph).toBe("loader");

    rerender({ key: "op-2" });
    expect(result.current.glyph).toBeNull();
    advance(DISPLAY_DELAY_MS);
    expect(result.current.glyph).toBe("loader");
  });

  it("restarts the delay when pending turns into reconciling", () => {
    const { result, rerender } = renderHook(
      ({ status }) => useStatusPresentation(status, "op-1"),
      { initialProps: { status: "pending" as ItemStatus } },
    );
    advance(DISPLAY_DELAY_MS);
    expect(result.current.glyph).toBe("loader");

    rerender({ status: "reconciling" });
    expect(result.current.glyph).toBe("question");
    expect(result.current.emphasis).toBe(true);
  });
});

describe("status-icon styles", () => {
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

  it("rotates the loader and holds it static under reduced motion", () => {
    const rotates =
      /\[data-feedback-role="status-icon"\]\[data-glyph="loader"\] svg\s*\{[^}]*animation:\s*status-icon-spin 0\.9s linear infinite/;
    const staticUnderReducedMotion =
      /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\[data-feedback-role="status-icon"\]\[data-glyph="loader"\] svg\s*\{[^}]*animation:\s*none/;
    expect(rotates.test(css)).toBe(true);
    expect(staticUnderReducedMotion.test(css)).toBe(true);
  });
});
