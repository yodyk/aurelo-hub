import { calculateTotals } from '../finance/formulas';
import { pctOfCents, sumCents, toCents } from '../finance/money';
import { classifyIncome, classifyInstance } from '../finance/recognition';
import { generatedInstanceStatus, occurrenceDates } from '../finance/recurrence';
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
  const needsCashDate: IncomeEntry = { ...income, paidDate: null, status: 'paid' };
  const archived: IncomeEntry = { ...income, sourceState: 'archived' };

  // Regression fixture: a Jan 15–Dec 15 subscription includes both boundaries,
  // creates exactly one row per month, and maps past/future rows to the right tabs.
  const subscription: Expense = { ...expense, id: 'subscription', name: 'Monthly subscription', amountBehavior: 'fixed', baseAmount: 29, startDate: '2026-01-15', endDate: '2026-12-15' };
  const subscriptionDates = occurrenceDates(subscription, '2026-01-01', '2026-12-31');
  const pastSubscription: ExpenseInstance = { ...instance('2026-08-15', 29), expenseId: 'subscription', occurrenceKey: 'subscription:2026-08-15' };
  const futureSubscription: ExpenseInstance = { ...pastSubscription, id: '2026-09-15', incurredDate: '2026-09-15', paidDate: null, status: 'scheduled', occurrenceKey: 'subscription:2026-09-15' };
  const lastSubscription: ExpenseInstance = { ...pastSubscription, id: '2026-12-15', incurredDate: '2026-12-15', occurrenceKey: 'subscription:2026-12-15' };
  const outsideSubscription: ExpenseInstance = { ...pastSubscription, id: '2027-01-15', incurredDate: '2027-01-15', occurrenceKey: 'subscription:2027-01-15' };
  const actualPeriod: Period = { start: '2026-01-01', end: '2026-08-31', label: 'Past months' };
  const plannedPeriod: Period = { start: '2026-09-01', end: '2026-12-31', label: 'Future months' };
  const actualOpts = { method: 'accrual' as const, period: actualPeriod, currency: 'USD', includePlanned: false };
  const plannedOpts = { method: 'accrual' as const, period: plannedPeriod, currency: 'USD', includePlanned: true };
  const generatedPast = generatedInstanceStatus(subscription, '2026-08-15', '2026-09-03');
  const generatedFuture = generatedInstanceStatus(subscription, '2026-09-15', '2026-09-03');

  return [
    { name: 'cash and accrual use separate dates', pass: cash === 'actual' && accrual === 'actual', expected: ['actual', 'actual'], actual: [cash, accrual] },
    { name: 'missing cash date needs review', pass: classifyIncome(needsCashDate, { method: 'cash', period, currency: 'USD', includePlanned: false }) === 'needs_review', expected: 'needs_review', actual: classifyIncome(needsCashDate, { method: 'cash', period, currency: 'USD', includePlanned: false }) },
    { name: 'archived source is excluded', pass: classifyIncome(archived, { method: 'accrual', period, currency: 'USD', includePlanned: false }) === 'out', expected: 'out', actual: classifyIncome(archived, { method: 'accrual', period, currency: 'USD', includePlanned: false }) },
    { name: 'cent-safe many-entry totals', pass: sumCents([toCents('0.10'), toCents('0.20')]) === 30, expected: 30, actual: sumCents([toCents('0.10'), toCents('0.20')]) },
    { name: 'business use and tax formulas', pass: totals.businessUseExpensesCents === 1740 && totals.taxReserveCents === 2068, expected: [1740, 2068], actual: [totals.businessUseExpensesCents, totals.taxReserveCents] },
    { name: 'monthly recurrence is deterministic', pass: dates.join(',') === '2026-01-01,2026-02-01,2026-03-01', expected: 3, actual: dates.length },
    { name: 'percentage rounding is safe', pass: pctOfCents(10001, 33.33) === 3333, expected: 3333, actual: pctOfCents(10001, 33.33) },
    { name: 'monthly subscription includes start and end boundaries', pass: subscriptionDates.length === 12 && subscriptionDates[0] === '2026-01-15' && subscriptionDates[11] === '2026-12-15', expected: { count: 12, first: '2026-01-15', last: '2026-12-15' }, actual: { count: subscriptionDates.length, first: subscriptionDates[0], last: subscriptionDates[subscriptionDates.length - 1] } },
    { name: 'monthly subscription generates one occurrence per month', pass: new Set(subscriptionDates).size === 12, expected: 12, actual: new Set(subscriptionDates).size },
    { name: 'past subscription occurrence lands in Actual', pass: classifyInstance(pastSubscription, subscription, actualOpts) === 'actual' && classifyInstance(pastSubscription, subscription, plannedOpts) === 'out', expected: ['actual', 'out'], actual: [classifyInstance(pastSubscription, subscription, actualOpts), classifyInstance(pastSubscription, subscription, plannedOpts)] },
    { name: 'future subscription occurrence lands in Planned', pass: classifyInstance(futureSubscription, subscription, actualOpts) === 'out' && classifyInstance(futureSubscription, subscription, plannedOpts) === 'planned', expected: ['out', 'planned'], actual: [classifyInstance(futureSubscription, subscription, actualOpts), classifyInstance(futureSubscription, subscription, plannedOpts)] },
    { name: 'subscription end boundary remains in Planned', pass: classifyInstance(lastSubscription, subscription, plannedOpts) === 'planned', expected: 'planned', actual: classifyInstance(lastSubscription, subscription, plannedOpts) },
    { name: 'occurrence outside end boundary is excluded', pass: classifyInstance(outsideSubscription, subscription, plannedOpts) === 'out', expected: 'out', actual: classifyInstance(outsideSubscription, subscription, plannedOpts) },
    { name: 'generated status distinguishes past and future', pass: generatedPast.status === 'confirmed' && generatedPast.paidDate === '2026-08-15' && generatedFuture.status === 'scheduled' && generatedFuture.paidDate === null, expected: ['confirmed', 'scheduled'], actual: [generatedPast, generatedFuture] },
  ];
}
