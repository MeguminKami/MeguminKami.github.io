import test from "node:test";
import assert from "node:assert/strict";
import {
  balancedTeams,
  teamBalance,
  balanceBoost,
  balanceSignature,
  balanceMatches,
} from "../js/team-balance.js";
import {
  ATTRIBUTES,
  calculatePlayerStats,
  mapAggregateToStats,
  calculateSpecialCards,
  participants,
} from "../js/utils.js";
const random = (seed) => () =>
  (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
const players = (values) =>
  values.map((ovr, i) => ({ uid: String(i), ovr, hasCard: true }));
const base = (value) =>
  Object.fromEntries(ATTRIBUTES.map(([key]) => [key, value]));
test("sorteio: variedade real, equipas equilibradas, sem duplicados e titulares limitados", () => {
  const roster = players([99, 90, 85, 80, 75, 70, 65, 60, 55, 50]);
  const variations = new Set();
  for (let seed = 1; seed <= 12; seed++) {
    const game = balancedTeams(roster, { random: random(seed) });
    assert.equal(game.teamA.starters.length, 5);
    assert.equal(game.teamB.starters.length, 5);
    assert.deepEqual(
      participants(game).sort(),
      roster.map((p) => p.uid).sort(),
    );
    assert.ok(teamBalance(game, roster).difference <= 1.8);
    variations.add(balanceSignature(game));
  }
  assert.ok(variations.size >= 4);
  const first = balancedTeams(players([70, 70, 70, 70]), { random: random(1) });
  const next = balancedTeams(players([70, 70, 70, 70]), {
    random: random(2),
    previous: balanceSignature(first),
  });
  assert.notEqual(balanceSignature(first), balanceSignature(next));
  for (const count of [2, 11, 13, 60]) {
    const roster = players(Array.from({ length: count }, () => 70));
    const game = balancedTeams(roster, { random: random(count) });
    assert.ok(
      game.teamA.starters.length <= 5 && game.teamB.starters.length <= 5,
    );
    assert.equal(participants(game).length, count);
    assert.equal(new Set(participants(game)).size, count);
    assert.ok(
      Math.abs(
        game.teamA.starters.length +
          game.teamA.bench.length -
          game.teamB.starters.length -
          game.teamB.bench.length,
      ) <= 1,
    );
  }
  assert.throws(() => balancedTeams(players([70])));
  assert.throws(() =>
    balancedTeams([
      { uid: "x", hasCard: false, ovr: 0 },
      { uid: "y", ovr: 90 },
    ]),
  );
});
test("equilíbrio: média com suplentes, desvio, simetria, escala e limites", () => {
  const g = {
    teamA: { starters: ["0"], bench: ["1"] },
    teamB: { starters: ["2"], bench: [] },
  };
  const b = teamBalance(g, players([50, 70, 70]));
  assert.equal(b.teamA.average, 60);
  assert.equal(b.teamA.startersAverage, 50);
  assert.equal(b.difference, 10);
  assert.equal(b.meanDeviation, 5);
  assert.equal(b.boostA, 1.5);
  assert.equal(b.boostB, -1.5);
  const capped = teamBalance(g, players([0, 0, 99]));
  assert.equal(capped.boostA, 3);
  assert.equal(capped.boostB, -3);
  assert.equal(teamBalance(g, players([70, 70, 70])).boostA, 0);
  const missing = teamBalance(g, players([70, 70]));
  assert.equal(missing.complete, false);
  assert.equal(missing.boostA, 0);
  assert.equal(missing.boostB, 0);
  const frozen = {
    ...b,
    signature: balanceSignature(g),
    closedAt: { seconds: 100 },
  };
  const closed = { ...g, status: "closed", closedAt: { seconds: 100 } };
  assert.equal(balanceBoost("1", closed, frozen), 1.5);
  assert.equal(balanceBoost("2", closed, frozen), -1.5);
  assert.equal(balanceBoost("unknown", closed, frozen), 0);
  assert.equal(
    balanceBoost("1", { ...closed, closedAt: { seconds: 101 } }, frozen),
    0,
  );
  assert.equal(balanceMatches(closed, frozen), true);
  assert.equal(
    balanceMatches(
      { ...closed, teamA: { starters: ["0"], bench: [] } },
      frozen,
    ),
    false,
  );
});
test("ajuste: estrelas preservadas, derrota fraca atenuada, derrota forte agravada e limites", () => {
  const rated = {
    overall: 3,
    attack: 3,
    passing: 3,
    defense: 3,
    physical: 3,
    goalkeeping: null,
    outcome: -1,
  };
  const original = structuredClone(rated);
  const weak = mapAggregateToStats({ ...rated, balanceBoost: 3 }, base(12));
  const equal = mapAggregateToStats(rated, base(12));
  const strong = mapAggregateToStats({ ...rated, balanceBoost: -3 }, base(12));
  assert.equal(weak.pace, equal.pace + 3);
  assert.equal(strong.pace, equal.pace - 3);
  assert.deepEqual(rated, original);
  assert.equal(
    mapAggregateToStats({ ...rated, balanceBoost: 99 }, base(12)).pace,
    weak.pace,
  );
  assert.equal(
    mapAggregateToStats({ outcome: 1, balanceBoost: 3 }, base(20)).pace,
    99,
  );
  assert.equal(
    mapAggregateToStats({ outcome: -1, balanceBoost: -3 }, base(0)).pace,
    0,
  );
  assert.ok(
    calculatePlayerStats(base(12), [{ ...rated, balanceBoost: 3 }]).pace >
      calculatePlayerStats(base(12), [{ ...rated, balanceBoost: -3 }]).pace,
  );
  assert.equal(
    mapAggregateToStats({ outcome: 0, balanceBoost: 1.5 }, base(12))
      .goalkeeping,
    61,
  );
  assert.equal(
    mapAggregateToStats({ outcome: 0, balanceBoost: 0 }, base(12)).goalkeeping,
    null,
  );
  const games = Array.from({ length: 3 }, () => ({
    overall: 4.2,
    passing: 4.8,
    balanceBoost: 3,
  }));
  assert.deepEqual(
    calculateSpecialCards(games),
    calculateSpecialCards(games.map(({ balanceBoost, ...g }) => g)),
  );
});
