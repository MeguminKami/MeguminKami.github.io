import { ATTRIBUTES, flag } from "./utils.js";
import { esc } from "./ui.js";
import { safeImage, ASSET_PATHS } from "./assets.js";
export function card(player, { size = "md", theme, preview = false } = {}) {
  const t =
    theme || player.specials?.[0]?.id || player.cardType || "bronze-common";
  const stats = player.stats || {};
  return `<${preview ? "div" : "a"} ${preview ? "" : `href="#/player/${esc(player.uid)}"`} class="football-card card-${size} ${esc(t)}" ${preview ? "" : `aria-label="Ver perfil de ${esc(player.displayName || player.username)}"`}><div class="card-frame"></div><div class="card-rating"><strong>${player.hasCard === false ? "—" : (player.ovr ?? 0)}</strong><span>OVR</span><small>${esc(player.primaryPosition || "ALA")}</small><span>${flag(player.countryCode)}</span></div><div class="card-photo"><img src="${esc(safeImage(player.photoURL))}" alt="" data-fallback="${ASSET_PATHS.avatar}"></div><div class="card-caption"><h3>${esc(player.displayName || player.username || "Jogador")}</h3></div><div class="card-stats">${ATTRIBUTES.slice(
    0,
    8,
  )
    .map(
      ([k, , abbr]) =>
        `<span><b>${player.hasCard === false ? "—" : (stats[k] ?? 0)}</b><small>${abbr}</small></span>`,
    )
    .join("")}</div></${preview ? "div" : "a"}>`;
}
export function bindImages(root = document) {
  root.querySelectorAll("img[data-fallback]").forEach((img) => {
    img.onerror = () => {
      img.onerror = null;
      img.src = img.dataset.fallback;
    };
  });
}
