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

async function processScheduledSales() {
  const now = new Date();
  const scheduledSales = await prisma.sale.findMany({
    where: {
      status: "Scheduled",
      startAt: { lte: now }
    },
    include: { items: true }
  });

  for (const sale of scheduledSales) {
    console.log(`Starting scheduled sale: ${sale.name} (${sale.id})`);
    
    await prisma.sale.update({
      where: { id: sale.id },
      data: { status: "Starting" }
    });
    
    try {
      const client = await getOfflineGraphqlClient(sale.shop);
      let successCount = 0;

      const groupedByProduct = {};
      for (const item of sale.items) {
        if (!item.variantId || !item.productId) continue;
        if (!groupedByProduct[item.productId]) {
          groupedByProduct[item.productId] = [];
        }
        groupedByProduct[item.productId].push({
          id: item.variantId,
          price: item.salePrice.toString(),
          compareAtPrice: item.originalPrice.toString(),
          _dbId: item.id
        });
      }

      for (const [productId, variants] of Object.entries(groupedByProduct)) {
        try {
          const shopifyVariants = variants.map(v => ({ id: v.id, price: v.price, compareAtPrice: v.compareAtPrice }));
          await applyProductVariantsPrice(client, productId, shopifyVariants);
          
          const dbIds = variants.map(v => v._dbId);
          await prisma.saleItem.updateMany({
            where: { id: { in: dbIds } },
            data: { appliedAt: new Date() }
          });
          
          successCount += variants.length;
        } catch (itemError) {
          console.error(`Failed to apply sale price for product ${productId}:`, itemError.message || itemError);
        }
      }

      if (successCount > 0 || sale.items.length === 0) {
        await prisma.sale.update({
          where: { id: sale.id },
          data: { status: "Running" }
        });
        console.log(`Sale ${sale.name} is now RUNNING. Applied prices to ${successCount} items.`);
      } else {
        await prisma.sale.update({
          where: { id: sale.id },
          data: { status: "Failed" }
        });
        console.log(`Sale ${sale.name} FAILED to start. Applied prices to 0 items.`);
      }

    } catch (saleError) {
      console.error(`Failed to start sale ${sale.name}:`, saleError.message || saleError);
      await prisma.sale.update({
        where: { id: sale.id },
        data: { status: "Failed" }
      });
    }
  }
}

async function processRunningSales() {
  const now = new Date();
  const runningSales = await prisma.sale.findMany({
    where: {
      status: "Running",
      endAt: { lte: now }
    },
    include: { items: true }
  });

  for (const sale of runningSales) {
    console.log(`Ending running sale: ${sale.name} (${sale.id})`);
    
    await prisma.sale.update({
      where: { id: sale.id },
      data: { status: "Ending" }
    });
    
    try {
      const client = await getOfflineGraphqlClient(sale.shop);
      let successCount = 0;

      const groupedByProduct = {};
      for (const item of sale.items) {
        if (!item.variantId || !item.productId) continue;
        if (!groupedByProduct[item.productId]) {
          groupedByProduct[item.productId] = [];
        }
        groupedByProduct[item.productId].push({
          id: item.variantId,
          price: item.originalPrice.toString(),
          compareAtPrice: null,
          _dbId: item.id
        });
      }

      for (const [productId, variants] of Object.entries(groupedByProduct)) {
        try {
          const shopifyVariants = variants.map(v => ({ id: v.id, price: v.price, compareAtPrice: v.compareAtPrice }));
          await applyProductVariantsPrice(client, productId, shopifyVariants);
          
          const dbIds = variants.map(v => v._dbId);
          await prisma.saleItem.updateMany({
            where: { id: { in: dbIds } },
            data: { restoredAt: new Date() }
          });
          
          successCount += variants.length;
        } catch (itemError) {
          console.error(`Failed to restore price for product ${productId}:`, itemError.message || itemError);
        }
      }

      if (successCount > 0 || sale.items.length === 0) {
        await prisma.sale.update({
          where: { id: sale.id },
          data: { status: "Completed" }
        });
        console.log(`Sale ${sale.name} is now COMPLETED. Restored prices for ${successCount} items.`);
      } else {
        await prisma.sale.update({
          where: { id: sale.id },
          data: { status: "Failed" }
        });
        console.log(`Sale ${sale.name} FAILED to end properly. Restored prices for 0 items.`);
      }

    } catch (saleError) {
      console.error(`Failed to end sale ${sale.name}:`, saleError.message || saleError);
      await prisma.sale.update({
        where: { id: sale.id },
        data: { status: "Failed" }
      });
    }
  }
}
