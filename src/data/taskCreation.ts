// ── Canonical task creation service ─────────────────────────────────
//
// Product invariant: EVERY task belongs to a client AND a list.
// No component may assemble its own checklist_items insert. All creation
// surfaces (global Tasks page, Client Detail, list footers, Focus/Today)
// route through `createTask`.
//
// Order of operations is fixed and atomic from the user's perspective:
//   1. validate client (exists, in workspace)
//   2. resolve list (explicit, or idempotent default "General")
//   3. validate list belongs to client + workspace
//   4. validate optional project belongs to client + workspace
//   5. insert with final checklist_id / client_id / workspace_id
//
// A task is never inserted first and attached afterwards.
import { supabase } from '@/integrations/supabase/client';
import { toStorableEditorContent } from '@/lib/editorContent';
import type {
  ChecklistItem, Checklist, TaskPriority, TaskSource,
} from './checklistsApi';
import type { TaskStatus } from './taskStatus';

/** Title shown for the automatic fallback list. Identity lives in `is_default`. */
export const DEFAULT_LIST_TITLE = 'General';

export interface CreateTaskInput {
  workspaceId: string;
  clientId: string;
  /** Explicit destination list. When omitted, the default list is resolved/created. */
  checklistId?: string | null;
  projectId?: string | null;
  text: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority | null;
  dueDate?: string | null;
  followUpAt?: string | null;
  estimatedHours?: number | null;
  workTags?: string[];
  repeat?: 'weekly' | 'monthly' | 'quarterly' | null;
  assignedToClient?: boolean;
  addedBy?: 'owner' | 'client';
  source?: TaskSource;
}

export interface CreateTaskResult {
  task: ChecklistItem;
  clientId: string;
  clientName: string;
  checklistId: string;
  checklistTitle: string;
  /** True when the default list had to be materialized for this create. */
  createdList: boolean;
}

function rowToChecklistLite(row: any): Checklist {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    clientId: row.client_id,
    projectId: row.project_id || undefined,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sharedWithClient: row.shared_with_client === true,
    items: [],
  };
}

/** Dev-only structured diagnostics for the rollout window. */
function diag(event: string, detail: Record<string, unknown>) {
  if (import.meta.env.DEV) console.info(`[taskCreation] ${event}`, detail);
}

/**
 * Idempotent, race-safe resolution of a client's default list.
 *
 * Identity is the `is_default` system flag (not the editable title), so a
 * user may rename the list, or create their own list also called "General",
 * without producing a duplicate fallback. A partial unique index on
 * (workspace_id, client_id) WHERE is_default AND project_id IS NULL makes
 * concurrent creation safe: the loser re-reads the winner's row.
 *
 * The list is ALWAYS created private (`shared_with_client = false`).
 */
export async function getOrCreateGeneralTaskList(
  workspaceId: string,
  clientId: string,
): Promise<{ list: Checklist; created: boolean }> {
  const findDefault = async () => {
    const { data, error } = await supabase
      .from('checklists')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('client_id', clientId)
      .is('project_id', null)
      .eq('is_default', true)
      .maybeSingle();
    if (error) throw new Error(`Couldn't look up the client's task lists: ${error.message}`);
    return data;
  };

  const existing = await findDefault();
  if (existing) return { list: rowToChecklistLite(existing), created: false };

  const { data, error } = await supabase
    .from('checklists')
    .insert({
      workspace_id: workspaceId,
      client_id: clientId,
      project_id: null,
      title: DEFAULT_LIST_TITLE,
      shared_with_client: false,   // private by default — never portal-visible
      is_default: true,
    })
    .select()
    .single();

  if (error) {
    // 23505 = unique violation: a concurrent create won the race.
    if ((error as any).code === '23505') {
      const winner = await findDefault();
      if (winner) {
        diag('general_list_race_resolved', { clientId });
        return { list: rowToChecklistLite(winner), created: false };
      }
    }
    diag('general_list_create_failed', { clientId, error: error.message });
    throw new Error(`Couldn't create the General list for this client: ${error.message}`);
  }

  return { list: rowToChecklistLite(data), created: true };
}

/** Authoritative relationship validation at the data-service boundary. */
async function validateRelations(input: CreateTaskInput, checklistId: string) {
  const [clientRes, listRes, projectRes] = await Promise.all([
    supabase.from('clients').select('id, name, workspace_id, status').eq('id', input.clientId).maybeSingle(),
    supabase.from('checklists').select('id, title, client_id, workspace_id').eq('id', checklistId).maybeSingle(),
    input.projectId
      ? supabase.from('projects').select('id, client_id, workspace_id, status').eq('id', input.projectId).maybeSingle()
      : Promise.resolve({ data: null, error: null } as any),
  ]);

  const client = clientRes.data;
  if (!client) throw new Error('That client no longer exists.');
  if (client.workspace_id !== input.workspaceId) throw new Error('That client belongs to a different workspace.');
  if ((client.status || '').toLowerCase() === 'archived') {
    throw new Error('This client is archived. Restore it before adding tasks.');
  }

  const list = listRes.data;
  if (!list) throw new Error('That task list no longer exists.');
  if (list.client_id !== input.clientId) throw new Error('That task list belongs to a different client.');
  if (list.workspace_id !== input.workspaceId) throw new Error('That task list belongs to a different workspace.');

  const project = projectRes.data;
  if (input.projectId) {
    if (!project) throw new Error('That project no longer exists.');
    if (project.client_id !== input.clientId) throw new Error('That project belongs to a different client.');
    if (project.workspace_id !== input.workspaceId) throw new Error('That project belongs to a different workspace.');
  }

  return { client, list };
}

/**
 * The single supported way to create a task anywhere in Aurelo.
 * Throws a user-presentable Error on any validation or insert failure —
 * callers keep their form open and surface `err.message`.
 */
export async function createTask(input: CreateTaskInput): Promise<CreateTaskResult> {
  const text = (input.text || '').trim();
  if (!text) throw new Error('Give the task a title.');
  if (!input.workspaceId) throw new Error('No active workspace.');
  if (!input.clientId) throw new Error('Pick a client for this task.');

  // 1–2. Resolve destination list before any write to checklist_items.
  let checklistId = input.checklistId || null;
  let createdList = false;
  if (!checklistId) {
    const { list, created } = await getOrCreateGeneralTaskList(input.workspaceId, input.clientId);
    checklistId = list.id;
    createdList = created;
  }

  // 3–4. Authoritative relationship checks.
  const { client, list } = await validateRelations(input, checklistId);

  // Next sort order within the destination list.
  const { data: last } = await supabase
    .from('checklist_items')
    .select('sort_order')
    .eq('checklist_id', checklistId)
    .order('sort_order', { ascending: false })
    .limit(1);
  const sortOrder = ((last?.[0]?.sort_order as number | undefined) ?? -1) + 1;

  // 5. Insert fully-resolved row.
  const { data, error } = await supabase
    .from('checklist_items')
    .insert({
      checklist_id: checklistId,
      workspace_id: input.workspaceId,
      client_id: input.clientId,
      project_id: input.projectId || null,
      text,
      description: toStorableEditorContent(input.description),
      status: input.status ?? 'to_do',
      work_tags: input.workTags ?? [],
      due_date: input.dueDate || null,
      follow_up_at: input.followUpAt || null,
      estimated_hours: input.estimatedHours ?? null,
      // The column only accepts low | medium | high; 'normal' is a legacy
      // label in the UI layer, so it is normalised to medium here.
      priority: input.priority === 'normal' ? 'medium'
        : (['low', 'medium', 'high'] as const).includes(input.priority as any) ? input.priority
        : null,
      repeat: input.repeat ?? null,
      assigned_to_client: input.assignedToClient === true,
      sort_order: sortOrder,
      added_by: input.addedBy ?? 'owner',
      source: input.source ?? 'manual',
    })
    .select()
    .single();

  if (error) {
    diag('task_insert_failed', { clientId: input.clientId, checklistId, error: error.message });
    throw new Error(`Couldn't create the task: ${error.message}`);
  }

  const task: ChecklistItem = {
    id: data.id,
    checklistId: data.checklist_id,
    workspaceId: data.workspace_id ?? undefined,
    clientId: data.client_id ?? undefined,
    projectId: data.project_id ?? null,
    text: data.text,
    description: data.description ?? null,
    status: (data.status as TaskStatus) ?? 'to_do',
    completed: data.status === 'complete',
    workTags: data.work_tags || [],
    dueDate: data.due_date ?? null,
    estimatedHours: data.estimated_hours ?? null,
    priority: (data.priority as TaskPriority) ?? null,
    sortOrder: data.sort_order,
    addedBy: (data.added_by as 'owner' | 'client') ?? 'owner',
    createdAt: data.created_at,
    waitingOn: data.waiting_on ?? null,
    followUpAt: data.follow_up_at ?? null,
    waitingNote: data.waiting_note ?? null,
    recurrenceId: data.recurrence_id ?? null,
    source: (data.source as TaskSource) ?? 'manual',
    completedAt: data.completed_at ?? null,
    repeat: (data.repeat as ChecklistItem['repeat']) ?? null,
    assignedToClient: data.assigned_to_client === true,
  };

  if (!task.checklistId) {
    // Should be impossible — surfaces immediately if the invariant ever breaks.
    console.error('[taskCreation] INVARIANT VIOLATION: created task has no list', task.id);
  }

  return {
    task,
    clientId: input.clientId,
    clientName: (client as any).name || 'Client',
    checklistId,
    checklistTitle: (list as any).title || DEFAULT_LIST_TITLE,
    createdList,
  };
}
