import test from "node:test";
import assert from "node:assert/strict";
import { buildActivity, sanitizeUrl, validateActivity } from "../js/core/validation.js";

function activity(overrides = {}) {
  return buildActivity({ title: "Jantar ✨", description: "", location: "", url: "", type: "casal", start: { date: "2026-07-13", minute: 420 }, end: { date: "2026-07-13", minute: 450 }, recurrence: null, version: 1, ...overrides }, "joao");
}

test("aceita meias horas e atividades que atravessam noites", () => {
  assert.deepEqual(validateActivity(activity()), []);
  assert.deepEqual(validateActivity(activity({ start: { date: "2026-07-13", minute: 1410 }, end: { date: "2026-07-14", minute: 450 } })), []);
  assert.deepEqual(validateActivity(activity({ start: { date: "2026-07-13", minute: 1410 }, end: { date: "2026-07-13", minute: 1440 } })), []);
});

test("rejeita limites e incrementos inválidos", () => {
  assert.match(validateActivity(activity({ start: { date: "2026-07-13", minute: 390 } }))[0], /início/i);
  assert.match(validateActivity(activity({ end: { date: "2026-07-13", minute: 1470 } }))[0], /fim/i);
  assert.ok(validateActivity(activity({ start: { date: "2026-07-13", minute: 435 } })).some((error) => /30 minutos/.test(error)));
  assert.ok(validateActivity(activity({ end: { date: "2026-07-13", minute: 420 } })).some((error) => /posterior/.test(error)));
});

test("aceita apenas links web seguros", () => {
  assert.equal(sanitizeUrl("javascript:alert(1)"), "");
  assert.equal(sanitizeUrl("https://example.com/a"), "https://example.com/a");
});
