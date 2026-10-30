import { toast } from "sonner";
import { offlineToastIcon } from "@/components/feedback/toast-icons";
import type { ToastRow, ToastTone } from "@/lib/copy/feedback";

// The one toast helper (SPEC §Toasts, feedback F13, F14, F16). It owns kinds, bursts and time;
// sonner only draws. Sonner pauses on stack hover and a hidden tab but not on focus, and an
// update with the same id resumes the remaining time instead of restarting it, so every toast
// goes to sonner with `duration: Infinity` and the helper dismisses it by id.

const SUCCESS_MS = 4000;
const LONG_MS = 6000;
/** Also the Toaster's `visibleToasts`. */
export const MAX_LIVE_TOASTS = 3;

export type ToastPauseReason = "pointer" | "focus";

type Entry = {
  id: string;
  count: number;
  duration: number;
  remaining: number;
  startedAt: number | null;
  timer: ReturnType<typeof setTimeout> | null;
};

// Insertion order is age order, so the first entry is the oldest.
const live = new Map<string, Entry>();
const pausedBy = new Set<ToastPauseReason>();
let sequence = 0;
let listening = false;

const publishers: Record<ToastTone, typeof toast.success> = {
  success: toast.success,
  failure: toast.error,
  warning: toast.warning,
};

const isPaused = () => pausedBy.size > 0 || (typeof document !== "undefined" && document.hidden);

function stop(entry: Entry) {
  if (entry.timer !== null) clearTimeout(entry.timer);
  if (entry.startedAt !== null) entry.remaining -= Date.now() - entry.startedAt;
  entry.timer = null;
  entry.startedAt = null;
}

function start(key: string, entry: Entry) {
  if (isPaused()) return;
  entry.startedAt = Date.now();
  entry.timer = setTimeout(() => close(key), Math.max(entry.remaining, 0));
}

// Removes the entry first, so the dismiss callbacks sonner raises find nothing left to remove.
function close(key: string) {
  const entry = live.get(key);
  if (!entry) return;
  stop(entry);
  live.delete(key);
  toast.dismiss(entry.id);
}

function syncPause() {
  for (const [key, entry] of live) {
    if (isPaused()) stop(entry);
    else if (entry.timer === null) start(key, entry);
  }
}

function listen() {
  if (listening || typeof document === "undefined") return;
  listening = true;
  document.addEventListener("visibilitychange", syncPause);
}

/** The Toaster reports the pointer over the stack and focus inside it. */
export function setToastPaused(reason: ToastPauseReason, paused: boolean) {
  if (paused) pausedBy.add(reason);
  else pausedBy.delete(reason);
  syncPause();
}

/** Shows one toast of a copy row. A repeat of its key while visible updates that toast. */
export function showToast<Args extends unknown[]>(row: ToastRow<Args>, ...args: Args) {
  listen();

  let entry = live.get(row.key);
  if (entry) {
    stop(entry);
    entry.count += 1;
    entry.remaining = entry.duration;
  } else {
    while (live.size >= MAX_LIVE_TOASTS) close(live.keys().next().value as string);
    const duration = row.tone === "success" ? SUCCESS_MS : LONG_MS;
    entry = { id: `toast-${(sequence += 1)}`, count: 1, duration, remaining: duration, startedAt: null, timer: null };
    live.set(row.key, entry);
  }

  const text = entry.count > 1 && row.counted ? row.counted(entry.count) : row.single(...args);
  const { id } = entry;
  const onGone = () => {
    // The key may already show a newer toast; only the one that left is forgotten.
    const current = live.get(row.key);
    if (current?.id !== id) return;
    stop(current);
    live.delete(row.key);
  };
  publishers[row.tone](text, {
    id,
    duration: Infinity,
    closeButton: row.tone !== "success",
    icon: row.glyph === "wifi-off" ? offlineToastIcon : undefined,
    onDismiss: onGone,
    onAutoClose: onGone,
  });
  start(row.key, entry);
}

/** Forgets every toast and pause (tests). */
export function resetToasts() {
  for (const entry of live.values()) stop(entry);
  live.clear();
  pausedBy.clear();
}
