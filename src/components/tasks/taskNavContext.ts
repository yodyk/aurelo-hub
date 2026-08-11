// ── Canonical Tasks navigation context ──────────────────────────────
//
// Navigation establishes the dataset. Filters refine it. Search refines
// further. Everything downstream keys off this one type.
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';

export type TaskNavContext =
  | { kind: 'all' }
  | { kind: 'client'; clientId: string }
  | { kind: 'list'; clientId: string; listId: string };

export type TaskNavMode = 'global' | 'client';

export function navKey(ctx: TaskNavContext): string {
  switch (ctx.kind) {
    case 'all': return 'all';
    case 'client': return `client:${ctx.clientId}`;
    case 'list': return `list:${ctx.listId}`;
  }
}

export function isSameContext(a: TaskNavContext, b: TaskNavContext) {
  return navKey(a) === navKey(b);
}

/**
 * Navigation state lives in the URL so refresh, back/forward and deep links
 * all behave. Global: ?client=&list=. Client mode: ?list= only (the client
 * is fixed by the page).
 */
export function useTaskNavigation(mode: TaskNavMode, fixedClientId?: string) {
  const [params, setParams] = useSearchParams();

  const context = useMemo<TaskNavContext>(() => {
    const listId = params.get('list') || '';
    const clientId = mode === 'client' ? (fixedClientId || '') : (params.get('client') || '');
    if (mode === 'client') {
      if (!fixedClientId) return { kind: 'all' };
      return listId
        ? { kind: 'list', clientId: fixedClientId, listId }
        : { kind: 'client', clientId: fixedClientId };
    }
    if (clientId && listId) return { kind: 'list', clientId, listId };
    if (clientId) return { kind: 'client', clientId };
    return { kind: 'all' };
  }, [params, mode, fixedClientId]);

  const select = useCallback((next: TaskNavContext) => {
    const p = new URLSearchParams(params);
    if (mode === 'global') {
      if (next.kind === 'all') { p.delete('client'); p.delete('list'); }
      else if (next.kind === 'client') { p.set('client', next.clientId); p.delete('list'); }
      else { p.set('client', next.clientId); p.set('list', next.listId); }
    } else {
      if (next.kind === 'list') p.set('list', next.listId);
      else p.delete('list');
    }
    setParams(p);
  }, [params, setParams, mode]);

  /** Replace (no history entry) — used when a context stops existing. */
  const replace = useCallback((next: TaskNavContext) => {
    const p = new URLSearchParams(params);
    if (mode === 'global') {
      if (next.kind === 'all') { p.delete('client'); p.delete('list'); }
      else if (next.kind === 'client') { p.set('client', next.clientId); p.delete('list'); }
      else { p.set('client', next.clientId); p.set('list', next.listId); }
    } else {
      if (next.kind === 'list') p.set('list', next.listId); else p.delete('list');
    }
    setParams(p, { replace: true });
  }, [params, setParams, mode]);

  return { context, select, replace };
}
