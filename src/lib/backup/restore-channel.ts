// The browser's other tabs follow a restore through a `BroadcastChannel` (SPEC §Account backup,
// Restore; backup B4). Every message carries the user id, so a tab ignores another user's. Without
// `BroadcastChannel` (a server render, an old browser) the channel is silent and a tab waits for
// its own way-out.

export type RestoreMessage =
  | { type: "restore-started"; restoreId: string; userId: string }
  | { type: "restore-ended"; restoreId: string; userId: string; outcome: "applied" | "not_applied" };

// A cancelled account deletion (SPEC §Deletion-grace dialog): the tabs of the browser that show the
// dialog repeat entry. The session controller owns it; the restore controller ignores it.
export type DeletionCancelledMessage = { type: "deletion-cancelled"; userId: string };

export type ChannelMessage = RestoreMessage | DeletionCancelledMessage;

export type RestoreChannel = {
  post: (message: ChannelMessage) => void;
  subscribe: (listener: (message: ChannelMessage) => void) => () => void;
};

export const RESTORE_CHANNEL_NAME = "griddo.restore";

function isMessage(value: unknown): value is ChannelMessage {
  if (typeof value !== "object" || value === null) return false;
  const m = value as Record<string, unknown>;
  if (m.type === "deletion-cancelled") return typeof m.userId === "string";
  if (typeof m.restoreId !== "string" || typeof m.userId !== "string") return false;
  if (m.type === "restore-started") return true;
  return m.type === "restore-ended" && (m.outcome === "applied" || m.outcome === "not_applied");
}

export function createRestoreChannel(name = RESTORE_CHANNEL_NAME): RestoreChannel {
  if (typeof BroadcastChannel === "undefined") return { post: () => undefined, subscribe: () => () => undefined };
  const channel = new BroadcastChannel(name);
  const listeners = new Set<(message: ChannelMessage) => void>();
  channel.onmessage = (event: MessageEvent) => {
    if (!isMessage(event.data)) return;
    for (const listener of [...listeners]) listener(event.data);
  };
  return {
    post: (message) => {
      try {
        channel.postMessage(message);
      } catch {
        // A closed channel: the other tabs wait for their own way-out.
      }
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
