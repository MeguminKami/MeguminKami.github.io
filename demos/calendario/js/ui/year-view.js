import { formatDateLong, getLisbonParts } from "../core/date-time.js";
import { buildYearMonths } from "../core/year-calendar.js";

const WEEKDAYS = [
  ["S", "Segunda-feira"], ["T", "Terça-feira"], ["Q", "Quarta-feira"],
  ["Q", "Quinta-feira"], ["S", "Sexta-feira"], ["S", "Sábado"], ["D", "Domingo"]
];

const monthName = (year, month) => {
  const name = new Intl.DateTimeFormat("pt-PT", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(year, month, 1)));
  return name.charAt(0).toLocaleUpperCase("pt-PT") + name.slice(1);
};

export class YearView {
  constructor({ onSelect }) {
    this.dialog = document.querySelector("#year-view-dialog");
    this.grid = document.querySelector("#year-calendar-grid");
    this.title = document.querySelector("#year-view-year");
    this.onSelect = onSelect;
    document.querySelector("#year-view-prev").addEventListener("click", () => { this.year = Math.max(100, this.year - 1); this.render(); });
    document.querySelector("#year-view-next").addEventListener("click", () => { this.year = Math.min(9999, this.year + 1); this.render(); });
    document.querySelector("#year-view-today").addEventListener("click", () => {
      this.selectedDate = getLisbonParts().date;
      this.year = Number(this.selectedDate.slice(0, 4));
      this.render();
      this.grid.querySelector(".year-day.today")?.focus({ preventScroll: true });
    });
    this.grid.addEventListener("click", (event) => {
      const button = event.target.closest(".year-day[data-date]");
      if (!button) return;
      const date = button.dataset.date;
      this.dialog.close();
      this.onSelect(date);
    });
  }

  open(selectedDate) {
    this.selectedDate = selectedDate;
    this.year = Number(selectedDate.slice(0, 4));
    this.render();
    this.dialog.showModal();
    requestAnimationFrame(() => document.querySelector("#year-view-today").focus({ preventScroll: true }));
  }

  render() {
    const today = getLisbonParts().date;
    this.title.textContent = String(this.year);
    this.grid.replaceChildren();
    buildYearMonths(this.year).forEach(({ month, days }) => {
      const section = document.createElement("section");
      section.className = "year-month";
      const heading = document.createElement("h3");
      heading.textContent = monthName(this.year, month);
      const weekdays = document.createElement("div");
      weekdays.className = "year-weekdays";
      WEEKDAYS.forEach(([short, full]) => {
        const label = document.createElement("abbr");
        label.title = full; label.textContent = short; weekdays.append(label);
      });
      const dayGrid = document.createElement("div");
      dayGrid.className = "year-days";
      days.forEach((day) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `year-day${day.inMonth ? " in-month" : " outside"}${day.date === today ? " today" : ""}${day.date === this.selectedDate ? " selected" : ""}`;
        button.dataset.date = day.date;
        button.textContent = String(day.day);
        button.setAttribute("aria-label", `Abrir ${formatDateLong(day.date)}`);
        if (day.date === today) button.setAttribute("aria-current", "date");
        if (day.date === this.selectedDate) button.setAttribute("aria-pressed", "true");
        dayGrid.append(button);
      });
      section.append(heading, weekdays, dayGrid);
      this.grid.append(section);
    });
  }
}
