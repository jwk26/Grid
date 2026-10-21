# GridDO - Product Requirements Document

## Table of Contents

- [1. Overview](#1-overview)
- [2. Target Users](#2-target-users)
- [3. Core Concepts](#3-core-concepts)
- [4. Data Schemas](#4-data-schemas)
- [5. Grid System](#5-grid-system)
- [6. Node](#6-node)
- [7. Bit](#7-bit)
- [8. Chunk](#8-chunk)
- [9. Bit Detail Component](#9-bit-detail-component)
- [10. Aging System](#10-aging-system)
- [11. Deadline Urgency System](#11-deadline-urgency-system)
- [12. Badge System](#12-badge-system)
- [13. Completion Flow](#13-completion-flow)
- [14. Calendar Mode](#14-calendar-mode)
- [15. Navigation & Breadcrumbs](#15-navigation--breadcrumbs)
- [16. Left Sidebar](#16-left-sidebar)
- [17. Edit Mode](#17-edit-mode)
- [18. Search](#18-search)
- [19. Trash Zone](#19-trash-zone)
- [20. Move System](#20-move-system)
- [21. Bit-to-Node Promotion](#21-bit-to-node-promotion)
- [22. Color System](#22-color-system)
- [23. Multi-View Consistency](#23-multi-view-consistency)
- [24. Onboarding](#24-onboarding)
- [25. Design Direction](#25-design-direction)
- [26. Deferred Features](#26-deferred-features)

---

## 1. Overview

GridDO is a task management tool that visualizes **Bits** (action units), **Chunks** (task steps), and **Todos** by placing **Nodes** (categories/containers) on a **2D Grid**.

It transforms tasks traditionally written as text into a visual management system. Nodes can be nested within other Nodes to categorize tasks and manage them step-by-step, arranged on the screen like applications on Android or iOS.

The system provides a sense of "exploring an ocean of information" as clicking a high-level Node opens it as a brand-new grid at the next level.

**Platform:** Web-first. Responsive design and mobile adaptation are future considerations.

### Storage Strategy

> **Superseded (2026-10-22).** GridDO became a SaaS: Supabase Postgres is the
> per-account source of truth and auth gates access, with an automatic guest
> account for visitors (SaaS conversion S01–S04, S10, S23). Local IndexedDB
> data is discarded; export, import and migration are out of scope. Current
> authority: `SPEC.md` Architecture Decisions 1, 19–21 and
> §Environments And Hosting, and `SCHEMA.md` §Postgres Target. The text below
> is kept as history.

**v1: Local-first (IndexedDB).** No server, no database, no auth. User data lives entirely in the browser.

**Rationale:**
- **Zero infrastructure cost** — no hosting, no DB bills, no maintenance.
- **Instant response** — no network latency for every drag, reorder, or completion toggle. GridDO is interaction-heavy (grid dragging, timeline reordering, calendar scheduling). Local reads/writes feel native.
- **Simpler architecture** — no API routes, no server actions for CRUD, no connection pooling.
- **Faster to ship** — skip auth, migrations, RLS, and network error handling.
- **Privacy** — user data never leaves their browser.

**Known risks:**
- **Data loss** — browser storage can be cleared. Users lose everything.
- **No cross-device** — can't use GridDO on phone + laptop.

**Planned progression:**
1. **v1:** IndexedDB only — ship fast, validate the product.
2. **v1.5:** Export/Import — JSON backup/restore as a safety net (cheap to build).
3. **v2:** Optional cloud sync — add Supabase/Firebase behind the same data layer. Auth only exists to identify whose data to sync, not to gate access.

**Critical architecture constraint:** The data access layer must be designed as an **interface abstraction** (e.g., a `DataStore` interface). v1 implements it with IndexedDB. v2 swaps in or layers a cloud provider behind the same interface. Do not hardcode IndexedDB calls throughout the codebase — migration to cloud sync later must not require a rewrite.

## 2. Target Users

- People who feel overwhelmed and don't know where or how to start when tasks arise.
- Those who fall into a cycle of endless procrastination because they fear checking a long, ever-growing list of tasks.

## 3. Core Concepts

GridDO uses a **three-tier hierarchy** for organizing work:

### Node (Highest Level)

- A **category or container**. Visually a square, following a mobile application icon design.
- Titles should use **nouns** (e.g., "Workout", "Finance", "React Native").
- Can contain child Nodes and Bits.

### Bit (Mid Level)

- An **actionable task**. Visually a horizontally long rectangle.
- Titles should use **verbs or short sentences** (e.g., "Check pull requests for Q3", "Brainstorm new project ideas").
- Contains Chunks (ordered task steps).

### Chunk (Lowest Level)

- The **smallest unit of work**. Individual steps within a Bit.
- Displayed in a vertical timeline inside the Bit detail popup.
- Example: A Bit titled "Check pull requests for Q3 JS projects" might contain Chunks like:
  1. "Ask Jimmy for team-level git account access"
  2. "Checkout git branch following the conventions document"
  3. "Review and approve open PRs"

### Hierarchy Depth

Maximum **4 levels** (Level 0 through Level 3). Level 3 is the deepest and allows **Bits only** (no new Nodes). This enforces a design philosophy of decomposing tasks into actionable Bits rather than creating infinite folder hierarchies.

## 4. Data Schemas

### Node Schema

| Field        | Type     | Required | Notes                                                           |
| ------------ | -------- | -------- | --------------------------------------------------------------- |
| title        | string   | Yes      | Nouns preferred                                                 |
| description  | string   | No       | Displayed below breadcrumb inside the Node's grid               |
| color        | string   | Yes      | Icon/accent color. Propagates to child Bits at low saturation   |
| icon         | string   | Yes      | User-selected from icon library                                 |
| deadline     | datetime | No       | Can be set by dragging to Calendar. "On a day" option available |
| mtime        | datetime | Auto     | Modified time. Drives aging system                              |
| created_time | datetime | Auto     | Creation timestamp                                              |
| parentId     | string   | Auto     | References parent Node. Null for Level 0 Nodes                  |
| x            | integer  | Auto     | Column index on grid                                            |
| y            | integer  | Auto     | Row index on grid                                               |

> **Note:** Node completion state is **purely computed** at render time (derived from whether all child Bits are complete). It is NOT stored as a schema field. No `status` or `completionState` column exists on Nodes.

### Bit Schema

| Field        | Type     | Required | Notes                                                 |
| ------------ | -------- | -------- | ----------------------------------------------------- |
| title        | string   | Yes      | Verbs/short sentences preferred                       |
| description  | string   | No       | Displayed in Bit detail popup                         |
| icon         | string   | Yes      | User-selected                                         |
| deadline     | datetime | No       | Date + optional time. "On a day" option for date-only |
| priority     | enum     | No       | `high` (red), `mid` (yellow), `low` (blue)            |
| chunks       | Chunk[]  | No       | Zero or more. Progress bar hidden when empty          |
| mtime        | datetime | Auto     | Modified time                                         |
| created_time | datetime | Auto     | Creation timestamp                                    |
| parentId     | string   | Auto     | References parent Node                                |
| x            | integer  | Auto     | Column index on grid                                  |
| y            | integer  | Auto     | Row index on grid                                     |

### Chunk Schema

| Field       | Type     | Required | Notes                                                                  |
| ----------- | -------- | -------- | ---------------------------------------------------------------------- |
| title       | string   | Yes      | Short, actionable step description                                     |
| description | string   | No       | Additional context for the step                                        |
| time        | datetime | No       | Optional. For timeline scheduling. Cannot exceed parent Bit's deadline |
| status      | enum     | Auto     | `complete` or `incomplete`                                             |
| order       | integer  | Auto     | User-defined sequence position in Bit timeline                         |
| parentId    | string   | Auto     | References parent Bit                                                  |

Chunks do **not** have `mtime` or `created_time`. Aging is tracked at the Bit level through Chunk activity.

## 5. Grid System

### Grid Structure

- **Cell-based** positioning. Coordinates (`x`, `y`) are column/row indices, not pixel values.
- **Default size:** 12 columns x 8 rows. This is a **hard cap** — the grid cannot grow beyond these dimensions. Scrolling is viewport-level only (the fixed 12x8 grid may extend beyond the visible screen area, but no new cells are created).
  > **Amendment (Phase 9):** Grid dimensions changed from 12×8 → 15×8 → 18×9 during Phase 9 visual tuning. 18×9 was selected for optimal density across FHD/QHD/UHD desktop resolutions. The hard cap policy remains — 18 columns × 9 rows. See `docs/SPEC.md` and `docs/DESIGN_TOKENS.md` for current authoritative values.
- **No auto-expansion.** A full grid signals the user to reorganize (promote Bits to Nodes, move items, or restructure). If no empty cell exists, the user is prompted to reorganize. This reinforces the app's philosophy of structured decomposition.
- **Uniform sizing** across all levels to reduce complexity.

### Level Behaviors

| Level | Allowed Content | Layout                              | Notes                                    |
| ----- | --------------- | ----------------------------------- | ---------------------------------------- |
| 0     | Nodes only      | Full grid, no split                 | Homepage. Trashbin icon in sidebar.      |
| 1-2   | Nodes + Bits    | 2-way split: Nodes left, Bits right | Soft guide, not visually enforced.       |
| 3     | Bits only       | Full-width, no split                | Deepest level. No Node creation allowed. |

### 2-Way Split (Level 1-2)

Level 1 and 2 grids are conceptually divided into a **left zone** (Nodes) and **right zone** (Bits). A software-based virtual dividing line exists in the center. This is a **soft guide** — users retain freedom to place items anywhere. The pattern is taught through onboarding (see [Section 24](#24-onboarding)).

Approximate column allocation: 5-6 columns for Nodes (left), 6-7 columns for Bits (right).

### Depth Visual Effects

As grid levels go deeper, visual cues provide spatial awareness:

- **Grid Pattern Scaling:** Deeper levels have thinner grid lines with increased density, creating a sense of "entering deep."
- **Vignette Effect:** Deeper levels apply a faint inner shadow (darkness) at screen edges, focusing attention on central content. Applied in both Dark and Light modes.

### Auto-Placement

When a new item is created, it auto-places in the **nearest empty cell** using BFS (Breadth-First Search) from a context-aware starting position:

- **Creating a Node:** BFS starts from the **top-left** of the grid.
- **Creating a Bit:** BFS starts from the **top-right** of the grid.

This respects the 2-way split naturally. If no empty cell is found, the user is prompted to reorganize.

## 6. Node

### Visual Design

- Follows a **mobile application icon** design (square with icon and label).
- No design difference between levels; all Nodes use the same component.
- **No-border design.** Color is expressed through the icon and accent elements.

### Node Description

When entering a Node's grid, the description appears as a **subtitle line below the breadcrumb** at the top of the grid. Provides orientation context (e.g., "Q3 priorities and active projects"). Compact, 1-2 lines with expand option.

### Node Completion

- **Level 1-2 Nodes:** Auto-reflect completion with a visual indicator when all internal Bits are done. Passive — the user does not need to manually complete a Node.
- **Level 0 Nodes:** Never complete. They represent permanent life/work domains (Work, Personal, Finance, etc.).

### Node Deadline

Nodes optionally have deadlines. A Node's deadline represents a target date for the category. Can be set by dragging the Node to a Calendar day column. The same deadline urgency rules apply as for Bits (see [Section 11](#11-deadline-urgency-system)).

## 7. Bit

### Visual Design

A **horizontally long rectangle** displaying:

- Title
- Deadline (date + optional time, or "on a day")
- Icon
- Priority tag (`high`/`mid`/`low`)
- Progress bar (completed chunks / total chunks). **Hidden when Bit has zero Chunks.** Component size remains the same regardless.

### Bit Detail Popup

Clicking a Bit opens a **component popup** focused on action items. See [Section 9: Bit Detail Component](#9-bit-detail-component) for full specification.

### Completion Effects

Upon completion (auto or manual):

1. **Strikethrough** applied to the title text.
2. **Color changes to gray.**
3. **"Sinking" effect** — the card visually sinks below the grid surface and fades.

The completed Bit remains in place (grayed out and visually deprioritized). The user can:

- **Undo completion** — toggle back to active state.
- **Remove** — moves the Bit to trash (see [Section 19](#19-trash-zone)).

## 8. Chunk

### Behavior

- Created, read, updated, and deleted inside the **Bit detail popup**.
- Displayed in a **vertical timeline** (the "killer feature" of the Bit detail component).
- Can be dragged from a Chunk pool onto the timeline to define ordering.
- **Searchable** via the app's search feature.

### Time Constraint

A Chunk's time/date **cannot exceed its parent Bit's deadline**. This is enforced through:

- **Dragging Chunk past parent deadline in Calendar:** Modal appears — "Child chunk cannot exceed parent Bit's deadline. Update parent Bit's deadline too? ✓/✗"
  - ✓ → Parent Bit deadline extends to accommodate.
  - ✗ → Drag cancelled, Chunk stays at original date.
- **Parent Bit deadline shortened:** Chunks with dates exceeding the new deadline are blurred with "Modify timeline" overlay + ✓/✗ icon buttons. User must manually fix each conflicting Chunk.

### Chunk Completion

Toggle complete/incomplete in the Bit detail timeline. Completing a Chunk:

- Updates the Bit's progress bar.
- Resets the parent Bit's `mtime` (refreshes aging).
- Resets the parent Node's `mtime`.

## 9. Bit Detail Component

The Bit detail popup is the primary workspace for managing individual tasks.

### Layout

- **Header:** Title (editable), Icon selector, Deadline picker, Priority toggle (high/mid/low).
- **Description:** Editable text area for context.
- **mtime label:** Subtle "Last updated: X days ago" indicator.
- **Chunk pool:** List of unscheduled Chunks. CRUD operations happen here.
- **Timeline:** Vertical timeline showing ordered Chunks. Drag Chunks from the pool to the timeline.

### Timeline Behavior

- **Order-based by default.** Time is optional. The vertical line with connected dots implies sequence.
- **Dragging interaction** signals that the timeline is editable.
- **Chunks with time** sort by time within the timeline. Chunks without time follow user-defined order.
- **Empty state:** The timeline structure (vertical line, dot placeholder) is visible even with 0 Chunks. A single "Add a step" call-to-action is displayed.

### Order vs. Calendar Independence

**Order** (Bit detail timeline) and **Calendar date** (weekly/monthly schedule) are **fully independent concepts.**

| Concept       | Where it lives          | What it means                           |
| ------------- | ----------------------- | --------------------------------------- |
| Order         | Bit detail timeline     | User's preferred sequence of work steps |
| Calendar date | Calendar:Weekly/Monthly | When the work is scheduled              |

- Reordering Chunks in the timeline does **NOT** change their Calendar dates.
- Rescheduling Chunks on the Calendar does **NOT** change their timeline order.

These are two different views of the same data, each serving a different purpose. Users can legitimately have order and schedule diverge (e.g., a task might be logically first but scheduled for later due to external constraints).

## 10. Aging System

A visual system that surfaces neglected items. Based on `mtime`, **computed at render time** (not stored as a separate field). Thresholds are configurable.

### Aging States

| State     | Age (since last mtime) | Visual Effect                                            |
| --------- | ---------------------- | -------------------------------------------------------- |
| Fresh     | 0-5 days               | Vivid, original Node/Bit colors                          |
| Stagnant  | 6-11 days              | Colors fade slightly, mix with grayscale                 |
| Neglected | 12+ days               | Covered with fine "dust particles" (noise texture/layer) |

### What Resets mtime

| Action                                               | Resets mtime? |
| ---------------------------------------------------- | ------------- |
| Editing title, description, properties               | Yes           |
| Completing a Chunk or Bit                            | Yes           |
| Adding or removing child items (Nodes, Bits, Chunks) | Yes           |
| Opening or viewing an item                           | No            |
| Repositioning on the grid                            | No            |

**Node mtime propagation:** A Node's mtime resets when any of its direct child Bits or Chunks are completed, or when child items are added/removed.

## 11. Deadline Urgency System

Applies to both **Nodes and Bits** that have deadlines set. Provides escalating visual alerts through blinking animation with red saturation differences.

### Urgency Levels

| Level | Trigger                | Visual                 |
| ----- | ---------------------- | ---------------------- |
| 1     | 3 days before deadline | Light red blinking     |
| 2     | 2 days before deadline | Medium red blinking    |
| 3     | 1 day before ~ D-day   | Deep red blinking      |
| Past  | Deadline has passed    | Blur + "Done?" overlay |

### Past-Deadline Behavior

When a Node or Bit's deadline passes:

1. The item itself **blurs** (not a modal or popup).
2. "Done?" text with **✓/✗ icon buttons** appears overlaid directly on the blurred item.
3. **✓ (Yes):** Item is marked as complete (strikethrough, gray, sinking effect).
4. **✗ (No):** Blur clears, item enters Level 3 state (deep red blinking). **Never prompts again.** User can manually complete later.

### Deadline Hierarchy Constraint

Deadlines propagate downward through the hierarchy with a hard constraint: **a child's deadline cannot exceed its parent's deadline.**

| Relationship | Constraint                                        |
| ------------ | ------------------------------------------------- |
| Node → Bit   | Bit deadline cannot exceed parent Node deadline   |
| Bit → Chunk  | Chunk time/date cannot exceed parent Bit deadline |

**When a child is scheduled past its parent's deadline:**

- Modal: "Child cannot exceed parent's deadline. Update parent's deadline too? ✓/✗"
- ✓ → Parent deadline extends.
- ✗ → Action cancelled.

**When a parent's deadline is shortened:**

- All children exceeding the new deadline are blurred with "Modify timeline" + ✓/✗ icon buttons.
- User must manually resolve each conflict.
- ✓ → Opens the item for date editing.
- ✗ → Keeps the conflicting date (item remains in conflict state).

## 12. Badge System

Badges appear on **Nodes only** and reflect the deadline state of their **direct children** (one level up only).

| Child State                              | Badge                      |
| ---------------------------------------- | -------------------------- |
| Nearing deadline (within urgency levels) | Medium red (Level 2 color) |
| Overdue (past deadline)                  | Red                        |

### Badge Rules

- If multiple children have deadline states, the badge shows the **most impending** (most urgent) child's state.
- Badge propagation is **one level only** — a Level 3 Bit's urgency does NOT bubble up to Level 0.
- **No flag system.** Badges are purely deadline-driven.

### Global Urgency Awareness

To compensate for single-level badge propagation, the **Calendar sidebar icon** displays a **notification dot** using the urgency color of the most urgent item across **ALL levels** in the project. This is the global safety net that ensures deep urgency is never invisible.

## 13. Completion Flow

### Chunk Completion

- Toggle complete/incomplete in the Bit detail timeline.
- Updates parent Bit's progress bar.
- Resets parent Bit and parent Node's `mtime`.

### Bit Completion

| Trigger            | Description                                                        |
| ------------------ | ------------------------------------------------------------------ |
| **Auto-complete**  | All Chunks marked complete → Bit auto-completes                    |
| **Force-complete** | User manually completes at any point (even with incomplete Chunks) |
| **Zero Chunks**    | No progress bar. Simple manual complete toggle.                    |

**Post-completion state:**

- Strikethrough, gray, sinking animation.
- Remains in place until user removes.
- User can undo (toggle back to active) or remove (→ trash).
- Completed Bits in Calendar views appear grayed/completed.

### Node Completion

- **Level 1-2:** Passively auto-reflects when all internal Bits are done (visual indicator).
- **Level 0:** Never complete. Permanent life/work domains.

## 14. Calendar Mode

A **global view** accessed from the sidebar. Shows all items across the **entire project**, not scoped to a specific Node. Two views: Weekly and Monthly.

### Calendar:Weekly

#### Right Side — Weekly Schedule

- **7 vertical day columns** (Mon through Sun), tall and scrollable.
- **"Drop items here"** placeholder in empty columns.
- Dragging an item from a pool to a day column sets its deadline to that day ("on a day").

#### Left Side — Pools

**Node Pool (top, larger section):**

- Shows all Level 0 Nodes as **icons only** (hover to reveal title text).
- **Click a Node** to drill down: shows sub-Nodes (with `>` chevron) and Bits inside.
- **Back arrow** (`<`) to navigate back up the hierarchy.
- Both Nodes and Bits inside a drilled-down view can be dragged to the schedule.
- Includes search functionality.

**Items Pool (bottom, smaller section):**

- Merged pool of all Bits and Chunks across the project.
- **Sort order:** Deadline items first (sorted by priority, then time), no-deadline items below.
- Scrollable with search functionality.

#### Day Column Item Display

- **1 item:** Standard Bit component design.
- **2+ items:** Compact list design — colored left border, title, time on right. Date badge in corner.
- **No-time items** appear at the **top** of the day column (flexible timing). Timed items below, sorted earliest to latest.
- **Overflow:** "+N more" indicator when items exceed visible space.

#### Day Column Expansion

- Clicking "+N more" **expands the column vertically**.
- **Vignette effect** applied to the expanding column, fading/hiding adjacent columns.
- **Collapse:** Press `ESC` or click any area in the column except on Bits.
- Prevents cascading overflow recalculation in adjacent columns.

#### Unscheduling

- **Drag** item back to the Items Pool, or
- **✗ button** on hover over the item in the day column.
- Unscheduling clears the item's deadline (returns to "no date").

### Calendar:Monthly

- Standard **calendar grid** layout (7 columns Mon-Sun, rows for weeks of the month).
- **Left/right arrow** navigation between months. Month label on the side.
- **Same left panel** as Weekly (Node Pool + Items Pool with identical behavior).
- Items appear as **indicators on date cells** with highlight color.
- Items can be dragged from pools to date cells (same deadline-setting behavior).
- **Clicking a date cell** opens a **popover** showing all items scheduled for that day in a list view. Items in the popover are clickable to navigate to the item's grid location.

## 15. Navigation & Breadcrumbs

- **Breadcrumb bar** at the top of the grid: `Home > Work > Project A`.
- Clicking any breadcrumb segment **navigates instantly** to that grid level.
- **Node description** appears as a subtitle line directly below the breadcrumb when inside a Node's grid.

## 16. Left Sidebar

A vertical toolbar on the left side of the screen. **Foldable** for full grid focus.

### Sidebar Functions

| Icon         | Function      | Context                                                                                  |
| ------------ | ------------- | ---------------------------------------------------------------------------------------- |
| **+**        | New item      | Level 0: direct Node creation. Level 1-2: menu (Node/Bit). Level 3: direct Bit creation. |
| **Pencil**   | Edit mode     | Enter jiggle/edit mode (see [Section 17](#17-edit-mode))                                 |
| **Search**   | Search        | Opens search overlay (see [Section 18](#18-search))                                      |
| **Sun/Moon** | Theme         | Dark/Light mode toggle                                                                   |
| **Calendar** | Calendar mode | Switch to Calendar:Weekly or Calendar:Monthly                                            |
| **Trashbin** | Trash         | Access trash zone. **Level 0 only.**                                                     |
| **Labs**     | Experimental  | Access beta features. **Level 0 only.** Deferred.                                        |

### Folded State

When the sidebar is folded:

- No icon strip is shown. User must reopen the sidebar to access functions.
- **Mouse entering the folded sidebar area** highlights the reopen button with **red color and scale animation** to guide the user.

### Calendar Icon Notification Dot

The Calendar icon in the sidebar displays a **notification dot** when urgent items exist anywhere in the project. The dot uses the urgency color (light/medium/deep red) matching the most urgent item across all levels. This provides global urgency awareness without cluttering the grid.

## 17. Edit Mode

Activated by clicking the Pencil icon in the sidebar.

### Behaviors

- **Jiggle mode** (iOS home screen style): All items subtly animate. Dashed grid cell outlines become visible.
- **Empty cells** display a "+" icon for quick item creation.
- **Click an item** to edit its properties (title, icon, color, deadline, etc.).
- **Drag an item** to reposition it between grid cells.
- **Delete items** via a delete option on each item.

### Exiting Edit Mode

- Click the Pencil icon again, or
- Press `ESC`.

## 18. Search

**Vanilla text search** across Nodes, Bits, and Chunks.

### UI

- Opens as a **centered overlay on a blurred background**.
- **Real-time filtering** as the user types.

### Search Results

Each result displays:

- Item name
- Type icon (Node / Bit / Chunk)
- Parent path (e.g., "Work > Project A > Frontend")
- Deadline (if present)

Clicking a result **navigates to the item's location** in the grid.

## 19. Trash Zone

### Access

Trashbin icon in the left sidebar. **Available on Level 0 only.**

### Behavior

- **Cascade delete:** When a Node is removed, it and all its children (sub-Nodes, Bits, Chunks) move to trash together as a group.
- **Grouped view:** A deleted Node appears as a single entry with child count indicator (e.g., `"Work" — 3 Nodes, 8 Bits`). Clicking/expanding reveals children.

### Restore

- Returns item to its **original parent grid**.
- If the original cell (`x`, `y`) is occupied, places it in the **nearest empty cell** (BFS).
- If the parent Node was also deleted, restoring a child **auto-restores the parent chain** (no orphans). Auto-restored parent Nodes follow the same BFS nearest-empty-cell placement rule.

### Permanent Deletion

- **"Delete permanently"** option per item.
- **"Empty trash"** to clear all items at once.
- **Auto-cleanup:** 30-day retention period. Items display "X days until permanent deletion" label. After 30 days, items are permanently deleted.

## 20. Move System

Three mechanisms for moving items between locations:

### 1. Drag onto Node (Same Grid)

In edit mode, drag a Bit or Node onto another Node on the same grid. The item moves inside the target Node (like dragging an app into a folder on iOS).
❯ 1. with modify timeline, yes/no button should be appeared same as post-deadline. prefer icons for button design. e.g. check, x icon.  
2. level 0: direct node creation. level1-2: menu with node/bit selection. level3: direct bit creation. chunks: inside detail poup.  
3. auto-placing in the empty cell seems nice.  
3.1. can i get details for implementing this feature in detail? i know this uses bfs, but i'm thrilled to see it on real code work for the first time. write down as bfs.md. use haiku model for simple write down  
action.

⏺ Agent(Write BFS explanation for grid auto-placement) Haiku 4.5
⎿  Backgrounded agent (↓ to manage · ctrl+o to expand)

⏺ BFS doc is being written in the background.

Noted on the decisions:

- Conflict overlay: blur + "Modify timeline" + check/x icon buttons (consistent with post-deadline pattern)
- New button: context-aware, no unnecessary menus
- Auto-place: nearest empty cell via BFS

Next logical gap + opinion: What does the Weekly Template actually render?

The PRD says "a weekly planning template is placed in the background of the right section." But it doesn't define what this looks like or how it functions. Key questions:

1. Layout: Is it a 7-column layout (Mon-Sun) with time slots? Or just 7 labeled columns with no time rows?
2. How Bits attach to it: When a user drags a Bit onto "Wednesday," does the Bit snap to a day column? And if the Bit has a specific time, does it position vertically within that day?
3. Monthly option: The PRD mentions "changeable to Monthly via settings." Monthly would need a calendar grid instead of columns.

My opinion: Since we decided the timeline (and Chunk times) is order-based by default, time optional, the weekly template should follow the same philosophy:

- Default: 7 day columns (Mon-Sun), no time rows. Bits snap to a day. Vertical position within a day is just order-based (top = first, bottom = last).
- With time: If a Bit has a time set, it positions vertically within the day proportionally. But this is an enhancement, not default.
- Monthly: A standard calendar grid (rows of weeks). Bits appear as small indicators on date cells. Useful for seeing the big picture but less interactive.

This keeps weekly template simple and consistent with the order-first philosophy.

✻ Baked for 31s

⏺ Agent "Write BFS explanation for grid auto-placement" completed

⏺ bfs.md is ready — covers BFS explanation, step-by-step, pseudocode, visual example, and edge cases, all beginner-friendly.

Waiting for your thoughts on the Weekly Template question above.

❯ 1. it's seven rows with single column with seven rows. check design from ./week2.jpg. single column, no time rows. order-based;left=first, right=last.  
2. bit attatches to it without orders basically;user should manually position anywhere. user places a node/bit inside e.g. mon, the deadline should be updaeted as 'monday' (on a day). if the bit/node has a  
specific time, a bit alone doesn't matter. when multiple exists, it aligns horizontally in time order (up(old) to down(latest)). e.g. in 'tue(tuesday)' column, 'call jerry for lunch at 11 am' is already in place.
user adds 'call john for delayed meeting at 10:30am' in the same 'tue' row. where ever user puts this bit(only inside tue), the bit will be attached on very top position of 'call jery..' bit.  
2.1. with spacial limit, aligning the same bit design seems to much space inside day rows. check ./issue1.png. two bits are inside 'tue' row, but it fits the whole section. single bit is ok, but from two, let's  
change 'bit' designs as ./row1.png and ./row2.png.  
3. check monthly design on ./monthly.jpg

Read 5 files (ctrl+o to expand)

⏺ Now I see the full picture. Let me consolidate:

Weekly Template (week2.jpg):

- 7 rows stacked vertically (Mon → Sun), each row is a day
- Items placed inside a day row, deadline auto-updates to that day

Space problem (issue1.png):

- Two full-size Bit components in "tue" row — too cramped

Compact design for 2+ items (row1.png / row2.png):

- Switches to a condensed list: colored left border, event name, time on right
- Date badge in top-right corner (e.g., "22")
- row1: Shows all items (up to 8 visible)
- row2: Shows overflow with "+2 more" when items exceed space

Monthly (monthly.jpg):

- Standard calendar grid (7 columns × weeks), navigable with arrows
- Items appear as indicators on date cells (e.g., "Cleaning 12:00" highlighted in yellow)

My opinion: The adaptive Bit rendering is smart — full design for single items, compact list for multiple. This needs a clear rule in the PRD:

- 1 item in a day row: Standard Bit component
- 2+ items: Compact list design (row1), sorted top-to-bottom by time (earliest on top). Items without time go to the bottom.
- Overflow: "+N more" (row2) with a tap to expand or navigate to that day's full view

One question: the "+N more" in row2 — what happens when the user taps it? Does it expand the row to show all items, or navigate somewhere?

✻ Cogitated for 52s

❯ clicking +n more expands the date row vertically showing more items. e.g. user clicks +5 more in 'tue' row. row vertically expands, shrinking 'wed' section. use vignette effect for expanding row to hide nearest
rows;'wed' items on this case. without this, we should change +2 more items, +3, +4, ... for 'wed' items while 'tue' is expanding.

⏺ Smart solution. The vignette effect on the expanding row avoids the cascade problem entirely — instead of all adjacent rows recalculating their overflow, the expanded row just visually overlays them with a
fading edge.

My opinion: This is elegant and consistent — you're already using vignette for grid depth levels, so reusing it here for row expansion is a learned visual language. One detail for the PRD: there should be a way
to collapse the expanded row back. A tap on the expanded row's header (day label) or a "show less" link at the bottom would work.

Also worth specifying: max expansion limit. If "tue" has 20 items, expanding fully would bury the entire weekly view. I'd cap visible items at something like 8-10 in the expanded state, with the rest scrollable
within the expanded row.

Next logical gap + opinion: What does the Node color field control?

The Node schema has color, and from the edit mode design I can see each Node has a distinct icon color (Health = green, Work = red, Finance = purple, etc.). Is color the:

- A) Icon/accent color — Controls the Node's icon color and any accent elements (badge, border)
- B) Background color — Controls the entire Node tile background
- C) Category color — Propagates to child items (Bits inside a "Work" Node inherit red accents)

My opinion: Based on the edit mode design, it looks like (A) — the icon color. The tile backgrounds are uniformly dark gray, with only the icon differing in color. I'd keep it as icon/accent color only.
Propagating to children (C) is tempting but creates visual complexity when items are moved between Nodes.

❯ 1. 'esc' on keyboard stroke would collapse row back. clicking any sections in the row except bits should do the collapse too.  
2. for ui consistency, limiting bits inside weekly view is needed. (let's talk this again after 3)  
3. sorry to bother, but seems we should change plans. currently weekly design is single column, 7 date rows. let's change this 7 rows, single column. through this, the column should be vertically long, which  
handles many of our current issues. at this case, limiting bits inside weekly view is still needed.  
4. a + c. nodes should be no-border design. basically A, node's icon and badge color. color wheel should be advisable for this color change. we now have bit design in light mode. ./bit2.png. for light mode, color
propagation as you mentioned in C is favorable. but for bit, color should be low-saturated than the origianl icon color.  
5. 'd like to make left side menu foldable. this makes users' full focus to the grid.

Read 1 file (ctrl+o to expand)

⏺ Good, I can see the light mode Bit — soft white/cream background, same structure. The parent Node color would tint child Bits at low saturation for a subtle visual grouping.

Let me consolidate all 5 points:

1. Row collapse: ESC key or click anywhere in the row except on Bits. Clean and intuitive.

2-3. Weekly template redesign: Changing to a vertically long, scrollable single column with 7 day rows. Each day gets generous height, reducing overflow pressure naturally. Still need a per-day item limit
though.

My opinion on 3: Making it vertically scrollable is the right call. Trying to cram 7 days into a fixed viewport forced the compact row design and overflow handling. With scroll, each day breathes. I'd suggest
the current day row is auto-scrolled into view when the weekly template loads, so users land on "today" without manual scrolling.

For the item limit (point 2): with a taller scrollable layout, I'd say ~8 items visible per day before "+N more" kicks in. This matches your row1/row2 design. The expand/collapse with vignette + ESC still
applies for overflow.

4. Node color:

- A + C: icon/accent color + propagation to child Bits
- Child Bits use lower saturation of parent Node's color
- No-border Node design
- Color wheel picker for customization
- My opinion: Low-saturation propagation is a great visual cue — users can glance at a Bit and know which Node it belongs to without reading. Works especially well in light mode where soft tints feel natural.
  For dark mode, consider using the color as a subtle left-border accent on Bits instead of a background tint, since low-saturation colors can look muddy on dark backgrounds.

5. Foldable left sidebar:

- My opinion: Essential for a grid-based app where screen real estate matters. I'd add a small persistent tab/handle on the left edge when folded so users can reopen it. Keyboard shortcut too (e.g., [ or Cmd+B).

One clarification on point 3: did the layout fundamentally change, or is it the same 7-row column from week2.jpg just designed to be taller and scrollable? I want to make sure I'm not missing a structural
change.

✻ Cooked for 55s

❯ 1. 4,5 is good.  
2. no, week2.jpg is vertically listed 7 rows only. check ./weekly.png for better understanding. this is a sample image i made to help.

Read 1 file (ctrl+o to expand)

⏺ Now I see — this is a fundamentally different layout from what I assumed:

The actual weekly template design:

- Left: "AVAILABLE BITS" — vertical scrollable list of unscheduled Bits belonging to this Node (workout-related items with times, priority tags)
- Right: "WEEKLY SCHEDULE" — 7 vertical columns (Mon-Sun) side by side, tall and spacious. Users drag Bits from the left pool into day columns.

This is NOT 7 horizontal rows — it's 7 vertical columns. Much more space per day, naturally handles many items. The drag-from-pool-to-column pattern mirrors the Chunk timeline concept inside Bit detail.

My opinion: This layout is significantly better than the horizontal row design. Each day column has generous vertical space, overflow is rare, and the drag interaction is intuitive. The "Available Bits" pool on
the left is a smart holding area.

But this raises a critical PRD question: The original 2-way split was "left = Nodes, right = Bits." This design shows "left = Available Bits, right = Weekly Schedule." Where do sub-Nodes go?

For example, inside "Workout" (Level 1), the PRD said there'd be sub-Nodes like "Cardio", "Diet" on the left. But in this design, the left side is entirely occupied by the Available Bits pool. Are sub-Nodes:

- A) Above or below the Available Bits section on the left (stacked)
- B) Placed inside the day columns alongside Bits
- C) The 2-way split concept is replaced entirely — this weekly view IS the Level 1 layout, and Nodes are accessed differently
- D) Something else

✻ Brewed for 35s

❯ 1. i'm struggling with this conflict. as you said, our original design was the 2way left(node)-right(bit) design.  
2. ./weekly2.png split above(nodes)-below(bits) left side panel. this is the design i think is favorable, except few issues(distinct section divides, wrong node design, scroll bar(i don't want to see this), size  
of each days in weekly schedule)  
3. between 1 and 2, i'm wondering. this will be our calendar:weekly mode design. but is it right to impelment this for all grid 1? i'm not sure.

Read 1 file (ctrl+o to expand)

⏺ Now I understand the full picture. weekly2.png shows:

- Left top: "AVAILABLE NODES" — sub-Nodes (Strength Training, Cardio Session, etc.) in grid layout
- Left bottom: "AVAILABLE BITS" — scrollable list of unscheduled Bits
- Right: "WEEKLY SCHEDULE" — 7 day columns where both Nodes AND Bits can be dropped (Monday shows Cardio Session node + Bits)

Issues you flagged: harsh section dividers, incorrect node design, visible scrollbar, day column sizing. Those are design fixes for later.

On your question 3 — should this be the default for all Level 1 grids?

My opinion: No. This should be a view mode, not the default.

Here's why. The original 2-way grid (nodes left, bits right on a spatial grid) and this weekly schedule serve different mental models:

- Grid view = spatial thinking: "How do I organize and categorize my work?" — A "Learning" node needs sub-topics (JavaScript, Python) laid out visually, not a weekly schedule.
- Weekly view = temporal thinking: "When am I doing things this week?" — A "Workout" node naturally maps to days.

Not every Level 1 benefits from weekly scheduling. Making it the default forces a temporal frame on categories that might be purely organizational.

My recommendation:

- Default Level 1: The original 2-way grid (nodes left, bits right on a free-form grid). The weekly template exists as a subtle background reference, not the dominant structure.
- Calendar:Weekly mode (sidebar toggle): Switches to the weekly2.png layout. Available per any Level 1-2 grid, but user-activated.
- The grid remembers which view mode was last used per Node, so "Workout" stays in weekly mode and "Learning" stays in grid mode.

This preserves GridDO's spatial identity while giving users the weekly planner when they need it. Thoughts?

✻ Cooked for 36s

❯ what i think for calendar:weekly mode is to show every nodes and bits in the whole project. not about specific nodes. e.g. user enters calendar weekly mode. sees all level 0 nodes on left-above side, all bits  
filtered(time/priority) below. this left side behavior will be the same to calendar:monthly view.

⏺ That's a crucial distinction. Calendar:Weekly is a global view, not per-Node:

- Left top: All Level 0 Nodes
- Left bottom: All Bits across the entire project, filtered by time/priority
- Right: Weekly Schedule columns — drag any Bit from any Node into days
- Same left panel structure for Calendar:Monthly

This is much cleaner — Calendar mode is a separate global workspace for temporal planning across the whole project.

My opinion: This makes more sense architecturally. The individual Level 1-2 grids stay purely spatial (2-way node/bit grid), and all time-based planning happens in one dedicated global view. No confusion between
spatial and temporal within the same grid.

But this creates a conflict with the original PRD: It said "a weekly planning template is placed in the background of the right section of the Level 1 grid." If Calendar mode is now a separate global view, does
the Level 1 grid still have a weekly template in its background?

I think it should be removed from Level 1 grids. Having both a per-Node background template AND a global Calendar mode is redundant and confusing. The Level 1 grid stays a clean spatial workspace. When users
want to think about scheduling, they switch to Calendar mode.

This means:

- Level 1-2 grids: Pure 2-way split (nodes left, bits right). No weekly background.
- Calendar:Weekly: Global temporal view (weekly2.png layout)
- Calendar:Monthly: Global temporal view (monthly.jpg layout)

Agree, or do you still want some weekly reference on Level 1 grids?

❯ agreed.

⏺ Clean separation established:

- Level 1-2 grids: Pure spatial 2-way split (nodes left, bits right). No weekly background.
- Calendar:Weekly/Monthly: Separate global views for temporal planning.

Next logical gap + opinion: Are deadlines optional on Bits and Nodes?

We've defined deadline as a schema field for both. But many tasks don't have firm deadlines ("Learn React", "Organize photos"). If deadline is required:

- Every item needs a date, which adds friction to quick task creation
- The aging system already handles neglected items, so deadlines become redundant for awareness

If optional:

- Items without deadlines don't appear in Calendar:Weekly/Monthly views (since they have no day to attach to)
- The badge/urgency system only activates on items that have deadlines
- "Available Bits" pool in Calendar mode could show deadline-less items separately

My opinion: Deadline should be optional. The app's core metaphor is spatial organization, not time management — Calendar mode is an add-on, not the foundation. Forcing deadlines contradicts the target users who
are overwhelmed; adding friction to "just capture a thought" will discourage usage. Items without deadlines live happily on the spatial grid and show up in search, but simply don't appear in Calendar views.

For the Bit card design: no-deadline Bits hide the deadline row, keeping the same component size (like how zero-chunk Bits hide the progress bar).

✻ Sautéed for 38s

❯ yes it's optional. but on calendar view, every items should appear. user should be able to drag and attach node/bit/chunks to the calendar;this gives the item deadline(on-a-day). avaiable bits pool shows  
bits/chunks with deadline first(both priority/time). user should see no-deadline bit/chunks as they scroll down the pool. search feature seems to be needed. for node pool, clicking node in the pool should show  
inner nodes too. for this, node pool size should be bigger than bit/chunk pool. both will have search features, but node pool section needs to show both node and bit inside the node. ./weekly3.png is the sample  
design for this node inner exploration.

Read 1 file (ctrl+o to expand)

⏺ Great design. The Calendar mode Node exploration is clear:

Node pool (top, larger section):

- Initially shows Level 0 Nodes
- Click a Node → drills down to show its children (sub-Nodes with ">" chevron + Bits inside)
- Back arrow "<" to navigate up
- Items draggable from here to weekly columns (e.g., "Core Finisher - No date" → drag to Monday → gets Monday deadline)

Bit/Chunk pool (bottom, smaller section):

- All Bits/Chunks across the project
- Sorted: deadline items first (by priority + time), no-deadline items below
- Scrollable with search

My opinion: The drill-down navigation in the Node pool is the right pattern — it reuses the hierarchy users already built without flattening it. Showing both sub-Nodes and Bits inside a drilled-down Node gives
full context.

One logical issue to address: Chunks in the Calendar view. You said users can drag Chunks to the calendar too. But we established Chunk time can't exceed parent Bit's deadline. If a user drags a Chunk to
Thursday but its parent Bit's deadline is Wednesday:

- The existing conflict rule applies — blur + "Modify timeline" with check/x icons
- Or should it auto-update the parent Bit's deadline to accommodate the Chunk?

My recommendation: Keep the conflict rule (blur + modify). Auto-updating a parent's deadline from a child action is surprising and could silently push deadlines. Better to let the user explicitly decide.

Also: should the Bit pool and Chunk pool be merged or separate? They're both low-level actionable items. A combined "Available Items" pool sorted by type/deadline might be simpler than managing two lists.

✻ Brewed for 38s

❯ 1. node pool, showing title as texts takes too much space. show node with icon only, hovering the icon should show title text.  
2. auto-update seems better to me. show modal: update parent bits' deadline too? yes, no.  
2.1. updating bit/chunk time should also alter related chuks in order. this seems to be a tough logical work.. give me your opinion.  
3. merge. 'items pool' seems nice. and there's no place for another pool section.

⏺ 1. Node pool icons only: Smart space optimization. Icon grid + hover for title is the standard app-launcher pattern your users already know.

3. Merged "Items Pool": Agreed. Single pool with Bits and Chunks, sorted by deadline priority.

2.1. My opinion on cascade time updates:

This is simpler than it looks if we separate two concepts:

Order (inside Bit detail timeline) and Calendar date (in weekly schedule) are independent.

- Order = logical sequence of work steps (1st: ask for access, 2nd: checkout branch)
- Calendar date = when you plan to do it (Monday, Tuesday)

These naturally align but shouldn't be locked together. A user might do step 3 on Monday and step 1 on Tuesday if that's how their schedule works.

With this separation, the cascade rules become simple:

┌────────────────────────────────────┬──────────────────────────────────────────────────────────────────────┐
│ Action │ Result │
├────────────────────────────────────┼──────────────────────────────────────────────────────────────────────┤
│ Parent Bit deadline shortened │ Validate all Chunk dates → blur conflicting ones + "Modify timeline" │
├────────────────────────────────────┼──────────────────────────────────────────────────────────────────────┤
│ Parent Bit deadline extended │ No action needed — all existing dates still valid │
├────────────────────────────────────┼──────────────────────────────────────────────────────────────────────┤
│ Chunk dragged past parent deadline │ Modal: "Update parent Bit's deadline too? Yes/No" │
├────────────────────────────────────┼──────────────────────────────────────────────────────────────────────┤
│ Chunk time changed within same day │ Other Chunks re-sort by time in the weekly column (visual only) │
├────────────────────────────────────┼──────────────────────────────────────────────────────────────────────┤
│ Chunk order changed in Bit detail │ No effect on calendar dates │
└────────────────────────────────────┴──────────────────────────────────────────────────────────────────────┘

No cascading reorder. No complex dependency chains. The only hard rule is: Chunk calendar date cannot exceed parent Bit deadline. Everything else is independent.

This avoids the "tough logical work" entirely. Does this approach work for you?

✻ Baked for 33s

❯ Rule 5: Chunk order changed in Bit detail

    Bit detail timeline:
      1. "Ask Jimmy"      (Calendar: Monday)
      2. "Checkout branch" (Calendar: Tuesday)
      3. "Review code"     (Calendar: Tuesday)

    User drags "Review code" above "Ask Jimmy" in the Bit timeline:
      1. "Review code"     (Calendar: still Tuesday — unchanged)
      2. "Ask Jimmy"       (Calendar: still Monday — unchanged)
      3. "Checkout branch" (Calendar: still Tuesday — unchanged)
    Logical order changed, calendar dates untouched. The user planned to review code first conceptually, but the calendar stays as scheduled.


my logcial thinking is that in this case, dragging 'code review(tue)' above 'ask jimmy(mon)' should alter 'code reveiw' to monday. what's your opinion?

⏺ You're right — I was wrong to make them fully independent. Your intuition is correct here.

If a user drags "Review code" above "Ask Jimmy," they're expressing intent: "I need to do this FIRST." Keeping it on Tuesday while it's now logically step 1 before a Monday task creates a contradiction the user
has to manually fix. That defeats the purpose of reordering.

But automatic silent date changes can also be surprising. My recommendation:

Show a confirmation modal when reordering creates a temporal inconsistency:

▎ "Review code (Tue) is now ordered before Ask Jimmy (Mon). Move Review code to Monday?"
▎ ✓ / ✗

Rules:

- Moving a Chunk UP above a Chunk with an earlier date → inconsistency → modal to adjust date
- Moving a Chunk DOWN below a Chunk with a later date → no inconsistency (doing something earlier than needed is fine, doing it later than logically necessary isn't)
- Chunks without dates → no conflict possible, reorder freely

This is a one-direction rule: only flag when a later-dated Chunk moves before an earlier-dated one. No cascading. No silent changes. One simple modal per conflict.

Example with your case:
Drag "Review code (Tue)" above "Ask Jimmy (Mon)"
→ Modal: Move Review code to Monday? ✓/✗
→ ✓: Review code → Mon. Ask Jimmy stays Mon. Checkout stays Tue.
→ ✗: Order changes, dates stay. User accepts the inconsistency.

✻ Crunched for 44s

❯ i'm confused with the logic

1. working order and timeline won't sometimes match. e.g. some user may want to do task1 first, which is deadlined to monday upon task2 deadline by sunday.  
   how can we handle this logical issue? what's the difference of deadline and working order on our project? how do we distinct this two concepts. i'm confused.  


Conflict 2: Repeated modal annoyance for intentional inconsistency

    1. Task A (Mon)  2. Task B (Tue)

    User drags B above A → modal → clicks ✗ (intentionally accepts inconsistency)

    Later accidentally drags B again → modal fires again

    No "remember my choice" mechanism. If the user intentionally wants order ≠ schedule, they get nagged every time they touch the order.


for this case for example, user may want to order != schedule.

⏺ You're asking the right question, and I owe you a correction — I shouldn't have agreed when you suggested auto-adjusting dates on reorder. That introduced the very confusion we're now untangling.

The core issue: order and schedule are fundamentally different concepts.

- Order (Bit detail timeline) = "In what sequence do I think about these steps?" — could be priority, dependency, or just personal preference
- Calendar date = "When am I actually doing this?" — driven by availability, deadlines, external constraints

These legitimately diverge in real life:

- "Ask Jimmy for access" is due Sunday, but I need to do it BEFORE "Checkout branch" (due Monday) because it's a dependency
- "Review code" is my top priority (order: 1) but the PR isn't ready until Tuesday

Trying to link them — whether through auto-adjustment or modals — treats a valid, normal situation as a problem. It isn't one.

My corrected recommendation: go back to the original rule. Order and calendar are fully independent. No modals. No auto-adjustment.

┌───────────────┬─────────────────────────┬────────────────────────────────────┐
│ Concept │ Where it lives │ What it means │
├───────────────┼─────────────────────────┼────────────────────────────────────┤
│ Order │ Bit detail timeline │ User's preferred sequence of steps │
├───────────────┼─────────────────────────┼────────────────────────────────────┤
│ Calendar date │ Weekly/Monthly schedule │ When it's actually scheduled │
└───────────────┴─────────────────────────┴────────────────────────────────────┘

The Bit detail shows chunks in user-defined order. The Calendar shows chunks on scheduled dates. Two views, same data, different purposes. Users can reorder freely without date side effects, and reschedule
freely without order side effects.

This is simpler, more honest, and eliminates the entire class of cascade/modal problems. I apologize for the back-and-forth — my earlier agreement introduced unnecessary complexity.

✻ Brewed for 33s

❯ /model  
 ⎿ Kept model as Opus 4.6

❯  
 Here are all the conflict scenarios I can identify from this logic:

    ---

    Conflict 1: Moving DOWN creates a reverse inconsistency (unhandled)

    Before: 1. Task A (Mon)  2. Task B (Mon)  3. Task C (Tue)

    Action: Drag Task A to position 3

    After:  1. Task B (Mon)  2. Task C (Tue)  3. Task A (Mon)

    Task A is now step 3 but scheduled Monday, BEFORE step 2's Tuesday. Our rule only catches upward moves — this slips through. The user deprioritized Task A but its earlier date wasn't adjusted.


    ---

    Conflict 2: Repeated modal annoyance for intentional inconsistency

    1. Task A (Mon)  2. Task B (Tue)
    User drags B above A → modal → clicks ✗ (intentionally accepts inconsistency)
    Later accidentally drags B again → modal fires again
    No "remember my choice" mechanism. If the user intentionally wants order ≠ schedule, they get nagged every time they touch the order.

    ---
    Conflict 3: Time handling when date changes
    1. Task A (Mon 9:00 AM)  2. Task B (Tue 3:00 PM)
    User drags B above A → modal: move to Monday? ✓
    Does Task B become Mon 3:00 PM? Mon (on a day)? Mon 9:00 AM? The rule says "move to Monday" but doesn't specify what happens to the time component.

    ---
    Conflict 4: No-date Chunk in first position
    1. Task A (no date)  2. Task B (Mon)  3. Task C (Tue)
    Task A is logically first but has no calendar date. No modal fires (no date = no conflict). But conceptually, if Task A must happen first, shouldn't it be scheduled before Monday? The system silently allows

an  
 unscheduled task to block scheduled ones.

    ---
    Conflict 5: Accepting modal creates same-time stacking
    1. Task A (Mon 9:00 AM)  2. Task B (Tue 9:00 AM)
    Drag B above A → modal → ✓ → B becomes Mon 9:00 AM
    Now two Chunks at Mon 9:00 AM. Not technically broken (they stack), but the user might not realize they've double-booked a time slot.

    ---
    Conflict 6: Multi-Chunk pile-up on single day
    1. Task A (Mon)  2. Task B (Tue)  3. Task C (Wed)  4. Task D (Thu)
    User sequentially drags D, C, B all to position 1, accepting modals each time.
    Result: All four Chunks on Monday.
    Technically valid, but could create an unrealistic Monday workload with no warning.

    ---
    Conflict 7: Cascade from parent Bit deadline update meets reorder logic
    Bit deadline: Friday
    1. Task A (Mon)  2. Task B (Wed)  3. Task C (Fri)

    User shortens Bit deadline to Tuesday.
    Task B (Wed) and Task C (Fri) get blur + "Modify timeline"
    User fixes Task B → Tue, Task C → Tue.

    Now: 1. Task A (Mon)  2. Task B (Tue)  3. Task C (Tue)
    User reorders Task C above Task A → modal: move to Monday? ✓
    Two systems (deadline conflict + reorder conflict) can fire in sequence. Not broken, but the user resolves one conflict and immediately gets another — feels like whack-a-mole.

    ---
    Summary of what needs PRD decisions:

    ┌─────┬───────────────────────────────────────────────┬────────────────────────────────────────────┐
    │  #  │                     Issue                     │            Suggested resolution            │
    ├─────┼───────────────────────────────────────────────┼────────────────────────────────────────────┤
    │ 1   │ Downward moves create reverse inconsistency   │ Apply same modal rule bidirectionally?     │
    ├─────┼───────────────────────────────────────────────┼────────────────────────────────────────────┤
    │ 2   │ Repeated modals for intentional inconsistency │ Add "don't ask again for this Bit" option? │
    ├─────┼───────────────────────────────────────────────┼────────────────────────────────────────────┤
    │ 3   │ Time handling on date change                  │ Keep original time, only change date?      │
    ├─────┼───────────────────────────────────────────────┼────────────────────────────────────────────┤
    │ 4   │ No-date Chunk in first position               │ Accept as valid — user's responsibility?   │
    ├─────┼───────────────────────────────────────────────┼────────────────────────────────────────────┤
    │ 5   │ Same-time stacking                            │ Accept — visual stacking handles it?       │
    ├─────┼───────────────────────────────────────────────┼────────────────────────────────────────────┤
    │ 6   │ Day pile-up                                   │ Accept — user's scheduling choice?         │
    ├─────┼───────────────────────────────────────────────┼────────────────────────────────────────────┤
    │ 7   │ Sequential conflict fatigue                   │ Accept — each conflict is independent?     │
    └─────┴───────────────────────────────────────────────┴────────────────────────────────────────────┘


this are cases. verify our current logic works fine with these cases.

⏺ These 7 conflicts all stem from the modal-based linking approach that I already retracted. With our current agreed logic (order and calendar are fully independent), let me verify each:

┌─────┬──────────────────────────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┬────────────┐
│ # │ Conflict │ Current logic │ Status │
├─────┼──────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────┤
│ 1 │ Downward move creates reverse │ No linking between order and dates. Task A at step 3 with Monday date is fine — order ≠ schedule. │ Eliminated │
│ │ inconsistency │ │ │
├─────┼──────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────┤
│ 2 │ Repeated modal annoyance │ No modals on reorder. Nothing fires. │ Eliminated │
├─────┼──────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────┤
│ 3 │ Time handling on date change │ No date changes on reorder. Time is untouched. │ Eliminated │
├─────┼──────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────┤
│ 4 │ No-date Chunk in first position │ Valid state. Unscheduled tasks can exist at any order position. User's responsibility to schedule when ready. │ Eliminated │
├─────┼──────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────┤
│ 5 │ Same-time stacking from modal │ No modal, no auto date movement, can't happen from reorder. (Can still happen from manual scheduling — but that's intentional user action, handled │ Eliminated │
│ │ │ by visual stacking in the day column.) │ │
├─────┼──────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────┤
│ 6 │ Day pile-up from sequential modal │ No modals, can't pile up from reorder. │ Eliminated │
│ │ accepts │ │ │
├─────┼──────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────┤
│ 7 │ Sequential conflict fatigue │ No reorder conflicts exist to chain with deadline conflicts. Only one conflict system remains: Chunk date vs parent Bit deadline. │ Eliminated │
└─────┴──────────────────────────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┴────────────┘

All 7 conflicts are eliminated because they all originated from trying to link order to calendar. By making them independent, the entire class of problems disappears.

The only remaining conflict rule in the system:

- Chunk calendar date cannot exceed parent Bit deadline → modal: "Update parent Bit's deadline too? ✓/✗"
- Parent Bit deadline shortened → existing Chunks past new deadline get blur + "Modify timeline" + ✓/✗

Two conflict scenarios, both simple, both about the one hard constraint (child can't exceed parent deadline). No cascading. No interaction between systems.

❯ veirfy our logic with other sample cases before we proceed to next.

⏺ Here are additional test cases across different system interactions:

---

Case A: Mixed scheduled/unscheduled Chunks + reorder
Bit "Check PRs" (deadline: Friday) 1. "Ask Jimmy" (no date) 2. "Checkout branch" (Wednesday) 3. "Review code" (no date)

User reorders: drags "Review code" to position 1
Result: Order becomes 1→Review code, 2→Ask Jimmy, 3→Checkout branch. No dates change. Wednesday stays on Checkout branch. No conflict fires. Clean. ✓

---

Case B: Chunk dragged to Calendar, then parent deadline shortened
Bit "Research" (deadline: Friday)
Chunk "Read papers" → user drags to Monday in Calendar
Chunk "Write summary" → user drags to Thursday in Calendar

User shortens Bit deadline to Wednesday.
Result: "Write summary" (Thursday) exceeds new Wednesday deadline → blur + "Modify timeline" + ✓/✗. "Read papers" (Monday) unaffected. Single conflict, cleanly handled. ✓

---

Case C: Chunk dragged past parent deadline
Bit "Research" (deadline: Wednesday)
Chunk "Write summary" (Tuesday)

User drags "Write summary" to Friday in Calendar.
Result: Friday > Wednesday → modal: "Update parent Bit's deadline too? ✓/✗"

- ✓ → parent deadline becomes Friday, Chunk on Friday. Valid.
- ✗ → drag cancelled, Chunk stays Tuesday.
  Clean. ✓

---

Case D: Force-completing a Bit with future scheduled Chunks
Bit "Prep presentation" (deadline: Friday)
Chunk 1: "Make slides" (Mon) — completed
Chunk 2: "Practice" (Wed) — not done
Chunk 3: "Dry run" (Thu) — not done

User force-completes Bit on Monday.
Result: Bit → complete (gray, sinkable). All Chunks marked complete. But what about Chunks still showing on Wednesday/Thursday in Calendar? They should appear grayed/completed in Calendar too — visible but
clearly done. ✓

---

Case E: Deleting a Bit with Calendar-scheduled Chunks
Bit "Review apps" has Chunks on Mon, Wed, Fri in Calendar.
User removes the Bit → trash.
Result: Cascade delete — Bit + all Chunks move to trash. Chunks disappear from Calendar view. Restoring the Bit restores all Chunks with their dates. ✓

---

Case F: Restoring a trashed Bit — stale dates
Bit + Chunks trashed last week.
Chunks had dates: last Monday, last Wednesday.
User restores Bit this week.
Result: Chunk dates are now in the past. They should trigger the past-deadline system — blur + "Done? Yes/No" since their dates have passed. This reuses existing logic, no special handling needed. ✓

---

Case G: "On a day" vs timed Chunks in same Calendar day
Tuesday column in Calendar:
Chunk "Call dentist" — 2:00 PM
Chunk "Buy groceries" — no time (on a day)
Chunk "Team standup" — 9:00 AM
Result: Timed items sort by time (9AM → 2PM). Where do no-time items go? Needs a PRD decision — top or bottom of the day column?

My recommendation: No-time items at the top of the day column, before timed items. Rationale: "on a day" means flexible timing — the user can do it anytime. Placing at top keeps them visible as "do whenever
today." Timed items below follow a natural schedule downward.

---

Case H — NEW LOGICAL GAP: Node deadline vs child Bit deadlines
Node "Project Alpha" (deadline: March 30)
Bit 1: "Design" (deadline: March 25)
Bit 2: "Implement" (deadline: March 28)
Bit 3: "Test" (deadline: March 31) ← exceeds parent!
We established: Chunk date cannot exceed parent Bit deadline. Does the same rule apply to Bit dates vs parent Node deadline?

If yes → consistent hierarchy: Node constrains Bits, Bits constrain Chunks. Same blur + "Modify timeline" pattern all the way up. Same modal when dragging past parent deadline.

If no → Bits are free to exceed their parent Node's deadline, and only the Chunk-Bit relationship is enforced.

My opinion: Yes, enforce it consistently. Deadline constraint propagates down the entire hierarchy: Node → Bit → Chunk. Same rules, same UI patterns. If a child's date exceeds its parent's deadline, same
conflict resolution applies. This keeps the system predictable — one rule, applied everywhere.

---

All cases pass cleanly except:

- Case G: Needs your decision on no-time item placement (I recommend top)
- Case H: Needs your decision on Node→Bit deadline constraint (I recommend yes, same rules)

✻ Churned for 1m 8s

❯ hi

⏺ Hey! Take your time — waiting on your thoughts on Cases G and H whenever you're ready.

❯ 1. case C. modal should be 'Child chunk cannot exceed parent bits' deadline. Update parent Bit's deadline too? ✓/✗' is valid.  
2. case G. top seems right.  
3. case H. yes. agree to your opinion.

⏺ All confirmed. The system is now consistent:

- Modal text: "Child chunk cannot exceed parent Bit's deadline. Update parent Bit's deadline too? ✓/✗"
- No-time items: Top of day column in Calendar
- Deadline hierarchy: Node → Bit → Chunk, same constraint and same UI patterns at every level

We've covered most major systems. A few remaining gaps in the left sidebar before we move on:

1. Search — We said vanilla text across Nodes/Bits/Chunks. But what's the UI?

- A) Overlay/modal — search opens a centered overlay on a blurred background (the PRD originally mentioned this with the mascot). Results listed, click to navigate to that item's grid.
- B) Inline panel — search expands in the left sidebar, results filter in real-time as you type.

My opinion: A — overlay. Search is a focused action. An overlay with blurred background gives full-width space for results and separates it from the grid. Real-time filtering as you type. Each result shows: item
name, type icon (Node/Bit/Chunk), parent path (e.g., "Work > Project A"), and deadline if present. Clicking a result navigates to its location.

2. Labs section — The PRD lists Eisenhower Matrix, PARA, Zettelkasten, Excalidraw as beta features visible only on Level 0. Still in the PRD as future/beta, or remove entirely?

My opinion: Keep them listed in the PRD as explicitly deferred/beta, like the mascot. They're part of the vision but not v1 scope. One line each is enough.

✻ Cogitated for 45s

❯ 1. A.  
2. as your opinion.

⏺ Good. I think we've covered all the major logical systems. Let me do a quick inventory of what's been resolved:

Core Systems (all resolved):

- Grid hierarchy (4 levels, cell-based, 12x8, scrollable)
- Node (schema, completion, color propagation, badges)
- Bit (schema, popup, 3-level priority, completion flow)
- Chunk (new concept, timeline, order vs calendar independence)
- Deadline hierarchy (Node → Bit → Chunk, consistent rules)
- Aging system (mtime-based, 0-5/6-11/12+ day thresholds)
- Deadline urgency (3 red levels + past-deadline blur)
- Edit mode (jiggle + click-edit + delete)
- Calendar:Weekly/Monthly (global views, separate from grid)
- Navigation, breadcrumbs, Node description subtitle
- Left sidebar (foldable, all functions defined)
- Search (overlay, real-time, Nodes/Bits/Chunks)
- Trash zone (cascade, grouped, 30-day auto-delete, restore)
- Move system (drag-to-Node, drag-to-breadcrumb, "Move to...")
- New item creation (context-aware per level)
- Auto-placement (BFS)
- Bit → Node promotion (one-way only)

Deferred:

- Mascot (AI-powered, future)
- Labs (Eisenhower, PARA, Zettelkasten, Excalidraw — beta)

Are there other areas you want to explore, or are you ready for me to consolidate everything into a structured design proposal?

✻ Churned for 30s

❯ as far as i'm concerned, we discussed many of our logical systems at this point;but for opportunity cost, let's check once more focusing on logical flow and user's mental model for better prd.

⏺ Good call. Let me walk through the entire user journey and mental model systematically to find any remaining gaps.

---

User Journey: First-Time Experience

User opens GridDO → sees Level 0 grid → empty.

Gap 1: Onboarding is undefined. We said "use a basic sample guide to teach the left-node/right-bit pattern." But we never specified what this looks like. Is it:

- Pre-populated example Nodes the user can delete?
- A brief overlay/tooltip tutorial?
- An empty grid with ghost/placeholder hints?

My opinion: Ghost placeholders — a few dashed-outline Nodes with labels like "Try: Work, Personal, Hobbies" at Level 0 that disappear once the user creates their first Node. At Level 1, similar ghost hints:
"Nodes go here (left)" and "Bits go here (right)." Non-intrusive, no tutorial to dismiss, learns by doing.

---

User Journey: Creating Items

User clicks "+" at Level 1 → selects Bit → auto-placed via BFS.

Gap 2: Where does BFS start? The 2-way split means Bits should auto-place on the right side, Nodes on the left side. If BFS starts from the center of the grid, a Bit might land on the left (Node territory).

My opinion: BFS starting position should be context-aware:

- Creating a Node → BFS starts from top-left of the grid
- Creating a Bit → BFS starts from top-right of the grid
- This respects the 2-way split naturally

---

User Journey: Bit Detail

User clicks a Bit → popup opens → sees the timeline and Chunk area.

Gap 3: What does an empty Bit detail look like (0 Chunks)? The timeline is the "killer feature" of this component. With no Chunks, is it:

- Empty timeline with a prompt: "Add your first step"?
- Just the Bit properties (title, description, deadline, priority) with a "+" to add Chunks?

My opinion: Show the empty timeline with a single call-to-action: "Add a step" button. The timeline structure (vertical line, dot) should be visible even when empty to establish the visual pattern. When the
first Chunk is added, it appears on the timeline immediately.

---

User Journey: Scheduling

User opens Calendar:Weekly → drags a Bit to Wednesday → deadline set.

Gap 4: How does the user unschedule an item? If a Bit was dragged to Wednesday and the user changes their mind, how do they remove it from the calendar day?

- Drag it back to the Items Pool?
- An "✗" remove button on the item in the day column?
- Right-click → "Remove from schedule"?

My opinion: Drag back to Items Pool is the most intuitive (reverse of the scheduling action). But also show a small "✗" on hover over the item in the day column as a quick alternative. Unscheduling clears the
deadline (returns to "no date").

---

User Journey: Sidebar Folded

User folds the left sidebar for full grid focus.

Gap 5: How do they access sidebar functions while folded? Search, Calendar, Edit mode, theme toggle — all live in the sidebar. If it's fully collapsed:

My opinion: When folded, show a thin strip with icon-only buttons (same icons as unfolded: +, pencil, search, sun/moon, calendar). Click any icon to either trigger the action directly (search overlay, theme
toggle) or unfold the sidebar (edit mode, calendar). This way core functions are always one click away.

---

Mental Model: Deep Urgency Visibility

Gap 6: A Level 3 Bit with an approaching deadline is invisible from Level 0.

Badge propagation is one-level only. The Level 0 Node shows no indication. The user's only way to see it is Calendar mode.

For your target users (procrastinators), relying on them to proactively check Calendar is risky. Should there be:

- A subtle global indicator somewhere (e.g., a small red dot on the Calendar sidebar icon when ANY item across the project is urgent)?
- Or is Calendar mode sufficient?

My opinion: Add a notification dot on the Calendar icon in the sidebar when urgent items exist anywhere in the project. It reuses the same urgency colors (light/medium/deep red based on the most urgent item).
Tiny change, huge safety net. Doesn't clutter the grid, just says "something needs attention — check Calendar."

---

Mental Model: Consistency Check

A single Bit can appear in 4 places:

1. Level 1-2 grid (spatial position)
2. Calendar:Weekly day column (temporal position)
3. Items Pool in Calendar mode
4. Search results

Gap 7: Changes in one place must reflect everywhere. Completing a Bit from Calendar → it shows gray on the grid too. Editing title from the grid → updates in Calendar. This is implicit but worth stating in the
PRD as a data consistency principle: one source of truth, multiple views.

---

Summary of gaps found:

┌─────┬──────────────────────────┬───────────────────────────────────────────────┐
│ # │ Gap │ My recommendation │
├─────┼──────────────────────────┼───────────────────────────────────────────────┤
│ 1 │ Onboarding │ Ghost placeholders, learn by doing │
├─────┼──────────────────────────┼───────────────────────────────────────────────┤
│ 2 │ BFS start position │ Context-aware: Nodes→top-left, Bits→top-right │
├─────┼──────────────────────────┼───────────────────────────────────────────────┤
│ 3 │ Empty Bit detail │ Show empty timeline + "Add a step" CTA │
├─────┼──────────────────────────┼───────────────────────────────────────────────┤
│ 4 │ Unschedule from Calendar │ Drag back to pool + "✗" on hover │
├─────┼──────────────────────────┼───────────────────────────────────────────────┤
│ 5 │ Folded sidebar access │ Icon-only strip with core actions │
├─────┼──────────────────────────┼───────────────────────────────────────────────┤
│ 6 │ Deep urgency visibility │ Red notification dot on Calendar sidebar icon │
├─────┼──────────────────────────┼───────────────────────────────────────────────┤
│ 7 │ Multi-view consistency │ State as data principle in PRD │
└─────┴──────────────────────────┴───────────────────────────────────────────────┘

What are your thoughts on each?

✻ Sautéed for 1m 24s

❯ 1. gap4: except right-click.  
2. gap5: user should re-open the sidebar for function access. when sidebar is folded and user mouse-enters any areas of the left sidebar section(folded), give focus to the re-open button(color red + scale) to  
notice user re-open is needed.  
3. we discussed badge propagation up hierarchy before. i chose b. one level up, but didn't hear your opinion. give me your opinion about this. this also deals with gap 6.  
4. i agree all your other opinions for the gaps.

⏺ On badge propagation (Gap 3/6):

I think your choice of one level up is correct, and here's why:

The noise problem with full propagation: If badges bubbled up from Level 3 to Level 0, a Node like "Work" would almost always have a red badge — because somewhere deep inside, there's always something
approaching a deadline. When a badge is always on, users learn to ignore it. It becomes visual noise, which is the opposite of helpful for overwhelmed users.

One level up keeps badges meaningful. When you see a badge on "Frontend" (Level 2), it means "something in HERE needs attention." It's a focused, actionable signal. You're one click away from the issue. That's
useful. A badge on "Work" (Level 0) saying "something somewhere 3 levels deep is urgent" — that's anxiety, not actionability.

But you need a global safety net. One-level-up has the blind spot we identified: deep urgency is invisible from Level 0. This is where Gap 6 comes in as the complement:

- Badge (local awareness): "What's urgent in my immediate children?" — one level up
- Calendar icon notification dot (global awareness): "Something somewhere in your project needs attention" — scans ALL levels

Together they form a complete system:

1. User sees red dot on Calendar icon → opens Calendar:Weekly
2. Calendar shows all urgent items globally with the 3-level red system
3. User can click the item to navigate directly to its location

Without the Calendar dot, one-level-up has a real gap. With it, the two mechanisms cover each other. The badge gives local precision, the Calendar dot gives global coverage.

So: keep your choice (B), but the Calendar notification dot becomes essential — not a nice-to-have, but a core feature.

Shall we proceed to consolidating the design, or do you want to explore more areas?

✻ Cogitated for 34s

❯ i agree your opinions. let's proceed consolidating.

⏺ Here's the consolidated design from all our discussions. Review each section — flag anything that's wrong or missing.

---

1. Core Concepts

Three-tier hierarchy:

- Node — Category/container. Square, mobile app icon design. Uses nouns. Can contain child Nodes and Bits.
- Bit — Actionable task. Horizontal rectangle. Uses verbs/short sentences. Contains Chunks.
- Chunk — Smallest unit of work. Steps within a Bit. Displayed in a vertical timeline inside the Bit detail popup.

Hierarchy depth: Maximum 4 levels (0-3). Level 3 allows Bits only (no new Nodes).

---

2. Schemas

Node:

┌──────────────┬──────────┬────────────────────────────────────────────────────────────────────────────────────┐
│ Field │ Required │ Notes │
├──────────────┼──────────┼────────────────────────────────────────────────────────────────────────────────────┤
│ Title │ Yes │ Nouns preferred │
├──────────────┼──────────┼────────────────────────────────────────────────────────────────────────────────────┤
│ Description │ No │ Shown below breadcrumb when inside the Node's grid │
├──────────────┼──────────┼────────────────────────────────────────────────────────────────────────────────────┤
│ Color │ Yes │ Icon/accent color. Propagates to child Bits at low saturation. Color wheel picker. │
├──────────────┼──────────┼────────────────────────────────────────────────────────────────────────────────────┤
│ Icon │ Yes │ User-selected │
├──────────────┼──────────┼────────────────────────────────────────────────────────────────────────────────────┤
│ Deadline │ No │ Optional. Can be set by dragging to Calendar │
├──────────────┼──────────┼────────────────────────────────────────────────────────────────────────────────────┤
│ mtime │ Auto │ Modified time, drives aging system │
├──────────────┼──────────┼────────────────────────────────────────────────────────────────────────────────────┤
│ created_time │ Auto │ │
├──────────────┼──────────┼────────────────────────────────────────────────────────────────────────────────────┤
│ parentId │ Auto │ References parent Node │
├──────────────┼──────────┼────────────────────────────────────────────────────────────────────────────────────┤
│ x, y │ Auto │ Column/row indices on grid │
└──────────────┴──────────┴────────────────────────────────────────────────────────────────────────────────────┘

Bit:

┌──────────────┬──────────┬──────────────────────────────────────────────────────────────┐
│ Field │ Required │ Notes │
├──────────────┼──────────┼──────────────────────────────────────────────────────────────┤
│ Title │ Yes │ Verbs/short sentences preferred │
├──────────────┼──────────┼──────────────────────────────────────────────────────────────┤
│ Description │ No │ Shown in Bit detail popup │
├──────────────┼──────────┼──────────────────────────────────────────────────────────────┤
│ Icon │ Yes │ │
├──────────────┼──────────┼──────────────────────────────────────────────────────────────┤
│ Deadline │ No │ Date + optional time. "On a day" option for no specific time │
├──────────────┼──────────┼──────────────────────────────────────────────────────────────┤
│ Priority │ No │ high (red), mid (yellow), low (blue) │
├──────────────┼──────────┼──────────────────────────────────────────────────────────────┤
│ Chunks[] │ No │ Zero or more. Progress bar hidden when zero. │
├──────────────┼──────────┼──────────────────────────────────────────────────────────────┤
│ mtime │ Auto │ │
├──────────────┼──────────┼──────────────────────────────────────────────────────────────┤
│ created_time │ Auto │ │
├──────────────┼──────────┼──────────────────────────────────────────────────────────────┤
│ parentId │ Auto │ References parent Node │
├──────────────┼──────────┼──────────────────────────────────────────────────────────────┤
│ x, y │ Auto │ Column/row indices │
└──────────────┴──────────┴──────────────────────────────────────────────────────────────┘

Chunk:

┌─────────────┬──────────┬──────────────────────────────────────────────────────────────────────┐
│ Field │ Required │ Notes │
├─────────────┼──────────┼──────────────────────────────────────────────────────────────────────┤
│ Title │ Yes │ │
├─────────────┼──────────┼──────────────────────────────────────────────────────────────────────┤
│ Description │ No │ │
├─────────────┼──────────┼──────────────────────────────────────────────────────────────────────┤
│ Time │ No │ Optional. For timeline placement. Cannot exceed parent Bit deadline. │
├─────────────┼──────────┼──────────────────────────────────────────────────────────────────────┤
│ Status │ Auto │ complete/incomplete │
├─────────────┼──────────┼──────────────────────────────────────────────────────────────────────┤
│ Order │ Auto │ User-defined sequence in Bit timeline │
├─────────────┼──────────┼──────────────────────────────────────────────────────────────────────┤
│ parentId │ Auto │ References parent Bit │
└─────────────┴──────────┴──────────────────────────────────────────────────────────────────────┘

---

3. Grid System

- Cell-based grid. Coordinates are column/row indices, not pixels.
- Size: 12 columns × 8 rows. Finite but scrollable.
- No auto-expand. Full grid = signal to reorganize.
- Same base size at every level. Level 3 uses full-width (no 2-way split).
- Auto-placement: BFS from context-aware starting position (Nodes → top-left, Bits → top-right).

Level behaviors:

┌───────┬──────────────┬────────────────────────────────────────────────────────────────┐
│ Level │ Content │ Layout │
├───────┼──────────────┼────────────────────────────────────────────────────────────────┤
│ 0 │ Nodes only │ Full grid, no split. Trashbin icon in sidebar. │
├───────┼──────────────┼────────────────────────────────────────────────────────────────┤
│ 1-2 │ Nodes + Bits │ 2-way split: Nodes left, Bits right. Soft guide, not enforced. │
├───────┼──────────────┼────────────────────────────────────────────────────────────────┤
│ 3 │ Bits only │ Full-width, no split. │
└───────┴──────────────┴────────────────────────────────────────────────────────────────┘

Depth visual effects:

- Grid pattern scaling: deeper levels → thinner, denser grid lines
- Vignette effect: deeper levels → faint inner shadow at screen edges

---

4. Navigation & Breadcrumbs

- Breadcrumb: Top of grid. Home > Work > Project A. Click any segment to navigate.
- Node description: Subtitle line below breadcrumb when inside a Node's grid.

---

5. Left Sidebar

Foldable. When folded:

- No icon strip. User must reopen.
- Mouse entering folded sidebar area → reopen button highlighted (red color + scale animation).

Sidebar functions:

- - (New): Context-aware. Level 0 → Node. Level 1-2 → menu: Node/Bit. Level 3 → Bit.
- Pencil (Edit): Enter jiggle/edit mode.
- Search: Opens overlay on blurred background.
- Sun/Moon: Dark/Light mode toggle.
- Calendar: Switch to Calendar:Weekly or Calendar:Monthly (global view).
- Trashbin (Level 0 only): Access trash zone.
- Labs (Level 0 only): Experimental features (deferred).

Calendar icon notification dot: Shows urgency color (light/medium/deep red) of the most urgent item across ALL levels. Global safety net.

---

6. Edit Mode

- Jiggle mode (iOS-style): Dashed grid cells become visible, empty cells show "+".
- Click item to edit properties.
- Drag to reposition between cells.
- Delete items.
- Exit: Click Edit button again or press ESC.

---

7. Aging System

Based on mtime. Computed at render time, not stored.

┌───────────┬───────────┬─────────────────────────────────┐
│ State │ Age │ Visual │
├───────────┼───────────┼─────────────────────────────────┤
│ Fresh │ 0-5 days │ Vivid, original colors │
├───────────┼───────────┼─────────────────────────────────┤
│ Stagnant │ 6-11 days │ Colors fade, mix with grayscale │
├───────────┼───────────┼─────────────────────────────────┤
│ Neglected │ 12+ days │ Covered with dust/noise texture │
└───────────┴───────────┴─────────────────────────────────┘

mtime resets on: Content edits (title, description, properties), Chunk/Bit completion, adding/removing child items. Does NOT reset on viewing or opening.

Node mtime: Also resets when a child Bit is completed or a child Chunk is completed.

---

8. Deadline Urgency System

Applies to both Nodes and Bits. Blinking animation with red saturation levels:

┌───────┬─────────────────┬───────────────────────────────────────┐
│ Level │ Trigger │ Color │
├───────┼─────────────────┼───────────────────────────────────────┤
│ 1 │ 3 days left │ Light red │
├───────┼─────────────────┼───────────────────────────────────────┤
│ 2 │ 2 days left │ Medium red │
├───────┼─────────────────┼───────────────────────────────────────┤
│ 3 │ 1 day ~ D-day │ Deep red │
├───────┼─────────────────┼───────────────────────────────────────┤
│ Past │ Deadline passed │ Blur + "Done? Yes/No" overlay on item │
└───────┴─────────────────┴───────────────────────────────────────┘

Past-deadline behavior:

- Item blurs, "Done?" with ✓/✗ icon buttons overlaid directly on item.
- ✓ → complete the item.
- ✗ → unblur, enter Level 3 (deep red). Never prompts again. User can manually complete later.

Deadline hierarchy constraint: Node → Bit → Chunk. A child's deadline cannot exceed its parent's deadline.

- Dragging child past parent deadline → modal: "Child cannot exceed parent's deadline. Update parent's deadline too? ✓/✗"
- Parent deadline shortened → children exceeding new deadline → blur + "Modify timeline" + ✓/✗.

---

9. Badge System (Nodes Only)

Reflects direct children's deadline states. One level up only.

┌──────────────────┬────────────────────────────┐
│ Child state │ Badge color │
├──────────────────┼────────────────────────────┤
│ Nearing deadline │ Medium red (Level 2 color) │
├──────────────────┼────────────────────────────┤
│ Overdue │ Red │
└──────────────────┴────────────────────────────┘

If multiple children have deadlines, badge shows the most impending child's state. No flag system.

---

10. Completion Flow

Chunk: Toggle complete/incomplete in Bit detail timeline.

Bit:

- Auto-complete: When all Chunks are done.
- Force-complete: User can manually complete at any point.
- Visual: Strikethrough text, gray color, "sinking" animation.
- Post-completion: Stays in place (grayed). User can undo completion or remove → trash.
- Zero Chunks: Progress bar hidden. Simple manual complete toggle.

Node (Level 1-2): Auto-reflects when all internal Bits are done (visual indicator). Level 0 Nodes: never complete — permanent life domains.

---

11. Bit Detail Component

The "killer feature" — vertical timeline for Chunks.

Layout:

- Title, Description, Icon, Deadline, Priority (editable)
- Chunk pool: Unscheduled Chunks (CRUD here)
- Timeline: Ordered vertical timeline. Drag Chunks from pool to timeline.
- Empty state: Visible timeline structure + "Add a step" CTA.

Timeline behavior:

- Order-based by default. Time is optional.
- Dragging = visual signal that timeline is editable.
- Chunks with time sort by time within the timeline; no-time Chunks follow user-defined order.
- mtime label: Subtle "Last updated: X days ago" shown.

Order vs Calendar: Fully independent. Reordering Chunks in the timeline does NOT change Calendar dates. Rescheduling on Calendar does NOT change timeline order.

---

12. Calendar Mode (Global Views)

Accessed from sidebar. Shows all items across the entire project, not scoped to a specific Node.

Calendar:Weekly

Right side: 7 vertical day columns (Mon-Sun). Tall, scrollable.

Left side:

- Node pool (top, larger): Level 0 Nodes as icons only (hover for title). Click to drill down → shows sub-Nodes + Bits inside. Back arrow to navigate up. Search within pool.
- Items pool (bottom): All Bits + Chunks merged. Sorted: deadline items first (by priority + time), no-deadline items below. Search within pool.

Interactions:

- Drag item from pool to day column → sets deadline to that day ("on a day").
- Items with time sort within day column: no-time items at top, timed items below sorted earliest→latest.
- Unschedule: drag item back to pool, or ✗ on hover. Clears deadline.
- 1 item in day → standard Bit component.
- 2+ items → compact list design (colored left border, title, time). Overflow: "+N more."
- Click "+N more" → row expands vertically with vignette effect hiding adjacent columns.
- Collapse expanded: ESC key or click non-Bit area in the column.

Calendar:Monthly

- Standard calendar grid (7 columns × weeks). Left/right arrow navigation.
- Same left panel (Node pool + Items pool).
- Items appear as indicators on date cells with highlight color.

---

13. Search

Vanilla text search across Nodes, Bits, and Chunks.

UI: Overlay on blurred background. Real-time filtering as user types.

Results show: Item name, type icon (Node/Bit/Chunk), parent path (e.g., "Work > Project A"), deadline if present. Click result → navigate to item's location.

---

14. Trash Zone

- Access: Trashbin icon in left sidebar (Level 0).
- Cascade delete: Node + all children go to trash together.
- Grouped view: Deleted Node shows as single entry with child count ("Work" — 3 Nodes, 8 Bits). Expandable.
- Restore: Returns to original parent grid, nearest empty cell if conflict. Auto-restores parent chain if parent was also deleted.
- Permanent delete: "Delete permanently" per item + "Empty trash" for all.
- Auto-cleanup: 30-day retention, then auto-delete. Show "X days until permanent deletion" label.

---

15. Move System

Three mechanisms:

1. Drag onto Node (same grid): Drop item into a Node to move inside it.
2. Drag to breadcrumb: Move to any ancestor grid.
3. "Move to..." menu: Tree browser for distant targets. Respects depth limit (no moving a Node to Level 3).

---

16. Bit → Node Promotion

One-way only (Bit → Node). No reverse.

- Chunks become child Bits in the new Node's grid.
- Calendar dates on Chunks transfer as deadlines on the new child Bits.
- Priority is dropped (Node doesn't have priority).
- Missing Node fields (Description, color) use defaults.

---

17. Node Color System

- Icon/accent color on the Node itself. No-border Node design.
- Color wheel picker for customization.
- Propagation: Child Bits inherit parent Node's color at low saturation.
- Dark mode: Color as subtle left-border accent on Bits (low-saturation background can look muddy).
- Light mode: Low-saturation background tint.

---

18. Onboarding

Ghost placeholders (learn by doing):

- Level 0: Dashed-outline Nodes with hint labels ("Try: Work, Personal, Hobbies"). Disappear after first Node creation.
- Level 1: Ghost hints for the 2-way split ("Nodes here" left, "Bits here" right).

---

19. Multi-View Consistency

One source of truth, multiple views. A Bit/Node/Chunk is the same data whether viewed on the grid, in Calendar, in search results, or in the Items Pool. Changes anywhere reflect everywhere.

---

20. Deferred Features

- Mascot system: AI-powered. Future feature. Includes tail-wag, nudges, recommendations, search integration.
- Labs: Eisenhower Matrix, PARA, Zettelkasten, Excalidraw. Visible only on Level 0 sidebar. Beta/future.
- AI-powered search: Natural language queries via Gemini API. Build on top of vanilla search later.

---

That's everything. Review it and let me know what needs correction before we write the formal PRD document.

✻ Cogitated for 1m 47s

❯ found few future tasks to add for deferred features.

1. griddo is a web-first service. currently, we should focus more on completing the service but considering responsive is our homework.
2. onboarding and cta seems weak, but i have low confidence for this since i haven no idea for this; for now.. we have to discuss more for this.

⏺ Good catches. Adding both to the deferred section:

Updated Deferred Features:

- Mascot system: AI-powered. Future feature.
- Labs: Eisenhower, PARA, Zettelkasten, Excalidraw. Beta/future.
- AI-powered search: Natural language queries via Gemini API.
- Responsive design: GridDO is web-first. Responsive/mobile adaptation is a future priority.
- Onboarding & CTA: Current ghost placeholder approach is a starting point. Needs deeper discussion to strengthen first-time user experience.

Read 1 file, recalled 1 memory, wrote 3 memories (ctrl+o to expand)

⏺ Anything else you want to adjust in the consolidated design, or are we good to proceed with writing the formal PRD document?

✻ Brewed for 1m 1s

❯ proceed.

Read 1 file (ctrl+o to expand)

⏺ Bash(mkdir -p /Users/jwk/Documents/griddo/docs)
⎿  Done

⏺ Write(docs/prd.md)
⎿  Wrote 669 lines to docs/prd.md # GridDO - Product Requirements Document

     ## Table of Contents

     - [1. Overview](#1-overview)
     - [2. Target Users](#2-target-users)
     - [3. Core Concepts](#3-core-concepts)
     - [4. Data Schemas](#4-data-schemas)
     - [5. Grid System](#5-grid-system)
     - [6. Node](#6-node)
     … +659 lines (ctrl+o to expand)

Read 1 file (ctrl+o to expand)

⏺ Agent(Review PRD spec document)
⎿  Done (1 tool use · 23.8k tokens · 23s)
(ctrl+o to expand)

⏺ Spec review: Approved. No blocking issues. Four minor recommendations to tighten clarity:

1. Node Schema — Clarify that Node completion is purely computed (no stored field), not a schema property.
2. Calendar:Monthly — Specify what happens when clicking a date cell (popover? day view?).
3. Grid 12x8 — Make explicit: 12x8 is a hard cap, scrolling is viewport-level only.
4. Trash restore — State that BFS nearest-empty-cell rule also applies to auto-restored parent Nodes.

Let me fix all four.

Read 1 file (ctrl+o to expand)

⏺ Update(docs/prd.md)
⎿  Added 2 lines
92 | x | integer | Auto | Column index on grid |
93 | y | integer | Auto | Row index on grid |
94  
 95 +> **Note:** Node completion state is **purely computed** at render time (derived from whether all child Bits are complete). It is NOT stored as a schema field. No `status` or `completionState`  
 +column exists on Nodes.  
 96 +  
 97 ### Bit Schema
98  
 99 | Field | Type | Required | Notes |

⏺ Update(docs/prd.md)
⎿  Added 2 lines, removed 2 lines
128 ### Grid Structure
129  
 130 - **Cell-based** positioning. Coordinates (`x`, `y`) are column/row indices, not pixel values.
131 -- **Default size:** 12 columns x 8 rows. Finite but scrollable when items are placed beyond the viewport.  
 132 -- **No auto-expansion.** A full grid signals the user to reorganize (promote Bits to Nodes, move items, or restructure). This reinforces the app's philosophy of structured decomposition.  
 131 +- **Default size:** 12 columns x 8 rows. This is a **hard cap** — the grid cannot grow beyond these dimensions. Scrolling is viewport-level only (the fixed 12x8 grid may extend beyond the  
 +visible screen area, but no new cells are created).  
 132 +- **No auto-expansion.** A full grid signals the user to reorganize (promote Bits to Nodes, move items, or restructure). If no empty cell exists, the user is prompted to reorganize.  
 +This reinforces the app's philosophy of structured decomposition.  
 133 - **Uniform sizing** across all levels to reduce complexity.
134  
 135 ### Level Behaviors

⏺ Update(docs/prd.md)
⎿  Added 1 line
432 - **Same left panel** as Weekly (Node Pool + Items Pool with identical behavior).
433 - Items appear as **indicators on date cells** with highlight color.
434 - Items can be dragged from pools to date cells (same deadline-setting behavior).
435 +- **Clicking a date cell** opens a **popover** showing all items scheduled for that day in a list view. Items in the popover are clickable to navigate to the item's grid location.  
 436  
 437 ## 15. Navigation & Breadcrumbs
438

⏺ Update(docs/prd.md)
⎿  Added 1 line, removed 1 line
517  
 518 - Returns item to its **original parent grid**.
519 - If the original cell (`x`, `y`) is occupied, places it in the **nearest empty cell** (BFS).
520 -- If the parent Node was also deleted, restoring a child **auto-restores the parent chain** (no orphans).  
 520 +- If the parent Node was also deleted, restoring a child **auto-restores the parent chain** (no orphans). Auto-restored parent Nodes follow the same BFS nearest-empty-cell placement rule.  
 521  
 522 ### Permanent Deletion
523

⏺ PRD written and reviewed at docs/prd.md. All four reviewer recommendations have been addressed:

1. Node completion state explicitly marked as computed, not stored
2. Calendar:Monthly click behavior defined (popover with day's items)
3. Grid 12x8 clarified as a hard cap with viewport-level scrolling
4. Trash restore BFS rule explicitly covers auto-restored parent Nodes

Please review the PRD and let me know if you want to make any changes before we move to writing the implementation plan.

✻ Cooked for 6m 13s

❯ fine. our next stpe is using superpowers writing plans. but i'd like to use writing-documents skill. show pros and cons of two options and give me your opinion.

⏺ I don't see a writing-documents skill in the available skills list. Could you clarify which skill you mean? Here are the closest candidates:

- superpowers:writing-plans — Structured implementation plan with phases, tasks, execution steps
- oh-my-claudecode:writer — Technical documentation writer (README, API docs, comments)
- oh-my-claudecode:plan — Strategic planning with optional interview workflow

Or did you mean something else? If you're thinking about further refining the PRD document itself (rather than jumping to implementation planning), I can compare that approach against writing-plans too.

✻ Worked for 41s

❯ ls /Users/jwk/.claude/skills  
closing-phase extract-design find-skills vercel-react-best-practices web-design-guidelines  
deploy-to-vercel execute-next-phase vercel-composition-patterns vercel-react-native-skills writing-documents

seems we have writing-documents skill.

Read 1 file (ctrl+o to expand)

⏺ Good find. Here's the comparison:

---

Option A: superpowers:writing-plans

What it produces: A single implementation plan.

Pros:

- Natural continuation from the brainstorming skill we just used
- Lighter weight — goes straight to "what do we build and in what order"
- Faster to produce — one document, one review gate
- Good for getting to implementation quickly

Cons:

- Produces only a plan — no intermediate architecture documents (schema, spec)
- File paths and architecture decisions are embedded in the plan, not derived from a separate spec
- Less traceability — harder to verify that every PRD feature maps to a task

---

Option B: writing-documents

What it produces: A full document chain: SCHEMA.md → SPEC.md → DESIGN_TOKENS.md → EXECUTION_PLAN.md

Pros:

- Structured pipeline with strict ordering — each document builds on the previous
- SCHEMA.md forces explicit data modeling (tables, columns, constraints, RLS) before any code
- SPEC.md defines routes, file organization conventions, architecture decisions — creates a single source of truth for file paths
- EXECUTION_PLAN derives all file paths from SPEC (not invented) — high traceability
- Quality gates per document — catches gaps early
- User review gates between each stage — you approve schema before spec, spec before plan
- Re-run support — handles partial pipelines, PRD changes, cascade regeneration
- Integration contracts with execute-next-phase and closing-phase skills — the output is specifically designed for your existing skill chain
- Better for a project of GridDO's complexity with multiple interacting systems

Cons:

- Significantly more time and tokens — 4 documents instead of 1
- More review gates means more back-and-forth
- May surface PRD gaps (missing auth model, scale constraints, non-features sections) that require PRD updates before proceeding
- Heavier process — could feel like overhead if you just want to start coding

---

My Opinion

Use writing-documents. Here's why:

GridDO isn't a simple CRUD app. It has interacting systems (grids, aging, deadlines, badges, calendar, trash, move, promotion) with complex data relationships (Node → Bit → Chunk hierarchy, deadline propagation,
mtime cascading). Jumping straight to a plan without first formalizing the schema and spec risks:

1. Schema mistakes — The Chunk/Bit/Node relationships, deadline constraints, and mtime cascading rules need explicit column-level definitions before anyone writes code. A plan alone won't catch a missing foreign
   key or a wrong index.
2. File path consistency — With 20+ features, file organization will sprawl unless spec'd upfront. writing-documents forces this discipline.
3. Your learning goals — You mentioned being a beginner developer. The SCHEMA → SPEC → PLAN chain teaches you how professional projects move from idea to architecture to implementation. Each document is a
   learning artifact.

The extra time invested now saves significantly more time during implementation. The writing-documents skill is built for exactly this level of project complexity.

✻ Baked for 39s

❯ i'd like to write all our conversations from this session as a ideation record under docs dir. use haiku model for this task.

⏺ Agent(Write ideation record from session) Haiku 4.5
⎿  Done (1 tool use · 50.3k tokens · 1m 4s)
(ctrl+o to expand)

✻ Sautéed for 2m 33s

7 tasks (6 done, 1 in progress, 0 open)  
 ✔ Offer visual companion  
 ✔ Ask clarifying questions  
 ✔ Propose 2-3 approaches  
 ✔ Present design  
 ✔ Write formal PRD document  
 ✔ Spec review loop  
 ◼ User reviews written spec

### 2. Drag to Breadcrumb

In edit mode, drag an item onto a breadcrumb segment to move it to that ancestor grid. Limited to ancestor Nodes visible in the breadcrumb.

### 3. "Move to..." Menu

For distant targets not reachable via the above methods. Opens a tree/list browser showing all available Nodes. User selects the destination.

**Constraint:** Respects the 4-level depth limit. Cannot move a Node to Level 3 (Bits only).

## 21. Bit-to-Node Promotion

**One-way only.** A Bit can be promoted to a Node. The reverse (Node to Bit) is not supported because flattening a deep hierarchy into a Phases array is lossy.

### Promotion Mapping

| Bit Field   | Node Result                                |
| ----------- | ------------------------------------------ |
| Title       | → Node title                               |
| Icon        | → Node icon                                |
| Deadline    | → Node deadline                            |
| Chunks[]    | → Become child Bits in the new Node's grid |
| Priority    | Dropped (Nodes don't have priority)        |
| Description | → Node description (or empty)              |
| Color       | → Default color assigned                   |

Chunks that had Calendar dates retain those dates as deadlines on the new child Bits.

## 22. Color System

### Node Color

- Expressed through the **icon and accent elements**. No-border Node design.
- **Color wheel** picker for customization.
- User selects from a full color wheel when creating or editing a Node.

### Color Propagation

Child Bits inherit their parent Node's color at **low saturation**:

- **Light mode:** Low-saturation background tint on Bit component.
- **Dark mode:** Subtle left-border accent on Bit component (low-saturation backgrounds can look muddy on dark surfaces).

This provides visual grouping — users can glance at a Bit and identify which Node it belongs to.

### Priority Colors

| Priority | Color  |
| -------- | ------ |
| High     | Red    |
| Mid      | Yellow |
| Low      | Blue   |

## 23. Multi-View Consistency

**One source of truth, multiple views.** A Node, Bit, or Chunk is the same underlying data regardless of where it appears:

1. On the spatial grid (Level 0-3)
2. In Calendar:Weekly day columns
3. In Calendar:Monthly date cells
4. In the Items Pool (Calendar mode)
5. In search results

Changes made in any view are **immediately reflected** in all other views. Completing a Bit from Calendar shows it as complete on the grid. Editing a title from the grid updates it in Calendar. This is a core data consistency principle.

## 24. Onboarding

### Approach: Ghost Placeholders

A "learn by doing" approach using non-intrusive visual hints:

- **Level 0 (first visit):** Dashed-outline ghost Nodes with hint labels (e.g., "Try: Work, Personal, Hobbies"). Disappear after the user creates their first Node.
- **Level 1 (first visit):** Ghost hints indicating the 2-way split pattern ("Nodes here" on left, "Bits here" on right).

> **Note:** The onboarding approach is a starting point and requires deeper discussion. The current ghost placeholder design may need strengthening for better first-time user engagement. This is flagged as a future design discussion item.

## 25. Design Direction

### Visual Principles

- **Highlight the Node in focus.** Use vivid colors for focused/frequently visited Nodes, grayscale for others.
- **Floating Animation:** Subtle floating effect for Nodes and Bits (with ON/OFF toggle in settings).
- **Task Tossing:** Dragging an item over a Node triggers an animation where it "sucks" into the Node.
- **Multi-layered Background:** Fine patterns or gradients instead of simple grid lines to maximize spatial depth.
- **Completion Satisfaction:** Cards sink below the grid and fade to show an "organized state."
- **Magnet Snap:** Items snapping to Calendar day columns or grid cells use a magnet-like animation.

### Blur + Overlay Pattern

A consistent visual language reused across the app for "needs attention" states:

| Context                                        | Overlay Text      | Buttons     |
| ---------------------------------------------- | ----------------- | ----------- |
| Past-deadline Node/Bit                         | "Done?"           | ✓ / ✗ icons |
| Conflicting Chunks (parent deadline shortened) | "Modify timeline" | ✓ / ✗ icons |

### Compact Bit Design (Calendar Day Columns)

When 2+ items exist in a Calendar day column, Bits switch from standard to **compact list design:**

- Colored left border
- Title text
- Time on the right
- Date badge in corner
- Overflow: "+N more" with expand/collapse behavior

## 26. Deferred Features

The following features are part of the long-term vision but are **not in scope for v1:**

### Mascot System (AI-Powered)

An AI-powered companion character providing:

- **Tail Wag system:** Idle tail wiggle → nudge (violent wag or head pop-up) → full character with recommendations.
- **Task recommendations/reminders:** "Shall we finish the GridDO PRD today?"
- **Search integration:** Mascot appears during search with suggestions.
- **Aging excavation:** "Remember your workout plan? Why not check in?"
- Powered by AI (Gemini API) for natural language interaction and smart recommendations.

### Labs (Level 0 Only)

Experimental features accessible from the sidebar on Level 0:

- **Eisenhower Matrix (beta):** Spatial redistribution animation. Nodes auto-slide into 4 quadrants (Importance/Urgency).
- **PARA (beta)**
- **Zettelkasten (beta)**
- **Excalidraw (beta)**

### AI-Powered Search

Natural language queries via Gemini API (e.g., "List all guitar related todos"). Builds on top of the vanilla text search as an alternative search path.

### Responsive Design

GridDO is web-first. Responsive layout and mobile adaptation are future work, to be addressed after the core web experience is complete.

### Onboarding Enhancement

The current ghost placeholder approach needs deeper discussion and testing to ensure effective first-time user engagement.
