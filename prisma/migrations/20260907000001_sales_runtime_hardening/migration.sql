ALTER TABLE "Sale" ADD COLUMN "failureReason" TEXT;

CREATE TABLE "SchedulerLock" (
    "id" TEXT NOT NULL,
    "lockedUntil" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SchedulerLock_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Sale_shop_status_startAt_idx" ON "Sale"("shop", "status", "startAt");
CREATE INDEX "Sale_shop_status_endAt_idx" ON "Sale"("shop", "status", "endAt");
CREATE INDEX "SaleItem_saleId_appliedAt_restoredAt_idx" ON "SaleItem"("saleId", "appliedAt", "restoredAt");
