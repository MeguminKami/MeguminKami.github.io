const SEARCH_VALUE_KEY = "searchValue";

export function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

export function escapeHtml(value) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(String(value ?? "")));
  return div.innerHTML;
}

export function formatPrice(value) {
  return `${Number(value ?? 0).toFixed(2)}€`;
}

export function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value ?? "").trim());
}

export function getQueryParams() {
  return new URLSearchParams(window.location.search);
}

export function getIntParam(name) {
  const value = getQueryParams().get(name);
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export function setSearchHandoff(value) {
  localStorage.setItem(SEARCH_VALUE_KEY, String(value ?? ""));
}

export function consumeSearchHandoff() {
  const value = localStorage.getItem(SEARCH_VALUE_KEY) ?? "";
  localStorage.removeItem(SEARCH_VALUE_KEY);
  return value;
}

export function toRootUrl(path = "") {
  const normalizedPath = String(path ?? "").replace(/^\/+/, "");
  return new URL(normalizedPath, document.baseURI).href;
}

export function redirectTo(path) {
  window.location.href = toRootUrl(path);
}

export function replaceTo(path) {
  window.location.replace(toRootUrl(path));
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function formatOrderDate(date = new Date()) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  return `${day}/${month}/${year}`;
}

export function toPositiveInteger(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
}

export function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function buildStoreItemHref(id) {
  return toRootUrl(`store/item/index.html?itemId=${id}`);
}

export function updateQuery(params) {
  const url = new URL(window.location.href);

  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") {
      url.searchParams.delete(key);
      return;
    }

    url.searchParams.set(key, value);
  });

  window.history.replaceState({}, "", url);
}
