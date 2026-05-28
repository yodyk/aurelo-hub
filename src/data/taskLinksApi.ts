// ── Task Links API — link notes/files to checklist items ─────────────
import { supabase } from '@/integrations/supabase/client';

export type TaskLinkType = 'note' | 'file';

export interface TaskLink {
  id: string;
  checklistItemId: string;
  workspaceId: string;
  clientId: string;
  linkType: TaskLinkType;
  noteId?: string | null;
  filePath?: string | null;
  fileName?: string | null;
  createdAt: string;
}

function rowToLink(row: any): TaskLink {
  return {
    id: row.id,
    checklistItemId: row.checklist_item_id,
    workspaceId: row.workspace_id,
    clientId: row.client_id,
    linkType: row.link_type,
    noteId: row.note_id,
    filePath: row.file_path,
    fileName: row.file_name,
    createdAt: row.created_at,
  };
}

export async function loadTaskLinksForClient(clientId: string): Promise<Record<string, TaskLink[]>> {
  const { data, error } = await supabase
    .from('checklist_item_links')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: true });
  if (error) { console.error('[taskLinksApi] load:', error); return {}; }
  const grouped: Record<string, TaskLink[]> = {};
  (data || []).forEach((row: any) => {
    const link = rowToLink(row);
    (grouped[link.checklistItemId] ||= []).push(link);
  });
  return grouped;
}

export async function addNoteLink(params: {
  checklistItemId: string;
  workspaceId: string;
  clientId: string;
  noteId: string;
}): Promise<TaskLink> {
  const { data, error } = await supabase
    .from('checklist_item_links')
    .insert({
      checklist_item_id: params.checklistItemId,
      workspace_id: params.workspaceId,
      client_id: params.clientId,
      link_type: 'note',
      note_id: params.noteId,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToLink(data);
}

export async function addFileLink(params: {
  checklistItemId: string;
  workspaceId: string;
  clientId: string;
  filePath: string;
  fileName: string;
}): Promise<TaskLink> {
  const { data, error } = await supabase
    .from('checklist_item_links')
    .insert({
      checklist_item_id: params.checklistItemId,
      workspace_id: params.workspaceId,
      client_id: params.clientId,
      link_type: 'file',
      file_path: params.filePath,
      file_name: params.fileName,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToLink(data);
}

export async function removeTaskLink(linkId: string): Promise<void> {
  const { error } = await supabase.from('checklist_item_links').delete().eq('id', linkId);
  if (error) throw new Error(error.message);
}
