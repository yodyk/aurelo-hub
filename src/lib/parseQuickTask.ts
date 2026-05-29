/**
 * parseQuickTask — Things-3-style natural language for the Quick Add bar.
 *
 * Pure, no React. Returns a normalized task draft + a stripped title.
 *
 * Supported tokens (all optional, order-independent inside the input):
 *   @<client>                    fuzzy client name
 *   #<project>                   fuzzy project name (within resolved client)
 *   today | tomorrow             due date
 *   next <weekday>               due date (next occurrence)
 *   in <N> days                  due date
 *   on <Mmm d> | <M/D>           due date
 *   review | hold                status (in_review | on_hold)
 *   !high | !low                 priority
 *   every week | every month     repeat
 *   every quarter                repeat
 *   ^follow up <date>            follow_up_at
 */
import {
  addDays, parse, isValid, nextMonday, nextTuesday, nextWednesday, nextThursday,
  nextFriday, nextSaturday, nextSunday, format,
} from 'date-fns';
import type { TaskStatus, TaskPriority } from '@/data/checklistsApi';

export interface QuickTaskClient { id: string; name: string }
export interface QuickTaskProject { id: string; clientId: string; name: string }

export interface QuickTaskDraft {
  text: string;                    // stripped title
  clientId: string | null;
  clientName: string | null;
  projectId: string | null;
  projectName: string | null;
  dueDate: string | null;          // YYYY-MM-DD
  followUpAt: string | null;
  status: TaskStatus;
  priority: TaskPriority | null;
  repeat: 'weekly' | 'monthly' | 'quarterly' | null;
  /** Tokens that were recognized — for preview chips. */
  matched: string[];
  /** Raw @client token that didn't resolve. */
  unresolvedClient: string | null;
}

const WEEKDAYS: Record<string, (d: Date) => Date> = {
  monday: nextMonday, tuesday: nextTuesday, wednesday: nextWednesday,
  thursday: nextThursday, friday: nextFriday, saturday: nextSaturday, sunday: nextSunday,
  mon: nextMonday, tue: nextTuesday, wed: nextWednesday, thu: nextThursday,
  fri: nextFriday, sat: nextSaturday, sun: nextSunday,
};

function ymd(d: Date) { return format(d, 'yyyy-MM-dd'); }

function fuzzyFind<T extends { name: string }>(token: string, items: T[]): T | null {
  const t = token.trim().toLowerCase();
  if (!t) return null;
  return (
    items.find(c => c.name.toLowerCase() === t) ||
    items.find(c => c.name.toLowerCase().startsWith(t)) ||
    items.find(c => c.name.toLowerCase().includes(t)) ||
    null
  );
}

function parseDateToken(token: string): Date | null {
  const lower = token.trim().toLowerCase();
  if (!lower) return null;
  const today = new Date();
  if (lower === 'today') return today;
  if (lower === 'tomorrow' || lower === 'tmr' || lower === 'tmrw') return addDays(today, 1);
  const nextMatch = lower.match(/^next\s+(\w+)$/);
  if (nextMatch && WEEKDAYS[nextMatch[1]]) return WEEKDAYS[nextMatch[1]](today);
  const inDays = lower.match(/^in\s+(\d+)\s+days?$/);
  if (inDays) return addDays(today, Number(inDays[1]));
  for (const fmt of ['MMM d', 'MMM d yyyy', 'M/d', 'M/d/yyyy', 'yyyy-MM-dd']) {
    const d = parse(token, fmt, today);
    if (isValid(d)) return d;
  }
  return null;
}

export function parseQuickTask(
  input: string,
  clients: QuickTaskClient[],
  projects: QuickTaskProject[],
  fallbackClientId: string | null = null,
): QuickTaskDraft {
  const matched: string[] = [];
  let working = input;
  let dueDate: string | null = null;
  let followUpAt: string | null = null;
  let status: TaskStatus = 'to_do';
  let priority: TaskPriority | null = null;
  let repeat: QuickTaskDraft['repeat'] = null;
  let clientId: string | null = null;
  let clientName: string | null = null;
  let projectId: string | null = null;
  let projectName: string | null = null;
  let unresolvedClient: string | null = null;

  // Priority flags
  working = working.replace(/!high\b/i, () => { priority = 'high'; matched.push('!high'); return ''; });
  working = working.replace(/!low\b/i,  () => { priority = 'low';  matched.push('!low');  return ''; });

  // Status keywords
  working = working.replace(/\breview\b/i, () => { status = 'in_review'; matched.push('In review'); return ''; });
  working = working.replace(/\bhold\b/i,   () => { status = 'on_hold';   matched.push('On hold'); return ''; });

  // Repeat
  working = working.replace(/every\s+week\b/i,    () => { repeat = 'weekly';    matched.push('Repeats weekly'); return ''; });
  working = working.replace(/every\s+month\b/i,   () => { repeat = 'monthly';   matched.push('Repeats monthly'); return ''; });
  working = working.replace(/every\s+quarter\b/i, () => { repeat = 'quarterly'; matched.push('Repeats quarterly'); return ''; });

  // Follow up date  ^follow up <date>  /  ^Mmm d
  working = working.replace(/\^follow\s*up\s+([\w/\d]+(?:\s+\d+)?)/i, (_m, tok) => {
    const d = parseDateToken(tok); if (d) { followUpAt = ymd(d); matched.push(`Follow-up ${format(d, 'MMM d')}`); return ''; } return _m;
  });

  // Due date phrases
  const duePhrases: Array<[RegExp, (m: string[]) => string]> = [
    [/\b(today|tomorrow|tmr|tmrw)\b/i, m => m[1]],
    [/\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/i, m => `next ${m[1]}`],
    [/\bin\s+(\d+)\s+days?\b/i, m => `in ${m[1]} days`],
    [/\bon\s+([A-Za-z]{3,9}\s+\d{1,2})\b/i, m => m[1]],
    [/\b(\d{1,2}\/\d{1,2})\b/, m => m[1]],
  ];
  for (const [rx, get] of duePhrases) {
    if (dueDate) break;
    working = working.replace(rx, (...m) => {
      const tok = get(m);
      const d = parseDateToken(tok);
      if (d) { dueDate = ymd(d); matched.push(`Due ${format(d, 'MMM d')}`); return ''; }
      return m[0];
    });
  }

  // Client @token
  working = working.replace(/@([\w-]+(?:\s+[\w-]+){0,3})/, (full, tok) => {
    const c = fuzzyFind(tok, clients);
    if (c) { clientId = c.id; clientName = c.name; matched.push(`@${c.name}`); return ''; }
    unresolvedClient = tok;
    return full;
  });

  if (!clientId && fallbackClientId) {
    const c = clients.find(x => x.id === fallbackClientId);
    if (c) { clientId = c.id; clientName = c.name; }
  }

  // Project #token (scoped to resolved client when possible)
  working = working.replace(/#([\w-]+(?:\s+[\w-]+){0,3})/, (full, tok) => {
    const pool = clientId ? projects.filter(p => p.clientId === clientId) : projects;
    const p = fuzzyFind(tok, pool);
    if (p) { projectId = p.id; projectName = p.name; matched.push(`#${p.name}`); return ''; }
    return full;
  });

  const text = working.replace(/\s+/g, ' ').trim();

  return {
    text,
    clientId, clientName,
    projectId, projectName,
    dueDate, followUpAt,
    status, priority, repeat,
    matched, unresolvedClient,
  };
}
