import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScratchModal } from "./scratch-modal";

const pushMock = vi.hoisted(() => vi.fn());

type MotionDivProps = ComponentProps<"div"> & {
  animate?: unknown;
  exit?: unknown;
  initial?: unknown;
  transition?: unknown;
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("motion/react", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({ animate, exit, initial, transition, ...props }: MotionDivProps) => (
      <div
        data-motion-animate={String(animate)}
        data-motion-exit={String(exit)}
        data-motion-initial={String(initial)}
        data-motion-transition={transition ? "present" : "absent"}
        {...props}
      />
    ),
  },
  useReducedMotion: () => false,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("ScratchModal", () => {
  it("submits a trimmed title, shows confirmation, and auto-closes", async () => {
    vi.useFakeTimers();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <ScratchModal
        inboxNodeId="inbox-1"
        onClose={onClose}
        onSubmit={onSubmit}
        open={true}
      />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Scratch title" }), {
      target: { value: "  Ship the idea  " },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Capture scratch" }));
    });

    expect(onSubmit).toHaveBeenCalledWith("Ship the idea");
    expect(screen.getByText("Idea captured!")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("captures another idea without closing from the previous success timer", async () => {
    vi.useFakeTimers();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <ScratchModal
        inboxNodeId="inbox-1"
        onClose={onClose}
        onSubmit={onSubmit}
        open={true}
      />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Scratch title" }), {
      target: { value: "First" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Capture scratch" }));
    });

    expect(screen.getByText("Idea captured!")).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Capture another" }));
    });

    const input = screen.getByRole("textbox", { name: "Scratch title" });
    expect(input).toHaveValue("");
    expect(input).toHaveFocus();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onClose).not.toHaveBeenCalled();
  });

  it("opens Inbox and closes from confirmation", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <ScratchModal
        inboxNodeId="inbox-1"
        onClose={onClose}
        onSubmit={onSubmit}
        open={true}
      />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Scratch title" }), {
      target: { value: "First" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Capture scratch" }));

    expect(await screen.findByText("Idea captured!")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open Inbox" }));

    expect(pushMock).toHaveBeenCalledWith("/grid/inbox-1");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("focuses Open Inbox button when success state appears with a known inbox", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <ScratchModal
        inboxNodeId="inbox-1"
        onClose={vi.fn()}
        onSubmit={onSubmit}
        open={true}
      />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Scratch title" }), {
      target: { value: "Focus test" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Capture scratch" }));
    });

    expect(screen.getByText("Idea captured!")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Inbox" })).toHaveFocus();
  });

  it("focuses Capture another button when success state appears without a known inbox", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <ScratchModal
        inboxNodeId={undefined}
        onClose={vi.fn()}
        onSubmit={onSubmit}
        open={true}
      />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Scratch title" }), {
      target: { value: "Focus test" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Capture scratch" }));
    });

    expect(screen.getByText("Idea captured!")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Capture another" })).toHaveFocus();
  });

  it("dismisses on Escape without submitting", () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <ScratchModal
        inboxNodeId="inbox-1"
        onClose={onClose}
        onSubmit={onSubmit}
        open={true}
      />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Scratch title" }), {
      target: { value: "Do not save" },
    });
    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("reports the last successfully captured ID once when auto-close fires", async () => {
    vi.useFakeTimers();
    const onSubmit = vi.fn().mockResolvedValueOnce("s-1").mockResolvedValueOnce("s-2");
    const onClose = vi.fn();
    const onCaptured = vi.fn();

    const view = render(
      <ScratchModal inboxNodeId="inbox-1" onCaptured={onCaptured} onClose={onClose} onSubmit={onSubmit} open={true} />,
    );

    for (const title of ["First", "Second"]) {
      fireEvent.change(screen.getByRole("textbox", { name: "Scratch title" }), {
        target: { value: title },
      });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Capture scratch" }));
      });
      if (title === "First") {
        await act(async () => {
          fireEvent.click(screen.getByRole("button", { name: "Capture another" }));
        });
      }
    }
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledWith();
    expect(onCaptured).toHaveBeenCalledTimes(1);
    expect(onCaptured).toHaveBeenCalledWith("s-2");

    view.rerender(
      <ScratchModal inboxNodeId="inbox-1" onCaptured={onCaptured} onClose={onClose} onSubmit={onSubmit} open={false} />,
    );
    expect(onCaptured).toHaveBeenCalledTimes(1);
  });

  it("reports the captured ID once on Escape and on Open Inbox", async () => {
    for (const close of ["escape", "open-inbox"]) {
      const onSubmit = vi.fn().mockResolvedValue("s-9");
      const onCaptured = vi.fn();
      const onClose = vi.fn();
      const view = render(
        <ScratchModal inboxNodeId="inbox-1" onCaptured={onCaptured} onClose={onClose} onSubmit={onSubmit} open={true} />,
      );
      fireEvent.change(screen.getByRole("textbox", { name: "Scratch title" }), {
        target: { value: "First" },
      });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Capture scratch" }));
      });
      if (close === "escape") fireEvent.keyDown(document, { key: "Escape" });
      else fireEvent.click(screen.getByRole("button", { name: "Open Inbox" }));
      expect(onCaptured).toHaveBeenCalledTimes(1);
      expect(onCaptured).toHaveBeenCalledWith("s-9");
      expect(onClose).toHaveBeenCalledTimes(1);
      view.unmount();
      expect(onCaptured).toHaveBeenCalledTimes(1);
    }
  });

  it("reports the captured ID once when another overlay replaces the surface, without closing", async () => {
    const onSubmit = vi.fn().mockResolvedValue("s-5");
    const onCaptured = vi.fn();
    const onClose = vi.fn();
    const view = render(
      <ScratchModal inboxNodeId="inbox-1" onCaptured={onCaptured} onClose={onClose} onSubmit={onSubmit} open={true} />,
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Scratch title" }), {
      target: { value: "First" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Capture scratch" }));
    });

    view.rerender(
      <ScratchModal inboxNodeId="inbox-1" onCaptured={onCaptured} onClose={onClose} onSubmit={onSubmit} open={false} />,
    );

    expect(onCaptured).toHaveBeenCalledTimes(1);
    expect(onCaptured).toHaveBeenCalledWith("s-5");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("reports nothing when closed without a successful capture", () => {
    const onCaptured = vi.fn();
    const onClose = vi.fn();
    render(
      <ScratchModal
        inboxNodeId="inbox-1"
        onCaptured={onCaptured}
        onClose={onClose}
        onSubmit={vi.fn().mockRejectedValue(new Error("x"))}
        open={true}
      />,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onCaptured).not.toHaveBeenCalled();
  });
});
