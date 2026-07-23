import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const { topic, shop, session, admin } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);
  
  // The app doesn't store any shop PII, only standard shop settings,
  // which are deleted when the shop uninstalls the app anyway.
  
  return new Response();
};
