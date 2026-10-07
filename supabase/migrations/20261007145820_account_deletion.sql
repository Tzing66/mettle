-- Account deletion (required by the App Store and Google Play).
--
-- The delete-account Edge Function calls prepare_account_deletion() and then
-- deletes the auth user; every per-user table cascades from auth.users.
-- Groups must outlive their creator, so created_by no longer cascades.

alter table public.groups alter column created_by drop not null;
alter table public.groups drop constraint groups_created_by_fkey;
alter table public.groups
  add constraint groups_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

-- Removes a member: the oldest remaining member becomes owner if the owner
-- left; an empty group is deleted. Shared by leave_group and account deletion.
create or replace function public.remove_group_member(p_group_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  was_owner boolean;
begin
  delete from public.group_members
  where group_id = p_group_id and user_id = p_user_id
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

create or replace function public.leave_group(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.remove_group_member(p_group_id, (select auth.uid()));
end;
$$;

-- Leaves every group (handing over ownership) before the user row is deleted.
create or replace function public.prepare_account_deletion(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  g uuid;
begin
  for g in select group_id from public.group_members where user_id = p_user_id loop
    perform public.remove_group_member(g, p_user_id);
  end loop;
end;
$$;

revoke all on function public.remove_group_member(uuid, uuid) from public, anon, authenticated;
revoke all on function public.prepare_account_deletion(uuid) from public, anon, authenticated;
grant execute on function public.prepare_account_deletion(uuid) to service_role;
