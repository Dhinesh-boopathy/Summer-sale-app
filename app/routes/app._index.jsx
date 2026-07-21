import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { listSales } from "../services/sales.server";
import { DashboardLayout } from "../components/dashboard/DashboardLayout";
import { useLoaderData, useRouteError } from "react-router";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  
  // Fetch sales for the dashboard
  const sales = await listSales();
  
  // Attempt to fetch an approximate product count
  let totalProducts = 0;
  try {
    const response = await admin.graphql(`#graphql
      query {
        products(first: 250) {
          nodes {
            id
          }
        }
      }
    `);
    const json = await response.json();
    totalProducts = json?.data?.products?.nodes?.length || 0;
    if (totalProducts === 250) {
      totalProducts = "250+";
    }
  } catch (error) {
    console.error("Failed to fetch product count:", error);
  }

  return { 
    sales, 
    totalProducts, 
    shopName: session?.shop || "Admin"
  };
};

export default function Index() {
  const { sales, totalProducts, shopName } = useLoaderData();
  
  return (
    <DashboardLayout 
      sales={sales} 
      totalProducts={totalProducts} 
      shopName={shopName} 
    />
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};

export function ErrorBoundary() {
  const { useRouteError, isRouteErrorResponse } = require("react-router");
  const error = useRouteError();
  console.error(error);

  // If this is a Response (e.g. auth redirect), let Shopify's root boundary handle it
  if (error instanceof Response) {
    throw error;
  }

  let errorMessage = "Unknown error";
  let errorStack = "";

  if (isRouteErrorResponse(error)) {
    errorMessage = `${error.status} ${error.statusText}`;
    errorStack = error.data instanceof Error ? error.data.stack : JSON.stringify(error.data);
  } else if (error instanceof Error) {
    errorMessage = error.message;
    errorStack = error.stack;
  } else {
    errorMessage = typeof error === "string" ? error : JSON.stringify(error);
  }

  return (
    <div style={{ padding: "20px", color: "red", backgroundColor: "#fee", margin: "20px", borderRadius: "8px", border: "1px solid red" }}>
      <h2>Dashboard Error</h2>
      <p style={{ fontWeight: "bold" }}>{errorMessage}</p>
      <pre style={{ whiteSpace: "pre-wrap", marginTop: "10px", fontSize: "12px", overflowX: "auto" }}>
        {errorStack}
      </pre>
    </div>
  );
}
