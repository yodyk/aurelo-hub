// ── Shared Resources API (Phase 4) ──────────────────────────────────
// Link-first deliverables shared with a client, plus approval decisions.
import { supabase } from '@/integrations/supabase/client';

export type ResourceKind = 'link' | 'file';
export type ResourceStatus = 'shared' | 'for_review' | 'approved' | 'final';
export type ApprovalDecision = 'approved' | 'changes_requested' | 'rejected';

export interface SharedResource {
  id: string;
  workspaceId: string;
  clientId: string;
  projectId: string | null;
  kind: ResourceKind;
  provider: string | null;
  url: string | null;
  filePath: string | null;
  title: string;
  description: string | null;
  status: ResourceStatus;
  needsApproval: boolean;
  addedBy: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceApproval {
  id: string;
  resourceId: string;
  decision: ApprovalDecision;
  comment: string | null;
  decidedAt: string;
}

function rowToResource(row: any): SharedResource {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    clientId: row.client_id,
    projectId: row.project_id ?? null,
    kind: (row.kind as ResourceKind) ?? 'link',
    provider: row.provider ?? null,
    url: row.url ?? null,
    filePath: row.file_path ?? null,
    title: row.title,
    description: row.description ?? null,
    status: (row.status as ResourceStatus) ?? 'shared',
    needsApproval: row.needs_approval === true,
    addedBy: row.added_by ?? null,
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToApproval(row: any): ResourceApproval {
  return {
    id: row.id,
    resourceId: row.resource_id,
    decision: row.decision as ApprovalDecision,
    comment: row.comment ?? null,
    decidedAt: row.decided_at,
  };
}

// ── Provider detection from URL ─────────────────────────────────────

export function detectProvider(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    if (host.includes('drive.google.com') || host.includes('docs.google.com')) return 'google_drive';
    if (host.includes('dropbox.com')) return 'dropbox';
    if (host.includes('onedrive.live.com') || host.includes('1drv.ms')) return 'onedrive';
    if (host.includes('figma.com')) return 'figma';
    if (host.includes('loom.com')) return 'loom';
    if (host.includes('vimeo.com')) return 'vimeo';
    if (host.includes('youtube.com') || host.includes('youtu.be')) return 'youtube';
    if (host.includes('notion.so') || host.includes('notion.site')) return 'notion';
    if (host.includes('airtable.com')) return 'airtable';
    if (host.includes('miro.com')) return 'miro';
    if (host.includes('canva.com')) return 'canva';
    return 'url';
  } catch {
    return 'url';
  }
}

export function providerLabel(p: string | null | undefined): string {
  switch (p) {
    case 'google_drive': return 'Google Drive';
    case 'dropbox': return 'Dropbox';
    case 'onedrive': return 'OneDrive';
    case 'figma': return 'Figma';
    case 'loom': return 'Loom';
    case 'vimeo': return 'Vimeo';
    case 'youtube': return 'YouTube';
    case 'notion': return 'Notion';
    case 'airtable': return 'Airtable';
    case 'miro': return 'Miro';
    case 'canva': return 'Canva';
    case 'url': return 'Link';
    default: return 'Link';
  }
}

// ── CRUD ────────────────────────────────────────────────────────────

export async function loadResources(workspaceId: string, clientId: string): Promise<SharedResource[]> {
  const { data, error } = await supabase
    .from('shared_resources')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('client_id', clientId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) { console.error('[sharedResourcesApi] loadResources:', error); return []; }
  return (data || []).map(rowToResource);
}

export async function createResource(
  workspaceId: string,
  clientId: string,
  input: {
    title: string;
    url?: string | null;
    filePath?: string | null;
    kind?: ResourceKind;
    provider?: string | null;
    description?: string | null;
    status?: ResourceStatus;
    needsApproval?: boolean;
    projectId?: string | null;
    addedBy?: string | null;
  },
): Promise<SharedResource> {
  const kind: ResourceKind = input.kind ?? (input.url ? 'link' : 'file');
  const provider = input.provider ?? (input.url ? detectProvider(input.url) : null);
  const { data, error } = await supabase
    .from('shared_resources')
    .insert({
      workspace_id: workspaceId,
      client_id: clientId,
      project_id: input.projectId ?? null,
      kind,
      provider,
      url: input.url ?? null,
      file_path: input.filePath ?? null,
      title: input.title,
      description: input.description ?? null,
      status: input.status ?? (input.needsApproval ? 'for_review' : 'shared'),
      needs_approval: input.needsApproval === true,
      added_by: input.addedBy ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to add resource: ${error.message}`);
  return rowToResource(data);
}

export async function updateResource(
  id: string,
  updates: Partial<{
    title: string;
    description: string | null;
    url: string | null;
    provider: string | null;
    status: ResourceStatus;
    needsApproval: boolean;
    sortOrder: number;
  }>,
): Promise<void> {
  const row: Record<string, any> = {};
  if (updates.title !== undefined) row.title = updates.title;
  if (updates.description !== undefined) row.description = updates.description;
  if (updates.url !== undefined) row.url = updates.url;
  if (updates.provider !== undefined) row.provider = updates.provider;
  if (updates.status !== undefined) row.status = updates.status;
  if (updates.needsApproval !== undefined) row.needs_approval = updates.needsApproval;
  if (updates.sortOrder !== undefined) row.sort_order = updates.sortOrder;
  const { error } = await supabase.from('shared_resources').update(row).eq('id', id);
  if (error) throw new Error(`Failed to update resource: ${error.message}`);
}

export async function deleteResource(id: string): Promise<void> {
  const { error } = await supabase.from('shared_resources').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete resource: ${error.message}`);
}

// ── Approvals ──────────────────────────────────────────────────────

export async function loadApprovals(workspaceId: string, clientId: string): Promise<ResourceApproval[]> {
  const { data, error } = await supabase
    .from('resource_approvals')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('client_id', clientId)
    .order('decided_at', { ascending: false });
  if (error) { console.error('[sharedResourcesApi] loadApprovals:', error); return []; }
  return (data || []).map(rowToApproval);
}
