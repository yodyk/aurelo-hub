// ── Documents API — canonical client document system ────────────────
// One record per document, whether the bytes live in storage (kind='file')
// or at an external URL (kind='link'). Replaces the old shared_resources
// panel + raw storage listing split.
import { supabase } from '@/integrations/supabase/client';
import { loadSetting, saveSetting } from './settingsApi';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export type DocumentKind = 'file' | 'link';
export type DocumentVisibility = 'internal' | 'shared';
export type DocumentLifecycle = 'active' | 'archived';
export type ApprovalState = 'not_required' | 'pending' | 'approved' | 'rejected';
export type ApprovalDecision = 'approved' | 'changes_requested' | 'rejected';

export interface ClientDocument {
  id: string;
  workspaceId: string;
  clientId: string;
  projectId: string | null;
  kind: DocumentKind;
  provider: string | null;
  url: string | null;
  filePath: string | null;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  title: string;
  description: string | null;
  notes: string | null;
  category: string | null;
  visibility: DocumentVisibility;
  lifecycleState: DocumentLifecycle;
  approvalState: ApprovalState;
  isPinned: boolean;
  documentDate: string | null;
  addedBy: string | null;
  updatedBy: string | null;
  source: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentApproval {
  id: string;
  documentId: string;
  decision: ApprovalDecision;
  comment: string | null;
  decidedAt: string;
}

function rowToDocument(row: any): ClientDocument {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    clientId: row.client_id,
    projectId: row.project_id ?? null,
    kind: (row.kind as DocumentKind) ?? 'link',
    provider: row.provider ?? null,
    url: row.url ?? null,
    filePath: row.file_path ?? null,
    fileName: row.file_name ?? null,
    fileSize: row.file_size ?? null,
    mimeType: row.mime_type ?? null,
    title: row.title,
    description: row.description ?? null,
    notes: row.notes ?? null,
    category: row.category ?? null,
    visibility: (row.visibility as DocumentVisibility) ?? 'internal',
    lifecycleState: (row.lifecycle_state as DocumentLifecycle) ?? 'active',
    approvalState: (row.approval_state as ApprovalState) ?? 'not_required',
    isPinned: row.is_pinned === true,
    documentDate: row.document_date ?? null,
    addedBy: row.added_by ?? null,
    updatedBy: row.updated_by ?? null,
    source: row.source ?? 'manual',
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── Categories (workspace-configurable) ─────────────────────────────

export const DEFAULT_DOCUMENT_CATEGORIES = [
  'Proposal',
  'Contract',
  'Retainer',
  'Invoice',
  'Financial',
  'Legal',
  'Brand Assets',
  'Marketing Assets',
  'Sales Assets',
  'Design Files',
  'Creative Assets',
  'Website Assets',
  'Content',
  'Social Media',
  'Photography',
  'Video',
  'Training',
  'Onboarding',
  'Project Deliverables',
  'Reports',
  'Research',
  'Meeting Notes',
  'Client Information',
  'Reference Material',
  'Miscellaneous',
];

export async function loadDocumentCategories(workspaceId?: string): Promise<string[]> {
  const stored = await loadSetting('documents', workspaceId);
  const list = stored?.categories;
  if (Array.isArray(list) && list.length > 0) return list;
  return DEFAULT_DOCUMENT_CATEGORIES;
}

export async function saveDocumentCategories(categories: string[], workspaceId?: string): Promise<void> {
  await saveSetting('documents', { categories }, workspaceId);
}

// ── Provider + icon detection ───────────────────────────────────────

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
    default: return 'Link';
  }
}

/** Coarse visual family used to pick an icon + accent colour. */
export type DocVisualType =
  | 'pdf' | 'word' | 'spreadsheet' | 'presentation' | 'image' | 'video' | 'audio'
  | 'archive' | 'code' | 'text' | 'figma' | 'drive' | 'loom' | 'notion' | 'link' | 'file';

export function visualType(doc: Pick<ClientDocument, 'kind' | 'mimeType' | 'fileName' | 'provider'>): DocVisualType {
  if (doc.kind === 'link') {
    switch (doc.provider) {
      case 'figma': return 'figma';
      case 'google_drive':
      case 'dropbox':
      case 'onedrive': return 'drive';
      case 'loom':
      case 'vimeo':
      case 'youtube': return 'loom';
      case 'notion': return 'notion';
      default: return 'link';
    }
  }
  const mime = (doc.mimeType || '').toLowerCase();
  const ext = (doc.fileName || '').split('.').pop()?.toLowerCase() || '';
  if (mime.includes('pdf') || ext === 'pdf') return 'pdf';
  if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif', 'heic'].includes(ext)) return 'image';
  if (mime.startsWith('video/') || ['mp4', 'mov', 'webm', 'avi', 'mkv'].includes(ext)) return 'video';
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'm4a', 'aac'].includes(ext)) return 'audio';
  if (['doc', 'docx', 'rtf', 'odt', 'pages'].includes(ext) || mime.includes('wordprocessing')) return 'word';
  if (['xls', 'xlsx', 'csv', 'numbers', 'ods'].includes(ext) || mime.includes('spreadsheet')) return 'spreadsheet';
  if (['ppt', 'pptx', 'key', 'odp'].includes(ext) || mime.includes('presentation')) return 'presentation';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
  if (['json', 'xml', 'yml', 'yaml', 'ts', 'js', 'html', 'css'].includes(ext)) return 'code';
  if (['txt', 'md'].includes(ext) || mime.startsWith('text/')) return 'text';
  return 'file';
}

// ── Storage helpers ─────────────────────────────────────────────────

function clientFolder(workspaceId: string, clientId: string) {
  return `${workspaceId}/client-${clientId}`;
}

export async function getSignedUrl(filePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from('client-files').createSignedUrl(filePath, 3600);
  if (error || !data) return null;
  return data.signedUrl;
}

async function uploadToStorage(workspaceId: string, clientId: string, file: File): Promise<string> {
  const path = `${clientFolder(workspaceId, clientId)}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from('client-files').upload(path, file);
  if (error) throw new Error(`Failed to upload file: ${error.message}`);
  return path;
}

// ── CRUD ────────────────────────────────────────────────────────────

export async function loadDocuments(workspaceId: string, clientId: string): Promise<ClientDocument[]> {
  const { data, error } = await supabase
    .from('client_documents')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('client_id', clientId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) { console.error('[documentsApi] loadDocuments:', error); return []; }
  return (data || []).map(rowToDocument);
}

/**
 * Storage objects that exist in the client folder without a matching
 * document row (uploaded before this system, or outside the app).
 */
export async function findOrphanFiles(
  workspaceId: string,
  clientId: string,
  known: ClientDocument[],
): Promise<{ path: string; name: string; size: number; createdAt: string }[]> {
  const folder = clientFolder(workspaceId, clientId);
  const { data, error } = await supabase.storage
    .from('client-files')
    .list(folder, { limit: 500, sortBy: { column: 'created_at', order: 'desc' } });
  if (error || !data) return [];
  const knownPaths = new Set(known.map((d) => d.filePath).filter(Boolean) as string[]);
  return data
    .filter((f) => f.id && !knownPaths.has(`${folder}/${f.name}`))
    .map((f) => ({
      path: `${folder}/${f.name}`,
      name: f.name.replace(/^\d{10,}-/, ''),
      size: (f as any).metadata?.size || 0,
      createdAt: (f as any).created_at || new Date().toISOString(),
    }));
}

/** Adopt legacy storage objects into document rows (idempotent). */
export async function adoptOrphanFiles(
  workspaceId: string,
  clientId: string,
  orphans: { path: string; name: string; size: number; createdAt: string }[],
): Promise<ClientDocument[]> {
  if (orphans.length === 0) return [];
  const rows = orphans.map((o) => ({
    workspace_id: workspaceId,
    client_id: clientId,
    kind: 'file',
    file_path: o.path,
    file_name: o.name,
    file_size: o.size,
    title: o.name,
    visibility: 'internal',
    lifecycle_state: 'active',
    approval_state: 'not_required',
    document_date: o.createdAt.slice(0, 10),
    source: 'manual',
  }));
  const { data, error } = await supabase.from('client_documents').insert(rows).select();
  if (error) { console.error('[documentsApi] adoptOrphanFiles:', error); return []; }
  return (data || []).map(rowToDocument);
}

export interface DocumentInput {
  title: string;
  description?: string | null;
  notes?: string | null;
  category?: string | null;
  visibility?: DocumentVisibility;
  requestApproval?: boolean;
  documentDate?: string | null;
  isPinned?: boolean;
  projectId?: string | null;
  url?: string | null;
  file?: File | null;
}

export async function createDocument(
  workspaceId: string,
  clientId: string,
  input: DocumentInput,
): Promise<ClientDocument> {
  const visibility: DocumentVisibility = input.visibility ?? 'internal';
  const wantsApproval = visibility === 'shared' && input.requestApproval === true;

  let kind: DocumentKind = 'link';
  let filePath: string | null = null;
  let fileName: string | null = null;
  let fileSize: number | null = null;
  let mimeType: string | null = null;

  if (input.file) {
    kind = 'file';
    filePath = await uploadToStorage(workspaceId, clientId, input.file);
    fileName = input.file.name;
    fileSize = input.file.size;
    mimeType = input.file.type || null;
  }

  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes?.user?.id ?? null;

  const { data, error } = await supabase
    .from('client_documents')
    .insert({
      workspace_id: workspaceId,
      client_id: clientId,
      project_id: input.projectId ?? null,
      kind,
      provider: kind === 'link' && input.url ? detectProvider(input.url) : null,
      url: kind === 'link' ? input.url ?? null : null,
      file_path: filePath,
      file_name: fileName,
      file_size: fileSize,
      mime_type: mimeType,
      title: input.title,
      description: input.description ?? null,
      notes: input.notes ?? null,
      category: input.category ?? null,
      visibility,
      lifecycle_state: 'active',
      approval_state: wantsApproval ? 'pending' : 'not_required',
      needs_approval: wantsApproval,
      status: wantsApproval ? 'for_review' : 'shared',
      is_pinned: input.isPinned === true,
      document_date: input.documentDate ?? new Date().toISOString().slice(0, 10),
      added_by: uid,
      updated_by: uid,
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to add document: ${error.message}`);
  return rowToDocument(data);
}

export type DocumentUpdates = Partial<{
  title: string;
  description: string | null;
  notes: string | null;
  category: string | null;
  visibility: DocumentVisibility;
  lifecycleState: DocumentLifecycle;
  approvalState: ApprovalState;
  isPinned: boolean;
  documentDate: string | null;
  url: string | null;
  projectId: string | null;
}>;

export async function updateDocument(id: string, updates: DocumentUpdates): Promise<void> {
  const row: Record<string, any> = { updated_at: new Date().toISOString() };
  if (updates.title !== undefined) row.title = updates.title;
  if (updates.description !== undefined) row.description = updates.description;
  if (updates.notes !== undefined) row.notes = updates.notes;
  if (updates.category !== undefined) row.category = updates.category;
  if (updates.lifecycleState !== undefined) row.lifecycle_state = updates.lifecycleState;
  if (updates.isPinned !== undefined) row.is_pinned = updates.isPinned;
  if (updates.documentDate !== undefined) row.document_date = updates.documentDate;
  if (updates.projectId !== undefined) row.project_id = updates.projectId;
  if (updates.url !== undefined) {
    row.url = updates.url;
    row.provider = updates.url ? detectProvider(updates.url) : null;
  }
  if (updates.visibility !== undefined) {
    row.visibility = updates.visibility;
    // Going internal always cancels a pending approval request.
    if (updates.visibility === 'internal' && updates.approvalState === undefined) {
      row.approval_state = 'not_required';
      row.needs_approval = false;
    }
  }
  if (updates.approvalState !== undefined) {
    row.approval_state = updates.approvalState;
    row.needs_approval = updates.approvalState === 'pending';
    row.status = updates.approvalState === 'approved' ? 'approved'
      : updates.approvalState === 'pending' ? 'for_review'
      : 'shared';
  }
  const { error } = await supabase.from('client_documents').update(row).eq('id', id);
  if (error) throw new Error(`Failed to update document: ${error.message}`);
}

export async function archiveDocument(id: string, archived = true): Promise<void> {
  await updateDocument(id, { lifecycleState: archived ? 'archived' : 'active' });
}

export async function deleteDocument(doc: ClientDocument): Promise<void> {
  if (doc.filePath) {
    await supabase.storage.from('client-files').remove([doc.filePath]);
  }
  const { error } = await supabase.from('client_documents').delete().eq('id', doc.id);
  if (error) throw new Error(`Failed to delete document: ${error.message}`);
}

// ── Approvals ──────────────────────────────────────────────────────

export async function loadApprovals(workspaceId: string, clientId: string): Promise<DocumentApproval[]> {
  const { data, error } = await supabase
    .from('document_approvals')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('client_id', clientId)
    .order('decided_at', { ascending: false });
  if (error) { console.error('[documentsApi] loadApprovals:', error); return []; }
  return (data || []).map((row: any) => ({
    id: row.id,
    documentId: row.document_id,
    decision: row.decision as ApprovalDecision,
    comment: row.comment ?? null,
    decidedAt: row.decided_at,
  }));
}

export { SUPABASE_URL };
