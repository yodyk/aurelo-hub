/**
 * TaskStatusPopover — single source of truth for status selection.
 *
 * Replaces the prior "click-to-cycle" affordance. A click on the status
 * indicator opens a menu listing the five statuses. No cycling.
 *
 * Use anywhere a task status indicator appears: row dots in Tasks page,
 * status field in TaskDrawer header, drawer footer "Mark complete" shortcut,
 * ChecklistPanel rows.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { TASK_STATUSES, STATUS_BY_VALUE, type TaskStatus } from '@/data/taskStatus';

export function TaskStatusPopover({
  status,
  onChange,
  trigger,
  align = 'left',
  disabled,
}: {
  status: TaskStatus;
  onChange: (next: TaskStatus) => void;
  trigger?: ReactNode;
  align?: 'left' | 'right';
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cfg = STATUS_BY_VALUE[status] || STATUS_BY_VALUE.to_do;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onEsc);
    return () => {
      window.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const handleSelect = (s: TaskStatus) => {
    setOpen(false);
    if (s !== status) onChange(s);
  };

  const defaultTrigger = (
    <span
      aria-label={`Status: ${cfg.label}`}
      title={cfg.label}
      className={`inline-flex items-center justify-center w-4 h-4`}
    >
      <span className={`block w-2 h-2 rounded-circle ${cfg.dotClass}`} />
    </span>
  );

  return (
    <div ref={ref} className="relative inline-flex items-center">
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => { e.stopPropagation(); if (!disabled) setOpen(v => !v); }}
        className="inline-flex items-center cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
      >
        {trigger ?? defaultTrigger}
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute z-30 top-full mt-1 w-44 bg-popover border border-border rounded-md shadow-md py-1 ${align === 'right' ? 'right-0' : 'left-0'}`}
        >
          {TASK_STATUSES.map(s => {
            const Icon = s.icon;
            const active = s.value === status;
            return (
              <button
                key={s.value}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={(e) => { e.stopPropagation(); handleSelect(s.value); }}
                className={`w-full flex items-center gap-2 text-[12.5px] px-2.5 py-1.5 hover:bg-accent/60 cursor-pointer ${active ? 'text-primary' : 'text-foreground'}`}
                style={{ fontWeight: active ? 600 : 500 }}
              >
                <span className={`inline-block w-2 h-2 rounded-circle ${s.dotClass}`} />
                <Icon className={`w-3.5 h-3.5 ${s.textClass}`} />
                <span className="flex-1 text-left">{s.label}</span>
                {active && <Check className="w-3 h-3 opacity-70" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
