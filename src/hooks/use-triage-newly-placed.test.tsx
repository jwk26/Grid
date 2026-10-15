import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import { Suspense } from "react";
import { describe, expect, it, vi } from "vitest";
import type { TriagePlacementCommand } from "@/hooks/use-triage-placement";
import type { TriageOperationLock } from "@/hooks/use-triage-operation-lock";
import type { PlacementUndoResult } from "@/lib/db/datastore";
import type { ScratchBreakdown, StagedCandidate } from "@/lib/db/schema";
import type { Bit, Node } from "@/types";
import {
  createTriagePlacementUndoCommand,
  useTriageNewlyPlaced,
  useTriageNewlyPlacedUndo,
} from "./use-triage-newly-placed";

function createNode(id: string, x: number, y: number): Node {
  return {
    id,
    title: id,
    color: "hsl(221, 83%, 53%)",
    icon: "Folder",
    deadline: null,
    deadlineAllDay: false,
    mtime: 1,
    createdAt: 1,
    parentId: null,
    level: 0,
    x,
    y,
    deletedAt: null,
    archivedAt: null,
    systemRole: null,
    hiddenFromGrid: false,
    version: 1,
    pastDeadlineDismissed: false,
  };
}

function createBit(id: string, x: number, y: number): Bit {
  return {
    id,
    title: id,
    description: "",
    icon: "ListTodo",
    deadline: null,
    deadlineAllDay: false,
    priority: null,
    status: "active",
    mtime: 1,
    createdAt: 1,
    parentId: "parent-1",
    x,
    y,
    deletedAt: null,
    archivedAt: null,
    version: 1,
    pastDeadlineDismissed: false,
  };
}

function command(
  resultId: string,
  resultType: "node" | "bit",
  sequence: number,
  staged = false,
): TriagePlacementCommand {
  const base = {
    operationId: `operation-${sequence}`,
    resultId,
    scratchBitId: "scratch-1",
    sourceBreakdownId: `source-${sequence}`,
    sourceExpectedVersion: sequence,
    resultType,
    title: resultId,
    targetParentId: resultType === "node" ? null : "parent-1",
    expectedAncestorIds: resultType === "node" ? [] : ["parent-1"],
    x: sequence * 10,
    y: sequence * 20,
  } as const;
  return staged
    ? {
        ...base,
        candidateId: `candidate-${sequence}`,
        candidateExpectedVersion: sequence + 10,
      }
    : base;
}

function source(sequence: number): ScratchBreakdown {
  return {
    id: `source-${sequence}`,
    scratchBitId: "scratch-1",
    content: `Source ${sequence}`,
    order: sequence,
    createdAt: sequence,
    consumedAt: null,
    version: sequence,
  };
}

function candidate(sequence: number): StagedCandidate {
  return {
    id: `candidate-${sequence}`,
    scratchBitId: "scratch-1",
    sourceBreakdownId: `source-${sequence}`,
    resultType: "bit",
    lifecycle: "staged",
    createdAt: sequence,
    updatedAt: sequence,
    version: sequence + 10,
  };
}

describe("useTriageNewlyPlaced", () => {
  it("retains exact direct and staged placement provenance", () => {
    const { result } = renderHook(() => useTriageNewlyPlaced());
    const node = createNode("node-1", 10, 20);
    const bit = createBit("bit-1", 20, 40);

    act(() => {
      expect(result.current.registerPlacement({
        result: node,
        command: command(node.id, "node", 1),
        sourceSnapshot: source(1),
        candidateSnapshot: null,
      })).toBe(true);
      expect(result.current.registerPlacement({
        result: bit,
        command: command(bit.id, "bit", 2, true),
        sourceSnapshot: source(2),
        candidateSnapshot: candidate(2),
      })).toBe(true);
    });

    expect(result.current.getProvenance("node", node.id)).toMatchObject({
      operationId: "operation-1",
      resultId: node.id,
      resultType: "node",
      resultVersion: 1,
      source: {
        scratchBitId: "scratch-1",
        breakdownId: "source-1",
        expectedVersion: 1,
        snapshot: source(1),
      },
      candidate: null,
      destination: { parentId: null, pathIds: [], x: 10, y: 20 },
    });
    expect(result.current.getProvenance("bit", bit.id)).toMatchObject({
      operationId: "operation-2",
      resultId: bit.id,
      resultType: "bit",
      resultVersion: 1,
      candidate: {
        id: "candidate-2",
        expectedVersion: 12,
        snapshot: candidate(2),
      },
      destination: { parentId: "parent-1", pathIds: ["parent-1"], x: 20, y: 40 },
    });
  });

  it("pins multiple local results newest-first within type without changing records or ordinary order", () => {
    const { result } = renderHook(() => useTriageNewlyPlaced());
    const ordinaryNode = createNode("ordinary-node", 1, 2);
    const firstNode = createNode("first-node", 10, 20);
    const secondNode = createNode("second-node", 30, 40);
    const ordinaryBit = createBit("ordinary-bit", 3, 4);
    const localBit = createBit("local-bit", 50, 60);

    act(() => {
      result.current.registerPlacement({ result: firstNode, command: command(firstNode.id, "node", 1), sourceSnapshot: source(1), candidateSnapshot: null });
      result.current.registerPlacement({ result: localBit, command: command(localBit.id, "bit", 2), sourceSnapshot: source(2), candidateSnapshot: null });
      result.current.registerPlacement({ result: secondNode, command: command(secondNode.id, "node", 3), sourceSnapshot: source(3), candidateSnapshot: null });
    });

    const projectedNodes = result.current.project("node", [ordinaryNode, firstNode, secondNode]);
    const projectedBits = result.current.project("bit", [ordinaryBit, localBit]);

    expect(projectedNodes.map(({ id }) => id)).toEqual([secondNode.id, firstNode.id, ordinaryNode.id]);
    expect(projectedBits.map(({ id }) => id)).toEqual([localBit.id, ordinaryBit.id]);
    expect(projectedNodes[0]).toBe(secondNode);
    expect(projectedBits[0]).toBe(localBit);
    expect(secondNode).toMatchObject({ x: 30, y: 40 });
    expect(localBit).toMatchObject({ x: 50, y: 60 });
  });

  it("ignores mismatched and duplicate results and clears page-session state on unmount", () => {
    const first = renderHook(() => useTriageNewlyPlaced());
    const node = createNode("node-1", 10, 20);

    act(() => {
      expect(first.result.current.registerPlacement({ result: node, command: command("other-id", "node", 1), sourceSnapshot: source(1), candidateSnapshot: null })).toBe(false);
      expect(first.result.current.registerPlacement({ result: node, command: command(node.id, "node", 2), sourceSnapshot: source(2), candidateSnapshot: null })).toBe(true);
      expect(first.result.current.registerPlacement({ result: node, command: command(node.id, "node", 2), sourceSnapshot: source(2), candidateSnapshot: null })).toBe(false);
    });
    expect(first.result.current.isNewlyPlaced("node", node.id)).toBe(true);

    first.unmount();
    const reloaded = renderHook(() => useTriageNewlyPlaced());
    expect(reloaded.result.current.isNewlyPlaced("node", node.id)).toBe(false);
    expect(reloaded.result.current.project("node", [node])).toEqual([node]);
  });

  it("builds staged and direct Undo commands from the exact immutable placement provenance", () => {
    const placedAt = 100;
    const directResult = createNode("node-direct", 10, 20);
    directResult.createdAt = placedAt;
    directResult.mtime = placedAt;
    const stagedResult = createBit("bit-staged", 20, 40);
    stagedResult.createdAt = placedAt;
    stagedResult.mtime = placedAt;
    const { result } = renderHook(() => useTriageNewlyPlaced());

    act(() => {
      result.current.registerPlacement({
        result: directResult,
        command: command(directResult.id, "node", 1),
        sourceSnapshot: source(1),
        candidateSnapshot: null,
      });
      result.current.registerPlacement({
        result: stagedResult,
        command: command(stagedResult.id, "bit", 2, true),
        sourceSnapshot: source(2),
        candidateSnapshot: candidate(2),
      });
    });

    const direct = createTriagePlacementUndoCommand(
      result.current.getProvenance("node", directResult.id)!,
      "undo-direct",
    );
    const staged = createTriagePlacementUndoCommand(
      result.current.getProvenance("bit", stagedResult.id)!,
      "undo-staged",
    );

    expect(direct).toEqual({
      operationId: "undo-direct",
      resultSnapshot: directResult,
      sourceSnapshot: {
        ...source(1),
        consumedAt: placedAt,
        version: 2,
      },
    });
    expect(direct).not.toHaveProperty("candidateSnapshot");
    expect(staged).toEqual({
      operationId: "undo-staged",
      resultSnapshot: stagedResult,
      sourceSnapshot: {
        ...source(2),
        consumedAt: placedAt,
        version: 3,
      },
      candidateSnapshot: candidate(2),
    });
  });

  it("exposes the exact mounted provenance to approved Search composition", async () => {
    const target = createNode("search-undo", 10, 20);
    const placement = renderHook(() => useTriageNewlyPlaced());
    act(() => {
      placement.result.current.registerPlacement({
        result: target,
        command: command(target.id, "node", 1),
        sourceSnapshot: source(1),
        candidateSnapshot: null,
      });
    });
    const entry = placement.result.current.entries[0]!;
    let publish!: (truth: ReadonlyMap<string, PlacementUndoResult>) => void;
    const undo = renderHook(() => useTriageNewlyPlacedUndo({
      entries: [entry],
      operationLock: {
        activeOperation: null,
        acquire: vi.fn(() => true),
        isLocked: vi.fn(() => false),
        release: vi.fn(() => true),
      },
      placementOpen: false,
      hasDirtyEdit: () => false,
      observeTruth: (_entries, next) => {
        publish = next;
        return () => undefined;
      },
      dispatchUndo: vi.fn(),
      reconcileUndo: vi.fn(),
    }));
    act(() => publish(new Map()));

    expect(undo.result.current.getProvenance("node", target.id)).toEqual(entry);
    expect(undo.result.current.getProvenance("bit", target.id)).toBeNull();
  });

  it("acquires Undo synchronously, retains exact provenance through unknown reconciliation, and releases only terminally", async () => {
    const node = createNode("node-undo", 10, 20);
    node.createdAt = 100;
    node.mtime = 100;
    const placed = renderHook(() => useTriageNewlyPlaced());
    act(() => {
      placed.result.current.registerPlacement({
        result: node,
        command: command(node.id, "node", 1),
        sourceSnapshot: source(1),
        candidateSnapshot: null,
      });
    });
    const entry = placed.result.current.entries[0]!;
    let active: { kind: "undo"; operationId: string } | null = null;
    const acquire = vi.fn((_kind: Parameters<TriageOperationLock["acquire"]>[0], operationId: string) => {
      if (active !== null) return false;
      active = { kind: "undo", operationId };
      return true;
    });
    const release = vi.fn((operationId: string, status: string) => {
      if (active?.operationId !== operationId || status !== "applied") return false;
      active = null;
      return true;
    });
    const lock = {
      activeOperation: null,
      acquire,
      isLocked: () => active !== null,
      release,
    } as TriageOperationLock;
    const dispatchUndo = vi.fn(async () => {
      throw new Error("ambiguous transport");
    });
    let finishReconcile!: (value: PlacementUndoResult) => void;
    const reconcileUndo = vi.fn(
      () => new Promise<PlacementUndoResult>((resolve) => {
        finishReconcile = resolve;
      }),
    );
    const observeTruth = vi.fn((_entries, publish) => {
      publish(new Map([["node:node-undo", {
        operationId: "truth-probe",
        status: "not_applied",
        result: node,
        source: { ...source(1), consumedAt: 100, version: 2 },
        candidate: null,
      }]]));
      return () => undefined;
    });
    const undo = renderHook(() => useTriageNewlyPlacedUndo({
      entries: [entry],
      operationLock: lock,
      placementOpen: false,
      hasDirtyEdit: () => false,
      createId: () => "undo-operation",
      observeTruth,
      dispatchUndo,
      reconcileUndo,
    }));

    await waitFor(() => {
      expect(undo.result.current.getState("node", node.id).reason).toBe("available");
    });
    await act(async () => {
      expect(await undo.result.current.activate("node", node.id)).toBe(false);
    });
    expect(acquire).toHaveBeenCalledWith("undo", "undo-operation");
    expect(acquire.mock.invocationCallOrder[0]).toBeLessThan(
      dispatchUndo.mock.invocationCallOrder[0]!,
    );
    expect(undo.result.current.getState("node", node.id)).toMatchObject({
      phase: "unknown",
      command: createTriagePlacementUndoCommand(entry, "undo-operation"),
    });
    expect(active).toEqual({ kind: "undo", operationId: "undo-operation" });
    expect(release).not.toHaveBeenCalled();
    await act(async () => {
      expect(await undo.result.current.activate("node", node.id)).toBe(false);
    });
    expect(dispatchUndo).toHaveBeenCalledTimes(1);
    await act(async () => {
      const pending = undo.result.current.reconcile("node", node.id);
      expect(undo.result.current.getState("node", node.id).phase).toBe("reconciling");
      expect(await undo.result.current.reconcile("node", node.id)).toBe(false);
      finishReconcile({
        operationId: "undo-operation",
        status: "applied",
        result: null,
        source: { ...source(1), consumedAt: null, version: 2 },
        candidate: null,
      });
      expect(await pending).toBe(true);
    });
    expect(release).toHaveBeenCalledWith("undo-operation", "applied");
    expect(active).toBeNull();
    expect(undo.result.current.getState("node", node.id).phase).toBe("success");
  });

  it("derives truth blockers and dispatches re-enabled Undo through the ordinary path", async () => {
    const node = createNode("node-truth", 10, 20);
    node.createdAt = 100;
    node.mtime = 100;
    const placed = renderHook(() => useTriageNewlyPlaced());
    act(() => {
      placed.result.current.registerPlacement({
        result: node,
        command: command(node.id, "node", 1),
        sourceSnapshot: source(1),
        candidateSnapshot: null,
      });
    });
    const entry = placed.result.current.entries[0]!;
    let publish!: (truth: ReadonlyMap<string, PlacementUndoResult>) => void;
    const acquire = vi.fn(() => true);
    const dispatchUndo = vi.fn(async (undoCommand) => ({
      operationId: undoCommand.operationId,
      status: "applied" as const,
      result: null,
      source: { ...source(1), consumedAt: null, version: 3 },
      candidate: null,
    }));
    const undo = renderHook(() => useTriageNewlyPlacedUndo({
      entries: [entry],
      operationLock: {
        activeOperation: null,
        acquire,
        isLocked: () => false,
        release: vi.fn(() => true),
      },
      placementOpen: false,
      hasDirtyEdit: () => false,
      createId: () => "reenabled-undo",
      observeTruth: (_entries, next) => {
        publish = next;
        return () => undefined;
      },
      dispatchUndo,
      reconcileUndo: vi.fn(),
    }));
    const exactSource = {
      ...source(1),
      consumedAt: 100,
      version: 2,
    };
    const publishConflict = (overrides: Partial<PlacementUndoResult> = {}) => {
      act(() => {
        publish(new Map([["node:node-truth", {
          operationId: "truth-probe",
          status: "conflict",
          result: node,
          source: exactSource,
          candidate: null,
          ...overrides,
        }]]));
      });
    };

    publishConflict({ result: { ...node, version: 2 } });
    expect(undo.result.current.getState("node", node.id).reason).toBe("result-mutated");
    publishConflict({ source: { ...exactSource, consumedAt: 101 } });
    expect(undo.result.current.getState("node", node.id).reason).toBe("source-mutated");
    publishConflict({ candidate: candidate(1) });
    expect(undo.result.current.getState("node", node.id).reason).toBe("candidate-mutated");
    publishConflict();
    expect(undo.result.current.getState("node", node.id).reason).toBe("dependencies");
    act(() => {
      publish(new Map([["node:node-truth", {
        operationId: "truth-probe",
        status: "not_applied",
        result: node,
        source: exactSource,
        candidate: null,
      }]]));
    });
    expect(undo.result.current.getState("node", node.id)).toMatchObject({
      phase: "available",
      reason: "reenabled",
    });
    await act(async () => {
      expect(await undo.result.current.activate("node", node.id)).toBe(true);
    });
    expect(acquire).toHaveBeenCalledOnce();
    expect(acquire).toHaveBeenCalledWith("undo", "reenabled-undo");
    expect(dispatchUndo).toHaveBeenCalledOnce();
  });

  it.each([
    ["open placement", "placement-open"],
    ["shared lock", "active-owner"],
    ["dirty Edit", "dirty-edit"],
  ] as const)("clears re-enabled lifetime across %s", async (kind, expectedReason) => {
    const node = createNode(`node-reenabled-${kind}`, 10, 20);
    node.createdAt = 100;
    node.mtime = 100;
    const placed = renderHook(() => useTriageNewlyPlaced());
    act(() => {
      placed.result.current.registerPlacement({
        result: node,
        command: command(node.id, "node", 1),
        sourceSnapshot: source(1),
        candidateSnapshot: null,
      });
    });
    let blocked = false;
    let publish!: (truth: ReadonlyMap<string, PlacementUndoResult>) => void;
    const operationLock: TriageOperationLock = {
      activeOperation: null,
      acquire: vi.fn(() => true),
      isLocked: () => kind === "shared lock" && blocked,
      release: vi.fn(() => true),
    };
    const undo = renderHook(
      ({ placementOpen }: { placementOpen: boolean }) =>
        useTriageNewlyPlacedUndo({
          entries: placed.result.current.entries,
          operationLock,
          placementOpen,
          hasDirtyEdit: () => kind === "dirty Edit" && blocked,
          observeTruth: (_entries, next) => {
            publish = next;
            return () => undefined;
          },
          dispatchUndo: vi.fn(),
          reconcileUndo: vi.fn(),
        }),
      { initialProps: { placementOpen: false } },
    );
    const exactSource = { ...source(1), consumedAt: 100, version: 2 };
    act(() => {
      publish(new Map([[`node:${node.id}`, {
        operationId: "truth-probe",
        status: "conflict",
        result: node,
        source: exactSource,
        candidate: null,
      }]]));
      publish(new Map([[`node:${node.id}`, {
        operationId: "truth-probe",
        status: "not_applied",
        result: node,
        source: exactSource,
        candidate: null,
      }]]));
    });
    expect(undo.result.current.getState("node", node.id).reason).toBe("reenabled");

    if (kind !== "open placement") {
      blocked = true;
      expect(undo.result.current.getState("node", node.id).reason).toBe(expectedReason);
      blocked = false;
      expect(undo.result.current.getState("node", node.id).reason).toBe("reenabled");
    }

    blocked = true;
    undo.rerender({ placementOpen: kind === "open placement" });
    expect(undo.result.current.getState("node", node.id).reason).toBe(expectedReason);
    blocked = false;
    undo.rerender({ placementOpen: false });
    expect(undo.result.current.getState("node", node.id)).toMatchObject({
      phase: "available",
      reason: "available",
    });
  });

  it("does not consume re-enabled lifetime from a suspended render", async () => {
    const node = createNode("node-reenabled-suspended", 10, 20);
    node.createdAt = 100;
    node.mtime = 100;
    const placed = renderHook(() => useTriageNewlyPlaced());
    act(() => {
      placed.result.current.registerPlacement({
        result: node,
        command: command(node.id, "node", 1),
        sourceSnapshot: source(1),
        candidateSnapshot: null,
      });
    });
    const entry = placed.result.current.entries[0]!;
    let publish!: (truth: ReadonlyMap<string, PlacementUndoResult>) => void;
    const suspended = new Promise<never>(() => undefined);

    function Harness({ blocked, suspend }: { blocked: boolean; suspend: boolean }) {
      const undo = useTriageNewlyPlacedUndo({
        entries: [entry],
        operationLock: {
          activeOperation: null,
          acquire: vi.fn(() => true),
          isLocked: () => false,
          release: vi.fn(() => true),
        },
        placementOpen: false,
        hasDirtyEdit: () => blocked,
        observeTruth: (_entries, next) => {
          publish = next;
          return () => undefined;
        },
        dispatchUndo: vi.fn(),
        reconcileUndo: vi.fn(),
      });
      const renderedReason = undo.getState("node", node.id).reason;
      if (suspend) throw suspended;
      return <span>{renderedReason}</span>;
    }

    const view = render(
      <Suspense fallback={<span>Suspended</span>}>
        <Harness blocked={false} suspend={false} />
      </Suspense>,
    );
    const exactSource = { ...source(1), consumedAt: 100, version: 2 };
    act(() => {
      publish(new Map([[`node:${node.id}`, {
        operationId: "truth-probe",
        status: "conflict",
        result: node,
        source: exactSource,
        candidate: null,
      }]]));
      publish(new Map([[`node:${node.id}`, {
        operationId: "truth-probe",
        status: "not_applied",
        result: node,
        source: exactSource,
        candidate: null,
      }]]));
    });
    expect(await screen.findByText("reenabled")).not.toBeNull();

    view.rerender(
      <Suspense fallback={<span>Suspended</span>}>
        <Harness blocked suspend />
      </Suspense>,
    );

    view.rerender(
      <Suspense fallback={<span>Suspended</span>}>
        <Harness blocked={false} suspend={false} />
      </Suspense>,
    );
    expect(await screen.findByText("reenabled")).not.toBeNull();
  });

  it("retries only authoritative not-applied with the same logical operation ID", async () => {
    const node = createNode("node-retry", 10, 20);
    node.createdAt = 100;
    node.mtime = 100;
    const placed = renderHook(() => useTriageNewlyPlaced());
    act(() => {
      placed.result.current.registerPlacement({
        result: node,
        command: command(node.id, "node", 1),
        sourceSnapshot: source(1),
        candidateSnapshot: null,
      });
    });
    const entry = placed.result.current.entries[0]!;
    let lockedOperationId: string | null = null;
    const acquire = vi.fn((_kind: Parameters<TriageOperationLock["acquire"]>[0], operationId: string) => {
      if (lockedOperationId !== null) return false;
      lockedOperationId = operationId;
      return true;
    });
    const release = vi.fn((operationId: string) => {
      if (lockedOperationId !== operationId) return false;
      lockedOperationId = null;
      return true;
    });
    const notApplied: PlacementUndoResult = {
      operationId: "undo-retry",
      status: "not_applied",
      result: node,
      source: { ...source(1), consumedAt: 100, version: 2 },
      candidate: null,
    };
    const applied: PlacementUndoResult = {
      operationId: "undo-retry",
      status: "applied",
      result: null,
      source: { ...source(1), consumedAt: null, version: 3 },
      candidate: null,
    };
    const dispatchUndo = vi
      .fn<(command: ReturnType<typeof createTriagePlacementUndoCommand>) => Promise<PlacementUndoResult>>()
      .mockResolvedValueOnce(notApplied)
      .mockResolvedValueOnce(applied);
    const undo = renderHook(() => useTriageNewlyPlacedUndo({
      entries: [entry],
      operationLock: {
        activeOperation: null,
        acquire,
        isLocked: () => lockedOperationId !== null,
        release,
      },
      placementOpen: false,
      hasDirtyEdit: () => false,
      createId: () => "undo-retry",
      observeTruth: (_entries, publish) => {
        publish(new Map([["node:node-retry", notApplied]]));
        return () => undefined;
      },
      dispatchUndo,
      reconcileUndo: vi.fn(),
    }));

    await waitFor(() => expect(undo.result.current.getState("node", node.id).phase).toBe("available"));
    await act(async () => {
      expect(await undo.result.current.activate("node", node.id)).toBe(false);
    });
    expect(undo.result.current.getState("node", node.id)).toMatchObject({
      phase: "terminal",
      terminalStatus: "not_applied",
      command: expect.objectContaining({ operationId: "undo-retry" }),
    });

    await act(async () => {
      expect(await undo.result.current.retry("node", node.id)).toBe(true);
    });
    expect(acquire).toHaveBeenNthCalledWith(1, "undo", "undo-retry");
    expect(acquire).toHaveBeenNthCalledWith(2, "undo", "undo-retry");
    expect(dispatchUndo).toHaveBeenCalledTimes(2);
    expect(dispatchUndo.mock.calls[1]![0]).toEqual(dispatchUndo.mock.calls[0]![0]);
  });

  it.each([
    ["open placement", "placement-open"],
    ["shared lock", "active-owner"],
    ["dirty Edit", "dirty-edit"],
  ] as const)("blocks authoritative Retry during %s without replay", async (kind, expectedReason) => {
    const node = createNode(`node-retry-${kind}`, 10, 20);
    node.createdAt = 100;
    node.mtime = 100;
    const placed = renderHook(() => useTriageNewlyPlaced());
    act(() => {
      placed.result.current.registerPlacement({
        result: node,
        command: command(node.id, "node", 1),
        sourceSnapshot: source(1),
        candidateSnapshot: null,
      });
    });
    let activeOperationId: string | null = null;
    let blocked = false;
    const acquire = vi.fn((_kind: Parameters<TriageOperationLock["acquire"]>[0], operationId: string) => {
      if (activeOperationId !== null || (kind === "shared lock" && blocked)) return false;
      activeOperationId = operationId;
      return true;
    });
    const release = vi.fn((operationId: string) => {
      if (activeOperationId !== operationId) return false;
      activeOperationId = null;
      return true;
    });
    const notApplied: PlacementUndoResult = {
      operationId: "blocked-retry",
      status: "not_applied",
      result: node,
      source: { ...source(1), consumedAt: 100, version: 2 },
      candidate: null,
    };
    const dispatchUndo = vi
      .fn<(undoCommand: ReturnType<typeof createTriagePlacementUndoCommand>) => Promise<PlacementUndoResult>>()
      .mockResolvedValueOnce(notApplied)
      .mockResolvedValueOnce({
        ...notApplied,
        status: "applied",
        result: null,
        source: { ...source(1), consumedAt: null, version: 3 },
      });
    const operationLock: TriageOperationLock = {
      activeOperation: null,
      acquire,
      isLocked: () => activeOperationId !== null || (kind === "shared lock" && blocked),
      release,
    };
    const undo = renderHook(
      ({ placementOpen }: { placementOpen: boolean }) =>
        useTriageNewlyPlacedUndo({
          entries: placed.result.current.entries,
          operationLock,
          placementOpen,
          hasDirtyEdit: () => kind === "dirty Edit" && blocked,
          createId: () => "blocked-retry",
          observeTruth: (_entries, publish) => {
            publish(new Map([[`node:${node.id}`, notApplied]]));
            return () => undefined;
          },
          dispatchUndo,
          reconcileUndo: vi.fn(),
        }),
      { initialProps: { placementOpen: false } },
    );
    await waitFor(() => expect(undo.result.current.getState("node", node.id).phase).toBe("available"));
    await act(async () => {
      expect(await undo.result.current.activate("node", node.id)).toBe(false);
    });

    blocked = true;
    undo.rerender({ placementOpen: kind === "open placement" });
    expect(undo.result.current.getState("node", node.id)).toMatchObject({
      phase: "blocked",
      reason: expectedReason,
      terminalStatus: "not_applied",
    });
    await act(async () => {
      expect(await undo.result.current.retry("node", node.id)).toBe(false);
    });
    expect(acquire).toHaveBeenCalledTimes(1);
    expect(dispatchUndo).toHaveBeenCalledTimes(1);

    blocked = false;
    undo.rerender({ placementOpen: false });
    expect(undo.result.current.getState("node", node.id)).toMatchObject({
      phase: "terminal",
      reason: "available",
      terminalStatus: "not_applied",
    });
    await act(async () => {
      expect(await undo.result.current.retry("node", node.id)).toBe(true);
    });
    expect(acquire).toHaveBeenCalledTimes(2);
    expect(dispatchUndo).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["active owner", { locked: true, placementOpen: false, dirty: false }],
    ["open placement", { locked: false, placementOpen: true, dirty: false }],
    ["dirty Edit intent", { locked: false, placementOpen: false, dirty: true }],
  ] as const)("rejects %s before dispatch without queue or replay", async (_label, blocker) => {
    const node = createNode("node-blocked", 10, 20);
    node.createdAt = 100;
    node.mtime = 100;
    const placed = renderHook(() => useTriageNewlyPlaced());
    act(() => {
      placed.result.current.registerPlacement({
        result: node,
        command: command(node.id, "node", 1),
        sourceSnapshot: source(1),
        candidateSnapshot: null,
      });
    });
    const acquire = vi.fn(() => !blocker.locked);
    const dispatchUndo = vi.fn();
    const undo = renderHook(() => useTriageNewlyPlacedUndo({
      entries: placed.result.current.entries,
      operationLock: {
        activeOperation: blocker.locked ? { kind: "edit", operationId: "edit-1" } : null,
        acquire,
        isLocked: () => blocker.locked,
        release: vi.fn(),
      },
      placementOpen: blocker.placementOpen,
      hasDirtyEdit: () => blocker.dirty,
      createId: () => "blocked-undo",
      observeTruth: (_entries, publish) => {
        publish(new Map([["node:node-blocked", {
          operationId: "truth-probe",
          status: "not_applied",
          result: node,
          source: { ...source(1), consumedAt: 100, version: 2 },
          candidate: null,
        }]]));
        return () => undefined;
      },
      dispatchUndo,
      reconcileUndo: vi.fn(),
    }));

    await waitFor(() => expect(undo.result.current.getState("node", node.id).phase).toBe("blocked"));
    await act(async () => {
      expect(await undo.result.current.activate("node", node.id)).toBe(false);
    });
    expect(dispatchUndo).not.toHaveBeenCalled();
    expect(acquire).toHaveBeenCalledTimes(blocker.locked ? 0 : 0);
  });
});

describe("useTriageNewlyPlacedUndo — Archive exclusion", () => {
  it("keeps Undo blocked for an Archive owner without dispatch or queued replay", async () => {
    const dispatchUndo = vi.fn();
    const operationLock: TriageOperationLock = {
      activeOperation: { kind: "archive", operationId: "archive-1" },
      isLocked: () => true,
      acquire: vi.fn(() => false),
      release: vi.fn(() => false),
    };
    const placed = createNode("node-archive-blocked", 10, 20);
    const provenance = {
      operationId: "operation-1",
      resultId: placed.id,
      resultType: "node" as const,
      resultVersion: placed.version,
      resultSnapshot: placed,
      source: {
        scratchBitId: "scratch-1",
        breakdownId: "source-1",
        expectedVersion: 1,
        snapshot: source(1),
      },
      candidate: null,
      destination: { parentId: null, pathIds: [], x: 10, y: 20 },
      completedOrder: 1,
    };
    const { result } = renderHook(() =>
      useTriageNewlyPlacedUndo({
        entries: [provenance],
        operationLock,
        placementOpen: false,
        hasDirtyEdit: () => false,
        dispatchUndo,
        reconcileUndo: vi.fn(),
        observeTruth: (_entries, emit) => {
          emit(new Map([["node:node-archive-blocked", {
            operationId: "truth-probe",
            status: "conflict",
            result: placed,
            source: source(1),
            candidate: null,
          }]]));
          return () => undefined;
        },
      }),
    );

    await waitFor(() =>
      expect(result.current.getState("node", placed.id)).toMatchObject({
        phase: "blocked",
        reason: "active-owner",
      }),
    );
    await act(async () => {
      await expect(result.current.activate("node", placed.id)).resolves.toBe(false);
    });
    expect(dispatchUndo).not.toHaveBeenCalled();
    expect(operationLock.acquire).not.toHaveBeenCalled();
  });
});

describe("useTriageNewlyPlacedUndo — inactive owning Scratch", () => {
  function provenanceFor(id: string) {
    const placed = createNode(id, 10, 20);
    return {
      placed,
      provenance: {
        operationId: `operation-${id}`,
        resultId: placed.id,
        resultType: "node" as const,
        resultVersion: placed.version,
        resultSnapshot: placed,
        source: {
          scratchBitId: "scratch-1",
          breakdownId: "source-1",
          expectedVersion: 1,
          snapshot: source(1),
        },
        candidate: null,
        destination: { parentId: null, pathIds: [], x: 10, y: 20 },
        completedOrder: 1,
      },
    };
  }

  const unlocked: TriageOperationLock = {
    activeOperation: null,
    isLocked: () => false,
    acquire: vi.fn(() => true),
    release: vi.fn(() => true),
  };

  function renderUndo(
    id: string,
    truthStatus: PlacementUndoResult["status"],
    owner: "active" | "trashed" | "archived" | undefined,
    dispatchUndo = vi.fn(),
  ) {
    const { placed, provenance } = provenanceFor(id);
    const hook = renderHook(() =>
      useTriageNewlyPlacedUndo({
        entries: [provenance],
        operationLock: unlocked,
        placementOpen: false,
        hasDirtyEdit: () => false,
        dispatchUndo,
        reconcileUndo: vi.fn(),
        observeTruth: (_entries, emit) => {
          emit(
            new Map([[`node:${id}`, {
              operationId: "truth-probe",
              status: truthStatus,
              result: placed,
              source: source(1),
              candidate: null,
            }]]),
            owner === undefined ? undefined : new Map([["scratch-1", owner]]),
          );
          return () => undefined;
        },
      }),
    );
    return { hook, placed, dispatchUndo };
  }

  it.each([
    ["trashed", "trashed"],
    ["archived", "archived"],
  ] as const)(
    "shows a distinct %s reason without a click, with owner-inactive taking precedence over invalid-provenance",
    async (owner, reason) => {
      const { hook, placed, dispatchUndo } = renderUndo(`node-${owner}`, "rejected", owner);

      await waitFor(() =>
        expect(hook.result.current.getState("node", placed.id)).toMatchObject({
          phase: "blocked",
          reason,
        }),
      );
      await act(async () => {
        await expect(hook.result.current.activate("node", placed.id)).resolves.toBe(false);
      });
      expect(dispatchUndo).not.toHaveBeenCalled();
    },
  );

  it("an inactive owner also outranks a conflict reason such as dependencies", async () => {
    const { hook, placed } = renderUndo("node-conflict-owner", "conflict", "trashed");
    await waitFor(() =>
      expect(hook.result.current.getState("node", placed.id).reason).toBe("trashed"),
    );
  });

  it("keeps invalid-provenance for a rejected result whose owner is active or unknown", async () => {
    const active = renderUndo("node-active-owner", "rejected", "active");
    await waitFor(() =>
      expect(active.hook.result.current.getState("node", active.placed.id).reason).toBe(
        "invalid-provenance",
      ),
    );
    const unknown = renderUndo("node-unknown-owner", "rejected", undefined);
    await waitFor(() =>
      expect(unknown.hook.result.current.getState("node", unknown.placed.id).reason).toBe(
        "invalid-provenance",
      ),
    );
  });

  it("a completed Undo stays already-undone even after its owner is trashed", async () => {
    const { hook, placed } = renderUndo("node-done", "already_applied", "trashed");
    await waitFor(() =>
      expect(hook.result.current.getState("node", placed.id).reason).toBe("already-undone"),
    );
  });
});
