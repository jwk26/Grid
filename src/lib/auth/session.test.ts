import { AuthApiError, AuthRetryableFetchError } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionController, SESSION_EXPIRED_KEY, SIGN_IN_STARTED_KEY } from "@/lib/auth/session";
import { CaptchaError, type CaptchaProvider } from "@/lib/auth/turnstile";

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

type TestUser = { id: string; is_anonymous?: boolean; email?: string; user_metadata?: Record<string, unknown> };

function setup(
  options: { session?: { id: string; anon?: boolean; email?: string; meta?: Record<string, unknown> } | null } = {},
) {
  let session: { user: TestUser } | null = options.session
    ? {
        user: {
          id: options.session.id,
          is_anonymous: options.session.anon ?? true,
          email: options.session.email,
          user_metadata: options.session.meta,
        },
      }
    : null;
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
    if (name === "ensure_account" || name === "delete_my_account") {
      return { data: { status: "applied", result: null, changes: {} }, error: null, status: 200 };
    }
    return { data: emptySnapshot, error: null, status: 200 };
  });
  const client = { auth, rpc } as never;
  const storage = memoryStorage();
  const onUserChange = vi.fn();
  const controller = createSessionController({
    getClient: () => client,
    storage,
    onUserChange,
    runExclusive: (_name, task) => task(),
    // Tests drive auth events directly, so the handler runs in the same tick.
    defer: (task) => task(),
  });
  return {
    auth,
    rpc,
    onUserChange,
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
    const ensureCall = t.rpc.mock.calls.find(([name]) => name === "ensure_account") as unknown as [string, Record<string, unknown>];
    expect(ensureCall[1]).toEqual({});
    expect(t.rpc.mock.calls.map(([name]) => name)).toEqual(["ensure_account", "get_snapshot"]);
    expect(t.controller.getState()).toEqual({ phase: "ready" });
  });

  it("reports the kind of the signed-in user for the account icon", async () => {
    const guest = setup();
    await guest.controller.start();
    expect(guest.controller.getVariant()).toBe("guest");
    const account = setup({ session: { id: "oauth-a", anon: false } });
    await account.controller.start();
    expect(account.controller.getVariant()).toBe("account");
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

describe("snapshot reads report to the connection monitor (Task 233)", () => {
  function withConnection(snapshotAnswer: { data: unknown; error: { message: string } | null; status: number }) {
    const report = vi.fn();
    const rpc = vi.fn(async (name: string) =>
      name === "ensure_account"
        ? { data: { status: "applied", result: null, changes: {} }, error: null, status: 200 }
        : snapshotAnswer,
    );
    const auth = {
      getSession: vi.fn(async () => ({ data: { session: { user: { id: "u", is_anonymous: true } } }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    };
    const controller = createSessionController({
      getClient: () => ({ auth, rpc }) as never,
      storage: memoryStorage(),
      runExclusive: (_name, task) => task(),
      defer: (task) => task(),
      connection: { report },
    });
    return { controller, report };
  }

  it("a session restore that fails on the network reports unreachable (Task 234)", async () => {
    const report = vi.fn();
    const auth = {
      getSession: vi.fn(async () => ({ data: { session: null }, error: new AuthRetryableFetchError("fetch failed", 0) })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    };
    const controller = createSessionController({
      getClient: () => ({ auth, rpc: vi.fn() }) as never,
      storage: memoryStorage(),
      runExclusive: (_name, task) => task(),
      defer: (task) => task(),
      connection: { report },
    });
    await controller.start();
    expect(report).toHaveBeenCalledWith("unreachable");
    expect(controller.getState()).toEqual({ phase: "load-failure", reason: "unreachable" });
  });

  it("a good read is reachable and is itself a snapshot read", async () => {
    const { controller, report } = withConnection({ data: emptySnapshot, error: null, status: 200 });
    await controller.start();
    expect(report).toHaveBeenCalledWith("reachable", { snapshotRead: true });
  });

  it("a read with no answer is unreachable", async () => {
    const { controller, report } = withConnection({ data: null, error: { message: "network" }, status: 0 });
    await controller.start();
    expect(report).toHaveBeenCalledWith("unreachable");
  });

  it("an answered failure only degrades", async () => {
    const { controller, report } = withConnection({ data: null, error: { message: "boom" }, status: 500 });
    await controller.start();
    expect(report).toHaveBeenCalledWith("degraded");
    expect(report).not.toHaveBeenCalledWith("unreachable");
  });
});

describe("a snapshot read that never answers (Task 233)", () => {
  it("counts as no answer after the request timeout and frees the next refetch", async () => {
    vi.useFakeTimers();
    try {
      const report = vi.fn();
      let calls = 0;
      const rpc = vi.fn(async (name: string) => {
        if (name === "ensure_account") return { data: { status: "applied", result: null, changes: {} }, error: null, status: 200 };
        calls += 1;
        return calls === 1 ? new Promise<never>(() => {}) : { data: emptySnapshot, error: null, status: 200 };
      });
      const auth = {
        getSession: vi.fn(async () => ({ data: { session: { user: { id: "u", is_anonymous: true } } }, error: null })),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      };
      const controller = createSessionController({
        getClient: () => ({ auth, rpc }) as never,
        storage: memoryStorage(),
        runExclusive: (_name, task) => task(),
        defer: (task) => task(),
        connection: { report },
      });
      const started = controller.start();
      await vi.advanceTimersByTimeAsync(15_000);
      await started;
      expect(report).toHaveBeenCalledWith("unreachable");
      await expect(controller.store.refetch()).resolves.toBe("applied");
    } finally {
      vi.useRealTimers();
    }
  });
});

const OK = { data: { status: "applied", result: null, changes: {} }, error: null, status: 200 };
const rejection = (code: string) => ({ data: { rejection: { code } }, error: null, status: 200 });

describe("account-state screens (Task 235)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("a snapshot rejected with account_missing is the account-deleted screen, with no data", async () => {
    const t = setup({ session: { id: "g" } });
    t.rpc.mockImplementation(async (name: string) => (name === "ensure_account" ? OK : rejection("account_missing")));
    await t.controller.start();
    expect(t.controller.getState()).toEqual({ phase: "account-deleted" });
  });

  it("a snapshot rejected with account_deleting is the account-being-deleted screen", async () => {
    const t = setup({ session: { id: "g" } });
    t.rpc.mockImplementation(async (name: string) => (name === "ensure_account" ? OK : rejection("account_deleting")));
    await t.controller.start();
    expect(t.controller.getState()).toEqual({ phase: "account-deleting" });
  });

  it("ensure_account rejected with either code shows the matching screen and reads no snapshot", async () => {
    for (const [code, phase] of [
      ["account_missing", "account-deleted"],
      ["account_deleting", "account-deleting"],
    ] as const) {
      const t = setup({ session: { id: "oauth", anon: false } });
      t.rpc.mockImplementation(async (name: string) => ({
        data: name === "ensure_account" ? { status: "rejected", result: null, changes: {}, rejection: { code } } : emptySnapshot,
        error: null,
        status: 200,
      }));
      await t.controller.start();
      expect(t.controller.getState(), code).toEqual({ phase });
      expect(t.rpc.mock.calls.map(([name]) => name), code).toEqual(["ensure_account"]);
    }
  });

  it("a write answered with account_deleting moves a ready tab to the screen and drops the snapshot", async () => {
    const t = setup({ session: { id: "oauth", anon: false } });
    await t.controller.start();
    await t.controller.store.command({
      key: "k",
      send: async () => ({ status: "rejected", result: null, changes: {}, rejection: { code: "account_deleting" } }),
    });
    expect(t.controller.getState()).toEqual({ phase: "account-deleting" });
    expect(t.controller.store.getState().status.phase).toBe("empty");
  });

  it("Continue as guest on the screen signs out and starts a new guest", async () => {
    const t = setup({ session: { id: "oauth", anon: false } });
    t.rpc.mockImplementation(async (name: string) => (name === "ensure_account" ? OK : rejection("account_deleting")));
    await t.controller.start();
    t.rpc.mockImplementation(async (name: string) => (name === "ensure_account" ? OK : { data: emptySnapshot, error: null, status: 200 }));
    await t.controller.continueAsGuest();
    expect(t.auth.signOut).toHaveBeenCalledTimes(1);
    expect(t.auth.signInAnonymously).toHaveBeenCalledTimes(1);
    expect(t.controller.getState()).toEqual({ phase: "ready" });
    expect(t.controller.getVariant()).toBe("guest");
    expect(t.onUserChange).toHaveBeenCalled();
  });

  it("a tab on the screen follows the new guest another tab started by signing out", async () => {
    const t = setup({ session: { id: "oauth", anon: false } });
    t.rpc.mockImplementation(async (name: string) => (name === "ensure_account" ? OK : rejection("account_deleting")));
    await t.controller.start();
    t.rpc.mockImplementation(async (name: string) => (name === "ensure_account" ? OK : { data: emptySnapshot, error: null, status: 200 }));
    // The other tab's deliberate sign-out, then the guest it created.
    t.storage.setItem("griddo.deliberate-sign-out", String(Date.now()));
    t.setSession(null);
    t.emit("SIGNED_OUT", null);
    await settle();
    await settle();
    expect(t.controller.getState()).toEqual({ phase: "ready" });
    expect(t.storage.getItem(SESSION_EXPIRED_KEY)).toBeNull();
  });
});

describe("sign-out and account deletion (Task 235)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("signOut drops the snapshot, starts a new guest and resets the app-session state", async () => {
    const t = setup({ session: { id: "oauth", anon: false } });
    await t.controller.start();
    await t.controller.signOut();
    expect(t.auth.signOut).toHaveBeenCalledTimes(1);
    expect(t.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(t.auth.signInAnonymously).toHaveBeenCalledTimes(1);
    expect(t.controller.getVariant()).toBe("guest");
    expect(t.controller.getState()).toEqual({ phase: "ready" });
    expect(t.onUserChange).toHaveBeenCalled();
  });

  it("an app-session reset happens on every user change: expiry, another tab's other user, another tab's sign-out", async () => {
    const expiry = setup({ session: { id: "g" } });
    await expiry.controller.start();
    expiry.onUserChange.mockClear();
    expiry.emit("SIGNED_OUT", null);
    expect(expiry.onUserChange).toHaveBeenCalledTimes(1);

    const other = setup({ session: { id: "g1" } });
    await other.controller.start();
    other.onUserChange.mockClear();
    other.emit("SIGNED_IN", { id: "g2", is_anonymous: false });
    await settle();
    expect(other.onUserChange).toHaveBeenCalled();

    const same = setup({ session: { id: "g1" } });
    await same.controller.start();
    same.onUserChange.mockClear();
    same.emit("SIGNED_IN", { id: "g1", is_anonymous: true });
    await settle();
    expect(same.onUserChange).not.toHaveBeenCalled();
  });

  it("requestAccountDeletion calls delete_my_account, then signs out to a new guest", async () => {
    const t = setup({ session: { id: "oauth", anon: false } });
    await t.controller.start();
    const result = await t.controller.requestAccountDeletion();
    expect(result).toBe("requested");
    expect(t.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
    const names = t.rpc.mock.calls.map(([name]) => name);
    expect(names).toContain("delete_my_account");
    expect(names.indexOf("delete_my_account")).toBeLessThan(names.lastIndexOf("ensure_account"));
    expect(t.auth.signOut).toHaveBeenCalledTimes(1);
    expect(t.controller.getVariant()).toBe("guest");
    expect(t.controller.getState()).toEqual({ phase: "ready" });
  });

  it("a deletion that already was requested counts as requested", async () => {
    const t = setup({ session: { id: "oauth", anon: false } });
    await t.controller.start();
    t.rpc.mockImplementation(async (name: string) =>
      name === "delete_my_account"
        ? { data: { status: "already_applied", result: null, changes: {} }, error: null, status: 200 }
        : name === "ensure_account"
          ? OK
          : { data: emptySnapshot, error: null, status: 200 },
    );
    expect(await t.controller.requestAccountDeletion()).toBe("requested");
  });

  it("a failed request keeps the session: nothing is signed out and the result is failed", async () => {
    const t = setup({ session: { id: "oauth", anon: false } });
    await t.controller.start();
    t.rpc.mockImplementation(async (name: string) =>
      name === "delete_my_account"
        ? { data: null, error: { message: "boom" }, status: 500 }
        : { data: emptySnapshot, error: null, status: 200 },
    );
    expect(await t.controller.requestAccountDeletion()).toBe("failed");
    expect(t.auth.signOut).not.toHaveBeenCalled();
    expect(t.controller.getState()).toEqual({ phase: "ready" });
  });

  it("a request with no answer is unknown: nothing is signed out and the request is not sent again", async () => {
    const t = setup({ session: { id: "oauth", anon: false } });
    await t.controller.start();
    t.rpc.mockImplementation(async (name: string) =>
      name === "delete_my_account"
        ? { data: null, error: { message: "network" }, status: 0 }
        : { data: emptySnapshot, error: null, status: 200 },
    );
    expect(await t.controller.requestAccountDeletion()).toBe("unknown");
    expect(t.auth.signOut).not.toHaveBeenCalled();
    expect(t.rpc.mock.calls.filter(([name]) => name === "delete_my_account")).toHaveLength(1);
  });

  it("an account deleted in the meantime shows the account-deleted screen", async () => {
    const t = setup({ session: { id: "oauth", anon: false } });
    await t.controller.start();
    t.rpc.mockImplementation(async (name: string) =>
      name === "delete_my_account"
        ? { data: { status: "rejected", result: null, changes: {}, rejection: { code: "account_missing" } }, error: null, status: 200 }
        : { data: emptySnapshot, error: null, status: 200 },
    );
    expect(await t.controller.requestAccountDeletion()).toBe("failed");
    expect(t.controller.getState()).toEqual({ phase: "account-deleted" });
  });
});

describe("the account name (Task 235)", () => {
  it("is the provider's full name, then name, user name, email; null for a guest", async () => {
    const cases: Array<[Parameters<typeof setup>[0], string | null]> = [
      [{ session: { id: "a", anon: false, email: "e@x.test", meta: { full_name: "Ada L", name: "n", user_name: "u" } } }, "Ada L"],
      [{ session: { id: "a", anon: false, email: "e@x.test", meta: { name: "n", user_name: "u" } } }, "n"],
      [{ session: { id: "a", anon: false, email: "e@x.test", meta: { user_name: "u" } } }, "u"],
      [{ session: { id: "a", anon: false, email: "e@x.test" } }, "e@x.test"],
      [{ session: { id: "a", anon: false } }, null],
      [{ session: { id: "g", email: "ignored@x.test", meta: { full_name: "Ignored" } } }, null],
    ];
    for (const [options, expected] of cases) {
      const t = setup(options);
      await t.controller.start();
      expect(t.controller.getAccountName(), JSON.stringify(options)).toBe(expected);
    }
  });
});

describe("expert review of Task 235", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows the Loading state at once on a sign-out, so no empty snapshot is rendered while signOut() runs", async () => {
    const t = setup({ session: { id: "oauth", anon: false } });
    await t.controller.start();
    let release: () => void = () => undefined;
    t.auth.signOut.mockImplementation(
      () => new Promise((resolve) => { release = () => { t.setSession(null); resolve({ error: null }); }; }),
    );
    const pending = t.controller.signOut();
    await settle();
    expect(t.controller.getState()).toEqual({ phase: "entering" });
    release();
    await pending;
    expect(t.controller.getState()).toEqual({ phase: "ready" });
  });

  it("a deletion request that gets no answer ends as unknown after the request timeout, and reads again", async () => {
    vi.useFakeTimers();
    try {
      const t = setup({ session: { id: "oauth", anon: false } });
      await t.controller.start();
      t.rpc.mockImplementation((name: string) =>
        name === "delete_my_account"
          ? new Promise(() => undefined)
          : Promise.resolve({ data: emptySnapshot, error: null, status: 200 }),
      );
      const result = t.controller.requestAccountDeletion();
      await vi.advanceTimersByTimeAsync(15_001);
      expect(await result).toBe("unknown");
      expect(t.auth.signOut).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("an unknown outcome reads the snapshot again, so a recorded request shows the account screen", async () => {
    const t = setup({ session: { id: "oauth", anon: false } });
    await t.controller.start();
    t.rpc.mockImplementation(async (name: string) =>
      name === "delete_my_account"
        ? { data: null, error: { message: "network" }, status: 0 }
        : name === "get_snapshot"
          ? rejection("account_deleting")
          : OK,
    );
    expect(await t.controller.requestAccountDeletion()).toBe("unknown");
    await settle();
    expect(t.controller.getState()).toEqual({ phase: "account-deleting" });
  });

  it("an expiry event keeps an account-state screen instead of replacing it with the session-expired one", async () => {
    const t = setup({ session: { id: "oauth", anon: false } });
    t.rpc.mockImplementation(async (name: string) => (name === "ensure_account" ? OK : rejection("account_missing")));
    await t.controller.start();
    expect(t.controller.getState()).toEqual({ phase: "account-deleted" });
    t.emit("SIGNED_OUT", null);
    await settle();
    expect(t.controller.getState()).toEqual({ phase: "account-deleted" });
    expect(t.storage.getItem(SESSION_EXPIRED_KEY)).toBeNull();
  });
});

describe("session controller Turnstile", () => {
  function withCaptcha(solve: CaptchaProvider["solve"]) {
    const t = setup();
    const captcha: CaptchaProvider = { solve: vi.fn(solve) };
    const controller = createSessionController({
      getClient: () => ({ auth: t.auth, rpc: t.rpc }) as never,
      storage: t.storage,
      runExclusive: (_name, task) => task(),
      defer: (task) => task(),
      captcha,
    });
    return { ...t, controller, captcha };
  }

  it("passes the token to the anonymous sign-in", async () => {
    const t = withCaptcha(async () => "token-1");
    await t.controller.start();
    expect(t.auth.signInAnonymously).toHaveBeenCalledWith({ options: { captchaToken: "token-1" } });
    expect(t.controller.getState()).toEqual({ phase: "ready" });
  });

  it("asks for no token when a session already exists", async () => {
    const t = setup({ session: { id: "guest-a" } });
    const solve = vi.fn(async () => "unused");
    const controller = createSessionController({
      getClient: () => ({ auth: t.auth, rpc: t.rpc }) as never,
      storage: t.storage,
      runExclusive: (_name, task) => task(),
      defer: (task) => task(),
      captcha: { solve },
    });
    await controller.start();
    expect(solve).not.toHaveBeenCalled();
  });

  it("shows the security-check screen while an interactive check runs, then enters", async () => {
    let release: (token: string) => void = () => undefined;
    const t = withCaptcha(
      (handlers) =>
        new Promise<string>((resolve) => {
          handlers.onInteractive();
          release = (token) => {
            handlers.onInteractiveEnd();
            resolve(token);
          };
        }),
    );
    const started = t.controller.start();
    await settle();
    expect(t.controller.getState()).toEqual({ phase: "security-check" });
    release("token-2");
    await started;
    expect(t.auth.signInAnonymously).toHaveBeenCalledWith({ options: { captchaToken: "token-2" } });
    expect(t.controller.getState()).toEqual({ phase: "ready" });
  });

  it("a failed or unloadable widget is the turnstile failure, and Retry asks for a new token", async () => {
    const t = withCaptcha(async () => {
      throw new CaptchaError("widget", "failed");
    });
    await t.controller.start();
    expect(t.controller.getState()).toEqual({ phase: "guest-failure", reason: "turnstile" });
    t.captcha.solve = vi.fn(async () => "token-3");
    await t.controller.retry();
    expect(t.controller.getState()).toEqual({ phase: "ready" });
    expect(t.auth.signInAnonymously).toHaveBeenCalledWith({ options: { captchaToken: "token-3" } });
  });

  it("a script that cannot load while offline is the unreachable failure", async () => {
    const online = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const t = withCaptcha(async () => {
      throw new CaptchaError("load", "script");
    });
    await t.controller.start();
    online.mockRestore();
    expect(t.controller.getState()).toEqual({ phase: "guest-failure", reason: "unreachable" });
  });

  it("without a captcha the anonymous sign-in is called as before", async () => {
    const t = setup();
    await t.controller.start();
    expect(t.auth.signInAnonymously).toHaveBeenCalledWith();
  });
});

describe("session controller OAuth", () => {
  function oauth(url: string, options: { session?: { id: string; anon?: boolean } | null } = {}) {
    const t = setup(options);
    const tab = memoryStorage();
    let current = new URL(url, "http://localhost:3000");
    const replaceUrl = vi.fn((next: string) => {
      current = new URL(next, "http://localhost:3000");
    });
    const exchangeCodeForSession = vi.fn(async (...args: [string]) => {
      void args;
      t.setSession({ user: { id: "oauth-1", is_anonymous: false } });
      return { data: { session: { user: { id: "oauth-1", is_anonymous: false } } }, error: null as unknown };
    });
    const signInWithOAuth = vi.fn(async (...args: [unknown]) => ({ data: { args }, error: null as unknown }));
    const auth = { ...t.auth, exchangeCodeForSession, signInWithOAuth };
    const controller = createSessionController({
      getClient: () => ({ auth, rpc: t.rpc }) as never,
      storage: t.storage,
      runExclusive: (_name, task) => task(),
      defer: (task) => task(),
      location: { get: () => current, replace: replaceUrl },
      tabStorage: tab,
    });
    return { ...t, tab, auth, controller, exchangeCodeForSession, signInWithOAuth, replaceUrl, url: () => current };
  }

  it("exchanges the returned code, cleans the URL and enters as the new account", async () => {
    const t = oauth("/?code=abc&keep=1", { session: { id: "guest-a" } });
    await t.controller.start();
    expect(t.exchangeCodeForSession).toHaveBeenCalledWith("abc");
    expect(t.url().search).toBe("?keep=1");
    expect(t.auth.signInAnonymously).not.toHaveBeenCalled();
    expect(t.controller.getVariant()).toBe("account");
    expect(t.controller.getState()).toEqual({ phase: "ready" });
    expect(t.controller.takeSignInError()).toBe(false);
  });

  it("a finished sign-in clears the session-expired marker", async () => {
    const t = oauth("/?code=abc");
    t.storage.setItem(SESSION_EXPIRED_KEY, "guest");
    await t.controller.start();
    expect(t.storage.getItem(SESSION_EXPIRED_KEY)).toBeNull();
    expect(t.controller.getState()).toEqual({ phase: "ready" });
  });

  it("a provider error keeps the guest, cleans the URL and flags the inline error once", async () => {
    const t = oauth("/?error=access_denied&error_code=access_denied&error_description=denied", {
      session: { id: "guest-a" },
    });
    await t.controller.start();
    expect(t.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(t.url().search).toBe("");
    expect(t.controller.getState()).toEqual({ phase: "ready" });
    expect(t.controller.getVariant()).toBe("guest");
    expect(t.controller.takeSignInError()).toBe(true);
    expect(t.controller.takeSignInError()).toBe(false);
  });

  it("reads a provider error from the hash too", async () => {
    const t = oauth("/#error=access_denied&error_description=x", { session: { id: "guest-a" } });
    await t.controller.start();
    expect(t.url().hash).toBe("");
    expect(t.controller.takeSignInError()).toBe(true);
  });

  it("a cancel from the session-expired screen returns to that screen", async () => {
    const t = oauth("/?error=access_denied");
    t.storage.setItem(SESSION_EXPIRED_KEY, "account");
    await t.controller.start();
    expect(t.controller.getState()).toEqual({ phase: "session-expired", variant: "account" });
    expect(t.storage.getItem(SESSION_EXPIRED_KEY)).toBe("account");
    expect(t.url().search).toBe("");
    // The screen returned, so no modal is owed once the visitor continues as a guest.
    expect(t.controller.takeSignInError()).toBe(false);
  });

  it("a failed exchange is a cancelled sign-in: guest kept, URL cleaned", async () => {
    const t = oauth("/?code=bad", { session: { id: "guest-a" } });
    t.exchangeCodeForSession.mockResolvedValueOnce({ data: { session: null }, error: new AuthApiError("bad", 400, "bad_code") } as never);
    await t.controller.start();
    expect(t.url().search).toBe("");
    expect(t.controller.getState()).toEqual({ phase: "ready" });
    expect(t.controller.takeSignInError()).toBe(true);
  });

  it("signInWithOAuth starts the provider flow back to the origin", async () => {
    const t = oauth("/", { session: { id: "guest-a" } });
    await t.controller.start();
    await expect(t.controller.signInWithOAuth("github")).resolves.toBe("started");
    expect(t.signInWithOAuth).toHaveBeenCalledWith({
      provider: "github",
      options: { redirectTo: "http://localhost:3000/", queryParams: { prompt: "select_account" } },
    });
    t.signInWithOAuth.mockResolvedValueOnce({ data: {}, error: new Error("x") } as never);
    await expect(t.controller.signInWithOAuth("google")).resolves.toBe("failed");
    t.signInWithOAuth.mockRejectedValueOnce(new Error("verifier"));
    await expect(t.controller.signInWithOAuth("github")).resolves.toBe("failed");
  });

  it("keeps the sign-in-started marker in this tab before leaving, and takes it back when the start fails", async () => {
    const t = oauth("/", { session: { id: "guest-a" } });
    await t.controller.start();
    let during: string | null = null;
    t.signInWithOAuth.mockImplementationOnce(async () => {
      during = t.tab.getItem(SIGN_IN_STARTED_KEY);
      return { data: {}, error: null as unknown } as never;
    });
    await t.controller.signInWithOAuth("github");
    expect(during).not.toBeNull();
    expect(t.storage.getItem(SIGN_IN_STARTED_KEY)).toBeNull();
    t.signInWithOAuth.mockRejectedValueOnce(new Error("verifier"));
    await t.controller.signInWithOAuth("google");
    expect(t.tab.getItem(SIGN_IN_STARTED_KEY)).toBeNull();
  });

  it.each([
    ["a code", "/?code=abc"],
    ["an error", "/?error=access_denied"],
  ])("every return with %s clears the marker", async (_label, url) => {
    const t = oauth(url, { session: { id: "guest-a" } });
    t.tab.setItem(SIGN_IN_STARTED_KEY, String(Date.now()));
    await t.controller.start();
    expect(t.tab.getItem(SIGN_IN_STARTED_KEY)).toBeNull();
  });

  it("a return with neither code nor error while the marker is present is a cancelled sign-in", async () => {
    const t = oauth("/", { session: { id: "guest-a" } });
    t.tab.setItem(SIGN_IN_STARTED_KEY, String(Date.now()));
    await t.controller.start();
    expect(t.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(t.controller.getState()).toEqual({ phase: "ready" });
    expect(t.controller.getVariant()).toBe("guest");
    expect(t.controller.takeSignInError()).toBe(true);
    expect(t.tab.getItem(SIGN_IN_STARTED_KEY)).toBeNull();
  });

  it("a plain visit without the marker raises no error", async () => {
    const t = oauth("/", { session: { id: "guest-a" } });
    await t.controller.start();
    expect(t.controller.takeSignInError()).toBe(false);
  });

  it("a bare return to the session-expired screen keeps the screen and owes no modal", async () => {
    const t = oauth("/");
    t.storage.setItem(SESSION_EXPIRED_KEY, "guest");
    t.tab.setItem(SIGN_IN_STARTED_KEY, String(Date.now()));
    await t.controller.start();
    expect(t.controller.getState()).toEqual({ phase: "session-expired", variant: "guest" });
    expect(t.controller.takeSignInError()).toBe(false);
    expect(t.tab.getItem(SIGN_IN_STARTED_KEY)).toBeNull();
  });

  describe("back-forward-cache restore", () => {
    const restore = (persisted: boolean) =>
      window.dispatchEvent(Object.assign(new Event("pageshow"), { persisted }));

    it("reopens over a ready app once, and tells the listener", async () => {
      const t = oauth("/", { session: { id: "guest-a" } });
      await t.controller.start();
      const listener = vi.fn();
      t.controller.subscribeSignInError(listener);
      t.tab.setItem(SIGN_IN_STARTED_KEY, String(Date.now()));
      restore(true);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(t.controller.takeSignInError()).toBe(true);
      expect(t.tab.getItem(SIGN_IN_STARTED_KEY)).toBeNull();
      restore(true);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("ignores a plain page show and a restore without the marker", async () => {
      const t = oauth("/", { session: { id: "guest-a" } });
      await t.controller.start();
      const listener = vi.fn();
      t.controller.subscribeSignInError(listener);
      restore(false);
      restore(true);
      t.tab.setItem(SIGN_IN_STARTED_KEY, String(Date.now()));
      restore(false);
      expect(listener).not.toHaveBeenCalled();
      expect(t.tab.getItem(SIGN_IN_STARTED_KEY)).not.toBeNull();
    });

    it("on the session-expired screen clears the marker and leaves the screen", async () => {
      const t = oauth("/");
      t.storage.setItem(SESSION_EXPIRED_KEY, "account");
      await t.controller.start();
      t.tab.setItem(SIGN_IN_STARTED_KEY, String(Date.now()));
      restore(true);
      expect(t.controller.getState()).toEqual({ phase: "session-expired", variant: "account" });
      expect(t.controller.takeSignInError()).toBe(false);
      expect(t.tab.getItem(SIGN_IN_STARTED_KEY)).toBeNull();
    });
  });

  it("a marker older than the window is not a return", async () => {
    const t = oauth("/", { session: { id: "guest-a" } });
    t.tab.setItem(SIGN_IN_STARTED_KEY, String(Date.now() - 16 * 60_000));
    await t.controller.start();
    expect(t.controller.takeSignInError()).toBe(false);
    expect(t.tab.getItem(SIGN_IN_STARTED_KEY)).toBeNull();
  });

  it("a return that finds an account session owes no guest error", async () => {
    const t = oauth("/", { session: { id: "oauth-a", anon: false } });
    t.tab.setItem(SIGN_IN_STARTED_KEY, String(Date.now()));
    await t.controller.start();
    expect(t.controller.takeSignInError()).toBe(false);
  });

  it("a restore after another tab signed an account in raises no guest error", async () => {
    const t = oauth("/", { session: { id: "guest-a" } });
    await t.controller.start();
    t.storage.setItem("griddo.session-kind", "account");
    t.tab.setItem(SIGN_IN_STARTED_KEY, String(Date.now()));
    window.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: true }));
    expect(t.controller.takeSignInError()).toBe(false);
    expect(t.tab.getItem(SIGN_IN_STARTED_KEY)).toBeNull();
  });
});
