// ── Data API — real Supabase queries ─────────────────────────────────
import { supabase } from '@/integrations/supabase/client';
import * as storage from './storageApi';
import { dispatchWebhookEvent } from './webhookDispatch';
// ── Helpers ─────────────────────────────────────────────────────────

function snakeToCamel(row: Record<string, any>): Record<string, any> {
  const map: Record<string, string> = {
    contact_name: 'contactName',
    contact_email: 'contactEmail',
    show_portal_costs: 'showPortalCosts',
    monthly_earnings: 'monthlyEarnings',
    lifetime_revenue: 'lifetimeRevenue',
    hours_logged: 'hoursLogged',
    retainer_remaining: 'retainerRemaining',
    retainer_total: 'retainerTotal',
    true_hourly_rate: 'trueHourlyRate',
    last_session_date: 'lastSessionDate',
    external_links: 'externalLinks',
    workspace_id: 'workspaceId',
    created_at: 'createdAt',
    updated_at: 'updatedAt',
    client_id: 'clientId',
    project_id: 'projectId',
    allocation_type: 'allocationType',
    logged_by: 'loggedBy',
    work_tags: 'workTags',
    timer_start: 'timerStart',
    timer_end: 'timerEnd',
    estimated_hours: 'estimatedHours',
    total_value: 'totalValue',
    start_date: 'startDate',
    end_date: 'endDate',
    budget_type: 'budgetType',
    budget_amount: 'budgetAmount',
    portal_greeting: 'portalGreeting',
    priority_level: 'priorityLevel',
    risk_level: 'riskLevel',
    custom_fields: 'customFields',
  };
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    out[map[k] || k] = v;
  }
  return out;
}

function camelToSnake(obj: Record<string, any>): Record<string, any> {
  const map: Record<string, string> = {
    contactName: 'contact_name',
    contactEmail: 'contact_email',
    showPortalCosts: 'show_portal_costs',
    monthlyEarnings: 'monthly_earnings',
    lifetimeRevenue: 'lifetime_revenue',
    hoursLogged: 'hours_logged',
    retainerRemaining: 'retainer_remaining',
    retainerTotal: 'retainer_total',
    trueHourlyRate: 'true_hourly_rate',
    lastSessionDate: 'last_session_date',
    externalLinks: 'external_links',
    workspaceId: 'workspace_id',
    clientId: 'client_id',
    projectId: 'project_id',
    allocationType: 'allocation_type',
    loggedBy: 'logged_by',
    workTags: 'work_tags',
    timerStart: 'timer_start',
    timerEnd: 'timer_end',
    estimatedHours: 'estimated_hours',
    totalValue: 'total_value',
    startDate: 'start_date',
    endDate: 'end_date',
    budgetType: 'budget_type',
    budgetAmount: 'budget_amount',
    portalGreeting: 'portal_greeting',
    priorityLevel: 'priority_level',
    riskLevel: 'risk_level',
    customFields: 'custom_fields',
  };
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    out[map[k] || k] = v;
  }
  return out;
}

function formatSessionRow(row: any): any {
  const s = snakeToCamel(row);
  // Add derived fields the UI expects
  const client = row._client_name; // joined
  const dateObj = new Date(s.date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const isToday = dateObj.toDateString() === today.toDateString();
  const isYesterday = dateObj.toDateString() === yesterday.toDateString();
  s.dateGroup = isToday ? 'Today' : isYesterday ? 'Yesterday' : 'This week';
  s.date = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return s;
}

// ── Init (bulk load) ────────────────────────────────────────────────

export async function loadInitData(workspaceId: string) {
  const [clientsRes, sessionsRes, settingsRes, avatarUrl, logoUrls] = await Promise.all([
    supabase.from('clients').select('*').eq('workspace_id', workspaceId).order('name'),
    supabase.from('sessions').select('*, clients!inner(name)').eq('workspace_id', workspaceId).order('date', { ascending: false }).limit(500),
    supabase.from('workspace_settings').select('section, data').eq('workspace_id', workspaceId),
    storage.getAvatarUrl(workspaceId),
    storage.getLogoUrls(workspaceId),
  ]);

  const clients = (clientsRes.data || []).map(snakeToCamel);
  const sessions = (sessionsRes.data || []).map((row: any) => {
    const s = snakeToCamel(row);
    s.client = row.clients?.name || '';
    delete s.clients;
    s.rawDate = String(row.date);
    const dateObj = parseLocalDate(row.date);
    const today = new Date();
    const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
    s.dateGroup = dateObj.toDateString() === today.toDateString() ? 'Today'
      : dateObj.toDateString() === yesterday.toDateString() ? 'Yesterday' : 'This week';
    s.date = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return s;
  });

  // Parse settings sections into a flat object
  const settingsMap: Record<string, any> = {};
  for (const row of settingsRes.data || []) {
    settingsMap[row.section] = row.data;
  }

  // Load workspace plan info
  const { data: ws } = await supabase.from('workspaces').select('plan_id, plan_activated_at, is_trial, trial_end').eq('id', workspaceId).single();

  return {
    clients,
    sessions,
    avatar: avatarUrl ? { url: avatarUrl, fileName: 'avatar' } : null,
    logos: {
      app: logoUrls.app ? { url: logoUrls.app, fileName: logoUrls.app.split('/').pop() || 'app.png' } : null,
      email: logoUrls.email ? { url: logoUrls.email, fileName: logoUrls.email.split('/').pop() || 'email.png' } : null,
    },
    settings: {
      workspace: settingsMap.workspace || null,
      financial: settingsMap.financial || null,
      identity: settingsMap.identity || null,
      categories: settingsMap.categories || null,
    },
    plan: ws ? { planId: ws.plan_id, activatedAt: ws.plan_activated_at, isTrial: ws.is_trial, trialEnd: ws.trial_end } : null,
  };
}

// ── Clients ─────────────────────────────────────────────────────────

export async function loadClients(workspaceId: string) {
  const { data, error } = await supabase.from('clients').select('*').eq('workspace_id', workspaceId).order('name');
  if (error) { console.error('[dataApi] loadClients:', error); return []; }
  return (data || []).map(snakeToCamel);
}

export async function addClient(workspaceId: string, client: any) {
  const slug = client.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const snaked = camelToSnake(client);
  const row: Record<string, any> = { ...snaked, workspace_id: workspaceId, slug, name: client.name };
  // Remove fields that shouldn't be inserted
  delete row.id;
  delete row.createdAt;
  delete row.updatedAt;
  const { data, error } = await supabase.from('clients').insert(row as any).select().single();
  if (error) throw new Error(`Failed to add client: ${error.message}`);
  const result = snakeToCamel(data);
  dispatchWebhookEvent(workspaceId, 'client.created', { id: data.id, name: data.name });
  return result;
}

export async function updateClient(workspaceId: string, clientId: string, updates: any) {
  const row = camelToSnake(updates);
  delete row.id;
  delete row.workspace_id;
  const { error } = await supabase.from('clients').update(row).eq('id', clientId).eq('workspace_id', workspaceId);
  if (error) throw new Error(`Failed to update client: ${error.message}`);
  dispatchWebhookEvent(workspaceId, 'client.updated', { id: clientId, updates });
}

export async function deleteClient(workspaceId: string, clientId: string) {
  const { error } = await supabase.from('clients').delete().eq('id', clientId).eq('workspace_id', workspaceId);
  if (error) throw new Error(`Failed to delete client: ${error.message}`);
  dispatchWebhookEvent(workspaceId, 'client.deleted', { id: clientId });
}

// ── Sessions ────────────────────────────────────────────────────────

export async function loadSessions(workspaceId: string) {
  const { data, error } = await supabase
    .from('sessions')
    .select('*, clients!inner(name)')
    .eq('workspace_id', workspaceId)
    .order('date', { ascending: false })
    .limit(500);
  if (error) { console.error('[dataApi] loadSessions:', error); return []; }
  return (data || []).map((row: any) => {
    const s = snakeToCamel(row);
    s.client = row.clients?.name || '';
    delete s.clients;
    s.rawDate = String(row.date);
    const dateObj = parseLocalDate(row.date);
    const today = new Date();
    const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
    s.dateGroup = dateObj.toDateString() === today.toDateString() ? 'Today'
      : dateObj.toDateString() === yesterday.toDateString() ? 'Yesterday' : 'This week';
    s.date = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return s;
  });
}

export async function addSession(workspaceId: string, session: any) {
  // Get current user id for logged_by
  const { data: { user } } = await supabase.auth.getUser();
  const row: any = {
    workspace_id: workspaceId,
    client_id: session.clientId,
    date: session.rawDate || new Date().toISOString().split('T')[0],
    duration: session.duration || 0,
    revenue: session.revenue || 0,
    billable: session.billable ?? true,
    task: session.task || null,
    work_tags: session.workTags || [],
    allocation_type: session.allocationType || null,
    project_id: session.projectId || null,
    logged_by: user?.id,
  };
  const { data, error } = await supabase.from('sessions').insert(row).select('*, clients!inner(name)').single();
  if (error) throw new Error(`Failed to add session: ${error.message}`);
  const s = snakeToCamel(data);
  s.client = data.clients?.name || session.client || '';
  delete s.clients;
  s.rawDate = String(data.date);
  const dateObj = parseLocalDate(data.date);
  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  s.dateGroup = dateObj.toDateString() === today.toDateString() ? 'Today'
    : dateObj.toDateString() === yesterday.toDateString() ? 'Yesterday' : 'This week';
  s.date = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  dispatchWebhookEvent(workspaceId, 'session.created', { id: data.id, client_id: data.client_id, duration: data.duration, revenue: data.revenue });
  return s;
}

export async function updateSession(workspaceId: string, sessionId: string, updates: any) {
  const row: any = {};
  if (updates.task !== undefined) row.task = updates.task;
  if (updates.duration !== undefined) row.duration = updates.duration;
  if (updates.revenue !== undefined) row.revenue = updates.revenue;
  if (updates.billable !== undefined) row.billable = updates.billable;
  if (updates.workTags !== undefined) row.work_tags = updates.workTags;
  if (updates.rawDate !== undefined) row.date = updates.rawDate;
  if (updates.allocationType !== undefined) row.allocation_type = updates.allocationType;
  if (updates.projectId !== undefined) row.project_id = updates.projectId || null;
  if (updates.clientId !== undefined) row.client_id = updates.clientId;

  const { data, error } = await supabase
    .from('sessions')
    .update(row)
    .eq('id', sessionId)
    .eq('workspace_id', workspaceId)
    .select('*, clients!inner(name)')
    .single();
  if (error) throw new Error(`Failed to update session: ${error.message}`);
  const s = snakeToCamel(data);
  s.client = data.clients?.name || '';
  delete s.clients;
  const dateObj = new Date(data.date);
  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  s.dateGroup = dateObj.toDateString() === today.toDateString() ? 'Today'
    : dateObj.toDateString() === yesterday.toDateString() ? 'Yesterday' : 'This week';
  s.date = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  dispatchWebhookEvent(workspaceId, 'session.updated', { id: data.id, client_id: data.client_id, updates });
  return s;
}

export async function deleteSession(workspaceId: string, sessionId: string) {
  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', sessionId)
    .eq('workspace_id', workspaceId);
  if (error) throw new Error(`Failed to delete session: ${error.message}`);
  dispatchWebhookEvent(workspaceId, 'session.deleted', { id: sessionId });
}

// ── Projects ────────────────────────────────────────────────────────

export async function loadProjects(workspaceId: string, clientId: string) {
  const { data, error } = await supabase.from('projects').select('*').eq('workspace_id', workspaceId).eq('client_id', clientId).order('created_at', { ascending: false });
  if (error) { console.error('[dataApi] loadProjects:', error); return []; }
  return (data || []).map(snakeToCamel);
}

export async function saveProjects(_workspaceId: string, _clientId: string, _projects: any[]) {
  // Batch update not commonly needed; individual updateProject calls handle this
}

export async function addProject(workspaceId: string, clientId: string, project: any) {
  const row: any = {
    workspace_id: workspaceId,
    client_id: clientId,
    name: project.name,
    status: project.status || 'In Progress',
    hours: project.hours || 0,
    estimated_hours: project.estimatedHours || 0,
    revenue: project.revenue || 0,
    total_value: project.totalValue || 0,
    start_date: project.startDate || null,
    end_date: project.endDate || null,
    description: project.description || null,
    budget_type: project.budgetType || null,
    budget_amount: project.budgetAmount || 0,
  };
  const { data, error } = await supabase.from('projects').insert(row).select().single();
  if (error) throw new Error(`Failed to add project: ${error.message}`);
  dispatchWebhookEvent(workspaceId, 'project.created', { id: data.id, name: data.name, client_id: clientId });
  return snakeToCamel(data);
}

export async function updateProject(workspaceId: string, _clientId: string, projectId: string, updates: any) {
  const row = camelToSnake(updates);
  delete row.id;
  delete row.workspace_id;
  delete row.client_id;
  const prevStatus = updates._prevStatus; // optional: pass previous status for status_changed detection
  const { error } = await supabase.from('projects').update(row).eq('id', projectId).eq('workspace_id', workspaceId);
  if (error) throw new Error(`Failed to update project: ${error.message}`);
  dispatchWebhookEvent(workspaceId, 'project.updated', { id: projectId, updates });
  if (updates.status && prevStatus && updates.status !== prevStatus) {
    dispatchWebhookEvent(workspaceId, 'project.status_changed', { id: projectId, from: prevStatus, to: updates.status });
  }
}

export async function loadAllProjects(workspaceId: string) {
  const { data, error } = await supabase.from('projects').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false });
  if (error) { console.error('[dataApi] loadAllProjects:', error); return []; }
  return (data || []).map(snakeToCamel);
}

export async function deleteProject(workspaceId: string, projectId: string) {
  const { error } = await supabase.from('projects').delete().eq('id', projectId).eq('workspace_id', workspaceId);
  if (error) throw new Error(`Failed to delete project: ${error.message}`);
  dispatchWebhookEvent(workspaceId, 'project.deleted', { id: projectId });
}

// ── Files (delegated to storageApi) ─────────────────────────────────

export { loadFiles, uploadFile, deleteFile } from './storageApi';
