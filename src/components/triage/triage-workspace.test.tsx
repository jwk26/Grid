import "@testing-library/jest-dom/vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Profiler, StrictMode } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTriageStore } from "@/stores/triage-store";
import type {
  TriageDragItem,
  TriageTargetFeedback,
} from "@/hooks/use-dnd";
import type { TriagePlacementRelease } from "@/hooks/use-triage-placement";
import type { ScratchTitleBlockerHandle } from "@/hooks/use-scratch-breakdowns";
import {
  requestActiveTriageDeparture,
  type TriageDepartureController,
} from "@/hooks/use-triage-departure";
import type { Node } from "@/types";
import {
  TriageWorkspace,
  focusTrashOpener,
  pickTrashNeighbor,
  trashEntryFocus,
  trashNeighborFocus,
} from "./triage-workspace";

const globalsCss = readFileSync(
  join(process.cwd(), "src/app/globals.css"),
  "utf8",
);
const workspaceSource = readFileSync(
  join(process.cwd(), "src/components/triage/triage-workspace.tsx"),
  "utf8",
);

const useTriageDndMock = vi.hoisted(() => vi.fn());
const emittedPlacementReleases = vi.hoisted(() => new WeakSet<object>());
const useStagedCandidatesMock = vi.hoisted(() => vi.fn());
const useScratchBreakdownsMock = vi.hoisted(() => vi.fn());
const useCanArchiveScratchMock = vi.hoisted(() => vi.fn());
const useArchiveScratchMock = vi.hoisted(() => vi.fn());
const archiveScratchMock = vi.hoisted(() => vi.fn());
const archiveReconcileMock = vi.hoisted(() => vi.fn());
const archiveRetryMock = vi.hoisted(() => vi.fn());
const archiveDismissMock = vi.hoisted(() => vi.fn());
const stageCandidateMock = vi.hoisted(() => vi.fn());
const reconcileStageCandidateMock = vi.hoisted(() => vi.fn());
const unstageCandidateMock = vi.hoisted(() => vi.fn());
const reconcileUnstageCandidateMock = vi.hoisted(() => vi.fn());
const handlePlacementConfirmMock = vi.hoisted(() => vi.fn());
const handlePlacementCancelMock = vi.hoisted(() => vi.fn());
const stagingZoneRenderMock = vi.hoisted(() => vi.fn());
const useGridDataMock = vi.hoisted(() => vi.fn());
const useExplorerRemoteStatusMock = vi.hoisted(() => vi.fn());
const useInboxMock = vi.hoisted(() => vi.fn());
const useTrashScratchMock = vi.hoisted(() => vi.fn());
const useTrashScratchSnapshotMock = vi.hoisted(() => vi.fn());
const trashOwnerState = vi.hoisted(() => ({
  owner: null as null | {
    hasDiscardableWork: () => boolean;
    discard: () => void;
  },
}));
const getBitMock = vi.hoisted(() => vi.fn());
const getBitsMock = vi.hoisted(() => vi.fn());
const getDataStoreMock = vi.hoisted(() => vi.fn());
const placeDirectBreakdownMock = vi.hoisted(() => vi.fn());
const placeStagedCandidateMock = vi.hoisted(() => vi.fn());
const reconcileDirectPlacementMock = vi.hoisted(() => vi.fn());
const reconcileStagedPlacementMock = vi.hoisted(() => vi.fn());
const inboxState = vi.hoisted(() => ({ activeScratchBits: [] as Array<{ id: string; title: string }> }));
const breakdownSurfaceState = vi.hoisted(() => ({
  addDraft: "",
  editorDrafts: [] as Array<{ kind: "scratch-title" | "breakdown"; value: string }>,
  showSource: true,
}));
const titleBlockerHandleState = vi.hoisted(() => ({
  handle: null as ScratchTitleBlockerHandle | null,
}));
const departureControllerState = vi.hoisted(() => ({
  controller: null as TriageDepartureController | null,
}));
const completionState = vi.hoisted(() => ({
  presentation: "working" as "working" | "overlay" | "complete",
  completionBlockers: { addDraft: false, title: null as null | "dirty" },
  withdrawalReason: null as null | "active-breakdown",
  cancel: vi.fn(),
  reopen: vi.fn(),
  archive: undefined as undefined | (() => Promise<boolean>),
  eligibility: {
    scratch: {
      id: "scratch-1",
      version: 7,
      title: "First Scratch",
      createdAt: 3,
    },
  },
}));

vi.mock("@/hooks/use-dnd", () => ({
  useTriageDnd: (
    selectedScratchId: string | null,
    options: { beginPlacement: (release: TriagePlacementRelease) => boolean },
  ) => {
    const state = useTriageDndMock(selectedScratchId, options) as DndState;
    if (
      state.placementRelease !== null &&
      !emittedPlacementReleases.has(state.placementRelease)
    ) {
      emittedPlacementReleases.add(state.placementRelease);
      options.beginPlacement(state.placementRelease);
    }
    return state;
  },
}));

vi.mock("@/hooks/use-staged-candidates", () => ({
  useStagedCandidates: useStagedCandidatesMock,
}));

vi.mock("@/hooks/use-scratch-breakdowns", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/hooks/use-scratch-breakdowns")
  >();
  return { ...actual, useScratchBreakdowns: useScratchBreakdownsMock };
});

vi.mock("@/hooks/use-can-archive-scratch", () => ({
  useCanArchiveScratch: useCanArchiveScratchMock,
}));

vi.mock("@/hooks/use-archive-scratch", () => ({
  useArchiveScratch: useArchiveScratchMock,
}));

vi.mock("@/hooks/use-grid-data", () => ({
  useGridData: useGridDataMock,
}));

vi.mock("@/hooks/use-explorer-remote-status", () => ({
  useExplorerRemoteStatus: useExplorerRemoteStatusMock,
}));

vi.mock("@/hooks/use-trash-scratch", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/use-trash-scratch")>();
  return {
    ...actual,
    useTrashScratch: useTrashScratchMock,
    useTrashScratchSnapshot: useTrashScratchSnapshotMock,
  };
});

vi.mock("@/hooks/use-inbox", () => ({
  useInbox: useInboxMock,
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

vi.mock("@/components/triage/scratch-pool", async () => {
  const { useTriageStore } = await import("@/stores/triage-store");
  const { useTrashScratchEntries } = await import("@/hooks/use-trash-scratch");
  return {
    ScratchPool: () => {
      const entries = useTrashScratchEntries();
      return (
      <div data-testid="scratch-pool">
        <button
          data-scratch-trash-entry="pool"
          type="button"
          onClick={(event) => entries?.request("scratch-2", event.currentTarget)}
        >
          Trash second
        </button>
        <span data-testid="trash-reason">
          {entries?.disabledReason("scratch-2") ?? "none"}
        </span>
        <h2 id="triage-scratch-pool-heading" data-triage-role="section-header" tabIndex={-1}>Scratch Pool</h2>
        {[
          ["scratch-2", "Second Scratch"],
          ["scratch-3", "Third Scratch"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => useTriageStore.getState().selectScratch(id)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                useTriageStore.getState().selectScratch(id);
              }
            }}
          >
            {label}
          </button>
        ))}
      </div>
      );
    },
  };
});

vi.mock("@/components/triage/breakdown-panel", async () => {
  const { useScratchTitleBlockerContext } = await import(
    "@/hooks/use-scratch-breakdowns"
  );
  const { useTriageDepartureContext } = await import(
    "@/hooks/use-triage-departure"
  );
  const { useTriageStore } = await import("@/stores/triage-store");
  const { TrashDraftRegistryContext } = await import("@/hooks/use-trash-scratch");
  const { useContext, useEffect } = await import("react");
  return {
    ArchiveOperationCard: ({
      operation,
      onCancel,
    }: {
      operation: { state: { phase: string }; isRecoveryProjection: boolean };
      onCancel?: () => void;
    }) => (
      <div
        data-is-recovery-projection={String(operation.isRecoveryProjection)}
        data-phase={operation.state.phase}
        data-testid="archive-recovery-card"
      >
        {operation.state.phase === "terminal" ? (
          <button type="button" onClick={onCancel}>Cancel</button>
        ) : null}
      </div>
    ),
    BreakdownPanel: ({
      activeDragItem,
      completion,
      onAddDraftBlockerChange,
      overTargetId,
      selectedScratch,
      successSignal,
    }: {
      activeDragItem?: TriageDragItem;
      selectedScratch?: { id: string; title: string } | null;
      completion?: typeof completionState;
      onAddDraftBlockerChange?: (blocked: boolean) => void;
      overTargetId?: string | null;
      successSignal?: {
        kind: "add" | "unstage";
        operationId: string;
        rowId: string;
      } | null;
    }) => {
      titleBlockerHandleState.handle = useScratchTitleBlockerContext();
      departureControllerState.controller = useTriageDepartureContext();
      const registerTrashOwner = useContext(TrashDraftRegistryContext);
      useEffect(
        () =>
          registerTrashOwner?.({
            hasDiscardableWork: () => trashOwnerState.owner?.hasDiscardableWork() ?? false,
            discard: () => trashOwnerState.owner?.discard(),
          }),
        [registerTrashOwner],
      );
      const selectedScratchId = useTriageStore((state) => state.selectedScratchId);
      return (
        <div
          data-active-drag-kind={activeDragItem?.kind}
          data-completion-presentation={completion?.presentation}
          data-archive-phase={
            (completion as { archiveOperation?: { state: { phase: string } } })
              ?.archiveOperation?.state.phase
          }
          data-add-completion-blocker={
            completion?.completionBlockers.addDraft ? "true" : undefined
          }
          data-title-completion-blocker={
            completion?.completionBlockers.title ?? undefined
          }
          data-withdrawal-reason={completion?.withdrawalReason ?? undefined}
          data-over-target-id={overTargetId ?? undefined}
          data-selected-scratch-id={selectedScratch?.id}
          data-selected-scratch-title={selectedScratch?.title}
          data-success-kind={successSignal?.kind}
          data-success-operation-id={successSignal?.operationId}
          data-success-row-id={successSignal?.rowId}
          data-testid="breakdown-panel"
        >
          <button type="button" onClick={() => completion?.cancel()}>
            Cancel completion
          </button>
          <button type="button" onClick={() => completion?.reopen()}>
            Reopen completion
          </button>
          <button type="button" onClick={() => void completion?.archive?.()}>
            Archive completion
          </button>
          <button type="button" onClick={() => onAddDraftBlockerChange?.(true)}>
            Set Add blocker
          </button>
          {breakdownSurfaceState.showSource ? (
            <div data-breakdown-id="breakdown-1">
              <button aria-label="Drag breakdown" type="button">
                Source grip
              </button>
            </div>
          ) : null}
          <div data-testid="selected-scratch-context" tabIndex={-1}>
            Context for {selectedScratchId ?? "none"}
            {breakdownSurfaceState.editorDrafts
              .filter((draft) => draft.kind === "scratch-title")
              .map((draft) => (
                <div className="triage-inline-editor" data-triage-editor-state="dirty" key={draft.value}>
                  <input data-triage-role="inline-editor-field" readOnly value={draft.value} />
                </div>
              ))}
          </div>
          {breakdownSurfaceState.editorDrafts
            .filter((draft) => draft.kind === "breakdown")
            .map((draft) => (
              <div data-testid="breakdown-row" key={draft.value}>
                <div className="triage-inline-editor" data-triage-editor-state="dirty">
                  <input data-triage-role="inline-editor-field" readOnly value={draft.value} />
                </div>
              </div>
            ))}
          {breakdownSurfaceState.addDraft ? (
            <input
              data-triage-role="breakdown-add-field"
              readOnly
              value={breakdownSurfaceState.addDraft}
            />
          ) : null}
        </div>
      );
    },
  };
});

vi.mock("@/components/triage/staging-zone", () => ({
  StagingSubsection: ({
    children,
    className,
    type,
  }: {
    children: React.ReactNode;
    className: string;
    type: "node" | "bit";
  }) => (
    <div className={className} data-triage-role={`staging-${type}-subsection`}>
      {children}
    </div>
  ),
  StagingAlertBand: ({
    copy,
    onDismiss,
  }: {
    copy: string;
    onDismiss: () => void;
  }) => (
    <div data-triage-role="staging-local-alert">
      <span>{copy}</span>
      <button aria-label="Dismiss Staging alert" type="button" onClick={onDismiss}>
        X
      </button>
    </div>
  ),
  StagingZone: (props: {
    type: "node" | "bit";
    newCandidateIds?: ReadonlySet<string>;
    projection?: { candidates?: Array<{ id: string; content: string }> };
    onObservedTop?: () => void;
  }) => {
    stagingZoneRenderMock(props);
    return (
      <div
        data-testid={`${props.type}-staging-zone`}
        data-triage-role={`staging-${props.type}-well`}
      >
        {props.projection?.candidates?.map((candidate) => (
          <button data-candidate-id={candidate.id} key={candidate.id} type="button">
            {candidate.content}
          </button>
        ))}
      </div>
    );
  },
}));

function createNode(overrides: Partial<Node> = {}): Node {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    title: overrides.title ?? "Inbox",
    color: overrides.color ?? "hsl(221, 83%, 53%)",
    icon: overrides.icon ?? "inbox",
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
    systemRole: overrides.systemRole ?? "inbox",
    hiddenFromGrid: overrides.hiddenFromGrid ?? false,
    version: overrides.version ?? 1,
    pastDeadlineDismissed: overrides.pastDeadlineDismissed ?? false,
  };
}

type DndState = {
  sensors: unknown[];
  activeDragItem: TriageDragItem;
  overTargetId: string | null;
  placementRelease: TriagePlacementRelease | null;
  localPlacementResult: null | { id: string; type: "node" | "bit" };
  handleDragStart: ReturnType<typeof vi.fn>;
  handleDragEnd: ReturnType<typeof vi.fn>;
  handleDragCancel: ReturnType<typeof vi.fn>;
  handleDragOver: ReturnType<typeof vi.fn>;
  handlePlacementConfirm: ReturnType<typeof vi.fn>;
  handlePlacementCancel: ReturnType<typeof vi.fn>;
  refreshRenderedTarget: ReturnType<typeof vi.fn>;
  targetFeedback: TriageTargetFeedback;
};

function createDndState(overrides: Partial<DndState> = {}): DndState {
  return {
    sensors: [],
    activeDragItem: null,
    overTargetId: null,
    placementRelease: null,
    localPlacementResult: null,
    handleDragStart: vi.fn(),
    handleDragEnd: vi.fn(),
    handleDragCancel: vi.fn(),
    handleDragOver: vi.fn(),
    handlePlacementConfirm: handlePlacementConfirmMock,
    handlePlacementCancel: handlePlacementCancelMock,
    refreshRenderedTarget: vi.fn(),
    targetFeedback: null,
    ...overrides,
  };
}

function createDirectPlacementRelease(
  overrides: Partial<TriagePlacementRelease> = {},
): TriagePlacementRelease {
  return {
    kind: "direct",
    scratchBitId: "scratch-1",
    source: { id: "breakdown-1", title: "Project", version: 1 },
    target: {
      dropId: "triage-hierarchy:parent-1",
      parentId: "parent-1",
      level: 0,
      title: "Parent",
      path: ["Home", "Parent"],
      expectedAncestorIds: ["parent-1"],
      cell: { x: 0, y: 0 },
      isFull: false,
    },
    ...overrides,
  };
}

function createStagedPlacementRelease(
  overrides: Partial<TriagePlacementRelease> = {},
): TriagePlacementRelease {
  return createDirectPlacementRelease({
    kind: "staged",
    source: { id: "breakdown-1", title: "s".repeat(201), version: 1 },
    candidate: { id: "candidate-1", resultType: "bit", version: 3 },
    ...overrides,
  });
}

function authoritativeBreakdown(
  overrides: Record<string, unknown> = {},
) {
  return {
    id: "breakdown-1",
    scratchBitId: "scratch-1",
    content: "Project",
    order: 0,
    createdAt: 1,
    consumedAt: null,
    version: 1,
    ...overrides,
  };
}

function authoritativeCandidate(
  overrides: Record<string, unknown> = {},
) {
  const source = authoritativeBreakdown({ content: "s".repeat(201) });
  return {
    id: "candidate-1",
    scratchBitId: "scratch-1",
    sourceBreakdownId: "breakdown-1",
    resultType: "bit",
    lifecycle: "staged",
    createdAt: 1,
    updatedAt: 1,
    version: 3,
    content: source.content,
    source,
    ...overrides,
  };
}

beforeEach(() => {
  titleBlockerHandleState.handle = null;
  departureControllerState.controller = null;
  handlePlacementConfirmMock.mockReset();
  handlePlacementConfirmMock.mockResolvedValue(undefined);
  handlePlacementCancelMock.mockReset();
  stagingZoneRenderMock.mockReset();
  stageCandidateMock.mockReset();
  reconcileStageCandidateMock.mockReset();
  unstageCandidateMock.mockReset();
  reconcileUnstageCandidateMock.mockReset();
  useGridDataMock.mockReset();
  useGridDataMock.mockReturnValue({ nodes: [], bits: [], isLoading: false });
  useExplorerRemoteStatusMock.mockReset();
  useExplorerRemoteStatusMock.mockImplementation(({ pathIds }) => ({
    isReady: true,
    validPathIds: [...pathIds],
  }));
  inboxState.activeScratchBits = [
    { id: "scratch-2", title: "Second Scratch" },
    { id: "scratch-3", title: "Third Scratch" },
  ];
  getBitMock.mockReset();
  getBitMock.mockResolvedValue({
    id: "scratch-1",
    archivedAt: null,
    deletedAt: null,
  });
  getBitsMock.mockReset();
  getBitsMock.mockImplementation(async () =>
    inboxState.activeScratchBits.map((scratch, index) => ({
      ...scratch,
      createdAt: index + 1,
    })),
  );
  placeDirectBreakdownMock.mockReset();
  placeStagedCandidateMock.mockReset();
  reconcileDirectPlacementMock.mockReset();
  reconcileStagedPlacementMock.mockReset();
  placeDirectBreakdownMock.mockImplementation(async (command) => ({
    operationId: command.operationId,
    status: "applied",
    result: { id: command.resultId, title: command.title },
    source: null,
    candidate: null,
  }));
  placeStagedCandidateMock.mockImplementation(async (command) => ({
    operationId: command.operationId,
    status: "applied",
    result: { id: command.resultId, title: command.title },
    source: null,
    candidate: null,
  }));
  reconcileDirectPlacementMock.mockImplementation(placeDirectBreakdownMock);
  reconcileStagedPlacementMock.mockImplementation(placeStagedCandidateMock);
  getDataStoreMock.mockReset();
  getDataStoreMock.mockResolvedValue({
    getBit: getBitMock,
    getBits: getBitsMock,
    placeDirectBreakdown: placeDirectBreakdownMock,
    placeStagedCandidate: placeStagedCandidateMock,
    reconcileDirectPlacement: reconcileDirectPlacementMock,
    reconcileStagedPlacement: reconcileStagedPlacementMock,
  });
  useInboxMock.mockReset();
  useInboxMock.mockImplementation(() => inboxState);
  breakdownSurfaceState.addDraft = "";
  breakdownSurfaceState.editorDrafts = [];
  breakdownSurfaceState.showSource = true;
  useTriageStore.setState({
    selectedScratchId: "scratch-1",
    externalScratchRemoval: null,
    explorerPathIds: [],
    explorerOpenColumnIds: ["home"],
    scratchPoolQuery: "",
    scratchPoolActiveIds: ["scratch-1", "scratch-2", "scratch-3"],
    scratchPoolResultIds: ["scratch-1", "scratch-2", "scratch-3"],
  });
  useTriageDndMock.mockReset();
  useTriageDndMock.mockReturnValue(createDndState());
  useStagedCandidatesMock.mockReset();
  useStagedCandidatesMock.mockReturnValue({
    isReady: true,
    candidates: [],
    integrityCandidates: [],
    pendingOperations: [],
    unknownOperations: [],
    reconcilingOperations: [],
    counts: { nodes: 0, bits: 0, visibleNodes: 0, visibleBits: 0 },
    eligibility: { stagedSourceIds: new Set<string>() },
    stageCandidate: stageCandidateMock,
    reconcileStageCandidate: reconcileStageCandidateMock,
    unstageCandidate: unstageCandidateMock,
    reconcileUnstageCandidate: reconcileUnstageCandidateMock,
  });
  useScratchBreakdownsMock.mockReset();
  useScratchBreakdownsMock.mockReturnValue({
    breakdowns: [authoritativeBreakdown()],
    isReady: true,
  });
  completionState.presentation = "working";
  completionState.completionBlockers = { addDraft: false, title: null };
  completionState.withdrawalReason = null;
  completionState.cancel.mockReset();
  completionState.reopen.mockReset();
  useCanArchiveScratchMock.mockReset();
  useCanArchiveScratchMock.mockReturnValue(completionState);
  archiveScratchMock.mockReset();
  archiveScratchMock.mockResolvedValue(true);
  archiveReconcileMock.mockReset();
  archiveReconcileMock.mockResolvedValue(false);
  archiveRetryMock.mockReset();
  archiveRetryMock.mockResolvedValue(false);
  archiveDismissMock.mockReset();
  archiveDismissMock.mockReturnValue(true);
  trashOwnerState.owner = null;
  useTrashScratchSnapshotMock.mockReset();
  useTrashScratchSnapshotMock.mockReturnValue(null);
  useTrashScratchMock.mockReset();
  useTrashScratchMock.mockReturnValue(trashCoordinator());
  useArchiveScratchMock.mockReset();
  useArchiveScratchMock.mockReturnValue({
    state: { phase: "idle" },
    isProjectionReady: true,
    archiveScratch: archiveScratchMock,
    reconcile: archiveReconcileMock,
    retry: archiveRetryMock,
    dismissTerminal: archiveDismissMock,
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function trashCoordinator(overrides: Record<string, unknown> = {}) {
  return {
    state: { phase: "closed" },
    view: {
      scratch: null,
      candidateCount: 0,
      hasDiscardableWork: false,
      confirmDisabledReason: null,
    },
    unresolvedScratchIds: new Set<string>(),
    entryDisabledReason: vi.fn(() => null),
    open: vi.fn(() => ({ opened: true })),
    cancel: vi.fn(() => true),
    confirm: vi.fn(async () => true),
    retry: vi.fn(async () => true),
    reconcile: vi.fn(async () => true),
    ...overrides,
  };
}

describe("TriageWorkspace", () => {
  it("wires the mounted blockers, shared lock, guarded Archive action, and projection gate into one coordinator", () => {
    completionState.presentation = "overlay";
    render(<TriageWorkspace node={createNode()} />);

    const options = useArchiveScratchMock.mock.calls.at(-1)?.[0];
    expect(options).toMatchObject({
      operationLock: expect.objectContaining({
        acquire: expect.any(Function),
        isLocked: expect.any(Function),
      }),
      readAddDraftBlocker: expect.any(Function),
      readTitleBlocker: expect.any(Function),
      onApplied: expect.any(Function),
    });
    expect(options.readAddDraftBlocker()).toBe(false);
    expect(options.readTitleBlocker()).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Archive completion" }));
    expect(archiveScratchMock).toHaveBeenCalledWith(
      completionState.eligibility.scratch,
    );
  });

  it("passes the selected Scratch from the workspace read to the Breakdown panel (MI-22)", () => {
    inboxState.activeScratchBits = [
      { id: "scratch-1", title: "First Scratch" },
      { id: "scratch-2", title: "Second Scratch" },
    ];
    render(<TriageWorkspace node={createNode()} />);
    const panel = () => screen.getByTestId("breakdown-panel");
    expect(panel()).toHaveAttribute("data-selected-scratch-id", "scratch-1");
    expect(panel()).toHaveAttribute("data-selected-scratch-title", "First Scratch");

    act(() => useTriageStore.setState({ selectedScratchId: "scratch-2" }));
    expect(panel()).toHaveAttribute("data-selected-scratch-title", "Second Scratch");

    act(() => useTriageStore.setState({ selectedScratchId: "scratch-9" }));
    expect(panel()).not.toHaveAttribute("data-selected-scratch-id");
  });

  it("marks the shell as toggled only after the Pool changes size, and keeps the mark once set", () => {
    useTriageStore.setState({ scratchPoolExpanded: true });
    render(<TriageWorkspace node={createNode()} />);
    const shell = screen.getByTestId("triage-workspace");
    expect(shell).not.toHaveAttribute("data-triage-pool-toggled");

    act(() => useTriageStore.setState({ scratchPoolExpanded: false }));
    expect(shell).toHaveAttribute("data-triage-pool-toggled", "true");

    act(() => useTriageStore.setState({ scratchPoolExpanded: true }));
    expect(shell).toHaveAttribute("data-triage-pool-toggled", "true");
  });

  it("does not mark a shell that mounts with the Pool already collapsed", () => {
    useTriageStore.setState({ scratchPoolExpanded: false });
    render(<TriageWorkspace node={createNode()} />);
    expect(screen.getByTestId("triage-workspace")).not.toHaveAttribute(
      "data-triage-pool-toggled",
    );
  });

  it("does not mount the normal Inbox projection while reload reconciliation owns startup", () => {
    useArchiveScratchMock.mockReturnValue({
      state: {
        phase: "recovering",
        recovery: {
          operationId: "00000000-0000-4000-8000-000000000001",
          kind: "archive_scratch",
          scratchBitId: "scratch-1",
          expectedVersion: 7,
          startedAt: 100,
        },
      },
      isProjectionReady: false,
      archiveScratch: archiveScratchMock,
      reconcile: archiveReconcileMock,
      retry: archiveRetryMock,
      dismissTerminal: archiveDismissMock,
    });

    render(<TriageWorkspace node={createNode()} />);

    expect(screen.queryByTestId("triage-workspace")).not.toBeInTheDocument();
    expect(screen.queryByTestId("scratch-pool")).not.toBeInTheDocument();
    expect(screen.getByTestId("archive-recovery-card")).toHaveAttribute(
      "data-is-recovery-projection",
      "true",
    );
    expect(screen.getByTestId("archive-recovery-card")).toHaveAttribute(
      "data-phase",
      "recovering",
    );
    expect(screen.getByTestId("archive-live-region")).toHaveTextContent(
      "Checking the Archive request from before this reload…",
    );
    expect(useCanArchiveScratchMock).not.toHaveBeenCalled();
  });

  it("keeps a forced-reload terminal result in the Breakdown recovery boundary until Cancel", () => {
    useTriageStore.setState({ selectedScratchId: null });
    useArchiveScratchMock.mockReturnValue({
      state: {
        phase: "terminal",
        recovery: {
          operationId: "00000000-0000-4000-8000-000000000001",
          kind: "archive_scratch",
          scratchBitId: "scratch-1",
          expectedVersion: 7,
          startedAt: 100,
        },
        terminalStatus: "conflict",
      },
      isProjectionReady: true,
      archiveScratch: archiveScratchMock,
      reconcile: archiveReconcileMock,
      retry: archiveRetryMock,
      dismissTerminal: archiveDismissMock,
    });

    render(<TriageWorkspace node={createNode()} />);

    expect(screen.queryByTestId("triage-workspace")).not.toBeInTheDocument();
    expect(screen.getByTestId("archive-recovery-card")).toHaveAttribute(
      "data-is-recovery-projection",
      "true",
    );
    expect(screen.getByTestId("archive-recovery-card")).toHaveAttribute(
      "data-phase",
      "terminal",
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(archiveDismissMock).toHaveBeenCalledOnce();
  });

  it("projects the mounted coordinator state and exact actions into Breakdown", () => {
    useArchiveScratchMock.mockReturnValue({
      state: {
        phase: "unknown",
        recovery: {
          operationId: "00000000-0000-4000-8000-000000000001",
          kind: "archive_scratch",
          scratchBitId: "scratch-1",
          expectedVersion: 7,
          startedAt: 100,
        },
      },
      isProjectionReady: true,
      archiveScratch: archiveScratchMock,
      reconcile: archiveReconcileMock,
      retry: archiveRetryMock,
      dismissTerminal: archiveDismissMock,
    });

    render(<TriageWorkspace node={createNode()} />);

    expect(screen.getByTestId("breakdown-panel")).toHaveAttribute(
      "data-archive-phase",
      "unknown",
    );
    expect(screen.getByTestId("archive-live-region")).toHaveTextContent(
      "We couldn’t confirm whether this Scratch was archived.",
    );
    expect(screen.getByTestId("archive-live-region")).toHaveAttribute(
      "aria-live",
      "polite",
    );
    expect(screen.getByTestId("archive-live-region")).toHaveAttribute(
      "aria-atomic",
      "true",
    );
  });

  it.each(["applied", "already_applied"] as const)(
    "announces terminal %s once without projecting a lingering success card",
    (terminalStatus) => {
      useArchiveScratchMock.mockReturnValue({
        state: {
          phase: "terminal",
          recovery: {
            operationId: "00000000-0000-4000-8000-000000000001",
            kind: "archive_scratch",
            scratchBitId: "scratch-1",
            expectedVersion: 7,
            startedAt: 100,
          },
          terminalStatus,
        },
        isProjectionReady: true,
        archiveScratch: archiveScratchMock,
        reconcile: archiveReconcileMock,
        retry: archiveRetryMock,
        dismissTerminal: archiveDismissMock,
      });

      render(<TriageWorkspace node={createNode()} />);

      expect(screen.getByTestId("archive-live-region")).toHaveTextContent(
        "Scratch archived.",
      );
      expect(screen.queryByTestId("archive-recovery-card")).toBeNull();
      expect(screen.getByTestId("breakdown-panel")).not.toHaveAttribute(
        "data-archive-phase",
      );
    },
  );

  it("owns completion above the keyed Breakdown surface and combines Add/title blockers", () => {
    completionState.presentation = "overlay";
    render(<TriageWorkspace node={createNode()} />);

    expect(useCanArchiveScratchMock).toHaveBeenLastCalledWith("scratch-1", {
      hasAddDraft: false,
      titleBlocker: null,
    });
    expect(screen.getByTestId("breakdown-panel")).toHaveAttribute(
      "data-completion-presentation",
      "overlay",
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel completion" }));
    fireEvent.click(screen.getByRole("button", { name: "Reopen completion" }));
    expect(completionState.cancel).toHaveBeenCalledOnce();
    expect(completionState.reopen).toHaveBeenCalledOnce();

    completionState.completionBlockers = { addDraft: true, title: "dirty" };
    completionState.withdrawalReason = "active-breakdown";
    useCanArchiveScratchMock.mockReturnValue(completionState);
    act(() => titleBlockerHandleState.handle?.setSnapshot("dirty"));
    expect(screen.getByTestId("breakdown-panel")).toHaveAttribute(
      "data-add-completion-blocker",
      "true",
    );
    expect(screen.getByTestId("breakdown-panel")).toHaveAttribute(
      "data-title-completion-blocker",
      "dirty",
    );
    expect(screen.getByTestId("breakdown-panel")).toHaveAttribute(
      "data-withdrawal-reason",
      "active-breakdown",
    );
    act(() => titleBlockerHandleState.handle?.setSnapshot(null));

    fireEvent.click(screen.getByRole("button", { name: "Set Add blocker" }));
    expect(useCanArchiveScratchMock).toHaveBeenLastCalledWith("scratch-1", {
      hasAddDraft: true,
      titleBlocker: null,
    });

    act(() => titleBlockerHandleState.handle?.setSnapshot("dirty"));
    expect(useCanArchiveScratchMock).toHaveBeenLastCalledWith("scratch-1", {
      hasAddDraft: true,
      titleBlocker: "dirty",
    });

    act(() => useTriageStore.getState().selectScratch("scratch-2"));
    expect(useCanArchiveScratchMock).toHaveBeenLastCalledWith("scratch-2", {
      hasAddDraft: false,
      titleBlocker: null,
    });

    act(() => titleBlockerHandleState.handle?.setSnapshot("dirty"));
    expect(useCanArchiveScratchMock).toHaveBeenLastCalledWith("scratch-2", {
      hasAddDraft: false,
      titleBlocker: "dirty",
    });
  });

  it("keeps library auto-scroll disabled and wires explicit drag cancellation", () => {
    expect(workspaceSource).toContain("autoScroll={false}");
    expect(workspaceSource).toContain("onDragCancel={handleDragCancel}");
  });

  it("keeps reactive DataStore reads behind the dedicated hook boundary", () => {
    expect(workspaceSource).not.toContain("getDataStore");
    expect(workspaceSource).toContain(
      'from "@/hooks/use-external-scratch-removal-data"',
    );
  });

  it("wires the durable candidate commands and shared operation lock into the one DnD owner", () => {
    render(<TriageWorkspace node={createNode()} />);

    expect(useTriageDndMock).toHaveBeenCalledWith(
      "scratch-1",
      expect.objectContaining({
        stageCandidate: expect.any(Function),
        reconcileStageCandidate: expect.any(Function),
        unstageCandidate: expect.any(Function),
        reconcileUnstageCandidate: expect.any(Function),
        operationLock: expect.objectContaining({
          acquire: expect.any(Function),
          release: expect.any(Function),
        }),
        focusUnstagedSource: expect.any(Function),
      }),
    );
  });

  it("keeps the pending sentence in the live region now that the card shows no pending line", () => {
    const candidate = {
      id: "candidate-1",
      scratchBitId: "scratch-1",
      sourceBreakdownId: "breakdown-1",
      resultType: "node",
      lifecycle: "staged",
      createdAt: 1,
      updatedAt: 1,
      version: 1,
      content: "Project",
      source: {
        id: "breakdown-1",
        scratchBitId: "scratch-1",
        content: "Project",
        order: 0,
        createdAt: 1,
        consumedAt: null,
        version: 1,
      },
    };
    useStagedCandidatesMock.mockReturnValue({
      isReady: true,
      candidates: [candidate],
      integrityCandidates: [],
      pendingOperations: [
        {
          operationId: "unstage-1",
          scratchBitId: "scratch-1",
          candidateId: candidate.id,
          sourceBreakdownId: candidate.sourceBreakdownId,
          kind: "unstage",
          phase: "pending",
        },
      ],
      unknownOperations: [],
      reconcilingOperations: [],
      counts: { nodes: 1, bits: 0, visibleNodes: 1, visibleBits: 0 },
      eligibility: { stagedSourceIds: new Set(["breakdown-1"]) },
      stageCandidate: stageCandidateMock,
      reconcileStageCandidate: reconcileStageCandidateMock,
      unstageCandidate: unstageCandidateMock,
      reconcileUnstageCandidate: reconcileUnstageCandidateMock,
    });

    render(<TriageWorkspace node={createNode()} />);

    expect(screen.getByTestId("staging-live-region")).toHaveTextContent(
      "Returning “Project” to Breakdown…",
    );
  });

  it("projects the mounted authoritative candidate state into both Staging zones", () => {
    const candidate = {
      id: "candidate-1",
      scratchBitId: "scratch-1",
      sourceBreakdownId: "breakdown-1",
      resultType: "node",
      lifecycle: "staged",
      createdAt: 1,
      updatedAt: 1,
      version: 1,
      content: "Project",
      source: {
        id: "breakdown-1",
        scratchBitId: "scratch-1",
        content: "Project",
        order: 0,
        createdAt: 1,
        consumedAt: null,
        version: 1,
      },
    };
    useStagedCandidatesMock.mockReturnValue({
      isReady: true,
      candidates: [candidate],
      integrityCandidates: [],
      pendingOperations: [],
      unknownOperations: [
        {
          operationId: "unstage-1",
          candidateId: candidate.id,
          sourceBreakdownId: candidate.sourceBreakdownId,
          kind: "unstage",
          phase: "unknown",
        },
      ],
      reconcilingOperations: [],
      counts: { nodes: 1, bits: 0, visibleNodes: 1, visibleBits: 0 },
      eligibility: { stagedSourceIds: new Set(["breakdown-1"]) },
      stageCandidate: stageCandidateMock,
      reconcileStageCandidate: reconcileStageCandidateMock,
      unstageCandidate: unstageCandidateMock,
      reconcileUnstageCandidate: reconcileUnstageCandidateMock,
    });

    render(<TriageWorkspace node={createNode()} />);

    expect(stagingZoneRenderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "node",
        projection: expect.objectContaining({
          candidates: [candidate],
          operations: [
            expect.objectContaining({
              operationId: "unstage-1",
              title: "Project",
              resultType: "node",
            }),
          ],
        }),
      }),
    );
  });

  it("projects only an authoritative local Unstage success identity into Breakdown", async () => {
    unstageCandidateMock.mockResolvedValue({
      operationId: "unstage-1",
      status: "applied",
    });
    render(<TriageWorkspace node={createNode()} />);
    const options = useTriageDndMock.mock.calls[0]?.[1] as {
      unstageCandidate: (command: Record<string, unknown>) => Promise<unknown>;
    };

    await act(async () => {
      await options.unstageCandidate({
        operationId: "unstage-1",
        candidateId: "candidate-1",
        candidateExpectedVersion: 1,
        sourceBreakdownId: "breakdown-1",
        sourceExpectedVersion: 1,
      });
    });

    expect(screen.getByTestId("breakdown-panel")).toHaveAttribute(
      "data-success-kind",
      "unstage",
    );
    expect(screen.getByTestId("breakdown-panel")).toHaveAttribute(
      "data-success-operation-id",
      "unstage-1",
    );
    expect(screen.getByTestId("breakdown-panel")).toHaveAttribute(
      "data-success-row-id",
      "breakdown-1",
    );
    expect(
      screen.queryByRole("button", { name: "Dismiss Staging alert" }),
    ).toBeNull();
  });

  it("waits for authoritative reconciliation and projects its stable Unstage identity once", async () => {
    unstageCandidateMock.mockResolvedValue({
      operationId: "unstage-1",
      outcome: "unknown",
    });
    reconcileUnstageCandidateMock.mockResolvedValue({
      operationId: "unstage-1",
      status: "already_applied",
    });
    render(<TriageWorkspace node={createNode()} />);
    const options = useTriageDndMock.mock.calls[0]?.[1] as {
      unstageCandidate: (command: Record<string, unknown>) => Promise<unknown>;
      reconcileUnstageCandidate: (
        command: Record<string, unknown>,
      ) => Promise<unknown>;
    };
    const command = {
      operationId: "unstage-1",
      candidateId: "candidate-1",
      candidateExpectedVersion: 1,
      sourceBreakdownId: "breakdown-1",
      sourceExpectedVersion: 1,
    };

    await act(async () => {
      await options.unstageCandidate(command);
    });
    expect(screen.getByTestId("breakdown-panel")).not.toHaveAttribute(
      "data-success-operation-id",
    );

    await act(async () => {
      await options.reconcileUnstageCandidate(command);
    });
    expect(screen.getByTestId("breakdown-panel")).toHaveAttribute(
      "data-success-operation-id",
      "unstage-1",
    );
  });

  it("clears mounted Unstage success authority across a Scratch switch without replay", async () => {
    unstageCandidateMock.mockResolvedValue({
      operationId: "unstage-1",
      status: "applied",
    });
    render(<TriageWorkspace node={createNode()} />);
    const options = useTriageDndMock.mock.calls[0]?.[1] as {
      unstageCandidate: (command: Record<string, unknown>) => Promise<unknown>;
    };
    await act(async () => {
      await options.unstageCandidate({
        operationId: "unstage-1",
        candidateId: "candidate-1",
        candidateExpectedVersion: 1,
        sourceBreakdownId: "breakdown-1",
        sourceExpectedVersion: 1,
      });
    });

    act(() => useTriageStore.getState().selectScratch("scratch-2"));
    expect(screen.getByTestId("breakdown-panel")).not.toHaveAttribute(
      "data-success-operation-id",
    );
    act(() => useTriageStore.getState().selectScratch("scratch-1"));
    expect(screen.getByTestId("breakdown-panel")).not.toHaveAttribute(
      "data-success-operation-id",
    );
  });

  it("uses the ready empty snapshot as baseline and reports a later remote Node arrival without stealing focus", async () => {
    const initial = {
      isReady: true,
      candidates: [],
      integrityCandidates: [],
      pendingOperations: [],
      unknownOperations: [],
      reconcilingOperations: [],
      counts: { nodes: 0, bits: 0, visibleNodes: 0, visibleBits: 0 },
      eligibility: { stagedSourceIds: new Set<string>() },
      stageCandidate: stageCandidateMock,
      reconcileStageCandidate: reconcileStageCandidateMock,
      unstageCandidate: unstageCandidateMock,
      reconcileUnstageCandidate: reconcileUnstageCandidateMock,
    };
    useStagedCandidatesMock.mockReturnValue(initial);
    const view = render(<TriageWorkspace node={createNode()} />);
    const existingFocus = screen.getByRole("button", { name: "Drag breakdown" });
    existingFocus.focus();

    useStagedCandidatesMock.mockReturnValue({
      ...initial,
      candidates: [
        {
          id: "remote-node",
          scratchBitId: "scratch-1",
          sourceBreakdownId: "breakdown-remote",
          resultType: "node",
          lifecycle: "staged",
          createdAt: 2,
          updatedAt: 2,
          version: 1,
          content: "Remote node",
          source: {
            id: "breakdown-remote",
            scratchBitId: "scratch-1",
            content: "Remote node",
            order: 0,
            createdAt: 2,
            consumedAt: null,
            version: 1,
          },
        },
      ],
      counts: { nodes: 1, bits: 0, visibleNodes: 1, visibleBits: 0 },
    });
    view.rerender(<TriageWorkspace node={createNode()} />);

    const indicator = await screen.findByRole("button", { name: "Show new Nodes" });
    expect(indicator).toHaveTextContent("1 new");
    expect(existingFocus).toHaveFocus();

    const nodeWell = screen.getByTestId("node-staging-zone");
    nodeWell.scrollTop = 40;
    fireEvent.click(indicator);
    expect(nodeWell.scrollTop).toBe(0);
    expect(screen.getByText("Remote node")).toHaveFocus();
    expect(screen.queryByRole("button", { name: "Show new Nodes" })).not.toBeInTheDocument();
  });

  it("never shows the previous Scratch's new-item indicator or alert in any commit after a Scratch switch", async () => {
    const base = {
      isReady: true,
      candidates: [] as unknown[],
      integrityCandidates: [],
      pendingOperations: [],
      unknownOperations: [],
      reconcilingOperations: [],
      counts: { nodes: 0, bits: 0, visibleNodes: 0, visibleBits: 0 },
      eligibility: { stagedSourceIds: new Set<string>() },
      stageCandidate: stageCandidateMock,
      reconcileStageCandidate: reconcileStageCandidateMock,
      unstageCandidate: unstageCandidateMock,
      reconcileUnstageCandidate: reconcileUnstageCandidateMock,
    };
    useStagedCandidatesMock.mockReturnValue(base);
    const commits: boolean[] = [];
    const probe = () => (
      <Profiler
        id="workspace"
        onRender={() =>
          commits.push(
            screen.queryByRole("button", { name: "Show new Nodes" }) !== null,
          )
        }
      >
        <TriageWorkspace node={createNode()} />
      </Profiler>
    );
    const view = render(probe());
    useStagedCandidatesMock.mockReturnValue({
      ...base,
      candidates: [
        {
          id: "remote-node",
          scratchBitId: "scratch-1",
          sourceBreakdownId: "breakdown-remote",
          resultType: "node",
          lifecycle: "staged",
          createdAt: 2,
          updatedAt: 2,
          version: 1,
          content: "Remote node",
          source: {
            id: "breakdown-remote",
            scratchBitId: "scratch-1",
            content: "Remote node",
            order: 0,
            createdAt: 2,
            consumedAt: null,
            version: 1,
          },
        },
      ],
      counts: { nodes: 1, bits: 0, visibleNodes: 1, visibleBits: 0 },
    });
    view.rerender(probe());
    await screen.findByRole("button", { name: "Show new Nodes" });

    commits.length = 0;
    useStagedCandidatesMock.mockReturnValue({ ...base, isReady: false });
    act(() => useTriageStore.setState({ selectedScratchId: "scratch-2" }));
    expect(commits.length).toBeGreaterThan(0);
    expect(commits.every((shown) => !shown)).toBe(true);
  });

  it("excludes a local Stage identity from the remote-arrival indicator", async () => {
    const initial = {
      isReady: true,
      candidates: [],
      integrityCandidates: [],
      pendingOperations: [],
      unknownOperations: [],
      reconcilingOperations: [],
      counts: { nodes: 0, bits: 0, visibleNodes: 0, visibleBits: 0 },
      eligibility: { stagedSourceIds: new Set<string>() },
      stageCandidate: stageCandidateMock,
      reconcileStageCandidate: reconcileStageCandidateMock,
      unstageCandidate: unstageCandidateMock,
      reconcileUnstageCandidate: reconcileUnstageCandidateMock,
    };
    stageCandidateMock.mockResolvedValue({
      operationId: "stage-local",
      status: "applied",
      candidate: null,
      source: null,
      scratch: null,
    });
    useStagedCandidatesMock.mockReturnValue(initial);
    const view = render(<TriageWorkspace node={createNode()} />);
    const options = useTriageDndMock.mock.calls[0]?.[1] as {
      stageCandidate: (command: Record<string, unknown>) => Promise<unknown>;
    };

    await act(async () => {
      await options.stageCandidate({
        operationId: "stage-local",
        candidateId: "local-node",
        scratchBitId: "scratch-1",
        sourceBreakdownId: "breakdown-local",
        sourceExpectedVersion: 1,
        resultType: "node",
      });
    });
    useStagedCandidatesMock.mockReturnValue({
      ...initial,
      candidates: [
        {
          id: "local-node",
          resultType: "node",
          content: "Local node",
          source: { version: 1 },
        },
      ],
      counts: { nodes: 1, bits: 0, visibleNodes: 1, visibleBits: 0 },
    });
    view.rerender(<TriageWorkspace node={createNode()} />);

    expect(
      screen.queryByRole("button", { name: "Show new Nodes" }),
    ).not.toBeInTheDocument();
  });

  it("renders and dismisses a terminal Stage alert without a Retry action", async () => {
    stageCandidateMock.mockResolvedValue({
      operationId: "stage-1",
      status: "not_applied",
      candidate: null,
      source: null,
      scratch: null,
    });
    useTriageDndMock.mockReturnValue(
      createDndState({
        activeDragItem: {
          kind: "triage-breakdown",
          id: "breakdown-1",
          label: "Project",
          scratchId: "scratch-1",
          sourceBreakdownId: "breakdown-1",
          sourceVersion: 1,
          sourceLifecycle: "active",
        },
      }),
    );
    render(<TriageWorkspace node={createNode()} />);
    const options = useTriageDndMock.mock.calls[0]?.[1] as {
      stageCandidate: (command: Record<string, unknown>) => Promise<unknown>;
    };

    await act(async () => {
      await options.stageCandidate({
        operationId: "stage-1",
        candidateId: "candidate-1",
        scratchBitId: "scratch-1",
        sourceBreakdownId: "breakdown-1",
        sourceExpectedVersion: 1,
        resultType: "node",
      });
    });

    expect(
      within(screen.getByRole("button", { name: "Dismiss Staging alert" }).parentElement!)
        .getByText("“Project” was not staged. Drag it again to retry."),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("staging-live-region"),
    ).toHaveTextContent("“Project” was not staged. Drag it again to retry.");
    expect(screen.getByTestId("staging-live-region")).toHaveAttribute(
      "aria-live",
      "polite",
    );
    expect(screen.queryByRole("button", { name: /retry/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss Staging alert" }));
    expect(screen.queryByText(/was not staged/)).not.toBeInTheDocument();
  });

  it("projects only the explicit invalidated drag signal after snapshot release", () => {
    let activeDragItem: TriageDragItem = {
      kind: "triage-staged-node",
      id: "candidate-1",
      label: "Project",
      integrity: "invalidated",
    };
    useTriageDndMock.mockImplementation(() =>
      createDndState({ activeDragItem }),
    );
    const view = render(<TriageWorkspace node={createNode()} />);

    expect(screen.queryByText("“Project” changed elsewhere. Drop canceled.")).not.toBeInTheDocument();

    activeDragItem = null;
    view.rerender(<TriageWorkspace node={createNode()} />);

    expect(
      within(screen.getByRole("button", { name: "Dismiss Staging alert" }).parentElement!)
        .getByText("“Project” changed elsewhere. Drop canceled."),
    ).toBeInTheDocument();
  });

  describe("Unstage failures belong to the candidate", () => {
    const candidate = {
      id: "candidate-1",
      scratchBitId: "scratch-1",
      sourceBreakdownId: "breakdown-1",
      resultType: "bit" as const,
      lifecycle: "staged" as const,
      createdAt: 1,
      updatedAt: 1,
      version: 1,
      content: "Project",
      source: {
        id: "breakdown-1",
        scratchBitId: "scratch-1",
        content: "Project",
        order: 0,
        createdAt: 1,
        consumedAt: null,
        version: 1,
      },
    };
    const projection = {
      isReady: true,
      candidates: [candidate],
      integrityCandidates: [],
      pendingOperations: [],
      unknownOperations: [],
      reconcilingOperations: [],
      counts: { nodes: 0, bits: 1, visibleNodes: 0, visibleBits: 1 },
      eligibility: { stagedSourceIds: new Set(["breakdown-1"]) },
      stageCandidate: stageCandidateMock,
      reconcileStageCandidate: reconcileStageCandidateMock,
      unstageCandidate: unstageCandidateMock,
      reconcileUnstageCandidate: reconcileUnstageCandidateMock,
    };
    const command = (operationId: string) => ({
      operationId,
      candidateId: candidate.id,
      candidateExpectedVersion: 1,
      sourceBreakdownId: candidate.sourceBreakdownId,
      sourceExpectedVersion: 1,
    });
    type DndOptions = {
      unstageCandidate: (command: Record<string, unknown>) => Promise<unknown>;
    };
    const failureFor = (id: string) => {
      const last = stagingZoneRenderMock.mock.calls.at(-1)?.[0] as {
        projection?: { unstageFailures?: ReadonlyMap<string, { copy: string }> };
      };
      return last.projection?.unstageFailures?.get(id);
    };

    async function failUnstage(status: "conflict" | "rejected" | "not_applied") {
      unstageCandidateMock.mockResolvedValue({
        operationId: "unstage-1",
        status,
        candidate,
        source: candidate.source,
      });
      useStagedCandidatesMock.mockReturnValue(projection);
      const view = render(<TriageWorkspace node={createNode()} />);
      const options = useTriageDndMock.mock.calls[0]?.[1] as DndOptions;
      await act(async () => {
        await options.unstageCandidate(command("unstage-1"));
      });
      return { view, options };
    }

    it.each([
      ["conflict", "“Project” changed elsewhere and remains staged."],
      ["rejected", "“Project” can’t be returned from its current state."],
    ] as const)("%s shows on the candidate, announced once, with no alert band", async (status, copy) => {
      await failUnstage(status);

      expect(screen.queryByRole("button", { name: "Dismiss Staging alert" })).toBeNull();
      expect(failureFor(candidate.id)).toEqual({ copy });
      expect(screen.getAllByText(copy)).toHaveLength(1);
    });

    it("still announces a later Stage's pending sentence while the candidate keeps its failure", async () => {
      const { view } = await failUnstage("conflict");
      expect(screen.getByTestId("staging-live-region")).toHaveTextContent(
        "“Project” changed elsewhere and remains staged.",
      );

      useStagedCandidatesMock.mockReturnValue({
        ...projection,
        pendingOperations: [
          {
            operationId: "stage-1",
            candidateId: candidate.id,
            sourceBreakdownId: candidate.sourceBreakdownId,
            scratchBitId: "scratch-1",
            kind: "stage",
            phase: "pending",
            resultType: "bit",
          },
        ],
      });
      view.rerender(<TriageWorkspace node={createNode()} />);

      expect(failureFor(candidate.id)).toBeDefined();
      expect(screen.getByTestId("staging-live-region")).not.toHaveTextContent(
        "changed elsewhere",
      );
      expect(screen.getByTestId("staging-live-region")).not.toBeEmptyDOMElement();
    });

    it("does not come back when the Scratch is selected again", async () => {
      const { view } = await failUnstage("conflict");
      act(() => useTriageStore.getState().selectScratch("scratch-2"));
      act(() => useTriageStore.getState().selectScratch("scratch-1"));
      view.rerender(<TriageWorkspace node={createNode()} />);

      expect(failureFor(candidate.id)).toBeUndefined();
      expect(screen.getByTestId("staging-live-region")).toHaveTextContent(/^$/);
    });

    it("is announced even while a band notice stays up, and a later band notice replaces it", async () => {
      stageCandidateMock.mockResolvedValue({
        operationId: "stage-1",
        status: "conflict",
        candidate: null,
        source: candidate.source,
      });
      useStagedCandidatesMock.mockReturnValue(projection);
      render(<TriageWorkspace node={createNode()} />);
      const options = useTriageDndMock.mock.calls[0]?.[1] as {
        stageCandidate: (command: Record<string, unknown>) => Promise<unknown>;
        unstageCandidate: (command: Record<string, unknown>) => Promise<unknown>;
      };
      await act(async () => {
        await options.stageCandidate({
          operationId: "stage-1",
          candidateId: "candidate-9",
          scratchBitId: "scratch-1",
          sourceBreakdownId: "breakdown-9",
          sourceExpectedVersion: 1,
          resultType: "bit",
        });
      });
      expect(screen.getByRole("button", { name: "Dismiss Staging alert" })).toBeInTheDocument();

      unstageCandidateMock.mockResolvedValue({
        operationId: "unstage-1",
        status: "conflict",
        candidate,
        source: candidate.source,
      });
      await act(async () => {
        await options.unstageCandidate(command("unstage-1"));
      });

      expect(screen.getByRole("button", { name: "Dismiss Staging alert" })).toBeInTheDocument();
      expect(screen.getByTestId("staging-live-region")).toHaveTextContent(
        "“Project” changed elsewhere and remains staged.",
      );
    });

    it("clears when a new operation starts for the candidate", async () => {
      const { options } = await failUnstage("conflict");
      expect(failureFor(candidate.id)).toBeDefined();

      unstageCandidateMock.mockResolvedValue({ operationId: "unstage-2", status: "applied" });
      await act(async () => {
        await options.unstageCandidate(command("unstage-2"));
      });

      expect(failureFor(candidate.id)).toBeUndefined();
    });

    it("clears after the authoritative candidate disappears", async () => {
      const { view } = await failUnstage("conflict");
      expect(failureFor(candidate.id)).toBeDefined();

      useStagedCandidatesMock.mockReturnValue({
        ...projection,
        candidates: [],
        counts: { nodes: 0, bits: 0, visibleNodes: 0, visibleBits: 0 },
      });
      view.rerender(<TriageWorkspace node={createNode()} />);

      await waitFor(() => expect(failureFor(candidate.id)).toBeUndefined());
    });

    it("does not carry across a Scratch switch", async () => {
      await failUnstage("conflict");
      expect(failureFor(candidate.id)).toBeDefined();

      act(() => useTriageStore.getState().selectScratch("scratch-2"));

      expect(failureFor(candidate.id)).toBeUndefined();
    });
  });

  it("mounts one aria-hidden heading icon per section without changing heading names", () => {
    render(<TriageWorkspace node={createNode()} />);

    const breakdown = screen.getByRole("heading", { name: "Breakdown" });
    const staging = screen.getByRole("heading", { name: "Staging" });
    expect(breakdown.querySelector('[data-triage-role="breakdown-heading-icon"]')).toHaveAttribute("aria-hidden", "true");
    expect(staging.querySelector('[data-triage-role="staging-heading-icon"]')).toHaveAttribute("aria-hidden", "true");
  });

  it("hides the heading icons by default and shows them for neumorphism only", () => {
    expect(globalsCss).toMatch(/\.triage-shell__heading-icon \{ display: none; \}/);
    const shown = globalsCss.match(/[^\n]*\n?[^\n{]*\[data-triage-role="breakdown-heading-icon"\][^{]*\{[^}]*display: block;/g) ?? [];
    expect(shown).toHaveLength(1);
    expect(shown[0]).toContain(':root[data-color-theme="neumorphism"]');
    expect(globalsCss).not.toMatch(/color-theme="(?!neumorphism)[a-z-]+"\][^{]*heading-icon/);
  });

  it("lays Node cards in an auto-fill grid of at least one card, at most two columns, in a column that never drops below one card", () => {
    expect(globalsCss).toMatch(
      /\.staging-node-grid \{[^}]*grid-template-columns: repeat\(\s*auto-fill,\s*minmax\(max\(var\(--triage-staging-node-card-min\), calc\(\(100% - 0\.5rem\) \/ 2\)\), 1fr\)\s*\);/,
    );
    expect(globalsCss).toMatch(
      /\.triage-shell__staging \{[^}]*grid-template-columns:\s*minmax\(calc\(var\(--triage-staging-node-card-min\) \+ 2rem\), 7fr\)/,
    );
  });

  it("binds the static Staging status family to reduced motion and all eight themes", () => {
    expect(globalsCss).toContain(".staging-status-slot");
    expect(globalsCss).toContain(".staging-arrival-count");
    expect(globalsCss).toContain(".staging-local-alert");
    expect(globalsCss).toContain("@media (prefers-reduced-motion: reduce)");
    expect(globalsCss).toContain('[data-triage-role^="staging-"]');
    for (const theme of [
      "neumorphism",
      "claymorphism",
      "retro-mac",
    ]) {
      expect(globalsCss).toContain(`:root[data-color-theme="${theme}"]\n  .staging-local-alert`);
    }
  });

  it("passes the staged drag snapshot to the transient Breakdown drop-back surface", () => {
    useTriageDndMock.mockReturnValue(
      createDndState({
        activeDragItem: {
          kind: "triage-staged-bit",
          id: "candidate-1",
          label: "Return me",
        },
        overTargetId: "triage-remove-drop:breakdown",
      }),
    );

    render(<TriageWorkspace node={createNode()} />);

    expect(screen.getByTestId("breakdown-panel")).toHaveAttribute(
      "data-active-drag-kind",
      "triage-staged-bit",
    );
    expect(screen.getByTestId("breakdown-panel")).toHaveAttribute(
      "data-over-target-id",
      "triage-remove-drop:breakdown",
    );
  });

  it("restores focus to the surviving source grip after confirmed Unstage", () => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    render(<TriageWorkspace node={createNode()} />);
    const options = useTriageDndMock.mock.calls[0]?.[1] as {
      focusUnstagedSource: (sourceBreakdownId: string) => void;
    };

    options.focusUnstagedSource("breakdown-1");

    expect(screen.getByRole("button", { name: "Drag breakdown" })).toHaveFocus();
  });

  it("renders ScratchPool in the left panel and wires in BreakdownPanel", () => {
    render(<TriageWorkspace node={createNode()} />);

    const workspace = screen.getByTestId("triage-workspace");

    expect(within(workspace).getByTestId("scratch-pool")).toBeInTheDocument();
    expect(within(workspace).getByTestId("breakdown-panel")).toBeInTheDocument();
    expect(workspace).not.toHaveAttribute("data-triage-operation-kind");
  });

  it("owns one mounted-page synchronous Scratch-title blocker handle", () => {
    render(<TriageWorkspace node={createNode()} />);

    expect(titleBlockerHandleState.handle?.getSnapshot()).toBeNull();
    titleBlockerHandleState.handle?.setSnapshot("dirty");
    expect(titleBlockerHandleState.handle?.getSnapshot()).toBe("dirty");
  });

  it("keeps the DP-VQ03 realization scoped out without a pending destination", () => {
    render(<TriageWorkspace node={createNode()} />);

    expect(departureControllerState.controller).not.toBeNull();
    expect(
      document.querySelector('[data-triage-state="departure-decision"]'),
    ).not.toBeInTheDocument();
    expect(
      document.querySelector('[data-triage-role^="breakdown-departure"]'),
    ).not.toBeInTheDocument();
  });

  it("marks the workspace decision state and makes non-Breakdown areas inert", () => {
    render(<TriageWorkspace node={createNode()} />);

    act(() => {
      departureControllerState.controller?.setAddDraft("Protected Add draft");
      requestActiveTriageDeparture({
        id: "scratch-2",
        kind: "scratch",
        perform: vi.fn(),
      });
    });

    const workspace = screen.getByTestId("triage-workspace");
    expect(workspace).toHaveAttribute(
      "data-triage-state",
      "departure-decision",
    );
    expect(
      screen.getByRole("region", { name: "Scratch Pool" }),
    ).toHaveAttribute("inert");
    expect(screen.getByRole("region", { name: "Staging" })).toHaveAttribute(
      "inert",
    );
    expect(
      screen.getByRole("region", { name: "Grid Explorer" }),
    ).toHaveAttribute("inert");
    expect(screen.getByRole("region", { name: "Breakdown" })).not.toHaveAttribute(
      "inert",
    );
  });

  describe("requested Scratch selection after capture", () => {
    function setup(activeIds = ["scratch-1", "scratch-2"]) {
      useTriageStore.setState({
        selectedScratchId: "scratch-1",
        scratchPoolActiveIds: activeIds,
      });
      return render(<TriageWorkspace node={createNode()} />);
    }
    function request(id: string) {
      act(() => {
        useTriageStore.getState().requestScratchSelection(id);
      });
    }

    afterEach(() => {
      document.querySelectorAll("[data-test-editor]").forEach((el) => el.remove());
      useTriageStore.setState({
        triageWorkspaceMounted: false,
        requestedScratchSelectionId: null,
        scratchRevealId: null,
        scratchPoolActiveIds: [],
      });
    });

    it("marks the workspace mounted and clears the flag on unmount", () => {
      const view = setup();
      expect(useTriageStore.getState().triageWorkspaceMounted).toBe(true);
      request("scratch-2");
      view.unmount();
      expect(useTriageStore.getState()).toMatchObject({
        triageWorkspaceMounted: false,
        requestedScratchSelectionId: null,
      });
    });

    it("survives a StrictMode double mount without a stale or lost request", () => {
      useTriageStore.setState({
        selectedScratchId: "scratch-1",
        scratchPoolActiveIds: ["scratch-1", "scratch-2"],
      });
      render(
        <StrictMode>
          <TriageWorkspace node={createNode()} />
        </StrictMode>,
      );
      expect(useTriageStore.getState().triageWorkspaceMounted).toBe(true);
      request("scratch-2");
      expect(useTriageStore.getState().selectedScratchId).toBe("scratch-2");
    });

    it("selects the captured Scratch, reveals it and moves no focus without a draft", () => {
      setup();
      const before = document.activeElement;
      request("scratch-2");
      expect(useTriageStore.getState().selectedScratchId).toBe("scratch-2");
      expect(useTriageStore.getState().scratchRevealId).toBe("scratch-2");
      expect(useTriageStore.getState().requestedScratchSelectionId).toBeNull();
      expect(document.activeElement).toBe(before);
    });

    it("opens the departure sheet with an Add draft; Continue keeps, Discard selects and focuses the Context", () => {
      setup();
      act(() => departureControllerState.controller?.setAddDraft("draft"));
      request("scratch-2");
      expect(departureControllerState.controller?.pendingDestination).toEqual({
        id: "scratch-2",
        kind: "scratch",
      });
      expect(useTriageStore.getState().selectedScratchId).toBe("scratch-1");
      expect(useTriageStore.getState().scratchRevealId).toBeNull();

      act(() => {
        departureControllerState.controller?.continueWriting();
      });
      expect(useTriageStore.getState().selectedScratchId).toBe("scratch-1");

      request("scratch-2");
      act(() => {
        departureControllerState.controller?.discardAndMove();
      });
      expect(useTriageStore.getState().selectedScratchId).toBe("scratch-2");
      expect(useTriageStore.getState().scratchRevealId).toBe("scratch-2");
      expect(screen.getByTestId("selected-scratch-context")).toHaveFocus();
    });

    it("does nothing while an operation locks switching", () => {
      setup();
      const lock = useArchiveScratchMock.mock.calls.at(-1)?.[0].operationLock;
      act(() => {
        lock.acquire("archive", "op-1");
      });
      request("scratch-2");
      expect(useTriageStore.getState().selectedScratchId).toBe("scratch-1");
      expect(useTriageStore.getState().requestedScratchSelectionId).toBeNull();
    });

    it.each(["pristine", "dirty"])(
      "does nothing while an inline editor is open (%s)",
      (state) => {
        setup();
        const editor = document.createElement("div");
        editor.className = "triage-inline-editor";
        editor.dataset.triageEditorState = state;
        editor.dataset.testEditor = "";
        document.body.append(editor);
        request("scratch-2");
        expect(useTriageStore.getState().selectedScratchId).toBe("scratch-1");
        expect(useTriageStore.getState().requestedScratchSelectionId).toBeNull();
      },
    );

    it("skips the selection when a departure decision is already pending and keeps it", () => {
      setup(["scratch-1", "scratch-2", "scratch-3"]);
      act(() => departureControllerState.controller?.setAddDraft("draft"));
      act(() => {
        requestActiveTriageDeparture({ id: "scratch-3", kind: "scratch", perform: vi.fn() });
      });
      request("scratch-2");
      expect(departureControllerState.controller?.pendingDestination).toEqual({
        id: "scratch-3",
        kind: "scratch",
      });
      expect(useTriageStore.getState().requestedScratchSelectionId).toBeNull();
    });

    it("does nothing while an external-removal transition owns the selection", () => {
      setup();
      act(() => {
        useTriageStore.setState({
          externalScratchRemoval: {
            scratchId: "scratch-1",
            lifecycle: "archive",
            destinationId: "scratch-2",
            destinationKind: "scratch",
            removalOrder: ["scratch-1", "scratch-2"],
          },
        });
      });
      request("scratch-2");
      expect(useTriageStore.getState().selectedScratchId).toBe("scratch-1");
      expect(useTriageStore.getState().requestedScratchSelectionId).toBeNull();
      act(() => useTriageStore.setState({ externalScratchRemoval: null }));
    });

    it("waits for the Pool projection to contain the captured Scratch", () => {
      setup(["scratch-1"]);
      request("scratch-2");
      expect(useTriageStore.getState().selectedScratchId).toBe("scratch-1");
      expect(useTriageStore.getState().requestedScratchSelectionId).toBe("scratch-2");

      act(() => {
        useTriageStore.setState({ scratchPoolActiveIds: ["scratch-1", "scratch-2"] });
      });
      expect(useTriageStore.getState().selectedScratchId).toBe("scratch-2");
      expect(useTriageStore.getState().requestedScratchSelectionId).toBeNull();
    });

    it("skips and clears a request whose Scratch was seen in the Pool and is now absent", () => {
      setup(["scratch-1", "scratch-2"]);
      act(() => {
        useTriageStore.setState({ scratchPoolActiveIds: ["scratch-1"] });
      });
      request("scratch-2");
      expect(useTriageStore.getState().requestedScratchSelectionId).toBeNull();

      act(() => {
        useTriageStore.setState({ scratchPoolActiveIds: ["scratch-1", "scratch-2"] });
      });
      expect(useTriageStore.getState().selectedScratchId).toBe("scratch-1");
    });

    it("applies the lock and editor checks when the Scratch appears, not at close", () => {
      setup(["scratch-1"]);
      request("scratch-2");
      const lock = useArchiveScratchMock.mock.calls.at(-1)?.[0].operationLock;
      act(() => {
        lock.acquire("archive", "op-2");
      });
      act(() => {
        useTriageStore.setState({ scratchPoolActiveIds: ["scratch-1", "scratch-2"] });
      });
      expect(useTriageStore.getState().selectedScratchId).toBe("scratch-1");
      expect(useTriageStore.getState().requestedScratchSelectionId).toBeNull();
    });
  });

  it("registers the mounted controller for Inbox route owners outside the Workspace", () => {
    const perform = vi.fn();
    render(<TriageWorkspace node={createNode()} />);

    act(() => {
      departureControllerState.controller?.setAddDraft("Protected Add draft");
      expect(
        requestActiveTriageDeparture({
          id: "/trash",
          kind: "route",
          perform,
        }),
      ).toBe("decision-required");
    });

    expect(perform).not.toHaveBeenCalled();
    expect(departureControllerState.controller?.pendingDestination).toEqual({
      id: "/trash",
      kind: "route",
    });
  });

  it("renders the dedicated DP-VQ01 surface paused with every full source-labeled draft", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    breakdownSurfaceState.addDraft = "Complete Add draft";
    breakdownSurfaceState.editorDrafts = [
      { kind: "scratch-title", value: "Complete title draft" },
      { kind: "breakdown", value: "Complete row draft" },
    ];
    render(<TriageWorkspace node={createNode()} />);
    act(() => {
      useTriageStore.setState({ externalScratchRemoval: {
        scratchId: "scratch-1",
        lifecycle: "delete",
        destinationId: "scratch-2",
        destinationKind: "scratch",
        removalOrder: ["scratch-1", "scratch-2", "scratch-3"],
      } });
    });
    const dialog = screen.getByRole("alertdialog", {
      name: "This Scratch was deleted elsewhere",
    });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveTextContent(
      "Movement paused. Destination: “Second Scratch”.",
    );
    expect(screen.getByText("Complete Add draft")).toBeInTheDocument();
    expect(screen.getByText("Complete title draft")).toBeInTheDocument();
    expect(screen.getByText("Complete row draft")).toBeInTheDocument();
    expect(screen.getByText("New Breakdown draft")).toBeInTheDocument();
    expect(screen.getByText("Scratch title draft")).toBeInTheDocument();
    expect(screen.getByText("Breakdown draft")).toBeInTheDocument();
    const copyActions = screen.getAllByRole("button", { name: "Copy full draft" });
    expect(copyActions[0]).toHaveFocus();

    fireEvent.click(copyActions[0]!);
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("Complete Add draft"));
    expect(copyActions[0]).toHaveFocus();
    expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();
    expect(screen.getByText("Complete Add draft")).toBeInTheDocument();

    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("binds every exact DP-VQ01 theme role family without JSX branches", () => {
    for (const requiredBinding of [
      'data-color-theme="neumorphism"]\n  .external-removal-panel__actions button',
      'data-color-theme="claymorphism"]\n  [data-triage-role="external-removal-countdown-track"]',
      'data-color-theme="claymorphism"]\n  .external-removal-panel__actions button',
      'data-color-theme="retro-mac"] .external-removal-panel__title',
      'data-color-theme="retro-mac"]\n  [data-triage-role="external-removal-draft-card"]',
      'data-color-theme="retro-mac"]\n  .external-removal-panel__actions button',
    ]) {
      expect(globalsCss).toContain(requiredBinding);
    }
    expect(globalsCss).not.toMatch(/colorTheme\s*[=!]=/);
  });

  it("pauses and resumes the exact remainder before terminal destination focus", async () => {
    vi.useFakeTimers();
    render(<TriageWorkspace node={createNode()} />);
    act(() => {
      useTriageStore.setState({ externalScratchRemoval: {
        scratchId: "scratch-1",
        lifecycle: "archive",
        destinationId: "scratch-2",
        destinationKind: "scratch",
        removalOrder: ["scratch-1", "scratch-2", "scratch-3"],
      } });
    });
    getBitMock.mockResolvedValue({
      id: "scratch-1",
      archivedAt: 100,
      deletedAt: null,
    });
    expect(
      document.querySelector('[data-triage-role="external-removal-destination"]'),
    ).toHaveTextContent("Moving to “Second Scratch” in 5 seconds.");
    const pause = screen.getByRole("button", { name: "Pause" });
    expect(pause).toHaveFocus();

    act(() => vi.advanceTimersByTime(2100));
    expect(
      document.querySelector('[data-triage-role="external-removal-destination"]'),
    ).toHaveTextContent("Moving to “Second Scratch” in 3 seconds.");
    fireEvent.click(pause);
    expect(
      document.querySelector('[data-triage-role="external-removal-destination"]'),
    ).toHaveTextContent("Movement paused. Destination: “Second Scratch”.");
    const frozenWidth = screen.getByTestId("external-removal-countdown-fill").getAttribute("style");

    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByTestId("external-removal-countdown-fill")).toHaveAttribute(
      "style",
      frozenWidth,
    );
    fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    await act(async () => {
      vi.advanceTimersByTime(3000);
      await Promise.resolve();
    });

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(useTriageStore.getState().selectedScratchId).toBe("scratch-2");
    expect(screen.getByTestId("selected-scratch-context")).toHaveFocus();
    vi.useRealTimers();
  });

  it("rereads the authoritative destination immediately before terminal handoff", async () => {
    const node = createNode({ id: "inbox-node" });
    render(<TriageWorkspace node={node} />);
    act(() => {
      useTriageStore.setState({
        externalScratchRemoval: {
          scratchId: "scratch-1",
          lifecycle: "delete",
          destinationId: "scratch-2",
          destinationKind: "scratch",
          removalOrder: ["scratch-1", "scratch-2", "scratch-3"],
        },
      });
    });
    getBitMock.mockResolvedValue(undefined);
    getBitsMock.mockResolvedValue([
      { id: "scratch-1", title: "Stale Source", createdAt: 4 },
      { id: "scratch-3", title: "Third Scratch", createdAt: 3 },
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Move now" }));

    await waitFor(() =>
      expect(useTriageStore.getState().selectedScratchId).toBe("scratch-3"),
    );
    expect(getBitsMock).toHaveBeenLastCalledWith("inbox-node");
    expect(screen.getByTestId("selected-scratch-context")).toHaveFocus();
  });

  it("honors an authoritative archive restore discovered at terminal validation", async () => {
    breakdownSurfaceState.addDraft = "Retained terminal draft";
    const node = createNode({ id: "inbox-node" });
    render(<TriageWorkspace node={node} />);
    const context = screen.getByTestId("selected-scratch-context");
    context.focus();
    act(() => {
      useTriageStore.setState({
        externalScratchRemoval: {
          scratchId: "scratch-1",
          lifecycle: "archive",
          destinationId: "scratch-2",
          destinationKind: "scratch",
          removalOrder: ["scratch-1", "scratch-2", "scratch-3"],
        },
      });
    });
    getBitMock.mockResolvedValue({
      id: "scratch-1",
      archivedAt: null,
      deletedAt: null,
    });
    getBitsMock.mockResolvedValue([
      { id: "scratch-2", title: "Second Scratch", createdAt: 2 },
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Move now" }));

    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    expect(useTriageStore.getState().selectedScratchId).toBe("scratch-1");
    expect(screen.getByDisplayValue("Retained terminal draft")).toBeInTheDocument();
    expect(context).toHaveFocus();
  });

  it("excludes a stale active projection when the final source read is archived", async () => {
    render(<TriageWorkspace node={createNode({ id: "inbox-node" })} />);
    act(() => {
      useTriageStore.setState({
        externalScratchRemoval: {
          scratchId: "scratch-1",
          lifecycle: "archive",
          destinationId: "scratch-2",
          destinationKind: "scratch",
          removalOrder: ["scratch-1", "scratch-2", "scratch-3"],
        },
      });
    });
    getBitsMock.mockResolvedValue([
      { id: "scratch-1", title: "Stale Source", createdAt: 4 },
      { id: "scratch-3", title: "Third Scratch", createdAt: 3 },
    ]);
    getBitMock.mockResolvedValue({
      id: "scratch-1",
      archivedAt: 100,
      deletedAt: null,
    });

    fireEvent.click(screen.getByRole("button", { name: "Move now" }));

    await waitFor(() =>
      expect(useTriageStore.getState().selectedScratchId).toBe("scratch-3"),
    );
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.getByTestId("selected-scratch-context")).toHaveFocus();
  });

  it("restarts only a running countdown when the destination changes", () => {
    vi.useFakeTimers();
    render(<TriageWorkspace node={createNode()} />);
    act(() => {
      useTriageStore.setState({ externalScratchRemoval: {
        scratchId: "scratch-1",
        lifecycle: "delete",
        destinationId: "scratch-2",
        destinationKind: "scratch",
        removalOrder: ["scratch-1", "scratch-2", "scratch-3"],
      } });
    });
    act(() => vi.advanceTimersByTime(2200));
    expect(
      document.querySelector('[data-triage-role="external-removal-destination"]'),
    ).toHaveTextContent("Moving to “Second Scratch” in 3 seconds.");

    inboxState.activeScratchBits = [{ id: "scratch-3", title: "Third Scratch" }];
    act(() => {
      useTriageStore.getState().reconcileScratchPoolContext({
        activeIds: ["scratch-3"],
        visibleIds: ["scratch-3"],
      });
    });
    act(() => vi.runAllTicks());

    expect(
      document.querySelector('[data-triage-role="external-removal-destination"]'),
    ).toHaveTextContent("Moving to “Third Scratch” in 5 seconds.");
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    inboxState.activeScratchBits = [{ id: "scratch-2", title: "Second Scratch" }];
    act(() => {
      useTriageStore.getState().reconcileScratchPoolContext({
        activeIds: ["scratch-2"],
        visibleIds: ["scratch-2"],
      });
    });
    expect(
      document.querySelector('[data-triage-role="external-removal-destination"]'),
    ).toHaveTextContent("Movement paused. Destination: “Second Scratch”.");
    vi.useRealTimers();
  });

  it("cancels only on authoritative archive restore and retains page-memory drafts", () => {
    breakdownSurfaceState.addDraft = "Retained Add draft";
    inboxState.activeScratchBits = [{ id: "scratch-1", title: "Restored Scratch" }];
    render(<TriageWorkspace node={createNode()} />);
    const context = screen.getByTestId("selected-scratch-context");
    context.focus();

    inboxState.activeScratchBits = [{ id: "scratch-2", title: "Second Scratch" }];
    act(() => {
      useTriageStore.getState().reconcileScratchPoolContext({
        activeIds: ["scratch-2"],
        visibleIds: ["scratch-2"],
      });
      useTriageStore
        .getState()
        .setExternalScratchRemovalLifecycle("scratch-1", "archive");
    });
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    inboxState.activeScratchBits = [{ id: "scratch-1", title: "Restored Scratch" }];
    act(() => {
      useTriageStore.getState().reconcileScratchPoolContext({
        activeIds: ["scratch-1"],
        visibleIds: ["scratch-1"],
      });
    });

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(useTriageStore.getState().selectedScratchId).toBe("scratch-1");
    expect(screen.getByDisplayValue("Retained Add draft")).toBeInTheDocument();
    expect(context).toHaveFocus();
  });

  it("renders one semantic shell with visible identities for all four areas", () => {
    render(<TriageWorkspace node={createNode()} />);

    const workspace = screen.getByRole("region", {
      name: "Inbox triage workspace",
    });

    expect(workspace).toHaveAttribute(
      "data-triage-role",
      "shell-background",
    );
    expect(workspace).toHaveAttribute("data-triage-state", "default");

    for (const name of [
      "Scratch Pool",
      "Breakdown",
      "Staging",
      "Grid Explorer",
    ]) {
      const region = within(workspace).getByRole("region", { name });
      const heading = within(region).getByRole("heading", { name });

      expect(region).toHaveAttribute("data-triage-role", "section-surface");
      expect(region).toHaveAttribute("data-triage-state", "default");
      expect(heading).toHaveAttribute("tabindex", "-1");
      expect(heading).toHaveAttribute("data-triage-role", "section-header");
    }

    const explorerRegion = within(workspace).getByRole("region", { name:"Grid Explorer" });
    const explorerHeading = within(explorerRegion).getByRole("heading", { name:"Grid Explorer" });
    expect(explorerHeading.closest('[data-triage-role="explorer-header"]')).toContainElement(within(explorerRegion).getByRole("button", {name:"Search Explorer"}));
    expect(within(explorerRegion).getAllByRole("heading", {name:"Grid Explorer"})).toHaveLength(1);
    expect(screen.getByTestId("hierarchy-explorer")).toBeInTheDocument();
    expect(screen.getByTestId("node-staging-zone")).toBeInTheDocument();
    expect(screen.getByTestId("bit-staging-zone")).toBeInTheDocument();
  });

  it.each(["griddo", "neumorphism", "claymorphism", "retro-mac"])("mounts one noninteractive desktop decoration in the shared tree under %s", (theme) => {
    document.documentElement.dataset.colorTheme = theme;
    render(<TriageWorkspace node={createNode()} />);
    const workspace = screen.getByTestId("triage-workspace");
    const bars = workspace.querySelectorAll('[data-triage-role="desktop-menu-bar"]');
    expect(bars).toHaveLength(1);
    const bar = bars[0];
    expect(bar).toHaveAttribute("aria-hidden", "true");
    expect([...bar.querySelectorAll('[data-triage-role="desktop-menu-label"]')].map(e => e.textContent)).toEqual(["File", "Edit", "View", "Label", "Special"]);
    expect(bar.querySelector('[data-triage-role="desktop-menu-clock"]')).toHaveTextContent("12:00 PM");
    expect(bar.querySelectorAll('button, a, input, [tabindex], [role="menu"], [role="menuitem"], [role="timer"]')).toHaveLength(0);
    expect(bar.compareDocumentPosition(screen.getByTestId("scratch-pool")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    document.documentElement.removeAttribute("data-color-theme");
  });

  it("keeps the desktop clock literal across rerenders without replacing workflow regions", () => {
    const node = createNode();
    const { rerender } = render(<TriageWorkspace node={node} />);
    const pool = screen.getByTestId("scratch-pool");
    const context = screen.getByTestId("selected-scratch-context");
    rerender(<TriageWorkspace node={{ ...node, title: "Updated workspace title" }} />);
    expect(document.querySelector('[data-triage-role="desktop-menu-clock"]')).toHaveTextContent("12:00 PM");
    expect(screen.getByTestId("scratch-pool")).toBe(pool);
    expect(screen.getByTestId("selected-scratch-context")).toBe(context);
  });

  it("declares the approved shell ratios, desktop minimum, and hidden-scroll viewports", () => {
    render(<TriageWorkspace node={createNode()} />);

    const workspace = screen.getByTestId("triage-workspace");

    expect(workspace).toHaveClass("triage-shell");
    expect(workspace).toHaveAttribute("data-min-viewport", "1024px");
    expect(screen.getByTestId("triage-main-work-area")).toHaveAttribute(
      "data-layout-ratio",
      "60/40",
    );
    expect(screen.getByTestId("triage-top-work-area")).toHaveAttribute(
      "data-layout-ratio",
      "60/40",
    );
    expect(screen.getByTestId("triage-staging-columns")).toHaveAttribute(
      "data-layout-ratio",
      "35/65",
    );

    expect(
      workspace.querySelectorAll(
        '[data-triage-role="internal-scroll-viewport"]',
      ),
    ).toHaveLength(5);
  });

  it.each(["node", "bit"] as const)("delivers A visible counts for %s through projection, overlap, terminal gap and Unstage retention", (type) => {
    const label = type === "node" ? "Nodes" : "Bits";
    const project = (visible: number, phase?: "pending" | "unknown" | "reconciling") => ({
      candidates: [], integrityCandidates: [],
      counts: { nodes: type === "node" ? 1 : 0, bits: type === "bit" ? 1 : 0,
        visibleNodes: type === "node" ? visible : 0, visibleBits: type === "bit" ? visible : 0 },
      pendingOperations: phase === "pending" ? [{ kind: "stage", operationId: "local-stage", candidateId: "projected", resultType: type }] : [],
      unknownOperations: phase === "unknown" ? [{ kind: "stage", operationId: "local-stage", candidateId: "projected", resultType: type }] : [],
      reconcilingOperations: phase === "reconciling" ? [{ kind: "stage", operationId: "local-stage", candidateId: "projected", resultType: type }] : [],
    });
    useStagedCandidatesMock.mockReturnValue(project(2, "pending"));
    const view = render(<TriageWorkspace node={createNode()} />);
    for (const phase of ["pending", "unknown", "reconciling"] as const) {
      useStagedCandidatesMock.mockReturnValue(project(2, phase));
      view.rerender(<TriageWorkspace node={createNode()} />);
      expect(screen.getByRole("heading", { level: 3, name: `2 ${label}` })).toBeInTheDocument();
    }
    // Authoritative overlap is already deduplicated by the preservation hook.
    useStagedCandidatesMock.mockReturnValue(project(2));
    view.rerender(<TriageWorkspace node={createNode()} />);
    expect(screen.getByRole("heading", { name: `2 ${label}` })).toBeInTheDocument();
    // Terminal-before-liveQuery may remove the projection before delivery.
    useStagedCandidatesMock.mockReturnValue(project(1));
    view.rerender(<TriageWorkspace node={createNode()} />);
    expect(screen.getByRole("heading", { name: label })).toBeInTheDocument();
    useStagedCandidatesMock.mockReturnValue(project(2));
    view.rerender(<TriageWorkspace node={createNode()} />);
    expect(screen.getByRole("heading", { name: `2 ${label}` })).toBeInTheDocument();
    expect(stageCandidateMock).not.toHaveBeenCalled();
    expect(unstageCandidateMock).not.toHaveBeenCalled();
  });

  it.each(["node", "bit"] as const)("returns empty remote-arrival activation to the affected %s subsection", async (type) => {
    const candidate = { id: "arrival", resultType: type, content: "New candidate" };
    const state = (candidates: typeof candidate[]) => ({ isReady: true, candidates, integrityCandidates: [],
      counts: { nodes: type === "node" ? candidates.length : 0, bits: type === "bit" ? candidates.length : 0,
        visibleNodes: type === "node" ? candidates.length : 0, visibleBits: type === "bit" ? candidates.length : 0 } });
    useStagedCandidatesMock.mockReturnValue(state([]));
    const view = render(<TriageWorkspace node={createNode()} />);
    useStagedCandidatesMock.mockReturnValue(state([candidate]));
    view.rerender(<TriageWorkspace node={createNode()} />);
    const action = await screen.findByRole("button", { name: `Show new ${type === "node" ? "Nodes" : "Bits"}` });
    // The currently observed DOM no longer contains the arrived candidate.
    document.querySelector('[data-candidate-id="arrival"]')?.remove();
    fireEvent.click(action);
    expect(screen.getByRole("heading", { name: type === "node" ? "Nodes" : "Bits" })).toHaveFocus();
    expect(stageCandidateMock).not.toHaveBeenCalled();
  });

  it("prefixes subsection headings only when authoritative type counts reach two", () => {
    useStagedCandidatesMock.mockReturnValue({
      counts: { nodes: 2, bits: 3, visibleNodes: 2, visibleBits: 3 },
    });

    render(<TriageWorkspace node={createNode()} />);

    expect(useStagedCandidatesMock).toHaveBeenCalledWith("scratch-1");
    expect(screen.getByRole("heading", { level: 3, name: "2 Nodes" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "3 Bits" })).toBeInTheDocument();
    expect(screen.getByTestId("triage-staging-columns")).toHaveAttribute(
      "data-layout-ratio",
      "35/65",
    );
  });

  it("keeps bare subsection headings at zero or one authoritative candidate", () => {
    useStagedCandidatesMock.mockReturnValue({
      counts: { nodes: 1, bits: 0, visibleNodes: 1, visibleBits: 0 },
    });

    render(<TriageWorkspace node={createNode()} />);

    expect(screen.getByRole("heading", { level: 3, name: "Nodes" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Bits" })).toBeInTheDocument();
  });

  it("shows the remove-from-staging strip only while dragging a staged candidate", () => {
    const { rerender } = render(<TriageWorkspace node={createNode()} />);

    expect(screen.queryByText("Remove from staging")).not.toBeInTheDocument();

    useTriageDndMock.mockReturnValue(
      createDndState({
        activeDragItem: {
          kind: "triage-staged-node",
          id: "candidate-1",
          label: "Project",
          sourceBreakdownId: "breakdown-1",
        },
      }),
    );

    rerender(<TriageWorkspace node={createNode()} />);

    expect(screen.getByText("Remove from staging")).toBeInTheDocument();
    expect(
      document.querySelector(
        '[aria-label="Drop staged item here to remove from staging"]',
      ),
    ).toHaveAttribute("data-triage-role", "staging-unstage-target");
    expect(screen.getByText("Remove from staging").parentElement).not.toHaveClass("motion-safe:animate-jiggle");
  });

  it("applies destructive tokens only while the compatible staged remove target is active", () => {
    useTriageDndMock.mockReturnValue(
      createDndState({
        activeDragItem: {
          kind: "triage-staged-bit",
          id: "candidate-2",
          label: "Todo",
          sourceBreakdownId: "breakdown-2",
        },
        overTargetId: "triage-remove-drop",
      }),
    );

    render(<TriageWorkspace node={createNode()} />);

    expect(
      document.querySelector(
        '[aria-label="Drop staged item here to remove from staging"]',
      ),
    ).toHaveClass(
      "bg-destructive/10",
      "border-destructive",
      "border-solid",
      "text-destructive",
    );
    expect(unstageCandidateMock).not.toHaveBeenCalled();
  });

  it("keeps idle and incompatible staged remove states neutral", () => {
    useTriageDndMock.mockReturnValue(
      createDndState({
        activeDragItem: {
          kind: "triage-staged-node",
          id: "candidate-1",
          label: "Project",
          sourceBreakdownId: "breakdown-1",
        },
        overTargetId: "triage-bit-zone-drop",
      }),
    );

    render(<TriageWorkspace node={createNode()} />);

    const removeTarget = document.querySelector(
      '[aria-label="Drop staged item here to remove from staging"]',
    );
    expect(removeTarget).toHaveClass(
      "border-dashed",
      "border-border",
      "text-muted-foreground",
    );
    expect(removeTarget).not.toHaveClass(
      "border-destructive",
      "bg-destructive/10",
      "text-destructive",
    );
    expect(unstageCandidateMock).not.toHaveBeenCalled();
  });

  it("does not activate Remove for an invalidated staged source or dispatch a mutation", () => {
    useTriageDndMock.mockReturnValue(createDndState({ activeDragItem: { kind: "triage-staged-node", id: "candidate-1", label: "Project", integrity: "invalidated" }, overTargetId: "triage-remove-drop" }));
    render(<TriageWorkspace node={createNode()} />);
    expect(screen.getByLabelText("Drop staged item here to remove from staging")).toHaveAttribute("data-triage-state", "available");
    expect(unstageCandidateMock).not.toHaveBeenCalled();
  });

  it("shows hierarchy cells as valid while a breakdown row is dragged", () => {
    useTriageDndMock.mockReturnValue(
      createDndState({
        activeDragItem: {
          kind: "triage-breakdown",
          id: "breakdown-1",
          label: "Project",
        },
      }),
    );

    render(<TriageWorkspace node={createNode()} />);

    expect(screen.getByTestId("hierarchy-section-body-home").closest('[data-triage-role="explorer-pane"]')).toHaveClass(
      "ring-1",
    );
    expect(screen.getByTestId("hierarchy-section-body-home").closest('[data-triage-role="explorer-pane"]')).not.toHaveClass(
      "cursor-not-allowed",
    );
  });

  it("shows Home section body as invalid while a staged Bit is dragged", () => {
    useTriageDndMock.mockReturnValue(
      createDndState({
        activeDragItem: {
          kind: "triage-staged-bit",
          id: "candidate-2",
          label: "Todo",
          sourceBreakdownId: "breakdown-2",
        },
      }),
    );

    render(<TriageWorkspace node={createNode()} />);

    expect(screen.getByTestId("hierarchy-section-body-home").closest('[data-triage-role="explorer-pane"]')).toHaveClass(
      "cursor-not-allowed",
    );
  });

  it("renders all four hierarchy section body drop zones", () => {
    render(<TriageWorkspace node={createNode()} />);

    expect(screen.getByTestId("hierarchy-section-body-home")).toBeInTheDocument();
    expect(screen.getByTestId("hierarchy-section-body-l1")).toBeInTheDocument();
    expect(screen.getByTestId("hierarchy-section-body-l2")).toBeInTheDocument();
    expect(screen.getByTestId("hierarchy-section-body-l3")).toBeInTheDocument();
  });

  it.each([
    ["direct", "node"],
    ["direct", "bit"],
    ["staged", "node"],
    ["staged", "bit"],
  ] as const)(
    "projects the successful %s %s identity and confirmed destination path into Explorer",
    async (kind, resultType) => {
    const target = {
      ...createNode({ id: "parent-1", title: "Parent" }),
      systemRole: null,
    };
    useGridDataMock.mockImplementation((parentId) => ({
      nodes: parentId === null ? [target] : [],
      bits: [],
      isLoading: false,
    }));
    if (kind === "staged") {
      const source = authoritativeBreakdown();
      useStagedCandidatesMock.mockReturnValue({
        isReady: true,
        candidates: [
          authoritativeCandidate({
            content: source.content,
            resultType,
            source,
          }),
        ],
        integrityCandidates: [],
        pendingOperations: [],
        unknownOperations: [],
        reconcilingOperations: [],
        counts: { nodes: resultType === "node" ? 1 : 0, bits: resultType === "bit" ? 1 : 0, visibleNodes: resultType === "node" ? 1 : 0, visibleBits: resultType === "bit" ? 1 : 0 },
        eligibility: { stagedSourceIds: new Set(["breakdown-1"]) },
        stageCandidate: stageCandidateMock,
        reconcileStageCandidate: reconcileStageCandidateMock,
        unstageCandidate: unstageCandidateMock,
        reconcileUnstageCandidate: reconcileUnstageCandidateMock,
      });
    }
    useTriageDndMock.mockReturnValue(
      createDndState({
        placementRelease:
          kind === "direct"
            ? createDirectPlacementRelease()
            : createStagedPlacementRelease({
                source: { id: "breakdown-1", title: "Project", version: 1 },
                candidate: { id: "candidate-1", resultType, version: 3 },
              }),
      }),
    );

    render(<TriageWorkspace node={createNode()} />);

    if (kind === "direct") {
      fireEvent.click(
        await screen.findByRole("button", {
          name: resultType === "node" ? "Node" : "Bit",
        }),
      );
    }
    const confirmName = "OK";
    const affordance = screen.getByRole("region", { name: "Placement" });
    expect(affordance.querySelector('[data-triage-role="placement-reliability-slot"]')).not.toBeNull();
    expect(affordance.querySelector('[data-triage-role="placement-target-path"]')).toBeNull();
    const stagedRow = affordance.querySelector('[data-triage-role="placement-staged-summary-row"]');
    {
      expect(stagedRow).toContainElement(screen.getByRole("button", { name: confirmName }));
      const typeRow = affordance.querySelector('[data-triage-role="placement-type-row"]');
      expect(stagedRow?.nextElementSibling).toBe(typeRow);
      expect(typeRow?.nextElementSibling).toBe(affordance.querySelector('[data-triage-role="placement-reliability-slot"]'));
      expect(typeRow).toHaveTextContent(resultType === "node" ? "Node" : "Bit");
    }
    expect(affordance.querySelector('[data-triage-role="placement-confirm"]')).toBe(screen.getByRole("button", { name: confirmName }));
    fireEvent.click(screen.getByRole("button", { name: confirmName }));

    await waitFor(() =>
      expect(useExplorerRemoteStatusMock).toHaveBeenCalledWith(
        expect.objectContaining({
          localPlacementResult: {
            id: expect.any(String),
            type: resultType,
            pathIds: ["parent-1"],
          },
        }),
      ),
    );
    expect(
      kind === "direct" ? placeDirectBreakdownMock : placeStagedCandidateMock,
    ).toHaveBeenCalledOnce();
  },
  );

  it("closes the actual placement owner when Explorer validation invalidates its target", async () => {
    const target = {
      ...createNode({ id: "parent-1", title: "Parent" }),
      systemRole: null,
    };
    let rootNodes = [target];
    useGridDataMock.mockImplementation((parentId) => ({
      nodes: parentId === null ? rootNodes : [],
      bits: [],
      isLoading: false,
    }));
    useTriageDndMock.mockReturnValue(
      createDndState({
        placementRelease: createDirectPlacementRelease(),
      }),
    );

    const view = render(<TriageWorkspace node={createNode()} />);
    expect(await screen.findByRole("region", { name: "Placement" })).toBeInTheDocument();

    rootNodes = [];
    view.rerender(<TriageWorkspace node={createNode()} />);

    await vi.waitFor(() => {
      expect(screen.queryByRole("region", { name: "Placement" })).not.toBeInTheDocument();
    });
    expect(
      within(screen.getByRole("button", { name: "Dismiss Staging alert" }).parentElement!)
        .getByText("Placement closed because this Explorer path changed."),
    ).toBeInTheDocument();
    expect(screen.getByTestId("staging-live-region")).toHaveTextContent(
      "Placement closed because this Explorer path changed.",
    );
    expect(document.querySelector(".explorer-path-status")).not.toHaveAttribute(
      "role",
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Drag breakdown" })).toHaveFocus(),
    );
  });

  it("returns stale-target focus to the direct source instead of a valid destination ancestor", async () => {
    const ancestor = {
      ...createNode({ id: "ancestor", title: "Ancestor" }),
      systemRole: null,
    };
    const target = {
      ...createNode({
        id: "parent-1",
        parentId: ancestor.id,
        level: 1,
        title: "Target",
      }),
      systemRole: null,
    };
    const sibling = {
      ...createNode({
        id: "sibling",
        parentId: ancestor.id,
        level: 1,
        title: "Sibling",
      }),
      systemRole: null,
    };
    let childNodes = [target, sibling];
    let placementRelease: TriagePlacementRelease | null = createDirectPlacementRelease({
      target: {
        dropId: "triage-hierarchy:parent-1",
        parentId: "parent-1",
        level: 0,
        title: "Parent",
        path: [ancestor.title, "Parent"],
        expectedAncestorIds: ["parent-1"],
        cell: { x: 0, y: 0 },
        isFull: false,
      },
    });
    const cancelPlacement = vi.fn(() => {
      placementRelease = null;
      handlePlacementCancelMock();
    });
    useGridDataMock.mockImplementation((parentId) => ({
      nodes:
        parentId === null
          ? [ancestor]
          : parentId === ancestor.id
            ? childNodes
            : [],
      bits: [],
      isLoading: false,
    }));
    useTriageDndMock.mockImplementation(() =>
      createDndState({
        handlePlacementCancel: cancelPlacement,
        placementRelease,
      }),
    );
    useTriageStore.setState({
      explorerPathIds: [ancestor.id],
      explorerOpenColumnIds: ["home", ancestor.id],
    });

    const view = render(<TriageWorkspace node={createNode()} />);
    expect(await screen.findByRole("region", { name: "Placement" })).toBeInTheDocument();

    childNodes = [sibling];
    view.rerender(<TriageWorkspace node={createNode()} />);

    await waitFor(() =>
      expect(screen.queryByRole("region", { name: "Placement" })).not.toBeInTheDocument(),
    );
    expect(handlePlacementCancelMock).not.toHaveBeenCalled();
    expect(handlePlacementConfirmMock).not.toHaveBeenCalled();
    expect(useTriageStore.getState().explorerPathIds).toEqual([ancestor.id]);
    expect(
      screen.getByRole("button", { name: `Select Node: ${sibling.title}` }),
    ).not.toHaveAttribute("aria-current");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Drag breakdown" })).toHaveFocus(),
    );
  });

  it("returns stale-target focus to the direct source when no destination ancestor survives", async () => {
    const target = {
      ...createNode({ id: "parent-1", title: "Target" }),
      systemRole: null,
    };
    const sibling = {
      ...createNode({ id: "sibling", title: "Sibling" }),
      systemRole: null,
    };
    let rootNodes = [target, sibling];
    let placementRelease: TriagePlacementRelease | null = createDirectPlacementRelease({
      target: {
        dropId: "triage-hierarchy:parent-1",
        parentId: "parent-1",
        level: 0,
        title: "Parent",
        path: ["Parent"],
        expectedAncestorIds: ["parent-1"],
        cell: { x: 0, y: 0 },
        isFull: false,
      },
    });
    const cancelPlacement = vi.fn(() => {
      placementRelease = null;
      handlePlacementCancelMock();
    });
    useGridDataMock.mockImplementation((parentId) => ({
      nodes: parentId === null ? rootNodes : [],
      bits: [],
      isLoading: false,
    }));
    useTriageDndMock.mockImplementation(() =>
      createDndState({
        handlePlacementCancel: cancelPlacement,
        placementRelease,
      }),
    );
    useTriageStore.setState({
      explorerPathIds: [],
      explorerOpenColumnIds: ["home"],
    });

    const view = render(<TriageWorkspace node={createNode()} />);
    expect(await screen.findByRole("region", { name: "Placement" })).toBeInTheDocument();

    rootNodes = [sibling];
    view.rerender(<TriageWorkspace node={createNode()} />);

    await waitFor(() =>
      expect(screen.queryByRole("region", { name: "Placement" })).not.toBeInTheDocument(),
    );
    expect(handlePlacementCancelMock).not.toHaveBeenCalled();
    expect(handlePlacementConfirmMock).not.toHaveBeenCalled();
    expect(useTriageStore.getState().explorerPathIds).toEqual([]);
    expect(
      screen.getByRole("button", { name: `Select Node: ${sibling.title}` }),
    ).not.toHaveAttribute("aria-current");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Drag breakdown" })).toHaveFocus(),
    );
  });

  it("requires a distinct direct type step before target-column confirmation and dispatches once", async () => {
    const target = {
      ...createNode({ id: "parent-1", title: "Parent" }),
      systemRole: null,
    };
    useGridDataMock.mockImplementation((parentId) => ({
      nodes: parentId === null ? [target] : [],
      bits: [],
      isLoading: false,
    }));
    useTriageDndMock.mockReturnValue(
      createDndState({
        placementRelease: createDirectPlacementRelease(),
      }),
    );

    render(<TriageWorkspace node={createNode()} />);

    expect(await screen.findByRole("heading", { name: "DIRECT PLACEMENT" })).toHaveFocus();
    expect(screen.queryByRole("button", { name: "OK" })).not.toBeInTheDocument();
    const nodeOption = screen.getByRole("button", { name: "Node" });

    fireEvent.click(nodeOption);

    expect(screen.getByText("Confirm placement")).toBeInTheDocument();
    const confirmButton = screen.getByRole("button", { name: "OK" });

    fireEvent.click(confirmButton);

    await waitFor(() => expect(placeDirectBreakdownMock).toHaveBeenCalledOnce());
    expect(placeDirectBreakdownMock).toHaveBeenCalledWith(
      expect.objectContaining({ resultType: "node", targetParentId: "parent-1" }),
    );
    expect(handlePlacementConfirmMock).not.toHaveBeenCalled();
  });

  it("routes an exact over-limit staged draft through Continue and dispatches it without source mutation", async () => {
    const target = {
      ...createNode({ id: "parent-1", title: "Parent" }),
      systemRole: null,
    };
    const candidate = authoritativeCandidate();
    useGridDataMock.mockImplementation((parentId) => ({
      nodes: parentId === null ? [target] : [],
      bits: [],
      isLoading: false,
    }));
    useStagedCandidatesMock.mockReturnValue({
      isReady: true,
      candidates: [candidate],
      integrityCandidates: [],
      pendingOperations: [],
      unknownOperations: [],
      reconcilingOperations: [],
      counts: { nodes: 0, bits: 1, visibleNodes: 0, visibleBits: 1 },
      eligibility: { stagedSourceIds: new Set(["breakdown-1"]) },
      stageCandidate: stageCandidateMock,
      reconcileStageCandidate: reconcileStageCandidateMock,
      unstageCandidate: unstageCandidateMock,
      reconcileUnstageCandidate: reconcileUnstageCandidateMock,
    });
    useScratchBreakdownsMock.mockReturnValue({ breakdowns: [candidate.source] });
    useTriageDndMock.mockReturnValue(
      createDndState({ placementRelease: createStagedPlacementRelease() }),
    );

    render(<TriageWorkspace node={createNode()} />);

    const input = await screen.findByRole("textbox", { name: "Result title" });
    fireEvent.change(input, { target: { value: "Exact Bit result" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("heading", { name: "Confirm placement" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "OK" }));

    await waitFor(() => expect(placeStagedCandidateMock).toHaveBeenCalledOnce());
    expect(placeStagedCandidateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        candidateId: "candidate-1",
        resultType: "bit",
        title: "Exact Bit result",
        sourceBreakdownId: "breakdown-1",
        sourceExpectedVersion: 1,
      }),
    );
    expect(candidate.source.content).toBe("s".repeat(201));
  });

  it("discards a dirty staged Result Title on Escape and restores the candidate without a write", async () => {
    const target = {
      ...createNode({ id: "parent-1", title: "Parent" }),
      systemRole: null,
    };
    const candidate = authoritativeCandidate();
    useGridDataMock.mockImplementation((parentId) => ({
      nodes: parentId === null ? [target] : [],
      bits: [],
      isLoading: false,
    }));
    useStagedCandidatesMock.mockReturnValue({
      isReady: true,
      candidates: [candidate],
      integrityCandidates: [],
      pendingOperations: [],
      unknownOperations: [],
      reconcilingOperations: [],
      counts: { nodes: 0, bits: 1, visibleNodes: 0, visibleBits: 1 },
      eligibility: { stagedSourceIds: new Set(["breakdown-1"]) },
      stageCandidate: stageCandidateMock,
      reconcileStageCandidate: reconcileStageCandidateMock,
      unstageCandidate: unstageCandidateMock,
      reconcileUnstageCandidate: reconcileUnstageCandidateMock,
    });
    useScratchBreakdownsMock.mockReturnValue({
      breakdowns: [candidate.source],
      isReady: true,
    });
    useTriageDndMock.mockReturnValue(
      createDndState({ placementRelease: createStagedPlacementRelease() }),
    );
    render(<TriageWorkspace node={createNode()} />);

    const input = await screen.findByRole("textbox", { name: "Result title" });
    fireEvent.change(input, { target: { value: "Dirty exact draft" } });
    fireEvent.keyDown(input, { key: "Escape" });

    await waitFor(() =>
      expect(screen.queryByRole("region", { name: "Placement" })).toBeNull(),
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "s".repeat(201) })).toHaveFocus(),
    );
    expect(placeDirectBreakdownMock).not.toHaveBeenCalled();
    expect(placeStagedCandidateMock).not.toHaveBeenCalled();
  });

  it("invalidates a staged target once and restores its surviving candidate", async () => {
    const target = {
      ...createNode({ id: "parent-1", title: "Parent" }),
      systemRole: null,
    };
    const candidate = authoritativeCandidate();
    let rootNodes = [target];
    useGridDataMock.mockImplementation((parentId) => ({
      nodes: parentId === null ? rootNodes : [],
      bits: [],
      isLoading: false,
    }));
    useStagedCandidatesMock.mockReturnValue({
      isReady: true,
      candidates: [candidate],
      integrityCandidates: [],
      pendingOperations: [],
      unknownOperations: [],
      reconcilingOperations: [],
      counts: { nodes: 0, bits: 1, visibleNodes: 0, visibleBits: 1 },
      eligibility: { stagedSourceIds: new Set(["breakdown-1"]) },
      stageCandidate: stageCandidateMock,
      reconcileStageCandidate: reconcileStageCandidateMock,
      unstageCandidate: unstageCandidateMock,
      reconcileUnstageCandidate: reconcileUnstageCandidateMock,
    });
    useScratchBreakdownsMock.mockReturnValue({
      breakdowns: [candidate.source],
      isReady: true,
    });
    useTriageDndMock.mockReturnValue(
      createDndState({ placementRelease: createStagedPlacementRelease() }),
    );
    const view = render(<TriageWorkspace node={createNode()} />);
    expect(await screen.findByRole("textbox", { name: "Result title" })).toBeInTheDocument();

    rootNodes = [];
    view.rerender(<TriageWorkspace node={createNode()} />);

    await waitFor(() =>
      expect(screen.queryByRole("region", { name: "Placement" })).toBeNull(),
    );
    expect(screen.getByTestId("staging-live-region")).toHaveTextContent(
      "Placement closed because this Explorer path changed.",
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "s".repeat(201) })).toHaveFocus(),
    );
    expect(placeStagedCandidateMock).not.toHaveBeenCalled();
  });

  it("invalidates a direct draft once on authoritative source revision and returns focus to its Breakdown grip", async () => {
    const target = {
      ...createNode({ id: "parent-1", title: "Parent" }),
      systemRole: null,
    };
    let breakdowns = [authoritativeBreakdown()];
    useScratchBreakdownsMock.mockImplementation(() => ({ breakdowns, isReady: true }));
    useGridDataMock.mockImplementation((parentId) => ({
      nodes: parentId === null ? [target] : [],
      bits: [],
      isLoading: false,
    }));
    useTriageDndMock.mockReturnValue(
      createDndState({ placementRelease: createDirectPlacementRelease() }),
    );
    const view = render(<TriageWorkspace node={createNode()} />);
    expect(await screen.findByRole("region", { name: "Placement" })).toBeInTheDocument();

    breakdowns = [authoritativeBreakdown({ version: 2 })];
    view.rerender(<TriageWorkspace node={createNode()} />);

    await waitFor(() =>
      expect(screen.queryByRole("region", { name: "Placement" })).toBeNull(),
    );
    expect(screen.getByTestId("staging-live-region")).toHaveTextContent(
      "Placement closed because “Project” changed elsewhere.",
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Drag breakdown" })).toHaveFocus(),
    );
    expect(placeDirectBreakdownMock).not.toHaveBeenCalled();
    expect(placeStagedCandidateMock).not.toHaveBeenCalled();
  });

  it("waits for the first authoritative direct-source snapshot before invalidating", async () => {
    const target = {
      ...createNode({ id: "parent-1", title: "Parent" }),
      systemRole: null,
    };
    let sourceProjection = { breakdowns: [] as ReturnType<typeof authoritativeBreakdown>[], isReady: false };
    useScratchBreakdownsMock.mockImplementation(() => sourceProjection);
    useGridDataMock.mockImplementation((parentId) => ({
      nodes: parentId === null ? [target] : [],
      bits: [],
      isLoading: false,
    }));
    useTriageDndMock.mockReturnValue(
      createDndState({ placementRelease: createDirectPlacementRelease() }),
    );
    const view = render(<TriageWorkspace node={createNode()} />);

    expect(await screen.findByRole("region", { name: "Placement" })).toBeInTheDocument();
    expect(screen.queryByText(/changed elsewhere/)).toBeNull();

    sourceProjection = {
      breakdowns: [authoritativeBreakdown()],
      isReady: true,
    };
    view.rerender(<TriageWorkspace node={createNode()} />);

    expect(screen.getByRole("region", { name: "Placement" })).toBeInTheDocument();
    expect(screen.queryByText(/changed elsewhere/)).toBeNull();
    expect(placeDirectBreakdownMock).not.toHaveBeenCalled();
  });

  it("returns direct source disappearance to the Breakdown heading without a write", async () => {
    const target = {
      ...createNode({ id: "parent-1", title: "Parent" }),
      systemRole: null,
    };
    let breakdowns = [authoritativeBreakdown()];
    useScratchBreakdownsMock.mockImplementation(() => ({ breakdowns, isReady: true }));
    useGridDataMock.mockImplementation((parentId) => ({
      nodes: parentId === null ? [target] : [],
      bits: [],
      isLoading: false,
    }));
    useTriageDndMock.mockReturnValue(
      createDndState({ placementRelease: createDirectPlacementRelease() }),
    );
    const view = render(<TriageWorkspace node={createNode()} />);
    expect(await screen.findByRole("region", { name: "Placement" })).toBeInTheDocument();

    breakdowns = [];
    breakdownSurfaceState.showSource = false;
    view.rerender(<TriageWorkspace node={createNode()} />);

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Breakdown" })).toHaveFocus(),
    );
    expect(placeDirectBreakdownMock).not.toHaveBeenCalled();
    expect(placeStagedCandidateMock).not.toHaveBeenCalled();
  });

  it.each(["candidate", "source"] as const)(
    "invalidates a staged draft once on authoritative %s change and uses its safe fallback",
    async (changedOwner) => {
      const target = {
        ...createNode({ id: "parent-1", title: "Parent" }),
        systemRole: null,
      };
      let candidates = [authoritativeCandidate()];
      const integrityCandidates: never[] = [];
      const pendingOperations: never[] = [];
      const unknownOperations: never[] = [];
      const reconcilingOperations: never[] = [];
      const eligibility = { stagedSourceIds: new Set(["breakdown-1"]) };
      const counts = { nodes: 0, bits: 1 };
      useStagedCandidatesMock.mockImplementation(() => ({
        isReady: true,
        candidates,
        integrityCandidates,
        pendingOperations,
        unknownOperations,
        reconcilingOperations,
        counts,
        eligibility,
        stageCandidate: stageCandidateMock,
        reconcileStageCandidate: reconcileStageCandidateMock,
        unstageCandidate: unstageCandidateMock,
        reconcileUnstageCandidate: reconcileUnstageCandidateMock,
      }));
      useScratchBreakdownsMock.mockReturnValue({
        breakdowns: [candidates[0]!.source],
      });
      useGridDataMock.mockImplementation((parentId) => ({
        nodes: parentId === null ? [target] : [],
        bits: [],
        isLoading: false,
      }));
      useTriageDndMock.mockReturnValue(
        createDndState({ placementRelease: createStagedPlacementRelease() }),
      );
      const view = render(<TriageWorkspace node={createNode()} />);
      expect(await screen.findByRole("textbox", { name: "Result title" })).toBeInTheDocument();

      candidates =
        changedOwner === "candidate"
          ? []
          : [
              authoritativeCandidate({
                source: authoritativeBreakdown({
                  content: "Changed source",
                  version: 2,
                }),
                content: "Changed source",
              }),
            ];
      view.rerender(<TriageWorkspace node={createNode()} />);

      await waitFor(() =>
        expect(screen.queryByRole("region", { name: "Placement" })).toBeNull(),
      );
      expect(screen.getByTestId("staging-live-region")).toHaveTextContent(
        `Placement closed because “${"s".repeat(201)}” changed elsewhere.`,
      );
      const alert = screen.getByRole("button", {
        name: "Dismiss Staging alert",
      }).parentElement!;
      expect(
        within(alert).getAllByText(
          `Placement closed because “${"s".repeat(201)}” changed elsewhere.`,
        ),
      ).toHaveLength(1);
      if (changedOwner === "candidate") {
        await waitFor(() =>
          expect(screen.getByRole("heading", { name: "Staging" })).toHaveFocus(),
        );
      } else {
        await waitFor(() =>
          expect(screen.getByRole("button", { name: "Changed source" })).toHaveFocus(),
        );
      }
      expect(placeDirectBreakdownMock).not.toHaveBeenCalled();
      expect(placeStagedCandidateMock).not.toHaveBeenCalled();
    },
  );

  it("returns pre-dispatch Cancel to the exact direct source without any write", async () => {
    const target = {
      ...createNode({ id: "parent-1", title: "Parent" }),
      systemRole: null,
    };
    useGridDataMock.mockImplementation((parentId) => ({
      nodes: parentId === null ? [target] : [],
      bits: [],
      isLoading: false,
    }));
    useTriageDndMock.mockReturnValue(
      createDndState({ placementRelease: createDirectPlacementRelease() }),
    );

    render(<TriageWorkspace node={createNode()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));

    await waitFor(() =>
      expect(screen.queryByRole("region", { name: "Placement" })).not.toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Drag breakdown" })).toHaveFocus(),
    );
    expect(placeDirectBreakdownMock).not.toHaveBeenCalled();
    expect(placeStagedCandidateMock).not.toHaveBeenCalled();
  });

  it("shows disabled direct type choices for invalid target types", async () => {
    useTriageDndMock.mockReturnValue(
      createDndState({
        placementRelease: createDirectPlacementRelease({
          target: {
            dropId: "triage-hierarchy:body-home",
            parentId: null,
            level: null,
            title: "Home",
            path: ["Home"],
            expectedAncestorIds: [],
            cell: { x: 0, y: 0 },
            isFull: false,
          },
        }),
      }),
    );

    render(<TriageWorkspace node={createNode()} />);

    const nodeOption = await screen.findByRole("button", { name: "Node" });
    const bitOption = screen.getByRole("button", { name: "Bit" });

    expect(nodeOption).toBeEnabled();
    expect(bitOption).toBeDisabled();
    expect(screen.queryByRole("button", { name: "OK" })).not.toBeInTheDocument();
  });

  it("rejects a competing release while the first direct placement remains open", async () => {
    const firstTarget = {
      ...createNode({ id: "parent-1", title: "Parent" }),
      systemRole: null,
    };
    const secondTarget = {
      ...createNode({ id: "parent-2", title: "Next Parent" }),
      systemRole: null,
    };
    useGridDataMock.mockImplementation((parentId) => ({
      nodes: parentId === null ? [firstTarget, secondTarget] : [],
      bits: [],
      isLoading: false,
    }));
    let placementRelease = createDirectPlacementRelease({
      target: {
        ...createDirectPlacementRelease().target,
        dropId: "triage-hierarchy:parent-1",
      },
    });
    useTriageDndMock.mockImplementation(() =>
      createDndState({ placementRelease }),
    );

    const { rerender } = render(<TriageWorkspace node={createNode()} />);

    fireEvent.click(await screen.findByRole("button", { name: "Node" }));
    expect(screen.getByText("Project")).toBeInTheDocument();

    placementRelease = createDirectPlacementRelease({
      source: { id: "breakdown-2", title: "Next Project", version: 1 },
      target: {
        ...createDirectPlacementRelease().target,
        dropId: "triage-hierarchy:parent-2",
        parentId: "parent-2",
        title: "Next Parent",
        path: ["Home", "Next Parent"],
        expectedAncestorIds: ["parent-2"],
      },
    });
    rerender(<TriageWorkspace node={createNode()} />);

    expect(screen.getByText("Project")).toBeInTheDocument();
    expect(screen.queryByText("Next Project")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "OK" })).toBeInTheDocument();
  });

  it("shows isFull warning with muted styling, not destructive, when target is full", async () => {
    useTriageDndMock.mockReturnValue(
      createDndState({
        placementRelease: createDirectPlacementRelease({
          target: {
            ...createDirectPlacementRelease().target,
            isFull: true,
            cell: null,
          },
        }),
      }),
    );
    const target = {
      ...createNode({ id: "parent-1", title: "Parent" }),
      systemRole: null,
    };
    useGridDataMock.mockImplementation((parentId) => ({
      nodes: parentId === null ? [target] : [],
      bits: [],
      isLoading: false,
    }));

    render(<TriageWorkspace node={createNode()} />);

    fireEvent.click(await screen.findByRole("button", { name: "Node" }));
    const warning = screen.getByText("No available grid cell in this target");
    expect(warning).toBeInTheDocument();
    expect(warning).not.toHaveClass("text-destructive");
    expect(warning).toHaveClass("text-muted-foreground");
    expect(screen.getByRole("button", { name: "OK" })).toBeDisabled();
  });

  it("owns Newly Placed for the mounted page across Scratch, path, and theme and clears it on remount", async () => {
    const target = {
      ...createNode({ id: "parent-1", title: "Parent", systemRole: null }),
      systemRole: null,
    };
    let placedNodes: Node[] = [];
    useGridDataMock.mockImplementation((parentId) => ({
      nodes: parentId === null ? [target] : parentId === target.id ? placedNodes : [],
      bits: [],
      isLoading: false,
    }));
    useTriageDndMock.mockReturnValue(
      createDndState({ placementRelease: createDirectPlacementRelease() }),
    );
    placeDirectBreakdownMock.mockImplementation(async (command) => {
      const placed = createNode({
        id: command.resultId,
        title: command.title,
        parentId: command.targetParentId,
        level: 1,
        systemRole: null,
        x: command.x,
        y: command.y,
        version: 1,
      });
      placedNodes = [placed];
      return {
        operationId: command.operationId,
        status: "applied",
        result: placed,
        source: null,
        candidate: null,
      };
    });

    const mounted = render(<TriageWorkspace node={createNode()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Node" }));
    fireEvent.click(screen.getByRole("button", { name: "OK" }));

    expect(await screen.findByText("NEW")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Select Node: Project" })).toHaveAttribute(
      "data-newly-placed",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: "Second Scratch" }));
    expect(screen.getByText("NEW")).toBeInTheDocument();
    document.documentElement.dataset.colorTheme = "neumorphism";
    mounted.rerender(<TriageWorkspace node={createNode()} />);
    expect(screen.getByText("NEW")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Home" }));
    expect(screen.queryByText("NEW")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Select Node: Parent" }));
    expect(await screen.findByText("NEW")).toBeInTheDocument();

    mounted.unmount();
    render(<TriageWorkspace node={createNode()} />);
    expect(screen.getByRole("button", { name: "Select Node: Project" })).toBeInTheDocument();
    expect(screen.queryByText("NEW")).not.toBeInTheDocument();
    delete document.documentElement.dataset.colorTheme;
  });
});

describe("TriageWorkspace Archive handoff with the real coordinator", () => {
  const ARCHIVE_SCRATCH_ID = "11111111-1111-4111-8111-111111111111";
  const RECOVERY_KEY = "griddo.pending-operation-recovery.archive-scratch";
  let operationCounter = 0;
  let dispatchResolvers: Array<(result: { operationId: string; status: string }) => void> = [];
  const dispatchArchiveMock = vi.fn();
  const reconcileArchiveMock = vi.fn();
  let storageFailsOnSet = false;

  async function useRealCoordinator() {
    const actual = await vi.importActual<
      typeof import("@/hooks/use-archive-scratch")
    >("@/hooks/use-archive-scratch");
    useArchiveScratchMock.mockImplementation((options) =>
      actual.useArchiveScratch({
        ...options,
        createOperationId: () =>
          `00000000-0000-4000-8000-${String(++operationCounter).padStart(12, "0")}`,
        dispatchArchive: dispatchArchiveMock,
        reconcileArchive: reconcileArchiveMock,
        getStorage: () =>
          storageFailsOnSet
            ? ({
                getItem: (key: string) => window.sessionStorage.getItem(key),
                removeItem: (key: string) => window.sessionStorage.removeItem(key),
                setItem: () => {
                  throw new Error("quota");
                },
              } as unknown as Storage)
            : window.sessionStorage,
      }),
    );
  }

  function lastCoordinator() {
    return useArchiveScratchMock.mock.results.at(-1)?.value as {
      retry: () => Promise<boolean>;
    };
  }

  function observeSamples(container: HTMLElement) {
    const samples: Array<{
      active: Element | null;
      boundary: boolean;
      context: string | null;
      phase: string | null;
    }> = [];
    const record = () => {
      const panel = container.querySelector('[data-testid="breakdown-panel"]');
      samples.push({
        active: document.activeElement,
        boundary:
          container.querySelector('[data-triage-role="archive-recovery-boundary"]') !== null,
        context:
          container.querySelector('[data-testid="selected-scratch-context"]')
            ?.textContent ?? null,
        phase: panel?.getAttribute("data-archive-phase") ?? null,
      });
    };
    const observer = new MutationObserver(record);
    observer.observe(container, {
      attributes: true,
      childList: true,
      subtree: true,
    });
    return { samples, stop: () => observer.disconnect() };
  }

  afterEach(() => {
    completionState.eligibility.scratch.id = "scratch-1";
  });

  beforeEach(async () => {
    completionState.eligibility.scratch.id = ARCHIVE_SCRATCH_ID;
    useTriageStore.setState({ selectedScratchId: ARCHIVE_SCRATCH_ID });
    operationCounter = 0;
    dispatchResolvers = [];
    storageFailsOnSet = false;
    window.sessionStorage.clear();
    dispatchArchiveMock.mockReset();
    dispatchArchiveMock.mockImplementation(
      () => new Promise((resolve) => dispatchResolvers.push(resolve)),
    );
    reconcileArchiveMock.mockReset();
    await useRealCoordinator();
  });

  it("keeps the workspace mounted and focus off BODY in every commit through a successful Archive", async () => {
    const { container } = render(<TriageWorkspace node={createNode()} />);
    const region = screen.getByTestId("triage-workspace");
    const button = screen.getByRole("button", { name: "Archive completion" });
    button.focus();
    const observed = observeSamples(container);

    fireEvent.click(button);
    await act(async () => {});
    expect(screen.getByTestId("breakdown-panel")).toHaveAttribute(
      "data-archive-phase",
      "pending",
    );
    expect(dispatchArchiveMock).toHaveBeenCalledOnce();

    await act(async () => {
      dispatchResolvers[0]({
        operationId: "00000000-0000-4000-8000-000000000001",
        status: "applied",
      });
    });
    observed.stop();

    expect(screen.getByTestId("triage-workspace")).toBe(region);
    expect(observed.samples.length).toBeGreaterThan(0);
    for (const sample of observed.samples) {
      expect(sample.boundary).toBe(false);
      expect(sample.active).not.toBe(document.body);
      // Only the archiving Scratch's Breakdown reports an Archive phase.
      if (sample.context !== null && !sample.context.includes(ARCHIVE_SCRATCH_ID)) {
        expect(sample.phase).toBeNull();
      }
    }
    expect(useTriageStore.getState().selectedScratchId).not.toBe(ARCHIVE_SCRATCH_ID);
    expect(document.activeElement).toBe(
      screen.getByTestId("selected-scratch-context"),
    );
    expect(screen.getByTestId("archive-live-region")).toHaveTextContent(
      "Scratch archived.",
    );
  });

  it("focuses the search input when the Pool query changes during the terminal read and leaves no Scratch to show", async () => {
    getBitMock.mockResolvedValue(undefined);
    const reads: Array<(value: unknown[]) => void> = [];
    getBitsMock.mockImplementation(
      () => new Promise((resolve) => reads.push(resolve)),
    );
    const search = document.createElement("input");
    search.setAttribute("data-archive-handoff-focus", "search-empty");
    document.body.append(search);
    try {
      render(<TriageWorkspace node={createNode()} />);
      fireEvent.click(screen.getByRole("button", { name: "Archive completion" }));
      await act(async () => {});
      await act(async () => {
        dispatchResolvers[0]({
          operationId: "00000000-0000-4000-8000-000000000001",
          status: "applied",
        });
      });
      // The handoff is waiting on the read; the query changes meanwhile.
      await waitFor(() => expect(getBitsMock).toHaveBeenCalled());
      act(() => useTriageStore.setState({ scratchPoolQuery: "zzz" }));
      await act(async () => reads.forEach((finish) => finish([])));

      await waitFor(() =>
        expect(useTriageStore.getState().selectedScratchId).toBeNull(),
      );
      expect(document.activeElement).toBe(search);
    } finally {
      search.remove();
      useTriageStore.setState({ scratchPoolQuery: "" });
    }
  });

  async function archiveAndResolve(reads: Array<unknown[]>) {
    const pending: Array<(value: unknown[]) => void> = [];
    getBitsMock.mockImplementation(
      () => new Promise((resolve) => pending.push(resolve)),
    );
    render(<TriageWorkspace node={createNode()} />);
    fireEvent.click(screen.getByRole("button", { name: "Archive completion" }));
    await act(async () => {});
    await act(async () => {
      dispatchResolvers[0]({
        operationId: "00000000-0000-4000-8000-000000000001",
        status: "applied",
      });
    });
    await waitFor(() => expect(getBitsMock).toHaveBeenCalled());
    await act(async () => pending.forEach((finish) => finish(reads[0])));
  }

  it("hands off to the previous visible Scratch and focuses its Context when the archived one was last", async () => {
    getBitMock.mockResolvedValue({
      id: ARCHIVE_SCRATCH_ID,
      title: "Archived",
      createdAt: 1,
    });
    await archiveAndResolve([[{ id: "scratch-9", title: "Earlier", createdAt: 5 }]]);
    await waitFor(() =>
      expect(useTriageStore.getState().selectedScratchId).toBe("scratch-9"),
    );
    expect(document.activeElement).toBe(
      screen.getByTestId("selected-scratch-context"),
    );
  });

  it("focuses the primary Add action when no Scratch remains and the Pool is not filtered", async () => {
    getBitMock.mockResolvedValue(undefined);
    const add = document.createElement("button");
    add.setAttribute("aria-label", "Add item");
    document.body.append(add);
    try {
      await archiveAndResolve([[]]);
      await waitFor(() =>
        expect(useTriageStore.getState().selectedScratchId).toBeNull(),
      );
      expect(document.activeElement).toBe(add);
    } finally {
      add.remove();
    }
  });

  it("accepts a second Archive on the same mounted page after success", async () => {
    render(<TriageWorkspace node={createNode()} />);
    fireEvent.click(screen.getByRole("button", { name: "Archive completion" }));
    await act(async () => {});
    await act(async () => {
      dispatchResolvers[0]({
        operationId: "00000000-0000-4000-8000-000000000001",
        status: "applied",
      });
    });
    expect(screen.getByTestId("archive-live-region")).toHaveTextContent(
      "Scratch archived.",
    );

    fireEvent.click(screen.getByRole("button", { name: "Archive completion" }));
    await act(async () => {});
    expect(dispatchArchiveMock).toHaveBeenCalledTimes(2);
  });

  it("dismisses a live non-success result without a write when the selected Scratch changes", async () => {
    render(<TriageWorkspace node={createNode()} />);
    fireEvent.click(screen.getByRole("button", { name: "Archive completion" }));
    await act(async () => {});
    await act(async () => {
      dispatchResolvers[0]({
        operationId: "00000000-0000-4000-8000-000000000001",
        status: "conflict",
      });
    });
    expect(screen.getByTestId("breakdown-panel")).toHaveAttribute(
      "data-archive-phase",
      "terminal",
    );

    fireEvent.click(screen.getByRole("button", { name: "Second Scratch" }));
    await act(async () => {});

    expect(screen.getByTestId("breakdown-panel")).not.toHaveAttribute(
      "data-archive-phase",
    );
    expect(screen.queryByTestId("archive-recovery-card")).not.toBeInTheDocument();
    expect(dispatchArchiveMock).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: "Archive completion" }));
    await act(async () => {});
    expect(dispatchArchiveMock).toHaveBeenCalledTimes(2);
  });

  it("shows a pre-dispatch storage failure on the activated Scratch and dismisses it on a Scratch change", async () => {
    storageFailsOnSet = true;
    render(<TriageWorkspace node={createNode()} />);
    fireEvent.click(screen.getByRole("button", { name: "Archive completion" }));
    await act(async () => {});
    expect(dispatchArchiveMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("breakdown-panel")).toHaveAttribute(
      "data-archive-phase",
      "storage_failed",
    );

    fireEvent.click(screen.getByRole("button", { name: "Second Scratch" }));
    await act(async () => {});
    expect(screen.getByTestId("breakdown-panel")).not.toHaveAttribute(
      "data-archive-phase",
    );
  });

  it("keeps a restored not applied result in place, and the workspace identity through Retry → applied", async () => {
    window.sessionStorage.setItem(
      RECOVERY_KEY,
      JSON.stringify({
        operationId: "00000000-0000-4000-8000-0000000000aa",
        kind: "archive_scratch",
        scratchBitId: ARCHIVE_SCRATCH_ID,
        expectedVersion: 7,
        startedAt: 100,
      }),
    );
    reconcileArchiveMock.mockResolvedValue({
      operationId: "00000000-0000-4000-8000-0000000000aa",
      status: "not_applied",
    });
    const { container } = render(<TriageWorkspace node={createNode()} />);
    expect(screen.getByTestId("archive-recovery-card")).toBeInTheDocument();
    await act(async () => {});
    const region = screen.getByTestId("triage-workspace");
    expect(screen.getByTestId("breakdown-panel")).toHaveAttribute(
      "data-archive-phase",
      "terminal",
    );

    screen.getByRole("button", { name: "Archive completion" }).focus();
    const observed = observeSamples(container);
    await act(async () => {
      void lastCoordinator().retry();
    });
    await act(async () => {
      dispatchResolvers[0]({
        operationId: "00000000-0000-4000-8000-0000000000aa",
        status: "applied",
      });
    });
    observed.stop();

    expect(screen.getByTestId("triage-workspace")).toBe(region);
    expect(observed.samples.every((sample) => !sample.boundary)).toBe(true);
    expect(observed.samples.every((sample) => sample.active !== document.body)).toBe(true);
  });

  it("keeps the card in the recovery projection when a Retry started from it fails before dispatch", async () => {
    useTriageStore.setState({ selectedScratchId: "scratch-2" });
    window.sessionStorage.setItem(
      RECOVERY_KEY,
      JSON.stringify({
        operationId: "00000000-0000-4000-8000-0000000000cc",
        kind: "archive_scratch",
        scratchBitId: ARCHIVE_SCRATCH_ID,
        expectedVersion: 7,
        startedAt: 100,
      }),
    );
    reconcileArchiveMock.mockResolvedValue({
      operationId: "00000000-0000-4000-8000-0000000000cc",
      status: "not_applied",
    });
    render(<TriageWorkspace node={createNode()} />);
    await act(async () => {});
    storageFailsOnSet = true;
    await act(async () => {
      void lastCoordinator().retry();
    });

    expect(screen.queryByTestId("breakdown-panel")).not.toBeInTheDocument();
    expect(screen.getByTestId("archive-recovery-card")).toHaveAttribute(
      "data-phase",
      "storage_failed",
    );
  });

  it("does not dismiss a restored result held in the recovery projection on an unrelated selection change", async () => {
    useTriageStore.setState({ selectedScratchId: "scratch-2" });
    window.sessionStorage.setItem(
      RECOVERY_KEY,
      JSON.stringify({
        operationId: "00000000-0000-4000-8000-0000000000bb",
        kind: "archive_scratch",
        scratchBitId: ARCHIVE_SCRATCH_ID,
        expectedVersion: 7,
        startedAt: 100,
      }),
    );
    reconcileArchiveMock.mockResolvedValue({
      operationId: "00000000-0000-4000-8000-0000000000bb",
      status: "conflict",
    });
    render(<TriageWorkspace node={createNode()} />);
    await act(async () => {});
    expect(screen.getByTestId("archive-recovery-card")).toHaveAttribute(
      "data-is-recovery-projection",
      "true",
    );

    act(() => useTriageStore.getState().selectScratch("scratch-3"));
    await act(async () => {});
    expect(screen.getByTestId("archive-recovery-card")).toHaveAttribute(
      "data-phase",
      "terminal",
    );
  });
});

describe("TriageWorkspace Scratch Trash (Task 210)", () => {
  const target = { scratchId: "scratch-2", title: "Second Scratch" };

  it("mounts the coordinator at workspace lifetime with the shared lock and draft probe", () => {
    trashOwnerState.owner = { hasDiscardableWork: () => true, discard: vi.fn() };
    render(<TriageWorkspace node={createNode()} />);
    const options = useTrashScratchMock.mock.calls.at(-1)?.[0];
    expect(options).toMatchObject({
      operationLock: expect.objectContaining({ acquire: expect.any(Function) }),
      selectedScratchId: "scratch-1",
      isPlacementOpen: expect.any(Function),
      onApplied: expect.any(Function),
    });
    expect(options.isPlacementOpen()).toBe(false);
    // Only the selected Scratch can have drafts, and the Breakdown owns them.
    expect(options.hasDiscardableWork("scratch-1")).toBe(true);
    expect(options.hasDiscardableWork("scratch-2")).toBe(false);
  });

  it("opens the coordinator from a Pool entry and exposes its disabled reason", () => {
    const coordinator = trashCoordinator({
      entryDisabledReason: vi.fn(() => "placement-open"),
    });
    useTrashScratchMock.mockReturnValue(coordinator);
    render(<TriageWorkspace node={createNode()} />);
    expect(screen.getByTestId("trash-reason")).toHaveTextContent("placement-open");
    fireEvent.click(screen.getByRole("button", { name: "Trash second" }));
    expect(coordinator.open).toHaveBeenCalledWith("scratch-2");
  });

  it("renders the dialog from the coordinator state and routes its actions", () => {
    const coordinator = trashCoordinator({
      state: { phase: "confirming", target },
    });
    useTrashScratchMock.mockReturnValue(coordinator);
    render(<TriageWorkspace node={createNode()} />);
    const dialog = screen.getByRole("alertdialog", { name: "Move Scratch to Trash?" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Move to Trash" }));
    expect(coordinator.confirm).toHaveBeenCalledTimes(1);
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(coordinator.cancel).toHaveBeenCalled();
  });

  it("on success for an unselected Scratch announces, keeps selection and discards nothing", async () => {
    const discard = vi.fn();
    trashOwnerState.owner = { hasDiscardableWork: () => true, discard };
    render(<TriageWorkspace node={createNode()} />);
    const options = useTrashScratchMock.mock.calls.at(-1)?.[0];
    await act(async () => {
      await options.onApplied({
        scratchId: "scratch-2",
        title: "Second Scratch",
        wasSelected: false,
        result: { status: "applied" },
      });
    });
    expect(screen.getByTestId("trash-live-region")).toHaveTextContent(
      'Moved "Second Scratch" to Trash.',
    );
    expect(discard).not.toHaveBeenCalled();
    expect(useTriageStore.getState().selectedScratchId).toBe("scratch-1");
  });

  it("on success for the selected Scratch discards its drafts, then hands off to the next visible Scratch", async () => {
    const order: string[] = [];
    const discard = vi.fn(() => order.push(`discard:${useTriageStore.getState().selectedScratchId}`));
    trashOwnerState.owner = { hasDiscardableWork: () => true, discard };
    render(<TriageWorkspace node={createNode()} />);
    const options = useTrashScratchMock.mock.calls.at(-1)?.[0];
    await act(async () => {
      await options.onApplied({
        scratchId: "scratch-1",
        title: "First Scratch",
        wasSelected: true,
        result: { status: "applied", scratch: null },
      });
    });
    // Drafts go while the Scratch is still selected; only then the selection moves.
    expect(order).toEqual(["discard:scratch-1"]);
    expect(useTriageStore.getState().selectedScratchId).not.toBe("scratch-1");
    expect(screen.getByTestId("trash-live-region")).toHaveTextContent(
      'Moved "First Scratch" to Trash.',
    );
  });
});

describe("Scratch Trash success focus targets (Task 210)", () => {
  function mountTargets() {
    document.body.innerHTML = `
      <h2 id="triage-scratch-pool-heading" tabindex="-1"></h2>
      <input data-archive-handoff-focus="search-empty" aria-label="search" />
      <button aria-label="Add item"></button>
      <div data-testid="selected-scratch-context" tabindex="-1"></div>
      <button data-external-removal-destination="next" aria-label="next row"></button>
      <button data-external-removal-destination="previous" aria-label="previous row"></button>`;
  }
  const activeLabel = () =>
    document.activeElement?.getAttribute("aria-label") ??
    document.activeElement?.getAttribute("data-testid");

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("Pool entry: a destination Scratch focuses its Pool row (next, or previous when it was last)", () => {
    mountTargets();
    trashEntryFocus("pool", { id: "next", kind: "scratch" })();
    expect(activeLabel()).toBe("next row");
    trashEntryFocus("pool", { id: "previous", kind: "scratch" })();
    expect(activeLabel()).toBe("previous row");
  });

  it("Pool entry: filtered-empty focuses the search input and true empty the primary action", () => {
    mountTargets();
    trashEntryFocus("pool", { id: null, kind: "search-empty" })();
    expect(activeLabel()).toBe("search");
    trashEntryFocus("pool", { id: null, kind: "inbox-empty" })();
    expect(activeLabel()).toBe("Add item");
  });

  it("Context entry follows the Archive rule: the selected Scratch Context", () => {
    mountTargets();
    trashEntryFocus("context", { id: "next", kind: "scratch" })();
    expect(activeLabel()).toBe("selected-scratch-context");
  });

  it("falls back to the Pool heading when the recorded target is gone", () => {
    mountTargets();
    document.querySelector('[data-external-removal-destination="next"]')?.remove();
    trashEntryFocus("pool", { id: "next", kind: "scratch" })();
    expect(document.activeElement?.id).toBe("triage-scratch-pool-heading");
  });

  it("unselected Scratch: focuses the neighbour row, else the search input when no row is visible", () => {
    mountTargets();
    trashNeighborFocus("previous")();
    expect(activeLabel()).toBe("previous row");
    trashNeighborFocus(undefined)();
    expect(activeLabel()).toBe("search");
  });
});

describe("Scratch Trash neighbour and opener focus helpers (Task 210 review)", () => {
  it("picks the next, then the previous, row that is still visible", () => {
    const order = ["a", "b", "c", "d"];
    expect(pickTrashNeighbor(order, "b", ["a", "c", "d"])).toBe("c");
    expect(pickTrashNeighbor(order, "d", ["a", "b", "c"])).toBe("c");
    // The next row left meanwhile: skip it rather than point at a gone row.
    expect(pickTrashNeighbor(order, "b", ["a", "d"])).toBe("d");
    expect(pickTrashNeighbor(order, "b", ["a"])).toBe("a");
    expect(pickTrashNeighbor(order, "b", [])).toBeUndefined();
    expect(pickTrashNeighbor(order, "x", order)).toBeUndefined();
  });

  describe("focusTrashOpener", () => {
    afterEach(() => {
      document.body.innerHTML = "";
    });

    it("refocuses a usable opener", () => {
      document.body.innerHTML = '<button id="entry">Trash</button>';
      focusTrashOpener(document.getElementById("entry"));
      expect(document.activeElement?.id).toBe("entry");
    });

    it("falls back to the row's selection button when the opener is disabled", () => {
      document.body.innerHTML = `
        <div data-triage-role="pool-row-container">
          <button aria-pressed="false" id="row">Row</button>
          <button disabled id="entry">Trash</button>
        </div>`;
      focusTrashOpener(document.getElementById("entry"));
      expect(document.activeElement?.id).toBe("row");
    });

    it("falls back to the Context for a disabled [X]", () => {
      document.body.innerHTML = `
        <div data-testid="selected-scratch-context" tabindex="-1" id="ctx"></div>
        <button disabled id="close">[X]</button>`;
      focusTrashOpener(document.getElementById("close"));
      expect(document.activeElement?.id).toBe("ctx");
    });
  });
});
