/**
 * RevenueRecognition — Aurelo's single financial source of truth.
 *
 * STATELESS. PURE. NO SIDE EFFECTS.
 *   - Never writes to the database.
 *   - Never calls Supabase, fetch, localStorage, or anything async.
 *   - Always returns a number plus a reason code; never throws on missing inputs.
 *
 * Every dashboard, KPI, card, insight, and report should ask this module:
 *   "What is the recognized revenue for this entity during this period?"
 *
 * Phase 1 ships Hourly / Retainer / FixedFee. Milestone and Subscription are
 * reserved enum slots that resolve to 0 with reason `unknown_model` until
 * implemented.
 *
 * Architectural note — billing model belongs to the engagement. Today the
 * "engagement" is approximated by the project. The {@link resolveBillingModel}
 * function is the single resolver: project overrides client. When a true
 * Engagement entity is introduced later, only this function changes.
 *
 * Vocabulary discipline — internally we use `laborValue` (the monetary value
 * of time invested). This term must NEVER appear in user-facing copy. Users
 * see Hours, Effective Rate, Profitability, Margin, and Variance.
 */

// ─── Types ─────────────────────────────────────────────────────────

export type BillingModel =
  | 'Hourly'
  | 'Retainer'
  | 'FixedFee'
  | 'Milestone'
  | 'Subscription';

export type RevenueReason =
  | 'ok'
  | 'no_period'
  | 'no_contract'
  | 'not_completed'
  | 'no_sessions'
  | 'unknown_model';

export interface Period {
  start: Date;
  end: Date;
}

export interface ClientShape {
  id?: string;
  billingModel?: BillingModel | string | null;
  /** Legacy field — `model` is read as a fallback for `billingModel`. */
  model?: string | null;
  rate?: number | null;
  monthlyContractValue?: number | null;
  retainerCycleStart?: string | null;
  retainerCycleDays?: number | null;
  status?: string | null;
}

export interface ProjectShape {
  id?: string;
  clientId?: string;
  billingModel?: BillingModel | string | null;
  contractValue?: number | null;
  /** Legacy field — `totalValue` is read as a fallback for `contractValue`. */
  totalValue?: number | null;
  estimatedHours?: number | null;
  status?: string | null;
  /** ISO date string (YYYY-MM-DD) set when the project transitions to Complete. */
  completedAt?: string | null;
}

export interface SessionShape {
  id?: string;
  clientId?: string;
  projectId?: string | null;
  duration?: number | null;
  billable?: boolean | null;
  /** Internal — monetary value of labor invested. Never shown as "revenue" in UI. */
  laborValue?: number | null;
  /** Legacy mirror of `laborValue`. Phase 2 drops this. */
  revenue?: number | null;
  rawDate?: string | null;
  date?: string | null;
}

export interface RevenueResult {
  amount: number;
  reason: RevenueReason;
  model: BillingModel;
}

export type ProfitabilityTone =
  | 'excellent'
  | 'on_track'
  | 'attention'
  | 'unprofitable';

export interface ProfitabilityDriver {
  kind: 'hours_variance' | 'effective_rate' | 'margin';
  label: string;
  value: number;
}

export interface ProfitabilityResult {
  marginAbs: number;
  marginPct: number | null;
  tone: ProfitabilityTone;
  drivers: ProfitabilityDriver[];
}

export interface HoursVarianceResult {
  delta: number;
  pct: number | null;
  tone: 'under' | 'on_target' | 'over';
}

// ─── Resolvers ─────────────────────────────────────────────────────

/**
 * Single source of truth for billing-model resolution.
 *
 * Project overrides client. If neither is set, defaults to `Hourly`.
 * When a true Engagement entity is introduced later, ONLY this function
 * needs to change — every consumer continues to work.
 */
export function resolveBillingModel(
  project?: ProjectShape | null,
  client?: ClientShape | null,
): BillingModel {
  const fromProject = normalizeModel(project?.billingModel);
  if (fromProject) return fromProject;
  const fromClient =
    normalizeModel(client?.billingModel) ?? normalizeLegacyClientModel(client?.model);
  return fromClient ?? 'Hourly';
}

function normalizeModel(value: unknown): BillingModel | null {
  if (typeof value !== 'string') return null;
  const v = value as BillingModel;
  if (
    v === 'Hourly' ||
    v === 'Retainer' ||
    v === 'FixedFee' ||
    v === 'Milestone' ||
    v === 'Subscription'
  ) {
    return v;
  }
  return null;
}

function normalizeLegacyClientModel(value?: string | null): BillingModel | null {
  if (!value) return null;
  if (value === 'Hourly') return 'Hourly';
  if (value === 'Retainer') return 'Retainer';
  if (value === 'Project') return 'FixedFee';
  return null;
}

// ─── Period helpers ────────────────────────────────────────────────

function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function inPeriod(dateStr: string | null | undefined, period: Period): boolean {
  if (!dateStr) return false;
  const d = parseLocalDate(dateStr).getTime();
  return d >= period.start.getTime() && d <= period.end.getTime();
}

/**
 * Count the number of retainer cycles that *end* within `period`.
 * A cycle ends every `retainerCycleDays` starting from `retainerCycleStart`.
 * If no cycle start is recorded, falls back to counting calendar months.
 */
export function cyclesEndingIn(client: ClientShape, period: Period): number {
  const days = Number(client.retainerCycleDays ?? 30);
  if (!client.retainerCycleStart) {
    return calendarMonthsIn(period);
  }
  const start = parseLocalDate(client.retainerCycleStart).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const cycleMs = Math.max(1, days) * dayMs;
  if (!Number.isFinite(start) || cycleMs <= 0) return 0;
  let count = 0;
  // The first cycle ends at start + cycleMs - 1 day. Walk forward.
  let cycleEnd = start + cycleMs - dayMs;
  // Hard cap to avoid runaway loops on absurd inputs.
  for (let i = 0; i < 1200; i++) {
    if (cycleEnd > period.end.getTime()) break;
    if (cycleEnd >= period.start.getTime()) count++;
    cycleEnd += cycleMs;
  }
  return count;
}

function calendarMonthsIn(period: Period): number {
  const y1 = period.start.getFullYear();
  const m1 = period.start.getMonth();
  const y2 = period.end.getFullYear();
  const m2 = period.end.getMonth();
  return Math.max(0, (y2 - y1) * 12 + (m2 - m1) + 1);
}

// ─── Core recognition ──────────────────────────────────────────────

export interface RecognizeArgs {
  /** The entity producing the revenue. For Hourly/Retainer the engagement is the client; for FixedFee it's a project. */
  project?: ProjectShape | null;
  client: ClientShape;
  /** All sessions relevant to the entity (caller filters by client/project). */
  sessions?: SessionShape[];
  period: Period;
}

/**
 * Single revenue-recognition entry point. Returns recognized revenue for the
 * resolved billing model over the given period.
 */
export function recognizeRevenue(args: RecognizeArgs): RevenueResult {
  const model = resolveBillingModel(args.project, args.client);
  const { period } = args;

  if (!period || !(period.start instanceof Date) || !(period.end instanceof Date)) {
    return { amount: 0, reason: 'no_period', model };
  }

  switch (model) {
    case 'Hourly': {
      const sessions = args.sessions ?? [];
      const inWindow = sessions.filter(
        (s) =>
          (s.billable ?? true) &&
          inPeriod(s.rawDate ?? s.date ?? null, period),
      );
      if (inWindow.length === 0) {
        return { amount: 0, reason: 'no_sessions', model };
      }
      const amount = inWindow.reduce(
        (sum, s) => sum + sessionLaborValue(s, args.client),
        0,
      );
      return { amount: round2(amount), reason: 'ok', model };
    }

    case 'Retainer': {
      const monthly = Number(args.client.monthlyContractValue ?? 0);
      if (monthly <= 0) {
        return { amount: 0, reason: 'no_contract', model };
      }
      // Retainer revenue is recognized per calendar month the engagement is
      // active in the period. We deliberately don't tie this to cycle-end
      // boundaries — a freelancer with a monthly contract earns that fee in
      // the month it covers, regardless of when their billing cycle resets.
      const months = calendarMonthsIn(period);
      return { amount: round2(monthly * months), reason: 'ok', model };
    }

    case 'FixedFee': {
      const project = args.project;
      const value = projectContractValue(project);
      if (!project) return { amount: 0, reason: 'no_contract', model };
      if (value <= 0) return { amount: 0, reason: 'no_contract', model };
      if (!project.completedAt) return { amount: 0, reason: 'not_completed', model };
      if (!inPeriod(project.completedAt, period)) {
        return { amount: 0, reason: 'not_completed', model };
      }
      return { amount: round2(value), reason: 'ok', model };
    }

    case 'Milestone':
    case 'Subscription':
      return { amount: 0, reason: 'unknown_model', model };
  }
}

/** Engine-only: the monetary value of labor invested in a single session. */
export function sessionLaborValue(
  session: SessionShape,
  client?: ClientShape | null,
): number {
  if (session.laborValue != null && Number.isFinite(session.laborValue)) {
    return Number(session.laborValue);
  }
  if (session.revenue != null && Number.isFinite(session.revenue)) {
    return Number(session.revenue);
  }
  const rate = Number(client?.rate ?? 0);
  const duration = Number(session.duration ?? 0);
  return rate * duration;
}

function projectContractValue(p?: ProjectShape | null): number {
  if (!p) return 0;
  const cv = Number(p.contractValue ?? 0);
  if (cv > 0) return cv;
  return Number(p.totalValue ?? 0);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ─── Aggregators ───────────────────────────────────────────────────

export function recognizeClientRevenue(
  client: ClientShape,
  projects: ProjectShape[],
  sessions: SessionShape[],
  period: Period,
): number {
  const clientModel = resolveBillingModel(null, client);
  const projectSessions = (projectId?: string | null) =>
    sessions.filter((s) => (projectId ? s.projectId === projectId : !s.projectId));

  // Project-scoped recognition first (covers per-engagement billing models).
  let total = 0;
  for (const p of projects) {
    const r = recognizeRevenue({
      project: p,
      client,
      sessions: projectSessions(p.id),
      period,
    });
    total += r.amount;
  }

  // Sessions with no project fall back to the client-level model.
  const orphanSessions = projectSessions(null);
  if (orphanSessions.length > 0 || clientModel === 'Retainer') {
    const orphan = recognizeRevenue({
      project: null,
      client,
      sessions: orphanSessions,
      period,
    });
    // Avoid double-counting retainers when projects already inherited it.
    const alreadyCountedRetainer = projects.some(
      (p) => resolveBillingModel(p, client) === 'Retainer',
    );
    if (!(clientModel === 'Retainer' && alreadyCountedRetainer)) {
      total += orphan.amount;
    }
  }

  return round2(total);
}

export function recognizeWorkspaceRevenue(
  clients: ClientShape[],
  projects: ProjectShape[],
  sessions: SessionShape[],
  period: Period,
): number {
  let total = 0;
  for (const c of clients) {
    const cProjects = projects.filter((p) => p.clientId === c.id);
    const cSessions = sessions.filter((s) => s.clientId === c.id);
    total += recognizeClientRevenue(c, cProjects, cSessions, period);
  }
  return round2(total);
}

// ─── Derived metrics ───────────────────────────────────────────────

/** Effective hourly rate = revenue / hours worked. Returns null if hours <= 0. */
export function effectiveRate(
  revenue: number,
  hours: number,
): number | null {
  if (!Number.isFinite(revenue) || !Number.isFinite(hours)) return null;
  if (hours <= 0) return null;
  return round2(revenue / hours);
}

/**
 * Profitability — structured result designed to grow richer in Phase 2.
 * Phase 1 surfaces only `tone` + `marginAbs` / `marginPct`, but the shape
 * already carries `drivers` so Phase 2 can layer in trend, variance weighting,
 * and budget performance without touching consumers' call sites.
 */
export interface ProfitabilityArgs {
  revenue: number;
  laborValue: number;
  hours?: number;
  estimatedHours?: number;
  /** Nominal hourly rate to compare effective rate against. */
  nominalRate?: number;
}

export function profitability(args: ProfitabilityArgs): ProfitabilityResult {
  const revenue = Number(args.revenue ?? 0);
  const labor = Number(args.laborValue ?? 0);
  const marginAbs = round2(revenue - labor);
  const marginPct =
    revenue > 0 ? round2(((revenue - labor) / revenue) * 100) : null;

  const drivers: ProfitabilityDriver[] = [
    { kind: 'margin', label: 'Margin', value: marginAbs },
  ];

  let tone: ProfitabilityTone;
  if (revenue <= 0 && labor <= 0) {
    tone = 'on_track';
  } else if (marginAbs < 0) {
    tone = 'unprofitable';
  } else if (marginPct == null) {
    tone = 'on_track';
  } else if (marginPct >= 40) {
    tone = 'excellent';
  } else if (marginPct >= 15) {
    tone = 'on_track';
  } else {
    tone = 'attention';
  }

  if (
    args.hours != null &&
    args.estimatedHours != null &&
    args.estimatedHours > 0
  ) {
    const variance = hoursVariance(args.hours, args.estimatedHours);
    drivers.push({
      kind: 'hours_variance',
      label: 'Hours variance',
      value: variance.delta,
    });
    // Sharply over estimate downgrades tone one step.
    if (variance.pct != null && variance.pct >= 25 && tone === 'on_track') {
      tone = 'attention';
    }
  }

  if (args.nominalRate != null && args.hours != null && args.hours > 0) {
    const eff = effectiveRate(revenue, args.hours);
    if (eff != null) {
      drivers.push({ kind: 'effective_rate', label: 'Effective rate', value: eff });
    }
  }

  return { marginAbs, marginPct, tone, drivers };
}

/** Hours variance — negative delta means under estimate (good). */
export function hoursVariance(
  actual: number,
  estimated: number,
): HoursVarianceResult {
  if (!Number.isFinite(actual) || !Number.isFinite(estimated) || estimated <= 0) {
    return { delta: 0, pct: null, tone: 'on_target' };
  }
  const delta = round2(actual - estimated);
  const pct = round2((delta / estimated) * 100);
  let tone: HoursVarianceResult['tone'] = 'on_target';
  if (pct <= -5) tone = 'under';
  else if (pct >= 5) tone = 'over';
  return { delta, pct, tone };
}

// ─── Aggregate labor value (engine-only) ───────────────────────────

export function sumLaborValue(
  sessions: SessionShape[],
  client?: ClientShape | null,
): number {
  return round2(
    sessions.reduce((sum, s) => sum + sessionLaborValue(s, client), 0),
  );
}
