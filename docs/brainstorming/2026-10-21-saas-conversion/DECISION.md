# SaaS Conversion (Supabase)

## Metadata

- Created: 2026-10-21
- Readiness: code-ready
- Category: architecture / product direction
- Source project: GridDO
- Source topic: `2026-06-04-storage-reliability-and-cloud-sync` (superseded by
  this topic); the post-Phase-35 planning session (2026-10-20/21)
- Source prototype: n/a
- Tags: saas, supabase, auth, rls, postgres, datastore, reactive-hooks, hosting, portfolio
- Dependencies: none; this work runs before the status-feedback, toast and
  remaining theme work
- Related: `2026-10-18-staging-item-status-feedback`,
  `2026-04-28-toast-feedback-placement`, `2026-10-21-default-theme` (runs in
  parallel on `prototype/default-theme`), the Phase 35 MI-13 re-plan of
  Phases 36–40

## Summary

GridDO started as a local-only app: all data in the browser's IndexedDB, no
server and no auth (PRD §Storage Strategy, v1). After a browser data loss made
the app unusable, the user changed the product goal: GridDO becomes a SaaS
with Supabase as the server-side source of truth. The near-term purpose is a
developer portfolio, not a commercial launch. This conversion runs before any
other planned work.

The architecture: the account's whole dataset is loaded into an in-memory
snapshot that the existing hooks read (S07); every write is a Postgres
function called over RPC that keeps the SCHEMA command/result contract (S08);
RLS isolates accounts, and the write functions cannot bypass it (S14). The
components and the hook return shapes stay; the `DataStore` implementation is
rewritten. Everyday interactions keep today's feel through optimistic updates
(S09, S15). Anyone opening the app becomes an isolated guest with mockup data,
and GitHub or Google sign-in gives an own account (S10, S23). The work runs as
Phases 42–48 before Phases 36–40 (S25). A review on 2026-10-21 added the
database security, concurrency, result, backup and ordering rules (S29–S40).
On 2026-10-22 the feedback topic was settled: it runs as a second lane beside
Phases 42–44, the promotion is split in two, and a second review added the
SaaS edge cases (S41–S43).

`NOTES.md` holds the facts checked in the code and the docs, the reasoning and
the rejected options for every decision.

## Decisions (user, 2026-10-20/21)

| ID | Decision |
|---|---|
| S01 | Purpose: a developer portfolio project built as a SaaS. Commercial launch, domain, marketing and billing are out of scope for now. |
| S02 | Supabase is the source of truth for user data, per account. Browser storage is not a source of truth. This replaces the local safety-net direction (Track A, local backup files) of `2026-06-04-storage-reliability-and-cloud-sync`. |
| S03 | Multi-device use is not a requirement for the owner. Nothing extra is built for it. |
| S04 | Existing local IndexedDB data is discarded. There is no export, import or migration of local data; the owner does not use the app until the conversion ships. |
| S05 | The SaaS conversion runs first, before the status-feedback redesign, the toast work and the remaining theme work (the re-plan of Phases 36–40, Phase 35 MI-13). Refined by S39. |
| S06 | Naming: the user-facing product name is "grid". Inside the project (code identifiers, storage keys, documents, package name, repository) the name stays "griddo"/"GridDO", because "Grid" is already a domain term (Grid page, Grid Explorer, `useGridData`, `/grid/[id]`). |
| S07 | Client data architecture: server-authoritative account snapshot. At sign-in the client loads the account's whole dataset into an in-memory snapshot; views and render-time compute run over it as today. Writes go to the server, and the snapshot is updated from the authoritative result. The snapshot is a disposable cache (dropped on reload and sign-out), never a source of truth. The `DataStore` interface and the hook return shapes stay; the hooks' Dexie `liveQuery` subscriptions are replaced by a subscription to the snapshot. Not a per-query cache, not a local-first sync engine. (user, 2026-10-21) |
| S08 | Writes run as Postgres functions called over RPC: every write, ordinary or Inbox command, is one function call and one transaction, keeping the SCHEMA command/result contract. Reads go through the snapshot function under RLS (amended by S31). The client role has no direct insert, update or delete on the tables. (user, 2026-10-21) |
| S09 | Usability principle: everyday interactions feel the same as today. Ordinary writes (drag moves, renames, completion and similar) use optimistic updates with rollback on failure; the Inbox/Triage commands keep their pending/reconciling UI. Accepted differences are limited to sign-in, the initial load and network-failure states. (user, 2026-10-21) |
| S10 | Auth: GitHub and Google OAuth for real accounts. Demo: a visit without a session signs the visitor in anonymously (Supabase anonymous sign-in; entry and account UI in S23) and the mockup seed data is copied into that new account, so each visitor gets an isolated copy; no shared test account. Bot protection with Cloudflare Turnstile and a scheduled cleanup of old anonymous accounts. Real accounts start empty except for the Inbox and Archive system Nodes. (user, 2026-10-21) |
| S11 | Schema mapping: the data model stays, one table per current store, with `user_id` on every row. Ids stay client-generated UUIDs (the command contract needs preallocated ids); `version` stays. Timestamps stay epoch-ms numbers, set by the server clock. Database columns are snake_case; conversion to the existing camelCase TypeScript types happens only at the snapshot loader and the function-result boundary. Device preferences (color theme, Inbox sort) stay in browser storage per device. The IndexedDB `settings` store (breadcrumb-zone migration markers) is removed unless `/craft-docs` finds a path that still needs the migration for new data. (user, 2026-10-21) |
| S12 | Validation: the database is the final gate. Value rules become CHECK constraints (lengths, grid ranges, enums); unique and foreign-key constraints hold relations (unique `sourceBreakdownId`, parent references, `user_id` referencing the auth user with delete cascade). Grid cell uniqueness spans `nodes` and `bits`, so the write functions check it. Client Zod stays for immediate feedback only. This amends CLAUDE.md Architecture 5. (user, 2026-10-21) |
| S13 | Account preparation: no database trigger. Right after sign-in the app calls an idempotent `ensure_account()` function that creates missing system Nodes (normalizing drift as `ensureSystemNodes()` does today) and, for an empty anonymous account, copies the demo seed. (user, 2026-10-21) |
| S14 | Security: RLS on every table (`user_id = auth.uid()`). Write functions run as a dedicated role that cannot bypass RLS, so a function bug cannot reach another account; the first SQL phase proves this, and if it does not hold, the fallback is explicit per-function ownership checks. Cross-account tests (account A cannot read, write or delete account B's rows through any table or function) are blocking for every phase that adds a table or function. (user, 2026-10-21) |
| S15 | Write feel by group. (1) Immediate (optimistic, roll back and notify on failure): position moves (Grid drag, calendar reschedule, Chunk order), field edits (title, description, icon, color, deadline, priority), completion toggles, and creating Nodes, Bits and Chunks. (2) Immediate hide: trash and archive hide the target at once and bring it back on failure; the cascade is not predicted in the client. (3) Server-confirmed with a short pending state: permanent delete, emptying trash, restore from Trash or Archive, and Bit-to-Node promotion. (4) The Inbox/Triage commands keep their pending/reconciling UI. Ordinary writes stay last-write-wins (no expected version), as today. (user, 2026-10-21) |
| S16 | Network failure: no offline editing in v1. While offline the app is view-only, shown by a connection indicator (S27). A failed initial load shows an error with Retry (absorbs Phase 35 MI-23). A failed ordinary write rolls back and notifies. An unknown outcome is never resent: the client refetches the snapshot and keeps or rolls back the change to match the server; the Inbox commands keep their reconcile contract. An expired session refreshes automatically; if the refresh fails, the visitor falls back to the guest state and signs in again from the account modal (S23). The minimal failure-notice surface is aligned with `2026-04-28-toast-feedback-placement` in `/craft-docs`. (user, 2026-10-21) |
| S17 | Multiple tabs: refetch the snapshot when a tab becomes visible or focused and after reconnecting. The snapshot is read in one database function call, so it is one consistent point in time. Realtime is deferred. (user, 2026-10-21) |
| S18 | Client-side jobs: Trash auto-cleanup stays client-triggered (startup and hourly, as today) and calls a database function. The confirmed-orphan cleanup command, the `candidateOrphanAuditEvents` table and the client orphan path are removed: the foreign key from a candidate to its source Breakdown makes an orphan impossible, and a test proves that deleting a staged source is refused. Phase 27 P27-08 becomes moot; the user closes it at promotion. (user, 2026-10-21) |
| S19 | Search stays in memory over the snapshot (global search and Grid Explorer search stay separate, as today). (user, 2026-10-21) |
| S20 | Testing: hook tests against a mocked `DataStore` stay. The in-memory snapshot reads get unit tests without a database. The write functions, their command/result contract and the cross-account tests (S14) run as Vitest tests against a local Supabase with signed-in test users, behind a new `pnpm test:db` gate (required from the first schema phase on). Browser checks sign in as a local test user, and the fixture script seeds through the database functions; `drag.js` stays. Email/password sign-in is enabled locally only. Prerequisites: Docker Desktop (installed by the user) and the Supabase CLI pinned as a project dev dependency. (user, 2026-10-21) |
| S21 | Environments and hosting: two environments, local (`supabase start`) and production (Supabase, Seoul region); no preview environment, deploys from `main` only. Migrations live in Git (`supabase/migrations/`); applying them to production happens at phase close after the user's approval. Hosting on Vercel Hobby with no Next.js server code; auth runs client-side. The project URL and publishable key are public env vars; the secret (service-role) key never enters client code or Git (the repository is public); OAuth and Turnstile secrets live in the Supabase dashboard; local values in a git-ignored `.env.local`. (user, 2026-10-21) |
| S22 | Free plan. No keep-alive job: the owner's daily use keeps the project active, and a paused project is resumed from the dashboard. A weekly automatic backup runs on the owner's Mac (S35, amending the earlier deferral); phase close also downloads a manual data dump right before applying migrations to production. Anonymous-account cleanup runs as a daily `pg_cron` job (fallback if `pg_cron` is unavailable on the free plan: a scheduled GitHub Actions call). (user, 2026-10-21) |
| S23 | Account entry and UI. Any visit without a session creates a per-visitor anonymous (guest) account through Supabase anonymous sign-in, and `ensure_account()` (S13) copies the mockup seed into it; there is no sign-in page and no `/demo` route, and `/` stays the L0 Grid. The sidebar gets one account icon at the very top, above the Add button: Lucide `user-round` for a guest and `user-round-check` for a signed-in OAuth account. The icon opens a modal. Guest modal: browsing-as-guest text, "guest data is deleted after 7 days", GitHub and Google sign-in, and a privacy note; no sign-out (a guest has nothing to sign out of). Account modal: name, sign-out (which leaves the visitor as a new guest), and account deletion; profile settings are out of v1. Sign-up is open to anyone; a guest is never converted into a real account, and a new real account starts empty except for the system Nodes. No top banner. Cloudflare Turnstile is mandatory on anonymous sign-in. A guest's session lives in that browser, so the same browser returns to the same guest account within 7 days. Real accounts are not cleaned up automatically. The modal's look is chosen later on a rendered option sheet under S40. (user, 2026-10-21) |
| S24 | Display name "grid" (S06) appears in the page title, the screen-reader heading of the L0 page and the account modal. The base theme's label in the theme picker is left to `2026-10-21-default-theme`. (user, 2026-10-21) |
| S25 | Phasing: Phases 42–48 from Task 213, executed before Phases 36–40 (precedent: Phase 41 ran before Phase 35). 42 Database foundation: local Supabase, tables, constraints and RLS, proof of the dedicated write role (S14), `ensure_account()`, the snapshot function, cross-account tests and the `pnpm test:db` gate, plus the end-to-end slice and the early production setup (S36). 43 Ordinary write functions, porting the existing DB test scenarios. 44 Inbox/Triage command functions with their reconcile paths and the SCHEMA conformance cases; orphan machinery removed on the database side. 45 Client switch: snapshot store, in-memory reads, RPC writes (all server-confirmed at first), the 19 hook subscriptions, automatic guest entry, fixtures, and the load-failure screen; the app runs on local Supabase. 46 Removal of Dexie, the IndexedDB code and tests, the `settings` store and the client orphan path. 47 Feel and resilience: S15 groups, S16 failure and offline states, S17 refetch, S26 loading and timeouts, S27 connection states, S28 notices. 48 Accounts and launch: OAuth, the account icon and modal, Turnstile, privacy note, account deletion, mockup seed, production sign-in and launch on the production setup from S36, guest cleanup, the production migration procedure with the manual dump, and the "grid" name. Each phase leaves `main` working. `/craft-docs` sets the task split and may fold 46 into 47. The order with the feedback topic and the theme stage is set by S39. (user, 2026-10-21; amended by S36 and S39) |
| S26 | Loading and delay. Until the snapshot is ready the app shows one app-level loading screen, revealed only after a 300ms display delay, so a fast load shows nothing and an empty Grid never reads as lost data. Server-confirmed writes (S15 group 3) show their pending state after the same delay. A request with no answer within 15 seconds is treated as an unknown outcome and follows S16. A failed background refetch (S17) keeps the current view and marks the connection unstable (S27) instead of showing an error screen. A failed guest creation (Turnstile, rate limit, paused or unreachable project) uses the load-failure screen with a reason line and Retry, and retries automatically on reconnect. Partial loads cannot happen because the snapshot is one call (S17). (user, 2026-10-21) |
| S27 | Connection states, judged from real request results, not from `navigator.onLine` alone. Normal: nothing shown, writes allowed. Unstable (the browser reports online but a recent request failed or timed out): a small warning indicator, writes allowed. Offline (the browser reports offline, or three consecutive requests failed): an offline indicator, writes blocked; a write attempt changes nothing on screen and shows a toast. While unstable or offline the client checks the server every few tens of seconds; on recovery it refetches the snapshot and clears the indicator, with no recovery notice. In-flight writes that end without an answer follow S16. The connection indicator, the loading screen and the account modal (S23) are chosen together on one rendered option sheet. (user, 2026-10-21) |
| S28 | Notices follow `2026-04-28-toast-feedback-placement` and `2026-10-18-staging-item-status-feedback`. Failed ordinary writes on the Grid, Calendar and Bit detail, and write attempts while offline, roll back where needed and notify through the existing `sonner` Toaster; a burst of failures is grouped into one toast. Successful writes add no new notice; the existing success toasts (for example Trash restore) stay (S09). The Inbox/Triage status presentation stays as built; if server latency makes pending flicker, Phase 47 may apply the status-feedback topic's display-delay rule ahead of that topic. The Toaster position stays until the toast topic moves it in one place. The order with both topics is set by S39; both topics carry a reference to this entry. (user, 2026-10-21) |
| S29 | Database security rules (orchestrator review R1–R4, R14). (1) Only the functions the client calls live in the exposed schema. Internal functions (guest cleanup, seed copy, helpers) live in a non-exposed schema, and default EXECUTE is revoked from `public`, `anon` and `authenticated`, because Postgres grants EXECUTE to everyone by default and Supabase exposes the `public` schema as an API. (2) Every function pins `search_path` to an empty value and schema-qualifies its names. (3) Relations inside an account use composite foreign keys (`(user_id, parent_id)` referencing `(user_id, id)`), because foreign-key checks bypass RLS and ids are visible in URLs. (4) Foreign keys between user tables use `NO ACTION`, not `RESTRICT`, so account deletion and guest cleanup cascade cleanly. (5) RLS policies use `(select auth.uid())`, and every `user_id` column is indexed. Tests: the client roles cannot call an internal function; an account with a staged candidate can be deleted. At the close of a phase that changes SQL, the Supabase database linter (Security Advisor) shows no new warning. (user, 2026-10-21, from the orchestrator review) |
| S30 | Concurrency (R6). A function that checks and then writes takes a lock first (a row lock on the parent, or a transaction-scoped advisory lock), so two tabs, a double click or a retry cannot place two items in one cell. System Nodes are unique per account (a partial unique index on `(user_id, system_role)`, inserts with `on conflict do nothing`), and the demo seed copy runs at most once per account. Tests fire two concurrent calls: two creates into one cell, and two `ensure_account()` calls. (user, 2026-10-21, from the orchestrator review) |
| S31 | Function results and the snapshot read (R8, R9). Every write function returns one envelope: the status, the command result, and the changed rows per table (upserted rows and deleted ids); the client updates the snapshot only from it. Every function test checks that the snapshot before the call plus the returned changes equals a fresh snapshot after it. The snapshot is one function under RLS (`security invoker`) that returns a single JSON value; a row-set result would be cut silently by the API row limit (1,000 by default). This replaces "Reads are table selects" in S08. (user, 2026-10-21, from the orchestrator review) |
| S32 | Pending-write layer (R7). The client snapshot has two layers: the server-confirmed base and the list of pending writes. Function results and refetches (S17) change only the base; the view is the base with the pending writes applied on top; a pending write leaves the list when it settles, applied or rolled back. Writes to one record are sent in order. Tests: one Bit moved twice in quick succession ends in the second cell without jumping back; a focus refetch during a pending write does not hide that write. (user, 2026-10-21, from the orchestrator review) |
| S33 | Drift between client and database (R13). Database types are generated from the local schema (`supabase gen types typescript`) and type the snake_case/camelCase converter, so a column change breaks the TypeScript build. One table of boundary cases runs against both the Zod schemas and the database constraints. (user, 2026-10-21, from the orchestrator review) |
| S34 | Production change order (R10). From launch on, a phase that changes SQL closes in this order: manual dump, migrations applied to production (compatible with the code still deployed), then the merge that deploys the new code through Vercel. The production schema changes only through migration files, never in the dashboard. (user, 2026-10-21, from the orchestrator review) |
| S35 | Backup (R5; amends S22). A weekly automatic dump of the production database runs on the owner's Mac (a scheduled local job using the Supabase CLI or `pg_dump`) and is kept on the Mac outside Git; the connection secret also stays outside Git. The manual dump before each production migration stays. (user, 2026-10-21, from the orchestrator review) |
| S36 | End-to-end slice and early production (R11; amends S25). Phase 42 adds one thin end-to-end slice: anonymous sign-in on local Supabase, `ensure_account()`, the snapshot, one ordinary write function and its result shown in the app behind a development switch, so the envelope (S31) and the pending-write layer (S32) are fixed before Phases 43–44 port the other functions. Production Supabase and the Vercel project are set up early and unannounced (in Phase 42, or Phase 45 if 42 grows too large; `/craft-docs` decides). Before launch they hold no real data, so migrations apply there freely. Sign-in in production (anonymous with Turnstile, OAuth) and the public launch stay in Phase 48. (user, 2026-10-21, from the orchestrator review) |
| S37 | Per-account limits (R12). Write functions enforce per-account row limits, stricter for guest accounts, and return a typed rejection when a limit is reached, so a scripted guest cannot fill the 500 MB free database. `/craft-docs` sets the numbers. (user, 2026-10-21, from the orchestrator review) |
| S38 | Review safeguards for SQL. `docs/PLANNING_STANDARD.md` gets a checklist for every SQL function: exposed or internal schema, owner role, `search_path`, EXECUTE grants, locks, the result envelope, account limits, and three tests (cross-account, concurrency, change-set match). Every task that changes SQL gets an `expert` review before acceptance. (user, 2026-10-21, from the orchestrator review) |
| S39 | Order with the feedback topic and the theme stage (refines S05, S25 and S28). The feedback discussion (`2026-10-18-staging-item-status-feedback` together with `2026-04-28-toast-feedback-placement`) is settled before Phase 47 starts, and Phase 47 builds the SaaS states (S16, S26–S28) by its rules. After Phase 48 (launch first, so the owner can use the app sooner) come the feedback implementation (the Inbox status redesign, the toast placement, Phase 35 MI-21 and MI-14) and then the theme stage (theme-set reduction, Paper, the Grid, card, sidebar and breadcrumb skins, Claymorphism). Paper continues during the SaaS phases as prototype-only work on `prototype/default-theme`. There is no parallel implementation lane, so the `/run-phase` change is deferred until one is needed. Phase 35 MI-19 is fixed or shown moot in Phase 45, which rewrites the read path it races on. (user, 2026-10-21; the timing of the feedback implementation is amended by S41) |
| S40 | New SaaS surfaces and themes (replaces the theme wording of S23). The account icon and modal, the connection indicator, the loading screen and the load-failure screen use semantic tokens only. Their option sheet renders in the current default theme (`griddo`), and checkpoints check `griddo`, `retro-mac` and `neumorphism`. Per-theme finishing belongs to the theme stage, whose final theme set is `paper`, `retro-mac`, `neumorphism` and `claymorphism` (Phase 35 MI-13: `tiny-desk`, `origami`, `terminal` and `graphite` leave the picker, and `paper` replaces `griddo`). (user, 2026-10-20/21) |
| S41 | Two lanes and two promotions (amends the feedback timing of S39). Lanes: the SaaS lane (Phases 42–48) and a feedback lane, one phase numbered after 48 (precedent: Phase 41 ran before Phase 35), which runs beside Phases 42–44 and closes before Phase 45 starts. The feedback lane opens with the theme-set reduction (feedback F28) and then implements `2026-10-18-staging-item-status-feedback`. The theme stage still follows launch. Two open lanes need the `/run-phase` change, which is no longer deferred and runs in its own fresh session. If the feedback lane has not closed when Phase 45 is ready, Phase 45 waits, or proceeds with the fallback in S43 (4). Promotions: ① this entry promotes first and alone; ② the feedback topic promotes after ① has merged, while Phase 42 runs. Boundary: ① writes the app states and toast use rules that the SaaS phases implement (feedback F02, F11, F13, F14, F16 copy alignment only, F17–F20) into SPEC, DESIGN_TOKENS and the Phase 47–48 tasks; ② writes the rest of the feedback topic (Inbox item status, toast position and colour, the create-dialog change, the breadcrumb reveal and blocked-zone removal, MI-14, MI-21), the theme-set reduction, the retirement of Phases 36–40 (Tasks 180–208) and the rebinding of their deferred items, and its flow review also traces the flows that cross the lanes (offline write attempts in the Inbox, the connection badge). Readings ① applies: S11, no database port of `settings` or the zone migration (F26 removes both); S16, session expiry is F20 with S43 (2); S23, the account icon sits at the top until F21 puts the Home button above it; S26–S28, placements, toast rules and timings are F11–F19. (user, 2026-10-22; the feedback lane's timing is amended by feedback F33, 2026-10-22: Phase 49 closes before Phase 45 and Phase 50 follows Phase 45, so Phase 45 uses the S43 (4) fallback) |
| S42 | SaaS edge cases (orchestrator review, 2026-10-22). (1) Account deletion (S23): one exposed function, `delete_my_account()`, deletes only the caller's own auth user. It runs under a separate role that holds only that right, it is the only exception to S29 (1) and S14, and a test proves it cannot delete another account. (2) Demo seed copy (S10, S13): every copied row gets a new id, and parent and candidate-to-source references are remapped, since ids are unique across accounts. Deadlines and modification times are stored relative to the copy time, so urgency and aging look alive whenever a visitor arrives. (3) Turnstile: when it needs an interactive check, its widget appears inside the F19 loading frame (there is no sign-in page). (4) Narrow screens: below 1024px the app shows a "please open on a desktop" notice in the F19 frame and creates no guest account; hover-only affordances (tooltips, the breadcrumb reveal) are desktop features. This lands in Phase 48. (5) Guest data is deleted 7 days after the guest's last visit, not after its creation: `ensure_account()` records the visit time, and the guest modal says "7 days after your last visit" (amends the S23 wording). (user, 2026-10-22) |
| S43 | Items settled from the orchestrator review (user, 2026-10-21/22). (1) The account icon slot for the F17 badge (icon and badge, no modal) is built in Phase 47; Phase 48 adds the modal, OAuth and Turnstile. (2) F20 copy: for a real account, the saved data is safe and the last change may not have been saved; for a guest whose session cannot be refreshed (for example after the S42 (5) cleanup), a guest variant says the guest data may be gone and offers a new guest session or sign-in. Until Phase 48 the screen offers only `Continue as guest`, since OAuth arrives in Phase 48. (3) Parent-change moves (a drop on a Node, a breadcrumb drop) are S15 group 1: the client picks the nearest empty cell from the snapshot, as `findNearestEmptyCell` does today, and the server refuses a taken cell (S30). (4) Fallback: if F26 has not shipped when Phase 45 starts, the new store implements `runBreadcrumbZoneMigration` as a no-op (there is no legacy data, S04) and the zone guards stay client-only until F26. (user, 2026-10-21/22) |

## Out of scope (for now)

- Billing, a custom domain, marketing, and shared or team workspaces (S01).
- Export, import or migration of existing local data (S04).
- Offline editing (S16), Realtime (S17), a preview environment (S21), a
  keep-alive job (S22), converting a guest into a real account and profile
  settings (S23), and cleanup of inactive real accounts.
- Error monitoring for production (orchestrator review R15, optional; not
  adopted on 2026-10-21).

## Canonical documents to amend at promotion

- `docs/prd.md` §Storage Strategy (v1 local-only, v2 optional sync with auth
  that does not gate access) and the auth and demo product behavior (S10, S23).
- `CLAUDE.md`: the "Local-first Task Management" title; Architecture 1, 2
  (snapshot instead of Dexie reads), 5 (S12), 6 (S09, S15, S16), 7 (system
  Nodes from `ensure_account()`, S13) and 9 (commands as database functions);
  the Workflow gates (`pnpm test:db`, S20), the Test data line (local Supabase
  test account, S20) and the phase-close production step (manual dump, then
  migrations, then the merge, after approval; S21, S22, S34), and the weekly
  backup job (S35).
- `docs/SPEC.md` §Architecture Decisions 1–3, 7, 9, 11 and 15, Routes (no new
  route; auto guest entry), Key File Paths (`supabase/`, the new store), and
  the account icon and modal surface (S23).
- `docs/SCHEMA.md`: Dexie object stores and migrations become Postgres tables
  (S11), constraints (S12), RLS and the write role (S14), the database rules
  (S29, S30), account limits (S37), and functions (S08) with their result
  envelope (S31);
  the command/result contract is kept; `candidateOrphanAuditEvents`, the
  confirmed-orphan command and (if confirmed) `settings` are removed (S11,
  S18); Application Hooks state that the write functions own the side effects
  and that there are still no triggers (S13).
- `docs/DESIGN_TOKENS.md` for the account icon and modal (S23), the
  connection indicator and the loading screen (S26, S27), chosen on one
  rendered option sheet in the current default theme (S40), and the toast use
  for write failures (S28); `docs/PLANNING_STANDARD.md` where verification
  rules name IndexedDB or the fixture path (S20), and the SQL function
  checklist with the `expert` review rule (S38).
- `docs/SPEC.md` also gets the pending-write layer (S32).
- `docs/SPEC.md`, `docs/DESIGN_TOKENS.md` and `docs/SCHEMA.md` also take the
  S42 edge cases (account deletion, seed copy, Turnstile frame, the
  narrow-screen notice, the guest age) and S43.
- `docs/EXECUTION_PLAN.md`: Phases 42–48 from Task 213 (S25, S36), the order
  with the feedback topic and the theme stage (S39, S41); Phase 45 normally
  starts after the feedback lane closes, with the S43 (4) fallback if it has
  not. Promotion ② numbers the
  feedback lane after Phase 48 and retires Phases 36–40; ① leaves them to it
  and notes MI-23 as absorbed (S16).
- `docs/issues/Issues_Deferred.md`: MI-23 absorbed by Phases 45 and 47; MI-19
  bound to Phase 45 (S39); P27-08 moot (S18) and Phase 3 Issue 6 stale, both
  for the user to close.

## Left to `/craft-docs` (not blocking)

- Whether any new-data path (for example Inbox placement) can land in the
  breadcrumb blocked zone, which decides the `settings` removal (S11).
- The detailed shape of the result envelope (S31) and of the pending-write
  layer (S32); a measured bound for the initial load (S07).
- The per-account limit numbers (S37), whether the early production setup
  lands in Phase 42 or 45 (S36), and the backup job's tool, schedule and
  retention (S35).
- The exact toast copy and the grouping window for failure bursts (S28); the
  look of the connection indicator, loading screen and account modal on one
  rendered option sheet (S27).
- Mockup seed content (the content of `scripts/dev-fixtures/inbox-triage.js`
  can serve as a source), the guest cleanup age (7 days by default) and the
  privacy note text (S10, S23).
- Verification in Phase 42 of the dedicated write role and of `pg_cron` on the
  free plan, with the recorded fallbacks (S14, S22).
