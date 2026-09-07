import prisma from "../db.server";
import { getOfflineGraphqlClient, applyProductVariantsPrice, getProductVariantPrices } from "./shopifyPrice.server";

const salePriceForItem = (item) => item.salePrice;
const originalPriceForItem = (item) => item.originalPrice;
const SHOPIFY_MUTATION_DELAY_MS = 250;
const SCHEDULER_LOCK_ID = "sales-scheduler";
const SCHEDULER_LOCK_MS = 55 * 1000;

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

function pricesEqual(first, second) {
  return Number(first).toFixed(4) === Number(second).toFixed(4);
}

async function verifyExpectedPrices(client, items, expectedPriceForItem) {
  const groups = groupItemsByProduct(items, expectedPriceForItem, false);
  for (const variants of Object.values(groups)) {
    const currentPrices = await getProductVariantPrices(client, variants.map((variant) => variant.id));
    if (variants.some((variant) => !currentPrices.has(variant.id) || !pricesEqual(currentPrices.get(variant.id).price, variant.price))) {
      return false;
    }
  }
  return true;
}

async function failSale(sale, expectedStatus, reason) {
  await prisma.sale.updateMany({
    where: { id: sale.id, status: expectedStatus },
    data: { status: "Failed", failureReason: reason },
  });
  console.error(`Sale ${sale.name} requires manual attention: ${reason}`);
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

export async function processScheduledSales() {
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
        if (!(await verifyExpectedPrices(client, sale.items, originalPriceForItem))) {
          await failSale(sale, "Starting", "A product price changed after this sale was scheduled. No sale prices were applied.");
          continue;
        }
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

export async function processRunningSales() {
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
        if (!(await verifyExpectedPrices(client, sale.items, salePriceForItem))) {
          await failSale(sale, "Ending", "A sale price was changed outside the app, so prices were not restored automatically.");
          continue;
        }
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

async function acquireSchedulerLock() {
  const now = new Date();
  const lockedUntil = new Date(now.getTime() + SCHEDULER_LOCK_MS);
  const renewed = await prisma.schedulerLock.updateMany({
    where: { id: SCHEDULER_LOCK_ID, lockedUntil: { lt: now } },
    data: { lockedUntil },
  });
  if (renewed.count > 0) return true;

  try {
    await prisma.schedulerLock.create({ data: { id: SCHEDULER_LOCK_ID, lockedUntil } });
    return true;
  } catch (error) {
    // Another worker created or renewed the lock first.
    if (error?.code === "P2002") return false;
    throw error;
  }
}

export async function runSalesScheduler() {
  if (!(await acquireSchedulerLock())) return false;

  try {
    await processScheduledSales();
    await processRunningSales();
    return true;
  } finally {
    await prisma.schedulerLock.update({
      where: { id: SCHEDULER_LOCK_ID },
      data: { lockedUntil: new Date() },
    });
  }
}
