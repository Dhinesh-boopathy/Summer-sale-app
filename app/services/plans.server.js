// Shopify App Pricing plan names should be mapped here once configured in the
// Partner Dashboard. Overrides provide a safe way to exercise each tier while
// wiring the Partner API subscription lookup.
const PLAN_LIMITS = Object.freeze({
  FREE: 10,
  BASIC: 100,
  GROWTH: 250,
  PRO: 10_000,
});

function readOverrides() {
  try {
    return JSON.parse(process.env.SHOP_PLAN_OVERRIDES || "{}");
  } catch {
    console.error("SHOP_PLAN_OVERRIDES must be valid JSON; using Free entitlements.");
    return {};
  }
}

export function getShopPlan(shop) {
  const requested = readOverrides()[shop];
  const plan = typeof requested === "string" ? requested.toUpperCase() : "FREE";
  return Object.hasOwn(PLAN_LIMITS, plan) ? plan : "FREE";
}

export function getProductLimit(plan) {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.FREE;
}

export function assertProductLimit(items, limit) {
  const productCount = new Set(items.map((item) => item.productId).filter(Boolean)).size;
  if (productCount > limit) {
    throw new Error(`Your plan allows up to ${limit.toLocaleString()} products per sale. This sale contains ${productCount.toLocaleString()}. Upgrade your plan or remove products.`);
  }
}
