import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { containerVariants, itemVariants } from '@/lib/motion';
import {
  CheckSquare, Filter, Loader2, Tag, Clock, Calendar, ChevronDown,
  AlignLeft, ExternalLink, X, Trash2,
} from 'lucide-react';
import { format, parseISO, isPast, isToday, differenceInCalendarDays } from 'date-fns';
import { useAuth } from '@/data/AuthContext';
import { useData } from '@/data/DataContext';
import {
  loadAllTasksForWorkspace, updateChecklistItem, deleteChecklistItem,
  type WorkspaceTask, type ChecklistItem,
} from '@/data/checklistsApi';
import { TASK_STATUSES, STATUS_BY_VALUE, nextStatus, type TaskStatus } from '@/data/taskStatus';
import { supabase } from '@/integrations/supabase/client';
import { DatePicker } from '@/components/ui/date-picker';
import { toast } from '@/lib/toast';
import { EmptyState } from '@/components/primitives/EmptyState';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const STATUSES = TASK_STATUSES;
const STATUS_MAP = STATUS_BY_VALUE;


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
  const [faviconUrls, setFaviconUrls] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    const data = await loadAllTasksForWorkspace(workspaceId);
    setTasks(data);
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => { refresh(); }, [refresh]);

  // Load client favicons
  useEffect(() => {
    if (!workspaceId) return;
    supabase.storage.from('logos').list(workspaceId, { limit: 500 }).then(({ data }) => {
      if (!data) return;
      const urls: Record<string, string> = {};
      for (const f of data) {
        const m = f.name.match(/^client-(.+)-favicon\./);
        if (m) urls[m[1]] = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/logos/${workspaceId}/${f.name}?t=${Date.now()}`;
      }
      setFaviconUrls(urls);
    });
  }, [workspaceId]);

  const clientMap = useMemo(() => {
    const m = new Map<string, any>();
    clients.forEach((c: any) => m.set(c.id, c));
    return m;
  }, [clients]);

  const counts = useMemo(() => ({
    all: tasks.length,
    open: tasks.filter(t => t.status !== 'complete').length,
    to_do: tasks.filter(t => t.status === 'to_do').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    in_review: tasks.filter(t => t.status === 'in_review').length,
    on_hold: tasks.filter(t => t.status === 'on_hold').length,
    complete: tasks.filter(t => t.status === 'complete').length,
  }), [tasks]);

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (statusFilter === 'open' && t.status === 'complete') return false;
      if (statusFilter !== 'all' && statusFilter !== 'open' && t.status !== statusFilter) return false;
      if (clientFilter !== 'all' && t.clientId !== clientFilter) return false;
      if (tagFilter !== 'all' && !(t.workTags || []).includes(tagFilter)) return false;
      return true;
    }).sort((a, b) => {
      const aDone = a.status === 'complete' ? 1 : 0;
      const bDone = b.status === 'complete' ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return aDue - bDue;
    });
  }, [tasks, statusFilter, clientFilter, tagFilter]);

  const cycleStatus = async (task: WorkspaceTask) => {
    const next = nextStatus(task.status);
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: next, completed: next === 'complete' } : t));
    try { await updateChecklistItem(task.id, { status: next }); }
    catch (err: any) {

      toast.error(err.message);
      setTasks(prev => prev.map(t => t.id === task.id ? task : t));
    }
  };

  const patchTask = async (taskId: string, patch: Partial<ChecklistItem>, dbPatch: any) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...patch } : t));
    try { await updateChecklistItem(taskId, dbPatch); }
    catch (err: any) { toast.error(err.message); refresh(); }
  };

  const deleteTask = async (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    try { await deleteChecklistItem(taskId); toast.success('Task deleted'); }
    catch (err: any) { toast.error(err.message); refresh(); }
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

      {/* Filters — inline, status chips left, selects right */}
      <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-2 mb-5">
        <FilterChip active={statusFilter === 'open'}        onClick={() => setStatusFilter('open')}        label="Open" count={counts.open} />
        <FilterChip active={statusFilter === 'to_do'}        onClick={() => setStatusFilter('to_do')}        label="To Do" count={counts.todo} />
        <FilterChip active={statusFilter === 'in_progress'} onClick={() => setStatusFilter('in_progress')} label="In Progress" count={counts.in_progress} />
        <FilterChip active={statusFilter === 'on_hold'}     onClick={() => setStatusFilter('on_hold')}     label="Blocked" count={counts.blocked} />
        <FilterChip active={statusFilter === 'on_hold'}     onClick={() => setStatusFilter('on_hold')}     label="On Hold" count={counts.on_hold} />
        <FilterChip active={statusFilter === 'complete'}        onClick={() => setStatusFilter('complete')}        label="Done" count={counts.done} />
        <FilterChip active={statusFilter === 'all'}         onClick={() => setStatusFilter('all')}         label="All" count={counts.all} />

        <div className="ml-auto flex flex-wrap items-center gap-2">
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

      {/* Tasks list — flat, no client grouping */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading tasks…
        </div>
      ) : filtered.length === 0 ? (
        <motion.div variants={itemVariants} className="bg-card border border-border rounded-xl">
          <EmptyState
            glyph={CheckSquare}
            title={tasks.length === 0 ? 'No tasks yet' : 'No tasks match the current filters'}
            body={tasks.length === 0 ? 'Tasks added on any client will show up here.' : 'Try adjusting status, client, or focus filters.'}
          />
        </motion.div>
      ) : (
        <motion.div variants={itemVariants} className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border/60">
          <AnimatePresence initial={false}>
            {filtered.map(t => (
              <TaskCard
                key={t.id}
                task={t}
                client={clientMap.get(t.clientId)}
                faviconUrl={faviconUrls[t.clientId]}
                workCategoryNames={workCategoryNames}
                onCycleStatus={() => cycleStatus(t)}
                onPatch={(patch, dbPatch) => patchTask(t.id, patch, dbPatch)}
                onDelete={() => deleteTask(t.id)}
              />
            ))}
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

// ── Task card with client avatar and expandable details ────────────

function TaskCard({
  task, client, faviconUrl, workCategoryNames, onCycleStatus, onPatch, onDelete,
}: {
  task: WorkspaceTask;
  client: any;
  faviconUrl?: string;
  workCategoryNames: string[];
  onCycleStatus: () => void;
  onPatch: (patch: Partial<ChecklistItem>, dbPatch: any) => void;
  onDelete: () => void;
}) {
  const cfg = STATUS_MAP[task.status] || STATUS_MAP.todo;
  const due = dueMeta(task.dueDate);
  const StatusIcon = cfg.icon;
  const [expanded, setExpanded] = useState(false);

  const clientName = client?.name || 'Unknown client';
  const initial = clientName.charAt(0).toUpperCase();

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, height: 0 }}
      className="hover:bg-accent/20 transition-colors"
    >
      <div className="flex items-start gap-3.5 p-4">
        {/* Prominent status pill — clickable to cycle */}
        <button
          onClick={onCycleStatus}
          title={`Status: ${cfg.label} — click to advance`}
          className={`flex-shrink-0 inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-md border ${cfg.bgClass} ${cfg.textClass} ${cfg.borderClass} cursor-pointer hover:brightness-95 transition-all min-w-[110px]`}
          style={{ fontWeight: 600, letterSpacing: '0.01em' }}
        >
          <StatusIcon className="w-3.5 h-3.5" />
          <span>{cfg.label}</span>
        </button>

        <div className="flex-1 min-w-0">
          {/* Client chip + task title */}
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <Link
                to={`/clients/${task.clientId}?tab=checklists`}
                className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-primary transition-colors mb-1 group"
                style={{ fontWeight: 500 }}
              >
                {faviconUrl ? (
                  <img src={faviconUrl} alt={clientName} className="w-4 h-4 rounded-circle object-cover ring-1 ring-border/40" />
                ) : (
                  <span className="w-4 h-4 rounded-circle bg-primary/10 flex items-center justify-center text-[9px] text-primary" style={{ fontWeight: 700 }}>
                    {initial}
                  </span>
                )}
                <span className="truncate max-w-[200px]">{clientName}</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-60 transition-opacity" />
              </Link>
              <div className={`text-[15px] leading-snug ${task.status === 'complete' ? 'line-through text-muted-foreground' : 'text-foreground'}`} style={{ fontWeight: 500 }}>
                {task.text}
              </div>
            </div>
            {task.addedBy === 'client' && (
              <span className="text-[10.5px] font-medium text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded flex-shrink-0">Client</span>
            )}
            <button
              onClick={() => setExpanded(v => !v)}
              className={`flex-shrink-0 inline-flex items-center gap-1 text-[12px] px-2 py-1 rounded border transition-colors cursor-pointer ${
                expanded ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent/40'
              }`}
              style={{ fontWeight: 500 }}
              title={expanded ? 'Hide details' : 'Edit details'}
            >
              Details
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Slim meta row — only due date, estimate, link/notes indicators (no description preview, no tag list) */}
          {(due || task.estimatedHours != null || task.description || (task.workTags && task.workTags.length > 0)) && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {due && (
                <span className={`inline-flex items-center gap-1 text-[11.5px] px-1.5 py-0.5 rounded ${
                  due.tone === 'danger' ? 'bg-red-500/10 text-red-600' :
                  due.tone === 'warning' ? 'bg-amber-500/10 text-amber-600' :
                  'bg-muted/50 text-muted-foreground'
                }`} style={{ fontWeight: 500 }}>
                  <Calendar className="w-3 h-3" /> {due.label}
                </span>
              )}
              {task.estimatedHours != null && (
                <span className="inline-flex items-center gap-1 text-[11.5px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground" style={{ fontWeight: 500 }}>
                  <Clock className="w-3 h-3" /> {task.estimatedHours}h
                </span>
              )}
              {task.workTags && task.workTags.length > 0 && (
                <button
                  onClick={() => setExpanded(true)}
                  className="inline-flex items-center gap-1 text-[11.5px] text-muted-foreground/80 hover:text-primary cursor-pointer"
                  style={{ fontWeight: 500 }}
                  title="View focus areas"
                >
                  <Tag className="w-3 h-3" /> {task.workTags.length}
                </button>
              )}
              {task.description && (
                <button
                  onClick={() => setExpanded(true)}
                  className="inline-flex items-center gap-1 text-[11.5px] text-muted-foreground/80 hover:text-primary cursor-pointer"
                  style={{ fontWeight: 500 }}
                  title="View description"
                >
                  <AlignLeft className="w-3 h-3" /> Notes
                </button>
              )}
            </div>
          )}

          {/* Expanded editor */}
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <TaskDetailsEditor
                  task={task}
                  workCategoryNames={workCategoryNames}
                  onPatch={onPatch}
                  onDelete={onDelete}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

function TaskDetailsEditor({
  task, workCategoryNames, onPatch, onDelete,
}: {
  task: WorkspaceTask;
  workCategoryNames: string[];
  onPatch: (patch: Partial<ChecklistItem>, dbPatch: any) => void;
  onDelete: () => void;
}) {
  const [desc, setDesc] = useState(task.description || '');
  useEffect(() => { setDesc(task.description || ''); }, [task.id]);

  const toggleTag = (tag: string) => {
    const has = (task.workTags || []).includes(tag);
    const next = has ? task.workTags.filter(t => t !== tag) : [...(task.workTags || []), tag];
    onPatch({ workTags: next }, { workTags: next });
  };
  const setDue = (value: string) => onPatch({ dueDate: value || null }, { dueDate: value || null });
  const setHours = (value: string) => {
    const num = value === '' ? null : Number(value);
    if (num !== null && (Number.isNaN(num) || num < 0)) return;
    onPatch({ estimatedHours: num }, { estimatedHours: num });
  };

  return (
    <div className="mt-3 pt-3 border-t border-border/70 space-y-3">
      <div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1" style={{ fontWeight: 500 }}>
          <AlignLeft className="w-3 h-3" /> Description
        </div>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          onBlur={() => { if (desc !== (task.description || '')) onPatch({ description: desc || null }, { description: desc || null }); }}
          placeholder="Add a note or details for this task…"
          rows={2}
          className="w-full text-[12.5px] bg-accent/30 border border-border rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/30 resize-y"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1" style={{ fontWeight: 500 }}>
            <Calendar className="w-3 h-3" /> Due date
          </div>
          <div className="flex items-center gap-1">
            <DatePicker value={task.dueDate || ''} onChange={setDue} placeholder="No due date" />
            {task.dueDate && (
              <button onClick={() => setDue('')} className="p-1.5 text-muted-foreground hover:text-destructive cursor-pointer" title="Clear">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1" style={{ fontWeight: 500 }}>
            <Clock className="w-3 h-3" /> Estimated hours
          </div>
          <input
            type="number"
            min={0}
            step={0.25}
            value={task.estimatedHours ?? ''}
            onChange={(e) => setHours(e.target.value)}
            placeholder="e.g. 2.5"
            className="w-full text-[13px] bg-accent/30 border border-border rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/30 tabular-nums"
          />
        </div>
      </div>

      {workCategoryNames.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1.5" style={{ fontWeight: 500 }}>
            <Tag className="w-3 h-3" /> Focus areas
          </div>
          <div className="flex flex-wrap gap-1.5">
            {workCategoryNames.map(tag => {
              const active = (task.workTags || []).includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`text-[11px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                    active ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border text-muted-foreground hover:bg-accent/40'
                  }`}
                  style={{ fontWeight: 500 }}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <Link
          to={`/clients/${task.clientId}?tab=checklists`}
          className="inline-flex items-center gap-1 text-[11.5px] text-muted-foreground hover:text-primary transition-colors"
        >
          Open in client <ExternalLink className="w-3 h-3" />
        </Link>
        <button
          onClick={onDelete}
          className="inline-flex items-center gap-1 text-[11.5px] text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
        >
          <Trash2 className="w-3 h-3" /> Delete task
        </button>
      </div>
    </div>
  );
}
