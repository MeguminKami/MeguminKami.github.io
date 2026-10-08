import * as DB from "./db.js";
import {
  ATTRIBUTES,
  FEEDBACK,
  completeInitial,
  completeFeedback,
  participants,
} from "./utils.js";
import { pageHead, esc, empty, linkButton, toast, busy } from "./ui.js";
import { icon } from "./icons.js";
// Uma fila por formulário: nunca deixa uma gravação antiga ultrapassar a mais recente.
function autosave(ctx, form, save, onComplete) {
  let timer,
    queue = Promise.resolve(),
    dirty = false;
  const state = form.querySelector(".save-state");
  const enqueue = () => {
    if (!dirty) return queue;
    dirty = false;
    const values = readRatings(form);
    state.textContent = "A guardar…";
    queue = queue
      .catch(() => {})
      .then(() => save(values))
      .then(() => {
        state.textContent = "Guardado";
        state.className = "save-state success";
      })
      .catch((error) => {
        dirty = true;
        state.textContent = "Erro ao guardar — tenta novamente";
        state.className = "save-state error";
        toast(error.message, "error");
      });
    return queue;
  };
  form.addEventListener("input", () => {
    dirty = true;
    state.textContent = "A guardar…";
    clearTimeout(timer);
    timer = setTimeout(enqueue, 450);
  });
  form.querySelector("[data-save]")?.addEventListener("click", async () => {
    clearTimeout(timer);
    dirty = true;
    await enqueue();
  });
  form.onsubmit = async (e) => {
    e.preventDefault();
    clearTimeout(timer);
    await enqueue();
    try {
      await busy(e.submitter, async () => {
        await save(readRatings(form), true);
        toast("Avaliação concluída.");
        await onComplete();
      });
    } catch {}
  };
  ctx.cleanup(() => {
    clearTimeout(timer);
    return enqueue();
  });
}
function readRatings(form) {
  const r = {};
  form.querySelectorAll("[data-rating]").forEach((input) => {
    const k = input.dataset.rating;
    if (input.value === "") return;
    r[k] = input.value === "na" ? null : Number(input.value);
  });
  return r;
}
function initialForm(title, values, submitted = false) {
  return `<form class="panel rating-form"><div class="section-head"><h2>${esc(title)}</h2><span class="save-state" aria-live="polite">${submitted ? "Concluída" : "Guardado"}</span></div><p class="muted">Preenche cada atributo de 0 a 20. Zero também é uma avaliação válida.</p><div class="rating-sliders">${ATTRIBUTES.map(([k, n]) => `<div class="rating-row"><label for="${k}-number">${n}</label><input type="range" min="0" max="20" value="${values[k] ?? 10}" aria-label="${n}" data-slider="${k}" ${submitted ? "disabled" : ""}><input id="${k}-number" type="number" min="0" max="20" step="1" data-rating="${k}" value="${values[k] ?? ""}" placeholder="—" aria-label="${n}, valor" ${submitted ? "disabled" : ""}></div>`).join("")}</div><div class="section-head"><span class="rating-progress">${Object.keys(values).length} / 12</span>${submitted ? "" : `<div class="actions"><button type="button" data-save class="btn btn-secondary">Guardar agora</button><button class="btn btn-primary">${icon("check")}Concluir</button></div>`}</div></form>`;
}
export async function initialMission(ctx, targetId, adminInitial = false) {
  const self = adminInitial || !targetId;
  if (!adminInitial && targetId === ctx.user.uid)
    throw Error("Não podes avaliar-te nesta missão.");
  const player = ctx.league.players.find(
    (p) => p.uid === (targetId || ctx.user.uid),
  );
  if (!player)
    return ctx.render(
      empty(
        "Jogador não encontrado",
        "Volta à lista de missões.",
        linkButton("#/missions", "Missões", "secondary"),
      ),
    );
  const saved = await DB.read(
      self
        ? `initialRatings/${targetId || ctx.user.uid}`
        : `communityRatings/${ctx.user.uid}_${targetId}`,
    ),
    values = { ...(saved?.ratings20 || {}) };
  ctx.render(
    `${pageHead(self ? "A minha primeira carta" : "Avaliação da comunidade", self ? "Conhece o teu jogo" : `Avaliar ${player.displayName || player.username}`, "As alterações são guardadas automaticamente.", linkButton("#/missions", "Todas as missões", "ghost"))}${initialForm(self ? "Autoavaliação" : "Ajuda a criar a primeira carta", values, !self && saved?.submitted)}`,
  );
  const form = document.querySelector("form");
  form.querySelectorAll("[data-slider]").forEach(
    (slider) =>
      (slider.oninput = () => {
        const n = form.querySelector(`[data-rating=${slider.dataset.slider}]`);
        n.value = slider.value;
        form.querySelector(".rating-progress").textContent =
          `${Object.keys(readRatings(form)).length} / 12`;
      }),
  );
  form.querySelectorAll("[data-rating]").forEach(
    (n) =>
      (n.oninput = () => {
        const slider = form.querySelector(`[data-slider=${n.dataset.rating}]`);
        slider.value = n.value;
        form.querySelector(".rating-progress").textContent =
          `${Object.keys(readRatings(form)).length} / 12`;
      }),
  );
  if (!self && saved?.submitted) return;
  autosave(
    ctx,
    form,
    async (r, submit = false) => {
      if (submit && !completeInitial(r))
        throw Error("Preenche os 12 atributos, entre 0 e 20.");
      if (self) await DB.saveInitial(targetId || ctx.user.uid, r);
      else await DB.saveCommunity(ctx.user.uid, targetId, r, submit);
    },
    async () => {
      await ctx.refresh();
      ctx.go(adminInitial ? "#/admin" : "#/missions");
    },
  );
}
export async function feedbackPage(ctx, gid) {
  const g = ctx.league.games.find((g) => g.id === gid);
  if (!g || g.status !== "closed" || !participants(g).includes(ctx.user.uid))
    return ctx.render(
      empty(
        "Avaliação indisponível",
        "Só os participantes podem avaliar depois do encerramento.",
        linkButton("#/games", "Ver jogos", "secondary"),
      ),
    );
  const existing = await DB.myFeedback(gid, ctx.user.uid),
    targets = participants(g).filter((x) => x !== ctx.user.uid);
  ctx.render(
    `${pageHead("Pós-jogo", `Avaliar ${g.title}`, "Um voto por colega, sem autoavaliação. Os ratings enviados são privados.", linkButton(`#/game/${gid}`, "Ver jogo", "ghost"))}<div class="feedback-grid">${
      targets
        .map((uid) => {
          const p = ctx.league.users.find((x) => x.uid === uid),
            f = existing.find((x) => x.targetId === uid);
          return `<form class="panel rating-form feedback-form" data-target="${uid}"><div class="section-head"><h2>${esc(p?.displayName || p?.username || "Jogador")}</h2><span class="save-state">${f?.submitted ? "Concluída" : "Guardado"}</span></div>${FEEDBACK.map(([k, n]) => `<label>${n}<select data-rating="${k}" ${f?.submitted ? "disabled" : ""}><option value="">Escolher</option>${k === "goalkeeping" ? `<option value="na" ${f?.ratings?.[k] === null ? "selected" : ""}>N/A — não jogou à baliza</option>` : ""}${[0, 1, 2, 3, 4, 5].map((v) => `<option value="${v}" ${f?.ratings?.[k] === v ? "selected" : ""}>${v} ${v === 1 ? "estrela" : "estrelas"}</option>`).join("")}</select></label>`).join("")}${f?.submitted ? '<span class="pill success">Avaliação enviada</span>' : '<div class="actions"><button type="button" data-save class="btn btn-secondary">Guardar</button><button class="btn btn-primary">Enviar avaliação</button></div>'}</form>`;
        })
        .join("") ||
      empty(
        "Não há colegas para avaliar",
        "Este jogo só tem um participante.",
        "",
        "players",
      )
    }</div>`,
  );
  document.querySelectorAll(".feedback-form").forEach((form) => {
    const target = form.dataset.target;
    if (existing.some((f) => f.targetId === target && f.submitted)) return;
    autosave(
      ctx,
      form,
      (r, submit) => {
        if (submit && !completeFeedback(r))
          throw Error(
            "Preenche as 5 dimensões e escolhe um valor ou N/A para guarda-redes.",
          );
        return DB.saveFeedback(gid, ctx.user.uid, target, r, submit);
      },
      async () => {
        await ctx.refresh();
        ctx.go(`#/game/${gid}/feedback`);
      },
    );
  });
}
