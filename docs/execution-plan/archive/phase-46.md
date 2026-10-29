# Phase 46 — Dexie Removal

## Completion-time scope

Closed 2026-10-30. Task 230 is user-accepted. SaaS lane, part 5: Dexie and the
client orphan path left the code, in three stages with a checkpoint each.
Stage 1 deleted the 29 Dexie-only suites in `src/lib/db/` against a scenario
mapping table (each scenario's counterpart in `supabase/tests/`, or a settled
reason for none), ran `withDevInjection` over a fake store, replaced the
`dexie` `liveQuery` in three tests with a hand-rolled subscription, and
rewrote the `supabase-store.test.ts` parity block, the only test of the
snapshot store's reads, as explicit expected values that also cover
`archive-sweep`'s read cases. Stage 2 deleted `indexeddb.ts` (with `settings`
and the Dexie side of `runBreadcrumbZoneMigration`), its test utilities, the
`dexie` and `fake-indexeddb` packages and the development slice page with
`NEXT_PUBLIC_GRIDDO_SUPABASE_SLICE`. Stage 3 removed the confirmed-orphan
command, its reconcile, dispatch, copy, Zod schemas and types, the five
test-only Breakdown writes and `UNSENT_WRITE_METHODS`, and rewrote every
"until Phase 46" passage in CLAUDE.md, SPEC, SCHEMA, DESIGN_TOKENS and
PLANNING_STANDARD; SCHEMA §Dexie Migration Target stays as a historical
record. No migration changed, so nothing went to production. Ran on branch
`phase-46/dexie-removal`.

Kept by decision (user, 2026-10-30): the staging `source-unresolved`
integrity projection, unreachable under the foreign keys (S18), with no
cleanup item. The interface method and Supabase no-op of
`runBreadcrumbZoneMigration` stay for Task 249.

Carried in: none. Carried over: none. The record is in the ledger:
[`Issues_Phase_46.md`](../../issues/Issues_Phase_46.md).

## Task contracts at close

### Task 230: [x] Remove Dexie and the client orphan path

**Files and actions:** three stages, each with its own checkpoint and commit
after the user accepts it; the gate is green at the end of every stage.

1. **Tests off Dexie.** Before deleting anything, the ledger records a mapping
   table: each `src/lib/db/*.test.ts` file that imports `indexeddb.ts` or its
   test utilities, each scenario's counterpart in `supabase/tests/`, and the
   verdict (delete, or rewrite onto the Supabase store). A scenario with no
   counterpart stops the task for the user's decision. Then delete the
   Dexie-only tests and rewrite the tests whose subject stays: the
   `withDevInjection` tests in `src/lib/dev/state-switch.test.ts` (over the
   Supabase store or a fake, not `IndexedDBDataStore`); the `liveQuery` from
   `dexie` used in `src/components/layout/grid-runtime.test.tsx`,
   `src/components/triage/triage-workspace.test.tsx` and
   `src/hooks/use-triage-dnd.test.ts`; and in `src/lib/db/supabase-store.test.ts`
   the read-parity block against the Dexie store, which is the only test of the
   snapshot store's reads, is rewritten as explicit expected values over the
   same fixture (ids and order, taken from the Dexie store's current output
   while it still exists), and the read cases of `archive-sweep.test.ts` move
   into it.
2. **Dexie out.** Delete `src/lib/db/indexeddb.ts` with its `settings` store,
   the Dexie side of `runBreadcrumbZoneMigration` (the interface method and the
   Supabase no-op stay for Task 249 if it has not landed) and the Dexie backing
   of `liveRead`, and `indexeddb.test-utils.ts`; remove `dexie` and
   `fake-indexeddb` from `package.json`; delete the development slice page
   `src/app/dev/supabase-slice/` and `NEXT_PUBLIC_GRIDDO_SUPABASE_SLICE` from
   `.env.local.example`. Browser smoke of every route on local Supabase.
3. **Interface trimmed and documents current.** Remove from the `DataStore`
   interface and the Supabase store the confirmed-orphan command, its reconcile
   method, its hook dispatch in `use-staged-candidates.ts`, its Workspace
   caller in `triage-workspace.tsx`, and its orphan state, copy, Zod schemas
   and types (`schema.ts`, `command-schemas.ts`, `src/types/index.ts`); remove
   the five test-only Breakdown writes (`createScratchBreakdown`,
   `updateScratchBreakdown`, `markScratchBreakdownConsumed`,
   `unconsumeScratchBreakdown`, `deleteScratchBreakdown`) and
   `UNSENT_WRITE_METHODS`, and their mocks and tests
   (`supabase-store.test.ts`, `breakdown-panel.test.tsx`,
   `use-scratch-breakdowns.test.tsx`, `use-triage-dnd.test.ts`,
   `use-staged-candidates.test.tsx`, `schema.test.ts`). Rewrite every "until
   Phase 46" passage as done: `CLAUDE.md` Key Paths; SPEC §Tech Stack, §File
   Organization Conventions, §Durable Staging (the orphan path), §Environments
   And Hosting (the slice page) and §Key File Paths; SCHEMA's header note,
   §Current Implementation And Canonical Target, §Object Stores,
   §candidateOrphanAuditEvents (removed), §Not ported (`settings`), §Exposed
   functions (the test-only writes), §Application Hooks (the side-effects
   paragraph) and §Dexie Migration Target, which stays as a historical record
   under a one-line "removed in Phase 46" note; and the code comments that name
   Phase 46.

`src/hooks/use-system-node-seeding.ts` is already gone (Task 226).

**Dependencies:** Phase 45 Final Close and `main` sync; this phase's lifecycle
gate.

**Authority:** S11, S18, S25, S41; SCHEMA §Not ported.

**Observable acceptance:** no `dexie` or `fake-indexeddb` import remains; every
gate passes; the running app behaves as at the end of Phase 45.

**Verification:** full gate at each stage; browser smoke of every route on
local Supabase after Stages 2 and 3; `expert` review before acceptance.

**Commit message:** Stage 1 `test(db): move tests off Dexie`; Stage 2
`refactor(db): remove Dexie`; Stage 3 `refactor(db): remove the client orphan
path`.
