import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  type ComponentPropsWithoutRef,
  type PropsWithChildren,
  type ReactElement,
} from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Node } from "@/types";

const useNodeMock = vi.hoisted(() => vi.fn());
const updateNodeMock = vi.hoisted(() => vi.fn(async () => undefined));
const getDataStoreMock = vi.hoisted(() => vi.fn());
const getChildDeadlineConflictsMock = vi.hoisted(
  () => vi.fn(async (): Promise<Array<{ id: string }>> => []),
);

type DeadlineValue = { deadline: number | null; deadlineAllDay: boolean };
type DivProps = PropsWithChildren<ComponentPropsWithoutRef<"div">>;
type ButtonProps = PropsWithChildren<ComponentPropsWithoutRef<"button">>;

type PopoverContextValue = {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
};

const PopoverContext = createContext<PopoverContextValue | null>(null);

function MockPopover({
  children,
  open = false,
  onOpenChange,
}: PropsWithChildren<{ open?: boolean; onOpenChange?: (open: boolean) => void }>) {
  return (
    <PopoverContext.Provider value={{ open, onOpenChange }}>
      {children}
    </PopoverContext.Provider>
  );
}

function MockPopoverTrigger({
  children,
  asChild,
}: PropsWithChildren<{ asChild?: boolean }>) {
  const context = useContext(PopoverContext);
  const child = Children.only(children);

  if (asChild && isValidElement(child)) {
    const element = child as ReactElement<ComponentPropsWithoutRef<"button">>;
    return cloneElement(element, {
      ...element.props,
      onClick: (event) => {
        element.props.onClick?.(event);
        context?.onOpenChange?.(!context.open);
      },
    });
  }

  return <>{children}</>;
}

function MockPopoverContent({ children, ...props }: DivProps) {
  const context = useContext(PopoverContext);

  if (!context?.open) {
    return null;
  }

  return (
    <div data-testid="popover-content" {...props}>
      {children}
    </div>
  );
}

function MockButton({ children, type = "button", ...props }: ButtonProps) {
  return (
    <button type={type} {...props}>
      {children}
    </button>
  );
}

vi.mock("@/components/ui/popover", () => ({
  Popover: MockPopover,
  PopoverTrigger: MockPopoverTrigger,
  PopoverContent: MockPopoverContent,
}));

vi.mock("@/hooks/use-node", () => ({
  useNode: useNodeMock,
}));

vi.mock("@/hooks/use-node-actions", () => ({
  useNodeActions: () => ({
    updateNode: updateNodeMock,
    getChildDeadlineConflicts: getChildDeadlineConflictsMock,
  }),
}));

vi.mock("@/lib/db/datastore", () => ({
  getDataStore: getDataStoreMock,
}));

vi.mock("@/components/shared/date-first-deadline-picker", () => ({
  DateFirstDeadlinePicker: ({
    onChange,
    onClear,
    value,
  }: {
    value: DeadlineValue;
    onChange: (value: DeadlineValue) => void;
    onClear?: () => void;
  }) => (
    <div data-testid="deadline-picker">
      <div data-testid="picker-value">
        {JSON.stringify(value)}
      </div>
      <MockButton
        aria-label="Set all-day deadline"
        onClick={() => onChange({
          deadline: new Date(2026, 3, 15, 0, 0).getTime(),
          deadlineAllDay: true,
        })}
      >
        Set all-day deadline
      </MockButton>
      <MockButton
        aria-label="Set timed deadline"
        onClick={() => onChange({
          deadline: new Date(2026, 3, 15, 15, 0).getTime(),
          deadlineAllDay: false,
        })}
      >
        Set timed deadline
      </MockButton>
      <MockButton aria-label="Clear deadline" onClick={() => onClear?.()}>
        Clear deadline
      </MockButton>
    </div>
  ),
}));

vi.mock("@/components/shared/deadline-conflict-modal", () => ({
  DeadlineConflictModal: ({
    open,
    onKeepChild,
    onUpdateParent,
    parentDeadline,
    parentDeadlineAllDay,
  }: {
    open: boolean;
    parentDeadline: number;
    parentDeadlineAllDay?: boolean;
    onUpdateParent: () => void | Promise<void>;
    onKeepChild: () => void;
  }) =>
    open ? (
      <div
        data-all-day={String(parentDeadlineAllDay ?? false)}
        data-parent-deadline={String(parentDeadline)}
        data-testid="deadline-conflict-modal"
      >
        <MockButton aria-label="Cancel change" onClick={onKeepChild}>
          Cancel change
        </MockButton>
        <MockButton aria-label="Update parent" onClick={() => void onUpdateParent()}>
          Update parent
        </MockButton>
      </div>
    ) : null,
}));

const { BreadcrumbDeadline } = await import("@/components/layout/breadcrumb-deadline");

function createNode(overrides: Partial<Node> = {}): Node {
  return {
    id: overrides.id ?? "node-1",
    title: overrides.title ?? "Roadmap",
    color: overrides.color ?? "hsl(221, 83%, 53%)",
    icon: overrides.icon ?? "Folder",
    deadline: overrides.deadline !== undefined
      ? overrides.deadline
      : new Date(2026, 3, 15, 15, 0).getTime(),
    deadlineAllDay: overrides.deadlineAllDay ?? false,
    mtime: overrides.mtime ?? 1,
    createdAt: overrides.createdAt ?? 1,
    parentId: overrides.parentId ?? null,
    level: overrides.level ?? 1,
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    deletedAt: overrides.deletedAt ?? null,
    archivedAt: overrides.archivedAt ?? null,
    systemRole: overrides.systemRole ?? null,
    hiddenFromGrid: overrides.hiddenFromGrid ?? false,
    version: overrides.version ?? 1,
    pastDeadlineDismissed: overrides.pastDeadlineDismissed ?? false,
  };
}

beforeEach(() => {
  getDataStoreMock.mockResolvedValue({
    getChildDeadlineConflicts: getChildDeadlineConflictsMock,
  });
  getChildDeadlineConflictsMock.mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("BreadcrumbDeadline", () => {
  it("renders nothing when the node has no deadline", () => {
    useNodeMock.mockReturnValue(createNode({ deadline: null }));

    const { container } = render(<BreadcrumbDeadline nodeId="node-1" />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders the formatted deadline text when a deadline exists", () => {
    useNodeMock.mockReturnValue(createNode({
      deadline: new Date(2026, 3, 15, 15, 0).getTime(),
      deadlineAllDay: false,
    }));

    render(<BreadcrumbDeadline nodeId="node-1" />);

    expect(screen.getByRole("button", { name: "Due Apr 15, 3:00 PM" })).toHaveClass(
      "pointer-events-auto",
      "text-[11px]",
      "font-medium",
      "text-muted-foreground",
      "cursor-pointer",
    );
  });

  it("opens the popover when the trigger is clicked", () => {
    useNodeMock.mockReturnValue(createNode());

    render(<BreadcrumbDeadline nodeId="node-1" />);

    expect(screen.queryByTestId("deadline-picker")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Due Apr 15, 3:00 PM" }));

    expect(screen.getByTestId("popover-content")).toHaveClass(
      "w-auto",
      "rounded-xl",
      "border",
      "border-border",
      "bg-popover",
      "p-1.5",
      "shadow-xl",
    );
    expect(screen.getByTestId("deadline-picker")).toBeInTheDocument();
  });

  it("holds the breadcrumb while the picker or the conflict dialog is open", async () => {
    useNodeMock.mockReturnValue(createNode());
    getChildDeadlineConflictsMock.mockResolvedValue([{ id: "bit-1" }]);
    const onHeldChange = vi.fn();

    const { unmount } = render(<BreadcrumbDeadline nodeId="node-1" onHeldChange={onHeldChange} />);
    expect(onHeldChange).toHaveBeenLastCalledWith(false);

    fireEvent.click(screen.getByRole("button", { name: "Due Apr 15, 3:00 PM" }));
    expect(onHeldChange).toHaveBeenLastCalledWith(true);

    fireEvent.click(screen.getByRole("button", { name: "Set all-day deadline" }));
    await waitFor(() => {
      expect(screen.getByTestId("deadline-conflict-modal")).toBeInTheDocument();
    });
    expect(onHeldChange).toHaveBeenLastCalledWith(true);

    unmount();
    expect(onHeldChange).toHaveBeenLastCalledWith(false);
  });

  it("puts the chip in the reveal row with its own surface", () => {
    useNodeMock.mockReturnValue(createNode());

    render(<BreadcrumbDeadline nodeId="node-1" />);

    expect(screen.getByRole("button", { name: "Due Apr 15, 3:00 PM" })).toHaveClass(
      "breadcrumb-reveal__surface",
      "breadcrumb-reveal__chip",
      "pointer-events-auto",
    );
  });

  it("updates the node deadline immediately when there is no child conflict", async () => {
    useNodeMock.mockReturnValue(createNode());

    render(<BreadcrumbDeadline nodeId="node-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Due Apr 15, 3:00 PM" }));
    fireEvent.click(screen.getByRole("button", { name: "Set all-day deadline" }));

    await waitFor(() => {
      expect(getChildDeadlineConflictsMock).toHaveBeenCalledWith(
        "node-1",
        new Date(2026, 3, 15, 0, 0).getTime(),
        true,
      );
    });
    await waitFor(() => {
      expect(updateNodeMock).toHaveBeenCalledWith("node-1", {
        deadline: new Date(2026, 3, 15, 0, 0).getTime(),
        deadlineAllDay: true,
      });
    });
  });

  it("opens the conflict modal when the new deadline conflicts with child bits", async () => {
    useNodeMock.mockReturnValue(createNode());
    getChildDeadlineConflictsMock.mockResolvedValue([{ id: "bit-1" }]);

    render(<BreadcrumbDeadline nodeId="node-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Due Apr 15, 3:00 PM" }));
    fireEvent.click(screen.getByRole("button", { name: "Set all-day deadline" }));

    await waitFor(() => {
      expect(screen.getByTestId("deadline-conflict-modal")).toHaveAttribute(
        "data-all-day",
        "true",
      );
    });
    expect(updateNodeMock).not.toHaveBeenCalled();
  });

  it("applies the pending deadline when the conflict modal is confirmed", async () => {
    useNodeMock.mockReturnValue(createNode());
    getChildDeadlineConflictsMock.mockResolvedValue([{ id: "bit-1" }]);

    render(<BreadcrumbDeadline nodeId="node-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Due Apr 15, 3:00 PM" }));
    fireEvent.click(screen.getByRole("button", { name: "Set timed deadline" }));

    await waitFor(() => {
      expect(screen.getByTestId("deadline-conflict-modal")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Update parent" }));

    await waitFor(() => {
      expect(updateNodeMock).toHaveBeenCalledWith("node-1", {
        deadline: new Date(2026, 3, 15, 15, 0).getTime(),
        deadlineAllDay: false,
      });
    });
    await waitFor(() => {
      expect(screen.queryByTestId("deadline-conflict-modal")).not.toBeInTheDocument();
    });
  });

  it("discards the pending deadline when the conflict modal is cancelled", async () => {
    useNodeMock.mockReturnValue(createNode());
    getChildDeadlineConflictsMock.mockResolvedValue([{ id: "bit-1" }]);

    render(<BreadcrumbDeadline nodeId="node-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Due Apr 15, 3:00 PM" }));
    fireEvent.click(screen.getByRole("button", { name: "Set timed deadline" }));

    await waitFor(() => {
      expect(screen.getByTestId("deadline-conflict-modal")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Cancel change" }));

    await waitFor(() => {
      expect(screen.queryByTestId("deadline-conflict-modal")).not.toBeInTheDocument();
    });
    expect(updateNodeMock).not.toHaveBeenCalled();
  });

  it("clears the deadline from the popover", async () => {
    useNodeMock.mockReturnValue(createNode());

    render(<BreadcrumbDeadline nodeId="node-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Due Apr 15, 3:00 PM" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Clear deadline" })[0]);

    await waitFor(() => {
      expect(updateNodeMock).toHaveBeenCalledWith("node-1", {
        deadline: null,
        deadlineAllDay: false,
      });
    });
  });
});
