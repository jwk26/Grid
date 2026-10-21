# Issues — Phase 3

## Issue 1: Plan status tracking lagged behind implementation

- **Problem:** Tasks 11–14 were implemented in a single commit (`a6e292b`) but their `EXECUTION_PLAN.md` statuses remained `[ ]`. A new session reading the plan would incorrectly treat these tasks as not started.
- **Root Cause:** The closing-phase process was not run after the initial Phase 3 implementation commit.
- **Solution:** Statuses updated to `[x]` during Phase 3 close.
- **Learning:** Always update task statuses in the same session that produces the implementation commit. Never leave `[ ]` for code that is already in the working tree.

## Issue 2: Level 0 node creation was a missing UI path (Phase 3 omission)

- **Problem:** The sidebar `+` button and empty-cell `+` button were both wired to `noop`. The data layer (`createNode()`, `getGridOccupancy()`, BFS) was fully implemented, but no UI path called it. The task acceptance criterion said "creating first node removes hints" without specifying the creation UI, leaving it as an implicit gap.
- **Root Cause:** Phase 3 implementation focused on rendering components. The creation affordances were built as visual placeholders with the assumption that creation flows would come in a later phase. The acceptance criteria did not make this explicit.
- **Solution:** Added `Level0Shell`, `CreateNodeDialog`, and shared `node-icons.ts` constants. Both entry points now open the same dialog. Placement resolution uses BFS via `getGridOccupancy()`.
- **Learning:** Any acceptance criterion that implies a user action (e.g., "creating X does Y") requires a complete end-to-end UI path — affordance + dialog/flow + data write. If only the data layer exists, the criterion is not met. Flag this during plan review, not after implementation.

## Issue 3: `pnpm typecheck` does not exist

- **Problem:** The pre-PR gate command `pnpm lint && pnpm typecheck && pnpm build` fails because there is no `typecheck` script in `package.json`.
- **Root Cause:** The project has no separate typecheck script. TypeScript type checking is run internally by `next build`.
- **Solution:** The correct pre-PR gate is `pnpm lint && pnpm build`.
- **Learning:** Document the actual pre-PR gate in CLAUDE.md or the execution plan notes. Do not assume a `typecheck` script exists — verify with `cat package.json | grep scripts` first.

## Issue 4: Lint has 2 pre-existing warnings in use-dnd.ts

- **Problem:** `pnpm lint` exits with warnings (not errors) for unused `_event` parameters at lines 46 and 55 of `src/hooks/use-dnd.ts`. This can be misread as a lint failure.
- **Root Cause:** `use-dnd.ts` was scaffolded in Phase 2 with placeholder handler signatures. The `_event` parameters are intentionally unused until drag behavior is wired in Phases 3–5.
- **Solution:** No fix needed — lint exits 0 (warnings only). The pre-existing warnings are not introduced by Phase 3.
- **Learning:** When reporting verification status, distinguish "lint passes with warnings" from "lint is fully clean." Saying "Verification ✅" without noting warnings can mislead future sessions into thinking the codebase is warning-free.

## Issue 5: Radiogroup keyboard navigation not fully compliant

- **Problem:** The icon picker in `CreateNodeDialog` uses `role="radiogroup"` + `role="radio"` ARIA semantics but allows tabbing through every individual icon button. Standard ARIA `radiogroup` expects a single tab stop with arrow-key navigation between options.
- **Root Cause:** Implementing single-tab-stop + arrow-key navigation requires either custom `onKeyDown` handlers for all 4 arrow directions + wrapping behavior, or adopting the Radix UI `RadioGroup` primitive. This was considered scope expansion for the Phase 3 omission fix.
- **Solution:** Deferred. The current implementation is usable (all icons are keyboard-reachable via Tab) but not ARIA-optimal for screen reader power users.
- **Learning:** When using `role="radiogroup"`, either implement full arrow-key navigation or use the Radix `RadioGroup` primitive. Using the semantic role without the keyboard contract is a partial implementation. Note this explicitly in the issue log so it is not forgotten.

## Issue 6: DataStore context exists but hooks use direct imports

- **Problem:** `providers.tsx` exports a fully implemented `useDataStore()` context hook, but all existing hooks (`use-grid-data.ts`, `use-search.ts`, `use-bit-detail.ts`) and the new `level-0-shell.tsx` import `indexedDBStore` directly. Two access patterns now coexist.
- **Root Cause:** The context hook was implemented in Task 11 but the hooks written in Task 9/10 used direct imports (likely following Phase 2 patterns before the context existed). The inconsistency was never reconciled.
- **Solution:** For Phase 3, the direct-import pattern was kept for consistency with existing hooks. Migration to `useDataStore()` is a separate concern.
- **Learning:** When a context-based data access pattern is introduced, update all existing consumers in the same commit or create a follow-up task. Letting two patterns coexist creates confusion about which is canonical.
- **Closed (user, 2026-10-22):** stale. Hooks reach the store through `getDataStore()`; no hook imports `indexedDBStore`. Checked during the SaaS conversion promotion.

---

## Summary

| # | Issue | Resolution |
|---|-------|------------|
| 1 | Plan status tracking lagged behind implementation | Updated to `[x]` during close |
| 2 | Level 0 creation was a missing UI path | Added dialog, shell, icon constants |
| 3 | `pnpm typecheck` does not exist | Gate is `pnpm lint && pnpm build` |
| 4 | Lint has 2 pre-existing warnings | No fix needed — exits 0, not introduced here |
| 5 | Radiogroup keyboard navigation not fully compliant | Deferred to future a11y pass |
| 6 | DataStore context and direct imports coexist | Closed (user, 2026-10-22): stale, hooks use `getDataStore()` |
