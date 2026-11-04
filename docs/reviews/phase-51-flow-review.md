# Flow-Trace Review: Phase 51 (Stabilization, Tasks 251–254)

**Reviewed:** 2026-11-04, round 4, by the independent `expert` reviewer. Read-only: no file was edited. `git diff --check` against the merge base is clean, and no file under `supabase/` changes.

- **Round 1:** found G1–G4 (user decisions), M1–M3 (mechanical) and W1–W7. The user decided G1–G4 and M2 as ST30–ST36. The rest was repaired mechanically.
- **Round 2:** all round-1 items closed. New: N1 (user decision) and N2 (mechanical), and W8–W11.
- **Round 3:** N1 was decided as ST37; N2 and W8–W11 were repaired. New: R1 (mechanical) and W12.
- **Round 4 (this review):** R1, W12 and the round-3 advisories are applied and verified. No Gap remains.

**Inputs:**
- Worktree `/Users/jwk/Documents/grid-stabilization-pass`, branch `docs/stabilization-pass`, commit `5f217cf`, plus uncommitted edits to:
  - `docs/brainstorming/2026-11-04-stabilization-pass/DECISION.md` (§8, ST30–ST38)
  - `docs/EXECUTION_PLAN.md` (Phase 51 section, Tasks 251–254, register)
  - `docs/SPEC.md` (the amendment header; `/grid/[nodeId]` Unavailable Grid; Bit Detail Popup; the `Esc` order; the editor and Staging unknown-recovery statements; Connection states; Feedback copy)
  - `docs/PLANNING_STANDARD.md` (header and §6)
  - `docs/issues/Issues_Deferred.md`
- Canonical diffs read in round 1: SCHEMA (aging row) and DESIGN_TOKENS (`grid-unavailable`), both unchanged since.
- Code checked across rounds 1–4:
  - Task 252: `use-node.ts`, `liveRead`/`getNode`, `grid-runtime.tsx`, `node-grid-body.tsx`, `app-frame.tsx`, `sidebar.tsx`, `use-bit-detail.ts`, `bit-detail-popup.tsx`
  - Task 253: `use-breadcrumb-reveal.ts`, `hierarchy-explorer.tsx`, `breakdown-panel.tsx`, `triage-workspace.tsx`, `use-dnd.ts`
  - Task 254: `use-triage-operation-lock.ts`, `use-scratch-breakdowns.ts`, `connection-monitor.ts`, `connection.ts`, `snapshot-store.ts`, `session.ts`
  - Task 251: `scratch-modal.tsx`, `node-card.tsx`, `grid-view.tsx`, `grid-cell.tsx`

**Decision prerequisites:** none open. ST30–ST38 record every decision and refinement from rounds 1–3.

## Flow-Trace Table

| # | Flow / exact source citation | Entry / actor / authority | States and data effects | Task / file / action | Observable acceptance | Decision Prerequisite / Record | Boundary Cases | Ownership Status |
|---|---|---|---|---|---|---|---|---|
| 1 | System Node card has no aging; ST09 | Render | — | 251 `node-card.tsx` | Grid and Explorer, against an ordinary Node | — | One `NodeCard` | ✅ Owned |
| 2 | Scratch modal auto-close and hover; ST10 | Pointer and keyboard | — | 251 | Pointer over the panel; keyboard capture with the pointer outside | — | — | ✅ Owned |
| 3 | Dead opacity props; ST11 | — | — | 251 | No reference remains | — | — | ✅ Owned |
| 4 | P27-06 and MI-5 closed; ST12 | — | Ledger | Promotion | Rows present | — | — | ✅ Owned |
| 5 | Address of a Node the account lacks; ST13 | Cold load, reopen, Back | Screen | 252 | Production-build cases | — | — | ✅ Owned |
| 6 | Back/Forward to a Node in Trash or Archive; ST13–ST14 | Back/Forward | Screen | 252 | Forward-to-Trash and archived cases | — | — | ✅ Owned |
| 7 | No flash; ST15 | Navigation | Three read states | 252 `use-node.ts` | "never … one frame" | — | Read error keeps today's behaviour | ✅ Owned |
| 8 | `hiddenFromGrid`, Inbox, Archive; ST14 | Navigation | — | 252 | Still open | — | — | ✅ Owned |
| 9 | Node becomes unavailable while open | Tab B | Grid ↔ screen | 252; SPEC | Tab A/B case, then restore | — | — | ✅ Owned |
| 10 | Screen parts, `h1`, not a second `<main>`; ST17, ST36 | Screen appears | — | 252 `app-frame.tsx`, `grid-unavailable.tsx` | Agent theme checks | ST36 | — | ✅ Owned |
| 11 | Copy, tab title, no breadcrumb, `Go to Home`; ST17–ST18 | User | — | 252 | ST18 copy | — | — | ✅ Owned |
| 12 | Disabled `+`; ST30 | User | Real `disabled`, dimmed, wrapper `title` | 252 `sidebar.tsx` | Not reachable by Tab and Enter | ST30 | — | ✅ Owned |
| 13 | `?bit=` for a Bit the account cannot use; ST31 | Any route | `router.replace`, close after the read | 252 | "no popup remains" | ST31 | — | ✅ Owned |
| 14 | Edit mode and drops on the screen; ST32 | — | No change | — | — | ST32 | — | ✅ Owned |
| 15 | `Esc`: explorer search; ST20 | Keyboard | — | 253 | Closes only the search | — | — | ✅ Owned |
| 16 | `Esc`: editor, including when locked; ST20, ST35 | Keyboard | — | 253 | Editor case and locked case | ST35 | — | ✅ Owned |
| 17 | `Esc`: pointer Triage drag | Mouse/Touch | — | 253 | Cancels only the drag | — | — | ✅ Owned |
| 18 | Keyboard drag | — | — | 253: Grid order test only | — | — | — | ✅ Owned |
| 19 | `Esc`: Add field, Placement affordance, Archive completion area; ST35 | Keyboard | — | 253 | One line each | ST35 | — | ✅ Owned |
| 20 | Grid and Calendar `Esc` unchanged | Keyboard | — | 253 | As before | — | — | ✅ Owned |
| 21 | Undo focus on unblock; ST21 | — | — | 253 | Focus stays | — | — | ✅ Owned |
| 22 | Return to `normal` fires after offline and after `degraded` | Monitor | — | 254 | Browser run | — | — | ✅ Owned |
| 23 | Held editor save, surface gone; ST33, ST38 | Panel remount | The invalidation check counts as the disappearance check | 254 | Acceptance 1 and 5 | ST33, ST38 | — | ✅ Owned |
| 24 | Held Stage/Unstage, surface gone; ST33, ST38 | Candidate or Scratch gone | Background check counts | 254 | Acceptance 1; Unstage by unit test | ST33, ST38 | — | ✅ Owned |
| 25 | Held Add/Delete, panel remount; ST33, ST38 | External-removal handoff | Per-path check unless a check started after the surface began to go; an earlier `Check again` does not count | 254 `breakdown-panel.tsx`, workspace | Acceptance 1 (Add); test: failed `Check again`, then remount, gives exactly one `reconcile_add_breakdown`; Delete by unit test | ST33, ST38 | Delete rows stay listed while non-terminal, so remount is the only path | ✅ Owned |
| 26 | Check fails only on its own path; ST34 | Probe succeeds | No further check | 254 | Acceptance 3 | ST34 | — | ✅ Owned |
| 27 | Check answered with an error while `normal` | Server | Lock stays | 254 records it | Acceptance 4 | ST25 residual | — | ⏸️ Deferred |
| 28 | Workspace unmount; one held operation | Back while locked | Lock and check dropped | 254 | Unit test | — | — | ✅ Owned |
| 29 | Further offline/online cycles | Connection | — | 254 | Acceptance 2 | — | — | ✅ Owned |
| 30 | §6 wording vs ST26, ST33, ST34, ST37 | Close | — | PLANNING_STANDARD §6 | Matches | — | — | ✅ Owned |
| 31 | ST27 scope with the ST33/ST34 files | 254 | — | Stop rule | — | — | — | ✅ Owned |
| 32 | App lane, gates, `test:db` at close, no dump | Phase | — | Shared rules | — | — | — | ✅ Owned |
| 33 | Task order | — | — | 251→252→253→254 | — | — | — | ✅ Owned |
| 34 | Writer register | — | — | Rows present | — | — | — | ✅ Owned |
| 35 | Lane column; ST28 | — | — | Plan | — | — | — | ✅ Owned |
| 36 | Learnings observation; ST29 | Close | — | Shared rules | — | — | — | ✅ Owned |
| 37 | Checkpoint matrix; ST05, ST19 | — | — | 252; §5.2 | — | — | — | ✅ Owned |
| 38 | Daily-use findings; ST06 | — | — | Shared rules | — | — | — | ✅ Owned |
| 39 | Exclusions; ST07 | — | — | Out-of-scope line; `Issues_Deferred.md` | — | — | — | ✅ Owned |
| 40 | Numbering; ST01, ST03 | — | — | Next Numbers | — | — | — | ✅ Owned |
| 41 | ST31 side effects (Grid, Calendar, Inbox Scratch popup; the popup's own Trash and promotion) | Popup | Close as before | 252 | Valid `?bit=` opens as before | ST31 | — | ✅ Owned |
| 42 | `+` disabled only on the screen | L0, Inbox, Archive, Calendar | Unchanged | 252 | — | ST30 | — | ✅ Owned |
| 43 | Focus when the screen appears under an open dialog layer, or with a Bit popup closing on the same read | Tab A/B, Scratch modal, popup | Focus moves after the shell surfaces and the popup close, and only when no dialog layer is open | 252; SPEC | Scratch-modal acceptance; test with a popup closing on the same read | ST36, ST38 | — | ✅ Owned |
| 44 | Every shell create and confirm surface closes; Scratch modal stays | Tab A/B | Not through `closeAll` | 252 | `+` menu, chooser, create dialogs, delete and move confirmations | ST30, ST38 | — | ✅ Owned |
| 45 | Forced states vs the reconnect rule | Tests, browser | The rule reads the real state; forced states earn nothing | 254 `connection-monitor.ts`, `connection.ts` | `context.setOffline`; tests for forced states | ST37 | — | ✅ Owned |
| 46 | Check started during an outage in progress | Surface goes while offline | Earns the next return | 254 | Acceptance 2: back before and after the first probe | ST37 | The earned check starts at `normal`, so its own failure earns nothing | ✅ Owned |
| 47 | `Issues_Deferred.md` residual row | — | Names ST33, ST34, ST37 and both residuals | Ledger | — | — | — | ✅ Owned |
| 48 | Check that starts at `normal` and fails in a short drop, with no failed probe and no `offline` event | Connection | Lock stays until the next outage or a reload | SPEC Connection states | — | ST34 residual (narrowed by ST37) | — | ⏸️ Deferred |
| 49 | DECISION vs SPEC on the ST30, ST33 and ST36 refinements | — | ST38 records them | DECISION §8; Task 252 and 254 Authority lines | — | ST38 | — | ✅ Owned |
| 50 | Focus after a kept Scratch modal later closes over the screen | User | Focus falls to the body | — | — | ISSUE-16-02 (Deferred, a11y pass) | — | ⏸️ Deferred |

Ownership Status: ✅ Owned | ⚠️ Weak | ❌ Gap | ⏸️ Deferred

## Round-3 Items, Verified Closed

- **R1:** the per-path deduplication now counts only a check that started after the surface began to go.
  - SPEC Connection states says: "unless a check of it already started after the surface began to go …; a `Check again` made while the surface was mounted does not count".
  - The Task 254 workspace bullet says the same, and its verification adds "an Add whose `Check again` failed and whose panel then remounts (exactly one per-path `reconcile_add_breakdown`)".
  - ST38 states the rule, adding automatic checks made while the surface was mounted. SPEC's "started after the surface began to go" already excludes them, so the two texts agree.
- **W12:** ST38 records the ST30, ST36 and ST33 refinements.
  - Task 252 Authority cites ST38, Task 254 Authority cites ST37 and ST38, and the Phase 51 Authority line reads ST01–ST38.
- **Advisories:** the SPEC Connection states heading cites ST37 and ST38. SPEC Unavailable Grid and Task 252's verification cover a Bit popup closing on the same read before focus moves.

## Gaps Found

None.

## Advisory (non-blocking)

- The Task 254 scope-limit sentence cites ST27, ST33 and ST34. ST37 and ST38 add no files, so the stop rule's file list is complete.
- The Task 252 file bullet for the focus rule does not repeat the popup-close ordering, but SPEC and the Task 252 verification carry it. The working session should follow SPEC there.

## Summary

- Flows traced: 50
- Fully owned: 47
- Weak: 0
- Gaps: 0
- Deferred: 3:
  - row 27: the ST25 residual, approved by ST25;
  - row 48: the ST34 residual as narrowed by ST37;
  - row 50: ISSUE-16-02, already deferred to the a11y pass.
- Decision prerequisites: 0 open / 0 closed / 0 scoped out. ST30–ST38 are recorded.
- Open prerequisite IDs and blocked slices: none.
- Review history:
  - Round 1: G1–G4, M1–M3, W1–W7. The user decided ST30–ST36; the rest was repaired mechanically.
  - Round 2: N1 (decided as ST37), N2, W8–W11. All repaired.
  - Round 3: R1 and W12. Repaired, with ST38.
  - Round 4: none open.
- Flow ownership: **OWNED**
- Implementation readiness: **READY**, in task order (each task waits for the one before; ST08 and the Phase 51 order line):
  - **Task 251:** READY once `/run-phase 51` opens the phase.
  - **Task 252:** READY once Task 251 is accepted.
  - **Task 253:** READY once Task 252 is accepted.
  - **Task 254:** READY once Task 253 is accepted.
