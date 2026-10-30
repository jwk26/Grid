import { REQUEST_TIMEOUT_MS } from "@/lib/constants";
import { AuthApiError, isAuthRetryableFetchError } from "@supabase/supabase-js";
import type { RequestResult } from "@/lib/db/connection-monitor";
import { bindConnectionEntry, getConnectionMonitor } from "@/lib/db/connection";
import { callEnsureAccount } from "@/lib/db/supabase-calls";
import { getSupabaseClient, type GriddoSupabaseClient } from "@/lib/db/supabase-client";
import { SnapshotStore, UnknownOutcomeError } from "@/lib/db/snapshot-store";

// Account entry (SPEC §Account entry, §Session expiry): the session, `ensure_account()` and the
// snapshot load, as one external store the app-level frame reads. Entry is one function that any
// trigger (first visit, Retry, reconnect, a user change in another tab) runs again from the top.

export type LoadFailureReason = "unreachable" | "other";
export type GuestFailureReason = "unreachable" | "rate-limit" | "turnstile" | "other";
export type SessionVariant = "guest" | "account";

export type EntryState =
  | { phase: "entering" }
  | { phase: "ready" }
  | { phase: "load-failure"; reason: LoadFailureReason }
  | { phase: "guest-failure"; reason: GuestFailureReason }
  | { phase: "session-expired"; variant: SessionVariant };

// The session-expired marker (SPEC §Session expiry): whether the lost session was a guest or a
// real account. No domain data. supabase-js clears its own session when a refresh is rejected,
// so without this a reload would start a new guest unasked.
export const SESSION_EXPIRED_KEY = "griddo.session-expired";
// The last signed-in user's kind, kept so the marker can name it after supabase-js has dropped
// the user (the SIGNED_OUT event carries no session).
export const SESSION_KIND_KEY = "griddo.session-kind";
// Set around a sign-out the visitor chose (`Continue as guest`), so other tabs do not read the
// resulting SIGNED_OUT as an expiry.
export const DELIBERATE_SIGN_OUT_KEY = "griddo.deliberate-sign-out";
const DELIBERATE_SIGN_OUT_WINDOW_MS = 30_000;
const GUEST_ENTRY_LOCK = "griddo-guest-entry";

type AuthUser = { id: string; is_anonymous?: boolean };

export type SessionControllerOptions = {
  getClient: () => GriddoSupabaseClient;
  storage: Storage;
  /** Runs `task` while no other tab runs one with the same name. */
  runExclusive?: <T>(name: string, task: () => Promise<T>) => Promise<T>;
  /** Runs an auth event handler outside supabase-js's callback (it must not call back into auth). */
  defer?: (task: () => void) => void;
  /** Told how each request to the server ended (SPEC §Connection states). */
  connection?: { report: (result: RequestResult, detail?: { snapshotRead?: boolean }) => void };
};

export type SessionController = ReturnType<typeof createSessionController>;

// Thrown inside the guest-entry lock when the entry was overtaken before it signed in.
class SupersededError extends Error {}

const UNREACHABLE_STATUSES: ReadonlySet<number> = new Set([0, 408, 502, 503, 504]);

function isUnreachable(error: unknown): boolean {
  if (isAuthRetryableFetchError(error) || error instanceof UnknownOutcomeError) return true;
  if (error instanceof TypeError) return true;
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === "number" && UNREACHABLE_STATUSES.has(status);
}

function classifyGuestFailure(error: unknown): GuestFailureReason {
  if (isUnreachable(error)) return "unreachable";
  const code = (error as { code?: unknown } | null)?.code;
  const status = (error as { status?: unknown } | null)?.status;
  if (typeof code === "string" && code.includes("captcha")) return "turnstile";
  if (status === 429 || (typeof code === "string" && code.includes("rate_limit"))) return "rate-limit";
  return "other";
}

// The auth server turned the session down (missing, invalid or revoked refresh token, user gone),
// as opposed to not being reachable.
function isSessionRejection(error: unknown): boolean {
  if (isUnreachable(error)) return false;
  return error instanceof AuthApiError && [400, 401, 403, 404].includes(error.status);
}

function defaultRunExclusive<T>(name: string, task: () => Promise<T>): Promise<T> {
  const locks = typeof navigator === "undefined" ? undefined : navigator.locks;
  if (!locks) return task();
  return locks.request(name, task) as Promise<T>;
}

export function createSessionController(options: SessionControllerOptions) {
  const { getClient, storage } = options;
  const runExclusive = options.runExclusive ?? defaultRunExclusive;
  const defer = options.defer ?? ((task: () => void) => void setTimeout(task, 0));

  // The failure kind of the last snapshot fetch, since `SnapshotStore.load()` answers only `failed`.
  let lastFetchUnreachable = false;
  const store = new SnapshotStore({
    fetchSnapshot: async () => {
      // A read that never answers must not hold the one shared in-flight refetch for ever: after
      // the request timeout it counts as no answer and the next refetch starts a new read.
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timedOut = new Promise<"timeout">((resolve) => {
        timer = setTimeout(() => resolve("timeout"), REQUEST_TIMEOUT_MS);
      });
      const answered = await Promise.race([getClient().rpc("get_snapshot"), timedOut]).finally(() =>
        clearTimeout(timer),
      );
      if (answered === "timeout") {
        lastFetchUnreachable = true;
        options.connection?.report("unreachable");
        throw new Error("get_snapshot failed: no answer");
      }
      const { data, error, status } = answered;
      if (error) {
        lastFetchUnreachable = isUnreachable({ status });
        // Only a missing answer counts toward offline; an answered failure only makes it unstable.
        options.connection?.report(lastFetchUnreachable ? "unreachable" : "degraded");
        throw new Error(`get_snapshot failed: ${error.message}`);
      }
      options.connection?.report("reachable", { snapshotRead: true });
      return data;
    },
    onRequestResult: (result) => options.connection?.report(result),
  });

  let state: EntryState = { phase: "entering" };
  const listeners = new Set<() => void>();
  let generation = 0;
  let currentUserId: string | null = null;
  let started = false;
  // A guest started after an expiry keeps skipping the marker through Retry and reconnect, until
  // the entry ends with a session.
  let skippingMarker = false;

  const setState = (next: EntryState) => {
    state = next;
    for (const listener of [...listeners]) listener();
  };

  const read = (key: string): string | null => {
    try {
      return storage.getItem(key);
    } catch {
      return null;
    }
  };
  const write = (key: string, value: string | null) => {
    try {
      if (value === null) storage.removeItem(key);
      else storage.setItem(key, value);
    } catch {
      // Storage can be blocked; the marker is then best-effort.
    }
  };
  const lastKind = (): SessionVariant => (read(SESSION_KIND_KEY) === "account" ? "account" : "guest");

  const expire = (variant: SessionVariant) => {
    skippingMarker = false;
    write(SESSION_EXPIRED_KEY, variant);
    currentUserId = null;
    setState({ phase: "session-expired", variant });
  };

  const remember = (user: AuthUser) => {
    currentUserId = user.id;
    write(SESSION_KIND_KEY, user.is_anonymous === false ? "account" : "guest");
  };

  async function enter(skipMarker = false): Promise<void> {
    skipMarker ||= skippingMarker;
    skippingMarker = skipMarker;
    const mine = ++generation;
    const stale = () => mine !== generation;
    setState({ phase: "entering" });
    if (!skipMarker) {
      const marker = read(SESSION_EXPIRED_KEY);
      if (marker) {
        setState({ phase: "session-expired", variant: marker === "account" ? "account" : "guest" });
        return;
      }
    }
    const client = getClient();

    const restored = await client.auth.getSession();
    if (stale()) return;
    let user: AuthUser | null = restored.data.session?.user ?? null;
    if (restored.error) {
      if (isSessionRejection(restored.error)) return expire(lastKind());
      const unreachable = isUnreachable(restored.error);
      if (unreachable) options.connection?.report("unreachable");
      return setState({ phase: "load-failure", reason: unreachable ? "unreachable" : "other" });
    }

    if (!user) {
      try {
        user = await runExclusive(GUEST_ENTRY_LOCK, async () => {
          // Another tab may have signed in while this one waited for the lock, or the session
          // may have been rejected meanwhile (SIGNED_OUT bumps `generation` and sets the marker).
          if (stale() || (!skipMarker && read(SESSION_EXPIRED_KEY))) throw new SupersededError();
          const again = await client.auth.getSession();
          if (again.data.session?.user) return again.data.session.user as AuthUser;
          const created = await client.auth.signInAnonymously();
          if (created.error || !created.data.user) throw created.error ?? new Error("no user");
          return created.data.user as AuthUser;
        });
      } catch (error) {
        if (error instanceof SupersededError || stale()) return;
        return setState({ phase: "guest-failure", reason: classifyGuestFailure(error) });
      }
      if (stale()) return;
    }
    remember(user);
    // An entry that skipped the marker ended with a session: the chosen action completed.
    if (skipMarker) write(SESSION_EXPIRED_KEY, null);
    skippingMarker = false;

    try {
      const ensured = await callEnsureAccount(client);
      if (stale()) return;
      if (ensured.status !== "applied" && ensured.status !== "already_applied") {
        return setState({ phase: "load-failure", reason: "other" });
      }
    } catch (error) {
      if (stale()) return;
      return setState({ phase: "load-failure", reason: isUnreachable(error) ? "unreachable" : "other" });
    }

    lastFetchUnreachable = false;
    const loaded = await store.load();
    if (stale()) return;
    if (loaded === "applied") return setState({ phase: "ready" });
    setState({
      phase: "load-failure",
      reason: loaded === "failed" && lastFetchUnreachable ? "unreachable" : "other",
    });
  }

  // Another tab's user change, or this tab's own expiry, drops everything built on the old user.
  const dropAndEnter = (skipMarker = false) => {
    generation += 1;
    store.reset();
    currentUserId = null;
    void enter(skipMarker);
  };

  const isDeliberateSignOut = () =>
    Date.now() - Number(read(DELIBERATE_SIGN_OUT_KEY) ?? 0) < DELIBERATE_SIGN_OUT_WINDOW_MS;

  const onAuthEvent = (event: string, session: { user: AuthUser } | null) => {
    if (event === "SIGNED_OUT") {
      if (isDeliberateSignOut()) {
        // A chosen sign-out: a user change. The choosing tab's own entry is superseded by an
        // identical one; the lock keeps it to one guest.
        dropAndEnter(true);
        return;
      }
      generation += 1;
      store.reset();
      expire(lastKind());
      return;
    }
    if ((event === "SIGNED_IN" || event === "USER_UPDATED") && session?.user) {
      // On the session-expired screen there is no current user: a guest started in another tab
      // ends the expiry (its entry clears the marker).
      if (state.phase === "session-expired") dropAndEnter(true);
      else if (currentUserId !== null && session.user.id !== currentUserId) dropAndEnter();
    }
  };

  const retryIfFailed = () => {
    if (state.phase === "load-failure" || state.phase === "guest-failure") void enter();
  };

  return {
    store,
    getState: (): EntryState => state,
    /** The kind of the last signed-in user (the account icon's glyph). */
    getVariant: (): SessionVariant => lastKind(),
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    /** Subscribes to auth events and the browser's `online` event once, then runs entry. */
    start(): Promise<void> {
      if (started) return Promise.resolve();
      started = true;
      getClient().auth.onAuthStateChange((event, session) => {
        const user = session as { user: AuthUser } | null;
        // An expiry is recorded in this tick: supabase-js delivers SIGNED_OUT and then lets
        // getSession() continue at once, so a deferred handler would run after entry had already
        // signed in a new guest. Nothing in that path calls back into auth.
        if (event === "SIGNED_OUT" && !isDeliberateSignOut()) onAuthEvent(event, user);
        else defer(() => onAuthEvent(event, user));
      });
      if (typeof window !== "undefined") window.addEventListener("online", retryIfFailed);
      return enter();
    },
    retry(): Promise<void> {
      return enter();
    },
    /** Session-expired and account-state screens: sign out, then start a new guest. */
    async continueAsGuest(): Promise<void> {
      // The key lapses by its timestamp: other tabs read it when the event reaches them, which can
      // be after this call has returned.
      write(DELIBERATE_SIGN_OUT_KEY, String(Date.now()));
      generation += 1;
      store.reset();
      currentUserId = null;
      await getClient().auth.signOut();
      await enter(true);
    },
    /** Resolves once the account is loaded; waits through a re-entry after a user change. */
    whenReady(): Promise<void> {
      if (state.phase === "ready") return Promise.resolve();
      return new Promise((resolve) => {
        const unsubscribe = this.subscribe(() => {
          if (state.phase === "ready") {
            unsubscribe();
            resolve();
          }
        });
      });
    },
  };
}

let controller: SessionController | null = null;

export function getSessionController(): SessionController {
  if (!controller) {
    const connection = getConnectionMonitor();
    controller = createSessionController({ getClient: getSupabaseClient, storage: window.localStorage, connection });
    const created = controller;
    bindConnectionEntry({ refetch: () => created.store.refetch(), isReady: () => created.getState().phase === "ready" });
  }
  return controller;
}

export function resetSessionControllerForTests(): void {
  controller = null;
}
