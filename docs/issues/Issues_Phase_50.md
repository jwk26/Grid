# Issues — Phase 50: Inbox Status, Breadcrumb Reveal And Last Scratch

Branch: phase-50/inbox-status-breadcrumb-reveal · Started: 2026-10-29
Carried over: Phase 35 MI-14 (Task 250); Phase 35 MI-21 (row part Task 245, Staging part Task 246); Phase 49 mi-1, mi-2, mi-3 (Task 248); Phase 45 mi-1 (Task 245), mi-2 (Task 246), mi-3 (Task 249).
Baseline gate (2026-10-29): `git diff --check`, `pnpm test` (2338), `pnpm lint` (0 errors, 11 warnings), `pnpm typecheck`, `pnpm build` all pass; `pnpm test:db` runs only at phase close (feedback lane).
Open beside it: Phase 46 (`phase-46/dexie-removal`, Task 230). Shared files: `datastore.ts`, `supabase-store.ts`, `indexeddb.ts`, `indexeddb.migration.test.ts` (Task 249); `triage-workspace.tsx`, `use-staged-candidates.ts`, `copy/inbox-triage.ts` (Tasks 245–247); possibly `grid-runtime.tsx`, `use-grid-actions.ts` (Tasks 248–249).
Order (user, 2026-10-29): Task 250 first (no file shared with Task 230), then 245–249. Before Task 245 starts, if Phase 46 is merged into `origin/main`, merge `origin/main` into this branch (merge, not rebase) and resolve the shared files first.
Plan fixes at start: Task 249 names `supabase-calls.ts` (`BREADCRUMB_RESERVED_CELLS`) and its tests instead of `supabase-store.ts`/`session.ts`; Phase 45 mi-1/mi-2/mi-3 added to Tasks 245/246/249; Task 248 drag cancel targets the Grid `useDnd` (`useTriageDnd` already has one).

## Task 250 — Remember the last selected Scratch on this device

### Current state
- Status: In Progress
- Next: Stage 1 acceptance (preference field); then Stage 2
- Open: none

### Log
- Work plan:
  - `triage-preferences-store.ts` (+test): add `lastSelectedScratchId: string | null` with a setter; validated (non-empty string, else null) in normalize/serialize/merge like the sorts, so an old stored value without the field loads as null.
  - `triage-store.ts` (+test): `reconcileScratchPoolContext` takes an optional `preferredScratchId`; only when the selection is empty/invalid and the saved id is in both the active and visible ids, it is chosen instead of `visibleIds[0]`. Same-session re-entry, search-hidden, Archive/Trash handoff rules stay as they are. The store does not import the preferences store.
  - `use-inbox.ts` (+test): pass the saved id into reconcile; save every non-null `selectedScratchId` to the preferences store (device-local, no domain write). An unresolved saved id (deleted, archived, other account) simply falls back to the first active Scratch and is overwritten by that selection.
  - Stages: (1) preference field + test; (2) restore/save wiring + tests, then a browser check (select a Scratch, reload; delete it, reload; sign in as another local test user).
  - Verify: failing tests first, then gate (`git diff --check`, test, lint, typecheck, build). `expert` review since selection state logic changes.
- Review (advisory, 2026-10-29, work plan): approve with changes. Apply: (1) accept the other-account fallback after a reload; also try a same-tab sign-out → sign-in as another local test user and record the result as `mi-1` — by code reading `triage-store` is never reset on a user change (`session.ts` sign-out resets only the snapshot), so the old account's `selectedScratchId`/`scratchPoolActiveIds` enter the external-removal hold instead of the fallback; the fix is outside this task (`session.ts`, SaaS lane) and its binding is the user's; (2) add `lastSelectedScratchId` to `partialize` and to `setItem`, which rebuilds the persisted object field by field, and assert the raw `localStorage` value in the test; (3) the reconcile effect in `use-inbox.ts` reads the saved id with `getState()` instead of subscribing, so a save does not re-run reconcile; (4) the browser check confirms no Supabase RPC on select and reload (no domain write); (5) tests: the saved id never overrides an external-removal or own-Trash hold, a valid same-session selection ignores it, a search-hidden saved id falls back to the first visible row, a stored value without the field or with a non-string loads as null. Not applied: none.
- Decision: no visual change, so the theme × light/dark × resolution matrix does not apply; the browser check runs in `griddo` only (user, 2026-10-29).
- Decision: go-ahead on the work plan with the advisory review applied (user, 2026-10-29). Stage 1 starts.
- Stage 1 implemented (uncommitted until accepted): `lastSelectedScratchId` in `triage-preferences-store.ts` (default, validator, setter, normalize, `setItem`, `partialize`), raw-localStorage and invalid-value tests pass; typecheck passes.
- Review (advisory, 2026-10-29, Stage 1): approve. Apply: none. Not applied: none. For Stage 2: `setLastSelectedScratchId(null)` clears the saved id, so the save path writes only a non-null selection and never during the load-time `null`.
