/**
 * FinancialSummary — the single presentation surface for revenue-bearing
 * entities (Client billing, Project row, Retainer cycle, Portal header).
 *
 * Reads from the RevenueRecognition engine. NEVER calculates Hours × Rate
 * inline — every number originates from `src/lib/revenue.ts`.
 *
 * Visual order (locked, per product spec):
 *   Revenue → Hours Worked → Effective Rate → Profitability → Variance
 *
 * Hidden rows when not applicable (Hourly without an estimate hides Variance;
 * zero-hour entities hide Effective Rate). The surface should always feel
 * intentionally composed — never technically complete with placeholders.
 */

import { motion } from 'framer-motion';
import {
  type BillingModel,
  type ProfitabilityResult,
  type ProfitabilityTone,
  effectiveRate as calcEffectiveRate,
  hoursVariance,
} from '@/lib/revenue';
import { formatMoney } from '@/lib/format';
import { fmtH } from '@/lib/format';

// ─── Tone → semantic class mapping ─────────────────────────────────
// Approved palette. No new colors — uses existing tokens only.
const TONE_LABEL: Record<ProfitabilityTone, string> = {
  excellent: 'Excellent',
  on_track: 'On Track',
  attention: 'Needs Attention',
  unprofitable: 'Critical',
};

const TONE_TEXT: Record<ProfitabilityTone, string> = {
  excellent: 'text-success',
  on_track: 'text-foreground',
  attention: 'text-warning',
  unprofitable: 'text-destructive',
};

const TONE_DOT: Record<ProfitabilityTone, string> = {
  excellent: 'bg-success',
  on_track: 'bg-muted-foreground',
  attention: 'bg-warning',
  unprofitable: 'bg-destructive',
};

// ─── Public API ────────────────────────────────────────────────────

export interface FinancialSummaryProps {
  /** Recognized revenue from the engine. Always called "Revenue" in copy. */
  revenue: number;
  /** Hours worked. Pass null/undefined to hide the row. */
  hoursWorked?: number | null;
  /** Estimated hours (Fixed Fee, optionally Hourly with scope). */
  estimatedHours?: number | null;
  /** Profitability result from the engine. Pass null to hide. */
  profitability?: ProfitabilityResult | null;
  /** Resolved billing model — drives row visibility. */
  billingModel: BillingModel;
  /** Compact = table-row style (projects table). Default = card style. */
  variant?: 'default' | 'compact';
  /** Hide individual rows when caller has already presented them elsewhere. */
  hide?: { revenue?: boolean; hours?: boolean; effRate?: boolean; profitability?: boolean; variance?: boolean };
  /** Optional override for the recognized-revenue label (e.g. "Monthly Revenue"). */
  revenueLabel?: string;
  /** Theme overrides for portal (light-mode locked). */
  tokens?: { ink?: string; muted?: string; subtle?: string; hairline?: string };
}

export function FinancialSummary({
  revenue,
  hoursWorked,
  estimatedHours,
  profitability,
  billingModel,
  variant = 'default',
  hide,
  revenueLabel,
  tokens,
}: FinancialSummaryProps) {
  const hours = hoursWorked ?? null;
  const eff = hours != null && hours > 0 ? calcEffectiveRate(revenue, hours) : null;

  // Variance only meaningful when an estimate exists.
  const variance =
    estimatedHours != null && estimatedHours > 0 && hours != null
      ? hoursVariance(hours, estimatedHours)
      : null;

  // Per spec: Hourly projects should not show empty profitability metrics —
  // hide rows that don't apply rather than placeholder them.
  const showEffRate = !hide?.effRate && eff != null && eff > 0;
  const showProfitability = !hide?.profitability && profitability != null && (revenue > 0 || (hours ?? 0) > 0);
  const showVariance = !hide?.variance && variance != null && variance.tone !== 'on_target';
  const showHours = !hide?.hours && hours != null;
  const showRevenue = !hide?.revenue;

  const ink = tokens?.ink ?? 'var(--foreground)';
  const muted = tokens?.muted ?? 'var(--muted-foreground)';
  const hairline = tokens?.hairline ?? 'var(--hairline)';

  if (variant === 'compact') {
    return (
      <div className="text-right space-y-0.5">
        {showRevenue && (
          <div className="text-[14px] tabular-nums" style={{ fontWeight: 600, color: ink }}>
            {formatMoney(revenue)}
          </div>
        )}
        {showEffRate && (
          <div className="text-[11px] tabular-nums" style={{ color: muted }}>
            {formatMoney(eff!, { precision: 'compact' })}/hr effective
          </div>
        )}
        {showProfitability && profitability && (
          <ProfitabilityBadge tone={profitability.tone} compact />
        )}
      </div>
    );
  }

  return (
    <dl className="divide-y border-y" style={{ borderColor: hairline }}>
      {showRevenue && (
        <Row label={revenueLabel ?? 'Revenue'} muted={muted} hairline={hairline}>
          <span className="tabular-nums" style={{ fontWeight: 600, color: ink }}>
            {formatMoney(revenue)}
          </span>
        </Row>
      )}

      {showHours && (
        <Row label="Hours worked" muted={muted} hairline={hairline}>
          <span className="tabular-nums" style={{ fontWeight: 500, color: ink }}>
            {fmtH(hours!)} hrs
            {estimatedHours != null && estimatedHours > 0 && (
              <span style={{ color: muted }}> / {fmtH(estimatedHours)}</span>
            )}
          </span>
        </Row>
      )}

      {showEffRate && (
        <Row label="Effective rate" muted={muted} hairline={hairline}>
          <span className="tabular-nums" style={{ fontWeight: 600, color: ink }}>
            {formatMoney(eff!)}/hr
          </span>
        </Row>
      )}

      {showProfitability && profitability && (
        <Row label="Profitability" muted={muted} hairline={hairline}>
          <div className="flex flex-col items-end gap-1">
            <ProfitabilityBadge tone={profitability.tone} />
            {showVariance && variance && (
              <VarianceLine variance={variance} muted={muted} />
            )}
          </div>
        </Row>
      )}

      {/* Variance shown standalone when profitability row is hidden. */}
      {!showProfitability && showVariance && variance && (
        <Row label="Variance" muted={muted} hairline={hairline}>
          <VarianceLine variance={variance} muted={muted} />
        </Row>
      )}
    </dl>
  );
}

function Row({
  label, children, muted,
}: { label: string; children: React.ReactNode; muted: string; hairline: string }) {
  return (
    <div className="flex justify-between items-center py-3 text-[13.5px]">
      <dt style={{ color: muted }}>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function ProfitabilityBadge({
  tone, compact = false,
}: { tone: ProfitabilityTone; compact?: boolean }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 2 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={`inline-flex items-center gap-1.5 ${compact ? 'text-[11px]' : 'text-[12px]'} ${TONE_TEXT[tone]}`}
      style={{ fontWeight: 600 }}
    >
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${TONE_DOT[tone]}`} />
      {TONE_LABEL[tone]}
    </motion.span>
  );
}

function VarianceLine({
  variance,
  muted,
}: {
  variance: { delta: number; tone: 'under' | 'over' | 'on_target' };
  muted: string;
}) {
  if (variance.tone === 'on_target') return null;
  const abs = Math.abs(variance.delta);
  const isUnder = variance.tone === 'under';
  const arrow = isUnder ? '▲' : '▼';
  return (
    <div className="text-[11.5px] tabular-nums" style={{ color: muted, fontWeight: 500 }}>
      <span className={isUnder ? 'text-success' : 'text-warning'} style={{ fontWeight: 600 }}>
        {arrow} {fmtH(abs)} hrs
      </span>{' '}
      {isUnder ? 'under estimate' : 'over estimate'}
    </div>
  );
}
