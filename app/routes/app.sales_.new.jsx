import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { searchProducts, searchCollections, getCollectionVariants } from "../services/product.server";
import { createSale } from "../services/sales.server";
import { refreshSaleItemPrices } from "../services/shopifyPrice.server";
import { getProductLimit, getShopPlan } from "../services/plans.server";
import { SaleEditorLayout } from "../components/sales/SaleEditorLayout";
import { useActionData, useLoaderData, useNavigation, useSubmit, redirect } from "react-router";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const plan = getShopPlan(session.shop);
  const productLimit = getProductLimit(plan);
  const url = new URL(request.url);
  const query = url.searchParams.get("q") || "";
  const cursor = url.searchParams.get("cursor");
  const direction = url.searchParams.get("direction") || "next";
  const saleType = url.searchParams.get("saleType") || "PRODUCT";

  try {
    const searchResultData = saleType === "COLLECTION" 
      ? await searchCollections(admin, { query, cursor, direction })
      : await searchProducts(admin, { query, cursor, direction });
    return { shop: session.shop, searchResults: searchResultData, searchError: null, query, saleType, plan, productLimit };
  } catch (error) {
    return { shop: session.shop, searchResults: null, searchError: error.message, query, saleType, plan, productLimit };
  }
};

export const action = async ({ request }) => {
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
    
    await createSale({
      shop: session.shop,
      plan,
      name: saleName,
      saleType: saleType,
      collections: collectionsJson,
      startAt: startAt || null,
      endAt: endAt || null,
      items: itemsToSave
    });
    
    return redirect("/app/sales");
    } catch (error) {
      console.error("Unable to save sale:", error);
      return { actionError: error.message || "Could not save this sale. Please try again." };
    }
  }
  return null;
};

export default function NewSalePage() {
  const { searchResults, searchError, query, saleType, plan, productLimit } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const submit = useSubmit();
  
  const isSearching = navigation.state === "loading" && !navigation.formData?.get("intent");

  const handleSearch = (newQuery, currentSaleType) => {
    const params = {};
    if (newQuery) params.q = newQuery;
    if (currentSaleType) params.saleType = currentSaleType;
    submit(params, { replace: true, preventScrollReset: true });
  };

  const handlePaginate = (newCursor, dir) => {
    const params = {};
    if (query) params.q = query;
    if (saleType) params.saleType = saleType;
    if (newCursor) {
      params.cursor = newCursor;
      params.direction = dir;
    }
    submit(params, { preventScrollReset: true });
  };

  return (
    <SaleEditorLayout 
      initialSaleName=""
      actionError={actionData?.actionError}
      initialProducts={[]}
      initialCollections={[]}
      initialSaleType={saleType}
      plan={plan}
      productLimit={productLimit}
      initialStartAt=""
      initialEndAt=""
      isEditable={true}
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
