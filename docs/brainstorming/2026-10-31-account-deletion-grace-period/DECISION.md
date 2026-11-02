# Account Deletion Grace Period and Cancel

## Metadata

- Created: 2026-10-31
- Readiness: draft
- Category: feature idea
- Source project: GridDO
- Source topic: n/a (user idea during Phase 48 Task 236, after a local
  delete-then-sign-in check)
- Source prototype: n/a
- Tags: account, account-deletion, grace-period, cleanup, saas
- Dependencies: `2026-10-21-saas-conversion` (S23, S42 (1)); Task 238 guest
  cleanup on `main`

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

## Direction (user, 2026-10-31)

- Keep the deletion final through the launch (Phase 48); take this up after it.
- A minimum wait before deletion is acceptable; it need not be 24 hours.

## Options to weigh at promotion (advisory notes, 2026-10-31)

- A fixed minimum wait: the cleanup deletes only requests older than the
  chosen wait (`deletion_requested_at` older than N hours). With a daily job
  the deletion lands between N and N + 24 hours; an hourly job narrows it to
  N + 1 hour. Without such a minimum, any promised cancel window is unreliable.
- Cancel: a new write function (for example `cancel_account_deletion()`) that,
  unlike every other write function, accepts an account with a deletion
  request and clears it for the caller only; SQL checklist (PLANNING_STANDARD
  §6), cross-account and concurrency tests (cancel against the cleanup), an
  `expert` review.
- Revisit the 2026-10-30 write race (SCHEMA §Account deletion): a write that
  committed just after the request becomes readable again after a cancel.
- Surfaces: a cancel action beside `Continue as guest` on the
  account-being-deleted screen; other tabs and browsers of the account leave
  that screen after a cancel; new copy for the confirmation, the toast and the
  screen.
