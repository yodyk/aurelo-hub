import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import * as auth from './authService';

interface AuthContextType {
  user: auth.AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const safeAuthDefaults: AuthContextType = {
  user: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) return safeAuthDefaults;
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<auth.AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let subscription: { unsubscribe: () => void } | null = null;

    auth.getCurrentUser()
      .then((u) => { if (mounted) setUser(u); })
      .catch((err) => console.error('Auth session check failed:', err))
      .finally(() => { if (mounted) setLoading(false); });

    try {
      const result = auth.onAuthStateChange((u) => { if (mounted) setUser(u); });
      subscription = result?.data?.subscription ?? null;
    } catch (err) {
      console.error('Failed to set up auth state listener:', err);
    }

    return () => {
      mounted = false;
      try { subscription?.unsubscribe(); } catch (_) {}
    };
  }, []);

  const handleSignIn = useCallback(async (email: string, password: string) => {
    const u = await auth.signIn(email, password);
    setUser(u);
  }, []);

  const handleSignUp = useCallback(async (email: string, password: string, name: string) => {
    const u = await auth.signUp(email, password, name);
    setUser(u);
  }, []);

  const handleSignOut = useCallback(async () => {
    await auth.signOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn: handleSignIn, signUp: handleSignUp, signOut: handleSignOut }}>
      {children}
    </AuthContext.Provider>
  );
}
