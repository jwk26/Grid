-- Task 221: the Breakdown and Scratch title commands (SCHEMA §Atomic command matrix: Add
-- Breakdown, Save Scratch title, Save Breakdown, Delete Breakdown; §Operation reconciliation;
-- Hooks 12, 13 and 14), ported from the Dexie commands in indexeddb.ts, which are the answer key.
--
-- Each command is one `security definer` function owned by griddo_writer and returns the result
-- envelope. `operationId` is not a parameter: there is no operation table, the client keeps it for
-- correlation. Each command has a read-only `reconcile_*` function (`security invoker`, one SQL
-- statement, so it reads one point in time under READ COMMITTED) that classifies the same command
-- as `already_applied`, `not_applied` or `conflict`; it rejects only `account_missing`.
--
-- Active Scratch: a Bit whose parent is the Inbox Node, neither trashed nor archived, with the
-- Inbox Node itself neither trashed nor archived. Locks (SCHEMA §Locks, Inbox): the Inbox Node and
-- then the Scratch Bit `for update` (internal.lock_bit_and_node), then the row.
--
-- Rejection codes: `not_found` (the Scratch or row does not exist for the caller), `invalid_target`
-- (not an active Inbox Scratch; a row that is staged, consumed or of another Scratch), `invalid_input`
-- (a Scratch title save that changes nothing, a Breakdown save that changes nothing),
-- `account_limit`, `account_missing`.

grant create on schema internal to griddo_writer;
grant create on schema public to griddo_writer;

-- True when p_bit is an active Scratch of the Inbox Node.
create function internal.active_inbox_scratch(p_user uuid, p_bit app.bits) returns boolean
  language sql stable security invoker set search_path = ''
  as $$
    select p_bit.id is not null
       and p_bit.deleted_at is null and p_bit.archived_at is null
       and exists (
         select 1 from app.nodes n
          where n.user_id = p_user and n.id = p_bit.parent_id and n.system_role = 'inbox'
            and n.deleted_at is null and n.archived_at is null
       )
  $$;

-- The `changes` of an Inbox command: complete rows per table, plus ids deleted from the
-- scratch_breakdowns table. A table with no rows and no ids is left out.
create function internal.inbox_changes(
  p_bits jsonb default '[]', p_breakdowns jsonb default '[]', p_candidates jsonb default '[]',
  p_deleted_breakdowns uuid[] default '{}'
) returns jsonb
  language sql immutable security invoker set search_path = ''
  as $$
    select coalesce(jsonb_object_agg(t.name, jsonb_build_object('upserted', t.rows, 'deleted', t.gone)), '{}'::jsonb)
      from (values
        ('bits', coalesce(p_bits, '[]'::jsonb), '[]'::jsonb),
        ('scratch_breakdowns', coalesce(p_breakdowns, '[]'::jsonb), to_jsonb(coalesce(p_deleted_breakdowns, '{}'::uuid[]))),
        ('staged_candidates', coalesce(p_candidates, '[]'::jsonb), '[]'::jsonb)
      ) as t(name, rows, gone)
     where jsonb_array_length(t.rows) > 0 or jsonb_array_length(t.gone) > 0
  $$;

alter function internal.active_inbox_scratch(uuid, app.bits) owner to griddo_writer;
alter function internal.inbox_changes(jsonb, jsonb, jsonb, uuid[]) owner to griddo_writer;
revoke all on function internal.active_inbox_scratch(uuid, app.bits) from public;
revoke all on function internal.inbox_changes(jsonb, jsonb, jsonb, uuid[]) from public;
grant execute on function internal.active_inbox_scratch(uuid, app.bits) to griddo_writer;
grant execute on function internal.inbox_changes(jsonb, jsonb, jsonb, uuid[]) to griddo_writer;

-- ---------------------------------------------------------------------------------------------
-- add_breakdown(p_breakdown_id, p_scratch_id, p_scratch_expected_version, p_content)
-- Inserts one row at version 1, consumed_at null, next `order` computed from the rows of the
-- Scratch under the lock (consumed rows count), and increments the Scratch version once.
-- Result: {id}. Account limit on scratch_breakdowns (one row).
create function public.add_breakdown(
  p_breakdown_id uuid, p_scratch_id uuid, p_scratch_expected_version integer, p_content text
) returns jsonb
  language plpgsql volatile security definer set search_path = ''
  as $$
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
$$;

-- Read-only classification of add_breakdown: already_applied (the exact row at version 1 and the
-- Scratch at expected + 1), not_applied (no row, active Scratch at the expected version), else
-- conflict. A later Delete advanced the Scratch again, so it is a conflict, never a resurrection.
create function public.reconcile_add_breakdown(
  p_breakdown_id uuid, p_scratch_id uuid, p_scratch_expected_version integer, p_content text
) returns jsonb
  language sql stable security invoker set search_path = ''
  as $$
    with u as (select (select auth.uid()) as id),
    acct as (select exists (select 1 from app.accounts a, u where a.user_id = u.id) as ok),
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
    select case when verdict.s = 'account_missing'
      then jsonb_build_object('status', 'rejected', 'result', null, 'changes', '{}'::jsonb,
                              'rejection', jsonb_build_object('code', 'account_missing'))
      else jsonb_build_object('status', verdict.s, 'result', null, 'changes', coalesce((select jsonb_object_agg(t.k, t.v) from (values
        ('bits', case when exists (select 1 from sc) then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(sc)) from sc), 'deleted', '[]'::jsonb) end),
        ('scratch_breakdowns', case when exists (select 1 from br) then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(br)) from br), 'deleted', '[]'::jsonb) end)
      ) as t(k, v) where t.v is not null), '{}'::jsonb))
    end
    from verdict
  $$;

-- ---------------------------------------------------------------------------------------------
-- save_scratch_title(p_scratch_id, p_expected_version, p_base_title, p_title)
-- Sets the title and mtime and increments the Scratch version once. A save that changes nothing is
-- rejected (invalid_input); a different version or base title is a conflict. The Inbox Node keeps
-- its version and mtime (the Dexie command does not touch it).
create function public.save_scratch_title(
  p_scratch_id uuid, p_expected_version integer, p_base_title text, p_title text
) returns jsonb
  language plpgsql volatile security definer set search_path = ''
  as $$
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
$$;

create function public.reconcile_save_scratch_title(
  p_scratch_id uuid, p_expected_version integer, p_base_title text, p_title text
) returns jsonb
  language sql stable security invoker set search_path = ''
  as $$
    with u as (select (select auth.uid()) as id),
    acct as (select exists (select 1 from app.accounts a, u where a.user_id = u.id) as ok),
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
        when p_scratch_id is null or p_expected_version is null or p_base_title is null or p_title is null then 'conflict'
        when act.ok and exists (select 1 from sc where sc.title = p_title and sc.version = p_expected_version + 1) then 'already_applied'
        when act.ok and exists (select 1 from sc where sc.title = p_base_title and sc.version = p_expected_version) then 'not_applied'
        else 'conflict'
      end as s
      from acct, act
    )
    select case when verdict.s = 'account_missing'
      then jsonb_build_object('status', 'rejected', 'result', null, 'changes', '{}'::jsonb,
                              'rejection', jsonb_build_object('code', 'account_missing'))
      else jsonb_build_object('status', verdict.s, 'result', null, 'changes', coalesce((select jsonb_object_agg(t.k, t.v) from (values
        ('bits', case when exists (select 1 from sc) then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(sc)) from sc), 'deleted', '[]'::jsonb) end)
      ) as t(k, v) where t.v is not null), '{}'::jsonb))
    end
    from verdict
  $$;

-- ---------------------------------------------------------------------------------------------
-- save_breakdown(p_id, p_expected_version, p_base_content, p_base_order, p_content, p_order)
-- Updates content and order of an active, unconsumed, unstaged row and increments the row version
-- once. A row with a staged candidate, a consumed row or a row under an inactive Scratch is
-- rejected (invalid_target), a save that changes nothing is rejected (invalid_input); a different
-- version, base content or base order is a conflict. The Scratch keeps its version.
create function public.save_breakdown(
  p_id uuid, p_expected_version integer, p_base_content text, p_base_order integer,
  p_content text, p_order integer
) returns jsonb
  language plpgsql volatile security definer set search_path = ''
  as $$
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
$$;

-- Read-only classification of save_breakdown (the Scratch is the row's owner).
create function public.reconcile_save_breakdown(
  p_id uuid, p_expected_version integer, p_base_content text, p_base_order integer,
  p_content text, p_order integer
) returns jsonb
  language sql stable security invoker set search_path = ''
  as $$
    with u as (select (select auth.uid()) as id),
    acct as (select exists (select 1 from app.accounts a, u where a.user_id = u.id) as ok),
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
    select case when verdict.s = 'account_missing'
      then jsonb_build_object('status', 'rejected', 'result', null, 'changes', '{}'::jsonb,
                              'rejection', jsonb_build_object('code', 'account_missing'))
      else jsonb_build_object('status', verdict.s, 'result', null, 'changes', coalesce((select jsonb_object_agg(t.k, t.v) from (values
        ('bits', case when exists (select 1 from sc) then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(sc)) from sc), 'deleted', '[]'::jsonb) end),
        ('scratch_breakdowns', case when exists (select 1 from br) then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(br)) from br), 'deleted', '[]'::jsonb) end),
        ('staged_candidates', case when exists (select 1 from cand) then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(cand)) from cand), 'deleted', '[]'::jsonb) end)
      ) as t(k, v) where t.v is not null), '{}'::jsonb))
    end
    from verdict
  $$;

-- ---------------------------------------------------------------------------------------------
-- delete_breakdown(p_id, p_expected_version, p_scratch_id, p_scratch_expected_version)
-- Hard-deletes one active, unconsumed, unstaged row of the Scratch and increments the Scratch
-- version once. A staged row is rejected (invalid_target), never unstaged or cascaded; the foreign
-- key would refuse it too (S18). A row of another Scratch is rejected.
create function public.delete_breakdown(
  p_id uuid, p_expected_version integer, p_scratch_id uuid, p_scratch_expected_version integer
) returns jsonb
  language plpgsql volatile security definer set search_path = ''
  as $$
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

  v_scratch := internal.lock_bit_and_node(v_user, p_scratch_id);
  if v_scratch.id is null then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
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
$$;

-- Read-only classification of delete_breakdown: already_applied (row and candidate absent, Scratch
-- at expected + 1), not_applied (the exact active row, no candidate, both versions as expected).
create function public.reconcile_delete_breakdown(
  p_id uuid, p_expected_version integer, p_scratch_id uuid, p_scratch_expected_version integer
) returns jsonb
  language sql stable security invoker set search_path = ''
  as $$
    with u as (select (select auth.uid()) as id),
    acct as (select exists (select 1 from app.accounts a, u where a.user_id = u.id) as ok),
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
    select case when verdict.s = 'account_missing'
      then jsonb_build_object('status', 'rejected', 'result', null, 'changes', '{}'::jsonb,
                              'rejection', jsonb_build_object('code', 'account_missing'))
      else jsonb_build_object('status', verdict.s, 'result', null, 'changes', coalesce((select jsonb_object_agg(t.k, t.v) from (values
        ('bits', case when exists (select 1 from sc) then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(sc)) from sc), 'deleted', '[]'::jsonb) end),
        ('scratch_breakdowns', case when exists (select 1 from br) then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(br)) from br), 'deleted', '[]'::jsonb) end),
        ('staged_candidates', case when exists (select 1 from cand) then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(cand)) from cand), 'deleted', '[]'::jsonb) end)
      ) as t(k, v) where t.v is not null), '{}'::jsonb))
    end
    from verdict
  $$;

-- ---------------------------------------------------------------------------------------------
alter function public.add_breakdown(uuid, uuid, integer, text) owner to griddo_writer;
alter function public.save_scratch_title(uuid, integer, text, text) owner to griddo_writer;
alter function public.save_breakdown(uuid, integer, text, integer, text, integer) owner to griddo_writer;
alter function public.delete_breakdown(uuid, integer, uuid, integer) owner to griddo_writer;
revoke all on function public.add_breakdown(uuid, uuid, integer, text) from public, anon, service_role;
revoke all on function public.save_scratch_title(uuid, integer, text, text) from public, anon, service_role;
revoke all on function public.reconcile_add_breakdown(uuid, uuid, integer, text) from public, anon, service_role;
revoke all on function public.reconcile_save_scratch_title(uuid, integer, text, text) from public, anon, service_role;
revoke all on function public.save_breakdown(uuid, integer, text, integer, text, integer) from public, anon, service_role;
revoke all on function public.delete_breakdown(uuid, integer, uuid, integer) from public, anon, service_role;
revoke all on function public.reconcile_save_breakdown(uuid, integer, text, integer, text, integer) from public, anon, service_role;
revoke all on function public.reconcile_delete_breakdown(uuid, integer, uuid, integer) from public, anon, service_role;
grant execute on function public.add_breakdown(uuid, uuid, integer, text) to authenticated;
grant execute on function public.save_breakdown(uuid, integer, text, integer, text, integer) to authenticated;
grant execute on function public.delete_breakdown(uuid, integer, uuid, integer) to authenticated;
grant execute on function public.reconcile_save_breakdown(uuid, integer, text, integer, text, integer) to authenticated;
grant execute on function public.reconcile_delete_breakdown(uuid, integer, uuid, integer) to authenticated;
grant execute on function public.save_scratch_title(uuid, integer, text, text) to authenticated;
grant execute on function public.reconcile_add_breakdown(uuid, uuid, integer, text) to authenticated;
grant execute on function public.reconcile_save_scratch_title(uuid, integer, text, text) to authenticated;
revoke create on schema internal from griddo_writer;
revoke create on schema public from griddo_writer;
