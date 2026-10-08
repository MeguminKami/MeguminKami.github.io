import test from "node:test";
import assert from "node:assert/strict";
import {
  ATTRIBUTES,
  calculateInitialBaseline,
  calculatePlayerStats,
  calculateOverall,
  calculateBaseCard,
  convert20To99,
  convert5To99,
  calculateGameAggregate,
  calculateSpecialCards,
  isoWeek,
  isoWeekEnd,
  calculateWeeklyTopPlayers,
  calculateMatchStats,
} from "../js/utils.js";
const ratings = (value) =>
  Object.fromEntries(ATTRIBUTES.map(([k]) => [k, value]));
test("escalas e limites", () => {
  assert.equal(convert20To99(0), 0);
  assert.equal(convert20To99(20), 99);
  assert.equal(convert5To99(5), 99);
  assert.equal(convert5To99(-2), 0);
  assert.equal(calculateOverall(ratings(75)), 75);
});
test("raridades nas fronteiras", () => {
  assert.deepEqual(
    [49, 50, 64, 65, 69, 70, 74, 75, 84, 85, 99].map(calculateBaseCard),
    [
      "bronze-common",
      "bronze-rare",
      "bronze-rare",
      "silver-common",
      "silver-common",
      "silver-rare",
      "silver-rare",
      "gold-common",
      "gold-common",
      "gold-rare",
      "gold-rare",
    ],
  );
});
test("autoavaliação sozinha e limite 20/80 desde o primeiro voto externo", () => {
  assert.equal(calculateInitialBaseline(ratings(10), { count: 0 }).pace, 10);
  assert.equal(
    calculateInitialBaseline(ratings(10), { count: 1, ratings20: ratings(20) })
      .pace,
    18,
  );
  assert.equal(
    calculateInitialBaseline(ratings(10), { count: 2, ratings20: ratings(20) })
      .pace,
    18,
  );
  assert.equal(
    calculateInitialBaseline(ratings(10), { count: 3, ratings20: ratings(20) })
      .pace,
    18,
  );
});
test("um jogo tem um peso, não um peso por voto; N/A excluído", () => {
  const feedback = [
    { submitted: true, ratings: { overall: 4, goalkeeping: null } },
    { submitted: true, ratings: { overall: 5, goalkeeping: 3 } },
    { submitted: false, ratings: { overall: 0, goalkeeping: 0 } },
  ];
  assert.equal(calculateGameAggregate(feedback).overall, 4.5);
  assert.equal(calculateGameAggregate(feedback).goalkeeping, 3);
  const base = ratings(20),
    after = calculatePlayerStats(base, [
      {
        overall: 0,
        attack: 0,
        physical: 0,
        passing: 0,
        defense: 0,
        goalkeeping: null,
      },
    ]);
  assert.equal(after.pace, 74);
  assert.equal(after.goalkeeping, 99);
});
test("especiais, prioridade e guarda-redes com jogos válidos", () => {
  const games = Array.from({ length: 5 }, () => ({
    overall: 5,
    passing: 5,
    attack: 5,
    physical: 5,
    defense: 5,
    goalkeeping: 5,
    mvp: true,
  }));
  const special = calculateSpecialCards(games);
  assert.equal(special[0].id, "legend-form");
  assert.equal(special.length, 10);
  assert.ok(
    calculateSpecialCards([
      { overall: 4, goalkeeping: 5 },
      { overall: 4, goalkeeping: null },
      { overall: 4, goalkeeping: 5 },
      { overall: 4, goalkeeping: null },
    ]).some((x) => x.id === "safe-hands"),
  );
});
test("semanas ISO / Lisboa: mudança de ano e horário de verão", () => {
  assert.equal(
    isoWeekEnd("2026-W40").toISOString(),
    "2026-10-04T22:59:59.999Z",
  );
  assert.equal(
    isoWeekEnd("2026-W44").toISOString(),
    "2026-11-01T23:59:59.999Z",
  );
  assert.equal(isoWeek(new Date("2021-01-01T12:00:00Z")), "2020-W53");
  assert.equal(isoWeek(new Date("2026-10-04T23:30:00Z")), "2026-W41");
  assert.equal(isoWeek(new Date("2026-10-04T21:00:00Z")), "2026-W40");
});
test("ranking: mínimos, média e fallback OVR", () => {
  const d = new Date("2026-10-07T12:00Z"),
    players = [
      { username: "a", ovr: 99, aggregates: [] },
      {
        username: "b",
        ovr: 70,
        aggregates: [{ date: d, count: 2, overall: 4.5 }],
      },
      {
        username: "c",
        ovr: 80,
        aggregates: [{ date: d, count: 1, overall: 5 }],
      },
    ];
  assert.deepEqual(
    calculateWeeklyTopPlayers(players, d).map((p) => p.username),
    ["b", "a", "c"],
  );
});
test("estatísticas derivadas incluem suplentes", () => {
  const game = {
    status: "closed",
    teamA: { starters: ["a"], bench: ["b"] },
    teamB: { starters: ["c"], bench: [] },
    score: { teamA: 8, teamB: 6 },
  };
  assert.equal(calculateMatchStats("b", [game]).wins, 1);
  assert.equal(calculateMatchStats("c", [game]).goalDifference, -2);
  assert.equal(calculateMatchStats("nobody", [game]).played, 0);
});
