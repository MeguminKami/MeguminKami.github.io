import { formatDateLong, formatMinute } from "../core/date-time.js";
import { canModify } from "../core/permissions.js";

function menuButton(label, icon, action, className = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `event-menu-action ${className}`.trim();
  button.dataset.action = action;
  button.setAttribute("role", "menuitem");
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "icon");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", `./assets/icons.svg#${icon}`);
  svg.append(use);
  const text = document.createElement("span");
  text.textContent = label;
  button.append(svg, text);
  return button;
}

export class ActivityMenu {
  constructor(handlers) {
    this.root = document.querySelector("#activity-action-menu");
    this.handlers = handlers;
    this.activity = null;
    this.anchor = null;
    this.root.addEventListener("click", async (event) => {
      const action = event.target.closest("[data-action]")?.dataset.action;
      if (!action || !this.activity) return;
      const activity = this.activity;
      this.close();
      await this.handlers[action]?.(activity);
    });
    document.addEventListener("pointerdown", (event) => {
      if (!this.root.hidden && !this.root.contains(event.target) && !event.target.closest(".event-card")) this.close();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !this.root.hidden) {
        event.preventDefault();
        const anchor = this.anchor;
        this.close();
        anchor?.focus();
      }
    });
    window.addEventListener("resize", () => this.close());
    window.addEventListener("scroll", () => this.close(), true);
  }

  open(activity, anchor, user) {
    if (!activity || !anchor) return;
    if (!this.root.hidden && this.anchor === anchor) { this.close(); return; }
    this.close();
    this.activity = activity;
    this.anchor = anchor;
    this.root.dataset.type = activity.type;
    const header = document.createElement("div");
    header.className = "event-menu-header";
    const copy = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = activity.title;
    const startMinute = activity.startMinute ?? activity.start?.minute;
    const endMinute = activity.endMinute ?? activity.end?.minute;
    const date = activity.date || activity.start?.date;
    const when = document.createElement("span");
    when.textContent = `${formatDateLong(date, true)} · ${formatMinute(startMinute)}–${formatMinute(endMinute)}`;
    copy.append(title, when);
    header.append(copy);
    if (activity.status === "cancelled") {
      const badge = document.createElement("span");
      badge.className = "event-menu-badge";
      badge.textContent = "Cancelada";
      header.append(badge);
    }
    const actions = document.createElement("div");
    actions.className = "event-menu-actions";
    actions.append(menuButton("Detalhes e comentário", "i-message", "details"));
    if (canModify(activity, user)) {
      actions.append(menuButton("Editar", "i-edit", "edit"));
      actions.append(menuButton(activity.status === "cancelled" ? "Reativar" : "Cancelar", "i-x-circle", "cancel", "event-menu-cancel"));
      actions.append(menuButton("Apagar", "i-trash", "remove", "event-menu-remove"));
    } else {
      const note = document.createElement("p");
      note.className = "event-menu-note";
      note.textContent = "Só quem criou esta atividade pode alterá-la.";
      actions.append(note);
    }
    this.root.replaceChildren(header, actions);
    this.root.hidden = false;
    anchor.setAttribute("aria-expanded", "true");
    this.position();
    this.root.querySelector("button")?.focus({ preventScroll: true });
  }

  position() {
    if (!this.anchor || this.root.hidden) return;
    const anchor = this.anchor.getBoundingClientRect();
    const menu = this.root.getBoundingClientRect();
    const gap = 8;
    const left = Math.max(10, Math.min(anchor.left, innerWidth - menu.width - 10));
    const below = anchor.bottom + gap;
    const top = below + menu.height <= innerHeight - 10 ? below : Math.max(10, anchor.top - menu.height - gap);
    this.root.style.left = `${left}px`;
    this.root.style.top = `${top}px`;
  }

  close() {
    if (this.anchor) this.anchor.setAttribute("aria-expanded", "false");
    this.root.hidden = true;
    this.root.replaceChildren();
    this.activity = null;
    this.anchor = null;
  }
}
