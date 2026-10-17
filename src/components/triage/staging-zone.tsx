"use client";

import { useEffect, type ReactNode } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { FileText, Folder, X } from "lucide-react";
import {
  invalidateTriageDragSource,
  type TriageDragItem,
} from "@/hooks/use-dnd";
import {
  useStagedCandidates,
  type CandidateIntegrityProjection,
  type CandidateOperationProjection,
  type StagedCandidateProjection,
} from "@/hooks/use-staged-candidates";
import { useTriageOperationLockContext } from "@/hooks/use-triage-operation-lock";
import {
  getTriageBitZoneDropId,
  getTriageNodeZoneDropId,
  type TriageDropData,
} from "@/lib/grid-dnd";
import { cn } from "@/lib/utils";
import { INBOX_TRIAGE_COPY } from "@/lib/copy/inbox-triage";
import { useTriageStore } from "@/stores/triage-store";

export type StagingOperationView = Omit<
  CandidateOperationProjection,
  "kind" | "resultType"
> &
  Readonly<{
    kind: "stage" | "unstage";
    resultType: StagedCandidateProjection["resultType"];
    title: string;
  }>;

export type StagingZoneProjection = Readonly<{
  candidates: StagedCandidateProjection[];
  integrityCandidates: CandidateIntegrityProjection[];
  operations: StagingOperationView[];
}>;

interface StagingZoneProps {
  type: StagedCandidateProjection["resultType"];
  activeDragItem?: TriageDragItem;
  overTargetId?: string | null;
  projection?: StagingZoneProjection;
  newCandidateIds?: ReadonlySet<string>;
  onObservedTop?: () => void;
}

type DropZoneState =
  | "default"
  | "idle-valid"
  | "idle-invalid"
  | "valid"
  | "invalid";

const DROP_ZONE_BASE_CLASS =
  "h-full min-h-0 max-h-full w-full overflow-y-auto rounded-lg border border-transparent [contain:size] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden transition-[background-color,border-color,box-shadow,color] motion-reduce:transition-none";

const DROP_ZONE_STATE_CLASSES: Record<DropZoneState, string> = {
  default: "",
  "idle-valid": "border-dashed border-muted",
  "idle-invalid": "",
  valid: "border-solid border-primary bg-accent ring-1 ring-primary",
  invalid:
    "border-solid border-muted bg-muted/10 text-muted-foreground/50 cursor-not-allowed [&_*]:!text-muted-foreground/50",
};

export function StagingAlertBand({
  copy,
  onDismiss,
}: {
  copy: string;
  onDismiss: () => void;
}) {
  return (
    <div
      className="staging-local-alert"
      data-triage-role="staging-local-alert"
    >
      <span>{copy}</span>
      <button
        aria-label={INBOX_TRIAGE_COPY.stagingStatus.actions.dismissAlert}
        className="staging-alert-action"
        type="button"
        onClick={onDismiss}
      >
        <X aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function getDropZoneState({
  activeDragItem,
  isOver,
  isValidTarget,
}: {
  activeDragItem: TriageDragItem;
  isOver: boolean;
  isValidTarget: boolean;
}): DropZoneState {
  const isDragActive = activeDragItem !== null;

  if (!isDragActive) return "default";
  if (activeDragItem.integrity === "invalidated") return isOver ? "invalid" : "idle-invalid";
  if (isOver && isValidTarget) return "valid";
  if (isOver && !isValidTarget) return "invalid";
  if (isValidTarget) return "idle-valid";
  return "idle-invalid";
}

function getPresentationState(item: TriageDragItem, type: "node" | "bit", state: DropZoneState) {
  if (item?.integrity === "invalidated") return state;
  if (item?.kind === `triage-staged-${type}`) return "neutral";
  if (item?.kind === "triage-staged-node" || item?.kind === "triage-staged-bit") return "unavailable";
  return state;
}

// The Nodes/Bits drop region is the whole subsection (SPEC "Staging subsection drop region"):
// heading row plus well. The subsection registers the droppable; the well only scrolls.
// It must render inside the DndContext, so it is a component rather than a hook in the owner.
export function StagingSubsection({
  activeDragItem = null,
  children,
  className,
  overTargetId = null,
  type,
}: {
  activeDragItem?: TriageDragItem;
  children: ReactNode;
  className: string;
  overTargetId?: string | null;
  type: StagedCandidateProjection["resultType"];
}) {
  const dropId = type === "node" ? getTriageNodeZoneDropId() : getTriageBitZoneDropId();
  const { setNodeRef } = useDroppable({
    id: dropId,
    data: {
      kind: type === "node" ? "triage-node-zone-drop" : "triage-bit-zone-drop",
    } as TriageDropData,
  });
  const state = getDropZoneState({
    activeDragItem,
    isOver: overTargetId === dropId,
    isValidTarget:
      activeDragItem?.kind === "triage-breakdown" ||
      activeDragItem?.kind === `triage-staged-${type}`,
  });
  return (
    <div
      ref={setNodeRef}
      className={className}
      data-triage-hover={activeDragItem !== null && overTargetId === dropId}
      data-triage-role={`staging-${type}-subsection`}
      data-triage-state={getPresentationState(activeDragItem, type, state)}
    >
      {children}
    </div>
  );
}

export function StagingZone({
  type,
  activeDragItem = null,
  overTargetId = null,
  projection,
  newCandidateIds = new Set<string>(),
  onObservedTop,
}: StagingZoneProps) {
  const operationLock = useTriageOperationLockContext();
  if (projection === undefined) {
    return (
      <LocalStagingZone
        activeDragItem={activeDragItem}
        newCandidateIds={newCandidateIds}
        overTargetId={overTargetId}
        type={type}
        onObservedTop={onObservedTop}
      />
    );
  }
  return (
    <StagingZoneContent
      activeDragItem={activeDragItem}
      isInteractionLocked={operationLock.activeOperation !== null}
      newCandidateIds={newCandidateIds}
      overTargetId={overTargetId}
      projection={projection}
      type={type}
      onObservedTop={onObservedTop}
    />
  );
}

function LocalStagingZone(props: Omit<StagingZoneProps, "projection">) {
  const selectedScratchId = useTriageStore((state) => state.selectedScratchId);
  const localProjection = useStagedCandidates(selectedScratchId);
  return (
    <StagingZone
      {...props}
      projection={{
        candidates: localProjection.candidates ?? [],
        integrityCandidates: localProjection.integrityCandidates ?? [],
        operations: [],
      }}
    />
  );
}

function StagingZoneContent({
  activeDragItem = null,
  isInteractionLocked,
  newCandidateIds = new Set<string>(),
  onObservedTop,
  overTargetId = null,
  projection,
  type,
}: StagingZoneProps & {
  isInteractionLocked: boolean;
  projection: StagingZoneProjection;
}) {
  const stagedCandidates = projection.candidates;
  const integrityCandidates = projection.integrityCandidates;
  const operations = projection.operations;
  const candidates = stagedCandidates
    .filter((candidate) => candidate.resultType === type)
    .toSorted((left, right) => {
      const createdAtDifference = right.createdAt - left.createdAt;
      return createdAtDifference !== 0
        ? createdAtDifference
        : left.id.localeCompare(right.id);
    });

  if (type === "node") {
    return (
      <NodeStagingZone
        activeDragItem={activeDragItem}
        candidates={candidates}
        integrityCandidates={integrityCandidates.filter(
          ({ candidate }) => candidate.resultType === "node",
        )}
        isInteractionLocked={isInteractionLocked}
        newCandidateIds={newCandidateIds}
        onObservedTop={onObservedTop}
        operations={operations.filter(({ resultType }) => resultType === "node")}
        overTargetId={overTargetId}
      />
    );
  }

  return (
    <BitStagingZone
      activeDragItem={activeDragItem}
      candidates={candidates}
      integrityCandidates={integrityCandidates.filter(
        ({ candidate }) => candidate.resultType === "bit",
      )}
      isInteractionLocked={isInteractionLocked}
      newCandidateIds={newCandidateIds}
      onObservedTop={onObservedTop}
      operations={operations.filter(({ resultType }) => resultType === "bit")}
      overTargetId={overTargetId}
    />
  );
}

function NodeStagingZone({
  activeDragItem,
  candidates,
  integrityCandidates,
  isInteractionLocked,
  newCandidateIds,
  onObservedTop,
  operations,
  overTargetId,
}: {
  activeDragItem: TriageDragItem;
  candidates: StagedCandidateProjection[];
  integrityCandidates: CandidateIntegrityProjection[];
  isInteractionLocked: boolean;
  newCandidateIds: ReadonlySet<string>;
  onObservedTop?: () => void;
  operations: StagingOperationView[];
  overTargetId: string | null;
}) {
  const dropId = getTriageNodeZoneDropId();
  const state = getDropZoneState({
    activeDragItem,
    isOver: overTargetId === dropId,
    isValidTarget:
      activeDragItem?.kind === "triage-breakdown" ||
      activeDragItem?.kind === "triage-staged-node",
  });

  return (
    <div
      aria-label="Node staging zone"
      className={cn("triage-staging__well", DROP_ZONE_BASE_CLASS, DROP_ZONE_STATE_CLASSES[state])}
      data-empty={candidates.length === 0}
      data-testid="node-staging-zone"
      data-triage-role="staging-node-well"
      data-triage-hover={activeDragItem !== null && overTargetId === dropId}
      data-triage-state={getPresentationState(activeDragItem, "node", state)}
      onScroll={(event) => {
        if (event.currentTarget.scrollTop === 0) onObservedTop?.();
      }}
    >
      {candidates.length > 0 || operations.length > 0 || integrityCandidates.length > 0 ? (
        <div className="grid w-full grid-cols-2 gap-2 pb-1">
          {candidates.map((candidate) => (
            <NodeCandidateCard
              key={candidate.id}
              candidate={candidate}
              disabled={isInteractionLocked}
              isNew={newCandidateIds.has(candidate.id)}
              operation={operations.find(
                ({ candidateId }) => candidateId === candidate.id,
              )}
            />
          ))}
          {operations
            .filter(
              ({ kind, candidateId }) =>
                kind === "stage" &&
                !candidates.some((candidate) => candidate.id === candidateId),
            )
            .map((operation) => (
              <NodeStatusCard key={operation.operationId} operation={operation} />
            ))}
          {integrityCandidates.map(({ candidate }) => (
            <NodeIntegrityCard key={candidate.id} />
          ))}
        </div>
      ) : null}
      <TargetReason activeDragItem={activeDragItem} overTargetId={overTargetId} type="node" />
    </div>
  );
}

function BitStagingZone({
  activeDragItem,
  candidates,
  integrityCandidates,
  isInteractionLocked,
  newCandidateIds,
  onObservedTop,
  operations,
  overTargetId,
}: {
  activeDragItem: TriageDragItem;
  candidates: StagedCandidateProjection[];
  integrityCandidates: CandidateIntegrityProjection[];
  isInteractionLocked: boolean;
  newCandidateIds: ReadonlySet<string>;
  onObservedTop?: () => void;
  operations: StagingOperationView[];
  overTargetId: string | null;
}) {
  const dropId = getTriageBitZoneDropId();
  const state = getDropZoneState({
    activeDragItem,
    isOver: overTargetId === dropId,
    isValidTarget:
      activeDragItem?.kind === "triage-breakdown" ||
      activeDragItem?.kind === "triage-staged-bit",
  });

  return (
    <div
      aria-label="Bit staging zone"
      className={cn("triage-staging__well", DROP_ZONE_BASE_CLASS, DROP_ZONE_STATE_CLASSES[state])}
      data-empty={candidates.length === 0}
      data-testid="bit-staging-zone"
      data-triage-role="staging-bit-well"
      data-triage-hover={activeDragItem !== null && overTargetId === dropId}
      data-triage-state={getPresentationState(activeDragItem, "bit", state)}
      onScroll={(event) => {
        if (event.currentTarget.scrollTop === 0) onObservedTop?.();
      }}
    >
      {candidates.length > 0 || operations.length > 0 || integrityCandidates.length > 0 ? (
        <div className="flex w-full flex-col gap-1.5 pb-1">
          {candidates.map((candidate) => (
            <BitCandidateRow
              key={candidate.id}
              candidate={candidate}
              disabled={isInteractionLocked}
              isNew={newCandidateIds.has(candidate.id)}
              operation={operations.find(
                ({ candidateId }) => candidateId === candidate.id,
              )}
            />
          ))}
          {operations
            .filter(
              ({ kind, candidateId }) =>
                kind === "stage" &&
                !candidates.some((candidate) => candidate.id === candidateId),
            )
            .map((operation) => (
              <BitStatusRow key={operation.operationId} operation={operation} />
            ))}
          {integrityCandidates.map(({ candidate }) => (
            <BitIntegrityRow key={candidate.id} />
          ))}
        </div>
      ) : null}
      <TargetReason activeDragItem={activeDragItem} overTargetId={overTargetId} type="bit" />
    </div>
  );
}

function NodeCandidateCard({
  candidate,
  disabled,
  isNew,
  operation,
}: {
  candidate: StagedCandidateProjection;
  disabled: boolean;
  isNew: boolean;
  operation?: StagingOperationView;
}) {
  const { attributes, isDragging, listeners, setNodeRef } = useDraggable({
    id: `triage-staged-node:${candidate.id}`,
    disabled,
    data: {
      kind: "triage-staged-node",
      id: candidate.id,
      label: candidate.content,
      scratchId: candidate.scratchBitId,
      sourceBreakdownId: candidate.sourceBreakdownId,
      sourceVersion: candidate.source.version,
      sourceLifecycle: "active",
      candidateVersion: candidate.version,
      candidateLifecycle: candidate.lifecycle,
      resultType: candidate.resultType,
    },
  });
  useEffect(
    () => () =>
      invalidateTriageDragSource({
        kind: "triage-staged-node",
        id: candidate.id,
        label: candidate.content,
        scratchId: candidate.scratchBitId,
        sourceBreakdownId: candidate.sourceBreakdownId,
        sourceVersion: candidate.source.version,
        sourceLifecycle: "active",
        candidateVersion: candidate.version,
        candidateLifecycle: candidate.lifecycle,
        resultType: candidate.resultType,
      }),
    [
      candidate.content,
      candidate.id,
      candidate.lifecycle,
      candidate.resultType,
      candidate.scratchBitId,
      candidate.source.version,
      candidate.sourceBreakdownId,
      candidate.version,
    ],
  );

  return (
    <div
      ref={setNodeRef}
      aria-label={`Drag ${candidate.content} staged node`}
      data-operation-locked={disabled}
      className={cn(
        "triage-staging__node mx-auto aspect-square h-auto w-full max-w-[80px] touch-none cursor-grab select-none overflow-hidden rounded-lg border border-border/80 bg-background transition-[background-color,border-color,color,opacity] active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
        isDragging && "opacity-30 border-dashed border-muted bg-transparent",
      )}
      data-candidate-version={candidate.version}
      data-candidate-id={candidate.id}
      data-new-candidate={isNew || undefined}
      data-source-version={candidate.source.version}
      data-testid="node-candidate-card"
      data-triage-drag-source="staged-root"
      data-triage-role="staging-node-card"
      data-triage-state={operation?.phase ?? "staged"}
      {...attributes}
      {...listeners}
    >
      <div className="triage-staging__node-content flex h-full w-full flex-col items-center justify-center p-2">
        <Folder
          aria-hidden="true"
          className={cn(
            "h-6 w-6 flex-shrink-0 text-muted-foreground transition-colors",
            isDragging && "text-muted-foreground",
          )}
        />
        <div
          className={cn(
            "triage-staging__node-label mt-auto w-full truncate px-1 pb-1 text-center text-[10px] font-semibold transition-colors",
            isDragging ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {candidate.content}
        </div>
        {operation ? <OperationStatus operation={operation} /> : null}
      </div>
    </div>
  );
}

function BitCandidateRow({
  candidate,
  disabled,
  isNew,
  operation,
}: {
  candidate: StagedCandidateProjection;
  disabled: boolean;
  isNew: boolean;
  operation?: StagingOperationView;
}) {
  const { attributes, isDragging, listeners, setNodeRef } = useDraggable({
    id: `triage-staged-bit:${candidate.id}`,
    disabled,
    data: {
      kind: "triage-staged-bit",
      id: candidate.id,
      label: candidate.content,
      scratchId: candidate.scratchBitId,
      sourceBreakdownId: candidate.sourceBreakdownId,
      sourceVersion: candidate.source.version,
      sourceLifecycle: "active",
      candidateVersion: candidate.version,
      candidateLifecycle: candidate.lifecycle,
      resultType: candidate.resultType,
    },
  });
  useEffect(
    () => () =>
      invalidateTriageDragSource({
        kind: "triage-staged-bit",
        id: candidate.id,
        label: candidate.content,
        scratchId: candidate.scratchBitId,
        sourceBreakdownId: candidate.sourceBreakdownId,
        sourceVersion: candidate.source.version,
        sourceLifecycle: "active",
        candidateVersion: candidate.version,
        candidateLifecycle: candidate.lifecycle,
        resultType: candidate.resultType,
      }),
    [
      candidate.content,
      candidate.id,
      candidate.lifecycle,
      candidate.resultType,
      candidate.scratchBitId,
      candidate.source.version,
      candidate.sourceBreakdownId,
      candidate.version,
    ],
  );

  return (
    <div
      ref={setNodeRef}
      aria-label={`Drag ${candidate.content} staged bit`}
      data-operation-locked={disabled}
      className={cn(
        "triage-staging__bit flex min-h-[2rem] w-full touch-none cursor-grab select-none items-center rounded-lg border border-border/60 bg-background px-3 py-1.5 transition-[background-color,border-color,color,opacity] active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
        isDragging && "opacity-30 border-dashed border-muted bg-transparent",
      )}
      data-candidate-version={candidate.version}
      data-candidate-id={candidate.id}
      data-new-candidate={isNew || undefined}
      data-source-version={candidate.source.version}
      data-testid="bit-candidate-row"
      data-triage-drag-source="staged-root"
      data-triage-role="staging-bit-row"
      data-triage-state={operation?.phase ?? "staged"}
      {...attributes}
      {...listeners}
    >
      <FileText aria-hidden="true" className="triage-staging__bit-icon" />
      <div
        className={cn(
          "min-w-0 flex-1 truncate text-left text-xs font-medium transition-colors",
          isDragging ? "text-muted-foreground" : "text-foreground",
        )}
      >
        {candidate.content}
      </div>
      {operation ? <OperationStatus operation={operation} /> : null}
    </div>
  );
}

function operationCopy(operation: StagingOperationView): string {
  const key = `${operation.kind}${
    operation.phase === "pending"
      ? "Pending"
      : operation.phase === "unknown"
        ? "Unknown"
        : "Reconciling"
  }` as keyof typeof INBOX_TRIAGE_COPY.stagingStatus.operation;
  return INBOX_TRIAGE_COPY.stagingStatus.operation[key].replace(
    "{title}",
    operation.title,
  );
}

function OperationStatus({ operation }: { operation: StagingOperationView }) {
  return (
    <div
      className="staging-operation-status"
      data-triage-role="staging-operation-status"
      data-triage-state={operation.phase}
    >
      {operationCopy(operation)}
    </div>
  );
}

function NodeStatusCard({ operation }: { operation: StagingOperationView }) {
  return (
    <div
      className="staging-node-status-card"
      data-testid="node-operation-card"
      data-triage-role="staging-node-card"
      data-triage-state={operation.phase}
    >
      <Folder aria-hidden="true" className="h-6 w-6" />
      <OperationStatus operation={operation} />
    </div>
  );
}

function BitStatusRow({ operation }: { operation: StagingOperationView }) {
  return (
    <div className="staging-bit-status-row" data-testid="bit-operation-row" data-triage-role="staging-bit-row" data-triage-state={operation.phase}>
      <FileText aria-hidden="true" className="triage-staging__bit-icon" />
      <OperationStatus operation={operation} />
    </div>
  );
}

function NodeIntegrityCard() {
  return (
    <div className="staging-node-status-card" data-testid="node-integrity-card" data-triage-role="staging-node-card">
      <Folder aria-hidden="true" className="h-6 w-6" />
      <div data-triage-role="staging-integrity-status" data-triage-state="source-unresolved">
        {INBOX_TRIAGE_COPY.stagingStatus.integrity.node}
      </div>
    </div>
  );
}

function BitIntegrityRow() {
  return (
    <div className="staging-bit-status-row" data-testid="bit-integrity-row" data-triage-role="staging-bit-row">
      <FileText aria-hidden="true" className="triage-staging__bit-icon" />
      <div data-triage-role="staging-integrity-status" data-triage-state="source-unresolved">
        {INBOX_TRIAGE_COPY.stagingStatus.integrity.bit}
      </div>
    </div>
  );
}

function TargetReason({
  activeDragItem,
  overTargetId,
  type,
}: {
  activeDragItem: TriageDragItem;
  overTargetId: string | null;
  type: "node" | "bit";
}) {
  const dropId = type === "node" ? getTriageNodeZoneDropId() : getTriageBitZoneDropId();
  if (activeDragItem === null || overTargetId !== dropId) return null;
  const copy =
    activeDragItem.integrity === "invalidated"
      ? INBOX_TRIAGE_COPY.stagingStatus.target.unavailable
      : activeDragItem.kind === `triage-staged-${type}`
        ? type === "node"
          ? INBOX_TRIAGE_COPY.stagingStatus.target.nodeSameType
          : INBOX_TRIAGE_COPY.stagingStatus.target.bitSameType
        : activeDragItem.kind === "triage-staged-node" ||
            activeDragItem.kind === "triage-staged-bit"
          ? INBOX_TRIAGE_COPY.stagingStatus.target.oppositeType
          : null;
  return copy ? (
    <div className="staging-target-reason" data-triage-role="staging-target-reason">
      {copy}
    </div>
  ) : null;
}
