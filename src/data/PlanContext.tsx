import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import {
  type PlanId, type FeatureKey, type LimitKey,
  PLANS, hasFeature, getLimit, isAtLimit, wouldExceedLimit,
  minimumPlanFor, upgradePlanForLimit, formatLimit,
} from './plans';
import { planIdFromProductId } from './stripePlans';
import { supabase } from '@/integrations/supabase/client';

export interface WorkspacePlan {
  planId: PlanId;
  activatedAt: string;
  periodEnd: string | null;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  isTrial: boolean;
  trialEnd: string | null;
}

const DEFAULT_PLAN: WorkspacePlan = {
  planId: 'starter',
  activatedAt: new Date().toISOString(),
  periodEnd: null,
  stripeSubscriptionId: null,
  stripeCustomerId: null,
  isTrial: false,
  trialEnd: null,
};

interface PlanContextType {
  plan: WorkspacePlan;
  planId: PlanId;
  planDef: typeof PLANS['starter'];
  effectivePlanId: PlanId;
  can: (feature: FeatureKey) => boolean;
  limit: (key: LimitKey) => number | null;
  atLimit: (key: LimitKey, count: number) => boolean;
  wouldExceed: (key: LimitKey, count: number) => boolean;
  requiredPlan: (feature: FeatureKey) => PlanId;
  upgradePlan: (limit: LimitKey) => PlanId | null;
  formatLimitValue: (value: number | null) => string;
  isAtLeast: (tier: PlanId) => boolean;
  isExactly: (tier: PlanId) => boolean;
  setPlan: (plan: WorkspacePlan) => void;
  setPlanId: (id: PlanId) => void;
  isTrial: boolean;
  trialDaysRemaining: number;
  trialExpired: boolean;
  startTrial: () => void;
  checkSubscription: () => Promise<void>;
  subscriptionLoading: boolean;
}

const TIER_ORDER: PlanId[] = ['starter', 'pro', 'studio', 'legacy'];

const PlanContext = createContext<PlanContextType | null>(null);

const safeDefaults: PlanContextType = {
  plan: DEFAULT_PLAN, planId: 'starter', planDef: PLANS.starter, effectivePlanId: 'starter',
  can: (f) => hasFeature('starter', f),
  limit: (k) => getLimit('starter', k),
  atLimit: (k, c) => isAtLimit('starter', k, c),
  wouldExceed: (k, c) => wouldExceedLimit('starter', k, c),
  requiredPlan: minimumPlanFor,
  upgradePlan: (k) => upgradePlanForLimit(k, 'starter'),
  formatLimitValue: formatLimit,
  isAtLeast: (tier) => TIER_ORDER.indexOf('starter') >= TIER_ORDER.indexOf(tier),
  isExactly: (tier) => tier === 'starter',
  setPlan: () => {}, setPlanId: () => {},
  isTrial: false, trialDaysRemaining: 0, trialExpired: false, startTrial: () => {},
  checkSubscription: async () => {}, subscriptionLoading: false,
};

export function usePlan(): PlanContextType {
  const ctx = useContext(PlanContext);
  if (!ctx) return safeDefaults;
  return ctx;
}

export function PlanProvider({ children, initialPlan, workspaceId }: { children: ReactNode; initialPlan?: WorkspacePlan | null; workspaceId?: string | null }) {
  const [plan, setPlanState] = useState<WorkspacePlan>(initialPlan || DEFAULT_PLAN);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const wsIdRef = useRef(workspaceId);
  wsIdRef.current = workspaceId;

  useEffect(() => {
    if (initialPlan && initialPlan.planId) setPlanState(initialPlan);
  }, [initialPlan?.planId]);

  const planId: PlanId = (plan.planId as PlanId) || 'starter';
  const planDef = PLANS[planId] || PLANS.starter;
  const trialActive = plan.isTrial && plan.trialEnd && new Date(plan.trialEnd) > new Date();
  const effectivePlanId: PlanId = trialActive ? 'pro' : planId;

  // ── Stripe subscription check ──────────────────────────────────
  const checkSubscription = useCallback(async () => {
    setSubscriptionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (error) {
        console.warn('[PlanContext] check-subscription error:', error.message);
        return;
      }

      if (!data) return;

      if (data.subscribed && data.product_id) {
        const stripePlan = planIdFromProductId(data.product_id);
        if (stripePlan && stripePlan !== planId) {
          // Sync plan to DB
          const wsId = wsIdRef.current;
          if (wsId) {
            await supabase.from('workspaces').update({
              plan_id: stripePlan,
              stripe_customer_id: data.stripe_customer_id || null,
              stripe_subscription_id: data.stripe_subscription_id || null,
              plan_period_end: data.subscription_end || null,
            }).eq('id', wsId);
          }
          setPlanState(prev => ({
            ...prev,
            planId: stripePlan,
            stripeCustomerId: data.stripe_customer_id || null,
            stripeSubscriptionId: data.stripe_subscription_id || null,
            periodEnd: data.subscription_end || null,
            isTrial: false,
            trialEnd: null,
          }));
        } else if (stripePlan) {
          // Same plan but update Stripe metadata
          setPlanState(prev => ({
            ...prev,
            stripeCustomerId: data.stripe_customer_id || prev.stripeCustomerId,
            stripeSubscriptionId: data.stripe_subscription_id || prev.stripeSubscriptionId,
            periodEnd: data.subscription_end || prev.periodEnd,
          }));
        }
      } else if (!data.subscribed && planId !== 'starter' && planId !== 'legacy') {
        // Subscription lapsed — downgrade to starter (but not if legacy)
        const wsId = wsIdRef.current;
        if (wsId) {
          await supabase.from('workspaces').update({
            plan_id: 'starter',
            stripe_subscription_id: null,
            plan_period_end: null,
          }).eq('id', wsId);
        }
        setPlanState(prev => ({
          ...prev,
          planId: 'starter',
          stripeSubscriptionId: null,
          periodEnd: null,
        }));
      }
    } catch (err) {
      console.warn('[PlanContext] check-subscription failed:', err);
    } finally {
      setSubscriptionLoading(false);
    }
  }, [planId]);

  // Poll on mount and every 60s
  useEffect(() => {
    if (!workspaceId) return;
    // Check after a short delay to avoid racing with auth
    const timeout = setTimeout(() => checkSubscription(), 2000);
    const interval = setInterval(() => checkSubscription(), 60_000);
    return () => { clearTimeout(timeout); clearInterval(interval); };
  }, [workspaceId, checkSubscription]);

  // Check on URL change (e.g. returning from checkout)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success') {
      // Small delay for Stripe to process
      setTimeout(() => checkSubscription(), 3000);
      // Clean URL
      params.delete('checkout');
      const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, [checkSubscription]);

  const can = useCallback((feature: FeatureKey) => hasFeature(effectivePlanId, feature), [effectivePlanId]);
  const limitFn = useCallback((key: LimitKey) => getLimit(effectivePlanId, key), [effectivePlanId]);
  const atLimitFn = useCallback((key: LimitKey, count: number) => isAtLimit(effectivePlanId, key, count), [effectivePlanId]);
  const wouldExceedFn = useCallback((key: LimitKey, count: number) => wouldExceedLimit(effectivePlanId, key, count), [effectivePlanId]);
  const requiredPlanFn = useCallback((feature: FeatureKey) => minimumPlanFor(feature), []);
  const upgradePlanFn = useCallback((key: LimitKey) => upgradePlanForLimit(key, planId), [planId]);
  const isAtLeastFn = useCallback((tier: PlanId) => TIER_ORDER.indexOf(effectivePlanId) >= TIER_ORDER.indexOf(tier), [effectivePlanId]);
  const isExactlyFn = useCallback((tier: PlanId) => effectivePlanId === tier, [effectivePlanId]);

  const setPlan = useCallback((newPlan: WorkspacePlan) => setPlanState(newPlan), []);
  const setPlanIdOnly = useCallback((id: PlanId) => setPlanState(prev => ({ ...prev, planId: id })), []);

  const isTrial = !!trialActive;
  const trialDaysRemaining = plan.trialEnd ? Math.max(0, Math.ceil((new Date(plan.trialEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))) : 0;
  const trialExpired = plan.isTrial && plan.trialEnd ? new Date(plan.trialEnd) <= new Date() : false;

  const startTrial = useCallback(() => {
    const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    setPlanState(prev => ({ ...prev, isTrial: true, trialEnd }));
  }, []);

  return (
    <PlanContext.Provider value={{
      plan, planId, planDef, effectivePlanId,
      can, limit: limitFn, atLimit: atLimitFn, wouldExceed: wouldExceedFn,
      requiredPlan: requiredPlanFn, upgradePlan: upgradePlanFn, formatLimitValue: formatLimit,
      isAtLeast: isAtLeastFn, isExactly: isExactlyFn,
      setPlan, setPlanId: setPlanIdOnly,
      isTrial, trialDaysRemaining, trialExpired, startTrial,
      checkSubscription, subscriptionLoading,
    }}>
      {children}
    </PlanContext.Provider>
  );
}
