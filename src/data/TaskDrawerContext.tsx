/**
 * TaskDrawerContext — global, lightweight controller for the TaskDrawer.
 *
 * Any surface can call `useTaskDrawer().open(taskId)` to slide the drawer
 * over the current page. The drawer itself is mounted once at the root.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

interface TaskDrawerState {
  taskId: string | null;
  open: (taskId: string) => void;
  close: () => void;
  /** Bump to notify subscribers that the underlying task changed (e.g. after save). */
  changeCounter: number;
  notifyChanged: () => void;
}

const Ctx = createContext<TaskDrawerState | null>(null);

export function TaskDrawerProvider({ children }: { children: ReactNode }) {
  const [taskId, setTaskId] = useState<string | null>(null);
  const [changeCounter, setCounter] = useState(0);

  const open = useCallback((id: string) => setTaskId(id), []);
  const close = useCallback(() => setTaskId(null), []);
  const notifyChanged = useCallback(() => setCounter(c => c + 1), []);

  const value = useMemo(
    () => ({ taskId, open, close, changeCounter, notifyChanged }),
    [taskId, open, close, changeCounter, notifyChanged],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTaskDrawer() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTaskDrawer must be used within TaskDrawerProvider');
  return v;
}
