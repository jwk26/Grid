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
alter function public.archive_scratch(uuid, integer) owner to griddo_writer;
revoke all on function public.archive_scratch(uuid, integer) from public, anon, service_role;
revoke all on function public.classify_archive_scratch_recovery(uuid, integer, bigint) from public, anon, service_role;
grant execute on function public.archive_scratch(uuid, integer) to authenticated;
grant execute on function public.classify_archive_scratch_recovery(uuid, integer, bigint) to authenticated;
revoke create on schema internal from griddo_writer;
revoke create on schema public from griddo_writer;
