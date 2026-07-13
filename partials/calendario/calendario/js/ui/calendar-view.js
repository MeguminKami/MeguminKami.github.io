import { END_MINUTE, SLOT_COUNT, SLOT_MINUTES, START_MINUTE, USERS, VISIBLE_MINUTES } from "../core/constants.js";
import { addDays, formatDateLong, formatDateRange, formatMinute, getLisbonParts, nowLinePosition } from "../core/date-time.js";
import { layoutDaySegments } from "../core/layout.js";
import { expandAndSegment } from "../core/recurrence.js";

export class CalendarView {
  constructor({ onSlot, onEvent, canModify }) {
    this.header = document.querySelector("#calendar-days-header");
    this.gutter = document.querySelector("#time-gutter");
    this.grid = document.querySelector("#days-grid");
    this.strip = document.querySelector("#date-strip");
    this.scroller = document.querySelector("#calendar-scroller");
    this.tooltip = document.querySelector("#tooltip");
    this.onSlot = onSlot; this.onEvent = onEvent; this.canModify = canModify;
    this.state = null;
    this.renderGutter();
    this.grid.addEventListener("click", (event) => {
      const slot = event.target.closest(".slot-button");
      if (slot) this.onSlot({ date: slot.dataset.date, minute: Number(slot.dataset.minute) });
      const card = event.target.closest(".event-card");
      if (card && !this.suppressClick) { this.hideTooltip(); this.onEvent(this.eventMap.get(card.dataset.renderId), card); }
    });
    this.grid.addEventListener("keydown", (event) => this.onGridKeydown(event));
    this.grid.addEventListener("pointerover", (event) => this.showTooltipFor(event.target.closest(".event-card")));
    this.grid.addEventListener("pointerout", (event) => { if (event.target.closest(".event-card")) this.hideTooltip(); });
    this.grid.addEventListener("focusin", (event) => this.showTooltipFor(event.target.closest(".event-card")));
    this.grid.addEventListener("focusout", () => this.hideTooltip());
    this.nowTimer = window.setInterval(() => this.renderNowLine(), 30_000);
  }

  renderGutter() {
    this.gutter.replaceChildren();
    for (let minute = START_MINUTE; minute < END_MINUTE; minute += SLOT_MINUTES) {
      const label = document.createElement("span"); label.className = "time-label"; label.textContent = formatMinute(minute);
      this.gutter.append(label);
    }
  }

  render(state) {
    this.state = state;
    this.eventMap = new Map();
    const occurrences = expandAndSegment(state.activities, state.overrides, state.windowStart, 7);
    state.occurrences = occurrences;
    this.renderHeaders();
    this.grid.replaceChildren();
    const today = getLisbonParts().date;
    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const date = addDays(state.windowStart, dayIndex);
      const column = document.createElement("div");
      column.className = `day-column${date === today ? " today" : ""}`;
      column.dataset.dayIndex = String(dayIndex); column.dataset.date = date; column.setAttribute("role", "row");
      for (let slotIndex = 0; slotIndex < SLOT_COUNT; slotIndex += 1) {
        const minute = START_MINUTE + slotIndex * SLOT_MINUTES;
        const button = document.createElement("button");
        button.type = "button"; button.className = "slot-button"; button.dataset.date = date; button.dataset.minute = String(minute); button.dataset.slotIndex = String(dayIndex * SLOT_COUNT + slotIndex);
        button.style.top = `calc(${slotIndex} * var(--slot-height))`;
        button.tabIndex = dayIndex === 0 && slotIndex === 0 ? 0 : -1;
        button.setAttribute("role", "gridcell"); button.setAttribute("aria-label", `Criar atividade em ${formatDateLong(date)} às ${formatMinute(minute)}`);
        column.append(button);
      }
      const layer = document.createElement("div"); layer.className = "events-layer"; layer.dataset.eventsDay = date;
      const daySegments = occurrences.filter((segment) => segment.date === date);
      layoutDaySegments(daySegments).forEach((fragment) => layer.append(this.eventCard(fragment)));
      column.append(layer); this.grid.append(column);
    }
    if (!occurrences.length) {
      const empty = document.createElement("div"); empty.className = "empty-message"; empty.textContent = "Ainda não há atividades nestes dias. Toca num intervalo para combinar algo bonito."; this.grid.append(empty);
    }
    const line = document.createElement("div"); line.id = "now-line"; line.className = "now-line"; line.hidden = true; this.grid.append(line);
    this.renderNowLine();
  }

  renderHeaders() {
    this.header.replaceChildren(); this.strip.replaceChildren();
    const spacer = document.createElement("div"); spacer.className = "time-header"; spacer.setAttribute("aria-hidden", "true"); this.header.append(spacer);
    const today = getLisbonParts().date;
    for (let index = 0; index < 7; index += 1) {
      const date = addDays(this.state.windowStart, index);
      const header = document.createElement("div"); header.className = `day-header${date === today ? " today" : ""}`;
      const fullDate = formatDateLong(date);
      const weekdayName = fullDate.split(",")[0];
      const strong = document.createElement("strong"); strong.textContent = weekdayName.charAt(0).toLocaleUpperCase("pt-PT") + weekdayName.slice(1);
      const shortDate = `${date.slice(8, 10)}/${date.slice(5, 7)}`;
      const span = document.createElement("span"); span.textContent = date === today ? `Hoje · ${shortDate}` : shortDate;
      const lanes = document.createElement("div"); lanes.className = "lane-labels";
      const j = document.createElement("i"); j.className = "j"; j.textContent = "João"; const s = document.createElement("i"); s.className = "s"; s.textContent = "Sofia"; lanes.append(j, s);
      header.append(strong, span, lanes); this.header.append(header);
      const compact = formatDateLong(date, true);
      const chip = document.createElement("button"); chip.type = "button"; chip.className = `date-chip${date === today ? " today" : ""}`; chip.textContent = compact.charAt(0).toLocaleUpperCase("pt-PT") + compact.slice(1);
      chip.addEventListener("click", () => this.scrollToDay(index)); this.strip.append(chip);
    }
    document.querySelector("#range-title").textContent = formatDateRange(this.state.windowStart, addDays(this.state.windowStart, 6));
  }

  eventCard(fragment) {
    this.eventMap.set(fragment.renderId, fragment);
    const card = document.createElement("button");
    card.type = "button"; card.className = `event-card ${fragment.type} lane-${fragment.lane}${fragment.fused ? " fused" : ""}${fragment.status === "cancelled" ? " cancelled" : ""}`;
    card.dataset.renderId = fragment.renderId; card.dataset.segmentId = fragment.segmentId; card.dataset.lane = fragment.lane;
    card.style.top = `${((fragment.startMinute - START_MINUTE) / VISIBLE_MINUTES) * 100}%`;
    card.style.height = `calc(${((fragment.endMinute - fragment.startMinute) / VISIBLE_MINUTES) * 100}% - 2px)`;
    card.style.left = `${fragment.leftPercent}%`; card.style.width = `calc(${fragment.widthPercent}% - 2px)`;
    card.style.zIndex = fragment.type === "casal" ? "3" : "4";
    card.setAttribute("aria-label", `${fragment.title}, ${formatMinute(fragment.startMinute)} a ${formatMinute(fragment.endMinute)}${fragment.status === "cancelled" ? ", cancelada" : ""}`);
    card.setAttribute("aria-haspopup", "menu"); card.setAttribute("aria-controls", "activity-action-menu"); card.setAttribute("aria-expanded", "false");
    const title = document.createElement("span"); title.className = "event-title";
    const dot = document.createElement("span"); dot.className = "event-type-dot"; title.append(dot, document.createTextNode(fragment.title));
    const time = document.createElement("span"); time.className = "event-time"; time.textContent = `${formatMinute(fragment.startMinute)}–${formatMinute(fragment.endMinute)}`;
    card.append(title, time);
    if (fragment.status === "cancelled") { const label = document.createElement("span"); label.className = "event-cancelled-label"; label.textContent = "Cancelada"; card.append(label); }
    if (this.canModify(fragment) && fragment.status !== "cancelled") {
      const edges = [];
      if (fragment.date === fragment.start.date) edges.push("start");
      if (fragment.date === fragment.end.date) edges.push("end");
      for (const edge of edges) { const handle = document.createElement("span"); handle.className = `resize-handle ${edge}`; handle.dataset.resize = edge; handle.setAttribute("aria-hidden", "true"); card.append(handle); }
      card.dataset.movable = "true";
    }
    return card;
  }

  renderNowLine() {
    if (!this.state) return;
    const line = document.querySelector("#now-line"); if (!line) return;
    const position = nowLinePosition(this.state.windowStart);
    line.hidden = !position;
    if (position) line.style.top = `${position.ratio * 100}%`;
  }

  showTooltipFor(card) {
    if (!card) return;
    const activity = this.eventMap.get(card.dataset.renderId); if (!activity) return;
    this.tooltip.textContent = activity.description || `${activity.title} · ${formatMinute(activity.startMinute)}–${formatMinute(activity.endMinute)}`;
    const rect = card.getBoundingClientRect(); this.tooltip.style.left = `${Math.min(rect.left, innerWidth - 310)}px`; this.tooltip.style.top = `${Math.min(rect.bottom + 5, innerHeight - 90)}px`; this.tooltip.hidden = false;
  }
  hideTooltip() { this.tooltip.hidden = true; }

  onGridKeydown(event) {
    const slot = event.target.closest(".slot-button"); if (!slot) return;
    const direction = { ArrowDown: 1, ArrowUp: -1, ArrowRight: SLOT_COUNT, ArrowLeft: -SLOT_COUNT }[event.key];
    if (direction) {
      event.preventDefault(); const next = Number(slot.dataset.slotIndex) + direction;
      const target = this.grid.querySelector(`[data-slot-index="${Math.max(0, Math.min(SLOT_COUNT * 7 - 1, next))}"]`);
      if (target) { slot.tabIndex = -1; target.tabIndex = 0; target.focus(); }
    } else if (event.key === "Enter" || event.key === " ") { event.preventDefault(); slot.click(); }
  }

  scrollToDay(index) {
    const header = this.header.children[index + 1];
    if (header) this.scroller.scrollTo({ left: Math.max(0, header.offsetLeft - parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--time-width"))), behavior: "smooth" });
  }
}
