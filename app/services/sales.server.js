import prisma from "../db.server";
import { Prisma } from "@prisma/client";
import { assertProductLimit, getProductLimit } from "./plans.server.js";

const EDITABLE_STATUSES = ["Draft", "Scheduled"];
const ACTIVE_STATUSES = ["Scheduled", "Starting", "Running", "Ending"];

function validateSaleData(data) {
  const name = typeof data.name === "string" ? data.name.trim() : "";
  const startAt = data.startAt ? new Date(data.startAt) : null;
  const endAt = data.endAt ? new Date(data.endAt) : null;

  if (!name) throw new Error("A sale name is required.");
  if (name.length > 120) throw new Error("Sale names must be 120 characters or fewer.");
  if ((startAt && !endAt) || (!startAt && endAt)) throw new Error("Both a start and end time are required for a scheduled sale.");
  if (startAt && endAt && (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt)) {
    throw new Error("The end time must be after the start time.");
  }
  if (!Array.isArray(data.items) || data.items.length === 0) throw new Error("A sale must contain at least one product variant.");
  assertProductLimit(data.items, getProductLimit(data.plan));

  const variantIds = new Set();
  for (const item of data.items) {
    const originalPrice = Number(item.originalPrice);
    const salePrice = Number(item.salePrice);
    if (!item.productId || !item.variantId || !item.title || !Number.isFinite(originalPrice) || !Number.isFinite(salePrice)) {
      throw new Error("Each sale item must include a valid product, variant, and price.");
    }
    if (originalPrice < 0 || salePrice < 0 || salePrice > originalPrice) {
      throw new Error("Sale prices must be between zero and the current product price.");
    }
    if (item.priceSnapshotComplete !== true || !(item.originalCompareAtPrice === null || typeof item.originalCompareAtPrice === "string")) {
      throw new Error("Shopify pricing must be refreshed before saving this sale.");
    }
    variantIds.add(item.variantId);
  }
  return { name, startAt, endAt, variantIds: [...variantIds] };
}

async function lockSaleVariants(tx, shop, variantIds) {
  const lockKeys = [...new Set(variantIds)].sort().map((variantId) => `${shop}:${variantId}`);
  for (let offset = 0; offset < lockKeys.length; offset += 250) {
    const values = Prisma.join(lockKeys.slice(offset, offset + 250).map((key) => Prisma.sql`(hashtextextended(${key}, 0))`));
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(lock_key) FROM (VALUES ${values}) AS locks(lock_key)`;
  }
}

async function assertNoOverlappingSale(tx, { shop, variantIds, startAt, endAt, excludeId }) {
  if (!startAt || !endAt || variantIds.length === 0) return;
  const conflictingSale = await tx.sale.findFirst({
    where: {
      shop,
      OR: [
        { status: { in: ACTIVE_STATUSES } },
        {
          status: "Failed",
          items: {
            some: {
              OR: [
                { applyStatus: { in: ["PENDING", "CONFLICT"] } },
                { applyStatus: "APPLIED", restoreStatus: { in: ["PENDING", "CONFLICT"] } },
                { restoreStatus: "CONFLICT" },
              ],
            },
          },
        },
      ],
      ...(excludeId ? { id: { not: excludeId } } : {}),
      startAt: { lt: endAt },
      endAt: { gt: startAt },
      items: { some: { variantId: { in: variantIds } } },
    },
    select: { name: true },
  });
  if (conflictingSale) throw new Error(`This sale overlaps with "${conflictingSale.name}" on one or more product variants.`);
}

function saleItems(items) {
  return items.map((item) => ({
    productId: item.productId,
    variantId: item.variantId,
    productTitle: item.title,
    sku: item.sku || "-",
    originalPrice: Number(item.originalPrice),
    originalCompareAtPrice: item.originalCompareAtPrice,
    priceSnapshotComplete: true,
    salePrice: Number(item.salePrice),
    imageUrl: item.imageUrl || null,
  }));
}

async function createSaleItems(tx, saleId, items) {
  const data = saleItems(items).map((item) => ({ ...item, saleId }));
  for (let offset = 0; offset < data.length; offset += 500) {
    await tx.saleItem.createMany({ data: data.slice(offset, offset + 500) });
  }
}

export async function createSale(data) {
  const { name, startAt, endAt, variantIds } = validateSaleData(data);
  const status = startAt && endAt ? "Scheduled" : "Draft";
  return prisma.$transaction(async (tx) => {
    if (status === "Scheduled") {
      await lockSaleVariants(tx, data.shop, variantIds);
      await assertNoOverlappingSale(tx, { shop: data.shop, variantIds, startAt, endAt });
    }
    const sale = await tx.sale.create({
      data: {
        shop: data.shop,
        name,
        saleType: data.saleType === "COLLECTION" ? "COLLECTION" : "PRODUCT",
        collections: data.collections || null,
        status,
        startAt,
        endAt,
        scheduledAt: status === "Scheduled" ? new Date() : null,
      },
    });
    await createSaleItems(tx, sale.id, data.items);
    return sale;
  });
}

export async function updateSale(shop, id, data) {
  const { name, startAt, endAt, variantIds } = validateSaleData(data);
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Sale" WHERE "id" = ${id} AND "shop" = ${shop} FOR UPDATE`;
    const sale = await tx.sale.findFirst({ where: { id, shop } });
    if (!sale) throw new Error("Sale not found.");
    if (!EDITABLE_STATUSES.includes(sale.status)) throw new Error("Only draft or scheduled sales can be edited.");

    const status = startAt && endAt ? "Scheduled" : "Draft";
    if (status === "Scheduled") {
      await lockSaleVariants(tx, shop, variantIds);
      await assertNoOverlappingSale(tx, { shop, variantIds, startAt, endAt, excludeId: id });
    }
    await tx.saleItem.deleteMany({ where: { saleId: id } });
    const updated = await tx.sale.update({
      where: { id },
      data: {
        name,
        saleType: data.saleType === "COLLECTION" ? "COLLECTION" : "PRODUCT",
        collections: data.collections || null,
        status,
        startAt,
        endAt,
        scheduledAt: status === "Scheduled" ? new Date() : null,
      },
    });
    await createSaleItems(tx, id, data.items);
    return updated;
  });
}

export async function deleteSale(shop, id) {
  const result = await prisma.sale.deleteMany({ where: { id, shop, status: { in: EDITABLE_STATUSES } } });
  if (result.count === 0) throw new Error("Only draft or scheduled sales can be deleted.");
}

export async function getSale(shop, id) {
  return prisma.sale.findFirst({ where: { id, shop }, include: { items: true } });
}

export async function listSales(shop, query = "") {
  return prisma.sale.findMany({
    where: { shop, name: { contains: query, mode: "insensitive" } },
    include: { _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" },
  });
}
