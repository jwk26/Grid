# SaaS Conversion — Promotion Map (Promotion ①)

## Metadata

- Created: 2026-10-22
- Status: plan approved by the user (2026-10-22); canonical edits in progress
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
| D9 | `icon` and `color` get a maximum length in the CHECK constraints and in Zod. | They have no maximum today, so a scripted guest could fill the database despite the row limits (S12, S33, S37). |

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

The machine runs one local Supabase. Only the SaaS lane manages it (start,
reset, migrations). The feedback lane runs `pnpm test:db` only at its close,
after merging `main`. Promotion ① writes this into the CLAUDE.md Test data line
and PLANNING_STANDARD. Corollary: the feedback lane does not edit
`supabase/`. If the local database then carries SaaS migrations that are not on
`main` yet, a failure in the lane's close run is checked against the open SaaS
phase before it counts as a lane failure.

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
| Q4 | The look of the account icon and badge, the loading, failure and expiry screens and the account modal (S27, S40) | User | Phase-local: a decision task at the start of Phase 47 with a rendered option sheet |
| Q5 | Demo seed content (S10) | User | Phase-local: a decision step in Phase 48 |
| Q6 | Exact copy: toasts, tooltips, screens, privacy note | User | Drafted in SPEC, decided at SPEC approval |
| Q7 | Dedicated write role and `pg_cron` on hosted Supabase | Technical check | Phase-local (Phase 42); fallbacks recorded in S14 and S22 |
| Q8 | The `/run-phase` change for two open lanes (S41) | User, own fresh session | Needed only to open the feedback lane beside Phase 42; does not block ① |

## Progress

Each document is approved by the user and committed before the next.

- [ ] `docs/SCHEMA.md`
- [ ] `docs/SPEC.md`
- [ ] `docs/DESIGN_TOKENS.md`
- [ ] `CLAUDE.md` and the `docs/prd.md` note
- [ ] `docs/EXECUTION_PLAN.md` (Phases 42–48, expected Tasks 213–239) and `docs/PLANNING_STANDARD.md`
- [ ] Flow review (`expert`) in `docs/reviews/`
- [ ] `docs/issues/Issues_Deferred.md` (MI-19, MI-23)
