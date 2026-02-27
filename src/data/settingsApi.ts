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

// Generic settings persistence stub
export async function saveSetting(key: string, value: any): Promise<void> {
  // Stub — will be replaced with backend call
  console.log(`[settingsApi] saveSetting: ${key}`, value);
}

export async function loadSetting(key: string): Promise<any> {
  // Stub — will be replaced with backend call
  console.log(`[settingsApi] loadSetting: ${key}`);
  return null;
}
