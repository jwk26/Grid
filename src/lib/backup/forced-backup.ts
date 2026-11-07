"use client";

import { useSyncExternalStore } from "react";
import type { BackupInjection } from "@/lib/backup/backup-client";
import type { DialogState } from "@/lib/backup/backup-controller";
import type { DerivedBackup } from "@/lib/backup/backup-slot";

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
] as const;

export type BackupScenario = (typeof BACKUP_SCENARIOS)[number];

export type ForcedBackup = Readonly<{
  scenario: BackupScenario;
  derived: DerivedBackup;
  dialog: DialogState;
}>;

const HOUR = 3_600_000;
const IDLE: DialogState = { read: "idle", inline: { kind: "none" }, busy: false };

function derived(extra: Partial<DerivedBackup>): DerivedBackup {
  return { line: "green", dot: null, running: false, lastFileAt: Date.now() - 3 * HOUR, reason: null, nextChangeIn: null, ...extra };
}

/** What a scenario shows. The times are real timestamps a few hours or days back. */
export function forcedBackupOf(scenario: BackupScenario): ForcedBackup {
  const make = (d: Partial<DerivedBackup>, dialog: Partial<DialogState> = {}): ForcedBackup => ({
    scenario,
    derived: derived(d),
    dialog: { ...IDLE, ...dialog },
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
