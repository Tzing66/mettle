// Sharing routines by code (supabase/migrations/*_routines.sql). Sharing needs
// sign-in; looking up a code works for anyone.
import { getSession } from '@/features/account/auth';
import { supabase } from '@/features/account/supabase';
import { toSharedItems, type RoutineRow, type SharedItem } from '@/db/repositories/routines';

export async function shareRoutine(routine: RoutineRow): Promise<string> {
  if (!getSession()) throw new Error('Sign in (Profile → Account) to share routines.');
  const { data, error } = await supabase.rpc('share_routine', { p_name: routine.name, p_items: toSharedItems(routine.items) });
  if (error) throw new Error(error.message);
  return data as string;
}

export function shareMessage(routine: RoutineRow, code: string, exerciseNames: string[]): string {
  const list = exerciseNames.slice(0, 6).join(' · ') + (exerciseNames.length > 6 ? ` +${exerciseNames.length - 6} more` : '');
  return `${routine.name} (${exerciseNames.length} exercise${exerciseNames.length === 1 ? '' : 's'}) on Mettle\n${list}\n\nOpen Mettle → Start → Routines → Import\nCode: ${code}`;
}

/** Codes are 8 letters/digits; spaces and case don't matter. */
export function normaliseCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export async function fetchSharedRoutine(code: string): Promise<{ name: string; items: SharedItem[] } | null> {
  const { data, error } = await supabase.rpc('get_shared_routine', { p_code: normaliseCode(code) });
  if (error) throw new Error(error.message);
  return (data as { name: string; items: SharedItem[] } | null) ?? null;
}
