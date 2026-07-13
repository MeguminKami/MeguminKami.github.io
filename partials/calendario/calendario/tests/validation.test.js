import test from "node:test";
import assert from "node:assert/strict";
import { buildActivity, sanitizeUrl, validateActivity } from "../js/core/validation.js";

function activity(overrides = {}) {
  return buildActivity({ title: "Jantar ✨", description: "", location: "", url: "", type: "casal", start: { date: "2026-07-13", minute: 420 }, end: { date: "2026-07-13", minute: 480 }, recurrence: null, version: 1, ...overrides }, "joao");
}

test("aceita uma hora e atividades que atravessam noites", () => {
  assert.deepEqual(validateActivity(activity()), []);
  assert.deepEqual(validateActivity(activity({ start: { date: "2026-07-13", minute: 1380 }, end: { date: "2026-07-14", minute: 480 } })), []);
});

test("rejeita limites e incrementos inválidos", () => {
  assert.match(validateActivity(activity({ start: { date: "2026-07-13", minute: 390 } }))[0], /início/i);
  assert.match(validateActivity(activity({ end: { date: "2026-07-13", minute: 1470 } }))[0], /fim/i);
  assert.ok(validateActivity(activity({ start: { date: "2026-07-13", minute: 450 } })).some((error) => /uma hora/.test(error)));
  assert.ok(validateActivity(activity({ end: { date: "2026-07-13", minute: 420 } })).some((error) => /posterior/.test(error)));
});

test("aceita apenas links web seguros", () => {
  assert.equal(sanitizeUrl("javascript:alert(1)"), "");
  assert.equal(sanitizeUrl("https://example.com/a"), "https://example.com/a");
});
