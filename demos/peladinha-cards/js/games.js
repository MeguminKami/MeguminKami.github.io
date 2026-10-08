import * as DB from "./db.js";
import { participants, formatDate, asDate } from "./utils.js";
import {
  esc,
  pageHead,
  empty,
  linkButton,
  busy,
  toast,
  confirmDialog,
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
  const editable =
    !saved ||
    ctx.user.role === "admin" ||
    (saved.creatorId === ctx.user.uid && saved.status !== "closed");
  ctx.render(
    `${pageHead("Peladinha", saved?.title || "Criar jogo", editable ? "Arrasta os jogadores ou usa os botões para montar as equipas." : "Equipas e resultado desta Peladinha.", linkButton("#/games", "Todos os jogos", "ghost"))}<form id="game-form"><div class="panel"><div class="form-grid"><label>Título<input name="title" required maxlength="80" value="${esc(g.title)}" ${editable ? "" : "disabled"}></label><label>Data e hora<input type="datetime-local" name="scheduledAt" required value="${g.scheduledAt}" ${editable ? "" : "disabled"}></label><label>Local<input name="location" maxlength="120" value="${esc(g.location)}" ${editable ? "" : "disabled"}></label><label>Notas<textarea name="notes" maxlength="1000" ${editable ? "" : "disabled"}>${esc(g.notes)}</textarea></label></div></div><div id="team-builder"></div><div class="panel score-panel"><div><p class="eyebrow">Resultado</p><h2>Quem levou a melhor?</h2></div><div class="score"><label>Team A<input type="number" min="0" max="999" name="scoreA" value="${g.score.teamA}" ${editable ? "" : "disabled"}></label><b>—</b><label>Team B<input type="number" min="0" max="999" name="scoreB" value="${g.score.teamB}" ${editable ? "" : "disabled"}></label></div></div>${editable ? `<div class="actions"><button class="btn btn-primary" name="action" value="save">Guardar jogo</button>${g.status !== "closed" ? '<button class="btn btn-secondary" name="action" value="open">Abrir jogo</button><button class="btn btn-success" name="action" value="close">Encerrar jogo</button>' : ctx.user.role === "admin" ? '<button class="btn btn-secondary" name="action" value="reopen">Reabrir jogo</button>' : ""}</div>` : ""}${saved?.status === "closed" && participants(saved).includes(ctx.user.uid) ? linkButton(`#/game/${id}/feedback`, "Avaliar jogadores", "primary", "missions") : ""}</form>`,
  );
  const builder = document.querySelector("#team-builder");
  const fields = document.querySelector("#game-form .form-grid");
  if (editable) {
    fields.insertAdjacentHTML(
      "beforeend",
      `<label>Vídeo no YouTube (opcional)<input type="url" name="youtubeUrl" maxlength="500" placeholder="https://www.youtube.com/watch?v=…" value="${esc(g.youtubeVideoId ? `https://www.youtube.com/watch?v=${g.youtubeVideoId}` : "")}"><small class="muted">Aceita links normais, youtu.be, Shorts e transmissões. Deixa vazio para remover.</small></label>`,
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
  const draw = () => {
    builder.innerHTML = `<div class="team-builder"><section class="team-panel available"><div class="section-head"><h2>Disponíveis</h2><small>${ctx.league.players.filter((p) => !assigned(p.uid)).length}</small></div><div class="team-player-list">${
      ctx.league.players
        .filter((p) => !assigned(p.uid))
        .map((p) => chip(p, "available"))
        .join("") ||
      '<p class="muted">Todos os jogadores estão nas equipas.</p>'
    }</div></section>${["A", "B"].map((side) => `<section class="team-panel"><div class="section-head"><h2>Team ${side}</h2><span class="team-letter">${side}</span></div>${["starters", "bench"].map((kind) => `<div class="drop-zone" data-team="team${side}" data-kind="${kind}"><h3>${kind === "starters" ? `Titulares · ${g[`team${side}`][kind].length}/5` : "Suplentes"}</h3><div class="team-player-list">${g[`team${side}`][kind].map((uid) => chip(ctx.league.players.find((p) => p.uid === uid) || { uid, displayName: "Jogador inactivo" }, `${side}-${kind}`)).join("") || '<p class="drop-hint">Arrasta jogadores para aqui</p>'}</div></div>`).join("")}</section>`).join("")}</div>`;
    if (!editable) return;
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
    return `<div class="team-chip" ${editable ? 'draggable="true"' : ""} data-uid="${esc(p.uid)}"><div class="chip-card">${card(p, { size: "sm", preview: true })}</div><div class="chip-info"><b>${esc(p.displayName || p.username)}</b><small>${p.hasCard ? "OVR " + p.ovr : "Carta pendente"}</small>${editable ? `<div class="chip-controls">${place === "available" ? `<button type="button" data-uid="${p.uid}" data-assign="teamA" data-kind="starters" class="btn btn-ghost">→ A</button><button type="button" data-uid="${p.uid}" data-assign="teamB" data-kind="starters" class="btn btn-ghost">→ B</button>` : `<select data-move-select="${p.uid}" aria-label="Mover ${esc(p.displayName)}"><option value="">Mover para…</option><option value="teamA/starters">A · Titular</option><option value="teamA/bench">A · Suplente</option><option value="teamB/starters">B · Titular</option><option value="teamB/bench">B · Suplente</option></select><button type="button" data-remove="${p.uid}" class="btn btn-icon btn-ghost" aria-label="Remover jogador">${icon("close")}</button>`}</div>` : ""}</div></div>`;
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
