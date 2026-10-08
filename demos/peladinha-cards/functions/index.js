import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import {
  ATTRIBUTES,
  calculateGameAggregate,
  calculateInitialBaseline,
  calculatePlayerStats,
  calculateOverall,
  calculateBaseCard,
  calculateSpecialCards,
  isoWeek,
  isoWeekEnd,
  participants,
  completeInitial,
  completeFeedback,
  FEEDBACK,
} from "../js/utils.js";
initializeApp();
setGlobalOptions({ region: "europe-west1", maxInstances: 3 });
const db = getFirestore();
export const ticketAction = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Inicia sessão.");
  const uid = request.auth.uid,
    input = request.data || {};
  const ticket =
    input.action === "create"
      ? db.collection("tickets").doc()
      : typeof input.id === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(input.id)
        ? db.doc(`tickets/${input.id}`)
        : null;
  if (!ticket || !["create", "reply", "close"].includes(input.action))
    throw new HttpsError("invalid-argument", "Pedido inválido.");
  const body = typeof input.body === "string" ? input.body.trim() : "";
  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (input.action !== "close" && (!body || body.length > 4000))
    throw new HttpsError(
      "invalid-argument",
      "Escreve uma mensagem de até 4000 caracteres.",
    );
  if (input.action === "create" && (!title || title.length > 100))
    throw new HttpsError(
      "invalid-argument",
      "O título é obrigatório (até 100 caracteres).",
    );
  const message = ticket.collection("messages").doc();
  await db.runTransaction(async (tx) => {
    const profile = (await tx.get(db.doc(`users/${uid}`))).data();
    if (!profile || profile.disabled)
      throw new HttpsError("permission-denied", "Conta indisponível.");
    const stamp = FieldValue.serverTimestamp();
    if (input.action === "create")
      tx.set(ticket, {
        title,
        ownerId: uid,
        status: "open",
        createdAt: stamp,
        updatedAt: stamp,
      });
    else {
      const existing = (await tx.get(ticket)).data();
      if (!existing)
        throw new HttpsError("not-found", "Ticket não encontrado.");
      if (existing.ownerId !== uid && profile.role !== "admin")
        throw new HttpsError("permission-denied", "Sem acesso a este ticket.");
      if (existing.status !== "open")
        throw new HttpsError(
          "failed-precondition",
          "Este ticket está fechado definitivamente.",
        );
      tx.update(
        ticket,
        input.action === "close"
          ? {
              status: "closed",
              closedAt: stamp,
              closedBy: uid,
              closedByName: profile.displayName || profile.username || uid,
              updatedAt: stamp,
            }
          : { updatedAt: stamp },
      );
    }
    if (input.action !== "close")
      tx.set(message, {
        body,
        authorId: uid,
        authorName: profile.displayName || profile.username || uid,
        authorRole: profile.role,
        createdAt: stamp,
        initial: input.action === "create",
      });
  });
  return { id: ticket.id };
});
async function ticketNotifications(ticketId, eventId, authorId, title, body) {
  const ticket = (await db.doc(`tickets/${ticketId}`).get()).data();
  if (!ticket) return;
  const admins = (
    await db.collection("users").where("role", "==", "admin").get()
  ).docs
    .filter((d) => !d.data().disabled)
    .map((d) => d.id);
  for (const uid of new Set([ticket.ownerId, ...admins])) {
    if (uid === authorId) continue;
    await notification(uid, `ticket-${eventId}`, {
      type: "TICKET_UPDATE",
      title,
      body: `${ticket.title}: ${body}`,
      href: `#/tickets/${ticketId}`,
    });
  }
}
export const onTicketMessage = onDocumentWritten(
  "tickets/{tid}/messages/{mid}",
  async (event) => {
    if (event.data.before.exists || !event.data.after.exists) return;
    const m = event.data.after.data();
    await ticketNotifications(
      event.params.tid,
      event.params.mid,
      m.authorId,
      m.initial ? "Novo ticket" : "Nova resposta no ticket",
      `${m.authorName}: ${m.body.slice(0, 160)}`,
    );
  },
);
export const onTicketClosed = onDocumentWritten(
  "tickets/{tid}",
  async (event) => {
    const t = event.data.after.data();
    if (t?.status !== "closed" || event.data.before.data()?.status === "closed")
      return;
    await ticketNotifications(
      event.params.tid,
      `${event.params.tid}-closed`,
      t.closedBy,
      "Ticket fechado",
      `Fechado por ${t.closedByName}.`,
    );
  },
);
const data = (s) => s.docs.map((d) => ({ ...d.data(), id: d.id }));
async function notification(uid, id, value) {
  await db.runTransaction(async (tx) => {
    const ref = db.doc(`users/${uid}/notifications/${id}`),
      existing = await tx.get(ref);
    if (!existing.exists)
      tx.set(ref, {
        ...value,
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      });
  });
}
async function aggregateCommunity(uid) {
  await db.runTransaction(async (tx) => {
    const query = db
      .collection("communityRatings")
      .where("targetId", "==", uid);
    const votes = data(await tx.get(query)).filter(
      (v) => v.submitted && completeInitial(v.ratings20),
    );
    const ref = db.doc(`communitySummaries/${uid}`);
    tx.set(ref, {
      targetId: uid,
      count: votes.length,
      ratings20: Object.fromEntries(
        ATTRIBUTES.map(([k]) => [
          k,
          votes.length
            ? votes.reduce((s, v) => s + v.ratings20[k], 0) / votes.length
            : 0,
        ]),
      ),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}
async function aggregateGame(gid) {
  await db.runTransaction(async (tx) => {
    const gameSnap = await tx.get(db.doc(`games/${gid}`));
    if (!gameSnap.exists) return;
    const g = gameSnap.data(),
      votes = data(await tx.get(db.collection(`games/${gid}/feedback`))),
      ps = {};
    for (const uid of participants(g)) {
      const own = votes.filter(
        (v) =>
          v.targetId === uid &&
          v.submitted &&
          participants(g).includes(v.raterId),
      );
      const a = calculateGameAggregate(own);
      ps[uid] = { ...a, count: own.length, mvp: false };
    }
    const best = Math.max(0, ...Object.values(ps).map((a) => a.overall || 0));
    for (const uid of Object.keys(ps))
      ps[uid].mvp =
        ps[uid].count >= 3 &&
        ps[uid].overall >= 4.8 &&
        ps[uid].overall === best;
    tx.set(db.doc(`gameSummaries/${gid}`), {
      status: g.status,
      scheduledAt: g.scheduledAt,
      closedAt: g.closedAt,
      teamA: g.teamA,
      teamB: g.teamB,
      players: ps,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}
async function buildHistory(uid) {
  const [user, initial, community, gameSnaps] = await Promise.all([
    db.doc(`users/${uid}`).get(),
    db.doc(`initialRatings/${uid}`).get(),
    db.collection("communityRatings").where("targetId", "==", uid).get(),
    db.collection("games").get(),
  ]);
  if (
    !user.exists ||
    !initial.exists ||
    !completeInitial(initial.data().ratings20)
  )
    return;
  const self = initial.data().ratings20;
  const votes = data(community).filter((r) => r.submitted);
  const games = data(gameSnaps).filter(
    (g) => g.status === "closed" && participants(g).includes(uid),
  );
  const feedback = await Promise.all(
    games.map((g) => db.collection(`games/${g.id}/feedback`).get()),
  );
  const start = initial.data().createdAt?.toDate?.() || new Date(),
    now = new Date();
  const weeks = [];
  for (
    let cursor = new Date(start);
    cursor <= now;
    cursor = new Date(cursor.getTime() + 7 * 86400000)
  ) {
    if (weeks.length >= 520) break;
    weeks.push(isoWeek(cursor));
  }
  if (!weeks.includes(isoWeek(now))) weeks.push(isoWeek(now));
  const results = [];
  for (const weekId of weeks) {
    const external = votes.filter(
      (v) =>
        isoWeek(v.submittedAt?.toDate?.() || v.createdAt.toDate()) <= weekId,
    );
    const cs = {
      count: external.length,
      ratings20: Object.fromEntries(
        ATTRIBUTES.map(([k]) => [
          k,
          external.length
            ? external.reduce((s, v) => s + v.ratings20[k], 0) / external.length
            : 0,
        ]),
      ),
    };
    const aggregates = [];
    for (let i = 0; i < games.length; i++) {
      const g = games[i];
      if (isoWeek(g.closedAt.toDate()) > weekId) continue;
      const feedbackRows = data(feedback[i]).filter(
        (f) =>
          f.submitted &&
          (f.submittedAt || f.updatedAt || f.createdAt) &&
          isoWeek((f.submittedAt || f.updatedAt || f.createdAt).toDate()) <=
            weekId,
      );
      const own = feedbackRows.filter((f) => f.targetId === uid);
      if (!own.length) continue;
      const aggregate = calculateGameAggregate(own);
      const max = Math.max(
        ...participants(g).map(
          (id) =>
            calculateGameAggregate(
              feedbackRows.filter((f) => f.targetId === id),
            ).overall || 0,
        ),
      );
      aggregates.push({
        ...aggregate,
        count: own.length,
        mvp:
          own.length >= 3 &&
          aggregate.overall >= 4.8 &&
          aggregate.overall === max,
        date: g.closedAt.toDate(),
      });
    }
    aggregates.sort((a, b) => a.date - b.date);
    const stats = calculatePlayerStats(
        calculateInitialBaseline(self, cs),
        aggregates,
      ),
      ovr = calculateOverall(stats),
      specials = calculateSpecialCards(aggregates);
    results.push({
      weekId,
      ovr,
      stats,
      baseCard: calculateBaseCard(ovr),
      specials,
      official: cs.count >= 3,
      sourceCutoffDate: isoWeekEnd(weekId) > now ? now : isoWeekEnd(weekId),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  for (let i = 0; i < results.length; i += 400) {
    const batch = db.batch();
    for (const r of results.slice(i, i + 400))
      batch.set(db.doc(`users/${uid}/cardHistory/${r.weekId}`), r);
    await batch.commit();
  }
  const latest = results.at(-1);
  if (latest)
    await db.runTransaction(async (tx) => {
      const ref = db.doc(`users/${uid}/cardState/current`),
        old = await tx.get(ref);
      const oldData = old.data();
      tx.set(ref, {
        ovr: latest.ovr,
        specials: latest.specials.map((x) => x.id),
        updatedAt: FieldValue.serverTimestamp(),
      });
      if (oldData && oldData.ovr !== latest.ovr)
        tx.set(
          db.doc(
            `users/${uid}/notifications/card-${latest.weekId}-${latest.ovr}`,
          ),
          {
            type: "CARD_UPDATED",
            title: "Carta actualizada",
            body: `O teu OVR passou de ${oldData.ovr} para ${latest.ovr}.`,
            href: "#/profile",
            read: false,
            createdAt: FieldValue.serverTimestamp(),
          },
        );
      for (const s of latest.specials.filter(
        (s) => !oldData?.specials?.includes(s.id),
      ))
        tx.set(db.doc(`users/${uid}/notifications/special-${s.id}`), {
          type: "SPECIAL_CARD_UNLOCKED",
          title: "Nova carta especial",
          body: `Desbloqueaste ${s.name}.`,
          href: "#/profile",
          read: false,
          createdAt: FieldValue.serverTimestamp(),
        });
    });
}
export const onCommunityRating = onDocumentWritten(
  "communityRatings/{id}",
  async (event) => {
    const value = event.data.after.data() || event.data.before.data();
    if (!value || (!value.submitted && !event.data.before.data()?.submitted))
      return;
    await aggregateCommunity(value.targetId);
    await buildHistory(value.targetId);
  },
);
export const onInitialRating = onDocumentWritten(
  "initialRatings/{uid}",
  (event) => {
    if (event.data.after.data()?.completed)
      return buildHistory(event.params.uid);
  },
);
export const onFeedback = onDocumentWritten(
  "games/{gid}/feedback/{id}",
  async (event) => {
    const value = event.data.after.data() || event.data.before.data();
    if (!value || (!value.submitted && !event.data.before.data()?.submitted))
      return;
    await aggregateGame(event.params.gid);
    const g = (await db.doc(`games/${event.params.gid}`).get()).data();
    await Promise.all(participants(g || {}).map(buildHistory));
  },
);
export const onGame = onDocumentWritten("games/{gid}", async (event) => {
  if (!event.data.after.exists) {
    await db.doc(`gameSummaries/${event.params.gid}`).delete();
    return;
  }
  const g = event.data.after.data();
  await aggregateGame(event.params.gid);
  const uids = [
    ...new Set([
      ...participants(g),
      ...participants(event.data.before.data() || {}),
    ]),
  ];
  await Promise.all(uids.map(buildHistory));
  if (g.status === "closed" && event.data.before.data()?.status !== "closed")
    await Promise.all(
      participants(g).map((uid) =>
        notification(uid, `closed-${event.params.gid}`, {
          type: "GAME_CLOSED",
          title: "Peladinha finalizada",
          body: `${g.title}: ${g.score.teamA}–${g.score.teamB}. Avalia os teus colegas.`,
          href: `#/game/${event.params.gid}/feedback`,
        }),
      ),
    );
});
async function requireAdmin(request) {
  if (!request.auth) throw new HttpsError("unauthenticated", "Inicia sessão.");
  const u = await db.doc(`users/${request.auth.uid}`).get();
  if (u.data()?.role !== "admin" || u.data()?.disabled)
    throw new HttpsError("permission-denied", "Acesso reservado.");
}
export const rebuildHistory = onCall(async (request) => {
  await requireAdmin(request);
  const uid = request.data.uid;
  if (typeof uid !== "string" || uid.includes("/"))
    throw new HttpsError("invalid-argument", "UID inválido.");
  await aggregateCommunity(uid);
  await buildHistory(uid);
  return { ok: true };
});
export const ensureHistory = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Inicia sessão.");
  const uid = request.auth.uid,
    week = isoWeek();
  const user = await db.doc(`users/${uid}`).get();
  if (user.data()?.disabled)
    throw new HttpsError("permission-denied", "Conta desactivada.");
  if (!(await db.doc(`users/${uid}/cardHistory/${week}`).get()).exists)
    await buildHistory(uid);
  return { ok: true };
});
export const rebuildLeague = onCall(async (request) => {
  await requireAdmin(request);
  const users = data(await db.collection("users").get()),
    games = data(await db.collection("games").get());
  for (const g of games) await aggregateGame(g.id);
  for (const u of users) {
    await aggregateCommunity(u.uid);
    await buildHistory(u.uid);
  }
  return { ok: true };
});
export const deleteGame = onCall(async (request) => {
  await requireAdmin(request);
  const id = request.data.gameId;
  if (typeof id !== "string" || id.includes("/"))
    throw new HttpsError("invalid-argument", "Jogo inválido.");
  const ref = db.doc(`games/${id}`),
    s = await ref.get();
  const affected = participants(s.data() || {});
  await db.recursiveDelete(ref);
  await db.doc(`gameSummaries/${id}`).delete();
  await Promise.all(affected.map(buildHistory));
  return { ok: true };
});
export const adminMessage = onCall(async (request) => {
  await requireAdmin(request);
  const { title, body } = request.data;
  if (
    typeof title !== "string" ||
    typeof body !== "string" ||
    title.length > 80 ||
    body.length > 500 ||
    !title.trim() ||
    !body.trim()
  )
    throw new HttpsError("invalid-argument", "Mensagem inválida.");
  const users = data(await db.collection("users").get()).filter(
    (u) => !u.disabled,
  );
  const id = `admin-${Date.now()}`;
  await Promise.all(
    users.map((u) =>
      notification(u.uid, id, {
        type: "ADMIN_MESSAGE",
        title,
        body,
        href: "#/notifications",
      }),
    ),
  );
  return { ok: true };
});
export const saveTheme = onCall(async (request) => {
  await requireAdmin(request);
  const { name, colors, texture } = request.data;
  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.length > 40 ||
    !colors ||
    !["primary", "secondary", "text", "border", "glow"].every((k) =>
      /^#[0-9a-f]{6}$/i.test(colors[k] || ""),
    ) ||
    !["diagonal", "radial", "plain"].includes(texture)
  )
    throw new HttpsError("invalid-argument", "Tema inválido.");
  const r = await db.collection("cardThemes").add({
    name,
    colors,
    texture,
    experimental: true,
    createdBy: request.auth.uid,
    createdAt: FieldValue.serverTimestamp(),
  });
  return { id: r.id };
});
export const correctRating = onCall(async (request) => {
  await requireAdmin(request);
  const { kind, id, gameId, ratings } = request.data;
  const validId = (value) =>
    typeof value === "string" && value.length > 0 && !value.includes("/");
  if (
    !["community", "game"].includes(kind) ||
    !validId(id) ||
    (kind === "game" && !validId(gameId)) ||
    !ratings ||
    typeof ratings !== "object"
  )
    throw new HttpsError("invalid-argument", "Avaliação inválida.");
  const path =
    kind === "game"
      ? `games/${gameId}/feedback/${id}`
      : `communityRatings/${id}`;
  await db.runTransaction(async (tx) => {
    const ref = db.doc(path),
      snapshot = await tx.get(ref);
    if (!snapshot.exists)
      throw new HttpsError("not-found", "Avaliação não encontrada.");
    const previous = snapshot.data(),
      keys =
        kind === "game" ? FEEDBACK.map(([k]) => k) : ATTRIBUTES.map(([k]) => k),
      max = kind === "game" ? 5 : 20;
    if (
      !Object.entries(ratings).every(
        ([k, v]) =>
          keys.includes(k) &&
          ((kind === "game" && k === "goalkeeping" && v === null) ||
            (Number.isInteger(v) && v >= 0 && v <= max)),
      ) ||
      (previous.submitted &&
        !(kind === "game"
          ? completeFeedback(ratings)
          : completeInitial(ratings)))
    )
      throw new HttpsError(
        "invalid-argument",
        "Valores fora da escala ou avaliação incompleta.",
      );
    tx.set(db.collection("ratingCorrections").doc(), {
      path,
      original: kind === "game" ? previous.ratings : previous.ratings20,
      corrected: ratings,
      adminId: request.auth.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.update(ref, {
      [kind === "game" ? "ratings" : "ratings20"]: ratings,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  return { ok: true };
});
