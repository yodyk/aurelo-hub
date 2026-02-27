// ── Notes API — real Supabase queries ───────────────────────────────
import { supabase } from '@/integrations/supabase/client';

export type NoteType = 'general' | 'meeting' | 'decision' | 'action-item' | 'feedback';

export interface ClientNote {
  id: string;
  clientId: string;
  content: string;
  type: NoteType;
  tags: string[];
  projectId?: string;
  projectName?: string;
  isPinned: boolean;
  isResolved: boolean;
  createdAt: string;
  updatedAt: string;
}

function rowToNote(row: any): ClientNote {
  return {
    id: row.id,
    clientId: row.client_id,
    content: row.content,
    type: row.type as NoteType,
    tags: row.tags || [],
    projectId: row.project_id || undefined,
    projectName: row.project_name || undefined,
    isPinned: row.is_pinned,
    isResolved: row.is_resolved,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function loadNotes(clientId: string): Promise<ClientNote[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('client_id', clientId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) { console.error('[notesApi] loadNotes:', error); return []; }
  return (data || []).map(rowToNote);
}

export async function addNote(clientId: string, note: Partial<ClientNote>, workspaceId: string): Promise<ClientNote> {
  const row = {
    workspace_id: workspaceId,
    client_id: clientId,
    content: note.content || '',
    type: note.type || 'general',
    tags: note.tags || [],
    project_id: note.projectId || null,
    project_name: note.projectName || null,
    is_pinned: note.isPinned || false,
    is_resolved: note.isResolved || false,
  };
  const { data, error } = await supabase.from('notes').insert(row).select().single();
  if (error) throw new Error(`Failed to add note: ${error.message}`);
  return rowToNote(data);
}

export async function updateNote(_clientId: string, noteId: string, updates: Partial<ClientNote>): Promise<Partial<ClientNote>> {
  const row: Record<string, any> = { updated_at: new Date().toISOString() };
  if (updates.content !== undefined) row.content = updates.content;
  if (updates.type !== undefined) row.type = updates.type;
  if (updates.tags !== undefined) row.tags = updates.tags;
  if (updates.projectId !== undefined) row.project_id = updates.projectId;
  if (updates.projectName !== undefined) row.project_name = updates.projectName;
  if (updates.isPinned !== undefined) row.is_pinned = updates.isPinned;
  if (updates.isResolved !== undefined) row.is_resolved = updates.isResolved;

  const { error } = await supabase.from('notes').update(row).eq('id', noteId);
  if (error) throw new Error(`Failed to update note: ${error.message}`);
  return { ...updates, updatedAt: row.updated_at };
}

export async function deleteNote(_clientId: string, noteId: string): Promise<void> {
  const { error } = await supabase.from('notes').delete().eq('id', noteId);
  if (error) throw new Error(`Failed to delete note: ${error.message}`);
}
