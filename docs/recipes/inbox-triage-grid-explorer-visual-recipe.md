# Inbox/Triage Grid Explorer — Visual Recipe

> Status: **Proposed — recipe-package user gate pending**
> Verification: **source-only; no rendered route/state was checked**
> Production owner: `HierarchyExplorer` plus dedicated future query/result owners (`LAND-EXPLORER`)

## Authority And Source Regions

- Product authority: [`DECISION.md`](../brainstorming/2026-06-25-inbox-triage-theme-surface-redesign/DECISION.md) lines 754–885.
- Approved boundary: [`PROMOTION_MAP.md`](../brainstorming/2026-06-25-inbox-triage-theme-surface-redesign/PROMOTION_MAP.md) §§10.1, 11.2, and 11.3.
- Design Source root: `/Users/jwk/Documents/griddo2-claude-themes2-3`.
- Explorer ranges: GridDO `page.tsx:1504-1774`; Tiny Desk `:1633-1909`; Neumorphism `:1404-1679`; Claymorphism `:1323-1687`; Origami `:1715-2035`; Terminal `:1329-1710`; Retro Mac `:1370-1756`; Graphite `:1439-1743` at that root.

## Shared Adopted Contract

- The sourced base body is four progressive columns with visible section chrome and full `Home`, `Level 1`, `Level 2`, `Level 3` labels. Do not expose `L1/L2/L3` or repeat selected titles below headers.
- Nodes and Bits retain native, shape-distinct rows/cards. Columns hide scrollbar chrome while preserving ordinary input scrolling.
- Supported target grammar includes idle, eligible, hovered eligible, unavailable/invalid, and base placement anchoring without changing path or column size.
- User-adopted 2026-10-17: the column-level target covers the whole column pane, full-label header included, per SPEC "Column drop region"; target-state styling paints that whole pane, and Node rows remain their own targets.
- User-adopted 2026-10-17 (Neumorphism only): entering or leaving a column or Node-row target changes its tint and inset depth over `--triage-pool-motion-duration` (background and box-shadow only, no transform or layout change); reduced motion makes it immediate. Other themes keep immediate target changes.
- Grid semantic/default name is `Grid Explorer`; Tiny Desk may show `Library Index`, Retro Mac `Finder`, and Terminal `GRID EXPLORER`.
- Source active-column search inputs and filtered columns are observations only and are superseded; they do not source the selected replacement search mode.

### User-selected shared consumer amendment — 2026-10-07

Task 169 user review adds this contract for all current/future Inbox/Triage
themes. The approved direction is distinct from pending product implementation,
fresh verification and task acceptance; historical DP receipts/evidence remain.

- Use one Explorer header row, left native icon/identity and right dedicated
  search control. Omit the persistent path/breadcrumb row and separate search
  toolbar. Preserve the internal path/selected chain, full Home/Level labels,
  column navigation/scroll, attached path status, result breadcrumbs and
  Placement destination.
- All ordinary and result Node/Bit glyphs read the actual record's stored
  `icon` through the existing mapping/fallback. A Grid icon edit in the same
  database updates that record projection in Explorer. Theme styling preserves
  identity; fixture/browser-profile isolation does not imply shared storage.
- Actual Finder/Explorer cards omit ordinary Grid options/Direct Archive and
  past-deadline Done?/Mark as done/Dismiss controls. Keep source-aware
  NEW/independent Undo/attached reason, ordinary Grid commands and Scratch Archive.
- Hover changes color only, without scale/translation/shadow/stacking lift.
  Rows are not drag sources: selectable Nodes use pointer, non-activating Bit
  rows default, never grab/grabbing. Keep actual controls' focus/cursor and
  Breakdown/Staging-to-Node drop targets.
- Overdue incomplete Bits keep readable title/deadline, a subdued state surface
  and small static accessibly named overdue mark; no overdue-only strike-through
  or unreadable blur. Completed Bits use muted title/strike-through plus static
  check. NEW/Undo/reason/focus remain unobscured. Use actual deadline/status/
  priority, without new completion/dismiss writes.
- User-adopted 2026-10-17 (MI-10): Explorer Bit rows never run the ordinary Grid urgency blink; near-deadline Bits stay static and the deadline text carries the urgency.
- Realize through shared roles and centralized theme values. The selected
  retro-mac compact-row values are not dimensions for every later theme.

### User-selected ordinary Node/Bit distinction — 2026-10-08

- **Common current/future L4 structure:** ordinary Explorer columns omit the
  inter-type divider and visible `Bits` heading. Preserve full level labels,
  Node-before-Bit and within-type order, actual item identities/keys/refs and
  existing semantic behavior. Bit-only columns, including Level 3, start at
  the normal item inset without reserved subsection-header space.
- **Retro-mac exterior only:** the user-selected generated image, SHA256
  `b26b3d428e22c6958a0e0c2747fe228f5ff3dce4b40da6ee25fcfaac94869ac5`,
  supersedes the earlier plain ordinary-card exterior target: Nodes have a
  small folder tab, light surface, double outline, slightly larger plain row
  and actual stored-icon glyph, trailing chevron and Light selected black
  inversion; Bits have a rectangular outline, subdued gray surface, thin
  single outline and smaller plain row containing title/priority/due date.
  Preserve appropriate Dark contrast and distinct selection/focus/reveal/drop
  feedback. Other-theme card exteriors do not inherit these values.
- Keep actual shared NodeCard/BitCard and explicit Inbox Explorer presentation.
  Use central roles for the exact Q01-approved actual elements. Decorative
  folder-outline layers are noninteractive and do not clip content, NEW,
  independent Undo/reason or focus. Metadata/progress where supplied and
  retained production states expand naturally; a metadata Bit can be taller
  than a plain Node. Preserve stored glyphs, current hover/cursor/static-state
  contracts and operation lifetimes. Ordinary Grid/Staging and replacement
  search retain their existing composition and consumer behavior.
- This image is user-selected design authority only, not pinned-prototype
  delivery or implementation verification. Record its exact source identity
  with Task169 evidence (`task-169.md` in tag `archive/phase-34-codex`); do not
  copy its raster into product assets or derive product dimensions/numerical
  fidelity thresholds from enlarged pixels. The pinned source still governs
  unaffected surfaces; existing DP-VQ06-EXPLORER/07/10, receipts, failed and
  unverified evidence, Q02/Q05 and broader D-CARD deferrals remain unchanged.

## Decision-Prerequisite Boundary

- `VQ-07` — **resolved by `DP-VQ07` Choice A on 2026-08-10.** The dedicated full-hierarchy search keeps Explorer chrome and replaces only the four-column body with the approved fixed-input, state-line, flat-result realization below. After Task 114 checkpoint acceptance, Task 151 consumes the complete search body and Task 158 consumes only its search-result Undo integration after that task's other prerequisites. The source/current active-column search, global Search overlay, and ordinary columns remain prohibited fallbacks.
- Explorer subset of `VQ-06` — **resolved by `DP-VQ06-EXPLORER` on 2026-08-10.** The user selected Choice A, the affected-column-attached remote/path status family specified below. Task 150 is its only realization edge. Pool and Staging remain governed by their own receipts; `DP-VQ07` is now separately owned by the approved search contract above and supplies no fallback authority for this status family.

## `DP-VQ07` Approved Dedicated Replacement Search Body

`DP-VQ07` Choice A keeps the theme-native Explorer section header and identity
but replaces the complete four-column body while search is open. It introduces
no page overlay, dialog, detached panel, fifth column, active-column filter, or
global Search dependency. Search behavior and hierarchy truth remain owned by
SPEC and the Task 135 query lifecycle; this section owns only the direct
replacement body's content, placement, focus, lifetime, motion, and themes.

The user-selected 2026-10-07 amendment above supersedes only the former
body-top input placement: the one input/close control belongs to the single
header's right-hand slot. The four-column body still becomes one fixed state
line plus one scrolling flat list. Whole-hierarchy behavior and all original
copy/status/reveal/close/interruption/Undo meanings remain.

### Placement And Result Grammar

- `Search Explorer` remains the accessible Explorer-header entry action.
  Opening it replaces only the body and moves focus to the one input fixed
  in the right-hand header slot, with no duplicate input in the body.
  Its placeholder is `Search all Nodes and Bits`; its in-input `X` is named
  `Clear and close Explorer search`. Clear/close returns focus to the logical
  header entry control.
- One non-scrolling state line sits directly below the header. The remaining
  body is one internally scrolling flat result list; the page, Explorer shell,
  and hidden ordinary columns do not scroll in response to result focus.
- Each result uses its existing Node or Bit icon/color identity, a visible
  `Node` or `Bit` type label, title, and full breadcrumb. It is not a drag
  source. Same-type results with the same title and breadcrumb add exact
  `Duplicate {index} of {count}` text in stable hierarchy order; no ID,
  coordinate, hidden root, or synthetic path is exposed.
- Initial loading uses the state line and an empty result viewport. Stale
  refresh retains the last successful rows, result scroll, and focus beneath
  the updating line. Error retains those rows when available; `Try again`
  starts a new read without changing the query or hierarchy path.

### Exact Search Copy And Actions

| State | Exact visible copy | Action |
|---|---|---|
| Empty query / pre-search | `Search the entire Grid Explorer.` | None |
| Initial loading | `Searching Grid Explorer…` | None |
| Stale refresh | `Updating results…` | None |
| No results | `No results for “{query}”.` | None |
| Request failure | `Search couldn’t be updated.` | `Try again` |
| Selection-time stale/removed/hidden/unreachable | `That item is no longer available. Results were updated.` | None |
| Valid result reveal after columns return | `Revealed “{title}” in {breadcrumb}.` | None |
| Search-result Undo success | `Restored “{title}” to {source}.` | None |

The input `X` and Escape are clear-and-close actions, not query retries. Query
editing clears an obsolete no-results, failure, stale-selection, reveal, or
Undo-success sentence when the next request begins. The Undo control itself is
exact `Undo`; its eligibility, unavailable reason, pending/failure/conflict
copy, and semantic treatment come only from later `DP-VQ10` and Tasks 156–157,
not from this receipt.

### Focus, Selection, Reveal, And Close

- Arrow Down/Up moves one result at a time without selecting it; Enter or a
  pointer activation first revalidates that exact item and ancestor chain.
  Scrolling follows only the active result. Ordinary Tab order reaches the
  input, `Try again` when present, and eligible result `Undo` controls without
  turning result rows into drag sources.
- `Try again` starts the next request and moves focus to the input, because
  the control ends with the error state.
- A current reachable result clears active and interrupted search state,
  restores the four columns, reconstructs the real ancestor chain inside
  Inbox, and focuses the revealed Node or Bit row. The actual row receives a
  static non-color reveal marker, and the reveal sentence is a polite atomic
  status directly below the Explorer header.
- A stale, removed, hidden, or unreachable result performs no path, selection,
  reveal, route, or focus jump. Search remains open, refreshes in place, shows
  the stale-selection sentence, and returns focus to the input when the
  previously focused row no longer exists.
- Input `X` or Escape clears active/interrupted query, results, result scroll,
  and reveal, restores ordinary columns, and focuses `Search Explorer`. Inbox
  route exit clears the same state under route focus ownership. Scratch switch
  preserves current search/results/scroll/path/reveal and never forces focus.
- DnD start is the only interruption close: restore ordinary columns and drop
  affordances immediately while preserving query/results/scroll as mounted-
  page interrupted state. Drop and Cancel never reopen it. The next explicit
  `Search Explorer` activation restores that state and focuses the input;
  result selection, input `X`, Escape, route exit, or reload clears it.

### Undo Placement And Deterministic Focus

- When later `DP-VQ10` makes a matching result eligible, its trailing `Undo`
  action composes inside the result row without replacing the title,
  breadcrumb, duplicate text, or row activation target. Activating it never
  bubbles into reveal and never makes the result draggable.
- Pending, unknown, and failure retain the result and query. Terminal success
  retains query and scroll, removes only the undone result, shows the exact
  restoration sentence in the fixed state line, and focuses the next
  surviving result at the removed row's position; if none exists, focus the
  input. There is no previous-result fallback.

### Lifetime, Accessibility, And Motion

- Pre-search lasts while the query is empty. Initial loading, stale refresh,
  and error last only for their owning request state; error also ends on query
  edit, `Try again`, clear/close, route exit, or reload. Stale-selection and
  Undo-success lines last until query edit/new request, another status, result
  selection, clear/close, route exit, or reload. No state uses a timer.
- Reveal lasts until another item selection, path change, DnD start, search
  restart, route exit, or reload. It is event-ended and never auto-dismissed.
- The input exposes its search name; the result set exposes result count and
  Node/Bit type text; loading/stale use `aria-busy`; each changed state sentence
  is announced once without announcing every row, rerender, theme change, or
  scroll movement.
- Body replacement, status changes, result removal, column restoration,
  reveal, scrolling, and focus handoff are immediate and static. No fade,
  slide, scale, skeleton shimmer, spinner, pulse, ping, bounce, blink, flicker,
  or layout-transition animation is allowed. Reduced motion uses identical
  geometry, copy, controls, focus, timing, and lifetime.

### Eight-Theme Mapping

Every theme preserves the same semantic tree, copy, result order, duplicate
text, actions, focus, lifetime, close/interruption behavior, and static motion.
Only Explorer-owned role realization changes:

| Theme | Exact realization mapping |
|---|---|
| GridDO | Technical header search field, restrained body state rule, compact typed result rows, and canonical primary/action/focus roles. |
| Tiny Desk | Library-index search tab, catalog-paper status slip, and stacked catalog result cards inside the existing Explorer body. |
| Neumorphism | Inset search field and state trough with shallow raised result rows inside the existing column-shadow family. |
| Claymorphism | Soft sculpted search field, shape-preserving status ribbon, and tactile typed result tiles without motion-led state. |
| Origami | Folded search sheet, seam-attached state strip, and cut-paper result rows with no animated fold or ghost column. |
| Terminal | Variable-driven command-line search, static status record, and text-led result records with no fixed JSX color, spinner, or blink. |
| Retro Mac | Finder header search control, 1-bit body system status line, and hard bordered result list; no new window, dialog, or ghost pane. |
| Graphite | Editorial index field, strengthened-rule status caption, and restrained monochrome result rows with precise focus outline. |

Task 151 alone realizes the complete search body, copy, reveal, close matrix,
tests, styles, and verification over Task 135. Task 158 may later compose only
the search-result Undo slice after Tasks 156–157 and `DP-VQ10`; ordinary-card
Undo Task 156 remains independent. Neither edge changes query/ranking behavior,
global Search, ordinary Explorer base/status semantics, placement commands,
Pool/Staging surfaces, or product code in Task 114.

## `DP-VQ06-EXPLORER` Approved Affected-Column Status Family

`DP-VQ06-EXPLORER` places each remote-arrival count beside its affected full
column label and places the one current remote/path status directly below the
surviving destination column label, outside that column's scrolling rows. It
never creates an Explorer-wide rail, ghost column, toast, dialog, event
history, Search-mode substitute, or Pool/Staging presentation.

### Placement, Count, And Anchoring

- Each visible `Home`, `Level 1`, `Level 2`, or `Level 3` heading may own one
  separate actionable remote-insertion indicator: exact `1 new` or `{count}
  new`, accessible as `Show new in {full level label}`. Counts are independent
  per currently open column and never replace or abbreviate the full label.
- The count includes only ordinary remote insertions first appearing in that
  visible column after the mounted-page snapshot or its last clear. Initial
  hydration, local placement, and an existing item merely moving between
  columns do not increment it.
- Ordinary insertion preserves Explorer path, selection, focus, and the
  column's first visible stable ID plus viewport offset. It never restores a
  raw `scrollTop`, jumps to the insertion, or changes the path automatically.
- Invalid-path status belongs to the nearest surviving destination column. It
  sits immediately below that column's full label and above its internally
  scrolling rows. Removed suffix columns leave no status placeholder, sibling,
  ghost row, ghost column, or duplicated label.
- Selected Bit disappearance keeps the valid parent path and places status in
  its current parent column. A stale placement status uses the same surviving
  destination-column strip. Only one path/fallback strip exists; a later
  fallback replaces it without creating history.

### Exact Copy And Actions

| State | Exact visible copy | Action |
|---|---|---|
| Remote insertion | `1 new` or `{count} new` | `Show new in {Home|Level 1|Level 2|Level 3}` |
| Deleted/unreachable selected path item | `“{title}” is no longer available. Returned to {destination}.` | `Dismiss` |
| Archived selected path item | `“{title}” was archived. Returned to {destination}.` | `Dismiss` |
| Moved selected path item | `“{title}” moved elsewhere. Returned to {destination}.` | `Dismiss` |
| Invalid suffix without safe item title | `This path is no longer available. Returned to {destination}.` | `Dismiss` |
| Selected Bit disappearance | `“{title}” is no longer available. Selection cleared.` | `Dismiss` |
| Stale placement | `Placement closed because this Explorer path changed.` | `Dismiss` |

`{destination}` is the visible full label/title of the exact nearest valid
ancestor, or `Home`; it never names a sibling, ghost, removed suffix, or
abbreviated level. `Show new` and `Dismiss` are the only actions. This status
family exposes no Retry, restore, reveal, Search, navigation, sibling-choice,
undo, or mutation action.

### Path Fallback, Focus, And Accessibility

- Ordinary remote insertion and count/status appearance never move focus or
  selection. Each changed visible path sentence is announced once through one
  polite atomic status without announcing rerender, sort, viewport movement,
  theme change, or elapsed time.
- If an ancestor is deleted, archived, unreachable, or moved, remove only the
  invalid suffix, keep the longest valid prefix, and close stale placement
  without a write. Never select a sibling or manufacture a ghost substitute.
- After authoritative fallback, focus the surviving nearest-valid ancestor row
  when it is present and focusable in the destination column; otherwise focus
  that destination column's full-label heading. The status strip itself does
  not take focus.
- Selected Bit disappearance clears only that Bit selection/reveal, preserves
  the valid parent path, and focuses the surviving parent row when present,
  otherwise its current column heading.
- Activating `Show new in {level}` revalidates that column's remote insertions,
  scrolls only that column to top, clears its count, and focuses the first
  surviving new row without selecting it or changing path. If none survives,
  focus the full-label heading. Merely observing the authoritative top clears
  the count without moving focus.
- Activating `Dismiss` removes only the path strip and returns focus to the
  surviving fallback ancestor/parent row, otherwise the destination column
  heading. It never reverses fallback or reopens placement.

### Dismissal, Lifetime, And Motion

- Per-column new counts last until their own `Show new`, authoritative top
  observation, that column closes/path changes, or Inbox route exit/reload.
  Scratch, theme, and light/dark changes preserve counts for columns that stay
  open. There is no timer or shared cross-column count.
- A fallback/selection/stale-placement strip lasts until `Dismiss`, the next
  authoritative fallback, an explicit user path selection/change, or Inbox
  route exit/reload. Scratch, theme, and light/dark changes preserve it. It
  never auto-dismisses.
- Indicator, strip, column removal, fallback, scroll anchoring, scroll request,
  and focus handoff are immediate. There is no fade, slide, scale, spinner,
  pulse, ping, bounce, blink, flicker, or layout-transition animation. Reduced
  motion uses identical geometry, copy, controls, timing, focus, and lifetime.

### Eight-Theme Mapping

All themes preserve the same full labels, semantic tree, count meaning, exact
copy, fallback, actions, focus, lifetime, anchoring, and static motion. Only
Explorer-owned role realization changes:

| Theme | Exact realization mapping |
|---|---|
| GridDO | Compact column-label count chip and restrained technical strip using canonical border, muted, primary, text, action, and focus roles. |
| Tiny Desk | Library-index count tab and catalog-paper status slip attached below the destination column label. |
| Neumorphism | Named raised count control and shallow inset column notice within the existing column-shadow family. |
| Claymorphism | Puffy non-color marker and shape-preserving soft ribbon attached to the destination clay column. |
| Origami | Folded count tab and seam-attached paper strip with no ghost fold or repeated motion. |
| Terminal | Variable-driven text count command and static destination-column status record; no fixed JSX color or blink. |
| Retro Mac | Hard counter control and in-pane 1-bit system message below the full label; no new window or ghost pane. |
| Graphite | Compact editorial index and strengthened-rule column note with restrained monochrome action. |

Task 150 alone consumes this realization in `HierarchyExplorer`, app-session
Explorer state, centralized copy, tests, theme CSS, and its verification
artifact over Tasks 128 and 134. It changes no path/fallback semantics,
stable-ID/offset algorithm, product mutation, Pool/Staging family, placement
implementation, or `DP-VQ07` search body.

## Theme Realizations

### GridDO

- Observed source-only: Explorer header is `h-12`; four columns use `grid-cols-4 gap-[1px] bg-border p-[1px]`; column headers use full labels and bordered separators; target states declare subtle primary and unavailable overlays.
- Adopted fact: crisp product grid, technical headers, and primary target cues are supported.
- Token implication: Explorer header, column, level label, Node row, Bit row, eligible target, and invalid target need semantic roles.

### Tiny Desk

- Observed source-only: header reads `Library Index`; columns use paper backgrounds and thin warm separators; level labels use brown mono/serif treatment; invalid targets declare a paper warning card.
- Adopted fact: library index cards and paper columns are supported.
- Token implication: index header, paper column, level tab, and warning-paper roles need Tiny Desk aliases.

### Neumorphism

- Observed source-only: header reads `Grid Explorer`; columns are four separated `20px` soft plates with inset/raised shadow variants; full labels are uppercase tracked text; invalid overlays use a soft inset status card.
- Adopted fact: discrete soft columns with shadow-led hierarchy are supported.
- Token implication: column plate, selected level, card rows, and invalid inset status consume existing shadow variables; rendered depth is unverified.

### Claymorphism

- Observed source-only: `h-16` header and padded four-column body consume `--clay-hierarchy-bg`; columns use rounded clay surfaces, bold full-level labels, and shape-led Node/Bit rows. Invalid source overlays use a rounded clay alert.
- Adopted fact: large tactile columns and bold level identity are supported.
- Token implication: hierarchy well, column object, level label, type rows, and invalid state need clay aliases.

### Origami

- Observed source-only: dashed paper header and one-pixel four-column seams use folded/faceted paper; level labels are small uppercase mono; a dashed cut-paper warning is declared.
- Adopted fact: folded columns, dashed seams, and paper warnings are supported.
- Token implication: paper column/seam/label/warning roles are valid; keyboard-grab bar and pulses are excluded.

### Terminal

- Observed source-only: header reads `GRID EXPLORER`; four console columns are separated by foreground-tinted lines; level labels and target statuses are text-led; invalid state declares a red-framed console error.
- Adopted fact: framed console columns with explicit textual status are supported.
- Token implication: terminal column/label/target/error roles must be variable-driven and include non-color cues.

### Retro Mac

- Observed source-only: striped title bar reads `Finder`; four columns are one-pixel black-separated white panes; full level names are declared; invalid state uses dither plus a double-border system message.
- Adopted fact: Finder panes, striped chrome, dithered unavailable state, and hard system alert are supported.
- Token implication: pane, level header, dither state, and alert roles need Retro Mac aliases.

### Graphite

- Observed source-only: `h-14` header reads `Grid Explorer`; columns use fine `0.5px`/one-pixel grayscale rules, bold full labels, restrained rows, and a monochrome bordered invalid message.
- Adopted fact: precise drafting columns and restrained monochrome targeting are supported.
- Token implication: graphite header/column/rule/label/invalid roles should consume semantic grayscale variables.

## Exclusions And Verification

- Excluded from the base/status source observations: active-column search behavior/visual body, global Search fallback, route-local filtering, mock placement, keyboard-grab UI, repeated pulse/blink, abbreviated labels, and Pool/Staging realization. `DP-VQ07` supplies only the separately specified replacement search body; it does not promote any excluded source behavior.
- No four-column composition, column clipping, scroll behavior, invalid distinction, card density, focus-visible state, search/reveal realization, contrast, or responsive behavior was rendered or verified; the Task 114 decision is canonical specification, not rendered evidence.
