import type { BackupClient, BackupEntry, StatusOutcome } from "@/lib/backup/backup-client";
import { isPendingOpen, type BackupSlot } from "@/lib/backup/backup-slot";

// The backup flows that outlive the dialog (SPEC §Account backup): the dialog's single status read,
// `Back Up Now` with a run id the client generates and never reuses, `already_running`, and the
// unknown-outcome path with exactly one verdict read per press of `Check again`. Closing the dialog
// stops none of them; the shared slot keeps the sidebar motion until this tab sees the result.
// A request is never resent.

export type Inline =
  | { kind: "none" }
  | { kind: "written" }
  | { kind: "unchanged" }
  | { kind: "failed"; reason: string | null }
  | { kind: "rate_limited" }
  | { kind: "already_running" }
  | { kind: "still_finishing" }
  | { kind: "not_started" };

export type DialogState = {
  /** The dialog's status read: `checking` until it answers, `failed` with `Check again`. */
  read: "idle" | "checking" | "failed";
  inline: Inline;
  /** A `Back Up Now` request or its verdict read is in flight. */
  busy: boolean;
  /** The restore list from the last plain read: `null` when the listing failed, `undefined` before any read. */
  backups?: BackupEntry[] | null;
};

const INITIAL: DialogState = { read: "idle", inline: { kind: "none" }, busy: false };

export type BackupController = ReturnType<typeof createBackupController>;

export function createBackupController(options: {
  client: BackupClient;
  slot: BackupSlot;
  newRunId?: () => string;
  /** One snapshot refetch (a read through the existing path, never a resend of the run). */
  refetchSnapshot?: () => Promise<unknown>;
}) {
  const { client, slot } = options;
  const newRunId = options.newRunId ?? (() => crypto.randomUUID());
  let state: DialogState = INITIAL;
  let epoch = slot.getEpoch();
  let opened = false;
  let statusRead: Promise<void> | null = null;
  const listeners = new Set<() => void>();

  const set = (next: Partial<DialogState>) => {
    state = { ...state, ...next };
    if (next.inline) inlineBaseline = slot.getState().value?.serverNow ?? 0;
    for (const l of [...listeners]) l();
  };

  // A sign-out or an account change drops every flow; a late answer is ignored by its epoch.
  // `Still finishing…` and `Backing up…` end when a newer value says no run is in progress (a
  // focus refetch, the dialog stays open), so the dialog never contradicts the sidebar (W4).
  let inlineBaseline = 0;
  const OPEN_RUN_INLINE = new Set(["still_finishing", "already_running"]);
  slot.subscribe(() => {
    if (slot.getEpoch() === epoch) {
      const value = slot.getState().value;
      if (OPEN_RUN_INLINE.has(state.inline.kind) && value && value.serverNow > inlineBaseline && value.runStartedAt === null) {
        set({ inline: { kind: "none" } });
      }
      return;
    }
    epoch = slot.getEpoch();
    opened = false;
    statusRead = null;
    state = INITIAL;
    for (const l of [...listeners]) l();
  });

  const current = (mine: number) => mine === epoch;

  function applyVerdict(runId: string, status: Extract<StatusOutcome, { kind: "ok" }>, mine: number) {
    if (status.backup !== undefined) slot.offer(status.backup, mine);
    const failedReason = status.backup?.failureReason ?? null;
    switch (status.verdict) {
      case "written":
        slot.endRun(runId);
        return { kind: "written" } as Inline;
      case "unchanged":
        slot.endRun(runId);
        return { kind: "unchanged" } as Inline;
      case "failed":
        slot.endRun(runId);
        return { kind: "failed", reason: failedReason } as Inline;
      case "interrupted":
        slot.endRun(runId);
        return { kind: "failed", reason: "interrupted" } as Inline;
      case "abandoned":
      case "not_started":
        slot.endRun(runId);
        return { kind: "not_started" } as Inline;
      default:
        // `running`, or a verdict this client does not know: the run may still be open.
        return { kind: "still_finishing" } as Inline;
    }
  }

  /** One status read for a run id, sent after that run's request ended. */
  async function verdictRead(runId: string, mine: number, onFail: Partial<DialogState>) {
    const status = await client.readStatus(runId);
    if (!current(mine)) return;
    if (status.kind === "failed") {
      set({ busy: false, ...onFail });
      return;
    }
    set({ busy: false, read: "idle", inline: applyVerdict(runId, status, mine) });
  }

  async function plainRead(mine: number) {
    if (statusRead) return statusRead;
    set({ read: "checking" });
    const run = (async () => {
      const status = await client.readStatus(null);
      if (!current(mine)) return;
      if (status.kind === "failed") {
        set({ read: "failed" });
        return;
      }
      if (status.backup !== undefined) slot.offer(status.backup, mine);
      set({ read: "idle", ...(status.backups !== undefined ? { backups: status.backups } : {}) });
    })().finally(() => {
      if (current(mine)) statusRead = null;
    });
    statusRead = run;
    return run;
  }

  const idleRun = () => {
    const p = slot.getState().pending;
    return p && !p.inFlight ? p.runId : null;
  };

  return {
    getState: (): DialogState => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    /** The dialog opened (account variant): one status read, or the verdict of an open run. */
    async open(): Promise<void> {
      if (opened) return;
      opened = true;
      if (state.busy) return;
      const mine = epoch;
      const runId = idleRun();
      set({ inline: { kind: "none" } });
      if (runId) {
        set({ read: "checking", busy: true });
        // No verdict, so nothing is inferred: the read failed and `Check again` reads it once more.
        await verdictRead(runId, mine, { read: "failed" });
        return;
      }
      await plainRead(mine);
    },

    close(): void {
      opened = false;
    },

    /**
     * One more plain read for the list, with no dialog line: after a restore that did not apply, its
     * etag may be stale (`backup_changed`). A read in flight is shared.
     */
    async refreshList(): Promise<void> {
      if (statusRead) return statusRead;
      const mine = epoch;
      const run = (async () => {
        const status = await client.readStatus(null);
        if (!current(mine)) return;
        if (status.kind === "failed") {
          // With no list yet, a failed read must not leave `Checking…` for ever: the list shows its
          // failure line with `Check again` (Task 262 expert review). A list already held stays.
          if (state.backups === undefined) set({ backups: null });
          return;
        }
        if (status.backup !== undefined) slot.offer(status.backup, mine);
        if (status.backups !== undefined) set({ backups: status.backups });
      })().finally(() => {
        if (current(mine)) statusRead = null;
      });
      statusRead = run;
      return run;
    },

    async backUpNow(): Promise<void> {
      // A second press never replaces the run id of this tab's open run.
      if (state.busy || isPendingOpen(slot.getState(), slot.nowMono())) return;
      const mine = epoch;
      const runId = newRunId();
      slot.beginRun(runId);
      set({ busy: true, read: "idle", inline: { kind: "none" } });
      const outcome = await client.backUpNow(runId);
      if (!current(mine)) return;
      slot.requestEnded(runId);
      switch (outcome.kind) {
        case "result": {
          if (outcome.backup !== undefined) slot.offer(outcome.backup, mine);
          // A success whose answer has no `backup` value (the function's follow-up read failed) would
          // leave the old, possibly red, value on screen: ask for one snapshot read to bring it.
          else if (outcome.result === "written" || outcome.result === "unchanged") void options.refetchSnapshot?.();
          slot.endRun(runId);
          const inline: Inline =
            outcome.result === "written"
              ? { kind: "written" }
              : outcome.result === "unchanged"
                ? { kind: "unchanged" }
                : outcome.result === "failed"
                  ? { kind: "failed", reason: outcome.reason }
                  : { kind: "not_started" };
          set({ busy: false, inline });
          return;
        }
        case "rejected":
          slot.endRun(runId);
          set({ busy: false, inline: { kind: outcome.code } });
          return;
        case "refused":
          slot.endRun(runId);
          set({ busy: false, inline: { kind: "not_started" } });
          return;
        case "unknown":
          // Never resent: one verdict read for this run id, after the request ended.
          await verdictRead(runId, mine, { read: "failed" });
          return;
      }
    },

    /** `Check again`: one more read, never a resend. */
    async checkAgain(): Promise<void> {
      if (state.busy) return;
      const mine = epoch;
      // Whenever this tab has a run open, its verdict is what `Check again` reads.
      const runId = idleRun();
      if (runId) {
        set({ busy: true, read: "checking", inline: { kind: "none" } });
        await verdictRead(runId, mine, { read: "failed" });
        return;
      }
      // `already_running` has no run id of ours.
      set({ inline: { kind: "none" } });
      await plainRead(mine);
    },
  };
}
