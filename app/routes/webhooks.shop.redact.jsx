import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { topic, shop } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);

  // Sale items are removed by the cascade relation when their sale is deleted.
  await db.$transaction([
    db.sale.deleteMany({ where: { shop } }),
    db.session.deleteMany({ where: { shop } }),
  ]);
  
  return new Response();
};
