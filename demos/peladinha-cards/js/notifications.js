import * as DB from "./db.js";
import { icon } from "./icons.js";
import { esc, empty, linkButton, pageHead, busy, toast } from "./ui.js";
import { formatDate } from "./utils.js";
export async function refreshNotifications(uid, missions) {
  return (await DB.syncNotifications(uid, missions)).sort(
    (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
  );
}
export function notificationItems(items) {
  return (
    items
      .filter((n) => !n.read)
      .map(
        (n) =>
          `<div class="notification ${n.read ? "" : "unread"}"><div class="notification-dot"></div><a data-open-notification="${esc(n.id)}" href="${esc(n.href || "#")}"><b>${esc(n.title)}</b><p>${esc(n.body)}</p><small>${formatDate(n.createdAt)}</small></a>${n.read ? "" : `<button class="btn btn-icon btn-ghost" data-read="${esc(n.id)}" aria-label="Marcar como lida">${icon("check")}</button>`}</div>`,
      )
      .join("") ||
    empty(
      "Sem notificações novas",
      "As novidades da tua liga aparecem aqui.",
      "",
      "bell",
    )
  );
}
export function bindNotifications(ctx, root = document) {
  const dropdown = root.id === "notification-dropdown";
  const refreshView = async () => {
    const hash = location.hash;
    await ctx.refreshNotifications();
    if (location.hash !== hash) return;
    if (location.hash === "#/notifications") notificationsPage(ctx);
    if (dropdown && !document.querySelector("#notification-dropdown"))
      toggleNotifications(ctx);
  };
  root.querySelectorAll("[data-open-notification]").forEach((link) => {
    link.onclick = async (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
        return;
      event.preventDefault();
      const notification = ctx.notifications.find(
        (n) => n.id === link.dataset.openNotification,
      );
      if (!notification) return;
      const hash = location.hash;
      try {
        await DB.markRead(ctx.user.uid, [{ id: notification.id }]);
        await refreshView();
        if (
          location.hash === hash &&
          notification.href?.startsWith("#/") &&
          notification.href !== "#/notifications"
        )
          ctx.go(notification.href);
      } catch (error) {
        toast(error.message, "error");
      }
    };
  });
  root.querySelectorAll("[data-read]").forEach(
    (b) =>
      (b.onclick = async () => {
        try {
          await busy(b, () =>
            DB.markRead(ctx.user.uid, [{ id: b.dataset.read }]),
          );
          await refreshView();
        } catch {}
      }),
  );
  root
    .querySelector("[data-read-all]")
    ?.addEventListener("click", async (e) => {
      try {
        await busy(e.currentTarget, () =>
          DB.markRead(
            ctx.user.uid,
            ctx.notifications.filter((n) => !n.read),
          ),
        );
        toast("Notificações marcadas como lidas.");
        await refreshView();
      } catch {}
    });
}
export function notificationsPage(ctx) {
  ctx.render(
    `${pageHead("A tua liga", "Notificações", "Missões, resultados e evolução da tua carta.", ctx.notifications.some((n) => !n.read) ? '<button data-read-all class="btn btn-secondary">Marcar todas como lidas</button>' : "")}<div class="panel notification-list">${notificationItems(ctx.notifications)}</div>`,
  );
  bindNotifications(ctx);
}
export function toggleNotifications(ctx) {
  let el = document.querySelector("#notification-dropdown");
  if (el) {
    el.remove();
    return;
  }
  const anchor = document.querySelector(".header-actions");
  anchor.insertAdjacentHTML(
    "beforeend",
    `<div id="notification-dropdown" class="notification-dropdown"><div class="section-head"><h3>Notificações</h3>${linkButton("#/notifications", "Ver todas", "ghost")}</div>${notificationItems(ctx.notifications.filter((n) => !n.read).slice(0, 5))}${ctx.notifications.some((n) => !n.read) ? '<button class="btn btn-secondary" data-read-all>Marcar todas como lidas</button>' : ""}</div>`,
  );
  bindNotifications(ctx, document.querySelector("#notification-dropdown"));
}
