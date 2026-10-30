import { REQUEST_TIMEOUT_MS } from "@/lib/constants";
import { AuthApiError, isAuthRetryableFetchError } from "@supabase/supabase-js";
import type { RequestResult } from "@/lib/db/connection-monitor";
import { bindConnectionEntry, getConnectionMonitor } from "@/lib/db/connection";
import { callDeleteMyAccount, callEnsureAccount } from "@/lib/db/supabase-calls";
import { getSupabaseClient, type GriddoSupabaseClient } from "@/lib/db/supabase-client";
import { SnapshotStore, UnknownOutcomeError, type AccountRejectionCode } from "@/lib/db/snapshot-store";
import { resetAppForUserChange } from "@/lib/auth/user-change";
import { CaptchaError, getAppTurnstile, type CaptchaProvider } from "@/lib/auth/turnstile";

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
  // Turnstile needs an interactive check; the app-level frame shows its widget (SPEC §Account entry).
  | { phase: "security-check" }
  | { phase: "session-expired"; variant: SessionVariant }
  // A function answered `account_deleting` (the deletion was requested, its rows go within 24
  // hours) or `account_missing` (the account is gone). Both replace the app (SPEC §App-level screens).
  | { phase: "account-deleting" }
  | { phase: "account-deleted" };

export type OAuthProvider = "github" | "google";

export type AccountDeletionResult = "requested" | "failed" | "unknown";

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
// Set in this tab (`sessionStorage`, so no other tab reacts) before leaving for an OAuth provider and
// cleared by every return; a return with neither a code nor an error is a cancelled sign-in
// (SPEC §Account icon and modal; user, 2026-10-31).
export const SIGN_IN_STARTED_KEY = "griddo.sign-in-started";
// A marker older than this is a sign-in that never left the page; it no longer reads as a return.
const SIGN_IN_STARTED_WINDOW_MS = 15 * 60_000;
const GUEST_ENTRY_LOCK = "griddo-guest-entry";

type AuthUser = {
  id: string;
  is_anonymous?: boolean;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

// The account modal's title: the name the provider gave, else the email. A guest has none.
function accountNameOf(user: AuthUser): string | null {
  if (user.is_anonymous !== false) return null;
  for (const key of ["full_name", "name", "user_name"]) {
    const value = user.user_metadata?.[key];
    if (typeof value === "string" && value.trim() !== "") return value.trim();
  }
  return user.email?.trim() || null;
}

export type SessionControllerOptions = {
  getClient: () => GriddoSupabaseClient;
  storage: Storage;
  /** This tab's own storage (`sessionStorage`); defaults to the window's. */
  tabStorage?: Storage;
  /** Runs `task` while no other tab runs one with the same name. */
  runExclusive?: <T>(name: string, task: () => Promise<T>) => Promise<T>;
  /** Runs an auth event handler outside supabase-js's callback (it must not call back into auth). */
  defer?: (task: () => void) => void;
  /**
   * Told when the user changed (sign-out, expiry, another account in another tab): whatever the
   * app keeps for the old user's session starts over, e.g. the Inbox selection.
   */
  onUserChange?: () => void;
  /** Turnstile for the anonymous sign-in; none means no check (tests, and a local app without a site key). */
  captcha?: CaptchaProvider | null;
  /** The address bar, read and cleaned at entry; tests inject one. */
  location?: { get: () => URL; replace: (relativeUrl: string) => void };
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
  if (error instanceof CaptchaError) {
    // A script that cannot load, or a widget that cannot reach Cloudflare, is a network problem when offline.
    return typeof navigator !== "undefined" && !navigator.onLine ? "unreachable" : "turnstile";
  }
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
    onAccountRejection: (code) => showAccountState(code),
  });

  let state: EntryState = { phase: "entering" };
  const listeners = new Set<() => void>();
  let generation = 0;
  let currentUserId: string | null = null;
  let accountName: string | null = null;
  let started = false;
  // A guest started after an expiry keeps skipping the marker through Retry and reconnect, until
  // the entry ends with a session.
  let skippingMarker = false;
  // An OAuth sign-in that did not complete: the account modal reopens once with its inline error.
  let signInError = false;

  const address = options.location ?? {
    get: () => new URL(window.location.href),
    replace: (relativeUrl: string) => window.history.replaceState(null, "", relativeUrl),
  };

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
  const tab = (): Storage | undefined => {
    try {
      return options.tabStorage ?? (typeof window === "undefined" ? undefined : window.sessionStorage);
    } catch {
      return undefined;
    }
  };
  const readTab = (key: string): string | null => {
    try {
      return tab()?.getItem(key) ?? null;
    } catch {
      return null;
    }
  };
  const writeTab = (key: string, value: string | null) => {
    try {
      if (value === null) tab()?.removeItem(key);
      else tab()?.setItem(key, value);
    } catch {
      // Storage can be blocked; the marker is then best-effort.
    }
  };
  // Takes the marker back and says whether it was recent enough to mean a return without finishing.
  const takeSignInStarted = (): boolean => {
    const started = Number(readTab(SIGN_IN_STARTED_KEY));
    writeTab(SIGN_IN_STARTED_KEY, null);
    return Number.isFinite(started) && started > 0 && Date.now() - started < SIGN_IN_STARTED_WINDOW_MS;
  };
  const signInErrorListeners = new Set<() => void>();
  const lastKind = (): SessionVariant => (read(SESSION_KIND_KEY) === "account" ? "account" : "guest");

  // A read or write was answered with an account rejection: the snapshot goes, and so does any
  // entry in flight. The user stays known, so another account signing in from another tab still
  // repeats entry.
  function showAccountState(code: AccountRejectionCode) {
    generation += 1;
    store.reset();
    setState({ phase: code === "account_deleting" ? "account-deleting" : "account-deleted" });
  }

  const expire = (variant: SessionVariant) => {
    options.onUserChange?.();
    skippingMarker = false;
    write(SESSION_EXPIRED_KEY, variant);
    currentUserId = null;
    setState({ phase: "session-expired", variant });
  };

  const remember = (user: AuthUser) => {
    currentUserId = user.id;
    accountName = accountNameOf(user);
    write(SESSION_KIND_KEY, user.is_anonymous === false ? "account" : "guest");
  };

  // The provider's return (SPEC §Account icon and modal): `?code=` to exchange, or an error. Both
  // are removed from the address. A finished exchange is the chosen action completing, so it
  // skips the session-expired marker; a cancel or error keeps whatever session there was.
  async function takeOAuthReturn(): Promise<"signed-in" | "failed" | "none"> {
    const url = address.get();
    const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
    const code = url.searchParams.get("code");
    const errored = ["error", "error_code", "error_description"].some(
      (key) => url.searchParams.has(key) || hash.has(key),
    );
    // Every return clears the marker; a return with neither a code nor an error, with the marker
    // present, is the visitor coming back without finishing (the Back button).
    const startedHere = takeSignInStarted();
    if (code === null && !errored) return startedHere ? "failed" : "none";
    for (const key of ["code", "error", "error_code", "error_description"]) url.searchParams.delete(key);
    for (const key of ["error", "error_code", "error_description"]) hash.delete(key);
    const rest = hash.toString();
    address.replace(`${url.pathname}${url.search}${rest ? `#${rest}` : ""}`);
    if (errored || code === null) return "failed";
    const exchanged = await getClient().auth.exchangeCodeForSession(code);
    return exchanged.error ? "failed" : "signed-in";
  }

  async function enter(skipMarker = false): Promise<void> {
    skipMarker ||= skippingMarker;
    skippingMarker = skipMarker;
    const mine = ++generation;
    const stale = () => mine !== generation;
    setState({ phase: "entering" });
    const returned = await takeOAuthReturn();
    if (stale()) return;
    if (returned === "signed-in") skipMarker = skippingMarker = true;
    if (!skipMarker) {
      const marker = read(SESSION_EXPIRED_KEY);
      if (marker) {
        setState({ phase: "session-expired", variant: marker === "account" ? "account" : "guest" });
        return;
      }
    }
    // With a marker the expired screen returns instead; the modal only reopens over a session.
    if (returned === "failed") signInError = true;
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
          // A fresh token per attempt; an interactive check shows the widget in its own screen.
          const captchaToken = await options.captcha?.solve({
            onInteractive: () => {
              if (!stale()) setState({ phase: "security-check" });
            },
            onInteractiveEnd: () => {
              if (!stale()) setState({ phase: "entering" });
            },
          });
          if (stale()) throw new SupersededError();
          const created = await (captchaToken
            ? client.auth.signInAnonymously({ options: { captchaToken } })
            : client.auth.signInAnonymously());
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
    // The modal's error line says the guest stays; over an account (another tab finished a sign-in) it would lie.
    if (user.is_anonymous === false) signInError = false;
    // An entry that skipped the marker ended with a session: the chosen action completed.
    if (skipMarker) write(SESSION_EXPIRED_KEY, null);
    skippingMarker = false;

    try {
      const ensured = await callEnsureAccount(client);
      if (stale()) return;
      if (ensured.status !== "applied" && ensured.status !== "already_applied") {
        const code = ensured.rejection?.code;
        if (code === "account_missing" || code === "account_deleting") return showAccountState(code);
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
    options.onUserChange?.();
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
      // An account screen stays: the account is gone, which is why the refresh was refused.
      if (state.phase === "account-deleting" || state.phase === "account-deleted") return;
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

  async function signOutToGuest(): Promise<void> {
    // The key lapses by its timestamp: other tabs read it when the event reaches them, which can
    // be after this call has returned.
    write(DELIBERATE_SIGN_OUT_KEY, String(Date.now()));
    generation += 1;
    store.reset();
    currentUserId = null;
    options.onUserChange?.();
    // Nothing of the old user may render while the sign-out request is open.
    setState({ phase: "entering" });
    // This browser only: the default `global` scope would revoke every session of the account, so a
    // second profile still signed in would show the session-expired screen instead of the
    // account-being-deleted screen (SPEC §Account icon and modal; user, 2026-10-30).
    await getClient().auth.signOut({ scope: "local" });
    await enter(true);
  }

  const retryIfFailed = () => {
    if (state.phase === "load-failure" || state.phase === "guest-failure") void enter();
  };

  return {
    store,
    getState: (): EntryState => state,
    /** The kind of the last signed-in user (the account icon's glyph). */
    getVariant: (): SessionVariant => lastKind(),
    /** The signed-in account's name for the modal title; null for a guest or a nameless account. */
    getAccountName: (): string | null => accountName,
    /** Whether a sign-in did not complete, without consuming it (safe in a render). */
    hasSignInError: (): boolean => signInError,
    /** True once after a sign-in that did not complete; the account modal then reopens. */
    takeSignInError(): boolean {
      const flagged = signInError;
      signInError = false;
      return flagged;
    },
    /** Told when a sign-in did not complete while the app is already showing (a back-forward-cache restore). */
    subscribeSignInError(listener: () => void): () => void {
      signInErrorListeners.add(listener);
      return () => signInErrorListeners.delete(listener);
    },
    /** Hands the visitor to the provider; the page leaves, and `/` receives the return. */
    async signInWithOAuth(provider: OAuthProvider): Promise<"started" | "failed"> {
      // The marker is written before leaving; a start that cannot happen takes it back.
      writeTab(SIGN_IN_STARTED_KEY, String(Date.now()));
      // auth-js reports a start that cannot happen by throwing, not by `error`.
      try {
        const { error } = await getClient().auth.signInWithOAuth({
          provider,
          // The provider's account chooser every time, so a visitor is not sent straight back as
          // the account the browser is already signed in to (SPEC §Account icon and modal).
          options: { redirectTo: `${address.get().origin}/`, queryParams: { prompt: "select_account" } },
        });
        if (!error) return "started";
      } catch {
        // falls through to the failure below
      }
      writeTab(SIGN_IN_STARTED_KEY, null);
      return "failed";
    },
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
      if (typeof window !== "undefined") {
        window.addEventListener("online", retryIfFailed);
        // The browser restored this page from its back-forward cache: no entry runs again, so a
        // return without finishing is read here. Over a session the modal reopens; on the
        // session-expired screen the screen simply stays.
        window.addEventListener("pageshow", (event) => {
          if (!(event as PageTransitionEvent).persisted || readTab(SIGN_IN_STARTED_KEY) === null) return;
          // Only a guest has a session to keep: another tab may have signed an account in meanwhile.
          if (!takeSignInStarted() || state.phase !== "ready" || lastKind() !== "guest") return;
          signInError = true;
          for (const listener of [...signInErrorListeners]) listener();
        });
      }
      return enter();
    },
    retry(): Promise<void> {
      return enter();
    },
    /** Session-expired and account-state screens: sign out, then start a new guest. */
    continueAsGuest: signOutToGuest,
    /** The account modal's Sign out: the same user change, chosen. */
    signOut: signOutToGuest,
    /**
     * `delete_my_account()`, then, once the request is recorded, a sign-out to a new guest. A failure
     * keeps the session; an unknown outcome is never sent again (the next read says what the server
     * has).
     */
    async requestAccountDeletion(): Promise<AccountDeletionResult> {
      let answer: Awaited<ReturnType<typeof callDeleteMyAccount>> | "timeout";
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        // A request that never answers must not hold the confirmation open: after the request
        // timeout the outcome is unknown, and the snapshot read below says what the server has.
        const timedOut = new Promise<"timeout">((resolve) => {
          timer = setTimeout(() => resolve("timeout"), REQUEST_TIMEOUT_MS);
        });
        answer = await Promise.race([callDeleteMyAccount(getClient()), timedOut]);
      } catch (error) {
        const unknown = error instanceof UnknownOutcomeError;
        options.connection?.report(unknown ? "unreachable" : "reachable");
        if (unknown) void store.refetch();
        return unknown ? "unknown" : "failed";
      } finally {
        clearTimeout(timer);
      }
      if (answer === "timeout") {
        options.connection?.report("unreachable");
        void store.refetch();
        return "unknown";
      }
      options.connection?.report("reachable");
      const code = answer.rejection?.code;
      if (answer.status === "applied" || answer.status === "already_applied" || code === "account_deleting") {
        await signOutToGuest();
        return "requested";
      }
      if (code === "account_missing") showAccountState(code);
      return "failed";
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
    controller = createSessionController({
      getClient: getSupabaseClient,
      storage: window.localStorage,
      connection,
      captcha: getAppTurnstile(),
      onUserChange: resetAppForUserChange,
    });
    const created = controller;
    bindConnectionEntry({ refetch: () => created.store.refetch(), isReady: () => created.getState().phase === "ready" });
  }
  return controller;
}

export function resetSessionControllerForTests(): void {
  controller = null;
}
