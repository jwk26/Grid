# Scratch Trash and post-Phase-34 Inbox corrections

## Metadata

- Created: 2026-10-15
- Readiness: code-ready
- Category: deferred task
- Source project: GridDO
- Source topic: n/a (found in real use after Phase 34 close)
- Source prototype: n/a
- Tags: inbox, triage, scratch, trash, retro-mac, departure-sheet, quick-capture
- Dependencies: Phase 34 closed (2026-10-15)

Settled with the user in an Opus session on 2026-10-15. This document is the
authority for the promotion into SCHEMA, SPEC, recipes and the execution plan.
It reopens no accepted task and no closed phase.

## 1. Delivery

| ID | Decision |
|---|---|
| H01 | Phase 34 stays closed. The work runs as a new Phase 41 (Tasks 209–212), the next unallocated numbers. |
| H02 | Phase 41 runs before Phase 35. Phase 35 starts only after Phase 41 close and main sync, because both write the same Inbox component and theme files. |
| H03 | Later theme phases (35–39) realize the new Pool trash control and Scratch Trash dialog for their themes as part of their Pool region. Until then those themes use the base styling. |

## 2. Scratch Trash

| ID | Decision |
|---|---|
| H04 | Every active Scratch can be moved to Trash from its Pool row. The control sits at the far right of the expanded Pool row and uses the same `Trash2` icon and hover treatment as the Breakdown row Trash control. Collapsed switchers carry no Trash control. |
| H05 | Delete means Trash (soft delete, `deletedAt`), the same lifecycle as the existing Bit "Move to trash". The Scratch is restorable from `/trash` for the existing 30-day retention, after which the existing permanent-deletion cascade applies. |
| H06 | Trash always asks for confirmation in a dialog. Cancel is the safe default. |
| H07 | If the Scratch has staged candidates, they are removed in the same transaction and the dialog states how many. Restoring the Scratch from Trash does not bring the candidates back; their source rows return as ordinary active rows. |
| H08 | If the Scratch being trashed has an unsaved Add draft or an open Scratch-title or row editor, the dialog says so and confirming discards them. |
| H09 | When the selected Scratch is trashed, the next selection follows the Archive success rule: next visible, then previous visible, then filtered-empty or true Inbox empty. A Scratch trashed from this page never shows the external-removal (`VQ-01`) transition. |
| H10 | In Retro Mac, the `[X]` at the right of the Selected Scratch Context title strip becomes a real control that opens the same Trash dialog for the selected Scratch. Other themes keep the strip hidden. |
| H11 | Trash is an authoritative repository command with compare-and-set, like Archive. A direct `softDeleteBit` call from the Inbox is not allowed, because it would skip the version check, leave staged candidates under a trashed Scratch, and trigger the external-removal transition. |
| H12 | Placement Undo additionally requires the source Scratch to be active, so Undo can never recreate a row or candidate under a trashed Scratch. |

### Flow-review round 1 decisions (2026-10-15)

| ID | Decision |
|---|---|
| H17 | Activating a Trash entry (Pool row Trash, Retro Mac `[X]`) is a blur-save exception, like the theme toggle. A dirty editor stays open and unsaved while the dialog is open; confirm discards it, Cancel leaves it as it was. |
| H18 | Trash entries are disabled, with a reason, while a placement flow is open. |
| H19 | Trash entries are disabled, with a reason, while that Scratch has a staged candidate whose source cannot be resolved. The existing confirmed-orphan cleanup resolves it first. |
| H20 | Undo for a placement whose Scratch was archived shows the dedicated reason `Its Scratch was archived.` |
| H21 | The Bit detail popup hides "Move to trash" for an Inbox-parented Bit. Pool row Trash and the Retro Mac `[X]` are the only Scratch Trash entries. |

## 3. Departure sheet in Retro Mac

| ID | Decision |
|---|---|
| H13 | The `DP-VQ03` Add-draft departure sheet gets a Retro Mac realization that uses the same visual family as the Retro Mac Archive alert: double hard border, hard offset shadow, square `!` mark, the Context font and square buttons with a default-button outline on `Continue writing`. |
| H14 | The sheet keeps its approved in-flow position, copy, action order, focus and no-motion contract. It does not become a page-centered or portal modal and gets no window title bar. |
| H14A | The existing Breakdown row Delete confirmation dialog also gets the Retro Mac Archive-alert realization (it currently ignores Retro Mac CSS because it renders outside the Inbox shell). Behavior and copy are unchanged. Owned by the Scratch Trash UI task. |

## 4. New Scratch selection

| ID | Decision |
|---|---|
| H15 | When a Scratch is captured while the Inbox workspace is mounted, the new Scratch becomes selected once the capture surface closes. The switch uses the ordinary Scratch-switch path, so a dirty inline Save and the `VQ-03` departure sheet still apply. |
| H16 | Captures made from any other route do not navigate to the Inbox; current behavior stays. |
