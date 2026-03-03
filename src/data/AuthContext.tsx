import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import * as auth from './authService';
import { supabase } from '@/integrations/supabase/client';

export interface WorkspaceInfo {
  id: string;
  name: string;
  role: string;
  planId: string;
}

interface AuthContextType {
  user: auth.AuthUser | null;
  loading: boolean;
  workspaceId: string | null;
  workspaceRole: string | null;
  allWorkspaces: WorkspaceInfo[];
  isNewUser: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  switchWorkspace: (workspaceId: string) => void;
  createWorkspace: (name: string) => Promise<string>;
  renameWorkspace: (workspaceId: string, newName: string) => Promise<void>;
  deleteWorkspace: (workspaceId: string) => Promise<void>;
  clearNewUser: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const safeAuthDefaults: AuthContextType = {
  user: null,
  loading: true,
  workspaceId: null,
  workspaceRole: null,
  allWorkspaces: [],
  isNewUser: false,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  switchWorkspace: () => {},
  createWorkspace: async () => '',
  renameWorkspace: async () => {},
  deleteWorkspace: async () => {},
  clearNewUser: () => {},
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
async function createWorkspaceForUser(userId: string, email: string, name: string, useRawName = false): Promise<string> {
  const workspaceName = useRawName ? name : (name ? `${name}'s Workspace` : 'My Workspace');

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
 * Resolve ALL workspaces the user belongs to.
 */
async function resolveAllWorkspaces(userId: string): Promise<WorkspaceInfo[]> {
  const { data, error } = await supabase
    .from('workspace_members')
    .select('workspace_id, role, workspaces(id, name, plan_id)')
    .eq('user_id', userId)
    .eq('status', 'active');

  if (error || !data) return [];

  return data
    .filter((row: any) => row.workspaces)
    .map((row: any) => ({
      id: row.workspace_id,
      name: (row.workspaces as any).name || 'Workspace',
      role: row.role,
      planId: (row.workspaces as any).plan_id || 'starter',
    }));
}

const WS_STORAGE_KEY = 'aurelo_active_workspace';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<auth.AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [workspaceRole, setWorkspaceRole] = useState<string | null>(null);
  const [allWorkspaces, setAllWorkspaces] = useState<WorkspaceInfo[]>([]);
  const [isNewUser, setIsNewUser] = useState(false);

  // Provisioning lock to prevent concurrent workspace creation
  const provisioningRef = useRef(false);
  // Track if we've already resolved for a given user id to avoid duplicate work
  const resolvedUserIdRef = useRef<string | null>(null);

  // Pick active workspace: prefer localStorage, fallback to first
  const pickWorkspace = useCallback((workspaces: WorkspaceInfo[]) => {
    if (workspaces.length === 0) {
      setWorkspaceId(null);
      setWorkspaceRole(null);
      return;
    }
    const stored = localStorage.getItem(WS_STORAGE_KEY);
    const match = stored ? workspaces.find(w => w.id === stored) : null;
    const active = match || workspaces[0];
    setWorkspaceId(active.id);
    setWorkspaceRole(active.role);
    localStorage.setItem(WS_STORAGE_KEY, active.id);
  }, []);

  // Resolve workspaces whenever user changes
  const resolveAndSetWorkspaces = useCallback(async (u: auth.AuthUser | null) => {
    if (!u) {
      setWorkspaceId(null);
      setWorkspaceRole(null);
      setAllWorkspaces([]);
      resolvedUserIdRef.current = null;
      return;
    }

    // Skip if we've already resolved for this user (prevents duplicate calls)
    if (resolvedUserIdRef.current === u.id) return;
    // Claim this user immediately to block concurrent calls
    resolvedUserIdRef.current = u.id;

    let workspaces = await resolveAllWorkspaces(u.id);

    // If user has no workspaces yet (e.g. first sign-in after email confirmation),
    // auto-provision one now — but only if no other call is already doing it
    if (workspaces.length === 0) {
      if (provisioningRef.current) {
        // Another call is already provisioning — bail out
        return;
      }
      provisioningRef.current = true;
      try {
        const wsId = await createWorkspaceForUser(u.id, u.email, u.name);
        const wsName = u.name ? `${u.name}'s Workspace` : 'My Workspace';
        workspaces = [{ id: wsId, name: wsName, role: 'Owner', planId: 'starter' }];
        setIsNewUser(true);
      } catch (err) {
        console.error('Auto-provisioning workspace failed:', err);
        provisioningRef.current = false;
        resolvedUserIdRef.current = null; // Allow retry
        return;
      }
      provisioningRef.current = false;
    }

    setAllWorkspaces(workspaces);
    pickWorkspace(workspaces);
  }, [pickWorkspace]);

  useEffect(() => {
    let mounted = true;

    auth.getCurrentUser()
      .then(async (u) => {
        if (!mounted) return;
        setUser(u);
        await resolveAndSetWorkspaces(u);
      })
      .catch((err) => console.error('Auth session check failed:', err))
      .finally(() => { if (mounted) setLoading(false); });

    const { data } = auth.onAuthStateChange(async (u) => {
      if (!mounted) return;
      setUser(u);
      await resolveAndSetWorkspaces(u);
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      try { data?.subscription?.unsubscribe(); } catch (_) {}
    };
  }, [resolveAndSetWorkspaces]);

  const handleSignIn = useCallback(async (email: string, password: string) => {
    // Clear stale workspace reference from previous sessions
    localStorage.removeItem(WS_STORAGE_KEY);
    // Reset refs so onAuthStateChange can re-resolve for the new user
    resolvedUserIdRef.current = null;
    provisioningRef.current = false;

    await auth.signIn(email, password);
    // Don't call resolveAndSetWorkspaces here — onAuthStateChange will handle it
    // This prevents a race condition where both this function and the listener
    // try to provision a workspace simultaneously
  }, []);

  const handleSignUp = useCallback(async (email: string, password: string, name: string) => {
    const u = await auth.signUp(email, password, name);
    setUser(u);

    // Check if we actually have a session (email confirmation may be required)
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      // No session = email confirmation pending. Workspace will be provisioned
      // when the user confirms and signs in (via resolveAndSetWorkspaces).
      return;
    }

    // Session exists (auto-confirm enabled) — provision workspace now
    if (provisioningRef.current) return;
    provisioningRef.current = true;
    try {
      const wsId = await createWorkspaceForUser(u.id, u.email, name);
      const ws: WorkspaceInfo = { id: wsId, name: name ? `${name}'s Workspace` : 'My Workspace', role: 'Owner', planId: 'starter' };
      setAllWorkspaces([ws]);
      setWorkspaceId(wsId);
      setWorkspaceRole('Owner');
      localStorage.setItem(WS_STORAGE_KEY, wsId);
      setIsNewUser(true);
      resolvedUserIdRef.current = u.id;
    } finally {
      provisioningRef.current = false;
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    await auth.signOut();
    setUser(null);
    setWorkspaceId(null);
    setWorkspaceRole(null);
    setAllWorkspaces([]);
    setIsNewUser(false);
    resolvedUserIdRef.current = null;
    provisioningRef.current = false;
    localStorage.removeItem(WS_STORAGE_KEY);
  }, []);

  const switchWorkspace = useCallback((targetId: string) => {
    const ws = allWorkspaces.find(w => w.id === targetId);
    if (!ws) return;
    setWorkspaceId(ws.id);
    setWorkspaceRole(ws.role);
    localStorage.setItem(WS_STORAGE_KEY, ws.id);
  }, [allWorkspaces]);

  const handleCreateWorkspace = useCallback(async (name: string) => {
    if (!user) throw new Error('Not authenticated');
    const wsId = await createWorkspaceForUser(user.id, user.email, name, true);
    const ws: WorkspaceInfo = { id: wsId, name, role: 'Owner', planId: 'starter' };
    setAllWorkspaces(prev => [...prev, ws]);
    setWorkspaceId(wsId);
    setWorkspaceRole('Owner');
    localStorage.setItem(WS_STORAGE_KEY, wsId);
    return wsId;
  }, [user]);

  const handleRenameWorkspace = useCallback(async (targetId: string, newName: string) => {
    const { error } = await supabase
      .from('workspaces')
      .update({ name: newName })
      .eq('id', targetId);
    if (error) throw new Error(`Failed to rename workspace: ${error.message}`);
    setAllWorkspaces(prev => prev.map(w => w.id === targetId ? { ...w, name: newName } : w));
  }, []);

  const handleDeleteWorkspace = useCallback(async (targetId: string) => {
    if (allWorkspaces.length <= 1) throw new Error('Cannot delete your only workspace');
    if (user) {
      await supabase.from('workspace_members').delete().eq('workspace_id', targetId).eq('user_id', user.id);
    }
    const { error } = await supabase.from('workspaces').delete().eq('id', targetId);
    if (error) throw new Error(`Failed to delete workspace: ${error.message}`);
    const remaining = allWorkspaces.filter(w => w.id !== targetId);
    setAllWorkspaces(remaining);
    if (workspaceId === targetId) {
      pickWorkspace(remaining);
    }
  }, [allWorkspaces, user, workspaceId, pickWorkspace]);

  const clearNewUser = useCallback(() => setIsNewUser(false), []);

  return (
    <AuthContext.Provider value={{
      user, loading, workspaceId, workspaceRole, allWorkspaces, isNewUser,
      signIn: handleSignIn, signUp: handleSignUp, signOut: handleSignOut,
      switchWorkspace, createWorkspace: handleCreateWorkspace, renameWorkspace: handleRenameWorkspace,
      deleteWorkspace: handleDeleteWorkspace, clearNewUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
