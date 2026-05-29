/**
 * Focus — the task-centric top of the Today page.
 *
 * Six sections in fixed vertical order (PART E of refinement plan):
 *   1. Now           — running timer
 *   2. Today         — to_do/in_progress with due_date ≤ today (or in-progress always)
 *   3. Follow up     — follow_up_at ≤ today
 *   4. Awaiting      — in_review
 *   5. Recurring up next — materialized recurring instances inside lead window
 *   6. Quick add     — inline capture
 *
 * Layout reuses approved Home composition: hairline rails, section eyebrows,
 * never cards. on_hold and complete never surface here.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Clock, Hourglass, Eye, Repeat, Plus, ChevronRight, CircleDot } from 'lucide-react';
import { parseISO, isPast, isToday, differenceInCalendarDays, format } from 'date-fns';

import { useAuth } from '@/data/AuthContext';
import { useData } from '@/data/DataContext';
import {
  loadAllTasksForWorkspace,
  updateChecklistItem,
  addLooseTask,
  type WorkspaceTask,
} from '@/data/checklistsApi';
import { STATUS_BY_VALUE, nextStatus, type TaskStatus } from '@/data/taskStatus';
import { SectionEyebrow } from './primitives/composition';
import { toast } from '@/lib/toast';

// ── Helpers ──────────────────────────────────────────────────────────

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.32, 0.72, 0, 1] as const } },
};

const TODAY_CAP = 8;
const AWAITING_CAP = 5;
const RECURRING_CAP = 3;
const DEFAULT_LEAD_DAYS = 2;

function formatElapsed(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

function dueLabel(due?: string | null): { text: string; tone: 'danger' | 'warning' | 'muted' } | null {
  if (!due) return null;
  try {
    const d = parseISO(due);
    if (isToday(d)) return { text: 'Today', tone: 'warning' };
    if (isPast(d)) {
      const days = Math.abs(differenceInCalendarDays(d, new Date()));
      return { text: `${days}d overdue`, tone: 'danger' };
    }
    return { text: format(d, 'MMM d'), tone: 'muted' };
  } catch {
    return null;
  }
}

// ── Component ────────────────────────────────────────────────────────

export function FocusSections() {
  const navigate = useNavigate();
  const { workspaceId } = useAuth();
  const { clients } = useData();

  const [tasks, setTasks] = useState<WorkspaceTask[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Timer state — read directly from localStorage and tick once per second.
  const [timerStart, setTimerStart] = useState<number | null>(() => {
    const v = typeof window !== 'undefined' ? localStorage.getItem('aurelo_timer_start') : null;
    return v ? Number(v) : null;
  });
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const tick = () => {
      const v = localStorage.getItem('aurelo_timer_start');
      setTimerStart(v ? Number(v) : null);
      setNow(Date.now());
    };
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Load tasks
  const refresh = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const data = await loadAllTasksForWorkspace(workspaceId);
      setTasks(data);
    } catch (err: any) {
      console.error('[Focus] loadTasks failed:', err);
    } finally {
      setLoaded(true);
    }
  }, [workspaceId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const clientMap = useMemo(() => {
    const m = new Map<string, any>();
    clients.forEach((c: any) => m.set(c.id, c));
    return m;
  }, [clients]);

  // ── Bucketing ──────────────────────────────────────────────────────
  const today = useMemo(() => {
    const open = tasks.filter(
      (t) => t.status === 'to_do' || t.status === 'in_progress',
    );
    const dueOrInProgress = open.filter((t) => {
      if (t.status === 'in_progress') return true;
      if (!t.dueDate) return false;
      try {
        const d = parseISO(t.dueDate);
        return isPast(d) || isToday(d);
      } catch {
        return false;
      }
    });
    return dueOrInProgress.sort((a, b) => {
      // in_progress first
      const ap = a.status === 'in_progress' ? 0 : 1;
      const bp = b.status === 'in_progress' ? 0 : 1;
      if (ap !== bp) return ap - bp;
      // overdue first (oldest first), then due today by priority
      const ad = a.dueDate ? parseISO(a.dueDate).getTime() : Infinity;
      const bd = b.dueDate ? parseISO(b.dueDate).getTime() : Infinity;
      if (ad !== bd) return ad - bd;
      const pri: Record<string, number> = { high: 0, normal: 1, low: 2 };
      return (pri[a.priority || 'normal'] ?? 1) - (pri[b.priority || 'normal'] ?? 1);
    });
  }, [tasks]);

  const followUps = useMemo(() => {
    return tasks.filter((t) => {
      if (t.status === 'complete') return false;
      if (!t.followUpAt) return false;
      try {
        const d = parseISO(t.followUpAt);
        return isPast(d) || isToday(d);
      } catch {
        return false;
      }
    });
  }, [tasks]);

  const awaiting = useMemo(() => {
    return tasks.filter((t) => t.status === 'in_review').slice(0, AWAITING_CAP + 1);
  }, [tasks]);

  const recurringUpNext = useMemo(() => {
    // Materialized recurring instances within the lead window but not yet due.
    return tasks
      .filter((t) => {
        if (!t.recurrenceId) return false;
        if (t.status === 'complete') return false;
        if (!t.dueDate) return false;
        try {
          const d = parseISO(t.dueDate);
          const diff = differenceInCalendarDays(d, new Date());
          return diff > 0 && diff <= DEFAULT_LEAD_DAYS + 7;
        } catch {
          return false;
        }
      })
      .sort((a, b) => parseISO(a.dueDate!).getTime() - parseISO(b.dueDate!).getTime())
      .slice(0, RECURRING_CAP);
  }, [tasks]);

  // ── Mutations ──────────────────────────────────────────────────────

  const cycleStatus = useCallback(async (task: WorkspaceTask) => {
    const next = nextStatus(task.status);
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, status: next, completed: next === 'complete' } : t,
      ),
    );
    try {
      await updateChecklistItem(task.id, { status: next });
    } catch (err: any) {
      toast.error(err.message);
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
    }
  }, []);

  const markFollowedUp = useCallback(async (task: WorkspaceTask) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, followUpAt: null } : t)),
    );
    try {
      await updateChecklistItem(task.id, { followUpAt: null });
      toast.success('Follow-up cleared');
    } catch (err: any) {
      toast.error(err.message);
      refresh();
    }
  }, [refresh]);

  // ── Quick add ──────────────────────────────────────────────────────
  const [quickText, setQuickText] = useState('');
  const [quickClientId, setQuickClientId] = useState<string>('');

  // Default quick-add client = most recent client
  useEffect(() => {
    if (!quickClientId && clients.length > 0) {
      setQuickClientId(clients[0].id);
    }
  }, [clients, quickClientId]);

  const handleQuickAdd = useCallback(async () => {
    const text = quickText.trim();
    if (!text || !workspaceId || !quickClientId) return;
    try {
      const created = await addLooseTask(workspaceId, quickClientId, { text });
      setTasks((prev) => [
        { ...created, clientId: quickClientId, projectId: null, checklistTitle: 'Tasks' },
        ...prev,
      ]);
      setQuickText('');
      toast.success('Task captured');
    } catch (err: any) {
      toast.error(err.message);
    }
  }, [quickText, quickClientId, workspaceId]);

  if (!loaded) return null;

  // Hide entire surface if nothing to show AND no clients (Home empty state handles it)
  const hasAnything =
    timerStart !== null ||
    today.length > 0 ||
    followUps.length > 0 ||
    awaiting.length > 0 ||
    recurringUpNext.length > 0 ||
    clients.length > 0;
  if (!hasAnything) return null;

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-10">
      {/* ── 1. Now ───────────────────────────────────────────────── */}
      {timerStart !== null && (
        <motion.section variants={item}>
          <SectionEyebrow>Now</SectionEyebrow>
          <div className="mt-3 flex items-center gap-3 py-3 border-y border-border">
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
              <div className="type-body" style={{ fontWeight: 500 }}>
                Timer running
              </div>
              <div className="type-meta">Started {format(new Date(timerStart), 'h:mm a')}</div>
            </div>
            <span className="type-display tabular-nums text-foreground">
              {formatElapsed(Math.max(0, Math.floor((now - timerStart) / 1000)))}
            </span>
          </div>
        </motion.section>
      )}

      {/* ── 2. Today ─────────────────────────────────────────────── */}
      <motion.section variants={item}>
        <SectionEyebrow
          trailing={
            today.length > TODAY_CAP ? (
              <button
                onClick={() => navigate('/time?tab=tasks')}
                className="inline-flex items-center gap-1 text-foreground hover:opacity-70 transition-opacity"
                style={{ fontWeight: 500, cursor: 'pointer' }}
              >
                +{today.length - TODAY_CAP} more <ChevronRight className="w-3 h-3" />
              </button>
            ) : undefined
          }
        >
          Today
        </SectionEyebrow>

        {today.length > 0 ? (
          <ul className="mt-3 divide-y divide-border border-y border-border">
            {today.slice(0, TODAY_CAP).map((t) => {
              const client = clientMap.get(t.clientId);
              const due = dueLabel(t.dueDate);
              const cfg = STATUS_BY_VALUE[t.status];
              return (
                <li
                  key={t.id}
                  className="group flex items-center gap-3 py-3 -mx-2 px-2 hover:bg-[color:var(--surface-sunken)] transition-colors"
                >
                  <button
                    onClick={() => cycleStatus(t)}
                    className="flex-shrink-0"
                    style={{ cursor: 'pointer' }}
                    aria-label={`Status: ${cfg.label}. Click to advance.`}
                    title={cfg.label}
                  >
                    <span className={`block w-2 h-2 rounded-circle ${cfg.dotClass}`} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="type-body truncate" style={{ fontWeight: 500 }}>
                      {t.text}
                    </div>
                    <div className="type-meta truncate flex items-center gap-2">
                      {client && (
                        <button
                          onClick={() => navigate(`/clients/${t.clientId}`)}
                          className="hover:text-foreground transition-colors"
                          style={{ cursor: 'pointer' }}
                        >
                          {client.name}
                        </button>
                      )}
                      {t.checklistTitle && t.checklistTitle !== 'Tasks' && (
                        <>
                          <span aria-hidden>·</span>
                          <span className="truncate">{t.checklistTitle}</span>
                        </>
                      )}
                      {t.recurrenceId && (
                        <span title="Recurring" className="inline-flex items-center">
                          <Repeat className="w-3 h-3 opacity-60" />
                        </span>
                      )}
                    </div>
                  </div>
                  {t.status === 'in_progress' && (
                    <span
                      className="type-meta inline-flex items-center gap-1 flex-shrink-0"
                      style={{ color: 'var(--primary)' }}
                    >
                      <CircleDot className="w-3 h-3" /> In progress
                    </span>
                  )}
                  {due && (
                    <span
                      className="type-meta tabular-nums flex-shrink-0"
                      style={{
                        color:
                          due.tone === 'danger'
                            ? 'var(--destructive)'
                            : due.tone === 'warning'
                              ? 'var(--warning)'
                              : 'var(--muted-foreground)',
                      }}
                    >
                      {due.text}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-3 type-meta py-6 text-center border-y border-border">
            Nothing due today. Capture a task below.
          </div>
        )}
      </motion.section>

      {/* ── 3. Follow up ────────────────────────────────────────── */}
      {followUps.length > 0 && (
        <motion.section variants={item}>
          <SectionEyebrow trailing={`${followUps.length}`}>Follow up</SectionEyebrow>
          <ul className="mt-3 divide-y divide-border border-y border-border">
            {followUps.map((t) => {
              const client = clientMap.get(t.clientId);
              return (
                <li
                  key={t.id}
                  className="group flex items-center gap-3 py-3 -mx-2 px-2 hover:bg-[color:var(--surface-sunken)] transition-colors"
                >
                  <span
                    className="inline-flex items-center justify-center w-6 h-6 flex-shrink-0 rounded-circle"
                    style={{
                      color: 'var(--warning)',
                      background: 'color-mix(in oklab, var(--warning) 12%, transparent)',
                    }}
                  >
                    <Hourglass className="w-3 h-3" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="type-body truncate" style={{ fontWeight: 500 }}>
                      {t.text}
                    </div>
                    <div className="type-meta truncate">
                      {client?.name}
                      {t.waitingOn ? ` · waiting on ${t.waitingOn}` : ''}
                      {t.waitingNote ? ` — ${t.waitingNote}` : ''}
                    </div>
                  </div>
                  <button
                    onClick={() => markFollowedUp(t)}
                    className="type-meta px-2 py-1 border border-border hover:bg-[color:var(--surface-overlay)] transition-colors flex-shrink-0"
                    style={{ cursor: 'pointer', borderRadius: 4 }}
                  >
                    Followed up
                  </button>
                </li>
              );
            })}
          </ul>
        </motion.section>
      )}

      {/* ── 4. Awaiting ─────────────────────────────────────────── */}
      {awaiting.length > 0 && (
        <motion.section variants={item}>
          <SectionEyebrow trailing={`${awaiting.length}`}>Awaiting</SectionEyebrow>
          <ul className="mt-3 divide-y divide-border border-y border-border">
            {awaiting.slice(0, AWAITING_CAP).map((t) => {
              const client = clientMap.get(t.clientId);
              return (
                <li
                  key={t.id}
                  onClick={() => navigate(`/clients/${t.clientId}`)}
                  className="group flex items-center gap-3 py-3 -mx-2 px-2 cursor-pointer hover:bg-[color:var(--surface-sunken)] transition-colors"
                >
                  <span
                    className="inline-flex items-center justify-center w-6 h-6 flex-shrink-0 rounded-circle"
                    style={{
                      color: 'var(--warning)',
                      background: 'color-mix(in oklab, var(--warning) 12%, transparent)',
                    }}
                  >
                    <Eye className="w-3 h-3" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="type-body truncate">{t.text}</div>
                    <div className="type-meta truncate">{client?.name}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </li>
              );
            })}
            {awaiting.length > AWAITING_CAP && (
              <li className="py-2 -mx-2 px-2">
                <button
                  onClick={() => navigate('/time?tab=tasks')}
                  className="type-meta inline-flex items-center gap-1 hover:text-foreground transition-colors"
                  style={{ cursor: 'pointer' }}
                >
                  +{awaiting.length - AWAITING_CAP} more <ChevronRight className="w-3 h-3" />
                </button>
              </li>
            )}
          </ul>
        </motion.section>
      )}

      {/* ── 5. Recurring up next ────────────────────────────────── */}
      {recurringUpNext.length > 0 && (
        <motion.section variants={item}>
          <SectionEyebrow>Recurring up next</SectionEyebrow>
          <ul className="mt-3 divide-y divide-border border-y border-border">
            {recurringUpNext.map((t) => {
              const client = clientMap.get(t.clientId);
              const due = t.dueDate ? format(parseISO(t.dueDate), 'EEE, MMM d') : '';
              return (
                <li
                  key={t.id}
                  className="flex items-center gap-3 py-3 -mx-2 px-2 hover:bg-[color:var(--surface-sunken)] transition-colors"
                >
                  <span
                    className="inline-flex items-center justify-center w-6 h-6 flex-shrink-0 rounded-circle"
                    style={{
                      color: 'var(--muted-foreground)',
                      background: 'color-mix(in oklab, var(--muted-foreground) 10%, transparent)',
                    }}
                  >
                    <Repeat className="w-3 h-3" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="type-body truncate">{t.text}</div>
                    <div className="type-meta truncate">{client?.name}</div>
                  </div>
                  <span className="type-meta tabular-nums flex-shrink-0">{due}</span>
                </li>
              );
            })}
          </ul>
        </motion.section>
      )}

      {/* ── 6. Quick add ────────────────────────────────────────── */}
      {clients.length > 0 && (
        <motion.section variants={item}>
          <div className="flex items-center gap-2 py-2 border-y border-border">
            <Plus className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 ml-1" />
            <input
              type="text"
              value={quickText}
              onChange={(e) => setQuickText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleQuickAdd();
                }
              }}
              placeholder="Capture a task…"
              className="flex-1 bg-transparent type-body py-1.5 focus:outline-none placeholder:text-muted-foreground"
            />
            <select
              value={quickClientId}
              onChange={(e) => setQuickClientId(e.target.value)}
              className="type-meta bg-transparent border-l border-border pl-3 pr-2 py-1 focus:outline-none"
              style={{ cursor: 'pointer' }}
              aria-label="Client"
            >
              {clients.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleQuickAdd}
              disabled={!quickText.trim() || !quickClientId}
              className="type-meta px-3 py-1 bg-foreground text-background disabled:opacity-40 transition-opacity flex-shrink-0"
              style={{
                cursor: quickText.trim() && quickClientId ? 'pointer' : 'not-allowed',
                borderRadius: 4,
                fontWeight: 500,
              }}
            >
              Add
            </button>
          </div>
        </motion.section>
      )}
    </div>
  );
}

