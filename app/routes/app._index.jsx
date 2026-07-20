import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { listSales } from "../services/sales.server";
import { DashboardLayout } from "../components/dashboard/DashboardLayout";
import { useLoaderData } from "react-router";

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
