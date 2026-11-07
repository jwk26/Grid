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

  it("forces the restoring screen at each step, the other tab, the way-out and each returned line; none posts anything", () => {
    const view = (n: (typeof BACKUP_SCENARIOS)[number]) => forcedBackupOf(n).restore?.view;
    expect(view("restoring-saving")).toMatchObject({ phase: "restoring", role: "self", step: "saving" });
    expect(view("restoring-getting")).toMatchObject({ step: "getting" });
    expect(view("restoring-applying")).toMatchObject({ step: "applying" });
    expect(view("restoring-other-tab")).toMatchObject({ phase: "restoring", role: "other" });
    expect(view("restore-finishing")).toMatchObject({ phase: "wayout", readFailed: false });
    expect(view("restore-read-failed")).toMatchObject({ phase: "wayout", readFailed: true });
    expect(forcedBackupOf("restore-account-changed").restore?.notice).toBe("account_changed");
    expect(forcedBackupOf("restore-unsupported").restore?.notice).toBe("unsupported_format");
    expect(forcedBackupOf("restore-not-applied").restore?.notice).toBe("not_applied");
    expect(forcedBackupOf("restore-list").dialog.backups).toHaveLength(3);
    expect(forcedBackupOf("restore-list-empty").dialog.backups).toEqual([]);
    expect(forcedBackupOf("restore-list-failed").dialog.backups).toBeNull();
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
