import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentPropsWithoutRef, PropsWithChildren } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

type DivProps = PropsWithChildren<ComponentPropsWithoutRef<"div">>;

function MockDialog({
  children,
  open,
}: PropsWithChildren<{ open: boolean }>) {
  return open ? <div>{children}</div> : null;
}

function MockDiv({ children, ...props }: DivProps) {
  return <div {...props}>{children}</div>;
}

vi.mock("@/components/ui/dialog", () => ({
  Dialog: MockDialog,
  DialogContent: MockDiv,
  DialogDescription: MockDiv,
  DialogFooter: MockDiv,
  DialogHeader: MockDiv,
  DialogTitle: MockDiv,
}));

vi.mock("@/components/shared/date-first-deadline-picker", () => ({
  DateFirstDeadlinePicker: ({
    onChange,
  }: {
    onChange: (value: { deadline: number | null; deadlineAllDay: boolean }) => void;
  }) => (
    <div data-testid="deadline-picker">
      <button
        onClick={() =>
          onChange({
            deadline: new Date(2026, 3, 22, 9, 30).getTime(),
            deadlineAllDay: false,
          })
        }
        type="button"
      >
        Set deadline
      </button>
    </div>
  ),
}));

vi.mock("@/lib/constants/color-palette", () => ({
  getRandomColor: () => "#3b82f6",
}));

const { CreateNodeDialog } = await import("@/components/grid/create-node-dialog");

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("CreateNodeDialog", () => {
  it("omits the deadline section at level 0", () => {
    render(
      <CreateNodeDialog
        level={0}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
        open={true}
      />,
    );

    expect(screen.queryByText("Deadline")).not.toBeInTheDocument();
    expect(screen.queryByTestId("deadline-picker")).not.toBeInTheDocument();
  });

  it("shows the deadline section at level 1", () => {
    render(
      <CreateNodeDialog
        level={1}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
        open={true}
      />,
    );

    expect(screen.getByText("Deadline")).toBeInTheDocument();
    expect(screen.getByTestId("deadline-picker")).toBeInTheDocument();
  });

  it("submits the selected deadline values", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const selectedDeadline = new Date(2026, 3, 22, 9, 30).getTime();

    render(
      <CreateNodeDialog
        level={1}
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
        open={true}
      />,
    );

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Plan launch" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Set deadline" }));
    fireEvent.click(screen.getByRole("button", { name: "Create Node" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Plan launch",
          deadline: selectedDeadline,
          deadlineAllDay: false,
        }),
      );
    });
  });
  it("stays open with the typed title when the submit leaves an error", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();
    const reason = "“Home” has no empty cell. Move or delete an item to make room.";

    const { rerender } = render(
      <CreateNodeDialog
        level={0}
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
        open={true}
      />,
    );

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Plan launch" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Node" }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    rerender(
      <CreateNodeDialog
        error={reason}
        level={0}
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
        open={true}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(reason);
    expect(screen.getByLabelText("Title")).toHaveValue("Plan launch");
    expect(screen.getByRole("button", { name: "Create Node" })).toBeEnabled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
