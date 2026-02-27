import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { type PlanId, type FeatureKey, type LimitKey, PLANS, canAccess, getLimit, atLimit, wouldExceed, isAtLeast } from './plans';

export interface WorkspacePlan {
  planId: PlanId;
  activatedAt: string;
  periodEnd: string | null;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  isTrial: boolean;
  trialEnd: string | null;
}

const defaultPlan: WorkspacePlan = {
  planId: 'starter',
  activatedAt: new Date().toISOString(),
  periodEnd: null,
  stripeSubscriptionId: null,
  stripeCustomerId: null,
  isTrial: false,
  trialEnd: null,
};

interface PlanContextValue {
  plan: WorkspacePlan;
  planId: PlanId;
  planDef: typeof PLANS[PlanId];
  setPlan: (plan: WorkspacePlan) => void;
  can: (feature: FeatureKey) => boolean;
  limit: (key: LimitKey) => number | null;
  atLimit: (key: LimitKey, count: number) => boolean;
  wouldExceed: (key: LimitKey, count: number) => boolean;
  isAtLeast: (required: PlanId) => boolean;
  requiredPlan: (feature: FeatureKey) => PlanId;
  upgradePlan: (limit: LimitKey) => PlanId | null;
  formatLimitValue: (v: number | null) => string;
  isTrial: boolean;
  trialDaysRemaining: number;
  trialExpired: boolean;
  startTrial: () => void;
}

const PlanContext = createContext<PlanContextValue | null>(null);

export function PlanProvider({ children, initialPlan }: { children: ReactNode; initialPlan?: WorkspacePlan }) {
  const [plan, setPlan] = useState<WorkspacePlan>(initialPlan || defaultPlan);

  const planId = plan.planId;
  const planDef = PLANS[planId];

  const isTrial = plan.isTrial && plan.trialEnd !== null;
  const trialDaysRemaining = useMemo(() => {
    if (!plan.trialEnd) return 0;
    const diff = new Date(plan.trialEnd).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [plan.trialEnd]);
  const trialExpired = isTrial && trialDaysRemaining <= 0;

  // During active trial, grant Pro-level access
  const effectivePlanId = (isTrial && !trialExpired) ? 'pro' : planId;

  const canFn = useCallback((feature: FeatureKey) => canAccess(effectivePlanId, feature), [effectivePlanId]);
  const limitFn = useCallback((key: LimitKey) => getLimit(effectivePlanId, key), [effectivePlanId]);
  const atLimitFn = useCallback((key: LimitKey, count: number) => atLimit(effectivePlanId, key, count), [effectivePlanId]);
  const wouldExceedFn = useCallback((key: LimitKey, count: number) => wouldExceed(effectivePlanId, key, count), [effectivePlanId]);
  const isAtLeastFn = useCallback((required: PlanId) => isAtLeast(effectivePlanId, required), [effectivePlanId]);

  const startTrial = useCallback(() => {
    const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    setPlan(prev => ({ ...prev, isTrial: true, trialEnd }));
  }, []);

  const requiredPlanFn = useCallback((feature: FeatureKey): PlanId => {
    const order: PlanId[] = ['starter', 'pro', 'studio'];
    for (const p of order) {
      if (PLANS[p].features[feature]) return p;
    }
    return 'studio';
  }, []);

  const upgradePlanFn = useCallback((key: LimitKey): PlanId | null => {
    const order: PlanId[] = ['starter', 'pro', 'studio'];
    const currentIdx = order.indexOf(effectivePlanId);
    for (let i = currentIdx + 1; i < order.length; i++) {
      const lim = PLANS[order[i]].limits[key];
      if (lim === null || (lim !== null && lim > (PLANS[effectivePlanId].limits[key] ?? 0))) return order[i];
    }
    return null;
  }, [effectivePlanId]);

  const formatLimitValue = useCallback((v: number | null): string => {
    if (v === null) return 'unlimited';
    return v.toString();
  }, []);

  return (
    <PlanContext.Provider value={{
      plan, planId, planDef, setPlan,
      can: canFn, limit: limitFn, atLimit: atLimitFn, wouldExceed: wouldExceedFn, isAtLeast: isAtLeastFn,
      requiredPlan: requiredPlanFn, upgradePlan: upgradePlanFn, formatLimitValue,
      isTrial, trialDaysRemaining, trialExpired, startTrial,
    }}>
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan() {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error('usePlan must be used within PlanProvider');
  return ctx;
}
