import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentPropsWithoutRef, PropsWithChildren } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

const calendarData = vi.hoisted(() => ({
  nodes: [] as Array<{ id: string; title: string }>,
}));

vi.mock("@/hooks/use-calendar-data", () => ({
  useCalendarData: () => ({ nodes: calendarData.nodes }),
}));

const capturedSelectorProps = vi.hoisted(() => ({
  onChange: undefined as ((id: string) => void) | undefined,
}));

vi.mock("@/components/calendar/parent-node-selector", () => ({
  ParentNodeSelector: (props: { onChange: (id: string) => void; value: string | null }) => {
    capturedSelectorProps.onChange = props.onChange;
    return <div data-testid="parent-node-selector" data-value={props.value ?? ""} />;
  },
}));

const { CreateBitDialog } = await import("@/components/grid/create-bit-dialog");

beforeEach(() => {
  capturedSelectorProps.onChange = undefined;
  calendarData.nodes = [];
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("CreateBitDialog", () => {
  it("renders the Create Bit dialog with the title input", () => {
    render(
      <CreateBitDialog
        onOpenChange={vi.fn()}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
        open={true}
      />,
    );

    expect(screen.getByLabelText("Title")).toBeInTheDocument();
  });

  it("shows the deadline section when requireParent is not set", () => {
    render(
      <CreateBitDialog
        onOpenChange={vi.fn()}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
        open={true}
      />,
    );

    expect(screen.getByText("Deadline")).toBeInTheDocument();
  });

  it("does not render ParentNodeSelector when requireParent is false", () => {
    render(
      <CreateBitDialog
        onOpenChange={vi.fn()}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
        open={true}
      />,
    );

    expect(screen.queryByTestId("parent-node-selector")).not.toBeInTheDocument();
  });

  it("renders ParentNodeSelector when requireParent is true", () => {
    render(
      <CreateBitDialog
        onOpenChange={vi.fn()}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
        open={true}
        requireParent={true}
      />,
    );

    expect(screen.getByTestId("parent-node-selector")).toBeInTheDocument();
  });

  it("hides the deadline section when requireParent is true", () => {
    render(
      <CreateBitDialog
        onOpenChange={vi.fn()}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
        open={true}
        requireParent={true}
      />,
    );

    expect(screen.queryByText("Deadline")).not.toBeInTheDocument();
  });

  it("disables the Create Bit button when no parent is selected", () => {
    render(
      <CreateBitDialog
        onOpenChange={vi.fn()}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
        open={true}
        requireParent={true}
      />,
    );

    expect(screen.getByRole("button", { name: "Create Bit" })).toBeDisabled();
  });

  it("enables the Create Bit button after a parent is selected", () => {
    render(
      <CreateBitDialog
        onOpenChange={vi.fn()}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
        open={true}
        requireParent={true}
      />,
    );

    act(() => {
      capturedSelectorProps.onChange?.("node-x");
    });

    expect(screen.getByRole("button", { name: "Create Bit" })).toBeEnabled();
  });

  it("submits the selected parent id when requireParent is true", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <CreateBitDialog
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
        open={true}
        requireParent={true}
      />,
    );

    act(() => {
      capturedSelectorProps.onChange?.("node-x");
    });

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Test Bit" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Bit" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Test Bit",
          parentId: "node-x",
        }),
      );
    });
  });
  it("submits the selected parent's title with its id", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    calendarData.nodes = [
      { id: "node-w", title: "Other" },
      { id: "node-x", title: "Projects" },
    ];

    render(
      <CreateBitDialog
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
        open={true}
        requireParent={true}
      />,
    );

    act(() => {
      capturedSelectorProps.onChange?.("node-x");
    });
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Test Bit" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Bit" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ parentId: "node-x", parentTitle: "Projects" }),
      );
    });
  });

  it("submits a null parent title when the selected parent is not in the node list", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <CreateBitDialog
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
        open={true}
        requireParent={true}
      />,
    );

    act(() => {
      capturedSelectorProps.onChange?.("node-x");
    });
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Test Bit" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Bit" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ parentId: "node-x", parentTitle: null }),
      );
    });
  });

  it("sends no parent fields when requireParent is not set", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <CreateBitDialog
        defaultParentId="node-x"
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
        open={true}
      />,
    );

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Test Bit" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Bit" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    const values = onSubmit.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(values).not.toHaveProperty("parentId");
    expect(values).not.toHaveProperty("parentTitle");
  });

  it("stays open with the typed title when the submit leaves an error", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();
    const reason = "“Projects” has no empty cell. Move or delete an item to make room.";

    const { rerender } = render(
      <CreateBitDialog
        defaultParentId="node-x"
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
        open={true}
      />,
    );

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Test Bit" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Bit" }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    rerender(
      <CreateBitDialog
        defaultParentId="node-x"
        error={reason}
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
        open={true}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(reason);
    expect(screen.getByLabelText("Title")).toHaveValue("Test Bit");
    expect(screen.getByRole("button", { name: "Create Bit" })).toBeEnabled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
