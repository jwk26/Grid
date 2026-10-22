# Flow-Trace Review: Feedback Lane Phases 49–50 (promotion ②)

**Reviewed:** 2026-10-22, round 3, by the independent `expert` reviewer. Read-only: no file edited; `git diff --check` is clean.

- **Round 1:** found G1–G10 and W1–W7. The user decided G1 (new F34: server-side cell choices skip the cells the client reserves, until Task 249), G8 (2) (`Esc` closes one layer per press, edit mode last) and the tab titles (W5). Everything else was repaired mechanically. All seventeen closed in round 2.
- **Round 2:** found N1 (`dev.seed_fixture` did not apply F34) and N2–N5 (the callers Task 249 stops, the cell rule for promoted chunk Bits, the switch's injection point, and Task 246's band wording with a duplicate announcement owner). All five were repaired mechanically and are verified closed below.

**Inputs:**
- Authority: `docs/brainstorming/2026-10-18-staging-item-status-feedback/DECISION.md` F01–F34, its Feedback layer table and `PROMOTION_MAP.md` (including "Flow review round 1"); SaaS `DECISION.md` S41 and S43 (4) as amended.
- `CLAUDE.md`: Architecture 6 and 8; §Workflow lines for Gates, Phase waits, Test data and Local Supabase.
- `docs/SCHEMA.md`: §Not ported, §Internal functions "Cell picking", §Account preparation, the rejection codes and §Database tests.
- `docs/SPEC.md`: the Feedback Lane Amendment, Page Layouts with "Breadcrumb reveal and Home button", the Inbox sections, §Feedback And Network States, §Development state switch and Key File Paths.
- `docs/DESIGN_TOKENS.md`: the DP amendments, §Feedback Status Surfaces, §SaaS App-State Surfaces, Motion Language and Breadcrumbs.
- `docs/EXECUTION_PLAN.md` (working tree): the Readiness Summary, graph, Phase Index, inventories, Tasks 215, 219, 220, 225–240 and 241–250, the writer register and Next Numbers.
- `docs/PLANNING_STANDARD.md` §3, §5.1–5.2 and §6; `docs/issues/Issues_Deferred.md`; `docs/execution-plan/archive/phases-36-40-retired.md`.
- Code parity: `src/lib/utils/breadcrumb-zone.ts`, `src/hooks/use-dnd.ts`, `src/lib/db/indexeddb.ts`, `src/components/layout/{grid-runtime,sidebar,breadcrumbs}.tsx`, `src/components/grid/{grid-view,edit-mode-overlay,create-bit-dialog}.tsx`, `src/components/triage/{staging-zone,breakdown-panel,triage-workspace,hierarchy-explorer}.tsx`, `src/hooks/use-scratch-breakdowns.ts`, `src/stores/{color-theme-store,triage-preferences-store}.ts`, `src/app/{layout,providers}.tsx`, `scripts/dev-fixtures/inbox-triage.js`.

**Decision prerequisites:**
- `DP-FB-01`: owner the user; open; decided in Task 242, now including the editor status positions. It blocks the visual parts of Tasks 243, 244, 245–247 and 248.
- `DP-SAAS-01`: owner the user; open; decided in Task 242 and re-confirmed in Task 225. It blocks the surface slices of Tasks 228, 234, 235, 236 and 238.
- `DP-SAAS-02`: outside this scope (Task 237).

## Flow-Trace Table

| # | Flow / exact source citation | Entry / actor / authority | States and data effects | Task / file / action | Observable acceptance | Decision Prerequisite / Record | Boundary Cases | Ownership Status |
|---|---|---|---|---|---|---|---|---|
| 1 | Success shows nothing; hidden `Added.` / `Saved.` / `Returned to Breakdown.`; F01, F04 | User: Add, Save, Unstage | One polite hidden announcement, one owner | 245 (`breakdown-panel.tsx`, workspace projection); 243 hidden region | "Add success shows nothing … screen reader hears `Added.`" | DP-FB-01 | 246 owns only the Staging side of the Unstage hold (N5 closed) | ✅ Owned |
| 2 | Display delay, presentation only; F02; CLAUDE.md Arch. 6 | Pending or reconciling item | Loader appears only after 300ms | 243 `use-display-delay.ts`; consumers 245–247, 232, 234 | "faster than 300ms shows nothing" | — | 217 or 243 writes the constant first, either order | ✅ Owned |
| 3 | Icons, emphasis, reduced motion; F03 | — | Loader, `?`, `!`; focusable where the host is not in the Tab order | 243 `status-icon.tsx` | "loader static under reduced motion" | DP-FB-01 | NEG-11 exception consistent | ✅ Owned |
| 4 | Inline editor states; F05; `DP-VQ04` amendment | User edits | dirty shows no text; saving/reconciling: loader; pending intent: loader + `Stay here`; not-applied: `!`; conflict and invalidated unchanged | 245 | "editors follow the same rule; conflict view unchanged" | DP-FB-01 (editor positions listed) | — | ✅ Owned |
| 5 | Editor save while offline, across lanes; F05, F18 | Save while offline | Draft kept; offline toast; one offline source | 245, 232, 233; whichever lands second wires helper and monitor and removes `breakdown-panel.tsx`'s `navigator.onLine` | "offline editor save keeps the draft and shows the toast" | — | — | ✅ Owned |
| 6 | Breakdown 22px slot and Delete; F06, F07; MI-21 row part | User deletes | Slot reserved; `Check again` in the action cluster | 245 | "row reserves 22px, not 160px"; locked-row icon reachable by keyboard | DP-FB-01 | — | ✅ Owned |
| 7 | Add field status; offline Add; SPEC §Breakdown Add | User adds | `?`/`!` in the field; from Task 233 offline shows only the toast, no Retry | 245; 233 | "unknown `?` + `Check again`, not applied `!` + `Retry Add`" | DP-FB-01 | — | ✅ Owned |
| 8 | Staging pending/unknown/reconciling; F06, F07 | Stage or Unstage | Corner and row-end icons replace the in-card line | 246 | "pending loader after 300ms; unknown/reconciling `?`" | DP-FB-01 | — | ✅ Owned |
| 9 | Unstage failure `!`; band keeps Stage failures and stale-invalidation notices; F08 | Unstage failure; remote invalidation | Routing in `triage-workspace.tsx` | 246 (zone, workspace, hook) | "Stage failure keeps the band, and so do the stale-invalidation notices" | DP-FB-01 | Both 246 bullets agree (N5 closed) | ✅ Owned |
| 10 | Keyboard reach of Stage projections and integrity slots; F09 | Keyboard | Icon is the focusable element | 246 | "reachable by keyboard and shows its sentence on focus" | — | — | ✅ Owned |
| 11 | Tooltip precedence; F09 | Hover or focus | Staging tooltip leads with the full title; Explorer body keeps the 179A tooltip, slot its own | 246, 247 | 247: "179A title tooltip still shows and never doubles" | — | Matches the code | ✅ Owned |
| 12 | Nodes zone width; F10; MI-21 Staging part | 1024px with the Pool open | One card minimum; auto-fill | 246 | "never narrower than one card" | DP-FB-01 | — | ✅ Owned |
| 13 | Explorer Undo slot; F07, F09 | Undo | `↶` → loader → `?` → `!` | 247 | "`?` checks again and `!` retries" | DP-FB-01 | Runs end to end through injection (#45) | ✅ Owned |
| 14 | Search-result Undo slot | Search | Same slot rule | 247 | "search results behave the same" | DP-FB-01 | — | ✅ Owned |
| 15 | `aria-disabled` rule | Keyboard | Focusable; activation suppressed | 247 | "takes focus and shows its reason" | — | — | ✅ Owned |
| 16 | One tooltip at a time; `aria-describedby` | — | Primitive | 243 | "one at a time" | DP-FB-01 | — | ✅ Owned |
| 17 | Four-theme picker; F28 | User | Shared id list | 241 `color-themes.ts`, store, toggle | "picker shows four themes" | — | — | ✅ Owned |
| 18 | Stored removed id falls back; ISSUE-20-01 | Reload | `validateColorTheme` returns `griddo`; no-flash script reads the shared list | 241 | "stored `terminal` shows `griddo` with no flash" | — | — | ✅ Owned |
| 19 | Removed CSS, fonts, tests | — | Search scoped to theme contexts | 241 | Scoped search returns nothing; the `terminal` operation phase is excluded | — | — | ✅ Owned |
| 20 | MI-13, MI-14, MI-21, ISSUE-20-01; P29-01 and MI-6 rebound; Phase 41 MI-2 Dropped | — | Ledger rows | `Issues_Deferred.md`, `Issues_Phase_41.md` | Rows present and consistent | — | — | ✅ Owned |
| 21 | Retirement of Tasks 180–208; Q3 disposition | — | No live retired owner left | Plan Goal, rules, AF note, inventories; PLANNING_STANDARD §5.2, §6; archive | Archive links and the §5.1 anchor resolve | — | — | ✅ Owned |
| 22 | Toast position with and without the breadcrumb; F12 | Any toast | Top-left anchor | 244, 248 | Grid pages, Inbox, Calendar, Trash named | DP-FB-01 | — | ✅ Owned |
| 23 | Toast during a drag | Drag | Stack translucent, lets the pointer through | 244 | "a drop on a cell under it works" | DP-FB-01 | — | ✅ Owned |
| 24 | Toast colours, icons, stack limit; F15 | — | Status tokens | 244; 232 keeps the settings | "at most three show" | DP-FB-01 | — | ✅ Owned |
| 25 | Full-Grid create dialog; F16 | User | Dialog stays open; `{target}` is the Node whose Grid receives the item | 244 | Includes a Bit from L0 into a full parent | — | — | ✅ Owned |
| 26 | `Cell reserved by breadcrumb` toast dropped | — | — | 249 | Zone search returns nothing | — | — | ✅ Owned |
| 27 | Home on every route; icon order; departure guard; F21 | User | Through the sidebar's `navigate` | 248, 234 | "Home with an Add draft open shows the departure sheet" | DP-FB-01 | Either order of 234 and 248 written | ✅ Owned |
| 28 | Reveal triggers; F22 | User on a Node's Grid | Hover or focus, 3 seconds on entry, any drag | 248 | "shows for 3 seconds on entry …" | DP-FB-01 | — | ✅ Owned |
| 29 | Hiding, fade, picker hold; F23 | — | — | 248 | "hides 1 second after the pointer and focus leave" | — | — | ✅ Owned |
| 30 | `Esc` layers and trigger suppression; F23 as amended | Keyboard | One layer per press: dialog layer → picker → breadcrumb → edit mode; triggers suppressed until leave and return; `Esc` on a segment moves focus to Home | 248, including `edit-mode-overlay.tsx` | "one `Esc` hides the breadcrumb and a second exits edit mode" | — | — | ✅ Owned |
| 31 | Pointer pass-through and ancestor drops; F24 | Pointer, drag | Zone kept until Task 249 | 248 | "a drag drops on an ancestor segment" | DP-FB-01 | Top-left drops belong to 249 | ✅ Owned |
| 32 | Tab order by DOM placement; layering | Keyboard | — | 248 | "Tab from Home enters its segments" | — | — | ✅ Owned |
| 33 | Tab title per page; F25 as amended | Navigation | Each page sets its own | 248 (grid-runtime, Calendar and Trash pages); 239 | "each page shows its tab title … also after client navigation" | — | — | ✅ Owned |
| 34 | Deadline chip in the row; F25 recheck | User | — | 248 | User rechecks | — | — | ✅ Owned |
| 35 | Reduced motion for the reveal | — | — | 248 | "nothing moves" | — | — | ✅ Owned |
| 36 | Zone removal: Add, placement, drops; F26 | User | Guards removed | 249 | "accept Add, placement and drops … including a top-left cell under the revealed bar" | — | — | ✅ Owned |
| 37 | Zone migration: no-op in 227 → Dexie side in 230 → interface in 249, either order of 230 and 249 | — | `settings` unused; no Dexie version bump | 227, 230, 249 | "no zone code or `settings` use remains" | — | — | ✅ Owned |
| 38 | F34 server cell choice for system Nodes, unhide, restore, unarchive, promotion; SCHEMA "Cell picking" | Client through `supabase-store.ts` and `session.ts` | `internal.pick_free_cell`; reserved block skipped; malformed list rejected with `invalid_input`; default `[]` | 215, 219, 220 (SQL and suites); 227, 228 | DB tests: reserved cells skipped, malformed rejected, default unchanged | — | Create, move and placement take the client's cell (`use-dnd.ts` passes the static block) | ✅ Owned |
| 39 | Promotion: cells for new chunk Bits | Promotion | First free cell in row-major order, skipping the block | SCHEMA "Cell picking"; 220 promotion suite | Suite asserts the block is skipped | — | N3 closed | ✅ Owned |
| 40 | Seed and fixture keep the block free; F34 | Seed copy; `dev.seed_fixture` | 237: seed rows outside x&lt;3, y&lt;2; 229: `ensure_account()` is called with the block | 237, 229 | DB tests cover the system Nodes and every scenario item | — | Stays in the dev-only function after 249 (N1 closed) | ✅ Owned |
| 41 | F34 retirement at Task 249, ordered against Phases 46–48 | 249 on `main` before or after 230–240 | Client stops passing; server keeps its default | 249 (`supabase-store.ts`, `session.ts`); 235, 236 call-site rule; register rows | "a restore, an unhide or a promotion into a Grid whose only free cells are top-left lands there" | — | N2 closed | ✅ Owned |
| 42 | Launch before Task 249 | Production guests | Clients pass the block, server skips it, client writes guarded; 249 later deploys with no SQL change | 227, 228, 237; 249 | Covered by the DB suites | — | Measured zone can exceed 3×2 (advisory) | ✅ Owned |
| 43 | Last selected Scratch; F27; MI-14 | Reload, new session | Validated id; falls back to the first active Scratch | 250 | "reload returns … other account falls back" | — | Search-hidden rule unchanged | ✅ Owned |
| 44 | State switch only in development builds; F30 | Developer | — | 243 | "production build contains no switch code" | — | — | ✅ Owned |
| 45 | Outcome injection at the `DataStore` boundary | Phase 50 checks | Development-only wrapper applied in `getDataStore()` to whichever store it returns | 243; `saas-datastore` row; 228 acceptance | "an injected unknown or not-applied outcome runs the real `Check again` or `Retry` path" | — | Survives the 228 store switch (N4 closed) | ✅ Owned |
| 46 | Connection badge hues, 243 tokens used by 234 | — | — | 243, 234 | Badge per state | DP-SAAS-01, DP-FB-01 | — | ✅ Owned |
| 47 | Toaster (244) vs helper (232); the 17 kept calls | — | — | 244, 232 | — | — | — | ✅ Owned |
| 48 | `DP-SAAS-01` decided in 242, confirmed in 225 | User | — | 242, 225 | Recorded and re-confirmed | DP-SAAS-01 | — | ✅ Owned |
| 49 | Phase 50 presentation under real latency | — | Throttled network on local Supabase | 247 verification; 234 for what is on `main` | Add, Stage and Undo under throttling | — | — | ✅ Owned |
| 50 | Phase 50 on local Supabase; reseed after a SaaS reset | — | No reset or migrations during the phase | CLAUDE.md; shared rules | — | — | — | ✅ Owned |
| 51 | Phase 50 hooks alongside Phase 46 (Task 230) | — | Register lists 230, 232 and 233 where they share files | Register | — | — | — | ✅ Owned |
| 52 | Phase 49 close and `pnpm test:db` | Close | Runs once `main` has it; otherwise the ledger records it as not applicable | CLAUDE.md Gates; shared rules | — | — | — | ✅ Owned |
| 53 | Phase waits consistent | — | Phase Index, lanes table, graph, phase headers, CLAUDE.md, SPEC, DECISION summary | Plan | Consistent | — | — | ✅ Owned |
| 54 | Decision surfaces keep their sentences; F08 | — | — | No task touches them; 245 keeps the conflict view | Conflict view unchanged | — | — | ✅ Owned |
| 55 | Interfaces with promotion ① (F02, F11, F13, F14, F16 copy, F17–F20) | — | — | 232–234 | As planned in ① | DP-SAAS-01 | — | ✅ Owned |
| 56 | F29 checkpoint theme matrix | — | griddo, retro-mac, neumorphism correct; claymorphism not broken | Shared rules; PLANNING_STANDARD §5.2 | — | — | — | ✅ Owned |
| 57 | F31 isolated browser; F32 phase-wait rule | — | — | `.mcp.json --isolated`; WORKFLOW; CLAUDE.md | — | — | — | ✅ Owned |
| 58 | Per-theme finishing of the new surfaces; Paper and Claymorphism | — | — | Theme stage (`2026-10-17-theme-scope-replan`) | — | — | Approved by F29 | ⏸️ Deferred |

Ownership Status: ✅ Owned | ⚠️ Weak | ❌ Gap | ⏸️ Deferred

## Gaps Found

None.

Round 2 repairs, checked in the working tree:

- **N1:** Task 229's `dev.seed_fixture` calls `ensure_account()` with the top-left 3×2 block, and the block stays after Task 249. Its database test covers the system Nodes and every scenario item.
- **N2:** Task 249 names `supabase-store.ts` and `session.ts`. Tasks 235 and 236 state the call-site rule. The `saas-session` row lists 249, and the `reserved-cells` row names the remover.
- **N3:** SCHEMA "Cell picking" covers a new item with no original cell. Task 220's promotion suite asserts the chunk Bits skip the block.
- **N4:** Task 243 and SPEC name the development-only wrapper applied in `getDataStore()`. The `saas-datastore` row lists 243, and Task 228's acceptance keeps the injection working on the Supabase store.
- **N5:** Task 246's first bullet keeps the stale-invalidation notices in the band. `Returned to Breakdown.` has one owner, Task 245's workspace projection.
- **Advisories taken:** `breakdown-hook-test` lists 232 and 233; the Readiness Summary says promotion ② merges before `/run-phase 42`.

## Advisory (non-blocking)

- Applied after round 3: the "promotion ② merges before `/run-phase 42`" condition was only in the Readiness Summary. It is now also in the Phase 42 Phase Index row and the lanes table row 42, where `/run-phase` checks readiness.
- The static 3×2 block can be smaller than the measured zone at 1024px with a long ancestor chain. A server-chosen cell at x ≥ 3, y = 0 could then sit under the bar until Task 249. The client already uses the same static block for parent-change and placement cells, so this is consistent and was accepted with F34.
- Within 3 seconds of entering a Node, leaving edit mode takes two `Esc` presses. This follows from the user's one-layer-per-press decision.
- During Phase 50, local Supabase may carry SaaS-branch migrations that are newer than `main`. They are additive in the current plan; a failing Phase 50 browser check should be compared against `main`'s migrations before it is blamed on the feedback lane.

## Summary

- Flows traced: 58
- Fully owned: 57
- Weak: 0
- Gaps: 0
- Deferred: 1 (approved by F29)
- Decision prerequisites: 2 open (`DP-FB-01`, `DP-SAAS-01`) / 0 closed / 1 out of scope (`DP-SAAS-02`)
- Open prerequisite IDs and blocked task slices:
  - `DP-FB-01` blocks the visual parts of 243, 244, 245–247 and 248.
  - `DP-SAAS-01` blocks the surface slices of 228, 234, 235, 236 and 238.
- Review history:
  - Round 1: G1–G10 and W1–W7; user decisions F34, G8 (2) and the tab titles; the rest mechanical.
  - Round 2: N1–N5; all mechanical.
  - Round 3: none open.
- Flow ownership: PASS
- Implementation readiness: BLOCKED_PENDING_USER_DECISIONS, for the DP slices only.
  - Task 241 is READY once the plan is approved.
  - Tasks 242 and 249–250 need no DP; they follow their task and phase waits.
  - SaaS Tasks 215, 219, 220 and 227–229 need promotion ② on `main` before Phase 42 starts.
