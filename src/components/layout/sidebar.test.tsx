import { toastCopy } from "@/lib/copy/feedback";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Node } from "@/types";

const pushMock = vi.hoisted(() => vi.fn());
const usePathnameMock = vi.hoisted(() => vi.fn());
const toggleEditModeMock = vi.hoisted(() => vi.fn());
const openSearchMock = vi.hoisted(() => vi.fn());
const setColorThemeMock = vi.hoisted(() => vi.fn());
const useInboxMock = vi.hoisted(() => vi.fn());
const updateNodeMock = vi.hoisted(() => vi.fn());
const getGridOccupancyMock = vi.hoisted(() => vi.fn());
const findNearestEmptyCellMock = vi.hoisted(() => vi.fn());
const showToastMock = vi.hoisted(() => vi.fn());
const departureState = vi.hoisted(() => ({
  focus: vi.fn(),
  destination: null as null | {
    focus?: () => void;
    id: string;
    kind: "route";
    perform: () => void;
  },
  requestDeparture: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/hooks/use-triage-departure", () => ({
  captureTriageRouteFocus: vi.fn(() => departureState.focus),
  requestActiveTriageDeparture: departureState.requestDeparture,
  useTriageRouteFocusHandoff: vi.fn(),
}));

vi.mock("@dnd-kit/core", () => ({
  useDroppable: () => ({ isOver: false, setNodeRef: vi.fn() }),
}));

vi.mock("motion/react", async () => {
  const React = await import("react");

  const MotionButton = React.forwardRef<
    HTMLButtonElement,
    ComponentProps<"button"> & {
      animate?: unknown;
      initial?: unknown;
      transition?: unknown;
    }
  >(function MotionButton({ animate, initial, transition, ...props }, ref) {
    return (
      <button
        ref={ref}
        data-motion-animate={JSON.stringify(animate)}
        data-motion-initial={JSON.stringify(initial)}
        data-motion-transition={JSON.stringify(transition)}
        {...props}
      />
    );
  });

  const MotionSpan = React.forwardRef<
    HTMLSpanElement,
    ComponentProps<"span"> & {
      animate?: unknown;
      initial?: unknown;
      layout?: unknown;
      layoutId?: string;
      transition?: unknown;
    }
  >(function MotionSpan({ animate, initial, layout, layoutId, transition, ...props }, ref) {
    return (
      <span
        ref={ref}
        data-motion-layout={JSON.stringify(layout)}
        data-layout-id={layoutId}
        data-motion-animate={JSON.stringify(animate)}
        data-motion-initial={JSON.stringify(initial)}
        data-motion-transition={JSON.stringify(transition)}
        {...props}
      />
    );
  });

  return {
    motion: {
      button: MotionButton,
      span: MotionSpan,
    },
    useReducedMotion: () => false,
  };
});

vi.mock("@/components/layout/theme-toggle", () => ({
  ThemeToggle: ({ className }: { className?: string }) => (
    <button className={className} type="button">
      Theme
    </button>
  ),
}));

vi.mock("@/components/ui/popover", async () => {
  const React = await import("react");

  const PopoverContext = React.createContext<{
    onOpenChange: (open: boolean) => void;
    open: boolean;
  } | null>(null);

  function Popover({
    children,
    open = false,
    onOpenChange = () => {},
  }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) {
    return (
      <PopoverContext.Provider value={{ open, onOpenChange }}>
        {children}
      </PopoverContext.Provider>
    );
  }

  function PopoverTrigger({
    children,
  }: {
    children: React.ReactElement<{ onClick?: (event: React.MouseEvent) => void }>;
  }) {
    const context = React.useContext(PopoverContext);

    if (!context) {
      return children;
    }

    return React.cloneElement(children, {
      onClick: (event: React.MouseEvent) => {
        children.props.onClick?.(event);
        context.onOpenChange(!context.open);
      },
    });
  }

  function PopoverContent(props: React.ComponentProps<"div">) {
    const context = React.useContext(PopoverContext);

    if (!context?.open) {
      return null;
    }

    return <div {...props} />;
  }

  return { Popover, PopoverContent, PopoverTrigger };
});

vi.mock("@/components/ui/dropdown-menu", async () => {
  const React = await import("react");

  const DropdownContext = React.createContext<{
    open: boolean;
    setOpen: (open: boolean) => void;
  } | null>(null);

  function DropdownMenu({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = React.useState(false);
    return (
      <DropdownContext.Provider value={{ open, setOpen }}>
        {children}
      </DropdownContext.Provider>
    );
  }

  function DropdownMenuTrigger({
    children,
  }: {
    children: React.ReactElement<{
      onContextMenu?: (event: React.MouseEvent) => void;
    }>;
  }) {
    const context = React.useContext(DropdownContext);

    if (!context) {
      return children;
    }

    return React.cloneElement(children, {
      onContextMenu: (event: React.MouseEvent) => {
        children.props.onContextMenu?.(event);
        event.preventDefault();
        context.setOpen(true);
      },
    });
  }

  function DropdownMenuContent(props: React.ComponentProps<"div">) {
    const context = React.useContext(DropdownContext);

    if (!context?.open) {
      return null;
    }

    return <div role="menu" {...props} />;
  }

  function DropdownMenuItem({
    children,
    onClick,
    ...props
  }: React.ComponentProps<"button">) {
    const context = React.useContext(DropdownContext);

    return (
      <button
        role="menuitem"
        type="button"
        onClick={(event) => {
          onClick?.(event);
          context?.setOpen(false);
        }}
        {...props}
      >
        {children}
      </button>
    );
  }

  function DropdownMenuSeparator(props: React.ComponentProps<"div">) {
    return <div {...props} />;
  }

  return {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  };
});

vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/hooks/use-global-urgency", () => ({
  useGlobalUrgency: () => null,
}));

vi.mock("@/hooks/use-inbox", () => ({
  useInbox: useInboxMock,
}));

vi.mock("@/hooks/use-grid-actions", () => ({
  useGridActions: () => ({
    getGridOccupancy: getGridOccupancyMock,
  }),
}));

vi.mock("@/hooks/use-node-actions", () => ({
  useNodeActions: () => ({
    updateNode: updateNodeMock,
  }),
}));

vi.mock("@/lib/utils/bfs", () => ({
  findNearestEmptyCell: findNearestEmptyCellMock,
}));

vi.mock("@/lib/feedback/toast", () => ({ showToast: showToastMock }));

vi.mock("@/stores/edit-mode-store", () => ({
  useEditModeStore: (
    selector: (state: { isEditMode: boolean; toggle: typeof toggleEditModeMock }) => unknown,
  ) => selector({ isEditMode: false, toggle: toggleEditModeMock }),
}));

vi.mock("@/stores/search-store", () => ({
  useSearchStore: {
    getState: () => ({ open: openSearchMock }),
  },
}));

vi.mock("@/stores/color-theme-store", () => ({
  useColorThemeStore: (
    selector: (state: { colorTheme: string; setColorTheme: typeof setColorThemeMock }) => unknown,
  ) => selector({ colorTheme: "griddo", setColorTheme: setColorThemeMock }),
}));

const { Sidebar } = await import("@/components/layout/sidebar");

function createNode(overrides: Partial<Node> = {}): Node {
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
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  usePathnameMock.mockReturnValue("/");
  useInboxMock.mockReturnValue({
    inboxNodeId: undefined,
    createScratchBit: vi.fn(),
    scratchCount: 0,
    systemNodes: [],
  });
  getGridOccupancyMock.mockResolvedValue(new Set<string>());
  updateNodeMock.mockResolvedValue(undefined);
  findNearestEmptyCellMock.mockReturnValue(null);
  departureState.destination = null;
  departureState.requestDeparture.mockReset();
  departureState.requestDeparture.mockImplementation((destination) => {
    departureState.destination = destination;
    destination.perform();
    return "performed";
  });
});

describe("Sidebar", () => {
  it("shows a home button and calendar creation chooser on calendar routes", () => {
    usePathnameMock.mockReturnValue("/calendar/weekly");

    render(<Sidebar />);

    fireEvent.click(screen.getByRole("button", { name: "Home" }));
    expect(pushMock).toHaveBeenCalledWith("/");

    fireEvent.click(screen.getByRole("button", { name: "Add item" }));

    expect(screen.getByRole("button", { name: "Node" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bit" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Node" }));

    expect(screen.queryByRole("button", { name: "Node" })).not.toBeInTheDocument();
  });

  it("puts Home first, then the account icon, then Add item, on every route", () => {
    for (const path of ["/", "/grid/some-regular-node", "/trash", "/calendar/weekly"]) {
      usePathnameMock.mockReturnValue(path);
      const { unmount } = render(<Sidebar />);
      const home = screen.getByRole("button", { name: "Home" });
      const account = screen.getByLabelText("Account");
      const add = screen.getByRole("button", { name: "Add item" });
      expect(home.compareDocumentPosition(account) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(account.compareDocumentPosition(add) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(home.closest("aside")?.querySelector("button")).toBe(home);
      unmount();
    }
  });

  it("marks Home as the current page only on L0", () => {
    usePathnameMock.mockReturnValue("/");
    const { unmount } = render(<Sidebar />);
    expect(screen.getByRole("button", { name: "Home" })).toHaveAttribute("aria-current", "page");
    unmount();

    usePathnameMock.mockReturnValue("/trash");
    render(<Sidebar />);
    expect(screen.getByRole("button", { name: "Home" })).not.toHaveAttribute("aria-current");
  });

  it("puts the account icon above Add item, named Account", () => {
    usePathnameMock.mockReturnValue("/");

    render(<Sidebar />);

    const account = screen.getByLabelText("Account");
    const add = screen.getByRole("button", { name: "Add item" });
    expect(account.compareDocumentPosition(add) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(account).toHaveAttribute("data-app-role", "account-button");
  });

  it("shows Home button on system node routes and navigates to root on click", () => {
    const inbox = createNode({ id: "inbox-id", systemRole: "inbox" });
    usePathnameMock.mockReturnValue(`/grid/inbox-id`);
    useInboxMock.mockReturnValue({
      inboxNodeId: inbox.id,
      createScratchBit: vi.fn(),
      scratchCount: 0,
      systemNodes: [inbox],
    });

    render(<Sidebar />);

    expect(screen.getByRole("button", { name: "Home" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Home" }));
    expect(pushMock).toHaveBeenCalledWith("/");
  });

  it("captures an Inbox SPA route before calling the router", () => {
    const inbox = createNode({ id: "inbox-id", systemRole: "inbox" });
    usePathnameMock.mockReturnValue("/grid/inbox-id");
    useInboxMock.mockReturnValue({
      inboxNodeId: inbox.id,
      createScratchBit: vi.fn(),
      scratchCount: 0,
      systemNodes: [inbox],
    });
    departureState.requestDeparture.mockImplementation((destination) => {
      departureState.destination = destination;
      return "decision-required";
    });

    render(<Sidebar />);
    fireEvent.click(screen.getByRole("button", { name: "Home" }));

    expect(pushMock).not.toHaveBeenCalled();
    expect(departureState.destination).toMatchObject({
      id: "/",
      kind: "route",
    });
    expect(departureState.destination?.focus).toBe(departureState.focus);

    departureState.destination?.perform();
    expect(pushMock).toHaveBeenCalledOnce();
    expect(pushMock).toHaveBeenCalledWith("/");
  });

  it("sends Home on a standard grid route through the departure guard", () => {
    usePathnameMock.mockReturnValue("/grid/some-regular-node");

    render(<Sidebar />);
    fireEvent.click(screen.getByRole("button", { name: "Home" }));

    expect(departureState.destination).toMatchObject({ id: "/", kind: "route" });
    expect(pushMock).toHaveBeenCalledWith("/");
  });

  it("calls onNodeCreate and closes chooser when Node option is clicked", () => {
    usePathnameMock.mockReturnValue("/calendar/weekly");
    const onNodeCreate = vi.fn();

    render(<Sidebar onNodeCreate={onNodeCreate} />);

    fireEvent.click(screen.getByRole("button", { name: "Add item" }));
    fireEvent.click(screen.getByRole("button", { name: "Node" }));

    expect(onNodeCreate).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "Node" })).not.toBeInTheDocument();
  });

  it("calls onBitCreate and closes chooser when Bit option is clicked", () => {
    usePathnameMock.mockReturnValue("/calendar/weekly");
    const onBitCreate = vi.fn();

    render(<Sidebar onBitCreate={onBitCreate} />);

    fireEvent.click(screen.getByRole("button", { name: "Add item" }));
    fireEvent.click(screen.getByRole("button", { name: "Bit" }));

    expect(onBitCreate).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "Bit" })).not.toBeInTheDocument();
  });

  it("marks the grid add button active when requested", () => {
    render(<Sidebar isAddActive={true} onAddClick={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Add item" })).toHaveClass(
      "bg-accent",
      "text-foreground",
    );
  });

  it("closes chooser without error when Node clicked and onNodeCreate is absent", () => {
    usePathnameMock.mockReturnValue("/calendar/weekly");

    render(<Sidebar />);

    fireEvent.click(screen.getByRole("button", { name: "Add item" }));
    fireEvent.click(screen.getByRole("button", { name: "Node" }));

    expect(screen.queryByRole("button", { name: "Node" })).not.toBeInTheDocument();
  });

  it("disables edit mode in calendar view and keeps the tooltip on the wrapper", () => {
    usePathnameMock.mockReturnValue("/calendar/monthly");

    render(<Sidebar />);

    const editButton = screen.getByRole("button", { name: "Toggle edit mode" });

    expect(editButton).toBeDisabled();
    expect(editButton).toHaveClass("opacity-40");
    expect(editButton).not.toHaveAttribute("title");
    expect(editButton.parentElement).toHaveAttribute("title", "Editing restricted in Calendar view");

    fireEvent.click(editButton);

    expect(toggleEditModeMock).not.toHaveBeenCalled();
  });

  it("expands the pencil target while a grid item is being dragged", () => {
    render(
      <Sidebar
        dragActiveItem={{ id: "node-1", title: "Node", type: "node" }}
      />,
    );

    const editButton = screen.getByRole("button", { name: "Toggle edit mode" });

    expect(editButton).toHaveAttribute("data-motion-animate", expect.stringContaining('"scale":1.2'));
    expect(editButton).toHaveAttribute("data-motion-animate", expect.stringContaining('"boxShadow":"0 0 20px hsl(var(--primary) / 0.45)"'));
    expect(editButton).not.toHaveAttribute("data-motion-animate", expect.stringContaining("borderColor"));
    expect(editButton).toHaveClass("border-primary/60");
  });

  it("keeps the Search button wired to open Search", () => {
    render(<Sidebar />);

    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(openSearchMock).toHaveBeenCalledOnce();
  });

  it("renders system nodes even when hidden from the L0 grid", () => {
    const inbox = createNode({
      id: "inbox-node",
      title: "Inbox",
      systemRole: "inbox",
      hiddenFromGrid: false,
    });
    const archive = createNode({
      id: "archive-node",
      title: "Archive View",
      systemRole: "archive_view",
      hiddenFromGrid: true,
    });
    useInboxMock.mockReturnValue({
      inboxNodeId: inbox.id,
      createScratchBit: vi.fn(),
      scratchCount: 0,
      systemNodes: [inbox, archive],
    });

    render(<Sidebar />);

    expect(screen.getByRole("button", { name: "Inbox" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Archive View" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Archive View" })).toHaveClass("opacity-40");
  });

  it("removes a system node from the L0 grid without extra effects", async () => {
    const inbox = createNode({
      id: "inbox-node",
      title: "Inbox",
      systemRole: "inbox",
      hiddenFromGrid: false,
    });
    useInboxMock.mockReturnValue({
      inboxNodeId: inbox.id,
      createScratchBit: vi.fn(),
      scratchCount: 0,
      systemNodes: [inbox],
    });

    render(<Sidebar />);

    fireEvent.contextMenu(screen.getByRole("button", { name: "Inbox" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Remove from L0 Grid" }));

    await waitFor(() => {
      expect(updateNodeMock).toHaveBeenCalledWith(inbox.id, {
        hiddenFromGrid: true,
      });
    });
    expect(getGridOccupancyMock).not.toHaveBeenCalled();
    expect(findNearestEmptyCellMock).not.toHaveBeenCalled();
  });

  it("shows a hidden system node on the L0 grid using BFS placement", async () => {
    const archive = createNode({
      id: "archive-node",
      title: "Archive View",
      systemRole: "archive_view",
      hiddenFromGrid: true,
    });
    const occupied = new Set(["0,0", "1,0"]);
    getGridOccupancyMock.mockResolvedValue(occupied);
    findNearestEmptyCellMock.mockReturnValue({ x: 2, y: 0 });
    useInboxMock.mockReturnValue({
      inboxNodeId: undefined,
      createScratchBit: vi.fn(),
      scratchCount: 0,
      systemNodes: [archive],
    });

    render(<Sidebar />);

    fireEvent.contextMenu(screen.getByRole("button", { name: "Archive View" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Show on L0 Grid" }));

    await waitFor(() => {
      expect(updateNodeMock).toHaveBeenCalledWith(archive.id, {
        hiddenFromGrid: false,
        x: 2,
        y: 0,
      });
    });
    expect(getGridOccupancyMock).toHaveBeenCalledWith(null);
    expect(findNearestEmptyCellMock).toHaveBeenCalledWith(
      occupied,
      0,
      0,
    );
  });

  it("shows an error and skips updateNode when the L0 grid is full", async () => {
    const inbox = createNode({
      id: "inbox-node",
      title: "Inbox",
      systemRole: "inbox",
      hiddenFromGrid: true,
    });
    getGridOccupancyMock.mockResolvedValue(new Set(["0,0"]));
    findNearestEmptyCellMock.mockReturnValue(null);
    useInboxMock.mockReturnValue({
      inboxNodeId: inbox.id,
      createScratchBit: vi.fn(),
      scratchCount: 0,
      systemNodes: [inbox],
    });

    render(<Sidebar />);

    fireEvent.contextMenu(screen.getByRole("button", { name: "Inbox" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Show on L0 Grid" }));

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith(toastCopy.homeFull, "Inbox");
    });
    expect(updateNodeMock).not.toHaveBeenCalled();
  });

  it.each([
    [0, null, ""],
    [1, "1", "bg-muted text-muted-foreground"],
    [7, "7", "bg-muted text-muted-foreground"],
    [8, "8", "bg-priority-mid-bg text-priority-mid"],
    [14, "14", "bg-priority-mid-bg text-priority-mid"],
    [15, "15", "bg-destructive text-destructive-foreground"],
    [99, "99", "bg-destructive text-destructive-foreground"],
    [100, "99+", "bg-destructive text-destructive-foreground"],
  ])("renders Inbox badge tier for count %i", (count, label, classes) => {
    const inbox = createNode({
      id: "inbox-node",
      title: "Inbox",
      systemRole: "inbox",
    });
    useInboxMock.mockReturnValue({
      inboxNodeId: inbox.id,
      createScratchBit: vi.fn(),
      scratchCount: count,
      systemNodes: [inbox],
    });

    render(<Sidebar />);

    if (label === null) {
      expect(screen.queryByTestId("inbox-badge")).not.toBeInTheDocument();
      return;
    }

    const badge = screen.getByTestId("inbox-badge");
    expect(badge).toHaveTextContent(label);
    expect(badge).toHaveClass(...classes.split(" "));
  });

  describe("ColorThemeToggle in sidebar", () => {
    it("renders the color theme trigger button", () => {
      render(<Sidebar />);
      expect(screen.getByRole("button", { name: "Change color theme" })).toBeInTheDocument();
    });

    it("shows the four theme labels when trigger is clicked", () => {
      render(<Sidebar />);
      fireEvent.click(screen.getByRole("button", { name: "Change color theme" }));
      expect(screen.getByRole("button", { name: /GridDO/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /New Morphism/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /3D Clay/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Retro Mac/ })).toBeInTheDocument();
    });

    it("calls setColorTheme with the selected theme id when a row is clicked", () => {
      render(<Sidebar />);
      fireEvent.click(screen.getByRole("button", { name: "Change color theme" }));
      fireEvent.click(screen.getByRole("button", { name: /Retro Mac/ }));
      expect(setColorThemeMock).toHaveBeenCalledWith("retro-mac");
    });

    it("closes the popover after a theme row is clicked", () => {
      render(<Sidebar />);
      fireEvent.click(screen.getByRole("button", { name: "Change color theme" }));
      expect(screen.getByRole("button", { name: /Retro Mac/ })).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /Retro Mac/ }));
      expect(screen.queryByRole("button", { name: /Retro Mac/ })).not.toBeInTheDocument();
    });

    it("marks the currently active theme row with bg-accent", () => {
      render(<Sidebar />);
      fireEvent.click(screen.getByRole("button", { name: "Change color theme" }));
      const gridDoRow = screen.getByRole("button", { name: /GridDO/ });
      expect(gridDoRow).toHaveClass("bg-accent");
    });

    it("marks the currently active theme row with aria-pressed true", () => {
      render(<Sidebar />);
      fireEvent.click(screen.getByRole("button", { name: "Change color theme" }));
      const gridDoRow = screen.getByRole("button", { name: /GridDO/ });
      expect(gridDoRow).toHaveAttribute("aria-pressed", "true");
    });

    it("renders existing sidebar buttons alongside the color theme toggle", () => {
      render(<Sidebar />);
      expect(screen.getByRole("button", { name: "Toggle edit mode" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Trash" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Theme" })).toBeInTheDocument();
    });

    it("moves focus to the selected theme row when the popover opens", async () => {
      render(<Sidebar />);
      fireEvent.click(screen.getByRole("button", { name: "Change color theme" }));
      const gridDoRow = screen.getByRole("button", { name: /GridDO/ });
      await waitFor(() => expect(gridDoRow).toHaveFocus());
    });
  });
});
