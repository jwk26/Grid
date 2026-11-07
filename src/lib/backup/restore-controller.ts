import type { BackupClient, RestoreOutcome, RestoreStep } from "@/lib/backup/backup-client";
import type { BackupSlot } from "@/lib/backup/backup-slot";
import type { RestoreChannel, RestoreMessage } from "@/lib/backup/restore-channel";
import { EDGE_REQUEST_TIMEOUT_MS } from "@/lib/constants";

// A restore and its follow (SPEC §Account backup, Restore). The state lives here, outside the
// dialog, so the restoring screen (mounted by the app frame) outlives it. Order for this tab:
// refresh the session, post `restore-started`, send. A restore request is never resent: an unknown
// outcome is decided by one verdict read for the restore id (SCHEMA §Operation verdicts), and a
// verdict for another restore id is never taken as this one's.

export type RestoreView =
  | { phase: "idle" }
  | { phase: "restoring"; role: "self"; restoreId: string; step: RestoreStep | null }
  | { phase: "restoring"; role: "other"; restoreId: string }
  // The way out: the verdict said `finishing`, or the read failed. `Check again` reads once more.
  | { phase: "wayout"; role: "self" | "other"; restoreId: string; reading: boolean; readFailed: boolean };

/** What the dialog says after a restore that changed nothing. */
export type RestoreNotice = "account_changed" | "unsupported_format" | "rate_limited" | "not_applied";

export type RestoreState = { view: RestoreView; notice: RestoreNotice | null };

const INITIAL: RestoreState = { view: { phase: "idle" }, notice: null };
const STEP_ORDER: readonly RestoreStep[] = ["saving", "getting", "applying"];

export type RestoreController = ReturnType<typeof createRestoreController>;

export function createRestoreController(options: {
  client: Pick<BackupClient, "ensureFreshSession" | "restore" | "readRestoreVerdict">;
  slot: BackupSlot;
  channel: RestoreChannel;
  /** The signed-in user's id: a message from another user is ignored. */
  getUserId: () => string | null;
  /** Drops the snapshot and enters again (the user-change path). */
  reenter: () => void;
  /** The list is read again after a restore that did not apply (its etag may be stale). */
  refreshList: () => Promise<unknown>;
  newRestoreId?: () => string;
  edgeTimeoutMs?: number;
}) {
  const { client, slot, channel } = options;
  const newRestoreId = options.newRestoreId ?? (() => crypto.randomUUID());
  const edgeTimeoutMs = options.edgeTimeoutMs ?? EDGE_REQUEST_TIMEOUT_MS;
  let state: RestoreState = INITIAL;
  let epoch = slot.getEpoch();
  let otherTimer: ReturnType<typeof setTimeout> | null = null;
  const listeners = new Set<() => void>();

  const emit = () => {
    for (const l of [...listeners]) l();
  };
  const set = (next: Partial<RestoreState>) => {
    state = { ...state, ...next };
    emit();
  };
  const clearTimer = () => {
    if (otherTimer) clearTimeout(otherTimer);
    otherTimer = null;
  };
  const current = (mine: number) => mine === epoch;
  const idOf = (): string | null => (state.view.phase === "idle" ? null : state.view.restoreId);

  // A sign-out or an account change drops the flow; a late answer is ignored by its epoch.
  slot.subscribe(() => {
    if (slot.getEpoch() === epoch) return;
    epoch = slot.getEpoch();
    clearTimer();
    state = INITIAL;
    emit();
  });

  const userId = () => options.getUserId();

  /** Applied here: the other tabs re-enter through the message, this tab through `reenter`. */
  function endApplied(restoreId: string, role: "self" | "other") {
    clearTimer();
    const id = userId();
    if (role === "self" && id) channel.post({ type: "restore-ended", restoreId, userId: id, outcome: "applied" });
    set({ view: { phase: "idle" }, notice: null });
    options.reenter();
  }

  /** Nothing changed: back to the dialog (this tab) or unblocked (another tab). */
  function endUnchanged(restoreId: string, role: "self" | "other", notice: RestoreNotice) {
    clearTimer();
    const id = userId();
    if (role === "self") {
      if (id) channel.post({ type: "restore-ended", restoreId, userId: id, outcome: "not_applied" });
      set({ view: { phase: "idle" }, notice });
      void options.refreshList();
    } else {
      set({ view: { phase: "idle" }, notice: null });
    }
  }

  /** One verdict read for a restore id. */
  async function readVerdict(restoreId: string, role: "self" | "other") {
    const mine = epoch;
    set({ view: { phase: "wayout", role, restoreId, reading: true, readFailed: false } });
    const read = await client.readRestoreVerdict(restoreId);
    if (!current(mine) || idOf() !== restoreId) return;
    if (read.kind === "failed") {
      set({ view: { phase: "wayout", role, restoreId, reading: false, readFailed: true } });
      return;
    }
    switch (read.verdict) {
      case "applied":
      case "expired":
        // `expired`: the row is gone, so the account is read as it is.
        return endApplied(restoreId, role);
      case "finishing":
        set({ view: { phase: "wayout", role, restoreId, reading: false, readFailed: false } });
        return;
      case "account_changed":
      case "unsupported_format":
        return endUnchanged(restoreId, role, read.verdict);
      default:
        // `not_applied`, `not_started` or a verdict this client does not know.
        return endUnchanged(restoreId, role, "not_applied");
    }
  }

  function settle(restoreId: string, outcome: RestoreOutcome) {
    switch (outcome.kind) {
      case "applied":
        return endApplied(restoreId, "self");
      case "unknown":
        return void readVerdict(restoreId, "self");
      default:
        return endUnchanged(restoreId, "self", outcome.kind);
    }
  }

  channel.subscribe((message: RestoreMessage) => {
    const id = userId();
    if (id === null || message.userId !== id) return;
    // This tab's own restore decides itself.
    if (state.view.phase !== "idle" && state.view.role === "self") return;
    if (message.type === "restore-started") {
      if (state.view.phase !== "idle") return;
      const mine = epoch;
      const restoreId = message.restoreId;
      set({ view: { phase: "restoring", role: "other", restoreId }, notice: null });
      clearTimer();
      otherTimer = setTimeout(() => {
        otherTimer = null;
        if (current(mine) && idOf() === restoreId) void readVerdict(restoreId, "other");
      }, edgeTimeoutMs);
      return;
    }
    // `restore-ended`: the restore this tab waits on, or an applied one it never saw (a tab opened
    // mid-restore read the old snapshot).
    if (idOf() === message.restoreId) {
      if (message.outcome === "applied") return endApplied(message.restoreId, "other");
      clearTimer();
      set({ view: { phase: "idle" }, notice: null });
      return;
    }
    if (message.outcome === "applied" && state.view.phase === "idle") options.reenter();
  });

  return {
    getState: (): RestoreState => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    /** Starts a restore of a list entry. Order: session refresh, `restore-started`, send. */
    async start(file: string, etag: string): Promise<void> {
      if (state.view.phase !== "idle") return;
      const mine = epoch;
      const restoreId = newRestoreId();
      set({ view: { phase: "restoring", role: "self", restoreId, step: null }, notice: null });
      const fresh = await client.ensureFreshSession();
      if (!current(mine)) return;
      if (!fresh.ok) {
        // Nothing was sent and nothing is posted.
        set({ view: { phase: "idle" }, notice: "not_applied" });
        void options.refreshList();
        return;
      }
      channel.post({ type: "restore-started", restoreId, userId: fresh.userId });
      const outcome = await client.restore({
        restoreId,
        file,
        etag,
        onStep: (step) => {
          const view = state.view;
          if (!current(mine) || view.phase !== "restoring" || view.role !== "self" || view.restoreId !== restoreId) return;
          const reached = view.step === null ? -1 : STEP_ORDER.indexOf(view.step);
          if (STEP_ORDER.indexOf(step) > reached) set({ view: { ...view, step } });
        },
      });
      if (!current(mine) || idOf() !== restoreId) return;
      settle(restoreId, outcome);
    },

    /** `Check again` in the way out: one more verdict read, never a resend. */
    async checkAgain(): Promise<void> {
      const view = state.view;
      if (view.phase !== "wayout" || view.reading) return;
      await readVerdict(view.restoreId, view.role);
    },

    /** The dialog showed the notice, or the user moved on. */
    clearNotice(): void {
      if (state.notice !== null) set({ notice: null });
    },
  };
}
