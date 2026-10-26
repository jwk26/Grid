-- Task 224: the Archive and Trash Scratch commands (SCHEMA §Atomic command matrix: Archive Scratch,
-- Trash Scratch; §Operation reconciliation; Hooks 13 and 15), ported from archiveScratch /
-- classifyArchiveScratchRecovery / trashScratch / reconcileTrashScratch and their
-- readScratchArchiveState / readTrashScratchState / matchesTrashScratch* helpers in indexeddb.ts,
-- which are the answer key. Same shape as the Task 221-223 commands: `security definer`, owner
-- griddo_writer, no `operationId` parameter, a one-statement `security invoker` reconcile that
-- rejects only `account_missing`.
--
-- Locks (SCHEMA §Locks): the Inbox Node and the Scratch Bit `for update` (internal.lock_bit_and_node),
-- then the check that the Scratch is a child of the Inbox Node, before any other row is locked (a
-- non-Inbox Bit as the Scratch would otherwise make us hold its Grid Node first). Every Stage,
-- Unstage, Delete, Add, Place and Undo locks the Scratch before it touches a row of it, so the counts
-- Archive reads under the Scratch lock cannot change before it commits.

grant create on schema internal to griddo_writer;
grant create on schema public to griddo_writer;

-- The current rows of a Scratch as `changes`: the Scratch, its Breakdown rows and its staged
-- candidates, so a stale tab can derive eligibility again (Hook 15).
create function internal.scratch_view(p_user uuid, p_scratch uuid) returns jsonb
  language sql stable security invoker set search_path = ''
  as $$
    select internal.inbox_changes(
      p_bits => (select coalesce(jsonb_agg(to_jsonb(b)), '[]'::jsonb) from app.bits b
                  where b.user_id = p_user and b.id = p_scratch),
      p_breakdowns => (select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb) from app.scratch_breakdowns r
                        where r.user_id = p_user and r.scratch_bit_id = p_scratch),
      p_candidates => (select coalesce(jsonb_agg(to_jsonb(c) order by c.id), '[]'::jsonb) from app.staged_candidates c
                        where c.user_id = p_user and c.scratch_bit_id = p_scratch)
    )
  $$;
alter function internal.scratch_view(uuid, uuid) owner to griddo_writer;
revoke all on function internal.scratch_view(uuid, uuid) from public;
grant execute on function internal.scratch_view(uuid, uuid) to griddo_writer;

-- The current rows a Trash Scratch involves, as `changes`: the Scratch, its current candidates, and
-- the source rows of both the current and the submitted candidates (the caller's account only).
create function internal.trash_view(p_user uuid, p_scratch uuid, p_source_ids uuid[]) returns jsonb
  language sql stable security invoker set search_path = ''
  as $$
    select internal.inbox_changes(
      p_bits => (select coalesce(jsonb_agg(to_jsonb(b)), '[]'::jsonb) from app.bits b
                  where b.user_id = p_user and b.id = p_scratch),
      p_breakdowns => (select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb) from app.scratch_breakdowns r
                        where r.user_id = p_user
                          and (r.id = any (coalesce(p_source_ids, '{}'))
                               or r.id in (select c.source_breakdown_id from app.staged_candidates c
                                            where c.user_id = p_user and c.scratch_bit_id = p_scratch))),
      p_candidates => (select coalesce(jsonb_agg(to_jsonb(c) order by c.id), '[]'::jsonb) from app.staged_candidates c
                        where c.user_id = p_user and c.scratch_bit_id = p_scratch)
    )
  $$;
alter function internal.trash_view(uuid, uuid, uuid[]) owner to griddo_writer;
revoke all on function internal.trash_view(uuid, uuid, uuid[]) from public;
grant execute on function internal.trash_view(uuid, uuid, uuid[]) to griddo_writer;

-- ---------------------------------------------------------------------------------------------
-- archive_scratch(p_scratch_id, p_expected_version)
-- Sets only `archived_at` and `mtime` to now and increments the Scratch version once; rows and
-- candidates are not written, and the Inbox Node's mtime is not touched (as Dexie). The caller's
-- page-local blockers (Add draft, title editor) are rechecked by the client coordinator before
-- dispatch; the database cannot read them. Result: {id} (the Scratch id). Order, as Dexie:
-- already_applied (active Inbox owner, archived, version = expected + 1); a missing, trashed or
-- archived Scratch `rejected`; a version mismatch `conflict`; Hook 15 not met `rejected`.
-- Rejection codes: `not_found` (no Scratch), `invalid_target` (not a child of the Inbox Node, not
-- active, or not eligible). A Bit that is not a child of the Inbox Node is `invalid_target` before
-- its version is looked at, where Dexie says `conflict` for a wrong version (Task 223 precedent).
create function public.archive_scratch(p_scratch_id uuid, p_expected_version integer) returns jsonb
  language plpgsql volatile security definer set search_path = ''
  as $$
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
$$;

-- Read-only classification for a reload that found an Archive descriptor (SCHEMA §Repository
-- Operation Contract, Archive Scratch). `applied`: the Scratch is archived, not trashed, at
-- expected + 1, `archived_at >= p_started_at`, `mtime = archived_at`, under an active Inbox Node,
-- and its Breakdown rows and candidates still meet Hook 15. `not_applied`: the Scratch is active at
-- the expected version under an active Inbox Node and Hook 15 holds. Anything else, including a
-- missing Scratch or a null or non-positive argument, is `conflict`. `p_started_at` is client time
-- in ms and `archived_at` is server time; the comparison is Dexie's (the stale-descriptor case).
-- There is no operation table: the answer comes from the Scratch and its rows alone.
create function public.classify_archive_scratch_recovery(
  p_scratch_id uuid, p_expected_version integer, p_started_at bigint
) returns jsonb
  language sql stable security invoker set search_path = ''
  as $$
    with u as (select (select auth.uid()) as id),
    acct as (select exists (select 1 from app.accounts a, u where a.user_id = u.id) as ok),
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
    select case when verdict.s = 'account_missing'
      then jsonb_build_object('status', 'rejected', 'result', null, 'changes', '{}'::jsonb,
                              'rejection', jsonb_build_object('code', 'account_missing'))
      else jsonb_build_object('status', verdict.s, 'result', null, 'changes', coalesce((select jsonb_object_agg(t.k, t.v) from (values
        ('bits', case when exists (select 1 from sc) then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(sc)) from sc), 'deleted', '[]'::jsonb) end),
        ('scratch_breakdowns', case when exists (select 1 from rws) then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(rws) order by rws.id) from rws), 'deleted', '[]'::jsonb) end),
        ('staged_candidates', case when exists (select 1 from cds) then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(cds) order by cds.id) from cds), 'deleted', '[]'::jsonb) end)
      ) as t(k, v) where t.v is not null), '{}'::jsonb))
    end
    from verdict
  $$;

-- ---------------------------------------------------------------------------------------------
-- trash_scratch(p_scratch_id, p_expected_version, p_candidates)
-- p_candidates is the exact staged-candidate set the confirmation showed, a jsonb array (possibly
-- empty) of {candidate_id, candidate_expected_version, source_breakdown_id, source_expected_version}.
-- A malformed array or a candidate or source id repeated in it raises 22023 (Dexie's Zod throws).
-- Deletes each candidate, increments each source row's version once (the Unstage effect), sets the
-- Scratch's `deleted_at` and `mtime` to now with version + 1, and touches the Inbox Node's `mtime`
-- (Hook 1; its version stays). Result: {id} (the Scratch id). Order, as Dexie: already_applied (the
-- complete postcondition); a Scratch that is not a child of the Inbox Node `rejected`
-- (`invalid_target`); anything but the exact precondition `conflict` (a missing Scratch, a changed
-- Scratch, candidate or source version, an added or removed candidate, an archived or trashed Scratch).
-- Agent choices: the postcondition also requires each submitted source to belong to this Scratch
-- (stricter than Dexie, unreachable except by a crafted request); "a current candidate's source cannot
-- be resolved" is not ported, since the foreign key makes it unreachable.
create function public.trash_scratch(p_scratch_id uuid, p_expected_version integer, p_candidates jsonb) returns jsonb
  language plpgsql volatile security definer set search_path = ''
  as $$
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
$$;

-- Read-only classification of trash_scratch: already_applied (the complete postcondition),
-- not_applied (the exact precondition), else conflict. A malformed or repeated set is conflict (the
-- write command raises 22023). A confirmed restore advanced the Scratch version again, and a
-- candidate staged after the confirmation changes the current set, so neither is the precondition.
create function public.reconcile_trash_scratch(p_scratch_id uuid, p_expected_version integer, p_candidates jsonb)
  returns jsonb
  language sql stable security invoker set search_path = ''
  as $$
    with u as (select (select auth.uid()) as id),
    acct as (select exists (select 1 from app.accounts a, u where a.user_id = u.id) as ok),
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
    select case when verdict.s = 'account_missing'
      then jsonb_build_object('status', 'rejected', 'result', null, 'changes', '{}'::jsonb,
                              'rejection', jsonb_build_object('code', 'account_missing'))
      else jsonb_build_object('status', verdict.s, 'result', null, 'changes', coalesce((select jsonb_object_agg(t.k, t.v) from (values
        ('bits', case when exists (select 1 from sc) then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(sc)) from sc), 'deleted', '[]'::jsonb) end),
        ('scratch_breakdowns', case when exists (select 1 from src) then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(src) order by src.id) from src), 'deleted', '[]'::jsonb) end),
        ('staged_candidates', case when exists (select 1 from cds) then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(cds) order by cds.id) from cds), 'deleted', '[]'::jsonb) end)
      ) as t(k, v) where t.v is not null), '{}'::jsonb))
    end
    from verdict
  $$;

-- ---------------------------------------------------------------------------------------------
alter function public.archive_scratch(uuid, integer) owner to griddo_writer;
alter function public.trash_scratch(uuid, integer, jsonb) owner to griddo_writer;
revoke all on function public.archive_scratch(uuid, integer) from public, anon, service_role;
revoke all on function public.classify_archive_scratch_recovery(uuid, integer, bigint) from public, anon, service_role;
revoke all on function public.trash_scratch(uuid, integer, jsonb) from public, anon, service_role;
revoke all on function public.reconcile_trash_scratch(uuid, integer, jsonb) from public, anon, service_role;
grant execute on function public.archive_scratch(uuid, integer) to authenticated;
grant execute on function public.trash_scratch(uuid, integer, jsonb) to authenticated;
grant execute on function public.reconcile_trash_scratch(uuid, integer, jsonb) to authenticated;
grant execute on function public.classify_archive_scratch_recovery(uuid, integer, bigint) to authenticated;
revoke create on schema internal from griddo_writer;
revoke create on schema public from griddo_writer;
