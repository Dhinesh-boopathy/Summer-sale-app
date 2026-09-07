import cron from "node-cron";
import prisma from "../db.server";
import { getOfflineGraphqlClient, applyProductVariantsPrice } from "./shopifyPrice.server";

console.log("Scheduler initializing...");

cron.schedule("* * * * *", async () => {
  try {
    await processScheduledSales();
    await processRunningSales();
  } catch (error) {
    console.error("Scheduler encountered a critical error:", error);
  }
});

const salePriceForItem = (item) => item.salePrice;
const originalPriceForItem = (item) => item.originalPrice;
const SHOPIFY_MUTATION_DELAY_MS = 250;

function groupItemsByProduct(items, priceForItem, isStarting) {
  return items.reduce((groups, item) => {
    if (!item.variantId || !item.productId) return groups;
    groups[item.productId] ||= [];
    groups[item.productId].push({
      id: item.variantId,
      price: priceForItem(item).toString(),
      compareAtPrice: isStarting ? item.originalPrice.toString() : null,
      dbId: item.id,
    });
    return groups;
  }, {});
}

async function updateGroups(client, groups, timestampField) {
  let failed = false;
  for (const [productId, variants] of Object.entries(groups)) {
    try {
      await applyProductVariantsPrice(client, productId, variants.map(({ id, price, compareAtPrice }) => ({ id, price, compareAtPrice })));
      await prisma.saleItem.updateMany({
        where: { id: { in: variants.map((variant) => variant.dbId) } },
        data: { [timestampField]: new Date() },
      });
    } catch (error) {
      failed = true;
      console.error(`Failed to update product ${productId}:`, error.message || error);
    } finally {
      // Keep mutation throughput below Shopify's restore rate to avoid throttling.
      await new Promise((resolve) => setTimeout(resolve, SHOPIFY_MUTATION_DELAY_MS));
    }
  }
  return failed;
}

async function processScheduledSales() {
  const salesToStart = await prisma.sale.findMany({
    where: { status: { in: ["Scheduled", "Starting"] }, startAt: { lte: new Date() } },
    include: { items: { where: { appliedAt: null } } },
  });

  for (const sale of salesToStart) {
    if (sale.status === "Scheduled") {
      const claimed = await prisma.sale.updateMany({
        where: { id: sale.id, status: "Scheduled" },
        data: { status: "Starting" },
      });
      if (claimed.count === 0) continue;
    }

    try {
      if (sale.items.length > 0) {
        const client = await getOfflineGraphqlClient(sale.shop);
        const failed = await updateGroups(client, groupItemsByProduct(sale.items, salePriceForItem, true), "appliedAt");
        if (failed) continue;
      }

      const remainingItems = await prisma.saleItem.count({ where: { saleId: sale.id, appliedAt: null } });
      if (remainingItems === 0) {
        await prisma.sale.updateMany({ where: { id: sale.id, status: "Starting" }, data: { status: "Running" } });
      }
    } catch (error) {
      // Preserve Starting so a restart or transient error resumes only unapplied items.
      console.error(`Failed to start sale ${sale.name}:`, error.message || error);
    }
  }
}

async function processRunningSales() {
  const salesToEnd = await prisma.sale.findMany({
    where: { status: { in: ["Running", "Ending"] }, endAt: { lte: new Date() } },
    include: { items: { where: { appliedAt: { not: null }, restoredAt: null } } },
  });

  for (const sale of salesToEnd) {
    if (sale.status === "Running") {
      const claimed = await prisma.sale.updateMany({
        where: { id: sale.id, status: "Running" },
        data: { status: "Ending" },
      });
      if (claimed.count === 0) continue;
    }

    try {
      // Restore only variants whose sale price was recorded as successfully applied.
      if (sale.items.length > 0) {
        const client = await getOfflineGraphqlClient(sale.shop);
        const failed = await updateGroups(client, groupItemsByProduct(sale.items, originalPriceForItem, false), "restoredAt");
        if (failed) continue;
      }

      const remainingItems = await prisma.saleItem.count({
        where: { saleId: sale.id, appliedAt: { not: null }, restoredAt: null },
      });
      if (remainingItems === 0) {
        await prisma.sale.updateMany({ where: { id: sale.id, status: "Ending" }, data: { status: "Completed" } });
      }
    } catch (error) {
      // Preserve Ending so a restart or transient error retries the remaining restores.
      console.error(`Failed to end sale ${sale.name}:`, error.message || error);
    }
  }
}
