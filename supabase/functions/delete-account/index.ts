// delete-account: permanently deletes the caller's Mettle account and all of
// their cloud data. Groups they belong to survive (ownership is handed to the
// longest-standing member); everything else cascades from auth.users.

import { createClient } from 'npm:@supabase/supabase-js@2';

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

  try {
    const { error: prepError } = await admin.rpc('prepare_account_deletion', { p_user_id: userId });
    if (prepError) throw new Error(`prepare: ${prepError.message}`);

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) throw new Error(`delete: ${deleteError.message}`);

    console.log(`deleted account ${userId}`);
    return json({ deleted: true });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
