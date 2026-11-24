export function samePrice(first, second) {
  if (first == null || second == null) return first == null && second == null;
  return Number(first).toFixed(4) === Number(second).toFixed(4);
}

export function matchesVariantState(actual, price, compareAtPrice) {
  return Boolean(actual) && samePrice(actual.price, price) && samePrice(actual.compareAtPrice, compareAtPrice);
}

export function createSaleItemReconciler({ db, getVariant, applyVariant }) {
  async function updateItem(item, data) {
    await db.saleItem.update({ where: { id: item.id }, data });
  }

  async function markSuccess(item, direction) {
    const now = new Date();
    await updateItem(item, direction === "start"
      ? { applyStatus: "APPLIED", appliedAt: now, lastError: null }
      : { restoreStatus: "RESTORED", restoredAt: now, lastError: null });
    return "done";
  }

  async function markConflict(item, direction, reason) {
    await updateItem(item, {
      ...(direction === "start" ? { applyStatus: "CONFLICT" } : { restoreStatus: "CONFLICT" }),
      lastError: reason,
    });
    return "conflict";
  }

  async function verifyAfterMutation(admin, item, direction, expected, desired) {
    let actual;
    try {
      actual = await getVariant(admin, item);
    } catch (error) {
      await updateItem(item, { lastError: `Shopify mutation outcome is unknown; verification failed: ${error.message}` });
      return "pending";
    }
    if (matchesVariantState(actual, desired[0], desired[1])) return markSuccess(item, direction);
    if (matchesVariantState(actual, expected[0], expected[1])) {
      await updateItem(item, { lastError: item.lastMutationError || "Shopify has not applied the requested price state yet." });
      return "pending";
    }
    return markConflict(item, direction, "Shopify returned an unexpected price state after the mutation; no further overwrite was made.");
  }

  async function restoreAfterVerifiedMutation(admin, item, target) {
    await updateItem(item, { restoreAttempts: { increment: 1 }, lastError: null });
    try {
      await applyVariant(admin, item, target);
    } catch (error) {
      item.lastMutationError = error.message || String(error);
    }
    return verifyAfterMutation(admin, item, "end",
      [item.salePrice, String(item.originalPrice)],
      [item.originalPrice, item.originalCompareAtPrice]);
  }

  return async function reconcileSaleItem(admin, item, direction, assertOwned = async () => {}) {
    let actual;
    try {
      actual = await getVariant(admin, item);
    } catch (error) {
      await updateItem(item, { lastError: `Could not read Shopify variant state: ${error.message}` });
      return "pending";
    }
    if (!actual) return markConflict(item, direction, "The Shopify variant no longer exists.");

    // Legacy scheduled items did not store compare-at state. Capture it from Shopify
    // immediately before the first write, but never guess it for an applied sale.
    if (!item.priceSnapshotComplete) {
      if (direction !== "start" || !samePrice(actual.price, item.originalPrice)) {
        return markConflict(item, direction, "The original compare-at price was not captured; automatic restoration is unsafe.");
      }
      const originalCompareAtPrice = actual.compareAtPrice ?? null;
      await updateItem(item, { originalCompareAtPrice, priceSnapshotComplete: true });
      item = { ...item, originalCompareAtPrice, priceSnapshotComplete: true };
    }

    const operation = direction === "start" ? "start" : "end";
    const expected = operation === "start"
      ? [item.originalPrice, item.originalCompareAtPrice]
      : [item.salePrice, String(item.originalPrice)];
    const desired = operation === "start"
      ? [item.salePrice, String(item.originalPrice)]
      : [item.originalPrice, item.originalCompareAtPrice];
    const target = operation === "start"
      ? { price: String(item.salePrice), compareAtPrice: String(item.originalPrice) }
      : { price: String(item.originalPrice), compareAtPrice: item.originalCompareAtPrice };

    if (direction === "uninstall") {
      const originalState = matchesVariantState(actual, item.originalPrice, item.originalCompareAtPrice);
      const saleState = matchesVariantState(actual, item.salePrice, String(item.originalPrice));
      if (originalState) return markSuccess(item, "end");
      if (!saleState) return markConflict(item, "end", "Shopify prices differ from both the sale and original state; uninstall left them unchanged.");
      return restoreAfterVerifiedMutation(admin, item, target);
    }

    if (matchesVariantState(actual, desired[0], desired[1])) return markSuccess(item, direction);
    if (!matchesVariantState(actual, expected[0], expected[1])) {
      return markConflict(item, direction, "Shopify price or compare-at price changed outside this sale; no automatic overwrite was made.");
    }

    const attemptField = direction === "start" ? "applyAttempts" : "restoreAttempts";
    await updateItem(item, { [attemptField]: { increment: 1 }, lastError: null });
    try {
      await assertOwned();
      await applyVariant(admin, item, target);
    } catch (error) {
      // A timeout or partial GraphQL outcome is ambiguous. Re-read Shopify below.
      item.lastMutationError = error.message || String(error);
    }
    return verifyAfterMutation(admin, item, direction, expected, desired);
  };
}

