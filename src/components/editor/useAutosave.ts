// ── Resilient autosave ──────────────────────────────────────────────
// Handles debouncing, blur/unmount/navigation flushes, failure states,
// retry, rapid edits, record switching and out-of-order responses.
import { useCallback, useEffect, useRef, useState } from 'react';

export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

interface Options {
  /** Persist handler. Reject to signal failure. */
  onSave: (value: string | null) => Promise<void> | void;
  /** Identity of the record being edited. Changing it flushes and resets. */
  recordId?: string;
  delay?: number;
  enabled?: boolean;
}

export interface AutosaveApi {
  state: SaveState;
  lastSavedAt: number | null;
  /** Call on every editor change. */
  schedule: (value: string | null) => void;
  /** Persist immediately (blur, unmount, navigation). */
  flush: () => Promise<void>;
  /** Retry the last failed value. */
  retry: () => Promise<void>;
}

export function useAutosave({ onSave, recordId, delay = 700, enabled = true }: Options): AutosaveApi {
  const [state, setState] = useState<SaveState>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<string | null | undefined>(undefined);
  const lastPersisted = useRef<string | null | undefined>(undefined);
  const seq = useRef(0);
  const settled = useRef(0);
  const saveRef = useRef(onSave);
  saveRef.current = onSave;

  // Record switch: drop any queued write for the previous record.
  useEffect(() => {
    pending.current = undefined;
    lastPersisted.current = undefined;
    if (timer.current) clearTimeout(timer.current);
    setState('idle');
    setLastSavedAt(null);
  }, [recordId]);

  const persist = useCallback(async (value: string | null) => {
    if (lastPersisted.current === value) return;
    const ticket = ++seq.current;
    setState('saving');
    try {
      await saveRef.current(value);
      // Stale-response guard: never let an earlier response win.
      if (ticket < settled.current) return;
      settled.current = ticket;
      lastPersisted.current = value;
      pending.current = undefined;
      if (ticket === seq.current) {
        setState('saved');
        setLastSavedAt(Date.now());
      }
    } catch {
      if (ticket >= settled.current) {
        settled.current = ticket;
        setState('error');
      }
    }
  }, []);

  const schedule = useCallback((value: string | null) => {
    if (!enabled) return;
    pending.current = value;
    setState((s) => (s === 'error' ? 'error' : 'dirty'));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void persist(value); }, delay);
  }, [delay, enabled, persist]);

  const flush = useCallback(async () => {
    if (!enabled) return;
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if (pending.current === undefined) return;
    await persist(pending.current);
  }, [enabled, persist]);

  const retry = useCallback(async () => {
    if (pending.current === undefined) return;
    await persist(pending.current);
  }, [persist]);

  // Flush before the tab goes away.
  useEffect(() => {
    if (!enabled) return;
    const onHide = () => { void flush(); };
    window.addEventListener('beforeunload', onHide);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('beforeunload', onHide);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [enabled, flush]);

  // Flush on unmount.
  const flushRef = useRef(flush);
  flushRef.current = flush;
  useEffect(() => () => { void flushRef.current(); }, []);

  return { state, lastSavedAt, schedule, flush, retry };
}
