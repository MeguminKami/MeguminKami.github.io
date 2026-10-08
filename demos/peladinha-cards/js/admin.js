import * as DB from "./db.js";
import { THEMES, ATTRIBUTES, FEEDBACK, themeName } from "./utils.js";
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
import { card, bindImages } from "./cards.js";
import { editProfile } from "./profile.js";
export async function adminPage(ctx) {
  const players = ctx.league.players,
    games = ctx.league.games,
    newPlayers = players.filter((p) => p.communityCount < 3);
  ctx.render(
    `${pageHead("Administração", "A tua liga, organizada.", "Gere os jogadores e resultados sem perder o histórico.", `<div class="actions">${linkButton("#/admin/cards", "Card Lab", "primary", "lab")}<button id="rebuild-league" class="btn btn-secondary">Recalcular liga</button></div>`)}<div class="metrics">${[
      ["Jogadores", players.length],
      ["Jogos abertos", games.filter((g) => g.status !== "closed").length],
      ["Jogos fechados", games.filter((g) => g.status === "closed").length],
      ["Novos jogadores", newPlayers.length],
    ]
      .map(([n, v]) => `<div><small>${n}</small><b>${v}</b></div>`)
      .join(
        "",
      )}</div><section><div class="section-head"><h2>Novos jogadores</h2><span class="muted">A caminho da carta oficial</span></div>${newPlayers.length ? `<div class="new-player-grid">${newPlayers.map((p) => `<a href="#/player/${p.uid}" class="panel"><b>${esc(p.displayName || p.username)}</b><p>${p.communityCount} / 3 avaliações da comunidade</p><div class="progress"><span style="--progress:${(p.communityCount / 3) * 100}%"></span></div></a>`).join("")}</div>` : empty("Plantel completo", "Todos têm avaliações suficientes.", "", "check")}</section><section><h2>Jogadores</h2><div class="table-wrap"><table><thead><tr><th>Jogador</th><th>Role</th><th>OVR</th><th>Acções</th></tr></thead><tbody>${players.map((p) => `<tr><td><a href="#/player/${p.uid}">${esc(p.displayName || p.username)}<small>@${esc(p.username)}</small></a></td><td>${p.role}</td><td>${p.ovr}</td><td><div class="actions compact">${linkButton(`#/admin/player/${p.uid}/edit`, "Editar", "ghost", "edit")}${linkButton(`#/admin/initial/${p.uid}`, "Avaliação inicial", "ghost", "edit")}${linkButton(`#/admin/cards/${p.uid}`, "Preview Card", "ghost", "lab")}<button data-role="${p.uid}" class="btn btn-secondary" ${p.uid === ctx.user.uid ? 'disabled title="O teu próprio acesso está protegido"' : ""}>${p.role === "admin" ? "Remover admin" : "Promover admin"}</button><button data-rebuild="${p.uid}" class="btn btn-ghost">Recalcular histórico</button>${linkButton(`#/admin/ratings/${p.uid}`, "Ratings raw", "ghost", "shield")}</div></td></tr>`).join("")}</tbody></table></div>${!players.length ? empty("Sem jogadores", "As contas criadas aparecem aqui.") : ""}</section><section><h2>Jogos</h2>${games.length ? `<div class="game-list">${games.map((g) => `<div class="game-row"><div><b>${esc(g.title)}</b><small>${g.status}</small></div>${linkButton(`#/game/${g.id}`, "Editar", "ghost", "edit")}<button data-delete="${g.id}" class="btn btn-danger">${icon("trash")}Eliminar</button></div>`).join("")}</div>` : empty("Sem jogos", "Cria a primeira Peladinha.", linkButton("#/game/new", "Criar jogo"), "games")}</section><section class="panel"><h2>Mensagem à liga</h2><p class="muted">Uma notificação interna para todos os jogadores activos.</p><form id="admin-message"><label>Título<input name="title" maxlength="80" required></label><label>Mensagem<textarea name="body" maxlength="500" required></textarea></label><button class="btn btn-primary">Enviar mensagem</button></form></section>`,
  );
  document.querySelectorAll("[data-role]").forEach(
    (b) =>
      (b.onclick = async () => {
        const p = players.find((p) => p.uid === b.dataset.role);
        if (
          !(await confirmDialog(
            `${p.role === "admin" ? "Remover" : "Conceder"} acesso de administração a ${p.displayName || p.username}?`,
          ))
        )
          return;
        try {
          await busy(b, () =>
            DB.saveProfile(p.uid, {
              role: p.role === "admin" ? "member" : "admin",
            }),
          );
          toast("Role actualizada.");
          await ctx.refresh();
          ctx.go("#/admin");
        } catch {}
      }),
  );
  document.querySelectorAll("[data-delete]").forEach(
    (b) =>
      (b.onclick = async () => {
        if (
          !(await confirmDialog(
            "Eliminar este jogo, avaliações e agregados? Esta acção é irreversível.",
          ))
        )
          return;
        try {
          await busy(b, () =>
            DB.callAdmin("deleteGame", { gameId: b.dataset.delete }),
          );
          toast("Jogo eliminado.");
          await ctx.refresh();
          ctx.go("#/admin");
        } catch {}
      }),
  );
  document.querySelectorAll("[data-rebuild]").forEach(
    (b) =>
      (b.onclick = async () => {
        try {
          await busy(b, () =>
            DB.callAdmin("rebuildHistory", { uid: b.dataset.rebuild }),
          );
          toast("Carta e histórico recalculados.");
          await ctx.refresh();
        } catch {}
      }),
  );
  document.querySelector("#rebuild-league").onclick = async (e) => {
    try {
      await busy(e.currentTarget, () => DB.callAdmin("rebuildLeague", {}));
      toast("Liga recalculada.");
      await ctx.refresh();
      ctx.go("#/admin");
    } catch {}
  };
  document.querySelector("#admin-message").onsubmit = async (e) => {
    e.preventDefault();
    try {
      const f = new FormData(e.target);
      await busy(e.submitter, () =>
        DB.callAdmin("adminMessage", {
          title: f.get("title"),
          body: f.get("body"),
        }),
      );
      toast("Mensagem enviada.");
      e.target.reset();
    } catch {}
  };
}
export async function adminEdit(ctx, uid) {
  const p = ctx.league.users.find((p) => p.uid === uid);
  if (!p) return ctx.render(empty("Jogador não encontrado"));
  await editProfile(ctx, p);
}
export async function rawRatings(ctx, uid) {
  const [community, ...feedback] = await Promise.all([
    DB.list("communityRatings"),
    ...ctx.league.games.map((g) => DB.list(`games/${g.id}/feedback`)),
  ]);
  const rows = [
    ...community.map((r) => ({ ...r, kind: "Comunidade" })),
    ...feedback.flat().map((r) => ({ ...r, kind: "Pós-jogo" })),
  ].filter((r) => !uid || r.targetId === uid);
  ctx.render(
    `${pageHead("Administração", "Ratings raw", "Identidades visíveis exclusivamente a administradores.", linkButton("#/admin", "Administração", "ghost"))}<label>Pesquisar jogo, avaliador ou jogador<input id="raw-search" placeholder="Username ou ID"></label><div id="raw-list"></div>`,
  );
  const name = (id) =>
    ctx.league.users.find((p) => p.uid === id)?.username || id;
  const draw = () => {
    const q = document.querySelector("#raw-search").value.toLowerCase();
    document.querySelector("#raw-list").innerHTML =
      rows
        .filter((r) =>
          JSON.stringify([r.gameId, name(r.raterId), name(r.targetId)])
            .toLowerCase()
            .includes(q),
        )
        .map(
          (r) =>
            `<details class="panel raw-rating"><summary>${esc(r.kind)} · ${esc(name(r.raterId))} → ${esc(name(r.targetId))} · ${r.submitted ? "Enviada" : "Rascunho"}</summary><pre>${esc(JSON.stringify(r, null, 2))}</pre><button type="button" class="btn btn-secondary" data-correct="${rows.indexOf(r)}">Editar valores</button></details>`,
        )
        .join("") ||
      empty("Sem avaliações", "Os votos guardados aparecerão aqui.");
    document.querySelectorAll("[data-correct]").forEach((button) => {
      button.onclick = () => {
        const rating = rows[Number(button.dataset.correct)],
          game = rating.kind === "Pós-jogo",
          values = game ? rating.ratings : rating.ratings20,
          fields = game ? FEEDBACK : ATTRIBUTES;
        const close = modal(
          "Corrigir avaliação",
          `<p>Uma correcção administrativa recalcula a carta. Os valores anteriores são guardados no registo de auditoria.</p><form id="correct-rating"><div class="correction-fields">${fields.map(([key, name]) => `<label>${esc(name)}<input name="${key}" type="number" min="0" max="${game ? 5 : 20}" value="${values[key] ?? ""}" ${rating.submitted && key !== "goalkeeping" ? "required" : ""}><small>${game && key === "goalkeeping" ? "Vazio = N/A" : ""}</small></label>`).join("")}</div><button class="btn btn-primary">Guardar correcção</button></form>`,
        );
        document.querySelector("#correct-rating").onsubmit = async (event) => {
          event.preventDefault();
          try {
            const ratings = {};
            for (const [key, value] of new FormData(event.target)) {
              if (value !== "") ratings[key] = Number(value);
              else if (game && key === "goalkeeping") ratings[key] = null;
            }
            await busy(event.submitter, () =>
              DB.callAdmin("correctRating", {
                kind: game ? "game" : "community",
                id: rating.id,
                gameId: rating.gameId || null,
                ratings,
              }),
            );
            toast("Avaliação corrigida.");
            close();
            ctx.go(location.hash);
          } catch {}
        };
      };
    });
  };
  document.querySelector("#raw-search").oninput = draw;
  draw();
}
export async function cardLab(ctx, uid) {
  const players = ctx.league.players;
  const experimental = await DB.list("cardThemes");
  const selected = players.find((p) => p.uid === uid) || players[0];
  const sample = {
    uid: "preview",
    displayName: "O teu craque",
    country: "Portugal",
    countryCode: "PT",
    primaryPosition: "ALA",
    hasCard: true,
    ovr: 82,
    stats: Object.fromEntries(ATTRIBUTES.map(([k]) => [k, 82])),
  };
  ctx.render(
    `${pageHead("Administração / Preview", "Card Lab", "Experimenta designs. O preview nunca altera as cartas reais.", linkButton("#/admin", "Administração", "ghost"))}<div class="lab-layout"><form id="lab-controls" class="panel"><label>Jogador<select name="player"><option value="">Jogador fictício</option>${players.map((p) => `<option value="${p.uid}" ${selected?.uid === p.uid ? "selected" : ""}>${esc(p.displayName || p.username)}</option>`).join("")}</select></label><div class="form-grid"><label>Nome<input name="displayName" value="${esc(selected?.displayName || sample.displayName)}" maxlength="30"></label><label>OVR<input name="ovr" type="number" min="0" max="99" value="${selected?.ovr || 82}"></label><label>País<input name="countryCode" maxlength="2" pattern="[A-Z]{2}" value="${selected?.countryCode || "PT"}"></label><label>Imagem (URL)<input name="photoURL" type="url" value="${esc(selected?.photoURL || "")}"></label></div><label>Card Theme<select name="theme">${THEMES.map((t) => `<option value="${t}" ${t === "gold-rare" ? "selected" : ""}>${themeName(t)}</option>`).join("")}<option value="custom-test">Custom Test</option></select></label><details><summary>Atributos</summary><div class="form-grid">${ATTRIBUTES.map(([k, n]) => `<label>${n}<input type="number" name="${k}" min="0" max="99" value="${selected?.stats[k] ?? 82}"></label>`).join("")}</div></details><fieldset id="custom-theme"><legend>Tema experimental</legend><label>Nome do tema<input name="themeName" value="Noite de Peladinha" maxlength="40"></label><div class="form-grid">${[
      ["color1", "Cor principal", "#26304e"],
      ["color2", "Cor secundária", "#866bcd"],
      ["textColor", "Texto", "#f5f7fa"],
      ["borderColor", "Borda", "#d7bc76"],
      ["glowColor", "Glow", "#7660a0"],
    ]
      .map(
        ([k, n, c]) =>
          `<label>${n}<input type="color" name="${k}" value="${c}"></label>`,
      )
      .join(
        "",
      )}<label>Background / textura<select name="texture"><option value="diagonal">Diagonal</option><option value="radial">Radial</option><option value="plain">Sem textura</option></select></label></div><button type="button" id="save-theme" class="btn btn-secondary">Guardar tema experimental</button></fieldset></form><div class="lab-preview"><span class="pill">Preview · não altera produção</span><div id="card-preview"></div></div></div>`,
  );
  const form = document.querySelector("#lab-controls");
  experimental.forEach((theme) =>
    form.theme.add(
      new Option(`${theme.name} · experimental`, `saved:${theme.id}`),
    ),
  );
  form.onsubmit = (event) => event.preventDefault();
  const draw = () => {
    const f = new FormData(form),
      p = {
        ...(players.find((p) => p.uid === f.get("player")) || sample),
        displayName: f.get("displayName"),
        ovr: Number(f.get("ovr")),
        countryCode: f.get("countryCode").toUpperCase(),
        photoURL: f.get("photoURL"),
        hasCard: true,
        stats: Object.fromEntries(
          ATTRIBUTES.map(([k]) => [k, Number(f.get(k))]),
        ),
      };
    const preview = document.querySelector("#card-preview");
    const savedTheme = experimental.find(
      (theme) => `saved:${theme.id}` === f.get("theme"),
    );
    preview.innerHTML = card(p, {
      theme: savedTheme ? "custom-test" : f.get("theme"),
      size: "lg",
      preview: true,
    });
    if (savedTheme || f.get("theme") === "custom-test") {
      const el = preview.firstElementChild;
      for (const [key, variable] of [
        ["color1", "--card-a"],
        ["color2", "--card-b"],
        ["textColor", "--card-text"],
        ["borderColor", "--card-edge"],
        ["glowColor", "--card-glow"],
      ])
        el.style.setProperty(
          variable,
          savedTheme
            ? savedTheme.colors[
                {
                  color1: "primary",
                  color2: "secondary",
                  textColor: "text",
                  borderColor: "border",
                  glowColor: "glow",
                }[key]
              ]
            : f.get(key),
        );
      el.dataset.texture = savedTheme?.texture || f.get("texture");
    }
    bindImages(preview);
  };
  form.oninput = draw;
  form.player.onchange = () => {
    const p = players.find((p) => p.uid === form.player.value) || sample;
    form.displayName.value = p.displayName || p.username;
    form.ovr.value = p.ovr;
    form.countryCode.value = p.countryCode || "PT";
    form.photoURL.value = p.photoURL || "";
    ATTRIBUTES.forEach(([k]) => (form.elements[k].value = p.stats[k]));
    draw();
  };
  document.querySelector("#save-theme").onclick = async (e) => {
    const f = new FormData(form);
    try {
      await busy(e.currentTarget, () =>
        DB.callAdmin("saveTheme", {
          name: f.get("themeName"),
          colors: {
            primary: f.get("color1"),
            secondary: f.get("color2"),
            text: f.get("textColor"),
            border: f.get("borderColor"),
            glow: f.get("glowColor"),
          },
          texture: f.get("texture"),
        }),
      );
      toast("Tema experimental guardado.");
    } catch {}
  };
  draw();
}
