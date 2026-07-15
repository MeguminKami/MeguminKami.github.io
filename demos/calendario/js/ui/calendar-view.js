import { END_MINUTE, GRID_SLOT_MINUTES, HOUR_COUNT, HOUR_MINUTES, SLOT_COUNT, SLOT_MINUTES, START_MINUTE, USERS, VISIBLE_MINUTES } from "../core/constants.js";
import { addDays, formatDateLong, formatDateRange, formatMinute, getLisbonParts, nowLinePosition } from "../core/date-time.js";
import { calculateVisibleDayLayout, layoutDaySegments } from "../core/layout.js";
import { expandAndSegment } from "../core/recurrence.js";

const DAY_PHASES = Object.freeze([
  { name: "amanhecer", icon: "i-sunrise", minute: 450 },
  { name: "manhã", icon: "i-sun", minute: 660 },
  { name: "meio-dia", icon: "i-cloud-sun", minute: 840 },
  { name: "entardecer", icon: "i-sunset", minute: 1110 },
  { name: "noite", icon: "i-moon-star", minute: 1320 }
]);

function svgIcon(symbol, className = "icon") {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", className);
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", `./assets/icons.svg#${symbol}`);
  svg.append(use);
  return svg;
}

function previewSection(labelText, text, className = "") {
  const section = document.createElement("section");
  section.className = `tooltip-section ${className}`.trim();
  const label = document.createElement("span"); label.className = "tooltip-label"; label.textContent = labelText;
  const copy = document.createElement("p"); copy.textContent = text;
  section.append(label, copy);
  return section;
}

export class CalendarView {
  constructor({ onSlot, onEvent, canModify, nowLineScope = "week" }) {
    this.header = document.querySelector("#calendar-days-header");
    this.gutter = document.querySelector("#time-gutter");
    this.grid = document.querySelector("#days-grid");
    this.strip = document.querySelector("#date-strip");
    this.scroller = document.querySelector("#calendar-scroller");
    this.container = this.scroller.closest(".calendar-container");
    this.tooltip = document.querySelector("#tooltip");
    this.onSlot = onSlot; this.onEvent = onEvent; this.canModify = canModify;
    this.nowLineScope = nowLineScope === "today" ? "today" : "week";
    this.state = null;
    this.activeDay = -1;
    this.renderGutter();
    this.grid.addEventListener("click", (event) => {
      const slot = event.target.closest(".slot-button");
      if (slot) this.onSlot({ date: slot.dataset.date, minute: Number(slot.dataset.minute) });
      const card = event.target.closest(".event-card");
      if (card && !this.suppressClick) { this.hideTooltip(); this.onEvent(this.eventMap.get(card.dataset.renderId), card); }
    });
    this.grid.addEventListener("keydown", (event) => this.onGridKeydown(event));
    this.grid.addEventListener("pointerover", (event) => {
      const card = event.target.closest(".event-card");
      const related = event.relatedTarget;
      if (!card || (related instanceof Node && card.contains(related))) return;
      if (event.target.closest(".resize-handle")) this.hideTooltip();
      else this.showTooltipFor(card);
    });
    this.grid.addEventListener("pointerout", (event) => {
      const card = event.target.closest(".event-card");
      const related = event.relatedTarget;
      if (card && !(related instanceof Node && card.contains(related))) this.queueTooltipHide();
    });
    this.grid.addEventListener("focusin", (event) => this.showTooltipFor(event.target.closest(".event-card"), true));
    this.grid.addEventListener("focusout", () => this.queueTooltipHide());
    this.scroller.addEventListener("scroll", () => {
      this.hideTooltip();
      if (this.scrollFrame) return;
      this.scrollFrame = requestAnimationFrame(() => { this.scrollFrame = null; this.syncActiveDay(); });
    }, { passive: true });
    this.scroller.addEventListener("wheel", (event) => {
      if (!event.shiftKey && Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      const delta = event.shiftKey ? event.deltaY : event.deltaX;
      if (!delta) return;
      event.preventDefault();
      this.scroller.scrollLeft += delta;
    }, { passive: false });
    this.onResize = () => { this.hideTooltip(); this.scheduleResponsiveLayout(); };
    window.addEventListener("resize", this.onResize, { passive: true });
    this.resizeObserver = new ResizeObserver(() => this.scheduleResponsiveLayout());
    this.resizeObserver.observe(this.scroller);
    this.nowTimer = window.setInterval(() => this.renderNowLine(), 30_000);
  }

  renderGutter() {
    this.gutter.replaceChildren();
    for (let minute = START_MINUTE; minute <= END_MINUTE; minute += HOUR_MINUTES) {
      const label = document.createElement("span"); label.className = "time-label"; label.textContent = formatMinute(minute);
      label.style.top = `${((minute - START_MINUTE) / VISIBLE_MINUTES) * 100}%`;
      if (minute === START_MINUTE) label.classList.add("start");
      if (minute === END_MINUTE) label.classList.add("end");
      this.gutter.append(label);
    }
    for (const phase of DAY_PHASES) {
      const marker = document.createElement("span");
      marker.className = "day-phase-icon"; marker.dataset.phase = phase.name; marker.setAttribute("aria-hidden", "true");
      marker.style.top = `${((phase.minute - START_MINUTE) / VISIBLE_MINUTES) * 100}%`;
      marker.append(svgIcon(phase.icon)); this.gutter.append(marker);
    }
  }

  render(state) {
    const windowChanged = this.renderedWindowStart !== state.windowStart;
    this.renderedWindowStart = state.windowStart;
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
        const minute = START_MINUTE + slotIndex * GRID_SLOT_MINUTES;
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
    if (windowChanged) this.scroller.scrollLeft = 0;
    this.updateResponsiveLayout(windowChanged ? 0 : null);
    this.syncActiveDay();
  }

  scheduleResponsiveLayout() {
    if (this.layoutFrame) cancelAnimationFrame(this.layoutFrame);
    this.layoutFrame = requestAnimationFrame(() => { this.layoutFrame = null; this.updateResponsiveLayout(); });
  }

  updateResponsiveLayout(forcedDay = null) {
    const containerWidth = this.scroller.clientWidth;
    if (!containerWidth) return;
    const rootStyles = getComputedStyle(document.documentElement);
    const timeWidth = parseFloat(rootStyles.getPropertyValue("--time-width")) || 72;
    const previousDayWidth = this.dayWidth || 0;
    const leadingDay = forcedDay ?? (previousDayWidth ? Math.round(this.scroller.scrollLeft / previousDayWidth) : Math.max(0, this.activeDay));
    const layout = calculateVisibleDayLayout(containerWidth, timeWidth, 152, 7);
    this.visibleDayCount = layout.visibleDayCount;
    this.dayWidth = layout.dayWidth;
    this.scroller.style.setProperty("--day-width", `${layout.dayWidth}px`);
    this.scroller.style.setProperty("--calendar-inner-width", `${layout.innerWidth}px`);
    this.scroller.dataset.visibleDays = String(layout.visibleDayCount);

    this.strip.classList.toggle("overflowing", layout.visibleDayCount < 7);
    this.strip.dataset.visibleDays = String(layout.visibleDayCount);
    const stripStyles = getComputedStyle(this.strip);
    const stripWidth = this.strip.clientWidth - parseFloat(stripStyles.paddingLeft || 0) - parseFloat(stripStyles.paddingRight || 0);
    const stripGap = parseFloat(stripStyles.columnGap || stripStyles.gap || 0);
    const chipWidth = (stripWidth - stripGap * (layout.visibleDayCount - 1)) / layout.visibleDayCount;
    if (chipWidth > 0) this.strip.style.setProperty("--date-chip-width", `${chipWidth}px`);

    const top = Math.max(0, this.container.getBoundingClientRect().top);
    const availableHeight = Math.max(0, innerHeight - top - 12);
    const edgeSpace = parseFloat(rootStyles.getPropertyValue("--calendar-edge-space")) || 0;
    const availableGridHeight = Math.max(0, availableHeight - edgeSpace * 2);
    const hourHeight = Math.min(38, Math.max(28, availableGridHeight / HOUR_COUNT));
    this.scroller.style.setProperty("--hour-height", `${hourHeight}px`);
    this.scroller.style.setProperty("--slot-height", `${hourHeight / 2}px`);
    this.scroller.style.setProperty("--day-height", `${hourHeight * HOUR_COUNT}px`);

    const safeDay = Math.max(0, Math.min(6, leadingDay));
    this.scroller.scrollLeft = safeDay * layout.dayWidth;
    this.syncActiveDay();
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
    const compact = fragment.endMinute - fragment.startMinute <= SLOT_MINUTES;
    card.type = "button"; card.className = `event-card ${fragment.type} lane-${fragment.lane}${fragment.fused ? " fused" : ""}${compact ? " compact" : ""}${fragment.status === "cancelled" ? " cancelled" : ""}`;
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
    if (this.canModify(fragment)) {
      card.classList.add("resizable");
      const edges = ["start", "end"];
      for (const edge of edges) {
        const handle = document.createElement("span");
        handle.className = `resize-handle ${edge}`; handle.dataset.resize = edge; handle.setAttribute("aria-hidden", "true");
        handle.title = edge === "start" ? "Arrastar para alterar o início" : "Arrastar para alterar o fim";
        const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg"); icon.setAttribute("class", "icon resize-icon");
        const use = document.createElementNS("http://www.w3.org/2000/svg", "use"); use.setAttribute("href", "./assets/icons.svg#i-resize-vertical"); icon.append(use); handle.append(icon); card.append(handle);
      }
      card.dataset.movable = "true";
    }
    return card;
  }

  renderNowLine() {
    if (!this.state) return;
    const line = document.querySelector("#now-line"); if (!line) return;
    const position = nowLinePosition(this.state.windowStart);
    const todayOnly = this.nowLineScope === "today";
    line.classList.toggle("today-only", todayOnly);
    line.hidden = !position;
    if (!position) return;
    line.style.top = `${position.ratio * 100}%`;
    line.style.left = todayOnly ? `${position.day * (100 / 7)}%` : "0";
    line.style.right = todayOnly ? "auto" : "0";
    line.style.width = todayOnly ? `${100 / 7}%` : "auto";
  }

  setNowLineScope(scope) {
    this.nowLineScope = scope === "today" ? "today" : "week";
    this.renderNowLine();
  }

  showTooltipFor(card, immediate = false) {
    if (!card) return;
    if (!immediate && matchMedia("(hover: none), (pointer: coarse)").matches) return;
    const activity = this.eventMap.get(card.dataset.renderId); if (!activity) return;
    clearTimeout(this.tooltipHideTimer); clearTimeout(this.tooltipShowTimer);
    this.tooltipShowTimer = setTimeout(() => this.renderTooltip(activity, card), immediate ? 0 : 180);
  }

  renderTooltip(activity, card) {
    if (!card.isConnected) return;
    const header = document.createElement("header"); header.className = "tooltip-header";
    const heading = document.createElement("div");
    const title = document.createElement("strong"); title.textContent = activity.title;
    const when = document.createElement("span");
    when.textContent = `${formatDateLong(activity.date || activity.start?.date, true)} · ${formatMinute(activity.startMinute ?? activity.start?.minute)}–${formatMinute(activity.endMinute ?? activity.end?.minute)}`;
    heading.append(title, when);
    const type = document.createElement("span"); type.className = "tooltip-type"; type.textContent = activity.type === "casal" ? "Casal" : USERS[activity.type]?.name || "Atividade";
    header.append(heading, type);

    const content = document.createElement("div"); content.className = "tooltip-content";
    if (activity.description) content.append(previewSection("Descrição", activity.description, "tooltip-description"));
    if (activity.comment?.text) {
      const author = USERS[activity.comment.author]?.name || "Comentário";
      content.append(previewSection(`${author} comentou`, activity.comment.text, "tooltip-comment"));
    }
    if (!content.children.length) {
      const empty = document.createElement("p"); empty.className = "tooltip-empty"; empty.textContent = "Sem descrição ou comentários."; content.append(empty);
    }
    const hint = document.createElement("small"); hint.className = "tooltip-hint"; hint.textContent = "Clica para ver detalhes e ações";
    this.tooltip.replaceChildren(header, content, hint);
    this.tooltip.dataset.type = activity.type;
    this.tooltip.hidden = false;
    this.tooltipAnchor?.removeAttribute("aria-describedby");
    this.tooltipAnchor = card; card.setAttribute("aria-describedby", this.tooltip.id);

    const anchorRect = card.getBoundingClientRect();
    const tooltipRect = this.tooltip.getBoundingClientRect();
    const margin = 12; const gap = 10;
    const center = anchorRect.left + anchorRect.width / 2;
    const left = Math.max(margin, Math.min(innerWidth - tooltipRect.width - margin, center - tooltipRect.width / 2));
    const fitsBelow = anchorRect.bottom + gap + tooltipRect.height <= innerHeight - margin;
    const canFitAbove = anchorRect.top - gap - tooltipRect.height >= margin;
    const placement = fitsBelow || !canFitAbove ? "below" : "above";
    const top = placement === "below" ? Math.min(innerHeight - tooltipRect.height - margin, anchorRect.bottom + gap) : Math.max(margin, anchorRect.top - tooltipRect.height - gap);
    this.tooltip.dataset.placement = placement;
    this.tooltip.style.left = `${left}px`; this.tooltip.style.top = `${top}px`;
    this.tooltip.style.setProperty("--tooltip-arrow-x", `${Math.max(18, Math.min(tooltipRect.width - 18, center - left))}px`);
  }

  queueTooltipHide() {
    clearTimeout(this.tooltipShowTimer); clearTimeout(this.tooltipHideTimer);
    this.tooltipHideTimer = setTimeout(() => this.hideTooltip(), 90);
  }

  hideTooltip() {
    clearTimeout(this.tooltipShowTimer); clearTimeout(this.tooltipHideTimer);
    this.tooltip.hidden = true;
    this.tooltipAnchor?.removeAttribute("aria-describedby"); this.tooltipAnchor = null;
  }

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

  syncActiveDay() {
    if (!this.header.children.length || !this.strip.children.length) return;
    const timeWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--time-width")) || 0;
    let closest = 0; let distance = Infinity;
    for (let index = 0; index < 7; index += 1) {
      const header = this.header.children[index + 1];
      if (!header) continue;
      const target = Math.max(0, header.offsetLeft - timeWidth);
      const current = Math.abs(this.scroller.scrollLeft - target);
      if (current < distance) { closest = index; distance = current; }
    }
    const activeChip = this.strip.children[closest];
    if (closest === this.activeDay && activeChip?.classList.contains("active")) return;
    this.activeDay = closest;
    [...this.strip.children].forEach((chip, index) => {
      chip.classList.toggle("active", index === closest);
      if (index === closest) chip.setAttribute("aria-current", "date"); else chip.removeAttribute("aria-current");
    });
    const visibleChips = this.visibleDayCount || 1;
    const leadingChip = Math.max(0, Math.min(7 - visibleChips, closest - Math.floor((visibleChips - 1) / 2)));
    const chip = this.strip.children[leadingChip];
    if (chip) {
      const paddingLeft = parseFloat(getComputedStyle(this.strip).paddingLeft) || 0;
      this.strip.scrollTo({ left: Math.max(0, chip.offsetLeft - paddingLeft), behavior: "smooth" });
    }
  }
}
