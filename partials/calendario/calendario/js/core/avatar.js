import { MAX_AVATAR_BYTES } from "./constants.js";

const COLOR = /^#[0-9a-f]{6}$/i;
const clampPoint = (value) => Math.max(0, Math.min(1000, Math.round(value)));

function decodePointString(value) {
  if (typeof value !== "string" || value.length < 8 || value.length % 4 !== 0 || !/^[0-9a-z]+$/i.test(value)) return null;
  const points = [];
  for (let index = 0; index < value.length; index += 2) points.push(parseInt(value.slice(index, index + 2), 36));
  return points.every((point) => Number.isFinite(point) && point >= 0 && point <= 1000) ? points : null;
}

function normalizeStroke(value) {
  const compact = Array.isArray(value);
  const toolValue = compact ? value[0] : value?.tool;
  const tool = compact ? (toolValue === 0 ? "pen" : toolValue === 1 ? "eraser" : "") : toolValue;
  const rawColor = compact ? value[1] : value?.color;
  const color = compact && typeof rawColor === "string" && !rawColor.startsWith("#") ? `#${rawColor}` : rawColor;
  const width = compact ? value[2] : value?.width;
  const rawPoints = compact ? value[3] : value?.points;
  const decodedPoints = typeof rawPoints === "string" ? decodePointString(rawPoints) : rawPoints;
  if (!["pen", "eraser"].includes(tool) || !COLOR.test(color || "") || !Number.isFinite(width) || width <= 0 || width > 100 || !Array.isArray(decodedPoints) || decodedPoints.length < 4 || decodedPoints.length % 2 !== 0 || decodedPoints.some((point) => !Number.isFinite(point))) return null;
  return { tool, color, width: Math.round(width), points: decodedPoints.map(clampPoint) };
}

export function normalizeAvatarStrokes(values) {
  if (!Array.isArray(values)) return null;
  const strokes = values.map(normalizeStroke);
  return strokes.some((stroke) => !stroke) ? null : strokes;
}

export function decodeAvatarStrokes(strokesJson) {
  if (typeof strokesJson !== "string") return null;
  try { return normalizeAvatarStrokes(JSON.parse(strokesJson)); }
  catch { return null; }
}

function segmentDistanceSquared(point, start, end) {
  let x = start[0]; let y = start[1];
  let dx = end[0] - x; let dy = end[1] - y;
  if (dx || dy) {
    const ratio = ((point[0] - x) * dx + (point[1] - y) * dy) / (dx * dx + dy * dy);
    if (ratio > 1) { x = end[0]; y = end[1]; }
    else if (ratio > 0) { x += dx * ratio; y += dy * ratio; }
  }
  dx = point[0] - x; dy = point[1] - y;
  return dx * dx + dy * dy;
}

function simplifyPoints(points, tolerance) {
  if (points.length <= 4 || tolerance <= 0) return [...points];
  const pairs = [];
  for (let index = 0; index < points.length; index += 2) pairs.push([points[index], points[index + 1]]);
  const keep = new Uint8Array(pairs.length); keep[0] = 1; keep[pairs.length - 1] = 1;
  const stack = [[0, pairs.length - 1]];
  const squaredTolerance = tolerance * tolerance;
  while (stack.length) {
    const [first, last] = stack.pop();
    let furthest = -1; let furthestDistance = squaredTolerance;
    for (let index = first + 1; index < last; index += 1) {
      const distance = segmentDistanceSquared(pairs[index], pairs[first], pairs[last]);
      if (distance > furthestDistance) { furthest = index; furthestDistance = distance; }
    }
    if (furthest > 0) { keep[furthest] = 1; stack.push([first, furthest], [furthest, last]); }
  }
  return pairs.flatMap((point, index) => keep[index] ? point : []);
}

function encodePoints(points) {
  return points.map((point) => clampPoint(point).toString(36).padStart(2, "0")).join("");
}

function encodeCompact(strokes) {
  return JSON.stringify(strokes.map((stroke) => [stroke.tool === "eraser" ? 1 : 0, stroke.color.slice(1), stroke.width, encodePoints(stroke.points)]));
}

export function avatarByteSize(value) {
  return new TextEncoder().encode(value).length;
}

export function encodeAvatarStrokes(values, maxBytes = MAX_AVATAR_BYTES) {
  const normalized = normalizeAvatarStrokes(values);
  if (!normalized) return null;
  for (const tolerance of [0, 1, 2, 3, 5, 8, 12, 18, 26, 36]) {
    const strokes = tolerance ? normalized.map((stroke) => ({ ...stroke, points: simplifyPoints(stroke.points, tolerance) })) : normalized;
    const strokesJson = encodeCompact(strokes);
    const size = avatarByteSize(strokesJson);
    if (size <= maxBytes) return { strokes, strokesJson, size, tolerance };
  }
  return null;
}
