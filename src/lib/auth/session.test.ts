import { AuthApiError, AuthRetryableFetchError } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionController, SESSION_EXPIRED_KEY } from "@/lib/auth/session";

type AuthEvent = "SIGNED_IN" | "SIGNED_OUT" | "TOKEN_REFRESHED" | "INITIAL_SESSION";
type Listener = (event: AuthEvent, session: { user: { id: string; is_anonymous?: boolean } } | null) => void;

const emptySnapshot = {
  nodes: [],
  bits: [],
  chunks: [],
  scratch_breakdowns: [],
  staged_candidates: [],
};

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, String(value)),
  };
}

function setup(options: { session?: { id: string; anon?: boolean } | null } = {}) {
  let session = options.session ? { user: { id: options.session.id, is_anonymous: options.session.anon ?? true } } : null;
  let listener: Listener | null = null;
  const auth = {
    getSession: vi.fn(async () => ({ data: { session }, error: null as unknown })),
    signInAnonymously: vi.fn(async () => {
      session = { user: { id: `guest-${auth.signInAnonymously.mock.calls.length}`, is_anonymous: true } };
      return { data: { user: session.user, session }, error: null as unknown };
    }),
    signOut: vi.fn(async () => {
      session = null;
      return { error: null };
    }),
    onAuthStateChange: vi.fn((cb: Listener) => {
      listener = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }),
  };
  type RpcAnswer = { data: unknown; error: { message: string } | null; status: number };
  const rpc = vi.fn(async (name: string): Promise<RpcAnswer> => {
    if (name === "ensure_account") {
      return { data: { status: "applied", result: null, changes: {} }, error: null, status: 200 };
    }
    return { data: emptySnapshot, error: null, status: 200 };
  });
  const client = { auth, rpc } as never;
  const storage = memoryStorage();
  const controller = createSessionController({
    getClient: () => client,
    storage,
    runExclusive: (_name, task) => task(),
    // Tests drive auth events directly, so the handler runs in the same tick.
    defer: (task) => task(),
  });
  return {
    auth,
    rpc,
    storage,
    store: controller.store,
    controller,
    emit: (event: AuthEvent, user: { id: string; is_anonymous?: boolean } | null) =>
      listener?.(event, user ? { user } : null),
    setSession: (next: typeof session) => {
      session = next;
    },
  };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("session controller entry", () => {
  beforeEach(() => vi.clearAllMocks());

  it("signs in anonymously once, prepares the account and loads the snapshot", async () => {
    const t = setup();
    await t.controller.start();
    expect(t.auth.signInAnonymously).toHaveBeenCalledTimes(1);
    const ensureCall = t.rpc.mock.calls.find(([name]) => name === "ensure_account") as unknown as [string, { p_reserved_cells: unknown[] }];
    expect(ensureCall[1].p_reserved_cells).toHaveLength(6);
    expect(t.rpc.mock.calls.map(([name]) => name)).toEqual(["ensure_account", "get_snapshot"]);
    expect(t.controller.getState()).toEqual({ phase: "ready" });
  });

  it("returns to the same guest on a later visit without signing in again", async () => {
    const t = setup({ session: { id: "guest-a" } });
    await t.controller.start();
    expect(t.auth.signInAnonymously).not.toHaveBeenCalled();
    expect(t.controller.getState()).toEqual({ phase: "ready" });
  });

  it("re-checks the session inside the lock, so two first-visit tabs end on one guest", async () => {
    const t = setup();
    // The other tab signed in while this one waited for the lock.
    const exclusive = vi.fn(async (_name: string, task: () => Promise<unknown>) => {
      t.setSession({ user: { id: "guest-from-other-tab", is_anonymous: true } });
      return task();
    });
    const controller = createSessionController({
      getClient: () => ({ auth: t.auth, rpc: t.rpc }) as never,
      storage: t.storage,
      runExclusive: exclusive as never,
      defer: (task) => task(),
    });
    await controller.start();
    expect(exclusive).toHaveBeenCalled();
    expect(t.auth.signInAnonymously).not.toHaveBeenCalled();
    expect(controller.getState()).toEqual({ phase: "ready" });
  });

  it("shows the session-expired screen and creates no guest while the marker is set", async () => {
    const t = setup();
    t.storage.setItem(SESSION_EXPIRED_KEY, "account");
    await t.controller.start();
    expect(t.auth.signInAnonymously).not.toHaveBeenCalled();
    expect(t.controller.getState()).toEqual({ phase: "session-expired", variant: "account" });
  });

  it("clears the marker only when a guest session starts", async () => {
    const t = setup();
    t.storage.setItem(SESSION_EXPIRED_KEY, "guest");
    await t.controller.start();
    await t.controller.continueAsGuest();
    expect(t.storage.getItem(SESSION_EXPIRED_KEY)).toBeNull();
    expect(t.auth.signOut).toHaveBeenCalled();
    expect(t.auth.signInAnonymously).toHaveBeenCalledTimes(1);
    expect(t.controller.getState()).toEqual({ phase: "ready" });
  });
});

describe("session controller failures", () => {
  it.each([
    ["a rate limit", new AuthApiError("too many", 429, "over_request_rate_limit"), "rate-limit"],
    ["a failed security check", new AuthApiError("captcha", 400, "captcha_failed"), "turnstile"],
    ["a network failure", new AuthRetryableFetchError("fetch failed", 0), "unreachable"],
    ["anything else", new AuthApiError("boom", 500, "unexpected_failure"), "other"],
  ])("guest creation failing with %s shows the guest-creation failure", async (_label, error, reason) => {
    const t = setup();
    t.auth.signInAnonymously.mockResolvedValueOnce({ data: { user: null, session: null }, error } as never);
    await t.controller.start();
    expect(t.controller.getState()).toEqual({ phase: "guest-failure", reason });
  });

  it("an unreachable server at ensure_account is a load failure with the unreachable reason", async () => {
    const t = setup({ session: { id: "g" } });
    t.rpc.mockResolvedValueOnce({ data: null, error: { message: "fetch failed" }, status: 0 });
    await t.controller.start();
    expect(t.controller.getState()).toEqual({ phase: "load-failure", reason: "unreachable" });
  });

  it("a snapshot load that fails with a server error is a load failure with the other reason", async () => {
    const t = setup({ session: { id: "g" } });
    t.rpc.mockImplementation(async (name: string) =>
      name === "ensure_account"
        ? { data: { status: "applied", result: null, changes: {} }, error: null, status: 200 }
        : { data: null, error: { message: "boom" }, status: 500 },
    );
    await t.controller.start();
    expect(t.controller.getState()).toEqual({ phase: "load-failure", reason: "other" });
  });

  it("a rejected snapshot (account deleted) is a load failure with the other reason", async () => {
    const t = setup({ session: { id: "g" } });
    t.rpc.mockImplementation(async (name: string) =>
      name === "ensure_account"
        ? { data: { status: "applied", result: null, changes: {} }, error: null, status: 200 }
        : { data: { rejection: { code: "account_missing" } }, error: null, status: 200 },
    );
    await t.controller.start();
    expect(t.controller.getState()).toEqual({ phase: "load-failure", reason: "other" });
  });

  it("Retry runs entry again and reaches ready after the failure clears", async () => {
    const t = setup({ session: { id: "g" } });
    t.rpc.mockResolvedValueOnce({ data: null, error: { message: "fetch failed" }, status: 0 });
    await t.controller.start();
    expect(t.controller.getState().phase).toBe("load-failure");
    await t.controller.retry();
    expect(t.controller.getState()).toEqual({ phase: "ready" });
  });

  it("retries by itself when the browser comes back online", async () => {
    const t = setup({ session: { id: "g" } });
    t.rpc.mockResolvedValueOnce({ data: null, error: { message: "fetch failed" }, status: 0 });
    await t.controller.start();
    window.dispatchEvent(new Event("online"));
    await settle();
    await settle();
    expect(t.controller.getState()).toEqual({ phase: "ready" });
  });

  it("a rejected session at entry sets the marker with the remembered kind and shows no guest", async () => {
    const t = setup({ session: { id: "acct", anon: false } });
    await t.controller.start();
    t.auth.getSession.mockResolvedValueOnce({
      data: { session: null },
      error: new AuthApiError("Invalid Refresh Token", 400, "refresh_token_not_found"),
    });
    await t.controller.retry();
    expect(t.storage.getItem(SESSION_EXPIRED_KEY)).toBe("account");
    expect(t.controller.getState()).toEqual({ phase: "session-expired", variant: "account" });
    expect(t.auth.signInAnonymously).not.toHaveBeenCalled();
  });

  it("a network failure while restoring the session is a load failure, not an expiry", async () => {
    const t = setup({ session: { id: "g" } });
    t.auth.getSession.mockResolvedValueOnce({
      data: { session: null },
      error: new AuthRetryableFetchError("fetch failed", 0),
    });
    await t.controller.start();
    expect(t.storage.getItem(SESSION_EXPIRED_KEY)).toBeNull();
    expect(t.controller.getState()).toEqual({ phase: "load-failure", reason: "unreachable" });
  });
});

describe("session controller auth events", () => {
  it("a SIGNED_OUT this tab did not ask for sets the marker, drops the snapshot and shows the expiry", async () => {
    const t = setup({ session: { id: "g", anon: true } });
    await t.controller.start();
    t.emit("SIGNED_OUT", null);
    await settle();
    expect(t.storage.getItem(SESSION_EXPIRED_KEY)).toBe("guest");
    expect(t.store.getState().status.phase).toBe("empty");
    expect(t.controller.getState()).toEqual({ phase: "session-expired", variant: "guest" });
  });

  it("uses the last user's kind, taken before the event, for a real account", async () => {
    const t = setup({ session: { id: "acct", anon: false } });
    await t.controller.start();
    t.emit("SIGNED_OUT", null);
    await settle();
    expect(t.storage.getItem(SESSION_EXPIRED_KEY)).toBe("account");
  });

  it("a sign-out this tab asked for does not set the marker", async () => {
    const t = setup({ session: { id: "g" } });
    await t.controller.start();
    await t.controller.continueAsGuest();
    expect(t.storage.getItem(SESSION_EXPIRED_KEY)).toBeNull();
    expect(t.controller.getState()).toEqual({ phase: "ready" });
  });

  it("a different user signing in from another tab drops the snapshot and repeats entry", async () => {
    const t = setup({ session: { id: "g1" } });
    await t.controller.start();
    const states: string[] = [];
    t.controller.subscribe(() => states.push(t.controller.getState().phase));
    t.setSession({ user: { id: "g2", is_anonymous: true } });
    t.emit("SIGNED_IN", { id: "g2", is_anonymous: true });
    await settle();
    await settle();
    expect(states).toContain("entering");
    expect(t.controller.getState()).toEqual({ phase: "ready" });
    expect(t.rpc.mock.calls.filter(([name]) => name === "get_snapshot")).toHaveLength(2);
  });

  it("the same user signing in again changes nothing", async () => {
    const t = setup({ session: { id: "g1" } });
    await t.controller.start();
    t.emit("SIGNED_IN", { id: "g1", is_anonymous: true });
    await settle();
    expect(t.rpc.mock.calls.filter(([name]) => name === "get_snapshot")).toHaveLength(1);
  });

  it("a token refresh does not repeat entry", async () => {
    const t = setup({ session: { id: "g1" } });
    await t.controller.start();
    t.emit("TOKEN_REFRESHED", { id: "g1", is_anonymous: true });
    await settle();
    expect(t.rpc.mock.calls.filter(([name]) => name === "get_snapshot")).toHaveLength(1);
  });

  it("another tab's SIGNED_OUT arriving after continueAsGuest resolved sets no marker", async () => {
    const t = setup({ session: { id: "g1" } });
    await t.controller.start();
    await t.controller.continueAsGuest();
    // The other tab's deferred event: the sign-out was chosen, so it is a user change.
    t.emit("SIGNED_OUT", null);
    await settle();
    await settle();
    expect(t.storage.getItem(SESSION_EXPIRED_KEY)).toBeNull();
    expect(t.controller.getState()).toEqual({ phase: "ready" });
  });

  it("a SIGNED_OUT during ensure_account supersedes the entry and expires, so Retry starts no guest", async () => {
    const t = setup({ session: { id: "g1", anon: true } });
    let release: (value: { data: unknown; error: null; status: number }) => void = () => {};
    t.rpc.mockImplementationOnce(
      () => new Promise((resolve) => (release = resolve as typeof release)),
    );
    const entering = t.controller.start();
    await settle();
    t.emit("SIGNED_OUT", null);
    await settle();
    release({ data: { status: "applied", result: null, changes: {} }, error: null, status: 200 });
    await entering;
    expect(t.storage.getItem(SESSION_EXPIRED_KEY)).toBe("guest");
    expect(t.controller.getState()).toEqual({ phase: "session-expired", variant: "guest" });
    await t.controller.retry();
    expect(t.auth.signInAnonymously).not.toHaveBeenCalled();
    expect(t.controller.getState()).toEqual({ phase: "session-expired", variant: "guest" });
  });

  it("a tab on the session-expired screen follows a guest another tab started, and clears the marker", async () => {
    const t = setup();
    t.storage.setItem(SESSION_EXPIRED_KEY, "account");
    await t.controller.start();
    expect(t.controller.getState().phase).toBe("session-expired");
    t.setSession({ user: { id: "g-other-tab", is_anonymous: true } });
    t.emit("SIGNED_IN", { id: "g-other-tab", is_anonymous: true });
    await settle();
    await settle();
    expect(t.controller.getState()).toEqual({ phase: "ready" });
    expect(t.storage.getItem(SESSION_EXPIRED_KEY)).toBeNull();
    expect(t.auth.signOut).not.toHaveBeenCalled();
  });

  it("a rejected refresh at load (SIGNED_OUT queued before getSession returns no session) creates no guest", async () => {
    const t = setup();
    // The real supabase-js drops the session during initialize(), delivers SIGNED_OUT, then
    // getSession() answers with no session and no error. The default (timer) defer is in force.
    t.setSession(null);
    const real = createSessionController({
      getClient: () => ({ auth: t.auth, rpc: t.rpc }) as never,
      storage: t.storage,
      runExclusive: (_name, task) => task(),
    });
    t.storage.setItem("griddo.session-kind", "account");
    t.auth.getSession.mockImplementationOnce(async () => {
      t.emit("SIGNED_OUT", null);
      // No timer turn in between: the callback and getSession() run in one microtask chain.
      return { data: { session: null }, error: null };
    });
    await real.start();
    await settle();
    await settle();
    expect(t.auth.signInAnonymously).not.toHaveBeenCalled();
    expect(t.storage.getItem(SESSION_EXPIRED_KEY)).toBe("account");
    expect(real.getState()).toEqual({ phase: "session-expired", variant: "account" });
  });

  it("Retry after a failed Continue as guest retries guest creation, not the expired screen", async () => {
    const t = setup();
    t.storage.setItem(SESSION_EXPIRED_KEY, "guest");
    await t.controller.start();
    t.auth.signInAnonymously.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: new AuthRetryableFetchError("fetch failed", 0),
    } as never);
    await t.controller.continueAsGuest();
    expect(t.controller.getState()).toEqual({ phase: "guest-failure", reason: "unreachable" });
    expect(t.storage.getItem(SESSION_EXPIRED_KEY)).toBe("guest");
    await t.controller.retry();
    expect(t.controller.getState()).toEqual({ phase: "ready" });
    expect(t.storage.getItem(SESSION_EXPIRED_KEY)).toBeNull();
  });
});
