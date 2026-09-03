/**
 * Recognition — decides whether an income entry or expense instance counts in
 * the selected period, and under which bucket (actual vs planned).
 *
 * Cash basis   → income counts on its paid date, expenses on their paid date.
 * Accrual basis→ income counts on its earned/invoiced date, expenses on their
 *                incurred date.
 *
 * When the date required by the active method is unavailable, the row is
 * surfaced as `needs_review` rather than guessed into a bucket.
 */
import { toCents, pctOfCents, sumCents } from './money';
import type {
  Bucket, Expense, ExpenseInstance, IncomeEntry, Period, RecognitionMethod,
} from './types';

export function inPeriod(date: string | null | undefined, period: Period): boolean {
  if (!date) return false;
  return date >= period.start && date <= period.end;
}

/** The date shown in the table's date column for the active method. */
export function incomeRecognitionDate(entry: IncomeEntry, method: RecognitionMethod): string | null {
  return method === 'cash' ? entry.paidDate : entry.earnedDate;
}

export function instanceRecognitionDate(inst: ExpenseInstance, method: RecognitionMethod): string | null {
  return method === 'cash' ? inst.paidDate : inst.incurredDate;
}

/** Effective income amount in cents — override wins over the synced amount. */
export function effectiveIncomeCents(entry: IncomeEntry): number {
  return toCents(entry.overrideAmount != null ? entry.overrideAmount : entry.sourceAmount);
}

export function hasOverride(entry: IncomeEntry): boolean {
  return entry.overrideAmount != null;
}

export interface ClassifyOpts {
  method: RecognitionMethod;
  period: Period;
  /** Workspace base currency. Rows in other currencies are not summed. */
  currency: string;
  includePlanned: boolean;
}

/**
 * Classify an income entry for the selected period.
 * `out` means the row contributes nothing (and is normally hidden from totals).
 */
export function classifyIncome(entry: IncomeEntry, opts: ClassifyOpts): Bucket {
  const { method, period, currency } = opts;
  if (!entry.included || entry.status === 'excluded') return 'out';
  if (entry.suppressedBy) return 'out';

  const actualDate = method === 'cash' ? entry.paidDate : entry.earnedDate;
  // Planned values retain the method's usable source date, but never turn a
  // missing required cash/accrual date into a recognized actual.
  const plannedDate = entry.earnedDate ?? entry.paidDate;

  const isActual = method === 'cash'
    ? entry.status === 'paid' && !!entry.paidDate
    : (entry.status === 'paid' || entry.status === 'invoiced') && !!entry.earnedDate;

  // A row with no usable date at all under either method needs a human.
  if (!actualDate && !plannedDate) {
    return 'needs_review';
  }
  if (!actualDate && method === 'cash' && entry.status === 'paid') {
    return inPeriod(plannedDate, period) ? 'needs_review' : 'out';
  }

  if (isActual) {
    if (!inPeriod(actualDate, period)) return 'out';
    if ((entry.currency || currency) !== currency) return 'currency_mismatch';
    return 'actual';
  }

  // Not actual yet → planned, if a usable date lands in the period.
  if (entry.status === 'needs_review') {
    return inPeriod(plannedDate, period) ? 'needs_review' : 'out';
  }
  if (!inPeriod(plannedDate, period)) return 'out';
  if ((entry.currency || currency) !== currency) return 'currency_mismatch';
  return 'planned';
}

/** Instance total in cents = base + additions. */
export function instanceTotalCents(inst: ExpenseInstance): number {
  const base = toCents(inst.baseAmount);
  const adds = sumCents((inst.additions || []).map((a) => toCents(a.amount)));
  return base + adds;
}

/** Effective business-use percentage for an instance (override → expense default). */
export function instanceBusinessUsePct(inst: ExpenseInstance, expense: Expense): number {
  return inst.businessUsePct != null ? Number(inst.businessUsePct) : Number(expense.businessUsePct ?? 100);
}

export function instanceBusinessUseCents(inst: ExpenseInstance, expense: Expense): number {
  return pctOfCents(instanceTotalCents(inst), instanceBusinessUsePct(inst, expense));
}

export function classifyInstance(
  inst: ExpenseInstance,
  expense: Expense,
  opts: ClassifyOpts,
): Bucket {
  const { method, period, currency } = opts;
  if (inst.status === 'ignored') return 'out';
  // Needs-review / excluded expenses never influence the estimate.
  if (expense.inclusion === 'excluded') return 'out';

  const actualDate = method === 'cash' ? inst.paidDate : inst.incurredDate;
  const plannedDate = inst.incurredDate;

  if (inst.status === 'confirmed') {
    if (method === 'cash' && !inst.paidDate) {
      return inPeriod(plannedDate, period) ? 'needs_review' : 'out';
    }
    if (!inPeriod(actualDate, period)) return 'out';
    if ((inst.currency || currency) !== currency) return 'currency_mismatch';
    if (expense.inclusion === 'needs_review') return 'needs_review';
    return 'actual';
  }

  if (!inPeriod(plannedDate, period)) return 'out';
  if ((inst.currency || currency) !== currency) return 'currency_mismatch';
  if (inst.status === 'needs_amount' || (expense.amountBehavior === 'variable' && inst.baseAmount == null)) {
    return 'needs_amount';
  }
  if (expense.inclusion === 'needs_review') return 'needs_review';
  return 'planned';
}
