export const USERS = Object.freeze({
  joao: Object.freeze({ id: "joao", name: "João" }),
  sofia: Object.freeze({ id: "sofia", name: "Sofia" })
});

export const ACTIVITY_TYPES = Object.freeze(["joao", "sofia", "casal"]);
export const START_MINUTE = 7 * 60;
export const END_MINUTE = 24 * 60;
export const SLOT_MINUTES = 60;
export const VISIBLE_MINUTES = END_MINUTE - START_MINUTE;
export const SLOT_COUNT = VISIBLE_MINUTES / SLOT_MINUTES;
export const TIMEZONE = "Europe/Lisbon";
export const SCHEMA_VERSION = 1;
export const MAX_AVATAR_BYTES = 180_000;

export const RECURRENCE_MODES = Object.freeze([
  "daily",
  "weekly",
  "weekdays",
  "custom",
  "monthly"
]);
