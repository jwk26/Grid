-- Task 235, Stage 1: the account-deletion fallback (SCHEMA §Account deletion; Task 218 recorded
-- that hosted Supabase refuses the dedicated role). public.delete_my_account() records
-- accounts.deletion_requested_at for the caller only. From then on ensure_account(),
-- get_snapshot(), every reconcile function and every write function reject that account with
-- `account_deleting`, so its data never reappears. The rows go with Task 238's daily cleanup.
--
-- The check is the same inline read in every function (no helper: get_snapshot() and the
-- reconcile functions are `security invoker`, so a helper closed to client roles would not run).
-- The redefinitions below were generated from the live definitions (pg_get_functiondef) after a
-- reset; each differs from its previous definition only in the account-check lines. Owners,
-- security mode and grants are those of the previous definitions (create or replace keeps them).

grant create on schema public to griddo_writer;
grant create on schema internal to griddo_writer;

create function public.delete_my_account() returns jsonb
  language plpgsql security definer set search_path = ''
  as $$
declare
  v_user uuid := internal.uid();
  v_now bigint := internal.now_ms();
  v_requested bigint;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  -- Lock order as in ensure_account(): the L0 Grid lock, then the account row.
  perform internal.lock_grid(v_user, null);
  select deletion_requested_at into v_requested from app.accounts where user_id = v_user for update;
  if not found then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_missing'));
  end if;
  if v_requested is not null then
    return internal.envelope('already_applied');
  end if;
  update app.accounts set deletion_requested_at = v_now where user_id = v_user;
  return internal.envelope('applied');
end
$$;

alter function public.delete_my_account() owner to griddo_writer;
revoke all on function public.delete_my_account() from public, anon, service_role;
grant execute on function public.delete_my_account() to authenticated;

create or replace FUNCTION public.add_breakdown(p_breakdown_id uuid, p_scratch_id uuid, p_scratch_expected_version integer, p_content text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := internal.uid();
  v_now bigint := internal.now_ms();
  v_scratch app.bits;
  v_row app.scratch_breakdowns;
  v_active boolean;
  v_limit integer;
  v_order integer;
  v_new jsonb;
  v_bit jsonb;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_breakdown_id is null or p_scratch_id is null or p_scratch_expected_version is null or p_content is null then
    raise exception 'add_breakdown needs every argument' using errcode = '22023';
  end if;
  if not exists (select 1 from app.accounts where user_id = v_user) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_missing'));
  end if;
  if exists (select 1 from app.accounts where user_id = v_user and deletion_requested_at is not null) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_deleting'));
  end if;

  v_scratch := internal.lock_bit_and_node(v_user, p_scratch_id);
  if v_scratch.id is null then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;
  v_active := internal.active_inbox_scratch(v_user, v_scratch);
  select * into v_row from app.scratch_breakdowns where id = p_breakdown_id and user_id = v_user;

  if v_active and v_row.id is not null and v_row.scratch_bit_id = p_scratch_id and v_row.content = p_content
     and v_row.consumed_at is null and v_row.version = 1 and v_scratch.version = p_scratch_expected_version + 1 then
    return internal.envelope('already_applied', jsonb_build_object('id', p_breakdown_id),
                             internal.inbox_changes(jsonb_build_array(to_jsonb(v_scratch)), jsonb_build_array(to_jsonb(v_row))));
  end if;
  if not v_active then
    return internal.envelope('rejected', null,
                             internal.inbox_changes(jsonb_build_array(to_jsonb(v_scratch)), case when v_row.id is null then '[]' else jsonb_build_array(to_jsonb(v_row)) end),
                             jsonb_build_object('code', 'invalid_target'));
  end if;
  if v_row.id is not null or v_scratch.version <> p_scratch_expected_version then
    return internal.envelope('conflict', null,
                             internal.inbox_changes(jsonb_build_array(to_jsonb(v_scratch)), case when v_row.id is null then '[]' else jsonb_build_array(to_jsonb(v_row)) end));
  end if;

  v_limit := internal.limit_reached(v_user, 'scratch_breakdowns', 1);
  if v_limit is not null then
    return internal.envelope('rejected', null, internal.inbox_changes(jsonb_build_array(to_jsonb(v_scratch))),
                             jsonb_build_object('code', 'account_limit', 'table', 'scratch_breakdowns', 'limit', v_limit));
  end if;

  select coalesce(max("order") + 1, 0) into v_order
    from app.scratch_breakdowns where user_id = v_user and scratch_bit_id = p_scratch_id;
  insert into app.scratch_breakdowns (id, user_id, scratch_bit_id, content, "order", created_at, consumed_at, version)
  values (p_breakdown_id, v_user, p_scratch_id, p_content, v_order, v_now, null, 1)
  returning to_jsonb(app.scratch_breakdowns.*) into v_new;
  update app.bits set version = version + 1 where id = p_scratch_id and user_id = v_user
  returning to_jsonb(app.bits.*) into v_bit;

  return internal.envelope('applied', jsonb_build_object('id', p_breakdown_id),
                           internal.inbox_changes(jsonb_build_array(v_bit), jsonb_build_array(v_new)));
end
$function$;

create or replace FUNCTION public.archive_bit(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := internal.uid();
  v_now bigint := internal.now_ms();
  v_bit app.bits;
  v_parent app.nodes;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not exists (select 1 from app.accounts where user_id = v_user) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_missing'));
  end if;
  if exists (select 1 from app.accounts where user_id = v_user and deletion_requested_at is not null) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_deleting'));
  end if;
  v_bit := internal.lock_bit_and_node(v_user, p_id);
  if v_bit.id is null then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;
  select * into v_parent from app.nodes where id = v_bit.parent_id and user_id = v_user;
  if v_parent.system_role = 'inbox' then
    return internal.envelope('rejected', null, internal.changes(internal.node_rows(v_user, array[v_parent.id]),
                             internal.bit_rows(v_user, array[p_id])), jsonb_build_object('code', 'invalid_target'));
  end if;
  if v_bit.archived_at is not null then
    return internal.envelope('applied', jsonb_build_object('id', p_id),
                             internal.changes('[]', internal.bit_rows(v_user, array[p_id])));
  end if;

  update app.bits set archived_at = v_now, version = version + 1 where id = p_id and user_id = v_user;
  update app.nodes set mtime = v_now where id = v_parent.id and user_id = v_user;
  return internal.envelope('applied', jsonb_build_object('id', p_id),
                           internal.changes(internal.node_rows(v_user, array[v_parent.id]),
                                            internal.bit_rows(v_user, array[p_id])));
end
$function$;

create or replace FUNCTION public.archive_node(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := internal.uid();
  v_now bigint := internal.now_ms();
  v_node app.nodes;
  v_subtree uuid[];
  v_nodes uuid[];
  v_bits uuid[];
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not exists (select 1 from app.accounts where user_id = v_user) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_missing'));
  end if;
  if exists (select 1 from app.accounts where user_id = v_user and deletion_requested_at is not null) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_deleting'));
  end if;
  select * into v_node from app.nodes where id = p_id and user_id = v_user;
  if not found then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;
  if v_node.system_role is not null then
    return internal.envelope('rejected', null, internal.changes(internal.node_rows(v_user, array[p_id])),
                             jsonb_build_object('code', 'invalid_target'));
  end if;

  perform internal.lock_tree(v_user, p_id, false);
  select * into v_node from app.nodes where id = p_id and user_id = v_user;
  if not found then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;
  if v_node.archived_at is not null then
    return internal.envelope('applied', jsonb_build_object('id', p_id),
                             internal.changes(internal.node_rows(v_user, array[p_id])));
  end if;

  v_subtree := internal.subtree_ids(v_user, p_id);
  with changed as (
    update app.nodes set archived_at = v_now, version = version + 1
     where user_id = v_user and id = any (v_subtree) and archived_at is null
    returning id
  ) select coalesce(array_agg(id), '{}') into v_nodes from changed;
  with changed as (
    update app.bits set archived_at = v_now, version = version + 1
     where user_id = v_user and parent_id = any (v_subtree) and archived_at is null
    returning id
  ) select coalesce(array_agg(id), '{}') into v_bits from changed;
  if v_node.parent_id is not null then
    update app.nodes set mtime = v_now where id = v_node.parent_id and user_id = v_user;
    v_nodes := v_nodes || v_node.parent_id;
  end if;

  return internal.envelope('applied', jsonb_build_object('id', p_id),
                           internal.changes(internal.node_rows(v_user, v_nodes), internal.bit_rows(v_user, v_bits)));
end
$function$;

create or replace FUNCTION public.archive_scratch(p_scratch_id uuid, p_expected_version integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := internal.uid();
  v_now bigint := internal.now_ms();
  v_scratch app.bits;
  v_inbox uuid;
  v_owner_active boolean;
  v_consumed integer;
  v_unconsumed integer;
  v_staged integer;
  v_new jsonb;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_scratch_id is null or p_expected_version is null then
    raise exception 'archive_scratch needs every argument' using errcode = '22023';
  end if;
  if not exists (select 1 from app.accounts where user_id = v_user) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_missing'));
  end if;
  if exists (select 1 from app.accounts where user_id = v_user and deletion_requested_at is not null) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_deleting'));
  end if;

  v_scratch := internal.lock_bit_and_node(v_user, p_scratch_id);
  if v_scratch.id is null then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;
  select id into v_inbox from app.nodes where user_id = v_user and system_role = 'inbox';
  if v_inbox is null or v_scratch.parent_id <> v_inbox then
    return internal.envelope('rejected', null, internal.scratch_view(v_user, p_scratch_id),
                             jsonb_build_object('code', 'invalid_target'));
  end if;

  select exists (select 1 from app.nodes n where n.user_id = v_user and n.id = v_inbox
                    and n.deleted_at is null and n.archived_at is null) into v_owner_active;
  select count(*) filter (where consumed_at is not null), count(*) filter (where consumed_at is null)
    into v_consumed, v_unconsumed
    from app.scratch_breakdowns where user_id = v_user and scratch_bit_id = p_scratch_id;
  select count(*) into v_staged
    from app.staged_candidates where user_id = v_user and scratch_bit_id = p_scratch_id and lifecycle = 'staged';

  if v_owner_active and v_scratch.archived_at is not null and v_scratch.version = p_expected_version + 1 then
    return internal.envelope('already_applied', jsonb_build_object('id', p_scratch_id),
                             internal.scratch_view(v_user, p_scratch_id));
  end if;
  if v_scratch.deleted_at is not null or v_scratch.archived_at is not null then
    return internal.envelope('rejected', null, internal.scratch_view(v_user, p_scratch_id),
                             jsonb_build_object('code', 'invalid_target'));
  end if;
  if v_scratch.version <> p_expected_version then
    return internal.envelope('conflict', null, internal.scratch_view(v_user, p_scratch_id));
  end if;
  if not v_owner_active or v_consumed < 1 or v_unconsumed > 0 or v_staged > 0 then
    return internal.envelope('rejected', null, internal.scratch_view(v_user, p_scratch_id),
                             jsonb_build_object('code', 'invalid_target'));
  end if;

  update app.bits set archived_at = v_now, mtime = v_now, version = version + 1
   where id = p_scratch_id and user_id = v_user
  returning to_jsonb(app.bits.*) into v_new;

  return internal.envelope('applied', jsonb_build_object('id', p_scratch_id),
                           internal.inbox_changes(jsonb_build_array(v_new)));
end
$function$;

create or replace FUNCTION public.classify_archive_scratch_recovery(p_scratch_id uuid, p_expected_version integer, p_started_at bigint)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
    with u as (select (select auth.uid()) as id),
    acct as (
      select exists (select 1 from app.accounts a, u where a.user_id = u.id) as ok,
             exists (select 1 from app.accounts a, u
                      where a.user_id = u.id and a.deletion_requested_at is not null) as deleting
    ),
    sc as (select b.* from app.bits b, u where b.user_id = u.id and b.id = p_scratch_id),
    inb as (
      select sc.id as scratch_id from sc
       where exists (select 1 from app.nodes n, u where n.user_id = u.id and n.id = sc.parent_id
                        and n.system_role = 'inbox' and n.deleted_at is null and n.archived_at is null)
    ),
    rws as (select r.* from app.scratch_breakdowns r, u where r.user_id = u.id and r.scratch_bit_id = p_scratch_id),
    cds as (select c.* from app.staged_candidates c, u where c.user_id = u.id and c.scratch_bit_id = p_scratch_id),
    agg as (
      select (select count(*) from rws where consumed_at is not null) >= 1
         and (select count(*) from rws where consumed_at is null) = 0
         and (select count(*) from cds where lifecycle = 'staged') = 0 as complete
    ),
    verdict as (
      select case
        when not acct.ok then 'account_missing'
        when acct.deleting then 'account_deleting'
        when p_scratch_id is null or p_expected_version is null or p_started_at is null or p_started_at <= 0 then 'conflict'
        when exists (select 1 from sc join inb on inb.scratch_id = sc.id
                      where sc.deleted_at is null and sc.archived_at is not null and sc.archived_at >= p_started_at
                        and sc.mtime = sc.archived_at and sc.version = p_expected_version + 1)
             and agg.complete then 'applied'
        when exists (select 1 from sc join inb on inb.scratch_id = sc.id
                      where sc.deleted_at is null and sc.archived_at is null and sc.version = p_expected_version)
             and agg.complete then 'not_applied'
        else 'conflict'
      end as s
      from acct, agg
    )
    select case when verdict.s in ('account_missing', 'account_deleting')
      then jsonb_build_object('status', 'rejected', 'result', null, 'changes', '{}'::jsonb,
                              'rejection', jsonb_build_object('code', verdict.s))
      else jsonb_build_object('status', verdict.s, 'result', null, 'changes', coalesce((select jsonb_object_agg(t.k, t.v) from (values
        ('bits', case when exists (select 1 from sc) then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(sc)) from sc), 'deleted', '[]'::jsonb) end),
        ('scratch_breakdowns', case when exists (select 1 from rws) then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(rws) order by rws.id) from rws), 'deleted', '[]'::jsonb) end),
        ('staged_candidates', case when exists (select 1 from cds) then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(cds) order by cds.id) from cds), 'deleted', '[]'::jsonb) end)
      ) as t(k, v) where t.v is not null), '{}'::jsonb))
    end
    from verdict
  $function$;

create or replace FUNCTION public.cleanup_expired_trash()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := internal.uid();
  v_now bigint := internal.now_ms();
  v_roots jsonb;
  v_out jsonb;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not exists (select 1 from app.accounts where user_id = v_user) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_missing'));
  end if;
  if exists (select 1 from app.accounts where user_id = v_user and deletion_requested_at is not null) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_deleting'));
  end if;
  update app.accounts set last_visit_at = v_now where user_id = v_user;
  v_roots := internal.lock_purge(v_user, v_now - 30 * 86400000::bigint);
  v_out := internal.purge(
    v_user,
    array(select value::uuid from jsonb_array_elements_text(v_roots -> 'nodes')),
    array(select value::uuid from jsonb_array_elements_text(v_roots -> 'bits')),
    v_now);
  return internal.envelope('applied',
    jsonb_build_object('nodes', jsonb_array_length(v_out -> 'deleted' -> 'nodes'),
                       'bits', jsonb_array_length(v_out -> 'deleted' -> 'bits')),
    internal.purge_changes(v_user, v_out));
end
$function$;

create or replace FUNCTION public.create_bit(p_id uuid, p_values jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := internal.uid();
  v_now bigint := internal.now_ms();
  v_allowed constant text[] := array['title', 'description', 'icon', 'deadline', 'deadline_all_day', 'priority', 'parent_id', 'x', 'y'];
  v_required constant text[] := array['title', 'icon', 'parent_id', 'x', 'y'];
  v_key text;
  v_rec app.bits;
  v_parent app.nodes;
  v_limit integer;
  v_new jsonb;
  v_par jsonb;
  v_rows jsonb := '[]';
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_id is null then
    raise exception 'create_bit needs an id' using errcode = '22023';
  end if;
  if p_values is null or jsonb_typeof(p_values) <> 'object' then
    raise exception 'p_values must be a JSON object' using errcode = '22023';
  end if;
  for v_key in select jsonb_object_keys(p_values) loop
    if v_key <> all (v_allowed) then
      raise exception 'create_bit does not accept the key %', v_key using errcode = '22023';
    end if;
  end loop;
  foreach v_key in array v_required loop
    if not (p_values ? v_key) then
      raise exception 'create_bit needs the key %', v_key using errcode = '22023';
    end if;
  end loop;
  if not exists (select 1 from app.accounts where user_id = v_user) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_missing'));
  end if;
  if exists (select 1 from app.accounts where user_id = v_user and deletion_requested_at is not null) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_deleting'));
  end if;

  v_rec := jsonb_populate_record(null::app.bits, p_values);
  if v_rec.parent_id is null then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'invalid_target'));
  end if;
  perform internal.lock_grid(v_user, v_rec.parent_id);

  select * into v_parent from app.nodes where id = v_rec.parent_id and user_id = v_user for update;
  if not found then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;
  v_rows := jsonb_build_array(to_jsonb(v_parent));
  if v_parent.system_role = 'archive_view' then
    return internal.envelope('rejected', null, internal.changes(v_rows), jsonb_build_object('code', 'invalid_target'));
  end if;
  if v_parent.deleted_at is not null or v_parent.archived_at is not null then
    return internal.envelope('rejected', null, internal.changes(v_rows), jsonb_build_object('code', 'parent_inactive'));
  end if;

  v_limit := internal.limit_reached(v_user, 'bits');
  if v_limit is not null then
    return internal.envelope('rejected', null, internal.changes(v_rows),
                             jsonb_build_object('code', 'account_limit', 'table', 'bits', 'limit', v_limit));
  end if;

  if v_rec.deadline is not null and v_parent.deadline is not null
     and internal.deadline_after(v_rec.deadline, coalesce(v_rec.deadline_all_day, false), v_parent.deadline, v_parent.deadline_all_day) then
    return internal.envelope('rejected', null, internal.changes(v_rows),
                             jsonb_build_object('code', 'deadline_exceeds_parent', 'table', 'nodes'));
  end if;

  if not (coalesce(v_parent.system_role, '') = 'inbox' and v_rec.x = 0 and v_rec.y = 0)
     and internal.cell_taken(v_user, v_rec.parent_id, v_rec.x, v_rec.y) then
    return internal.envelope('rejected', null, internal.changes(v_rows), jsonb_build_object('code', 'cell_taken'));
  end if;

  insert into app.bits (id, user_id, title, description, icon, deadline, deadline_all_day, priority, status,
                        mtime, created_at, version, parent_id, x, y, past_deadline_dismissed)
  values (p_id, v_user, v_rec.title, coalesce(v_rec.description, ''), v_rec.icon, v_rec.deadline,
          coalesce(v_rec.deadline_all_day, false), v_rec.priority, 'active', v_now, v_now, 1,
          v_rec.parent_id, v_rec.x, v_rec.y, false)
  returning to_jsonb(app.bits.*) into v_new;

  -- Hook 1: adding a child touches the parent Node (mtime only; its version stays).
  update app.nodes set mtime = v_now where id = v_parent.id and user_id = v_user
  returning to_jsonb(app.nodes.*) into v_par;

  return internal.envelope('applied', jsonb_build_object('id', p_id),
                           internal.changes(jsonb_build_array(v_par), jsonb_build_array(v_new)));
end
$function$;

create or replace FUNCTION public.create_chunk(p_id uuid, p_values jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := internal.uid();
  v_now bigint := internal.now_ms();
  v_allowed constant text[] := array['title', 'description', 'time', 'time_all_day', 'parent_id', 'order'];
  v_required constant text[] := array['title', 'parent_id', 'order'];
  v_key text;
  v_rec app.chunks;
  v_bit app.bits;
  v_node app.nodes;
  v_limit integer;
  v_new jsonb;
  v_settled jsonb;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_id is null then
    raise exception 'create_chunk needs an id' using errcode = '22023';
  end if;
  if p_values is null or jsonb_typeof(p_values) <> 'object' then
    raise exception 'p_values must be a JSON object' using errcode = '22023';
  end if;
  for v_key in select jsonb_object_keys(p_values) loop
    if v_key <> all (v_allowed) then
      raise exception 'create_chunk does not accept the key %', v_key using errcode = '22023';
    end if;
  end loop;
  foreach v_key in array v_required loop
    if not (p_values ? v_key) then
      raise exception 'create_chunk needs the key %', v_key using errcode = '22023';
    end if;
  end loop;
  if not exists (select 1 from app.accounts where user_id = v_user) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_missing'));
  end if;
  if exists (select 1 from app.accounts where user_id = v_user and deletion_requested_at is not null) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_deleting'));
  end if;

  v_rec := jsonb_populate_record(null::app.chunks, p_values);
  if v_rec.parent_id is null then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'invalid_target'));
  end if;
  v_bit := internal.lock_bit_and_node(v_user, v_rec.parent_id);
  if v_bit.id is null then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;
  select * into v_node from app.nodes where id = v_bit.parent_id and user_id = v_user;
  if v_bit.deleted_at is not null or v_bit.archived_at is not null
     or v_node.deleted_at is not null or v_node.archived_at is not null then
    return internal.envelope('rejected', null,
                             internal.changes(jsonb_build_array(to_jsonb(v_node)), jsonb_build_array(to_jsonb(v_bit))),
                             jsonb_build_object('code', 'parent_inactive'));
  end if;

  v_limit := internal.limit_reached(v_user, 'chunks');
  if v_limit is not null then
    return internal.envelope('rejected', null,
                             internal.changes(jsonb_build_array(to_jsonb(v_node)), jsonb_build_array(to_jsonb(v_bit))),
                             jsonb_build_object('code', 'account_limit', 'table', 'chunks', 'limit', v_limit));
  end if;

  if v_rec.time is not null and v_bit.deadline is not null
     and internal.deadline_after(v_rec.time, coalesce(v_rec.time_all_day, false), v_bit.deadline, v_bit.deadline_all_day) then
    return internal.envelope('rejected', null,
                             internal.changes(jsonb_build_array(to_jsonb(v_node)), jsonb_build_array(to_jsonb(v_bit))),
                             jsonb_build_object('code', 'deadline_exceeds_parent', 'table', 'bits'));
  end if;

  insert into app.chunks (id, user_id, title, description, time, time_all_day, status, "order", parent_id)
  values (p_id, v_user, v_rec.title, coalesce(v_rec.description, ''), v_rec.time,
          coalesce(v_rec.time_all_day, false), 'incomplete', v_rec."order", v_rec.parent_id)
  returning to_jsonb(app.chunks.*) into v_new;

  v_settled := internal.settle_bit(v_user, v_bit, v_now, 'create');
  return internal.envelope('applied', jsonb_build_object('id', p_id),
                           internal.changes(jsonb_build_array(v_settled -> 'node'), jsonb_build_array(v_settled -> 'bit'),
                                            jsonb_build_array(v_new)));
end
$function$;

create or replace FUNCTION public.create_node(p_id uuid, p_values jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := internal.uid();
  v_now bigint := internal.now_ms();
  v_allowed constant text[] := array['title', 'color', 'icon', 'deadline', 'deadline_all_day', 'parent_id', 'x', 'y'];
  v_required constant text[] := array['title', 'color', 'icon', 'x', 'y'];
  v_key text;
  v_rec app.nodes;
  v_parent app.nodes;
  v_limit integer;
  v_new jsonb;
  v_par jsonb;
  v_rows jsonb := '[]';
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_id is null then
    raise exception 'create_node needs an id' using errcode = '22023';
  end if;
  if p_values is null or jsonb_typeof(p_values) <> 'object' then
    raise exception 'p_values must be a JSON object' using errcode = '22023';
  end if;
  for v_key in select jsonb_object_keys(p_values) loop
    if v_key <> all (v_allowed) then
      raise exception 'create_node does not accept the key %', v_key using errcode = '22023';
    end if;
  end loop;
  foreach v_key in array v_required loop
    if not (p_values ? v_key) then
      raise exception 'create_node needs the key %', v_key using errcode = '22023';
    end if;
  end loop;
  if not exists (select 1 from app.accounts where user_id = v_user) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_missing'));
  end if;
  if exists (select 1 from app.accounts where user_id = v_user and deletion_requested_at is not null) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_deleting'));
  end if;

  v_rec := jsonb_populate_record(null::app.nodes, p_values);
  perform internal.lock_grid(v_user, v_rec.parent_id);

  if v_rec.parent_id is not null then
    select * into v_parent from app.nodes where id = v_rec.parent_id and user_id = v_user for update;
    if not found then
      return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
    end if;
    v_rows := jsonb_build_array(to_jsonb(v_parent));
    if v_parent.system_role is not null or v_parent.level >= 2 then
      return internal.envelope('rejected', null, internal.changes(v_rows), jsonb_build_object('code', 'invalid_target'));
    end if;
    if v_parent.deleted_at is not null or v_parent.archived_at is not null then
      return internal.envelope('rejected', null, internal.changes(v_rows), jsonb_build_object('code', 'parent_inactive'));
    end if;
  end if;

  v_limit := internal.limit_reached(v_user, 'nodes');
  if v_limit is not null then
    return internal.envelope('rejected', null, internal.changes(v_rows),
                             jsonb_build_object('code', 'account_limit', 'table', 'nodes', 'limit', v_limit));
  end if;

  if v_rec.deadline is not null and v_parent.deadline is not null
     and internal.deadline_after(v_rec.deadline, coalesce(v_rec.deadline_all_day, false), v_parent.deadline, v_parent.deadline_all_day) then
    return internal.envelope('rejected', null, internal.changes(v_rows),
                             jsonb_build_object('code', 'deadline_exceeds_parent', 'table', 'nodes'));
  end if;

  if internal.cell_taken(v_user, v_rec.parent_id, v_rec.x, v_rec.y) then
    return internal.envelope('rejected', null, internal.changes(v_rows), jsonb_build_object('code', 'cell_taken'));
  end if;

  insert into app.nodes (id, user_id, title, color, icon, deadline, deadline_all_day, mtime, created_at, version,
                         parent_id, level, x, y, hidden_from_grid, past_deadline_dismissed)
  values (p_id, v_user, v_rec.title, v_rec.color, v_rec.icon, v_rec.deadline, coalesce(v_rec.deadline_all_day, false),
          v_now, v_now, 1, v_rec.parent_id, case when v_parent.id is null then 0 else v_parent.level + 1 end,
          v_rec.x, v_rec.y, false, false)
  returning to_jsonb(app.nodes.*) into v_new;
  v_rows := jsonb_build_array(v_new);

  -- Hook 1: adding a child touches the parent (mtime only; its version stays).
  if v_parent.id is not null then
    update app.nodes set mtime = v_now where id = v_parent.id and user_id = v_user
    returning to_jsonb(app.nodes.*) into v_par;
    v_rows := v_rows || jsonb_build_array(v_par);
  end if;

  return internal.envelope('applied', jsonb_build_object('id', p_id), internal.changes(v_rows));
end
$function$;

create or replace FUNCTION public.delete_breakdown(p_id uuid, p_expected_version integer, p_scratch_id uuid, p_scratch_expected_version integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := internal.uid();
  v_scratch app.bits;
  v_row app.scratch_breakdowns;
  v_cand app.staged_candidates;
  v_active boolean;
  v_bit jsonb;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_id is null or p_expected_version is null or p_scratch_id is null or p_scratch_expected_version is null then
    raise exception 'delete_breakdown needs every argument' using errcode = '22023';
  end if;
  if not exists (select 1 from app.accounts where user_id = v_user) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_missing'));
  end if;
  if exists (select 1 from app.accounts where user_id = v_user and deletion_requested_at is not null) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_deleting'));
  end if;

  v_scratch := internal.lock_bit_and_node(v_user, p_scratch_id);
  if v_scratch.id is null then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;
  -- Task 223: see stage_candidate; an inactive Scratch is refused before the row is locked.
  if not internal.active_inbox_scratch(v_user, v_scratch) then
    select * into v_row from app.scratch_breakdowns where id = p_id and user_id = v_user;
    select * into v_cand from app.staged_candidates where source_breakdown_id = p_id and user_id = v_user;
    return internal.envelope('rejected', null,
                             internal.inbox_changes(jsonb_build_array(to_jsonb(v_scratch)),
                                                    case when v_row.id is null then '[]'::jsonb else jsonb_build_array(to_jsonb(v_row)) end,
                                                    case when v_cand.id is null then '[]'::jsonb else jsonb_build_array(to_jsonb(v_cand)) end),
                             jsonb_build_object('code', 'invalid_target'));
  end if;
  select * into v_row from app.scratch_breakdowns where id = p_id and user_id = v_user for update;
  select * into v_cand from app.staged_candidates where source_breakdown_id = p_id and user_id = v_user;
  v_active := internal.active_inbox_scratch(v_user, v_scratch);

  if v_active and v_row.id is null and v_cand.id is null and v_scratch.version = p_scratch_expected_version + 1 then
    return internal.envelope('already_applied', jsonb_build_object('id', p_id),
                             internal.inbox_changes(jsonb_build_array(to_jsonb(v_scratch))));
  end if;
  if v_row.id is null or not v_active or v_cand.id is not null
     or v_row.scratch_bit_id <> p_scratch_id or v_row.consumed_at is not null then
    return internal.envelope('rejected', null,
                             internal.inbox_changes(jsonb_build_array(to_jsonb(v_scratch)),
                                                    case when v_row.id is null then '[]' else jsonb_build_array(to_jsonb(v_row)) end,
                                                    case when v_cand.id is null then '[]' else jsonb_build_array(to_jsonb(v_cand)) end),
                             jsonb_build_object('code', case when v_row.id is null then 'not_found' else 'invalid_target' end));
  end if;
  if v_row.version <> p_expected_version or v_scratch.version <> p_scratch_expected_version then
    return internal.envelope('conflict', null,
                             internal.inbox_changes(jsonb_build_array(to_jsonb(v_scratch)), jsonb_build_array(to_jsonb(v_row))));
  end if;

  delete from app.scratch_breakdowns where id = p_id and user_id = v_user;
  update app.bits set version = version + 1 where id = p_scratch_id and user_id = v_user
  returning to_jsonb(app.bits.*) into v_bit;
  return internal.envelope('applied', jsonb_build_object('id', p_id),
                           internal.inbox_changes(jsonb_build_array(v_bit), '[]', '[]', array[p_id]));
end
$function$;

create or replace FUNCTION public.delete_chunk(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := internal.uid();
  v_now bigint := internal.now_ms();
  v_old app.chunks;
  v_bit app.bits;
  v_settled jsonb;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not exists (select 1 from app.accounts where user_id = v_user) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_missing'));
  end if;
  if exists (select 1 from app.accounts where user_id = v_user and deletion_requested_at is not null) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_deleting'));
  end if;
  select * into v_old from app.chunks where id = p_id and user_id = v_user;
  if not found then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;
  v_bit := internal.lock_bit_and_node(v_user, v_old.parent_id);
  if v_bit.id is null then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;
  delete from app.chunks where id = p_id and user_id = v_user;
  if not found then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;

  v_settled := internal.settle_bit(v_user, v_bit, v_now, 'delete');
  return internal.envelope(
    'applied', null,
    internal.changes(jsonb_build_array(v_settled -> 'node'), jsonb_build_array(v_settled -> 'bit'))
      || jsonb_build_object('chunks', jsonb_build_object('upserted', '[]'::jsonb, 'deleted', jsonb_build_array(p_id)))
  );
end
$function$;

create or replace FUNCTION public.empty_trash()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := internal.uid();
  v_now bigint := internal.now_ms();
  v_roots jsonb;
  v_out jsonb;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not exists (select 1 from app.accounts where user_id = v_user) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_missing'));
  end if;
  if exists (select 1 from app.accounts where user_id = v_user and deletion_requested_at is not null) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_deleting'));
  end if;
  v_roots := internal.lock_purge(v_user, null);
  v_out := internal.purge(
    v_user,
    array(select value::uuid from jsonb_array_elements_text(v_roots -> 'nodes')),
    array(select value::uuid from jsonb_array_elements_text(v_roots -> 'bits')),
    v_now);
  return internal.envelope('applied',
    jsonb_build_object('nodes', jsonb_array_length(v_out -> 'deleted' -> 'nodes'),
                       'bits', jsonb_array_length(v_out -> 'deleted' -> 'bits')),
    internal.purge_changes(v_user, v_out));
end
$function$;

create or replace FUNCTION public.ensure_account(p_reserved_cells jsonb DEFAULT '[]'::jsonb)
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
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not internal.valid_reserved_cells(p_reserved_cells) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'invalid_input'));
  end if;

  -- Lock order: the L0 Grid lock, then the account row, then the system Node rows.
  perform internal.lock_grid(v_user, null);

  if exists (select 1 from app.accounts where user_id = v_user and deletion_requested_at is not null) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_deleting'));
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

  return internal.envelope(
    'applied', null,
    case when jsonb_array_length(v_written) = 0 then '{}'::jsonb
         else jsonb_build_object('nodes', jsonb_build_object('upserted', v_written, 'deleted', '[]'::jsonb)) end
  );
end
$function$;

create or replace FUNCTION public.get_snapshot()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
    select case
      when not exists (select 1 from app.accounts a where a.user_id = (select auth.uid()))
        then jsonb_build_object('rejection', jsonb_build_object('code', 'account_missing'))
      when exists (select 1 from app.accounts a
                    where a.user_id = (select auth.uid()) and a.deletion_requested_at is not null)
        then jsonb_build_object('rejection', jsonb_build_object('code', 'account_deleting'))
      else jsonb_build_object(
        'nodes', coalesce((select jsonb_agg(to_jsonb(n)) from app.nodes n
                            where n.user_id = (select auth.uid())), '[]'::jsonb),
        'bits', coalesce((select jsonb_agg(to_jsonb(b)) from app.bits b
                           where b.user_id = (select auth.uid())), '[]'::jsonb),
        'chunks', coalesce((select jsonb_agg(to_jsonb(c)) from app.chunks c
                             where c.user_id = (select auth.uid())), '[]'::jsonb),
        'scratch_breakdowns', coalesce((select jsonb_agg(to_jsonb(s)) from app.scratch_breakdowns s
                                         where s.user_id = (select auth.uid())), '[]'::jsonb),
        'staged_candidates', coalesce((select jsonb_agg(to_jsonb(k)) from app.staged_candidates k
                                        where k.user_id = (select auth.uid())), '[]'::jsonb)
      )
    end
  $function$;

create or replace FUNCTION public.hard_delete_bit(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := internal.uid();
  v_now bigint := internal.now_ms();
  v_bit app.bits;
  v_out jsonb;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not exists (select 1 from app.accounts where user_id = v_user) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_missing'));
  end if;
  if exists (select 1 from app.accounts where user_id = v_user and deletion_requested_at is not null) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_deleting'));
  end if;
  v_bit := internal.lock_bit_and_node(v_user, p_id);
  if v_bit.id is null then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;
  if v_bit.deleted_at is null then
    return internal.envelope('rejected', null, internal.changes('[]', internal.bit_rows(v_user, array[p_id])),
                             jsonb_build_object('code', 'invalid_target'));
  end if;

  v_out := internal.purge(v_user, '{}', array[p_id], v_now);
  return internal.envelope('applied', jsonb_build_object('id', p_id), internal.purge_changes(v_user, v_out));
end
$function$;

create or replace FUNCTION public.hard_delete_node(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := internal.uid();
  v_now bigint := internal.now_ms();
  v_node app.nodes;
  v_out jsonb;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not exists (select 1 from app.accounts where user_id = v_user) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_missing'));
  end if;
  if exists (select 1 from app.accounts where user_id = v_user and deletion_requested_at is not null) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_deleting'));
  end if;
  select * into v_node from app.nodes where id = p_id and user_id = v_user;
  if not found then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;

  perform internal.lock_tree(v_user, p_id, false);
  select * into v_node from app.nodes where id = p_id and user_id = v_user;
  if not found then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;
  if v_node.system_role is not null or v_node.deleted_at is null then
    return internal.envelope('rejected', null, internal.changes(internal.node_rows(v_user, array[p_id])),
                             jsonb_build_object('code', 'invalid_target'));
  end if;

  v_out := internal.purge(v_user, array[p_id], '{}', v_now);
  return internal.envelope('applied', jsonb_build_object('id', p_id), internal.purge_changes(v_user, v_out));
end
$function$;

create or replace FUNCTION public.place_direct_breakdown(p_result_id uuid, p_scratch_id uuid, p_source_id uuid, p_source_expected_version integer, p_result_type text, p_title text, p_target_parent_id uuid, p_expected_ancestor_ids uuid[], p_x integer, p_y integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := internal.uid();
  v_now bigint := internal.now_ms();
  v_inbox uuid;
  v_tgt app.nodes;
  v_lock_grid boolean := true;
  v_scratch app.bits;
  v_src app.scratch_breakdowns;
  v_bysrc app.staged_candidates;
  v_rn app.nodes;
  v_rb app.bits;
  v_created bigint;
  v_limit integer;
  v_max integer;
  v_new jsonb;
  v_par jsonb;
  v_srcnew jsonb;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_result_id is null or p_scratch_id is null or p_source_id is null or p_source_expected_version is null
     or p_result_type is null or p_result_type not in ('node', 'bit') or p_title is null
     or p_expected_ancestor_ids is null or p_x is null or p_y is null
     then
    raise exception 'place_direct_breakdown needs every argument (a null target parent is Home) and a node or bit result type'
      using errcode = '22023';
  end if;
  if not exists (select 1 from app.accounts where user_id = v_user) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_missing'));
  end if;
  if exists (select 1 from app.accounts where user_id = v_user and deletion_requested_at is not null) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_deleting'));
  end if;

  select id into v_inbox from app.nodes where user_id = v_user and system_role = 'inbox';
  if v_inbox is null then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;
  -- The Grid lock first. A target that is missing or a system Node is rejected later without it.
  if p_target_parent_id is not null then
    select * into v_tgt from app.nodes where id = p_target_parent_id and user_id = v_user;
    v_lock_grid := v_tgt.id is not null and v_tgt.system_role is null;
  end if;
  if v_lock_grid then
    perform internal.lock_grid(v_user, p_target_parent_id);
  end if;
  perform 1 from app.nodes
   where user_id = v_user and id in (v_inbox, case when v_lock_grid then p_target_parent_id end)
   order by id for update;

  select * into v_scratch from app.bits where id = p_scratch_id and user_id = v_user;
  if v_scratch.id is null then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;
  if v_scratch.parent_id <> v_inbox then
    return internal.envelope('rejected', null, internal.inbox_changes(jsonb_build_array(to_jsonb(v_scratch))),
                             jsonb_build_object('code', 'invalid_target'));
  end if;
  select * into v_scratch from app.bits where id = p_scratch_id and user_id = v_user for update;
  if v_scratch.id is null or v_scratch.parent_id <> v_inbox then
    raise exception 'could not settle the lock set of Bit %', p_scratch_id using errcode = '40001';
  end if;

  select * into v_src from app.scratch_breakdowns where id = p_source_id and user_id = v_user for update;
  select * into v_bysrc from app.staged_candidates where source_breakdown_id = p_source_id and user_id = v_user;
  select * into v_rn from app.nodes where id = p_result_id and user_id = v_user;
  select * into v_rb from app.bits where id = p_result_id and user_id = v_user;
  select * into v_tgt from app.nodes where id = p_target_parent_id and user_id = v_user;

  -- The complete postcondition: the exact result, the source consumed at its created_at at expected + 1,
  -- the candidate absent by id and by source.
  if p_result_type = 'node' then
    if v_rn.id is not null and v_rb.id is null and v_rn.title = p_title and v_rn.parent_id is not distinct from p_target_parent_id
       and v_rn.x = p_x and v_rn.y = p_y and v_rn.version = 1 and not v_rn.past_deadline_dismissed
       and v_rn.deleted_at is null and v_rn.archived_at is null and v_rn.system_role is null and not v_rn.hidden_from_grid
       and v_rn.deadline is null and not v_rn.deadline_all_day and v_rn.color = 'hsl(210, 80%, 55%)' and v_rn.icon = 'Folder'
       and v_rn.created_at = v_rn.mtime and v_rn.level = cardinality(p_expected_ancestor_ids) then
      v_created := v_rn.created_at;
    end if;
  elsif v_rb.id is not null and v_rn.id is null and p_target_parent_id is not null and v_rb.title = p_title
        and v_rb.parent_id = p_target_parent_id and v_rb.x = p_x and v_rb.y = p_y and v_rb.version = 1
        and not v_rb.past_deadline_dismissed and v_rb.deleted_at is null and v_rb.archived_at is null
        and v_rb.description = '' and v_rb.icon = 'ListTodo' and v_rb.deadline is null and not v_rb.deadline_all_day
        and v_rb.priority is null and v_rb.status = 'active' and v_rb.created_at = v_rb.mtime then
    v_created := v_rb.created_at;
  end if;
  if v_created is not null and v_src.id is not null and v_src.scratch_bit_id = p_scratch_id
     and v_src.version = p_source_expected_version + 1 and v_src.consumed_at = v_created
     and v_bysrc.id is null then
    return internal.envelope('already_applied', jsonb_build_object('id', p_result_id),
                             internal.placement_view(v_user, p_scratch_id, p_result_id, p_source_id, null));
  end if;

  if v_rn.id is not null or v_rb.id is not null then
    return internal.envelope('conflict', null, internal.placement_view(v_user, p_scratch_id, p_result_id, p_source_id, null));
  end if;
  if v_src.id is null then
    return internal.envelope('rejected', null, internal.placement_view(v_user, p_scratch_id, p_result_id, p_source_id, null),
                             jsonb_build_object('code', 'not_found'));
  end if;
  if not internal.active_inbox_scratch(v_user, v_scratch) or v_src.scratch_bit_id <> p_scratch_id or v_src.consumed_at is not null then
    return internal.envelope('rejected', null, internal.placement_view(v_user, p_scratch_id, p_result_id, p_source_id, null),
                             jsonb_build_object('code', 'invalid_target'));
  end if;
  if v_src.version <> p_source_expected_version then
    return internal.envelope('conflict', null, internal.placement_view(v_user, p_scratch_id, p_result_id, p_source_id, null));
  end if;
  if v_bysrc.id is not null then
    return internal.envelope('rejected', null, internal.placement_view(v_user, p_scratch_id, p_result_id, p_source_id, null),
                             jsonb_build_object('code', 'invalid_target'));
  end if;
  if p_title <> v_src.content then
    return internal.envelope('rejected', null, internal.placement_view(v_user, p_scratch_id, p_result_id, p_source_id, null),
                             jsonb_build_object('code', 'invalid_input'));
  end if;

  -- Title length in UTF-16 units, as the column check and the client count it.
  v_max := case p_result_type when 'node' then 100 else 200 end;
  if (char_length(p_title) + char_length(regexp_replace(p_title, '[^\U00010000-\U0010FFFF]', '', 'g'))) < 1 or (char_length(p_title) + char_length(regexp_replace(p_title, '[^\U00010000-\U0010FFFF]', '', 'g'))) > v_max then
    return internal.envelope('rejected', null, internal.placement_view(v_user, p_scratch_id, p_result_id, p_source_id, null),
                             jsonb_build_object('code', 'invalid_input'));
  end if;
  -- A target missing at the unlocked pre-read stays invalid: its Grid lock was not taken.
  if not v_lock_grid or not internal.placement_target_ok(v_user, p_target_parent_id, p_expected_ancestor_ids, p_result_type) then
    return internal.envelope('rejected', null, internal.placement_view(v_user, p_scratch_id, p_result_id, p_source_id, null),
                             jsonb_build_object('code', 'invalid_target'));
  end if;
  if p_x < 0 or p_x > 17 or p_y < 0 or p_y > 8 then
    return internal.envelope('rejected', null, internal.placement_view(v_user, p_scratch_id, p_result_id, p_source_id, null),
                             jsonb_build_object('code', 'invalid_input'));
  end if;
  if internal.cell_taken(v_user, p_target_parent_id, p_x, p_y) then
    return internal.envelope('rejected', null, internal.placement_view(v_user, p_scratch_id, p_result_id, p_source_id, null),
                             jsonb_build_object('code', 'cell_taken'));
  end if;
  v_limit := internal.limit_reached(v_user, case p_result_type when 'node' then 'nodes' else 'bits' end);
  if v_limit is not null then
    return internal.envelope('rejected', null, internal.placement_view(v_user, p_scratch_id, p_result_id, p_source_id, null),
                             jsonb_build_object('code', 'account_limit', 'table', case p_result_type when 'node' then 'nodes' else 'bits' end, 'limit', v_limit));
  end if;

  if p_result_type = 'node' then
    insert into app.nodes (id, user_id, title, color, icon, deadline, deadline_all_day, mtime, created_at, version,
                           parent_id, level, x, y, past_deadline_dismissed)
    values (p_result_id, v_user, p_title, 'hsl(210, 80%, 55%)', 'Folder', null, false, v_now, v_now, 1,
            p_target_parent_id, coalesce(v_tgt.level + 1, 0), p_x, p_y, false)
    returning to_jsonb(app.nodes.*) into v_new;
  else
    insert into app.bits (id, user_id, title, description, icon, deadline, deadline_all_day, priority, status,
                          mtime, created_at, version, parent_id, x, y, past_deadline_dismissed)
    values (p_result_id, v_user, p_title, '', 'ListTodo', null, false, null, 'active',
            v_now, v_now, 1, p_target_parent_id, p_x, p_y, false)
    returning to_jsonb(app.bits.*) into v_new;
  end if;
  if p_target_parent_id is not null then
    update app.nodes set mtime = v_now where id = p_target_parent_id and user_id = v_user
    returning to_jsonb(app.nodes.*) into v_par;
  end if;
  update app.scratch_breakdowns set consumed_at = v_now, version = version + 1 where id = p_source_id and user_id = v_user
  returning to_jsonb(app.scratch_breakdowns.*) into v_srcnew;

  return internal.envelope('applied', jsonb_build_object('id', p_result_id),
    internal.inbox_changes(
      p_bits => case when p_result_type = 'bit' then jsonb_build_array(v_new) else '[]'::jsonb end,
      p_breakdowns => jsonb_build_array(v_srcnew),
      p_nodes => (case when p_result_type = 'node' then jsonb_build_array(v_new) else '[]'::jsonb end)
                 || (case when v_par is null then '[]'::jsonb else jsonb_build_array(v_par) end)));
end
$function$;

create or replace FUNCTION public.place_staged_candidate(p_result_id uuid, p_scratch_id uuid, p_source_id uuid, p_source_expected_version integer, p_result_type text, p_title text, p_target_parent_id uuid, p_expected_ancestor_ids uuid[], p_x integer, p_y integer, p_candidate_id uuid, p_candidate_expected_version integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := internal.uid();
  v_now bigint := internal.now_ms();
  v_inbox uuid;
  v_tgt app.nodes;
  v_lock_grid boolean := true;
  v_scratch app.bits;
  v_src app.scratch_breakdowns;
  v_cand app.staged_candidates;
  v_bysrc app.staged_candidates;
  v_rn app.nodes;
  v_rb app.bits;
  v_created bigint;
  v_limit integer;
  v_max integer;
  v_new jsonb;
  v_par jsonb;
  v_srcnew jsonb;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_result_id is null or p_scratch_id is null or p_source_id is null or p_source_expected_version is null
     or p_result_type is null or p_result_type not in ('node', 'bit') or p_title is null
     or p_expected_ancestor_ids is null or p_x is null or p_y is null
     or p_candidate_id is null or p_candidate_expected_version is null then
    raise exception 'place_staged_candidate needs every argument (a null target parent is Home) and a node or bit result type'
      using errcode = '22023';
  end if;
  if not exists (select 1 from app.accounts where user_id = v_user) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_missing'));
  end if;
  if exists (select 1 from app.accounts where user_id = v_user and deletion_requested_at is not null) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_deleting'));
  end if;

  select id into v_inbox from app.nodes where user_id = v_user and system_role = 'inbox';
  if v_inbox is null then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;
  -- The Grid lock first. A target that is missing or a system Node is rejected later without it.
  if p_target_parent_id is not null then
    select * into v_tgt from app.nodes where id = p_target_parent_id and user_id = v_user;
    v_lock_grid := v_tgt.id is not null and v_tgt.system_role is null;
  end if;
  if v_lock_grid then
    perform internal.lock_grid(v_user, p_target_parent_id);
  end if;
  perform 1 from app.nodes
   where user_id = v_user and id in (v_inbox, case when v_lock_grid then p_target_parent_id end)
   order by id for update;

  select * into v_scratch from app.bits where id = p_scratch_id and user_id = v_user;
  if v_scratch.id is null then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;
  if v_scratch.parent_id <> v_inbox then
    return internal.envelope('rejected', null, internal.inbox_changes(jsonb_build_array(to_jsonb(v_scratch))),
                             jsonb_build_object('code', 'invalid_target'));
  end if;
  select * into v_scratch from app.bits where id = p_scratch_id and user_id = v_user for update;
  if v_scratch.id is null or v_scratch.parent_id <> v_inbox then
    raise exception 'could not settle the lock set of Bit %', p_scratch_id using errcode = '40001';
  end if;

  select * into v_src from app.scratch_breakdowns where id = p_source_id and user_id = v_user for update;
  select * into v_cand from app.staged_candidates where id = p_candidate_id and user_id = v_user;
  select * into v_bysrc from app.staged_candidates where source_breakdown_id = p_source_id and user_id = v_user;
  select * into v_rn from app.nodes where id = p_result_id and user_id = v_user;
  select * into v_rb from app.bits where id = p_result_id and user_id = v_user;
  select * into v_tgt from app.nodes where id = p_target_parent_id and user_id = v_user;

  -- The complete postcondition: the exact result, the source consumed at its created_at at expected + 1,
  -- the candidate absent by id and by source.
  if p_result_type = 'node' then
    if v_rn.id is not null and v_rb.id is null and v_rn.title = p_title and v_rn.parent_id is not distinct from p_target_parent_id
       and v_rn.x = p_x and v_rn.y = p_y and v_rn.version = 1 and not v_rn.past_deadline_dismissed
       and v_rn.deleted_at is null and v_rn.archived_at is null and v_rn.system_role is null and not v_rn.hidden_from_grid
       and v_rn.deadline is null and not v_rn.deadline_all_day and v_rn.color = 'hsl(210, 80%, 55%)' and v_rn.icon = 'Folder'
       and v_rn.created_at = v_rn.mtime and v_rn.level = cardinality(p_expected_ancestor_ids) then
      v_created := v_rn.created_at;
    end if;
  elsif v_rb.id is not null and v_rn.id is null and p_target_parent_id is not null and v_rb.title = p_title
        and v_rb.parent_id = p_target_parent_id and v_rb.x = p_x and v_rb.y = p_y and v_rb.version = 1
        and not v_rb.past_deadline_dismissed and v_rb.deleted_at is null and v_rb.archived_at is null
        and v_rb.description = '' and v_rb.icon = 'ListTodo' and v_rb.deadline is null and not v_rb.deadline_all_day
        and v_rb.priority is null and v_rb.status = 'active' and v_rb.created_at = v_rb.mtime then
    v_created := v_rb.created_at;
  end if;
  if v_created is not null and v_src.id is not null and v_src.scratch_bit_id = p_scratch_id
     and v_src.version = p_source_expected_version + 1 and v_src.consumed_at = v_created
     and v_cand.id is null and v_bysrc.id is null then
    return internal.envelope('already_applied', jsonb_build_object('id', p_result_id),
                             internal.placement_view(v_user, p_scratch_id, p_result_id, p_source_id, p_candidate_id));
  end if;

  if v_rn.id is not null or v_rb.id is not null then
    return internal.envelope('conflict', null, internal.placement_view(v_user, p_scratch_id, p_result_id, p_source_id, p_candidate_id));
  end if;
  if v_src.id is null then
    return internal.envelope('rejected', null, internal.placement_view(v_user, p_scratch_id, p_result_id, p_source_id, p_candidate_id),
                             jsonb_build_object('code', 'not_found'));
  end if;
  if not internal.active_inbox_scratch(v_user, v_scratch) or v_src.scratch_bit_id <> p_scratch_id or v_src.consumed_at is not null then
    return internal.envelope('rejected', null, internal.placement_view(v_user, p_scratch_id, p_result_id, p_source_id, p_candidate_id),
                             jsonb_build_object('code', 'invalid_target'));
  end if;
  if v_src.version <> p_source_expected_version then
    return internal.envelope('conflict', null, internal.placement_view(v_user, p_scratch_id, p_result_id, p_source_id, p_candidate_id));
  end if;
  if v_cand.id is null or v_bysrc.id is distinct from v_cand.id or v_cand.source_breakdown_id <> p_source_id
     or v_cand.scratch_bit_id <> p_scratch_id or v_cand.lifecycle <> 'staged' or v_cand.result_type <> p_result_type
     or v_cand.version <> p_candidate_expected_version then
    return internal.envelope('conflict', null, internal.placement_view(v_user, p_scratch_id, p_result_id, p_source_id, p_candidate_id));
  end if;

  -- Title length in UTF-16 units, as the column check and the client count it.
  v_max := case p_result_type when 'node' then 100 else 200 end;
  if (char_length(p_title) + char_length(regexp_replace(p_title, '[^\U00010000-\U0010FFFF]', '', 'g'))) < 1 or (char_length(p_title) + char_length(regexp_replace(p_title, '[^\U00010000-\U0010FFFF]', '', 'g'))) > v_max then
    return internal.envelope('rejected', null, internal.placement_view(v_user, p_scratch_id, p_result_id, p_source_id, p_candidate_id),
                             jsonb_build_object('code', 'invalid_input'));
  end if;
  -- A target missing at the unlocked pre-read stays invalid: its Grid lock was not taken.
  if not v_lock_grid or not internal.placement_target_ok(v_user, p_target_parent_id, p_expected_ancestor_ids, p_result_type) then
    return internal.envelope('rejected', null, internal.placement_view(v_user, p_scratch_id, p_result_id, p_source_id, p_candidate_id),
                             jsonb_build_object('code', 'invalid_target'));
  end if;
  if p_x < 0 or p_x > 17 or p_y < 0 or p_y > 8 then
    return internal.envelope('rejected', null, internal.placement_view(v_user, p_scratch_id, p_result_id, p_source_id, p_candidate_id),
                             jsonb_build_object('code', 'invalid_input'));
  end if;
  if internal.cell_taken(v_user, p_target_parent_id, p_x, p_y) then
    return internal.envelope('rejected', null, internal.placement_view(v_user, p_scratch_id, p_result_id, p_source_id, p_candidate_id),
                             jsonb_build_object('code', 'cell_taken'));
  end if;
  v_limit := internal.limit_reached(v_user, case p_result_type when 'node' then 'nodes' else 'bits' end);
  if v_limit is not null then
    return internal.envelope('rejected', null, internal.placement_view(v_user, p_scratch_id, p_result_id, p_source_id, p_candidate_id),
                             jsonb_build_object('code', 'account_limit', 'table', case p_result_type when 'node' then 'nodes' else 'bits' end, 'limit', v_limit));
  end if;

  if p_result_type = 'node' then
    insert into app.nodes (id, user_id, title, color, icon, deadline, deadline_all_day, mtime, created_at, version,
                           parent_id, level, x, y, past_deadline_dismissed)
    values (p_result_id, v_user, p_title, 'hsl(210, 80%, 55%)', 'Folder', null, false, v_now, v_now, 1,
            p_target_parent_id, coalesce(v_tgt.level + 1, 0), p_x, p_y, false)
    returning to_jsonb(app.nodes.*) into v_new;
  else
    insert into app.bits (id, user_id, title, description, icon, deadline, deadline_all_day, priority, status,
                          mtime, created_at, version, parent_id, x, y, past_deadline_dismissed)
    values (p_result_id, v_user, p_title, '', 'ListTodo', null, false, null, 'active',
            v_now, v_now, 1, p_target_parent_id, p_x, p_y, false)
    returning to_jsonb(app.bits.*) into v_new;
  end if;
  if p_target_parent_id is not null then
    update app.nodes set mtime = v_now where id = p_target_parent_id and user_id = v_user
    returning to_jsonb(app.nodes.*) into v_par;
  end if;
  update app.scratch_breakdowns set consumed_at = v_now, version = version + 1 where id = p_source_id and user_id = v_user
  returning to_jsonb(app.scratch_breakdowns.*) into v_srcnew;
  delete from app.staged_candidates where id = p_candidate_id and user_id = v_user;

  return internal.envelope('applied', jsonb_build_object('id', p_result_id),
    internal.inbox_changes(
      p_bits => case when p_result_type = 'bit' then jsonb_build_array(v_new) else '[]'::jsonb end,
      p_breakdowns => jsonb_build_array(v_srcnew),
      p_deleted_candidates => array[p_candidate_id],
      p_nodes => (case when p_result_type = 'node' then jsonb_build_array(v_new) else '[]'::jsonb end)
                 || (case when v_par is null then '[]'::jsonb else jsonb_build_array(v_par) end)));
end
$function$;

create or replace FUNCTION public.promote_bit_to_node(p_id uuid, p_reserved_cells jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := internal.uid();
  v_now bigint := internal.now_ms();
  v_bit app.bits;
  v_parent app.nodes;
  v_parent_id uuid;
  v_attempt integer;
  v_chunks integer;
  v_limit integer;
  v_node_id uuid := gen_random_uuid();
  v_chunk record;
  v_cx integer;
  v_cy integer;
  v_new_node jsonb;
  v_new_bits jsonb := '[]';
  v_chunk_ids uuid[];
  v_par jsonb;
  v_changes jsonb;
  v_b jsonb;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not internal.valid_reserved_cells(p_reserved_cells) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'invalid_input'));
  end if;
  if not exists (select 1 from app.accounts where user_id = v_user) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_missing'));
  end if;
  if exists (select 1 from app.accounts where user_id = v_user and deletion_requested_at is not null) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_deleting'));
  end if;

  -- The Grid lock first, then the parent Node and the Bit; a Bit that moved meanwhile starts over.
  for v_attempt in 1 .. 3 loop
    select parent_id into v_parent_id from app.bits where id = p_id and user_id = v_user;
    if not found then
      return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
    end if;
    perform internal.lock_grid(v_user, v_parent_id);
    v_bit := internal.lock_bit_and_node(v_user, p_id);
    if v_bit.id is null then
      return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
    end if;
    exit when v_bit.parent_id = v_parent_id;
    if v_attempt = 3 then
      raise exception 'could not settle the lock set of Bit %', p_id using errcode = '40001';
    end if;
  end loop;
  select * into v_parent from app.nodes where id = v_bit.parent_id and user_id = v_user;
  v_b := internal.changes('[]', internal.bit_rows(v_user, array[p_id]));

  -- A Scratch Bit (parent: the Inbox) is never promoted, whatever it holds.
  if v_parent.system_role = 'inbox' or v_parent.system_role = 'archive_view'
     or v_bit.deleted_at is not null or v_bit.archived_at is not null
     or v_parent.level + 1 > 2 then
    return internal.envelope('rejected', null, v_b, jsonb_build_object('code', 'invalid_target'));
  end if;
  if v_parent.deleted_at is not null or v_parent.archived_at is not null then
    return internal.envelope('rejected', null, v_b, jsonb_build_object('code', 'parent_inactive'));
  end if;

  select count(*) into v_chunks from app.chunks where user_id = v_user and parent_id = p_id;
  v_limit := internal.limit_reached(v_user, 'nodes', 1);
  if v_limit is not null then
    return internal.envelope('rejected', null, v_b,
                             jsonb_build_object('code', 'account_limit', 'table', 'nodes', 'limit', v_limit));
  end if;
  v_limit := internal.limit_reached(v_user, 'bits', v_chunks - 1);
  if v_limit is not null then
    return internal.envelope('rejected', null, v_b,
                             jsonb_build_object('code', 'account_limit', 'table', 'bits', 'limit', v_limit));
  end if;

  begin
    insert into app.nodes (id, user_id, title, color, icon, deadline, deadline_all_day, mtime, created_at, version,
                           parent_id, level, x, y, past_deadline_dismissed)
    values (v_node_id, v_user, v_bit.title, 'hsl(221, 83%, 53%)', v_bit.icon, v_bit.deadline, v_bit.deadline_all_day,
            v_now, v_now, 1, v_bit.parent_id, v_parent.level + 1, v_bit.x, v_bit.y, false)
    returning to_jsonb(app.nodes.*) into v_new_node;

    for v_chunk in
      select c.* from app.chunks c where c.user_id = v_user and c.parent_id = p_id order by c."order", c.id for update
    loop
      select f.x, f.y into v_cx, v_cy from internal.pick_free_cell(v_user, v_node_id, p_reserved_cells) f;
      if not found then
        raise exception 'grid_full' using errcode = 'GR001';
      end if;
      insert into app.bits (id, user_id, title, description, icon, deadline, deadline_all_day, priority, status,
                            mtime, created_at, version, parent_id, x, y, past_deadline_dismissed)
      values (gen_random_uuid(), v_user, v_chunk.title, v_chunk.description, v_bit.icon, v_chunk.time,
              v_chunk.time_all_day, null, case when v_chunk.status = 'complete' then 'complete' else 'active' end,
              v_now, v_now, 1, v_node_id, v_cx, v_cy, false);
      v_chunk_ids := coalesce(v_chunk_ids, '{}') || v_chunk.id;
    end loop;
  exception when sqlstate 'GR001' then
    return internal.envelope('rejected', null, v_b, jsonb_build_object('code', 'grid_full'));
  end;

  select coalesce(jsonb_agg(to_jsonb(b) order by b.id), '[]'::jsonb) into v_new_bits
    from app.bits b where b.user_id = v_user and b.parent_id = v_node_id;
  delete from app.chunks where user_id = v_user and parent_id = p_id;
  delete from app.bits where id = p_id and user_id = v_user;
  update app.nodes set mtime = v_now where id = v_parent.id and user_id = v_user
  returning to_jsonb(app.nodes.*) into v_par;

  v_changes := internal.changes(jsonb_build_array(v_new_node, v_par), v_new_bits);
  v_changes := jsonb_set(v_changes, '{bits}',
    coalesce(v_changes -> 'bits', jsonb_build_object('upserted', '[]'::jsonb))
      || jsonb_build_object('deleted', jsonb_build_array(p_id)));
  if coalesce(array_length(v_chunk_ids, 1), 0) > 0 then
    v_changes := jsonb_set(v_changes, '{chunks}',
      jsonb_build_object('upserted', '[]'::jsonb, 'deleted', to_jsonb(v_chunk_ids)));
  end if;
  return internal.envelope('applied', jsonb_build_object('id', v_node_id), v_changes);
end
$function$;

create or replace FUNCTION public.reconcile_add_breakdown(p_breakdown_id uuid, p_scratch_id uuid, p_scratch_expected_version integer, p_content text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
    with u as (select (select auth.uid()) as id),
    acct as (
      select exists (select 1 from app.accounts a, u where a.user_id = u.id) as ok,
             exists (select 1 from app.accounts a, u
                      where a.user_id = u.id and a.deletion_requested_at is not null) as deleting
    ),
    sc as (select b.* from app.bits b, u where b.user_id = u.id and b.id = p_scratch_id),
    act as (
      select exists (
        select 1 from sc join app.nodes n on n.user_id = sc.user_id and n.id = sc.parent_id
         where sc.deleted_at is null and sc.archived_at is null
           and n.system_role = 'inbox' and n.deleted_at is null and n.archived_at is null
      ) as ok
    ),
    br as (select r.* from app.scratch_breakdowns r, u where r.user_id = u.id and r.id = p_breakdown_id),
    verdict as (
      select case
        when not acct.ok then 'account_missing'
        when acct.deleting then 'account_deleting'
        when p_breakdown_id is null or p_scratch_id is null or p_scratch_expected_version is null or p_content is null then 'conflict'
        when act.ok and exists (select 1 from br where br.scratch_bit_id = p_scratch_id and br.content = p_content
                                  and br.consumed_at is null and br.version = 1)
             and exists (select 1 from sc where sc.version = p_scratch_expected_version + 1) then 'already_applied'
        when act.ok and not exists (select 1 from br)
             and exists (select 1 from sc where sc.version = p_scratch_expected_version) then 'not_applied'
        else 'conflict'
      end as s
      from acct, act
    )
    select case when verdict.s in ('account_missing', 'account_deleting')
      then jsonb_build_object('status', 'rejected', 'result', null, 'changes', '{}'::jsonb,
                              'rejection', jsonb_build_object('code', verdict.s))
      else jsonb_build_object('status', verdict.s, 'result', null, 'changes', coalesce((select jsonb_object_agg(t.k, t.v) from (values
        ('bits', case when exists (select 1 from sc) then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(sc)) from sc), 'deleted', '[]'::jsonb) end),
        ('scratch_breakdowns', case when exists (select 1 from br) then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(br)) from br), 'deleted', '[]'::jsonb) end)
      ) as t(k, v) where t.v is not null), '{}'::jsonb))
    end
    from verdict
  $function$;

create or replace FUNCTION public.reconcile_delete_breakdown(p_id uuid, p_expected_version integer, p_scratch_id uuid, p_scratch_expected_version integer)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
    with u as (select (select auth.uid()) as id),
    acct as (
      select exists (select 1 from app.accounts a, u where a.user_id = u.id) as ok,
             exists (select 1 from app.accounts a, u
                      where a.user_id = u.id and a.deletion_requested_at is not null) as deleting
    ),
    sc as (select b.* from app.bits b, u where b.user_id = u.id and b.id = p_scratch_id),
    br as (select r.* from app.scratch_breakdowns r, u where r.user_id = u.id and r.id = p_id),
    cand as (select c.* from app.staged_candidates c, u where c.user_id = u.id and c.source_breakdown_id = p_id),
    act as (
      select exists (
        select 1 from sc join app.nodes n on n.user_id = sc.user_id and n.id = sc.parent_id
         where sc.deleted_at is null and sc.archived_at is null
           and n.system_role = 'inbox' and n.deleted_at is null and n.archived_at is null
      ) as ok
    ),
    verdict as (
      select case
        when not acct.ok then 'account_missing'
        when acct.deleting then 'account_deleting'
        when p_id is null or p_expected_version is null or p_scratch_id is null or p_scratch_expected_version is null then 'conflict'
        when act.ok and not exists (select 1 from br) and not exists (select 1 from cand)
             and exists (select 1 from sc where sc.version = p_scratch_expected_version + 1) then 'already_applied'
        when act.ok and not exists (select 1 from cand)
             and exists (select 1 from br where br.scratch_bit_id = p_scratch_id and br.consumed_at is null and br.version = p_expected_version)
             and exists (select 1 from sc where sc.version = p_scratch_expected_version) then 'not_applied'
        else 'conflict'
      end as s
      from acct, act
    )
    select case when verdict.s in ('account_missing', 'account_deleting')
      then jsonb_build_object('status', 'rejected', 'result', null, 'changes', '{}'::jsonb,
                              'rejection', jsonb_build_object('code', verdict.s))
      else jsonb_build_object('status', verdict.s, 'result', null, 'changes', coalesce((select jsonb_object_agg(t.k, t.v) from (values
        ('bits', case when exists (select 1 from sc) then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(sc)) from sc), 'deleted', '[]'::jsonb) end),
        ('scratch_breakdowns', case when exists (select 1 from br) then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(br)) from br), 'deleted', '[]'::jsonb) end),
        ('staged_candidates', case when exists (select 1 from cand) then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(cand)) from cand), 'deleted', '[]'::jsonb) end)
      ) as t(k, v) where t.v is not null), '{}'::jsonb))
    end
    from verdict
  $function$;

create or replace FUNCTION public.reconcile_place_direct_breakdown(p_result_id uuid, p_scratch_id uuid, p_source_id uuid, p_source_expected_version integer, p_result_type text, p_title text, p_target_parent_id uuid, p_expected_ancestor_ids uuid[], p_x integer, p_y integer)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
    with recursive u as (select (select auth.uid()) as id),
    acct as (
      select exists (select 1 from app.accounts a, u where a.user_id = u.id) as ok,
             exists (select 1 from app.accounts a, u
                      where a.user_id = u.id and a.deletion_requested_at is not null) as deleting
    ),
    sc as (select b.* from app.bits b, u where b.user_id = u.id and b.id = p_scratch_id),
    src as (select r.* from app.scratch_breakdowns r, u where r.user_id = u.id and r.id = p_source_id),
    bysrc as (select c.* from app.staged_candidates c, u where c.user_id = u.id and c.source_breakdown_id = p_source_id),
    rn as (select n.* from app.nodes n, u where n.user_id = u.id and n.id = p_result_id),
    rb as (select b.* from app.bits b, u where b.user_id = u.id and b.id = p_result_id),
    act as (
      select exists (
        select 1 from sc join app.nodes n on n.user_id = sc.user_id and n.id = sc.parent_id
         where sc.deleted_at is null and sc.archived_at is null
           and n.system_role = 'inbox' and n.deleted_at is null and n.archived_at is null
      ) as ok
    ),
    chain(id, parent_id, level, depth, ok) as (
      select n.id, n.parent_id, n.level, 1,
             (n.deleted_at is null and n.archived_at is null and n.system_role is null and not n.hidden_from_grid)
        from app.nodes n, u where n.user_id = u.id and n.id = p_target_parent_id
      union all
      select n.id, n.parent_id, n.level, c.depth + 1,
             (n.deleted_at is null and n.archived_at is null and n.system_role is null and not n.hidden_from_grid)
        from chain c join app.nodes n on n.id = c.parent_id, u
       where n.user_id = u.id and c.depth < 4
    ),
    tgt as (
      select case when p_target_parent_id is null then p_result_type = 'node' and cardinality(p_expected_ancestor_ids) = 0
        else coalesce((
          select bool_and(ok)
             and count(*) = cardinality(p_expected_ancestor_ids)
             and (select parent_id from chain order by depth desc limit 1) is null
             and (select array_agg(id order by depth desc) from chain) = p_expected_ancestor_ids
             and bool_and(level = (select count(*) from chain) - depth)
             and (p_result_type = 'bit' or (select level from chain where depth = 1) < 2)
            from chain), false)
        end as ok
    ),
    -- created_at of the result when it is exactly what this placement creates
    mres as (
      select rn.created_at from rn
       where p_result_type = 'node' and not exists (select 1 from rb)
         and rn.title = p_title and rn.parent_id is not distinct from p_target_parent_id and rn.x = p_x and rn.y = p_y
         and rn.version = 1 and not rn.past_deadline_dismissed and rn.deleted_at is null and rn.archived_at is null
         and rn.system_role is null and not rn.hidden_from_grid and rn.deadline is null and not rn.deadline_all_day
         and rn.color = 'hsl(210, 80%, 55%)' and rn.icon = 'Folder' and rn.created_at = rn.mtime
         and rn.level = cardinality(p_expected_ancestor_ids)
      union all
      select rb.created_at from rb
       where p_result_type = 'bit' and not exists (select 1 from rn) and p_target_parent_id is not null
         and rb.title = p_title and rb.parent_id = p_target_parent_id and rb.x = p_x and rb.y = p_y
         and rb.version = 1 and not rb.past_deadline_dismissed and rb.deleted_at is null and rb.archived_at is null
         and rb.description = '' and rb.icon = 'ListTodo' and rb.deadline is null and not rb.deadline_all_day
         and rb.priority is null and rb.status = 'active' and rb.created_at = rb.mtime
    ),
    verdict as (
      select case
        when not acct.ok then 'account_missing'
        when acct.deleting then 'account_deleting'
        when p_result_id is null or p_scratch_id is null or p_source_id is null or p_source_expected_version is null
             or p_result_type is null or p_result_type not in ('node', 'bit') or p_title is null
             or p_expected_ancestor_ids is null or p_x is null or p_y is null
             then 'conflict'
        when exists (select 1 from mres, src where src.scratch_bit_id = p_scratch_id
                       and src.version = p_source_expected_version + 1 and src.consumed_at = mres.created_at)
             and not exists (select 1 from bysrc) then 'already_applied'
        when not exists (select 1 from rn) and not exists (select 1 from rb) and act.ok
             and exists (select 1 from src where src.scratch_bit_id = p_scratch_id and src.consumed_at is null
                           and src.version = p_source_expected_version)
             and not exists (select 1 from bysrc) and exists (select 1 from src where src.content = p_title)
             and (char_length(p_title) + char_length(regexp_replace(p_title, '[^\U00010000-\U0010FFFF]', '', 'g'))) between 1 and (case p_result_type when 'node' then 100 else 200 end)
             and tgt.ok
             and p_x between 0 and 17 and p_y between 0 and 8
             and not exists (select 1 from app.nodes n, u where n.user_id = u.id and n.parent_id is not distinct from p_target_parent_id
                               and n.x = p_x and n.y = p_y and n.deleted_at is null and n.archived_at is null
                               and (p_target_parent_id is not null or not n.hidden_from_grid))
             and not exists (select 1 from app.bits b, u where b.user_id = u.id and p_target_parent_id is not null
                               and b.parent_id = p_target_parent_id and b.x = p_x and b.y = p_y
                               and b.deleted_at is null and b.archived_at is null) then 'not_applied'
        else 'conflict'
      end as s
      from acct, act, tgt
    )
    select case when verdict.s in ('account_missing', 'account_deleting')
      then jsonb_build_object('status', 'rejected', 'result', null, 'changes', '{}'::jsonb,
                              'rejection', jsonb_build_object('code', verdict.s))
      else jsonb_build_object('status', verdict.s, 'result', null, 'changes', coalesce((select jsonb_object_agg(t.k, t.v) from (values
        ('nodes', case when exists (select 1 from rn) then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(rn)) from rn), 'deleted', '[]'::jsonb) end),
        ('bits', case when exists (select 1 from sc union all select 1 from rb)
           then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(w)) from (select * from sc union select * from rb) w), 'deleted', '[]'::jsonb) end),
        ('scratch_breakdowns', case when exists (select 1 from src) then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(src)) from src), 'deleted', '[]'::jsonb) end),
        ('staged_candidates', case when exists (select 1 from bysrc)
           then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(bysrc)) from bysrc), 'deleted', '[]'::jsonb) end)
      ) as t(k, v) where t.v is not null), '{}'::jsonb))
    end
    from verdict
  $function$;

create or replace FUNCTION public.reconcile_place_staged_candidate(p_result_id uuid, p_scratch_id uuid, p_source_id uuid, p_source_expected_version integer, p_result_type text, p_title text, p_target_parent_id uuid, p_expected_ancestor_ids uuid[], p_x integer, p_y integer, p_candidate_id uuid, p_candidate_expected_version integer)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
    with recursive u as (select (select auth.uid()) as id),
    acct as (
      select exists (select 1 from app.accounts a, u where a.user_id = u.id) as ok,
             exists (select 1 from app.accounts a, u
                      where a.user_id = u.id and a.deletion_requested_at is not null) as deleting
    ),
    sc as (select b.* from app.bits b, u where b.user_id = u.id and b.id = p_scratch_id),
    src as (select r.* from app.scratch_breakdowns r, u where r.user_id = u.id and r.id = p_source_id),
    cand as (select c.* from app.staged_candidates c, u where c.user_id = u.id and c.id = p_candidate_id),
    bysrc as (select c.* from app.staged_candidates c, u where c.user_id = u.id and c.source_breakdown_id = p_source_id),
    rn as (select n.* from app.nodes n, u where n.user_id = u.id and n.id = p_result_id),
    rb as (select b.* from app.bits b, u where b.user_id = u.id and b.id = p_result_id),
    act as (
      select exists (
        select 1 from sc join app.nodes n on n.user_id = sc.user_id and n.id = sc.parent_id
         where sc.deleted_at is null and sc.archived_at is null
           and n.system_role = 'inbox' and n.deleted_at is null and n.archived_at is null
      ) as ok
    ),
    chain(id, parent_id, level, depth, ok) as (
      select n.id, n.parent_id, n.level, 1,
             (n.deleted_at is null and n.archived_at is null and n.system_role is null and not n.hidden_from_grid)
        from app.nodes n, u where n.user_id = u.id and n.id = p_target_parent_id
      union all
      select n.id, n.parent_id, n.level, c.depth + 1,
             (n.deleted_at is null and n.archived_at is null and n.system_role is null and not n.hidden_from_grid)
        from chain c join app.nodes n on n.id = c.parent_id, u
       where n.user_id = u.id and c.depth < 4
    ),
    tgt as (
      select case when p_target_parent_id is null then p_result_type = 'node' and cardinality(p_expected_ancestor_ids) = 0
        else coalesce((
          select bool_and(ok)
             and count(*) = cardinality(p_expected_ancestor_ids)
             and (select parent_id from chain order by depth desc limit 1) is null
             and (select array_agg(id order by depth desc) from chain) = p_expected_ancestor_ids
             and bool_and(level = (select count(*) from chain) - depth)
             and (p_result_type = 'bit' or (select level from chain where depth = 1) < 2)
            from chain), false)
        end as ok
    ),
    -- created_at of the result when it is exactly what this placement creates
    mres as (
      select rn.created_at from rn
       where p_result_type = 'node' and not exists (select 1 from rb)
         and rn.title = p_title and rn.parent_id is not distinct from p_target_parent_id and rn.x = p_x and rn.y = p_y
         and rn.version = 1 and not rn.past_deadline_dismissed and rn.deleted_at is null and rn.archived_at is null
         and rn.system_role is null and not rn.hidden_from_grid and rn.deadline is null and not rn.deadline_all_day
         and rn.color = 'hsl(210, 80%, 55%)' and rn.icon = 'Folder' and rn.created_at = rn.mtime
         and rn.level = cardinality(p_expected_ancestor_ids)
      union all
      select rb.created_at from rb
       where p_result_type = 'bit' and not exists (select 1 from rn) and p_target_parent_id is not null
         and rb.title = p_title and rb.parent_id = p_target_parent_id and rb.x = p_x and rb.y = p_y
         and rb.version = 1 and not rb.past_deadline_dismissed and rb.deleted_at is null and rb.archived_at is null
         and rb.description = '' and rb.icon = 'ListTodo' and rb.deadline is null and not rb.deadline_all_day
         and rb.priority is null and rb.status = 'active' and rb.created_at = rb.mtime
    ),
    verdict as (
      select case
        when not acct.ok then 'account_missing'
        when acct.deleting then 'account_deleting'
        when p_result_id is null or p_scratch_id is null or p_source_id is null or p_source_expected_version is null
             or p_result_type is null or p_result_type not in ('node', 'bit') or p_title is null
             or p_expected_ancestor_ids is null or p_x is null or p_y is null
             or p_candidate_id is null or p_candidate_expected_version is null then 'conflict'
        when exists (select 1 from mres, src where src.scratch_bit_id = p_scratch_id
                       and src.version = p_source_expected_version + 1 and src.consumed_at = mres.created_at)
             and not exists (select 1 from cand) and not exists (select 1 from bysrc) then 'already_applied'
        when not exists (select 1 from rn) and not exists (select 1 from rb) and act.ok
             and exists (select 1 from src where src.scratch_bit_id = p_scratch_id and src.consumed_at is null
                           and src.version = p_source_expected_version)
             and exists (select 1 from cand, bysrc where bysrc.id = cand.id and cand.source_breakdown_id = p_source_id
                           and cand.scratch_bit_id = p_scratch_id and cand.lifecycle = 'staged'
                           and cand.result_type = p_result_type and cand.version = p_candidate_expected_version)
             and (char_length(p_title) + char_length(regexp_replace(p_title, '[^\U00010000-\U0010FFFF]', '', 'g'))) between 1 and (case p_result_type when 'node' then 100 else 200 end)
             and tgt.ok
             and p_x between 0 and 17 and p_y between 0 and 8
             and not exists (select 1 from app.nodes n, u where n.user_id = u.id and n.parent_id is not distinct from p_target_parent_id
                               and n.x = p_x and n.y = p_y and n.deleted_at is null and n.archived_at is null
                               and (p_target_parent_id is not null or not n.hidden_from_grid))
             and not exists (select 1 from app.bits b, u where b.user_id = u.id and p_target_parent_id is not null
                               and b.parent_id = p_target_parent_id and b.x = p_x and b.y = p_y
                               and b.deleted_at is null and b.archived_at is null) then 'not_applied'
        else 'conflict'
      end as s
      from acct, act, tgt
    )
    select case when verdict.s in ('account_missing', 'account_deleting')
      then jsonb_build_object('status', 'rejected', 'result', null, 'changes', '{}'::jsonb,
                              'rejection', jsonb_build_object('code', verdict.s))
      else jsonb_build_object('status', verdict.s, 'result', null, 'changes', coalesce((select jsonb_object_agg(t.k, t.v) from (values
        ('nodes', case when exists (select 1 from rn) then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(rn)) from rn), 'deleted', '[]'::jsonb) end),
        ('bits', case when exists (select 1 from sc union all select 1 from rb)
           then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(w)) from (select * from sc union select * from rb) w), 'deleted', '[]'::jsonb) end),
        ('scratch_breakdowns', case when exists (select 1 from src) then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(src)) from src), 'deleted', '[]'::jsonb) end),
        ('staged_candidates', case when exists (select 1 from cand union all select 1 from bysrc)
           then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(x)) from (select * from cand union select * from bysrc) x), 'deleted', '[]'::jsonb) end)
      ) as t(k, v) where t.v is not null), '{}'::jsonb))
    end
    from verdict
  $function$;

create or replace FUNCTION public.reconcile_save_breakdown(p_id uuid, p_expected_version integer, p_base_content text, p_base_order integer, p_content text, p_order integer)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
    with u as (select (select auth.uid()) as id),
    acct as (
      select exists (select 1 from app.accounts a, u where a.user_id = u.id) as ok,
             exists (select 1 from app.accounts a, u
                      where a.user_id = u.id and a.deletion_requested_at is not null) as deleting
    ),
    br as (select r.* from app.scratch_breakdowns r, u where r.user_id = u.id and r.id = p_id),
    sc as (select b.* from app.bits b join br on b.user_id = br.user_id and b.id = br.scratch_bit_id),
    cand as (select c.* from app.staged_candidates c, u where c.user_id = u.id and c.source_breakdown_id = p_id),
    act as (
      select exists (
        select 1 from sc join app.nodes n on n.user_id = sc.user_id and n.id = sc.parent_id
         where sc.deleted_at is null and sc.archived_at is null
           and n.system_role = 'inbox' and n.deleted_at is null and n.archived_at is null
      ) as ok
    ),
    verdict as (
      select case
        when not acct.ok then 'account_missing'
        when acct.deleting then 'account_deleting'
        when p_id is null or p_expected_version is null or p_base_content is null or p_base_order is null or p_content is null or p_order is null then 'conflict'
        when act.ok and not exists (select 1 from cand)
             and exists (select 1 from br where br.consumed_at is null and br.version = p_expected_version + 1
                           and br.content = p_content and br."order" = p_order) then 'already_applied'
        when act.ok and not exists (select 1 from cand)
             and exists (select 1 from br where br.consumed_at is null and br.version = p_expected_version
                           and br.content = p_base_content and br."order" = p_base_order) then 'not_applied'
        else 'conflict'
      end as s
      from acct, act
    )
    select case when verdict.s in ('account_missing', 'account_deleting')
      then jsonb_build_object('status', 'rejected', 'result', null, 'changes', '{}'::jsonb,
                              'rejection', jsonb_build_object('code', verdict.s))
      else jsonb_build_object('status', verdict.s, 'result', null, 'changes', coalesce((select jsonb_object_agg(t.k, t.v) from (values
        ('bits', case when exists (select 1 from sc) then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(sc)) from sc), 'deleted', '[]'::jsonb) end),
        ('scratch_breakdowns', case when exists (select 1 from br) then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(br)) from br), 'deleted', '[]'::jsonb) end),
        ('staged_candidates', case when exists (select 1 from cand) then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(cand)) from cand), 'deleted', '[]'::jsonb) end)
      ) as t(k, v) where t.v is not null), '{}'::jsonb))
    end
    from verdict
  $function$;

create or replace FUNCTION public.reconcile_save_scratch_title(p_scratch_id uuid, p_expected_version integer, p_base_title text, p_title text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
    with u as (select (select auth.uid()) as id),
    acct as (
      select exists (select 1 from app.accounts a, u where a.user_id = u.id) as ok,
             exists (select 1 from app.accounts a, u
                      where a.user_id = u.id and a.deletion_requested_at is not null) as deleting
    ),
    sc as (select b.* from app.bits b, u where b.user_id = u.id and b.id = p_scratch_id),
    act as (
      select exists (
        select 1 from sc join app.nodes n on n.user_id = sc.user_id and n.id = sc.parent_id
         where sc.deleted_at is null and sc.archived_at is null
           and n.system_role = 'inbox' and n.deleted_at is null and n.archived_at is null
      ) as ok
    ),
    verdict as (
      select case
        when not acct.ok then 'account_missing'
        when acct.deleting then 'account_deleting'
        when p_scratch_id is null or p_expected_version is null or p_base_title is null or p_title is null then 'conflict'
        when act.ok and exists (select 1 from sc where sc.title = p_title and sc.version = p_expected_version + 1) then 'already_applied'
        when act.ok and exists (select 1 from sc where sc.title = p_base_title and sc.version = p_expected_version) then 'not_applied'
        else 'conflict'
      end as s
      from acct, act
    )
    select case when verdict.s in ('account_missing', 'account_deleting')
      then jsonb_build_object('status', 'rejected', 'result', null, 'changes', '{}'::jsonb,
                              'rejection', jsonb_build_object('code', verdict.s))
      else jsonb_build_object('status', verdict.s, 'result', null, 'changes', coalesce((select jsonb_object_agg(t.k, t.v) from (values
        ('bits', case when exists (select 1 from sc) then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(sc)) from sc), 'deleted', '[]'::jsonb) end)
      ) as t(k, v) where t.v is not null), '{}'::jsonb))
    end
    from verdict
  $function$;

create or replace FUNCTION public.reconcile_stage_candidate(p_candidate_id uuid, p_scratch_id uuid, p_source_id uuid, p_source_expected_version integer, p_result_type text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
    with u as (select (select auth.uid()) as id),
    acct as (
      select exists (select 1 from app.accounts a, u where a.user_id = u.id) as ok,
             exists (select 1 from app.accounts a, u
                      where a.user_id = u.id and a.deletion_requested_at is not null) as deleting
    ),
    sc as (select b.* from app.bits b, u where b.user_id = u.id and b.id = p_scratch_id),
    src as (select r.* from app.scratch_breakdowns r, u where r.user_id = u.id and r.id = p_source_id),
    cand as (select c.* from app.staged_candidates c, u where c.user_id = u.id and c.id = p_candidate_id),
    bysrc as (select c.* from app.staged_candidates c, u where c.user_id = u.id and c.source_breakdown_id = p_source_id),
    act as (
      select exists (
        select 1 from sc join app.nodes n on n.user_id = sc.user_id and n.id = sc.parent_id
         where sc.deleted_at is null and sc.archived_at is null
           and n.system_role = 'inbox' and n.deleted_at is null and n.archived_at is null
      ) as ok
    ),
    verdict as (
      select case
        when not acct.ok then 'account_missing'
        when acct.deleting then 'account_deleting'
        when p_candidate_id is null or p_scratch_id is null or p_source_id is null
             or p_source_expected_version is null or p_result_type is null
             or p_result_type not in ('node', 'bit') then 'conflict'
        when act.ok
             and exists (select 1 from cand, bysrc where bysrc.id = cand.id and cand.scratch_bit_id = p_scratch_id
                           and cand.source_breakdown_id = p_source_id and cand.result_type = p_result_type
                           and cand.lifecycle = 'staged' and cand.version = 1 and cand.created_at = cand.updated_at)
             and exists (select 1 from src where src.scratch_bit_id = p_scratch_id and src.consumed_at is null
                           and src.version = p_source_expected_version + 1) then 'already_applied'
        when act.ok and not exists (select 1 from cand) and not exists (select 1 from bysrc)
             and exists (select 1 from src where src.scratch_bit_id = p_scratch_id and src.consumed_at is null
                           and src.version = p_source_expected_version) then 'not_applied'
        else 'conflict'
      end as s
      from acct, act
    )
    select case when verdict.s in ('account_missing', 'account_deleting')
      then jsonb_build_object('status', 'rejected', 'result', null, 'changes', '{}'::jsonb,
                              'rejection', jsonb_build_object('code', verdict.s))
      else jsonb_build_object('status', verdict.s, 'result', null, 'changes', coalesce((select jsonb_object_agg(t.k, t.v) from (values
        ('bits', case when exists (select 1 from sc) then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(sc)) from sc), 'deleted', '[]'::jsonb) end),
        ('scratch_breakdowns', case when exists (select 1 from src) then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(src)) from src), 'deleted', '[]'::jsonb) end),
        ('staged_candidates', case when exists (select 1 from cand union all select 1 from bysrc)
           then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(x)) from (select * from cand union select * from bysrc) x), 'deleted', '[]'::jsonb) end)
      ) as t(k, v) where t.v is not null), '{}'::jsonb))
    end
    from verdict
  $function$;

create or replace FUNCTION public.reconcile_trash_scratch(p_scratch_id uuid, p_expected_version integer, p_candidates jsonb)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
    with u as (select (select auth.uid()) as id),
    acct as (
      select exists (select 1 from app.accounts a, u where a.user_id = u.id) as ok,
             exists (select 1 from app.accounts a, u
                      where a.user_id = u.id and a.deletion_requested_at is not null) as deleting
    ),
    raw as (
      select e from jsonb_array_elements(case when jsonb_typeof(p_candidates) = 'array' then p_candidates else '[]'::jsonb end) e
    ),
    chk as (
      select e,
        (jsonb_typeof(e) = 'object'
         and e ?& array['candidate_id', 'candidate_expected_version', 'source_breakdown_id', 'source_expected_version']
         and jsonb_typeof(e -> 'candidate_id') = 'string' and jsonb_typeof(e -> 'source_breakdown_id') = 'string'
         and (e ->> 'candidate_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
         and (e ->> 'source_breakdown_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
         and jsonb_typeof(e -> 'candidate_expected_version') = 'number' and jsonb_typeof(e -> 'source_expected_version') = 'number'
         and (e ->> 'candidate_expected_version') ~ '^[1-9][0-9]{0,8}$' and (e ->> 'source_expected_version') ~ '^[1-9][0-9]{0,8}$') as ok
        from raw
    ),
    items as (
      select case when ok then (e ->> 'candidate_id')::uuid end as cid,
             case when ok then (e ->> 'candidate_expected_version')::integer end as cv,
             case when ok then (e ->> 'source_breakdown_id')::uuid end as sid,
             case when ok then (e ->> 'source_expected_version')::integer end as sv
        from chk
    ),
    inputs as (
      select coalesce(p_candidates is not null and jsonb_typeof(p_candidates) = 'array' and p_scratch_id is not null and p_expected_version is not null
              and not exists (select 1 from chk where not ok)
              and (select count(distinct cid) from items) = (select count(*) from items)
              and (select count(distinct sid) from items) = (select count(*) from items), false) as ok
    ),
    sc as (select b.* from app.bits b, u where b.user_id = u.id and b.id = p_scratch_id),
    owner_inbox as (
      select n.* from app.nodes n, u, sc where n.user_id = u.id and n.id = sc.parent_id and n.system_role = 'inbox'
    ),
    cds as (select c.* from app.staged_candidates c, u where c.user_id = u.id and c.scratch_bit_id = p_scratch_id),
    src as (
      select r.* from app.scratch_breakdowns r, u
       where r.user_id = u.id and (r.id in (select sid from items) or r.id in (select source_breakdown_id from cds))
    ),
    verdict as (
      select case
        when not acct.ok then 'account_missing'
        when acct.deleting then 'account_deleting'
        when not inputs.ok then 'conflict'
        when exists (select 1 from sc, owner_inbox where sc.deleted_at is not null and sc.archived_at is null
                        and sc.version = p_expected_version + 1)
             and not exists (
               select 1 from items i
                where exists (select 1 from cds where cds.id = i.cid)
                   or not exists (select 1 from src where src.id = i.sid and src.scratch_bit_id = p_scratch_id
                                    and src.consumed_at is null and src.version = i.sv + 1)) then 'already_applied'
        when exists (select 1 from sc, owner_inbox where owner_inbox.deleted_at is null and owner_inbox.archived_at is null
                        and sc.deleted_at is null and sc.archived_at is null and sc.version = p_expected_version)
             and (select count(*) from cds) = (select count(*) from items)
             and not exists (
               select 1 from items i
                where not exists (select 1 from cds join src on src.id = i.sid
                                   where cds.id = i.cid and cds.version = i.cv and cds.source_breakdown_id = i.sid
                                     and src.scratch_bit_id = p_scratch_id and src.consumed_at is null and src.version = i.sv)) then 'not_applied'
        else 'conflict'
      end as s
      from acct, inputs
    )
    select case when verdict.s in ('account_missing', 'account_deleting')
      then jsonb_build_object('status', 'rejected', 'result', null, 'changes', '{}'::jsonb,
                              'rejection', jsonb_build_object('code', verdict.s))
      else jsonb_build_object('status', verdict.s, 'result', null, 'changes', coalesce((select jsonb_object_agg(t.k, t.v) from (values
        ('bits', case when exists (select 1 from sc) then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(sc)) from sc), 'deleted', '[]'::jsonb) end),
        ('scratch_breakdowns', case when exists (select 1 from src) then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(src) order by src.id) from src), 'deleted', '[]'::jsonb) end),
        ('staged_candidates', case when exists (select 1 from cds) then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(cds) order by cds.id) from cds), 'deleted', '[]'::jsonb) end)
      ) as t(k, v) where t.v is not null), '{}'::jsonb))
    end
    from verdict
  $function$;

create or replace FUNCTION public.reconcile_undo_direct_placement(p_result jsonb, p_source jsonb)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
    with u as (select (select auth.uid()) as id),
    acct as (
      select exists (select 1 from app.accounts a, u where a.user_id = u.id) as ok,
             exists (select 1 from app.accounts a, u
                      where a.user_id = u.id and a.deletion_requested_at is not null) as deleting
    ),
    k as (
      select (jsonb_typeof(p_result) = 'object' and jsonb_typeof(p_source) = 'object') as shaped,
             (p_result ->> 'id')::uuid as rid, (p_source ->> 'id')::uuid as sid,
             (p_source ->> 'scratch_bit_id')::uuid as scid, null::uuid as cid,
             (p_result ->> 'parent_id')::uuid as pid, jsonb_exists(p_result, 'level') as isnode
    ),
    rn as (select n.* from app.nodes n, u, k where n.user_id = u.id and n.id = k.rid),
    rb as (select b.* from app.bits b, u, k where b.user_id = u.id and b.id = k.rid),
    src as (select r.* from app.scratch_breakdowns r, u, k where r.user_id = u.id and r.id = k.sid),
    sc as (select b.* from app.bits b, u, k where b.user_id = u.id and b.id = k.scid),
    cand as (select c.* from app.staged_candidates c, u, k where c.user_id = u.id and c.id = k.cid),
    bysrc as (select c.* from app.staged_candidates c, u, k where c.user_id = u.id and c.source_breakdown_id = k.sid),
    kids as (
      select (exists (select 1 from app.nodes n, u, k where n.user_id = u.id and n.parent_id = k.rid)
           or exists (select 1 from app.bits b, u, k where b.user_id = u.id and b.parent_id = k.rid)
           or exists (select 1 from app.chunks c, u, k where c.user_id = u.id and c.parent_id = k.rid)) as any
    ),
    par as (select (k.pid is null or exists (select 1 from app.nodes n, u where n.user_id = u.id and n.id = k.pid)) as ok from k),
    act as (
      select exists (
        select 1 from sc join app.nodes n on n.user_id = sc.user_id and n.id = sc.parent_id
         where sc.deleted_at is null and sc.archived_at is null
           and n.system_role = 'inbox' and n.deleted_at is null and n.archived_at is null
      ) as ok
    ),
    snap as (
      select coalesce(
        (p_result ->> 'version')::integer = 1 and (p_result -> 'created_at') = (p_result -> 'mtime')
        and (p_result ->> 'deleted_at') is null and (p_result ->> 'archived_at') is null
        and (not k.isnode or ((p_result ->> 'system_role') is null and (p_result ->> 'hidden_from_grid')::boolean = false))
        and (p_source -> 'consumed_at') = (p_result -> 'created_at'), false) as ok
      from k
    ),
    post as (
      select coalesce(
        not exists (select 1 from rn) and not exists (select 1 from rb) and not kids.any
        and exists (select 1 from src where (to_jsonb(src) - 'user_id') = ((p_source - 'user_id')
              || jsonb_build_object('consumed_at', null, 'version', (p_source ->> 'version')::integer + 1)))
        and not exists (select 1 from bysrc), false) as ok
      from kids
    ),
    pre as (
      select coalesce(
        snap.ok and not kids.any and par.ok
        and exists (select 1 from src where (to_jsonb(src) - 'user_id') = (p_source - 'user_id'))
        and (case when k.isnode then exists (select 1 from rn where (to_jsonb(rn) - 'user_id') = (p_result - 'user_id')) and not exists (select 1 from rb)
                  else exists (select 1 from rb where (to_jsonb(rb) - 'user_id') = (p_result - 'user_id')) and not exists (select 1 from rn) end)
        and not exists (select 1 from bysrc), false) as ok
      from k, snap, kids, par
    ),
    verdict as (
      select case
        when not acct.ok then 'account_missing'
        when acct.deleting then 'account_deleting'
        when not k.shaped or k.rid is null or k.sid is null or k.scid is null then 'conflict'
        when post.ok then 'already_applied'
        when not act.ok then 'rejected'
        when pre.ok then 'not_applied'
        else 'conflict'
      end as s
      from acct, k, post, act, pre
    )
    select case when verdict.s in ('account_missing', 'account_deleting')
      then jsonb_build_object('status', 'rejected', 'result', null, 'changes', '{}'::jsonb,
                              'rejection', jsonb_build_object('code', verdict.s))
      else jsonb_build_object('status', verdict.s, 'result', null, 'changes', coalesce((select jsonb_object_agg(t.k, t.v) from (values
        ('nodes', case when exists (select 1 from rn) then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(rn)) from rn), 'deleted', '[]'::jsonb) end),
        ('bits', case when exists (select 1 from sc union all select 1 from rb)
           then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(w)) from (select * from sc union select * from rb) w), 'deleted', '[]'::jsonb) end),
        ('scratch_breakdowns', case when exists (select 1 from src) then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(src)) from src), 'deleted', '[]'::jsonb) end),
        ('staged_candidates', case when exists (select 1 from cand union all select 1 from bysrc)
           then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(x)) from (select * from cand union select * from bysrc) x), 'deleted', '[]'::jsonb) end)
      ) as t(k, v) where t.v is not null), '{}'::jsonb))
        || case when verdict.s = 'rejected' then jsonb_build_object('rejection', jsonb_build_object('code', 'invalid_target')) else '{}'::jsonb end
    end
    from verdict
  $function$;

create or replace FUNCTION public.reconcile_undo_staged_placement(p_result jsonb, p_source jsonb, p_candidate jsonb)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
    with u as (select (select auth.uid()) as id),
    acct as (
      select exists (select 1 from app.accounts a, u where a.user_id = u.id) as ok,
             exists (select 1 from app.accounts a, u
                      where a.user_id = u.id and a.deletion_requested_at is not null) as deleting
    ),
    k as (
      select (jsonb_typeof(p_result) = 'object' and jsonb_typeof(p_source) = 'object' and jsonb_typeof(p_candidate) = 'object') as shaped,
             (p_result ->> 'id')::uuid as rid, (p_source ->> 'id')::uuid as sid,
             (p_source ->> 'scratch_bit_id')::uuid as scid, (p_candidate ->> 'id')::uuid as cid,
             (p_result ->> 'parent_id')::uuid as pid, jsonb_exists(p_result, 'level') as isnode
    ),
    rn as (select n.* from app.nodes n, u, k where n.user_id = u.id and n.id = k.rid),
    rb as (select b.* from app.bits b, u, k where b.user_id = u.id and b.id = k.rid),
    src as (select r.* from app.scratch_breakdowns r, u, k where r.user_id = u.id and r.id = k.sid),
    sc as (select b.* from app.bits b, u, k where b.user_id = u.id and b.id = k.scid),
    cand as (select c.* from app.staged_candidates c, u, k where c.user_id = u.id and c.id = k.cid),
    bysrc as (select c.* from app.staged_candidates c, u, k where c.user_id = u.id and c.source_breakdown_id = k.sid),
    kids as (
      select (exists (select 1 from app.nodes n, u, k where n.user_id = u.id and n.parent_id = k.rid)
           or exists (select 1 from app.bits b, u, k where b.user_id = u.id and b.parent_id = k.rid)
           or exists (select 1 from app.chunks c, u, k where c.user_id = u.id and c.parent_id = k.rid)) as any
    ),
    par as (select (k.pid is null or exists (select 1 from app.nodes n, u where n.user_id = u.id and n.id = k.pid)) as ok from k),
    act as (
      select exists (
        select 1 from sc join app.nodes n on n.user_id = sc.user_id and n.id = sc.parent_id
         where sc.deleted_at is null and sc.archived_at is null
           and n.system_role = 'inbox' and n.deleted_at is null and n.archived_at is null
      ) as ok
    ),
    snap as (
      select coalesce(
        (p_result ->> 'version')::integer = 1 and (p_result -> 'created_at') = (p_result -> 'mtime')
        and (p_result ->> 'deleted_at') is null and (p_result ->> 'archived_at') is null
        and (not k.isnode or ((p_result ->> 'system_role') is null and (p_result ->> 'hidden_from_grid')::boolean = false))
        and (p_source -> 'consumed_at') = (p_result -> 'created_at')
        and (p_candidate ->> 'scratch_bit_id') = (p_source ->> 'scratch_bit_id')
        and (p_candidate ->> 'source_breakdown_id') = (p_source ->> 'id')
        and (p_candidate ->> 'result_type') = case when k.isnode then 'node' else 'bit' end
        and (p_candidate ->> 'lifecycle') = 'staged', false) as ok
      from k
    ),
    post as (
      select coalesce(
        not exists (select 1 from rn) and not exists (select 1 from rb) and not kids.any
        and exists (select 1 from src where (to_jsonb(src) - 'user_id') = ((p_source - 'user_id')
              || jsonb_build_object('consumed_at', null, 'version', (p_source ->> 'version')::integer + 1)))
        and exists (select 1 from cand, bysrc where bysrc.id = cand.id and cand.updated_at >= cand.created_at
              and (to_jsonb(cand) - 'user_id' - 'updated_at') = ((p_candidate - 'user_id' - 'updated_at')
                  || jsonb_build_object('version', (p_candidate ->> 'version')::integer + 1))), false) as ok
      from kids
    ),
    pre as (
      select coalesce(
        snap.ok and not kids.any and par.ok
        and exists (select 1 from src where (to_jsonb(src) - 'user_id') = (p_source - 'user_id'))
        and (case when k.isnode then exists (select 1 from rn where (to_jsonb(rn) - 'user_id') = (p_result - 'user_id')) and not exists (select 1 from rb)
                  else exists (select 1 from rb where (to_jsonb(rb) - 'user_id') = (p_result - 'user_id')) and not exists (select 1 from rn) end)
        and not exists (select 1 from cand) and not exists (select 1 from bysrc), false) as ok
      from k, snap, kids, par
    ),
    verdict as (
      select case
        when not acct.ok then 'account_missing'
        when acct.deleting then 'account_deleting'
        when not k.shaped or k.rid is null or k.sid is null or k.scid is null or k.cid is null then 'conflict'
        when post.ok then 'already_applied'
        when not act.ok then 'rejected'
        when pre.ok then 'not_applied'
        else 'conflict'
      end as s
      from acct, k, post, act, pre
    )
    select case when verdict.s in ('account_missing', 'account_deleting')
      then jsonb_build_object('status', 'rejected', 'result', null, 'changes', '{}'::jsonb,
                              'rejection', jsonb_build_object('code', verdict.s))
      else jsonb_build_object('status', verdict.s, 'result', null, 'changes', coalesce((select jsonb_object_agg(t.k, t.v) from (values
        ('nodes', case when exists (select 1 from rn) then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(rn)) from rn), 'deleted', '[]'::jsonb) end),
        ('bits', case when exists (select 1 from sc union all select 1 from rb)
           then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(w)) from (select * from sc union select * from rb) w), 'deleted', '[]'::jsonb) end),
        ('scratch_breakdowns', case when exists (select 1 from src) then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(src)) from src), 'deleted', '[]'::jsonb) end),
        ('staged_candidates', case when exists (select 1 from cand union all select 1 from bysrc)
           then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(x)) from (select * from cand union select * from bysrc) x), 'deleted', '[]'::jsonb) end)
      ) as t(k, v) where t.v is not null), '{}'::jsonb))
        || case when verdict.s = 'rejected' then jsonb_build_object('rejection', jsonb_build_object('code', 'invalid_target')) else '{}'::jsonb end
    end
    from verdict
  $function$;

create or replace FUNCTION public.reconcile_unstage_candidate(p_candidate_id uuid, p_candidate_expected_version integer, p_source_id uuid, p_source_expected_version integer)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
    with u as (select (select auth.uid()) as id),
    acct as (
      select exists (select 1 from app.accounts a, u where a.user_id = u.id) as ok,
             exists (select 1 from app.accounts a, u
                      where a.user_id = u.id and a.deletion_requested_at is not null) as deleting
    ),
    src as (select r.* from app.scratch_breakdowns r, u where r.user_id = u.id and r.id = p_source_id),
    cand as (select c.* from app.staged_candidates c, u where c.user_id = u.id and c.id = p_candidate_id),
    bysrc as (select c.* from app.staged_candidates c, u where c.user_id = u.id and c.source_breakdown_id = p_source_id),
    verdict as (
      select case
        when not acct.ok then 'account_missing'
        when acct.deleting then 'account_deleting'
        when p_candidate_id is null or p_candidate_expected_version is null or p_source_id is null
             or p_source_expected_version is null then 'conflict'
        when not exists (select 1 from cand) and not exists (select 1 from bysrc)
             and exists (select 1 from src where src.consumed_at is null and src.version = p_source_expected_version + 1) then 'already_applied'
        when exists (select 1 from cand, bysrc, src where bysrc.id = cand.id and cand.source_breakdown_id = p_source_id
                       and cand.lifecycle = 'staged' and cand.version = p_candidate_expected_version
                       and src.scratch_bit_id = cand.scratch_bit_id and src.consumed_at is null
                       and src.version = p_source_expected_version) then 'not_applied'
        else 'conflict'
      end as s
      from acct
    )
    select case when verdict.s in ('account_missing', 'account_deleting')
      then jsonb_build_object('status', 'rejected', 'result', null, 'changes', '{}'::jsonb,
                              'rejection', jsonb_build_object('code', verdict.s))
      else jsonb_build_object('status', verdict.s, 'result', null, 'changes', coalesce((select jsonb_object_agg(t.k, t.v) from (values
        ('scratch_breakdowns', case when exists (select 1 from src) then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(src)) from src), 'deleted', '[]'::jsonb) end),
        ('staged_candidates', case when exists (select 1 from cand union all select 1 from bysrc)
           then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(x)) from (select * from cand union select * from bysrc) x), 'deleted', '[]'::jsonb) end)
      ) as t(k, v) where t.v is not null), '{}'::jsonb))
    end
    from verdict
  $function$;

create or replace FUNCTION public.reorder_chunks(p_bit_id uuid, p_chunk_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := internal.uid();
  v_ids uuid[];
  v_rows jsonb;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not exists (select 1 from app.accounts where user_id = v_user) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_missing'));
  end if;
  if exists (select 1 from app.accounts where user_id = v_user and deletion_requested_at is not null) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_deleting'));
  end if;
  perform 1 from app.bits where id = p_bit_id and user_id = v_user for update;
  if not found then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;
  select coalesce(array_agg(id order by id), '{}') into v_ids
    from app.chunks where user_id = v_user and parent_id = p_bit_id;
  if p_chunk_ids is null or array_position(p_chunk_ids, null) is not null
     or (select coalesce(array_agg(i order by i), '{}') from unnest(p_chunk_ids) i) is distinct from v_ids then
    -- The current Chunks of the Bit, and the listed ids that are not among them as deleted, so a
    -- stale tab converges.
    select coalesce(jsonb_agg(to_jsonb(c.*) order by c."order", c.id), '[]'::jsonb) into v_rows
      from app.chunks c where c.user_id = v_user and c.parent_id = p_bit_id;
    return internal.envelope(
      'rejected', null,
      jsonb_build_object('chunks', jsonb_build_object(
        'upserted', v_rows,
        'deleted', coalesce((
          select jsonb_agg(distinct i) from unnest(coalesce(p_chunk_ids, '{}')) i
           where i is not null and i <> all (v_ids)
        ), '[]'::jsonb)
      )),
      jsonb_build_object('code', 'invalid_input')
    );
  end if;

  with wanted as (
    select id, (ord - 1)::integer as new_order from unnest(p_chunk_ids) with ordinality as t(id, ord)
  ), upd as (
    update app.chunks c set "order" = w.new_order
      from wanted w where c.id = w.id and c.user_id = v_user and c."order" <> w.new_order
    returning to_jsonb(c.*) as j
  )
  select coalesce(jsonb_agg(j), '[]'::jsonb) into v_rows from upd;
  return internal.envelope('applied', null, internal.changes('[]', '[]', v_rows));
end
$function$;

create or replace FUNCTION public.restore_bit(p_id uuid, p_reserved_cells jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := internal.uid();
  v_now bigint := internal.now_ms();
  v_bit app.bits;
  v_parent uuid;
  v_attempt integer;
  v_out jsonb;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not internal.valid_reserved_cells(p_reserved_cells) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'invalid_input'));
  end if;
  if not exists (select 1 from app.accounts where user_id = v_user) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_missing'));
  end if;
  if exists (select 1 from app.accounts where user_id = v_user and deletion_requested_at is not null) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_deleting'));
  end if;

  -- Lock the tree of the Bit's parent; a Bit that moved meanwhile is locked through its new one.
  for v_attempt in 1 .. 3 loop
    select parent_id into v_parent from app.bits where id = p_id and user_id = v_user;
    if not found then
      return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
    end if;
    perform internal.lock_restore(v_user, v_parent, true);
    select * into v_bit from app.bits where id = p_id and user_id = v_user;
    if not found then
      return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
    end if;
    exit when v_bit.parent_id = v_parent;
    if v_attempt = 3 then
      raise exception 'could not settle the lock set of Bit %', p_id using errcode = '40001';
    end if;
  end loop;
  perform 1 from app.bits where id = p_id and user_id = v_user for update;
  select * into v_bit from app.bits where id = p_id and user_id = v_user;
  if v_bit.deleted_at is null then
    return internal.envelope('applied', jsonb_build_object('id', p_id),
                             internal.changes('[]', internal.bit_rows(v_user, array[p_id])));
  end if;

  v_out := internal.restore_tree(v_user, v_parent, true, p_reserved_cells, v_now, p_id);
  if v_out ? 'rejection' then
    return internal.envelope('rejected', null, internal.changes('[]', internal.bit_rows(v_user, array[p_id])),
                             jsonb_build_object('code', v_out ->> 'rejection'));
  end if;
  return internal.envelope('applied', jsonb_build_object('id', p_id),
    internal.changes(
      internal.node_rows(v_user, array(select value::uuid from jsonb_array_elements_text(v_out -> 'nodes'))),
      internal.bit_rows(v_user, array(select value::uuid from jsonb_array_elements_text(v_out -> 'bits')))));
end
$function$;

create or replace FUNCTION public.restore_node(p_id uuid, p_reserved_cells jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := internal.uid();
  v_now bigint := internal.now_ms();
  v_node app.nodes;
  v_out jsonb;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not internal.valid_reserved_cells(p_reserved_cells) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'invalid_input'));
  end if;
  if not exists (select 1 from app.accounts where user_id = v_user) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_missing'));
  end if;
  if exists (select 1 from app.accounts where user_id = v_user and deletion_requested_at is not null) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_deleting'));
  end if;
  select * into v_node from app.nodes where id = p_id and user_id = v_user;
  if not found then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;

  perform internal.lock_restore(v_user, p_id, true);
  select * into v_node from app.nodes where id = p_id and user_id = v_user;
  if not found then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;
  if v_node.deleted_at is null then
    return internal.envelope('applied', jsonb_build_object('id', p_id),
                             internal.changes(internal.node_rows(v_user, array[p_id])));
  end if;

  v_out := internal.restore_tree(v_user, p_id, true, p_reserved_cells, v_now);
  if v_out ? 'rejection' then
    return internal.envelope('rejected', null, internal.changes(internal.node_rows(v_user, array[p_id])),
                             jsonb_build_object('code', v_out ->> 'rejection'));
  end if;
  return internal.envelope('applied', jsonb_build_object('id', p_id),
    internal.changes(
      internal.node_rows(v_user, array(select value::uuid from jsonb_array_elements_text(v_out -> 'nodes'))),
      internal.bit_rows(v_user, array(select value::uuid from jsonb_array_elements_text(v_out -> 'bits')))));
end
$function$;

create or replace FUNCTION public.save_breakdown(p_id uuid, p_expected_version integer, p_base_content text, p_base_order integer, p_content text, p_order integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := internal.uid();
  v_scratch_id uuid;
  v_scratch app.bits;
  v_row app.scratch_breakdowns;
  v_cand app.staged_candidates;
  v_active boolean;
  v_new jsonb;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_id is null or p_expected_version is null or p_base_content is null or p_base_order is null
     or p_content is null or p_order is null then
    raise exception 'save_breakdown needs every argument' using errcode = '22023';
  end if;
  if not exists (select 1 from app.accounts where user_id = v_user) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_missing'));
  end if;
  if exists (select 1 from app.accounts where user_id = v_user and deletion_requested_at is not null) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_deleting'));
  end if;

  select scratch_bit_id into v_scratch_id from app.scratch_breakdowns where id = p_id and user_id = v_user;
  if v_scratch_id is null then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;
  v_scratch := internal.lock_bit_and_node(v_user, v_scratch_id);
  if v_scratch.id is null then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;
  select * into v_row from app.scratch_breakdowns where id = p_id and user_id = v_user for update;
  if v_row.scratch_bit_id is distinct from v_scratch_id and v_row.id is not null then
    -- The id was deleted and added again under another Scratch between the unlocked read and the lock.
    raise exception 'could not settle the lock set of Breakdown %', p_id using errcode = '40001';
  end if;
  if v_row.id is null then
    return internal.envelope('rejected', null, internal.inbox_changes(jsonb_build_array(to_jsonb(v_scratch))),
                             jsonb_build_object('code', 'not_found'));
  end if;
  select * into v_cand from app.staged_candidates where source_breakdown_id = p_id and user_id = v_user;
  v_active := internal.active_inbox_scratch(v_user, v_scratch);

  if v_active and v_cand.id is null and v_row.consumed_at is null and v_row.version = p_expected_version + 1
     and v_row.content = p_content and v_row."order" = p_order then
    return internal.envelope('already_applied', jsonb_build_object('id', p_id),
                             internal.inbox_changes(jsonb_build_array(to_jsonb(v_scratch)), jsonb_build_array(to_jsonb(v_row))));
  end if;
  if not v_active or v_cand.id is not null or v_row.consumed_at is not null then
    return internal.envelope('rejected', null,
                             internal.inbox_changes(jsonb_build_array(to_jsonb(v_scratch)), jsonb_build_array(to_jsonb(v_row)),
                                                    case when v_cand.id is null then '[]' else jsonb_build_array(to_jsonb(v_cand)) end),
                             jsonb_build_object('code', 'invalid_target'));
  end if;
  if p_base_content = p_content and p_base_order = p_order then
    return internal.envelope('rejected', null,
                             internal.inbox_changes(jsonb_build_array(to_jsonb(v_scratch)), jsonb_build_array(to_jsonb(v_row))),
                             jsonb_build_object('code', 'invalid_input'));
  end if;
  if v_row.version <> p_expected_version or v_row.content <> p_base_content or v_row."order" <> p_base_order then
    return internal.envelope('conflict', null,
                             internal.inbox_changes(jsonb_build_array(to_jsonb(v_scratch)), jsonb_build_array(to_jsonb(v_row))));
  end if;

  update app.scratch_breakdowns set content = p_content, "order" = p_order, version = version + 1
   where id = p_id and user_id = v_user
  returning to_jsonb(app.scratch_breakdowns.*) into v_new;
  return internal.envelope('applied', jsonb_build_object('id', p_id),
                           internal.inbox_changes(jsonb_build_array(to_jsonb(v_scratch)), jsonb_build_array(v_new)));
end
$function$;

create or replace FUNCTION public.save_scratch_title(p_scratch_id uuid, p_expected_version integer, p_base_title text, p_title text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := internal.uid();
  v_now bigint := internal.now_ms();
  v_scratch app.bits;
  v_active boolean;
  v_bit jsonb;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_scratch_id is null or p_expected_version is null or p_base_title is null or p_title is null then
    raise exception 'save_scratch_title needs every argument' using errcode = '22023';
  end if;
  if not exists (select 1 from app.accounts where user_id = v_user) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_missing'));
  end if;
  if exists (select 1 from app.accounts where user_id = v_user and deletion_requested_at is not null) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_deleting'));
  end if;

  v_scratch := internal.lock_bit_and_node(v_user, p_scratch_id);
  if v_scratch.id is null then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;
  v_active := internal.active_inbox_scratch(v_user, v_scratch);

  if v_active and v_scratch.title = p_title and v_scratch.version = p_expected_version + 1 then
    return internal.envelope('already_applied', jsonb_build_object('id', p_scratch_id),
                             internal.inbox_changes(jsonb_build_array(to_jsonb(v_scratch))));
  end if;
  if not v_active then
    return internal.envelope('rejected', null, internal.inbox_changes(jsonb_build_array(to_jsonb(v_scratch))),
                             jsonb_build_object('code', 'invalid_target'));
  end if;
  if p_base_title = p_title then
    return internal.envelope('rejected', null, internal.inbox_changes(jsonb_build_array(to_jsonb(v_scratch))),
                             jsonb_build_object('code', 'invalid_input'));
  end if;
  if v_scratch.version <> p_expected_version or v_scratch.title <> p_base_title then
    return internal.envelope('conflict', null, internal.inbox_changes(jsonb_build_array(to_jsonb(v_scratch))));
  end if;

  update app.bits set title = p_title, mtime = v_now, version = version + 1
   where id = p_scratch_id and user_id = v_user
  returning to_jsonb(app.bits.*) into v_bit;
  return internal.envelope('applied', jsonb_build_object('id', p_scratch_id),
                           internal.inbox_changes(jsonb_build_array(v_bit)));
end
$function$;

create or replace FUNCTION public.soft_delete_bit(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := internal.uid();
  v_now bigint := internal.now_ms();
  v_bit app.bits;
  v_parent app.nodes;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not exists (select 1 from app.accounts where user_id = v_user) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_missing'));
  end if;
  if exists (select 1 from app.accounts where user_id = v_user and deletion_requested_at is not null) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_deleting'));
  end if;
  v_bit := internal.lock_bit_and_node(v_user, p_id);
  if v_bit.id is null then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;
  select * into v_parent from app.nodes where id = v_bit.parent_id and user_id = v_user;
  if v_parent.system_role = 'inbox' then
    return internal.envelope('rejected', null, internal.changes(internal.node_rows(v_user, array[v_parent.id]),
                             internal.bit_rows(v_user, array[p_id])), jsonb_build_object('code', 'invalid_target'));
  end if;
  if v_bit.deleted_at is not null then
    return internal.envelope('applied', jsonb_build_object('id', p_id),
                             internal.changes('[]', internal.bit_rows(v_user, array[p_id])));
  end if;

  update app.bits set deleted_at = v_now, version = version + 1 where id = p_id and user_id = v_user;
  update app.nodes set mtime = v_now where id = v_parent.id and user_id = v_user;
  return internal.envelope('applied', jsonb_build_object('id', p_id),
                           internal.changes(internal.node_rows(v_user, array[v_parent.id]),
                                            internal.bit_rows(v_user, array[p_id])));
end
$function$;

create or replace FUNCTION public.soft_delete_node(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := internal.uid();
  v_now bigint := internal.now_ms();
  v_node app.nodes;
  v_subtree uuid[];
  v_nodes uuid[];
  v_bits uuid[];
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not exists (select 1 from app.accounts where user_id = v_user) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_missing'));
  end if;
  if exists (select 1 from app.accounts where user_id = v_user and deletion_requested_at is not null) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_deleting'));
  end if;
  select * into v_node from app.nodes where id = p_id and user_id = v_user;
  if not found then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;
  if v_node.system_role is not null then
    return internal.envelope('rejected', null, internal.changes(internal.node_rows(v_user, array[p_id])),
                             jsonb_build_object('code', 'invalid_target'));
  end if;

  perform internal.lock_tree(v_user, p_id, false);
  select * into v_node from app.nodes where id = p_id and user_id = v_user;
  if not found then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;
  if v_node.deleted_at is not null then
    return internal.envelope('applied', jsonb_build_object('id', p_id),
                             internal.changes(internal.node_rows(v_user, array[p_id])));
  end if;

  v_subtree := internal.subtree_ids(v_user, p_id);
  with changed as (
    update app.nodes set deleted_at = v_now, version = version + 1
     where user_id = v_user and id = any (v_subtree) and deleted_at is null
    returning id
  ) select coalesce(array_agg(id), '{}') into v_nodes from changed;
  with changed as (
    update app.bits set deleted_at = v_now, version = version + 1
     where user_id = v_user and parent_id = any (v_subtree) and deleted_at is null
    returning id
  ) select coalesce(array_agg(id), '{}') into v_bits from changed;
  if v_node.parent_id is not null then
    update app.nodes set mtime = v_now where id = v_node.parent_id and user_id = v_user;
    v_nodes := v_nodes || v_node.parent_id;
  end if;

  return internal.envelope('applied', jsonb_build_object('id', p_id),
                           internal.changes(internal.node_rows(v_user, v_nodes), internal.bit_rows(v_user, v_bits)));
end
$function$;

create or replace FUNCTION public.stage_candidate(p_candidate_id uuid, p_scratch_id uuid, p_source_id uuid, p_source_expected_version integer, p_result_type text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := internal.uid();
  v_now bigint := internal.now_ms();
  v_scratch app.bits;
  v_src app.scratch_breakdowns;
  v_cur app.staged_candidates;
  v_by_src app.staged_candidates;
  v_cands jsonb;
  v_active boolean;
  v_cand jsonb;
  v_new jsonb;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_candidate_id is null or p_scratch_id is null or p_source_id is null or p_source_expected_version is null
     or p_result_type is null or p_result_type not in ('node', 'bit') then
    raise exception 'stage_candidate needs every argument and a node or bit result type' using errcode = '22023';
  end if;
  if not exists (select 1 from app.accounts where user_id = v_user) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_missing'));
  end if;
  if exists (select 1 from app.accounts where user_id = v_user and deletion_requested_at is not null) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_deleting'));
  end if;

  v_scratch := internal.lock_bit_and_node(v_user, p_scratch_id);
  if v_scratch.id is null then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;
  -- Task 223: a Scratch that is not an active Inbox Scratch is refused before the source row is
  -- locked, so a placement (Inbox -> Scratch -> source row -> target Grid) cannot meet this call
  -- on the other side of a lock cycle. Unlocked reads, no write.
  if not internal.active_inbox_scratch(v_user, v_scratch) then
    select * into v_src from app.scratch_breakdowns where id = p_source_id and user_id = v_user;
    select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb) into v_cands
      from app.staged_candidates c
     where c.user_id = v_user and (c.id = p_candidate_id or c.source_breakdown_id = p_source_id);
    return internal.envelope('rejected', null,
                             internal.inbox_changes(jsonb_build_array(to_jsonb(v_scratch)),
                                                    case when v_src.id is null then '[]'::jsonb else jsonb_build_array(to_jsonb(v_src)) end, v_cands),
                             jsonb_build_object('code', 'invalid_target'));
  end if;
  select * into v_src from app.scratch_breakdowns where id = p_source_id and user_id = v_user for update;
  if v_src.id is null then
    return internal.envelope('rejected', null, internal.inbox_changes(jsonb_build_array(to_jsonb(v_scratch))),
                             jsonb_build_object('code', 'not_found'));
  end if;
  select * into v_cur from app.staged_candidates where id = p_candidate_id and user_id = v_user;
  select * into v_by_src from app.staged_candidates where source_breakdown_id = p_source_id and user_id = v_user;
  v_active := internal.active_inbox_scratch(v_user, v_scratch);
  select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb) into v_cands
    from app.staged_candidates c
   where c.user_id = v_user and (c.id = p_candidate_id or c.source_breakdown_id = p_source_id);

  if v_active and v_cur.id is not null and v_by_src.id = v_cur.id
     and v_cur.scratch_bit_id = p_scratch_id and v_cur.source_breakdown_id = p_source_id
     and v_cur.result_type = p_result_type and v_cur.lifecycle = 'staged' and v_cur.version = 1
     and v_cur.created_at = v_cur.updated_at
     and v_src.scratch_bit_id = p_scratch_id and v_src.consumed_at is null
     and v_src.version = p_source_expected_version + 1 then
    return internal.envelope('already_applied', jsonb_build_object('id', p_candidate_id),
                             internal.inbox_changes(jsonb_build_array(to_jsonb(v_scratch)), jsonb_build_array(to_jsonb(v_src)), v_cands));
  end if;
  if not v_active or v_src.scratch_bit_id <> p_scratch_id or v_src.consumed_at is not null then
    return internal.envelope('rejected', null,
                             internal.inbox_changes(jsonb_build_array(to_jsonb(v_scratch)), jsonb_build_array(to_jsonb(v_src)), v_cands),
                             jsonb_build_object('code', 'invalid_target'));
  end if;
  if v_cur.id is not null then
    return internal.envelope('conflict', null,
                             internal.inbox_changes(jsonb_build_array(to_jsonb(v_scratch)), jsonb_build_array(to_jsonb(v_src)), v_cands));
  end if;
  if v_by_src.id is not null then
    return internal.envelope('rejected', null,
                             internal.inbox_changes(jsonb_build_array(to_jsonb(v_scratch)), jsonb_build_array(to_jsonb(v_src)), v_cands),
                             jsonb_build_object('code', 'invalid_target'));
  end if;
  if v_src.version <> p_source_expected_version then
    return internal.envelope('conflict', null,
                             internal.inbox_changes(jsonb_build_array(to_jsonb(v_scratch)), jsonb_build_array(to_jsonb(v_src))));
  end if;

  insert into app.staged_candidates (id, user_id, scratch_bit_id, source_breakdown_id, result_type, lifecycle, created_at, updated_at, version)
  values (p_candidate_id, v_user, p_scratch_id, p_source_id, p_result_type, 'staged', v_now, v_now, 1)
  returning to_jsonb(app.staged_candidates.*) into v_cand;
  update app.scratch_breakdowns set version = version + 1 where id = p_source_id and user_id = v_user
  returning to_jsonb(app.scratch_breakdowns.*) into v_new;

  return internal.envelope('applied', jsonb_build_object('id', p_candidate_id),
                           internal.inbox_changes('[]', jsonb_build_array(v_new), jsonb_build_array(v_cand)));
end
$function$;

create or replace FUNCTION public.trash_scratch(p_scratch_id uuid, p_expected_version integer, p_candidates jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := internal.uid();
  v_now bigint := internal.now_ms();
  v_scratch app.bits;
  v_inbox uuid;
  v_inbox_active boolean;
  v_items jsonb;
  v_cids uuid[];
  v_sids uuid[];
  v_cands integer;
  v_post boolean;
  v_pre boolean;
  v_srcs jsonb;
  v_new_scratch jsonb;
  v_new_inbox jsonb;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_scratch_id is null or p_expected_version is null or p_candidates is null
     or jsonb_typeof(p_candidates) <> 'array' then
    raise exception 'trash_scratch needs every argument and an array of candidates' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_candidates) e
     where jsonb_typeof(e) <> 'object'
        or not (e ?& array['candidate_id', 'candidate_expected_version', 'source_breakdown_id', 'source_expected_version'])
        or jsonb_typeof(e -> 'candidate_id') <> 'string' or jsonb_typeof(e -> 'source_breakdown_id') <> 'string'
        or (e ->> 'candidate_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        or (e ->> 'source_breakdown_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        or jsonb_typeof(e -> 'candidate_expected_version') <> 'number' or jsonb_typeof(e -> 'source_expected_version') <> 'number'
        or (e ->> 'candidate_expected_version') !~ '^[1-9][0-9]{0,8}$' or (e ->> 'source_expected_version') !~ '^[1-9][0-9]{0,8}$'
  ) then
    raise exception 'trash_scratch candidates are malformed' using errcode = '22023';
  end if;
  select coalesce(array_agg((e ->> 'candidate_id')::uuid), '{}'), coalesce(array_agg((e ->> 'source_breakdown_id')::uuid), '{}')
    into v_cids, v_sids from jsonb_array_elements(p_candidates) e;
  if (select count(distinct x) from unnest(v_cids) x) <> cardinality(v_cids)
     or (select count(distinct x) from unnest(v_sids) x) <> cardinality(v_sids) then
    raise exception 'trash_scratch candidates must be a set' using errcode = '22023';
  end if;
  if not exists (select 1 from app.accounts where user_id = v_user) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_missing'));
  end if;
  if exists (select 1 from app.accounts where user_id = v_user and deletion_requested_at is not null) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_deleting'));
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'cid', (e ->> 'candidate_id')::uuid, 'cv', (e ->> 'candidate_expected_version')::integer,
           'sid', (e ->> 'source_breakdown_id')::uuid, 'sv', (e ->> 'source_expected_version')::integer)), '[]'::jsonb)
    into v_items from jsonb_array_elements(p_candidates) e;

  v_scratch := internal.lock_bit_and_node(v_user, p_scratch_id);
  select id into v_inbox from app.nodes where user_id = v_user and system_role = 'inbox';
  if v_scratch.id is not null and (v_inbox is null or v_scratch.parent_id <> v_inbox) then
    -- Not a child of the Inbox Node: nothing else is locked, and the postcondition cannot hold.
    return internal.envelope('rejected', null, internal.trash_view(v_user, p_scratch_id, v_sids),
                             jsonb_build_object('code', 'invalid_target'));
  end if;

  -- Source rows of this Scratch that are named or staged, by id (SCHEMA §Locks); the Scratch lock
  -- already keeps every other command on this Scratch out.
  perform 1 from app.scratch_breakdowns r
   where r.user_id = v_user and r.scratch_bit_id = p_scratch_id
     and (r.id = any (v_sids) or r.id in (select c.source_breakdown_id from app.staged_candidates c
                                           where c.user_id = v_user and c.scratch_bit_id = p_scratch_id))
   order by r.id for update;

  select count(*) into v_cands from app.staged_candidates where user_id = v_user and scratch_bit_id = p_scratch_id;
  select coalesce(v_inbox is not null and exists (select 1 from app.nodes n where n.user_id = v_user and n.id = v_inbox
                    and n.deleted_at is null and n.archived_at is null), false) into v_inbox_active;

  v_post := v_scratch.id is not null and v_scratch.deleted_at is not null and v_scratch.archived_at is null
    and v_scratch.version = p_expected_version + 1
    and not exists (
      select 1 from jsonb_to_recordset(v_items) as i(cid uuid, cv integer, sid uuid, sv integer)
       where exists (select 1 from app.staged_candidates c where c.user_id = v_user and c.scratch_bit_id = p_scratch_id and c.id = i.cid)
          or not exists (select 1 from app.scratch_breakdowns r where r.user_id = v_user and r.id = i.sid
                          and r.scratch_bit_id = p_scratch_id and r.consumed_at is null and r.version = i.sv + 1)
    );
  if v_post then
    return internal.envelope('already_applied', jsonb_build_object('id', p_scratch_id),
                             internal.trash_view(v_user, p_scratch_id, v_sids));
  end if;

  v_pre := v_scratch.id is not null and v_inbox_active and v_scratch.deleted_at is null and v_scratch.archived_at is null
    and v_scratch.version = p_expected_version and v_cands = cardinality(v_cids)
    and not exists (
      select 1 from jsonb_to_recordset(v_items) as i(cid uuid, cv integer, sid uuid, sv integer)
       where not exists (
         select 1 from app.staged_candidates c join app.scratch_breakdowns r on r.user_id = c.user_id and r.id = i.sid
          where c.user_id = v_user and c.scratch_bit_id = p_scratch_id and c.id = i.cid and c.version = i.cv
            and c.source_breakdown_id = i.sid and r.scratch_bit_id = p_scratch_id and r.consumed_at is null and r.version = i.sv)
    );
  if not v_pre then
    return internal.envelope('conflict', null, internal.trash_view(v_user, p_scratch_id, v_sids));
  end if;

  delete from app.staged_candidates where user_id = v_user and scratch_bit_id = p_scratch_id and id = any (v_cids);
  with up as (
    update app.scratch_breakdowns set version = version + 1
     where user_id = v_user and id = any (v_sids) returning *
  ) select coalesce(jsonb_agg(to_jsonb(up) order by up.id), '[]'::jsonb) into v_srcs from up;
  update app.bits set deleted_at = v_now, mtime = v_now, version = version + 1
   where id = p_scratch_id and user_id = v_user returning to_jsonb(app.bits.*) into v_new_scratch;
  update app.nodes set mtime = v_now where id = v_inbox and user_id = v_user returning to_jsonb(app.nodes.*) into v_new_inbox;

  return internal.envelope('applied', jsonb_build_object('id', p_scratch_id),
                           internal.inbox_changes(p_bits => jsonb_build_array(v_new_scratch), p_breakdowns => v_srcs,
                                                  p_deleted_candidates => v_cids, p_nodes => jsonb_build_array(v_new_inbox)));
end
$function$;

create or replace FUNCTION public.unarchive_bit(p_id uuid, p_reserved_cells jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := internal.uid();
  v_now bigint := internal.now_ms();
  v_bit app.bits;
  v_parent uuid;
  v_attempt integer;
  v_out jsonb;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not internal.valid_reserved_cells(p_reserved_cells) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'invalid_input'));
  end if;
  if not exists (select 1 from app.accounts where user_id = v_user) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_missing'));
  end if;
  if exists (select 1 from app.accounts where user_id = v_user and deletion_requested_at is not null) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_deleting'));
  end if;

  for v_attempt in 1 .. 3 loop
    select parent_id into v_parent from app.bits where id = p_id and user_id = v_user;
    if not found then
      return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
    end if;
    perform internal.lock_restore(v_user, v_parent, false);
    select * into v_bit from app.bits where id = p_id and user_id = v_user;
    if not found then
      return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
    end if;
    exit when v_bit.parent_id = v_parent;
    if v_attempt = 3 then
      raise exception 'could not settle the lock set of Bit %', p_id using errcode = '40001';
    end if;
  end loop;
  if v_bit.archived_at is null then
    return internal.envelope('applied', jsonb_build_object('id', p_id),
                             internal.changes('[]', internal.bit_rows(v_user, array[p_id])));
  end if;

  v_out := internal.restore_tree(v_user, v_parent, false, p_reserved_cells, v_now, p_id);
  if v_out ? 'rejection' then
    return internal.envelope('rejected', null, internal.changes('[]', internal.bit_rows(v_user, array[p_id])),
                             jsonb_build_object('code', v_out ->> 'rejection'));
  end if;
  return internal.envelope('applied', jsonb_build_object('id', p_id),
    internal.changes(
      internal.node_rows(v_user, array(select value::uuid from jsonb_array_elements_text(v_out -> 'nodes'))),
      internal.bit_rows(v_user, array(select value::uuid from jsonb_array_elements_text(v_out -> 'bits')))));
end
$function$;

create or replace FUNCTION public.unarchive_node(p_id uuid, p_reserved_cells jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := internal.uid();
  v_now bigint := internal.now_ms();
  v_node app.nodes;
  v_out jsonb;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not internal.valid_reserved_cells(p_reserved_cells) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'invalid_input'));
  end if;
  if not exists (select 1 from app.accounts where user_id = v_user) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_missing'));
  end if;
  if exists (select 1 from app.accounts where user_id = v_user and deletion_requested_at is not null) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_deleting'));
  end if;
  select * into v_node from app.nodes where id = p_id and user_id = v_user;
  if not found then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;

  perform internal.lock_restore(v_user, p_id, false);
  select * into v_node from app.nodes where id = p_id and user_id = v_user;
  if not found then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;
  if v_node.archived_at is null then
    return internal.envelope('applied', jsonb_build_object('id', p_id),
                             internal.changes(internal.node_rows(v_user, array[p_id])));
  end if;

  v_out := internal.restore_tree(v_user, p_id, false, p_reserved_cells, v_now);
  if v_out ? 'rejection' then
    return internal.envelope('rejected', null, internal.changes(internal.node_rows(v_user, array[p_id])),
                             jsonb_build_object('code', v_out ->> 'rejection'));
  end if;
  return internal.envelope('applied', jsonb_build_object('id', p_id),
    internal.changes(
      internal.node_rows(v_user, array(select value::uuid from jsonb_array_elements_text(v_out -> 'nodes'))),
      internal.bit_rows(v_user, array(select value::uuid from jsonb_array_elements_text(v_out -> 'bits')))));
end
$function$;

create or replace FUNCTION public.unstage_candidate(p_candidate_id uuid, p_candidate_expected_version integer, p_source_id uuid, p_source_expected_version integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := internal.uid();
  v_scratch_id uuid;
  v_scratch app.bits;
  v_src app.scratch_breakdowns;
  v_cur app.staged_candidates;
  v_by_src app.staged_candidates;
  v_cands jsonb;
  v_new jsonb;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_candidate_id is null or p_candidate_expected_version is null or p_source_id is null
     or p_source_expected_version is null then
    raise exception 'unstage_candidate needs every argument' using errcode = '22023';
  end if;
  if not exists (select 1 from app.accounts where user_id = v_user) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_missing'));
  end if;
  if exists (select 1 from app.accounts where user_id = v_user and deletion_requested_at is not null) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_deleting'));
  end if;

  select scratch_bit_id into v_scratch_id from app.scratch_breakdowns where id = p_source_id and user_id = v_user;
  if v_scratch_id is null then
    -- No source. A candidate of that id can still exist on another source (invalid_target, as Dexie
    -- checks it first); otherwise the Stage was undone or never ran. Unlocked read, no write.
    select * into v_cur from app.staged_candidates where id = p_candidate_id and user_id = v_user;
    if v_cur.id is not null then
      return internal.envelope('rejected', null, internal.inbox_changes('[]', '[]', jsonb_build_array(to_jsonb(v_cur))),
                               jsonb_build_object('code', 'invalid_target'));
    end if;
    return internal.envelope('conflict', null, '{}');
  end if;
  v_scratch := internal.lock_bit_and_node(v_user, v_scratch_id);
  if v_scratch.id is null then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;
  select * into v_src from app.scratch_breakdowns where id = p_source_id and user_id = v_user for update;
  if v_src.id is not null and v_src.scratch_bit_id <> v_scratch_id then
    -- The id was deleted and added again under another Scratch between the unlocked read and the lock.
    raise exception 'could not settle the lock set of Breakdown %', p_source_id using errcode = '40001';
  end if;
  select * into v_cur from app.staged_candidates where id = p_candidate_id and user_id = v_user;
  if v_src.id is null then
    -- Deleted while this call waited for the lock: same verdict as the unlocked branch above.
    if v_cur.id is not null then
      return internal.envelope('rejected', null, internal.inbox_changes('[]', '[]', jsonb_build_array(to_jsonb(v_cur))),
                               jsonb_build_object('code', 'invalid_target'));
    end if;
    return internal.envelope('conflict', null, internal.inbox_changes(jsonb_build_array(to_jsonb(v_scratch))));
  end if;
  select * into v_by_src from app.staged_candidates where source_breakdown_id = p_source_id and user_id = v_user;
  select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb) into v_cands
    from app.staged_candidates c
   where c.user_id = v_user and (c.id = p_candidate_id or c.source_breakdown_id = p_source_id);

  if v_cur.id is null and v_by_src.id is null and v_src.consumed_at is null
     and v_src.version = p_source_expected_version + 1 then
    return internal.envelope('already_applied', jsonb_build_object('id', p_candidate_id),
                             internal.inbox_changes('[]', jsonb_build_array(to_jsonb(v_src))));
  end if;
  if v_cur.id is not null and v_cur.source_breakdown_id <> p_source_id then
    return internal.envelope('rejected', null,
                             internal.inbox_changes('[]', jsonb_build_array(to_jsonb(v_src)), v_cands),
                             jsonb_build_object('code', 'invalid_target'));
  end if;
  if v_cur.id is null or v_by_src.id is distinct from v_cur.id or v_cur.lifecycle <> 'staged'
     or v_cur.version <> p_candidate_expected_version
     or v_src.consumed_at is not null or v_src.version <> p_source_expected_version then
    return internal.envelope('conflict', null,
                             internal.inbox_changes('[]', jsonb_build_array(to_jsonb(v_src)), v_cands));
  end if;

  delete from app.staged_candidates where id = p_candidate_id and user_id = v_user;
  update app.scratch_breakdowns set version = version + 1 where id = p_source_id and user_id = v_user
  returning to_jsonb(app.scratch_breakdowns.*) into v_new;

  return internal.envelope('applied', jsonb_build_object('id', p_candidate_id),
                           internal.inbox_changes('[]', jsonb_build_array(v_new), '[]', '{}', array[p_candidate_id]));
end
$function$;

create or replace FUNCTION public.update_bit(p_id uuid, p_changes jsonb, p_extend_parent boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := internal.uid();
  v_now bigint := internal.now_ms();
  v_allowed constant text[] := array[
    'title', 'description', 'icon', 'deadline', 'deadline_all_day', 'priority', 'status', 'parent_id', 'x', 'y',
    'past_deadline_dismissed'
  ];
  v_key text;
  v_extend boolean := coalesce(p_extend_parent, false);
  v_old app.bits;
  v_new app.bits;
  v_rec app.bits;
  v_parent app.nodes;
  v_oldparent app.nodes;
  v_cur uuid;
  v_target uuid;
  v_attempt integer;
  v_position boolean;
  v_touches boolean;
  v_check boolean;
  v_extended boolean := false;
  v_touch_ids uuid[];
  v_bit jsonb;
  v_nodes jsonb;
  v_rej jsonb;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_changes is null or jsonb_typeof(p_changes) <> 'object' then
    raise exception 'p_changes must be a JSON object' using errcode = '22023';
  end if;
  for v_key in select jsonb_object_keys(p_changes) loop
    if v_key <> all (v_allowed) then
      raise exception 'update_bit does not accept the key %', v_key using errcode = '22023';
    end if;
  end loop;
  if not exists (select 1 from app.accounts where user_id = v_user) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_missing'));
  end if;
  if exists (select 1 from app.accounts where user_id = v_user and deletion_requested_at is not null) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_deleting'));
  end if;

  select * into v_old from app.bits where id = p_id and user_id = v_user;
  if not found then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;
  if p_changes ? 'parent_id' and jsonb_typeof(p_changes -> 'parent_id') = 'null' then
    return internal.envelope('rejected', null, internal.changes('[]', jsonb_build_array(to_jsonb(v_old))),
                             jsonb_build_object('code', 'invalid_target'));
  end if;

  -- The Grid the Bit ends up in: the Grid advisory lock first, then the row locks (S30).
  v_target := case when p_changes ? 'parent_id' then (p_changes ->> 'parent_id')::uuid else v_old.parent_id end;
  v_position := p_changes ?| array['parent_id', 'x', 'y'];
  if v_position then
    perform internal.lock_grid(v_user, v_target);
  end if;

  -- Row locks: the old and the target parent Node, in one statement ordered by id, then the Bit
  -- (Nodes before Bits, as the lifecycle functions do). The parent is read again once the locks
  -- are held; a Bit that moved meanwhile locks its new parent too.
  for v_attempt in 1 .. 3 loop
    v_cur := v_old.parent_id;
    perform 1 from (
      select n.id from app.nodes n
       where n.user_id = v_user and n.id in (v_cur, v_target) order by n.id for update
    ) locked;
    select * into v_old from app.bits where id = p_id and user_id = v_user for update;
    if not found then
      return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
    end if;
    exit when v_old.parent_id = v_cur;
    if v_attempt = 3 then
      raise exception 'update_bit could not settle its lock set' using errcode = '40001';
    end if;
  end loop;
  if v_position and not (p_changes ? 'parent_id') and v_old.parent_id is distinct from v_target then
    raise exception 'update_bit: the Bit moved while the call waited' using errcode = '40001';
  end if;

  v_rec := jsonb_populate_record(null::app.bits, p_changes);
  v_new := v_old;
  if p_changes ? 'title' then v_new.title := v_rec.title; end if;
  if p_changes ? 'description' then v_new.description := v_rec.description; end if;
  if p_changes ? 'icon' then v_new.icon := v_rec.icon; end if;
  if p_changes ? 'deadline' then v_new.deadline := v_rec.deadline; end if;
  if p_changes ? 'deadline_all_day' then v_new.deadline_all_day := v_rec.deadline_all_day; end if;
  if p_changes ? 'priority' then v_new.priority := v_rec.priority; end if;
  if p_changes ? 'status' then v_new.status := v_rec.status; end if;
  if p_changes ? 'parent_id' then v_new.parent_id := v_rec.parent_id; end if;
  if p_changes ? 'x' then v_new.x := v_rec.x; end if;
  if p_changes ? 'y' then v_new.y := v_rec.y; end if;
  if p_changes ? 'past_deadline_dismissed' then v_new.past_deadline_dismissed := v_rec.past_deadline_dismissed; end if;

  v_touches := v_new.title is distinct from v_old.title or v_new.description is distinct from v_old.description
               or v_new.icon is distinct from v_old.icon or v_new.deadline is distinct from v_old.deadline
               or v_new.deadline_all_day is distinct from v_old.deadline_all_day
               or v_new.priority is distinct from v_old.priority or v_new.status is distinct from v_old.status
               or v_new.past_deadline_dismissed is distinct from v_old.past_deadline_dismissed;
  if not v_touches and v_new.parent_id is not distinct from v_old.parent_id
     and v_new.x is not distinct from v_old.x and v_new.y is not distinct from v_old.y then
    return internal.envelope('applied');
  end if;

  v_bit := to_jsonb(v_old);
  select * into v_parent from app.nodes where id = v_new.parent_id and user_id = v_user;
  if not found then
    return internal.envelope('rejected', null, internal.changes('[]', jsonb_build_array(v_bit)),
                             jsonb_build_object('code', 'not_found'));
  end if;
  v_rej := jsonb_build_array(to_jsonb(v_parent));
  if v_new.parent_id is distinct from v_old.parent_id then
    select * into v_oldparent from app.nodes where id = v_old.parent_id and user_id = v_user;
    v_rej := v_rej || jsonb_build_array(to_jsonb(v_oldparent));
    if v_parent.system_role is not null or v_oldparent.system_role = 'inbox' then
      return internal.envelope('rejected', null, internal.changes(v_rej, jsonb_build_array(v_bit)),
                               jsonb_build_object('code', 'invalid_target'));
    end if;
    if v_parent.deleted_at is not null or v_parent.archived_at is not null then
      return internal.envelope('rejected', null, internal.changes(v_rej, jsonb_build_array(v_bit)),
                               jsonb_build_object('code', 'parent_inactive'));
    end if;
  end if;

  if (v_new.parent_id is distinct from v_old.parent_id or v_new.x <> v_old.x or v_new.y <> v_old.y)
     and not (coalesce(v_parent.system_role, '') = 'inbox' and v_new.x = 0 and v_new.y = 0)
     and internal.cell_taken(v_user, v_new.parent_id, v_new.x, v_new.y, null, p_id) then
    return internal.envelope('rejected', null, internal.changes(v_rej, jsonb_build_array(v_bit)),
                             jsonb_build_object('code', 'cell_taken'));
  end if;

  -- Hook 2.
  v_check := v_new.deadline is distinct from v_old.deadline or v_new.deadline_all_day is distinct from v_old.deadline_all_day
             or v_new.parent_id is distinct from v_old.parent_id;
  if v_check and v_new.deadline is not null and v_parent.deadline is not null
     and internal.deadline_after(v_new.deadline, v_new.deadline_all_day, v_parent.deadline, v_parent.deadline_all_day) then
    if not v_extend then
      return internal.envelope('rejected', null, internal.changes(v_rej, jsonb_build_array(v_bit)),
                               jsonb_build_object('code', 'deadline_exceeds_parent', 'table', 'nodes'));
    end if;
    v_extended := true;
  end if;

  update app.bits
     set title = v_new.title, description = v_new.description, icon = v_new.icon, deadline = v_new.deadline,
         deadline_all_day = v_new.deadline_all_day, priority = v_new.priority, status = v_new.status,
         parent_id = v_new.parent_id, x = v_new.x, y = v_new.y,
         past_deadline_dismissed = v_new.past_deadline_dismissed,
         mtime = case when v_touches then v_now else mtime end,
         version = version + 1
   where id = p_id and user_id = v_user
  returning to_jsonb(app.bits.*) into v_bit;

  v_touch_ids := case
    when v_new.parent_id is distinct from v_old.parent_id then array[v_old.parent_id, v_new.parent_id]
    when v_touches then array[v_new.parent_id]
    else '{}'::uuid[]
  end;
  with upd as (
    update app.nodes n
       set mtime = v_now,
           deadline = case when v_extended and n.id = v_parent.id then v_new.deadline else n.deadline end,
           deadline_all_day = case when v_extended and n.id = v_parent.id then v_new.deadline_all_day else n.deadline_all_day end,
           version = case when v_extended and n.id = v_parent.id then n.version + 1 else n.version end
     where n.user_id = v_user and n.id = any (v_touch_ids)
    returning to_jsonb(n.*) as j
  )
  select coalesce(jsonb_agg(j), '[]'::jsonb) into v_nodes from upd;

  return internal.envelope('applied', null, internal.changes(v_nodes, jsonb_build_array(v_bit)));
end
$function$;

create or replace FUNCTION public.update_chunk(p_id uuid, p_changes jsonb, p_extend_parent boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := internal.uid();
  v_now bigint := internal.now_ms();
  v_allowed constant text[] := array['title', 'description', 'time', 'time_all_day', 'status'];
  v_key text;
  v_extend boolean := coalesce(p_extend_parent, false);
  v_old app.chunks;
  v_new app.chunks;
  v_rec app.chunks;
  v_bit app.bits;
  v_node app.nodes;
  v_extended boolean := false;
  v_status_changed boolean;
  v_chunk jsonb;
  v_rows jsonb;
  v_settled jsonb;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_changes is null or jsonb_typeof(p_changes) <> 'object' then
    raise exception 'p_changes must be a JSON object' using errcode = '22023';
  end if;
  for v_key in select jsonb_object_keys(p_changes) loop
    if v_key <> all (v_allowed) then
      raise exception 'update_chunk does not accept the key %', v_key using errcode = '22023';
    end if;
  end loop;
  if not exists (select 1 from app.accounts where user_id = v_user) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_missing'));
  end if;
  if exists (select 1 from app.accounts where user_id = v_user and deletion_requested_at is not null) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_deleting'));
  end if;

  select * into v_old from app.chunks where id = p_id and user_id = v_user;
  if not found then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;
  v_bit := internal.lock_bit_and_node(v_user, v_old.parent_id);
  if v_bit.id is null then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;
  select * into v_old from app.chunks where id = p_id and user_id = v_user for update;
  if not found then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;

  v_rec := jsonb_populate_record(null::app.chunks, p_changes);
  v_new := v_old;
  if p_changes ? 'title' then v_new.title := v_rec.title; end if;
  if p_changes ? 'description' then v_new.description := v_rec.description; end if;
  if p_changes ? 'time' then v_new.time := v_rec.time; end if;
  if p_changes ? 'time_all_day' then v_new.time_all_day := v_rec.time_all_day; end if;
  if p_changes ? 'status' then v_new.status := v_rec.status; end if;
  if v_new is not distinct from v_old then
    return internal.envelope('applied');
  end if;

  v_chunk := to_jsonb(v_old);
  select * into v_node from app.nodes where id = v_bit.parent_id and user_id = v_user;
  v_rows := jsonb_build_array(to_jsonb(v_node));

  if (v_new.time is distinct from v_old.time or v_new.time_all_day is distinct from v_old.time_all_day)
     and v_new.time is not null and v_bit.deadline is not null
     and internal.deadline_after(v_new.time, v_new.time_all_day, v_bit.deadline, v_bit.deadline_all_day) then
    if not v_extend then
      return internal.envelope('rejected', null,
                               internal.changes(v_rows, jsonb_build_array(to_jsonb(v_bit)), jsonb_build_array(v_chunk)),
                               jsonb_build_object('code', 'deadline_exceeds_parent', 'table', 'bits'));
    end if;
    if v_node.deadline is not null
       and internal.deadline_after(v_new.time, v_new.time_all_day, v_node.deadline, v_node.deadline_all_day) then
      return internal.envelope('rejected', null,
                               internal.changes(v_rows, jsonb_build_array(to_jsonb(v_bit)), jsonb_build_array(v_chunk)),
                               jsonb_build_object('code', 'deadline_exceeds_parent', 'table', 'nodes'));
    end if;
    v_extended := true;
  end if;

  v_status_changed := v_new.status is distinct from v_old.status;
  update app.chunks set title = v_new.title, description = v_new.description, time = v_new.time,
         time_all_day = v_new.time_all_day, status = v_new.status
   where id = p_id and user_id = v_user
  returning to_jsonb(app.chunks.*) into v_chunk;

  v_settled := internal.settle_bit(v_user, v_bit, v_now,
                                   case when not v_status_changed then null
                                        when v_new.status = 'complete' then 'check' else 'uncheck' end,
                                   v_extended, v_new.time, v_new.time_all_day);
  return internal.envelope('applied', null,
                           internal.changes(jsonb_build_array(v_settled -> 'node'), jsonb_build_array(v_settled -> 'bit'),
                                            jsonb_build_array(v_chunk)));
end
$function$;

create or replace FUNCTION public.update_node(p_id uuid, p_changes jsonb, p_reserved_cells jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := internal.uid();
  v_now bigint := internal.now_ms();
  v_allowed constant text[] := array[
    'title', 'color', 'icon', 'deadline', 'deadline_all_day', 'parent_id', 'x', 'y',
    'hidden_from_grid', 'past_deadline_dismissed'
  ];
  v_key text;
  v_old app.nodes;
  v_new app.nodes;
  v_rec app.nodes;
  v_parent app.nodes;
  v_locked_parent uuid;
  v_target uuid;
  v_ids uuid[];
  v_ids_after uuid[];
  v_attempt integer;
  v_position boolean;
  v_touches boolean;
  v_showing boolean;
  v_depth integer;
  v_in_subtree boolean;
  v_level integer;
  v_delta integer;
  v_rows jsonb;
  v_part jsonb;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_changes is null or jsonb_typeof(p_changes) <> 'object' then
    raise exception 'p_changes must be a JSON object' using errcode = '22023';
  end if;
  for v_key in select jsonb_object_keys(p_changes) loop
    if v_key <> all (v_allowed) then
      raise exception 'update_node does not accept the key %', v_key using errcode = '22023';
    end if;
  end loop;
  if not internal.valid_reserved_cells(p_reserved_cells) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'invalid_input'));
  end if;
  if not exists (select 1 from app.accounts where user_id = v_user) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_missing'));
  end if;
  if exists (select 1 from app.accounts where user_id = v_user and deletion_requested_at is not null) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_deleting'));
  end if;

  select * into v_old from app.nodes where id = p_id and user_id = v_user;
  if not found then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;

  -- The Grid the Node ends up in: the Grid advisory lock first, then the row locks (S30).
  v_target := case when p_changes ? 'parent_id' then (p_changes ->> 'parent_id')::uuid else v_old.parent_id end;
  v_locked_parent := v_target;
  v_position := p_changes ?| array['parent_id', 'x', 'y', 'hidden_from_grid'];
  if v_position then
    perform internal.lock_grid(v_user, v_target);
  end if;

  -- A call without a position key (a field edit) locks only its own row; it never depends on the
  -- Node's place in the tree, so it waits for a concurrent move and then applies on top of it.
  -- Row locks of a position call, in one statement ordered by id: the moved subtree, the target
  -- parent's ancestor chain and the old parent. The set is computed again once the locks are
  -- held; a set that grew meanwhile is locked again.
  if not v_position then
    perform 1 from app.nodes where id = p_id and user_id = v_user for update;
  end if;
  for v_attempt in 1 .. case when v_position then 3 else 0 end loop
    with recursive sub as (
      select id from app.nodes where id = p_id and user_id = v_user
      union all
      select n.id from app.nodes n join sub on n.parent_id = sub.id where n.user_id = v_user
    ), chain as (
      select id, parent_id from app.nodes where id = v_target and user_id = v_user
      union all
      select n.id, n.parent_id from app.nodes n join chain c on n.id = c.parent_id where n.user_id = v_user
    )
    select coalesce(array_agg(id order by id), '{}') into v_ids from (
      select id from sub union select id from chain union select v_old.parent_id where v_old.parent_id is not null
    ) s;
    perform 1 from (
      select n.id from app.nodes n where n.user_id = v_user and n.id = any (v_ids) order by n.id for update
    ) locked;
    with recursive sub as (
      select id from app.nodes where id = p_id and user_id = v_user
      union all
      select n.id from app.nodes n join sub on n.parent_id = sub.id where n.user_id = v_user
    ), chain as (
      select id, parent_id from app.nodes where id = v_target and user_id = v_user
      union all
      select n.id, n.parent_id from app.nodes n join chain c on n.id = c.parent_id where n.user_id = v_user
    )
    select coalesce(array_agg(id order by id), '{}') into v_ids_after from (
      select id from sub union select id from chain union select v_old.parent_id where v_old.parent_id is not null
    ) s;
    exit when v_ids_after <@ v_ids;
    if v_attempt = 3 then
      raise exception 'update_node could not settle its lock set' using errcode = '40001';
    end if;
  end loop;

  -- Everything below reads the locked rows.
  select * into v_old from app.nodes where id = p_id and user_id = v_user;
  if not found then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;
  if v_position and not (p_changes ? 'parent_id') and v_old.parent_id is distinct from v_locked_parent then
    raise exception 'update_node: the Node moved while the call waited' using errcode = '40001';
  end if;

  v_rec := jsonb_populate_record(null::app.nodes, p_changes);
  v_new := v_old;
  if p_changes ? 'title' then v_new.title := v_rec.title; end if;
  if p_changes ? 'color' then v_new.color := v_rec.color; end if;
  if p_changes ? 'icon' then v_new.icon := v_rec.icon; end if;
  if p_changes ? 'deadline' then v_new.deadline := v_rec.deadline; end if;
  if p_changes ? 'deadline_all_day' then v_new.deadline_all_day := v_rec.deadline_all_day; end if;
  if p_changes ? 'parent_id' then v_new.parent_id := v_rec.parent_id; end if;
  if p_changes ? 'x' then v_new.x := v_rec.x; end if;
  if p_changes ? 'y' then v_new.y := v_rec.y; end if;
  if p_changes ? 'hidden_from_grid' then v_new.hidden_from_grid := v_rec.hidden_from_grid; end if;
  if p_changes ? 'past_deadline_dismissed' then v_new.past_deadline_dismissed := v_rec.past_deadline_dismissed; end if;

  -- Showing a hidden system Node ignores x and y and picks the first free L0 cell.
  v_showing := v_old.system_role is not null and v_old.hidden_from_grid
               and p_changes ? 'hidden_from_grid' and v_new.hidden_from_grid is false;
  if v_showing then
    v_new.x := v_old.x;
    v_new.y := v_old.y;
  end if;

  if v_new.title is not distinct from v_old.title and v_new.color is not distinct from v_old.color
     and v_new.icon is not distinct from v_old.icon and v_new.deadline is not distinct from v_old.deadline
     and v_new.deadline_all_day is not distinct from v_old.deadline_all_day
     and v_new.parent_id is not distinct from v_old.parent_id
     and v_new.x is not distinct from v_old.x and v_new.y is not distinct from v_old.y
     and v_new.hidden_from_grid is not distinct from v_old.hidden_from_grid
     and v_new.past_deadline_dismissed is not distinct from v_old.past_deadline_dismissed then
    return internal.envelope('applied');
  end if;

  v_rows := jsonb_build_array(to_jsonb(v_old));

  if v_new.hidden_from_grid and v_old.system_role is null then
    return internal.envelope('rejected', null, jsonb_build_object('nodes', jsonb_build_object('upserted', v_rows, 'deleted', '[]'::jsonb)),
                             jsonb_build_object('code', 'invalid_target'));
  end if;

  v_level := v_old.level;
  if v_new.parent_id is distinct from v_old.parent_id then
    if v_new.parent_id is not null then
      select * into v_parent from app.nodes where id = v_new.parent_id and user_id = v_user;
      if not found then
        return internal.envelope('rejected', null, jsonb_build_object('nodes', jsonb_build_object('upserted', v_rows, 'deleted', '[]'::jsonb)),
                                 jsonb_build_object('code', 'not_found'));
      end if;
      if v_parent.id <> v_old.id then
        v_rows := v_rows || jsonb_build_array(to_jsonb(v_parent));
      end if;
    end if;
    with recursive sub(id, depth) as (
      select id, 0 from app.nodes where id = p_id and user_id = v_user
      union all
      select n.id, sub.depth + 1 from app.nodes n join sub on n.parent_id = sub.id where n.user_id = v_user
    )
    select max(depth), coalesce(bool_or(id = v_new.parent_id), false) into v_depth, v_in_subtree from sub;
    v_level := case when v_new.parent_id is null then 0 else v_parent.level + 1 end;
    if v_old.system_role is not null or v_in_subtree or v_parent.system_role is not null or v_level + v_depth > 2 then
      return internal.envelope('rejected', null, jsonb_build_object('nodes', jsonb_build_object('upserted', v_rows, 'deleted', '[]'::jsonb)),
                               jsonb_build_object('code', 'invalid_target'));
    end if;
    if v_parent.id is not null and (v_parent.deleted_at is not null or v_parent.archived_at is not null) then
      return internal.envelope('rejected', null, jsonb_build_object('nodes', jsonb_build_object('upserted', v_rows, 'deleted', '[]'::jsonb)),
                               jsonb_build_object('code', 'parent_inactive'));
    end if;
  end if;

  if v_showing then
    select f.x, f.y into v_new.x, v_new.y from internal.pick_free_cell(v_user, null, p_reserved_cells) f;
    if not found then
      return internal.envelope('rejected', null, jsonb_build_object('nodes', jsonb_build_object('upserted', v_rows, 'deleted', '[]'::jsonb)),
                               jsonb_build_object('code', 'grid_full'));
    end if;
  elsif (v_new.parent_id is distinct from v_old.parent_id or v_new.x <> v_old.x or v_new.y <> v_old.y)
        and not (v_new.parent_id is null and v_new.hidden_from_grid) then
    if exists (
         select 1 from app.nodes n
          where n.user_id = v_user and n.id <> v_old.id and n.parent_id is not distinct from v_new.parent_id
            and n.x = v_new.x and n.y = v_new.y and n.deleted_at is null and n.archived_at is null
            and (v_new.parent_id is not null or not n.hidden_from_grid)
       ) or (v_new.parent_id is not null and exists (
         select 1 from app.bits b
          where b.user_id = v_user and b.parent_id = v_new.parent_id
            and b.x = v_new.x and b.y = v_new.y and b.deleted_at is null and b.archived_at is null
       )) then
      return internal.envelope('rejected', null, jsonb_build_object('nodes', jsonb_build_object('upserted', v_rows, 'deleted', '[]'::jsonb)),
                               jsonb_build_object('code', 'cell_taken'));
    end if;
  end if;

  -- Hook 1: mtime unless only the position or parent changed. Hook 12: one version per call.
  v_touches := v_new.title is distinct from v_old.title or v_new.color is distinct from v_old.color
               or v_new.icon is distinct from v_old.icon or v_new.deadline is distinct from v_old.deadline
               or v_new.deadline_all_day is distinct from v_old.deadline_all_day
               or v_new.hidden_from_grid is distinct from v_old.hidden_from_grid
               or v_new.past_deadline_dismissed is distinct from v_old.past_deadline_dismissed;

  update app.nodes
     set title = v_new.title, color = v_new.color, icon = v_new.icon, deadline = v_new.deadline,
         deadline_all_day = v_new.deadline_all_day, parent_id = v_new.parent_id, level = v_level,
         x = v_new.x, y = v_new.y, hidden_from_grid = v_new.hidden_from_grid,
         past_deadline_dismissed = v_new.past_deadline_dismissed,
         mtime = case when v_touches then v_now else mtime end,
         version = version + 1
   where id = v_old.id and user_id = v_user
  returning to_jsonb(app.nodes.*) into v_part;
  v_rows := jsonb_build_array(v_part);

  if v_new.parent_id is distinct from v_old.parent_id then
    v_delta := v_level - v_old.level;
    if v_delta <> 0 then
      with recursive sub as (
        select id from app.nodes where parent_id = p_id and user_id = v_user
        union all
        select n.id from app.nodes n join sub on n.parent_id = sub.id where n.user_id = v_user
      ), upd as (
        update app.nodes n set level = n.level + v_delta, version = n.version + 1
          from sub where n.id = sub.id and n.user_id = v_user
        returning to_jsonb(n.*) as j
      )
      select coalesce(jsonb_agg(j), '[]'::jsonb) into v_part from upd;
      v_rows := v_rows || v_part;
    end if;
    -- The old and the new parent are touched (Hook 1); their version stays.
    with upd as (
      update app.nodes n set mtime = v_now
       where n.user_id = v_user and n.id in (v_old.parent_id, v_new.parent_id)
      returning to_jsonb(n.*) as j
    )
    select coalesce(jsonb_agg(j), '[]'::jsonb) into v_part from upd;
    v_rows := v_rows || v_part;
  end if;

  return internal.envelope(
    'applied', null,
    jsonb_build_object('nodes', jsonb_build_object('upserted', v_rows, 'deleted', '[]'::jsonb))
  );
end
$function$;

create or replace FUNCTION internal.undo_placement(p_result jsonb, p_source jsonb, p_candidate jsonb, p_staged boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_user uuid := internal.uid();
  v_now bigint := internal.now_ms();
  v_isnode boolean;
  v_rid uuid;
  v_sid uuid;
  v_scid uuid;
  v_cid uuid;
  v_parent uuid;
  v_inbox uuid;
  v_scratch app.bits;
  v_src app.scratch_breakdowns;
  v_cand app.staged_candidates;
  v_bysrc app.staged_candidates;
  v_rn app.nodes;
  v_rb app.bits;
  v_kids boolean;
  v_valid boolean;
  v_post boolean;
  v_par jsonb;
  v_srcnew jsonb;
  v_candnew jsonb;
  v_view jsonb;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if jsonb_typeof(p_result) is distinct from 'object' or jsonb_typeof(p_source) is distinct from 'object'
     or (p_staged and jsonb_typeof(p_candidate) is distinct from 'object') then
    raise exception 'an Undo needs the result, source and (staged) candidate rows' using errcode = '22023';
  end if;
  v_isnode := jsonb_exists(p_result, 'level');
  v_rid := (p_result ->> 'id')::uuid;
  v_sid := (p_source ->> 'id')::uuid;
  v_scid := (p_source ->> 'scratch_bit_id')::uuid;
  v_cid := case when p_staged then (p_candidate ->> 'id')::uuid end;
  v_parent := (p_result ->> 'parent_id')::uuid;
  if v_rid is null or v_sid is null or v_scid is null or (p_staged and v_cid is null) then
    raise exception 'an Undo needs the ids of the result, source, Scratch and candidate' using errcode = '22023';
  end if;
  if not exists (select 1 from app.accounts where user_id = v_user) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_missing'));
  end if;
  if exists (select 1 from app.accounts where user_id = v_user and deletion_requested_at is not null) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_deleting'));
  end if;

  select id into v_inbox from app.nodes where user_id = v_user and system_role = 'inbox';
  if v_inbox is null then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;
  perform 1 from app.nodes
   where user_id = v_user and id in (v_inbox, v_parent, case when v_isnode then v_rid end)
   order by id for update;

  select * into v_scratch from app.bits where id = v_scid and user_id = v_user;
  if v_scratch.id is null then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;
  if v_scratch.parent_id <> v_inbox then
    return internal.envelope('rejected', null, internal.inbox_changes(jsonb_build_array(to_jsonb(v_scratch))),
                             jsonb_build_object('code', 'invalid_target'));
  end if;
  perform 1 from app.bits
   where user_id = v_user and id in (v_scid, case when not v_isnode then v_rid end)
   order by id for update;
  select * into v_scratch from app.bits where id = v_scid and user_id = v_user;
  if v_scratch.id is null or v_scratch.parent_id <> v_inbox then
    raise exception 'could not settle the lock set of Bit %', v_scid using errcode = '40001';
  end if;
  select * into v_src from app.scratch_breakdowns where id = v_sid and user_id = v_user for update;
  select * into v_cand from app.staged_candidates where id = v_cid and user_id = v_user;
  select * into v_bysrc from app.staged_candidates where source_breakdown_id = v_sid and user_id = v_user;
  select * into v_rn from app.nodes where id = v_rid and user_id = v_user;
  select * into v_rb from app.bits where id = v_rid and user_id = v_user;
  v_kids := exists (select 1 from app.nodes where user_id = v_user and parent_id = v_rid)
         or exists (select 1 from app.bits where user_id = v_user and parent_id = v_rid)
         or exists (select 1 from app.chunks where user_id = v_user and parent_id = v_rid);
  v_view := internal.placement_view(v_user, v_scid, v_rid, v_sid, v_cid);

  v_post := coalesce(
    v_rn.id is null and v_rb.id is null and not v_kids and v_src.id is not null
    and (to_jsonb(v_src) - 'user_id') = ((p_source - 'user_id')
         || jsonb_build_object('consumed_at', null, 'version', (p_source ->> 'version')::integer + 1))
    and case when p_staged then
          v_cand.id is not null and v_bysrc.id = v_cand.id and v_cand.updated_at >= v_cand.created_at
          and (to_jsonb(v_cand) - 'user_id' - 'updated_at') = ((p_candidate - 'user_id' - 'updated_at')
               || jsonb_build_object('version', (p_candidate ->> 'version')::integer + 1))
        else v_bysrc.id is null end, false);
  if v_post then
    return internal.envelope('already_applied', null, v_view);
  end if;
  if not internal.active_inbox_scratch(v_user, v_scratch) then
    return internal.envelope('rejected', null, v_view, jsonb_build_object('code', 'invalid_target'));
  end if;

  v_valid := coalesce(
    (p_result ->> 'version')::integer = 1 and (p_result -> 'created_at') = (p_result -> 'mtime')
    and (p_result ->> 'deleted_at') is null and (p_result ->> 'archived_at') is null
    and (not v_isnode or ((p_result ->> 'system_role') is null and (p_result ->> 'hidden_from_grid')::boolean = false))
    and (p_source -> 'consumed_at') = (p_result -> 'created_at')
    and (not p_staged or ((p_candidate ->> 'scratch_bit_id') = (p_source ->> 'scratch_bit_id')
         and (p_candidate ->> 'source_breakdown_id') = (p_source ->> 'id')
         and (p_candidate ->> 'result_type') = case when v_isnode then 'node' else 'bit' end
         and (p_candidate ->> 'lifecycle') = 'staged')), false);
  if not coalesce(
       v_valid and not v_kids and v_src.id is not null
       and (to_jsonb(v_src) - 'user_id') = (p_source - 'user_id')
       and case when v_isnode then v_rn.id is not null and v_rb.id is null and (to_jsonb(v_rn) - 'user_id') = (p_result - 'user_id')
                else v_rb.id is not null and v_rn.id is null and (to_jsonb(v_rb) - 'user_id') = (p_result - 'user_id') end
       and (v_parent is null or exists (select 1 from app.nodes where user_id = v_user and id = v_parent))
       and case when p_staged then v_cand.id is null and v_bysrc.id is null else v_bysrc.id is null end, false) then
    return internal.envelope('conflict', null, v_view);
  end if;

  if v_isnode then
    delete from app.nodes where id = v_rid and user_id = v_user;
  else
    delete from app.bits where id = v_rid and user_id = v_user;
  end if;
  if v_parent is not null then
    update app.nodes set mtime = v_now where id = v_parent and user_id = v_user
    returning to_jsonb(app.nodes.*) into v_par;
  end if;
  update app.scratch_breakdowns set consumed_at = null, version = version + 1 where id = v_sid and user_id = v_user
  returning to_jsonb(app.scratch_breakdowns.*) into v_srcnew;
  if p_staged then
    insert into app.staged_candidates (id, user_id, scratch_bit_id, source_breakdown_id, result_type, lifecycle,
                                       created_at, updated_at, version)
    values (v_cid, v_user, v_scid, v_sid, p_candidate ->> 'result_type', 'staged',
            (p_candidate ->> 'created_at')::bigint, v_now, (p_candidate ->> 'version')::integer + 1)
    returning to_jsonb(app.staged_candidates.*) into v_candnew;
  end if;

  return internal.envelope('applied', null, internal.inbox_changes(
    p_breakdowns => jsonb_build_array(v_srcnew),
    p_candidates => case when p_staged then jsonb_build_array(v_candnew) else '[]'::jsonb end,
    p_nodes => case when v_par is null then '[]'::jsonb else jsonb_build_array(v_par) end,
    p_deleted_nodes => case when v_isnode then array[v_rid] else '{}'::uuid[] end,
    p_deleted_bits => case when v_isnode then '{}'::uuid[] else array[v_rid] end));
end
$function$;

revoke create on schema public from griddo_writer;
revoke create on schema internal from griddo_writer;
