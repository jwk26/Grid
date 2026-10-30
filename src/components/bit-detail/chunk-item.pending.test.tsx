import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { baseEntities } from "@/lib/db/boundary-cases";
import { ChunkItem } from "./chunk-item";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("ChunkItem delete (group 3)", () => {
  it("is busy at once, shows the loader after 300 ms and ignores a second press", async () => {
    vi.useFakeTimers();
    let release!: () => void;
    const onDelete = vi.fn(() => new Promise<void>((resolve) => {
      release = resolve;
    }));
    const chunk = { ...baseEntities.chunk, id: "c1", title: "Step one" };
    render(
      <ChunkItem
        chunk={chunk as never}
        isDraggable={false}
        onDelete={onDelete}
        onEdit={vi.fn()}
        onToggle={vi.fn()}
        showConnector={false}
      />,
    );
    const button = screen.getByRole("button", { name: /Delete "Step one"/ });

    await act(async () => {
      fireEvent.click(button);
    });
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toBeDisabled();
    expect(within(button).queryByRole("img")).not.toBeInTheDocument();

    fireEvent.click(button);
    expect(onDelete).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(within(button).getByRole("img", { name: "Deleting…" })).toBeInTheDocument();

    await act(async () => {
      release();
    });
    expect(button).not.toBeDisabled();
  });
});
