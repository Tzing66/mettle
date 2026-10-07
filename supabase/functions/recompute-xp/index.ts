// recompute-xp: rebuilds the caller's server-side XP ledger from their synced
// workouts using the app's own engine (bundled into ../_shared/recompute.js by
// `npm run build:edge`). Leaderboards read the result, so a modified app can't
// inflate its XP: only the sets count, and they're re-scored here.
//
// Called by the app after a sync uploads changes. The caller is identified by
// their session JWT; data is read and written with the service key.

import { createClient } from 'npm:@supabase/supabase-js@2';

import { computeServerLedger } from '../_shared/recompute.js';

const PAGE = 1000;

function serviceKey(): string {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legacy) return legacy;
  const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}') as Record<string, string>;
  const key = keys.default ?? Object.values(keys)[0];
  if (!key) throw new Error('No service key available');
  return key;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'unauthorized' }, 401);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: auth, error: authError } = await admin.auth.getUser(token);
  if (authError || !auth.user) return json({ error: 'unauthorized' }, 401);
  const userId = auth.user.id;

  // Reads every non-deleted row of a table for this user, page by page.
  async function all<T>(table: string, columns: string, softDeleted = true): Promise<T[]> {
    const out: T[] = [];
    for (let from = 0; ; from += PAGE) {
      let q = admin.from(table).select(columns).eq('user_id', userId);
      if (softDeleted) q = q.is('deleted_at', null);
      const { data, error } = await q.order(table === 'profiles' ? 'user_id' : 'id').range(from, from + PAGE - 1);
      if (error) throw new Error(`${table}: ${error.message}`);
      out.push(...((data ?? []) as T[]));
      if (!data || data.length < PAGE) return out;
    }
  }

  try {
    const [profiles, workouts, sets, bodyweight, customExercises] = await Promise.all([
      all('profiles', 'sex_for_standards,birth_year,weekly_target_days,utc_offset_minutes', false),
      all('workouts', 'id,started_at,ended_at'),
      all('workout_sets', 'id,workout_id,exercise_id,set_index,is_warmup,weight_kg,reps,duration_s,distance_m,completed_at'),
      all('bodyweight_logs', 'weight_kg,logged_at'),
      all('custom_exercises', 'id,category,tracking_type'),
    ]);
    if (profiles.length === 0) return json({ totalXp: 0, grantedXp: 0, events: 0 });

    const ledger = computeServerLedger({
      // deno-lint-ignore no-explicit-any
      profile: profiles[0] as any,
      // deno-lint-ignore no-explicit-any
      workouts: workouts as any,
      // deno-lint-ignore no-explicit-any
      sets: sets as any,
      // deno-lint-ignore no-explicit-any
      bodyweight: bodyweight as any,
      // deno-lint-ignore no-explicit-any
      customExercises: customExercises as any,
    });

    const { error } = await admin.rpc('replace_xp_ledger', {
      p_user_id: userId,
      p_events: ledger.events,
      p_total_xp: ledger.totalXp,
      p_granted_xp: ledger.grantedXp,
      p_rule_version: ledger.ruleVersion,
    });
    if (error) throw new Error(`replace_xp_ledger: ${error.message}`);

    return json({ totalXp: ledger.totalXp, grantedXp: ledger.grantedXp, events: ledger.events.length });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
