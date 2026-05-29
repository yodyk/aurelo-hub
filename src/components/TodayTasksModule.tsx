/**
 * TodayTasksModule — compact tasks summary on the Today page.
 *
 * Replaces the heavy FocusSections. Lives in roughly the previous Active Work
 * footprint and never dominates. Three interactive count chips on top
 * (Overdue / Due today / In review), then up to 5 representative rows,
 * then a "View all tasks →" link. Row click opens TaskDrawer; no inline
 * editing, no status cycling, no quick add inside.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { parseISO, isPast, isToday } from 'date-fns';
import { ChevronRight, Hourglass } from 'lucide-react';

import { useAuth } from '@/data/AuthContext';
import { loadAllTasksForWorkspace, type WorkspaceTask } from '@/data/checklistsApi';
import { STATUS_BY_VALUE } from '@/data/taskStatus';
import { useTaskDrawer } from '@/data/TaskDrawerContext';

const ROW_CAP = 5;

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.32, 0.72, 0, 1] as const } },
};

function isDueToday(d?: string | null) {
  if (!d) return false;
  try { return isToday(parseISO(d)); } catch { return false; }
}
function isOverdue(d?: string | null) {
  if (!d) return false;
  try { const x = parseISO(d); return isPast(x) && !isToday(x); } catch { return false; }
}

export function TodayTasksModule() {
  const navigate = useNavigate();
  const { workspaceId } = useAuth();
  const { open, changeCounter } = useTaskDrawer();
  const [tasks, setTasks] = useState<WorkspaceTask[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const data = await loadAllTasksForWorkspace(workspaceId);
      setTasks(data);
    } catch (err) {
      console.error('[TodayTasksModule] load failed', err);
    } finally { setLoaded(true); }
  }, [workspaceId]);

  useEffect(() => { refresh(); }, [refresh, changeCounter]);

  const { counts, rows } = useMemo(() => {
    const openTasks = tasks.filter(t => t.status !== 'complete');
    const overdue = openTasks.filter(t => isOverdue(t.dueDate));
    const today   = openTasks.filter(t => isDueToday(t.dueDate));
    const review  = openTasks.filter(t => t.status === 'in_review');
    const followups = openTasks.filter(t => isOverdue(t.followUpAt) || isDueToday(t.followUpAt));

    // Row selection — show 5 most pressing
    const seen = new Set<string>();
    const out: WorkspaceTask[] = [];
    const push = (arr: WorkspaceTask[]) => {
      for (const t of arr) {
        if (out.length >= ROW_CAP) break;
        if (seen.has(t.id)) continue;
        seen.add(t.id); out.push(t);
      }
    };
    push([...overdue].sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1)));
    push(today);
    push(openTasks.filter(t => t.status === 'in_progress'));
    push(followups);

    return {
      counts: { overdue: overdue.length, today: today.length, review: review.length, followups: followups.length, total: openTasks.length },
      rows: out,
    };
  }, [tasks]);

  if (!loaded) return null;

  if (counts.total === 0) {
    return (
      <motion.section variants={item} initial="hidden" animate="show">
        <div className="flex items-baseline justify-between gap-3 mb-2">
          <div className="type-eyebrow">Tasks</div>
          <button
            onClick={() => navigate('/tasks')}
            className="type-meta hover:text-foreground transition-colors inline-flex items-center gap-1"
            style={{ cursor: 'pointer' }}
          >
            View all <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="type-meta py-6 text-center border-y border-border">
          Nothing on your plate. <button onClick={() => navigate('/tasks')} className="text-foreground hover:opacity-70 underline-offset-4 hover:underline" style={{ cursor: 'pointer' }}>Open Tasks →</button>
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section variants={item} initial="hidden" animate="show">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <div className="type-eyebrow">Tasks</div>
        <button
          onClick={() => navigate('/tasks')}
          className="type-meta hover:text-foreground transition-colors inline-flex items-center gap-1"
          style={{ cursor: 'pointer' }}
        >
          View all tasks <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Interactive count chips (Adjustment 2) */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <CountChip count={counts.overdue} label="Overdue" tone="danger" onClick={() => navigate('/tasks?filter=overdue')} />
        <CountChip count={counts.today}   label="Due today" tone="warning" onClick={() => navigate('/tasks?filter=today')} />
        <CountChip count={counts.review}  label="In review" tone="warning" onClick={() => navigate('/tasks?filter=in_review')} />
        {counts.followups > 0 && (
          <CountChip count={counts.followups} label="Follow-up due" tone="warning" onClick={() => navigate('/tasks?filter=waiting')} />
        )}
      </div>

      {/* Rows */}
      <ul className="divide-y divide-border border-y border-border">
        {rows.map((t) => {
          const cfg = STATUS_BY_VALUE[t.status];
          const followingUp = isOverdue(t.followUpAt) || isDueToday(t.followUpAt);
          const dueText = (() => {
            if (!t.dueDate) return null;
            try {
              const d = parseISO(t.dueDate);
              if (isToday(d)) return { text: 'Today', tone: 'warning' as const };
              if (isPast(d)) {
                const days = Math.max(1, Math.floor((Date.now() - d.getTime()) / 86400000));
                return { text: `${days}d overdue`, tone: 'danger' as const };
              }
            } catch {}
            return null;
          })();
          return (
            <li
              key={t.id}
              onClick={() => open(t.id)}
              className="group flex items-center gap-3 py-3 -mx-2 px-2 cursor-pointer hover:bg-[color:var(--surface-sunken)] transition-colors"
            >
              <span className="flex-shrink-0 inline-flex items-center justify-center w-4 h-4" title={cfg.label} aria-label={cfg.label}>
                <span className={`block w-2 h-2 rounded-circle ${cfg.dotClass}`} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="type-body truncate" style={{ fontWeight: 500 }}>{t.text}</div>
                <div className="type-meta truncate flex items-center gap-2">
                  {followingUp && (
                    <span className="inline-flex items-center gap-1" style={{ color: 'var(--warning)' }}>
                      <Hourglass className="w-3 h-3" /> Follow up
                    </span>
                  )}
                  {t.status === 'in_review' && !followingUp && <span style={{ color: 'var(--warning)' }}>In review</span>}
                </div>
              </div>
              {dueText && (
                <span
                  className="type-meta tabular-nums flex-shrink-0"
                  style={{ color: dueText.tone === 'danger' ? 'var(--destructive)' : 'var(--warning)' }}
                >
                  {dueText.text}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </motion.section>
  );
}

function CountChip({
  count, label, tone, onClick,
}: {
  count: number;
  label: string;
  tone: 'danger' | 'warning' | 'muted';
  onClick: () => void;
}) {
  const color =
    tone === 'danger' ? 'var(--destructive)' :
    tone === 'warning' ? 'var(--warning)' :
    'var(--muted-foreground)';
  const muted = count === 0;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={muted}
      className="inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1 border border-border hover:bg-[color:var(--surface-sunken)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ fontWeight: 500, borderRadius: 4, cursor: muted ? 'not-allowed' : 'pointer' }}
    >
      <span className="tabular-nums" style={{ color, fontWeight: 600 }}>{count}</span>
      <span className="text-muted-foreground">{label}</span>
    </button>
  );
}
