import { describe, expect, it, vi } from "vitest";
import type { BackupClient, ManualOutcome, StatusOutcome } from "@/lib/backup/backup-client";
import { createBackupController } from "@/lib/backup/backup-controller";
import { BACKUP_INTERRUPTED_MS } from "@/lib/constants";
import { BackupSlot, type BackupValue } from "@/lib/backup/backup-slot";

const value = (extra: Partial<BackupValue> = {}): BackupValue => ({
  runStartedAt: null,
  lastCheckedAt: 1000,
  lastFileAt: 1000,
  lastResult: "written",
  failureReason: null,
  serverNow: 2000,
  ...extra,
});

type Deferred<T> = { promise: Promise<T>; resolve: (v: T) => void };
function deferred<T>(): Deferred<T> {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

function setup() {
  const backUpNow = vi.fn<(runId: string) => Promise<ManualOutcome>>();
  const readStatus = vi.fn<(runId: string | null) => Promise<StatusOutcome>>();
  const client = { backUpNow, readStatus } as unknown as BackupClient;
  const slot = new BackupSlot({ now: () => 0 });
  slot.offer(value(), slot.getEpoch());
  let n = 0;
  const controller = createBackupController({ client, slot, newRunId: () => `run-${++n}` });
  return { controller, slot, backUpNow, readStatus };
}

describe("the dialog's status read", () => {
  it("reads once on open, shows Checking… until it answers, and offers the value to the slot", async () => {
    const { controller, slot, readStatus } = setup();
    const d = deferred<StatusOutcome>();
    readStatus.mockReturnValue(d.promise);
    const opening = controller.open();
    expect(controller.getState().read).toBe("checking");
    d.resolve({ kind: "ok", backup: value({ serverNow: 3000, lastResult: "failed", failureReason: "x" }), verdict: null });
    await opening;
    expect(controller.getState().read).toBe("idle");
    expect(slot.getState().value?.lastResult).toBe("failed");
    expect(readStatus).toHaveBeenCalledTimes(1);
    expect(readStatus).toHaveBeenCalledWith(null);
  });

  it("a second open while open, and an open-close-open in flight, read only once", async () => {
    const { controller, readStatus } = setup();
    const d = deferred<StatusOutcome>();
    readStatus.mockReturnValue(d.promise);
    const a = controller.open();
    void controller.open();
    controller.close();
    const b = controller.open();
    d.resolve({ kind: "ok", backup: undefined, verdict: null });
    await Promise.all([a, b]);
    expect(readStatus).toHaveBeenCalledTimes(1);
  });

  it("a failed read shows the failure, and Check again reads once more", async () => {
    const { controller, readStatus } = setup();
    readStatus.mockResolvedValueOnce({ kind: "failed" });
    await controller.open();
    expect(controller.getState().read).toBe("failed");
    readStatus.mockResolvedValueOnce({ kind: "ok", backup: undefined, verdict: null });
    await controller.checkAgain();
    expect(controller.getState().read).toBe("idle");
    expect(readStatus).toHaveBeenCalledTimes(2);
  });
});

describe("Back Up Now", () => {
  it("sends a fresh run id each press, is busy while pending and never presses twice at once", async () => {
    const { controller, slot, backUpNow } = setup();
    const d = deferred<ManualOutcome>();
    backUpNow.mockReturnValueOnce(d.promise);
    const first = controller.backUpNow();
    expect(controller.getState().busy).toBe(true);
    expect(slot.getState().pending).toMatchObject({ runId: "run-1", inFlight: true });
    await controller.backUpNow();
    expect(backUpNow).toHaveBeenCalledTimes(1);
    d.resolve({ kind: "result", result: "unchanged", reason: null, backup: value({ serverNow: 3000 }) });
    await first;
    expect(controller.getState()).toMatchObject({ busy: false, inline: { kind: "unchanged" } });
    expect(slot.getState().pending).toBeNull();
    backUpNow.mockResolvedValueOnce({ kind: "rejected", code: "rate_limited" });
    await controller.backUpNow();
    expect(backUpNow.mock.calls.map((c) => c[0])).toEqual(["run-1", "run-2"]);
    expect(controller.getState().inline).toEqual({ kind: "rate_limited" });
  });

  it("a written result clears a red value at once", async () => {
    const { controller, slot, backUpNow } = setup();
    slot.offer(value({ serverNow: 2500, lastResult: "failed", failureReason: "x" }), slot.getEpoch());
    backUpNow.mockResolvedValue({ kind: "result", result: "written", reason: null, backup: value({ serverNow: 3000 }) });
    await controller.backUpNow();
    expect(slot.getState().value?.lastResult).toBe("written");
    expect(controller.getState().inline).toEqual({ kind: "written" });
  });

  it("failed shows the reason; abandoned, a refusal and a rejection other than the two show did-not-start", async () => {
    const { controller, backUpNow } = setup();
    backUpNow.mockResolvedValueOnce({ kind: "result", result: "failed", reason: "too_large", backup: undefined });
    await controller.backUpNow();
    expect(controller.getState().inline).toEqual({ kind: "failed", reason: "too_large" });
    backUpNow.mockResolvedValueOnce({ kind: "result", result: "abandoned", reason: null, backup: undefined });
    await controller.backUpNow();
    expect(controller.getState().inline).toEqual({ kind: "not_started" });
    backUpNow.mockResolvedValueOnce({ kind: "refused" });
    await controller.backUpNow();
    expect(controller.getState().inline).toEqual({ kind: "not_started" });
  });

  it("a result with no backup value leaves the slot as it is and sends no extra request", async () => {
    const { controller, slot, backUpNow, readStatus } = setup();
    const before = slot.getState().value;
    backUpNow.mockResolvedValue({ kind: "result", result: "written", reason: null, backup: undefined });
    await controller.backUpNow();
    expect(slot.getState().value).toBe(before);
    expect(readStatus).not.toHaveBeenCalled();
  });

  it("already_running: Check again reads the status with no run id and never shows did-not-start", async () => {
    const { controller, slot, backUpNow, readStatus } = setup();
    backUpNow.mockResolvedValue({ kind: "rejected", code: "already_running" });
    await controller.backUpNow();
    expect(controller.getState().inline).toEqual({ kind: "already_running" });
    expect(slot.getState().pending).toBeNull();
    readStatus.mockResolvedValue({ kind: "ok", backup: value({ serverNow: 3000, runStartedAt: 2900 }), verdict: null });
    await controller.checkAgain();
    expect(readStatus).toHaveBeenCalledWith(null);
    expect(controller.getState().inline).toEqual({ kind: "none" });
  });
});

describe("unknown outcome", () => {
  it("is never resent: one verdict read for that run id after the request ended", async () => {
    const { controller, slot, backUpNow, readStatus } = setup();
    backUpNow.mockResolvedValue({ kind: "unknown" });
    readStatus.mockResolvedValue({ kind: "ok", backup: value({ serverNow: 3000, runStartedAt: 2990 }), verdict: "running" });
    await controller.backUpNow();
    expect(backUpNow).toHaveBeenCalledTimes(1);
    expect(readStatus).toHaveBeenCalledTimes(1);
    expect(readStatus).toHaveBeenCalledWith("run-1");
    expect(controller.getState().inline).toEqual({ kind: "still_finishing" });
    expect(slot.getState().pending).toMatchObject({ runId: "run-1", inFlight: false });
  });

  it("running keeps the motion; Check again is another single read that can settle it", async () => {
    const { controller, slot, backUpNow, readStatus } = setup();
    backUpNow.mockResolvedValue({ kind: "unknown" });
    readStatus.mockResolvedValueOnce({ kind: "ok", backup: value({ serverNow: 3000, runStartedAt: 2990 }), verdict: "running" });
    await controller.backUpNow();
    readStatus.mockResolvedValueOnce({ kind: "ok", backup: value({ serverNow: 4000 }), verdict: "written" });
    await controller.checkAgain();
    expect(readStatus).toHaveBeenCalledTimes(2);
    expect(readStatus).toHaveBeenLastCalledWith("run-1");
    expect(controller.getState().inline).toEqual({ kind: "written" });
    expect(slot.getState().pending).toBeNull();
    expect(backUpNow).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["interrupted", { kind: "failed", reason: "interrupted" }],
    ["not_started", { kind: "not_started" }],
    ["abandoned", { kind: "not_started" }],
    ["unchanged", { kind: "unchanged" }],
  ])("verdict %s", async (verdict, inline) => {
    const { controller, slot, backUpNow, readStatus } = setup();
    backUpNow.mockResolvedValue({ kind: "unknown" });
    readStatus.mockResolvedValue({ kind: "ok", backup: undefined, verdict });
    await controller.backUpNow();
    expect(controller.getState().inline).toEqual(inline);
    expect(slot.getState().pending).toBeNull();
  });

  it("a verdict read that fails shows the failed read, not Still finishing…, and Check again reads this run's verdict", async () => {
    const { controller, slot, backUpNow, readStatus } = setup();
    backUpNow.mockResolvedValue({ kind: "unknown" });
    readStatus.mockResolvedValueOnce({ kind: "failed" });
    await controller.backUpNow();
    expect(controller.getState()).toMatchObject({ busy: false, read: "failed", inline: { kind: "none" } });
    expect(slot.getState().pending).toMatchObject({ runId: "run-1" });
    readStatus.mockResolvedValueOnce({ kind: "ok", backup: value({ serverNow: 4000 }), verdict: "written" });
    await controller.checkAgain();
    expect(readStatus).toHaveBeenLastCalledWith("run-1");
    expect(controller.getState()).toMatchObject({ read: "idle", inline: { kind: "written" } });
  });

  it("Back Up Now is refused while this tab's run is open, until its verdict or the threshold", async () => {
    const t = { now: 0 };
    const client = { backUpNow: vi.fn(), readStatus: vi.fn() } as unknown as BackupClient;
    const slot = new BackupSlot({ now: () => t.now });
    let n = 0;
    const controller = createBackupController({ client, slot, newRunId: () => `run-${++n}` });
    (client.backUpNow as ReturnType<typeof vi.fn>).mockResolvedValue({ kind: "unknown" });
    (client.readStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
      kind: "ok",
      backup: value({ serverNow: 3000, runStartedAt: 2990 }),
      verdict: "running",
    });
    await controller.backUpNow();
    await controller.backUpNow();
    expect(client.backUpNow).toHaveBeenCalledTimes(1);
    expect(slot.getState().pending?.runId).toBe("run-1");
    t.now = BACKUP_INTERRUPTED_MS + 1;
    await controller.backUpNow();
    expect(client.backUpNow).toHaveBeenCalledTimes(2);
    expect(slot.getState().pending?.runId).toBe("run-2");
  });

  it("closing the dialog keeps the run; reopening reads the run's verdict instead of a plain read", async () => {
    const { controller, slot, backUpNow, readStatus } = setup();
    backUpNow.mockResolvedValue({ kind: "unknown" });
    readStatus.mockResolvedValueOnce({ kind: "ok", backup: value({ serverNow: 3000, runStartedAt: 2990 }), verdict: "running" });
    await controller.backUpNow();
    controller.close();
    expect(slot.getState().pending).not.toBeNull();
    readStatus.mockResolvedValueOnce({ kind: "ok", backup: value({ serverNow: 4000 }), verdict: "written" });
    await controller.open();
    expect(readStatus).toHaveBeenLastCalledWith("run-1");
    expect(controller.getState().inline).toEqual({ kind: "written" });
  });
});

describe("sign-out", () => {
  it("drops the flow, and a late answer is ignored", async () => {
    const { controller, slot, backUpNow } = setup();
    const d = deferred<ManualOutcome>();
    backUpNow.mockReturnValue(d.promise);
    const pending = controller.backUpNow();
    slot.reset();
    expect(controller.getState()).toMatchObject({ busy: false, inline: { kind: "none" } });
    d.resolve({ kind: "result", result: "written", reason: null, backup: value({ serverNow: 9999 }) });
    await pending;
    expect(slot.getState()).toMatchObject({ known: false, value: null, pending: null });
    expect(controller.getState().inline).toEqual({ kind: "none" });
  });
});
