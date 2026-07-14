import test from "node:test";
import assert from "node:assert/strict";
import { calculateVisibleDayLayout, layoutDaySegments, overlapComponents, segmentsOverlap } from "../js/core/layout.js";

const segment = (id, type, startMinute, endMinute) => ({ segmentId: id, type, startMinute, endMinute });

test("calcula apenas dias inteiros que cabem na largura disponível", () => {
  const threeDays = calculateVisibleDayLayout(72 + 152 * 3.3, 72);
  const twoDays = calculateVisibleDayLayout(72 + 152 * 2.9, 72);
  assert.equal(threeDays.visibleDayCount, 3);
  assert.equal(twoDays.visibleDayCount, 2);
  assert.ok(Math.abs(threeDays.dayWidth - 152 * 3.3 / 3) < 1e-9);
  assert.equal(threeDays.innerWidth, 72 + threeDays.dayWidth * 7);
});

test("limita a grelha responsiva entre um e sete dias", () => {
  assert.equal(calculateVisibleDayLayout(100, 72).visibleDayCount, 1);
  assert.equal(calculateVisibleDayLayout(2400, 72).visibleDayCount, 7);
});

test("deteta sobreposições estritas e componentes", () => {
  assert.equal(segmentsOverlap(segment("a", "joao", 420, 480), segment("b", "joao", 450, 510)), true);
  assert.equal(segmentsOverlap(segment("a", "joao", 420, 480), segment("c", "joao", 480, 510)), false);
  assert.equal(overlapComponents([segment("a", "joao", 420, 480), segment("b", "joao", 450, 510), segment("c", "joao", 600, 630)]).length, 2);
});

test("divide sobreposições dentro da faixa da mesma pessoa", () => {
  const layout = layoutDaySegments([segment("a", "joao", 420, 510), segment("b", "joao", 450, 480)]);
  assert.equal(layout.length, 2);
  assert.ok(layout.every((item) => item.columns === 2 && item.widthPercent === 25));
  assert.ok(layout.every((item) => item.leftPercent < 50));
});

test("atividade de casal funde as duas faixas num único cartão", () => {
  const layout = layoutDaySegments([segment("c", "casal", 420, 480)]);
  assert.equal(layout.length, 1);
  assert.equal(layout[0].lane, "casal");
  assert.equal(layout[0].fused, true);
  assert.deepEqual([layout[0].leftPercent, layout[0].widthPercent], [0, 100]);
});

test("várias atividades de casal mantêm-se visíveis lado a lado", () => {
  const layout = layoutDaySegments([segment("c1", "casal", 420, 480), segment("c2", "casal", 420, 480)]);
  assert.equal(layout.length, 2);
  assert.deepEqual(layout.map((item) => [item.leftPercent, item.widthPercent]), [[0, 50], [50, 50]]);
});
