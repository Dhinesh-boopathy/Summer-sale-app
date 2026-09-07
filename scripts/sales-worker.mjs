import cron from "node-cron";
import { runSalesScheduler } from "../app/services/scheduler.server.js";

async function run() {
  try {
    const didRun = await runSalesScheduler();
    if (!didRun) console.log("Sales scheduler skipped: another worker holds the lease.");
  } catch (error) {
    console.error("Sales scheduler failed:", error);
  }
}

console.log("Sales scheduler worker started.");
await run();
cron.schedule("* * * * *", run, { noOverlap: true });
