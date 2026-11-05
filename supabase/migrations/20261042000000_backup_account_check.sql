-- Task 257: the pre-upload account check (SCHEMA §Backup functions, §Deleting R2 objects).
--
-- `app` is not exposed to the API and no other backup function answers whether an account still
-- exists without a deletion request, so the Edge Function calls this right before an upload.
-- Expand only: a new function; nothing deployed reads it.
--
-- SQL function checklist (PLANNING_STANDARD §6, S38):
--   (1) schema: `public`, a backup function (service_role alone), not a client function;
--   (2) owner: the caller (`security invoker`), running as service_role with an explicit
--       p_user_id that filters the statement; not `security definer`;
--   (3) empty search_path, schema-qualified names;
--   (4) EXECUTE revoked from public, anon and authenticated, granted to service_role only;
--   (5) locks: none. A plain read; a request committed after it is caught by the next run;
--   (6) one JSON value with `status`; no `changes`, no client calls it;
--   (7) no account limits: nothing is created;
--   (8) tests: supabase/tests/backup-account-check.db.test.ts, backup-grants and coverage suites.

create function public.backup_account_check(p_user_id uuid) returns jsonb
  language plpgsql stable security invoker set search_path = ''
  as $$
begin
  if p_user_id is null then
    raise exception 'backup_account_check needs a user' using errcode = '22023';
  end if;
  return jsonb_build_object('status',
    case
      when not exists (select 1 from app.accounts a where a.user_id = p_user_id) then 'account_missing'
      when exists (select 1 from app.accounts a
                    where a.user_id = p_user_id and a.deletion_requested_at is not null)
        then 'account_deleting'
      else 'ok'
    end);
end
$$;

revoke all on function public.backup_account_check(uuid) from public, anon, authenticated;
grant execute on function public.backup_account_check(uuid) to service_role;
