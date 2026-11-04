# Account Deletion Grace Period and Cancel

## Metadata

- Created: 2026-10-31
- Updated: 2026-11-04 (decision session with the account backup topic; flow and screen after the option sheet)
- Readiness: code-ready
- Category: feature idea
- Source project: GridDO
- Source topic: n/a (user idea during Phase 48 Task 236, after a local
  delete-then-sign-in check)
- Source prototype: n/a
- Tags: account, account-deletion, grace-period, cleanup, saas
- Dependencies: `2026-10-21-saas-conversion` (S23, S42 (1)); Task 238 guest
  cleanup on `main`; `2026-11-01-account-backup` (deleting R2 objects)

## Summary

After `Delete account`, signing in again to the same account shows only the
account-being-deleted screen (`This account is being deleted.` and
`Continue as guest`). The user wants a way to cancel the deletion from that
screen while the account still waits for its deletion.

## Current state (checked on `phase-48/accounts-and-launch`, 2026-10-31)

- By design, not a bug: a deletion request is final (user, 2026-10-22; SCHEMA
  §Account deletion). `delete_my_account()` records
  `accounts.deletion_requested_at`; every read, `ensure_account()` and every
  write function then reject the account with `account_deleting`.
- The wait is an artifact of the SCHEMA fallback, not a designed grace period:
  hosted Supabase refuses a direct delete of the auth user (Task 218), so the
  daily cleanup job (Task 238) deletes it. Depending on when the job runs, the
  account is gone after a minute or after almost 24 hours.
- Copy that says it cannot be undone: the delete confirmation
  (`This can't be undone.`), the toast (`Your account will be deleted within
  24 hours.`) and the account-being-deleted screen.
- Checked again on `main` `6c74625` (2026-11-04): `delete_my_account()` locks
  the caller's `accounts` row `for update` before recording the request.
  `internal.cleanup_guests()` (daily, 03:17 UTC) picks its targets in one
  unlocked query and then deletes each auth user, skipping an account that
  deadlocks until the next run.

## Direction (user, 2026-10-31)

- Keep the deletion final through the launch (Phase 48); take this up after it.
- A minimum wait before deletion is acceptable; it need not be 24 hours.

## Decisions (user, 2026-11-04)

1. **Grace period:** 24 hours. The cleanup deletes only requests older than 24
   hours and stays a daily job, so an account goes 24 to 48 hours after its
   request. Copy promises only the guaranteed time: the request plus 24 hours.
2. **Cancel:** `public.cancel_account_deletion()`, `security definer`, owned by
   `griddo_writer`, EXECUTE for `authenticated`. It is the one write function
   that accepts an account with a deletion request. It locks the caller's
   `accounts` row `for update` and clears `deletion_requested_at`; with no
   request it changes nothing and succeeds.
3. **Cancel against the cleanup:** the cleanup locks each target's `accounts`
   row `for update`, checks again that the request is still older than 24
   hours, and only then deletes the auth user. A cancel that locked first
   leaves nothing to delete; a cancel that waits finds the account gone and
   gets `account_missing`. Today the targets come from an unlocked query, so a
   cancel committed in between would be ignored.
4. **The 2026-10-30 write race becomes expected behavior:** after a cancel, a
   write that committed just after the request stays, since the user made it
   and the whole account comes back. SCHEMA §Account deletion says so; no fix.
5. **R2 objects:** the cleanup records each deleted account in
   `internal.r2_deletions` in the same transaction (RLS on, no policy, in the
   catalog test), and the backup function deletes its objects
   (`2026-11-01-account-backup`, Deleting R2 objects). Backups stay during the
   grace period, so a cancel brings them back.
6. **Copy** (draft; SPEC owns the final text, in `src/lib/copy/feedback.ts`):
   - Confirmation, replacing `This can't be undone.`: `You can cancel within
     24 hours by signing in again. After that, your account, its data and its
     backups are deleted.`
   - Toast: `Your account will be deleted after 24 hours. Sign in again to
     cancel.`
   - Account-being-deleted dialog: title `This account will be deleted`, line
     `You can cancel until <request time + 24 h, in the user's time zone>.`, a
     countdown with `left to cancel`. Actions: `Cancel deletion` (first, takes
     focus) and `Continue as guest`.
7. **Request time on the screen:** the `account_deleting` rejection from
   `ensure_account()` adds `deletion_requested_at` and the server's current
   time, added fields that the deployed code ignores (expand).
8. **After a cancel:** the tab repeats entry; the other tabs of the browser
   follow through `BroadcastChannel`, as after a restore. Other browsers get no
   push: their screen also offers `Cancel deletion`, which succeeds on an
   account already cancelled and so enters it.
9. **Gates:** the SQL checklist (PLANNING_STANDARD §6), a cross-account test
   (a cancel never touches another account), concurrency tests for both orders
   of cancel and cleanup, and an `expert` review.
10. **Flow and screen** (user, 2026-11-04, after the option sheet; replaces the
    full-screen notice):
    1. `Delete account` asks in the Account modal (as today).
    2. Confirming signs out to a new guest, with the toast (as today).
    3. Signing in again to the same account shows the app frame blurred and
       inert, with the account-being-deleted dialog over it in the Account
       modal's frame. The frame behind holds no data: the session is the
       deleting account's, whose data every read refuses, and the earlier
       guest's session was replaced at sign-in.
    - The countdown runs to the guaranteed time (request + 24 hours), from the
      server's time carried in the rejection, so a wrong device clock does not
      move it. At zero it gives way to `The deletion can start at any time
      now.`, and `Cancel deletion` stays: the cancel works until the cleanup
      has run.
    - The countdown is hidden from screen readers; they read the line with the
      deadline, so nothing is announced every second.
    - `Continue as guest` starts a new guest; the guest from step 2 is not
      restored (as today; it is cleaned up after 7 days).

## Discarded (2026-11-04)

- **An hourly job:** narrows the window to 24–25 hours, but adds a cron job,
  and the copy promises only the guaranteed time anyway.
- **Seven days or more:** keeps the data and its backups that much longer.
- **Deleting R2 keys that have no `accounts` row:** after a recovery into a new
  project every old key has no row (`2026-11-01-account-backup` NOTES).
- **The full-screen notice** (the first 2026-11-04 decision): replaced by the
  blurred app frame with a dialog and a countdown, the user's flow.
- **Showing the guest's own data behind the dialog:** the guest's session is
  gone after the sign-in, so the frame behind stays empty.

## Phase placement

Phase 54, a DB-lane phase after the backup (52) and restore (53) phases, with
no dependency on 53 (`2026-11-01-account-backup`, Phase split). Phase 52
already adds the cleanup's lock-then-recheck, so this phase changes only its
24-hour condition.
