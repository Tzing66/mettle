-- Drop sets: a drop is lighter weight straight after the previous set, no rest.
-- It belongs to that set (scored as part of it; see xp-rules.v4).

alter table public.workout_sets add column is_drop boolean not null default false;

-- Shared routines keep which sets are drops.
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
                      'is_drop', case when (s ->> 'is_drop')::boolean then true end,
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
