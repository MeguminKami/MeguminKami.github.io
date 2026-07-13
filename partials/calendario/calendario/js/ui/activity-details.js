import { formatDateLong, formatMinute } from "../core/date-time.js";
import { canComment, canEditComment, canModify } from "../core/permissions.js";

function iconButton(label, icon, action, className = "button") {
  const button = document.createElement("button");
  button.type = "button"; button.className = className; button.dataset.action = action;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("class", "icon");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use"); use.setAttribute("href", `./assets/icons.svg#${icon}`); svg.append(use);
  const text = document.createElement("span"); text.textContent = label; button.append(svg, text); return button;
}

function metaRow(icon, content) {
  const row = document.createElement("div"); row.className = "detail-meta-row";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("class", "icon");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use"); use.setAttribute("href", `./assets/icons.svg#${icon}`); svg.append(use);
  const span = document.createElement("span"); span.textContent = content; row.append(svg, span); return row;
}

export class ActivityDetails {
  constructor(handlers) {
    this.dialog = document.querySelector("#details-dialog");
    this.body = document.querySelector("#details-body");
    this.actions = document.querySelector("#details-actions");
    this.handlers = handlers;
  }

  open(activity, user) {
    this.activity = activity;
    document.querySelector("#details-title").textContent = activity.title;
    this.body.replaceChildren(); this.actions.replaceChildren();
    if (activity.status === "cancelled") { const note = document.createElement("span"); note.className = "cancelled-note"; note.textContent = "Cancelada"; this.body.append(note); }
    const description = document.createElement("p"); description.className = "detail-description"; description.textContent = activity.description || "Sem descrição."; this.body.append(description);
    const meta = document.createElement("div"); meta.className = "detail-meta";
    const sameDay = activity.start.date === activity.end.date;
    const when = sameDay ? `${formatDateLong(activity.start.date)} · ${formatMinute(activity.start.minute)}–${formatMinute(activity.end.minute)}` : `${formatDateLong(activity.start.date)} ${formatMinute(activity.start.minute)} → ${formatDateLong(activity.end.date)} ${formatMinute(activity.end.minute)}`;
    meta.append(metaRow("i-calendar", when));
    if (activity.location) meta.append(metaRow("i-map-pin", activity.location));
    if (activity.url) {
      const row = metaRow("i-link", "");
      const link = document.createElement("a"); link.href = activity.url; link.target = "_blank"; link.rel = "noopener noreferrer"; link.textContent = activity.url; row.lastChild.replaceWith(link); meta.append(row);
    }
    if (activity.isRecurring) meta.append(metaRow("i-calendar", "Atividade recorrente"));
    this.body.append(meta);
    this.renderComment(activity, user);
    if (canModify(activity, user)) {
      this.actions.append(iconButton("Editar", "i-edit", "edit"));
      this.actions.append(iconButton(activity.status === "cancelled" ? "Reativar" : "Cancelar", "i-x-circle", "cancel"));
      this.actions.append(iconButton("Remover", "i-trash", "remove", "button button-danger"));
    } else {
      const permission = document.createElement("p"); permission.className = "lede"; permission.textContent = "Só quem criou esta atividade individual pode alterá-la."; this.body.append(permission);
    }
    this.actions.addEventListener("click", this.actionListener = async (event) => {
      const action = event.target.closest("[data-action]")?.dataset.action;
      if (!action) return;
      await this.handlers[action]?.(this.activity);
    }, { once: false });
    this.dialog.addEventListener("close", () => this.actions.removeEventListener("click", this.actionListener), { once: true });
    this.dialog.showModal();
  }

  renderComment(activity, user) {
    if (activity.comment) {
      const card = document.createElement("section"); card.className = `comment-card ${activity.comment.author}`;
      const title = document.createElement("strong"); title.textContent = `${activity.comment.author === "joao" ? "João" : "Sofia"} comentou`;
      const text = document.createElement("p"); text.textContent = activity.comment.text; card.append(title, text);
      if (canEditComment(activity, user)) {
        const edit = document.createElement("button"); edit.className = "button"; edit.type = "button"; edit.textContent = "Editar comentário";
        const remove = document.createElement("button"); remove.className = "button button-ghost"; remove.type = "button"; remove.textContent = "Apagar";
        edit.addEventListener("click", () => this.commentForm(activity, user, card, activity.comment.text));
        remove.addEventListener("click", () => this.handlers.removeComment(activity)); card.append(edit, remove);
      }
      this.body.append(card);
    } else if (canComment(activity, user)) {
      const area = document.createElement("section"); area.className = `comment-card ${user}`;
      const title = document.createElement("strong"); title.textContent = "Deixar um comentário"; area.append(title);
      this.body.append(area); this.commentForm(activity, user, area, "");
    }
  }

  commentForm(activity, user, container, initial) {
    [...container.querySelectorAll("textarea,.comment-save")].forEach((node) => node.remove());
    const textarea = document.createElement("textarea"); textarea.maxLength = 1000; textarea.value = initial; textarea.placeholder = "Escreve uma mensagem curta…";
    const save = document.createElement("button"); save.type = "button"; save.className = "button button-primary comment-save"; save.textContent = "Guardar comentário";
    save.addEventListener("click", () => { const value = textarea.value.trim(); if (value) this.handlers.saveComment(activity, { author: user, text: value }); });
    container.append(textarea, save); textarea.focus();
  }

  close() { if (this.dialog.open) this.dialog.close(); }
}
