/**
 * Tasks — two-pane task workspace.
 *
 *   ┌──────────────┬───────────────────────────────┐
 *   │ All tasks    │  context header + Add task    │
 *   │ Clients      │  search · filters             │
 *   │  ▸ Acme      │  buckets of tasks             │
 *   │     General  │                               │
 *   └──────────────┴───────────────────────────────┘
 *
 * Navigation (left) establishes the dataset; filters and search (right)
 * only ever refine it. Context lives in the URL, so refresh and
 * back/forward restore exactly what the user was looking at.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { containerVariants, itemVariants } from '@/lib/motion';

import { useAuth } from '@/data/AuthContext';
import { useData } from '@/data/DataContext';
import { useTaskDrawer } from '@/data/TaskDrawerContext';
import { useClientFavicons } from '@/components/ClientAvatar';
import { PageHeader } from '@/components/primitives/composition';
import TaskModal from '@/components/task/TaskModal';
import { TaskNavigation } from '@/components/tasks/TaskNavigation';
import { TaskListView } from '@/components/tasks/TaskListView';
import { useTaskNavigation } from '@/components/tasks/taskNavContext';
import { useTaskNavigationTree, useTasksData } from '@/components/tasks/useTaskNavigationTree';

export default function Tasks() {
  const { workspaceId } = useAuth();
  const { clients, allProjects, loadAllProjects } = useData();
  const { open, changeCounter } = useTaskDrawer();
  const faviconUrls = useClientFavicons(workspaceId);

  const { tasks, lists, loading, refresh } = useTasksData(workspaceId);
  const { context, select, replace } = useTaskNavigation('global');
  const [addOpen, setAddOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => { loadAllProjects?.().catch(() => {}); }, [loadAllProjects]);
  // The drawer is the only editing surface; every save bumps this counter.
  useEffect(() => { if (changeCounter) refresh(); }, [changeCounter, refresh]);

  const tree = useTaskNavigationTree({ clients: clients as any[], lists, tasks, showArchived });

  const clientMap = useMemo(() => {
    const m = new Map<string, any>();
    (clients as any[]).forEach(c => m.set(c.id, c));
    return m;
  }, [clients]);

  const projectName = useCallback(
    (projectId?: string | null) => (allProjects || []).find((p: any) => p.id === projectId)?.name,
    [allProjects],
  );

  // If the selected context stops existing (list deleted elsewhere), fall
  // back up the hierarchy rather than showing an empty mystery view.
  useEffect(() => {
    if (loading) return;
    if (context.kind === 'list' && !lists.some(l => l.id === context.listId)) {
      replace({ kind: 'client', clientId: context.clientId });
    } else if (context.kind !== 'all' && tree.hiddenClientIds.has(context.clientId)) {
      replace({ kind: 'all' });
    } else if (context.kind !== 'all' && !clientMap.has(context.clientId)) {
      replace({ kind: 'all' });
    }
  }, [context, lists, clientMap, loading, replace, tree.hiddenClientIds]);

  // Add Task is deterministic: the current context pre-fills the modal.
  const addDefaults = useMemo(() => {
    if (context.kind === 'list') {
      return { clientId: context.clientId, listId: context.listId };
    }
    if (context.kind === 'client') {
      const clientLists = tree.clients.find(c => c.id === context.clientId)?.lists || [];
      return {
        clientId: context.clientId,
        listId: clientLists.length === 1 ? clientLists[0].id : null,
      };
    }
    return { clientId: null, listId: null };
  }, [context, tree]);

  return (
    <motion.div
      initial="hidden" animate="show" variants={containerVariants}
      className="w-full min-w-0 lg:h-[calc(100vh-var(--app-header-h,56px))] lg:flex lg:flex-col min-h-0"
    >
      <motion.div variants={itemVariants}>
        <PageHeader
          title="Tasks"
          subtitle={
            <>
              <span className="tabular-nums">{tree.totalOpen} open</span>
              <span className="opacity-40 mx-1.5">·</span>
              Every commitment across your clients, in one place.
            </>
          }
        />
      </motion.div>

      <motion.div variants={itemVariants} className="flex-1 min-h-0 lg:flex">
        <TaskNavigation
          tree={tree}
          context={context}
          onSelect={select}
          mode="global"
          workspaceId={workspaceId}
          onTreeChanged={refresh}
          showArchived={showArchived}
          onToggleArchived={setShowArchived}
          onListDeleted={(listId) => {
            if (context.kind === 'list' && context.listId === listId) {
              replace({ kind: 'client', clientId: context.clientId });
            }
          }}
        />

        <div className="flex-1 min-w-0 lg:overflow-y-auto px-4 lg:px-6 py-6">
          <TaskListView
            tasks={tasks}
            tree={tree}
            context={context}
            loading={loading}
            onRefresh={refresh}
            onOpenTask={open}
            onAddTask={() => setAddOpen(true)}
            clientMap={clientMap}
            faviconUrls={faviconUrls}
            projectName={projectName}
          />
        </div>
      </motion.div>

      <TaskModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        defaultClientId={addDefaults.clientId}
        defaultListId={addDefaults.listId}
        onCreated={refresh}
      />
    </motion.div>
  );
}
