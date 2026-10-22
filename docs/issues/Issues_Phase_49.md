# Issues — Phase 49: Theme set, status primitives and toasts

Branch: phase-49/theme-set-status-toasts · Started: 2026-10-22
Carried over: ISSUE-20-01 and MI-13 (both bound to Task 241)

Baseline gate (2026-10-22, at `f929944`): `git diff --check`, `pnpm lint` (0 errors, 11 warnings), `pnpm typecheck` and `pnpm build` pass. `pnpm test`: the first run failed one test by timeout — `triage-workspace.test.tsx` "hides the heading icons by default and shows them for neumorphism only" took 6154ms against the 5s default under full-suite load; the file alone passed three times, and a second full run passed (113 files, 1822 tests). Recorded as an observation; Task 241 edits that test. `pnpm test:db` is not applicable (feedback lane; `main` does not have it yet).

Cross-lane overlap (user, 2026-10-22): no other phase is open. Against Phase 42 only `src/lib/constants.ts` overlaps (`DISPLAY_DELAY_MS`, Task 217 and Task 243). `src/lib/db/datastore.ts`, `src/app/providers.tsx` and `src/lib/copy/feedback.ts` (Tasks 243–244) overlap with Phase 45 (Tasks 225 and 228), which waits for this phase's close.
