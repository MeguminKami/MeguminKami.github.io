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
      .map(
        (n) =>
          `<div class="notification ${n.read ? "" : "unread"}"><div class="notification-dot"></div><a href="${esc(n.href || "#/notifications")}"><b>${esc(n.title)}</b><p>${esc(n.body)}</p><small>${formatDate(n.createdAt)}</small></a>${n.read ? "" : `<button class="btn btn-icon btn-ghost" data-read="${esc(n.id)}" aria-label="Marcar como lida">${icon("check")}</button>`}</div>`,
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
  root.querySelectorAll("[data-read]").forEach(
    (b) =>
      (b.onclick = async () => {
        try {
          await busy(b, () =>
            DB.markRead(ctx.user.uid, [{ id: b.dataset.read }]),
          );
          await ctx.refreshNotifications();
          ctx.go("#/notifications");
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
        await ctx.refreshNotifications();
        ctx.go("#/notifications");
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
    `<div id="notification-dropdown" class="notification-dropdown"><div class="section-head"><h3>Notificações</h3>${linkButton("#/notifications", "Ver todas", "ghost")}</div>${notificationItems(ctx.notifications.slice(0, 5))}${ctx.notifications.some((n) => !n.read) ? '<button class="btn btn-secondary" data-read-all>Marcar todas como lidas</button>' : ""}</div>`,
  );
  bindNotifications(ctx, document.querySelector("#notification-dropdown"));
}
