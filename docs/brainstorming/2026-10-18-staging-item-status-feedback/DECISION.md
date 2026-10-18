# Staging Item Status Feedback

## Metadata

- Created: 2026-10-18
- Readiness: draft
- Category: interaction reference
- Source project: griddo2-claude
- Source topic: Phase 35 Task 176A checkpoint (`docs/issues/Issues_Phase_35.md`, mi-14)
- Source prototype: n/a
- Tags: staging, operation-status, status-icon, modal, toast, node-card, bit-card
- Dependencies: `2026-04-28-toast-feedback-placement`, `2026-07-14-cross-surface-text-capacity-and-overflow`

## Summary

Staging shows operation state as a one-line sentence inside the affected Node
card or Bit row (`DP-VQ06-STAGING`). On an 80px Node card that sentence fits
only a few characters (`Retur…`), so the message the user needs is not
readable. The user's direction is to replace the in-card sentence with a small
status icon on the item, a stronger item look while a problem lasts, and a
modal that explains the state and offers actions. Failures that leave no item
behind go to toast.

This entry is a direction, not a decision for implementation. It replaces parts
of `DP-VQ06-STAGING`, so promoting it needs a new user decision on that DP.

## Direction (user, 2026-10-18)

- Three base status icons; more are discussed later only if needed:
  - loader: `pending` and `reconciling` (work in progress)
  - `?`: `unknown` (the outcome is not known)
  - `!`: failure and integrity states (for example `source-unresolved`)
- An item in a lasting problem state changes its card look and shows the icon
  at the top left. Activating it opens a modal with the explanation and the
  available actions (resync, delete, edit, move).
- A failure whose item disappears (a rejected, conflicting or not-applied Stage
  removes its projection) has no card to mark, so it is shown as a toast.

## Constraints found in review (advisory, 2026-10-18)

- `pending` usually ends within about 50ms. A loader shown at once flashes on
  every Stage, which is the kind of flicker MI-15 removed. Show it only after a
  display delay. The delay only postpones presentation and never decides
  success (CLAUDE.md Architecture 6).
- Do not signal by colour alone (WCAG 1.4.1): pair the card emphasis with the
  icon and text in the modal. Red already means destructive in the app, so
  prefer an accent border or tint to a full red background.
- The card body is a drag handle. Make the icon a focusable button that opens
  the modal, so click and keyboard use do not compete with drag activation.
- Modal actions map to existing commands only: resync = reconcile, delete =
  Unstage or confirmed orphan cleanup. A candidate has no content of its own,
  and a type change requires a return to Breakdown first, so edit and move
  become "return to Breakdown, then edit or move".
- Under reduced motion the loader is a static icon.

## Conflicts with current canon

`DP-VQ06-STAGING` (DESIGN_TOKENS "Approved Staging attached-status
realization") fixes the in-card status line and its copy, a static alert band
below `Staging`, "no stack/history/rail/toast/dialog", and no spinner or timer.
The SPEC Durable Staging post-terminal presentation hold (2026-10-18) keeps the
in-card line through the hold. Promotion amends both, together with the Staging
recipe and the theme realizations that style the line.

## Current state

Phase 35 Task 176A (user, 2026-10-18, mi-14) removes the in-card line for
pending and a hold from pending: the Stage projection shows the candidate's
icon and title, and the pending sentence is announced only through the Staging
live region. Unknown and reconciling keep the line, ellipsized inside the card
by one shared CSS rule, and integrity slots and the alert band are unchanged.
This topic replaces those remaining lines and the alert band.
