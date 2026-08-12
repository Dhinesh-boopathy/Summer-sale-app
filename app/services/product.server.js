export async function searchProducts(admin, { query, cursor, direction = 'next', limit = 10 }) {
  const isNext = direction === 'next';
  const first = isNext ? limit : null;
  const last = isNext ? null : limit;
  const after = isNext && cursor ? cursor : null;
  const before = !isNext && cursor ? cursor : null;

  // Shopify query syntax allows matching title and sku.
  const searchQuery = query ? `title:*${query}* OR sku:*${query}*` : "";

  const graphqlQuery = `#graphql
    query SearchProducts($query: String, $first: Int, $last: Int, $after: String, $before: String) {
      products(first: $first, last: $last, after: $after, before: $before, query: $query) {
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
        nodes {
          id
          title
          status
          featuredImage {
            url
            altText
          }
          variants(first: 100) {
            nodes {
              id
              title
              sku
              price
              compareAtPrice
            }
          }
        }
      }
    }
  `;

  try {
    const response = await admin.graphql(graphqlQuery, {
      variables: {
        query: searchQuery,
        first,
        last,
        after,
        before
      }
    });

    const json = await response.json();

    if (json.errors) {
      console.error("GraphQL Errors:", json.errors);
      throw new Error(json.errors[0]?.message || "GraphQL Error");
    }

    return json.data.products;
  } catch (error) {
    console.error("Failed to fetch products:", error);
    throw new Error(error.message || "Network failure");
  }
}

export async function searchCollections(admin, { query, cursor, direction = 'next', limit = 10 }) {
  const isNext = direction === 'next';
  const first = isNext ? limit : null;
  const last = isNext ? null : limit;
  const after = isNext && cursor ? cursor : null;
  const before = !isNext && cursor ? cursor : null;

  const searchQuery = query ? `title:*${query}*` : "";

  const graphqlQuery = `#graphql
    query SearchCollections($query: String, $first: Int, $last: Int, $after: String, $before: String) {
      collections(first: $first, last: $last, after: $after, before: $before, query: $query) {
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
        nodes {
          id
          title
          image {
            url
            altText
          }
        }
      }
    }
  `;

  try {
    const response = await admin.graphql(graphqlQuery, {
      variables: { query: searchQuery, first, last, after, before }
    });
    const json = await response.json();
    if (json.errors) throw new Error(json.errors[0]?.message || "GraphQL Error");
    return json.data.collections;
  } catch (error) {
    console.error("Failed to fetch collections:", error);
    throw new Error(error.message || "Network failure");
  }
}

export async function getCollectionVariants(admin, collectionId) {
  let hasNextPage = true;
  let cursor = null;
  const allVariants = [];

  const graphqlQuery = `#graphql
    query GetCollectionVariants($id: ID!, $after: String) {
      collection(id: $id) {
        products(first: 50, after: $after) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            title
            featuredImage {
              url
            }
            variants(first: 100) {
              nodes {
                id
                title
                sku
                price
                compareAtPrice
              }
            }
          }
        }
      }
    }
  `;

  while (hasNextPage) {
    const response = await admin.graphql(graphqlQuery, {
      variables: { id: collectionId, after: cursor }
    });
    const json = await response.json();
    if (json.errors) throw new Error(json.errors[0]?.message || "GraphQL Error");
    
    const productsConnection = json.data.collection?.products;
    if (!productsConnection) break;

    for (const product of productsConnection.nodes) {
      const pTitle = product.title;
      const imageUrl = product.featuredImage?.url;
      const vNodes = product.variants?.nodes || [];
      
      for (const variant of vNodes) {
        allVariants.push({
          productId: product.id,
          variantId: variant.id,
          title: vNodes.length > 1 && variant.title && variant.title !== 'Default Title' 
            ? `${pTitle} - ${variant.title}` 
            : pTitle,
          sku: variant.sku || '-',
          originalPrice: parseFloat(variant.price || 0),
          imageUrl: imageUrl
        });
      }
    }

    hasNextPage = productsConnection.pageInfo.hasNextPage;
    cursor = productsConnection.pageInfo.endCursor;
  }

  return allVariants;
}
