// Thin wrappers over the group functions (supabase/migrations/*_groups_leaderboards.sql).
// All online-only; every call requires a signed-in session.
import { supabase } from '@/features/account/supabase';

import type { LeaderboardEntry } from './leaderboard';

export interface Group {
  id: string;
  name: string;
  invite_code: string;
  created_at: string;
  memberCount: number;
}

function fail(error: { message: string } | null): never | void {
  if (error) throw new Error(error.message);
}

export async function listMyGroups(): Promise<Group[]> {
  const { data, error } = await supabase
    .from('groups')
    .select('id, name, invite_code, created_at, group_members(count)')
    .order('created_at', { ascending: true });
  fail(error);
  return (data ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    invite_code: g.invite_code,
    created_at: g.created_at,
    memberCount: (g.group_members as unknown as { count: number }[])[0]?.count ?? 0,
  }));
}

export async function createGroup(name: string): Promise<{ id: string; invite_code: string }> {
  const { data, error } = await supabase.rpc('create_group', { p_name: name });
  fail(error);
  return data as { id: string; invite_code: string };
}

export async function joinGroup(code: string): Promise<{ id: string; name: string }> {
  const { data, error } = await supabase.rpc('join_group', { p_code: code });
  fail(error);
  return data as { id: string; name: string };
}

export async function leaveGroup(groupId: string): Promise<void> {
  const { error } = await supabase.rpc('leave_group', { p_group_id: groupId });
  fail(error);
}

export async function getGroup(groupId: string): Promise<Group | null> {
  return (await listMyGroups()).find((g) => g.id === groupId) ?? null;
}

export async function groupLeaderboard(groupId: string): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase.rpc('group_leaderboard', {
    p_group_id: groupId,
    p_utc_offset_minutes: -new Date().getTimezoneOffset() || 0,
  });
  fail(error);
  return (data ?? []) as LeaderboardEntry[];
}
