// ── Portal API ─────────────────────────────────────────────────────
// Public endpoint for loading portal data (no auth needed).
// Internal endpoints for workspace owners to manage portal tokens.

import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// ── Public (client-facing, no auth needed) ─────────────────────────

export async function loadPortalData(token: string): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/portal-view?token=${encodeURIComponent(token)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Portal not found');
  }
  const { data } = await res.json();
  return data;
}

// ── Internal (workspace owner) — uses auth token ───────────────────

export async function generatePortalToken(clientId: string): Promise<any> {
  const wsId = await resolveWorkspaceId();
  if (!wsId) throw new Error('No workspace found');

  // Generate a 20-char token
  const token = Array.from(crypto.getRandomValues(new Uint8Array(15)))
    .map(b => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 20);

  const { data, error } = await supabase
    .from('portal_tokens')
    .upsert(
      { workspace_id: wsId, client_id: clientId, token, active: true },
      { onConflict: 'client_id,workspace_id' }
    )
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function togglePortal(clientId: string, active: boolean): Promise<any> {
  const wsId = await resolveWorkspaceId();
  if (!wsId) throw new Error('No workspace found');

  const { data, error } = await supabase
    .from('portal_tokens')
    .update({ active })
    .eq('client_id', clientId)
    .eq('workspace_id', wsId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getPortalConfig(clientId: string): Promise<any | null> {
  const wsId = await resolveWorkspaceId();
  if (!wsId) return null;

  const { data } = await supabase
    .from('portal_tokens')
    .select('*')
    .eq('client_id', clientId)
    .eq('workspace_id', wsId)
    .maybeSingle();

  return data;
}

// ── Helper ─────────────────────────────────────────────────────────

async function resolveWorkspaceId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();
  return data?.workspace_id || null;
}
