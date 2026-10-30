import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toastCopy } from "@/lib/copy/feedback";
import type { Chunk } from "@/types";
import { ChunkPool, type ChunkPoolHandle } from "./chunk-pool";

const createChunkMock = vi.hoisted(() => vi.fn(async () => undefined));
const deleteChunkMock = vi.hoisted(() => vi.fn(async () => undefined));
const showToastMock = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/use-chunk-actions", () => ({
  useChunkActions: () => ({
    createChunk: createChunkMock,
    updateChunk: vi.fn(),
    deleteChunk: deleteChunkMock,
  }),
}));

vi.mock("@/lib/feedback/toast", () => ({ showToast: showToastMock }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function createChunk(overrides: Partial<Chunk> = {}): Chunk {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    title: overrides.title ?? "Chunk",
    description: overrides.description ?? "",
    time: overrides.time ?? null,
    timeAllDay: overrides.timeAllDay ?? false,
    status: overrides.status ?? "incomplete",
    order: overrides.order ?? 0,
    parentId: overrides.parentId ?? "bit-1",
  };
}

describe("ChunkPool", () => {
  it("keeps the step composer row mounted when entering add mode", async () => {
    render(<ChunkPool chunks={[]} bitId="bit-1" />);

    const composerRow = screen.getByTestId("step-composer-row");
    const placeholder = within(composerRow).getByText("Add a step...");
    expect(placeholder).toBeInTheDocument();
    expect(placeholder).toHaveClass("h-[17px]", "leading-[17px]");
    expect(within(composerRow).getByTestId("step-composer-actions")).toBeInTheDocument();

    fireEvent.click(composerRow);

    const input = await within(composerRow).findByPlaceholderText("Step name...");

    const sameComposerRow = screen.getByTestId("step-composer-row");
    expect(sameComposerRow).toBe(composerRow);
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass("h-[17px]", "leading-[17px]");
    expect(
      within(sameComposerRow).getByTestId("step-composer-actions"),
    ).toBeInTheDocument();
  });

  it("creates only one chunk when Enter is followed by blur", async () => {
    const ref = createRef<ChunkPoolHandle>();

    render(<ChunkPool ref={ref} chunks={[]} bitId="bit-1" />);

    act(() => {
      ref.current?.startAdding();
    });

    expect(screen.queryByRole("button", { name: "Add a step" })).not.toBeInTheDocument();

    const input = await screen.findByPlaceholderText("Step name...");
    fireEvent.change(input, { target: { value: "한글 단계" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(createChunkMock).toHaveBeenCalledTimes(1);
    });
    expect(createChunkMock).toHaveBeenCalledWith({
      title: "한글 단계",
      description: "",
      time: null,
      timeAllDay: false,
      order: 0,
      parentId: "bit-1",
    });
  });

  it("says the step is still there when its delete is refused (Task 232)", async () => {
    deleteChunkMock.mockRejectedValueOnce(new Error("refused"));
    render(<ChunkPool chunks={[createChunk({ id: "c1", title: "Write tests" })]} bitId="bit-1" />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Delete "Write tests"/ }));
    });

    expect(showToastMock).toHaveBeenCalledWith(toastCopy.stepDeleteFailed, "Write tests");
    expect(screen.getByRole("button", { name: /Delete "Write tests"/ })).not.toBeDisabled();
  });

  it("renders timed and untimed chunks together in order", () => {
    render(
      <ChunkPool
        chunks={[
          createChunk({
            id: "timed-step",
            title: "Timed step",
            time: new Date(2026, 3, 10, 9, 0).getTime(),
            order: 1,
          }),
          createChunk({
            id: "untimed-step",
            title: "Untimed step",
            time: null,
            order: 0,
          }),
        ]}
        bitId="bit-1"
      />,
    );

    expect(screen.getAllByText("Untimed step")).toHaveLength(1);
    expect(screen.getAllByText("Timed step")).toHaveLength(1);
  });
});
