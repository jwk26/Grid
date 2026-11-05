# Task 255 measurements (local only)

Counts and times only; never run against production. Database scripts refuse any host but
`127.0.0.1` and `localhost`.

- `account.mjs up|down`: a ~10 MB account under a random test user plus temporary
  `public.measure_export` / `public.measure_fingerprint`; `down` deletes them.
- `s3-check.mjs local|r2`: PutObject, GetObject, CopyObject, ListObjectsV2, DeleteObjects.
- `measure-fn/`: a temporary Edge Function (copy it to `supabase/functions/measure/` while
  measuring, then delete the copy). `/run` is item 1, `/sleep` item 6, `/spin` and `/alloc` item 7.
  It is not under `supabase/functions/`, so `pnpm check:edge` never sees it.
