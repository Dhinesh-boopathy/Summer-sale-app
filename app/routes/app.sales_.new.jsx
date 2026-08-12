import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { searchProducts, searchCollections, getCollectionVariants } from "../services/product.server";
import { createSale } from "../services/sales.server";
import { SaleEditorLayout } from "../components/sales/SaleEditorLayout";
import { useLoaderData, useNavigation, useSubmit, redirect } from "react-router";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const query = url.searchParams.get("q") || "";
  const cursor = url.searchParams.get("cursor");
  const direction = url.searchParams.get("direction") || "next";
  const saleType = url.searchParams.get("saleType") || "PRODUCT";

  try {
    const searchResultData = saleType === "COLLECTION" 
      ? await searchCollections(admin, { query, cursor, direction })
      : await searchProducts(admin, { query, cursor, direction });
    return { shop: session.shop, searchResults: searchResultData, searchError: null, query, saleType };
  } catch (error) {
    return { shop: session.shop, searchResults: null, searchError: error.message, query, saleType };
  }
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  
  if (formData.get("intent") === "save") {
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
      
      for (const col of collections) {
        const variants = await getCollectionVariants(admin, col.collectionId);
        for (const variant of variants) {
          variantsMap.set(variant.variantId, {
            ...variant,
            salePrice: col.salePrice
          });
        }
      }
      itemsToSave = Array.from(variantsMap.values());
    }
    
    await createSale({
      shop: session.shop,
      name: saleName,
      saleType: saleType,
      collections: collectionsJson,
      startAt: startAt || null,
      endAt: endAt || null,
      items: itemsToSave
    });
    
    return redirect("/app/sales");
  }
  return null;
};

export default function NewSalePage() {
  const { searchResults, searchError, query, saleType } = useLoaderData();
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
      initialProducts={[]}
      initialCollections={[]}
      initialSaleType={saleType}
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
