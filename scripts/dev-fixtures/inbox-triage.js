// GridDO Inbox/Triage test data for browser checks, seeded through local Supabase.
//
// Run only in the Playwright MCP browser against a local dev server and local Supabase.
// Install: browser_run_code_unsafe with
//   `async (page) => page.addScriptTag({ path: "scripts/dev-fixtures/inbox-triage.js" })`
// Then: browser_evaluate with
//   `() => window.griddoFixture.seed({ publishableKey, serviceKey, theme: "retro-mac" })`
// (keys from `pnpm exec supabase status -o env`: PUBLISHABLE_KEY and SECRET_KEY; they are
// arguments, never written in this file), and reload the page so the app reads the new
// data (the app does not refetch before Task 233). Open the returned `inboxRoute`.
//
// What seed() does: signs in as the local fixture user fixture-<label>@griddo.test (created
// on first use, reusing the browser's stored session while it is valid, so the local limit of
// 30 password sign-ins per 5 minutes per IP is not spent on every run), calls the local-only
// dev.seed_fixture (created by supabase/seed.sql on `db reset`, executable by service_role
// only), and stores that session where the app's Supabase client reads it, so the reload opens
// the seeded account instead of a new guest. It clears the fixture user's account first (the
// accounts row and the system Nodes stay) and never touches another user. It refuses unless
// the page origin and the Supabase URL are both local.
//
// Former fault injection (armFault, which held or aborted IndexedDB transactions) is replaced
// by: the development state switch (src/lib/dev/state-switch.ts), which forces outcomes only
// for the Inbox/Triage commands it lists (forcing a rejection of an ordinary write arrives with
// Task 231), and stopping the `supabase_kong_grid` container (then
// starting it again) for an unreachable server and the load-failure screen.
//
// The Full folder holds a Bit in every cell outside the top-left 3x2 block (feedback F34), but the
// client only blocks the breadcrumb zone it measures, so it can still offer block cells. To reach
// the full-grid message ("has no empty cell"), create in the Full folder until the dialog
// answers it, filling the block cells the measured breadcrumb leaves open. After Task 249 the
// folder is checked to read as full without this step (ledger mi-3).
//
// Scenario ids are generated per run by the database function; the same keys as before
// (inbox, archive, documents, fullFolder, stagingScratch, ...) are returned under `ids` and
// kept at window.griddoFixture.IDS. Use one fixture label per browser session or lane: two
// sessions seeding the same label replace each other's data.
window.griddoFixture = (() => {
  const DEFAULT_SUPABASE_URL = "http://127.0.0.1:54321";
  const LOCAL_HOSTS = ["localhost", "127.0.0.1"];
  const FIXTURE_DOMAIN = "griddo.test";
  const FIXTURE_PASSWORD = "fixture-password-local-only";
  const MARKER_KEYS = ["griddo.session-expired", "griddo.deliberate-sign-out"];
  const state = { IDS: null };

  // supabase-js default: sb-<first label of the host>-auth-token.
  function storageKey(supabaseUrl) {
    return `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`;
  }

  function assertLocal(supabaseUrl) {
    if (!LOCAL_HOSTS.includes(location.hostname)) {
      throw new Error(`Fixture runs only on a local dev server, not ${location.hostname}`);
    }
    if (!LOCAL_HOSTS.includes(new URL(supabaseUrl).hostname)) {
      throw new Error(`Fixture runs only against local Supabase, not ${new URL(supabaseUrl).hostname}`);
    }
  }

  async function call(supabaseUrl, path, { key, bearer = key, body, headers = {} }) {
    const response = await fetch(`${supabaseUrl}${path}`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${bearer}`, "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    });
    const text = await response.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return { ok: response.ok, status: response.status, json, text };
  }

  function storedSession(supabaseUrl) {
    try {
      return JSON.parse(localStorage.getItem(storageKey(supabaseUrl)) ?? "null");
    } catch {
      return null;
    }
  }

  async function fixtureSession({ supabaseUrl, publishableKey, serviceKey, label }) {
    const email = `fixture-${label}@${FIXTURE_DOMAIN}`;
    const kept = storedSession(supabaseUrl);
    if (kept?.user?.email === email && typeof kept.expires_at === "number" && kept.expires_at > Date.now() / 1000 + 120) {
      return kept;
    }
    const created = await call(supabaseUrl, "/auth/v1/admin/users", {
      key: serviceKey,
      body: { email, password: FIXTURE_PASSWORD, email_confirm: true },
    });
    // An existing user answers 422 email_exists; anything else is a real failure.
    if (!created.ok && created.json?.error_code !== "email_exists") {
      throw new Error(`Creating ${email} failed (${created.status}): ${created.text}`);
    }
    const token = await call(supabaseUrl, "/auth/v1/token?grant_type=password", {
      key: publishableKey,
      body: { email, password: FIXTURE_PASSWORD },
    });
    if (!token.ok || !token.json?.access_token) {
      throw new Error(`Signing in ${email} failed (${token.status}): ${token.text}`);
    }
    const session = token.json;
    if (typeof session.expires_at !== "number") {
      session.expires_at = Math.floor(Date.now() / 1000) + (session.expires_in ?? 3600);
    }
    return session;
  }

  async function seed(options = {}) {
    const {
      supabaseUrl = DEFAULT_SUPABASE_URL, publishableKey, serviceKey, label = "browser", overflow = false,
    } = options;
    if (!publishableKey || !serviceKey) {
      throw new Error("seed needs publishableKey and serviceKey from `supabase status -o env`");
    }
    assertLocal(supabaseUrl);
    const session = await fixtureSession({ supabaseUrl, publishableKey, serviceKey, label });
    const seeded = await call(supabaseUrl, "/rest/v1/rpc/seed_fixture", {
      key: serviceKey,
      headers: { "Content-Profile": "dev" },
      body: { p_user_id: session.user.id, p_scenario: overflow ? { overflow: true } : {} },
    });
    if (!seeded.ok) {
      throw new Error(`dev.seed_fixture failed (${seeded.status}): ${seeded.text}`);
    }
    localStorage.setItem(storageKey(supabaseUrl), JSON.stringify(session));
    for (const key of MARKER_KEYS) localStorage.removeItem(key);
    applyPresentation(options);
    state.IDS = seeded.json.ids;
    return {
      userId: session.user.id,
      email: session.user.email,
      counts: seeded.json.counts,
      inboxRoute: seeded.json.inboxRoute,
      ids: seeded.json.ids,
      next: "Reload the page; the app does not refetch before Task 233.",
    };
  }

  // Optional device presentation, using the keys the app persists.
  function applyPresentation({ theme, mode, poolSort, breakdownSort } = {}) {
    if (theme) localStorage.setItem("griddo-color-theme", theme);
    if (mode) localStorage.setItem("theme", mode);
    if (poolSort || breakdownSort) {
      const current = JSON.parse(localStorage.getItem("griddo-triage-preferences") ?? "{}");
      localStorage.setItem("griddo-triage-preferences", JSON.stringify({
        poolCreatedAtSort: poolSort ?? current.poolCreatedAtSort ?? "DESC",
        breakdownCreatedAtSort: breakdownSort ?? current.breakdownCreatedAtSort ?? "DESC",
      }));
    }
  }

  return {
    FIXTURE_DOMAIN,
    get IDS() {
      return state.IDS;
    },
    storageKey,
    assertLocal,
    seed,
  };
})();
