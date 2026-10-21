# Theme Stage — Scope and Index

## Metadata

- Created: 2026-10-17
- Updated: 2026-10-22
- Readiness: draft
- Category: planning index
- Source project: GridDO
- Source topic: Phase 35 MI-13 (`docs/issues/Issues_Phase_35.md`; user direction 2026-10-17); the post-Phase-35 planning session (2026-10-20/22)
- Source prototype: n/a
- Tags: themes, theme-stage, mi-13, paper, claymorphism, retro-mac, neumorphism, cards, sidebar, breadcrumb
- Dependencies: `2026-10-21-saas-conversion` (S39–S41: the theme stage follows the SaaS launch), `2026-10-18-staging-item-status-feedback` (F28 reduction, F29 theme scope)

## Summary

This entry collects everything the theme stage owns, so nothing from the
original Phases 36–40 plan or the planning session is lost while the SaaS and
feedback lanes run first. It is an index: each item keeps its own entry, and a
theme-stage planning session turns this into a code-ready decision later.

## Settled elsewhere

- Final theme set: `paper`, `retro-mac`, `neumorphism`, `claymorphism`
  (SaaS S40). `paper` replaces `griddo` as the default.
- `tiny-desk`, `origami`, `terminal` and `graphite` are removed early, as the
  first task of the feedback lane, and Phases 36–40 (Tasks 180–208) are
  retired (feedback F28).
- New SaaS and feedback surfaces are built on semantic tokens; their
  per-theme finishing is theme-stage work (SaaS S40, feedback F29).

## Theme-stage items

| Item | Entry | State |
|---|---|---|
| Paper, the new default theme | `2026-10-21-default-theme` (branch `prototype/default-theme`) | draft; prototype in progress |
| Grid and Inbox Node/Bit card look per theme | `2026-10-20-grid-card-theme-alignment` | draft |
| Claymorphism polish and realization | `2026-10-20-claymorphism-polish` | draft |
| Sidebar, Grid breadcrumb and Home button skins | `2026-10-20-app-shell-theme-coverage` | draft |
| `retro-mac` and `neumorphism` finishing of the new surfaces (status icons, toast blend, Home button, breadcrumb reveal, account icon and modal, connection badge, loading, failure and expiry screens) | this entry (from feedback F29 and SaaS S40) | to plan |
| Paper and Claymorphism versions of the same surfaces | the Paper and Claymorphism entries | to plan |
| Phase 29 P29-01 and Phase 34 MI-6 (Inbox visual fidelity, Retro Mac Explorer locked pane) | `docs/issues/Issues_Deferred.md` | rebound here by feedback F28 |

Not theme work, kept here only as a pointer: the Cmd+K palette
(`2026-10-20-command-palette-default-behavior`) can be planned any time after
the SaaS launch.

## Open questions

- Order inside the theme stage (for example Paper first, then the card
  alignment across themes, then Claymorphism).
- Whether each theme gets one phase covering all its surfaces, or one phase
  per surface across themes.
