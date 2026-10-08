import * as DB from "./db.js";
import { ATTRIBUTES, profileComplete, participants } from "./utils.js";
import { esc, empty, linkButton } from "./ui.js";
import { icon } from "./icons.js";
export async function refreshMissionsForCurrentUser(user, league) {
  const p = league.players.find((x) => x.uid === user.uid) || user;
  const missions = [];
  if (!profileComplete(p))
    missions.push({
      id: "profile",
      type: "COMPLETE_PROFILE",
      title: "Completa o teu perfil",
      description: "Adiciona as informações que faltam para entrares em campo.",
      done: 0,
      total: 1,
      href: "#/profile/edit",
      icon: "profile",
    });
  const count = ATTRIBUTES.filter(([k]) =>
    Number.isFinite(p.initial?.[k]),
  ).length;
  if (count < 12)
    missions.push({
      id: "self",
      type: "SELF_INITIAL_RATING",
      title: "Cria a tua primeira carta",
      description:
        "Começa com a tua autoavaliação. A comunidade ajuda a torná-la oficial.",
      done: count,
      total: 12,
      href: "#/missions/self",
      icon: "ball",
    });
  for (const g of league.games.filter(
    (g) => g.status === "closed" && participants(g).includes(user.uid),
  )) {
    const targets = participants(g).filter((uid) => uid !== user.uid),
      ratings = await DB.myFeedback(g.id, user.uid);
    const done = targets.filter((uid) =>
      ratings.some((r) => r.targetId === uid && r.submitted),
    ).length;
    if (done < targets.length)
      missions.push({
        id: `game-${g.id}`,
        type: "GAME_FEEDBACK",
        title: `Avalia ${g.title}`,
        description: "Ajuda a reconhecer a performance dos teus colegas.",
        done,
        total: targets.length,
        href: `#/game/${g.id}/feedback`,
        icon: "games",
      });
  }
  const my = await DB.myCommunity(user.uid);
  for (const target of league.players.filter(
    (x) => x.uid !== user.uid && x.communityCount < 3,
  )) {
    const rating = my.find((r) => r.targetId === target.uid);
    if (rating?.submitted) continue;
    missions.push({
      id: `new-${target.uid}`,
      type: "RATE_NEW_PLAYER",
      title: `Avaliar ${target.displayName || target.username}`,
      description: `Ajuda a criar a primeira carta oficial. ${target.communityCount} / 3 avaliações da comunidade.`,
      done: ATTRIBUTES.filter(([k]) => Number.isFinite(rating?.ratings20?.[k]))
        .length,
      total: 12,
      href: `#/missions/new/${target.uid}`,
      icon: "players",
    });
  }
  return missions;
}
export function missionList(missions) {
  return missions.length
    ? `<div class="mission-list">${missions.map((m) => `<a class="mission" href="${esc(m.href)}"><div class="mission-symbol">${icon(m.icon)}</div><div class="mission-content"><h3>${esc(m.title)}</h3><p>${esc(m.description)}</p><div class="progress"><span style="--progress:${Math.round((m.done / m.total) * 100)}%"></span></div><small>${m.done} / ${m.total} · ${Math.round((m.done / m.total) * 100)}%</small></div><span class="mission-arrow">${icon("arrow")}</span></a>`).join("")}</div>`
    : empty(
        "Tudo tratado!",
        "Não tens missões pendentes neste momento. Volta depois da próxima Peladinha.",
        linkButton("#/games", "Ver jogos", "secondary"),
        "check",
      );
}
