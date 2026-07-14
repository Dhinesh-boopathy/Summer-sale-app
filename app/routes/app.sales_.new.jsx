import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { searchProducts } from "../services/product.server";
import { createSale } from "../services/sales.server";
import { SaleEditorLayout } from "../components/sales/SaleEditorLayout";
import { useLoaderData, useNavigation, useSubmit, redirect } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const query = url.searchParams.get("q") || "";
  const cursor = url.searchParams.get("cursor");
  const direction = url.searchParams.get("direction") || "next";

  try {
    const productsData = await searchProducts(admin, { query, cursor, direction });
    return { shop: session.shop, searchResults: productsData, searchError: null, query };
  } catch (error) {
    return { shop: session.shop, searchResults: null, searchError: error.message, query };
  }
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  
  if (formData.get("intent") === "save") {
    const saleName = formData.get("saleName");
    const startAt = formData.get("startAt");
    const endAt = formData.get("endAt");
    const products = JSON.parse(formData.get("products") || "[]");
    
    await createSale({
      shop: session.shop,
      name: saleName,
      startAt: startAt || null,
      endAt: endAt || null,
      items: products
    });
    
    return redirect("/app/sales");
  }
  return null;
};

export default function NewSalePage() {
  const { shop, searchResults, searchError, query } = useLoaderData();
  const navigation = useNavigation();
  const submit = useSubmit();
  const shopify = useAppBridge();
  
  const isSearching = navigation.state === "loading" && !navigation.formData?.get("intent");

  const handleSearch = (newQuery) => {
    if (!newQuery) {
      submit({}, { replace: true });
    } else {
      submit({ q: newQuery }, { replace: true });
    }
  };

  const handlePaginate = (newCursor, dir) => {
    const params = {};
    if (query) params.q = query;
    if (newCursor) {
      params.cursor = newCursor;
      params.direction = dir;
    }
    submit(params);
  };

  return (
    <SaleEditorLayout 
      initialSaleName=""
      initialProducts={[]}
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
