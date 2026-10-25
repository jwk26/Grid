-- Task 219, Stage 1: public.create_node(), public.create_bit() and public.update_bit() (SCHEMA
-- Database Functions; Hooks 1, 2, 8 and 12), with the internal helpers they share. Last write wins
-- (S15). Values arrive as a JSON object of snake_case columns: an absent key is left alone (update)
-- or defaulted (create), an unknown key fails the call with 22023 and writes nothing, and so does
-- a create that lacks a required key. A value a CHECK refuses ends the call with an error (S16).
-- A duplicate id is a plain insert failure (23505), never an upsert, so a create can never touch
-- a row that already exists, in this account or another.

grant create on schema internal to griddo_writer;
grant create on schema public to griddo_writer;

create function internal.jwt() returns jsonb
  language sql stable security invoker set search_path = ''
  as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb) $$;

-- A guest is a Supabase anonymous user: the `is_anonymous` JWT claim (SCHEMA §Schemas and roles).
create function internal.is_guest() returns boolean
  language sql stable security invoker set search_path = ''
  as $$ select coalesce((internal.jwt() ->> 'is_anonymous')::boolean, false) $$;

-- The row limit of a table for the caller (SCHEMA §Account limits). The only place the numbers live.
create function internal.account_limit(p_table text) returns integer
  language sql stable security invoker set search_path = ''
  as $$
    select case when internal.is_guest() then
      case p_table when 'nodes' then 100 when 'bits' then 300 when 'chunks' then 1000 when 'scratch_breakdowns' then 300 end
    else
      case p_table when 'nodes' then 1000 when 'bits' then 5000 when 'chunks' then 10000 when 'scratch_breakdowns' then 5000 end
    end
  $$;

-- The limit when the caller's table already holds that many rows (trashed and archived rows
-- count), otherwise null.
create function internal.limit_reached(p_user uuid, p_table text) returns integer
  language plpgsql stable security invoker set search_path = ''
  as $$
declare
  v_limit integer := internal.account_limit(p_table);
  v_count bigint;
begin
  if v_limit is null then
    raise exception 'internal.limit_reached: unknown table %', p_table using errcode = '22023';
  end if;
  execute format('select count(*) from app.%I where user_id = $1', p_table) into v_count using p_user;
  return case when v_count >= v_limit then v_limit end;
end
$$;

-- True when the child deadline is after the parent's. An all-day deadline is stored at the start
-- of its day and counts as the end of that day (src/lib/utils/deadline.ts); the server has no
-- time zone, so the end of the day is start + 24 h - 1 ms (off by an hour on a DST change day).
create function internal.deadline_after(c bigint, c_all_day boolean, p bigint, p_all_day boolean) returns boolean
  language sql immutable security invoker set search_path = ''
  as $$
    select (c + case when c_all_day then 86399999 else 0 end) > (p + case when p_all_day then 86399999 else 0 end)
  $$;

-- True when an active Node or Bit of the Grid of p_parent (null is L0) holds the cell, ignoring
-- the named Node and Bit. Callers hold the Grid lock.
create function internal.cell_taken(
  p_user uuid, p_parent uuid, p_x integer, p_y integer, p_skip_node uuid default null, p_skip_bit uuid default null
) returns boolean
  language sql stable security invoker set search_path = ''
  as $$
    select exists (
      select 1 from app.nodes n
       where n.user_id = p_user and n.parent_id is not distinct from p_parent and n.x = p_x and n.y = p_y
         and n.deleted_at is null and n.archived_at is null and n.id is distinct from p_skip_node
         and (p_parent is not null or not n.hidden_from_grid)
    ) or (p_parent is not null and exists (
      select 1 from app.bits b
       where b.user_id = p_user and b.parent_id = p_parent and b.x = p_x and b.y = p_y
         and b.deleted_at is null and b.archived_at is null and b.id is distinct from p_skip_bit
    ))
  $$;

-- The `changes` object of an envelope: a table whose upserted list is empty is left out.
create function internal.changes(p_nodes jsonb default '[]', p_bits jsonb default '[]', p_chunks jsonb default '[]')
  returns jsonb
  language sql immutable security invoker set search_path = ''
  as $$
    select coalesce(jsonb_object_agg(t.name, jsonb_build_object('upserted', t.rows, 'deleted', '[]'::jsonb)), '{}'::jsonb)
      from (values ('nodes', coalesce(p_nodes, '[]'::jsonb)), ('bits', coalesce(p_bits, '[]'::jsonb)),
                   ('chunks', coalesce(p_chunks, '[]'::jsonb))) as t(name, rows)
     where jsonb_array_length(t.rows) > 0
  $$;

alter function internal.jwt() owner to griddo_writer;
alter function internal.is_guest() owner to griddo_writer;
alter function internal.account_limit(text) owner to griddo_writer;
alter function internal.limit_reached(uuid, text) owner to griddo_writer;
alter function internal.deadline_after(bigint, boolean, bigint, boolean) owner to griddo_writer;
alter function internal.cell_taken(uuid, uuid, integer, integer, uuid, uuid) owner to griddo_writer;
alter function internal.changes(jsonb, jsonb, jsonb) owner to griddo_writer;
revoke all on function internal.jwt() from public;
revoke all on function internal.is_guest() from public;
revoke all on function internal.account_limit(text) from public;
revoke all on function internal.limit_reached(uuid, text) from public;
revoke all on function internal.deadline_after(bigint, boolean, bigint, boolean) from public;
revoke all on function internal.cell_taken(uuid, uuid, integer, integer, uuid, uuid) from public;
revoke all on function internal.changes(jsonb, jsonb, jsonb) from public;
grant execute on function internal.jwt() to griddo_writer;
grant execute on function internal.is_guest() to griddo_writer;
grant execute on function internal.account_limit(text) to griddo_writer;
grant execute on function internal.limit_reached(uuid, text) to griddo_writer;
grant execute on function internal.deadline_after(bigint, boolean, bigint, boolean) to griddo_writer;
grant execute on function internal.cell_taken(uuid, uuid, integer, integer, uuid, uuid) to griddo_writer;
grant execute on function internal.changes(jsonb, jsonb, jsonb) to griddo_writer;

-- ---------------------------------------------------------------------------------------------
-- create_node(p_id, p_values). Required: title, color, icon, x, y. Optional: deadline,
-- deadline_all_day, parent_id (null or absent is L0). `level` is derived (parent level + 1).
-- invalid_target: a parent that is a system Node, or a parent at level 2. The Node's deadline
-- must fit its parent's (Dexie parity).
create function public.create_node(p_id uuid, p_values jsonb)
  returns jsonb
  language plpgsql volatile security definer set search_path = ''
  as $$
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
$$;

-- ---------------------------------------------------------------------------------------------
-- create_bit(p_id, p_values). Required: title, icon, parent_id, x, y. Optional: description,
-- deadline, deadline_all_day, priority. A Bit always has a Node parent: an explicit null parent_id
-- or an Archive parent is invalid_target. Bits under the Inbox are Scratch Bits, which keep the
-- (0,0) sentinel and are exempt from cell uniqueness (Hook 8).
create function public.create_bit(p_id uuid, p_values jsonb)
  returns jsonb
  language plpgsql volatile security definer set search_path = ''
  as $$
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
$$;

-- ---------------------------------------------------------------------------------------------
-- update_bit(p_id, p_changes, p_extend_parent). Allowed keys: title, description, icon, deadline,
-- deadline_all_day, priority, status, parent_id, x, y, past_deadline_dismissed.
--
-- Hook 2: when the Bit's deadline (or its parent) changes and the new deadline is after the parent
-- Node's, the call is rejected with deadline_exceeds_parent, unless p_extend_parent is true: then
-- the parent Node's deadline and deadline_all_day become the Bit's in the same transaction (the
-- Bit detail "update the parent too" answer). A call that changes neither deadline nor parent
-- does not check, so a Bit already in conflict (Hook 2 scenario 2) can still be edited.
-- invalid_target: a null parent, a move into the Archive or the Inbox, a move out of the Inbox.
-- Hook 1: the Bit's mtime unless only the position or parent changed; the parent Node's mtime
-- when the Bit's mtime is touched or the parent changed (both parents then). Hook 12: the Bit
-- gets version + 1 once per call; the parent gets it only when it is extended.
create function public.update_bit(p_id uuid, p_changes jsonb, p_extend_parent boolean default false)
  returns jsonb
  language plpgsql volatile security definer set search_path = ''
  as $$
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
$$;

alter function public.create_node(uuid, jsonb) owner to griddo_writer;
alter function public.create_bit(uuid, jsonb) owner to griddo_writer;
alter function public.update_bit(uuid, jsonb, boolean) owner to griddo_writer;
revoke all on function public.create_node(uuid, jsonb) from public, anon, service_role;
revoke all on function public.create_bit(uuid, jsonb) from public, anon, service_role;
revoke all on function public.update_bit(uuid, jsonb, boolean) from public, anon, service_role;
grant execute on function public.create_node(uuid, jsonb) to authenticated;
grant execute on function public.create_bit(uuid, jsonb) to authenticated;
grant execute on function public.update_bit(uuid, jsonb, boolean) to authenticated;
revoke create on schema internal from griddo_writer;
revoke create on schema public from griddo_writer;
