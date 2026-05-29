// ── Task Status — single source of truth ────────────────────────────
// Five statuses, fixed. No user-defined statuses. Tone defined in plan PART A.

import type { LucideIcon } from 'lucide-react';
import { CircleDashed, CircleDot, Eye, PauseCircle, CheckCircle2 } from 'lucide-react';

export type TaskStatus =
  | 'to_do'
  | 'in_progress'
  | 'in_review'
  | 'on_hold'
  | 'complete';

export interface TaskStatusConfig {
  value: TaskStatus;
  label: string;
  icon: LucideIcon;
  /** Used by row dots/chips. Tailwind class on a small dot. */
  dotClass: string;
  textClass: string;
  bgClass: string;
  borderClass: string;
  /** True for statuses that count as "open" (not complete). */
  open: boolean;
}

export const TASK_STATUSES: TaskStatusConfig[] = [
  { value: 'to_do',       label: 'To Do',       icon: CircleDashed, dotClass: 'bg-muted-foreground/50', textClass: 'text-muted-foreground',                 bgClass: 'bg-muted/50',         borderClass: 'border-border',         open: true  },
  { value: 'in_progress', label: 'In Progress', icon: CircleDot,    dotClass: 'bg-primary',             textClass: 'text-primary',                          bgClass: 'bg-primary/10',       borderClass: 'border-primary/30',     open: true  },
  { value: 'in_review',   label: 'In Review',   icon: Eye,          dotClass: 'bg-amber-500',           textClass: 'text-amber-700 dark:text-amber-400',    bgClass: 'bg-amber-500/10',     borderClass: 'border-amber-500/30',   open: true  },
  { value: 'on_hold',     label: 'On Hold',     icon: PauseCircle,  dotClass: 'bg-slate-400',           textClass: 'text-slate-600 dark:text-slate-400',    bgClass: 'bg-slate-500/10',     borderClass: 'border-slate-500/20',   open: true  },
  { value: 'complete',    label: 'Complete',    icon: CheckCircle2, dotClass: 'bg-emerald-500',         textClass: 'text-emerald-700 dark:text-emerald-400',bgClass: 'bg-emerald-500/10',   borderClass: 'border-emerald-500/30', open: false },
];

export const STATUS_BY_VALUE: Record<TaskStatus, TaskStatusConfig> =
  Object.fromEntries(TASK_STATUSES.map(s => [s.value, s])) as Record<TaskStatus, TaskStatusConfig>;

/** Grouping order for Client Workspace and Project Detail tabs. */
export const STATUS_GROUP_ORDER: TaskStatus[] = [
  'in_progress', 'to_do', 'in_review', 'on_hold', 'complete',
];

/** Next-status cycle for click-to-advance (in-row checkbox cycle). */
export const STATUS_CYCLE: TaskStatus[] = [
  'to_do', 'in_progress', 'in_review', 'on_hold', 'complete',
];

export function nextStatus(s: TaskStatus): TaskStatus {
  const i = STATUS_CYCLE.indexOf(s);
  return STATUS_CYCLE[(i + 1) % STATUS_CYCLE.length];
}

/** Map any legacy or unknown value to the new vocabulary. Defensive only. */
export function normalizeStatus(s: string | null | undefined): TaskStatus {
  switch (s) {
    case 'todo':        return 'to_do';
    case 'doing':
    case 'in_progress': return 'in_progress';
    case 'blocked':
    case 'on_hold':     return 'on_hold';
    case 'done':        return 'complete';
    case 'to_do':
    case 'in_review':
    case 'complete':    return s;
    default:            return 'to_do';
  }
}
