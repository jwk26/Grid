# GridDO — Execution Learnings

> Situational lessons that recur across phases. A lesson that must always hold
> is a rule: it lives in `CLAUDE.md`, `PLANNING_STANDARD.md` §6 or a canonical
> document. A workflow or skill defect goes to the workflow's `FINDINGS.md`.
> On 2026-11-04 the lessons that had become rules moved to those documents with
> their provenance, obsolete Dexie and Codex entries were removed, and
> `docs/tips/Tips.md` was merged here; see this file's Git history.

## How to write an entry

- Add an entry only for something that really happened and can happen again. A phase with nothing new adds nothing.
- Ask first whether a rule must enforce it. If so, it goes to the rule document instead.
- One entry: **the rule of thumb in one sentence.** What happened → what to check next time. *(Phase N, Task M)*
- Keep fact and hypothesis apart: mark an unconfirmed cause `(unconfirmed)`, and correct or remove the entry once it is settled.
- Merge an entry that overlaps an existing one. Link the original ledger or evidence instead of copying its history.
- Section titles name code areas, so that a task can pick the sections for the files it changes.

## Contents

1. [React Patterns](#react-patterns)
2. [Radix UI](#radix-ui)
3. [dnd-kit](#dnd-kit)
4. [CSS / Tailwind](#css--tailwind)
5. [Visual Verification](#visual-verification)
6. [Accessibility](#accessibility)
7. [Testing (Vitest)](#testing-vitest)
8. [Supabase / Postgres](#supabase--postgres)
9. [Planning](#planning)
10. [Workflow / Process](#workflow--process)

---

## React Patterns

**Derived state over effect for index/selection resets.** When a selected index needs to reset on query or open changes, compute it inline from combined `{ query, index }` state rather than syncing via `useEffect`. Avoids `react-hooks/set-state-in-effect` and removes a render cycle. *(Phase 7)*

**Async-load confirmed-view pattern.** When a component shows a "confirmed" state that depends on async-loaded data, gate the view *mode* on the stable ID and gate the rendered *content* on the loaded record. Coupling both conditions to the same expression causes a visible flash to the unconfirmed state on mount. *(Phase 12)*

**Keep a page-local marker until every mounted projection has seen it.** Several mounted live-read consumers of the same data emit at different times. A marker released at the first observation leaves a later consumer to misclassify the same event (own Trash read as an external deletion). Key the marker by version and keep it until the page unmounts. *(Phase 41, Task 209 MI-1)*

**Report an overlay's result on unmount as well as on close.** When another overlay can replace one (a global shortcut opening the command palette), a result reported only from `onClose` is lost. Report it once from whichever comes first, close or unmount, through its own callback. *(Phase 41, Task 212 MI-4)*

**Do not draw an empty state from a not-yet-read array.** A component remounted by `key` restarts every hook it owns from its initial value, so data the parent already holds flashes empty for a frame (`Unknown Scratch`, an empty-rows state). Pass loaded data down as props and draw the empty state only after the read reports ready. *(Phase 35, Task 179A MI-22)*

**Key a measuring effect to what mounts the measured node, not to the route id.** After client navigation a data hook can return the previous record for one render, so a conditionally mounted element (the breadcrumb) mounts a render after the id changed; an effect keyed on the id has already run and measured nothing, and the toast stack stayed over the breadcrumb. Add the mount condition (`showsBreadcrumb`) to the effect's dependencies. *(Phase 49, Task 244)*

---

## Radix UI

**PopoverTrigger `asChild` requires `forwardRef`.** Custom components used as `PopoverTrigger asChild` children must be converted to `forwardRef` and spread `...rest` props onto the underlying `<button>`. Plain function components silently break the trigger — Radix Slot cannot inject `ref` or `data-state`/`aria-expanded`. Tests using manual `onOpenChange` mocks mask this bug class. *(Phase 11)*

**React portal event bubbling.** `PopoverContent` (and any Radix portal) bubbles clicks through the React component tree, not the DOM tree. If an ancestor has `onClick`, clicks inside the portal reach it. Fix: `onClick={(e) => e.stopPropagation()}` on `PopoverContent`. *(Phase 14)*

**Whole-cell click + controlled Popover.** When an outer `div` is clickable to open a popup, add `onClick={(e) => e.stopPropagation()}` to the inner `PopoverTrigger` button to prevent the cell handler from double-firing. *(Phase 14)*

**A focus-opened Radix Tooltip needs controlled state.** Radix Tooltip closes on any ancestor scroll, and keyboard focus itself scrolls the trigger into view, so a tooltip opened on focus closes at once. Hold it open in controlled state until Esc or blur, and hide it with `hideWhenDetached` when the trigger scrolls out of view. *(Phase 35, Task 179A)*

---

## dnd-kit

**Hover feedback is not release authority.** A neutral or invalid target may still need a visible reason even when its release classifier returns no command. Keep feedback eligibility distinct from mutation eligibility, validate the current source/Scratch and actual target identity, and test the mounted seam as well as the consumer. *(Phase 31, P31-I01/Q05; see Issues_Phase_31.md and technical-correction evidence.)* Drag-active, actual hover and drop eligibility are three separate facts: a staged Node can be neutral in Nodes and unavailable in Bits while the pointer is over neither, so a background tied only to the semantic state changes both subsections at drag start. Tie hover decoration to the hovered target and keep the neutral/unavailable/invalid meaning and reason. *(Phase 34, Task 168)*

**Component-level hooks only — no loops.** `useDraggable` / `useDroppable` cannot be called inside a loop. Create per-item sub-components (`DraggableNodeTile`, `DraggableDot`) to call each hook once. *(Phase 14)*

**Namespace IDs when an item appears on two surfaces.** If the same item registers `useDraggable` in both a pool and a placed-item surface, their IDs collide. Namespace the registration key (e.g., `` `placed:${item.id}` ``) while keeping `data: { id: item.id }` unchanged so `handleDragEnd` reads the real ID from event data. *(Phase 13)*

**Classify drag source before writing in the drop handler.** Items can originate from different surfaces (e.g., a pool vs. an already-placed surface) and require different write logic even when sharing the same drop target. Classify the source explicitly in the drop handler before dispatching any write. *(Phases 13, 14)*

**Derive a drag-active flag from the `DndContext` events, cancel included.** Escape ends a dnd-kit drag through `onDragCancel`, not `onDragEnd`, so state cleared only in `handleDragEnd` (`useDnd`'s `activeItem`) stays set after a cancelled drag: the grid stayed dimmed and the toast stack stayed pointer-transparent. Clear drag state in `onDragStart`/`onDragEnd`/`onDragCancel` alike, and test the Escape path. *(Phase 49, Task 244; mi-3)*

**A `disabled` droppable is not a refusal, it is a hole.** Home was `disabled` for Bits, so `pointerWithin` skipped it and the card under the revealed bar took the drop. A target that must refuse stays droppable and refuses in `endDrag`; the same holds for any overlay that sits above live targets. *(Phase 50, mi-9)*

---

## CSS / Tailwind

**Container queries for viewport-independent grid sizing.** Fixed `rem` grid cell sizing breaks across FHD / QHD / UHD. Use container queries with `min(100cqw, 100cqh)` and a pixel cap instead of resolution-dependent branching. *(Phase 9)*

**Hide overflow scrollbars cross-browser.** `[scrollbar-width:none] [&::-webkit-scrollbar]:hidden` on the `overflow-x-auto` container suppresses native scrollbars in both Firefox and WebKit. *(Phase 4)*

**`pointer-events-none` for disabled buttons in a hoverable context.** `opacity-40` dims visually but `:hover` still fires. Add `pointer-events-none` to the disabled element to suppress hover; pointer events pass through to the parent, so a `cursor-not-allowed` wrapper still shows the correct cursor. *(Phase 11)*

**Hover and focus rules change colors and outline only.** A reset selector list that included `button:hover` outranked the default-border rule, so on hover the border fell from 2px to 1px and the whole sheet shrank. Keep `:hover`/`:active` out of shared reset lists and assert in a CSS test that hover/focus rules set no border, padding, font or size property. *(Phase 41, Task 211 mi-2)*

**Put a per-theme row gap on the row's container, not inside it.** A gap kept as `margin-block-end` inside a positioned container made a `top: 50%` control centre on row + gap. *(Phase 41, Task 210 mi-1)*

**Do not animate a container's width under heavy shadows.** In a blur-shadow theme every resized child repaints its shadow each frame (Neumorphism Pool: 13.1ms per frame, a third of frames over 20ms). Change the size in one step and move content with `transform`. A `transform` animation with `both`/`forwards` fill keeps the element a containing block for `position: fixed` descendants after it ends (a drag overlay drew offset); use `backwards` when the last keyframe equals the resting style. A CSS animation restarts only when its name changes, so give each state its own keyframe name when React reuses the element. *(Phase 35, Task 179)*

**Keep `clip-path` motion off an element with `backdrop-filter`.** A clip-path unfold on the blurred breadcrumb surface clipped in Chrome but did not in the user's browser; with `clip-path` and the move on a wrapper element and only the opacity on the blurred surface, it unfolded in both. Check motion in the user's browser, not only in the automation browser. *(Phase 49, Task 242)*

**Style `sonner` toasts through its own attributes.** `sonner` passes no `data-*` props through to its toaster or toasts, so a design role (`toast-stack`, `toast`) is selected by `[data-sonner-toaster]` and `[data-sonner-toast][data-type]`, with a class on the stack. Do not patch the library or add an observer to set attributes. *(Phase 49, Task 244)*

**Fix a theme's override where the theme makes it.** Task 246 capped the Nodes card with a global selector because one theme's `max-inline-size: none` stretched it; the selector out-specified every theme and silently shrank `retro-mac`'s full-width realization. Removing that one theme rule was the fix. *(Phase 50, Task 246 mi-13)*

**Check a CSS value that uses container units in the built stylesheet.** `12.5cqmin` was folded away in the served dev stylesheet, with the cause unconfirmed, while `pnpm build` passed either way; only the emitted `--grid-inset` shows the value that ships. *(Phase 48, Task 238A)*

**Clear the dev build before judging a CSS change that does not show.** With Turbopack a restart alone kept serving stale `globals.css` rules; remove `.next/dev` (or `.next`) and reload before concluding that the change is wrong. *(Phase 35, Task 179)*

---

## Visual Verification

Theme-specific values in these entries are examples. Never carry a number, color or decoration to another theme from here.

**Look at the drag states in the first comparison of a region.** Idle screens can match while a drag brings new backgrounds, overlays, icons and colors; Phase 34 found the Remove opacity, the Node/Bit backgrounds, the Breakdown Return emphasis and the pattern between panels only after Staging was built. In the first comparison run drag start → same-type well → other-type well → Remove/Return → cancel once. This does not move the full verification matrix forward. *(Phase 34, Task 168)*

**Check backgrounds per panel, well, overlay and gap.** An opaque intermediate container can hide the desktop pattern between panels, and a translucent Remove shows the candidate behind it. Making only a background translucent needs a translucent color, not `opacity`, which also fades text and borders; a transparent well inside an opaque subsection still renders opaque. Judge the composed result, not one element's color. *(Phase 34, Task 168)*

**Compare inner sizes, not only the outer shape.** The differences left were the icon frame, glyph, padding and label line, not the Node/Bit shape: a 20px SVG need not draw a 20px glyph, and border and padding change the inner size. In the first comparison crop the icon, text baseline, line-height and border, and confirm that the declared font actually loaded. Keep data, copy and state differences between prototype and production apart from appearance differences. *(Phase 34, Task 168)*

**Know what a browser observer compares.** P34-14 compared the requested fractional pointer coordinate, the native coordinate the sensor consumed and a preview still moving; tie a pointer check to the real input event and the preview that reflects it, and keep the first frame. P34-15's observer expected `0s` while the global reduced-motion CSS sets `0.01ms`; with `transition-property: none` no property transitions whatever the duration ([CSS Transitions §2.1](https://drafts.csswg.org/css-transitions/#transition-property-property)). Check the transitioned property and its real effect, start observing before the input (a short transition can end between animation-frame samples), and never widen a tolerance or delete a failure because the observer was wrong. *(Phase 34, Task 168)*

**Check a first load with a stored theme, not only a toggle.** Switching light to dark can pass while a first load with a stored dark setting fails hydration: the `ThemeToggle` server and client icon trees differed (P34-13). After a shared theme change, load and reload once with stored light, dark and system settings. *(Phase 34, Task 168)*

---

## Accessibility

**Visually-hidden `h1` on every page shell.** Every major page shell needs `<h1 className="sr-only">{title}</h1>` even when the visual design omits a visible heading. *(Phase 4)*

**`aria-controls` must not reference unmounted elements.** When pool content is unmounted on collapse, make `aria-controls` conditional: `aria-controls={isCollapsed ? undefined : "element-id"}`. A permanent reference to a non-existent DOM id is an a11y violation. *(Phase 11)*

---

## Testing (Vitest)

**`vi.hoisted()` for mocks used inside `vi.mock()` factories.** Variables referenced inside a `vi.mock()` factory must be declared with `vi.hoisted()`, not `const`. `vi.mock` is hoisted to the top of the file; a plain `const` is initialized after the factory runs → `ReferenceError`. *(Phase 5.5)*

**`eslint-disable exhaustive-deps` placement.** The `react-hooks/exhaustive-deps` disable comment must go on the line immediately before the closing `}, [deps])` of the `useEffect` — not inside the effect body. *(Phase 5.5)*

**Run the real coordinator when a test proves handoff identity or focus.** With the Archive coordinator mocked, workspace-identity and marker tests passed while every successful Archive remounted the workspace. At least one test must drive the real hook through pending → selection change → terminal and fail on the old code. *(Phase 34, Task 171A)*

**jsdom never matches `:focus-visible`.** A keyboard-focus test needs a stubbed `matches`, and its negative tests pass with no implementation at all. Check the browser heuristic (Tab, mouse, drop, click) in the mounted app before claiming focus-visible behavior. *(Phase 35, Task 179A)*

---

## Supabase / Postgres

**A full disk can leave Docker image layers with empty files.** When the system disk filled during `supabase start`, extracted layers kept 0-byte files, and later pulls reused them: `pgsodium_getkey.sh` was empty, so the database container exited with `FATAL: invalid secret key`, identically with a fresh `supabase init`. Remove the images, prune, pull again and check a known file's size (`pgsodium_getkey.sh` = 208 bytes). Keep about 10 GB free for local Supabase. *(Phase 42, Task 213, MI-3)*

**postgrest-js reports a request that got no response as status 0, not as a thrown error.** An `rpc()` whose connection drops resolves with `status: 0` and an error object, so code that only catches exceptions treats a write of unknown outcome as an ordinary failure. Map status 0 to the unknown outcome (refetch, never resend). *(Phase 42, Task 217)*

**Retained evidence needs an indexed lookup.** Append-only audit or integrity evidence must be read through its identity index on production paths; a full-table read quietly turns permanent retention into growing latency and memory cost. *(Phase 25, on Dexie; the same holds for Postgres)*

---

## Planning

**Recipe geometry constraint.** `left-[X]` inside a `pl-N` container must satisfy `X = padding-left + (element-width / 2)`. Validate before delegating implementation — spatial relationships are not inferred from prose descriptions. *(Phase 8)*

**Add component ownership notes to recipes.** A one-line ownership note per component boundary in the recipe prevents duplicate-render bugs that are invisible to screenshot review. *(Phase 8)*

**Canonical file boundaries must include the real composition owner.** When an accepted behavior requires a parent component to project child counts or close parent-owned transient state, include that parent and its focused test in the canonical task contract. A child-only file list cannot truthfully own cross-boundary callback or heading behavior. *(Phase 26, Tasks 133–134)* To find the owner early, follow where the state appears on screen: Staging's Remove is drawn by the Workspace, Return by Breakdown, and the gap between panels by the shell. A component found this way is not automatically a write owner. *(Phase 34, Task 168)*

**A regression task returns behavior defects through a bounded repair task.** When the final regression task finds a shared component or hook defect that predates the phase, an Opus session plans a separate repair task with its own scope review, and the regression task waits for its acceptance. The regression task never fixes it in place. *(Phase 34, Tasks 171A and 172)*

---

## Workflow / Process

**Stub the correct algorithm shape.** Even when deferring a utility (e.g., BFS), implement the same algorithm shape in the stub. A linear scan from `(0,0)` is not equivalent to BFS from the original position. *(Phase 1)*

**Verify a claim with the real execution modality it depends on.** A structural fake can prove arithmetic or shape, but it cannot prove IndexedDB/Dexie serialization and rollback. Match the test harness to the claimed invariant; keep a control that demonstrates the failure would be visible without the protection. *(Phase 23, Task 104)*

**Use runner-native focused commands.** With Vitest, `pnpm test -- <files>` may still run the whole suite depending on the package script. Use `pnpm exec vitest run <files>` when evidence must prove a genuinely focused run, and record the actual file/test counts. *(Phase 23 pilot)*

**Serialize gates that share generated output.** Logically independent checks are not operationally independent when they read or write the same generated tree. In this project, `next build` and `tsc` can contend through `.next/types`; run them serially unless isolated outputs are configured. *(Phase 23 pilot)*

**Prove dev-only code is out of the production build with a non-vacuous search.** Gate the import behind `process.env.NODE_ENV === "development"` with a dynamic import, put a unique marker string in the dev-only module, then search the production output (`.next/static`, `.next/server`) for it and confirm the dev output does contain it. Source maps may still quote the gating source; executable chunks must not. *(Phase 49, Task 243)*

**When an MCP server will not connect, look first for a disable in the shared local settings.** Tasks 227–229 ran without the Playwright MCP server because `disabledMcpjsonServers` in `griddo2-claude/.claude/settings.local.json`, left by a refusal on 2026-10-21, applies to every GridDO worktree and outranks the enable in the tracked `.claude/settings.json`. Phase 34 MI-7 was the same fault for `chrome-devtools`. After a change, confirm in a fresh session that `/mcp` shows the server connected before a plan relies on it. *(Phase 45 close; cause corrected at the Phase 46 start)*

**Before deleting a reference implementation, freeze its parity test as expected values.** `supabase-store.test.ts` compared the snapshot store's reads against the Dexie store; it was the only test of those reads, so deleting Dexie would have deleted the coverage with it. Task 230 first wrote the Dexie store's current output (ids and order over the same fixture) into explicit expected values, then removed Dexie. When a mapping table pairs old tests with new ones, a parity block is not a counterpart of itself. *(Phase 46, Task 230)*

**For content judged by feel, settle the intent before the numbers.** The demo seed went through four rounds of counts per Grid, and each passed its tests and failed the look. The round that passed named the feel first ("peeking at a real user's account") and tested properties, not fixed counts. *(Phase 48, Task 237)*
