import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { searchProducts } from "../services/product.server";
import { ProductsLayout } from "../components/products/ProductsLayout";
import { useLoaderData, useNavigation, useSubmit } from "react-router";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const query = url.searchParams.get("q") || "";
  const cursor = url.searchParams.get("cursor");
  const direction = url.searchParams.get("direction") || "next";

  try {
    const productsData = await searchProducts(admin, { query, cursor, direction });
    return { data: productsData, error: null, query };
  } catch (error) {
    return { data: null, error: error.message, query };
  }
};

export default function ProductsPage() {
  const { data, error, query } = useLoaderData();
  const navigation = useNavigation();
  const submit = useSubmit();
  
  const isLoading = navigation.state === "loading" || navigation.state === "submitting";

  const handleSearch = (newQuery) => {
    // Submit an empty object if no query to clear the URL params
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
    <ProductsLayout 
      data={data} 
      error={error} 
      isLoading={isLoading} 
      initialQuery={query}
      onSearch={handleSearch}
      onPaginate={handlePaginate}
    />
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
