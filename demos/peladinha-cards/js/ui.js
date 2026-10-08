import { icon } from "./icons.js";
export const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function toast(message, type = "success") {
  const root = document.querySelector("#toast-region");
  while (root.children.length >= 2) root.firstElementChild.remove();
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.setAttribute("role", type === "error" ? "alert" : "status");
  el.textContent = message;
  root.append(el);
  setTimeout(() => el.remove(), 5000);
}
export function empty(title, description = "", action = "", symbol = "ball") {
  return `<div class="empty-state"><div class="empty-icon">${icon(symbol)}</div><h3>${esc(title)}</h3><p>${esc(description)}</p>${action}</div>`;
}
export const pageHead = (tag, title, description = "", action = "") =>
  `<div class="page-head"><div><p class="eyebrow">${esc(tag)}</p><h1>${esc(title)}</h1>${description ? `<p class="subtitle">${esc(description)}</p>` : ""}</div>${action}</div>`;
export const linkButton = (href, text, type = "primary", symbol = "arrow") =>
  `<a class="btn btn-${type}" href="${esc(href)}">${icon(symbol)}${esc(text)}</a>`;
export function setMain(html) {
  document.querySelector("#main").innerHTML = html;
}
export function skeleton() {
  return `<div class="skeleton-head skeleton"></div><div class="skeleton-grid">${Array.from({ length: 3 }, () => '<div class="skeleton skeleton-panel"></div>').join("")}</div>`;
}
export function errorPage(error, retry) {
  setMain(
    empty(
      "Não foi possível carregar",
      "Verifica a ligação e as permissões da aplicação. Podes tentar novamente.",
      '<button id="retry" class="btn btn-primary">Tentar novamente</button>',
      "shield",
    ),
  );
  console.error(error);
  document.querySelector("#retry").onclick = retry;
}
export async function busy(button, work) {
  const old = button?.innerHTML;
  if (button) {
    button.disabled = true;
    button.classList.add("is-loading");
    button.setAttribute("aria-busy", "true");
  }
  try {
    return await work();
  } catch (e) {
    toast(friendlyError(e), "error");
    throw e;
  } finally {
    if (button?.isConnected) {
      button.disabled = false;
      button.classList.remove("is-loading");
      button.removeAttribute("aria-busy");
      button.innerHTML = old;
    }
  }
}
export function friendlyError(e) {
  const messages = {
    "auth/invalid-credential": "Username ou password incorrectos.",
    "auth/email-already-in-use": "Este username já existe.",
    "auth/weak-password": "Escolhe uma password com pelo menos 6 caracteres.",
    "auth/unauthorized-domain":
      "O domínio não está autorizado no Firebase Authentication.",
    "permission-denied":
      "Sem permissão. Confirma que as novas regras Firestore foram publicadas.",
    "storage/unauthorized":
      "Não foi possível enviar a fotografia. Confirma as regras Storage.",
    "auth/network-request-failed": "Sem ligação. Tenta novamente.",
  };
  return (
    messages[e.code] ||
    e.message ||
    "Não foi possível guardar. Tenta novamente."
  );
}
export function modal(title, body) {
  const root = document.querySelector("#modal-root"),
    previous = document.activeElement;
  root.innerHTML = `<div class="backdrop"><section class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><button type="button" class="btn btn-icon btn-ghost close-modal" aria-label="Fechar">${icon("close")}</button><h2>${esc(title)}</h2>${body}</section></div>`;
  const close = () => {
    root.innerHTML = "";
    previous?.focus();
  };
  root.querySelector(".close-modal").onclick = close;
  root.querySelector(".backdrop").onclick = (e) => {
    if (e.target === e.currentTarget) close();
  };
  root.onkeydown = (e) => {
    if (e.key === "Escape") close();
    if (e.key === "Tab") {
      const items = [
        ...root.querySelectorAll("button,a,input,select,textarea"),
      ].filter((x) => !x.disabled);
      if (e.shiftKey && document.activeElement === items[0]) {
        e.preventDefault();
        items.at(-1).focus();
      } else if (!e.shiftKey && document.activeElement === items.at(-1)) {
        e.preventDefault();
        items[0].focus();
      }
    }
  };
  root.querySelector("button").focus();
  return close;
}
export function confirmDialog(text) {
  return new Promise((resolve) => {
    const close = modal(
      "Confirmar acção",
      `<p>${esc(text)}</p><div class="actions"><button id="cancel" class="btn btn-secondary">Cancelar</button><button id="confirm" class="btn btn-danger">Confirmar</button></div>`,
    );
    const root = document.querySelector("#modal-root");
    root.querySelector("#cancel").onclick = () => {
      close();
      resolve(false);
    };
    root.querySelector("#confirm").onclick = () => {
      close();
      resolve(true);
    };
    root.querySelector(".close-modal").onclick = () => {
      close();
      resolve(false);
    };
    root.querySelector(".backdrop").onclick = (e) => {
      if (e.target === e.currentTarget) {
        close();
        resolve(false);
      }
    };
    root.addEventListener(
      "keydown",
      (e) => {
        if (e.key === "Escape") resolve(false);
      },
      { once: true },
    );
  });
}
