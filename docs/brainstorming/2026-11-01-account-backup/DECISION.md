# Account Backup and Restore

## Metadata

- Created: 2026-11-01
- Updated: 2026-11-04 (decision session: runner, export, restore, concurrency,
  format, retention, modal, alerts, recovery drill, restore check); 2026-11-08
  (Task 264: the restore pass case, [Measurement and acceptance](#measurement-and-acceptance))
- Readiness: code-ready
- Promoted: 2026-11-05 through [`PROMOTION_MAP.md`](PROMOTION_MAP.md) into
  Phases 52–54; its B4, B5, B8, B13, B15 and B16 and the Phases 52–54 flow
  review supersede the 2-minute way-out, the staging row's deletion, the
  `accounts` status columns, the user-task order, "no dependency on 53", the
  drill's bucket, the restore order (rate check first) and the Phase split's
  "every close: dump, then functions" line (CLAUDE.md §Production order applies)
- Category: feature idea
- Source project: GridDO
- Source topic: `2026-10-21-saas-conversion` (S22, S35); Task 239 advisory
  session
- Source prototype: n/a
- Tags: backup, restore, account, r2, saas, operations
- Dependencies: Phase 48 close; `2026-10-31-account-deletion-grace-period`

## Table of Contents

1. [Summary](#summary)
2. [Decisions (user, 2026-11-01)](#decisions-user-2026-11-01)
3. [Decisions (user, 2026-11-04)](#decisions-user-2026-11-04)
4. [Facts checked on 2026-11-04](#facts-checked-on-2026-11-04)
5. [Design](#design)
6. [Why R2](#why-r2)
7. [Retiring the manual dump](#retiring-the-manual-dump)
8. [First manual dump and restore test](#first-manual-dump-and-restore-test)
9. [User tasks](#user-tasks)
10. [Phase split](#phase-split)

## Summary

Signed-in users get an iCloud-like backup: it runs by itself on the server,
needs no local file and no open tab, and can be restored from anywhere. This
is the first candidate after the launch (`D-ACCOUNT-BACKUP`). Phase 48 ships no
backup: production holds nothing to keep until the launch.

Between the launch and the first production dump, production data has no
backup. The user accepted this risk (S35, 2026-11-01).

The 2026-11-04 session settled the runner, the export and restore paths, the
backup format, retention, the Account modal, failure alerts, the recovery
drill, the periodic restore check, deleting R2 objects with the account, an
interim dump and the phase split. Discarded alternatives are in `NOTES.md`.

## Decisions (user, 2026-11-01)

- Signed-in OAuth accounts only; guests are left out.
- Storage outside Supabase: Cloudflare R2, chosen over a second database.
- The modal has a short description, the latest backup date, a backup button
  and a status light. Status also reads as text, not by colour alone.
- Restore is in scope from the first version.
- Retention draft: one backup a day for the latest 7 days, then one a week for
  the 4 weeks before them. Replaced on 2026-11-04 by file-based slots
  ([Retention](#retention)).
- A manual dump stays only until this work retires it
  ([Retiring the manual dump](#retiring-the-manual-dump)).

## Decisions (user, 2026-11-04)

1. **Runner:** one Supabase Edge Function, called once per account
   ([Runner](#runner)).
2. **Export:** the function reads through `public.export_account()`, which
   only `service_role` can execute, with a 30 s statement timeout
   ([Export path](#export-path)).
3. **Restore:** the server stages the backup, and the user's own JWT applies
   it through an ordinary write function ([Restore](#restore)).
4. **Limits on restore:** a restore checks no row limit; an account above a
   limit keeps its rows, as SCHEMA §Account limits already states.
5. **Concurrency:** a content fingerprint, compared after locking; restored
   versions move forward; tabs of the same browser follow at once
   ([Concurrent writes and other tabs](#concurrent-writes-and-other-tabs)).
6. **Format versions:** expand needs no new version; contract adds one step
   from the previous version ([Format versions](#format-versions)).
7. **Retention:** file-based slots instead of calendar days, so an unchanged
   account never loses its backups ([Retention](#retention)).
8. **Backup button:** a sidebar button below Home and the account icon that
   opens a dialog (guest: why to sign in; account: status, `Back Up Now`,
   `Restore…`), replacing the first Account-modal section; a blocking screen
   while a restore runs; server-side rate limits,
   and no storage cap ([Backup status](#backup-status),
   [Modal and copy](#modal-and-copy), [Limits](#limits)).
9. **Acceptance:** the largest account the app still opens is the pass case,
   measured locally for CPU and memory and on production at phase close for
   time ([Measurement and acceptance](#measurement-and-acceptance)); for the
   restore's production time, the current real-account limits (user,
   2026-11-08).
10. **Deploy order:** Edge Functions deploy between the migrations and the
    merge; the rule text goes into `CLAUDE.md` §Production through this
    topic's `/craft-docs` ([Deploy order](#deploy-order)).
11. **Alerts:** a daily summary pings Healthchecks.io, which emails the owner
    on a new failure and when no ping arrives
    ([Failure alerts](#failure-alerts)).
12. **Object key and recovery drill:** keys use the internal user id with an
    identity file; the drill runs once in a new Supabase project through the
    ordinary restore ([Object key](#object-key),
    [Recovery drill](#recovery-drill)).
13. **Periodic restore check:** the owner runs a script every month that
    restores the latest backup into a dedicated local test user, then deletes
    it ([Periodic restore check](#periodic-restore-check)).
14. **Deleting R2 objects:** an explicit deletion list written by the cleanup
    job, processed by the daily summary
    ([Deleting R2 objects](#deleting-r2-objects)).

## Facts checked on 2026-11-04

- **Edge Functions** (Supabase docs, Limits and Pricing): 256 MB memory; wall
  clock 150 s on the free plan (400 s paid); 2 s CPU per request, which does
  not count async I/O; request idle timeout 150 s; 500,000 invocations a month
  on the free plan. The function's environment holds
  `SUPABASE_SERVICE_ROLE_KEY` by default.
- **GitHub Actions schedule:** at most every 5 minutes; runs can be delayed or
  dropped under load; in a public repository, schedules are disabled after 60
  days without repository activity.
- **Vercel Cron, Hobby:** once a day, anywhere within the hour; it runs a
  Vercel Function, which is Next.js server code (Architecture Rule 1).
- **Statement timeouts** (Supabase docs, Timeouts): `anon` 3 s,
  `authenticated` 8 s, `service_role` none set (falls back to the
  `authenticator` role's 8 s), `postgres` none (global cap 2 min); queries
  through the API are capped at 60 s. A function-level `statement_timeout`
  works through the REST API.
- **PostgREST** (references, Hoisted Function Settings; configuration
  `db-hoisted-tx-settings`, default `statement_timeout,
  plan_filter.statement_cost_limit, default_transaction_isolation`): the
  function's settings are applied as transaction settings before the call. A
  function's own `SET` does not extend the timer of a statement already
  running, so only a call through REST proves the setting.
- **Local gzip** (Mac, Node `zlib`, control tower script rerun): random Hangul
  syllables, 35.9 MB raw: level 1 takes 540 ms CPU (25.1 MB out), level 6 987
  ms (25.2 MB). Repetitive text compresses far better and is not the CPU worst
  case.
- **Production read time** (Phase 48 ledger, Task 240 Stage 2, 2026-11-01): the
  old 100% fixture (9.44 MB raw) took 1.9–7.3 s of server time in
  `get_snapshot()`; local 115–222 ms. Its slowest call missed the 3 s load
  target but stayed under the 8 s timeout, so it is the largest account the
  app still opens.
- **Code** (`main` `6c74625`): `app.chunks` has no `version`, `mtime` or
  `updated_at`. `create_chunk`, `update_chunk` and `delete_chunk` lock the
  Bit's parent Node and then the Bit `for update` and do not update the Bit
  (except Bit auto-completion); `reorder_chunks` locks the Bit. `version`
  exists on Nodes, Bits, Scratch Breakdowns and Staged Candidates.
- **Supabase free plan** (pricing page): two active projects per account;
  paused projects do not count; a project pauses after a week without
  activity.
- **Healthchecks.io free plan** (pricing page): 20 checks, 100 log entries per
  check, no SMS. Email alerts are not listed on the pricing page; confirm at
  sign-up.
- **GitHub OAuth Apps** take one callback URL; Google OAuth clients take
  several, and Google's `sub` is the same for one Google account across
  clients.
- **R2 prices:** as checked on 2026-11-01 ([Why R2](#why-r2)); not checked
  again.

## Design

```text
pg_cron (daily) --pg_net, one call per account, shared secret--+
Backup dialog (user JWT): Back Up Now, Restore, status -------+
                                                               v
                                          Edge Function (one)
   export_account() as service_role  <---|  |---> gzip (level 1) --> R2
   restore_staging insert (service_role) <--|
   restore_account() with the user's JWT <--|
   status fields in app.accounts         <--|
```

### Runner

- One Edge Function serves the scheduled backup, `Back Up Now`, restore, and
  the modal's status and backup list.
- `pg_cron` calls it through `pg_net` once a day for each signed-in OAuth
  account, one account per call. A call is then bounded by the largest
  account, and an account that hits a limit fails alone.
- Scheduled calls authenticate with a backup-only shared secret kept in Vault
  and in the function's secrets; cron never holds the `service_role` key. A
  leaked secret can only start backups, and an unchanged account writes no
  file.
- `Back Up Now`, restore and status take the user id only from the verified
  JWT's `sub`, never from the request body.
- The function streams the export response into gzip without parsing it, at
  level 1 set explicitly (`node:zlib` `createGzip({ level: 1 })`); the web
  `CompressionStream` takes no level. Memory then stays flat whatever the
  account size.
- Fallback when a measurement fails: move only the scheduled run to GitHub
  Actions, with a keep-alive for the 60-day rule, or split one account's
  export into calls per table.

### Export path

- `public.export_account(p_user_id uuid)`: `security invoker`,
  `set statement_timeout = '30s'`, empty `search_path`. One statement builds
  one JSON value with every row of the five tables (as `get_snapshot()`,
  active, trashed and archived) and the account fingerprint, so both describe
  one point in time and no API row limit cuts it.
- EXECUTE goes to `service_role` alone; `service_role` gets `usage` on `app`
  and `select` on its tables. `service_role` is not a client role, because
  its key exists only on the server.
- **The backup functions** are the documented exception to revoking
  `service_role`'s default grants: a small set of `public` functions that only
  `service_role` can execute, listed in SCHEMA by `/craft-docs`. Besides
  `export_account`: recording a run's start and result (status fields, size,
  fingerprint), reading the due R2 deletions and marking them done
  ([Deleting R2 objects](#deleting-r2-objects)). `service_role`'s table rights
  stay `select` for the export and `insert` on `app.restore_staging`.
- `griddo_writer`'s policies need the caller's user id, which a `service_role`
  call does not carry, so the functions that write status cannot be
  `griddo_writer` functions. Their owning role and how RLS applies to them go
  to the plan's `expert` review.
- 30 s is about four times the 7.3 s worst read of the largest account the app
  opens, inside the API's 60 s cap, and leaves the function's wall-clock budget
  (37.5 s, a quarter of 150 s) room for gzip and upload.
- An object holds Nodes, Bits, Chunks, Scratch Breakdowns and Staged
  Candidates, including trashed and archived rows, plus `format_version`, the
  creation time and the provider's stable user id. It holds no OAuth token or
  session, no device preference and no guest data.

### Restore

The browser cannot reach R2, so a restore always runs on the server.

1. The function verifies the JWT and takes the user id from `sub`.
2. It exports the current account and uploads it to
   `accounts/<key>/pre-restore/<UTC time>.json.gz`; if the upload fails, the
   restore stops.
3. It fetches and unzips the chosen backup and inserts it as `service_role`
   into `app.restore_staging (user_id, id, payload, created_at)`.
   `service_role` has `insert` on this table only.
4. It calls `public.restore_account(p_restore_id, p_expected_fingerprint)` with
   the user's JWT: `security definer`, owned by `griddo_writer`, EXECUTE for
   `authenticated`, `set statement_timeout = '30s'` (applied by REST). Under
   RLS it reads only the caller's staging row, replaces the whole account in
   one transaction and deletes the staging row. A browser that calls it
   directly can only apply what the server staged for it.
5. A cleanup removes staging rows older than one hour.

- Account isolation stays the S14 kind: RLS and `griddo_writer`; the user of
  the JWT is the owner, so no separate ownership check exists.
- Limits: a restore checks no row limit. An account above a limit keeps its
  rows and its creates are refused (SCHEMA §Account limits). Only backups the
  server wrote reach staging, which serves the limit check's purpose; the
  export timeout already bounds their size. A partial restore is never made.
- A restore refuses an unsupported `format_version`
  ([Format versions](#format-versions)).

### Concurrent writes and other tabs

- **Fingerprint:** `internal.account_fingerprint(p_user_id)` is the md5 of
  each of the five tables' rows (`md5(string_agg(t::text, ',' order by
  t.id))`), combined by md5. `app.accounts` is left out, because the backup
  writes its status there. Every write changes it without an audit of what
  each write touches, Chunk edits included.
- **Lock first:** `restore_account` takes the L0 advisory lock, then every
  Node of the account by id, then every Bit (SCHEMA §Locks order), and only
  then computes the fingerprint again. Chunk writes lock the Bit's parent Node
  and then the Bit, and `reorder_chunks` the Bit: the same direction, so no
  deadlock. A mismatch returns `rejected` with `account_changed` and changes
  nothing; the client does not retry by itself.
- **For the plan's `expert` review:** the full lock list over every write
  function, and whether `restore_account` locks the `accounts` row first or
  never touches it (`ensure_account()` locks that row before the L0 advisory
  lock).
- **Versions:** every restored row gets `greatest(backup version, current
  version) + 1`, one increment for one logical change (Hook 12). Every row that
  exists now ends above any version a tab holds, so a stale tab's first write
  to it conflicts and the CAS resolver shows the restored value. Accepted
  residual: a row changed once after the backup and then permanently deleted,
  held at exactly that version by a stale tab. Chunks have no version and keep
  last-write-wins, as today.
- **Tabs:** while the restore runs, the restoring tab and the other tabs of the
  browser are blocked ([Restoring screen](#restoring-screen)); afterwards the
  restoring tab drops its snapshot and repeats entry behind the loading frame,
  and tells the other tabs through `BroadcastChannel` to do the same. Other
  devices get no push: their first write conflicts, and a reload shows the
  restored account.

### Format versions

- Each object holds `format_version`, starting at `1`. The first version of
  `restore_account` accepts `1` only, so nothing more is built now.
- An expand migration (a column added with a default) keeps the version: a
  restore reads each row against the current table's columns and fills a
  missing key with the column default. A new required column without a
  default is not expand.
- A contract migration (a column dropped, renamed or given a new meaning)
  raises the version, and the same task writes one conversion from the
  previous version (N−1 → N). A restore refuses N−2 and older, saying the
  backup comes from an older version.
- A contract phase's close backs up every account after its migrations, changed
  or not, so even an untouched account keeps a restorable latest file.

### Retention

Replaces the 2026-11-01 calendar draft (user, 2026-11-04).

- An object name is a date slot: `accounts/<key>/YYYY-MM-DD.json.gz`, UTC.
  Another run on the same day overwrites only that day's file.
- A run whose fingerprint matches the last backup writes no file, scheduled or
  `Back Up Now` alike; it records only the check.
- Pruning runs only right after a new file is written, and counts existing
  files, not calendar days: it keeps the 7 latest files (on different days)
  and, before them, the latest file of each of 4 ISO weeks. An unchanged
  account never prunes; an account that changes after two months keeps its
  two-month-old file, the state until yesterday. At least one file always
  stays. Pushing a backup out takes real changes on 7 or more days, never
  repeated runs.
- No R2 lifecycle rule for account backups: an age rule would delete every
  file of an account left untouched for 5 weeks.
- Pre-restore backups keep the 5 latest per account, outside the date slots.
  Only the owner can restore, so repeated restores affect only their own
  account.
- Expected behavior, not a bug: an expand migration that adds a column changes
  every fingerprint (`t::text`), so the next scheduled run backs up every
  account once, which also moves every latest file to the new format. A
  restore in flight during that migration is rejected with `account_changed`.
- Size: a 10 MB random-Hangul account is about 7 MB gzipped, so up to about 16
  files hold about 110 MB; 10 GB holds about 90 such accounts, or hundreds of
  realistic ones (1–3 MB).

### Backup status

- The `accounts` row holds: start time of the current run, last successful
  check, last file time, last result, failure reason, `failing_since`, the
  last backup's fingerprint, the last file's size, and the times of the last
  `Back Up Now` and restore (for [Limits](#limits)).
- A run records its start first. A run with a start and no result after 5
  minutes (twice the 150 s wall clock) is recorded as failed with reason
  `interrupted` by the next run or by a status call, since a function killed
  at a limit cannot record its own failure.
- Status is judged from the last successful check, a skipped unchanged account
  included; the date shown is the last file time.
- The scheduled run picks accounts by fingerprint, not by modification time,
  which would miss Chunk edits.
- An account that keeps failing, such as one above the app-openable size, is
  tried every day, and the owner is alerted only when its state or failure
  reason changes, not every day. Its modal keeps the red status and the
  reason ([Failure alerts](#failure-alerts)).

### Object key

- Objects live under `accounts/<internal user id>/`. Each account also has
  `accounts/<internal user id>/identity.json` with its providers and provider
  user ids, written by the function.
- After a recovery into a new project the internal id changes. The owner's
  operations script finds the old key by provider user id and copies the
  objects to the new key inside R2; the user then restores through the
  ordinary modal.
- Not a hash of the provider id: an account linked to GitHub and Google has two
  provider ids and no single key.

### Failure alerts

A run that never happens cannot report itself (a paused project, a stopped
`pg_cron`, a broken deploy), so a service outside Supabase watches for the
daily report. GitHub Actions cannot be that watcher: its schedule stops after
60 days without repository activity.

- `pg_cron` calls the function's `summary` mode two hours after the backup
  run. The summary records runs with a start and no result after 5 minutes as
  `interrupted`; counts OAuth accounts whose last successful check is older
  than 36 hours as `missing`; counts failures new since the previous summary (a
  changed state or reason); and checks whether the stored size passes 8 GB.
- No new problem: a success ping to a Healthchecks.io check. A new problem: a
  `/fail` ping. The body holds counts and reason codes only, never an account
  id or email; the owner reads details in the database.
- The check has a one-day period and a three-hour grace; a missing ping makes
  Healthchecks.io email the owner.
- Healthchecks.io alerts only on a change of state, so an account that keeps
  failing does not alert again and does not hide a new failure: the day after a
  new failure, the check is up again unless another one appears.
- The ping URL lives in the function's secrets and the owner's password app. A
  leaked URL can fake a success ping and reach no data.

### Recovery drill

Run once to retire the manual dump, in a new Supabase project deleted
afterwards.

- Needs a free active-project slot: production uses one, so no other free
  project may be active.
- Steps: apply the migrations from Git, unschedule the project's cron jobs at
  once (so no run of the drill project touches the production bucket), enter
  the auth settings again, sign in
  with Google (the development Google client gets the drill project's callback
  for the drill and loses it after), copy the old objects to the new key
  ([Object key](#object-key)), restore through the modal, compare counts and
  hashes with the source, delete the project.
- GitHub is not used for the drill, because a GitHub OAuth App takes one
  callback URL.
- The operations script's R2 key sits in a file outside Git on the Mac
  (`chmod 600`), like the production connection settings; never in chat or
  Git.

### Periodic restore check

A monthly task for the owner.

- A script downloads the latest backup of the owner's account with a read-only
  R2 token, restores it into a dedicated local test user through the same SQL
  path (staging, then `restore_account`), exports that user again and compares:
  every row equal except `version`, which is one higher.
- The test user is not the fixture user the agent sessions seed.
- When the comparison ends, and on SIGINT and SIGTERM too, the script deletes
  the test user and its rows. Output and records hold counts and hashes only,
  never row contents, because the local database is shared with agent
  sessions.
- No reset: an expand-only difference between the local migrations and
  production still restores, so the check needs no lane coordination.
- On success the script pings a second Healthchecks.io check with a 31-day
  period, which emails a reminder when a month passes without a run.
- A contract phase's close runs it once more, for the format conversion.

### Deleting R2 objects

A foreign key cannot reach R2, so the account deletion leaves a record of what
to delete (decided with the deletion grace period, user, 2026-11-04).

- Objects are deleted only from an explicit list, never because a key has no
  `accounts` row: after a recovery into a new project every old key has no row,
  and such a sweep would delete every backup before it is copied.
- `internal.r2_deletions (user_id, requested_at, attempts)`: the cleanup job
  inserts a row in the same transaction that deletes the auth user. No foreign
  key; RLS enabled with no policy, so every client role is refused (Rule 10),
  and the catalog test covers it.
- The daily summary processes rows older than one hour: it deletes everything
  under `accounts/<user id>/` and then the row; a failure is retried the next
  day, and a row older than three days makes the summary send `/fail`.
- The hour is longer than any backup call (150 s), and the function checks
  right before an upload that the account exists and has no deletion request,
  so an upload in flight cannot leave an orphan behind.
- During the grace period the files stay, so a cancel brings the backups back
  too. Writes are refused then, so the fingerprint does not change and no file
  is written; the scheduled run skips the account and does not count it as
  `missing`.

### Modal and copy

Draft copy in English; SPEC owns the final text, kept in
`src/lib/copy/feedback.ts`. Replaces the 2026-11-04 Account-modal section
(user, 2026-11-04, after the option sheet; discarded forms in `NOTES.md`).

- **Sidebar button:** a new sidebar button right below Home and the account
  icon, Lucide `cloud-upload`, labelled `Backup`, on every route.
- **Status on the button:** a dot only when something needs attention, in the
  slot the Calendar urgency dot uses: yellow (no successful check in over 7
  days), red (the last run failed). No dot when backed up or not yet backed
  up. While a run is in progress the button shows the running motion
  ([Running motion](#running-motion)).
- **Dialog:** the button opens a dialog in the Account modal's frame (the
  shared `scratch-trash-dialog` classes, which Retro Mac and Neumorphism
  already restyle), so no theme needs a new dialog shape. Not a popover: the
  restore list and its confirmation need the room, and popovers have no
  realized theme shapes.
- **Guest variant:** `Keep your Grid safe`, a short note that signed-in
  accounts are backed up every day outside the main database and can be
  restored, `Sign in with GitHub` and `Sign in with Google`, and the existing
  line that signing in opens a new, empty account and does not move guest
  data. Not called "Sync": a backup is a one-way copy (2026-11-01).
- **Account variant:** the status line, `Back Up Now`, `Restore…` (Phase 53),
  the privacy note and `Close`.
- The Account modal itself stays as it is (name, `Sign out`,
  `Delete account`).
- Opening the dialog calls the function's status endpoint once, for the status
  fields and the backup list; `Checking…` until it answers. No new client SQL
  function.
- Times show the real timestamp in the user's time zone and locale
  (`Intl.DateTimeFormat`), never the object name's UTC date.
- Status, by colour from the semantic status tokens and always with text:

| Status | When | Copy |
|---|---|---|
| Green | A successful check within 7 days | `Backed up. Latest backup: <time>` |
| Running | A run in progress | `Backing up…`, with a lamp in the primary colour that slowly fades in and out (no spinner) |
| Yellow | Last successful check older than 7 days | `No backup check in over 7 days. Latest backup: <time>` |
| Gray | No backup yet | `Not backed up yet. The first backup runs within a day.` |
| Red | The last run failed | `The last backup failed.` and the reason, for example `This account is too large to back up.` |

- `Back Up Now` is server-confirmed: pending while it runs, the result inline
  in the section, no toast (F11). When nothing changed:
  `No changes since the latest backup (<time>).` An unknown outcome is never
  resent; a status read sent after the request ended decides it.
- `Restore…` opens the backup list in the dialog, each entry in the user's
  time zone, pre-restore entries as `Before restore, <time>`. Confirmation in
  the dialog: `This replaces everything in this account with the backup from
  <time>. The current state is saved first, so you can undo this.` On
  `account_changed`: `This account changed while restoring. Try again.` An
  unknown outcome is never resent; a status read decides it.
- Privacy note in the dialog: `Backups are stored with Cloudflare, outside the
  main database. We keep your 7 latest backups and one a week for 4 weeks
  before them. Deleting your account deletes them.` Whether the guest modal's
  privacy note must name Cloudflare too is left to `/craft-docs`.
- The sidebar may also change in the app lane, so the UI task comes late in the
  phase and merges `main` when it starts.

### Running motion

Chosen by the user from seven candidates on the option sheet (R3,
2026-11-04).

- While a run is in progress, the cloud of the `cloud-upload` icon stays still
  and only its arrow moves: it rises about 4px from below while fading in, then
  fades out at the top, in a 1.5 s ease-in-out loop. The arrow's two paths are
  drawn as one group so that only they move.
- The button keeps its size and place; nothing rotates.
- With `prefers-reduced-motion` the loop stops and a still dot in the primary
  colour shows in the status-dot slot instead.
- A yellow or red dot wins over the motion: a run that ends in a failure shows
  the red dot.
- The status line in the dialog shows `Backing up…` with a primary-colour lamp
  that fades slowly in and out; the restoring steps use the same lamp.

### Restoring screen

Added 2026-11-04 (user): the app cannot be used while a restore runs.

- The restoring tab shows a blocking dialog over the blurred app:
  `Restoring a backup`, `Don't close this tab. Grid opens again when it's
  done.`, and three steps that change only when the function reaches them:
  `Saving the current state`, `Getting the backup`, `Applying the backup`. No
  percentage: one transaction shows no progress from outside, and a timed bar
  would infer progress from elapsed time (Architecture Rule 6).
- Other tabs of the browser get `restore-started` through `BroadcastChannel`
  and show the same blocking dialog: `A backup is being restored in another
  tab`, `Grid opens again with the restored data when it's done.` On
  `restore-ended` they drop the snapshot and repeat entry.
- A way out (PLANNING_STANDARD §6): if no end message arrives within the
  restore's longest time (2 minutes), the dialog reads the status once,
  read-only, and offers `Check again`; it never resends.
- Other devices are not blocked, since nothing pushes to them; their first
  write conflicts and the CAS resolver shows the restored value
  ([Concurrent writes and other tabs](#concurrent-writes-and-other-tabs)).

### Limits

- Enforced by the function, with the times in the `accounts` row: `Back Up Now`
  once per 5 minutes per account; restore once per 10 minutes per account.
  Beyond that: `rejected` with `rate_limited`, inline `Try again in a few
  minutes.`
- No storage cap: beyond the free 10 GB, R2 costs $0.015 per GB-month, while a
  cap would fail backups. The function records each file's size, and the daily
  summary alerts the owner when the total passes 8 GB.
- Invocations: one scheduled call per account a day leaves room for about
  16,000 accounts within 500,000 a month.

### Measurement and acceptance

- **Pass case:** the largest account the app still opens, about 10 MB raw.
  Larger accounts fail alone ([Backup status](#backup-status)).
- **First task, local edge runtime, go/no-go:** an account of about 10 MB raw
  with SCHEMA's fields and random Hangul syllables; go when CPU stays under 500
  ms and memory under 64 MB (a quarter of each limit). The same task measures
  the fingerprint cost and checks the API's request body limit for the
  roughly 10 MB staging insert; if refused, the payload goes in as rows per
  table. No production deploy happens during the phase.
- **Phase close, production, after the migrations and the function deploy:**
  the Phase 42 limit-sized fixture (old 100% caps: nodes 1,000, bits 5,000,
  chunks 10,000, breakdowns 5,000, candidates 1,250; 9.44 MB raw), built in
  SQL; three runs each of export with upload and of restore; the worst run
  under 37.5 s wall clock, with `export_account()` and `restore_account()`
  inside 30 s, which also confirms that hosted REST applies the 30 s setting.
  The script deletes the account, its staging rows and its R2 objects on
  SIGINT and SIGTERM too (PLANNING_STANDARD §6, Task 240).
- **Restore pass case, amended (user, 2026-11-08, Phase 53 Task 264 MI-6):**
  the restore's production runs are judged at the current real-account limits
  (SCHEMA §Limits: nodes 500, bits 2,500, chunks 5,000, breakdowns 2,500;
  the fixture adds 625 candidates; about 5 MB of export text), since a create
  past them is rejected and production held no account above them (largest per table 87, 267, 85, 21
  and 3 on 2026-11-08); the 37.5 s and 30 s lines are unchanged. Result there:
  wall 13.4 / 12.6 / 13.0 s, `restore_account()` 2.9–3.3 s, `restore_stage()`
  3.5–4.2 s of its own 30 s timeout. At the old caps the restore stays a known
  limit, not the pass case: wall 27.9 and 41.7 s (the third run not made),
  `restore_account()` 6.3 and 5.0 s, `restore_stage()` 9.4 and 18.1 s, the
  growth in the one-row 10 MB staging write (cause not proven); if accounts
  can exceed the current limits again or `restore_stage()` grows toward its
  timeout, staging moves to rows per table (the fallback above). The export
  keeps the old-caps pass case, which it passed (Phase 52 Task 259).
- **Tests prove refusals** (vitest database suites, through supabase-js
  `.rpc()` where REST behavior matters, as `snapshot-load.db.test.ts`):
  `anon` and `authenticated` calling `export_account` get `permission denied`;
  `Back Up Now` naming another account in its body backs up only the caller
  or is refused; `restore_account` cannot read another account's staging row;
  a REST call to `export_account` that runs past 8 s passes with the 30 s
  setting and is cut at 8 s without it.

### Deploy order

Rule text for `CLAUDE.md` §Production, added by this topic's `/craft-docs`:

> Edge Functions deploy between the migrations and the merge: manual dump,
> migrations, functions, then the merge. Migrations expand for functions too:
> a function already deployed keeps working on the new schema, since it runs
> there until its own deploy and again after a rollback of it. A function that
> a new schedule or a new UI calls for the first time may deploy before the
> migrations, because nothing calls it until they land.

- First introduction: dump, function, migrations (`pg_net`, cron
  registration), merge (UI).
- The close runs outside the cron window and confirms one successful
  scheduled run after it.
- `pg_net` creates the `net` schema: the close confirms no new Security
  Advisor warning in the dashboard list.

## Why R2

- A backup is stored and read whole, so object storage fits better than a
  second database, which would also need its own schema and can pause on the
  free plan.
- Supabase runs on AWS, so R2 keeps the copy with another company. S3 in
  another region would also work, and R2 speaks the S3 API, so a later move is
  small.
- Cloudflare is already in use for Turnstile.

Prices checked on 2026-11-01; check again at planning. R2: 10 GB-month, 1
million Class A and 10 million Class B requests free each month, then $0.015
per GB-month, with no egress fee. Size from Task 216: a limit-sized account is
2.78 MB gzipped, a one-tenth account 0.28 MB. R2 may ask for a payment method
at setup.

## Retiring the manual dump

The dump runs before each production migration until all of these hold:

1. A recovery drill passes: a new Supabase project, the migrations from Git,
   the auth settings entered again, a sign-in with the same provider account,
   and a restore from R2. Tests alone do not count. The provider's stable user
   id is what connects the new sign-in to the old backups, because the
   internal user id changes. Guest data is not recovered.
2. A failed or missing backup alerts the owner.
3. A periodic restore check exists.

How each is built: [Recovery drill](#recovery-drill),
[Failure alerts](#failure-alerts) (proven by forcing a failure and receiving
the email) and [Periodic restore check](#periodic-restore-check) (its first
run).

After all three first hold, the next phase that changes SQL runs a backup of
every account and confirms success before its migrations instead of the dump,
and its `/craft-docs` drops the manual dump from CLAUDE.md §Backup. If the
drill fails, the fallback is a server-side full dump sent to R2.

## First manual dump and restore test

Runs before the first production migration after the launch, which is this
work's own migration unless another phase changes SQL first. Findings from the
Task 239 work-plan review, checked on local Supabase on 2026-11-01 (CLI
2.121.0):

- Commands: `--role-only`, the default schema dump, and `--data-only
  --use-copy`. Name no `--schema`: the default data dump already holds `auth`
  and `app`.
- The dump holds `pg_cron` and `internal.cleanup_guests()` but no `cron.job`
  row, so the restore registers `cleanup-guests` again and confirms one row
  owned by `postgres`.
- A second database on the local Postgres cannot prove a restore. `schema.sql`
  leaves out `auth` while 6 foreign keys need `auth.users`, `roles.sql` stops at
  an existing `griddo_writer`, and `pg_cron` works only in `postgres`.
- Planned target, not yet run: reset the local stack from a temporary workdir
  with the same project id and no migrations, confirm `griddo_writer` is gone,
  restore, and finish with `pnpm test:db`, which brings the branch back.
- Compare before and after: function owners and ACLs, RLS, policies and default
  privileges, not only row counts. On 2026-11-01 the dump held 83 owner
  statements for `griddo_writer` and 29 policies.
- `data.sql` holds `auth.users`, sessions and refresh tokens: folder `700`,
  files `600`, no contents in logs or the ledger, counts only. The Mac has no
  `psql`, so the steps go through `docker exec`.
- Delete the dump within 7 days once the migration proves sound.
- `app.nodes` references itself (`parent_id`), so `pg_dump` warns about a
  circular foreign key and a data-only dump cannot order parents first
  (seen in the interim dump, 2026-11-04). The restore runs `SET
  session_replication_role = replica` before `data.sql`, as Supabase's own
  restore does: `psql --single-transaction --variable ON_ERROR_STOP=1 --file
  roles.sql --file schema.sql --command 'SET session_replication_role =
  replica' --file data.sql`.
- That setting also skips foreign-key checks during the load, so the restore
  test counts orphan rows afterwards for every composite foreign key (`nodes`
  to itself, `bits`, `chunks`, `scratch_breakdowns`, `staged_candidates`) and
  for `user_id` to `auth.users`; each count must be 0, and only counts are
  recorded. The setting needs superuser-level rights; the role that runs it on
  the local stack is recorded in the ledger.

### Restore procedure, as proven (Task 259, 2026-11-06)

The Phase 52 close dump passed its restore test only with these additions to
the command above (Phase 52 ledger, Task 259 step 1 and MI-2). They hold for a
restore of a manual dump while the dump lasts; the in-app restore (Phase 53)
and the recovery drill (migrations from Git) do not restore a dump and need
none of them.

- Run as a superuser (`supabase_admin` on the local stack). As `postgres`,
  `roles.sql` stops at `GRANT SET ON PARAMETER log_min_messages` (`permission
  denied`).
- Before `schema.sql`, remove the stack's default privileges in `public`, then
  put the stack's own back after the load. Otherwise every function the
  restore creates also gets `EXECUTE` for `anon` and `service_role` (48
  functions in this test), which production does not grant, because the
  dump's `GRANT`s only add:

  ```sql
  -- before schema.sql
  ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM postgres, anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public REVOKE ALL ON SEQUENCES FROM postgres, anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public REVOKE ALL ON TABLES FROM postgres, anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated, service_role;
  -- after data.sql: the stack's own defaults (future objects only)
  ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
  ```

- Skip a `COPY` block for a platform table the target's image lacks only when
  the block holds 0 rows (`storage.bucket_lifecycle_states` and
  `storage.lifecycle_abandoned_artifacts` in this test); a block with rows
  stops the restore for a decision.
- Finish with the read-only catalog listing (`scripts/verify/catalog.sql`) on
  the restored database and on production, compared line by line after
  display-only normalizations (`uid()` against `auth.uid()`; the stack's
  `pg_db_role_setting` lines).
- Unproven: a dump restore into a hosted project, whose `postgres` is not a
  superuser. Accepted until the manual dump retires (user, 2026-11-06); a real
  recovery before then rehearses on the local stack first and checks the
  hosted result with the same catalog listing.

### Interim dump (user, 2026-11-04)

Until Phase 52 closes, production has no backup at all, since a dump comes
only at a DB-lane close. So the user takes one manual dump in the week of
2026-11-04, outside any phase.

- Not tied to a migration, so CLAUDE.md's seven-day rule does not apply: it is
  kept until the Phase 52 close dump passes its restore test, then deleted
  within 7 days.
- Kept long, so it leaves out session and token data: `--exclude` (CLI 2.121.0,
  data-only dumps) drops `auth.sessions`, `auth.refresh_tokens`,
  `auth.mfa_amr_claims` (its rows reference sessions, so keeping them would
  break the restore's foreign keys), `auth.one_time_tokens` and
  `auth.flow_state`. A restore then signs everyone out; `auth.users` and
  `auth.identities` stay, so the same provider accounts sign in again.
- Not restore-tested on its own. The Phase 52 close dump uses the same
  commands, so its restore test also proves this dump's form.
- Folder `700`, files `600`, outside the repository and outside any synced
  folder; checked by counts and table names only, never contents.

## User tasks

Secrets go only to the user's password app and the runtime's secret store,
never to chat or Git (the repository is public).

One-time:

- This week: the interim dump
  ([Interim dump](#interim-dump-user-2026-11-04)).
- Enable Cloudflare R2 (the Turnstile account exists; R2 may ask for a payment
  method) and create the bucket.
- R2 tokens: read-write for the Edge Function; read-only for the Mac's restore
  check; the drill's copy step uses a token kept in a `chmod 600` file outside
  Git.
- Healthchecks.io sign-up and two checks (daily summary; 31-day restore
  check); confirm email alerts; ping URLs into the function's secrets and the
  password app.
- The backup-only shared secret, in Vault and the function's secrets.
- Approve the production migrations, the function deploy and the manual dump
  at the phase close.
- Recovery drill: confirm no other free project is active, create and later
  delete the drill project, add and later remove its callback on the
  development Google client.

Recurring:

- Monthly: run the periodic restore check (a reminder email comes after 31
  days without a run).
- On a Healthchecks.io email: read the failure details in the database.

## Phase split

Proposed to the control tower (user, 2026-11-04). The measure: how soon real
data is protected. All three are DB-lane phases, so they run one after
another; the app lane (Phase 51) may run beside any of them.

| Phase | Scope | Leaves behind |
|---|---|---|
| 52 Backup | Automatic backup, `Back Up Now`, status, alerts, deleting R2 objects with the account | Automatic backups of real data |
| 53 Restore | Restore, concurrency, recovery drill, monthly check | The manual dump's retirement |
| 54 Deletion grace | The 24-hour grace period and cancel (`2026-10-31-account-deletion-grace-period`) | Protection from a mistaken deletion |

- **52-1** local go/no-go measurement: CPU, memory, fingerprint cost, request
  body limit ([Measurement and acceptance](#measurement-and-acceptance)).
- **52-2** SQL: status columns, `export_account`, `account_fingerprint`, the
  backup functions, `pg_net`, the backup and summary cron jobs,
  `internal.r2_deletions`, and the cleanup's lock-then-recheck (an existing gap
  in the same function, so it lands with the deletion list); refusal tests and
  the REST 30 s test.
- **52-3** Edge Function: scheduled backup, `Back Up Now`, status, summary with
  Healthchecks.io, pruning, `identity.json`, the deletion list.
- **52-4** UI: the sidebar `Backup` button with its status dot and running
  motion, and its dialog (guest and account variants) with status,
  `Back Up Now` and the privacy note; no `Restore…` yet. Last task of the
  phase; merges `main` when it starts.
- **52 close:** the first manual dump and its restore test (it resets the
  local stack, so at a time the app lane runs no browser check; the app lane
  seeds again after it), function deploy, migrations, merge, the production
  10 MB measurement, one scheduled run confirmed, an alert email forced and
  received.
- R2 deletion ships in 52 because the modal promises from the first backup that
  deleting the account deletes its backups.
- **53:** `restore_staging`, `restore_account`, the restore flow and
  `Restore…`, the restoring screen and `BroadcastChannel`, the monthly check
  script, the recovery drill.
  Close: dump, function, migrations, merge, the production restore
  measurement. Kept apart from 52 because its locks, review and concurrency
  tests are the heaviest part and would delay the first backups; until it
  closes, the manual dump stays the proven recovery path.
- **54:** the cleanup's 24-hour condition, `cancel_account_deletion`, the added
  rejection field, the copy and `Cancel deletion`. No dependency on 53, so the
  control tower may swap their order.
- Every close: dump, then functions, then migrations, then the merge (52 is the
  first introduction, so the function comes before the migrations;
  [Deploy order](#deploy-order)). Every SQL task: PLANNING_STANDARD §6, the
  cross-account test and an `expert` review.
- Discarded: everything in one phase (the latest start for backups); 52 backup
  with restore and 53 drill with grace (52 grows, and the drill leaves the code
  it tests).
