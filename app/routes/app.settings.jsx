import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { SettingsLayout } from "../components/common/SettingsLayout";
import { useLoaderData } from "react-router";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const response = await admin.graphql(`#graphql query StoreProfile { shop { name ianaTimezone currencyCode } }`);
  const json = await response.json();
  if (json.errors?.length) throw new Error(json.errors.map((error) => error.message).join(", "));
  return { store: json.data?.shop || { name: session.shop } };
};

export default function SettingsPage() {
  const { store } = useLoaderData();
  return <SettingsLayout store={store} />;
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
