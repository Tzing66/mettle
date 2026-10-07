-- Mettle cloud schema: per-user copies of the phone's source data.
-- The phone stays the source of truth for logging; these tables back it up
-- and sync it across devices. XP, records and unlocks are NOT stored here:
-- they are derived from sets (and recomputed server-side for leaderboards).
--
-- Conventions
--   * ids are the phone's text ids (UUIDs, or custom_<uuid> for exercises)
--   * user_id defaults to auth.uid(); RLS limits every row to its owner
--   * updated_at is set by the server on every write (sync cursor; immune to
--     phone clock skew)
--   * deletes are soft (deleted_at) so other devices learn about them

-- ---------------------------------------------------------------- helpers

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------- tables

create table public.profiles (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  sex_for_standards text not null check (sex_for_standards in ('male', 'female')),
  birth_year int not null check (birth_year between 1900 and 2100),
  height_cm real check (height_cm between 50 and 300),
  unit_pref text not null default 'kg' check (unit_pref in ('kg', 'lb')),
  weekly_target_days int not null default 3 check (weekly_target_days between 1 and 7),
  rest_seconds int not null default 90 check (rest_seconds between 0 and 1800),
  favourite_exercise_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bodyweight_logs (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  weight_kg real not null check (weight_kg between 20 and 400),
  logged_at timestamptz not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.custom_exercises (
  id text primary key check (id like 'custom\_%'),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  short_name text not null default '',
  category text not null check (category in ('free_weight', 'machine', 'bodyweight', 'cardio')),
  tracking_type text not null check (tracking_type in ('weight_reps', 'reps', 'time', 'distance_time')),
  is_favourite boolean not null default false,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.workouts (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  status text not null default 'active' check (status in ('planning', 'active')),
  started_at timestamptz not null,
  ended_at timestamptz,
  notes text,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (ended_at is null or ended_at >= started_at)
);

create table public.workout_sets (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  workout_id text not null references public.workouts (id) on delete cascade,
  exercise_id text not null,
  set_index int not null check (set_index >= 0),
  is_warmup boolean not null default false,
  weight_kg real check (weight_kg between 0 and 1500),
  reps int check (reps between 0 and 1000),
  duration_s real check (duration_s between 0 and 86400),
  distance_m real check (distance_m between 0 and 1000000),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Sync pulls "everything of mine changed since X".
create index bodyweight_logs_user_updated_idx on public.bodyweight_logs (user_id, updated_at);
create index custom_exercises_user_updated_idx on public.custom_exercises (user_id, updated_at);
create index workouts_user_updated_idx on public.workouts (user_id, updated_at);
create index workout_sets_user_updated_idx on public.workout_sets (user_id, updated_at);
create index workout_sets_workout_idx on public.workout_sets (workout_id);

-- ---------------------------------------------------------------- triggers

create trigger profiles_touch before insert or update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger bodyweight_logs_touch before insert or update on public.bodyweight_logs
  for each row execute function public.touch_updated_at();
create trigger custom_exercises_touch before insert or update on public.custom_exercises
  for each row execute function public.touch_updated_at();
create trigger workouts_touch before insert or update on public.workouts
  for each row execute function public.touch_updated_at();
create trigger workout_sets_touch before insert or update on public.workout_sets
  for each row execute function public.touch_updated_at();

-- A set must belong to a workout owned by the same user.
create or replace function public.check_set_owner()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (select 1 from public.workouts w where w.id = new.workout_id and w.user_id = new.user_id) then
    raise exception 'workout % does not belong to this user', new.workout_id using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger workout_sets_owner before insert or update on public.workout_sets
  for each row execute function public.check_set_owner();

-- ---------------------------------------------------------------- RLS

alter table public.profiles enable row level security;
alter table public.bodyweight_logs enable row level security;
alter table public.custom_exercises enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_sets enable row level security;

create policy "own profile" on public.profiles
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "own bodyweight" on public.bodyweight_logs
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "own custom exercises" on public.custom_exercises
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "own workouts" on public.workouts
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "own sets" on public.workout_sets
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
