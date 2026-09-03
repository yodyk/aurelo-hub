/**
 * W-2 Income & Withholding Context.
 *
 * Employment income is *context only*. It never enters Aurelo's business
 * revenue, client, project, utilization or effective-rate analytics, and it is
 * never inserted into the flat-rate business tax-reserve formula.
 *
 * Only two things may reduce the business reserve:
 *   1. Additional withholding the user explicitly designates for freelance /
 *      other non-wage income.
 *   2. Estimated tax payments the user has actually paid.
 * Ordinary paycheck withholding is displayed for reference only.
 */

import { sumCents, toCents } from './money';

export type CompensationMethod = 'annual_salary' | 'per_paycheck';
export type PayFrequency = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly' | 'annual_manual';
export type ProjectionMode = 'schedule' | 'manual';
export type PaycheckStatus = 'projected' | 'confirmed';
export type PaycheckKind = 'regular' | 'bonus' | 'commission' | 'correction' | 'other';
export type TaxPaymentStatus = 'planned' | 'paid';
export type TaxJurisdiction = 'federal' | 'state' | 'local' | 'other';

export interface EmploymentSource {
  id: string;
  workspaceId: string;
  employerName: string;
  compensationMethod: CompensationMethod;
  annualSalary: number | null;
  grossPerPaycheck: number | null;
  payFrequency: PayFrequency;
  anchorPayday: string | null;
  semimonthlyDay1: number | null;
  semimonthlyDay2: number | null;
  monthlyDay: number | null;
  startDate: string | null;
  endDate: string | null;
  currency: string;
  /** Opening cumulative summary cutoff. Generation starts strictly after it. */
  ytdThroughDate: string | null;
  ytdGross: number | null;
  ytdFederalWithheld: number | null;
  ytdStateWithheld: number | null;
  /** Withholding already taken that the user designated for other income. */
  ytdDesignatedFederal: number | null;
  ytdDesignatedState: number | null;
  additionalFederalPerPaycheck: number;
  additionalStatePerPaycheck: number;
  /** True when the per-paycheck additional withholding targets other income. */
  additionalDesignatedForOtherIncome: boolean;
  projectionMode: ProjectionMode;
  manualRemainingDesignated: number | null;
  taxYear: number;
  notes: string | null;
  active: boolean;
}

export interface Paycheck {
  id: string;
  workspaceId: string;
  employmentSourceId: string;
  occurrenceKey: string;
  payDate: string;
  status: PaycheckStatus;
  kind: PaycheckKind;
  grossAmount: number | null;
  federalWithheld: number | null;
  stateWithheld: number | null;
  designatedAdditionalFederal: number;
  designatedAdditionalState: number;
  currency: string;
  generated: boolean;
  notes: string | null;
}

export interface TaxPayment {
  id: string;
  workspaceId: string;
  status: TaxPaymentStatus;
  plannedDate: string | null;
  paidDate: string | null;
  amount: number;
  taxYear: number;
  jurisdiction: TaxJurisdiction;
  periodLabel: string | null;
  reference: string | null;
  currency: string;
  notes: string | null;
}

/* ── date helpers (UTC, ISO YYYY-MM-DD) ───────────────────────────── */

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function lastDayOfMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}
function iso(year: number, month1: number, day: number): string {
  return `${year}-${String(month1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
/** `-1` (or any out-of-range day) means "final day of the month". */
function resolveDay(day: number | null, year: number, month1: number): number {
  const last = lastDayOfMonth(year, month1);
  if (day == null || day < 1 || day > 31) return last;
  return Math.min(day, last);
}

export function periodsPerYear(frequency: PayFrequency): number {
  switch (frequency) {
    case 'weekly': return 52;
    case 'biweekly': return 26;
    case 'semimonthly': return 24;
    case 'monthly': return 12;
    default: return 1;
  }
}

/** Typical gross for one regular paycheck, in cents. */
export function grossPerPaycheckCents(source: EmploymentSource): number {
  if (source.compensationMethod === 'per_paycheck') return toCents(source.grossPerPaycheck);
  const annual = toCents(source.annualSalary);
  const periods = periodsPerYear(source.payFrequency);
  return Math.round(annual / periods);
}

/**
 * Deterministic pay dates inside [rangeStart, rangeEnd].
 * Never emits a date on or before the YTD cutoff (no double counting) and
 * respects employment start/end.
 */
export function payDates(source: EmploymentSource, rangeStart: string, rangeEnd: string): string[] {
  const floors = [rangeStart, source.startDate || '', source.ytdThroughDate ? addDays(source.ytdThroughDate, 1) : ''].filter(Boolean) as string[];
  const start = floors.sort().at(-1)!;
  const ceilings = [rangeEnd, source.endDate || '9999-12-31'];
  const end = ceilings.sort()[0];
  if (start > end) return [];

  const out: string[] = [];
  if (source.payFrequency === 'weekly' || source.payFrequency === 'biweekly') {
    const step = source.payFrequency === 'weekly' ? 7 : 14;
    const anchor = source.anchorPayday || source.startDate;
    if (!anchor) return [];
    // Walk from the anchor to the first payday at/after `start`.
    const anchorMs = Date.parse(`${anchor}T00:00:00Z`);
    const startMs = Date.parse(`${start}T00:00:00Z`);
    const dayMs = 86400000;
    const diff = Math.ceil((startMs - anchorMs) / (step * dayMs));
    let cursor = addDays(anchor, Math.max(0, diff) * step);
    while (cursor < start) cursor = addDays(cursor, step);
    while (cursor <= end) { out.push(cursor); cursor = addDays(cursor, step); }
    return out;
  }
  if (source.payFrequency === 'semimonthly' || source.payFrequency === 'monthly') {
    const startYear = Number(start.slice(0, 4));
    const startMonth = Number(start.slice(5, 7));
    const endYear = Number(end.slice(0, 4));
    const endMonth = Number(end.slice(5, 7));
    for (let y = startYear, m = startMonth; y < endYear || (y === endYear && m <= endMonth); m === 12 ? (m = 1, y += 1) : (m += 1)) {
      const days = source.payFrequency === 'monthly'
        ? [resolveDay(source.monthlyDay, y, m)]
        : [resolveDay(source.semimonthlyDay1 ?? 15, y, m), resolveDay(source.semimonthlyDay2 ?? -1, y, m)];
      for (const day of [...new Set(days)].sort((a, b) => a - b)) {
        const date = iso(y, m, day);
        if (date >= start && date <= end) out.push(date);
      }
    }
    return out.sort();
  }
  return []; // annual_manual — paychecks are entered by hand.
}

export function occurrenceKeyFor(source: EmploymentSource, date: string): string {
  return `${source.payFrequency}:${date}`;
}

/* ── offsets ──────────────────────────────────────────────────────── */

export interface OffsetBreakdown {
  ytdDesignatedCents: number;
  confirmedDesignatedCents: number;
  paidPaymentsCents: number;
  otherAvailableCents: number;
  actualOffsetsCents: number;
  projectedDesignatedCents: number;
  plannedPaymentsCents: number;
  plannedOffsetsCents: number;
}

const inYear = (date: string | null | undefined, year: number) => !!date && Number(date.slice(0, 4)) === year;

export function computeOffsets(args: {
  sources: EmploymentSource[];
  paychecks: Paycheck[];
  payments: TaxPayment[];
  taxYear: number;
  otherWithholdingAvailable: number;
}): OffsetBreakdown {
  const activeYearSources = args.sources.filter((s) => s.taxYear === args.taxYear);
  const byId = new Map(activeYearSources.map((s) => [s.id, s]));

  const ytdDesignatedCents = sumCents(activeYearSources.map((s) => toCents(s.ytdDesignatedFederal) + toCents(s.ytdDesignatedState)));

  const relevant = args.paychecks.filter((p) => {
    const source = byId.get(p.employmentSourceId);
    if (!source || !inYear(p.payDate, args.taxYear)) return false;
    // Never count paychecks inside the YTD-covered window.
    return !source.ytdThroughDate || p.payDate > source.ytdThroughDate;
  });
  const designated = (p: Paycheck) => toCents(p.designatedAdditionalFederal) + toCents(p.designatedAdditionalState);

  const confirmedDesignatedCents = sumCents(relevant.filter((p) => p.status === 'confirmed').map(designated));

  // Schedule projection and manual remaining-year projection are mutually
  // exclusive — a source contributes through exactly one of them.
  const scheduleProjected = sumCents(
    relevant.filter((p) => p.status === 'projected' && byId.get(p.employmentSourceId)?.projectionMode === 'schedule').map(designated),
  );
  const manualProjected = sumCents(
    activeYearSources.filter((s) => s.projectionMode === 'manual').map((s) => toCents(s.manualRemainingDesignated)),
  );
  const projectedDesignatedCents = scheduleProjected + manualProjected;

  const yearPayments = args.payments.filter((p) => p.taxYear === args.taxYear);
  const paidPaymentsCents = sumCents(yearPayments.filter((p) => p.status === 'paid').map((p) => toCents(p.amount)));
  const plannedPaymentsCents = sumCents(yearPayments.filter((p) => p.status === 'planned').map((p) => toCents(p.amount)));
  const otherAvailableCents = toCents(args.otherWithholdingAvailable);

  return {
    ytdDesignatedCents,
    confirmedDesignatedCents,
    paidPaymentsCents,
    otherAvailableCents,
    actualOffsetsCents: ytdDesignatedCents + confirmedDesignatedCents + paidPaymentsCents + otherAvailableCents,
    projectedDesignatedCents,
    plannedPaymentsCents,
    plannedOffsetsCents: projectedDesignatedCents + plannedPaymentsCents,
  };
}

/** Reserve never goes below zero. */
export function remainingReserveCents(reserveBeforeOffsetsCents: number, offsetsCents: number): number {
  return Math.max(0, Math.max(0, reserveBeforeOffsetsCents) - Math.max(0, offsetsCents));
}

/** Employment gross recognized in the year (context only). */
export function employmentGrossCents(sources: EmploymentSource[], paychecks: Paycheck[], taxYear: number, includePlanned: boolean): number {
  const byId = new Map(sources.filter((s) => s.taxYear === taxYear).map((s) => [s.id, s]));
  const ytd = sumCents([...byId.values()].map((s) => toCents(s.ytdGross)));
  const checks = paychecks.filter((p) => {
    const source = byId.get(p.employmentSourceId);
    if (!source || !inYear(p.payDate, taxYear)) return false;
    if (source.ytdThroughDate && p.payDate <= source.ytdThroughDate) return false;
    return includePlanned || p.status === 'confirmed';
  });
  return ytd + sumCents(checks.map((p) => toCents(p.grossAmount)));
}

/** Reference-only ordinary withholding (never an automatic offset). */
export function ordinaryWithholdingCents(sources: EmploymentSource[], paychecks: Paycheck[], taxYear: number, includePlanned: boolean): number {
  const byId = new Map(sources.filter((s) => s.taxYear === taxYear).map((s) => [s.id, s]));
  const ytd = sumCents([...byId.values()].map((s) => toCents(s.ytdFederalWithheld) + toCents(s.ytdStateWithheld)));
  const checks = paychecks.filter((p) => {
    const source = byId.get(p.employmentSourceId);
    if (!source || !inYear(p.payDate, taxYear)) return false;
    if (source.ytdThroughDate && p.payDate <= source.ytdThroughDate) return false;
    return includePlanned || p.status === 'confirmed';
  });
  return ytd + sumCents(checks.map((p) => toCents(p.federalWithheld) + toCents(p.stateWithheld)));
}

/** True when a manually entered paycheck would overlap the YTD summary. */
export function overlapsYtd(source: EmploymentSource, payDate: string): boolean {
  const hasYtd = [source.ytdGross, source.ytdFederalWithheld, source.ytdStateWithheld, source.ytdDesignatedFederal, source.ytdDesignatedState]
    .some((v) => v != null && Number(v) !== 0);
  return !!(hasYtd && source.ytdThroughDate && payDate <= source.ytdThroughDate);
}
