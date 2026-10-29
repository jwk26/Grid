# Issues — Phase 50: Inbox Status, Breadcrumb Reveal And Last Scratch

Branch: phase-50/inbox-status-breadcrumb-reveal · Started: 2026-10-29
Carried over: Phase 35 MI-14 (Task 250); Phase 35 MI-21 (row part Task 245, Staging part Task 246); Phase 49 mi-1, mi-2, mi-3 (Task 248); Phase 45 mi-1 (Task 245), mi-2 (Task 246), mi-3 (Task 249).
Baseline gate (2026-10-29): `git diff --check`, `pnpm test` (2338), `pnpm lint` (0 errors, 11 warnings), `pnpm typecheck`, `pnpm build` all pass; `pnpm test:db` runs only at phase close (feedback lane).
Open beside it: Phase 46 (`phase-46/dexie-removal`, Task 230). Shared files: `datastore.ts`, `supabase-store.ts`, `indexeddb.ts`, `indexeddb.migration.test.ts` (Task 249); `triage-workspace.tsx`, `use-staged-candidates.ts`, `copy/inbox-triage.ts` (Tasks 245–247); possibly `grid-runtime.tsx`, `use-grid-actions.ts` (Tasks 248–249).
Order (user, 2026-10-29): Task 250 first (no file shared with Task 230), then 245–249. Before Task 245 starts, if Phase 46 is merged into `origin/main`, merge `origin/main` into this branch (merge, not rebase) and resolve the shared files first.
Plan fixes at start: Task 249 names `supabase-calls.ts` (`BREADCRUMB_RESERVED_CELLS`) and its tests instead of `supabase-store.ts`/`session.ts`; Phase 45 mi-1/mi-2/mi-3 added to Tasks 245/246/249; Task 248 drag cancel targets the Grid `useDnd` (`useTriageDnd` already has one).
