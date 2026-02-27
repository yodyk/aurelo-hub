import { type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Lock, ArrowRight, Sparkles } from 'lucide-react';
import { usePlan } from '../data/PlanContext';
import { type FeatureKey, type LimitKey, type PlanId, PLANS } from '../data/plans';

// ── FeatureGate ────────────────────────────────────────────────────
interface FeatureGateProps {
  feature: FeatureKey;
  children: ReactNode;
  fallback?: ReactNode;
  hideIfLocked?: boolean;
  featureLabel?: string;
}

export function FeatureGate({ feature, children, fallback, hideIfLocked, featureLabel }: FeatureGateProps) {
  const { can, requiredPlan } = usePlan();
  if (can(feature)) return <>{children}</>;
  if (hideIfLocked) return null;
  if (fallback) return <>{fallback}</>;
  const required = requiredPlan(feature);
  return <UpgradePrompt feature={feature} requiredPlan={required} label={featureLabel} />;
}

// ── LimitGate ──────────────────────────────────────────────────────
interface LimitGateProps {
  limit: LimitKey;
  currentCount: number;
  children: ReactNode;
  fallback?: ReactNode;
  limitLabel?: string;
}

export function LimitGate({ limit, currentCount, children, fallback, limitLabel }: LimitGateProps) {
  const { wouldExceed, upgradePlan, planId, formatLimitValue, limit: getLimit } = usePlan();
  if (!wouldExceed(limit, currentCount)) return <>{children}</>;
  if (fallback) return <>{fallback}</>;
  const nextPlan = upgradePlan(limit);
  const currentMax = getLimit(limit);
  return (
    <LimitUpgradePrompt
      limitLabel={limitLabel || limit}
      currentMax={currentMax}
      currentPlan={planId}
      upgradeTo={nextPlan}
      formatLimit={formatLimitValue}
    />
  );
}

// ── UpgradePrompt ──────────────────────────────────────────────────
function UpgradePrompt({ feature, requiredPlan, label }: { feature: FeatureKey; requiredPlan: PlanId; label?: string }) {
  const navigate = useNavigate();
  const plan = PLANS[requiredPlan];
  const displayLabel = label || feature.replace(/([A-Z])/g, ' $1').trim();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="border border-border rounded-xl p-6 bg-card text-center max-w-md mx-auto"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
    >
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
        <Lock className="w-4.5 h-4.5 text-primary" />
      </div>
      <h3 className="text-[15px] text-foreground mb-1.5" style={{ fontWeight: 600 }}>
        {displayLabel}
      </h3>
      <p className="text-[13px] text-muted-foreground leading-relaxed mb-5">
        This feature is available on the <span className="text-foreground" style={{ fontWeight: 500 }}>{plan.name}</span> plan and above.
      </p>
      <button
        onClick={() => navigate('/settings?tab=billing')}
        className="inline-flex items-center gap-2 px-4 py-2 text-[13px] rounded-lg bg-foreground text-background hover:opacity-90 transition-all"
        style={{ fontWeight: 500 }}
      >
        <Sparkles className="w-3.5 h-3.5" />
        Upgrade to {plan.name}
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}

// ── LimitUpgradePrompt ─────────────────────────────────────────────
function LimitUpgradePrompt({
  limitLabel,
  currentMax,
  currentPlan,
  upgradeTo,
  formatLimit,
}: {
  limitLabel: string;
  currentMax: number | null;
  currentPlan: PlanId;
  upgradeTo: PlanId | null;
  formatLimit: (v: number | null) => string;
}) {
  const navigate = useNavigate();
  const upgradeTarget = upgradeTo ? PLANS[upgradeTo] : null;
  const displayLabel = limitLabel.replace(/([A-Z])/g, ' $1').trim().toLowerCase();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="border border-accent/20 bg-accent/[0.04] rounded-xl px-5 py-4 flex items-center gap-4"
    >
      <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
        <Lock className="w-4 h-4 text-accent-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-foreground" style={{ fontWeight: 500 }}>
          You've reached the limit of {formatLimit(currentMax)} {displayLabel} on {PLANS[currentPlan].name}
        </p>
        {upgradeTarget && (
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Upgrade to {upgradeTarget.name} for {formatLimit(upgradeTarget.limits[limitLabel as keyof typeof upgradeTarget.limits] as number | null)}
          </p>
        )}
      </div>
      {upgradeTarget && (
        <button
          onClick={() => navigate('/settings?tab=billing')}
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-lg bg-foreground text-background hover:opacity-90 transition-all"
          style={{ fontWeight: 500 }}
        >
          Upgrade
          <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </motion.div>
  );
}

// ── UpgradeNudge ───────────────────────────────────────────────────
interface UpgradeNudgeProps {
  feature: FeatureKey;
  label?: string;
  compact?: boolean;
}

export function UpgradeNudge({ feature, label, compact }: UpgradeNudgeProps) {
  const navigate = useNavigate();
  const { can, requiredPlan } = usePlan();
  if (can(feature)) return null;

  const required = requiredPlan(feature);
  const plan = PLANS[required];

  if (compact) {
    return (
      <button
        onClick={() => navigate('/settings?tab=billing')}
        className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-md bg-primary/10 text-primary hover:bg-primary/15 transition-colors"
        style={{ fontWeight: 600, letterSpacing: '0.02em' }}
      >
        <Lock className="w-2.5 h-2.5" />
        {plan.name}
      </button>
    );
  }

  return (
    <button
      onClick={() => navigate('/settings?tab=billing')}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-lg border border-primary/20 text-primary hover:bg-primary/5 transition-colors"
      style={{ fontWeight: 500 }}
    >
      <Lock className="w-3 h-3" />
      {label || 'Upgrade to'} {plan.name}
    </button>
  );
}

// ── PlanBadge ──────────────────────────────────────────────────────
export function PlanBadge({ className = '' }: { className?: string }) {
  const { planId } = usePlan();
  const colors: Record<PlanId, string> = {
    starter: 'bg-muted text-muted-foreground',
    pro: 'bg-primary/10 text-primary',
    studio: 'bg-accent/10 text-accent-foreground',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] tracking-wide ${colors[planId]} ${className}`}
      style={{ fontWeight: 600, letterSpacing: '0.05em' }}
    >
      {PLANS[planId].name.toUpperCase()}
    </span>
  );
}
