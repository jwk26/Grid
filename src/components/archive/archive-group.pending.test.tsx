import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ArchiveGroup } from "./archive-group";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const group = {
  parentNodeId: "p",
  parentNodeTitle: "Parent",
  items: [{ type: "bit" as const, id: "b1", title: "Old bit", archivedAt: 1_700_000_000_000 }],
};

describe("Archive restore (group 3)", () => {
  it("shows busy at once and the loader only after 300 ms", async () => {
    vi.useFakeTimers();
    render(<ArchiveGroup group={group} onUnarchive={vi.fn()} restoringIds={new Set(["b1"])} />);
    const restore = screen.getByRole("button", { name: "Restore" });

    expect(restore).toHaveAttribute("aria-busy", "true");
    expect(restore).toBeDisabled();
    expect(within(restore).queryByRole("img")).not.toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(within(restore).getByRole("img", { name: "Restoring…" })).toBeInTheDocument();
  });

  it("is plain when nothing is restoring", () => {
    render(<ArchiveGroup group={group} onUnarchive={vi.fn()} restoringIds={new Set()} />);
    const restore = screen.getByRole("button", { name: "Restore" });
    expect(restore).toHaveAttribute("aria-busy", "false");
    expect(restore).not.toBeDisabled();
  });
});
