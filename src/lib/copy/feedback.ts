// Toast, app-state and blocking copy (SPEC §Feedback copy). Later tasks add
// their sentences here.

/**
 * `target` is the Node whose Grid receives the item: the current Node, the
 * parent chosen for a Bit created from L0, or `Home` for a Node created at L0.
 */
export function createDialogNoEmptyCell(target: string): string {
  return `“${target}” has no empty cell. Move or delete an item to make room.`;
}

// App-level screens (SPEC §Feedback copy, App-level screens). The Loading screen's copy comes
// with Task 234.
const UNREACHABLE_REASON = "The server can't be reached. Check your connection and try again.";

export const LOAD_FAILURE = {
  title: "Couldn't load your grid.",
  reason: {
    unreachable: UNREACHABLE_REASON,
    other: "Something went wrong while loading.",
  },
  retry: "Retry",
} as const;

export const GUEST_CREATION_FAILURE = {
  title: "Couldn't start a guest session.",
  reason: {
    turnstile: "The security check didn't pass.",
    "rate-limit": "Too many guest sessions were started from this network. Try again later.",
    unreachable: UNREACHABLE_REASON,
    other: "Something went wrong while loading.",
  },
  retry: "Retry",
} as const;

export const SESSION_EXPIRED = {
  account: {
    title: "Your sign-in expired.",
    reason: "Your saved data is safe. The last change may not have been saved.",
  },
  guest: {
    title: "Your guest session ended.",
    reason: "Guest data may have been deleted. You can start a new guest session or sign in.",
  },
  continueAsGuest: "Continue as guest",
} as const;
