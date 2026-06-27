/**
 * RevenueRecognition verification fixtures.
 *
 * These are runnable scenarios (not framework tests) that exercise every
 * billing model and edge case Phase 1 must handle correctly. Each fixture
 * returns `{ pass, expected, actual, name }`. Run via `runAllRevenueFixtures()`
 * from a dev console or a temporary route — no test runner required.
 *
 * Phase 2 will convert these to real Vitest tests once a runner is added.
 */

import {
  recognizeRevenue,
  recognizeClientRevenue,
  effectiveRate,
  profitability,
  hoursVariance,
  resolveBillingModel,
  type ClientShape,
  type ProjectShape,
  type SessionShape,
  type Period,
} from '../revenue';

interface FixtureResult {
  name: string;
  pass: boolean;
  expected: unknown;
  actual: unknown;
}

const FY_START = new Date(new Date().getFullYear(), 0, 1);
const FY_END = new Date(new Date().getFullYear(), 11, 31);
const period: Period = { start: FY_START, end: FY_END };

function approx(a: number, b: number, eps = 0.01): boolean {
  return Math.abs(a - b) < eps;
}

function fx(name: string, pass: boolean, expected: unknown, actual: unknown): FixtureResult {
  return { name, pass, expected, actual };
}

// ─── 1. Hourly client ──────────────────────────────────────────────

function f1_hourly(): FixtureResult {
  const client: ClientShape = { id: 'c1', billingModel: 'Hourly', rate: 100 };
  const sessions: SessionShape[] = [
    { rawDate: iso(new Date()), duration: 5, billable: true, laborValue: 500 },
    { rawDate: iso(new Date()), duration: 2, billable: false, laborValue: 200 },
    { rawDate: iso(new Date()), duration: 3, billable: true, laborValue: 300 },
  ];
  const r = recognizeRevenue({ client, sessions, period });
  return fx('Hourly — sums billable sessions only', approx(r.amount, 800), 800, r.amount);
}

// ─── 2. Retainer under hours ───────────────────────────────────────

function f2_retainer_under(): FixtureResult {
  const client: ClientShape = {
    id: 'c2',
    billingModel: 'Retainer',
    monthlyContractValue: 800,
    retainerCycleStart: iso(new Date(new Date().getFullYear(), 0, 1)),
    retainerCycleDays: 30,
  };
  const r = recognizeRevenue({ client, sessions: [], period });
  // 12 cycles of 30 days fit in ~360 days; expected ≥ 12 × 800
  const cycles = Math.floor(365 / 30);
  const expected = 800 * cycles;
  return fx(
    `Retainer under hours — revenue = monthly × cycles (${cycles})`,
    approx(r.amount, expected),
    expected,
    r.amount,
  );
}

// ─── 3. Retainer over hours (14.2h on $800/10h) ────────────────────

function f3_retainer_over(): FixtureResult {
  const client: ClientShape = {
    id: 'c3',
    billingModel: 'Retainer',
    rate: 80,
    monthlyContractValue: 800,
    retainerCycleStart: iso(new Date()),
    retainerCycleDays: 30,
  };
  // Period of just this cycle
  const start = new Date();
  const end = new Date(start.getTime() + 29 * 86_400_000);
  const r = recognizeRevenue({
    client,
    sessions: [{ duration: 14.2, billable: true, rawDate: iso(start) }],
    period: { start, end },
  });
  const eff = effectiveRate(r.amount, 14.2);
  const passRevenue = approx(r.amount, 800);
  const passRate = eff != null && approx(eff, 56.34);
  return fx(
    'Retainer over hours — revenue stays $800, effective rate $56.34/hr',
    passRevenue && passRate,
    { revenue: 800, effectiveRate: 56.34 },
    { revenue: r.amount, effectiveRate: eff },
  );
}

// ─── 4. Fixed Fee — completed UNDER estimate ───────────────────────

function f4_fixed_under(): FixtureResult {
  const client: ClientShape = { id: 'c4', billingModel: 'Hourly', rate: 100 };
  const project: ProjectShape = {
    id: 'p4',
    clientId: 'c4',
    billingModel: 'FixedFee',
    contractValue: 10_000,
    estimatedHours: 100,
    status: 'Complete',
    completedAt: iso(new Date()),
  };
  const r = recognizeRevenue({ project, client, sessions: [], period });
  const eff = effectiveRate(r.amount, 90);
  const variance = hoursVariance(90, 100);
  const passRev = approx(r.amount, 10_000);
  const passRate = eff != null && approx(eff, 111.11);
  const passVar = approx(variance.delta, -10) && variance.tone === 'under';
  return fx(
    'FixedFee under estimate — $10k / $111.11 per hour / −10h',
    passRev && passRate && passVar,
    { revenue: 10_000, rate: 111.11, varianceDelta: -10, varianceTone: 'under' },
    { revenue: r.amount, rate: eff, varianceDelta: variance.delta, varianceTone: variance.tone },
  );
}

// ─── 5. Fixed Fee — completed OVER estimate ────────────────────────

function f5_fixed_over(): FixtureResult {
  const client: ClientShape = { id: 'c5', billingModel: 'Hourly', rate: 100 };
  const project: ProjectShape = {
    id: 'p5',
    clientId: 'c5',
    billingModel: 'FixedFee',
    contractValue: 10_000,
    estimatedHours: 100,
    status: 'Complete',
    completedAt: iso(new Date()),
  };
  const r = recognizeRevenue({ project, client, sessions: [], period });
  const eff = effectiveRate(r.amount, 125);
  const variance = hoursVariance(125, 100);
  const prof = profitability({
    revenue: r.amount,
    laborValue: 12_500, // 125h × $100 nominal labor
    hours: 125,
    estimatedHours: 100,
    nominalRate: 100,
  });
  const passRev = approx(r.amount, 10_000);
  const passRate = eff != null && approx(eff, 80);
  const passVar = approx(variance.delta, 25) && variance.tone === 'over';
  const passTone = prof.tone === 'unprofitable' || prof.tone === 'attention';
  return fx(
    'FixedFee over estimate — $10k / $80 per hour / +25h / attention',
    passRev && passRate && passVar && passTone,
    { revenue: 10_000, rate: 80, varianceDelta: 25, tone: 'attention' },
    { revenue: r.amount, rate: eff, varianceDelta: variance.delta, tone: prof.tone },
  );
}

// ─── 6. Mixed client (retainer + fixed + hourly) ───────────────────

function f6_mixed(): FixtureResult {
  const client: ClientShape = {
    id: 'c6',
    billingModel: 'Retainer',
    rate: 100,
    monthlyContractValue: 800,
    retainerCycleStart: iso(FY_START),
    retainerCycleDays: 30,
  };
  const retainerProj: ProjectShape = {
    id: 'p6r', clientId: 'c6', billingModel: 'Retainer',
  };
  const fixedProj: ProjectShape = {
    id: 'p6f', clientId: 'c6', billingModel: 'FixedFee',
    contractValue: 5_000, completedAt: iso(new Date()), status: 'Complete',
  };
  const hourlyProj: ProjectShape = {
    id: 'p6h', clientId: 'c6', billingModel: 'Hourly',
  };
  const sessions: SessionShape[] = [
    { projectId: 'p6r', duration: 8, billable: true, laborValue: 800, rawDate: iso(new Date()) },
    { projectId: 'p6h', duration: 4, billable: true, laborValue: 400, rawDate: iso(new Date()) },
  ];
  const total = recognizeClientRevenue(client, [retainerProj, fixedProj, hourlyProj], sessions, period);
  // Retainer cycles × $800 + $5,000 + $400 hourly
  const cycles = Math.floor(365 / 30);
  const expected = 800 * cycles + 5_000 + 400;
  return fx(
    'Mixed client — retainer + fixed-fee + hourly resolved independently',
    approx(total, expected, 1),
    expected,
    total,
  );
}

// ─── 7. Zero-hour project ──────────────────────────────────────────

function f7_zero_hours(): FixtureResult {
  const eff = effectiveRate(10_000, 0);
  const prof = profitability({ revenue: 0, laborValue: 0, hours: 0, estimatedHours: 0 });
  const pass = eff === null && prof.tone === 'on_track' && prof.marginPct === null;
  return fx(
    'Zero-hour project — no division by zero, neutral tone',
    pass,
    { effectiveRate: null, tone: 'on_track', marginPct: null },
    { effectiveRate: eff, tone: prof.tone, marginPct: prof.marginPct },
  );
}

// ─── 8. Archived projects ──────────────────────────────────────────

function f8_archived(): FixtureResult {
  const client: ClientShape = { id: 'c8', billingModel: 'Hourly', rate: 100 };
  // Archived but completed-in-period → still recognized for lifetime totals
  const project: ProjectShape = {
    id: 'p8', clientId: 'c8',
    billingModel: 'FixedFee', contractValue: 3_000,
    status: 'Archived', completedAt: iso(new Date()),
  };
  const r = recognizeRevenue({ project, client, sessions: [], period });
  return fx(
    'Archived FixedFee project — completed_at drives recognition, status does not',
    approx(r.amount, 3_000),
    3_000,
    r.amount,
  );
}

// ─── 9. Carryover retainer hours ───────────────────────────────────

function f9_carryover(): FixtureResult {
  // Carryover hours influence the burndown bar, not recognized revenue.
  const client: ClientShape = {
    id: 'c9',
    billingModel: 'Retainer',
    monthlyContractValue: 1_000,
    retainerCycleStart: iso(new Date()),
    retainerCycleDays: 30,
  };
  const start = new Date();
  const end = new Date(start.getTime() + 29 * 86_400_000);
  const r = recognizeRevenue({ client, sessions: [], period: { start, end } });
  return fx(
    'Carryover hours — recognized revenue equals monthly contract value, independent of carryover',
    approx(r.amount, 1_000),
    1_000,
    r.amount,
  );
}

// ─── 10. Resolver — project overrides client ───────────────────────

function f10_resolver(): FixtureResult {
  const m = resolveBillingModel(
    { billingModel: 'FixedFee' },
    { billingModel: 'Hourly' },
  );
  return fx(
    'Resolver — project billing model overrides client default',
    m === 'FixedFee',
    'FixedFee',
    m,
  );
}

// ─── Runner ────────────────────────────────────────────────────────

export function runAllRevenueFixtures(): {
  results: FixtureResult[];
  passed: number;
  failed: number;
} {
  const results = [
    f1_hourly(),
    f2_retainer_under(),
    f3_retainer_over(),
    f4_fixed_under(),
    f5_fixed_over(),
    f6_mixed(),
    f7_zero_hours(),
    f8_archived(),
    f9_carryover(),
    f10_resolver(),
  ];
  return {
    results,
    passed: results.filter((r) => r.pass).length,
    failed: results.filter((r) => !r.pass).length,
  };
}

function iso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
