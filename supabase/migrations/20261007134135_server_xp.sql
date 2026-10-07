-- Server-computed XP. The recompute-xp Edge Function replays a user's synced
-- sets with the app's engine and writes the result here through
-- replace_xp_ledger(). Clients can read their own rows but can never write:
-- there are no insert/update/delete policies, and the function is only
-- executable by service_role. Leaderboards (next migration) read from here.

alter table public.profiles
  add column utc_offset_minutes int not null default 0 check (utc_offset_minutes between -720 and 840);

create table public.xp_ledger (
  user_id uuid not null references auth.users (id) on delete cascade,
  seq int not null,
  amount int not null check (amount >= 0),
  reason text not null,
  status text not null check (status in ('granted', 'pending_review')),
  source_type text not null,
  source_id text not null,
  workout_id text,
  rule_version text not null,
  created_at timestamptz not null,
  primary key (user_id, seq)
);

create index xp_ledger_user_created_idx on public.xp_ledger (user_id, created_at);

create table public.xp_summary (
  user_id uuid primary key references auth.users (id) on delete cascade,
  total_xp int not null default 0,
  -- Excludes pending_review XP; this is what leaderboards use.
  granted_xp int not null default 0,
  rule_version text not null,
  computed_at timestamptz not null default now()
);

alter table public.xp_ledger enable row level security;
alter table public.xp_summary enable row level security;

create policy "read own ledger" on public.xp_ledger
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "read own summary" on public.xp_summary
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- Atomically swaps a user's ledger for a freshly computed one.
create or replace function public.replace_xp_ledger(
  p_user_id uuid,
  p_events jsonb,
  p_total_xp int,
  p_granted_xp int,
  p_rule_version text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.xp_ledger where user_id = p_user_id;

  insert into public.xp_ledger (user_id, seq, amount, reason, status, source_type, source_id, workout_id, rule_version, created_at)
  select p_user_id, e.seq, e.amount, e.reason, e.status, e.source_type, e.source_id, e.workout_id, e.rule_version, e.created_at
  from jsonb_to_recordset(p_events) as e(
    seq int, amount int, reason text, status text, source_type text, source_id text,
    workout_id text, rule_version text, created_at timestamptz
  );

  insert into public.xp_summary (user_id, total_xp, granted_xp, rule_version, computed_at)
  values (p_user_id, p_total_xp, p_granted_xp, p_rule_version, now())
  on conflict (user_id) do update
    set total_xp = excluded.total_xp,
        granted_xp = excluded.granted_xp,
        rule_version = excluded.rule_version,
        computed_at = excluded.computed_at;
end;
$$;

revoke all on function public.replace_xp_ledger(uuid, jsonb, int, int, text) from public, anon, authenticated;
grant execute on function public.replace_xp_ledger(uuid, jsonb, int, int, text) to service_role;
