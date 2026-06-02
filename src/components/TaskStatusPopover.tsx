/**
 * TaskStatusPopover — single source of truth for status selection.
 *
 * Uses Radix Popover (portaled to body) so the menu is never clipped by
 * ancestors with `overflow: hidden` (cards, table rows, drawers). This is
 * the "framework" for any small floating menu attached to an inline trigger
 * inside a constrained surface — prefer Radix Popover/DropdownMenu over
 * hand-rolled absolutely-positioned panels.
 */
import { type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TASK_STATUSES, STATUS_BY_VALUE, type TaskStatus } from '@/data/taskStatus';

export function TaskStatusPopover({
  status,
  onChange,
  trigger,
  align = 'start',
  disabled,
}: {
  status: TaskStatus;
  onChange: (next: TaskStatus) => void;
  trigger?: ReactNode;
  /** 'left' | 'right' kept as aliases for backwards compatibility. */
  align?: 'start' | 'end' | 'center' | 'left' | 'right';
  disabled?: boolean;
}) {
  const cfg = STATUS_BY_VALUE[status] || STATUS_BY_VALUE.to_do;
  const radixAlign: 'start' | 'end' | 'center' =
    align === 'left' ? 'start' : align === 'right' ? 'end' : align;

  const handleSelect = (s: TaskStatus) => {
    if (s !== status) onChange(s);
  };

  const defaultTrigger = (
    <span
      aria-label={`Status: ${cfg.label}`}
      title={cfg.label}
      className="inline-flex items-center justify-center w-4 h-4"
    >
      <span className={`block w-2 h-2 rounded-circle ${cfg.dotClass}`} />
    </span>
  );

  return (
    <Popover>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          disabled={disabled}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
        >
          {trigger ?? defaultTrigger}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={radixAlign}
        sideOffset={4}
        className="w-44 py-1"
        onClick={(e) => e.stopPropagation()}
      >
        <div role="menu">
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
      </PopoverContent>
    </Popover>
  );
}
