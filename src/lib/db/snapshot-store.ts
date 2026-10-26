import { REQUEST_TIMEOUT_MS } from "@/lib/constants";
import {
  bitFromRow,
  chunkFromRow,
  nodeFromRow,
  scratchBreakdownFromRow,
  stagedCandidateFromRow,
} from "@/lib/db/row-mapping";
import type { Bit, Chunk, Node, ScratchBreakdown, StagedCandidate } from "@/lib/db/schema";

// The account snapshot with a pending-write layer (SPEC Architecture Decision 19). Two layers:
// the server-confirmed base and an ordered list of pending writes. The view is the base with
// the pending writes applied on top. Envelope `changes` and refetches change only the base; a
// pending write leaves the list when it settles. In memory only: dropped on reload and sign-out.
// The shapes below (envelope, pending effect, outcome) are fixed in Phase 42; Phases 43-44 reuse
// them unchanged.

export type TableKey = "nodes" | "bits" | "chunks" | "scratchBreakdowns" | "stagedCandidates";
export type ChangeTable = "nodes" | "bits" | "chunks" | "scratch_breakdowns" | "staged_candidates";

const TABLE_BY_CHANGE: Record<ChangeTable, TableKey> = {
  nodes: "nodes",
  bits: "bits",
  chunks: "chunks",
  scratch_breakdowns: "scratchBreakdowns",
  staged_candidates: "stagedCandidates",
};
const TABLE_KEYS = Object.values(TABLE_BY_CHANGE);

type Entity = { id: string };
type Entities = {
  nodes: Node;
  bits: Bit;
  chunks: Chunk;
  scratchBreakdowns: ScratchBreakdown;
  stagedCandidates: StagedCandidate;
};
export type AccountView = { [K in TableKey]: ReadonlyMap<string, Entities[K]> };
type MutableView = { [K in TableKey]: Map<string, Entities[K]> };

export type Rejection = { code: string; table?: string; limit?: number };
export type ChangeRow = Record<string, unknown> & { id: string };
export type Changes = Partial<Record<ChangeTable, { upserted: ChangeRow[]; deleted: string[] }>>;
export type Envelope<Result = unknown> = {
  status: "applied" | "already_applied" | "not_applied" | "rejected" | "conflict";
  result: Result | null;
  changes: Changes;
  rejection?: Rejection;
};

// What a pending write shows in the view. `patch` is a partial camelCase record.
export type PendingEffect =
  | { kind: "patch"; table: TableKey; id: string; patch: Record<string, unknown> }
  | { kind: "create"; table: TableKey; record: Entity & Record<string, unknown> }
  | { kind: "remove"; table: TableKey; id: string };

export type PendingInfo = {
  id: number;
  table: TableKey;
  recordId: string;
  state: "queued" | "sent";
};

// applied: the server applied it (applied or already_applied). rejected: rolled back to the
// envelope's current rows (rejected, not_applied, conflict). error: the call threw; rolled back.
// unknown: no answer within the timeout; pending dropped, snapshot refetched, never resent.
export type WriteOutcome = {
  outcome: "applied" | "rejected" | "error" | "unknown";
  envelope?: Envelope;
  error?: unknown;
};

export type StoreStatus =
  | { phase: "empty" }
  | { phase: "loading" }
  | { phase: "ready" }
  | { phase: "rejected"; code: string }
  | { phase: "failed" };

export type StoreState = {
  status: StoreStatus;
  view: AccountView;
  pending: readonly PendingInfo[];
};

export type RefetchResult = "applied" | "rejected" | "failed";

export type ParsedSnapshot =
  | { kind: "snapshot"; data: AccountView }
  | { kind: "rejection"; code: string };

function emptyView(): MutableView {
  return {
    nodes: new Map(),
    bits: new Map(),
    chunks: new Map(),
    scratchBreakdowns: new Map(),
    stagedCandidates: new Map(),
  };
}

function mapRow(table: TableKey, row: ChangeRow): Entity {
  switch (table) {
    case "nodes":
      return nodeFromRow(row as never);
    case "bits":
      return bitFromRow(row as never);
    case "chunks":
      return chunkFromRow(row as never);
    case "scratchBreakdowns":
      return scratchBreakdownFromRow(row as never);
    case "stagedCandidates":
      return stagedCandidateFromRow(row as never);
  }
}

const CHANGE_TABLES = Object.keys(TABLE_BY_CHANGE) as ChangeTable[];

// A get_snapshot() value holding `rejection` is a rejection (SCHEMA Snapshot), never an empty
// account. A value that is neither is a failure.
export function parseSnapshotValue(value: unknown): ParsedSnapshot {
  if (typeof value !== "object" || value === null) throw new Error("get_snapshot returned no value");
  const record = value as Record<string, unknown>;
  const rejection = record.rejection as { code?: unknown } | undefined;
  if (rejection !== undefined) {
    if (typeof rejection.code !== "string") throw new Error("get_snapshot returned a malformed rejection");
    return { kind: "rejection", code: rejection.code };
  }
  const data = emptyView();
  for (const changeTable of CHANGE_TABLES) {
    const rows = record[changeTable];
    if (!Array.isArray(rows)) throw new Error(`get_snapshot value has no ${changeTable}`);
    const table = TABLE_BY_CHANGE[changeTable];
    for (const row of rows as ChangeRow[]) {
      (data[table] as Map<string, Entity>).set(row.id, mapRow(table, row));
    }
  }
  return { kind: "snapshot", data };
}

function cloneView(view: AccountView): MutableView {
  const copy = emptyView();
  for (const table of TABLE_KEYS) {
    (copy[table] as Map<string, Entity>) = new Map(view[table] as ReadonlyMap<string, Entity>);
  }
  return copy;
}

// Envelope `changes` applied to a base, through row-mapping. Pure.
export function applyChanges(base: AccountView, changes: Changes): AccountView {
  const next = cloneView(base);
  for (const changeTable of CHANGE_TABLES) {
    const change = changes[changeTable];
    if (!change) continue;
    const table = TABLE_BY_CHANGE[changeTable];
    const map = next[table] as Map<string, Entity>;
    for (const id of change.deleted) map.delete(id);
    for (const row of change.upserted) {
      // Results for different records can arrive out of commit order: a row older than the base
      // row is ignored (tables with `version`; an equal version applies). SPEC Decision 19.
      const current = map.get(row.id) as { version?: number } | undefined;
      if (
        current?.version !== undefined &&
        typeof row.version === "number" &&
        row.version < current.version
      ) {
        continue;
      }
      map.set(row.id, mapRow(table, row));
    }
  }
  return next;
}

function applyEffects(base: AccountView, effects: readonly PendingEffect[]): AccountView {
  if (effects.length === 0) return base;
  const next = cloneView(base);
  for (const effect of effects) {
    const map = next[effect.table] as Map<string, Entity>;
    if (effect.kind === "patch") {
      const current = map.get(effect.id);
      if (current) map.set(effect.id, { ...current, ...effect.patch });
    } else if (effect.kind === "create") {
      map.set(effect.record.id, effect.record);
    } else {
      map.delete(effect.id);
    }
  }
  return next;
}

// A command (Task 227) has no effect: it never shows in the view and never in `pending`; it only
// takes part in the send chain, the timeout and the reset rule.
type PendingEntry = Omit<PendingInfo, "table" | "recordId"> & {
  table: TableKey | null;
  recordId: string | null;
  effect: PendingEffect | null;
};

export type SnapshotStoreOptions = {
  fetchSnapshot: () => Promise<unknown>;
  requestTimeoutMs?: number;
};

// Thrown by a send function when the request ended without an answer (the connection failed
// before a response). It is an unknown outcome like a timeout: the write may have committed.
export class UnknownOutcomeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnknownOutcomeError";
  }
}

// A rejection that depends on the server's current state: the client's snapshot was probably
// behind, so the store refetches once after it. Not after account_limit or invalid_input, which
// a refetch cannot change (SPEC Decision 19).
const STATE_DEPENDENT_REJECTIONS = new Set([
  "not_found",
  "cell_taken",
  "parent_inactive",
  "grid_full",
  "invalid_target",
]);

const MAX_FETCH_ATTEMPTS = 5;
const TIMED_OUT = Symbol("timed out");

export class SnapshotStore {
  private readonly fetchSnapshot: () => Promise<unknown>;
  private readonly requestTimeoutMs: number;
  private base: AccountView = emptyView();
  private status: StoreStatus = { phase: "empty" };
  private pending: PendingEntry[] = [];
  private state: StoreState;
  private readonly listeners = new Set<() => void>();
  private nextId = 1;
  private settledCount = 0;
  private inflight: Promise<RefetchResult> | null = null;
  // The tail of each record's send chain: a write waits for the one before it on the same record.
  private readonly chains = new Map<string, Promise<unknown>>();
  private epoch = 0;

  constructor(options: SnapshotStoreOptions) {
    this.fetchSnapshot = options.fetchSnapshot;
    this.requestTimeoutMs = options.requestTimeoutMs ?? REQUEST_TIMEOUT_MS;
    this.state = this.computeState();
  }

  // Stable between changes, so it works as a useSyncExternalStore snapshot.
  getState = (): StoreState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  load(): Promise<RefetchResult> {
    return this.refetch();
  }

  // Loads the account. A read that started before a write settled is discarded and sent again,
  // so an older read never overwrites a newer result.
  refetch(): Promise<RefetchResult> {
    if (!this.inflight) {
      if (this.status.phase === "empty") this.setStatus({ phase: "loading" });
      const own: Promise<RefetchResult> = this.runFetch().finally(() => {
        // A fetch from before reset() must not clear the new session's in-flight fetch.
        if (this.inflight === own) this.inflight = null;
      });
      this.inflight = own;
    }
    return this.inflight;
  }

  private async runFetch(): Promise<RefetchResult> {
    const epoch = this.epoch;
    for (let attempt = 0; attempt < MAX_FETCH_ATTEMPTS; attempt += 1) {
      const settledAtStart = this.settledCount;
      let parsed: ParsedSnapshot;
      try {
        parsed = parseSnapshotValue(await this.fetchSnapshot());
      } catch {
        if (epoch === this.epoch && this.status.phase !== "ready") this.setStatus({ phase: "failed" });
        return "failed";
      }
      if (epoch !== this.epoch) return "failed";
      if (this.settledCount !== settledAtStart) continue;
      if (parsed.kind === "rejection") {
        this.base = emptyView();
        this.status = { phase: "rejected", code: parsed.code };
        this.publish();
        return "rejected";
      }
      this.base = parsed.data;
      this.status = { phase: "ready" };
      this.publish();
      return "applied";
    }
    if (epoch === this.epoch && this.status.phase !== "ready") this.setStatus({ phase: "failed" });
    return "failed";
  }

  // Shows `effect` at once and sends the write after the earlier writes to the same record have
  // settled, whatever their outcome. Never resent.
  write(args: { effect: PendingEffect; send: () => Promise<Envelope> }): Promise<WriteOutcome> {
    const { effect } = args;
    const recordId = effect.kind === "create" ? effect.record.id : effect.id;
    return this.enqueue(`${effect.table}:${recordId}`, effect, recordId, args.send);
  }

  // A write with no pending effect: the view stays at the base until the answer's `changes` reach
  // it (server-confirmed, Phase 45). Same send chain, timeout, unknown outcome and refetch rules
  // as `write`. `key` names the chain: the target record, the Scratch of an Inbox command, or one
  // account key.
  command(args: { key: string; send: () => Promise<Envelope> }): Promise<WriteOutcome> {
    return this.enqueue(args.key, null, null, args.send);
  }

  private enqueue(
    key: string,
    effect: PendingEffect | null,
    recordId: string | null,
    sendRequest: () => Promise<Envelope>,
  ): Promise<WriteOutcome> {
    const previous = this.chains.get(key);
    const entry: PendingEntry = {
      id: this.nextId++,
      table: effect ? effect.table : null,
      recordId,
      state: previous ? "queued" : "sent",
      effect,
    };
    this.pending = [...this.pending, entry];
    if (effect) this.publish();

    const started = previous
      ? previous.then(() => this.send(entry, sendRequest))
      : Promise.resolve(this.send(entry, sendRequest));
    const run = started.then((sent) => sent.outcome);
    // The next write to this record waits for the request itself to end, not for the timeout: a
    // later write cannot overtake a timed-out one on the server.
    const tail: Promise<unknown> = started.then((sent) => sent.done).finally(() => {
      if (this.chains.get(key) === tail) this.chains.delete(key);
    });
    this.chains.set(key, tail);
    return run;
  }

  // Starts the request now. `outcome` settles at the answer or at the timeout; `done` settles
  // when the request itself has ended. The pending write leaves the view at the timeout; a late
  // answer to a timed-out write is not applied to the base and triggers one refetch.
  private send(
    entry: PendingEntry,
    send: () => Promise<Envelope>,
  ): { outcome: Promise<WriteOutcome>; done: Promise<void> } {
    if (!this.pending.some((item) => item.id === entry.id)) {
      // A reset (sign-out) dropped the entry while it waited: it is never sent.
      return { outcome: Promise.resolve({ outcome: "error", error: new Error("store reset") }), done: Promise.resolve() };
    }
    if (entry.state === "queued") {
      entry.state = "sent";
      if (entry.effect) this.publish();
    }
    let request: Promise<Envelope>;
    try {
      request = Promise.resolve(send());
    } catch (error) {
      request = Promise.reject(error);
    }
    const epoch = this.epoch;
    let timedOut = false;
    // After an unknown outcome the request's own end (a late answer or a failure) discards any
    // fetch that started before it and sends one more, since that fetch may have read before the
    // write committed.
    const refetchAfterUnknown = () => {
      if (epoch !== this.epoch) return;
      this.settledCount += 1;
      void this.refetch();
    };
    const done = request.then(
      () => undefined,
      () => undefined,
    ).then(() => {
      if (timedOut) refetchAfterUnknown();
    });
    const outcome = (async (): Promise<WriteOutcome> => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const timeout = new Promise<typeof TIMED_OUT>((resolve) => {
          timer = setTimeout(() => resolve(TIMED_OUT), this.requestTimeoutMs);
        });
        const result = await Promise.race([request, timeout]);
        if (result === TIMED_OUT) {
          timedOut = true;
          this.settle(entry, null);
          if (epoch === this.epoch) void this.refetch();
          return { outcome: "unknown" };
        }
        this.settle(entry, result.changes);
        const outcome = result.status === "applied" || result.status === "already_applied" ? "applied" : "rejected";
        if (
          outcome === "rejected" &&
          result.rejection &&
          STATE_DEPENDENT_REJECTIONS.has(result.rejection.code) &&
          epoch === this.epoch
        ) {
          void this.refetch();
        }
        return { outcome, envelope: result };
      } catch (error) {
        this.settle(entry, null);
        if (error instanceof UnknownOutcomeError) {
          if (epoch === this.epoch) void this.refetch();
          return { outcome: "unknown", error };
        }
        return { outcome: "error", error };
      } finally {
        clearTimeout(timer);
      }
    })();
    return { outcome, done };
  }

  // The write leaves the list and its changes reach the base in one step, so the view never shows
  // a half state.
  private settle(entry: PendingEntry, changes: Changes | null): void {
    // A reset (sign-out) dropped the entry: a late answer must not reach the new session's base.
    if (!this.pending.some((item) => item.id === entry.id)) return;
    this.pending = this.pending.filter((item) => item.id !== entry.id);
    this.settledCount += 1;
    if (changes) this.base = applyChanges(this.base, changes);
    this.publish();
  }

  reset(): void {
    this.epoch += 1;
    this.base = emptyView();
    this.status = { phase: "empty" };
    this.pending = [];
    this.chains.clear();
    this.inflight = null;
    this.publish();
  }

  private setStatus(status: StoreStatus): void {
    this.status = status;
    this.publish();
  }

  private computeState(): StoreState {
    const shown = this.pending.filter(
      (entry): entry is PendingEntry & { effect: PendingEffect; table: TableKey; recordId: string } =>
        entry.effect !== null,
    );
    return {
      status: this.status,
      view: applyEffects(
        this.base,
        shown.map((entry) => entry.effect),
      ),
      pending: shown.map(({ id, table, recordId, state }) => ({ id, table, recordId, state })),
    };
  }

  private publish(): void {
    this.state = this.computeState();
    for (const listener of [...this.listeners]) listener();
  }
}
