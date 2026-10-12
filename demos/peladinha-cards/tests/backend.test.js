import { getStorage } from "firebase-admin/storage";
import { defaultPhotoDesign } from "../js/card-photo.js";
import { teamBalance, balanceSignature } from "../js/team-balance.js";
import test from "node:test";
import assert from "node:assert/strict";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import {
  onCommunityRating,
  onInitialRating,
  onPlayerPosition,
  onGame,
  onFeedback,
  deleteGame,
  rebuildHistory,
  adminMessage,
  saveTheme,
  saveWeeklyCardPhoto,
  saveOvrWeights,
  ensureHistory,
  correctRating,
  ticketAction,
  onTicketMessage,
  onTicketClosed,
} from "../functions/index.js";
import {
  ATTRIBUTES,
  isoWeek,
  calculateOverall,
  DEFAULT_OVR_WEIGHTS,
  calculatePlayerStats,
} from "../js/utils.js";
const db = getFirestore(),
  now = Timestamp.now();
test("tickets: autoria, acesso, notificações e fecho irreversível", async () => {
  for (const [uid, role] of [
    ["ticket-member", "member"],
    ["ticket-other", "member"],
    ["ticket-admin1", "admin"],
    ["ticket-admin2", "admin"],
  ])
    await db
      .doc(`users/${uid}`)
      .set({ uid, role, disabled: false, displayName: uid });
  const call = (uid, data) => ticketAction.run({ auth: { uid }, data });
  await assert.rejects(
    call("ticket-member", { action: "create", title: " ", body: "Ajuda" }),
  );
  const { id } = await call("ticket-member", {
    action: "create",
    title: "Ajuda no perfil",
    body: "Preciso de ajuda",
  });
  const ref = db.doc(`tickets/${id}`);
  let messages = await ref.collection("messages").get();
  const first = messages.docs[0];
  await onTicketMessage.run({
    params: { tid: id, mid: first.id },
    data: { before: { exists: false }, after: first },
  });
  assert.ok(
    (await db.doc(`users/ticket-admin1/notifications/ticket-${first.id}`).get())
      .exists,
  );
  assert.ok(
    (await db.doc(`users/ticket-admin2/notifications/ticket-${first.id}`).get())
      .exists,
  );
  await assert.rejects(
    call("ticket-other", { action: "reply", id, body: "Invasão" }),
  );
  await call("ticket-admin1", { action: "reply", id, body: "Resposta 1" });
  await call("ticket-admin2", { action: "reply", id, body: "Resposta 2" });
  messages = await ref.collection("messages").get();
  assert.equal(messages.size, 3);
  const response = messages.docs.find(
    (m) => m.data().authorId === "ticket-admin2",
  );
  assert.equal(response.data().authorName, "ticket-admin2");
  await onTicketMessage.run({
    params: { tid: id, mid: response.id },
    data: { before: { exists: false }, after: response },
  });
  assert.ok(
    (
      await db
        .doc(`users/ticket-member/notifications/ticket-${response.id}`)
        .get()
    ).exists,
  );
  const before = await ref.get();
  await call("ticket-member", { action: "close", id });
  const after = await ref.get();
  await onTicketClosed.run({ params: { tid: id }, data: { before, after } });
  assert.equal(after.data().status, "closed");
  for (const uid of ["ticket-member", "ticket-admin1", "ticket-admin2"])
    await assert.rejects(
      call(uid, { action: "reply", id, body: "Não permitido" }),
    );
  await assert.rejects(call("ticket-admin1", { action: "reopen", id }));
  const second = await call("ticket-member", {
    action: "create",
    title: "Outro pedido",
    body: "Mensagem",
  });
  await call("ticket-admin2", { action: "close", id: second.id });
});
const all = (v) => Object.fromEntries(ATTRIBUTES.map(([k]) => [k, v]));
const event = (after, before) => ({
  params: { uid: "joao", gid: "match" },
  data: { after, before: before || { data: () => undefined } },
});
test("integração: 3 votos oficiais, agregados anónimos, MVP, histórico e administração", async () => {
  for (const uid of ["joao", "pedro", "miguel", "andre"])
    await db.doc(`users/${uid}`).set({
      uid,
      role: uid === "pedro" ? "admin" : "member",
      disabled: false,
    });
  const initial = db.doc("initialRatings/joao");
  await initial.set({
    uid: "joao",
    ratings20: all(10),
    completed: true,
    createdAt: Timestamp.fromDate(new Date(Date.now() - 14 * 86400000)),
    updatedAt: now,
  });
  await onInitialRating.run(event(await initial.get()));
  assert.equal(
    (await db.doc(`users/joao/cardHistory/${isoWeek()}`).get()).data().ovr,
    50,
  );
  for (const raterId of ["pedro", "miguel", "andre"]) {
    const r = db.doc(`communityRatings/${raterId}_joao`);
    await r.set({
      raterId,
      targetId: "joao",
      ratings20: all(20),
      submitted: true,
      createdAt: now,
      submittedAt: now,
    });
    await onCommunityRating.run(event(await r.get()));
  }
  const summary = (await db.doc("communitySummaries/joao").get()).data();
  assert.equal(summary.count, 3);
  assert.equal(summary.ratings20.pace, 20);
  assert.ok(!JSON.stringify(summary).includes("pedro"));
  const snapshot = (
    await db.doc(`users/joao/cardHistory/${isoWeek()}`).get()
  ).data();
  assert.equal(snapshot.ovr, 89);
  assert.equal(snapshot.official, true);
  const history = await db.collection("users/joao/cardHistory").get();
  assert.equal(history.size, 1);
  assert.equal(history.docs[0].data().locked, false);
  const game = db.doc("games/match");
  await game.set({
    title: "Teste",
    status: "closed",
    teamA: { starters: ["joao", "pedro"], bench: [] },
    teamB: { starters: ["miguel", "andre"], bench: [] },
    scheduledAt: now,
    closedAt: now,
    score: { teamA: 8, teamB: 6 },
  });
  await onGame.run(event(await game.get()));
  const resultOnly = (
    await db.doc(`users/joao/cardHistory/${isoWeek()}`).get()
  ).data();
  assert.ok(
    resultOnly.ovr > snapshot.ovr,
    "A vitória deve contribuir mesmo sem feedback",
  );
  assert.equal(
    resultOnly.ovr,
    calculateOverall(calculatePlayerStats(all(18), [{ outcome: 1 }])),
  );

  for (const raterId of ["pedro", "miguel", "andre"]) {
    const r = db.doc(`games/match/feedback/${raterId}_joao`);
    await r.set({
      gameId: "match",
      raterId,
      targetId: "joao",
      ratings: {
        overall: 5,
        attack: 5,
        passing: 5,
        defense: 5,
        physical: 5,
        goalkeeping: null,
      },
      submitted: true,
      createdAt: now,
      submittedAt: now,
    });
    await onFeedback.run(event(await r.get()));
  }
  const aggregate = (await db.doc("gameSummaries/match").get()).data();
  assert.equal(aggregate.players.joao.count, 3);
  assert.equal(aggregate.players.joao.mvp, true);
  assert.equal(aggregate.players.joao.goalkeeping, null);
  await assert.rejects(
    correctRating.run({
      auth: { uid: "joao" },
      data: {
        kind: "game",
        gameId: "match",
        id: "pedro_joao",
        ratings: { overall: 99 },
      },
    }),
    /reservado/,
  );
  await assert.rejects(
    correctRating.run({
      auth: { uid: "pedro" },
      data: {
        kind: "game",
        gameId: "match",
        id: "pedro_joao",
        ratings: { overall: 99 },
      },
    }),
    /Valores/,
  );
  await correctRating.run({
    auth: { uid: "pedro" },
    data: {
      kind: "game",
      gameId: "match",
      id: "pedro_joao",
      ratings: {
        overall: 4,
        attack: 4,
        passing: 4,
        defense: 4,
        physical: 4,
        attitude: 4,
        goalkeeping: null,
      },
    },
  });
  assert.equal((await db.collection("ratingCorrections").get()).size, 1);
  assert.equal(
    (await db.doc("games/match/feedback/pedro_joao").get()).data().raterId,
    "pedro",
  );
  await assert.rejects(
    rebuildHistory.run({ auth: { uid: "joao" }, data: { uid: "joao" } }),
    /reservado/,
  );
  await rebuildHistory.run({ auth: { uid: "pedro" }, data: { uid: "joao" } });
  await ensureHistory.run({ auth: { uid: "joao" }, data: {} });
  await adminMessage.run({
    auth: { uid: "pedro" },
    data: { title: "Novo jogo", body: "Vamos jogar!" },
  });
  assert.ok((await db.collection("users/joao/notifications").get()).size > 0);
  const theme = await saveTheme.run({
    auth: { uid: "pedro" },
    data: {
      name: "Teste",
      colors: {
        primary: "#123456",
        secondary: "#123456",
        text: "#ffffff",
        border: "#abcdef",
        glow: "#123456",
      },
      texture: "radial",
      baseTheme: "gold-rare",
      design: {
        nameFont: "editorial",
        background: "waves",
        effect: "holographic",
        watermark: "crest",
        border: "double",
        shape: "crown",
        ratingSize: 125,
      },
    },
  });
  assert.ok(theme.id);
  assert.equal(
    (await db.doc(`cardThemes/${theme.id}`).get()).data().design.nameFont,
    "editorial",
  );
  await assert.rejects(
    saveTheme.run({
      auth: { uid: "pedro" },
      data: {
        name: "Inválida",
        colors: {
          primary: "#123456",
          secondary: "#123456",
          text: "#ffffff",
          border: "#abcdef",
          glow: "#123456",
        },
        texture: "plain",
        design: { nameFont: "script" },
      },
    }),
    /inválido/,
  );
  await deleteGame.run({ auth: { uid: "pedro" }, data: { gameId: "match" } });
  assert.equal((await game.get()).exists, false);
  assert.equal((await db.collection("games/match/feedback").get()).size, 0);
  assert.equal((await db.doc("gameSummaries/match").get()).exists, false);
});

test("histórico guarda pesos por posição e mudar posição recalcula o OVR", async () => {
  const user = db.doc("users/position-player");
  await user.set({
    uid: "position-player",
    role: "member",
    disabled: false,
    primaryPosition: "MED",
  });
  const ratings20 = all(6);
  for (const key of ["passing", "vision", "teamwork"]) ratings20[key] = 18;
  const initial = db.doc("initialRatings/position-player");
  await initial.set({
    uid: "position-player",
    ratings20,
    completed: true,
    createdAt: now,
    updatedAt: now,
  });
  await onInitialRating.run({
    ...event(await initial.get()),
    params: { uid: "position-player" },
  });
  const before = await user.get();
  const midfield = (
    await db.doc(`users/position-player/cardHistory/${isoWeek()}`).get()
  ).data();
  assert.equal(midfield.ovr, calculateOverall(midfield.stats, "MED"));
  assert.equal(midfield.primaryPosition, "MED");
  assert.equal(midfield.ovrCalculation.ovr, midfield.ovr);
  assert.equal(midfield.ovrCalculation.divisor, 10000);
  assert.equal(midfield.ovrCalculation.rows.length, 12);
  assert.equal(midfield.ovrCalculation.version, "position-weights-v4");
  await user.update({ primaryPosition: "GR" });
  await onPlayerPosition.run({
    ...event(await user.get(), before),
    params: { uid: "position-player" },
  });
  const goalkeeper = (
    await db.doc(`users/position-player/cardHistory/${isoWeek()}`).get()
  ).data();
  assert.equal(goalkeeper.ovr, calculateOverall(goalkeeper.stats, "GR"));
  assert.ok(midfield.ovr > goalkeeper.ovr);
  assert.deepEqual(midfield.stats, goalkeeper.stats);
});

test("pesos OVR: só admin, validação de cada stat e recálculo global persistido", async () => {
  const invoke = (uid, data) =>
    saveOvrWeights.run({ auth: uid ? { uid } : null, data });
  const custom = { weights: { ...all(0), passing: 100 } };
  await assert.rejects(invoke(null, custom), { code: "unauthenticated" });
  await assert.rejects(invoke("joao", custom), { code: "permission-denied" });
  for (const invalid of [
    { topWeight: 70, remainingWeight: 30 },
    { weights: { passing: 100 } },
    { weights: { ...all(0), passing: 101 } },
    { weights: { ...all(0), passing: 99 } },
    { weights: { ...all(0), passing: "100" } },
    { weights: { ...all(0), passing: 99.999, pace: 0.001 } },
    { weights: { ...custom.weights, unknown: 0 } },
  ])
    await assert.rejects(invoke("pedro", invalid), {
      code: "invalid-argument",
    });
  await db
    .doc("users/disabled-admin")
    .set({ uid: "disabled-admin", role: "admin", disabled: true });
  await assert.rejects(invoke("disabled-admin", custom), {
    code: "permission-denied",
  });
  const ref = db.doc(`users/position-player/cardHistory/${isoWeek()}`);
  const original = (await ref.get()).data();
  await invoke("pedro", custom);
  const settings = (await db.doc("settings/ovr").get()).data();
  assert.deepEqual(settings.weights, custom.weights);
  assert.equal(settings.updatedBy, "pedro");
  const updated = (await ref.get()).data();
  assert.deepEqual(updated.stats, original.stats);
  assert.equal(updated.ovr, original.stats.passing);
  assert.equal(updated.ovr, calculateOverall(original.stats, settings));
  assert.ok(updated.ovr > original.ovr);
  assert.deepEqual(updated.ovrCalculation.weights, custom.weights);
  assert.equal(
    (await db.doc("users/position-player/cardState/current").get()).data().ovr,
    updated.ovr,
  );
  await invoke("pedro", {
    weights: { ...all(0), pace: 33.33, passing: 66.67 },
  });
  const decimal = (await ref.get()).data();
  assert.equal(
    decimal.ovr,
    calculateOverall(decimal.stats, {
      weights: { ...all(0), pace: 33.33, passing: 66.67 },
    }),
  );
  const positions = structuredClone(DEFAULT_OVR_WEIGHTS.positions);
  positions.GR = { ...all(0), goalkeeping: 100 };
  await invoke("pedro", { positions });
  const positional = (await ref.get()).data();
  assert.equal(positional.ovrCalculation.version, "position-weights-v4");
  assert.equal(
    positional.ovr,
    calculateOverall(
      positional.stats,
      { positions },
      positional.primaryPosition,
    ),
  );
  positions.MED.pace += 1;
  await assert.rejects(invoke("pedro", { positions }), {
    code: "invalid-argument",
  });
  await invoke("pedro", DEFAULT_OVR_WEIGHTS);
});

test("equilíbrio do jogo: referência fixa, impacto nas cartas e limpeza ao reabrir", async () => {
  const gid = "balanced-match";
  for (const [uid, rating] of [
    ["balance-low", 10],
    ["balance-high", 18],
  ]) {
    await db.doc(`users/${uid}`).set({ uid, role: "member", disabled: false });
    await db.doc(`initialRatings/${uid}`).set({
      uid,
      completed: true,
      ratings20: all(rating),
      createdAt: now,
      updatedAt: now,
    });
  }
  const closedAt = Timestamp.now();
  const ref = db.doc(`games/${gid}`);
  await ref.set({
    title: "Equilíbrio",
    status: "closed",
    teamA: { starters: ["balance-low"], bench: [] },
    teamB: { starters: ["balance-high"], bench: [] },
    score: { teamA: 0, teamB: 2 },
    closedAt,
    scheduledAt: closedAt,
  });
  const invoke = async (before) =>
    onGame.run({ ...event(await ref.get(), before), params: { gid } });
  await invoke();
  const frozen = (await db.doc(`gameBalances/${gid}`).get()).data();
  assert.equal(frozen.teamA.average, 50);
  assert.equal(frozen.teamB.average, 89);
  assert.equal(frozen.boostA, 3);
  assert.equal(frozen.boostB, -3);
  const vote = db.doc(`games/${gid}/feedback/balance-high_balance-low`);
  await vote.set({
    gameId: gid,
    raterId: "balance-high",
    targetId: "balance-low",
    ratings: {
      overall: 3,
      attack: 3,
      passing: 3,
      defense: 3,
      physical: 3,
      goalkeeping: null,
    },
    submitted: true,
    createdAt: Timestamp.now(),
    submittedAt: Timestamp.now(),
  });
  await onFeedback.run({ ...event(await vote.get()), params: { gid } });
  const card = (
    await db.doc(`users/balance-low/cardHistory/${isoWeek()}`).get()
  ).data();
  const feedback = {
    overall: 3,
    attack: 3,
    passing: 3,
    defense: 3,
    physical: 3,
    goalkeeping: null,
    outcome: -1,
  };
  assert.deepEqual(
    card.stats,
    calculatePlayerStats(all(10), [{ ...feedback, balanceBoost: 3 }]),
  );
  assert.ok(card.stats.pace > calculatePlayerStats(all(10), [feedback]).pace);
  await db.doc("initialRatings/balance-high").update({ ratings20: all(6) });
  await invoke(await ref.get());
  assert.deepEqual((await db.doc(`gameBalances/${gid}`).get()).data(), frozen);
  const beforeReopen = await ref.get();
  await ref.update({ status: "open" });
  await invoke(beforeReopen);
  assert.equal((await db.doc(`gameBalances/${gid}`).get()).exists, false);
  await ref.update({ status: "closed", closedAt: Timestamp.now() });
  await invoke(await ref.get());
  assert.equal(
    (await db.doc(`gameBalances/${gid}`).get()).data().teamB.average,
    30,
  );
  await deleteGame.run({ auth: { uid: "pedro" }, data: { gameId: gid } });
  assert.equal((await db.doc(`gameBalances/${gid}`).get()).exists, false);
});

test("golos, assistências e atitude: frontend e histórico Firebase usam a mesma fórmula; corrigir jogo recalcula", async () => {
  const gid = "performance-match",
    scorer = "performance-scorer",
    other = "performance-other";
  for (const uid of [scorer, other]) {
    await db.doc(`users/${uid}`).set({
      uid,
      username: uid,
      role: "member",
      disabled: false,
      primaryPosition: "AV",
    });
    await db.doc(`initialRatings/${uid}`).set({
      uid,
      ratings20: all(10),
      completed: true,
      createdAt: now,
      updatedAt: now,
    });
  }
  const ref = db.doc(`games/${gid}`);
  const game = {
    title: "Performance",
    creatorId: scorer,
    scheduledAt: now,
    createdAt: now,
    updatedAt: now,
    status: "closed",
    closedAt: now,
    closedBy: scorer,
    teamA: { starters: [scorer], bench: [] },
    teamB: { starters: [other], bench: [] },
    score: { teamA: 2, teamB: 0 },
    performance: {
      teamA: { goals: [scorer, scorer], assists: [scorer, scorer] },
      teamB: { goals: [], assists: [] },
    },
  };
  await ref.set(game);
  const feedbackRef = ref.collection("feedback").doc(`${other}_${scorer}`);
  const ratings = {
    overall: 3,
    attack: 3,
    passing: 3,
    physical: 3,
    defense: 3,
    goalkeeping: null,
    attitude: 5,
  };
  await feedbackRef.set({
    gameId: gid,
    raterId: other,
    targetId: scorer,
    submitted: true,
    ratings,
    submittedAt: now,
    createdAt: now,
  });
  await onGame.run({ ...event(await ref.get()), params: { gid } });
  const current = async () =>
    (await db.doc(`users/${scorer}/cardHistory/${isoWeek()}`).get()).data();
  const expected = calculatePlayerStats(all(10), [
    { ...ratings, goals: 2, assists: 2, outcome: 1 },
  ]);
  assert.deepEqual((await current()).stats, expected);
  const baselineStats = calculatePlayerStats(all(10), [
    { ...ratings, outcome: 1 },
  ]);
  assert.ok(expected.shooting > baselineStats.shooting);
  assert.ok(expected.dribbling > baselineStats.dribbling);
  const frozen = (await db.doc(`gameBalances/${gid}`).get()).data();
  const before = await ref.get();
  await ref.update({
    performance: { ...game.performance, teamA: { goals: [], assists: [] } },
  });
  await onGame.run({ ...event(await ref.get(), before), params: { gid } });
  assert.deepEqual((await current()).stats, baselineStats);
  assert.deepEqual((await db.doc(`gameBalances/${gid}`).get()).data(), frozen);
});

test("cartas semanais: fecho imutável, pausa e nova carta na quinta às 20h", async (t) => {
  t.mock.timers.enable({
    apis: ["Date"],
    now: new Date("2026-10-09T12:00:00Z"),
  });
  try {
    const uid = "weekly-lock-player",
      ref = db.doc(`users/${uid}`),
      initial = db.doc(`initialRatings/${uid}`);
    await ref.set({
      uid,
      username: uid,
      displayName: "Nome original",
      photoURL: "",
      countryCode: "PT",
      primaryPosition: "ALA",
      role: "member",
      disabled: false,
    });
    await initial.set({
      uid,
      ratings20: all(10),
      completed: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    await ensureHistory.run({ auth: { uid }, data: {} });
    const history = db.doc(`users/${uid}/cardHistory/2026-W41`),
      first = (await history.get()).data();
    assert.equal(first.locked, false);
    t.mock.timers.setTime(new Date("2026-10-14T11:00:00Z").getTime());
    await ensureHistory.run({ auth: { uid }, data: {} });
    const frozen = (await history.get()).data();
    assert.equal(frozen.locked, true);
    await initial.update({ ratings20: all(20) });
    await ref.update({ displayName: "Nome novo", primaryPosition: "GR" });
    await rebuildHistory.run({ auth: { uid: "pedro" }, data: { uid } });
    const still = (await history.get()).data();
    assert.deepEqual(still, frozen);
    const published = (await db.doc(`weeklyCards/${uid}`).get()).data();
    assert.deepEqual(published.stats, first.stats);
    assert.equal(published.appearance.displayName, "Nome original");
    assert.equal(published.phase, "closed");
    const gameRef = db.doc("games/weekly-locked-game");
    await gameRef.set({
      title: "Jogo na pausa",
      status: "closed",
      closedAt: Timestamp.now(),
      scheduledAt: Timestamp.now(),
      teamA: { starters: [uid], bench: [] },
      teamB: { starters: ["weekly-other"], bench: [] },
      score: { teamA: 1, teamB: 0 },
    });
    await onGame.run({
      ...event(await gameRef.get()),
      params: { gid: "weekly-locked-game" },
    });
    const balance = (
      await db.doc("gameBalances/weekly-locked-game").get()
    ).data();
    assert.equal(balance.playerOvr[uid], first.ovr);
    assert.deepEqual((await history.get()).data(), frozen);

    assert.equal(
      (await db.doc(`users/${uid}/cardHistory/2026-W42`).get()).exists,
      false,
    );
    t.mock.timers.setTime(new Date("2026-10-15T19:00:00Z").getTime());
    await ensureHistory.run({ auth: { uid }, data: {} });
    const next = (
      await db.doc(`users/${uid}/cardHistory/2026-W42`).get()
    ).data();
    assert.equal(next.locked, false);
    assert.equal(next.appearance.displayName, "Nome novo");
    assert.ok(next.ovr > first.ovr);
    assert.deepEqual((await history.get()).data(), frozen);
  } finally {
    t.mock.timers.reset();
  }
});

test("inatividade: finalizar atualiza ausentes, suplente recupera e reabrir remove ausência", async (t) => {
  t.mock.timers.enable({
    apis: ["Date"],
    now: new Date("2026-10-10T12:00:00Z"),
  });
  try {
    const uid = "inactivity-player",
      joined = Timestamp.fromDate(new Date("2026-10-09T12:00:00Z"));
    await db.doc(`users/${uid}`).set({
      uid,
      role: "member",
      disabled: false,
      primaryPosition: "ALA",
      createdAt: joined,
    });
    await db.doc(`initialRatings/${uid}`).set({
      uid,
      ratings20: Object.fromEntries(ATTRIBUTES.map(([key]) => [key, 16])),
      createdAt: joined,
    });
    const eventFor = (before, after, gid) => ({
      params: { gid },
      data: { before, after },
    });
    const history = db.doc(`users/${uid}/cardHistory/2026-W41`);
    const refs = [];
    for (let i = 0; i < 7; i++) {
      const ref = db.doc(`games/inactivity-${i}`),
        before = await ref.get();
      const date = Timestamp.fromDate(
        new Date(`2026-10-09T${String(13 + i).padStart(2, "0")}:00:00Z`),
      );
      await ref.set({
        status: "closed",
        closedAt: date,
        scheduledAt: date,
        teamA: { starters: [], bench: [] },
        teamB: { starters: [], bench: [] },
        score: { teamA: 0, teamB: 0 },
      });
      refs.push(ref);
      if (i === 3 || i === 6) {
        await onGame.run(eventFor(before, await ref.get(), ref.id));
        const row = (await history.get()).data();
        assert.equal(row.inactivity.missed, i + 1);
        assert.equal(row.inactivity.penalty, i === 3 ? 2 : 10);
        assert.equal(
          row.ovr,
          row.ovrCalculation.rawOvr - row.inactivity.penalty,
        );
      }
    }
    const last = refs.at(-1),
      before = await last.get();
    await last.update({ status: "open" });
    await onGame.run(eventFor(before, await last.get(), last.id));
    assert.equal((await history.get()).data().inactivity.penalty, 7);
    const reset = db.doc("games/inactivity-return"),
      missing = await reset.get();
    await reset.set({
      status: "closed",
      closedAt: Timestamp.now(),
      scheduledAt: Timestamp.now(),
      teamA: { starters: [], bench: [uid] },
      teamB: { starters: [], bench: [] },
      score: { teamA: 0, teamB: 0 },
    });
    await onGame.run(eventFor(missing, await reset.get(), reset.id));
    assert.deepEqual((await history.get()).data().inactivity, {
      missed: 0,
      penalty: 0,
    });
  } finally {
    t.mock.timers.reset();
  }
});

test("fotografia semanal: admin, upload validado, perfil independente e semanas fechadas", async (t) => {
  t.mock.timers.enable({
    apis: ["Date"],
    now: new Date("2026-10-09T12:00:00Z"),
  });
  try {
    const uid = "weekly-photo-player",
      admin = "weekly-photo-admin",
      design = { ...defaultPhotoDesign(), photoScale: 140, photoX: 40 };
    await db
      .doc(`users/${uid}`)
      .set({
        uid,
        role: "member",
        disabled: false,
        primaryPosition: "ALA",
        photoURL: "https://example.com/profile.webp",
        createdAt: Timestamp.now(),
      });
    await db
      .doc(`users/${admin}`)
      .set({ uid: admin, role: "admin", disabled: false });
    await db
      .doc(`initialRatings/${uid}`)
      .set({
        uid,
        ratings20: Object.fromEntries(ATTRIBUTES.map(([key]) => [key, 10])),
        createdAt: Timestamp.now(),
      });
    const call = (actor, extra = {}) =>
      saveWeeklyCardPhoto.run({
        auth: { uid: actor },
        data: {
          uid,
          weekId: "2026-W41",
          photoURL: "https://example.com/card.webp",
          design,
          ...extra,
        },
      });
    await assert.rejects(call(uid));
    await assert.rejects(call(admin, { weekId: "2026-W40" }));
    await assert.rejects(call(admin, { design: { shape: "mvp" } }));
    await assert.rejects(call(admin, { photoURL: "javascript:bad" }));
    await assert.rejects(call(admin, { imageBase64: "not-an-image" }));
    await call(admin);
    const history = db.doc(`users/${uid}/cardHistory/2026-W41`),
      first = (await history.get()).data();
    assert.deepEqual(first.cardPhoto, {
      photoURL: "https://example.com/card.webp",
      design,
    });
    assert.equal(
      (await db.doc(`users/${uid}`).get()).data().photoURL,
      "https://example.com/profile.webp",
    );
    const uploads = [];
    const storage = getStorage();
    t.mock.method(storage, "bucket", (name) => ({
      name,
      file: (path) => ({
        name: path,
        bucket: { name },
        save: async (buffer, options) =>
          uploads.push({ buffer, options, path }),
        delete: async () => {},
      }),
    }));
    const uploaded = await call(admin, {
      imageBase64: Buffer.from("RIFF0000WEBPimage-for-mocked-storage").toString(
        "base64",
      ),
    });
    assert.equal(uploads.length, 1);
    assert.ok(uploads[0].path.startsWith(`weekly-cards/${uid}/2026-W41/`));
    assert.equal(uploads[0].options.preconditionOpts.ifGenerationMatch, 0);
    assert.equal(uploads[0].options.metadata.contentType, "image/webp");
    assert.ok(
      uploaded.photoURL.startsWith("https://firebasestorage.googleapis.com/"),
    );
    assert.deepEqual((await history.get()).data().specials, first.specials);
    assert.deepEqual((await history.get()).data().stats, first.stats);
    await call(admin, { reset: true });
    assert.equal((await history.get()).data().cardPhoto, null);
    await call(admin);
    t.mock.timers.setTime(new Date("2026-10-14T11:00:00Z").getTime());
    await ensureHistory.run({ auth: { uid }, data: {} });
    const frozen = (await history.get()).data();
    await assert.rejects(call(admin));
    await assert.rejects(call(admin, { reset: true }));
    assert.equal(uploads.length, 1);
    t.mock.timers.setTime(new Date("2026-10-15T19:00:00Z").getTime());
    await ensureHistory.run({ auth: { uid }, data: {} });
    assert.equal(
      (await db.doc(`users/${uid}/cardHistory/2026-W42`).get()).data()
        .cardPhoto,
      null,
    );
    assert.deepEqual((await history.get()).data(), frozen);
    assert.equal(
      (await db.doc(`users/${uid}`).get()).data().photoURL,
      "https://example.com/profile.webp",
    );
  } finally {
    t.mock.timers.reset();
    t.mock.restoreAll();
  }
});
