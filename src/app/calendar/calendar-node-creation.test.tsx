import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCalendarStore } from "@/stores/calendar-store";

const capturedCallbacks = vi.hoisted(() => ({
  onNodeCreate: undefined as (() => void) | undefined,
}));

const createNodeMock = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const getGridOccupancyMock = vi.hoisted(() => vi.fn().mockResolvedValue(new Set()));

vi.mock("@/components/layout/sidebar", () => ({
  Sidebar: (props: { onNodeCreate?: () => void }) => {
    capturedCallbacks.onNodeCreate = props.onNodeCreate;
    return null;
  },
}));

vi.mock("@/hooks/use-grid-actions", () => ({
  useGridActions: () => ({ createNode: createNodeMock, getGridOccupancy: getGridOccupancyMock }),
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

vi.mock("@/components/calendar/items-pool", () => ({
  ItemsPool: () => null,
}));

vi.mock("@/components/calendar/node-pool", () => ({
  NodePool: () => null,
}));

vi.mock("@/components/shared/deadline-conflict-modal", () => ({
  DeadlineConflictModal: () => null,
}));

const { default: CalendarLayout } = await import("@/app/calendar/layout");

describe("CalendarLayout node creation", () => {
  beforeEach(() => {
    useCalendarStore.setState({ isPoolCollapsed: false });
    capturedCallbacks.onNodeCreate = undefined;
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("opens CreateNodeDialog when onNodeCreate callback is invoked", async () => {
    render(
      <CalendarLayout>
        <div />
      </CalendarLayout>,
    );

    act(() => {
      capturedCallbacks.onNodeCreate?.();
    });

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Create Node" })).toBeInTheDocument();
  });

  it("calls createNode with parentId null, level 0, deadline null on submit", async () => {
    render(
      <CalendarLayout>
        <div />
      </CalendarLayout>,
    );

    act(() => {
      capturedCallbacks.onNodeCreate?.();
    });

    await screen.findByRole("dialog");

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "Test Node" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Node" }));

    await waitFor(() => {
      expect(createNodeMock).toHaveBeenCalledWith(
        expect.objectContaining({ parentId: null, level: 0, deadline: null }), { report: false });
    });
  });

  it("shows the create-dialog sentence naming Home when the root grid is full", async () => {
    getGridOccupancyMock.mockResolvedValueOnce(
      new Set(Array.from({ length: 18 * 9 }, (_, i) => `${i % 18},${Math.floor(i / 18)}`)),
    );
    render(
      <CalendarLayout>
        <div />
      </CalendarLayout>,
    );

    act(() => {
      capturedCallbacks.onNodeCreate?.();
    });

    await screen.findByRole("dialog");
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "Full" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Node" }));

    expect(
      await screen.findByText("“Home” has no empty cell. Move or delete an item to make room."),
    ).toBeInTheDocument();
    expect(createNodeMock).not.toHaveBeenCalled();
  });

  it("closes dialog after successful create", async () => {
    render(
      <CalendarLayout>
        <div />
      </CalendarLayout>,
    );

    act(() => {
      capturedCallbacks.onNodeCreate?.();
    });

    await screen.findByRole("dialog");

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "My Node" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Node" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
