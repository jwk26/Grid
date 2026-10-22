# Visual Recipe: Batch 2 Theme System + Themed Grid

> Source:
> - `prototype/future-ideas` commit `64e5236` — theme runtime, theme values, provider/toggle
> - `prototype/future-ideas` commit `5b3d3c0` — grid theme consumption
> Current baseline: Phase 19 app after merge into `docs/batch-2-pre-promotion`
> Date: 2026-06-23
> Status: Drafted in writing-documents Step 0.75
>
> Scope: visual/token/runtime recipe only. This does not implement the theme system and does not amend canonical docs by itself.
>
> Feedback lane amendment (promotion ②, 2026-10-22): the theme set shrinks to `griddo`, `retro-mac`, `neumorphism` and `claymorphism` (Task 241, feedback F28). The `tiny-desk`, `origami`, `terminal` and `graphite` values below are history and bind nothing after Task 241; canonical list: [DESIGN_TOKENS](../DESIGN_TOKENS.md#theme-ids).

## Extraction Method

- Read source files directly with `git show`.
- Extracted theme values from `64e5236:src/app/themes.css` (7 override themes) and `64e5236:src/app/globals.css` (base/default layer + swatches + shared classes); both transcribed verbatim in § Exact Theme Values (source of record).
- Extracted runtime shape from `64e5236:src/stores/theme-store.ts`, `color-theme-provider.tsx`, `color-theme-toggle.tsx`, `layout.tsx`, and `providers.tsx`.
- Extracted grid consumption from `5b3d3c0:src/components/grid/grid-cell.tsx` and `node-card.tsx`.
- Current `DESIGN_TOKENS.md` has no active theme-axis contract yet; Batch 2 must add one during canonical amendment.

## Source Files

| Source file | Role | Adoption |
|---|---|---|
| `64e5236:src/app/themes.css` | Exact **override** theme variables + component theme classes (7 non-default themes) | Adopt as visual/token source |
| `64e5236:src/app/globals.css` | **Base/default layer**: theme/calendar contract defaults, swatches, `.dark` base shadows, shared `.theme-*` classes (= `griddo` base) | Adopt as visual/token source |
| `64e5236:src/stores/theme-store.ts` | Theme id list, persistence key, validation | Partial Adopt |
| `64e5236:src/components/layout/color-theme-provider.tsx` | Applies `data-color-theme` to `<html>` | Partial Adopt |
| `64e5236:src/components/layout/color-theme-toggle.tsx` | Theme picker popover, labels, swatches | Partial Adopt |
| `64e5236:src/app/layout.tsx` | Font variables + no-flash init script | Partial Adopt |
| `64e5236:src/app/providers.tsx` | Provider placement under `next-themes` | Partial Adopt |
| `5b3d3c0:src/components/grid/grid-cell.tsx` | Grid line theme class | Adopt visual pattern |
| `5b3d3c0:src/components/grid/node-card.tsx` | Node card theme class | Adopt visual pattern |

## Runtime Contract

### Theme Axis

```ts
COLOR_THEMES = [
  "griddo",
  "tiny-desk",
  "neumorphism",
  "claymorphism",
  "origami",
  "terminal",
  "retro-mac",
  "graphite",
] as const
```

- Theme id type: union of `COLOR_THEMES`.
- Default: `griddo`.
- Persistence key: `griddo-color-theme`.
- Stored shape: Zustand persist state with `colorTheme`.
- Runtime attribute: `<html data-color-theme="...">`.
- Dark/light remains controlled by `next-themes` class (`.dark`); color theme is an orthogonal axis.
- Hydration flash prevention: inline init script reads `localStorage["griddo-color-theme"]`, validates against allowed ids, and sets `document.documentElement.dataset.colorTheme` before hydration.

### Provider Placement

- `ThemeProvider` from `next-themes` remains the dark/light provider.
- `ColorThemeProvider` runs inside app providers and updates `document.documentElement.dataset.colorTheme`.
- Theme runtime must not replace `next-themes`.

### Theme Picker

- Trigger: icon-only `Palette` button.
- Accessible name: `Change color theme`.
- Surface: `PopoverContent align="end" side="right" sideOffset={12}`.
- Width/padding: `w-56 p-1`.
- Item row: icon swatch, label, selected check.
- Selected row: `bg-accent text-foreground`.
- Non-selected row: `text-muted-foreground`, hover to `hover:bg-accent hover:text-foreground`.
- Swatch tokens:
  - `--color-theme-swatch-griddo`
  - `--color-theme-swatch-tiny-desk`
  - `--color-theme-swatch-neumorphism`
  - `--color-theme-swatch-claymorphism`
  - `--color-theme-swatch-origami`
  - `--color-theme-swatch-terminal`
  - `--color-theme-swatch-retro-mac`
  - `--color-theme-swatch-graphite`

## Theme Variable Contract

Each theme may set:

- Core shadcn tokens: `--background`, `--foreground`, `--card`, `--primary`, `--border`
- Page: `--page-bg`
- Grid: `--grid-line-color`, `--grid-bg-l0`, `--grid-bg-l1`, `--grid-bg-l2`, `--grid-bg-l3`
- Typography: `--theme-font`
- Shape: `--theme-radius`, `--theme-border-width`, `--theme-border-style`, `--theme-line-style`
- Depth: `--theme-card-bg`, `--theme-shadow`, `--theme-shadow-hover`
- Calendar: `--calendar-cell-bg`, `--calendar-header-bg`, `--calendar-border-color`, `--calendar-grid-line-color`, `--calendar-cell-radius`, `--calendar-cell-shadow`, `--calendar-today-*`

Implementation must preserve prototype values unless an explicit contrast, build, or compatibility conflict is recorded.

## Theme Inventory

| Theme | Label | Light identity | Dark identity | Font | Shape / border | Depth |
|---|---|---|---|---|---|---|
| `griddo` | GridDO | current warm GridDO base: `--page-bg: hsl(38 28% 91%)`, `--primary: 221 83% 53%` | current dark base: `--page-bg: hsl(240 10% 6%)`, `--primary: 217 91% 60%` | `var(--font-geist-sans)` | radius `1.5rem`, border `1px` | soft app shadow |
| `tiny-desk` | Tiny Desk | wood/cork: bg `35 60% 90%`, fg `25 50% 30%`, card `35 60% 85%`, primary/border `25 50% 30%` | dark wood: bg `25 50% 15%`, fg `35 60% 80%`, card `25 50% 12%` | `var(--font-playfair), serif` | radius `8px`, border `3px` | offset natural shadow |
| `neumorphism` | New Morphism | soft grey extrusion: bg/card/border `210 20% 90%`, fg/primary `0 0% 20%` | dark extrusion: bg/card/border `0 0% 10%`, fg/primary `0 0% 90%` | `var(--font-inter), sans-serif` | radius `20px`, border `0px` | paired light/dark box shadows |
| `claymorphism` | 3D Clay | glossy clay: bg/card `340 30% 95%`, fg `340 30% 30%`, primary `340 80% 60%` | dark clay: bg `240 20% 15%`, card/border `240 20% 20%`, primary `340 80% 60%` | `var(--font-inter), sans-serif` | radius `32px`, border `0px` | large outer + inset clay shadows |
| `origami` | Origami | paper fold: bg `40 20% 95%`, card `40 20% 98%`, primary `15 80% 60%`, border `0 0% 80%` | dark folded paper: bg `220 20% 15%`, fg `40 20% 90%`, border `220 20% 25%` | `var(--font-space-mono), monospace` | asymmetric radius `2px 12px 2px 12px / 12px 2px 12px 2px`, border `1px` | subtle folded paper shadows |
| `terminal` | Terminal | green console: bg/card `0 0% 5%`, fg/primary/border `120 100% 50%` | amber console: bg/card `0 0% 0%`, fg/primary/border `30 100% 50%` | `var(--font-vt323), monospace` | radius `0px`, border `2px` | no base shadow; hover glow |
| `retro-mac` | Retro Mac | classic black/white: bg/card `0 0% 100%`, fg/border `0 0% 0%`, page `hsl(0 0% 90%)` | inverted classic: bg/card `0 0% 0%`, fg/border `0 0% 100%`, page `hsl(0 0% 10%)` | `var(--font-space-mono), monospace` | radius `4px`, border `2px` | hard 2px/4px offset shadow |
| `graphite` | Graphite | architectural neutral: bg `0 0% 100%`, fg/primary/border `0 0% 20%`, card `0 0% 96%` | black graphite: bg `0 0% 0%`, fg/primary/border `0 0% 90%`, card `0 0% 6%` | `var(--font-inter), sans-serif` | radius `8px`, border `2px` | restrained neutral shadow |

## Font Loading Contract

Prototype imports:

- `Inter` → `--font-inter`
- `Playfair_Display` → `--font-playfair`
- `Space_Mono` → `--font-space-mono`
- `VT323` → `--font-vt323`
- Existing Geist Sans/Mono remain loaded.

If implementation cannot add the prototype font loading path without build/network risk, it must report the conflict explicitly and choose a documented fallback. It must not silently collapse all themes to Geist.

## Grid Visual Consumption

### Grid Cell

Prototype changes `GridCell` root class to:

```tsx
"theme-grid-line relative h-full transition-all"
```

`theme-grid-line` contract:

```css
.theme-grid-line {
  border-color: hsl(var(--border));
  border-radius: var(--theme-radius);
  border-style: var(--theme-line-style);
  border-width: var(--theme-border-width);
}
```

Current grid behavior and sizing remain authoritative:

- 18 columns × 9 rows
- responsive node sizing tokens
- DnD drop indicators
- edit-mode add affordance
- active grid filtering/lifecycle behavior

### Node Card

Prototype adds `theme-node-card` to `NodeCard` root button:

```tsx
"theme-node-card group relative grid h-[var(--grid-node-size)] w-[var(--grid-node-size)] ..."
```

`theme-node-card` contract:

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
```

Phase 19 additions to NodeCard must be preserved, including the Archive menu trigger and system-node guard.

### Shared Surface

Prototype defines:

```css
.theme-surface {
  background: var(--theme-card-bg);
  border-color: hsl(var(--border));
  border-radius: var(--theme-radius);
  border-style: var(--theme-border-style);
  border-width: var(--theme-border-width);
  box-shadow: var(--theme-shadow);
}
```

Use for theme-aware popovers/surfaces where appropriate. Do not globally replace all shadcn surfaces without checking contrast/focus states.

## Adopted

- Adopt the 8 theme ids and user-facing labels.
- Adopt `data-color-theme` as the color-theme axis.
- Adopt `griddo-color-theme` persistence key unless canonical docs choose a migration-safe alternative.
- Adopt theme variable categories and exact prototype values.
- Adopt `theme-node-card`, `theme-grid-line`, and `theme-surface` patterns.
- Adopt swatch-based theme picker.
- Preserve the existing dark/light `next-themes` axis.

## Retained

- Current Phase 19 grid structure, responsive sizing, DnD, lifecycle filtering, and Archive menu behavior.
- Current shadcn token vocabulary as the base semantic layer.
- Current `next-themes` dark/light mode behavior.

## Improved / Required During Canonical Promotion

- `DESIGN_TOKENS.md` must become the canonical place for the 8-theme token contract.
- Exact prototype values should be copied into token documentation or referenced with enough precision that implementation cannot invent values.
- Any accessibility or contrast conflicts must be recorded as conflicts, not silently normalized.
- Theme classes must use stable CSS variables rather than hardcoded component-specific colors.

## Non-Adopted

- Prototype `/prototype` route chooser in sidebar is not adopted.
- Prototype code structure is not adopted wholesale.
- Prototype theme values do not override current app behavior outside token/visual contracts.

## Execution Handoff

Future implementation tasks should reference this recipe and assert:

- patch current app; no wholesale file replacement
- add color theme axis orthogonal to `next-themes`
- preserve all 8 visual identities as closely as practical
- preserve Phase 19 NodeCard Archive menu behavior
- run contrast/focus checks after applying theme values

---

## Exact Theme Values (source of record)

> **Source of record** for exact Batch 2 theme values, captured 2026-06-23 (F2 remediation) so values survive prototype-branch deletion. Two byte-exact layers from branch `prototype/future-ideas`:
> 1. **Base / Default Layer** — `64e5236:src/app/globals.css` (theme contract defaults, calendar defaults, swatches, `.dark` base shadows, shared `.theme-*` classes). This is also the `griddo` theme-contract layer, since `griddo` has no override block.
> 2. **Override Layers** — `64e5236:src/app/themes.css` (the 7 non-default themes override only what they change).
> The summary tables earlier in this recipe are navigational only — implementation copies these exact values, not the prose.

### Cascade / inheritance model

These are CSS override layers, not eight fully-expanded independent maps. Resolution order:

1. Base `:root` / `.dark` (globals.css) — the default layer.
2. `:root[data-color-theme="<id>"]` (themes.css) — the theme light overrides.
3. `.dark[data-color-theme="<id>"]` (themes.css) — the theme dark overrides, applied on top of (2).

- `griddo` has no override block; it IS the base layer.
- The 7 non-default themes override only the variables they list; everything omitted inherits from the active base light/dark layer.
- Do not expand omitted variables by guessing — preserve the cascade.

### Base / Default Layer (`64e5236:src/app/globals.css`)

```css
:root {
  /* Color Theme Contract */
  --theme-font: var(--font-geist-sans), -apple-system, system-ui, sans-serif;
  --theme-radius: 1.5rem;
  --theme-border-width: 1px;
  --theme-border-style: solid;
  --theme-line-style: dashed;
  --theme-card-bg: hsl(var(--card));
  --theme-shadow: 0 4px 14px rgba(15, 23, 42, 0.1);
  --theme-shadow-hover: 0 10px 24px rgba(15, 23, 42, 0.14);

  /* Calendar Visual Theme Contract */
  --calendar-cell-bg: hsl(var(--card) / 0.8);
  --calendar-header-bg: hsl(var(--muted) / 0.2);
  --calendar-border-width: 1px;
  --calendar-border-style: solid;
  --calendar-border-color: hsl(var(--border) / 0.2);
  --calendar-grid-line-color: hsl(var(--border) / 0.1);
  --calendar-cell-radius: 0px;
  --calendar-cell-shadow: none;
  --calendar-today-border-width: 2px;
  --calendar-today-border-style: solid;
  --calendar-today-border-color: hsl(var(--primary));
  --calendar-today-shadow: var(--calendar-cell-shadow);

  /* Color Theme Swatches */
  --color-theme-swatch-griddo: hsl(38 28% 91%);
  --color-theme-swatch-tiny-desk: hsl(35 60% 82%);
  --color-theme-swatch-neumorphism: hsl(210 20% 90%);
  --color-theme-swatch-claymorphism: hsl(340 30% 91%);
  --color-theme-swatch-origami: hsl(40 20% 93%);
  --color-theme-swatch-terminal: hsl(120 100% 50%);
  --color-theme-swatch-retro-mac: hsl(0 0% 95%);
  --color-theme-swatch-graphite: hsl(0 0% 47%);
}

.dark {
  --theme-shadow: 0 4px 14px rgba(0, 0, 0, 0.3);
  --theme-shadow-hover: 0 10px 24px rgba(0, 0, 0, 0.4);
}

@layer components {
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
}
```

### Override Layers — 7 non-default themes (`64e5236:src/app/themes.css`)

```css
/* 1. Tiny Desk — wooden planner / corkboard */
:root[data-color-theme="tiny-desk"] {
  --background: 35 60% 90%;
  --foreground: 25 50% 30%;
  --card: 35 60% 85%;
  --primary: 25 50% 30%;
  --page-bg: hsl(35 60% 90%);
  --border: 25 50% 30%;
  --grid-line-color: 25 50% 30%;
  --grid-bg-l0: 35 60% 90%;
  --grid-bg-l1: 35 60% 85%;
  --grid-bg-l2: 35 60% 80%;
  --grid-bg-l3: 35 60% 75%;

  --theme-font: var(--font-playfair), serif;
  --theme-radius: 8px;
  --theme-border-width: 3px;
  --theme-shadow: 2px 2px 5px rgba(0, 0, 0, 0.2);
  --theme-shadow-hover: 4px 4px 10px rgba(0, 0, 0, 0.25);

  --calendar-cell-bg: hsl(35 60% 95%);
  --calendar-header-bg: hsl(40 40% 80%);
  --calendar-border-color: hsl(25 50% 40% / 0.3);
  --calendar-grid-line-color: hsl(25 50% 40% / 0.3);
  --calendar-cell-radius: 4px;
}

.dark[data-color-theme="tiny-desk"] {
  --background: 25 50% 15%;
  --foreground: 35 60% 80%;
  --card: 25 50% 12%;
  --primary: 35 60% 80%;
  --page-bg: hsl(25 50% 15%);
  --border: 35 60% 80%;
  --grid-line-color: 35 60% 80%;
  --grid-bg-l0: 25 50% 15%;
  --grid-bg-l1: 25 50% 12%;
  --grid-bg-l2: 25 50% 9%;
  --grid-bg-l3: 25 50% 6%;

  --theme-shadow: 2px 2px 5px rgba(0, 0, 0, 0.4);
  --theme-shadow-hover: 4px 4px 10px rgba(0, 0, 0, 0.5);
  --calendar-cell-bg: hsl(25 50% 18%);
  --calendar-header-bg: hsl(25 30% 25%);
}

/* 2. New Morphism — soft extrusion */
:root[data-color-theme="neumorphism"] {
  --background: 210 20% 90%;
  --foreground: 0 0% 20%;
  --card: 210 20% 90%;
  --primary: 0 0% 20%;
  --page-bg: hsl(210 20% 90%);
  --border: 210 20% 90%;
  --grid-line-color: 0 0% 20%;
  --grid-bg-l0: 210 20% 90%;
  --grid-bg-l1: 210 20% 90%;
  --grid-bg-l2: 210 20% 90%;
  --grid-bg-l3: 210 20% 90%;

  --theme-font: var(--font-inter), sans-serif;
  --theme-radius: 20px;
  --theme-border-width: 0px;
  --theme-card-bg: var(--page-bg);
  --theme-shadow: 8px 8px 16px #c5c9d1, -8px -8px 16px #ffffff;
  --theme-shadow-hover: 12px 12px 20px #c5c9d1, -12px -12px 20px #ffffff;

  --calendar-cell-bg: var(--page-bg);
  --calendar-cell-radius: 24px;
  --calendar-border-color: transparent;
  --calendar-grid-line-color: transparent;
  --calendar-cell-shadow: 4px 4px 8px #c5c9d1, -4px -4px 8px #ffffff;
  --calendar-today-shadow: inset 4px 4px 8px #c5c9d1, inset -4px -4px 8px #ffffff;
}

.dark[data-color-theme="neumorphism"] {
  --background: 0 0% 10%;
  --foreground: 0 0% 90%;
  --card: 0 0% 10%;
  --primary: 0 0% 90%;
  --page-bg: hsl(0 0% 10%);
  --border: 0 0% 10%;
  --grid-line-color: 0 0% 90%;
  --grid-bg-l0: 0 0% 10%;
  --grid-bg-l1: 0 0% 10%;
  --grid-bg-l2: 0 0% 10%;
  --grid-bg-l3: 0 0% 10%;

  --theme-card-bg: var(--page-bg);
  --theme-shadow: 5px 5px 10px #0b0b0b, -5px -5px 10px #292929;
  --theme-shadow-hover: 8px 8px 15px #0b0b0b, -8px -8px 15px #292929;
  --calendar-cell-shadow: 4px 4px 8px #080808, -4px -4px 8px #181818;
  --calendar-today-shadow: inset 4px 4px 8px #080808, inset -4px -4px 8px #181818;
}

/* 3. 3D Claymorphism — puffy / tactile */
:root[data-color-theme="claymorphism"] {
  --background: 340 30% 95%;
  --foreground: 340 30% 30%;
  --card: 340 30% 95%;
  --primary: 340 80% 60%;
  --page-bg: hsl(340 30% 95%);
  --border: 340 30% 95%;
  --grid-line-color: 340 30% 85%;
  --grid-bg-l0: 340 30% 95%;
  --grid-bg-l1: 340 30% 95%;
  --grid-bg-l2: 340 30% 95%;
  --grid-bg-l3: 340 30% 95%;

  --theme-font: var(--font-inter), sans-serif;
  --theme-radius: 32px;
  --theme-border-width: 0px;
  --theme-shadow: 6px 6px 12px rgba(0, 0, 0, 0.1), -6px -6px 12px rgba(255, 255, 255, 0.9), inset 4px 4px 8px rgba(255, 255, 255, 0.9), inset -4px -4px 8px rgba(0, 0, 0, 0.05);
  --theme-shadow-hover: 8px 8px 16px rgba(0, 0, 0, 0.15), -8px -8px 16px rgba(255, 255, 255, 1), inset 6px 6px 10px rgba(255, 255, 255, 1), inset -6px -6px 10px rgba(0, 0, 0, 0.05);

  --calendar-cell-bg: hsl(340 30% 97%);
  --calendar-cell-radius: 32px;
  --calendar-border-color: transparent;
  --calendar-grid-line-color: transparent;
  --calendar-cell-shadow: 10px 10px 20px rgba(0, 0, 0, 0.05), inset 4px 4px 8px rgba(255, 255, 255, 0.8);
}

.dark[data-color-theme="claymorphism"] {
  --background: 240 20% 15%;
  --foreground: 240 20% 90%;
  --card: 240 20% 20%;
  --primary: 340 80% 60%;
  --page-bg: hsl(240 20% 15%);
  --border: 240 20% 20%;
  --grid-line-color: 240 20% 25%;
  --grid-bg-l0: 240 20% 15%;
  --grid-bg-l1: 240 20% 15%;
  --grid-bg-l2: 240 20% 15%;
  --grid-bg-l3: 240 20% 15%;

  --theme-shadow: 6px 6px 12px rgba(0, 0, 0, 0.3), -6px -6px 12px rgba(255, 255, 255, 0.05), inset 4px 4px 8px rgba(255, 255, 255, 0.1), inset -4px -4px 8px rgba(0, 0, 0, 0.2);
  --theme-shadow-hover: 8px 8px 16px rgba(0, 0, 0, 0.4), -8px -8px 16px rgba(255, 255, 255, 0.05), inset 6px 6px 10px rgba(255, 255, 255, 0.15), inset -6px -6px 10px rgba(0, 0, 0, 0.3);
  --calendar-cell-bg: hsl(240 20% 18%);
}

/* 4. Origami Papercraft — folded / faceted */
:root[data-color-theme="origami"] {
  --background: 40 20% 95%;
  --foreground: 0 0% 20%;
  --card: 40 20% 98%;
  --primary: 15 80% 60%;
  --page-bg: hsl(40 20% 95%);
  --border: 0 0% 80%;
  --grid-line-color: 0 0% 80%;
  --grid-bg-l0: 40 20% 95%;
  --grid-bg-l1: 40 20% 93%;
  --grid-bg-l2: 40 20% 91%;
  --grid-bg-l3: 40 20% 89%;

  --theme-font: var(--font-space-mono), monospace;
  --theme-radius: 2px 12px 2px 12px / 12px 2px 12px 2px;
  --theme-border-width: 1px;
  --theme-shadow: 2px 2px 4px rgba(0, 0, 0, 0.05), -1px -1px 2px rgba(255, 255, 255, 0.8);
  --theme-shadow-hover: 4px 4px 8px rgba(0, 0, 0, 0.1), -2px -2px 4px rgba(255, 255, 255, 0.9);

  --calendar-cell-bg: linear-gradient(135deg, hsl(40 20% 98%) 80%, hsl(40 20% 90%) 100%);
  --calendar-cell-radius: 0px;
  --calendar-border-color: hsl(0 0% 85%);
  --calendar-grid-line-color: hsl(0 0% 85%);
}

.dark[data-color-theme="origami"] {
  --background: 220 20% 15%;
  --foreground: 40 20% 90%;
  --card: 220 20% 18%;
  --primary: 15 80% 60%;
  --page-bg: hsl(220 20% 15%);
  --border: 220 20% 25%;
  --grid-line-color: 220 20% 25%;
  --grid-bg-l0: 220 20% 15%;
  --grid-bg-l1: 220 20% 13%;
  --grid-bg-l2: 220 20% 11%;
  --grid-bg-l3: 220 20% 9%;

  --theme-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3), -1px -1px 2px rgba(255, 255, 255, 0.05);
  --theme-shadow-hover: 4px 4px 8px rgba(0, 0, 0, 0.5), -2px -2px 4px rgba(255, 255, 255, 0.1);
  --calendar-cell-bg: linear-gradient(135deg, hsl(220 20% 20%) 80%, hsl(220 20% 10%) 100%);
}

/* 5. MS-DOS Terminal — retro console */
:root[data-color-theme="terminal"] {
  --background: 0 0% 5%;
  --foreground: 120 100% 50%;
  --card: 0 0% 5%;
  --primary: 120 100% 50%;
  --page-bg: hsl(0 0% 5%);
  --border: 120 100% 50%;
  --grid-line-color: 120 100% 50%;
  --grid-bg-l0: 0 0% 5%;
  --grid-bg-l1: 0 0% 7%;
  --grid-bg-l2: 0 0% 9%;
  --grid-bg-l3: 0 0% 11%;

  --theme-font: var(--font-vt323), monospace;
  --theme-radius: 0px;
  --theme-border-width: 2px;
  --theme-card-bg: hsl(0 0% 5%);
  --theme-shadow: none;
  --theme-shadow-hover: 0 0 15px hsl(120 100% 50%);

  --calendar-cell-bg: transparent;
  --calendar-cell-radius: 0px;
  --calendar-border-style: dashed;
  --calendar-border-color: hsl(120 100% 50% / 0.5);
  --calendar-grid-line-color: hsl(120 100% 50% / 0.5);
  --calendar-today-border-width: 2px;
  --calendar-today-border-color: hsl(120 100% 50%);
}

.dark[data-color-theme="terminal"] {
  --background: 0 0% 0%;
  --foreground: 30 100% 50%;
  --card: 0 0% 0%;
  --primary: 30 100% 50%;
  --page-bg: hsl(0 0% 0%);
  --border: 30 100% 50%;
  --grid-line-color: 30 100% 50%;
  --grid-bg-l0: 0 0% 0%;
  --grid-bg-l1: 0 0% 4%;
  --grid-bg-l2: 0 0% 8%;
  --grid-bg-l3: 0 0% 12%;

  --theme-card-bg: hsl(0 0% 0%);
  --theme-shadow-hover: 0 0 15px hsl(30 100% 50%);
  --calendar-border-color: hsl(30 100% 50% / 0.5);
  --calendar-grid-line-color: hsl(30 100% 50% / 0.5);
  --calendar-today-border-color: hsl(30 100% 50%);
}

/* 6. Retro Macintosh — classic desktop */
:root[data-color-theme="retro-mac"] {
  --background: 0 0% 100%;
  --foreground: 0 0% 0%;
  --card: 0 0% 100%;
  --primary: 0 0% 0%;
  --page-bg: hsl(0 0% 90%);
  --border: 0 0% 0%;
  --grid-line-color: 0 0% 0%;
  --grid-bg-l0: 0 0% 90%;
  --grid-bg-l1: 0 0% 85%;
  --grid-bg-l2: 0 0% 80%;
  --grid-bg-l3: 0 0% 75%;

  --theme-font: var(--font-space-mono), monospace;
  --theme-radius: 4px;
  --theme-border-width: 2px;
  --theme-shadow: 2px 2px 0px rgba(0, 0, 0, 1);
  --theme-shadow-hover: 4px 4px 0px rgba(0, 0, 0, 1);

  --calendar-cell-bg: #ffffff;
  --calendar-header-bg: repeating-linear-gradient(45deg, #eeeeee, #eeeeee 2px, #ffffff 2px, #ffffff 4px);
  --calendar-cell-radius: 0px;
  --calendar-border-color: #000000;
  --calendar-grid-line-color: #000000;
}

.dark[data-color-theme="retro-mac"] {
  --background: 0 0% 0%;
  --foreground: 0 0% 100%;
  --card: 0 0% 0%;
  --primary: 0 0% 100%;
  --page-bg: hsl(0 0% 10%);
  --border: 0 0% 100%;
  --grid-line-color: 0 0% 100%;
  --grid-bg-l0: 0 0% 10%;
  --grid-bg-l1: 0 0% 15%;
  --grid-bg-l2: 0 0% 20%;
  --grid-bg-l3: 0 0% 25%;

  --theme-shadow: 2px 2px 0px rgba(255, 255, 255, 1);
  --theme-shadow-hover: 4px 4px 0px rgba(255, 255, 255, 1);
  --calendar-cell-bg: #000000;
  --calendar-header-bg: repeating-linear-gradient(45deg, #222222, #222222 2px, #000000 2px, #000000 4px);
  --calendar-border-color: #ffffff;
  --calendar-grid-line-color: #ffffff;
}

/* 7. Graphite Minimalist — architectural */
:root[data-color-theme="graphite"] {
  --background: 0 0% 100%;
  --foreground: 0 0% 20%;
  --card: 0 0% 96%;
  --primary: 0 0% 20%;
  --page-bg: hsl(0 0% 100%);
  --border: 0 0% 20%;
  --grid-line-color: 0 0% 20%;
  --grid-bg-l0: 0 0% 100%;
  --grid-bg-l1: 0 0% 98%;
  --grid-bg-l2: 0 0% 96%;
  --grid-bg-l3: 0 0% 94%;

  --theme-font: var(--font-inter), sans-serif;
  --theme-radius: 8px;
  --theme-border-width: 2px;
  --theme-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
  --theme-shadow-hover: 0 8px 20px rgba(0, 0, 0, 0.1);

  --calendar-cell-bg: transparent;
  --calendar-cell-radius: 0px;
  --calendar-border-color: hsl(0 0% 90%);
  --calendar-grid-line-color: hsl(0 0% 90%);
}

.dark[data-color-theme="graphite"] {
  --background: 0 0% 0%;
  --foreground: 0 0% 90%;
  --card: 0 0% 6%;
  --primary: 0 0% 90%;
  --page-bg: hsl(0 0% 0%);
  --border: 0 0% 90%;
  --grid-line-color: 0 0% 90%;
  --grid-bg-l0: 0 0% 0%;
  --grid-bg-l1: 0 0% 4%;
  --grid-bg-l2: 0 0% 8%;
  --grid-bg-l3: 0 0% 12%;

  --theme-shadow: 0 4px 10px rgba(255, 255, 255, 0.05);
  --theme-shadow-hover: 0 8px 20px rgba(255, 255, 255, 0.1);
  --calendar-border-color: hsl(0 0% 20%);
  --calendar-grid-line-color: hsl(0 0% 20%);
}

```
