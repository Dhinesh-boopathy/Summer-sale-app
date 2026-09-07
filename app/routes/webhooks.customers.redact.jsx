import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const { topic, shop } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);
  
  // The app doesn't store any customer data in the database,
  // so no action is required here.
  
  return new Response();
};
