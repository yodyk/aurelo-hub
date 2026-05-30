/**
 * MobileTimerBar — persistent timer awareness rail for mobile.
 *
 * Renders only on < lg viewports and only when a timer is running.
 * Sits directly above the MobileBottomNav so the timer is always visible
 * regardless of which page the user is on.
 *
 * Reads timer state from localStorage (aurelo_timer_start + aurelo_timer_context)
 * and listens to the global `aurelo:timer-changed` event for cross-component sync.
 */
import { useEffect, useState } from 'react';
import { Clock, Square } from 'lucide-react';

interface TimerContext {
  clientName?: string;
  projectName?: string | null;
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

interface Props {
  onStop?: () => void;
}

export function MobileTimerBar({ onStop }: Props) {
  const [start, setStart] = useState<number | null>(() => {
    const v = typeof window !== 'undefined' ? localStorage.getItem('aurelo_timer_start') : null;
    return v ? Number(v) : null;
  });
  const [ctx, setCtx] = useState<TimerContext | null>(() => readContext());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const sync = () => {
      const v = localStorage.getItem('aurelo_timer_start');
      setStart(v ? Number(v) : null);
      setCtx(readContext());
    };
    sync();
    const id = setInterval(() => { sync(); setNow(Date.now()); }, 1000);
    const onChanged = () => sync();
    window.addEventListener('aurelo:timer-changed', onChanged);
    return () => { clearInterval(id); window.removeEventListener('aurelo:timer-changed', onChanged); };
  }, []);

  if (start === null) return null;
  const elapsed = Math.max(0, Math.floor((now - start) / 1000));

  return (
    <div
      className="lg:hidden fixed inset-x-0 z-40 bg-card border-t border-[var(--hairline)]"
      style={{ bottom: 'calc(56px + env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center gap-3 px-4 h-12">
        <span
          className="inline-flex items-center justify-center w-6 h-6 flex-shrink-0 rounded-circle"
          style={{
            color: 'var(--primary)',
            background: 'color-mix(in oklab, var(--primary) 12%, transparent)',
          }}
        >
          <Clock className="w-3 h-3" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[12.5px] truncate" style={{ fontWeight: 600 }}>
            {ctx?.taskTitle || 'Timer running'}
          </div>
          {ctx?.clientName && (
            <div className="type-meta text-muted-foreground truncate">
              {ctx.clientName}{ctx.projectName ? ` · ${ctx.projectName}` : ''}
            </div>
          )}
        </div>
        <span className="text-[14px] tabular-nums" style={{ fontWeight: 600 }}>
          {formatElapsed(elapsed)}
        </span>
        {onStop && (
          <button
            onClick={onStop}
            aria-label="Stop timer"
            className="w-8 h-8 inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground cursor-pointer"
          >
            <Square className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
