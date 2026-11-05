# Issues — Phase 51: Stabilization

Branch: phase-51/stabilization · Started: 2026-11-05
Carried over: ISSUE-16-03, ISSUE-20-03, ISSUE-20-04 (Task 251); Phase 48 mi-7 (Task 252); Phase 50 mi-6, mi-8 (Task 253); Tasks 245A/246 unresolved held-lock residual (Task 254). Out of scope (ST07): ISSUE-18-16, ISSUE-19-01 (FE/Visual pass); Phase 50 mi-10 held until seen again.
Baseline gate (2026-11-05): `git diff --check`, `pnpm lint` (0 errors, 10 warnings), `pnpm typecheck`, `pnpm build` pass; `pnpm test` 2496 passed in three of four full runs. One run failed `triage-workspace.test.tsx` "renders the dedicated DP-VQ01 surface paused with every full source-labeled draft", which passed alone three times: the same timing failure under load Phase 50 recorded for this test (Task 247 Unresolved, which names it under `breakdown-panel.test.tsx`; the test exists only in `triage-workspace.test.tsx`). Pre-existing, not from this phase; Tasks 253 and 254 touch `triage-workspace.tsx`. `pnpm test:db` runs only at phase close (app lane, ST02).
Open beside it: no phase branch. `docs/backup-promotion` (account-backup docs) shares only the plan and ledgers.
Plan fixes at start: Task 252 names `app-frame-title`, `app-frame-reason` and `app-frame-action` as DESIGN_TOKENS part names with no DOM marker today; the shared block marks them as `data-app-role` (user, 2026-11-05).

## Task 251 — Small Grid and capture fixes

### Current state
- Status: Implemented, awaiting acceptance
- Next: Task 251 acceptance
- Open: none

### Log
- Work plan (2026-11-05): One stage, ending at one acceptance stop (no user visual checkpoint; ST05).
  - `node-card.tsx` + test: compute the aging filter only when `node.systemRole === null`; system Nodes get no `filter` (ST09). Test: Inbox and Archive cards carry no filter at an old `mtime`, in grid and `inbox-explorer` presentation; an ordinary Node of the same age does.
  - `scratch-modal.tsx` + test: track pointer-over-panel from the modal's open (`mouseenter`/`mouseleave` into a ref). On the success entry, start the auto-close timer only if the pointer is not over the panel; `mouseleave` starts it (ST10). Keyboard capture with the pointer outside closes after 3000 ms as before. Tests with fake timers: pointer over at success stays open past 3000 ms, then closes 3000 ms after leave; pointer outside closes as before. The pointer ref is read from events, not `:hover`, so jsdom can drive it.
  - `grid-view.tsx`, `grid-cell.tsx`, `grid-cell.test.tsx`: remove `levelOpacityMap`, the `borderOpacity` prop and the test usages (ST11); then grep for both names.
  - Verification: failing tests first for aging and timer; focused `pnpm exec vitest run` on the three test files, `typecheck`; browser check by the agent on local Supabase seeded by `scripts/dev-fixtures/inbox-triage.js` (Inbox/Archive card filter vs an aged ordinary Node; Scratch capture with pointer over vs outside); then the full gate without `test:db`. No `expert` review (styling/timer, not shared logic) unless the timer change proves non-trivial.
  - Commit: the plan's message.
  Learnings: Testing (Vitest) read — jsdom has no `:focus-visible`/`:hover`, so the timer test drives pointer events; Workflow — use `pnpm exec vitest run <files>` for focused runs.
- Review (advisory, 2026-11-05, work plan): approve with changes. Apply: (1) track the panel with `onPointerEnter`/`onPointerLeave` and ignore `pointerType === "touch"`, moving the existing success-state hover clear/start onto the same handlers; a tap fires a compatibility `mouseenter` with no `mouseleave`, so mouse-event tracking would stop a touch capture from ever auto-closing (today it closes after 3000 ms). Add a test: entry with `pointerType: "touch"`, then success, closes after 3000 ms (jsdom 29 has `PointerEvent`). (2) Browser aging check compares the computed `filter`: Inbox/Archive cards `none`, an ordinary Node `saturate(...)` (a fresh one is `saturate(1)`); no local data edit or clock change to age the system Nodes, the old-`mtime` case stays with the unit test; if the Explorer shows no system Node, check the Grid only and note that the unit test covers the Explorer. (3) Optional, the working session decides: for a system Node pass the caller's `style` unchanged rather than `filter: undefined`; check `level` in `grid-view.tsx` is still used after `levelOpacityMap` goes. Not applied: none.
- Decision: go-ahead on the work plan with the advisory review applied (user, 2026-11-05).
- Implemented, uncommitted (2026-11-05): aging filter skipped for system Nodes (style passed through unchanged), Scratch auto-close tracked by `onPointerEnter`/`onPointerLeave` with touch ignored (review item 1), `levelOpacityMap` and `borderOpacity` removed (`level` still used in `grid-view.tsx`). Failing tests first, now green. Gate: `git diff --check`, `pnpm lint`, `pnpm typecheck`, `pnpm build` pass; `pnpm test` had one failure in `datastore.live-read.test.ts` "callers that ask before the account is ready share one store" (6.4 s, timing under load), passing alone, in a file this task does not touch.
- Decision request: the agent browser check (review item 2) needs local Supabase, but Docker is not running and the app lane does not start Supabase (CLAUDE.md Local Supabase). Recommended: the user starts Docker and local Supabase, then the session runs the check. Alternative: accept on unit tests alone, leaving the browser check undone. Trade-off: the unit tests cover the aging rule and the timer, but only the browser shows real pointer events and the Grid render after the prop removal.
- Decision: user started Docker and local Supabase; the browser check ran (user, 2026-11-05).

### Checkpoint
- Changed: `node-card.tsx`, `scratch-modal.tsx`, `grid-view.tsx`, `grid-cell.tsx` and the tests of the first, second and fourth.
- Verified: failing tests first, then green; `git diff --check`, `pnpm lint`, `pnpm typecheck`, `pnpm build` pass; `pnpm test` 2501 of 2502, the one failure being the load timing of `datastore.live-read.test.ts` (passes alone, file untouched). Browser (isolated Playwright, local Supabase, fixture seed): Grid shows Inbox and Archive with no `filter` and ordinary Nodes with `saturate(1)`, and renders as before; Scratch capture with the real pointer over the panel stays open past 4.5 s, then closes 2.5-4 s after the pointer leaves; with the pointer outside it closes within 4.5 s. The Explorer was not opened in the browser; the unit test covers it. An old `mtime` on system Nodes is covered by the unit test only (no data edit, per review).
- Please check: nothing visual; Task 251 has no user checkpoint.
- Unresolved: none.
- Lesson: none.
- Review: advisory work-plan items 1-3 applied; no `expert` review (no shared logic).
