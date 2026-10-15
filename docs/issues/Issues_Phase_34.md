# Issues — Phase 34: Retro Mac Regional Realization

Branch: phase-34/retro-mac-regions · Started: 2026-10-04 (Codex workflow) · Moved to this branch: 2026-10-15
Carried over: MI-1–MI-6 below; P27-06, P27-08 and P29-01 stay in `Issues_Deferred.md`

## Tasks 166–170 (Codex workflow, accepted)

Tasks 166–170 ran on the Codex-era branch `phase-34/retro-mac-frame-pool`.
Their code and canonical documents were imported unchanged in b3db13d.
The original ledger, 39 receipts, verification records and assets are not on main.
They are kept in local tag `archive/phase-34-codex` and in
`/Users/jwk/Documents/phase-34-codex-evidence/`.

| Task | Region | Accepted | What was accepted |
|---|---|---|---|
| 166 | L1 common frame, Scratch Pool | 2026-10-04 | Retro frame and Pool, plus the decorative desktop menu bar |
| 167 | L2 Context, Breakdown | 2026-10-06 | Retro Context at 120.25px, dialog strip and sort labels, shared creation-date contract in SPEC |
| 168 | L3 Staging, drag token | 2026-10-06 | Visible-projection counts, Remove and Return drag feedback. P34-13/14/15 closed by the user |
| 169 | L4 Explorer, replacement search | 2026-10-08 | Header search without breadcrumb, stored icons, folder-tab Node versus Bit distinction |
| 170 | L5 Placement, Newly/Undo | 2026-10-12 | Direct and Staged placement frames, Newly/Undo, Finder drag refinements, common Bit base, green Return versus red unavailable |

`docs/tips/Tips.md` is a temporary, non-canonical memo of lessons from these tasks.
Read it at task start during Phases 34–35.

## Carried over

### Current state
- Status: Open
- Next: `/run-task 172`

### Log
- Decision: carry-over dispositions below approved as proposed (user, 2026-10-15).
- MI-1 [Open]: Q02 canonical consistency from Task 166 (old P34-01, never closed) — the Scratch Pool recipe's shared-row and DP placement wording and the DESIGN_TOKENS singular-row wording still describe the pre-exception layout. Reconcile them to the approved retro-mac Q02 exception at `/end-phase 34`.
- MI-2 [Awaiting User Decision]: DESIGN_TOKENS (3 places) and the shell-chrome, Context and Explorer recipes (5 places) cited Phase 34 receipts and `task-169.md`, which exist only in the archive tag. Fixed as directed by naming the file and the tag (914143c). Close when confirmed.
- MI-3 [Open]: Verification the user waived at acceptance. Task 168: 2 of 16 reduced-motion checks failed (probe contamination suspected, not confirmed) and 21 Staging functional regressions were skipped. Task 170: 4 automated timeouts, with the following keyboard, unavailable and scroll checks unreached. The tooltip items were verified manually by the user. Recheck in Task 172. A reproduced failure returns to its regional owner.
- MI-4 [Open]: Task 169 records left failed or unverified. Retry 150/151 failed, with a BODY focus loss and an error-only button lifetime mismatch. Mounted Undo recovery states (unknown, reconciling, not applied, conflict) are unverified. Recheck in Task 172 under the same rule as MI-3.
- MI-5 [Deferred]: Observations outside Phase 34 scope. On the ordinary Grid, Bit options lose pointer events to another element. On the old Finder menu, a click failed; the menu has since been removed. Index row added at `/end-phase 34`.
- MI-6 [Deferred]: The Explorer locked-pane surface differs from the prototype, as left at Task 169 acceptance alongside D-CARD, P29-01 and Korean QA. Index row added at `/end-phase 34`.
- Decision: the six Phase 31 `WF-*` rows in `Issues_Deferred.md` are Dropped; the Codex post-close audit they wait for no longer exists (user, 2026-10-15). Reflected in the index at `/end-phase 34`.
- Decision: test data comes from `scripts/dev-fixtures/inbox-triage.js` in the Chrome DevTools MCP browser, written new rather than ported (user, 2026-10-15). Reflected in 7ef0f87.
- Decision: Tips handoff-prompt guidance removed (user, 2026-10-15). Reflected in 6e82f8b.
- MI-7 [Closed]: chrome-devtools MCP is disabled for GridDO. Claude Code keys every GridDO worktree to the `griddo2-claude` project entry, whose `disabledMcpServers` lists `chrome-devtools`. Enable it with `/mcp` in the worktree before Task 171. The MCP Chrome uses its own profile (`~/.cache/chrome-devtools-mcp/chrome-profile`), opens a visible window and closes when the session ends. Only one session can hold that profile at a time.
- MI-2 [Closed]: closed by the user (2026-10-15).
- Decision: the fixture guard keeps its two exceptions, first-load system Nodes and records the app creates under fixture data (user, 2026-10-15).

## Task 171 — Realize completion and Archive

### Current state
- Status: Accepted
- Next: none; Task 172 is next
- Open: MI-8 (for Task 172), MI-9 (for `/end-phase 34`)

### Log
- Decision: MI-3/MI-4 stay with Task 172. Task 171 checks only the L6 Archive states (user, 2026-10-15).
- Decision: the confirmation card shows `Every idea segment in "<Scratch title>" has been successfully placed. File it to disk?` below the heading, with the title in bold (user, 2026-10-15). Added as a hidden-by-default element that only retro-mac shows, so other themes are unchanged.
- Stage A accepted by the user (2026-10-15): overlay and Archive card, with the first judgment being the Scratch-title body text and bold title. Reflected in the Stage A commit.
- MI-8 [Open]: after Archive succeeds, focus lands on BODY instead of the destination Scratch context — cause: not confirmed; calling `focus()` on `selected-scratch-context` by hand works, so the app's call in `handleArchiveApplied` (`triage-workspace.tsx`) probably runs before the target is focusable or before the new context mounts. Reproduced at 8e5b1d4, before any Task 171 change, so it is pre-existing and theme-independent. Not fixed here. Recheck in Task 172 together with MI-4 (BODY focus loss).
- Decision: MI-8 goes to Task 172 with MI-4 because it reproduces without Task 171 changes (user's rule, 2026-10-15).
- Archive states checked in the browser at 1920×1080, retro-mac, light (2026-10-15): confirmation, pending, unknown, reconciling (held 20 s), not-applied, storage-failure, conflict, forced-reload recovery, success with next-visible handoff. The card height stayed 198px in each. Not verified: rejected (no way found to force it), previous-visible, filtered-null and true-empty handoff.
- Stage B accepted by the user (2026-10-15): complete state, Reopen, blockers, withdrawal and the forced-reload recovery card. Reflected in the Stage B commit.

### Checkpoint
- Changed: `src/app/globals.css` (retro-mac rules for the Archive overlay and card, completed state, Reopen, blockers, withdrawal; the recovery boundary shares the card rules); `breakdown-panel.tsx` (a hidden-by-default confirmation body with the Scratch title, shown only by retro-mac) (f1e3a44, f76ce49).
- Verified: `git diff --check`, `pnpm test` (1496 passed), `pnpm lint` (0 errors, 11 existing warnings), `pnpm typecheck`, `pnpm build`. Browser states listed in the Log above.
- Please check: the confirmation card text and bold title, the completed state with Reopen, the Add/title blockers, the withdrawal bar, and the card after a forced reload.
- Unresolved: MI-8 goes to Task 172 with MI-4. MI-9 goes to `/end-phase 34`. Not verified: rejected, previous-visible, filtered-null and true-empty handoff.
- Review: skipped; the only logic-adjacent change is a static hidden `<p>`.
- Task 171 accepted by the user (2026-10-15).
- MI-7 [Closed]: closed by the user (2026-10-15); chrome-devtools worked in this session.
- MI-9 [Open]: the confirmation card body (`Every idea segment in "<Scratch title>" has been successfully placed. File it to disk?`) is written directly in `breakdown-panel.tsx` and only retro-mac shows it (hidden elsewhere by CSS) — cause: adopted from the prototype at the user's request in Task 171 (f1e3a44) — fix: at `/end-phase 34`, decide whether it moves into `INBOX_TRIAGE_COPY` and into the canonical documents, and whether a retro-mac-only visible string fits architecture rule 8 (one shared component tree, no theme-specific behavior), since other themes render it hidden.

## Task 171A — Repair Archive handoff retention and Explorer Retry focus

### Current state
- Status: Accepted
- Next: Task 172 resumes (MI-3 and MI-4 Undo recovery rechecks, final regression)
- Open: none

### Log
- Decision: repair task 171A owns MI-8/MI-11 (Stage A, L6 owner) and the MI-4 Retry focus (Stage B, L4 owner); one task, Stage A and Stage B accepted separately; Tasks 169–171 stay accepted and are regression targets; scope review added (user, 2026-10-15).
- Scope review round 1 (expert, 2026-10-15) found G1–G6 and W1, recorded in `docs/reviews/phase-34-task-171A-scope-review.md`. The Staging alert is not part of MI-11: SPEC clears it on every Scratch switch, so it does not survive a successful Archive.
- Decision: after a live not applied, rejected or conflict result, a Scratch switch dismisses the card like Cancel, with no write (user, 2026-10-15, G3b).
- MI-12 [Open]: a second Archive on the same mounted page silently does nothing — cause: after success the coordinator stays `terminal/applied`; only `dismissTerminal` returns to `idle` and it refuses success, while `archiveScratch` refuses any terminal phase (`use-archive-scratch.ts`) — fix: in Task 171A Stage A, keep the terminal-success commit and its one announcement, then accept a later Archive as a new operation (user, 2026-10-15, G4). Reproduced by the expert with a hook test; predates Phase 34.
- Review fixes G1, G2, G3a, G5, G6 and W1 applied to SPEC, the Archive and Explorer recipes, DESIGN_TOKENS and the plan.
- Scope review round 2 (expert, 2026-10-15) found R2-1 (pre-dispatch storage-failure card has no Scratch id), R2-2 (idle reset would drop the success announcement) and R2-3 (selection can change outside the Pool). Fixed as text within the existing decisions; no new user decision.

- Task 171A accepted by the user, Stage A and Stage B (2026-10-15).

### Checkpoint
- Changed: `use-archive-scratch.ts` (second Archive after success, `attemptedScratchBitId`), `triage-workspace.tsx` (recovery gate limited to restored-and-unshown operations, card only on its own Scratch, parent-owned handoff focus in a layout effect, dismiss on leaving the card's Scratch), `use-grid-explorer-search.ts` (`retry` sets a new input focus value) (b2c53a1, 2fc5e25, plus the review-fix commit).
- Verified: `git diff --check`, `pnpm test` (1508 passed), `pnpm lint` (0 errors, 11 existing warnings), `pnpm typecheck`, `pnpm build`. Workspace tests with the real coordinator fail on the old code. Browser (fixture-like data): retro-mac light/dark and griddo light, three consecutive Archives, no recovery boundary, region identity kept, focus never on BODY, last Scratch → `Add item`.
- Please check: Stage A in your own browser (normal Archive, consecutive Archives, a failed result then a Scratch switch). Stage B: error → `Try again` → focus in the search input.
- Unresolved: not verified in the browser: filtered-null handoff, search `Try again` (no way to force an error), Newly Placed marker/Undo and open Explorer search surviving Archive (only the workspace identity is asserted). One commit after Archive shows `Unknown Scratch` as the new title before it loads; not checked whether it predates this task.
- Review: external-removal focus effect could override the Archive focus → fixed (review-fix commit); a pre-dispatch storage failure of a Retry started from the recovery projection left the card hidden → fixed with a test (review-fix commit). The expert lost file access midway and did not read `breakdown-panel.tsx` or the test diff.

## Task 172 — Complete supported modes, accessibility and regression

### Current state
- Status: Implemented, awaiting acceptance
- Next: user acceptance and closing MI-3, MI-4, MI-13
- Open: MI-3, MI-4, MI-13 (all awaiting the user's close)

### Log
- Decision: work plan approved by the user; proceed in Korean (user, 2026-10-15).
- MI-10 [Open]: in dark mode the Context sort chip (`OLD FIRST`) was unreadable, white text on a fixed `#ffffd0` fill — cause: `--triage-context-sort-fill/-hover` were hex literals that ignore the mode — fix: derive both from `--background` with `color-mix` as the Pool chip does; light values unchanged (uncommitted until this checkpoint commit).

- Decision: dark Context chip accepted, 1024px Breakdown truncation is not a defect (user, 2026-10-15).
- Decision: option A, run the MI-3/MI-4/MI-8 rechecks in this task; the leftover `remote row` node in the MCP test profile may be deleted (user, 2026-10-15).

- MI-8 [Open, diagnosed by expert, code-read only]: root cause is not frame timing alone. `applyTerminal` (`use-archive-scratch.ts:178-194`) awaits `onApplied` before recording the terminal state; `handleArchiveApplied` calls `finishScratchArchive`, which changes `selectedScratchId` while the coordinator is still `pending`; the recovery gate (`triage-workspace.tsx:800-808`) then reads it as a forced-reload mismatch and unmounts `ReadyTriageWorkspace`, taking the focused Archive button with it. The one-shot rAF focus (`:881-891`) finds no target. Proposed fix: parent-owned pending focus kind consumed in a `useLayoutEffect` once `terminalSuccess` renders (like `pendingTerminalFocusRef`, `:1698-1711`), plus a gate change so a normal Archive never shows the recovery boundary. The gate change alters the coordinator contract.
- MI-11 [Open, needs browser confirmation]: the same unmount appears to discard page-session state owned under `TriageWorkspaceContent` on every successful Archive (Newly Placed markers and Undo, Staging alerts), against `SPEC.md` 785-786 and 908.
- MI-4 [Open, diagnosed]: the BODY focus loss on Retry 150/151 is the Explorer search "Try again" button (`grid-explorer-search-results.tsx:267-276`), removed when the next run starts; `retry` (`use-grid-explorer-search.ts:386-390`) sets no new focus target. Different mechanism from MI-8. Where focus should land after Retry is a product decision the plan does not make.
- MI-8/MI-11 browser check (2026-10-15, retro-mac light 1920): on a normal Archive the recovery boundary (`archive-recovery-boundary`) renders for one mutation batch, the `Inbox triage workspace` region is replaced by a new element, and `document.activeElement` is BODY afterward. Confirms MI-8 and the unmount in MI-11. Direct loss of a Newly Placed marker was not observed: placing a Staged Bit through CDP pointer/keyboard drag did not complete, so marker loss stays inferred from the code (`useTriageNewlyPlaced` under the unmounted tree).
- Decision: MI-4 Retry focus lands on the Explorer search input, as in the P34-16 Undo repair (user, 2026-10-15). Not yet implemented.
- Decision: MI-8/MI-11 repair owner and scope are settled in an Opus session; no plan, canonical-document or commit change in this task until that decision is committed (user, 2026-10-15).
- Awaiting User Decision: L7 forbids hiding component/hook repair in this task. MI-8/MI-11 need a repair owner and scope, MI-4 needs a focus destination.
- Decision: MI-8, MI-11, MI-12 and MI-10 closed by the user after Task 171A acceptance (2026-10-15). MI-4 Retry is partly done; only the Undo recovery recheck remains.
- Decision: option A, the user places one Bit by hand and the four Undo results are injected (user, 2026-10-15).
- MI-4 [Resolved, awaiting user close]: Undo recovery rechecked in the browser (retro-mac light, 1920×1080): pending, unknown (`Check again`), reconciling (button disabled), not applied (`Retry`, focus stays on it), and a changed-after-placement item (`result-mutated`, `Undo is unavailable`). Layout and copy intact in each. Note: a forced conflict shows `result-mutated`, not a dispatch conflict; the dispatch-time `conflict` path stays covered only by tests. In `result-mutated` the Undo icon stays visible with `aria-disabled=true` and `disabled=false`.
- (earlier, superseded) Awaiting User Decision: Undo recovery states need a placed Bit and an injected Undo result; CDP drag could not complete a placement (Task 171A), and the logic is already covered by `use-triage-newly-placed.test.tsx` and `hierarchy-explorer.test.tsx`. Recommendation: A) user places one Bit by hand in the MCP browser, then I inject the four results and check visuals; alternative B) accept the existing mounted jsdom tests plus the static theme-realization state fixture as the recheck.
- Decision: MI-8, MI-11 and the MI-4 Retry focus move to repair Task 171A; the MI-4 Undo recovery recheck stays here; Task 172 acceptance waits for 171A (user, 2026-10-15). Marker loss in MI-11 is to be proven by a direct test in 171A, since CDP drag could not complete a placement.

### Checkpoint
- Changed: `globals.css` (two Context sort tokens), one CSS assertion in `inbox-triage-theme-realization.test.tsx`.
- Verified: static retro-mac Inbox in light/dark × 1024×768 and 1920×1080 on existing fixture data; no horizontal scroll at 1024; light chip computed value unchanged; `git diff --check`, test (1497), lint (0 errors), typecheck, build pass.
- Please check: the dark Context chip, and the 1024px Breakdown truncation (`ARCHI…`, title `Plan the field stud`), which I treated as the existing compact layout, not a defect.
- Unresolved: MI-3, MI-4 and MI-8 rechecks (interactive keyboard/reduced-motion/Undo recovery states) and the other eight recipe surfaces in states beyond the default view were not run. The fixture was not re-seeded: the test browser holds one non-fixture node (`remote row`) that the guard refuses to clear, so data is the leftover fixture state.
- Review: not run (CSS token change only).

- Checkpoint (second round): Changed: ledger only. Verified: `git diff --check`, `pnpm test` (1508), `pnpm lint` (0 errors), `pnpm typecheck`, `pnpm build`; the browser states in MI-4 above. Please check: the five Undo states. Unresolved: MI-3 (Task 168 reduced-motion and Staging functional regressions, Task 170 keyboard/unavailable/scroll checks) not rerun; dark mode and 1024px not rechecked for Undo states. Review: skipped, no code change.

- MI-13 [Fixed, awaiting user close]: the retro-mac Context sort chip (`OLD FIRST`) showed no focus indicator — cause: its fixed `box-shadow: 1px 1px 0` overrode the Tailwind focus ring and the chip had no `:focus-visible` rule — fix: ink/surface inversion like the Edit control, light and dark, with one test assertion (this commit).
- MI-3 recheck (2026-10-15, retro-mac, 1920×1080, MCP browser): reduced-motion simulated by applying the 15 `prefers-reduced-motion` rules in the live page (the MCP tool cannot set the media feature): 541 elements, none with an animation or a transition above 0.01 ms. CSS only; JS-driven motion not covered. Focus-visible walk over 43 focusable elements in light and dark: all show a change except the sort chip (MI-13).
- MI-3 not rechecked: the 21 Staging functional regressions and the Task 170 narrow-viewport keyboard/scroll/unavailable checks. They need real drags (Stage, Unstage, Direct placement), which CDP could not complete; Staging logic stays covered by the jsdom suites. Needs the user's decision.
- Checkpoint (third round): Changed: `globals.css` (sort chip focus-visible), `inbox-triage-theme-realization.test.tsx`. Verified: `git diff --check`, `pnpm test` (1509), `pnpm lint` (0 errors), `pnpm typecheck`, `pnpm build`; chip focus in light and dark in the browser. Review: skipped, CSS only.
- Decision: the remaining MI-3 checks run now, with the user doing the drags in the MCP browser (user, 2026-10-15). The user confirmed the sort chip focus state as correct.
- MI-3 rechecked with user drags (retro-mac light, 1920×1080 then 1024×768): Stage (Breakdown row dims in place, Staging header `2 BITS`), Unstage (card leaves Staging, row restored, focus on the `Drag breakdown` grip, not BODY), Direct placement confirmation (heading focused, Node/Bit/Cancel all visible). At 1024×768: no horizontal scroll, confirmation 158px in a 180px column with no scroll needed, native Tab goes `[×]` → Node → Bit → Cancel, each visible with a focus-visible change, Shift+Tab back, Enter on Cancel closes without writing and returns focus to the grip.
- MI-3 still not covered: pointer-free (keyboard) Stage/Unstage, staged-result placement (Node/Bit title editing), Staging unknown/reconciling states, long-title (1000 character) scrolling, and 1024 dark. Left as waived or for the user to defer.
