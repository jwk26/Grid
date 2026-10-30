import { closestCenter, pointerWithin, type CollisionDetection } from "@dnd-kit/core";
import { useBreadcrumbZoneStore } from "@/stores/breadcrumb-zone-store";

export type GridDropData =
  | {
      kind: "grid-cell";
      parentId: string | null;
      x: number;
      y: number;
    }
  | {
      kind: "grid-node-drop";
      targetNodeId: string;
      targetNodeTitle?: string;
    }
  | {
      kind: "grid-breadcrumb-drop";
      targetNodeId: string | null;
      targetNodeTitle?: string;
    }
  | {
      kind: "grid-delete-drop";
    };

export type TriageDropData =
  | { kind: "triage-node-zone-drop" }
  | { kind: "triage-bit-zone-drop" }
  | { kind: "triage-remove-drop" }
  | {
      kind: "triage-hierarchy-drop";
      dropId: string;
      parentNodeId: string | null;
      targetNodeLevel: number | null;
      targetTitle: string;
      targetParentPath: string[];
    };

export function isTriageDropData(value: unknown): value is TriageDropData {
  if (typeof value !== "object" || value === null || !("kind" in value)) {
    return false;
  }

  return (
    value.kind === "triage-node-zone-drop" ||
    value.kind === "triage-bit-zone-drop" ||
    value.kind === "triage-remove-drop" ||
    value.kind === "triage-hierarchy-drop"
  );
}

export function getTriageNodeZoneDropId(): string {
  return "triage-node-zone-drop";
}

export function getTriageBitZoneDropId(): string {
  return "triage-bit-zone-drop";
}

export function getTriageRemoveDropId(): string {
  return "triage-remove-drop";
}

export function getTriageHierarchyDropId(targetId: string): string {
  return `triage-hierarchy:${targetId}`;
}

export function isGridDropData(value: unknown): value is GridDropData {
  if (typeof value !== "object" || value === null || !("kind" in value)) {
    return false;
  }

  return (
    (value.kind === "grid-cell" &&
      "parentId" in value &&
      (typeof value.parentId === "string" || value.parentId === null) &&
      "x" in value &&
      typeof value.x === "number" &&
      "y" in value &&
      typeof value.y === "number") ||
    (value.kind === "grid-node-drop" &&
      "targetNodeId" in value &&
      typeof value.targetNodeId === "string") ||
    (value.kind === "grid-breadcrumb-drop" &&
      "targetNodeId" in value &&
      (typeof value.targetNodeId === "string" || value.targetNodeId === null)) ||
    value.kind === "grid-delete-drop"
  );
}

export function getGridCellDropId(parentId: string | null, x: number, y: number): string {
  return `grid-cell:${parentId ?? "root"}:${x}:${y}`;
}

export function getGridNodeDropId(nodeId: string): string {
  return `grid-node-drop:${nodeId}`;
}

export const GRID_BREADCRUMB_DROP_PREFIX = "grid-breadcrumb:";

export function isGridBreadcrumbDropId(id: unknown): boolean {
  return typeof id === "string" && id.startsWith(GRID_BREADCRUMB_DROP_PREFIX);
}

export function getGridBreadcrumbDropId(nodeId: string | null): string {
  return `${GRID_BREADCRUMB_DROP_PREFIX}${nodeId ?? "root"}`;
}

export function getGridDeleteDropId(): string {
  return "grid-delete-drop";
}

export const gridCollisionDetection: CollisionDetection = (args) => {
  const blockedCells = useBreadcrumbZoneStore.getState().blockedCells;
  const pointerCandidates = pointerWithin(args).filter(
    (candidate) =>
      typeof candidate.id === "string" &&
      (candidate.id.startsWith("grid-node-drop:") ||
        candidate.id.startsWith("grid-breadcrumb:") ||
        candidate.id === "grid-delete-drop"),
  );

  if (pointerCandidates.length > 0) {
    return pointerCandidates;
  }

  return closestCenter(args).filter((candidate) => {
    if (typeof candidate.id !== "string") return false;
    if (!candidate.id.startsWith("grid-cell:")) return false;

    const parts = candidate.id.split(":");
    const x = parseInt(parts[parts.length - 2], 10);
    const y = parseInt(parts[parts.length - 1], 10);

    if (Number.isNaN(x) || Number.isNaN(y)) return true;

    return !blockedCells.has(`${x},${y}`);
  });
};

export const triageCollisionDetection: CollisionDetection = (args) =>
  pointerWithin(args).filter(
    (candidate) =>
      candidate.id === getTriageNodeZoneDropId() ||
      candidate.id === getTriageBitZoneDropId() ||
      candidate.id === getTriageRemoveDropId() ||
      (typeof candidate.id === "string" &&
        candidate.id.startsWith("triage-hierarchy:")),
  );
