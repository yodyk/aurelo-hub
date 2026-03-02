// ── Stripe ↔ Aurelo plan mapping ────────────────────────────────────
import type { PlanId } from './plans';

export interface StripeTier {
  planId: PlanId;
  productId: string;
  priceId: string;
}

export const STRIPE_TIERS: Record<Exclude<PlanId, 'starter'>, StripeTier> = {
  pro: {
    planId: 'pro',
    productId: 'prod_U4mEsVwVepTolp',
    priceId: 'price_1T6cfvKOPDAlMCW80b4tV67L',
  },
  studio: {
    planId: 'studio',
    productId: 'prod_U4mo93XPPIybIU',
    priceId: 'price_1T6dEeKOPDAlMCW8McGZk1YZ',
  },
  legacy: {
    planId: 'legacy',
    productId: 'prod_U4mwIoFrDShXUB',
    priceId: 'price_1T6dMAKOPDAlMCW8RP669JkE',
  },
};

/** Resolve a Stripe product ID to our internal PlanId */
export function planIdFromProductId(productId: string): PlanId | null {
  for (const tier of Object.values(STRIPE_TIERS)) {
    if (tier.productId === productId) return tier.planId;
  }
  return null;
}
