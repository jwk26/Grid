import { create } from "zustand";
import type { DataStore } from "@/lib/db/datastore";
import type { ForcedState } from "@/lib/feedback/forced-item-status";

/**
 * Development state switch (feedback F30). Development builds only: the only
 * importers are `getDataStore()` and `providers.tsx`, both behind a
 * `process.env.NODE_ENV === "development"` branch, so none of this reaches a
 * production bundle. The marker below is what the production build search looks
 * for.
 *
 * Two levels:
 * - presentation: `forced` holds a state per item key, read by the panel and,
 *   through the production-safe seam `forced-item-status`, by the Inbox
 *   surfaces from Tasks 245–247;
 * - boundary: `withDevInjection` wraps the DataStore and delays, or answers
 *   with an outcome, the next calls of one Inbox command method, so the real
 *   recovery paths (`Check again`, `Retry`, `Retry Add`) run end to end.
 */
export const STATE_SWITCH_MARKER = "GRIDDO_STATE_SWITCH_DEV_ONLY";

// --- The injectable DataStore methods ---------------------------------------

const INJECTABLE_NAMES = [
  "addBreakdown",
  "reconcileAddBreakdown",
  "saveScratchTitle",
  "reconcileSaveScratchTitle",
  "saveBreakdown",
  "reconcileSaveBreakdown",
  "deleteBreakdown",
  "reconcileDeleteBreakdown",
  "stageCandidate",
  "reconcileStageCandidate",
  "unstageCandidate",
  "reconcileUnstageCandidate",
  "cleanupConfirmedCandidateOrphan",
  "reconcileConfirmedCandidateOrphanCleanup",
  "placeStagedCandidate",
  "reconcileStagedPlacement",
  "placeDirectBreakdown",
  "reconcileDirectPlacement",
  "undoStagedPlacement",
  "reconcileStagedPlacementUndo",
  "undoDirectPlacement",
  "reconcileDirectPlacementUndo",
  "archiveScratch",
  "trashScratch",
  "reconcileTrashScratch",
] as const satisfies readonly (keyof DataStore)[];

export type InjectableMethod = (typeof INJECTABLE_NAMES)[number];

export const INJECTABLE_METHODS: readonly InjectableMethod[] = INJECTABLE_NAMES;

export type InjectionOutcome =
  | "real"
  | "unknown-before-send"
  | "unknown-after-commit"
  | "not_applied"
  | "rejected"
  | "conflict";

export const INJECTION_OUTCOME_LABELS: Record<InjectionOutcome, string> = {
  real: "Real result (delay only)",
  "unknown-before-send": "Unknown — request lost, not committed",
  "unknown-after-commit": "Unknown — answer lost, committed",
  not_applied: "Not applied",
  rejected: "Rejected",
  conflict: "Conflict",
};

export type InjectableMethodSpec = Readonly<{
  /** The family name shown in the panel, shared by a command and its twin. */
  label: string;
  kind: "command" | "reconcile";
  /**
   * The read-only reconcile method whose result carries the records the real
   * store would return now; an injected answer is that result with its status
   * replaced. `null`: built from the Scratch eligibility read (Archive).
   */
  recordsFrom: InjectableMethod | null;
  /** Only the outcomes the real path of this method can return. */
  outcomes: readonly InjectionOutcome[];
}>;

// A command answers applied, already_applied, rejected or conflict; a reconcile
// answers already_applied, not_applied or conflict (and rejected for the three
// below). An unknown outcome is a request that ends without an answer.
const COMMAND_OUTCOMES = [
  "real",
  "unknown-before-send",
  "unknown-after-commit",
  "rejected",
  "conflict",
] as const;
const RECONCILE_OUTCOMES = [
  "real",
  "unknown-before-send",
  "not_applied",
  "conflict",
] as const;
const RECONCILE_REJECTING_OUTCOMES = [
  "real",
  "unknown-before-send",
  "not_applied",
  "rejected",
  "conflict",
] as const;

const command = (
  label: string,
  recordsFrom: InjectableMethod | null,
): InjectableMethodSpec => ({
  label,
  kind: "command",
  recordsFrom,
  outcomes: COMMAND_OUTCOMES,
});

const reconcile = (
  label: string,
  method: InjectableMethod,
  outcomes: readonly InjectionOutcome[] = RECONCILE_OUTCOMES,
): InjectableMethodSpec => ({
  label,
  kind: "reconcile",
  recordsFrom: method,
  outcomes,
});

const SPECS: Record<InjectableMethod, InjectableMethodSpec> = {
  addBreakdown: command("Add Breakdown", "reconcileAddBreakdown"),
  reconcileAddBreakdown: reconcile("Add Breakdown", "reconcileAddBreakdown"),
  saveScratchTitle: command("Save Scratch title", "reconcileSaveScratchTitle"),
  reconcileSaveScratchTitle: reconcile("Save Scratch title", "reconcileSaveScratchTitle"),
  saveBreakdown: command("Save Breakdown row", "reconcileSaveBreakdown"),
  reconcileSaveBreakdown: reconcile("Save Breakdown row", "reconcileSaveBreakdown"),
  deleteBreakdown: command("Delete Breakdown row", "reconcileDeleteBreakdown"),
  reconcileDeleteBreakdown: reconcile("Delete Breakdown row", "reconcileDeleteBreakdown"),
  stageCandidate: command("Stage", "reconcileStageCandidate"),
  reconcileStageCandidate: reconcile("Stage", "reconcileStageCandidate"),
  unstageCandidate: command("Unstage", "reconcileUnstageCandidate"),
  reconcileUnstageCandidate: reconcile("Unstage", "reconcileUnstageCandidate"),
  cleanupConfirmedCandidateOrphan: command(
    "Orphan cleanup",
    "reconcileConfirmedCandidateOrphanCleanup",
  ),
  reconcileConfirmedCandidateOrphanCleanup: reconcile(
    "Orphan cleanup",
    "reconcileConfirmedCandidateOrphanCleanup",
    RECONCILE_REJECTING_OUTCOMES,
  ),
  placeStagedCandidate: command("Place staged", "reconcileStagedPlacement"),
  reconcileStagedPlacement: reconcile("Place staged", "reconcileStagedPlacement"),
  placeDirectBreakdown: command("Place directly", "reconcileDirectPlacement"),
  reconcileDirectPlacement: reconcile("Place directly", "reconcileDirectPlacement"),
  undoStagedPlacement: command("Undo staged placement", "reconcileStagedPlacementUndo"),
  reconcileStagedPlacementUndo: reconcile(
    "Undo staged placement",
    "reconcileStagedPlacementUndo",
    RECONCILE_REJECTING_OUTCOMES,
  ),
  undoDirectPlacement: command("Undo direct placement", "reconcileDirectPlacementUndo"),
  reconcileDirectPlacementUndo: reconcile(
    "Undo direct placement",
    "reconcileDirectPlacementUndo",
    RECONCILE_REJECTING_OUTCOMES,
  ),
  archiveScratch: command("Archive Scratch", null),
  trashScratch: command("Trash Scratch", "reconcileTrashScratch"),
  reconcileTrashScratch: reconcile("Trash Scratch", "reconcileTrashScratch"),
};

export function injectableMethodSpec(method: InjectableMethod): InjectableMethodSpec {
  return SPECS[method];
}

function isInjectableMethod(name: string): name is InjectableMethod {
  return Object.prototype.hasOwnProperty.call(SPECS, name);
}

// --- The switch store -------------------------------------------------------

export type Injection = Readonly<{
  id: number;
  method: InjectableMethod;
  outcome: InjectionOutcome;
  delayMs: number;
  /** Calls of `method` still to be affected. */
  remaining: number;
}>;

export type QueueInjectionInput = Readonly<{
  method: InjectableMethod;
  outcome: InjectionOutcome;
  delayMs: number;
  count: number;
}>;

const MAX_INJECTION_COUNT = 9;
const MAX_INJECTION_DELAY_MS = 60_000;

type StateSwitchState = {
  /** Forced presentation state per item key (see `forcedItemKeys`). */
  forced: Record<string, ForcedState>;
  /** Queued boundary injections, in the order they were queued. */
  injections: readonly Injection[];
  setForced: (itemKey: string, state: ForcedState | null) => void;
  clearForced: () => void;
  queueInjection: (input: QueueInjectionInput) => Injection;
  removeInjection: (id: number) => void;
  clearInjections: () => void;
  /** Used by the wrapper: the first queued injection for `method`, consumed once. */
  takeInjection: (method: InjectableMethod) => Injection | null;
  reset: () => void;
};

let nextInjectionId = 1;

export const useStateSwitchStore = create<StateSwitchState>()((set, get) => ({
  forced: {},
  injections: [],
  setForced: (itemKey, state) =>
    set((current) => {
      const next = { ...current.forced };
      if (state === null) delete next[itemKey];
      else next[itemKey] = state;
      return { forced: next };
    }),
  clearForced: () => set({ forced: {} }),
  queueInjection: ({ method, outcome, delayMs, count }) => {
    if (!SPECS[method].outcomes.includes(outcome)) {
      throw new Error(
        `${STATE_SWITCH_MARKER}: ${method} cannot really return ${outcome}`,
      );
    }
    const injection: Injection = {
      id: nextInjectionId++,
      method,
      outcome,
      delayMs: Math.min(Math.max(Math.round(delayMs), 0), MAX_INJECTION_DELAY_MS),
      remaining: Math.min(Math.max(Math.round(count), 1), MAX_INJECTION_COUNT),
    };
    set((current) => ({ injections: [...current.injections, injection] }));
    return injection;
  },
  removeInjection: (id) =>
    set((current) => ({
      injections: current.injections.filter((injection) => injection.id !== id),
    })),
  clearInjections: () => set({ injections: [] }),
  takeInjection: (method) => {
    const found = get().injections.find((injection) => injection.method === method);
    if (found === undefined) return null;
    set((current) => ({
      injections: current.injections.flatMap((injection) =>
        injection.id !== found.id
          ? [injection]
          : injection.remaining > 1
            ? [{ ...injection, remaining: injection.remaining - 1 }]
            : [],
      ),
    }));
    return found;
  },
  reset: () => set({ forced: {}, injections: [] }),
}));

// --- The DataStore wrapper --------------------------------------------------

type StoreMethod = (command: unknown) => Promise<unknown>;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * The answer a real store would give now, with the injected status: the
 * read-only reconcile twin supplies the current records (so an editor
 * `conflict` still carries the latest row and shows its conflict view, not the
 * recovery view), and `status` is replaced. Nothing is written.
 */
async function injectedResult(
  store: DataStore,
  method: InjectableMethod,
  command: { operationId: string; scratchBitId?: string },
  status: "not_applied" | "rejected" | "conflict",
): Promise<unknown> {
  const { recordsFrom } = SPECS[method];
  if (recordsFrom === null) {
    const eligibility = await store.getScratchArchiveEligibility(
      command.scratchBitId ?? "",
    );
    return { operationId: command.operationId, status, scratch: eligibility.scratch };
  }
  const records = await (store[recordsFrom] as StoreMethod).call(store, command);
  return { ...(records as object), operationId: command.operationId, status };
}

async function runWithInjection(
  store: DataStore,
  method: InjectableMethod,
  real: StoreMethod,
  command: { operationId: string; scratchBitId?: string },
): Promise<unknown> {
  const injection = useStateSwitchStore.getState().takeInjection(method);
  if (injection === null) return real.call(store, command);

  if (injection.delayMs > 0) await sleep(injection.delayMs);

  switch (injection.outcome) {
    case "real":
      return real.call(store, command);
    case "unknown-before-send":
      throw new Error(`${STATE_SWITCH_MARKER}: injected unknown outcome (${method}, request lost)`);
    case "unknown-after-commit":
      await real.call(store, command);
      throw new Error(`${STATE_SWITCH_MARKER}: injected unknown outcome (${method}, answer lost)`);
    default:
      return injectedResult(store, method, command, injection.outcome);
  }
}

/**
 * Wraps a DataStore so the Inbox commands and their `reconcile*` twins honour
 * the queued injections. Every other member passes through, bound to the real
 * store. `getDataStore()` applies it, in development only, at its single return
 * point before caching.
 */
export function withDevInjection(store: DataStore): DataStore {
  return new Proxy(store, {
    get(_target, property) {
      const value: unknown = Reflect.get(store, property, store);
      if (typeof value !== "function") return value;
      if (typeof property === "string" && isInjectableMethod(property)) {
        return (command: { operationId: string; scratchBitId?: string }) =>
          runWithInjection(store, property, value as StoreMethod, command);
      }
      return value.bind(store);
    },
  });
}
