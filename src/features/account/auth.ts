import type { Session } from '@supabase/supabase-js';
import { makeRedirectUri } from 'expo-auth-session';
import { getQueryParams } from 'expo-auth-session/build/QueryParams';
import * as WebBrowser from 'expo-web-browser';
import { useSyncExternalStore } from 'react';

import { unlinkAccount } from '@/features/sync/sync';

import { cloudConfigured, supabase } from './supabase';

// ---- Session store ----------------------------------------------------------

let session: Session | null = null;
let ready = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

if (cloudConfigured) {
  supabase.auth.getSession().then(({ data }) => {
    session = data.session;
    ready = true;
    emit();
  });
  supabase.auth.onAuthStateChange((_event, next) => {
    session = next;
    ready = true;
    emit();
  });
} else {
  ready = true;
}

export function getSession(): Session | null {
  return session;
}

/** Current Supabase session (null when signed out). `ready` is false until the stored session has loaded. */
export function useSession(): { session: Session | null; ready: boolean } {
  const s = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => session,
  );
  const r = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => ready,
  );
  return { session: s, ready: r };
}

// ---- Sign-in methods --------------------------------------------------------

/**
 * Deep link Supabase sends the browser back to: mettle://auth-callback in real
 * builds, exp://localhost:8081/--/auth-callback in Expo Go.
 *
 * preferLocalhost matters: Supabase's redirect allow-list rejects addresses
 * with a LAN IP (exp://192.168.x.x…) even against exp://** — the dots break
 * its wildcard matching — and silently falls back to the Site URL. The auth
 * session intercepts the redirect by scheme, so the host is never visited.
 */
export const authRedirectUri = makeRedirectUri({ scheme: 'mettle', path: 'auth-callback', preferLocalhost: true });

/**
 * Google via the system browser (works in Expo Go). Returns false if the user
 * closed the browser without finishing.
 */
export async function signInWithGoogle(): Promise<boolean> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: authRedirectUri, skipBrowserRedirect: true },
  });
  if (error) throw error;
  const result = await WebBrowser.openAuthSessionAsync(data.url, authRedirectUri);
  if (result.type !== 'success') return false;

  const { params, errorCode } = getQueryParams(result.url);
  if (errorCode) throw new Error(params.error_description ?? errorCode);
  if (params.code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(params.code);
    if (exchangeError) throw exchangeError;
    return true;
  }
  if (!params.access_token || !params.refresh_token) throw new Error('Google sign-in didn’t return a session.');
  const { error: sessionError } = await supabase.auth.setSession({
    access_token: params.access_token,
    refresh_token: params.refresh_token,
  });
  if (sessionError) throw sessionError;
  return true;
}

/** Emails a one-time sign-in code (creates the account on first use). */
export async function sendEmailCode(email: string) {
  const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
  if (error) throw error;
}

export async function verifyEmailCode(email: string, code: string) {
  const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
  if (error) throw error;
}

/**
 * Permanently deletes the account and all cloud data (delete-account Edge
 * Function), then returns this phone to offline-only use. Workouts on the
 * phone are kept.
 */
export async function deleteAccount() {
  const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
  if (error) throw new Error(error.message);
  unlinkAccount();
  await supabase.auth.signOut({ scope: 'local' });
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** Display label for the signed-in account. */
export function accountLabel(s: Session): { name: string; detail: string } {
  const meta = s.user.user_metadata ?? {};
  const provider = s.user.app_metadata?.provider === 'google' ? 'Google' : 'email';
  return {
    name: (meta.full_name as string | undefined) ?? s.user.email ?? 'Signed in',
    detail: `${s.user.email ?? ''}${s.user.email ? ' · ' : ''}via ${provider}`,
  };
}
