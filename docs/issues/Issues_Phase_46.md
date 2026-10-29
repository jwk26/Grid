# Issues — Phase 46: Dexie Removal

Branch: phase-46/dexie-removal · Started: 2026-10-29
Carried over: none.
Baseline gate (2026-10-29): `git diff --check`, `pnpm test` (2338), `pnpm test:db` (942), `pnpm lint` (0 errors, 11 warnings), `pnpm typecheck`, `pnpm build` all pass.
Plan fixes at start (user, 2026-10-29): Task 230 runs in three stages with a checkpoint each (tests off Dexie with a scenario mapping table first, Dexie out, interface trimmed and documents current); it names the tests that must be rewritten rather than deleted, the orphan Zod schemas and types, and the canonical "until Phase 46" passages; SCHEMA §Dexie Migration Target stays as a historical record; `use-system-node-seeding.ts` dropped from the list (already removed in Task 226). LEARNINGS: the Phase 45 MCP lesson's cause corrected.

## Task 230 — Remove Dexie and the client orphan path

### Current state
- Status: Implemented, awaiting acceptance (Stage 2)
- Next: Stage 2 acceptance
- Open: none

### Log
- Work plan: Three stages, each ending at a user checkpoint and its own commit; gate green at the end of each.
  1. Tests off Dexie (`test(db): move tests off Dexie`): this mapping table, then delete the Dexie-only suites and `indexeddb.test-utils.ts`'s test users; rewrite `state-switch.test.ts` (`withDevInjection` over a fake store), the `liveQuery` use in `grid-runtime.test.tsx`, `triage-workspace.test.tsx`, `use-triage-dnd.test.ts` and `use-global-urgency`/`use-inbox`/`use-trash-scratch.inbox-instances` tests where they import `dexie`, and drop the Dexie read-parity block from `supabase-store.test.ts`. Verify: `pnpm test`, `typecheck`, `lint`.
  2. Dexie out (`refactor(db): remove Dexie`): delete `indexeddb.ts`, its test-utils, the Dexie `liveRead` backing, the `settings` store and the Dexie side of `runBreadcrumbZoneMigration`; drop `dexie`/`fake-indexeddb`; delete `src/app/dev/supabase-slice/` and `NEXT_PUBLIC_GRIDDO_SUPABASE_SLICE`. Verify: full gate plus an agent-run browser smoke of every route on local Supabase.
  3. Interface trimmed (`refactor(db): remove the client orphan path`): remove the orphan command/reconcile, hook dispatch, Workspace caller, schemas/types, the five test-only Breakdown writes and `UNSENT_WRITE_METHODS` with their mocks/tests; rewrite every "until Phase 46" passage in CLAUDE.md, SPEC, SCHEMA and code comments. Verify: full gate, browser smoke, `expert` review.

### Stage 1 mapping (Dexie test → `supabase/tests/` counterpart → verdict)
| Dexie suite | Counterpart | Verdict |
|---|---|---|
| system-nodes | ensure-account.db | delete |
| revision, scratch-breakdowns, inbox-operations (Add/Save/Delete/Stage/Unstage) | breakdown-commands.db, stage-commands.db | delete |
| indexeddb.test (create/update/cascade/promote), deadline-hierarchy, mtime-cascade, auto-completion, grid-uniqueness | ported-scenarios.db, node-bit-writes.db, chunk-writes.db | delete |
| one-call-actions | node-bit-writes.db / chunk-writes.db (Hook 2 extend, reorder) and hard-delete-writes.db (Empty Trash) | delete |
| archive, cascade-delete, cascade-restore | archive-writes.db, trash-writes.db | delete |
| archive-sweep | read cases moved into the `supabase-store.test.ts` expected-value block; createNode cases in node-bit-writes.db | file deleted |
| cascade-hard-delete, auto-cleanup, scratch-aggregate-hard-delete | hard-delete-writes.db (`integrity_cleanup_required` cases unreachable by S18) | delete |
| triage-placement, triage-undo | placement-commands.db, placement-undo*.db | delete |
| staged-candidates | stage-commands.db | delete |
| trash-scratch-command | trash-scratch-commands.db ("source cannot be resolved" unreachable by FK) | delete |
| archive-scratch-command, archive-scratch-recovery | archive-scratch-commands.db | delete |
| promotion | promote-bit.db | delete |
| candidate-orphan-cleanup | none: the orphan path is removed in Stage 3 | delete |
| indexeddb.schema-v3/v4-upgrade, indexeddb.transaction | none: Dexie schema/transaction mechanics, no Postgres subject | delete |
| indexeddb.migration (breadcrumb zone) | none: SCHEMA §Not ported (`settings`), S43 (4) no-op; Task 249 removes the zone | delete |
| state-switch (`withDevInjection`) | none: client-only | rewrite over a fake store |
| supabase-store.test.ts parity block | none: it was the only test of the snapshot store's reads | rewritten as expected values |
No scenario lacks a counterpart without a settled reason.
- Review (advisory, 2026-10-29, work plan): approve with changes. Apply: (1) the `supabase-store.test.ts` parity block is the only test of the snapshot store's reads and `archive-sweep`'s listed counterpart, so it is rewritten as explicit expected values (ids and order from the Dexie store's current output) over the same fixture and absorbs `archive-sweep`'s read cases, per the amended plan (`ef540b3`); (2) Stage 1 verifies with the full gate (`git diff --check`, `pnpm test`, `pnpm test:db`, `pnpm lint`, `pnpm typecheck`, `pnpm build`); (3) drop `use-global-urgency`/`use-inbox`/`use-trash-scratch.inbox-instances` from Stage 1: they do not import `dexie`, only name `liveQuery`; (4) the three `liveQuery` rewrites follow the hand-rolled subscription in `use-inbox.test.tsx`. Not applied: none.
- Decision: the mapping's "none" rows (candidate-orphan-cleanup, schema-v3/v4 upgrade, transaction, breadcrumb-zone migration, state-switch) and the two unreachable scenarios (`integrity_cleanup_required`, "source cannot be resolved", both excluded by the candidate foreign key, S18) are accepted as stated; the parity block is rewritten, not deleted (user, 2026-10-29).
- Review (advisory, 2026-10-30, Stage 1 checkpoint): approve. Apply: in the Stage 2 commit, correct two mapping rows to what was done: `archive-sweep` → read cases moved into the `supabase-store.test.ts` expected-value block, createNode cases in node-bit-writes.db, file deleted; parity block → rewritten as expected values. Stage 2 note: the `'from "dexie"'` string assertion at `triage-workspace.test.tsx:944` is not an import; drop it with Dexie or exclude it from the no-import check. Not applied: none.
- Decision: Stage 1 accepted (user, 2026-10-30).

### Checkpoint
- Changed (Stage 1): deleted the 29 Dexie-only suites in `src/lib/db/` per the mapping table; `state-switch.test.ts` now runs `withDevInjection` over a small stateful fake store; the `liveRead` mock in `grid-runtime.test.tsx`, `triage-workspace.test.tsx` and `use-triage-dnd.test.ts` is a hand-rolled one-run subscription (no `dexie`); the `supabase-store.test.ts` parity block is explicit expected ids and order (taken from the Dexie store's output over the same fixture before the switch), and it covers `archive-sweep`'s read cases. `indexeddb.test-utils.ts` stays for Stage 2 (nothing imports it now).
- Verified: `git diff --check`, `pnpm test` (2036 tests, fewer by the deleted suites), `pnpm test:db` (942), `pnpm lint` (0 errors, the same 11 warnings), `pnpm typecheck`, `pnpm build` all pass.
- Please check: nothing visual. Look at the mapping table above and at the rewritten expected values in `src/lib/db/supabase-store.test.ts`.
- Unresolved: none.
- Changed (Stage 2): deleted `src/lib/db/indexeddb.ts` (with its `settings` store and the Dexie side of `runBreadcrumbZoneMigration`), `indexeddb.test-utils.ts` and `src/app/dev/supabase-slice/`; removed `dexie` and `fake-indexeddb` from `package.json`/lockfile and `NEXT_PUBLIC_GRIDDO_SUPABASE_SLICE` from `.env.local.example`; dropped the `from "dexie"` string assertion in `triage-workspace.test.tsx`; reworded the code comments that described the Dexie store as live; corrected the two Stage 1 mapping rows (`archive-sweep`, parity block). `datastore.ts` already had no Dexie backing for `liveRead`, and the interface method plus Supabase no-op of `runBreadcrumbZoneMigration` stay for Task 249.
- Verified (Stage 2): `git diff --check`, `pnpm test` (2036), `pnpm test:db` (942), `pnpm lint` (0 errors, 11 warnings), `pnpm typecheck`, `pnpm build` all pass. Browser smoke on local Supabase with the fixture, no page or console errors: `/`, `/grid/[id]` (Documents, Inbox, Archive), `/calendar/weekly`, `/calendar/monthly`, `/trash`, the Bit popup (`?bit=`); `/dev/supabase-slice` answers 404.
- Please check (Stage 2): nothing visual changed; open the app on local Supabase and see that the grid, Inbox, Calendar, Trash and a Bit popup load as before.

