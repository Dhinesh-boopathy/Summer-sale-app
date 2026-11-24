import { authenticate } from "../shopify.server";
import db from "../db.server";
import { reconcileSaleItem } from "../services/sale-pricing.server";

export const action = async ({ request }) => {
  const { shop, topic, admin } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);

  const activeSales = await db.sale.findMany({
    where: { shop, status: { in: ["Starting", "Running", "Ending", "Failed"] } },
    include: { items: { where: { restoreStatus: { not: "RESTORED" } } } },
  });

  for (const sale of activeSales) {
    if (!admin) {
      await db.sale.update({
        where: { id: sale.id },
        data: {
          status: "Failed",
          failureReason: "Uninstall received without an available Shopify admin client; recovery data was retained.",
        },
      });
      continue;
    }

    let unresolved = false;
    for (const item of sale.items) {
      try {
        const result = await reconcileSaleItem(admin, item, "uninstall", db);
        if (result !== "done") unresolved = true;
      } catch (error) {
        unresolved = true;
        await db.saleItem.update({
          where: { id: item.id },
          data: { lastError: `Uninstall restoration could not be confirmed: ${error.message || error}` },
        });
      }
    }

    if (unresolved) {
      await db.sale.update({
        where: { id: sale.id },
        data: {
          status: "Failed",
          failureReason: "Uninstall restoration is incomplete; unresolved variant recovery data was retained.",
        },
      });
      console.error(`Sale ${sale.id} for ${shop} has unresolved uninstall restoration.`);
    } else {
      await db.sale.update({
        where: { id: sale.id },
        data: { status: "Completed", failureReason: null },
      });
    }
  }

  // Delete only sales that cannot contain an unresolved price mutation.
  await db.sale.deleteMany({
    where: { shop, status: { in: ["Draft", "Scheduled", "Completed"] } },
  });
  await db.session.deleteMany({ where: { shop } });

  return new Response();
};

