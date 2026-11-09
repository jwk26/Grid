// The deletion grace period on the client (SPEC §Deletion-grace dialog; deletion-grace Decisions 1,
// 6, 7, 10). The server records the request time and answers with its own time; the countdown runs
// from that server time, so a wrong device clock does not move it.

export const DELETION_GRACE_MS = 24 * 60 * 60 * 1000;

/** What the dialog needs to run: the server's times and when this tab received them. */
export type DeletionClock = {
  /** `accounts.deletion_requested_at`, epoch milliseconds. */
  requestedAt: number;
  /** The server's time when it answered, epoch milliseconds. */
  serverNow: number;
  /** `performance.now()` when the answer arrived. */
  receivedMono: number;
  /** `Date.now()` when the answer arrived. */
  receivedWall: number;
};

export const deletionDeadline = (clock: Pick<DeletionClock, "requestedAt">): number =>
  clock.requestedAt + DELETION_GRACE_MS;

/**
 * Milliseconds left to cancel. The time since receipt is the larger of the monotonic and the wall
 * elapsed time: a system sleep pauses `performance.now()` in some browsers, and counting only that
 * would show more time left than the truth. This differs from flow review G1 on purpose: G1 chose
 * the server's time as the base, and this only decides how the time since receipt is measured.
 */
export function deletionRemainingMs(clock: DeletionClock, monoNow: number, wallNow: number): number {
  const elapsed = Math.max(monoNow - clock.receivedMono, wallNow - clock.receivedWall, 0);
  return Math.max(0, deletionDeadline(clock) - (clock.serverNow + elapsed));
}

/** `hh:mm:ss`, a partial second counted as a whole one. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}

/** The rejection's added fields, or null when either is missing or not a number. */
export function deletionFieldsOf(
  rejection: { code?: unknown; deletion_requested_at?: unknown; server_now?: unknown } | undefined,
): { requestedAt: number; serverNow: number } | null {
  const requestedAt = rejection?.deletion_requested_at;
  const serverNow = rejection?.server_now;
  if (typeof requestedAt !== "number" || !Number.isFinite(requestedAt)) return null;
  if (typeof serverNow !== "number" || !Number.isFinite(serverNow)) return null;
  return { requestedAt, serverNow };
}
