# Inbox/Triage Staging — Visual Recipe

> Status: **Proposed — recipe-package user gate pending**
> Verification: **source-only; no rendered route/state was checked**
> Production owner: `StagingZone`, candidate hook/repository, and `TriageDragToken` (`LAND-STAGING`)

## Authority And Source Regions

- Product authority: [`DECISION.md`](../brainstorming/2026-06-25-inbox-triage-theme-surface-redesign/DECISION.md) lines 523–750.
- Approved boundary: [`PROMOTION_MAP.md`](../brainstorming/2026-06-25-inbox-triage-theme-surface-redesign/PROMOTION_MAP.md) §§10.1, 11.2, and 11.3.
- Design Source root: `/Users/jwk/Documents/griddo2-claude-themes2-3`.
- Staging regions: GridDO `page.tsx:1381-1503`; Tiny Desk `:1551-1632`; Neumorphism `:1281-1403`; Claymorphism `:1190-1322`; Origami `:1602-1714`; Terminal `:1205-1328`; Retro Mac `:1242-1369`; Graphite `:1351-1438` at that root.

## Shared Adopted Contract

- Keep visible `Staging`, `Nodes`, and `Bits` identity. Nodes are a two-column grid of icon-centered cards; Bits are a vertical list of text rows. Shape/information, not color alone, carries type.
- User-adopted 2026-10-17: the Node and Bit drop targets each cover their whole subsection, heading included, per SPEC "Staging subsection drop region"; well-state styling paints that whole subsection.
- Preserve the selected Node/Bit `35/65` split, independent internal scroll containers, hidden scrollbar chrome, stable section height, and quiet empty state with no large placeholder cards.
- The candidate root is the full drag activator. Production retains the shared compact pointer-centered `TriageDragToken`; no internal handle, native snapshot, primary click, detail, or menu is adopted.
- During staged drag, the dedicated lower unstage overlay and Breakdown drop-back share one meaning. The overlay must not resize, blur, or move the lists.
- Both drop targets — the lower Remove-from-staging target and the Breakdown Return overlay — are realized for each theme in its own L3 binding (EXECUTION_PLAN L3 "Drop targets"), including themes whose prototype lacks the Return overlay; until then they keep the current look.
- Base pending, invalid, same-type neutral, opposite-type unavailable, and drop-back meanings remain semantic states. Source mock mutations do not define their lifecycle.
- The lower Remove-from-staging target remains a transient, static Unstage affordance with fixed list geometry. Other themes retain the dashed neutral idle surface and compatible-hover destructive border, restrained background and text/icon tokens. The exact Task168 P34-15 Retro Mac supplement below instead defines an opaque framed Remove surface with monochrome compatible-hover inversion and restrained destructive emphasis for compatible Breakdown Return. Cancellation, incompatible or invalidated sources and Node/Bit neutral, unavailable and invalid states receive no destructive emphasis. Both targets perform Unstage, not deletion.

## Decision-Prerequisite Boundary

- Staging subset of `VQ-06` — **resolved by `DP-VQ06-STAGING` on 2026-08-10.** The user selected Choice A, the candidate-attached operation status, subsection-local arrival indicator, and single Staging-local alert specified below. Task 147 is its only realization edge. Pool remains governed by `DP-VQ06-POOL`; Explorer retains its separate unresolved decision and supplies no fallback authority here.
- `D-CARD` — common Node/Bit eight-theme card redesign and later Staging reuse are deferred. Current recipe covers Staging shapes without preselecting that future redesign.

## `DP-VQ06-STAGING` Approved Attached Status Family

`DP-VQ06-STAGING` chooses three direct Staging-local anchors: operation status
inside the affected candidate shape, remote-arrival count/action beside the
owning subsection heading, and one terminal/integrity alert directly below the
visible `Staging` title. It introduces no global rail, toast, dialog, event
history, permanent Unstage/Retry button, or Pool/Explorer presentation.

### Placement And State Ownership

- A Stage pending projection uses the candidate's final Node-card or Bit-row
  shape in the destination subsection and reserves one fixed status line inside
  that candidate. Unstage keeps the durable candidate in its current position
  and uses the same attached line. Pending, unknown, and reconciling never
  replace the subsection, resize the Staging panel, or become draggable,
  unstageable, or placeable.
- `Nodes` and `Bits` use the presentation total defined in [SPEC — Durable Staging](../SPEC.md#durable-staging): zero or one renders the bare label and two or more renders the total prefix (`2 Nodes`, `3 Bits`). Include source-resolved durable candidates and visible pending, unknown, or reconciling Stage projections without counting the same candidate ID twice; Unstage adds no count and unresolved-source integrity slots are excluded. A separate actionable `1 new` / `{count} new` indicator sits beside only the affected subsection heading and is never added to the heading total. This presentation count changes no durable membership, success, lock, reconciliation or eligibility meaning and introduces no synthetic count lifetime across terminal-to-live-query delivery.
- The terminal/integrity alert is one static band immediately below the
  `Staging` title and above both subsection wells. A later failure replaces the
  earlier alert; no stack, queue, history, or rotating carousel is created.
- Neutral/invalid drag reasons attach to the currently affected Staging well or
  target only while that target is active. They never replace `Nodes`, `Bits`,
  Breakdown, or Explorer labels and clear on target exit or drag end.

### Exact Copy And Actions

| State | Exact visible copy | Action |
|---|---|---|
| Stage pending | `Staging “{title}”…` | None |
| Unstage pending | `Returning “{title}” to Breakdown…` | None |
| Stage unknown | `We couldn’t confirm whether “{title}” was staged.` | None; reconciliation begins before another drag |
| Stage reconciling | `Checking whether “{title}” was staged…` | None |
| Unstage unknown | `We couldn’t confirm whether “{title}” was returned.` | None; reconciliation begins before another drag |
| Unstage reconciling | `Checking whether “{title}” was returned…` | None |
| Stage `not_applied` | `“{title}” was not staged. Drag it again to retry.` | Alert `X`; retry is a new drag |
| Stage rejected | `“{title}” can’t be staged from its current source.` | Alert `X` |
| Stage conflict | `“{title}” changed elsewhere and was not staged.` | Alert `X` |
| Unstage `not_applied` | `“{title}” is still staged. Drag it back to Breakdown to retry.` | Alert `X`; retry is a new drag |
| Unstage rejected | `“{title}” can’t be returned from its current state.` | Alert `X` |
| Unstage conflict | `“{title}” changed elsewhere and remains staged.` | Alert `X` |
| Unresolved source | `Checking a staged {Node|Bit} source…` | None; this type-shaped integrity status is not a normal draggable candidate |
| Confirmed orphan cleanup | `A staged {Node|Bit} was removed because its source no longer exists.` | Alert `X`; no unavailable title snapshot is invented |
| Invalidated active drag | `“{title}” changed elsewhere. Drop canceled.` | Alert `X` after snapshot release and suppressed mutation |
| Invalidated open placement | `Placement closed because “{title}” changed elsewhere.` | Alert `X` |
| Same-type neutral target | `Already in Nodes.` or `Already in Bits.` | None; release is mutation-free cancel |
| Opposite-type target | `Return to Breakdown before changing type.` | None |
| Invalid source/target | `This item is no longer available.` | None |
| Remote arrival | `1 new` or `{count} new` | Activate the indicator; accessible action name is `Show new {Nodes|Bits}` |

The alert `X` has accessible name `Dismiss Staging alert` and closes only the
current alert. There is no visible or accessible `Retry`, `Retry Stage`,
`Retry Unstage`, permanent `Unstage`, details, undo, or mutation action in this
status family. Authoritative success uses the existing staged state or the
separately approved `DP-VQ02` Unstage success signal and creates no alert/toast.

### Focus, Dismissal, Lifetime, And Accessibility

- Status arrival, remote arrival/removal, source resolution, and alert
  replacement never steal focus. Pending/unknown/reconciling retain the
  operation's logical source/candidate focus and announce each newly entered
  sentence once through one polite atomic status.
- Activating `Show new {Nodes|Bits}` revalidates the subsection's remote
  arrivals, scrolls that subsection to top, clears its new count, and focuses
  the first surviving new candidate without starting a drag or mutation. If no
  new candidate survives, focus the affected subsection heading. Merely
  observing the authoritative top clears the count without moving focus.
- Remote counts exclude initial hydration, Scratch-switch loads, and local
  Stage. They preserve current scroll and focus on arrival and last until the
  indicator is activated, the authoritative top is observed, the Scratch
  changes, or the Inbox route exits/reloads.
- A terminal alert never auto-dismisses. It clears on its `X`, a new operation
  for that candidate, authoritative candidate disappearance, or Scratch
  switch; a later failure replaces it. When the user activates `X`, focus
  returns to the surviving candidate root, otherwise its related Breakdown
  source, otherwise the Staging heading.
- Unknown/reconciling attached status lasts until authoritative resolution.
  Terminal authority removes the line and projects the exact latest
  candidate/source state; it never uses the drag snapshot as authority.
- Confirmed orphan cleanup is announced once only after authoritative proof
  and atomic cleanup. Cache miss, offline, or delayed subscription remains the
  unresolved-source status and never uses orphan wording.

### Motion And Eight-Theme Mapping

Candidate-line entry/removal, indicator updates, alert entry/replacement/
dismissal, target reasons, scroll, and focus handoff are immediate. There is no
fade, slide, scale, spinner, pulse, ping, bounce, blink, flicker, or
layout-transition animation. Reduced motion uses identical geometry, copy,
controls, timing, focus, and lifetime.

User-adopted 2026-10-17 (Neumorphism only): when a drag enters or leaves a
Staging subsection target, its tint and inset depth change over the theme's
`--triage-pool-motion-duration` (background and box-shadow only, no fade-in,
transform or layout change); reduced motion makes it immediate. Every other
theme keeps the immediate change above.

| Theme | Exact realization mapping |
|---|---|
| GridDO | Candidate-attached technical rule, compact subsection count chip, restrained semantic alert band, and canonical action/focus roles. |
| Tiny Desk | Paper-object status annotation, stationery count tab, and ruled-paper notice below the Staging wood/cork title. |
| Neumorphism | Shallow inset candidate line, named raised count action, and wide inset alert well within the existing shadow family. |
| Claymorphism | Shape-preserving candidate seam, puffy non-color count, and soft sculpted alert ribbon. |
| Origami | Candidate fold-edge status, folded count tab, and attached alert strip with seam-separated action. |
| Terminal | Variable-driven inline record status, text count command, and static framed alert; no fixed JSX color or blink. |
| Retro Mac | In-place 1-bit candidate footer, hard counter control, and full-width alert pane below the title; no new window. |
| Graphite | Candidate editorial caption, compact index count, and strengthened-rule alert band with restrained monochrome action. |

Task 147 alone consumes this exact realization in Staging/Breakdown rendering,
centralized copy, tests, theme CSS, and its verification artifact over Tasks
145–146. It changes no repository command, operation lock, reconciliation,
candidate truth, Pool behavior, Explorer behavior, `DP-VQ02`, or `D-CARD`.

## Theme Realizations

### GridDO

- Observed source-only: source declares `grid-cols-[38fr_62fr]`, which is not adopted over the selected `35/65`; Nodes use a two-column grid, Bits a vertical list, both with hidden scrollbars. Drop zones use primary/invalid state classes, and a bottom return target is declared.
- Adopted fact: clean technical zones, compact type cards, and a direct return-to-Breakdown target are supported.
- Token implication: staging panel, Node well/card, Bit well/row, pending, neutral, invalid, and unstage-target roles are needed.

### Tiny Desk

- Observed source-only: cork/paper Staging uses centered brown `Nodes`/`Bits`, two-column paper objects versus text slips, and a wood-wastebasket return target. Internal list scrollbars are hidden.
- Adopted fact: corkboard regions, paper candidate shapes, and a wastebasket-like transient return affordance are supported.
- Token implication: cork zone, Node note, Bit slip, and unstage target need Tiny Desk aliases; destructive delete semantics are not implied.

### Neumorphism

- Observed source-only: source declares exact `grid-cols-[35fr_65fr]`; both wells use `20px` radius and inset shadows; candidates use raised card shadows. A rounded bottom return target is declared.
- Adopted fact: inset Node/Bit wells and raised candidate objects are supported.
- Token implication: reuse named inset/card shadows for zone/candidate roles; source internal handles are excluded.
- User-adopted (2026-10-17), a Neumorphism exception to the fixed list geometry above: while the lower Remove-from-staging target is mounted (a staged drag), the Staging columns' bottom padding grows from `16px` to `68px`, so both wells end above it instead of under it; the target sits `16px` inside the Staging section's left, right and bottom edges, `40px` tall with `18px` radius, spanning the combined width of the two wells. The change is immediate — the source's height/opacity entry animation stays excluded. CSS only, scoped to `neumorphism`; copy, Unstage meaning, delivery and other themes are unchanged. It holds only while actual pointer drags deliver the correct target at the wells' lower edges and at the target's edges, including the Node/Bit neutral and unavailable states; if delivery is wrong, stop and return to the user.

### Claymorphism

- Observed source-only: Staging consumes `--clay-staging-bg`; Nodes are square rounded clay objects and Bits rounded list objects. The bottom source target is a `Jelly Basket`; zone and card declarations use clay shadow variables.
- Adopted fact: tactile type-specific objects and a transient soft basket target are supported.
- Token implication: clay Node/Bit well and candidate roles should alias existing variables; keyboard activation text in source is not adopted.

### Origami

- Observed source-only: folded paper wells keep Node grid/Bit list shape; dashed/faceted borders and a lower scissors/slit target are declared. The source includes keyboard drop handlers and repeated pulse classes.
- Adopted fact: paper compartments and a transient slit/cut return affordance are supported.
- Token implication: paper well/candidate/slit roles are valid; keyboard mechanics and pulse are explicitly removed.

### Terminal

- Observed source-only: `Candidate Staging` contains framed `Nodes` and `Bits`; Node candidates appear as directory-like blocks and Bits as `EXEC_` rows. The lower source target is `/DEV/NULL`-like. Internal grip/keyboard handlers are present.
- Adopted fact: directory/executable shape distinction and a transient console return target are supported.
- Token implication: terminal status text provides a non-color cue; internal handles and keyboard placement are excluded.

### Retro Mac

- Observed source-only: `Staging Area` uses black/white folder-like Node tiles and document-like Bit rows, with a lower Trash target labeled as unstage. Hard borders and source drop patterns distinguish states.
- Adopted fact: classic file/folder shapes and transient Trash-like return target are supported as Unstage semantics, never deletion. Under the separately approved Task168 P34-15 supplement, Remove is a static 60px overlay with left/right/bottom inset12px, 2px foreground border, radius4px and a static decorative Trash icon. Idle uses a fully opaque background surface; compatible active-hover uses fully opaque foreground/background inversion. Copy remains `Remove from staging`; wells and lists do not resize or move. Drag start alone does not wash or dim Node/Bit backgrounds; a 45-degree 4px/4px monochrome pattern appears only in the actually hovered subsection while preserving neutral/unavailable/invalid meaning, copy and eligibility. Breakdown Return preserves background alpha0.90 in both idle and hover; compatible hover uses card surface with destructive tint12%, destructive border and text, excluding invalidated sources. Normal and reduced-motion presentation is immediate/static. Continue the existing desktop pattern through Breakdown/Staging/Finder gaps without changing panel surfaces or geometry. Other themes retain their existing presentation.
- Token implication: Mac Node/Bit/target roles need explicit semantic naming so Trash imagery does not imply deletion.

### Graphite

- Observed source-only: a subtle panel contains line-separated Node grid and Bit list; a thin lower strip reads `Release Candidate from Staging`. The design uses grayscale borders with a compact X marker.
- Adopted fact: drafting compartments and an ultra-thin release strip are supported.
- Token implication: graphite zone/candidate/release roles should use shared grayscale variables plus visible text/icon state.

## Exclusions And Verification

- Excluded: any Staging status outside `DP-VQ06-STAGING`, `D-CARD`, internal handles, keyboard-grab/drop mechanics, candidate label snapshots, local mock persistence, large empty placeholders, permanent unstage/Retry buttons, repeated pulse/blink/bounce/spin, and route-specific mutations.
- No drag target, pending candidate, scroll padding, last-item reachability, type distinction, remote arrival, alert, focus, contrast, or light/dark state was rendered or verified.
