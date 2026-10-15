import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useQuickCaptureStore } from "@/stores/quick-capture-store";
import { QuickCaptureOverlays } from "./quick-capture-overlays";

type MotionDivProps = ComponentProps<"div"> & {
  animate?: unknown;
  exit?: unknown;
  initial?: unknown;
};

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("motion/react", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({ animate, exit, initial, ...props }: MotionDivProps) => {
      void animate;
      void exit;
      void initial;
      return <div {...props} />;
    },
  },
  useReducedMotion: () => false,
}));
vi.mock("@/components/quick-capture/command-palette", () => ({
  CommandPalette: () => null,
}));
vi.mock("@/hooks/use-inbox", () => ({
  useInbox: () => ({
    inboxNodeId: "inbox-1",
    createScratchBit: vi.fn().mockResolvedValue("s-1"),
  }),
}));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  useQuickCaptureStore.setState({ activeOverlay: null });
});

describe("QuickCaptureOverlays auto-close timer", () => {
  it("is not restarted by a re-render during the success state", async () => {
    vi.useFakeTimers();
    useQuickCaptureStore.setState({ activeOverlay: "scratch" });
    const view = render(<QuickCaptureOverlays />);

    fireEvent.change(screen.getByRole("textbox", { name: "Scratch title" }), {
      target: { value: "Idea" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Capture scratch" }));
    });
    expect(screen.getByText("Idea captured!")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    view.rerender(<QuickCaptureOverlays />);
    act(() => {
      vi.advanceTimersByTime(1100);
    });

    expect(useQuickCaptureStore.getState().activeOverlay).toBeNull();
  });
});
