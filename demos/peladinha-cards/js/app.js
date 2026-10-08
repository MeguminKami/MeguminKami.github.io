import { configured } from "./firebase.js";
import { ticketsPage } from "./tickets.js";
import { bindThemePicker } from "./themes.js";
import { startAuth, currentUser, loadProfile, logout } from "./auth.js";
import { loadLeague } from "./data.js";
import { refreshMissionsForCurrentUser, missionList } from "./missions.js";
import {
  refreshNotifications,
  notificationsPage,
  toggleNotifications,
} from "./notifications.js";
import { authPage } from "./onboarding.js";
import { playerPage, editProfile } from "./profile.js";
import { gamesPage, gamePage, gameRows } from "./games.js";
import { initialMission, feedbackPage } from "./ratings.js";
import { adminPage, cardLab, adminEdit, rawRatings } from "./admin.js";
import { card, bindImages } from "./cards.js";
import {
  calculateWeeklyTopPlayers,
  isoWeek,
  average,
  themeName,
  THEMES,
} from "./utils.js";
import {
  esc,
  setMain,
  empty,
  pageHead,
  linkButton,
  skeleton,
  errorPage,
  toast,
  busy,
} from "./ui.js";
import { icon } from "./icons.js";
import { ASSET_PATHS, safeImage } from "./assets.js";
import * as DB from "./db.js";
const ctx = {
  user: null,
  league: null,
  missions: [],
  notifications: [],
  disposers: [],
  render(html) {
    setMain(html);
    bindImages();
  },
  cleanup(fn) {
    this.disposers.push(fn);
  },
  go(hash) {
    if (location.hash === hash) route();
    else location.hash = hash;
  },
  async refresh() {
    this.user = await loadProfile();
    if (!this.user || this.user.disabled) return;
    this.league = await loadLeague();
    this.missions = await refreshMissionsForCurrentUser(this.user, this.league);
    await this.refreshNotifications();
  },
  async refreshNotifications() {
    this.notifications = await refreshNotifications(
      this.user.uid,
      this.missions,
    );
    header();
  },
};
let routeNumber = 0;
function header() {
  const p = ctx.user,
    hash = location.hash || "#/",
    unread = ctx.notifications.filter((n) => !n.read).length;
  const links = [
    ["#/", "home", "Início"],
    ["#/players", "players", "Jogadores"],
    ["#/games", "games", "Jogos"],
    ["#/missions", "missions", "Missões"],
    ["#/tickets", "tickets", "Tickets"],
  ];
  document.querySelector("#header").innerHTML =
    `<nav class="navbar"><a class="brand" href="#/" aria-label="Peladinhas Cards — início"><img src="${ASSET_PATHS.logo}" alt=""><span>PELADINHAS<small>CARDS</small></span></a>${p ? `<div class="desktop-nav">${links.map(([h, i, n]) => `<a href="${h}" class="nav-link ${hash === h || (h !== "#/" && hash.startsWith(h)) ? "active" : ""}">${icon(i)}${n}${i === "missions" && ctx.missions.length ? `<span class="badge">${ctx.missions.length}</span>` : ""}</a>`).join("")}${p.role === "admin" ? `<a class="nav-link ${hash.startsWith("#/admin") ? "active" : ""}" href="#/admin">${icon("shield")}Admin</a>` : ""}</div><div class="header-actions">${p.role === "admin" ? `<a class="btn btn-icon btn-ghost mobile-admin" href="#/admin" aria-label="Administração">${icon("shield")}</a>` : ""}<button id="bell" class="btn btn-icon btn-ghost" aria-label="Notificações${unread ? `, ${unread} por ler` : ""}">${icon("bell")}${unread ? `<span class="badge notification-count">${unread}</span>` : ""}</button><a class="user-link" href="#/profile"><img src="${esc(safeImage(p.photoURL))}" alt="" data-fallback="${ASSET_PATHS.avatar}"><span>${esc(p.displayName || p.username)}</span></a><button id="logout" class="btn btn-icon btn-ghost" aria-label="Terminar sessão">${icon("logout")}</button></div>` : '<span class="club-label">A TUA LIGA. A TUA CARTA.</span>'}</nav>${p ? `<nav class="bottom-nav" aria-label="Navegação mobile">${[...links, ["#/profile", "profile", "Perfil"]].map(([h, i, n]) => `<a href="${h}" class="${hash === h || (h !== "#/" && hash.startsWith(h)) ? "active" : ""}">${icon(i)}<span>${n}</span>${i === "missions" && ctx.missions.length ? '<i class="nav-dot"></i>' : ""}</a>`).join("")}</nav>` : ""}`;
  document
    .querySelector("#bell")
    ?.addEventListener("click", () => toggleNotifications(ctx));
  document.querySelector("#logout")?.addEventListener("click", async (e) => {
    try {
      await busy(e.currentTarget, logout);
      ctx.user = null;
      ctx.league = null;
      ctx.notifications = [];
      ctx.missions = [];
      toast("Sessão terminada.");
      ctx.go("#/");
    } catch {}
  });
  bindThemePicker(document.querySelector("#header"));
  bindImages(document.querySelector("#header"));
}
function weeklyPodium(players) {
  const top = calculateWeeklyTopPlayers(players).slice(0, 3);
  return top.length
    ? `<div class="podium">${top.map((p, i) => `<div class="podium-place place-${i + 1}"><div class="podium-rank">${i === 0 ? icon("trophy") : ""}<b>${i + 1}.º</b><span>${i === 0 ? "Em destaque" : "Esta semana"}</span></div>${card(p, { size: "md" })}<p>${p.weeklyPerformance == null ? "OVR como referência" : `${p.weeklyPerformance.toFixed(2)} / 5 · forma semanal`}</p></div>`).join("")}</div>`
    : empty(
        "O pódio está à tua espera",
        "As primeiras cartas aparecem quando os jogadores concluírem a autoavaliação.",
        linkButton("#/missions", "Ver missões"),
        "trophy",
      );
}
function home() {
  const me = ctx.league.players.find((p) => p.uid === ctx.user.uid),
    players = ctx.league.players.filter((p) => p.hasCard);
  const hour = Number(
    new Intl.DateTimeFormat("pt-PT", {
      timeZone: "Europe/Lisbon",
      hour: "numeric",
      hourCycle: "h23",
    }).format(new Date()),
  );
  ctx.render(
    `<div class="dashboard-greeting"><div><p class="eyebrow">${isoWeek()} / A TUA COMUNIDADE</p><h1>${hour < 12 ? "Bom dia" : hour < 19 ? "Boa tarde" : "Boa noite"}, ${esc(ctx.user.displayName || ctx.user.username)}.</h1><p>Pronto para mais uma Peladinha?</p></div>${linkButton("#/game/new", "Criar jogo", "secondary", "plus")}</div><section class="weekly-section"><div class="section-head"><div><p class="eyebrow">A forma fala por si</p><h2>Melhores da semana</h2></div>${linkButton("#/ranking", "Ver ranking completo", "ghost", "trophy")}</div><p class="ranking-explanation">Média semanal dos jogos com pelo menos 2 votos. Sem ratings suficientes, usamos o OVR.</p>${weeklyPodium(players)}</section><div class="dashboard-columns"><section class="panel my-card-panel"><div class="section-head"><h2>A minha carta</h2>${linkButton("#/profile", "Ver perfil", "ghost")}</div>${me ? card(me, { size: "md" }) : empty("Perfil em preparação")}<div class="metrics compact-metrics">${[
      ["OVR", me?.hasCard ? me.ovr : "—"],
      [
        "Forma",
        me?.aggregates.length
          ? average(me.aggregates.slice(-5).map((g) => g.overall)).toFixed(1)
          : "—",
      ],
      ["Jogos", me?.matchStats.played || 0],
      ["Vitórias", me?.matchStats.wins || 0],
    ]
      .map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`)
      .join(
        "",
      )}</div></section><section><div class="section-head"><h2>As tuas missões</h2><span class="pill">${ctx.missions.length} pendentes</span></div>${missionList(ctx.missions)}</section></div><section><div class="section-head"><h2>Últimas Peladinhas</h2>${linkButton("#/games", "Todos os jogos", "ghost")}</div>${ctx.league.games.length ? gameRows(ctx.league.games.slice(0, 3)) : empty("O próximo jogo começa aqui", "Cria uma Peladinha e convida os teus colegas para as equipas.", linkButton("#/game/new", "Criar jogo", "primary", "plus"), "games")}</section>`,
  );
}
function playersPage() {
  ctx.render(
    `${pageHead("A comunidade", "Jogadores", "Cada carta tem uma história. Descobre o plantel das Peladinhas.")}<div class="filters panel"><label class="search-field">Procurar<input id="search" placeholder="Nome ou username"></label><label>Ordenar<select id="sort"><option value="ovr">OVR mais alto</option><option value="name">Nome A–Z</option></select></label><label>Família<select id="family"><option value="">Todas</option><option>Bronze</option><option>Silver</option><option>Gold</option></select></label><label>Especial<select id="special"><option value="">Todas</option>${THEMES.slice(
      6,
    )
      .map((t) => `<option value="${t}">${themeName(t)}</option>`)
      .join(
        "",
      )}</select></label></div><div id="player-grid" class="card-grid"></div>`,
  );
  const draw = () => {
    const q = document.querySelector("#search").value.toLowerCase(),
      f = document.querySelector("#family").value.toLowerCase(),
      sp = document.querySelector("#special").value;
    const players = ctx.league.players
      .filter(
        (p) =>
          `${p.username} ${p.displayName}`.toLowerCase().includes(q) &&
          (!f || p.cardType.startsWith(f)) &&
          (!sp || p.specials.some((x) => x.id === sp)),
      )
      .sort(
        document.querySelector("#sort").value === "name"
          ? (a, b) => a.displayName.localeCompare(b.displayName)
          : (a, b) => b.ovr - a.ovr,
      );
    document.querySelector("#player-grid").innerHTML = players.length
      ? players
          .map(
            (p) =>
              `<div class="grid-player">${card(p, { size: "sm" })}<span class="pill">${p.hasCard ? (p.official ? "Oficial" : "Provisória") : "Carta pendente"}</span></div>`,
          )
          .join("")
      : empty(
          ctx.league.players.length
            ? "Nenhum jogador encontrado"
            : "Ainda não existem jogadores para mostrar",
          ctx.league.players.length
            ? "Experimenta outros filtros."
            : "Quando novos jogadores entrarem nas Peladinhas Cards, as suas cartas irão aparecer aqui.",
          "",
          "players",
        );
    bindImages();
  };
  document
    .querySelectorAll(".filters input,.filters select")
    .forEach((e) => (e.oninput = draw));
  draw();
}
function rankingPage() {
  const players = calculateWeeklyTopPlayers(
    ctx.league.players.filter((p) => p.hasCard),
  );
  ctx.render(
    `${pageHead(isoWeek(), "Ranking semanal", "Média dos jogos da semana com pelo menos 2 avaliações válidas; desempate por OVR. Sem ratings, o OVR serve de referência.")}<div class="ranking-list">${players.map((p, i) => `<a class="ranking-row panel" href="#/player/${p.uid}"><span class="ranking-number">${i + 1}</span><img src="${esc(safeImage(p.photoURL))}" alt="" data-fallback="${ASSET_PATHS.avatar}"><div><b>${esc(p.displayName || p.username)}</b><small>${themeName(p.cardType)}</small></div><div><small>OVR</small><b>${p.ovr}</b></div><div><small>Forma semanal</small><b>${p.weeklyPerformance?.toFixed(2) || "—"}</b></div>${icon("arrow")}</a>`).join("") || empty("O ranking começa contigo", "Conclui a autoavaliação para criares a tua carta.", linkButton("#/missions", "Missões"), "trophy")}</div>`,
  );
}
async function route() {
  const turn = ++routeNumber;
  for (const fn of ctx.disposers.splice(0)) {
    try {
      await fn();
    } catch (e) {
      console.error(e);
    }
  }
  if (turn !== routeNumber) return;
  document.querySelector("#modal-root").innerHTML = "";
  if (!configured) {
    header();
    ctx.render(
      empty(
        "Configuração necessária",
        "Preenche js/config.js e segue as instruções do README.",
        "",
        "shield",
      ),
    );
    return;
  }
  if (!currentUser) {
    ctx.user = null;
    header();
    authPage(ctx);
    return;
  }
  setMain(skeleton());
  try {
    await ctx.refresh();
    if (turn !== routeNumber) return;
    if (!ctx.user) {
      ctx.render(
        empty(
          "O teu perfil precisa de ser criado",
          "A conta existe, mas falta o documento de perfil. Contacta um administrador.",
          '<button id="missing-logout" class="btn btn-secondary">Terminar sessão</button>',
          "profile",
        ),
      );
      document.querySelector("#missing-logout").onclick = () => logout();
      return;
    }
    header();
    if (ctx.user.disabled)
      return ctx.render(
        empty(
          "Conta desactivada",
          "Contacta o administrador da tua liga.",
          "",
          "shield",
        ),
      );
    const parts = (location.hash || "#/").slice(2).split("/").filter(Boolean);
    if (parts[0] === "admin" && ctx.user.role !== "admin")
      return ctx.render(
        empty(
          "Acesso reservado",
          "Esta área está disponível apenas a administradores.",
          linkButton("#/", "Início"),
          "shield",
        ),
      );
    if (!parts.length) {
      home();
      DB.callAdmin("ensureHistory", {}).catch((error) =>
        toast(
          "Histórico indisponível. Confirma que as funções Firebase foram publicadas.",
          "error",
        ),
      );
    } else if (parts[0] === "players") playersPage();
    else if (parts[0] === "player") await playerPage(ctx, parts[1]);
    else if (parts[0] === "profile")
      parts[1] === "edit"
        ? await editProfile(ctx)
        : await playerPage(ctx, ctx.user.uid);
    else if (parts[0] === "games") gamesPage(ctx);
    else if (parts[0] === "game")
      parts[2] === "feedback"
        ? await feedbackPage(ctx, parts[1])
        : await gamePage(ctx, parts[1]);
    else if (parts[0] === "missions") {
      if (parts[1] === "self") await initialMission(ctx);
      else if (parts[1] === "new") await initialMission(ctx, parts[2]);
      else
        ctx.render(
          `${pageHead("A tua evolução", "Missões", "Cada contribuição melhora a tua liga. O progresso fica guardado.")}${missionList(ctx.missions)}`,
        );
    } else if (parts[0] === "notifications") notificationsPage(ctx);
    else if (parts[0] === "tickets") await ticketsPage(ctx, parts[1]);
    else if (parts[0] === "ranking") rankingPage();
    else if (parts[0] === "admin") {
      if (parts[1] === "cards") await cardLab(ctx, parts[2]);
      else if (parts[1] === "initial")
        await initialMission(ctx, parts[2], true);
      else if (parts[1] === "player") await adminEdit(ctx, parts[2]);
      else if (parts[1] === "ratings") await rawRatings(ctx, parts[2]);
      else await adminPage(ctx);
    } else if (parts[0] === "assets")
      ctx.render(
        `${pageHead("Identidade da liga", "Assets", "Recursos locais para as cartas e identidade visual.")}<div class="panel assets-preview"><img src="${ASSET_PATHS.logo}" alt="Logo Peladinhas Cards"><div><h2>Identidade Peladinhas</h2><p>Logo original, avatar padrão e frames de cartas em CSS.</p>${ctx.user.role === "admin" ? linkButton("#/admin/cards", "Experimentar no Card Lab", "secondary", "lab") : ""}</div></div>`,
      );
    else
      ctx.render(
        empty(
          "Página não encontrada",
          "Segue para a página inicial.",
          linkButton("#/", "Início"),
        ),
      );
    bindImages();
    document.querySelector("#main").focus({ preventScroll: true });
  } catch (error) {
    if (turn === routeNumber) errorPage(error, route);
  }
}
window.addEventListener("hashchange", route);
document.querySelector(".skip-link").addEventListener("click", (event) => {
  event.preventDefault();
  document.querySelector("#main").focus();
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && currentUser) route();
});
let unsubscribe = () => {},
  liveTimer;
if (configured)
  startAuth(
    async (user) => {
      unsubscribe();
      clearTimeout(liveTimer);
      await route();
      if (user) {
        unsubscribe = DB.watchLeague(
          user.uid,
          (path) => {
            clearTimeout(liveTimer);
            liveTimer = setTimeout(async () => {
              try {
                if (path.endsWith("/notifications")) {
                  ctx.notifications = await DB.notifications(user.uid);
                  header();
                  if (location.hash === "#/notifications")
                    notificationsPage(ctx);
                } else if (!document.querySelector("main form")) await route();
              } catch (e) {
                console.error(e);
              }
            }, 600);
          },
          (error) => console.error("Actualização da liga indisponível", error),
        );
      }
    },
    (error) => errorPage(error, route),
  );
else route();
