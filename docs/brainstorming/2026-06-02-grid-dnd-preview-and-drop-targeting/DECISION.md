# Grid DnD Preview and Drop Targeting

## Metadata

- Created: 2026-06-02
- Readiness: draft
- Category: interaction workflow idea
- Source project: griddo2-claude
- Source topic: Grid DnD ideation and Batch 1 Inbox/Triage DnD discussion
- Source prototype: n/a
- Tags: dnd, grid, bit, node, drag-preview, drop-target, interaction-state
- Dependencies: none

## Summary

GridDO has several drag-and-drop surfaces: the main grid, Node/Bit move-into
behavior, sidebar action targets, calendar scheduling, and the future
Inbox/Triage workspace. The current long-card drag behavior can make drop
locations hard to read, especially for horizontal Bit cards and row-like items.

The long-term direction is a shared Grid DnD contract:

- Drag source remains in place with a ghost/de-emphasized treatment
- Cursor follows a compact drag token, not the full card or full row
- Drop target feedback is pointer-centered and visually explicit
- Target states distinguish valid, invalid, and pending-confirmation drops
- Sidebar action targets can replace navigation controls during drag when useful

## Problem

Node cards are square and generally align with grid cell expectations. Bit cards
are horizontal strips. When the full Bit card follows the cursor, the dragged
surface can obscure the cell or Node target and make it unclear where the drop
will land.

The same issue appears in row-based workflows such as Inbox/Triage Breakdown
rows and staged candidates. Full-row drag previews make the source item visually
dominate the target area instead of clarifying the drop point.

## Source Notes

Earlier out-of-phase ideation already identified related DnD issues:

- Node and Bit may need different anchor rules because Node is a square object
  while Bit is a horizontal strip object
- Node/Bit drag needs stronger drop target animation
- Node drop targets need a clearer visual key so users know where an item is
  being placed
- Drag state should be part of a broader interaction-state matrix, not a one-off
  component behavior
- Sidebar controls can become action targets during drag instead of remaining
  normal navigation controls
- Node size/density changes are related but separate because changing grid
  object size affects spatial layout semantics

## Direction

Use compact drag tokens for non-square or row-like draggable items.

Recommended token behavior:

- Node: compact icon token using the Node icon (user, 2026-10-31: on the Grid,
  a Node and a Bit both become the icon token while dragging)
- Bit: compact icon token using the Bit icon, not the full horizontal Bit card
- Breakdown row: compact idea token, not the full row
- Staged Node candidate: compact Node token
- Staged Bit candidate: compact Bit token

Drop targeting should prioritize the cursor/pointer location over the dragged
card's visual center for grid placement. Users expect the cursor tip to indicate
the target.

## Target States

DnD surfaces should distinguish:

| State | Meaning |
|-------|---------|
| Valid | Drop will execute an allowed action |
| Invalid | Drop is not allowed |
| Pending confirmation | Drop opens a confirmation dialog before any write |

Examples:

- Grid cell move: valid if cell is available
- Node move-into target: pending confirmation
- Staged candidate into Hierarchy Explorer: pending confirmation
- Staged candidate into Remove from staging target: valid
- Breakdown row into Remove from staging target: invalid

## Relationship to Batch 1 Inbox/Triage

Batch 1 should not attempt to fix the entire Grid DnD system. It should implement
the local Inbox/Triage DnD behavior needed for Breakdown rows and staged
candidates.

That local implementation should still follow this broader direction:

- Compact drag token
- Clear target state
- Pending-confirmation hierarchy placement
- Sidebar-style action target for staged candidate removal

When this Grid DnD item is later promoted, the implementation should review and
reconcile the Inbox/Triage DnD behavior with the main grid, calendar, and pool
DnD behavior.

## Addendum: Grid Bit Compact Chip Exploration (2026-06-24)

Phase 20 smoke identified that BitCard needs a separate visual/design pass before
it consumes Batch 2 theme surface/font/depth treatment (`ISSUE-20-02`). That
design pass should also revisit Bit drag presentation because the same underlying
problem appears here: a full horizontal Bit card is too large and can obscure the
target cell or Node while dragging.

Use the Inbox/Triage staged-item compact token approach as a reference, not a
direct copy. The grid version should feel like a compact grid Bit, not like a
Triage staging chip:

- It should fit comfortably inside one grid cell footprint while still reading
  as a Bit.
- It should preserve enough Bit identity for targeting: Bit icon, short title or
  title hint if space allows, and parent/accent color where useful.
- It should be theme-aware once BitCard theme treatment is designed, including
  font, border/radius, shadow/depth, and high-contrast themes such as Terminal
  and Retro Mac.
- It should remain pointer-centered so the cursor indicates the intended drop
  target.
- It should not copy the full BitCard's priority badge, deadline overlay, or
  progress bar unless the design pass proves those elements remain legible at
  compact size.

Before implementation, explore this with Gemini and/or a lightweight visual
mockup. The open design question is the exact shape of a "cell-sized Bit chip":
how much text it carries, how it uses parent color, and how it differs from both
Node compact tokens and Inbox/Triage staged Bit tokens.

## Out of Scope for Now

- Node density mode
- Full layout snapshot / undo workflow
- Calendar DnD redesign
- Multi-select drag
- Grid Frames and frame-aware collision behavior
