# Issues — Phase 51: Stabilization

Branch: phase-51/stabilization · Started: 2026-11-05
Carried over: ISSUE-16-03, ISSUE-20-03, ISSUE-20-04 (Task 251); Phase 48 mi-7 (Task 252); Phase 50 mi-6, mi-8 (Task 253); Tasks 245A/246 unresolved held-lock residual (Task 254). Out of scope (ST07): ISSUE-18-16, ISSUE-19-01 (FE/Visual pass); Phase 50 mi-10 held until seen again.
Baseline gate (2026-11-05): `git diff --check`, `pnpm lint` (0 errors, 10 warnings), `pnpm typecheck`, `pnpm build` pass; `pnpm test` 2496 passed in three of four full runs. One run failed `triage-workspace.test.tsx` "renders the dedicated DP-VQ01 surface paused with every full source-labeled draft", which passed alone three times: the same timing failure under load Phase 50 recorded for this test (Task 247 Unresolved, which names it under `breakdown-panel.test.tsx`; the test exists only in `triage-workspace.test.tsx`). Pre-existing, not from this phase; Tasks 253 and 254 touch `triage-workspace.tsx`. `pnpm test:db` runs only at phase close (app lane, ST02).
Open beside it: no phase branch. `docs/backup-promotion` (account-backup docs) shares only the plan and ledgers.
Plan fixes at start: Task 252 names `app-frame-title`, `app-frame-reason` and `app-frame-action` as DESIGN_TOKENS part names with no DOM marker today; the shared block marks them as `data-app-role` (user, 2026-11-05).
