import test from "node:test";
import assert from "node:assert/strict";
import { createSaleItemReconciler } from "../sale-pricing-core.js";

function fixture({ price = "1500.00", compareAtPrice = "2000.00" } = {}) {
  const item = {
    id: "item-1",
    productId: "gid://shopify/Product/1",
    variantId: "gid://shopify/ProductVariant/1",
    originalPrice: 1500,
    originalCompareAtPrice: "2000.00",
    priceSnapshotComplete: true,
    salePrice: 1200,
    applyStatus: "PENDING",
    restoreStatus: "PENDING",
    applyAttempts: 0,
    restoreAttempts: 0,
  };
  const actual = new Map([[item.variantId, {
    id: item.variantId,
    price,
    compareAtPrice,
    product: { id: item.productId },
  }]]);
  const counters = { mutations: 0, failMutationFor: new Set() };
  const admin = {};
  const records = new Map([[item.id, item]]);
  let failField = null;
  const db = {
    saleItem: {
      async update({ where, data }) {
        assert.ok(where.id);
        if (failField && Object.hasOwn(data, failField)) {
          failField = null;
          throw new Error("simulated database failure");
        }
        const target = records.get(where.id);
        assert.ok(target);
        for (const [key, value] of Object.entries(data)) {
          if (value && typeof value === "object" && "increment" in value) target[key] += value.increment;
          else target[key] = value;
        }
        return target;
      },
    },
  };
  const reconcile = createSaleItemReconciler({
    db,
    getVariant: async (_admin, currentItem) => actual.get(currentItem.variantId) || null,
    applyVariant: async (_admin, currentItem, target) => {
      counters.mutations += 1;
      if (counters.failMutationFor.has(currentItem.variantId)) throw new Error("simulated per-variant failure");
      const previous = actual.get(currentItem.variantId);
      actual.set(currentItem.variantId, { ...previous, ...target });
    },
  });
  return { item, actual, admin, db, counters, reconcile, registerItem(record) { records.set(record.id, record); }, failNextDatabaseWrite(field) { failField = field; } };
}

test("start and restore preserves a real compare-at price", async () => {
  const f = fixture();
  assert.equal(await f.reconcile(f.admin, f.item, "start"), "done");
  assert.deepEqual([f.actual.get(f.item.variantId).price, f.actual.get(f.item.variantId).compareAtPrice], ["1200", "1500"]);
  assert.equal(await f.reconcile(f.admin, f.item, "end"), "done");
  assert.deepEqual([f.actual.get(f.item.variantId).price, f.actual.get(f.item.variantId).compareAtPrice], ["1500", "2000.00"]);
});

test("start and restore preserves a null compare-at price", async () => {
  const f = fixture({ price: "1500.00", compareAtPrice: null });
  f.item.originalCompareAtPrice = null;
  assert.equal(await f.reconcile(f.admin, f.item, "start"), "done");
  assert.deepEqual([f.actual.get(f.item.variantId).price, f.actual.get(f.item.variantId).compareAtPrice], ["1200", "1500"]);
  assert.equal(await f.reconcile(f.admin, f.item, "end"), "done");
  assert.deepEqual([f.actual.get(f.item.variantId).price, f.actual.get(f.item.variantId).compareAtPrice], ["1500", null]);
});

test("restart reconciles a successful start mutation whose database write failed", async () => {
  const f = fixture({ compareAtPrice: null });
  f.item.originalCompareAtPrice = null;
  f.failNextDatabaseWrite("applyStatus");
  await assert.rejects(f.reconcile(f.admin, f.item, "start"), /simulated database failure/);
  assert.equal(f.actual.get(f.item.variantId).price, "1200");
  assert.equal(f.item.applyStatus, "PENDING");
  assert.equal(await f.reconcile(f.admin, f.item, "start"), "done");
  assert.equal(f.item.applyStatus, "APPLIED");
  assert.equal(f.counters.mutations, 1);
});

test("restart reconciles a successful restoration whose database write failed", async () => {
  const f = fixture({ price: "1200", compareAtPrice: "1500" });
  f.item.applyStatus = "APPLIED";
  f.failNextDatabaseWrite("restoreStatus");
  await assert.rejects(f.reconcile(f.admin, f.item, "end"), /simulated database failure/);
  assert.equal(f.actual.get(f.item.variantId).price, "1500");
  assert.equal(f.item.restoreStatus, "PENDING");
  assert.equal(await f.reconcile(f.admin, f.item, "end"), "done");
  assert.equal(f.item.restoreStatus, "RESTORED");
  assert.equal(f.counters.mutations, 1);
});

test("merchant price or compare-at changes are conflicts and are not overwritten", async () => {
  for (const changed of [
    { price: "750", compareAtPrice: "1500" },
    { price: "800", compareAtPrice: "1100" },
  ]) {
    const f = fixture({ price: "800", compareAtPrice: "1000" });
    f.item.originalPrice = 1000;
    f.item.originalCompareAtPrice = "1500";
    f.item.salePrice = 800;
    f.actual.set(f.item.variantId, { ...f.actual.get(f.item.variantId), ...changed });
    assert.equal(await f.reconcile(f.admin, f.item, "end"), "conflict");
    assert.deepEqual([f.actual.get(f.item.variantId).price, f.actual.get(f.item.variantId).compareAtPrice], [changed.price, changed.compareAtPrice]);
    assert.equal(f.counters.mutations, 0);
  }
});

test("variants in a partially successful batch are reconciled independently", async () => {
  const f = fixture({ compareAtPrice: null });
  f.item.originalCompareAtPrice = null;
  const second = {
    ...f.item,
    id: "item-2",
    variantId: "gid://shopify/ProductVariant/2",
    applyAttempts: 0,
  };
  f.registerItem(second);
  f.actual.set(second.variantId, { id: second.variantId, price: "1500", compareAtPrice: null, product: { id: second.productId } });
  f.counters.failMutationFor.add(second.variantId);

  assert.equal(await f.reconcile(f.admin, f.item, "start"), "done");
  assert.equal(await f.reconcile(f.admin, second, "start"), "pending");
  assert.equal(f.item.applyStatus, "APPLIED");
  assert.equal(second.applyStatus, "PENDING");
  assert.equal(f.actual.get(f.item.variantId).price, "1200");
  assert.equal(f.actual.get(second.variantId).price, "1500");
});

test("uninstall restores only a confirmed sale state and retains unresolved failures", async () => {
  const f = fixture({ price: "1200", compareAtPrice: "1500" });
  f.item.applyStatus = "APPLIED";
  assert.equal(await f.reconcile(f.admin, f.item, "uninstall"), "done");
  assert.deepEqual([f.actual.get(f.item.variantId).price, f.actual.get(f.item.variantId).compareAtPrice], ["1500", "2000.00"]);
  assert.equal(f.item.restoreStatus, "RESTORED");

  const unresolved = fixture({ price: "1200", compareAtPrice: "1500" });
  unresolved.item.applyStatus = "APPLIED";
  unresolved.counters.failMutationFor.add(unresolved.item.variantId);
  assert.equal(await unresolved.reconcile(unresolved.admin, unresolved.item, "uninstall"), "pending");
  assert.equal(unresolved.item.restoreStatus, "PENDING");
  assert.equal(unresolved.actual.get(unresolved.item.variantId).price, "1200");
});

