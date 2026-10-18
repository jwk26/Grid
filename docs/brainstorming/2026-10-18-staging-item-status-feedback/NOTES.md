# Staging Item Status Feedback — Notes

## Open planning questions

- Loader display delay: its length, and whether `reconciling` (started by the
  user or the app after `unknown`) shows the loader at once.
- Which states change the card look: only `?`/`!`, or the loader too.
- Per state, which modal actions are available, and their copy.
- Whether Bit rows, which have room for a short line, keep a line beside the
  icon or use the icon alone, and whether Node and Bit stay consistent.
- Toast placement and lifetime for Staging failures, decided with
  `2026-04-28-toast-feedback-placement`.
- Screen-reader announcements: the current live sentence stays, or moves to the
  toast and modal.

## Origin

Raised at the Phase 35 Task 176A checkpoint (2026-10-18). The neumorphism Node
card's Unstage line overflowed the 80px card (mi-14). The user proposed
removing the in-card message in favour of icon + modal. The advisory review
kept the line for Phase 35, because removing it now would leave the Stage
projection and integrity cards as bare icons and drop the unknown signal until
a replacement lands.
