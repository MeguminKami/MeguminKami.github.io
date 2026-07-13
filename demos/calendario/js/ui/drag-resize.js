import { GRID_SLOT_MINUTES, START_MINUTE, VISIBLE_MINUTES } from "../core/constants.js";
import { formatMinute, pointToVisibleCoordinate, snapMinute, visibleCoordinateToPoint } from "../core/date-time.js";
import { validateActivity } from "../core/validation.js";

export class DragResizeController {
  constructor(calendar, { getState, getActivity, onCommit, announce }) {
    this.calendar = calendar;
    this.getState = getState; this.getActivity = getActivity; this.onCommit = onCommit; this.announce = announce;
    calendar.grid.addEventListener("pointerdown", (event) => this.pointerDown(event));
    document.addEventListener("pointermove", (event) => this.pointerMove(event), { passive: false });
    document.addEventListener("pointerup", (event) => this.pointerUp(event));
    document.addEventListener("pointercancel", (event) => this.cancel(event));
    document.addEventListener("keydown", (event) => { if (event.key === "Escape" && this.session) this.finish(false); });
  }

  pointerDown(event) {
    const card = event.target.closest(".event-card[data-movable='true']");
    if (!card || event.button > 0) return;
    const activity = this.getActivity(card.dataset.renderId);
    if (!activity) return;
    this.calendar.hideTooltip?.();
    const mode = event.target.closest("[data-resize]")?.dataset.resize || "move";
    this.pending = { event, card, activity, mode, startX: event.clientX, startY: event.clientY };
    if (event.pointerType === "touch" && mode === "move") {
      this.longPress = window.setTimeout(() => this.begin(this.pending), 260);
    } else if (mode !== "move") this.begin(this.pending);
  }

  begin(pending) {
    if (!pending || pending !== this.pending) return;
    const state = this.getState();
    const dayIndex = Number(pending.card.closest(".day-column")?.dataset.dayIndex);
    const pointerCoordinate = this.coordinateAt(pending.event.clientX, pending.event.clientY, pending.mode === "move" ? null : dayIndex);
    if (pointerCoordinate === null) return;
    pending.event.preventDefault();
    pending.card.setPointerCapture?.(pending.event.pointerId);
    const originalStart = pointToVisibleCoordinate(pending.activity.start, state.windowStart);
    const originalEnd = pointToVisibleCoordinate(pending.activity.end, state.windowStart);
    this.session = {
      ...pending, dayIndex, pointerId: pending.event.pointerId, pointerCoordinate, originalStart, originalEnd, delta: 0, valid: true,
      originalTop: pending.card.style.top, originalHeight: pending.card.style.height, originalCompact: pending.card.classList.contains("compact")
    };
    pending.card.classList.add(pending.mode === "move" ? "dragging-source" : "resizing-source");
    if (pending.mode !== "move") pending.card.classList.add(`resizing-${pending.mode}`);
    this.ghost = document.createElement("div"); this.ghost.className = "event-ghost"; document.body.append(this.ghost);
    this.updateGhost(pending.event.clientX, pending.event.clientY, pending.activity.start, pending.activity.end);
    this.announce("A ajustar atividade. Move em intervalos de 30 minutos e larga para guardar.");
  }

  pointerMove(event) {
    if (this.pending && !this.session && event.pointerId === this.pending.event.pointerId) {
      const distance = Math.hypot(event.clientX - this.pending.startX, event.clientY - this.pending.startY);
      if (this.pending.event.pointerType === "touch") {
        if (distance > 8) { clearTimeout(this.longPress); this.pending = null; }
      } else if (distance > 5) {
        this.begin(this.pending);
        if (this.session) this.pointerMove(event);
      }
      return;
    }
    const session = this.session;
    if (!session || event.pointerId !== session.pointerId) return;
    event.preventDefault();
    const coordinate = this.coordinateAt(event.clientX, event.clientY, session.mode === "move" ? null : session.dayIndex);
    if (coordinate === null) return;
    const delta = snapMinute(coordinate - session.pointerCoordinate);
    session.delta = delta;
    let startCoordinate = session.originalStart;
    let endCoordinate = session.originalEnd;
    if (session.mode === "move") { startCoordinate += delta; endCoordinate += delta; }
    if (session.mode === "start") startCoordinate += delta;
    if (session.mode === "end") endCoordinate += delta;
    const state = this.getState();
    const start = visibleCoordinateToPoint(startCoordinate, state.windowStart, "start");
    const end = visibleCoordinateToPoint(endCoordinate, state.windowStart, "end");
    const candidate = { ...session.activity, start, end };
    const errors = validateActivity(candidate);
    session.valid = !errors.length && startCoordinate >= 0 && startCoordinate < VISIBLE_MINUTES * 7;
    session.candidate = candidate;
    this.ghost.classList.toggle("invalid", !session.valid);
    session.card.classList.toggle("invalid", !session.valid);
    if (session.mode !== "move") this.previewResize(session, startCoordinate, endCoordinate);
    this.updateGhost(event.clientX, event.clientY, start, end, errors[0]);
    const dayEnd = (session.dayIndex + 1) * VISIBLE_MINUTES;
    this.highlight(session.mode === "move" ? startCoordinate : Math.min(coordinate, dayEnd - 1));
    this.autoScroll(event.clientX, event.clientY, session.mode === "move");
  }

  pointerUp(event) {
    clearTimeout(this.longPress);
    if (!this.session) { this.pending = null; return; }
    if (event.pointerId !== this.session.pointerId) return;
    const session = this.session;
    if (session.delta && session.valid && session.candidate) {
      const candidate = session.candidate;
      this.finish(true);
      this.onCommit(session.activity, { start: candidate.start, end: candidate.end }, session.mode);
    } else this.finish(false);
  }

  cancel(event) { if (this.session && event.pointerId === this.session.pointerId) this.finish(false); }

  finish(committed) {
    clearTimeout(this.longPress);
    const session = this.session;
    session?.card.classList.remove("dragging-source", "resizing-source", "resizing-start", "resizing-end", "invalid");
    if (session && session.mode !== "move") {
      if (committed) session.card.classList.add("resize-pending");
      else {
        session.card.style.top = session.originalTop;
        session.card.style.height = session.originalHeight;
        session.card.classList.toggle("compact", session.originalCompact);
      }
    }
    this.ghost?.remove(); this.ghost = null;
    this.calendar.grid.querySelectorAll(".drop-target").forEach((element) => element.classList.remove("drop-target"));
    this.calendar.suppressClick = true;
    setTimeout(() => { this.calendar.suppressClick = false; }, 50);
    this.session = null; this.pending = null;
    this.announce(committed ? "A guardar o novo horário." : "Alteração cancelada.");
  }

  coordinateAt(x, y, lockedDay = null) {
    const columns = [...this.calendar.grid.querySelectorAll(".day-column")];
    let closest = null; let distance = Infinity;
    columns.forEach((column, index) => {
      if (Number.isInteger(lockedDay) && index !== lockedDay) return;
      const rect = column.getBoundingClientRect();
      const current = x < rect.left ? rect.left - x : x > rect.right ? x - rect.right : 0;
      if (current < distance) { distance = current; closest = { column, index, rect }; }
    });
    if (!closest) return null;
    const ratio = Math.max(0, Math.min(1, (y - closest.rect.top) / closest.rect.height));
    return closest.index * VISIBLE_MINUTES + snapMinute(ratio * VISIBLE_MINUTES);
  }

  previewResize(session, startCoordinate, endCoordinate) {
    const dayStart = session.dayIndex * VISIBLE_MINUTES;
    const dayEnd = dayStart + VISIBLE_MINUTES;
    const visibleStart = Math.max(dayStart, Math.min(dayEnd, startCoordinate));
    const visibleEnd = Math.max(dayStart, Math.min(dayEnd, endCoordinate));
    const duration = Math.max(0, visibleEnd - visibleStart);
    session.card.style.top = `${((visibleStart - dayStart) / VISIBLE_MINUTES) * 100}%`;
    session.card.style.height = duration ? `calc(${(duration / VISIBLE_MINUTES) * 100}% - 2px)` : "4px";
    session.card.classList.toggle("compact", duration > 0 && duration <= 30);
  }

  updateGhost(x, y, start, end, error = "") {
    this.ghost.style.left = `${Math.min(innerWidth - 230, x + 14)}px`;
    this.ghost.style.top = `${Math.max(8, Math.min(innerHeight - 60, y + 14))}px`;
    this.ghost.textContent = error || `${start.date} ${formatMinute(start.minute)} → ${end.date} ${formatMinute(end.minute)}`;
  }

  highlight(startCoordinate) {
    this.calendar.grid.querySelectorAll(".drop-target").forEach((element) => element.classList.remove("drop-target"));
    const day = Math.floor(startCoordinate / VISIBLE_MINUTES);
    const within = startCoordinate - day * VISIBLE_MINUTES;
    const minute = START_MINUTE + within;
    const gridMinute = START_MINUTE + Math.floor((minute - START_MINUTE) / GRID_SLOT_MINUTES) * GRID_SLOT_MINUTES;
    this.calendar.grid.querySelector(`.day-column[data-day-index="${day}"] .slot-button[data-minute="${gridMinute}"]`)?.classList.add("drop-target");
  }

  autoScroll(x, y, horizontal = true) {
    if (horizontal && x < 85) this.calendar.scroller.scrollLeft -= 12;
    if (horizontal && x > innerWidth - 35) this.calendar.scroller.scrollLeft += 12;
    if (y < 75) window.scrollBy(0, -10);
    if (y > innerHeight - 35) window.scrollBy(0, 10);
  }
}
