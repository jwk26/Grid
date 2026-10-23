-- Task 214: account tables, constraints and RLS (SCHEMA.md section Postgres Target).
-- String lengths are counted in UTF-16 code units and the color pattern uses explicit
-- character sets, so every CHECK gives the same verdict as the Zod schemas (S12, S33).

create schema if not exists app;
create schema if not exists internal;

-- Postgres grants EXECUTE on new functions to everyone, and Supabase adds default grants
-- per schema. Revoke both, for functions created by the migration role (S29 (1)).
alter default privileges for role postgres revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema app revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema internal revoke execute on functions from public, anon, authenticated;

revoke all on schema app from public, anon;
revoke all on schema internal from public, anon, authenticated;
grant usage on schema app to authenticated;

create table app.accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at bigint not null check (created_at > 0),
  last_visit_at bigint not null check (last_visit_at > 0),
  seeded_at bigint check (seeded_at > 0),
  deletion_requested_at bigint check (deletion_requested_at > 0)
);

create table app.nodes (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check ((char_length(title) + char_length(regexp_replace(title, '[^\U00010000-\U0010FFFF]', '', 'g'))) between 1 and 100),
  color text not null check (color ~ '^hsl\([0-9]{1,3},[ \t\n\r\f\v\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]*[0-9]{1,3}%,[ \t\n\r\f\v\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]*[0-9]{1,3}%\)$'),
  icon text not null check ((char_length(icon) + char_length(regexp_replace(icon, '[^\U00010000-\U0010FFFF]', '', 'g'))) between 1 and 64),
  deadline bigint check (deadline > 0),
  deadline_all_day boolean not null default false,
  mtime bigint not null check (mtime > 0),
  created_at bigint not null check (created_at > 0),
  version integer not null default 1 check (version >= 1),
  parent_id uuid,
  level integer not null check (level between 0 and 2),
  x integer not null check (x between 0 and 17),
  y integer not null check (y between 0 and 8),
  deleted_at bigint check (deleted_at > 0),
  archived_at bigint check (archived_at > 0),
  system_role text check (system_role in ('inbox', 'archive_view')),
  hidden_from_grid boolean not null default false,
  past_deadline_dismissed boolean not null default false,
  unique (user_id, id),
  foreign key (user_id, parent_id) references app.nodes (user_id, id)
);

create table app.bits (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check ((char_length(title) + char_length(regexp_replace(title, '[^\U00010000-\U0010FFFF]', '', 'g'))) between 1 and 200),
  description text not null default '' check ((char_length(description) + char_length(regexp_replace(description, '[^\U00010000-\U0010FFFF]', '', 'g'))) between 0 and 1000),
  icon text not null check ((char_length(icon) + char_length(regexp_replace(icon, '[^\U00010000-\U0010FFFF]', '', 'g'))) between 1 and 64),
  deadline bigint check (deadline > 0),
  deadline_all_day boolean not null default false,
  priority text check (priority in ('high', 'mid', 'low')),
  status text not null default 'active' check (status in ('active', 'complete')),
  mtime bigint not null check (mtime > 0),
  created_at bigint not null check (created_at > 0),
  version integer not null default 1 check (version >= 1),
  parent_id uuid not null,
  x integer not null check (x between 0 and 17),
  y integer not null check (y between 0 and 8),
  deleted_at bigint check (deleted_at > 0),
  archived_at bigint check (archived_at > 0),
  past_deadline_dismissed boolean not null default false,
  unique (user_id, id),
  foreign key (user_id, parent_id) references app.nodes (user_id, id)
);

create table app.chunks (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check ((char_length(title) + char_length(regexp_replace(title, '[^\U00010000-\U0010FFFF]', '', 'g'))) between 1 and 200),
  description text not null default '' check ((char_length(description) + char_length(regexp_replace(description, '[^\U00010000-\U0010FFFF]', '', 'g'))) between 0 and 500),
  time bigint check (time > 0),
  time_all_day boolean not null default false,
  status text not null default 'incomplete' check (status in ('complete', 'incomplete')),
  "order" integer not null check ("order" >= 0),
  parent_id uuid not null,
  unique (user_id, id),
  foreign key (user_id, parent_id) references app.bits (user_id, id)
);

create table app.scratch_breakdowns (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  scratch_bit_id uuid not null,
  content text not null check ((char_length(content) + char_length(regexp_replace(content, '[^\U00010000-\U0010FFFF]', '', 'g'))) between 1 and 1000),
  "order" integer not null check ("order" >= 0),
  created_at bigint not null check (created_at > 0),
  consumed_at bigint check (consumed_at > 0),
  version integer not null default 1 check (version >= 1),
  unique (user_id, id),
  unique (user_id, scratch_bit_id, id),
  foreign key (user_id, scratch_bit_id) references app.bits (user_id, id)
);

create table app.staged_candidates (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  scratch_bit_id uuid not null,
  source_breakdown_id uuid not null unique,
  result_type text not null check (result_type in ('node', 'bit')),
  lifecycle text not null default 'staged' check (lifecycle = 'staged'),
  created_at bigint not null check (created_at > 0),
  updated_at bigint not null check (updated_at > 0),
  version integer not null default 1 check (version >= 1),
  unique (user_id, id),
  foreign key (user_id, scratch_bit_id) references app.bits (user_id, id),
  foreign key (user_id, scratch_bit_id, source_breakdown_id)
    references app.scratch_breakdowns (user_id, scratch_bit_id, id)
);

-- One Inbox and one Archive per account (S30).
create unique index uq_nodes_system_role on app.nodes (user_id, system_role) where system_role is not null;

create index idx_nodes_parent on app.nodes (user_id, parent_id);
create index idx_bits_parent on app.bits (user_id, parent_id);
create index idx_chunks_parent on app.chunks (user_id, parent_id);
create index idx_scratch_breakdowns_scratch on app.scratch_breakdowns (user_id, scratch_bit_id);
create index idx_staged_candidates_scratch on app.staged_candidates (user_id, scratch_bit_id);
create index idx_nodes_deleted on app.nodes (user_id, deleted_at);
create index idx_bits_deleted on app.bits (user_id, deleted_at);

-- RLS: a signed-in user reads only their own rows. No client role has insert, update or
-- delete; the write role and its policies come in Task 215.

alter table app.accounts enable row level security;
revoke all on app.accounts from public, anon, authenticated;
grant select on app.accounts to authenticated;
create policy accounts_select_own on app.accounts for select to authenticated
  using (user_id = (select auth.uid()));

alter table app.nodes enable row level security;
revoke all on app.nodes from public, anon, authenticated;
grant select on app.nodes to authenticated;
create policy nodes_select_own on app.nodes for select to authenticated
  using (user_id = (select auth.uid()));

alter table app.bits enable row level security;
revoke all on app.bits from public, anon, authenticated;
grant select on app.bits to authenticated;
create policy bits_select_own on app.bits for select to authenticated
  using (user_id = (select auth.uid()));

alter table app.chunks enable row level security;
revoke all on app.chunks from public, anon, authenticated;
grant select on app.chunks to authenticated;
create policy chunks_select_own on app.chunks for select to authenticated
  using (user_id = (select auth.uid()));

alter table app.scratch_breakdowns enable row level security;
revoke all on app.scratch_breakdowns from public, anon, authenticated;
grant select on app.scratch_breakdowns to authenticated;
create policy scratch_breakdowns_select_own on app.scratch_breakdowns for select to authenticated
  using (user_id = (select auth.uid()));

alter table app.staged_candidates enable row level security;
revoke all on app.staged_candidates from public, anon, authenticated;
grant select on app.staged_candidates to authenticated;
create policy staged_candidates_select_own on app.staged_candidates for select to authenticated
  using (user_id = (select auth.uid()));
