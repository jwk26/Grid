# Phase 54 — Account deletion grace period

## Completion-time scope

Closed 2026-11-09. Tasks 265–266 are user-accepted. DB lane, on branch
`phase-54/account-deletion-grace`, with no app lane open beside it: the
24-hour grace period in `internal.cleanup_guests()` (lock-then-recheck kept),
`public.cancel_account_deletion()` (L0 Grid lock, then the `accounts` row) and
the `account_deleting` rejection's `deletion_requested_at` and `server_now`
from `ensure_account()` (265); the deletion-grace dialog in place of the
account-being-deleted screen, with the deadline line, a countdown from the
server's time (the larger of the monotonic and wall-clock elapsed times), the
cancel and its unknown-outcome rule, the other-tab follow on the
`griddo.restore` channel (`deletion-cancelled`), the new confirmation and toast
copy, and the forced `near-zero` and `zero` states (266).

Production close: recorded in the ledger's Close section (the manual dump,
the `internal.dispatch_backups()` rehearsal, migration
`20261045000000_account_deletion_grace.sql` pushed with `--skip-vault`, then
the merge; no function change).

Carried in: the Phase 53 Task 265 note (read at the start and the close;
nothing to carry in `.env.local`), the manual dump retirement (this close
still takes the dump), Phase 53 mi-5 with Phase 51 mi-1 (no recurrence in the
saved `pnpm test` runs). Ledger items mi-1, mi-2 and mi-3 are closed. Nothing
new is deferred. Ledger: [`Issues_Phase_54.md`](../../issues/Issues_Phase_54.md).

Differences from the contracts below, recorded in the ledger and accepted with
their tasks:
- Task 265: `supabase/tests/delete-my-account.db.test.ts` and
  `supabase/tests/helpers/function-cases.ts` also changed (the rejection's new
  shape, the client-callable sweep's one exception, the change-set and
  cross-account cases); SCHEMA §Locks and §Grace period name the cancel's
  L0-first order.
- Task 266: the session controller, not the restore controller, owns the
  `deletion-cancelled` message on its own channel instance (user Decision,
  option A); the countdown uses the larger of the monotonic and wall-clock
  elapsed times (user Decision, option A); mi-3: at the request timeout the
  cancel stays unsettled and the one `ensure_account()` read is sent only
  after a request that ended without an answer (SPEC §Write feel); mi-2: an
  unchosen `SIGNED_OUT` while the dialog shows is the account-deleted screen
  (SPEC §Deletion-grace dialog).

## Task contracts at close

Authority and shared rules: the
[Account Backup — Phases 52–54](../../EXECUTION_PLAN.md#account-backup--phases-5254)
section of the plan (lanes, shared rules, user preparation).

Flow review: [Phases 52–54 flow review](../../reviews/phase-52-54-flow-review.md).

Scope: a 24-hour grace period with `Cancel deletion`, the countdown dialog
and the new copy. Leaves behind protection from a mistaken deletion.

**Task order:** 265 → 266.

### Task 265: [x] Add the grace period and `cancel_account_deletion()` in SQL

**Files and actions:**
- A migration: `internal.cleanup_guests()` deletes only requests older than
  24 hours, keeping Task 256's lock-then-recheck; `public.cancel_account_deletion()`;
  `ensure_account()`'s `account_deleting` rejection adds
  `deletion_requested_at` and `server_now`.
- `src/lib/db/database.types.ts`; `supabase/tests/account-deletion-*.db.test.ts`.
- `supabase/tests/guest-cleanup.db.test.ts`: its test "deletes an account
  with a deletion request on the next run, whatever its age" asserts the
  pre-grace rule and fails once the grace period lands; it backdates the
  request beyond 24 hours, and a request younger than 24 hours is checked to
  survive (Phase 54 start drift, 2026-11-09). `backup-cleanup.db.test.ts`
  already uses `deletion_requested_at = 1` and needs no change.

**Dependencies:** Phase 53 closed.

**Authority:** SCHEMA §Account deletion (Grace period and cancel), §Guest
cleanup; deletion-grace Decisions 1–4, 7, 9.

**Observable acceptance:** a request younger than 24 hours survives the
cleanup and an older one does not; a cancel clears only the caller's request
and succeeds with no request; a cancel that locks first leaves nothing to
delete, and one that waits behind the cleanup gets `account_missing`; a
deleted account's backups are listed in `r2_deletions`, a cancelled one's are
not; the rejection carries both added fields and the current client ignores
them.

**Verification:** gate; database suites with both concurrency orders;
`expert` review.

**Commit message:** `feat(db): add the account deletion grace period and cancel`.

### Task 266: [x] Add the deletion-grace dialog and copy

**Files and actions:**
- Merge `main` first.
- `src/lib/auth/session.ts` and test: `cancel_account_deletion()`; read the
  rejection's added fields, through one `ensure_account()` call when the
  `account_deleting` came from `get_snapshot()` or a write (flow review G4);
  after a cancel, repeat entry and post the other-tab message on Task 262's
  channel.
- `src/lib/backup/restore-channel.ts` and its listener
  (`src/lib/backup/restore-controller.ts`, or a new subscriber): today the
  message union and `isMessage` accept only `restore-started` and
  `restore-ended` and drop anything else, so the cancel message needs its own
  type and a listener that repeats entry (Phase 54 start drift, 2026-11-09).
  Confirm two things in a tab that shows the dialog: the listener is actually
  mounted there (today it is the restore controller that `app-frame.tsx`'s
  `useRestore()` creates), and `getUserId()` returns the user's id there,
  since the listener ignores a message when it returns `null`.
- `src/components/layout/deletion-grace-dialog.tsx` and test, in place of the
  account-being-deleted screen in `app-frame.tsx`.
- `src/lib/copy/feedback.ts`: the confirmation, toast and dialog copy.
- `src/lib/dev/state-switch.ts`: the dialog with the countdown near and at
  zero.

**Dependencies:** Task 265.

**Authority:** SPEC Deletion-grace dialog, §Feedback copy; DESIGN_TOKENS
BK-7; deletion-grace Decisions 6, 8, 10.

**Observable acceptance:** after `Delete account` and a new sign-in to the
same account, the blurred empty frame shows the dialog with the deadline in
the user's time zone and a countdown that follows the server's time even with
a wrong device clock; at zero the line changes and `Cancel deletion` stays;
screen readers read the deadline line, not the countdown; `Cancel deletion`
enters the account and the browser's other tabs follow; another browser's
cancel on an already cancelled account enters it; `Continue as guest` starts
a new guest; a forced unknown outcome is decided by one `ensure_account()`
read and never resent; a browser that was already signed in when another
browser deleted the account shows the same dialog with the deadline after its
next refetch; a cancel that meets a deleted account shows the account-deleted
screen; a refused cancel shows `Couldn't cancel the deletion. Try again.`

**Verification:** gate; tests; the agent's browser checks with a shifted
device clock, two tabs and the three other themes, light and dark; **Please
check** by the user: the dialog in `griddo`, light and dark, in the prepared
window.

**Commit message:** `feat(account): add the deletion grace dialog`.

The Phase 54 close: dump, migrations, then the merge (no function change).
The manual dump stays for Phase 54 (user, 2026-11-05, flow review W11); the
first SQL phase after Phase 54 whose `/craft-docs` finds the three retirement
conditions met replaces it.

Before its migrations, the Phase 54 close also rehearses that replacement
once, beside the dump and without blocking the close (control tower, user
2026-11-05): with the user's approval it calls `internal.dispatch_backups()`
once on production, waits for the calls to finish, and reads with one
read-only query how many dispatched accounts have a successful check after the
rehearsal's start and how many failed. The ledger records the counts only. A
failure is recorded as input to the retirement decision, not as a close
blocker.
