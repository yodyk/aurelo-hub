/**
 * TaskDrawerContext — global, lightweight controller for the TaskDrawer.
 *
 * Any surface can call `useTaskDrawer().open(taskId)` to slide the drawer
 * over the current page. The drawer itself is mounted once at the root.
 *
 * It is also the change channel between the drawer and every list that
 * renders tasks. A save publishes WHICH task changed and WHAT changed, so
 * rows can echo the edit immediately instead of waiting on a refetch that
 * might land out of order.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export interface TaskChange {
  /** Monotonic sequence — also doubles as the legacy `changeCounter`. */
  seq: number;
  taskId: string;
  /** Fields that were just written (camelCase, as on ChecklistItem). */
  patch: Record<string, any>;
  /** True when the task was removed rather than edited. */
  deleted?: boolean;
}

interface TaskDrawerState {
  taskId: string | null;
  open: (taskId: string) => void;
  close: () => void;
  /** Bump to notify subscribers that the underlying task changed (e.g. after save). */
  changeCounter: number;
  /** The most recent change, including the patched fields. */
  lastChange: TaskChange | null;
  notifyChanged: (taskId?: string, patch?: Record<string, any>, opts?: { deleted?: boolean }) => void;
}

const Ctx = createContext<TaskDrawerState | null>(null);

export function TaskDrawerProvider({ children }: { children: ReactNode }) {
  const [taskId, setTaskId] = useState<string | null>(null);
  const [lastChange, setLastChange] = useState<TaskChange | null>(null);

  const open = useCallback((id: string) => setTaskId(id), []);
  const close = useCallback(() => setTaskId(null), []);

  const notifyChanged = useCallback((
    id?: string,
    patch?: Record<string, any>,
    opts?: { deleted?: boolean },
  ) => {
    setLastChange(prev => ({
      seq: (prev?.seq ?? 0) + 1,
      taskId: id ?? '',
      patch: patch ?? {},
      deleted: opts?.deleted === true,
    }));
  }, []);

  const value = useMemo(
    () => ({
      taskId, open, close,
      changeCounter: lastChange?.seq ?? 0,
      lastChange,
      notifyChanged,
    }),
    [taskId, open, close, lastChange, notifyChanged],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTaskDrawer() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTaskDrawer must be used within TaskDrawerProvider');
  return v;
}
