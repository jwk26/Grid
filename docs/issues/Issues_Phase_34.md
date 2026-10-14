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
- Status: Open (MI-7 blocks browser checks)
- Next: enable chrome-devtools MCP (MI-7), then `/run-task 171`
- Open: MI-1, MI-3, MI-4, MI-7

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
- MI-7 [Open]: chrome-devtools MCP is disabled for GridDO. Claude Code keys every GridDO worktree to the `griddo2-claude` project entry, whose `disabledMcpServers` lists `chrome-devtools`. Enable it with `/mcp` in the worktree before Task 171. The MCP Chrome uses its own profile (`~/.cache/chrome-devtools-mcp/chrome-profile`), opens a visible window and closes when the session ends. Only one session can hold that profile at a time.
- MI-2 [Closed]: closed by the user (2026-10-15).
- Decision: the fixture guard keeps its two exceptions, first-load system Nodes and records the app creates under fixture data (user, 2026-10-15).
