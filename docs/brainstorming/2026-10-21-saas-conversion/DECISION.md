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
Phases 42–48 before Phases 36–40 (S25).

`NOTES.md` holds the facts checked in the code and the docs, the reasoning and
the rejected options for every decision.

## Decisions (user, 2026-10-20/21)

| ID | Decision |
|---|---|
| S01 | Purpose: a developer portfolio project built as a SaaS. Commercial launch, domain, marketing and billing are out of scope for now. |
| S02 | Supabase is the source of truth for user data, per account. Browser storage is not a source of truth. This replaces the local safety-net direction (Track A, local backup files) of `2026-06-04-storage-reliability-and-cloud-sync`. |
| S03 | Multi-device use is not a requirement for the owner. Nothing extra is built for it. |
| S04 | Existing local IndexedDB data is discarded. There is no export, import or migration of local data; the owner does not use the app until the conversion ships. |
| S05 | The SaaS conversion runs first, before the status-feedback redesign, the toast work and the remaining theme work (the re-plan of Phases 36–40, Phase 35 MI-13). |
| S06 | Naming: the user-facing product name is "grid". Inside the project (code identifiers, storage keys, documents, package name, repository) the name stays "griddo"/"GridDO", because "Grid" is already a domain term (Grid page, Grid Explorer, `useGridData`, `/grid/[id]`). |
| S07 | Client data architecture: server-authoritative account snapshot. At sign-in the client loads the account's whole dataset into an in-memory snapshot; views and render-time compute run over it as today. Writes go to the server, and the snapshot is updated from the authoritative result. The snapshot is a disposable cache (dropped on reload and sign-out), never a source of truth. The `DataStore` interface and the hook return shapes stay; the hooks' Dexie `liveQuery` subscriptions are replaced by a subscription to the snapshot. Not a per-query cache, not a local-first sync engine. (user, 2026-10-21) |
| S08 | Writes run as Postgres functions called over RPC: every write, ordinary or Inbox command, is one function call and one transaction, keeping the SCHEMA command/result contract. Reads are table selects under RLS. The client role has no direct insert, update or delete on the tables. (user, 2026-10-21) |
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
| S22 | Free plan. No keep-alive job: the owner's daily use keeps the project active, and a paused project is resumed from the dashboard. Automatic backup is deferred by the user; instead, phase close downloads a manual data dump right before applying migrations to production. Anonymous-account cleanup runs as a daily `pg_cron` job (fallback if `pg_cron` is unavailable on the free plan: a scheduled GitHub Actions call). (user, 2026-10-21) |
| S23 | Account entry and UI. Any visit without a session creates a per-visitor anonymous (guest) account through Supabase anonymous sign-in, and `ensure_account()` (S13) copies the mockup seed into it; there is no sign-in page and no `/demo` route, and `/` stays the L0 Grid. The sidebar gets one account icon at the very top, above the Add button: Lucide `user-round` for a guest and `user-round-check` for a signed-in OAuth account. The icon opens a modal. Guest modal: browsing-as-guest text, "guest data is deleted after 7 days", GitHub and Google sign-in, and a privacy note; no sign-out (a guest has nothing to sign out of). Account modal: name, sign-out (which leaves the visitor as a new guest), and account deletion; profile settings are out of v1. Sign-up is open to anyone; a guest is never converted into a real account, and a new real account starts empty except for the system Nodes. No top banner. Cloudflare Turnstile is mandatory on anonymous sign-in. A guest's session lives in that browser, so the same browser returns to the same guest account within 7 days. Real accounts are not cleaned up automatically. The modal's look across the eight themes is chosen later on a rendered option sheet. (user, 2026-10-21) |
| S24 | Display name "grid" (S06) appears in the page title, the screen-reader heading of the L0 page and the account modal. The base theme's label in the theme picker is left to `2026-10-21-default-theme`. (user, 2026-10-21) |
| S25 | Phasing: Phases 42–48 from Task 213, executed before Phases 36–40 (precedent: Phase 41 ran before Phase 35). 42 Database foundation: local Supabase, tables, constraints and RLS, proof of the dedicated write role (S14), `ensure_account()`, the snapshot function, cross-account tests and the `pnpm test:db` gate. 43 Ordinary write functions, porting the existing DB test scenarios. 44 Inbox/Triage command functions with their reconcile paths and the SCHEMA conformance cases; orphan machinery removed on the database side. 45 Client switch: snapshot store, in-memory reads, RPC writes (all server-confirmed at first), the 19 hook subscriptions, automatic guest entry, fixtures, and the load-failure screen; the app runs on local Supabase. 46 Removal of Dexie, the IndexedDB code and tests, the `settings` store and the client orphan path. 47 Feel and resilience: S15 groups, S16 failure and offline states, S17 refetch, S26 loading and timeouts, S27 connection states, S28 notices. 48 Accounts and launch: OAuth, the account icon and modal, Turnstile, privacy note, account deletion, mockup seed, production Supabase and Vercel, guest cleanup, the production migration procedure with the manual dump, and the "grid" name. Each phase leaves `main` working. `/craft-docs` sets the task split and may fold 46 into 47. The default-theme lane may run in parallel once `/run-phase` allows independent lanes (that skill change belongs to its own session), coordinating the account UI of Phase 48; the status-feedback redesign, the toast work and Phases 36–40 run after Phase 48 (S05). (user, 2026-10-21) |
| S26 | Loading and delay. Until the snapshot is ready the app shows one app-level loading screen, revealed only after a 300ms display delay, so a fast load shows nothing and an empty Grid never reads as lost data. Server-confirmed writes (S15 group 3) show their pending state after the same delay. A request with no answer within 15 seconds is treated as an unknown outcome and follows S16. A failed background refetch (S17) keeps the current view and marks the connection unstable (S27) instead of showing an error screen. A failed guest creation (Turnstile, rate limit, paused or unreachable project) uses the load-failure screen with a reason line and Retry, and retries automatically on reconnect. Partial loads cannot happen because the snapshot is one call (S17). (user, 2026-10-21) |
| S27 | Connection states, judged from real request results, not from `navigator.onLine` alone. Normal: nothing shown, writes allowed. Unstable (the browser reports online but a recent request failed or timed out): a small warning indicator, writes allowed. Offline (the browser reports offline, or three consecutive requests failed): an offline indicator, writes blocked; a write attempt changes nothing on screen and shows a toast. While unstable or offline the client checks the server every few tens of seconds; on recovery it refetches the snapshot and clears the indicator, with no recovery notice. In-flight writes that end without an answer follow S16. The connection indicator, the loading screen and the account modal (S23) are chosen together on one rendered option sheet. (user, 2026-10-21) |
| S28 | Notices follow `2026-04-28-toast-feedback-placement` and `2026-10-18-staging-item-status-feedback`. Failed ordinary writes on the Grid, Calendar and Bit detail, and write attempts while offline, roll back where needed and notify through the existing `sonner` Toaster; a burst of failures is grouped into one toast. Successful writes add no new notice; the existing success toasts (for example Trash restore) stay (S09). The Inbox/Triage status presentation stays as built; if server latency makes pending flicker, Phase 47 may apply the status-feedback topic's display-delay rule ahead of that topic. The Toaster position stays until the toast topic moves it in one place. S05 ordering stays; both topics carry a reference to this entry. (user, 2026-10-21) |

## Out of scope (for now)

- Billing, a custom domain, marketing, and shared or team workspaces (S01).
- Export, import or migration of existing local data (S04).
- Offline editing (S16), Realtime (S17), a preview environment (S21), a
  keep-alive job (S22), converting a guest into a real account and profile
  settings (S23), and cleanup of inactive real accounts.
- Automatic backup: deferred by the user (S22); record it in
  `docs/issues/Issues_Deferred.md` at promotion.

## Canonical documents to amend at promotion

- `docs/prd.md` §Storage Strategy (v1 local-only, v2 optional sync with auth
  that does not gate access) and the auth and demo product behavior (S10, S23).
- `CLAUDE.md`: the "Local-first Task Management" title; Architecture 1, 2
  (snapshot instead of Dexie reads), 5 (S12), 6 (S09, S15, S16), 7 (system
  Nodes from `ensure_account()`, S13) and 9 (commands as database functions);
  the Workflow gates (`pnpm test:db`, S20), the Test data line (local Supabase
  test account, S20) and the phase-close production step (manual dump, then
  migrations, after approval; S21, S22).
- `docs/SPEC.md` §Architecture Decisions 1–3, 7, 9, 11 and 15, Routes (no new
  route; auto guest entry), Key File Paths (`supabase/`, the new store), and
  the account icon and modal surface (S23).
- `docs/SCHEMA.md`: Dexie object stores and migrations become Postgres tables
  (S11), constraints (S12), RLS and the write role (S14), and functions (S08);
  the command/result contract is kept; `candidateOrphanAuditEvents`, the
  confirmed-orphan command and (if confirmed) `settings` are removed (S11,
  S18); Application Hooks state that the write functions own the side effects
  and that there are still no triggers (S13).
- `docs/DESIGN_TOKENS.md` for the account icon and modal (S23), the
  connection indicator and the loading screen (S26, S27), chosen on one
  rendered option sheet, and the toast use for write failures (S28), and `docs/PLANNING_STANDARD.md` where verification
  rules name IndexedDB or the fixture path (S20).
- `docs/EXECUTION_PLAN.md`: Phases 42–48 from Task 213 (S25), and the Phases
  36–40 re-plan noting MI-23 as absorbed (S16).
- `docs/issues/Issues_Deferred.md`: automatic backup deferred (S22); MI-23
  absorbed by Phases 45 and 47; P27-08 moot (S18) and Phase 3 Issue 6 stale,
  both for the user to close.

## Left to `/craft-docs` (not blocking)

- Whether any new-data path (for example Inbox placement) can land in the
  breadcrumb blocked zone, which decides the `settings` removal (S11).
- How the snapshot applies function results and orders rapid writes to one
  record; a measured bound for the initial load (S07, S15).
- The exact toast copy and the grouping window for failure bursts (S28); the
  look of the connection indicator, loading screen and account modal on one
  rendered option sheet (S27).
- Mockup seed content (the content of `scripts/dev-fixtures/inbox-triage.js`
  can serve as a source), the guest cleanup age (7 days by default) and the
  privacy note text (S10, S23).
- Verification in Phase 42 of the dedicated write role and of `pg_cron` on the
  free plan, with the recorded fallbacks (S14, S22).
