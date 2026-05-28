import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { containerVariants, itemVariants } from '@/lib/motion';
import {
  CheckSquare, Filter, Loader2, Tag, Clock, Calendar, ChevronRight,
  CircleDashed, CircleDot, AlertCircle, CheckCircle2, ExternalLink, AlignLeft,
} from 'lucide-react';
import { format, parseISO, isPast, isToday, differenceInCalendarDays } from 'date-fns';
import { useAuth } from '@/data/AuthContext';
import { useData } from '@/data/DataContext';
import {
  loadAllTasksForWorkspace, updateChecklistItem,
  type WorkspaceTask, type TaskStatus,
} from '@/data/checklistsApi';
import { toast } from 'sonner';

const STATUSES: { value: TaskStatus; label: string; icon: any; dotClass: string; textClass: string; bgClass: string }[] = [
  { value: 'todo',        label: 'To do',       icon: CircleDashed, dotClass: 'bg-muted-foreground/40', textClass: 'text-muted-foreground', bgClass: 'bg-muted/40' },
  { value: 'in_progress', label: 'In progress', icon: CircleDot,    dotClass: 'bg-sky-500',             textClass: 'text-sky-600',          bgClass: 'bg-sky-500/10' },
  { value: 'blocked',     label: 'Blocked',     icon: AlertCircle,  dotClass: 'bg-amber-500',           textClass: 'text-amber-600',        bgClass: 'bg-amber-500/10' },
  { value: 'done',        label: 'Done',        icon: CheckCircle2, dotClass: 'bg-emerald-500',         textClass: 'text-emerald-600',      bgClass: 'bg-emerald-500/10' },
];
const STATUS_MAP = Object.fromEntries(STATUSES.map(s => [s.value, s]));

function dueMeta(due?: string | null) {
  if (!due) return null;
  try {
    const d = parseISO(due);
    if (isToday(d)) return { label: 'Due today', tone: 'warning' as const };
    if (isPast(d)) return { label: `${Math.abs(differenceInCalendarDays(d, new Date()))}d overdue`, tone: 'danger' as const };
    const diff = differenceInCalendarDays(d, new Date());
    if (diff <= 3) return { label: `Due in ${diff}d`, tone: 'warning' as const };
    return { label: format(d, 'MMM d'), tone: 'neutral' as const };
  } catch { return null; }
}

export default function Tasks() {
  const { workspaceId } = useAuth();
  const { clients, workCategoryNames } = useData();
  const [tasks, setTasks] = useState<WorkspaceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all' | 'open'>('open');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');

  const refresh = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    const data = await loadAllTasksForWorkspace(workspaceId);
    setTasks(data);
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => { refresh(); }, [refresh]);

  const clientMap = useMemo(() => {
    const m = new Map<string, any>();
    clients.forEach((c: any) => m.set(c.id, c));
    return m;
  }, [clients]);

  const counts = useMemo(() => ({
    all: tasks.length,
    open: tasks.filter(t => t.status !== 'done').length,
    todo: tasks.filter(t => t.status === 'todo').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    blocked: tasks.filter(t => t.status === 'blocked').length,
    done: tasks.filter(t => t.status === 'done').length,
  }), [tasks]);

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (statusFilter === 'open' && t.status === 'done') return false;
      if (statusFilter !== 'all' && statusFilter !== 'open' && t.status !== statusFilter) return false;
      if (clientFilter !== 'all' && t.clientId !== clientFilter) return false;
      if (tagFilter !== 'all' && !(t.workTags || []).includes(tagFilter)) return false;
      return true;
    }).sort((a, b) => {
      // Sort: overdue first → due soon → no date → done last
      const aDone = a.status === 'done' ? 1 : 0;
      const bDone = b.status === 'done' ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return aDue - bDue;
    });
  }, [tasks, statusFilter, clientFilter, tagFilter]);

  // Group by client for readability
  const grouped = useMemo(() => {
    const g = new Map<string, WorkspaceTask[]>();
    filtered.forEach(t => {
      const k = t.clientId || 'unknown';
      if (!g.has(k)) g.set(k, []);
      g.get(k)!.push(t);
    });
    return Array.from(g.entries());
  }, [filtered]);

  const cycleStatus = async (task: WorkspaceTask) => {
    const order: TaskStatus[] = ['todo', 'in_progress', 'blocked', 'done'];
    const next = order[(order.indexOf(task.status) + 1) % order.length];
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: next, completed: next === 'done' } : t));
    try { await updateChecklistItem(task.id, { status: next }); }
    catch (err: any) {
      toast.error(err.message);
      setTasks(prev => prev.map(t => t.id === task.id ? task : t));
    }
  };

  const sortedClients = useMemo(() => {
    return [...clients].sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
  }, [clients]);

  return (
    <motion.div initial="hidden" animate="show" variants={containerVariants} className="px-4 lg:px-8 py-6 lg:py-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div variants={itemVariants} className="mb-6">
        <div className="flex items-center gap-2.5 mb-1.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <CheckSquare className="w-4 h-4 text-primary" />
          </div>
          <h1 className="text-[22px] text-foreground" style={{ fontWeight: 600, letterSpacing: '-0.01em' }}>Tasks</h1>
          <span className="text-[12px] text-muted-foreground tabular-nums ml-1">{counts.open} open · {counts.all} total</span>
        </div>
        <p className="text-[13px] text-muted-foreground">Every task across all clients in one place.</p>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="space-y-2.5 mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <FilterChip active={statusFilter === 'open'}        onClick={() => setStatusFilter('open')}        label="Open" count={counts.open} />
          <FilterChip active={statusFilter === 'todo'}        onClick={() => setStatusFilter('todo')}        label="To do" count={counts.todo} />
          <FilterChip active={statusFilter === 'in_progress'} onClick={() => setStatusFilter('in_progress')} label="In progress" count={counts.in_progress} />
          <FilterChip active={statusFilter === 'blocked'}     onClick={() => setStatusFilter('blocked')}     label="Blocked" count={counts.blocked} />
          <FilterChip active={statusFilter === 'done'}        onClick={() => setStatusFilter('done')}        label="Done" count={counts.done} />
          <FilterChip active={statusFilter === 'all'}         onClick={() => setStatusFilter('all')}         label="All" count={counts.all} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3 h-3 text-muted-foreground" />
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="text-[12px] bg-transparent border border-border rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="all">All clients</option>
              {sortedClients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {workCategoryNames.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Tag className="w-3 h-3 text-muted-foreground" />
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="text-[12px] bg-transparent border border-border rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value="all">All focus areas</option>
                {workCategoryNames.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}
        </div>
      </motion.div>

      {/* Tasks list */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading tasks…
        </div>
      ) : filtered.length === 0 ? (
        <motion.div variants={itemVariants} className="text-center py-16 bg-card border border-border rounded-xl">
          <CheckSquare className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-[14px] text-foreground mb-1" style={{ fontWeight: 500 }}>
            {tasks.length === 0 ? 'No tasks yet' : 'No tasks match the current filters'}
          </p>
          <p className="text-[12px] text-muted-foreground">
            {tasks.length === 0 ? 'Tasks added on any client will show up here.' : 'Try adjusting status, client, or focus filters.'}
          </p>
        </motion.div>
      ) : (
        <motion.div variants={itemVariants} className="space-y-5">
          <AnimatePresence initial={false}>
            {grouped.map(([cid, items]) => {
              const client = clientMap.get(cid);
              return (
                <div key={cid}>
                  <div className="flex items-center justify-between mb-2 px-1">
                    <Link to={`/clients/${cid}?tab=checklists`} className="inline-flex items-center gap-2 text-[13px] text-foreground hover:text-primary transition-colors" style={{ fontWeight: 600 }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                      {client?.name || 'Unknown client'}
                      <ChevronRight className="w-3 h-3 text-muted-foreground/60" />
                    </Link>
                    <span className="text-[11px] text-muted-foreground tabular-nums">{items.length}</span>
                  </div>
                  <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border/60">
                    {items.map(t => <TaskRow key={t.id} task={t} clientName={client?.name} onCycleStatus={() => cycleStatus(t)} />)}
                  </div>
                </div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  );
}

function FilterChip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
        active ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent/40'
      }`}
      style={{ fontWeight: 500 }}
    >
      {label}
      <span className="tabular-nums opacity-70">{count}</span>
    </button>
  );
}

function TaskRow({ task, clientName, onCycleStatus }: { task: WorkspaceTask; clientName?: string; onCycleStatus: () => void }) {
  const cfg = STATUS_MAP[task.status] || STATUS_MAP.todo;
  const due = dueMeta(task.dueDate);
  const StatusIcon = cfg.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, height: 0 }}
      className="flex items-start gap-3 p-3 hover:bg-accent/30 transition-colors"
    >
      <button
        onClick={onCycleStatus}
        title={`Status: ${cfg.label} — click to advance`}
        className="flex-shrink-0 mt-0.5 cursor-pointer"
      >
        <StatusIcon className={`w-4 h-4 ${cfg.textClass}`} />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <Link
            to={`/clients/${task.clientId}?tab=checklists`}
            className={`text-[13px] flex-1 hover:text-primary transition-colors ${task.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'}`}
          >
            {task.text}
          </Link>
          {task.addedBy === 'client' && (
            <span className="text-[10px] font-medium text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">Client</span>
          )}
        </div>
        {task.description && (
          <div className="flex items-start gap-1 mt-1 text-[11.5px] text-muted-foreground line-clamp-2">
            <AlignLeft className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span>{task.description}</span>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          <span className={`inline-flex items-center gap-1 text-[10.5px] px-1.5 py-0.5 rounded ${cfg.bgClass} ${cfg.textClass}`} style={{ fontWeight: 600 }}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass}`} />
            {cfg.label}
          </span>
          {(task.workTags || []).map(tag => (
            <span key={tag} className="inline-flex items-center gap-1 text-[10.5px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground" style={{ fontWeight: 500 }}>
              <Tag className="w-2.5 h-2.5" /> {tag}
            </span>
          ))}
          {due && (
            <span className={`inline-flex items-center gap-1 text-[10.5px] px-1.5 py-0.5 rounded ${
              due.tone === 'danger' ? 'bg-red-500/10 text-red-600' :
              due.tone === 'warning' ? 'bg-amber-500/10 text-amber-600' :
              'bg-muted/50 text-muted-foreground'
            }`} style={{ fontWeight: 500 }}>
              <Calendar className="w-2.5 h-2.5" /> {due.label}
            </span>
          )}
          {task.estimatedHours != null && (
            <span className="inline-flex items-center gap-1 text-[10.5px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground" style={{ fontWeight: 500 }}>
              <Clock className="w-2.5 h-2.5" /> {task.estimatedHours}h est
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
