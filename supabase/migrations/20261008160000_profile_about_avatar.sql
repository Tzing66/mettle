-- Profile: about me, goals and a photo, visible to the members of your groups.

alter table public.profiles
  add column about text check (char_length(about) <= 300),
  add column goals text check (char_length(goals) <= 300),
  add column avatar_path text check (char_length(avatar_path) <= 200);

-- Photos live in a public bucket under <user id>/<file>. Public means anyone
-- holding the (unguessable) URL can view it; only the owner can write.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "avatars: owner reads own folder" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars: owner uploads to own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars: owner replaces own files" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars: owner deletes own files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- The leaderboard now carries each member's profile card.
drop function public.group_leaderboard(uuid, int);

create function public.group_leaderboard(p_group_id uuid, p_utc_offset_minutes int default 0)
returns table (
  user_id uuid,
  display_name text,
  role text,
  week_xp bigint,
  total_xp bigint,
  is_me boolean,
  about text,
  goals text,
  avatar_path text
)
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
           m.user_id = (select auth.uid()),
           p.about,
           p.goals,
           p.avatar_path
    from public.group_members m
    left join public.profiles p on p.user_id = m.user_id
    left join public.xp_ledger l on l.user_id = m.user_id and l.status = 'granted'
    where m.group_id = p_group_id
    group by m.user_id, p.display_name, m.role, p.about, p.goals, p.avatar_path;
end;
$$;

revoke all on function public.group_leaderboard(uuid, int) from public, anon;
grant execute on function public.group_leaderboard(uuid, int) to authenticated;
