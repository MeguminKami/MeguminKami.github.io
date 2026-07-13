import { END_MINUTE, SLOT_MINUTES, START_MINUTE } from "../core/constants.js";
import { addDays, formatMinute, getLisbonParts, snapMinute, weekday } from "../core/date-time.js";
import { buildActivity, sanitizeUrl, validateActivity } from "../core/validation.js";

export class ActivityDialog {
  constructor() {
    this.dialog = document.querySelector("#activity-dialog");
    this.form = document.querySelector("#activity-form");
    this.error = document.querySelector("#activity-form-error");
    this.populateTimes();
    this.bindRecurrence();
  }

  populateTimes() {
    const start = document.querySelector("#activity-start-time");
    const end = document.querySelector("#activity-end-time");
    for (let minute = START_MINUTE; minute <= END_MINUTE; minute += SLOT_MINUTES) {
      const option = new Option(formatMinute(minute), String(minute));
      if (minute < END_MINUTE) start.add(option.cloneNode(true));
      if (minute > START_MINUTE || minute === START_MINUTE) end.add(option);
    }
  }

  bindRecurrence() {
    const mode = document.querySelector("#recurrence-mode");
    const endMode = document.querySelector("#recurrence-end-mode");
    const update = () => {
      document.querySelector("#recurrence-weekdays-field").hidden = mode.value !== "custom";
      document.querySelector("#recurrence-until-field").hidden = !mode.value || endMode.value !== "until";
      document.querySelector("#recurrence-count-field").hidden = !mode.value || endMode.value !== "count";
      endMode.disabled = !mode.value;
    };
    mode.addEventListener("change", update); endMode.addEventListener("change", update); update();
  }

  defaults(startPoint = null) {
    const now = getLisbonParts();
    let minute = startPoint?.minute ?? Math.max(START_MINUTE, Math.min(END_MINUTE - SLOT_MINUTES, snapMinute(now.minute)));
    let date = startPoint?.date ?? now.date;
    let endDate = date;
    let endMinute = minute + SLOT_MINUTES;
    if (endMinute > END_MINUTE) { endDate = addDays(date, 1); endMinute = START_MINUTE + SLOT_MINUTES; }
    return { date, minute, endDate, endMinute };
  }

  open({ activity = null, startPoint = null, user }) {
    this.form.reset();
    this.error.textContent = "";
    this.activity = activity;
    document.querySelector("#activity-dialog-title").textContent = activity ? "Editar atividade" : "Nova atividade";
    const value = activity || (() => { const d = this.defaults(startPoint); return { title: "", description: "", location: "", url: "", start: { date: d.date, minute: d.minute }, end: { date: d.endDate, minute: d.endMinute }, type: user, recurrence: null, status: "active", comment: null, version: 1, creator: user }; })();
    document.querySelector("#activity-title").value = value.title;
    document.querySelector("#activity-description").value = value.description;
    document.querySelector("#activity-start-date").value = value.start.date;
    document.querySelector("#activity-start-time").value = String(value.start.minute);
    document.querySelector("#activity-end-date").value = value.end.date;
    document.querySelector("#activity-end-time").value = String(value.end.minute);
    document.querySelector(`#type-${value.type}`).checked = true;
    document.querySelector("#activity-location").value = value.location || "";
    document.querySelector("#activity-url").value = value.url || "";
    document.querySelector("#recurrence-mode").value = value.recurrence?.mode || "";
    document.querySelector("#recurrence-end-mode").value = value.recurrence?.endMode || "never";
    document.querySelector("#recurrence-until").value = value.recurrence?.untilDate || value.start.date;
    document.querySelector("#recurrence-count").value = value.recurrence?.count || 10;
    document.querySelectorAll('[name="weekday"]').forEach((input) => { input.checked = value.recurrence?.weekdays?.includes(Number(input.value)) || false; });
    document.querySelector("#recurrence-mode").dispatchEvent(new Event("change"));
    if (!value.recurrence && document.querySelector("#recurrence-mode").value === "custom") document.querySelector(`[name="weekday"][value="${weekday(value.start.date)}"]`).checked = true;
    this.dialog.showModal();
    document.querySelector("#activity-title").focus();
    return new Promise((resolve) => {
      const submit = (event) => {
        event.preventDefault();
        const submitter = event.submitter;
        if (submitter?.value !== "save") { cleanup(); this.dialog.close(); resolve(null); return; }
        const result = this.collect(value.creator);
        if (result.errors.length) { this.error.textContent = result.errors[0]; return; }
        cleanup(); this.dialog.close(); resolve(result.activity);
      };
      const cancel = () => { cleanup(); resolve(null); };
      const cleanup = () => { this.form.removeEventListener("submit", submit); this.dialog.removeEventListener("cancel", cancel); this.dialog.removeEventListener("close", cancel); };
      this.form.addEventListener("submit", submit);
      this.dialog.addEventListener("cancel", cancel, { once: true });
      this.dialog.addEventListener("close", cancel, { once: true });
    });
  }

  collect(creator) {
    const mode = document.querySelector("#recurrence-mode").value;
    const endMode = document.querySelector("#recurrence-end-mode").value;
    const recurrence = mode ? {
      mode,
      weekdays: mode === "custom" ? [...document.querySelectorAll('[name="weekday"]:checked')].map((input) => Number(input.value)).sort() : [],
      endMode,
      untilDate: endMode === "until" ? document.querySelector("#recurrence-until").value : "",
      count: endMode === "count" ? Number(document.querySelector("#recurrence-count").value) : 0
    } : null;
    const rawUrl = document.querySelector("#activity-url").value.trim();
    const activity = buildActivity({
      title: document.querySelector("#activity-title").value,
      description: document.querySelector("#activity-description").value,
      start: { date: document.querySelector("#activity-start-date").value, minute: Number(document.querySelector("#activity-start-time").value) },
      end: { date: document.querySelector("#activity-end-date").value, minute: Number(document.querySelector("#activity-end-time").value) },
      type: document.querySelector('[name="type"]:checked')?.value,
      location: document.querySelector("#activity-location").value,
      url: rawUrl,
      recurrence,
      status: this.activity?.status || "active",
      comment: this.activity?.comment || null,
      version: this.activity?.baseVersion || this.activity?.version || 1
    }, creator);
    const errors = validateActivity(activity);
    if (rawUrl && !sanitizeUrl(rawUrl)) errors.unshift("O link deve começar por http:// ou https://.");
    if (recurrence?.endMode === "until" && recurrence.untilDate < activity.start.date) errors.unshift("A data final da repetição não pode ser anterior ao início.");
    return { activity, errors };
  }
}
