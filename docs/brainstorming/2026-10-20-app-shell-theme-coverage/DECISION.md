# App Shell Theme Coverage (Sidebar and Grid Breadcrumb)

## Metadata

- Created: 2026-10-20
- Readiness: draft
- Category: visual polish idea
- Source project: GridDO
- Source topic: n/a (user idea, planning session after the Phase 35 close)
- Source prototype: n/a
- Tags: sidebar, breadcrumb, app-shell, color-theme, theme-coverage
- Dependencies: the Phases 36–40 re-plan (Phase 35 MI-13), which fixes the final theme set

## Summary

Changing the color theme leaves the sidebar and the Grid breadcrumb looking the
same. Both follow the shared semantic color tokens only, with no theme-specific
surface, font or depth treatment, unlike the Grid Node card
(`.theme-node-card`) and the realized Inbox regions.

## Current state (checked on `main` `552b00a`)

- `src/components/layout/sidebar.tsx` and `src/components/layout/breadcrumbs.tsx`
  carry no `.theme-*` class, and `globals.css` has no per-theme sidebar or Grid
  breadcrumb rule. The only themed breadcrumb is the Explorer search result
  breadcrumb (`.explorer-search-breadcrumb`).
- Phase 35 Task 179 changed the neumorphism priority tokens, which also colour
  the sidebar Inbox badge. That is a token side effect, not a sidebar
  realization.

## Direction (user, 2026-10-20)

- The sidebar should change with the theme ("Sidebar 다듬기").
- The Grid breadcrumb should change with the theme.
- Not urgent; it comes after the higher-priority items of the re-plan.

## Notes for promotion

- CLAUDE.md Architecture 8: add shared semantic hooks (for example
  `.theme-sidebar`, `.theme-breadcrumb`) and style them per theme in CSS; no
  branching on theme id in components.
- Realize only the themes that remain after the MI-13 re-plan. The cheapest
  moment is inside each theme's own phase, as one more region, rather than a
  separate pass over every theme afterwards.
- Whether the theme prototypes show a sidebar or breadcrumb treatment is not
  checked yet.

## Open questions

- Does "Sidebar 다듬기" mean more than theme styling (items, layout, collapse
  behavior)?
- Does each theme phase own its sidebar and breadcrumb, or does one shell pass
  follow once the theme set is final?
