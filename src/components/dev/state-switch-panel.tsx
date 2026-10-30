"use client";

import { useEffect, useState } from "react";
import {
  StatusIcon,
  statusEmphasisProps,
  useStatusPresentation,
} from "@/components/feedback/status-icon";
import { StatusTooltip } from "@/components/feedback/status-tooltip";
import { useScratchBreakdowns } from "@/hooks/use-scratch-breakdowns";
import { useStagedCandidates } from "@/hooks/use-staged-candidates";
import { INBOX_TRIAGE_COPY } from "@/lib/copy/inbox-triage";
import { getConnectionMonitor, useConnectionState } from "@/lib/db/connection";
import type { ConnectionState } from "@/lib/db/connection-monitor";
import {
  INJECTABLE_METHODS,
  INJECTION_OUTCOME_LABELS,
  STATE_SWITCH_MARKER,
  injectableMethodSpec,
  useStateSwitchStore,
  type InjectableMethod,
  type InjectionOutcome,
} from "@/lib/dev/state-switch";
import {
  FORCED_STATES,
  clearForcedItemStates,
  forcedItemKeys,
  itemStatusOfForcedState,
  registerForcedItemStates,
  type ForcedState,
} from "@/lib/feedback/forced-item-status";
import { useTriageStore } from "@/stores/triage-store";

/**
 * Development-only panel of the state switch (feedback F30, SPEC §Development
 * state switch). Mounted by `providers.tsx` only when `NODE_ENV` is
 * `development`. It does two things: it forces a presentation state per item
 * (shown here with the real status primitives, and published through the
 * `forced-item-status` seam for the Inbox surfaces of Tasks 245–247), and it
 * queues injections at the DataStore boundary so the real `Check again` and
 * `Retry` paths run end to end.
 */

const STATE_LABELS: Record<ForcedState, string> = {
  "delayed-pending": "Delayed pending",
  reconciling: "Reconciling",
  unknown: "Unknown",
  "not-applied": "Not applied",
  rejected: "Rejected",
  conflict: "Conflict",
  integrity: "Integrity",
  "editor-offline": "Editor offline",
};

const NO_ITEM_STATUS_SENTENCE =
  "No item status: an editor save while offline shows the offline write-attempt toast (Task 233), and the draft stays.";

const copy = INBOX_TRIAGE_COPY;

type ItemKind = "add" | "editor" | "row" | "candidate";

const APPLICABLE_STATES: Record<ItemKind, readonly ForcedState[]> = {
  add: ["delayed-pending", "reconciling", "unknown", "not-applied", "rejected", "conflict"],
  editor: ["delayed-pending", "reconciling", "not-applied", "editor-offline"],
  row: ["delayed-pending", "reconciling", "unknown", "not-applied", "rejected", "conflict"],
  candidate: [
    "delayed-pending",
    "reconciling",
    "unknown",
    "not-applied",
    "rejected",
    "conflict",
    "integrity",
  ],
};

const KIND_LABEL = { command: "command", reconcile: "Check again", write: "write" } as const;

/** The existing SPEC/copy sentence of a state for an item kind. */
function sentenceFor(
  kind: ItemKind,
  state: ForcedState,
  subject: { title?: string; resultType?: "node" | "bit" } = {},
): string {
  const title = subject.title ?? "";
  const fill = (template: string) => template.replace("{title}", title);
  if (state === "editor-offline") return NO_ITEM_STATUS_SENTENCE;

  if (kind === "editor") {
    const status = copy.inlineEditor.status;
    if (state === "delayed-pending") return status.saving;
    if (state === "reconciling") return status.reconciling;
    return status.notApplied;
  }
  if (kind === "candidate") {
    const operation = copy.stagingStatus.operation;
    const alert = copy.stagingStatus.alert;
    switch (state) {
      case "delayed-pending":
        return fill(operation.unstagePending);
      case "reconciling":
        return fill(operation.unstageReconciling);
      case "unknown":
        return fill(operation.unstageUnknown);
      case "not-applied":
        return fill(alert.unstageNotApplied);
      case "rejected":
        return fill(alert.unstageRejected);
      case "conflict":
        return fill(alert.unstageConflict);
      default:
        return subject.resultType === "bit"
          ? copy.stagingStatus.integrity.bit
          : copy.stagingStatus.integrity.node;
    }
  }
  const family = kind === "add" ? copy.reliability.add : copy.reliability.delete;
  switch (state) {
    case "delayed-pending":
      return family.pending;
    case "reconciling":
      return family.reconciling;
    case "unknown":
      return family.unknown;
    case "not-applied":
      return family.notApplied;
    case "rejected":
      return family.rejected;
    default:
      return family.conflict;
  }
}

function PrimitivePreview({
  state,
  sentence,
  phaseKey,
}: {
  state: ForcedState;
  sentence: string;
  phaseKey: string;
}) {
  const presentation = useStatusPresentation(
    itemStatusOfForcedState(state),
    phaseKey,
  );
  if (presentation.glyph === null) {
    return <span aria-hidden="true" className="inline-block size-4" />;
  }
  return (
    <StatusTooltip sentence={sentence}>
      <StatusIcon presentation={presentation} sentence={sentence} focusable />
    </StatusTooltip>
  );
}

function MatrixRow({
  state,
  replay,
}: {
  state: ForcedState;
  replay: number;
}) {
  const sentence = sentenceFor(state === "integrity" ? "candidate" : "add", state);
  const presentation = useStatusPresentation(
    itemStatusOfForcedState(state),
    `matrix:${state}:${replay}`,
  );
  return (
    <li
      data-state-switch-row={state}
      className="flex items-center justify-between gap-2 rounded border border-border bg-card px-2 py-1.5"
      {...statusEmphasisProps(presentation)}
    >
      <span>{STATE_LABELS[state]}</span>
      {presentation.glyph === null ? (
        <span aria-hidden="true" className="inline-block size-4" />
      ) : (
        <StatusTooltip sentence={sentence}>
          <StatusIcon presentation={presentation} sentence={sentence} focusable />
        </StatusTooltip>
      )}
    </li>
  );
}

function ItemRow({
  itemKey,
  label,
  kind,
  subject,
}: {
  itemKey: string;
  label: string;
  kind: ItemKind;
  subject?: { title?: string; resultType?: "node" | "bit" };
}) {
  const forced = useStateSwitchStore((state) => state.forced[itemKey]);
  const setForced = useStateSwitchStore((state) => state.setForced);
  const sentence = forced === undefined ? "" : sentenceFor(kind, forced, subject);
  const selectId = `state-switch-${itemKey}`;

  return (
    <li className="flex items-center gap-2" data-state-switch-item={itemKey}>
      <label htmlFor={selectId} className="min-w-0 flex-1 truncate" title={label}>
        {label}
      </label>
      <select
        id={selectId}
        value={forced ?? ""}
        onChange={(event) =>
          setForced(itemKey, (event.target.value || null) as ForcedState | null)
        }
        className="rounded border border-border bg-background px-1 py-0.5"
      >
        <option value="">None</option>
        {APPLICABLE_STATES[kind].map((state) => (
          <option key={state} value={state}>
            {STATE_LABELS[state]}
          </option>
        ))}
      </select>
      <span className="inline-flex w-4 justify-center">
        {forced === undefined ? null : (
          <PrimitivePreview state={forced} sentence={sentence} phaseKey={`${itemKey}:${forced}`} />
        )}
      </span>
    </li>
  );
}

const DELAY_CHOICES = [0, 500, 1500, 5000] as const;

function InjectionForm() {
  const injections = useStateSwitchStore((state) => state.injections);
  const queueInjection = useStateSwitchStore((state) => state.queueInjection);
  const removeInjection = useStateSwitchStore((state) => state.removeInjection);
  const clearInjections = useStateSwitchStore((state) => state.clearInjections);
  const [method, setMethod] = useState<InjectableMethod>("addBreakdown");
  const [outcome, setOutcome] = useState<InjectionOutcome>("unknown-after-commit");
  const [delayMs, setDelayMs] = useState<number>(0);
  const [count, setCount] = useState(1);

  const outcomes = injectableMethodSpec(method).outcomes;

  return (
    <section aria-labelledby="state-switch-injection-heading" className="space-y-1.5">
      <h3 id="state-switch-injection-heading" className="font-semibold">
        Next calls at the DataStore
      </h3>
      <div className="grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-1">
        <label htmlFor="state-switch-method">Command</label>
        <select
          id="state-switch-method"
          value={method}
          onChange={(event) => {
            const next = event.target.value as InjectableMethod;
            setMethod(next);
            if (!injectableMethodSpec(next).outcomes.includes(outcome)) {
              setOutcome("real");
            }
          }}
          className="rounded border border-border bg-background px-1 py-0.5"
        >
          {INJECTABLE_METHODS.map((name) => {
            const spec = injectableMethodSpec(name);
            return (
              <option key={name} value={name}>
                {spec.label} — {KIND_LABEL[spec.kind]}
              </option>
            );
          })}
        </select>
        <label htmlFor="state-switch-outcome">Outcome</label>
        <select
          id="state-switch-outcome"
          value={outcome}
          onChange={(event) => setOutcome(event.target.value as InjectionOutcome)}
          className="rounded border border-border bg-background px-1 py-0.5"
        >
          {outcomes.map((name) => (
            <option key={name} value={name}>
              {INJECTION_OUTCOME_LABELS[name]}
            </option>
          ))}
        </select>
        <label htmlFor="state-switch-delay">Delay</label>
        <select
          id="state-switch-delay"
          value={delayMs}
          onChange={(event) => setDelayMs(Number(event.target.value))}
          className="rounded border border-border bg-background px-1 py-0.5"
        >
          {DELAY_CHOICES.map((choice) => (
            <option key={choice} value={choice}>
              {choice === 0 ? "None" : `${choice} ms`}
            </option>
          ))}
        </select>
        <label htmlFor="state-switch-count">Calls</label>
        <input
          id="state-switch-count"
          type="number"
          min={1}
          max={9}
          value={count}
          onChange={(event) => setCount(Number(event.target.value) || 1)}
          className="w-14 rounded border border-border bg-background px-1 py-0.5"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          className="rounded border border-border bg-secondary px-2 py-0.5"
          onClick={() => queueInjection({ method, outcome, delayMs, count })}
        >
          Queue
        </button>
        <button
          type="button"
          className="rounded border border-border px-2 py-0.5"
          onClick={clearInjections}
          disabled={injections.length === 0}
        >
          Clear queue
        </button>
      </div>
      {injections.length === 0 ? (
        <p className="text-muted-foreground">Nothing queued.</p>
      ) : (
        <ul aria-label="Queued injections" className="space-y-1">
          {injections.map((injection) => (
            <li
              key={injection.id}
              className="flex items-center justify-between gap-2 rounded border border-border bg-card px-2 py-1"
            >
              <span>
                {injectableMethodSpec(injection.method).label} ·{" "}
                {KIND_LABEL[injectableMethodSpec(injection.method).kind]}{" "}
                · {INJECTION_OUTCOME_LABELS[injection.outcome]}
                {injection.delayMs > 0 ? ` · ${injection.delayMs} ms` : ""} ·{" "}
                {injection.remaining}×
              </span>
              <button
                type="button"
                aria-label={`Remove ${injectableMethodSpec(injection.method).label} injection`}
                className="px-1"
                onClick={() => removeInjection(injection.id)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ScratchItems({ scratchBitId }: { scratchBitId: string }) {
  const { breakdowns } = useScratchBreakdowns(scratchBitId);
  const { candidates } = useStagedCandidates(scratchBitId);

  return (
    <ul className="space-y-1">
      <ItemRow itemKey={forcedItemKeys.add(scratchBitId)} label="Add field" kind="add" />
      <ItemRow
        itemKey={forcedItemKeys.scratchTitleEditor(scratchBitId)}
        label="Scratch title editor"
        kind="editor"
      />
      {breakdowns.map((row) => (
        <ItemRow
          key={`row:${row.id}`}
          itemKey={forcedItemKeys.breakdown(row.id)}
          label={`Row: ${row.content}`}
          kind="row"
          subject={{ title: row.content }}
        />
      ))}
      {breakdowns.map((row) => (
        <ItemRow
          key={`editor:${row.id}`}
          itemKey={forcedItemKeys.breakdownEditor(row.id)}
          label={`Row editor: ${row.content}`}
          kind="editor"
        />
      ))}
      {candidates.map((candidate) => (
        <ItemRow
          key={`candidate:${candidate.id}`}
          itemKey={forcedItemKeys.candidate(candidate.id)}
          label={`Staged ${candidate.resultType}: ${candidate.content}`}
          kind="candidate"
          subject={{ title: candidate.content, resultType: candidate.resultType }}
        />
      ))}
    </ul>
  );
}

const NETWORK_CHOICES: readonly { value: ConnectionState | null; label: string }[] = [
  { value: null, label: "Real" },
  { value: "normal", label: "Normal" },
  { value: "unstable", label: "Unstable" },
  { value: "offline", label: "Offline" },
];

// Forces the connection state the app shows and gates writes by (Task 233). The real transitions
// are checked with real request failures; this serves the badges of Task 234.
function NetworkSection() {
  const network = useStateSwitchStore((state) => state.network);
  const setNetwork = useStateSwitchStore((state) => state.setNetwork);
  const shown = useConnectionState();

  return (
    <section aria-labelledby="state-switch-network-heading" className="space-y-1.5">
      <h3 id="state-switch-network-heading" className="font-semibold">
        Network (now: {shown})
      </h3>
      <div className="flex gap-1">
        {NETWORK_CHOICES.map((choice) => (
          <button
            key={choice.label}
            type="button"
            aria-pressed={network === choice.value}
            className="rounded border border-border px-2 py-0.5 aria-pressed:bg-accent"
            onClick={() => setNetwork(choice.value)}
          >
            {choice.label}
          </button>
        ))}
      </div>
    </section>
  );
}

export function StateSwitchPanel() {
  const [open, setOpen] = useState(false);
  const [replay, setReplay] = useState(0);
  const selectedScratchId = useTriageStore((state) => state.selectedScratchId);
  const forced = useStateSwitchStore((state) => state.forced);
  const network = useStateSwitchStore((state) => state.network);
  const reset = useStateSwitchStore((state) => state.reset);

  // The forced connection state holds while the panel is closed too (Task 233).
  useEffect(() => {
    getConnectionMonitor().setForced(network);
  }, [network]);
  useEffect(() => () => getConnectionMonitor().setForced(null), []);

  // Publish the forced states to the surfaces that read the seam.
  useEffect(() => {
    registerForcedItemStates(forced);
  }, [forced]);
  useEffect(() => clearForcedItemStates, []);

  return (
    <div
      data-state-switch={STATE_SWITCH_MARKER}
      className="fixed right-3 bottom-3 z-40 text-xs"
    >
      {open ? (
        <div
          role="region"
          aria-label="State switch (development)"
          className="max-h-[80vh] w-[22rem] space-y-3 overflow-y-auto rounded-md border border-border bg-popover p-3 text-popover-foreground shadow-lg"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">State switch</h2>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded border border-border px-2 py-0.5"
                onClick={reset}
              >
                Reset all
              </button>
              <button
                type="button"
                className="rounded border border-border px-2 py-0.5"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>
          </div>

          <NetworkSection />

          <section aria-labelledby="state-switch-primitives-heading" className="space-y-1.5">
            <div className="flex items-center justify-between">
              <h3 id="state-switch-primitives-heading" className="font-semibold">
                Primitives
              </h3>
              <button
                type="button"
                className="rounded border border-border px-2 py-0.5"
                onClick={() => setReplay((value) => value + 1)}
              >
                Replay
              </button>
            </div>
            <ul className="space-y-1">
              {FORCED_STATES.map((state) => (
                <MatrixRow key={`${state}:${replay}`} state={state} replay={replay} />
              ))}
            </ul>
          </section>

          <section aria-labelledby="state-switch-items-heading" className="space-y-1.5">
            <h3 id="state-switch-items-heading" className="font-semibold">
              Items of the selected Scratch
            </h3>
            {selectedScratchId === null ? (
              <p className="text-muted-foreground">
                No Scratch is selected. Open the Inbox and select one.
              </p>
            ) : (
              <ScratchItems scratchBitId={selectedScratchId} />
            )}
          </section>

          <InjectionForm />
        </div>
      ) : (
        <button
          type="button"
          className="rounded-md border border-border bg-popover px-2.5 py-1 font-medium text-popover-foreground shadow"
          onClick={() => setOpen(true)}
        >
          State switch
        </button>
      )}
    </div>
  );
}
