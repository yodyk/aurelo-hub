// ── Settings API — real Supabase queries ────────────────────────────
import { supabase } from '@/integrations/supabase/client';
import { type PlanId } from './plans';

// ── Workspace ID helper ─────────────────────────────────────────────
// Most settings functions receive workspaceId from the caller (DataContext).
// For functions called outside DataContext, we resolve it from workspace_members.

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

// ── Plan ────────────────────────────────────────────────────────────

export async function updatePlan(planId: PlanId): Promise<{
  activatedAt?: string;
  stripeSubscriptionId?: string | null;
  stripeCustomerId?: string | null;
  periodEnd?: string | null;
  isTrial?: boolean;
  trialEnd?: string | null;
}> {
  const wsId = await resolveWorkspaceId();
  if (!wsId) throw new Error('No workspace found');
  const now = new Date().toISOString();
  const { error } = await supabase.from('workspaces').update({ plan_id: planId, plan_activated_at: now }).eq('id', wsId);
  if (error) throw new Error(`Failed to update plan: ${error.message}`);
  return { activatedAt: now, isTrial: false, trialEnd: null };
}

// ── Generic settings persistence ────────────────────────────────────

export async function saveSetting(key: string, value: any, workspaceId?: string): Promise<void> {
  const wsId = workspaceId || await resolveWorkspaceId();
  if (!wsId) { console.warn('[settingsApi] No workspace, skipping save'); return; }
  const { error } = await supabase
    .from('workspace_settings')
    .upsert({ workspace_id: wsId, section: key, data: value, updated_at: new Date().toISOString() }, { onConflict: 'workspace_id,section' });
  if (error) console.error('[settingsApi] saveSetting failed:', error);
}

export async function loadSetting(key: string, workspaceId?: string): Promise<any> {
  const wsId = workspaceId || await resolveWorkspaceId();
  if (!wsId) return null;
  const { data, error } = await supabase
    .from('workspace_settings')
    .select('data')
    .eq('workspace_id', wsId)
    .eq('section', key)
    .maybeSingle();
  if (error) return null;
  return data?.data || null;
}

export async function clearDemoData(): Promise<void> {
  console.log('[settingsApi] clearDemoData — not yet implemented');
}

// ── Avatar (real storage) ────────────────────────────────────────────
import * as storage from './storageApi';

export async function loadAvatar(): Promise<{ url: string } | null> {
  const wsId = await resolveWorkspaceId();
  if (!wsId) return null;
  const url = await storage.getAvatarUrl(wsId);
  return url ? { url } : null;
}

export async function uploadAvatar(file: File): Promise<{ url: string }> {
  const wsId = await resolveWorkspaceId();
  if (!wsId) throw new Error('No workspace found');
  const url = await storage.uploadAvatar(wsId, file);
  return { url };
}

export async function deleteAvatar(): Promise<void> {
  const wsId = await resolveWorkspaceId();
  if (!wsId) return;
  await storage.deleteAvatar(wsId);
}

// ── Logos (real storage) ────────────────────────────────────────────

export async function loadLogos(): Promise<{
  app: { url: string; fileName: string } | null;
  email: { url: string; fileName: string } | null;
}> {
  const wsId = await resolveWorkspaceId();
  if (!wsId) return { app: null, email: null };
  const urls = await storage.getLogoUrls(wsId);
  return {
    app: urls.app ? { url: urls.app, fileName: urls.app.split('/').pop() || 'app.png' } : null,
    email: urls.email ? { url: urls.email, fileName: urls.email.split('/').pop() || 'email.png' } : null,
  };
}

export async function uploadLogo(file: File, type: 'app' | 'email'): Promise<{ url: string; fileName: string }> {
  const wsId = await resolveWorkspaceId();
  if (!wsId) throw new Error('No workspace found');
  const url = await storage.uploadLogo(wsId, type, file);
  return { url, fileName: file.name };
}

export async function deleteLogo(type: 'app' | 'email'): Promise<void> {
  const wsId = await resolveWorkspaceId();
  if (!wsId) return;
  await storage.deleteLogo(wsId, type);
}

// ── Team ────────────────────────────────────────────────────────────

export async function inviteTeamMember(email: string, role: string): Promise<any> {
  const wsId = await resolveWorkspaceId();
  if (!wsId) throw new Error('No workspace found');
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from('pending_invites').insert({
    workspace_id: wsId,
    email,
    role,
    invited_by: user!.id,
  }).select().single();
  if (error) throw new Error(`Failed to invite: ${error.message}`);
  return data;
}

export async function removeTeamMember(id: string): Promise<void> {
  const { error } = await supabase.from('workspace_members').delete().eq('id', id);
  if (error) throw new Error(`Failed to remove member: ${error.message}`);
}

// ── API key ─────────────────────────────────────────────────────────

export async function regenerateApiKey(): Promise<string> {
  const wsId = await resolveWorkspaceId();
  if (!wsId) throw new Error('No workspace found');
  const key = `ak_${crypto.randomUUID().replace(/-/g, '')}`;
  // Delete old keys, insert new
  await supabase.from('api_keys').delete().eq('workspace_id', wsId);
  const { error } = await supabase.from('api_keys').insert({ workspace_id: wsId, key });
  if (error) throw new Error(`Failed to regenerate API key: ${error.message}`);
  return key;
}

// ── Data / danger zone ──────────────────────────────────────────────

export async function exportData(_type: string): Promise<void> {
  console.log('[settingsApi] exportData — client-side CSV generation');
}

export async function resetFinancialData(): Promise<void> {
  const wsId = await resolveWorkspaceId();
  if (!wsId) return;
  await supabase.from('sessions').delete().eq('workspace_id', wsId);
  await supabase.from('clients').update({ monthly_earnings: 0, lifetime_revenue: 0, hours_logged: 0, true_hourly_rate: 0 }).eq('workspace_id', wsId);
}

export async function deleteWorkspace(): Promise<void> {
  const wsId = await resolveWorkspaceId();
  if (!wsId) return;
  // Delete in order: sessions, projects, notes, invoices, clients, settings, members, workspace
  await supabase.from('sessions').delete().eq('workspace_id', wsId);
  await supabase.from('notes').delete().eq('workspace_id', wsId);
  await supabase.from('invoices').delete().eq('workspace_id', wsId);
  await supabase.from('projects').delete().eq('workspace_id', wsId);
  await supabase.from('clients').delete().eq('workspace_id', wsId);
  await supabase.from('workspace_settings').delete().eq('workspace_id', wsId);
  await supabase.from('invoice_sequences').delete().eq('workspace_id', wsId);
  await supabase.from('pending_invites').delete().eq('workspace_id', wsId);
  await supabase.from('api_keys').delete().eq('workspace_id', wsId);
  await supabase.from('portal_tokens').delete().eq('workspace_id', wsId);
  await supabase.from('workspace_members').delete().eq('workspace_id', wsId);
  await supabase.from('workspaces').delete().eq('id', wsId);
}

export async function seedDemoData(): Promise<{ summary?: { clients?: number; sessions?: number; projects?: number } }> {
  console.log('[settingsApi] seedDemoData — not yet implemented with live DB');
  return { summary: { clients: 0, sessions: 0, projects: 0 } };
}
