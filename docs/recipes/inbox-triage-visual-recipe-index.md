# Inbox/Triage Visual Recipe Navigation Index

**Status:** User-approved production recipe package; targeted SCHEMA derivation permitted

**Verification level:** Source-only; no rendered verification performed

**Authority:** Navigation only. Product behavior remains owned by canonical
documents and the selected topic decision; this index does not create behavior,
token, layout, or implementation authority.

**Feedback lane amendment (promotion ②, 2026-10-22):** the color themes
shrink to `griddo`, `retro-mac`, `neumorphism` and `claymorphism` (Task 241);
prototype rows and mappings for Tiny Desk, Origami, Terminal and Graphite in
these recipes are history and bind nothing after it. From Phase 50 the
Inbox item statuses follow one rule (icon, emphasis, tooltip; no visible
success), amending the Breakdown, Context, Staging, Newly/Undo and Grid
Explorer recipes as noted at their tops; canonical source:
[DESIGN_TOKENS Feedback Status Surfaces](../DESIGN_TOKENS.md#feedback-status-surfaces).

## Recovery receipt and source boundary

### Production recipe-package approval receipt

- Gate: the complete nine-recipe package, this navigation index, and the
  header-only historical disposition of the superseded Golden Breakdown
  recipe.
- User disposition: approved by the user's 2026-07-28 instruction to carry the
  Fresh canonical chain through final flow review and discard the Golden
  canonical direction.
- Approved content commit:
  `c5111055f683d49ac41c2df1a6d2a154f2a1a7db`.
- Approved pre-receipt SHA-256 values:
  - shell/section chrome: `5cc1069a2c72cd4482de0cf17ac033b1b5dc0a0b13fa80606e31ce19a9597add`;
  - Scratch Pool: `0fdaf03ccdcf1c37589b8318454634eb02419cfeb409c5431b6d3389a7ee9db6`;
  - selected Scratch Context: `755383af972146e9f76f34d0292a14676bed4ccdcfa755465260886df457334f`;
  - Breakdown rows/empty: `c5ad89544e95175dab59d02d756e6f728b4733c71eb5f7284f9b3fb500f46d5b`;
  - Staging: `c893aab138ab87bf6b79ad6889fabe2335faf6d0e318b01f323284601c425b69`;
  - Grid Explorer: `2fa653832f50c0813eaa8753775ed2707356c86124fecb0ea4cd8a8fae45f282`;
  - placement affordances: `d5e2584921dcf97a49bb8c890be8a320e5c325823225949c8ab7b6a24de84433`;
  - newly placed/Undo: `02f446511bbe7199c6f4b1d962e1fc3f6cae542ba3d6da5929d94ab234e18249`;
  - archive/completion: `324558cc8efdc2883cb4606675f3dc27f61607c6fc1a849e755e6131e230e1f9`;
  - this pre-receipt index: `66a10b5913c7a6a5348de4878ea2dcc6258f9306905b821d54329faf1a80cb80`;
  - superseded Golden Breakdown historical marker:
    `13ea2b7596677b5b752987cd22dd8cb240c5ff2b8f504ed92905a37ce6efac10`.
- Preserved constraints: source-only/rendered-evidence disclosure,
  `VQ-01`–`VQ-12`, adjacent-fallback prohibitions, repeated-motion
  exclusions, selected deferrals, and the prohibition on treating historical
  Golden timing values as current authority.
- Next legal action: amend only `docs/SCHEMA.md`, validate its complete
  affected consistency surface, and record its owning approval receipt before
  deriving `docs/SPEC.md`.

- Approved production promotion-map content commit:
  `114b032e7c958ca722a56842253874f5e363c6e2`.
- Approved pre-receipt promotion-map SHA-256:
  `06bfaff9982f59435a112d51a71309803d3c3933dae965a97819f7de9c9aecc8`.
- Approval receipt commit:
  `90022e73666857dd6f7906087d8386a85aa73e08`.
- Current receipt-bearing promotion-map SHA-256:
  `f564868606cd425c69400306707a021c8294e247c81c736e1451c9b5d3bcea1c`.
- Package authority and gate order:
  [approved promotion map](../brainstorming/2026-06-25-inbox-triage-theme-surface-redesign/PROMOTION_MAP.md).
- Selected product authority:
  [DECISION.md](../brainstorming/2026-06-25-inbox-triage-theme-surface-redesign/DECISION.md).
- Historical capture context only:
  [NOTES.md](../brainstorming/2026-06-25-inbox-triage-theme-surface-redesign/NOTES.md).
- Every prototype path and `src/app/themes.css` range below is rooted at the
  separate, read-only Design Source:
  `/Users/jwk/Documents/griddo2-claude-themes2-3`, at clean commit
  `4f39709688ceb4cac5e15d4e3502186b1f1c801b` and tree
  `7b8eb8766a9b57fe2174a948de09cfb7646cf7de`.
  It is never a production-repository path.

The selected Design Source files were matched to the authorized source
manifest before extraction. The manifest's `1920x1080` populated-state
metadata is source context, not a render independently reproduced in this
package.

## Surface-first recipe package

Future task IDs are deliberately `Pending`: they may be assigned only after
the recipe gate and the later one-document-at-a-time canonical gates. The
production owners below are navigation back to the approved promotion-map
landing registry, not implementation authorization.

| Recipe | Supported source-first scope | Production owner | Future task ID | Decision trace |
|---|---|---|---|---|
| [Shell and section chrome](inbox-triage-shell-section-chrome-visual-recipe.md) | Four-area composition, visible identity/chrome, hidden-scrollbar treatment | `LAND-THEME`; `src/components/triage/triage-workspace.tsx` and owning sections | Pending | Replacement bodies cannot be inferred from chrome |
| [Scratch Pool](inbox-triage-scratch-pool-visual-recipe.md) | Expanded/collapsed Pool, tools, list, count, base selection/empty states | `LAND-POOL` | Pending | `VQ-01`; Pool subset of `VQ-06` |
| [Selected Scratch Context](inbox-triage-selected-scratch-context-visual-recipe.md) | Signature Context and base working/complete states | `LAND-BREAKDOWN` | Pending | `VQ-04`, `VQ-11`, `D-LENS` |
| [Breakdown rows and empty states](inbox-triage-breakdown-row-empty-visual-recipe.md) | Base row lifecycle, grip/actions, Add control, empty/completion prompts | `LAND-BREAKDOWN` | Pending | `VQ-02`, `VQ-03`, `VQ-04`, `VQ-05`, `VQ-11` |
| [Staging](inbox-triage-staging-visual-recipe.md) | Node-card/Bit-row shapes, base pending/drop-back/invalid grammar, quiet empty state | `LAND-STAGING` | Pending | `VQ-06`, `D-CARD` |
| [Grid Explorer](inbox-triage-grid-explorer-visual-recipe.md) | Chrome/path/full labels, four-column base, supported target grammar | `LAND-EXPLORER` | Pending | `VQ-06`, `VQ-07` |
| [Placement affordances](inbox-triage-placement-affordances-visual-recipe.md) | Direct/staged base affordances, target-column placement, full-target warning | `LAND-PLACEMENT` | Pending | `VQ-08`, `VQ-09` |
| [Newly placed and Undo](inbox-triage-newly-placed-undo-visual-recipe.md) | Actual-card base marker and Undo placement; static or one-shot candidates only | `LAND-NEWLY` | Pending | `VQ-10`, `D-CARD`; repeated motion excluded |
| [Archive completion](inbox-triage-archive-completion-visual-recipe.md) | Breakdown overlay, base Archive/Cancel, complete Context/reopen state | `LAND-ARCHIVE`, `LAND-BREAKDOWN` | Pending | `VQ-11`, `VQ-12` |

The existing [Batch 2 recipe](inbox-triage-batch2-visual-recipe.md) remains
unchanged and is historical/reference-only for this selected topic. It is not
part of this package and is not a direct execution recipe; canonical reference
changes remain behind the later canonical-document gates.

The existing Golden
[Breakdown recipe](inbox-triage-breakdown-visual-recipe.md) is also
historical/reference-only and is superseded by
[Breakdown rows and empty states](inbox-triage-breakdown-row-empty-visual-recipe.md).
Its exact effect and timing rows are not current visual authority. Active
canonical and plan references move only at their owning later gates.

## Selected route-region navigation

All ranges are source-only extraction locators under the absolute Design
Source root above. They do not assert a rendered outcome.

| Theme | Route file under Design Source | Shell / Pool | Breakdown / Context / Archive | Staging | Explorer / Placement / Newly placed |
|---|---|---:|---:|---:|---:|
| GridDO | `src/app/prototype/inbox-triage-griddo/page.tsx` | `998-1121` | `1128-1380` | `1381-1503` | `1504-1774`; helpers `362-478` |
| Tiny Desk | `src/app/prototype/inbox-triage-tiny-desk/page.tsx` | `1271-1395` | `1402-1550` | `1551-1632` | `1633-1909`; helpers `340-465` |
| Neumorphism | `src/app/prototype/inbox-triage-neumorphism/page.tsx` | `887-1036` | `1040-1280` | `1281-1403` | `1404-1679`; helpers `275-392` |
| Claymorphism | `src/app/prototype/inbox-triage-claymorphism/page.tsx` | `807-936` | `943-1189` | `1190-1322` | `1323-1687` |
| Origami | `src/app/prototype/inbox-triage-origami/page.tsx` | `1276-1398` | `1402-1601` | `1602-1714` | `1715-2035`; helpers `554-673` |
| Terminal | `src/app/prototype/inbox-triage-terminal/page.tsx` | `841-937` | `944-1204` | `1205-1328` | `1329-1710` |
| Retro Mac | `src/app/prototype/inbox-triage-retro-mac/page.tsx` | `853-985` | `992-1241` | `1242-1369` | `1370-1756` |
| Graphite | `src/app/prototype/inbox-triage-graphite/page.tsx` | `976-1096` | `1103-1350` | `1351-1438` | `1439-1743`; helpers `298-414` |

Selected shared values are in Design Source `src/app/themes.css`: Tiny Desk
`1-46`, Neumorphism `47-112`, Claymorphism `113-253`, Origami `254-297`,
Terminal `298-347`, Retro Mac `348-395`, and Graphite `396-439`. No selected
GridDO shared-value block exists; missing exact GridDO values are not inferred.

Local data mutations, review locks/variant selectors, internal staged handles,
keyboard-grab mechanics, focus-collapse handlers, Scratch-switch newly-place
reset, `triagedScratches`, repeated pulse/blink/bounce/ping, and route
duplication are outside the adoptable source subranges.

## Visual-question prerequisite register

The approved two-class disposition is preserved. A behavior or semantic-state
contract is not authority for unsupported appearance.

### Existing-surface state realization

Only the shared semantic-state envelope may proceed: state attributes,
existing semantic/theme tokens, visible text or icon/non-color cues, and the
selected accessibility/focus contract. Every unsupported exact effect,
duration, copy, placement, layout, or per-theme value below remains a named,
user-owned non-code Decision prerequisite.

| ID | Kept behavior / unresolved visual decision | Future owner | Resume condition |
|---|---|---|---|
| `VQ-02` | Breakdown Add success signal; exact theme effect and timing are unresolved | User Decision → Breakdown recipe, `DESIGN_TOKENS.md`, owning phase | Matching user receipt defines the exact realization before its dependent UI task |
| `VQ-05` | Delete pending/failure/reconciliation states; exact treatment, copy, and placement are unresolved | User Decision → Breakdown recipe and owning phase | Matching user receipt resolves unsupported details before dependent state UI |
| `VQ-06` | Pool/Staging/Explorer remote, pending, invalid, arrival, and alert states; exact treatments remain unresolved | User Decision → owning Pool, Staging, or Explorer recipe and phase | Matching user receipt for each dependent realization; no per-theme inference |
| `VQ-08` | Placement pending, failure, authoritative-success, and reconciliation states; exact realization is unresolved | User Decision → Placement recipe and owning phase | Matching user receipt before dependent placement-state UI |
| `VQ-10` | Newly placed/Undo overlap, ineligible, pending, failure, and retry realization; repeated motion is not an option | User Decision → Newly placed/Undo recipe and owning phase | Matching user receipt before dependent reliability UI |
| `VQ-11` | Add/editor blockers and eligibility-loss reporting around completion; exact copy and placement are unresolved | User Decision → Context/Breakdown/Archive recipes and owning phase | Matching user receipt before dependent blocker UI |
| `VQ-12` | Archive pending, failure, uncertain outcome, check-again, and recovery realization; exact treatment is unresolved | User Decision → Archive recipe and owning phase | Matching user receipt before dependent archive-state UI |

### Absent replacement surfaces

These surfaces are wholly excluded from extraction. A nearby dialog, editor,
card, search view, or theme chrome is not a fallback. Each remains a named,
user-owned non-code Decision prerequisite whose dependent UI task stays
blocked.

| ID | Missing replacement surface | Future owner | Resume condition |
|---|---|---|---|
| `VQ-01` | External archive/delete lifecycle transition modal for the Pool | User Decision → Pool recipe and owning phase | Matching user receipt supplies the replacement surface before implementation |
| `VQ-03` | Add-draft continue-writing/discard-and-move confirmation | User Decision → Breakdown recipe and owning phase | Matching user receipt supplies the replacement surface before implementation |
| `VQ-04` | Scratch/row inline editor saving, validation, conflict, and invalidated-lifecycle surfaces | User Decision → Context/Breakdown recipes and owning phase | Matching user receipt supplies the replacement surfaces before implementation |
| `VQ-07` | Dedicated full-hierarchy Explorer search mode and result body | User Decision → Explorer recipe and owning phase | Matching user receipt supplies the complete replacement surface before implementation |
| `VQ-09` | Staged Result Title and direct-placement limit/reason surfaces | User Decision → Placement recipe and owning phase | Matching user receipt supplies the replacement surfaces before implementation |

## Selected deferrals

| ID | Navigation trace | Resume owner |
|---|---|---|
| `D-CARD` | Common BitCard eight-theme redesign; no current Staging/newly-placed fallback | Future brainstorming and approved execution work |
| `D-LENS` | Neumorphism ASC/DESC water-lens polish; source absent | Future user visual decision |
| `D-LOCALE` | Locale resources/toggle and Korean QA; core English copy foundation stays in scope | Future canonical amendment |
| `D-KEYBOARD` | Keyboard/drag-alternative placement entry; no placeholder command | Future accessibility brainstorming |
| `D-TEXT` | Cross-surface wrapping, line counts, expansion, and IME detail | Named separate topic |

## Verification disclosure and gate

| Evidence class | Package status |
|---|---|
| Source identity | Selected route/shared files matched the authorized manifest at the separate Design Source root |
| Source inspection | Nine surface recipes extracted from the approved ranges; observations, adopted facts, token implications, exclusions, and verification status remain distinct |
| Rendered verification | Not performed; no server/browser, screenshot, recording, or route/state interaction was used |
| Unchecked visual dimensions | Contrast, depth, layering, clipping, overflow, rasterized geometry, combined theme outcome, responsive fidelity, motion timing/interruption/retrigger/reduced-motion equivalence, and eight-theme smoke |
| Unchecked behavior states | External removal, concurrency, offline/realtime, placement, Undo, and archive execution |

All nine recipes and this index are approved only as the exact package named
in the receipt above. This approval accepts no task or phase. The next legal
action is the targeted `docs/SCHEMA.md` edit and its own gate; no later
canonical or planning state may derive from an unapproved SCHEMA draft.
