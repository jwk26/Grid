# Hosted Supabase checks (Task 218)

Scripts that prove the database design on hosted Supabase. Each runs against local
Supabase with `--local` (so a script is proven before it touches production) and against
production without it.

Production values are never in Git. Write them once to a file outside the repository,
`~/.config/griddo/production.env` (`chmod 600`; override the path with
`GRIDDO_PRODUCTION_ENV`):

```
GRIDDO_PROD_DB_URL=<Session pooler URI of the production database>
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key>
GRIDDO_PROD_DB_CA=<path of the Supabase CA certificate, outside the repository>
```

The free plan's direct connection is IPv6-only, so use the Session pooler URI. Percent-encode special characters in the
password inside the URI (`@` is `%40`, `/` is `%2F`, `:` is `%3A`), and leave `sslmode` out of the URI:
the scripts verify the server certificate against the CA file (Database → SSL Configuration in the
dashboard, download the certificate). The scripts never print these values.

| Script | What it proves | Leaves behind |
|---|---|---|
| `hosted-roles.mjs` (+ `hosted-roles.sql`) | write role (S14), internal-function grants (S29 (1)), account-deletion role (S42 (1)) | Nothing: the SQL ends in `ROLLBACK`; the runner checks for leftovers |
| `pg-cron-check.mjs` | `pg_cron` runs a job that deletes an anonymous auth user, cascade included (S22) | Nothing: the job is unscheduled and `pg_cron` dropped again if the script enabled it |
| `api-check.mjs` | schema `app` is not exposed: `PGRST106`, no table in OpenAPI or GraphQL, as `anon` and as `authenticated` | Nothing: its anonymous user is deleted. The authenticated part needs anonymous sign-in on |
| `d8-measure.mjs` | snapshot load time and size, limit-sized and one-tenth account (D8) | Nothing: both accounts are deleted and the script checks 0 rows are left. Needs anonymous sign-in on, for the measurement only |

Run order on production: `hosted-roles`, `pg-cron-check`, then with anonymous sign-in on
`d8-measure` and `api-check`, then anonymous sign-in off.

```
node scripts/verify/hosted-roles.mjs [--local]
node scripts/verify/pg-cron-check.mjs [--local]
node scripts/verify/api-check.mjs [--local]
node --no-warnings scripts/verify/d8-measure.mjs [--local]
```

Migrations reach production with `pnpm exec supabase db push --db-url "$GRIDDO_PROD_DB_URL" --dry-run`
first, then without `--dry-run`, never with `--include-seed`; the URL comes from the file
above (`set -a; . ~/.config/griddo/production.env; set +a` in the user's own shell).
