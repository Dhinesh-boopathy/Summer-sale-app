import test from "node:test";
import assert from "node:assert/strict";
import { formatInstantInTimeZone, localDateTimeInTimeZoneToIso } from "../store-time.js";

test("formats a stored instant in the store time zone", () => {
  assert.equal(formatInstantInTimeZone("2026-01-15T12:30:00.000Z", "Asia/Kolkata"), "2026-01-15T18:00");
});

test("converts a store wall time to UTC without using the server or device zone", () => {
  assert.equal(localDateTimeInTimeZoneToIso("2026-01-15T18:00", "Asia/Kolkata"), "2026-01-15T12:30:00.000Z");
});

test("rejects a wall time that is skipped by a daylight-saving transition", () => {
  assert.throws(
    () => localDateTimeInTimeZoneToIso("2026-03-08T02:30", "America/New_York"),
    /does not exist because the clocks change/,
  );
});

test("chooses the first occurrence of an ambiguous daylight-saving wall time", () => {
  assert.equal(localDateTimeInTimeZoneToIso("2026-11-01T01:30", "America/New_York"), "2026-11-01T05:30:00.000Z");
});
