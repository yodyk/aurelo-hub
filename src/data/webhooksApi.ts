// ── Webhooks API ────────────────────────────────────────────────────
import { supabase } from '@/integrations/supabase/client';

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

// ── Event types ─────────────────────────────────────────────────────

export const WEBHOOK_EVENT_TYPES = [
  { value: 'session.created', label: 'Session created', group: 'Sessions' },
  { value: 'session.updated', label: 'Session updated', group: 'Sessions' },
  { value: 'session.deleted', label: 'Session deleted', group: 'Sessions' },
  { value: 'client.created', label: 'Client created', group: 'Clients' },
  { value: 'client.updated', label: 'Client updated', group: 'Clients' },
  { value: 'client.deleted', label: 'Client deleted', group: 'Clients' },
  { value: 'invoice.created', label: 'Invoice created', group: 'Invoices' },
  { value: 'invoice.updated', label: 'Invoice updated', group: 'Invoices' },
  { value: 'invoice.paid', label: 'Invoice paid', group: 'Invoices' },
  { value: 'project.created', label: 'Project created', group: 'Projects' },
  { value: 'project.updated', label: 'Project updated', group: 'Projects' },
  { value: 'project.status_changed', label: 'Project status changed', group: 'Projects' },
] as const;

export type WebhookEventType = typeof WEBHOOK_EVENT_TYPES[number]['value'];

// ── Types ───────────────────────────────────────────────────────────

export interface Webhook {
  id: string;
  workspace_id: string;
  url: string;
  events: string[];
  signing_secret: string;
  active: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  workspace_id: string;
  event_type: string;
  payload: any;
  status_code: number | null;
  response_body: string | null;
  attempt: number;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

// ── CRUD ────────────────────────────────────────────────────────────

export async function listWebhooks(): Promise<Webhook[]> {
  const wsId = await resolveWorkspaceId();
  if (!wsId) return [];
  const { data, error } = await supabase
    .from('webhooks')
    .select('*')
    .eq('workspace_id', wsId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as unknown as Webhook[];
}

export async function createWebhook(webhook: { url: string; events: string[]; description?: string }): Promise<Webhook> {
  const wsId = await resolveWorkspaceId();
  if (!wsId) throw new Error('No workspace found');

  const signingSecret = `whsec_${generateSecret(32)}`;

  const { data, error } = await supabase
    .from('webhooks')
    .insert({
      workspace_id: wsId,
      url: webhook.url,
      events: webhook.events,
      signing_secret: signingSecret,
      description: webhook.description || null,
      active: true,
    } as any)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as Webhook;
}

export async function updateWebhook(id: string, updates: Partial<Pick<Webhook, 'url' | 'events' | 'active' | 'description'>>): Promise<Webhook> {
  const { data, error } = await supabase
    .from('webhooks')
    .update({ ...updates, updated_at: new Date().toISOString() } as any)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as Webhook;
}

export async function deleteWebhook(id: string): Promise<void> {
  const { error } = await supabase.from('webhooks').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function regenerateWebhookSecret(id: string): Promise<string> {
  const newSecret = `whsec_${generateSecret(32)}`;
  const { error } = await supabase
    .from('webhooks')
    .update({ signing_secret: newSecret, updated_at: new Date().toISOString() } as any)
    .eq('id', id);
  if (error) throw new Error(error.message);
  return newSecret;
}

// ── Deliveries ──────────────────────────────────────────────────────

export async function listDeliveries(webhookId?: string, limit = 50): Promise<WebhookDelivery[]> {
  const wsId = await resolveWorkspaceId();
  if (!wsId) return [];
  let query = supabase
    .from('webhook_deliveries')
    .select('*')
    .eq('workspace_id', wsId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (webhookId) query = query.eq('webhook_id', webhookId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []) as unknown as WebhookDelivery[];
}

// ── Helpers ─────────────────────────────────────────────────────────

function generateSecret(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values).map(v => chars[v % chars.length]).join('');
}
