import { toastCopy } from "@/lib/copy/feedback";
import { getConnectionMonitor } from "@/lib/db/connection";
import { showToast } from "@/lib/feedback/toast";

/** The offline write-attempt toast (SPEC §Connection states, F18): warning, crossed Wi-Fi, grouped. */
export function reportOfflineWrite(): void {
  showToast(toastCopy.offlineWrite);
}

/**
 * For a write entry that does not go through the store's `send()` (the Inbox commands, the inline
 * editor): true when the app is offline. It then has already shown the toast; the caller changes
 * nothing and keeps what was typed.
 */
export function blockedWhileOffline(): boolean {
  if (!getConnectionMonitor().isOffline()) return false;
  reportOfflineWrite();
  return true;
}
