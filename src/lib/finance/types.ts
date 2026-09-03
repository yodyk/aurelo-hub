/** Shared types for the Income & Expenses workspace. */

export type RecognitionMethod = 'cash' | 'accrual';

export type IncomeSourceType = 'project' | 'retainer' | 'invoice' | 'payment' | 'manual';

/** No 'partially_paid' — Aurelo does not model partial payments today. */
export type IncomeStatus = 'projected' | 'invoiced' | 'paid' | 'needs_review' | 'excluded';

export type SourceState = 'active' | 'archived' | 'missing';

export interface IncomeEntry {
  id: string;
  workspaceId: string;
  sourceType: IncomeSourceType;
  sourceId: string | null;
  sourceKey: string;
  clientId: string | null;
  payerName: string | null;
  description: string | null;
  /** Amount owned by the sync layer. Never overwritten by the user. */
  sourceAmount: number;
  /** User override. Wins over sourceAmount when present. */
  overrideAmount: number | null;
  currency: string;
  status: IncomeStatus;
  /** Date the income was earned / invoiced (accrual basis). */
  earnedDate: string | null;
  /** Date the money was received (cash basis). */
  paidDate: string | null;
  included: boolean;
  sourceState: SourceState;
  /** sourceKey of the canonical entry that supersedes this one. */
  suppressedBy: string | null;
  notes: string | null;
  metadata: Record<string, any>;
}

export type Recurrence = 'one_time' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
export type AmountBehavior = 'fixed' | 'variable' | 'base_plus';
export type Inclusion = 'included' | 'excluded' | 'needs_review';
export type InstanceStatus = 'scheduled' | 'needs_amount' | 'confirmed' | 'ignored';

export interface ExpenseCategory {
  id: string;
  workspaceId: string;
  name: string;
  sortOrder: number;
  isSeed: boolean;
}

export interface Expense {
  id: string;
  workspaceId: string;
  name: string;
  vendor: string | null;
  categoryId: string | null;
  recurrence: Recurrence;
  intervalDays: number | null;
  amountBehavior: AmountBehavior;
  baseAmount: number | null;
  businessUsePct: number;
  inclusion: Inclusion;
  currency: string;
  startDate: string | null;
  endDate: string | null;
  active: boolean;
  notes: string | null;
}

export interface ExpenseAddition {
  id: string;
  workspaceId: string;
  instanceId: string;
  label: string;
  amount: number;
}

export interface ExpenseInstance {
  id: string;
  workspaceId: string;
  expenseId: string;
  occurrenceKey: string;
  incurredDate: string;
  paidDate: string | null;
  status: InstanceStatus;
  baseAmount: number | null;
  /** Per-instance business-use override. Null inherits the expense default. */
  businessUsePct: number | null;
  currency: string;
  notes: string | null;
  generated: boolean;
  additions: ExpenseAddition[];
}

export interface FinanceSettings {
  /** Combined estimated tax rate as a percentage (0–100). Null = not set up. */
  taxRatePct: number | null;
  taxYear: number;
  currency: string;
  method: RecognitionMethod;
  jurisdiction: string | null;
}

export interface Period {
  start: string; // YYYY-MM-DD inclusive
  end: string;   // YYYY-MM-DD inclusive
  label: string;
}

/** How a row lands in the selected period under the active settings. */
export type Bucket = 'actual' | 'planned' | 'needs_review' | 'needs_amount' | 'currency_mismatch' | 'out';
