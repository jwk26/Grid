import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DragActiveItem } from "@/hooks/use-dnd";
import type { Node } from "@/types";
import { getGridBreadcrumbDropId } from "@/lib/grid-dnd";
import { Breadcrumbs } from "./breadcrumbs";

const useBreadcrumbChainMock = vi.hoisted(() => vi.fn());
const breadcrumbDeadlineMock = vi.hoisted(() => vi.fn(({ nodeId }: { nodeId: string; onHeldChange?: (held: boolean) => void }) => (
  <div data-testid="breadcrumb-deadline">{nodeId}</div>
)));
const push = vi.fn();
const droppableMock = vi.hoisted(() => vi.fn());
const overIds = vi.hoisted(() => new Set<string>());
const handlers = {
  onPointerEnter: vi.fn(),
  onPointerLeave: vi.fn(),
  onPointerMove: vi.fn(),
  onFocus: vi.fn(),
  onBlur: vi.fn(),
};

vi.mock("@dnd-kit/core", () => ({
  useDroppable: (options: { id: string; disabled?: boolean }) => {
    droppableMock(options);
    return { isOver: overIds.has(options.id), setNodeRef: () => undefined };
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/hooks/use-breadcrumb-chain", () => ({
  useBreadcrumbChain: useBreadcrumbChainMock,
}));

vi.mock("./breadcrumb-deadline", () => ({
  BreadcrumbDeadline: breadcrumbDeadlineMock,
}));

function createNode(overrides: Partial<Node>): Node {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    title: overrides.title ?? "Node",
    color: overrides.color ?? "hsl(221, 83%, 53%)",
    icon: overrides.icon ?? "Folder",
    deadline: overrides.deadline ?? null,
    deadlineAllDay: overrides.deadlineAllDay ?? false,
    mtime: overrides.mtime ?? 1,
    createdAt: overrides.createdAt ?? 1,
    parentId: overrides.parentId ?? null,
    level: overrides.level ?? 0,
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

afterEach(() => {
  overIds.clear();
  cleanup();
  vi.clearAllMocks();
});

function renderBreadcrumbs(props: Partial<ComponentProps<typeof Breadcrumbs>> = {}) {
  return render(
    <Breadcrumbs
      handlers={handlers}
      instant={false}
      nodeId="current-node"
      onHeldChange={vi.fn()}
      phase="shown"
      {...props}
    />,
  );
}

const root = createNode({ id: "root-node", title: "Projects" });
const child = createNode({ id: "child-node", title: "Q2", parentId: root.id, level: 1 });
const current = createNode({ id: "current-node", title: "Roadmap", parentId: child.id, level: 2 });

describe("Breadcrumbs", () => {
  it("renders the ancestor chain, routes each segment and puts the deadline chip in the row", () => {
    useBreadcrumbChainMock.mockReturnValue([root, child, current]);

    renderBreadcrumbs();

    const homeButton = screen.getByRole("button", { name: "Home" });
    const rootButton = screen.getByRole("button", { name: "Projects" });
    const childButton = screen.getByRole("button", { name: "Q2" });
    const currentPage = screen.getByText("Roadmap");

    expect(homeButton).toHaveAttribute("data-drop-zone", "breadcrumb-root");
    expect(rootButton).toHaveAttribute("data-node-id", root.id);
    expect(childButton).toHaveAttribute("data-node-id", child.id);
    expect(currentPage).toHaveAttribute("aria-current", "page");

    fireEvent.click(homeButton);
    fireEvent.click(rootButton);
    fireEvent.click(childButton);

    expect(push).toHaveBeenNthCalledWith(1, "/");
    expect(push).toHaveBeenNthCalledWith(2, `/grid/${root.id}`);
    expect(push).toHaveBeenNthCalledWith(3, `/grid/${child.id}`);

    const chip = screen.getByTestId("breadcrumb-deadline");
    expect(chip).toHaveTextContent(current.id);
    const row = screen.getByRole("navigation", { name: "Breadcrumb" }).parentElement;
    expect(row).toContainElement(chip);
    expect(row).toHaveAttribute("data-app-role", "breadcrumb-reveal");
    expect(useBreadcrumbChainMock).toHaveBeenCalledWith(current.id);
  });

  it("stays mounted and in the accessibility tree while hidden, with no positive tabindex", () => {
    useBreadcrumbChainMock.mockReturnValue([root, current]);

    renderBreadcrumbs({ phase: "hidden" });

    const row = screen.getByRole("navigation", { name: "Breadcrumb" }).parentElement;
    expect(row).toHaveAttribute("data-phase", "hidden");
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeVisible();
    for (const button of screen.getAllByRole("button")) {
      expect(button).not.toHaveAttribute("tabindex");
    }
  });

  it("reports the phase, instant reveal and drag state on the reveal element", () => {
    useBreadcrumbChainMock.mockReturnValue([root, current]);

    const { rerender } = renderBreadcrumbs({ phase: "folding", instant: true });
    const row = () => screen.getByRole("navigation", { name: "Breadcrumb" }).parentElement;
    expect(row()).toHaveAttribute("data-phase", "folding");
    expect(row()).toHaveAttribute("data-instant", "true");
    expect(row()).not.toHaveAttribute("data-dragging");

    rerender(
      <Breadcrumbs
        dragActiveItem={{ id: "node-1", title: "Plans", type: "node" } satisfies NonNullable<DragActiveItem>}
        handlers={handlers}
        instant={false}
        nodeId="current-node"
        onHeldChange={vi.fn()}
        phase="shown"
      />,
    );
    expect(row()).toHaveAttribute("data-dragging", "true");
  });

  it("wires the reveal handlers on the reveal element", () => {
    useBreadcrumbChainMock.mockReturnValue([root, current]);

    renderBreadcrumbs();
    const row = screen.getByRole("navigation", { name: "Breadcrumb" }).parentElement as HTMLElement;

    fireEvent.pointerEnter(row);
    fireEvent.focus(screen.getByRole("button", { name: "Projects" }));
    expect(handlers.onPointerEnter).toHaveBeenCalled();
    expect(handlers.onFocus).toHaveBeenCalled();
  });

  it("marks only the segment under the pointer with the drop signal during a drag", () => {
    useBreadcrumbChainMock.mockReturnValue([root, child, current]);
    const nodeDrag = { id: "n1", title: "Plans", type: "node" } satisfies NonNullable<DragActiveItem>;

    renderBreadcrumbs({ dragActiveItem: nodeDrag });
    for (const name of ["Home", "Projects", "Q2"]) {
      expect(screen.getByRole("button", { name })).not.toHaveClass("breadcrumb-drop-target");
    }
    cleanup();

    overIds.add(getGridBreadcrumbDropId("root-node"));
    renderBreadcrumbs({ dragActiveItem: nodeDrag });
    expect(screen.getByRole("button", { name: "Projects" })).toHaveClass("breadcrumb-drop-target");
    expect(screen.getByRole("button", { name: "Q2" })).not.toHaveClass("breadcrumb-drop-target");
    expect(screen.getByRole("button", { name: "Home" })).not.toHaveClass("breadcrumb-drop-target");
    expect(screen.getByText("Roadmap")).not.toHaveClass("breadcrumb-drop-target");
  });

  it("gives Home no drop signal for a Bit, even under the pointer", () => {
    useBreadcrumbChainMock.mockReturnValue([root, current]);
    overIds.add(getGridBreadcrumbDropId(null));

    renderBreadcrumbs({
      dragActiveItem: { id: "b1", title: "Task", type: "bit" } satisfies NonNullable<DragActiveItem>,
    });

    expect(screen.getByRole("button", { name: "Home" })).not.toHaveClass("breadcrumb-drop-target");
    expect(droppableMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: getGridBreadcrumbDropId(null) }),
    );
    expect(droppableMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: getGridBreadcrumbDropId(null), disabled: true }),
    );
  });

  it("shows no drop signal when nothing is dragged", () => {
    useBreadcrumbChainMock.mockReturnValue([root, current]);

    renderBreadcrumbs();

    expect(screen.getByRole("button", { name: "Home" })).not.toHaveClass("breadcrumb-drop-target");
  });
});
