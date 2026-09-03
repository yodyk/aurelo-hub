import { useCallback, useEffect, useState } from 'react';

export interface ColumnDef {
  key: string;
  label: string;
  /** Minimum width in px — always at least wide enough for the header label. */
  minWidth: number;
  numeric?: boolean;
  /** Always visible, cannot be toggled off. */
  locked?: boolean;
  /** Visible by default in a fresh workspace. */
  defaultOn?: boolean;
}

/** Rough width of the uppercase 10.5px header label + cell padding. */
export function labelMinWidth(label: string, extra = 0) {
  return Math.max(96, Math.round(label.length * 7.4) + 32 + extra);
}

export function useColumnPrefs(storageKey: string, columns: ColumnDef[]) {
  const fallback = useCallback(
    () => new Set(columns.filter((c) => c.locked || c.defaultOn).map((c) => c.key)),
    [columns],
  );
  const [visible, setVisible] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return fallback();
      const parsed = JSON.parse(raw) as string[];
      const next = new Set(parsed.filter((key) => columns.some((c) => c.key === key)));
      columns.filter((c) => c.locked).forEach((c) => next.add(c.key));
      return next.size ? next : fallback();
    } catch {
      return fallback();
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify([...visible]));
    } catch {
      /* storage unavailable — preferences stay in-memory */
    }
  }, [storageKey, visible]);

  const toggle = useCallback((key: string) => {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const reset = useCallback(() => setVisible(fallback()), [fallback]);

  const shown = columns.filter((c) => c.locked || visible.has(c.key));
  return { visible, shown, toggle, reset };
}
