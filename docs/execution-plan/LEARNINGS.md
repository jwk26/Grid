# GridDO — Execution Learnings

> Cross-phase patterns that generalise beyond a single phase.
> GridDO-specific decisions live in the per-phase archive files.

---

## React Patterns

**Derived state over effect for index/selection resets.** When a selected index needs to reset on query or open changes, compute it inline from combined `{ query, index }` state rather than syncing via `useEffect`. Avoids `react-hooks/set-state-in-effect` and removes a render cycle. *(Phase 7)*

**liveQuery init-guard vs. loading UX.** `isLoading` flags that suppress premature empty-state renders while `liveQuery` hydrates are *not* optimistic-UI violations. Distinguish initialisation guards (`isLoading ? null : <Component />`) from user-visible loading UX (spinners, skeletons). The former is acceptable; the latter violates local-first principles. *(Phase 7)*

**Async-load confirmed-view pattern.** When a component shows a "confirmed" state that depends on async-loaded data, gate the view *mode* on the stable ID and gate the rendered *content* on the loaded record. Coupling both conditions to the same expression causes a visible flash to the unconfirmed state on mount. *(Phase 12)*

**Accept criteria implying user action requires a complete UI path.** Any acceptance criterion that implies a user action (e.g., "creating first node removes hints") requires a fully wired UI path — not just a data layer call. A task is not complete until the trigger surface exists. *(Phase 3)*

**Code existing ≠ acceptance criteria met.** Always verify each acceptance line against live running behaviour before closing a task. Committed code can satisfy none of the observable acceptance criteria. *(Phase 4)*

**Keep a page-local marker until every mounted projection has seen it.** Several mounted `liveQuery` consumers of the same data emit at different times. A marker released at the first observation leaves a later consumer to misclassify the same event (own Trash read as an external deletion). Key the marker by version and keep it until the page unmounts. *(Phase 41, Task 209 MI-1)*

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

**Hover feedback is not release authority.** A neutral or invalid target may still need a visible reason even when its release classifier returns no command. Keep feedback eligibility distinct from mutation eligibility, validate the current source/Scratch and actual target identity, and test the mounted seam as well as the consumer. *(Phase 31, P31-I01/Q05; see Issues_Phase_31.md and technical-correction evidence.)*

**Component-level hooks only — no loops.** `useDraggable` / `useDroppable` cannot be called inside a loop. Create per-item sub-components (`DraggableNodeTile`, `DraggableDot`) to call each hook once. *(Phase 14)*

**Namespace IDs when an item appears on two surfaces.** If the same item registers `useDraggable` in both a pool and a placed-item surface, their IDs collide. Namespace the registration key (e.g., `` `placed:${item.id}` ``) while keeping `data: { id: item.id }` unchanged so `handleDragEnd` reads the real ID from event data. *(Phase 13)*

**Classify drag source before writing in the drop handler.** Items can originate from different surfaces (e.g., a pool vs. an already-placed surface) and require different write logic even when sharing the same drop target. Classify the source explicitly in the drop handler before dispatching any write. *(Phases 13, 14)*

**Always specify boolean gate conditions in AI delegation prompts.** If a component is mode-gated (e.g., only active in an edit state), include the explicit condition (e.g., `disabled: !isActive`) in the prompt and acceptance criteria. Natural-language phrases like "only in edit mode" are not reliably inferred as prop-level constraints. *(Phase 7)*

**Derive a drag-active flag from the `DndContext` events, cancel included.** Escape ends a dnd-kit drag through `onDragCancel`, not `onDragEnd`, so state cleared only in `handleDragEnd` (`useDnd`'s `activeItem`) stays set after a cancelled drag: the grid stayed dimmed and the toast stack stayed pointer-transparent. Clear drag state in `onDragStart`/`onDragEnd`/`onDragCancel` alike, and test the Escape path. *(Phase 49, Task 244; mi-3)*

---

## Dexie v4

**`liveQuery` not `useLiveQuery`.** Dexie v4 removes `useLiveQuery`. Use `liveQuery` from `dexie` with `useState` + `useEffect` subscribe/unsubscribe. `dexie-react-hooks` is not needed. *(Phase 2)*

**Authoritative reconciliation reads need one transaction snapshot.** When a result depends on several related stores, independently opened reads can combine states from different commits and misclassify a complete precondition or postcondition. Read the whole authority set in one Dexie read-only transaction. *(Phase 25)*

**Indefinitely retained evidence needs indexed lookup.** Append-only audit or integrity evidence must use its declared identity index on production paths; a full-table materialization quietly turns permanent retention into growing latency and memory cost. Keep any compatibility scan isolated from the real database path. *(Phase 25)*

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

---

## Accessibility

**Visually-hidden `h1` on every page shell.** Every major page shell needs `<h1 className="sr-only">{title}</h1>` even when the visual design omits a visible heading. *(Phase 4)*

**`aria-controls` must not reference unmounted elements.** When pool content is unmounted on collapse, make `aria-controls` conditional: `aria-controls={isCollapsed ? undefined : "element-id"}`. A permanent reference to a non-existent DOM id is an a11y violation. *(Phase 11)*

---

## Testing (Vitest)

**`vi.hoisted()` for mocks used inside `vi.mock()` factories.** Variables referenced inside a `vi.mock()` factory must be declared with `vi.hoisted()`, not `const`. `vi.mock` is hoisted to the top of the file; a plain `const` is initialized after the factory runs → `ReferenceError`. *(Phase 5.5)*

**`eslint-disable exhaustive-deps` placement.** The `react-hooks/exhaustive-deps` disable comment must go on the line immediately before the closing `}, [deps])` of the `useEffect` — not inside the effect body. *(Phase 5.5)*

**Run the real coordinator when a test proves handoff identity or focus.** With the Archive coordinator mocked, workspace-identity and marker tests passed while every successful Archive remounted the workspace. At least one test must drive the real hook through pending → selection change → terminal and fail on the old code. *(Phase 34, Task 171A)*

**dnd-kit drags need stepped pointer moves.** One-jump drag tools (Chrome DevTools MCP `drag`, Playwright `dragTo`) never pass the 8px sensor activation, so no Staging or Placement drop completed. Use `scripts/dev-fixtures/drag.js` in the Playwright MCP browser. *(Phase 34, Task 172; corrected after the drag trial)*

**jsdom never matches `:focus-visible`.** A keyboard-focus test needs a stubbed `matches`, and its negative tests pass with no implementation at all. Check the browser heuristic (Tab, mouse, drop, click) in the mounted app before claiming focus-visible behavior. *(Phase 35, Task 179A)*

---

## Recipe-Driven Implementation

**Recipe geometry constraint.** `left-[X]` inside a `pl-N` container must satisfy `X = padding-left + (element-width / 2)`. Validate before delegating implementation — spatial relationships are not inferred from prose descriptions. *(Phase 8)*

**Add component ownership notes to recipes.** A one-line ownership note per component boundary in the recipe prevents duplicate-render bugs that are invisible to screenshot review. *(Phase 8)*

---

## Supabase / Postgres

**A full disk can leave Docker image layers with empty files.** When the system disk filled during `supabase start`, extracted layers kept 0-byte files, and later pulls reused them: `pgsodium_getkey.sh` was empty, so the database container exited with `FATAL: invalid secret key`, identically with a fresh `supabase init`. Remove the images, prune, pull again and check a known file's size (`pgsodium_getkey.sh` = 208 bytes). Keep about 10 GB free for local Supabase. *(Phase 42, Task 213, MI-3)*

**postgrest-js reports a request that got no response as status 0, not as a thrown error.** An `rpc()` whose connection drops resolves with `status: 0` and an error object, so code that only catches exceptions treats a write of unknown outcome as an ordinary failure. Map status 0 to the unknown outcome (refetch, never resend). *(Phase 42, Task 217)*

**Apply envelope rows by version, not by arrival.** Two writes to different records of one account can answer out of commit order, and a cascade (a move that changes a descendant's `level`) makes the older answer carry an older copy of the newer record. Ignore an upserted row whose `version` is lower than the base row's; apply an equal one. *(Phase 42, Task 217, MI-6)*

**Change-set tests that run in one transaction can hide a missing row.** Every write in one test transaction shares `now()`, so a parent row a function forgot to return in `changes` already carries the expected `mtime` and the "before + changes = after" check still passes. Reset the `mtime` values before each call, and prove the test by dropping the row from the function once (it must fail). *(Phase 43, Task 219)*

**`supabase db advisors` is not the dashboard Security Advisor.** The CLI reported no security issue on production while the dashboard lists `authenticated_security_definer_function_executable` for each client write function. A phase close that checks for new Advisor warnings reads the dashboard list. *(Phase 43 close)*

**Check a client-named parent's kind before locking its children.** `stage_candidate` and `delete_breakdown` locked the source row before checking that the Bit the client sent as the Scratch was an Inbox Scratch; with an ordinary Bit, the lock order became Grid Node → Bit → row and could deadlock a placement (Inbox → Scratch → row → target). A function that takes a parent id from the client checks the parent's role right after locking it and before locking any child row. *(Phase 44, Tasks 222–223)*

**A guard in SQL is false only when it is not null.** In `reconcile_trash_scratch`, `jsonb_typeof(null) = 'array'` is null, so `when not inputs.ok` was skipped and a null set on a Scratch with no candidates classified `not_applied` or `already_applied`. Wrap a guard built from arguments in `coalesce(…, false)` and test each null argument on a record where the other rules would pass. *(Phase 44, Task 224)*

---

## Workflow / Process

**Spec ambiguities break delegation.** Codex follows formulas literally. Resolve any contradiction in docs *before* delegating — ambiguous specs produce spec-conformant but wrong implementations. *(Phase 1)*

**Stub the correct algorithm shape.** Even when deferring a utility (e.g., BFS), implement the same algorithm shape in the stub. A linear scan from `(0,0)` is not equivalent to BFS from the original position. *(Phase 1)*

**Branch base verification before writing code.** `git log --oneline origin/main..HEAD` must be empty at phase start. A branch repair mid-phase is expensive; detect and fix before writing any code. *(Phase 5)*

**Audit docs without close-out steps become debt.** Audit action items are plan tasks — give each a status and owner before the session ends. An audit left without follow-up tracks has zero execution value. *(Phase 4.5)*

**Scope drift detection at phase close: diff content, not file path.** Classify dirty files by `git diff` content and plan cross-reference, not by path proximity to the phase work. Phase N+1 changes can accumulate in directories adjacent to Phase N work. *(Phase 9)*

**Verify a claim with the real execution modality it depends on.** A structural fake can prove arithmetic or shape, but it cannot prove IndexedDB/Dexie serialization and rollback. Match the test harness to the claimed invariant; keep a control that demonstrates the failure would be visible without the protection. *(Phase 23, Task 104)*

**Use runner-native focused commands.** With Vitest, `pnpm test -- <files>` may still run the whole suite depending on the package script. Use `pnpm exec vitest run <files>` when evidence must prove a genuinely focused run, and record the actual file/test counts. *(Phase 23 pilot)*

**Serialize gates that share generated output.** Logically independent checks are not operationally independent when they read or write the same generated tree. In this project, `next build` and `tsc` can contend through `.next/types`; run them serially unless isolated outputs are configured. *(Phase 23 pilot)*

**Stop a dev server by its own port.** `pkill -f next-server` matched by name and also ended the user's server on another port. Use `lsof -ti tcp:<port> -sTCP:LISTEN | xargs kill`; without `-sTCP:LISTEN` it also returns the Playwright browser connected to that port. After a CSS-only change that does not show, clear `.next` before judging it; with Turbopack remove `.next/dev`, since a restart alone kept serving stale `globals.css` rules (Phase 35, Task 179). *(Phase 41, Task 210)*

**Canonical file boundaries must include the real composition owner.** When an accepted behavior requires a parent component to project child counts or close parent-owned transient state, include that parent and its focused test in the canonical task contract. A child-only file list cannot truthfully own cross-boundary callback or heading behavior. *(Phase 26, Tasks 133–134)*

**Mounted components consume repository truth through dedicated reactive hooks.** Even read-only `liveQuery` and DataStore calls violate the component boundary when placed directly in a coordinator component. Move those reads behind a focused hook API and test both observation replacement and stale-result cancellation, including same-identity context replacement. *(Phase 27, P27-11)*

**A regression task returns behavior defects through a bounded repair task.** When the final regression task finds a shared component or hook defect that predates the phase, an Opus session plans a separate repair task with its own scope review, and the regression task waits for its acceptance. The regression task never fixes it in place. *(Phase 34, Tasks 171A and 172)*

**Prove dev-only code is out of the production build with a non-vacuous search.** Gate the import behind `process.env.NODE_ENV === "development"` with a dynamic import, put a unique marker string in the dev-only module, then search the production output (`.next/static`, `.next/server`) for it and confirm the dev output does contain it. Source maps may still quote the gating source; executable chunks must not. *(Phase 49, Task 243)*

**Run `git diff --check` over the branch, not the working tree.** Bare `git diff --check` sees only uncommitted changes, so whitespace in an already committed file passes every task gate and fails at phase close (`git diff --check origin/main...HEAD`). Run the range form in task gates. *(Phase 42 close)*

**Write a parity deviation into the canonical hook when it is decided.** Task 220's lifecycle decisions (refusals, the `archived_at` rule, `parent_inactive`, idempotent `applied`) were recorded in the ledger only, so SCHEMA's hooks still described Dexie at phase close and had to be reconciled there. A decision that changes a hook's behavior goes into SCHEMA in the same commit as the code. *(Phase 43 close; recurred at the Phase 44 close, where the command contract choices stayed in the ledger's Task 227 notes until the close commit)*
