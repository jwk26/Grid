# First-Run Grid Tour

## Metadata

- Created: 2026-10-31
- Readiness: draft
- Category: feature reference
- Source project: GridDO
- Source topic: Task 248 visual check (Phase 50); [Grid DnD notes, Item 3](../2026-06-02-grid-dnd-preview-and-drop-targeting/NOTES.md)
- Source prototype: n/a
- Tags: onboarding, tour, first-run, coachmark, spotlight, breadcrumb, dnd, discoverability
- Dependencies: Task 249 (no reserved breadcrumb cells); the demo seed `DP-SAAS-02` (Task 237); the Grid DnD topic if it ships first

## Summary

A short guide shown the first time a user uses the service. It opens with a
modal that explains the Grid in a few steps (with `Skip` and `Next`), then walks
through the real screen: each step dims the rest of the page, puts a focus ring
on one live control and shows a short text beside it. The user's style
reference is Notion's first-run guide; references are view-only, so the look is
built from GridDO's own tokens and themes, not copied.

## Origin

In the Task 248 check (2026-10-31) the user removed the drag-time signal that
marked every ancestor breadcrumb segment as a drop target, because it read as
noise, and moved teaching that interaction here. Only the segment under the
pointer keeps a light hover-level signal (SPEC F24, DESIGN_TOKENS FB-13); the
tour teaches that the drop exists, it does not replace that per-drop signal.

## Direction

- **Two parts.** (1) An intro modal: a few cards, `Skip` on every card, `Next`
  and `Back`, a step indicator, `Done` on the last. (2) A spotlight walk on the
  live screen: the page is dimmed and blurred except the target, which gets a
  focus ring, with a short text callout next to it and the same `Skip` / `Next`.
- **First run only.** Shown once; it can be reopened later from a help entry
  (place to decide).
- **Candidate steps** (to be chosen): the Grid and its levels (Node → Bit →
  Chunk); adding an item; moving an item by drag; the sidebar Home button and
  the breadcrumb reveal; dropping an item on a breadcrumb segment to move it to
  that ancestor; edit mode; the Inbox and Triage; Calendar; Search.

## Open Questions

- **Where "seen" is stored.** Per account (a database field and a write
  function — SaaS-lane work with RLS and cross-account tests) or per device (a
  device preference in `localStorage`, allowed by Architecture Rule 1, but it
  shows again on every new browser). A guest who later signs in should not see
  it twice.
- **What "first use" means.** A new guest starts with the demo seed
  (`DP-SAAS-02`), so "no Nodes yet" no longer marks a first visit; the existing
  ghost-placeholder onboarding (SPEC §Route `/`, `onboarding-hints.tsx`) may be
  unreachable and should be reconciled with the tour.
- **Spotlight on a live, reactive screen.** The target can move, scroll,
  re-render or be hidden (the breadcrumb is hidden by default and must be
  revealed for its step); the overlay must follow the target's rect and survive
  resizes. Whether clicks reach the target during a step, or the tour only
  shows.
- **Teaching a drag.** A drag cannot be shown with a static ring: an animated
  demo, a "try it" step that waits for a real drag, or text only.
- **Layering and `Esc`.** The tour is a dialog layer: it sits in the `Esc`
  layer order (SPEC §Breadcrumb reveal and Home button) and above the
  breadcrumb, the sidebar and toasts.
- **Accessibility.** Focus is trapped in the modal and the callout, steps are
  announced, the dimmed page is inert during a step, and reduced motion shows
  no movement.
- **Themes.** The modal, the dim, the ring and the callout in the four themes,
  light and dark (theme stage or its own pass).
- **Narrow windows.** Below 1024px (S42 (4)) the tour may be skipped or reduced.

## Notes

- Likely size: medium. The intro modal is small; the spotlight walk, the "seen"
  storage (if per account) and the theme pass carry the cost.
- Timing: after Task 249, and after the Grid DnD topic if that changes how a
  drag looks, so the tour shows the final interactions.
