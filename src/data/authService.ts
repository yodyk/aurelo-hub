// ── Auth service stub ───────────────────────────────────────────────
// Will be replaced with real Supabase auth when Cloud is enabled.

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

// Demo user for local development
const DEMO_USER: AuthUser = {
  id: 'demo-user-1',
  email: 'demo@aurelo.app',
  name: 'Demo User',
};

let currentUser: AuthUser | null = DEMO_USER;
let listeners: Array<(user: AuthUser | null) => void> = [];

export async function getCurrentUser(): Promise<AuthUser | null> {
  return currentUser;
}

export function onAuthStateChange(callback: (user: AuthUser | null) => void) {
  listeners.push(callback);
  return {
    data: {
      subscription: {
        unsubscribe: () => {
          listeners = listeners.filter(l => l !== callback);
        },
      },
    },
  };
}

export async function signIn(email: string, password: string): Promise<AuthUser> {
  const user: AuthUser = { id: 'user-' + Date.now(), email, name: email.split('@')[0] };
  currentUser = user;
  listeners.forEach(l => l(user));
  return user;
}

export async function signUp(email: string, password: string, name: string): Promise<AuthUser> {
  const user: AuthUser = { id: 'user-' + Date.now(), email, name };
  currentUser = user;
  listeners.forEach(l => l(user));
  return user;
}

export async function signOut(): Promise<void> {
  currentUser = null;
  listeners.forEach(l => l(null));
}
