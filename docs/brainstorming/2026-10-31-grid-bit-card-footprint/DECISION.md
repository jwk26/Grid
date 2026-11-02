# Grid Bit Card Footprint

## Metadata

- Created: 2026-10-31
- Readiness: draft
- Category: interaction and layout idea
- Source project: GridDO
- Source topic: n/a (user idea during Phase 48 Task 237, while checking the demo seed)
- Source prototype: n/a
- Tags: bit-card, grid, cell, overflow, drop-target, dnd, theme-stage
- Dependencies: `2026-10-17-theme-scope-replan` (theme stage); `2026-10-20-grid-card-theme-alignment`; `2026-06-02-grid-dnd-preview-and-drop-targeting`; `2026-07-14-cross-surface-text-capacity-and-overflow`; `2026-10-21-default-theme` (branch `prototype/default-theme`, Bit card B1)

## Summary

A Node card matches its Grid cell, so what the user sees is what it occupies. A
Bit occupies one cell in the data but renders as wide as its content, so a long
Bit covers its neighbors and hides the cells a drop would land on. The user wants
this settled together with the theme-stage card work.

## Current state (checked on `phase-48/accounts-and-launch`, 2026-10-31)

- The data model gives every item one cell (`x`, `y`). Hook 8, the database cell
  checks, `internal.pick_free_cell` and `findNearestEmptyCell` all count one cell
  per item.
- `BitCard` is `inline-flex shrink-0` with no maximum width, and its Grid wrapper
  is `overflow-visible` (`bit-card.tsx`, `grid-view.tsx`). The title has
  `truncate`, but nothing limits the card, so the title never truncates and the
  card grows with it, up to a 200-character title.
- The card sits at `z-10`, so it covers neighboring items and empty cells. Grid
  drop targeting follows the pointer (`gridCollisionDetection`, `pointerWithin`),
  so the real drop cell can be one the card hides. A covered item cannot be
  clicked.
- Auto-placement starts a Bit near the right edge (`GRID_COLS - 3`), where a long
  Bit also runs out of the right side of the Grid.
- The whole card follows the cursor while dragging on the Grid. There is no
  `DragOverlay` there; Inbox/Triage already has a compact token.

## What the existing topics cover

| Topic | Covers | Does not cover |
|---|---|---|
| `2026-06-02-grid-dnd-preview-and-drop-targeting` | The drag token and pointer-centered target feedback, while dragging | Overlap at rest |
| `2026-07-14-cross-surface-text-capacity-and-overflow` | How much text each surface shows and how to reach the rest | How many cells a Bit covers |
| `2026-10-20-grid-card-theme-alignment` | Theme styling of the Bit card | Its size |
| `2026-10-21-default-theme` | Paper Bit card B1: current structure refined, used by Staging and Explorer too | Overlap on the Grid |

So the drag token alone does not end this problem: it helps only during a drag,
and a Bit at rest still hides its neighbors.

## Decided (user, 2026-10-31)

- A Grid Bit title stays on one line with no wrap, and the card keeps its two rows: icon, title and priority badge, then the date below. The two rows fit the cell height, so the height does not change.
- The width snaps to whole cells: minimum 1, maximum 4. A card a little over one cell gets 2 cells, a little over two gets 3, and so on.
- Past 4 cells the title ends in an ellipsis with `overflow: hidden`.
- While dragging, a Node and a Bit both become the icon token (`2026-06-02-grid-dnd-preview-and-drop-targeting`).

## Occupancy: a Bit occupies the cells it shows

The user's intent from the start (user, 2026-10-31): the cells a Bit visibly covers
are the cells it occupies in the data. The earlier objection that theme fonts change
a Bit's width does not hold today: `BitCard` has no theme hook and inherits
`font-sans` in all four themes, and Paper can be built to this requirement.

Two facts shape how to build it (proposal, not decided):

- Cell width follows the window (`minmax(0, 1fr)` over 18 columns), so a span
  measured on screen would differ by window for one account. The span therefore
  comes from a fixed rule over the title, priority and date, never from a
  measurement, and one rule runs on the server and the client with a parity test
  (as S33 does for limits). The card is always exactly span × cell wide, so what is
  seen equals what is occupied in every window.
- A rename, a new priority or a date can make a Bit want more cells than are free,
  and a long Bit can be dropped into a small gap. The ellipsis rule covers this
  (user, 2026-10-31): the Bit never grows past 4 cells, and as proposed here the
  stored span is also cut at the next occupied cell at write time, with the title
  ending in the ellipsis there. A rejected rename or an automatic move would be worse.
- The right edge (user, 2026-10-31): Bits toward the right of the Grid run out of
  sight, and it is not yet decided what to do. A Bit at `x` 17 has one cell left, so
  cutting at the edge alone leaves it unreadable. Proposal: a placement keeps the
  whole span inside the Grid, so auto-placement starts a Bit at `18 - span` at most,
  not at the fixed `GRID_COLS - 3`, and a drop near the edge pulls the Bit left when
  those cells are free; only otherwise is the span cut.

So the ellipsis appears past 4 cells, and also on a span cut by a neighbor or the
edge, and in a window narrower than the rule's reference width.

Cost: a stored span on `bits`, a backfill, and the cell rules everywhere one cell is
assumed today: Hook 8, `cell_taken`, `internal.pick_free_cell` and
`internal.find_free_cell`, `findNearestEmptyCell`, client occupancy, drops, Triage
placement, restore, unarchive and promotion. It is planned as its own phase with a
flow review, not as a styling pass. Staging and Explorer keep their own presentation.

The card look comes first (user, 2026-10-31). The Grid Bit has no theme CSS today, so
a theme changes little more than its colors (`2026-10-20-grid-card-theme-alignment`,
ISSUE-20-02). The user's idea is to reapply each theme's Inbox/Triage Staging Bit look
to the Grid Bit. That can make the card longer than the widths measured now, so the
span rule is set after that look and measured on it. If the look brings per-theme
fonts, widths differ by theme again, and the rule is set from the widest theme so one
layout holds in all of them. Paper decided the other direction, Staging using the Grid
cards; both end with one card, and the follow-up settles which look is the source.

Planning (user, 2026-10-31): a separate phase, promoted from this topic through
`/craft-docs` after Phase 48, not a part of a theme's styling pass.

Considered and not preferred: visual snap only (neighbors still overlap); a
render-time span with one-cell data (no SQL change, but a covered cell still accepts
a drop, which reads as a surprise).

## Open questions

- The span rule: units per character kind, and the reference window width, measured
  on the final card look.
- The right-edge proposal above, or another answer.
- Which card is the source: each theme's Staging Bit, or Paper's Grid Bit.
- A Node dropped beside a Bit, and a Bit whose neighbor later leaves: does its span
  grow back at its next edit, or at once?
- Paper B1 is compatible with the two rows and the strip shape; check its padding
  against the 1-cell minimum.
- Order inside the theme stage: this comes before each theme's Bit card styling, or
  that styling is done twice.
