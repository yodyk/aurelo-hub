import type { Expense, ExpenseInstance, Recurrence } from './types';

/** Add one deterministic recurrence step without using timezone-sensitive timestamps. */
export function nextOccurrence(date: string, recurrence: Recurrence, intervalDays?: number | null): string {
  const d = new Date(`${date}T12:00:00`);
  if (recurrence === 'weekly') d.setDate(d.getDate() + 7);
  else if (recurrence === 'monthly') d.setMonth(d.getMonth() + 1);
  else if (recurrence === 'quarterly') d.setMonth(d.getMonth() + 3);
  else if (recurrence === 'yearly') d.setFullYear(d.getFullYear() + 1);
  else if (recurrence === 'custom') d.setDate(d.getDate() + Math.max(1, intervalDays || 1));
  else return date;
  return d.toISOString().slice(0, 10);
}

/**
 * Generate only the occurrences visible to the page. Confirmed rows are left
 * untouched by callers; the returned dates are stable across repeated loads.
 */
export function occurrenceDates(expense: Expense, rangeStart: string, rangeEnd: string): string[] {
  const start = expense.startDate && expense.startDate > rangeStart ? expense.startDate : rangeStart;
  const end = expense.endDate && expense.endDate < rangeEnd ? expense.endDate : rangeEnd;
  if (start > end || !expense.active) return [];
  if (expense.recurrence === 'one_time') {
    return expense.startDate && expense.startDate >= rangeStart && expense.startDate <= rangeEnd ? [expense.startDate] : [];
  }
  const dates: string[] = [];
  let current = start;
  for (let i = 0; i < 500 && current <= end; i++) {
    dates.push(current);
    const next = nextOccurrence(current, expense.recurrence, expense.intervalDays);
    if (next === current) break;
    current = next;
  }
  return dates;
}

export function occurrenceKey(expenseId: string, date: string): string {
  return `${expenseId}:${date}`;
}

/**
 * Status a freshly generated occurrence should carry.
 * Past occurrences with a known amount are real incurred costs (actual);
 * past occurrences without one surface as needs_amount instead of silently
 * sitting in the planned bucket; future occurrences stay scheduled (planned).
 */
export function generatedInstanceStatus(
  expense: Pick<Expense, 'amountBehavior' | 'baseAmount'>,
  date: string,
  today: string,
): { status: InstanceStatus; paidDate: string | null } {
  if (expense.amountBehavior === 'variable') return { status: 'needs_amount', paidDate: null };
  const knownAmount = expense.baseAmount != null;
  const past = date <= today;
  if (!past) return { status: 'scheduled', paidDate: null };
  return knownAmount ? { status: 'confirmed', paidDate: date } : { status: 'needs_amount', paidDate: null };
}


export interface FutureInstanceChange {
  mode: 'this_instance' | 'this_and_future';
  instance: ExpenseInstance;
  parentUpdates?: Partial<Expense>;
}

export function isEligibleFutureInstance(instance: ExpenseInstance, today = new Date().toISOString().slice(0, 10)): boolean {
  return instance.incurredDate >= today && instance.status !== 'confirmed';
}
