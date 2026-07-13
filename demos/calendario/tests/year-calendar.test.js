import test from "node:test";
import assert from "node:assert/strict";
import { buildYearMonths } from "../js/core/year-calendar.js";

test("constrói os doze meses e respeita anos bissextos", () => {
  const common = buildYearMonths(2026);
  const leap = buildYearMonths(2028);
  assert.equal(common.length, 12);
  assert.equal(common.flatMap((month) => month.days).filter((day) => day.inMonth).length, 365);
  assert.equal(leap.flatMap((month) => month.days).filter((day) => day.inMonth).length, 366);
  assert.ok(common.every((month) => month.days.length === 42));
});

test("inclui dias adjacentes clicáveis em cada grelha mensal", () => {
  const january = buildYearMonths(2026)[0];
  assert.equal(january.days[0].date, "2025-12-29");
  assert.equal(january.days.find((day) => day.date === "2026-01-01")?.inMonth, true);
  assert.equal(january.days.at(-1).date, "2026-02-08");
});
