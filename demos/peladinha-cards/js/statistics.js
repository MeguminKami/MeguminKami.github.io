import { pageHead, esc, empty } from "./ui.js";
import { average } from "./utils.js";
export function statisticsPage(ctx) {
  const closed = ctx.league.games.filter((g) => g.status === "closed");
  const goals = closed.reduce(
    (sum, g) => sum + g.score.teamA + g.score.teamB,
    0,
  );
  ctx.render(`${pageHead("A liga em números", "Estatísticas", "Golos, assistências e resultados da tua liga.")}
    <div class="metrics statistics-metrics">${[
      ["Jogadores", ctx.league.players.length],
      ["Jogos finalizados", closed.length],
      ["Golos da liga", goals],
      [
        "Assistências",
        ctx.league.players.reduce((sum, p) => sum + p.matchStats.assists, 0),
      ],
      [
        "Golos por jogo",
        closed.length ? (goals / closed.length).toFixed(1) : "—",
      ],
    ]
      .map(
        ([name, value]) => `<div><small>${name}</small><b>${value}</b></div>`,
      )
      .join("")}</div>
    <section class="panel statistics-panel"><label>Ordenar jogadores<select id="statistics-sort"><option value="goals">Golos</option><option value="assists">Assistências</option><option value="wins">Vitórias</option><option value="winRate">Percentagem de vitórias</option><option value="played">Jogos</option><option value="ovr">OVR</option><option value="form">Performance média</option></select></label><div id="statistics-table"></div></section>`);
  const draw = () => {
    const key = document.querySelector("#statistics-sort").value;
    const players = ctx.league.players.map((p) => ({
      ...p,
      ...p.matchStats,
      form: p.aggregates.length
        ? average(p.aggregates.map((a) => a.overall))
        : null,
    }));
    players.sort(
      (a, b) =>
        (b[key] ?? -1) - (a[key] ?? -1) || a.username.localeCompare(b.username),
    );
    document.querySelector("#statistics-table").innerHTML = players.length
      ? `<table class="statistics-table"><thead><tr><th>Jogador</th><th>Posição</th><th>OVR</th><th>Jogos</th><th>Vitórias</th><th>Empates</th><th>Derrotas</th><th>Vitórias %</th><th>Golos</th><th>Assistências</th><th>Golos da equipa</th><th>Golos sofridos</th><th>Forma / 5</th></tr></thead><tbody>${players.map((p) => `<tr><td><a href="#/player/${esc(p.uid)}">${esc(p.displayName || p.username)}</a></td><td>${esc(p.primaryPosition || "—")}</td><td>${p.hasCard ? p.ovr : "—"}</td><td>${p.played}</td><td>${p.wins}</td><td>${p.draws}</td><td>${p.losses}</td><td>${p.winRate}%</td><td>${p.goals}</td><td>${p.assists}</td><td>${p.goalsFor}</td><td>${p.goalsAgainst}</td><td>${p.form?.toFixed(2) ?? "—"}</td></tr>`).join("")}</tbody></table>`
      : empty(
          "Ainda sem jogadores",
          "As estatísticas aparecerão com a tua liga.",
        );
    document.querySelectorAll(".statistics-table tbody tr").forEach((row) => {
      const headers = [...document.querySelectorAll(".statistics-table th")];
      [...row.children].forEach(
        (cell, index) => (cell.dataset.label = headers[index].textContent),
      );
    });
  };
  document.querySelector("#statistics-sort").onchange = draw;
  draw();
}
