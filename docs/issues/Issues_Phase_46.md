# Issues — Phase 46: Dexie Removal

Branch: phase-46/dexie-removal · Started: 2026-10-29
Carried over: none.
Baseline gate (2026-10-29): `git diff --check`, `pnpm test` (2338), `pnpm test:db` (942), `pnpm lint` (0 errors, 11 warnings), `pnpm typecheck`, `pnpm build` all pass.
Plan fixes at start (user, 2026-10-29): Task 230 runs in three stages with a checkpoint each (tests off Dexie with a scenario mapping table first, Dexie out, interface trimmed and documents current); it names the tests that must be rewritten rather than deleted, the orphan Zod schemas and types, and the canonical "until Phase 46" passages; SCHEMA §Dexie Migration Target stays as a historical record; `use-system-node-seeding.ts` dropped from the list (already removed in Task 226). LEARNINGS: the Phase 45 MCP lesson's cause corrected.

## Task 230 — Remove Dexie and the client orphan path

### Current state
- Status: Accepted
- Next: none (Task 230 accepted)
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
- Review (advisory, 2026-10-30, Stage 2 checkpoint): approve. Apply: none. Not applied: none. Left as is: the "liveQuery" names in hook log strings and test variables, and the "as on Dexie" test titles in `supabase-store.writes.test.ts`; they are not imports and fall outside the "names Phase 46" comment scope.
- Decision: Stage 2 accepted (user, 2026-10-30).
- Review (advisory, 2026-10-30, Stage 3 checkpoint / task finish): approve with changes. Apply: (b) remove the `orphan-cleanup` status row (`DESIGN_TOKENS.md:455`) and the orphan copy from the Integrity/stale copy row (`:908`), since the copy left the code in Stage 3; (c) drop "(proposed; absent today)" from the `use-staged-candidates.ts` row (`SPEC.md:1851`); date the expert Review entry. Not applied: none. Next-task check: Task 249 is already conditional on `indexeddb.ts` and Phase 47 needs nothing from Task 230, so no Task 231 note.
- Decision: DESIGN_TOKENS joins Task 230's document list for (b); (a) the `source-unresolved` integrity projection stays, with no cleanup item (user, 2026-10-30).
- Review (advisory, 2026-10-30, Task 230 acceptance): approve; supersedes the Stage 3 review. (b), (c) and the expert entry's date are applied in `03b1474`. Apply: none. Not applied: none.

### Checkpoint
- Changed (Stage 1): deleted the 29 Dexie-only suites in `src/lib/db/` per the mapping table; `state-switch.test.ts` now runs `withDevInjection` over a small stateful fake store; the `liveRead` mock in `grid-runtime.test.tsx`, `triage-workspace.test.tsx` and `use-triage-dnd.test.ts` is a hand-rolled one-run subscription (no `dexie`); the `supabase-store.test.ts` parity block is explicit expected ids and order (taken from the Dexie store's output over the same fixture before the switch), and it covers `archive-sweep`'s read cases. `indexeddb.test-utils.ts` stays for Stage 2 (nothing imports it now).
- Verified: `git diff --check`, `pnpm test` (2036 tests, fewer by the deleted suites), `pnpm test:db` (942), `pnpm lint` (0 errors, the same 11 warnings), `pnpm typecheck`, `pnpm build` all pass.
- Please check: nothing visual. Look at the mapping table above and at the rewritten expected values in `src/lib/db/supabase-store.test.ts`.
- Unresolved: none.
- Changed (Stage 2): deleted `src/lib/db/indexeddb.ts` (with its `settings` store and the Dexie side of `runBreadcrumbZoneMigration`), `indexeddb.test-utils.ts` and `src/app/dev/supabase-slice/`; removed `dexie` and `fake-indexeddb` from `package.json`/lockfile and `NEXT_PUBLIC_GRIDDO_SUPABASE_SLICE` from `.env.local.example`; dropped the `from "dexie"` string assertion in `triage-workspace.test.tsx`; reworded the code comments that described the Dexie store as live; corrected the two Stage 1 mapping rows (`archive-sweep`, parity block). `datastore.ts` already had no Dexie backing for `liveRead`, and the interface method plus Supabase no-op of `runBreadcrumbZoneMigration` stay for Task 249.
- Verified (Stage 2): `git diff --check`, `pnpm test` (2036), `pnpm test:db` (942), `pnpm lint` (0 errors, 11 warnings), `pnpm typecheck`, `pnpm build` all pass. Browser smoke on local Supabase with the fixture, no page or console errors: `/`, `/grid/[id]` (Documents, Inbox, Archive), `/calendar/weekly`, `/calendar/monthly`, `/trash`, the Bit popup (`?bit=`); `/dev/supabase-slice` answers 404.
- Please check (Stage 2): nothing visual changed; open the app on local Supabase and see that the grid, Inbox, Calendar, Trash and a Bit popup load as before.
- Changed (Stage 3): removed the confirmed-orphan command and reconcile from `DataStore` and the Supabase store, their dispatch in `use-staged-candidates.ts` (the `orphan_cleanup` kind, refs and helpers), the `orphan_cleanup` guard in `triage-workspace.tsx`, their entries in `state-switch.ts`, the `orphanNode`/`orphanBit` copy, and the orphan Zod schemas and types (`schema.ts`, `command-schemas.ts`, `src/types/index.ts`); removed the five test-only Breakdown writes with their schemas, `PENDING_WRITE_KEYS` and `UNSENT_WRITE_METHODS`; adjusted `use-staged-candidates`, `schema`, `supabase-store`, `supabase-store.writes`, `state-switch`, `staging-zone`, `inbox-triage` and `use-triage-dnd` tests and `supabase-store-commands.db.test.ts`; rewrote every "until Phase 46" passage in CLAUDE.md, SPEC, SCHEMA (Dexie Migration Target stays as a historical record under a "Removed in Phase 46" note) and PLANNING_STANDARD §6. `breakdown-panel.test.tsx` and `use-scratch-breakdowns.test.tsx` only name a local fixture factory `createScratchBreakdown`, not the removed write, so they are unchanged.
- Verified (Stage 3): `git diff --check`, `pnpm test` (2025), `pnpm test:db` (942), `pnpm lint` (0 errors, 11 warnings), `pnpm typecheck`, `pnpm build` pass. Browser smoke on local Supabase, no page or console errors: `/`, `/grid/[id]` (Documents, Inbox with its Staging zones, Archive), `/calendar/weekly`, `/calendar/monthly`, `/trash`.
- Please check (Stage 3): nothing visual changed; Inbox Stage/Unstage and the other routes behave as at the end of Phase 45.
- Unresolved: (a) the staging "source-unresolved" integrity projection (`integrityCandidates`, its `staging-zone` rendering, `unresolvedCandidatesOf` in `use-trash-scratch.ts`, the dev state switch's `integrity` state) is outside the plan's removal list and kept; it is now unreachable under the foreign keys (S18), so it is a candidate for a later cleanup if you want it. (b) and (c) were fixed after the Stage 3 review (the DESIGN_TOKENS `orphan-cleanup` row and orphan copy, the SPEC "proposed" mark).
- Review (expert, 2026-10-30): no code findings. Doc leftovers fixed: PLANNING_STANDARD §6 "until Phase 45/46" passages, SPEC "orphan cleanup are never held", SCHEMA "Phase 46 removes the store". Items (b) and (c) were fixed after the advisory review.
- Decision: Stage 3 and Task 230 accepted (user, 2026-10-30).
