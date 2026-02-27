// ── Auth service — real Supabase auth ───────────────────────────────
import { supabase } from '@/integrations/supabase/client';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  initials?: string;
}

function toAuthUser(supaUser: { id: string; email?: string; user_metadata?: Record<string, any> }): AuthUser {
  const email = supaUser.email || '';
  const name = supaUser.user_metadata?.name || supaUser.user_metadata?.full_name || email.split('@')[0];
  const initials = name
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  return { id: supaUser.id, email, name, initials };
}

// ── Auth readiness gate ─────────────────────────────────────────────
// Prevents any API call before the Supabase client has resolved
// the session from storage (INITIAL_SESSION event or 3s timeout).
let authReady: Promise<void>;
let resolveAuthReady: () => void;

authReady = new Promise<void>((resolve) => {
  resolveAuthReady = resolve;
});

const timeout = setTimeout(() => resolveAuthReady(), 3000);

supabase.auth.onAuthStateChange((event) => {
  if (event === 'INITIAL_SESSION') {
    clearTimeout(timeout);
    resolveAuthReady();
  }
});

export function waitForAuthReady() {
  return authReady;
}

// ── Public API ──────────────────────────────────────────────────────

export async function getCurrentUser(): Promise<AuthUser | null> {
  await waitForAuthReady();
  const { data: { user } } = await supabase.auth.getUser();
  return user ? toAuthUser(user) : null;
}

export function onAuthStateChange(callback: (user: AuthUser | null) => void) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ? toAuthUser(session.user) : null);
  });
  return { data };
}

export async function signIn(email: string, password: string): Promise<AuthUser> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return toAuthUser(data.user);
}

export async function signUp(email: string, password: string, name: string): Promise<AuthUser> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
      emailRedirectTo: window.location.origin,
    },
  });
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('Signup succeeded but no user returned');
  return toAuthUser(data.user);
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function getAccessToken(): Promise<string | null> {
  await waitForAuthReady();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}
