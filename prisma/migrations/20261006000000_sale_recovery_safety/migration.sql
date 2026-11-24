ALTER TABLE "Sale"
  ADD COLUMN "claimedAt" TIMESTAMP(3),
  ADD COLUMN "claimOwner" TEXT;

ALTER TABLE "SchedulerLock"
  ADD COLUMN "ownerToken" TEXT;

ALTER TABLE "SaleItem"
  ADD COLUMN "originalCompareAtPrice" TEXT,
  ADD COLUMN "priceSnapshotComplete" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "applyStatus" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "restoreStatus" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "applyAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "restoreAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastError" TEXT;

UPDATE "SaleItem"
SET "applyStatus" = 'APPLIED'
WHERE "appliedAt" IS NOT NULL;

UPDATE "SaleItem"
SET "restoreStatus" = 'RESTORED'
WHERE "restoredAt" IS NOT NULL;

CREATE INDEX "Sale_claimedAt_claimOwner_idx" ON "Sale"("claimedAt", "claimOwner");
CREATE INDEX "SaleItem_applyStatus_restoreStatus_idx" ON "SaleItem"("applyStatus", "restoreStatus");
