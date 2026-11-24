import { randomUUID } from "node:crypto";
import prisma from "../db.server.js";
import { getOfflineGraphqlClient } from "./shopifyPrice.server.js";
import { reconcileSaleItem } from "./sale-pricing.server.js";

const SCHEDULER_LOCK_ID = "sales-scheduler";
const SCHEDULER_LOCK_MS = 55 * 1000;
const SALE_CLAIM_MS = 55 * 1000;
const HEARTBEAT_MS = 15 * 1000;
const SHOPIFY_MUTATION_DELAY_MS = 250;

async function acquireSchedulerLock(ownerToken) {
  const now = new Date();
  const lockedUntil = new Date(now.getTime() + SCHEDULER_LOCK_MS);
  const renewed = await prisma.schedulerLock.updateMany({
    where: { id: SCHEDULER_LOCK_ID, lockedUntil: { lte: now } },
    data: { lockedUntil, ownerToken },
  });
  if (renewed.count > 0) return true;

  try {
    await prisma.schedulerLock.create({
      data: { id: SCHEDULER_LOCK_ID, lockedUntil, ownerToken },
    });
    return true;
  } catch (error) {
    if (error?.code === "P2002") return false;
    throw error;
  }
}

async function renewSchedulerLock(ownerToken) {
  const result = await prisma.schedulerLock.updateMany({
    where: { id: SCHEDULER_LOCK_ID, ownerToken },
    data: { lockedUntil: new Date(Date.now() + SCHEDULER_LOCK_MS) },
  });
  return result.count === 1;
}

async function releaseSchedulerLock(ownerToken) {
  await prisma.schedulerLock.updateMany({
    where: { id: SCHEDULER_LOCK_ID, ownerToken },
    data: { lockedUntil: new Date(), ownerToken: null },
  });
}

async function claimSale(sale, ownerToken, nextStatus) {
  const now = new Date();
  return prisma.sale.updateMany({
    where: {
      id: sale.id,
      shop: sale.shop,
      status: sale.status,
      ...(sale.status === "Scheduled" || sale.status === "Starting" ? { startAt: { lte: now } } : {}),
      ...(sale.status === "Running" || sale.status === "Ending" ? { endAt: { lte: now } } : {}),
      OR: [{ claimedAt: null }, { claimedAt: { lte: new Date(now.getTime() - SALE_CLAIM_MS) } }],
    },
    data: {
      claimedAt: now,
      claimOwner: ownerToken,
      ...(nextStatus ? { status: nextStatus } : {}),
    },
  });
}

async function releaseSaleClaim(saleId, ownerToken) {
  await prisma.sale.updateMany({
    where: { id: saleId, claimOwner: ownerToken },
    data: { claimedAt: null, claimOwner: null },
  });
}

async function assertOwnership(saleId, ownerToken) {
  const [lock, sale] = await Promise.all([
    prisma.schedulerLock.findFirst({
      where: { id: SCHEDULER_LOCK_ID, ownerToken, lockedUntil: { gt: new Date() } },
      select: { id: true },
    }),
    prisma.sale.findFirst({
      where: { id: saleId, claimOwner: ownerToken, claimedAt: { gt: new Date(Date.now() - SALE_CLAIM_MS) } },
      select: { id: true },
    }),
  ]);
  if (!lock || !sale) throw new Error("Scheduler or sale claim was lost before the Shopify mutation.");
}

async function failSale(sale, expectedStatus, reason) {
  await prisma.sale.updateMany({
    where: { id: sale.id, status: expectedStatus },
    data: { status: "Failed", failureReason: reason },
  });
  console.error(`Sale ${sale.name} requires manual attention: ${reason}`);
}

async function processStart(sale, ownerToken) {
  const freshSale = await prisma.sale.findFirst({
    where: { id: sale.id, shop: sale.shop, claimOwner: ownerToken },
    include: { items: { where: { applyStatus: "PENDING" } } },
  });
  if (!freshSale) return;
  const existingConflicts = await prisma.saleItem.count({
    where: { saleId: freshSale.id, applyStatus: "CONFLICT" },
  });
  if (existingConflicts > 0) {
    await failSale(freshSale, "Starting", "A variant conflict was already recorded; no additional sale prices were applied.");
    return;
  }

  try {
    const client = await getOfflineGraphqlClient(freshSale.shop);
    let hasConflict = false;
    for (const item of freshSale.items) {
      const result = await reconcileSaleItem(client, item, "start", prisma, () => assertOwnership(freshSale.id, ownerToken));
      if (result === "conflict") hasConflict = true;
      await new Promise((resolve) => setTimeout(resolve, SHOPIFY_MUTATION_DELAY_MS));
    }

    const [pending, conflicts] = await Promise.all([
      prisma.saleItem.count({ where: { saleId: freshSale.id, applyStatus: "PENDING" } }),
      prisma.saleItem.count({ where: { saleId: freshSale.id, applyStatus: "CONFLICT" } }),
    ]);
    if (hasConflict || conflicts > 0) {
      await failSale(freshSale, "Starting", "One or more variants changed or could not be reconciled; safely applied variants will be restored.");
    } else if (pending === 0) {
      await prisma.sale.updateMany({
        where: { id: freshSale.id, status: "Starting", claimOwner: ownerToken },
        data: { status: "Running" },
      });
    }
  } catch (error) {
    console.error(`Failed to start sale ${freshSale.name}:`, error.message || error);
  }
}

async function processEnd(sale, ownerToken) {
  const isFailedSale = sale.status === "Failed";
  const freshSale = await prisma.sale.findFirst({
    where: { id: sale.id, shop: sale.shop, claimOwner: ownerToken },
    include: {
      items: {
        where: {
          applyStatus: isFailedSale ? { in: ["PENDING", "APPLIED"] } : "APPLIED",
          restoreStatus: "PENDING",
        },
      },
    },
  });
  if (!freshSale) return;

  try {
    const client = await getOfflineGraphqlClient(freshSale.shop);
    let hasConflict = false;
    for (const item of freshSale.items) {
      const direction = isFailedSale && item.applyStatus === "PENDING" ? "uninstall" : "end";
      const result = await reconcileSaleItem(client, item, direction, prisma, () => assertOwnership(freshSale.id, ownerToken));
      if (result === "conflict") hasConflict = true;
      await new Promise((resolve) => setTimeout(resolve, SHOPIFY_MUTATION_DELAY_MS));
    }

    const [pending, conflicts] = await Promise.all([
      prisma.saleItem.count({
        where: {
          saleId: freshSale.id,
          restoreStatus: "PENDING",
          applyStatus: isFailedSale ? { in: ["PENDING", "APPLIED"] } : "APPLIED",
        },
      }),
      prisma.saleItem.count({ where: { saleId: freshSale.id, restoreStatus: "CONFLICT" } }),
    ]);
    if (hasConflict || conflicts > 0) {
      if (freshSale.status !== "Failed") {
        await failSale(freshSale, "Ending", "One or more variants changed outside this sale; those variants were left untouched.");
      }
    } else if (pending === 0 && freshSale.status === "Ending") {
      await prisma.sale.updateMany({
        where: { id: freshSale.id, status: "Ending", claimOwner: ownerToken },
        data: { status: "Completed" },
      });
    }
  } catch (error) {
    console.error(`Failed to end sale ${freshSale.name}:`, error.message || error);
  }
}

async function withSaleClaim(sale, ownerToken, nextStatus, work, setActiveSale) {
  const claimed = await claimSale(sale, ownerToken, nextStatus);
  if (claimed.count === 0) return;

  setActiveSale(sale.id);
  const heartbeat = setInterval(async () => {
    await prisma.sale.updateMany({
      where: { id: sale.id, claimOwner: ownerToken },
      data: { claimedAt: new Date() },
    }).catch((error) => console.error("Failed to renew sale claim:", error.message || error));
  }, HEARTBEAT_MS);
  heartbeat.unref?.();

  try {
    await work({ ...sale, status: nextStatus || sale.status });
  } finally {
    clearInterval(heartbeat);
    setActiveSale(null);
    await releaseSaleClaim(sale.id, ownerToken);
  }
}

export async function processScheduledSales(ownerToken, setActiveSale = () => {}) {
  const sales = await prisma.sale.findMany({
    where: { status: { in: ["Scheduled", "Starting"] }, startAt: { lte: new Date() } },
  });
  for (const sale of sales) {
    await withSaleClaim(sale, ownerToken, "Starting", (claimedSale) => processStart(claimedSale, ownerToken), setActiveSale);
  }
}

export async function processRunningSales(ownerToken, setActiveSale = () => {}) {
  const sales = await prisma.sale.findMany({
    where: {
      OR: [
        { status: { in: ["Running", "Ending"] }, endAt: { lte: new Date() } },
        { status: "Failed", items: { some: { applyStatus: { in: ["PENDING", "APPLIED"] }, restoreStatus: "PENDING" } } },
      ],
    },
  });
  for (const sale of sales) {
    const nextStatus = sale.status === "Running" ? "Ending" : null;
    await withSaleClaim(sale, ownerToken, nextStatus, (claimedSale) => processEnd(claimedSale, ownerToken), setActiveSale);
  }
}

export async function runSalesScheduler() {
  const ownerToken = randomUUID();
  if (!(await acquireSchedulerLock(ownerToken))) return false;

  let activeSaleId = null;
  let heartbeatPending = null;
  let lockLost = false;
  const heartbeat = setInterval(() => {
    if (heartbeatPending) return;
    heartbeatPending = (async () => {
      const retained = await renewSchedulerLock(ownerToken);
      if (!retained) {
        lockLost = true;
        return;
      }
      if (activeSaleId) {
        await prisma.sale.updateMany({
          where: { id: activeSaleId, claimOwner: ownerToken },
          data: { claimedAt: new Date() },
        });
      }
    })().catch((error) => {
      console.error("Failed to renew sales scheduler lease:", error.message || error);
    }).finally(() => { heartbeatPending = null; });
  }, HEARTBEAT_MS);
  heartbeat.unref?.();

  const setActiveSale = (id) => { activeSaleId = id; };
  try {
    await processScheduledSales(ownerToken, setActiveSale);
    if (!lockLost) await processRunningSales(ownerToken, setActiveSale);
    return !lockLost;
  } finally {
    clearInterval(heartbeat);
    if (heartbeatPending) await heartbeatPending;
    await releaseSchedulerLock(ownerToken);
  }
}

