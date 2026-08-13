// ── Canonical task pipeline ─────────────────────────────────────────
//
//   workspace → navigation context → filter → search → buckets
//
// One implementation shared by the global Tasks page, Client Detail and
// Project Detail. No surface re-implements filtering.
import { useMemo } from 'react';
import { format, parseISO, isPast, isToday, isThisWeek, differenceInCalendarDays } from 'date-fns';
import type { WorkspaceTask } from '@/data/checklistsApi';
import { matchesTaskSearch } from '@/lib/taskSearch';
import type { TaskNavContext } from './taskNavContext';

export type TaskFilterKey =
  | 'all' | 'overdue' | 'today' | 'week' | 'waiting'
  | 'no_date' | 'in_progress' | 'in_review' | 'on_hold' | 'complete';

export const TASK_FILTERS: { key: TaskFilterKey; label: string; tone?: 'danger' | 'warning' }[] = [
  { key: 'all',        label: 'All open' },
  { key: 'overdue',    label: 'Overdue', tone: 'danger' },
  { key: 'today',      label: 'Today', tone: 'warning' },
  { key: 'week',       label: 'This week' },
  { key: 'waiting',    label: 'Waiting' },
  { key: 'in_progress',label: 'In progress' },
  { key: 'in_review',  label: 'In review' },
  { key: 'on_hold',    label: 'On hold' },
  { key: 'no_date',    label: 'No date' },
  { key: 'complete',   label: 'Complete' },
];

export function isOverdue(d?: string | null) {
  if (!d) return false;
  try { const x = parseISO(d); return isPast(x) && !isToday(x); } catch { return false; }
}
export function isDueToday(d?: string | null) {
  if (!d) return false;
  try { return isToday(parseISO(d)); } catch { return false; }
}
export function dueText(d?: string | null): { text: string; tone: 'danger' | 'warning' | 'muted' } | null {
  if (!d) return null;
  try {
    const x = parseISO(d);
    if (isToday(x)) return { text: 'Today', tone: 'warning' };
    if (isPast(x)) {
      const days = Math.abs(differenceInCalendarDays(x, new Date()));
      return { text: `${days}d overdue`, tone: 'danger' };
    }
    const diff = differenceInCalendarDays(x, new Date());
    if (diff <= 3) return { text: `in ${diff}d`, tone: 'warning' };
    return { text: format(x, 'MMM d'), tone: 'muted' };
  } catch { return null; }
}

export interface TaskBucket {
  key: string;
  label: string;
  tone?: 'danger' | 'warning' | 'muted';
  tasks: WorkspaceTask[];
}

/** Step 1 — navigation establishes the dataset. */
export function scopeTasks(
  tasks: WorkspaceTask[],
  ctx: TaskNavContext,
  hiddenClientIds?: Set<string>,
): WorkspaceTask[] {
  switch (ctx.kind) {
    case 'all':
      return hiddenClientIds?.size
        ? tasks.filter(t => !t.clientId || !hiddenClientIds.has(t.clientId))
        : tasks;
    case 'client': return tasks.filter(t => t.clientId === ctx.clientId);
    case 'list':   return tasks.filter(t => t.checklistId === ctx.listId);
  }
}


/** Step 2 — filters refine the dataset. */
export function applyFilter(tasks: WorkspaceTask[], filter: TaskFilterKey): WorkspaceTask[] {
  const open = (t: WorkspaceTask) => t.status !== 'complete';
  switch (filter) {
    case 'overdue':     return tasks.filter(t => open(t) && isOverdue(t.dueDate));
    case 'today':       return tasks.filter(t => open(t) && isDueToday(t.dueDate));
    case 'week':        return tasks.filter(t => open(t) && t.dueDate && (() => {
      try { return isThisWeek(parseISO(t.dueDate!), { weekStartsOn: 1 }); } catch { return false; }
    })());
    case 'waiting':     return tasks.filter(t => open(t) && (t.waitingOn || t.followUpAt));
    case 'no_date':     return tasks.filter(t => open(t) && !t.dueDate);
    case 'in_progress': return tasks.filter(t => t.status === 'in_progress');
    case 'in_review':   return tasks.filter(t => t.status === 'in_review');
    case 'on_hold':     return tasks.filter(t => t.status === 'on_hold');
    case 'complete':    return tasks.filter(t => t.status === 'complete');
    default:            return tasks.filter(open);
  }
}

export function filterCounts(tasks: WorkspaceTask[]): Record<TaskFilterKey, number> {
  const out = {} as Record<TaskFilterKey, number>;
  for (const f of TASK_FILTERS) out[f.key] = applyFilter(tasks, f.key).length;
  return out;
}

/**
 * A filter "still makes sense" in a new context when it can produce results
 * there. Otherwise the new context falls back to All open — predictable
 * beats clever, and nothing is persisted.
 */
export function reconcileFilter(
  filter: TaskFilterKey,
  scopedTasks: WorkspaceTask[],
): TaskFilterKey {
  if (filter === 'all') return 'all';
  return applyFilter(scopedTasks, filter).length > 0 ? filter : 'all';
}

function bucketize(tasks: WorkspaceTask[]): TaskBucket[] {
  const overdue: WorkspaceTask[] = [];
  const today: WorkspaceTask[] = [];
  const week: WorkspaceTask[] = [];
  const waiting: WorkspaceTask[] = [];
  const later: WorkspaceTask[] = [];
  const noDate: WorkspaceTask[] = [];
  const done: WorkspaceTask[] = [];

  for (const t of tasks) {
    if (t.status === 'complete') { done.push(t); continue; }
    if (t.waitingOn || t.followUpAt) { waiting.push(t); continue; }
    if (isOverdue(t.dueDate)) { overdue.push(t); continue; }
    if (isDueToday(t.dueDate)) { today.push(t); continue; }
    if (t.dueDate) {
      try {
        if (isThisWeek(parseISO(t.dueDate), { weekStartsOn: 1 })) week.push(t);
        else later.push(t);
      } catch { later.push(t); }
      continue;
    }
    noDate.push(t);
  }

  const byDate = (a: WorkspaceTask, b: WorkspaceTask) =>
    (a.dueDate ? new Date(a.dueDate).getTime() : Infinity) -
    (b.dueDate ? new Date(b.dueDate).getTime() : Infinity);

  return ([
    { key: 'overdue', label: 'Overdue', tone: 'danger' as const, tasks: overdue.sort(byDate) },
    { key: 'today',   label: 'Today',   tone: 'warning' as const, tasks: today.sort(byDate) },
    { key: 'week',    label: 'This week', tasks: week.sort(byDate) },
    { key: 'waiting', label: 'Waiting / Follow-up', tasks: waiting.sort(byDate) },
    { key: 'later',   label: 'Later',   tasks: later.sort(byDate) },
    { key: 'no_date', label: 'No date', tasks: noDate },
    { key: 'done',    label: 'Completed', tone: 'muted' as const, tasks: done.slice(0, 50) },
  ] as TaskBucket[]).filter(b => b.tasks.length > 0);
}

export interface UseTaskPipelineArgs {
  tasks: WorkspaceTask[];
  context: TaskNavContext;
  filter: TaskFilterKey;
  query: string;
  clientName?: (clientId?: string) => string | undefined;
  projectName?: (projectId?: string | null) => string | undefined;
  /** Clients excluded from the "All tasks" dataset (archived, by default). */
  hiddenClientIds?: Set<string>;
}

export function useTaskPipeline({
  tasks, context, filter, query, clientName, projectName, hiddenClientIds,
}: UseTaskPipelineArgs) {
  const scoped = useMemo(
    () => scopeTasks(tasks, context, hiddenClientIds),
    [tasks, context, hiddenClientIds],
  );

  const counts = useMemo(() => filterCounts(scoped), [scoped]);
  const filtered = useMemo(() => applyFilter(scoped, filter), [scoped, filter]);
  const searched = useMemo(() => {
    if (!query.trim()) return filtered;
    return filtered.filter(t => matchesTaskSearch(t, query, { clientName, projectName }));
  }, [filtered, query, clientName, projectName]);
  const buckets = useMemo(() => bucketize(searched), [searched]);

  return { scoped, counts, filtered, visible: searched, buckets };
}
