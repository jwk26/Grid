# Claymorphism Polish and Realization

## Metadata

- Created: 2026-10-20
- Readiness: draft
- Category: visual direction
- Source project: GridDO
- Source topic: n/a (user idea, planning session after the Phase 35 close); formerly Phase 37 of the retired Phases 36–40 plan
- Source prototype: branch `griddo2-claude-themes2-3`, commit `4f39709`, route `/prototype/inbox-triage-claymorphism` (view-only reference)
- Tags: claymorphism, theme-stage, inbox, prototype
- Dependencies: `2026-10-17-theme-scope-replan` (theme stage), `2026-10-20-grid-card-theme-alignment`, `2026-10-18-staging-item-status-feedback`

## Summary

Claymorphism was once a candidate for removal. The user now keeps it for its
overall aesthetics and wants its UI shortcomings fixed before it is built.
"Shortcomings" means the UI only: the look and layout of the prototype, not
behavior.

## Direction (user, 2026-10-20)

- Keep Claymorphism in the final theme set (SaaS S40).
- Review the prototype's UI and improve what falls short, then realize it.
- Its Node/Bit cards follow the card direction in
  `2026-10-20-grid-card-theme-alignment`.

## Notes for promotion

- The prototype predates the feedback decisions: status lines become icons
  with tooltips, toasts move to the top-left, the breadcrumb hides behind a
  Home button, and new SaaS surfaces exist (account icon and modal,
  connection badge, loading, failure and expiry screens). The polish round
  has to show these, not the prototype's old states.
- The prototype is view-only: production never copies its code or assets
  (CLAUDE.md References).

## Open questions

- The list of UI shortcomings (collected in a prototype review session).
- Whether a new prototype round is needed before planning, or the polish is
  decided on a rendered option sheet.
