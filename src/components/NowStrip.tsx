/**
 * NowStrip — the always-on "Now" rail.
 *
 * Tiny strip that shows the currently running timer (and what it's tied to,
 * when the user started it from a task). Lives directly above the Today
 * tasks module. Renders nothing when no timer is running.
 */
import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { format } from 'date-fns';

interface TimerContext {
  clientId?: string;
  clientName?: string;
  projectId?: string | null;
  projectName?: string | null;
  taskId?: string | null;
  taskTitle?: string | null;
}

function readContext(): TimerContext | null {
  try {
    const raw = localStorage.getItem('aurelo_timer_context');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function formatElapsed(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

export function NowStrip() {
  const [start, setStart] = useState<number | null>(() => {
    const v = typeof window !== 'undefined' ? localStorage.getItem('aurelo_timer_start') : null;
    return v ? Number(v) : null;
  });
  const [now, setNow] = useState(() => Date.now());
  const [ctx, setCtx] = useState<TimerContext | null>(() => readContext());

  useEffect(() => {
    const tick = () => {
      const v = localStorage.getItem('aurelo_timer_start');
      setStart(v ? Number(v) : null);
      setCtx(readContext());
      setNow(Date.now());
    };
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (start === null) return null;
  const elapsed = Math.max(0, Math.floor((now - start) / 1000));

  return (
    <section>
      <div className="type-eyebrow mb-2">Now</div>
      <div className="flex items-center gap-3 py-3 border-y border-border">
        <span
          className="inline-flex items-center justify-center w-7 h-7 flex-shrink-0 rounded-circle"
          style={{
            color: 'var(--primary)',
            background: 'color-mix(in oklab, var(--primary) 12%, transparent)',
          }}
        >
          <Clock className="w-3.5 h-3.5" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="type-body truncate" style={{ fontWeight: 500 }}>
            {ctx?.taskTitle || 'Timer running'}
          </div>
          <div className="type-meta truncate">
            {ctx?.clientName ? `${ctx.clientName}${ctx.projectName ? ` · ${ctx.projectName}` : ''} · ` : ''}
            Started {format(new Date(start), 'h:mm a')}
          </div>
        </div>
        <span className="type-display tabular-nums text-foreground">
          {formatElapsed(elapsed)}
        </span>
      </div>
    </section>
  );
}
