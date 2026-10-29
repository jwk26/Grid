# Phase 45 — Client Switch

## Completion-time scope

Closed 2026-10-29. Tasks 225–229 are user-accepted. SaaS lane, part 4: the
app moved from IndexedDB to local Supabase. Task 225 re-confirmed
`DP-SAAS-01` and changed SA-4 from a dialog card to a text block on the shell
background. Task 226 moved the 19 live queries of 17 hooks to
`DataStore.liveRead` and answered every read over the account snapshot
(`supabase-store.ts`, shared read helpers, sorted reads cached per view).
Task 227 sent every write as one database function call, server-confirmed
(the one-call actions `emptyTrash`, `reorderChunks` and the parent extension;
`SnapshotStore.command`; a queued write expires unsent after
`2 × REQUEST_TIMEOUT_MS`; 408/502/503/504 count as no answer, recorded in
SPEC §Write feel). Task 228 added guest entry (`src/lib/auth/session.ts`),
the app frame with the load-failure, guest-creation-failure and minimal
session-expired screens, and switched `getDataStore()` to the Supabase store;
before the switch the Newly Placed Undo truth moved out of the live read into
the request-free `DataStore.getPlacementUndoTruth()` over the pure
`placementUndoVerdict` (user Decision (A), 2026-10-29), because a reconcile
inside the live read looped on its own envelope. Task 229 replaced the
IndexedDB fixture with the local-only `dev.seed_fixture` in
`supabase/seed.sql` and fixed Phase 35 MI-19 with tests. No migration changed,
so nothing went to production. Ran on branch `phase-45/client-switch`.

Plan deviation: the Task 227–229 browser checks ran in the DevTools browser or
a headless Playwright script, not the Playwright MCP browser the plan named,
because the project `.mcp.json` server had never been enabled; the close
commit enables it in `.claude/settings.json` (user, 2026-10-29).

Carried in: Phase 35 MI-19 (closed in Task 229) and MI-23 (the load-failure
screen landed in Task 228; the loading screen stays with Task 234). Carried
over to [`Issues_Deferred.md`](../../issues/Issues_Deferred.md): MI-24 (theme
stage), mi-1 (Task 245), mi-2 (Task 246), mi-3 (Task 249), Phase 35 MI-23
(Task 234). Forward notes for Tasks 231–235 are in the ledger:
[`Issues_Phase_45.md`](../../issues/Issues_Phase_45.md).

## Task contracts at close

The app moves to local Supabase: snapshot reads, RPC writes (all
server-confirmed at first), automatic guest entry, the load-failure screen and
the fixtures. Optimistic feel waits for Phase 47, so a regression in one cannot
hide in the other. S43 (4) is the plan (feedback F33): F26 ships in Phase 50,
after this phase, so the Supabase store implements `runBreadcrumbZoneMigration`
as a no-op and the zone guards stay client-only until Task 249.

### Task 225: [x] Confirm the SaaS surfaces decision `DP-SAAS-01`

**Files and actions:** `DP-SAAS-01` was decided in Task 242 (Phase 49) on the
same option sheet as `DP-FB-01` (feedback F33). Compare the recorded choice in
DESIGN_TOKENS §SaaS App-State Surfaces with the current SPEC surfaces (App-level
screens, Account icon and modal); show the user any surface SPEC has added or
changed since Task 242; the user re-confirms or adjusts, and an adjustment is
recorded in the same section.

**Dependencies:** Phase 44 and Phase 49 Final Close and `main` sync; this
phase's lifecycle gate.

**Authority:** S27, S40; feedback F33; DESIGN_TOKENS `DP-SAAS-01`.

**Observable acceptance:** the user confirms or adjusts each surface; the
section matches SPEC; no implementation file changes.

**Verification:** `git diff --check`; the user confirms the recorded text.

**Commit message:** `docs(design): confirm DP-SAAS-01`.

### Task 226: [x] Move reads to the snapshot and replace the live queries

**Files and actions:**
- `DataStore.liveRead(read)` in `src/lib/db/datastore.ts`, with a `liveRead`
  helper hooks import from there: an observable with Dexie `liveQuery`'s
  subscribe shape that re-runs a DataStore read on every data change. The
  Dexie implementation backs it with `liveQuery` inside `indexeddb.ts`, so no
  hook imports `dexie` (PLANNING_STANDARD §6 DataStore facade); the Supabase
  store backs it with snapshot subscriptions.
- The 19 `liveQuery` call sites in the 17 hook files (`use-bit-detail`,
  `use-breadcrumb-chain`, `use-calendar-data`, `use-can-archive-scratch`,
  `use-explorer-remote-status`, `use-external-scratch-removal-data`,
  `use-global-urgency`, `use-grid-data`, `use-grid-explorer-search`,
  `use-inbox`, `use-node`, `use-node-urgency`, `use-scratch-breakdowns`,
  `use-staged-candidates`, `use-trash-data`, `use-trash-scratch`,
  `use-triage-newly-placed`) move to `liveRead`; return shapes unchanged;
  every test that mocks `dexie` (13 files today: 12 hook tests and
  `src/components/triage/hierarchy-explorer.test.tsx`) moves to mocking
  `liveRead`.
- `src/lib/db/supabase-store.ts`: every `DataStore` read method answered in
  memory over the snapshot with SCHEMA Key Queries semantics, `searchAll()`
  included (S19); unit tests without a database.

**Dependencies:** Task 225.

**Authority:** S07, S19; SPEC Architecture Decisions 2, 3, 19; SCHEMA Key
Queries.

**Observable acceptance:** hook tests against the mocked `DataStore` stay
green; every read method gives the same result over a snapshot as the Dexie
store over the same data (shared fixture); the app still runs on Dexie after
this task.

**Verification:** full gate; `expert` review (reactive boundary).

**Commit message:** `refactor(hooks): move reads to liveRead and the snapshot`.

### Task 227: [x] Send every write as a database function call

**Files and actions:**
- `src/lib/db/supabase-store.ts`: every production `DataStore` write method
  calls its function and applies the envelope to the snapshot base after the
  answer (server-confirmed, no optimistic overlay yet); every call without an
  answer within `REQUEST_TIMEOUT_MS` ends as an unknown outcome, so Inbox
  commands reconcile through their reconcile functions; `rejected` codes reach
  the callers' existing failure paths, keeping the thrown messages callers
  match today (`GRID_FULL` in `trash-group.tsx`, `Node not found:` in
  `use-trash-actions.ts`); an Inbox `account_limit` rejection shows as that
  command's existing rejected state with the reason in
  `src/lib/copy/inbox-triage.ts`; `ensureSystemNodes()` calls
  `ensure_account()`; the confirmed-orphan command and its reconcile method
  return `rejected` with no call, since an orphan cannot occur (S18); the five
  test-only Breakdown writes throw "not supported" until Phase 46 removes them;
  `runBreadcrumbZoneMigration` is a no-op (S43 (4); Task 249 removes it).
- One action, one call (SCHEMA §Exposed functions): `DataStore` gains
  `emptyTrash()` and `reorderChunks()`, and the Bit and Chunk updates take the
  parent extension; `use-trash-actions.ts`, `bit-detail-popup.tsx`
  (`handleDeadlineConflictUpdateParent`), `chunk-pool.tsx` (reorder) and
  `use-dnd.ts` (the Calendar Chunk-time answer) call them once. The Dexie
  store implements them too, so the app keeps running on Dexie until Task
  228.
- Reserved cells (feedback F34): until Task 249 the Supabase store passes the
  top-left 3×2 block (`getStaticBlockedCells()` in
  `src/lib/utils/breadcrumb-zone.ts`) as `p_reserved_cells` to `restore_*`,
  `unarchive_*`, `promote_bit_to_node` and the system-Node show path of
  `update_node`.

**Dependencies:** Task 226.

**Authority:** S08, S16 (no resend), S31; SPEC §Write feel (group 4), SCHEMA
§Database Functions.

**Observable acceptance:** store tests in `supabase/tests/` (run by
`pnpm test:db`) show every write method reaching its function, Inbox commands reconciling after a forced
timeout, and each one-call action sending exactly one request; the app still
runs on Dexie.

**Verification:** full gate; `expert` review.

**Commit message:** `feat(db): send every write as a database function call`.

### Task 228: [x] Add guest entry and the load-failure screen

**Files and actions:**
- `src/lib/auth/session.ts`: anonymous sign-in on local Supabase (no
  Turnstile yet), `ensure_account()`, snapshot load; refresh-failure
  classification (an auth-server rejection sets the session-expired marker; a
  network failure goes to the connection path; the screen comes in Task 234);
  the cross-tab rule of SPEC §Account entry (a user change in another tab drops
  the snapshot and repeats entry; two first-visit tabs converge on one
  session).
- `src/components/layout/app-frame.tsx` and test: gates the app until the
  snapshot is ready (no loading indicator yet); the load-failure and
  guest-creation-failure screens with reason lines and `Retry`, and the
  automatic retry on reconnect, in the `DP-SAAS-01` look with copy from
  `src/lib/copy/feedback.ts` (created here if absent).
- `src/app/providers.tsx`: mount the frame; `TrashAutoCleanup` calls
  `cleanup_expired_trash()`; `SystemNodeSeeding` is replaced by
  `ensure_account()`.
- `src/lib/db/datastore.ts`: `getDataStore()` returns the Supabase store, once
  the session and snapshot bootstrap above is in place.
- Reserved cells (feedback F34): `session.ts` passes the same top-left 3×2
  block to `ensure_account()` until Task 249.

**Dependencies:** Task 227.

**Authority:** S10, S13, S16, S23, S26; F19; SPEC §Account entry, §App-level
screens; absorbs Phase 35 MI-23.

**Observable acceptance:** a fresh browser becomes a guest with its system
Nodes; the same browser returns to the same guest after reload; with local
Supabase stopped the load-failure screen shows its reason and `Retry` works
after a restart; an empty Grid never flashes before the data; two tabs opened
on a first visit end on the same guest; Grid,
Calendar, Bit detail, Trash, Archive View and Inbox flows work on local
Supabase and a reload shows every change; if Task 243 is on `main`, the state
switch's outcome injection still works on the Supabase store.

**Verification:** full gate; `expert` review; browser checkpoint in the three
themes.

**Commit message:** `feat(auth): add guest entry and the load-failure screen`.

### Task 229: [x] Seed browser checks through the database and settle MI-19

**Files and actions:**
- `supabase/seed.sql` (runs on local `db reset` only, never a migration):
  creates a `dev` schema with `dev.seed_fixture(user_id, scenario)`, granted
  only to `service_role`; `supabase/config.toml` exposes `dev` locally. The
  function first calls `ensure_account()` for that user with the top-left 3×2
  block as `p_reserved_cells` (feedback F34; `seed.sql` is development-only, so
  the block simply stays in this function after Task 249), clears every row
  except the `accounts` row and the system Nodes, then inserts the scenario
  with times
  relative to now (aged, past-deadline, created-order and old-Trash states)
  and with the account's existing system Node ids in place of the fixture's;
  neither the system Nodes nor any scenario item uses a cell with `x` < 3 and
  `y` < 2 at any level (feedback F34), checked by a database test.
- `scripts/dev-fixtures/inbox-triage.js`: signs in as a local test user, calls
  `dev.seed_fixture` with the local service key, refuses to run against a
  non-local URL, and returns the scenario ids (`IDS`, `inboxRoute`) per run.
  Fault injection (`armFault`) is replaced by the development state switch
  (feedback F30) and by stopping local Supabase. `drag.js` unchanged.
- `src/lib/db/inbox-triage-dev-fixture.test.ts` updated.
- Phase 35 MI-19: read the Pool query and sort after
  `await readTerminalSnapshot` in the lifecycle handoff, with a test, or show
  in the ledger that the new read path makes it moot.

**Dependencies:** Task 228.

**Authority:** S20, S39; CLAUDE.md Test data.

**Observable acceptance:** every scenario the fixture offered on IndexedDB is
reachable on local Supabase; MI-19 is fixed or shown moot for the user to
close.

**Verification:** full gate; `expert` review (the `dev` function follows the
SQL checklist); fixture run in the Playwright MCP browser.

**Commit message:** `chore(fixtures): seed browser checks through the database`.
