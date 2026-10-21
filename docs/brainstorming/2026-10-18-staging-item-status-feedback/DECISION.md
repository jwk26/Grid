# Inbox Item Status Feedback

## Metadata

- Created: 2026-10-18
- Updated: 2026-10-21
- Readiness: draft
- Category: interaction reference
- Source project: griddo2-claude
- Source topic: Phase 35 Task 176A checkpoint (`docs/issues/Issues_Phase_35.md`, mi-14); widened at Task 179 Stage 4a (MI-21)
- Source prototype: n/a
- Tags: staging, breakdown, add, inline-editor, operation-status, status-icon, tooltip, node-card, bit-card
- Dependencies: `2026-04-28-toast-feedback-placement`, `2026-07-14-cross-surface-text-capacity-and-overflow`
- Related: `2026-10-21-saas-conversion` (S26–S28: server latency makes Inbox `pending` visible more often; SaaS Phase 47 may apply this topic's display-delay rule ahead of its promotion; the Inbox status presentation otherwise stays as built until this topic; connection and load-failure states are SaaS-owned)

## Summary

Inbox operations report their state as visible sentences: a line inside the
affected Staging card or row (`DP-VQ06-STAGING`), a row-attached success signal
in Breakdown (`DP-VQ02`), reliability lines under a Breakdown row and under the
Add field, and status text in the inline editor. On narrow cards and at 1024px
these sentences do not fit (`Retur…` on an 80px Node card, mi-14), and the
reserved success slot takes the Breakdown row title's room (MI-21).

The user's direction: success is the default state and shows nothing; only a
problem is noticed. A problem shows a small status icon and emphasis on the
item it belongs to, and its sentence appears in a tooltip on hover or keyboard
focus of that item. No new modal or other new surface is added.

This entry is a direction, not a decision for implementation. It replaces parts
of `DP-VQ02` and `DP-VQ06-STAGING`, so promoting it needs new user decisions on
those DPs.

## Direction (user, 2026-10-18; revised 2026-10-19)

- Scope: Staging cards and rows, Breakdown rows, the Breakdown Add field, and
  the inline editor's save states.
- Success shows nothing visible: no `Added.`, `Returned to Breakdown.` or
  `Saved.` text, no success check and no success wash. The visible result (a
  new row, a returned row, the saved title) is the confirmation.
- Problem icons:
  - loader: `pending` and `reconciling`, shown only after a display delay
  - `?`: `unknown` (the outcome is not known)
  - `!`: not applied, rejected, conflict and integrity states
- The icon and an item emphasis mark where the problem is: the Breakdown row
  for a row Delete, the Add field for an Add (no row exists yet), the Staging
  card for Stage/Unstage states on a staged item.
- The problem sentence (the existing copy) shows in a tooltip while the pointer
  is over the item or the item has keyboard focus. The tooltip has no controls.
- Existing actions stay where they are as compact controls (`Check again`,
  `Retry Add`); "drag again" guidance is tooltip text. No new modal; an
  existing decision surface (the inline editor's conflict view) stays.
- A failure whose item disappears (a rejected, conflicting or not-applied Stage
  removes its projection) keeps the existing Staging alert band; no new toast.

## Constraints found in review (advisory, 2026-10-18 and 2026-10-19)

- `pending` usually ends within about 50ms. A loader shown at once flashes on
  every operation (the MI-15 flicker class). Show it only after a display
  delay; the delay only postpones presentation and never decides success
  (CLAUDE.md Architecture 6).
- Do not signal by colour alone (WCAG 1.4.1): the icon shape carries the state;
  red already means destructive, so prefer an accent border or tint.
- A tooltip is not discoverable by itself: the icon and emphasis are the
  visible notice, the tooltip is the explanation.
- Keyboard: the tooltip opens on focus of the item's focusable element (Add
  field, row grip, Staging card). An item that is not in the Tab order (an
  Explorer Bit card, `docs/reviews/phase-35-task-179A-scope-review.md` C1)
  needs a focusable status icon.
- Screen readers: unlike the Task 179A truncated-title tooltip, this tooltip is
  the item's description (`aria-describedby`), and the existing one-time live
  announcement of a problem stays.
- One tooltip at a time per card: the problem tooltip wins over the Task 179A
  truncated-title tooltip on the card body and can lead with the full title;
  the Undo control keeps its own tooltip.
- Under reduced motion the loader is a static icon.

## Conflicts with current canon

- `DP-VQ02` (DESIGN_TOKENS "Approved Add/Unstage success realization") fixes
  the visible success wash, `✓` and copy for 1600ms and its reserved row slot.
- `DP-VQ06-STAGING` (DESIGN_TOKENS "Approved Staging attached-status
  realization") fixes the in-card status line and its copy, the static alert
  band below `Staging`, "no stack/history/rail/toast/dialog", and no spinner or
  timer. The SPEC Durable Staging post-terminal presentation hold (2026-10-18)
  keeps the in-card line through the hold.
- The Breakdown and Add reliability lines and the inline editor status follow
  SPEC and their recipes. Promotion amends all of these, together with the
  Breakdown, Staging and Newly/Undo recipes and every theme realization that
  styles the lines.

## Current state

Phase 35 Task 176A (user, 2026-10-18, mi-14) removed the in-card line for
pending and a hold from pending; unknown and reconciling keep the ellipsized
line, and integrity slots and the alert band are unchanged. Phase 35 keeps
`DP-VQ02` as built. MI-21 (Breakdown rows and the Staging well too narrow at
1024px with the Pool open) is deferred to this topic: dropping the reserved
success slot gives the row title its room back.
