-- Task 229: local-only browser-check seed. Runs on `supabase db reset` (config.toml
-- [db.seed]) and is never a migration, so production never gets the `dev` schema.
--
-- dev.seed_fixture(user_id, scenario) gives one fixture test user (email domain
-- @griddo.test) a known account: it runs ensure_account() with the top-left 3x2 block
-- reserved (feedback F34), clears every row except the accounts row and the system Nodes,
-- and inserts the scenario with times relative to now. The function is SECURITY DEFINER
-- and owned by griddo_writer like every write function, so RLS still applies inside it;
-- EXECUTE goes to service_role alone. SQL checklist (PLANNING_STANDARD §6): account row
-- locked FOR UPDATE; no envelope, change set or account limit check (it is not a client
-- write function; the scenario stays under even the guest limits); schema `dev` USAGE for
-- service_role and the owner only; checked by supabase/tests/dev-seed.db.test.ts.

create schema dev;
revoke all on schema dev from public;
grant usage on schema dev to griddo_writer, service_role;
grant create on schema dev to griddo_writer;

-- postgres can read auth.users; griddo_writer cannot, so this one question is asked here.
create function dev.is_fixture_user(p_user uuid) returns boolean
  language sql stable security definer set search_path = ''
  as $$ select exists (select 1 from auth.users u where u.id = p_user and u.email like '%@griddo.test') $$;

create function dev.reserved_cells() returns jsonb
  language sql immutable security invoker set search_path = ''
  as $$ select '[{"x":0,"y":0},{"x":1,"y":0},{"x":2,"y":0},{"x":0,"y":1},{"x":1,"y":1},{"x":2,"y":1}]'::jsonb $$;

-- The first free cell of the parent's Grid outside the reserved block.
create function dev.put_node(
  p_user uuid, p_now bigint, p_title text, p_parent uuid, p_level integer,
  p_icon text default 'Folder', p_deleted_at bigint default null
) returns uuid
  language plpgsql volatile security invoker set search_path = ''
  as $$
declare
  v_id uuid := gen_random_uuid();
  v_x integer;
  v_y integer;
begin
  select f.x, f.y into v_x, v_y from internal.pick_free_cell(p_user, p_parent, dev.reserved_cells()) f;
  if v_x is null then
    raise exception 'no free cell for %', p_title;
  end if;
  insert into app.nodes (id, user_id, title, color, icon, mtime, created_at, level, parent_id, x, y, deleted_at)
  values (v_id, p_user, p_title, 'hsl(210, 50%, 50%)', p_icon, p_now, p_now, p_level, p_parent, v_x, v_y, p_deleted_at);
  return v_id;
end
$$;

create function dev.put_bit(
  p_user uuid, p_now bigint, p_title text, p_parent uuid,
  p_icon text default 'FileText', p_priority text default null, p_deadline bigint default null,
  p_status text default 'active', p_created_at bigint default null, p_mtime bigint default null,
  p_deleted_at bigint default null, p_archived_at bigint default null
) returns uuid
  language plpgsql volatile security invoker set search_path = ''
  as $$
declare
  v_id uuid := gen_random_uuid();
  v_x integer;
  v_y integer;
begin
  select f.x, f.y into v_x, v_y from internal.pick_free_cell(p_user, p_parent, dev.reserved_cells()) f;
  if v_x is null then
    raise exception 'no free cell for %', p_title;
  end if;
  insert into app.bits (id, user_id, title, icon, priority, deadline, status, mtime, created_at,
                        parent_id, x, y, deleted_at, archived_at)
  values (v_id, p_user, p_title, p_icon, p_priority, p_deadline, p_status,
          coalesce(p_mtime, p_now), coalesce(p_created_at, p_now), p_parent, v_x, v_y, p_deleted_at, p_archived_at);
  return v_id;
end
$$;

create function dev.put_row(
  p_user uuid, p_now bigint, p_scratch uuid, p_content text, p_order integer, p_consumed boolean default false
) returns uuid
  language plpgsql volatile security invoker set search_path = ''
  as $$
declare
  v_id uuid := gen_random_uuid();
  v_owner_created bigint;
  v_created bigint;
begin
  select created_at into v_owner_created from app.bits where user_id = p_user and id = p_scratch;
  v_created := least(p_now - 1, v_owner_created + (p_order + 1) * 60000);
  insert into app.scratch_breakdowns (id, user_id, scratch_bit_id, content, "order", created_at, consumed_at)
  values (v_id, p_user, p_scratch, p_content, p_order, v_created,
          case when p_consumed then greatest(v_created + 1, p_now - 3600000) end);
  return v_id;
end
$$;

create function dev.put_stage(
  p_user uuid, p_now bigint, p_source uuid, p_type text, p_n integer
) returns void
  language plpgsql volatile security invoker set search_path = ''
  as $$
declare
  v_scratch uuid;
begin
  select scratch_bit_id into v_scratch from app.scratch_breakdowns where user_id = p_user and id = p_source;
  insert into app.staged_candidates (id, user_id, scratch_bit_id, source_breakdown_id, result_type, created_at, updated_at)
  values (gen_random_uuid(), p_user, v_scratch, p_source, p_type,
          p_now - 1800000 + p_n, p_now - 1800000 + p_n);
end
$$;

create function dev.seed_fixture(p_user_id uuid, p_scenario jsonb default '{}')
  returns jsonb
  language plpgsql volatile security definer set search_path = ''
  as $$
declare
  c_min constant bigint := 60000;
  c_hour constant bigint := 3600000;
  c_day constant bigint := 86400000;
  v_now bigint;
  v_overflow boolean := false;
  v_envelope jsonb;
  v_ids jsonb := '{}'::jsonb;
  v_inbox uuid;
  v_archive uuid;
  v_sysfolder uuid;
  v_apps uuid;
  v_docs uuid;
  v_bitonly uuid;
  v_full uuid;
  v_ext uuid;
  v_cpanels uuid;
  v_sound uuid;
  v_s uuid[] := '{}';
  v_stage uuid[] := '{}';
  v_place uuid[] := '{}';
  v_staged_only uuid[] := '{}';
  v_key text;
  v_i integer;
  v_text text;
  v_dummy uuid;
begin
  if p_scenario is null or jsonb_typeof(p_scenario) <> 'object' then
    raise exception 'scenario must be a JSON object' using errcode = '22023';
  end if;
  for v_key in select jsonb_object_keys(p_scenario) loop
    if v_key <> 'overflow' then
      raise exception 'unknown scenario option %', v_key using errcode = '22023';
    end if;
  end loop;
  if p_scenario ? 'overflow' then
    if jsonb_typeof(p_scenario -> 'overflow') <> 'boolean' then
      raise exception 'overflow must be a boolean' using errcode = '22023';
    end if;
    v_overflow := (p_scenario ->> 'overflow')::boolean;
  end if;

  if p_user_id is null or not dev.is_fixture_user(p_user_id) then
    raise exception 'not a fixture test user' using errcode = '42501';
  end if;

  -- RLS and ensure_account() read the caller from the JWT claims, which a service_role
  -- call does not carry: act as the fixture user for this transaction only.
  perform set_config('request.jwt.claims',
    jsonb_build_object('sub', p_user_id::text, 'role', 'authenticated')::text, true);

  v_envelope := public.ensure_account(dev.reserved_cells());
  if v_envelope ->> 'status' <> 'applied' then
    raise exception 'ensure_account answered %', v_envelope::text;
  end if;

  perform 1 from app.accounts where user_id = p_user_id for update;
  v_now := internal.now_ms();

  delete from app.staged_candidates where user_id = p_user_id;
  delete from app.scratch_breakdowns where user_id = p_user_id;
  delete from app.chunks where user_id = p_user_id;
  delete from app.bits where user_id = p_user_id;
  delete from app.nodes where user_id = p_user_id and system_role is null;

  -- The system Nodes come back to the first two cells outside the reserved block.
  update app.nodes set deleted_at = null, archived_at = null, hidden_from_grid = false,
         x = 3, y = 0, mtime = v_now
   where user_id = p_user_id and system_role = 'inbox' returning id into v_inbox;
  update app.nodes set deleted_at = null, archived_at = null, hidden_from_grid = false,
         x = 4, y = 0, mtime = v_now
   where user_id = p_user_id and system_role = 'archive_view' returning id into v_archive;
  if v_inbox is null or v_archive is null then
    raise exception 'the system Nodes are missing';
  end if;

  -- L0 and the Explorer hierarchy.
  v_sysfolder := dev.put_node(p_user_id, v_now, 'System Folder', null, 0, 'Settings');
  v_apps := dev.put_node(p_user_id, v_now, 'Applications', null, 0, 'Layers');
  v_docs := dev.put_node(p_user_id, v_now, 'Documents', null, 0);
  v_bitonly := dev.put_node(p_user_id, v_now, 'Bit only folder', null, 0);
  v_full := dev.put_node(p_user_id, v_now, 'Full folder', null, 0, 'Box');
  v_ext := dev.put_node(p_user_id, v_now, 'Extensions', v_sysfolder, 1);
  v_cpanels := dev.put_node(p_user_id, v_now, 'Control Panels', v_sysfolder, 1);
  v_dummy := dev.put_node(p_user_id, v_now, 'MacPaint', v_apps, 1, 'Palette');
  v_sound := dev.put_node(p_user_id, v_now, 'Sound', v_cpanels, 2);
  v_dummy := dev.put_node(p_user_id, v_now, 'Monitors', v_cpanels, 2);

  -- Bits for Finder cards: duplicates, metadata, completion and a 200-character title.
  v_dummy := dev.put_bit(p_user_id, v_now, 'Finder 7.0', v_sysfolder);
  v_dummy := dev.put_bit(p_user_id, v_now, 'HyperCard 2.1', v_apps);
  v_dummy := dev.put_bit(p_user_id, v_now, 'Quarterly report', v_docs);
  v_dummy := dev.put_bit(p_user_id, v_now, 'Review note', v_docs);
  v_dummy := dev.put_bit(p_user_id, v_now, 'Review note', v_docs);
  v_dummy := dev.put_bit(p_user_id, v_now, 'High priority with deadline', v_docs,
    p_priority => 'high', p_deadline => v_now + c_day);
  v_dummy := dev.put_bit(p_user_id, v_now, 'Overdue Bit', v_docs, p_deadline => v_now - c_day);
  v_dummy := dev.put_bit(p_user_id, v_now, 'Completed Bit', v_docs,
    p_status => 'complete', p_mtime => v_now - 10 * c_day);
  v_dummy := dev.put_bit(p_user_id, v_now, 'Completed overdue Bit', v_docs,
    p_status => 'complete', p_deadline => v_now - c_day);
  v_dummy := dev.put_bit(p_user_id, v_now, rpad('Long Bit title at the 200-character limit ', 200, 'x'), v_docs,
    p_priority => 'mid');
  v_dummy := dev.put_bit(p_user_id, v_now, 'Mid priority note', v_docs, p_priority => 'mid');
  v_dummy := dev.put_bit(p_user_id, v_now, 'Bit only note', v_bitonly);
  v_dummy := dev.put_bit(p_user_id, v_now, 'Volume settings', v_sound);
  -- Trash and Archive states: a recent Trash entry, two past the 30-day retention, an
  -- Archived Bit. They sit last so the active Bits above keep the first cells.
  v_dummy := dev.put_bit(p_user_id, v_now, 'Trashed two days ago', v_docs, p_deleted_at => v_now - 2 * c_day);
  v_dummy := dev.put_bit(p_user_id, v_now, 'Trashed 45 days ago', v_docs, p_deleted_at => v_now - 45 * c_day);
  v_dummy := dev.put_node(p_user_id, v_now, 'Trashed Node 40 days ago', null, 0, 'Folder', v_now - 40 * c_day);
  v_dummy := dev.put_bit(p_user_id, v_now, 'Archived last week', v_docs, p_archived_at => v_now - 7 * c_day);

  -- The Full folder: every cell outside the reserved block holds a Bit.
  insert into app.bits (id, user_id, title, icon, mtime, created_at, parent_id, x, y)
  select gen_random_uuid(), p_user_id, 'Occupied ' || gx || ',' || gy, 'FileText', v_now, v_now, v_full, gx, gy
    from generate_series(0, 17) gx, generate_series(0, 8) gy
   where not (gx < 3 and gy < 2);

  if v_overflow then
    for v_i in 0 .. 39 loop
      v_dummy := dev.put_node(p_user_id, v_now, 'Column anchor ' || v_i, null, 0);
    end loop;
  end if;

  -- Inbox Scratches. Ages cover the relative-date labels and the absolute date.
  v_s[1] := dev.put_bit(p_user_id, v_now, 'Plan the field study', v_inbox, 'Lightbulb',
    p_created_at => v_now - 45 * c_min, p_mtime => v_now - 45 * c_min);
  v_s[2] := dev.put_bit(p_user_id, v_now, 'Collect workshop feedback', v_inbox, 'Lightbulb',
    p_created_at => v_now - 26 * c_hour, p_mtime => v_now - 26 * c_hour);
  v_s[3] := dev.put_bit(p_user_id, v_now, 'Placement title limits', v_inbox, 'Lightbulb',
    p_created_at => v_now - 52 * c_hour, p_mtime => v_now - 52 * c_hour);
  v_s[4] := dev.put_bit(p_user_id, v_now, 'Ready to archive', v_inbox, 'Lightbulb',
    p_created_at => v_now - 6 * c_day, p_mtime => v_now - 6 * c_day);
  v_s[5] := dev.put_bit(p_user_id, v_now, 'Waiting on one row', v_inbox, 'Lightbulb',
    p_created_at => v_now - 10 * c_day, p_mtime => v_now - 10 * c_day);
  v_s[6] := dev.put_bit(p_user_id, v_now, 'Empty scratch', v_inbox, 'Lightbulb',
    p_created_at => v_now - 30 * c_day, p_mtime => v_now - 30 * c_day);
  v_s[7] := dev.put_bit(p_user_id, v_now, rpad('Long Scratch title at the 200-character limit ', 200, 'x'), v_inbox,
    'Lightbulb', p_created_at => v_now - 2 * c_hour, p_mtime => v_now - 2 * c_hour);
  v_s[8] := dev.put_bit(p_user_id, v_now, 'Staged only', v_inbox, 'Lightbulb',
    p_created_at => v_now - 14 * c_day, p_mtime => v_now - 14 * c_day);

  -- Staging: open rows with one Node and one Bit candidate.
  v_i := 0;
  foreach v_text in array array['Review the field notes', 'Draft the study summary', 'Book the meeting room',
    'Send the participant list', 'Archive the old drafts'] loop
    v_stage[v_i + 1] := dev.put_row(p_user_id, v_now, v_s[1], v_text, v_i);
    v_i := v_i + 1;
  end loop;
  perform dev.put_stage(p_user_id, v_now, v_stage[1], 'node', 0);
  perform dev.put_stage(p_user_id, v_now, v_stage[2], 'bit', 1);
  -- Breakdown: 20 rows for scrolling, the first two consumed.
  for v_i in 0 .. 19 loop
    v_dummy := dev.put_row(p_user_id, v_now, v_s[2], 'Workshop feedback item ' || (v_i + 1), v_i, v_i < 2);
  end loop;
  -- Placement: result-title limits are 100 (Node) and 200 (Bit) characters.
  v_place[1] := dev.put_row(p_user_id, v_now, v_s[3], 'Implement pixel-perfect window dragging', 0);
  v_place[2] := dev.put_row(p_user_id, v_now, v_s[3], rpad('Row at the Node title limit, 100 characters ', 100, 'x'), 1);
  v_place[3] := dev.put_row(p_user_id, v_now, v_s[3], rpad('Row one over the Node title limit, 101 characters ', 101, 'x'), 2);
  v_place[4] := dev.put_row(p_user_id, v_now, v_s[3], rpad('Row at the Bit title limit, 200 characters ', 200, 'x'), 3);
  v_place[5] := dev.put_row(p_user_id, v_now, v_s[3], rpad('Row one over the Bit title limit, 201 characters ', 201, 'x'), 4);
  v_place[6] := dev.put_row(p_user_id, v_now, v_s[3], rpad('Row at the 1000-character content limit ', 1000, 'x'), 5);
  v_place[7] := dev.put_row(p_user_id, v_now, v_s[3], 'System setup', 6);
  v_place[8] := dev.put_row(p_user_id, v_now, v_s[3], 'Configure AppleTalk', 7);
  perform dev.put_stage(p_user_id, v_now, v_place[7], 'node', 2);
  perform dev.put_stage(p_user_id, v_now, v_place[8], 'bit', 3);
  perform dev.put_stage(p_user_id, v_now, v_place[3], 'node', 4);
  perform dev.put_stage(p_user_id, v_now, v_place[5], 'bit', 5);
  -- Completion and Archive: eligible, an open row, empty, and staged-only.
  v_i := 0;
  foreach v_text in array array['Confirm the venue', 'Send the invitations', 'Print the agenda'] loop
    v_dummy := dev.put_row(p_user_id, v_now, v_s[4], v_text, v_i, true);
    v_i := v_i + 1;
  end loop;
  v_dummy := dev.put_row(p_user_id, v_now, v_s[5], 'Collect the receipts', 0, true);
  v_dummy := dev.put_row(p_user_id, v_now, v_s[5], 'File the expense report', 1);
  v_dummy := dev.put_row(p_user_id, v_now, v_s[8], 'Order the supplies', 0, true);
  v_staged_only[1] := dev.put_row(p_user_id, v_now, v_s[8], 'Pick up the badges', 1);
  perform dev.put_stage(p_user_id, v_now, v_staged_only[1], 'bit', 6);

  v_ids := jsonb_build_object(
    'inbox', v_inbox, 'archive', v_archive, 'systemFolder', v_sysfolder, 'documents', v_docs,
    'fullFolder', v_full, 'depth2Target', v_sound,
    'stagingScratch', v_s[1], 'longBreakdownScratch', v_s[2], 'titleLimitScratch', v_s[3],
    'archiveEligibleScratch', v_s[4], 'activeRowScratch', v_s[5], 'emptyScratch', v_s[6],
    'longTitleScratch', v_s[7], 'stagedOnlyScratch', v_s[8]);
  return jsonb_build_object(
    'ids', v_ids,
    'inboxRoute', '/grid/' || v_inbox,
    'counts', jsonb_build_object(
      'nodes', (select count(*) from app.nodes where user_id = p_user_id),
      'bits', (select count(*) from app.bits where user_id = p_user_id),
      'scratchBreakdowns', (select count(*) from app.scratch_breakdowns where user_id = p_user_id),
      'stagedCandidates', (select count(*) from app.staged_candidates where user_id = p_user_id)));
end
$$;

alter function dev.put_node(uuid, bigint, text, uuid, integer, text, bigint) owner to griddo_writer;
alter function dev.put_bit(uuid, bigint, text, uuid, text, text, bigint, text, bigint, bigint, bigint, bigint) owner to griddo_writer;
alter function dev.put_row(uuid, bigint, uuid, text, integer, boolean) owner to griddo_writer;
alter function dev.put_stage(uuid, bigint, uuid, text, integer) owner to griddo_writer;
alter function dev.reserved_cells() owner to griddo_writer;
alter function dev.seed_fixture(uuid, jsonb) owner to griddo_writer;

revoke all on function dev.is_fixture_user(uuid) from public, anon, authenticated, service_role;
revoke all on function dev.reserved_cells() from public, anon, authenticated, service_role;
revoke all on function dev.put_node(uuid, bigint, text, uuid, integer, text, bigint) from public, anon, authenticated, service_role;
revoke all on function dev.put_bit(uuid, bigint, text, uuid, text, text, bigint, text, bigint, bigint, bigint, bigint) from public, anon, authenticated, service_role;
revoke all on function dev.put_row(uuid, bigint, uuid, text, integer, boolean) from public, anon, authenticated, service_role;
revoke all on function dev.put_stage(uuid, bigint, uuid, text, integer) from public, anon, authenticated, service_role;
revoke all on function dev.seed_fixture(uuid, jsonb) from public, anon, authenticated;
grant execute on function dev.is_fixture_user(uuid) to griddo_writer;
grant execute on function dev.reserved_cells() to griddo_writer;
grant execute on function dev.put_node(uuid, bigint, text, uuid, integer, text, bigint) to griddo_writer;
grant execute on function dev.put_bit(uuid, bigint, text, uuid, text, text, bigint, text, bigint, bigint, bigint, bigint) to griddo_writer;
grant execute on function dev.put_row(uuid, bigint, uuid, text, integer, boolean) to griddo_writer;
grant execute on function dev.put_stage(uuid, bigint, uuid, text, integer) to griddo_writer;
grant execute on function dev.seed_fixture(uuid, jsonb) to service_role;

revoke create on schema dev from griddo_writer;
