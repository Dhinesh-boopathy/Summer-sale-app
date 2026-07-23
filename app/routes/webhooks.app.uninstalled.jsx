import { authenticate } from "../shopify.server";
import db from "../db.server";
import { applyProductVariantsPrice } from "../services/shopifyPrice.server";

export const action = async ({ request }) => {
  const { shop, session, topic, admin } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Webhook requests can trigger multiple times and after an app has already been uninstalled.
  // If this webhook already ran, the session may have been deleted previously.
  if (session) {
    try {
      // Find all active running sales for this shop
      const runningSales = await db.sale.findMany({
        where: {
          shop: shop,
          status: "Running"
        },
        include: { items: true }
      });

      if (runningSales.length > 0 && admin) {
        console.log(`Found ${runningSales.length} active sales for ${shop} during uninstall. Attempting to revert prices.`);
        
        for (const sale of runningSales) {
          const groupedByProduct = {};
          
          for (const item of sale.items) {
            if (!item.variantId || !item.productId) continue;
            if (!groupedByProduct[item.productId]) {
              groupedByProduct[item.productId] = [];
            }
            groupedByProduct[item.productId].push({
              id: item.variantId,
              price: item.originalPrice.toString(),
              compareAtPrice: null
            });
          }

          for (const [productId, variants] of Object.entries(groupedByProduct)) {
            try {
              // Revert price and clear compareAtPrice
              await applyProductVariantsPrice(admin, productId, variants);
            } catch (error) {
              console.error(`Failed to revert price for product ${productId} during uninstall:`, error.message || error);
            }
          }

          // Mark sale as Failed/Aborted
          await db.sale.update({
            where: { id: sale.id },
            data: { status: "Failed" }
          });
        }
      }
    } catch (error) {
      console.error(`Error during uninstall cleanup for ${shop}:`, error);
    }

    // Safely delete the session only AFTER reverting active sales
    await db.session.deleteMany({ where: { shop } });
  }

  return new Response();
};
