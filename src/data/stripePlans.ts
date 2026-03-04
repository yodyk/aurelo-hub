// ── Stripe ↔ Aurelo plan mapping ────────────────────────────────────
import type { PlanId, BillingInterval } from './plans';

export interface StripeTier {
  planId: PlanId;
  productId: string;
  monthly: { priceId: string; lookupKey: string };
  annual: { priceId: string; lookupKey: string };
}

export const STRIPE_TIERS: Record<Exclude<PlanId, 'starter'>, StripeTier> = {
  pro: {
    planId: 'pro',
    productId: 'prod_U4mEsVwVepTolp',
    monthly: { priceId: 'price_1T7FfHKOPDAlMCW8o4jQM2aE', lookupKey: 'pro_monthly' },
    annual: { priceId: 'price_1T7EjxKOPDAlMCW83CAcx1mJ', lookupKey: 'pro_annual' },
  },
  studio: {
    planId: 'studio',
    productId: 'prod_U4mo93XPPIybIU',
    monthly: { priceId: 'price_1T7Fa1KOPDAlMCW8MQExTD7q', lookupKey: 'studio_monthly' },
    annual: { priceId: 'price_1T7EoiKOPDAlMCW8AIXLVUzO', lookupKey: 'studio_annual' },
  },
  legacy: {
    planId: 'legacy',
    productId: 'prod_U4mwIoFrDShXUB',
    monthly: { priceId: 'price_1T6dMAKOPDAlMCW8RP669JkE', lookupKey: 'legacy_monthly' },
    annual: { priceId: 'price_1T6dMAKOPDAlMCW8RP669JkE', lookupKey: 'legacy_annual' },
  },
};

/** Get the correct priceId for a plan + interval */
export function priceIdFor(planId: Exclude<PlanId, 'starter'>, interval: BillingInterval): string {
  return STRIPE_TIERS[planId][interval].priceId;
}

/** Resolve a Stripe product ID to our internal PlanId */
export function planIdFromProductId(productId: string): PlanId | null {
  for (const tier of Object.values(STRIPE_TIERS)) {
    if (tier.productId === productId) return tier.planId;
  }
  return null;
}
