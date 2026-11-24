import prisma from "../db.server.js";
import { applyProductVariantsPrice, getProductVariantPrices } from "./shopifyPrice.server.js";
import { createSaleItemReconciler } from "./sale-pricing-core.js";

function createReconciler(db) {
  return createSaleItemReconciler({
    db,
    getVariant: async (admin, item) => {
      const variants = await getProductVariantPrices(admin, [item.variantId]);
      return variants.get(item.variantId) || null;
    },
    applyVariant: (admin, item, target) => applyProductVariantsPrice(admin, item.productId, [
      { id: item.variantId, ...target },
    ]),
  });
}

const reconcileWithPrisma = createReconciler(prisma);

export async function reconcileSaleItem(admin, item, direction, db = prisma, assertOwned) {
  const reconcile = db === prisma ? reconcileWithPrisma : createReconciler(db);
  return reconcile(admin, item, direction, assertOwned);
}

