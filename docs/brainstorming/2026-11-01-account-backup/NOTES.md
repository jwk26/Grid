# Account Backup and Restore — Notes

Discarded alternatives and reasoning from the 2026-11-04 decision session
(user, with control tower review). Current decisions are in `DECISION.md`.

## Runner

- **GitHub Actions as the main runner:** free for a public repository and it
  emails on failure, but runs can be delayed or dropped, a schedule stops after
  60 days without repository activity (likely once the portfolio link is out),
  and `Back Up Now` and restore still need a server endpoint, so the logic and
  the R2 key would live in two places. Kept as the fallback for the scheduled
  run and as a watchdog candidate for alerts.
- **Vercel Cron:** Hobby allows one run a day within the hour, and it runs
  Next.js server code (Architecture Rule 1).
- **Several accounts per call:** reading dominates (1.9–7.3 s of server time
  for the largest account on production), so a batch reaches the 150 s wall
  clock as accounts grow.
- **Parsing the export in the function:** a large account's JSON, its parsed
  objects and the gzip output together approach 256 MB; streaming keeps memory
  flat.
- **gzip level 6 / `CompressionStream`:** level 6 is about twice level 1's CPU
  on random text with no smaller output; `CompressionStream` cannot set a
  level.
- **Measuring on production mid-phase:** the real export path is a migration,
  which reaches production only at a DB-lane close; measuring through
  `get_snapshot()` would time a different path, and a mid-phase deploy would
  need a new exception. CPU and memory are judged locally with a fourfold
  margin; time, which differs 10–30 times between local and production, is
  judged at the close.
- **Theoretical worst account (about 55 MB of control characters) as the pass
  case:** the app cannot open such an account, and control characters
  compress well, so they are not the CPU worst case either. The pass case is
  the largest account the app still opens; larger ones fail alone.

## Export path

- **`SUPABASE_DB_URL` as `postgres`:** far wider rights than reading, raw SQL
  and connection handling in the function.
- **`Back Up Now` through the user's `get_snapshot()`:** two read paths with
  different timeouts (8 s and 30 s) and result shapes.

## Restore

- **A `service_role`-only function with a role that bypasses RLS:** breaks
  S14; one function bug could reach another account.
- **`restore_account(payload)` open to `authenticated`:** the browser could
  write any rows into its own account and skip the write functions' rules and
  the account limits.
- **Comparing a header secret in SQL:** needs a grant on the secret store
  (Vault), which hosted Supabase may refuse as it refused the `auth.users`
  grant in Task 218, and is a new pattern.
- **Refusing a backup above the current limits** (control tower's first
  proposal): simple, but an account kept above a lowered limit could not
  restore its own data, nor undo a restore through its pre-restore backup.
  Backups are server-written only, so the limit check's purpose is already
  met.
- **Restoring only up to the limits:** drops data without saying so.

## Concurrency

- **Fingerprint from row counts, version sums and latest `mtime`:** `app.chunks`
  has none of these, and Chunk writes do not update their Bit, so a Chunk edit
  in another tab would not change it (control tower finding). The content hash
  needs no audit of what each write changes.
- **Adding `version` or `updated_at` to Chunks:** changes four Chunk functions
  and keeps the audit burden for every later write.
- **Saving the pre-restore state inside the restore transaction:** closes the
  gap fully, but doubles the transaction inside its 30 s budget and adds a
  retry path for an upload that fails after the commit.
- **A `restoring` account state checked by every write function:** changes
  every write function and inherits the unlocked-check race of the deletion
  fallback (SCHEMA §Account deletion, 2026-10-30).
- **Pushing a restore to other devices** (polling or Realtime): cost beyond its
  value. A later candidate: carry `restored_at` in the result of the hourly
  `cleanup_expired_trash()` call.

## Format and retention

- **Keeping a conversion for every past format:** a cost that grows with every
  contract phase.
- **Refusing every older format after a contract:** the backups taken just
  before the contract would become useless.
- **Calendar-based slots:** an account that changes after a long pause would
  lose the file holding the state until the day before.
- **R2 lifecycle by age:** no guarantee that one file stays.

## Alerts, drill and restore check

- **GitHub Actions as the watcher:** its own schedule stops after 60 days
  without repository activity, so the watcher could go quiet unnoticed.
- **Alerts sent from inside Supabase (email API from the function):** cannot
  report a run that never happened, the case that matters most.
- **A key from a hash of the provider id:** an account linked to two providers
  has no single key.
- **A drill through GitHub sign-in:** a GitHub OAuth App takes one callback URL.
- **An automatic restore check on production:** cannot write into a real
  account, and a dedicated test account would need a non-OAuth sign-in path.
- **An integrity check right after upload only:** proves the file is intact,
  not that it restores.
- **Deleting R2 keys that have no `accounts` row:** after a recovery into a new
  project every old key looks orphaned, so the sweep would delete every backup
  before it is copied.

## Modal and limits

- **A `Backup` section inside the Account modal** (the first 2026-11-04
  decision): replaced the same day by a sidebar button after the option sheet.
  The sidebar shows a problem without opening anything and gives guests a
  reason to sign in; its review cost is held down by reusing the realized
  dialog frame. The earlier worries were a control to review in every theme, a
  clash with the app lane's sidebar work, and a second badge beside the
  connection badge (the backup dot sits on its own button, so the two no
  longer mix).
- **`refresh-cw` as the icon and "Sync" as the guest heading** (the user's
  first idea): read as "reload" on the web, and "sync" promises a two-way
  match, while a backup is a one-way copy (2026-11-01). `cloud-upload` chosen.
- **A popover instead of a dialog:** light, but too small for the restore list
  and its confirmation, and no theme has a realized popover shape yet.
- **A dot while backed up:** noise on every page; dots only for problems.
- **A spinning icon while running:** the user found rotation unpleasant. Of
  seven candidates on the option sheet the user chose R3 (the arrow rises).
  Not chosen: R1 bounce (lively, busy over time), R2 scale (too small a change
  at 20px), R4 dot (reads as a warning beside the status dots), R5 ring ping
  (reads as a notification), R6 fade (reads as disabled), R7 bar under the icon
  (a new shape in the sidebar).
- **A percentage while restoring:** one transaction shows no progress from
  outside, and a timed bar would infer progress from elapsed time.
- **Blocking other devices during a restore:** nothing pushes to them; polling
  or Realtime costs more than it saves.
- **Toasts for backup results:** outside the four toast uses (F11).
- **Status from the last file time:** an unchanged account would turn yellow
  after 7 days.
- **A storage cap:** past the free 10 GB, R2 costs $0.015 per GB-month; a cap
  would fail backups instead.
