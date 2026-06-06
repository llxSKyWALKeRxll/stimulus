-- Stimulus initial schema
-- Idempotent where reasonable; designed to be run once on a fresh Supabase project.
--
-- Design notes:
--   * Tags and sub_tags are per-user (each lifter defines their own taxonomy).
--   * user_id is denormalized onto deeply-nested tables (exercise_entries, sets, set_drops)
--     to keep RLS policies simple/fast (no joins) — standard Supabase pattern.
--   * Weights stored in kg internally; UI converts based on profiles.units.
--   * set_drops table models drop-sets: a single "set" can contain multiple
--     (weight, reps) pairs that the user blasted through without rest.
--     Regular sets simply have one set_drops row per sets row.

create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------------
-- Tables
-- ------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  units text not null default 'kg' check (units in ('kg', 'lb')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tags (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.sub_tags (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_tag_id uuid not null references public.tags(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (parent_tag_id, name)
);

create table public.exercises (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  notes text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.exercise_tags (
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (exercise_id, tag_id)
);

create table public.exercise_sub_tags (
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  sub_tag_id uuid not null references public.sub_tags(id) on delete cascade,
  primary key (exercise_id, sub_tag_id)
);

create table public.workout_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  performed_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.exercise_entries (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  order_index integer not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create table public.sets (
  id uuid primary key default uuid_generate_v4(),
  exercise_entry_id uuid not null references public.exercise_entries(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  order_index integer not null default 0,
  rpe numeric(3,1) check (rpe is null or (rpe >= 0 and rpe <= 10)),
  rest_seconds integer check (rest_seconds is null or rest_seconds >= 0),
  notes text,
  created_at timestamptz not null default now()
);

create table public.set_drops (
  id uuid primary key default uuid_generate_v4(),
  set_id uuid not null references public.sets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  order_index integer not null default 0,
  weight_kg numeric(6,2) not null default 0 check (weight_kg >= 0),
  reps integer not null check (reps >= 0),
  is_bodyweight boolean not null default false,
  is_failure boolean not null default false,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- Indexes (covering common reads: exercise lists, graph queries)
-- ------------------------------------------------------------------

create index idx_tags_user on public.tags(user_id);
create index idx_sub_tags_parent on public.sub_tags(parent_tag_id);
create index idx_sub_tags_user on public.sub_tags(user_id);
create index idx_exercises_user_active on public.exercises(user_id) where is_archived = false;
create index idx_exercise_tags_tag on public.exercise_tags(tag_id);
create index idx_exercise_sub_tags_sub on public.exercise_sub_tags(sub_tag_id);
create index idx_workout_sessions_user_performed on public.workout_sessions(user_id, performed_at desc);
create index idx_exercise_entries_session on public.exercise_entries(session_id);
create index idx_exercise_entries_exercise_created on public.exercise_entries(exercise_id, created_at desc);
create index idx_sets_entry on public.sets(exercise_entry_id, order_index);
create index idx_set_drops_set on public.set_drops(set_id, order_index);

-- ------------------------------------------------------------------
-- updated_at trigger
-- ------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger touch_profiles
  before update on public.profiles
  for each row execute function public.touch_updated_at();

create trigger touch_exercises
  before update on public.exercises
  for each row execute function public.touch_updated_at();

create trigger touch_workout_sessions
  before update on public.workout_sessions
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------------
-- Auto-create profile row on signup
-- ------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------------

alter table public.profiles            enable row level security;
alter table public.tags                enable row level security;
alter table public.sub_tags            enable row level security;
alter table public.exercises           enable row level security;
alter table public.exercise_tags       enable row level security;
alter table public.exercise_sub_tags   enable row level security;
alter table public.workout_sessions    enable row level security;
alter table public.exercise_entries    enable row level security;
alter table public.sets                enable row level security;
alter table public.set_drops           enable row level security;

-- profiles: each user can only touch their own row
create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);
create policy profiles_insert_own on public.profiles
  for insert with check (auth.uid() = id);
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id);

-- Tables with direct user_id column
create policy tags_owner on public.tags
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy sub_tags_owner on public.sub_tags
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy exercises_owner on public.exercises
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy workout_sessions_owner on public.workout_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy exercise_entries_owner on public.exercise_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy sets_owner on public.sets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy set_drops_owner on public.set_drops
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Junction tables (no user_id, gated via parent exercise)
create policy exercise_tags_owner on public.exercise_tags
  for all
  using (exists (select 1 from public.exercises e
                  where e.id = exercise_id and e.user_id = auth.uid()))
  with check (exists (select 1 from public.exercises e
                       where e.id = exercise_id and e.user_id = auth.uid()));

create policy exercise_sub_tags_owner on public.exercise_sub_tags
  for all
  using (exists (select 1 from public.exercises e
                  where e.id = exercise_id and e.user_id = auth.uid()))
  with check (exists (select 1 from public.exercises e
                       where e.id = exercise_id and e.user_id = auth.uid()));
