# Inbox/Triage Placement Affordances — Visual Recipe

> Status: **Proposed — recipe-package user gate pending**
> Verification: **source-only; no rendered route/state was checked**
> Production owner: decomposed placement state owners coordinated by `TriageWorkspace` (`LAND-PLACEMENT`)

## Authority And Source Regions

- Product authority: [`DECISION.md`](../brainstorming/2026-06-25-inbox-triage-theme-surface-redesign/DECISION.md) lines 887–1030.
- Approved boundary: [`PROMOTION_MAP.md`](../brainstorming/2026-06-25-inbox-triage-theme-surface-redesign/PROMOTION_MAP.md) §§10.1, 11.2, and 11.3.
- Design Source root: `/Users/jwk/Documents/griddo2-claude-themes2-3`.
- Placement subregions are inside GridDO `page.tsx:1504-1774`; Tiny Desk `:1633-1909`; Neumorphism `:1404-1679`; Claymorphism `:1323-1687`; Origami `:1715-2035`; Terminal `:1329-1710`; Retro Mac `:1370-1756`; Graphite `:1439-1743` at that root.

## Shared Adopted Contract

- Direct flow first shows a Node/Bit and destination-path selection surface, then a visually distinct target-column placement affordance. Staged flow opens the target-column placement affordance directly.
- The base affordance names source, result type, and destination. Confirm and Cancel are visually distinct. A full target keeps the affordance present, adds a direct warning, disables Confirm, and never suggests an automatic alternate target.
- Placement stays inside the target column scroll content and cannot expand or clip the column. Its visual shell does not turn into a full-screen modal merely for focus containment.
- Pointer DnD is the only entry in this promotion. No placement button/menu, keyboard DnD, destination picker, hidden shortcut, or unfinished alternative is added.
- Source confirmation mutations are mock-only. Atomicity, revalidation, pending/reconciliation, Retry, focus, and navigation guards come from product/canonical behavior authority.

## Decision-Prerequisite Boundary

- `VQ-08` — **resolved by `DP-VQ08` Choice A on 2026-08-10.** The fixed reliability rail specified below stays inside the captured target-column Placement Affordance, retains its source/type/destination identity, and owns exact pending, unknown/reconciling, not-applied, stale-source/target, Retry/Cancel, success-announcement, focus, lifetime, motion, and eight-theme treatment. Task 153 is its only realization edge after Task 115 checkpoint acceptance.
- `VQ-09` — **resolved by `DP-VQ09` Choice A on 2026-08-11.** The compact step card specified below owns the staged over-limit Result Title step and direct Node/Bit availability rows inside the captured Placement Affordance. It preserves the source, exposes exact non-truncating validation and unavailable reasons, and supplies the only Task 154 realization after Task 116 checkpoint acceptance.

## Placement Review Amendment — Task170, 2026-10-08

The user requested this revision at Task170's Placement visual checkpoint;
that checkpoint is not visually accepted. This bounded direction supersedes
only the visible destination-path summary and direct-choice heading/action
arrangement specified by DP-VQ08/09 below. Preserve the original decision
receipts, accepted Task115/116 evidence and Task170's first Placement packet.
Exact supplemental scope/adoption is required before the affected product
writes; this frozen draft is not implementation, adoption or acceptance.

- Ordinary Inbox Placement steps omit the visible destination breadcrumb/path
  line in Direct and Staged flows, including the staged Result Title step.
  Keep the captured destination identity, path validation/invalidation, target
  column, existing destination-bearing reliability copy and repository inputs.
  This does not remove Explorer attached path status or search-result paths.
- Direct type choice omits visible `Choose a result type`. Retain the source
  title and promote existing `DIRECT PLACEMENT` to the focusable step heading,
  preserving the actual heading ref and entry-focus ownership. Do not leave
  focus on a removed element, add an empty heading, or introduce new copy.
- Node, Bit and Cancel occupy one horizontal action row in that order, filling
  its available inline width equally (`flex: 1 1 0`, `min-width: 0`). Unavailable
  types stay present with native disabled semantics. Keep exact non-hover
  per-type reasons below the row, their programmatic action associations and
  the neither-available instruction; long reasons expand without clipping.
  Preserve the 1–100, 101–200 and 201–1000 matrix and distinct confirmation.
- Staged confirmation retains its source/result title, Node/Bit type and
  distinct Confirm/Cancel controls. Use content-based compact height instead
  of surplus padding/gaps or an arbitrary large frame. Retro-mac may compress
  its theme-role spacing and two-line reliability reservation based on actual
  typography; the current 48px reservation is not a common product dimension.
  Preserve pre-Confirm rail/action reservation, fixed target-column geometry,
  visible full recovery copy and independent controls. Do not delete the rail,
  hide recovery, cap height, or replace target-column scrolling to shrink it.
- Preserve source truth, title limits/validation, atomic mutations, operation
  IDs, locking, Cancel/Escape, restoration and logical focus. Changes remain
  static in normal/reduced motion. No copy-module, hook/repository/schema,
  ordinary-card, search or neighboring-region change follows from this revision.
- Common omission and focus/action semantics bind later L5 theme consumers;
  retro-mac padding, surfaces, outline and compact metrics remain theme values.
  Fresh direct tests and mounted pointer/Tab/scroll evidence must cover the
  changed step, including 1024px action/reliability visibility. Historical
  narrow-screen timeout and other failed/unverified records remain unchanged.

Task170's matching supplemental receipt binds actual owners, exact Tower draft
adoption and the remaining budget. Re-present Placement for user visual
disposition before Newly/Undo. Do not reset the shared budget or infer an extra
cycle, task acceptance, other-theme activation or closure.

## Placement Action-Layout Amendment — Task170 Cycle4, 2026-10-08

After Cycle3 re-review, the user confirmed the ASCII layout interpretation
and explicitly approved one additional cycle. This later direction supersedes
only the earlier horizontal Direct action arrangement and the Staged
confirmation summary/rail/lower-action spatial arrangement. Cycle3 Placement
is not visually accepted. The original DP receipts, accepted evidence and
all previous Task170 packets remain unchanged.

- Direct type selection stacks Node, Bit, then Cancel vertically, each at the
  full available inline width. Cancel has a visibly distinct secondary surface
  and/or outline from the Node/Bit controls. Centralize theme action roles;
  retain focus visibility, readable Light/Dark contrast and native availability
  without presenting an available Cancel as disabled. Keep the actual DIRECT
  PLACEMENT heading/ref, source title, exact type/length limits and associated
  non-hover unavailable reasons. Do not restore Choose a result type or paths.
- Staged confirmation groups the existing Confirm placement heading, actual
  item title and Node/Bit type on the left. Required source-truth and full-target
  content remains in that information group. Independent Confirm and Cancel
  controls sit side by side to its right, vertically centered against it;
  they are not a footer beneath the information. Preserve one shared semantic
  tree and reading/action order without theme-ID behavior branches.
- Keep the pre-Confirm reliability reservation as a full-width area below the
  staged summary/action pair. Only the original staged rail-above-lower-action
  spatial placement is superseded. The right-hand action slot remains reserved
  through original authoritative phase changes: retain rendered unavailable
  Confirm while pending, Check again for unknown/reconciliation, Retry only for
  authoritative not_applied, and the appropriate Cancel control. Preserve every
  exact reason, full-target warning, lock, ref, operation ID, focus plan,
  announcement and event-ended lifetime. Never remove recovery or its reserved
  space to eliminate blank area; longer status grows and scrolls naturally.
- Keep the target-column geometry and existing internal scroll owner. Long
  titles, reasons, action labels and focus indicators must stay readable and
  unclipped at actual product scale. Verify the requested left/right grouping
  at 1024px using real native Tab and pointer wheel input; do not silently
  substitute a lower footer, change neighboring pane geometry or impose a
  maximum height. Report a measured owner/geometry conflict before widening
  scope. Staged Result Title and direct confirmation keep their arrangements.
- Common action composition carries to later L5 theme consumers. Realize
  secondary-control appearance and compact geometry through retro-mac roles
  only, without other-theme activation, numerical fidelity gates or source/
  asset copying. Verify static normal/reduced-motion behavior and preserve
  every other path/source/title/confirmation/recovery/focus contract.

The frozen three-file Tower draft needs exact supplemental scope pinning and
audited adoption before affected product writes. The design and additional
one-cycle approval are already received; do not ask for them again. Record
initial3 consumed plus Cycle4 separately with no budget reset. Only Placement
is revised in that cycle; Newly/Undo remains held. Re-present Placement and
stop before further execution, visual acceptance, task acceptance or closure.

## Placement Chrome/Focus Amendment — Task170 Cycle5, 2026-10-08

The user selected two newly generated edits of the actual Cycle4 screenshots
and approved one additional Placement cycle. Their design identities are:

- Staged confirmation edit: SHA256
  9f5c750fe877514711a8bdeedd9bca376c0bae145bb9580b301185aeb739f34f.
- Direct selection edit: SHA256
  1cc6591b1712aa820875e06208483b31e9e1da26775a913fcfc2871ecde73aee.

These are selected static design references, not pinned native-prototype
delivery or implementation evidence. Preserve literal production titles,
icons/data and complete state content rather than copying raster assets or
adopting the enlarged preview's dimensions as numerical product gates.

- Direct selection keeps vertical full-width Node then Bit, followed by a real
  text-only Cancel button. Entry focuses available Node; if title/target
  eligibility disables Node, focus available Bit; if neither is eligible,
  focus Cancel. Preserve disabled reasons/ARIA and require explicit activation
  to choose a type. This supersedes only heading entry focus. Do not steal focus
  on ordinary rerenders, permanently style an unfocused Node as selected, or
  force browser focus to claim evidence. In retro-mac Light the actual focused/
  hovered type is black with white text; keep Dark and keyboard-focus contrast.
- Direct Cancel has no decorative border, background or shadow. The prototype
  source's idle gray text and hover black text/underline are the selected
  appearance direction, with visible keyboard focus and a usable independent
  hit target. Prior native attempts did not open the prototype Direct surface;
  they do not prove its rendered hover. Fresh production observation must prove
  the implemented effect without importing prototype source/asset bytes.
- For Direct selection and Staged confirmation/reliability, put the existing
  heading in a shared semantic header and an independent × close control at
  its right. Retro-mac uses a black strip with white title/×, consistent with
  the accepted selected-Scratch chrome family without modifying that region.
  Use central accessible name Cancel placement. Both close entry points use
  the same no-write Cancel callback, source fallback and existing locks;
  pending/unknown/reconciling cannot be closed through ×. Preserve state focus
  on the original actual controls and never duplicate an action ref/heading.
- Emphasize the actual source/result title through centralized typography.
  Staged Node/Bit type becomes a compact rectangular outlined tag. Keep every
  literal title, required original-source text, validation and full-target
  warning. In staged confirmation/pending only, native order is Cancel then
  OK, side by side at the right and vertically centered against left content;
  OK invokes the original Confirm action/ref. Check again/Retry/terminal Cancel
  retain original labels, order, locks, focus, operation identity and lifetime.
- Keep compact content-based spacing and the lower full-width pre-Confirm
  reliability reservation. Long content and reached recovery states may grow
  and use the owning column's scroll; they must not be hidden/clipped or given
  a fixed maximum height. Verify actual 1024px balance and native pointer/Tab/
  scroll, preserving target-column/pane geometry and the right-hand action
  grouping. A required out-of-owner geometry change stops the affected slice.
- Centralize only placementPresentation.stagedConfirm = OK and
  placementPresentation.cancelPlacement = Cancel placement in
  src/lib/copy/inbox-triage.ts and its direct test, preserving all existing
  copy values. These two additional owners require exact new scope authority;
  no other copy, hook, repository, schema, card, search or package write follows.
  Direct confirmation and staged Result Title retain their arrangements.
  Shared header/focus/action semantics carry forward; retro-mac geometry does
  not become other-theme realization or acceptance.

Tower's exact three-file draft remains pending new supplemental adoption and
audit. Design and one Cycle5 approval are already received; do not ask for them
again. Preserve initial3 plus Cycle4 consumed and every failure/unverified
record, including Cycle4 narrow wrapping and unchanged Newly probe failure.
Execute only the exactly approved Cycle5 owners/budget, re-present Placement
and stop. Newly/Undo, Cycle6, task acceptance and Working closure remain held.

## Selected Placement Frame/Layout Direction — Task170 Cycle6, 2026-10-09

After Cycle5 review, the user approved the revised Direct preview and final
Staged preview: "괜찮네. 이렇게 작업하자." The selected static design inputs are:

- Direct: exec-79c7e5e5-a1e6-435b-aa0f-973a24fd9e38.png, SHA256
  8adb7e3510bd9d5a8026516132905f377f1e596379e04d836759541d4b99b73c.
- Final Staged: exec-748905a6-9d6b-4bdb-a136-0ea8e272e960.png, SHA256
  d515bcd7f3917fe8cc85b83184eec7926e5a95d5751fc486b771a5e64c2dfe5e.

The earlier Staged variant with an inset white header gutter is not the selected
final image. Pin exact existing image paths/bytes in the new receipt without
copying raster assets into product/evidence. Their enlarged pixels express
layout direction, not product dimensions, native fidelity or acceptance gates.

- Direct selection entry returns to the original focusable DIRECT PLACEMENT
  heading/ref. Neither Node, Bit nor body Cancel receives automatic entry
  focus, regardless of title/target availability. Keep all native disabled
  predicates, exact reason associations, explicit type commands, keyboard
  focus indicators and real hover/focus responses after user interaction.
  No entry mutation/advance or ordinary-rerender focus theft is allowed.
- Both selected surfaces use a continuous retro-mac black header up to the
  top/left/right inner frame edges, with no white gutter or inset frame.
  Visible text is [DIRECT PLACEMENT] or [CONFIRM PLACEMENT], with [×] separately
  at the right. Square brackets decorate existing text/glyph only; do not alter
  the exact accessible heading or Cancel placement central accessible name.
  Keep one heading/ref and an independent native close button using the same
  body Cancel callback, locks, source fallback and focus return. Close cannot
  bypass pending/unknown/reconciling guards.
- Match Direct's rectangular outline to the final Staged frame family. Use
  compatible centralized title size/weight, body insets and gap roles. Increase
  Direct's actual-title size slightly and its top/bottom padding, preserving
  full literal text and natural wrapping. Direct Node/Bit remain full-width
  vertical controls, followed by text-only Cancel with the retained hover and
  keyboard affordances; idle available types share the same white Light surface.
- Staged order is header, actual-title/independent-actions row, then a separate
  full-width lower type-tag row. Title stays left and the horizontal action
  group stays right, vertically centered. Confirmation/pending is Cancel then
  OK in native DOM/Tab order, retaining the actual Confirm command/ref. The
  outlined Node/Bit tag uses the same body left inset and is not constrained
  inside the narrow title/actions information cell. Retain required source
  truth/full-target warning and state-specific recovery labels/order/refs.
- Increase real internal padding on both Staged body buttons, with a readable
  inter-button gap. Reduce surplus idle height through scoped content spacing,
  without deleting the reserved lower full-width reliability area before
  Confirm or hiding its complete copy. Preserve natural state-driven growth,
  operation/locking/focus/lifetime, existing column geometry/internal scroll
  and static normal/reduced-motion behavior. No fixed maximum, clipping,
  footer substitution or neighboring-pane change is authorized.
- Direct confirmation and Staged Result Title retain their arrangements.
  All current central copy values, including the two Cycle5 additions, are
  preservation inputs. Candidate product/test owners are only globals.css,
  PlacementAffordance inside hierarchy-explorer.tsx and its direct test,
  triage-workspace.test.tsx and inbox-triage-theme-realization.test.tsx.
  Shared semantics do not activate another theme, card, search, producer,
  helper or Newly/Undo task. Discovery grants no owner expansion.
- Fresh semantic tests and mounted 1920px/1024px Light/Dark evidence must prove
  initial heading focus/no type inversion, subsequent native keyboard/hover,
  bracket/header/frame continuity, aligned title/actions/tag hierarchy, padded
  controls and readable reached recovery/native Tab/wheel within the existing
  scroll owner. Keep unreached states and numerical preview correspondence
  unverified. A necessary out-of-owner or retained-geometry conflict stops
  the affected write; never force state/focus/scroll to manufacture evidence.

These three Tower drafts are pending exact supplemental adoption/audit. The
user approved the design and then answered "승인합니다" to the exact request
for one additional Cycle6. Record both as received without asking again;
exact scope/receipt/adoption authority remains separate. Preserve initial3
plus Cycle4/Cycle5 consumed, aggregate5 before the additional cycle, and every
immutable receipt/result/capture, long-Direct and narrow recovery observations
and all broader deferrals. Bind exactly the approved one Cycle6 to the new
scope; on completion aggregate6/remaining0. Re-present Placement and stop.
No reset, Cycle7, additional owner, Newly/Undo,
Task170 acceptance, Working/Tower closure or publication is authorized here.

## Selected Task170 Final Drag/Header Refinement — 2026-10-12

The user confirmed eight final visual findings after the Newly/Undo checkpoint
at `f3e04607d6e0aa042344d141cd153e8d8bc77904`, selected the taller-Node
preview and approved the same Working with at most three additional cycles.
This later bounded direction is pending exact canonical adoption; the previous
Placement approval remains a preserved historical disposition. It is not
visual acceptance of the newly requested surfaces. Findings 1-2 and the selected
image are recorded in the Newly/Undo recipe; findings 3-8 below supersede only
their named earlier paint/layout/glyph boundaries.

- During Staged Node drag, suppress unavailable red paint on Level-2 Node
  cards while retaining Level-3 column feedback. Do not change the authoritative
  disabled/eligibility state, target/drop IDs, acceptance predicate or
  invalid-drop no-write behavior to make the visual change.
- For the named unavailable Staged destinations, use the ordinary Finder DND
  diagonal pattern and border treatment, changing the background color family
  to Return-to-Breakdown red. This replaces the distinct flat-fill/solid-red
  unavailable design. Preserve full-target and allowed-state distinctions.
- Allowed/unavailable Finder feedback must cover actual Bit surfaces, not just
  their row background. Maintain native hit access and logical targets, keep
  cards mounted, and restore idle/selected/status paint on drag exit/reentry/
  end/cancel/drop. Feedback never conceals the post-drop Placement/recovery.
- Return-to-Breakdown feedback covers the entire section body below its header,
  including selected-Scratch context/rows. Use the same diagonal pattern and
  retain red-family entered treatment. Preserve return/unstage semantics,
  source restoration, copy, locks, actual native target and focus ownership.
- Remove from Staging reserves in-flow space on appearance. Nodes/Bits display
  viewports shorten without shrinking/scaling their internal cards or controls;
  use existing scrolling for remaining content. Keep the outer pane and
  grouping/widths, actual remove target/ref, command, copy and eligibility.
  The intended in-flow target/viewport rectangles can change; the collision
  algorithm and source producer are unchanged.
- Slightly enlarge the visible close glyph for Direct selection and both
  Direct/Staged confirmation strips. Preserve the heading typography, brackets,
  flush header, independent native hit area, accessible Cancel placement name,
  refs, focus/locks and guarded body/header cancellation. Supersede only the
  earlier equal heading/close font-size constraint, not their semantic binding.

Native verification must distinguish Level-2 card paint from Level-3 column
feedback, prove both allowed/unavailable coverage over actual Bits, exercise
drag cleanup/no-write drops, measure the header-excluded return extent and
Remove viewport/card rectangles, and observe visible close/cancellation in
1920/1024 Light/Dark normal/reduced settings. Inspect actual rendered states;
owner tests or prior passing captures do not prove the new visual invariants.
Preserve existing Placement focus/order/title/tag/body controls/reliability,
full source/destination/status copy and natural target-column scrolling.

Tower03 owns only the bounded canonical draft. Working170/01 pins/adopts it
with the current owner/receipt/commit contract, then owns product/test/evidence
writes. Extra source scope is limited to Breakdown return display and Workspace
Remove/enclosing Staging layout; producer/helper/repository/copy/config and
ordinary Grid/search remain read-only. The draft grants no separate live
workflow-policy change. Record ten previous cycles plus actual used from the
approved maximum3; stop at the audited Task170 visual checkpoint, [ ], same
Working awaiting user disposition. No reset, automatic Cycle14, acceptance,
Task171, closure, topology change or publication.

## Task170 Positive Return Feedback Follow-Up — 2026-10-12

At checkpoint `34dc7addebd95c052a49ec87b08d179bbde81a93`, the user
requested Return-to-Breakdown use a green family because returning is a
permitted action, while unavailable feedback retains a red family. Supersede
only the previous Return red palette requirement. Keep its diagonal pattern,
header-excluded whole-body extent, idle/entered distinction, label, contrast
and non-color cues, actual drop target/ref, guarded unstage/source restoration,
locks/operation/focus/lifetime and native enter/exit/drop/cancel cleanup.

Current source binds unavailable Finder background through
`--triage-return-hover-surface`; it must be separated before changing Return.
Give unavailable feedback its own red-family role and Return its green role.
Preserve Staged Node Level3/Bit Home rejection and Level2 paint suppression,
existing diagonal/border treatment, feedback over actual Bits, and no-write
invalid drops. Do not let green Return tokens propagate into forbidden targets,
full-target warnings, recovery or destructive controls.

The companion Newly/Undo amendment unifies ordinary Finder Bit base styling
without fabricating NEW/Undo or changing their semantics. Current Node height,
Placement frame/header/title/tag/control/focus/locks and Remove in-flow layout
remain preserved. Working170/01's exact supplemental scope pins the four
bounded Tower drafts and actual current owners; existing source/copy/helper/
producer and default-consumer exclusions remain. No old receipt is rewritten.

Use only the current remaining Cycle13 and one remaining bounded observer
correction, with no reset/extra cycle. Fresh matched-build native evidence at
1920/1024 Light/Dark normal/reduced must show green entered Return and still-red
unavailable Finder feedback, actual successful return and prohibited-drop
no-write truth, pattern/extent/cleanup and untouched header. Preserve all prior
accepted history and933 captures/30 runs/failures/limits. Stop at the audited
Task170 visual checkpoint, [ ], same Working awaiting user disposition;
no Cycle14, final acceptance, closure, topology or publication.

## Placement Visual-Audit Correction Draft — Task170 Cycle7, 2026-10-10

The user added two clarifications to the five Cycle6 correction findings:
choose white Finder default surfaces directly instead of diagnosing/restoring
a regression, and remove the outer Finder wrapper border around Placement and
cards. The user subsequently requested both Placement modal widths match
Finder Node/Bit cards. This is targeted feedback, not implementation visual
approval.
The user explicitly approved one Cycle7: "Cycle은 1회도 승인할게."
Record aggregate6 consumed plus Cycle7approved1/unconsumed; do not ask again.
Preserve every old receipt/capture/raw failure and retained/unverified history.

Read-only source discovery at 944597eac25b565d25f7c3d3b4505b342df46a00:

- Direct confirmation uses the legacy branch without placementHeader or the
  selected frame flag; prior Cycle4-6 contracts explicitly preserved that
  branch. Extend the common selected confirmation frame to both Direct Node
  and Direct Bit after explicit selection and their reached recovery states.
  Use flush [CONFIRM PLACEMENT]/independent [×], actual title-left/right
  horizontal centered actions, separate outlined type row and the nonzero
  lower full-width reliability reservation. Confirmation/pending uses native
  Cancel then OK with the existing central OK value/original Confirm ref.
  Preserve original recovery labels/order/ref, state copy, locks, operations,
  destination/path/source truth, focus/lifetime and natural column scrolling.
  Direct selection retains heading entry focus and vertical Node/Bit/text
  Cancel. Staged Result Title remains unchanged.
- Finder default color is a new user choice, not a regression investigation.
  Set ordinary Node decorative folder fill and Bit base surface to
  var(--triage-staging-surface): the same white background as Staging items
  in Light, and the same corresponding Staging surface in Dark. Replace
  gray/tinted default backgrounds directly without historical causal checks
  or another color approval. Verify rendered default equality after the
  change; retain distinct hover/selected/state presentation, original data
  and producer logic. No ordinary Grid/search/shared-card redesign or
  reclassification of Task169 acceptance follows from this later direction.
- For both Direct and Staged mounted Placement, remove the Finder row/target
  wrapper border, outline and ring surrounding the modal together with the
  Node/Bit cards. The current pending-confirmation rule paints a 3px double
  outline on explorer-viewport/explorer-node-target. Suppress only that
  enclosing frame while Placement is mounted, retaining each modal's own
  rectangle, individual card contours, type-tag border and native focus
  indicators. Preserve target identity, geometry, eligibility, locks and
  column scroll; this is a scoped wrapper-paint correction.
- Expand both Placement modal outer frames to the same available inline width
  and left/right card-box edges in the owning Finder column, including Direct
  selection and its Node/Bit post-selection confirmation. Remove the modal's
  additional horizontal m-2 gutters rather than enlarging the Finder column
  or changing ordinary card widths. Keep responsive inline sizing, existing
  column padding, internal body padding, natural full-title/status growth and
  the original scroll owner. No fixed screenshot width or horizontal overflow.
  Measure modal and actual card rectangles in matching 1920/1024 Light/Dark
  mounted states; state any unavailable comparator rather than inventing one.
- Current drag styles paint the ExplorerColumn/NodeDropCell background under
  independent card surfaces. The bounded correction must visibly cover the
  relevant Node/Bit card paint for Breakdown and Staged drags while preserving
  target identity/rectangles, native collision/hit testing, eligibility, DOM
  and state. No card unmount, ordinary-card redesign, pointer interception,
  pane/scroll geometry change or hidden post-drop Placement/status content.
  Prove restoration after exit/reentry/end/cancel and actual allowed drop.
- Staged Node Level-3 and Staged Bit Home unavailable destinations use the
  existing Return to Breakdown red family through scoped invalid-background,
  border/ink roles. Preserve existing rejection/no-write behavior; distinguish
  unavailable from full and allowed destinations. Do not change the producer
  predicates, Return to Breakdown surface or all-theme invalid styling.
- The close currently has font-size 14px while the strip heading resolves to
  7px. Bind the visible bracketed close glyph to the strip-size role for
  Direct selection and both confirmation kinds, retaining native hit area,
  focus visibility, decorative ARIA exclusion and guarded Cancel semantics.
- Additional Staged layout direction in the same Cycle7: reduce the current
  confirmation minimum-height floor to 70%, remove hover-only visual changes
  from its body Cancel/OK controls, and modestly enlarge their font size and
  real block/inline padding. Inventory the actual existing minimum-height
  contributors and matching idle baseline before changing values; the
  current source need not contain a literal modal min-height declaration.
  Record baseline/new minimum and actual rendered boxes separately. Keep
  card-aligned width, title-left/right-centered horizontal Cancel-OK row,
  independent lower type tag, nonzero full-width reliability reservation,
  disabled/locked treatment and native keyboard focus indicators. Long title
  or full status grows naturally above the reduced floor; no exact 70% actual
  height claim, clipping, fixed maximum height or footer fallback. Observe
  idle/hover equality of these controls, comfortable padding/gap, title space,
  containment and native action access at 1920/1024 Light/Dark. Direct
  selection/text-Cancel hover and recovery Check again/Retry are unchanged by
  this additional hover amendment; no neighboring geometry or owner expansion.

Five candidate product/test files: globals.css, hierarchy-explorer.tsx,
hierarchy-explorer.test.tsx, triage-workspace.test.tsx and
inbox-triage-theme-realization.test.tsx. Explicitly add only the necessary
ExplorerColumn/NodeDropCell visual metadata/feedback/wrapper roles and scoped
Finder surface selectors to the existing PlacementAffordance internal scope.
No shared NodeCard/BitCard source or
direct-test write, Newly/Undo composition, source/helper/repository/schema/copy,
Workspace implementation, search or neighboring geometry change is authorized
by this draft. A necessary further owner stops before its affected write.

Before RED, Working records the completed per-cycle failures/trend from the
existing task evidence, these newly reported failure invariants, invalidated
checks, exact scope and one falsifiable bounded hypothesis: complete the
common confirmation frame and scoped Finder feedback/wrapper paint roles,
then verify the directly selected white/Staging default background.
Fresh 1920/1024 Light/Dark semantic/native evidence must include Direct
Node/Bit selection-to-confirmation, same-size close glyph, no-write close/body
Cancel/lock behavior, drag allowed/unavailable/full targets, occlusion and
cleanup with recorded rectangles/column scroll, Finder/Staging default-surface
equality, modal/card inline-width and edge alignment, absent enclosing wrapper
border, retained hover/selected/state card
distinction and exact delivered build/CSS/fonts. Semantic tests alone
do not prove paint or native drop reachability. Preserve every failed run and
record unreached states; no new numerical fidelity threshold or preview import.

Tower03 authors only these three current-file drafts. Working170/01 pins the
entrypoint and five actual owner blobs, exact draft/ordered-diff bytes and
preservation inputs in one supplemental scope. Direction and Cycle7 approval
are already received; do not request them again. Prepare a concise complete
new receipt with actual current scope/owner/draft pins; reference immutable
prior contracts and detailed evidence by exact path/commit/hash instead of
recopying all historical payloads, capture inventories and raw results into
the user-facing JSON. The whole exact new receipt remains approval-bound;
this does not amend installed policy or create an unapproved write/owner.
Adoption and Reflected follow only actual matching start commit/audit.
Freshly revalidate the previously observed independent 3001 dev/.next/dev
consumer; do not navigate/adopt/signal its runtime or reuse its DB. Reconcile
exact output ownership before the fresh approved3170 build/lease; unknown
output ownership stops the affected runtime action.
After an approved completed Cycle7, aggregate7/remaining0, Task170 [ ], same
Working active awaiting user disposition, Newly/Undo held. No reset, Cycle8,
task acceptance, Working/Tower closure, branch/worktree change or publication.

## `DP-VQ08` Approved Fixed Reliability Rail

Choice A adds one fixed two-line reliability rail directly below the retained
source, result type, and destination summary and directly above one fixed
action row. The rail and action row reserve their final geometry before
Confirm, so state/copy changes neither expand the target column nor clip its
controls. The target column's existing scroll content remains the only scroll
owner. No state leaves this captured affordance for a toast, dialog, global
alert, detached panel, or adjacent surface.

### Exact State Copy And Actions

| State | Exact rail copy / announcement | Available action |
|---|---|---|
| Confirmed request pending | `Placing “{title}” in {destination}…` | None |
| Outcome unknown | `We couldn’t confirm whether “{title}” was placed.` | `Check again` |
| Read-only reconciliation | `Checking whether “{title}” was placed…` | None |
| Authoritative `not_applied` | `“{title}” wasn’t placed. Your source is unchanged.` | `Retry`, `Cancel` |
| Stale source | `The source changed. Nothing was placed. Cancel and drag it again.` | `Cancel` |
| Stale target | `The destination changed. Nothing was placed. Cancel and drag to the current destination.` | `Cancel` |
| Authoritative `applied` / `already_applied` | `Placed “{title}” in {destination}.` | None; transition to the actual card |

`applied` and `already_applied` map only to success; `not_applied` maps only to
the retryable not-applied row. `rejected` or `conflict` maps to stale source or
stale target from the returned authoritative source/target facts; it never
creates a generic fallback state or guesses which side changed.

`Check again` performs read-only reconciliation with the same operation ID; it
never resends the placement. `Retry` appears only after authoritative
`not_applied`, reuses that logical operation and its preallocated result ID,
and returns the rail to pending. Rejected/conflict or stale source/target never
offers Retry. Cancel closes the flow without a write and never queues or
automatically replays a blocked navigation request.

### Focus, Locking, And Result Handoff

- Confirm activation retains focus on the still-rendered Confirm control while
  pending. The control and visible Cancel remain in their fixed locations but
  are unavailable with programmatic activation suppressed; all conflicting
  DnD, Scratch, Grid path/search, route, Archive, and Undo actions remain
  locked. Pending never removes the source/candidate or creates a projected
  result.
- An unknown outcome replaces the fixed action row with `Check again` and
  focuses it. Activating it retains focus at that same position while the
  unavailable action reconciles. Repeated activation cannot start another
  read or mutation.
- Authoritative `not_applied` exposes `Retry` followed by `Cancel` and focuses
  `Retry`. Returned authority classifies rejected/conflict as stale source or
  stale target; that rail exposes only `Cancel` and focuses it. The
  source still exists only when authoritative state says it does; no stale
  snapshot is restored or used to infer a result.
- Cancel/Escape after a terminal non-success returns focus to the surviving
  Breakdown grip or staged candidate surface; if that source no longer exists,
  it focuses the owning Breakdown or Staging section heading. Escape is locked
  during pending/reconciliation just like visible Cancel.
- Authoritative success announces the exact success sentence once, removes the
  affordance without an intermediate success timer or decorative success
  card, renders the actual repository Node/Bit, and focuses that card. The
  actual card is the sole visible result; Newly Placed/Undo appearance remains
  owned by `DP-VQ10` and is not invented here.

### Lifetime, Accessibility, And Motion

- Pending lasts from Confirm until an authoritative result or unknown outcome.
  Unknown lasts until `Check again`; reconciliation lasts until its
  authoritative result or another unknown outcome. Not-applied and stale
  states persist until their named action. None auto-dismisses.
- The rail is one visible, polite, atomic status. Announce each changed
  sentence once, never on a rerender, and never move focus merely because copy
  changed. Text plus the rail's static non-color state mark carries meaning;
  color alone never does.
- Every rail/action replacement, affordance removal, actual-card insertion,
  and focus handoff is immediate and static. No fade, slide, scale, skeleton,
  shimmer, spinner, progress loop, pulse, ping, bounce, blink, flicker, or
  layout-transition animation is allowed. Reduced motion keeps identical
  geometry, copy, controls, focus, timing, and lifetime.

### Eight-Theme Reliability-Rail Mapping

All themes bind the same semantic state, copy, DOM order, actions, and focus
contract through existing theme roles. Product components never branch on
theme ID and no literal observed source value becomes reliability authority.

| Theme | Fixed-rail realization |
|---|---|
| GridDO | Restrained technical status rail with canonical semantic border, text, action, and focus roles |
| Tiny Desk | Narrow pinned status slip beneath the retained placement summary |
| Neumorphism | Shallow inset status trough inside the existing shadow family |
| Claymorphism | Compact sculpted status ribbon whose static shape carries state without motion |
| Origami | Seam-attached status strip with a fixed paper edge and no animated fold |
| Terminal | Variable-driven one-line `[SYS]` status record with text/non-color state cue and no blink |
| Retro Mac | In-pane 1-bit system line with hard action controls and no new window or dialog |
| Graphite | Strengthened-rule status caption with restrained monochrome action and precise focus outline |

## `DP-VQ09` Approved Compact Result-Title And Direct-Limit Steps

Choice A keeps both replacement surfaces inside the captured target-column
Placement Affordance as compact, visually distinct steps. The existing target
column scroll content remains the only scroll owner; neither step expands the
column, opens a dialog, edits the source, truncates text, or supplies an
automatic type fallback.

### Staged Over-Limit Result Title

This step appears only when a staged candidate's source title exceeds the
chosen result type's SCHEMA limit: 100 characters for Node or 200 for Bit. A
within-limit staged title proceeds without this step and keeps the exact source
title. An over-limit step starts with an empty draft rather than a truncated or
normalized source copy.

| Element | Exact contract |
|---|---|
| Eyebrow / heading | `RESULT TITLE` / `Name this {Node|Bit}` |
| Explanation | `The source is {count} characters. A {Node|Bit} title can be up to {limit}. The source won’t change.` |
| Field / counter | Label `Result title`; visible counter `{count} / {limit}` |
| Empty error | `Enter a result title.` |
| Over-limit error | `Use {limit} characters or fewer.` |
| Actions | `Continue`, then `Cancel`; Continue is unavailable while the canonical non-empty/length validation fails |

The input accepts the draft without silently clipping, truncating, or
substituting the source. Its associated error and counter update without
moving focus or announcing each keystroke. `Continue` advances only with the
exact valid draft and focuses the next placement-step heading. It changes no
source content; that source remains the Undo/restoration truth.

Entry focuses `Result title`. Cancel or Escape discards only this uncommitted
draft and returns focus to the surviving staged candidate, otherwise the
Staging heading. A source, candidate, target, or reachable-path invalidation
closes the flow, discards the draft, performs no write, announces the named
authoritative change once, and uses the same safe focus fallback. Only a dirty
Result Title draft may use the native browser-unload guard; no internal intent
is queued or replayed.

### Direct Type Availability

Direct placement never shows a Result Title input. Its compact step uses exact
eyebrow `DIRECT PLACEMENT`, heading `Choose a result type`, the retained source
and destination path, one `Node` row, one `Bit` row, and `Cancel`.

| Direct source length | Node row | Bit row | Additional exact copy |
|---|---|---|---|
| `1–100` | Available | Available | None |
| `101–200` | Unavailable: `Node titles can be up to 100 characters. This source has {count}.` | Available | None |
| `201–1000` | Unavailable: `Node titles can be up to 100 characters. This source has {count}.` | Unavailable: `Bit titles can be up to 200 characters. This source has {count}.` | `This source is too long for direct placement. Cancel and stage it first.` |

Each unavailable row remains visible, uses native unavailable semantics, and
references its reason through an accessible description; color or hover never
carries the reason alone. Entry focuses the step heading, then the normal tab
order reaches only available type actions and Cancel. Activating an available
type preserves the source/target snapshot, advances to the distinct placement
step, and focuses its heading. Cancel/Escape writes nothing and returns to the
surviving Breakdown grip, otherwise the Breakdown heading. Source/target/path
invalidation closes the step with the same no-write and focus rules.

### Lifetime, Motion, And Eight Themes

Both steps last until valid advance, Cancel/Escape, invalidation, or route
exit. Every step swap, validation-state change, close, and focus handoff is
immediate and static. There is no fade, slide, scale, spinner, shimmer, pulse,
ping, bounce, blink, flicker, or layout-transition animation; reduced motion
keeps identical geometry, copy, controls, focus, and lifetime.

All themes bind one semantic DOM order and contract through Placement-native
roles; product components never branch on theme ID:

| Theme | Compact-step realization |
|---|---|
| GridDO | Compact technical form card and ruled Node/Bit eligibility rows with canonical error/action/focus roles |
| Tiny Desk | Pinned paper form slip and two-line library-index type rows inside the target column |
| Neumorphism | Raised compact step with inset title field, counter, reason trough, and existing shadow variables |
| Claymorphism | Sculpted compact form plate and tactile type rows whose static shape carries availability |
| Origami | Folded label sheet, seam-bound field/error, and cut-paper type rows with no animated fold |
| Terminal | Variable-driven prompt field, static count/error record, and `[N]`/`[B]` rows with textual unavailable reasons |
| Retro Mac | In-pane compact system form with hard field/buttons and disabled type rows; no new window or dialog |
| Graphite | Restrained registry form and strengthened-rule eligibility rows with monochrome reason and precise focus outline |

## Theme Realizations

### GridDO

- Observed source-only: direct choice is a card overlay with `DIRECT PLACEMENT`, source title, target path, stacked Node/Bit actions, and Cancel. Base confirmation is a bordered primary-tinted column card with type/title and Confirm/Cancel. Invalid hover declares a direct icon+message overlay.
- Adopted fact: compact technical step cards and primary target-column confirmation are supported.
- Token implication: direct-step shell, staged confirmation shell, target path, Confirm, Cancel, full-target warning, and disabled Confirm need semantic roles.

### Tiny Desk

- Observed source-only: direct choice is a cream paper slip with mono label and Folder path; Node/Bit actions read like paper controls. Confirmation is a pinned yellow paper slip with brown Confirm/Cancel; invalid state is a red-marked paper notice.
- Adopted fact: pinned stationery slips and paper warnings are supported.
- Token implication: direct slip, pinned confirmation, paper warning, and action roles need Tiny Desk aliases.

### Neumorphism

- Observed source-only: direct choice is an `18px` raised soft card with source/path and rounded actions. Confirmation is a `20px` raised plate with rounded Place/Cancel; invalid state is an inset soft status card.
- Adopted fact: raised step plates and inset warning treatment are supported.
- Token implication: use existing card/inset shadow variables; do not claim rendered depth or substitute the deferred lens.

### Claymorphism

- Observed source-only: direct choice is a blue-tinted `20px` clay plate with bold source/path and rounded actions. Confirmation is an amber `24px` capsule with explicit pending-type label and Confirm/Cancel; invalid state is a rounded clay alert.
- Adopted fact: distinct cool direct-choice and warm confirmation objects are supported as base step differentiation.
- Token implication: direct, confirmation, warning, Confirm, and Cancel roles should alias clay variables; reliability variants use the approved `DP-VQ08` fixed rail without changing the base clay object.

### Origami

- Observed source-only: direct choice is a folded paper card with source/path and faceted Node/Bit actions. Confirmation is a paper tag with an amber left edge and compact actions; invalid state is a dashed cut-paper message.
- Adopted fact: folded choice sheet, tagged confirmation, and cut-paper warning are supported.
- Token implication: fold-step, tag-edge, warning seam, and action roles need Origami aliases. Keyboard-grab UI is excluded.

### Terminal

- Observed source-only: direct choice is a black console block with source/path, `[N]`/`[B]` actions, and `[ESC] Cancel`. Confirmation is `[SYS: CONFIRM PLACEMENT?]` with framed Yes/Cancel actions; invalid state is an explicit console error.
- Adopted fact: command-step and system-confirmation text frames are supported.
- Token implication: text and icon cues must accompany color; exact route copy is not canonical copy.

### Retro Mac

- Observed source-only: direct choice is a compact white system window with title strip, source/disk path, hard Node/Bit buttons, and Cancel. Confirmation is a black marquee/dotted white card; invalid state is a double-border system alert.
- Adopted fact: classic modal-like subwindow inside the column and marquee confirmation are supported.
- Token implication: title strip, hard control, marquee, and alert roles need Retro Mac aliases; the surface remains column-scoped.

### Graphite

- Observed source-only: direct choice is a dark registry card with source/scope and restrained stacked actions. Confirmation is a docked white strip with `Confirm Placement`, source title, and compact controls; invalid state is a monochrome bordered notice.
- Adopted fact: dark registry choice versus light docked confirmation is supported.
- Token implication: direct registry, docked confirmation, monochrome warning, and action roles need Graphite aliases.

## Exclusions And Verification

- Excluded: every placement-reliability realization outside the approved `DP-VQ08` fixed rail; every Result Title/direct-limit realization outside the approved `DP-VQ09` compact steps; generic/global Dialog fallback, source mutation/truncation/timers, direct hidden editor, keyboard handlers, automatic type/target fallback, partial writes, repeated pulse/ping/spin/bounce, and source copy as product copy.
- No target-column containment, clipping, full-target state, disabled action, step distinction, focus containment, scrolling, pointer hit testing, pending/retry state, contrast, or light/dark outcome was rendered or verified.
