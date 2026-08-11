// ── TaskListView — the content pane for a navigation context ────────
//
// Renders ONLY the tasks in the active context. Never a stack of every
// list. Shared by the global Tasks page, Client Detail and Project Detail.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, X, Plus, ChevronDown, ChevronRight, Hourglass, Repeat,
  Loader2, MoreHorizontal, CornerUpRight, Trash2, CheckSquare,
} from 'lucide-react';

import { updateChecklistItem, deleteChecklistItem, materializeRecurrence, type WorkspaceTask } from '@/data/checklistsApi';
import { moveTaskToList } from '@/data/taskCreation';
import { STATUS_BY_VALUE, type TaskStatus } from '@/data/taskStatus';
import { TaskStatusPopover } from '@/components/TaskStatusPopover';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ClientAvatar } from '@/components/ClientAvatar';
import { EmptyState } from '@/components/primitives/EmptyState';
import { toast } from '@/lib/toast';
import { deferredDelete } from '@/lib/deferredDelete';
import { TaskFilterBar } from './TaskFilterBar';
import type { TaskNavContext } from './taskNavContext';
import { navKey } from './taskNavContext';
import {
  useTaskPipeline, reconcileFilter, dueText, isOverdue, isDueToday,
  type TaskBucket, type TaskFilterKey,
} from './useTaskPipeline';
import type { TaskNavTree, TaskNavListNode } from './useTaskNavigationTree';

interface Props {
  tasks: WorkspaceTask[];
  tree: TaskNavTree;
  context: TaskNavContext;
  onRefresh: () => void;
  onOpenTask: (taskId: string) => void;
  onAddTask: () => void;
  clientMap: Map<string, any>;
  faviconUrls?: Record<string, string>;
  projectName?: (projectId?: string | null) => string | undefined;
  loading?: boolean;
  /** Hide the client avatar/name column when the context is already a client. */
  showClient?: boolean;
}

export function TaskListView({
  tasks, tree, context, onRefresh, onOpenTask, onAddTask,
  clientMap, faviconUrls = {}, projectName, loading, showClient,
}: Props) {
  const [filter, setFilter] = useState<TaskFilterKey>('all');
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  // Rows hidden optimistically during the Undo window.
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 160);
    return () => clearTimeout(t);
  }, [query]);

  const clientName = useCallback(
    (clientId?: string) => clientMap.get(clientId || '')?.name,
    [clientMap],
  );

  const liveTasks = useMemo(() => tasks.filter(t => !hidden.has(t.id)), [tasks, hidden]);

  const { counts, buckets, visible } = useTaskPipeline({
    tasks: liveTasks, context, filter, query: debounced, clientName, projectName,
  });


  // A filter only survives a context change when it still means something
  // there; otherwise the new context opens on All open.
  const ctxKey = navKey(context);
  useEffect(() => {
    setFilter(prev => reconcileFilter(prev, scopeOnly(tasks, context)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctxKey]);

  const heading = useMemo(() => contextHeading(context, tree), [context, tree]);
  const siblingLists = useMemo(() => {
    if (context.kind === 'all') return [];
    return tree.clients.find(c => c.id === context.clientId)?.lists || [];
  }, [context, tree]);

  const patch = async (task: WorkspaceTask, updates: any) => {
    try {
      await updateChecklistItem(task.id, updates);
      if (updates.status === 'complete') {
        // Repeating tasks spawn their next occurrence on completion.
        try { await materializeRecurrence({ ...task, ...updates }); } catch { /* non-fatal */ }
      }
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Couldn't update that task");
    }
  };

  const remove = (task: WorkspaceTask) => {
    deferredDelete({
      label: 'Task deleted',
      onOptimisticRemove: () => setHidden(h => new Set(h).add(task.id)),
      onCommit: async () => { await deleteChecklistItem(task.id); onRefresh(); },
      onUndo: () => setHidden(h => { const n = new Set(h); n.delete(task.id); return n; }),
    });
  };


  const move = async (task: WorkspaceTask, listId: string) => {
    try {
      const res = await moveTaskToList(task.id, listId);
      toast.success(`Moved to ${res.clientName} › ${res.listTitle}`);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Couldn't move that task");
    }
  };

  return (
    <div className="flex-1 min-w-0 flex flex-col">
      {/* Context header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h2 className="type-page truncate">{heading.title}</h2>
          {heading.sub && <p className="type-meta mt-0.5 truncate">{heading.sub}</p>}
        </div>
        <button
          onClick={onAddTask}
          className="h-8 px-3 inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-[12.5px] flex-shrink-0 cursor-pointer"
          style={{ borderRadius: 4, fontWeight: 500 }}
        >
          <Plus className="w-3.5 h-3.5" aria-hidden /> Add task
        </button>
      </div>

      {/* Search + filters, always scoped to the current context */}
      <div className="mb-3 space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${heading.searchNoun}`}
            aria-label="Search tasks"
            className="w-full h-9 bg-[color:var(--surface-sunken)] border border-border pl-8 pr-8 text-[13px] focus:outline-none focus:ring-1 focus:ring-primary/40"
            style={{ borderRadius: 4 }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="w-3.5 h-3.5" aria-hidden />
            </button>
          )}
        </div>
        <TaskFilterBar filter={filter} onChange={setFilter} counts={counts} />
      </div>

      {loading ? (
        <div className="py-12 flex items-center justify-center text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          title={
            debounced ? 'Nothing matches that search'
              : filter !== 'all' ? 'Nothing here with this filter'
                : heading.emptyTitle
          }
          body={
            debounced ? 'Try a different word, or clear the search.'
              : filter !== 'all' ? 'Switch back to All open to see everything in this view.'
                : heading.emptyBody
          }
          glyph={CheckSquare}
          primaryAction={debounced || filter !== 'all' ? undefined : { label: 'Add task', onClick: onAddTask, icon: Plus }}
        />
      ) : (
        <div className="space-y-5">
          {buckets.map(b => (
            <BucketSection
              key={b.key}
              bucket={b}
              clientMap={clientMap}
              faviconUrls={faviconUrls}
              showClient={showClient ?? context.kind === 'all'}
              siblingLists={siblingLists}
              currentListId={context.kind === 'list' ? context.listId : undefined}
              onOpen={onOpenTask}
              onStatus={(task, s) => patch(task, { status: s, completed: s === 'complete' })}
              onDelete={remove}
              onMove={move}
            />

          ))}
        </div>
      )}
    </div>
  );
}

// Local copy of the scope step so the reconcile effect can run without
// re-deriving the whole pipeline.
function scopeOnly(tasks: WorkspaceTask[], ctx: TaskNavContext) {
  if (ctx.kind === 'all') return tasks;
  if (ctx.kind === 'client') return tasks.filter(t => t.clientId === ctx.clientId);
  return tasks.filter(t => t.checklistId === ctx.listId);
}

function contextHeading(ctx: TaskNavContext, tree: TaskNavTree) {
  if (ctx.kind === 'all') {
    return {
      title: 'All tasks',
      sub: undefined as string | undefined,
      searchNoun: 'all tasks',
      emptyTitle: 'No open tasks',
      emptyBody: 'Everything is clear. Add a task when new work lands.',
    };
  }
  const client = tree.clients.find(c => c.id === ctx.clientId);
  if (ctx.kind === 'client') {
    return {
      title: client?.name || 'Client',
      sub: `${client?.lists.length || 0} list${(client?.lists.length || 0) === 1 ? '' : 's'}`,
      searchNoun: `${client?.name || 'client'} tasks`,
      emptyTitle: `Nothing open for ${client?.name || 'this client'}`,
      emptyBody: 'Add a task to start tracking work here.',
    };
  }
  const list = client?.lists.find(l => l.id === ctx.listId);
  return {
    title: list?.title || 'List',
    sub: client?.name,
    searchNoun: `${list?.title || 'this list'}`,
    emptyTitle: `“${list?.title || 'This list'}” is empty`,
    emptyBody: 'Add the first task to this list.',
  };
}

function BucketSection({
  bucket, clientMap, faviconUrls, showClient, siblingLists, currentListId,
  onOpen, onStatus, onDelete, onMove,
}: {
  bucket: TaskBucket;
  clientMap: Map<string, any>;
  faviconUrls: Record<string, string>;
  showClient: boolean;
  siblingLists: TaskNavListNode[];
  currentListId?: string;
  onOpen: (id: string) => void;
  onStatus: (task: WorkspaceTask, s: TaskStatus) => void;
  onDelete: (task: WorkspaceTask) => void;
  onMove: (task: WorkspaceTask, listId: string) => void;
}) {
  const [open, setOpen] = useState(bucket.key !== 'done');
  const toneColor =
    bucket.tone === 'danger' ? 'var(--destructive)' :
    bucket.tone === 'warning' ? 'var(--warning)' : undefined;

  return (
    <section>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 mb-2 text-left cursor-pointer group"
        aria-expanded={open}
      >
        {open
          ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" aria-hidden />
          : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" aria-hidden />}
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
                showClient={showClient}
                siblingLists={siblingLists}
                currentListId={currentListId}
                onOpen={() => onOpen(t.id)}
                onStatus={(s) => onStatus(t, s)}
                onDelete={() => onDelete(t)}
                onMove={(listId) => onMove(t, listId)}
              />
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </section>
  );
}

function TaskRow({
  task, client, faviconUrl, showClient, siblingLists, currentListId,
  onOpen, onStatus, onDelete, onMove,
}: {
  task: WorkspaceTask;
  client?: any;
  faviconUrl?: string;
  showClient: boolean;
  siblingLists: TaskNavListNode[];
  currentListId?: string;
  onOpen: () => void;
  onStatus: (s: TaskStatus) => void;
  onDelete: () => void;
  onMove: (listId: string) => void;
}) {
  const cfg = STATUS_BY_VALUE[task.status];
  const due = dueText(task.dueDate);
  const followingUp = isOverdue(task.followUpAt) || isDueToday(task.followUpAt);
  const moveTargets = siblingLists.filter(l => l.id !== (currentListId || task.checklistId));

  return (
    <li
      onClick={onOpen}
      className="group flex items-center gap-3 py-2.5 px-2 -mx-2 cursor-pointer hover:bg-[color:var(--surface-sunken)] transition-colors"
    >
      <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0">
        <TaskStatusPopover status={task.status} onChange={onStatus} />
      </div>

      {showClient && <ClientAvatar name={client?.name} url={faviconUrl} size={24} />}

      <div className="flex-1 min-w-0">
        <div
          className={`type-body truncate ${task.status === 'complete' ? 'line-through text-muted-foreground' : 'text-foreground'}`}
          style={{ fontWeight: 500 }}
        >
          {task.text}
        </div>
        <div className="type-meta truncate flex items-center gap-2">
          {showClient && client && <span className="truncate">{client.name}</span>}
          {!showClient && task.checklistTitle && <span className="truncate">{task.checklistTitle}</span>}
          {task.repeat && (
            <span className="inline-flex items-center gap-1" title={`Repeats ${task.repeat}`}>
              <Repeat className="w-3 h-3" aria-hidden /> {task.repeat}
            </span>
          )}
          {followingUp && (
            <span className="inline-flex items-center gap-1" style={{ color: 'var(--warning)' }}>
              <Hourglass className="w-3 h-3" aria-hidden /> Follow up
            </span>
          )}
          {task.waitingOn && !followingUp && (
            <span className="inline-flex items-center gap-1" style={{ color: 'var(--warning)' }}>
              <Hourglass className="w-3 h-3" aria-hidden /> {task.waitingOn}
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

      <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0">
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={`Actions for ${task.text}`}
              className="w-7 h-7 inline-flex items-center justify-center text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 cursor-pointer"
            >
              <MoreHorizontal className="w-3.5 h-3.5" aria-hidden />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" sideOffset={4} className="w-52 p-1">
            {moveTargets.length > 0 && (
              <>
                <div className="type-eyebrow px-2 pt-1 pb-1 text-muted-foreground">Move to list</div>
                {moveTargets.map(l => (
                  <button
                    key={l.id}
                    onClick={() => onMove(l.id)}
                    className="w-full text-left text-[12.5px] px-2 py-1.5 hover:bg-accent/60 inline-flex items-center gap-2 cursor-pointer"
                    style={{ borderRadius: 3 }}
                  >
                    <CornerUpRight className="w-3 h-3 text-muted-foreground" aria-hidden />
                    <span className="truncate">{l.title}</span>
                  </button>
                ))}
                <div className="h-px bg-border my-1" />
              </>
            )}
            <button
              onClick={onDelete}
              className="w-full text-left text-[12.5px] px-2 py-1.5 hover:bg-accent/60 text-destructive inline-flex items-center gap-2 cursor-pointer"
              style={{ borderRadius: 3 }}
            >
              <Trash2 className="w-3 h-3" aria-hidden /> Delete task
            </button>
          </PopoverContent>
        </Popover>
      </div>
    </li>
  );
}
