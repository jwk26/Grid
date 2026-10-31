import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useToastAnchorStore } from "@/stores/toast-anchor-store";

const dndHandlers = vi.hoisted(() => ({
  onDragStart: undefined as ((event: unknown) => void) | undefined,
  onDragEnd: undefined as ((event: unknown) => unknown) | undefined,
  onDragCancel: undefined as (() => void) | undefined,
}));
const useDndHandlers = vi.hoisted(() => ({
  handleDragStart: vi.fn(),
  handleDragEnd: vi.fn(),
  handleDragCancel: vi.fn(),
}));

vi.mock("@/components/layout/sidebar", () => ({ Sidebar: () => null }));
vi.mock("@/hooks/use-grid-actions", () => ({
  useGridActions: () => ({ createBit: vi.fn(), createNode: vi.fn(), getGridOccupancy: vi.fn() }),
}));
vi.mock("motion/react", () => ({
  motion: { aside: "div" },
  AnimatePresence: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@dnd-kit/core", () => ({
  DndContext: (props: {
    children: ReactNode;
    onDragStart: (event: unknown) => void;
    onDragEnd: (event: unknown) => unknown;
    onDragCancel: () => void;
  }) => {
    dndHandlers.onDragStart = props.onDragStart;
    dndHandlers.onDragEnd = props.onDragEnd;
    dndHandlers.onDragCancel = props.onDragCancel;
    return props.children;
  },
  closestCorners: () => null,
}));
vi.mock("@/hooks/use-dnd", () => ({
  useDnd: () => ({
    conflictState: { open: false, parentDeadline: 0, parentDeadlineAllDay: false },
    handleConflictKeepChild: vi.fn(),
    handleConflictUpdateParent: vi.fn(),
    handleDragOver: vi.fn(),
    overTargetId: null,
    sensors: [],
    ...useDndHandlers,
  }),
}));
vi.mock("@/components/calendar/items-pool", () => ({ ItemsPool: () => null }));
vi.mock("@/components/calendar/node-pool", () => ({ NodePool: () => null }));
vi.mock("@/components/shared/deadline-conflict-modal", () => ({ DeadlineConflictModal: () => null }));
vi.mock("@/components/grid/create-node-dialog", () => ({ CreateNodeDialog: () => null }));
vi.mock("@/components/grid/create-bit-dialog", () => ({ CreateBitDialog: () => null }));

const { default: CalendarLayout } = await import("@/app/calendar/layout");

describe("CalendarLayout drag flag", () => {
  beforeEach(() => {
    useToastAnchorStore.getState().reset();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  function renderLayout() {
    return render(
      <CalendarLayout>
        <div />
      </CalendarLayout>,
    );
  }

  it("sets the toast anchor drag flag on start and clears it on end", () => {
    renderLayout();
    dndHandlers.onDragStart?.({ active: {} });
    expect(useToastAnchorStore.getState().dragActive).toBe(true);
    expect(useDndHandlers.handleDragStart).toHaveBeenCalled();

    dndHandlers.onDragEnd?.({ active: {} });
    expect(useToastAnchorStore.getState().dragActive).toBe(false);
    expect(useDndHandlers.handleDragEnd).toHaveBeenCalled();
  });

  it("clears the flag and the drag state on cancel", () => {
    renderLayout();
    dndHandlers.onDragStart?.({ active: {} });
    dndHandlers.onDragCancel?.();
    expect(useToastAnchorStore.getState().dragActive).toBe(false);
    expect(useDndHandlers.handleDragCancel).toHaveBeenCalled();
  });

  it("does not keep the flag when the Calendar unmounts mid-drag", () => {
    const view = renderLayout();
    dndHandlers.onDragStart?.({ active: {} });
    view.unmount();
    expect(useToastAnchorStore.getState().dragActive).toBe(false);
  });
});
