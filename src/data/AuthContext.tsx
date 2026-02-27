import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import * as auth from './authService';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: auth.AuthUser | null;
  loading: boolean;
  workspaceId: string | null;
  workspaceRole: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const safeAuthDefaults: AuthContextType = {
  user: null,
  loading: true,
  workspaceId: null,
  workspaceRole: null,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) return safeAuthDefaults;
  return ctx;
}

/**
 * After signup, create the user's first workspace + owner member row.
 * Returns the workspace id.
 */
async function createWorkspaceForUser(userId: string, email: string, name: string): Promise<string> {
  const workspaceName = name ? `${name}'s Workspace` : 'My Workspace';

  const { data: ws, error: wsErr } = await supabase
    .from('workspaces')
    .insert({ name: workspaceName, owner_id: userId, owner_email: email })
    .select('id')
    .single();

  if (wsErr) throw new Error(`Failed to create workspace: ${wsErr.message}`);

  const { error: memErr } = await supabase
    .from('workspace_members')
    .insert({
      workspace_id: ws.id,
      user_id: userId,
      email,
      name,
      role: 'Owner',
      status: 'active',
      joined_at: new Date().toISOString(),
    });

  if (memErr) throw new Error(`Failed to create membership: ${memErr.message}`);

  // Seed invoice sequence
  await supabase.from('invoice_sequences').insert({ workspace_id: ws.id });

  return ws.id;
}

/**
 * Resolve the user's active workspace_id from workspace_members.
 */
async function resolveWorkspace(userId: string): Promise<{ workspaceId: string | null; role: string | null }> {
  const { data, error } = await supabase
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(1)
    .single();

  if (error || !data) return { workspaceId: null, role: null };
  return { workspaceId: data.workspace_id, role: data.role };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<auth.AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [workspaceRole, setWorkspaceRole] = useState<string | null>(null);

  // Resolve workspace whenever user changes
  const resolveAndSetWorkspace = useCallback(async (u: auth.AuthUser | null) => {
    if (!u) {
      setWorkspaceId(null);
      setWorkspaceRole(null);
      return;
    }
    const result = await resolveWorkspace(u.id);
    setWorkspaceId(result.workspaceId);
    setWorkspaceRole(result.role);
  }, []);

  useEffect(() => {
    let mounted = true;

    auth.getCurrentUser()
      .then(async (u) => {
        if (!mounted) return;
        setUser(u);
        await resolveAndSetWorkspace(u);
      })
      .catch((err) => console.error('Auth session check failed:', err))
      .finally(() => { if (mounted) setLoading(false); });

    const { data } = auth.onAuthStateChange(async (u) => {
      if (!mounted) return;
      setUser(u);
      await resolveAndSetWorkspace(u);
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      try { data?.subscription?.unsubscribe(); } catch (_) {}
    };
  }, [resolveAndSetWorkspace]);

  const handleSignIn = useCallback(async (email: string, password: string) => {
    const u = await auth.signIn(email, password);
    setUser(u);
    await resolveAndSetWorkspace(u);
  }, [resolveAndSetWorkspace]);

  const handleSignUp = useCallback(async (email: string, password: string, name: string) => {
    const u = await auth.signUp(email, password, name);
    setUser(u);
    // Create workspace for new user
    const wsId = await createWorkspaceForUser(u.id, u.email, name);
    setWorkspaceId(wsId);
    setWorkspaceRole('Owner');
  }, []);

  const handleSignOut = useCallback(async () => {
    await auth.signOut();
    setUser(null);
    setWorkspaceId(null);
    setWorkspaceRole(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user, loading, workspaceId, workspaceRole,
      signIn: handleSignIn, signUp: handleSignUp, signOut: handleSignOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
