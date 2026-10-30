"use client";

import { useEffect, useState, type ReactNode } from "react";
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
import {
  StatusIcon,
  statusEmphasisProps,
  useStatusPresentation,
  type StatusPresentation,
} from "@/components/feedback/status-icon";
import { StatusTooltip } from "@/components/feedback/status-tooltip";
import {
  forcedItemKeys,
  useForcedItemStatus,
  type ForcedItemStatus,
} from "@/lib/feedback/forced-item-status";
import type { ItemStatus } from "@/lib/feedback/item-status";
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

type UnstageFailures = NonNullable<StagingZoneProjection["unstageFailures"]>;
const NO_UNSTAGE_FAILURES: UnstageFailures = new Map();

export type StagingZoneProjection = Readonly<{
  candidates: StagedCandidateProjection[];
  integrityCandidates: CandidateIntegrityProjection[];
  operations: StagingOperationView[];
  /** Candidates whose last Unstage ended without moving them, with the sentence for each. */
  unstageFailures?: ReadonlyMap<string, Readonly<{ copy: string }>>;
}>;

interface StagingZoneProps {
  type: StagedCandidateProjection["resultType"];
  activeDragItem?: TriageDragItem;
  overTargetId?: string | null;
  projection?: StagingZoneProjection;
  newCandidateIds?: ReadonlySet<string>;
  onObservedTop?: () => void;
  /** Runs one read-only check of a held unknown command; never a resend (Phase 50 mi-1). */
  onCheckAgain?: (operationId: string) => void;
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
  onCheckAgain,
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
      onCheckAgain={onCheckAgain}
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
  onCheckAgain,
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
  const unstageFailures = projection.unstageFailures ?? NO_UNSTAGE_FAILURES;
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
        onCheckAgain={onCheckAgain}
        onObservedTop={onObservedTop}
        operations={operations.filter(({ resultType }) => resultType === "node")}
        overTargetId={overTargetId}
        unstageFailures={unstageFailures}
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
      onCheckAgain={onCheckAgain}
      onObservedTop={onObservedTop}
      operations={operations.filter(({ resultType }) => resultType === "bit")}
      overTargetId={overTargetId}
      unstageFailures={unstageFailures}
    />
  );
}

function NodeStagingZone({
  activeDragItem,
  candidates,
  integrityCandidates,
  isInteractionLocked,
  newCandidateIds,
  onCheckAgain,
  onObservedTop,
  operations,
  overTargetId,
  unstageFailures,
}: {
  activeDragItem: TriageDragItem;
  candidates: StagedCandidateProjection[];
  integrityCandidates: CandidateIntegrityProjection[];
  isInteractionLocked: boolean;
  newCandidateIds: ReadonlySet<string>;
  onCheckAgain?: (operationId: string) => void;
  onObservedTop?: () => void;
  operations: StagingOperationView[];
  overTargetId: string | null;
  unstageFailures: UnstageFailures;
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
        <div className="staging-node-grid">
          {stageProjections(operations, candidates).map((operation) => (
            <NodeStatusCard
              key={operation.operationId}
              operation={operation}
              onCheckAgain={onCheckAgain}
            />
          ))}
          {candidates.map((candidate) => {
            const operation = operations.find(
              ({ candidateId }) => candidateId === candidate.id,
            );
            return (
              <NodeCandidateCard
                key={candidate.id}
                candidate={candidate}
                disabled={isInteractionLocked || operation?.held === true}
                failure={unstageFailures.get(candidate.id)}
                isNew={newCandidateIds.has(candidate.id)}
                onCheckAgain={onCheckAgain}
                operation={operation}
              />
            );
          })}
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
  onCheckAgain,
  onObservedTop,
  operations,
  overTargetId,
  unstageFailures,
}: {
  activeDragItem: TriageDragItem;
  candidates: StagedCandidateProjection[];
  integrityCandidates: CandidateIntegrityProjection[];
  isInteractionLocked: boolean;
  newCandidateIds: ReadonlySet<string>;
  onCheckAgain?: (operationId: string) => void;
  onObservedTop?: () => void;
  operations: StagingOperationView[];
  overTargetId: string | null;
  unstageFailures: UnstageFailures;
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
          {stageProjections(operations, candidates).map((operation) => (
            <BitStatusRow
              key={operation.operationId}
              operation={operation}
              onCheckAgain={onCheckAgain}
            />
          ))}
          {candidates.map((candidate) => {
            const operation = operations.find(
              ({ candidateId }) => candidateId === candidate.id,
            );
            return (
              <BitCandidateRow
                key={candidate.id}
                candidate={candidate}
                disabled={isInteractionLocked || operation?.held === true}
                failure={unstageFailures.get(candidate.id)}
                isNew={newCandidateIds.has(candidate.id)}
                onCheckAgain={onCheckAgain}
                operation={operation}
              />
            );
          })}
          {integrityCandidates.map(({ candidate }) => (
            <BitIntegrityRow key={candidate.id} />
          ))}
        </div>
      ) : null}
      <TargetReason activeDragItem={activeDragItem} overTargetId={overTargetId} type="bit" />
    </div>
  );
}

// The durable candidate's layout, shared with its Stage projection so the swap
// from projection to card changes no size, shape or content.
const NODE_CARD_CLASS =
  "triage-staging__node relative mx-auto aspect-square h-auto w-full max-w-[80px] select-none overflow-hidden rounded-lg border border-border/80 bg-background transition-[background-color,border-color,color,opacity] focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none";
const NODE_CARD_DRAGGABLE_CLASS = "touch-none cursor-grab active:cursor-grabbing";
const BIT_ROW_CLASS =
  "triage-staging__bit flex min-h-[2rem] w-full select-none items-center rounded-lg border border-border/60 bg-background px-3 py-1.5 transition-[background-color,border-color,color,opacity] focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none";
const BIT_ROW_DRAGGABLE_CLASS = "touch-none cursor-grab active:cursor-grabbing";

// What an item's status icon shows and says (feedback F06-F09). Pending shows its loader after
// the display delay; unknown and reconciling show `?`; an Unstage failure or an unresolved source
// shows `!`. The icon sits at the Node card's top-right corner and at a Bit row's end.
type StagingItemState = Readonly<{
  status: ItemStatus;
  /** What the icon says; a problem sentence leads with the full title unless it has it. */
  sentence: string;
  /** Restarts the display delay when a new operation begins. */
  phaseKey: string;
  /** Present on an unknown or reconciling command: its `?` runs the read-only check. */
  checkOperationId?: string;
  /** The hidden slot role: the operation line's or the integrity line's. */
  role: "staging-operation-status" | "staging-integrity-status";
}>;

function leadWithTitle(title: string, sentence: string): string {
  return sentence.includes(title) ? sentence : `“${title}”: ${sentence}`;
}

function operationState(
  operation: StagingOperationView | undefined,
  onCheckAgain: ((operationId: string) => void) | undefined,
): StagingItemState | null {
  if (operation === undefined) return null;
  const checkable =
    onCheckAgain !== undefined &&
    (operation.phase === "unknown" || operation.phase === "reconciling");
  const sentence = operationCopy(operation);
  return {
    status: operation.phase,
    sentence:
      checkable && operation.phase === "unknown"
        ? `${sentence} ${INBOX_TRIAGE_COPY.statusHint.checkAgain}`
        : sentence,
    phaseKey: operation.operationId,
    ...(checkable ? { checkOperationId: operation.operationId } : {}),
    role: "staging-operation-status",
  };
}

// The development state switch forces a state onto a staged candidate (feedback F30); it shows
// the Unstage sentences, since a candidate's own commands are Unstage.
function forcedItemState(
  forced: ForcedItemStatus,
  candidate: StagedCandidateProjection,
): StagingItemState | null {
  if (forced.status === null) return null;
  const copy = INBOX_TRIAGE_COPY.stagingStatus;
  const raw = {
    "delayed-pending": copy.operation.unstagePending,
    reconciling: copy.operation.unstageReconciling,
    unknown: copy.operation.unstageUnknown,
    "not-applied": copy.alert.unstageNotApplied,
    rejected: copy.alert.unstageRejected,
    conflict: copy.alert.unstageConflict,
    integrity: copy.integrity[candidate.resultType],
    "editor-offline": "",
  }[forced.state].replace("{title}", candidate.content);
  return {
    status: forced.status,
    sentence: leadWithTitle(candidate.content, raw),
    phaseKey: `forced:${forced.state}`,
    role: "staging-operation-status",
  };
}

function itemState(
  operation: StagingOperationView | undefined,
  failure: Readonly<{ copy: string }> | undefined,
  title: string,
  onCheckAgain: ((operationId: string) => void) | undefined,
): StagingItemState | null {
  const fromOperation = operationState(operation, onCheckAgain);
  if (fromOperation !== null) return fromOperation;
  if (failure === undefined) return null;
  return {
    status: "problem",
    sentence: leadWithTitle(title, failure.copy),
    phaseKey: failure.copy,
    role: "staging-operation-status",
  };
}

/**
 * The status slot: the icon, with the sentence as tooltip on hover or focus. The icon is
 * focusable where its host is not in the Tab order (a Stage projection, an integrity slot); an
 * unknown command's `?` is a button that runs the read-only check, unavailable while it runs.
 */
function StagingStatusSlot({
  focusable = false,
  onCheckAgain,
  presentation,
  state,
}: {
  focusable?: boolean;
  onCheckAgain?: (operationId: string) => void;
  presentation: StatusPresentation;
  state: StagingItemState | null;
}) {
  // The tooltip's open flag lives in the inner component, which only exists while a glyph shows,
  // so a status that appears later never opens a tooltip latched from an earlier one.
  if (state === null || presentation.glyph === null) return null;
  return (
    <VisibleStagingStatusSlot
      focusable={focusable}
      presentation={presentation}
      state={state}
      onCheckAgain={onCheckAgain}
    />
  );
}

function VisibleStagingStatusSlot({
  focusable,
  onCheckAgain,
  presentation,
  state,
}: {
  focusable: boolean;
  onCheckAgain?: (operationId: string) => void;
  presentation: StatusPresentation;
  state: StagingItemState;
}) {
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const checkOperationId = state.checkOperationId;
  const icon = (
    <StatusIcon
      focusable={focusable && checkOperationId === undefined}
      presentation={presentation}
      sentence={state.sentence}
    />
  );
  return (
    <StatusTooltip
      open={isTooltipOpen}
      sentence={state.sentence}
      onOpenChange={setIsTooltipOpen}
    >
      <span
        className="staging-status-slot"
        data-triage-role={state.role}
        data-triage-state={state.status}
      >
        {checkOperationId === undefined ? (
          icon
        ) : (
          <button
            aria-disabled={state.status === "reconciling" ? "true" : undefined}
            className="staging-status-action"
            data-triage-role="staging-check-again"
            type="button"
            onClick={() => {
              if (state.status === "unknown") onCheckAgain?.(checkOperationId);
            }}
          >
            {icon}
          </button>
        )}
      </span>
    </StatusTooltip>
  );
}

// Stage projections not yet listed render at the top, newest first, where the
// candidate lands under the createdAt DESC sort. Order follows when each command
// was issued, not its phase group.
function stageProjections(
  operations: StagingOperationView[],
  candidates: StagedCandidateProjection[],
): StagingOperationView[] {
  return operations
    .filter(
      ({ kind, candidateId }) =>
        kind === "stage" &&
        !candidates.some((candidate) => candidate.id === candidateId),
    )
    .map((operation, index) => ({ operation, index }))
    .sort(
      (left, right) =>
        (right.operation.sequence ?? 0) - (left.operation.sequence ?? 0) ||
        right.index - left.index,
    )
    .map(({ operation }) => operation);
}

// The card stays dimmed from drag start through its pending (or held-from-pending)
// Unstage, so nothing changes at drop; unknown and reconciling show it undimmed.
function isCandidateDimmed(
  isDragging: boolean,
  operation: StagingOperationView | undefined,
): boolean {
  return (
    isDragging ||
    (operation?.kind === "unstage" && operation.phase === "pending")
  );
}

function NodeCandidateCard({
  candidate,
  disabled,
  failure,
  isNew,
  onCheckAgain,
  operation,
}: {
  candidate: StagedCandidateProjection;
  disabled: boolean;
  failure?: Readonly<{ copy: string }>;
  isNew: boolean;
  onCheckAgain?: (operationId: string) => void;
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

  const isDimmed = isCandidateDimmed(isDragging, operation);
  const forced = useForcedItemStatus(forcedItemKeys.candidate(candidate.id));
  const state =
    forced !== null
      ? forcedItemState(forced, candidate)
      : itemState(operation, failure, candidate.content, onCheckAgain);
  const presentation = useStatusPresentation(state?.status ?? null, state?.phaseKey ?? "");

  return (
    <div
      ref={setNodeRef}
      aria-label={`Drag ${candidate.content} staged node`}
      data-operation-locked={disabled}
      className={cn(
        NODE_CARD_CLASS,
        NODE_CARD_DRAGGABLE_CLASS,
        isDimmed && "border-dashed border-muted/30 bg-transparent",
      )}
      data-candidate-version={candidate.version}
      data-candidate-id={candidate.id}
      data-new-candidate={isNew || undefined}
      data-source-version={candidate.source.version}
      data-triage-dimmed={isDimmed || undefined}
      data-triage-hold={operation?.held || undefined}
      data-testid="node-candidate-card"
      {...statusEmphasisProps(presentation)}
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
            "h-6 w-6 flex-shrink-0 text-muted-foreground transition-[color,opacity]",
            isDimmed && "opacity-30",
          )}
        />
        <div
          className={cn(
            "triage-staging__node-label mt-auto w-full truncate px-1 pb-1 text-center text-[10px] font-semibold transition-[color,opacity]",
            isDimmed ? "text-muted-foreground opacity-30" : "text-foreground",
          )}
        >
          {candidate.content}
        </div>
      </div>
      <StagingStatusSlot
        presentation={presentation}
        state={state}
        onCheckAgain={onCheckAgain}
      />
    </div>
  );
}

function BitCandidateRow({
  candidate,
  disabled,
  failure,
  isNew,
  onCheckAgain,
  operation,
}: {
  candidate: StagedCandidateProjection;
  disabled: boolean;
  failure?: Readonly<{ copy: string }>;
  isNew: boolean;
  onCheckAgain?: (operationId: string) => void;
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

  const isDimmed = isCandidateDimmed(isDragging, operation);
  const forced = useForcedItemStatus(forcedItemKeys.candidate(candidate.id));
  const state =
    forced !== null
      ? forcedItemState(forced, candidate)
      : itemState(operation, failure, candidate.content, onCheckAgain);
  const presentation = useStatusPresentation(state?.status ?? null, state?.phaseKey ?? "");

  return (
    <div
      ref={setNodeRef}
      aria-label={`Drag ${candidate.content} staged bit`}
      data-operation-locked={disabled}
      className={cn(
        BIT_ROW_CLASS,
        BIT_ROW_DRAGGABLE_CLASS,
        isDimmed && "border-dashed border-muted/30 bg-transparent",
      )}
      data-candidate-version={candidate.version}
      data-candidate-id={candidate.id}
      data-new-candidate={isNew || undefined}
      data-source-version={candidate.source.version}
      data-triage-dimmed={isDimmed || undefined}
      data-triage-hold={operation?.held || undefined}
      data-testid="bit-candidate-row"
      {...statusEmphasisProps(presentation)}
      data-triage-drag-source="staged-root"
      data-triage-role="staging-bit-row"
      data-triage-state={operation?.phase ?? "staged"}
      {...attributes}
      {...listeners}
    >
      <FileText
        aria-hidden="true"
        className={cn(
          "triage-staging__bit-icon transition-opacity",
          isDimmed && "opacity-30",
        )}
      />
      <div
        className={cn(
          "min-w-0 flex-1 truncate text-left text-xs font-medium transition-[color,opacity]",
          isDimmed ? "text-muted-foreground opacity-30" : "text-foreground",
        )}
      >
        {candidate.content}
      </div>
      <StagingStatusSlot
        presentation={presentation}
        state={state}
        onCheckAgain={onCheckAgain}
      />
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

function NodeStatusCard({
  operation,
  onCheckAgain,
}: {
  operation: StagingOperationView;
  onCheckAgain?: (operationId: string) => void;
}) {
  const state = operationState(operation, onCheckAgain);
  const presentation = useStatusPresentation(state?.status ?? null, state?.phaseKey ?? "");
  return (
    <div
      className={cn(NODE_CARD_CLASS, "cursor-default")}
      data-triage-hold={operation.held || undefined}
      data-testid="node-operation-card"
      {...statusEmphasisProps(presentation)}
      data-triage-role="staging-node-card"
      data-triage-state={operation.phase}
    >
      <div className="triage-staging__node-content flex h-full w-full flex-col items-center justify-center p-2">
        <Folder
          aria-hidden="true"
          className="h-6 w-6 flex-shrink-0 text-muted-foreground"
        />
        <div className="triage-staging__node-label mt-auto w-full truncate px-1 pb-1 text-center text-[10px] font-semibold text-foreground">
          {operation.title}
        </div>
      </div>
      <StagingStatusSlot
        focusable
        presentation={presentation}
        state={state}
        onCheckAgain={onCheckAgain}
      />
    </div>
  );
}

function BitStatusRow({
  operation,
  onCheckAgain,
}: {
  operation: StagingOperationView;
  onCheckAgain?: (operationId: string) => void;
}) {
  const state = operationState(operation, onCheckAgain);
  const presentation = useStatusPresentation(state?.status ?? null, state?.phaseKey ?? "");
  return (
    <div
      className={cn(BIT_ROW_CLASS, "cursor-default")}
      data-testid="bit-operation-row"
      data-triage-hold={operation.held || undefined}
      {...statusEmphasisProps(presentation)}
      data-triage-role="staging-bit-row"
      data-triage-state={operation.phase}
    >
      <FileText aria-hidden="true" className="triage-staging__bit-icon" />
      <div className="min-w-0 flex-1 truncate text-left text-xs font-medium text-foreground">
        {operation.title}
      </div>
      <StagingStatusSlot
        focusable
        presentation={presentation}
        state={state}
        onCheckAgain={onCheckAgain}
      />
    </div>
  );
}

// A staged candidate whose source can't be resolved has no title to show: its `!` is the only
// signal, and the host is not in the Tab order, so the icon takes focus.
function integrityState(sentence: string): StagingItemState {
  return {
    status: "problem",
    sentence,
    phaseKey: "source-unresolved",
    role: "staging-integrity-status",
  };
}

function NodeIntegrityCard() {
  const state = integrityState(INBOX_TRIAGE_COPY.stagingStatus.integrity.node);
  const presentation = useStatusPresentation(state.status, state.phaseKey);
  return (
    <div
      className={cn(NODE_CARD_CLASS, "staging-node-status-card cursor-default")}
      data-testid="node-integrity-card"
      {...statusEmphasisProps(presentation)}
      data-triage-role="staging-node-card"
    >
      <div className="triage-staging__node-content flex h-full w-full flex-col items-center justify-center p-2">
        <Folder aria-hidden="true" className="h-6 w-6 flex-shrink-0 text-muted-foreground" />
      </div>
      <StagingStatusSlot focusable presentation={presentation} state={state} />
    </div>
  );
}

function BitIntegrityRow() {
  const state = integrityState(INBOX_TRIAGE_COPY.stagingStatus.integrity.bit);
  const presentation = useStatusPresentation(state.status, state.phaseKey);
  return (
    <div
      className={cn(BIT_ROW_CLASS, "staging-bit-status-row cursor-default")}
      data-testid="bit-integrity-row"
      {...statusEmphasisProps(presentation)}
      data-triage-role="staging-bit-row"
    >
      <FileText aria-hidden="true" className="triage-staging__bit-icon" />
      <div className="min-w-0 flex-1" />
      <StagingStatusSlot focusable presentation={presentation} state={state} />
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
