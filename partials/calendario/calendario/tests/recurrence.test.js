import test from "node:test";
import assert from "node:assert/strict";
import { expandActivities, generateOccurrenceDates, segmentActivity } from "../js/core/recurrence.js";

function series(rule, start = "2026-07-13") {
  return { id: "a", creator: "joao", type: "joao", title: "Treino", description: "", location: "", url: "", start: { date: start, minute: 480 }, end: { date: start, minute: 540 }, recurrence: rule, status: "active", comment: null, version: 1 };
}

test("gera recorrências diárias, semanais, úteis e personalizadas", () => {
  assert.equal(generateOccurrenceDates(series({ mode: "daily", endMode: "count", count: 3, weekdays: [], untilDate: "" }), "2026-07-13", "2026-07-20").length, 3);
  assert.deepEqual(generateOccurrenceDates(series({ mode: "weekly", endMode: "never", count: 0, weekdays: [], untilDate: "" }), "2026-07-13", "2026-07-27"), ["2026-07-13", "2026-07-20", "2026-07-27"]);
  assert.deepEqual(generateOccurrenceDates(series({ mode: "weekdays", endMode: "never", count: 0, weekdays: [], untilDate: "" }), "2026-07-13", "2026-07-19"), ["2026-07-13", "2026-07-14", "2026-07-15", "2026-07-16", "2026-07-17"]);
  assert.deepEqual(generateOccurrenceDates(series({ mode: "custom", endMode: "never", count: 0, weekdays: [2, 4], untilDate: "" }), "2026-07-13", "2026-07-19"), ["2026-07-14", "2026-07-16"]);
});

test("recorrência mensal ignora meses sem o dia original", () => {
  const item = series({ mode: "monthly", endMode: "never", count: 0, weekdays: [], untilDate: "" }, "2026-01-31");
  assert.deepEqual(generateOccurrenceDates(item, "2026-01-01", "2026-04-30"), ["2026-01-31", "2026-03-31"]);
});

test("aplica data final e exceção sem criar documentos futuros", () => {
  const item = series({ mode: "daily", endMode: "until", untilDate: "2026-07-15", count: 0, weekdays: [] });
  const override = { seriesId: "a", occurrenceDate: "2026-07-14", replacement: { title: "Treino movido", description: "", location: "", url: "", type: "joao", status: "active", start: { date: "2026-07-14", minute: 600 }, end: { date: "2026-07-14", minute: 660 } } };
  const values = expandActivities([item], [override], "2026-07-13");
  assert.equal(values.length, 3);
  assert.equal(values[1].title, "Treino movido");
  assert.equal(values[1].start.minute, 600);
});

test("segmenta uma entidade por vários dias nas horas visíveis", () => {
  const item = { ...series(null), renderId: "a::x", start: { date: "2026-07-13", minute: 1380 }, end: { date: "2026-07-15", minute: 480 } };
  assert.deepEqual(segmentActivity(item, "2026-07-13").map(({ date, startMinute, endMinute }) => [date, startMinute, endMinute]), [["2026-07-13", 1380, 1440], ["2026-07-14", 420, 1440], ["2026-07-15", 420, 480]]);
});
