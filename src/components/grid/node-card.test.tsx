import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useArchiveActions } from "@/hooks/use-archive";
import type { Node } from "@/types";

vi.mock("motion/react", async () => {
  const React = await import("react");

  const MotionButton = React.forwardRef<
    HTMLButtonElement,
    ComponentProps<"button"> & {
      animate?: unknown;
      transition?: unknown;
      variants?: unknown;
      whileHover?: unknown;
    }
  >(function MotionButton(
    { animate, transition, variants, whileHover, ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        data-motion-animate={String(animate)}
        data-motion-transition={JSON.stringify(transition)}
        data-motion-variants={JSON.stringify(variants)}
        data-motion-while-hover={String(whileHover)}
        {...props}
      />
    );
  });

  return {
    motion: {
      button: MotionButton,
    },
  };
});

const dndState = vi.hoisted(() => ({ active: null as { id: string } | null }));

vi.mock("@dnd-kit/core", () => ({
  useDndContext: () => ({ active: dndState.active }),
}));

vi.mock("@/hooks/use-archive", () => ({
  useArchiveActions: vi.fn(() => ({ archive: vi.fn() })),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <>{children}</>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode; asChild?: boolean }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>{children}</button>
  ),
}));

const { NodeCard } = await import("./node-card");

function createNode(overrides: Partial<Node> = {}): Node {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    title: overrides.title ?? "Node",
    color: overrides.color ?? "hsl(221, 83%, 53%)",
    icon: overrides.icon ?? "Folder",
    deadline: overrides.deadline ?? null,
    deadlineAllDay: overrides.deadlineAllDay ?? false,
    mtime: overrides.mtime ?? Date.now(),
    createdAt: overrides.createdAt ?? Date.now(),
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
  cleanup();
  vi.clearAllMocks();
});

describe("NodeCard", () => {
  it("keeps Finder selectable without drag or hover lift and removes only its ordinary menu", () => {
    const node = createNode({ title: "Finder selection", icon: "Star" });
    const view = render(<NodeCard presentation="inbox-explorer" node={node} onClick={vi.fn()} />);
    const card = screen.getByRole("button", { name: node.title });
    expect(card).toHaveClass("cursor-pointer");
    expect(card).not.toHaveClass("cursor-grab", "active:cursor-grabbing");
    expect(card).toHaveAttribute("data-motion-while-hover", "undefined");
    expect(screen.queryByRole("button", { name: "Archive" })).not.toBeInTheDocument();
    expect(card.parentElement).not.toHaveAttribute("data-card-has-actions");
    expect(card.querySelector("svg")).toHaveClass("lucide-star");
    view.rerender(<NodeCard presentation="inbox-explorer" node={{ ...node, icon: "Heart" }} onClick={vi.fn()} />);
    expect(card.querySelector("svg")).toHaveClass("lucide-heart");
    view.rerender(<NodeCard node={node} onClick={vi.fn()} />);
    expect(card).toHaveClass("cursor-grab", "active:cursor-grabbing");
    expect(card).toHaveAttribute("data-motion-while-hover", "hover");
    expect(screen.getByLabelText(node.title + " options")).toBeInTheDocument();
  });

  it("keeps Finder identity, ref, motion and independent actions on the actual NodeCard", () => {
    const node = createNode({ title: "Mixed Case Finder", icon: "Monitor" });
    const navigate = vi.fn(), activateUndo = vi.fn();
    const ref = { current: null as HTMLButtonElement | null };
    const view = render(<NodeCard presentation="inbox-explorer" node={node} onClick={navigate}
      ref={ref} isNewlyPlaced undo={{ disabled: false, reason: "available", onActivate: activateUndo }} />);
    const card = screen.getByRole("button", { name: node.title });
    expect(card).toHaveAttribute("data-card-presentation", "inbox-explorer");
    expect(card).toHaveAttribute("data-triage-role", "explorer-card-node");
    expect(ref.current).toBe(card);
    // Monitor is not a production map key; retain the existing Box fallback.
    expect(card.querySelector('[data-triage-role="explorer-card-icon"]')).toHaveClass("lucide-box");
    expect(card.querySelector('[data-triage-role="explorer-card-chevron"]')).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText(node.title)).toHaveAttribute("data-triage-role", "explorer-card-title");
    expect(card).toHaveAttribute("data-motion-while-hover", "undefined");
    fireEvent.click(screen.getByRole("button", { name: "Undo placement of " + node.title }));
    expect(activateUndo).toHaveBeenCalledOnce();
    expect(navigate).not.toHaveBeenCalled();
    expect(screen.queryByLabelText(node.title + " options")).not.toBeInTheDocument();
    view.rerender(<NodeCard node={node} onClick={navigate} ref={ref} />);
    expect(screen.getByRole("button", { name: node.title })).toBe(card);
    expect(card).toHaveAttribute("data-card-presentation", "default");
    expect(card).toHaveClass("h-[var(--grid-node-size)]", "w-[var(--grid-node-size)]");
  });
  it("layers an independent semantic Newly Placed marker on the actual card", () => {
    const node = createNode({ title: "Placed node" });
    const { rerender } = render(
      <NodeCard isNewlyPlaced={true} node={node} onClick={vi.fn()} />,
    );

    const marker = screen.getByText("NEW");
    expect(marker).toHaveAttribute("data-card-marker", "newly-placed");
    expect(marker.closest('[data-newly-placed="true"]')).not.toBeNull();
    expect(screen.getByRole("button", { name: "Placed node" })).toBeInTheDocument();

    rerender(<NodeCard node={node} onClick={vi.fn()} />);
    expect(screen.queryByText("NEW")).not.toBeInTheDocument();
  });

  it("keeps marker and Undo eligibility independent and never bubbles Undo into navigation", () => {
    const node = createNode({ title: "Undo node" });
    const navigate = vi.fn();
    const activateUndo = vi.fn();
    const { rerender } = render(
      <NodeCard
        isNewlyPlaced={false}
        node={node}
        onClick={navigate}
        undo={{ disabled: false, onActivate: activateUndo, reason: "available" }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Undo placement of Undo node" }));
    expect(activateUndo).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
    expect(screen.queryByText("NEW")).not.toBeInTheDocument();

    rerender(
      <NodeCard
        isNewlyPlaced={true}
        node={node}
        onClick={navigate}
        undo={{ disabled: true, onActivate: activateUndo, reason: "dependencies" }}
      />,
    );
    expect(screen.getByText("NEW")).toBeInTheDocument();
    const unavailableUndo = screen.getByRole("button", {
      name: "Undo placement of Undo node",
    });
    expect(unavailableUndo).toHaveAttribute("aria-disabled", "true");
    expect(unavailableUndo).not.toBeDisabled();
    expect(unavailableUndo).toHaveClass("right-0");
    expect(unavailableUndo).not.toHaveClass("left-0");
    fireEvent.click(unavailableUndo);
    expect(activateUndo).toHaveBeenCalledTimes(1);
  });

  it("uses a fixed square footprint with a non-shrinking icon and truncating title slot", () => {
    const node = createNode({ title: "Very long node title that should truncate" });
    const { container } = render(
      <NodeCard node={node} onClick={vi.fn()} />,
    );

    const card = screen.getByRole("button", {
      name: "Very long node title that should truncate",
    });
    const title = screen.getByText("Very long node title that should truncate");
    const icon = container.querySelector("svg");

    expect(card).toHaveClass(
      "grid",
      "h-[var(--grid-node-size)]",
      "w-[var(--grid-node-size)]",
      "max-h-full",
      "max-w-full",
      "grid-rows-[1fr_var(--grid-node-title-height)]",
      "transition-[box-shadow,background-color]",
    );
    expect(card).toHaveClass("theme-node-card");
    expect(title.tagName).toBe("P");
    expect(title).toHaveClass("truncate", "whitespace-nowrap", "text-center");
    expect(title.parentElement).toHaveClass("h-[var(--grid-node-title-height)]");
    expect(icon?.parentElement).toHaveClass("pb-[var(--grid-node-icon-lift)]");
    expect(icon).toHaveClass(
      "h-[var(--grid-node-icon-size)]",
      "w-[var(--grid-node-icon-size)]",
      "shrink-0",
    );
  });

  it("keeps short titles visible and retains the edit-mode delete button", () => {
    const onDelete = vi.fn();
    const node = createNode({ title: "Mail" });

    render(
      <NodeCard isEditMode={true} node={node} onClick={vi.fn()} onDelete={onDelete} />,
    );

    expect(screen.getByText("Mail")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Delete Mail"));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("uses grab cursors by default and a darker grabbing state while dragging", () => {
    const node = createNode({ title: "Health" });

    const { rerender } = render(
      <NodeCard node={node} onClick={vi.fn()} />,
    );

    const restingCard = screen.getByRole("button", { name: "Health" });
    expect(restingCard).toHaveClass(
      "cursor-grab",
      "hover:bg-muted/40",
      "active:bg-muted/60",
    );
    expect(restingCard).toHaveAttribute("data-motion-animate", "rest");
    expect(restingCard).toHaveAttribute("data-motion-while-hover", "hover");
    expect(restingCard).toHaveAttribute("data-motion-variants", expect.stringContaining('"rest":{"scale":1}'));
    expect(restingCard).toHaveAttribute("data-motion-variants", expect.stringContaining('"hover":{"scale":1.05,"zIndex":40}'));
    expect(restingCard).not.toHaveAttribute("data-motion-variants", expect.stringContaining('"nodeRest"'));
    expect(restingCard).not.toHaveClass("cursor-grabbing", "bg-muted/60");

    rerender(
      <NodeCard isDragging={true} node={node} onClick={vi.fn()} />,
    );

    const draggingCard = screen.getByRole("button", { name: "Health" });
    expect(draggingCard).toHaveClass(
      "cursor-grabbing",
      "bg-muted/60",
    );
    expect(draggingCard).toHaveAttribute("data-motion-animate", "dragging");
    expect(draggingCard).toHaveAttribute("data-motion-variants", expect.stringContaining('"dragging":{"scale":1.1,"zIndex":50}'));
  });
});

describe("B2b — archive context menu (NodeCard)", () => {
  const mockArchive = vi.fn();

  beforeEach(() => {
    vi.mocked(useArchiveActions).mockReturnValue({ archive: mockArchive });
  });

  it("shows the options trigger for a non-system node in normal mode", () => {
    const node = createNode({ title: "Work", systemRole: null });
    render(<NodeCard node={node} onClick={vi.fn()} />);
    expect(screen.getByLabelText("Work options")).toBeInTheDocument();
  });

  it("shows the Archive menu item for a non-system node", () => {
    const node = createNode({ title: "Work", systemRole: null });
    render(<NodeCard node={node} onClick={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Archive" })).toBeInTheDocument();
  });

  it("calls archive('node', id) when Archive is clicked", () => {
    const node = createNode({ title: "Work", systemRole: null });
    render(<NodeCard node={node} onClick={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    expect(mockArchive).toHaveBeenCalledWith("node", node.id);
  });

  it("hides the options trigger for system nodes", () => {
    const node = createNode({ title: "Archive Node", systemRole: "archive_view" });
    render(<NodeCard node={node} onClick={vi.fn()} />);
    expect(screen.queryByLabelText("Archive Node options")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Archive" })).not.toBeInTheDocument();
  });

  it("hides the options trigger in edit mode", () => {
    const node = createNode({ title: "Work", systemRole: null });
    render(<NodeCard isEditMode={true} node={node} onClick={vi.fn()} />);
    expect(screen.queryByLabelText("Work options")).not.toBeInTheDocument();
  });
});


describe("Task170 Newly Undo pilot Node Q01", () => {
  it("renders an ordinary inbox Undo2 independently and exposes the exact tooltip reason", () => {
    const item=createNode({title:"Pilot node"}); const navigate=vi.fn(), activate=vi.fn();
    const {container}=render(<NodeCard presentation="inbox-explorer" node={item} onClick={navigate} isNewlyPlaced undo={{disabled:false,reason:"available",tooltip:"Undo this placement.",onActivate:activate}} />);
    const action=screen.getByRole("button",{name:"Undo placement of Pilot node"});
    expect(action.querySelector("svg.lucide-undo-2")).not.toBeNull();
    expect(action).not.toHaveTextContent("Undo");
    expect(container.querySelector('[data-card-marker="newly-placed"]')).toHaveTextContent("NEW");
    fireEvent.keyDown(action,{key:"Enter"});fireEvent.keyDown(action,{key:" "});
    expect(navigate).not.toHaveBeenCalled();
    fireEvent.click(action);expect(activate).toHaveBeenCalledOnce();expect(navigate).not.toHaveBeenCalled();
  });
});


it("Task170 Node unavailable Undo exposes its exact reason on semantic focus and preserves its ref", async () => {
  vi.useRealTimers();
  // JSDOM has no layout observer; this shim enables semantic tooltip DOM only.
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  const item=createNode({title:"Tooltip node"});const activate=vi.fn(),navigate=vi.fn(),ref=vi.fn();
  render(<NodeCard presentation="inbox-explorer" node={item} onClick={navigate} isNewlyPlaced undoActionRef={ref} undo={{disabled:true,reason:"result-mutated",tooltip:"This item changed after placement. Undo is unavailable.",onActivate:activate}} />);
  const action=screen.getByRole("button",{name:"Undo placement of Tooltip node"});
  expect(action).toHaveAttribute("aria-disabled","true");expect(action).not.toBeDisabled();expect(ref).toHaveBeenCalledWith(action);
  fireEvent.focus(action);expect(await screen.findByRole("tooltip")).toHaveTextContent("This item changed after placement. Undo is unavailable.");
  fireEvent.keyDown(action,{key:"Enter"});fireEvent.keyDown(action,{key:" "});fireEvent.click(action);
  expect(activate).not.toHaveBeenCalled();expect(navigate).not.toHaveBeenCalled();
});

describe("Task 179A Explorer truncated-title tooltip", () => {
  const TITLE_ROLE = '[data-triage-role="explorer-title-tooltip"]';
  const item = createNode({ title: "A very long stored title" });
  let view: ReturnType<typeof render>;
  let widths = { scroll: 0, client: 0 };
  let focusVisible = true;
  const originalMatches = Element.prototype.matches;

  beforeEach(() => {
    vi.useRealTimers();
    vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
    widths = { scroll: 200, client: 100 };
    focusVisible = true;
    dndState.active = null;
    Object.defineProperty(HTMLElement.prototype, "scrollWidth", { configurable: true, get: () => widths.scroll });
    Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => widths.client });
    // jsdom never matches :focus-visible; the gate is exercised through this stub.
    Element.prototype.matches = function (selector: string) {
      if (selector === ":focus-visible") return focusVisible;
      return originalMatches.call(this, selector);
    };
  });

  afterEach(() => {
    delete (HTMLElement.prototype as unknown as Record<string, unknown>).scrollWidth;
    delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientWidth;
    Element.prototype.matches = originalMatches;
  });

  const open = () => document.querySelector(TITLE_ROLE);
  const title = () => document.querySelector('[data-triage-role="explorer-card-title"]') as HTMLElement;
  const root = () => document.querySelector('[data-triage-role="explorer-card-node"]') as HTMLElement;
  const undoProps = { disabled: false, reason: "available", tooltip: "Undo this placement.", onActivate: vi.fn() };
  const hover = () => fireEvent.pointerMove(title(), { pointerType: "mouse" });

  it("shows the full title above a truncated title on pointer hover and none for a fitting title", async () => {
    view = render(<NodeCard presentation="inbox-explorer" node={item} onClick={vi.fn()} />);
    hover();
    await waitFor(() => expect(open()).toHaveTextContent("A very long stored title"));
    cleanup();
    widths = { scroll: 100, client: 100 };
    view = render(<NodeCard presentation="inbox-explorer" node={item} onClick={vi.fn()} />);
    hover();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(open()).toBeNull();
  });

  it("detects sub-pixel overflow through a text Range width", async () => {
    widths = { scroll: 100, client: 100 };
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ width: 100 } as DOMRect);
    const rangeSpy = vi.spyOn(document, "createRange").mockReturnValue({
      selectNodeContents: vi.fn(),
      getBoundingClientRect: () => ({ width: 100.4 }),
    } as unknown as Range);
    view = render(<NodeCard presentation="inbox-explorer" node={item} onClick={vi.fn()} />);
    hover();
    await waitFor(() => expect(open()).not.toBeNull());
    rangeSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it("does not treat a shrink-wrapped title that fits as truncated, even with a fractional width", async () => {
    widths = { scroll: 87, client: 87 };
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ width: 87.36 } as DOMRect);
    vi.spyOn(document, "createRange").mockReturnValue({
      selectNodeContents: vi.fn(),
      getBoundingClientRect: () => ({ width: 87.36 }),
    } as unknown as Range);
    view = render(<NodeCard presentation="inbox-explorer" node={item} onClick={vi.fn()} />);
    hover();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(open()).toBeNull();
    vi.restoreAllMocks();
  });

  it("does not leave the card in the undo state after hovering an Undo that has no tooltip", async () => {
    view = render(<NodeCard presentation="inbox-explorer" node={item} onClick={vi.fn()} isNewlyPlaced undo={{ ...undoProps, tooltip: undefined }} />);
    const undo = screen.getByRole("button", { name: /Undo placement of/ });
    fireEvent.pointerMove(undo, { pointerType: "mouse" });
    fireEvent.focus(undo);
    fireEvent.pointerLeave(undo);
    fireEvent.blur(undo);
    view.rerender(<NodeCard presentation="inbox-explorer" node={item} onClick={vi.fn()} isNewlyPlaced undo={undoProps} />);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(document.querySelector('[data-triage-role="explorer-undo-tooltip"]')).toBeNull();
  });

  it("opens on card-root focus only when it matches :focus-visible and the card root is the target", async () => {
    view = render(<NodeCard presentation="inbox-explorer" node={item} onClick={vi.fn()} />);
    focusVisible = false;
    fireEvent.focus(root());
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(open()).toBeNull();
    fireEvent.blur(root());
    focusVisible = true;
    fireEvent.focus(root());
    await waitFor(() => expect(open()).not.toBeNull());
    fireEvent.blur(root());
    await waitFor(() => expect(open()).toBeNull());
  });

  it("does not open when a descendant, not the card root, takes focus", async () => {
    view = render(<NodeCard presentation="inbox-explorer" node={item} onClick={vi.fn()} isNewlyPlaced undo={undoProps} />);
    fireEvent.focus(screen.getByRole("button", { name: /Undo placement of/ }));
    await waitFor(() => expect(document.querySelector('[data-triage-role="explorer-undo-tooltip"]')).not.toBeNull());
    expect(open()).toBeNull();
  });

  it("stays closed after Esc until the pointer leaves the title", async () => {
    view = render(<NodeCard presentation="inbox-explorer" node={item} onClick={vi.fn()} />);
    hover();
    await waitFor(() => expect(open()).not.toBeNull());
    fireEvent.keyDown(document.body, { key: "Escape" });
    await waitFor(() => expect(open()).toBeNull());
    hover();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(open()).toBeNull();
    fireEvent.pointerLeave(title());
    hover();
    await waitFor(() => expect(open()).not.toBeNull());
  });

  it("keeps a focus-opened tooltip through the scroll that focus causes, until blur", async () => {
    view = render(<NodeCard presentation="inbox-explorer" node={item} onClick={vi.fn()} />);
    fireEvent.focus(root());
    await waitFor(() => expect(open()).not.toBeNull());
    fireEvent.scroll(document.body);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(open()).not.toBeNull();
    fireEvent.blur(root());
    await waitFor(() => expect(open()).toBeNull());
  });

  it("keeps a focus-opened title closed after Esc until focus leaves the card", async () => {
    view = render(<NodeCard presentation="inbox-explorer" node={item} onClick={vi.fn()} />);
    fireEvent.focus(root());
    await waitFor(() => expect(open()).not.toBeNull());
    fireEvent.keyDown(document.body, { key: "Escape" });
    await waitFor(() => expect(open()).toBeNull());
    fireEvent.pointerMove(title(), { pointerType: "mouse" });
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(open()).toBeNull();
    fireEvent.blur(root());
    fireEvent.focus(root());
    await waitFor(() => expect(open()).not.toBeNull());
  });

  it("does not close when the title resizes while open", async () => {
    view = render(<NodeCard presentation="inbox-explorer" node={item} onClick={vi.fn()} />);
    hover();
    await waitFor(() => expect(open()).not.toBeNull());
    widths = { scroll: 100, client: 100 };
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(open()).not.toBeNull();
  });

  it("shows nothing while a drag is active and closes when one starts", async () => {
    dndState.active = { id: "drag" };
    view = render(<NodeCard presentation="inbox-explorer" node={item} onClick={vi.fn()} />);
    hover();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(open()).toBeNull();
    dndState.active = null;
    view.rerender(<NodeCard presentation="inbox-explorer" node={item} onClick={vi.fn()} />);
    fireEvent.pointerLeave(title());
    hover();
    await waitFor(() => expect(open()).not.toBeNull());
    dndState.active = { id: "drag" };
    view.rerender(<NodeCard presentation="inbox-explorer" node={item} onClick={vi.fn()} />);
    await waitFor(() => expect(open()).toBeNull());
  });

  it("never shows the title and Undo tooltips at once, in either order", async () => {
    view = render(<NodeCard presentation="inbox-explorer" node={item} onClick={vi.fn()} isNewlyPlaced undo={undoProps} />);
    const undo = screen.getByRole("button", { name: /Undo placement of/ });
    fireEvent.focus(undo);
    await waitFor(() => expect(document.querySelector('[data-triage-role="explorer-undo-tooltip"]')).not.toBeNull());
    hover();
    await waitFor(() => expect(open()).not.toBeNull());
    await waitFor(() => expect(document.querySelector('[data-triage-role="explorer-undo-tooltip"]')).toBeNull());
    fireEvent.focus(undo);
    await waitFor(() => expect(document.querySelector('[data-triage-role="explorer-undo-tooltip"]')).not.toBeNull());
    await waitFor(() => expect(open()).toBeNull());
  });

  it("keeps the accessible name and aria-describedby of the card unchanged while open", async () => {
    view = render(<NodeCard presentation="inbox-explorer" node={item} onClick={vi.fn()} />);
    const before = [root().getAttribute("aria-label"), root().getAttribute("aria-describedby")];
    hover();
    await waitFor(() => expect(open()).not.toBeNull());
    expect([root().getAttribute("aria-label"), root().getAttribute("aria-describedby")]).toEqual(before);
    expect(open()).toHaveAttribute("aria-hidden", "true");
  });

  it("renders no title tooltip in the ordinary Grid presentation", async () => {
    view = render(<NodeCard node={item} onClick={vi.fn()} />);
    hover();
    fireEvent.focus(root());
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(open()).toBeNull();
  });
});
