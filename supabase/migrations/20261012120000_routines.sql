-- Routines: saved workouts you can start in one tap, synced like the rest of
-- your data; and shared routines: a copy anyone can import with a short code.

create table public.routines (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  -- [{ exerciseId, sets: [{ isWarmup, weightKg, reps, durationS, distanceM }] }]
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) <= 40),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index routines_user_updated_idx on public.routines (user_id, updated_at);

create trigger routines_touch before insert or update on public.routines
  for each row execute function public.touch_updated_at();

alter table public.routines enable row level security;

create policy "own routines" on public.routines
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Shared copies. No weights: the app strips them, and share_routine keeps only
-- the fields below. Only reachable through the two functions.
create table public.shared_routines (
  code text primary key,
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  -- [{ exercise_id, sets: [{ is_warmup, reps, duration_s, distance_m }], custom?: { name, category, tracking_type } }]
  items jsonb not null,
  created_at timestamptz not null default now()
);

create index shared_routines_owner_idx on public.shared_routines (owner_id);

alter table public.shared_routines enable row level security;
-- No policies: direct table access is denied; the functions below are the only way in.

create or replace function public.share_routine(p_name text, p_items jsonb)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; -- no 0/O, 1/I/L
  new_code text;
  clean jsonb;
begin
  if me is null then
    raise exception 'sign in to share routines' using errcode = '42501';
  end if;
  if p_name is null or char_length(trim(p_name)) not between 1 and 60 then
    raise exception 'routine name must be 1-60 characters' using errcode = '22023';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 40 then
    raise exception 'a routine has 1-40 exercises' using errcode = '22023';
  end if;
  if (select count(*) from public.shared_routines where owner_id = me) >= 200 then
    raise exception 'share limit reached' using errcode = '54000';
  end if;

  -- Keep only known fields (never weights).
  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
           'exercise_id', left(item ->> 'exercise_id', 80),
           'custom', case when item ? 'custom' then jsonb_build_object(
               'name', left(item -> 'custom' ->> 'name', 80),
               'category', item -> 'custom' ->> 'category',
               'tracking_type', item -> 'custom' ->> 'tracking_type') end,
           'sets', (select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                      'is_warmup', coalesce((s ->> 'is_warmup')::boolean, false),
                      'reps', (s ->> 'reps')::int,
                      'duration_s', (s ->> 'duration_s')::int,
                      'distance_m', (s ->> 'distance_m')::int))), '[]'::jsonb)
                    from jsonb_array_elements(case when jsonb_typeof(item -> 'sets') = 'array' then item -> 'sets' else '[]'::jsonb end) with ordinality as e(s, n)
                    where n <= 20)))), '[]'::jsonb)
    into clean
  from jsonb_array_elements(p_items) as i(item)
  where item ->> 'exercise_id' is not null;

  loop
    new_code := '';
    for _ in 1..8 loop
      new_code := new_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.shared_routines where code = new_code);
  end loop;

  insert into public.shared_routines (code, owner_id, name, items) values (new_code, me, trim(p_name), clean);
  return new_code;
end;
$$;

create or replace function public.get_shared_routine(p_code text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('name', name, 'items', items)
  from public.shared_routines
  where code = upper(replace(trim(p_code), ' ', ''));
$$;

revoke all on function public.share_routine(text, jsonb) from public, anon;
grant execute on function public.share_routine(text, jsonb) to authenticated;
revoke all on function public.get_shared_routine(text) from public;
grant execute on function public.get_shared_routine(text) to anon, authenticated;
