// ── TaskNavigationItem — one quiet row in the navigation rail ───────
import { type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export function TaskNavigationItem({
  label, count, level = 0, active, onSelect,
  expandable, expanded, onToggle, trailing,
}: {
  label: string;
  count?: number;
  /** 0 = top-level (All Tasks / Client), 1 = list. */
  level?: 0 | 1;
  active?: boolean;
  onSelect: () => void;
  expandable?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  trailing?: ReactNode;
}) {
  return (
    <div
      className={`group relative flex items-center h-7 pr-1.5 transition-colors ${
        active ? 'bg-[color:var(--surface-sunken)]' : 'hover:bg-[color:var(--surface-sunken)]/60'
      }`}
      style={{ paddingLeft: level === 0 ? 6 : 22 }}
    >
      {active && (
        <span
          aria-hidden
          className="absolute left-0 top-0 bottom-0 bg-primary"
          style={{ width: 2 }}
        />
      )}

      {expandable ? (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggle?.(); }}
          aria-label={expanded ? `Collapse ${label}` : `Expand ${label}`}
          aria-expanded={expanded}
          className="w-4 h-4 mr-1 inline-flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer flex-shrink-0"
        >
          {expanded
            ? <ChevronDown className="w-3 h-3" aria-hidden />
            : <ChevronRight className="w-3 h-3" aria-hidden />}
        </button>
      ) : level === 0 ? (
        <span className="w-4 h-4 mr-1 flex-shrink-0" aria-hidden />
      ) : null}

      <button
        type="button"
        onClick={onSelect}
        className={`flex-1 min-w-0 text-left truncate cursor-pointer ${
          level === 0 ? 'text-[13px]' : 'text-[12.5px]'
        } ${active ? 'text-foreground' : level === 0 ? 'text-foreground/90' : 'text-muted-foreground hover:text-foreground'}`}
        style={{ fontWeight: active ? 600 : level === 0 ? 500 : 400 }}
      >
        {label}
      </button>

      {count !== undefined && (
        <span
          className="ml-2 text-[11px] tabular-nums text-muted-foreground flex-shrink-0"
          style={{ opacity: count > 0 ? 0.8 : 0.35 }}
        >
          {count}
        </span>
      )}

      {trailing && <span className="ml-1 flex-shrink-0">{trailing}</span>}
    </div>
  );
}
