# Inbox/Triage Shell And Section Chrome — Visual Recipe

> Status: **Proposed — recipe-package user gate pending**
> Verification: **source-only; no rendered route/state was checked**
> Production owner: `TriageWorkspace` plus shared Inbox/Triage theme realization (`LAND-THEME`)

## Authority And Provenance

- Product authority: selected [`DECISION.md`](../brainstorming/2026-06-25-inbox-triage-theme-surface-redesign/DECISION.md) lines 94–130.
- Approved extraction boundary: [`PROMOTION_MAP.md`](../brainstorming/2026-06-25-inbox-triage-theme-surface-redesign/PROMOTION_MAP.md) §§10.1 and 11.2–11.4.
- Design Source root: `/Users/jwk/Documents/griddo2-claude-themes2-3`.
- Exact route ranges, all below the named Design Source root:
  - GridDO `src/app/prototype/inbox-triage-griddo/page.tsx:998-1121`,
    `:1128-1380`, `:1381-1503`, and `:1504-1774`.
  - Tiny Desk `src/app/prototype/inbox-triage-tiny-desk/page.tsx:1271-1395`,
    `:1402-1550`, `:1551-1632`, and `:1633-1909`.
  - Neumorphism
    `src/app/prototype/inbox-triage-neumorphism/page.tsx:887-1036`,
    `:1040-1280`, `:1281-1403`, and `:1404-1679`.
  - Claymorphism
    `src/app/prototype/inbox-triage-claymorphism/page.tsx:807-936`,
    `:943-1189`, `:1190-1322`, and `:1323-1687`.
  - Origami `src/app/prototype/inbox-triage-origami/page.tsx:1276-1398`,
    `:1402-1601`, `:1602-1714`, and `:1715-2035`.
  - Terminal `src/app/prototype/inbox-triage-terminal/page.tsx:841-937`,
    `:944-1204`, `:1205-1328`, and `:1329-1710`.
  - Retro Mac `src/app/prototype/inbox-triage-retro-mac/page.tsx:853-985`,
    `:992-1241`, `:1242-1369`, and `:1370-1756`.
  - Graphite `src/app/prototype/inbox-triage-graphite/page.tsx:976-1096`,
    `:1103-1350`, `:1351-1438`, and `:1439-1743`.
- Shared values: Design Source `src/app/themes.css:1-439`. That file has no selected GridDO override block; absent GridDO values must not be reconstructed.

The prototype is Design Source only. Its routes, local state, handlers, copy, and duplicated component structure are not production authority.

## Shared Adopted Contract

- Preserve the four semantic areas: Scratch Pool, Breakdown, Staging, and Grid Explorer.
- Preserve main-work vertical `60/40`, Breakdown/Staging horizontal `60/40`, and Staging Node/Bit `35/65`. A route-local ratio that differs is observation, not adoption.
- Restore visible section identity as theme chrome. The semantic names remain `Scratch Pool`, `Breakdown`, `Staging`, and `Grid Explorer`; only Tiny Desk `Library Index`, Retro Mac `Finder`, and Terminal `GRID EXPLORER` are approved alternate Grid labels.
- The user-selected Task 169 review amendment (2026-10-07) gives every theme
  one Explorer header row: native icon/identity left, dedicated search control
  right, no persistent breadcrumb/path row or second search toolbar. Consume
  the [Explorer amendment](inbox-triage-grid-explorer-visual-recipe.md#user-selected-shared-consumer-amendment--2026-10-07)
  for input/body placement; preserve other section chrome and accepted ratios.
- Preserve internal scrolling while hiding scrollbar chrome on the Pool list, Breakdown list, both Staging subsections, and every Explorer column.
- Keep one information and interaction contract. Theme differences flow through semantic attributes, variables/classes, or theme-realization components, never theme-ID branches in product components.
- Section chrome does not authorize an unsupported replacement body. In particular it is not a fallback for `VQ-01/03/04/07/09`.

## Shared Token Implications

- Retain the existing core/page/grid/font/shape/depth variable groups and add Inbox/Triage surface roles only after canonical approval.
- A section surface needs semantic roles for shell background, section header, section divider, internal scroll viewport, and section-local state overlay.
- Existing-surface gaps may use the approved shared state envelope: semantic state attributes, existing semantic/theme tokens, visible text or icon/non-color cues, and the selected accessibility/focus contract. This does not authorize exact effect, duration, copy, placement, layout, or per-theme values.
- Source motion declarations are observations only. No duration, easing, delay, keyframe, interruption, retrigger, or reduced-motion equivalence is adopted here.

## Theme Realizations

### GridDO

- Observed source-only: the shell declares `gap-4`; upper work uses `flex-[6]` with Breakdown `flex-[6]` and Staging `flex-[4]`; the lower Explorer is `flex-[4]`. Panels use card/background/border semantics and Explorer columns use a one-pixel border grid (`gap-[1px] bg-border p-[1px]`).
- Adopted fact: polished product/dashboard section framing and blue technical state accents are the GridDO visual language.
- Token implication: consume current GridDO semantic card/border/primary values. No missing exact GridDO theme value is inferred from prose or another theme.

### Tiny Desk

- Observed source-only: the shell declares `gap-4`; Pool is a wood `DeskPanel`, Staging is cork, and other sections use paper/desk panels. `themes.css:1-46` declares Playfair, `8px` radius, `3px` border, and offset shadows `2px 2px 5px` / `4px 4px 10px` with light/dark variants.
- Adopted fact: wood, cork, paper, and stationery may distinguish section roles while keeping the shared layout.
- Token implication: use shared Tiny Desk variables for the base; surface-specific wood/cork/paper roles require semantic aliases rather than route markup reuse.

### Neumorphism

- Observed source-only: `SoftPanel` surfaces use `gap-5`; the upper layout is `grid-cols-[3fr_2fr]`; rounded panels consume inset/card shadow variables. `themes.css:47-112` declares Inter, `20px`, zero border, paired light/dark extrusion shadows, and named inset/card shadow variants.
- Adopted fact: raised and inset soft-plate declarations carry section hierarchy without adding hard section borders.
- Token implication: preserve the selected shadow variable family; do not claim rendered depth or contrast until checked.

### Claymorphism

- Observed source-only: the shell uses `gap-6`; panels are large rounded clay surfaces; Staging and Explorer consume `--clay-staging-bg` and `--clay-hierarchy-bg`. `themes.css:113-253` declares Inter, `32px`, zero border, outer+inset shadow strings, panel backgrounds, and light/dark button/card roles.
- Adopted fact: puffy tactile panels and distinct clay wells may express section ownership.
- Token implication: promote reusable clay panel/well roles, not literal per-component colors in JSX.

### Origami

- Observed source-only: `PaperPanel` uses per-section intensity and folded corners; the shell uses `gap-4`; dashed dividers and faceted radii recur. `themes.css:254-297` declares Space Mono, asymmetric `2px 12px 2px 12px / 12px 2px 12px 2px`, `1px` border, and folded-paper shadow strings.
- Adopted fact: folded/faceted paper geometry may differentiate section frames.
- Token implication: corner/fold geometry needs recipe-owned surface roles; keyboard-grab UI and pulse declarations inside the route are excluded.

### Terminal

- Observed source-only: the shell uses `gap-4`; `TerminalPanel` provides framed console regions and the Explorer header reads `GRID EXPLORER`. `themes.css:298-347` declares VT323, zero radius, `2px` border, no base shadow, and a `0 0 15px` theme-color hover glow.
- Adopted fact: console frames, dense mono labels, and uppercase identity may realize the shared sections.
- Token implication: light/dark foreground changes must remain variable-driven; rendered contrast is unverified.

### Retro Mac

- Observed source-only: the shell uses `gap-4`; `MacWindow`/striped title bars frame sections, and the Explorer is `Finder`. `themes.css:348-395` declares Space Mono, `4px`, `2px` border, and hard `2px 2px 0` / `4px 4px 0` shadows in black or white.
- Adopted fact: 1-bit window chrome and hard-offset controls may realize section identity.
- Token implication: stripe/title-bar and hard-shadow roles belong in theme CSS, not copied inline styles.

### Graphite

- Observed source-only: the shell uses `gap-6`; dark, subtle, and white `GraphitePanel` variants separate Pool, Staging, and work surfaces. `themes.css:396-439` declares Inter, `8px`, `2px` border, and restrained vertical shadows `0 4px 10px` / `0 8px 20px` with light/dark variants.
- Adopted fact: thin drafting lines, grayscale fields, and restrained editorial chrome may distinguish sections.
- Token implication: dark/subtle panel roles need semantic aliases; no literal route duplication is adopted.

## Exclusions And Verification

- Excluded: route duplication, inline mock architecture, review controls, focus-collapse handlers, internal staging handles, keyboard-grab mechanics, repeated pulse/blink, and route-local mutations.
- Source inspection confirms declarations and structure only. It does not verify contrast, depth, layering, clipping, overflow, rasterized geometry, scrolling, responsive behavior, motion, light/dark parity, or any combined outcome.
- Declared review context is a populated workspace at `1920x1080`; it was not rendered in this pass.

## Task 166-only adopted desktop menu supplement — 2026-10-04

This separate user-approved supplement extends only retro-mac Task 166's L1
common frame. The original extraction snapshot and prior receipts remain
historical and unchanged. Approval owner:
`docs/issues/Issues_Phase_34.Task_166.task-scope-desktop-menu.json`.
Design Source pin: HEAD `4f39709688ceb4cac5e15d4e3502186b1f1c801b`, tree
`7b8eb8766a9b57fe2174a948de09cfb7646cf7de`, retro route `:836-850`.

- One decorative desktop menu spans the workspace content width above Pool,
  Breakdown and Staging. Existing product navigation remains available.
- Adopt 32px bar height, 16px lower gap and inline padding, 2px border,
  4px radius, 2px hard offset shadow, 11px bold Space Mono family and 14px
  Monitor decoration. Menu labels are File / Edit / View / Label / Special;
  the trailing visual clock is the fixed literal 12:00 PM.
- It is aria-hidden, noninteractive decoration: no menu/button/timer semantics,
  event handlers, hover actions, clock updates or Tab stops.
- Shared DOM consumes desktop-menu-bar / desktop-menu-label /
  desktop-menu-clock roles and central --triage-desktop-menu-* aliases.
  Only retro-mac displays it; other themes reserve no space.
- Remaining body height retains main/Explorer 60/40, Breakdown/Staging 60/40
  and Node/Bit 35/65. Preserve Pool controls/state/focus/scroll, DP-VQ01 and
  DP-VQ06-POOL. Fresh geometry/clipping/recovery and other-theme leakage
  evidence is required; source declarations alone are not rendered proof.
- This does not adopt menus for other theme tasks, revise neighboring bodies,
  resolve Q02 Tagged, alter completed receipts or grant Task acceptance.
