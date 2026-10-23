# GridDO — Design Tokens

> **Scope:** Exact visual values where explicitly listed, plus canonical shared
> semantic visual roles and approved theme mappings. Architecture and product
> behavior live in SPEC.md.
> **Value honesty:** A numeric value is exact only when this document lists it
> and approved authority supports it. Semantic role requirements and `VQ-*`
> placeholders do not imply an absent color, opacity, shadow, size, duration,
> easing, delay, keyframe, copy string, icon, or layout value.
> **Prior Inbox/Triage amendment status:** **User-approved 2026-07-28.** It
> derives only the approved `docs/DESIGN_TOKENS.md` row in the selected topic's
> [promotion map](brainstorming/2026-06-25-inbox-triage-theme-surface-redesign/PROMOTION_MAP.md),
> after the approved [SCHEMA](SCHEMA.md) and [SPEC](SPEC.md) receipts, and does
> not authorize planning or production changes. The selected
> [decision](brainstorming/2026-06-25-inbox-triage-theme-surface-redesign/DECISION.md)
> remains product authority within its declared scope.
> **Production derivation evidence:** Fresh reviewed DESIGN_TOKENS SHA-256
> `e07015e9df7e761173fa2547406637854fb0d63b323e3499e3379337740f3574`
> is read-only evidence, not canonical authority. Production authority is the
> approved map receipt `90022e7`, recipe receipt `7a15451`, SCHEMA receipt
> `250a1b5`, and SPEC content at `285e848` / SHA-256
> `f1157dbba76ad53fc5c6a5d524b7ad74a02099c93ab53b218ae755ebe1024778`
> with receipt `53c3fe9`.
> **Baseline locator note:** promotion-map citations into the prior token file
> refer to production base `a3c679c` (SHA-256 `b99df518...`). The production
> source tree at that original promotion was
> `11e9c0f7ca226fdeee59a23ef164d3baa6823294`; this is historical provenance,
> not the current implementation identity.
> **Reference:** `docs/design-system-preview.html` is a historical/global
> baseline only; it is not Inbox/Triage rendered authority.
> **2026-10-03 targeted amendment:** **Draft — awaiting user approval.**
> Only [Prototype-to-production realization and token ownership](#prototype-to-production-realization-and-token-ownership)
> and the related provenance clarifications are new. The approved
> [promotion map](brainstorming/2026-10-03-inbox_triage_theme_realization/PROMOTION_MAP.md)
> is pinned by its separate
> [map receipt](receipts/Craft_Docs.inbox-triage-theme-realization-promotion-map.json).
> That receipt approves drafting, not this document or a product change. Existing
> values, role/state meanings, accepted DP outcomes and deferrals are retained.
> **SaaS conversion amendment (promotion ①):** 2026-10-22, from
> [`DECISION.md`](brainstorming/2026-10-21-saas-conversion/DECISION.md) S23,
> S26–S28, S40 and feedback F02, F11, F13, F14, F17–F20. Adds
> [SaaS App-State Surfaces](#saas-app-state-surfaces) with the `DP-SAAS-01`
> Decision prerequisite and the display delay. No existing value changes.
> **Feedback lane amendment (promotion ②):** 2026-10-22, from
> [`DECISION.md`](brainstorming/2026-10-18-staging-item-status-feedback/DECISION.md)
> F01, F03–F10, F12, F15, F21–F30 and F33. Adds
> [Feedback Status Surfaces](#feedback-status-surfaces) with the `DP-FB-01`
> Decision prerequisite; retires `DP-VQ02`; amends `DP-VQ04`, `DP-VQ05`,
> `DP-VQ06-STAGING`, `DP-VQ10` and the Ordinary Finder Newly/Undo amendment
> through one item status rule (Phase 50); reduces the color themes to four
> (Task 241); moves the `DP-SAAS-01` decision to Task 242. Until a task lands,
> the contracts it amends stay in force as built.
> **Task 242 decision record (Phase 49):** 2026-10-23. `DP-FB-01` and
> `DP-SAAS-01` are decided and recorded in
> [Feedback Status Surfaces](#feedback-status-surfaces) and
> [SaaS App-State Surfaces](#saas-app-state-surfaces); the status token values
> and every surface choice are exact there, so the implementation tasks need
> no option sheet.

---

## Inbox/Triage DESIGN_TOKENS Approval Receipt

- **Gate:** the production-adapted Inbox/Triage role/state contract, selected
  source-backed geometry, theme-family mappings, motion boundary, recipe
  package table, VQ register, and fidelity disclosure in this document.
- **User disposition:** approved through the prior detailed Fresh token review
  and the user's 2026-07-28 instruction to carry every canonical document
  through the final flow review.
- **Approved artifact:** commit
  `80b811ed94b1e28d1e09be5391aa303ca58aa8cd`, containing the exact
  pre-receipt `docs/DESIGN_TOKENS.md` whose SHA-256 is
  `ad8cec8b5b353879f613eb554bd370183af00a46664c717d8b143fa68b9d56e2`.
- **Parent receipts:** promotion map `90022e7`, recipe package `7a15451`,
  SCHEMA `250a1b5`, and SPEC `53c3fe9`.
- **Preserved boundary:** the amendment adopts no unsupported Inbox/Triage
  literal, no rendered-fidelity claim, and no automatic visual fallback for a
  `VQ-*` gap. The five selected deferrals remain outside this promotion. This
  receipt accepts no implementation, task, or phase.
- **Historical next legal action at that approval:** derive the complete replacement
  `docs/EXECUTION_PLAN.md` across Phase 23–33, then stop at its own durable gate
  before changing `docs/PLANNING_STANDARD.md`.

---

## Intentional Departures

Values that differ from `docs/design-system-preview.html` **on purpose**:

| # | Token / Component | HTML reference | This file | Reason |
|---|-------------------|---------------|-----------|--------|
| 1 | Base font family | Inter (Google Fonts) | Geist Sans by default; Batch 2 color themes may override via `--theme-font` | Geist remains the default app/system font; color themes may opt into their own display fonts |
| 2 | Sidebar model | `52px` icon strip | `3rem` (48px) fixed icon rail, always visible | Phase 9: sidebar is now a permanent icon rail — no fold/unfold. Closest to the reference's icon strip model |
| 3 | Inbox/Triage Batch 2 labels, Context, and search | Removed visible section labels; compact Context strip; active-column search | Visible theme chrome; standalone signature Context; `DP-VQ07` Choice A dedicated full-hierarchy replacement body | The approved mature-topic decision and Task 114 choice supersede the old Batch 2 direction; active-column/global search and ordinary columns remain prohibited substitutes |

---

## Table of Contents

- [CSS Variables](#css-variables)
- [Color Theme System](#color-theme-system)
- [Calendar Visual Theme Contract](#calendar-visual-theme-contract)
- [Inbox / Triage Surface Contract](#inbox--triage-surface-contract)
- [SaaS App-State Surfaces](#saas-app-state-surfaces)
- [Feedback Status Surfaces](#feedback-status-surfaces)
- [Prototype-to-production realization and token ownership](#prototype-to-production-realization-and-token-ownership)
- [Responsive Grid Node Tokens](#responsive-grid-node-tokens)
- [Tailwind v4 Theme Bridge](#tailwind-v4-theme-bridge)
- [Motion Language](#motion-language)
- [Font Loading](#font-loading)
- [Component Usage Quick Reference](#component-usage-quick-reference)
- [Surface Recipes](#surface-recipes)

---

## CSS Variables

> Variables are defined at the top level (not in `@layer base`). Tailwind v4 handles layer ordering internally.
>
> **Format:** Raw HSL channels without `hsl()` wrapper. The `@theme inline` block applies `hsl()` when mapping to utility classes.

Colors in HSL without `hsl()` wrapper (shadcn convention). Shadcn core tokens first, then GridDO extensions.

```css
:root {
    /* ── Shadcn Core Tokens (Light Mode) ── */
    --background: 0 0% 100%;              /* #ffffff — main surface */
    --foreground: 240 10% 3.9%;            /* #09090b — primary text */

    --card: 0 0% 100%;                     /* #ffffff — Node/Bit card surface */
    --card-foreground: 240 10% 3.9%;

    --popover: 0 0% 100%;                  /* #ffffff — Bit detail, search overlay */
    --popover-foreground: 240 10% 3.9%;

    --primary: 221 83% 53%;                /* #3b82f6 — interactive blue */
    --primary-foreground: 210 40% 98%;     /* #f8fafc — text on primary */

    --secondary: 240 5% 96%;              /* #f4f4f5 — subtle surface */
    --secondary-foreground: 240 6% 10%;    /* #18181b */

    --muted: 240 5% 96%;                  /* #f4f4f5 — disabled, placeholder */
    --muted-foreground: 240 4% 46%;        /* #71717a — secondary text */

    --accent: 240 5% 96%;                 /* #f4f4f5 — hover state surface */
    --accent-foreground: 240 6% 10%;

    --destructive: 0 84% 60%;             /* #ef4444 — delete, danger actions */
    --destructive-foreground: 0 0% 98%;

    --border: 240 6% 90%;                 /* #e4e4e7 — card/cell borders */
    --input: 240 6% 90%;                  /* #e4e4e7 — input borders */
    --ring: 221 83% 53%;                  /* matches primary — focus ring */

    --radius: 0.625rem;                    /* 10px — base border-radius */

    /* ── GridDO Extension Tokens ── */

    /* Priority Colors */
    --priority-high: 0 84% 60%;            /* #ef4444 — red */
    --priority-high-bg: 0 84% 97%;         /* #fef2f2 — light mode background tint */
    --priority-mid: 45 93% 47%;            /* #eab308 — amber */
    --priority-mid-bg: 45 93% 97%;         /* #fefce8 */
    --priority-low: 217 91% 60%;           /* #3b82f6 — blue */
    --priority-low-bg: 217 91% 97%;        /* #eff6ff */

    /* Urgency Colors (deadline blinking) */
    --urgency-1: 0 72% 70%;               /* #e88a8a — light red, 3 days */
    --urgency-2: 0 84% 60%;               /* #ef4444 — medium red, 2 days */
    --urgency-3: 0 72% 45%;               /* #c53030 — deep red, 1 day / D-day */
    --urgency-badge: 0 84% 60%;           /* #ef4444 — badge on Nodes */

    /* Aging System (filter values, not colors) */
    --aging-fresh-filter: saturate(1);
    --aging-stagnant-filter: saturate(0.5) brightness(0.9);
    --aging-neglected-filter: saturate(0.2) brightness(0.75);
    --aging-dust-opacity: 0.3;

    /* Motion */
    --motion-duration-affordance: 150ms;
    --motion-duration-theme: 300ms;

    /* Grid Layout — input tokens / policy knobs */
    --grid-cols: 18;                       /* ← 12 (original) → 15 → 18 during Phase 9 density tuning */
    --grid-rows: 9;
    --grid-gap: 0.5rem;                    /* 8px — gap between cells */
    --grid-cell-min: 5rem;                 /* 80px — minimum cell dimension */
    --grid-inset: 0.75rem;                 /* 12px — spacing within cell; used in node sizing formula */
    --grid-node-max-size: 96px;            /* cap — node squares do not exceed this on large displays */
    --grid-line-color: 240 6% 90%;         /* same as --border */
    --grid-line-opacity-l0: 0.15;          /* Level 0 — standard density */
    --grid-line-opacity-l1: 0.12;
    --grid-line-opacity-l2: 0.08;
    --grid-line-opacity-l3: 0.05;          /* Level 3 — thinnest, densest */
    /* Node sizing — static fallbacks; overridden by cell-scoped container query rules in globals.css */
    --grid-node-size: 6.15rem;
    --grid-node-icon-size: 2rem;
    --grid-node-title-height: 1.4rem;
    --grid-node-padding-x: 0.7rem;
    --grid-node-padding-top: 0.7rem;
    --grid-node-padding-bottom: 0.6rem;
    --grid-node-icon-lift: 0.65rem;

    /* Level Depth Backgrounds — warm beige scale (Phase 9) */
    --grid-bg-l0: 48 38% 91%;             /* warm beige — L0 */
    --grid-bg-l1: 48 30% 88%;             /* slightly deeper */
    --grid-bg-l2: 48 22% 85%;             /* deeper */
    --grid-bg-l3: 48 14% 82%;             /* deepest */

    /* Layout Dimensions */
    --sidebar-width: 3rem;                 /* 48px — fixed icon rail (Phase 9: was 14rem foldable) */
    --breadcrumb-height: 3rem;             /* 48px */
    --bit-detail-max-width: 40rem;         /* 640px — Bit detail popup */
    --bit-detail-max-height: 85vh;
    --search-overlay-width: 36rem;         /* 576px — search modal */

    /* Page Background (distinct from --background card surface) */
    --page-bg: hsl(38 28% 91%);            /* warm beige — body background in light mode */

    /* Calendar Layout */
    --calendar-pool-width: 18rem;          /* 288px — left panel (Node + Items pool) */
    --calendar-node-pool-ratio: 0.6;       /* 60% of left panel for Node pool */
    --calendar-day-min-width: 8rem;        /* 128px — minimum day column width */
}

.dark {
    /* ── Shadcn Core Tokens (Dark Mode) ── */
    --background: 240 10% 3.9%;            /* #09090b */
    --foreground: 0 0% 98%;               /* #fafafa */

    --card: 240 6% 8%;                     /* elevated surface — distinct from background */
    --card-foreground: 0 0% 98%;

    --popover: 240 6% 8%;                  /* same elevation as card */
    --popover-foreground: 0 0% 98%;

    --primary: 217 91% 60%;               /* #3b82f6 — brighter blue on dark */
    --primary-foreground: 222 47% 11%;

    --secondary: 240 4% 16%;              /* #27272a */
    --secondary-foreground: 0 0% 98%;

    --muted: 240 4% 16%;
    --muted-foreground: 240 5% 65%;        /* #a1a1aa */

    --accent: 240 4% 16%;
    --accent-foreground: 0 0% 98%;

    --destructive: 0 63% 31%;             /* #7f1d1d */
    --destructive-foreground: 0 0% 98%;

    --border: 240 4% 16%;                 /* #27272a */
    --input: 240 4% 16%;
    --ring: 217 91% 60%;

    /* ── GridDO Extension Overrides (Dark Mode) ── */

    /* Priority backgrounds darken for dark mode */
    --priority-high-bg: 0 84% 10%;        /* dark red tint */
    --priority-mid-bg: 45 93% 10%;        /* dark amber tint */
    --priority-low-bg: 217 91% 10%;       /* dark blue tint */

    /* Grid lines lighten on dark background */
    --grid-line-color: 240 5% 65%;

    /* Level Depth Backgrounds — dark mode, warm tones (Phase 9) */
    --grid-bg-l0: 48 15% 12%;
    --grid-bg-l1: 48 12% 10%;
    --grid-bg-l2: 48 9% 8%;
    --grid-bg-l3: 48 6% 6%;

    /* Page background — dark mode */
    --page-bg: hsl(240 10% 6%);            /* near-black, slightly lighter than --background */
}

@layer base {
  * {
    @apply border-border;
  }

  body {
    background: var(--page-bg);
    @apply text-foreground antialiased;
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
}
```

---

## Color Theme System

> Batch 2 source recipe: `docs/recipes/theme-system-and-grid-batch2-visual-recipe.md`
>
> Color theme is a second visual axis layered on top of dark/light mode. Dark/light remains controlled by `next-themes` (`.dark`). Color theme is applied through `<html data-color-theme="...">`.

### Theme IDs

```ts
export const COLOR_THEMES = [
  "griddo",
  "neumorphism",
  "claymorphism",
  "retro-mac",
] as const;
```

**Four themes (feedback F28, Task 241).** `tiny-desk`, `origami`, `terminal`
and `graphite` leave the picker, `COLOR_THEMES`, the no-flash script, the CSS
and the fonts only they use. Until Task 241 the code keeps all eight. `griddo`
stays the default until Paper ships in the theme stage, whose final set is
`paper`, `retro-mac`, `neumorphism` and `claymorphism` (SaaS S40). Rows for
the removed themes in the theme-family tables of this document stay as
history and bind nothing after Task 241; their per-theme work is not carried
anywhere. The no-flash script reads the same id list as the store (one shared
non-client module), so the two cannot drift (ISSUE-20-01).

| Theme | Label | Character | Font | Shape / border | Depth |
|---|---|---|---|---|---|
| `griddo` | GridDO | warm default GridDO identity | `var(--font-geist-sans)` | `--theme-radius: 1.5rem`; `--theme-border-width: 1px` | soft app shadow |
| `neumorphism` | New Morphism | soft grey extrusion | `var(--font-inter), sans-serif` | `20px`; `0px` | paired light/dark extrusion shadow |
| `claymorphism` | 3D Clay | glossy tactile clay | `var(--font-inter), sans-serif` | `32px`; `0px` | outer + inset clay shadow |
| `retro-mac` | Retro Mac | classic Mac OS | `var(--font-space-mono), monospace` | `4px`; `2px` | hard offset shadow |

### Runtime Tokens

| Token / rule | Value / requirement |
|---|---|
| Runtime attribute | `<html data-color-theme="...">` |
| Default theme | `griddo` |
| Persistence key | `griddo-color-theme` |
| Validation | persisted value must be one of `COLOR_THEMES`; otherwise fall back to `griddo`, which also covers a persisted removed theme id after Task 241 |
| No-flash init | root layout sets `data-color-theme` before hydration using the persisted value |
| Theme picker | icon-only Palette trigger, `aria-label="Change color theme"`, swatch + label + selected check |

### Theme Variable Groups

Each color theme may override these variable groups. Components consume these variables through semantic classes or component-level theme classes; components must not branch on theme id except inside the theme picker.

| Group | Variables |
|---|---|
| Core shadcn | `--background`, `--foreground`, `--card`, `--primary`, `--border` |
| Page | `--page-bg` |
| Grid | `--grid-line-color`, `--grid-bg-l0`, `--grid-bg-l1`, `--grid-bg-l2`, `--grid-bg-l3` |
| Typography | `--theme-font` |
| Shape | `--theme-radius`, `--theme-border-width`, `--theme-border-style`, `--theme-line-style` |
| Depth | `--theme-card-bg`, `--theme-shadow`, `--theme-shadow-hover` |
| Calendar | `--calendar-cell-bg`, `--calendar-header-bg`, `--calendar-border-color`, `--calendar-grid-line-color`, `--calendar-cell-radius`, `--calendar-cell-shadow`, `--calendar-today-*` |
| Inbox/Triage | Proposed `data-triage-role` bindings and optional `--triage-<role>-*` aliases defined below; this amendment adopts role names and theme-family mappings, not missing values |

### Required Theme Classes

```css
.theme-node-card {
  background: var(--theme-card-bg);
  border-color: hsl(var(--border));
  border-radius: var(--theme-radius);
  border-style: var(--theme-border-style);
  border-width: var(--theme-border-width);
  box-shadow: var(--theme-shadow);
  font-family: var(--theme-font);
}

.theme-node-card:hover {
  box-shadow: var(--theme-shadow-hover);
}

.theme-grid-line {
  border-color: hsl(var(--border));
  border-radius: var(--theme-radius);
  border-style: var(--theme-line-style);
  border-width: var(--theme-border-width);
}

.theme-surface {
  background: var(--theme-card-bg);
  border-color: hsl(var(--border));
  border-radius: var(--theme-radius);
  border-style: var(--theme-border-style);
  border-width: var(--theme-border-width);
  box-shadow: var(--theme-shadow);
}

.theme-surface:hover {
  box-shadow: var(--theme-shadow-hover);
}
```

#### Proposed Inbox/Triage role and state targets

The generic `.theme-*` classes and eight-theme variables above existed at the
original promotion baseline. The Inbox/Triage bindings below are canonical
targets, not a current implementation inventory or a claim of rendered
completeness. Accepted tasks and their applicable evidence identify what has
actually landed. Product JSX supplies semantic role and state only.
It must not branch on theme ID or copy recipe literals into components.

The canonical role binding is `data-triage-role="<role>"`. A theme layer may
realize a role through an existing semantic token, a future
`--triage-<role>-*` alias, a shared class, or a theme realization component.
The `*` suffix is a namespace convention, not permission to invent a property
or value. Each role traces to the approved source-only recipe identified below
or to promotion-map §11.4's shared implication.

| Family | Canonical `<role>` values | Approved trace |
|---|---|---|
| Shell / chrome | `shell-background`, `section-surface`, `section-header`, `section-divider`, `internal-scroll-viewport`, `section-state-overlay` | `R-SHELL` |
| Task 166 retro desktop decoration only | `desktop-menu-bar`, `desktop-menu-label`, `desktop-menu-clock` | `R-SHELL` Task 166-only desktop-menu supplement; supplemental task-scope receipt |
| Scratch Pool | `pool-tools`, `pool-search-field`, `pool-total-count`, `pool-filtered-count`, `pool-selected-row`, `pool-compact-switcher`, `pool-compact-marker`, `pool-scroll-viewport`, `pool-status-band`, `pool-status-line`, `pool-status-action`, `pool-activity-marker` | `R-POOL`; status roles from `DP-VQ06-POOL` / Task 144 only |
| External Scratch removal | `external-removal-scrim`, `external-removal-panel`, `external-removal-title`, `external-removal-destination`, `external-removal-countdown-track`, `external-removal-countdown-fill`, `external-removal-draft-card`, `external-removal-copy-status`, `external-removal-primary-action`, `external-removal-secondary-action` | `DP-VQ01`; Task 141 only |
| Selected Context | `context-signature-plate`, `context-eyebrow-meta`, `context-title`, `context-action-cluster`, `context-complete-marker`, `context-completion-blocker`, `context-completion-blocker-mark` | `R-CONTEXT`; blocker roles from approved `DP-VQ11`, Task 160 only; retired by user decision in Task 178 (2026-10-19) |
| Breakdown | `breakdown-active-row`, `breakdown-staged-row`, `breakdown-row-action`, `breakdown-add-field`, `breakdown-add-control`, `breakdown-ordinary-empty`, `breakdown-consumed-completion`, `breakdown-success-wash`, `breakdown-success-status`, `breakdown-success-check`, `breakdown-add-completion-blocker` | `R-BREAKDOWN`; success roles from `DP-VQ02` / Task 148 only, retired with `DP-VQ02` in Phase 50 (feedback F01); blocker role from approved `DP-VQ11`, Task 160 only, retired by user decision in Task 178 (2026-10-19) |
| Staging | `staging-panel`, `staging-node-well`, `staging-node-card`, `staging-bit-well`, `staging-bit-row`, `staging-neutral`, `staging-unavailable`, `staging-invalid`, `staging-pending`, `staging-unstage-target`, `staging-operation-status`, `staging-arrival-count`, `staging-local-alert`, `staging-alert-action`, `staging-target-reason`, `staging-integrity-status` | `R-STAGING`; status roles from `DP-VQ06-STAGING` / Task 147 only; from Phase 50 `staging-operation-status` and `staging-integrity-status` render through the [Feedback Status Surfaces](#feedback-status-surfaces) roles (feedback F06) |
| Grid Explorer base | `explorer-header`, `explorer-column`, `explorer-full-level-label`, `explorer-node-row`, `explorer-bit-row`, `explorer-eligible-target`, `explorer-hovered-target`, `explorer-invalid-target`, `explorer-unavailable-target`, `explorer-remote-count`, `explorer-path-status`, `explorer-status-action` | `R-EXPLORER`; status roles from `DP-VQ06-EXPLORER` / Task 150 only |
| Grid Explorer search | `explorer-search-entry`, `explorer-search-body`, `explorer-search-field`, `explorer-search-close`, `explorer-search-status`, `explorer-search-results`, `explorer-search-result`, `explorer-search-type`, `explorer-search-breadcrumb`, `explorer-search-duplicate`, `explorer-search-retry`, `explorer-search-undo`, `explorer-reveal-status`, `explorer-revealed-row` | `DP-VQ07`; complete body Task 151 and search-result Undo composition Task 158 only |
| Placement base | `placement-direct-shell`, `placement-staged-shell`, `placement-target-path`, `placement-confirm`, `placement-cancel`, `placement-full-target-warning`, `placement-confirm-disabled`, `placement-result-title-shell`, `placement-result-title-source`, `placement-result-title-input`, `placement-result-title-count`, `placement-result-title-error`, `placement-result-title-continue`, `placement-direct-type-option`, `placement-direct-type-reason`, `placement-direct-limit-summary` | `R-PLACEMENT`; reliability extends through approved `DP-VQ08`, and title/limit replacement surfaces extend through approved `DP-VQ09`; Task 153 and Task 154 remain separate edges |
| Newly Placed / Undo | `newly-marker`, `newly-dot`, `newly-new-badge`, `newly-undo-action`, `newly-status-rail`, `newly-status-mark`, `newly-status-action`, `newly-status-reason` | `R-NEWLY`; exact overlap/reason/reliability roles from approved `DP-VQ10`, Task 157 only; composes around the actual Node/Bit card and never replaces or redesigns it; from Phase 50 the `newly-status-*` rail roles are retired and the Undo slot carries the status (feedback F07) |
| Archive / completion | `archive-section-scrim`, `archive-card`, `archive-complete-context`, `archive-reopen`, `archive-action`, `archive-cancel`, `archive-withdrawal-status`, `archive-withdrawal-mark`, `archive-status`, `archive-status-mark`, `archive-current-action`, `archive-confirmation-detail` | `R-ARCHIVE`; `archive-confirmation-detail` is hidden by default and shown only by themes that adopt it (retro-mac, Task 171 user decision); blocker/withdrawal roles from approved `DP-VQ11`, Task 160 only; reliability/recovery roles from approved `DP-VQ12`, Task 162 only |

The shared state binding is a whitespace-delimited
`data-triage-state="<state> …"` token list so independent states can coexist.
Native semantics (`disabled`, `aria-disabled`, `aria-current`,
`aria-selected`, live-region roles, and focus ownership) remain required where
appropriate; the data attribute never replaces them.

| `<state>` | Theme-independent meaning and minimum non-color contract |
|---|---|
| `working` | The active working presentation; it remains distinguishable from `completed` without inventing a VQ effect |
| `selected` | Current user selection; pair with the appropriate native selection/current semantic and a visible shape, marker, text, or icon cue |
| `staged` | Source retained but staged; expose a visible text/icon/shape cue and applicable interaction availability rather than opacity alone |
| `invalid` | The attempted target cannot accept the operation; keep it distinct from destructive meaning and provide a visible non-color cue |
| `unavailable` | The affordance is unavailable before a valid attempt; expose an accessible reason when SPEC requires one and do not collapse it into `invalid` |
| `pending-confirmation` | A valid intent awaits user confirmation before mutation; distinguish it from `pending` |
| `pending` | An authoritative result is outstanding; preserve the SPEC-owned stable focus target and lock only the conflicting actions named there |
| `reconciling` | An uncertain outcome is being checked; visible text/icon semantics distinguish it from both `pending` and success |
| `external-removal` | The selected Scratch is authoritatively archived or deleted elsewhere; stale work is inert and the dedicated `DP-VQ01` transition owns the workspace until restore or terminal handoff |
| `paused` | The `DP-VQ01` countdown is frozen at its exact remainder; destination changes update content without resuming it |
| `draft-copy-ready` | One full source-labeled page-memory draft remains available for copying before the external-removal handoff |
| `copied` | The matching full draft was copied once; preserve button focus and never infer persistence, countdown resume, or movement |
| `success` | Authoritative, non-repeating Add/Unstage success; `DP-VQ02` binds the exact row wash/check/text, polite status, focus preservation, and static reduced-motion equivalent consumed only by Task 148. From Phase 50 retired as a visible state: only the polite hidden announcement remains (feedback F01, F04) |
| `hidden-selection` | The selected Scratch remains active but its row does not match the current Pool query; retain selection/Context and expose the `DP-VQ06-POOL` search-context line without a proxy row |
| `remote-arrival` | One or more active Scratches arrived remotely during the mounted Inbox page; expose the exact aggregate count without auto-selection or focus theft |
| `lifecycle-update` | One or more non-selected Scratches were externally archived, deleted, or restored; keep lifecycle categories distinct in the exact Pool-local aggregate copy |
| `source-unresolved` | A durable staged candidate's source join is temporarily unavailable without authoritative orphan proof; render only the type-shaped integrity status and never a normal draggable candidate |
| `orphan-cleanup` | Authoritative source deletion/tombstone proof completed the atomic candidate cleanup; announce the exact Staging-local result without inventing a missing title snapshot |
| `stale` | Current authority invalidated a drag, placement, candidate, or source snapshot; suppress stale mutation and expose the exact section-local reason after the applicable visual snapshot release |
| `explorer-remote-arrival` | One or more ordinary remote insertions first appeared in a currently open Explorer column; preserve path/selection/focus and stable-ID/offset anchoring while exposing only that column's exact count |
| `path-fallback` | Authority invalidated an Explorer suffix; remove only that suffix, use the nearest valid ancestor/Home without sibling or ghost substitution, and expose the exact affected-column status/focus contract |
| `selection-cleared` | A selected/revealed Bit disappeared while its parent path remained valid; clear only that selection/reveal and retain the parent path with the exact column-local status |
| `newly-placed` | Page-session provenance layered on the actual card; use `newly-*` roles and keep Undo separate |
| `undo-available` | The exact placement remains reversible; expose the stable `Undo` action and visible `Undo this placement.` rail copy independently from selection/Newly provenance |
| `undo-ineligible` | Keep the focusable `aria-disabled` Undo slot and exact always-visible authoritative reason; no late-error, hover-only, menu, or generic-disabled fallback |
| `undo-reenabled` | Dependencies cleared and eligibility recovered; expose `Undo is available again.` without focus movement or a timer |
| `undo-pending` | Atomic Undo is in flight; retain actual result/source/marker, lock the stable action slot, and show exact pending copy without optimistic removal |
| `undo-unknown` | Outcome is not authoritative; retain identity/state and expose only read-only `Check again` |
| `undo-reconciling` | The same operation is being checked without resend; retain the action position and all result/source truth |
| `undo-not-applied` | Authority proves no write occurred; retain all truth and expose exact manual `Retry` only here |
| `undo-conflict` | Returned authority proves mutation/dependency/partial mismatch; show the narrow current reason or canonical conflict reason, never Retry/cascade/overwrite |
| `completion-blocked` | Persisted Archive eligibility is true but a non-empty Add draft or Task 137 title snapshot suppresses completion presentation; retain source draft/editor, existing actions and logical focus; no copy, mark or announcement (user, Task 178, 2026-10-19) |
| `completion-withdrawn` | A previously presented completion state lost persisted eligibility through active Breakdown rows and/or staged candidates; remove overlay/complete/reopen and expose the exact cause in `archive-withdrawal-status` without a stale Archive action |
| `completed` | Complete Context or completion presentation; do not treat it as Archive mutation success |
| `archive-pending` | The guarded Archive command is in flight; retain the selected Scratch/card and stable current-action focus without optimistic removal or Cancel |
| `archive-unknown` | Outcome is not authoritative; retain the same descriptor/operation/card and expose only read-only `Check again` |
| `archive-reconciling` | The same Archive operation is being classified without resend; retain the card geometry and current-action position |
| `archive-recovery` | A validated current-tab descriptor is reconciled before initial Inbox projection; never flash ordinary completion or reconstruct unrelated page-session state |
| `archive-not-applied` | Authority proves no Archive write occurred; expose exact Retry/Cancel, with Retry available only here and reusing the logical operation identity |
| `archive-conflict` | Returned authority proves changed lifecycle/version/eligibility or partial mismatch; expose current truth and Cancel only, never Retry/overwrite/compensation |
| `local-alert` | A section-local status with visible text/icon semantics and the SPEC-selected live/status behavior; it does not become a global toast by default |

Focus-visible treatment continues to use the canonical focus ring and the
SPEC-owned logical focus destination. Theme or future locale changes may swap
role realization and copy presentation only: they do not add/remove state
tokens, reset semantic state, move work to a different lifecycle, or start a
new mutation.

| Theme family | Approved Inbox/Triage realization mapping; no new literal values |
|---|---|
| GridDO | Reuse existing canonical semantic card, border, primary, muted, focus, and text tokens when they support the role. No absent exact GridDO value is inferred from prose or another theme. |
| Tiny Desk | Map roles through wood, cork, paper, and stationery aliases. |
| Neumorphism | Reuse the existing named inset/card shadow family for well, plate, card, and control roles. |
| Claymorphism | Map roles through panel, well, candidate, and action aliases backed by the existing clay family. |
| Origami | Map roles through paper, fold, facet, seam, and cut/tag aliases. |
| Terminal | Keep text/icon/non-color status roles variable-driven; product JSX carries no fixed terminal color. |
| Retro Mac | Map roles through stripe/title-bar, hard-shadow, pane, control, and dither aliases. |
| Graphite | Map roles through dark/subtle surfaces and restrained grayscale field, rule, and action aliases. |

**Fidelity rule:** For the existing Batch 2 core, page, Grid, typography,
shape, depth, and Calendar groups, the **exact** per-theme values — all 8
themes × light/dark, including the full `--theme-shadow` /
`--theme-shadow-hover` / `--calendar-today-*` strings — remain sourced by
`docs/recipes/theme-system-and-grid-batch2-visual-recipe.md` § *Exact Theme
Values (source of record)*. The proposed Inbox/Triage role/state targets above
have no newly adopted exact values in this amendment. Summary prose and one
theme's literals must never be used to reconstruct a missing value for another
theme. If an exact value conflicts with accessibility, build constraints, or
current app behavior, record the conflict explicitly instead of silently
normalizing it.

### Font Loading

Batch 2 themes require these additional font variables in addition to Geist Sans/Mono:

| Font | CSS variable | Used by |
|---|---|---|
| Inter | `--font-inter` | `griddo` fallback-aligned variants, `neumorphism`, `claymorphism` |
| Space Mono | `--font-space-mono` | `retro-mac` |

Playfair Display (`--font-playfair`, `tiny-desk` only) and VT323
(`--font-vt323`, `terminal` only) are removed with their themes in Task 241.

Do not silently collapse all themes to Geist. If a font cannot be loaded, document the fallback and the reason.

---

## Calendar Visual Theme Contract

> Batch 2 source recipe: `docs/recipes/calendar-batch2-visual-recipe.md`

Calendar weekly and monthly views consume the color theme system through calendar-specific variables. These variables are theme-dependent and should be set by the active color theme.

| Token | Role |
|---|---|
| `--calendar-cell-bg` | Monthly date cell / weekly day column background |
| `--calendar-header-bg` | Weekday header row and weekly day header background |
| `--calendar-border-width` | Calendar cell border width |
| `--calendar-border-style` | Calendar cell border style |
| `--calendar-border-color` | Calendar non-today cell border |
| `--calendar-grid-line-color` | Monthly `gap-px` grid line background |
| `--calendar-cell-radius` | Date cell / day column radius |
| `--calendar-cell-shadow` | Non-today cell shadow |
| `--calendar-today-border-width` | Today cell border width |
| `--calendar-today-border-style` | Today cell border style |
| `--calendar-today-border-color` | Today cell border color |
| `--calendar-today-shadow` | Today cell shadow |

### Monthly Grid Contract

| Element | Required treatment |
|---|---|
| Weekday header row | 7-column row using `--calendar-header-bg` |
| Date grid | 7-column grid with `gap-px`; grid background uses `--calendar-grid-line-color` |
| Date cell | background/border/radius/shadow from calendar variables |
| Today date label | circular `bg-primary text-primary-foreground` badge |
| First of month | `MMM d` label, for example `May 1` |
| Other days | `d` label |
| Preview Node | compact square tile, background `node.color`, radius `var(--theme-radius, 6px)` |
| Preview Bit/Chunk | compact dot using parent color |

### Weekly Contract

| Element | Required treatment |
|---|---|
| Shared header | same header pattern as Monthly |
| Day column | background/border/radius/shadow from calendar variables |
| Today column | uses `--calendar-today-*` variables |
| Empty column | non-destructive dashed/empty drop affordance |

Calendar popup item controls must have visible `focus-visible` styling. Recheck `toSorted()` / `useMemo` only if implementation touches relevant list rendering or measurable render cost appears.

---

## Inbox / Triage Surface Contract

> **Amendment status:** **User-approved 2026-07-28**
>
> Product behavior, ownership, focus destinations, and lifecycle remain in
> approved SPEC. The approved nine-recipe package is source-only visual
> evidence. This document owns only the shared role/state vocabulary, selected
> source-backed geometry, and approved theme-family mappings.

At the original promotion snapshot, production at base `a3c679c` had the generic `.theme-*`
classes, eight-theme variable runtime, compact pointer-centered
`TriageDragToken`, and older Inbox/Triage components. It did not yet implement
the proposed `data-triage-role` / `data-triage-state` contract or the complete
surface target below. This historical description does not classify the current
accepted implementation as absent or complete.

### Shared shell and surface meaning

**Task 166-only desktop-menu adoption (2026-10-04):** the separately approved
R-SHELL supplement adds one noninteractive, aria-hidden retro-mac decoration
above the workspace body. Central --triage-desktop-menu-* aliases own 32px
height, 16px lower gap/inline padding, 2px border, 4px radius, 2px hard shadow,
11px bold Space Mono and 14px Monitor. Bar colors use current semantic
foreground/background; other themes display none and reserve no space.
File / Edit / View / Label / Special and fixed 12:00 PM are decorative literals,
not commands or a live timer. Remaining body keeps the selected ratios and
existing state/focus/scroll/recovery. Approval trace:
`Issues_Phase_34.Task_166.task-scope-desktop-menu.json` (in tag `archive/phase-34-codex`).
This does not alter DP contracts, Q02 Tagged or later-theme adoption boundaries.

| Surface | Canonical visual contract | Trace |
|---|---|---|
| Layout | Preserve main work versus Explorer `60/40`, Breakdown versus Staging `60/40`, and Staging Nodes versus Bits `35/65`. These selected ratios are source-backed product geometry, not VQ realization. | `R-SHELL`, `R-STAGING` |
| Visible identity | Theme chrome visibly identifies `Scratch Pool`, `Breakdown`, `Staging`, and semantic `Grid Explorer`. Only Retro Mac `Finder` is an approved alternate visible Explorer label (the Tiny Desk and Terminal labels leave with their themes, feedback F28). Do not expose `L1`, `L2`, or `L3`; Explorer columns use full `Home`, `Level 1`, `Level 2`, and `Level 3` labels. | `R-SHELL`, `R-EXPLORER` |
| Internal scrolling | Pool list, Breakdown list, both Staging subsections, and every Explorer column scroll internally with scrollbar chrome hidden while ordinary pointer, touch, and keyboard scrolling remains available. | `R-SHELL`, surface recipes |
| Scratch Pool | Use the Pool role family for the tools/search region, total count, selected row, compact switcher/marker, and hidden-scroll viewport. Exact product behavior remains in SPEC. | `R-POOL` |
| Selected Scratch Context | Use the standalone signature plate above ordinary rows, never a compact context strip or heading metadata. Working and complete presentations share the Context role family but remain semantically distinct. | `R-CONTEXT` |
| Breakdown | Keep active and staged rows distinct, with grip/action, Add, ordinary-empty, and consumed-completion roles. Staged is not strike-through completion, and empty is not an Archive surface. | `R-BREAKDOWN` |
| Staging | Keep visible `Staging`, `Nodes`, and `Bits`; Node cards and Bit rows use distinct shapes and independent wells. Neutral, unavailable, invalid, and pending meanings remain separate and non-destructive. The transient unstage target is neutral while idle; compatible active-hover uses the approved theme-specific Unstage emphasis below. Retro Mac uses opaque monochrome inversion for Remove and restrained destructive emphasis for compatible Breakdown Return; other themes retain the existing Remove emphasis. Both targets remain semantically Unstage, not deletion. | `R-STAGING` |
| Explorer base | Use four ordinary progressive columns, full level labels, native Node/Bit row shapes, and eligible/hovered/invalid/unavailable target roles. This base excludes the absent replacement search body. | `R-EXPLORER` |
| Placement base | Direct and staged shells, target path, Confirm/Cancel, full-target warning, and disabled Confirm use the Placement base roles. The affordance stays inside the target column; unsupported reliability and Result Title/direct-limit bodies remain excluded. | `R-PLACEMENT` |
| Newly Placed / Undo | Compose the source-backed marker/dot or visible `NEW` badge over the unchanged actual Node/Bit card; keep selection authoritative; expose Undo in a separate stable trailing slot and the approved always-visible status rail immediately below the card inside the same Explorer item wrapper. Never introduce a replacement indicator card, internal card footer/menu, or common-card redesign. | `R-NEWLY`, `DP-VQ10` |
| Archive / completion base | Use a Breakdown-scoped scrim/card, complete Context, reopen, Archive, and Cancel base roles. Do not promote the surface into a page-wide overlay or infer its unresolved blocker/reliability variants. | `R-ARCHIVE` |

The shared compact drag preview remains pointer-centered and type-aware rather
than copying the full source row/card. Invalid and unavailable targets mean a
non-destructive operation cannot proceed; they must not inherit destructive
delete styling merely because the current drop is rejected.

Unless an exact approved theme supplement applies, compatible active-hover
of `staging-unstage-target` retains `border-destructive`, restrained
`bg-destructive/10`, and `text-destructive` while the exact Remove target owns
the staged drag. The Task168 P34-15 Retro Mac supplement instead uses fully
opaque foreground/background inversion for compatible Remove hover and
background alpha0.90 with destructive tint12%, destructive border and text
for compatible Breakdown Return hover. Idle, cancellation and incompatible
or invalidated sources receive no destructive emphasis; Node/Bit neutral,
unavailable and invalid states remain non-destructive. These presentation
exceptions change no Unstage command, copy, persistence or target arbitration.

The old active-section/active-column search is superseded and is not fallback
authority. `DP-VQ07` Choice A supplies the full-hierarchy replacement body;
global Search, the old active-column search, ordinary Explorer columns, and
Explorer chrome alone remain prohibited substitutes for that body.

### Approved external-removal realization — `DP-VQ01`

**User-approved 2026-08-09:** Choice A establishes one dedicated central
blocking transition panel for externally archived/deleted selected Scratches.
This removes `VQ-01` from the open absent-surface list without authorizing any
other VQ. The exact copy, geometry, state matrix, timing, controls, focus, and
theme mapping are owned by the Scratch Pool recipe and consumed only by Task
141.

| Contract | Exact token requirement |
|---|---|
| Geometry | `external-removal-scrim` covers and inerts the Inbox workspace; `external-removal-panel` is centered at `min(35rem, calc(100% - 2rem))` width and `calc(100% - 2rem)` maximum height; only the draft list scrolls |
| Countdown | `external-removal-countdown-track` is 4px high; `external-removal-countdown-fill` runs once, linearly, from full to empty over `5000ms`, freezes on `paused`, and restarts only when a running destination changes |
| Actions | Primary `Move now`; secondary `Pause`/`Resume`; text-only controls with the canonical focus ring; no Cancel and no Escape dismissal |
| Draft state | Source-labeled, selectable, untruncated `external-removal-draft-card`; `Copy full draft` becomes `Copied` in `external-removal-copy-status` without focus movement or countdown change |
| Accessibility | Dedicated `alertdialog`/modal semantics, inert stale workspace, one polite lifecycle/timing/destination announcement on entry plus one for a changed destination, no tick announcements, and the recipe-owned initial/terminal focus destinations |
| Theme invariance | Color theme or light/dark changes swap aliases only and never restart, pause, resume, dismiss, or mutate the transition |

The external-removal roles map through existing families without product JSX
theme branches or copied source literals:

| Theme | Role-family binding |
|---|---|
| GridDO | Semantic card/border/primary/muted/text/focus roles |
| Tiny Desk | Wood frame, paper notice, ruled draft, and stationery action roles |
| Neumorphism | Named inset track/panel and raised card/control shadow roles |
| Claymorphism | Panel, inset groove, raised action, and shape-led draft roles |
| Origami | Paper, fold, seam, facet, and asymmetric control roles |
| Terminal | Variable-driven editor/frame/block-progress/record/command roles |
| Retro Mac | Stripe/title-bar, 1-bit double-frame, segmented-progress, pane, and hard-control roles |
| Graphite | Dark/subtle editorial surface, fine rule, ruled block, and monochrome action roles |

### Approved Add/Unstage success realization — `DP-VQ02`

**Retired in Phase 50 (feedback F01; user, 2026-10-19/21).** Success shows
nothing on screen: the wash, the `✓`, the visible `Added.` /
`Returned to Breakdown.` text, the `breakdown-success-*` roles, the
`--triage-success-wash-*` and `--triage-success-status-duration` tokens and the
reserved 160px status slot go. The polite, visually hidden announcement stays
(F04), with the same trigger identity and focus rules below. The Breakdown row
reserves the 22px status slot of [Feedback Status Surfaces](#feedback-status-surfaces)
instead. Until Phase 50 the contract below stays in force as built.

**User-approved 2026-08-09:** Choice A establishes one shared row-attached
success signal for Add and Unstage. This removes `VQ-02` from the open
existing-surface state gaps without authorizing another reliability state or
task. Task 148 consumes the exact recipe realization.

| Contract | Exact token requirement |
|---|---|
| Trigger identity | One newly observed local `{operation kind, operationId, target Breakdown row ID}`; direct `applied` or the current operation's first authoritative `already_applied` may trigger once |
| State binding | `data-triage-state="success"` on the exact target row and `data-triage-success-kind="add"` or `"unstage"`; no theme-ID or copy branch |
| Placement | `breakdown-success-wash` covers the unchanged row surface; the reserved non-interactive `breakdown-success-status` slot sits immediately before the stable action cluster; `breakdown-success-check` is literal `✓` and `aria-hidden` |
| Copy / announcement | `Added.` or `Returned to Breakdown.` is visible and announced once through a polite atomic status without focus theft |
| Motion | `--triage-success-wash-duration: 600ms`; `--triage-success-wash-easing: ease-out`; background and border return from success emphasis to active-row values with no transform or layout motion |
| Visibility | `--triage-success-status-duration: 1600ms`; check/copy remain static for the full interval and disappear without exit animation |
| Reduced motion | Skip the transition; retain an immediate static success border/surface plus the same check/copy for `1600ms`, then clear in one step |
| Retrigger / interruption | A different new success replaces the prior target and restarts once; same identity, rerender, hydration, reload, remote arrival, and replay do not trigger; Scratch/route exit clears it |
| Focus | Add remains in the Add input; Unstage remains on the restored source row; the signal has no focusable control |

The success roles map through the existing theme families while keeping one
semantic tree and exact copy:

| Theme | Role-family binding |
|---|---|
| GridDO | Primary-tinted semantic row surface/border/text roles |
| Tiny Desk | Paper-row highlight and stationery check-stamp roles |
| Neumorphism | Named raised success surface/shadow returning to ordinary row depth |
| Claymorphism | Shape-preserving glossy success surface and raised check roles |
| Origami | Paper highlight and emphasized seam/fold-edge roles |
| Terminal | Variable-driven record/background/border/check roles with no fixed JSX color |
| Retro Mac | 1-bit surface/border and hard-check roles without cycling inversion |
| Graphite | Restrained grayscale surface and strengthened editorial-rule roles |

### Approved Add-draft departure realization — `DP-VQ03`

**User-approved 2026-08-09:** Choice A establishes one Add-adjacent inline
decision sheet for app-internal departure with a non-empty Add draft. This
removes `VQ-03` from the open absent-surface list without changing Task 139,
native unload, or any other confirmation. Task 140 alone consumes the exact
recipe realization.

| Contract | Exact token requirement |
|---|---|
| Trigger / order | `data-triage-state="departure-decision"` exists only after an internal Scratch/path/route intent meets a non-empty Add draft and any required inline Save has resolved; native unload never binds it |
| Placement | `breakdown-departure-sheet` is an in-flow surface immediately below and edge-aligned with the complete Add input/control row; no portal, scrim, centered modal, toast lane, or row-action placement |
| Content roles | `breakdown-departure-eyebrow`, `breakdown-departure-heading`, and `breakdown-departure-description` render exact `Unsaved Add draft`, `Keep writing?`, and `Continue writing here, or discard this draft and move.` copy without dynamic destination text |
| Actions | `breakdown-departure-actions` orders primary/default `breakdown-departure-continue` (`Continue writing`) before destructive secondary `breakdown-departure-discard` (`Discard and move`); no close, backdrop, or third action |
| Focus / semantics | Labelled and described alert-dialog semantics; initial focus on Continue, sequential focus contained to two actions; Continue/Escape restore the Add caret while Discard hands focus to the performed destination |
| State continuity | A replacement headless destination preserves one sheet and static copy; theme/light-dark changes swap aliases only; no queued destination, stale destination copy, retrigger, or focus movement |
| Motion | Appearance and removal are immediate with no animation; reduced motion keeps the identical static surface, copy, hierarchy, focus, and lifecycle |
| Scope boundary | Generic Dialog/AlertDialog chrome, delete/archive confirmation, native unload UI, prototype literals, adjacent cards, and theme-ID behavior/copy branches are prohibited |

The departure roles map through the existing theme families while preserving
one semantic tree and exact copy:

| Theme | Role-family binding |
|---|---|
| GridDO | Restrained semantic panel/border/technical-label/primary/destructive-secondary roles |
| Tiny Desk | Attached paper-slip, ruled-divider, and stationery-action roles |
| Neumorphism | Inset decision-well and raised-primary roles with separate destructive secondary treatment |
| Claymorphism | Shape-preserving inset-sheet, raised-primary, and restrained destructive-secondary roles |
| Origami | In-flow paper-strip, seam, and asymmetric action-fold roles |
| Terminal | Variable-driven command-block and bracketed-action roles with no blink |
| Retro Mac | In-flow 1-bit pane, hard-border, and default-button roles without window chrome |
| Graphite | Editorial-note, strengthened-rule, solid-primary, and text-destructive roles |

### Approved dual inline-editor realization — `DP-VQ04`

**User-approved 2026-08-09:** Choice A replaces the Scratch title and active
Breakdown content directly inside their source Context/title and row/content
regions. One common state vocabulary drives both surfaces; Task 137 remains the
headless owner and Task 138 alone consumes this visual/copy contract.

**User-approved targeted repair 2026-08-18:** replace only the two inline
editors' visual realization with the fixed geometry below. The clean TDD
experiment changed its earlier no-horizontal-movement stop condition at
`4c22b8c`; the user subsequently smoke-reviewed and approved browser-managed
caret-following horizontal movement. All Task 137 state, lock, blocker, and
focus semantics remain unchanged.

| Contract | Exact token requirement |
|---|---|
| Surface binding | `data-triage-editor-surface="scratch-title"` or `"breakdown-content"`; `context-inline-editor` stays inside Context and `breakdown-inline-editor` inside the exact source/former row position |
| State binding | `data-triage-editor-state="pristine|dirty|validation|saving|offline|not-applied|reconciling|conflict|invalidated"`; no theme-ID or copy branch |
| Common roles | `inline-editor-field`, `inline-editor-status`, `inline-editor-actions`, `inline-editor-compare`, `inline-editor-latest`, `inline-editor-draft`, `inline-editor-recovery`, and `inline-editor-copy-status` |
| Fixed source geometry | View/edit and editor-state transitions retain the same outer geometry and content/action anchors within each theme. The Phase 34 / Task 167 P34-04 Context-geometry supplement sets the retro-mac Context alone to a fixed 120.25px outer border-box height in every mounted state and both modes; other themes retain 104px. Breakdown rows retain their existing fixed geometry. Theme changes may change Context height without changing draft, logical focus or commands. Reserve a fixed `9.5rem` action region; editor content and caret never enter it. Scratch title is limited to 60 characters and Breakdown content to 120. Both are single-line fields with no textarea, resize control, vertical scrolling, or visible scrollbar. Overflow may use browser-managed caret-following horizontal movement: `Home` returns to `scrollLeft=0` and `End` exposes the terminal caret. |
| Base actions | Existing text-style `Save` and `Cancel`; dirty Save uses the approved destructive/red emphasis; pristine/validation Save disabled; unchanged Save/valid blur exits without a write; theme/locale activation and IME composition do not blur-save |
| Ordinary and progress states | Pristine, dirty, and validation keep the fixed field/action geometry with no visible status row. Saving and reconciling retain the read-only field and replace the fixed action region with the corresponding progress action; the existing state copy remains available to that progress treatment without expanding the source region. |
| Source-bound overlay | Offline, not-applied, conflict, and invalidated use a fixed overlay bound to the source editor, with underlying content blurred and no outer-geometry or anchor movement. |
| Conflict | `This changed elsewhere.`; expose `Use mine`, `Use latest`, and `Copy draft` in the fixed overlay without expanding labelled latest/draft comparison regions; latest refresh copy remains `Latest version updated.` |
| Recovery | `Draft not saved`, surface-specific no-longer-editable reason, `Review or copy your draft before closing.`, `Copy draft`, and `Close` remain source-bound in the fixed overlay; copy status `Copied.` |
| Pending intent | `Saving before continuing…` replaces ordinary saving copy; `Stay here` cancels only the pending intent, never the in-flight Save or draft |
| Completion / focus | Applied copy `Saved.` once; surviving Save/Cancel/Use latest returns to Edit; validation/conflict/offline/not-applied retain field focus; invalid row uses next-visible then Add fallback; invalid Scratch uses canonical Pool/selection fallback |
| Motion / lifetime | Static transitions only; no spinner rotation, pulse, bounce, blink, scale, or layout-transition animation; reduced motion is identical; all drafts/resolvers/recovery are mounted-page memory only |
| Scope boundary | No generic Dialog/AlertDialog, popover, detached conflict card, toast, prototype literal, adjacent editor, or theme-specific behavior/copy branch |

The two surfaces share one semantic state tree while consuming their existing
theme families:

| Theme | Shared editor-family binding |
|---|---|
| GridDO | In-place semantic fields, technical status rules, labelled comparison blocks, and canonical primary/secondary roles |
| Tiny Desk | Same-sheet ruled fields, paper status annotations, and labelled paper comparison/recovery sections |
| Neumorphism | Inset fields/comparison wells inside existing Context/row depth with raised actions |
| Claymorphism | Shape-preserving inset text channels, restrained seams, and raised actions within source silhouettes |
| Origami | Inline field, comparison, and recovery folds inside the same source paper geometry |
| Terminal | Variable-driven editable record lines and static status/diff blocks with no blink |
| Retro Mac | In-place 1-bit fields, hard status/comparison panes, and default-button hierarchy without new windows |
| Graphite | Editorial fields, strengthened status rules, and labelled manuscript comparison/recovery blocks |

**Feedback lane amendment (F05, Phase 50).** The transient editor states move
to the item status rule ([Feedback Status Surfaces](#feedback-status-surfaces)):

| State | From Phase 50 |
|---|---|
| `dirty` (`Unsaved changes.`) | No text; the enabled Save is the signal |
| `saving`, `reconciling` | The loader in the status position after `DISPLAY_DELAY_MS`, with Save and Cancel unavailable at once; the sentence moves to the tooltip and the existing announcement |
| Pending intent (`Saving before continuing…`) | The loader plus the existing `Stay here`; the sentence in the tooltip |
| `not-applied` (`Not saved.`) | `!` with emphasis and the tooltip in place of the overlay line; its existing recovery control stays as a compact control |
| `offline` (`Offline. Your draft is still here.`) | No overlay: the draft stays in the editor and the offline write-attempt toast appears (SPEC §Toasts) |
| `conflict` | Unchanged: the source-bound conflict view stays (F08) |
| `invalidated` | Unchanged: the recovery overlay is a decision surface F05 does not touch |
| Applied (`Saved.`) | Only the polite hidden announcement (F04) |

The fixed geometry, the `9.5rem` action region and the lock rules stay. The
Motion row's "no spinner rotation" yields to the F03 loader only.

### Approved Add/Delete attached reliability realization — `DP-VQ05`

**User-approved 2026-08-09:** Choice A binds Add reliability to the Add region
and Delete reliability to the exact source row. Task 136 remains headless;
Task 143 alone consumes this copy/visual contract.

| Contract | Exact token requirement |
|---|---|
| Surface binding | `data-triage-reliability-surface="add|delete"` with headless-authoritative `pending|unknown|reconciling|not-applied|rejected|conflict`; no theme-ID or copy branch |
| Add placement | `breakdown-add-reliability` is a reserved full-width second line inside the Add input/control grid; `breakdown-reliability-status` precedes one trailing `breakdown-reliability-action`; `DP-VQ03` stays below the complete Add region |
| Delete placement | `breakdown-delete-reliability` is a full-width second line inside the exact source row below its ordinary content/action line; width, identity, order, content, grip, Edit, and Trash positions stay stable |
| Add copy | `Adding…`; `We couldn’t confirm whether it was added.`; `Checking whether it was added…`; `Not added. Your draft is still here.`; `Add unavailable. Your draft is still here.`; `This Scratch changed. Your draft is still here.` |
| Add recovery | `Check again` only for unknown/reconciling; primary `Retry Add` only for authoritative `not_applied` with the same operation/row identity and snapshotted content; editing withdraws Retry; rejected/conflict return to a new ordinary Add path |
| Delete copy | `Deleting…`; `We couldn’t confirm whether it was deleted.`; `Checking whether it was deleted…`; `Not deleted. This breakdown is still here.`; `Delete unavailable. This breakdown is still here.`; `This breakdown changed. Delete was not completed.` |
| Delete recovery | `Check again` is the sole reliability action and performs read-only reconciliation; no `Retry`, `Retry Delete`, or `Delete again`; a later ordinary Trash activation is a new attempt |
| Confirmed result | Add clears once and delegates visible success to `DP-VQ02`'s row `Added.` signal; Delete removes once with SPEC focus/empty/completion handoff and no placeholder or toast |
| Timing / lifetime | Pending appears synchronously before the first async gap; all changes are immediate; unknown/failure persist without auto-dismiss until new source interaction, exit, or terminal authority replaces them |
| Focus / accessibility | One polite atomic announcement per new state; Add input stays logically focused, `Check again` stays mounted/focused through reconcile, `not_applied` may replace it with focused `Retry Add`; Delete retains Trash then uses focused Check again and returns terminal failure to Trash |
| Motion | Static only; no spinner rotation, pulse, ping, bounce, blink, flicker, scale, transform, or layout-transition animation; reduced motion is identical |
| Scope boundary | No toast, placeholder row, generic card/dialog, global status rail, prototype literal, adjacent-surface fallback, blind Retry, or theme-specific behavior/copy |

The same semantic tree consumes existing theme families:

| Theme | Reliability-family binding |
|---|---|
| GridDO | Compact technical rule, semantic status text, canonical action/focus roles |
| Tiny Desk | Attached ruled-paper annotation and stationery recovery controls |
| Neumorphism | Shallow inset status channel and named raised recovery control inside existing depth |
| Claymorphism | Shape-preserving inset status seam and restrained raised recovery control |
| Origami | Attached status seam/fold and fixed recovery fold inside source paper |
| Terminal | Variable-driven static status line and bracketed recovery action with no blink |
| Retro Mac | In-place 1-bit status pane and hard recovery control with no new window |
| Graphite | Editorial status caption, strengthened rule, monochrome action, and persistent focus cue |

**Feedback lane amendment (F06, F07, Phase 50).** The reliability lines move
onto the item ([Feedback Status Surfaces](#feedback-status-surfaces)):

- **Add.** The reserved second line (`breakdown-add-reliability`) goes. The
  status icon sits inside the Add field at its right end with the emphasis on
  the field; `Check again` and `Retry Add` stay beside Add as compact
  controls; the sentence is the field's tooltip and description.
- **Delete.** The second line inside the row (`breakdown-delete-reliability`)
  goes. The icon sits in the row's 22px status slot before the actions, and
  `Check again` stays a compact control in the row's action cluster; the
  sentence is the tooltip of the row's grip and status slot.
- **Timing.** The lock still applies synchronously before the first async gap;
  the pending loader shows only after `DISPLAY_DELAY_MS`. Unknown and failure
  show at once and keep their lifetimes.
- **Result.** Add success shows nothing on screen (`DP-VQ02` retired); the
  focus and announcement rules are unchanged.
- The copy stays exact; only where it shows changes. The Motion row's
  "no spinner rotation" yields to the F03 loader only.

### Approved Pool fixed-status realization — `DP-VQ06-POOL`

**User-approved 2026-08-10:** Choice A establishes one fixed Pool-local status
band directly below the expanded search/sort tools and outside the scrolling
Scratch list. It resolves only the Pool slice of `VQ-06`; Task 144 alone
consumes it, while the Staging and Explorer slices remain unresolved.

| Contract | Exact token requirement |
|---|---|
| Placement | `pool-status-band` follows the complete search/sort tools (one row; in retro-mac two rows, search then sort, per the Task 166 Q02 disposition) and precedes `pool-scroll-viewport`; it has at most one search-context `pool-status-line` and one aggregate activity line and never becomes a list row, toast, panel, event history, or adjacent-surface status |
| Count meaning | `pool-total-count` always means all active Scratches; non-empty search alone renders exact `{visible} of {total} Scratches` in `pool-filtered-count`; `pool-activity-marker` means mounted-page unseen remote arrivals or non-selected lifecycle activity and never replaces either count |
| Hidden selection | Bind `hidden-selection`; render exact `Selected Scratch is hidden by this search.` plus `Clear search`; retain selection/Context, clear only the query, and keep focus in the search field |
| Remote arrival | Bind `remote-arrival`; render `1 new Scratch arrived.` or `{count} new Scratches arrived.` plus `Review new`; revalidate, scroll/focus the first surviving unseen row without selecting it, and otherwise return focus to the search field |
| Lifecycle | Bind `lifecycle-update`; render exact archive/delete/restore singular or plural copy from the Pool recipe plus `Dismiss`; selected external archive/delete bypasses this ordinary line and remains owned by `DP-VQ01` |
| Mixed activity | Use the recipe's one `Pool updated elsewhere: {nonzero clauses}.` sentence in fixed new/archive/delete/restore order; expose `Review new` only for arrivals and `Dismiss` only for lifecycle aggregates; no disclosure or Mark-reviewed state |
| Compact mode | Search is not applied, so show no hidden/filtered line; keep the all-active count and use literal `+{count}` plus a separate non-color lifecycle marker named `Pool updated elsewhere.`; markers are not controls and the existing expand control reveals the band |
| Lifetime | Hidden/filter status is condition-bound; arrival/lifecycle aggregates are mounted Inbox-page state, preserved by selection/sort/collapse/theme/light-dark changes, independently cleared by `Review new` / `Dismiss`, and cleared together only by route exit or reload; no timer or auto-dismiss |
| Accessibility / focus | One polite atomic announcement per newly changed activity sentence, never per rerender; arrival/lifecycle never steals focus or selection; user actions use the exact recipe focus destinations; `DP-VQ01` alone owns blocking selected-disappearance focus |
| Motion | Every entry, replacement, clear, marker, band-size, scroll, and focus change is immediate; no fade, slide, scale, spinner, pulse, ping, bounce, blink, flicker, or layout-transition animation; reduced motion is identical |
| Scope | No selection/query meaning/persistence mutation, no repository or lifecycle command, no `DP-VQ01` duplication, and no Staging/Explorer role, copy, action, state, or theme authority |

The fixed status band maps through Pool-native theme families with no product
JSX theme branch or copied adjacent-surface literal:

| Theme | Role-family binding |
|---|---|
| GridDO | Restrained semantic band/marker using canonical border, muted, primary, text, action, and focus roles |
| Tiny Desk | Ruled-paper strip below wood tools, stationery text/actions, and pin/bar-like compact marker |
| Neumorphism | Shallow inset status well, named raised action, and raised compact marker within the existing shadow family |
| Claymorphism | Shape-preserving soft inset ribbon, restrained raised text action, and puffy non-color compact marker |
| Origami | Attached folded-paper strip, seam-separated lines/actions, and folded-tab compact marker |
| Terminal | Variable-driven static bordered line, bracketed text action, and text/shape marker with no fixed JSX color or blink |
| Retro Mac | In-place 1-bit pane below FIND/tools, hard text control, and hard-outline marker with no new window |
| Graphite | Editorial caption band, strengthened rules, restrained monochrome text action, and index-like compact marker |

### Approved Staging attached-status realization — `DP-VQ06-STAGING`

**User-approved 2026-08-10:** Choice A establishes candidate-attached
pending/unknown/reconciling status, subsection-local remote-arrival indicators,
and one Staging-title-attached terminal/integrity alert. It resolves only the
Staging slice of `VQ-06`; Task 147 alone consumes it. Pool remains owned by
`DP-VQ06-POOL`, and Explorer remains unresolved.

| Contract | Exact token requirement |
|---|---|
| Operation placement | `staging-operation-status` is one fixed line inside the affected final-type Node card or Bit row, shown for unknown and reconciling only; pending, and a hold from pending, shows no line and the projection renders the candidate's icon and title (user, 2026-10-18, mi-14); Stage pending uses a non-draggable projection, Unstage retains the durable candidate, and pending/unknown/reconciling never replace or resize the Staging panel; after `applied`/`already_applied` the projection or retained candidate keeps its line through the SPEC post-terminal presentation hold (2026-10-18), and a card dimmed for its pending Unstage, or held from pending, keeps the line at full ink |
| Base and remote count | `Nodes` / `Bits` remain bare at zero or one and receive the presentation total prefix only at two or more, following SPEC — Durable Staging, including visible pending/unknown/reconciling and held Stage projections without duplicate candidate IDs and excluding unresolved-source integrity slots; `staging-arrival-count` separately renders exact `1 new` / `{count} new` beside only the affected heading with accessible action name `Show new {Nodes|Bits}` and is never added to the heading total. Durable membership, eligibility and status lifetimes remain unchanged. |
| Terminal alert | `staging-local-alert` is one static band directly below `Staging` and above both wells; `staging-alert-action` is visible `X` named `Dismiss Staging alert`; later failure replaces earlier and no stack/history/rail/toast/dialog exists |
| Pending/reconcile copy | Use the Staging recipe's exact `Staging “{title}”…`, `Returning “{title}” to Breakdown…` (live region only since 2026-10-18), unknown, and checking sentences; no action or Retry exists before authority |
| Failure copy | Use the recipe's exact Stage/Unstage `not_applied`, rejected, and conflict sentences; alert `X` dismisses presentation only and a permitted retry is a new drag, never a status action |
| Integrity/stale copy | Bind `source-unresolved`, `orphan-cleanup`, or `stale` and use the exact type-only unresolved/orphan, changed-elsewhere drop cancellation, and placement-closed copy; cache/offline/delay never uses orphan copy and no missing candidate title is reconstructed |
| Neutral/invalid | `staging-target-reason` attaches exact `Already in Nodes.`, `Already in Bits.`, `Return to Breakdown before changing type.`, or `This item is no longer available.` only to the active well/target and clears on exit/end |
| Remote focus | Arrival preserves focus/scroll; activating the count revalidates, scrolls its subsection to top, clears its count, and focuses the first surviving new candidate without mutation, or the subsection heading when none survives; observing top clears without focus movement |
| Alert lifetime/focus | No timer; clear on `X`, new operation for that candidate, authoritative candidate disappearance, or Scratch switch; `X` returns focus to surviving candidate, related Breakdown source, then Staging heading |
| Motion | Every status/count/alert/reason/scroll/focus transition is immediate; no fade, slide, scale, spinner, pulse, ping, bounce, blink, flicker, or layout-transition animation; reduced motion is identical |
| Scope | No repository/lock/reconciliation change, candidate label snapshot, permanent Unstage/Retry, `DP-VQ02` change, `D-CARD`, Pool role, Explorer role, or theme-ID behavior/copy branch |

The attached family maps through Staging-native theme roles:

| Theme | Role-family binding |
|---|---|
| GridDO | Candidate technical rule, compact subsection count chip, restrained semantic alert band, and canonical action/focus roles |
| Tiny Desk | Paper-object annotation, stationery count tab, and ruled-paper notice below the wood/cork title |
| Neumorphism | Shallow inset candidate line, named raised count action, and wide inset alert well within the existing shadow family |
| Claymorphism | Shape-preserving candidate seam, puffy non-color count, and soft sculpted alert ribbon |
| Origami | Candidate fold-edge status, folded count tab, and attached alert strip with seam-separated action |
| Terminal | Variable-driven inline record status, text count command, and static framed alert with no fixed JSX color or blink |
| Retro Mac | In-place 1-bit candidate footer, hard counter control, and full-width alert pane below the title with no new window |
| Graphite | Candidate editorial caption, compact index count, and strengthened-rule alert band with restrained monochrome action |

**Feedback lane amendment (F06–F10, Phase 50).**

- **Operation status.** `staging-operation-status` stops being a line inside
  the card or row. A Node card shows the status icon in its top-right corner,
  a Bit row at its end: the loader after `DISPLAY_DELAY_MS` for pending
  (including a hold from pending), `?` for unknown, `?` then the loader for
  reconciling. The pending and unknown sentences are the item's tooltip; the
  live-region announcements stay. The existing dimming of a candidate under a
  pending Unstage stays.
- **Problems on a remaining item.** An Unstage `not_applied`, rejected or
  conflict result, whose candidate remains, shows `!` with emphasis and the
  sentence as tooltip on that candidate instead of the alert; it clears on a
  new operation for that candidate, its authoritative disappearance or a
  Scratch switch. An unresolved-source integrity slot shows `!` with its
  type-only sentence as tooltip.
- **Alert band.** `staging-local-alert` keeps the notices whose item has
  gone: Stage `not_applied`, rejected and conflict, and the stale-invalidation
  notices (changed-elsewhere drop cancellation, placement closed), whose drag
  or placement has ended (F08).
- **Tooltip** (F09). On a card or row the problem tooltip leads with the full
  title on its own line, since the label truncates, unless the sentence
  already contains it. Where the host is not in the Tab order (a Stage
  projection, an integrity slot), the status icon is focusable.
- **Nodes zone** (F10, MI-21). The `Nodes` well is never narrower than one
  Node card and lays its cards in an auto-fill grid: one column when two do
  not fit, two as today when they do; every theme shares it.
- Counts, arrival, neutral/invalid reasons and focus rules are unchanged. The
  Motion row's "no spinner" yields to the F03 loader only.

### Approved Explorer affected-column status realization — `DP-VQ06-EXPLORER`

**User-approved 2026-08-10:** Choice A establishes per-column remote-insertion
counts and one affected surviving-column path/fallback strip. It resolves the
final Explorer slice of `VQ-06`; Task 150 alone consumes it. Pool and Staging
remain owned by their receipts, and the separately approved `DP-VQ07` search
body does not alter this status family.

| Contract | Exact token requirement |
|---|---|
| Remote count | `explorer-remote-count` sits beside only the affected full `Home` / `Level 1` / `Level 2` / `Level 3` label and renders exact `1 new` / `{count} new` with accessible action `Show new in {full level label}`; initial hydration, local placement, and move-between-column do not count |
| Stable anchoring | Ordinary insertion binds `explorer-remote-arrival` and preserves path, selection, focus, first-visible stable ID, and viewport offset; never restore raw `scrollTop`, jump, select, or change path automatically |
| Path placement | `explorer-path-status` follows the surviving destination column's full label and precedes only that column's scrolling rows; removed suffix columns leave no ghost status/row/column/label; one later fallback replaces the prior strip |
| Path copy | Bind `path-fallback` and use the recipe's exact deleted/unavailable, archived, moved, generic invalid-path, and stale-placement sentences with `{destination}` equal to the nearest valid ancestor's visible title/full label or `Home` |
| Bit disappearance | Bind `selection-cleared`; render exact `“{title}” is no longer available. Selection cleared.` in the valid parent column and clear only Bit selection/reveal |
| Actions | `explorer-status-action` is only `Dismiss`; remote count is only `Show new in {level}`; no Retry, restore, reveal, Search, sibling choice, undo, navigation, or mutation action |
| Fallback/focus | Remove only invalid suffix, close stale placement without write, never choose sibling/ghost, then focus surviving nearest-valid ancestor row or destination full-label heading; ordinary arrival/status appearance never steals focus |
| Show new | Revalidate, scroll only that column to top, clear only its count, and focus the first surviving new row without selection/path change, otherwise its full-label heading; observing top clears without focus movement |
| Lifetime | Per-column count clears on its action/top observation/column close or path change/route exit or reload; path strip clears on Dismiss/next fallback/explicit user path change/route exit or reload; Scratch/theme/light-dark changes preserve open-column state; no timer or auto-dismiss |
| Motion | Indicator, strip, suffix removal, fallback, anchoring, scroll, and focus changes are immediate; no fade, slide, scale, spinner, pulse, ping, bounce, blink, flicker, or layout-transition animation; reduced motion is identical |
| Scope | No path semantics or anchoring algorithm change, product mutation, placement implementation, `VQ-07` search body, Pool/Staging role, abbreviated label, or theme-ID behavior/copy branch |

The affected-column family maps through Explorer-native theme roles:

| Theme | Role-family binding |
|---|---|
| GridDO | Compact column-label count chip and restrained technical strip using canonical border, muted, primary, text, action, and focus roles |
| Tiny Desk | Library-index count tab and catalog-paper status slip below the destination column label |
| Neumorphism | Named raised count control and shallow inset column notice within the existing shadow family |
| Claymorphism | Puffy non-color marker and shape-preserving soft ribbon attached to the destination clay column |
| Origami | Folded count tab and seam-attached paper strip with no ghost fold or repeated motion |
| Terminal | Variable-driven text count command and static destination-column status record with no fixed JSX color or blink |
| Retro Mac | Hard counter control and in-pane 1-bit system message below the full label with no new window or ghost pane |
| Graphite | Compact editorial index and strengthened-rule column note with restrained monochrome action |

### Shared Explorer consumer realization — Task 169 review amendment

**User-selected 2026-10-07:** this shared contract applies to every current and
future Inbox/Triage theme. Phase 34 realizes only retro-mac; this reflection
claims no implementation, rendered evidence, task acceptance or later-task
start. Existing DP receipts and accepted evidence remain immutable.

| Concern | Shared realization contract |
|---|---|
| Header | One fixed section-header row: theme-native icon/identity on the left, dedicated search control on the right. No persistent breadcrumb/path row or second search toolbar. Internal path/selection/scroll, full column labels, affected-column status, search-result breadcrumbs and Placement destination remain authoritative |
| Stored icon | Ordinary-column and result glyphs use their actual Node/Bit `icon` through the existing mapping/fallback. Same-database Grid edits update the same record projection. Theme roles may style glyph geometry/color treatment, never substitute a mock or render-time random icon |
| Consumer actions | Explicit Inbox Explorer presentation omits ordinary-card options/Direct Archive and past-deadline Done?/Mark as done/Dismiss controls. Keep independent NEW/Undo/reason and Scratch Archive. Ordinary Grid card appearance/actions remain their own consumer contract |
| Hover and cursor | Hover changes color only; no scale, translation, decorative shadow or stacking lift. Explorer items are not drag sources and expose neither grab nor grabbing. Selectable Nodes use pointer, non-activating Bit rows default; actual controls retain their own treatment. Keep focus/reveal/selection and valid/invalid/full drop-target feedback |
| Overdue incomplete Bit | Readable title/deadline, subdued theme-role surface, small static overdue mark with non-color/accessibility meaning. No title strike-through merely because the deadline passed; no unreadable title/deadline blur, pulse or completion/dismiss control |
| Completed Bit | Muted title with strike-through and static check mark. Completion and overdue do not collapse into the same state. Independent NEW/Undo/reason/focus remain readable and unobscured |
| State/data ownership | Project existing deadline/status/priority and preserve ordinary Grid dismissal semantics. No schema, completion/dismiss mutation, common eight-theme D-CARD redesign or new data model is adopted |
| Ordinary list chrome — user-selected 2026-10-08 | Keep Node-before-Bit groups and within-type order without an inter-type divider or visible `Bits` heading. Bit-only columns, including Level 3, start at the normal item inset without subsection-header space. Full column labels, item identities/keys/refs, navigation/reveal/scroll, drop targets and independent NEW/Undo/reason/focus remain |

Values remain centralized through existing semantic tokens and
`--triage-explorer-*` role aliases. Retro-mac compact-row measurements do not
become common theme dimensions or new numeric acceptance thresholds.

**Retro-mac ordinary-card distinction — user-selected 2026-10-08:** Nodes use
a small folder-tab outline, light surface, double border, slightly larger
plain base row and actual stored-icon glyph than a plain Bit, trailing chevron
and Light selected black inversion. Bits use a rectangular outline, subdued
gray surface, thin single border and smaller plain base row, retaining title,
priority and deadline inside the actual card. Metadata/progress where supplied
and independent NEW/Undo/reason expand naturally; a metadata Bit can therefore
be taller than a plain Node. Preserve focus, reveal/drop feedback, color-only
hover, pointer/default cursors, static overdue/completed marks and appropriate
Dark contrast. These exterior values belong only to retro-mac plus explicit
Inbox Explorer presentation, not ordinary Grid, Staging, search results or
other-theme card exteriors. Use actual-card roles and centralized values;
decorative folder outlines are noninteractive and must not clip content,
markers, controls or focus. The selected image is new design authority, not
pinned-prototype or mounted implementation evidence, and its enlarged pixels
are not product dimensions or numerical acceptance thresholds. See the
[Explorer recipe](recipes/inbox-triage-grid-explorer-visual-recipe.md) for the
selected image identity and retained source boundary.

### Approved Explorer replacement-search realization — `DP-VQ07`

**User-selected 2026-08-10:** Choice A retains theme-native Explorer chrome
and replaces only its four-column body with one dedicated whole-hierarchy
search body. Task 151 consumes the complete body after checkpoint acceptance;
Task 158 consumes only its result-Undo composition after `DP-VQ10` and Tasks
156–157. Ordinary-card Undo Task 156 remains independent.

**User-selected review amendment, 2026-10-07:** only the header/input placement
and its shared consumer boundary are superseded below. One search input now
occupies the right-hand header slot, with the fixed state line and scrolling
results replacing the complete four-column body. Keep whole-hierarchy query,
copy, revalidation, reveal, close, interruption, Undo and focus lifetimes;
never substitute the prototype's active-column filter. The original DP receipt
and historical release/verification records are not rewritten.

| Contract | Exact token requirement |
|---|---|
| Entry and body | `explorer-search-entry` retains accessible entry name `Search Explorer`; activation swaps only the body and focuses the single `explorer-search-field` with in-input `explorer-search-close` in the right-hand header slot. `explorer-search-body` contains one fixed `explorer-search-status` and one internally scrolling `explorer-search-results` viewport; no duplicate body input, overlay, dialog, fifth column, detached panel, or page scroll response |
| Input and close copy | Placeholder is exact `Search all Nodes and Bits`; `X` accessible name is exact `Clear and close Explorer search`; X and Escape clear active/interrupted query, results, scroll, and reveal, restore columns, and focus the logical header entry control |
| Result grammar | Each `explorer-search-result` preserves Node/Bit icon/color identity and adds visible `explorer-search-type`, title, full `explorer-search-breadcrumb`, and when required exact `explorer-search-duplicate` text `Duplicate {index} of {count}` in stable hierarchy order; no result is a drag source and no ID/coordinate/hidden root is exposed |
| State copy | Use exact `Search the entire Grid Explorer.`, `Searching Grid Explorer…`, `Updating results…`, `No results for “{query}”.`, `Search couldn’t be updated.`, `That item is no longer available. Results were updated.`, `Revealed “{title}” in {breadcrumb}.`, and `Restored “{title}” to {source}.`; request failure alone exposes exact `Try again` |
| Loading/stale/error | Initial loading has an empty result viewport; stale refresh retains prior rows, scroll, and focus; error retains prior successful rows when available; `aria-busy` and one-time state announcements replace spinner/shimmer or row-by-row announcements |
| Navigation/focus | Open focuses input; Arrow Down/Up moves result focus; Enter/pointer revalidates before selection; valid selection restores columns and focuses the actual revealed row; stale selection changes no path/selection/route and returns to input when the focused result disappears; `Try again` starts the next request and focuses input; Scratch switch preserves state without forcing focus |
| Reveal | `explorer-revealed-row` is a static non-color marker on the actual row and `explorer-reveal-status` sits directly below the Explorer header; it ends only on another item selection, path change, DnD start, search restart, route exit, or reload, never a timer |
| DnD interruption | DnD start alone closes the body and preserves query/results/scroll as mounted-page interrupted state; Drop/Cancel never auto-reopens; explicit entry activation restores it and focuses input; result selection, X, Escape, route exit, or reload clears it |
| Result Undo boundary | `explorer-search-undo` is a trailing exact `Undo` action only when later `DP-VQ10` allows it; operation-specific reason/pending/failure/conflict treatment is imported from Tasks 156–157. Terminal success keeps query/scroll, removes only that result, reports source restoration, and focuses the next result at the removed position or otherwise the input, never the previous result |
| Lifetime and motion | Request/status lines are request/event-owned and end on their specified next request, status, selection, clear/close, route exit, or reload; none auto-dismisses. Every swap, status, result removal, reveal, scroll, and focus handoff is immediate; no fade, slide, scale, skeleton shimmer, spinner, pulse, ping, bounce, blink, flicker, or layout-transition animation; reduced motion is identical |
| Scope | No query traversal/rank/exclusion change, global Search import, active-column search, ordinary-column fallback, placement mutation, `DP-VQ06-EXPLORER` change, `DP-VQ10` state invention, product implementation in Task 114, or theme-ID behavior/copy branch |

The replacement body maps through Explorer-search-native theme roles:

| Theme | Role-family binding |
|---|---|
| GridDO | Technical header search field, restrained body state rule, compact typed result rows, and canonical primary/action/focus roles |
| Tiny Desk | Library-index search tab, catalog-paper status slip, and stacked catalog result cards inside the Explorer body |
| Neumorphism | Inset search field and state trough with shallow raised result rows inside the existing shadow family |
| Claymorphism | Soft sculpted search field, shape-preserving status ribbon, and tactile typed result tiles without motion-led state |
| Origami | Folded search sheet, seam-attached state strip, and cut-paper result rows with no animated fold or ghost column |
| Terminal | Variable-driven command-line search, static status record, and text-led result records with no fixed JSX color, spinner, or blink |
| Retro Mac | Finder header search control, 1-bit body system status line, and hard bordered result list with no new window/dialog/ghost pane |
| Graphite | Editorial index field, strengthened-rule status caption, and restrained monochrome result rows with precise focus outline |

### Placement review amendment — Task170, 2026-10-08

Read the retained DP-VQ08/09 source/type/destination and direct-step rows below
with this bounded user-selected presentation exception. The original receipts
and accepted evidence remain unchanged. This draft requires exact supplemental
Task170 scope/adoption and claims neither implementation nor visual acceptance.

| Boundary | Exact requirement |
|---|---|
| Destination presentation | Direct/Staged Placement steps omit the visible breadcrumb/path line, including staged Result Title. Preserve captured destination/path identity, validation/invalidation, target-column ownership and destination-bearing status copy; Explorer attached status and search-result paths remain |
| Direct heading/focus | Omit visible `Choose a result type`; existing `DIRECT PLACEMENT` becomes the focusable heading with the actual entry-focus ref. Preserve source title and accessible step identity; no empty heading or new copy |
| Direct actions/reasons | One Node/Bit/Cancel row, in order, with equal flexible shares of the available width. Preserve disabled types, exact limits, native unavailable semantics and associated non-hover reasons below the row, plus the neither-available instruction. Long reasons remain readable |
| Staged compact geometry | Retain source/result title, Node/Bit type, Confirm/Cancel and content-based height. Reduce surplus padding/gaps and centrally bound retro-mac reliability spacing to actual two-line typography. Current 48px reserve is not a product dimension; preserve pre-Confirm rail/action reservation and fixed target-column geometry without clipping full status or controls |
| Preserved state authority | DP-VQ08 recovery copy/actions/operation IDs, DP-VQ09 source/title/limits, locks, Cancel/Escape, atomic commands, restoration and logical focus remain controlling. No tooltip-only recovery, hidden rail, maximum-height clipping, alternate target or shared-copy mutation |
| Theme/evidence boundary | Common omission and heading/action semantics continue to later L5 consumers; retro-mac geometry remains theme-specific. Verify physical Tab/action visibility and internal scroll at 1024px with fresh evidence. Historical failures/unverified states and other-theme task/evidence boundaries remain |

The amended [Placement recipe](recipes/inbox-triage-placement-affordances-visual-recipe.md)
owns this limited exception. Exact Tower bytes become Reflected only after
approved committed adoption and matching audit. Placement visual disposition
still precedes Newly/Undo; this amendment grants no cycle reset or extra cycle.

### Placement action-layout amendment — Task170 Cycle4, 2026-10-08

The user approved the revised layout direction after Cycle3 re-review. Read
the earlier Placement review amendment with this later, bounded exception;
the Cycle3 implementation has not received visual acceptance. The separate
one-cycle approval does not adopt these draft bytes or expand product owners.

| Boundary | Exact requirement |
|---|---|
| Direct action stack | Replace the earlier horizontal equal-share row with vertically stacked Node, Bit, then Cancel controls. Each fills the available inline width. Keep native order, disabled-type semantics, exact non-hover reasons and their action associations, title/length limits, source truth and DIRECT PLACEMENT heading focus |
| Direct Cancel distinction | Give Cancel a distinct secondary surface and/or outline from Node/Bit through centralized action roles. Retro-mac uses a subdued surface or lighter outline within its existing control family; preserve readable Light/Dark contrast, focus and availability. Secondary appearance must not imply that Cancel is disabled |
| Staged confirmation composition | Group the existing Confirm placement heading, actual item title, Node/Bit type and any required source-truth/full-target content on the left. Place the independent Confirm/Cancel action group horizontally to its right, vertically centered against that information group, rather than in a lower footer. Do not remove or rename content or nest actions inside an interactive summary |
| Staged reliability reservation | Keep a full-width reserved reliability area below the summary/action pair before Confirm. This supersedes only DP-VQ08's staged rail-above-lower-action-row spatial arrangement. Retain the right-hand action slot and original state-specific Confirm, Check again, Retry and Cancel controls, refs, locking and logical focus. Preserve exact full status, operation identity, announcements and lifetimes; the reservation is not removable blank space |
| Containment and motion | Preserve content-based growth, target-column geometry and its internal scroll ownership, static normal/reduced-motion behavior, readable long content and unclipped controls/focus. Verify the approved left/right grouping at 1024px; do not silently move the actions below the summary or change neighboring panes to fit it |
| Scope and evidence | Direct selection and Staged confirmation only; retain visible-path omission and all other DP-VQ08/09 contracts. Staged Result Title and direct confirmation retain their existing arrangements. Shared action composition continues to later L5 consumers; only retro-mac appearance values are realized here. Use fresh semantic and mounted pointer/Tab/scroll/state evidence, without new pixel thresholds or other-theme acceptance |

This exact three-file Tower amendment remains pending until the matching
supplemental receipt pins its bytes and Working commits and audits adoption.
Preserve prior Reflected contracts, receipts, results and failed/unverified
observations. The user's additional one-cycle approval is Cycle4 only after
the initial three consumed cycles; no reset, Cycle5 or Newly/Undo execution
follows from this amendment. Re-present Placement for user visual disposition.

### Placement chrome/focus amendment — Task170 Cycle5, 2026-10-08

The user selected the two generated screenshot edits and approved one further
Placement cycle after Cycle4. This later exception applies to Direct type
selection and Staged confirmation/reliability only. It does not accept the
Cycle4 implementation or adopt these uncommitted Tower draft bytes.

| Boundary | Exact requirement |
|---|---|
| Direct entry focus | Focus the actual available Node button on entry, considering both title limits and target validity. If Node is unavailable, focus the available Bit button; if neither type is available, focus Cancel. This supersedes the earlier direct heading-entry focus only. Preserve native disabled semantics, exact reasons/ARIA and independent explicit type selection; never select, advance or mutate automatically or steal focus on ordinary rerenders |
| Direct focused appearance | Retro-mac Light uses black surface/white text for the actual focused or hovered type control, making available Node initially contrast with white Bit. Keep visible keyboard focus and Dark contrast. Do not simulate focus with a permanently selected Node or force focus in browser verification |
| Direct text Cancel | Replace the outlined secondary Cancel exterior with borderless, background-free, shadow-free text. Use muted readable idle text, black text plus underline on hover in Light, equivalent Dark contrast and a visible keyboard-focus indicator. Preserve a real independent button/hit target, its existing label, no-write cancellation and focus return; prototype source observations specify appearance only |
| Header and close action | Place the existing step heading at the left of a theme-native header; retro-mac realizes a black strip/white heading. A decorative × in an independent right-hand close button has exact accessible name Cancel placement. It invokes the same cancellation guard/callback as body Cancel; pending/unknown/reconciling cannot gain a bypass. Keep heading/action refs and state-owned focus; no duplicate heading or new dialog/overlay |
| Staged title/type/actions | Give the actual item title stronger central size/weight and the Node/Bit type a compact rectangular outline. Retain source-truth/full-target content. In confirmation/pending, place Cancel then OK in native DOM/Tab order at the information group's right, vertically centered; OK retains the actual Confirm command/ref. Other recovery controls, labels, order, locks and focus remain authoritative |
| Neumorphism exception (Task 177, user, 2026-10-18) | Neumorphism does not show the header close button: it is removed from layout and focus order (`display: none`), not visually hidden; body Cancel and Escape remain the close path with the same guard, locks and return focus. The step heading stays a small muted uppercase label with bottom spacing equal to the plate padding. The Direct and Staged item title sits in a shallow inset well (`--theme-shadow-inset-sm`) at stronger size/weight. Staged confirmation stacks vertically instead of the title-left/actions-right row and lower type row: heading; title well with the Node/Bit type as a small inset tag in a fixed, non-shrinking area at its right (the title takes the remaining width and wraps); the primary action (OK, Retry or Check again) full width; Cancel full width; the reliability reservation below. The Cancel-then-OK DOM/Tab order of confirmation/pending is unchanged; neumorphism places OK above Cancel by CSS grid placement only, an accepted focus-order exception limited to that pair. Cancel stays neutral: on hover, stronger text with a shallow inset tint, never a destructive colour; on press, `--theme-shadow-inset-sm`. Motion: the raised actions' hover lift and its return on press transition `transform` only, over `--triage-pool-motion-duration` with `ease-out`, inside `prefers-reduced-motion: no-preference` (the shared reduced-motion rule keeps winning); shadow, colour, background and every enabled/disabled, validation, step or phase change stay immediate. Other themes keep the rows above |
| Compact containment | Reduce surplus spacing through retro-mac roles without a fixed maximum height, clipped text/focus/actions or hidden reliability. Preserve the lower full-width pre-Confirm reservation, state-driven growth and target-column internal scroll/geometry. Measure 1024px information/action balance; do not silently replace the requested right-hand group with a lower footer or change neighboring panes |
| Central copy and scope | Add only placementPresentation.stagedConfirm = OK and placementPresentation.cancelPlacement = Cancel placement to the central English copy owner and its direct test. Preserve every existing value and Direct confirmation/Result Title arrangements. Header/action/focus semantics are shared; retro-mac appearance does not activate other-theme realization or common-card/Newly/Undo work |

The two image identities and correspondence limits belong in the matching
scope receipt and Placement recipe. Enlarged preview pixels are not product
dimensions or acceptance tolerances. Exact new scope approval must include
the five Placement owners plus the two narrow central-copy owners before
Working writes them; the additional cycle alone grants no owner expansion.
The new canonical delta is pending exact adoption and audit. Preserve every
earlier receipt/result/failure and re-present Placement after Cycle5 only.

### Selected Placement frame/layout direction — Task170 Cycle6, 2026-10-09

After reviewing the Cycle5 implementation, the user selected the revised
Direct preview and final Staged preview with "괜찮네. 이렇게 작업하자."
This fixes the following later design direction; it does not visually accept
the Cycle5 implementation. The user subsequently answered "승인합니다" to the
exact request for one additional Cycle6. Preserve initial3 plus Cycle4/Cycle5
consumed: aggregate5; Cycle6 adds exactly one unconsumed cycle without reset.
These Tower draft bytes await exact supplemental scope/adoption and audit.

| Boundary | Exact requirement |
|---|---|
| Direct initial focus | Remove automatic entry focus from Node, Bit and body Cancel. Restore entry focus to the existing DIRECT PLACEMENT heading/ref, with no implicit selection, advance or write and no ordinary-rerender focus theft. Available Node and Bit start in the same idle surface; preserve native keyboard focus indication and actual hover/focus treatment after user input, disabled predicates, exact reasons/ARIA and explicit activation |
| Flush bracketed header | Direct selection and Staged confirmation/reliability use a continuous retro-mac black strip touching the top/left/right inner frame edges, without exterior padding or white inset gutters. Render separate visible square-bracket pairs around the existing heading and close glyph: [DIRECT PLACEMENT] or [CONFIRM PLACEMENT] at left and [×] at right. Brackets are presentation only; preserve exact existing heading text/accessibility and central Cancel placement accessible name, independent native close, original no-write Cancel callback/return focus and pending/unknown/reconciling lock suppression |
| Shared frame and title rhythm | Match Direct's rectangular outer outline to the selected Staged frame family; no extra Direct double outline or inset header frame. Use centralized retro-mac title typography and common body inset/gap roles across both selected surfaces. Increase Direct actual-title size slightly and give that title more top/bottom padding, preserving literal source text and natural wrapping. Do not reuse these roles to redesign cards, selected Scratch Context or neighboring panes |
| Staged content hierarchy | After the full-width header, place the actual item title on the left and independent horizontal body actions on the right, vertically centered in the same row. In confirmation/pending preserve native Cancel then OK order and the actual Confirm ref/command. Place the outlined Node/Bit tag in its own full-width lower row, aligned to the body's left inset, rather than inside the narrow title/actions information cell. Preserve required original-source/full-target content and original state-specific Check again/Retry/Cancel labels, order, locks, refs, focus, operation and lifetime |
| Button padding and compact height | Give both Staged body buttons comfortable internal block/inline padding and a distinct gap through centralized roles; padding must not be simulated by changing labels. Reduce surplus height through scoped body spacing/title/tag arrangement while retaining the lower full-width pre-Confirm reliability reservation and complete state copy. Do not replace that reservation with zero height, hidden status, a fixed maximum height, clipping or a lower action footer. Long content grows naturally inside the existing target-column scroll/geometry |
| Scope and evidence | Candidate product/test owners are the existing five Placement paths only. The two central copy owners and all existing strings remain read-only; the visible brackets create no new copy contract. Direct confirmation and Staged Result Title stay unchanged. Shared semantics remain distinct from retro-mac visual values. Fresh semantic and mounted focus/hover/close/containment/native Tab/wheel evidence must cover the changed hierarchy, 1920px and 1024px Light/Dark and static motion; no new pixel threshold, other-theme acceptance, producer/helper/pane expansion or Newly/Undo execution follows |

The Placement recipe pins the selected preview identities and correspondence
limits. Preview pixels are not product dimensions or implementation evidence.
Record the design approval as received, preserving every prior receipt,
Reflected amendment, failure and unverified/retained observation. A necessary
out-of-owner repair stops the affected slice. One exact additional-cycle
approval has now been received for Cycle6 only; a matching supplemental
execution receipt and audited exact adoption remain required before product
writes. On completed Cycle6 aggregate6/remaining0; no Cycle7, acceptance,
closure, Newly/Undo or publication follows. Do not request design or Cycle6
approval again.

### Placement visual-audit correction draft — Task170 Cycle7, 2026-10-10

The user reported five findings after Cycle6, then replaced color-regression
investigation with an explicit new white-background direction and added outer
Finder wrapper-border removal, then requested both modal widths match the
Finder Node/Bit cards. The user approved exactly one additional
Cycle7: "Cycle은 1회도 승인할게." Record that approval as received, not pending.
This bounded Tower draft is not implementation visual acceptance or an adopted
execution receipt. Preserve aggregate6 consumed; Cycle7approved1/unconsumed.
Preserve all earlier decisions, receipts and evidence without rewriting them.

| Boundary | Proposed exact correction |
|---|---|
| Direct post-selection confirmation | Extend the selected confirmation frame to Direct after either explicit Node or Bit selection, including its reached pending/recovery states. Use the same flush bracketed CONFIRM PLACEMENT header/independent guarded close, title-left/actions-right row, separate outlined type-tag row and lower full-width reliability reservation as Staged. Confirmation/pending body controls become Cancel then OK through the existing central OK value and original Confirm ref/command. Recovery labels/order/refs/locks remain unchanged. This later correction supersedes only the prior Direct-confirmation arrangement/label preservation boundary |
| Finder default card appearance | This is a new color choice, not restoration or diagnosis. Set ordinary Finder Node and Bit default backgrounds to the same centralized surface as Staging items: var(--triage-staging-surface), white in Light and the corresponding Staging surface in Dark. Include the Node decorative folder fill and actual Bit surface; replace the default gray/tinted base only. Do not gate the change on historical comparison, causal investigation or another color approval. Verify the resulting default surface after the change and retain distinct selected/hover/status presentation, data and producer logic; no global Grid/search/card redesign or Task169 history rewrite |
| Placement enclosing wrapper | When Direct or Staged Placement is mounted inside Finder, remove the enclosing Finder target/row border, outline and ring that surround both modal and Node/Bit cards, including the pending-confirmation double outline. Keep the modal's own rectangular frame, individual card contours, type-tag border and native focus indicators. This is a scoped wrapper-paint change, not a column geometry, hit-testing, drop-predicate or modal layout change |
| Modal width matches Finder cards | Expand Direct and Staged Placement outer frames to the same available inline width and left/right alignment as the ordinary Node/Bit card boxes in their owning Finder column. Include Direct's selection and post-type confirmation surfaces. Remove only modal-specific extra inline gutters, including the current horizontal m-2 inset; retain the column's existing padding, width and scroll owner. Use responsive available width instead of a fixed screenshot width. Preserve content-based height, internal body padding, full title/status growth and native focus; no horizontal overflow, neighboring-pane resize or card-width change |
| Drag feedback covers card paint | For Breakdown and Staged drags, the Finder feedback surface must visibly cover the relevant Node/Bit card paint instead of remaining behind child surfaces. Keep original drop targets, hit testing, eligibility, collision geometry, DOM/data, commands and column scroll. Feedback must clear on drag exit/end/cancel and must not conceal Placement confirmation/recovery, source truth or retained status after drop. Do not unmount cards or alter their ordinary idle presentation |
| Unavailable Staged destinations | Replace the gray unavailable treatment for Staged Node destinations at Level 3 and Staged Bit at Home with the existing Return to Breakdown red family. Bind scoped Finder invalid-surface/border/ink roles to that existing token family; do not change Return to Breakdown itself. Preserve existing acceptance predicates, invalid-drop no-write behavior and full-target distinctions; no global full/invalid recoloring |
| Header close glyph | Direct selection and both Direct/Staged confirmation headers use the same centralized strip font size for heading and visible bracketed close glyph. Remove the independent 14px glyph override against the 7px heading. Preserve a usable native hit target, focus indicator, accessible Cancel placement name, decorative brackets and lock/cancellation semantics |
| Staged minimum height and body controls | The user's additional Cycle7 direction reduces the Staged confirmation modal's minimum-height floor to 70% of its current baseline and modestly increases Cancel/OK font size and real block/inline padding. Identify and record the existing minimum-height contributors and matching idle baseline before changing them; do not invent an existing modal min-height declaration or describe a content-grown actual height as exactly 70%. Remove hover-only visual changes from these Staged body Cancel/OK controls through scoped roles, while preserving their idle distinction, disabled/locked treatment and native keyboard focus indicator. Keep title-left/actions-right centering, Cancel-OK native order, separate lower type tag, aligned card-width frame and nonzero full-width reliability reservation. Full titles/status may naturally exceed the lowered floor. Verify 1920/1024 Light/Dark containment, readable title space, button padding/gap and native action access; no clipping, fixed maximum height, footer fallback or neighboring geometry change. Direct selection/text-Cancel hover and recovery Check again/Retry remain outside this additional hover amendment |
| Scope and evidence | The five candidate product/test files remain globals.css, hierarchy-explorer.tsx and its direct test, triage-workspace.test.tsx and inbox-triage-theme-realization.test.tsx. Internal scope includes PlacementAffordance, scoped ordinary-Finder surface selectors and necessary ExplorerColumn/NodeDropCell drag/wrapper-presentation roles only. Actual card source/tests, producers/helpers/copy/Workspace implementation and pane geometry remain preservation inputs. A required additional owner stops the affected slice. Fresh Direct Node/Bit confirmation, modal/card inline-width alignment, default-card/Staging surface equality, absence of the enclosing wrapper border and native drag layering/invalid-color/cleanup evidence is required in addition to modal regression; previous 32 native passes do not prove these new invariants |

Tower03 is the sole author of this three-file draft. Working170/01 owns the
new exact supplemental receipt/ledger, implementation/tests/evidence and
commits after the matching exact scope receipt and audited adoption. Direction
and exactly one additional Cycle7 are already approved; do not ask again.
The exact supplemental receipt/adoption remains Working-owned. Keep its
user-facing proposal concise: required scope fields and the actual new owner/
draft pins, with immutable preservation/evidence records referenced by path,
commit and hash instead of repeating all previous payloads or raw history.
Approval still binds the entire exact new receipt; brevity does not grant
scope expansion or silently change installed workflow policy. No reset,
Cycle8, Newly/Undo, acceptance, closure or publication follows. Revalidate
the separate dev/output consumer before affected build/runtime use; do not
adopt or signal it without proven authority. Re-present the bounded checkpoint.

### User-selected Task170 final visual refinement — 2026-10-12

After the Newly/Undo checkpoint at
`f3e04607d6e0aa042344d141cd153e8d8bc77904`, the user confirmed all eight
visual findings, selected the taller-Node preview, and approved continuing in
the same Working with a maximum of three additional cycles. This is targeted
feedback and a Task170-only budget exception; it is not final task acceptance.
Tower03 authors this bounded draft. Its exact bytes remain pending adoption
through Working170/01's supplemental receipt/start and immediate audit.

| Finding | Selected bounded direction |
|---|---|
| 1 — Finder Node height | Enlarge ordinary Inbox Finder Node cards vertically, retaining their responsive width, folder tab and double contour. Keep the actual Undo control and glyph size; add enough body height and block padding for the entire control and native focus indicator to fit inside the card. Apply consistent Node minimum height with/without NEW or Undo, including selected Nodes; retain natural title/content growth. Default Grid/search consumers and Bit card sizes are unchanged |
| 2 — NEW alignment | Center the Node NEW marker vertically within the enlarged painted body, together with the existing icon/title/action alignment. Do not confuse the raised folder tab or outer wrapper rectangle with the actual body center. Preserve marker identity, unavailable action access, selection and content |
| 3 — Level-2 Node paint | During Staged Node drag, remove the unavailable red treatment from Level-2 Node cards. Retain the Level-3 column's unavailable feedback. This is a display exception only: keep actual target eligibility, disabled meaning, invalid-drop no-write behavior, source/target IDs and commands |
| 4 — Unavailable pattern | Use the current ordinary Finder DND diagonal pattern and border treatment for the named unavailable Staged destinations; change only the background color family to the existing Return-to-Breakdown red family. Do not retain a separate solid red border plus flat-fill design. Preserve allowed/full/invalid distinctions and existing drop rules |
| 5 — Feedback over Bits | Allowed and unavailable Finder row feedback must cover actual Bit card paint as well as the row background. Keep the feedback non-interactive, retain the drag token and actual native target access, and clear it on exit/reentry/end/cancel/drop. Do not unmount cards or cover the post-drop Placement/status surface |
| 6 — Return to Breakdown | Cover the complete Breakdown body below its section header, including the selected-Scratch context and rows, with the same diagonal feedback design. Retain the red-family entered-state treatment. Preserve the actual return target, guarded unstage command, source restoration, copy, focus and existing status/lifetime; the section header stays exposed |
| 7 — Remove from Staging | Reserve layout space when the Remove target appears, reducing the Nodes/Bits display viewports instead of painting over them. Preserve each internal card's width, height, typography and controls; scroll exposes remaining cards rather than scaling/compressing them. Keep the outer Staging pane and column widths, current grouping, native target identity, eligibility and removal command. The intended viewport/drop-target rectangle changes follow the in-flow layout; collision logic is not redesigned |
| 8 — Placement close | Modestly enlarge the visible bracketed close glyph in Direct selection and Direct/Staged confirmation headers. Keep brackets, heading font, flush strip, current native hit area, keyboard indicator, accessible name, guarded Cancel callback, refs and locks. This supersedes only the prior requirement that close glyph and heading resolve to exactly the same font size |

The selected raster is preview-only input, not a product asset or a mounted
acceptance gate. Its identity and the detailed card invariants are recorded in
the [Newly/Undo recipe](recipes/inbox-triage-newly-placed-undo-visual-recipe.md);
the [Placement recipe](recipes/inbox-triage-placement-affordances-visual-recipe.md)
records the affected drag/header exception. Semantic presentation roles remain
shared; new visual values apply only to retro-mac. Preserve other-theme
presentation and every unchanged producer, operation, lock, tooltip/recovery,
metadata, source/destination, focus and event-owned lifetime contract.

This later amendment supersedes only the named card geometry, drag paint,
return-overlay extent, Remove target layout and close-glyph size. Task169 and
all prior acceptances/receipts/history remain immutable. Task170 stays `[ ]`.
The previous ten consumed cycles remain recorded; use only needed cycles from
the approved maximum three, with no reset or automatic fourth cycle. Global
skill/adapter policy, Task171, acceptance, closure and publication are unchanged.

### Task170 Bit/Return visual follow-up — 2026-10-12

At checkpoint `34dc7addebd95c052a49ec87b08d179bbde81a93`, the user found
the enlarged Node satisfactory and requested two further display corrections.
This is targeted feedback, not Task170 acceptance. The current batch consumed
cycles11-12 and has one unused product cycle13 and one observer correction;
retain those counters without a reset or a new budget request.

| Boundary | User-selected follow-up |
|---|---|
| Ordinary Finder Bit base | Use the current NEW/Undo Bit version as the common ordinary inbox-explorer Bit frame, body spacing, alignment and minimum-height baseline. Apply that base to Bits with/without NEW or Undo, preserving natural metadata/title growth and state distinctions. This expressly supersedes the prior ordinary Bit dimension-preservation boundary only for the requested common base. Preserve literal metadata, selection, default Grid/search/other-region consumers and unchanged Node geometry |
| Optional NEW/Undo | Marker provenance and Undo eligibility remain authoritative. Common presentation must not add NEW, fabricate provenance or show an Undo command on an ordinary Bit that lacks it. Keep the existing actual action/ref, tooltip/visible-recovery partition, disabled reason access, independent activation, locks, operations and focus/lifetime |
| Return to Breakdown palette | Use a positive green family for the Return feedback, including its entered-state background/ink, retaining the current diagonal design, header-excluded full-body coverage, idle/entered distinction, text/non-color cues, native target and actual return command |
| Unavailable palette isolation | Finder unavailable Staged Node Level3/Bit Home and other already scoped rejection feedback remain red. Separate the Return green role from the currently shared unavailable background alias; retain the current diagonal/border treatment, Level2 suppression, Bit coverage/cleanup and invalid-drop no-write semantics. Changing Return must not make a prohibited destination look permitted |

Only these two requested display deltas supersede prior Task170 direction.
Tower03's four-file draft remains pending exact Working-owned supplemental
scope/adoption; existing receipts and successful/failed captures stay immutable.
Use the already approved remaining Cycle13 after matching adoption and fresh
guards, with no new writer, owner, producer/copy/helper, acceptance or closure.
Fresh 1920/1024 Light/Dark normal/reduced evidence must compare ordinary Bits
with/without NEW/Undo, metadata/status variants and native tooltip/ref/action
preservation; independently observe green Return and red unavailable feedback,
return/drop/cancel cleanup and durable no-write/return behavior. Stop at the
Task170 visual checkpoint; product budget becomes aggregate13/remaining0 only
when that actual product loop is consumed. No automatic Cycle14 follows.

### Approved Placement fixed-reliability-rail realization — `DP-VQ08`

**User-selected 2026-08-10:** Choice A retains the captured target-column
Placement Affordance and inserts one fixed two-line reliability rail below its
source/type/destination summary and above one fixed action row. Task 153 alone
consumes this contract after Task 115 checkpoint acceptance.

| Contract | Exact token requirement |
|---|---|
| Surface binding | `data-placement-reliability="pending|unknown|reconciling|not-applied|stale-source|stale-target"` binds one `placement-reliability-rail` inside the captured affordance; the source/type/destination summary stays visible, geometry is reserved before Confirm, and the target column does not expand or clip controls |
| Pending / unknown / reconcile copy | Use exact `Placing “{title}” in {destination}…`, `We couldn’t confirm whether “{title}” was placed.`, and `Checking whether “{title}” was placed…`; unknown alone exposes exact `Check again`, which performs read-only reconciliation with the same operation ID and never resends placement |
| Failure / stale copy | Authoritative `not_applied` uses exact `“{title}” wasn’t placed. Your source is unchanged.` with `Retry` then `Cancel`; stale source uses exact `The source changed. Nothing was placed. Cancel and drag it again.`; stale target uses exact `The destination changed. Nothing was placed. Cancel and drag to the current destination.`; stale states expose only `Cancel` |
| Result mapping | `applied|already_applied` maps only to success; `not_applied` maps only to the retryable row; returned authoritative facts classify `rejected|conflict` as `stale-source` or `stale-target`; no generic failure fallback or guessed side is allowed |
| Retry boundary | `placement-reliability-retry` exists only for authoritative `not_applied`, reuses the logical operation and preallocated result ID, and returns to pending; rejected/conflict, unknown/reconciling, and stale states never Retry, auto-retry, compensate, or infer success |
| Focus and locking | Pending retains focus on rendered unavailable Confirm; unknown focuses `Check again`, reconciliation retains that action position, not-applied focuses `Retry`, stale focuses `Cancel`, and Cancel/Escape returns to surviving source grip/candidate or the owning section heading; pending/reconciling lock Escape, Cancel, and all conflicting interactions |
| Success | Announce exact `Placed “{title}” in {destination}.` once at authoritative `applied`/`already_applied`, remove the affordance without an intermediate timer/card, render and focus the actual Node/Bit card, and leave all Newly Placed/Undo appearance to `DP-VQ10` |
| Lifetime / accessibility | Pending, unknown, and reconcile are operation/result-owned; not-applied and stale persist until their named action; none auto-dismisses. The visible rail is one polite atomic status with text plus a static non-color state mark and one announcement per changed sentence, never per rerender |
| Motion | Rail/action replacement, affordance removal, actual-card insertion, and focus handoff are immediate and static; no fade, slide, scale, skeleton, shimmer, spinner, progress loop, pulse, ping, bounce, blink, flicker, or layout-transition animation; reduced motion is identical |
| Scope | No toast/dialog/global alert/detached or adjacent surface, optimistic result/source change, alternate-target implication, prototype or existing-product reliability authority, `VQ-09`/`DP-VQ10` invention, product implementation in Task 115, or theme-ID behavior/copy branch |

The fixed rail maps through Placement-native theme roles without product JSX
theme branching or unsupported literal values:

| Theme | Role-family binding |
|---|---|
| GridDO | Restrained technical status rail with canonical semantic border, text, action, and focus roles |
| Tiny Desk | Narrow pinned status slip beneath the retained placement summary |
| Neumorphism | Shallow inset status trough inside the existing shadow family |
| Claymorphism | Compact sculpted status ribbon whose static shape carries state without motion |
| Origami | Seam-attached status strip with a fixed paper edge and no animated fold |
| Terminal | Variable-driven one-line `[SYS]` status record with text/non-color cue and no blink |
| Retro Mac | In-pane 1-bit system line with hard action controls and no new window or dialog |
| Graphite | Strengthened-rule status caption with restrained monochrome action and precise focus outline |

### Approved Placement compact title/limit realization — `DP-VQ09`

**User-selected 2026-08-11:** Choice A retains the captured target-column
Placement Affordance and adds one compact staged Result Title step plus one
compact direct Node/Bit eligibility step. Task 154 alone consumes this contract
after Task 116 checkpoint acceptance.

| Contract | Exact token requirement |
|---|---|
| Surface binding | `data-placement-title-step="staged-result-title|direct-type-limit"` binds one compact step inside the existing target-column scroll content; neither step expands/clips the column or opens a dialog |
| Staged trigger | `placement-result-title-shell` appears only when staged source length exceeds the chosen type limit (`Node=100`, `Bit=200`); within-limit staged placement keeps the exact source title and skips the step |
| Staged copy | Use exact `RESULT TITLE`, `Name this {Node|Bit}`, `The source is {count} characters. A {Node|Bit} title can be up to {limit}. The source won’t change.`, label `Result title`, counter `{count} / {limit}`, errors `Enter a result title.` and `Use {limit} characters or fewer.`, and actions `Continue`, `Cancel` |
| Staged validation | Start with an empty draft; accept input without silent clipping, truncation, source-prefill normalization, or source mutation; `placement-result-title-continue` is unavailable until canonical non-empty/length validation passes |
| Direct structure | Use exact `DIRECT PLACEMENT`, `Choose a result type`, retained source/destination, `Node`, `Bit`, and `Cancel`; direct placement exposes no Result Title input |
| Direct limits | `1–100` enables Node/Bit; `101–200` disables Node with exact `Node titles can be up to 100 characters. This source has {count}.`; `201–1000` disables both, adds exact Bit reason `Bit titles can be up to 200 characters. This source has {count}.`, and shows `This source is too long for direct placement. Cancel and stage it first.` |
| Accessibility | Staged entry focuses `Result title`; direct entry focuses its heading; unavailable type rows remain visible with native unavailable semantics and associated non-hover reasons; errors/counters do not move focus or announce every keystroke |
| Advance / Cancel | Valid Continue or an available direct type focuses the next placement-step heading; Cancel/Escape writes nothing, discards only the draft, and returns to the surviving candidate/grip or its owning section heading |
| Invalidation | Source/candidate/target/path invalidation closes the step, discards the draft, writes nothing, announces the named authoritative change once, and uses the same safe focus fallback; only a dirty staged draft may use native unload guard |
| Motion | Step, validation, close, and focus changes are immediate/static; no fade, slide, scale, spinner, shimmer, pulse, ping, bounce, blink, flicker, or layout-transition animation; reduced motion is identical |
| Scope | No source edit/truncation, direct hidden editor, create/generic dialog, automatic type/target fallback, prototype authority, product implementation in Task 116, `DP-VQ10` invention, or theme-ID behavior/copy branch |

The compact steps map through Placement-native roles without product JSX theme
branching or unsupported literal values:

| Theme | Role-family binding |
|---|---|
| GridDO | Compact technical form card and ruled eligibility rows with canonical error/action/focus roles |
| Tiny Desk | Pinned paper form slip and library-index type rows inside the target column |
| Neumorphism | Raised compact step with inset field, counter, reason trough, and existing shadow variables |
| Claymorphism | Sculpted compact form plate and tactile type rows with static availability shape |
| Origami | Folded label sheet, seam-bound field/error, and cut-paper rows with no animated fold |
| Terminal | Variable-driven prompt, static count/error record, and `[N]`/`[B]` rows with textual unavailable reasons |
| Retro Mac | In-pane compact system form with hard field/buttons and disabled rows; no new window/dialog |
| Graphite | Restrained registry form and strengthened-rule rows with monochrome reason and precise focus outline |

### Approved Newly Placed / Undo realization — `DP-VQ10`

**User-selected 2026-08-11:** Choice A keeps the actual common Node/Bit card
unchanged and composes a static Newly marker, separate trailing Undo action,
and one card-attached always-visible status rail in the same Explorer item
wrapper. Task 157 alone consumes this contract after Task 117 checkpoint
acceptance.

| Contract | Exact token requirement |
|---|---|
| Independent binding | Independent `selected`, `newly-placed`, and `data-undo-state="checking|available|reenabled|result-mutated|descendants|placement-open|operation-locked|edit-blocked|pending|unknown|reconciling|not-applied|conflict|success"`; selected treatment/focus remains authoritative and Newly/eligibility never clears or replaces it |
| Placement | `newly-marker` stays at the actual card's leading corner; `newly-undo-action` occupies one stable trailing slot; `newly-status-rail` follows the unchanged actual card inside the same Explorer item wrapper. The rail is not a card footer, menu, toast, dialog, disclosure-only surface, or second card |
| Initial checking | `data-undo-state="checking"` uses exact `Checking whether Undo is available…`; keep the trailing `Undo` keyboard-focusable with `aria-disabled="true"`, suppress activation and focus movement, end at the first authoritative eligibility classification, and never imply a shared operation lock |
| Available / re-enabled copy | Use exact `Undo this placement.` and `Undo is available again.` with `Undo`; re-enabled announces once without focus movement and persists until Undo, another eligibility change, next activation of that card, or route exit/reload, never a timer |
| Ineligible copy | Result mutation: `This item changed after placement. Undo is unavailable.`; descendants: `Undo newly placed items below this one first.`; open placement: `Finish or cancel the placement in progress first.`; shared lock: `Wait for the current action to finish.`; Edit: `Save or cancel the current edit before undoing.`; unknown mutation/conflict fallback: `This item or its source changed. Undo is unavailable.` |
| Unavailable action | Keep `Undo` in the stable slot, keyboard-focusable with `aria-disabled="true"`, programmatic activation suppressed, and associated to the visible current reason; never require hover or invoke a late-error mutation |
| Pending / unknown / reconcile copy | Use exact `Undoing “{title}”…`, `We couldn’t confirm whether “{title}” was undone.`, and `Checking whether “{title}” was undone…`; unknown exposes `Check again`, which performs read-only reconciliation with the same operation ID and never resends Undo |
| Not-applied / conflict | Authoritative `not_applied` uses exact `“{title}” wasn’t undone. Nothing changed.` and exposes `Retry`; rejected/conflict uses the narrow authoritative ineligible reason, otherwise exact `This item or its source changed. Undo is unavailable.`, and never exposes Retry |
| Retry / success | `Retry` exists only for authoritative `not_applied`, reuses the logical operation ID, and returns to pending. `applied|already_applied` uses `data-undo-state="success"`, announces exact `Restored “{source}”.` once with no trailing action, lasts only through the committed-result removal/focus handoff, removes only the committed result, and never focuses/scrolls the restored source |
| Focus | Pending retains the stable Undo slot; unknown focuses `Check again`; reconcile retains it; not-applied focuses `Retry`; conflict focuses the unavailable Undo slot. Ordinary success focuses next card, then previous card, then column heading; Task 158 alone owns search-result focus composition |
| Lifetime / accessibility | Marker/ordinary rail follow mounted-page provenance through Scratch/path/theme/light-dark changes and end on Inbox route exit/reload; operation states persist to their authoritative result/action. One visible polite atomic rail announces each changed sentence once, never per rerender; text plus static non-color mark carries meaning |
| Motion | Marker, rail/action/state changes, result removal, and focus handoff are immediate/static; no fade, slide, scale, skeleton, shimmer, spinner, progress loop, pulse, ping, bounce, blink, flicker, or layout-transition animation; reduced motion is identical |
| Scope | No selection/navigation/search eligibility change, optimistic removal, cascade/best-effort restoration, current main-card menu, generic disabled control, common-card redesign, product implementation in Task 117, Task 118 start, or theme-ID behavior/copy branch |

The marker/action/rail map through existing theme families without product JSX
theme branching or unsupported literal values:

| Theme | Role-family binding |
|---|---|
| GridDO | Static sky dot and technical `NEW`; ruled rail and canonical separate Undo |
| Tiny Desk | Static yellow paper edge/amber pin; stationery note rail and brown Undo |
| Neumorphism | Static violet-blue dot/`NEW`; inset reason trough and raised Undo without pulse |
| Claymorphism | Static sky badge; sculpted reason ribbon and tactile rose Undo |
| Origami | Static folded-corner marker; seam-attached rail and rose Undo with no animated fold |
| Terminal | Textual `[new]`; variable-driven `[UNDO]` and one-line status record with no blink/glow loop |
| Retro Mac | Static 1-bit `[NEW]`; hard Undo and in-item system line preserving selected inversion |
| Graphite | Restrained black `NEW`; strengthened-rule caption and labeled Undo with precise focus |

### Ordinary Finder Newly/Undo amendment — Task170, 2026-10-08

The user's selected ordinary Finder amendment supersedes only the original
DP-VQ10 leading-marker/trailing-action placement and the two reason-display
states below. Read the original role/state/surface tables and theme-family
mapping with this exception for the explicit ordinary `inbox-explorer`
NodeCard/BitCard consumers. Preserve historical decision receipts and accepted
Task117/157 evidence. This frozen direction needs exact Task170 scope/adoption;
it does not claim implementation or acceptance of any theme.

| Boundary | Exact requirement |
|---|---|
| Ordinary card composition | Vertically center NEW and the actual content group. Visually place an independent stable Undo action inside the card's right edge. Preserve real title/icon, deadline/priority/progress/state, selection/reveal, refs and natural metadata/status expansion. Never nest Undo inside Node navigation or propagate its pointer/keyboard activation to the card |
| Ordinary Undo | Use existing Lucide `Undo2` as a decorative glyph in the independent Undo control, retaining its accessible action name and actual focus/hit target. Keep NEW when eligibility is lost. Distinct Check again/Retry controls retain their meaning and labels |
| Three tooltip states only | Exact `Undo this placement.` for ordinary available, `This item changed after placement. Undo is unavailable.` for nonterminal result-mutated eligibility and `Finish or cancel the placement in progress first.` for nonterminal placement-open eligibility (user, Task 177, 2026-10-19) use an above-action hover/keyboard-focus tooltip instead of a visible reason line. Branch on authoritative state/phase, not copy equality; reserve no empty rail for these three states |
| Unavailable/accessibility | Keep a visibly subdued, keyboard-focusable aria-disabled Undo in the same slot with mutation suppressed. Associate the exact current reason programmatically; retain existing once-per-change announcements. Neither color nor pointer hover is the only accessible meaning |
| Visible reasons/recovery | Checking, re-enabled, descendants, operation-locked and edit-blocked remain visible. Pending/unknown/reconciling/not-applied/rejected/conflict/success retain original status/announcements, operations, focus and event-ended lifetimes. Terminal rejected/conflict remains visible even when its sentence matches the ordinary tooltip reason |
| Central roles/static display | Use existing marker/action/status roles and semantic `newly-undo-icon` / `newly-undo-tooltip` bindings for the ordinary consumer. Bind theme appearance centrally. Tooltip and state transitions are static in normal/reduced motion, without inherited primitive fade/zoom/slide or theme-ID JSX. The Task 179A Explorer title tooltip binds its own `explorer-title-tooltip` role with the same static display; Neumorphism reuses its Undo plate and other themes the base plate |
| Retro-mac geometry | Preserve accepted folder-tab/double-outline Node and rectangular single-outline Bit. Center the content group, provide internal right action space and selected/disabled contrast, and prevent title/metadata/NEW/action/focus clipping. No enlarged-source dimensions or new numerical fidelity threshold |
| Preserved consumers | Ordinary Grid and replacement-search Undo keep their existing presentation. Common behavior applies to current/future ordinary L5 consumers; retro-mac values do not become other-theme geometry. Common eight-theme D-CARD/P29-01 and Korean QA stay deferred |

The amended [Newly/Undo recipe](recipes/inbox-triage-newly-placed-undo-visual-recipe.md)
owns the exact state/surface exception. Task170's matching scope receipt pins
the actual Q01 card/test owners, canonical delta and evidence. Reflect only
after exact committed adoption and matching audit. DP-VQ08/09 placement,
DP-VQ10 transactions/locks/recovery/focus/lifetime and other accepted contracts
are otherwise unchanged.

### Undo slot status amendment — feedback lane, Phase 50

Feedback F07 and F09 amend `DP-VQ10` and the Ordinary Finder amendment above:
the Undo slot becomes the Undo operation's status slot, and the always-visible
`newly-status-rail` with its text recovery actions goes. It applies to
ordinary Explorer Newly rows and to replacement-search results, which import
this treatment (superseding the "Preserved consumers" row for search results;
user, 2026-10-22).

| Undo state | Slot shows | Tooltip and announcement |
|---|---|---|
| Available, re-enabled | `↶` (the existing `Undo2` glyph) | `Undo this placement.` / `Undo is available again.`; re-enabled still announces once |
| Checking, ineligible (result mutated, descendants, placement open, operation locked, edit blocked) | `↶`, unavailable and focusable (`aria-disabled`) | The exact current reason from the tables above |
| Pending | The loader after `DISPLAY_DELAY_MS`, unavailable | `Undoing “{title}”…`; the existing announcement |
| Unknown | `?` as a button that runs `Check again` | The unknown sentence plus `Select to check again.` |
| Reconciling | Keeps `?`, then the loader after the delay; the button is unavailable at once | The checking sentence |
| Not applied | `!` as a button that runs `Retry` | The not-applied sentence plus `Select to try again.` |
| Rejected, conflict | `!`, unavailable and focusable (`aria-disabled`) | The narrow or canonical conflict reason |
| Success | As today: the committed result is removed | `Restored “{source}”.` once |

An unavailable `↶` and an action-less `!` use `aria-disabled="true"`, never
the `disabled` attribute: they stay in the Tab order and take focus, their
activation is suppressed, and their reason tooltip shows on keyboard focus as
well as on hover (F07, F09; user, 2026-10-22). The card body keeps its Task 179A truncated-title tooltip; the slot shows
only its own tooltip, and one tooltip shows at a time. The row keeps its
width; NEW, selection, the separate slot control, the operation identity and
the focus destinations stay. Only `?` and `!` add item
emphasis. The `newly-status-rail`, `newly-status-mark`, `newly-status-action`
and `newly-status-reason` roles retire; the slot uses the
[Feedback Status Surfaces](#feedback-status-surfaces) roles. Until Phase 50 the
contracts above stay in force as built.

### Approved Completion Blocker / Withdrawal realization — `DP-VQ11`

**User-selected 2026-08-11:** Choice A keeps page-local blockers attached to
their Add or Scratch-title source status regions and reserves the vacated
Breakdown completion slot for real persisted eligibility withdrawal. Task 160
alone consumes this contract after Task 118 checkpoint acceptance.

**Amended by user decision in Task 178 (2026-10-19), every theme:** page-local blockers keep
suppressing the completion presentation but render no copy, mark, programmatic
description or announcement; the Add draft and the open title editor are their
own cue. The Add and Title placement/copy rows below are superseded, the
blocker roles are retired, and the eyebrow/meta keeps `Selected Scratch`.
Withdrawal and every other row are unchanged.

| Contract | Exact token requirement |
|---|---|
| Independent binding | `completion-blocked` never changes persisted eligibility; `completion-withdrawn` requires a real transition from presented completion to persisted ineligibility. Neither state implies Archive success, mutation, persistence, or a disabled stale completion control |
| Add placement / copy | **Superseded (Task 178, 2026-10-19).** Was: bind `breakdown-add-completion-blocker` immediately below the stable Add field/control row with exact `Add this idea or clear the draft to complete this Scratch.`; keep `DP-VQ05` reliability copy first when both occupy the source status area |
| Title placement / copy | **Superseded (Task 178, 2026-10-19).** Was: under approved Task 160 compatibility C1, `open|dirty|saving|reconciling` replace only the existing Context eyebrow/meta value `Selected Scratch` with static `context-completion-blocker-mark` plus the exact blocker sentence; visual `offline|not_applied|conflict` append the matching exact blocker sentence after the current editor-state sentence inside the existing source-bound issue-overlay status column. `open|dirty`: `Save or cancel the Scratch title edit to complete this Scratch.`; `saving`: `Saving the Scratch title before completion…`; `conflicted`: `Resolve the Scratch title conflict to complete this Scratch.`; `reconciling`: `Checking the Scratch title before completion…`. Restore `Selected Scratch` without moving focus when clear; add no ordinary status row, overlay, panel, or action |
| Existing actions only | Add creates no completion action; its existing Add/text-editing paths resolve the draft. Title uses only the current `DP-VQ04` actions. No blocker auto-adds, clears, saves, cancels, persists, archives, or moves focus |
| Fixed Context compatibility | Preserve fixed Context geometry: `104px` except retro-mac `120.25px` under the Phase 34 / Task 167 P34-04 Context-geometry supplement, title field and timestamp, fixed `9.5rem` action region, Save/Cancel, saving/reconciling progress action, issue-overlay actions, and current logical focus. C1 supersedes only the stale persistent Scratch-title editor-status placement; every other `DP-VQ11` copy, behavior, focus, lifetime, theme, and prohibition remains unchanged |
| Withdrawal placement | Remove `archive-section-scrim`, `archive-card`, `archive-complete-context`, and `archive-reopen`, then use `archive-withdrawal-status` plus static `archive-withdrawal-mark` in the vacated Breakdown completion slot; never substitute an ordinary empty state, toast, dialog, global banner, or detached panel |
| Withdrawal copy | Active row only: `Completion is no longer available because a Breakdown item is active.`; staged candidate only: `Completion is no longer available because an item is in Staging.`; both: `Completion is no longer available because Breakdown and Staging have active items.` |
| Inactive Scratch | Archived/deleted/inactive selected Scratch exits through the canonical workspace owner and renders no blocker/withdrawal status or stale Archive control |
| Focus / accessibility | Blockers preserve source logical focus (no copy since Task 178). Local withdrawal retains the action's canonical focus; remote arrival never steals focus; removal of the focused Archive/Cancel/Reopen target hands focus to the surviving Breakdown heading. Announce a new/changed sentence once through a visible polite atomic status |
| Lifetime / recovery | Blockers persist while their otherwise-eligible source cause exists. Withdrawal persists only for the same selected active Scratch while its current aggregate cause exists. Scratch switch/route exit/reload/unmount clears page-memory status; current-truth recovery removes it and returns ownership to Task 159 without a timer, dismissal, Retry, or separate restoration rail |
| Motion | All blocker, withdrawal, removal, and focus changes are immediate/static; reduced motion is identical. No fade, slide, scale, blur transition, skeleton, shimmer, spinner, progress loop, pulse, ping, bounce, blink, flicker, or layout-transition animation |
| Scope | No completion predicate, headless Task 137/159 behavior, Archive transaction, `VQ-12` state, product implementation in Task 118, Task 119 start, Task 160 start, theme-ID behavior/copy branch, or adjacent fallback |

The roles map through existing theme families while retaining identical copy,
source/completion-slot placement, actions, focus, lifetime, and static motion.
Since the Task 178 amendment only the completion-slot half of each binding
applies:

| Theme | Role-family binding |
|---|---|
| GridDO | Technical ruled source status and compact ruled completion-slot notice with static warning mark |
| Tiny Desk | Same-paper source annotation and pinned filing-status note |
| Neumorphism | Inset source/completion troughs using existing depth variables, never a second raised card |
| Claymorphism | Shape-preserving source ribbon and stable completion ribbon without bounce |
| Origami | Seam-bound source note and folded completion notice without animated fold |
| Terminal | Variable-driven `[completion blocked]` / `[completion withdrawn]` records with exact copy and no blink/glow loop |
| Retro Mac | Hard 1-bit in-window source line and in-section completion system status |
| Graphite | Restrained editorial source caption and strengthened-rule completion notice |

### Approved Archive Reliability / Recovery realization — `DP-VQ12`

**User-selected 2026-08-11:** Choice A keeps one stable Breakdown-scoped
`archive-card` and changes only its static mark, exact sentence, and one
current-action slot in place. Task 162 alone consumes this contract after Task
119 checkpoint acceptance.

| Contract | Exact token requirement |
|---|---|
| Stable composition | Keep `archive-card` in the existing completion locus and preserve its outer geometry through `archive-pending`, `archive-unknown`, `archive-reconciling`, `archive-recovery`, `archive-not-applied`, and `archive-conflict`. Use one `archive-status`, static `archive-status-mark`, and original-position `archive-current-action`; no second rail or replacement panel |
| Pending | Exact `Archiving this Scratch…`; retain a keyboard-focusable `aria-disabled` current-action target at the originating Archive position; no Check again, Retry, Cancel, resend, optimistic removal, or success treatment |
| Unknown / reconcile | Unknown exact `We couldn’t confirm whether this Scratch was archived.` with primary `Check again`; reconciliation exact `Checking whether this Scratch was archived…` with the same focusable inactive action position. Both retain the same descriptor/operation ID and never resend Archive |
| Forced reload | Exact `Checking the Archive request from before this reload…`; focus the recovery heading and reconcile the validated current-tab descriptor before initial Inbox projection. Never flash normal completion, restore unrelated page state, allocate a new identity, or mutate from an invalid descriptor |
| Not applied | Exact `This Scratch was not archived.` with primary `Retry` and secondary `Cancel`; focus Retry. Retry exists only for authoritative `not_applied`, reuses the logical operation identity, and returns the same card to pending |
| Pre-dispatch storage failure | Exact `Archive couldn’t start because this tab couldn’t keep its recovery details.`; no command ran, expose Cancel only, focus it, and return to current completion/reopen truth. A later Archive activation is a newly confirmed attempt, not this variant's Retry |
| Rejected / conflict | Rejected exact `Archive stopped because this Scratch is no longer ready.` plus returned current truth where available; conflict exact `Archive couldn’t finish because this Scratch changed while the result was being checked.`. Focus Cancel and expose no Retry, overwrite, compensation, inferred success, or stale completion action |
| Success / handoff | `applied|already_applied` announces exact `Scratch archived.` once, then removes the card with the selected Scratch and uses canonical next-visible → previous-visible → filtered-null → true-empty focus. No persistent success card, Archive View navigation, or hidden-Scratch selection |
| Cancel | Pre-dispatch base Cancel retains Task 159 meaning. No Cancel/Escape exists while pending/unknown/reconciling. Terminal Cancel dismisses only the terminal result and returns to current completion/reopen or working truth; it never aborts, rolls back, compensates, or conceals uncertainty. A change of the selected Scratch after a non-success terminal result or a pre-dispatch storage failure dismisses it the same way |
| Accessibility / lifetime | One visible polite atomic status announces each changed exact sentence once. Static text/mark carries meaning without color or motion. Nonterminal state lasts until the same descriptor is authoritatively classified; theme/mode change and conflicting intents do not end or restart it |
| Motion | Card content, action, terminal removal, and focus changes are immediate/static; reduced motion is identical. No fade, slide, scale, blur transition, skeleton, shimmer, spinner, progress loop, pulse, ping, bounce, blink, flicker, ellipsis animation, or layout-transition animation |
| Scope | No SCHEMA command/result/reconciliation change, Task 126/161 behavior change, new persistence, product implementation in Task 119, Task 162 start, Phase 24 close, theme-ID behavior/copy branch, adjacent-surface fallback, or Release edge other than Task 162 |

The same card/action/status roles map through existing theme families without
product JSX theme branching or unsupported literal values:

| Theme | Role-family binding |
|---|---|
| GridDO | One ruled technical Archive operation card with static state glyph and canonical current-action slot |
| Tiny Desk | One pinned filing note whose stamp line and single action row change in place |
| Neumorphism | One raised Archive card with inset static status line and stable action capsule position |
| Claymorphism | One shape-preserving clay Archive object with static status inset and no bounce |
| Origami | One seam-bound Archive sheet whose printed status/action changes without a new fold/panel |
| Terminal | One variable-driven `[archive:*]` system frame/current command line with no blink, spinner, or glow loop |
| Retro Mac | One hard 1-bit in-section Archive alert whose message/default action changes in the same window |
| Graphite | One restrained editorial Archive card with fixed rule, static mark, and stable action row |

### Existing-surface state gaps — None

`DP-VQ12` Choice A resolves the final existing-surface Decision prerequisite.
No global color, motion, or component value outside its exact receipt becomes
fallback authority.

### Absent replacement surfaces — None

The former `VQ-09` replacement-surface gap is resolved by `DP-VQ09` Choice A.
No other absent replacement surface remains in this promotion package.

### Selected deferrals

These selected boundaries remain outside this amendment. They authorize no
token, value, recipe fallback, placeholder control, or implementation task.

| ID | Preserved boundary | Future owner / resume condition |
|---|---|---|
| `D-CARD` | The common BitCard eight-theme redesign, later Staging/placed-card reuse, and final Korean card QA remain deferred. Current actual cards are retained; no current Inbox recipe is a redesign fallback. | Future brainstorming and separately approved execution work |
| `D-LENS` | Neumorphism ASC/DESC water-lens polish remains deferred because its source is absent. | Future user visual decision before any realization |
| `D-LOCALE` | Shared locale resources/provider/toggle, localized date/status/accessibility copy, and Korean typography/text-fit QA remain deferred. The core English copy foundation stays in scope. | Future canonical amendment |
| `D-KEYBOARD` | Keyboard or other drag-alternative placement entry remains deferred; add no placeholder button, shortcut, command, or hidden action now. | Future accessibility brainstorming and approval |
| `D-TEXT` | Cross-surface wrapping, line counts, expansion, and editor IME visual details remain with their separate topic. | Resume only through that named topic and its approval |

### Evidence and fidelity boundary

The nine current recipes were inspected as source only. This amendment claims
no server/browser run, screenshot comparison, rendered contrast, depth,
layering, clipping, overflow, responsive behavior, motion behavior,
light/dark parity, or combined eight-theme verification. Recipe declarations
support the role/mapping candidates above; they do not create behavior or turn
an observed literal into a canonical value without an approved adoption trace.

---

## SaaS App-State Surfaces

SaaS conversion promotion ① (DECISION S23, S26, S27, S28, S40; feedback F02,
F11, F13, F14, F17–F20 within S41). Behavior, timing and copy live in SPEC
[Account Entry And App States](SPEC.md#account-entry-and-app-states) and
[Feedback And Network States](SPEC.md#feedback-and-network-states); this
section owns the visual roles and their boundary.

### Theme scope

- The new surfaces use semantic tokens only: the core and theme variable
  groups above (`--background`, `--foreground`, `--card`, `--primary`,
  `--border`, `--muted-foreground`, `--theme-radius`, `--theme-shadow` and the
  like). Components never branch on theme id (S40, CLAUDE.md Architecture 8).
- The option sheet renders in the current default theme, `griddo`.
  Checkpoints check `griddo`, `retro-mac` and `neumorphism`. Per-theme
  finishing belongs to the theme stage (S40).

### Roles

Shared elements carry `data-app-role`:

| Role | Element | Fixed facts |
|---|---|---|
| `account-button` | Sidebar account icon, below the Home button (F21); top-most until Home lands (S23, F33) | Lucide `user-round` for a guest, `user-round-check` for an OAuth account; the sidebar icon-button size and focus ring of its neighbours |
| `account-badge` | Badge on the account icon (F17) | `data-connection-state="unstable"`: `!` mark in the warning status hue; `"offline"`: Lucide `wifi-off` in the error status hue. The hues are the F15 status tokens of [Feedback Status Surfaces](#feedback-status-surfaces); the shape carries the state, not colour alone (WCAG 1.4.1). No badge in the normal state |
| `app-frame` | Whole-window frame, sidebar included (F19) | One frame for every app-level screen; replaces the app, except the narrow-window notice |
| `app-frame-title`, `app-frame-reason`, `app-frame-action` | The frame's title, reason line and actions | Focus moves to the first action (F19) |
| `app-frame-loading` | Loading indicator | Exposed as busy; appears only after `DISPLAY_DELAY_MS` (300ms, F02); reduced motion shows a static indicator |
| `app-frame-security-check` | Turnstile widget slot (S42 (3)) | The widget's own rendering inside the frame |
| `narrow-notice` | Narrow-window notice (S42 (4)) | Laid over the mounted, `inert` app |
| `account-modal` | Guest and account modal (Phase 48) | Contents per SPEC |
| (reused) server-confirmed pending loader | The loader on a control or row of a SPEC write-feel group 3 action | The feedback F03 loader role ([Feedback Status Surfaces](#feedback-status-surfaces), Task 243), one loader app-wide; shown after `DISPLAY_DELAY_MS`; static under reduced motion. Not part of `DP-SAAS-01` (user, 2026-10-22) |

### Toast use

The SaaS phases change what toasts say and how long they stay, not where they
are or what colour they use (S28):

- Success 4 seconds; failure and warning 6 seconds; paused on hover, focus and
  a hidden tab; failures and warnings have a close button (F14).
- A repeat of the same kind updates its text to the counted form and restarts
  its time; at most three different kinds stack (F13).
- The offline write-attempt toast is a warning with Lucide `wifi-off` (F18).
- Position and colour are feedback F12 and F15, applied by Task 244 (Phase 49)
  before Phase 47 ([Feedback Status Surfaces](#feedback-status-surfaces)).

### Approved SaaS app-state realization — `DP-SAAS-01`

**User-approved 2026-10-23 (Task 242).** Chosen on the same option sheet as
`DP-FB-01`, with the same method: the app's own Inbox/Triage and grid DOM, the
real sidebar buttons and Inbox count badge, the real shell background, and the
Scratch Trash dialog as the app's realized confirmation shape, in `griddo`,
`retro-mac` and `neumorphism`, light and dark. Surface text is SPEC
[Feedback copy](SPEC.md#feedback-copy). The GitHub and Google marks on the sheet
were placeholders; implementation uses the providers' official marks.

| Contract | Exact requirement |
|---|---|
| Account icon (SA-1) | `data-app-role="account-button"` is a sidebar icon button with exactly the classes of its neighbour `Add item` (`flex h-10 w-10 items-center justify-center rounded-lg border border-transparent p-2.5 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 text-muted-foreground hover:bg-accent hover:text-foreground`). Lucide `user-round` for a guest and `user-round-check` for an OAuth account at `h-5 w-5`. No ring, tint or background distinguishes the account state; the glyph does. It is the top-most sidebar icon until the Home button lands (Phase 50), then sits right below Home and above `+`: the order is Home, account icon, `+` (SPEC §Sidebar, F21, F33). |
| Connection badge (SA-2) | `data-app-role="account-badge"` has the shape of the existing Inbox count badge: `absolute -top-1 -right-1 z-10 flex h-4 min-w-4 translate-x-[25%] -translate-y-[25%] items-center justify-center rounded-full px-1 font-mono text-[10px] font-bold leading-none ring-2 ring-background`. Unstable (`data-connection-state="unstable"`): the glyph `!`, `background: hsl(var(--status-warning-surface))`, `color: hsl(var(--status-warning))`, plus an inner 1px `hsl(var(--status-warning-border))` edge (an inset `box-shadow` kept beside the ring). Offline (`"offline"`): Lucide `wifi-off` at 10px with the same treatment in `--status-error-*`. No badge in the normal state. The sentence is a tooltip in the FB-4 look, to the right of the icon, 8px away. |
| Loading screen (SA-3) | The frame (below) holds no card: on the shell background, centred, the title `Loading your grid…` at `text-xl font-semibold` with the app loader (`--status-icon-size: 28px`) 12px below it. The loader is named by that title (`aria-labelledby`) and the frame is exposed as busy. It covers the sidebar and appears after `DISPLAY_DELAY_MS`. |
| App-level frame (SA-4) | The frame is the shell background (`data-triage-role="shell-background"`, so each theme's desktop or page surface shows) over the whole window, sidebar included, with one centred card: the Scratch Trash dialog's markup and classes without the overlay, `width: min(480px, 92%)`, static position, footer buttons wrapping. The card carries the title, the reason line and the actions of the SPEC screen; it takes the dialog's theme CSS as is (the `retro-mac` `!` mark and window frame, the `neumorphism` raised plate). Buttons use the existing button variants: `Retry` and `Continue as guest` are `default`; `Sign in with GitHub` and `Sign in with Google` are `outline`. The security-check card holds the Turnstile widget, 300×65, centred, in the card body. |
| Narrow-window notice (SA-5) | Laid over the mounted, `inert` app: the dialog overlay (`fixed inset-0 z-50 bg-black/50`) and, centred, the Scratch Trash dialog card with the title and the SPEC sentence, no actions. The app stays visible, dimmed, behind it. |
| Guest and account modal (SA-6) | The Scratch Trash dialog (`AlertDialogContent` with the app's confirmation classes and its overlay) as the frame. Guest: the title `You're browsing as a guest`; the two sentences as description paragraphs; then a `border-t pt-4` block with `Sign in with GitHub` and `Sign in with Google` as `outline` buttons side by side (`gap-2`, wrapping) and the privacy note below them in `text-xs text-muted-foreground` with line-height 1.5. The inline sign-in error is the dialog's existing state line (`role="status"`, `min-h-5 text-sm font-medium`). Account: the account name as the title; a `border-t pt-4` row with `Delete account` on the left (`outline` plus `border-destructive/50 text-destructive`) and `Sign out` on the right (`outline`). `Delete account` opens the existing confirmation pattern: `Cancel` (`outline`) and `Delete account` (`destructive`). |

### Decision prerequisite — `DP-SAAS-01`

| Field | Value |
|---|---|
| Owner | User |
| Missing decision | The look of the account icon and badge, the loading screen, the failure, guest-creation-failure, session-expired, account-being-deleted and security-check screens (one frame), the narrow-window notice, and the guest and account modal |
| How it is decided | One rendered option sheet in `griddo`, with `retro-mac` and `neumorphism` spot-checks, all surfaces together (S27, S40); shapes copied from the realized theme CSS, not from base components |
| Status | **Decided, 2026-10-23 (Task 242)**, recorded in [Approved SaaS app-state realization](#approved-saas-app-state-realization--dp-saas-01) |
| Resume condition | Met: the user's choice is recorded in this section and committed |
| Unblocks | The Phase 45 load-failure screens (Task 228), the Phase 47 icon, badge, loading and session-expired screens (Task 234), and the Phase 48 modal, account-being-deleted screen, security-check screen and narrow-window notice (Tasks 235, 236, 238); not the data, network-state or toast-helper work. It is decided in Task 242 (Phase 49) on the same option sheet as `DP-FB-01` (feedback F33); Task 225, at the start of Phase 45, confirms the recorded choice against the current SPEC surfaces |
| Remaining | Per-theme finishing belongs to the theme stage; implementation chooses no other size, spacing, layout, motion or per-theme value than those recorded |

---

## Feedback Status Surfaces

Feedback lane, promotion ② (DECISION F02, F03, F06, F07, F09, F10, F12, F15,
F21–F25, F29, F30, F33). Behavior, timing and copy live in SPEC
[Item status presentation](SPEC.md#item-status-presentation),
[Toasts](SPEC.md#toasts) and
[Breadcrumb reveal and Home button](SPEC.md#breadcrumb-reveal-and-home-button);
this section owns the visual roles, the status tokens and their boundary.

### Theme scope

- Every surface here uses semantic tokens only and never branches on theme id
  (CLAUDE.md Architecture 8).
- Checkpoints check `griddo`, `retro-mac` and `neumorphism` for correct
  rendering and `claymorphism` only for not breaking (F29). The per-theme
  finishing of these surfaces for `retro-mac` and `neumorphism`, and all of
  Paper and Claymorphism, belong to the theme stage.

### Status tokens

Three status kinds carry the hues the toasts use today (`richColors`), blended
into each theme (F15), and one neutral token carries item status:

| Token | Use |
|---|---|
| `--status-success`, `--status-success-surface`, `--status-success-foreground`, `--status-success-border` | Success toasts |
| `--status-warning`, `--status-warning-surface`, `--status-warning-foreground`, `--status-warning-border` | Warning toasts (offline write attempt), the unstable connection badge |
| `--status-error`, `--status-error-surface`, `--status-error-foreground`, `--status-error-border` | Failure toasts, the offline connection badge |
| `--status-item` | Item status `?` and `!`, and the item emphasis; never a toast or badge colour |

`DP-FB-01` values (user, 2026-10-23; HSL channel triplets like the core
tokens). They go on `:root` (light) and `.dark`, and every theme inherits them;
the theme stage may override them per theme.

| Token | Light | Dark |
|---|---|---|
| `--status-success` | `142 72% 30%` | `142 65% 58%` |
| `--status-success-surface` | `142 55% 94%` | `142 35% 13%` |
| `--status-success-foreground` | `142 60% 16%` | `142 60% 88%` |
| `--status-success-border` | `142 45% 78%` | `142 35% 24%` |
| `--status-warning` | `32 95% 36%` | `38 92% 62%` |
| `--status-warning-surface` | `40 100% 93%` | `38 45% 13%` |
| `--status-warning-foreground` | `30 80% 17%` | `40 90% 88%` |
| `--status-warning-border` | `38 80% 72%` | `38 45% 25%` |
| `--status-error` | `0 72% 42%` | `0 84% 70%` |
| `--status-error-surface` | `0 85% 96%` | `0 40% 15%` |
| `--status-error-foreground` | `0 65% 22%` | `0 90% 90%` |
| `--status-error-border` | `0 70% 82%` | `0 40% 27%` |
| `--status-item` | `240 6% 30%` | `240 5% 78%` |

Measured on the option sheet (WCAG contrast, `foreground` on `surface` for
text, the kind token on `surface` for the icon): light success 10.6:1 text and
4.3:1 icon, warning 11.4:1 and 4.1:1, error 11.7:1 and 5.7:1; dark success
12.2:1 and 8.2:1, warning 12.7:1 and 8.4:1, error 11.6:1 and 5.8:1 (text needs
4.5:1, icon 3:1). `--status-item` against `--background`: `griddo` 9.0:1 light
and 11.5:1 dark, `retro-mac` 9.0:1 and 12.1:1, `neumorphism` 7.2:1 and 10.0:1.

- The toast no longer depends on the `sonner` theme: the installed `Toaster`
  has no `theme` prop and showed light colours in dark mode, and these tokens
  carry their own dark values.
- Item status (`?`, `!`, emphasis) never uses the error hue: red stays reserved
  for destructive actions (F03). It uses `--status-item`, a neutral grey.
- The icon shape always carries the kind, so colour is never the only signal
  (WCAG 1.4.1).

### Roles

Shared elements carry `data-feedback-role`:

| Role | Element | Fixed facts |
|---|---|---|
| `status-icon` | The item status icon, `data-status="pending|unknown|reconciling|problem"` | Pending: the loader, shown only after `DISPLAY_DELAY_MS`, rotating, static under reduced motion. Unknown: `?`. Reconciling: keeps `?`, then the loader. Problem (not applied, rejected, conflict, integrity): `!`. Focusable where its host is not in the Tab order. Also the server-confirmed pending loader of SaaS group 3, one loader app-wide |
| `status-emphasis` | `data-status-emphasis` on the item (card, row, Add field, editor, slot) | Only with `?` and `!`, never with the loader; the existing dimming of a locked source row or candidate stays |
| `status-tooltip` | The hover/focus tooltip that holds the status sentence | No controls; one at a time; the item's description (`aria-describedby`); static display in both motion modes, like `explorer-title-tooltip` |
| `status-slot` | Breakdown row status slot | 22px, before the action cluster, always reserved so the title never shifts; replaces the 160px success slot (MI-21) |
| `status-slot-button` | Explorer Newly Undo slot in a `?` or `!` state | Keeps the Undo slot's width and focus target; an action-less `!` (like an unavailable `↶`) is an unavailable, focusable button with `aria-disabled="true"`, never `disabled`, so its reason tooltip shows on keyboard focus and hover |
| `toast-stack` | The `sonner` stack | Top-left of the work area, right of the `3rem` sidebar, at the breadcrumb row; below the breadcrumb while it is shown; at most three toasts; translucent and pointer-transparent during a Node or Bit drag (F12) |
| `toast` | One toast, `data-toast-kind="success|warning|error"` | The status tokens above; icon ✓, `!` or Lucide `wifi-off` (offline) |
| `home-button` | Sidebar Home button (F21) | Sidebar icon-button size and focus ring of its neighbours, top-most; `aria-current="page"` on L0; briefly emphasized when the breadcrumb folds into it (F23) |
| `breadcrumb-reveal` | The revealed breadcrumb surface over the grid's top-left (F22–F25) | Segments and the deadline chip in one row; only segments and the chip take the pointer; above cards, below the drag overlay, popovers, dialogs, the Bit popup and the palette; translucent during a drag with the chip hidden |
| `breadcrumb-drop-target` | An ancestor segment during a drag (F24) | A visible "drop here" signal on the segment only |
| `staging-node-grid` | The `Nodes` well's card grid (F10) | Minimum width of one Node card; auto-fill grid, one column when two cards do not fit, two when they do |

### Approved status surface realization — `DP-FB-01`

**User-approved 2026-10-23 (Task 242).** Chosen on one rendered option sheet
built from the app's own DOM and CSS (the Inbox/Triage workspace, the real grid
route and its breadcrumb, the installed `sonner` markup), checked in `griddo`,
`retro-mac` and `neumorphism`, in light and dark, in both motion modes. Only
the status surfaces below are new; every host surface keeps its existing role,
size and theme CSS. The option sheet is scratch and not committed.

| Contract | Exact requirement |
|---|---|
| Status icon shape (FB-1, FB-5) | `data-feedback-role="status-icon"` is a 16px square box (`--status-icon-size: 16px`, 12px inside the Explorer Undo button). `data-status="unknown"` / `"problem"`: the glyph `?` / `!` at weight 800, line-height 1, font-size `0.62 ×` the box (about 10px), in `--theme-font`, inside a 1.5px circle (`border-radius: 999px`, border `currentColor`), colour `hsl(var(--status-item))`. `data-status="pending"` / `"reconciling"`: Lucide `loader-circle` at stroke 2.4, colour `hsl(var(--muted-foreground))`, no circle, `role="img"` named by the sentence of its state in SPEC Feedback copy (`src/lib/copy/inbox-triage.ts`), the same sentence the tooltip shows; it rotates 360deg in 0.9s, linear, infinite, appears only after `DISPLAY_DELAY_MS` (300ms) and is static under reduced motion. |
| Item status colour (FB-2) | Neutral: `?` and `!` both use `--status-item` (values above); the loader uses `--muted-foreground`. No hue, no red; the glyph shape carries the kind. |
| Emphasis (FB-3, FB-3b) | `data-status-emphasis`, set only with `?` and `!`, never with the loader: `outline: 1.5px solid hsl(var(--status-item) / 0.8); outline-offset: 1px;` and a background layer `linear-gradient(hsl(var(--status-item) / 0.09), hsl(var(--status-item) / 0.09))` in `background-image`. It uses outline and `background-image` only, so each theme's own `box-shadow` stays (the `retro-mac` Staging card and Bit row set their own). The existing dimming of a locked source row or candidate stays. Known limit, accepted by the user on 2026-10-23 after seeing it: against the 2px black row borders of `retro-mac` this emphasis is faint; strengthening it per theme is theme-stage work, not a change to this contract. |
| Status tooltip (FB-4) | The existing `TooltipContent` look: `z-50 w-fit rounded-md bg-foreground px-3 py-1.5 text-xs text-balance text-background` plus the `explorer-title-tooltip` class, which keeps it static and gives `neumorphism` its plate. No arrow animation, no controls, one at a time; the sentence is the SPEC status sentence. |
| Placement and slots (FB-5) | Breakdown row: the third grid column of `.triage-fixed-breakdown-row` (`10rem`, the old success slot) becomes `22px`; `.breakdown-success-slot` loses its inline padding and centres the icon; the column is always reserved. Staging Node card: the icon sits at `top: 4px; right: 4px` inside the card. Staging Bit row: `right: 8px`, vertically centred. Add field: inside the field at `right: 8px`, vertically centred, with `padding-inline-end: 30px` on the field. |
| Explorer Newly Undo slot (FB-6) | The existing `.newly-undo-action` button keeps its shape, minimum size and theme CSS (width and focus target unchanged); only its content changes: the `Undo2` icon, then the 12px loader, `?` (enabled, Check again) or `!` (`aria-disabled="true"`, focusable, never `disabled`). |
| Inline editors (FB-7) | The icon is the first child of `.triage-inline-editor__actions` in a 22px box, where the progress sentence sits today. Loader: Save and Cancel are `disabled`. `!`: the editor field takes the emphasis above and Save stays enabled. No text for unsaved changes. |
| Toast surface (FB-9) | `sonner` DOM kept, restyled through `data-type`: `background: hsl(var(--status-{kind}-surface))`, `color: hsl(var(--status-{kind}-foreground))`, `border: 1px solid hsl(var(--status-{kind}-border))`, `border-radius: 12px`, `box-shadow: var(--theme-shadow)`, `--theme-font`. `retro-mac` shows `border-radius: 0` and `box-shadow: 2px 2px 0 hsl(var(--foreground))`; per-theme finishing otherwise belongs to the theme stage. Width 356px, 8px between toasts, 16px padding, 13px text. The icon is 16px in an 18px box in `hsl(var(--status-{kind}))`: a check (stroke 3) for success, `!` for failure and for a warning that is not offline, Lucide `wifi-off` for the offline write-attempt warning. Warning and failure toasts carry a `×` close control. The stack position is F12. |
| Home landing emphasis (FB-10) | When the breadcrumb folds into Home (F23), the Home button runs once, starting when the fold ends (0.35s after the fold starts), 0.6s ease-out: `box-shadow` from `0 0 0 0 hsl(var(--primary) / 0.7)` to `0 0 0 10px hsl(var(--primary) / 0)` and `background-color` from `hsl(var(--primary) / 0.14)` to transparent. No size change. Reduced motion: no movement, a static `0 0 0 2px hsl(var(--primary))` ring with `hsl(var(--primary) / 0.12)` background for the same 0.6s. |
| Breadcrumb reveal surface (FB-11) | The surface is unchanged from today: `h-8 rounded-lg border border-border/40 bg-background/80 shadow-sm backdrop-blur-md`. Structure (checked by the user on the option sheet, in the user's browser, 2026-10-23): `clip-path` and the `translateX` run on a wrapper element around the breadcrumb surface, and the opacity runs on the surface itself. They must not run on the element that has `backdrop-filter`: there the user saw a finished card fade in and out at 0.25× speed instead of unfolding from the left edge. Unfold from Home: 0.26s `cubic-bezier(0.2, 0.7, 0.2, 1)`, `clip-path: inset(0 100% 0 0)` to `inset(0)`, opacity 0.2 to 1 and `translateX(-8px)` to 0, from the left edge. Fold into Home (F23): the exact reverse of the unfold, 0.35s with the same `cubic-bezier(0.2, 0.7, 0.2, 1)`: `clip-path: inset(0)` to `inset(0 100% 0 0)` and `translateX(0)` to `translateX(-8px)`, towards the left edge; opacity goes 1 to 0 linearly and reaches 0 at 0.3s, inside the fold, so the fade is part of it and not a separate step. The Home landing emphasis below starts when the fold ends, 0.35s after the fold starts. Reduced motion: no movement; the breadcrumb appears and disappears in place (SPEC §Breadcrumb reveal and Home button). |
| Drag translucency (FB-12) | During a Node or Bit drag the breadcrumb surface and the toast stack are at `opacity: 0.5` and pass the pointer through, except the breadcrumb segments (drop targets); the deadline chip is hidden. |
| Segment drop signal (FB-13) | During a drag every ancestor segment (Home and the ancestor Nodes, not the current Node) shows `box-shadow: 0 0 0 2px hsl(var(--primary))` and `background: hsl(var(--primary) / 0.14)` with `--foreground` text; the segment under the pointer adds `0 0 0 5px hsl(var(--primary) / 0.25)`. No label. |

### Decision prerequisite — `DP-FB-01`

| Field | Value |
|---|---|
| Owner | User |
| Missing decision | The look of the status icons (loader, `?`, `!`), the item emphasis, the status tooltip, the Breakdown status slot, the Explorer slot buttons and the editor status positions (the Breakdown row editor and the Scratch-title editor in the Context); the values of the status tokens and the toast surface; the Home button and its landing emphasis; the breadcrumb reveal surface, its drag translucency and the segment "drop here" signal |
| How it is decided | One rendered option sheet in `griddo`, with `retro-mac` and `neumorphism` spot-checks, shapes copied from the realized theme CSS, together with `DP-SAAS-01` (Task 242, feedback F33) |
| Status | **Decided, 2026-10-23 (Task 242)**, recorded in [Status tokens](#status-tokens) and [Approved status surface realization](#approved-status-surface-realization--dp-fb-01) |
| Resume condition | Met: the user's choice is recorded in this section and committed |
| Unblocks | The visual parts of Task 243 (primitives and tokens), Task 244 (toasts), Tasks 245–247 (Inbox surfaces) and Task 248 (Home and reveal); not the theme reduction (241), the zone removal (249) or the last-Scratch preference (250) |
| Remaining | Per-theme finishing of these surfaces for `retro-mac` and `neumorphism`, and all of Paper and Claymorphism, belong to the theme stage; implementation chooses no other size, colour, spacing, motion or per-theme value than those recorded |

---

## Prototype-to-production realization and token ownership

> **Status:** **Draft — awaiting user approval, 2026-10-03.**
> **Trace:** approved promotion map C03; selected DECISION D14, D15, D17,
> D21, D22 and D25. Existing DP meanings and the map's Q01/Q02 boundaries
> remain controlling. This section adopts no new numeric value, font, icon,
> palette, shadow or motion parameter and claims no fresh rendered evidence.

### Centralized tokens, element-specific realization

Keep one shared semantic production component tree. Preserve the existing
semantic-token foundation and extend the established `--triage-<role>-*`
namespace only for a sourced, reusable region, element or state distinction.
The ownership chain is:

`existing semantic token → Inbox/Triage role or state alias → theme/mode value → shared element consumer`

Theme values remain centralized in the existing theme CSS owner
`src/app/globals.css`; components consume semantic roles, state and classes,
not copied theme literals or theme-ID JSX branches. The theme picker exception
above is unchanged. Centralization does not mean making eight themes use the
same visual value or creating a token for every pixel. Reuse a suitable existing
token; introduce a role alias when a meaningful difference needs independent
control. Shared layout and semantic structure remain shared.

| Concern | Realization contract |
|---|---|
| Source and value | Trace an alias and its value to the exact approved recipe/source region or existing DP. The namespace wildcard does not authorize an invented property or value. Missing or conflicting authority remains an affected-slice user decision. |
| Typography | `--theme-font` is a theme default, not proof that every title, timestamp, button or input uses that font. Resolve each sourced element's family, size, weight and line height independently and confirm the loaded font and actual cascade. |
| Surface grammar | Preserve the sourced distinction between panel, well, row, selected row, card and control. Background, shape, border and depth are role-specific; a page background plus a generic card shadow is not full theme realization. |
| Theme and mode scope | Theme-dependent values are scoped to the intended theme/mode and consumed through shared roles. New selectors must not leak into other regions, supported modes or themes. Do not accumulate overriding patches or depend on test IDs as styling selectors. |
| Semantic state | Composable `data-triage-state`, native semantics and logical focus remain authoritative. Selected, staged, invalid, unavailable, pending, success and recovery do not collapse into one opacity or destructive-color treatment. |
| Structural fit | Styling cannot stand in for missing semantic structure. Any necessary shared component or layout change needs its own plan-declared owner and tests; this document grants no write or owner-expansion authority. |

### Appearance and production behavior are separate contracts

For each adopted region, map the prototype's visible elements to actual
production owners. Appearance follows the exact selected visual source;
commands, data, state lifetime, copy meaning and focus follow SPEC and the
accepted DPs. A prototype's missing Save/Cancel, attached status, pending/error,
locked or recovery presentation does not remove the production feature.

Where an existing DP supplies that production-only surface, retain its exact
realization and express its approved theme mapping through the shared roles.
Do not borrow a nearby card, overlay or prototype behavior as an automatic
fallback. An unsourced new surface or a real conflict with an accepted DP
requires its exact user-owned decision before the conflicting change.

Existing fixed Context/editor geometry, action reserves, surface ratios and Placement/Archive boundaries remain unchanged apart from the separately approved Phase 34 / Task 167 P34-04 retro-mac Context-height exception: 120.25px in all mounted states and both modes, with other themes at 104px, the fixed 9.5rem action reserve, shared semantic tree and retained DP/C1 semantics unchanged. See P34-04 supplemental receipt (`Issues_Phase_34.Task_167.task-scope-context-geometry.json` in tag `archive/phase-34-codex`). If a matched prototype
target conflicts with them, report the affected element, measured difference,
behavior/copy impact and decision owner under Q02; do not silently override the
contract or hide actions, status, caret or focus with fixed height/overflow.
`P29-01 / D-CARD` and all five selected deferrals remain excluded. No common-card
redesign or new adjacent-surface fallback is granted.

### Actual rendering is the fidelity evidence

Before the first user submission for an approved region, connect each visible
frame, title, meta line, button, icon, row, input, empty state and decoration
from prototype source/DOM to its computed style/geometry and production owner.
Check actual position, dimensions, font family/size/weight/line height, spacing,
color/background, border/radius and shadow after theme and fonts have settled.
Authored CSS, a common theme-font assumption or a matching token name alone
does not prove those outcomes.

Use matched logical data, selection and UI state under matching theme/mode,
viewport, DPR, zoom, fonts and motion inputs. Compare fresh original-size 1:1
views, correct observable differences within the approved scope, and compare
again before presenting the first result. Do not resize images to conceal a
difference. Disclose retained differences and production-only states explicitly.
The implementation plan owns the region order, fixtures, evidence paths and
user disposition checkpoints; ordinary measurements need no extra document
batch. No pixel threshold or new visual acceptance is invented here.

Hover, focus, DnD and animation require their actual trigger, transition,
interruption/retrigger and reduced-motion observations as applicable, not just
one settled image. Use only adopted motion parameters and preserve the existing
Inbox/Triage Motion Boundary, including its non-repeating and DP-specific rules.
Animation never implies mutation success or changes the allowed lifecycle.

User visual acceptance and technical/behavior preservation checks are
independent. Neither a token/CSS assertion nor a passing test suite is visual
acceptance; an accepted image is not a technical pass. A source-only recipe or
a light-state comparison does not establish dark, responsive, contrast,
clipping, interaction or whole-theme conformance. Those claims require their
own applicable rendered evidence under the approved plan. Experiment code,
fixtures, images and reports are not implementation or acceptance inputs.

---

## Responsive Grid Node Tokens

Grid node sizing uses a **three-layer token model** to keep the design-token workflow as the authority while adapting node dimensions to actual cell size at runtime.

### Layer 1 — `:root` input tokens / policy knobs

Defined in `globals.css` `:root` and documented here. Tunable by design.

| Token | Value | Role |
|-------|-------|------|
| `--grid-inset` | `0.75rem` | Spacing subtracted from cell dimension to get node size |
| `--grid-node-max-size` | `96px` | Cap — nodes do not exceed this on large displays |
| `--grid-cols` | `18` | Grid column count |
| `--grid-rows` | `9` | Grid row count |
| `--grid-gap` | `0.5rem` | Gap between cells |

### Layer 2 — Cell-scoped derived tokens

Set on children of each `.grid-cell-container` div via CSS container queries. `cqw`/`cqh` units resolve against the cell container — no JS required.

**Container rule (in `globals.css`):**

```css
.grid-cell-container {
  container-type: size;
  container-name: grid-cell;
}

@container grid-cell (min-width: 0px) {
  .grid-cell-container > * {
    --grid-node-size: min(
      calc(min(100cqw, 100cqh) - var(--grid-inset)),
      var(--grid-node-max-size, 96px)
    );
    --grid-node-icon-size:      max(calc(var(--grid-node-size) * 0.325), 1.5rem);
    --grid-node-title-height:   max(calc(var(--grid-node-size) * 0.23),  1.125rem);
    --grid-node-padding-x:      max(calc(var(--grid-node-size) * 0.11),  0.5rem);
    --grid-node-padding-top:    max(calc(var(--grid-node-size) * 0.11),  0.5rem);
    --grid-node-padding-bottom: max(calc(var(--grid-node-size) * 0.1),   0.4375rem);
    --grid-node-icon-lift:      max(calc(var(--grid-node-size) * 0.1),   0.375rem);
  }
}
```

**Proportional ratios and readability floors:**

| Token | Ratio | Floor |
|-------|-------|-------|
| `--grid-node-icon-size` | `nodeSz × 0.325` | `1.5rem` (24px) |
| `--grid-node-title-height` | `nodeSz × 0.23` | `1.125rem` (18px) |
| `--grid-node-padding-x` | `nodeSz × 0.11` | `0.5rem` (8px) |
| `--grid-node-padding-top` | `nodeSz × 0.11` | `0.5rem` (8px) |
| `--grid-node-padding-bottom` | `nodeSz × 0.10` | `0.4375rem` (7px) |
| `--grid-node-icon-lift` | `nodeSz × 0.10` | `0.375rem` (6px) |

**CSS scope note:** An element with `container-type: size` cannot use `cqw`/`cqh` to query its own dimensions — those units resolve against the nearest *ancestor* container. The derived token vars are therefore set on `.grid-cell-container > *` (children), not on the container element itself.

### Layer 3 — Component consumers

Components consume `--grid-node-*` vars unchanged. No component edits are needed when tuning Layer 1 policy knobs.

| Component | Tokens consumed |
|-----------|----------------|
| `node-card.tsx` | `--grid-node-size`, `--grid-node-icon-size`, `--grid-node-title-height`, `--grid-node-padding-*`, `--grid-node-icon-lift` |
| `grid-cell.tsx` | `--grid-node-size` (dotted area and drag indicator footprint) |

---

## Tailwind v4 Theme Bridge

> This block replaces `tailwind.config.ts`. Tailwind v4 uses CSS-first configuration — all theme extensions live in `globals.css`.

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:where(.dark, .dark *));

@theme inline {
  /* ── Colors (shadcn core) — generates bg-*, text-*, border-* utilities ── */
  --color-background: hsl(var(--background));
  --color-foreground: hsl(var(--foreground));
  --color-card: hsl(var(--card));
  --color-card-foreground: hsl(var(--card-foreground));
  --color-popover: hsl(var(--popover));
  --color-popover-foreground: hsl(var(--popover-foreground));
  --color-primary: hsl(var(--primary));
  --color-primary-foreground: hsl(var(--primary-foreground));
  --color-secondary: hsl(var(--secondary));
  --color-secondary-foreground: hsl(var(--secondary-foreground));
  --color-muted: hsl(var(--muted));
  --color-muted-foreground: hsl(var(--muted-foreground));
  --color-accent: hsl(var(--accent));
  --color-accent-foreground: hsl(var(--accent-foreground));
  --color-destructive: hsl(var(--destructive));
  --color-destructive-foreground: hsl(var(--destructive-foreground));
  --color-border: hsl(var(--border));
  --color-input: hsl(var(--input));
  --color-ring: hsl(var(--ring));
  --color-page-bg: var(--page-bg);         /* body background surface */

  /* ── Colors (GridDO priority) ── */
  --color-priority-high: hsl(var(--priority-high));
  --color-priority-high-bg: hsl(var(--priority-high-bg));
  --color-priority-mid: hsl(var(--priority-mid));
  --color-priority-mid-bg: hsl(var(--priority-mid-bg));
  --color-priority-low: hsl(var(--priority-low));
  --color-priority-low-bg: hsl(var(--priority-low-bg));

  /* ── Colors (GridDO urgency) ── */
  --color-urgency-1: hsl(var(--urgency-1));
  --color-urgency-2: hsl(var(--urgency-2));
  --color-urgency-3: hsl(var(--urgency-3));
  --color-urgency-badge: hsl(var(--urgency-badge));

  /* ── Fonts — generates font-sans, font-mono utilities ── */
  --font-sans: var(--font-geist-sans), -apple-system, system-ui, sans-serif;
  --font-mono: var(--font-geist-mono), monospace;

  /* ── Spacing — generates w-*, p-*, m-*, gap-* utilities ── */
  --spacing-sidebar: var(--sidebar-width);
  --spacing-breadcrumb: var(--breadcrumb-height);

  /* ── Container — generates max-w-* utilities ── */
  --container-bit-detail: var(--bit-detail-max-width);
  --container-search-overlay: var(--search-overlay-width);
  --container-calendar-pool: var(--calendar-pool-width);

  /* ── Border Radius — generates rounded-* utilities ── */
  --radius-lg: var(--radius);
  --radius-md: calc(var(--radius) - 2px);
  --radius-sm: calc(var(--radius) - 4px);

  /* ── GridDO Custom Animations (not from tw-animate-css) ── */
  --animate-jiggle: jiggle 0.3s ease-in-out infinite;
  --animate-urgency-blink-1: urgency-blink 3s ease-in-out infinite;
  --animate-urgency-blink-2: urgency-blink 2s ease-in-out infinite;
  --animate-urgency-blink-3: urgency-blink 1s ease-in-out infinite;
  --animate-float: float 4s ease-in-out infinite;

  @keyframes jiggle {
    0%, 100% { transform: rotate(-1.5deg); }
    50% { transform: rotate(1.5deg); }
  }
  @keyframes urgency-blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
  }
}
```

**Token scope — what is NOT in `@theme inline`:**

The following CSS variables are consumed via `var()` in component styles or JavaScript, not as Tailwind utility classes. They remain as plain CSS variables in `:root` / `.dark`:

| Variable group | Reason |
|---|---|
| `--aging-fresh-filter`, `--aging-stagnant-filter`, `--aging-neglected-filter`, `--aging-dust-opacity` | Applied as `filter:` values — stagnant includes `brightness(0.9)`, neglected `brightness(0.75)` |
| `--motion-duration-affordance`, `--motion-duration-theme` | CSS-native transition durations; Motion runtime uses `src/lib/animations/motion-language.ts` |
| `--grid-cols`, `--grid-rows`, `--grid-gap`, `--grid-cell-min` | Consumed by CSS Grid template or inline styles |
| `--grid-inset`, `--grid-node-max-size` | Layer 1 policy knobs for cell-scoped node sizing |
| `--grid-node-size`, `--grid-node-icon-size`, `--grid-node-title-height`, `--grid-node-padding-*`, `--grid-node-icon-lift` | Layer 2 derived sizing tokens — computed via `@container grid-cell` rules; `:root` values are static fallbacks only |
| `--grid-line-color`, `--grid-line-opacity-l*` | Per-level logic via inline styles |
| `--grid-bg-l0` through `--grid-bg-l3` | Per-level background via inline styles |
| `--calendar-node-pool-ratio`, `--calendar-day-min-width` | CSS flexbox/grid or inline styles |
| `--theme-font`, `--theme-radius`, `--theme-border-width`, `--theme-border-style`, `--theme-line-style`, `--theme-card-bg`, `--theme-shadow`, `--theme-shadow-hover` | Batch 2 color theme surface contract; consumed by `.theme-node-card`, `.theme-grid-line`, `.theme-surface` |
| `--calendar-cell-bg`, `--calendar-header-bg`, `--calendar-border-*`, `--calendar-grid-line-color`, `--calendar-cell-radius`, `--calendar-cell-shadow`, `--calendar-today-*` | Batch 2 calendar visual theme contract; consumed by calendar cell/day-column inline styles |
| `--bit-detail-max-height` | Inline style or direct CSS `max-height` |

**Structural constraints for `globals.css`:**

- `@import` statements come first (`"tailwindcss"`, then `"tw-animate-css"`)
- `@custom-variant dark` precedes `@theme inline`
- `@theme inline` contains all utility-generating tokens, including `--animate-*` values and their nested `@keyframes`
- `:root` and `.dark` blocks are top-level (not inside `@layer base`)
- `@layer base` contains only reset styles (`border-border`, `bg-background text-foreground`, `prefers-reduced-motion`)
- No ordering constraint between `@theme inline` and `:root`/`.dark`

**Note on animations:** GridDO custom keyframes (jiggle, blink, float) are defined inside `@theme inline` above. `tw-animate-css` is a separate package that provides animation utilities used by shadcn components (accordion, collapsible, etc.). The two sources are independent. Complex interaction-driven animations are handled by Motion in `src/lib/animations/`:

| Animation | Method | File |
|-----------|--------|------|
| Jiggle (edit mode) | CSS `animate-jiggle` | `@theme inline` keyframe |
| Urgency blink | CSS `animate-urgency-blink-{1,2,3}` | `@theme inline` keyframe |
| Floating idle | CSS `animate-float` | `@theme inline` keyframe |
| Sinking (completion) | Motion `AnimatePresence` + exit variant | `src/lib/animations/grid.ts` |
| Creation (node/bit appear) | Motion spring scale+fade (`stiffness: 400, damping: 25`) | `src/lib/animations/grid.ts` |
| Deletion (node/bit remove) | Motion exit shrink+fade (`duration: 0.2, easeIn`) | `src/lib/animations/grid.ts` |
| Task tossing (drag into Node) | Motion spring transition | `src/lib/animations/grid.ts` |
| Magnet snap (grid/calendar) | Motion spring with damping | `src/lib/animations/grid.ts` |
| Day column expand (calendar) | Motion layout animation with vignette effect (column expands vertically, adjacent columns hidden) | `src/lib/animations/calendar.ts` |
| Search overlay open/close | Motion fade + scale | `src/lib/animations/layout.ts` |
| Bit detail popup | Motion fade + slide-up | `src/lib/animations/layout.ts` |

---

## Motion Language

GridDO source extraction targets:

| Interaction | Source behavior | GridDO2 token |
|-------------|-----------------|---------------|
| Node hover | `whileHover={{ scale: 1.05, zIndex: 40 }}` | `motionScale.nodeHover = 1.05`, `motionZIndex.nodeHover = 40` |
| Node drag lift | `whileDrag={{ scale: 1.1, zIndex: 50 }}` | `motionScale.nodeDrag = 1.1`, `motionZIndex.nodeDrag = 50` |
| Sidebar pencil drag target | `animate={{ scale: 1.2, boxShadow: "0 0 20px var(--accent-muted)" }}` | `motionScale.sidebarDragTarget = 1.2`, `motionShadow.sidebarDragTarget = 0 0 20px hsl(var(--primary) / 0.45)` |
| Dark mode transition | `background-color 0.3s, color 0.3s` | `--motion-duration-theme: 300ms`, `motionDuration.theme = 0.3` |

Runtime motion values live in `src/lib/animations/motion-language.ts`. Component and domain animation files must import named tokens from that file instead of defining raw duration, scale, spring, shadow, or z-index values inline.

| Category | Token | Value |
|----------|-------|-------|
| Fast affordance | `motionDuration.affordance` / `--motion-duration-affordance` | `0.15s` / `150ms` |
| Normal layout | `motionDuration.layout` | `0.25s` |
| Modal enter | `motionDuration.modalEnter` | `0.2s` |
| Modal exit | `motionDuration.modalExit` | `0.15s` |
| Search exit | `motionDuration.searchExit` | `0.1s` |
| Item exit | `motionDuration.itemExit` | `0.2s` |
| Completion exit | `motionDuration.completionExit` | `0.3s` |
| Theme transition | `motionDuration.theme` / `--motion-duration-theme` | `0.3s` / `300ms` |
| Display delay (presentation only, F02) | `DISPLAY_DELAY_MS` in `src/lib/constants.ts` | `300ms` before a loading screen, a server-confirmed pending state or an Inbox loader appears; never decides success |
| Breadcrumb unfold from Home (F23) | `motionDuration.breadcrumbUnfold` | about `0.26s` |
| Breadcrumb fold into Home (F23) | `motionDuration.breadcrumbFold` | about `0.35s` |
| Breadcrumb hide fade (F23) | `motionDuration.breadcrumbFade` | `0.3s` |
| Breadcrumb hide delay (F23) | `BREADCRUMB_HIDE_DELAY_MS` | `1000ms` after pointer and focus leave Home and the breadcrumb |
| Breadcrumb entry reveal (F22) | `BREADCRUMB_ENTRY_REVEAL_MS` | `3000ms` after entering a Node |
| Completion sink offset | `motionDistance.sink` | `8px` |
| Item exit y-offset | `motionDistance.itemExitY` | `8px` |
| Node hover scale | `motionScale.nodeHover` | `1.05` |
| Node drag scale | `motionScale.nodeDrag` | `1.1` |
| Sidebar drag target scale | `motionScale.sidebarDragTarget` | `1.2` |
| Motion scale spring | `motionSpring.scale` | `type: "spring"`, `stiffness: 550`, `damping: 30`, `restSpeed: 10` |
| Creation spring | `motionSpring.creation` | `type: "spring"`, `stiffness: 400`, `damping: 25` |
| Grid snap spring | `motionSpring.gridSnap` | `type: "spring"`, `stiffness: 200`, `damping: 15` |

### Inbox/Triage Motion Boundary

**Amendment status:** **User-approved 2026-07-28; `DP-VQ02` supplement approved
2026-08-09.** The original amendment adopted no new Inbox/Triage motion value.
`DP-VQ02` now adds only the named `600ms` `ease-out` Add/Unstage row wash and
`1600ms` status visibility with the exact static reduced-motion equivalent
above. The unrelated global motion tokens remain exact and unchanged and are
not automatic fallbacks for another `VQ-*` state or missing replacement
surface.

Repeated pulse, blink, ping, bounce, spin, and flicker are excluded from the
Inbox/Triage target. Approved `DP-VQ10` Newly Placed and Undo uses immediate
static marker/rail/action changes with reduced-motion-identical geometry and
lifetime; no repeating or one-shot animation token is adopted. `DP-VQ02` owns the exact Add/Unstage
`success` appearance, trigger, timing, placement, interruption, and theme
mapping above; no other success or reliability surface inherits it.

**Feedback lane amendment (Phase 50).** `DP-VQ02` and its wash and status
tokens retire (feedback F01). The F03 loader is the one exception to the
spin exclusion above: once shown after `DISPLAY_DELAY_MS` it rotates, and under
reduced motion it is static (user, 2026-10-22). Status icons, emphasis and
tooltips otherwise change immediately and statically, in both motion modes.
The breadcrumb reveal motion (F23) is not Inbox motion; it is in the table
above, with no movement under reduced motion.

---

## Font Loading

| Font | Loading Method | CSS Variable | Tailwind Class |
|------|---------------|-------------|----------------|
| Geist Sans | `next/font/local` via `geist` package | `--font-geist-sans` | `font-sans` |
| Geist Mono | `next/font/local` via `geist` package | `--font-geist-mono` | `font-mono` |
| Inter | `next/font/google` | `--font-inter` | consumed through `--theme-font` |
| Space Mono | `next/font/google` | `--font-space-mono` | consumed through `--theme-font` |

**Wiring chain:**

```
Geist Sans: geist/font (next/font) → --font-geist-sans (on <html>) → font-sans (Tailwind) → className="font-sans"
Geist Mono: geist/font/mono (next/font) → --font-geist-mono (on <html>) → font-mono (Tailwind) → className="font-mono"
Batch 2 display fonts: next/font/google → --font-* variables (on <html>) → --theme-font → theme-aware surfaces
```

**Root layout font loading** (after Task 241; Playfair Display and VT323 load
until then):

```tsx
// src/app/layout.tsx
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Inter, Space_Mono } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceMono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-space-mono" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} ${inter.variable} ${spaceMono.variable}`}
    >
      <body className="font-sans">
        {children}
      </body>
    </html>
  );
}
```

---

## Component Usage Quick Reference

All classes reference CSS variables + Tailwind config above. No hardcoded hex or arbitrary values.

### Node Card

```tsx
{/* Node — Motion hover/drag scale; sizing comes from grid-node tokens */}
<motion.button
  animate={isDragging ? "dragging" : "rest"}
  className="theme-node-card grid h-[var(--grid-node-size)] w-[var(--grid-node-size)]
             grid-rows-[1fr_var(--grid-node-title-height)] rounded-3xl bg-card
             transition-[box-shadow,background-color] hover:bg-muted/40"
  transition={nodeCardTransition}
  variants={nodeCardVariants}
  whileHover={isDragging ? undefined : "hover"}
>
  {/* Icon — color from Node.color */}
  <div className="flex min-h-0 items-center justify-center pb-[var(--grid-node-icon-lift)]">
    <Icon
      className="h-[var(--grid-node-icon-size)] w-[var(--grid-node-icon-size)] shrink-0"
      style={{ color: node.color }}
    />
  </div>
  {/* Title */}
  <div className="h-[var(--grid-node-title-height)] w-full overflow-hidden">
    <p className="truncate whitespace-nowrap text-center text-[11px] font-semibold">
      {node.title}
    </p>
  </div>
</motion.button>
```

### Bit Card (Grid View)

Two-row layout: top row has content, bottom row has progress (only when chunks exist).

```tsx
{/* Bit — two-row rectangle. padding: 10px 14px 10px 12px */}
<div className="flex flex-col rounded-[var(--radius)] bg-card shadow-sm border border-border overflow-hidden
                pt-[10px] pr-[14px] pb-[10px] pl-3">
  {/* ── Top row ── */}
  <div className="flex items-center gap-[10px]">
    {/* Color bar */}
    <div className="w-[3px] self-stretch rounded-[2px] flex-shrink-0"
         style={{ backgroundColor: parentColor }} />
    {/* Icon */}
    <Icon className="w-[18px] h-[18px] text-muted-foreground flex-shrink-0" />
    {/* Content */}
    <div className="flex-1 min-w-0">
      <p className="text-[13px] font-medium text-foreground truncate">{title}</p>
      {deadline && (
        <p className="text-[11px] text-muted-foreground mt-px">{formattedDeadline}</p>
      )}
    </div>
    {/* Priority badge */}
    {priority && (
      <span className={cn(
        "inline-flex items-center py-[2px] px-[7px] rounded-full flex-shrink-0",
        "text-[10px] font-semibold uppercase tracking-[0.05em]",
        priority === "high" && "bg-priority-high-bg text-priority-high",
        priority === "mid" && "bg-priority-mid-bg text-priority-mid",
        priority === "low" && "bg-priority-low-bg text-priority-low",
      )}>
        {priority}
      </span>
    )}
  </div>
  {/* ── Bottom row — only when chunks exist ── */}
  {totalChunks > 0 && (
    <div className="flex items-center gap-2 mt-2 pl-[3px]">
      <div className="flex-[0_0_80%] h-[5px] rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${(completedChunks / totalChunks) * 100}%` }}
        />
      </div>
      <span className="text-[11px] text-muted-foreground whitespace-nowrap">
        {completedChunks} / {totalChunks}
      </span>
    </div>
  )}
</div>
```

### Compact Bit (Calendar Day Column — 2+ items)

```tsx
{/* Compact list item — colored left border, title, time */}
<div className="flex items-center gap-2 px-3 py-1.5 border-l-4 text-sm" style={{ borderLeftColor: parentColor }}>
  <span className="flex-1 truncate text-foreground">{title}</span>
  {time && <span className="text-xs text-muted-foreground flex-shrink-0">{formattedTime}</span>}
</div>
```

### Grid Cell

```tsx
{/* Grid cell — aspect ratio adapts to grid, theme-aware line treatment */}
<div className={cn(
  "theme-grid-line relative rounded-md transition-all",
  isEditMode && "border-2 border-dashed border-muted-foreground/30",
  isEmpty && isEditMode && "flex items-center justify-center",
)}>
  {isEmpty && isEditMode && (
    <button className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
      <PlusIcon className="w-5 h-5" />
    </button>
  )}
</div>
```

### Sidebar

```tsx
{/* Sidebar — fixed icon rail, always visible (Phase 9: was foldable) */}
<nav className="fixed left-0 top-0 h-full w-sidebar bg-background border-r border-border flex flex-col items-center gap-1 py-4 px-1 z-40">
  {/* Top icons */}
  <HomeButton />                                   {/* feedback F21 (Phase 50): top-most on every route; reveals the breadcrumb */}
  <AccountButton />                                {/* SaaS S23 (Phase 47): below Home; top-most until Home lands */}
  <SidebarButton icon={Plus} label="New" />        {/* triggers add-flow */}
  <SidebarButton icon={Pencil} label="Edit" />     {/* edit mode toggle */}
  <SidebarButton icon={Search} label="Search" />
  <div className="relative">
    <SidebarButton icon={Calendar} label="Calendar" />
    {urgencyLevel && (
      <span className={cn(
        "absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full",
        urgencyLevel === 1 && "bg-urgency-1",
        urgencyLevel === 2 && "bg-urgency-2",
        urgencyLevel === 3 && "bg-urgency-3",
      )} />
    )}
  </div>

  {/* Bottom icons — mt-auto pushes to bottom */}
  <div className="mt-auto flex flex-col items-center gap-1">
    <SidebarButton icon={Trash2} label="Trash" />  {/* visible on all levels */}
    <SidebarButton icon={theme === "dark" ? Sun : Moon} label="Theme" />
  </div>
</nav>
```

### Search Overlay

```tsx
{/* Search — centered overlay on blurred background */}
<div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-start justify-center pt-[20vh]">
  <div className="w-full max-w-search-overlay bg-popover rounded-xl border border-border shadow-2xl overflow-hidden">
    {/* Search input */}
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
      <Search className="w-5 h-5 text-muted-foreground" />
      <input
        className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-base"
        placeholder="Search nodes, bits, chunks..."
        autoFocus
      />
    </div>
    {/* Results */}
    <div className="max-h-[50vh] overflow-y-auto py-2">
      {results.map((item) => (
        <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent cursor-pointer transition-colors">
          <TypeIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
            <p className="text-xs text-muted-foreground truncate">{item.parentPath}</p>
          </div>
          {item.deadline && (
            <span className="text-xs text-muted-foreground flex-shrink-0">{item.formattedDeadline}</span>
          )}
        </div>
      ))}
    </div>
  </div>
</div>
```

### Breadcrumbs

From Phase 50 the breadcrumb is hidden by default, revealed from the sidebar
Home button over the grid's top-left, with the deadline chip in the same row
and no reserved cell; only the segments and the deadline chip take the
pointer
([Feedback Status Surfaces](#feedback-status-surfaces), SPEC §Breadcrumb reveal
and Home button). The markup below is the segment row inside that surface.

```tsx
{/* Breadcrumb — top of grid */}
<nav className="flex flex-col gap-0.5 h-breadcrumb px-4 justify-center">
  <div className="flex items-center gap-1.5 text-sm">
    <button className="text-muted-foreground hover:text-foreground transition-colors">Home</button>
    {segments.map((seg) => (
      <>
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        <button className="text-muted-foreground hover:text-foreground transition-colors last:text-foreground last:font-medium">
          {seg.title}
        </button>
      </>
    ))}
  </div>
</nav>
```

### Ghost Placeholder (Onboarding)

```tsx
{/* Ghost placeholder — dashed outline, disappears after first item creation */}
<div className="border-2 border-dashed border-muted-foreground/30 rounded-xl flex flex-col items-center justify-center gap-2 p-4">
  <span className="text-sm text-muted-foreground/50">Try: Work</span>
</div>
```

### Blur + Overlay Pattern (Past Deadline / Conflict)

Blur is applied **to the card content** (`filter: blur(3px)`), not via `backdrop-filter`.
Buttons are `28×28px` (w-7 h-7). "Done?" text is foreground (not muted), semibold.

```tsx
{/* Blur + overlay — consistent "needs attention" pattern */}
<div className="relative">
  {/* Blurred item — filter on the content, not backdrop */}
  <div className="[filter:blur(3px)] pointer-events-none">
    <BitCard {...bitProps} />
  </div>
  {/* Overlay */}
  <div className="absolute inset-0 flex items-center justify-center gap-[10px] bg-background/50 rounded-[var(--radius)]">
    <span className="text-[13px] font-semibold text-foreground">{overlayText}</span>
    <button className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground">
      <Check className="w-3.5 h-3.5" />
    </button>
    <button className="flex items-center justify-center w-7 h-7 rounded-full bg-secondary text-secondary-foreground">
      <X className="w-3.5 h-3.5" />
    </button>
  </div>
</div>
```

### Timeline (Bit Detail — Chunk Timeline)

```tsx
{/* Vertical timeline with dots and connecting line */}
<div className="relative pl-8">
  {/* Vertical line */}
  <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-border" />
  {chunks.map((chunk) => (
    <div className="relative flex items-start gap-3 pb-6">
      {/* Dot */}
      <div className={cn(
        "relative z-10 w-3 h-3 rounded-full border-2 border-background mt-1.5",
        chunk.status === "complete" ? "bg-primary" : "bg-muted-foreground/30",
      )} />
      {/* Content */}
      <div className="flex-1">
        <p className={cn(
          "text-sm",
          chunk.status === "complete" && "line-through text-muted-foreground",
        )}>
          {chunk.title}
        </p>
        {chunk.time && (
          <p className="text-xs text-muted-foreground mt-0.5">{formattedTime}</p>
        )}
      </div>
    </div>
  ))}
</div>
```

### Inbox Badge (Triage)

Active-Scratch count badge on the Inbox system Node. Three-level pressure model (exact count; thresholds in `src/lib/constants.ts`). Colors use **semantic tokens — no hard-coded HSL**:

| Count | Level | Token mapping (Batch 1 baseline) |
|-------|-------|----------------------------------|
| 0 | hidden | no badge |
| 1–7 | neutral | `bg-muted text-muted-foreground` |
| 8–14 | warm | `bg-priority-mid-bg text-priority-mid` |
| 15+ | high-pressure | `bg-destructive text-destructive-foreground` |

> **Semantic reuse, not a new token:** the "warm" tier reuses the existing amber `--priority-mid` pair (`45 93% 47%`; medium-priority = caution), already wired in the theme bridge as `--color-priority-mid(-bg)`. This satisfies the "semantic tokens, no hard-coded HSL" rule without inventing a value. If the count-pressure scale later needs to diverge from task priority, a dedicated pressure token can be introduced in Batch 2 — Batch 1 does not require it.

### Compact Drag Token (Inbox/Triage)

Inbox/Triage drag previews (Breakdown row, staged Node, staged Bit) use a **compact token**, not the full row/card (SPEC Decision 16; pointer-centered targeting; valid / invalid / pending-confirmation target states). The existing calendar `compact-bit-item.tsx` "full drag surface" is the **anti-pattern** to avoid. Batch 1 uses existing GridDO baseline tokens; exact drag-token classes are an implementation detail within the Inbox/Triage phase (no dedicated theme tokens in Batch 1).

---

## Surface Recipes

> Surface recipes own source-extracted composition and supported visual
> declarations for sensitive surfaces. Product behavior remains in SPEC;
> shared role/state vocabulary and approved mappings remain in this document.
> Each recipe states its own provenance and verification level. A source-only
> recipe is not evidence of a rendered result.
>
> Surface recipes are referenced by execution plan tasks via a `Recipe:` field.
> Larger surface recipes may live as standalone files under `docs/recipes/` and are linked below.

### Current Inbox / Triage Surface Package

The current package is approved as source-only evidence and navigation. The
index creates no behavior, token, layout, or implementation authority. Each
current file is linked exactly once here; trace IDs are used by the proposed
role tables above.

| Trace ID | Navigation target | Source-backed scope |
|---|---|---|
| `R-INDEX` | [Inbox/Triage visual recipe navigation index](recipes/inbox-triage-visual-recipe-index.md) | Navigation only across source regions, surfaces, production owners, and future task placeholders |
| `R-SHELL` | [Shell and section chrome](recipes/inbox-triage-shell-section-chrome-visual-recipe.md) | Four-area composition, visible identity/chrome, hidden-scroll viewports |
| `R-POOL` | [Scratch Pool](recipes/inbox-triage-scratch-pool-visual-recipe.md) | Tools, count, selected/collapsed base states, and Pool viewport roles |
| `R-CONTEXT` | [Selected Scratch Context](recipes/inbox-triage-selected-scratch-context-visual-recipe.md) | Standalone signature Context and working/complete base roles |
| `R-BREAKDOWN` | [Breakdown rows and empty states](recipes/inbox-triage-breakdown-row-empty-visual-recipe.md) | Base row, action, Add, ordinary-empty, and completion-prompt roles |
| `R-STAGING` | [Staging](recipes/inbox-triage-staging-visual-recipe.md) | Node/Bit wells and shapes, base state grammar, transient unstage target |
| `R-EXPLORER` | [Grid Explorer](recipes/inbox-triage-grid-explorer-visual-recipe.md) | Base chrome/columns/full labels/rows/target grammar plus separately receipt-owned `DP-VQ07` search roles |
| `R-PLACEMENT` | [Placement affordances](recipes/inbox-triage-placement-affordances-visual-recipe.md) | Direct/staged base shells, target-column affordance, and full-target warning |
| `R-NEWLY` | [Newly Placed and Undo](recipes/inbox-triage-newly-placed-undo-visual-recipe.md) | Actual-card marker, separate Undo, and receipt-owned `DP-VQ10` always-visible reason/reliability rail; static treatment only |
| `R-ARCHIVE` | [Archive and completion](recipes/inbox-triage-archive-completion-visual-recipe.md) | Breakdown-scoped base scrim/card, complete Context, reopen, Archive/Cancel |

The old [Batch 2 Inbox/Triage recipe](recipes/inbox-triage-batch2-visual-recipe.md)
is historical/reference-only for this topic. It is not part of the current
package and is not a direct execution recipe.

No current package file was rendered in this pass. Server/browser output,
screenshots, contrast, depth, layering, clipping, overflow, responsive
behavior, motion, light/dark parity, and combined eight-theme fidelity remain
unverified.

### Quick Capture `+` Entry Surface

> Recipe file: `docs/recipes/quick-capture-entry-surface-visual-recipe.md`
> Source: `prototype/future-ideas` @ `e662163` (`surface(main)` variant).
> Scope: anchored `+` entry-surface popover + Scratch capture modal. Geometric detail (classes, spacing, motion) lives in the recipe file; product behavior is in SPEC § Quick Capture `+` Entry Surface.

### Command Palette (Cmd+K)

> Recipe file: `docs/recipes/command-palette-visual-recipe.md`
> Source: `prototype/future-ideas` @ `e662163` (palette variant).
> Scope: Cmd+K command-palette visual shell. Command set/keys are a product rule (SPEC § Command Palette), not part of this visual recipe. Geometric detail lives in the recipe file.

### Batch 2 Theme System + Grid

> Recipe file: `docs/recipes/theme-system-and-grid-batch2-visual-recipe.md`
> Source: `prototype/future-ideas` @ `64e5236` and `5b3d3c0`.
> Scope: 8-theme runtime, theme variable contract, font/radius/border/shadow identity, color-theme picker, and theme-aware grid/node-card treatment.

### Batch 2 Calendar

> Recipe file: `docs/recipes/calendar-batch2-visual-recipe.md`
> Source: `prototype/future-ideas` @ `59ee937`.
> Scope: shared weekly/monthly header, theme-aware monthly grid, theme-aware weekly day columns, today marker, first-of-month label treatment, and calendar focus-visible polish.

### Bit Detail Surface

> Reference: `references/bitdetail0.png`

#### Overlay

```
fixed inset-0 z-50
Backdrop: bg-background/80 backdrop-blur-sm
Centering: flex items-center justify-center p-4
```

#### Container

```
max-w-[var(--bit-detail-max-width)]   /* 640px */
max-h-[var(--bit-detail-max-height)]  /* 85vh */
bg-popover rounded-xl border border-border shadow-xl
overflow-hidden

Optional — left accent border:
  border-l-[3px] colored by priority
  Not confirmed by reference. Include only if design review justifies it.
```

#### Header Row

```
Layout: flex items-center gap-3
Padding: px-5 pt-5 pb-0
Constraint: single-line. Title truncates. Right-side controls do not shrink.

Left group:
  Icon picker: h-9 w-9 flex-shrink-0, rounded-lg border border-input bg-background
    Contains: current Lucide icon h-5 w-5
    Click opens icon grid popover

  Title: flex-1 min-w-0 truncate
    text-lg font-semibold text-foreground
    bg-transparent, no visible border
    Editable inline (blur to save)

Right group: flex items-center gap-1 flex-shrink-0
  Status toggle: h-7 w-7 flex-shrink-0 rounded-md
    Active: Circle icon, text-muted-foreground
    Complete: CheckCircle2 icon, text-primary

  More menu: h-7 w-7 flex-shrink-0 rounded-md, MoreHorizontal icon
    Contains: Promote to Node (conditional), Move to trash

Note: Progress ring is no longer in the header. See Steps Header Row.
```

#### Priority + Meta Row

```
Layout: flex flex-wrap items-center gap-2
Padding: px-5 pt-1.5 pb-0

Priority badge (leftmost):
  rounded-full px-[7px] py-[2px]
  text-[10px] font-semibold uppercase tracking-[0.05em]
  high: bg-priority-high-bg text-priority-high
  mid:  bg-priority-mid-bg text-priority-mid
  low:  bg-priority-low-bg text-priority-low
  When null: bg-secondary text-muted-foreground, displays "—"
  Click cycles priority (existing behavior)

Deadline chips (when deadline is set):
  Date chip: Calendar h-3.5 w-3.5 icon + formatted date text + × button
    × click: clears deadline (sets to null)
    Date text click: opens edit state
  Time chip: Clock h-3.5 w-3.5 icon + formatted time text
    Hidden when deadlineAllDay is true
    Click: opens edit state
  ALL pill: rounded px-2 py-0.5 text-xs font-medium
    Active (all-day on): bg-primary text-primary-foreground
    Inactive: bg-secondary text-muted-foreground

  Edit state (on chip click):
    Native date input + time input (existing controls)
    ALL toggle (existing behavior)
    Dismiss on blur or ESC → returns to chip display

Deadline (when null):
  Button: flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground
  Icon: Calendar h-3.5 w-3.5 prefix
  Text: "Add date"
  Click: opens edit state (date/time inputs + ALL toggle)
```

#### Description (Collapsed by Default)

```
Padding: px-5
Default: not rendered when bit.description is empty
Auto-expand: rendered when bit.description is non-empty on load
Trigger (when empty): "Add description" — text-xs text-muted-foreground

When expanded:
  textarea min-h-[60px] w-full resize-none
  text-sm text-foreground bg-transparent
  placeholder: "Add a description…"
  Collapses when empty on blur
```

#### Steps Header Row

```
Layout: flex items-center justify-between
Padding: px-5 pt-3 pb-0

Left: "Add a step" button
  flex items-center gap-1.5 rounded-md px-2 py-1
  text-xs font-medium text-muted-foreground
  hover:bg-accent hover:text-foreground
  Icon: Plus h-3.5 w-3.5

Right: Progress ring (moved from header)
  w-10 h-10 flex-shrink-0
  SVG viewBox="0 0 40 40"
  Track: stroke hsl(var(--secondary)), strokeWidth 3
  Fill: stroke hsl(var(--primary)), strokeWidth 3, strokeLinecap round
  Center label: text-[10px] font-medium text-muted-foreground, "{pct}%"
  Hidden when totalChunks === 0
```

#### Chunk Area

```
Padding: px-5 pt-2 pb-5
Layout: relative pl-6

Vertical connecting line:
  absolute left-[11px] top-2 bottom-2 w-0.5 bg-border

Rendering order:
  Single unified list of all chunks, sorted by chunk.order (manual order).
  No separate timed-step section. Timed steps render inline with a time
  sub-label (see Step Item). Drag reordering applies to all steps.
```

#### Step Item

```
Layout: relative flex items-start gap-3 pb-5
No wrapping card — no border, no background, no card padding

Dot: relative z-10 mt-1 flex-shrink-0
  Size: w-3.5 h-3.5 rounded-full
  Complete:   bg-primary (solid fill, no border)
  Incomplete: bg-transparent border-2 border-muted-foreground/40

Content: flex-1 min-w-0
  Title: text-sm
    Default: text-foreground
    Complete: line-through text-muted-foreground
    Click to edit inline (input replaces text)
  Time (when set): text-xs text-muted-foreground mt-0.5
    Format: "Mon, 9:00 AM" / "Wed, 2:00 PM"

Hover affordances (opacity-0 → opacity-100 on parent hover):
  Drag handle: absolute -left-5 top-0.5, GripVertical h-3.5 w-3.5
  Delete: absolute right-0, Trash2 h-3.5 w-3.5
```

#### Deadline Footer

```
Position: below chunk area (outside chunk container)
Padding: px-5 pb-5
Layout: flex items-center gap-2

Icon: Clock h-4 w-4 text-destructive flex-shrink-0
Text: text-sm text-destructive
  Format: "Apr 16, 2026 12:00 AM" (full datetime)
         "Apr 16, 2026" (all-day)

Hidden when bit.deadline === null
```

#### Empty State (No Steps)

```
Centered within chunk area:
  Vertical line stub: h-8 w-0.5 bg-border
  Hollow dot: h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/30
  "Add a step" button below
```

## Phase 34 / Task 167 P34-07 — Context presentation-copy roles

Bound to the exact approved supplemental receipt (`Issues_Phase_34.Task_167.task-scope-context-copy.json` in tag `archive/phase-34-codex`),
these additions change only retro-mac Context decoration/sort presentation.

| Role | Approved treatment |
| --- | --- |
| `context-title-strip` | Retain16px strip;8px/700 mono text, contrast against strip ink,8px inline padding, flex space-between, pointer-events none. |
| `context-dialog-info` / `context-decoration-close` | Central copy `[ FOLDER DIALOG: INFO ]` / `[X]`; aria-hidden, non-focusable text spans; no command or new status. |
| `context-sort-current-label` | Existing visible ASC/DESC and canonical current-order accessible text, shown by default; hidden only in retro-mac. |
| `context-sort-next-label` | Hidden by default; retro-mac shows centralized next-order text: DESC→OLD FIRST, ASC→NEW FIRST. Active label owns accessible name. |

Keep one shared semantic tree; CSS selects presentation roles without theme-ID
code branches or CSS-generated copy. Other7 themes retain their existing labels.
No other theme/token/editor/state/copy/geometry changes: Context120.25px retro,
104px others,9.5rem action reserve and48px row remain authoritative.
