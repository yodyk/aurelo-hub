// ── Notifications API — real Supabase queries ──────────────────────
import { supabase } from '@/integrations/supabase/client';

export interface Notification {
  id: string;
  workspace_id: string;
  user_id: string | null;
  category: string; // 'session' | 'invoice' | 'team' | 'client' | 'insight'
  event_type: string;
  title: string;
  body: string | null;
  metadata: Record<string, any>;
  is_read: boolean;
  email_sent: boolean;
  created_at: string;
}

export interface NotificationPreference {
  id: string;
  workspace_id: string;
  user_id: string;
  category: string;
  in_app: boolean;
  email: boolean;
}

// ── Fetch notifications ─────────────────────────────────────────────

export async function loadNotifications(workspaceId: string, limit = 50): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) { console.error('[notificationsApi] loadNotifications:', error); return []; }
  return (data || []) as unknown as Notification[];
}

// ── Mark as read ────────────────────────────────────────────────────

export async function markAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);
  if (error) console.error('[notificationsApi] markAsRead:', error);
}

export async function markAllAsRead(workspaceId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('workspace_id', workspaceId)
    .eq('is_read', false)
    .or(`user_id.is.null,user_id.eq.${user.id}`);
  if (error) console.error('[notificationsApi] markAllAsRead:', error);
}

// ── Dismiss (delete) ────────────────────────────────────────────────

export async function dismissNotification(notificationId: string): Promise<void> {
  // We mark as read + hide by updating; only admins can hard-delete
  await markAsRead(notificationId);
}

// ── Create notification ─────────────────────────────────────────────

export async function createNotification(params: {
  workspaceId: string;
  userId?: string | null;
  category: string;
  eventType: string;
  title: string;
  body?: string;
  metadata?: Record<string, any>;
}): Promise<Notification | null> {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      workspace_id: params.workspaceId,
      user_id: params.userId || null,
      category: params.category,
      event_type: params.eventType,
      title: params.title,
      body: params.body || null,
      metadata: params.metadata || {},
    })
    .select()
    .maybeSingle();
  if (error) { console.error('[notificationsApi] createNotification:', error); return null; }
  return data as unknown as Notification;
}

// ── Preferences ─────────────────────────────────────────────────────

export async function loadPreferences(workspaceId: string): Promise<NotificationPreference[]> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('workspace_id', workspaceId);
  if (error) { console.error('[notificationsApi] loadPreferences:', error); return []; }
  return (data || []) as unknown as NotificationPreference[];
}

export async function upsertPreference(params: {
  workspaceId: string;
  userId: string;
  category: string;
  inApp: boolean;
  email: boolean;
}): Promise<void> {
  const { error } = await supabase
    .from('notification_preferences')
    .upsert({
      workspace_id: params.workspaceId,
      user_id: params.userId,
      category: params.category,
      in_app: params.inApp,
      email: params.email,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'workspace_id,user_id,category' });
  if (error) console.error('[notificationsApi] upsertPreference:', error);
}

// ── Realtime subscription ───────────────────────────────────────────

export function subscribeToNotifications(
  workspaceId: string,
  onNew: (n: Notification) => void
) {
  const channel = supabase
    .channel(`notifications:${workspaceId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `workspace_id=eq.${workspaceId}`,
      },
      (payload) => {
        onNew(payload.new as unknown as Notification);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ── Notification helpers for common events ──────────────────────────

export const NotificationEvents = {
  sessionLogged: (wsId: string, clientName: string, hours: number, meta?: Record<string, any>) =>
    createNotification({
      workspaceId: wsId,
      category: 'session',
      eventType: 'session_logged',
      title: `Session logged for ${clientName}`,
      body: `${hours.toFixed(1)} hours recorded`,
      metadata: meta || {},
    }),

  invoiceCreated: (wsId: string, invoiceNum: string, clientName: string, total: number, meta?: Record<string, any>) =>
    createNotification({
      workspaceId: wsId,
      category: 'invoice',
      eventType: 'invoice_created',
      title: `Invoice ${invoiceNum} created`,
      body: `$${total.toFixed(2)} for ${clientName}`,
      metadata: meta || {},
    }),

  invoicePaid: (wsId: string, invoiceNum: string, clientName: string, total: number, meta?: Record<string, any>) =>
    createNotification({
      workspaceId: wsId,
      category: 'invoice',
      eventType: 'invoice_paid',
      title: `Invoice ${invoiceNum} paid`,
      body: `$${total.toFixed(2)} received from ${clientName}`,
      metadata: meta || {},
    }),

  invoiceOverdue: (wsId: string, invoiceNum: string, clientName: string, meta?: Record<string, any>) =>
    createNotification({
      workspaceId: wsId,
      category: 'invoice',
      eventType: 'invoice_overdue',
      title: `Invoice ${invoiceNum} is overdue`,
      body: `Follow up with ${clientName}`,
      metadata: meta || {},
    }),

  clientAdded: (wsId: string, clientName: string, meta?: Record<string, any>) =>
    createNotification({
      workspaceId: wsId,
      category: 'client',
      eventType: 'client_added',
      title: `New client added`,
      body: clientName,
      metadata: meta || {},
    }),

  clientStatusChanged: (wsId: string, clientName: string, newStatus: string, meta?: Record<string, any>) =>
    createNotification({
      workspaceId: wsId,
      category: 'client',
      eventType: 'client_status_changed',
      title: `${clientName} status changed`,
      body: `Now ${newStatus}`,
      metadata: meta || {},
    }),

  memberJoined: (wsId: string, memberName: string, meta?: Record<string, any>) =>
    createNotification({
      workspaceId: wsId,
      category: 'team',
      eventType: 'member_joined',
      title: `${memberName} joined the workspace`,
      metadata: meta || {},
    }),

  retainerWarning: (wsId: string, clientName: string, pctUsed: number, meta?: Record<string, any>) =>
    createNotification({
      workspaceId: wsId,
      category: 'insight',
      eventType: 'retainer_warning',
      title: `${clientName} retainer at ${Math.round(pctUsed)}%`,
      body: 'Consider discussing renewal',
      metadata: meta || {},
    }),

  insightAlert: (wsId: string, title: string, body: string, meta?: Record<string, any>) =>
    createNotification({
      workspaceId: wsId,
      category: 'insight',
      eventType: 'insight_alert',
      title,
      body,
      metadata: meta || {},
    }),
};
