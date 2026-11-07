"use client";

import { useSyncExternalStore } from "react";
import type { BackupInjection } from "@/lib/backup/backup-client";
import type { DialogState } from "@/lib/backup/backup-controller";
import type { DerivedBackup } from "@/lib/backup/backup-slot";
import type { RestoreState } from "@/lib/backup/restore-controller";

/**
 * The seam between the backup surfaces and the development state switch (feedback F30, SPEC
 * §Development state switch). Like `forced-item-status`, it is part of the production bundle on
 * purpose: a tiny registry with no development logic. It returns `null` and no injection unless
 * the development panel has registered something; the switch store and the panel never enter a
 * production build.
 */

export const BACKUP_SCENARIOS = [
  "green",
  "yellow",
  "red",
  "red-too-large",
  "gray",
  "running",
  "checking",
  "read-failed",
  "already-running",
  "still-finishing",
  "not-started",
  // Phase 53: the dialog's list and the restoring screen, forced for a look. Nothing is posted on the
  // channel and nothing is sent: the real controller stays idle.
  "restore-list",
  "restore-list-empty",
  "restore-list-failed",
  "restoring-saving",
  "restoring-getting",
  "restoring-applying",
  "restoring-other-tab",
  "restore-finishing",
  "restore-read-failed",
  "restore-account-changed",
  "restore-unsupported",
  "restore-not-applied",
] as const;

export type BackupScenario = (typeof BACKUP_SCENARIOS)[number];

export type ForcedBackup = Readonly<{
  scenario: BackupScenario;
  derived: DerivedBackup;
  dialog: DialogState;
  /** A forced restore state, or undefined to leave the real one. */
  restore?: RestoreState;
}>;

const HOUR = 3_600_000;
const IDLE: DialogState = { read: "idle", inline: { kind: "none" }, busy: false };

function derived(extra: Partial<DerivedBackup>): DerivedBackup {
  return { line: "green", dot: null, running: false, lastFileAt: Date.now() - 3 * HOUR, reason: null, nextChangeIn: null, ...extra };
}

// A list for the look. The etags never match a real object, so a forced restore applies nothing.
const FORCED_LIST = [
  { name: "2026-11-07", kind: "daily" as const, at: Date.now() - 3 * HOUR, size: 1, etag: "forced" },
  { name: "pre-restore/2026-11-06T09-00-00Z", kind: "pre_restore" as const, at: Date.now() - 30 * HOUR, size: 1, etag: "forced" },
  { name: "2026-11-06", kind: "daily" as const, at: Date.now() - 27 * HOUR, size: 1, etag: "forced" },
];

/** What a scenario shows. The times are real timestamps a few hours or days back. */
export function forcedBackupOf(scenario: BackupScenario): ForcedBackup {
  const make = (d: Partial<DerivedBackup>, dialog: Partial<DialogState> = {}, restore?: RestoreState): ForcedBackup => ({
    scenario,
    derived: derived(d),
    dialog: { ...IDLE, ...dialog },
    ...(restore ? { restore } : {}),
  });
  const idle: RestoreState["view"] = { phase: "idle" };
  const self = (step: "saving" | "getting" | "applying"): RestoreState => ({
    view: { phase: "restoring", role: "self", restoreId: "forced", step },
    notice: null,
  });
  const wayout = (readFailed: boolean): RestoreState => ({
    view: { phase: "wayout", role: "self", restoreId: "forced", reading: false, readFailed },
    notice: null,
  });
  switch (scenario) {
    case "green":
      return make({});
    case "yellow":
      return make({ line: "yellow", dot: "stale", lastFileAt: Date.now() - 9 * 24 * HOUR });
    case "red":
      return make({ line: "red", dot: "failed", reason: "export_failed" });
    case "red-too-large":
      return make({ line: "red", dot: "failed", reason: "too_large" });
    case "gray":
      return make({ line: "gray", lastFileAt: null });
    case "running":
      return make({ line: "running", running: true });
    case "checking":
      return make({}, { read: "checking" });
    case "read-failed":
      return make({}, { read: "failed" });
    case "already-running":
      return make({}, { inline: { kind: "already_running" } });
    case "still-finishing":
      return make({ line: "running", running: true }, { inline: { kind: "still_finishing" } });
    case "not-started":
      return make({}, { inline: { kind: "not_started" } });
    case "restore-list":
      return make({}, { backups: FORCED_LIST });
    case "restore-list-empty":
      return make({}, { backups: [] });
    case "restore-list-failed":
      return make({}, { backups: null });
    case "restoring-saving":
      return make({}, {}, self("saving"));
    case "restoring-getting":
      return make({}, {}, self("getting"));
    case "restoring-applying":
      return make({}, {}, self("applying"));
    case "restoring-other-tab":
      return make({}, {}, { view: { phase: "restoring", role: "other", restoreId: "forced" }, notice: null });
    case "restore-finishing":
      return make({}, {}, wayout(false));
    case "restore-read-failed":
      return make({}, {}, wayout(true));
    case "restore-account-changed":
      return make({}, { backups: FORCED_LIST }, { view: idle, notice: "account_changed" });
    case "restore-unsupported":
      return make({}, { backups: FORCED_LIST }, { view: idle, notice: "unsupported_format" });
    case "restore-not-applied":
      return make({}, { backups: FORCED_LIST }, { view: idle, notice: "not_applied" });
  }
}

const listeners = new Set<() => void>();
let forced: ForcedBackup | null = null;
let injectionSource: ((operation: "manual" | "status" | "restore") => BackupInjection | null) | null = null;

/** Called by the development panel only. */
export function registerForcedBackup(scenario: BackupScenario | null): void {
  forced = scenario === null ? null : forcedBackupOf(scenario);
  for (const listener of [...listeners]) listener();
}

/** Called by the development panel only: where the next boundary injection comes from. */
export function registerBackupInjectionSource(source: typeof injectionSource): void {
  injectionSource = source;
}

/** The injection for the next call of `operation`, consumed once; always null in production. */
export function takeBackupInjection(operation: "manual" | "status" | "restore"): BackupInjection | null {
  return injectionSource?.(operation) ?? null;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The scenario forced by the development switch, or `null` (always `null` in production). */
export function useForcedBackup(): ForcedBackup | null {
  return useSyncExternalStore(subscribe, () => forced, () => null);
}
