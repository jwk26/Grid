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
| R1 | Sidebar zones and order; Backup into Account; theme and dark mode into Settings | IA | app | decided; edit mode retired (P2-1) |
| R2 | Sidebar hide | — | — | **dropped** (user) |
| R3 | Drag time: no icon swap; unusable sidebar icons dim | Interaction | app | decided; zone B rule below |
| R4 | Inbox and Archive in one place (Grid by default, or the sidebar) | IA | app | decided |
| R5 | Calendar becomes a system Node | IA | **db** | decided (direction) |
| R6 | Favorites: one concept, sidebar slots, drawer | IA | **db** | decided (Sidebar zone B); flag storage open |
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
| R18 | Archive purpose and UI | Function + Visual | app | **settled in the concept/mockup session** (user) |
| R19 | Search placeholder and scope | Rule | app | decided, Scratch search is new scope |
| R20 | Replace "Fixed Menu" with an `esc` hint | Fix (copy) | app | decided |
| R21 | One search input; create targets; Add Node / Add Bit; `+` menu | IA | app | decided, `+` header open |
| R23 | **Production defect:** `+` on the Inbox page offers Node and Bit; Node fails with "Couldn't create … Try again.", Bit silently becomes a Scratch; the parent list offers Inbox and Archive | Fix | app | found 2026-11-10; the user confirmed on the Archive page too (Node and Bit both fail); basket, first (user) |
| R24 | The create dialogs do not fit a 1920×1080 window (cut at top and bottom; usable only at 90% zoom) | Fix | app | found 2026-11-10; basket, first (user) |
| R22 | Google sign-in shows the Supabase project domain and no logo | Config (+ app) | — | last, right before the link (user); options in `NOTES.md` |

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
- **R18:** the user explores Archive; the result is settled in the concept/mockup session (see Publish line).
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

- **R6 storage (DB):** where the Favorite flag and the Favorites order live (a
  column on `nodes` or a table).

- **R9:** the replacement UI (to be shown as a rendered option sheet).
- **R17:** whether Restore needs a confirmation (control tower view in
  `NOTES.md`); what each of the two columns holds; whether a child can be
  restored alone.
- **R19:** Scratch is not in `searchAll()` today (Nodes, Bits, Chunks only);
  what opening a Scratch result does.
- **R22:** which option, if any; decided last, right before the link.
- **Aging rules:** levels, thresholds, which items (Inbox Scratch?), completed
  and urgent items; settled with P1 (see Aging below and `NOTES.md` §Aging
  check).

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
- **Layer 3 – skins:** the new default theme first, as the first skin of the new parts (no
  repaint in `griddo`), then `retro-mac`, `neumorphism`, `claymorphism`.
- **Side lines:** DB (data changes the parts need); a small-fix basket
  (fixes and tests unrelated to the layers).

Done means every row of the coverage matrix has a home.

**Theme skins (user, 2026-11-10):**

- Every part gets its theme hook (a class or data attribute that the
  `.theme-*` CSS targets) when it is built in Layer 1; components never branch
  on the theme id (Architecture Rule 8).
- The new default theme is painted when a part is built. The other themes follow in one phase
  per theme, after the parts are stable.
- Each part's option sheet shows all four themes in rough form, so the
  structure fits every theme; only the new default theme is built then.
- A theme whose skin is unfinished is hidden from the theme list until its
  phase closes. Whether `retro-mac` or `neumorphism` are finished before the
  link is published is a publish-line question.
- The Paper UI made so far (`prototype/default-theme`) is discarded; the default
  theme is designed again from the start. The branch itself stays as it is.
- The Paper concept (cream paper, ink, serif) is discarded too. A new default
  theme concept is made from a few reference images (view-only: mood and
  direction, never copied). Its name and theme id are open; "Paper" and `paper` in this entry and in SPEC (SaaS S40) are not a decision for the new theme. Kept from
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
| R1 | L1-P5 | edit mode retired (P2-1) |
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
| R18 | L2 Archive | concept/mockup session |
| R19 | L1-P3 | Scratch search is new scope |
| R20 | L1-P3 | |
| R21 | L1-P3 + L1-P4 | |
| R22 | Policy | last, right before the link (user) |

### Earlier FE/Visual map

| Row | Home | Note |
|---|---|---|
| ① new default theme (was Paper, `prototype/default-theme`) | L3 (first skin) | the Paper UI and concept are discarded (user, 2026-11-10); the new theme's name and id are not decided |
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
| ⑦ Review Mode (`2026-04-28-review-mode`) | After | user |
| ⑦ quarterly calendar (`2026-05-26-quarterly-calendar-view`) | L2 Calendar | in scope; designed in the concept/mockup session (user) |
| ⑦ Triage scheduling (`2026-04-28-triage-scheduling`) | After | user |
| ⑦ Archive auto-cleanup (`2026-05-26-archive-auto-cleanup`) | L2 Archive | decided with R18 |
| ⑦ rollup and focus (`2026-04-28-node-rollup-focus-aging`) | After | user; its aging revision is discussed now (aging is a P1 card state) |
| ⑦ visual archive (`2026-05-18-visual-archive-app`) | Out of Grid scope | user; a workflow idea |
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

## Publish line (user, 2026-11-10)

- The portfolio link is published only after every feature under discussion
  here is implemented, **the `retro-mac`, `neumorphism` and `claymorphism`
  skins included** (user, 2026-11-10). The After rows wait for after the link
  (below).
- **R18:** Archive's purpose and UI are settled in the new default theme's
  concept/mockup session (`2026-11-10-default-theme-concept`), not here; this
  topic waits for that result.
- **R22:** the sign-in branding comes last, right before the link is
  published.
- **After the link** (user, 2026-11-10): Review Mode, Triage scheduling, the
  Node rollup and focus overlay, the visual idea archive app (a cross-project
  workflow idea, not a Grid feature; the parts catalog covers part of its
  need), feature search, the Calendar `toSorted()` note.
- **Quarterly calendar is in scope** (user, 2026-11-10): designed in the
  concept/mockup session and implemented before the link
  (`2026-05-26-quarterly-calendar-view`; Nodes only, a drop sets the deadline
  to the quarter's last day; app lane, no new column).

## Aging (user, 2026-11-10)

- Aging is a P1 card state. Its **rules** (levels, thresholds, which items,
  completed and urgent items) are settled here with P1; its **look** per theme
  (saturation, opacity, texture or another device) is settled in the
  concept/mockup session.
- Every theme must be able to change the aging look, so the aging values go
  through theme tokens instead of the hard-coded filter strings in
  `src/lib/utils/aging.ts` (the gap in `NOTES.md` §Aging check).
- The draft revision in `2026-04-28-node-rollup-focus-aging` §Aging Revision is
  input to the rules, separate from the rollup (After).

## P2 option menu

- **P2-1 edit mode (user, 2026-11-10):** edit mode and its sidebar Pencil are
  retired. The option menu takes Edit and Delete; creating in an empty cell
  moves to an empty-cell context menu (New Node here / New Bit here) plus a
  faint `+` on an empty cell under the pointer. The ghost hints of P48 mi-4 are
  settled in the same place. Zone A stays Home, Add, Search. (Closes the R1
  edit-mode question.)

- **P2-2 menu items (user, 2026-11-10):** a menu is chosen by the item's kind
  and state, never by the surface, so a live Bit has the same menu on the
  Grid, the Calendar, the sidebar and in search results. Frequent actions
  first; irreversible ones last, below a separator.

  | Item (state) | Menu |
  |---|---|
  | Node (live) | Open · Edit · Add to Favorites / Remove from Favorites ─ Archive · Move to Trash |
  | Bit (live) | Open · Edit · Mark as complete / Mark as active · Promote to Node (only when allowed today) ─ Archive · Move to Trash |
  | System Node (Inbox, Archive, Calendar) | Open · Add to sidebar / Move to Grid |
  | Empty cell in a level 0 or 1 Node's Grid | New Node here · New Bit here |
  | Empty cell in a level 2 Node's Grid | New Bit here (no Node below level 2; control tower correction, 2026-11-10) |
  | Empty cell on L0 | New Node here (a Bit always needs a parent) |
  | Trashed item | Restore ─ Delete permanently (with confirmation) |
  | Archived item | settled with R18 in the concept/mockup session |

  Sidebar entries use the menu of what they are (a Favorite uses the Node
  menu). Chunks and Scratch get no option menu; they are edited inside their
  own surfaces.

- **Unavailable actions (user, 2026-11-10):** an action the item's kind never
  supports is left out of the menu (for example Move to Trash on a system
  Node); an action that is unavailable only now stays in place, dimmed, with a
  short reason (for example Promote to Node). Shared rule 4 hides unfinished
  features, not actions that are unavailable at the moment.
- **Promote to Node (user, 2026-11-10):** the client condition "the Bit has
  Chunks" is dropped (SCHEMA §9 never required it); a Bit without Chunks
  becomes an empty Node in the same cell. The remaining conditions show as a
  dimmed item with a reason: a title over 100 characters ("Shorten the title to
  100 characters") and a parent at level 2 ("Already at the deepest level").
  The Inbox condition never shows, since Scratch has no option menu. Server
  failures (account limits, `grid_full`) report through the failure toast.
- **P2-3 (closed by P2-2):** the same menu opens wherever the item appears.
- **P2-4 opening the menu (user, 2026-11-10):** click opens the item as today
  (a Node's Grid, a Bit's detail); right-click opens the menu at the pointer;
  the visible entry (R9, look in the concept/mockup session) opens the same
  menu next to the card; from the keyboard, the context-menu key or
  `Shift+F10` opens it, `Enter` opens the item and `Delete` moves it to Trash,
  with the shortcuts shown faintly in the menu; a long press opens it on touch
  screens at 1024px or wider (to confirm in the chosen menu primitive). The
  Grid is one Tab stop with arrow-key movement inside it (roving focus), empty
  cells included, so the empty-cell menu is reachable from the keyboard. Code
  check to do first: Bit cards take focus (`tabIndex`), Node cards show no
  focus hook in `node-card.tsx`.

- **P2-5 Trash confirmation (user, 2026-11-10):** Move to Trash has no
  confirmation dialog. It hides the item at once, as today, and shows a toast
  "Moved to Trash · Undo" (with the count for a Node with children, for example
  "Moved 'Work' and 12 items to Trash · Undo"). Undo is a Restore: it is
  server-confirmed, shows a short pending state, and a Node whose cell was
  taken meanwhile returns to the nearest free cell, which the toast says. After
  the toast, Restore in Trash does the same. Confirmation dialogs stay only for
  irreversible actions: Delete permanently and Empty Trash. The edit-mode delete
  dialog goes with edit mode (P2-1).

## P3 command input (user, 2026-11-10)

One input replaces the Search overlay and the current palette; Cmd+K and the
sidebar Search button open it.

- **P3-1 empty input:** Actions (Add Scratch, Add Node, Add Bit; Add Scratch
  selected) and the 5 most recently edited items, sorted by `mtime` (no
  browser storage; Architecture Rule 1).
- **P3-2 typing:** results grouped Actions → Node → Bit → Chunk → Scratch, up
  to 5 per group with "more"; titles that start with the query first, then
  titles that contain it, ties by most recent `mtime`; each row shows its path.
- **P3-3 fallback rows:** the list always ends with "Add '<query>' as Scratch /
  Node / Bit", the query becoming the title.
- **P3-4 opening a result:** a Node opens its Grid; a Bit opens its parent's
  Grid with the Bit's detail; a Chunk opens its Bit's detail with the step
  marked; a Scratch opens the Inbox with that Scratch focused (new: Scratch is
  not in `searchAll()` today).
- **P3-5 keys:** `↑↓`, `Enter`, `Esc` (with the `esc` hint, R20). The number
  keys `1` and `2` are removed, since digits are search text now; Cmd+K then
  `Enter` adds a Scratch (Add Scratch is preselected). SPEC §Command Palette
  changes with it at `/craft-docs`.
- **P3-6 Tab into an action (Raycast-style):** with an action row selected,
  `Tab` puts a chip such as "[Add Bit]" before the input and the typed text
  becomes the title; with a result row selected, `Tab` does nothing; on an
  empty input `Backspace` or `Esc` removes the chip. `Enter` creates at once:
  a Scratch; a Node in the current Grid (or L0) at the first free cell; a Bit
  under the current Node, or else after a second chip "Parent:" where a Node is
  searched and picked. `⌘Enter` from any chip opens the P4 dialog with the
  title filled. P3-3 and P3-6 both stay (text first, or action first).

## P4 Add/Edit dialog

- **P4-1 `+` menu (user, 2026-11-10):** two groups, each with one line, in the
  order Scratch → Node → Bit: **Scratch** "write it now, place it later" and
  **Node · Bit** "create it in place". No "New Item" header (the word was
  dropped with R13). Wording and look: concept/mockup session. Closes the R21
  `+` question.

- **P4-2 one dialog with a Node/Bit toggle (user, 2026-11-10):** it opens on
  the type of the entry used (Add Node, New Node here → Node; Add Bit, New Bit
  here → Bit). Switching keeps the shared fields (title, icon, deadline) and
  remembers the type-only fields while the dialog is open (Node: color; Bit:
  parent, description, priority); nothing is stored after it closes. Where no
  Node can be made (a level 2 Grid) the Node side is dimmed with "Already at
  the deepest level". A title too long for the chosen type (Node 100, Bit 200)
  is never cut: a count warning shows and Create stays disabled until it fits.
  Editing opens the same dialog as "Edit Node" / "Edit Bit" without the toggle
  (the only type change is Promote, Bit to Node). The toggle is one Tab stop
  with `←→` (radio-group behavior), the same rule as the icon picker, which
  closes deferred P3 Issue 5.

- **P4-3 fields (user, 2026-11-10):** Node: title (required, 100), icon,
  color, deadline with all-day. Bit: parent (required), title (required, 200),
  description (multi-line), icon, priority, deadline with all-day. A parent
  implied by the Grid shows as one line ("in Projects · Change"); otherwise the
  selector is open. Icon and color have defaults. A deadline later than the
  parent Node's opens the existing deadline-conflict dialog. All fields show
  at once (the quick path is P3-6). No status field (a new Bit starts active)
  and no Chunks (added in the Bit detail). Keys: focus starts in the title;
  `Enter` in the title creates; `⌘Enter` creates from anywhere; `Esc` closes,
  asking first only when something was typed (an irreversible loss). Layout and
  look: concept/mockup session.

- **Calendar create (user, 2026-11-10):** the Calendar uses the same `+` menu
  (Scratch included; missing today), the same dialog and the same Cmd+K. The
  Node the Pool is drilled into is the implied parent for a Bit (today's
  behavior made a rule).
- **P4-7 create from a date (user, 2026-11-10):** an empty area of a Calendar
  date opens, by right-click or a faint `+` under the pointer, a menu whose
  items prefill the deadline: a day in the weekly or monthly view offers "New
  Bit on <date>" and "New Node on <date>" (that day, all-day); a quarter column
  offers "New Node in Q<n>" (the quarter's last day, all-day; Nodes only).
  Date cells move by arrow keys and open the menu by the menu key (shared rule
  2; check today's Calendar keyboard behavior at implementation). Whether a
  weekly time slot also prefills a time depends on the weekly view's slots:
  concept/mockup session.

- **P4-4 parent selector (user, 2026-11-10):** search first, browsing kept.
  Typing finds Nodes at every level, each row with its path, ordered as in P3-2;
  an empty input shows the 3 most recently edited Nodes, then today's
  drill-down browsing. Only live ordinary Nodes (levels 0–2) are listed:
  system Nodes and trashed or archived Nodes are left out (kind), a Node whose
  Grid is full is dimmed with "Grid is full" (now). Keys: `↑↓`, `Enter`, `→`
  into a Node, `←` back out. The dialog's Parent field and the Cmd+K
  "Parent:" chip are the same part. Hidden scrollbar with the overflow cue
  (R16).
- **Dialogs fit the window (user, 2026-11-10; R24):** every dialog keeps its
  title and buttons visible at 1024px wide and on a short laptop height; when
  its content is taller, only the inside scrolls (hidden scrollbar, overflow
  cue). The icon picker becomes one button that opens a small grid instead of
  four inline rows; the description field has no resize handle and grows to a
  maximum height. **User preference for the layout:** a wide dialog in two or
  three columns rather than a tall single column; the concept/mockup session
  decides the layout (check that it still works at 1024px wide).
- **P4-5 placement (user, 2026-11-10):** the Grid is read as two halves of 9
  columns. A new Node starts at the left half's top-left cell (column 1, row
  1); a new Bit starts at the right half's top-left cell (column 10, row 1).
  Each takes the first free cell in reading order (left to right, top to
  bottom) inside its own half, and only when that half is full the other half.
  This replaces today's nearest-cell search from (3,3) for a Node and (16,3) for
  a Bit and applies to `+`, Cmd+K and the Calendar date menu; the empty-cell
  menu still uses its cell, and server placement (restore, unarchive,
  promotion, system Nodes) is unchanged. It also eases R10, since new Bits
  start mid-Grid. A Node in the top-left cell may sit under the revealed
  breadcrumb for a moment, which F26 already accepts. After creating, a new
  card on the current Grid is briefly marked (look: concept/mockup session);
  one created elsewhere gets a toast "Created '<title>' in <Node> · Open". A
  full Grid dims Add Node / Add Bit with "This Grid is full". The dialogs'
  "nearest available cell" line changes with it.
- **P4-6 Scratch (user, 2026-11-10):** the quick Scratch window (title only)
  stays; `+` → Scratch and Cmd+K → Add Scratch open it, and the P3-6 chip
  creates without it. ISSUE-16-02 (its focus trap) closes when it is rebuilt.
- **Small-fix basket now (user, 2026-11-10):** R23 and R24 go first in the
  small-fix basket, and the basket phase (app lane) may open now, without
  waiting for the rest of this discussion. R23 is fixed in the decided
  direction (the Inbox, Archive and Calendar pages count as outside a Grid:
  a Node goes to L0, a Bit needs a picked parent, the picker leaves out system
  Nodes; the refusal message no longer says "Try again" for a refusal that a
  retry cannot fix). R24 gets the interim inside-scroll only; the redesign
  waits for the mockup.

## Sidebar zone B (user, 2026-11-10)

- Zone B has two parts with a thin divider: the **system part** (Inbox,
  Calendar, Archive, fixed order, 0–3 slots) and the **Favorites part**.
- A system Node in the sidebar is **moved** there (it leaves the Grid, R4,
  stored as `hiddenFromGrid`). A Favorite is a **shortcut** (the Node stays in
  its Grid; a new per-account flag, DB). A system Node never becomes a
  Favorite.
- Zone B shows at most 5 entries in all; system Nodes take their slots first
  and Favorites fill the rest. Only Favorites overflow into the drawer, so the
  Inbox badge is never hidden.
- Drags: a system Node dropped anywhere in zone B goes to its fixed place in
  the system part (a Favorite pushed past the limit moves to the drawer); an
  ordinary Node adds a Favorite; a Bit is not accepted and zone B dims with the
  rest (R3); a system Node dragged from the sidebar onto an empty Grid cell
  moves there; a Favorite dragged out of the sidebar removes only the
  shortcut. Only Favorites can be reordered.
- During a Node drag only the part that will take it lights up, with a short
  label ("Move to sidebar" for a system Node, "Add to Favorites" for an
  ordinary Node); the label's look belongs to the concept/mockup session.
- The dotted placeholders show only in the Favorites part, only while it has
  free slots (at most 2).

## System Nodes in the first-run guide (user, 2026-11-10)

- Users will not easily see why Inbox, Archive and Calendar are treated
  differently; the Welcome/first-run guide explains it.
- **Wording (user, 2026-11-10):** they are **built into Grid** (the concept
  session's correction: "not containers" was wrong, since Inbox and Archive do
  hold items). Built in is why they cannot be renamed, archived or trashed and
  why they move instead of becoming Favorites. Each one's role follows: Inbox
  collects what has no place yet, Archive keeps what is done, Calendar shows
  deadlines by date. Image: the user's Nodes are trays the user put on the
  desk; the system Nodes are the drawers built into it.
- Following shared rule 3, the card says it by itself: a distinct built-in
  card variant in P1 (look in the concept/mockup session), with the guide's
  one step on top.

## Discussion order (user agreed, 2026-11-10)

1. Shared rules (the same item has the same menu everywhere; keyboard parity;
   fix the part rather than add a device; what is visible is finished).
2. The publish line (decision 1 and the After/Dropped rows above).
3. Parts: P2 menu → P3 input with P4 dialog → P1 card family → P5 sidebar.
4. Remaining surfaces: Trash, Archive (after the user's exploration).
5. Phases.
