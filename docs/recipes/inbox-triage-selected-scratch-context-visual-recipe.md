# Inbox/Triage Selected Scratch Context — Visual Recipe

> Status: **Proposed — recipe-package user gate pending**
> Verification: **source-only except the exact-source `DP-VQ04` fixed-editor evidence recorded in `docs/verification/inbox-triage/task-138.md`**
> Production owner: `BreakdownPanel` Context surface (`LAND-BREAKDOWN`, `LAND-THEME`)

## Authority And Source Regions

- Product authority: [`DECISION.md`](../brainstorming/2026-06-25-inbox-triage-theme-surface-redesign/DECISION.md) lines 282–296 and 1149–1156.
- Approved boundary: [`PROMOTION_MAP.md`](../brainstorming/2026-06-25-inbox-triage-theme-surface-redesign/PROMOTION_MAP.md) §§10.1, 11.2, and 11.3.
- Design Source root: `/Users/jwk/Documents/griddo2-claude-themes2-3`.
- Context subregions are inside GridDO `page.tsx:1128-1380`; Tiny Desk `:1402-1550`; Neumorphism `:1040-1280`; Claymorphism `:943-1189`; Origami `:1402-1601`; Terminal `:944-1204`; Retro Mac `:992-1241`; Graphite `:1103-1350` at that root.
- Shared theme values: Design Source `src/app/themes.css:1-439`.

## Shared Adopted Contract

- The Context is a standalone signature section above rows, not heading metadata and not a row-like strip.
- Target roughly `2–2.5×` ordinary row height without breaking section ratios.
- Always include Scratch title, creation-date metadata under [SPEC — Scratch Pool and Context creation-date metadata](../SPEC.md#scratch-pool-and-context-creation-date-metadata), visible Scratch Edit entry, and Breakdown ASC/DESC sort. Remove duplicate selected title/meta from the Breakdown heading.
- Working and `Scratch complete` are distinct base presentations of the same semantic surface.
- Exact source copy is not product authority. Theme labels may express the selected working/complete meaning only after copy ownership is canonical.

## Decision-Prerequisite Boundary

- `VQ-04` — **resolved by `DP-VQ04` on 2026-08-09.** The user selected Choice A, the direct in-place Scratch-title and Breakdown-content editor system. This recipe owns the Context half specified below; Task 138 is the only realization edge and Task 137 remains headless.
- Context subset of `VQ-11` — **behavior/copy resolved by `DP-VQ11` on 2026-08-11; fixed-geometry compatibility C1 approved on 2026-09-01.** Preserve the editor, exact blocker copy, logical focus, fixed `104px` Context geometry except retro-mac `120.25px` under the Phase 34 / Task 167 P34-04 supplement, and fixed `9.5rem` action region with no detached completion surface. Task 160 uses the existing eyebrow/meta line for `open|dirty|saving|reconciling` and the existing source-bound issue-overlay status column for visual `offline|not_applied|conflict`.
- `D-LENS` — Neumorphism water-lens sort treatment is deferred and excluded.

### Phase 34 / Task 167 P34-04 Context-geometry supplement

The approved supplemental receipt (`Issues_Phase_34.Task_167.task-scope-context-geometry.json` in tag `archive/phase-34-codex`)
sets the retro-mac Selected Scratch Context alone to fixed `120.25px` outer
border-box height in every mounted working/complete view, editor, progress,
issue-overlay, completion-blocker, pending-intent, locked and departure state,
in light and dark. Other themes retain `104px`, all action reserves remain
`9.5rem`, and Breakdown row slots remain `48px`. View/edit/state transitions
within a theme keep the same geometry and content/action anchors. Theme changes
may change Context height without changing draft, logical focus or commands.
Exact DP/C1 copy, actions, caret, lifetime, source-bound status/overlay placement
and shared semantic tree remain unchanged. No state-driven auto-height or
clipped action/status/focus is permitted. Task167 must freshly verify the new
height and its following-content/scroll/theme-switch impact; historical
Task138/160 evidence verifies only its original geometry.

## `DP-VQ11` Scratch-Title Completion Blocker Compatibility

The prior prescription to append completion copy to a persistent visible editor
status region is superseded by the fixed `DP-VQ04` geometry. Approved C1
supersedes only that stale placement. For `open|dirty|saving|reconciling`,
replace only the existing Context eyebrow/meta value `Selected Scratch` with
static `context-completion-blocker-mark` plus the exact blocker sentence. For
visual `offline|not_applied|conflict`, append the matching exact blocker
sentence after the current editor-state sentence inside the existing
source-bound issue-overlay status column. Restore `Selected Scratch` without
moving focus when the blocker clears. Every other approved `DP-VQ11` copy,
behavior, action, focus, lifetime, theme, and prohibition remains unchanged.

### Preserved Copy And Behavior

The following exact sentences and headless snapshots remain Task 160 inputs:

| Task 137 blocker snapshot | Exact completion sentence | Preserved behavior |
|---|---|---|
| `open` or `dirty` | `Save or cancel the Scratch title edit to complete this Scratch.` | Keep the draft and existing Save/Cancel semantics; add no completion action |
| `saving` | `Saving the Scratch title before completion…` | Keep the focused draft read-only and preserve the save/pending-intent contract |
| `conflicted` | `Resolve the Scratch title conflict to complete this Scratch.` | Preserve `Use mine`, `Use latest`, and `Copy draft` without changing their meaning |
| `reconciling` | `Checking the Scratch title before completion…` | Keep the focused read-only field mounted and preserve mutation/dismiss locks |

The blocker never turns an editor action into Archive, never auto-saves,
auto-cancels, discards, or persists the draft, and never moves logical focus.
It lasts only while the matching synchronous blocker snapshot and otherwise-
eligible Scratch remain current.

### Task 160 Ownership — Approved C1 Compatibility

Task 160 must verify that the approved source-bound expression coexists with the
fixed `104px` Context geometry except retro-mac `120.25px` under the Phase 34 / Task 167 P34-04 supplement, title field and timestamp, fixed `9.5rem` action
region, Save/Cancel, saving/reconciling progress action, and issue-overlay
actions without expanding or displacing them. It must not add an ordinary
status row, another overlay, panel, completion action, toast, dialog, detached
surface, or adjacent fallback.

## `DP-VQ04` Approved Scratch-Title Inline Editor

The Scratch-title editor replaces only the title content inside the existing
Context signature surface. View and edit keep the same outer geometry, content
slot, creation metadata, and action anchor. The editor never opens a
Dialog/AlertDialog, popover, detached card, or global conflict surface.

### Fixed Structure And Entry

- Keep the Context at its existing fixed geometry in view and edit: `104px` except retro-mac `120.25px` under the Phase 34 / Task 167 P34-04 supplement. Reserve the
  existing fixed `9.5rem` action region; content and caret never enter it.
- Use one labelled, single-line `Scratch title` text input capped at 60
  characters. Do not render a textarea, resize affordance, vertical scrolling,
  or visible scrollbar.
- Long values use browser-managed caret-following horizontal movement. `Home`
  returns to `scrollLeft=0`; `End` exposes the terminal caret without
  overlapping the action region.
- Keep text-style `Save` and `Cancel` in the fixed action region. Dirty
  `Save` uses destructive/red emphasis. On entry, focus the field with the
  caret at the end without selecting or replacing text.
- Valid blur and explicit Save preserve Task 137 semantics; unchanged Save
  exits without a write. Cancel/Escape restores current truth and returns to
  the surviving Context Edit control. Theme activation and IME composition do
  not blur-save or discard.

### Fixed State Matrix

| State | Fixed visible treatment | Fixed action region |
|---|---|---|
| Pristine | Editable field with base title; no visible status line | Disabled text-style `Save`; `Cancel` |
| Dirty | Editable protected draft; no visible status line | Destructive/red text-style `Save`; `Cancel` |
| Validation | Empty field with in-field/attached `Enter a Scratch title.`; no status row | Disabled `Save`; `Cancel` |
| Saving | Same field retained read-only | Fixed `Saving…` progress action; optional pending-intent `Stay here` preserves existing semantics |
| Reconciling | Same field retained read-only | Fixed `Checking whether your changes were saved…` progress action; optional `Stay here` |
| Offline | Source-bound fixed issue overlay over blurred underlying content | `Retry save` remains disabled until reconnect; `Cancel` |
| Not applied | Source-bound fixed issue overlay over blurred underlying content | `Retry save`; `Cancel` |
| Conflict | Source-bound fixed issue overlay; no full `Latest version` / `Your draft` comparison regions | `Use mine`; `Use latest`; `Copy draft` |
| Lifecycle invalidated | Source-bound fixed issue overlay over blurred/protected draft content; no expanding recovery section | `Copy draft`; `Close` |

The issue overlay carries the existing authoritative status/recovery copy and
copy acknowledgement without changing outer geometry. Conflict preserves the
acknowledged-latest CAS rule, but does not expose expanding comparison regions.
`Copy draft` never changes state or focus.

### Focus, Lifetime, Motion, And Themes

- Validation, offline, not-applied, and conflict preserve Task 137 logical
  focus. Saving/reconciling retain the focused read-only field. Applied Save
  announces `Saved.` once and returns to surviving Edit unless a pending
  intent owns the destination.
- Lifecycle invalidation preserves review/copy semantics until `Close`, then
  uses the canonical active-Scratch/Pool focus fallback. Draft state remains
  mounted-page memory only.
- All changes are static and immediate. Reduced motion is identical; no
  spinner rotation, pulse, bounce, blink, scale, or layout transition.
- Every theme keeps one shared semantic tree and fixed view/edit/state geometry within that theme. Only the Phase 34 / Task 167 P34-04 supplement permits retro-mac Context height 120.25px in both modes, versus 104px for the other themes; theme activation preserves draft and logical focus without blur-save. Theme variables
  may style the field, text actions, progress action, blur, and source-bound
  overlay, but may not add a status row, comparison region, recovery expansion,
  or theme-specific behavior/copy branch.

### Phase 34 / Task 167 P34-07 Context-copy supplement

The approved copy receipt (`Issues_Phase_34.Task_167.task-scope-context-copy.json` in tag `archive/phase-34-codex`)
adopts retro-mac's exact `[ FOLDER DIALOG: INFO ]` left strip text and `[X]`
right decoration, centrally owned by `src/lib/copy/inbox-triage.ts`. Both are
aria-hidden, non-focusable, pointer-inert decoration with no close command or
state meaning. Preserve the16px strip and fixed120.25px Context.

**Phase 41 amendment (2026-10-15, DECISION H10):** the `[X]` is no longer
decoration. It becomes a real button that opens the Scratch Trash dialog for
the selected Scratch (see the Scratch Pool recipe's Phase 41 supplement). It
keeps its visible `[X]` text, position and size inside the 16px strip, gets
the accessible name `Move selected Scratch to Trash`, a visible focus ring
and the Retro Mac hover inversion, and is disabled while any Inbox operation
is pending. The left `[ FOLDER DIALOG: INFO ]` text stays aria-hidden
decoration, so the strip is no longer aria-hidden as a whole. Other themes
keep the strip hidden, so the button is not rendered visibly or focusable
there. No theme-ID branch. The button is unavailable while the completion
overlay or the `VQ-03` sheet makes the Breakdown inert, and disabled with the
Pool control's reasons otherwise. Its 16px-tall target is below the WCAG
2.5.8 24px minimum; the equivalent Pool row Trash control (28px) satisfies
the equivalent-control exception, so the strip geometry stays unchanged.

Retro-mac's sort label names the **next** order: currentDESC shows `OLD FIRST`,
click selectsASC/oldest-first; currentASC shows `NEW FIRST`, click selectsDESC/
newest-first. The active visible text is also the accessible button name.
Shared current-order and next-order DOM roles are selected only by central
theme CSS. Other7 themes retain visible ASC/DESC and existing canonical
current-order accessible names. No theme-ID behavior/copy branch or change
to comparator, sort persistence/lifetime, operation-lock disabling or commands.
The four new presentation strings alone are centralized; every DP/C1 blocker,
state, recovery and base-action copy remains unchanged.

Retain the existing common Context+Breakdown row scroll viewport. Context
co-scrolls with its rows for all themes; future L2 theme realization retains
this user-dispositioned structure when separately authorized. This is not a
sticky Context requirement or authority to execute a later task now. The
P34-04 geometry,152px action reserve and48px row remain intact.

### Common creation-date presentation and retro-mac decoration

Pool and Context use the common creation-date body defined only in [SPEC — Scratch Pool and Context creation-date metadata](../SPEC.md#scratch-pool-and-context-creation-date-metadata). Context view and Scratch-title editor reference that same contract; this recipe does not define a separate age calculation, cutoff, calendar format or refresh policy. This presentation contract continues through subsequent theme and phase realization.

Retro-mac Context alone visibly prepends `LAST_STAMP:` followed by one ASCII space to the common date body in both view and editor. Own `lastStampPrefix: "LAST_STAMP:"` centrally in `INBOX_TRIAGE_COPY.contextPresentation`. Mount the same `context-timestamp-prefix` and `context-timestamp-value` roles for every theme and select prefix visibility only through central theme CSS: default hidden, retro-mac Context visible. The prefix is aria-hidden, non-focusable, pointer-inert decoration, not a last-modification label or state announcement. Other themes' Context and every Pool expose only the common date body, with no visible or accessible `LAST_STAMP:` prefix. Keep one semantic tree; do not introduce a theme-ID behavior/copy branch or a CSS-generated copy string.

Preserve the existing working/complete and editor-state meanings, fixed geometry, DP-VQ02/03/04/05/11 and Task160 C1, actions/draft/caret/focus/recovery and centralized theme roles. The P34-09 execution receipt (`Issues_Phase_34.Task_167.task-scope-created-at.json` in tag `archive/phase-34-codex`) binds the first bounded implementation to Task167; the shared date rule and this presentation contract are not limited to that task. Visual disposition and task acceptance remain separate.

## Theme Realizations

### GridDO

- Observed source-only: a `min-h-[110px]` rounded signature plate uses a low primary gradient, primary border, and wide horizontal title/meta/actions layout. It declares a circular Edit control and a distinct sort control.
- Adopted fact: spacious product/ticket-like Context with technical primary accents is supported.
- Token implication: Context plate, eyebrow/meta, title, action cluster, and complete-state marker need semantic roles.

### Tiny Desk

- Observed source-only: a paper sheet declares `py-7`, left ruled margin, repeating top binding, blue horizontal rules, a red margin line, paper shadow, title/date, and Edit/sort controls. Complete source state adds a dog-ear/stamp treatment.
- Adopted fact: ruled-paper memo as the signature work surface is supported; exact source copy and stamp wording are not adopted.
- Token implication: paper sheet, rule/margin, binding, and complete stamp/dog-ear require Tiny Desk aliases.

### Neumorphism

- Observed source-only: a `min-h-[110px]` plate with `px-4 py-7`, `30px` radius, inset shadow, title/meta, circular raised controls, and source status marker is declared.
- Adopted fact: a broad inset identity plate with raised action controls is supported.
- Token implication: Context well and action button consume named inset/card shadows; the deferred lens is not inferred from the capsule sort.

### Claymorphism

- Observed source-only: a blue-tinted `p-7` Context uses `36px` radius, white border, compound inset/outer shadows, a top highlight, bold title/meta, Wand Edit, and rounded sort.
- Adopted fact: a large sculpted clay identity object is supported.
- Token implication: Context-specific clay surface/highlight/action roles should alias shared clay variables rather than preserve literals in JSX.

### Origami

- Observed source-only: `py-7` paper Context uses dashed/bottom borders, faceted metadata, fold/stamp geometry, mono title/time, and asymmetric Edit/sort controls.
- Adopted fact: a folded document/hang-tag signature surface is supported.
- Token implication: folded Context plate, dashed seam, and tag metadata need Origami aliases.

### Terminal

- Observed source-only: a `min-h-[110px]` black editor frame presents line-number-like metadata, title and stamp fields, a status line, Edit trigger, and sort control. The route also declares a pulsing completion stamp.
- Adopted fact: editor/buffer metadata framing is supported.
- Token implication: terminal Context editor frame, syntax-role text, status bar, and command actions should be variable-driven. Pulse is excluded.

### Retro Mac

- Observed source-only: a white double-border file window uses a black title strip, folder icon block, mono title/time, compact square Edit and sort controls, and a source complete stamp.
- Adopted fact: classic file-properties window grammar is supported.
- Token implication: double frame, title strip, folder identity, hard control, and complete stamp require Retro Mac aliases.

### Graphite

- Observed source-only: a wide editorial/poster Context uses a white or dark field, fine lines, mono timestamp, bold headline, square Edit, and a compact `⊕ ASC/DESC` sort control.
- Adopted fact: editorial metadata plate and drafting hierarchy are supported.
- Token implication: headline plate, timestamp, drafting rule, and action cluster need Graphite semantic roles.

## Exclusions And Verification

- Excluded: detached or Context-wide `VQ-11` summaries, `D-LENS`, no-op prototype handlers, review variants, route-local complete latch, repeated pulse/bounce, and source copy as canonical copy.
- Task 138 exact-source browser evidence verifies the fixed Context/editor geometry, 60-character caret-following boundary, representative light/dark themes, issue overlay, and view/edit stability at source tree `9375974b616ae6d6b891937ad04dc6a99d5fbb88`. Other Context recipe concerns, including complete/working presentation and Task 160 blocker compatibility, remain source-only or planned later.
