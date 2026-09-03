import { calculateTotals } from '../finance/formulas';
import { pctOfCents, sumCents, toCents } from '../finance/money';
import { classifyIncome } from '../finance/recognition';
import { occurrenceDates } from '../finance/recurrence';
import type { Expense, ExpenseInstance, IncomeEntry, Period } from '../finance/types';

export interface FinanceFixtureResult { name: string; pass: boolean; expected: unknown; actual: unknown; }
const period: Period = { start: '2026-01-01', end: '2026-12-31', label: 'This Year' };
const expense: Expense = { id: 'e1', workspaceId: 'w', name: 'Software', vendor: null, categoryId: null, recurrence: 'monthly', intervalDays: null, amountBehavior: 'base_plus', baseAmount: 50, businessUsePct: 100, inclusion: 'included', currency: 'USD', startDate: '2026-01-01', endDate: null, active: true, notes: null };
const instance = (date: string, amount: number, pct: number | null = null): ExpenseInstance => ({ id: date, workspaceId: 'w', expenseId: 'e1', occurrenceKey: `e1:${date}`, incurredDate: date, paidDate: date, status: 'confirmed', baseAmount: amount, businessUsePct: pct, currency: 'USD', notes: null, generated: true, additions: [] });
const income: IncomeEntry = { id: 'i1', workspaceId: 'w', sourceType: 'invoice', sourceId: 'inv', sourceKey: 'invoice:inv', clientId: null, payerName: 'Client', description: null, sourceAmount: 100.1, overrideAmount: null, currency: 'USD', status: 'paid', earnedDate: '2026-01-01', paidDate: '2026-02-01', included: true, sourceState: 'active', suppressedBy: null, notes: null, metadata: {} };

export function runFinanceFixtures(): FinanceFixtureResult[] {
  const cash = classifyIncome(income, { method: 'cash', period, currency: 'USD', includePlanned: false });
  const accrual = classifyIncome(income, { method: 'accrual', period, currency: 'USD', includePlanned: false });
  const totals = calculateTotals({ income: [income], incomeBuckets: new Map([['i1', 'actual']]), expenses: [{ expense, instance: instance('2026-01-01', 29, 60), bucket: 'actual' }], taxRatePct: 25 });
  const dates = occurrenceDates(expense, period.start, '2026-03-31');
  return [
    { name: 'cash and accrual use separate dates', pass: cash === 'actual' && accrual === 'actual', expected: ['actual', 'actual'], actual: [cash, accrual] },
    { name: 'cent-safe many-entry totals', pass: sumCents([toCents('0.10'), toCents('0.20')]) === 30, expected: 30, actual: sumCents([toCents('0.10'), toCents('0.20')]) },
    { name: 'business use and tax formulas', pass: totals.businessUseExpensesCents === 1740 && totals.taxReserveCents === 2068, expected: [1740, 2068], actual: [totals.businessUseExpensesCents, totals.taxReserveCents] },
    { name: 'monthly recurrence is deterministic', pass: dates.join(',') === '2026-01-01,2026-02-01,2026-03-01', expected: 3, actual: dates.length },
    { name: 'percentage rounding is safe', pass: pctOfCents(10001, 33.33) === 3333, expected: 3333, actual: pctOfCents(10001, 33.33) },
  ];
}
