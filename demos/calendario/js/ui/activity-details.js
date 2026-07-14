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

function detailSection(labelText, content, className = "") {
  const section = document.createElement("section"); section.className = `detail-section ${className}`.trim();
  const label = document.createElement("span"); label.className = "detail-section-label"; label.textContent = labelText;
  section.append(label, content); return section;
}

function commentHeader(author, labelText) {
  const header = document.createElement("div"); header.className = "comment-card-header";
  const mark = document.createElement("span"); mark.className = "comment-author-mark";
  mark.textContent = author === "joao" ? "J" : "S"; mark.setAttribute("aria-hidden", "true");
  const label = document.createElement("strong"); label.textContent = labelText;
  header.append(mark, label); return header;
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
    this.dialog.dataset.type = activity.type;
    document.querySelector("#details-title").textContent = activity.title;
    this.body.replaceChildren(); this.actions.replaceChildren();
    if (activity.status === "cancelled") { const note = document.createElement("span"); note.className = "cancelled-note"; note.textContent = "Cancelada"; this.body.append(note); }
    const description = document.createElement("p"); description.className = `detail-description${activity.description ? "" : " empty"}`; description.textContent = activity.description || "Sem descrição.";
    this.body.append(detailSection("Descrição", description));
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
    this.body.append(detailSection("Informações", meta, "detail-meta-section"));
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
      const authorName = activity.comment.author === "joao" ? "João" : "Sofia";
      const text = document.createElement("p"); text.textContent = activity.comment.text; card.append(commentHeader(activity.comment.author, `${authorName} comentou`), text);
      if (canEditComment(activity, user)) {
        const edit = document.createElement("button"); edit.className = "button"; edit.type = "button"; edit.textContent = "Editar comentário";
        const remove = document.createElement("button"); remove.className = "button button-ghost"; remove.type = "button"; remove.textContent = "Apagar";
        edit.addEventListener("click", () => this.commentForm(activity, user, card, activity.comment.text));
        remove.addEventListener("click", () => this.handlers.removeComment(activity));
        const actions = document.createElement("div"); actions.className = "comment-actions"; actions.append(edit, remove); card.append(actions);
      }
      this.body.append(card);
    } else if (canComment(activity, user)) {
      const area = document.createElement("section"); area.className = `comment-card ${user}`;
      area.append(commentHeader(user, "Deixar um comentário"));
      this.body.append(area); this.commentForm(activity, user, area, "");
    }
  }

  commentForm(activity, user, container, initial) {
    [...container.querySelectorAll("textarea,.comment-save,.comment-actions")].forEach((node) => node.remove());
    const textarea = document.createElement("textarea"); textarea.maxLength = 1000; textarea.value = initial; textarea.placeholder = "Escreve uma mensagem curta…";
    const save = document.createElement("button"); save.type = "button"; save.className = "button button-primary comment-save"; save.textContent = "Guardar comentário";
    save.addEventListener("click", () => { const value = textarea.value.trim(); if (value) this.handlers.saveComment(activity, { author: user, text: value }); });
    container.append(textarea, save); textarea.focus();
  }

  close() { if (this.dialog.open) this.dialog.close(); }
}
