// ── TaskNavigation — the persistent hierarchy rail ──────────────────
//
//   All Tasks
//   Clients
//     ▸ Acme Co.            12
//         General            4
//         Website Redesign   8
//
// Navigation establishes context; the content pane never re-derives it.
import { useEffect, useMemo, useState } from 'react';
import { Search, Plus, X, ListTree } from 'lucide-react';
import { BottomSheet } from '@/components/primitives/BottomSheet';
import { createChecklist } from '@/data/checklistsApi';
import { toast } from '@/lib/toast';
import { TaskNavigationItem } from './TaskNavigationItem';
import { TaskListMenu } from './TaskListMenu';
import type { TaskNavContext } from './taskNavContext';
import { navKey } from './taskNavContext';
import type { TaskNavTree } from './useTaskNavigationTree';

interface Props {
  tree: TaskNavTree;
  context: TaskNavContext;
  onSelect: (ctx: TaskNavContext) => void;
  /** 'global' shows the client hierarchy; 'client' shows one client's lists. */
  mode: 'global' | 'client';
  workspaceId?: string | null;
  onTreeChanged: () => void;
  /** Called when the active list is deleted so the page can fall back. */
  onListDeleted?: (listId: string) => void;
  allTasksLabel?: string;
}

export function TaskNavigation(props: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const label = useMemo(() => {
    const { context, tree, allTasksLabel } = props;
    if (context.kind === 'all') return allTasksLabel || 'All tasks';
    const c = tree.clients.find(x => x.id === context.clientId);
    if (!c) return 'Tasks';
    if (context.kind === 'client') return c.name;
    const l = c.lists.find(x => x.id === context.listId);
    return l ? `${c.name} › ${l.title}` : c.name;
  }, [props]);

  return (
    <>
      {/* Desktop rail */}
      <aside
        className="hidden lg:flex flex-col w-60 flex-shrink-0 border-r border-border min-h-0"
        aria-label="Task navigation"
      >
        <NavigationBody {...props} />
      </aside>

      {/* Mobile context selector */}
      <div className="lg:hidden mb-3">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="w-full h-9 flex items-center gap-2 px-2.5 border border-border bg-[color:var(--surface-sunken)] text-[13px] text-foreground cursor-pointer"
          style={{ borderRadius: 4 }}
        >
          <ListTree className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" aria-hidden />
          <span className="truncate flex-1 text-left">{label}</span>
          <span className="type-eyebrow">Change</span>
        </button>
      </div>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Go to">
        <div className="pb-2">
          <NavigationBody
            {...props}
            onSelect={(ctx) => { props.onSelect(ctx); setSheetOpen(false); }}
          />
        </div>
      </BottomSheet>
    </>
  );
}

function NavigationBody({
  tree, context, onSelect, mode, workspaceId, onTreeChanged, onListDeleted, allTasksLabel,
}: Props) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [creatingFor, setCreatingFor] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const activeKey = navKey(context);

  // Always keep the active client's branch open.
  useEffect(() => {
    if (context.kind === 'all') return;
    setExpanded(prev => (prev.has(context.clientId) ? prev : new Set(prev).add(context.clientId)));
  }, [context]);

  const clients = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tree.clients;
    return tree.clients
      .map(c => {
        const nameHit = c.name.toLowerCase().includes(q);
        const lists = nameHit ? c.lists : c.lists.filter(l => l.title.toLowerCase().includes(q));
        return nameHit || lists.length > 0 ? { ...c, lists } : null;
      })
      .filter(Boolean) as TaskNavTree['clients'];
  }, [tree.clients, query]);

  // With a query active, reveal the matches.
  const isExpanded = (clientId: string) => (query.trim() ? true : expanded.has(clientId));

  const toggle = (clientId: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(clientId) ? next.delete(clientId) : next.add(clientId);
      return next;
    });
  };

  const submitNewList = async (clientId: string) => {
    const title = newTitle.trim();
    if (!title || !workspaceId) { setCreatingFor(null); setNewTitle(''); return; }
    try {
      const list = await createChecklist(workspaceId, clientId, title);
      setCreatingFor(null);
      setNewTitle('');
      onTreeChanged();
      onSelect({ kind: 'list', clientId, listId: list.id });
      toast.success(`“${title}” created`);
    } catch (err: any) {
      toast.error(err.message || "Couldn't create that list");
    }
  };

  const newListRow = (clientId: string) =>
    creatingFor === clientId ? (
      <div className="pl-[22px] pr-1.5 py-1">
        <input
          autoFocus
          value={newTitle}
          placeholder="List name"
          aria-label="New list name"
          onChange={(e) => setNewTitle(e.target.value)}
          onBlur={() => submitNewList(clientId)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitNewList(clientId);
            if (e.key === 'Escape') { setCreatingFor(null); setNewTitle(''); }
          }}
          className="w-full h-7 bg-[color:var(--surface-sunken)] border border-border px-2 text-[12.5px] focus:outline-none focus:ring-1 focus:ring-primary/40"
          style={{ borderRadius: 3 }}
        />
      </div>
    ) : (
      <button
        type="button"
        onClick={() => { setCreatingFor(clientId); setNewTitle(''); }}
        className="w-full h-6 flex items-center gap-1 pl-[22px] pr-1.5 text-[11.5px] text-muted-foreground hover:text-foreground cursor-pointer"
      >
        <Plus className="w-3 h-3" aria-hidden /> New list
      </button>
    );

  return (
    <div className="flex flex-col min-h-0 h-full">
      <div className="p-2 border-b border-border flex-shrink-0">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={mode === 'global' ? 'Find client or list' : 'Find list'}
            aria-label="Filter navigation"
            className="w-full h-7 bg-[color:var(--surface-sunken)] border border-border pl-7 pr-6 text-[12px] focus:outline-none focus:ring-1 focus:ring-primary/40"
            style={{ borderRadius: 3 }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear navigation filter"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="w-3 h-3" aria-hidden />
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-1.5 min-h-0">
        <TaskNavigationItem
          label={allTasksLabel || 'All tasks'}
          count={tree.totalOpen}
          active={activeKey === 'all'}
          onSelect={() => onSelect({ kind: 'all' })}
        />

        {mode === 'global' && (
          <div className="type-eyebrow px-2.5 pt-3 pb-1 text-muted-foreground">Clients</div>
        )}

        {clients.map(c => {
          const clientActive = activeKey === `client:${c.id}`;
          const open = mode === 'client' ? true : isExpanded(c.id);
          return (
            <div key={c.id}>
              {mode === 'global' && (
                <TaskNavigationItem
                  label={c.name}
                  count={c.openCount}
                  active={clientActive}
                  expandable
                  expanded={open}
                  onToggle={() => toggle(c.id)}
                  onSelect={() => onSelect({ kind: 'client', clientId: c.id })}
                />
              )}

              {open && (
                <div>
                  {mode === 'client' && (
                    <div className="type-eyebrow px-2.5 pt-3 pb-1 text-muted-foreground">Lists</div>
                  )}
                  {c.lists.map(l => (
                    <TaskNavigationItem
                      key={l.id}
                      label={l.title}
                      count={l.openCount}
                      level={1}
                      active={activeKey === `list:${l.id}`}
                      onSelect={() => onSelect({ kind: 'list', clientId: c.id, listId: l.id })}
                      trailing={
                        <TaskListMenu
                          list={l}
                          siblings={c.lists}
                          onChanged={onTreeChanged}
                          onDeleted={(id) => onListDeleted?.(id)}
                        />
                      }
                    />
                  ))}
                  {newListRow(c.id)}
                </div>
              )}
            </div>
          );
        })}

        {clients.length === 0 && (
          <p className="px-2.5 py-3 text-[12px] text-muted-foreground">
            {query ? 'Nothing matches that.' : 'No clients yet.'}
          </p>
        )}
      </nav>
    </div>
  );
}
