# GridDO — Technical Specification

> **Scope:** Architecture, routing, file organization, and page layouts. Data model lives in SCHEMA.md. Design values live in DESIGN_TOKENS.md.
> **Inbox/Triage amendment status:** **User-approved 2026-07-28.**
> **Production derivation evidence:** Fresh reviewed SPEC SHA-256
> `ec1ee6ac1d4781f332eeab66bcf2a24355c32936f4608c866ed43f651df5ed89`
> is read-only evidence, not canonical authority. Production authority is the
> approved map content at `114b032` with receipt `90022e7`, the approved recipe
> package at `c511105` with receipt `7a15451`, and the production SCHEMA content
> at `6be49f8` / SHA-256
> `0fb1fb17f55a507b2a799d6f485fc764324d0287090b51a025df6248535c47ca`
> with receipt `250a1b5`.
> This draft derives only the approved `docs/SPEC.md` promotion row from the
> selected topic [decision](brainstorming/2026-06-25-inbox-triage-theme-surface-redesign/DECISION.md),
> approved [promotion map](brainstorming/2026-06-25-inbox-triage-theme-surface-redesign/PROMOTION_MAP.md),
> and approved [SCHEMA](SCHEMA.md). It is not authority for
> `DESIGN_TOKENS.md`, planning, or production until the SPEC gate passes. The
> approved recipe [navigation index](recipes/inbox-triage-visual-recipe-index.md)
> supplies navigation and the `VQ-01`–`VQ-12` non-invention boundary only; it
> creates no product behavior or visual authority.
> **Baseline locator note:** promotion-map citations into the prior SPEC refer
> to the file at production base `a3c679c` (SHA-256 `d6434098...`). Line
> numbers are historical locators and are not rewritten after this replacement.

---

## Scratch Trash Amendment — 2026-10-15

From [`DECISION.md`](brainstorming/2026-10-15-scratch-trash-hotfix/DECISION.md)
H04–H16 (Phase 41). Adds Scratch Trash from the Pool and the Retro Mac
Context `[X]`, the Undo active-Scratch condition, and selection of a Scratch
captured while the Inbox is mounted. The DP-VQ03 departure-sheet behavior is
unchanged; only its Retro Mac realization changes in the recipe.

## SaaS Conversion Amendment — 2026-10-22

From [`DECISION.md`](brainstorming/2026-10-21-saas-conversion/DECISION.md)
S01–S43 (promotion ①, [`PROMOTION_MAP.md`](brainstorming/2026-10-21-saas-conversion/PROMOTION_MAP.md))
and, within its S41 boundary, the feedback topic's
[`DECISION.md`](brainstorming/2026-10-18-staging-item-status-feedback/DECISION.md)
F02, F11, F13, F14, F16 (copy alignment) and F17–F20. GridDO becomes a SaaS
with Supabase as the per-account source of truth. Amends Architecture
Decisions 1–3, 7, 9, 11 and 15 and adds 19–21; replaces the "No auth" routing
rule; adds [Account Entry And App States](#account-entry-and-app-states),
[Feedback And Network States](#feedback-and-network-states) and
[Environments And Hosting](#environments-and-hosting). The user-facing product
name is "grid"; inside the project the name stays GridDO (S06). Multi-device
use gets no extra work (S03). The rest of the feedback topic (Inbox item
status, toast position and colour, the breadcrumb reveal) is promotion ②
([Feedback Lane Amendment](#feedback-lane-amendment--2026-10-22)).

## Feedback Lane Amendment — 2026-10-22

From [`DECISION.md`](brainstorming/2026-10-18-staging-item-status-feedback/DECISION.md)
F01, F03–F10, F12, F15, the F16 create-dialog change and dropped breadcrumb
toast, and F21–F33 (promotion ②,
[`PROMOTION_MAP.md`](brainstorming/2026-10-18-staging-item-status-feedback/PROMOTION_MAP.md)).
Inbox item status becomes an icon, emphasis and a tooltip on the item, and
success shows nothing on screen ([Item status presentation](#item-status-presentation));
toasts move to the top-left of the work area and keep their hues blended into
each theme ([Toasts](#toasts)); the breadcrumb hides behind a sidebar Home
button and reserves no Grid cell
([Breadcrumb reveal and Home button](#breadcrumb-reveal-and-home-button)); the
last selected Scratch persists per device; the theme set shrinks to four
(`griddo`, `retro-mac`, `neumorphism`, `claymorphism`). The lane has two
phases (F33): Phase 49 (the theme set, the shared status primitives, the
toasts and the create dialogs) closes before Phase 45; Phase 50 (the Inbox
surfaces, the breadcrumb reveal with the zone removal, the last Scratch)
follows Phase 45. Until a task lands, the code keeps today's behavior.

## Inbox/Triage SPEC Approval Receipt

- **Gate:** the complete production-adapted Inbox/Triage amendment in this
  document, including its architecture, state ownership, copy boundary, file
  owners, and `VQ-01`–`VQ-12` non-invention boundary.
- **User disposition:** approved through the prior detailed Fresh SPEC review
  and the user's 2026-07-28 instruction to carry every canonical document
  through the final flow review rather than stopping after SCHEMA.
- **Approved artifact:** commit
  `285e84809ba5d06d75a6fd29299f7f816e95874a`, containing the exact
  pre-receipt `docs/SPEC.md` whose SHA-256 is
  `f1157dbba76ad53fc5c6a5d524b7ad74a02099c93ab53b218ae755ebe1024778`.
- **Parent receipts:** promotion map `90022e7`, recipe package `7a15451`, and
  SCHEMA `250a1b5`.
- **Resolved naming questions:** `Q-NAME-03` is owned by the exact proposed
  Explorer and placement paths in this SPEC; `Q-NAME-04` is owned by proposed
  `src/lib/copy/inbox-triage.ts`. These are target paths, not claims that the
  files already exist.
- **Preserved boundary:** the five absent replacement surfaces remain blocked
  behind user-owned Decision prerequisites, and the seven existing-surface
  state gaps authorize semantic behavior but no invented exact visual values.
  This receipt accepts no implementation, task, or phase.
- **Next legal action:** derive only `docs/DESIGN_TOKENS.md` from the approved
  SPEC and recipe package, then stop at its own durable gate before planning.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture Decisions](#architecture-decisions)
- [Routes](#routes)
- [File Organization Conventions](#file-organization-conventions)
- [Page Layouts](#page-layouts)
- [Account Entry And App States](#account-entry-and-app-states)
- [Feedback And Network States](#feedback-and-network-states)
- [Environments And Hosting](#environments-and-hosting)
- [Inbox/Triage State Ownership](#inboxtriage-state-ownership)
- [Copy and Localization](#copy-and-localization)
- [Inbox/Triage Visual Decision Prerequisites](#inboxtriage-visual-decision-prerequisites)
- [Responsive Breakpoints](#responsive-breakpoints)
- [Key File Paths](#key-file-paths)

---

## Tech Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Framework | Next.js (App Router) | 16 | Routing, layouts, static shell |
| Language | TypeScript | 5.x strict | Type safety across the codebase |
| UI Runtime | React | 19 | Component model, hooks, concurrent features |
| Styling | Tailwind CSS | 4.x | Utility-first styling |
| Component Library | shadcn/ui (Radix primitives) | latest | Accessible, composable UI primitives |
| Icons | Lucide React | latest | Icon library for Nodes, Bits, sidebar, and UI elements |
| Validation | Zod | 3.x | Runtime schema validation at data boundaries |
| Backend | Supabase (Postgres, Auth) via `@supabase/supabase-js` | latest | Per-account source of truth; RLS; every write is a Postgres function called over RPC (SCHEMA §Database Functions) |
| Local database tooling | Supabase CLI (pinned dev dependency) + Docker Desktop | pinned | `supabase start`, migrations, generated types, `pnpm test:db` |
| Bot protection | Cloudflare Turnstile | — | Guards anonymous sign-in in production |
| Hosting | Vercel Hobby | — | Static/client app from `main`; no Next.js server code |
| Theming | next-themes | latest | Dark/Light mode with system preference detection |
| Dates | date-fns | 4.x | Date arithmetic — aging, urgency, calendar rendering |
| State Management | Zustand | 5.x | Lightweight client state — edit mode, sidebar, drag state, calendar view |
| Animation | Motion (Framer Motion) | latest | Jiggle mode, sinking effects, floating animation, vignette, magnet snap |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable | latest | Grid reordering, calendar scheduling, timeline ordering |
| Package Manager | pnpm | latest | Fast, disk-efficient dependency management |

---

## Architecture Decisions

1. **Client Components by default** — GridDO runs entirely in the browser, with no Next.js server code (S21). The account's data lives in Supabase Postgres and is read and written from the client (S02, S08). Server Components are used only for static layout shells (root layout, page skeletons). Any component that reads data or handles interaction is a Client Component.

2. **DataStore abstraction (two-layer)** — Data access has two independent abstraction boundaries. **Command/repository layer:** All writes, including the approved Inbox/Triage CAS and atomic commands, go through `DataStore` (`src/lib/db/datastore.ts`). From Phase 45 its implementation is the Supabase store (`src/lib/db/supabase-store.ts`), which sends every write as one database function call (SCHEMA §Database Functions) and answers reads from the account snapshot; Phase 46 removed the Dexie implementation. Components never sequence repository writes. **Reactive layer:** All read subscriptions go through custom hooks (`src/hooks/use-*.ts`). They subscribe to the account snapshot store, and their return shapes stayed the same as under Dexie `liveQuery` (S07). Components import hooks rather than the store. The Supabase store preserves the approved conditional-write, version, postcondition, and reconciliation semantics in SCHEMA.

3. **Reactive data via custom hooks** — Components subscribe through custom hooks (`useGridData`, `useBitDetail`, `useCalendarData`, and the global `useSearch`). The Inbox target adds `useStagedCandidates` and `useGridExplorerSearch` under the exact target paths in [Key File Paths](#key-file-paths). Hooks read the in-memory account snapshot (Decision 19); a snapshot change re-renders its subscribers. Reactive delivery does not prove that a mutation committed, that a source is orphaned, or that a cached value is authoritative. Inbox commands converge only through the typed repository result and command-specific reconciliation contract in SCHEMA. The global `useSearch()` / `searchAll()` pair remains separate and is never extended or reused as Grid Explorer search.

4. **URL-driven grid navigation** — The current grid position is encoded in the URL (`/` for Level 0, `/grid/[nodeId]` for deeper levels). This enables browser back/forward navigation through the grid hierarchy. Breadcrumbs and URL stay in sync.

5. **Bit detail via query parameter** — Opening a Bit detail popup appends `?bit=[bitId]` to the current URL. Browser back closes the popup. This works from both grid and calendar views.

6. **Computed values at render time** — Aging state, Node completion, badge urgency, and Bit progress are computed during rendering from stored data (see SCHEMA.md). Never stored. This avoids stale derived state and simplifies the write path.

7. **Zod validation at write boundary; the database is the final gate** — Data is validated with Zod schemas (SCHEMA.md) when entering the DataStore (create/update operations), for immediate feedback. The database is the final gate: CHECK, unique and foreign-key constraints and the checks inside the write functions, because client code can be changed in the browser (S12; SCHEMA §Validation layers). Data read from the snapshot is trusted — no runtime validation on reads. This keeps read paths fast.

8. **Domain-grouped shared components** — Shared components are organized by domain (`grid/`, `calendar/`, `bit-detail/`, `layout/`, `trash/`, `quick-capture/`, `triage/`, `archive/`) under `src/components/`. Page-specific components live in `_components/` within their route folder.

9. **Client state is split by lifetime, not by convenience** — Zustand remains appropriate for cross-cutting application/session UI state, but it is never a second domain database. Durable Nodes, Bits, Breakdown rows, `StagedCandidate` records, versions and archive state live behind the DataStore boundary defined by SCHEMA, in Postgres (S02). The account snapshot (Decision 19) is a disposable app-session cache, never a source of truth. The Inbox target removes candidates and duplicated candidate labels from `triage-store.ts`; candidate display joins the authoritative source Breakdown row. Page-mounted workflow hooks own drafts, placement, archive presentation, and Newly Placed/Undo projections. Only the two Inbox sort directions and the last selected Scratch (feedback F27, Phase 50) use a device-local persisted preference store. See [Inbox/Triage State Ownership](#inboxtriage-state-ownership).

10. **next-themes for dark/light theming** — Dark/Light mode via `next-themes` provider in root layout. Theme token switching is handled through CSS custom properties in `globals.css`, referenced by Tailwind classes. No conditional class logic in components.

11. **Authoritative Inbox/Triage commands; write feel by group** — Ordinary writes follow the four groups in [Write feel](#write-feel) (S15): optimistic with rollback, immediate hide, or server-confirmed, last-write-wins, never resent after an unknown outcome. Inbox/Triage Add, Save, Delete, Stage, Unstage, placement, Undo, Scratch Archive, and Trash Scratch follow SCHEMA's atomic command/result contract. Pending source truth remains visible and locked until `applied`/`already_applied`, `not_applied`, `rejected`, or `conflict` is authoritative. An unknown transport outcome retains the same operation ID and reconciles; it is never treated as success, blindly resent, or compensated one side at a time. These flows require meaningful pending, failure, conflict, and recovery states. No general operation log, journal, outbox, or offline mutation queue is introduced; the pending-write layer (Decision 19) lives only in memory, and a pending write is never persisted or resent.

12. **@dnd-kit with domain-specific input contracts** — Grid, calendar, timeline, and Inbox/Triage use the shared library while preserving domain-specific rules. General Grid DnD retains its existing keyboard support. Inbox placement entry is deliberately Mouse/Touch pointer DnD only in this promotion: Mouse starts after 8px; Touch uses 250ms delay with 5px tolerance. Breakdown rows remain grip-only, while a staged candidate's whole card/row is the activator and uses the pointer-centered `TriageDragToken`. No placement button, keyboard drag mode, destination picker, hidden shortcut, or unfinished alternative is added; keyboard/drag-alternative placement remains deferred.

13. **Motion for all animations** — The PRD specifies jiggle mode, sinking effects, floating animation, vignette transitions, magnet snap, and task-tossing. Motion (Framer Motion) handles all of these declaratively. CSS-only would be insufficient for the interaction-driven animations GridDO requires. Animation variants defined per domain in `src/lib/animations/`.

14. **Pure utility functions for algorithms** — BFS auto-placement, aging state computation, urgency level computation, and Node completion check are pure functions in `src/lib/utils/`. No side effects, independently testable.

15. **System Nodes retain route identity and lifecycle** — Every account has two system Nodes (`systemRole: 'inbox' | 'archive_view'`), created and normalized by `ensure_account()` at session start (S13; SCHEMA §Account preparation; defaults in SCHEMA § Default System Nodes). They use `/grid/[nodeId]`; `GridRuntime` dispatches Inbox to the Triage workspace and Archive View to its existing surface. The Inbox amendment adds no route and does not replace this owner. System Nodes cannot be archived or trashed; `hiddenFromGrid` controls L0 visibility and the sidebar still exposes them. Direct Archive and Archive View restore remain separate from Scratch completion. Completion never auto-archives.

16. **Inbox/Triage DnD opens a guarded placement state machine** — Drag targets distinguish valid, invalid, and pending-confirmation semantics before any write. Release-time hit testing chooses the actual pointer-under target after edge auto-scroll. Direct placement, optional staged Result Title, target-column confirmation, pending/reconciling, failure, and rollback are distinct states owned by the proposed `useTriagePlacement` hook; `useTriageDnd` remains the pointer/drop-intent coordinator. `TriageWorkspace` composes these owners but owns neither persistence nor sequential writes. Full/stale targets disable or end the current flow without alternate-target selection, partial compensation, or silent retry.

17. **Color themes share semantics; presentation changes preserve work** — Color theme remains a second visual axis over dark/light, with the four-theme set `griddo`, `retro-mac`, `neumorphism` and `claymorphism` (feedback F28; Task 241 removed `tiny-desk`, `origami`, `terminal` and `graphite`) and `<html data-color-theme="...">`. Product components consume semantic variables, state attributes, and theme realization components; they do not duplicate routes or branch on theme ID. A theme or future locale change is presentation only: it preserves selected Scratch, Pool state/query, Add/Edit drafts, Explorer path/search/reveal, open Placement/Archive state, operation IDs and pending/reconciling flows, and Newly Placed/Undo. It neither saves, cancels, refetches, navigates, starts a duplicate mutation, nor translates user-authored text. Moving focus to the toggle is an explicit exception to inline-editor valid-blur save; the draft remains open and focus stays on the toggle.

18. **Selected Inbox/Triage promotion supersedes the Phase 22 surface assumptions only in its declared scope** — The four-area ratios, system-node route dispatch, global Search Overlay, Archive View, Direct Archive, Calendar behavior, current card foundations, and unrelated responsive scope are retained. The selected topic supersedes invisible developer-only section labels, compact Selected Scratch Context, UI-only candidates, active-column Explorer search, the combined generic placement dialog, the simple archive bar/global confirmation, consumed-row strike-through, Add-on-blur creation, and the claim that Inbox mutations need no pending/error states. The Pool still auto-collapses only on the first printable Breakdown key and honors the per-Scratch manual-reopen exception. Visual behavior is constrained by [Inbox/Triage Visual Decision Prerequisites](#inboxtriage-visual-decision-prerequisites); source absence never deletes selected behavior or authorizes a nearby fallback.

19. **Account snapshot with a pending-write layer** — At session start the client loads the whole account with `get_snapshot()` into an in-memory snapshot; views, search and render-time compute run over it as today (S07, S19). The snapshot has two layers: the server-confirmed base and an ordered list of pending writes. The view is the base with the pending writes applied on top. Function results (SCHEMA §Result envelope) and refetches change only the base; a pending write leaves the list when it settles, applied or rolled back; writes to one record are sent in order (S31, S32). A refetch sent before a write settled is discarded and sent again, so an older read never overwrites a newer result. Results for different records can arrive out of commit order, so an envelope row whose `version` is lower than the base row's is ignored (tables with `version`; an equal version applies). A rejection whose reason depends on other rows (`not_found`, `cell_taken`, `parent_inactive`, `grid_full`, `invalid_target`) is followed by one refetch, since another device may have changed rows the envelope does not carry; `account_limit` and `invalid_input` are not (user, 2026-10-24). The snapshot is refetched when a tab becomes visible or focused and after reconnecting (S17), and dropped on reload and sign-out. It is not a per-query cache and not a sync engine; Realtime is deferred.

20. **Account entry without auth routes** — A visit without a session becomes an isolated guest through Supabase anonymous sign-in; GitHub or Google sign-in from the account modal gives an own account (S10, S23). There is no sign-in page and no new route. Tabs share the session: when another tab changes the signed-in user, this tab drops its snapshot and repeats entry behind the loading frame (user, 2026-10-22). See [Account Entry And App States](#account-entry-and-app-states).

21. **Network failure is a visible state, not an offline mode** — v1 has no offline editing. Loading, load failure, connection states, unknown outcomes and session expiry follow [Feedback And Network States](#feedback-and-network-states) (S16, S26–S28). The display delay `DISPLAY_DELAY_MS` (300ms) only postpones presentation and never decides success (F02).

---

## Routes

| Route | Purpose | Rendering | File |
|-------|---------|-----------|------|
| `/` | Level 0 grid — root Nodes | Route-group layout + Client grid | `src/app/(grid)/page.tsx` |
| `/grid/[nodeId]` | Grid view inside a Node (Level 1-3) | Route-group layout + Client grid | `src/app/(grid)/grid/[nodeId]/page.tsx` |
| `/calendar/weekly` | Calendar:Weekly — global weekly schedule | Client | `src/app/calendar/weekly/page.tsx` |
| `/calendar/monthly` | Calendar:Monthly — global monthly overview | Client | `src/app/calendar/monthly/page.tsx` |
| `/trash` | Trash zone — soft-deleted items | Client | `src/app/trash/page.tsx` |

**Route-group layout:** Grid routes (`/` and `/grid/[nodeId]`) share a `(grid)` route group with a common layout at `src/app/(grid)/layout.tsx`. This layout renders `GridRuntime`, a client wrapper that owns sidebar, breadcrumb, shared DnD boundary, and add-flow orchestration. Page components are thin grid-content renderers — they do not manage shell chrome.

**Auth without auth routes (S23).** There is no sign-in page, callback route or middleware. Every route needs a session, and a visit without one gets a guest session first ([Account entry](#account-entry)). OAuth returns to `/`, where supabase-js completes the sign-in in the browser.

**Bit detail popup:** Not a route. Triggered by `?bit=[bitId]` query parameter on any grid or calendar page. The popup component reads the query param and renders accordingly.

**Search overlay:** Not a route. Triggered by sidebar Search button or keyboard shortcut. Rendered as a portal overlay on any page.

**Edit mode:** Not a route. Toggled via sidebar Pencil button or keyboard shortcut. Visual overlay on the current grid page.

**System Node surfaces:** Not new routes. The Inbox and Archive View system Nodes use `/grid/[nodeId]`; `GridRuntime` dispatches on `systemRole` to render the Triage workspace or Archive View surface instead of the standard grid.

**Quick Capture entry surface & Command Palette:** Not routes. The `+` entry surface is an anchored popover from the sidebar `+` button; `Cmd+K` opens the Command Palette (key `1` = Scratch capture, key `2` = existing Search overlay). Both are modals/overlays on the current page, as is the Scratch capture modal.

---

## File Organization Conventions

| Category | Location Pattern | Example |
|----------|-----------------|---------|
| Pages | `src/app/{route}/page.tsx` | `src/app/(grid)/grid/[nodeId]/page.tsx` |
| Layouts | `src/app/{route}/layout.tsx` | `src/app/layout.tsx` |
| Page Components | `src/app/{route}/_components/{name}.tsx` | `src/app/calendar/monthly/_components/month-grid.tsx` |
| Shared Components (by domain) | `src/components/{domain}/{name}.tsx` | `src/components/grid/node-card.tsx` |
| UI Primitives (shadcn) | `src/components/ui/{name}.tsx` | `src/components/ui/button.tsx` |
| Hooks | `src/hooks/use-{name}.ts` | `src/hooks/use-grid-data.ts` |
| DataStore Interface | `src/lib/db/datastore.ts` | — |
| DataStore Implementation | `src/lib/db/supabase-store.ts` (from Phase 45) | — |
| Database migrations and tests | `supabase/migrations/*.sql`; `supabase/tests/*.db.test.ts` | — |
| Validation Schemas | `src/lib/db/schema.ts` | — |
| Pure Utilities | `src/lib/utils/{name}.ts` | `src/lib/utils/bfs.ts` |
| Pure Domain Queries / Ranking | `src/lib/utils/{domain}-{purpose}.ts` | proposed `src/lib/utils/grid-explorer-search.ts` |
| Constants | `src/lib/constants.ts` | — |
| Core English Copy Resources | `src/lib/copy/{domain}.ts` | proposed `src/lib/copy/inbox-triage.ts` |
| Animation Variants | `src/lib/animations/{domain}.ts` | `src/lib/animations/grid.ts` |
| Types | `src/types/{domain}.ts` | `src/types/index.ts` |
| Zustand Stores | `src/stores/{name}-store.ts` | `src/stores/edit-mode-store.ts`, `src/stores/color-theme-store.ts` |
| Providers | `src/app/providers.tsx` | — |
| Unit / Component Tests | co-located `*.test.ts` / `*.test.tsx` | `src/components/triage/triage-workspace.test.tsx` |

**Component location rule:** Used by one page only → co-locate under `_components/` in that route folder. Used by 2+ pages → `src/components/{domain}/`.

**Shared component domains:**

| Domain | Contents | Used by |
|--------|----------|---------|
| `grid/` | `grid-view.tsx`, `grid-cell.tsx`, `node-card.tsx`, `bit-card.tsx`, `edit-mode-overlay.tsx`, `onboarding-hints.tsx` | Grid pages |
| `bit-detail/` | `bit-detail-popup.tsx`, `chunk-pool.tsx`, `chunk-item.tsx` | Grid + Calendar (popup opens from both) |
| `calendar/` | `calendar-view-header.tsx`, `node-pool.tsx`, `items-pool.tsx`, `day-column.tsx`, `compact-bit-item.tsx` | Both calendar views |
| `layout/` | `sidebar.tsx`, `breadcrumbs.tsx`, `search-overlay.tsx`, `theme-toggle.tsx`, `color-theme-toggle.tsx`, `color-theme-provider.tsx` | All pages |
| `trash/` | `trash-list.tsx`, `trash-group.tsx` | Trash page only (but may move to shared if trash preview is added elsewhere) |
| `quick-capture/` | `entry-surface.tsx`, `scratch-modal.tsx`, `command-palette.tsx` | Quick Capture `+` surface + Cmd+K palette (Batch 1) |
| `triage/` | Current coordinators plus proposed `grid-explorer-search-results.tsx` and placement affordance bodies | Inbox/Triage workspace, system node `inbox`; `triage-workspace.tsx` coordinates composition and operation locks but does not own domain persistence |
| `archive/` | `archive-view.tsx`, `archive-group.tsx` | Archive View surface, system node `archive_view` (Batch 1) |

---

## Page Layouts

### Route: `/` (Level 0 Grid)

- **Structure:** Full-width 18x9 grid occupying the main content area. Fixed icon-rail sidebar (always visible, `w-12`). The breadcrumb is not revealed on L0; the sidebar Home button shows the current page ([Breadcrumb reveal and Home button](#breadcrumb-reveal-and-home-button); until Phase 50 a fixed breadcrumb shows the "Home" root-only state).
- **Content:** Nodes only. No Bits at Level 0.
- **Sidebar:** Permanent narrow icon rail, always visible, identical across all levels. Icons: Home (top-most, on every route; feedback F21, Phase 50), account icon (right below Home, S23; [Account icon and modal](#account-icon-and-modal-sidebar-not-a-route)), + (add), Pencil (edit toggle), Search, Calendar (top); Trash, dark/light Theme toggle, Color Theme toggle (bottom). Phase 47 adds the account icon and Phase 50 the every-route Home button; whichever lands second keeps the order Home, account icon, `+` (F33). Until Phase 50, Home shows only on Calendar and system-Node routes, as today. No fold/unfold mechanism.
- **Onboarding:** On first visit (no Nodes exist), show ghost placeholder Nodes with dashed outlines and hint labels ("Try: Work, Personal, Hobbies"). Disappear after first Node creation.
- **Interactions:** Click Node → navigate to `/grid/[nodeId]`. Dark/light Theme toggle, Color Theme toggle, search overlay, edit mode. DnD enabled (repositioning works outside edit mode).
- **Visual:** Level 0 background color (`--grid-bg-l0`). Standard grid line density. No depth effects at Level 0.

### Route: `/grid/[nodeId]` (Level 1-3 Grid)

- **Structure:** Full-bleed 18x9 grid. The breadcrumb is revealed over the grid's top-left from the sidebar Home button and reserves no cell ([Breadcrumb reveal and Home button](#breadcrumb-reveal-and-home-button); until Phase 50 a fixed breadcrumb sits at the top-left and the cells under it are blocked). Fixed icon-rail sidebar (same as Level 0, no remount on navigation).
- **Level 1-2 content:** Nodes (left zone, ~5-6 columns) + Bits (right zone, ~6-7 columns). 2-way split is a soft guide — items can be placed anywhere.
- **Level 3 content:** Bits only, full-width grid. No Node creation allowed.
- **Onboarding (Level 1, first visit):** Ghost hints for 2-way split ("Nodes here" on left, "Bits here" on right). Disappear after first item creation.
- **Sidebar:** Trash icon visible on all levels. "+" context-aware: Level 1-2 shows Node/Bit chooser, Level 3 creates Bit directly.
- **Depth visual effects:**
  - Grid line density increases with level (thinner, denser lines).
  - Background color changes per level (`--grid-bg-l1` through `--grid-bg-l3`) — progressively cooler/darker.
- **DnD:** Grid repositioning and drag-to-child enabled outside edit mode. Breadcrumb ancestor drops also work in any mode, as the code has since Phase 9 (`breadcrumbs.tsx`; a Bit cannot drop on Home); the earlier edit-mode-only wording was never implemented (corrected 2026-10-22). Drag onto node shows confirmation dialog. Cycle prevention blocks moving a node into its own descendant.
- **Bit detail:** Click a Bit → URL updates to `?bit=[bitId]` → popup opens (see Bit Detail Popup below).
- **Edit mode:** Toggle via sidebar Pencil → jiggle animation, dashed cell outlines, "+" on empty cells (square affordance, centered), drag-to-reposition, delete buttons with confirmation dialog.

### Breadcrumb reveal and Home button

Feedback F21–F26 (Phase 50, Tasks 248–249). Looks: DESIGN_TOKENS
§Feedback Status Surfaces (`DP-FB-01`).

- **Home button.** At the very top of the sidebar on every route, above the
  account icon and `+` (F21). It navigates to `/`. On L0 it shows as the
  current page (`aria-current="page"`) and reveals nothing; on pages without a
  breadcrumb (Inbox, Archive, Calendar, Trash) hovering it reveals nothing.
- **Hidden by default.** On a Node's Grid the breadcrumb is hidden and is
  revealed over the grid's top-left by: hover or keyboard focus on Home or on
  the breadcrumb; entering a Node, for 3 seconds; and any Node or Bit drag, for
  the whole drag (F22). There is no dwell-on-Home gesture.
- **Hiding** (F23). 1 second after the pointer and focus have left both Home
  and the breadcrumb's segments and deadline chip, with a 0.3 second fade. It
  stays while hovered, focused or while its deadline picker is open. The entry
  reveal ends after 3 seconds unless hovered or focused. `Esc` hides it at once
  when nothing above it is open. `Esc` closes one layer per press, top-most
  first: the dialog layer (a dialog, the Bit popup, the palette, the Search
  overlay, the `+` entry surface, the Scratch modal), then the deadline picker,
  then the breadcrumb, then edit mode (user, 2026-10-22). During a drag `Esc`
  only cancels the drag. After `Esc` hides it,
  the hover and focus triggers stay suppressed until the pointer or focus
  leaves Home and the breadcrumb and comes back; `Esc` pressed on a segment
  moves focus to Home, so a focused element is never hidden.
- **Motion** (F23). It unfolds out of the Home button (about 0.26 seconds) and
  folds into it (about 0.35 seconds), and Home is briefly emphasized as it
  lands, so the user learns where it went. Reduced motion: no movement, the
  breadcrumb appears and disappears in place.
- **Pointer** (F24). While shown, only its segments and the deadline chip take
  the pointer; the rest of the bar lets it through, so a card under it stays
  clickable, and "hovered" above means a segment or the chip. During a drag
  each ancestor segment is a drop target with a visible "drop here" signal
  (the ancestor-move confirmation and the no-Bit-on-Home rule stay); the rest
  of the bar lets the pointer through to the cells beneath, its surface turns
  translucent and the deadline chip hides, so the top-left cells stay
  droppable.
- **Layering.** The breadcrumb sits above grid cells and cards and below the
  drag overlay, popovers, dialogs, the Bit popup and the palette. The toast
  stack sits below it while it is shown ([Toasts](#toasts)).
- **One row** (F25). The `Due …` deadline chip moves into the breadcrumb row;
  the current Node's deadline is therefore visible only while the breadcrumb
  is shown, which the user accepted (rechecked at the Phase 50 checkpoint). The
  breadcrumb stays in the accessibility tree. In Tab order its segments come
  right after the Home button, and focusing a segment reveals it. This order
  comes from DOM placement (the breadcrumb follows the Home button in document
  order), never from a positive `tabindex`. The tab title carries the current
  Node's name, and the other pages carry their own name, so several open tabs
  can be told apart ([Feedback copy](#feedback-copy)).
- **No reserved cell** (F26). No Grid cell is reserved for the breadcrumb: Add,
  placement and drops treat every cell alike. The zone measurement and store,
  the `isCellBlocked` guards, `runBreadcrumbZoneMigration` (the Phase 45 no-op
  included) and its `settings` markers are removed (SCHEMA §Not ported).
  Until Task 249 the cells under the bar's shown position stay reserved as
  today, even while the bar is hidden, and the client passes the top-left 3×2
  block as reserved cells to every server function that chooses a cell, so a
  new account, a restore, an unhide or a promotion never lands under the fixed
  breadcrumb (SCHEMA §Internal functions, feedback F34). Task 249 stops passing
  it.
- Below 1024px the reveal is a desktop feature (S42 (4)).

### Bit Detail Popup (Modal — not a route)

- **Trigger:** `?bit=[bitId]` query parameter. Opens from grid or calendar.
- **Structure:** Centered modal over blurred background.
  - **Header:** Editable title, icon selector, deadline picker, priority toggle (high/mid/low cycle).
  - **Description:** Editable text area.
  - **mtime label:** Subtle "Last updated: X days ago" text.
  - **Chunk pool:** List of unscheduled Chunks. Add/edit/delete Chunks here.
  - **Timeline:** Vertical timeline with connected dots. Drag Chunks from pool onto timeline to set order.
- **Empty state:** Timeline structure visible (vertical line, dot placeholder) + "Add a step" CTA button.
- **Timeline behavior:** Order-based by default. Chunks with `time` sort by time within the timeline; chunks without `time` follow user-defined `order`.
- **Close:** Click outside, press ESC, or browser back (removes `?bit` param).
- **Scratch exception (Phase 41, H21):** for an Inbox-parented Bit the popup
  does not offer "Move to trash". Scratch Trash goes only through the Inbox
  Trash Scratch flow.

### Route: `/calendar/weekly` (Calendar:Weekly)

- **Structure:** Two-panel layout. Left panel + right schedule area. Sidebar on left.
- **Header (Batch 2):** Weekly and Monthly share a calendar view header. Header contains title + muted subtitle, Weekly/Monthly view switch, previous/today/next navigation, and consistent focus-visible styling. Day/Year controls are not introduced unless future scope adds those views.
- **Left panel — Node Pool (top, larger section):**
  - Level 0 Nodes shown as icons only (hover for title tooltip).
  - Click a Node → drill down to show sub-Nodes (with `>` chevron) and Bits inside.
  - Back arrow (`<`) to navigate up.
  - Search input within pool.
  - Both Nodes and Bits are draggable to the schedule.
- **Left panel — Items Pool (bottom, smaller section):**
  - Merged pool of all Bits and Chunks across the project.
  - Sort: Deadline items first (sorted by priority rank, then time), no-deadline items below.
  - Scrollable with search input.
- **Right — Weekly Schedule:**
  - 7 vertical day columns (Mon–Sun), tall and scrollable.
  - "Drop items here" placeholder in empty columns.
  - Drag item from pool to day column → sets deadline to that day ("on a day").
  - **1 item in a day:** Standard Bit component.
  - **2+ items:** Compact list (colored left border, title, time on right, date badge in corner).
  - **No-time items** at the top of the day column. Timed items below, sorted earliest→latest.
  - **Overflow:** "+N more" indicator. Click → column expands vertically with vignette effect, hiding adjacent columns.
  - **Collapse expanded:** ESC key or click any area in the column except on Bits.
- **Unschedule:** Drag item back to Items Pool, or ✗ button on hover. Clears deadline.
- **Batch 2 visual contract:** Day columns consume calendar theme variables for background, border, radius, and shadow. Existing expandable-column behavior, DnD, unschedule actions, and item interactions are preserved.

### Route: `/calendar/monthly` (Calendar:Monthly)

- **Structure:** Two-panel layout. Same left panel as Weekly. Right = calendar grid. Sidebar on left.
- **Header (Batch 2):** Same shared calendar view header as Weekly. Month title and year subtitle are displayed separately.
- **Left panel:** Identical to Weekly — Node Pool (top) + Items Pool (bottom). Same drill-down, search, and drag behavior.
- **Right — Monthly Grid:**
  - Standard calendar grid: 7 columns (Mon–Sun), rows for weeks of the month.
  - Batch 2 visual target uses tight `gap-px` calendar grid lines instead of separated card gaps.
  - Weekday header uses a theme-aware header background.
  - Date cells consume calendar theme variables for background, border, radius, and shadow.
  - Today is shown as a circular date badge.
  - First-of-month labels use `MMM d` format (for example, `May 1`); other days use day number only.
  - Items appear as compact Node tiles and Bit/Chunk dots on date cells with parent color indicators.
  - Drag items from pools to date cells (same deadline-setting behavior as Weekly).
  - Click a date cell → popover showing all items scheduled for that day in a list view. Items in the popover are clickable → navigates to item's grid location.
  - Popup item controls must have visible `focus-visible` styling.

### Route: `/trash` (Trash Zone)

- **Structure:** List view with sidebar. No grid.
- **Grouped view:** A deleted Node appears as a single entry with child count indicator (e.g., "Work — 3 Nodes, 8 Bits"). Click to expand and reveal children.
- **Per-item actions:** Restore, Delete permanently.
- **Global actions:** "Empty trash" button to permanently delete all.
- **Retention label:** Each item shows "X days until permanent deletion" based on `deletedAt` + 30 days.
- **Restore behavior:** Returns to original parent grid. BFS nearest-empty-cell if original position occupied. Auto-restores parent chain if parent was also trashed.

### Search Overlay (Modal — not a route)

- **Trigger:** Sidebar Search button or keyboard shortcut.
- **Structure:** Centered overlay on blurred background. Search input at top with real-time filtering.
- **Results:** Each result shows: item name, type icon (Node/Bit/Chunk), parent path (e.g., "Work > Project A > Frontend"), deadline if present.
- **Action:** Click result → navigate to item's grid location. Search overlay closes.
- **Scope:** Vanilla text search across all active (non-trashed, non-archived) Nodes, Bits, and Chunks. Case-insensitive substring matching.

### System Node Routing (Inbox / Archive View)

Both system Nodes use `/grid/[nodeId]`. `GridRuntime` reads the Node's `systemRole` and dispatches:

| `systemRole` | Renders |
|--------------|---------|
| `null` | Standard grid view |
| `'inbox'` | Triage workspace (below) |
| `'archive_view'` | Archive View surface (below) |

System Nodes always appear in the sidebar (queried by `systemRole !== null`) regardless of `hiddenFromGrid`. They cannot be archived or trashed; "remove from grid" sets `hiddenFromGrid = true` (retains `x/y`; "Show on Grid" reverses it, BFS-placing if the original cell is occupied).

`GridRuntime` remains the present route/dispatch owner. The proposed Inbox
architecture replaces only the body rendered for `'inbox'`; it does not add a
route, move Archive View into Inbox, alter the global Search Overlay, or make
the Explorer search navigate to the general Grid route.

### Quick Capture `+` Entry Surface (Modal — not a route)

- **Trigger:** Sidebar `+` button. Anchored popover that slides/fades in next to the `+` (not a centered modal). Visual realization: `docs/recipes/quick-capture-entry-surface-visual-recipe.md`.
- **Structure:** Two intent groups — **Ideas** (Scratch) and **Create** (Node, Bit). Scratch is the primary action by position. The surface may show an optional surface-level `Cmd+K` palette hint; the Scratch row itself carries no per-row shortcut.
- **Scratch:** Opens a centered one-line capture modal ("Capture your ideas..."). Captured Scratch is a Bit parented to the Inbox Node (icon `"sparkles"`, `x=0,y=0` sentinel); routed to Inbox regardless of current location; no parent/cell selection in fast capture. Capture never navigates. If the Inbox workspace is mounted, the new Scratch becomes selected after the capture surface closes; see [Scratch Pool](#scratch-pool) New capture.
- **Create (Node/Bit):** Open the **existing** create dialogs (`create-node-dialog.tsx` / `create-bit-dialog.tsx`; create-modal redesign is out of scope). Context rules: L0/global `Bit` opens a parent selector (no direct L0 Bit); inside a Node, `Bit` uses the current Node; Level 3 is Bit-only.

### Command Palette (Cmd+K) (Modal — not a route)

- **Trigger:** `Cmd+K`. Visual/interaction realization: `docs/recipes/command-palette-visual-recipe.md`.
- **Commands (fixed):** key `1` = Scratch capture; key `2` = open the existing Search overlay. No Search redesign — the palette's prompt input is visual-shell only, not an app-wide search/filter.

### Inbox / Triage Workspace (rendered for `systemRole: 'inbox'`)

A processing workspace that turns Scratch Breakdown rows into durable
Node/Bit hierarchy. The selected product contract is the topic
[decision](brainstorming/2026-06-25-inbox-triage-theme-surface-redesign/DECISION.md#end-to-end-user-flow);
the approved [SCHEMA repository contract](SCHEMA.md#repository-operation-contract)
owns entities, versions, transactions, and reconciliation. This section
connects those authorities to behavior and production owners without
redefining their fields or stores.

#### Current production versus proposed ownership

The following is an implementation-reality boundary, not a claim that target
files already exist:

| Area | Present production owner | Proposed target owner |
|------|--------------------------|-----------------------|
| Route/body composition | `GridRuntime` dispatches to `TriageWorkspace`; `TriageWorkspace` composes the four areas and a nested DnD context | Retain both coordinators. `TriageWorkspace` coordinates locks, transitions, and owner composition; it never stores candidates or sequences repository writes |
| Scratch/Pool UI session | `src/stores/triage-store.ts` holds selection, Pool expansion/manual exception, and UI-only candidates; Pool query/sort are component-local | `triage-store.ts` owns only app-session state; proposed `triage-preferences-store.ts` persists only Pool and Breakdown sort directions |
| Candidate truth | `triage-store.ts` stores candidate arrays and duplicated `label` values | SCHEMA `StagedCandidate` commands/queries in the DataStore boundary; proposed `use-staged-candidates.ts` owns the reactive candidate/source join and dispatches Stage and Unstage commands without sequencing repository writes in the component (the confirmed-orphan command is removed, S18) |
| Breakdown writes | `use-scratch-breakdowns.ts` computes order from a render snapshot and calls ordinary create/delete methods | The hook projects SCHEMA Add/Save/Delete command results and CAS; `BreakdownPanel` owns interaction/focus, not transaction sequencing |
| Placement | `useTriageDnd` in `use-dnd.ts` owns DnD, a combined Dialog state, and sequential create → consume → candidate removal | `useTriageDnd` owns pointer/drop intent only; proposed `use-triage-placement.ts` owns the direct/result-title/confirm/pending/reconcile/failure state machine and calls one atomic repository command |
| Explorer path/search | `HierarchyExplorer` owns component-local path and active-column title filtering | `HierarchyExplorer` coordinates path, mode, reveal, and scroll; proposed `grid-explorer-search.ts`, `use-grid-explorer-search.ts`, and `grid-explorer-search-results.tsx` own the Inbox-only full-hierarchy query, request lifecycle, and result body |
| Placement result/Undo | Explorer renders simplified Node/Bit rows and has no Newly Placed/Undo owner | Existing `NodeCard`/`BitCard` are the actual-record base; proposed `use-triage-newly-placed.ts` owns mounted-page provenance, dependency projection, and Undo availability |
| Completion/Archive | `use-can-archive-scratch.ts` reads UI candidates; `use-archive-scratch.ts` calls `archiveBit`; `BreakdownPanel` clears selection after a simple global confirmation | Existing `use-archive-scratch.ts` becomes the Archive operation coordinator for page-local blocker recheck, fail-closed recovery-descriptor storage, command dispatch, and reload reconciliation; the approved repository owns durable eligibility/mutation and existing Archive View owns restore |
| Copy | English strings are distributed across components | Proposed `src/lib/copy/inbox-triage.ts` is the one core-English Inbox/Triage resource owner; shared locale infrastructure remains deferred |

`Q-NAME-03` is resolved for this proposed SPEC by the exact Explorer and
placement owners above. `Q-NAME-04` is resolved by
`src/lib/copy/inbox-triage.ts`. These are phase-local, project-conventional
path choices; they preserve the selected obligations and do not assert that
the absent files already exist.

#### Workspace and section identity

Four visible, semantically named internal areas retain the selected ratios:

```text
[ Scratch Pool ] [ Main Work Area                          ]
                 [ Breakdown          ] [ Staging          ]
                 [ Grid Explorer (Home through Level 3)    ]
```

- Main Work Area: top 60% / bottom 40%.
- Top area: Breakdown 60% / Staging 40%.
- Staging: Nodes 35% / Bits 65%.
- `Scratch Pool`, `Breakdown`, `Staging`, and the semantic/default
  `Grid Explorer` identity are visible theme chrome. Retro Mac may use
  `Finder`; accessible naming and internal ownership stay `Grid Explorer`.
- Explorer columns use the full labels `Home`, `Level 1`, `Level 2`, and
  `Level 3`. Do not expose `L1`, `L2`, `L3`, `Home-L3`, or similar abbreviations
  or repeat a selected title below every column heading.
- The Pool list, Breakdown row list, Staging Node/Bit lists, and each Explorer
  column retain wheel, trackpad/touch, and keyboard scrolling while hiding
  visible scrollbar chrome. Hiding chrome never removes scrollability.
- The themes share state meaning, interaction, and accessibility but do
  not collapse into one generic panel/card realization. Exact visual values
  remain owned by `DESIGN_TOKENS.md` and approved recipes after their gates.

#### Scratch Pool and Context creation-date metadata

This common product contract applies to Scratch Pool and Selected Scratch Context in every current and future theme and phase. Both surfaces read the same Scratch Bit's `createdAt` through the one common formatter, `src/lib/utils/relative-time.ts::formatRelativeTime`; Context view and Scratch-title editor use that same date body. Do not substitute `mtime`, last modification or a Breakdown row's `createdAt`.

Keep the existing elapsed-duration calculation: `elapsedMs = Math.max(0, Date.now() - createdAt)`, `MINUTE_MS = 60000`, `HOUR_MS = 3600000`, and `DAY_MS = 86400000`. The display boundaries and relative copy remain:

| Elapsed duration | Date body |
|---|---|
| `0 <= elapsedMs < HOUR_MS` | `{Math.floor(elapsedMs / MINUTE_MS)}m ago` |
| `HOUR_MS <= elapsedMs < DAY_MS` | `{Math.floor(elapsedMs / HOUR_MS)}h ago` |
| `DAY_MS <= elapsedMs < 2 * DAY_MS` | `yesterday` |
| `2 * DAY_MS <= elapsedMs < 7 * DAY_MS` | `{Math.floor(elapsedMs / DAY_MS)} days ago` |
| `elapsedMs >= 7 * DAY_MS` | `d/mm/yy`, for example `4/05/26` |

Future timestamps retain the existing clamp to `0m ago`. At exactly seven elapsed days and later, derive the day, month and year from the timestamp's existing local `Date` interpretation (`getDate()`, `getMonth() + 1`, `getFullYear() % 100`): day has no leading zero; month and year each have two digits. Preserve elapsed-millisecond cutoffs across local day boundaries and DST; do not introduce UTC calendar fields, a locale-format substitution, a calendar-day age calculation or a timezone conversion.

Preserve render-driven refresh: evaluate the existing clock when the consumer renders. This contract adds no ticker, clock subscription, new producer or persistence mutation. Common semantic structure and centralized presentation roles remain in force. Theme-only Context date decoration belongs to the [Selected Scratch Context recipe](recipes/inbox-triage-selected-scratch-context-visual-recipe.md); it never replaces this common date body or changes its timestamp input. Applying this shared rule does not activate a later task/phase or reopen an accepted task.

#### Scratch Pool

- **Selection and re-entry:** On same-app-session Inbox route re-entry, restore
  the last selected Scratch only if it is still active. On first entry, reload
  or a new app session, restore the last selected Scratch saved on this device
  (`triage-preferences-store`, feedback F27, Phase 50) if it still resolves to
  an active Scratch of this account. Otherwise, or with an invalid prior
  selection, choose the first active Scratch in the current persisted Pool
  sort direction. With no active Scratch,
  selection is `null`. A search-hidden row is never chosen as a hidden
  fallback; automatic selection changes data context without stealing focus.
  Archive and Trash success use their own visible-order rule before this
  general fallback.
- **New capture:** When Scratch capture succeeds and the Inbox workspace is
  mounted at the moment the capture surface closes (by auto-close or by the
  user), the last captured Scratch becomes selected. The request exists only
  while that workspace stays mounted; unmount clears it, and it is skipped if
  the Scratch is no longer active. It is an ordinary Scratch switch: a
  non-empty Add draft opens the `VQ-03` sheet, where Continue keeps the
  current selection and leaves the new Scratch unselected in the Pool, and
  Discard and move selects it and focuses its Selected Scratch Context. If a
  pending operation locks Scratch switching, or an inline editor is still
  open, the selection is skipped. The Pool reveals the new row without
  moving focus; a collapsed Pool stays collapsed; an active Pool query is kept,
  and a new Scratch that does not match it shows the existing hidden-selection
  status. A capture from any other route does not navigate to the Inbox.
- **Expanded tools/list:** The tools region contains Inbox identity, all-active
  exact count, collapse control, title search, and created-at sort; search and
  sort share one tools row. The header/collapsed count always means all active
  Scratches, while a separate filtered count appears only during search.
  Scratch rows keep title plus [common creation-date metadata](#scratch-pool-and-context-creation-date-metadata). Pool sort defaults to
  newest-first and is independent of Breakdown sort.
- **Collapsed mode:** Identity/count, expand control, and Scratch switchers are
  vertical. Search/sort are absent, and a preserved query never silently
  filters switchers or the all-active count. Every switcher has an accessible
  Scratch name; selected state has a non-color cue. The prototype fold lock is
  removed and is not a preference.
- **Collapse lifecycle:** Selection, click, or simple Breakdown focus does not
  collapse the Pool. The first printable Breakdown key with a selected Scratch
  does. Manual re-open suppresses repeat auto-collapse for that Scratch until
  Scratch selection changes. Collapse preserves Pool query, result context,
  and list scroll; expand leaves focus on the activating control.
- **Session search:** Query/result/scroll recompute against current active data
  on same-app-session route re-entry. A restored selection that no longer
  matches remains selected and receives a concise hidden-selection status.
  Reload/new session clears query/scroll and starts expanded; none of this is
  durable or a device preference.
- Scratch titles are labels rather than identifiers, so duplicate titles are
  valid. Search remains strict after a title edit: if the selected Scratch no
  longer matches, its Pool row leaves the results while Selected Scratch
  Context remains active and exposes the same hidden-selection status.
- **External removal:** If the selected Scratch is externally archived or
  deleted (by another tab, device or surface, never by this page's own Trash
  or Archive), immediately lock its Edit/Add/Stage/Place/Archive actions and enter
  the lifecycle-specific transition defined by `VQ-01`. Its authorized controls
  are a five-second move countdown, move-now, and pause/resume, with no Cancel
  back to stale work. Destination is next-visible then previous-visible under
  current search/sort; if none is visible use no-selection search-empty, and if
  no active Scratch exists use Inbox empty. Destination and lifecycle are
  revalidated immediately before moving and recomputed if data changes. When
  the displayed destination changes, a running countdown restarts at five
  seconds; a user-paused countdown stays paused while its message updates. The
  status communicates both the archive/delete lifecycle and the current
  destination, or explicitly names the no-results/empty outcome when no target
  exists; exact wording and visual treatment remain with `VQ-01`.
- If non-empty Add or dirty Scratch/row Edit text exists, external removal
  starts paused and exposes each source-labeled full draft for copy. Copy
  status preserves focus, never resumes movement, and never persists or moves
  a draft. Continuing clears only the stale page-local drafts after copy
  opportunity. If an externally archived Scratch is authoritatively restored
  while waiting, cancel the transition and retain selection/client-memory
  drafts; hard deletion has no restoration shortcut. Countdown seconds are not
  announced every tick; lifecycle/timing is announced once and pause is a
  stable initial action.
- **Trash Scratch:** Each expanded Pool row has a Trash control at its far
  right, separate from the row's selection control; activating it never
  selects the row. Collapsed switchers have no Trash control. In Retro Mac the
  Selected Scratch Context title-strip `[X]` is a second entry for the
  selected Scratch; other themes keep that strip hidden. Both are disabled,
  with a visible reason, while any Inbox operation is pending, while a
  placement flow is open, and while that Scratch has a staged candidate whose
  source cannot be resolved (in the Postgres target this cannot occur: the foreign key keeps every source, S18).
  `[X]` is also unavailable while the completion overlay makes the Breakdown
  inert; the Pool entry stays available then. While the `VQ-03` sheet is up,
  the Pool and Breakdown are inert, so neither entry is available.
- Either entry opens one confirmation dialog for that Scratch. It names the
  Scratch, says the Scratch moves to Trash and can be restored from Trash,
  states the staged-candidate count when it is above zero, and states that
  the unsaved Add draft or open editor will be discarded when that Scratch
  has one. The Scratch version and candidate set stay live while the dialog
  is open, and confirm submits the version and set currently shown. Cancel has
  initial focus; Cancel or Escape closes it without a write and returns focus
  to the entry control, leaving any open editor as it was.
- Confirm runs SCHEMA `Trash Scratch` non-optimistically. The dialog stays
  open with locked actions and a pending status, the Pool row stays in place,
  Cancel and Escape do nothing while pending or reconciling (the dialog stays
  the visible owner of the lock; unknown offers only Check again),
  Scratch switching and internal route exit are locked, and browser exit uses
  the native unload guard. Explicit failure or not-applied keeps the dialog
  with Retry (same operation) and Cancel. An unknown outcome checks again
  before any new operation. Conflict updates the dialog to the latest counts
  with a changed-state status and needs a new confirmation as a new
  operation. If the Scratch becomes inactive elsewhere meanwhile, or a
  conflict result finds it inactive, the dialog closes and the
  external-removal rule applies.
- If an unresolved-source candidate appears while the dialog is open, Confirm
  is disabled with that reason. A `rejected` result shows the same reason
  with Cancel only; Cancel and Escape close it and the operation lock is
  released.
- This page's own-Trash markers are kept per Scratch as `{Scratch ID,
  expected version}`: set at dispatch, removed at a terminal result other
  than applied/already applied, and otherwise kept until the Inbox workspace
  unmounts. Being version-keyed, a kept marker never hides a later restore or
  an external Trash. (Clearing on first observation was dropped because
  several mounted Pool projections observe the deletion at different times.)
  Observing that Scratch trashed at expected version + 1 is own Trash: it
  never creates the external-removal transition or a Pool deleted status.
  Any other inactive observation is external removal.
- Success removes the row once, discards that Scratch's drafts and editors
  (so no unload guard or `VQ-03` remains for them), makes Undo unavailable for
  placements from that Scratch (markers stay), and announces the move
  politely. Trashing the selected Scratch hands off like
  Archive success: next visible, then previous visible, then filtered-empty
  or true Inbox empty, never through the `VQ-01` transition. Focus goes, for
  a Pool entry, to the destination's Pool row, else to search input/clear for
  filtered-empty or the Inbox empty primary action; for the Context `[X]`
  entry, it follows the Archive success focus rule. Trashing an unselected
  Scratch keeps the selection and focuses the next, then previous, visible
  Pool row, else the search input. Restore from `/trash` returns the Scratch through the existing
  restore lifecycle with its rows active and no staged candidates.

#### Item status presentation

Feedback F01–F10 (Phase 50; until then each status keeps its current
presentation). One rule covers every item-attached Inbox status: Staging Node
cards and Bit rows, Breakdown rows, the Breakdown Add field, the inline
editors and Explorer Newly rows. Looks: DESIGN_TOKENS §Feedback Status
Surfaces (`DP-FB-01`). Sentences stay in `src/lib/copy/inbox-triage.ts`.

- **Success shows nothing on screen** (F01): no `Added.`,
  `Returned to Breakdown.` or `Saved.` text, no check, no wash. Screen readers
  hear a polite, visually hidden `Added.`, `Returned to Breakdown.` or
  `Saved.` once (F04). No new modal or other surface is added for item status.
- **States** (F02, F03):

| State | Icon | Emphasis | When it shows |
|---|---|---|---|
| Pending | Loader | None; the existing dimming of a locked source row or candidate stays | After `DISPLAY_DELAY_MS` (300ms); a faster result shows nothing |
| Unknown | `?` | Yes | At once |
| Reconciling | Keeps `?`, then the loader | As unknown until the loader shows | The loader after 300ms; the pressed control (`Check again`) turns unavailable at once |
| Not applied, rejected, conflict, integrity | `!` | Yes | At once |

- The icon shape carries the state, not colour alone (WCAG 1.4.1); red stays
  reserved for destructive actions. Under reduced motion the loader is static.
- **Tooltip** (F09). The state's sentence shows in a tooltip on hover or
  keyboard focus of the item (the Add field, a row's grip, a Staging card, the
  Explorer status slot). It holds no controls, one shows at a time, and it is
  the item's description (`aria-describedby`). On a Staging card or row the
  problem tooltip leads with the full title on its own line, since the label
  truncates; when the sentence already contains the title, the title line is
  left out. On an Explorer card the body keeps its Task 179A truncated-title
  tooltip and the Undo slot shows only its own: a control shows only its own
  tooltip. Where the item's host is not in the Tab order (a Stage projection,
  an integrity slot, a locked row), its status icon is the focusable status
  element. Existing actions (`Retry Add`, `Check again`,
  `Retry`) stay as compact controls; "drag again" guidance is tooltip text.
- **Placement** (F07). Breakdown row: a 22px status slot before the actions,
  always reserved so the title does not shift; it replaces the 160px success
  slot (MI-21). Add field: the icon inside the field at its right end, the
  emphasis on the field, `Retry Add` beside Add. Staging Node card: the
  top-right corner. Staging Bit row: the row end. Explorer Newly row: the Undo
  slot ([Actual-card Newly Placed and Undo](#actual-card-newly-placed-and-undo)).
  Staging's only recovery control is the `?` of an unknown Stage or Unstage
  (Phase 50 mi-1); Staging has no Retry.
- **Decision surfaces keep their sentences** (F08): the Placement plate, the
  Archive completion card, the Scratch Trash dialog and the inline-editor
  conflict view. A Stage failure whose item disappears keeps the Staging
  alert band. Inbox status never uses a toast; a write attempt while offline is
  an app state ([Connection states](#connection-states)).
- The existing one-time polite pending and problem announcements stay.
- Every state can be forced in the running app with the
  [development state switch](#development-state-switch) (F30).

#### Breakdown and Selected Scratch Context

- Selected Scratch Context is a standalone signature section above rows, not
  heading metadata or a compact row-like strip. It contains the selected title,
  [common creation-date metadata](#scratch-pool-and-context-creation-date-metadata), an always-available Scratch-title Edit entry, and the
  Breakdown sort control. The Breakdown heading does not duplicate title/meta.
  Completion reuses this semantic Context as `Scratch complete`; exact themed
  realization remains downstream visual authority.
- Breakdown rows omit numbering and visible date/time, keep grip-only drag, and
  keep Edit/Trash controls visible without hover. Sort uses internal
  `createdAt`, default DESC, then `order`, then stable ID. Its device preference
  is independent of Pool sort.
- **Add:** Enter and an explicit Add control are the only creation triggers;
  blur neither submits nor discards. One submission snapshots one non-empty
  draft and one operation/record identity, locks duplicate submission, and
  never clears input or inserts an optimistic row. Confirmed success clears
  once, keeps input focus, scrolls only the row list to top under DESC or bottom
  under ASC, shows no visible success and announces `Added.` politely
  ([Item status presentation](#item-status-presentation)). Failure
  retains draft/focus without success scroll/signal and offers manual Retry
  with the same snapshotted operation identity. A known-offline attempt keeps
  the draft and focus; from Task 233 it changes nothing else and shows only the
  offline write-attempt toast, with no Retry (F18); until then it behaves as
  built.
  An unknown outcome reconciles before Retry or success; no in-memory Add queue
  or durable draft recovery is introduced.
- Add draft and one Scratch/row Edit draft are independent page-session state
  and may coexist. Same-Scratch work remains usable. Leaving the Scratch/route
  first resolves a dirty inline Save, then applies the `VQ-03` continue-writing
  versus discard-and-move decision; no navigation-intent queue accumulates.
  Browser reload/tab close with dirty text uses the native unload guard.
- **Inline editing:** Context Edit changes only Scratch title; row Edit changes
  only row content. Both stay in their source surfaces. Save commits, Cancel or
  Escape restores base, valid blur saves, empty stays in validation, and an
  unchanged value exits without a write. Theme/locale toggle activation and
  Trash entry activation (Pool row Trash, Retro Mac Context `[X]`) are the
  explicit blur-save exceptions: the editor stays open and dirty while the
  Trash dialog is open. During Save/reconcile, the editor/draft stays
  visible and conflicting Edit/Trash/DnD/Cancel actions lock. Failure or offline
  preserves draft and logical focus; reconnection enables manual Retry but does
  not auto-save or create an offline queue.
- **Editor states** (F05, Phase 50): `Unsaved changes.` shows no text (the
  enabled Save is the signal); `Saving…` and
  `Checking whether your changes were saved…` become the loader, with Save and
  Cancel unavailable at once; `Saving before continuing…` becomes the loader
  plus the existing `Stay here`, the sentence in the tooltip; `Not saved.`
  becomes `!` plus the tooltip; `Offline. Your draft is still here.` is
  replaced by the offline write-attempt toast ([Toasts](#toasts)), and the
  draft stays in the editor. The conflict view stays as built. A save whose
  outcome is unknown (an error or the request timeout) shows `?` at once with
  `We couldn't confirm whether your changes were saved.` in the tooltip and a
  compact `Check again` in place of Save and Cancel; it is never resent, the lock
  stays until a terminal answer, and `Check again` reconciles read-only (Task
  245A, Phase 50 mi-2). An editor invalidated while it holds such a save shows
  the recovery view at once and checks once, read-only, in the background; a
  terminal answer releases the lock and the view stays. If that check fails,
  the view offers `Check again` and Close stays unavailable until a terminal
  answer; the check is never retried on its own (Phase 50 mi-3).
- Editors capture `{record ID, base value, version, lifecycle}` in client memory
  and use SCHEMA CAS. A stale write never becomes last-write-wins. Text conflict
  offers inline use-mine/use-latest semantics against the acknowledged latest
  version. If another remote change arrives while that resolver is open, update
  its latest/base authority in place; never stack a second resolver or reset the
  user's draft. Pristine non-IME input may accept a remote value; dirty or
  composing input protects its draft. Staged/consumed/deleted rows or archived/
  deleted Scratches invalidate Save and may expose the draft for review/copy
  but never resurrect source truth. `VQ-04` owns the absent replacement
  surfaces.
- Scratch switch, another Edit, Archive, route exit, and Delete of another row
  use save-before-action with at most one visible pending intent. Trash
  Scratch is the one exception: its confirmation discloses the drafts and
  discards them on success instead of saving. The intent may
  be cancelled independently from the local draft. Edit entry focuses its
  editor; Save/Cancel returns to source Edit when it survives; conflict and
  validation retain editor focus; invalidated row removal selects next row or
  the Add input.
- **Row lifecycle and Delete:** Active rows permit Edit/Delete/drag. Candidate
  existence derives staged state; staged rows remain visible, de-emphasized,
  action-disabled, and not struck through. Consumed rows leave the active list
  but remain durable. Confirmed Delete is non-optimistic: the row stays in
  place as deleting/reconciling with locked actions and non-color status until
  authoritative success. Success removes once and only then recalculates empty
  and archive state; explicit failure restores Active without a special Retry
  button; an unknown outcome offers check-again rather than resending. Pending
  Delete locks Scratch/route navigation without queued navigation and uses the
  native unload guard.
- Delete success focuses next-visible then previous-visible under current sort;
  if neither exists, focus goes to Add for an ordinary empty state or the
  archive overlay heading when the deletion created completion. Failure returns
  to Trash and unresolved check-again retains focus. `VQ-05` owns unsupported
  state realization details; from Phase 50 the row and Add field statuses
  follow [Item status presentation](#item-status-presentation).
- Never-used/all-deleted-without-consumption uses an idea-creation empty prompt.
  All-consumed completion is distinct and follows the archive flow below; an
  empty-array `every()` result is never completion evidence.

#### Durable Staging

- Staging and `Nodes`/`Bits` subsection identity stay visible. Node candidates
  remain card/grid objects; Bit candidates remain list/rows, distinct through
  shape and information rather than color alone. Empty Staging stays quiet:
  no large or repeated placeholder card. Each independently scrollable list
  sorts `createdAt` DESC then stable ID, has no manual reorder or count cap, and
  preserves the 35/65 split and panel height.
- **Nodes zone width** (F10, MI-21, Phase 50): the `Nodes` zone is never
  narrower than one Node card, even where that bends the 35/65 split, and lays
  its cards in an auto-fill grid: one column when two cards do not fit, two as
  today when they do. All themes share it.
- A subsection label is just `Nodes` or `Bits` for zero or one presentation candidate. It receives a numeric prefix only at two or more (`2 Nodes`, `3 Bits`). For each type, this presentation total includes source-resolved durable candidates and visible non-draggable Stage projections in pending, unknown, or reconciling, counting an authoritative candidate and its operation projection with the same candidate ID once. Unstage adds no projection count and retains its durable candidate until authoritative disappearance. Unresolved-source integrity slots are not presentation candidates and are excluded from this total. Repository membership, authoritative counts, Archive eligibility and operation locks remain durable truth. The heading total is not a success claim. Authoritative `applied` and `already_applied` outcomes retain their SCHEMA semantics and show no visible success (feedback F01); the heading total still derives only from the current reactive candidate/projection inputs. Terminal projection removal follows the post-terminal presentation hold (amended 2026-10-18, MI-15). On `applied` or `already_applied`, a Stage projection whose candidate ID is already in the current snapshot is removed in the same commit; otherwise it stays as a post-terminal presentation hold: it keeps its current phase, copy and non-draggable shape, holds no lock or navigation guard, makes no new announcement, and keeps counting once with its candidate ID. The displayed phase is presentation only: the item is marked held, no lock, guard, live sentence or other consumer treats it as unresolved, and it keeps the interactivity it had while pending (a held candidate is not draggable; a held source row's grip, Edit and Delete stay disabled). The hold is checked when the result arrives and on every later snapshot. It ends when the snapshot contains the candidate ID (as a source-resolved candidate or an unresolved-source integrity slot), when a live-query read that started after the result returns without it, or when the subscription errors. `rejected`, `conflict`, `not_applied`, and failure are never held. No timer or elapsed time decides removal, and membership is never inferred before the snapshot. Stage projections render at the top of their list, newest first, where the candidate lands under the `createdAt` DESC sort. A pending Stage projection, and one held from pending, shows the candidate's icon and title in its final card or row shape and no in-card status line; its pending sentence is announced only through the Staging live region (2026-10-18, mi-14). Unknown and reconciling keep the attached line until Phase 50, which replaces every in-card line with the item status icon and tooltip: the loader after the delay for pending, `?` for unknown and reconciling ([Item status presentation](#item-status-presentation)). The subsection-local remote-arrival `new items` indicator remains separate and is never added to this total.
- The whole staged candidate root is the primary pointer/touch drag activator;
  it has no select/detail/menu behavior and no internal grip. Every grab point
  uses the same pointer-centered, type-specific compact `TriageDragToken` and
  the selected Mouse/Touch activation thresholds.
- `StagedCandidate` is durable synchronized domain truth, never Zustand/UI
  state. It is scoped to one Scratch, survives route/reload/device, and stores
  no display-label snapshot. `useStagedCandidates` joins
  `sourceBreakdownId` to authoritative row content. Candidate existence derives
  staged presentation and enforces one candidate per source stable ID; same-
  title rows remain independent. Duplicate Stage is a no-op; type change
  requires authoritative Unstage then a new Stage. This user-visible no-op does
  not collapse SCHEMA result semantics: the same proved postcondition may be
  `already_applied`, while a different duplicate/revision is
  `rejected` or `conflict` and never creates or changes a candidate.
- A snapshot miss, offline state, or delayed refetch never proves an orphan
  and never renders a broken candidate as normal. In the Postgres target the
  foreign key from a candidate to its source makes an orphan impossible, so the
  confirmed-orphan command and its `VQ-06` orphan status are removed (S18;
  Phase 46 removed the client path). There is no general operation history.
- Candidate existence blocks staged-source Save/Delete in the repository as
  well as UI. Rejection never auto-unstages, propagates an edit, or cascades a
  candidate. Staging does not consume the source row.
- Stage revalidates source ID/version/lifecycle/uniqueness before one durable
  command. Pending uses the candidate's semantic final type/shape, locks the
  source and dependent actions, and is not draggable, unstageable, or
  placeable. Confirmed success changes to staged. A proved not-applied storage
  failure removes only the pending projection and restores the unchanged
  Active source. A rejected/conflict result instead applies returned authority:
  a modified row refreshes, an already-staged row shows its existing candidate,
  and a deleted row leaves the list; none is auto-staged from the drag snapshot.
  An unknown outcome is checked once, read-only, right after it, and never
  resent. If that check fails too, the Stage projection or candidate keeps
  `?` and the operation lock, and its `?` is a button that runs the same
  read-only check (`Check again`; the tooltip adds `Select to check again.`).
  It turns unavailable at once; a terminal answer applies as the command's
  own result would and releases the lock; a check that fails returns to `?`.
  When the Scratch is removed elsewhere while a Staging command is held, or
  the held command's candidate leaves the list while its Scratch stays
  selected, one read-only check runs in the background and is never retried
  on its own; a held command gets at most one such automatic check (Phase 50
  mi-1, mi-2, user 2026-10-30). No repeated pulse or
  layout-changing motion is permitted.
- A transient drag-time Staging target and the whole Breakdown section drop-
  back invoke the same Unstage command; there is no permanent unstage button.
  The Staging target overlays without resizing/blurring lists, and temporary
  scroll padding disappears with the drag. Same-type Staging drop is a neutral
  mutation-free cancel; opposite type is invalid and requires Unstage first;
  release/Escape/browser cancel elsewhere is silent and mutation-free.
- **Staging subsection drop region (user-adopted, 2026-10-17):** the `Nodes`
  and `Bits` subsections each accept their drop anywhere in the subsection —
  its heading row, including the count and the `N new` control, plus its well
  — so the heading is part of the target. Stage, neutral, invalid and
  unavailable meanings are unchanged, and the lower Remove target keeps
  priority where it overlaps a subsection. Hover feedback covers the same
  whole subsection. Heading controls stay clickable and are not targets of
  their own; well scrolling and observed-top clearing stay on the well. All
  themes share this region through one tree.
- At staged-candidate drag start, semantically invalid Grid columns expose an
  invalid signal under the existing Home/Level-3/hierarchy type rules; actual
  invalid hover adds a direct reason without replacing the column label. The
  whole Breakdown section simultaneously exposes an Unstage target, strengthens
  it with a direct return-to-Breakdown reason only on hover, and never obscures,
  resizes, or relabels existing Breakdown content. These transient signals clear
  on target exit or drag end and never blink, pulse, or trigger an automatic
  drop.
- Unstage uses the same post-terminal presentation hold (2026-10-18, MI-15): after `applied` or `already_applied`, the retained candidate keeps its Unstage operation state until a snapshot no longer contains it, until a live-query read that started after the result still contains it, or until the subscription errors. While its Unstage is pending, the candidate card stays dimmed and shows no in-card status line (2026-10-18, mi-14); in unknown or reconciling the card is not dimmed and shows its attached line (from Phase 50 its status icon); a held Unstage keeps the dimming of the phase it was held from. On Stage, the Breakdown source row stays dimmed from drop until the Stage settles and its hold ends, and changes in the same commit as the Staging region. Dimming follows operation state, not the drag state. After a Scratch switch, no commit shows the previous Scratch's operation rows, counts, remote-arrival indicator or Staging alert.
- Unstage keeps candidate/source staged until success. Success removes the
  candidate, restores the source's original created-at sort position, scrolls
  only the Breakdown list if needed, restores source focus, shows no visible
  success and announces `Returned to Breakdown.` politely (feedback F01, F04).
  Failure retains candidate/source and is retried through a new drag, not a
  separate Retry button. Inbox status never uses a toast (F08).
- Stage/Unstage failure feedback is a Staging-local alert that preserves focus,
  identifies the failed item and reason, and has an accessible `X` that closes
  only the alert. It never auto-dismisses by timer. It clears on `X`, a new
  operation for that candidate, authoritative candidate disappearance, or a
  Scratch switch; a later failure replaces the earlier alert. Exact appearance,
  wording, and placement remain with `VQ-06`. From Phase 50 (feedback F08) the
  band keeps only notices whose item has gone: the Stage failures and the
  stale-invalidation notices (changed-elsewhere drop cancellation, placement
  closed); an
  Unstage failure, whose candidate remains, shows `!` with its tooltip on that
  candidate instead, cleared by a new operation for that candidate, its
  authoritative disappearance or a Scratch switch.
- Pending/reconciling Stage or Unstage locks Scratch selection and internal
  route exit without queuing or auto-running a request. Unrelated same-Scratch
  row review, Pool use, and Grid exploration remain usable. Browser exit uses
  native unload; terminal success/failure simply removes the lock.
- Local Stage scrolls only its subsection to top without moving focus. Remote
  arrivals preserve scroll; when the user is not already at top they increment
  a subsection-local new-item projection, cleared on activation or observing
  the top and excluding hydration/Scratch-switch loads. Remote arrival is
  politely announced without focus theft. During remote invalidation, an
  active drag retains its visual snapshot only through release, suppresses the
  local drop mutation, then applies authority. An open stale placement closes,
  discards only its invalid Result Title draft, and restores focus to related
  source or the Staging heading if the source vanished.

#### Grid Explorer and dedicated search

- **User-selected Task 169 review amendment, 2026-10-07:** the following
  Explorer consumer contract applies to every current and future Inbox/Triage
  theme. It records the selected behavior; implementation, verification and
  task acceptance remain separate lifecycle actions.
- Explorer has one section-header row: native section icon/identity on the
  left and its dedicated search control on the right. There is no separate
  persistent path/breadcrumb row or second search toolbar. Removing that row
  does not remove the internal path, selected ancestor chain, column labels,
  navigation, attached path status, search-result breadcrumbs or Placement
  destination identity.
- Every ordinary-column and search-result Node/Bit uses the actual record's
  stored `icon` through the existing icon mapping/fallback. A saved icon change
  on the same record in the ordinary Grid is reflected through the same
  database/reactive projection in Explorer; separate browser-profile databases
  remain separate. Theme styling may change glyph size/treatment, not substitute
  a mock or render-time random identity. No new icon model or schema is introduced.
- Actual cards in the Inbox Explorer do not expose the ordinary Grid's options
  menu or Direct Archive action. Source-aware Newly Placed/Undo and attached
  reasons remain independent actions; Scratch Archive retains its own contract.
- Explorer rows are not drag sources. They expose no grab/grabbing cursor.
  A selectable Node uses a pointer cursor; a Bit row without an activation
  command uses the default cursor. Independent actionable controls retain
  their own cursor/focus treatment. Node destinations remain drop targets for
  Breakdown/Staging sources. Hover changes color only, without scale,
  translation, decorative shadow or stacking lift; keyboard focus, selection,
  reveal and actual drop-target feedback remain distinct.
- Past-deadline `Done?`, `Mark as done` and `Dismiss` controls belong to the
  ordinary Grid card, not Inbox/Triage Explorer. An overdue, incomplete Bit
  retains a readable title/deadline, a subdued state surface and a small static,
  accessibly named overdue mark; overdue alone never implies completion or
  title strike-through. A completed Bit uses muted title/strike-through plus a
  static check mark. Title/deadline and independent NEW/Undo/reason/focus are
  not blurred or clipped. These are projections of existing deadline/status,
  not new completion/dismiss commands or writes to `pastDeadlineDismissed`.
  Priority remains the actual stored metadata.
- **Explorer urgency (user-adopted, 2026-10-17, MI-10):** the ordinary Grid
  card's near-deadline urgency blink does not run in the Inbox Explorer. Every
  Explorer Bit row is static; its deadline text carries the urgency. The
  ordinary Grid keeps the blink.
- **Explorer truncated titles (user-adopted, 2026-10-19):** in every theme, an
  Explorer Node or Bit title cut by its ellipsis, measured when the tooltip
  would open, shows the full stored title in a tooltip above it while the
  pointer is over the title, or while the card itself holds visible keyboard
  focus (`:focus-visible`): a Node card reached by Tab, or a Node or Bit card
  focused by placement, reveal, Undo or arrival after a keyboard action. Bit
  cards stay out of the Tab order and focus behaves as before; focus that
  follows a pointer action shows nothing. A title that fits shows none. The
  tooltip is presentation only: Esc dismisses it until focus leaves the card or
  the pointer leaves the title; it does not show while a drag is active; it is
  attached to the title alone, and it and the card's Undo tooltip are never
  shown at once; the card's accessible name and description stay as they are,
  so the title is read once. The ordinary Grid card is unchanged.
- **User-selected Node/Bit distinction amendment, 2026-10-08:** within the
  ordinary Inbox/Triage Explorer body, retain the existing Node-before-Bit
  groups and within-type ordering without an inter-type divider or visible
  `Bits` heading. Bit-only columns, including Level 3, begin at the normal item
  inset without reserved subsection-header space. Preserve full column labels,
  actual item identities/keys/refs, navigation/reveal/scroll, drop targets and
  independent NEW/Undo/reason/focus. Metadata and retained production states
  expand the actual card naturally. This common structure does not prescribe
  retro-mac geometry for other themes or change replacement-search composition.
- Explorer path, selected Node chain, open columns, and each column scroll are
  shared by the mounted Inbox page across Scratch switches; no per-Scratch path
  map and no automatic Home reset is created. Same-app-session route re-entry
  restores path/columns/scroll after active/reachable validation and nearest-
  valid-ancestor fallback. Re-entry restores data context but focuses the page
  heading/main landmark, not a stale deep control. Full reload/new session
  starts Home with reset column scroll.
- Ordinary remote insertions preserve path, selection, and focus. A column
  anchors its first visible stable ID plus viewport offset rather than a raw
  `scrollTop` when insertion would shift content. If a path ancestor becomes
  deleted/archived/unreachable/moved, remove the invalid suffix, fall to the
  nearest valid ancestor without sibling or ghost substitution, focus that
  ancestor or column heading, report non-blocking status, and close stale
  placement without a write.
- Explorer search is an Inbox-only mode inside the Grid Explorer section. It
  replaces the four-column body and focuses its one input in the right-hand
  slot of the single section header. While search is open, that field and its
  in-input X stay fixed above the replacement body's fixed state line and
  scrolling result list; there is no second input in the body. Explicit entry,
  clear/close, interrupted-search and focus lifetimes remain the approved
  dedicated-search contract. It does not reuse or
  extend global `useSearch()`/`searchAll()` and does not change the global
  Search Overlay. Empty query/pre-search and no-results are distinct; clear is
  an in-input X. Search is unavailable while a direct/result-title/placement
  flow is open.
- The pure proposed `grid-explorer-search.ts` owner traverses every active Node
  and Bit reachable from every visible Home root. It excludes Chunks,
  archived/trashed items, system Nodes, hidden roots, and unreachable orphans.
  Whitespace tokens use AND matching across title and full breadcrumb, with no
  fuzzy/semantic correction. Rank is title exact, title prefix, title
  substring, split title/breadcrumb, then breadcrumb-only; ties follow stable
  Grid hierarchy order.
- Results are one flat typed Node/Bit list with title, full breadcrumb,
  ancestor ID chain, existing icon/color identity, hierarchy order, and
  relevance. Same type/title/breadcrumb duplicates receive visible textual
  disambiguation rather than exposed coordinates. Loading, no-results, stale
  refresh, and failure are distinct semantic states, with all results reachable
  through scrolling or production virtualization; `VQ-07` blocks the absent
  replacement body from implementation until a matching user decision.
- `useGridExplorerSearch` owns asynchronous request identity/cancellation,
  loading/error/stale response, and reactive data updates. Updates retain query,
  result scroll, and focus without an extra remote alert; if a focused result
  disappears, focus returns to the input.
- Click or Enter selection, Arrow Up/Down, and Escape are supported. Selection
  first revalidates the item and ancestor path as active and reachable. A stale
  result keeps search/query active, refreshes results, reports a non-blocking
  status, and performs no reveal or navigation. A valid selection clears
  active/interrupted query, restores columns, reconstructs the ancestor chain
  without leaving Inbox, selects a Node or reveals a Bit inside its parent
  path, and applies an event-ended (never timer-ended) reveal. Other item
  selection, path change, DnD start, search restart, or route exit ends reveal.
  Search result rows are not DnD sources.
- Starting a Breakdown/candidate DnD closes search and immediately restores
  columns/drop affordances. Only that interruption retains the query as
  page-local interrupted search; Drop/Cancel never auto-returns. An explicit
  reopen restores it. Result selection, X, Escape, or Inbox route exit clears
  interrupted state. Scratch switching preserves current Explorer search,
  results/scroll, path, column scroll, and reveal without forcing search focus.
  Route exit clears active/interrupted search and reveal; same-session re-entry
  starts normal columns rather than restoring search mode.
- Locally newly placed items enter results immediately. Undo from a result
  retains query and removes only that result, with source-restoration status and
  deterministic next-result/input focus.

#### Pointer placement and commit reliability

- Placement starts only from Mouse/Touch pointer DnD. Breakdown uses its grip;
  staged candidates use the whole root. While dragging near a valid column's
  top/bottom edge, progressively auto-scroll only that column without jumps.
  Invalid/other columns, the Explorer shell, and page never auto-scroll. Stop
  on edge exit/end, never change path automatically, and continuously hit-test
  the pointer-under target. Pointer release determines the final target.
- **Column drop region (user-adopted, 2026-10-17):** an open Explorer column
  accepts its column-level drop anywhere in its pane — the full-label header,
  including its `N new` count and path-status strip, plus the scrolling rows —
  so a column filled with Node rows keeps an always-visible column target. A
  Node row under the pointer still targets that Node; anywhere else in the pane
  targets the column's own parent (`Home` or the selected Node). Eligible,
  hovered and unavailable feedback covers the same whole pane. Header controls
  stay clickable and are not targets of their own; the header adds no
  auto-scroll zone, so edge auto-scroll stays on the row viewport's own
  top/bottom edges. A column with no selected parent stays disabled. All
  themes share this region through one tree.
- Home accepts Node only; Level 3 accepts Bit only; intermediate hierarchy
  constraints remain. Invalid hover performs no write. A full destination still
  enters the selected target-column placement affordance with visible full-
  target reason, disabled Confirm, and Cancel. It never selects a parent,
  sibling, alternate cell, or different target automatically. Confirm rechecks
  source/candidate versions and lifecycle, expected ancestor chain, target
  reachability/type, title limit, and an exact free cell.
- A staged drop opens its distinct target-column placement step. If source text
  exceeds the chosen result type's SCHEMA limit, `VQ-09` first requires the
  separate staged Result Title step; the draft does not edit source content.
  Direct placement first selects an allowed Node/Bit type plus destination,
  then advances to a distinct placement step. Direct source length `1–100`
  permits Node/Bit, `101–200` Bit only, and `201–1000` neither; direct placement
  has no hidden Result Title editor, truncation, or schema expansion.
- Each stage has explicit focus entry/containment. Staged confirmation focuses
  heading or safe Cancel, Result Title focuses its input, and direct type
  selection focuses its heading. Advancing focuses the new step; unavailable
  type exposes a non-color disabled reason. Cancel/Escape returns to source
  grip/card or its section heading if the source vanished. The column-scoped
  affordance is not converted into a full-screen modal merely for focus
  containment.
- Direct type, optional Result Title, confirmation, pending/reconciling, and
  result are one foreground flow. It locks Scratch switch, Grid path/search,
  new DnD, internal route exit, Archive, and conflicting Undo without queuing
  or auto-running an intent. Cancel/Escape mutates nothing and discards only an
  uncommitted Result Title draft. Reload does not restore an unconfirmed flow;
  native unload is used only when the draft is dirty.
- Confirm creates one stable operation/result identity and invokes the SCHEMA
  atomic command. Staged placement creates the actual result, consumes and
  advances the source, and deletes the candidate in one transaction. Direct
  placement creates and consumes together. Validation failure writes nothing;
  no partial compensation, best-effort one-sided state, alternate target,
  last-write-wins, silent retry, or title-based success heuristic is allowed.
- Pending/reconciling keeps source/candidate and affordance visible and locked;
  it never optimistically adds a result or removes source truth. Explicit
  failure keeps source state and offers manual Retry/Cancel; unknown outcome
  retains the operation ID and reconciles complete pre/postconditions before
  Retry. `VQ-08` owns unsupported reliability-state realization. Success
  focuses the actual created card and exposes the Newly Placed/Undo semantics.

#### Actual-card Newly Placed and Undo

- A placement result is a real repository Node/Bit rendered on the existing
  `NodeCard`/`BitCard` foundation, never a checkbox, string indicator, duplicate
  card model, or redesigned common card. Newly Placed is a page-session marker
  layered on that actual card and remains semantically distinct from selection;
  both may coexist. Repeated blink/pulse/flicker is forbidden.
  Actual-card reuse follows the Explorer consumer boundary above; it does not
  import ordinary Grid Archive or past-deadline command controls into Inbox.
- Only placement operations started and confirmed by the currently mounted
  Inbox page receive marker/Undo provenance. Remote, other-tab, or reloaded
  records render normally at stored coordinates. Stored `x/y` and Grid order
  do not change; the page projection temporarily pins locally newly placed
  Nodes above ordinary Nodes and Bits above ordinary Bits, newest completed
  operation first. Success reveals the pinned card. Newly placed Nodes retain
  normal selection/navigation/child-target behavior.
- Multiple markers coexist across Scratch and column switches. Inbox route
  exit ends marker, pinning, and Undo but leaves the actual records. Provenance
  and Undo eligibility are separate: ineligibility never erases the marker.
  Proposed `use-triage-newly-placed.ts` owns the exact mounted-page operation,
  dependency, and projection state.
- Undo atomically removes the unchanged result and unconsumes/advances its
  source. Staged provenance also restores the same candidate identity/type/
  creation provenance under SCHEMA; direct provenance restores only the active
  row. It never cascades or best-effort restores one side.
- Undo is eligible only while the result's creation snapshot/lifecycle/direct
  mutation evidence is unchanged, its source Scratch is active, and it has no
  surviving descendants or unknown mutation. While Trash is pending the
  operation lock already blocks Undo; an applied Trash, an Archive success or
  any other inactive owning Scratch makes Undo unavailable without a click,
  with the reason `Its Scratch was moved to Trash.` or
  `Its Scratch was archived.` Same-session reversible children can be undone child-first;
  once dependencies disappear, parent eligibility may recover. Non-mutating
  selection/navigation/search reveal does not revoke eligibility. An
  unavailable control stays exposed with an accessible non-color reason.
- The Undo control handles its own activation and never bubbles into the
  actual card's selection/navigation action.
- Eligible Undo remains available through completion/Cancel until Archive
  mutation starts. An open placement or pending Archive disables it with the
  owning reason and never implicitly cancels/retargets. Undo success restores
  work, immediately removes completion/overlay/reopen state, and announces the
  source restoration without cross-section scroll/focus theft.
- Undo is non-optimistic. The actual card and source remain while pending; one
  atomic result converges through Retry/reconciliation. Dirty Edit first uses
  the single save-before-action intent and revalidates Undo after Save. Pending
  Undo locks Scratch switch, other placement, Archive, route exit, and browser
  exit under the selected guards. In ordinary columns, post-success focus is
  next card, previous card, then column heading; in search it is next result,
  then input. `VQ-10` owns unsupported overlap/ineligible/reliability
  realization details.
- **Undo slot status** (feedback F07, F09, Phase 50). On Explorer Newly rows the
  Undo slot is also the Undo operation's status slot: `↶` (available), the
  loader (pending, after the delay), `?` as a button that checks again
  (unknown), `!` as a button that retries (failure). A `!` without an action,
  such as a conflict, is an unavailable, focusable button with its tooltip, like
  the existing unavailable Undo. Both an unavailable `↶` and an action-less `!`
  use `aria-disabled="true"`, never the `disabled` attribute, so they stay in
  the Tab order and their reason tooltip shows on keyboard focus as well as on
  hover. The always-visible status rail and its text
  recovery actions are removed; their sentences move into the slot tooltip,
  which adds `Select to check again.` or `Select to try again.` The row keeps
  its width. Replacement-search results import this Undo status treatment, as
  they import Tasks 156–157 today, so a result's trailing Undo uses the same
  slot rule (F06).

#### Completion and Archive Scratch

Durable eligibility is exactly the approved SCHEMA predicate and is never
implemented as a vacuous `every()`:

```text
selected Scratch exists and is active
AND consumed Breakdown row count >= 1
AND unconsumed Breakdown row count == 0
AND staged candidate count == 0
```

- All-staged and all-deleted-without-consumption are ineligible. One consumed
  row plus deliberate deletion of remaining active rows may be eligible.
  A non-empty Add draft and an open/dirty/saving/conflicted/reconciling Scratch
  title editor are page-local presentation/dispatch blockers; they do not
  change the stored formula, are never auto-submitted/discarded/saved, and use
  `VQ-11` status. Clearing/resolving the blocker reruns eligibility.
- The first false→true transition in the mounted page opens the authorized
  Breakdown-scoped completion overlay with Cancel and Archive entry points.
  It affects Breakdown only, preserves current focus, announces readiness, and
  is a non-modal region before mutation: other sections and eligible Undo stay
  reachable. Blurred Breakdown controls are locked. Escape cancels only when
  focus is inside the overlay. Scratch Context title Edit is blocked while the
  overlay is open.
- Cancel closes the overlay, changes Context to complete, exposes reopen, and
  immediately restores the existing Add entry; the complete Context permits
  title Edit again until Archive dispatch. It writes no durable dismissal.
  A successfully added/restored active row or staged candidate removes
  overlay/complete/reopen immediately and reports lost eligibility; merely
  typing an Add draft shows its blocker without changing persisted completion.
  Reopen returns focus to heading/safe Cancel; Cancel returns focus to reopen.
- Switching Scratch before Archive dispatch defers the decision without a
  write and closes only that presentation. Returning in the same page session
  shows complete/reopen if still eligible, never auto-opens. Route exit/reload
  stores no overlay open/Cancel state. Entry/reload onto an already eligible
  Scratch shows complete/reopen; only a new mounted-page false→true transition
  auto-opens.
- Archive rechecks page blockers immediately before dispatch and rechecks
  active lifecycle, exact version, consumed count, unconsumed count, and
  candidate count inside one SCHEMA transaction. It sets only the Scratch
  `archivedAt`/version lifecycle and retains rows for existing Archive View
  restore. It is non-optimistic: the Scratch remains selected/in Pool and the
  overlay remains pending/reconciling until authoritative success. Pending
  locks Cancel/Escape, Undo, Edit, placement, Scratch switch, internal route
  exit, and duplicate Archive.
- Explicit failure leaves the Scratch active and provides manual Retry/Cancel;
  unknown outcome reconciles before any new operation. The approved, validated
  `PendingOperationRecovery` identity descriptor is the only Inbox workflow
  state permitted in `sessionStorage` across forced reload. It is written
  successfully before dispatch or Archive fails closed, contains no draft/
  payload/queue, and clears after terminal reconciliation. Reload resolves to
  archived/removed, not-applied complete/reopen, or unresolved section recovery
  before the initial Inbox projection. `VQ-12` owns unsupported reliability
  realization.
- Section recovery replaces the Inbox projection only while the projection is
  not ready, or for an Archive restored after forced reload that has not yet
  been shown in the workspace. An Archive started on the mounted page, or a
  restored one already shown there, keeps the workspace mounted from dispatch
  through selection handoff and terminal state, so mounted page-session state
  such as Newly Placed/Undo and Explorer search survives. The one exception is
  a recovery-storage failure after dispatch, which keeps its section
  projection. The Archive card appears only in its own Scratch's Breakdown; a
  pre-dispatch recovery-storage failure, which has no operation identity,
  shows in the Breakdown of the Scratch where Archive was activated.
- A non-success terminal result (not applied, rejected, conflict) or a
  pre-dispatch storage failure ends on Cancel or when the selected Scratch
  changes away from its Scratch by any path (Pool, external-removal handoff,
  Pool reconciliation), which dismisses it like Cancel with no write.
- Terminal success is committed and announced once. A later Archive on the
  same mounted page is then accepted as a new operation.
- After confirmed success, preserve current Pool search/sort and select the
  archived row's next-visible then previous-visible Scratch. If a filtered list
  has a visible successor, focus its Selected Scratch Context. If a filtered
  list has no visible result, select no hidden Scratch and focus search
  input/clear.
  If no active Scratch exists without a search filter, show true Inbox empty
  and focus its primary action. Never navigate automatically to Archive View.
  Focus moves from the Archive slot to the destination in the render that
  shows the destination; at no point does it rest on the document body.

### Archive View Surface (rendered for `systemRole: 'archive_view'`)

A **portal, not a container** — archived items keep their original `parentId`; the surface queries all items where `archivedAt` is set (it does not read its own children).

- **Grouping:** by original parent Node (archived L0 Nodes form their own top-level group). **Sort:** `archivedAt` descending within each group. **Search:** filters by title.
- **Restore:** single-item (↩) clears `archivedAt`; BFS auto-placement if the original cell is occupied; restoring a Bit whose parent is archived restores the parent chain (±5s window, Hook 11). Bulk restore is not in v1.
- **Tone:** warm/dignified (distinct from Trash's destructive tone); completed items show ✓.
- **Visual:** existing GridDO baseline UI/tokens in Batch 1 (no dedicated Archive View theme source; future global theme system may affect it via global tokens).

### Direct Archive (context menu)

Any non-system Node or Bit can be archived from its ordinary Grid context menu (no Review Mode required) — sets `archivedAt` with cascade (Hook 10). System Nodes are excluded. **Completion does not auto-archive**; completed-but-unarchived items remain in place on the grid until the user archives them.

The user-selected Task 169 review amendment excludes this menu/action from
Inbox/Triage Explorer in every theme. That presentation boundary does not
change repository Archive/cascade/restore behavior or Scratch Archive.

---

## Account Entry And App States

SaaS conversion (DECISION S07–S43; feedback F02, F11, F13, F14, F16 copy
alignment and F17–F20 within SaaS S41). Exact copy is in
[Feedback copy](#feedback-copy). Surface looks are a Decision prerequisite
(`DP-SAAS-01`, `DESIGN_TOKENS.md` §SaaS App-State Surfaces); semantic tokens
only (S40).

### Account entry

1. **Narrow window.** While the viewport is narrower than 1024px the
   narrow-window notice covers the app (S42 (4); Phase 48). The app stays
   mounted and `inert` beneath it, so widening the window again brings back the
   same screen with its drafts and Inbox state. A visit without a session
   creates no guest while the window is narrow; entry continues once it is wide
   enough.
2. **Session.** A visit without a session signs in anonymously and becomes a
   per-visitor guest (S10, S23). In production Cloudflare Turnstile guards that
   sign-in; when it needs an interactive check, its widget appears inside the
   app-level frame, since there is no sign-in page (S42 (3)). The session lives
   in that browser, so the same browser returns to the same guest until the
   guest is cleaned up 7 days after its last visit (S42 (5)).
3. **Account preparation.** `ensure_account()` (SCHEMA §Account preparation)
   records the visit, creates or normalizes the system Nodes and, for a new
   guest, copies the demo seed.
4. **Snapshot.** `get_snapshot()` loads the whole account
   ([Architecture Decision 19](#architecture-decisions)). Until it is ready the
   app-level loading screen covers the window, shown only after
   `DISPLAY_DELAY_MS` (300ms), so a fast load shows nothing and an empty Grid
   never reads as lost data (S26, F02, F19).
5. **Ready.** The app renders as today. `/` stays the L0 Grid.

There is no sign-in page, no `/demo` route and no top banner (S23). Before
Phase 48 there is no Turnstile and no OAuth; locally, browser checks sign in as
a local test user with email and password (S20). From Phase 48 local Supabase
also runs OAuth and Turnstile ([Environments And Hosting](#environments-and-hosting)).

**Several tabs** (user, 2026-10-22). The session is shared by every tab of the
browser. When another tab signs in, signs out or switches to a new guest, this
tab drops its snapshot and repeats steps 3–5 for the new user behind the
loading frame. Only the tab whose user pressed `Sign out` creates the new
guest; the other tabs follow that session. Two tabs on a first visit may each
create a guest; both converge on the session stored last, and the extra guest
is never shown again and is cleaned up 7 days later.

### Account icon and modal (sidebar, not a route)

- One account icon at the top of the sidebar, above `+`, on every route
  (S23). The Home button (feedback F21, Phase 50) sits above it. Task 234
  places the icon below Home if Home has landed, otherwise at the very top, and
  Phase 50 then puts Home above it (F33). Lucide `user-round` for a guest,
  `user-round-check` for a signed-in OAuth account.
- The connection badge (F17) sits on this icon ([Connection states](#connection-states)).
- Phase 47 builds the icon and its badge with no modal: until Phase 48 the icon
  is a focusable status element whose tooltip is the connection sentence, with
  no action. Phase 48 makes it the button that opens the account modal
  (S43 (1)).
- **Guest modal:** that the visitor is browsing as a guest; that guest data is
  deleted 7 days after the last visit (S42 (5)); `Sign in with GitHub` and
  `Sign in with Google`; that signing in opens a new, empty account and does
  not move the guest data into it (a guest is never converted, S23); and the
  privacy note. No sign-out: a guest has nothing to sign out of.
- **Account modal:** the account name, `Sign out` and `Delete account`.
  Sign-out drops the snapshot and leaves the visitor as a new guest (S23).
  `Delete account` asks for confirmation in the modal, since it cannot be
  undone; on success the visitor becomes a new guest and a success toast
  reports the deletion (F11 (3)). Profile settings are out of v1.
- OAuth runs client-side: the provider returns to `/` and supabase-js
  completes the sign-in in the browser; there is no server code (S21). Sign-up
  is open to anyone, and a new real account starts with its system Nodes only
  (S10).
- If the visitor cancels at the provider or the provider returns an error, the
  current guest session stays, the error parameters are removed from the URL,
  and the account modal opens again with an inline error (a problem inside a
  dialog, F11) (user, 2026-10-22). If the sign-in started from the
  session-expired screen, there is no session to keep: the screen returns
  instead ([Session expiry](#session-expiry)).

### App-level screens

One app-level frame covers the whole window, sidebar included, because the
sidebar's system-Node items and badges need the snapshot too (F19). A screen
that shows an action moves focus to its first action (F19).

| Screen | When | Shows | Actions |
|---|---|---|---|
| Loading | The snapshot is not ready, after 300ms (F02) | Busy state exposed to screen readers | — |
| Load failure | `ensure_account()` or `get_snapshot()` failed (absorbs Phase 35 MI-23) | A reason line | `Retry` |
| Guest creation failure | Anonymous sign-in failed: Turnstile, rate limit, a paused or unreachable project (S26) | A reason line | `Retry`; also retries by itself on reconnect |
| Security check | Turnstile needs an interactive check (S42 (3)) | The Turnstile widget | The widget's own |
| Session expired | The auth server rejected the session refresh (F20, S16) | Real-account or guest variant (S43 (2)) | `Sign in with GitHub`, `Sign in with Google`, `Continue as guest`; before Phase 48 only `Continue as guest` |
| Account being deleted | A function returned `account_deleting` (SCHEMA account-deletion fallback) | That the account is being deleted, that deletion finishes within 24 hours, and that the same account can sign up again afterwards | `Continue as guest` |
| Account deleted | A function returned `account_missing`: the account was deleted from another device or browser (user, 2026-10-22). Tabs of the same browser follow the new guest instead (Several tabs) | That the account was deleted and its data is gone | `Continue as guest` |
| Narrow window | Viewport narrower than 1024px (S42 (4)) | The larger-window notice, laid over the mounted, `inert` app | — |

- The session-expired screen creates no guest account before the visitor
  chooses (F20). `Continue as guest` on it, and on the account-being-deleted
  and account-deleted screens, signs out and starts a new guest.
- The narrow-window notice is the one screen laid over the app instead of
  replacing it; the others replace the app until they are resolved.
- A loading or failure screen never replaces a surface for an ordinary
  in-session request; those use [Write feel](#write-feel) and
  [Connection states](#connection-states).

## Feedback And Network States

### Write feel

Everyday interactions feel as they do today (S09). Writes fall into four groups
(S15):

| Group | Writes | Behavior |
|---|---|---|
| 1. Immediate | Position moves (Grid drag, Calendar reschedule, Chunk order), parent-change moves (a drop on a Node, a breadcrumb drop), field edits (title, description, icon, color, deadline, priority), completion toggles, and creating Nodes, Bits and Chunks | Shown at once through the pending-write layer; on failure rolled back with a failure toast |
| 2. Immediate hide | Trash and archive | The target hides at once and comes back on failure; the cascade is not predicted on the client, since descendants are reached only through the target |
| 3. Server-confirmed | Permanent delete, Empty Trash, restore from Trash or Archive, Bit-to-Node promotion | The control or row that started it shows a loader after `DISPLAY_DELAY_MS` and a busy state; the result appears when the function answers. The loader is the feedback F03 loader (DESIGN_TOKENS §Feedback Status Surfaces, Task 243), one loader app-wide (user, 2026-10-22) |
| 4. Inbox/Triage commands | The SCHEMA atomic commands | Their pending/reconciling UI and reconcile contract, as built (S28) |

- Ordinary writes stay last-write-wins: no expected version (S15).
- A parent-change move picks its cell on the client from the snapshot,
  nearest empty cell first as `findNearestEmptyCell` does today; the server
  refuses a taken cell and the move rolls back (S43 (3)).
- **Unknown outcome.** A request with no answer within `REQUEST_TIMEOUT_MS`
  (15 seconds), or one that ends without an answer, is never resent, because a
  resent write that did commit would increment `version` twice. The client
  refetches the snapshot and keeps or rolls back the change to match the
  server; a rollback shows the failure toast. The Inbox commands keep their own
  reconcile contract (S16, S26). An answer with HTTP status 408, 502, 503 or
  504 counts as no answer, since the request may have reached the database.
  A write that waits behind an earlier write to the same record (for an Inbox
  command the same Scratch; for Empty Trash, the Trash cleanup and account
  preparation the account) and is still unsent `2 × REQUEST_TIMEOUT_MS` after
  it queued is never sent and ends as a failed write, not an unknown outcome
  (user, 2026-10-26; Task 227).
- An Inbox command that would pass an account limit (Breakdown Add, a
  placement result) returns `rejected` with `account_limit`. The Inbox shows it
  as that command's existing rejected state, never as a toast (F11), with the
  reason `This account has reached its limit of {limit} {items}.` owned by
  `src/lib/copy/inbox-triage.ts`.
- The Inbox/Triage status redesign, with its F02 delay, is Phase 50, which
  follows Phase 45 (feedback F33). Phase 47 checks under real server latency the
  Inbox presentation that is on `main` when it runs; Phase 50 checks its own
  presentation on local Supabase with the
  [development state switch](#development-state-switch).

### Connection states

Judged from real request results, not from `navigator.onLine` alone (S27):

| State | Entered when | Shows | Writes |
|---|---|---|---|
| Normal | Requests succeed | Nothing | Allowed |
| Unstable | The browser reports online but a recent request failed or timed out, or a background refetch failed (S26) | `!` badge on the account icon, warning hue | Allowed |
| Offline | The browser reports offline, or three requests in a row failed | Crossed Wi-Fi badge, error hue | Blocked |

- Hover or focus on the account icon shows the state's sentence (F17). The
  badge hues are the F15 warning and error status roles (DESIGN_TOKENS
  §Feedback Status Surfaces, Task 243).
- Each change to unstable or offline is announced once, politely. Recovery
  clears the badge with no visible notice and announces `Back online.` to
  screen readers only (F17).
- While unstable or offline the client checks the server every 30 seconds with
  a lightweight request. On recovery it refetches the snapshot and clears the
  badge (S27).
- **Write attempt while offline** (F18), on every surface, the Inbox included:
  nothing changes on screen, what the user typed stays (an Add field, an editor
  draft), and a warning toast with the crossed Wi-Fi icon appears, grouped by
  kind.
- The snapshot is refetched when a tab becomes visible or focused and after
  reconnecting (S17). A failed background refetch keeps the current view and
  only turns the state to unstable (S26). Realtime is deferred.
- In-flight writes that end without an answer follow the unknown-outcome rule
  above.
- No offline editing in v1: while offline the app is view-only (S16).

### Session expiry

An expired session refreshes automatically. Only a refresh that the auth
server rejects (a missing, invalid or revoked refresh token, or a user that no
longer exists) shows the session-expired screen
([App-level screens](#app-level-screens)). A refresh that fails on the network
is a connection state ([Connection states](#connection-states)) and is retried
after recovery (user, 2026-10-22). The visitor never falls back to a guest
silently, because a silent new guest would show the demo seed in place of
their own Grid and read as data loss (F20, amends S16).

supabase-js clears its stored session when a refresh is rejected, so a reload
would otherwise start a new guest without asking. The client therefore keeps a
small session-expired marker in `localStorage` (whether the lost session was a
guest or a real account; no domain data). It is cleared only when the chosen
action completes: a finished OAuth sign-in or a started guest session. While it
is present, entry shows the session-expired screen instead of creating a
guest, so a cancelled OAuth sign-in returns to that screen (user,
2026-10-22).

### Toasts

- **Position** (F12). The `sonner` Toaster sits at the top-left of the work
  area, right of the sidebar, at the row where the breadcrumb appears. While
  the breadcrumb is shown, the stack sits below it; the stack is rendered
  outside the breadcrumb. Pages without a breadcrumb use the same top-left
  anchor. During a Node or Bit drag the stack turns translucent and lets the
  pointer through, so the top-left cells stay droppable.
- **Colour** (F15). Toasts keep the error red, success green and warning amber
  hues, blended into each theme through the semantic status tokens (DESIGN_TOKENS
  §Feedback Status Surfaces), and the icon also differs by kind (✓, `!`,
  crossed Wi-Fi), so colour is not the only signal. Per-theme blends belong to
  the theme stage.
- **When.** Task 244 (Phase 49) moves and recolours the Toaster in one place
  (S28). Until Task 248 (Phase 50) hides the breadcrumb, the stack sits below
  the fixed breadcrumb on Grid pages.

- **Use** (F11): only for (1) a write that failed and was rolled back; (2) a
  blocked action whose reason is not visible where it happened (a full target
  Grid, a move into a descendant, an account limit); (3) a result out of view
  (Trash restore, permanent delete, Empty Trash, account deletion); (4) a write
  attempt while offline. Never for Inbox item states, visible successes,
  problems inside a dialog (the dialog shows them and keeps the input),
  connection state or recovery, cancels or ordinary drags. A successful write
  adds no new notice; the existing success toasts stay (S09, S28).
- **Bursts** (F13): one toast per kind. A repeat of the same kind while it is
  visible updates its text to the counted form and restarts its time;
  different kinds stack, at most three. There is no separate grouping window.
- **Timing** (F14): success 4 seconds, failure and warning 6 seconds; paused on
  hover, on focus and while the tab is hidden; failures and warnings have a
  close button. Every toast is polite.
- **Form** (F14): what did not happen, then what the screen shows now.
- **Owner:** one shared toast helper (`src/lib/feedback/toast.ts`) owns kinds,
  grouping and timing; every call site uses it. Toast, app-state and blocking
  copy live in `src/lib/copy/feedback.ts`.
- **Existing calls** (F16): of today's 20 `toast(` calls, 17 are kept with
  their copy aligned to this form (below). The Node and Bit create dialogs no
  longer toast (`grid-runtime.tsx`, two sites): when the target Grid has no
  empty cell, the dialog stays open, keeps the typed title and shows the inline
  error below, at every level, L0 included (Task 244).
  `Cell reserved by breadcrumb` (`use-dnd.ts`) goes with the blocked zone (Task
  249).
- **Inline editor offline** (F05, Task 245): an editor save attempted while
  offline shows the offline write-attempt toast instead of the editor's own
  line. Whichever of Tasks 232–233 and Task 245 lands second puts that call on
  the helper and the editor's offline source on the connection monitor.

### Feedback copy

Core English, owned by `src/lib/copy/feedback.ts`. `{title}` is the item's
title; `{target}` the target Node's title; `{count}` the counted number;
`{limit}` and `{items}` the account limit and its item word (`Nodes`, `Bits`,
`steps`, `Breakdown rows`).

**Toasts**

| Kind | Single | Counted |
|---|---|---|
| Rolled-back move | `Couldn't move “{title}”. It's back where it was.` | `Couldn't save {count} changes. They were put back.` |
| Rolled-back edit | `Couldn't save the change to “{title}”. The saved version is back.` | same |
| Rolled-back deadline (kept call, `bit-detail-popup.tsx`) | `Couldn't change the deadline of “{title}”. The previous one is back.` | same |
| Rolled-back deadline extension (kept call) | `Couldn't change the deadlines. The previous ones are back.` | same |
| Rolled-back completion | `Couldn't update “{title}”. It's back as it was.` | same |
| Rolled-back create | `Couldn't create “{title}”. It was removed.` | same |
| Rolled-back trash | `Couldn't move “{title}” to Trash. It's back in place.` | same |
| Rolled-back archive | `Couldn't archive “{title}”. It's back in place.` | same |
| Account limit | `Couldn't create “{title}”. This account has reached its limit of {limit} {items}.` | `Couldn't create {count} items. This account has reached its limit.` |
| Offline write attempt | `You're offline. Changes can't be saved right now.` | `You're offline. {count} changes weren't saved.` |
| Target Grid full (kept, `use-dnd.ts`) | `Couldn't move “{title}”. “{target}” has no empty cell.` | `Couldn't move {count} items. Their target has no empty cell.` |
| Move into descendant (kept, `use-dnd.ts`) | `Couldn't move “{title}” into a Node inside it.` | — |
| Home full on Show on Grid (kept, `sidebar.tsx`) | `Couldn't show “{title}” on Home. Home has no empty cell.` | — |
| Restore succeeded (kept, `trash-group.tsx`, Node and Bit) | `Restored “{title}”.` | `Restored {count} items.` |
| Restore blocked, parent full (kept, Node and Bit) | `Couldn't restore “{title}”. Its Grid has no empty cell.` | — |
| Restore failed (kept, Node and Bit) | `Couldn't restore “{title}”. It's still in Trash.` | — |
| Permanent delete succeeded (kept, Node and Bit) | `Deleted “{title}” permanently.` | `Deleted {count} items permanently.` |
| Permanent delete failed (kept, Node and Bit) | `Couldn't delete “{title}”. It's still in Trash.` | — |
| Empty Trash succeeded (kept, `trash-list.tsx`) | `Trash emptied.` | — |
| Empty Trash failed (kept) | `Couldn't empty Trash. Nothing was deleted.` | — |
| Promotion failed (Bit to Node; user, 2026-10-30) | `Couldn't promote “{title}”. It's still a Bit.` | — |
| Step delete failed (user, 2026-10-30) | `Couldn't delete “{title}”. It's still there.` | — |
| Archive restore failed (Node and Bit; user, 2026-10-30) | `Couldn't restore “{title}”. It's still in Archive.` | — |
| Account deleted | `Your account and its data were deleted.` (fallback: `Your account will be deleted within 24 hours.`) | — |

A counted form reuses the kind's single form when the count is one. The
rolled-back kinds share one kind for grouping, so a burst of different failed
writes shows one counted toast (S28).

**Dialogs and shell** (promotion ②)

| Element | Copy |
|---|---|
| Create dialog, no empty cell (Node or Bit, every level; inline error, typed title kept) | `“{target}” has no empty cell. Move or delete an item to make room.` (`{target}` is the Node whose Grid receives the item: the current Node, the chosen parent for a Bit created from L0, or `Home` for a Node at L0) |
| Create refused by the server inside a dialog, account limit (Node or Bit create dialog, Scratch capture modal; inline error, typed title kept, no toast; user, 2026-10-30) | `This account has reached its limit of {limit} {items}.` |
| Create refused by the server inside a dialog, any other reason (same dialogs and rules) | `Couldn't create “{title}”. Try again.` |
| Node edit dialog, save refused by the server (inline error, typed values kept, no toast; an unknown outcome whose change is kept closes the dialog; user, 2026-10-30) | `Couldn't save the changes to “{title}”. Try again.` (`{title}` is the saved title) |
| Home button (label and tooltip) | `Home` |
| Account icon (accessible name, guest and account alike; no tooltip in the normal state, the connection sentence as tooltip and description while unstable or offline; user, 2026-10-30) | `Account` |
| Tab title | A Node's Grid: `{title} – {app name}`. Inbox, Archive, Calendar (weekly and monthly) and Trash: `Inbox – {app name}`, `Archive – {app name}`, `Calendar – {app name}`, `Trash – {app name}`. L0: `{app name}` alone. `{app name}` is `APP_NAME`: `GridDO` until Task 239 names the product `grid`. Each page sets its title, so client navigation never leaves a stale one (user, 2026-10-22) |

**Connection** (tooltip, and the polite announcement on entering the state)

| State | Sentence |
|---|---|
| Unstable | `Connection is unstable. Changes may take longer to save.` |
| Offline | `You're offline. You can look around, but changes can't be saved.` |
| Recovered (screen readers only) | `Back online.` |

**App-level screens**

| Screen | Title | Reason or body | Actions |
|---|---|---|---|
| Loading | `Loading your grid…` | — | — |
| Load failure | `Couldn't load your grid.` | Unreachable: `The server can't be reached. Check your connection and try again.` Other: `Something went wrong while loading.` | `Retry` |
| Guest creation failure | `Couldn't start a guest session.` | Turnstile: `The security check didn't pass.` Rate limit: `Too many guest sessions were started from this network. Try again later.` Unreachable: as above | `Retry` |
| Security check | `Confirm you're human to continue.` | — | Widget |
| Session expired, real account | `Your sign-in expired.` | `Your saved data is safe. The last change may not have been saved.` | `Sign in with GitHub`, `Sign in with Google`, `Continue as guest` |
| Session expired, guest | `Your guest session ended.` | `Guest data may have been deleted. You can start a new guest session or sign in.` | same |
| Account being deleted | `This account is being deleted.` | `Deletion finishes within 24 hours. After that you can sign up again with the same account.` | `Continue as guest` |
| Account deleted | `This account was deleted.` | `Its data is gone. You can continue as a guest.` | `Continue as guest` |
| Narrow window | `Please use a larger window.` | `grid needs a window at least 1024 pixels wide, such as a desktop browser.` | — |

**Account modal**

| Element | Copy |
|---|---|
| Guest heading | `You're browsing as a guest` |
| Guest retention | `Guest data is deleted 7 days after your last visit.` |
| Guest sign-in note | `Signing in opens a new, empty account. Guest data isn't moved to it.` |
| Sign-in did not complete (inline, in the modal) | `Sign-in didn't complete. You're still browsing as a guest.` |
| Sign-in buttons | `Sign in with GitHub`, `Sign in with Google` |
| Privacy note | `grid keeps your tasks in a Supabase database in Seoul. Signing in with GitHub or Google gives grid your name, email address and profile picture, used only to identify your account. A Cloudflare Turnstile check protects guest sign-in. You can delete your account and all its data at any time.` |
| Account actions | `Sign out`, `Delete account` |
| Delete confirmation | `Delete your account?` / `Your tasks and all other data are deleted permanently. This can't be undone.` / `Delete account`, `Cancel` |

### Development state switch

Feedback F30 (Task 243; Tasks 231 and 233 extend it). A development-only
switch forces each status state in the running app: delayed pending,
reconciling, unknown, not applied, rejected, conflict, integrity and offline,
and from Phase 47 the network states and a write rejection. It works at two
levels: a presentation override for judging a look, and an injection at the
`DataStore` boundary (a development-only wrapper that `getDataStore()` applies
to whichever store it returns) that delays the next calls of a command kind or makes
them return unknown, not applied, rejected or conflict, so the real recovery
paths (`Check again`, `Retry`, `Retry Add`) run end to end without stopping the
shared local Supabase. It lets every state be judged without inserted markup,
since a local command ends in about 50ms and these states do not appear on
their own. It is compiled only into development builds and never ships
enabled.

## Environments And Hosting

- **Two environments** (S21): local (`supabase start`) and production
  (Supabase, Seoul region, free plan). No preview environment; deploys from
  `main` only.
- **Hosting:** Vercel Hobby, with no Next.js server code; auth runs
  client-side.
- **Keys:** the project URL, the publishable key and the Turnstile site key are
  public env vars (`NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`).
  The secret key never enters client code or Git (the repository is public).
  Production OAuth and Turnstile secrets live in the Supabase dashboard. Local
  values live in a git-ignored `.env.local`; `.env.local.example` lists the
  names.
- **Local auth** (amends S20; user, 2026-10-22): anonymous sign-in and
  email/password test users, and from Phase 48 OAuth through development GitHub
  and Google OAuth apps whose client secrets live only in the git-ignored
  `.env.local`, never in Git, since the repository is public. Turnstile runs
  locally with Cloudflare's public test keys. The development OAuth apps and
  test keys are separate from the production ones.
- **Launch smoke:** Phase 48 is verified on local Supabase. The production smoke
  runs right after the Phase 48 merge, before the URL is announced; if it
  fails, the URL stays unannounced and the fix goes through a new phase.
- **Migrations:** `supabase/migrations/` in Git. Before launch, production holds
  no real data and migrations apply there freely after the user's approval
  (S36). From launch on, a phase that changes SQL closes in this order: manual
  dump, migrations applied to production (compatible with the code still
  deployed), then the merge that deploys the new code (S34). The production
  schema changes only through migrations, never in the dashboard.
- **Early production** (S36, D1): production Supabase and the Vercel project are
  set up in Phase 42, unannounced and with no real data. Production sign-in and
  the public launch come in Phase 48.
- **Free plan** (S22): no keep-alive job; the owner's daily use keeps the
  project active, and a paused project is resumed from the dashboard. While it
  is paused the app shows the load-failure or guest-creation-failure screen.
- **Backup** (S35; user, 2026-10-22): a weekly `supabase db dump` of the
  production database runs on the owner's Mac as a scheduled local job and
  keeps the latest 8 dumps in a local folder outside Git; the connection secret
  stays outside Git. The job checks that Docker is running and reports a failed
  run. Phase 48 runs one restore test into local Supabase. The manual dump
  before each production migration stays (S22, S34).
- **Development switch** (S36): the Phase 42 end-to-end slice was a
  development-only page behind `NEXT_PUBLIC_GRIDDO_SUPABASE_SLICE`. Phase 46
  removed the page and the switch. Since Phase 45 the Supabase store is the
  only store the app uses.

---

## Inbox/Triage State Ownership

This lifetime table is normative for the proposed Inbox target. The SCHEMA
[durable/non-durable boundary](SCHEMA.md#durable--non-durable-ownership-boundary)
is authoritative when a state might be mistaken for domain storage.

| Lifetime | Owner and state | End/reset rule |
|----------|-----------------|----------------|
| Durable domain/integrity | Existing Node/Bit/Scratch Breakdown records and approved versions; `StagedCandidate`; archive/consumed lifecycle; the `accounts` row — in Postgres (SCHEMA §Postgres Target) | Repository lifecycle only. Candidate display joins its source; a snapshot miss is never orphan proof. No general operation log, journal, outbox, or offline queue |
| App session (account) | `src/lib/db/snapshot-store.ts`: the account snapshot base and its in-memory pending writes (Decision 19); the Supabase session; `src/lib/db/connection-monitor.ts`: the connection state; the session-expired marker in `localStorage` ([Session expiry](#session-expiry)) | Snapshot and pending writes are dropped on reload and sign-out; the session persists in the browser through supabase-js; the marker lasts until the visitor chooses an action. Never persisted as domain data |
| App session (survives same-session Inbox route leave/re-entry, not reload) | `src/stores/triage-store.ts`: last active selected Scratch, Pool expanded/collapsed and per-Scratch manual-reopen exception, Pool query/result/scroll context, Explorer hierarchy path/open columns and column scroll | Validate against current data on re-entry; full reload/new session applies the fallback below |
| Mounted Inbox page session | Add/Edit base snapshots and drafts; one pending intent; deleting/pending/reconciling presentation and operation IDs; Explorer active/interrupted search, result scroll and reveal; placement/type/Result Title state; remote-arrival counts; external-removal transition; Scratch Trash dialog, pending/result state and this page's own-Trash marker; the new-capture selection request and its one-shot Pool reveal; completion overlay/Cancel/reopen presentation; proposed `use-triage-newly-placed.ts` markers/pinning/Undo/dependencies. The items shared across component trees or Inbox instances (Explorer remote presentation, the external-removal transition, own-Trash markers, the new-capture request and reveal, and the workspace-mounted flag) are held non-persisted in `src/stores/triage-store.ts` | Scratch changes preserve only the states explicitly named in the behavior sections. Inbox route exit clears Explorer search/reveal and Newly Placed/Undo; reload clears all except the Archive recovery identity below |
| Forced-reload recovery identity | SCHEMA `PendingOperationRecovery` in current-tab `sessionStorage`, owned by the Archive operation coordinator | Archive only; written before dispatch, validated on read, cleared after terminal reconcile; no payload, draft, UI cache, mutation queue, or other workflow kind |
| Device-local Inbox preference | Proposed `src/stores/triage-preferences-store.ts`, persisted and validated: Pool created-at sort and Breakdown created-at sort, and from Phase 50 the last selected Scratch id (feedback F27) | Survives route/reload/session; sorts default independently to DESC when missing/invalid; a saved Scratch id that no longer resolves to an active Scratch of this account (deleted, archived, another account) falls back as below; never enters content records or remote data |

Within Inbox/Triage work state, **only Pool sort, Breakdown sort and, from
Phase 50, the last selected Scratch are device-local persisted preferences**. Existing application-wide theme
preference is not converted into Inbox workflow storage.

Full reload/new app session has one deterministic reset contract:

1. select the saved last Scratch if it is still an active Scratch of this
   account (from Phase 50), otherwise the first active Scratch under current
   Pool sort, or `null` if none;
2. start the Pool expanded with no manual-reopen exception;
3. start Grid Explorer at Home with reset column scroll;
4. clear Pool and Explorer current/interrupted queries and results;
5. restore no completion open/Cancel presentation and no unconfirmed placement;
6. restore no Newly Placed marker, pinning, dependency projection, or Undo; and
7. before the initial Inbox projection, reconcile only a valid pending Archive
   descriptor when one exists.

Dark/light, color-theme, or future locale presentation changes are not reset
events. They preserve selected Scratch, Pool/search, drafts/base snapshots,
Explorer path/search/reveal, placement/archive state, operation IDs and pending
flows, and Newly Placed/Undo. They trigger no mutation or navigation and do not
translate user-authored content.

---

## Copy and Localization

Core English Inbox/Triage system copy has one proposed owner:
`src/lib/copy/inbox-triage.ts`. Components consume typed entries for section
identity, actions, validation, lifecycle reasons, statuses, live-region text,
and accessible names instead of adding new distributed string literals. This
module is a target absent from current production, not a claim of an existing
file. It resolves `Q-NAME-04` and is included in File Organization and Key File
Paths.

The core owner does not choose exact wording where a `VQ-*` prerequisite below
reserves it for the user. It may define keys and approved semantic roles while
the dependent value remains blocked. User-authored Scratch/row text and drafts
are never resource strings and are never translated.

Toast, app-state and blocking copy has one owner, `src/lib/copy/feedback.ts`
(feedback F14; contents in [Feedback copy](#feedback-copy)). Whichever lane
writes it first creates it under this name. Inbox item status copy stays in
`src/lib/copy/inbox-triage.ts`.

Shared locale state/provider, EN/KR resources and toggle, localized date/time,
Korean accessibility/status copy, and Korean theme typography/text-fit QA are
deferred. They must use shared state rather than duplicate routes or reload the
page, and a future locale switch must obey the presentation-preservation
contract above. Cross-surface wrapping, line-count, expansion, and IME visual
detail remain with the separately deferred text-capacity topic.

---

## Inbox/Triage Visual Decision Prerequisites

The selected behavior and lifecycle above remain required. Source absence
does not delete them and does not let SPEC turn behavior prose into a design.
No entry below authorizes layout, appearance, exact copy, iconography,
animation, timing, placement, or per-theme treatment beyond the selected
decision and approved recipe evidence.

### Absent replacement surfaces

Each row is labeled **Decision prerequisite — no automatic fallback**. Its
entry point, controls/state transitions, authority, focus, accessibility, and
lifecycle may be implemented only after the named user decision has a matching
receipt. A nearby Dialog/AlertDialog, editor, global/active-column search body,
card, create form, or surrounding theme chrome is not a fallback.

| ID | Authorized behavior boundary | Required focus/accessibility boundary | Status |
|----|------------------------------|---------------------------------------|--------|
| `VQ-01` | External archive/delete of selected Scratch enters the five-second move/pause/resume/no-Cancel transition, revalidates visible destination, supports source-separated full-draft copy, and cancels only on authoritative archive restore | Announce lifecycle/timing once, not each tick; pause is a stable initial action; copy status preserves focus; stale work stays locked | **Decision prerequisite — no automatic fallback**: user owns replacement surface, wording, layout, appearance, icons, timing treatment, and theme realization |
| `VQ-03` | Scratch/route departure with a non-empty Add draft offers continue-writing or discard-and-move after any required inline Save; it neither auto-Adds nor queues intents | Continue returns logical focus to Add; discard performs the original action once; native unload remains browser-exit only | **Decision prerequisite — no automatic fallback**: user owns app-internal confirmation realization and copy |
| `VQ-04` | Scratch-title and row-content editors remain inline in their source surfaces across validation, saving, offline, retry, conflict/use-mine/use-latest, lifecycle invalidation, draft review/copy, Save, Cancel, Escape, and valid blur | Preserve editor/draft and logical focus through nonterminal states; never open generic/global conflict UI or steal IME focus; invalid source uses deterministic next-row/Add fallback | **Decision prerequisite — no automatic fallback**: user owns the complete inline replacement surfaces and content realization |
| `VQ-07` | Opening dedicated full-hierarchy Explorer search replaces only the Explorer body; it owns pre-search/results/loading/stale/error/duplicates/reveal/Undo feedback and DnD interruption, while global search stays separate | Input/results support arrows, Enter, Escape; removed focused result and `Try again` return focus to input; selection rebuilds path inside Inbox; result rows are not DnD sources | **Decision prerequisite — no automatic fallback**: user owns the complete replacement search body; active-column/global search and ordinary columns are prohibited substitutes |
| `VQ-09` | Over-limit staged placement uses Result Title before confirmation; direct length gates expose allowed/unavailable type reasons and Cancel with no direct editor or truncation | Result Title starts at its input; unavailable types expose accessible reason; Cancel returns to source | **Decision prerequisite — no automatic fallback**: user owns Result Title and direct-limit surfaces; create dialogs and generic placement UI are prohibited substitutes |

### Existing-surface state gaps

These gaps may use only the approved shared semantic-state envelope: state
attributes, existing semantic/theme tokens, visible text or icon/non-color
cues, and the selected focus/accessibility contract. Exact effect, duration,
wording, placement, layout, and per-theme values remain named user-owned
Decision prerequisites before the dependent UI task.

| ID | Trigger and semantic states | Allowed action/focus/accessibility contract | Remaining Decision prerequisite |
|----|-----------------------------|---------------------------------------------|---------------------------------|
| `VQ-02` | Authoritative Add or Unstage success produces one non-repeating success state; reduced motion replaces movement/sparkle with static distinction. From Phase 50 retired by feedback F01: success shows nothing on screen | Add keeps input focus; Unstage restores source focus; both announce politely without focus theft (kept, F04) | Retired with `DP-VQ02` (promotion ②) |
| `VQ-05` | Add pending/failure/reconcile and Delete in-place deleting/failure/check-again remain distinct; success is shown only after authority | Pending locks only conflicting actions; draft/row remains; Delete success/failure/check-again uses the deterministic focus rules in Breakdown | Exact state treatment, copy, action placement, timing, and per-theme realization |
| `VQ-06` | Pool hidden-selection; Staging pending/invalid/remote-arrival/orphan (removed in the Postgres target, S18)/stale/failure; and Explorer remote/path states retain their distinct triggers and allowed actions | Never steal focus for remote/status arrival; use polite live status or alert semantics as selected; vanished source/path uses named safe focus fallback | Exact treatments, wording, indicator/alert placement, duration/dismissal appearance, and per-theme realization for each family |
| `VQ-08` | Placement pending, explicit failure, unknown/reconciling, stale source/target, authoritative success, and Retry/Cancel states preserve the same operation/source/affordance | Contain focus in the active step; failure focuses Retry, stale/validation retains current-step focus, success focuses actual card | Exact status effect, copy, control placement, layout, timing, and per-theme realization |
| `VQ-10` | Selected+newly overlap, Undo available/ineligible/dependency-reenabled, undoing, failure, retry, and conflict remain separate from marker provenance | Accessible non-color reason is available without hover; pending keeps card; post-Undo Grid/search focus and restoration announcement follow the named rules; repeated motion is forbidden | Exact marker/overlap/control/reason/status treatment, copy, placement, timing, and per-theme realization |
| `VQ-11` | Non-empty Add draft or title-editor lifecycle blocks completion presentation; eligibility loss withdraws overlay/complete/reopen and reports why | Blocker keeps draft/editor and logical focus; no auto-submit/save; restored work remains reachable | Exact blocker/withdrawal copy, effect, placement, layout, and per-theme realization |
| `VQ-12` | Archive pending, explicit failure, unknown/reconciling, forced-reload recovery, check-again, Retry/Cancel, and authoritative success are distinct variants of the selected Breakdown-scoped flow | Pending/recovery keeps a stable focus target in the section; failure focuses Retry; success focuses the verified visible-order destination | Exact treatment, wording, control/status placement, layout, timing, and per-theme realization |

From Phase 50 the realizations of `VQ-05`, the Staging part of `VQ-06` and
`VQ-10` follow [Item status presentation](#item-status-presentation) (feedback
F06–F09), and the realization of `VQ-04`'s transient states follows its editor
states (F05); their looks are `DP-FB-01`. Their triggers, actions and focus
rules above are unchanged.

### Preserved deferrals and exclusions

- No prototype mock mutation, route duplication, review control, internal staged
  handle, Scratch-switch marker reset, or local completion latch is promoted.
- No repeated pulse/blink/flicker, keyboard placement, hidden placement command,
  BitCard redesign, Korean UI, Neumorphism water-lens polish, cross-surface
  text/IME design is included; the toast changes are those in [Toasts](#toasts).
- Common BitCard redesign and later Staging/placed-card reuse remain
  deferred; current cards are only the core actual-record foundation.
- All approved recipe evidence remains source-only. SPEC claims no rendered
  verification, screenshot, contrast, depth, clipping, motion, responsive, or
  per-theme outcome.

---

## Responsive Breakpoints

> GridDO is **web-first, desktop-focused** for v1. Responsive design is deferred (see PRD Section 26). Tailwind default breakpoints are configured but not actively designed for. Minimum supported width: 1024px.

| Token | Width | Behavior |
|-------|-------|----------|
| `sm` | 640px | Not targeted for v1 |
| `md` | 768px | Not targeted for v1 |
| `lg` | 1024px | Minimum supported width. Full grid visible. Sidebar open by default. Below it the narrow-window notice covers the mounted app and no guest is created (S42 (4), Phase 48); hover-only affordances (tooltips, the breadcrumb reveal) are desktop features |
| `xl` | 1280px | Comfortable grid spacing. Default development target |
| `2xl` | 1536px | Extra grid spacing, larger day columns in Calendar |

---

## Key File Paths

Infrastructure files that don't follow the File Organization Conventions above.

| Path | Purpose |
|------|---------|
| `src/app/globals.css` | CSS custom properties, Tailwind v4 `@theme` bridge, dark mode variant — single source of truth for all design tokens |
| `src/app/layout.tsx` | Root layout — font variables, color-theme no-flash init script (from Task 241 built from the one shared theme id list), ThemeProvider/DataStore provider shell |
| `src/app/(grid)/layout.tsx` | Route-group layout — renders GridRuntime for all grid pages |
| `src/app/providers.tsx` | Client-side providers wrapper — ThemeProvider, ColorThemeProvider and, from Phase 45, the app frame around the app and its overlays. Zustand stores require no provider. |
| `src/components/layout/grid-runtime.tsx` | Client wrapper: route state, sidebar, breadcrumb, shared DnD boundary, add-flow orchestration |
| `src/components/layout/add-flow-context.tsx` | Minimal React context — pages call `useAddFlow().openAddAtCell(x, y)` to trigger add-flow |
| `src/components/layout/color-theme-provider.tsx` | Applies the persisted color theme to `<html data-color-theme="...">` |
| `src/components/layout/color-theme-toggle.tsx` | Color theme picker — the color themes (four from Task 241), swatches, selected check |
| `src/components/calendar/calendar-view-header.tsx` | Shared Calendar weekly/monthly header — title/subtitle, view switch, previous/today/next controls |
| `src/lib/db/datastore.ts` | `DataStore` interface — the abstraction boundary between app code and storage |
| `src/lib/db/supabase-client.ts` *(Phase 42)* | Browser Supabase client: project URL, publishable key, session persistence |
| `src/lib/db/database.types.ts` *(Phase 42, generated)* | `supabase gen types typescript` output; types the row converter (S33) |
| `src/lib/db/row-mapping.ts` *(Phase 42)* | snake_case database rows ↔ camelCase TypeScript types, at the snapshot loader and the function-result boundary only (S11) |
| `src/lib/db/snapshot-store.ts` *(Phase 42)* | Account snapshot: base, pending-write layer, envelope application, refetch, subscriptions (Decision 19) |
| `src/lib/db/supabase-calls.ts` *(Phase 42)* | One typed wrapper per database function the snapshot store calls (`get_snapshot`, `ensure_account`, `update_node`; later tasks add theirs), and the reserved breadcrumb cells passed until Task 249 |
| `src/lib/db/boundary-cases.ts` *(Phase 42)* | One table of boundary values per field rule, run against the Zod schemas and the database CHECKs so both give the same verdict (S12, S33) |
| `src/lib/db/supabase-store.ts` *(Phase 45)* | `DataStore` implementation: reads over the snapshot, one RPC per write |
| `src/lib/db/supabase-command-calls.ts` *(Phase 45)* | Typed arguments of the Inbox/Triage command and reconcile functions, beside `supabase-calls.ts` for the ordinary writes |
| `src/lib/db/command-schemas.ts` *(Phase 45)* | Zod schemas of the Inbox/Triage commands and their results, shared by both stores at the client write boundary |
| `src/lib/db/write-errors.ts` *(Phase 45)* | The write errors callers catch: `DeadlineConflictError`, `WriteRejectedError` (a `rejected` envelope) and `WriteOutcomeUnknownError` (no answer) |
| `src/lib/db/read-helpers.ts` *(Phase 45)* | Read ordering shared by both stores (Grid position, Chunk order, Node title path) |
| `src/lib/db/placement-undo-verdict.ts` *(Phase 45)* | Pure Undo verdict of a placement from account rows; `DataStore.getPlacementUndoTruth()` uses it over the snapshot with no request, so Undo availability never calls a reconcile function, which runs only after an unknown outcome |
| `src/lib/db/connection-monitor.ts` *(Phase 47)* | Connection state from request results: normal, unstable, offline; recovery probe |
| `src/lib/db/connection.ts` *(Phase 47)* | The app's one connection monitor, the `/auth/v1/health` probe, the session controller's refetch binding and `useConnectionState()` for components |
| `src/lib/db/write-failure.ts` *(Phase 47)* | What the store reports once about a rolled-back ordinary write, and `dropReportedFailure` for callers that have nothing to add |
| `src/lib/auth/session.ts` *(Phase 45)* | Guest entry (anonymous sign-in, later Turnstile), OAuth, sign-out, refresh-failure detection, `ensure_account()` call |
| `src/components/layout/app-frame.tsx` *(Phase 45)* | The app-level frame: loading, failure, session-expired, account-being-deleted, security-check and narrow-window screens |
| `src/components/layout/account-button.tsx` *(Phase 47)*, `account-modal.tsx` *(Phase 48)* | Sidebar account icon with the connection badge; the guest and account modal |
| `src/lib/feedback/toast.ts` *(Phase 47)* | Shared toast helper: kinds, counted bursts, timing (F13, F14) |
| `src/lib/feedback/write-failure-toast.ts`, `create-refusal.ts`, `offline-write.ts` *(Phase 47)* | The rolled-back write toast; a create or edit dialog's inline refusal line; the offline write-attempt toast and `blockedWhileOffline()` for write entries outside `send()` (F18) |
| `src/hooks/use-pending-action.ts`, `src/components/feedback/pending-loader.tsx` *(Phase 47)* | Group 3 controls: busy at once, a second press ignored, the F03 loader after `DISPLAY_DELAY_MS` |
| `src/lib/auth/use-session-variant.ts` *(Phase 47)* | `guest` or `account` for the account icon, from the session |
| `src/components/feedback/status-icon.tsx` *(Phase 49)* | Status icons and item emphasis: the delayed loader, `?`, `!` (F02, F03) |
| `src/components/feedback/status-tooltip.tsx` *(Phase 49)* | Hover/focus status tooltip, one at a time, described-by wiring (F09) |
| `src/components/feedback/status-announcement.tsx` *(Phase 49)* | Visually hidden polite status region and its hook for the success announcements: `Added.`, `Returned to Breakdown.`, `Saved.` (F04) |
| `src/hooks/use-display-delay.ts` *(Phase 49)* | Presentation-only `DISPLAY_DELAY_MS` delay; never decides success (F02) |
| `src/lib/feedback/item-status.ts` *(Phase 49)* | Item status and glyph vocabulary: which glyph a status shows, and that only `?` and `!` add emphasis (F02, F03) |
| `src/lib/feedback/forced-item-status.ts` *(Phase 49)* | Production-safe read seam of the [development state switch](#development-state-switch): `useForcedItemStatus(itemKey)` returns `null` unless the development panel registered, and the item key scheme the panel and the Inbox surfaces share (F30) |
| `src/lib/color-themes.ts` *(Phase 49)* | The one non-client list of color theme ids, the default and the storage key, read by the store and the no-flash script (F28, ISSUE-20-01) |
| `src/hooks/use-toast-anchor.ts` *(Phase 49)* | The toast stack's offset from the breadcrumb and its drag translucency (F12) |
| `src/stores/toast-anchor-store.ts` *(Phase 49)* | The bottom of the shown breadcrumb and whether a Grid drag is active, written by `grid-runtime.tsx` and read by `use-toast-anchor.ts`; reset when the Grid layout unmounts (F12) |
| `src/components/feedback/app-toaster.tsx` *(Phase 49)* | The app's one `sonner` Toaster: top-left anchor, at most three visible, status-token kinds, a close control on warnings and failures (F12, F15) |
| `src/components/feedback/toast-icons.tsx` *(Phase 49)* | The Toaster's ✓, `!` and `×` icons, and `offlineToastIcon` (Lucide `wifi-off`), which the offline write-attempt warning passes as its `icon` so Task 232's helper reuses it (F15, F18) |
| `src/lib/dev/state-switch.ts`, `src/components/dev/state-switch-panel.tsx` *(Phase 49, development only)* | [Development state switch](#development-state-switch) (F30) |
| `src/components/layout/home-button.tsx`, `src/hooks/use-breadcrumb-reveal.ts` *(Phase 50)* | Sidebar Home button and the breadcrumb reveal state: triggers, hiding, `Esc`, drag (F21–F25) |
| `src/lib/copy/feedback.ts` *(Phase 49)* | Toast, app-state and blocking copy (F14); Task 244 creates it with the create-dialog sentence |
| `supabase/config.toml`, `supabase/migrations/`, `supabase/tests/` *(Phase 42)* | Local Supabase configuration, migrations in Git, `pnpm test:db` suites |
| `supabase/seed.sql`, `scripts/dev-fixtures/` *(Phase 45, local only)* | `dev.seed_fixture()` and the browser-check fixture that signs in as a local `@griddo.test` user and seeds through it; usage in each script header |
| `vitest.db.config.ts` *(Phase 42)* | Vitest configuration for `pnpm test:db` (local Supabase), kept apart from `pnpm test` |
| `scripts/verify/` *(Phase 42)* | Hosted Supabase checks run locally with `--local` and then on production: the write-role proof, `pg_cron`, the API surface and the D8 measurement; production values live outside Git (README) |
| `.env.local.example` *(Phase 42)* | Names of the public env vars; values live in git-ignored `.env.local` |
| `scripts/backup/` *(Phase 48)* | The weekly `supabase db dump` job and its scheduler file, with no secret |
| `src/lib/db/schema.ts` | Zod validation schemas and TypeScript types (from SCHEMA.md) |
| `src/lib/copy/inbox-triage.ts` *(proposed; absent today)* | `InboxTriageCopy` core-English resource keys/values for visible copy, statuses, reasons, live regions, and accessible names; exact `VQ-*`-reserved wording stays blocked |
| `src/lib/constants.ts` | Grid dimensions (18×9), aging thresholds (5/11 days), urgency thresholds (3/2/1 days), trash retention (30 days); `DISPLAY_DELAY_MS` (300, from Task 243), and from the SaaS phases `REQUEST_TIMEOUT_MS` (15000) and the 30-second connection probe interval |
| `src/lib/utils/bfs.ts` | BFS auto-placement algorithm — finds nearest empty cell from a starting position |
| `src/lib/utils/aging.ts` | Aging state computation — Fresh/Stagnant/Neglected from mtime |
| `src/lib/utils/urgency.ts` | Deadline urgency level computation — Level 1/2/3/Past from deadline |
| `src/lib/utils/completion.ts` | Node completion check — are all child Bits complete? |
| `src/lib/utils/color.ts` | Shared `hexToHsl` utility (extracted from shell components) |
| `src/stores/edit-mode-store.ts` | Edit mode toggle, jiggle state |
| `src/stores/search-store.ts` | Search query, open/closed state |
| `src/stores/calendar-store.ts` | Calendar drill-down navigation, pool state |
| `src/stores/color-theme-store.ts` | Color theme id, validation, and persistence (`griddo-color-theme`) |
| `src/stores/triage-store.ts` | Present: selection/Pool UI plus obsolete UI candidates. Proposed: app-session selection, Pool/query/scroll, and Explorer path/column state only, plus the shared mounted-page state named in the lifetime table; no durable candidates or Newly Placed records |
| `src/stores/triage-preferences-store.ts` *(proposed; absent today)* | Validated device-local persistence for Pool sort and Breakdown sort, and from Phase 50 the last selected Scratch (F27) |
| `src/lib/animations/grid.ts` | Grid animation variants — jiggle, sinking, creation/deletion, depth transitions |
| `src/lib/animations/calendar.ts` | Calendar animation variants — vignette expand, magnet snap |
| `src/lib/grid-dnd.ts` | Grid DnD utilities — `gridCollisionDetection` (prioritizes node-drop over cell) |
| `src/lib/utils/grid-explorer-search.ts` *(proposed; absent today)* | Pure Inbox Grid Explorer hierarchy traversal, exclusions, AND-token matching, relevance, duplicate disambiguation inputs, and stable result ordering; never global `searchAll()` |
| `src/lib/constants/color-palette.ts` | Curated 10-color palette for node creation randomization |
| `src/hooks/use-grid-data.ts` | Reactive hook — subscribes to Nodes + Bits for a given parentId (reads the account snapshot) |
| `src/hooks/use-bit-detail.ts` | Bit detail popup state — reads `?bit` param, fetches Bit + Chunks |
| `src/hooks/use-search.ts` | Search state — query string, filtered results across all stores |
| `src/hooks/use-calendar-data.ts` | Calendar data — all items with deadlines, pool items, drill-down state |
| `src/hooks/use-dnd.ts` | Current shared DnD plus combined triage placement/sequential writes. Proposed triage role: Mouse/Touch sensors, drag snapshot, release-time drop intent, and feedback coordination only; general Grid/Calendar behavior stays separate |
| `src/hooks/use-staged-candidates.ts` | Reactive `StagedCandidate` query and authoritative Breakdown-source join plus Stage and Unstage command dispatch/reconciliation (the confirmed-orphan dispatch was removed in Phase 46); pending UI is a projection, and unresolved source miss is never a card/orphan proof |
| `src/hooks/use-grid-explorer-search.ts` *(proposed; absent today)* | Inbox-only full-hierarchy search subscription/request identity, cancellation, loading/error/stale result lifecycle |
| `src/components/triage/grid-explorer-search-results.tsx` *(proposed; absent today)* | Dedicated Explorer search-mode result body; presentation only, with no global Search Overlay reuse |
| `src/hooks/use-triage-placement.ts` *(proposed; absent today)* | `Q-NAME-03` placement state machine: direct type, staged Result Title, target confirmation, pending/reconcile/failure, navigation locks, and atomic command dispatch |
| `src/hooks/use-triage-newly-placed.ts` *(proposed; absent today)* | Mounted-page actual-card marker/pinning, operation provenance, dependency-aware Undo availability, and deterministic restoration projection |
| `src/hooks/use-archive-scratch.ts` | Present: direct `archiveBit` call. Proposed: Archive operation coordinator for page-local blocker recheck, fail-closed `PendingOperationRecovery` descriptor storage, atomic command dispatch, reload reconciliation, and terminal focus/selection handoff |
| `src/components/triage/triage-workspace.tsx` | Current four-area/DnD composition. Proposed coordinator for owners and interruption locks only; never candidate or repository persistence |
| `src/components/triage/hierarchy-explorer.tsx` | Current component-local path/active-column search. Proposed coordinator for shared path/columns, dedicated search mode, reveal, scroll anchoring, target columns, and actual-card projection |
| `components.json` | shadcn/ui configuration — component output path, Tailwind CSS variables, icon library |
| `tsconfig.json` | TypeScript config — `@` path alias mapping to `src/` |

---

## Phase 9 PRD Departures

Intentional departures from the PRD introduced in Phase 9. Each is a deliberate design decision, not an omission.

| # | PRD Rule | Phase 9 Change | Reason |
|---|----------|----------------|--------|
| 1 | Sidebar is foldable; when folded, no icon strip (Section 16) | Permanent narrow icon rail (`w-12`), always visible, no fold/unfold | Reduces cognitive overhead; all functions always one click away |
| 2 | Drag-to-reposition and drag-onto-Node are edit-mode-only (Sections 17, 20) | Grid DnD, breadcrumb ancestor drops included, enabled outside edit mode (corrected 2026-10-22: the Phase 9 code, `16ee48f`, removed the breadcrumb gate on purpose; the earlier "edit-mode-only" wording was never implemented) | Repositioning is a frequent action; gating behind edit mode adds friction |
| 3 | Deeper levels apply vignette effect (Section 5) | Vignette removed; background color changes per level instead (`--grid-bg-l0` through `--grid-bg-l3`) | Background color is a stronger, more immediate depth signal |
| 4 | Trash icon available on Level 0 only (Section 19) | Trash icon visible on all levels | Sidebar is identical across all levels for consistency |
