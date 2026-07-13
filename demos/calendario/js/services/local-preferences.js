const KEYS = Object.freeze({
  access: "oqvf.access.v1",
  user: "oqvf.user.v1",
  sounds: "oqvf.sounds.v1"
});

const ACCESS_HASH = "7f861bcee185de001377d79e08af62e94b1e7718e2470e08520c917f8d953602";

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function verifyAccessCode(value) {
  return (await sha256(value)) === ACCESS_HASH;
}

export function hasAccess() { return localStorage.getItem(KEYS.access) === "granted"; }
export function grantAccess() { localStorage.setItem(KEYS.access, "granted"); }
export function revokeAccess() { localStorage.removeItem(KEYS.access); }

export function getSelectedUser() {
  const value = localStorage.getItem(KEYS.user);
  return ["joao", "sofia"].includes(value) ? value : null;
}

export function setSelectedUser(value) {
  if (["joao", "sofia"].includes(value)) localStorage.setItem(KEYS.user, value);
}

export function getSoundsEnabled() { return localStorage.getItem(KEYS.sounds) !== "off"; }
export function setSoundsEnabled(enabled) { localStorage.setItem(KEYS.sounds, enabled ? "on" : "off"); }
