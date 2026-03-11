import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import * as auth from './authService';
import { supabase } from '@/integrations/supabase/client';
import { NotificationEvents } from './notificationsApi';

export interface WorkspaceInfo {
  id: string;
  name: string;
  role: string;
  planId: string;
  isApproved: boolean;
}

interface AuthContextType {
  user: auth.AuthUser | null;
  loading: boolean;
  workspaceId: string | null;
  workspaceRole: string | null;
  allWorkspaces: WorkspaceInfo[];
  isNewUser: boolean;
  isApproved: boolean;
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
  isApproved: true,
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
    .insert({ name: workspaceName, owner_id: userId, owner_email: email, is_approved: false })
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
    .select('workspace_id, role, workspaces(id, name, plan_id, is_approved)')
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
      isApproved: (row.workspaces as any).is_approved !== false,
    }));
}

const WS_STORAGE_KEY = 'aurelo_active_workspace';

// ── Module-level locks shared across all AuthProvider instances ─────
// This prevents duplicate workspace provisioning when multiple AuthProvider
// instances mount (e.g. /login → /onboarding → / each have their own).
let moduleProvisioningLock = false;
let moduleResolvedUserId: string | null = null;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<auth.AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [workspaceRole, setWorkspaceRole] = useState<string | null>(null);
  const [allWorkspaces, setAllWorkspaces] = useState<WorkspaceInfo[]>([]);
  const [isNewUser, setIsNewUser] = useState(false);

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
      moduleResolvedUserId = null;
      return;
    }

    // If we've already resolved for this user (prevents duplicate provisioning across instances),
    // still load workspaces into this provider's state but skip provisioning
    const alreadyResolved = moduleResolvedUserId === u.id;
    // Claim this user immediately to block concurrent calls
    if (!alreadyResolved) moduleResolvedUserId = u.id;

    let workspaces = await resolveAllWorkspaces(u.id);

    // If already resolved and workspaces exist, just set state and return
    if (alreadyResolved && workspaces.length > 0) {
      setAllWorkspaces(workspaces);
      pickWorkspace(workspaces);
      return;
    }
    if (alreadyResolved) return; // Still provisioning or failed

    // If user has no workspaces yet (e.g. first sign-in after email confirmation),
    // check if they have a pending invite first — if so, skip auto-provisioning
    // and let the accept-invite flow handle workspace joining
    if (workspaces.length === 0) {
      // Check for pending invites before auto-provisioning
      const { data: pendingInvites } = await supabase
        .from('pending_invites')
        .select('id, workspace_id, role')
        .eq('email', u.email)
        .limit(1);

      if (pendingInvites && pendingInvites.length > 0) {
        // User has pending invite(s) — auto-accept the first one instead of provisioning
        const invite = pendingInvites[0];
        try {
          const { error: memErr } = await supabase
            .from('workspace_members')
            .insert({
              workspace_id: invite.workspace_id,
              user_id: u.id,
              email: u.email,
              name: u.name || u.email.split('@')[0],
              role: invite.role || 'Member',
              status: 'active',
              joined_at: new Date().toISOString(),
            });
          if (!memErr) {
            // Clean up the invite
            await supabase.from('pending_invites').delete().eq('id', invite.id);
            // Re-resolve workspaces
            workspaces = await resolveAllWorkspaces(u.id);
          }
        } catch (err) {
          console.error('Auto-accept invite failed:', err);
        }
      }

      // If still no workspaces after invite check, provision one
      if (workspaces.length === 0) {
        if (moduleProvisioningLock) {
          // Another call is already provisioning — bail out
          return;
        }
        moduleProvisioningLock = true;
        try {
          const wsId = await createWorkspaceForUser(u.id, u.email, u.name);
          const wsName = u.name ? `${u.name}'s Workspace` : 'My Workspace';
          workspaces = [{ id: wsId, name: wsName, role: 'Owner', planId: 'starter', isApproved: false }];
          setIsNewUser(true);
        } catch (err) {
          console.error('Auto-provisioning workspace failed:', err);
          moduleProvisioningLock = false;
          moduleResolvedUserId = null; // Allow retry
          return;
        }
        moduleProvisioningLock = false;
      }
    }

    setAllWorkspaces(workspaces);
    pickWorkspace(workspaces);

    // Fire "member joined" notification for non-Owner workspaces on first resolution
    // This covers the case where a user accepts an invite and logs in
    for (const ws of workspaces) {
      if (ws.role !== 'Owner') {
        // Check if we've already notified for this user+workspace (avoid duplicates)
        const notifKey = `aurelo_join_notified_${ws.id}`;
        if (!sessionStorage.getItem(notifKey)) {
          sessionStorage.setItem(notifKey, '1');
          const memberName = u.name || u.email || 'A team member';
          NotificationEvents.memberJoined(ws.id, memberName, {
            userId: u.id,
            email: u.email,
            role: ws.role,
          }).catch(e => console.error('[AuthContext] memberJoined notification error:', e));
        }
      }
    }
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
    // Reset module locks so onAuthStateChange can re-resolve for the new user
    moduleResolvedUserId = null;
    moduleProvisioningLock = false;

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
    if (moduleProvisioningLock) return;
    moduleProvisioningLock = true;
    try {
      const wsId = await createWorkspaceForUser(u.id, u.email, name);
      const ws: WorkspaceInfo = { id: wsId, name: name ? `${name}'s Workspace` : 'My Workspace', role: 'Owner', planId: 'starter', isApproved: false };
      setAllWorkspaces([ws]);
      setWorkspaceId(wsId);
      setWorkspaceRole('Owner');
      localStorage.setItem(WS_STORAGE_KEY, wsId);
      setIsNewUser(true);
      moduleResolvedUserId = u.id;
    } finally {
      moduleProvisioningLock = false;
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    await auth.signOut();
    setUser(null);
    setWorkspaceId(null);
    setWorkspaceRole(null);
    setAllWorkspaces([]);
    setIsNewUser(false);
    moduleResolvedUserId = null;
    moduleProvisioningLock = false;
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
    const ws: WorkspaceInfo = { id: wsId, name, role: 'Owner', planId: 'starter', isApproved: true };
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
      isApproved: !workspaceId || (allWorkspaces.find(w => w.id === workspaceId)?.isApproved !== false),
      signIn: handleSignIn, signUp: handleSignUp, signOut: handleSignOut,
      switchWorkspace, createWorkspace: handleCreateWorkspace, renameWorkspace: handleRenameWorkspace,
      deleteWorkspace: handleDeleteWorkspace, clearNewUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
