import { createContext, useContext, useState, type ReactNode } from 'react';

interface User {
  id: string;
  email: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user] = useState<User | null>({ id: 'demo', email: 'user@email.com' });
  const [loading] = useState(false);

  const signIn = async (_email: string, _password: string) => {
    // Will be replaced with Supabase auth
  };

  const signUp = async (_email: string, _password: string) => {
    // Will be replaced with Supabase auth
  };

  const signOut = async () => {
    // Will be replaced with Supabase auth
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
