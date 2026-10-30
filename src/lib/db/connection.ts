import { useSyncExternalStore } from "react";
import { REQUEST_TIMEOUT_MS } from "@/lib/constants";
import { ConnectionMonitor, type ConnectionState } from "@/lib/db/connection-monitor";

// The one connection monitor of the app (SPEC §Connection states). The session controller binds
// the snapshot refetch and the readiness test when it is created; everything else reads the
// monitor from here. The monitor is created on first use and started by `providers.tsx`.

type EntryBinding = { refetch: () => Promise<unknown>; isReady: () => boolean };
let entry: EntryBinding | null = null;

export function bindConnectionEntry(binding: EntryBinding): void {
  entry = binding;
}

const NO_ANSWER_STATUSES: ReadonlySet<number> = new Set([408, 502, 503, 504]);

// Supabase Auth's health endpoint: lightweight, no SQL function, answered by the same host
// (user decision, 2026-10-30). Any answer that is not a gateway failure shows the server is up.
export async function probeServer(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: key },
      cache: "no-store",
      signal: controller.signal,
    });
    return !NO_ANSWER_STATUSES.has(response.status);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

let monitor: ConnectionMonitor | null = null;

export function getConnectionMonitor(): ConnectionMonitor {
  monitor ??= new ConnectionMonitor({
    probe: probeServer,
    refetch: () => (entry ? entry.refetch() : Promise.resolve()),
    isReady: () => entry?.isReady() ?? false,
    isBrowserOnline: () => typeof navigator === "undefined" || navigator.onLine,
  });
  return monitor;
}

/** The connection state, for components (Task 234 reads it for the badge). */
export function useConnectionState(): ConnectionState {
  const m = getConnectionMonitor();
  return useSyncExternalStore(m.subscribe, m.getState, () => "normal" as const);
}
