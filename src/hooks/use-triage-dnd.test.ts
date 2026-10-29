import { createElement } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HierarchyExplorer } from "@/components/triage/hierarchy-explorer";
import { useTriageStore } from "@/stores/triage-store";
import type { TriagePlacementRelease } from "./use-triage-placement";
import { invalidateTriageDragSource, useTriageDnd } from "./use-dnd";
import type { TriageOperationKind } from "./use-triage-operation-lock";

const stageCandidateMock = vi.hoisted(() => vi.fn());
const reconcileStageCandidateMock = vi.hoisted(() => vi.fn());
const unstageCandidateMock = vi.hoisted(() => vi.fn());
const reconcileUnstageCandidateMock = vi.hoisted(() => vi.fn());
const focusUnstagedSourceMock = vi.hoisted(() => vi.fn());
const beginPlacementMock = vi.hoisted(() => vi.fn());
const placementOpenState = vi.hoisted(() => ({ open: false }));
const operationLockState = vi.hoisted(() => ({
  activeOperation: null as null | {
    kind: TriageOperationKind;
    operationId: string;
  },
  acquire: vi.fn(),
  isLocked: vi.fn(),
  release: vi.fn(),
}));
const getDataStoreMock = vi.hoisted(() => vi.fn());
const getGridOccupancyMock = vi.hoisted(() => vi.fn());
const getNodeMock = vi.hoisted(() => vi.fn());
const createNodeMock = vi.hoisted(() => vi.fn());
const createBitMock = vi.hoisted(() => vi.fn());
const findNearestEmptyCellMock = vi.hoisted(() => vi.fn());
const useSensorMock = vi.hoisted(() =>
  vi.fn((sensor: unknown, options: unknown) => ({ sensor, options })),
);
const emptyGridData = vi.hoisted(() => ({
  bits: [],
  isLoading: false,
  nodes: [],
}));
const registerExplorerLocalPlacementAction =
  useTriageStore.getState().registerExplorerLocalPlacement;

afterEach(cleanup);

vi.mock("@dnd-kit/core", () => ({
  useSensors: (...sensors: unknown[]) => sensors,
  useSensor: useSensorMock,
  useDroppable: vi.fn(() => ({ setNodeRef: vi.fn() })),
  MouseSensor: class {},
  TouchSensor: class {},
}));

vi.mock("@/hooks/use-grid-data", () => ({
  useGridData: () => emptyGridData,
}));

vi.mock("@/hooks/use-explorer-remote-status", () => ({
  useExplorerRemoteStatus: () => ({ isReady: true, validPathIds: [] }),
}));

vi.mock("@/hooks/use-triage-departure", () => ({
  useTriageDepartureContext: () => ({ requestDeparture: vi.fn() }),
}));

vi.mock("@/lib/grid-dnd", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/grid-dnd")>()),
  isTriageDropData: (value: unknown) => {
    if (typeof value !== "object" || value === null || !("kind" in value))
      return false;
    const k = (value as { kind: unknown }).kind;
    return (
      k === "triage-node-zone-drop" ||
      k === "triage-bit-zone-drop" ||
      k === "triage-remove-drop" ||
      k === "triage-hierarchy-drop"
    );
  },
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
  findNearestEmptyCell: findNearestEmptyCellMock,
}));

vi.mock("@/lib/utils/breadcrumb-zone", () => ({
  getStaticBlockedCells: () => new Set<string>(),
  isCellBlocked: vi.fn(() => false),
}));

type DragEndEvent = Parameters<
  ReturnType<typeof useTriageDnd>["handleDragEnd"]
>[0];
type DragOverEvent = Parameters<
  ReturnType<typeof useTriageDnd>["handleDragOver"]
>[0];
type TriageDndController = ReturnType<typeof useTriageDnd>;

function makeDragEndEvent(
  dragData: unknown,
  dropData: unknown | null,
): DragEndEvent {
  const normalizedDragData =
    typeof dragData === "object" &&
    dragData !== null &&
    "kind" in dragData &&
    (dragData.kind === "triage-breakdown" ||
      dragData.kind === "triage-staged-node" ||
      dragData.kind === "triage-staged-bit")
      ? {
          scratchId: "scratch-1",
          sourceBreakdownId:
            "sourceBreakdownId" in dragData
              ? dragData.sourceBreakdownId
              : "id" in dragData
                ? dragData.id
                : "row-1",
          sourceVersion: 1,
          sourceLifecycle: "active",
          ...(dragData.kind === "triage-breakdown"
            ? {}
            : {
                candidateVersion: 1,
                candidateLifecycle: "staged",
                resultType:
                  dragData.kind === "triage-staged-node" ? "node" : "bit",
              }),
          ...dragData,
        }
      : dragData;
  return {
    active: { id: "test-id", data: { current: normalizedDragData } },
    over:
      dropData !== null
        ? { id: "test-drop", data: { current: dropData } }
        : null,
  } as DragEndEvent;
}

function completeDrag(
  controller: TriageDndController,
  event: DragEndEvent,
): ReturnType<TriageDndController["handleDragEnd"]> {
  controller.handleDragStart(event);
  return controller.handleDragEnd(event);
}

function makeDragOverEvent(
  dragData: unknown,
  dropId: string,
  dropData: unknown,
): DragOverEvent {
  return {
    ...makeDragEndEvent(dragData, dropData),
    over: {
      id: dropId,
      data: { current: dropData },
    },
  } as DragOverEvent;
}

function makeBreakdownDragData(overrides: Record<string, unknown> = {}) {
  return {
    kind: "triage-breakdown",
    id: "row-1",
    label: "My note",
    scratchId: "scratch-1",
    sourceBreakdownId: "row-1",
    sourceVersion: 1,
    sourceLifecycle: "active",
    ...overrides,
  };
}

function makeStagedDragData(overrides: Record<string, unknown> = {}) {
  return {
    kind: "triage-staged-node",
    id: "candidate-1",
    label: "Project",
    scratchId: "scratch-1",
    sourceBreakdownId: "breakdown-1",
    sourceVersion: 3,
    sourceLifecycle: "active",
    candidateVersion: 2,
    candidateLifecycle: "staged",
    resultType: "node",
    ...overrides,
  };
}

function installRenderedHierarchyTarget(dropData: Record<string, unknown>) {
  const target = document.createElement("div");
  target.dataset.triageHierarchyDrop = JSON.stringify(dropData);
  document.body.append(target);
  Object.defineProperty(document, "elementsFromPoint", {
    configurable: true,
    value: vi.fn(() => [target]),
  });
  return target;
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  document
    .querySelectorAll("[data-triage-hierarchy-drop]")
    .forEach((element) => element.remove());
  Object.defineProperty(document, "elementsFromPoint", {
    configurable: true,
    value: vi.fn(() => []),
  });
  operationLockState.activeOperation = null;
  placementOpenState.open = false;
  beginPlacementMock.mockReset();
  beginPlacementMock.mockImplementation(() => {
    if (placementOpenState.open) return false;
    placementOpenState.open = true;
    return true;
  });
  useTriageStore.setState({
    explorerLocalPlacementIdentities: [],
    explorerRemoteArrivalIds: {},
    registerExplorerLocalPlacement: registerExplorerLocalPlacementAction,
  });
  operationLockState.isLocked.mockImplementation(
    () => operationLockState.activeOperation !== null,
  );
  operationLockState.acquire.mockImplementation((kind, operationId) => {
    if (operationLockState.activeOperation !== null) return false;
    operationLockState.activeOperation = { kind, operationId };
    return true;
  });
  operationLockState.release.mockImplementation((operationId) => {
    if (operationLockState.activeOperation?.operationId !== operationId) {
      return false;
    }
    operationLockState.activeOperation = null;
    return true;
  });
  stageCandidateMock.mockImplementation(async (command) => ({
    operationId: command.operationId,
    status: "applied",
    candidate: null,
    source: null,
    scratch: null,
  }));
  reconcileStageCandidateMock.mockImplementation(async (command) => ({
    operationId: command.operationId,
    status: "applied",
    candidate: null,
    source: null,
    scratch: null,
  }));
  unstageCandidateMock.mockImplementation(async (command) => ({
    operationId: command.operationId,
    status: "applied",
    candidate: null,
    source: null,
  }));
  reconcileUnstageCandidateMock.mockImplementation(async (command) => ({
    operationId: command.operationId,
    status: "applied",
    candidate: null,
    source: null,
  }));
  getGridOccupancyMock.mockResolvedValue(new Set<string>());
  getNodeMock.mockImplementation(async (id: string) => ({
    id,
    parentId: null,
    deletedAt: null,
  }));
  createNodeMock.mockResolvedValue({ id: "created-node" });
  createBitMock.mockResolvedValue({ id: "created-bit" });
  getDataStoreMock.mockResolvedValue({
    getGridOccupancy: getGridOccupancyMock,
    getNode: getNodeMock,
    createNode: createNodeMock,
    createBit: createBitMock,
  });
  findNearestEmptyCellMock.mockReturnValue({ x: 0, y: 0 });
});

function durableCandidateOptions() {
  return {
    beginPlacement: beginPlacementMock,
    isPlacementOpen: () => placementOpenState.open,
    operationLock: operationLockState,
    stageCandidate: stageCandidateMock,
    reconcileStageCandidate: reconcileStageCandidateMock,
    unstageCandidate: unstageCandidateMock,
    reconcileUnstageCandidate: reconcileUnstageCandidateMock,
    focusUnstagedSource: focusUnstagedSourceMock,
  };
}

function latestPlacementRelease(): TriagePlacementRelease | null {
  return beginPlacementMock.mock.calls.at(-1)?.[0] ?? null;
}

function clearPlacementOwner(): void {
  placementOpenState.open = false;
  beginPlacementMock.mockClear();
}

function renderDndExplorerHarness(): {
  getController: () => TriageDndController;
  getFrameRefreshCount: () => number;
  rerenderExplorer: () => void;
} {
  let frameRefreshCount = 0;
  const hook = renderHook(() =>
    useTriageDnd(
      "scratch-1",
      durableCandidateOptions(),
    ),
  );
  const onPointerGeometryChange = (point: { x: number; y: number }) => {
    frameRefreshCount += 1;
    hook.result.current.refreshRenderedTarget(point);
  };
  const explorer = () => {
    const controller = hook.result.current;
    return createElement(HierarchyExplorer, {
      activeDragItem: controller.activeDragItem,
      onPendingPlacementInvalidated: vi.fn(),
      onPointerGeometryChange,
      overTargetId: controller.overTargetId,
      pendingPlacementDropId: latestPlacementRelease()?.target.dropId ?? null,
      localPlacementResult: null,
      targetFeedback: controller.targetFeedback,
    });
  };

  const view = render(explorer());
  return {
    getController: () => hook.result.current,
    getFrameRefreshCount: () => frameRefreshCount,
    rerenderExplorer: () => view.rerender(explorer()),
  };
}

describe("useTriageDnd — Task 145 durable Stage/Unstage adapters", () => {
  it("acquires Stage synchronously and dispatches the exact activation snapshot before terminal release", async () => {
    const { result } = renderHook(() =>
      useTriageDnd("scratch-1", durableCandidateOptions()),
    );
    const drag = makeBreakdownDragData({ sourceVersion: 7 });

    await act(async () => {
      await completeDrag(
        result.current,
        makeDragEndEvent(drag, { kind: "triage-bit-zone-drop" }),
      );
    });

    expect(operationLockState.acquire).toHaveBeenCalledWith(
      "stage",
      expect.any(String),
    );
    expect(stageCandidateMock).toHaveBeenCalledWith({
      operationId: expect.any(String),
      candidateId: expect.any(String),
      scratchBitId: "scratch-1",
      sourceBreakdownId: "row-1",
      sourceExpectedVersion: 7,
      resultType: "bit",
    });
    const command = stageCandidateMock.mock.calls[0]?.[0];
    expect(operationLockState.acquire.mock.invocationCallOrder[0]).toBeLessThan(
      stageCandidateMock.mock.invocationCallOrder[0]!,
    );
    expect(operationLockState.release).toHaveBeenCalledWith(
      command.operationId,
      "applied",
    );
  });

  it("reconciles an unknown Stage with the same identity before terminal release", async () => {
    stageCandidateMock.mockImplementationOnce(async (command) => ({
      operationId: command.operationId,
      outcome: "unknown",
    }));
    reconcileStageCandidateMock.mockImplementationOnce(async (command) => ({
      operationId: command.operationId,
      status: "not_applied",
      candidate: null,
      source: null,
      scratch: null,
    }));
    const { result } = renderHook(() =>
      useTriageDnd("scratch-1", durableCandidateOptions()),
    );

    await act(async () => {
      await completeDrag(
        result.current,
        makeDragEndEvent(makeBreakdownDragData(), {
          kind: "triage-node-zone-drop",
        }),
      );
    });

    const command = stageCandidateMock.mock.calls[0]?.[0];
    expect(reconcileStageCandidateMock).toHaveBeenCalledWith(command);
    expect(operationLockState.release).toHaveBeenCalledWith(
      command.operationId,
      "not_applied",
    );
  });

  it("retains an unknown Unstage lock, blocks a competing drag, and queues no replay", async () => {
    unstageCandidateMock.mockImplementationOnce(async (command) => ({
      operationId: command.operationId,
      outcome: "unknown",
    }));
    reconcileUnstageCandidateMock.mockImplementationOnce(async (command) => ({
      operationId: command.operationId,
      outcome: "unknown",
    }));
    const { result } = renderHook(() =>
      useTriageDnd("scratch-1", durableCandidateOptions()),
    );

    await act(async () => {
      await completeDrag(
        result.current,
        makeDragEndEvent(makeStagedDragData(), {
          kind: "triage-remove-drop",
        }),
      );
    });

    expect(operationLockState.activeOperation?.kind).toBe("unstage");
    expect(operationLockState.release).not.toHaveBeenCalled();

    await act(async () => {
      await completeDrag(
        result.current,
        makeDragEndEvent(makeBreakdownDragData(), {
          kind: "triage-node-zone-drop",
        }),
      );
    });

    expect(stageCandidateMock).not.toHaveBeenCalled();
    expect(unstageCandidateMock).toHaveBeenCalledOnce();
    expect(reconcileUnstageCandidateMock).toHaveBeenCalledOnce();
  });

  it("dispatches exact Unstage CAS identity and restores source focus only after confirmed success", async () => {
    const { result } = renderHook(() =>
      useTriageDnd("scratch-1", durableCandidateOptions()),
    );

    await act(async () => {
      await completeDrag(
        result.current,
        makeDragEndEvent(makeStagedDragData(), {
          kind: "triage-remove-drop",
        }),
      );
    });

    expect(unstageCandidateMock).toHaveBeenCalledWith({
      operationId: expect.any(String),
      candidateId: "candidate-1",
      candidateExpectedVersion: 2,
      sourceBreakdownId: "breakdown-1",
      sourceExpectedVersion: 3,
    });
    expect(focusUnstagedSourceMock).toHaveBeenCalledWith("breakdown-1");
  });

  it.each([
    ["stage", "applied"],
    ["stage", "already_applied"],
    ["stage", "not_applied"],
    ["stage", "rejected"],
    ["stage", "conflict"],
    ["unstage", "applied"],
    ["unstage", "already_applied"],
    ["unstage", "not_applied"],
    ["unstage", "rejected"],
    ["unstage", "conflict"],
  ] as const)(
    "releases the exact %s owner on terminal %s and focuses only confirmed Unstage",
    async (kind, status) => {
      if (kind === "stage") {
        stageCandidateMock.mockImplementationOnce(async (command) => ({
          operationId: command.operationId,
          status,
          candidate: null,
          source: null,
          scratch: null,
        }));
      } else {
        unstageCandidateMock.mockImplementationOnce(async (command) => ({
          operationId: command.operationId,
          status,
          candidate: null,
          source: null,
        }));
      }
      const { result } = renderHook(() =>
        useTriageDnd("scratch-1", durableCandidateOptions()),
      );

      await act(async () => {
        await completeDrag(
          result.current,
          makeDragEndEvent(
            kind === "stage" ? makeBreakdownDragData() : makeStagedDragData(),
            {
              kind:
                kind === "stage"
                  ? "triage-node-zone-drop"
                  : "triage-remove-drop",
            },
          ),
        );
      });

      const command =
        kind === "stage"
          ? stageCandidateMock.mock.calls[0]?.[0]
          : unstageCandidateMock.mock.calls[0]?.[0];
      expect(operationLockState.release).toHaveBeenCalledWith(
        command.operationId,
        status,
      );
      expect(focusUnstagedSourceMock).toHaveBeenCalledTimes(
        kind === "unstage" &&
          (status === "applied" || status === "already_applied")
          ? 1
          : 0,
      );
    },
  );
});

describe("useTriageDnd — pointer activation lifecycle", () => {
  it("uses only the exact Mouse and Touch activation constraints", () => {
    renderHook(() =>
      useTriageDnd("scratch-1", durableCandidateOptions()),
    );

    expect(useSensorMock).toHaveBeenCalledTimes(2);
    expect(useSensorMock.mock.calls[0]?.[1]).toEqual({
      activationConstraint: { distance: 8 },
    });
    expect(useSensorMock.mock.calls[1]?.[1]).toEqual({
      activationConstraint: { delay: 250, tolerance: 5 },
    });
  });

  it("keeps the activation snapshot stable when draggable data changes", () => {
    const { result } = renderHook(() =>
      useTriageDnd("scratch-1", durableCandidateOptions()),
    );
    const dragData = makeBreakdownDragData();
    const event = makeDragEndEvent(dragData, null);

    act(() => {
      result.current.handleDragStart(event);
      dragData.label = "Remote replacement";
      dragData.sourceVersion = 2;
    });

    expect(result.current.activeDragItem).toEqual(
      expect.objectContaining({
        integrity: "current",
        label: "My note",
        sourceVersion: 1,
      }),
    );
  });

  it("cancels a Breakdown drop when remote authority changes after activation", async () => {
    const { result } = renderHook(() =>
      useTriageDnd("scratch-1", durableCandidateOptions()),
    );

    act(() => {
      result.current.handleDragStart(
        makeDragEndEvent(makeBreakdownDragData(), null),
      );
    });
    await act(async () => {
      await result.current.handleDragEnd(
        makeDragEndEvent(
          makeBreakdownDragData({ label: "Remote edit", sourceVersion: 2 }),
          { kind: "triage-node-zone-drop" },
        ),
      );
    });

    expect(getDataStoreMock).not.toHaveBeenCalled();
    expect(result.current.activeDragItem).toBeNull();
  });

  it("cancels a staged drop when candidate authority changes after activation", async () => {
    const { result } = renderHook(() =>
      useTriageDnd("scratch-1", durableCandidateOptions()),
    );

    act(() => {
      result.current.handleDragStart(
        makeDragEndEvent(makeStagedDragData(), null),
      );
    });
    await act(async () => {
      await result.current.handleDragEnd(
        makeDragEndEvent(
          makeStagedDragData({ candidateVersion: 3 }),
          { kind: "triage-remove-drop" },
        ),
      );
    });

    expect(getDataStoreMock).not.toHaveBeenCalled();
  });

  it("cancels when the active source unmounts even if drag-end data stays stale", async () => {
    const { result } = renderHook(() =>
      useTriageDnd("scratch-1", durableCandidateOptions()),
    );
    const dragData = makeStagedDragData();
    installRenderedHierarchyTarget({
      kind: "triage-hierarchy-drop",
      dropId: "triage-hierarchy:parent-1",
      parentNodeId: "parent-1",
      targetNodeLevel: 0,
      targetTitle: "Parent",
      targetParentPath: ["Home"],
    });

    act(() => {
      result.current.handleDragStart(makeDragEndEvent(dragData, null));
      fireEvent.mouseMove(document, { clientX: 30, clientY: 40 });
    });
    await waitFor(() =>
      expect(result.current.targetFeedback?.state).toBe("valid"),
    );
    act(() => invalidateTriageDragSource(dragData));

    expect(result.current.activeDragItem).toEqual(
      expect.objectContaining({
        id: "candidate-1",
        candidateVersion: 2,
        integrity: "invalidated",
      }),
    );
    expect(result.current.targetFeedback).toBeNull();

    await act(async () => {
      await result.current.handleDragEnd(
        makeDragEndEvent(dragData, { kind: "triage-remove-drop" }),
      );
    });

    expect(result.current.activeDragItem).toBeNull();
    expect(createNodeMock).not.toHaveBeenCalled();
    expect(createBitMock).not.toHaveBeenCalled();
  });

  it("does not retarget a drop from invalid activation data to valid release data", async () => {
    const { result } = renderHook(() =>
      useTriageDnd("scratch-1", durableCandidateOptions()),
    );

    act(() => {
      result.current.handleDragStart(
        makeDragEndEvent(
          makeBreakdownDragData({ scratchId: "scratch-2" }),
          null,
        ),
      );
    });
    await act(async () => {
      await result.current.handleDragEnd(
        makeDragEndEvent(makeBreakdownDragData(), {
          kind: "triage-node-zone-drop",
        }),
      );
    });

    expect(getDataStoreMock).not.toHaveBeenCalled();
  });

  it("cancels the active lifecycle on Escape and suppresses its later drop", async () => {
    const { result } = renderHook(() =>
      useTriageDnd("scratch-1", durableCandidateOptions()),
    );
    const dragData = makeBreakdownDragData();

    act(() => {
      result.current.handleDragStart(makeDragEndEvent(dragData, null));
      fireEvent.keyDown(document, { key: "Escape" });
    });
    await act(async () => {
      await result.current.handleDragEnd(
        makeDragEndEvent(dragData, { kind: "triage-node-zone-drop" }),
      );
    });

    expect(result.current.activeDragItem).toBeNull();
    expect(getDataStoreMock).not.toHaveBeenCalled();
  });
});

describe("useTriageDnd — drop matrix", () => {
  it("uses pre-activation mouse coordinates when release has no later move", async () => {
    const releaseTarget = {
      kind: "triage-hierarchy-drop",
      dropId: "triage-hierarchy:release-target",
      parentNodeId: "release-target",
      targetNodeLevel: 1,
      targetTitle: "Release Target",
      targetParentPath: ["Home", "Current"],
    };
    installRenderedHierarchyTarget(releaseTarget);
    const { result } = renderHook(() =>
      useTriageDnd("scratch-1", durableCandidateOptions()),
    );
    const dragData = makeStagedDragData();

    act(() => {
      fireEvent.mouseMove(document, { clientX: 240, clientY: 180 });
      result.current.handleDragStart(makeDragEndEvent(dragData, null));
    });
    await act(async () => {
      await result.current.handleDragEnd(
        makeDragEndEvent(dragData, {
          ...releaseTarget,
          dropId: "triage-hierarchy:stale-target",
          parentNodeId: "stale-target",
          targetTitle: "Stale Target",
        }),
      );
    });

    expect(latestPlacementRelease()).toEqual(
      expect.objectContaining({
        target: expect.objectContaining({
          dropId: releaseTarget.dropId,
          parentId: releaseTarget.parentNodeId,
        }),
      }),
    );
  });

  it("uses stationary touch-start coordinates after delayed activation", async () => {
    const releaseTarget = {
      kind: "triage-hierarchy-drop",
      dropId: "triage-hierarchy:touch-release-target",
      parentNodeId: "touch-release-target",
      targetNodeLevel: 0,
      targetTitle: "Touch Release Target",
      targetParentPath: ["Home"],
    };
    installRenderedHierarchyTarget(releaseTarget);
    const { result } = renderHook(() =>
      useTriageDnd("scratch-1", durableCandidateOptions()),
    );
    const dragData = makeStagedDragData();

    act(() => {
      fireEvent.touchStart(document, {
        touches: [{ clientX: 80, clientY: 120 }],
      });
      result.current.handleDragStart(makeDragEndEvent(dragData, null));
    });
    await act(async () => {
      await result.current.handleDragEnd(
        makeDragEndEvent(dragData, {
          ...releaseTarget,
          dropId: "triage-hierarchy:stale-touch-target",
          parentNodeId: "stale-touch-target",
          targetTitle: "Stale Touch Target",
        }),
      );
    });

    expect(latestPlacementRelease()).toEqual(
      expect.objectContaining({
        target: expect.objectContaining({
          dropId: releaseTarget.dropId,
          parentId: releaseTarget.parentNodeId,
        }),
      }),
    );
  });

  it("uses the final rendered pointer-under hierarchy target instead of stale drag-over data", async () => {
    const releaseTarget = {
      kind: "triage-hierarchy-drop",
      dropId: "triage-hierarchy:release-target",
      parentNodeId: "release-target",
      targetNodeLevel: 1,
      targetTitle: "Release Target",
      targetParentPath: ["Home", "Current"],
    };
    installRenderedHierarchyTarget(releaseTarget);
    const { result } = renderHook(() =>
      useTriageDnd("scratch-1", durableCandidateOptions()),
    );
    const dragData = makeStagedDragData();

    act(() => {
      result.current.handleDragStart(makeDragEndEvent(dragData, null));
      fireEvent.mouseMove(document, { clientX: 240, clientY: 180 });
    });
    await act(async () => {
      await result.current.handleDragEnd(
        makeDragEndEvent(dragData, {
          ...releaseTarget,
          dropId: "triage-hierarchy:stale-target",
          parentNodeId: "stale-target",
          targetTitle: "Stale Target",
        }),
      );
    });

    expect(latestPlacementRelease()).toEqual(
      expect.objectContaining({
        target: expect.objectContaining({
          dropId: "triage-hierarchy:release-target",
          parentId: "release-target",
          title: "Release Target",
        }),
      }),
    );
  });

  it("continuously reports full rendered targets while preserving them for release", async () => {
    const target = {
      kind: "triage-hierarchy-drop",
      dropId: "triage-hierarchy:full-target",
      parentNodeId: "full-target",
      targetNodeLevel: 0,
      targetTitle: "Full Target",
      targetParentPath: ["Home"],
    };
    installRenderedHierarchyTarget(target);
    findNearestEmptyCellMock.mockReturnValue(null);
    const { result } = renderHook(() =>
      useTriageDnd("scratch-1", durableCandidateOptions()),
    );
    const dragData = makeStagedDragData();

    act(() => {
      result.current.handleDragStart(makeDragEndEvent(dragData, null));
      fireEvent.touchMove(document, {
        touches: [{ clientX: 80, clientY: 120 }],
      });
    });

    await waitFor(() => {
      expect(result.current.targetFeedback).toEqual({
        dropId: target.dropId,
        state: "full",
      });
    });

    await act(async () => {
      await result.current.handleDragEnd(makeDragEndEvent(dragData, target));
    });
    expect(latestPlacementRelease()).toEqual(
      expect.objectContaining({
        target: expect.objectContaining({ dropId: target.dropId, isFull: true }),
      }),
    );
  });

  it("reports an invalid pointer-under target without querying occupancy and clears it on Escape", async () => {
    const target = {
      kind: "triage-hierarchy-drop",
      dropId: "triage-hierarchy:home",
      parentNodeId: null,
      targetNodeLevel: null,
      targetTitle: "Home",
      targetParentPath: [],
    };
    installRenderedHierarchyTarget(target);
    const { result } = renderHook(() =>
      useTriageDnd("scratch-1", durableCandidateOptions()),
    );

    act(() => {
      result.current.handleDragStart(
        makeDragEndEvent(
          makeStagedDragData({
            kind: "triage-staged-bit",
            resultType: "bit",
          }),
          null,
        ),
      );
      fireEvent.mouseMove(document, { clientX: 20, clientY: 30 });
    });

    expect(result.current.targetFeedback).toEqual({
      dropId: target.dropId,
      state: "invalid",
    });
    expect(getGridOccupancyMock).not.toHaveBeenCalled();

    act(() => fireEvent.keyDown(document, { key: "Escape" }));
    expect(result.current.targetFeedback).toBeNull();
  });

  it("switches feedback to the latest rendered column and cancels it on pointer exit", async () => {
    const first = installRenderedHierarchyTarget({
      kind: "triage-hierarchy-drop",
      dropId: "triage-hierarchy:first",
      parentNodeId: "first",
      targetNodeLevel: 0,
      targetTitle: "First",
      targetParentPath: ["Home"],
    });
    const second = document.createElement("div");
    second.dataset.triageHierarchyDrop = JSON.stringify({
      kind: "triage-hierarchy-drop",
      dropId: "triage-hierarchy:second",
      parentNodeId: "second",
      targetNodeLevel: 1,
      targetTitle: "Second",
      targetParentPath: ["Home", "First"],
    });
    document.body.append(second);
    let pointerTarget: Element | null = first;
    vi.mocked(document.elementsFromPoint).mockImplementation(() =>
      pointerTarget === null ? [] : [pointerTarget],
    );
    const { result } = renderHook(() =>
      useTriageDnd("scratch-1", durableCandidateOptions()),
    );

    act(() => {
      result.current.handleDragStart(
        makeDragEndEvent(makeStagedDragData(), null),
      );
      fireEvent.mouseMove(document, { clientX: 20, clientY: 30 });
    });
    await waitFor(() =>
      expect(result.current.targetFeedback?.dropId).toBe(
        "triage-hierarchy:first",
      ),
    );

    pointerTarget = second;
    act(() => fireEvent.mouseMove(document, { clientX: 220, clientY: 30 }));
    await waitFor(() =>
      expect(result.current.targetFeedback?.dropId).toBe(
        "triage-hierarchy:second",
      ),
    );

    pointerTarget = null;
    act(() => fireEvent.mouseMove(document, { clientX: 900, clientY: 700 }));
    expect(result.current.targetFeedback).toBeNull();
    expect(result.current.overTargetId).toBeNull();
  });

  it("refreshes pointer-under feedback at the same coordinates after rendered geometry moves", async () => {
    const first = installRenderedHierarchyTarget({
      kind: "triage-hierarchy-drop",
      dropId: "triage-hierarchy:first",
      parentNodeId: "first",
      targetNodeLevel: 0,
      targetTitle: "First",
      targetParentPath: ["Home"],
    });
    const second = document.createElement("div");
    second.dataset.triageHierarchyDrop = JSON.stringify({
      kind: "triage-hierarchy-drop",
      dropId: "triage-hierarchy:second",
      parentNodeId: "second",
      targetNodeLevel: 1,
      targetTitle: "Second",
      targetParentPath: ["Home", "First"],
    });
    document.body.append(second);
    let pointerTarget = first;
    vi.mocked(document.elementsFromPoint).mockImplementation(() => [
      pointerTarget,
    ]);
    const { result } = renderHook(() =>
      useTriageDnd("scratch-1", durableCandidateOptions()),
    );
    const point = { x: 50, y: 60 };

    act(() => {
      result.current.handleDragStart(
        makeDragEndEvent(makeStagedDragData(), null),
      );
      fireEvent.mouseMove(document, {
        clientX: point.x,
        clientY: point.y,
      });
    });
    await waitFor(() =>
      expect(result.current.targetFeedback?.dropId).toBe(
        "triage-hierarchy:first",
      ),
    );

    pointerTarget = second;
    const refreshRenderedTarget = (
      result.current as typeof result.current & {
        refreshRenderedTarget?: (point: { x: number; y: number }) => void;
      }
    ).refreshRenderedTarget;
    act(() => refreshRenderedTarget?.(point));

    await waitFor(() =>
      expect(result.current.targetFeedback?.dropId).toBe(
        "triage-hierarchy:second",
      ),
    );
  });

  it("reclassifies a same-ID rendered payload through the mounted Explorer frame loop", async () => {
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    const { getController, rerenderExplorer } = renderDndExplorerHarness();
    const body = screen.getByTestId("hierarchy-section-body-home");
    const target = document.createElement("div");
    const dropId = "triage-hierarchy:body-home";
    const firstPayload = {
      kind: "triage-hierarchy-drop",
      dropId,
      parentNodeId: "parent-a",
      targetNodeLevel: 0,
      targetTitle: "Parent A",
      targetParentPath: ["Home"],
    };
    target.dataset.triageDropId = dropId;
    target.dataset.triageHierarchyDrop = JSON.stringify(firstPayload);
    body.append(target);
    Object.defineProperties(body, {
      clientHeight: { configurable: true, value: 200 },
      scrollHeight: { configurable: true, value: 600 },
    });
    vi.spyOn(body, "getBoundingClientRect").mockReturnValue({
      top: 100,
      bottom: 300,
      left: 0,
      right: 200,
      width: 200,
      height: 200,
      x: 0,
      y: 100,
      toJSON() {},
    });
    vi.mocked(document.elementsFromPoint).mockReturnValue([target, body]);
    const point = { x: 100, y: 294 };
    const dragData = makeStagedDragData();

    act(() => {
      getController().handleDragStart(makeDragEndEvent(dragData, null));
    });
    rerenderExplorer();
    act(() => {
      fireEvent.mouseMove(document, {
        clientX: point.x,
        clientY: point.y,
      });
    });
    await waitFor(() =>
      expect(getController().targetFeedback).toEqual({
        dropId,
        state: "valid",
      }),
    );
    rerenderExplorer();
    expect(getGridOccupancyMock).toHaveBeenLastCalledWith("parent-a");

    target.dataset.triageHierarchyDrop = JSON.stringify({
      ...firstPayload,
      parentNodeId: "parent-b",
      targetNodeLevel: 1,
      targetTitle: "Parent B",
      targetParentPath: ["Home", "Branch"],
    });
    findNearestEmptyCellMock.mockReturnValue(null);
    act(() => frames.shift()?.(16));

    await waitFor(() =>
      expect(getController().targetFeedback).toEqual({
        dropId,
        state: "full",
      }),
    );
    expect(getGridOccupancyMock).toHaveBeenLastCalledWith("parent-b");
  });

  it.each([
    {
      cancel: async () => {
        fireEvent.mouseLeave(document);
      },
      name: "document exit",
    },
    {
      cancel: async () => {
        fireEvent.blur(window);
      },
      name: "window blur",
    },
    {
      cancel: async ({ dragData }: { dragData: unknown }) => {
        invalidateTriageDragSource(dragData);
      },
      name: "remote invalidation",
    },
    {
      cancel: async () => {
        fireEvent.keyDown(document, { key: "Escape" });
      },
      name: "Escape",
    },
    {
      cancel: async ({
        controller,
        dragData,
      }: {
        controller: TriageDndController;
        dragData: unknown;
      }) => {
        await controller.handleDragEnd(makeDragEndEvent(dragData, null));
      },
      name: "drag end",
    },
  ])("keeps the mounted Explorer frame inert after $name", async ({ cancel }) => {
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    const { getController, getFrameRefreshCount, rerenderExplorer } =
      renderDndExplorerHarness();
    const body = screen.getByTestId("hierarchy-section-body-home");
    const target = document.createElement("div");
    const payload = {
      kind: "triage-hierarchy-drop",
      dropId: "triage-hierarchy:body-home",
      parentNodeId: "parent-a",
      targetNodeLevel: 0,
      targetTitle: "Parent A",
      targetParentPath: ["Home"],
    };
    target.dataset.triageDropId = payload.dropId;
    target.dataset.triageHierarchyDrop = JSON.stringify(payload);
    body.append(target);
    Object.defineProperties(body, {
      clientHeight: { configurable: true, value: 200 },
      scrollHeight: { configurable: true, value: 600 },
    });
    vi.spyOn(body, "getBoundingClientRect").mockReturnValue({
      top: 100,
      bottom: 300,
      left: 0,
      right: 200,
      width: 200,
      height: 200,
      x: 0,
      y: 100,
      toJSON() {},
    });
    vi.mocked(document.elementsFromPoint).mockReturnValue([target, body]);
    const dragData = makeStagedDragData();

    act(() => {
      getController().handleDragStart(makeDragEndEvent(dragData, null));
    });
    rerenderExplorer();
    act(() => {
      fireEvent.mouseMove(document, { clientX: 100, clientY: 294 });
    });
    await waitFor(() =>
      expect(getController().targetFeedback?.state).toBe("valid"),
    );
    rerenderExplorer();
    expect(frames.length).toBeGreaterThan(0);
    const activeFrames = frames.splice(0);
    act(() => activeFrames.forEach((frame) => frame(0)));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(getFrameRefreshCount()).toBeGreaterThan(0);
    const refreshCountAfterActiveFrame = getFrameRefreshCount();
    const scrollTop = body.scrollTop;

    await act(async () => {
      await cancel({ controller: getController(), dragData });
    });
    rerenderExplorer();
    expect(getController().targetFeedback).toBeNull();
    const occupancyCallsAfterCancel = getGridOccupancyMock.mock.calls.length;

    expect(frames.length).toBeGreaterThan(0);
    const cancelledFrames = frames.splice(0);
    act(() => cancelledFrames.forEach((frame) => frame(16)));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(getController().targetFeedback).toBeNull();
    expect(getFrameRefreshCount()).toBe(refreshCountAfterActiveFrame);
    expect(getGridOccupancyMock).toHaveBeenCalledTimes(
      occupancyCallsAfterCancel,
    );
    expect(body.scrollTop).toBe(scrollTop);
  });

  it("cancels target feedback when the pointer leaves the browser document", async () => {
    installRenderedHierarchyTarget({
      kind: "triage-hierarchy-drop",
      dropId: "triage-hierarchy:parent-1",
      parentNodeId: "parent-1",
      targetNodeLevel: 0,
      targetTitle: "Parent",
      targetParentPath: ["Home"],
    });
    const { result } = renderHook(() =>
      useTriageDnd("scratch-1", durableCandidateOptions()),
    );

    act(() => {
      result.current.handleDragStart(
        makeDragEndEvent(makeStagedDragData(), null),
      );
      fireEvent.mouseMove(document, { clientX: 20, clientY: 30 });
    });
    await waitFor(() =>
      expect(result.current.targetFeedback?.state).toBe("valid"),
    );

    act(() => fireEvent.mouseLeave(document));
    expect(result.current.targetFeedback).toBeNull();
    expect(result.current.overTargetId).toBeNull();
  });

  it("cancels explicit DnD cancellation and suppresses a later drag end", async () => {
    const target = {
      kind: "triage-hierarchy-drop",
      dropId: "triage-hierarchy:parent-1",
      parentNodeId: "parent-1",
      targetNodeLevel: 0,
      targetTitle: "Parent",
      targetParentPath: ["Home"],
    };
    installRenderedHierarchyTarget(target);
    const { result } = renderHook(() =>
      useTriageDnd("scratch-1", durableCandidateOptions()),
    );
    const dragData = makeStagedDragData();

    act(() => {
      result.current.handleDragStart(makeDragEndEvent(dragData, null));
      fireEvent.mouseMove(document, { clientX: 30, clientY: 40 });
      result.current.handleDragCancel();
    });
    await act(async () => {
      await result.current.handleDragEnd(makeDragEndEvent(dragData, target));
    });

    expect(result.current.activeDragItem).toBeNull();
    expect(result.current.targetFeedback).toBeNull();
    expect(latestPlacementRelease()).toBeNull();
    expect(createNodeMock).not.toHaveBeenCalled();
    expect(createBitMock).not.toHaveBeenCalled();
  });

  it("dispatches durable Node Stage when a breakdown row drops on the Node Zone", async () => {
    const { result } = renderHook(() => useTriageDnd("scratch-1", durableCandidateOptions()));

    await act(async () => {
      await completeDrag(result.current,
        makeDragEndEvent(
          { kind: "triage-breakdown", id: "row-1", label: "My note" },
          { kind: "triage-node-zone-drop" },
        ),
      );
    });

    expect(stageCandidateMock).toHaveBeenCalledOnce();
    expect(stageCandidateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        resultType: "node",
        sourceBreakdownId: "row-1",
        sourceExpectedVersion: 1,
      }),
    );
  });

  it("dispatches durable Bit Stage when a breakdown row drops on the Bit Zone", async () => {
    const { result } = renderHook(() => useTriageDnd("scratch-1", durableCandidateOptions()));

    await act(async () => {
      await completeDrag(result.current,
        makeDragEndEvent(
          { kind: "triage-breakdown", id: "row-2", label: "Call Sam" },
          { kind: "triage-bit-zone-drop" },
        ),
      );
    });

    expect(stageCandidateMock).toHaveBeenCalledOnce();
    expect(stageCandidateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        resultType: "bit",
        sourceBreakdownId: "row-2",
        sourceExpectedVersion: 1,
      }),
    );
  });

  it("is a noop when a staged-node drops on any zone (invalid cross-type drop)", () => {
    const { result } = renderHook(() => useTriageDnd("scratch-1", durableCandidateOptions()));

    act(() => {
      completeDrag(result.current,
        makeDragEndEvent(
          { kind: "triage-staged-node", id: "cand-1", label: "Project" },
          { kind: "triage-bit-zone-drop" },
        ),
      );
    });

  });

  it("is a noop when a staged-bit drops on any zone (invalid cross-type drop)", () => {
    const { result } = renderHook(() => useTriageDnd("scratch-1", durableCandidateOptions()));

    act(() => {
      completeDrag(result.current,
        makeDragEndEvent(
          { kind: "triage-staged-bit", id: "cand-2", label: "Todo" },
          { kind: "triage-node-zone-drop" },
        ),
      );
    });

  });

  it("is a noop when selectedScratchId is null", () => {
    const { result } = renderHook(() => useTriageDnd(null, durableCandidateOptions()));

    act(() => {
      completeDrag(result.current,
        makeDragEndEvent(
          { kind: "triage-breakdown", id: "row-1", label: "My note" },
          { kind: "triage-node-zone-drop" },
        ),
      );
    });

  });

  it("is a noop when dropped outside any zone", () => {
    const { result } = renderHook(() => useTriageDnd("scratch-1", durableCandidateOptions()));

    act(() => {
      completeDrag(result.current,
        makeDragEndEvent(
          { kind: "triage-breakdown", id: "row-1", label: "My note" },
          null,
        ),
      );
    });

  });

  it("hands a staged Node release directly to the canonical placement owner", async () => {
    const { result } = renderHook(() => useTriageDnd("scratch-1", durableCandidateOptions()));

    await act(async () => {
      await completeDrag(result.current,
        makeDragEndEvent(
          {
            kind: "triage-staged-node",
            id: "candidate-1",
            label: "Project",
            sourceBreakdownId: "breakdown-1",
          },
          {
            kind: "triage-hierarchy-drop",
            dropId: "triage-hierarchy:parent-1",
            parentNodeId: "parent-1",
            targetNodeLevel: 0,
            targetTitle: "Parent",
            targetParentPath: ["Home"],
          },
        ),
      );
    });

    expect(beginPlacementMock).toHaveBeenCalledWith({
      kind: "staged",
      scratchBitId: "scratch-1",
      source: { id: "breakdown-1", title: "Project", version: 1 },
      candidate: { id: "candidate-1", resultType: "node", version: 1 },
      target: {
        cell: { x: 0, y: 0 },
        dropId: "triage-hierarchy:parent-1",
        expectedAncestorIds: ["parent-1"],
        isFull: false,
        level: 0,
        parentId: "parent-1",
        path: ["Home", "Parent"],
        title: "Parent",
      },
    });
  });

  it("creates pending placement from a section body drop with the section's parentNodeId and targetNodeLevel", async () => {
    const { result } = renderHook(() => useTriageDnd("scratch-1", durableCandidateOptions()));

    await act(async () => {
      await completeDrag(result.current,
        makeDragEndEvent(
          {
            kind: "triage-staged-node",
            id: "candidate-1",
            label: "Project",
            sourceBreakdownId: "breakdown-1",
          },
          {
            kind: "triage-hierarchy-drop",
            dropId: "triage-hierarchy:body-l1",
            parentNodeId: "root-node-1",
            targetNodeLevel: 0,
            targetTitle: "Root Node",
            targetParentPath: ["Home"],
          },
        ),
      );
    });

    expect(latestPlacementRelease()).toEqual(
      expect.objectContaining({
        candidate: expect.objectContaining({ resultType: "node" }),
        target: expect.objectContaining({
          dropId: "triage-hierarchy:body-l1",
          parentId: "root-node-1",
          level: 0,
        }),
      }),
    );
  });

  it("creates a pending placement with unknown type when a breakdown row drops directly on a hierarchy target", async () => {
    const { result } = renderHook(() => useTriageDnd("scratch-1", durableCandidateOptions()));

    await act(async () => {
      await completeDrag(result.current,
        makeDragEndEvent(
          {
            kind: "triage-breakdown",
            id: "breakdown-1",
            label: "Project",
          },
          {
            kind: "triage-hierarchy-drop",
            dropId: "triage-hierarchy:parent-1",
            parentNodeId: "parent-1",
            targetNodeLevel: 0,
            targetTitle: "Parent",
            targetParentPath: ["Home"],
          },
        ),
      );
    });

    expect(latestPlacementRelease()).toMatchObject({
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
    });
  });

  it("writes nothing and creates no release when the exact target path is stale before placement opens", async () => {
    getNodeMock.mockResolvedValueOnce(undefined);
    const { result } = renderHook(() =>
      useTriageDnd("scratch-1", durableCandidateOptions()),
    );

    await act(async () => {
      await completeDrag(
        result.current,
        makeDragEndEvent(makeStagedDragData(), {
          kind: "triage-hierarchy-drop",
          dropId: "triage-hierarchy:parent-1",
          parentNodeId: "parent-1",
          targetNodeLevel: 0,
          targetTitle: "Parent",
          targetParentPath: ["Home"],
        }),
      );
    });

    expect(latestPlacementRelease()).toBeNull();
    expect(createNodeMock).not.toHaveBeenCalled();
    expect(createBitMock).not.toHaveBeenCalled();
  });

  it("keeps staged Drop release-only with no write", async () => {
    const { result } = renderHook(() => useTriageDnd("scratch-1", durableCandidateOptions()));

    await act(async () => {
      await completeDrag(result.current,
        makeDragEndEvent(
          {
            kind: "triage-staged-node",
            id: "candidate-1",
            label: "Project",
            sourceBreakdownId: "breakdown-1",
          },
          {
            kind: "triage-hierarchy-drop",
            dropId: "triage-hierarchy:parent-1",
            parentNodeId: "parent-1",
            targetNodeLevel: 0,
            targetTitle: "Parent",
            targetParentPath: ["Home"],
          },
        ),
      );
    });

    expect(createNodeMock).not.toHaveBeenCalled();
    expect(latestPlacementRelease()).not.toBeNull();
  });

  it("keeps direct Node Drop release-only with no write", async () => {
    const registerLocalPlacement = vi.fn(registerExplorerLocalPlacementAction);
    useTriageStore.setState({
      registerExplorerLocalPlacement: registerLocalPlacement,
    });
    const { result } = renderHook(() => useTriageDnd("scratch-1", durableCandidateOptions()));

    await act(async () => {
      await completeDrag(result.current,
        makeDragEndEvent(
          {
            kind: "triage-breakdown",
            id: "breakdown-1",
            label: "Project",
          },
          {
            kind: "triage-hierarchy-drop",
            dropId: "triage-hierarchy:parent-1",
            parentNodeId: "parent-1",
            targetNodeLevel: 0,
            targetTitle: "Parent",
            targetParentPath: ["Home"],
          },
        ),
      );
    });

    expect(createNodeMock).not.toHaveBeenCalled();
    expect(latestPlacementRelease()).not.toBeNull();
    expect(registerLocalPlacement).not.toHaveBeenCalled();
  });

  it("keeps a direct breakdown placement open when confirmation has no selected type", async () => {
    const { result } = renderHook(() => useTriageDnd("scratch-1", durableCandidateOptions()));

    await act(async () => {
      await completeDrag(result.current,
        makeDragEndEvent(
          {
            kind: "triage-breakdown",
            id: "breakdown-1",
            label: "Project",
          },
          {
            kind: "triage-hierarchy-drop",
            dropId: "triage-hierarchy:parent-1",
            parentNodeId: "parent-1",
            targetNodeLevel: 0,
            targetTitle: "Parent",
            targetParentPath: ["Home"],
          },
        ),
      );
    });

    const placement = latestPlacementRelease();

    expect(createNodeMock).not.toHaveBeenCalled();
    expect(createBitMock).not.toHaveBeenCalled();
    expect(latestPlacementRelease()).toEqual(placement);
  });

  it("cancels a pending placement without datastore writes or candidate removal", async () => {
    const { result } = renderHook(() => useTriageDnd("scratch-1", durableCandidateOptions()));

    await act(async () => {
      await completeDrag(result.current,
        makeDragEndEvent(
          {
            kind: "triage-staged-bit",
            id: "candidate-2",
            label: "Todo",
            sourceBreakdownId: "breakdown-2",
          },
          {
            kind: "triage-hierarchy-drop",
            dropId: "triage-hierarchy:parent-1",
            parentNodeId: "parent-1",
            targetNodeLevel: 0,
            targetTitle: "Parent",
            targetParentPath: ["Home"],
          },
        ),
      );
      clearPlacementOwner();
    });

    expect(createNodeMock).not.toHaveBeenCalled();
    expect(createBitMock).not.toHaveBeenCalled();
    expect(latestPlacementRelease()).toBeNull();
  });

  it("removes a staged candidate when dropped on the remove-from-staging target without datastore writes", async () => {
    const { result } = renderHook(() => useTriageDnd("scratch-1", durableCandidateOptions()));

    await act(async () => {
      await completeDrag(result.current,
        makeDragEndEvent(
          {
            kind: "triage-staged-bit",
            id: "candidate-2",
            label: "Todo",
            sourceBreakdownId: "breakdown-2",
          },
          { kind: "triage-remove-drop" },
        ),
      );
    });

    expect(unstageCandidateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        candidateId: "candidate-2",
        sourceBreakdownId: "breakdown-2",
      }),
    );
    expect(getDataStoreMock).not.toHaveBeenCalled();
    expect(createNodeMock).not.toHaveBeenCalled();
    expect(createBitMock).not.toHaveBeenCalled();
    expect(latestPlacementRelease()).toBeNull();
  });

  it("does not create a pending placement for a staged Bit dropped on Home", async () => {
    const { result } = renderHook(() => useTriageDnd("scratch-1", durableCandidateOptions()));

    await act(async () => {
      await completeDrag(result.current,
        makeDragEndEvent(
          {
            kind: "triage-staged-bit",
            id: "candidate-2",
            label: "Todo",
            sourceBreakdownId: "breakdown-2",
          },
          {
            kind: "triage-hierarchy-drop",
            dropId: "triage-hierarchy:root",
            parentNodeId: null,
            targetNodeLevel: null,
            targetTitle: "Home",
            targetParentPath: [],
          },
        ),
      );
    });

    expect(latestPlacementRelease()).toBeNull();
    expect(getGridOccupancyMock).not.toHaveBeenCalled();
  });
});

describe("useTriageDnd — T84 direct breakdown → hierarchy path", () => {
  it("does not release placement when selectedScratchId is null", async () => {
    const { result } = renderHook(() => useTriageDnd(null, durableCandidateOptions()));

    await act(async () => {
      await completeDrag(result.current,
        makeDragEndEvent(
          { kind: "triage-breakdown", id: "row-1", label: "My idea" },
          {
            kind: "triage-hierarchy-drop",
            dropId: "triage-hierarchy:parent-1",
            parentNodeId: "parent-1",
            targetNodeLevel: 0,
            targetTitle: "Parent",
            targetParentPath: ["Home"],
          },
        ),
      );
    });

    expect(latestPlacementRelease()).toBeNull();
  });

  it("keeps direct Bit Drop release-only with no write", async () => {
    const { result } = renderHook(() => useTriageDnd("scratch-1", durableCandidateOptions()));

    await act(async () => {
      await completeDrag(result.current,
        makeDragEndEvent(
          { kind: "triage-breakdown", id: "row-1", label: "My idea" },
          {
            kind: "triage-hierarchy-drop",
            dropId: "triage-hierarchy:parent-1",
            parentNodeId: "parent-1",
            targetNodeLevel: 0,
            targetTitle: "Parent",
            targetParentPath: ["Home"],
          },
        ),
      );
    });

    expect(createBitMock).not.toHaveBeenCalled();
    expect(latestPlacementRelease()).not.toBeNull();
  });

  it("cancels a direct breakdown placement without datastore writes or candidate removal", async () => {
    const { result } = renderHook(() => useTriageDnd("scratch-1", durableCandidateOptions()));

    await act(async () => {
      await completeDrag(result.current,
        makeDragEndEvent(
          { kind: "triage-breakdown", id: "row-1", label: "My idea" },
          {
            kind: "triage-hierarchy-drop",
            dropId: "triage-hierarchy:parent-1",
            parentNodeId: "parent-1",
            targetNodeLevel: 0,
            targetTitle: "Parent",
            targetParentPath: ["Home"],
          },
        ),
      );
    });

    act(() => {
      clearPlacementOwner();
    });

    expect(createNodeMock).not.toHaveBeenCalled();
    expect(createBitMock).not.toHaveBeenCalled();
    expect(latestPlacementRelease()).toBeNull();
  });

  it("releases a direct breakdown drop on Home to the placement owner", async () => {
    const { result } = renderHook(() => useTriageDnd("scratch-1", durableCandidateOptions()));

    await act(async () => {
      await completeDrag(result.current,
        makeDragEndEvent(
          { kind: "triage-breakdown", id: "row-1", label: "My idea" },
          {
            kind: "triage-hierarchy-drop",
            dropId: "triage-hierarchy:root",
            parentNodeId: null,
            targetNodeLevel: null,
            targetTitle: "Home",
            targetParentPath: [],
          },
        ),
      );
    });

    expect(latestPlacementRelease()).toEqual(
      expect.objectContaining({
        kind: "direct",
        target: expect.objectContaining({ parentId: null }),
      }),
    );
  });
});

describe("useTriageDnd — T85 remove-from-staging drop", () => {
  it("removes a staged Node candidate dropped on the remove target without datastore writes", async () => {
    const { result } = renderHook(() => useTriageDnd("scratch-1", durableCandidateOptions()));

    await act(async () => {
      await completeDrag(result.current,
        makeDragEndEvent(
          {
            kind: "triage-staged-node",
            id: "candidate-1",
            label: "Project",
            sourceBreakdownId: "breakdown-1",
          },
          { kind: "triage-remove-drop" },
        ),
      );
    });

    expect(unstageCandidateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        candidateId: "candidate-1",
        sourceBreakdownId: "breakdown-1",
      }),
    );
    expect(getDataStoreMock).not.toHaveBeenCalled();
    expect(getGridOccupancyMock).not.toHaveBeenCalled();
    expect(createNodeMock).not.toHaveBeenCalled();
    expect(createBitMock).not.toHaveBeenCalled();
  });

  it("ignores a breakdown row dropped on the remove target", async () => {
    const { result } = renderHook(() => useTriageDnd("scratch-1", durableCandidateOptions()));

    await act(async () => {
      await completeDrag(result.current,
        makeDragEndEvent(
          { kind: "triage-breakdown", id: "breakdown-1", label: "Project" },
          { kind: "triage-remove-drop" },
        ),
      );
    });

    expect(getDataStoreMock).not.toHaveBeenCalled();
    expect(getGridOccupancyMock).not.toHaveBeenCalled();
    expect(createNodeMock).not.toHaveBeenCalled();
    expect(createBitMock).not.toHaveBeenCalled();
  });

  it("ignores a staged Node dropped on the remove target when no scratch is selected", async () => {
    const { result } = renderHook(() => useTriageDnd(null, durableCandidateOptions()));

    await act(async () => {
      await completeDrag(result.current,
        makeDragEndEvent(
          {
            kind: "triage-staged-node",
            id: "candidate-1",
            label: "Project",
            sourceBreakdownId: "breakdown-1",
          },
          { kind: "triage-remove-drop" },
        ),
      );
    });

    expect(getDataStoreMock).not.toHaveBeenCalled();
    expect(getGridOccupancyMock).not.toHaveBeenCalled();
    expect(createNodeMock).not.toHaveBeenCalled();
    expect(createBitMock).not.toHaveBeenCalled();
  });
});

describe("useTriageDnd — post-close non-hierarchy hover feedback", () => {
  it("keeps the rendered hierarchy target ahead of a non-hierarchy event fallback", async () => {
    const hierarchyTarget = {
      kind: "triage-hierarchy-drop",
      dropId: "triage-hierarchy:parent-1",
      parentNodeId: "parent-1",
      targetNodeLevel: 0,
      targetTitle: "Parent",
      targetParentPath: ["Home"],
    };
    installRenderedHierarchyTarget(hierarchyTarget);
    const { result } = renderHook(() =>
      useTriageDnd("scratch-1", durableCandidateOptions()),
    );
    const dragData = makeStagedDragData();

    act(() => {
      result.current.handleDragStart(makeDragEndEvent(dragData, null));
      fireEvent.mouseMove(document, { clientX: 20, clientY: 30 });
      result.current.handleDragOver(
        makeDragOverEvent(
          dragData,
          "triage-remove-drop",
          { kind: "triage-remove-drop" },
        ),
      );
    });

    await waitFor(() =>
      expect(result.current.targetFeedback).toEqual({
        dropId: hierarchyTarget.dropId,
        state: "valid",
      }),
    );
    expect(result.current.overTargetId).toBe(hierarchyTarget.dropId);
  });

  it.each([
    [
      "Remove",
      makeStagedDragData(),
      "triage-remove-drop",
      { kind: "triage-remove-drop" },
    ],
    [
      "Breakdown Unstage",
      makeStagedDragData(),
      "triage-remove-drop:breakdown",
      { kind: "triage-remove-drop" },
    ],
    [
      "Node staging well",
      makeBreakdownDragData(),
      "triage-node-zone-drop",
      { kind: "triage-node-zone-drop" },
    ],
    [
      "Bit staging well",
      makeBreakdownDragData(),
      "triage-bit-zone-drop",
      { kind: "triage-bit-zone-drop" },
    ],
  ] as const)("falls back to the exact compatible %s event target", (_label, dragData, dropId, dropData) => {
    const { result } = renderHook(() =>
      useTriageDnd("scratch-1", durableCandidateOptions()),
    );

    act(() => {
      result.current.handleDragStart(makeDragEndEvent(dragData, null));
      fireEvent.mouseMove(document, { clientX: 20, clientY: 30 });
      result.current.handleDragOver(
        makeDragOverEvent(dragData, dropId, dropData),
      );
    });

    expect(result.current.overTargetId).toBe(dropId);
    expect(result.current.targetFeedback).toBeNull();
    expect(stageCandidateMock).not.toHaveBeenCalled();
    expect(unstageCandidateMock).not.toHaveBeenCalled();
    expect(getDataStoreMock).not.toHaveBeenCalled();
  });

  it.each([
    [
      "Node",
      "Nodes",
      makeStagedDragData(),
      "triage-node-zone-drop",
      { kind: "triage-node-zone-drop" },
    ],
    [
      "Node",
      "Bits",
      makeStagedDragData(),
      "triage-bit-zone-drop",
      { kind: "triage-bit-zone-drop" },
    ],
    [
      "Bit",
      "Nodes",
      makeStagedDragData({
        kind: "triage-staged-bit",
        resultType: "bit",
      }),
      "triage-node-zone-drop",
      { kind: "triage-node-zone-drop" },
    ],
    [
      "Bit",
      "Bits",
      makeStagedDragData({
        kind: "triage-staged-bit",
        resultType: "bit",
      }),
      "triage-bit-zone-drop",
      { kind: "triage-bit-zone-drop" },
    ],
  ] as const)(
    "retains staged %s hover feedback over %s without authorizing release",
    async (_sourceType, _targetType, dragData, dropId, dropData) => {
      const { result } = renderHook(() =>
        useTriageDnd("scratch-1", durableCandidateOptions()),
      );

      act(() => {
        result.current.handleDragStart(makeDragEndEvent(dragData, null));
        fireEvent.mouseDown(document, { clientX: 20, clientY: 30 });
        fireEvent.mouseMove(document, { clientX: 20, clientY: 30 });
        result.current.handleDragOver(
          makeDragOverEvent(dragData, dropId, dropData),
        );
      });

      expect(result.current.overTargetId).toBe(dropId);
      expect(result.current.targetFeedback).toBeNull();

      await act(async () => {
        await result.current.handleDragEnd(
          makeDragEndEvent(dragData, dropData),
        );
      });

      expect(result.current.overTargetId).toBeNull();
      expect(stageCandidateMock).not.toHaveBeenCalled();
      expect(unstageCandidateMock).not.toHaveBeenCalled();
      expect(getDataStoreMock).not.toHaveBeenCalled();
      expect(operationLockState.acquire).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["invalid target", makeBreakdownDragData(), "invalid-drop", { kind: "invalid-drop" }],
  ] as const)("denies an %s fallback", (_label, dragData, dropId, dropData) => {
    const { result } = renderHook(() =>
      useTriageDnd("scratch-1", durableCandidateOptions()),
    );

    act(() => {
      result.current.handleDragStart(makeDragEndEvent(dragData, null));
      fireEvent.mouseMove(document, { clientX: 20, clientY: 30 });
      result.current.handleDragOver(
        makeDragOverEvent(dragData, dropId, dropData),
      );
    });

    expect(result.current.overTargetId).toBeNull();
    expect(result.current.targetFeedback).toBeNull();
  });

  it("rejects a known well carrying a forged nonmatching drop ID", () => {
    const { result } = renderHook(() =>
      useTriageDnd("scratch-1", durableCandidateOptions()),
    );
    const dragData = makeBreakdownDragData();

    act(() => {
      result.current.handleDragStart(makeDragEndEvent(dragData, null));
      fireEvent.mouseMove(document, { clientX: 20, clientY: 30 });
      result.current.handleDragOver(
        makeDragOverEvent(dragData, "forged-node-well", {
          kind: "triage-node-zone-drop",
        }),
      );
    });

    expect(result.current.overTargetId).toBeNull();
    expect(result.current.targetFeedback).toBeNull();
    expect(stageCandidateMock).not.toHaveBeenCalled();
    expect(unstageCandidateMock).not.toHaveBeenCalled();
    expect(getDataStoreMock).not.toHaveBeenCalled();
  });

  it("does not restore a staging target after source invalidation", async () => {
    const { result } = renderHook(() =>
      useTriageDnd("scratch-1", durableCandidateOptions()),
    );
    const dragData = makeBreakdownDragData();
    const dropData = { kind: "triage-node-zone-drop" };

    act(() => {
      result.current.handleDragStart(makeDragEndEvent(dragData, null));
      fireEvent.mouseMove(document, { clientX: 20, clientY: 30 });
      invalidateTriageDragSource(dragData);
      fireEvent.mouseMove(document, { clientX: 20, clientY: 30 });
      result.current.handleDragOver(
        makeDragOverEvent(dragData, "triage-node-zone-drop", dropData),
      );
    });

    expect(result.current.overTargetId).toBeNull();
    expect(result.current.targetFeedback).toBeNull();

    await act(async () => {
      await result.current.handleDragEnd(makeDragEndEvent(dragData, dropData));
    });

    expect(stageCandidateMock).not.toHaveBeenCalled();
    expect(unstageCandidateMock).not.toHaveBeenCalled();
    expect(getDataStoreMock).not.toHaveBeenCalled();
    expect(operationLockState.acquire).not.toHaveBeenCalled();
  });

  it.each([
    ["Mouse movement", "hierarchy hit", true],
    ["Mouse movement", "hierarchy miss", false],
    ["explicit pointer refresh", "hierarchy hit", true],
    ["explicit pointer refresh", "hierarchy miss", false],
  ] as const)(
    "clears stale Scratch feedback before %s can probe a %s",
    (refreshMode, _targetMode, hasHierarchyTarget) => {
      const { result, rerender } = renderHook(
        ({ scratchId }) => useTriageDnd(scratchId, durableCandidateOptions()),
        { initialProps: { scratchId: "scratch-1" as string | null } },
      );
      const dragData = makeBreakdownDragData();
      const dropData = { kind: "triage-node-zone-drop" };
      const hierarchyTarget = document.createElement("div");
      hierarchyTarget.dataset.triageHierarchyDrop = JSON.stringify({
        kind: "triage-hierarchy-drop",
        dropId: "triage-hierarchy:parent-1",
        parentNodeId: "parent-1",
        targetNodeLevel: 0,
        targetTitle: "Parent",
        targetParentPath: ["Home"],
      });
      const elementsFromPointMock = vi.fn(() =>
        hasHierarchyTarget ? [hierarchyTarget] : [],
      );

      act(() => {
        result.current.handleDragStart(makeDragEndEvent(dragData, null));
        fireEvent.mouseMove(document, { clientX: 20, clientY: 30 });
        result.current.handleDragOver(
          makeDragOverEvent(dragData, "triage-node-zone-drop", dropData),
        );
      });
      expect(result.current.overTargetId).toBe("triage-node-zone-drop");

      Object.defineProperty(document, "elementsFromPoint", {
        configurable: true,
        value: elementsFromPointMock,
      });
      rerender({ scratchId: "scratch-2" });
      getDataStoreMock.mockClear();
      getGridOccupancyMock.mockClear();

      if (refreshMode === "Mouse movement") {
        act(() => fireEvent.mouseMove(document, { clientX: 40, clientY: 50 }));
      } else {
        act(() => result.current.refreshRenderedTarget({ x: 40, y: 50 }));
      }

      expect(result.current.overTargetId).toBeNull();
      expect(result.current.targetFeedback).toBeNull();
      expect(elementsFromPointMock).not.toHaveBeenCalled();
      expect(stageCandidateMock).not.toHaveBeenCalled();
      expect(unstageCandidateMock).not.toHaveBeenCalled();
      expect(getGridOccupancyMock).not.toHaveBeenCalled();
    },
  );

  it("clears fallback feedback on cancellation", () => {
    const { result } = renderHook(() =>
      useTriageDnd("scratch-1", durableCandidateOptions()),
    );
    const dragData = makeStagedDragData();

    act(() => {
      result.current.handleDragStart(makeDragEndEvent(dragData, null));
      fireEvent.mouseMove(document, { clientX: 20, clientY: 30 });
      result.current.handleDragOver(
        makeDragOverEvent(
          dragData,
          "triage-remove-drop",
          { kind: "triage-remove-drop" },
        ),
      );
    });
    expect(result.current.overTargetId).toBe("triage-remove-drop");

    act(() => result.current.handleDragCancel());

    expect(result.current.overTargetId).toBeNull();
    expect(result.current.targetFeedback).toBeNull();
  });

  it("retains a compatible fallback through a later hierarchy-miss pointer refresh", () => {
    const { result } = renderHook(() =>
      useTriageDnd("scratch-1", durableCandidateOptions()),
    );
    const dragData = makeBreakdownDragData();

    act(() => {
      result.current.handleDragStart(makeDragEndEvent(dragData, null));
      fireEvent.mouseMove(document, { clientX: 20, clientY: 30 });
      result.current.handleDragOver(
        makeDragOverEvent(
          dragData,
          "triage-node-zone-drop",
          { kind: "triage-node-zone-drop" },
        ),
      );
    });
    expect(result.current.overTargetId).toBe("triage-node-zone-drop");

    act(() => result.current.refreshRenderedTarget({ x: 20, y: 30 }));

    expect(result.current.overTargetId).toBe("triage-node-zone-drop");
    expect(result.current.targetFeedback).toBeNull();
    expect(stageCandidateMock).not.toHaveBeenCalled();
    expect(getDataStoreMock).not.toHaveBeenCalled();
  });
});
