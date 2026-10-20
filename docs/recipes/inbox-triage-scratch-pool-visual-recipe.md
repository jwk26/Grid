# Inbox/Triage Scratch Pool — Visual Recipe

> Status: **Proposed — recipe-package user gate pending**
> Verification: **source-only; no rendered route/state was checked**
> Production owner: `ScratchPool`, `useInbox`, and session-state owner (`LAND-POOL`, `LAND-SESSION`)

## Authority And Source Regions

- Product authority: [`DECISION.md`](../brainstorming/2026-06-25-inbox-triage-theme-surface-redesign/DECISION.md) lines 150–278.
- Approved boundary: [`PROMOTION_MAP.md`](../brainstorming/2026-06-25-inbox-triage-theme-surface-redesign/PROMOTION_MAP.md) §§10.1, 11.2, and 11.3.
- Design Source root: `/Users/jwk/Documents/griddo2-claude-themes2-3`.
- Pool regions: GridDO `page.tsx:998-1121`; Tiny Desk `:1271-1395`; Neumorphism `:887-1036`; Claymorphism `:807-936`; Origami `:1276-1398`; Terminal `:841-937`; Retro Mac `:853-985`; Graphite `:976-1096` in their respective Design Source route directories.
- Shared theme values: Design Source `src/app/themes.css:1-439`.

## Shared Adopted Contract

- Expanded Pool reads as one tools region above one list. Identity, all-active count, collapse, title search, and created-at sort belong together; search and sort share a row. Retro Mac alone puts them on two rows, search then sort, by the user's Task 166 Q02 disposition (2026-10-04); the semantic tree, order and meaning are unchanged.
- The header/collapsed count always means all active Scratches. Filtered result count is separate and only appears while searching.
- Expanded rows keep title and created-at metadata under [SPEC — Scratch Pool and Context creation-date metadata](../SPEC.md#scratch-pool-and-context-creation-date-metadata), shared with Context in every current and subsequent theme/phase. Collapsed controls are vertical in identity/count → toggle → switchers order, with accessible names and non-color-only selected distinction.
- Search and sort are absent from collapsed presentation, and no hidden filter is applied to compact switchers or total count.
- Scrollbar chrome is hidden while wheel, trackpad/touch, and keyboard scrolling remain.
- Pool labels observed as `Scratches` in Claymorphism and Origami are source facts only; the adopted semantic visible identity remains `Scratch Pool` because no alternate Pool name was selected.

## Decision-Prerequisite Boundary

- `VQ-01` — **resolved by `DP-VQ01` on 2026-08-09.** The user selected Choice A, the dedicated central blocking transition panel specified below. Task 141 is its only realization edge. Generic dialogs, Archive UI, Pool chrome, and any adjacent surface remain prohibited fallbacks.
- Pool subset of `VQ-06` — **resolved by `DP-VQ06-POOL` on 2026-08-10.** The user selected Choice A, the fixed Pool-local status band specified below. Task 144 is its only realization edge. Staging and Explorer retain their separate unresolved `VQ-06` decisions, and neither supplies fallback authority here.

## `DP-VQ06-POOL` Approved Fixed Status Band

`DP-VQ06-POOL` chooses one fixed, section-local status band directly below the
expanded Pool search/sort tools (two rows in Retro Mac) and outside the internally scrolling Scratch
list. It keeps state immediately visible without a disclosure panel, event
list, Escape-close path, toast, or Mark-reviewed state. The band never changes
Scratch selection and never borrows Staging or Explorer presentation.

### Placement, Count, And Compact Form

- Expanded order is identity/all-active count/collapse → search/sort row (Retro Mac: search row → sort row) →
  fixed status band when applicable → internally scrolling Scratch list.
  Status appearance may grow only this tools region; it never inserts a fake,
  proxy, placeholder, or pinned status row into the Scratch list.
- The identity/header count and collapsed count always equal all currently
  active Scratches. During a non-empty search, the band separately renders
  exact `{visible} of {total} Scratches`; neither number changes selection.
- The band has at most two simultaneous static lines: one search-context line
  and one Pool-activity line. It is not an event history. Remote/lifecycle
  events aggregate into the one current activity line by category.
- Collapsed mode continues to ignore the preserved search for switchers and
  total count, so it renders no hidden-selection line or filtered count. Beside
  the total it may render a literal `+{count}` unseen-arrival marker and a
  separate non-color lifecycle marker with accessible name `Pool updated
  elsewhere.` Activating the existing expand control reveals the full band;
  neither compact marker is a new control.

### Exact Copy And State Matrix

| State | Exact visible copy | Allowed action |
|---|---|---|
| Search count, selection visible | `{visible} of {total} Scratches` | None |
| Search count, selection hidden | `{visible} of {total} Scratches` and `Selected Scratch is hidden by this search.` | `Clear search` |
| One remote arrival | `1 new Scratch arrived.` | `Review new` |
| Multiple remote arrivals | `{count} new Scratches arrived.` | `Review new` |
| One non-selected external archive | `A Scratch was archived elsewhere.` | `Dismiss` |
| One non-selected external delete | `A Scratch was deleted elsewhere.` | `Dismiss` |
| One external restore | `A Scratch was restored.` | `Dismiss` |
| Multiple changes in one lifecycle category | `{count} Scratches were archived elsewhere.`, `{count} Scratches were deleted elsewhere.`, or `{count} Scratches were restored.` | `Dismiss` |
| Mixed unseen activity | `Pool updated elsewhere: {nonzero clauses}.` Clauses appear only when nonzero and in fixed `new`, `archived`, `deleted`, `restored` order, using `1 new`, `{count} new`, `1 archived`, `{count} archived`, `1 deleted`, `{count} deleted`, `1 restored`, or `{count} restored`. | `Review new` when a new-arrival clause exists; `Dismiss` when a lifecycle clause exists |

`Clear search`, `Review new`, and `Dismiss` are the only new actions. There is
no panel toggle, details/history action, Escape behavior, retry, undo,
Mark-reviewed action, automatic selection, or lifecycle mutation. Locally
created Scratches and the initial query snapshot do not increment remote
arrival counts.

### Selection, Lifecycle, Focus, And Accessibility

- A search-hidden selected Scratch remains selected and its Context remains
  active. `Clear search` clears only the Pool query, leaves focus in the search
  field, and makes the selected row ordinarily visible again. If a title/data
  change makes the selected row match without user action, the line clears
  without moving focus.
- `Review new` first revalidates unseen active arrivals under the current sort,
  clears the reviewed arrival count, scrolls the first surviving unseen row
  into view, and focuses that row without selecting it. If none survives,
  clear the count and move focus to the expanded Pool search field.
- `Dismiss` clears only accumulated non-selected lifecycle messages and moves
  focus to the expanded Pool search field. It never dismisses or alters an
  arrival count.
- An externally archived or deleted selected Scratch is not rendered as this
  ordinary activity line. Its row/all-active count update from authority and
  the already-approved `DP-VQ01` blocking transition immediately owns copy,
  actions, dismissal, and focus. Authoritative restore while that transition
  waits retains the `DP-VQ01` cancellation contract. This decision adds no
  duplicate Pool action or competing announcement.
- Remote arrival or a non-selected lifecycle update never moves focus or
  selection. Each newly changed visible activity sentence is announced once
  through one polite atomic status; rerender, sorting, collapsing/expanding,
  theme change, and elapsed time do not repeat it. The compact markers have
  accessible names and remain distinguishable without color.

### Dismissal, Lifetime, And Motion

- Hidden-selection and filtered-count presentation lasts exactly while the
  non-empty query and current data require it. It clears on query resolution,
  selection/lifecycle resolution, route exit, or reload; it never auto-dismisses.
- Remote-arrival counts and non-selected lifecycle aggregates are mounted
  Inbox-page state. Scratch selection, sort, collapse/expand, theme, and
  light/dark changes preserve them. `Review new` clears only arrivals;
  `Dismiss` clears only lifecycle aggregates; Inbox route exit or reload clears
  both. No timer or automatic dismissal exists.
- Every entry, replacement, clear, band-size change, marker change, scroll
  request, and focus handoff is immediate. There is no fade, slide, scale,
  spinner, pulse, ping, bounce, blink, flicker, or layout-transition animation.
  Reduced motion therefore uses identical geometry, copy, controls, timing,
  focus, and lifetime.

### Eight-Theme Mapping

All themes share one semantic tree, exact copy, line/action order, counts,
focus, lifetime, and static motion contract. Only Pool-owned role realization
changes:

| Theme | Exact realization mapping |
|---|---|
| GridDO | A restrained semantic band and compact marker using the canonical border, muted, primary, text, action, and focus roles. |
| Tiny Desk | A ruled-paper status strip directly below the wood tools, with stationery text/actions and a pin/bar-like compact marker. |
| Neumorphism | A shallow inset status well below the tools, named raised action treatment, and a raised compact marker within the existing shadow family. |
| Claymorphism | A shape-preserving soft inset ribbon, restrained raised text action, and puffy but non-color-only compact marker. |
| Origami | An attached folded-paper strip with seam-separated lines/actions and a small folded-tab compact marker. |
| Terminal | A variable-driven static bordered status line with bracketed text actions and a text/shape compact marker; no fixed JSX color or blink. |
| Retro Mac | An in-place 1-bit status pane below the FIND/tools row, hard text controls, and a hard-outline compact marker; no new window. |
| Graphite | An editorial caption band with strengthened rules, restrained monochrome text actions, and a concise index-like compact marker. |

Task 144 alone consumes this realization in `ScratchPool`, centralized core
English copy, Pool/copy tests, theme CSS, and its verification artifact. Tasks
128 and 130 remain the prerequisite lifetime/base owners. Task 144 does not
change selection, query/count meaning, persistence, repository truth,
`DP-VQ01`, or any Staging/Explorer behavior or presentation.

## `DP-VQ01` Approved External-Removal Transition

`DP-VQ01` chooses a dedicated central blocking panel for external archive or
delete of the selected Scratch. The panel is a new lifecycle surface, not a
restyled generic Dialog/AlertDialog and not an extension of Pool or Archive
chrome.

### Surface And Geometry

- Cover the Inbox workspace with an inert scrim and center one
  `role="alertdialog"`, `aria-modal="true"` panel. The stale Scratch remains
  visible only as non-interactive context behind the scrim.
- The panel width is `min(35rem, calc(100% - 2rem))`; its maximum height is
  `calc(100% - 2rem)`. Keep the title, destination, countdown, and actions
  fixed in the panel while only the draft list scrolls when necessary.
- Order content as lifecycle title → destination/countdown message → one
  4px linear countdown track → draft-copy region when present → action row.
  Use no lifecycle, pause/resume, or copy icon: exact text, progress geometry,
  and native focus treatment provide the non-color cues.
- The action row keeps `Move now` primary and `Pause` or `Resume` secondary.
  There is no Cancel action and Escape does not dismiss the transition.

### Exact Copy And State Matrix

| State | Exact visible copy |
|---|---|
| External archive title | `This Scratch was archived elsewhere` |
| External delete title | `This Scratch was deleted elsewhere` |
| Running with destination | `Moving to “{Scratch title}” in {seconds} seconds.` |
| Running with search-empty destination | `No matching Scratch is visible. Clearing the selection in {seconds} seconds.` |
| Running with Inbox empty | `No active Scratches remain. Opening the empty Inbox in {seconds} seconds.` |
| Paused with destination | `Movement paused. Destination: “{Scratch title}”.` |
| Paused with search-empty destination | `Movement paused. No matching Scratch is visible; the selection will clear.` |
| Paused with Inbox empty | `Movement paused. No active Scratches remain; the empty Inbox will open.` |
| Draft heading | `Copy drafts before moving` |
| Draft explanation | `These drafts exist only on this page and will not move with the Scratch.` |
| Add draft source label | `New Breakdown draft` |
| Scratch title draft source label | `Scratch title draft` |
| Row draft source label | `Breakdown draft` |
| Draft action / success status | `Copy full draft` / `Copied` |
| Controls | `Move now`, `Pause`, `Resume` |

Each draft card exposes its complete selectable text without truncation.
`Copied` replaces only that card's action label; it does not announce movement,
resume the countdown, clear the draft, or move focus. If clipboard copy is
rejected, keep `Copy full draft`, preserve focus, emit no false success, and
leave the complete selectable text available for manual copy.

### Timing, Destination, Restore, And Focus

- Run one `5000ms` linear countdown. Visible whole seconds update from 5 to 1,
  but the polite live region announces lifecycle, timing, and destination once
  on entry and announces a changed destination once, never once per tick.
- `Pause` freezes the exact remaining time and progress width. `Resume`
  continues from that remainder. `Move now` performs the current revalidated
  handoff immediately.
- When the displayed destination changes, a running countdown restarts at
  `5000ms`; a user-paused countdown remains paused and only its destination
  message updates. Revalidate lifecycle and destination immediately before
  every automatic or explicit move.
- A non-empty Add draft or dirty Scratch/row draft opens the panel paused.
  With no draft, initial focus is `Pause`; with drafts, initial focus is the
  first `Copy full draft`. Focus remains contained in the panel. Copy success
  preserves the triggering button's focus.
- Authoritative archive restore is the only transition cancellation. It closes
  the panel, retains the Scratch selection and page-memory drafts, and restores
  the pre-transition focus target when it still exists, otherwise the Scratch
  title Edit entry. Hard delete has no restore path.
- After a terminal move, focus the destination Scratch Context heading. For
  search-empty/no-selection focus the Pool results status; for Inbox empty
  focus the Inbox empty-state heading.

### Eight-Theme Mapping

All themes use the same semantic tree, exact copy, geometry, controls, timing,
and focus order. Only the recipe-owned role realization changes:

| Theme | Exact realization mapping |
|---|---|
| GridDO | Restrained semantic card and border, primary linear fill, muted draft cards, and the canonical focus ring. |
| Tiny Desk | Paper notice inside a wood frame; ruled draft slips, a ruled-line countdown track, and stationery buttons. |
| Neumorphism | Inset panel and countdown track with raised draft cards/actions; use the named inset/card shadow family. |
| Claymorphism | Sculpted panel, inset progress groove, raised clay actions, and shape-led draft separation. |
| Origami | Folded paper panel, seam-like countdown track, faceted draft sheets, and asymmetric folded controls. |
| Terminal | Variable-driven editor frame, block-style progress fill, framed draft records, and text command controls; no fixed terminal color in JSX. |
| Retro Mac | Striped title bar, 1-bit double frame, hard segmented progress, pane-separated drafts, and square controls. |
| Graphite | Editorial notice plate, fine-rule progress track, ruled draft blocks, and restrained monochrome actions. |

The role aliases and state tokens live in `docs/DESIGN_TOKENS.md`. Theme IDs
never branch product behavior, and light/dark changes never restart, pause,
resume, dismiss, or otherwise mutate the transition.

## Theme Realizations

### GridDO

- Observed source-only: expanded width is `w-72`, collapsed `w-16`; header uses a primary count badge; the search input is `h-7` with joined sort control, and the list hides scrollbar chrome. Selected rows declare a primary-tinted surface and compact collapsed markers.
- Adopted fact: clean dashboard tools, exact total count, title/time rows, and primary technical selection are supported.
- Token implication: Pool tool field, count badge, selected row, compact switcher, and hidden-scroll viewport need semantic roles.

### Tiny Desk

- Observed source-only: a dark wood header uses `#5d3a1a`/`#fdfcf0`; search is an inset dark-wood field, rows switch between light paper and wood, and the selected compact marker uses `#8b5e3c`. The route declares title/date rows and scrollbar hiding.
- Adopted fact: wood-header plus paper-list grammar and pin/bar-like compact selection are supported.
- Token implication: consume Tiny Desk base variables and add wood-header/paper-row aliases; literal copy and route state are not adopted.

### Neumorphism

- Observed source-only: width transitions between `w-72` and `w-16`; search uses `h-9 rounded-full` with `--theme-shadow-inset`; sort is a two-position `112px` inset capsule with a `50px` raised thumb; rows use `18px` radius and card/inset shadows.
- Adopted fact: inset tools and raised selected list/switcher surfaces are supported.
- Token implication: Pool search well, segmented sort, selected row, and compact indicator should consume the existing neumorphic shadow variants.
- User-adopted (Task 173, 2026-10-16): the sort capsule shows two fixed track labels, `OLD` then `NEW`, and the raised thumb sits under the current order (`OLD` = ASC/oldest first, `NEW` = DESC/newest first). The labels come from `INBOX_TRIAGE_COPY`, are visual only, and the control stays one toggle button whose accessible name and title keep the existing `sortOldestFirst`/`sortNewestFirst` copy. Other themes keep their current sort presentation, including Retro Mac's next-order badge.
- User-adopted motion (Task 173, 2026-10-16): the thumb slides between the two positions, unselected rows lift on hover, and collapsed switcher dots scale on hover, each as a transform transition timed by `--triage-pool-motion-duration`. All three are off when the OS asks for reduced motion. This adopts these three motions only; no source spring or other source motion is adopted.
- User-adopted interaction (Task 174, 2026-10-16): the Pool collapse toggles (header and collapsed rail) and the row Trash control respond like the Breakdown controls — on hover a 1px lift with stronger ink (Trash keeps its destructive hover ink), on press an inset-sm shadow, and back to the raised resting state on release — timed by `--triage-pool-motion-duration`, with the lift off under OS reduced motion. No other Pool motion is added.
- User-adopted motion (2026-10-17, Neumorphism): in the collapsed Pool, changing the selected Scratch moves the selected-switcher state as a transition timed by `--triage-pool-motion-duration` instead of an abrupt swap; it is off when the OS asks for reduced motion. The prototype's collapsed-switch motion is a view-only reference: Task 179 proposes the look within the theme's shadow family and the user's visual disposition sets it. Selection, focus and data context still change immediately; only the presentation animates.
- User-adopted motion (Task 179, 2026-10-19): Pool collapse/expand animates no width, because animating a width repaints every resized card's blur shadow each frame. The Pool and the main work area change size in one step; the main work area then scales on X from its right edge, from its previous width to its new one, so both edges stay in place (its content is briefly compressed on collapse and stretched on expand, about 1.35 at 1024px), and the Pool content eases in (opacity with a 12px slide), each timed by `--triage-pool-motion-duration`. The ratio comes from the shell's width and the Pool tokens; where typed division in `calc()` is unsupported, the main work area slides by the Pool's size difference instead. Nothing runs at page load or route entry, only after the first Pool toggle, and nothing runs when the OS asks for reduced motion. The keyframes and tokens are theme-neutral (`triage-main-scale-*`, `triage-main-slide-*`, `triage-pool-content-in`, `--triage-pool-motion-*`); another theme binds them only by its own adopted decision.

### Claymorphism

- Observed source-only: source heading text is `Scratches` (not adopted); search uses `h-9 rounded-2xl`, `--clay-search-bg`, and inset shadow; selected rows use `--clay-primary-*`, unselected rows use `--clay-unselected-*`; the list hides scrollbar chrome.
- Adopted fact: puffy count badge, soft search well, and shape/weight-based selected distinction are supported.
- Token implication: use clay primary/unselected roles while retaining canonical `Scratch Pool` semantics.

### Origami

- Observed source-only: source heading text is `Scratches` (not adopted); header is a paper gradient; search uses a white dashed field, asymmetric fold radius, and the sort control declares `▴ ASC`/`▾ DESC`; rows use asymmetric folded rectangles.
- Adopted fact: dashed paper controls and folded row/switcher geometry are supported.
- Token implication: paper field, dashed divider, folded selected row, and compact fold marker need theme aliases.

### Terminal

- Observed source-only: `TerminalPanel` title is `Scratch Pool` when expanded and `IN` when collapsed; search is a bordered transparent command field; sort is `/O:S ▲` or `/O:-S ▼`; rows are framed terminal records with title/time.
- Adopted fact: console command/record grammar is supported, while `IN` is only compact source copy and not a new semantic name.
- Token implication: terminal Pool states should consume foreground/border variables; no hard-coded green/orange is placed in product components.

### Retro Mac

- Observed source-only: striped Finder-style title bar reads `Scratch Pool`; `FIND:` precedes a `h-5` inverted-on-focus field; a classic column/button row exposes sort; rows use black/white selected inversion and a hard marker.
- Adopted fact: 1-bit window tools and non-color-only inversion/marker selection are supported.
- Token implication: striped chrome, field inversion, and hard switcher indicator belong in Retro Mac theme CSS.

### Graphite

- Observed source-only: a dark Pool surface reads `Scratch Pool`; `FLTR:` precedes a zinc field; sort displays a red `⊕` plus `ASC`/`DESC`; selected rows use white-on-dark and compact markers.
- Adopted fact: dense editorial tools, drafting labels, and monochrome selected rows are supported.
- Token implication: dark Pool header/list, graphite field, and selected marker require shared semantic roles.

## Phase 41 Scratch Trash Supplement (2026-10-15)

Authority: [`DECISION.md`](../brainstorming/2026-10-15-scratch-trash-hotfix/DECISION.md)
H04–H10 and SPEC [Scratch Pool](../SPEC.md#scratch-pool) Trash Scratch. This
is a user decision, not prototype evidence; no prototype source exists for it.

### Pool row Trash control

- Each expanded Pool row becomes a row container holding the existing
  selection button (title and creation date, unchanged) and a sibling Trash
  button at the far right, vertically centred. Row height stays `52px`; the
  title truncates before the control. A button is never nested in a button.
- The Trash button reuses the Breakdown row Trash control exactly: the
  `Trash2` icon at `h-3.5 w-3.5`, the `h-7 w-7` square hit area, the muted
  resting colour, the same hover/focus treatment (base: destructive tint;
  Retro Mac: the hover inversion used by `[data-triage-role="breakdown-row-action"]`)
  and the same disabled treatment. It has its own role,
  `data-triage-role="pool-row-trash-action"`; only the CSS is shared. It is
  visible without hover, like the Breakdown row.
- A disabled Trash control exposes its reason as an accessible description
  and tooltip:
  - placement open: `Finish or cancel placement to move a Scratch to Trash.`
  - unresolved-source candidate: `A staged item in this Scratch lost its source. Resolve it in Staging first.`
  - another operation pending: the existing operation-lock reason.
- Accessible name `Move "<Scratch title>" to Trash`; tooltip `Move to Trash`.
  Collapsed switchers have no Trash control.

### Scratch Trash dialog

- One shared `AlertDialog` (page-centred, portal) with the class
  `scratch-trash-dialog`, so theme CSS reaches it outside `.triage-shell`.
  Alert-dialog semantics; Cancel has initial focus.
- Exact copy, owned centrally by `src/lib/copy/inbox-triage.ts`:
  - Title: `Move Scratch to Trash?`
  - Body: `"<Scratch title>" moves to Trash. You can restore it from Trash for 30 days.` (title in bold)
  - Staged line, only when the count is above zero: `1 staged item will be removed from Staging.` / `<n> staged items will be removed from Staging.`
  - Draft line, only when that Scratch has an unsaved Add draft or open editor: `Your unsaved draft in this Scratch will be discarded.`
  - Actions: `Cancel`, `Move to Trash`
  - Pending: `Moving to Trash…`
  - Failure / not applied: `Couldn't move this Scratch to Trash.` with `Retry`
  - Unknown: `Checking whether this Scratch moved to Trash…` with `Check again`
  - Conflict: `This Scratch changed. Review and confirm again.`
  - Rejected (unresolved-source candidate): `A staged item in this Scratch lost its source. Resolve it in Staging first.` with Cancel only
  - Success announcement (polite live region): `Moved "<Scratch title>" to Trash.`
  - Undo unavailable reasons: `Its Scratch was moved to Trash.` and `Its Scratch was archived.`
- Dismissal: Cancel and Escape close the dialog only in the confirmation,
  failure, conflict and rejected states. While pending or reconciling they do nothing;
  unknown offers only `Check again`.
- `src/components/ui/alert-dialog.tsx` may gain one optional, non-breaking
  `overlayClassName` prop on `AlertDialogContent` so theme CSS can reach the
  scrim; every other app dialog keeps its current look. Retro Mac turns off
  the content's open/close animation through `.scratch-trash-dialog` and
  `.breakdown-delete-dialog` only.
- Base themes: the existing `AlertDialog` look used by Breakdown row Delete,
  with the destructive variant on `Move to Trash`, until each theme realizes
  the dialog in its own L1 binding (EXECUTION_PLAN L1 "Phase 41 surfaces").
- Retro Mac: the Retro Mac Archive alert family. Scrim `background / 0.7`
  with `1px` blur; card with a `4px` double foreground border, radius `0`,
  `6px 6px 0` foreground hard shadow, the Context font, `24px` padding, a
  `40px` column holding the square `2px`-bordered `!` mark, and text in the
  second column. Buttons are square with a hard border; Cancel, the default
  action, carries the default-button outline. No title bar, drag, inversion
  cycling or animation.
- Phases 35–39 realize the control and dialog for their own themes inside
  their Pool region; until then those themes use the base look.

## Exclusions And Verification

- Excluded: any Pool status outside `DP-VQ06-POOL`, fold-lock review control, source selection persistence, copied source strings outside the exact approved decision copy above, and any source behavior conflicting with the selected session lifecycle.
- No rendered selected/hidden/empty/collapsed state, count meaning, focus path, text fit, contrast, scrolling, or transition was verified. All exact class/color/size statements above are source declarations only.
