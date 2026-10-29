import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The browser-side dev fixture in scripts/dev-fixtures seeds through the local-only
// dev.seed_fixture database function (supabase/tests/dev-seed.db.test.ts covers the SQL). It
// must refuse non-local targets, send the service key only to the seed call, and leave the
// browser holding the fixture user's session where the app's client reads it.

type SeedResult = {
  userId: string;
  email: string;
  counts: Record<string, number>;
  inboxRoute: string;
  ids: Record<string, string>;
};

type FixtureApi = {
  IDS: Record<string, string> | null;
  storageKey: (supabaseUrl: string) => string;
  assertLocal: (supabaseUrl: string) => void;
  seed: (options?: Record<string, unknown>) => Promise<SeedResult>;
};

function loadFixture(): FixtureApi {
  const source = readFileSync(
    path.resolve(process.cwd(), "scripts/dev-fixtures/inbox-triage.js"),
    "utf8",
  );
  const sandbox: { griddoFixture?: FixtureApi } = {};
  new Function("window", source)(sandbox);
  if (!sandbox.griddoFixture) throw new Error("fixture did not install");
  return sandbox.griddoFixture;
}

const URL_LOCAL = "http://127.0.0.1:54321";
const KEYS = { publishableKey: "sb_publishable_test", serviceKey: "sb_secret_test" };
const SEEDED = {
  ids: { inbox: "11111111-1111-4111-8111-111111111111", documents: "22222222-2222-4222-8222-222222222222" },
  inboxRoute: "/grid/11111111-1111-4111-8111-111111111111",
  counts: { nodes: 17 },
};

type Call = { url: string; headers: Record<string, string>; body: Record<string, unknown> };

function installBrowser(hostname = "localhost") {
  const store = new Map<string, string>();
  vi.stubGlobal("location", { hostname });
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  });
  const calls: Call[] = [];
  let userExists = false;
  const answer = (status: number, json: unknown) =>
    ({ ok: status < 300, status, text: async () => JSON.stringify(json) }) as Response;
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    const call = {
      url,
      headers: init.headers as Record<string, string>,
      body: JSON.parse(String(init.body)) as Record<string, unknown>,
    };
    calls.push(call);
    if (url.endsWith("/auth/v1/admin/users")) {
      if (userExists) return answer(422, { error_code: "email_exists" });
      userExists = true;
      return answer(200, { id: "u1" });
    }
    if (url.includes("/auth/v1/token")) {
      return answer(200, {
        access_token: "at",
        refresh_token: "rt",
        expires_in: 3600,
        token_type: "bearer",
        user: { id: "33333333-3333-4333-8333-333333333333", email: call.body.email },
      });
    }
    if (url.endsWith("/rest/v1/rpc/seed_fixture")) return answer(200, SEEDED);
    return answer(404, {});
  });
  return { store, calls };
}

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => vi.unstubAllGlobals());

describe("inbox-triage dev fixture", () => {
  it("refuses a non-local page origin or a non-local Supabase URL before any request", async () => {
    const fixture = loadFixture();
    const page = installBrowser("griddo.example.com");
    await expect(fixture.seed(KEYS)).rejects.toThrow(/local dev server/);
    installBrowser("localhost");
    await expect(fixture.seed({ ...KEYS, supabaseUrl: "https://abc.supabase.co" })).rejects.toThrow(/local Supabase/);
    expect(page.calls).toEqual([]);
  });

  it("needs both keys as arguments", async () => {
    installBrowser();
    await expect(loadFixture().seed({ publishableKey: "x" })).rejects.toThrow(/serviceKey/);
  });

  it("creates the fixture user, signs in, seeds through dev.seed_fixture and stores the session", async () => {
    const fixture = loadFixture();
    const { store, calls } = installBrowser();
    store.set("griddo.session-expired", "guest");

    const result = await fixture.seed({ ...KEYS, label: "lane-a", theme: "retro-mac", mode: "dark", poolSort: "ASC" });

    expect(calls.map((call) => call.url.replace(URL_LOCAL, ""))).toEqual([
      "/auth/v1/admin/users",
      "/auth/v1/token?grant_type=password",
      "/rest/v1/rpc/seed_fixture",
    ]);
    expect(calls[0].body).toMatchObject({ email: "fixture-lane-a@griddo.test", email_confirm: true });
    // The service key goes to the admin call and the seed call, never the password grant.
    expect(calls[1].headers.apikey).toBe(KEYS.publishableKey);
    expect(calls[1].headers.Authorization).toBe(`Bearer ${KEYS.publishableKey}`);
    expect(calls[2].headers).toMatchObject({ apikey: KEYS.serviceKey, "Content-Profile": "dev" });
    expect(calls[2].body).toEqual({ p_user_id: result.userId, p_scenario: {} });

    expect(result).toMatchObject({ inboxRoute: SEEDED.inboxRoute, ids: SEEDED.ids, counts: SEEDED.counts });
    expect(fixture.IDS).toEqual(SEEDED.ids);
    const stored = JSON.parse(store.get("sb-127-auth-token") ?? "null");
    expect(stored.user.email).toBe("fixture-lane-a@griddo.test");
    expect(typeof stored.expires_at).toBe("number");
    expect(store.has("griddo.session-expired")).toBe(false);
    expect(store.get("griddo-color-theme")).toBe("retro-mac");
    expect(store.get("theme")).toBe("dark");
    expect(JSON.parse(store.get("griddo-triage-preferences") ?? "{}")).toEqual({
      poolCreatedAtSort: "ASC",
      breakdownCreatedAtSort: "DESC",
    });
  });

  it("reuses a valid stored session of the same fixture user instead of signing in again", async () => {
    const fixture = loadFixture();
    const { calls } = installBrowser();
    await fixture.seed(KEYS);
    calls.length = 0;
    await fixture.seed({ ...KEYS, overflow: true });
    expect(calls.map((call) => call.url.replace(URL_LOCAL, ""))).toEqual(["/rest/v1/rpc/seed_fixture"]);
    expect(calls[0].body.p_scenario).toEqual({ overflow: true });
  });

  it("tolerates an existing user and reports a failed seed with the server's text", async () => {
    const fixture = loadFixture();
    installBrowser();
    await fixture.seed(KEYS); // creates the user
    vi.unstubAllGlobals();
    const { store } = installBrowser();
    vi.stubGlobal("fetch", async (url: string) => {
      const ok = (json: unknown, status = 200) =>
        ({ ok: status < 300, status, text: async () => JSON.stringify(json) }) as Response;
      if (url.endsWith("/auth/v1/admin/users")) return ok({ error_code: "email_exists" }, 422);
      if (url.includes("/auth/v1/token")) {
        return ok({ access_token: "a", refresh_token: "r", expires_in: 3600, user: { id: "u", email: "e" } });
      }
      return ok({ message: "not a fixture test user" }, 403);
    });
    await expect(fixture.seed(KEYS)).rejects.toThrow(/dev\.seed_fixture failed \(403\).*not a fixture test user/);
    expect(store.has("sb-127-auth-token")).toBe(false);
  });
});
