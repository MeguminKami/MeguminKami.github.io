import { bindRowScroll } from "./row-scroll.js";
import {
  balancedTeams,
  teamBalance,
  balanceSignature,
  balanceMatches,
  BALANCE_SETTINGS,
} from "./team-balance.js";
import * as DB from "./db.js";
import { participants, formatDate, asDate, matchPerformance } from "./utils.js";
import {
  esc,
  pageHead,
  empty,
  linkButton,
  busy,
  toast,
  confirmDialog,
  modal,
} from "./ui.js";
import { icon } from "./icons.js";
import { card } from "./cards.js";
import { youtubeVideoId, youtubePlayer } from "./youtube.js";
export function gameRows(games) {
  return `<div class="game-list">${games.map((g) => `<a class="game-row" href="#/game/${g.id}"><span class="game-symbol">${icon("games")}</span><div><b>${esc(g.title)}</b><small>${formatDate(g.scheduledAt)} · ${esc(g.location || "Local a definir")}</small></div><span class="pill ${g.status === "closed" ? "" : "success"}">${{ draft: "Rascunho", open: "Aberto", closed: "Finalizado" }[g.status]}</span><strong>${g.status === "closed" ? `${g.score.teamA} — ${g.score.teamB}` : "VS"}</strong>${icon("arrow")}</a>`).join("")}</div>`;
}
export function gamesPage(ctx) {
  ctx.render(
    `${pageHead("Dentro de campo", "Jogos", "Organiza a próxima Peladinha e revê os resultados.", linkButton("#/game/new", "Criar jogo", "primary", "plus"))}${ctx.league.games.length ? gameRows(ctx.league.games) : empty("Ainda não existem jogos", "Cria a primeira Peladinha. As equipas e os resultados ficam todos aqui.", linkButton("#/game/new", "Criar jogo", "primary", "plus"), "games")}`,
  );
}
function dateInput(timestamp) {
  const d = asDate(timestamp);
  if (!d || Number.isNaN(d.getTime())) return "";
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}
export async function gamePage(ctx, id) {
  const saved = id === "new" ? null : ctx.league.games.find((x) => x.id === id);
  if (id !== "new" && !saved)
    return ctx.render(
      empty(
        "Jogo não encontrado",
        "Pode ter sido eliminado.",
        linkButton("#/games", "Ver jogos", "secondary"),
      ),
    );
  const g = saved
    ? structuredClone({
        ...saved,
        scheduledAt: dateInput(saved.scheduledAt),
        createdAt: null,
        closedAt: null,
        updatedAt: null,
      })
    : {
        title: "",
        location: "",
        notes: "",
        status: "draft",
        teamA: { starters: [], bench: [] },
        teamB: { starters: [], bench: [] },
        score: { teamA: 0, teamB: 0 },
        scheduledAt: "",
      };
  const performance = new Map(
    participants(g).map((uid) => [uid, matchPerformance(uid, g)]),
  );
  const editable =
    !saved ||
    ctx.user.role === "admin" ||
    ctx.user.role === "dbs" ||
    (saved.creatorId === ctx.user.uid && saved.status !== "closed");
  const canClose =
    !saved ||
    ctx.user.role === "admin" ||
    ctx.user.role === "dbs" ||
    saved.creatorId === ctx.user.uid;
  ctx.render(
    `${pageHead("Peladinha", saved?.title || "Criar jogo", editable ? "Escolhe as equipas e guarda o jogo." : "Equipas e resultado desta Peladinha.", linkButton("#/games", "Todos os jogos", "ghost"))}<form id="game-form" class="content-stack"><div class="panel game-details-panel"><div class="form-grid"><label>Título<input name="title" required maxlength="80" value="${esc(g.title)}" ${editable ? "" : "disabled"}></label><label>Data e hora<input type="datetime-local" name="scheduledAt" required value="${g.scheduledAt}" ${editable ? "" : "disabled"}></label><label>Local<input name="location" maxlength="120" value="${esc(g.location)}" ${editable ? "" : "disabled"}></label><input type="hidden" name="notes" value="${esc(g.notes)}"></div></div><div id="team-builder" class="content-stack"></div><div class="panel score-panel"><div><p class="eyebrow">Resultado</p><h2>Quem levou a melhor?</h2></div><div class="score"><label>Team A<input type="number" min="0" max="999" name="scoreA" value="${g.score.teamA}" ${editable ? "" : "disabled"}></label><b>—</b><label>Team B<input type="number" min="0" max="999" name="scoreB" value="${g.score.teamB}" ${editable ? "" : "disabled"}></label></div><div id="match-performances"></div></div>${editable ? `<div class="actions"><button class="btn btn-primary" name="action" value="save">Guardar jogo</button>${g.status !== "closed" ? `<button class="btn btn-secondary" name="action" value="open">Abrir jogo</button>${canClose ? '<button class="btn btn-success" name="action" value="close">Encerrar jogo</button>' : ""}` : ["admin", "dbs"].includes(ctx.user.role) ? '<button class="btn btn-secondary" name="action" value="reopen">Reabrir jogo</button>' : ""}</div>` : ""}${saved?.status === "closed" && participants(saved).includes(ctx.user.uid) ? linkButton(`#/game/${id}/feedback`, "Avaliar jogadores", "primary", "missions") : ""}</form>`,
  );
  const builder = document.querySelector("#team-builder");
  const fields = document.querySelector("#game-form .form-grid");
  if (editable) {
    fields.insertAdjacentHTML(
      "beforeend",
      `<label>Vídeo no YouTube (opcional)<input type="url" name="youtubeUrl" maxlength="500" placeholder="https://www.youtube.com/watch?v=…" value="${esc(g.youtubeVideoId ? `https://www.youtube.com/watch?v=${g.youtubeVideoId}` : "")}"></label>`,
    );
  }
  const video = document.createElement("div");
  video.innerHTML = youtubePlayer(g.youtubeVideoId);
  document.querySelector("#game-form").after(video);
  fields
    .querySelector('[name="youtubeUrl"]')
    ?.addEventListener("input", (event) => {
      const id = youtubeVideoId(event.target.value);
      event.target.setCustomValidity(
        id === null ? "Introduz um link de vídeo válido do YouTube." : "",
      );
      video.innerHTML = youtubePlayer(id);
    });
  const assigned = (uid) =>
    ["teamA", "teamB"].some((t) =>
      ["starters", "bench"].some((k) => g[t][k].includes(uid)),
    );
  const ratedPlayers = ctx.league.players.filter(
    (p) => p.hasCard && Number.isFinite(p.ovr),
  );
  const chosen = new Set(
    (participants(g).length
      ? ratedPlayers.filter((p) => assigned(p.uid))
      : []
    ).map((p) => p.uid),
  );
  const signed = (value) =>
    `${value >= 0 ? "+" : ""}${value.toLocaleString("pt-PT", { maximumFractionDigits: 2 })}`;
  const number = (value) =>
    value == null
      ? "—"
      : value.toLocaleString("pt-PT", { maximumFractionDigits: 2 });
  const referenceBalance = () =>
    g.status === "closed"
      ? ctx.league.balances?.find(
          (b) =>
            b.id === id &&
            balanceMatches({ ...saved, teamA: g.teamA, teamB: g.teamB }, b),
        )
      : null;
  const teamPlayers = (side) => {
    const reference = referenceBalance();
    return [...g[side].starters, ...g[side].bench]
      .map((uid) => {
        const player = ctx.league.players.find((p) => p.uid === uid);
        if (!player) return null;
        const referenceOvr = reference?.playerOvr?.[uid];
        return {
          ...player,
          hasCard: Number.isFinite(referenceOvr) || player.hasCard,
          ovr: Number.isFinite(referenceOvr) ? referenceOvr : player.ovr,
        };
      })
      .filter((p) => p?.hasCard && Number.isFinite(p.ovr))
      .sort((a, b) => b.ovr - a.ovr || a.uid.localeCompare(b.uid));
  };
  const playerHighlight = (label, player) =>
    `<div class="game-highlight"><small>${label}</small>${player ? `<a href="#/player/${esc(player.uid)}"><b>${esc(player.displayName || player.username)}</b><span>${number(player.ovr)} OVR</span></a>` : '<b class="muted">—</b>'}</div>`;
  const balancePanel = (details = false) => {
    const frozen =
      g.status === "closed"
        ? ctx.league.balances?.find(
            (b) =>
              b.id === id &&
              balanceMatches({ ...saved, teamA: g.teamA, teamB: g.teamB }, b),
          )
        : null;
    const balance = frozen || teamBalance(g, ctx.league.players);
    const verified = g.status !== "closed" || !!frozen;
    const boostA = verified ? balance.boostA : 0,
      boostB = verified ? balance.boostB : 0;
    if (!details) {
      const difference =
        balance.teamA.average == null || balance.teamB.average == null
          ? null
          : balance.teamA.average - balance.teamB.average;
      const badge = (side, value) =>
        `<div><span>Team ${side}</span><strong class="ovr-difference ${value > 0 ? "positive" : value < 0 ? "negative" : "neutral"}">${value == null ? "—" : value === 0 ? "0" : signed(value)}</strong></div>`;
      const ranked = [...teamPlayers("teamA"), ...teamPlayers("teamB")].sort(
        (a, b) => b.ovr - a.ovr || a.uid.localeCompare(b.uid),
      );
      const total = (balance.teamA.average || 0) + (balance.teamB.average || 0);
      const share = total ? (100 * (balance.teamA.average || 0)) / total : 50;
      return `<div class="team-balance-panel"><div class="section-head"><h3>Equilíbrio · OVR</h3>${ctx.user.role === "admin" ? `<button type="button" id="balance-details" class="btn btn-icon btn-ghost" aria-label="Ver detalhes das equipas">${icon("plus")}</button>` : ""}</div><div class="balance-summary">${badge("A", difference)}${badge("B", difference == null ? null : -difference)}</div><div class="balance-scale" aria-hidden="true"><span style="width:${share}%"></span><span style="width:${100 - share}%"></span></div><div class="balance-averages"><span>Team A · ${number(balance.teamA.average)} OVR</span><span>Team B · ${number(balance.teamB.average)} OVR</span></div><div class="game-highlights">${playerHighlight("Maior OVR", ranked[0])}${playerHighlight("Menor OVR", ranked.at(-1))}</div><div class="position-leaders">${[
        "GR",
        "DEF",
        "ALA",
        "MED",
        "AV",
      ]
        .map(
          (position) =>
            `<div><span class="position-tag">${position}</span>${playerHighlight(
              "Melhor da posição",
              ranked.find((p) => p.primaryPosition === position),
            )}</div>`,
        )
        .join("")}</div></div>`;
    }
    return `<section class="balance-audit"><div class="section-head"><h2>Equilíbrio das equipas</h2><span class="pill">${g.status === "closed" ? (frozen ? "OVR de referência guardado" : "Sem referência guardada") : "Prévia com OVR atual"}</span></div><div class="metrics"><div><small>Média OVR · Team A</small><b>${number(balance.teamA.average)}</b><small>${balance.teamA.rated}/${balance.teamA.count} com carta</small></div><div><small>Média OVR · Team B</small><b>${number(balance.teamB.average)}</b><small>${balance.teamB.rated}/${balance.teamB.count} com carta</small></div><div><small>Diferença entre equipas</small><b>${number(balance.difference)}</b></div><div><small>Desvio médio entre equipas</small><b>${number(balance.meanDeviation)}</b></div></div><div class="table-wrap"><table><thead><tr><th>Equipa</th><th>Média dos titulares</th><th>Ajuste de equilíbrio</th><th>Vitória</th><th>Empate</th><th>Derrota</th>${g.status === "closed" ? "<th>Neste resultado</th>" : ""}</tr></thead><tbody>${[
      ["A", balance.teamA, boostA],
      ["B", balance.teamB, boostB],
    ]
      .map(
        ([side, team, boost]) =>
          `<tr><td>Team ${side}</td><td>${number(team.startersAverage)}</td><td>${signed(boost)}</td><td>${signed(5 + boost)}</td><td>${signed(boost)}</td><td>${signed(-5 + boost)}</td>${g.status === "closed" ? `<td><strong>${signed(5 * Math.sign((side === "A" ? 1 : -1) * (g.score.teamA - g.score.teamB)) + boost)}</strong></td>` : ""}</tr>`,
      )
      .join(
        "",
      )}</tbody></table></div><p class="muted">A média inclui titulares e suplentes. O desvio é metade da diferença entre as duas médias. O ajuste varia de −3 a +3 pontos na contribuição de cada jogo; as estrelas dadas aos jogadores mantêm-se. Não é um aumento direto do OVR.</p>${!balance.complete ? '<p class="warning">Faltam cartas ou jogadores numa equipa. O ajuste de equilíbrio fica a zero para ambas.</p>' : ""}${!verified ? '<p class="warning">Este jogo não tem um registo de OVR de referência. As médias são apenas indicativas; o ajuste fica a zero.</p>' : ""}<p class="muted">Sorteio: até ${BALANCE_SETTINGS.attempts} combinações, escolhendo aleatoriamente entre as que ficam até ${number(BALANCE_SETTINGS.tolerance)} ponto da melhor diferença encontrada. Compara as médias de todos os jogadores e dos titulares. Máximo de 5 titulares por equipa.</p><p class="muted">Ajuste: (média adversária − média da equipa) × ${number(BALANCE_SETTINGS.sensitivity)}, limitado entre ${signed(BALANCE_SETTINGS.minBoost)} e ${signed(BALANCE_SETTINGS.maxBoost)}.</p></section>`;
  };
  const autoPanel = () =>
    `<div class="auto-teams"><div class="section-head"><div><h2>Equipas</h2></div>${editable && g.status !== "closed" ? '<button type="button" id="auto-teams" class="btn btn-primary">Sortear equipas</button>' : `<span class="pill">${g.status === "closed" ? "Jogo finalizado" : g.status === "open" ? "Jogo aberto" : "Rascunho"}</span>`}</div></div>`;
  const drawPerformance = () => {
    const root = document.querySelector("#match-performances");
    root.innerHTML = `<div class="match-performance-grid">${["teamA", "teamB"]
      .map(
        (side) =>
          `<section><h3>Team ${side === "teamA" ? "A" : "B"} · Golos e assistências</h3>${
            [...g[side].starters, ...g[side].bench]
              .map((uid) => {
                const player = ctx.league.players.find((p) => p.uid === uid),
                  row = performance.get(uid) || { goals: 0, assists: 0 };
                performance.set(uid, row);
                return `<div class="match-performance-row"><b>${esc(player?.displayName || player?.username || "Jogador")}</b>${[
                  ["goals", "Golos"],
                  ["assists", "Assistências"],
                ]
                  .map(
                    ([key, label]) =>
                      `<label>${label}<input type="number" min="0" max="999" step="1" value="${row[key]}" data-performance-uid="${esc(uid)}" data-performance-key="${key}" aria-label="${label} de ${esc(player?.displayName || uid)}" ${editable ? "" : "disabled"}></label>`,
                  )
                  .join("")}</div>`;
              })
              .join("") || '<p class="muted">Adiciona jogadores à equipa.</p>'
          }</section>`,
      )
      .join("")}</div>`;
    root.oninput = (event) => {
      const input = event.target;
      if (!input.dataset.performanceUid) return;
      performance.get(input.dataset.performanceUid)[
        input.dataset.performanceKey
      ] = Number(input.value);
    };
  };
  const draw = () => {
    drawPerformance();
    builder.innerHTML = `<section class="panel game-teams-frame content-stack">${autoPanel()}${balancePanel()}<div class="team-builder ${editable && ctx.league.players.some((p) => !assigned(p.uid)) ? "has-available" : ""}"><section class="team-panel available"><div class="section-head"><h2>Disponíveis</h2><small>${ctx.league.players.filter((p) => !assigned(p.uid)).length}</small></div><div class="team-player-list">${
      ctx.league.players
        .filter((p) => !assigned(p.uid))
        .map((p) => chip(p, "available"))
        .join("") ||
      '<p class="muted">Todos os jogadores estão nas equipas.</p>'
    }</div></section>${["A", "B"].map((side) => `<section class="team-panel team-${side.toLowerCase()}"><div class="section-head"><h2>Team ${side}</h2><span class="team-letter">${side}</span></div>${["starters", "bench"].map((kind) => `<div class="drop-zone" data-team="team${side}" data-kind="${kind}"><h3>${kind === "starters" ? `Titulares · ${g[`team${side}`][kind].length}/5` : "Suplentes"}</h3><div class="team-player-list">${g[`team${side}`][kind].map((uid) => chip(ctx.league.players.find((p) => p.uid === uid) || { uid, displayName: "Jogador inactivo" }, `${side}-${kind}`)).join("") || '<p class="drop-hint">Arrasta jogadores para aqui</p>'}</div></div>`).join("")}</section>`).join("")}</div></section>`;
    builder.querySelector("#balance-details")?.addEventListener("click", () => {
      if (ctx.user.role === "admin")
        modal("Detalhes das equipas", balancePanel(true));
    });
    if (!editable) return;
    builder.querySelector("#auto-teams")?.addEventListener("click", () => {
      const selection = new Set(chosen);
      const close = modal(
        "Escolher jogadores",
        `<form id="auto-selection"><p class="draw-help">Arrasta as cartas para o balde ou toca para adicionar e retirar.</p><div class="auto-selection-head"><button type="button" id="select-all-players" class="btn btn-ghost">Selecionar todos</button></div><div class="draw-pool-layout"><section class="draw-pool" data-draw-zone="available" aria-label="Jogadores disponíveis"><h3>Disponíveis</h3><div class="draw-card-list" id="draw-available"></div></section><section class="draw-pool draw-bucket" data-draw-zone="selected" aria-label="Balde do sorteio"><h3>${icon("players")} Balde do sorteio<span id="auto-selected-count" class="pill success" role="status" aria-live="polite" aria-atomic="true"></span></h3><div class="draw-card-list" id="draw-selected"></div></section></div><div class="actions"><button id="confirm-auto-teams" class="btn btn-primary">Sortear equipas</button></div></form>`,
      );
      const form = document.querySelector("#auto-selection");
      form.closest(".modal").classList.add("draw-selection-modal");
      form.querySelectorAll(".draw-card-list").forEach(bindRowScroll);
      const eligible = new Set(ratedPlayers.map((p) => p.uid));
      const tile = (p) => {
        const selected = selection.has(p.uid),
          disabled = !eligible.has(p.uid);
        return `<button type="button" class="draw-player-card" data-auto-player="${esc(p.uid)}" draggable="${!disabled}" ${disabled ? "disabled" : ""} aria-label="${selected ? "Retirar" : "Adicionar"} ${esc(p.displayName || p.username)} ${selected ? "do" : "ao"} balde">${card(p, { size: "sm", preview: true })}<span class="draw-card-action">${disabled ? "Carta pendente" : selected ? "− Retirar" : "+ Adicionar"}</span></button>`;
      };
      const update = () => {
        form.querySelector("#auto-selected-count").textContent = String(
          selection.size,
        );
        form
          .querySelector("#auto-selected-count")
          .setAttribute("aria-label", `${selection.size} jogadores no sorteio`);
        form.querySelector("#confirm-auto-teams").disabled = selection.size < 2;
        form.querySelector("#select-all-players").textContent =
          selection.size === ratedPlayers.length
            ? "Limpar seleção"
            : "Selecionar todos";
        const available = ctx.league.players.filter(
          (p) => !selection.has(p.uid),
        );
        const selected = ratedPlayers.filter((p) => selection.has(p.uid));
        form.querySelector("#draw-available").innerHTML =
          available.map(tile).join("") ||
          '<p class="draw-empty">Todas as cartas estão no balde.</p>';
        form.querySelector("#draw-selected").innerHTML =
          selected.map(tile).join("") ||
          '<p class="draw-empty">Arrasta as cartas para aqui</p>';
      };
      const moveSelection = (uid, selected) => {
        if (!eligible.has(uid)) return;
        if (selected) selection.add(uid);
        else selection.delete(uid);
        update();
        [...form.querySelectorAll("[data-auto-player]")]
          .find((el) => el.dataset.autoPlayer === uid)
          ?.focus({ preventScroll: true });
      };
      form.onclick = (event) => {
        const tile = event.target.closest("[data-auto-player]");
        if (tile && !tile.disabled)
          moveSelection(
            tile.dataset.autoPlayer,
            !selection.has(tile.dataset.autoPlayer),
          );
      };
      form.ondragstart = (event) => {
        const tile = event.target.closest("[data-auto-player]");
        if (!tile || tile.disabled) {
          event.preventDefault();
          return;
        }
        event.dataTransfer.setData("text/plain", tile.dataset.autoPlayer);
        event.dataTransfer.effectAllowed = "move";
      };
      form.querySelectorAll("[data-draw-zone]").forEach((zone) => {
        zone.ondragover = (event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          zone.classList.add("drag-over");
        };
        zone.ondragleave = (event) => {
          if (!zone.contains(event.relatedTarget))
            zone.classList.remove("drag-over");
        };
        zone.ondrop = (event) => {
          event.preventDefault();
          zone.classList.remove("drag-over");
          moveSelection(
            event.dataTransfer.getData("text/plain"),
            zone.dataset.drawZone === "selected",
          );
        };
      });
      form.ondragend = () =>
        form
          .querySelectorAll(".drag-over")
          .forEach((zone) => zone.classList.remove("drag-over"));
      form.querySelector("#select-all-players").onclick = () => {
        const clear = selection.size === ratedPlayers.length;
        selection.clear();
        if (!clear) ratedPlayers.forEach((p) => selection.add(p.uid));
        update();
      };
      update();
      form.onsubmit = (event) => {
        event.preventDefault();
        try {
          const result = balancedTeams(
            ratedPlayers.filter((p) => selection.has(p.uid)),
            { previous: balanceSignature(g) },
          );
          chosen.clear();
          selection.forEach((uid) => chosen.add(uid));
          g.teamA = result.teamA;
          g.teamB = result.teamB;
          close();
          draw();
          toast("Equipas sorteadas. Guarda o jogo para confirmar.");
        } catch (error) {
          toast(error.message, "error");
        }
      };
    });
    builder
      .querySelectorAll("[data-assign]")
      .forEach(
        (b) =>
          (b.onclick = () =>
            move(b.dataset.uid, b.dataset.assign, b.dataset.kind)),
      );
    builder
      .querySelectorAll("[data-remove]")
      .forEach((b) => (b.onclick = () => move(b.dataset.remove)));
    builder
      .querySelectorAll("[draggable]")
      .forEach(
        (el) =>
          (el.ondragstart = (e) =>
            e.dataTransfer.setData("text/plain", el.dataset.uid)),
      );
    builder.querySelectorAll(".drop-zone").forEach((zone) => {
      zone.ondragover = (e) => {
        e.preventDefault();
        zone.classList.add("drag-over");
      };
      zone.ondragleave = () => zone.classList.remove("drag-over");
      zone.ondrop = (e) => {
        e.preventDefault();
        move(
          e.dataTransfer.getData("text/plain"),
          zone.dataset.team,
          zone.dataset.kind,
        );
      };
    });
  };
  function chip(p, place) {
    const side = place.startsWith("A-")
      ? "teamA"
      : place.startsWith("B-")
        ? "teamB"
        : null;
    const captain = side && teamPlayers(side)[0]?.uid === p.uid;
    const hasDisplayCard =
      p.hasCard ||
      (side && Number.isFinite(referenceBalance()?.playerOvr?.[p.uid]));
    const displayedOvr = side
      ? (teamPlayers(side).find((player) => player.uid === p.uid)?.ovr ?? p.ovr)
      : p.ovr;
    return `<div class="team-chip ${captain ? "is-captain" : ""}" ${editable ? 'draggable="true"' : ""} data-uid="${esc(p.uid)}"><div class="chip-card">${card(p, { size: "sm", preview: true })}</div><div class="chip-info"><b>${esc(p.displayName || p.username)}</b><small>${hasDisplayCard ? "OVR " + displayedOvr : "Carta pendente"}${captain ? ' <span class="captain-badge" title="Maior OVR da equipa">C · Capitão</span>' : ""}</small>${editable ? `<div class="chip-controls">${place === "available" ? `<button type="button" data-uid="${p.uid}" data-assign="teamA" data-kind="starters" class="btn btn-ghost">→ A</button><button type="button" data-uid="${p.uid}" data-assign="teamB" data-kind="starters" class="btn btn-ghost">→ B</button>` : `<select data-move-select="${p.uid}" aria-label="Mover ${esc(p.displayName)}"><option value="">Mover para…</option><option value="teamA/starters">A · Titular</option><option value="teamA/bench">A · Suplente</option><option value="teamB/starters">B · Titular</option><option value="teamB/bench">B · Suplente</option></select><button type="button" data-remove="${p.uid}" class="btn btn-icon btn-ghost" aria-label="Remover jogador">${icon("close")}</button>`}</div>` : ""}</div></div>`;
  }
  function move(uid, team, kind) {
    if (!ctx.league.players.some((p) => p.uid === uid)) return;
    if (
      team &&
      kind === "starters" &&
      g[team].starters.filter((x) => x !== uid).length >= 5
    )
      return toast("Máximo de 5 titulares por equipa.", "error");
    ["teamA", "teamB"].forEach((t) =>
      ["starters", "bench"].forEach(
        (k) => (g[t][k] = g[t][k].filter((x) => x !== uid)),
      ),
    );
    if (team) g[team][kind].push(uid);
    draw();
  }
  builder.addEventListener("change", (e) => {
    if (e.target.matches("[data-move-select]") && e.target.value) {
      const [team, kind] = e.target.value.split("/");
      move(e.target.dataset.moveSelect, team, kind);
    }
  });
  draw();
  document.querySelector("#game-form").onsubmit = async (e) => {
    e.preventDefault();
    if (!editable) return;
    const action = e.submitter.value;
    if (action === "close" && !canClose) return;
    if (
      action === "reopen" &&
      !(await confirmDialog(
        "Reabrir este jogo? As missões de feedback ficarão suspensas até ao próximo encerramento.",
      ))
    )
      return;
    if (
      action === "close" &&
      (!g.teamA.starters.length || !g.teamB.starters.length)
    )
      return toast("Adiciona pelo menos um titular em cada equipa.", "error");
    try {
      await busy(e.submitter, async () => {
        const f = new FormData(e.target),
          data = {
            title: f.get("title").trim(),
            location: f.get("location").trim(),
            notes: f.get("notes").trim(),
            youtubeVideoId: youtubeVideoId(f.get("youtubeUrl")),
            scheduledAt: new Date(f.get("scheduledAt")),
            teamA: g.teamA,
            teamB: g.teamB,
            performance: Object.fromEntries(
              ["teamA", "teamB"].map((side) => [
                side,
                Object.fromEntries(
                  ["goals", "assists"].map((key) => [
                    key,
                    [...g[side].starters, ...g[side].bench].flatMap((uid) => {
                      const count = performance.get(uid)?.[key] || 0;
                      if (!Number.isInteger(count) || count < 0 || count > 999)
                        throw Error(
                          "Introduz golos e assistências inteiros entre 0 e 999.",
                        );
                      return Array(count).fill(uid);
                    }),
                  ]),
                ),
              ]),
            ),
            score: {
              teamA: Number(f.get("scoreA")),
              teamB: Number(f.get("scoreB")),
            },
            status:
              action === "close"
                ? "closed"
                : action === "open" || action === "reopen"
                  ? "open"
                  : g.status,
          };
        for (const side of ["teamA", "teamB"]) {
          if (
            data.performance[side].goals.length > data.score[side] ||
            data.performance[side].assists.length > data.score[side]
          )
            throw Error(
              `Os golos e assistências de Team ${side === "teamA" ? "A" : "B"} não podem ultrapassar o resultado da equipa.`,
            );
        }
        const gameId = await DB.saveGame(saved?.id, data, ctx.user);
        toast(
          action === "close"
            ? "Jogo encerrado."
            : saved
              ? "Jogo guardado."
              : "Jogo criado.",
        );
        await ctx.refresh();
        ctx.go(`#/game/${gameId}`);
      });
    } catch {}
  };
}
