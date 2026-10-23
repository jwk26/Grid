import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  StatusAnnouncement,
  useStatusAnnouncement,
} from "@/components/feedback/status-announcement";

afterEach(cleanup);

describe("StatusAnnouncement", () => {
  it("is a hidden polite status region that is empty by default", () => {
    render(<StatusAnnouncement announcement={null} />);
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toHaveAttribute("aria-atomic", "true");
    expect(region).toHaveClass("sr-only");
    expect(region).toBeEmptyDOMElement();
  });

  it("holds the announced sentence", () => {
    render(<StatusAnnouncement announcement={{ id: 1, text: "Added." }} />);
    expect(screen.getByRole("status")).toHaveTextContent("Added.");
  });

  it("remounts the text node for the same sentence announced twice", () => {
    const { rerender } = render(
      <StatusAnnouncement announcement={{ id: 1, text: "Saved." }} />,
    );
    const first = screen.getByText("Saved.");
    rerender(<StatusAnnouncement announcement={{ id: 2, text: "Saved." }} />);
    expect(screen.getByText("Saved.")).not.toBe(first);
  });
});

describe("useStatusAnnouncement", () => {
  it("issues a new id for every announcement", () => {
    const { result } = renderHook(() => useStatusAnnouncement());
    expect(result.current.announcement).toBeNull();

    act(() => result.current.announce("Added."));
    expect(result.current.announcement).toEqual({ id: 1, text: "Added." });

    act(() => result.current.announce("Added."));
    expect(result.current.announcement).toEqual({ id: 2, text: "Added." });
  });
});
