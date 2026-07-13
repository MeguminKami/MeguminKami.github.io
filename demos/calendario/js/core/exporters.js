import { addDays, formatMinute, lisbonLocalToUtcStamp, parseISODate, weekday } from "./date-time.js";

function csvCell(value) {
  const text = value === null || value === undefined ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function exportJson(payload) {
  return JSON.stringify({ exportedAt: new Date().toISOString(), timezone: "Europe/Lisbon", ...payload }, null, 2);
}

export function exportCsv({ activities = [], overrides = [] }) {
  const header = ["registo", "id", "serie", "criador", "tipo", "titulo", "descricao", "data_inicio", "hora_inicio", "data_fim", "hora_fim", "localizacao", "link", "estado", "recorrencia", "comentario"];
  const rows = activities.map((a) => ["atividade", a.id, "", a.creator, a.type, a.title, a.description, a.start.date, formatMinute(a.start.minute), a.end.date, formatMinute(a.end.minute), a.location, a.url, a.status, a.recurrence, a.comment]);
  for (const override of overrides) {
    const a = override.replacement;
    rows.push(["excecao", override.id || `${override.seriesId}_${override.occurrenceDate}`, override.seriesId, "", a.type || "", a.title || "", a.description || "", a.start?.date || "", a.start ? formatMinute(a.start.minute) : "", a.end?.date || "", a.end ? formatMinute(a.end.minute) : "", a.location || "", a.url || "", a.status || "", "", ""]);
  }
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

function escapeIcs(value = "") {
  return String(value).replaceAll("\\", "\\\\").replaceAll(";", "\\;").replaceAll(",", "\\,").replace(/\r?\n/g, "\\n");
}

function localStamp(point) {
  let date = point.date;
  let minute = point.minute;
  if (minute === 1440) { date = addDays(date, 1); minute = 0; }
  return `${date.replaceAll("-", "")}T${String(Math.floor(minute / 60)).padStart(2, "0")}${String(minute % 60).padStart(2, "0")}00`;
}

const BYDAY = ["", "MO", "TU", "WE", "TH", "FR", "SA", "SU"];

function recurrenceRule(activity) {
  const rule = activity.recurrence;
  if (!rule) return "";
  let value = "";
  if (rule.mode === "daily") value = "FREQ=DAILY";
  if (rule.mode === "weekly") value = `FREQ=WEEKLY;BYDAY=${BYDAY[weekday(activity.start.date)]}`;
  if (rule.mode === "weekdays") value = "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR";
  if (rule.mode === "custom") value = `FREQ=WEEKLY;BYDAY=${[...rule.weekdays].sort().map((day) => BYDAY[day]).join(",")}`;
  if (rule.mode === "monthly") value = `FREQ=MONTHLY;BYMONTHDAY=${parseISODate(activity.start.date).getUTCDate()}`;
  if (rule.endMode === "count") value += `;COUNT=${rule.count}`;
  if (rule.endMode === "until") value += `;UNTIL=${lisbonLocalToUtcStamp(rule.untilDate, 1439)}`;
  return value;
}

function activityLines(activity, uid, recurrencePoint = null) {
  const lines = [
    "BEGIN:VEVENT",
    `UID:${escapeIcs(uid)}@o-que-vais-fazer`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
    `DTSTART;TZID=Europe/Lisbon:${localStamp(activity.start)}`,
    `DTEND;TZID=Europe/Lisbon:${localStamp(activity.end)}`,
    `SUMMARY:${escapeIcs(activity.title)}`
  ];
  if (recurrencePoint) lines.push(`RECURRENCE-ID;TZID=Europe/Lisbon:${localStamp(recurrencePoint)}`);
  const rrule = recurrenceRule(activity);
  if (rrule) lines.push(`RRULE:${rrule}`);
  if (activity.description) lines.push(`DESCRIPTION:${escapeIcs(activity.description)}`);
  if (activity.location) lines.push(`LOCATION:${escapeIcs(activity.location)}`);
  if (activity.url) lines.push(`URL:${escapeIcs(activity.url)}`);
  if (activity.status === "cancelled") lines.push("STATUS:CANCELLED");
  lines.push("END:VEVENT");
  return lines;
}

export function exportIcs({ activities = [], overrides = [] }) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//O que vais fazer//PT", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-TIMEZONE:Europe/Lisbon"];
  for (const activity of activities) lines.push(...activityLines(activity, activity.id));
  for (const override of overrides) {
    const base = activities.find((activity) => activity.id === override.seriesId);
    if (base) {
      const replacement = { ...base, ...override.replacement, recurrence: null };
      if (base.status === "cancelled") replacement.status = "cancelled";
      lines.push(...activityLines(replacement, base.id, { date: override.occurrenceDate, minute: base.start.minute }));
    }
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
