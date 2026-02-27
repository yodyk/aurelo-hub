import { type PlanId } from './plans';

// Stub — will be replaced with Supabase queries
export async function updatePlan(planId: PlanId): Promise<{
  activatedAt?: string;
  stripeSubscriptionId?: string | null;
  stripeCustomerId?: string | null;
  periodEnd?: string | null;
  isTrial?: boolean;
  trialEnd?: string | null;
}> {
  // Simulate API call
  return {
    activatedAt: new Date().toISOString(),
    stripeSubscriptionId: null,
    stripeCustomerId: null,
    periodEnd: null,
    isTrial: false,
    trialEnd: null,
  };
}
