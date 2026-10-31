-- Task 237: the demo seed DP-SAAS-02 and ensure_account() step 3 (SCHEMA §Account preparation).
-- `internal.demo_seed()` holds the approved seed as data (docs/brainstorming/2026-10-21-saas-conversion/
-- DP-SAAS-02.md): symbolic keys for parents and sources, and times as offsets from the copy time, so
-- urgency and aging look alive whenever a visitor arrives (S42 (2)). `internal.copy_demo_seed()`
-- gives every row a new id, remaps parent and candidate-to-source references, and places each active
-- row with `internal.pick_free_cell` at its original cell, so a free cell is kept and a reserved one
-- is never used. Nothing here references the `dev` schema, which production does not have.
-- The copy writes rows directly, so it skips the write functions' checks: the seed is validated as
-- data by supabase/tests/demo-seed.db.test.ts. It returns every row it wrote, for the `changes` of
-- ensure_account(). The Inbox and Archive cells are never used by a seed row (SCHEMA §Account preparation).

grant create on schema internal to griddo_writer;

create function internal.demo_seed() returns jsonb
  language sql immutable security invoker set search_path = ''
  as $seed$ select '{
    "nodes": [
      {"key": "web", "parent": null, "title": "사이트 개편", "icon": "Globe", "color": "hsl(221, 60%, 45%)", "level": 0, "x": 6, "y": 2, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": 777600000},
      {"key": "off", "parent": null, "title": "팀 워크숍", "icon": "Users", "color": "hsl(160, 60%, 45%)", "level": 0, "x": 8, "y": 2, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": 259200000},
      {"key": "home", "parent": null, "title": "집안일", "icon": "Home", "color": "hsl(25, 60%, 45%)", "level": 0, "x": 10, "y": 2, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "spa", "parent": null, "title": "스페인어", "icon": "GraduationCap", "color": "hsl(340, 60%, 45%)", "level": 0, "x": 6, "y": 4, "mtime_ago": 1209600000, "created_ago": 1814400000, "deadline_in": null},
      {"key": "read", "parent": null, "title": "Reading list", "icon": "BookOpen", "color": "hsl(275, 60%, 45%)", "level": 0, "x": 8, "y": 4, "mtime_ago": 432000000, "created_ago": 1036800000, "deadline_in": null},
      {"key": "side", "parent": null, "title": "습관 앱", "icon": "Rocket", "color": "hsl(45, 60%, 45%)", "level": 0, "x": 10, "y": 4, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": 1814400000},
      {"key": "move", "parent": "home", "title": "이사", "icon": "ListTodo", "color": "hsl(25, 60%, 45%)", "level": 1, "x": 3, "y": 0, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "pack", "parent": "move", "title": "짐 싸기", "icon": "Box", "color": "hsl(25, 60%, 45%)", "level": 2, "x": 3, "y": 1, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null}
    ],
    "bits": [
      {"key": "b1", "node": "web", "title": "홈페이지 문구 쓰기", "icon": "FileText", "priority": "high", "status": "active", "x": 3, "y": 0, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": 72000000},
      {"key": "b2", "node": "web", "title": "색상 팔레트 정하기", "icon": "Palette", "priority": "mid", "status": "complete", "x": 4, "y": 0, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b3", "node": "web", "title": "Set up analytics", "icon": "Target", "priority": "low", "status": "active", "x": 5, "y": 0, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": 604800000},
      {"key": "b4", "node": "web", "title": "Redirect the old URLs", "icon": "Compass", "priority": "high", "status": "active", "x": 3, "y": 1, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": -86400000},
      {"key": "b5", "node": "web", "title": "예전 로고 시안", "icon": "Image", "priority": null, "status": "active", "x": 4, "y": 1, "mtime_ago": 1036800000, "created_ago": 1641600000, "deadline_in": null, "archived_ago": 864000000},
      {"key": "b6", "node": "off", "title": "장소 예약하기", "icon": "Building2", "priority": "high", "status": "active", "x": 3, "y": 0, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": 172800000},
      {"key": "b7", "node": "off", "title": "일정표 보내기", "icon": "CalendarDays", "priority": "mid", "status": "active", "x": 4, "y": 0, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": 259200000},
      {"key": "b8", "node": "off", "title": "식단 조사하기", "icon": "Coffee", "priority": "low", "status": "complete", "x": 5, "y": 0, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "b9", "node": "off", "title": "지난 분기 회고 노트", "icon": "Book", "priority": null, "status": "active", "x": 3, "y": 1, "mtime_ago": 1728000000, "created_ago": 2332800000, "deadline_in": null, "archived_ago": 432000000},
      {"key": "b10", "node": "home", "title": "여권 갱신하기", "icon": "Plane", "priority": "high", "status": "active", "x": 4, "y": 0, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": 2592000000},
      {"key": "b11", "node": "home", "title": "치과 예약하기", "icon": "Heart", "priority": "mid", "status": "active", "x": 5, "y": 0, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "b12", "node": "home", "title": "자전거 고치기", "icon": "Hammer", "priority": "low", "status": "active", "x": 6, "y": 0, "mtime_ago": 777600000, "created_ago": 1382400000, "deadline_in": null},
      {"key": "b13", "node": "move", "title": "우편물 전송 신청", "icon": "MessageSquare", "priority": "mid", "status": "active", "x": 3, "y": 0, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "b14", "node": "move", "title": "기존 인터넷 해지", "icon": "Globe", "priority": null, "status": "active", "x": 4, "y": 0, "mtime_ago": 777600000, "created_ago": 1382400000, "deadline_in": 1209600000},
      {"key": "b15", "node": "pack", "title": "책 포장하기", "icon": "BookOpen", "priority": null, "status": "active", "x": 3, "y": 0, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "b16", "node": "pack", "title": "주방 박스 라벨 붙이기", "icon": "Tag", "priority": null, "status": "active", "x": 4, "y": 0, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "b17", "node": "spa", "title": "5단원 끝내기", "icon": "GraduationCap", "priority": "mid", "status": "active", "x": 3, "y": 0, "mtime_ago": 1209600000, "created_ago": 1814400000, "deadline_in": null},
      {"key": "b18", "node": "spa", "title": "언어 교환 파트너와 연습하기", "icon": "Users", "priority": "low", "status": "active", "x": 4, "y": 0, "mtime_ago": 1728000000, "created_ago": 2332800000, "deadline_in": null},
      {"key": "b19", "node": "spa", "title": "자막 없이 한 편 보기", "icon": "Video", "priority": "low", "status": "active", "x": 5, "y": 0, "mtime_ago": 1382400000, "created_ago": 1987200000, "deadline_in": null},
      {"key": "b20", "node": "read", "title": "Finish The Pragmatic Programmer", "icon": "Book", "priority": "mid", "status": "active", "x": 3, "y": 0, "mtime_ago": 432000000, "created_ago": 1036800000, "deadline_in": null},
      {"key": "b21", "node": "read", "title": "Read the Postgres docs on RLS", "icon": "Lock", "priority": null, "status": "active", "x": 4, "y": 0, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "b22", "node": "read", "title": "Skim the React 19 release notes", "icon": "Code", "priority": "low", "status": "active", "x": 5, "y": 0, "mtime_ago": 950400000, "created_ago": 1555200000, "deadline_in": null},
      {"key": "b23", "node": "read", "title": "Reread chapter 3 of Designing Data-Intensive Applications", "icon": "Brain", "priority": "low", "status": "active", "x": 6, "y": 0, "mtime_ago": 1036800000, "created_ago": 1641600000, "deadline_in": null},
      {"key": "b24", "node": "side", "title": "첫 화면 스케치", "icon": "PenTool", "priority": "mid", "status": "active", "x": 3, "y": 0, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": 432000000},
      {"key": "b25", "node": "side", "title": "Ship a landing page", "icon": "Rocket", "priority": "high", "status": "active", "x": 4, "y": 0, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": 1209600000},
      {"key": "b26", "node": "side", "title": "Write the README", "icon": "FileText", "priority": "low", "status": "active", "x": 5, "y": 0, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b27", "node": "side", "title": "출시 스레드 초안", "icon": "MessageSquare", "priority": null, "status": "active", "x": 6, "y": 0, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null, "deleted_ago": 172800000},
      {"key": "s1", "node": "inbox", "title": "Plan the field study", "icon": "sparkles", "priority": null, "status": "active", "x": 3, "y": 0, "mtime_ago": 2700000, "created_ago": 2700000, "deadline_in": null},
      {"key": "s2", "node": "inbox", "title": "주말 여행 아이디어", "icon": "sparkles", "priority": null, "status": "active", "x": 4, "y": 0, "mtime_ago": 93600000, "created_ago": 93600000, "deadline_in": null},
      {"key": "s3", "node": "inbox", "title": "엄마 선물 아이디어", "icon": "sparkles", "priority": null, "status": "active", "x": 5, "y": 0, "mtime_ago": 259200000, "created_ago": 259200000, "deadline_in": null},
      {"key": "s4", "node": "inbox", "title": "Questions for Monday''s stand-up", "icon": "sparkles", "priority": null, "status": "active", "x": 6, "y": 0, "mtime_ago": 518400000, "created_ago": 518400000, "deadline_in": null}
    ],
    "chunks": [
      {"bit": "b1", "title": "히어로 문구 초안", "status": "complete", "order": 0, "time_in": -86400000},
      {"bit": "b1", "title": "후기 3개 고르기", "status": "incomplete", "order": 1, "time_in": 36000000},
      {"bit": "b1", "title": "문구 교정하기", "status": "incomplete", "order": 2, "time_in": 64800000},
      {"bit": "b2", "title": "팔레트 3개 비교하기", "status": "complete", "order": 0, "time_in": null},
      {"bit": "b2", "title": "명암비 확인하기", "status": "complete", "order": 1, "time_in": null},
      {"bit": "b6", "title": "후보지 3곳 추리기", "status": "complete", "order": 0, "time_in": null},
      {"bit": "b6", "title": "1순위 장소에 전화하기", "status": "incomplete", "order": 1, "time_in": 129600000},
      {"bit": "b6", "title": "예약금 내기", "status": "incomplete", "order": 2, "time_in": 172800000},
      {"bit": "b24", "title": "종이 와이어프레임", "status": "complete", "order": 0, "time_in": null},
      {"bit": "b24", "title": "폰트 고르기", "status": "incomplete", "order": 1, "time_in": 345600000}
    ],
    "rows": [
      {"key": "r1", "scratch": "s1", "content": "Review the field notes", "order": 0, "created_ago": 2700000},
      {"key": "r2", "scratch": "s1", "content": "Draft the study summary", "order": 1, "created_ago": 2699000},
      {"key": "r3", "scratch": "s1", "content": "Book the meeting room", "order": 2, "created_ago": 2698000},
      {"key": "r4", "scratch": "s1", "content": "Send the participant list", "order": 3, "created_ago": 2697000},
      {"key": "r5", "scratch": "s1", "content": "Archive the old drafts", "order": 4, "created_ago": 2696000},
      {"key": "r6", "scratch": "s2", "content": "기차 시간 확인하기", "order": 0, "created_ago": 93600000},
      {"key": "r7", "scratch": "s2", "content": "반려견 동반 숙소 찾기", "order": 1, "created_ago": 93599000},
      {"key": "r8", "scratch": "s2", "content": "등산화 챙기기", "order": 2, "created_ago": 93598000},
      {"key": "r9", "scratch": "s2", "content": "민수에게 차 빌릴 수 있는지 묻기", "order": 3, "created_ago": 93597000},
      {"key": "r10", "scratch": "s4", "content": "Is the deploy freeze still on?", "order": 0, "created_ago": 518400000},
      {"key": "r11", "scratch": "s4", "content": "Who owns the analytics ticket?", "order": 1, "created_ago": 518399000}
    ],
    "candidates": [
      {"row": "r1", "type": "node", "created_ago": 2640000},
      {"row": "r2", "type": "bit", "created_ago": 2639000}
    ]
  }'::jsonb $seed$;

-- Copies the seed into p_user's account. p_inbox is the account's active Inbox Node, or null (the
-- Scratches and their Breakdown rows are then skipped). A seed Node whose parent was skipped, or
-- that finds no free cell, is skipped with its descendants: entry is never blocked.
create function internal.copy_demo_seed(p_user uuid, p_now bigint, p_inbox uuid, p_reserved jsonb)
  returns jsonb
  language plpgsql volatile security invoker set search_path = ''
  as $copy$
declare
  v_seed jsonb := internal.demo_seed();
  v_ids jsonb := '{}'::jsonb;
  v_item jsonb;
  v_id uuid;
  v_parent uuid;
  v_x integer;
  v_y integer;
  v_row jsonb;
  v_nodes jsonb := '[]'::jsonb;
  v_bits jsonb := '[]'::jsonb;
  v_chunks jsonb := '[]'::jsonb;
  v_rows jsonb := '[]'::jsonb;
  v_candidates jsonb := '[]'::jsonb;
  v_chunk jsonb;
  v_archived bigint;
  v_deleted bigint;
begin
  if p_inbox is not null then
    v_ids := jsonb_build_object('inbox', p_inbox);
  end if;

  for v_item in select value from jsonb_array_elements(v_seed -> 'nodes') loop
    v_parent := null;
    if v_item ->> 'parent' is not null then
      if not v_ids ? (v_item ->> 'parent') then
        continue;
      end if;
      v_parent := (v_ids ->> (v_item ->> 'parent'))::uuid;
    end if;
    v_x := null;
    select f.x, f.y into v_x, v_y
      from internal.pick_free_cell(p_user, v_parent, p_reserved, (v_item ->> 'x')::integer, (v_item ->> 'y')::integer) f;
    if v_x is null then
      continue;
    end if;
    v_id := gen_random_uuid();
    insert into app.nodes (id, user_id, title, color, icon, deadline, mtime, created_at, parent_id, level, x, y)
    values (v_id, p_user, v_item ->> 'title', v_item ->> 'color', v_item ->> 'icon',
            p_now + (v_item ->> 'deadline_in')::bigint,
            p_now - (v_item ->> 'mtime_ago')::bigint, p_now - (v_item ->> 'created_ago')::bigint,
            v_parent, (v_item ->> 'level')::integer, v_x, v_y)
    returning to_jsonb(app.nodes.*) into v_row;
    v_nodes := v_nodes || jsonb_build_array(v_row);
    v_ids := v_ids || jsonb_build_object(v_item ->> 'key', v_id);
  end loop;

  for v_item in select value from jsonb_array_elements(v_seed -> 'bits') loop
    if not v_ids ? (v_item ->> 'node') or (v_item ->> 'node' = 'inbox' and p_inbox is null) then
      continue;
    end if;
    v_parent := (v_ids ->> (v_item ->> 'node'))::uuid;
    v_archived := p_now - (v_item ->> 'archived_ago')::bigint;
    v_deleted := p_now - (v_item ->> 'deleted_ago')::bigint;
    v_x := (v_item ->> 'x')::integer;
    v_y := (v_item ->> 'y')::integer;
    if v_archived is null and v_deleted is null then
      v_x := null;
      select f.x, f.y into v_x, v_y
        from internal.pick_free_cell(p_user, v_parent, p_reserved, (v_item ->> 'x')::integer, (v_item ->> 'y')::integer) f;
      if v_x is null then
        continue;
      end if;
    end if;
    v_id := gen_random_uuid();
    insert into app.bits (id, user_id, title, icon, priority, status, deadline, mtime, created_at,
                          parent_id, x, y, archived_at, deleted_at)
    values (v_id, p_user, v_item ->> 'title', v_item ->> 'icon', v_item ->> 'priority', v_item ->> 'status',
            p_now + (v_item ->> 'deadline_in')::bigint,
            p_now - (v_item ->> 'mtime_ago')::bigint, p_now - (v_item ->> 'created_ago')::bigint,
            v_parent, v_x, v_y, v_archived, v_deleted)
    returning to_jsonb(app.bits.*) into v_row;
    v_bits := v_bits || jsonb_build_array(v_row);
    v_ids := v_ids || jsonb_build_object(v_item ->> 'key', v_id);
  end loop;

  for v_chunk in select value from jsonb_array_elements(v_seed -> 'chunks') loop
    if not v_ids ? (v_chunk ->> 'bit') then
      continue;
    end if;
    insert into app.chunks (id, user_id, title, status, time, "order", parent_id)
    values (gen_random_uuid(), p_user, v_chunk ->> 'title', v_chunk ->> 'status',
            p_now + (v_chunk ->> 'time_in')::bigint, (v_chunk ->> 'order')::integer,
            (v_ids ->> (v_chunk ->> 'bit'))::uuid)
    returning to_jsonb(app.chunks.*) into v_row;
    v_chunks := v_chunks || jsonb_build_array(v_row);
  end loop;

  for v_item in select value from jsonb_array_elements(v_seed -> 'rows') loop
    if not v_ids ? (v_item ->> 'scratch') then
      continue;
    end if;
    v_id := gen_random_uuid();
    insert into app.scratch_breakdowns (id, user_id, scratch_bit_id, content, "order", created_at)
    values (v_id, p_user, (v_ids ->> (v_item ->> 'scratch'))::uuid, v_item ->> 'content',
            (v_item ->> 'order')::integer, p_now - (v_item ->> 'created_ago')::bigint)
    returning to_jsonb(app.scratch_breakdowns.*) into v_row;
    v_rows := v_rows || jsonb_build_array(v_row);
    v_ids := v_ids || jsonb_build_object(v_item ->> 'key', v_id);
  end loop;

  for v_item in select value from jsonb_array_elements(v_seed -> 'candidates') loop
    if not v_ids ? (v_item ->> 'row') then
      continue;
    end if;
    insert into app.staged_candidates (id, user_id, scratch_bit_id, source_breakdown_id, result_type,
                                       created_at, updated_at)
    select gen_random_uuid(), p_user, r.scratch_bit_id, r.id, v_item ->> 'type',
           p_now - (v_item ->> 'created_ago')::bigint, p_now - (v_item ->> 'created_ago')::bigint
      from app.scratch_breakdowns r
     where r.user_id = p_user and r.id = (v_ids ->> (v_item ->> 'row'))::uuid
    returning to_jsonb(app.staged_candidates.*) into v_row;
    v_candidates := v_candidates || jsonb_build_array(v_row);
  end loop;

  return jsonb_build_object('nodes', v_nodes, 'bits', v_bits, 'chunks', v_chunks,
                            'scratch_breakdowns', v_rows, 'staged_candidates', v_candidates);
end
$copy$;

alter function internal.demo_seed() owner to griddo_writer;
alter function internal.copy_demo_seed(uuid, bigint, uuid, jsonb) owner to griddo_writer;
revoke all on function internal.demo_seed() from public;
revoke all on function internal.copy_demo_seed(uuid, bigint, uuid, jsonb) from public;
grant execute on function internal.demo_seed() to griddo_writer;
grant execute on function internal.copy_demo_seed(uuid, bigint, uuid, jsonb) to griddo_writer;

-- ensure_account() with step 3. Same signature, owner and grants as Task 235's definition.
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
  v_inbox uuid;
  v_seeded jsonb := null;
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

revoke create on schema internal from griddo_writer;
