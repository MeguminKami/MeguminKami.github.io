import { USERS } from "./core/constants.js";
import { addDays, addMonthsClamped, getLisbonParts, pointToVisibleCoordinate, visibleCoordinateToPoint } from "./core/date-time.js";
import { exportCsv, exportIcs, exportJson } from "./core/exporters.js";
import { canModify } from "./core/permissions.js";
import { connectFirebase } from "./services/firebase-client.js";
import { ConflictError, createRepository } from "./services/repository.js";
import { getSelectedUser, getSoundsEnabled, grantAccess, hasAccess, revokeAccess, setSelectedUser, setSoundsEnabled, verifyAccessCode } from "./services/local-preferences.js";
import { ActivityDetails } from "./ui/activity-details.js";
import { ActivityDialog } from "./ui/activity-dialog.js";
import { ActivityMenu } from "./ui/activity-menu.js";
import { SoundPlayer } from "./ui/audio.js";
import { AvatarEditor, renderAvatar } from "./ui/avatar-editor.js";
import { createBackground } from "./ui/background.js";
import { CalendarView } from "./ui/calendar-view.js";
import { DragResizeController } from "./ui/drag-resize.js";
import { EmojiController } from "./ui/emoji-picker.js";
import { ModalManager } from "./ui/modal-manager.js";
import { MobilePreview } from "./ui/mobile-preview.js";
import { createNotifier } from "./ui/notifications.js";
import { SettingsPanel } from "./ui/settings.js";
import { YearView } from "./ui/year-view.js";

if (new URLSearchParams(location.search).has("mobile-preview")) document.documentElement.classList.add("mobile-preview-embedded");

const state = {
  currentUser: getSelectedUser(),
  windowStart: getLisbonParts().date,
  activities: [], overrides: [], profiles: [], settings: null,
  occurrences: [], configured: null, pending: false, fromCache: false
};

let repository = null;
let connectPromise = null;
let unsubscribe = null;
let invalidWarningShown = false;

const accessView = document.querySelector("#access-view");
const userView = document.querySelector("#user-view");
const appView = document.querySelector("#app-view");
const notify = createNotifier(document.querySelector("#toast-region"));
const modal = new ModalManager();
const mobilePreview = new MobilePreview();
const sounds = new SoundPlayer(getSoundsEnabled());
const activityDialog = new ActivityDialog();
const emoji = new EmojiController();
void emoji;

createBackground(document.querySelector("#background-art"));

const calendar = new CalendarView({
  onSlot: (point) => createActivity(point),
  onEvent: (activity, card) => activity && activityMenu.open(activity, card, state.currentUser),
  canModify: (activity) => canModify(activity, state.currentUser) && Boolean(repository) && navigator.onLine
});

const yearView = new YearView({
  onSelect: (date) => { state.windowStart = date; renderCalendar(); }
});
document.querySelector("#year-view-open").addEventListener("click", () => yearView.open(state.windowStart));

const details = new ActivityDetails({
  edit: editActivity,
  cancel: toggleCancelled,
  remove: removeActivity,
  saveComment,
  removeComment
});

const activityMenu = new ActivityMenu({
  details: (activity) => details.open(activity, state.currentUser),
  edit: editActivity,
  cancel: toggleCancelled,
  remove: removeActivity
});

const avatarEditor = new AvatarEditor({ onSave: saveAvatar });
const settings = new SettingsPanel({
  onSounds: (enabled) => { setSoundsEnabled(enabled); sounds.setEnabled(enabled); notify(enabled ? "Sons ligados." : "Sons desligados."); },
  onAvatar: () => avatarEditor.open(profileFor(state.currentUser)),
  onSwitchUser: showUserSelection,
  onExport: downloadExport,
  onPrint: () => window.print(),
  onMobilePreview: () => mobilePreview.open(),
  onLock: lockApp
});
settings.setSounds(getSoundsEnabled());

new DragResizeController(calendar, {
  getState: () => state,
  getActivity: (renderId) => state.occurrences.find((item) => item.renderId === renderId),
  onCommit: moveOrResize,
  announce: (message) => { document.querySelector("#live-region").textContent = message; }
});

function profileFor(user) {
  return state.profiles.find((profile) => profile.id === user) || { id: user, displayName: USERS[user]?.name || user, palette: user, avatar: null, version: 0 };
}

function renderProfiles() {
  for (const user of ["joao", "sofia"]) document.querySelectorAll(`[data-avatar="${user}"]`).forEach((element) => renderAvatar(element, profileFor(user), USERS[user].name[0]));
  if (state.currentUser) {
    renderAvatar(document.querySelector("[data-current-avatar]"), profileFor(state.currentUser), USERS[state.currentUser].name[0]);
    document.querySelector("#current-user-name").textContent = USERS[state.currentUser].name;
  }
}

function renderCalendar() {
  if (!appView.hidden) { activityMenu.close(); calendar.render(state); }
}

function setConnection(status, label) {
  const element = document.querySelector("#connection");
  element.dataset.state = status; document.querySelector("#connection-label").textContent = label;
}

async function ensureData() {
  if (connectPromise) return connectPromise;
  connectPromise = (async () => {
    setConnection("loading", "A ligar…");
    try {
      const client = await connectFirebase();
      state.configured = client.configured;
      document.querySelector("#config-banner").hidden = client.configured;
      if (!client.configured) { setConnection("error", "Por configurar"); renderCalendar(); return; }
      repository = createRepository(client);
      await repository.bootstrap();
      unsubscribe = repository.subscribe((update) => {
        Object.assign(state, update);
        if (update.invalid && !invalidWarningShown) { invalidWarningShown = true; notify(`${update.invalid} registo(s) remoto(s) inválido(s) foram ignorados.`, "error", 6000); }
        renderProfiles(); renderCalendar(); updateConnectionFromState();
      }, (error) => { console.error(error); setConnection("error", "Erro de sincronização"); notify(friendlyError(error), "error", 6000); });
      setConnection("online", "Ligado");
    } catch (error) {
      console.error(error); state.configured = true; setConnection("error", "Falha ao ligar"); notify("Não foi possível ligar ao Firebase. Confirma a configuração, autenticação anónima e regras.", "error", 7000);
    }
  })();
  return connectPromise;
}

function updateConnectionFromState() {
  if (!navigator.onLine) setConnection("offline", "Sem ligação");
  else if (state.pending) setConnection("loading", "A sincronizar…");
  else if (state.fromCache) setConnection("loading", "Dados locais");
  else setConnection("online", "Sincronizado");
}

function friendlyError(error) {
  if (error instanceof ConflictError) return error.message;
  if (error?.code === "permission-denied") return "O Firebase recusou a operação. Confirma as regras e a autenticação anónima.";
  if (!navigator.onLine) return "Sem ligação. A alteração não foi guardada.";
  return error?.message || "Não foi possível concluir a operação.";
}

function requireRepository() {
  if (!repository) { notify("Configura o Firebase antes de guardar alterações.", "error", 5000); return false; }
  if (!navigator.onLine) { notify("Estás offline. Volta a tentar quando a ligação regressar.", "error"); return false; }
  return true;
}

function showAccess() { accessView.hidden = false; userView.hidden = true; appView.hidden = true; setTimeout(() => document.querySelector("#access-code").focus(), 0); }

function showUserSelection() {
  accessView.hidden = true; appView.hidden = true; userView.hidden = false; renderProfiles();
}

async function enterApp(user) {
  state.currentUser = user; setSelectedUser(user);
  accessView.hidden = true; userView.hidden = true; appView.hidden = false;
  renderProfiles(); renderCalendar(); await ensureData();
}

document.querySelector("#access-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = document.querySelector("#access-code"); const error = document.querySelector("#access-error");
  error.textContent = "";
  if (await verifyAccessCode(input.value)) { grantAccess(); input.value = ""; showUserSelection(); void ensureData(); }
  else { error.textContent = "Esse código não abriu a porta. Tenta outra vez."; input.select(); }
});

document.querySelectorAll("[data-user]").forEach((button) => button.addEventListener("click", () => enterApp(button.dataset.user)));
document.querySelector("#current-user").addEventListener("click", showUserSelection);
document.querySelectorAll(".add-activity-trigger").forEach((button) => button.addEventListener("click", () => createActivity(null)));

document.querySelectorAll("[data-nav]").forEach((button) => button.addEventListener("click", () => {
  const action = button.dataset.nav;
  if (action === "today") state.windowStart = getLisbonParts().date;
  if (action === "day-prev") state.windowStart = addDays(state.windowStart, -1);
  if (action === "day-next") state.windowStart = addDays(state.windowStart, 1);
  if (action === "week-prev") state.windowStart = addDays(state.windowStart, -7);
  if (action === "week-next") state.windowStart = addDays(state.windowStart, 7);
  if (action === "month-prev") state.windowStart = addMonthsClamped(state.windowStart, -1);
  if (action === "month-next") state.windowStart = addMonthsClamped(state.windowStart, 1);
  renderCalendar();
}));

async function createActivity(point) {
  const result = await activityDialog.open({ startPoint: point, user: state.currentUser });
  if (!result || !requireRepository()) return;
  try { await repository.createActivity(result); sounds.play("save"); notify("Atividade guardada.", "success"); }
  catch (error) { notify(friendlyError(error), "error", 6000); }
}

function editable(activity, includeRecurrence = true) {
  const value = { title: activity.title, description: activity.description, location: activity.location, url: activity.url, type: activity.type, start: activity.start, end: activity.end, status: activity.status };
  if (includeRecurrence) value.recurrence = activity.recurrence;
  return value;
}

async function editActivity(activity) {
  if (!requireRepository()) return;
  details.close();
  const result = await activityDialog.open({ activity, user: state.currentUser });
  if (!result) return;
  let scope = activity.isRecurring ? await modal.chooseScope("Queres aplicar a edição só a esta ocorrência ou a toda a série?") : "series";
  if (!scope) return;
  try {
    if (scope === "occurrence") {
      await repository.saveOverride(activity.seriesId, activity.occurrenceDate, editable(result, false), state.currentUser);
    } else {
      const base = state.activities.find((item) => item.id === activity.seriesId || item.id === activity.id);
      const shift = activity.isRecurring ? pointToVisibleCoordinate(activity.start, base.start.date) - pointToVisibleCoordinate(base.start, base.start.date) : 0;
      const changes = editable(result, true);
      if (activity.isRecurring) {
        const resultStart = pointToVisibleCoordinate(result.start, base.start.date) - shift;
        const resultEnd = pointToVisibleCoordinate(result.end, base.start.date) - shift;
        changes.start = visibleCoordinateToPoint(resultStart, base.start.date, "start");
        changes.end = visibleCoordinateToPoint(resultEnd, base.start.date, "end");
      }
      const scheduleChanged = JSON.stringify([base.start, base.end, base.recurrence]) !== JSON.stringify([changes.start, changes.end, changes.recurrence]);
      const hasOverrides = state.overrides.some((item) => item.seriesId === base.id);
      if (scheduleChanged && hasOverrides) {
        const proceed = await modal.confirm("Alterar o horário ou a repetição vai remover as exceções já feitas nesta série. Continuar?", "Alterar série");
        if (!proceed) return;
      }
      await repository.updateActivity(base.id, base.version, changes, state.currentUser);
      if (scheduleChanged && hasOverrides) await repository.clearOverrides(base.id);
    }
    sounds.play("save"); notify("Alteração guardada.", "success");
  } catch (error) { notify(friendlyError(error), "error", 6000); }
}

async function toggleCancelled(activity) {
  if (!requireRepository()) return;
  const base = state.activities.find((item) => item.id === activity.seriesId || item.id === activity.id);
  const cancelling = base.status !== "cancelled";
  if (activity.isRecurring && cancelling) {
    const proceed = await modal.confirm("Esta ação vai cancelar a série recorrente inteira. As ocorrências continuam visíveis e a ocupar o horário.", "Cancelar série");
    if (!proceed) return;
  }
  try { await repository.updateActivity(base.id, base.version, { status: cancelling ? "cancelled" : "active" }, state.currentUser); details.close(); sounds.play("cancel"); notify(cancelling ? "Atividade cancelada." : "Atividade reativada.", "success"); }
  catch (error) { notify(friendlyError(error), "error", 6000); }
}

async function removeActivity(activity) {
  if (!requireRepository()) return;
  const base = state.activities.find((item) => item.id === activity.seriesId || item.id === activity.id);
  const proceed = await modal.confirm(activity.isRecurring ? "Remover esta série e todas as respetivas exceções? Esta ação é definitiva." : "Remover definitivamente esta atividade? Não será possível recuperá-la.", activity.isRecurring ? "Remover série" : "Remover atividade");
  if (!proceed) return;
  try { await repository.removeActivity(base.id, base.version); details.close(); sounds.play("remove"); notify("Atividade removida.", "success"); }
  catch (error) { notify(friendlyError(error), "error", 6000); }
}

async function saveComment(activity, comment) {
  if (!requireRepository()) return;
  const base = state.activities.find((item) => item.id === activity.seriesId || item.id === activity.id);
  try { await repository.updateActivity(base.id, base.version, { comment }, state.currentUser); details.close(); sounds.play("save"); notify("Comentário guardado.", "success"); }
  catch (error) { notify(friendlyError(error), "error", 6000); }
}

async function removeComment(activity) {
  if (!requireRepository()) return;
  const proceed = await modal.confirm("Apagar o teu comentário?", "Apagar comentário"); if (!proceed) return;
  const base = state.activities.find((item) => item.id === activity.seriesId || item.id === activity.id);
  try { await repository.updateActivity(base.id, base.version, { comment: null }, state.currentUser); details.close(); notify("Comentário apagado.", "success"); }
  catch (error) { notify(friendlyError(error), "error", 6000); }
}

async function moveOrResize(activity, interval, mode) {
  if (!requireRepository()) { renderCalendar(); return; }
  const base = state.activities.find((item) => item.id === activity.seriesId || item.id === activity.id);
  const scope = activity.isRecurring ? await modal.chooseScope("Aplicar este novo horário apenas à ocorrência ou à série inteira?") : "series";
  if (!scope) { renderCalendar(); return; }
  try {
    if (scope === "occurrence") {
      await repository.saveOverride(base.id, activity.occurrenceDate, { ...editable(activity, false), ...interval }, state.currentUser);
    } else {
      const occurrenceAnchor = activity.start.date;
      const startDelta = pointToVisibleCoordinate(interval.start, occurrenceAnchor) - pointToVisibleCoordinate(activity.start, occurrenceAnchor);
      const endDelta = pointToVisibleCoordinate(interval.end, occurrenceAnchor) - pointToVisibleCoordinate(activity.end, occurrenceAnchor);
      const baseStartCoordinate = pointToVisibleCoordinate(base.start, base.start.date) + startDelta;
      const baseEndCoordinate = pointToVisibleCoordinate(base.end, base.start.date) + endDelta;
      await repository.updateActivity(base.id, base.version, { start: visibleCoordinateToPoint(baseStartCoordinate, base.start.date, "start"), end: visibleCoordinateToPoint(baseEndCoordinate, base.start.date, "end") }, state.currentUser);
    }
    sounds.play("save"); notify(mode === "move" ? "Atividade movida." : "Duração atualizada.", "success");
  } catch (error) { renderCalendar(); notify(`${friendlyError(error)} O horário anterior foi reposto.`, "error", 6500); }
}

async function saveAvatar(avatar) {
  if (!requireRepository()) return;
  const current = profileFor(state.currentUser);
  try {
    await repository.saveProfile({ id: state.currentUser, displayName: USERS[state.currentUser].name, palette: state.currentUser, avatar }, current.version);
    document.querySelector("#avatar-dialog").close(); sounds.play("save"); notify("Avatar guardado e sincronizado.", "success");
  } catch (error) { document.querySelector("#avatar-error").textContent = friendlyError(error); }
}

function downloadExport(type) {
  const payload = { activities: state.activities, overrides: state.overrides, profiles: state.profiles, settings: state.settings };
  const content = type === "json" ? exportJson(payload) : type === "csv" ? exportCsv(payload) : exportIcs(payload);
  const mime = { json: "application/json", csv: "text/csv;charset=utf-8", ics: "text/calendar;charset=utf-8" }[type];
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const link = document.createElement("a"); link.href = url; link.download = `o-que-vais-fazer-${new Date().toISOString().slice(0, 10)}.${type}`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000); notify(`Exportação ${type.toUpperCase()} criada.`, "success");
}

function lockApp() {
  revokeAccess(); state.activities = []; state.overrides = []; state.occurrences = []; unsubscribe?.(); unsubscribe = null; repository = null; connectPromise = null;
  showAccess(); notify("Calendário bloqueado.");
}

window.addEventListener("online", () => { updateConnectionFromState(); notify("Ligação recuperada.", "success"); });
window.addEventListener("offline", () => { updateConnectionFromState(); notify("Ficaste offline. As alterações ficam temporariamente desativadas.", "error", 5000); renderCalendar(); });

if (hasAccess()) {
  if (state.currentUser) void enterApp(state.currentUser); else { showUserSelection(); void ensureData(); }
} else showAccess();
