// ── Plan definitions ────────────────────────────────────────────────

export type PlanId = 'starter' | 'pro' | 'studio';

export type FeatureKey =
  | 'fullInsights'
  | 'clientInvoicing'
  | 'batchInvoicing'
  | 'richNotes'
  | 'customCategories'
  | 'integrations'
  | 'pdfExport'
  | 'advancedNotifications'
  | 'whiteLabelPortal'
  | 'teamUtilization'
  | 'multiWorkspace'
  | 'apiAccess'
  | 'webhooks'
  | 'customInvoiceTemplates';

export type LimitKey = 'seats' | 'activeClients' | 'projectsPerClient' | 'dataRetentionDays';

export interface PlanDef {
  name: string;
  tagline: string;
  price: number;
  limits: Record<LimitKey, number | null>; // null = unlimited
  features: Record<FeatureKey, boolean>;
}

export const PLANS: Record<PlanId, PlanDef> = {
  starter: {
    name: 'Starter',
    tagline: 'For solo freelancers getting started',
    price: 0,
    limits: { seats: 1, activeClients: 5, projectsPerClient: 3, dataRetentionDays: 90 },
    features: {
      fullInsights: false, clientInvoicing: false, batchInvoicing: false,
      richNotes: false, customCategories: false, integrations: false,
      pdfExport: false, advancedNotifications: false, whiteLabelPortal: false,
      teamUtilization: false, multiWorkspace: false, apiAccess: false,
      webhooks: false, customInvoiceTemplates: false,
    },
  },
  pro: {
    name: 'Pro',
    tagline: 'For established freelancers and small teams',
    price: 24,
    limits: { seats: 5, activeClients: null, projectsPerClient: null, dataRetentionDays: null },
    features: {
      fullInsights: true, clientInvoicing: true, batchInvoicing: false,
      richNotes: true, customCategories: true, integrations: true,
      pdfExport: true, advancedNotifications: true, whiteLabelPortal: false,
      teamUtilization: false, multiWorkspace: false, apiAccess: false,
      webhooks: false, customInvoiceTemplates: false,
    },
  },
  studio: {
    name: 'Studio',
    tagline: 'For agencies and growing studios',
    price: 59,
    limits: { seats: null, activeClients: null, projectsPerClient: null, dataRetentionDays: null },
    features: {
      fullInsights: true, clientInvoicing: true, batchInvoicing: true,
      richNotes: true, customCategories: true, integrations: true,
      pdfExport: true, advancedNotifications: true, whiteLabelPortal: true,
      teamUtilization: true, multiWorkspace: true, apiAccess: true,
      webhooks: true, customInvoiceTemplates: true,
    },
  },
};

export const FEATURE_CATEGORIES = {
  pro: [
    { key: 'fullInsights' as FeatureKey, label: 'Full insights suite' },
    { key: 'clientInvoicing' as FeatureKey, label: 'Client invoicing' },
    { key: 'richNotes' as FeatureKey, label: 'Rich notes & action items' },
    { key: 'customCategories' as FeatureKey, label: 'Custom work categories' },
    { key: 'integrations' as FeatureKey, label: 'Integrations' },
    { key: 'pdfExport' as FeatureKey, label: 'PDF & CSV export' },
    { key: 'advancedNotifications' as FeatureKey, label: 'Advanced notifications' },
  ],
  studio: [
    { key: 'whiteLabelPortal' as FeatureKey, label: 'White-label portal' },
    { key: 'teamUtilization' as FeatureKey, label: 'Team utilization' },
    { key: 'multiWorkspace' as FeatureKey, label: 'Multi-workspace' },
    { key: 'batchInvoicing' as FeatureKey, label: 'Batch invoicing' },
    { key: 'apiAccess' as FeatureKey, label: 'API access' },
    { key: 'webhooks' as FeatureKey, label: 'Webhooks' },
    { key: 'customInvoiceTemplates' as FeatureKey, label: 'Custom invoice templates' },
  ],
};

export const SUPPORT_TIERS: Record<PlanId, string> = {
  starter: 'Email support',
  pro: 'Priority support',
  studio: 'Dedicated support',
};

export const EXPORT_FORMATS: Record<PlanId, string[]> = {
  starter: ['CSV'],
  pro: ['CSV', 'PDF'],
  studio: ['CSV', 'PDF'],
};

export const STARTER_NOTIFICATION_TYPES = ['email'] as const;

// ── Helper functions ────────────────────────────────────────────────

const TIER_ORDER: PlanId[] = ['starter', 'pro', 'studio'];

// Legacy aliases (kept for backward compat)
export const canAccess = hasFeature;
export const atLimit = isAtLimit;
export const wouldExceed = wouldExceedLimit;
export const isAtLeast = (planId: PlanId, required: PlanId) =>
  TIER_ORDER.indexOf(planId) >= TIER_ORDER.indexOf(required);

export function hasFeature(planId: PlanId, feature: FeatureKey): boolean {
  return PLANS[planId]?.features[feature] ?? false;
}

export function getLimit(planId: PlanId, key: LimitKey): number | null {
  return PLANS[planId]?.limits[key] ?? null;
}

export function isAtLimit(planId: PlanId, key: LimitKey, currentCount: number): boolean {
  const max = getLimit(planId, key);
  if (max === null) return false;
  return currentCount >= max;
}

export function wouldExceedLimit(planId: PlanId, key: LimitKey, currentCount: number): boolean {
  const max = getLimit(planId, key);
  if (max === null) return false;
  return currentCount + 1 > max;
}

export function minimumPlanFor(feature: FeatureKey): PlanId {
  for (const p of TIER_ORDER) {
    if (PLANS[p].features[feature]) return p;
  }
  return 'studio';
}

export function upgradePlanForLimit(key: LimitKey, currentPlan: PlanId): PlanId | null {
  const currentIdx = TIER_ORDER.indexOf(currentPlan);
  const currentMax = PLANS[currentPlan].limits[key];
  for (let i = currentIdx + 1; i < TIER_ORDER.length; i++) {
    const nextMax = PLANS[TIER_ORDER[i]].limits[key];
    if (nextMax === null || (currentMax !== null && nextMax > currentMax)) return TIER_ORDER[i];
  }
  return null;
}

export function formatLimit(value: number | null): string {
  if (value === null) return 'unlimited';
  return value.toString();
}
