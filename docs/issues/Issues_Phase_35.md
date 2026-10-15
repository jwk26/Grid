# Issues — Phase 35: Neumorphism Regional Realization

Branch: phase-35/neumorphism · Started: 2026-10-16
Carried over: MI-9 and Close Advisory A2 from Phase 34 (`Issues_Deferred.md`), both bound to Task 178. For reference only: P29-01/MI-6 (Explorer card visual debt, Q01 gate) bear on Tasks 176/177; `D-LENS` (Neumorphism ASC/DESC water-lens) stays deferred and is not realized in Task 173; the Phase 41 surfaces (Pool row Trash control, Scratch Trash dialog, `DP-VQ03` departure sheet, Breakdown Delete dialog) have no prototype source, so their Neumorphism look is proposed in Tasks 173/174 and set by the user's visual disposition.

## Task 173 — Fix the common frame and realize Scratch Pool

### Current state
- Status: Awaiting User Decision
- Next: go-ahead on the work plan
- Open: none

### Log
- Work plan:
  - Files: `src/app/globals.css` (a `neumorphism` alias block of `--triage-frame-*` / `--triage-pool-*` roles, following the Retro Mac block; no theme-id branch in components), `scratch-pool.tsx` and `triage-workspace.tsx` only if CSS aliases cannot reach a sourced element (e.g. a `data-triage-state` hook on the sort control for the capsule thumb), `scratch-pool.test.tsx`, and the new `inbox-triage-theme-realization.test.tsx` (semantic/state-preservation assertions, light + dark alias presence, no Retro Mac leakage).
  - Needs your call: production `neumorphism` has no inset/card shadow family (`--theme-shadow-inset*`, `--theme-shadow-card*`), only `--theme-shadow`; the prototype's `themes.css:47-112` has them and the recipe says to consume "the existing" family. I would add the prototype's light/dark values to the production neumorphism blocks and change `scratch-pool.test.tsx:142` (`not.toContain("--theme-shadow-inset")`) accordingly. The existing neumorphism `pool-status-band`/`pool-activity-marker` rules (DP-VQ06-POOL) are retargeted to that family only if the 1:1 comparison shows a mismatch.
  - Stage 1 — frame + expanded Pool, light 1920×1080: `gap-5` frame, 288px raised soft plate, header/identity/count/collapse, inset pill search, inset sort capsule with raised thumb (the existing single sort button, no new copy; `D-LENS` water-lens stays out), raised/inset rows, selected row. Checkpoint: screenshot beside the prototype, then your first judgment.
  - Stage 2 — collapsed Pool (64px rail, inset dots, raised active bar), empty/no-match, status band/activity marker, focus/hover, the Phase 41 Pool row Trash control and Scratch Trash dialog (no prototype source: I propose a raised small plate and a raised card with inset status line, set by your disposition). Checkpoint: screenshots + your first judgment.
  - Commit per accepted stage; final commit message `feat(triage): realize neumorphism frame-pool`.
  - Verify: Playwright MCP browser with `scripts/dev-fixtures/inbox-triage.js` (expanded/collapsed/query/sort/selection/empty/status/focus/hover, external removal and Breakdown handoff, other themes unchanged), then the full gate. Styling-only unless JSX logic changes, so no `expert` review.
  - Out of scope: Breakdown/Staging/Explorer internals, dark-mode polish beyond keeping aliases valid (Task 179).
