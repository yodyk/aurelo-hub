import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Plus, Trash2, Pencil, X, Check, Loader2, MoreHorizontal, Calendar, Clock,
  Tag, AlignLeft, Filter, ChevronDown, CircleDashed, CircleDot, AlertCircle, CheckCircle2,
  Link2, FileText, Paperclip, ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { format, parseISO, isPast, isToday, differenceInCalendarDays } from 'date-fns';
import {
  loadChecklists, createChecklist, deleteChecklist, updateChecklist,
  addChecklistItem, updateChecklistItem, deleteChecklistItem,
  type Checklist, type ChecklistItem, type TaskStatus, type NewTaskInput,
} from '@/data/checklistsApi';
import { loadNotes, type ClientNote } from '@/data/notesApi';
import { loadFiles, getSignedUrlByPath, type StoredFile } from '@/data/storageApi';
import {
  loadTaskLinksForClient, addNoteLink, addFileLink, removeTaskLink, type TaskLink,
} from '@/data/taskLinksApi';
import { useData } from '@/data/DataContext';
import { DatePicker } from '@/components/ui/date-picker';


interface ChecklistPanelProps {
  clientId: string;
  projectId?: string;
  workspaceId: string;
}

// ── Status config ──────────────────────────────────────────────────

const STATUSES: { value: TaskStatus; label: string; icon: any; dotClass: string; textClass: string; bgClass: string }[] = [
  { value: 'todo',        label: 'To do',      icon: CircleDashed, dotClass: 'bg-muted-foreground/40', textClass: 'text-muted-foreground', bgClass: 'bg-muted/40' },
  { value: 'in_progress', label: 'In progress', icon: CircleDot,    dotClass: 'bg-sky-500',             textClass: 'text-sky-600',          bgClass: 'bg-sky-500/10' },
  { value: 'blocked',     label: 'Blocked',     icon: AlertCircle,  dotClass: 'bg-amber-500',           textClass: 'text-amber-600',        bgClass: 'bg-amber-500/10' },
  { value: 'done',        label: 'Done',        icon: CheckCircle2, dotClass: 'bg-emerald-500',         textClass: 'text-emerald-600',      bgClass: 'bg-emerald-500/10' },
];

const STATUS_BY_VALUE = Object.fromEntries(STATUSES.map(s => [s.value, s]));

// ── Main panel ─────────────────────────────────────────────────────

export default function ChecklistPanel({ clientId, projectId, workspaceId }: ChecklistPanelProps) {
  const { workCategoryNames } = useData();
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingTitle, setCreatingTitle] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all' | 'open'>('open');
  const [tagFilter, setTagFilter] = useState<string | 'all'>('all');
  const [linksByItem, setLinksByItem] = useState<Record<string, TaskLink[]>>({});
  const [clientNotes, setClientNotes] = useState<ClientNote[]>([]);
  const [clientFiles, setClientFiles] = useState<StoredFile[]>([]);

  const refresh = useCallback(async () => {
    const [data, links, notes, files] = await Promise.all([
      loadChecklists(clientId, projectId),
      loadTaskLinksForClient(clientId),
      loadNotes(clientId),
      loadFiles(workspaceId, clientId),
    ]);
    setChecklists(data);
    setLinksByItem(links);
    setClientNotes(notes);
    setClientFiles(files);
    setLoading(false);
  }, [clientId, projectId, workspaceId]);

  useEffect(() => { refresh(); }, [refresh]);

  const refreshLinks = useCallback(async () => {
    const links = await loadTaskLinksForClient(clientId);
    setLinksByItem(links);
  }, [clientId]);


  const handleCreate = async () => {
    if (!creatingTitle.trim()) return;
    try {
      await createChecklist(workspaceId, clientId, creatingTitle.trim(), projectId);
      setCreatingTitle('');
      setShowCreate(false);
      await refresh();
      toast.success('List created');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteChecklist(id);
      setChecklists(prev => prev.filter(c => c.id !== id));
      toast.success('List deleted');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Aggregate counts for filter chips
  const allItems = checklists.flatMap(c => c.items);
  const counts = useMemo(() => ({
    all: allItems.length,
    open: allItems.filter(i => i.status !== 'done').length,
    todo: allItems.filter(i => i.status === 'todo').length,
    in_progress: allItems.filter(i => i.status === 'in_progress').length,
    blocked: allItems.filter(i => i.status === 'blocked').length,
    done: allItems.filter(i => i.status === 'done').length,
  }), [allItems]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading tasks…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      {allItems.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pb-1">
          <FilterChip active={statusFilter === 'open'}  onClick={() => setStatusFilter('open')}  label="Open" count={counts.open} />
          <FilterChip active={statusFilter === 'todo'}  onClick={() => setStatusFilter('todo')}  label="To do" count={counts.todo} />
          <FilterChip active={statusFilter === 'in_progress'} onClick={() => setStatusFilter('in_progress')} label="In progress" count={counts.in_progress} />
          <FilterChip active={statusFilter === 'blocked'} onClick={() => setStatusFilter('blocked')} label="Blocked" count={counts.blocked} />
          <FilterChip active={statusFilter === 'done'} onClick={() => setStatusFilter('done')} label="Done" count={counts.done} />
          <FilterChip active={statusFilter === 'all'}  onClick={() => setStatusFilter('all')}   label="All"  count={counts.all} />

          {workCategoryNames.length > 0 && (
            <div className="ml-auto flex items-center gap-1.5">
              <Filter className="w-3 h-3 text-muted-foreground" />
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value as any)}
                className="text-[12px] bg-transparent border border-border rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value="all">All focus areas</option>
                {workCategoryNames.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      {checklists.map((checklist) => (
        <ChecklistCard
          key={checklist.id}
          checklist={checklist}
          clientId={clientId}
          workspaceId={workspaceId}
          onDelete={() => handleDelete(checklist.id)}
          onRefresh={refresh}
          statusFilter={statusFilter}
          tagFilter={tagFilter}
          workCategoryNames={workCategoryNames}
          linksByItem={linksByItem}
          clientNotes={clientNotes}
          clientFiles={clientFiles}
          onLinksChanged={refreshLinks}
        />
      ))}

      {showCreate ? (
        <div className="flex items-center gap-2 p-3 bg-card border border-border rounded-xl">
          <input
            autoFocus
            value={creatingTitle}
            onChange={(e) => setCreatingTitle(e.target.value)}
            placeholder="List title…"
            className="flex-1 text-[13px] px-3 py-1.5 bg-transparent border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setShowCreate(false); setCreatingTitle(''); } }}
          />
          <button onClick={handleCreate} disabled={!creatingTitle.trim()} className="p-1.5 rounded-lg hover:bg-accent/60 text-primary disabled:opacity-40 cursor-pointer">
            <Check className="w-4 h-4" />
          </button>
          <button onClick={() => { setShowCreate(false); setCreatingTitle(''); }} className="p-1.5 rounded-lg hover:bg-accent/60 text-muted-foreground cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-primary transition-colors cursor-pointer"
          style={{ fontWeight: 500 }}
        >
          <Plus className="w-3 h-3" /> New list
        </button>
      )}

      {checklists.length === 0 && !showCreate && (
        <div className="text-center py-10 text-muted-foreground text-[13px]">
          No task lists yet. Create one to start organising work for this client.
        </div>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
        active
          ? 'bg-primary/10 border-primary/30 text-primary'
          : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent/40'
      }`}
      style={{ fontWeight: 500 }}
    >
      {label}
      <span className="tabular-nums opacity-70">{count}</span>
    </button>
  );
}

// ── Individual checklist card ──────────────────────────────────────

function ChecklistCard({
  checklist, clientId, workspaceId, onDelete, onRefresh, statusFilter, tagFilter, workCategoryNames,
  linksByItem, clientNotes, clientFiles, onLinksChanged,
}: {
  checklist: Checklist;
  clientId: string;
  workspaceId: string;
  onDelete: () => void;
  onRefresh: () => void;
  statusFilter: TaskStatus | 'all' | 'open';
  tagFilter: string | 'all';
  workCategoryNames: string[];
  linksByItem: Record<string, TaskLink[]>;
  clientNotes: ClientNote[];
  clientFiles: StoredFile[];
  onLinksChanged: () => void;
}) {
  const [items, setItems] = useState<ChecklistItem[]>(checklist.items);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(checklist.title);

  useEffect(() => { setItems(checklist.items); }, [checklist.items]);

  const filteredItems = items.filter(item => {
    if (statusFilter === 'open' && item.status === 'done') return false;
    if (statusFilter !== 'all' && statusFilter !== 'open' && item.status !== statusFilter) return false;
    if (tagFilter !== 'all' && !(item.workTags || []).includes(tagFilter)) return false;
    return true;
  });

  const completedCount = items.filter(i => i.status === 'done').length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const updateLocal = (id: string, patch: Partial<ChecklistItem>) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
  };

  const handleSaveTitle = async () => {
    if (!titleValue.trim()) { setTitleValue(checklist.title); setEditingTitle(false); return; }
    try {
      await updateChecklist(checklist.id, { title: titleValue.trim() });
      setEditingTitle(false);
    } catch { setTitleValue(checklist.title); }
  };

  const handleQuickAdd = async (input: NewTaskInput) => {
    try {
      const item = await addChecklistItem(checklist.id, input, items.length);
      setItems(prev => [...prev, item]);
      setShowQuickAdd(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
      <div className="h-1 bg-accent/40">
        <div className="h-full bg-primary/60 transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      <div className="p-4 md:p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          {editingTitle ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                autoFocus
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                className="flex-1 text-[14px] px-2 py-1 bg-transparent border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTitle(); if (e.key === 'Escape') { setTitleValue(checklist.title); setEditingTitle(false); } }}
                style={{ fontWeight: 600 }}
              />
              <button onClick={handleSaveTitle} className="p-1 rounded hover:bg-accent/60 text-primary cursor-pointer"><Check className="w-3.5 h-3.5" /></button>
              <button onClick={() => { setTitleValue(checklist.title); setEditingTitle(false); }} className="p-1 rounded hover:bg-accent/60 text-muted-foreground cursor-pointer"><X className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <button onClick={() => setEditingTitle(true)} className="text-[14px] text-foreground hover:text-primary transition-colors group flex items-center gap-1.5 cursor-pointer" style={{ fontWeight: 600 }}>
              {checklist.title}
              <Pencil className="w-3 h-3 text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-all" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground tabular-nums">{completedCount}/{totalCount}</span>
            <button onClick={onDelete} className="p-1 rounded hover:bg-accent/60 text-muted-foreground hover:text-destructive transition-colors cursor-pointer">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Tasks */}
        <div className="space-y-1.5">
          <AnimatePresence initial={false}>
            {filteredItems.map((item) => (
              <TaskRow
                key={item.id}
                item={item}
                workCategoryNames={workCategoryNames}
                onUpdate={(patch) => updateLocal(item.id, patch)}
                onDeleted={() => setItems(prev => prev.filter(i => i.id !== item.id))}
                onRefresh={onRefresh}
              />
            ))}
          </AnimatePresence>
          {filteredItems.length === 0 && items.length > 0 && (
            <div className="text-center py-4 text-[12px] text-muted-foreground">No tasks match the current filters.</div>
          )}
        </div>

        {/* Add task */}
        {showQuickAdd ? (
          <TaskComposer
            workCategoryNames={workCategoryNames}
            onCancel={() => setShowQuickAdd(false)}
            onSubmit={handleQuickAdd}
          />
        ) : (
          <button
            onClick={() => setShowQuickAdd(true)}
            className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-primary transition-colors cursor-pointer"
            style={{ fontWeight: 500 }}
          >
            <Plus className="w-3.5 h-3.5" /> Add task
          </button>
        )}
      </div>
    </div>
  );
}

// ── Task row ───────────────────────────────────────────────────────

function TaskRow({
  item, onUpdate, onDeleted, onRefresh, workCategoryNames,
}: {
  item: ChecklistItem;
  workCategoryNames: string[];
  onUpdate: (patch: Partial<ChecklistItem>) => void;
  onDeleted: () => void;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingText, setEditingText] = useState(false);
  const [textValue, setTextValue] = useState(item.text);

  const cycleStatus = async () => {
    const order: TaskStatus[] = ['todo', 'in_progress', 'blocked', 'done'];
    const next = order[(order.indexOf(item.status) + 1) % order.length];
    onUpdate({ status: next });
    try {
      await updateChecklistItem(item.id, { status: next });
    } catch (err: any) {
      onUpdate({ status: item.status });
      toast.error(err.message);
    }
  };

  const setStatus = async (status: TaskStatus) => {
    onUpdate({ status });
    try { await updateChecklistItem(item.id, { status }); }
    catch (err: any) { onUpdate({ status: item.status }); toast.error(err.message); }
  };

  const saveField = async (patch: Partial<ChecklistItem>, dbPatch: any) => {
    onUpdate(patch);
    try { await updateChecklistItem(item.id, dbPatch); }
    catch (err: any) { toast.error(err.message); onRefresh(); }
  };

  const handleSaveText = async () => {
    if (!textValue.trim()) { setTextValue(item.text); setEditingText(false); return; }
    setEditingText(false);
    await saveField({ text: textValue.trim() }, { text: textValue.trim() });
  };

  const handleDelete = async () => {
    onDeleted();
    try { await deleteChecklistItem(item.id); }
    catch (err: any) { toast.error(err.message); onRefresh(); }
  };

  const cfg = STATUS_BY_VALUE[item.status] || STATUS_BY_VALUE.todo;
  const StatusIcon = cfg.icon;

  const dueMeta = dueLabel(item.dueDate);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className="group border border-border rounded-lg bg-background/60 hover:bg-accent/20 transition-colors"
    >
      <div className="flex items-start gap-2 p-2.5">
        {/* Status toggle */}
        <button
          onClick={cycleStatus}
          title={`Status: ${cfg.label} — click to cycle`}
          className="flex-shrink-0 mt-0.5 cursor-pointer"
        >
          <StatusIcon className={`w-4 h-4 ${cfg.textClass}`} />
        </button>

        {/* Main */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            {editingText ? (
              <input
                autoFocus
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                onBlur={handleSaveText}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveText(); if (e.key === 'Escape') { setTextValue(item.text); setEditingText(false); } }}
                className="flex-1 text-[13px] bg-transparent border-b border-border focus:outline-none focus:border-primary py-0.5"
              />
            ) : (
              <button
                onClick={() => setEditingText(true)}
                className={`flex-1 text-left text-[13px] leading-tight cursor-text ${item.status === 'done' ? 'line-through text-muted-foreground/70' : 'text-foreground'}`}
              >
                {item.text || <span className="text-muted-foreground/60 italic">Untitled task</span>}
              </button>
            )}

            {item.addedBy === 'client' && (
              <span className="text-[10px] text-muted-foreground bg-accent/60 px-1.5 py-0.5 rounded" style={{ fontWeight: 500 }}>Client</span>
            )}
            <button
              onClick={() => setExpanded(v => !v)}
              className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors cursor-pointer"
              title="More"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <StatusPill status={item.status} onSelect={setStatus} />

            {(item.workTags || []).map(tag => (
              <span key={tag} className="inline-flex items-center gap-1 text-[10.5px] px-1.5 py-0.5 rounded bg-accent/50 text-foreground/80" style={{ fontWeight: 500 }}>
                <Tag className="w-2.5 h-2.5" /> {tag}
              </span>
            ))}

            {item.dueDate && dueMeta && (
              <span className={`inline-flex items-center gap-1 text-[10.5px] px-1.5 py-0.5 rounded ${dueMeta.className}`} style={{ fontWeight: 500 }}>
                <Calendar className="w-2.5 h-2.5" /> {dueMeta.label}
              </span>
            )}

            {item.estimatedHours != null && (
              <span className="inline-flex items-center gap-1 text-[10.5px] px-1.5 py-0.5 rounded bg-accent/50 text-muted-foreground" style={{ fontWeight: 500 }}>
                <Clock className="w-2.5 h-2.5" /> {item.estimatedHours}h est
              </span>
            )}

            {item.description && !expanded && (
              <span className="inline-flex items-center gap-1 text-[10.5px] text-muted-foreground/70">
                <AlignLeft className="w-2.5 h-2.5" /> Notes
              </span>
            )}
          </div>

          {/* Expanded editor */}
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <TaskInlineEditor
                  item={item}
                  workCategoryNames={workCategoryNames}
                  onChange={(patch, dbPatch) => saveField(patch, dbPatch)}
                  onDelete={handleDelete}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// ── Status pill with menu ──────────────────────────────────────────

function StatusPill({ status, onSelect }: { status: TaskStatus; onSelect: (s: TaskStatus) => void }) {
  const [open, setOpen] = useState(false);
  const cfg = STATUS_BY_VALUE[status];
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
        className={`inline-flex items-center gap-1 text-[10.5px] px-1.5 py-0.5 rounded ${cfg.bgClass} ${cfg.textClass} cursor-pointer`}
        style={{ fontWeight: 600 }}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass}`} />
        {cfg.label}
        <ChevronDown className="w-2.5 h-2.5 opacity-70" />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-36 bg-popover border border-border rounded-lg shadow-md py-1">
          {STATUSES.map(s => (
            <button
              key={s.value}
              onClick={(e) => { e.stopPropagation(); onSelect(s.value); setOpen(false); }}
              className={`w-full flex items-center gap-2 text-[12px] px-2.5 py-1.5 hover:bg-accent/60 cursor-pointer ${status === s.value ? 'text-primary' : 'text-foreground'}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${s.dotClass}`} />
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Inline editor (expanded row) ───────────────────────────────────

function TaskInlineEditor({
  item, workCategoryNames, onChange, onDelete,
}: {
  item: ChecklistItem;
  workCategoryNames: string[];
  onChange: (patch: Partial<ChecklistItem>, dbPatch: any) => void;
  onDelete: () => void;
}) {
  const [desc, setDesc] = useState(item.description || '');

  const toggleTag = (tag: string) => {
    const has = (item.workTags || []).includes(tag);
    const next = has ? item.workTags.filter(t => t !== tag) : [...(item.workTags || []), tag];
    onChange({ workTags: next }, { workTags: next });
  };

  const setDue = (value: string) => {
    onChange({ dueDate: value || null }, { dueDate: value || null });
  };
  const setHours = (value: string) => {
    const num = value === '' ? null : Number(value);
    if (num !== null && (Number.isNaN(num) || num < 0)) return;
    onChange({ estimatedHours: num }, { estimatedHours: num });
  };

  return (
    <div className="mt-3 pt-3 border-t border-border/70 space-y-3">
      {/* Description */}
      <div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1" style={{ fontWeight: 500 }}>
          <AlignLeft className="w-3 h-3" /> Description
        </div>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          onBlur={() => { if (desc !== (item.description || '')) onChange({ description: desc || null }, { description: desc || null }); }}
          placeholder="Add a note or details for this task…"
          rows={2}
          className="w-full text-[12.5px] bg-accent/30 border border-border rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/30 resize-y"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Due date */}
        <div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1" style={{ fontWeight: 500 }}>
            <Calendar className="w-3 h-3" /> Due date
          </div>
          <div className="flex items-center gap-1">
            <DatePicker value={item.dueDate || ''} onChange={setDue} placeholder="No due date" />
            {item.dueDate && (
              <button onClick={() => setDue('')} className="p-1.5 text-muted-foreground hover:text-destructive cursor-pointer" title="Clear">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Estimated hours */}
        <div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1" style={{ fontWeight: 500 }}>
            <Clock className="w-3 h-3" /> Estimated hours
          </div>
          <input
            type="number"
            min={0}
            step={0.25}
            value={item.estimatedHours ?? ''}
            onChange={(e) => setHours(e.target.value)}
            placeholder="e.g. 2.5"
            className="w-full text-[13px] bg-accent/30 border border-border rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/30 tabular-nums"
          />
        </div>
      </div>

      {/* Focus tags */}
      {workCategoryNames.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1.5" style={{ fontWeight: 500 }}>
            <Tag className="w-3 h-3" /> Focus areas
          </div>
          <div className="flex flex-wrap gap-1.5">
            {workCategoryNames.map(tag => {
              const active = (item.workTags || []).includes(tag);
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

      <div className="flex items-center justify-end">
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

// ── Composer (for creating new tasks) ──────────────────────────────

function TaskComposer({
  workCategoryNames, onCancel, onSubmit,
}: {
  workCategoryNames: string[];
  onCancel: () => void;
  onSubmit: (input: NewTaskInput) => void;
}) {
  const [text, setText] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [hours, setHours] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const submit = () => {
    if (!text.trim()) return;
    onSubmit({
      text: text.trim(),
      dueDate: dueDate || null,
      estimatedHours: hours === '' ? null : Number(hours),
      workTags: tags,
    });
  };

  return (
    <div className="mt-3 p-3 border border-border rounded-lg bg-background/60 space-y-2.5">
      <input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Task title…"
        className="w-full text-[13px] bg-transparent border border-border rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/30"
        onKeyDown={(e) => { if (e.key === 'Enter' && !showDetails) submit(); if (e.key === 'Escape') onCancel(); }}
      />

      {showDetails && (
        <div className="space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <DatePicker value={dueDate} onChange={setDueDate} placeholder="Due date (optional)" />
            <input
              type="number"
              min={0}
              step={0.25}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="Est. hours (optional)"
              className="text-[13px] bg-accent/30 border border-border rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/30 tabular-nums"
            />
          </div>
          {workCategoryNames.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {workCategoryNames.map(tag => {
                const active = tags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => setTags(prev => active ? prev.filter(t => t !== tag) : [...prev, tag])}
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
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowDetails(v => !v)}
          className="text-[11.5px] text-muted-foreground hover:text-primary transition-colors cursor-pointer"
          style={{ fontWeight: 500 }}
        >
          {showDetails ? '− Hide details' : '+ Add details'}
        </button>
        <div className="flex items-center gap-1.5">
          <button onClick={onCancel} className="text-[12px] px-2.5 py-1 text-muted-foreground hover:text-foreground cursor-pointer">Cancel</button>
          <button
            onClick={submit}
            disabled={!text.trim()}
            className="text-[12px] px-3 py-1 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 cursor-pointer"
            style={{ fontWeight: 500 }}
          >
            Add task
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────

function dueLabel(dueDate?: string | null): { label: string; className: string } | null {
  if (!dueDate) return null;
  try {
    const d = parseISO(dueDate);
    const diff = differenceInCalendarDays(d, new Date());
    if (isToday(d)) return { label: 'Due today', className: 'bg-amber-500/10 text-amber-600' };
    if (isPast(d) && diff < 0) return { label: `${Math.abs(diff)}d overdue`, className: 'bg-destructive/10 text-destructive' };
    if (diff <= 3) return { label: `Due in ${diff}d`, className: 'bg-amber-500/10 text-amber-600' };
    return { label: format(d, 'MMM d'), className: 'bg-accent/50 text-muted-foreground' };
  } catch { return null; }
}
