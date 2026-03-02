// Duplicated from src/data/stripePlans.ts for edge function context
type PlanId = "starter" | "pro" | "studio" | "legacy";

const PRODUCT_TO_PLAN: Record<string, PlanId> = {
  "prod_U4mEsVwVepTolp": "pro",
  "prod_U4mo93XPPIybIU": "studio",
  "prod_U4mwIoFrDShXUB": "legacy",
};

export function planIdFromProductId(productId: string): PlanId | null {
  return PRODUCT_TO_PLAN[productId] ?? null;
}
