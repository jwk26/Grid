# Issues — Phase 45: Client Switch

Branch: phase-45/client-switch · Started: 2026-10-26
Carried over: Phase 35 MI-19 (bound to Task 229); Phase 35 MI-23 (absorbed by Tasks 228 and 234); Phase 44 ledger Task 227 notes (Breakdown/Stage/Unstage take no `operationId`; `already_applied` Delete/Unstage envelopes carry no deleted id, so refetch after an unknown outcome; rejection codes per the notes).
Baseline gate (2026-10-26): `git diff --check`, `pnpm test` (2177), `pnpm test:db` (898), `pnpm lint` (0 errors, 11 warnings), `pnpm typecheck`, `pnpm build` all pass.

## Task 225 — Confirm the SaaS surfaces decision `DP-SAAS-01`

### Current state
- Status: Implemented, awaiting acceptance
- Next: Task 225 acceptance
- Open: none

### Log
- Work plan: docs only, no implementation file changes. (1) Compare DESIGN_TOKENS §Approved SaaS app-state realization (SA-1 to SA-6, recorded 2026-10-23, Task 242) with SPEC §Account icon and modal, §App-level screens, §Feedback copy (App-level screens, Account modal, Connection) and the Sidebar line. Finding so far: SPEC's surface sections have no commit since the DP-SAAS-01 record (`01c46c0`); the only SPEC changes after it are Architecture Decision 19 (envelope version ordering, refetch after a state-dependent rejection) and the file table, neither a surface. (2) Show the user, in plain Korean, each of the six surfaces (SA-1 account icon, SA-2 badge, SA-3 loading, SA-4 frame incl. load failure / guest creation failure / security check / session expired / account being deleted / account deleted, SA-5 narrow notice, SA-6 guest and account modal) as one stage; the user re-confirms or adjusts. (3) Record an adjustment, if any, in the same DESIGN_TOKENS section; otherwise change nothing. Verify with `git diff --check`; the user confirms the recorded text. Commit `docs(design): confirm DP-SAAS-01` only if text changes; otherwise the acceptance commit alone.
- Review (advisory, 2026-10-26, work plan): approve with changes. Confirmed: no SPEC surface section changed since `01c46c0` (the later SPEC edits are Decisions 17 and 19 and the file table). Apply: (1) step 2 tells the user that account deletion is now the fallback only (Task 218 result; Phase 42 ledger Task 235 note): after `Delete account` the modal shows `Your account will be deleted within 24 hours.`, and signing in again with the same account within 24 hours shows the SA-4 "Account being deleted" frame as the normal path; SA-4 and SA-6 in DESIGN_TOKENS need no change, and the SPEC copy cleanup is left to Task 235; (2) show SA-1 to SA-6 as renders by re-serving the Task 242 option sheet (`/private/tmp/claude-501/-Users-jwk-Documents-grid-phase-49/7b9f82fe-ed08-4ec5-af36-a4944a329026/scratchpad/sheet/`, its `serve.py` pointed at this worktree's dev server), the recorded options only, not a rebuilt sheet. Not applied: none.
- Stage 1 shown (2026-10-26): Task 242 option sheet re-served at http://localhost:3055/ (`#SA-1` to `#SA-6`) against this worktree's dev server on 3045; the recorded text in DESIGN_TOKENS is the authority, the sheet's green star marks the then-recommendation, not the choice. Told the user the account-deletion fallback note (no change to SA-4 or SA-6). Waiting for the user to confirm or adjust each of SA-1 to SA-6.
- Decision: SA-1, SA-2 (A), SA-3, SA-5 and SA-6 confirmed as recorded; SA-4 adjusted from A (confirmation-dialog card) to C (text block on the shell background, no card) (user, 2026-10-26). Reflected in the commit `docs(design): confirm DP-SAAS-01`. The sheet's green star on SA-2 C was only the sheet's recommendation; the user's Task 242 choice was A.

### Checkpoint
- Changed: `docs/DESIGN_TOKENS.md` §Approved SaaS app-state realization, SA-4 row only.
- Verified: SPEC surface sections unchanged since the DP-SAAS-01 record; `git diff --check`; sheet and dev servers (3055, 3045) stopped.
- Please check: the SA-4 row text. SA-3 (loading) is already a card-less text screen, so SA-3 and SA-4 now share one look; SA-5 and SA-6 still use the dialog card. Tasks 228, 234 and 235 build SA-4 from this row; the retro-mac `!` mark and neumorphism plate no longer apply to it.
- Unresolved: none. SPEC copy cleanup for the account-deletion fallback stays with Task 235.
- Review: not required (docs only).
