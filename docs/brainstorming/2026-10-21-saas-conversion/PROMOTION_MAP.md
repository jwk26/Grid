# SaaS Conversion — Promotion Map (Promotion ①)

## Metadata

- Created: 2026-10-22
- Status: promotion ① complete (2026-10-22): canonical documents, execution plan and flow review approved
- Route: `/craft-docs` promotion route, branch `docs/saas-conversion`
- Sources: this topic's `DECISION.md` (S01–S43) and, within the S41 boundary,
  `2026-10-18-staging-item-status-feedback/DECISION.md` F02, F11, F13, F14,
  F16 (copy alignment only) and F17–F20. `NOTES.md` files are context only.
- Prototype sources: none. The feedback topic's `option-sheets/` are the
  user's own reference and are not adopted, cited or compared.

## Boundary (S41)

Promotion ① writes the SaaS entry and the app states and toast rules that the
SaaS phases implement. Promotion ② (the feedback topic, after ① has merged,
while Phase 42 runs) writes everything else: F01, F03–F10, F12, F15, the F16
create-dialog change and the dropped `Cell reserved by breadcrumb` toast,
F21–F30, MI-13, MI-14, MI-21, the theme-set reduction, CLAUDE.md
Architecture 8, the retirement of Phases 36–40 (Tasks 180–208) and the
rebinding of their deferred items, and the feedback lane phase (numbered after
Phase 48). ① marks Phases 36–40 only as awaiting ②.

## Decision map

| Decisions | Target |
|---|---|
| S01, S02, S04, S06, S24 | `docs/prd.md` §Storage Strategy supersession note (PRD is non-authoritative); SCHEMA and SPEC headers |
| S07, S17, S19, S32 | SPEC Architecture 2, 3, 9 and a new decision for the account snapshot and pending-write layer; SPEC State Ownership; SCHEMA Key Queries (in memory over the snapshot) |
| S08, S31 | SCHEMA new section: database functions and the result envelope; SPEC Architecture 2, 11 |
| S09, S15, S43 (3) | CLAUDE.md Architecture 6; SPEC Architecture 11 and the write-feel group table |
| S10, S13, S23, S42, S43 (1)(2) | SPEC Routes (auth paragraph) and a new account entry and surfaces section; SCHEMA `ensure_account()`, `delete_my_account()`, `accounts` table |
| S11, S12, S33 | SCHEMA Object Stores become tables (snake_case, `user_id`, CHECK, composite foreign keys); CLAUDE.md Architecture 5; SPEC Architecture 7 |
| S14, S29, S30, S37 | SCHEMA new section: roles, schemas, RLS, locks and account limits |
| S38 | PLANNING_STANDARD §6: SQL function checklist and the `expert` review rule |
| S16, S26–S28 with F02, F11, F13, F14, F16 copy, F17–F20 | SPEC new section: app states and feedback (with the copy table); DESIGN_TOKENS new section: SaaS app-state surfaces and toast use |
| S18 | SCHEMA: remove `candidateOrphanAuditEvents` and the confirmed-orphan command; Hook 7 |
| S20 | CLAUDE.md gates (`pnpm test:db`) and Test data line; PLANNING_STANDARD §5, §6 |
| S21, S22, S34, S35 | CLAUDE.md phase-close production step and weekly backup; SPEC new section: environments |
| S40 | DESIGN_TOKENS SaaS surfaces theme scope |
| S41 readings | S11: no database port of `settings` or the zone migration. S16: session expiry is F20 with S43 (2). S23: the account icon sits at the top until F21 (②) puts Home above it. S26–S28: placements, toast rules and timings are F11–F19 |
| S43 (4) | EXECUTION_PLAN Phase 45 fallback |
| S05, S25, S36, S39, S41 | EXECUTION_PLAN Phases 42–48 from Task 213, Dependency Graph, Phase Index, Next Numbers (Phase 49 left to ②) |
| Carried items | `Issues_Deferred.md`: MI-23 absorbed by Phases 45 and 47; MI-19 bound to Phase 45 |

## Decisions delegated to `/craft-docs`

| ID | Decision | Reason |
|---|---|---|
| D1 | The early production setup (S36) is the last task of Phase 42. | On hosted Supabase `postgres` is not a true superuser, so a local pass does not prove the dedicated write role (S14); `pg_cron` on the free plan (S22) can only be checked there. |
| D2 | Phase 46 stays separate from Phase 47. | A deletion-only diff is reviewed apart from Phase 47's user-checked surfaces. |
| D3 | Three schemas: `app` (tables, not exposed), `public` (only the functions the client calls), `internal` (internal functions). | S29 (1), and the tables are not reachable through the API at all. |
| D4 | Result envelope: `{ status, result, changes: { <table>: { upserted: Row[], deleted: id[] } }, rejection? }`; ordinary writes use the same envelope. | S31. |
| D5 | Pending-write layer: a server-confirmed base plus an ordered pending list; the view is the base with the pending writes applied; writes to one record are sent in order. | S32. |
| D6 | An `app.accounts` table holds the last visit time (S42 (5)) and the seed-copied marker (S30). | Both decisions need a stored value. |
| D7 | Names: `DISPLAY_DELAY_MS = 300`, `REQUEST_TIMEOUT_MS = 15000` and a 30s connection probe interval in `src/lib/constants.ts`; the shared feedback copy module is `src/lib/copy/feedback.ts`. The first writer, in either lane, creates them under these names. | F02, F14, S26, S27; promotion ② and the feedback lane may run first. |
| D8 | Initial load bound (S07): Phase 42 measures the snapshot on production (Seoul). Target: an account at the limits loads in 3s or less, an account at one tenth of the limits in 1s or less. If the target fails, the limits are lowered. | S07, S37. |
| D9 | `icon` gets a maximum length (64) in the CHECK constraints and in Zod. | It has no maximum today, so a scripted guest could fill the database despite the row limits (S12, S33, S37). `color` is already bounded by its `hsl(...)` pattern. |

## User answers (2026-10-22)

- **Q1, account limits (S37).** Real account: Node 1,000, Bit 5,000, Chunk
  10,000, Scratch Breakdown 5,000. Guest: Node 100, Bit 300, Chunk 1,000,
  Breakdown 300. Counted over all rows, Trash and Archive included. The
  numbers may be lowered after the D8 measurement in Phase 42.
- **Q2, backup (S35).** `supabase db dump` once a week, the latest 8 kept, in
  a local folder outside Git; Phase 48 runs one restore test into local
  Supabase. Note for Phase 48: `supabase db dump` runs `pg_dump` in a Docker
  container, so the scheduled job checks that Docker is running and reports
  a failed run; the restore test also proves that the account rows come back
  with their auth users.
- **Q3.** The user closed Phase 27 P27-08 (moot under S18) and Phase 3 Issue 6
  (stale: no hook imports `indexedDBStore`; hooks use `getDataStore()`).

## SCHEMA additions (user, 2026-10-22)

- Lifecycle locks: create, move and restore into a Grid lock its parent Node
  `for share`; trash, archive and permanent delete lock their whole cascade
  closure `for update` (the closure, not only the top Node, so a create in a
  descendant Grid is covered); planned deletes remove candidates before their
  sources. The cell advisory lock stays, since two `for share` locks do not
  block each other.
- Account-deletion fallback if hosted Supabase refuses the dedicated role:
  `delete_my_account()` records the request and the client signs out at once;
  the daily cleanup job deletes the account within 24 hours. Until then
  every function, `get_snapshot()` included, rejects the account
  (`account_deleting`), so the data never reappears; the request is final
  (user, 2026-10-22). For SPEC: the client shows the F19 load-failure screen
  with the reason "this account is being deleted, deletion finishes within 24
  hours, and after that you can sign up again with the same account", then
  `Continue as guest`.
- The hourly `cleanup_expired_trash()` call also records the visit, so a guest
  with an open tab is not cleaned up.
- Decisions 1 and 2 of the SCHEMA review agreed: one user action is one
  function call (Empty Trash, the deadline extension); `ensure_account()` keeps
  today's behavior when L0 is full.

## Flow review round 1 decisions (user, 2026-10-22)

All advisory recommendations taken:

1. Phase 48 is verified locally: development GitHub and Google OAuth apps
   (secrets only in the git-ignored `.env.local`; the repository is public) and
   Cloudflare's public Turnstile test keys; the production smoke runs right
   after the Phase 48 merge, before the URL is announced (amends S20).
2. OAuth cancel or provider error: the guest session stays, the URL is cleaned,
   and the account modal reopens with an inline error.
3. A user change in another tab drops the snapshot and repeats entry; only the
   tab that signed out creates the new guest; first-visit tabs converge.
4. A caller with no `accounts` row gets `account_missing`; the client shows the
   account-deleted screen.
5. Only an auth-server rejection is a session expiry; a network failure is a
   connection state; a `localStorage` marker keeps the expired screen across a
   reload.
6. The server-confirmed pending loader is feedback F03's loader (promotion ②).
7. `ensure_account()` with L0 full skips that Node and applies the rest.
8. Guest modal copy: "Signing in opens a new, empty account. Guest data isn't
   moved to it."

Mechanical repairs in the same round: `reorder_chunks` and the Calendar
Chunk-time extension join the one-call list; `rejection.limit`; the
`getDataStore()` switch moves to Task 228; the local `dev.seed_fixture()`;
hosted checks of the deletion role and of `pg_cron` deleting an auth user in
Task 218; the CLAUDE.md Production wording aligned with S36.

## Phase waits (user, 2026-10-22)

| Phase | Waits for |
|---|---|
| 42 | Only phases that are already closed. Phases 36–40, numbered before it, do not block it: promotion ② retires them. |
| 43 | Phase 42 |
| 44 | Phase 43 |
| 45 | Phase 44 and the feedback lane. If the lane has not closed, Phase 45 waits or proceeds with the S43 (4) fallback. |
| 46 | Phase 45 |
| 47 | Phase 46 and the feedback lane |
| 48 | Phase 47 |

## Local Supabase across lanes (user, 2026-10-22)

The machine runs one local Supabase. `pnpm test:db` first resets the local
database to the current branch's migrations, then runs the suites. Only the
SaaS lane manages the database (start, reset, migrations) and runs
`pnpm test:db` in every task. The feedback lane does not edit `supabase/`,
leaves `pnpm test:db` out of its task gates, and runs it only at its close,
after merging `main`, at a time when the SaaS lane is not doing database work;
the SaaS lane's next run resets the database back to its own branch. Written
into the CLAUDE.md Gates and Local Supabase lines; PLANNING_STANDARD repeats
it.

## Superseded rules

- PRD v2 "Auth only exists to identify whose data to sync, not to gate access".
- CLAUDE.md: the "Local-first" title; Architecture 1, 2, 5, 6, 7, 9 wording;
  the gates and Test data lines.
- SPEC Architecture 1–3, 7, 9, 11, 15, the "No auth" Routes line and the
  Storage row of the Tech Stack.
- SCHEMA Dexie stores, the Dexie v4 migration target, `candidateOrphanAuditEvents`,
  the confirmed-orphan command and `settings`; "No database triggers — all side
  effects are handled at the application layer" becomes "in the write
  functions".
- PLANNING_STANDARD items that assume Dexie, `liveQuery` or the orphan audit.

## Open questions

| # | Question | Owner | Class |
|---|---|---|---|
| Q4 | The look of the account icon and badge, the loading, failure and expiry screens and the account modal (S27, S40) | User | Phase-local: decision Task 225 at the start of Phase 45 (the Phase 45 load-failure screen needs it), with a rendered option sheet |
| Q5 | Demo seed content (S10) | User | Phase-local: `DP-SAAS-02` inside Task 237 (Phase 48) |
| Q6 | Exact copy: toasts, tooltips, screens, privacy note | User | Drafted in SPEC, decided at SPEC approval |
| Q7 | Dedicated write role and `pg_cron` on hosted Supabase | Technical check | Phase-local (Phase 42); fallbacks recorded in S14 and S22 |
| Q8 | The `/run-phase` change for two open lanes (S41) | User, own fresh session | Resolved: applied in a separate session (claude-workflow `b2b7671`, `6044e30`, `b27e9f3`) |

## Progress

Each document is approved by the user and committed before the next.

- [x] `docs/SCHEMA.md` (approved 2026-10-22)
- [x] `docs/SPEC.md` (approved 2026-10-22; the narrow-window notice overlays the mounted app, and Phase 47 only checks the Inbox status presentation under real latency)
- [x] `docs/DESIGN_TOKENS.md` (approved 2026-10-22)
- [x] `CLAUDE.md` and the `docs/prd.md` note (approved 2026-10-22)
- [x] `docs/EXECUTION_PLAN.md` (Phases 42–48, Tasks 213–240) and `docs/PLANNING_STANDARD.md` (approved 2026-10-22)
- [x] Flow review (`expert`) in `docs/reviews/saas-conversion-flow-review.md` (round 2 PASS, approved 2026-10-22)
- [x] `docs/issues/Issues_Deferred.md` (MI-19 to Task 229, MI-23 to Tasks 228 and 234)
