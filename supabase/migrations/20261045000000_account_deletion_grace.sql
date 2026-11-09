-- Task 265: the account deletion grace period (SCHEMA §Account deletion, Grace period and cancel;
-- deletion-grace Decisions 1-4, 7, 9). Expand only: no function, column or result shape that the
-- deployed code uses changes in kind.
--   1. internal.cleanup_guests() deletes a deletion request only once it is older than 24 hours,
--      keeping the lock-then-recheck and the r2_deletions record of Task 256.
--   2. public.cancel_account_deletion() clears the caller's request. It is the one write function
--      that accepts an account with a deletion request. Lock order as delete_my_account(): the L0
--      Grid lock, then the accounts row. It does not touch any other account.
--   3. ensure_account()'s `account_deleting` rejection adds `deletion_requested_at` and
--      `server_now` (epoch milliseconds); the deployed code reads only `rejection.code`.

-- ---------------------------------------------------------------------------------------------
-- cleanup_guests(): a request is old enough after 24 hours
-- ---------------------------------------------------------------------------------------------

create or replace function internal.cleanup_guests() returns void
  language plpgsql security invoker set search_path = ''
  as $$
declare
  v_id uuid;
  v_now bigint := (extract(epoch from transaction_timestamp()) * 1000)::bigint;
  v_has_account boolean;
  v_requested bigint;
  v_visit bigint;
  v_anonymous boolean;
  v_created timestamptz;
begin
  for v_id in
    select u.id from auth.users u
     where exists (
             select 1 from app.accounts a
              where a.user_id = u.id
                and a.deletion_requested_at < (extract(epoch from transaction_timestamp()) * 1000)::bigint - 86400000
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
    -- One delete per account (see Task 256): a busy account is skipped and the next run takes it.
    begin
      select true, a.deletion_requested_at, a.last_visit_at
        into v_has_account, v_requested, v_visit
        from app.accounts a where a.user_id = v_id for update;
      if not found then
        v_has_account := false; v_requested := null; v_visit := null;
      end if;

      select u.is_anonymous, u.created_at into v_anonymous, v_created
        from auth.users u where u.id = v_id for update;
      if not found then
        raise exception 'target is gone' using errcode = 'GDSKP';
      end if;

      if not v_has_account then
        -- An accounts row may have appeared while this waited for the auth user.
        select true, a.deletion_requested_at, a.last_visit_at
          into v_has_account, v_requested, v_visit
          from app.accounts a where a.user_id = v_id;
        if not found then
          v_has_account := false; v_requested := null; v_visit := null;
        end if;
      end if;

      if not (
           (v_has_account and v_requested is not null and v_requested < v_now - 86400000)
           or (v_anonymous and (
                 (v_has_account and v_visit < v_now - 7 * 86400000)
                 or (not v_has_account and v_created < transaction_timestamp() - interval '7 days')
               ))
         ) then
        -- Not `continue`: that keeps both row locks until the run ends. The private SQLSTATE
        -- rolls the block back and releases them at once.
        raise exception 'target no longer qualifies' using errcode = 'GDSKP';
      end if;

      if not v_anonymous then
        insert into internal.r2_deletions (user_id, requested_at) values (v_id, v_now)
          on conflict (user_id) do nothing;
      end if;
      delete from auth.users where id = v_id;
    exception when deadlock_detected or lock_not_available or sqlstate 'GDSKP' then
      null;
    end;
  end loop;
end
$$;

-- ---------------------------------------------------------------------------------------------
-- cancel_account_deletion()
-- ---------------------------------------------------------------------------------------------

-- The L0 lock comes first because ensure_account() reads deletion_requested_at unlocked under it:
-- a cancel serialized on L0 keeps the value that ensure_account() returns consistent. An account
-- the cleanup has already deleted has no accounts row, so the caller gets `account_missing`.
grant create on schema public to griddo_writer;

create function public.cancel_account_deletion() returns jsonb
  language plpgsql security definer set search_path = ''
  as $$
declare
  v_user uuid := internal.uid();
  v_requested bigint;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  perform internal.lock_grid(v_user, null);
  select deletion_requested_at into v_requested from app.accounts where user_id = v_user for update;
  if not found then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_missing'));
  end if;
  if v_requested is not null then
    update app.accounts set deletion_requested_at = null where user_id = v_user;
  end if;
  return internal.envelope('applied');
end
$$;

alter function public.cancel_account_deletion() owner to griddo_writer;
revoke all on function public.cancel_account_deletion() from public, anon, service_role;
grant execute on function public.cancel_account_deletion() to authenticated;
revoke create on schema public from griddo_writer;

-- ---------------------------------------------------------------------------------------------
-- ensure_account(): the account_deleting rejection carries the request time and the server time.
-- Generated from the live definition (pg_get_functiondef); only the account check differs.
-- ---------------------------------------------------------------------------------------------

create or replace function public.ensure_account(p_reserved_cells jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := internal.uid();
  v_now bigint := internal.now_ms();
  v_role text;
  v_node app.nodes;
  v_x integer;
  v_y integer;
  v_written jsonb := '[]'::jsonb;
  v_row jsonb;
  v_inbox uuid;
  v_seeded jsonb := null;
  v_requested bigint;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not internal.valid_reserved_cells(p_reserved_cells) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'invalid_input'));
  end if;

  -- Lock order: the L0 Grid lock, then the account row, then the system Node rows.
  perform internal.lock_grid(v_user, null);

  -- Unlocked read under the L0 lock: a cancel serializes on the same lock, so the value returned
  -- here is consistent with it. The rejection carries the request time and the server's time (S42).
  select a.deletion_requested_at into v_requested from app.accounts a where a.user_id = v_user;
  if v_requested is not null then
    return internal.envelope('rejected', null, '{}', jsonb_build_object(
      'code', 'account_deleting', 'deletion_requested_at', v_requested, 'server_now', v_now));
  end if;

  begin
    insert into app.accounts (user_id, created_at, last_visit_at)
    values (v_user, v_now, v_now)
    on conflict (user_id) do update
      set last_visit_at = greatest(app.accounts.last_visit_at, excluded.last_visit_at);
  exception when foreign_key_violation then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_missing'));
  end;

  -- A trashed or archived system Node returns to active in place, in its own cell when
  -- that is free, otherwise in the first free cell; a hidden one stays where it is. When no
  -- cell is free it is skipped and the rest of the call still applies.
  foreach v_role in array array['inbox', 'archive_view'] loop
    select * into v_node from app.nodes
     where user_id = v_user and system_role = v_role
       and (deleted_at is not null or archived_at is not null)
     for update;
    if found then
      if v_node.hidden_from_grid then
        v_x := v_node.x;
        v_y := v_node.y;
      else
        v_x := null;
        select f.x, f.y into v_x, v_y
          from internal.pick_free_cell(v_user, null, p_reserved_cells, v_node.x, v_node.y) f;
        if v_x is distinct from v_node.x or v_y is distinct from v_node.y then
          v_x := null;
          select f.x, f.y into v_x, v_y from internal.pick_free_cell(v_user, null, p_reserved_cells) f;
          if v_x is null then
            continue;
          end if;
        end if;
      end if;
      update app.nodes
         set deleted_at = null, archived_at = null, x = v_x, y = v_y,
             mtime = v_now, version = version + 1
       where id = v_node.id and user_id = v_user
      returning to_jsonb(app.nodes.*) into v_row;
      v_written := v_written || jsonb_build_array(v_row);
    end if;
  end loop;

  foreach v_role in array array['inbox', 'archive_view'] loop
    if exists (select 1 from app.nodes where user_id = v_user and system_role = v_role) then
      continue;
    end if;
    v_x := null;
    select f.x, f.y into v_x, v_y from internal.pick_free_cell(v_user, null, p_reserved_cells) f;
    if v_x is null then
      continue;
    end if;
    insert into app.nodes (id, user_id, title, color, icon, mtime, created_at, level, x, y, system_role)
    select gen_random_uuid(), v_user,
           case v_role when 'inbox' then 'Inbox' else 'Archive' end,
           case v_role when 'inbox' then 'hsl(221, 83%, 53%)' else 'hsl(240, 4%, 46%)' end,
           case v_role when 'inbox' then 'inbox' else 'layers' end,
           v_now, v_now, 0, v_x, v_y, v_role
    on conflict do nothing
    returning to_jsonb(app.nodes.*) into v_row;
    if v_row is not null then
      v_written := v_written || jsonb_build_array(v_row);
      v_row := null;
    end if;
  end loop;

  -- Step 3 (Task 237): the demo seed, for a guest that has not been seeded and holds no row
  -- besides its system Nodes. The L0 Grid lock and the account row are held; the Inbox Grid lock
  -- comes next, and only for a guest that looks empty, so no Scratch exists whose command could
  -- hold the Inbox lock and wait for the L0 lock (SCHEMA §Locks, Order). The emptiness is
  -- checked again once the Inbox lock is held.
  if internal.is_guest()
     and exists (select 1 from app.accounts where user_id = v_user and seeded_at is null)
     and not exists (select 1 from app.nodes where user_id = v_user and system_role is null)
     and not exists (select 1 from app.bits where user_id = v_user) then
    select id into v_inbox from app.nodes
     where user_id = v_user and system_role = 'inbox' and deleted_at is null and archived_at is null;
    if v_inbox is not null then
      perform internal.lock_grid(v_user, v_inbox);
    end if;
    if not exists (select 1 from app.bits where user_id = v_user) then
      v_seeded := internal.copy_demo_seed(v_user, v_now, v_inbox, p_reserved_cells);
      update app.accounts set seeded_at = v_now where user_id = v_user;
      -- Hook 1: the Inbox is not older than its Scratches. An Inbox made by this call already
      -- carries v_now; one that an earlier call made is touched here and returned in the changes.
      if v_inbox is not null then
        update app.nodes set mtime = v_now where id = v_inbox and user_id = v_user and mtime < v_now
        returning to_jsonb(app.nodes.*) into v_row;
        if v_row is not null then
          v_written := v_written || jsonb_build_array(v_row);
        end if;
      end if;
    end if;
  end if;

  return internal.envelope(
    'applied', null,
    case when jsonb_array_length(v_written) = 0 and v_seeded is null then '{}'::jsonb
         else jsonb_build_object('nodes', jsonb_build_object(
                'upserted', v_written || coalesce(v_seeded -> 'nodes', '[]'::jsonb), 'deleted', '[]'::jsonb))
           || case when v_seeded is null then '{}'::jsonb else jsonb_build_object(
                'bits', jsonb_build_object('upserted', v_seeded -> 'bits', 'deleted', '[]'::jsonb),
                'chunks', jsonb_build_object('upserted', v_seeded -> 'chunks', 'deleted', '[]'::jsonb),
                'scratch_breakdowns', jsonb_build_object('upserted', v_seeded -> 'scratch_breakdowns', 'deleted', '[]'::jsonb),
                'staged_candidates', jsonb_build_object('upserted', v_seeded -> 'staged_candidates', 'deleted', '[]'::jsonb)) end
    end
  );
end
$function$;
