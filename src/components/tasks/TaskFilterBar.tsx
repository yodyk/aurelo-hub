// ── TaskFilterBar — status/date chips over the scoped dataset ───────
import { TASK_FILTERS, type TaskFilterKey } from './useTaskPipeline';

export function TaskFilterBar({
  filter, onChange, counts,
}: {
  filter: TaskFilterKey;
  onChange: (f: TaskFilterKey) => void;
  counts: Record<TaskFilterKey, number>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {TASK_FILTERS.map(f => {
        const active = filter === f.key;
        const count = counts[f.key] ?? 0;
        const countColor =
          f.tone === 'danger' && count > 0 ? 'var(--destructive)' :
          f.tone === 'warning' && count > 0 ? 'var(--warning)' : undefined;
        return (
          <button
            key={f.key}
            type="button"
            onClick={() => onChange(f.key)}
            className={`inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1 border transition-colors cursor-pointer ${
              active
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent/40'
            }`}
            style={{ fontWeight: 500, borderRadius: 4 }}
          >
            {f.label}
            <span className="tabular-nums" style={{ color: countColor, opacity: countColor ? 1 : 0.7 }}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
