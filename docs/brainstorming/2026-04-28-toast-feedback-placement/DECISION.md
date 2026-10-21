# Toast Feedback Placement

## Metadata

- Status: merged into 2026-10-18-staging-item-status-feedback
- Created: 2026-04-28
- Readiness: draft
- Category: interaction reference
- Source project: griddo2-claude
- Source topic: migrated from out_of_phase ideation
- Source prototype: n/a
- Tags: toast, feedback, spatial-ui, notification, sonner
- Updated: 2026-10-21
- Dependencies: none
- Related: `2026-10-18-staging-item-status-feedback` (Inbox item status: icon and tooltip on the item; failures whose item disappears keep the Staging alert band, not toast); `2026-10-21-saas-conversion` (S26–S28: the SaaS conversion adds toasts for failed ordinary writes, grouped failure bursts and write attempts while offline through the existing Toaster; the connection indicator and loading screen are SaaS surfaces; the Toaster placement change stays with this topic)

## Merged (2026-10-21)

The feedback-system session folded this entry into
`2026-10-18-staging-item-status-feedback`, which is now authoritative for toast
use, position, grouping, duration, copy form, colour and the audit of the
existing calls (its F11–F16). Its criteria absorb the list below, and its
position (F12) keeps this entry's "near the breadcrumb" direction. What
follows is kept as history; promote the merged entry, not this one.

## Summary

Toast feedback should be used sparingly for meaningful system feedback, not for
every successful action.

GridDO is a spatial app. Feedback that appears detached from the workspace can
feel disconnected from the action that caused it. Earlier ideation preferred
toast placement near the breadcrumb because it reads as feedback tied to the
current workspace location.

The current app already uses `sonner` and registers a global `<Toaster>`. This
entry does not require Batch 1 implementation work; it preserves the interaction
direction for future refinement.

## Toast Use Criteria

Use toast only for events that materially affect user understanding:

- capture success where the destination is not visually obvious, e.g.
  "Captured to Inbox"
- invalid drops or blocked actions
- target grid full / no placement available
- layout or placement changed in a way that may need acknowledgement
- destructive or irreversible operation result when a dialog has already closed

Avoid toast for routine reversible interactions:

- canceling a modal
- canceling a staged candidate
- ordinary drag start/end
- source row returning to active display
- repetitive "success" confirmations that create noise

## Placement Direction

Preferred future direction: toast near the breadcrumb or current workspace
context, not visually detached at the center or top-right of the viewport.

Current implementation note: the existing app uses `sonner` with a global
Toaster. Batch 1 does not need to redesign toast placement. Future UI polish may
revisit the Toaster position and styling to better match GridDO's spatial
interaction model.

## Batch 1 Relevance

Batch 1 may reference this entry for feedback policy, but it should not promote
a toast redesign.

For Inbox/Triage v1:

- placement confirmation uses a dialog, not toast
- staged candidate removal does not need toast
- successful Scratch capture may use a lightweight "Captured to Inbox" toast
- invalid placement or full target grid may use error toast
