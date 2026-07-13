import test from "node:test";
import assert from "node:assert/strict";
import { layoutDaySegments, overlapComponents, segmentsOverlap } from "../js/core/layout.js";

const segment = (id, type, startMinute, endMinute) => ({ segmentId: id, type, startMinute, endMinute });

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
