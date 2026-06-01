// ── Portal content API ──────────────────────────────────────────────
// Weekly portal updates + project milestones for the Client Portal (P3).
import { supabase } from '@/integrations/supabase/client';

// ── Weekly update ───────────────────────────────────────────────────

export interface PortalUpdate {
  id: string;
  workspaceId: string;
  clientId: string;
  thisWeek: string | null;
  nextWeek: string | null;
  waitingOnYou: string | null;
  postedAt: string;
  postedBy: string | null;
}

function rowToUpdate(row: any): PortalUpdate {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    clientId: row.client_id,
    thisWeek: row.this_week ?? null,
    nextWeek: row.next_week ?? null,
    waitingOnYou: row.waiting_on_you ?? null,
    postedAt: row.posted_at,
    postedBy: row.posted_by ?? null,
  };
}

export async function loadLatestPortalUpdate(clientId: string): Promise<PortalUpdate | null> {
  const { data, error } = await supabase
    .from('portal_updates')
    .select('*')
    .eq('client_id', clientId)
    .order('posted_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) { console.error('[portalContentApi] loadLatestPortalUpdate:', error); return null; }
  return data ? rowToUpdate(data) : null;
}

export async function postPortalUpdate(
  workspaceId: string,
  clientId: string,
  input: { thisWeek?: string | null; nextWeek?: string | null; waitingOnYou?: string | null },
  postedBy?: string | null,
): Promise<PortalUpdate> {
  const { data, error } = await supabase
    .from('portal_updates')
    .insert({
      workspace_id: workspaceId,
      client_id: clientId,
      this_week: input.thisWeek ?? null,
      next_week: input.nextWeek ?? null,
      waiting_on_you: input.waitingOnYou ?? null,
      posted_at: new Date().toISOString(),
      posted_by: postedBy ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to post update: ${error.message}`);
  return rowToUpdate(data);
}

// ── Milestones ──────────────────────────────────────────────────────

export type MilestoneStatus = 'upcoming' | 'in_progress' | 'complete';

export interface ProjectMilestone {
  id: string;
  workspaceId: string;
  projectId: string;
  title: string;
  status: MilestoneStatus;
  dueDate: string | null;
  sortOrder: number;
}

function rowToMilestone(row: any): ProjectMilestone {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    projectId: row.project_id,
    title: row.title,
    status: (row.status as MilestoneStatus) ?? 'upcoming',
    dueDate: row.due_date ?? null,
    sortOrder: row.sort_order ?? 0,
  };
}

export async function loadMilestones(projectId: string): Promise<ProjectMilestone[]> {
  const { data, error } = await supabase
    .from('project_milestones')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true });
  if (error) { console.error('[portalContentApi] loadMilestones:', error); return []; }
  return (data || []).map(rowToMilestone);
}

export async function createMilestone(
  workspaceId: string,
  projectId: string,
  input: { title: string; status?: MilestoneStatus; dueDate?: string | null; sortOrder?: number },
): Promise<ProjectMilestone> {
  const { data, error } = await supabase
    .from('project_milestones')
    .insert({
      workspace_id: workspaceId,
      project_id: projectId,
      title: input.title,
      status: input.status ?? 'upcoming',
      due_date: input.dueDate ?? null,
      sort_order: input.sortOrder ?? 0,
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to add milestone: ${error.message}`);
  return rowToMilestone(data);
}

export async function updateMilestone(
  id: string,
  updates: { title?: string; status?: MilestoneStatus; dueDate?: string | null; sortOrder?: number },
): Promise<void> {
  const row: Record<string, any> = {};
  if (updates.title !== undefined) row.title = updates.title;
  if (updates.status !== undefined) row.status = updates.status;
  if (updates.dueDate !== undefined) row.due_date = updates.dueDate;
  if (updates.sortOrder !== undefined) row.sort_order = updates.sortOrder;
  const { error } = await supabase.from('project_milestones').update(row).eq('id', id);
  if (error) throw new Error(`Failed to update milestone: ${error.message}`);
}

export async function deleteMilestone(id: string): Promise<void> {
  const { error } = await supabase.from('project_milestones').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete milestone: ${error.message}`);
}

// ── Share flags (single-purpose helpers) ────────────────────────────

export async function setChecklistSharedWithClient(checklistId: string, shared: boolean): Promise<void> {
  const { error } = await supabase
    .from('checklists')
    .update({ shared_with_client: shared, updated_at: new Date().toISOString() })
    .eq('id', checklistId);
  if (error) throw new Error(`Failed to update sharing: ${error.message}`);
}

export async function setChecklistItemAssignedToClient(itemId: string, assigned: boolean): Promise<void> {
  const { error } = await supabase
    .from('checklist_items')
    .update({ assigned_to_client: assigned })
    .eq('id', itemId);
  if (error) throw new Error(`Failed to update assignment: ${error.message}`);
}

export async function setNoteSharedWithClient(noteId: string, shared: boolean): Promise<void> {
  const { error } = await supabase
    .from('notes')
    .update({ shared_with_client: shared, updated_at: new Date().toISOString() })
    .eq('id', noteId);
  if (error) throw new Error(`Failed to update sharing: ${error.message}`);
}
