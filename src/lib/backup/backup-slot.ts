import { BACKUP_INTERRUPTED_MS, BACKUP_STALE_MS } from "@/lib/constants";

// The one place the account's backup state lives in the browser (SPEC §Account backup; flow review
// W4): the snapshot's `backup` value, the dialog's status read and a `Back Up Now` result all go
// through `offer()`, the later `server_now` winning, so the sidebar dot and the dialog never
// disagree. It also holds this tab's own pending run, so closing the dialog keeps the motion until
// the tab sees the result. It is cleared on sign-out and on an account change.
//
// Ages are the value's `server_now` plus the time since it arrived on a monotonic clock
// (`performance.now()`), never the device's wall clock (flow review G1).

export type BackupResult = "written" | "unchanged" | "failed";

export type BackupValue = {
  runStartedAt: number | null;
  lastCheckedAt: number | null;
  lastFileAt: number | null;
  lastResult: BackupResult | null;
  failureReason: string | null;
  serverNow: number;
};

const numberOrNull = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/**
 * The server's `backup` value. `null` is a row that does not exist yet; `undefined` is a value that
 * is missing or unreadable, which callers ignore.
 */
export function parseBackupValue(raw: unknown): BackupValue | null | undefined {
  if (raw === null) return null;
  if (typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const serverNow = numberOrNull(r.server_now);
  if (serverNow === null) return undefined;
  const lastResult = r.last_result === "written" || r.last_result === "unchanged" || r.last_result === "failed" ? r.last_result : null;
  return {
    runStartedAt: numberOrNull(r.run_started_at),
    lastCheckedAt: numberOrNull(r.last_checked_at),
    lastFileAt: numberOrNull(r.last_file_at),
    lastResult,
    failureReason: typeof r.failure_reason === "string" ? r.failure_reason : null,
    serverNow,
  };
}

/** This tab's own `Back Up Now`: `startedAt` is on the monotonic clock. */
export type PendingRun = { runId: string; startedAt: number; inFlight: boolean };

export type BackupSlotState = {
  /** False until a snapshot (or a status read) has answered. */
  known: boolean;
  value: BackupValue | null;
  /** Monotonic reading when `value` arrived. */
  arrivedAt: number;
  pending: PendingRun | null;
};

/** This tab's run is open: its request is in flight, or it is younger than the interrupted threshold. */
export function isPendingOpen(state: BackupSlotState, nowMono: number): boolean {
  const p = state.pending;
  return p !== null && (p.inFlight || nowMono - p.startedAt <= BACKUP_INTERRUPTED_MS);
}

export type BackupLine = "gray" | "green" | "yellow" | "red" | "running";

export type DerivedBackup = {
  line: BackupLine;
  dot: "stale" | "failed" | null;
  running: boolean;
  lastFileAt: number | null;
  reason: string | null;
  /** Milliseconds until this answer changes with no request, or null. */
  nextChangeIn: number | null;
};

/** Pure: everything the button and the dialog show, judged at the monotonic reading `nowMono`. */
export function deriveBackup(state: BackupSlotState, nowMono: number): DerivedBackup {
  const v = state.value;
  const elapsed = Math.max(0, nowMono - state.arrivedAt);
  const serverNow = v ? v.serverNow + elapsed : 0;
  const boundaries: number[] = [];

  let running = false;
  if (v?.runStartedAt != null) {
    const age = serverNow - v.runStartedAt;
    if (age <= BACKUP_INTERRUPTED_MS) {
      running = true;
      boundaries.push(BACKUP_INTERRUPTED_MS - age + 1);
    }
  }
  const p = state.pending;
  if (p) {
    const age = nowMono - p.startedAt;
    if (p.inFlight) running = true;
    else if (age <= BACKUP_INTERRUPTED_MS) {
      running = true;
      boundaries.push(BACKUP_INTERRUPTED_MS - age + 1);
    }
  }

  const failed = v?.lastResult === "failed";
  let stale = false;
  if (v && !failed && v.lastCheckedAt != null) {
    const age = serverNow - v.lastCheckedAt;
    if (age > BACKUP_STALE_MS) stale = true;
    else boundaries.push(BACKUP_STALE_MS - age + 1);
  }

  const dot = failed ? "failed" : stale ? "stale" : null;
  const line: BackupLine = running
    ? "running"
    : failed
      ? "red"
      : stale
        ? "yellow"
        : v?.lastCheckedAt != null
          ? "green"
          : "gray";

  return {
    line,
    dot,
    running,
    lastFileAt: v?.lastFileAt ?? null,
    reason: failed ? (v?.failureReason ?? null) : null,
    nextChangeIn: boundaries.length > 0 ? Math.min(...boundaries) : null,
  };
}

export class BackupSlot {
  private readonly now: () => number;
  private epoch = 0;
  private readonly listeners = new Set<() => void>();
  private state: BackupSlotState;

  constructor(options: { now?: () => number } = {}) {
    this.now = options.now ?? (() => performance.now());
    this.state = this.empty();
  }

  private empty(): BackupSlotState {
    return { known: false, value: null, arrivedAt: this.now(), pending: null };
  }

  /** Stable between changes, so it works as a `useSyncExternalStore` snapshot. */
  getState = (): BackupSlotState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** The monotonic reading the age is judged at. */
  nowMono = (): number => this.now();

  /** An answer started now carries this; one that arrives after a reset is ignored. */
  getEpoch = (): number => this.epoch;

  /** A snapshot, a status read or a `Back Up Now` result. The later `server_now` wins. */
  offer(value: BackupValue | null, epoch: number): void {
    if (epoch !== this.epoch) return;
    const current = this.state.value;
    if (value === null) {
      // A missing row says nothing against a value already held.
      if (this.state.known) return;
      this.set({ ...this.state, known: true, value: null, arrivedAt: this.now() });
      return;
    }
    if (current && value.serverNow < current.serverNow) return;
    let pending = this.state.pending;
    // A newer value with no run in progress ends a pending run whose request is over.
    if (pending && !pending.inFlight && value.runStartedAt === null) pending = null;
    this.set({ known: true, value, arrivedAt: this.now(), pending });
  }

  beginRun(runId: string): void {
    this.set({ ...this.state, pending: { runId, startedAt: this.now(), inFlight: true } });
  }

  /** The request ended; the run may still be open on the server. */
  requestEnded(runId: string): void {
    const p = this.state.pending;
    if (!p || p.runId !== runId) return;
    this.set({ ...this.state, pending: { ...p, inFlight: false } });
  }

  endRun(runId: string): void {
    const p = this.state.pending;
    if (!p || p.runId !== runId) return;
    this.set({ ...this.state, pending: null });
  }

  reset(): void {
    this.epoch += 1;
    this.set(this.empty());
  }

  private set(next: BackupSlotState): void {
    this.state = next;
    for (const listener of [...this.listeners]) listener();
  }
}
