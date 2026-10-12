import {
  CARD_SAFE_RECT,
  DEFAULT_CARD_OUTLINE,
  expandCardOutline,
} from "../js/card-geometry.js";
import { SPECIAL_CARD_DESIGNS } from "../js/card-specials.js";
import {
  validPhotoDesign,
  cardPhotoStyles,
  defaultPhotoDesign,
} from "../js/card-photo.js";
import test from "node:test";
import assert from "node:assert/strict";
import {
  ATTRIBUTES,
  calculateInitialBaseline,
  calculatePlayerStats,
  accelerateAttributeGain,
  ACCELERATED_ATTRIBUTES,
  calculateOverall,
  calculateInactivity,
  calculateOverallDetails,
  DEFAULT_OVR_WEIGHTS,
  validOvrWeights,
  normalizeOvrWeights,
  calculatePlayerStatsDetails,
  calculateBaseCard,
  convert20To99,
  convert5To99,
  calculateGameAggregate,
  calculateSpecialCards,
  isoWeek,
  isoWeekEnd,
  calculateWeeklyTopPlayers,
  calculateMatchStats,
  matchOutcome,
  matchPerformance,
  performanceBonuses,
  mapAggregateToStats,
  completeFeedback,
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
  const d = new Date("2026-10-06T12:00Z"),
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

test("OVR: pesos por atributo, limites e independência da posição", () => {
  const stats = ratings(30);
  for (const key of ["pace", "shooting", "passing", "dribbling"])
    stats[key] = 90;
  assert.equal(calculateOverall(stats), 50);
  assert.equal(
    calculateOverall(stats, "GR"),
    calculateOverallDetails(stats, undefined, "GR").ovr,
  );
  assert.equal(
    calculateOverall(stats, "AV"),
    calculateOverallDetails(stats, undefined, "AV").ovr,
  );
  assert.equal(calculateOverall(ratings(99)), 99);
  assert.equal(calculateOverall(ratings(0)), 0);
  assert.equal(calculateOverall({ ...ratings(0), composure: 99 }), 8);
  assert.equal(
    calculateOverall({ ...ratings(50), pace: 1000, shooting: -5 }),
    calculateOverall({ ...ratings(50), pace: 99, shooting: 0 }),
  );
});
test("resultados: vitória e derrota simétricas, suplentes, empate e N/A", () => {
  const game = {
    status: "closed",
    teamA: { starters: ["a"], bench: ["sub"] },
    teamB: { starters: ["b"], bench: [] },
    score: { teamA: 2, teamB: 1 },
  };
  assert.equal(matchOutcome("sub", game), 1);
  assert.equal(matchOutcome("b", game), -1);
  assert.equal(matchOutcome("outsider", game), 0);
  assert.equal(matchOutcome("a", { ...game, status: "open" }), 0);
  assert.equal(
    matchOutcome("a", { ...game, score: { teamA: 1, teamB: 1 } }),
    0,
  );
  const feedback = {
    overall: 3,
    attack: 3,
    passing: 3,
    defense: 3,
    physical: 3,
    goalkeeping: null,
  };
  const win = calculatePlayerStats(ratings(12), [{ ...feedback, outcome: 1 }]);
  const draw = calculatePlayerStats(ratings(12), [{ ...feedback, outcome: 0 }]);
  const loss = calculatePlayerStats(ratings(12), [
    { ...feedback, outcome: -1 },
  ]);
  assert.ok(win.pace > draw.pace && draw.pace > loss.pace);
  assert.ok(
    win.goalkeeping > draw.goalkeeping && draw.goalkeeping > loss.goalkeeping,
  );
  assert.ok(
    calculatePlayerStats(ratings(12), [{ outcome: 1 }]).pace >
      convert20To99(12),
  );
  assert.equal(
    calculatePlayerStats(ratings(20), [
      { ...feedback, overall: 5, physical: 5, outcome: 1 },
    ]).pace,
    99,
  );
  assert.equal(calculatePlayerStats(ratings(0), [{ outcome: -1 }]).pace, 0);
});

test("detalhe OVR: pesos fixos por stat e arredondamento apenas no fim", () => {
  const stats = { ...ratings(30), pace: 90, composure: 80 };
  const settings = { weights: { ...ratings(0), pace: 25, composure: 75 } };
  const details = calculateOverallDetails(stats, settings);
  assert.equal(details.rows.length, 12);
  assert.deepEqual(
    details.rows.map((r) => r.key),
    ATTRIBUTES.map(([key]) => key),
  );
  assert.equal(details.rows[0].weight, 25);
  assert.equal(details.exact, 82.5);
  assert.equal(details.ovr, 83);
  assert.equal(details.total / details.divisor, 82.5);
  assert.equal(
    calculateOverall({ ...stats, pace: 20, composure: 90 }, settings),
    73,
  );
  const fractional = calculateOverallDetails({ ...ratings(50), pace: 51 });
  assert.equal(fractional.exact, 50.0834);
  assert.equal(fractional.ovr, 50);
});
test("detalhe dos atributos corresponde à carta, incluindo resultado sem estrelas", () => {
  const games = [
    { physical: 4, overall: 3, goalkeeping: null, outcome: 1 },
    { outcome: -1 },
  ];
  const detail = calculatePlayerStatsDetails(ratings(12), games);
  assert.deepEqual(detail.stats, calculatePlayerStats(ratings(12), games));
  const pace = detail.rows.find((r) => r.key === "pace");
  assert.equal(pace.baseline, 59);
  assert.equal(pace.divisor, 5);
  assert.deepEqual(pace.contributions, [82, 54]);
  assert.equal(pace.total, 313);
  assert.equal(pace.value, 63);
});

test("OVR valida todos os pesos, casas decimais, total e configuração antiga", () => {
  const weights = { ...ratings(0), pace: 33.33, passing: 66.67 };
  const stats = { ...ratings(0), pace: 90, passing: 30 };
  assert.ok(validOvrWeights({ weights }));
  assert.equal(calculateOverall(stats, { weights }), 50);
  assert.equal(
    calculateOverall(stats, { weights: { ...ratings(0), pace: 100 } }),
    90,
  );
  for (const invalid of [
    {},
    { topWeight: 70, remainingWeight: 30 },
    { weights: { pace: 100 } },
    { weights: { ...weights, unknown: 0 } },
    { weights: { ...weights, pace: -1 } },
    { weights: { ...weights, pace: NaN } },
    { weights: { ...weights, pace: "33.33" } },
    { weights: { ...weights, pace: 33.333, passing: 66.667 } },
    { weights: { ...weights, pace: 32.33 } },
  ]) {
    assert.equal(validOvrWeights(invalid), false);
    assert.deepEqual(normalizeOvrWeights(invalid), DEFAULT_OVR_WEIGHTS);
  }
  const details = calculateOverallDetails(stats, { weights });
  assert.equal(details.exact, 49.998);
  assert.equal(
    details.rows.reduce((sum, r) => sum + Math.round(r.weight * 100), 0),
    10000,
  );
});

test("OVR usa pesos independentes por posição e valida todos os totais", () => {
  const positions = structuredClone(DEFAULT_OVR_WEIGHTS.positions);
  positions.GR = { ...ratings(0), goalkeeping: 100 };
  positions.AV = { ...ratings(0), shooting: 100 };
  const stats = { ...ratings(40), goalkeeping: 90, shooting: 60 };
  assert.ok(validOvrWeights({ positions }));
  assert.equal(calculateOverall(stats, { positions }, "GR"), 90);
  assert.equal(calculateOverall(stats, { positions }, "AV"), 60);
  assert.equal(
    calculateOverallDetails(stats, { positions }, "GR").position,
    "GR",
  );
  positions.MED.passing += 1;
  assert.equal(validOvrWeights({ positions }), false);
  delete positions.MED;
  assert.equal(validOvrWeights({ positions }), false);
});

test("golos, assistências e vitória: bónus por atributo, limitados e diluídos na carta", () => {
  const neutral = {
    overall: 3,
    attack: 3,
    passing: 3,
    physical: 3,
    defense: 3,
    goalkeeping: null,
  };
  const before = mapAggregateToStats(neutral, ratings(10));
  const after = mapAggregateToStats(
    { ...neutral, goals: 2, assists: 1 },
    ratings(10),
  );
  assert.equal(after.shooting - before.shooting, 4);
  assert.equal(after.passing - before.passing, 2);
  assert.equal(after.dribbling - before.dribbling, 3);
  assert.equal(after.physical, before.physical);
  assert.deepEqual(
    performanceBonuses({ goals: 999, assists: 999, outcome: 1 }),
    { shooting: 6, passing: 6, dribbling: 4, teamwork: 3 },
  );
  const win = mapAggregateToStats({ ...neutral, outcome: 1 }, ratings(10));
  assert.equal(win.teamwork - before.teamwork, 8);
  assert.equal(win.passing - before.passing, 5);
  const base = calculatePlayerStats(ratings(10), []);
  const scorer = calculatePlayerStats(ratings(10), [{ goals: 3 }]);
  assert.equal(scorer.shooting - base.shooting, 2);
  assert.equal(scorer.passing, base.passing);
  assert.ok(
    Object.values(
      mapAggregateToStats({ ...neutral, goals: 999, assists: 999, outcome: 1 }),
    ).every((v) => v === null || v <= 99),
  );
});
test("atitude afeta resistência e compostura, incluindo zero; legado mantém o cálculo anterior", () => {
  const legacy = {
    overall: 3,
    attack: 1,
    physical: 1,
    passing: 3,
    defense: 3,
    goalkeeping: null,
  };
  const low = mapAggregateToStats({ ...legacy, attitude: 0 });
  const high = mapAggregateToStats({ ...legacy, attitude: 5 });
  assert.ok(high.stamina > low.stamina && high.composure > low.composure);
  assert.equal(high.physical, low.physical);
  assert.equal(high.shooting, low.shooting);
  assert.equal(
    mapAggregateToStats(legacy).stamina,
    mapAggregateToStats({ ...legacy, attitude: null }).stamina,
  );
  assert.ok(!completeFeedback(legacy));
  assert.ok(completeFeedback({ ...legacy, attitude: 0 }));
  assert.ok(!completeFeedback({ ...legacy, attitude: 6 }));
  assert.equal(
    calculateGameAggregate([
      { submitted: true, ratings: { attitude: 0 } },
      { submitted: true, ratings: { attitude: 4 } },
      { submitted: true, ratings: {} },
    ]).attitude,
    2,
  );
});
test("estatísticas individuais: suplentes, jogos antigos e jogos ainda abertos", () => {
  const game = {
    status: "closed",
    teamA: { starters: ["a"], bench: ["sub"] },
    teamB: { starters: ["b"], bench: [] },
    score: { teamA: 3, teamB: 1 },
    performance: {
      teamA: { goals: ["a", "sub", "sub"], assists: ["sub"] },
      teamB: { goals: ["b"], assists: [] },
    },
  };
  assert.deepEqual(matchPerformance("sub", game), { goals: 2, assists: 1 });
  assert.deepEqual(matchPerformance("outsider", game), {
    goals: 0,
    assists: 0,
  });
  const stats = calculateMatchStats("sub", [
    game,
    { ...game, status: "open" },
    { ...game, performance: undefined },
  ]);
  assert.equal(stats.played, 2);
  assert.equal(stats.goals, 2);
  assert.equal(stats.assists, 1);
});

test("inatividade: 4–7 ausências, limite, suplente e entrada recente", () => {
  const game = (i, team = { starters: [], bench: [] }) => ({
    id: String(i),
    status: "closed",
    closedAt: new Date(2026, 0, i),
    teamA: team,
    teamB: { starters: [], bench: [] },
  });
  const games = Array.from({ length: 10 }, (_, i) => game(i + 1));
  for (const [count, penalty] of [
    [3, 0],
    [4, 2],
    [5, 5],
    [6, 7],
    [7, 10],
    [10, 10],
  ]) {
    const result = calculateInactivity(
      "absent",
      games.slice(0, count),
      null,
      new Date(2026, 1, 1),
    );
    assert.deepEqual(result, { missed: count, penalty });
    assert.equal(
      calculateOverall(
        Object.fromEntries(ATTRIBUTES.map(([key]) => [key, 80])),
        undefined,
        "ALA",
        result,
      ),
      80 - penalty,
    );
  }
  assert.equal(
    calculateInactivity(
      "absent",
      games,
      new Date(2026, 0, 8),
      new Date(2026, 1, 1),
    ).penalty,
    0,
  );
  assert.equal(
    calculateInactivity(
      "absent",
      [...games, game(11, { starters: [], bench: ["absent"] })],
      null,
      new Date(2026, 1, 1),
    ).missed,
    0,
  );
  assert.equal(
    calculateInactivity(
      "absent",
      [...games, { ...game(11), status: "open" }],
      null,
      new Date(2026, 0, 4),
    ).missed,
    4,
  );
  assert.equal(
    calculateOverall(
      Object.fromEntries(ATTRIBUTES.map(([key]) => [key, 3])),
      undefined,
      "GR",
      { missed: 7, penalty: 10 },
    ),
    0,
  );
});

test("ganhos duplos nos quatro atributos até 70, sem duplicar descidas", () => {
  for (const key of ACCELERATED_ATTRIBUTES) {
    assert.equal(accelerateAttributeGain(key, 50, 5), 10);
    assert.equal(accelerateAttributeGain(key, 69, 2), 2.5);
    assert.equal(accelerateAttributeGain(key, 70, 5), 5);
    assert.equal(accelerateAttributeGain(key, 60, -5), -5);
  }
  assert.equal(accelerateAttributeGain("pace", 50, 5), 5);
  const initial = ratings(10),
    detail = calculatePlayerStatsDetails(initial, [
      { attitude: 4, passing: 4, defense: 4, overall: 4 },
    ]);
  for (const key of ACCELERATED_ATTRIBUTES) {
    const row = detail.rows.find((r) => r.key === key);
    assert.equal(row.growthBonus, 7.25);
    assert.equal(row.value, 65);
  }
  assert.equal(detail.stats.passing, 57);
  const high = calculatePlayerStatsDetails(ratings(16), [
    { attitude: 5, passing: 5, defense: 5, overall: 5 },
  ]);
  assert.ok(high.rows.every((r) => Math.abs(r.growthBonus) < 0.000001));
  const chronological = [
    {
      date: new Date("2026-10-01"),
      attitude: 4,
      passing: 4,
      defense: 4,
      overall: 4,
    },
    {
      date: new Date("2026-10-02"),
      attitude: 1,
      passing: 1,
      defense: 1,
      overall: 1,
    },
  ];
  assert.deepEqual(
    calculatePlayerStats(initial, chronological),
    calculatePlayerStats(initial, [...chronological].reverse()),
  );
  const decline = calculatePlayerStatsDetails(initial, [
    { attitude: 0, passing: 0, defense: 0, overall: 0 },
  ]);
  assert.ok(decline.rows.every((r) => Math.abs(r.growthBonus) < 0.000001));
});

test("fotografia semanal: só enquadramento, limites e estilos seguros", () => {
  const design = {
    ...defaultPhotoDesign(),
    photoX: 42,
    photoScale: 150,
    fit: "contain",
    fade: "none",
  };
  assert.equal(validPhotoDesign(design), true);
  assert.ok(cardPhotoStyles(design).photo.includes("left:42%"));
  assert.ok(cardPhotoStyles(design).image.includes("scale(1.5)"));
  for (const invalid of [
    { shape: "mvp" },
    { photoX: Infinity },
    { photoScale: 250 },
    { fit: "url(javascript:alert(1))" },
    { ratingSize: 120 },
    [],
  ])
    assert.equal(validPhotoDesign(invalid), false);
  assert.deepEqual(cardPhotoStyles({ photoX: "bad" }), {
    photo: "",
    image: "",
  });
});

test("silhuetas envolvem todo o retângulo: os cantos não são extensões", () => {
  const inside = (points, x, y) => {
    let result = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [xi, yi] = points[i],
        [xj, yj] = points[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
        result = !result;
    }
    return result;
  };
  const rect = CARD_SAFE_RECT;
  for (const outline of [
    DEFAULT_CARD_OUTLINE,
    ...Object.values(SPECIAL_CARD_DESIGNS).map((d) => d.outline),
    "9,6 38,6 50,1 62,6 91,6 98,13 94,18 98,23 98,79 94,88 81,95 50,99 19,95 6,88 2,79 2,23 6,18 2,13",
  ]) {
    const points = expandCardOutline(outline)
      .split(" ")
      .map((p) => p.split(",").map(Number));
    for (const x of [rect.x * 100, (rect.x + rect.width) * 100])
      for (const y of [rect.y * 100, (rect.y + rect.height) * 100])
        assert.ok(
          inside(points, x, y),
          `Canto ${x},${y} fora da silhueta ${outline}`,
        );
  }
});
