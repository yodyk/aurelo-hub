/**
 * Tasks — first-class task page.
 *
 * Flat list grouped into time buckets (Overdue, Today, This week, Later,
 * Waiting, No date, Completed). Rows open the TaskDrawer for full editing.
 * Status uses the explicit popover — no click-to-cycle. Quick Add parses
 * natural-language input via parseQuickTask.
 */
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { containerVariants, itemVariants } from '@/lib/motion';
import {
  CheckSquare, Filter, Loader2, ChevronDown, ChevronRight,
  Hourglass, Plus, X, Repeat, Search,
} from 'lucide-react';
import { format, parseISO, isPast, isToday, isThisWeek, differenceInCalendarDays } from 'date-fns';

import { useAuth } from '@/data/AuthContext';
import { useData } from '@/data/DataContext';
import {
  loadAllTasksForWorkspace, materializeRecurrence,
  updateChecklistItem, deleteChecklistItem,
  type WorkspaceTask,
} from '@/data/checklistsApi';
import { STATUS_BY_VALUE, type TaskStatus } from '@/data/taskStatus';
import { useTaskDrawer } from '@/data/TaskDrawerContext';
import { TaskStatusPopover } from '@/components/TaskStatusPopover';
import { matchesTaskSearch } from '@/lib/taskSearch';
import TaskModal from '@/components/task/TaskModal';
import { toast } from '@/lib/toast';
import { deferredDelete } from '@/lib/deferredDelete';
import { EmptyState } from '@/components/primitives/EmptyState';
import { ClientAvatar, useClientFavicons } from '@/components/ClientAvatar';


type FilterKey = 'all' | 'overdue' | 'today' | 'week' | 'waiting' | 'no_date' | 'in_review' | 'complete';
type Scope = 'mine' | 'all';

interface Bucket {
  key: string;
  label: string;
  tone?: 'danger' | 'warning' | 'muted';
  tasks: WorkspaceTask[];
}

function isOverdue(d?: string | null) {
  if (!d) return false;
  try { const x = parseISO(d); return isPast(x) && !isToday(x); } catch { return false; }
}
function isDueToday(d?: string | null) {
  if (!d) return false;
  try { return isToday(parseISO(d)); } catch { return false; }
}

function dueText(d?: string | null): { text: string; tone: 'danger' | 'warning' | 'muted' } | null {
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

export default function Tasks() {
  const { workspaceId } = useAuth();
  const { clients, allProjects, loadAllProjects } = useData();
  const { open, changeCounter } = useTaskDrawer();
  const faviconUrls = useClientFavicons(workspaceId);
  
  const [searchParams, setSearchParams] = useSearchParams();

  const [tasks, setTasks] = useState<WorkspaceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<Scope>(() => (localStorage.getItem('aurelo_tasks_scope') as Scope) || 'mine');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 160);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => { loadAllProjects?.().catch(() => {}); }, [loadAllProjects]);

  // "/" focuses search — the discoverable, keyboard-first entry point.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);


  const filter = (searchParams.get('filter') as FilterKey) || 'all';
  const setFilter = (f: FilterKey) => {
    const p = new URLSearchParams(searchParams);
    if (f === 'all') p.delete('filter'); else p.set('filter', f);
    setSearchParams(p, { replace: true });
  };

  const refresh = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try { setTasks(await loadAllTasksForWorkspace(workspaceId)); }
    finally { setLoading(false); }
  }, [workspaceId]);

  useEffect(() => { refresh(); }, [refresh, changeCounter]);

  useEffect(() => { localStorage.setItem('aurelo_tasks_scope', scope); }, [scope]);

  const clientMap = useMemo(() => {
    const m = new Map<string, any>();
    clients.forEach((c: any) => m.set(c.id, c));
    return m;
  }, [clients]);

  // Scope filter (Mine = createdBy=user or no createdBy; this app doesn't track assignee, so Mine = all owner tasks)
  const scoped = useMemo(() => {
    if (scope === 'all') return tasks;
    return tasks.filter(t => t.addedBy !== 'client');
  }, [tasks, scope]);

  const counts = useMemo(() => {
    const openTasks = scoped.filter(t => t.status !== 'complete');
    return {
      all: openTasks.length,
      overdue: openTasks.filter(t => isOverdue(t.dueDate)).length,
      today: openTasks.filter(t => isDueToday(t.dueDate)).length,
      waiting: openTasks.filter(t => t.waitingOn || t.followUpAt).length,
      in_review: openTasks.filter(t => t.status === 'in_review').length,
      complete: scoped.filter(t => t.status === 'complete').length,
    };
  }, [scoped]);

  const projectName = useCallback(
    (projectId?: string | null) => (allProjects || []).find((p: any) => p.id === projectId)?.name,
    [allProjects],
  );
  const clientName = useCallback(
    (clientId?: string) => clientMap.get(clientId || '')?.name,
    [clientMap],
  );

  const filtered = useMemo(() => {
    let out = scoped;
    if (clientFilter !== 'all') out = out.filter(t => t.clientId === clientFilter);
    if (debouncedQuery.trim()) {
      out = out.filter(t => matchesTaskSearch(t, debouncedQuery, { clientName, projectName }));
    }
    switch (filter) {
      case 'overdue':   return out.filter(t => t.status !== 'complete' && isOverdue(t.dueDate));
      case 'today':     return out.filter(t => t.status !== 'complete' && isDueToday(t.dueDate));
      case 'week':      return out.filter(t => t.status !== 'complete' && t.dueDate && (() => { try { return isThisWeek(parseISO(t.dueDate), { weekStartsOn: 1 }); } catch { return false; } })());
      case 'waiting':   return out.filter(t => t.status !== 'complete' && (t.waitingOn || t.followUpAt));
      case 'no_date':   return out.filter(t => t.status !== 'complete' && !t.dueDate);
      case 'in_review': return out.filter(t => t.status === 'in_review');
      case 'complete':  return out.filter(t => t.status === 'complete');
      default:          return out;
    }
  }, [scoped, clientFilter, filter, debouncedQuery, clientName, projectName]);


  const buckets = useMemo<Bucket[]>(() => {
    const overdue: WorkspaceTask[] = [];
    const today: WorkspaceTask[] = [];
    const week: WorkspaceTask[] = [];
    const waiting: WorkspaceTask[] = [];
    const later: WorkspaceTask[] = [];
    const noDate: WorkspaceTask[] = [];
    const done: WorkspaceTask[] = [];
    for (const t of filtered) {
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
    const sortByDate = (a: WorkspaceTask, b: WorkspaceTask) =>
      (a.dueDate ? new Date(a.dueDate).getTime() : Infinity) -
      (b.dueDate ? new Date(b.dueDate).getTime() : Infinity);
    return ([
      { key: 'overdue', label: 'Overdue', tone: 'danger' as const,  tasks: overdue.sort(sortByDate) },
      { key: 'today',   label: 'Today',   tone: 'warning' as const, tasks: today.sort(sortByDate) },
      { key: 'week',    label: 'This week', tasks: week.sort(sortByDate) },
      { key: 'waiting', label: 'Waiting / Follow-up', tasks: waiting.sort(sortByDate) },
      { key: 'later',   label: 'Later',   tasks: later.sort(sortByDate) },
      { key: 'no_date', label: 'No date', tasks: noDate },
      { key: 'done',    label: 'Completed', tone: 'muted' as const, tasks: done.slice(0, 50) },
    ] as Bucket[]).filter(b => b.tasks.length > 0);
  }, [filtered]);

  const patchTask = async (taskId: string, patch: Partial<WorkspaceTask>, dbPatch: any) => {
    const prev = tasks.find(t => t.id === taskId);
    setTasks(p => p.map(t => t.id === taskId ? { ...t, ...patch } : t));
    try {
      await updateChecklistItem(taskId, dbPatch);
      if (patch.status === 'complete' && prev && prev.status !== 'complete' && prev.repeat) {
        const id = await materializeRecurrence({ ...prev, ...patch });
        if (id) { toast.success('Next occurrence scheduled'); refresh(); }
      }
    } catch (err: any) {
      toast.error(err.message);
      refresh();
    }
  };

  const deleteTask = (taskId: string) => {
    const snapshot = tasks;
    const target = snapshot.find(t => t.id === taskId);
    if (!target) return;
    deferredDelete({
      label: `Task deleted — "${target.text.slice(0, 40)}${target.text.length > 40 ? '…' : ''}"`,
      onOptimisticRemove: () => setTasks(p => p.filter(t => t.id !== taskId)),
      onUndo: () => setTasks(snapshot),
      onCommit: () => deleteChecklistItem(taskId),
    });
  };

  const sortedClients = useMemo(
    () => [...clients].sort((a: any, b: any) => (a.name || '').localeCompare(b.name || '')),
    [clients]
  );

  return (
    <motion.div initial="hidden" animate="show" variants={containerVariants} className="px-4 lg:px-8 py-6 lg:py-8 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div variants={itemVariants} className="mb-5 flex items-baseline justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center" style={{ borderRadius: 4 }}>
              <CheckSquare className="w-3.5 h-3.5 text-primary" />
            </div>
            <h1 className="text-[22px] text-foreground" style={{ fontWeight: 600, letterSpacing: '-0.01em' }}>Tasks</h1>
            <span className="type-meta tabular-nums">{counts.all} open</span>
          </div>
          <p className="type-meta">Every commitment across your clients, in one place.</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Scope segmented control */}
          <div className="inline-flex border border-border" style={{ borderRadius: 4 }}>
            {([['mine', 'My Tasks'], ['all', 'All Tasks']] as [Scope, string][]).map(([v, l]) => (
              <button
                key={v}
                onClick={() => setScope(v)}
                className={`px-3 py-1.5 text-[12px] transition-colors cursor-pointer ${
                  scope === v ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
                style={{ fontWeight: 500 }}
              >
                {l}
              </button>
            ))}
          </div>

          <button
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-1.5 h-[30px] px-3 text-[12px] bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer"
            style={{ borderRadius: 4, fontWeight: 500 }}
          >
            <Plus className="w-3.5 h-3.5" aria-hidden /> Add task
          </button>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div variants={itemVariants} className="mb-4">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape' && query) { e.preventDefault(); setQuery(''); } }}
            aria-label="Search tasks"
            placeholder="Search tasks by title, description, client, list or project…   (press / )"
            className="w-full h-9 bg-transparent border border-border pl-9 pr-9 text-[13px] focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/60"
            style={{ borderRadius: 4 }}
          />
          {query && (
            <button
              onClick={() => { setQuery(''); searchRef.current?.focus(); }}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
              style={{ borderRadius: 4 }}
            >
              <X className="w-3.5 h-3.5" aria-hidden />
            </button>
          )}
        </div>
        <p className="sr-only" aria-live="polite">
          {debouncedQuery ? `${filtered.length} tasks match ${debouncedQuery}` : ''}
        </p>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-2 mb-5">
        <FilterChip active={filter === 'all'}      onClick={() => setFilter('all')}      label="All open"  count={counts.all} />
        <FilterChip active={filter === 'overdue'}  onClick={() => setFilter('overdue')}  label="Overdue"   count={counts.overdue} tone="danger" />
        <FilterChip active={filter === 'today'}    onClick={() => setFilter('today')}    label="Today"     count={counts.today} tone="warning" />
        <FilterChip active={filter === 'week'}     onClick={() => setFilter('week')}     label="This week" />
        <FilterChip active={filter === 'waiting'}  onClick={() => setFilter('waiting')}  label="Waiting"   count={counts.waiting} />
        <FilterChip active={filter === 'in_review'} onClick={() => setFilter('in_review')} label="In review" count={counts.in_review} />
        <FilterChip active={filter === 'no_date'}  onClick={() => setFilter('no_date')}  label="No date" />
        <FilterChip active={filter === 'complete'} onClick={() => setFilter('complete')} label="Completed" count={counts.complete} />

        <div className="ml-auto flex items-center gap-1.5">
          <Filter className="w-3 h-3 text-muted-foreground" />
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="text-[12px] bg-transparent border border-border px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            style={{ borderRadius: 4 }}
          >
            <option value="all">All clients</option>
            {sortedClients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </motion.div>

      {/* Buckets */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading tasks…
        </div>
      ) : buckets.length === 0 ? (
        <motion.div variants={itemVariants} className="border border-border" style={{ borderRadius: 4 }}>
          <EmptyState
            glyph={debouncedQuery ? Search : CheckSquare}
            title={debouncedQuery ? 'No matching tasks' : tasks.length === 0 ? 'No tasks yet' : 'Nothing matches'}
            body={
              debouncedQuery
                ? `Nothing matches “${debouncedQuery}”. Try fewer words, or clear the search.`
                : tasks.length === 0
                  ? 'Create your first task with Add task, or from any client workspace.'
                  : 'Try a different filter or scope.'
            }
          />
        </motion.div>
      ) : (
        <motion.div variants={itemVariants} className="space-y-6">
          {buckets.map((b) => (
            <Section key={b.key} bucket={b} clientMap={clientMap} faviconUrls={faviconUrls} onOpen={open} onPatch={patchTask} onDelete={deleteTask} />
          ))}
        </motion.div>
      )}

      <TaskModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        defaultClientId={clientFilter !== 'all' ? clientFilter : null}
        onCreated={refresh}
      />
    </motion.div>
  );
}


// ── Section ───────────────────────────────────────────────────────────

function Section({
  bucket, clientMap, faviconUrls, onOpen, onPatch, onDelete,
}: {
  bucket: Bucket;
  clientMap: Map<string, any>;
  faviconUrls: Record<string, string>;
  onOpen: (id: string) => void;
  onPatch: (id: string, patch: Partial<WorkspaceTask>, dbPatch: any) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const toneColor =
    bucket.tone === 'danger' ? 'var(--destructive)' :
    bucket.tone === 'warning' ? 'var(--warning)' :
    'var(--muted-foreground)';
  return (
    <section>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 mb-2 text-left cursor-pointer group"
      >
        {open
          ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
          : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />}
        <span className="type-eyebrow" style={{ color: toneColor }}>{bucket.label}</span>
        <span className="type-meta tabular-nums">{bucket.tasks.length}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="divide-y divide-border border-y border-border overflow-hidden"
          >
            {bucket.tasks.map(t => (
              <TaskRow
                key={t.id}
                task={t}
                client={clientMap.get(t.clientId)}
                faviconUrl={faviconUrls[t.clientId]}
                onOpen={() => onOpen(t.id)}
                onStatus={(s) => onPatch(t.id, { status: s, completed: s === 'complete' }, { status: s })}
                onDelete={() => onDelete(t.id)}
              />
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </section>
  );
}

function TaskRow({
  task, client, faviconUrl, onOpen, onStatus, onDelete,
}: {
  task: WorkspaceTask;
  client?: any;
  faviconUrl?: string;
  onOpen: () => void;
  onStatus: (s: TaskStatus) => void;
  onDelete: () => void;
}) {
  const cfg = STATUS_BY_VALUE[task.status];
  const due = dueText(task.dueDate);
  const followingUp = isOverdue(task.followUpAt) || isDueToday(task.followUpAt);

  return (
    <li
      onClick={onOpen}
      className="group flex items-center gap-3 py-2.5 px-2 -mx-2 cursor-pointer hover:bg-[color:var(--surface-sunken)] transition-colors"
    >
      <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0">
        <TaskStatusPopover status={task.status} onChange={onStatus} />
      </div>

      <ClientAvatar name={client?.name} url={faviconUrl} size={24} />

      <div className="flex-1 min-w-0">
        <div className={`type-body truncate ${task.status === 'complete' ? 'line-through text-muted-foreground' : 'text-foreground'}`} style={{ fontWeight: 500 }}>
          {task.text}
        </div>
        <div className="type-meta truncate flex items-center gap-2">
          {client && <span className="truncate">{client.name}</span>}
          {task.repeat && (
            <span className="inline-flex items-center gap-1" title={`Repeats ${task.repeat}`}>
              <Repeat className="w-3 h-3" /> {task.repeat}
            </span>
          )}
          {followingUp && (
            <span className="inline-flex items-center gap-1" style={{ color: 'var(--warning)' }}>
              <Hourglass className="w-3 h-3" /> Follow up
            </span>
          )}
          {task.waitingOn && !followingUp && (
            <span className="inline-flex items-center gap-1" style={{ color: 'var(--warning)' }}>
              <Hourglass className="w-3 h-3" /> {task.waitingOn}
            </span>
          )}
          {!followingUp && !task.waitingOn && task.status === 'in_review' && (
            <span style={{ color: 'var(--warning)' }}>{cfg.label}</span>
          )}
        </div>
      </div>

      {due && (
        <span
          className="type-meta tabular-nums flex-shrink-0"
          style={{
            color: due.tone === 'danger' ? 'var(--destructive)' :
                   due.tone === 'warning' ? 'var(--warning)' :
                   'var(--muted-foreground)',
          }}
        >
          {due.text}
        </span>
      )}

      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 w-7 h-7 inline-flex items-center justify-center text-muted-foreground hover:text-destructive cursor-pointer"
        title="Delete"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </li>
  );
}

// ── Filter chip ───────────────────────────────────────────────────────

function FilterChip({
  active, onClick, label, count, tone,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
  tone?: 'danger' | 'warning';
}) {
  const accent =
    active ? 'bg-primary/10 border-primary/30 text-primary' :
    'border-border text-muted-foreground hover:text-foreground hover:bg-accent/40';
  const countColor =
    tone === 'danger' && (count ?? 0) > 0 ? 'var(--destructive)' :
    tone === 'warning' && (count ?? 0) > 0 ? 'var(--warning)' :
    undefined;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1 border transition-colors cursor-pointer ${accent}`}
      style={{ fontWeight: 500, borderRadius: 4 }}
    >
      {label}
      {count !== undefined && (
        <span className="tabular-nums" style={{ color: countColor, opacity: countColor ? 1 : 0.7 }}>{count}</span>
      )}
    </button>
  );
}
