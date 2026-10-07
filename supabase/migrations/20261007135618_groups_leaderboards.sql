-- Friends: groups joined by invite code, with weekly and all-time leaderboards
-- built on server-verified XP (xp_ledger, granted only).
--
-- Members see each other's display name and XP, nothing else. All writes go
-- through security-definer functions; tables are read-only to clients and
-- only for groups they belong to.

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 40),
  invite_code text not null unique check (invite_code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index group_members_user_idx on public.group_members (user_id);

-- Membership check that bypasses RLS (avoids recursive policies).
create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members m
    where m.group_id = p_group_id and m.user_id = (select auth.uid())
  );
$$;

alter table public.groups enable row level security;
alter table public.group_members enable row level security;

create policy "members read their groups" on public.groups
  for select to authenticated
  using (public.is_group_member(id));

create policy "members read group membership" on public.group_members
  for select to authenticated
  using (public.is_group_member(group_id));

-- ---------------------------------------------------------------- functions

create or replace function public.new_invite_code()
returns text
language plpgsql
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no I, O, 0, 1
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.groups g where g.invite_code = code);
  end loop;
  return code;
end;
$$;

create or replace function public.create_group(p_name text)
returns public.groups
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  g public.groups;
begin
  if me is null then raise exception 'sign in required' using errcode = '42501'; end if;
  if (select count(*) from public.group_members where user_id = me) >= 20 then
    raise exception 'You can be in at most 20 groups' using errcode = 'P0001';
  end if;
  insert into public.groups (name, invite_code, created_by)
  values (btrim(p_name), public.new_invite_code(), me)
  returning * into g;
  insert into public.group_members (group_id, user_id, role) values (g.id, me, 'owner');
  return g;
end;
$$;

create or replace function public.join_group(p_code text)
returns public.groups
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  g public.groups;
begin
  if me is null then raise exception 'sign in required' using errcode = '42501'; end if;
  select * into g from public.groups where invite_code = upper(btrim(p_code));
  if not found then raise exception 'No group with that code' using errcode = 'P0001'; end if;
  if exists (select 1 from public.group_members where group_id = g.id and user_id = me) then
    return g; -- already a member: joining again is a no-op
  end if;
  if (select count(*) from public.group_members where group_id = g.id) >= 50 then
    raise exception 'That group is full (50 members)' using errcode = 'P0001';
  end if;
  if (select count(*) from public.group_members where user_id = me) >= 20 then
    raise exception 'You can be in at most 20 groups' using errcode = 'P0001';
  end if;
  insert into public.group_members (group_id, user_id) values (g.id, me);
  return g;
end;
$$;

-- Leaving: the oldest remaining member becomes owner; an empty group is deleted.
create or replace function public.leave_group(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  was_owner boolean;
begin
  delete from public.group_members
  where group_id = p_group_id and user_id = me
  returning role = 'owner' into was_owner;
  if not found then return; end if;

  if not exists (select 1 from public.group_members where group_id = p_group_id) then
    delete from public.groups where id = p_group_id;
  elsif was_owner then
    update public.group_members set role = 'owner'
    where (group_id, user_id) = (
      select group_id, user_id from public.group_members
      where group_id = p_group_id order by joined_at, user_id limit 1
    );
  end if;
end;
$$;

-- Leaderboard for a group the caller belongs to. "This week" starts Monday
-- 00:00 in the caller's local time (p_utc_offset_minutes). Only granted XP
-- counts; pending XP waits for confirmation.
create or replace function public.group_leaderboard(p_group_id uuid, p_utc_offset_minutes int default 0)
returns table (user_id uuid, display_name text, role text, week_xp bigint, total_xp bigint, is_me boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  local_now timestamp := (now() at time zone 'utc') + make_interval(mins => p_utc_offset_minutes);
  week_start timestamptz := (date_trunc('week', local_now) - make_interval(mins => p_utc_offset_minutes)) at time zone 'utc';
begin
  if not public.is_group_member(p_group_id) then
    raise exception 'not a member of this group' using errcode = '42501';
  end if;
  return query
    select m.user_id,
           coalesce(p.display_name, 'Athlete'),
           m.role,
           coalesce(sum(l.amount) filter (where l.created_at >= week_start), 0)::bigint,
           coalesce(sum(l.amount), 0)::bigint,
           m.user_id = (select auth.uid())
    from public.group_members m
    left join public.profiles p on p.user_id = m.user_id
    left join public.xp_ledger l on l.user_id = m.user_id and l.status = 'granted'
    where m.group_id = p_group_id
    group by m.user_id, p.display_name, m.role;
end;
$$;

revoke all on function public.new_invite_code() from public, anon, authenticated;
revoke all on function public.is_group_member(uuid) from public, anon;
revoke all on function public.create_group(text) from public, anon;
revoke all on function public.join_group(text) from public, anon;
revoke all on function public.leave_group(uuid) from public, anon;
revoke all on function public.group_leaderboard(uuid, int) from public, anon;
grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.create_group(text) to authenticated;
grant execute on function public.join_group(text) to authenticated;
grant execute on function public.leave_group(uuid) to authenticated;
grant execute on function public.group_leaderboard(uuid, int) to authenticated;
