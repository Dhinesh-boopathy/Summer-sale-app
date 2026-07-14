import shopify from "../shopify.server";

export async function getOfflineGraphqlClient(shop) {
  const sessionId = shopify.api.session.getOfflineId(shop);
  const session = await shopify.config.sessionStorage.loadSession(sessionId);
  
  if (!session) {
    throw new Error(`No offline session found for shop: ${shop}`);
  }

  const client = new shopify.api.clients.Graphql({ session });
  return client;
}

export async function applyVariantPrice(client, variantId, newPrice) {
  const mutation = `
    mutation productVariantUpdate($input: ProductVariantInput!) {
      productVariantUpdate(input: $input) {
        productVariant {
          id
          price
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const response = await client.request(mutation, {
    variables: {
      input: {
        id: variantId,
        price: newPrice.toString()
      }
    }
  });

  if (response.data?.productVariantUpdate?.userErrors?.length > 0) {
    throw new Error(response.data.productVariantUpdate.userErrors.map(e => e.message).join(", "));
  }

  return true;
}

export async function restoreVariantPrice(client, variantId, originalPrice) {
  return applyVariantPrice(client, variantId, originalPrice);
}
