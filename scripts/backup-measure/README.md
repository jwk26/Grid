# Task 255 and 259 measurements

Counts and times only. The Task 255 scripts are local only: they refuse any host but `127.0.0.1` and
`localhost`. `close-measure.mjs` (Task 259) is the one that can target production.

- `account.mjs up|down`: a ~10 MB account under a random test user plus temporary
  `public.measure_export` / `public.measure_fingerprint`; `down` deletes them.
- `s3-check.mjs local|r2`: PutObject, GetObject, CopyObject, ListObjectsV2, DeleteObjects.
- `measure-fn/`: a temporary Edge Function (copy it to `supabase/functions/measure/` while
  measuring, then delete the copy). `/run` is item 1, `/sleep` item 6, `/spin` and `/alloc` item 7.
  It is not under `supabase/functions/`, so `pnpm check:edge` never sees it.
- `close-measure.mjs [--local] [--run]` (Task 259 step 4): the limit-sized measurement of the
  deployed backup function. Without `--run` it only checks (privileges, the cron windows) and writes
  nothing. With `--run` it builds one temporary OAuth account at the old 100% caps, times
  `export_account()` and three function runs (shared-secret `scheduled` mode), then deletes the
  account, its rows and its R2 objects, also on SIGINT and SIGTERM, and counts what is left.
  `--local` rehearses it on local Supabase (`supabase functions serve --env-file .env.local`
  running); without it, it targets production and reads `~/.config/griddo/production.env` and
  `~/.griddo-secrets/prod-edge-secrets.env`. It refuses to run near 17:00, 19:00 and 03:17 UTC.
- `prod-console-check.js` (Task 259 step 6): not Node: pasted into the browser console of the
  production page, signed in as the owner. Calls the function's `manual` and `status` modes once each
  with the page's own session token (read from localStorage, never printed or sent elsewhere), to prove
  the browser's CORS preflight, `getClaims` through the JWKS path and `SUPABASE_ANON_KEY` on hosted.
  `manual` makes the owner's first real backup.
- `hosted-body-probe.mjs [--local]` (Task 260 stage 1): POSTs a control body, an about 10.5 MB body
  and an about 21 MB body (record only) to a nonexistent rpc name with the publishable key only.
  Pass is 404 `PGRST202` naming `p_payload`; 413 is the limit; anything else is inconclusive. Prints
  statuses and codes only, URL masked; changes nothing. Without `--local` it reads
  `~/.config/griddo/production.env`.
