# Grid DnD Preview and Drop Targeting — Notes

Raw review notes for this topic. Current decisions stay in `DECISION.md`.

## 2026-10-31 — User notes from the Task 248 visual check (Phase 50)

Captured during the Task 248 Stage 2 checkpoint; not yet decided. To be shaped
into `DECISION.md` in a dedicated brainstorming session after Task 249.

### Item 1 — Compact drag token on the Grid

- User: on the Grid, dragging a Node or Bit makes the drop point hard to read,
  depending on the item's length. The same problem came up in Inbox/Triage when
  dragging staged Node/Bit items, and it was solved there by showing an icon
  while dragging (`src/components/triage/triage-drag-token.tsx`). The user wants
  the same approach and UI on the Grid.
- Advisory: this topic already proposes the compact token (Direction, and the
  2026-06-24 addendum). A token alone is not enough: Grid cells are chosen by
  the dragged rect's centre (`gridCollisionDetection` uses `closestCenter` for
  cells), so "the cursor tip picks the cell" also needs pointer-based cell
  targeting — a DnD logic change with an `expert` review.
- Advisory estimate: medium-high (token for Node and Bit, cell targeting, the
  Calendar's shared `useDnd`, four themes; about two tasks). Timing: after
  Task 249 (which edits `use-dnd.ts` and `grid-dnd.ts`), as a small phase after
  Phase 50 and before the theme stage, so the theme stage styles the token once.

### Item 2 — The sidebar during a Grid drag

- Today during a Node or Bit drag: the Edit button is emphasized; Search and
  Calendar disappear and an `x` delete target takes their place.
- User: dropping on the Edit button seemed like it should open the item's edit
  screen, but nothing happens. Advisory: not a defect — the Edit button has only
  a motion emphasis (`sidebarDragTargetActive`) and no droppable; there has never
  been a drop-to-edit feature, so today's emphasis is a false affordance.
- User proposals:
  - Account and `+` are dimmed too during a drag.
  - Search and Calendar stay in place during a drag, dimmed and disabled like
    the other icons, instead of being replaced by the `x`.
  - Remove today's Edit emphasis. Dimming the others alone is too weak a signal:
    keep the Home button's landing emphasis animation running on the Edit
    button for the whole drag, and show the Trash button as an explicit red
    trash-bin drop target instead of the `x`.
- Advisory: a continuously emphasized Edit button without a drop action
  strengthens the false affordance. Choose (a) drop on Edit opens the editor
  (Bit popup, Node edit dialog), or (b) no Edit emphasis and Trash as the only
  sidebar drop target. Recommended (b): a drag moves, editing is a click. A
  looping emphasis needs a reduced-motion form. The rest agreed (dim and
  disable instead of replacing; the bottom Trash button becomes the red delete
  target).
- Advisory estimate: low-medium (about one task; medium with (a)). Timing: the
  same phase as Item 1, since both share `use-dnd.ts`, `grid-dnd.ts`,
  `sidebar.tsx` and the `expert` review. This topic's Source Notes already list
  "Sidebar controls can become action targets during drag", so it belongs here.

### Item 3 — Teaching the breadcrumb ancestor drop (future Grid tour)

- User (2026-10-31, Task 248 check): the drag-time signal on every ancestor
  breadcrumb segment (a ring and tint) reads as noise. Remove it, and teach
  "drop on a breadcrumb segment to move an item to that ancestor" in a short
  Grid tour modal shown on a user's first Grid visit — a future idea, not yet a
  brainstorming topic of its own.
- Decided in Task 248 (SPEC F24, DESIGN_TOKENS FB-13): only the segment under
  the pointer keeps a light hover-level signal (`bg-accent`), so a drop on a
  segment is still told apart from a drop on the cell beneath once Task 249
  frees the top-left cells. The tour covers discoverability; it does not
  replace that per-drop signal.
