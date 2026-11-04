# Phase 21 — Batch 2 Calendar Visual Alignment

> **Branch:** `phase-21/calendar-visual-alignment`
> **Tasks:** T93, T94, T95, T96

---

## Planning Gate Note

`docs/reviews/amendment-batch2-theme-calendar-inbox-flow-review.md` (Phases 20–22 combined) satisfies the Phase 21 flow-review gate per amendment-mode Step 6 PASS declaration. No per-phase review doc required.

---

## Phase-local Question Resolution

| # | Question | Resolution | Status |
|---|----------|------------|--------|
| Q1 | T93 plan listed `monthly/page.tsx` in Files but actual implementation touched `monthly/_components/month-grid.tsx` (header lives in MonthGrid, not the page shell). `calendar-store.ts` / `calendar-store.test.ts` also added out-of-plan for `goToToday`. | EXECUTION_PLAN.md T93 Files corrected post-approval to match actual write set. Implementation was correct; plan entry was imprecise. | Reflected |

---

## Open Items

| ID | Category | Description | Status |
|----|----------|-------------|--------|
| ISSUE-21-01 | Process/Low | Sequential Codex A→B execution: B's scope verification relied on `git status` alone after A left uncommitted changes — cannot distinguish B's writes from A's. Future batches: save `git diff --name-only` baseline before B launches, or commit A before B. | Closed (user, 2026-11-04) — Codex A→B execution retired with the Codex workflow |
| ISSUE-21-02 | Test/Low | Monthly Today button test verifies `goToToday` is called but does not assert `setSelectedDate(null)` side-effect (open popover should close). | Closed — T96 added regression guard in `calendar-navigation.test.tsx` |
| ISSUE-21-03 | UX/Low | Weekly header now shows `"June 2026"` instead of date range. Recipe canonical, intentional tradeoff. Cross-month weeks lose date-range information. T96 smoke: no severe usability finding. | Deferred — post-Phase 21 UX review |
| ISSUE-21-04 | A11y/Medium | DayColumn internal draggable card buttons (CompactNodeItem open/unschedule, PlacedNodeCard open/unschedule, PlacedBitCard open/unschedule) missing `focus-visible` ring. | Closed — fixed in T96 follow-up commit; regression assertions added to `day-column.test.tsx` |

---

## Batch Plan

| Batch | Tasks | Status | Commit |
|-------|-------|--------|--------|
| B1 | T93 — Shared calendar view header | `[x]` Complete (approved) | `bffb0c8` |
| B2 | T94 + T95 — Monthly grid + weekly day column theme visuals | `[x]` Complete (approved) | T94: `7a2e9ae`, T95: `f133d58` |
| B3 | T96 — Calendar a11y polish and theme smoke | `[x]` Complete (approved) | `9497d38`, `a664cf9` |

### B1 — T93: Shared calendar view header

**Classification:** logic-heavy + behavior-heavy (parallel test authoring: Codex A impl → Codex B tests sequentially)

**Write set (Codex A — implementer):**
- `src/components/calendar/calendar-view-header.tsx` (create)
- `src/stores/calendar-store.ts` (update — add `goToToday` action)
- `src/app/calendar/weekly/page.tsx` (update — replace inline header)
- `src/app/calendar/monthly/_components/month-grid.tsx` (update — replace embedded header)

**Write set (Codex B — test author):**
- `src/app/calendar/calendar-navigation.test.tsx` (update — shared header assertions, Today button, title/subtitle)
- `src/stores/calendar-store.test.ts` (update — add `goToToday` test)

**Key decisions:**
- `goToToday` added to calendar-store (no existing absolute-date setter)
- Header root uses `<header aria-label="Calendar navigation">` (semantic, no data-testid needed for findNavRow)
- Props include `previousLabel`/`nextLabel` to preserve "Previous week/month" a11y labels
- `setSelectedDate(null)` preserved in MonthGrid's onPrev/onNext/onToday callbacks (local state, not store)
- Sequential execution (A → B) chosen over parallel to avoid working-tree race on shared repo

---

### B2a — T94: Monthly grid theme-aware visual target

**Classification:** logic-heavy  
**Commit:** `7a2e9ae`

**Write set:**
- `src/app/calendar/monthly/_components/month-grid.tsx` (patch)
- `src/app/calendar/monthly/monthly-calendar.test.tsx` (update)

**Changes applied:**
- Replaced `gap-3 px-6` card grid with `gap-px` tight grid using `--calendar-grid-line-color` as background.
- Weekday header row uses `style={{ background: "var(--calendar-header-bg)" }}`.
- Date cells use inline `style` with `--calendar-cell-*` / `--calendar-today-*` variable set.
- Today rendered as circular badge (`rounded-full bg-primary text-primary-foreground`). First-of-month uses `MMM d` format.
- Node previews: colored square tiles with `var(--theme-radius, 6px)`. Bit/Chunk previews: colored dots.

---

### B2b — T95: Weekly day column theme-aware visual target

**Classification:** logic-heavy (complete spec from user prompt + recipe)  
**Commit:** `f133d58`

**Write set:**
- `src/components/calendar/day-column.tsx` (patch)
- `src/components/calendar/day-column.test.tsx` (update)

**Changes applied:**
- `motion.div` container: removed `rounded-3xl border shadow-sm` and all conditional border/bg/shadow/today-ring Tailwind utilities. Drop feedback changed from `border-primary bg-primary/5` to `ring-2 ring-primary/40`. Added inline `style` with full `--calendar-cell-*` / `--calendar-today-*` variable set (background, borderColor, borderRadius, borderStyle, borderWidth, boxShadow).
- Header `button`: removed `rounded-xl`. Added inline `style` with `background: var(--calendar-header-bg)` and `borderRadius: calc(var(--calendar-cell-radius) * 0.8)`.
- Tests: replaced `toHaveClass("ring-primary/40")` and `toHaveClass("ring-primary")` today-emphasis assertions with `toHaveAttribute("style", expect.stringContaining("var(--calendar-today-shadow)"))`. Added non-today `var(--calendar-cell-bg)` assertion in the existing items test.

**Verification:**
- `day-column.test.tsx`: 5/5 passed
- `calendar-navigation.test.tsx`: 14/14 passed
- `pnpm build`: clean (TypeScript + static pages)
- `git diff --check`: clean

**No deviations from spec.**

---

### B3 — T96: Calendar a11y polish and theme smoke

**Classification:** logic-heavy, Claude-direct (exact classes specified; user instruction: skip Gemini for tiny/exact changes)

**Write set:**
- `src/app/calendar/monthly/_components/date-cell-popover.tsx` (patch)
- `src/components/calendar/compact-bit-item.tsx` (patch)
- `src/components/calendar/compact-bit-item.test.tsx` (update)
- `src/app/calendar/calendar-navigation.test.tsx` (update — ISSUE-21-02 regression guard)
- `docs/issues/Issues_Phase_21.md` (this document)

**Focus-visible changes applied:**
- `date-cell-popover.tsx`: Added `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1` to popup item navigation buttons (close button already had ring).
- `compact-bit-item.tsx`: Added focus-visible ring to root drag surface div, open button (`rounded-sm` added for ring containment), and unschedule button.

**Test additions:**
- `compact-bit-item.test.tsx`: Added `focus-visible:ring-2 / ring-ring` assertions for root, open button, and unschedule button in pool variant test.
- `calendar-navigation.test.tsx`: Added `"monthly Today button closes an open day popover"` test — closes ISSUE-21-02.

**Verification:**
- `compact-bit-item.test.tsx` + `day-column.test.tsx` + `calendar-navigation.test.tsx`: 22/22 passed
- `pnpm build`: clean (TypeScript + static pages)
- `git diff --check`: clean

**Visual smoke (2026-06-24):**

| Theme | Mode | Monthly | Weekly | Notes |
|-------|------|---------|--------|-------|
| griddo | light | ✅ | — | today badge, grid lines, Jun 1 label |
| griddo | dark | ✅ | — | today badge, grid lines readable |
| terminal | dark | ✅ | — | amber high-contrast, dashed grid, today badge |
| terminal | light | ✅ | ✅ | bright green, today emphasis visible; out-of-month dates near-zero contrast — recipe `opacity-40 grayscale` on bright green, not T96 regression |
| neumorphism | light | — | ✅ | today column black border, rounded card style |

**Smoke findings:** No new issues. ISSUE-21-03 (weekly header date range) not a severe usability finding — remains deferred. ISSUE-21-04 (DayColumn internal card buttons missing focus-visible) initially identified during smoke, then resolved in follow-up commit `a664cf9` within T96 — Closed.

**ISSUE-21-04 resolved in follow-up commit:** After checkpoint, user directed T96 to resolve ISSUE-21-04 within the same task. Added `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1` to `CompactNodeItem`, `PlacedNodeCard`, and `PlacedBitCard` open/unschedule buttons in `day-column.tsx`. Added regression assertions to the single-node-card, single-bit-card, and compact-node-rows tests in `day-column.test.tsx`. 22/22 tests pass, build clean.
