# Issues — Phase 47: Feel And Resilience

Branch: phase-47/feel-and-resilience · Started: 2026-10-30
Carried over: Phase 35 MI-23 (the loading screen, Task 234).
Baseline gate (2026-10-30): `git diff --check`, `pnpm test` (2025), `pnpm test:db` (942), `pnpm lint` (0 errors, 11 warnings), `pnpm typecheck`, `pnpm build` all pass.
Open beside it: Phase 50 (`phase-50/inbox-status-breadcrumb-reveal`; Task 250 accepted, Tasks 245–249 remain). Shared files: `use-inbox.ts` (already changed there; Task 233's offline gate may touch it); `breakdown-panel.tsx`, `use-scratch-breakdowns.ts` (232, 233 / 245); `src/lib/copy/feedback.ts` (232 / 245); `triage-workspace.tsx`, `use-staged-candidates.ts` (233 / 245, 246); `sidebar.tsx` (232, 234 / 248); `use-dnd.ts` (231, 232 / 248, 249); `supabase-store.ts`, `supabase-calls.ts` and their tests (231–233 / 249); `src/lib/dev/state-switch.ts` (231, 233 / 245–247); possibly `src/lib/constants.ts`, `globals.css`, `grid-runtime.tsx` (248, 249). The lane that merges `main` second resolves the conflicts.
Plan fixes at start: Task 231 names the state switch's injectable list for ordinary writes; Task 232 leaves the eighteenth toast call (`Cell reserved by breadcrumb`) to Task 249; Next Numbers brought up to date.
