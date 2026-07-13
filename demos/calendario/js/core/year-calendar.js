import { addDays, weekday } from "./date-time.js";

const pad = (value) => String(value).padStart(2, "0");

export function buildYearMonths(year) {
  if (!Number.isInteger(year) || year < 100 || year > 9999) throw new RangeError("Ano inválido.");
  return Array.from({ length: 12 }, (_, month) => {
    const prefix = `${year}-${pad(month + 1)}`;
    const firstDate = `${prefix}-01`;
    const gridStart = addDays(firstDate, -(weekday(firstDate) - 1));
    const days = Array.from({ length: 42 }, (_, index) => {
      const date = addDays(gridStart, index);
      return { date, day: Number(date.slice(8, 10)), inMonth: date.startsWith(prefix) };
    });
    return { month, days };
  });
}
