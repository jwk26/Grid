import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  BACKUP_SCENARIOS,
  forcedBackupOf,
  registerBackupInjectionSource,
  registerForcedBackup,
  takeBackupInjection,
  useForcedBackup,
} from "@/lib/backup/forced-backup";
import { useStateSwitchStore } from "@/lib/dev/state-switch";

afterEach(() => {
  registerForcedBackup(null);
  registerBackupInjectionSource(null);
  useStateSwitchStore.getState().reset();
});

describe("forced backup seam", () => {
  it("is null with nothing registered, and follows the panel", () => {
    const { result } = renderHook(() => useForcedBackup());
    expect(result.current).toBeNull();
    act(() => registerForcedBackup("red"));
    expect(result.current?.derived).toMatchObject({ line: "red", dot: "failed" });
    act(() => registerForcedBackup(null));
    expect(result.current).toBeNull();
  });

  it("covers every dot and line, running, Checking…, a failed read, already_running, Still finishing… and not_started", () => {
    const states = Object.fromEntries(BACKUP_SCENARIOS.map((s) => [s, forcedBackupOf(s)]));
    expect(states.yellow.derived.dot).toBe("stale");
    expect(states.red.derived.dot).toBe("failed");
    expect(states["red-too-large"].derived.reason).toBe("too_large");
    expect(states.gray.derived.line).toBe("gray");
    expect(states.running.derived.running).toBe(true);
    expect(states.checking.dialog.read).toBe("checking");
    expect(states["read-failed"].dialog.read).toBe("failed");
    expect(states["already-running"].dialog.inline.kind).toBe("already_running");
    expect(states["still-finishing"].dialog.inline.kind).toBe("still_finishing");
    expect(states["not-started"].dialog.inline.kind).toBe("not_started");
  });

  it("gives no injection without a source", () => {
    expect(takeBackupInjection("manual")).toBeNull();
  });

  it("the switch store hands each queued injection to the next call of its operation, once", () => {
    const store = useStateSwitchStore.getState();
    registerBackupInjectionSource((op) => useStateSwitchStore.getState().takeBackupInjection(op));
    store.queueBackupInjection("status-failed");
    store.queueBackupInjection("unknown-after-send");
    expect(takeBackupInjection("manual")).toBe("unknown-after-send");
    expect(takeBackupInjection("manual")).toBeNull();
    expect(takeBackupInjection("status")).toBe("status-failed");
    expect(takeBackupInjection("status")).toBeNull();
  });
});
