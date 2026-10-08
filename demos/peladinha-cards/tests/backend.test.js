import test from "node:test";
import assert from "node:assert/strict";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import {
  onCommunityRating,
  onInitialRating,
  onGame,
  onFeedback,
  deleteGame,
  rebuildHistory,
  adminMessage,
  saveTheme,
  ensureHistory,
  correctRating,
} from "../functions/index.js";
import { ATTRIBUTES, isoWeek } from "../js/utils.js";
const db = getFirestore(),
  now = Timestamp.now();
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
  assert.ok(history.size >= 3);
  assert.ok(history.docs.some((doc) => doc.data().official === false));
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
    },
  });
  assert.ok(theme.id);
  await deleteGame.run({ auth: { uid: "pedro" }, data: { gameId: "match" } });
  assert.equal((await game.get()).exists, false);
  assert.equal((await db.collection("games/match/feedback").get()).size, 0);
  assert.equal((await db.doc("gameSummaries/match").get()).exists, false);
});
