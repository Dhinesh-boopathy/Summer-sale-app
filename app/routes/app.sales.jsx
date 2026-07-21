import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { listSales, deleteSale } from "../services/sales.server";
import { SalesDashboardLayout } from "../components/sales/dashboard/SalesDashboardLayout";
import { useLoaderData } from "react-router";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  const url = new URL(request.url);
  const q = url.searchParams.get("q") || "";
  const sales = await listSales(q);
  return { sales, q };
};

export const action = async ({ request }) => {
  await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");
  
  if (intent === "delete") {
    const id = formData.get("id");
    await deleteSale(id);
    return { success: true };
  }
  return null;
};

export default function SalesPage() {
  const { sales, q } = useLoaderData();
  return <SalesDashboardLayout sales={sales} initialQuery={q} />;
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
