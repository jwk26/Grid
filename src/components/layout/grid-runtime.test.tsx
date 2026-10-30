import { WriteOutcomeUnknownError, WriteRejectedError } from "@/lib/db/write-errors";
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GRID_COLS } from "@/lib/constants";
import { useBreadcrumbZoneStore } from "@/stores/breadcrumb-zone-store";
import { useQuickCaptureStore } from "@/stores/quick-capture-store";
import { useToastAnchorStore } from "@/stores/toast-anchor-store";
import type { Bit, Node } from "@/types";
import * as nodeGridPage from "@/app/(grid)/grid/[nodeId]/page";
import { NodeGridBody } from "./node-grid-body";
import { useAddFlow } from "./add-flow-context";
import { GridRuntime, useDeleteFlow } from "./grid-runtime";

const NEXT_APP_PAGE_EXPORT_NAMES = new Set([
  "default",
  "config",
  "generateStaticParams",
  "unstable_instant",
  "unstable_dynamicStaleTime",
  "revalidate",
  "dynamic",
  "dynamicParams",
  "fetchCache",
  "preferredRegion",
  "runtime",
  "maxDuration",
  "metadata",
  "generateMetadata",
  "viewport",
  "generateViewport",
]);

const useParamsMock = vi.hoisted(() => vi.fn());
const useNodeMock = vi.hoisted(() => vi.fn());
const useDndMock = vi.hoisted(() => vi.fn());
const getDataStoreMock = vi.hoisted(() => vi.fn());
const runBreadcrumbZoneMigrationMock = vi.hoisted(() => vi.fn());
const getGridOccupancyMock = vi.hoisted(() => vi.fn());
const createNodeMock = vi.hoisted(() => vi.fn());
const createBitMock = vi.hoisted(() => vi.fn());
const softDeleteNodeMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const softDeleteBitMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const toastErrorMock = vi.hoisted(() => vi.fn());
const toastMock = vi.hoisted(() => Object.assign(vi.fn(), { error: toastErrorMock }));
const createNodeDialogSubmission = vi.hoisted(() => ({
  current: {
    title: "  New node  ",
    icon: "Folder",
    colorHex: "#ff0000",
    deadline: null as number | null,
    deadlineAllDay: false,
  },
}));
const createBitDialogSubmission = vi.hoisted(() => ({
  current: {
    title: "  New bit  ",
    icon: "Box",
    deadline: null as number | null,
    deadlineAllDay: false,
    priority: "high" as Bit["priority"],
    description: "Bit description",
    parentId: undefined as string | null | undefined,
    parentTitle: undefined as string | null | undefined,
  },
}));

vi.mock("next/navigation", () => ({
  useParams: useParamsMock,
}));

vi.mock("sonner", () => ({
  toast: toastMock,
}));

const dndContextProps = vi.hoisted(() => ({
  current: undefined as
    | {
        onDragStart?: (event: unknown) => void;
        onDragEnd?: (event: unknown) => unknown;
        onDragCancel?: (event: unknown) => void;
      }
    | undefined,
}));

// Passes children through and keeps the handlers, so a test can fire drag events.
vi.mock("@dnd-kit/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@dnd-kit/core")>();

  return {
    ...actual,
    DndContext: (props: {
      children: React.ReactNode;
      onDragStart?: (event: unknown) => void;
      onDragEnd?: (event: unknown) => unknown;
      onDragCancel?: (event: unknown) => void;
    }) => {
      dndContextProps.current = props;
      return <>{props.children}</>;
    },
  };
});

vi.mock("@/hooks/use-node", () => ({
  useNode: useNodeMock,
}));

vi.mock("@/hooks/use-dnd", () => ({
  useDnd: useDndMock,
  useTriageDnd: () => ({
    sensors: [],
    activeDragItem: null,
    overTargetId: null,
    localPlacementResult: null,
    handleDragStart: vi.fn(),
    handleDragEnd: vi.fn(),
    handleDragOver: vi.fn(),
    handlePlacementConfirm: vi.fn(),
    handlePlacementCancel: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-grid-actions", () => ({
  useGridActions: () => ({
    getGridOccupancy: getGridOccupancyMock,
    createNode: createNodeMock,
    createBit: createBitMock,
    softDeleteNode: softDeleteNodeMock,
    softDeleteBit: softDeleteBitMock,
    runBreadcrumbZoneMigration: runBreadcrumbZoneMigrationMock,
  }),
}));

vi.mock("@/lib/db/datastore", () => ({
  getDataStore: getDataStoreMock,
  // The mocked stores never change under a subscriber, so one run per subscription is the whole
  // stream.
  liveRead: (read: (store: unknown) => Promise<unknown>) => ({
    subscribe: (observer: {
      next?: (value: unknown) => void;
      error?: (error: unknown) => void;
    }) => {
      let active = true;
      void getDataStoreMock()
        .then(read)
        .then(
          (value: unknown) => {
            if (active) observer.next?.(value);
          },
          (error: unknown) => {
            if (active) observer.error?.(error);
          },
        );
      return {
        unsubscribe: () => {
          active = false;
        },
      };
    },
  }),
}));

vi.mock("@/lib/utils/bfs", () => ({
  findNearestEmptyCell: vi.fn(),
}));

vi.mock("@/components/layout/sidebar", () => ({
  Sidebar: ({
    isAddActive,
    onAddClick,
  }: {
    isAddActive?: boolean;
    onAddClick?: () => void;
  }) => (
    <div>
      <button
        aria-label="sidebar-add"
        data-active={isAddActive ? "true" : "false"}
        onClick={onAddClick}
        type="button"
      >
        Add
      </button>
    </div>
  ),
}));

vi.mock("@/components/quick-capture/entry-surface", () => ({
  EntrySurface: ({
    canCreateNode,
    onClose,
    onCreateBit,
    onCreateNode,
    onScratch,
    open,
  }: {
    open: boolean;
    canCreateNode: boolean;
    onClose: () => void;
    onScratch: () => void;
    onCreateNode: () => void;
    onCreateBit: () => void;
  }) =>
    open ? (
      <div
        data-can-create-node={canCreateNode ? "true" : "false"}
        data-testid="entry-surface"
      >
        <button aria-label="entry-close" onClick={onClose} type="button">
          Close
        </button>
        <button aria-label="entry-scratch" onClick={onScratch} type="button">
          Scratch
        </button>
        {canCreateNode ? (
          <button aria-label="entry-create-node" onClick={onCreateNode} type="button">
            Node
          </button>
        ) : null}
        <button aria-label="entry-create-bit" onClick={onCreateBit} type="button">
          Bit
        </button>
      </div>
    ) : null,
}));

vi.mock("@/components/layout/breadcrumbs", async () => {
  const { forwardRef } = await import("react");

  return {
    Breadcrumbs: forwardRef<HTMLDivElement, { nodeId: string | null }>(
      function BreadcrumbsMock({ nodeId }, ref) {
        return (
          <div data-testid="breadcrumbs" ref={ref}>
            {nodeId ?? "root"}
          </div>
        );
      },
    ),
  };
});

vi.mock("@/components/grid/create-item-chooser", () => ({
  CreateItemChooser: ({
    open,
    onChooseBit,
    onChooseNode,
  }: {
    open: boolean;
    onChooseNode: () => void;
    onChooseBit: () => void;
  }) =>
    open ? (
      <div data-testid="create-item-chooser">
        <button aria-label="choose-node" onClick={onChooseNode} type="button">
          Choose node
        </button>
        <button aria-label="choose-bit" onClick={onChooseBit} type="button">
          Choose bit
        </button>
      </div>
    ) : null,
}));

vi.mock("@/components/grid/create-node-dialog", () => ({
  CreateNodeDialog: ({
    open,
    onSubmit,
    error,
  }: {
    open: boolean;
    onSubmit: (values: {
      title: string;
      icon: string;
      colorHex: string;
      deadline: number | null;
      deadlineAllDay: boolean;
    }) => Promise<void>;
    error?: string;
  }) =>
    open ? (
      <div>
        <button
          aria-label="submit-node"
          onClick={() => void onSubmit(createNodeDialogSubmission.current)}
          type="button"
        >
          Submit node
        </button>
        {error ? <div role="alert">{error}</div> : null}
      </div>
    ) : null,
}));

vi.mock("@/components/grid/create-bit-dialog", () => ({
  CreateBitDialog: ({
    defaultParentId,
    open,
    onSubmit,
    requireParent,
    error,
  }: {
    defaultParentId?: string | null;
    open: boolean;
    onSubmit: (values: {
      title: string;
      icon: string;
      deadline: number | null;
      deadlineAllDay: boolean;
      priority: Bit["priority"];
      description: string;
      parentId?: string | null;
      parentTitle?: string | null;
    }) => Promise<void>;
    requireParent?: boolean;
    error?: string;
  }) =>
    open ? (
      <button
        aria-label="submit-bit"
        data-default-parent-id={defaultParentId ?? ""}
        data-error={error ?? ""}
        data-require-parent={requireParent ? "true" : "false"}
        onClick={() => void onSubmit(createBitDialogSubmission.current)}
        type="button"
      >
        Submit bit
      </button>
    ) : null,
}));

vi.mock("@/components/grid/edit-mode-overlay", () => ({
  EditModeOverlay: () => <div data-testid="edit-mode-overlay" />,
}));

vi.mock("@/components/grid/grid-view", () => ({
  GridView: ({ level, parentId }: { level: number; parentId: string }) => (
    <div data-level={level} data-parent-id={parentId} data-testid="grid-view" />
  ),
}));

vi.mock("@/components/triage/scratch-pool", () => ({
  ScratchPool: () => <div data-testid="scratch-pool" />,
}));

vi.mock("@/components/grid/edit-node-dialog", () => ({
  EditNodeDialog: ({
    open,
    node,
  }: {
    open: boolean;
    node: Node | null;
  }) => (open ? <div data-testid="edit-node-dialog">{node?.id}</div> : null),
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

function RuntimeProbe() {
  const { openAddAtCell } = useAddFlow();
  const { requestDelete } = useDeleteFlow();

  return (
    <div>
      <button
        aria-label="add-at-cell"
        onClick={() => openAddAtCell(4, 3)}
        type="button"
      >
        Add at cell
      </button>
      <button
        aria-label="add-at-blocked-cell"
        onClick={() => openAddAtCell(0, 0)}
        type="button"
      >
        Add at blocked cell
      </button>
      <button
        aria-label="request-bit-delete"
        onClick={() => requestDelete({ id: "bit-1", type: "bit", title: "Ship launch" })}
        type="button"
      >
        Delete bit
      </button>
      <button
        aria-label="request-node-delete"
        onClick={() => requestDelete({ id: "node-1", type: "node", title: "Roadmap" })}
        type="button"
      >
        Delete node
      </button>
    </div>
  );
}

function createRect(left: number, top: number, width: number, height: number): DOMRect {
  return new DOMRect(left, top, width, height);
}

describe("GridRuntime", () => {
  it("does not expose exports unsupported by Next.js app pages", () => {
    const unsupportedExports = Object.keys(nodeGridPage).filter(
      (name) => !NEXT_APP_PAGE_EXPORT_NAMES.has(name),
    );

    expect(unsupportedExports).toEqual([]);
  });

  it("renders the standard node body from route data", () => {
    const standardNode = createNode({ id: "route-node", title: "Route node", level: 2 });
    const NodeGridPage = nodeGridPage.default;

    useParamsMock.mockReturnValue({ nodeId: standardNode.id });
    useNodeMock.mockReturnValue(standardNode);

    render(
      <GridRuntime>
        <NodeGridPage />
      </GridRuntime>,
    );

    expect(screen.getByRole("heading", { name: standardNode.title })).toHaveClass(
      "sr-only",
    );
    expect(screen.getByTestId("grid-view")).toHaveAttribute("data-level", "3");
    expect(screen.getByTestId("grid-view")).toHaveAttribute(
      "data-parent-id",
      standardNode.id,
    );
  });

  beforeEach(() => {
    useBreadcrumbZoneStore.setState({ blockedCells: new Set() });
    useQuickCaptureStore.setState({ activeOverlay: null });
    getDataStoreMock.mockResolvedValue({
      runBreadcrumbZoneMigration: runBreadcrumbZoneMigrationMock,
      getArchivedItems: vi.fn().mockResolvedValue({ nodes: [], bits: [] }),
      getAllActiveNodes: vi
        .fn()
        .mockResolvedValue([
          createNode({ id: "inbox-node", title: "Inbox", systemRole: "inbox", hiddenFromGrid: true }),
        ]),
      getAllActiveBits: vi.fn().mockResolvedValue([]),
    });
    runBreadcrumbZoneMigrationMock.mockResolvedValue({ relocated: 0 });
    createNodeDialogSubmission.current = {
      title: "  New node  ",
      icon: "Folder",
      colorHex: "#ff0000",
      deadline: null,
      deadlineAllDay: false,
    };
    createBitDialogSubmission.current = {
      title: "  New bit  ",
      icon: "Box",
      deadline: null,
      deadlineAllDay: false,
      priority: "high",
      description: "Bit description",
      parentId: undefined,
      parentTitle: undefined,
    };
    useToastAnchorStore.getState().reset();
    vi.stubGlobal(
      "ResizeObserver",
      class ResizeObserver {
        constructor(private readonly callback: ResizeObserverCallback) {}

        disconnect() {}

        observe() {
          this.callback([], this);
        }

        unobserve() {}
      },
    );
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
      this: HTMLElement,
    ) {
      if (this instanceof HTMLDivElement && this.dataset.testid === "breadcrumbs") {
        return createRect(12, 12, 90, 50);
      }

      if (
        this instanceof HTMLDivElement &&
        typeof this.className === "string" &&
        this.className.includes("h-full overflow-x-hidden")
      ) {
        return createRect(0, 0, 1936, 964);
      }

      return createRect(0, 0, 0, 0);
    });
    useDndMock.mockReturnValue({
      sensors: [],
      handleDragStart: vi.fn(),
      handleDragEnd: vi.fn(),
      handleDragOver: vi.fn(),
      handleConflictUpdateParent: vi.fn(),
      handleConflictKeepChild: vi.fn(),
      handleNodeMoveConfirm: vi.fn(),
      handleNodeMoveCancel: vi.fn(),
      handleAncestorMoveConfirm: vi.fn(),
      handleAncestorMoveCancel: vi.fn(),
      activeItem: null,
      overTargetId: null,
      conflictState: {
        open: false,
        parentBitId: null,
        parentDeadline: Date.now(),
        parentDeadlineAllDay: false,
        pendingChunkId: null,
        pendingTimestamp: null,
      },
      pendingNodeMove: null,
      pendingAncestorMove: null,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("creates a root node from sidebar add and confirms bit deletion through context", async () => {
    const { findNearestEmptyCell } = await import("@/lib/utils/bfs");

    useParamsMock.mockReturnValue({});
    useNodeMock.mockReturnValue(null);
    getGridOccupancyMock.mockResolvedValue(new Set(["0,0"]));
    createNodeMock.mockResolvedValue(createNode({ id: "created-root" }));
    vi.mocked(findNearestEmptyCell).mockReturnValue({ x: 1, y: 1 });

    render(
      <GridRuntime>
        <RuntimeProbe />
      </GridRuntime>,
    );

    expect(screen.getByTestId("breadcrumbs").parentElement).toHaveClass(
      "pointer-events-none",
      "w-full",
    );
    expect(screen.getByTestId("breadcrumbs").parentElement?.parentElement).toHaveClass(
      "pointer-events-none",
      "absolute",
      "top-3",
      "left-3",
      "right-3",
      "z-30",
      "flex",
      "flex-col",
      "gap-1.5",
      "items-start",
    );
    expect(screen.getByTestId("display-level")).toHaveAttribute("data-level", "0");
    expect(screen.getByTestId("breadcrumbs")).toHaveTextContent("root");
    expect(screen.getByLabelText("add-at-cell").parentElement?.parentElement).toHaveClass(
      "h-full",
      "overflow-y-auto",
      "overflow-x-hidden",
    );

    expect(screen.getByLabelText("sidebar-add")).toHaveAttribute("data-active", "false");
    fireEvent.click(screen.getByLabelText("sidebar-add"));
    expect(screen.getByLabelText("sidebar-add")).toHaveAttribute("data-active", "true");
    expect(screen.getByTestId("entry-surface")).toHaveAttribute(
      "data-can-create-node",
      "true",
    );
    fireEvent.click(screen.getByLabelText("entry-create-node"));
    fireEvent.click(screen.getByLabelText("submit-node"));

    await waitFor(() => {
      expect(createNodeMock).toHaveBeenCalledWith({
        title: "New node",
        color: "hsl(0, 100%, 50%)",
        icon: "Folder",
        deadline: null,
        deadlineAllDay: false,
        parentId: null,
        level: 0,
        x: 1,
        y: 1,
      }, { report: false });
    });
    expect(getGridOccupancyMock).toHaveBeenCalledWith(null);
    expect(vi.mocked(findNearestEmptyCell)).toHaveBeenCalledWith(
      new Set(["0,0"]),
      2,
      2,
      new Set(["0,0"]),
    );

    fireEvent.click(screen.getByLabelText("request-bit-delete"));
    expect(
      screen.getByText("This action cannot be undone."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(softDeleteBitMock).toHaveBeenCalledWith("bit-1");
    });
  });

  it("closes the delete confirmation at once, before the server answers (Task 231)", async () => {
    softDeleteBitMock.mockImplementationOnce(() => new Promise<void>(() => undefined));
    useParamsMock.mockReturnValue({});
    useNodeMock.mockReturnValue(null);
    render(
      <GridRuntime>
        <RuntimeProbe />
      </GridRuntime>,
    );

    fireEvent.click(screen.getByLabelText("request-bit-delete"));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(screen.queryByText("This action cannot be undone.")).not.toBeInTheDocument();
    });
    expect(softDeleteBitMock).toHaveBeenCalledWith("bit-1");
  });

  it("renders TriageWorkspace for Inbox system nodes without escaping the shell", () => {
    const inboxNode = createNode({ id: "inbox-node", systemRole: "inbox" });

    useParamsMock.mockReturnValue({ nodeId: inboxNode.id });
    useNodeMock.mockReturnValue(inboxNode);

    render(
      <GridRuntime>
        <div data-testid="standard-children">Standard grid</div>
      </GridRuntime>,
    );

    expect(screen.getByTestId("triage-workspace")).toBeInTheDocument();
    expect(screen.queryByTestId("standard-children")).not.toBeInTheDocument();
    expect(screen.getByLabelText("sidebar-add")).toBeInTheDocument();
    expect(screen.queryByTestId("breadcrumbs")).not.toBeInTheDocument();
    expect(screen.getByTestId("edit-mode-overlay")).toBeInTheDocument();
  });

  it.each(["inbox", "archive_view"] as const)(
    "keeps the %s system-node page body empty so GridRuntime is the sole dispatch owner",
    (systemRole) => {
      const systemNode = createNode({ id: `${systemRole}-node`, systemRole });

      const { container } = render(
        <NodeGridBody node={systemNode} nodeId={systemNode.id} />,
      );

      expect(container).toBeEmptyDOMElement();
    },
  );

  it("renders children normally for standard grid nodes", () => {
    const standardNode = createNode({ id: "standard-node", systemRole: null });

    useParamsMock.mockReturnValue({ nodeId: standardNode.id });
    useNodeMock.mockReturnValue(standardNode);

    render(
      <GridRuntime>
        <div data-testid="standard-children">Standard grid</div>
      </GridRuntime>,
    );

    expect(screen.queryByTestId("triage-workspace")).not.toBeInTheDocument();
    expect(screen.getByTestId("standard-children")).toBeInTheDocument();
    expect(screen.getByLabelText("sidebar-add")).toBeInTheDocument();
    expect(screen.getByTestId("breadcrumbs")).toBeInTheDocument();
    expect(screen.getByTestId("edit-mode-overlay")).toBeInTheDocument();
  });

  it("dispatches archive_view system nodes to ArchiveView surface", () => {
    const archiveNode = createNode({ id: "archive-node", systemRole: "archive_view" });

    useParamsMock.mockReturnValue({ nodeId: archiveNode.id });
    useNodeMock.mockReturnValue(archiveNode);

    render(
      <GridRuntime>
        <div data-testid="standard-children">Standard grid</div>
      </GridRuntime>,
    );

    expect(screen.queryByTestId("triage-workspace")).not.toBeInTheDocument();
    expect(screen.queryByTestId("standard-children")).not.toBeInTheDocument();
    expect(screen.getByTestId("archive-view")).toBeInTheDocument();
  });

  it("renders children on non-node grid routes such as Search, Calendar entry points, and Trash links", () => {
    useParamsMock.mockReturnValue({});
    useNodeMock.mockReturnValue(null);

    render(
      <GridRuntime>
        <div data-testid="standard-children">Standard grid</div>
      </GridRuntime>,
    );

    expect(screen.queryByTestId("triage-workspace")).not.toBeInTheDocument();
    expect(screen.getByTestId("standard-children")).toBeInTheDocument();
  });

  it("moves quick capture state to Scratch from the entry surface", async () => {
    useParamsMock.mockReturnValue({});
    useNodeMock.mockReturnValue(null);

    render(
      <GridRuntime>
        <RuntimeProbe />
      </GridRuntime>,
    );

    fireEvent.click(screen.getByLabelText("sidebar-add"));
    fireEvent.click(screen.getByLabelText("entry-scratch"));

    expect(screen.queryByTestId("entry-surface")).not.toBeInTheDocument();
    expect(useQuickCaptureStore.getState().activeOverlay).toBe("scratch");
  });

  it("runs breadcrumb migration once per parent and refreshes the parent id on navigation", async () => {
    useParamsMock.mockReturnValue({});
    useNodeMock.mockReturnValue(null);

    const { rerender } = render(
      <GridRuntime>
        <RuntimeProbe />
      </GridRuntime>,
    );

    await waitFor(() => {
      expect(runBreadcrumbZoneMigrationMock).toHaveBeenCalledTimes(1);
    });
    expect(runBreadcrumbZoneMigrationMock).toHaveBeenNthCalledWith(
      1,
      null,
      new Set(["0,0"]),
    );

    const parentNode = createNode({ id: "parent-node", level: 0 });
    useParamsMock.mockReturnValue({ nodeId: parentNode.id });
    useNodeMock.mockReturnValue(parentNode);

    rerender(
      <GridRuntime>
        <RuntimeProbe />
      </GridRuntime>,
    );

    await waitFor(() => {
      expect(runBreadcrumbZoneMigrationMock).toHaveBeenCalledTimes(2);
    });
    expect(runBreadcrumbZoneMigrationMock).toHaveBeenNthCalledWith(
      2,
      parentNode.id,
      new Set(["0,0"]),
    );
  });

  describe("a create the server refuses inside the Node dialog", () => {
    async function openNodeDialogAndSubmit() {
      const { findNearestEmptyCell } = await import("@/lib/utils/bfs");
      useParamsMock.mockReturnValue({});
      useNodeMock.mockReturnValue(null);
      getGridOccupancyMock.mockResolvedValue(new Set(["0,0"]));
      vi.mocked(findNearestEmptyCell).mockReturnValue({ x: 1, y: 1 });
      render(
        <GridRuntime>
          <RuntimeProbe />
        </GridRuntime>,
      );
      fireEvent.click(screen.getByLabelText("sidebar-add"));
      fireEvent.click(screen.getByLabelText("entry-create-node"));
      fireEvent.click(screen.getByLabelText("submit-node"));
    }

    it("names the account limit inline", async () => {
      createNodeMock.mockRejectedValue(
        new WriteRejectedError("account_limit", { code: "account_limit", table: "nodes", limit: 100 }),
      );
      await openNodeDialogAndSubmit();
      expect(await screen.findByRole("alert")).toHaveTextContent("This account has reached its limit of 100 Nodes.");
    });

    it("gives any other refusal the try-again line with the typed title", async () => {
      createNodeMock.mockRejectedValue(new WriteRejectedError("cell_taken", { code: "cell_taken" }));
      await openNodeDialogAndSubmit();
      expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't create “New node”. Try again.");
    });

    it("closes the dialog when an unknown outcome turns out to have been kept", async () => {
      createNodeMock.mockRejectedValue(new WriteOutcomeUnknownError(true));
      await openNodeDialogAndSubmit();
      await waitFor(() => expect(screen.queryByLabelText("submit-node")).not.toBeInTheDocument());
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("shows the line when the unknown outcome was rolled back", async () => {
      createNodeMock.mockRejectedValue(new WriteOutcomeUnknownError(false));
      await openNodeDialogAndSubmit();
      expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't create “New node”. Try again.");
    });
  });

  it("uses chooser and cell placement when creating a child node inside a non-leaf grid", async () => {
    const { findNearestEmptyCell } = await import("@/lib/utils/bfs");
    const parentNode = createNode({
      id: "parent-node",
      level: 0,
      color: "hsl(140, 70%, 45%)",
    });

    useParamsMock.mockReturnValue({ nodeId: parentNode.id });
    useNodeMock.mockReturnValue(parentNode);
    getGridOccupancyMock.mockResolvedValue(new Set(["1,1"]));
    createNodeMock.mockResolvedValue(createNode({ id: "child-node", parentId: parentNode.id }));
    vi.mocked(findNearestEmptyCell).mockReturnValue({ x: 5, y: 6 });

    render(
      <GridRuntime>
        <RuntimeProbe />
      </GridRuntime>,
    );

    expect(screen.getByTestId("display-level")).toHaveAttribute("data-level", "1");
    expect(screen.getByTestId("breadcrumbs")).toHaveTextContent(parentNode.id);
    expect(screen.getByTestId("breadcrumbs").parentElement?.parentElement).toHaveClass(
      "pointer-events-none",
      "absolute",
      "top-3",
      "left-3",
      "z-30",
    );

    fireEvent.click(screen.getByLabelText("add-at-cell"));
    fireEvent.click(screen.getByLabelText("choose-node"));
    fireEvent.click(screen.getByLabelText("submit-node"));

    await waitFor(() => {
      expect(createNodeMock).toHaveBeenCalledWith({
        title: "New node",
        color: "hsl(0, 100%, 50%)",
        icon: "Folder",
        deadline: null,
        deadlineAllDay: false,
        parentId: parentNode.id,
        level: 1,
        x: 5,
        y: 6,
      }, { report: false });
    });
    expect(vi.mocked(findNearestEmptyCell)).toHaveBeenCalledWith(
      new Set(["1,1"]),
      4,
      3,
      new Set(["0,0"]),
    );
  });

  it("passes create-node deadline values through to createNode", async () => {
    const { findNearestEmptyCell } = await import("@/lib/utils/bfs");
    const parentNode = createNode({
      id: "parent-node",
      level: 0,
      deadline: new Date(2026, 3, 30, 0, 0).getTime(),
      deadlineAllDay: true,
    });
    const childDeadline = new Date(2026, 3, 24, 9, 30).getTime();

    createNodeDialogSubmission.current = {
      title: "  New node  ",
      icon: "Folder",
      colorHex: "#ff0000",
      deadline: childDeadline,
      deadlineAllDay: false,
    };
    useParamsMock.mockReturnValue({ nodeId: parentNode.id });
    useNodeMock.mockReturnValue(parentNode);
    getGridOccupancyMock.mockResolvedValue(new Set(["2,2"]));
    createNodeMock.mockResolvedValue(createNode({ id: "child-node", parentId: parentNode.id }));
    vi.mocked(findNearestEmptyCell).mockReturnValue({ x: 6, y: 4 });

    render(
      <GridRuntime>
        <RuntimeProbe />
      </GridRuntime>,
    );

    fireEvent.click(screen.getByLabelText("add-at-cell"));
    fireEvent.click(screen.getByLabelText("choose-node"));
    fireEvent.click(screen.getByLabelText("submit-node"));

    await waitFor(() => {
      expect(createNodeMock).toHaveBeenCalledWith({
        title: "New node",
        color: "hsl(0, 100%, 50%)",
        icon: "Folder",
        deadline: childDeadline,
        deadlineAllDay: false,
        parentId: parentNode.id,
        level: 1,
        x: 6,
        y: 4,
      }, { report: false });
    });
  });

  it("blocks child node creation when the deadline exceeds the parent deadline", async () => {
    const parentNode = createNode({
      id: "parent-node",
      level: 0,
      deadline: new Date(2026, 3, 20, 0, 0).getTime(),
      deadlineAllDay: true,
    });

    createNodeDialogSubmission.current = {
      title: "  New node  ",
      icon: "Folder",
      colorHex: "#ff0000",
      deadline: new Date(2026, 3, 21, 10, 0).getTime(),
      deadlineAllDay: false,
    };
    useParamsMock.mockReturnValue({ nodeId: parentNode.id });
    useNodeMock.mockReturnValue(parentNode);

    render(
      <GridRuntime>
        <RuntimeProbe />
      </GridRuntime>,
    );

    fireEvent.click(screen.getByLabelText("add-at-cell"));
    fireEvent.click(screen.getByLabelText("choose-node"));
    fireEvent.click(screen.getByLabelText("submit-node"));

    expect(createNodeMock).not.toHaveBeenCalled();
    expect(getGridOccupancyMock).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Node deadline cannot exceed parent deadline.",
    );
  });

  it("creates a bit directly on leaf grids and uses the updated top-right inset origin", async () => {
    const { findNearestEmptyCell } = await import("@/lib/utils/bfs");
    const leafNode = createNode({ id: "leaf-node", level: 2 });

    useParamsMock.mockReturnValue({ nodeId: leafNode.id });
    useNodeMock.mockReturnValue(leafNode);
    getGridOccupancyMock.mockResolvedValue(new Set(["10,1"]));
    createBitMock.mockResolvedValue({
      id: "created-bit",
      title: "New bit",
      description: "Bit description",
      icon: "Box",
      deadline: null,
      deadlineAllDay: false,
      priority: "high",
      status: "active",
      mtime: 1,
      createdAt: 1,
      parentId: leafNode.id,
      x: 9,
      y: 1,
      deletedAt: null,
    });
    vi.mocked(findNearestEmptyCell).mockReturnValue({ x: 9, y: 1 });

    render(
      <GridRuntime>
        <RuntimeProbe />
      </GridRuntime>,
    );

    expect(screen.getByTestId("display-level")).toHaveAttribute("data-level", "3");

    fireEvent.click(screen.getByLabelText("sidebar-add"));
    expect(screen.getByTestId("entry-surface")).toHaveAttribute(
      "data-can-create-node",
      "false",
    );
    expect(screen.queryByLabelText("entry-create-node")).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("entry-create-bit"));
    fireEvent.click(screen.getByLabelText("submit-bit"));

    await waitFor(() => {
      expect(createBitMock).toHaveBeenCalledWith({
        title: "New bit",
        description: "Bit description",
        icon: "Box",
        deadline: null,
        deadlineAllDay: false,
        priority: "high",
        parentId: leafNode.id,
        x: 9,
        y: 1,
      }, { report: false });
    });
    expect(vi.mocked(findNearestEmptyCell)).toHaveBeenCalledWith(
      new Set(["10,1"]),
      GRID_COLS - 3,
      2,
      new Set(["0,0"]),
    );
  });

  it("creates a root-level bit using the dialog parent selector", async () => {
    const { findNearestEmptyCell } = await import("@/lib/utils/bfs");

    useParamsMock.mockReturnValue({});
    useNodeMock.mockReturnValue(null);
    getGridOccupancyMock.mockResolvedValue(new Set(["2,2"]));
    createBitDialogSubmission.current = {
      title: "  Root bit  ",
      icon: "Box",
      deadline: null,
      deadlineAllDay: false,
      priority: "mid",
      description: "Root bit description",
      parentId: "selected-parent",
      parentTitle: undefined,
    };
    createBitMock.mockResolvedValue({
      id: "created-root-bit",
      title: "Root bit",
      description: "Root bit description",
      icon: "Box",
      deadline: null,
      deadlineAllDay: false,
      priority: "mid",
      status: "active",
      mtime: 1,
      createdAt: 1,
      parentId: "selected-parent",
      x: 8,
      y: 2,
      deletedAt: null,
    });
    vi.mocked(findNearestEmptyCell).mockReturnValue({ x: 8, y: 2 });

    render(
      <GridRuntime>
        <RuntimeProbe />
      </GridRuntime>,
    );

    fireEvent.click(screen.getByLabelText("sidebar-add"));
    fireEvent.click(screen.getByLabelText("entry-create-bit"));

    expect(screen.getByLabelText("submit-bit")).toHaveAttribute(
      "data-require-parent",
      "true",
    );
    expect(screen.getByLabelText("submit-bit")).toHaveAttribute(
      "data-default-parent-id",
      "",
    );

    fireEvent.click(screen.getByLabelText("submit-bit"));

    await waitFor(() => {
      expect(createBitMock).toHaveBeenCalledWith({
        title: "Root bit",
        description: "Root bit description",
        icon: "Box",
        deadline: null,
        deadlineAllDay: false,
        priority: "mid",
        parentId: "selected-parent",
        x: 8,
        y: 2,
      }, { report: false });
    });
    expect(getGridOccupancyMock).toHaveBeenCalledWith("selected-parent");
    expect(vi.mocked(findNearestEmptyCell)).toHaveBeenCalledWith(
      new Set(["2,2"]),
      GRID_COLS - 3,
      2,
      new Set<string>(),
    );
  });

  it("blocks bit creation when the current grid node is missing", async () => {
    useParamsMock.mockReturnValue({ nodeId: "missing-node" });
    useNodeMock.mockReturnValue(null);
    createBitDialogSubmission.current = {
      title: "Orphan bit",
      icon: "Box",
      deadline: null,
      deadlineAllDay: false,
      priority: "low",
      description: "Should not be created",
      parentId: null,
      parentTitle: undefined,
    };

    render(
      <GridRuntime>
        <RuntimeProbe />
      </GridRuntime>,
    );

    fireEvent.click(screen.getByLabelText("sidebar-add"));
    fireEvent.click(screen.getByLabelText("entry-create-bit"));
    fireEvent.click(screen.getByLabelText("submit-bit"));

    await waitFor(() => {
      expect(screen.getByLabelText("submit-bit")).toHaveAttribute(
        "data-error",
        "Unable to find parent node.",
      );
    });
    expect(createBitMock).not.toHaveBeenCalled();
    expect(getGridOccupancyMock).not.toHaveBeenCalled();
  });

  it("clips the grid scroll wrapper while a drag is active", () => {
    useParamsMock.mockReturnValue({});
    useNodeMock.mockReturnValue(null);

    useDndMock.mockReturnValue({
      sensors: [],
      handleDragStart: vi.fn(),
      handleDragEnd: vi.fn(),
      handleDragOver: vi.fn(),
      handleConflictUpdateParent: vi.fn(),
      handleConflictKeepChild: vi.fn(),
      handleNodeMoveConfirm: vi.fn(),
      handleNodeMoveCancel: vi.fn(),
      handleAncestorMoveConfirm: vi.fn(),
      handleAncestorMoveCancel: vi.fn(),
      activeItem: {
        id: "bit-1",
        type: "bit",
        title: "Ship launch",
      },
      overTargetId: null,
      conflictState: {
        open: false,
        parentBitId: null,
        parentDeadline: Date.now(),
        parentDeadlineAllDay: false,
        pendingChunkId: null,
        pendingTimestamp: null,
      },
      pendingNodeMove: null,
      pendingAncestorMove: null,
    });

    render(
      <GridRuntime>
        <RuntimeProbe />
      </GridRuntime>,
    );

    const scrollWrapper = screen.getByLabelText("add-at-cell").parentElement?.parentElement;
    expect(scrollWrapper).toHaveAttribute("data-dragging", "true");
    expect(scrollWrapper).toHaveClass("overflow-hidden");
    expect(scrollWrapper).not.toHaveClass("overflow-y-auto");
  });

  it("makes openAddAtCell a no-op for blocked cells", () => {
    useParamsMock.mockReturnValue({});
    useNodeMock.mockReturnValue(null);
    useBreadcrumbZoneStore.setState({ blockedCells: new Set(["0,0"]) });

    render(
      <GridRuntime>
        <RuntimeProbe />
      </GridRuntime>,
    );

    fireEvent.click(screen.getByLabelText("add-at-blocked-cell"));

    expect(screen.queryByLabelText("submit-node")).not.toBeInTheDocument();
    expect(screen.queryByTestId("create-item-chooser")).not.toBeInTheDocument();
  });

  it("shows a move confirmation dialog when a pending node move exists", () => {
    useParamsMock.mockReturnValue({});
    useNodeMock.mockReturnValue(null);

    const handleNodeMoveConfirm = vi.fn();
    const handleNodeMoveCancel = vi.fn();

    useDndMock.mockReturnValue({
      sensors: [],
      handleDragStart: vi.fn(),
      handleDragEnd: vi.fn(),
      handleDragOver: vi.fn(),
      handleConflictUpdateParent: vi.fn(),
      handleConflictKeepChild: vi.fn(),
      handleNodeMoveConfirm,
      handleNodeMoveCancel,
      handleAncestorMoveConfirm: vi.fn(),
      handleAncestorMoveCancel: vi.fn(),
      activeItem: null,
      overTargetId: null,
      conflictState: {
        open: false,
        parentBitId: null,
        parentDeadline: Date.now(),
        parentDeadlineAllDay: false,
        pendingChunkId: null,
        pendingTimestamp: null,
      },
      pendingNodeMove: {
        itemId: "node-1",
        itemType: "node",
        itemTitle: "Roadmap",
        targetNodeId: "node-2",
        targetNodeTitle: "Q2",
      },
      pendingAncestorMove: null,
    });

    render(
      <GridRuntime>
        <RuntimeProbe />
      </GridRuntime>,
    );

    expect(screen.getByText("Move into 'Q2'?")).toBeInTheDocument();
    expect(screen.getByText("'Roadmap' will be moved into this node.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Move" }));
    expect(handleNodeMoveConfirm).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(handleNodeMoveCancel).toHaveBeenCalledTimes(1);
  });
  describe("full-Grid create", () => {
    async function mockFullGrid() {
      const { findNearestEmptyCell } = await import("@/lib/utils/bfs");

      getGridOccupancyMock.mockResolvedValue(new Set(["2,2"]));
      vi.mocked(findNearestEmptyCell).mockReturnValue(null);
    }

    const NO_ROOM = "Move or delete an item to make room.";

    it("keeps the Node dialog open with the reason for Home at L0, without a toast", async () => {
      await mockFullGrid();
      useParamsMock.mockReturnValue({});
      useNodeMock.mockReturnValue(null);

      render(
        <GridRuntime>
          <RuntimeProbe />
        </GridRuntime>,
      );

      fireEvent.click(screen.getByLabelText("sidebar-add"));
      fireEvent.click(screen.getByLabelText("entry-create-node"));
      fireEvent.click(screen.getByLabelText("submit-node"));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        `“Home” has no empty cell. ${NO_ROOM}`,
      );
      expect(screen.getByLabelText("submit-node")).toBeInTheDocument();
      expect(createNodeMock).not.toHaveBeenCalled();
      expect(toastErrorMock).not.toHaveBeenCalled();
      expect(toastMock).not.toHaveBeenCalled();
    });

    it("keeps the Node dialog open with the current Node's title inside a Node", async () => {
      await mockFullGrid();
      const parentNode = createNode({ id: "parent-node", title: "Roadmap", level: 0 });
      useParamsMock.mockReturnValue({ nodeId: parentNode.id });
      useNodeMock.mockReturnValue(parentNode);

      render(
        <GridRuntime>
          <RuntimeProbe />
        </GridRuntime>,
      );

      fireEvent.click(screen.getByLabelText("add-at-cell"));
      fireEvent.click(screen.getByLabelText("choose-node"));
      fireEvent.click(screen.getByLabelText("submit-node"));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        `“Roadmap” has no empty cell. ${NO_ROOM}`,
      );
      expect(screen.getByLabelText("submit-node")).toBeInTheDocument();
      expect(createNodeMock).not.toHaveBeenCalled();
      expect(toastErrorMock).not.toHaveBeenCalled();
    });

    it("keeps the Bit dialog open with the current Node's title on a leaf Grid", async () => {
      await mockFullGrid();
      const leafNode = createNode({ id: "leaf-node", title: "Sprint 4", level: 2 });
      useParamsMock.mockReturnValue({ nodeId: leafNode.id });
      useNodeMock.mockReturnValue(leafNode);

      render(
        <GridRuntime>
          <RuntimeProbe />
        </GridRuntime>,
      );

      fireEvent.click(screen.getByLabelText("sidebar-add"));
      fireEvent.click(screen.getByLabelText("entry-create-bit"));
      fireEvent.click(screen.getByLabelText("submit-bit"));

      await waitFor(() => {
        expect(screen.getByLabelText("submit-bit")).toHaveAttribute(
          "data-error",
          `“Sprint 4” has no empty cell. ${NO_ROOM}`,
        );
      });
      expect(createBitMock).not.toHaveBeenCalled();
      expect(toastErrorMock).not.toHaveBeenCalled();
    });

    it("names the chosen parent when a Bit is created from L0 into a full parent", async () => {
      await mockFullGrid();
      useParamsMock.mockReturnValue({});
      useNodeMock.mockReturnValue(null);
      createBitDialogSubmission.current = {
        ...createBitDialogSubmission.current,
        parentId: "selected-parent",
        parentTitle: "Projects",
      };

      render(
        <GridRuntime>
          <RuntimeProbe />
        </GridRuntime>,
      );

      fireEvent.click(screen.getByLabelText("sidebar-add"));
      fireEvent.click(screen.getByLabelText("entry-create-bit"));
      fireEvent.click(screen.getByLabelText("submit-bit"));

      await waitFor(() => {
        expect(screen.getByLabelText("submit-bit")).toHaveAttribute(
          "data-error",
          `“Projects” has no empty cell. ${NO_ROOM}`,
        );
      });
      expect(getGridOccupancyMock).toHaveBeenCalledWith("selected-parent");
      expect(createBitMock).not.toHaveBeenCalled();
      expect(toastErrorMock).not.toHaveBeenCalled();
    });

    it("does not guess a name when the chosen parent's title is unknown", async () => {
      await mockFullGrid();
      useParamsMock.mockReturnValue({});
      useNodeMock.mockReturnValue(null);
      createBitDialogSubmission.current = {
        ...createBitDialogSubmission.current,
        parentId: "selected-parent",
        parentTitle: null,
      };

      render(
        <GridRuntime>
          <RuntimeProbe />
        </GridRuntime>,
      );

      fireEvent.click(screen.getByLabelText("sidebar-add"));
      fireEvent.click(screen.getByLabelText("entry-create-bit"));
      fireEvent.click(screen.getByLabelText("submit-bit"));

      await waitFor(() => {
        expect(screen.getByLabelText("submit-bit")).toHaveAttribute(
          "data-error",
          "Unable to find parent node.",
        );
      });
      expect(toastErrorMock).not.toHaveBeenCalled();
    });

    it("clears the reason when the dialog is submitted again with room", async () => {
      const { findNearestEmptyCell } = await import("@/lib/utils/bfs");
      getGridOccupancyMock.mockResolvedValue(new Set(["2,2"]));
      vi.mocked(findNearestEmptyCell).mockReturnValueOnce(null);
      vi.mocked(findNearestEmptyCell).mockReturnValueOnce({ x: 3, y: 3 });
      createNodeMock.mockResolvedValue(createNode({ id: "created" }));
      useParamsMock.mockReturnValue({});
      useNodeMock.mockReturnValue(null);

      render(
        <GridRuntime>
          <RuntimeProbe />
        </GridRuntime>,
      );

      fireEvent.click(screen.getByLabelText("sidebar-add"));
      fireEvent.click(screen.getByLabelText("entry-create-node"));
      fireEvent.click(screen.getByLabelText("submit-node"));
      expect(await screen.findByRole("alert")).toBeInTheDocument();

      fireEvent.click(screen.getByLabelText("submit-node"));

      await waitFor(() => {
        expect(createNodeMock).toHaveBeenCalledTimes(1);
      });
      await waitFor(() => {
        expect(screen.queryByLabelText("submit-node")).not.toBeInTheDocument();
      });
    });
  });

  describe("toast anchor", () => {
    it("publishes the bottom of the breadcrumb cluster", () => {
      useParamsMock.mockReturnValue({ nodeId: "parent-node" });
      useNodeMock.mockReturnValue(createNode({ id: "parent-node" }));

      render(
        <GridRuntime>
          <RuntimeProbe />
        </GridRuntime>,
      );

      // The mocked cluster rect is 12 + 50 = 62px from the top.
      expect(useToastAnchorStore.getState().breadcrumbBottom).toBe(62);
    });

    it("returns to the breadcrumb row on unmount", () => {
      useParamsMock.mockReturnValue({ nodeId: "parent-node" });
      useNodeMock.mockReturnValue(createNode({ id: "parent-node" }));

      const { unmount } = render(
        <GridRuntime>
          <RuntimeProbe />
        </GridRuntime>,
      );
      expect(useToastAnchorStore.getState().breadcrumbBottom).toBe(62);

      unmount();

      expect(useToastAnchorStore.getState().breadcrumbBottom).toBeNull();
      expect(useToastAnchorStore.getState().dragActive).toBe(false);
    });

    it("returns to the breadcrumb row when the route becomes the Inbox", () => {
      const parentNode = createNode({ id: "parent-node" });
      const inboxNode = createNode({
        id: "inbox-node",
        title: "Inbox",
        systemRole: "inbox",
        hiddenFromGrid: true,
      });
      useParamsMock.mockReturnValue({ nodeId: parentNode.id });
      useNodeMock.mockReturnValue(parentNode);

      const { rerender } = render(
        <GridRuntime>
          <RuntimeProbe />
        </GridRuntime>,
      );
      expect(useToastAnchorStore.getState().breadcrumbBottom).toBe(62);

      useParamsMock.mockReturnValue({ nodeId: inboxNode.id });
      useNodeMock.mockReturnValue(inboxNode);
      rerender(
        <GridRuntime>
          <RuntimeProbe />
        </GridRuntime>,
      );

      expect(screen.queryByTestId("breadcrumbs")).not.toBeInTheDocument();
      expect(useToastAnchorStore.getState().breadcrumbBottom).toBeNull();
    });

    it("clears the bottom when the Inbox resolves on the same route", () => {
      const callbacks: ResizeObserverCallback[] = [];
      vi.stubGlobal(
        "ResizeObserver",
        class ResizeObserver {
          constructor(private readonly callback: ResizeObserverCallback) {
            callbacks.push(callback);
          }

          disconnect() {}

          observe() {
            this.callback([], this);
          }

          unobserve() {}
        },
      );
      const inboxNode = createNode({
        id: "inbox-node",
        title: "Inbox",
        systemRole: "inbox",
        hiddenFromGrid: true,
      });
      useParamsMock.mockReturnValue({ nodeId: inboxNode.id });
      useNodeMock.mockReturnValue(null);

      const { rerender } = render(
        <GridRuntime>
          <RuntimeProbe />
        </GridRuntime>,
      );
      expect(useToastAnchorStore.getState().breadcrumbBottom).toBe(62);

      useNodeMock.mockReturnValue(inboxNode);
      rerender(
        <GridRuntime>
          <RuntimeProbe />
        </GridRuntime>,
      );
      callbacks.forEach((callback) => callback([], {} as ResizeObserver));

      expect(useToastAnchorStore.getState().breadcrumbBottom).toBeNull();
    });

    it("reports a Node or Bit drag from its start to its end", async () => {
      useParamsMock.mockReturnValue({});
      useNodeMock.mockReturnValue(null);
      const handleDragStart = vi.fn();
      const handleDragEnd = vi.fn().mockResolvedValue(null);
      useDndMock.mockReturnValue({ ...useDndMock(), handleDragStart, handleDragEnd });
      const startEvent = { active: { id: "draggable-bit-1" } };

      render(
        <GridRuntime>
          <RuntimeProbe />
        </GridRuntime>,
      );
      expect(useToastAnchorStore.getState().dragActive).toBe(false);

      act(() => dndContextProps.current?.onDragStart?.(startEvent));
      expect(handleDragStart).toHaveBeenCalledWith(startEvent);
      expect(useToastAnchorStore.getState().dragActive).toBe(true);

      await act(async () => {
        await dndContextProps.current?.onDragEnd?.({ active: { id: "draggable-bit-1" } });
      });
      expect(handleDragEnd).toHaveBeenCalledTimes(1);
      expect(useToastAnchorStore.getState().dragActive).toBe(false);
    });

    it("clears the drag when it is cancelled, even though useDnd keeps its active item", () => {
      useParamsMock.mockReturnValue({});
      useNodeMock.mockReturnValue(null);
      // useDnd has no cancel handler: an Escape-cancelled drag leaves its activeItem set.
      useDndMock.mockReturnValue({
        ...useDndMock(),
        activeItem: { id: "bit-1", type: "bit", title: "Ship launch" },
      });

      render(
        <GridRuntime>
          <RuntimeProbe />
        </GridRuntime>,
      );

      act(() => dndContextProps.current?.onDragStart?.({ active: { id: "draggable-bit-1" } }));
      expect(useToastAnchorStore.getState().dragActive).toBe(true);

      act(() => dndContextProps.current?.onDragCancel?.({ active: { id: "draggable-bit-1" } }));
      expect(useToastAnchorStore.getState().dragActive).toBe(false);
    });

    it("measures the breadcrumb when it appears after a stale Inbox node on client navigation", () => {
      const inboxNode = createNode({
        id: "inbox-node",
        title: "Inbox",
        systemRole: "inbox",
        hiddenFromGrid: true,
      });
      const parentNode = createNode({ id: "parent-node" });
      useParamsMock.mockReturnValue({ nodeId: inboxNode.id });
      useNodeMock.mockReturnValue(inboxNode);

      const { rerender } = render(
        <GridRuntime>
          <RuntimeProbe />
        </GridRuntime>,
      );
      expect(useToastAnchorStore.getState().breadcrumbBottom).toBeNull();

      // useNode keeps the previous node until the new one arrives, so the route
      // changes first while `node` is still the Inbox.
      useParamsMock.mockReturnValue({ nodeId: parentNode.id });
      rerender(
        <GridRuntime>
          <RuntimeProbe />
        </GridRuntime>,
      );
      expect(screen.queryByTestId("breadcrumbs")).not.toBeInTheDocument();

      useNodeMock.mockReturnValue(parentNode);
      rerender(
        <GridRuntime>
          <RuntimeProbe />
        </GridRuntime>,
      );

      expect(screen.getByTestId("breadcrumbs")).toBeInTheDocument();
      expect(useToastAnchorStore.getState().breadcrumbBottom).toBe(62);
    });
  });
});
