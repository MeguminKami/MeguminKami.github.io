import test from "node:test";
import assert from "node:assert/strict";
import { avatarByteSize, decodeAvatarStrokes, encodeAvatarStrokes } from "../js/core/avatar.js";
import { validateProfile } from "../js/core/validation.js";

const stroke = (points, overrides = {}) => ({ tool: "pen", color: "#6f58ae", width: 16, points, ...overrides });

test("recupera e limita pontos desenhados fora do canvas", () => {
  const legacy = JSON.stringify([stroke([-40, 20, 1040, 980])]);
  const decoded = decodeAvatarStrokes(legacy);
  assert.deepEqual(decoded[0].points, [0, 20, 1000, 980]);
});

test("compacta muitos traços e volta a abrir o desenho completo", () => {
  const strokes = Array.from({ length: 1800 }, (_, index) => {
    const x = index % 900;
    return stroke([x, 10, x + 1, 990], { tool: index % 8 === 0 ? "eraser" : "pen" });
  });
  const encoded = encodeAvatarStrokes(strokes);
  assert.ok(encoded);
  assert.ok(encoded.size < 180_000);
  assert.equal(decodeAvatarStrokes(encoded.strokesJson).length, strokes.length);
  assert.ok(encoded.strokesJson.length < JSON.stringify(strokes).length);
});

test("simplifica automaticamente um traço muito denso", () => {
  const points = [];
  for (let index = 0; index < 20_000; index += 1) points.push(index % 1001, Math.round(500 + Math.sin(index / 80) * 300));
  const encoded = encodeAvatarStrokes([stroke(points)], 12_000);
  assert.ok(encoded);
  assert.ok(encoded.tolerance > 0);
  assert.ok(avatarByteSize(encoded.strokesJson) <= 12_000);
  assert.ok(decodeAvatarStrokes(encoded.strokesJson)[0].points.length < points.length);
});

test("valida tanto avatares antigos como o formato compacto", () => {
  const legacy = JSON.stringify([stroke([10, 20, 30, 40])]);
  const compact = encodeAvatarStrokes([stroke([10, 20, 30, 40])]).strokesJson;
  const profile = (strokesJson) => ({ id: "joao", displayName: "João", avatar: { formatVersion: 1, width: 256, height: 256, strokesJson } });
  assert.equal(validateProfile(profile(legacy)), true);
  assert.equal(validateProfile(profile(compact)), true);
});
