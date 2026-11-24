import shopify from "../shopify.server.js";

export async function getOfflineGraphqlClient(shop) {
  try {
    const { admin } = await shopify.unauthenticated.admin(shop);
    return admin;
  } catch (error) {
    throw new Error(`Failed to load offline session for shop: ${shop}. Error: ${error.message}`);
  }
}

export async function applyProductVariantsPrice(admin, productId, variants) {
  const mutation = `
    mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants {
          id
          price
          compareAtPrice
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const response = await admin.graphql(mutation, {
    variables: {
      productId: productId,
      variants: variants
    }
  });

  const responseJson = await response.json();

  if (responseJson.errors) {
    throw new Error(responseJson.errors.map(e => e.message).join(", "));
  }

  if (responseJson.data?.productVariantsBulkUpdate?.userErrors?.length > 0) {
    throw new Error(responseJson.data.productVariantsBulkUpdate.userErrors.map(e => e.message).join(", "));
  }

  return true;
}

export async function getProductVariantPrices(admin, variantIds) {
  const response = await admin.graphql(`#graphql
    query ProductVariantPrices($ids: [ID!]!) {
      nodes(ids: $ids) {
        ... on ProductVariant { id price compareAtPrice product { id } }
      }
    }
  `, { variables: { ids: variantIds } });
  const json = await response.json();
  if (json.errors) throw new Error(json.errors.map((error) => error.message).join(", "));

  const variants = (json.data?.nodes || []).filter(Boolean);
  return new Map(variants.map((variant) => [variant.id, variant]));
}

export async function refreshSaleItemPrices(admin, items) {
  const byId = new Map();
  const ids = [...new Set(items.map((item) => item.variantId).filter(Boolean))];
  for (let offset = 0; offset < ids.length; offset += 250) {
    const variants = await getProductVariantPrices(admin, ids.slice(offset, offset + 250));
    for (const [id, variant] of variants) byId.set(id, variant);
  }

  return items.map((item) => {
    const variant = byId.get(item.variantId);
    if (!variant || variant.product?.id !== item.productId) {
      throw new Error(`Could not verify product variant ${item.variantId} in Shopify.`);
    }
    const originalPrice = Number(variant.price);
    const salePrice = Number(item.salePrice);
    if (!Number.isFinite(originalPrice) || !Number.isFinite(salePrice) || salePrice < 0 || salePrice > originalPrice) {
      throw new Error(`The sale price for ${item.title} must be between zero and its current Shopify price.`);
    }
    return {
      ...item,
      originalPrice,
      originalCompareAtPrice: variant.compareAtPrice ?? null,
      priceSnapshotComplete: true,
    };
  });
}
