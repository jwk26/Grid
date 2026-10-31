import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCalendarStore } from "@/stores/calendar-store";

const capturedCallbacks = vi.hoisted(() => ({
  onBitCreate: undefined as (() => void) | undefined,
}));

const capturedBitDialogProps = vi.hoisted(() => ({
  onSubmit: undefined as ((v: unknown) => Promise<void>) | undefined,
  open: false,
  requireParent: false,
  defaultParentId: null as string | null | undefined,
}));

const createBitMock = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const getGridOccupancyMock = vi.hoisted(() => vi.fn().mockResolvedValue(new Set()));

vi.mock("@/components/layout/sidebar", () => ({
  Sidebar: (props: { onBitCreate?: () => void; onNodeCreate?: () => void }) => {
    capturedCallbacks.onBitCreate = props.onBitCreate;
    return null;
  },
}));

vi.mock("@/components/grid/create-bit-dialog", () => ({
  CreateBitDialog: (props: {
    open: boolean;
    onSubmit: (v: unknown) => Promise<void>;
    requireParent?: boolean;
    defaultParentId?: string | null;
    error?: string;
  }) => {
    capturedBitDialogProps.onSubmit = props.onSubmit;
    capturedBitDialogProps.open = props.open;
    capturedBitDialogProps.requireParent = props.requireParent ?? false;
    capturedBitDialogProps.defaultParentId = props.defaultParentId;
    return props.open ? (
      <div role="dialog" data-testid="bit-dialog">
        {props.error}
      </div>
    ) : null;
  },
}));

vi.mock("@/hooks/use-grid-actions", () => ({
  useGridActions: () => ({
    createBit: createBitMock,
    createNode: vi.fn(),
    getGridOccupancy: getGridOccupancyMock,
  }),
}));

vi.mock("motion/react", () => ({
  motion: { aside: "div" },
  AnimatePresence: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: { children: ReactNode }) => children,
  closestCorners: () => null,
}));

vi.mock("@/hooks/use-dnd", () => ({
  useDnd: () => ({
    conflictState: { open: false, parentDeadline: 0, parentDeadlineAllDay: false },
    handleConflictKeepChild: vi.fn(),
    handleConflictUpdateParent: vi.fn(),
    handleDragEnd: vi.fn(),
    handleDragOver: vi.fn(),
    handleDragStart: vi.fn(),
    overTargetId: null,
    sensors: [],
  }),
}));

vi.mock("@/components/calendar/items-pool", () => ({ ItemsPool: () => null }));
vi.mock("@/components/calendar/node-pool", () => ({ NodePool: () => null }));
vi.mock("@/components/shared/deadline-conflict-modal", () => ({ DeadlineConflictModal: () => null }));
vi.mock("@/components/grid/create-node-dialog", () => ({ CreateNodeDialog: () => null }));

const { default: CalendarLayout } = await import("@/app/calendar/layout");

describe("CalendarLayout bit creation", () => {
  beforeEach(() => {
    useCalendarStore.setState({ isPoolCollapsed: false, drillDownPath: [] });
    capturedCallbacks.onBitCreate = undefined;
    capturedBitDialogProps.open = false;
    capturedBitDialogProps.onSubmit = undefined;
    capturedBitDialogProps.requireParent = false;
    capturedBitDialogProps.defaultParentId = null;
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("opens CreateBitDialog when onBitCreate callback is invoked", async () => {
    render(
      <CalendarLayout>
        <div />
      </CalendarLayout>,
    );

    act(() => {
      capturedCallbacks.onBitCreate?.();
    });

    expect(await screen.findByTestId("bit-dialog")).toBeInTheDocument();
  });

  it("passes requireParent=true to CreateBitDialog", async () => {
    render(
      <CalendarLayout>
        <div />
      </CalendarLayout>,
    );

    act(() => {
      capturedCallbacks.onBitCreate?.();
    });

    await screen.findByTestId("bit-dialog");
    expect(capturedBitDialogProps.requireParent).toBe(true);
  });

  it("passes defaultParentId=null when drillDownPath is empty", async () => {
    render(
      <CalendarLayout>
        <div />
      </CalendarLayout>,
    );

    act(() => {
      capturedCallbacks.onBitCreate?.();
    });

    await screen.findByTestId("bit-dialog");
    expect(capturedBitDialogProps.defaultParentId).toBeNull();
  });

  it("passes defaultParentId from drillDownPath when pool is drilled in", async () => {
    useCalendarStore.setState({ drillDownPath: ["node-abc"] });

    render(
      <CalendarLayout>
        <div />
      </CalendarLayout>,
    );

    act(() => {
      capturedCallbacks.onBitCreate?.();
    });

    await screen.findByTestId("bit-dialog");
    expect(capturedBitDialogProps.defaultParentId).toBe("node-abc");
  });

  it("calls createBit with parentId from submitted values and deadline null", async () => {
    render(
      <CalendarLayout>
        <div />
      </CalendarLayout>,
    );

    act(() => {
      capturedCallbacks.onBitCreate?.();
    });

    await screen.findByTestId("bit-dialog");

    await act(async () => {
      await capturedBitDialogProps.onSubmit?.({
        title: "Test Bit",
        description: "",
        icon: "circle",
        priority: null,
        parentId: "parent-123",
        deadline: null,
        deadlineAllDay: false,
      });
    });

    await waitFor(() => {
      expect(createBitMock).toHaveBeenCalledWith(
        expect.objectContaining({ parentId: "parent-123", deadline: null }), { report: false });
    });
  });

  it("shows the create-dialog sentence naming the chosen parent when its Grid is full", async () => {
    getGridOccupancyMock.mockResolvedValueOnce(
      new Set(Array.from({ length: 18 * 9 }, (_, i) => `${i % 18},${Math.floor(i / 18)}`)),
    );
    render(
      <CalendarLayout>
        <div />
      </CalendarLayout>,
    );

    act(() => {
      capturedCallbacks.onBitCreate?.();
    });

    await screen.findByTestId("bit-dialog");

    await act(async () => {
      await capturedBitDialogProps.onSubmit?.({
        title: "Test Bit",
        description: "",
        icon: "circle",
        priority: null,
        parentId: "parent-123",
        parentTitle: "Plans",
        deadline: null,
        deadlineAllDay: false,
      });
    });

    expect(
      await screen.findByText("“Plans” has no empty cell. Move or delete an item to make room."),
    ).toBeInTheDocument();
    expect(createBitMock).not.toHaveBeenCalled();
  });

  it("closes dialog after successful bit create", async () => {
    render(
      <CalendarLayout>
        <div />
      </CalendarLayout>,
    );

    act(() => {
      capturedCallbacks.onBitCreate?.();
    });

    await screen.findByTestId("bit-dialog");

    await act(async () => {
      await capturedBitDialogProps.onSubmit?.({
        title: "Test Bit",
        description: "",
        icon: "circle",
        priority: null,
        parentId: "parent-123",
        deadline: null,
        deadlineAllDay: false,
      });
    });

    await waitFor(() => {
      expect(screen.queryByTestId("bit-dialog")).not.toBeInTheDocument();
    });
  });
});
