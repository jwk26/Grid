"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createBackupClient } from "@/lib/backup/backup-client";
import { takeBackupInjection, useForcedBackup } from "@/lib/backup/forced-backup";
import { createBackupController, type BackupController, type DialogState } from "@/lib/backup/backup-controller";
import { deriveBackup, isPendingOpen, type BackupSlot, type BackupSlotState, type DerivedBackup } from "@/lib/backup/backup-slot";
import { getSessionController } from "@/lib/auth/session";
import { getSupabaseClient } from "@/lib/db/supabase-client";

// The hook components use for the sidebar Backup button and its dialog (SPEC §Account backup). It
// only subscribes: the state lives in the account's backup slot (`SnapshotStore.backup`) and the
// flows in the controller, so closing the dialog stops neither.

type Runtime = { slot: BackupSlot; controller: BackupController };
let runtime: Runtime | null = null;

function getRuntime(): Runtime {
  const slot = getSessionController().store.backup;
  if (!runtime || runtime.slot !== slot) {
    const client = createBackupClient({ getClient: getSupabaseClient, takeInjection: takeBackupInjection });
    runtime = { slot, controller: createBackupController({ client, slot, refetchSnapshot: () => getSessionController().store.refetch() }) };
  }
  return runtime;
}

export function resetBackupRuntimeForTests(): void {
  runtime = null;
}

// setTimeout stores its delay in 32 bits; longer waits fire at once.
const MAX_TIMER_MS = 2 ** 31 - 1;

export type UseBackup = {
  derived: DerivedBackup;
  slot: BackupSlotState;
  dialog: DialogState;
  /** False while a request or this tab's open run holds the button busy. */
  canBackUpNow: boolean;
  open: () => void;
  close: () => void;
  backUpNow: () => void;
  checkAgain: () => void;
};

export function useBackup(injected?: Runtime): UseBackup {
  const { slot, controller } = injected ?? getRuntime();
  const slotState = useSyncExternalStore(slot.subscribe, slot.getState, slot.getState);
  const dialog = useSyncExternalStore(controller.subscribe, controller.getState, controller.getState);
  const derived = deriveBackup(slotState, slot.nowMono());

  // One timer at the next moment the answer changes, so the motion ends and the yellow dot appears
  // with no request of its own (SPEC §Running motion).
  const [, setTick] = useState(0);
  const nextChangeIn = derived.nextChangeIn;
  useEffect(() => {
    if (nextChangeIn === null) return;
    const timer = setTimeout(() => setTick((n) => n + 1), Math.min(nextChangeIn, MAX_TIMER_MS));
    return () => clearTimeout(timer);
  }, [nextChangeIn, slotState]);

  // The development switch can force a state; always null in production (forced-backup.ts).
  const forced = useForcedBackup();

  // Stable for the life of the controller, so an effect can depend on them.
  const [actions] = useState(() => ({
    open: () => void controller.open(),
    close: () => controller.close(),
    backUpNow: () => void controller.backUpNow(),
    checkAgain: () => void controller.checkAgain(),
  }));

  return {
    derived: forced?.derived ?? derived,
    slot: slotState,
    dialog: forced?.dialog ?? dialog,
    canBackUpNow: !dialog.busy && !isPendingOpen(slotState, slot.nowMono()) && !(forced && forced.dialog.read !== "idle"),
    ...actions,
  };
}
