# Issues — Phase 54: Account deletion grace period

Branch: phase-54/account-deletion-grace · Started: 2026-11-09
Carried over (`Issues_Deferred.md`):
- Phase 53 Task 265 note, read at this start: the production Security Advisor baseline is 49 results (`supabase db advisors --linked --project-ref` from a directory without `.env.local`); production runs the `backup` function version 4, rolled back by deploying `git archive origin/main supabase/functions supabase/config.toml` from a temporary directory; `supabase secrets set` runs from an empty directory and is checked by names and sha256 digests; `db push` uses `--skip-vault`; any secret is entered by the user with the hidden-prompt block. Guard: before this phase's close removes its worktree, new local-only `.env.local` values are carried into the integration worktree's `.env.local` (values not printed). Read again at the close.
- Phase 53 manual dump retirement: the three conditions hold, but this phase's close still takes the manual dump (B17) and rehearses `internal.dispatch_backups()` once beside it (plan, Phase 54 close).
- Phase 53 mi-5 (with Phase 51 mi-1): load-dependent `triage-workspace.test.tsx` and `datastore.live-read.test.ts` failures; a recurrence in a gate is checked against these first.
- Outside the phase: deletion of the Phase 53 close dump `~/griddo-dumps/2026-11-08-close/` by 2026-11-15.

Plan fixes at start (user-approved, 2026-11-09):
1. Task 265 Files: `supabase/tests/guest-cleanup.db.test.ts` "deletes an account with a deletion request on the next run, whatever its age" asserts the pre-grace rule; it backdates the request beyond 24 hours and adds a younger-request survival check. `backup-cleanup.db.test.ts` uses `deletion_requested_at = 1` and needs no change.
2. Task 266 Files: `src/lib/backup/restore-channel.ts` accepts only `restore-started` and `restore-ended` (`isMessage` drops anything else), so the cancel message needs its own type and a listener (`restore-controller.ts` or a new subscriber) that repeats entry. In a tab that shows the dialog, confirm that the listener is actually mounted (today the restore controller created by `app-frame.tsx`'s `useRestore()`) and that `getUserId()` returns the user's id, since the listener ignores a message when it returns `null` (control tower addition, user-approved).

Baseline gate (2026-11-09, `origin/main` `af4147a3`): `git diff --check` pass; `pnpm lint` 0 errors, 10 warnings; `pnpm typecheck` pass; `pnpm test` 2983 passed (174 files); `pnpm build` pass; `pnpm check:edge` pass (42 files); `pnpm test:db` 1128 passed (48 files).

Environment at start: `.env.local` was copied from the integration worktree (git-ignored, mode 600, values not printed); it holds every name in `.env.local.example` except `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `SUPABASE_AUTH_CAPTCHA_SECRET` (Cloudflare's public test keys, not secrets; needed only for a guest sign-in in Task 266's browser checks). No `edge_runtime` container was running on local Supabase (the Phase 53 worktree that served it was removed at its close); the gate passed without it. Local Supabase CLI `2.121.0`.
