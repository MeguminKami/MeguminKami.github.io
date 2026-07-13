import test from "node:test";
import assert from "node:assert/strict";
import { addDays, addMonthsClamped, diffDays, nowLinePosition, pointToVisibleCoordinate, snapMinute, visibleCoordinateToPoint } from "../js/core/date-time.js";

test("navega por dias e meses sem depender do fuso local", () => {
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(diffDays("2026-07-13", "2026-07-20"), 7);
  assert.equal(addMonthsClamped("2026-01-31", 1), "2026-02-28");
  assert.equal(addMonthsClamped("2024-01-31", 1), "2024-02-29");
});

test("converte pontos para o eixo visível e ignora a madrugada", () => {
  assert.equal(pointToVisibleCoordinate({ date: "2026-07-13", minute: 420 }, "2026-07-13"), 0);
  assert.equal(pointToVisibleCoordinate({ date: "2026-07-14", minute: 480 }, "2026-07-13"), 1080);
  assert.deepEqual(visibleCoordinateToPoint(1020, "2026-07-13", "start"), { date: "2026-07-14", minute: 420 });
  assert.deepEqual(visibleCoordinateToPoint(1020, "2026-07-13", "end"), { date: "2026-07-13", minute: 1440 });
});

test("faz snap em intervalos de uma hora", () => {
  assert.equal(snapMinute(451), 480);
  assert.equal(snapMinute(449), 420);
});

test("posiciona a linha atual no minuto de Lisboa e só na janela", () => {
  const position = nowLinePosition("2026-07-13", new Date("2026-07-13T12:15:00Z"));
  assert.equal(position.day, 0);
  assert.equal(position.ratio, (13 * 60 + 15 - 420) / 1020);
  assert.equal(nowLinePosition("2026-07-01", new Date("2026-07-13T12:15:00Z")), null);
});
