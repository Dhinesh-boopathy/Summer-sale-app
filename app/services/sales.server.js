import prisma from "../db.server";

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
    variantIds.add(item.variantId);
  }
  return { name, startAt, endAt, variantIds: [...variantIds] };
}

async function assertNoOverlappingSale({ shop, variantIds, startAt, endAt, excludeId }) {
  if (!startAt || !endAt || variantIds.length === 0) return;
  const conflictingSale = await prisma.sale.findFirst({
    where: {
      shop,
      status: { in: ACTIVE_STATUSES },
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
    salePrice: Number(item.salePrice),
    imageUrl: item.imageUrl || null,
  }));
}

export async function createSale(data) {
  const { name, startAt, endAt, variantIds } = validateSaleData(data);
  await assertNoOverlappingSale({ shop: data.shop, variantIds, startAt, endAt });
  const status = startAt && endAt ? "Scheduled" : "Draft";
  return prisma.sale.create({
    data: {
      shop: data.shop,
      name,
      saleType: data.saleType === "COLLECTION" ? "COLLECTION" : "PRODUCT",
      collections: data.collections || null,
      status,
      startAt,
      endAt,
      scheduledAt: status === "Scheduled" ? new Date() : null,
      items: { create: saleItems(data.items) },
    },
  });
}

export async function updateSale(shop, id, data) {
  const { name, startAt, endAt, variantIds } = validateSaleData(data);
  await assertNoOverlappingSale({ shop, variantIds, startAt, endAt, excludeId: id });
  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findFirst({ where: { id, shop } });
    if (!sale) throw new Error("Sale not found.");
    if (!EDITABLE_STATUSES.includes(sale.status)) throw new Error("Only draft or scheduled sales can be edited.");

    const status = startAt && endAt ? "Scheduled" : "Draft";
    await tx.saleItem.deleteMany({ where: { saleId: id } });
    return tx.sale.update({
      where: { id },
      data: {
        name,
        saleType: data.saleType === "COLLECTION" ? "COLLECTION" : "PRODUCT",
        collections: data.collections || null,
        status,
        startAt,
        endAt,
        scheduledAt: status === "Scheduled" ? new Date() : null,
        items: { create: saleItems(data.items) },
      },
    });
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
