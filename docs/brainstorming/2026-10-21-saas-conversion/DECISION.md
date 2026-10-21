# SaaS Conversion (Supabase)

## Metadata

- Created: 2026-10-21
- Readiness: draft
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

This entry records the decisions made so far. The architecture is still open:
`NOTES.md` holds the open questions, the facts checked in the code and the
brief for the next brainstorming session.

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
| S10 | Auth: GitHub and Google OAuth for real accounts. Demo: a portfolio demo link signs the visitor in anonymously (Supabase anonymous sign-in) and copies the mockup seed data into that new account, so each visitor gets an isolated copy; no shared test account. Bot protection with Cloudflare Turnstile and a scheduled cleanup of old anonymous accounts. Real accounts start empty except for the Inbox and Archive system Nodes. (user, 2026-10-21) |
| S11 | Schema mapping: the data model stays, one table per current store, with `user_id` on every row. Ids stay client-generated UUIDs (the command contract needs preallocated ids); `version` stays. Timestamps stay epoch-ms numbers, set by the server clock. Database columns are snake_case; conversion to the existing camelCase TypeScript types happens only at the snapshot loader and the function-result boundary. Device preferences (color theme, Inbox sort) stay in browser storage per device. The IndexedDB `settings` store (breadcrumb-zone migration markers) is removed unless `/craft-docs` finds a path that still needs the migration for new data. (user, 2026-10-21) |
| S12 | Validation: the database is the final gate. Value rules become CHECK constraints (lengths, grid ranges, enums); unique and foreign-key constraints hold relations (unique `sourceBreakdownId`, parent references, `user_id` referencing the auth user with delete cascade). Grid cell uniqueness spans `nodes` and `bits`, so the write functions check it. Client Zod stays for immediate feedback only. This amends CLAUDE.md Architecture 5. (user, 2026-10-21) |
| S13 | Account preparation: no database trigger. Right after sign-in the app calls an idempotent `ensure_account()` function that creates missing system Nodes (normalizing drift as `ensureSystemNodes()` does today) and, for an empty anonymous account, copies the demo seed. (user, 2026-10-21) |
| S14 | Security: RLS on every table (`user_id = auth.uid()`). Write functions run as a dedicated role that cannot bypass RLS, so a function bug cannot reach another account; the first SQL phase proves this, and if it does not hold, the fallback is explicit per-function ownership checks. Cross-account tests (account A cannot read, write or delete account B's rows through any table or function) are blocking for every phase that adds a table or function. (user, 2026-10-21) |
| S15 | Write feel by group. (1) Immediate (optimistic, roll back and notify on failure): position moves (Grid drag, calendar reschedule, Chunk order), field edits (title, description, icon, color, deadline, priority), completion toggles, and creating Nodes, Bits and Chunks. (2) Immediate hide: trash and archive hide the target at once and bring it back on failure; the cascade is not predicted in the client. (3) Server-confirmed with a short pending state: permanent delete, emptying trash, restore from Trash or Archive, and Bit-to-Node promotion. (4) The Inbox/Triage commands keep their pending/reconciling UI. Ordinary writes stay last-write-wins (no expected version), as today. (user, 2026-10-21) |
| S16 | Network failure: no offline editing in v1. While offline the app is view-only with a banner. A failed initial load shows an error with Retry (absorbs Phase 35 MI-23). A failed ordinary write rolls back and notifies. An unknown outcome is never resent: the client refetches the snapshot and keeps or rolls back the change to match the server; the Inbox commands keep their reconcile contract. An expired session refreshes automatically and falls back to sign-in. The minimal failure-notice surface is aligned with `2026-04-28-toast-feedback-placement` in `/craft-docs`. (user, 2026-10-21) |
| S17 | Multiple tabs: refetch the snapshot when a tab becomes visible or focused and after reconnecting. The snapshot is read in one database function call, so it is one consistent point in time. Realtime is deferred. (user, 2026-10-21) |
| S18 | Client-side jobs: Trash auto-cleanup stays client-triggered (startup and hourly, as today) and calls a database function. The confirmed-orphan cleanup command, the `candidateOrphanAuditEvents` table and the client orphan path are removed: the foreign key from a candidate to its source Breakdown makes an orphan impossible, and a test proves that deleting a staged source is refused. Phase 27 P27-08 becomes moot; the user closes it at promotion. (user, 2026-10-21) |
| S19 | Search stays in memory over the snapshot (global search and Grid Explorer search stay separate, as today). (user, 2026-10-21) |

## Out of scope (for now)

- Billing, a custom domain, marketing, and shared or team workspaces (S01).
- Export, import or migration of existing local data (S04).

## Canonical documents to amend at promotion

- `docs/prd.md` §Storage Strategy (v1 local-only, v2 optional sync with auth
  that does not gate access).
- `CLAUDE.md`: the "Local-first Task Management" title and Architecture 1, 2,
  5 and 6.
- `docs/SPEC.md` §Architecture Decisions 1–3 and 11, and Key File Paths.
- `docs/SCHEMA.md`: Dexie object stores and migrations become Postgres tables,
  RLS policies and functions; the command/result contract is kept.
- `docs/DESIGN_TOKENS.md` for any new sign-in or account surface, and
  `docs/PLANNING_STANDARD.md` where verification rules name IndexedDB.
- `docs/EXECUTION_PLAN.md`: new phases from the next unallocated numbers
  (Phase 42 / Task 213).
