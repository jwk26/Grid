import { closestCenter, pointerWithin, type CollisionDetection } from "@dnd-kit/core";

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
  const pointerCandidates = pointerWithin(args).filter(
    (candidate) =>
      typeof candidate.id === "string" &&
      (candidate.id.startsWith("grid-node-drop:") ||
        isGridBreadcrumbDropId(candidate.id) ||
        candidate.id === "grid-delete-drop"),
  );

  if (pointerCandidates.length > 0) {
    // A Node card can sit under a breadcrumb segment, and pointerWithin orders
    // by corner distance: the visible segment must win over the card below it.
    return [
      ...pointerCandidates.filter((candidate) => isGridBreadcrumbDropId(candidate.id)),
      ...pointerCandidates.filter((candidate) => !isGridBreadcrumbDropId(candidate.id)),
    ];
  }

  return closestCenter(args).filter(
    (candidate) =>
      typeof candidate.id === "string" && candidate.id.startsWith("grid-cell:"),
  );
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
