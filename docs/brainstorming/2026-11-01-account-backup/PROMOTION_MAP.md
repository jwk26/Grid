# Account Backup, Restore and Deletion Grace — Promotion Map

## Metadata

- Created: 2026-11-05
- Status: canonical documents, execution plan (Phases 52–54, Tasks 255–266)
  and flow review (round 3 PASS) ready for approval, 2026-11-05
- Route: `/craft-docs` promotion route, branch `docs/backup-promotion` from
  `origin/main` `b5f1074`
- Sources: this topic's `DECISION.md` (Decisions 2026-11-01 and 2026-11-04,
  Interim dump, Phase split; PR #72 `e806e5d`, PR #74 `b5f1074`) and
  `2026-10-31-account-deletion-grace-period/DECISION.md` (Decisions
  2026-11-04). `NOTES.md` is context only.
- Prototype sources: none. The PR #74 option sheet is the user's own reference
  and is not adopted or cited; its outcome is in `DECISION.md`.
- Start material: the control tower's session brief (outside Git). Its
  proposals were reviewed zero-base; the outcomes below are the user's
  decisions of 2026-11-05.

## Decision map

| Decisions | Target |
|---|---|
| Runner, Export path, Deploy order | SPEC Architecture Decision 1, Tech Stack, §Environments And Hosting; CLAUDE.md Architecture 1, Key Paths, §Production |
| Export path, backup functions, Restore, Concurrent writes | SCHEMA §Schemas and roles, §Tables (`backup_status`, `restore_staging`), §RLS and grants, §Database Functions (Backup functions), §Snapshot, §Locks |
| Backup status, Retention, Object key, Format versions, Limits | SCHEMA §Account backup (new) |
| Deleting R2 objects; grace Decisions 1–5, 7 | SCHEMA §Account deletion, §Guest cleanup, `internal.r2_deletions` |
| Modal and copy, Running motion, Restoring screen; grace Decisions 6, 8, 10 | SPEC §Account backup (new) and §App-level screens, §Feedback copy; DESIGN_TOKENS §SaaS App-State Surfaces roles and `DP-BACKUP-01` |
| Measurement and acceptance, Failure alerts, Recovery drill, Periodic restore check, Retiring the manual dump, First manual dump and restore test, Interim dump, User tasks | EXECUTION_PLAN Phases 52–54 |
| Rule conflicts B1–B18 below | CLAUDE.md, SPEC, SCHEMA, PLANNING_STANDARD §6 |
| Phase split (52 backup → 53 restore → 54 deletion grace) | EXECUTION_PLAN Phase Index, Dependency Graph, Next Numbers |

## Decisions made in this promotion (user, 2026-11-05)

| ID | Decision | Replaces or adds |
|---|---|---|
| B1 | Server code lives only in Supabase: database functions and one backup Edge Function. No other server runtime or Edge Function without a canonical decision. Tech Stack gains Edge Functions, R2, `pg_cron` + `pg_net`, Healthchecks.io. | SPEC AD1 "runs entirely in the browser"; SPEC OAuth "there is no server code" |
| B2 | Browser calls to the function go through `src/lib/backup/backup-client.ts` (outside `DataStore`, like `session.ts`); UI uses `src/hooks/use-backup.ts`. | PLANNING_STANDARD §6 DataStore facade allow list |
| B3 | `EDGE_REQUEST_TIMEOUT_MS = 160000` (150 s wall clock + 10 s) for `Back Up Now` and restore; the status read keeps `REQUEST_TIMEOUT_MS`. The statuses a function killed at its limit returns are measured in 52-1 and added to the no-answer set. | adds |
| B4 | The restoring screen's way-out waits `EDGE_REQUEST_TIMEOUT_MS`, not 2 minutes; the restore start time and `restore_id` are recorded. | DECISION §Restoring screen "2 minutes" |
| B5 | A restore's outcome is read from its postcondition: `restore_account()` writes its result into its `restore_staging` row and clears the payload in the same transaction; the hourly cleanup deletes the row. No result 180 s after the start = not applied; a row already gone = re-enter and read the account. 53's `expert` review confirms this against writing the result to `backup_status`. | DECISION §Restore step 4 "deletes the staging row" |
| B6 | Rule: the `interrupted` threshold ≥ wall clock + statement timeout + margin (150 + 30 s < 5 min). Between the 160 s read and `interrupted`, the state is `Still finishing…` with `Check again`, never a failure. On a paid plan (400 s) the three values change together. | adds |
| B7 | `Back Up Now` learns its end from its own response; no status polling. A scheduled run's result reaches an open tab at its next entry, focus or reconnect refetch. | adds |
| B8 | Backup status lives in a new `app.backup_status` table, written only by `service_role`; `get_snapshot()` returns the caller's row as `backup` (expand: the deployed parser reads only the five table keys). | DECISION §Backup status "The `accounts` row holds" |
| B9 | Rule 10 exception: the backup functions, executable by `service_role` only, each with an explicit user id; `service_role`'s grants are a fixed list, proven by a catalog test over `app`, `internal` and `public` (not `dev`, not Supabase's own schemas). | CLAUDE.md Architecture 10; SCHEMA §Schemas and roles; PLANNING_STANDARD §6 (2) |
| B10 | Edge code: pure modules in `supabase/functions/_shared/` (relative `.ts` imports; `@edge-shared/*` from `src/`; tested by vitest, checked by `tsc` and `deno check`); the Deno handler excluded from the root `tsconfig` and ESLint; `pnpm check:edge` on every DB-lane task and every phase close once it is on `main` (from the Phase 52 merge; inside Phase 52 after Task 255); integration tests in `pnpm test:db`; Deno pinned (pnpm devDependency if published, else global, decided in 52-1); `deno.json` + `deno.lock`. | CLAUDE.md §Gates |
| B11 | Local object storage: local Supabase Storage's S3 endpoint first; a separate S3-compatible container if any of the five calls fails; the endpoint is an environment variable. Real R2 compatibility is checked once in 52-1 with a development bucket. Tests write only under random user ids and delete their keys; files left after a reset never change a result; the 8 GB check sums recorded sizes. | adds |
| B12 | The function URL and the shared secret live in Vault; locally `[db.vault]` reads `.env.local`; on production the owner sets them outside Git. Secrets are configuration, not schema: the ledger records that and when they were set, never a value; a rotation changes Vault and the function secret together, outside the cron window. | CLAUDE.md §Production |
| B13 | User preparation is split by the step that needs it (52-1, 52 close, 53 close). | DECISION §User tasks order |
| B14 | One flow review covers Phases 52–54. | adds |
| B15 | Phase waits: 52 none, 53 waits for 52, 54 waits for 53, because 54 reuses 53's other-tab follow (`BroadcastChannel`) and its blurred-frame dialog. | DECISION §Phase split "no dependency on 53" (order kept, reason added) |
| B16 | The recovery drill copies the account's objects into a drill-only bucket, and the drill function holds a token scoped to that bucket only. The operations script takes the target bucket as an argument, so a real recovery uses it unchanged with the production bucket. | DECISION §Recovery drill "copy the old objects to the new key" (bucket made explicit) |
| B17 | Flow review round 1 decisions (user, 2026-11-05): Phase 54 keeps the manual dump and rehearses the full-account backup once at its close without blocking it; the six promotion-written copy lines are confirmed and may change at their checkpoints; a `Back Up Now` during a running backup shows `Backing up…` with `Check again`. | DECISION §Retiring the manual dump "the next phase that changes SQL" (now: the first SQL phase after Phase 54) |
| B18 | Flow review round 2 (mechanical, 2026-11-05): `missing` means no run result of any kind for 36 hours, and the summary alerts only on a new failure, a newly missing account or the first summary above 8 GB (`internal.backup_summary_state`), so a permanently failing account alerts once and never hides a new problem. | DECISION §Failure alerts "last successful check is older than 36 hours" and "checks whether the stored size passes 8 GB" |

## Delegated to `/craft-docs` by the DECISIONs

| Item | Outcome |
|---|---|
| CLAUDE.md §Production deploy order (DECISION §Deploy order) | Written with the B12 secrets step |
| SCHEMA list of `service_role` backup functions (§Export path) | SCHEMA §Backup functions with the B9 grant list |
| Owning role of the status-writing functions (§Export path) | `security invoker`, executed by `service_role` (B8, B9) |
| Guest modal privacy note and Cloudflare (§Modal and copy) | The guest note names the daily backups with Cloudflare for signed-in accounts; `public/privacy.html` gains the backup paragraph (Task in Phase 52) |
| CLAUDE.md §Backup manual-dump sentence | Not changed (§Retiring the manual dump); only "no scheduled job" becomes the Phase 52 automatic backup |

## Exclusions

- Account limits that count bytes (control tower candidate) and the FE/Visual
  ordering: outside this promotion.
- Pushing a restore or a cancel to other devices: discarded (NOTES).
- NOTES-only items are not promoted.

## Open questions

| Question | Owner | Class |
|---|---|---|
| Whether a `deno` npm package pins the version (B10) | 52-1 | phase-local (52) |
| Local object storage choice (B11), local function URL reachable from the database container (B12) | 52-1 | phase-local (52) |
