import { addDays, compareDates, diffDays, monthDifference, parseISODate, weekday } from "./date-time.js";

const MAX_SCAN_DAYS = 36_600;

function matchesRule(baseDate, date, rule) {
  const difference = diffDays(baseDate, date);
  if (difference < 0) return false;
  switch (rule.mode) {
    case "daily": return true;
    case "weekly": return difference % 7 === 0;
    case "weekdays": return weekday(date) <= 5;
    case "custom": return rule.weekdays.includes(weekday(date));
    case "monthly": {
      const base = parseISODate(baseDate);
      const current = parseISODate(date);
      return monthDifference(baseDate, date) >= 0 && current.getUTCDate() === base.getUTCDate();
    }
    default: return false;
  }
}

export function generateOccurrenceDates(activity, rangeStart, rangeEnd) {
  if (!activity.recurrence) return compareDates(activity.start.date, rangeStart) >= 0 && compareDates(activity.start.date, rangeEnd) <= 0 ? [activity.start.date] : [];
  const rule = activity.recurrence;
  const dates = [];
  let emitted = 0;
  let cursor = activity.start.date;
  let scanned = 0;
  while (compareDates(cursor, rangeEnd) <= 0 && scanned <= MAX_SCAN_DAYS) {
    if (matchesRule(activity.start.date, cursor, rule)) {
      emitted += 1;
      if (rule.endMode === "count" && emitted > rule.count) break;
      if (rule.endMode === "until" && compareDates(cursor, rule.untilDate) > 0) break;
      if (compareDates(cursor, rangeStart) >= 0) dates.push(cursor);
    }
    cursor = addDays(cursor, 1);
    scanned += 1;
  }
  return dates;
}

export function materializeOccurrence(activity, occurrenceDate, override = null) {
  const shift = diffDays(activity.start.date, occurrenceDate);
  const original = {
    ...activity,
    start: { date: occurrenceDate, minute: activity.start.minute },
    end: { date: addDays(activity.end.date, shift), minute: activity.end.minute }
  };
  const replacement = override?.replacement;
  const occurrence = replacement ? { ...original, ...replacement, start: { ...replacement.start }, end: { ...replacement.end } } : original;
  if (activity.status === "cancelled") occurrence.status = "cancelled";
  return {
    ...occurrence,
    id: activity.id,
    seriesId: activity.id,
    renderId: `${activity.id}::${occurrenceDate}`,
    occurrenceDate,
    isRecurring: Boolean(activity.recurrence),
    baseVersion: activity.version
  };
}

export function expandActivities(activities, overrides, windowStart, dayCount = 7) {
  const windowEnd = addDays(windowStart, dayCount - 1);
  const overrideMap = new Map(overrides.map((item) => [`${item.seriesId}_${item.occurrenceDate}`, item]));
  const result = [];
  for (const activity of activities) {
    const lookback = Math.max(0, diffDays(activity.start.date, activity.end.date));
    const occurrenceDates = generateOccurrenceDates(activity, addDays(windowStart, -lookback), windowEnd);
    for (const occurrenceDate of occurrenceDates) {
      const override = overrideMap.get(`${activity.id}_${occurrenceDate}`);
      const occurrence = materializeOccurrence(activity, occurrenceDate, override);
      if (compareDates(occurrence.end.date, windowStart) >= 0 && compareDates(occurrence.start.date, windowEnd) <= 0) result.push(occurrence);
    }
  }
  return result.sort((a, b) => a.start.date.localeCompare(b.start.date) || a.start.minute - b.start.minute || a.renderId.localeCompare(b.renderId));
}

export function segmentActivity(activity, windowStart, dayCount = 7) {
  const segments = [];
  for (let index = 0; index < dayCount; index += 1) {
    const date = addDays(windowStart, index);
    if (compareDates(date, activity.start.date) < 0 || compareDates(date, activity.end.date) > 0) continue;
    const startMinute = date === activity.start.date ? activity.start.minute : 420;
    const endMinute = date === activity.end.date ? activity.end.minute : 1440;
    if (endMinute <= startMinute) continue;
    segments.push({
      ...activity,
      segmentId: `${activity.renderId || activity.id}@${date}`,
      date,
      dayIndex: index,
      startMinute,
      endMinute
    });
  }
  return segments;
}

export function expandAndSegment(activities, overrides, windowStart, dayCount = 7) {
  return expandActivities(activities, overrides, windowStart, dayCount).flatMap((activity) => segmentActivity(activity, windowStart, dayCount));
}
