# Flow-Trace Review: Phases 52–54 (Account Backup, Restore, Deletion Grace; Tasks 255–266)

**Scope:** Phases 52–54 of `docs/EXECUTION_PLAN.md`, one review for all three
(backup B14). **Base:** `origin/main` `b5f1074`, branch `docs/backup-promotion`.
**Authority:** the account-backup and deletion-grace `DECISION.md` files and the
backup `PROMOTION_MAP.md` (B1–B16).

## Round 1 — 2026-11-05, independent `expert` review

Verdict: **GAPS FOUND** (50 flows: 29 owned, 16 weak, 5 gap rows from four
findings). Code facts the plan relies on were verified (`parseSnapshotValue`
reads only the five table keys; `tsconfig` includes `**/*.ts`; vitest includes
only `src/**`; `cleanup_guests()` takes targets from one unlocked query;
sidebar order Home, account, `+`; `functions.invoke` returns a raw response
only for `text/event-stream`).

| Finding | Summary | Repair (round 1) | Kind |
|---|---|---|---|
| G1 | Unknown outcomes were not tied to their own request: the way-out read "the latest staging row", `backup_status` had no run id, and the 180 s and 5-minute tests used an unspecified clock | Client-generated run and restore ids; `manual_run_id`, `manual_result`, `manual_finished_at`; `backup_read_status(p_user_id, p_run_id, p_restore_id)` returns a server-clock verdict (`running`/`finishing`, result, `interrupted`/`not_applied`, `not_started`); snapshot `backup` carries `server_now`; ages never from the device clock (SCHEMA §Account backup, SPEC §Account backup, Tasks 256, 258, 260–262) | Mechanical + one copy line (user) |
| G2 | Nothing refused a guest JWT, whose objects would never be deleted | The function refuses `is_anonymous` before any read or write; refusal tests (SCHEMA §Account backup, Tasks 257, 261) | Mechanical |
| G3 | Phase 53 close order "dump, function, migrations" contradicted CLAUDE.md §Production | Task 264: dump, migrations (expand), function, merge; DECISION metadata records the supersession | Mechanical |
| G4 | The deletion-grace dialog's fields came only from `ensure_account()` | Any other `account_deleting` triggers one `ensure_account()` read; second-browser acceptance (SPEC Deletion-grace dialog, Task 266) | Mechanical |
| W1 | `pg_net` request timeout, caller-gone behavior, gateway `verify_jwt` | Task 255 item 6 measures them; `[functions.backup] verify_jwt = false` with JWT verification in the function; Task 259 deploys with it | Mechanical |
| W2 | Restore order put the rate check after the pre-restore upload | `restore_begin()` first, then `restore_stage()`; `restore_abort()`; `service_role` `update` on `restore_staging` | Mechanical |
| W3 | Overlapping runs undefined | `already_running` under the `backup_begin()` lock; client shows `Backing up…` with `Check again`; concurrency test | Mechanical + copy reuse (user) |
| W4 | Dot stale after the tab's own result | The tab's result and status read replace the `backup` value (later `server_now` wins) | Mechanical |
| W5 | `restore-ended` only on `applied` | Posted with the outcome on every terminal outcome | Mechanical |
| W6 | Streaming through `functions.invoke` | `text/event-stream`; the client's deadline covers the body read | Mechanical |
| W7 | Missing acceptance lines | Added to Tasks 256–258, 260, 266 | Mechanical |
| W8 | Accounts with a deletion request in the scheduled run | The dispatch skips them; a pre-upload refusal records nothing | Mechanical |
| W9 | "A stale tab's next write conflicts" was wrong for ordinary writes (S15) | Reworded: revision-checked commands conflict; ordinary writes stay last-write-wins; the refetch shows the restore | Mechanical (DECISION text inaccurate) |
| W10 | Drill preconditions | Google identity, cross-bucket copy tokens, the app instance and redirect allow-list (Task 264) | Mechanical |
| W11 | Phase 54 is the "next SQL phase" that should replace the dump | **User decision** | Product |
| W12 | Interim dump deletion unowned | Task 259 step 8 | Mechanical |
| W13 | `backup_summary()` needed `auth.users` | The postgres-owned summary dispatch counts `missing` and sends the count | Mechanical |
| W14 | Staging cleanup cadence | Hourly `postgres` job | Mechanical |
| W15 | Copy written at promotion | **User confirmation** | Product |
| A1–A8 | Stale DECISION text, §6 grant wording, fingerprint without parsing, local secrets, 8 GB undercount, R2 price recheck, alert coverage, test alias | A1, A2, A3 (`backup_fingerprint()`, Task 255 item 9), A4, A5 (`stored_bytes` includes pre-restore files), A6 (Task 255 preparation), A8 repaired; A7 accepted | Advisory |

**User decisions after round 1 (2026-11-05, B17):** W11: Phase 54 keeps the
manual dump and rehearses the full-account backup once at its close without
blocking it; W15 and the G1 line: the six copy lines are confirmed and may
change at their checkpoints; W3: `Backing up…` with `Check again`. Control
tower additions applied with them: the reverse refusal test (no deletion
without an `r2_deletions` row, Task 257), the time-zone date-boundary tests
(Tasks 258, 262), and the Task 259 alert step's duration (more than a day).

## Round 2 — 2026-11-05, same reviewer

Verdict: **GAPS FOUND**: one gap and three weak items, all mechanical. Every
round-1 gap is owned; the cross-document checks (grant list against function
list, verdict names, copy table, B-references, task numbers) found no
contradiction.

| Finding | Summary | Repair |
|---|---|---|
| R2-G1 | A permanently failing account counted as `missing` every day and the 8 GB total sent `/fail` every day, keeping the check down so a new failure on another account would never email | `missing` = no run result of any kind for 36 hours (`last_finished_at`); the summary alerts only on a change, using `internal.backup_summary_state` (`last_summary_at`, `over_limit`); Task 257 acceptance (B18; refines DECISION §Failure alerts toward its stated goal) |
| R2-W1 | `Check again` after `already_running` would read a run id that was never recorded and show "didn't start" | It reads the status without a run id and shows the status line (SPEC; Task 258 acceptance) |
| R2-W2 | A restore read after the hourly cleanup returned `not_started` for an applied restore | New verdict `expired` (row gone, id still recorded): re-enter (SCHEMA, SPEC, Tasks 260, 262) |
| R2-W3 | Leftovers of the W2 and G3 repairs | Task 256 leaves out all three Phase 53 functions and creates `backup_read_status` in its final signature; Task 255 item 3 measures `restore_stage()`; `finished_at` names `restore_abort()`; PS §6 adds the `is_anonymous` refusal |

## Round 3 — 2026-11-05, same reviewer

**Flow ownership: PASS.** R2-G1 and R2-W1 to R2-W3 are owned; no new Gap or
Weak item; the catalog-test scope lists every `internal` object
`service_role` touches. Three advisory points were applied at once: the
backup functions compute epoch milliseconds inline (`internal.now_ms()` stays
`griddo_writer` only); the migration inserts `internal.backup_summary_state`'s
single row; the `expired` wording in SCHEMA §Account backup Restore.

**Implementation readiness: READY**, in task order 255 → 266; Phase 53 waits
for Phase 52's close and Phase 54 for Phase 53's close. Open user decisions:
none (B17 and B18 recorded).
