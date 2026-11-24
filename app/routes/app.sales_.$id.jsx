import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { searchProducts, searchCollections, getCollectionVariants } from "../services/product.server";
import { updateSale, getSale } from "../services/sales.server";
import { refreshSaleItemPrices } from "../services/shopifyPrice.server";
import { getProductLimit, getShopPlan } from "../services/plans.server";
import { SaleEditorLayout } from "../components/sales/SaleEditorLayout";
import { useActionData, useLoaderData, useNavigation, useSubmit, redirect } from "react-router";

export const loader = async ({ request, params }) => {
  const { admin, session } = await authenticate.admin(request);
  const plan = getShopPlan(session.shop);
  const productLimit = getProductLimit(plan);
  const sale = await getSale(session.shop, params.id);
  
  if (!sale) {
    throw new Response("Not Found", { status: 404 });
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("q") || "";
  const cursor = url.searchParams.get("cursor");
  const direction = url.searchParams.get("direction") || "next";
  
  // For existing sales, we default to the sale's actual type. 
  // But if the user toggled it in the search bar, we use that.
  const urlSaleType = url.searchParams.get("saleType");
  const currentSaleType = urlSaleType || sale.saleType || "PRODUCT";

  try {
    const searchResultData = currentSaleType === "COLLECTION"
      ? await searchCollections(admin, { query, cursor, direction })
      : await searchProducts(admin, { query, cursor, direction });
    return { sale, searchResults: searchResultData, searchError: null, query, currentSaleType, plan, productLimit };
  } catch (error) {
    return { sale, searchResults: null, searchError: error.message, query, currentSaleType, plan, productLimit };
  }
};

export const action = async ({ request, params }) => {
  const { admin, session } = await authenticate.admin(request);
  const plan = getShopPlan(session.shop);
  const productLimit = getProductLimit(plan);
  const formData = await request.formData();
  
  if (formData.get("intent") === "save") {
    try {
    const saleName = formData.get("saleName");
    const saleType = formData.get("saleType") || "PRODUCT";
    const startAt = formData.get("startAt");
    const endAt = formData.get("endAt");
    
    let itemsToSave = [];
    let collectionsJson = null;

    if (saleType === "PRODUCT") {
      itemsToSave = JSON.parse(formData.get("products") || "[]");
    } else {
      const collections = JSON.parse(formData.get("collections") || "[]");
      collectionsJson = collections;
      const variantsMap = new Map();
      const productIds = new Set();
      
      for (const col of collections) {
        const variants = await getCollectionVariants(admin, col.collectionId, { maxProducts: productLimit + 1 });
        for (const variant of variants) {
          if (!productIds.has(variant.productId) && productIds.size >= productLimit) {
            throw new Error(`Your plan allows up to ${productLimit.toLocaleString()} products per sale. The selected collections exceed that limit.`);
          }
          productIds.add(variant.productId);
          variantsMap.set(variant.variantId, {
            ...variant,
            salePrice: col.salePrice
          });
        }
      }
      itemsToSave = Array.from(variantsMap.values());
    }

    itemsToSave = await refreshSaleItemPrices(admin, itemsToSave);
    
    await updateSale(session.shop, params.id, {
      name: saleName,
      plan,
      saleType: saleType,
      collections: collectionsJson,
      startAt: startAt || null,
      endAt: endAt || null,
      items: itemsToSave
    });
    
    return redirect("/app/sales");
    } catch (error) {
      console.error("Unable to update sale:", error);
      return { actionError: error.message || "Could not save this sale. Please try again." };
    }
  }
  return null;
};

export default function SaleDetailsPage() {
  const { sale, searchResults, searchError, query, currentSaleType, plan, productLimit } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const submit = useSubmit();
  
  const isSearching = navigation.state === "loading" && !navigation.formData?.get("intent");

  const handleSearch = (newQuery, searchSaleType) => {
    const params = {};
    if (newQuery) params.q = newQuery;
    if (searchSaleType) params.saleType = searchSaleType;
    submit(params, { replace: true, preventScrollReset: true });
  };

  const handlePaginate = (newCursor, dir) => {
    const params = {};
    if (query) params.q = query;
    if (currentSaleType) params.saleType = currentSaleType;
    if (newCursor) {
      params.cursor = newCursor;
      params.direction = dir;
    }
    submit(params, { preventScrollReset: true });
  };

  let initialProducts = [];
  let initialCollections = [];
  
  // Only map items if the sale type matches what we are currently viewing
  // Actually, sale.items are always variants. For PRODUCT type we show them.
  if (sale.saleType === "PRODUCT" || !sale.saleType) {
    initialProducts = sale.items.map(item => ({
      id: item.variantId || item.id,
      productId: item.productId,
      variantId: item.variantId,
      title: item.productTitle,
      sku: item.sku,
      originalPrice: item.originalPrice,
      salePrice: item.salePrice,
      imageUrl: item.imageUrl,
      imageAlt: item.productTitle
    }));
  }

  // Parse stored collections array
  if (sale.saleType === "COLLECTION" && sale.collections) {
    initialCollections = Array.isArray(sale.collections) ? sale.collections.map(c => ({
      ...c,
      id: c.collectionId
    })) : [];
  }

  const isEditable = sale.status === "Draft" || sale.status === "Scheduled";
  const formattedStart = sale.startAt ? new Date(sale.startAt).toISOString() : "";
  const formattedEnd = sale.endAt ? new Date(sale.endAt).toISOString() : "";

  return (
    <SaleEditorLayout 
      initialSaleName={sale.name}
      actionError={actionData?.actionError}
      saleStatus={sale.status}
      failureReason={sale.failureReason}
      initialProducts={initialProducts}
      initialCollections={initialCollections}
      initialSaleType={sale.saleType || "PRODUCT"}
      plan={plan}
      productLimit={productLimit}
      initialStartAt={formattedStart}
      initialEndAt={formattedEnd}
      isEditable={isEditable}
      searchResults={searchResults}
      searchError={searchError}
      isSearching={isSearching}
      searchQuery={query}
      onSearch={handleSearch}
      onPaginate={handlePaginate}
    />
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
