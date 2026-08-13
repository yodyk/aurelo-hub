// ── Tasks navigation tree + data source ─────────────────────────────
//
// Presentation components never touch the raw task array. Tree shape,
// counts and scoping all resolve here, so a later move to server-side
// counts/pagination swaps these internals without touching the UI.
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  loadAllTasksForWorkspace, loadChecklistsForWorkspace,
  type Checklist, type WorkspaceTask,
} from '@/data/checklistsApi';

export interface TaskNavListNode {
  id: string;
  title: string;
  clientId: string;
  projectId?: string;
  sharedWithClient: boolean;
  isDefault: boolean;
  openCount: number;
}

export interface TaskNavClientNode {
  id: string;
  name: string;
  openCount: number;
  archived?: boolean;
  lists: TaskNavListNode[];
}

export interface TaskNavTree {
  totalOpen: number;
  clients: TaskNavClientNode[];
  /** Clients whose tasks are hidden from "All tasks" right now. */
  hiddenClientIds: Set<string>;
  /** How many archived clients exist in scope (regardless of visibility). */
  archivedCount: number;
}


const isOpen = (t: { status: string }) => t.status !== 'complete';

/** Loads the workspace task universe once per mount (and on demand). */
export function useTasksData(workspaceId?: string | null) {
  const [tasks, setTasks] = useState<WorkspaceTask[]>([]);
  const [lists, setLists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const [t, l] = await Promise.all([
        loadAllTasksForWorkspace(workspaceId),
        loadChecklistsForWorkspace(workspaceId),
      ]);
      setTasks(t);
      setLists(l);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { tasks, lists, loading, refresh, setTasks };
}

export interface UseTaskNavigationTreeArgs {
  clients: { id: string; name: string; status?: string }[];
  lists: Checklist[];
  tasks: WorkspaceTask[];
  /** Restrict the tree to a single client (Client Detail mode). */
  clientId?: string;
  /** Restrict the tree to a single project's lists (Project Detail mode). */
  projectId?: string;
}

export function useTaskNavigationTree({
  clients, lists, tasks, clientId, projectId,
}: UseTaskNavigationTreeArgs): TaskNavTree {
  return useMemo(() => {
    const scopedLists = lists.filter(l => {
      if (clientId && l.clientId !== clientId) return false;
      if (projectId) return l.projectId === projectId;
      return true;
    });
    const listIds = new Set(scopedLists.map(l => l.id));

    const scopedTasks = tasks.filter(t => {
      if (clientId && t.clientId !== clientId) return false;
      if (projectId) return !!t.checklistId && listIds.has(t.checklistId);
      return true;
    });

    const openByList = new Map<string, number>();
    const openByClient = new Map<string, number>();
    for (const t of scopedTasks) {
      if (!isOpen(t)) continue;
      if (t.checklistId) openByList.set(t.checklistId, (openByList.get(t.checklistId) || 0) + 1);
      if (t.clientId) openByClient.set(t.clientId, (openByClient.get(t.clientId) || 0) + 1);
    }

    const listsByClient = new Map<string, TaskNavListNode[]>();
    for (const l of scopedLists) {
      const node: TaskNavListNode = {
        id: l.id,
        title: l.title,
        clientId: l.clientId,
        projectId: l.projectId,
        sharedWithClient: l.sharedWithClient === true,
        isDefault: l.isDefault === true,
        openCount: openByList.get(l.id) || 0,
      };
      const arr = listsByClient.get(l.clientId) || [];
      arr.push(node);
      listsByClient.set(l.clientId, arr);
    }

    const clientNodes: TaskNavClientNode[] = clients
      .filter(c => (clientId ? c.id === clientId : (c.status || '').toLowerCase() !== 'archived'))
      .map(c => ({
        id: c.id,
        name: c.name,
        openCount: openByClient.get(c.id) || 0,
        lists: (listsByClient.get(c.id) || []).sort((a, b) => {
          if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
          return a.title.localeCompare(b.title);
        }),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      totalOpen: scopedTasks.filter(isOpen).length,
      clients: clientNodes,
    };
  }, [clients, lists, tasks, clientId, projectId]);
}
