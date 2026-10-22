# Issues — Phase 49: Theme set, status primitives and toasts

Branch: phase-49/theme-set-status-toasts · Started: 2026-10-22
Carried over: ISSUE-20-01 and MI-13 (both bound to Task 241)

Baseline gate (2026-10-22, at `f929944`): `git diff --check`, `pnpm lint` (0 errors, 11 warnings), `pnpm typecheck` and `pnpm build` pass. `pnpm test`: the first run failed one test by timeout — `triage-workspace.test.tsx` "hides the heading icons by default and shows them for neumorphism only" took 6154ms against the 5s default under full-suite load; the file alone passed three times, and a second full run passed (113 files, 1822 tests). Recorded as an observation; Task 241 edits that test. `pnpm test:db` is not applicable (feedback lane; `main` does not have it yet).

Cross-lane overlap (user, 2026-10-22): no other phase is open. Against Phase 42 only `src/lib/constants.ts` overlaps (`DISPLAY_DELAY_MS`, Task 217 and Task 243). `src/lib/db/datastore.ts`, `src/app/providers.tsx` and `src/lib/copy/feedback.ts` (Tasks 243–244) overlap with Phase 45 (Tasks 225 and 228), which waits for this phase's close.

## Task 241 — Reduce the color themes to four

### Current state
- Status: Awaiting User Decision
- Next: go-ahead on the work plan
- Open: ISSUE-20-01, MI-13 (both close with this task)

### Log
- Work plan: (1) Failing tests first: `color-theme-store.test.ts` (four ids; stored `terminal`/`tiny-desk` falls back to `griddo`) and a test that the no-flash script is built from the shared list. (2) New non-client `src/lib/color-themes.ts` (ids, default, storage key); the store, `color-theme-toggle.tsx` (four labels) and `layout.tsx` (script built from the list, Playfair Display and VT323 dropped) read it. (3) `globals.css`: remove the four theme blocks, swatch variables and every rule that targets them with a postcss script (a comma list loses only the removed selectors; emptied rules and at-rules go); the Inbox `archive-status-mark="terminal"` operation phase stays. (4) Drop the removed themes from the enumerating tests found by search (`theme-transition`, `sidebar`, `inbox-triage-theme-realization`, `triage-workspace`, `hierarchy-explorer`, `breakdown-panel`, others). (5) Verify: scoped search under `src/` returns nothing, focused tests, then the gate without `test:db`; browser checkpoint of the four themes in light and dark, plus a stored `terminal` id reload. One user stop: the browser checkpoint (single stage, one commit `refactor(theme): reduce the color themes to four`). No `expert` review (no state logic beyond a fallback list); the persisted-id fallback is covered by the test.
