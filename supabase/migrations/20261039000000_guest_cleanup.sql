-- Task 238, Stage 1: the daily guest cleanup (SCHEMA §Guest cleanup; S10, S22, S42 (5)).
--
-- internal.cleanup_guests() deletes from auth.users, and the `user_id` cascade removes every row
-- of the account. It deletes
--   1. an anonymous user whose accounts.last_visit_at is more than 7 days old;
--   2. an anonymous user with no accounts row (sign-in done, ensure_account() never ran, or the
--      extra guest of two first-visit tabs) 7 days after auth.users.created_at;
--   3. every account with a deletion request (the account-deletion fallback, Task 235),
--      real or anonymous, whatever its age.
-- A real account is never deleted otherwise (S23).
--
-- SQL function checklist (PLANNING_STANDARD §6, S38):
--   (1) schema `internal`: only pg_cron calls it;
--   (2) owner `postgres`, the one role that can delete from auth.users (Task 218). It is
--       `security invoker` because it runs as its owner, so no definer rights are needed and the
--       "definer functions belong to griddo_writer" rule is untouched;
--   (3) empty search_path, schema-qualified names;
--   (4) EXECUTE revoked from public, anon, authenticated, service_role and griddo_writer, and
--       granted to nobody: the pg_cron job runs as postgres, the owner;
--   (5) no Grid locks: it touches no Grid row itself, the cascade deletes whole accounts;
--   (6) no result envelope: it is not a client function and returns nothing;
--   (7) no account limits: it creates nothing;
--   (8) the tests are in guest-cleanup.db.test.ts: cross-account (another account's rows
--       survive); concurrency and change-set match do not apply (no client caller, no changes
--       envelope). The one real concurrency case, a client write on an account under deletion,
--       is handled by the per-account delete below.
-- A guest returning after its cleanup finds its auth user gone; the session-expired screen
-- (guest variant) handles it (SPEC §App-level screens).

-- Off by default on the free plan (Task 218); `cron` is the extension's own schema.
create extension if not exists pg_cron;

create function internal.cleanup_guests() returns void
  language plpgsql security invoker set search_path = ''
  as $$
declare
  v_id uuid;
begin
  for v_id in
    select u.id from auth.users u
     where exists (
             select 1 from app.accounts a
              where a.user_id = u.id and a.deletion_requested_at is not null
           )
        or (
             u.is_anonymous
             and (
                   exists (
                     select 1 from app.accounts a
                      where a.user_id = u.id
                        and a.last_visit_at
                            < (extract(epoch from transaction_timestamp()) * 1000)::bigint - 7 * 86400000
                   )
                   or (
                     not exists (select 1 from app.accounts a where a.user_id = u.id)
                     and u.created_at < transaction_timestamp() - interval '7 days'
                   )
                 )
           )
  loop
    -- One delete per account. A client write on the same account can hold a lock the cascade
    -- needs while the cascade holds the auth user the write's foreign key check needs; Postgres
    -- then aborts one side. Here only that account is skipped, and the next daily run takes it,
    -- so one busy account never stops the deletion of the others.
    begin
      delete from auth.users where id = v_id;
    exception when deadlock_detected or lock_not_available then
      null;
    end;
  end loop;
end
$$;

revoke all on function internal.cleanup_guests() from public, anon, authenticated, service_role, griddo_writer;

-- Daily, 03:17 UTC. Scheduling an existing job name replaces it, so a rerun keeps one job.
select cron.schedule('cleanup-guests', '17 3 * * *', 'select internal.cleanup_guests()');
