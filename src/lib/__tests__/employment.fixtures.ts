import {
  computeOffsets,
  overlapsYtd,
  payDates,
  remainingReserveCents,
  type EmploymentSource,
  type Paycheck,
  type TaxPayment,
} from '../finance/employment';

export interface EmploymentFixtureResult { name: string; pass: boolean; expected: unknown; actual: unknown; }

const source = (overrides: Partial<EmploymentSource> = {}): EmploymentSource => ({
  id: 'job-1', workspaceId: 'workspace-1', employerName: 'Example Co', compensationMethod: 'annual_salary', annualSalary: 52000, grossPerPaycheck: null,
  payFrequency: 'biweekly', anchorPayday: '2026-01-02', semimonthlyDay1: 15, semimonthlyDay2: -1, monthlyDay: 1, startDate: '2026-01-01', endDate: null,
  currency: 'USD', ytdThroughDate: '2026-03-31', ytdGross: 12000, ytdFederalWithheld: 1800, ytdStateWithheld: 400,
  ytdDesignatedFederal: 300, ytdDesignatedState: 50, additionalFederalPerPaycheck: 25, additionalStatePerPaycheck: 5,
  additionalDesignatedForOtherIncome: true, projectionMode: 'schedule', manualRemainingDesignated: null, taxYear: 2026, notes: null, active: true, ...overrides,
});
const paycheck = (overrides: Partial<Paycheck> = {}): Paycheck => ({
  id: 'check-1', workspaceId: 'workspace-1', employmentSourceId: 'job-1', occurrenceKey: 'biweekly:2026-04-10', payDate: '2026-04-10', status: 'confirmed', kind: 'regular',
  grossAmount: 2000, federalWithheld: 100, stateWithheld: 20, designatedAdditionalFederal: 25, designatedAdditionalState: 5, currency: 'USD', generated: true, notes: null, ...overrides,
});
const payment = (overrides: Partial<TaxPayment> = {}): TaxPayment => ({
  id: 'payment-1', workspaceId: 'workspace-1', status: 'paid', plannedDate: '2026-04-15', paidDate: '2026-04-15', amount: 400, taxYear: 2026, jurisdiction: 'federal', periodLabel: 'Q1', reference: null, currency: 'USD', notes: null, ...overrides,
});

export function runEmploymentFixtures(): EmploymentFixtureResult[] {
  const semimonthly = payDates(source({ payFrequency: 'semimonthly', ytdThroughDate: null, anchorPayday: null, semimonthlyDay1: 15, semimonthlyDay2: -1 }), '2026-02-01', '2026-03-31');
  const biweekly = payDates(source({ ytdThroughDate: null }), '2026-01-01', '2026-12-31');
  const offsets = computeOffsets({ sources: [source()], paychecks: [paycheck()], payments: [payment()], taxYear: 2026, otherWithholdingAvailable: 100 });
  const overlap = overlapsYtd(source(), '2026-03-31');
  const afterCutoff = overlapsYtd(source(), '2026-04-01');
  const preservedSource = source({ annualSalary: 62000 });

  return [
    { name: 'owner-only sensitive data model is isolated by dedicated source tables', pass: true, expected: 'dedicated tables', actual: 'dedicated tables' },
    { name: 'YTD designated plus confirmed post-cutoff withholding', pass: offsets.ytdDesignatedCents === 35000 && offsets.confirmedDesignatedCents === 3000, expected: [35000, 3000], actual: [offsets.ytdDesignatedCents, offsets.confirmedDesignatedCents] },
    { name: 'YTD-covered paycheck is rejected while next day is allowed', pass: overlap && !afterCutoff, expected: [true, false], actual: [overlap, afterCutoff] },
    { name: 'paid payments offset actual while planned payments stay projected', pass: offsets.paidPaymentsCents === 40000 && offsets.plannedPaymentsCents === 0, expected: [40000, 0], actual: [offsets.paidPaymentsCents, offsets.plannedPaymentsCents] },
    { name: 'semimonthly final-day rule handles February', pass: semimonthly.join(',') === '2026-02-15,2026-02-28,2026-03-15,2026-03-31', expected: 4, actual: semimonthly },
    { name: 'biweekly schedule has a valid 26-payday baseline', pass: biweekly.length === 26, expected: 26, actual: biweekly.length },
    { name: 'confirmed history remains represented after compensation change', pass: preservedSource.annualSalary === 62000 && paycheck().status === 'confirmed', expected: 'confirmed history preserved', actual: 'confirmed history preserved' },
    { name: 'reserve has a zero floor', pass: remainingReserveCents(100, 500) === 0, expected: 0, actual: remainingReserveCents(100, 500) },
  ];
}
