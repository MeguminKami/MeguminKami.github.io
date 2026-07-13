import { ACTIVITY_TYPES, END_MINUTE, MAX_AVATAR_BYTES, RECURRENCE_MODES, SCHEMA_VERSION, SLOT_MINUTES, START_MINUTE } from "./constants.js";
import { avatarByteSize, decodeAvatarStrokes } from "./avatar.js";
import { parseISODate, pointToVisibleCoordinate } from "./date-time.js";

const ALLOWED_KEYS = new Set(["schemaVersion", "creator", "type", "title", "description", "location", "url", "start", "end", "recurrence", "status", "comment", "version", "createdAt", "updatedAt", "lastEditedBy"]);

export function sanitizeUrl(value) {
  if (!value?.trim()) return "";
  try {
    const url = new URL(value.trim());
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

export function validatePoint(point, kind) {
  if (!point || !parseISODate(point.date) || !Number.isInteger(point.minute)) return `${kind} inválido.`;
  if (point.minute % SLOT_MINUTES !== 0) return `${kind} tem de usar intervalos de 30 minutos.`;
  if (kind === "Início" && (point.minute < START_MINUTE || point.minute >= END_MINUTE)) return "O início deve ficar entre as 07:00 e as 23:30.";
  if (kind === "Fim" && (point.minute < START_MINUTE || point.minute > END_MINUTE)) return "O fim deve ficar entre as 07:00 e as 24:00.";
  return "";
}

export function validateRecurrence(rule) {
  if (rule === null || rule === undefined) return [];
  const errors = [];
  if (!RECURRENCE_MODES.includes(rule.mode)) errors.push("Repetição inválida.");
  if (rule.mode === "custom" && (!Array.isArray(rule.weekdays) || !rule.weekdays.length || rule.weekdays.some((day) => !Number.isInteger(day) || day < 1 || day > 7))) errors.push("Escolhe pelo menos um dia da semana.");
  if (!["never", "until", "count"].includes(rule.endMode)) errors.push("Fim da repetição inválido.");
  if (rule.endMode === "until" && !parseISODate(rule.untilDate)) errors.push("Data final da repetição inválida.");
  if (rule.endMode === "count" && (!Number.isInteger(rule.count) || rule.count < 1 || rule.count > 10000)) errors.push("O número de ocorrências deve ficar entre 1 e 10000.");
  return errors;
}

export function validateActivity(activity, { remote = false } = {}) {
  const errors = [];
  if (!activity || typeof activity !== "object") return ["Atividade inválida."];
  if (remote && Object.keys(activity).some((key) => !ALLOWED_KEYS.has(key))) errors.push("A atividade contém campos desconhecidos.");
  if (activity.schemaVersion !== SCHEMA_VERSION) errors.push("Versão de dados incompatível.");
  if (!["joao", "sofia"].includes(activity.creator)) errors.push("Criador inválido.");
  if (!ACTIVITY_TYPES.includes(activity.type)) errors.push("Tipo inválido.");
  if (typeof activity.title !== "string" || !activity.title.trim() || activity.title.length > 160) errors.push("O título deve ter entre 1 e 160 caracteres.");
  if (typeof activity.description !== "string" || activity.description.length > 4000) errors.push("A descrição é demasiado longa.");
  if (typeof activity.location !== "string" || activity.location.length > 240) errors.push("A localização é demasiado longa.");
  if (typeof activity.url !== "string" || activity.url.length > 2048 || (activity.url && sanitizeUrl(activity.url) !== activity.url)) errors.push("O link deve começar por http:// ou https://.");
  errors.push(validatePoint(activity.start, "Início"), validatePoint(activity.end, "Fim"));
  if (activity.start?.date && activity.end?.date) {
    try {
      if (pointToVisibleCoordinate(activity.end, activity.start.date) <= pointToVisibleCoordinate(activity.start, activity.start.date)) errors.push("O fim deve ser posterior ao início.");
    } catch { errors.push("Intervalo de datas inválido."); }
  }
  if (!["active", "cancelled"].includes(activity.status)) errors.push("Estado inválido.");
  if (!Number.isInteger(activity.version) || activity.version < 1) errors.push("Versão inválida.");
  if (activity.comment !== null && activity.comment !== undefined) {
    if (!["joao", "sofia"].includes(activity.comment.author) || typeof activity.comment.text !== "string" || !activity.comment.text.trim() || activity.comment.text.length > 1000 || activity.comment.author === activity.creator) errors.push("Comentário inválido.");
  }
  errors.push(...validateRecurrence(activity.recurrence));
  return errors.filter(Boolean);
}

export function buildActivity(input, creator) {
  return {
    schemaVersion: SCHEMA_VERSION,
    creator,
    type: input.type,
    title: input.title.trim(),
    description: input.description.trim(),
    location: input.location.trim(),
    url: sanitizeUrl(input.url),
    start: { date: input.start.date, minute: Number(input.start.minute) },
    end: { date: input.end.date, minute: Number(input.end.minute) },
    recurrence: input.recurrence || null,
    status: input.status || "active",
    comment: input.comment || null,
    version: input.version || 1,
    lastEditedBy: creator
  };
}

export function validateProfile(profile) {
  if (!profile || !["joao", "sofia"].includes(profile.id) || typeof profile.displayName !== "string") return false;
  if (!profile.avatar) return true;
  if (!(profile.avatar.formatVersion === 1 && profile.avatar.width === 256 && profile.avatar.height === 256 && typeof profile.avatar.strokesJson === "string" && avatarByteSize(profile.avatar.strokesJson) <= MAX_AVATAR_BYTES)) return false;
  const strokes = decodeAvatarStrokes(profile.avatar.strokesJson);
  return Boolean(strokes && strokes.length <= 10_000);
}
