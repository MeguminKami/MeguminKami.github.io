import { SLOT_MINUTES, START_MINUTE, VISIBLE_MINUTES } from "../core/constants.js";
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
    const mode = event.target.closest("[data-resize]")?.dataset.resize || "move";
    this.pending = { event, card, activity, mode, startX: event.clientX, startY: event.clientY };
    if (event.pointerType === "touch" && mode === "move") {
      this.longPress = window.setTimeout(() => this.begin(this.pending), 260);
    } else if (mode !== "move") this.begin(this.pending);
  }

  begin(pending) {
    if (!pending || pending !== this.pending) return;
    const state = this.getState();
    const pointerCoordinate = this.coordinateAt(pending.event.clientX, pending.event.clientY);
    if (pointerCoordinate === null) return;
    pending.event.preventDefault();
    pending.card.setPointerCapture?.(pending.event.pointerId);
    const originalStart = pointToVisibleCoordinate(pending.activity.start, state.windowStart);
    const originalEnd = pointToVisibleCoordinate(pending.activity.end, state.windowStart);
    this.session = { ...pending, pointerId: pending.event.pointerId, pointerCoordinate, originalStart, originalEnd, delta: 0, valid: true };
    pending.card.classList.add("dragging-source");
    this.ghost = document.createElement("div"); this.ghost.className = "event-ghost"; document.body.append(this.ghost);
    this.updateGhost(pending.event.clientX, pending.event.clientY, pending.activity.start, pending.activity.end);
    this.announce("A ajustar atividade. Move em intervalos de uma hora e larga para guardar.");
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
    const coordinate = this.coordinateAt(event.clientX, event.clientY);
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
    this.updateGhost(event.clientX, event.clientY, start, end, errors[0]);
    this.highlight(startCoordinate);
    this.autoScroll(event.clientX, event.clientY);
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
    session?.card.classList.remove("dragging-source");
    this.ghost?.remove(); this.ghost = null;
    this.calendar.grid.querySelectorAll(".drop-target").forEach((element) => element.classList.remove("drop-target"));
    this.calendar.suppressClick = true;
    setTimeout(() => { this.calendar.suppressClick = false; }, 50);
    this.session = null; this.pending = null;
    this.announce(committed ? "A guardar o novo horário." : "Alteração cancelada.");
  }

  coordinateAt(x, y) {
    const columns = [...this.calendar.grid.querySelectorAll(".day-column")];
    let closest = null; let distance = Infinity;
    columns.forEach((column, index) => {
      const rect = column.getBoundingClientRect();
      const current = x < rect.left ? rect.left - x : x > rect.right ? x - rect.right : 0;
      if (current < distance) { distance = current; closest = { column, index, rect }; }
    });
    if (!closest) return null;
    const ratio = Math.max(0, Math.min(1, (y - closest.rect.top) / closest.rect.height));
    return closest.index * VISIBLE_MINUTES + snapMinute(ratio * VISIBLE_MINUTES);
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
    this.calendar.grid.querySelector(`.day-column[data-day-index="${day}"] .slot-button[data-minute="${minute}"]`)?.classList.add("drop-target");
  }

  autoScroll(x, y) {
    if (x < 85) this.calendar.scroller.scrollLeft -= 12;
    if (x > innerWidth - 35) this.calendar.scroller.scrollLeft += 12;
    if (y < 75) window.scrollBy(0, -10);
    if (y > innerHeight - 35) window.scrollBy(0, 10);
  }
}
