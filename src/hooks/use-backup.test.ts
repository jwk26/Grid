import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useBackup, useRestore } from "@/hooks/use-backup";
import { registerForcedBackup } from "@/lib/backup/forced-backup";
import type { BackupClient } from "@/lib/backup/backup-client";
import { createBackupController } from "@/lib/backup/backup-controller";
import { BackupSlot, type BackupValue } from "@/lib/backup/backup-slot";
import { BACKUP_INTERRUPTED_MS } from "@/lib/constants";

const value = (extra: Partial<BackupValue> = {}): BackupValue => ({
  runStartedAt: null,
  lastCheckedAt: 1000,
  lastFileAt: 1000,
  lastResult: "written",
  failureReason: null,
  serverNow: 2000,
  ...extra,
});

let mono = 0;
function setup() {
  const client = { backUpNow: vi.fn(), readStatus: vi.fn() } as unknown as BackupClient;
  const slot = new BackupSlot({ now: () => mono });
  const controller = createBackupController({ client, slot });
  return { runtime: { slot, controller }, slot, client };
}

beforeEach(() => {
  vi.useFakeTimers();
  mono = 0;
});
afterEach(() => vi.useRealTimers());

describe("useBackup", () => {
  it("follows the slot: a value that arrives changes the dot with no request of its own", () => {
    const { runtime, slot, client } = setup();
    const { result } = renderHook(() => useBackup(runtime));
    expect(result.current.derived).toMatchObject({ line: "gray", dot: null });
    act(() => slot.offer(value({ lastResult: "failed", failureReason: "x" }), slot.getEpoch()));
    expect(result.current.derived).toMatchObject({ line: "red", dot: "failed" });
    expect(client.readStatus).not.toHaveBeenCalled();
    expect(client.backUpNow).not.toHaveBeenCalled();
  });

  it("ends the running motion at the interrupted threshold with one timer and no request", () => {
    const { runtime, slot, client } = setup();
    slot.offer(value({ runStartedAt: 1500, serverNow: 2000 }), slot.getEpoch());
    const { result } = renderHook(() => useBackup(runtime));
    expect(result.current.derived.running).toBe(true);
    act(() => {
      mono += BACKUP_INTERRUPTED_MS;
      vi.advanceTimersByTime(BACKUP_INTERRUPTED_MS);
    });
    expect(result.current.derived.running).toBe(false);
    expect(client.readStatus).not.toHaveBeenCalled();
  });

  it("moving only the device clock by an hour changes neither the dot nor the motion", () => {
    const { runtime, slot } = setup();
    slot.offer(value({ runStartedAt: 1500, serverNow: 2000, lastResult: "failed", failureReason: "x" }), slot.getEpoch());
    const { result, rerender } = renderHook(() => useBackup(runtime));
    const before = result.current.derived;
    vi.setSystemTime(new Date(Date.now() + 3_600_000));
    rerender();
    expect(result.current.derived).toEqual(before);
    expect(before).toMatchObject({ running: true, dot: "failed" });
  });

  it("keeps the motion while this tab's run is pending, with the dialog closed", async () => {
    const { runtime, slot, client } = setup();
    let finish!: (v: unknown) => void;
    (client.backUpNow as ReturnType<typeof vi.fn>).mockReturnValue(new Promise((r) => (finish = r)));
    const { result } = renderHook(() => useBackup(runtime));
    act(() => result.current.backUpNow());
    expect(result.current.derived.running).toBe(true);
    act(() => result.current.close());
    expect(result.current.derived.running).toBe(true);
    await act(async () => {
      finish({ kind: "result", result: "written", reason: null, backup: value({ serverNow: 3000 }) });
    });
    expect(result.current.derived.running).toBe(false);
    expect(slot.getState().pending).toBeNull();
  });

  it("opening the dialog sends one status read", async () => {
    const { runtime, client } = setup();
    (client.readStatus as ReturnType<typeof vi.fn>).mockResolvedValue({ kind: "ok", backup: undefined, verdict: null });
    const { result, rerender } = renderHook(() => useBackup(runtime));
    await act(async () => result.current.open());
    rerender();
    rerender();
    expect(client.readStatus).toHaveBeenCalledTimes(1);
    expect(result.current.dialog.read).toBe("idle");
  });
});

describe("useRestore under a forced state", () => {
  it("sends nothing: a forced list's entries are not real files", () => {
    const idle = { view: { phase: "idle" as const }, notice: null };
    const restore = { subscribe: () => () => undefined, getState: () => idle, start: vi.fn(), checkAgain: vi.fn(), clearNotice: vi.fn() };
    const { result } = renderHook(() => useRestore({ restore: restore as never }));
    result.current.start("2026-11-07", "e");
    expect(restore.start).toHaveBeenCalledTimes(1);
    act(() => registerForcedBackup("restore-list"));
    result.current.start("2026-11-07", "forced");
    expect(restore.start).toHaveBeenCalledTimes(1);
    act(() => registerForcedBackup(null));
    result.current.start("2026-11-07", "e");
    expect(restore.start).toHaveBeenCalledTimes(2);
  });
});
