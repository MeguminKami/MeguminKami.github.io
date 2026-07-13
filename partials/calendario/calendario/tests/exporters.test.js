import test from "node:test";
import assert from "node:assert/strict";
import { exportCsv, exportIcs, exportJson } from "../js/core/exporters.js";

const recurring = { id: "abc", schemaVersion: 1, creator: "joao", type: "casal", title: "Jantar, especial", description: "Linha 1\nLinha 2", location: "Casa", url: "https://example.com/", start: { date: "2026-07-13", minute: 1380 }, end: { date: "2026-07-13", minute: 1440 }, recurrence: { mode: "weekly", weekdays: [], endMode: "count", count: 3, untilDate: "" }, status: "cancelled", comment: null, version: 1 };

test("exporta JSON completo e CSV escapado", () => {
  const json = JSON.parse(exportJson({ activities: [recurring], overrides: [] }));
  assert.equal(json.timezone, "Europe/Lisbon");
  const csv = exportCsv({ activities: [recurring], overrides: [] });
  assert.match(csv, /"Jantar, especial"/);
  assert.match(csv, /"24:00"/);
});

test("exporta ICS com TZID, RRULE, cancelamento, escaping e 24:00 normalizado", () => {
  const ics = exportIcs({ activities: [recurring], overrides: [] });
  assert.match(ics, /DTSTART;TZID=Europe\/Lisbon:20260713T230000/);
  assert.match(ics, /DTEND;TZID=Europe\/Lisbon:20260714T000000/);
  assert.match(ics, /RRULE:FREQ=WEEKLY;BYDAY=MO;COUNT=3/);
  assert.match(ics, /SUMMARY:Jantar\\, especial/);
  assert.match(ics, /STATUS:CANCELLED/);
});
