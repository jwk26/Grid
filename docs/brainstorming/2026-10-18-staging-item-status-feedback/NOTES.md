# Inbox Item Status Feedback — Notes

## Session brief (2026-10-21)

Written by the planning (orchestrator) session for a fresh Opus session
(effort high) that settles the feedback system. The user starts it with one
line that points here.

### Goal

Settle, with the user, how GridDO reports the state and the result of what
happens, and bring this topic's `DECISION.md` to `Readiness: code-ready` so a
later `/craft-docs` can promote it. This topic absorbs
`2026-04-28-toast-feedback-placement`. Brainstorming only: no production code
and no canonical-document edits.

Deadline: before SaaS Phase 47 starts. Phase 47 builds the SaaS loading,
connection and failure states by these rules
(`2026-10-21-saas-conversion` S39).

### Setup (done by the orchestrator session)

- Worktree `/Users/jwk/Documents/grid-feedback`, branch `docs/feedback-system`,
  created from `docs/saas-conversion` at `28eeb08`, not from `origin/main`: the
  SaaS decisions are inputs here, and that branch already edited the metadata
  of this topic and of the toast topic. Merge order: the SaaS docs branch
  first. If `docs/saas-conversion` reaches `main` before this branch closes,
  merge `origin/main` into this branch before `/craft-docs`.
- The two entries `2026-10-20-app-shell-theme-coverage` and
  `2026-10-20-command-palette-default-behavior` were moved here from the main
  worktree, where they were untracked. They are not part of this discussion
  (theme stage and later); they only ride on this branch into `main`.

### Inputs

- `CLAUDE.md`, `docs/brainstorming/readme.md`.
- This topic's `DECISION.md` and the sections below; the toast topic's
  `DECISION.md`.
- `2026-10-21-saas-conversion/DECISION.md`: S09, S15, S16, S23, S26–S28, S39
  and S40 (on this branch).
- `docs/DESIGN_TOKENS.md` "Approved Add/Unstage success realization"
  (`DP-VQ02`) and "Approved Staging attached-status realization"
  (`DP-VQ06-STAGING`); `docs/SPEC.md` Durable Staging post-terminal
  presentation hold; the Breakdown, Staging and Newly/Undo recipes in
  `docs/recipes/`.
- `docs/issues/Issues_Phase_35.md` (mi-14, MI-14, MI-15, MI-21) and the
  matching rows in `docs/issues/Issues_Deferred.md`.
- The current app: `src/app/providers.tsx` (`<Toaster richColors
  position="bottom-right" />`) and the existing `toast(` call sites (about 18:
  grid full, deadline update failure, Trash restore/delete results, drag
  rejections).
- For look ideas only: the Paper entry on `prototype/default-theme`
  (`2026-10-21-default-theme/DECISION.md`, "Status icons" and "Toast"). Theme
  looks are decided in the theme stage, not here.

### Scope

1. One feedback layer table: item level (Inbox status icon and tooltip),
   app level (loading screen, connection indicator), transient (toast) and
   blocking (load failure, guest creation failure). For each event: its layer,
   copy owner, timing (display delay), and screen-reader behavior.
2. Inbox item status: the open planning questions below, plus Phase 35 MI-21
   (drop the reserved success slot of the Breakdown row; a minimum width for
   the Staging Nodes zone).
3. Toast: when to use it (the toast topic's criteria against SaaS S28), its
   position, grouping of bursts, duration and copy, and an audit of the
   existing call sites (keep, change or drop). The toast topic prefers a
   position near the Grid breadcrumb. The user confirmed on 2026-10-21 that
   "breadcrumb" in this discussion means only that position anchor: no new
   breadcrumb and no breadcrumb theme work here (that is
   `2026-10-20-app-shell-theme-coverage`, theme stage). The breadcrumb's
   measured size sets the blocked Grid cells (`runBreadcrumbZoneMigration`,
   SaaS S11), so anything attached to it must not change that size.
4. Where the SaaS states appear: the connection indicator (S27), the loading
   and load-failure screens (S26), the offline write-attempt toast (S27) and
   the session-expiry fallback (S16). Their look stays semantic-token only
   (S40).
5. Phase 35 MI-14: whether and where the last selected Scratch persists across
   reload. Advisory recommendation: device-local in
   `triage-preferences-store` (S11 keeps device preferences in browser
   storage), falling back to the first Scratch when the saved one is gone.

### Procedure

1. Ask in rounds of at most four AskUserQuestion questions, each with options
   and a recommendation. The user is a frontend developer with weak
   fundamentals: explain with GridDO examples first, in plain Korean.
2. Visual choices go on a served HTML option sheet with real renders and
   Korean explanations, not short text or ASCII previews. Render in the
   current default theme (`griddo`), and spot-check `retro-mac` and
   `neumorphism` (S40).
3. Rewrite this `DECISION.md` from "Direction" into a decisions table (user,
   date) and keep reasoning and rejected options in this file. Fold the toast
   topic's decisions in, and mark that topic
   `Status: merged into 2026-10-18-staging-item-status-feedback`.
4. When every blocking question is answered, set Readiness to `code-ready`,
   commit, and give the next step: `/craft-docs` with this topic in a fresh
   Opus session. That promotion may amend the SaaS Phase 47 tasks.

### Working rules

- Reply in Korean, as a senior-developer mentor; be direct about mistakes.
- At each checkpoint, give a plain-Korean, step-by-step "what to look at" list.
- End each decision request with "권장, 제안드린대로 진행할까요?".

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
