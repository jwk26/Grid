# Feedback System — Promotion Map (Promotion ②)

## Metadata

- Created: 2026-10-22
- Status: plan approved (user, 2026-10-22); canonical edits in progress
- Route: `/craft-docs` promotion route, branch `docs/feedback-system`, after
  `origin/main` (promotion ①, PR #55) was merged into it
- Sources: this topic's `DECISION.md` (F01–F33) within the SaaS S41 boundary
  of promotion ②, as amended by F33. `NOTES.md` is context only.
- Prototype sources: none. `option-sheets/` are the user's own reference and
  are not adopted, cited or compared (`NOTES.md`).
- Feedback lane (F33): Phase 49 (Tasks 241–244) waits for no phase and runs
  beside Phases 42–44; Phases 45 and 47 wait for it. Phase 50 (Tasks 245–250)
  waits for Phases 49 and 45 and runs beside Phases 46–48; it does not block
  launch and closes before the theme stage.

## Table of Contents

- [Boundary](#boundary)
- [Decision map](#decision-map)
- [Superseded rules](#superseded-rules)
- [Exclusions](#exclusions)
- [User answers](#user-answers-2026-10-22)
- [Phases 49 and 50](#phases-49-and-50)
- [Changes to existing phases](#changes-to-existing-phases)
- [Plan housekeeping](#plan-housekeeping)
- [Flow review round 1](#flow-review-round-1-user-2026-10-22)
- [Progress](#progress)

## Boundary

Promotion ① already wrote F02, F11, F13, F14, the F16 copy alignment and
F17–F20 into SPEC, DESIGN_TOKENS, CLAUDE.md Architecture 6 and Phases 47–48.
② writes everything else: F01, F03–F10, F12, F15, the F16 create-dialog change
and the dropped `Cell reserved by breadcrumb` toast, F21–F33, MI-13, MI-14,
MI-21, the theme-set reduction, the retirement of Phases 36–40 (Tasks
180–208) with the rebinding of their deferred items, and Phases 49–50. ② also
resolves the forward references ① left: the F03 loader (SPEC §Write feel group
3, DESIGN_TOKENS server-confirmed pending loader), the F15 status hues (the
connection badge) and the toast position (SPEC §Toasts). F33 amends ①'s
statements that the feedback lane closes before Phase 45 and that `DP-SAAS-01`
is decided in Task 225.

## Decision map

| Decisions | Target |
|---|---|
| F01, F04 | SPEC Inbox §Breakdown and §Durable Staging: success shows nothing on screen; the polite hidden `Added.` / `Returned to Breakdown.` / `Saved.` stays. DESIGN_TOKENS: retire `DP-VQ02` and the `breakdown-success-*` roles. Breakdown row recipe: supersession block |
| F02 | Already in SPEC Architecture 21 and CLAUDE.md Architecture 6 (①). SPEC Inbox: the loader appears after `DISPLAY_DELAY_MS` for pending and reconciling; reconciling keeps `?` and disables the pressed control at once |
| F03 | DESIGN_TOKENS new §Feedback Status Surfaces: status icon roles (loader, `?`, `!`), item emphasis, reduced motion; the role the SaaS group-3 loader reuses. SPEC Inbox status states |
| F05 | SPEC §Breakdown and Selected Scratch Context: inline editor states. DESIGN_TOKENS `DP-VQ04` amendment. Selected Scratch Context recipe |
| F06, F07, F09 | SPEC §Breakdown (Add and Delete reliability), §Durable Staging, §Actual-card Newly Placed and Undo. DESIGN_TOKENS amendments to `DP-VQ05`, `DP-VQ06-STAGING`, `DP-VQ10` and the Ordinary Finder Newly/Undo amendment. Recipes: Breakdown row, Staging, Newly/Undo |
| F08 | SPEC: the Placement plate, Archive completion card, Scratch Trash dialog and editor conflict view keep their sentences; the Staging alert band stays; Inbox status never toasts. No change to `DP-VQ08`, `DP-VQ09`, `DP-VQ11`, `DP-VQ12` |
| F10 | SPEC §Durable Staging layout; DESIGN_TOKENS Staging roles; Staging recipe |
| F12, F15 | SPEC §Toasts (replaces "stays where it is"); DESIGN_TOKENS §SaaS App-State Surfaces "Toast use" and new semantic status hue tokens (also the connection badge hues) |
| F16 (rest) | SPEC §Toasts "Existing calls" and §Feedback copy: the create dialogs show "no empty cell" in the dialog and keep the typed title at every level; `Cell reserved by breadcrumb` goes |
| F21 | SPEC Page Layouts sidebar icon order and §Account icon and modal; DESIGN_TOKENS Sidebar |
| F22–F25 | SPEC Page Layouts: a new "Breadcrumb reveal" subsection; the DnD line corrected (breadcrumb drops work in any mode, `breadcrumbs.tsx:31`) here and in §Phase 9 PRD Departures row 2; DESIGN_TOKENS Breadcrumbs and Motion Language |
| F26 | SCHEMA: `runBreadcrumbZoneMigration` leaves the `DataStore` interface; the Dexie `settings` store stays declared and unused until Phase 46, with no version bump; §Not ported: Phase 45 implements the method as a no-op (S43 (4), now the plan under F33) and Task 249 removes it. SPEC: no reserved cell |
| F27 | SPEC Scratch Pool "Selection and re-entry", Architecture 9 and §Inbox/Triage State Ownership: the last selected Scratch joins the two sorts as a device preference |
| F28 | CLAUDE.md Architecture 8 and SPEC Architecture 17: four themes (the code keeps eight until Task 241). DESIGN_TOKENS §Color Theme System and §Font Loading. Theme-system recipe and recipe index: supersession note, prototype rows kept as history. PLANNING_STANDARD §5.2 and §6. EXECUTION_PLAN retirement. `Issues_Deferred.md` rebinding |
| F29 | DESIGN_TOKENS §Feedback Status Surfaces theme scope; PLANNING_STANDARD §5.2 rows for Phases 49 and 50 |
| F30 | SPEC: development-only state switch, never shipped enabled; Task 243 creates it, Tasks 231 and 233 extend it |
| F31 | `.mcp.json` (`--isolated`); CLAUDE.md Test data line |
| F32 | `docs/WORKFLOW.md` stages 6 and 8; CLAUDE.md §Workflow |
| F33 | EXECUTION_PLAN lanes, Phase Index, Dependency Graph and Phases 45, 47, 49, 50; SPEC §Write feel (who checks the Inbox presentation under latency); CLAUDE.md Gates and Local Supabase lines; DESIGN_TOKENS `DP-SAAS-01` (decided in Task 242); SaaS DECISION S41 note |
| F34 | SCHEMA §Internal functions (cell picking), §Account preparation, §Not ported, database tests; SPEC §Breadcrumb reveal; Tasks 215, 219, 220, 227, 228, 229, 237, 249; PLANNING_STANDARD §6; SaaS S43 (4) note |
| MI-13, MI-14, MI-21, ISSUE-20-01 | `Issues_Deferred.md`: bound to Tasks 241 (MI-13, ISSUE-20-01), 250 (MI-14), 245 and 246 (MI-21) |
| P29-01, Phase 34 MI-6 | `Issues_Deferred.md`: rebound to the theme stage (`2026-10-17-theme-scope-replan`) |
| Phase 41 MI-2 | Closed as Dropped by the user (2026-10-22): the Terminal theme leaves |

## Superseded rules

- `DP-VQ02` row wash, `✓` and visible `Added.` / `Returned to Breakdown.`
  text, its 600ms wash and 1600ms visibility motion tokens, and the
  `breakdown-success-*` roles.
- `DP-VQ04` visible editor status lines (`Unsaved changes.`, `Saving…`,
  `Checking whether your changes were saved…`, `Saving before continuing…`,
  `Not saved.`, `Offline. Your draft is still here.`); the conflict view stays.
- `DP-VQ05` visible attached Add/Delete status text (becomes icon, emphasis and
  tooltip; `Retry Add` and `Check again` stay as controls).
- `DP-VQ06-STAGING` in-card status line for unknown and reconciling.
- `DP-VQ10` always-visible status rail and its text recovery actions on
  Explorer Newly rows (becomes the Undo slot status).
- The "no spinner" clauses in the Inbox/Triage Motion Boundary, the affected
  DP Motion rows, PLANNING_STANDARD §6 and NEG-11, for the F03 loader only: it
  rotates once shown after the 300ms delay and is static under reduced motion.
- SPEC Architecture 9: "only the two Inbox sort directions" persist (F27).
- SPEC Page Layouts and Phase 9 departures: "breadcrumb drops remain
  edit-mode-only" (text corrected to the code, F24).
- SPEC §Toasts: the Toaster stays `bottom-right` with `richColors` (F12, F15).
- SPEC §Write feel and EXECUTION_PLAN: the feedback lane closes before Phase
  45; Phase 47 checks the Inbox presentation the lane built (F33).
- DESIGN_TOKENS `DP-SAAS-01`: decided in Task 225 (F33: Task 242).
- The eight-theme set (F28), and Phases 36–40 with Tasks 180–208.

## Exclusions

- Phase 47–48 implementation of F02, F11, F13, F14, F16 copy alignment and
  F17–F20 (already planned by ①).
- Per-theme finishing of the new surfaces for `retro-mac` and `neumorphism`,
  and all of Paper and Claymorphism (theme stage, F29).
- `option-sheets/` (reference only).
- Recipe prototype citations for the four removed themes are not rewritten;
  a supersession note marks them as history.

## User answers (2026-10-22)

- **Q1, looks.** One decision task, Task 242, records `DP-FB-01` (status icons,
  item emphasis, status tooltip, Home button, breadcrumb reveal surface, toast
  status blend) and SaaS `DP-SAAS-01` from one rendered option sheet in
  `griddo`, with `retro-mac` and `neumorphism` spot-checks and shapes copied
  from the realized theme CSS. `DP-FB-01` blocks the visual parts of Tasks
  243–250; `DP-SAAS-01` keeps its blocks (Tasks 228, 234, 235, 236, 238).
  Task 225 shrinks to confirming the recorded `DP-SAAS-01` against the current
  SPEC surfaces.
- **Q2, loader motion.** The F03 loader rotates once shown after the 300ms
  delay and is static under reduced motion; the "no spinner" rules make an
  exception for this loader only.
- **Q3, Task 208.** Retired with Phases 36–40. The data and command checks are
  superseded by the SaaS database suites, which port the existing Dexie
  scenarios as answer keys (Tasks 216, 219–224); the visual matrices go to the
  theme stage, which sets its own gate. In the UF/AF/NEG and recipe
  inventories, `THEMES`/`CONFORM` expand only to accepted tasks and `208` is
  marked retired.
- **Q4, copy.** Drafted in SPEC, decided at SPEC approval.
- **Q5.** Phase 41 MI-2 closed as Dropped.
- **Lane split (F33).** Phase 49 and Phase 50 as below; Phase 50 waits for
  Phase 45 as well, so it starts on the Supabase client and its acceptance is
  checked there.
- **Task 234.** The account icon goes below Home if F21 has landed, otherwise
  at the top, and Phase 50 puts Home above it.

## Phases 49 and 50

Phase 49 — Feedback lane, part 1. Waits for: none (beside Phases 42–44).
Phases 45 and 47 wait for its Final Close. Task gates leave out
`pnpm test:db`; the phase close runs it (CLAUDE.md §Workflow).

| Task | Scope | Decisions |
|---|---|---|
| 241 | Reduce the theme set to four: picker, `COLOR_THEMES`, one shared id list for the no-flash script, CSS, Playfair and VT323 fonts, enumerating tests; a persisted removed id falls back to `griddo` | F28; MI-13, ISSUE-20-01 |
| 242 | Record `DP-FB-01` and `DP-SAAS-01` (decision only) | Q1, F33 |
| 243 | Shared status primitives: `DISPLAY_DELAY_MS`, the delayed rotating loader, `?`/`!` icons, emphasis, status tooltip, hidden success announcement helper, semantic status hue tokens, development state switch over the current Inbox states | F02, F03, F04, F09, F15 tokens, F30 |
| 244 | Toast position and colour (below the fixed breadcrumb until Task 248); create dialogs keep the title and show "no empty cell" | F12, F15, F16 (create dialog) |

Phase 50 — Feedback lane, part 2. Waits for: Phase 49 and Phase 45 (beside
Phases 46–48). Does not block launch; closes before the theme stage. After
Phase 45 its browser checks run on local Supabase; it never resets the
database or adds migrations, and seeds again after a SaaS-lane reset.

| Task | Scope | Decisions |
|---|---|---|
| 245 | Breakdown rows, Add field and inline editors: 22px status slot, Add field icon, editor states, success removed, editor offline toast | F01, F04–F07, MI-21 row part |
| 246 | Staging cards, rows and zone: corner and row-end icons, tooltip precedence over the Task 179A title tooltip, alert band kept, auto-fill Node grid | F06–F10, MI-21 Staging part |
| 247 | Explorer Newly rows: the Undo slot becomes the status slot | F07, F09 |
| 248 | Home button and breadcrumb reveal: sidebar order (Home above the account icon when present), triggers, hiding, Esc order, pointer pass-through, drag targets, deadline chip in the row, tab title; the toast stack follows the revealed breadcrumb | F12, F21–F25 |
| 249 | Remove the blocked breadcrumb zone and its toast: zone store and measurement, `isCellBlocked` guards, the `runBreadcrumbZoneMigration` no-op and interface method, `settings` use | F26, F16 (dropped toast) |
| 250 | Remember the last selected Scratch per device | F27, MI-14 |

Order: 241 → 242 → 243 → 244; 245 → 246 → 247 → 248 → 249; 250 any time in
Phase 50.

## Changes to existing phases

- Phases 36–40: retired as superseded (F28); Phase Index rows marked retired.
- Phase 45: waits for Phase 44 and Phase 49; implements
  `runBreadcrumbZoneMigration` as a no-op (S43 (4)).
- Task 225: confirms the recorded `DP-SAAS-01` (decision-only gate).
- Phase 47: waits for Phase 46 and Phase 49.
- Tasks 232–233: whichever of Task 233 and Task 245 lands second puts the
  editor's offline toast on the helper and the connection monitor.
- Task 234: the account icon below Home if F21 has landed, otherwise at the
  top; it checks the Inbox presentation that is on `main` under real latency.
- Lanes table, Dependency Graph, Phase Index, Readiness Summary, header, Next
  Numbers, writer register (feedback-lane rows get task numbers).

## Plan housekeeping

User requests (2026-10-22) applied with the plan:

- The `Execution plan mode: scaled` line goes back into the plan header; it
  was lost in the 2026-07-28 rewrite (`c9a2112`), which turned off the
  "read the Phase Index first" rule in CLAUDE.md and the run-phase and
  run-task skills.
- The Phase 36–40 task text, the Theme Realization Task Sets and the Future
  Theme Realization — Shared Binding Contracts (L1–L7) move to
  `docs/execution-plan/archive/phases-36-40-retired.md`; the plan keeps a stub.
  Links to them (PLANNING_STANDARD §5.1, the Phase 35 archive) point to the new
  file.
- `Issues_Deferred.md` gets one row: after ② merges, a separate document task
  replaces the Phase 23–30 bodies in the plan with archive links (Phase 24's
  body is 632 lines against an 87-line archive, so the two are compared and
  the anchor links checked first).

## Flow review round 1 (user, 2026-10-22)

The `expert` review found G1–G10 and W1–W7. User decisions:

- **G1 → F34.** Until Task 249 every server function that chooses a cell goes
  through `internal.pick_free_cell` and skips the cells the client passes in
  `p_reserved_cells` (validated only: inside the grid, at most six; default
  empty). The client passes the top-left 3×2 block; seed and fixture keep it
  free; Task 249 stops passing it with no SQL change.
- **G8 (2).** `Esc` closes one layer per press: the dialog layer (dialogs, the
  Bit popup, the palette, the Search overlay, the `+` entry surface, the
  Scratch modal), the deadline picker, the breadcrumb, then edit mode.
- **Tab titles (W5).** A Node's Grid `{title} – {app}`; `Inbox`, `Archive`,
  `Calendar`, `Trash` each `– {app}`; L0 the app name alone.

Mechanical repairs: G2 (top-left drop acceptance moved to Task 249), G3
(`triage-workspace.tsx` in Tasks 245–246; stale-invalidation notices stay in
the band), G4 (no Task 179A tooltip in Staging; Explorer keeps it), G5
(`pnpm test:db` at Phase 49 close only once `main` has it), G6 (`{target}` is
the receiving Grid's Node), G7 (theme-scoped search in Task 241), G8 (1)
(`Esc` suppresses re-reveal; focus to Home), G9 (retired-task references), G10
(three cross-document wordings), W1 (switch injects outcomes at the `DataStore`
boundary), W2 (one throttled-latency check in Task 247), W3 (second offline
source and register writers), W4 (focusable status icons), W6 (Home keeps the
departure guard), W7 (editor status positions in `DP-FB-01`); Key File Paths
and the DECISION summary (advisory).

## Progress

- [x] `DECISION.md` F31–F33 and this map (approved 2026-10-22)
- [x] `docs/SCHEMA.md` (approved 2026-10-22; F34 added after flow review round 1)
- [x] `docs/SPEC.md` (approved 2026-10-22; flow review round 1 repairs after)
- [x] `docs/DESIGN_TOKENS.md` and recipes (approved 2026-10-22; flow review round 1 repairs after)
- [x] `CLAUDE.md`, `docs/WORKFLOW.md`, `.mcp.json` (approved 2026-10-22)
- [ ] `docs/EXECUTION_PLAN.md`, `docs/PLANNING_STANDARD.md`, `docs/issues/Issues_Deferred.md`, archive moves
- [x] Flow review (`expert`) in `docs/reviews/phase-49-50-flow-review.md`, including the cross-lane flows: round 3 PASS (2026-10-22)
