import { useTriageStore } from "@/stores/triage-store";

// Whether the address still names the old user's data (ids in the path, `?bit=`). The address
// itself is changed by the app frame through the Next router: a bare `history.replaceState` would
// only change the URL while the router keeps rendering the old route.
let homeReturnPending = false;

/**
 * What the app keeps for the old user's session starts over when the user changes (sign-out,
 * expiry, another account in another tab): the Inbox app-session state (Phase 50 mi-1), and the
 * address, which the frame returns to Home before anything of the new user renders.
 */
export function resetAppForUserChange(): void {
  useTriageStore.getState().resetAppSession();
  homeReturnPending = true;
}

/** True once per user change: the caller then moves the router to Home. */
export function takeHomeReturn(): boolean {
  const pending = homeReturnPending;
  homeReturnPending = false;
  return pending;
}
