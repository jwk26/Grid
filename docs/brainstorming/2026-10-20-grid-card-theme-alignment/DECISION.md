# Grid and Inbox Node/Bit Cards per Theme

## Metadata

- Created: 2026-10-20
- Readiness: draft
- Category: visual direction
- Source project: GridDO
- Source topic: n/a (user idea, planning session after the Phase 35 close)
- Source prototype: n/a
- Tags: node-card, bit-card, staging, explorer, grid, color-theme, theme-stage
- Dependencies: `2026-10-17-theme-scope-replan` (theme stage); ISSUE-20-02 (`docs/issues/Issues_Phase_20.md`)

## Summary

On the Grid page the Node card follows each theme, but the Bit card has no
theme styling, so after a theme change all Bit cards look alike. The Inbox
Staging cards and the Grid cards also look different. The user wants each
theme to choose, per theme, whether the Grid and the Inbox share one card look
or keep their own.

## Current structure (checked on `main` `552b00a`)

- `node-card.tsx` (`NodeCard`) and `bit-card.tsx` (`BitCard`) are one component
  each, used on the Grid page (`grid-view.tsx`) and in the Inbox Grid
  Explorer (`hierarchy-explorer.tsx`). The Explorer adds per-theme rules
  through `data-card-presentation="inbox-explorer"`.
- The Inbox Staging Node card and Bit row are separate markup inside
  `staging-zone.tsx` (`.triage-staging__node`, `.triage-staging__bit`).
- `NodeCard` takes the theme variables through `.theme-node-card`
  (`--theme-card-bg`, `--theme-radius`, `--theme-shadow`, border, font).
  `BitCard` has no such hook and hard-codes its radius, border and shadow
  (ISSUE-20-02), so only colours change with the theme.
- The Grid Node card and the Staging Node card share one anatomy (a square,
  icon above, title below), so either look can be applied to the other with
  CSS only. The Grid Bit card carries content the Staging Bit row lacks (left
  parent-colour bar, priority and deadline, progress, the "Done?" overlay), so
  between them only the surface (background, border, radius, shadow, font)
  can be shared; the content stays.
- CLAUDE.md Architecture 8: components never branch on theme id, so a per-theme
  choice is made in theme CSS, not by rendering different components.

## Direction (user, 2026-10-20)

- Neumorphism: try the Staging Node card look on the Grid; Bits use the
  Staging Bit look.
- Retro Mac: the same trial.
- Claymorphism: compare with the Staging Node/Bit of its prototype
  (`griddo2-claude-themes2-3`); Bits use the Staging look; the current Grid
  Node card is used in the Inbox Staging Node section too.
- Paper (default): if its Inbox work produces a good card, use it on the Grid
  too. Paper has since decided that Staging uses the Grid cards and Explorer
  Bits use its Grid Bit card (`2026-10-21-default-theme`, J3).

## Notes for promotion

- Trials can be judged first with temporary CSS in the browser, as in
  Phase 35, before any task is planned.
- `BitCard` needs one theme hook (a shared class consuming the theme
  variables) before any theme can restyle it; that small markup change serves
  every theme.

## Open questions

- The outcome of each trial, per theme.
- Whether the Staging markup should later render `NodeCard` itself, or stay
  separate and be styled to match.
