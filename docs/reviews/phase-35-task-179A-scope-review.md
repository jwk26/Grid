# Flow-Trace Review: Phase 35 Task 179A repair scope

## Round 1

**Reviewed:** 2026-10-19 by the `expert` subagent, independent of the plan author. Read-only.
**Inputs:** the uncommitted diff to `docs/EXECUTION_PLAN.md` (header, graph, Phase Index Phases 35/36, UF-17, L4 truncated-title amendment, Task 179A, Task 180 dependency, register rows, reconciliation), `docs/SPEC.md` "Explorer truncated titles", the Explorer recipe truncated-title subsection and the Selected Scratch Context recipe Retro Mac line; the last Task 179 Decision entries in `docs/issues/Issues_Phase_35.md`. Canon checked: L4 Q01 gate and the urgency precedent, Newly/Undo recipe `:45-77`, DESIGN_TOKENS `:1162`, `:1302`, WORKFLOW `:717`. Code read: `node-card.tsx`, `bit-card.tsx`, `ui/tooltip.tsx`, `hierarchy-explorer.tsx` (`NodeDropCell`/`BitContextRow` and focus paths), `grid-explorer-search-results.tsx:320-345`, `breakdown-panel.tsx:2198-2242`, `triage-drag-token.tsx:25`, the workspace DndContext, the relevant `globals.css` regions, Radix Tooltip 1.2.8 and Popper, and the CSS-region tests in `inbox-triage-theme-realization.test.tsx`. Baseline: `node-card.test.tsx` and `bit-card.test.tsx` pass (36 tests).
**Decision prerequisites:** DP-VQ06-EXPLORER/07/10 untouched; no new design decision. One user confirmation recommended (C1): Bit cards are not in the Tab order, so keyboard focus on a Bit can only come from script focus.

### Flow-Trace Table

| # | Flow / source | Finding | Status |
|---|---|---|---|
| 1 | Pointer over a truncated title | Titles are single-line `truncate` (`node-card.tsx:152-155`, `bit-card.tsx:165-174`; Retro Mac `globals.css:1995-2007`, Neumorphism `:7490-7502`), so `scrollWidth > clientWidth` detects the cut. Radix uncontrolled `open` cannot refuse, so open must be controlled with a check at open; integer widths can miss sub-pixel overflow. | ⚠️ W2 |
| 2 | Fitting title | No tooltip if measured at open; jsdom needs stubbed widths. | ✅ |
| 3 | Keyboard, Node card | `tabIndex` 0 only with `onSelectNode` (`hierarchy-explorer.tsx:2541`). Focus is on the card button, not the title, so Radix trigger focus never fires; a card-level handler is needed. | ⚠️ G1 |
| 4 | Keyboard, Bit card | Always `tabIndex={-1}` (`:2611`), no roving; focus only from placement (`:1103`), reveal (`:2230`), Undo plan (`:660`), "N new" (`:2300`). | ❌ G1 |
| 5 | Script or mouse focus | Pointer drop focuses the new card (`:1103`, `:416-417`); opening on any focus would show the tooltip after every mouse placement and reopen after a click. | ❌ G2 |
| 6 | Esc | Radix dismisses on Esc; no conflicting Esc on a focused card. A focus-opened tooltip must stay closed after Esc. | ⚠️ W3 |
| 7 | Drag over Explorer rows | The drag token is `pointer-events-none`, so titles get `pointermove` and Radix opens; no drag signal reaches the cards. | ❌ G3 |
| 8 | Tooltip open when a drag starts | Closes on outside `pointerdown` / blur. | ✅ (with G3) |
| 9 | Undo tooltip exclusion | Radix exclusion only for its own opens; in a Bit card the Undo is inside the card root (`bit-card.tsx:233-241`), so its focus bubbles to the card. | ❌ G4 |
| 10 | Accessible name/description | Cards set explicit `aria-label`s (`:2525`, `:2604`); the Trigger adds `aria-describedby` to itself while open; Content adds a `role="tooltip"` copy. Achievable only with the trigger on the title and the content hidden. | ⚠️ G5 |
| 11 | WCAG 1.4.13 | Met by the primitive, given W3. | ✅ |
| 12 | 1024 compact NEW/Undo | Titles 37–43px, always truncated; the portaled tooltip is unaffected by `container-type`; but no max width outside `.newly-undo-tooltip` (`globals.css:5725-5728`). | ⚠️ G6 |
| 13 | Resize while open | Undefined; measuring at open is acceptable if stated. | ⚠️ W2 |
| 14 | Search results | Titles wrap, no ellipsis (`globals.css:1727-1733`, `:7831-7835`). The conditional owner never applies. | ⚠️ W4 |
| 15 | Ordinary Grid | `presentation="default"` (`grid-view.tsx:134`, `:168`); holds if the tooltip tree renders only for Explorer. | ✅ |
| 16 | Other consumers | Only `hierarchy-explorer.tsx` and `grid-view.tsx`. | ✅ |
| 17 | Theme plates | Neumorphism has an Undo plate (`globals.css:8340-8353`); Retro Mac has none (base `.newly-undo-tooltip` plus the primitive). The Undo contract is static; the primitive fades and zooms. | ⚠️ G7 |
| 18 | CSS placement vs region tests | Rules after `:6168` must be Neumorphism-scoped; after `:8355` Archive-scoped; the Task 177 block must name `.newly-undo-tooltip` or `inbox-explorer`. | ⚠️ W5 |
| 19 | Retro Mac (b) | Reachable from `context-signature-plate[data-triage-state="complete"]` (`breakdown-panel.tsx:2204-2241`, `globals.css:5407`); folder can be hidden (`:5352`); `::after` free; ink/surface swap in dark. Box fill is `--muted`; box hidden at ≤1100px (`:5542`). | ⚠️ W6 |
| 20 | Plan wiring | Counts, header, graph, Phase Index, Task 180, UF-17 and register rows consistent. The Q01 text grants less than G1–G4 need; the consumer boundary is not named. | ⚠️ W1 |

### Gaps Found

| # | Gap | Recommended resolution |
|---|---|---|
| G1 | Bit cards and drop-only Node cells are `tabIndex={-1}`; "focusable card has keyboard focus" is unreachable by Tab for Bits, and the title is never the focused element. | Open while the card root holds `:focus-visible` (a Node reached by Tab, or a Node/Bit focused by placement, reveal, Undo or arrival after a keyboard action), through a card-root focus/blur handler; Bits stay out of the Tab order (C1). |
| G2 | Opening on any focus shows it after every mouse placement and click. | Open on focus only when the card matches `:focus-visible`; test programmatic focus after a pointer interaction and a mouse click. |
| G3 | No drag signal in the granted files. | An explorer-only sub-component reads `useDndContext().active` (safe outside a `DndContext`; not `useDndMonitor`); `hierarchy-explorer.tsx` unchanged; test with a mocked active drag. |
| G4 | Exclusion is not automatic; Bit Undo focus bubbles to the card. | One card-local state `"title" | "undo" | null` drives both tooltips; open the title on focus only when `event.target === event.currentTarget`; the Undo tooltip becomes controlled with identical behavior; tests in both orders. |
| G5 | "Read once" needs a named mechanism. | Trigger `asChild` on `explorer-card-title` only; card `aria-label`/`aria-describedby` untouched; title `TooltipContent` `aria-hidden="true"`; test name and `aria-describedby` before and after opening. |
| G6 | Long titles render as one line as wide as the title. | Base plate wraps within `min(24rem, calc(100vw - 16px))`; verify a 100-character title at 1024px. |
| G7 | Retro Mac has no Undo plate; "base plate" and motion undefined. | Neumorphism reuses its Undo plate; Retro Mac and unrealized themes use the base `.newly-undo-tooltip` look plus the primitive, static; own role `explorer-title-tooltip`, not the `newly-undo-tooltip` class; note beside DESIGN_TOKENS `:1302`. |
| W1 | Q01 wording vs the L4 gate. | List the granted changes and the unchanged consumer; record that Q01 is granted by the user's approval of the diff. |
| W2 | Truncation timing and precision. | Measure at open (`scrollWidth > clientWidth` or a `Range` width); no close on resize; delay 0, side `top`; state the case shown for Retro Mac uppercase titles. |
| W3 | Esc stickiness. | Closed after Esc until focus leaves the card or the pointer leaves the title. |
| W4 | Search-results owner condition is false. | Drop it from Files and the register row; titles wrap, no change. |
| W5 | Region-test placement. | Retro Mac and base rules before `/* Neumorphism L1 (Task 173)`; Neumorphism plate extends `:8341`, before `:8355`. |
| W6 | (b) colour, stripe, viewport. | Name `--triage-context-surface`; state the stripe; verify above 1100px. |
| W7 | Optional: `actual-bit-card(-test)` rows omit Task 176. | Add 176. |

### Summary

- Flows traced: 20. Fully owned: 7. Weak: 9. Gaps: 4. Deferred: 0.
- Flow ownership: **GAPS FOUND** (G1–G7). Implementation readiness: **READY AFTER TEXT FIXES**; no new design decision; show the user C1.

### Resolution (plan author, 2026-10-19)

All of G1–G7 and W1–W7 are applied to Task 179A and the L4 amendment in `docs/EXECUTION_PLAN.md`, SPEC "Explorer truncated titles", the Explorer recipe subsection, the Context recipe Retro Mac line and DESIGN_TOKENS `:1302`. W2: the plate shows the stored title as typed. W6: the stripe is dropped in the complete state, as in candidate B. W4: `grid-explorer-search-results.tsx` leaves Files and the `explorer-results` row. C1 goes to the user with the diff.
