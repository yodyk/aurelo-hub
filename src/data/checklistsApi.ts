// ── Checklists API — Supabase queries ───────────────────────────────
import { supabase } from '@/integrations/supabase/client';

export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'on_hold' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

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
  description?: string | null;
  status: TaskStatus;
  completed: boolean;
  workTags: string[];
  dueDate?: string | null;
  estimatedHours?: number | null;
  priority?: TaskPriority | null;
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
    description: row.description ?? null,
    status: (row.status as TaskStatus) || (row.completed ? 'done' : 'todo'),
    completed: row.completed,
    workTags: row.work_tags || [],
    dueDate: row.due_date ?? null,
    estimatedHours: row.estimated_hours ?? null,
    priority: row.priority ?? null,
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
  if (error) throw new Error(`Failed to create list: ${error.message}`);
  return rowToChecklist(data, []);
}

export async function updateChecklist(checklistId: string, updates: { title?: string }): Promise<void> {
  const row: Record<string, any> = { updated_at: new Date().toISOString() };
  if (updates.title !== undefined) row.title = updates.title;
  const { error } = await supabase.from('checklists').update(row).eq('id', checklistId);
  if (error) throw new Error(`Failed to update list: ${error.message}`);
}

export async function deleteChecklist(checklistId: string): Promise<void> {
  const { error } = await supabase.from('checklists').delete().eq('id', checklistId);
  if (error) throw new Error(`Failed to delete list: ${error.message}`);
}

export interface NewTaskInput {
  text: string;
  description?: string | null;
  status?: TaskStatus;
  workTags?: string[];
  dueDate?: string | null;
  estimatedHours?: number | null;
  priority?: TaskPriority | null;
}

export async function addChecklistItem(
  checklistId: string,
  input: NewTaskInput | string,
  sortOrder: number,
  addedBy: 'owner' | 'client' = 'owner',
): Promise<ChecklistItem> {
  const task: NewTaskInput = typeof input === 'string' ? { text: input } : input;
  const { data, error } = await supabase
    .from('checklist_items')
    .insert({
      checklist_id: checklistId,
      text: task.text,
      description: task.description ?? null,
      status: task.status ?? 'todo',
      work_tags: task.workTags ?? [],
      due_date: task.dueDate ?? null,
      estimated_hours: task.estimatedHours ?? null,
      priority: task.priority ?? null,
      sort_order: sortOrder,
      added_by: addedBy,
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to add task: ${error.message}`);
  return rowToItem(data);
}

export interface TaskUpdates {
  text?: string;
  description?: string | null;
  status?: TaskStatus;
  completed?: boolean;
  workTags?: string[];
  dueDate?: string | null;
  estimatedHours?: number | null;
  priority?: TaskPriority | null;
  sortOrder?: number;
}

export async function updateChecklistItem(itemId: string, updates: TaskUpdates): Promise<void> {
  const row: Record<string, any> = {};
  if (updates.text !== undefined) row.text = updates.text;
  if (updates.description !== undefined) row.description = updates.description;
  if (updates.status !== undefined) row.status = updates.status;
  if (updates.completed !== undefined) row.completed = updates.completed;
  if (updates.workTags !== undefined) row.work_tags = updates.workTags;
  if (updates.dueDate !== undefined) row.due_date = updates.dueDate;
  if (updates.estimatedHours !== undefined) row.estimated_hours = updates.estimatedHours;
  if (updates.priority !== undefined) row.priority = updates.priority;
  if (updates.sortOrder !== undefined) row.sort_order = updates.sortOrder;
  const { error } = await supabase.from('checklist_items').update(row).eq('id', itemId);
  if (error) throw new Error(`Failed to update task: ${error.message}`);
}

export async function deleteChecklistItem(itemId: string): Promise<void> {
  const { error } = await supabase.from('checklist_items').delete().eq('id', itemId);
  if (error) throw new Error(`Failed to delete task: ${error.message}`);
}

// ── Workspace-wide tasks loader (for global Tasks page) ──────────────

export interface WorkspaceTask extends ChecklistItem {
  clientId: string;
  projectId?: string | null;
  checklistTitle: string;
}

export async function loadAllTasksForWorkspace(workspaceId: string): Promise<WorkspaceTask[]> {
  const { data: cls, error: clsErr } = await supabase
    .from('checklists')
    .select('id, client_id, project_id, title')
    .eq('workspace_id', workspaceId);
  if (clsErr) { console.error('[checklistsApi] loadAllTasks checklists:', clsErr); return []; }
  if (!cls || cls.length === 0) return [];

  const ids = cls.map((c: any) => c.id);
  const { data: items, error: itemsErr } = await supabase
    .from('checklist_items')
    .select('*')
    .in('checklist_id', ids)
    .order('sort_order', { ascending: true });
  if (itemsErr) { console.error('[checklistsApi] loadAllTasks items:', itemsErr); return []; }

  const byId = new Map<string, any>(cls.map((c: any) => [c.id, c]));
  return (items || []).map((row: any) => {
    const parent = byId.get(row.checklist_id);
    return {
      ...rowToItem(row),
      clientId: parent?.client_id,
      projectId: parent?.project_id ?? null,
      checklistTitle: parent?.title || 'Tasks',
    };
  });
}
