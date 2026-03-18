// ── Checklists API — Supabase queries ───────────────────────────────
import { supabase } from '@/integrations/supabase/client';

export interface Checklist {
  id: string;
  workspaceId: string;
  clientId: string;
  projectId?: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  items: ChecklistItem[];
}

export interface ChecklistItem {
  id: string;
  checklistId: string;
  text: string;
  completed: boolean;
  sortOrder: number;
  addedBy: 'owner' | 'client';
  createdAt: string;
}

function rowToChecklist(row: any, items: ChecklistItem[] = []): Checklist {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    clientId: row.client_id,
    projectId: row.project_id || undefined,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items,
  };
}

function rowToItem(row: any): ChecklistItem {
  return {
    id: row.id,
    checklistId: row.checklist_id,
    text: row.text,
    completed: row.completed,
    sortOrder: row.sort_order,
    addedBy: row.added_by as 'owner' | 'client',
    createdAt: row.created_at,
  };
}

export async function loadChecklists(clientId: string, projectId?: string): Promise<Checklist[]> {
  let q = supabase.from('checklists').select('*').eq('client_id', clientId);
  if (projectId) {
    q = q.eq('project_id', projectId);
  }
  const { data, error } = await q.order('created_at', { ascending: true });
  if (error) { console.error('[checklistsApi] loadChecklists:', error); return []; }

  if (!data || data.length === 0) return [];

  // Load all items for these checklists
  const ids = data.map((c: any) => c.id);
  const { data: itemsData } = await supabase
    .from('checklist_items')
    .select('*')
    .in('checklist_id', ids)
    .order('sort_order', { ascending: true });

  const itemsByChecklist: Record<string, ChecklistItem[]> = {};
  (itemsData || []).forEach((row: any) => {
    const item = rowToItem(row);
    if (!itemsByChecklist[item.checklistId]) itemsByChecklist[item.checklistId] = [];
    itemsByChecklist[item.checklistId].push(item);
  });

  return data.map((row: any) => rowToChecklist(row, itemsByChecklist[row.id] || []));
}

export async function createChecklist(
  workspaceId: string,
  clientId: string,
  title: string,
  projectId?: string,
): Promise<Checklist> {
  const { data, error } = await supabase
    .from('checklists')
    .insert({
      workspace_id: workspaceId,
      client_id: clientId,
      project_id: projectId || null,
      title,
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to create checklist: ${error.message}`);
  return rowToChecklist(data, []);
}

export async function updateChecklist(checklistId: string, updates: { title?: string }): Promise<void> {
  const row: Record<string, any> = { updated_at: new Date().toISOString() };
  if (updates.title !== undefined) row.title = updates.title;
  const { error } = await supabase.from('checklists').update(row).eq('id', checklistId);
  if (error) throw new Error(`Failed to update checklist: ${error.message}`);
}

export async function deleteChecklist(checklistId: string): Promise<void> {
  const { error } = await supabase.from('checklists').delete().eq('id', checklistId);
  if (error) throw new Error(`Failed to delete checklist: ${error.message}`);
}

export async function addChecklistItem(
  checklistId: string,
  text: string,
  sortOrder: number,
  addedBy: 'owner' | 'client' = 'owner',
): Promise<ChecklistItem> {
  const { data, error } = await supabase
    .from('checklist_items')
    .insert({ checklist_id: checklistId, text, sort_order: sortOrder, added_by: addedBy })
    .select()
    .single();
  if (error) throw new Error(`Failed to add item: ${error.message}`);
  return rowToItem(data);
}

export async function updateChecklistItem(
  itemId: string,
  updates: { text?: string; completed?: boolean; sortOrder?: number },
): Promise<void> {
  const row: Record<string, any> = {};
  if (updates.text !== undefined) row.text = updates.text;
  if (updates.completed !== undefined) row.completed = updates.completed;
  if (updates.sortOrder !== undefined) row.sort_order = updates.sortOrder;
  const { error } = await supabase.from('checklist_items').update(row).eq('id', itemId);
  if (error) throw new Error(`Failed to update item: ${error.message}`);
}

export async function deleteChecklistItem(itemId: string): Promise<void> {
  const { error } = await supabase.from('checklist_items').delete().eq('id', itemId);
  if (error) throw new Error(`Failed to delete item: ${error.message}`);
}
