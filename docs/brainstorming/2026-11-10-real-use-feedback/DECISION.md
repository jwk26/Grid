# Real-Use Feedback (2026-11-10) — Classification and Index

## Metadata

- Created: 2026-11-10
- Updated: 2026-11-10 (first review round with the user)
- Readiness: draft
- Category: planning index
- Source project: GridDO
- Source topic: the user's real-use feedback after the Phase 54 merge (raw text and code check in `NOTES.md`)
- Source prototype: n/a (favorites reference: `2026-05-18-favorites`, view-only)
- Tags: real-use-feedback, sidebar, settings, context-menu, system-nodes, calendar, favorites, create-flow, command-palette, search, trash, archive, scrollbar, urgency, oauth-branding
- Dependencies: `2026-10-17-theme-scope-replan` (theme stage index), `2026-10-20-command-palette-default-behavior`, `2026-10-31-first-run-grid-tour`, `2026-05-18-favorites`, `2026-05-26-create-modal-design`, `2026-10-31-grid-bit-card-footprint`, `2026-04-28-archive-view-and-restore`, `2026-04-28-quick-capture-entry-surface`

## Summary

The user used Grid for real after the backend phases (51–54) and wrote 21
feedback items (R1–R21), then answered the control tower's first review
(R22 added). This entry gives each item its kind, lane and the topic it joins,
records the user's decisions, and lists what is still open. It is an index, like
`2026-10-17-theme-scope-replan`; each group gets a code-ready decision before
`/craft-docs`.

The feedback moves the FE/Visual pass: much of it changes how things work, not
only how they look. Surfaces whose function is about to change are not themed
first.

## Items

Kind: **Fix** = a spec gap or defect; **Rule** = a small rule change;
**Interaction** = a behavior change whose shape is mostly given; **IA** =
information architecture; **Function** = what a surface is for; **Visual** =
theme-stage look; **Config** = production configuration.

| ID | Item | Kind | Lane | State |
|---|---|---|---|---|
| R1 | Sidebar zones and order; Backup into Account; theme and dark mode into Settings | IA | app | decided, gap: edit mode |
| R2 | Sidebar hide | — | — | **dropped** (user) |
| R3 | Drag time: no icon swap; unusable sidebar icons dim | Interaction | app | decided, conflict with R6 |
| R4 | Inbox and Archive in one place (Grid by default, or the sidebar) | IA | app | decided |
| R5 | Calendar becomes a system Node | IA | **db** | decided (direction) |
| R6 | Favorites: one concept, sidebar slots, drawer | IA | **db** | decided, details open |
| R7 | Settings button | IA | app | decided |
| R8 | Right-click option menu on Node and Bit | Interaction | app | decided |
| R9 | Replace the top-right `...` with another visible entry | Interaction | app | decided, UI open |
| R10 | Limit the Bit by the drop-zone size | IA | **db** | decided (in `2026-10-31-grid-bit-card-footprint`) |
| R11 | A completed Bit drops the near-deadline alert | Fix | app | decided |
| R12 | Theme the Create/Edit dialogs, after R21 | Visual | app | decided |
| R13 | One "Item" for Node and Bit | — | — | **replaced by R21** (user) |
| R14 | Calendar Pool: align its top item with the sidebar; theme it | Fix + Visual | app | decided |
| R15 | Calendar Node/Bit cards use the Inbox Explorer cards | Visual | app | decided |
| R16 | Hidden scrollbars with an overflow cue; Calendar first | Rule | app | decided |
| R17 | Trash: depth, search, sort, layout, cards | Function + Visual | app | decided, restore confirm open |
| R18 | Archive purpose and UI | Function + Visual | app | **waiting for the user** |
| R19 | Search placeholder and scope | Rule | app | decided, Scratch search is new scope |
| R20 | Replace "Fixed Menu" with an `esc` hint | Fix (copy) | app | decided |
| R21 | One search input; create targets; Add Node / Add Bit; `+` menu | IA | app | decided, `+` header open |
| R22 | Google sign-in shows the Supabase project domain and no logo | Config (+ app) | — | question, options in `NOTES.md` |

## Decisions (user, 2026-11-10)

- **R1:** the sidebar has three internal zones, top to bottom: **A** Home, Add,
  Search; **B** system Nodes and Favorites; **C** Trash, Settings, Account.
  Users never see the zone names; dividers separate the zones. Color theme and
  dark/light move into Settings; Backup moves into Account.
- **R2:** dropped. Hiding a 48px sidebar gains too little.
- **R3:** nothing on the sidebar is usable during a Node or Bit drag, so every
  sidebar icon dims; icons are never swapped during a drag.
- **R4:** a system Node is on the Grid or on the sidebar, never both. Its Grid
  card shows no badge.
- **R5:** Calendar becomes a system Node next to Inbox and Archive. The first-run
  guide does not lead with moving them; the right-click menu of the three
  system Nodes offers "Add to sidebar".
- **R6:** one Favorite concept. Zone B holds at most 5 entries (system Nodes and
  Favorites); beyond that a drawer button opens the rest. Dotted Node
  placeholders in zone B signal that a Node can be dragged there. The favorites
  UI is new, not the qc prototype's.
- **R7:** a Settings button. Settings holds this device's display settings;
  Account holds account-level actions (sign-in, Backup, deletion).
- **R8:** a right-click option menu on Node and Bit cards (Open, Edit, Archive,
  Move to Trash), reachable from the keyboard too.
- **R9:** a visible entry to the same menu stays, but not the current top-right
  `...`: it is hard to see and hard to hit, especially while the hovered card
  is scaled. Another UI is to be designed.
- **R10, R11, R12, R14:** agreed as listed.
- **R13:** the "Item" concept is dropped (see R21).
- **R15:** correction of the feedback: the icons (lucide) stay; the unthemed
  part is the Calendar Node/Bit cards (Nodes have no theme at all). Calendar
  uses the Inbox Explorer Node/Bit cards, which are rectangular.
- **R16:** scrollbar chrome stays hidden and scrollable areas get an overflow
  cue. Calendar first; if it works, Inbox follows.
- **R17:** Trash shows the whole depth of a trashed Node (today only one level
  through "show children"); search; sort by newest and oldest; a confirmation
  before Restore; a two-column layout; the Inbox Staging Node/Bit cards.
- **R18:** the user explores Archive and reports back.
- **R19:** Chunk search stays. Placeholder: "Search Scratch, Node, Bit,
  Chunks..". Searching app features (for example dark mode, profile) is
  deferred.
- **R20:** agreed.
- **R21:** outside a specific Grid level, a new Node goes on L0. A Bit always
  needs a parent: wherever no parent is implied (L0, the palette), the parent
  selector appears; it is redesigned and shared by the Add dialog and the
  palette. The sidebar `+` and Cmd+K show Add Node and Add Bit separately; the
  Add dialog has a Node/Bit toggle.

## Open questions

- **R1 edit mode:** the zone list has no Pencil. Edit mode today gives jiggle,
  dashed cell outlines, `+` on empty cells and delete buttons (SPEC). Keep it
  (where?) or retire it once R8 covers Edit and Delete.
- **R3 vs R6:** if Nodes can be dragged into zone B, zone B is a drop target
  during a Node drag and cannot dim with the rest.
- **R6:** whether the 5 slots are shared between system Nodes and Favorites;
  when the dotted placeholders show and how many; the order of entries; where
  the favorite flag is stored.
- **R9:** the replacement UI (to be shown as a rendered option sheet).
- **R17:** whether Restore needs a confirmation (control tower view in
  `NOTES.md`); what each of the two columns holds; whether a child can be
  restored alone.
- **R19:** Scratch is not in `searchAll()` today (Nodes, Bits, Chunks only);
  what opening a Scratch result does.
- **R21:** the `+` menu: one "New Item" header with Scratch, Node, Bit (user
  proposal) or the two groups kept with a line each (control tower view in
  `NOTES.md`).
- **R22:** which option, if any, before the link is published.

## Frame (user agreed, 2026-11-10)

FE/Visual and R1–R22 are planned in three layers plus side lines, top to
bottom:

- **Layer 1 – shared parts**, built once: P1 the Node/Bit card family (square
  Grid card, wide Explorer card for Explorer and Calendar, Staging card for
  Inbox and Trash); P2 the option menu (one menu per item kind, the same
  everywhere); P3 the command input (Cmd+K and search in one); P4 the Add/Edit
  dialog with the parent selector (Scratch capture included); P5 the sidebar
  zones and slots; P6 the overflow cue; P7 the app-state screen frame; P8 the
  breadcrumb and Home (see Part inventory).
- **Layer 2 – surfaces**, assembled from the parts: Grid, Calendar, Trash,
  Archive, Inbox/Triage, Settings, Account, breadcrumb and Home, app-state
  screens and dialogs (loading, failure, expiry, restoring, narrow window,
  backup, deletion grace), first-visit guidance (Welcome, tour, ghost hints).
- **Layer 3 – skins:** Paper first, as the first skin of the new parts (no
  repaint in `griddo`), then `retro-mac`, `neumorphism`, `claymorphism`.
- **Side lines:** DB (data changes the parts need); a small-fix basket
  (fixes and tests unrelated to the layers).

Done means every row of the coverage matrix has a home.

**Theme skins (user, 2026-11-10):**

- Every part gets its theme hook (a class or data attribute that the
  `.theme-*` CSS targets) when it is built in Layer 1; components never branch
  on the theme id (Architecture Rule 8).
- Paper is painted when a part is built. The other themes follow in one phase
  per theme, after the parts are stable.
- Each part's option sheet shows all four themes in rough form, so the
  structure fits every theme; only Paper is built then.
- A theme whose skin is unfinished is hidden from the theme list until its
  phase closes. Whether `retro-mac` or `neumorphism` are finished before the
  link is published is a publish-line question.
- The Paper UI made so far (`prototype/default-theme`) is discarded; Paper is
  designed again from the start. The branch itself stays as it is.
- The Paper concept (cream paper, ink, serif) is discarded too. A new default
  theme concept is made from a few reference images (view-only: mood and
  direction, never copied). Its name and theme id may change with it. Kept from
  the old topic: its measured contrast results and its list of structural
  changes and conflicts, as a checklist the new theme must answer.

**Part inventory (user, 2026-11-10):** parts are built in four tiers, bottom
up.

- **Tier 0 – tokens:** color (surface, text, accent, status, the three urgency
  levels), type (heading, body, scale), spacing, radius, depth (shadow,
  border, elevation), motion, focus ring.
- **Tier 1 – basic parts:** button (primary, secondary, danger, icon), text
  input (single, multi-line), **segmented toggle** (Node / Bit), check,
  **searchable select** (parent selector), dropdown menu, **context menu**,
  popover, tooltip, dialog and confirm dialog, toast, status icon, pending
  indicator, count badge, date picker, scroll area with the **overflow cue**.
  Bold = not in the code today.
- **Tier 2 – composite parts:** P1 card family (Grid, wide Explorer, Staging,
  and a **list row** for Trash, Archive and search results), P2 option menu,
  P3 command input, P4 Add/Edit dialog with the parent selector, P5 sidebar,
  P6 overflow cue, **P7 app-state screen frame**, **P8 breadcrumb and Home**.
- **Tier 3 – surfaces** are assemblies, not parts.
- A part needs at least two users (surfaces); otherwise it stays inside its
  surface.
- A development-only **parts catalog** route renders every real part in all
  four themes, light and dark; it is the place for visual checks and for each
  theme phase's completeness check. The catalog and the tier-0 tokens come
  first.

## Coverage matrix (draft, control tower proposal; homes to be confirmed)

Homes: **L1-Pn** part, **L2** surface, **L3** skin, **DB** side line,
**Basket**, **After** (after the link is published), **Dropped**, **Policy**
(a product decision first).

### R items

| Row | Home | Note |
|---|---|---|
| R1 | L1-P5 | edit-mode question open |
| R2 | Dropped | user |
| R3 | L1-P5 | with R6 drop target |
| R4 | L1-P5 | rule on `hiddenFromGrid` |
| R5 | DB + L1-P2 | "Add to sidebar" in the menu |
| R6 | DB + L1-P5 | favorites UI new |
| R7 | L2 Settings | device vs account rule |
| R8 | L1-P2 | keyboard path |
| R9 | L1-P2 | = ISSUE-19-01 |
| R10 | DB | footprint topic, after P1 |
| R11 | Basket | completed Bit urgency |
| R12 | L1-P4 → L3 | after R21 |
| R13 | Dropped | replaced by R21 |
| R14 | Basket (alignment) + L2 Calendar | |
| R15 | L1-P1 → L2 Calendar | wide Explorer card |
| R16 | L1-P6 | Calendar first, then Inbox |
| R17 | L2 Trash | uses P1 Staging card, P3 search |
| R18 | L2 Archive | waiting for the user |
| R19 | L1-P3 | Scratch search is new scope |
| R20 | L1-P3 | |
| R21 | L1-P3 + L1-P4 | |
| R22 | Policy | before the link: option A/B/C or none |

### Earlier FE/Visual map

| Row | Home | Note |
|---|---|---|
| ① Paper (`prototype/default-theme`) | L3 (first skin) | the prototype UI is discarded (user, 2026-11-10); Paper is designed again |
| ② card look per theme (`2026-10-20-grid-card-theme-alignment`) | L1-P1 → L3 | before ③ (user, 10-31) |
| ③ Bit card footprint (`2026-10-31-grid-bit-card-footprint`) | DB | measured on the P1 card |
| ④ Claymorphism (`2026-10-20-claymorphism-polish`) | L3 | hide or finish: decided at the publish line |
| ④ sidebar and breadcrumb skins (`2026-10-20-app-shell-theme-coverage`) | L1-P5 + L2 breadcrumb/Home → L3 | |
| ④ theme ledger items | L3 | rows below |
| ⑤ first-run tour (`2026-10-31-first-run-grid-tour`) | L2 first-visit guidance | last: teaches the final interactions |
| ⑤ Cmd+K (`2026-10-20-command-palette-default-behavior`) | L1-P3 | |
| ⑤ create modal (`2026-05-26-create-modal-design`) | L1-P4 | |
| ⑥ small fixes and tests | Basket | rows below |
| ⑦ Favorites (`2026-05-18-favorites`) | DB + L1-P5 | = R6 |
| ⑦ Review Mode (`2026-04-28-review-mode`) | After | proposal |
| ⑦ quarterly calendar (`2026-05-26-quarterly-calendar-view`) | After | proposal |
| ⑦ Triage scheduling (`2026-04-28-triage-scheduling`) | After | proposal |
| ⑦ Archive auto-cleanup (`2026-05-26-archive-auto-cleanup`) | L2 Archive | decided with R18 |
| ⑦ rollup (`2026-04-28-node-rollup-focus-aging`) | After | proposal |
| ⑦ visual archive (`2026-05-18-visual-archive-app`) | After | proposal |
| ⑧ stale brainstorming docs (about 5) | Basket (docs) | status marks only (1st control tower D7) |

### Deferred ledger (`Issues_Deferred.md`, all 30 active rows)

| Row | Home | Note |
|---|---|---|
| P3 Issue 5 icon picker keyboard | L1-P4 | |
| P14 Calendar `toSorted()` note | After | only if measurable |
| P14 popup focus-visible | L2 Calendar | |
| ISSUE-16-02 Scratch modal focus trap | L1-P4 | |
| ISSUE-18-08 remove-target animation | L2 Inbox | |
| ISSUE-18-09 remove-target and Archive ring polish | L2 Inbox | |
| ISSUE-18-16 drop a staged item back on Breakdown | L2 Inbox | |
| ISSUE-18-22 duplicate titles | Policy | |
| ISSUE-19-01 `⋯` too subtle | L1-P2 | = R9 |
| ISSUE-20-02 Bit card has no theme | L1-P1 → L3 | = ② |
| ISSUE-21-03 weekly header label | L2 Calendar | |
| P29-01 Explorer card gap and theme debt | L1-P1 → L3 | |
| P34 MI-6 retro-mac Explorer locked pane | L3 | |
| P45 MI-24 retro-mac state screens on dither | L3 | |
| P48 mi-1 account modal and neumorphism dialog hover | L3 + L2 Account | |
| P48 mi-2 retro-mac app screens on dither | L3 | |
| P48 mi-3 `next dev` blank after Back | Basket | dev tooling |
| P48 mi-4 ghost hints not implemented | L2 first-visit guidance | |
| P48 mi-5 Bit overlap at 1024px | DB | = ③ |
| P48 mi-6 no keep-alive | — | operations, none planned (stays in the ledger) |
| P50 mi-7 neumorphism Newly title | L3 | |
| P50 mi-10 first drag landed one cell off | Basket | on recurrence |
| P51 mi-1 live-read test timing | Basket | on recurrence |
| P51 mi-3 `?bit=` on a cold prerendered load | Basket | |
| P51 mi-4 focus on `BODY` once | Basket | on recurrence |
| P51 mi-6 Inbox `Check again` | Basket | |
| P53 mi-5 DP-VQ01 test under load | Basket | fix (user, 11-09) |
| P53 mi-3 restore list shows copy time | Basket | before a real recovery |
| P53 mi-4 restore staging at higher caps | DB | with the byte limit |
| Manual dump retirement | DB | first SQL phase `/craft-docs` |

### Outside FE/Visual, kept so nothing is lost

| Row | Home |
|---|---|
| H1, H2 GridDO `CLAUDE.md` (MI numbering sentence, Workflow section size) | the FE `/craft-docs` |
| byte limit, Supabase CLI v3 | DB side line candidates |
| decision 1 (publish line, B′ proposed) | next in the discussion order |

## Shared rules (user, 2026-11-10)

Every layer, the concept/mockup session included, follows these:

1. **Same item, same menu.** A Node or Bit has the same option menu wherever it
   appears (Grid, sidebar, Calendar, Trash, search results); only items that
   cannot apply there are left out.
2. **Keyboard parity.** Whatever the pointer can do, the keyboard can do (for
   example the option menu opens with the context-menu key and `Shift+F10`).
3. **Fix the part, not add a device.** A missing signal or a worry is solved in
   the part first (for example a restore toast that says where the item went),
   before a new confirmation, placeholder or hint is added.
4. **Visible means finished.** What a visitor can see is finished; what is not
   finished is hidden (for example an unfinished theme leaves the theme list).

## Discussion order (user agreed, 2026-11-10)

1. Shared rules (the same item has the same menu everywhere; keyboard parity;
   fix the part rather than add a device; what is visible is finished).
2. The publish line (decision 1 and the After/Dropped rows above).
3. Parts: P2 menu → P3 input with P4 dialog → P1 card family → P5 sidebar.
4. Remaining surfaces: Trash, Archive (after the user's exploration).
5. Phases.
