import type { ComponentProps } from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TriageDragItem } from "@/hooks/use-dnd";
import type { StagedCandidateProjection } from "@/hooks/use-staged-candidates";
import { StagingAlertBand, StagingSubsection, StagingZone } from "./staging-zone";

const useDroppableMock = vi.hoisted(() => vi.fn());
const useDraggableMock = vi.hoisted(() => vi.fn());
const useStagedCandidatesMock = vi.hoisted(() => vi.fn());
const invalidateTriageDragSourceMock = vi.hoisted(() => vi.fn());
const operationLockState = vi.hoisted(() => ({
  activeOperation: null as null | { kind: string; operationId: string },
}));

vi.mock("@dnd-kit/core", () => ({
  useDraggable: useDraggableMock,
  useDroppable: useDroppableMock,
}));

vi.mock("@/hooks/use-dnd", () => ({
  invalidateTriageDragSource: invalidateTriageDragSourceMock,
}));

const triageStoreState = vi.hoisted(() => ({
  selectedScratchId: "scratch-1" as string | null,
  stagedCandidates: {},
}));
const useTriageStoreMock = vi.hoisted(() => vi.fn());

vi.mock("@/stores/triage-store", () => ({
  useTriageStore: useTriageStoreMock,
}));

vi.mock("@/hooks/use-staged-candidates", () => ({
  useStagedCandidates: useStagedCandidatesMock,
}));

vi.mock("@/hooks/use-triage-operation-lock", () => ({
  useTriageOperationLockContext: () => operationLockState,
}));

function createCandidate(
  overrides: Partial<StagedCandidateProjection> = {},
): StagedCandidateProjection {
  const id = overrides.id ?? crypto.randomUUID();
  const sourceBreakdownId =
    overrides.sourceBreakdownId ?? `breakdown-${id}`;
  const content = overrides.content ?? "Candidate";
  return {
    id,
    scratchBitId: overrides.scratchBitId ?? "scratch-1",
    sourceBreakdownId,
    resultType: overrides.resultType ?? "node",
    lifecycle: "staged",
    createdAt: overrides.createdAt ?? 1,
    updatedAt: overrides.updatedAt ?? 1,
    version: overrides.version ?? 1,
    content,
    source: overrides.source ?? {
      id: sourceBreakdownId,
      scratchBitId: overrides.scratchBitId ?? "scratch-1",
      content,
      order: 0,
      createdAt: 1,
      consumedAt: null,
      version: 1,
    },
  };
}

beforeEach(() => {
  operationLockState.activeOperation = null;
  triageStoreState.selectedScratchId = "scratch-1";
  triageStoreState.stagedCandidates = {};
  useTriageStoreMock.mockImplementation(
    (
      selector: (state: {
        selectedScratchId: string | null;
        stagedCandidates: Record<string, unknown[]>;
      }) => unknown,
    ) => selector(triageStoreState),
  );
  useStagedCandidatesMock.mockReturnValue({ candidates: [] });
  useDroppableMock.mockReturnValue({ setNodeRef: vi.fn() });
  useDraggableMock.mockReturnValue({
    setNodeRef: vi.fn(),
    setActivatorNodeRef: vi.fn(),
    attributes: {},
    listeners: {},
    isDragging: false,
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("StagingZone", () => {
  it("keeps the confirmed-orphan alert shape headlessly renderable without a production proof caller", () => {
    const onDismiss = vi.fn();
    render(
      <StagingAlertBand
        copy="A staged Node was removed because its source no longer exists."
        onDismiss={onDismiss}
      />,
    );

    expect(
      screen.getByText(
        "A staged Node was removed because its source no longer exists.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /retry/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss Staging alert" }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
  it("renders the node zone container when type is node", () => {
    render(<StagingZone type="node" />);

    expect(screen.getByTestId("node-staging-zone")).toBeInTheDocument();
  });

  it("renders the bit zone container when type is bit", () => {
    render(<StagingZone type="bit" />);

    expect(screen.getByTestId("bit-staging-zone")).toBeInTheDocument();
  });

  it("renders a quiet Node well without a large empty placeholder", () => {
    render(<StagingZone type="node" />);

    const zone = screen.getByTestId("node-staging-zone");
    expect(zone).toHaveAttribute("data-empty", "true");
    expect(within(zone).queryByText(/no node candidates/i)).not.toBeInTheDocument();
    expect(within(zone).queryByTestId("node-empty-card")).not.toBeInTheDocument();
  });

  it("renders a quiet Bit well without a large empty placeholder", () => {
    render(<StagingZone type="bit" />);

    const zone = screen.getByTestId("bit-staging-zone");
    expect(zone).toHaveAttribute("data-empty", "true");
    expect(within(zone).queryByText(/no bit candidates/i)).not.toBeInTheDocument();
    expect(within(zone).queryByTestId("bit-empty-card")).not.toBeInTheDocument();
  });

  it("renders Task 131 Node projections in createdAt DESC then ID order", () => {
    useStagedCandidatesMock.mockReturnValue({
      candidates: [
        createCandidate({ id: "node-b", content: "Newer B", createdAt: 3 }),
        createCandidate({ id: "bit-a", content: "Bit", resultType: "bit", createdAt: 4 }),
        createCandidate({ id: "node-old", content: "Older", createdAt: 2 }),
        createCandidate({ id: "node-a", content: "Newer A", createdAt: 3 }),
      ],
    });

    render(<StagingZone type="node" />);

    const zone = screen.getByTestId("node-staging-zone");
    const cards = within(zone).getAllByTestId("node-candidate-card");

    expect(useStagedCandidatesMock).toHaveBeenCalledWith("scratch-1");
    expect(cards.map((card) => card.textContent)).toEqual([
      "Newer A",
      "Newer B",
      "Older",
    ]);
    expect(within(zone).queryByText("Bit")).not.toBeInTheDocument();
  });

  it("renders Task 131 Bit projections as text rows", () => {
    useStagedCandidatesMock.mockReturnValue({
      candidates: [
        createCandidate({ id: "node-1", content: "Project outline" }),
        createCandidate({ id: "bit-1", content: "Call Sam", resultType: "bit", createdAt: 3 }),
        createCandidate({ id: "bit-2", content: "Draft the note", resultType: "bit", createdAt: 2 }),
      ],
    });

    render(<StagingZone type="bit" />);

    const zone = screen.getByTestId("bit-staging-zone");
    const rows = within(zone).getAllByTestId("bit-candidate-row");

    expect(rows).toHaveLength(2);
    expect(within(zone).getByText("Call Sam")).toBeInTheDocument();
    expect(within(zone).getByText("Draft the note")).toBeInTheDocument();
    expect(within(zone).queryByText("Project outline")).not.toBeInTheDocument();
  });

  it("uses the whole candidate root as the only pointer drag activator", () => {
    const onPointerDown = vi.fn();
    useStagedCandidatesMock.mockReturnValue({
      candidates: [createCandidate({ content: "Whole root" })],
    });
    useDraggableMock.mockReturnValue({
      setNodeRef: vi.fn(),
      attributes: { role: "button", tabIndex: 0 },
      listeners: { onPointerDown },
      isDragging: false,
    });

    render(<StagingZone type="node" />);

    const root = screen.getByTestId("node-candidate-card");
    expect(root).toHaveAttribute("role", "button");
    expect(root).toHaveAttribute("tabindex", "0");
    expect(root).toHaveClass(
      "touch-none",
      "focus-visible:ring-2",
      "motion-reduce:transition-none",
    );
    expect(root.querySelector("button, [data-dnd-handle]")).toBeNull();
    expect(root).not.toHaveAttribute("onclick");
    expect(root).toHaveAttribute("data-triage-drag-source", "staged-root");
    expect(root).toHaveAttribute("data-candidate-version", "1");
    expect(root).toHaveAttribute("data-source-version", "1");
    root.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(onPointerDown).toHaveBeenCalledOnce();

    expect(useDraggableMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          candidateLifecycle: "staged",
          candidateVersion: 1,
          resultType: "node",
          scratchId: "scratch-1",
          sourceLifecycle: "active",
          sourceVersion: 1,
        }),
      }),
    );
  });

  it("keeps the durable candidate rendered but disables it throughout an Unstage lock", () => {
    operationLockState.activeOperation = {
      kind: "unstage",
      operationId: "unstage-1",
    };
    useStagedCandidatesMock.mockReturnValue({
      candidates: [createCandidate({ id: "candidate-1", content: "Returning" })],
    });

    render(<StagingZone type="node" />);

    expect(screen.getByText("Returning")).toBeInTheDocument();
    expect(useDraggableMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "triage-staged-node:candidate-1",
        disabled: true,
      }),
    );
  });

  it("preserves focus on a surviving candidate across remote arrival and removal", () => {
    const first = createCandidate({ id: "candidate-1", content: "Focused" });
    const remote = createCandidate({
      id: "candidate-2",
      content: "Remote",
      createdAt: 2,
    });
    useDraggableMock.mockReturnValue({
      setNodeRef: vi.fn(),
      attributes: { role: "button", tabIndex: 0 },
      listeners: {},
      isDragging: false,
    });
    useStagedCandidatesMock.mockReturnValue({ candidates: [first] });

    const view = render(<StagingZone type="node" />);
    screen.getByText("Focused").closest<HTMLElement>("[role=button]")?.focus();
    expect(document.activeElement).toHaveTextContent("Focused");

    useStagedCandidatesMock.mockReturnValue({ candidates: [remote, first] });
    view.rerender(<StagingZone type="node" />);
    expect(document.activeElement).toHaveTextContent("Focused");

    useStagedCandidatesMock.mockReturnValue({ candidates: [first] });
    view.rerender(<StagingZone type="node" />);
    expect(document.activeElement).toHaveTextContent("Focused");
  });

  it("releases a removed candidate DOM owner through exact drag invalidation", () => {
    const candidate = createCandidate({
      id: "candidate-remote-removed",
      content: "Removed remotely",
      source: {
        id: "source-remote-removed",
        scratchBitId: "scratch-1",
        content: "Removed remotely",
        order: 0,
        createdAt: 1,
        consumedAt: null,
        version: 4,
      },
      sourceBreakdownId: "source-remote-removed",
      version: 3,
    });
    useStagedCandidatesMock.mockReturnValue({ candidates: [candidate] });

    const view = render(<StagingZone type="node" />);
    useStagedCandidatesMock.mockReturnValue({ candidates: [] });
    view.rerender(<StagingZone type="node" />);

    expect(invalidateTriageDragSourceMock).toHaveBeenCalledWith({
      kind: "triage-staged-node",
      id: "candidate-remote-removed",
      label: "Removed remotely",
      scratchId: "scratch-1",
      sourceBreakdownId: "source-remote-removed",
      sourceVersion: 4,
      sourceLifecycle: "active",
      candidateVersion: 3,
      candidateLifecycle: "staged",
      resultType: "node",
    });
  });

  it("keeps overflow candidates in an independently scrollable hidden-scroll well", () => {
    useStagedCandidatesMock.mockReturnValue({
      candidates: Array.from({ length: 8 }, (_, index) =>
        createCandidate({
          id: `bit-${index}`,
          content: `Bit ${index}`,
          resultType: "bit",
          createdAt: index,
        }),
      ),
    });

    render(<StagingZone type="bit" />);

    const zone = screen.getByTestId("bit-staging-zone");
    expect(zone).toHaveClass(
      "h-full",
      "min-h-0",
      "max-h-full",
      "overflow-y-auto",
      "[contain:size]",
    );
    expect(zone).toHaveClass("[scrollbar-width:none]");
    expect(within(zone).getByText("Bit 0")).toBeInTheDocument();
  });
});

function makeDragItem(kind: TriageDragItem extends null ? never : NonNullable<TriageDragItem>["kind"]): NonNullable<TriageDragItem> {
  return { kind, id: "drag-1", label: "Dragged item" };
}

describe("StagingZone — drop zone state classes", () => {
  it.each(["node", "bit"] as const)("tracks actual %s hover separately from staged neutral state and clears it on exit", (type) => {
    const activeDragItem = makeDragItem(type === "node" ? "triage-staged-node" : "triage-staged-bit");
    const { rerender } = render(<StagingZone type={type} activeDragItem={activeDragItem} overTargetId={null} />);
    const zone = screen.getByTestId(`${type}-staging-zone`);
    expect(zone).toHaveAttribute("data-triage-state", "neutral");
    expect(zone).toHaveAttribute("data-triage-hover", "false");
    rerender(<StagingZone type={type} activeDragItem={activeDragItem} overTargetId={`triage-${type}-zone-drop`} />);
    expect(zone).toHaveAttribute("data-triage-state", "neutral");
    expect(zone).toHaveAttribute("data-triage-hover", "true");
    rerender(<StagingZone type={type} activeDragItem={activeDragItem} overTargetId={null} />);
    expect(zone).toHaveAttribute("data-triage-hover", "false");
  });

  it.each(["node", "bit"] as const)("retains unavailable meaning when the opposite staged type hovers over %s", (type) => {
    render(<StagingZone type={type} activeDragItem={makeDragItem(type === "node" ? "triage-staged-bit" : "triage-staged-node")} overTargetId={`triage-${type}-zone-drop`} />);
    const zone = screen.getByTestId(`${type}-staging-zone`);
    expect(zone).toHaveAttribute("data-triage-state", "unavailable");
    expect(zone).toHaveAttribute("data-triage-hover", "true");
    expect(zone).toHaveClass("cursor-not-allowed");
  });

  it("Node Zone shows valid state when a breakdown row hovers over it", () => {
    render(
      <StagingZone
        type="node"
        activeDragItem={makeDragItem("triage-breakdown")}
        overTargetId="triage-node-zone-drop"
      />,
    );
    const zone = screen.getByTestId("node-staging-zone");
    expect(zone).toHaveClass("border-primary");
    expect(zone).toHaveClass("bg-accent");
  });

  it("Bit Zone shows valid state when a breakdown row hovers over it", () => {
    render(
      <StagingZone
        type="bit"
        activeDragItem={makeDragItem("triage-breakdown")}
        overTargetId="triage-bit-zone-drop"
      />,
    );
    const zone = screen.getByTestId("bit-staging-zone");
    expect(zone).toHaveClass("border-primary");
    expect(zone).toHaveClass("bg-accent");
  });

  it("Bit Zone shows invalid state when a staged-node hovers over it", () => {
    render(
      <StagingZone
        type="bit"
        activeDragItem={makeDragItem("triage-staged-node")}
        overTargetId="triage-bit-zone-drop"
      />,
    );
    const zone = screen.getByTestId("bit-staging-zone");
    expect(zone).toHaveClass("border-muted");
    expect(zone).toHaveClass("cursor-not-allowed");
  });

  it("Node Zone shows invalid state when a staged-bit hovers over it", () => {
    render(
      <StagingZone
        type="node"
        activeDragItem={makeDragItem("triage-staged-bit")}
        overTargetId="triage-node-zone-drop"
      />,
    );
    const zone = screen.getByTestId("node-staging-zone");
    expect(zone).toHaveClass("border-muted");
    expect(zone).toHaveClass("cursor-not-allowed");
  });

  it("Node Zone shows idle-valid hint when a breakdown drag is active but not hovering", () => {
    render(
      <StagingZone
        type="node"
        activeDragItem={makeDragItem("triage-breakdown")}
        overTargetId={null}
      />,
    );
    const zone = screen.getByTestId("node-staging-zone");
    expect(zone).toHaveClass("border-dashed");
    expect(zone).toHaveClass("border-muted");
  });

  it("Bit Zone shows no hint when an incompatible drag is active but not hovering (idle-invalid)", () => {
    render(
      <StagingZone
        type="bit"
        activeDragItem={makeDragItem("triage-staged-node")}
        overTargetId={null}
      />,
    );
    const zone = screen.getByTestId("bit-staging-zone");
    expect(zone).not.toHaveClass("border-dashed");
    expect(zone).not.toHaveClass("border-muted");
  });
});

describe("StagingZone — DP-VQ06-STAGING state projection", () => {
  it("renders Stage pending in a non-draggable final Node shape", () => {
    render(
      <StagingZone
        type="node"
        projection={{
          candidates: [],
          integrityCandidates: [],
          operations: [
            {
              operationId: "stage-1",
              scratchBitId: "scratch-1",
              candidateId: "candidate-pending",
              sourceBreakdownId: "breakdown-1",
              kind: "stage",
              phase: "pending",
              resultType: "node",
              title: "Project plan",
            },
          ],
        }}
      />,
    );

    // Task 176A (e): no in-card line while pending; the projection shows the
    // candidate's icon and title in the durable card's layout.
    const card = screen.getByTestId("node-operation-card");
    expect(card).toHaveAttribute("data-triage-state", "pending");
    expect(within(card).getByText("Project plan")).toHaveClass("triage-staging__node-label");
    expect(card.querySelector("svg")).not.toBeNull();
    expect(screen.queryByText("Staging “Project plan”…")).not.toBeInTheDocument();
    expect(card.querySelector('[data-triage-role="staging-operation-status"]')).toBeNull();
    expect(useDraggableMock).not.toHaveBeenCalled();
  });

  it("attaches Unstage unknown to the durable candidate without removing it", () => {
    const staged = createCandidate({ id: "candidate-1", content: "Keep me" });
    render(
      <StagingZone
        type="node"
        projection={{
          candidates: [staged],
          integrityCandidates: [],
          operations: [
            {
              operationId: "unstage-1",
              scratchBitId: "scratch-1",
              candidateId: staged.id,
              sourceBreakdownId: staged.sourceBreakdownId,
              kind: "unstage",
              phase: "unknown",
              resultType: "node",
              title: staged.content,
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("Keep me")).toBeInTheDocument();
    expect(
      screen.getByText("We couldn’t confirm whether “Keep me” was returned."),
    ).toHaveAttribute("data-triage-state", "unknown");
    expect(useDraggableMock).toHaveBeenCalledOnce();
  });

  it("renders unresolved source as a type-shaped integrity status, never a candidate", () => {
    const unresolved = createCandidate({ id: "missing-1", content: "Unavailable" });
    render(
      <StagingZone
        type="node"
        projection={{
          candidates: [],
          integrityCandidates: [
            {
              candidate: unresolved,
              status: "source-unresolved",
              reason: "subscription-miss",
            },
          ],
          operations: [],
        }}
      />,
    );

    expect(screen.getByText("Checking a staged Node source…")).toHaveAttribute(
      "data-triage-role",
      "staging-integrity-status",
    );
    expect(screen.queryByText("Unavailable")).not.toBeInTheDocument();
    expect(useDraggableMock).not.toHaveBeenCalled();
  });

  it("attaches exact same-type, opposite-type, and invalid reasons only to the active target", () => {
    const stagedNode = {
      kind: "triage-staged-node",
      id: "candidate-1",
      label: "Node",
      integrity: "current",
    } satisfies NonNullable<TriageDragItem>;
    const view = render(
      <StagingZone
        activeDragItem={stagedNode}
        overTargetId="triage-node-zone-drop"
        type="node"
      />,
    );
    expect(screen.getByText("Already in Nodes.")).toBeInTheDocument();

    view.rerender(
      <StagingZone
        activeDragItem={stagedNode}
        overTargetId="triage-bit-zone-drop"
        type="bit"
      />,
    );
    expect(
      screen.getByText("Return to Breakdown before changing type."),
    ).toBeInTheDocument();

    view.rerender(
      <StagingZone
        activeDragItem={{ ...stagedNode, integrity: "invalidated" }}
        overTargetId="triage-node-zone-drop"
        type="node"
      />,
    );
    expect(screen.getByText("This item is no longer available.")).toBeInTheDocument();
  });
});


describe("L3 semantic state distinctions", () => {
  it.each(["node", "bit"] as const)("keeps cancelled %s source invalidation from presenting an active target", type => {
    render(<StagingZone type={type} activeDragItem={{ ...makeDragItem("triage-breakdown")!, integrity: "invalidated" }} overTargetId={null} />);
    expect(screen.getByTestId(`${type}-staging-zone`)).toHaveAttribute("data-triage-state", "idle-invalid");
    expect(screen.queryByText("This item is no longer available.")).not.toBeInTheDocument();
  });
  it.each(["node", "bit"] as const)("keeps %s same-type neutral, opposite-type unavailable and invalidated separate", type => {
    const dropId = `triage-${type}-zone-drop`;
    const view = render(<StagingZone type={type} activeDragItem={makeDragItem(`triage-staged-${type}`)} overTargetId={dropId} />);
    expect(screen.getByTestId(`${type}-staging-zone`)).toHaveAttribute("data-triage-state", "neutral");
    view.rerender(<StagingZone type={type} activeDragItem={makeDragItem(type === "node" ? "triage-staged-bit" : "triage-staged-node")} overTargetId={dropId} />);
    expect(screen.getByTestId(`${type}-staging-zone`)).toHaveAttribute("data-triage-state", "unavailable");
    view.rerender(<StagingZone type={type} activeDragItem={{ ...makeDragItem("triage-breakdown")!, integrity: "invalidated" }} overTargetId={dropId} />);
    expect(screen.getByTestId(`${type}-staging-zone`)).toHaveAttribute("data-triage-state", "invalid");
  });
});

describe("StagingSubsection drop region", () => {
  it("registers the node and bit drop ids on the subsection, with heading and well inside it", () => {
    useDroppableMock.mockReturnValue({ setNodeRef: vi.fn(), isOver: false });
    useDroppableMock.mockClear();
    render(
      <>
        <StagingSubsection className="s-node" type="node"><h3>Nodes</h3><div data-testid="inside-node" /></StagingSubsection>
        <StagingSubsection className="s-bit" type="bit"><h3>Bits</h3></StagingSubsection>
      </>,
    );
    const ids = useDroppableMock.mock.calls.map(([arg]) => [arg.id, arg.data.kind]);
    expect(ids).toEqual([
      ["triage-node-zone-drop", "triage-node-zone-drop"],
      ["triage-bit-zone-drop", "triage-bit-zone-drop"],
    ]);
    expect(screen.getByText("Nodes").closest('[data-triage-role="staging-node-subsection"]')).toContainElement(screen.getByTestId("inside-node"));
  });

  it.each([
    ["node", { kind: "triage-breakdown", id: "b", label: "x" }, "node-zone-drop", "valid"],
    ["bit", { kind: "triage-staged-node", id: "c", label: "x" }, "bit-zone-drop", "unavailable"],
    ["bit", { kind: "triage-staged-bit", id: "c", label: "x" }, "bit-zone-drop", "neutral"],
  ] as const)("projects %s subsection state from the drag and the pointer target", (type, item, zone, expected) => {
    useDroppableMock.mockReturnValue({ setNodeRef: vi.fn(), isOver: false });
    useDroppableMock.mockClear();
    render(<StagingSubsection activeDragItem={item as unknown as TriageDragItem} className="s" overTargetId={`triage-${zone}`} type={type}><span /></StagingSubsection>);
    const dropId = useDroppableMock.mock.calls[0][0].id as string;
    cleanup();
    render(<StagingSubsection activeDragItem={item as unknown as TriageDragItem} className="s" overTargetId={dropId} type={type}><span /></StagingSubsection>);
    const region = document.querySelector(`[data-triage-role="staging-${type}-subsection"]`);
    expect(region).toHaveAttribute("data-triage-hover", "true");
    expect(region).toHaveAttribute("data-triage-state", expected);
  });

describe("StagingZone — commit-to-snapshot repair (Task 176A)", () => {
  type View = NonNullable<
    ComponentProps<typeof StagingZone>["projection"]
  >["operations"][number];

  function operation(overrides: Partial<View>): View {
    return {
      operationId: "op-1",
      scratchBitId: "scratch-1",
      candidateId: "candidate-1",
      sourceBreakdownId: "breakdown-1",
      kind: "unstage",
      phase: "pending",
      resultType: "node",
      title: "Keep me",
      ...overrides,
    };
  }

  function renderCard(op: View | null, isDragging = false) {
    useDraggableMock.mockReturnValue({
      setNodeRef: vi.fn(),
      setActivatorNodeRef: vi.fn(),
      attributes: {},
      listeners: {},
      isDragging,
    });
    const staged = createCandidate({ id: "candidate-1", content: "Keep me" });
    render(
      <StagingZone
        type="node"
        projection={{
          candidates: [staged],
          integrityCandidates: [],
          operations: op === null ? [] : [op],
        }}
      />,
    );
    return screen.getByTestId("node-candidate-card");
  }

  it("renders Stage projections above the cards, newest first", () => {
    const first = createCandidate({ id: "candidate-a", content: "Existing" });
    render(
      <StagingZone
        type="node"
        projection={{
          candidates: [first],
          integrityCandidates: [],
          operations: [
            operation({ operationId: "s1", candidateId: "p1", kind: "stage", title: "Older" }),
            operation({ operationId: "s2", candidateId: "p2", kind: "stage", title: "Newer" }),
          ],
        }}
      />,
    );

    const order = screen
      .getAllByTestId(/node-(operation|candidate)-card/)
      .map((element) => element.textContent);
    expect(order[0]).toContain("Newer");
    expect(order[1]).toContain("Older");
    expect(order[2]).toContain("Existing");
  });

  it("orders projections by issue sequence, not by phase group", () => {
    render(
      <StagingZone
        type="node"
        projection={{
          candidates: [],
          integrityCandidates: [],
          operations: [
            operation({ operationId: "b", candidateId: "pb", kind: "stage", title: "Newer", sequence: 2 }),
            operation({ operationId: "a", candidateId: "pa", kind: "stage", title: "Held older", sequence: 1, held: true }),
          ],
        }}
      />,
    );
    const order = screen
      .getAllByTestId("node-operation-card")
      .map((element) => element.textContent);
    expect(order[0]).toContain("Newer");
    expect(order[1]).toContain("Held older");
  });

  it("keeps the card dimmed while its Unstage is pending, with the status line outside any dimmed element", () => {
    const card = renderCard(operation({ phase: "pending" }), false);

    expect(card).toHaveAttribute("data-triage-dimmed", "true");
    expect(card).not.toHaveClass("opacity-30");
    // Task 176A (e): pending shows no in-card line.
    expect(screen.queryByText("Returning “Keep me” to Breakdown…")).not.toBeInTheDocument();
  });

  it("keeps the in-card line for unknown and reconciling, outside any dimmed element", () => {
    renderCard(operation({ phase: "unknown" }));
    const unknown = screen.getByText("We couldn’t confirm whether “Keep me” was returned.");
    expect(unknown).toHaveAttribute("data-triage-state", "unknown");
    expect(unknown.closest(".opacity-30")).toBeNull();
    cleanup();
    renderCard(operation({ phase: "reconciling" }));
    expect(screen.getByText("Checking whether “Keep me” was returned…")).toBeInTheDocument();
    cleanup();
    renderCard(operation({ phase: "reconciling", held: true }));
    expect(screen.getByText("Checking whether “Keep me” was returned…")).toBeInTheDocument();
    cleanup();
    renderCard(operation({ phase: "pending", held: true }));
    expect(screen.queryByText(/Returning/)).not.toBeInTheDocument();
  });

  it("renders a Stage projection with the candidate's title in the durable layout and keeps the unknown line", () => {
    render(
      <StagingZone
        type="bit"
        projection={{
          candidates: [],
          integrityCandidates: [],
          operations: [
            operation({ kind: "stage", resultType: "bit", candidateId: "p1", title: "Plan it", phase: "pending" }),
          ],
        }}
      />,
    );
    const row = screen.getByTestId("bit-operation-row");
    expect(row).toHaveClass("triage-staging__bit");
    expect(row).not.toHaveClass("cursor-grab");
    expect(within(row).getByText("Plan it")).toBeInTheDocument();
    expect(within(row).queryByText(/Staging/)).not.toBeInTheDocument();
    cleanup();
    render(
      <StagingZone
        type="bit"
        projection={{
          candidates: [],
          integrityCandidates: [],
          operations: [
            operation({ kind: "stage", resultType: "bit", candidateId: "p1", title: "Plan it", phase: "unknown" }),
          ],
        }}
      />,
    );
    expect(
      screen.getByText("We couldn’t confirm whether “Plan it” was staged."),
    ).toBeInTheDocument();
  });

  it("dims the dragged card with no operation, and does not dim unknown or reconciling Unstage", () => {
    expect(renderCard(null, true)).toHaveAttribute("data-triage-dimmed", "true");
    cleanup();
    expect(renderCard(operation({ phase: "unknown" }))).not.toHaveAttribute(
      "data-triage-dimmed",
    );
    cleanup();
    expect(renderCard(operation({ phase: "reconciling" }))).not.toHaveAttribute(
      "data-triage-dimmed",
    );
  });

  it("a held Unstage keeps the dimming of its phase, marks the hold and is not draggable", () => {
    const held = renderCard(operation({ phase: "pending", held: true }));
    expect(held).toHaveAttribute("data-triage-dimmed", "true");
    expect(held).toHaveAttribute("data-triage-hold", "true");
    expect(useDraggableMock).toHaveBeenCalledWith(
      expect.objectContaining({ disabled: true }),
    );
    cleanup();
    const heldReconciling = renderCard(
      operation({ phase: "reconciling", held: true }),
    );
    expect(heldReconciling).not.toHaveAttribute("data-triage-dimmed");
  });

  it("marks a held Stage projection", () => {
    render(
      <StagingZone
        type="bit"
        projection={{
          candidates: [],
          integrityCandidates: [],
          operations: [
            operation({
              kind: "stage",
              resultType: "bit",
              held: true,
              candidateId: "p1",
            }),
          ],
        }}
      />,
    );
    expect(screen.getByTestId("bit-operation-row")).toHaveAttribute(
      "data-triage-hold",
      "true",
    );
  });
});
});
