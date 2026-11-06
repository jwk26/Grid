import { describe, expect, it, vi } from "vitest";
import { BACKUP_INTERRUPTED_MS, BACKUP_STALE_MS } from "@/lib/constants";
import { BackupSlot, deriveBackup, parseBackupValue, type BackupValue } from "@/lib/backup/backup-slot";

const DAY = 86_400_000;
const value = (extra: Partial<BackupValue> = {}): BackupValue => ({
  runStartedAt: null,
  lastCheckedAt: 1_000_000,
  lastFileAt: 1_000_000,
  lastResult: "written",
  failureReason: null,
  serverNow: 1_000_000,
  ...extra,
});

function clock(start = 0) {
  let t = start;
  return { now: () => t, advance: (ms: number) => void (t += ms) };
}

describe("parseBackupValue", () => {
  it("reads the server's snake_case value", () => {
    expect(
      parseBackupValue({
        run_started_at: 5,
        last_checked_at: 4,
        last_file_at: 3,
        last_result: "failed",
        failure_reason: "too_large",
        server_now: 9,
        extra: 1,
      }),
    ).toEqual({ runStartedAt: 5, lastCheckedAt: 4, lastFileAt: 3, lastResult: "failed", failureReason: "too_large", serverNow: 9 });
  });
  it("null stays null and a value without server_now is unreadable", () => {
    expect(parseBackupValue(null)).toBeNull();
    expect(parseBackupValue(undefined)).toBeUndefined();
    expect(parseBackupValue({ last_result: "written" })).toBeUndefined();
    expect(parseBackupValue("x")).toBeUndefined();
  });
});

describe("BackupSlot", () => {
  it("starts unknown, then takes the first value", () => {
    const slot = new BackupSlot({ now: clock().now });
    expect(slot.getState().known).toBe(false);
    slot.offer(value(), slot.getEpoch());
    expect(slot.getState().known).toBe(true);
    expect(slot.getState().value?.serverNow).toBe(1_000_000);
  });

  it("the later server_now wins and an older one never overwrites", () => {
    const slot = new BackupSlot({ now: clock().now });
    const epoch = slot.getEpoch();
    slot.offer(value({ serverNow: 2000, lastResult: "failed", failureReason: "x" }), epoch);
    slot.offer(value({ serverNow: 1000, lastResult: "written" }), epoch);
    expect(slot.getState().value?.lastResult).toBe("failed");
    slot.offer(value({ serverNow: 3000, lastResult: "written" }), epoch);
    expect(slot.getState().value?.lastResult).toBe("written");
  });

  it("a snapshot's null never clears a value it already holds", () => {
    const slot = new BackupSlot({ now: clock().now });
    const epoch = slot.getEpoch();
    slot.offer(null, epoch);
    expect(slot.getState()).toMatchObject({ known: true, value: null });
    slot.offer(value(), epoch);
    slot.offer(null, epoch);
    expect(slot.getState().value).not.toBeNull();
  });

  it("ignores an offer from before a reset", () => {
    const slot = new BackupSlot({ now: clock().now });
    const old = slot.getEpoch();
    slot.reset();
    slot.offer(value(), old);
    expect(slot.getState().known).toBe(false);
  });

  it("reset clears the value and the pending run", () => {
    const slot = new BackupSlot({ now: clock().now });
    slot.offer(value(), slot.getEpoch());
    slot.beginRun("r1");
    slot.reset();
    expect(slot.getState()).toMatchObject({ known: false, value: null, pending: null });
  });

  it("a newer value with no run in progress ends a pending run that has no request in flight", () => {
    const slot = new BackupSlot({ now: clock().now });
    const epoch = slot.getEpoch();
    slot.offer(value({ serverNow: 1000 }), epoch);
    slot.beginRun("r1");
    slot.offer(value({ serverNow: 2000 }), epoch);
    expect(slot.getState().pending).not.toBeNull(); // the request is still open
    slot.requestEnded("r1");
    slot.offer(value({ serverNow: 3000 }), epoch);
    expect(slot.getState().pending).toBeNull();
  });

  it("notifies subscribers and gives a stable state between changes", () => {
    const slot = new BackupSlot({ now: clock().now });
    const listener = vi.fn();
    slot.subscribe(listener);
    const first = slot.getState();
    expect(slot.getState()).toBe(first);
    slot.offer(value(), slot.getEpoch());
    expect(listener).toHaveBeenCalledTimes(1);
    expect(slot.getState()).not.toBe(first);
  });
});

describe("deriveBackup", () => {
  const base = { known: true, arrivedAt: 0, pending: null } as const;

  it("is gray with no row and no dot", () => {
    const d = deriveBackup({ ...base, value: null }, 0);
    expect(d).toMatchObject({ line: "gray", dot: null, running: false });
  });

  it("is green within 7 days, with no dot", () => {
    const d = deriveBackup({ ...base, value: value() }, 0);
    expect(d).toMatchObject({ line: "green", dot: null, lastFileAt: 1_000_000 });
  });

  it("goes yellow when the last check is older than 7 days, judged from server_now plus monotonic time", () => {
    const v = value({ lastCheckedAt: 1_000_000, serverNow: 1_000_000 + BACKUP_STALE_MS - 1000 });
    expect(deriveBackup({ ...base, value: v }, 0).dot).toBeNull();
    expect(deriveBackup({ ...base, value: v }, 1001)).toMatchObject({ line: "yellow", dot: "stale" });
  });

  it("is red when the last run failed, with the reason", () => {
    const d = deriveBackup({ ...base, value: value({ lastResult: "failed", failureReason: "too_large" }) }, 0);
    expect(d).toMatchObject({ line: "red", dot: "failed", reason: "too_large" });
  });

  it("shows running while a run is younger than the interrupted threshold, then not", () => {
    const v = value({ runStartedAt: 1_000_000 - 1000, serverNow: 1_000_000 });
    expect(deriveBackup({ ...base, value: v }, 0)).toMatchObject({ running: true, line: "running", dot: null });
    expect(deriveBackup({ ...base, value: v }, BACKUP_INTERRUPTED_MS - 1000)).toMatchObject({ running: true });
    expect(deriveBackup({ ...base, value: v }, BACKUP_INTERRUPTED_MS - 1000 + 1).running).toBe(false);
  });

  it("a red or yellow dot wins over the running motion, but the status line says running", () => {
    const v = value({ runStartedAt: 999_000, lastResult: "failed", failureReason: "x" });
    expect(deriveBackup({ ...base, value: v }, 0)).toMatchObject({ running: true, dot: "failed", line: "running" });
  });

  it("this tab's pending run counts as running for the interrupted threshold", () => {
    const state = { ...base, value: value(), pending: { runId: "r", startedAt: 0, inFlight: false } };
    expect(deriveBackup(state, 10)).toMatchObject({ running: true, line: "running" });
    expect(deriveBackup(state, BACKUP_INTERRUPTED_MS + 1).running).toBe(false);
  });

  it("names the next moment the answer changes, so a timer can re-render with no request", () => {
    const running = value({ runStartedAt: 999_000, serverNow: 1_000_000 });
    expect(deriveBackup({ ...base, value: running }, 0).nextChangeIn).toBe(BACKUP_INTERRUPTED_MS - 1000 + 1);
    const fresh = value({ serverNow: 1_000_000 });
    expect(deriveBackup({ ...base, value: fresh }, 0).nextChangeIn).toBe(BACKUP_STALE_MS + 1);
    expect(deriveBackup({ ...base, value: null }, 0).nextChangeIn).toBeNull();
  });

  it("moving the device clock changes nothing: only the monotonic reading is an input", () => {
    vi.useFakeTimers();
    const state = { ...base, value: value({ runStartedAt: 999_000 }) };
    const before = deriveBackup(state, 5);
    vi.setSystemTime(new Date(Date.now() + 3_600_000));
    expect(deriveBackup(state, 5)).toEqual(before);
    vi.useRealTimers();
    expect(DAY).toBeGreaterThan(0);
  });
});
