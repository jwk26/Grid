# Inbox Item Status Feedback — Notes

## Open planning questions

- Loader display delay: its length, and whether `reconciling` (started by the
  user or the app after `unknown`) shows the loader at once.
- Which states change the item look: only `?`/`!`, or the loader too.
- Screen readers on success: with nothing visible, WCAG 4.1.3 asks for no
  announcement, but a screen-reader user adding a row keeps focus in the Add
  field and would get no confirmation. The advisory recommendation is to keep a
  polite, visually hidden `Added.` / `Returned to Breakdown.` / `Saved.`
  announcement; to be decided at promotion.
- Whether the inline editor's transient states (`Unsaved changes.`,
  `Saving…`) use the loader and tooltip or stay as text, given the 1024px
  Context room (MI-20).
- Exact tooltip precedence and copy on a card that is truncated, has a problem
  and has Undo at once.
- Where the compact action controls sit beside the icon on an 80px Node card.
- Whether Bit rows, which have room for a short line, keep a line beside the
  icon or use the icon alone, and whether Node and Bit stay consistent.

## Discarded alternatives

- Modal opened from the status icon, holding the explanation and actions
  (2026-10-18 direction). Replaced on 2026-10-19 by the tooltip: the user does
  not want a new surface. Actions stay as the existing compact controls; a
  tooltip cannot hold controls.
- Toast for failures whose item disappears (2026-10-18). Replaced by the
  existing Staging alert band, for the same reason.
- Visible success (`DP-VQ02` wash, `✓`, `Added.`), or a success check without
  text (advisory proposal, 2026-10-19). The user chose success as the default
  state with no visible signal.

## Origin

Raised at the Phase 35 Task 176A checkpoint (2026-10-18). The neumorphism Node
card's Unstage line overflowed the 80px card (mi-14). The user proposed
removing the in-card message in favour of icon + modal. The advisory review
kept the line for Phase 35, because removing it now would leave the Stage
projection and integrity cards as bare icons and drop the unknown signal until
a replacement lands.

Widened at the Phase 35 Task 179 Stage 4a checkpoint (2026-10-19). MI-21: at
1024px with the Pool open the shared Breakdown row grid reserves 160px for the
`DP-VQ02` success text and 152px for the actions, leaving the title 0px. The
user asked whether success needs text at all, extended the icon direction to
Breakdown rows and the Add field, replaced the modal with a hover/focus
tooltip, and then dropped visible success entirely.
