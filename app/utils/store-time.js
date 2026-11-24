const localDateTimePattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

function partsAt(instant, timeZone) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(instant));
  return Object.fromEntries(parts.filter(({ type }) => type !== "literal").map(({ type, value }) => [type, Number(value)]));
}

function wallClockEpoch(parts) {
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
}

export function formatInstantInTimeZone(instant, timeZone) {
  if (!instant || !timeZone) return "";
  const parts = partsAt(instant, timeZone);
  const pad = (value) => String(value).padStart(2, "0");
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function localDateTimeInTimeZoneToIso(value, timeZone) {
  const match = localDateTimePattern.exec(value || "");
  if (!match) throw new Error("Enter a valid start and end date and time.");
  if (!timeZone) throw new Error("The store time zone could not be loaded. Refresh the page before scheduling.");

  const [, year, month, day, hour, minute] = match.map(Number);
  const desired = { year, month, day, hour, minute };
  const targetEpoch = wallClockEpoch(desired);
  const normalized = new Date(targetEpoch);
  if (normalized.getUTCFullYear() !== year || normalized.getUTCMonth() + 1 !== month || normalized.getUTCDate() !== day || normalized.getUTCHours() !== hour || normalized.getUTCMinutes() !== minute) {
    throw new Error("Enter a valid calendar date and time.");
  }

  let candidate = targetEpoch;
  const visited = new Set();
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (visited.has(candidate)) break;
    visited.add(candidate);
    const actual = partsAt(candidate, timeZone);
    const difference = targetEpoch - wallClockEpoch(actual);
    if (difference === 0) return new Date(candidate).toISOString();
    candidate += difference;
  }

  throw new Error("That local time does not exist because the clocks change for daylight saving. Choose another time.");
}
