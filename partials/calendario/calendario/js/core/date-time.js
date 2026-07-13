import {
  END_MINUTE,
  SLOT_MINUTES,
  START_MINUTE,
  TIMEZONE,
  VISIBLE_MINUTES
} from "./constants.js";

const DAY_MS = 86_400_000;

export function parseISODate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return date;
}

export function toISODate(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function addDays(isoDate, amount) {
  const date = parseISODate(isoDate);
  if (!date) throw new TypeError("Data ISO inválida");
  date.setUTCDate(date.getUTCDate() + amount);
  return toISODate(date);
}

export function diffDays(from, to) {
  const start = parseISODate(from);
  const end = parseISODate(to);
  if (!start || !end) throw new TypeError("Data ISO inválida");
  return Math.round((end - start) / DAY_MS);
}

export function compareDates(a, b) {
  return a === b ? 0 : a < b ? -1 : 1;
}

export function weekday(isoDate) {
  const date = parseISODate(isoDate);
  if (!date) throw new TypeError("Data ISO inválida");
  const day = date.getUTCDay();
  return day === 0 ? 7 : day;
}

export function addMonthsClamped(isoDate, amount) {
  const date = parseISODate(isoDate);
  if (!date) throw new TypeError("Data ISO inválida");
  const wantedDay = date.getUTCDate();
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(wantedDay, last));
  return toISODate(target);
}

export function monthDifference(from, to) {
  const a = parseISODate(from);
  const b = parseISODate(to);
  if (!a || !b) throw new TypeError("Data ISO inválida");
  return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + b.getUTCMonth() - a.getUTCMonth();
}

export function formatMinute(minute) {
  if (minute === END_MINUTE) return "24:00";
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

export function parseTime(value) {
  if (value === "24:00") return END_MINUTE;
  const match = /^(\d{2}):(\d{2})$/.exec(value || "");
  if (!match) return NaN;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function snapMinute(minute) {
  return Math.round(minute / SLOT_MINUTES) * SLOT_MINUTES;
}

export function pointToVisibleCoordinate(point, anchorDate) {
  return diffDays(anchorDate, point.date) * VISIBLE_MINUTES + point.minute - START_MINUTE;
}

export function visibleCoordinateToPoint(coordinate, anchorDate, boundary = "start") {
  let day = Math.floor(coordinate / VISIBLE_MINUTES);
  let within = coordinate - day * VISIBLE_MINUTES;
  if (within < 0) {
    day -= 1;
    within += VISIBLE_MINUTES;
  }
  if (boundary === "end" && coordinate !== 0 && within === 0) {
    day -= 1;
    within = VISIBLE_MINUTES;
  }
  return { date: addDays(anchorDate, day), minute: START_MINUTE + within };
}

export function visibleDuration(start, end) {
  return pointToVisibleCoordinate(end, start.date) - pointToVisibleCoordinate(start, start.date);
}

export function getLisbonParts(now = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  });
  const parts = Object.fromEntries(formatter.formatToParts(now).filter((p) => p.type !== "literal").map((p) => [p.type, p.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minute: Number(parts.hour) * 60 + Number(parts.minute),
    second: Number(parts.second)
  };
}

export function formatDateLong(isoDate, compact = false) {
  const date = parseISODate(isoDate);
  if (!date) return "";
  return new Intl.DateTimeFormat("pt-PT", compact
    ? { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }
    : { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }
  ).format(date);
}

export function formatDateRange(start, end) {
  const formatter = new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  return `${formatter.format(parseISODate(start))} — ${formatter.format(parseISODate(end))}`;
}

export function nowLinePosition(windowStart, now = new Date()) {
  const current = getLisbonParts(now);
  const day = diffDays(windowStart, current.date);
  if (day < 0 || day > 6 || current.minute < START_MINUTE || current.minute > END_MINUTE) return null;
  return { day, ratio: (current.minute - START_MINUTE) / VISIBLE_MINUTES };
}

export function lisbonLocalToUtcStamp(date, minute) {
  let normalizedDate = date;
  let normalizedMinute = minute;
  if (minute === END_MINUTE) {
    normalizedDate = addDays(date, 1);
    normalizedMinute = 0;
  }
  const parsed = parseISODate(normalizedDate);
  const desired = Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), Math.floor(normalizedMinute / 60), normalizedMinute % 60);
  const seen = getLisbonParts(new Date(desired));
  const seenDate = parseISODate(seen.date);
  const seenAsUtc = Date.UTC(seenDate.getUTCFullYear(), seenDate.getUTCMonth(), seenDate.getUTCDate(), Math.floor(seen.minute / 60), seen.minute % 60);
  const actual = new Date(desired - (seenAsUtc - desired));
  return `${actual.getUTCFullYear()}${String(actual.getUTCMonth() + 1).padStart(2, "0")}${String(actual.getUTCDate()).padStart(2, "0")}T${String(actual.getUTCHours()).padStart(2, "0")}${String(actual.getUTCMinutes()).padStart(2, "0")}00Z`;
}
