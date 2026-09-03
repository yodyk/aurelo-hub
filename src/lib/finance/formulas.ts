import { fromCents, pctOfCents, sumCents, toCents } from './money';
import { effectiveIncomeCents, instanceBusinessUseCents, instanceTotalCents } from './recognition';
import type { Expense, ExpenseInstance, IncomeEntry } from './types';

export interface FinanceTotals {
  incomeCents: number;
  projectedIncomeCents: number;
  grossExpensesCents: number;
  businessUseExpensesCents: number;
  taxReserveCents: number;
  availableCents: number;
  reserveReductionCents: number;
}

export function calculateTotals(args: {
  income: IncomeEntry[];
  incomeBuckets: Map<string, 'actual' | 'planned'>;
  expenses: Array<{ expense: Expense; instance: ExpenseInstance; bucket: 'actual' | 'planned' }>;
  taxRatePct: number | null;
}): FinanceTotals {
  const actualIncome = args.income.filter((e) => args.incomeBuckets.get(e.id) === 'actual');
  const plannedIncome = args.income.filter((e) => args.incomeBuckets.get(e.id) === 'planned');
  const actualExpenses = args.expenses.filter((x) => x.bucket === 'actual');
  const incomeCents = sumCents(actualIncome.map(effectiveIncomeCents));
  const projectedIncomeCents = sumCents(plannedIncome.map(effectiveIncomeCents));
  const grossExpensesCents = sumCents(actualExpenses.map((x) => instanceTotalCents(x.instance)));
  const businessUseExpensesCents = sumCents(actualExpenses.map((x) => instanceBusinessUseCents(x.instance, x.expense)));
  const profitCents = incomeCents - businessUseExpensesCents;
  const taxReserveCents = args.taxRatePct == null ? 0 : Math.max(0, pctOfCents(profitCents, args.taxRatePct));
  const reserveReductionCents = args.taxRatePct == null ? 0 : Math.max(0, pctOfCents(businessUseExpensesCents, args.taxRatePct));
  return {
    incomeCents,
    projectedIncomeCents,
    grossExpensesCents,
    businessUseExpensesCents,
    taxReserveCents,
    availableCents: incomeCents - grossExpensesCents - taxReserveCents,
    reserveReductionCents,
  };
}

export function incomeTaxReserveCents(entry: IncomeEntry, taxRatePct: number | null): number | null {
  return taxRatePct == null ? null : pctOfCents(effectiveIncomeCents(entry), taxRatePct);
}

export function expenseReserveReductionCents(expense: Expense, instances: ExpenseInstance[], taxRatePct: number | null): number | null {
  if (taxRatePct == null) return null;
  const businessUse = sumCents(instances.map((i) => instanceBusinessUseCents(i, expense)));
  return Math.max(0, pctOfCents(businessUse, taxRatePct));
}

export function money(cents: number): number {
  return fromCents(toCents(fromCents(cents)));
}
